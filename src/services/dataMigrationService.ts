import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';
import { AppointmentService } from './appointmentService';
// Analytics supprimés: retirer les imports et utiliser des stubs locaux
const trackEvent = (..._args: any[]) => {};
const trackMatomoEvent = (..._args: any[]) => {};
const trackGAEvent = (..._args: any[]) => {};

/**
 * Service pour la migration des données de test vers des données réelles
 */
export class DataMigrationService {
  /**
   * Migre toutes les données de test vers des données réelles
   */
  static async migrateTestData(): Promise<{
    patientsUpdated: number;
    appointmentsUpdated: number;
    consultationsUpdated: number;
    invoicesUpdated: number;
    errors: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      // Journaliser le début de la migration
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'all',
        'migrate_test_data',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'success',
        { phase: 'started' }
      );
      
      // Tracking analytics
      trackEvent("data_migration_started");
      trackMatomoEvent('Data', 'Migration Started', 'Test to Production');
      trackGAEvent('data_migration_started');
      
      // Résultats de la migration
      const results = {
        patientsUpdated: 0,
        appointmentsUpdated: 0,
        consultationsUpdated: 0,
        invoicesUpdated: 0,
        errors: 0
      };
      
      // 1. Migrer les patients
      const patientsResult = await this.migratePatients();
      results.patientsUpdated = patientsResult.updated;
      results.errors += patientsResult.errors;
      
      // 2. Migrer les rendez-vous
      const appointmentsResult = await this.migrateAppointments();
      results.appointmentsUpdated = appointmentsResult.updated;
      results.errors += appointmentsResult.errors;
      
      // 3. Migrer les consultations
      const consultationsResult = await this.migrateConsultations();
      results.consultationsUpdated = consultationsResult.updated;
      results.errors += consultationsResult.errors;
      
      // 4. Migrer les factures
      const invoicesResult = await this.migrateInvoices();
      results.invoicesUpdated = invoicesResult.updated;
      results.errors += invoicesResult.errors;
      
      // 5. Synchroniser les rendez-vous des patients
      await AppointmentService.syncAllPatientAppointments();
      
