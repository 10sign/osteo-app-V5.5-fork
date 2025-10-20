import { collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface ClinicalData {
  consultationReason?: string;
  currentTreatment?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  symptoms?: string;
  tags?: string[];
}

export class ClinicalDataSyncService {
  static async syncPatientToFirstConsultation(
    patientId: string,
    osteopathId: string,
    clinicalData: ClinicalData
  ): Promise<void> {
    try {
      console.log(`🔄 Synchronisation des données cliniques pour le patient ${patientId}`);

      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('patientId', '==', patientId),
        where('osteopathId', '==', osteopathId)
      );

      const consultationsSnapshot = await getDocs(q);

      if (consultationsSnapshot.empty) {
        console.log('❌ Aucune consultation trouvée pour ce patient');
        return;
      }

      const consultations = consultationsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date
        }))
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB;
        });

      const firstConsultation = consultations[0];
      const firstConsultationRef = doc(db, 'consultations', firstConsultation.id);
      const firstConsultationDoc = await getDoc(firstConsultationRef);

      if (!firstConsultationDoc.exists()) {
        console.log('❌ La première consultation n\'existe plus');
        return;
      }

      const existingData = firstConsultationDoc.data();

      const hasExistingClinicalData =
        existingData.consultationReason ||
        existingData.currentTreatment ||
        existingData.medicalAntecedents ||
        existingData.medicalHistory ||
        existingData.osteopathicTreatment ||
        existingData.symptoms;

      if (hasExistingClinicalData) {
        console.log('✅ La première consultation contient déjà des données cliniques, pas de synchronisation');
        return;
      }

      const updateData: any = {
        updatedAt: new Date().toISOString()
      };

      if (clinicalData.consultationReason) {
        updateData.consultationReason = clinicalData.consultationReason;
      }
      if (clinicalData.currentTreatment) {
        updateData.currentTreatment = clinicalData.currentTreatment;
      }
      if (clinicalData.medicalAntecedents) {
        updateData.medicalAntecedents = clinicalData.medicalAntecedents;
      }
      if (clinicalData.medicalHistory) {
        updateData.medicalHistory = clinicalData.medicalHistory;
      }
      if (clinicalData.osteopathicTreatment) {
        updateData.osteopathicTreatment = clinicalData.osteopathicTreatment;
      }
      if (clinicalData.tags && clinicalData.tags.length > 0) {
        updateData.symptoms = clinicalData.tags.join(', ');
      } else if (clinicalData.symptoms) {
        updateData.symptoms = clinicalData.symptoms;
      }

      if (Object.keys(updateData).length > 1) {
        await updateDoc(firstConsultationRef, updateData);
        console.log(`✅ Données cliniques synchronisées vers la première consultation ${firstConsultation.id}`);
      } else {
        console.log('ℹ️ Aucune donnée clinique à synchroniser');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation des données cliniques:', error);
      throw error;
    }
  }

  static async syncAllPatientsRetroactively(osteopathId: string): Promise<number> {
    try {
      console.log('🔄 Démarrage de la synchronisation rétroactive pour tous les patients');

      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(patientsRef, where('osteopathId', '==', osteopathId));
      const patientsSnapshot = await getDocs(patientsQuery);

      let syncedCount = 0;

      for (const patientDoc of patientsSnapshot.docs) {
        const patient = patientDoc.data();
        const patientId = patientDoc.id;

        const hasClinicalData =
          patient.consultationReason ||
          patient.currentTreatment ||
          patient.medicalAntecedents ||
          patient.medicalHistory ||
          patient.osteopathicTreatment ||
          (patient.tags && patient.tags.length > 0);

        if (!hasClinicalData) {
          console.log(`⏭️ Patient ${patientId} : pas de données cliniques, ignoré`);
          continue;
        }

        const clinicalData: ClinicalData = {
          consultationReason: patient.consultationReason,
          currentTreatment: patient.currentTreatment,
          medicalAntecedents: patient.medicalAntecedents,
          medicalHistory: patient.medicalHistory,
          osteopathicTreatment: patient.osteopathicTreatment,
          symptoms: patient.symptoms,
          tags: patient.tags
        };

        try {
          await this.syncPatientToFirstConsultation(patientId, osteopathId, clinicalData);
          syncedCount++;
        } catch (error) {
          console.error(`❌ Erreur lors de la synchronisation du patient ${patientId}:`, error);
        }
      }

      console.log(`✅ Synchronisation rétroactive terminée : ${syncedCount} patients traités`);
      return syncedCount;
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation rétroactive:', error);
      throw error;
    }
  }
}
