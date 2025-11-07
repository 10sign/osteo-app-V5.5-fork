import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Patient } from '../types';
import { HDSCompliance } from '../utils/hdsCompliance';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';
import { ConsultationService } from './consultationService';
import { getEffectiveOsteopathId } from '../utils/substituteAuth';
import { InitialConsultationSyncService } from './initialConsultationSyncService';

/**
 * Service pour la gestion des patients conforme HDS
 */
export class PatientService {
  private static readonly COLLECTION_NAME = 'patients';
  
  /**
   * Récupère un patient par son ID avec déchiffrement
   */
  static async getPatientById(patientId: string): Promise<Patient> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Journalisation de l'accès
      await AuditLogger.logPatientAccess(
        patientId,
        'read',
        'success'
      );
      
      // Récupération avec déchiffrement HDS
      const patientData = await HDSCompliance.getCompliantData(
        this.COLLECTION_NAME,
        patientId
      );
      
      return patientData as Patient;
      
    } catch (error) {
      console.error('❌ Failed to get patient:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.logPatientAccess(
        patientId,
        'read',
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Récupère tous les patients d'un ostéopathe
   */
  static async getPatientsByOsteopath(): Promise<Patient[]> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Obtenir l'ID de l'ostéopathe effectif (titulaire ou remplaçant)
      const effectiveOsteopathId = await getEffectiveOsteopathId(auth.currentUser);
      
      if (!effectiveOsteopathId) {
        throw new Error('Utilisateur non autorisé à accéder aux données patients');
      }
      
      const patientsRef = collection(db, this.COLLECTION_NAME);
      const q = query(patientsRef, where('osteopathId', '==', effectiveOsteopathId));
      const snapshot = await getDocs(q);
      
      // Journalisation de l'accès
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        this.COLLECTION_NAME,
        'list',
        SensitivityLevel.SENSITIVE,
        'success',
        { count: snapshot.size, effectiveOsteopathId }
      );
      
      // Traitement des données avec déchiffrement
      const patients: Patient[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const decryptedData = HDSCompliance.decryptDataForDisplay(
          data,
          this.COLLECTION_NAME,
          effectiveOsteopathId
        );
        
        patients.push({
          ...decryptedData,
          id: docSnap.id
        } as Patient);
      }
      
      return patients;
      
    } catch (error) {
      console.error('❌ Failed to get patients:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        this.COLLECTION_NAME,
        'list',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Crée un nouveau patient avec chiffrement
   */
  static async createPatient(patientData: Omit<Patient, 'id'>): Promise<string> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Génération d'un ID unique
      const patientId = crypto.randomUUID();
      
      // Préparation des données avec métadonnées
      const dataWithMetadata = {
        ...patientData,
        osteopathId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: auth.currentUser.uid
      };
      
      // Sauvegarde avec chiffrement HDS
      await HDSCompliance.saveCompliantData(
        this.COLLECTION_NAME,
        patientId,
        dataWithMetadata
      );
      
      // Journalisation de la création
      await AuditLogger.logPatientModification(
        patientId,
        'create',
        'success'
      );
      
      return patientId;
      
    } catch (error) {
      console.error('❌ Failed to create patient:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        this.COLLECTION_NAME,
        'create',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Met à jour un patient avec chiffrement
   *
   * @param patientId - ID du patient à mettre à jour
   * @param updates - Données à mettre à jour
   * @param skipConsultationSync - Si true, désactive la synchronisation automatique de la consultation initiale
   */
  static async updatePatient(
    patientId: string,
    updates: Partial<Patient>,
    skipConsultationSync: boolean = false
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      // Vérification de la propriété
      const patientRef = doc(db, this.COLLECTION_NAME, patientId);
      const patientSnap = await getDoc(patientRef);

      if (!patientSnap.exists()) {
        throw new Error('Patient non trouvé');
      }

      const patientData = patientSnap.data();

      if (patientData.osteopathId !== auth.currentUser.uid && !this.isAdmin()) {
        throw new Error('Vous n\'avez pas les droits pour modifier ce patient');
      }

      // Préparation des mises à jour
      const updatesWithMetadata = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Mise à jour avec chiffrement HDS
      await HDSCompliance.updateCompliantData(
        this.COLLECTION_NAME,
        patientId,
        updatesWithMetadata
      );

      // Journalisation de la modification
      await AuditLogger.logPatientModification(
        patientId,
        'update',
        'success',
        { fields: Object.keys(updates) }
      );

      // ✅ SYNCHRONISATION AUTOMATIQUE DE LA CONSULTATION INITIALE
      // Après la mise à jour du patient, synchroniser automatiquement sa consultation initiale
      // avec les nouvelles données du dossier patient
      if (!skipConsultationSync) {
        try {
          console.log(`🔄 Déclenchement de la synchronisation automatique pour le patient ${patientId}`);

          // Récupérer les données complètes du patient (mises à jour + existantes)
          const updatedPatientSnap = await getDoc(patientRef);
          const updatedPatientData = updatedPatientSnap.data();

          // Déchiffrer les données pour la synchronisation
          const decryptedPatientData = HDSCompliance.decryptDataForDisplay(
            updatedPatientData,
            this.COLLECTION_NAME,
            auth.currentUser.uid
          );

          // Synchroniser la consultation initiale
          const syncResult = await InitialConsultationSyncService.syncInitialConsultationForPatient(
            patientId,
            { ...decryptedPatientData, id: patientId },
            auth.currentUser.uid
          );

          if (syncResult.success && syncResult.fieldsUpdated.length > 0) {
            console.log(`✅ Consultation initiale synchronisée: ${syncResult.fieldsUpdated.length} champs mis à jour`);
          } else if (syncResult.error) {
            console.warn(`⚠️ Erreur lors de la synchronisation automatique (non bloquant): ${syncResult.error}`);
          }

        } catch (syncError) {
          // La synchronisation ne doit pas bloquer la mise à jour du patient
          console.warn('⚠️ Erreur lors de la synchronisation automatique de la consultation initiale (non bloquant):', syncError);

          // Journaliser l'erreur mais ne pas la propager
          await AuditLogger.log(
            AuditEventType.DATA_MODIFICATION,
            `patients/${patientId}/consultation_sync`,
            'auto_sync',
            SensitivityLevel.INTERNAL,
            'failure',
            { error: (syncError as Error).message }
          );
        }
      }

    } catch (error) {
      console.error('❌ Failed to update patient:', error);

      // Journalisation de l'erreur
      await AuditLogger.logPatientModification(
        patientId,
        'update',
        'failure',
        { error: (error as Error).message }
      );

      throw error;
    }
  }
  
  /**
   * Supprime un patient et toutes ses données associées
   */
  static async deletePatient(patientId: string): Promise<{
    patient: boolean;
    appointments: number;
    consultations: number;
    invoices: number;
    documents: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Vérification de la propriété
      const patientRef = doc(db, this.COLLECTION_NAME, patientId);
      const patientSnap = await getDoc(patientRef);
      
      if (!patientSnap.exists()) {
        // Patient déjà supprimé ou inexistant - opération idempotente
        await AuditLogger.logPatientModification(
          patientId,
          'delete_cascade',
          'success',
          { reason: 'Patient already deleted or not found' }
        );
        
        return {
          patient: false,
          appointments: 0,
          consultations: 0,
          invoices: 0,
          documents: 0
        };
      }
      
      const patientData = patientSnap.data();
      
      if (patientData.osteopathId !== auth.currentUser.uid && !this.isAdmin()) {
        throw new Error('Vous n\'avez pas les droits pour supprimer ce patient');
      }
      
      // Journalisation du début de la suppression
      await AuditLogger.logPatientModification(
        patientId,
        'delete_cascade',
        'success',
        { phase: 'started', patientName: `${patientData.firstName} ${patientData.lastName}` }
      );
      
      // 1. Suppression des rendez-vous
      const appointmentsDeleted = await this.deletePatientAppointments(patientId);
      
      // 2. Suppression des consultations
      const consultationsDeleted = await this.deletePatientConsultations(patientId);
      
      // 3. Suppression des factures
      const invoicesDeleted = await this.deletePatientInvoices(patientId);
      
      // 4. Suppression des documents
      const documentsDeleted = await this.deletePatientDocuments(patientId);
      
      // 5. Suppression du patient
      await deleteDoc(patientRef);
      
      // Journalisation de la suppression complète
      await AuditLogger.logPatientModification(
        patientId,
        'delete_cascade',
        'success',
        { 
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          appointmentsDeleted,
          consultationsDeleted,
          invoicesDeleted,
          documentsDeleted
        }
      );
      
      return {
        patient: true,
        appointments: appointmentsDeleted,
        consultations: consultationsDeleted,
        invoices: invoicesDeleted,
        documents: documentsDeleted
      };
      
    } catch (error) {
      console.error('❌ Failed to delete patient:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.logPatientModification(
        patientId,
        'delete_cascade',
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Supprime tous les rendez-vous d'un patient
   */
  private static async deletePatientAppointments(patientId: string): Promise<number> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupération des rendez-vous du patient
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('patientId', '==', patientId),
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      let count = 0;
      
      // Suppression de chaque rendez-vous
      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
        count++;
        
        // Journalisation de chaque suppression
        await AuditLogger.log(
          AuditEventType.DATA_DELETION,
          `appointments/${docSnap.id}`,
          'delete_cascade',
          SensitivityLevel.SENSITIVE,
          'success',
          { patientId }
        );
      }
      
      return count;
    } catch (error) {
      console.error('❌ Failed to delete patient appointments:', error);
      throw error;
    }
  }
  
  /**
   * Supprime toutes les consultations d'un patient
   */
  private static async deletePatientConsultations(patientId: string): Promise<number> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupération des consultations du patient
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('patientId', '==', patientId),
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      let count = 0;
      
      // Suppression de chaque consultation
      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
        count++;
        
        // Journalisation de chaque suppression
        await AuditLogger.log(
          AuditEventType.DATA_DELETION,
          `consultations/${docSnap.id}`,
          'delete_cascade',
          SensitivityLevel.HIGHLY_SENSITIVE,
          'success',
          { patientId }
        );
      }
      
      return count;
    } catch (error) {
      console.error('❌ Failed to delete patient consultations:', error);
      throw error;
    }
  }
  
  /**
   * Supprime toutes les factures d'un patient
   */
  private static async deletePatientInvoices(patientId: string): Promise<number> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupération des factures du patient
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('patientId', '==', patientId),
        where('osteopathId', '==', auth.currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      let count = 0;
      
      // Suppression de chaque facture
      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
        count++;
        
        // Journalisation de chaque suppression
        await AuditLogger.log(
          AuditEventType.DATA_DELETION,
          `invoices/${docSnap.id}`,
          'delete_cascade',
          SensitivityLevel.SENSITIVE,
          'success',
          { patientId }
        );
      }
      
      return count;
    } catch (error) {
      console.error('❌ Failed to delete patient invoices:', error);
      throw error;
    }
  }
  
  /**
   * Supprime tous les documents d'un patient
   */
  private static async deletePatientDocuments(patientId: string): Promise<number> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Note: La suppression des documents dans Firebase Storage
      // nécessiterait une logique supplémentaire avec la Storage API
      // Pour cette implémentation, nous supposons que les métadonnées
      // des documents sont stockées dans Firestore
      
      const documentsRef = collection(db, 'patients', patientId, 'documents');
      const snapshot = await getDocs(documentsRef);
      let count = 0;
      
      // Suppression de chaque document
      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
        count++;
        
        // Journalisation de chaque suppression
        await AuditLogger.log(
          AuditEventType.DATA_DELETION,
          `patients/${patientId}/documents/${docSnap.id}`,
          'delete_cascade',
          SensitivityLevel.SENSITIVE,
          'success'
        );
      }
      
      return count;
    } catch (error) {
      console.error('❌ Failed to delete patient documents:', error);
      return 0; // Retourner 0 en cas d'erreur pour ne pas bloquer le processus
    }
  }
  
  /**
   * Exporte les données d'un patient (avec journalisation)
   */
  static async exportPatientData(patientId: string, format: 'json' | 'pdf' | 'csv'): Promise<any> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupération des données du patient
      const patient = await this.getPatientById(patientId);
      
      // S'assurer que les champs firstName et lastName sont explicitement inclus
      const patientData = {
        ...patient,
        firstName: patient.firstName || '',
        lastName: patient.lastName || ''
      };
      
      // Journalisation de l'export
      await AuditLogger.logExport(
        `patients/${patientId}`,
        format,
        'success'
      );
      
      // Formatage selon le type demandé
      switch (format) {
        case 'json':
          return patientData;
        case 'pdf':
          // Logique de génération PDF
          // Préparation des données pour le PDF
          const pdfData = {
            ...patientData,
            patientName: `${patientData.firstName} ${patientData.lastName}`,
            patientDateOfBirth: patientData.dateOfBirth
          };
          
          // Appel au service de génération PDF
          return pdfData;
        case 'csv':
          // Logique de génération CSV
          // Préparation des données pour le CSV
          const csvData = {
            ...patientData,
            fullName: `${patientData.firstName} ${patientData.lastName}`
          };
          
          return csvData;
      }
      
    } catch (error) {
      console.error('❌ Failed to export patient data:', error);
      
      // Journalisation de l'erreur
      await AuditLogger.logExport(
        `patients/${patientId}`,
        format,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Vérifie si l'utilisateur est admin
   */
  static isAdmin(): boolean {
    return auth.currentUser?.email === 'grondin.stephane@gmail.com';
  }
}

export default PatientService;