      // Journaliser la fin de la migration
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'all',
        'migrate_test_data',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'success',
        results
      );
      
      // Tracking analytics
      trackEvent("data_migration_completed", results);
      trackMatomoEvent('Data', 'Migration Completed', 'Test to Production', 
        results.patientsUpdated + results.appointmentsUpdated + 
        results.consultationsUpdated + results.invoicesUpdated);
      trackGAEvent('data_migration_completed', results);
      
      return results;
    } catch (error) {
      console.error('❌ Failed to migrate test data:', error);
      
      // Journaliser l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'all',
        'migrate_test_data',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      // Tracking analytics
      trackEvent("data_migration_error", { error: (error as Error).message });
      trackMatomoEvent('Data', 'Migration Error', (error as Error).message);
      trackGAEvent('data_migration_error', { error_message: (error as Error).message });
      
      throw error;
    }
  }
  
  /**
   * Migre les patients de test vers des patients réels
   */
  private static async migratePatients(): Promise<{
    updated: number;
    errors: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupérer tous les patients de test
      const patientsRef = collection(db, 'patients');
      const q = query(
        patientsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('isTestData', '==', true)
      );
      
      const snapshot = await getDocs(q);
      let updated = 0;
      let errors = 0;
      
      // Traiter chaque patient
      for (const docSnap of snapshot.docs) {
        try {
          const patientData = docSnap.data();
          
          // Mettre à jour le patient pour le marquer comme réel
          await updateDoc(doc(db, 'patients', docSnap.id), {
            isTestData: false,
            updatedAt: new Date().toISOString(),
            migratedAt: new Date().toISOString(),
            migratedBy: auth.currentUser.uid
          });
          
          updated++;
          
          // Journaliser la migration
          await AuditLogger.log(
            AuditEventType.DATA_MODIFICATION,
            `patients/${docSnap.id}`,
            'migrate_to_production',
            SensitivityLevel.SENSITIVE,
            'success',
            { patientName: `${patientData.firstName} ${patientData.lastName}` }
          );
        } catch (error) {
          console.error(`❌ Failed to migrate patient ${docSnap.id}:`, error);
          errors++;
        }
      }
      
      return { updated, errors };
    } catch (error) {
      console.error('❌ Failed to migrate patients:', error);
      throw error;
    }
  }
  
  /**
   * Migre les rendez-vous de test vers des rendez-vous réels
   */
  private static async migrateAppointments(): Promise<{
    updated: number;
    errors: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupérer tous les rendez-vous de test
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('isTestData', '==', true)
      );
      
      const snapshot = await getDocs(q);
      let updated = 0;
      let errors = 0;
      
      // Traiter chaque rendez-vous
      for (const docSnap of snapshot.docs) {
        try {
          // Mettre à jour le rendez-vous pour le marquer comme réel
          await updateDoc(doc(db, 'appointments', docSnap.id), {
            isTestData: false,
            updatedAt: Timestamp.now(),
            migratedAt: Timestamp.now(),
            migratedBy: auth.currentUser.uid
          });
          
          updated++;
          
          // Journaliser la migration
          await AuditLogger.log(
            AuditEventType.DATA_MODIFICATION,
            `appointments/${docSnap.id}`,
            'migrate_to_production',
            SensitivityLevel.SENSITIVE,
            'success'
          );
        } catch (error) {
          console.error(`❌ Failed to migrate appointment ${docSnap.id}:`, error);
          errors++;
        }
      }
      
      return { updated, errors };
    } catch (error) {
      console.error('❌ Failed to migrate appointments:', error);
      throw error;
    }
  }
  
  /**
   * Migre les consultations de test vers des consultations réelles
   */
  private static async migrateConsultations(): Promise<{
    updated: number;
    errors: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupérer toutes les consultations de test
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('isTestData', '==', true)
      );
      
      const snapshot = await getDocs(q);
      let updated = 0;
      let errors = 0;
      
      // Traiter chaque consultation
      for (const docSnap of snapshot.docs) {
        try {
          // Mettre à jour la consultation pour la marquer comme réelle
          await updateDoc(doc(db, 'consultations', docSnap.id), {
            isTestData: false,
            updatedAt: Timestamp.now(),
            migratedAt: Timestamp.now(),
            migratedBy: auth.currentUser.uid
          });
          
          updated++;
          
          // Journaliser la migration
          await AuditLogger.log(
            AuditEventType.DATA_MODIFICATION,
            `consultations/${docSnap.id}`,
            'migrate_to_production',
            SensitivityLevel.HIGHLY_SENSITIVE,
            'success'
          );
        } catch (error) {
          console.error(`❌ Failed to migrate consultation ${docSnap.id}:`, error);
          errors++;
        }
      }
      
      return { updated, errors };
    } catch (error) {
      console.error('❌ Failed to migrate consultations:', error);
      throw error;
    }
  }
  
  /**
   * Migre les factures de test vers des factures réelles
   */
  private static async migrateInvoices(): Promise<{
    updated: number;
    errors: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupérer toutes les factures de test
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('isTestData', '==', true)
      );
      
      const snapshot = await getDocs(q);
      let updated = 0;
      let errors = 0;
      
      // Traiter chaque facture
      for (const docSnap of snapshot.docs) {
        try {
          // Mettre à jour la facture pour la marquer comme réelle
          await updateDoc(doc(db, 'invoices', docSnap.id), {
            isTestData: false,
            updatedAt: new Date().toISOString(),
            migratedAt: new Date().toISOString(),
            migratedBy: auth.currentUser.uid
          });
          
          updated++;
          
          // Journaliser la migration
          await AuditLogger.log(
            AuditEventType.DATA_MODIFICATION,
            `invoices/${docSnap.id}`,
            'migrate_to_production',
            SensitivityLevel.SENSITIVE,
            'success'
          );
        } catch (error) {
          console.error(`❌ Failed to migrate invoice ${docSnap.id}:`, error);
          errors++;
        }
      }
      
      return { updated, errors };
    } catch (error) {
      console.error('❌ Failed to migrate invoices:', error);
      throw error;
    }
  }
  
  /**
   * Nettoie les doublons de consultations et factures pour tous les patients
   */
  static async cleanDuplicateConsultationsAndInvoices(): Promise<{
    consultationsCleaned: number;
    invoicesCleaned: number;
    patientsProcessed: number;
    errors: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const results = {
        consultationsCleaned: 0,
        invoicesCleaned: 0,
        patientsProcessed: 0,
        errors: 0
      };

      // Récupérer tous les patients
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(
        patientsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const patientsSnapshot = await getDocs(patientsQuery);
      
      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const patientData = patientDoc.data();
        const patientName = `${patientData.firstName} ${patientData.lastName}`;
        
        results.patientsProcessed++;
        
        try {
          // 1. Nettoyer les consultations en double pour ce patient
          const consultationsRef = collection(db, 'consultations');
          const consultationsQuery = query(
            consultationsRef,
            where('patientId', '==', patientId),
            where('osteopathId', '==', auth.currentUser.uid)
          );
          
          const consultationsSnapshot = await getDocs(consultationsQuery);
          type ConsultationRecord = { id: string; date?: any; [key: string]: any };
          const consultations: ConsultationRecord[] = consultationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any)
          }));
          
          // Garder seulement la consultation la plus récente
          if (consultations.length > 1) {
            consultations.sort((a, b) => {
              const dateA = a.date?.toDate?.() || new Date(a.date);
              const dateB = b.date?.toDate?.() || new Date(b.date);
              return dateB.getTime() - dateA.getTime();
            });
            
            const consultationToKeep = consultations[0];
            const consultationsToDelete = consultations.slice(1);
            
            // Supprimer les consultations en double
            for (const consultation of consultationsToDelete) {
              await deleteDoc(doc(db, 'consultations', consultation.id));
              results.consultationsCleaned++;
            }
            
            console.log(`✅ ${consultationsToDelete.length} consultations en double supprimées pour ${patientName}`);
          } else if (consultations.length === 0) {
            // Aucune consultation pour ce patient, en créer une
            const consultationData = {
              patientId: patientId,
              patientName: patientName,
              osteopathId: auth.currentUser.uid,
              date: Timestamp.now(),
              reason: 'Consultation initiale',
              treatment: 'Évaluation ostéopathique',
              notes: 'Consultation générée automatiquement lors du nettoyage',
              duration: 60,
              price: 60,
              status: 'completed',
              examinations: [],
              prescriptions: [],
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            };
            
            const consultationRef = await addDoc(collection(db, 'consultations'), consultationData);
            console.log(`✅ Consultation créée pour le patient ${patientName}`);
          }
          
          // 2. Nettoyer les factures en double pour ce patient
          const invoicesRef = collection(db, 'invoices');
          const invoicesQuery = query(
            invoicesRef,
            where('patientId', '==', patientId),
            where('osteopathId', '==', auth.currentUser.uid)
          );
          
          const invoicesSnapshot = await getDocs(invoicesQuery);
          type InvoiceRecord = { id: string; issueDate?: any; [key: string]: any };
          const invoices: InvoiceRecord[] = invoicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any)
          }));
          
          // Garder seulement la facture la plus récente
          if (invoices.length > 1) {
            invoices.sort((a, b) => {
              const toDateSafe = (val: any): Date => {
                if (!val) return new Date(0);
                // Firestore Timestamp support
                if (val?.toDate && typeof val.toDate === 'function') {
                  try { return val.toDate(); } catch { return new Date(0); }
                }
                try { return new Date(val as string); } catch { return new Date(0); }
              };
              const dateA = toDateSafe(a.issueDate);
              const dateB = toDateSafe(b.issueDate);
              return dateB.getTime() - dateA.getTime();
            });
            
            const invoiceToKeep = invoices[0];
            const invoicesToDelete = invoices.slice(1);
            
            // Supprimer les factures en double
            for (const invoice of invoicesToDelete) {
              await deleteDoc(doc(db, 'invoices', invoice.id));
              results.invoicesCleaned++;
            }
            
            console.log(`✅ ${invoicesToDelete.length} factures en double supprimées pour ${patientName}`);
            
          } else if (invoices.length === 0) {
            // Aucune facture pour ce patient, en créer une si il y a une consultation
            const consultationsRef = collection(db, 'consultations');
            const consultationsQuery = query(
              consultationsRef,
              where('patientId', '==', patientId),
              where('osteopathId', '==', auth.currentUser.uid)
            );
            
            const consultationsSnapshot = await getDocs(consultationsQuery);
            if (!consultationsSnapshot.empty) {
              const consultation = consultationsSnapshot.docs[0].data();
              
              const invoiceData = {
                number: `F-${Date.now()}-${patientId.slice(-4)}`,
                patientId: patientId,
                patientName: patientName,
                osteopathId: auth.currentUser.uid,
                consultationId: consultationsSnapshot.docs[0].id,
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                items: [{
                  id: crypto.randomUUID(),
                  description: consultation.reason || 'Consultation ostéopathique',
                  quantity: 1,
                  unitPrice: consultation.price || 60,
                  amount: consultation.price || 60
                }],
                subtotal: consultation.price || 60,
                tax: 0,
                total: consultation.price || 60,
                status: 'paid',
                notes: 'Facture générée automatiquement lors du nettoyage',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              await addDoc(collection(db, 'invoices'), invoiceData);
              console.log(`✅ Facture créée pour le patient ${patientName}`);
            }
          }
          
          // 3. Lier la facture restante à la consultation restante
          const finalConsultationsSnapshot = await getDocs(query(
            collection(db, 'consultations'),
            where('patientId', '==', patientId),
            where('osteopathId', '==', auth.currentUser.uid)
          ));
          
          const finalInvoicesSnapshot = await getDocs(query(
            collection(db, 'invoices'),
            where('patientId', '==', patientId),
            where('osteopathId', '==', auth.currentUser.uid)
          ));
          
          if (!finalConsultationsSnapshot.empty && !finalInvoicesSnapshot.empty) {
            const consultationToKeep = finalConsultationsSnapshot.docs[0];
            const invoiceToKeep = finalInvoicesSnapshot.docs[0];
            
            await updateDoc(doc(db, 'invoices', invoiceToKeep.id), {
              consultationId: consultationToKeep.id,
              updatedAt: new Date().toISOString()
            });
            
            console.log(`✅ Facture ${invoiceToKeep.data().number} liée à la consultation ${consultationToKeep.id}`);
          }
          
        } catch (error) {
          console.error(`❌ Erreur lors du nettoyage pour le patient ${patientName}:`, error);
          results.errors++;
        }
      }
      
      // Journaliser l'opération
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'all',
        'clean_duplicates',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'success',
        results
      );
      
      return results;
      
    } catch (error) {
      console.error('❌ Failed to clean duplicates:', error);
      
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'all',
        'clean_duplicates',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }

  /**
   * Vérifie l'intégrité des données
   */
  static async verifyDataIntegrity(): Promise<{
    brokenPatientReferences: number;
    brokenAppointmentReferences: number;
    brokenConsultationReferences: number;
    brokenInvoiceReferences: number;
    fixedReferences: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Journaliser le début de la vérification
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'all',
        'verify_integrity',
        SensitivityLevel.INTERNAL,
        'success',
        { phase: 'started' }
      );
      
      // Résultats de la vérification
      const results = {
        brokenPatientReferences: 0,
        brokenAppointmentReferences: 0,
        brokenConsultationReferences: 0,
        brokenInvoiceReferences: 0,
        fixedReferences: 0
      };
      
      // 1. Récupérer tous les patients
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(
        patientsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const patientsSnapshot = await getDocs(patientsQuery);
      const patientIds = new Set(patientsSnapshot.docs.map(doc => doc.id));
      
      // 2. Vérifier les références dans les rendez-vous
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsQuery = query(
        appointmentsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      for (const docSnap of appointmentsSnapshot.docs) {
        const appointmentData = docSnap.data();
        
        // Vérifier si le patient existe
        if (appointmentData.patientId && !patientIds.has(appointmentData.patientId)) {
          results.brokenPatientReferences++;
          
          // Marquer le rendez-vous comme orphelin
          await updateDoc(doc(db, 'appointments', docSnap.id), {
            patientMissing: true,
            updatedAt: Timestamp.now()
          });
          
          results.fixedReferences++;
        }
      }
      
      // 3. Vérifier les références dans les consultations
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const consultationsSnapshot = await getDocs(consultationsQuery);
      
      for (const docSnap of consultationsSnapshot.docs) {
        const consultationData = docSnap.data();
        
        // Vérifier si le patient existe
        if (consultationData.patientId && !patientIds.has(consultationData.patientId)) {
          results.brokenConsultationReferences++;
          
          // Marquer la consultation comme orpheline
          await updateDoc(doc(db, 'consultations', docSnap.id), {
            patientMissing: true,
            updatedAt: Timestamp.now()
          });
          
          results.fixedReferences++;
        }
      }
      
      // 4. Vérifier les références dans les factures
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const invoicesSnapshot = await getDocs(invoicesQuery);
      
      for (const docSnap of invoicesSnapshot.docs) {
        const invoiceData = docSnap.data();
        
        // Vérifier si le patient existe
        if (invoiceData.patientId && !patientIds.has(invoiceData.patientId)) {
          results.brokenInvoiceReferences++;
          
          // Marquer la facture comme orpheline
          await updateDoc(doc(db, 'invoices', docSnap.id), {
            patientMissing: true,
            updatedAt: Timestamp.now()
          });
          
          results.fixedReferences++;
        }
      }
      
      // Journaliser la fin de la vérification
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'all',
        'verify_integrity',
        SensitivityLevel.INTERNAL,
        'success',
        results
      );
      
      return results;
    } catch (error) {
      console.error('❌ Failed to verify data integrity:', error);
      
      // Journaliser l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'all',
        'verify_integrity',
        SensitivityLevel.INTERNAL,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Répare les références brisées
   */
  static async repairBrokenReferences(): Promise<{
    fixedAppointments: number;
    fixedConsultations: number;
    fixedInvoices: number;
    errors: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Journaliser le début de la réparation
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'all',
        'repair_references',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'success',
        { phase: 'started' }
      );
      
      // Résultats de la réparation
      const results = {
        fixedAppointments: 0,
        fixedConsultations: 0,
        fixedInvoices: 0,
        errors: 0
      };
      
      // 1. Réparer les rendez-vous orphelins
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsQuery = query(
        appointmentsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('patientMissing', '==', true)
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      for (const docSnap of appointmentsSnapshot.docs) {
        try {
          // Supprimer le rendez-vous orphelin
          await deleteDoc(docSnap.ref);
          results.fixedAppointments++;
        } catch (error) {
          console.error(`❌ Failed to fix appointment ${docSnap.id}:`, error);
          results.errors++;
        }
      }
      
      // 2. Réparer les consultations orphelines
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('patientMissing', '==', true)
      );
      
      const consultationsSnapshot = await getDocs(consultationsQuery);
      
      for (const docSnap of consultationsSnapshot.docs) {
        try {
          // Supprimer la consultation orpheline
          await deleteDoc(docSnap.ref);
          results.fixedConsultations++;
        } catch (error) {
          console.error(`❌ Failed to fix consultation ${docSnap.id}:`, error);
          results.errors++;
        }
      }
      
      // 3. Réparer les factures orphelines
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('patientMissing', '==', true)
      );
      
      const invoicesSnapshot = await getDocs(invoicesQuery);
      
      for (const docSnap of invoicesSnapshot.docs) {
        try {
          // Supprimer la facture orpheline
          await deleteDoc(docSnap.ref);
          results.fixedInvoices++;
        } catch (error) {
          console.error(`❌ Failed to fix invoice ${docSnap.id}:`, error);
          results.errors++;
        }
      }
      
      // Journaliser la fin de la réparation
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'all',
        'repair_references',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'success',
        results
      );
      
      return results;
    } catch (error) {
      console.error('❌ Failed to repair broken references:', error);
      
      // Journaliser l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'all',
        'repair_references',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Génère un rapport de migration
   */
  static async generateMigrationReport(): Promise<{
    totalPatients: number;
    totalAppointments: number;
    totalConsultations: number;
    totalInvoices: number;
    testPatients: number;
    testAppointments: number;
    testConsultations: number;
    testInvoices: number;
    realPatients: number;
    realAppointments: number;
    realConsultations: number;
    realInvoices: number;
    brokenReferences: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Journaliser le début du rapport
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'all',
        'migration_report',
        SensitivityLevel.INTERNAL,
        'success',
        { phase: 'started' }
      );
      
      // Résultats du rapport
      const results = {
        totalPatients: 0,
        totalAppointments: 0,
        totalConsultations: 0,
        totalInvoices: 0,
        testPatients: 0,
        testAppointments: 0,
        testConsultations: 0,
        testInvoices: 0,
        realPatients: 0,
        realAppointments: 0,
        realConsultations: 0,
        realInvoices: 0,
        brokenReferences: 0
      };
      
      // 1. Compter les patients
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(
        patientsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const patientsSnapshot = await getDocs(patientsQuery);
      results.totalPatients = patientsSnapshot.size;
      
      for (const docSnap of patientsSnapshot.docs) {
        const patientData = docSnap.data();
        if (patientData.isTestData) {
          results.testPatients++;
        } else {
          results.realPatients++;
        }
      }
      
      // 2. Compter les rendez-vous
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsQuery = query(
        appointmentsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      results.totalAppointments = appointmentsSnapshot.size;
      
      for (const docSnap of appointmentsSnapshot.docs) {
        const appointmentData = docSnap.data();
        if (appointmentData.isTestData) {
          results.testAppointments++;
        } else {
          results.realAppointments++;
        }
        
        // Vérifier si le patient existe
        if (appointmentData.patientId) {
          const patientRef = doc(db, 'patients', appointmentData.patientId);
          const patientDoc = await getDoc(patientRef);
          if (!patientDoc.exists()) {
            results.brokenReferences++;
          }
        }
      }
      
      // 3. Compter les consultations
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const consultationsSnapshot = await getDocs(consultationsQuery);
      results.totalConsultations = consultationsSnapshot.size;
      
      for (const docSnap of consultationsSnapshot.docs) {
        const consultationData = docSnap.data();
        if (consultationData.isTestData) {
          results.testConsultations++;
        } else {
          results.realConsultations++;
        }
      }
      
      // 4. Compter les factures
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const invoicesSnapshot = await getDocs(invoicesQuery);
      results.totalInvoices = invoicesSnapshot.size;
      
      for (const docSnap of invoicesSnapshot.docs) {
        const invoiceData = docSnap.data();
        if (invoiceData.isTestData) {
          results.testInvoices++;
        } else {
          results.realInvoices++;
        }
      }
      
      // Journaliser la fin du rapport
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'all',
        'migration_report',
        SensitivityLevel.INTERNAL,
        'success',
        results
      );
      
      return results;
    } catch (error) {
      console.error('❌ Failed to generate migration report:', error);

      // Journaliser l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'all',
        'migration_report',
        SensitivityLevel.INTERNAL,
        'failure',
        { error: (error as Error).message }
      );

      throw error;
    }
  }

  /**
   * Génère un rapport de migration global pour TOUS les ostéopathes
   */
  static async generateGlobalMigrationReport(): Promise<{
    osteopaths: Array<{
      id: string;
      name: string;
      email: string;
      totalPatients: number;
      totalAppointments: number;
      totalConsultations: number;
      totalInvoices: number;
      testPatients: number;
      testAppointments: number;
      testConsultations: number;
      testInvoices: number;
      realPatients: number;
      realAppointments: number;
      realConsultations: number;
      realInvoices: number;
    }>;
    totals: {
      totalPatients: number;
      totalAppointments: number;
      totalConsultations: number;
      totalInvoices: number;
      testPatients: number;
      testAppointments: number;
      testConsultations: number;
      testInvoices: number;
      realPatients: number;
      realAppointments: number;
      realConsultations: number;
      realInvoices: number;
    };
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      console.log('📊 Génération du rapport global de migration...');

      const osteopaths: Array<any> = [];
      const totals = {
        totalPatients: 0,
        totalAppointments: 0,
        totalConsultations: 0,
        totalInvoices: 0,
        testPatients: 0,
        testAppointments: 0,
        testConsultations: 0,
        testInvoices: 0,
        realPatients: 0,
        realAppointments: 0,
        realConsultations: 0,
        realInvoices: 0
      };

      // 1. Récupérer tous les utilisateurs pour diagnostiquer les rôles
      const usersRef = collection(db, 'users');

      // D'abord, lister TOUS les utilisateurs pour voir leurs rôles
      const allUsersSnapshot = await getDocs(usersRef);
      console.log(`🔍 DIAGNOSTIC: ${allUsersSnapshot.size} utilisateurs au total`);

      const roleCount: Record<string, number> = {};
      allUsersSnapshot.docs.forEach(doc => {
        const role = doc.data().role || 'undefined';
        roleCount[role] = (roleCount[role] || 0) + 1;
        console.log(`  - ${doc.data().email}: role = "${role}"`);
      });

      console.log('\n📊 Répartition des rôles:');
      Object.entries(roleCount).forEach(([role, count]) => {
        console.log(`  - "${role}": ${count} utilisateur(s)`);
      });

      // Maintenant, essayer de récupérer les ostéopathes avec différents rôles
      console.log('\n🔎 Tentative avec role = "osteopath"...');
      const usersQuery1 = query(usersRef, where('role', '==', 'osteopath'));
      const usersSnapshot1 = await getDocs(usersQuery1);
      console.log(`  → ${usersSnapshot1.size} utilisateur(s) trouvé(s)`);

      console.log('\n🔎 Tentative avec role = "user"...');
      const usersQuery2 = query(usersRef, where('role', '==', 'user'));
      const usersSnapshot2 = await getDocs(usersQuery2);
      console.log(`  → ${usersSnapshot2.size} utilisateur(s) trouvé(s)`);

      // Utiliser le résultat qui contient des données
      const usersSnapshot = usersSnapshot1.size > 0 ? usersSnapshot1 : usersSnapshot2;
      console.log(`\n👥 ${usersSnapshot.size} ostéopathes sélectionnés pour le rapport`);

      // 2. Pour chaque ostéopathe, compter ses données
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const osteopathName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Inconnu';

        console.log(`\n📋 Analyse de: ${osteopathName} (${userData.email})`);

        const osteopathStats = {
          id: userId,
          name: osteopathName,
          email: userData.email || '',
          totalPatients: 0,
          totalAppointments: 0,
          totalConsultations: 0,
          totalInvoices: 0,
          testPatients: 0,
          testAppointments: 0,
          testConsultations: 0,
          testInvoices: 0,
          realPatients: 0,
          realAppointments: 0,
          realConsultations: 0,
          realInvoices: 0
        };

        // Compter les patients
        const patientsRef = collection(db, 'patients');
        const patientsQuery = query(patientsRef, where('osteopathId', '==', userId));
        const patientsSnapshot = await getDocs(patientsQuery);

        osteopathStats.totalPatients = patientsSnapshot.size;
        for (const docSnap of patientsSnapshot.docs) {
          const patientData = docSnap.data();
          if (patientData.isTestData) {
            osteopathStats.testPatients++;
          } else {
            osteopathStats.realPatients++;
          }
        }

        // Compter les rendez-vous
        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(appointmentsRef, where('osteopathId', '==', userId));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);

        osteopathStats.totalAppointments = appointmentsSnapshot.size;
        for (const docSnap of appointmentsSnapshot.docs) {
          const appointmentData = docSnap.data();
          if (appointmentData.isTestData) {
            osteopathStats.testAppointments++;
          } else {
            osteopathStats.realAppointments++;
          }
        }

        // Compter les consultations
        const consultationsRef = collection(db, 'consultations');
        const consultationsQuery = query(consultationsRef, where('osteopathId', '==', userId));
        const consultationsSnapshot = await getDocs(consultationsQuery);

        osteopathStats.totalConsultations = consultationsSnapshot.size;
        for (const docSnap of consultationsSnapshot.docs) {
          const consultationData = docSnap.data();
          if (consultationData.isTestData) {
            osteopathStats.testConsultations++;
          } else {
            osteopathStats.realConsultations++;
          }
        }

        // Compter les factures
        const invoicesRef = collection(db, 'invoices');
        const invoicesQuery = query(invoicesRef, where('osteopathId', '==', userId));
        const invoicesSnapshot = await getDocs(invoicesQuery);

        osteopathStats.totalInvoices = invoicesSnapshot.size;
        for (const docSnap of invoicesSnapshot.docs) {
          const invoiceData = docSnap.data();
          if (invoiceData.isTestData) {
            osteopathStats.testInvoices++;
          } else {
            osteopathStats.realInvoices++;
          }
        }

        console.log(`  ✓ ${osteopathStats.totalPatients} patients, ${osteopathStats.totalConsultations} consultations`);

        // Ajouter aux totaux
        totals.totalPatients += osteopathStats.totalPatients;
        totals.totalAppointments += osteopathStats.totalAppointments;
        totals.totalConsultations += osteopathStats.totalConsultations;
        totals.totalInvoices += osteopathStats.totalInvoices;
        totals.testPatients += osteopathStats.testPatients;
        totals.testAppointments += osteopathStats.testAppointments;
        totals.testConsultations += osteopathStats.testConsultations;
        totals.testInvoices += osteopathStats.testInvoices;
        totals.realPatients += osteopathStats.realPatients;
        totals.realAppointments += osteopathStats.realAppointments;
        totals.realConsultations += osteopathStats.realConsultations;
        totals.realInvoices += osteopathStats.realInvoices;

        osteopaths.push(osteopathStats);
      }

      console.log('\n✅ Rapport global généré avec succès');

      return { osteopaths, totals };

    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport global:', error);
      throw error;
    }
  }
}

export default DataMigrationService;