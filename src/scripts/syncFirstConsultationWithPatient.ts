/**
 * Script de migration rétroactive : Synchroniser les premières consultations avec les données du patient
 *
 * Ce script corrige les premières consultations qui n'ont pas été correctement pré-remplies
 * avec les données cliniques du dossier patient.
 *
 * Objectif:
 * - Pour chaque patient, identifier sa première consultation (par date)
 * - Compléter cette consultation avec les données cliniques du patient si elles sont manquantes
 * - Ne JAMAIS écraser les données déjà saisies manuellement
 */

import { collection, getDocs, query, where, doc, updateDoc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { HDSCompliance } from '../utils/hdsCompliance';

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  currentTreatment?: string;
  consultationReason?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  tags?: string[];
}

interface ConsultationData {
  id: string;
  patientId: string;
  date: any;
  currentTreatment?: string;
  consultationReason?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  symptoms?: string[];
}

/**
 * Trouve un ostéopathe par son email
 */
export async function findOsteopathByEmail(email: string): Promise<string | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      return null;
    }

    const userDoc = snapshot.docs[0];
    console.log(`✅ Utilisateur trouvé: ${userDoc.data().firstName} ${userDoc.data().lastName} (${userDoc.id})`);
    return userDoc.id;
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de l\'utilisateur:', error);
    return null;
  }
}

/**
 * Synchronise les premières consultations avec les données des patients
 */
