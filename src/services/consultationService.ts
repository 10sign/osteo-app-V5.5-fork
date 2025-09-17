import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Consultation, ConsultationFormData } from '../types';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';
import { HDSCompliance } from '../utils/hdsCompliance';

/**
 * Service de déduplication des consultations avec tolérance de 45 minutes
 */
export class ConsultationDeduplicationService {
  /**
   * Déduplique les consultations avec tolérance de 45 minutes
   */
  static async deduplicateConsultations(): Promise<{
    dedupConsultations: number;
    relinkedInvoices: number;
    deletedInvoiceDuplicates: number;
    flaggedForReview: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const results = {
      dedupConsultations: 0,
      relinkedInvoices: 0,
      deletedInvoiceDuplicates: 0,
      flaggedForReview: 0
    };

    try {
      const userId = auth.currentUser.uid;
      
      // 1. Récupérer toutes les consultations
      const consultationsRef = collection(db, 'consultations');
      const q = query(consultationsRef, where('osteopathId', '==', userId));
      const snapshot = await getDocs(q);
      
      const consultations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));

      // 2. Grouper par patient
      const consultationsByPatient = new Map();
      consultations.forEach(consultation => {
        const key = consultation.patientId;
        if (!consultationsByPatient.has(key)) {
          consultationsByPatient.set(key, []);
        }
        consultationsByPatient.get(key).push(consultation);
      });

      // 3. Détecter et traiter les doublons
      for (const [patientId, patientConsultations] of consultationsByPatient) {
        const duplicateGroups = this.findDuplicateConsultations(patientConsultations);
        
        for (const group of duplicateGroups) {
          if (group.length > 1) {
            // Garder la plus ancienne ou la plus complète
            const toKeep = this.selectConsultationToKeep(group);
            const toDelete = group.filter(c => c.id !== toKeep.id);
            
            // Re-pointer les factures vers la consultation conservée
            for (const consultation of toDelete) {
              const relinked = await this.relinkInvoices(consultation.id, toKeep.id);
              results.relinkedInvoices += relinked;
            }
            
            // Supprimer les doublons
            for (const consultation of toDelete) {
              await deleteDoc(doc(db, 'consultations', consultation.id));
              results.dedupConsultations++;
            }
          }
        }
      }

      // 4. Dédupliquer les factures
      const invoiceResults = await this.deduplicateInvoices();
      results.deletedInvoiceDuplicates = invoiceResults.deletedInvoiceDuplicates;
      results.flaggedForReview = invoiceResults.flaggedForReview;

