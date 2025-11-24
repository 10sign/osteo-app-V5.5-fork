import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { HDSCompliance, cleanFirestoreData } from '../utils/hdsCompliance';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';

interface MigrationResult {
  success: boolean;
  totalPatients: number;
  patientsUpdated: number;
  errors: string[];
  details: Array<{
    patientId: string;
    patientName: string;
    fieldsUpdated: string[];
    source: 'consultation' | 'none';
  }>;
}

/**
 * Service pour migrer les anciens dossiers patients
 * Remplit les champs cliniques manquants (currentTreatment, consultationReason, etc.)
 * en récupérant les données depuis les consultations existantes
 */
export class PatientDataMigrationService {

  /**
   * Migre tous les patients d'un ostéopathe
   * Remplit les champs cliniques manquants avec les données de la première consultation
   */
  static async migrateAllPatients(osteopathId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      totalPatients: 0,
      patientsUpdated: 0,
      errors: [],
      details: []
    };

    try {
      console.log('🔄 DÉBUT: Migration des dossiers patients');
      console.log('👤 Ostéopathe:', osteopathId);

      // 1. Récupérer tous les patients de l'ostéopathe
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(patientsRef, where('osteopathId', '==', osteopathId));
      const patientsSnapshot = await getDocs(patientsQuery);

      result.totalPatients = patientsSnapshot.size;
      console.log(`📊 ${result.totalPatients} patient(s) trouvé(s)`);

      // 2. Pour chaque patient, vérifier et remplir les champs manquants
      for (const patientDoc of patientsSnapshot.docs) {
        try {
          const patientId = patientDoc.id;
          const patientData = patientDoc.data();
          const patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient sans nom';

          console.log(`\n👤 Traitement du patient: ${patientName} (${patientId})`);

          // Déchiffrer les données du patient pour vérification
          const decryptedPatientData = HDSCompliance.decryptDataForDisplay(
            patientData,
            'patients',
            osteopathId
          );

          // Vérifier si les champs cliniques sont manquants ou vides
          const needsMigration = this.checkIfNeedsMigration(decryptedPatientData);

          if (!needsMigration) {
            console.log(`  ✅ Patient déjà à jour, aucune migration nécessaire`);
            continue;
          }

          console.log(`  🔍 Champs manquants détectés, recherche de données dans les consultations...`);

          // Rechercher la première consultation pour récupérer les données
          const consultationsRef = collection(db, 'consultations');
          const consultationsQuery = query(
            consultationsRef,
            where('osteopathId', '==', osteopathId),
            where('patientId', '==', patientId),
            orderBy('date', 'asc'),
            limit(1)
          );

          const consultationsSnapshot = await getDocs(consultationsQuery);

          let fieldsToUpdate: any = {};
          let source: 'consultation' | 'none' = 'none';
          let fieldsUpdated: string[] = [];

          if (!consultationsSnapshot.empty) {
            // Récupérer les données de la première consultation
            const firstConsultation = consultationsSnapshot.docs[0].data();

            // Déchiffrer les données de la consultation
            const decryptedConsultation = HDSCompliance.decryptDataForDisplay(
              firstConsultation,
              'consultations',
              osteopathId
            );

            console.log(`  📋 Première consultation trouvée, extraction des données...`);

            // Extraire et préparer les données pour la mise à jour
            const extractedData = this.extractClinicalDataFromConsultation(
              decryptedPatientData,
              decryptedConsultation
            );

            fieldsToUpdate = extractedData.fieldsToUpdate;
            fieldsUpdated = extractedData.fieldsUpdated;
            source = 'consultation';

            if (fieldsUpdated.length > 0) {
              console.log(`  📝 Champs à mettre à jour:`, fieldsUpdated.join(', '));
            }
          } else {
            // Aucune consultation trouvée, initialiser avec des valeurs vides
            console.log(`  ℹ️  Aucune consultation trouvée, initialisation avec valeurs vides`);

            const emptyData = this.initializeEmptyFields(decryptedPatientData);
            fieldsToUpdate = emptyData.fieldsToUpdate;
            fieldsUpdated = emptyData.fieldsUpdated;
            source = 'none';
          }

          // Si aucun champ à mettre à jour, passer au patient suivant
          if (Object.keys(fieldsToUpdate).length === 0) {
            console.log(`  ✅ Aucun champ à mettre à jour`);
            continue;
          }

          // Chiffrer les données avant la mise à jour
          const encryptedData = HDSCompliance.encryptDataForStorage(
            fieldsToUpdate,
            'patients',
            osteopathId
          );

          // Ajouter le timestamp de mise à jour
          encryptedData.updatedAt = Timestamp.fromDate(new Date());

          // Mettre à jour le patient
          const patientRef = doc(db, 'patients', patientId);
          await updateDoc(patientRef, cleanFirestoreData(encryptedData));

          result.patientsUpdated++;
          result.details.push({
            patientId,
            patientName,
            fieldsUpdated,
            source
          });

          console.log(`  ✅ Patient migré avec succès (${result.patientsUpdated}/${result.totalPatients})`);

          // Journaliser dans les audit logs
          await AuditLogger.log(
            AuditEventType.DATA_MODIFICATION,
            `patients/${patientId}`,
            'migration',
            SensitivityLevel.SENSITIVE,
            'success',
            {
              fieldsUpdated,
              source,
              migrationType: 'clinical_fields_migration'
            }
          );

        } catch (error) {
          const errorMessage = `Patient ${patientDoc.id}: ${(error as Error).message}`;
          console.error(`  ❌ ${errorMessage}`);
          result.errors.push(errorMessage);
        }
      }

      console.log('\n✅ TERMINÉ: Migration des dossiers patients');
      console.log(`📊 Résumé:`);
      console.log(`   - Patients traités: ${result.totalPatients}`);
      console.log(`   - Patients mis à jour: ${result.patientsUpdated}`);
      console.log(`   - Erreurs: ${result.errors.length}`);

    } catch (error) {
      console.error('❌ Erreur critique lors de la migration:', error);
      result.success = false;
      result.errors.push(`Erreur critique: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Vérifie si un patient nécessite une migration
   */
  private static checkIfNeedsMigration(patientData: any): boolean {
    // Vérifier si les champs cliniques sont manquants ou vides
    const hasCurrentTreatment = patientData.currentTreatment && patientData.currentTreatment.trim() !== '';
    const hasConsultationReason = patientData.consultationReason && patientData.consultationReason.trim() !== '';
    const hasMedicalAntecedents = patientData.medicalAntecedents && patientData.medicalAntecedents.trim() !== '';
    const hasOsteopathicTreatment = patientData.osteopathicTreatment && patientData.osteopathicTreatment.trim() !== '';

    // Le patient nécessite une migration si au moins un champ est manquant
    return !hasCurrentTreatment || !hasConsultationReason || !hasMedicalAntecedents || !hasOsteopathicTreatment;
  }

  /**
   * Extrait les données cliniques d'une consultation pour remplir le dossier patient
   */
  private static extractClinicalDataFromConsultation(
    patientData: any,
    consultationData: any
  ): { fieldsToUpdate: any; fieldsUpdated: string[] } {
    const fieldsToUpdate: any = {};
    const fieldsUpdated: string[] = [];

    // currentTreatment - depuis treatment ou currentTreatment de la consultation
    if (!patientData.currentTreatment || patientData.currentTreatment.trim() === '') {
      const treatment = consultationData.currentTreatment || consultationData.treatment || '';
      if (treatment && treatment.trim() !== '') {
        fieldsToUpdate.currentTreatment = treatment;
        fieldsUpdated.push('currentTreatment');
      }
    }

    // consultationReason - depuis reason ou consultationReason de la consultation
    if (!patientData.consultationReason || patientData.consultationReason.trim() === '') {
      const reason = consultationData.consultationReason || consultationData.reason || '';
      if (reason && reason.trim() !== '') {
        fieldsToUpdate.consultationReason = reason;
        fieldsUpdated.push('consultationReason');
      }
    }

    // medicalAntecedents - depuis medicalAntecedents ou medicalHistory de la consultation
    if (!patientData.medicalAntecedents || patientData.medicalAntecedents.trim() === '') {
      const antecedents = consultationData.medicalAntecedents || consultationData.medicalHistory || '';
      if (antecedents && antecedents.trim() !== '') {
        fieldsToUpdate.medicalAntecedents = antecedents;
        fieldsUpdated.push('medicalAntecedents');
      }
    }

    // medicalHistory - depuis medicalHistory de la consultation
    if (!patientData.medicalHistory || patientData.medicalHistory.trim() === '') {
      const history = consultationData.medicalHistory || '';
      if (history && history.trim() !== '') {
        fieldsToUpdate.medicalHistory = history;
        fieldsUpdated.push('medicalHistory');
      }
    }

    // osteopathicTreatment - depuis osteopathicTreatment de la consultation
    if (!patientData.osteopathicTreatment || patientData.osteopathicTreatment.trim() === '') {
      const osteoTreatment = consultationData.osteopathicTreatment || consultationData.treatment || '';
      if (osteoTreatment && osteoTreatment.trim() !== '') {
        fieldsToUpdate.osteopathicTreatment = osteoTreatment;
        fieldsUpdated.push('osteopathicTreatment');
      }
    }

    // tags/symptoms - depuis symptoms de la consultation
    if (!patientData.tags || patientData.tags.length === 0) {
      const symptoms = consultationData.symptoms || [];
      if (Array.isArray(symptoms) && symptoms.length > 0) {
        fieldsToUpdate.tags = symptoms;
        fieldsUpdated.push('tags');
      }
    }

    return { fieldsToUpdate, fieldsUpdated };
  }

  /**
   * Initialise les champs cliniques avec des valeurs vides
   */
  private static initializeEmptyFields(
    patientData: any
  ): { fieldsToUpdate: any; fieldsUpdated: string[] } {
    const fieldsToUpdate: any = {};
    const fieldsUpdated: string[] = [];

    if (!patientData.currentTreatment || patientData.currentTreatment.trim() === '') {
      fieldsToUpdate.currentTreatment = '';
      fieldsUpdated.push('currentTreatment');
    }

    if (!patientData.consultationReason || patientData.consultationReason.trim() === '') {
      fieldsToUpdate.consultationReason = '';
      fieldsUpdated.push('consultationReason');
    }

    if (!patientData.medicalAntecedents || patientData.medicalAntecedents.trim() === '') {
      fieldsToUpdate.medicalAntecedents = '';
      fieldsUpdated.push('medicalAntecedents');
    }

    if (!patientData.medicalHistory || patientData.medicalHistory.trim() === '') {
      fieldsToUpdate.medicalHistory = '';
      fieldsUpdated.push('medicalHistory');
    }

    if (!patientData.osteopathicTreatment || patientData.osteopathicTreatment.trim() === '') {
      fieldsToUpdate.osteopathicTreatment = '';
      fieldsUpdated.push('osteopathicTreatment');
    }

    if (!patientData.tags || patientData.tags.length === 0) {
      fieldsToUpdate.tags = [];
      fieldsUpdated.push('tags');
    }

    return { fieldsToUpdate, fieldsUpdated };
  }

  /**
   * Migre tous les patients pour TOUS les ostéopathes
   */
  static async migrateAllPatientsForAllOsteopaths(): Promise<{
    success: boolean;
    totalOsteopaths: number;
    results: Record<string, MigrationResult>;
  }> {
    const globalResult = {
      success: true,
      totalOsteopaths: 0,
      results: {} as Record<string, MigrationResult>
    };

    try {
      console.log('🌍 DÉBUT: Migration globale pour tous les ostéopathes');

      // Récupérer tous les utilisateurs ostéopathes
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      console.log(`📊 ${usersSnapshot.size} utilisateurs trouvés, filtrage des ostéopathes...`);

      // Filtrer les rôles d'ostéopathes
      const osteopathDocs = usersSnapshot.docs.filter(doc => {
        const role = doc.data().role;
        return role && (
          role === 'Ostéopathe' ||
          role === 'osteopathe' ||
          role === 'OSTEOPATHE' ||
          role === 'osteo'
        );
      });

      globalResult.totalOsteopaths = osteopathDocs.length;
      console.log(`👥 ${globalResult.totalOsteopaths} ostéopathe(s) trouvé(s)`);

      if (globalResult.totalOsteopaths === 0) {
        console.warn('⚠️ Aucun ostéopathe trouvé dans la base de données');
        return globalResult;
      }

      // Traiter chaque ostéopathe
      for (const osteopathDoc of osteopathDocs) {
        const osteopathId = osteopathDoc.id;
        const osteopathData = osteopathDoc.data();
        const osteopathName = `${osteopathData.firstName || ''} ${osteopathData.lastName || ''}`.trim() || osteopathId;

        console.log(`\n👨‍⚕️ Traitement de l'ostéopathe: ${osteopathName} (${osteopathId})`);

        try {
          const result = await this.migrateAllPatients(osteopathId);
          globalResult.results[osteopathId] = result;

          if (!result.success) {
            globalResult.success = false;
          }

        } catch (error) {
          console.error(`❌ Erreur pour l'ostéopathe ${osteopathName}:`, error);
          globalResult.results[osteopathId] = {
            success: false,
            totalPatients: 0,
            patientsUpdated: 0,
            errors: [(error as Error).message],
            details: []
          };
          globalResult.success = false;
        }
      }

      console.log('\n🎉 TERMINÉ: Migration globale terminée');

      // Calculer les totaux
      const totalPatientsUpdated = Object.values(globalResult.results).reduce(
        (sum, result) => sum + result.patientsUpdated,
        0
      );
      const totalErrors = Object.values(globalResult.results).reduce(
        (sum, result) => sum + result.errors.length,
        0
      );

      console.log(`📊 Résumé global:`);
      console.log(`   - Ostéopathes traités: ${globalResult.totalOsteopaths}`);
      console.log(`   - Patients mis à jour: ${totalPatientsUpdated}`);
      console.log(`   - Erreurs totales: ${totalErrors}`);

    } catch (error) {
      console.error('❌ Erreur critique lors de la migration globale:', error);
      globalResult.success = false;
    }

    return globalResult;
  }
}
