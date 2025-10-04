import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';

/**
 * Service pour la génération rétroactive de factures
 */
export class RetroactiveInvoiceService {
  /**
   * Génère des factures pour toutes les consultations qui n'en ont pas
   */
  static async generateMissingInvoices(): Promise<{
    consultationsProcessed: number;
    invoicesCreated: number;
    invoicesSkipped: number;
    errors: string[];
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const results = {
        consultationsProcessed: 0,
        invoicesCreated: 0,
        invoicesSkipped: 0,
        errors: [] as string[]
      };

      console.log('🔄 Starting retroactive invoice generation...');

      // 1. Récupérer toutes les consultations de l'utilisateur
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );

      const consultationsSnapshot = await getDocs(consultationsQuery);
      console.log(`📊 Found ${consultationsSnapshot.docs.length} consultations to process`);

      // 2. Récupérer toutes les factures existantes pour éviter les doublons
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);
      const existingInvoicesByConsultation = new Set<string>();

      // Créer un index des factures existantes par consultationId
      invoicesSnapshot.docs.forEach(doc => {
        const invoiceData = doc.data();
        if (invoiceData.consultationId) {
          existingInvoicesByConsultation.add(invoiceData.consultationId);
        }
      });

      console.log(`📋 Found ${existingInvoicesByConsultation.size} existing invoices linked to consultations`);

      // 3. Traiter chaque consultation
      for (const consultationDoc of consultationsSnapshot.docs) {
        const consultationId = consultationDoc.id;
        const consultationData = consultationDoc.data();
        
        results.consultationsProcessed++;

        try {
          // Vérifier si une facture existe déjà pour cette consultation
          if (existingInvoicesByConsultation.has(consultationId)) {
            console.log(`⏭️ Skipping consultation ${consultationId} - invoice already exists`);
            results.invoicesSkipped++;
            continue;
          }

          // Vérifier que le patient existe toujours
          if (!consultationData.patientId) {
            console.warn(`⚠️ Consultation ${consultationId} has no patientId`);
            results.errors.push(`Consultation ${consultationId}: patientId manquant`);
            continue;
          }

          const patientRef = doc(db, 'patients', consultationData.patientId);
          const patientDoc = await getDoc(patientRef);

          if (!patientDoc.exists()) {
            console.warn(`⚠️ Patient ${consultationData.patientId} not found for consultation ${consultationId}`);
            results.errors.push(`Consultation ${consultationId}: patient ${consultationData.patientId} introuvable`);
            continue;
          }

          // Récupérer les données du patient
          const patientData = patientDoc.data();
          const patientName = consultationData.patientName || `${patientData.firstName} ${patientData.lastName}`;

          // Récupérer la date de consultation
          let consultationDate: Date;
          try {
            if (consultationData.date?.toDate) {
              consultationDate = consultationData.date.toDate();
            } else if (consultationData.date?.seconds) {
              consultationDate = new Date(consultationData.date.seconds * 1000);
            } else if (typeof consultationData.date === 'string') {
              consultationDate = new Date(consultationData.date);
            } else if (consultationData.date instanceof Date) {
              consultationDate = consultationData.date;
            } else {
              throw new Error('Invalid date format');
            }

            if (isNaN(consultationDate.getTime())) {
              throw new Error('Invalid date value');
            }
          } catch (dateError) {
            console.error(`❌ Error parsing date for consultation ${consultationId}:`, dateError);
            results.errors.push(`Consultation ${consultationId}: date invalide`);
            continue;
          }

          // Générer un numéro de facture unique
          const year = consultationDate.getFullYear();
          const month = String(consultationDate.getMonth() + 1).padStart(2, '0');
          const day = String(consultationDate.getDate()).padStart(2, '0');
          const time = String(consultationDate.getHours()).padStart(2, '0') + 
                      String(consultationDate.getMinutes()).padStart(2, '0');
          const invoiceNumber = `F-${year}${month}${day}-${time}-${consultationId.slice(-4)}`;

          // Créer les données de la facture
          const invoiceData = {
            number: invoiceNumber,
            patientId: consultationData.patientId,
            patientName: patientName,
            osteopathId: auth.currentUser.uid,
            consultationId: consultationId, // Lien vers la consultation
            issueDate: consultationDate.toISOString().split('T')[0],
            dueDate: new Date(consultationDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
            items: [{
              id: crypto.randomUUID(),
              description: consultationData.reason || 'Consultation ostéopathique',
              quantity: 1,
              unitPrice: 55, // Montant par défaut fixé à 55€
              amount: 55
            }],
            subtotal: 55,
            tax: 0,
            total: 55,
            status: 'draft', // Statut brouillon par défaut
            notes: `Facture générée rétroactivement pour la consultation du ${consultationDate.toLocaleDateString('fr-FR')}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isRetroactive: true // Marqueur pour identifier les factures générées rétroactivement
          };

          // Créer la facture dans Firestore
          await addDoc(collection(db, 'invoices'), invoiceData);
          
          results.invoicesCreated++;
          console.log(`✅ Invoice created for consultation ${consultationId}: ${invoiceNumber}`);

        } catch (error) {
          console.error(`❌ Error processing consultation ${consultationId}:`, error);
          results.errors.push(`Consultation ${consultationId}: ${(error as Error).message}`);
        }
      }

      // Journaliser l'opération
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'invoices',
        'generate_retroactive',
        SensitivityLevel.SENSITIVE,
        'success',
        results
      );

      console.log('✅ Retroactive invoice generation completed:', results);
      return results;

    } catch (error) {
      console.error('❌ Failed to generate retroactive invoices:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'invoices',
        'generate_retroactive',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );

      throw error;
    }
  }

  /**
   * Vérifie le statut des factures manquantes
   */
  static async checkMissingInvoicesStatus(): Promise<{
    totalConsultations: number;
    consultationsWithInvoices: number;
    consultationsWithoutInvoices: number;
    missingInvoicesDetails: Array<{
      consultationId: string;
      patientName: string;
      date: string;
      reason: string;
    }>;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      // Récupérer toutes les consultations
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );

      const consultationsSnapshot = await getDocs(consultationsQuery);
      
      // Récupérer toutes les factures
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);
      const existingInvoicesByConsultation = new Set<string>();

      // Créer un index des factures existantes
      invoicesSnapshot.docs.forEach(doc => {
        const invoiceData = doc.data();
        if (invoiceData.consultationId) {
          existingInvoicesByConsultation.add(invoiceData.consultationId);
        }
      });

      // Analyser les consultations sans factures
      const missingInvoicesDetails: Array<{
        consultationId: string;
        patientName: string;
        date: string;
        reason: string;
      }> = [];

      let consultationsWithInvoices = 0;
      let consultationsWithoutInvoices = 0;

      for (const consultationDoc of consultationsSnapshot.docs) {
        const consultationId = consultationDoc.id;
        const consultationData = consultationDoc.data();

        if (existingInvoicesByConsultation.has(consultationId)) {
          consultationsWithInvoices++;
        } else {
          consultationsWithoutInvoices++;
          
          // Formater la date pour l'affichage
          let dateString = 'Date inconnue';
          try {
            if (consultationData.date?.toDate) {
              dateString = consultationData.date.toDate().toLocaleDateString('fr-FR');
            } else if (consultationData.date?.seconds) {
              dateString = new Date(consultationData.date.seconds * 1000).toLocaleDateString('fr-FR');
            } else if (typeof consultationData.date === 'string') {
              dateString = new Date(consultationData.date).toLocaleDateString('fr-FR');
            }
          } catch (error) {
            console.warn(`Error formatting date for consultation ${consultationId}`);
          }

          missingInvoicesDetails.push({
            consultationId,
            patientName: consultationData.patientName || 'Patient inconnu',
            date: dateString,
            reason: consultationData.reason || 'Consultation ostéopathique'
          });
        }
      }

      return {
        totalConsultations: consultationsSnapshot.docs.length,
        consultationsWithInvoices,
        consultationsWithoutInvoices,
        missingInvoicesDetails
      };

    } catch (error) {
      console.error('❌ Failed to check missing invoices status:', error);
      throw error;
    }
  }
}

export default RetroactiveInvoiceService;