      return results;
    } catch (error) {
      console.error('Error in deduplication:', error);
      throw error;
    }
  }

  /**
   * Trouve les consultations en doublon (< 45 min d'écart)
   */
  private static findDuplicateConsultations(consultations: any[]): any[][] {
    const groups: any[][] = [];
    const processed = new Set();

    for (let i = 0; i < consultations.length; i++) {
      if (processed.has(i)) continue;
      
      const group = [consultations[i]];
      processed.add(i);

      for (let j = i + 1; j < consultations.length; j++) {
        if (processed.has(j)) continue;
        
        if (this.areConsultationsWithin45Minutes(consultations[i], consultations[j])) {
          group.push(consultations[j]);
          processed.add(j);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Vérifie si deux consultations sont à moins de 45 minutes d'écart
   */
  private static areConsultationsWithin45Minutes(consultation1: any, consultation2: any): boolean {
    const date1 = consultation1.date;
    const date2 = consultation2.date;
    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes <= 45;
  }

  /**
   * Sélectionne la consultation à conserver (plus ancienne ou plus complète)
   */
  private static selectConsultationToKeep(consultations: any[]): any {
    // Trier par date de création (plus ancienne en premier)
    consultations.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Retourner la plus ancienne
    return consultations[0];
  }

  /**
   * Re-pointe les factures vers une nouvelle consultation
   */
  private static async relinkInvoices(oldConsultationId: string, newConsultationId: string): Promise<number> {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, where('consultationId', '==', oldConsultationId));
    const snapshot = await getDocs(q);
    
    let count = 0;
    for (const docSnap of snapshot.docs) {
      await updateDoc(docSnap.ref, {
        consultationId: newConsultationId,
        updatedAt: new Date().toISOString()
      });
      count++;
    }
    
    return count;
  }

  /**
   * Déduplique les factures (1 par consultation)
   */
  private static async deduplicateInvoices(): Promise<{
    deletedInvoiceDuplicates: number;
    flaggedForReview: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const results = {
      deletedInvoiceDuplicates: 0,
      flaggedForReview: 0
    };

    try {
      const userId = auth.currentUser.uid;
      
      // Récupérer toutes les factures
      const invoicesRef = collection(db, 'invoices');
      const q = query(invoicesRef, where('osteopathId', '==', userId));
      const snapshot = await getDocs(q);
      
      // Grouper par consultationId
      const invoicesByConsultation = new Map();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const consultationId = data.consultationId || 'no-consultation';
        
        if (!invoicesByConsultation.has(consultationId)) {
          invoicesByConsultation.set(consultationId, []);
        }
        invoicesByConsultation.get(consultationId).push({
          id: doc.id,
          ...data
        });
      });

      // Traiter chaque groupe
      for (const [consultationId, invoices] of invoicesByConsultation) {
        if (invoices.length > 1) {
          // Vérifier si les totaux diffèrent
          const totals = [...new Set(invoices.map(inv => inv.total))];
          
          if (totals.length > 1) {
            // Totaux différents - marquer pour révision
            for (const invoice of invoices) {
              await updateDoc(doc(db, 'invoices', invoice.id), {
                needsReview: true,
                reviewReason: 'Totaux différents entre doublons',
                updatedAt: new Date().toISOString()
              });
            }
            results.flaggedForReview += invoices.length;
          } else {
            // Sélectionner la facture à conserver
            const toKeep = this.selectInvoiceToKeep(invoices);
            const toDelete = invoices.filter(inv => inv.id !== toKeep.id);
            
            // Supprimer les doublons
            for (const invoice of toDelete) {
              await deleteDoc(doc(db, 'invoices', invoice.id));
              results.deletedInvoiceDuplicates++;
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error deduplicating invoices:', error);
      throw error;
    }
  }

  /**
   * Sélectionne la facture à conserver (paid en priorité, sinon la plus récente)
   */
  private static selectInvoiceToKeep(invoices: any[]): any {
    // Priorité aux factures payées
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    if (paidInvoices.length > 0) {
      return paidInvoices[0];
    }

    // Sinon, prendre la plus récente avec un numéro défini
    const withNumber = invoices.filter(inv => inv.number);
    if (withNumber.length > 0) {
      withNumber.sort((a, b) => new Date(b.createdAt || b.issueDate).getTime() - new Date(a.createdAt || a.issueDate).getTime());
      return withNumber[0];
    }

    // Par défaut, prendre la première
    return invoices[0];
  }
}

/**
 * Service de déduplication des consultations avec tolérance de 45 minutes
 */
export class ConsultationDeduplicationService {
  /**
   * Déduplique les consultations avec tolérance de 45 minutes
   */
  static async deduplicateConsultations(): Promise<{
    dedupConsultations: number;
    relinkedInvoices: number;
    deletedInvoiceDuplicates: number;
    flaggedForReview: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const results = {
      dedupConsultations: 0,
      relinkedInvoices: 0,
      deletedInvoiceDuplicates: 0,
      flaggedForReview: 0
    };

    try {
      const userId = auth.currentUser.uid;
      
      // 1. Récupérer toutes les consultations
      const consultationsRef = collection(db, 'consultations');
      const q = query(consultationsRef, where('osteopathId', '==', userId));
      const snapshot = await getDocs(q);
      
      const consultations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));

      // 2. Grouper par patient
      const consultationsByPatient = new Map();
      consultations.forEach(consultation => {
        const key = consultation.patientId;
        if (!consultationsByPatient.has(key)) {
          consultationsByPatient.set(key, []);
        }
        consultationsByPatient.get(key).push(consultation);
      });

      // 3. Détecter et traiter les doublons
      for (const [patientId, patientConsultations] of consultationsByPatient) {
        const duplicateGroups = this.findDuplicateConsultations(patientConsultations);
        
        for (const group of duplicateGroups) {
          if (group.length > 1) {
            // Garder la plus ancienne ou la plus complète
            const toKeep = this.selectConsultationToKeep(group);
            const toDelete = group.filter(c => c.id !== toKeep.id);
            
            // Re-pointer les factures vers la consultation conservée
            for (const consultation of toDelete) {
              const relinked = await this.relinkInvoices(consultation.id, toKeep.id);
              results.relinkedInvoices += relinked;
            }
            
            // Supprimer les doublons
            for (const consultation of toDelete) {
              await deleteDoc(doc(db, 'consultations', consultation.id));
              results.dedupConsultations++;
            }
          }
        }
      }

      // 4. Dédupliquer les factures
      const invoiceResults = await this.deduplicateInvoices();
      results.deletedInvoiceDuplicates = invoiceResults.deletedInvoiceDuplicates;
      results.flaggedForReview = invoiceResults.flaggedForReview;

      return results;
    } catch (error) {
      console.error('Error in deduplication:', error);
      throw error;
    }
  }

  /**
   * Trouve les consultations en doublon (< 45 min d'écart)
   */
  private static findDuplicateConsultations(consultations: any[]): any[][] {
    const groups: any[][] = [];
    const processed = new Set();

    for (let i = 0; i < consultations.length; i++) {
      if (processed.has(i)) continue;
      
      const group = [consultations[i]];
      processed.add(i);

      for (let j = i + 1; j < consultations.length; j++) {
        if (processed.has(j)) continue;
        
        if (this.areConsultationsWithin45Minutes(consultations[i], consultations[j])) {
          group.push(consultations[j]);
          processed.add(j);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Vérifie si deux consultations sont à moins de 45 minutes d'écart
   */
  private static areConsultationsWithin45Minutes(consultation1: any, consultation2: any): boolean {
    const date1 = consultation1.date;
    const date2 = consultation2.date;
    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes <= 45;
  }

  /**
   * Sélectionne la consultation à conserver (plus ancienne ou plus complète)
   */
  private static selectConsultationToKeep(consultations: any[]): any {
    // Trier par date de création (plus ancienne en premier)
    consultations.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Retourner la plus ancienne
    return consultations[0];
  }

  /**
   * Re-pointe les factures vers une nouvelle consultation
   */
  private static async relinkInvoices(oldConsultationId: string, newConsultationId: string): Promise<number> {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, where('consultationId', '==', oldConsultationId));
    const snapshot = await getDocs(q);
    
    let count = 0;
    for (const docSnap of snapshot.docs) {
      await updateDoc(docSnap.ref, {
        consultationId: newConsultationId,
        updatedAt: new Date().toISOString()
      });
      count++;
    }
    
    return count;
  }

  /**
   * Déduplique les factures (1 par consultation)
   */
  private static async deduplicateInvoices(): Promise<{
    deletedInvoiceDuplicates: number;
    flaggedForReview: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const results = {
      deletedInvoiceDuplicates: 0,
      flaggedForReview: 0
    };

    try {
      const userId = auth.currentUser.uid;
      
      // Récupérer toutes les factures
      const invoicesRef = collection(db, 'invoices');
      const q = query(invoicesRef, where('osteopathId', '==', userId));
      const snapshot = await getDocs(q);
      
      // Grouper par consultationId
      const invoicesByConsultation = new Map();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const consultationId = data.consultationId || 'no-consultation';
        
        if (!invoicesByConsultation.has(consultationId)) {
          invoicesByConsultation.set(consultationId, []);
        }
        invoicesByConsultation.get(consultationId).push({
          id: doc.id,
          ...data
        });
      });

      // Traiter chaque groupe
      for (const [consultationId, invoices] of invoicesByConsultation) {
        if (invoices.length > 1) {
          // Vérifier si les totaux diffèrent
          const totals = [...new Set(invoices.map(inv => inv.total))];
          
          if (totals.length > 1) {
            // Totaux différents - marquer pour révision
            for (const invoice of invoices) {
              await updateDoc(doc(db, 'invoices', invoice.id), {
                needsReview: true,
                reviewReason: 'Totaux différents entre doublons',
                updatedAt: new Date().toISOString()
              });
            }
            results.flaggedForReview += invoices.length;
          } else {
            // Sélectionner la facture à conserver
            const toKeep = this.selectInvoiceToKeep(invoices);
            const toDelete = invoices.filter(inv => inv.id !== toKeep.id);
            
            // Supprimer les doublons
            for (const invoice of toDelete) {
              await deleteDoc(doc(db, 'invoices', invoice.id));
              results.deletedInvoiceDuplicates++;
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error deduplicating invoices:', error);
      throw error;
    }
  }

  /**
   * Sélectionne la facture à conserver (paid en priorité, sinon la plus récente)
   */
  private static selectInvoiceToKeep(invoices: any[]): any {
    // Priorité aux factures payées
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    if (paidInvoices.length > 0) {
      return paidInvoices[0];
    }

    // Sinon, prendre la plus récente avec un numéro défini
    const withNumber = invoices.filter(inv => inv.number);
    if (withNumber.length > 0) {
      withNumber.sort((a, b) => new Date(b.createdAt || b.issueDate).getTime() - new Date(a.createdAt || a.issueDate).getTime());
      return withNumber[0];
    }

    // Par défaut, prendre la première
    return invoices[0];
  }
}

export class ConsultationService {
  /**
   * Récupère toutes les consultations
   */
  static async getAllConsultations(): Promise<Consultation[]> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const consultations: Consultation[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        
        // Déchiffrement des données sensibles pour l'affichage
        const decryptedData = HDSCompliance.decryptDataForDisplay(data, 'consultations', auth.currentUser.uid);
        
        consultations.push({
          id: docSnapshot.id,
          ...decryptedData,
          date: data.date?.toDate?.() || new Date(data.date),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        } as Consultation);
      }
      
      // Journalisation de l'accès aux données
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'consultations',
        'read_all',
        SensitivityLevel.SENSITIVE,
        'success',
        { count: consultations.length }
      );
      
      return consultations;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des consultations:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'consultations',
        'read_all',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }

  /**
   * Récupère les consultations d'un patient spécifique
   */
  static async getConsultationsByPatientId(patientId: string): Promise<Consultation[]> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('patientId', '==', patientId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const consultations: Consultation[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        
        // Déchiffrement des données sensibles pour l'affichage
        const decryptedData = HDSCompliance.decryptDataForDisplay(data, 'consultations', auth.currentUser.uid);
        
        consultations.push({
          id: docSnapshot.id,
          ...decryptedData,
          date: data.date?.toDate?.() || new Date(data.date),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        } as Consultation);
      }
      
      // Journalisation de l'accès aux données
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        `consultations/patient/${patientId}`,
        'read_by_patient',
        SensitivityLevel.SENSITIVE,
        'success',
        { patientId, count: consultations.length }
      );
      
      return consultations;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des consultations du patient:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        `consultations/patient/${patientId}`,
        'read_by_patient',
        SensitivityLevel.SENSITIVE,
        'failure',
        { patientId, error: (error as Error).message }
      );
      
      throw error;
    }
  }

  /**
   * Récupère une consultation par son ID
   */
  static async getConsultationById(id: string): Promise<Consultation | null> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const docRef = doc(db, 'consultations', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      
      // Vérification de propriété
      if (data.osteopathId !== auth.currentUser.uid) {
        throw new Error('Accès non autorisé à cette consultation');
      }
      
      // Déchiffrement des données sensibles pour l'affichage
      const decryptedData = HDSCompliance.decryptDataForDisplay(data, 'consultations', auth.currentUser.uid);
      
      const consultation: Consultation = {
        id: docSnap.id,
        ...decryptedData,
        date: data.date?.toDate?.() || new Date(data.date),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as Consultation;
      
      // Journalisation de l'accès aux données
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        `consultations/${id}`,
        'read_single',
        SensitivityLevel.SENSITIVE,
        'success'
      );
      
      return consultation;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la consultation:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        `consultations/${id}`,
        'read_single',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }

  /**
   * Crée une nouvelle consultation
   */
  static async createConsultation(consultationData: ConsultationFormData): Promise<string> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      // Vérifier les doublons avant création
      const existingConsultations = await this.getConsultationsByPatientId(consultationData.patientId);
      const consultationDate = new Date(consultationData.date);
      
      for (const existing of existingConsultations) {
        if (ConsultationDeduplicationService.areConsultationsWithin45Minutes(
          { date: consultationDate },
          { date: existing.date }
        )) {
          throw new Error('Une consultation existe déjà dans cette plage horaire (±45 minutes)');
        }
      }

      // Vérifier les doublons avant création
      const existingConsultations = await this.getConsultationsByPatientId(consultationData.patientId);
      const consultationDate = new Date(consultationData.date);
      
      for (const existing of existingConsultations) {
        if (this.areConsultationsWithin45Minutes(
          { date: consultationDate },
          { date: existing.date }
        )) {
          throw new Error('Une consultation existe déjà dans cette plage horaire (±45 minutes)');
        }
      }

      const userId = auth.currentUser.uid;
      const now = new Date();
      
      // Préparation des données avec chiffrement HDS
      const dataToStore = HDSCompliance.prepareDataForStorage({
        ...consultationData,
        osteopathId: userId,
        date: Timestamp.fromDate(new Date(consultationData.date)),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      }, 'consultations', userId);
      
      const docRef = await addDoc(collection(db, 'consultations'), dataToStore);
      
      // Créer automatiquement une facture pour cette consultation
      try {
        const invoiceData = {
          patientId: consultationData.patientId,
          patientName: consultationData.patientName,
          osteopathId: userId,
          consultationId: docRef.id,
          number: `INV-${Date.now().toString().slice(-6)}`,
          issueDate: new Date(consultationData.date).toISOString().split('T')[0],
          dueDate: new Date(consultationData.date).toISOString().split('T')[0],
          items: [{ 
            id: 'item1', 
            description: consultationData.reason || 'Consultation ostéopathique', 
            quantity: 1, 
            unitPrice: consultationData.price || 60, 
            amount: consultationData.price || 60 
          }],
          subtotal: consultationData.price || 60,
          tax: 0,
          total: consultationData.price || 60,
          status: 'paid',
          paidAt: new Date().toISOString(),
          notes: `Facture générée automatiquement pour la consultation du ${new Date(consultationData.date).toLocaleDateString('fr-FR')}.`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const { InvoiceService } = await import('./invoiceService');
        await InvoiceService.createInvoice(invoiceData);
      } catch (invoiceError) {
        console.warn('⚠️ Erreur lors de la création automatique de la facture:', invoiceError);
      }
      
      // Synchroniser le prochain rendez-vous du patient après création
      if (consultationData.patientId) {
        try {
          const { AppointmentService } = await import('./appointmentService');
          await AppointmentService.syncPatientNextAppointment(consultationData.patientId);
          
          // Si la consultation est terminée, l'ajouter à l'historique du patient
          if (consultationData.status === 'completed') {
            await this.addConsultationToPatientHistory(consultationData.patientId, {
              date: new Date(consultationData.date).toISOString(),
              notes: `${consultationData.reason} - ${consultationData.treatment}`,
              isHistorical: true
            });
          }
        } catch (syncError) {
          console.warn('⚠️ Erreur lors de la synchronisation du patient:', syncError);
        }
      }
      
      // Journalisation de la création
      await AuditLogger.log(
        AuditEventType.DATA_CREATION,
        `consultations/${docRef.id}`,
        'create',
        SensitivityLevel.SENSITIVE,
        'success',
        { patientId: consultationData.patientId }
      );
      
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Erreur lors de la création de la consultation:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_CREATION,
        'consultations',
        'create',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }

  /**
   * Met à jour une consultation existante
   */
  static async updateConsultation(id: string, consultationData: Partial<ConsultationFormData>): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      console.log('🔄 ConsultationService.updateConsultation called with:', { id, consultationData });
      
      const docRef = doc(db, 'consultations', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Consultation non trouvée');
      }
      
      const existingData = docSnap.data();
      console.log('📋 Existing consultation data:', existingData);
      
      // Vérification de propriété
      if (existingData.osteopathId !== auth.currentUser.uid) {
        throw new Error('Accès non autorisé à cette consultation');
      }
      
      const userId = auth.currentUser.uid;
      const updateData = {
        ...consultationData,
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      // Si la date est modifiée, la convertir en Timestamp
      if (consultationData.date) {
        updateData.date = consultationData.date instanceof Date ? 
          Timestamp.fromDate(consultationData.date) : 
          Timestamp.fromDate(new Date(consultationData.date));
      }
      
      console.log('💾 Prepared update data:', updateData);
      
      // Préparation des données avec chiffrement HDS
      const dataToStore = HDSCompliance.prepareDataForStorage(updateData, 'consultations', userId);
      console.log('🔐 Data prepared for storage:', dataToStore);
      
      await updateDoc(docRef, dataToStore);
      console.log('✅ Consultation updated successfully in Firestore');
      
      // Synchroniser le prochain rendez-vous du patient après modification
      if (existingData.patientId) {
        try {
          const { AppointmentService } = await import('./appointmentService');
          await AppointmentService.syncPatientNextAppointment(existingData.patientId);
          console.log('🔄 Patient next appointment synced');
          
          // Si la consultation est maintenant terminée, l'ajouter à l'historique du patient
          if (consultationData.status === 'completed' && existingData.status !== 'completed') {
            await this.addConsultationToPatientHistory(existingData.patientId, {
              date: consultationData.date ? new Date(consultationData.date).toISOString() : existingData.date.toDate().toISOString(),
              notes: `${consultationData.reason || existingData.reason} - ${consultationData.treatment || existingData.treatment}`,
              isHistorical: true
            });
            console.log('📚 Consultation added to patient history');
          }
        } catch (syncError) {
          console.warn('⚠️ Erreur lors de la synchronisation du patient:', syncError);
        }
      }
      
      // Journalisation de la modification
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `consultations/${id}`,
        'update',
        SensitivityLevel.SENSITIVE,
        'success',
        { fields: Object.keys(consultationData) }
      );
      
      console.log('📊 Audit log created for consultation update');
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la consultation:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `consultations/${id}`,
        'update',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }

  /**
   * Supprime une consultation
   */
  static async deleteConsultation(id: string): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const docRef = doc(db, 'consultations', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Consultation non trouvée');
      }
      
      const data = docSnap.data();
      
      // Vérification de propriété
      if (data.osteopathId !== auth.currentUser.uid) {
        throw new Error('Accès non autorisé à cette consultation');
      }
      
      // Récupérer le patientId avant suppression
      const patientId = data.patientId;
      
      await deleteDoc(docRef);
      
      // Synchroniser le prochain rendez-vous du patient après suppression
      if (patientId) {
        try {
          const { AppointmentService } = await import('./appointmentService');
          await AppointmentService.syncPatientNextAppointment(patientId);
        } catch (syncError) {
          console.warn('⚠️ Erreur lors de la synchronisation du patient:', syncError);
        }
      }
      
      // Journalisation de la suppression
      await AuditLogger.log(
        AuditEventType.DATA_DELETION,
        `consultations/${id}`,
        'delete',
        SensitivityLevel.SENSITIVE,
        'success',
        { patientId }
      );
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la consultation:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_DELETION,
        `consultations/${id}`,
        'delete',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }

  /**
   * Ajoute une consultation à l'historique des rendez-vous passés du patient
   */
  private static async addConsultationToPatientHistory(
    patientId: string,
    appointmentData: {
      date: string;
      notes: string;
      isHistorical: boolean;
    }
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const patientRef = doc(db, 'patients', patientId);
      const patientDoc = await getDoc(patientRef);
      
      if (!patientDoc.exists()) {
        console.warn(`⚠️ Patient ${patientId} non trouvé pour mise à jour de l'historique`);
        return;
      }
      
      const patientData = patientDoc.data();
      const currentPastAppointments = patientData.pastAppointments || [];
      
      // Vérifier si cette consultation n'est pas déjà dans l'historique
      const existingAppointment = currentPastAppointments.find((app: any) => 
        app.date === appointmentData.date
      );
      
      if (!existingAppointment) {
        // Ajouter la nouvelle consultation à l'historique
        const updatedPastAppointments = [...currentPastAppointments, appointmentData];
        
        // Trier par date décroissante (plus récent en premier)
        updatedPastAppointments.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        await updateDoc(patientRef, {
          pastAppointments: updatedPastAppointments,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Consultation ajoutée à l'historique du patient ${patientId}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout à l\'historique du patient:', error);
    }
  }
  /**
   * Récupère les statistiques des consultations
   */
  static async getConsultationStats(): Promise<{
    total: number;
    thisMonth: number;
    completed: number;
    pending: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      let total = 0;
      let thisMonth = 0;
      let completed = 0;
      let pending = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const consultationDate = data.date?.toDate?.() || new Date(data.date);
        
        total++;
        
        if (consultationDate >= startOfMonth) {
          thisMonth++;
        }
        
        if (data.status === 'completed') {
          completed++;
        } else {
          pending++;
        }
      });
      
      // Journalisation de l'accès aux statistiques
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'consultations/stats',
        'read_stats',
        SensitivityLevel.LOW,
        'success'
      );
      
      return {
        total,
        thisMonth,
        completed,
        pending
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'consultations/stats',
        'read_stats',
        SensitivityLevel.LOW,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
}