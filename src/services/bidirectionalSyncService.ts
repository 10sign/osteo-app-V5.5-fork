/**
 * Service de synchronisation bidirectionnelle des consultations initiales
 *
 * Ce service permet la synchronisation dans les deux sens:
 * 1. Dossier patient → Consultation initiale (déjà existant via InitialConsultationSyncService)
 * 2. Consultation initiale → Dossier patient (NOUVEAU)
 */

import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HDSCompliance } from '../utils/hdsCompliance';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';

interface SyncResult {
  success: boolean;
  patientId?: string;
  fieldsUpdated: string[];
  error?: string;
}

interface ConsultationData {
  id: string;
  patientId: string;
  osteopathId: string;
  isInitialConsultation?: boolean;
  currentTreatment?: string;
  consultationReason?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  symptoms?: string[];
}

export class BidirectionalSyncService {
  /**
   * Synchronise le dossier patient avec les données de la consultation initiale
   * Cette fonction met à jour le dossier patient avec les données cliniques de la consultation initiale
   *
   * @param consultationId - ID de la consultation
   * @param consultationData - Données de la consultation (déchiffrées)
   * @param patientId - ID du patient
   * @param osteopathId - ID de l'ostéopathe
   * @returns Résultat de la synchronisation
   */
  static async syncPatientFromInitialConsultation(
    consultationId: string,
    consultationData: ConsultationData,
    patientId: string,
    osteopathId: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      fieldsUpdated: []
    };

