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
import HDSCompliance from '../utils/hdsCompliance';
import { listDocuments } from '../utils/documentStorage';

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
        
        const consultation: Consultation = {
          id: docSnapshot.id,
          ...decryptedData,
          date: data.date?.toDate?.() || new Date(data.date),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        } as Consultation;
        
        // Charger les documents depuis Firebase Storage
        try {
          const documentsFolder = `users/${auth.currentUser.uid}/consultations/${docSnapshot.id}/documents`;
          const documents = await listDocuments(documentsFolder);
          consultation.documents = documents;
          console.log('📄 Documents chargés pour la consultation:', docSnapshot.id, documents.length);
        } catch (docError) {
          console.warn('⚠️ Erreur lors du chargement des documents pour la consultation:', docSnapshot.id, docError);
          consultation.documents = [];
        }
        
        consultations.push(consultation);
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
      
      // Charger les documents depuis Firebase Storage
      try {
        const documentsFolder = `users/${auth.currentUser.uid}/consultations/${id}/documents`;
        const documents = await listDocuments(documentsFolder);
        consultation.documents = documents;
        console.log('📄 Documents chargés pour la consultation:', documents.length);
      } catch (docError) {
        console.warn('⚠️ Erreur lors du chargement des documents:', docError);
        consultation.documents = [];
      }
      
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

      const userId = auth.currentUser.uid;
      const now = new Date();
      
      console.log('🔍 Consultation data before HDS processing:', {
        hasDocuments: !!consultationData.documents,
        documentsCount: consultationData.documents?.length || 0,
        documents: consultationData.documents
      });

      // Extraire les documents avant le traitement HDS
      const documents = consultationData.documents || [];
      const { documents: _, ...dataWithoutDocuments } = consultationData;

      // Préparation des données avec chiffrement HDS (sans les documents)
      const dataToStore = HDSCompliance.prepareDataForStorage({
        ...dataWithoutDocuments,
        osteopathId: userId,
        date: Timestamp.fromDate(new Date(consultationData.date)),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      }, 'consultations', userId);

      // Ajouter les documents après le traitement HDS
      dataToStore.documents = documents;

      // 🔧 NOUVEAU : Nettoyer les champs undefined pour éviter l'erreur addDoc
      const cleanedData = Object.fromEntries(
        Object.entries(dataToStore).filter(([_, value]) => value !== undefined)
      );

      console.log('🔍 Consultation data after HDS processing:', {
        hasDocuments: !!cleanedData.documents,
        documentsCount: cleanedData.documents?.length || 0,
        documents: cleanedData.documents
      });
      
      const docRef = await addDoc(collection(db, 'consultations'), cleanedData);
      const consultationId = docRef.id;
      
      // Créer automatiquement une facture pour cette consultation
      try {
        const { InvoiceService } = await import('./invoiceService');
        
        // Générer un numéro de facture unique
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
        const invoiceNumber = `F-${year}${month}${day}-${time}-${consultationId.slice(-4)}`;
        
        const invoiceData = {
          number: invoiceNumber,
          patientId: consultationData.patientId,
          patientName: consultationData.patientName,
          osteopathId: userId,
          consultationId: consultationId,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
          items: [{
            id: crypto.randomUUID(),
            description: consultationData.consultationReason || 'Consultation ostéopathique',
            quantity: 1,
            unitPrice: consultationData.price || 60,
            amount: consultationData.price || 60
          }],
          subtotal: consultationData.price || 60,
          tax: 0,
          total: consultationData.price || 60,
          status: 'draft', // Statut brouillon par défaut
          notes: `Facture générée automatiquement pour la consultation du ${new Date(consultationData.date).toLocaleDateString('fr-FR')}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await InvoiceService.createInvoice(invoiceData);
        console.log('✅ Facture créée automatiquement pour la consultation:', consultationId, 'Numéro:', invoiceNumber);
      } catch (invoiceError) {
        console.warn('⚠️ Erreur lors de la création de la facture automatique:', invoiceError);
        // Ne pas faire échouer la création de la consultation si la facture échoue
      }
      
      // ✅ SUPPRIMÉ : Synchronisation automatique qui modifie les données du patient
      // Les données de consultation doivent rester isolées et ne pas modifier le dossier patient
      // La consultation est un snapshot indépendant au moment T
      
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
      
      // ✅ SUPPRIMÉ : Synchronisation automatique qui modifie les données du patient
      // Les modifications de consultation ne doivent pas affecter le dossier patient
      // Chaque consultation reste un snapshot indépendant
      
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
   * Supprime une consultation et sa facture liée automatiquement
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
      
      // 🔄 NOUVEAU : Supprimer la facture liée automatiquement
      try {
        const { InvoiceService } = await import('./invoiceService');
        
        // Rechercher les factures liées à cette consultation
        const invoicesRef = collection(db, 'invoices');
        const invoiceQuery = query(
          invoicesRef,
          where('consultationId', '==', id),
          where('osteopathId', '==', auth.currentUser.uid)
        );
        
        const invoiceSnapshot = await getDocs(invoiceQuery);
        
        // Supprimer toutes les factures liées à cette consultation
        for (const invoiceDoc of invoiceSnapshot.docs) {
          await InvoiceService.deleteInvoice(invoiceDoc.id);
          console.log('🗑️ Facture liée supprimée automatiquement:', invoiceDoc.id);
          
          // Journalisation de la suppression de facture
          await AuditLogger.log(
            AuditEventType.DATA_DELETION,
            `invoices/${invoiceDoc.id}`,
            'delete_cascade_from_consultation',
            SensitivityLevel.SENSITIVE,
            'success',
            { consultationId: id, patientId }
          );
        }
        
        if (invoiceSnapshot.docs.length > 0) {
          console.log(`✅ ${invoiceSnapshot.docs.length} facture(s) liée(s) supprimée(s) automatiquement`);
        }
      } catch (invoiceError) {
        console.warn('⚠️ Erreur lors de la suppression de la facture liée:', invoiceError);
        // Ne pas faire échouer la suppression de consultation si la facture échoue
        // La consultation doit être supprimée même si la facture pose problème
      }
      
      // Supprimer la consultation
      await deleteDoc(docRef);
      
      // ✅ SUPPRIMÉ : Synchronisation automatique qui modifie les données du patient
      // La suppression de consultation ne doit pas affecter le dossier patient
      
      // Journalisation de la suppression de consultation
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

  // ✅ SUPPRIMÉ : addConsultationToPatientHistoryMethod
  // Cette fonction modifiait automatiquement le dossier patient
  // Les consultations doivent rester des snapshots indépendants
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