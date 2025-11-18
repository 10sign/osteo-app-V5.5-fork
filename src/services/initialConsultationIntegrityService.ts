import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HDSCompliance } from '../utils/hdsCompliance';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';
import { InitialConsultationSyncService } from './initialConsultationSyncService';

interface DivergenceField {
  field: string;
  patientValue: any;
  consultationValue: any;
}

interface DivergenceItem {
  patientId: string;
  patientName: string;
  consultationId: string | null;
  fields: DivergenceField[];
}

export class InitialConsultationIntegrityService {
  static async checkDivergencesForOsteopath(osteopathId: string): Promise<{
    success: boolean;
    patientsChecked: number;
    divergentPatients: number;
    divergences: DivergenceItem[];
  }> {
    const result = {
      success: true,
      patientsChecked: 0,
      divergentPatients: 0,
      divergences: [] as DivergenceItem[]
    };

    const clinicalFields = [
      'currentTreatment',
      'consultationReason',
      'medicalAntecedents',
      'medicalHistory',
      'osteopathicTreatment',
      'symptoms',
      'notes'
    ];

    try {
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(patientsRef, where('osteopathId', '==', osteopathId));
      const patientsSnapshot = await getDocs(patientsQuery);

      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const patientEncrypted = patientDoc.data();
        const patient = HDSCompliance.decryptDataForDisplay(patientEncrypted, 'patients', osteopathId) as any;
        const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        result.patientsChecked++;

        // Find initial consultation (typed access)
        const consultationId = await InitialConsultationSyncService.findInitialConsultation(patientId, osteopathId);
        let divergencesForPatient: DivergenceField[] = [];
        let consultationDecrypted: any = null;

        if (consultationId) {
          const cRef = doc(db, 'consultations', consultationId);
          const cSnap = await getDoc(cRef);
          if (cSnap.exists()) {
            const cData = cSnap.data();
            consultationDecrypted = HDSCompliance.decryptDataForDisplay(cData, 'consultations', osteopathId);
          }
        }

        if (consultationDecrypted) {
          for (const field of clinicalFields) {
            const pVal = patient?.[field];
            const cVal = consultationDecrypted?.[field];

            // Normalize arrays vs strings
            const normalize = (v: any) => Array.isArray(v) ? v : v === undefined ? undefined : v;
            const np = normalize(pVal);
            const nc = normalize(cVal);

            const bothUndefined = np === undefined && nc === undefined;
            const equal = JSON.stringify(np) === JSON.stringify(nc);
            if (!bothUndefined && !equal) {
              divergencesForPatient.push({ field, patientValue: np, consultationValue: nc });
            }
          }
        } else {
          // No consultation found: consider as divergence needing creation/update
          divergencesForPatient.push({ field: 'consultation', patientValue: 'exists', consultationValue: 'missing' });
        }

        if (divergencesForPatient.length > 0) {
          result.divergentPatients++;
          result.divergences.push({
            patientId,
            patientName,
            consultationId: consultationId || null,
            fields: divergencesForPatient
          });
        }
      }

      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        `integrity/consultations_initiales/${osteopathId}`,
        'integrity_check',
        SensitivityLevel.INTERNAL,
        'success',
        { patientsChecked: result.patientsChecked, divergentPatients: result.divergentPatients }
      );

    } catch (error) {
      result.success = false;
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        `integrity/consultations_initiales/${osteopathId}`,
        'integrity_check',
        SensitivityLevel.INTERNAL,
        'failure',
        { error: (error as Error).message }
      );
    }

    return result;
  }

  static async applyCorrectionsForOsteopath(osteopathId: string): Promise<{
    success: boolean;
    updatedConsultations: number;
    errors: string[];
    details?: Array<{ patientId: string; patientName: string; consultationId: string; fieldsUpdated: string[] }>;
  }> {
    const res = await InitialConsultationSyncService.syncAllInitialConsultationsRetroactive(osteopathId);
    return {
      success: res.success,
      updatedConsultations: res.consultationsUpdated,
      errors: res.errors,
      details: res.details
    };
  }

  static async runIntegrityPassForAllOsteopaths(targetOsteopathIds?: string[]): Promise<{
    success: boolean;
    results: Record<string, {
      preCheck: {
        patientsChecked: number;
        divergentPatients: number;
        divergences: Array<{ patientId: string; patientName: string; consultationId: string | null; fields: Array<{ field: string; patientValue: any; consultationValue: any }> }>;
      };
      corrections: Array<{ patientId: string; patientName: string; consultationId: string; fieldsUpdated: string[] }>;
      updatedConsultations: number;
      errors: string[];
    }>;
    osteopathsProcessed: number;
  }> {
    const results: Record<string, any> = {};
    let processed = 0;

    try {
      let ids: string[] = Array.isArray(targetOsteopathIds) ? [...targetOsteopathIds] : [];
      if (ids.length === 0) {
        const usersRef = collection(db, 'users');
        const allUsersSnapshot = await getDocs(usersRef);
        const roleVariations = ['osteopath', 'Osteopath', 'OSTEOPATH', 'Ostéopathe', 'osteopathe', 'OSTEOPATHE', 'osteo'];
        const accepted = new Set(roleVariations.map(v => v.toLowerCase()));
        ids = allUsersSnapshot.docs
          .filter(doc => accepted.has(String(doc.data().role || '').toLowerCase()))
          .map(doc => doc.id);
      }

      for (const osteopathId of ids) {
        processed++;
        const pre = await this.checkDivergencesForOsteopath(osteopathId);
        const apply = await this.applyCorrectionsForOsteopath(osteopathId);
        results[osteopathId] = {
          preCheck: {
            patientsChecked: pre.patientsChecked,
            divergentPatients: pre.divergentPatients,
            divergences: pre.divergences
          },
          corrections: apply.details || [],
          updatedConsultations: apply.updatedConsultations,
          errors: apply.errors
        };
      }

      return { success: true, results, osteopathsProcessed: processed };
    } catch (error) {
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        'integrity/consultations_initiales',
        'integrity_run_all',
        SensitivityLevel.INTERNAL,
        'failure',
        { error: (error as Error).message }
      );
      return { success: false, results: {}, osteopathsProcessed: processed };
    }
  }
}

export default InitialConsultationIntegrityService;