export async function syncFirstConsultationsWithPatients(osteopathId?: string): Promise<{
  success: boolean;
  patientsProcessed: number;
  consultationsUpdated: number;
  errors: string[];
}> {
  const result = {
    success: true,
    patientsProcessed: 0,
    consultationsUpdated: 0,
    errors: [] as string[]
  };

  try {
    // Utiliser l'osteopathe connecté ou celui fourni
    const userId = osteopathId || auth.currentUser?.uid;

    if (!userId) {
      throw new Error('Aucun utilisateur authentifié');
    }

    console.log('🔄 Début de la synchronisation des premières consultations...');
    console.log('👤 Ostéopathe:', userId);

    // 1. Récupérer tous les patients de cet ostéopathe
    const patientsRef = collection(db, 'patients');
    const patientsQuery = query(patientsRef, where('osteopathId', '==', userId));
    const patientsSnapshot = await getDocs(patientsQuery);

    console.log(`📊 ${patientsSnapshot.size} patient(s) trouvé(s)`);

    // 2. Pour chaque patient
    for (const patientDoc of patientsSnapshot.docs) {
      try {
        const patientData = patientDoc.data();
        const patientId = patientDoc.id;

        // Déchiffrer les données du patient
        const decryptedPatientData = HDSCompliance.decryptDataForDisplay(
          patientData,
          'patients',
          userId
        ) as PatientData;

        decryptedPatientData.id = patientId;

        console.log(`\n👤 Traitement du patient: ${decryptedPatientData.firstName} ${decryptedPatientData.lastName}`);

        // 3. Récupérer la première consultation de ce patient (par date)
        const consultationsRef = collection(db, 'consultations');
        const firstConsultationQuery = query(
          consultationsRef,
          where('osteopathId', '==', userId),
          where('patientId', '==', patientId),
          orderBy('date', 'asc'),
          limit(1)
        );

        const firstConsultationSnapshot = await getDocs(firstConsultationQuery);

        if (firstConsultationSnapshot.empty) {
          console.log('  ⚠️  Aucune consultation trouvée pour ce patient');
          result.patientsProcessed++;
          continue;
        }

        const firstConsultationDoc = firstConsultationSnapshot.docs[0];
        const consultationData = firstConsultationDoc.data();
        const consultationId = firstConsultationDoc.id;

        // Déchiffrer les données de la consultation
        const decryptedConsultationData = HDSCompliance.decryptDataForDisplay(
          consultationData,
          'consultations',
          userId
        ) as ConsultationData;

        decryptedConsultationData.id = consultationId;

        console.log(`  📅 Première consultation trouvée: ${consultationId}`);
        console.log(`     Date: ${decryptedConsultationData.date?.toDate?.() || decryptedConsultationData.date}`);

        // 4. Vérifier quels champs cliniques sont manquants ou vides
        const fieldsToUpdate: Record<string, any> = {};
        let hasUpdates = false;

        // Vérifier chaque champ clinique
        if ((!decryptedConsultationData.currentTreatment || decryptedConsultationData.currentTreatment.trim() === '') &&
            decryptedPatientData.currentTreatment) {
          fieldsToUpdate.currentTreatment = decryptedPatientData.currentTreatment;
          hasUpdates = true;
          console.log('  ✅ Ajout du traitement effectué');
        }

        if ((!decryptedConsultationData.consultationReason || decryptedConsultationData.consultationReason.trim() === '') &&
            decryptedPatientData.consultationReason) {
          fieldsToUpdate.consultationReason = decryptedPatientData.consultationReason;
          hasUpdates = true;
          console.log('  ✅ Ajout du motif de consultation');
        }

        if ((!decryptedConsultationData.medicalAntecedents || decryptedConsultationData.medicalAntecedents.trim() === '') &&
            decryptedPatientData.medicalAntecedents) {
          fieldsToUpdate.medicalAntecedents = decryptedPatientData.medicalAntecedents;
          hasUpdates = true;
          console.log('  ✅ Ajout des antécédents médicaux');
        }

        if ((!decryptedConsultationData.medicalHistory || decryptedConsultationData.medicalHistory.trim() === '') &&
            decryptedPatientData.medicalHistory) {
          fieldsToUpdate.medicalHistory = decryptedPatientData.medicalHistory;
          hasUpdates = true;
          console.log('  ✅ Ajout de l\'historique médical');
        }

        if ((!decryptedConsultationData.osteopathicTreatment || decryptedConsultationData.osteopathicTreatment.trim() === '') &&
            decryptedPatientData.osteopathicTreatment) {
          fieldsToUpdate.osteopathicTreatment = decryptedPatientData.osteopathicTreatment;
          hasUpdates = true;
          console.log('  ✅ Ajout du traitement ostéopathique');
        }

        if ((!decryptedConsultationData.symptoms || decryptedConsultationData.symptoms.length === 0) &&
            decryptedPatientData.tags && decryptedPatientData.tags.length > 0) {
          fieldsToUpdate.symptoms = decryptedPatientData.tags;
          hasUpdates = true;
          console.log('  ✅ Ajout des symptômes');
        }

        // 5. Si des champs doivent être mis à jour
        if (hasUpdates) {
          // Ajouter la date de mise à jour
          fieldsToUpdate.updatedAt = Timestamp.fromDate(new Date());

          // Chiffrer les données avant la mise à jour
          const encryptedUpdates = HDSCompliance.prepareDataForStorage(
            fieldsToUpdate,
            'consultations',
            userId
          );

          // Filtrer les valeurs undefined/null
          const cleanedUpdates = Object.fromEntries(
            Object.entries(encryptedUpdates).filter(([_, value]) => value !== undefined && value !== null)
          );

          console.log('  💾 Mise à jour de la consultation avec les données du patient...');

          const consultationRef = doc(db, 'consultations', consultationId);
          await updateDoc(consultationRef, cleanedUpdates);

          result.consultationsUpdated++;
          console.log('  ✅ Consultation mise à jour avec succès');
        } else {
          console.log('  ℹ️  Aucune mise à jour nécessaire (champs déjà remplis)');
        }

        result.patientsProcessed++;

      } catch (error) {
        console.error(`❌ Erreur lors du traitement du patient ${patientDoc.id}:`, error);
        result.errors.push(`Patient ${patientDoc.id}: ${(error as Error).message}`);
      }
    }

    console.log('\n✅ Synchronisation terminée');
    console.log(`📊 Résumé:`);
    console.log(`   - Patients traités: ${result.patientsProcessed}`);
    console.log(`   - Consultations mises à jour: ${result.consultationsUpdated}`);
    console.log(`   - Erreurs: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Erreurs rencontrées:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur critique lors de la synchronisation:', error);
    result.success = false;
    result.errors.push(`Erreur critique: ${(error as Error).message}`);
  }

  return result;
}

// Fonction helper pour exécuter le script manuellement
export async function runSyncScript() {
  console.log('🚀 Lancement du script de synchronisation...');
  const result = await syncFirstConsultationsWithPatients();
  return result;
}

/**
 * Synchronise les consultations pour un ostéopathe spécifique identifié par email
 */
export async function syncForOsteopathByEmail(email: string) {
  console.log(`🔍 Recherche de l'ostéopathe: ${email}`);

  const osteopathId = await findOsteopathByEmail(email);

  if (!osteopathId) {
    return {
      success: false,
      patientsProcessed: 0,
      consultationsUpdated: 0,
      errors: [`Ostéopathe non trouvé: ${email}`]
    };
  }

  console.log(`\n🚀 Lancement de la synchronisation pour ${email}...\n`);
  const result = await syncFirstConsultationsWithPatients(osteopathId);
  return result;
}
