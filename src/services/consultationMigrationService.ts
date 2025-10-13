import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Patient } from '../types';

/**
 * Service de migration des consultations existantes
 * Remplit les champs cliniques manquants ou erronés (UUIDs) avec les vraies données du patient
 */
export class ConsultationMigrationService {

  /**
   * Migre toutes les consultations d'un praticien
   * Remplace les données manquantes ou les UUIDs par les vraies valeurs du patient
   */
  static async migrateAllConsultations(): Promise<{
    total: number;
    migrated: number;
    errors: string[];
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const results = {
      total: 0,
      migrated: 0,
      errors: [] as string[]
    };

    try {
      console.log('🔄 Début de la migration des consultations...');

      // Récupérer toutes les consultations du praticien
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      results.total = querySnapshot.size;

      console.log(`📊 ${results.total} consultations trouvées`);

      // Migrer chaque consultation
      for (const consultationDoc of querySnapshot.docs) {
        try {
          const consultationData = consultationDoc.data();
          const consultationId = consultationDoc.id;

          // ✅ NOUVELLE LOGIQUE : Vérifier si les champs contiennent des UUIDs ou sont manquants
          const isUUID = (value: any) => {
            if (!value || typeof value !== 'string') return false;
            // Pattern UUID : 8-4-4-4-12 caractères hexadécimaux
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
          };

          const hasInvalidData = (field: any) => {
            if (!field || field === '' || field === 'undefined' || field === 'null') return true;
            if (typeof field === 'string') {
              // Détecter les UUIDs simples
              if (isUUID(field)) return true;
              // Détecter les UUIDs chiffrés (format: uuid:encryptedData)
              const uuidChiffrePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i;
              if (uuidChiffrePattern.test(field)) return true;
            }
            return false;
          };

          const needsMigration = 
            !consultationData.hasOwnProperty('currentTreatment') ||
            !consultationData.hasOwnProperty('consultationReason') ||
            !consultationData.hasOwnProperty('medicalAntecedents') ||
            !consultationData.hasOwnProperty('medicalHistory') ||
            !consultationData.hasOwnProperty('osteopathicTreatment') ||
            !consultationData.hasOwnProperty('symptoms') ||
            hasInvalidData(consultationData.currentTreatment) ||
            hasInvalidData(consultationData.consultationReason) ||
            hasInvalidData(consultationData.medicalAntecedents) ||
            hasInvalidData(consultationData.medicalHistory) ||
            hasInvalidData(consultationData.osteopathicTreatment);

          if (!needsMigration) {
            console.log(`✅ Consultation ${consultationId} déjà migrée et valide`);
            continue;
          }

          // Récupérer les données du patient pour pré-remplir
          let patientData: Patient | null = null;
          if (consultationData.patientId) {
            try {
              const patientRef = doc(db, 'patients', consultationData.patientId);
              const patientDoc = await getDoc(patientRef);
              if (patientDoc.exists()) {
                patientData = { ...patientDoc.data(), id: patientDoc.id } as Patient;
              }
            } catch (patientError) {
              console.warn(`⚠️ Impossible de charger le patient pour la consultation ${consultationId}`);
            }
          }

          // ✅ NOUVELLE LOGIQUE : Préparer les données de migration en remplaçant les UUIDs et valeurs invalides
          const migrationData: any = {};

          // Fonction helper pour déterminer si on doit remplacer une valeur
          const shouldReplace = (currentValue: any, patientValue: any) => {
            if (hasInvalidData(currentValue) && patientValue) {
              console.log(`🔄 Remplacement de ${currentValue} par ${patientValue}`);
              return patientValue;
            }
            return currentValue || '';
          };

          // Champs cliniques - remplacer seulement si invalides/UUIDs
          migrationData.currentTreatment = shouldReplace(consultationData.currentTreatment, patientData?.currentTreatment);
          migrationData.consultationReason = shouldReplace(consultationData.consultationReason, patientData?.consultationReason);
          migrationData.medicalAntecedents = shouldReplace(consultationData.medicalAntecedents, patientData?.medicalAntecedents);
          migrationData.medicalHistory = shouldReplace(consultationData.medicalHistory, patientData?.medicalHistory);
          migrationData.osteopathicTreatment = shouldReplace(consultationData.osteopathicTreatment, patientData?.osteopathicTreatment);
          
          // Symptoms - traitement spécial pour les tableaux
          if (!consultationData.symptoms || consultationData.symptoms.length === 0) {
            migrationData.symptoms = patientData?.tags || [];
          } else {
            migrationData.symptoms = consultationData.symptoms;
          }

          // Champs d'identité patient (snapshot) - remplir seulement si absents
          migrationData.patientFirstName = consultationData.patientFirstName || patientData?.firstName || '';
          migrationData.patientLastName = consultationData.patientLastName || patientData?.lastName || '';
          migrationData.patientDateOfBirth = consultationData.patientDateOfBirth || patientData?.dateOfBirth || '';
          migrationData.patientGender = consultationData.patientGender || patientData?.gender || '';
          migrationData.patientPhone = consultationData.patientPhone || patientData?.phone || '';
          migrationData.patientEmail = consultationData.patientEmail || patientData?.email || '';
          migrationData.patientProfession = consultationData.patientProfession || patientData?.profession || '';
          migrationData.patientAddress = consultationData.patientAddress || patientData?.address?.street || '';
          migrationData.patientInsurance = consultationData.patientInsurance || patientData?.insurance?.provider || '';
          migrationData.patientInsuranceNumber = consultationData.patientInsuranceNumber || patientData?.insurance?.policyNumber || '';
          
          // ✅ CORRECTION : Mettre à jour aussi reason et treatment si ce sont des UUIDs
          if (hasInvalidData(consultationData.reason)) {
            migrationData.reason = patientData?.consultationReason || 'Consultation ostéopathique';
          }
          if (hasInvalidData(consultationData.treatment)) {
            migrationData.treatment = patientData?.osteopathicTreatment || 'Traitement ostéopathique';
          }

          // Mettre à jour la consultation
          await updateDoc(doc(db, 'consultations', consultationId), migrationData);

          results.migrated++;
          console.log(`✅ Consultation ${consultationId} migrée avec succès (${results.migrated}/${results.total})`);

        } catch (error) {
          const errorMessage = `Erreur lors de la migration de la consultation ${consultationDoc.id}: ${(error as Error).message}`;
          console.error('❌', errorMessage);
          results.errors.push(errorMessage);
        }
      }

      console.log(`✅ Migration terminée: ${results.migrated}/${results.total} consultations migrées`);

      if (results.errors.length > 0) {
        console.warn(`⚠️ ${results.errors.length} erreurs rencontrées:`, results.errors);
      }

      return results;

    } catch (error) {
      console.error('❌ Erreur lors de la migration des consultations:', error);
      throw error;
    }
  }

