import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface ClinicalData {
  consultationReason?: string;
  currentTreatment?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  symptoms?: string | string[];
  tags?: string[];
  pathologies?: string[];
}

export class ClinicalDataSyncService {
  static async syncPatientToFirstConsultation(
    patientId: string,
    osteopathId: string,
    clinicalData: ClinicalData
  ): Promise<void> {
    try {
      console.log(`🔄 Synchronisation des données cliniques pour le patient ${patientId}`);
      console.log('Données cliniques à synchroniser:', clinicalData);

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
        .map(docSnapshot => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
          date: docSnapshot.data().date
        }))
        .sort((a: any, b: any) => {
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

      // Vérification plus intelligente : on vérifie si au moins un champ clinique important est rempli
      const hasExistingClinicalData =
        (existingData.consultationReason && existingData.consultationReason.trim().length > 0) ||
        (existingData.currentTreatment && existingData.currentTreatment.trim().length > 0) ||
        (existingData.medicalAntecedents && existingData.medicalAntecedents.trim().length > 0) ||
        (existingData.medicalHistory && existingData.medicalHistory.trim().length > 0) ||
        (existingData.osteopathicTreatment && existingData.osteopathicTreatment.trim().length > 0);

      if (hasExistingClinicalData) {
        console.log('⚠️ La première consultation contient déjà des données cliniques, pas de synchronisation');
        return;
      }

      console.log('✅ La première consultation est vide, synchronisation en cours...');

      const updateData: any = {
        updatedAt: new Date().toISOString()
      };

      // Copier tous les champs, même vides, pour s'assurer de la synchronisation
      updateData.consultationReason = clinicalData.consultationReason || '';
      updateData.currentTreatment = clinicalData.currentTreatment || '';
      updateData.medicalAntecedents = clinicalData.medicalAntecedents || '';
      updateData.medicalHistory = clinicalData.medicalHistory || '';
      updateData.osteopathicTreatment = clinicalData.osteopathicTreatment || '';

      // Gérer les symptômes/tags/pathologies
      let symptomsToSync: string[] = [];

      if (clinicalData.tags && Array.isArray(clinicalData.tags) && clinicalData.tags.length > 0) {
        symptomsToSync = clinicalData.tags;
      } else if (clinicalData.pathologies && Array.isArray(clinicalData.pathologies) && clinicalData.pathologies.length > 0) {
        symptomsToSync = clinicalData.pathologies;
      } else if (clinicalData.symptoms) {
        if (Array.isArray(clinicalData.symptoms)) {
          symptomsToSync = clinicalData.symptoms;
        } else if (typeof clinicalData.symptoms === 'string') {
          symptomsToSync = clinicalData.symptoms.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      }

      if (symptomsToSync.length > 0) {
        updateData.symptoms = symptomsToSync.join(', ');
      } else {
        updateData.symptoms = '';
      }

      console.log('Données à écrire dans la consultation:', updateData);

      await updateDoc(firstConsultationRef, updateData);
      console.log(`✅ Données cliniques synchronisées vers la première consultation ${firstConsultation.id}`);
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

      console.log(`📊 ${patientsSnapshot.docs.length} patients trouvés`);

      let syncedCount = 0;
      let skippedCount = 0;

      for (const patientDoc of patientsSnapshot.docs) {
        const patient = patientDoc.data();
        const patientId = patientDoc.id;

        console.log(`\n--- Patient ${patientId} ---`);
        console.log('Données patient:', {
          consultationReason: patient.consultationReason,
          currentTreatment: patient.currentTreatment,
          medicalAntecedents: patient.medicalAntecedents,
          medicalHistory: patient.medicalHistory,
          osteopathicTreatment: patient.osteopathicTreatment,
          tags: patient.tags,
          pathologies: patient.pathologies
        });

        // On synchronise même si certains champs sont vides, du moment qu'il y a au moins une donnée
        const hasSomeClinicalData =
          (patient.consultationReason && patient.consultationReason.trim().length > 0) ||
          (patient.currentTreatment && patient.currentTreatment.trim().length > 0) ||
          (patient.medicalAntecedents && patient.medicalAntecedents.trim().length > 0) ||
          (patient.medicalHistory && patient.medicalHistory.trim().length > 0) ||
          (patient.osteopathicTreatment && patient.osteopathicTreatment.trim().length > 0) ||
          (patient.tags && Array.isArray(patient.tags) && patient.tags.length > 0) ||
          (patient.pathologies && Array.isArray(patient.pathologies) && patient.pathologies.length > 0);

        if (!hasSomeClinicalData) {
          console.log(`⏭️ Patient ${patientId} : aucune donnée clinique, ignoré`);
          skippedCount++;
          continue;
        }

        const clinicalData: ClinicalData = {
          consultationReason: patient.consultationReason || '',
          currentTreatment: patient.currentTreatment || '',
          medicalAntecedents: patient.medicalAntecedents || '',
          medicalHistory: patient.medicalHistory || '',
          osteopathicTreatment: patient.osteopathicTreatment || '',
          symptoms: patient.symptoms,
          tags: patient.tags,
          pathologies: patient.pathologies
        };

        try {
          await this.syncPatientToFirstConsultation(patientId, osteopathId, clinicalData);
          syncedCount++;
          console.log(`✅ Patient ${patientId} synchronisé`);
        } catch (error) {
          console.error(`❌ Erreur lors de la synchronisation du patient ${patientId}:`, error);
        }
      }

      console.log(`\n✅ Synchronisation rétroactive terminée :`);
      console.log(`   - ${syncedCount} patients synchronisés`);
      console.log(`   - ${skippedCount} patients ignorés (pas de données)`);
      return syncedCount;
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation rétroactive:', error);
      throw error;
    }
  }
}
