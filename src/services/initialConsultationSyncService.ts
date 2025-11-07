/**
 * Service de synchronisation automatique des consultations initiales
 *
 * Ce service écrase automatiquement TOUTES les données cliniques de la consultation initiale
 * avec les données du dossier patient à chaque modification du patient.
 */

import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HDSCompliance } from '../utils/hdsCompliance';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';

interface SyncResult {
  success: boolean;
  consultationId?: string;
  fieldsUpdated: string[];
  error?: string;
}

interface PatientData {
  id: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  profession?: string;
  address?: any;
  insurance?: any;
  insuranceNumber?: string;
  currentTreatment?: string;
  consultationReason?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  tags?: string[];
  notes?: string;
}

export class InitialConsultationSyncService {
  /**
   * Synchronise la consultation initiale d'un patient avec les données du dossier patient
   * Cette fonction ÉCRASE TOUS les champs cliniques, même s'ils ne sont pas vides
   *
   * @param patientId - ID du patient
   * @param patientData - Données du dossier patient (déchiffrées)
   * @param osteopathId - ID de l'ostéopathe
   * @returns Résultat de la synchronisation
   */
  static async syncInitialConsultationForPatient(
    patientId: string,
    patientData: PatientData,
    osteopathId: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      fieldsUpdated: []
    };

