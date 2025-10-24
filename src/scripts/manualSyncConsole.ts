/**
 * Script de synchronisation manuelle pour la console développeur
 *
 * Pour utiliser ce script :
 * 1. Ouvrez la console développeur (F12)
 * 2. Copiez-collez ce code dans la console
 * 3. Exécutez : await runManualSync('julie.boddaert@hotmail.fr')
 */

import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HDSCompliance } from '../utils/hdsCompliance';

/**
 * Trouve un ostéopathe par email
 */
async function findOsteopathByEmail(email: string): Promise<{ id: string; name: string } | null> {
  try {
    console.log(`🔍 Recherche de l'ostéopathe avec l'email: ${email}`);

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      return null;
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

    console.log(`✅ Utilisateur trouvé: ${name} (${userDoc.id})`);
    return { id: userDoc.id, name };
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de l\'utilisateur:', error);
    return null;
  }
}

/**
 * Trouve la consultation initiale d'un patient
 */
async function findInitialConsultation(patientId: string, osteopathId: string): Promise<string | null> {
  try {
    const consultationsRef = collection(db, 'consultations');

    // Stratégie 1: Chercher avec le flag isInitialConsultation
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

    // Stratégie 2: Prendre la plus ancienne par date
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
 * Synchronise la consultation initiale avec les données du patient
 */
async function syncConsultationWithPatient(
  consultationId: string,
  patientData: any,
  osteopathId: string
): Promise<{ success: boolean; fieldsUpdated: string[] }> {
  const result = { success: false, fieldsUpdated: [] as string[] };

  try {
    const fieldsToUpdate: Record<string, any> = {};

    // ✅ CORRECTION: Copier SEULEMENT les champs NON VIDES du dossier patient
    // On ne copie PAS les chaînes vides pour ne pas écraser des données existantes

    // Champs cliniques - COPIE SÉLECTIVE (seulement si non vide)
    if (patientData.currentTreatment && patientData.currentTreatment.trim() !== '') {
      fieldsToUpdate.currentTreatment = patientData.currentTreatment;
      result.fieldsUpdated.push('currentTreatment');
    }
    if (patientData.consultationReason && patientData.consultationReason.trim() !== '') {
      fieldsToUpdate.consultationReason = patientData.consultationReason;
      result.fieldsUpdated.push('consultationReason');
    }
    if (patientData.medicalAntecedents && patientData.medicalAntecedents.trim() !== '') {
      fieldsToUpdate.medicalAntecedents = patientData.medicalAntecedents;
      result.fieldsUpdated.push('medicalAntecedents');
    }
    if (patientData.medicalHistory && patientData.medicalHistory.trim() !== '') {
      fieldsToUpdate.medicalHistory = patientData.medicalHistory;
      result.fieldsUpdated.push('medicalHistory');
    }
    if (patientData.osteopathicTreatment && patientData.osteopathicTreatment.trim() !== '') {
      fieldsToUpdate.osteopathicTreatment = patientData.osteopathicTreatment;
      result.fieldsUpdated.push('osteopathicTreatment');
    }
    if (patientData.tags && Array.isArray(patientData.tags) && patientData.tags.length > 0) {
      fieldsToUpdate.symptoms = patientData.tags;
      result.fieldsUpdated.push('symptoms');
    }

    // Champs d'identité patient (snapshot) - Toujours copier
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

    // Adresse patient
    if (patientData.address) {
      const addressString = typeof patientData.address === 'string'
        ? patientData.address
        : patientData.address.street || '';
      if (addressString.trim() !== '') {
        fieldsToUpdate.patientAddress = addressString;
      }
    }

    // Assurance patient
    if (patientData.insurance) {
      const insuranceString = typeof patientData.insurance === 'string'
        ? patientData.insurance
        : patientData.insurance.provider || '';
      if (insuranceString.trim() !== '') {
        fieldsToUpdate.patientInsurance = insuranceString;
      }
    }
    if (patientData.insuranceNumber && patientData.insuranceNumber.trim() !== '') {
      fieldsToUpdate.patientInsuranceNumber = patientData.insuranceNumber;
    }

    fieldsToUpdate.updatedAt = Timestamp.fromDate(new Date());

    if (Object.keys(fieldsToUpdate).length === 0) {
      console.log('  ℹ️  Aucune donnée à synchroniser');
      result.success = true;
      return result;
    }

    // Chiffrer les données
    const encryptedUpdates = HDSCompliance.prepareDataForStorage(
      fieldsToUpdate,
      'consultations',
      osteopathId
    );

    // Filtrer les valeurs undefined/null
    const cleanedUpdates = Object.fromEntries(
      Object.entries(encryptedUpdates).filter(([_, value]) => value !== undefined && value !== null)
    );

    // Mettre à jour dans Firestore
    const consultationRef = doc(db, 'consultations', consultationId);
    await updateDoc(consultationRef, cleanedUpdates);

    result.success = true;
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    return result;
  }
}

/**
 * Fonction principale de synchronisation
 */
export async function runManualSync(osteopathEmail: string): Promise<void> {
  console.log('🚀 DÉMARRAGE DE LA SYNCHRONISATION MANUELLE');
  console.log('━'.repeat(60));

  try {
    // 1. Trouver l'ostéopathe
    const osteopath = await findOsteopathByEmail(osteopathEmail);
    if (!osteopath) {
      console.error('❌ Ostéopathe non trouvé');
      return;
    }

    console.log(`\n👤 Ostéopathe: ${osteopath.name} (${osteopath.id})`);
    console.log('━'.repeat(60));

    // 2. Récupérer tous les patients
    const patientsRef = collection(db, 'patients');
    const patientsQuery = query(patientsRef, where('osteopathId', '==', osteopath.id));
    const patientsSnapshot = await getDocs(patientsQuery);

    console.log(`\n📊 ${patientsSnapshot.size} patient(s) trouvé(s)\n`);

    let patientsProcessed = 0;
    let consultationsUpdated = 0;
    const errors: string[] = [];

    // 3. Traiter chaque patient
    for (const patientDoc of patientsSnapshot.docs) {
      const patientData = patientDoc.data();
      const patientId = patientDoc.id;

      // Déchiffrer les données du patient
      const decryptedPatientData = HDSCompliance.decryptDataForDisplay(
        patientData,
        'patients',
        osteopath.id
      );

      const patientName = `${decryptedPatientData.firstName || ''} ${decryptedPatientData.lastName || ''}`.trim();
      console.log(`\n👤 Patient: ${patientName}`);

      try {
        // Trouver la consultation initiale
        const consultationId = await findInitialConsultation(patientId, osteopath.id);

        if (!consultationId) {
          console.log('  ℹ️  Aucune consultation initiale');
          patientsProcessed++;
          continue;
        }

        console.log(`  📋 Consultation initiale: ${consultationId}`);

        // Synchroniser
        const syncResult = await syncConsultationWithPatient(
          consultationId,
          decryptedPatientData,
          osteopath.id
        );

        if (syncResult.success) {
          if (syncResult.fieldsUpdated.length > 0) {
            console.log(`  ✅ ${syncResult.fieldsUpdated.length} champs mis à jour: ${syncResult.fieldsUpdated.join(', ')}`);
            consultationsUpdated++;
          } else {
            console.log('  ℹ️  Aucun changement nécessaire');
          }
        } else {
          errors.push(`${patientName}: Échec de la synchronisation`);
        }

        patientsProcessed++;
      } catch (error) {
        const errorMsg = `${patientName}: ${(error as Error).message}`;
        console.error(`  ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // 4. Afficher le résumé
    console.log('\n' + '━'.repeat(60));
    console.log('📊 RÉSUMÉ DE LA SYNCHRONISATION');
    console.log('━'.repeat(60));
    console.log(`✅ Patients traités: ${patientsProcessed}`);
    console.log(`✅ Consultations mises à jour: ${consultationsUpdated}`);
    console.log(`❌ Erreurs: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ DÉTAIL DES ERREURS:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('\n' + '━'.repeat(60));
    console.log('✅ SYNCHRONISATION TERMINÉE');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('❌ ERREUR CRITIQUE:', error);
  }
}

// Rendre disponible globalement
if (typeof window !== 'undefined') {
  (window as any).runManualSync = runManualSync;
}