    try {
      console.log(`🔄 Synchronisation bidirectionnelle: consultation initiale ${consultationId} → patient ${patientId}`);

      // 1. Vérifier que c'est bien la consultation initiale
      if (!consultationData.isInitialConsultation) {
        console.log('  ⚠️  Cette consultation n\'est pas la consultation initiale, synchronisation annulée');
        result.success = true;
        return result;
      }

      console.log('  ✅ Confirmation: c\'est la consultation initiale');

      // 2. Vérifier que le patient existe
      const patientRef = doc(db, 'patients', patientId);
      const patientSnap = await getDoc(patientRef);

      if (!patientSnap.exists()) {
        console.error('  ❌ Patient non trouvé');
        result.error = 'Patient non trouvé';
        return result;
      }

      const patientData = patientSnap.data();

      // 3. Vérifier la propriété
      if (patientData.osteopathId !== osteopathId) {
        console.error('  ❌ Accès non autorisé au patient');
        result.error = 'Accès non autorisé';
        return result;
      }

      console.log('  ✅ Patient trouvé et propriété vérifiée');

      // 4. Préparer les champs à mettre à jour dans le patient
      const fieldsToUpdate = this.preparePatientFieldsFromConsultation(consultationData);

      if (Object.keys(fieldsToUpdate).length === 0) {
        console.log('  ℹ️  Aucune donnée consultation à synchroniser');
        result.success = true;
        return result;
      }

      console.log(`  ✏️  Mise à jour de ${Object.keys(fieldsToUpdate).length} champs dans le dossier patient`);
      result.fieldsUpdated = Object.keys(fieldsToUpdate);

      // 5. Ajouter la date de mise à jour
      fieldsToUpdate.updatedAt = new Date().toISOString();

      // 6. Chiffrer les données avec HDS
      const encryptedUpdates = HDSCompliance.prepareDataForStorage(
        fieldsToUpdate,
        'patients',
        osteopathId
      );

      // 7. Filtrer les valeurs undefined/null
      const cleanedUpdates = Object.fromEntries(
        Object.entries(encryptedUpdates).filter(([_, value]) => value !== undefined && value !== null)
      );

      // 8. Mettre à jour le patient dans Firestore
      await updateDoc(patientRef, cleanedUpdates);

      console.log('  ✅ Dossier patient synchronisé avec succès');
      result.success = true;
      result.patientId = patientId;

      // 9. Journaliser dans les audit logs
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `patients/${patientId}`,
        'sync_from_initial_consultation',
        SensitivityLevel.SENSITIVE,
        'success',
        {
          consultationId,
          fieldsUpdated: result.fieldsUpdated,
          source: 'initial_consultation'
        }
      );

    } catch (error) {
      console.error(`  ❌ Erreur lors de la synchronisation bidirectionnelle:`, error);
      result.success = false;
      result.error = (error as Error).message;

      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `patients/${patientId}`,
        'sync_from_initial_consultation',
        SensitivityLevel.SENSITIVE,
        'failure',
        {
          consultationId,
          error: result.error
        }
      );
    }

    return result;
  }

  /**
   * Prépare les champs du patient à mettre à jour depuis la consultation
   * Extrait uniquement les champs cliniques de la consultation
   */
  private static preparePatientFieldsFromConsultation(consultationData: ConsultationData): Record<string, any> {
    const fieldsToUpdate: Record<string, any> = {};

    if (consultationData.currentTreatment !== undefined) {
      fieldsToUpdate.currentTreatment = consultationData.currentTreatment || '';
    }
    if (consultationData.consultationReason !== undefined) {
      fieldsToUpdate.consultationReason = consultationData.consultationReason || '';
    }
    if (consultationData.medicalAntecedents !== undefined) {
      fieldsToUpdate.medicalAntecedents = consultationData.medicalAntecedents || '';
    }
    if (consultationData.medicalHistory !== undefined) {
      fieldsToUpdate.medicalHistory = consultationData.medicalHistory || '';
    }
    if (consultationData.osteopathicTreatment !== undefined) {
      fieldsToUpdate.osteopathicTreatment = consultationData.osteopathicTreatment || '';
    }

    if (consultationData.symptoms !== undefined) {
      fieldsToUpdate.tags = Array.isArray(consultationData.symptoms)
        ? consultationData.symptoms
        : [];
    }

    return fieldsToUpdate;
  }

  /**
   * Synchronise avec confirmation utilisateur
   * Retourne une Promise qui attend la confirmation de l'utilisateur
   */
  static async syncWithConfirmation(
    consultationId: string,
    consultationData: ConsultationData,
    patientId: string,
    osteopathId: string,
    onConfirm: () => Promise<boolean>
  ): Promise<SyncResult> {
    try {
      console.log('🔔 Demande de confirmation pour la synchronisation bidirectionnelle...');

      const confirmed = await onConfirm();

      if (!confirmed) {
        console.log('  ❌ Synchronisation annulée par l\'utilisateur');
        return {
          success: false,
          fieldsUpdated: [],
          error: 'Synchronisation annulée par l\'utilisateur'
        };
      }

      console.log('  ✅ Confirmation reçue, synchronisation en cours...');

      return await this.syncPatientFromInitialConsultation(
        consultationId,
        consultationData,
        patientId,
        osteopathId
      );

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation avec confirmation:', error);
      return {
        success: false,
        fieldsUpdated: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Fonction utilitaire pour synchroniser automatiquement dans les deux sens
   * Utilisée lors de la modification de la consultation initiale
   */
  static async bidirectionalSync(
    consultationId: string,
    consultationData: ConsultationData,
    patientId: string,
    osteopathId: string
  ): Promise<{
    patientUpdated: boolean;
    consultationUpdated: boolean;
    fieldsUpdated: string[];
    errors: string[];
  }> {
    const result = {
      patientUpdated: false,
      consultationUpdated: false,
      fieldsUpdated: [] as string[],
      errors: [] as string[]
    };

    try {
      const syncResult = await this.syncPatientFromInitialConsultation(
        consultationId,
        consultationData,
        patientId,
        osteopathId
      );

      if (syncResult.success) {
        result.patientUpdated = true;
        result.fieldsUpdated = syncResult.fieldsUpdated;
        console.log('✅ Synchronisation bidirectionnelle réussie');
      } else {
        result.errors.push(syncResult.error || 'Erreur inconnue');
      }

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation bidirectionnelle:', error);
      result.errors.push((error as Error).message);
    }

    return result;
  }
}

export default BidirectionalSyncService;