  /**
   * Migre une consultation spécifique
   */
  static async migrateConsultation(consultationId: string): Promise<boolean> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const consultationRef = doc(db, 'consultations', consultationId);
      const consultationDoc = await getDoc(consultationRef);

      if (!consultationDoc.exists()) {
        throw new Error('Consultation non trouvée');
      }

      const consultationData = consultationDoc.data();

      // Vérifier la propriété
      if (consultationData.osteopathId !== auth.currentUser.uid) {
        throw new Error('Accès non autorisé à cette consultation');
      }

      // Récupérer les données du patient
      let patientData: Patient | null = null;
      if (consultationData.patientId) {
        const patientRef = doc(db, 'patients', consultationData.patientId);
        const patientDoc = await getDoc(patientRef);
        if (patientDoc.exists()) {
          patientData = { ...patientDoc.data(), id: patientDoc.id } as Patient;
        }
      }

      // ✅ NOUVELLE LOGIQUE : Vérifier si les champs contiennent des UUIDs ou sont manquants
      const isUUID = (value: any) => {
        if (!value || typeof value !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      };

      const hasInvalidData = (field: any) => {
        return !field || field === '' || isUUID(field) || field === 'undefined' || field === 'null';
      };

      const shouldReplace = (currentValue: any, patientValue: any) => {
        if (hasInvalidData(currentValue) && patientValue) {
          return patientValue;
        }
        return currentValue || '';
      };

      // Préparer les données de migration
      const migrationData: any = {};

      // Champs cliniques - remplacer seulement si invalides/UUIDs
      migrationData.currentTreatment = shouldReplace(consultationData.currentTreatment, patientData?.currentTreatment);
      migrationData.consultationReason = shouldReplace(consultationData.consultationReason, patientData?.consultationReason);
      migrationData.medicalAntecedents = shouldReplace(consultationData.medicalAntecedents, patientData?.medicalAntecedents);
      migrationData.medicalHistory = shouldReplace(consultationData.medicalHistory, patientData?.medicalHistory);
      migrationData.osteopathicTreatment = shouldReplace(consultationData.osteopathicTreatment, patientData?.osteopathicTreatment);
      
      // Symptoms - traitement spécial pour les tableaux
      if (!consultationData.symptoms || consultationData.symptoms.length === 0) {
        migrationData.symptoms = patientData?.tags || [];
      } else {
        migrationData.symptoms = consultationData.symptoms;
      }

      // Champs d'identité patient (snapshot) - remplir seulement si absents
      migrationData.patientFirstName = consultationData.patientFirstName || patientData?.firstName || '';
      migrationData.patientLastName = consultationData.patientLastName || patientData?.lastName || '';
      migrationData.patientDateOfBirth = consultationData.patientDateOfBirth || patientData?.dateOfBirth || '';
      migrationData.patientGender = consultationData.patientGender || patientData?.gender || '';
      migrationData.patientPhone = consultationData.patientPhone || patientData?.phone || '';
      migrationData.patientEmail = consultationData.patientEmail || patientData?.email || '';
      migrationData.patientProfession = consultationData.patientProfession || patientData?.profession || '';
      migrationData.patientAddress = consultationData.patientAddress || patientData?.address?.street || '';
      migrationData.patientInsurance = consultationData.patientInsurance || patientData?.insurance?.provider || '';
      migrationData.patientInsuranceNumber = consultationData.patientInsuranceNumber || patientData?.insurance?.policyNumber || '';
      
      // ✅ CORRECTION : Mettre à jour aussi reason et treatment si ce sont des UUIDs
      if (hasInvalidData(consultationData.reason)) {
        migrationData.reason = patientData?.consultationReason || 'Consultation ostéopathique';
      }
      if (hasInvalidData(consultationData.treatment)) {
        migrationData.treatment = patientData?.osteopathicTreatment || 'Traitement ostéopathique';
      }

      await updateDoc(consultationRef, migrationData);

      console.log(`✅ Consultation ${consultationId} migrée avec succès`);
      return true;

    } catch (error) {
      console.error(`❌ Erreur lors de la migration de la consultation ${consultationId}:`, error);
      throw error;
    }
  }

  /**
   * Vérifie si une consultation nécessite une migration
   */
  static async needsMigration(consultationId: string): Promise<boolean> {
    try {
      const consultationRef = doc(db, 'consultations', consultationId);
      const consultationDoc = await getDoc(consultationRef);

      if (!consultationDoc.exists()) {
        return false;
      }

      const consultationData = consultationDoc.data();

      // Vérifier si les champs cliniques sont présents
      return !consultationData.hasOwnProperty('currentTreatment') ||
             !consultationData.hasOwnProperty('consultationReason') ||
             !consultationData.hasOwnProperty('medicalAntecedents') ||
             !consultationData.hasOwnProperty('medicalHistory') ||
             !consultationData.hasOwnProperty('osteopathicTreatment') ||
             !consultationData.hasOwnProperty('symptoms');

    } catch (error) {
      console.error('Erreur lors de la vérification de la migration:', error);
      return false;
    }
  }
}
