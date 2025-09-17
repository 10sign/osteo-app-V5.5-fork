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
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';
import { HDSCompliance } from '../utils/hdsCompliance';
import { InvoiceService } from './invoiceService';

export class ConsultationService {
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
   * Crée une nouvelle consultation avec vérification anti-doublons
   */
  static async createConsultation(consultationData: any): Promise<string> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      // Vérifier les doublons existants
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('patientId', '==', consultationData.patientId)
      );
      
      const querySnapshot = await getDocs(q);
      const existingConsultations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));
      
      const consultationDate = new Date(consultationData.date);
      
      // Vérifier les doublons (tolérance 45 minutes)
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
   * Déduplique les consultations et factures
   */
  static async deduplicateData(): Promise<{
    dedupConsultations: number;
    deletedInvoiceDuplicates: number;
    invoicesUpdatedToPaid: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const results = {
      dedupConsultations: 0,
      deletedInvoiceDuplicates: 0,
      invoicesUpdatedToPaid: 0
    };

    try {
      const userId = auth.currentUser.uid;
      
      // 1. Dédupliquer les consultations
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(consultationsRef, where('osteopathId', '==', userId));
      const consultationsSnapshot = await getDocs(consultationsQuery);
      
      const consultations = consultationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));

      // Grouper par patient
      const consultationsByPatient = new Map();
      consultations.forEach(consultation => {
        const key = consultation.patientId;
        if (!consultationsByPatient.has(key)) {
          consultationsByPatient.set(key, []);
        }
        consultationsByPatient.get(key).push(consultation);
      });

      // Détecter et supprimer les doublons
      for (const [patientId, patientConsultations] of consultationsByPatient) {
        const duplicateGroups = this.findDuplicateConsultations(patientConsultations);
        
        for (const group of duplicateGroups) {
          if (group.length > 1) {
            // Garder la plus ancienne
            const toKeep = group.sort((a, b) => 
              new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
            )[0];
            const toDelete = group.filter(c => c.id !== toKeep.id);
            
            // Supprimer les doublons
            for (const consultation of toDelete) {
              await deleteDoc(doc(db, 'consultations', consultation.id));
              results.dedupConsultations++;
            }
          }
        }
      }

      // 2. Dédupliquer les factures
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(invoicesRef, where('osteopathId', '==', userId));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      
      // Grouper par consultationId
      const invoicesByConsultation = new Map();
      invoicesSnapshot.docs.forEach(doc => {
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

      // Traiter chaque groupe de factures
      for (const [consultationId, invoices] of invoicesByConsultation) {
        if (invoices.length > 1) {
          // Garder la première facture (paid en priorité)
          const toKeep = invoices.find(inv => inv.status === 'paid') || invoices[0];
          const toDelete = invoices.filter(inv => inv.id !== toKeep.id);
          
          // Supprimer les doublons
          for (const invoice of toDelete) {
            await deleteDoc(doc(db, 'invoices', invoice.id));
            results.deletedInvoiceDuplicates++;
          }
        }
      }

      // 3. Convertir toutes les factures en paid
      const allInvoicesSnapshot = await getDocs(invoicesQuery);
      for (const docSnap of allInvoicesSnapshot.docs) {
        const data = docSnap.data();
        if (data.status !== 'paid') {
          await updateDoc(docSnap.ref, {
            status: 'paid',
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          results.invoicesUpdatedToPaid++;
        }
      }

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
        where('patientId', '==', consultationData.patientId)
      );
      
      const querySnapshot = await getDocs(q);
      const existingConsultations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));
      
      const consultationDate = new Date(consultationData.date);
      
      // Vérifier les doublons (tolérance 45 minutes)
      for (const existing of existingConsultations) {
        if (this.areConsultationsWithin45Minutes(
          { date: consultationDate },
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
      // Vérifier qu'il n'y a pas déjà une facture pour cette consultation
      const existingInvoicesRef = collection(db, 'invoices');
      const existingInvoicesQuery = query(
        existingInvoicesRef,
        where('consultationId', '==', docRef.id),
        where('osteopathId', '==', userId)
      );
      const existingInvoicesSnapshot = await getDocs(existingInvoicesQuery);
      
      if (existingInvoicesSnapshot.empty) {
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
          
          await addDoc(collection(db, 'invoices'), invoiceData);
        } catch (invoiceError) {
          console.warn('⚠️ Erreur lors de la création automatique de la facture:', invoiceError);
        }
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
  static async updateConsultation(id: string, consultationData: any): Promise<void> {
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
   * Récupère une consultation par son ID
   */
  static async getConsultationById(id: string): Promise<any | null> {
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
      
      return {
        id: docSnap.id,
        ...decryptedData,
        date: data.date?.toDate?.() || new Date(data.date)
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la consultation:', error);
      
      throw error;
    }
  }
}