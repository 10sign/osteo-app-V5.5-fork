import { collection, getDocs, query, where, orderBy, limit, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HDSCompliance } from '../utils/hdsCompliance';

/**
 * Script de migration pour synchroniser les données de la première consultation avec le dossier patient
 *
 * Ce script :
 * 1. Récupère tous les patients
 * 2. Pour chaque patient, trouve sa première consultation (la plus ancienne)
 * 3. Compare les données du patient avec celles de la première consultation
 * 4. Met à jour la première consultation avec les données du dossier patient si nécessaire
 */

interface MigrationResult {
  totalPatients: number;
  patientsWithConsultations: number;
  consultationsUpdated: number;
  errors: string[];
  details: Array<{
    patientId: string;
    patientName: string;
    consultationId: string;
    fieldsUpdated: string[];
  }>;
}

export async function syncFirstConsultationData(osteopathId: string): Promise<MigrationResult> {
  console.log('🔄 Démarrage de la synchronisation des premières consultations...');

  const result: MigrationResult = {
    totalPatients: 0,
    patientsWithConsultations: 0,
    consultationsUpdated: 0,
    errors: [],
    details: []
  };

  try {
    // 1. Récupérer tous les patients de l'ostéopathe
    const patientsRef = collection(db, 'patients');
    const patientsQuery = query(patientsRef, where('osteopathId', '==', osteopathId));
    const patientsSnapshot = await getDocs(patientsQuery);

    result.totalPatients = patientsSnapshot.size;
    console.log(`📊 ${result.totalPatients} patients trouvés`);

    // 2. Pour chaque patient, traiter sa première consultation
    for (const patientDoc of patientsSnapshot.docs) {
      const patientId = patientDoc.id;
      const patientData = patientDoc.data();

      // Déchiffrer les données du patient
      let decryptedPatient;
      try {
        decryptedPatient = HDSCompliance.decryptDataForDisplay(patientData, 'patients', osteopathId);
      } catch (error) {
        console.error(`❌ Erreur de déchiffrement pour le patient ${patientId}:`, error);
        result.errors.push(`Patient ${patientId}: Erreur de déchiffrement`);
        continue;
      }

      const patientName = `${decryptedPatient.firstName || ''} ${decryptedPatient.lastName || ''}`.trim();

      console.log(`\n👤 Traitement du patient: ${patientName} (${patientId})`);

      // 3. Trouver la première consultation de ce patient
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('patientId', '==', patientId),
        where('osteopathId', '==', osteopathId),
        orderBy('date', 'asc'),
        limit(1)
      );

      const consultationsSnapshot = await getDocs(consultationsQuery);

      if (consultationsSnapshot.empty) {
        console.log(`  ℹ️  Aucune consultation trouvée pour ce patient`);
        continue;
      }

      result.patientsWithConsultations++;

      const firstConsultationDoc = consultationsSnapshot.docs[0];
      const consultationId = firstConsultationDoc.id;
      const consultationData = firstConsultationDoc.data();

      console.log(`  📋 Première consultation trouvée: ${consultationId}`);

      // 4. Comparer et préparer les mises à jour
      const fieldsToUpdate: string[] = [];
      const updates: Record<string, any> = {};

      // Mapper les champs du patient vers la consultation
      const fieldMappings = [
        { patient: 'firstName', consultation: 'patientFirstName' },
        { patient: 'lastName', consultation: 'patientLastName' },
        { patient: 'dateOfBirth', consultation: 'patientDateOfBirth' },
        { patient: 'gender', consultation: 'patientGender' },
        { patient: 'phone', consultation: 'patientPhone' },
        { patient: 'email', consultation: 'patientEmail' },
        { patient: 'profession', consultation: 'patientProfession' },
        { patient: 'medicalAntecedents', consultation: 'medicalAntecedents' },
        { patient: 'currentTreatment', consultation: 'currentTreatment' },
        { patient: 'consultationReason', consultation: 'consultationReason' },
        { patient: 'medicalHistory', consultation: 'medicalHistory' },
        { patient: 'osteopathicTreatment', consultation: 'osteopathicTreatment' }
      ];

      // Déchiffrer les données de consultation existantes
      let decryptedConsultation;
      try {
        decryptedConsultation = HDSCompliance.decryptDataForDisplay(consultationData, 'consultations', osteopathId);
      } catch (error) {
        console.error(`❌ Erreur de déchiffrement pour la consultation ${consultationId}:`, error);
        result.errors.push(`Consultation ${consultationId}: Erreur de déchiffrement`);
        continue;
      }

      // Comparer chaque champ
      for (const mapping of fieldMappings) {
        const patientValue = decryptedPatient[mapping.patient];
        const consultationValue = decryptedConsultation[mapping.consultation];

        // Vérifier si le champ du patient existe et diffère de celui de la consultation
        if (patientValue !== undefined && patientValue !== null && patientValue !== '') {
          // Si la consultation n'a pas ce champ ou a une valeur différente
          if (!consultationValue || consultationValue === '' ||
              (typeof consultationValue === 'string' && consultationValue.includes('[DECODING_FAILED]'))) {
            updates[mapping.consultation] = patientValue;
            fieldsToUpdate.push(mapping.consultation);
          }
        }
      }

      // Traiter l'adresse spécialement
      if (decryptedPatient.address) {
        const addressString = typeof decryptedPatient.address === 'string'
          ? decryptedPatient.address
          : decryptedPatient.address.street || '';

        if (addressString && (!decryptedConsultation.patientAddress || decryptedConsultation.patientAddress === '')) {
          updates.patientAddress = addressString;
          fieldsToUpdate.push('patientAddress');
        }
      }

      // Traiter l'assurance
      if (decryptedPatient.insurance) {
        const insuranceString = typeof decryptedPatient.insurance === 'string'
          ? decryptedPatient.insurance
          : decryptedPatient.insurance.provider || '';

        if (insuranceString && (!decryptedConsultation.patientInsurance || decryptedConsultation.patientInsurance === '')) {
          updates.patientInsurance = insuranceString;
          fieldsToUpdate.push('patientInsurance');
        }
      }

      if (decryptedPatient.insuranceNumber &&
          (!decryptedConsultation.patientInsuranceNumber || decryptedConsultation.patientInsuranceNumber === '')) {
        updates.patientInsuranceNumber = decryptedPatient.insuranceNumber;
        fieldsToUpdate.push('patientInsuranceNumber');
      }

      // 5. Appliquer les mises à jour si nécessaire
      if (fieldsToUpdate.length > 0) {
        console.log(`  ✏️  Mise à jour de ${fieldsToUpdate.length} champs:`, fieldsToUpdate);

        // Ajouter les métadonnées de mise à jour
        updates.updatedAt = new Date();

        try {
          // Préparer les données pour le stockage avec chiffrement HDS
          const dataToStore = HDSCompliance.prepareDataForStorage({
            ...consultationData,
            ...updates
          }, 'consultations', osteopathId);

          // Filtrer les valeurs undefined
          const cleanedData = Object.fromEntries(
            Object.entries(dataToStore).filter(([_, value]) => value !== undefined)
          );

          // Mettre à jour la consultation
          const consultationRef = doc(db, 'consultations', consultationId);
          await updateDoc(consultationRef, cleanedData);

          result.consultationsUpdated++;
          result.details.push({
            patientId,
            patientName,
            consultationId,
            fieldsUpdated: fieldsToUpdate
          });

          console.log(`  ✅ Consultation mise à jour avec succès`);
        } catch (error) {
          console.error(`  ❌ Erreur lors de la mise à jour:`, error);
          result.errors.push(`Consultation ${consultationId}: ${(error as Error).message}`);
        }
      } else {
        console.log(`  ✓ Consultation déjà à jour`);
      }
    }

    console.log('\n✅ Migration terminée !');
    console.log(`📊 Résumé:`);
    console.log(`   - Patients traités: ${result.totalPatients}`);
    console.log(`   - Patients avec consultations: ${result.patientsWithConsultations}`);
    console.log(`   - Consultations mises à jour: ${result.consultationsUpdated}`);
    console.log(`   - Erreurs: ${result.errors.length}`);

    return result;

  } catch (error) {
    console.error('❌ Erreur fatale lors de la migration:', error);
    result.errors.push(`Erreur fatale: ${(error as Error).message}`);
    return result;
  }
}

// Fonction utilitaire pour exécuter la migration depuis la console
export async function runMigration(osteopathId: string) {
  console.log('🚀 Lancement de la migration...');
  const result = await syncFirstConsultationData(osteopathId);

  if (result.details.length > 0) {
    console.log('\n📝 Détails des mises à jour:');
    result.details.forEach(detail => {
      console.log(`\n  Patient: ${detail.patientName} (${detail.patientId})`);
      console.log(`  Consultation: ${detail.consultationId}`);
      console.log(`  Champs mis à jour: ${detail.fieldsUpdated.join(', ')}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n⚠️  Erreurs rencontrées:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  return result;
}
