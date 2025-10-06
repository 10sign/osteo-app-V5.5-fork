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
 * Ajoute les champs cliniques manquants aux consultations passées
 */
export class ConsultationMigrationService {

  /**
   * Migre toutes les consultations d'un praticien
   * Ajoute les champs cliniques manquants avec des valeurs vides
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

          // Vérifier si les champs cliniques sont déjà présents
          const needsMigration = !consultationData.hasOwnProperty('currentTreatment') ||
                                 !consultationData.hasOwnProperty('consultationReason') ||
                                 !consultationData.hasOwnProperty('medicalAntecedents') ||
                                 !consultationData.hasOwnProperty('medicalHistory') ||
                                 !consultationData.hasOwnProperty('osteopathicTreatment') ||
                                 !consultationData.hasOwnProperty('symptoms');

          if (!needsMigration) {
            console.log(`✅ Consultation ${consultationId} déjà migrée`);
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

          // Préparer les données de migration
          const migrationData: any = {
            // Champs cliniques (valeurs vides ou depuis le patient)
            currentTreatment: consultationData.currentTreatment || patientData?.currentTreatment || '',
            consultationReason: consultationData.consultationReason || patientData?.consultationReason || '',
            medicalAntecedents: consultationData.medicalAntecedents || patientData?.medicalAntecedents || '',
            medicalHistory: consultationData.medicalHistory || patientData?.medicalHistory || '',
            osteopathicTreatment: consultationData.osteopathicTreatment || patientData?.osteopathicTreatment || '',
            symptoms: consultationData.symptoms || patientData?.tags || [],

            // Champs d'identité patient (snapshot) si non présents
            patientFirstName: consultationData.patientFirstName || patientData?.firstName || '',
            patientLastName: consultationData.patientLastName || patientData?.lastName || '',
            patientDateOfBirth: consultationData.patientDateOfBirth || patientData?.dateOfBirth || '',
            patientGender: consultationData.patientGender || patientData?.gender || '',
            patientPhone: consultationData.patientPhone || patientData?.phone || '',
            patientEmail: consultationData.patientEmail || patientData?.email || '',
            patientProfession: consultationData.patientProfession || patientData?.profession || '',
            patientAddress: consultationData.patientAddress || patientData?.address?.street || '',
            patientInsurance: consultationData.patientInsurance || patientData?.insurance?.provider || '',
            patientInsuranceNumber: consultationData.patientInsuranceNumber || patientData?.insurance?.policyNumber || ''
          };

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

      // Préparer les données de migration
      const migrationData: any = {
        currentTreatment: consultationData.currentTreatment || patientData?.currentTreatment || '',
        consultationReason: consultationData.consultationReason || patientData?.consultationReason || '',
        medicalAntecedents: consultationData.medicalAntecedents || patientData?.medicalAntecedents || '',
        medicalHistory: consultationData.medicalHistory || patientData?.medicalHistory || '',
        osteopathicTreatment: consultationData.osteopathicTreatment || patientData?.osteopathicTreatment || '',
        symptoms: consultationData.symptoms || patientData?.tags || [],

        patientFirstName: consultationData.patientFirstName || patientData?.firstName || '',
        patientLastName: consultationData.patientLastName || patientData?.lastName || '',
        patientDateOfBirth: consultationData.patientDateOfBirth || patientData?.dateOfBirth || '',
        patientGender: consultationData.patientGender || patientData?.gender || '',
        patientPhone: consultationData.patientPhone || patientData?.phone || '',
        patientEmail: consultationData.patientEmail || patientData?.email || '',
        patientProfession: consultationData.patientProfession || patientData?.profession || '',
        patientAddress: consultationData.patientAddress || patientData?.address?.street || '',
        patientInsurance: consultationData.patientInsurance || patientData?.insurance?.provider || '',
        patientInsuranceNumber: consultationData.patientInsuranceNumber || patientData?.insurance?.policyNumber || ''
      };

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
