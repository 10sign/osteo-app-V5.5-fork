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
import { toDateSafe } from '../utils/dataCleaning';
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
          date: toDateSafe(data.date),
          createdAt: toDateSafe(data.createdAt),
          updatedAt: toDateSafe(data.updatedAt)
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

      // ✅ DEBUG: Log du champ notes après déchiffrement
      console.log('🔍 GET CONSULTATION BY ID - notes field:', {
        rawNotes: data.notes,
        decryptedNotes: decryptedData.notes,
        notesType: typeof decryptedData.notes,
        notesLength: decryptedData.notes?.length
      });

      const consultation: Consultation = {
        id: docSnap.id,
        ...decryptedData,
        date: data.date?.toDate?.() || new Date(data.date),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        // Documents are stored in Firestore, not in Storage
        documents: data.documents || []
      } as Consultation;

      console.log('📄 Documents chargés pour la consultation depuis Firestore:', consultation.documents?.length || 0);
      
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
      
      console.log('🔵 ÉTAPE 1: Documents reçus:', consultationData.documents?.length || 0, 'document(s)');

      // Extraire les documents avant le traitement HDS
      const documents = consultationData.documents || [];
      console.log('🔵 ÉTAPE 2: Documents extraits:', documents.length, 'document(s)');
      const { documents: _, ...dataWithoutDocuments } = consultationData;

      // ✅ DEBUG: Log du champ notes avant chiffrement
      console.log('🔍 CREATE CONSULTATION - notes field:', {
        notes: consultationData.notes,
        notesType: typeof consultationData.notes,
        notesLength: consultationData.notes?.length
      });

      // ✅ CORRECTION: Préparation des données avec chiffrement HDS (mapping explicite des champs cliniques)
      const dataToStore = HDSCompliance.prepareDataForStorage({
        // Champs de base
        patientId: consultationData.patientId,
        patientName: consultationData.patientName,
        reason: consultationData.reason,
        treatment: consultationData.treatment,
        notes: consultationData.notes,
        duration: consultationData.duration,
        price: consultationData.price,
        status: consultationData.status,
        examinations: consultationData.examinations,
        prescriptions: consultationData.prescriptions,
        appointmentId: consultationData.appointmentId,

        // Champs d'identité patient (snapshot)
        patientFirstName: consultationData.patientFirstName,
        patientLastName: consultationData.patientLastName,
        patientDateOfBirth: consultationData.patientDateOfBirth,
        patientGender: consultationData.patientGender,
        patientPhone: consultationData.patientPhone,
        patientEmail: consultationData.patientEmail,
        patientProfession: consultationData.patientProfession,
        patientAddress: consultationData.patientAddress,
        patientInsurance: consultationData.patientInsurance,
        patientInsuranceNumber: consultationData.patientInsuranceNumber,

        // ✅ CORRECTION: Champs cliniques (mapping explicite)
        currentTreatment: consultationData.currentTreatment || '',
        consultationReason: consultationData.consultationReason || '',
        medicalAntecedents: consultationData.medicalAntecedents || '',
        medicalHistory: consultationData.medicalHistory || '',
        osteopathicTreatment: consultationData.osteopathicTreatment || '',
        symptoms: consultationData.symptoms || [],
        treatmentHistory: consultationData.treatmentHistory,

        // ✅ FLAG DE CONSULTATION INITIALE
        isInitialConsultation: consultationData.isInitialConsultation || false,

        // Métadonnées
        osteopathId: userId,
        date: Timestamp.fromDate(new Date(consultationData.date)),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      }, 'consultations', userId);

      // Ajouter les documents après le traitement HDS
      dataToStore.documents = documents;
      console.log('🔵 ÉTAPE 3: Documents ajoutés:', dataToStore.documents?.length || 0, 'document(s)');

      // ✅ FIX CRITIQUE: Nettoyer UNIQUEMENT les champs undefined/null
      // IMPORTANT: Ne PAS supprimer les chaînes vides chiffrées (elles contiennent "U2FsdGVkX1...")
      const cleanedData: any = Object.fromEntries(
        Object.entries(dataToStore).filter(([key, value]) => {
          // Exclure UNIQUEMENT undefined et null (garder les chaînes vides chiffrées)
          if (value === undefined) {
            console.log(`🚫 CREATE: BLOCKING undefined field: ${key}`);
            return false;
          }
          if (value === null) {
            console.log(`🚫 CREATE: BLOCKING null field: ${key}`);
            return false;
          }
          // Garder les chaînes (même vides après chiffrement)
          if (typeof value === 'string' && value.length > 0) {
            return true;
          }
          // Garder tous les autres types valides (number, boolean, array, object, Timestamp)
          return value !== undefined && value !== null;
        })
      );

      console.log('✅ CREATE: Champs cliniques après nettoyage:', {
        currentTreatment: cleanedData.currentTreatment ? 'PRÉSENT (chiffré)' : 'ABSENT',
        consultationReason: cleanedData.consultationReason ? 'PRÉSENT (chiffré)' : 'ABSENT',
        medicalAntecedents: cleanedData.medicalAntecedents ? 'PRÉSENT (chiffré)' : 'ABSENT',
        medicalHistory: cleanedData.medicalHistory ? 'PRÉSENT (chiffré)' : 'ABSENT',
        osteopathicTreatment: cleanedData.osteopathicTreatment ? 'PRÉSENT (chiffré)' : 'ABSENT'
      });

      // ✅ VALIDATION FINALE: Double vérification pour garantir qu'aucun champ undefined n'existe
      const hasUndefinedFields = Object.entries(cleanedData).some(([key, value]) => {
        if (value === undefined) {
          console.error(`❌ ERREUR CRITIQUE (CREATE): Le champ ${key} contient undefined après filtrage!`);
          return true;
        }
        return false;
      });

      if (hasUndefinedFields) {
        throw new Error('Impossible de créer la consultation : des champs contiennent des valeurs undefined');
      }

      console.log('🔵 ÉTAPE 4: Documents à sauvegarder dans Firestore:', cleanedData.documents?.length || 0, 'document(s)');

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

      // ✅ DEBUG: Log du champ notes avant mise à jour
      console.log('🔍 UPDATE CONSULTATION - notes field:', {
        notes: consultationData.notes,
        notesType: typeof consultationData.notes,
        notesLength: consultationData.notes?.length,
        notesIsDefined: consultationData.notes !== undefined
      });

      // ✅ CORRECTION: Mapping explicite des champs pour la mise à jour
      const updateData: any = {
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Mapper tous les champs possibles (uniquement ceux qui sont définis)
      if (consultationData.patientId !== undefined) updateData.patientId = consultationData.patientId;
      if (consultationData.patientName !== undefined) updateData.patientName = consultationData.patientName;
      // ✅ FIX: reason et treatment sont optionnels, ne pas les ajouter s'ils sont undefined
      if (consultationData.reason !== undefined) updateData.reason = consultationData.reason;
      if (consultationData.treatment !== undefined) updateData.treatment = consultationData.treatment;
      if (consultationData.notes !== undefined) updateData.notes = consultationData.notes;
      if (consultationData.duration !== undefined) updateData.duration = consultationData.duration;
      if (consultationData.price !== undefined) updateData.price = consultationData.price;
      if (consultationData.status !== undefined) updateData.status = consultationData.status;
      if (consultationData.examinations !== undefined) updateData.examinations = consultationData.examinations;
      if (consultationData.prescriptions !== undefined) updateData.prescriptions = consultationData.prescriptions;
      // ✅ FIX: Ne pas ajouter appointmentId s'il est undefined
      if (consultationData.appointmentId !== undefined && consultationData.appointmentId !== null) {
        updateData.appointmentId = consultationData.appointmentId;
      }
      
      // Champs d'identité patient
      if (consultationData.patientFirstName !== undefined) updateData.patientFirstName = consultationData.patientFirstName;
      if (consultationData.patientLastName !== undefined) updateData.patientLastName = consultationData.patientLastName;
      if (consultationData.patientDateOfBirth !== undefined) updateData.patientDateOfBirth = consultationData.patientDateOfBirth;
      if (consultationData.patientGender !== undefined) updateData.patientGender = consultationData.patientGender;
      if (consultationData.patientPhone !== undefined) updateData.patientPhone = consultationData.patientPhone;
      if (consultationData.patientEmail !== undefined) updateData.patientEmail = consultationData.patientEmail;
      if (consultationData.patientProfession !== undefined) updateData.patientProfession = consultationData.patientProfession;
      if (consultationData.patientAddress !== undefined) updateData.patientAddress = consultationData.patientAddress;
      if (consultationData.patientInsurance !== undefined) updateData.patientInsurance = consultationData.patientInsurance;
      if (consultationData.patientInsuranceNumber !== undefined) updateData.patientInsuranceNumber = consultationData.patientInsuranceNumber;
      
      // ✅ CORRECTION: Champs cliniques (mapping explicite)
      if (consultationData.currentTreatment !== undefined) updateData.currentTreatment = consultationData.currentTreatment;
      if (consultationData.consultationReason !== undefined) updateData.consultationReason = consultationData.consultationReason;
      if (consultationData.medicalAntecedents !== undefined) updateData.medicalAntecedents = consultationData.medicalAntecedents;
      if (consultationData.medicalHistory !== undefined) updateData.medicalHistory = consultationData.medicalHistory;
      if (consultationData.osteopathicTreatment !== undefined) updateData.osteopathicTreatment = consultationData.osteopathicTreatment;
      if (consultationData.symptoms !== undefined) updateData.symptoms = consultationData.symptoms;
      if (consultationData.treatmentHistory !== undefined) updateData.treatmentHistory = consultationData.treatmentHistory;

      // Extraire les documents AVANT le traitement HDS (ils seront ajoutés après)
      const documents = consultationData.documents !== undefined ? consultationData.documents : existingData.documents || [];
      console.log('🔵 UPDATE: Documents extraits:', documents.length, 'document(s)');
      
      // Si la date est modifiée, la convertir en Timestamp
      if (consultationData.date) {
        updateData.date = consultationData.date instanceof Date ? 
          Timestamp.fromDate(consultationData.date) : 
          Timestamp.fromDate(new Date(consultationData.date));
      }
      
      console.log('💾 Prepared update data:', updateData);
      console.log('🔍 Champs cliniques dans updateData AVANT nettoyage:', {
        currentTreatment: updateData.currentTreatment,
        consultationReason: updateData.consultationReason,
        medicalAntecedents: updateData.medicalAntecedents,
        medicalHistory: updateData.medicalHistory,
        osteopathicTreatment: updateData.osteopathicTreatment
      });

      // ✅ CORRECTION: Nettoyer UNIQUEMENT undefined (garder les chaînes vides chiffrées)
      const cleanedUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([key, value]) => {
          if (value === undefined) {
            console.log(`🚫 UPDATE: BLOCKING undefined field: ${key}`);
            return false;
          }
          // Garder null, chaînes vides, et tous les autres types valides
          return true;
        })
      );

      console.log('🧹 Cleaned update data:', cleanedUpdateData);
      console.log('🔍 Champs cliniques dans cleanedUpdateData APRÈS nettoyage:', {
        currentTreatment: cleanedUpdateData.currentTreatment,
        consultationReason: cleanedUpdateData.consultationReason,
        medicalAntecedents: cleanedUpdateData.medicalAntecedents,
        medicalHistory: cleanedUpdateData.medicalHistory,
        osteopathicTreatment: cleanedUpdateData.osteopathicTreatment
      });
      
      // ✅ CORRECTION: Préparation des données avec chiffrement HDS (mapping explicite)
      const baseDataForStorage: any = {
        // Champs de base (ne prendre que les champs définis)
        patientId: cleanedUpdateData.patientId || existingData.patientId,
        patientName: cleanedUpdateData.patientName || existingData.patientName,
        notes: cleanedUpdateData.notes !== undefined ? cleanedUpdateData.notes : existingData.notes,
        duration: cleanedUpdateData.duration !== undefined ? cleanedUpdateData.duration : existingData.duration,
        price: cleanedUpdateData.price !== undefined ? cleanedUpdateData.price : existingData.price,
        status: cleanedUpdateData.status || existingData.status,
        examinations: cleanedUpdateData.examinations || existingData.examinations,
        prescriptions: cleanedUpdateData.prescriptions || existingData.prescriptions,
        
        // Champs d'identité patient (snapshot)
        patientFirstName: cleanedUpdateData.patientFirstName || existingData.patientFirstName,
        patientLastName: cleanedUpdateData.patientLastName || existingData.patientLastName,
        patientDateOfBirth: cleanedUpdateData.patientDateOfBirth || existingData.patientDateOfBirth,
        patientGender: cleanedUpdateData.patientGender || existingData.patientGender,
        patientPhone: cleanedUpdateData.patientPhone || existingData.patientPhone,
        patientEmail: cleanedUpdateData.patientEmail || existingData.patientEmail,
        patientProfession: cleanedUpdateData.patientProfession || existingData.patientProfession,
        patientAddress: cleanedUpdateData.patientAddress || existingData.patientAddress,
        patientInsurance: cleanedUpdateData.patientInsurance || existingData.patientInsurance,
        patientInsuranceNumber: cleanedUpdateData.patientInsuranceNumber || existingData.patientInsuranceNumber,
        
        // ✅ CORRECTION: Champs cliniques (mapping explicite avec vérification stricte)
        // Utiliser !== undefined pour permettre les valeurs vides (chaînes vides) lors de la modification
        currentTreatment: cleanedUpdateData.currentTreatment !== undefined ? cleanedUpdateData.currentTreatment : (existingData.currentTreatment || ''),
        consultationReason: cleanedUpdateData.consultationReason !== undefined ? cleanedUpdateData.consultationReason : (existingData.consultationReason || ''),
        medicalAntecedents: cleanedUpdateData.medicalAntecedents !== undefined ? cleanedUpdateData.medicalAntecedents : (existingData.medicalAntecedents || ''),
        medicalHistory: cleanedUpdateData.medicalHistory !== undefined ? cleanedUpdateData.medicalHistory : (existingData.medicalHistory || ''),
        osteopathicTreatment: cleanedUpdateData.osteopathicTreatment !== undefined ? cleanedUpdateData.osteopathicTreatment : (existingData.osteopathicTreatment || ''),
        symptoms: cleanedUpdateData.symptoms !== undefined ? cleanedUpdateData.symptoms : (existingData.symptoms || []),
        treatmentHistory: cleanedUpdateData.treatmentHistory !== undefined ? cleanedUpdateData.treatmentHistory : (existingData.treatmentHistory || []),

        // ✅ FLAG DE CONSULTATION INITIALE - Préserver le flag existant, ne jamais le modifier
        isInitialConsultation: existingData.isInitialConsultation || false,

        // Métadonnées
        osteopathId: userId,
        date: cleanedUpdateData.date || existingData.date,
        createdAt: existingData.createdAt,
        updatedAt: cleanedUpdateData.updatedAt
      };

      // ✅ FIX CRITIQUE: Ajouter les champs optionnels seulement s'ils ont une valeur valide (non undefined/null)
      // Utiliser une vérification stricte pour éviter d'ajouter des valeurs undefined à Firestore
      const appointmentIdValue = cleanedUpdateData.appointmentId !== undefined ? cleanedUpdateData.appointmentId : existingData.appointmentId;
      if (appointmentIdValue !== undefined && appointmentIdValue !== null) {
        baseDataForStorage.appointmentId = appointmentIdValue;
      }

      const reasonValue = cleanedUpdateData.reason !== undefined ? cleanedUpdateData.reason : existingData.reason;
      if (reasonValue !== undefined && reasonValue !== null) {
        baseDataForStorage.reason = reasonValue;
      }

      const treatmentValue = cleanedUpdateData.treatment !== undefined ? cleanedUpdateData.treatment : existingData.treatment;
      if (treatmentValue !== undefined && treatmentValue !== null) {
        baseDataForStorage.treatment = treatmentValue;
      }

      const dataToStore = HDSCompliance.prepareDataForStorage(baseDataForStorage, 'consultations', userId);
      console.log('🔐 Data prepared for storage (before filtering):', dataToStore);
      console.log('🔍 Champs cliniques APRÈS chiffrement HDS:', {
        currentTreatment: dataToStore.currentTreatment,
        consultationReason: dataToStore.consultationReason,
        medicalAntecedents: dataToStore.medicalAntecedents,
        medicalHistory: dataToStore.medicalHistory,
        osteopathicTreatment: dataToStore.osteopathicTreatment
      });

      // Ajouter les documents APRÈS le traitement HDS
      dataToStore.documents = documents;
      console.log('🔵 UPDATE: Documents ajoutés après HDS:', dataToStore.documents?.length || 0, 'document(s)');

      // ✅ FIX CRITIQUE: Filtrer TOUS les champs undefined/null après le chiffrement HDS
      // Ceci est ESSENTIEL car Firestore rejette les documents contenant des valeurs undefined
      const finalDataToStore = Object.fromEntries(
        Object.entries(dataToStore).filter(([key, value]) => {
          // Exclure complètement les valeurs undefined et null
          if (value === undefined) {
            console.log(`🚫 BLOCKING undefined field: ${key}`);
            return false;
          }
          if (value === null) {
            console.log(`🚫 BLOCKING null field: ${key}`);
            return false;
          }
          return true;
        })
      );

      // ✅ VALIDATION FINALE: Double vérification pour garantir qu'aucun champ undefined n'existe
      const hasUndefinedFields = Object.entries(finalDataToStore).some(([key, value]) => {
        if (value === undefined) {
          console.error(`❌ ERREUR CRITIQUE: Le champ ${key} contient undefined après filtrage!`);
          return true;
        }
        return false;
      });

      if (hasUndefinedFields) {
        throw new Error('Impossible de mettre à jour la consultation : des champs contiennent des valeurs undefined');
      }
      console.log('🔐 Final data for storage (after filtering undefined/null):', finalDataToStore);
      console.log('🔍 Champs cliniques dans FINAL data:', {
        currentTreatment: finalDataToStore.currentTreatment,
        consultationReason: finalDataToStore.consultationReason,
        medicalAntecedents: finalDataToStore.medicalAntecedents,
        medicalHistory: finalDataToStore.medicalHistory,
        osteopathicTreatment: finalDataToStore.osteopathicTreatment
      });

      await updateDoc(docRef, finalDataToStore);
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

      // ✅ SYNCHRONISATION : Mettre à jour le champ nextAppointment du patient
      // Après suppression d'une consultation, recalculer le prochain rendez-vous
      try {
        const { AppointmentService } = await import('./appointmentService');
        await AppointmentService.syncPatientNextAppointment(patientId);
        console.log('✅ Champ nextAppointment du patient mis à jour après suppression de la consultation');
      } catch (syncError) {
        console.warn('⚠️ Erreur lors de la synchronisation du nextAppointment:', syncError);
        // Ne pas faire échouer la suppression si la synchronisation échoue
      }

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
        const consultationDate = toDateSafe(data.date);
        
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
        SensitivityLevel.INTERNAL,
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
        SensitivityLevel.INTERNAL,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
}