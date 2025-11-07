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
  }> {
    const res = await InitialConsultationSyncService.syncAllInitialConsultationsRetroactive(osteopathId);
    return {
      success: res.success,
      updatedConsultations: res.consultationsUpdated,
      errors: res.errors
    };
  }
}

export default InitialConsultationIntegrityService;