    try {
      console.log(`🔄 Synchronisation automatique de la consultation initiale pour le patient ${patientId}`);

      // 1. Rechercher la consultation initiale du patient
      const consultationId = await this.findInitialConsultation(patientId, osteopathId);

      if (!consultationId) {
        console.log('  ℹ️  Aucune consultation initiale trouvée pour ce patient');
        result.success = true; // Ce n'est pas une erreur
        return result;
      }

      console.log(`  📋 Consultation initiale trouvée: ${consultationId}`);
      result.consultationId = consultationId;

      // 2. Préparer les champs à écraser avec les données du patient
      const fieldsToUpdate = this.prepareFieldsToUpdate(patientData);

      console.log(`  🔍 DEBUG - Données patient reçues:`, {
        currentTreatment: patientData.currentTreatment,
        consultationReason: patientData.consultationReason,
        medicalAntecedents: patientData.medicalAntecedents,
        medicalHistory: patientData.medicalHistory,
        osteopathicTreatment: patientData.osteopathicTreatment,
        tags: patientData.tags,
        notes: patientData.notes
      });

      console.log(`  🔍 DEBUG - Champs préparés pour mise à jour:`, fieldsToUpdate);

      if (Object.keys(fieldsToUpdate).length === 0) {
        console.log('  ℹ️  Aucune donnée patient à synchroniser (tous les champs sont vides)');
        result.success = true;
        return result;
      }

      console.log(`  ✏️  Copie de ${Object.keys(fieldsToUpdate).length} champs non vides`);
      result.fieldsUpdated = Object.keys(fieldsToUpdate);

      // 3. Ajouter la date de mise à jour
      fieldsToUpdate.updatedAt = Timestamp.fromDate(new Date());

      // 4. Chiffrer les données avec HDS
      const encryptedUpdates = HDSCompliance.prepareDataForStorage(
        fieldsToUpdate,
        'consultations',
        osteopathId
      );

      // 5. Filtrer les valeurs undefined/null
      const cleanedUpdates = Object.fromEntries(
        Object.entries(encryptedUpdates).filter(([_, value]) => value !== undefined && value !== null)
      );

      // 6. Mettre à jour la consultation dans Firestore
      const consultationRef = doc(db, 'consultations', consultationId);
      await updateDoc(consultationRef, cleanedUpdates);

      console.log('  ✅ Consultation initiale synchronisée avec succès');
      result.success = true;

      // 7. Journaliser dans les audit logs
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `consultations/${consultationId}`,
        'auto_sync_from_patient',
        SensitivityLevel.SENSITIVE,
        'success',
        {
          patientId,
          fieldsUpdated: result.fieldsUpdated,
          source: 'patient_update'
        }
      );

    } catch (error) {
      console.error(`  ❌ Erreur lors de la synchronisation automatique:`, error);
      result.success = false;
      result.error = (error as Error).message;

      // Journaliser l'erreur
      if (result.consultationId) {
        await AuditLogger.log(
          AuditEventType.DATA_MODIFICATION,
          `consultations/${result.consultationId}`,
          'auto_sync_from_patient',
          SensitivityLevel.SENSITIVE,
          'failure',
          {
            patientId,
            error: result.error
          }
        );
      }
    }

    return result;
  }

  /**
   * Trouve la consultation initiale d'un patient
   * Recherche d'abord par le flag isInitialConsultation, puis par la date la plus ancienne
   */
  private static async findInitialConsultation(
    patientId: string,
    osteopathId: string
  ): Promise<string | null> {
    try {
      const consultationsRef = collection(db, 'consultations');

      // Stratégie 1: Chercher la consultation avec le flag isInitialConsultation
      const flagQuery = query(
        consultationsRef,
        where('osteopathId', '==', osteopathId),
        where('patientId', '==', patientId),
        where('isInitialConsultation', '==', true),
        limit(1)
      );

      const flagSnapshot = await getDocs(flagQuery);

      if (!flagSnapshot.empty) {
        return flagSnapshot.docs[0].id;
      }

      // Stratégie 2: Si aucune consultation avec le flag, prendre la plus ancienne par date
      const dateQuery = query(
        consultationsRef,
        where('osteopathId', '==', osteopathId),
        where('patientId', '==', patientId),
        orderBy('date', 'asc'),
        limit(1)
      );

      const dateSnapshot = await getDocs(dateQuery);

      if (!dateSnapshot.empty) {
        return dateSnapshot.docs[0].id;
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de la recherche de la consultation initiale:', error);
      return null;
    }
  }

  /**
   * Prépare les champs à mettre à jour dans la consultation
   * ✅ CORRECTION: Copie SEULEMENT les champs NON VIDES du dossier patient
   * Ne copie PAS les chaînes vides pour ne pas écraser des données existantes dans la consultation
   */
  private static prepareFieldsToUpdate(patientData: PatientData): Record<string, any> {
    const fieldsToUpdate: Record<string, any> = {};

    // Champs d'identité du patient (snapshot) - Toujours copier
    if (patientData.firstName !== undefined) {
      fieldsToUpdate.patientFirstName = patientData.firstName;
    }
    if (patientData.lastName !== undefined) {
      fieldsToUpdate.patientLastName = patientData.lastName;
    }
    if (patientData.dateOfBirth !== undefined) {
      fieldsToUpdate.patientDateOfBirth = patientData.dateOfBirth;
    }
    if (patientData.gender !== undefined) {
      fieldsToUpdate.patientGender = patientData.gender;
    }
    if (patientData.email !== undefined) {
      fieldsToUpdate.patientEmail = patientData.email;
    }
    if (patientData.phone !== undefined) {
      fieldsToUpdate.patientPhone = patientData.phone;
    }
    if (patientData.profession !== undefined) {
      fieldsToUpdate.patientProfession = patientData.profession;
    }

    // Traiter l'adresse - Copier seulement si non vide
    if (patientData.address) {
      const addressString = typeof patientData.address === 'string'
        ? patientData.address
        : patientData.address.street || '';
      if (addressString && addressString.trim() !== '') {
        fieldsToUpdate.patientAddress = addressString;
      }
    }

    // Traiter l'assurance - Copier seulement si non vide
    if (patientData.insurance) {
      const insuranceString = typeof patientData.insurance === 'string'
        ? patientData.insurance
        : patientData.insurance.provider || '';
      if (insuranceString && insuranceString.trim() !== '') {
        fieldsToUpdate.patientInsurance = insuranceString;
      }
    }
    if (patientData.insuranceNumber && patientData.insuranceNumber.trim() !== '') {
      fieldsToUpdate.patientInsuranceNumber = patientData.insuranceNumber;
    }

    // ✅ CHAMPS CLINIQUES - COPIE SÉLECTIVE
    // Copier SEULEMENT les champs qui ont une valeur non vide dans le dossier patient
    // Ne PAS copier les champs vides pour éviter d'écraser des données existantes

    if (patientData.currentTreatment && patientData.currentTreatment.trim() !== '') {
      fieldsToUpdate.currentTreatment = patientData.currentTreatment;
    }
    if (patientData.consultationReason && patientData.consultationReason.trim() !== '') {
      fieldsToUpdate.consultationReason = patientData.consultationReason;
    }
    if (patientData.medicalAntecedents && patientData.medicalAntecedents.trim() !== '') {
      fieldsToUpdate.medicalAntecedents = patientData.medicalAntecedents;
    }
    if (patientData.medicalHistory && patientData.medicalHistory.trim() !== '') {
      fieldsToUpdate.medicalHistory = patientData.medicalHistory;
    }
    if (patientData.osteopathicTreatment && patientData.osteopathicTreatment.trim() !== '') {
      fieldsToUpdate.osteopathicTreatment = patientData.osteopathicTreatment;
    }

    // Symptômes (depuis les tags du patient) - Copier seulement si non vide
    if (patientData.tags && Array.isArray(patientData.tags) && patientData.tags.length > 0) {
      fieldsToUpdate.symptoms = patientData.tags;
    }

    // Note sur le patient - Copier seulement si non vide
    if (patientData.notes && patientData.notes.trim() !== '') {
      fieldsToUpdate.notes = patientData.notes;
    }

    return fieldsToUpdate;
  }

  /**
   * Synchronise les consultations initiales de manière rétroactive pour un ostéopathe
   * Force l'écrasement de TOUTES les données, même si elles existent déjà
   *
   * @param osteopathId - ID de l'ostéopathe
   * @returns Résultat de la migration avec détails
   */
  static async syncAllInitialConsultationsRetroactive(
    osteopathId: string
  ): Promise<{
    success: boolean;
    patientsProcessed: number;
    consultationsUpdated: number;
    errors: string[];
    details: Array<{
      patientId: string;
      patientName: string;
      consultationId: string;
      fieldsUpdated: string[];
    }>;
  }> {
    const result = {
      success: true,
      patientsProcessed: 0,
      consultationsUpdated: 0,
      errors: [] as string[],
      details: [] as Array<{
        patientId: string;
        patientName: string;
        consultationId: string;
        fieldsUpdated: string[];
      }>
    };

    try {
      console.log('🔄 Synchronisation rétroactive de TOUTES les consultations initiales...');
      console.log('👤 Ostéopathe:', osteopathId);

      // 1. Récupérer tous les patients de l'ostéopathe
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(patientsRef, where('osteopathId', '==', osteopathId));
      const patientsSnapshot = await getDocs(patientsQuery);

      console.log(`📊 ${patientsSnapshot.size} patient(s) trouvé(s)`);

      // 2. Pour chaque patient, synchroniser sa consultation initiale
      for (const patientDoc of patientsSnapshot.docs) {
        try {
          const patientData = patientDoc.data();
          const patientId = patientDoc.id;

          // Déchiffrer les données du patient
          const decryptedPatientData = HDSCompliance.decryptDataForDisplay(
            patientData,
            'patients',
            osteopathId
          ) as PatientData;

          decryptedPatientData.id = patientId;

          const patientName = `${decryptedPatientData.firstName || ''} ${decryptedPatientData.lastName || ''}`.trim();
          console.log(`\n👤 Traitement du patient: ${patientName}`);

          // Synchroniser la consultation initiale
          const syncResult = await this.syncInitialConsultationForPatient(
            patientId,
            decryptedPatientData,
            osteopathId
          );

          result.patientsProcessed++;

          if (syncResult.success && syncResult.consultationId && syncResult.fieldsUpdated.length > 0) {
            result.consultationsUpdated++;
            result.details.push({
              patientId,
              patientName,
              consultationId: syncResult.consultationId,
              fieldsUpdated: syncResult.fieldsUpdated
            });
          }

          if (syncResult.error) {
            result.errors.push(`Patient ${patientName} (${patientId}): ${syncResult.error}`);
          }

        } catch (error) {
          console.error(`❌ Erreur lors du traitement du patient ${patientDoc.id}:`, error);
          result.errors.push(`Patient ${patientDoc.id}: ${(error as Error).message}`);
        }
      }

      console.log('\n✅ Synchronisation rétroactive terminée');
      console.log(`📊 Résumé:`);
      console.log(`   - Patients traités: ${result.patientsProcessed}`);
      console.log(`   - Consultations mises à jour: ${result.consultationsUpdated}`);
      console.log(`   - Erreurs: ${result.errors.length}`);

    } catch (error) {
      console.error('❌ Erreur critique lors de la synchronisation rétroactive:', error);
      result.success = false;
      result.errors.push(`Erreur critique: ${(error as Error).message}`);
    }

    return result;
  }
}
