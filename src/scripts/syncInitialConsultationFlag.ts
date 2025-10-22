import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

interface MigrationResult {
  patientsProcessed: number;
  consultationsUpdated: number;
  consultationsMarkedAsInitial: number;
  consultationsMarkedAsNonInitial: number;
  errors: string[];
}

/**
 * Script de migration pour ajouter le flag isInitialConsultation aux consultations existantes
 *
 * Logique :
 * - Pour chaque patient, trouver la consultation créée au même moment que le patient (createdAt similaire)
 * - Si aucune correspondance exacte, prendre la consultation avec la date la plus ancienne
 * - Marquer cette consultation avec isInitialConsultation = true
 * - Marquer toutes les autres consultations avec isInitialConsultation = false
 */
export async function syncInitialConsultationFlag(osteopathId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    patientsProcessed: 0,
    consultationsUpdated: 0,
    consultationsMarkedAsInitial: 0,
    consultationsMarkedAsNonInitial: 0,
    errors: []
  };

  console.log('🔄 Début de la migration des flags isInitialConsultation');
  console.log('👤 Ostéopathe ID:', osteopathId);

  try {
    // 1. Récupérer tous les patients de l'ostéopathe
    const patientsRef = collection(db, 'patients');
    const patientsQuery = query(patientsRef, where('osteopathId', '==', osteopathId));
    const patientsSnapshot = await getDocs(patientsQuery);

    console.log(`📊 ${patientsSnapshot.size} patient(s) trouvé(s)`);

    // 2. Pour chaque patient, identifier et marquer la consultation initiale
    for (const patientDoc of patientsSnapshot.docs) {
      const patientId = patientDoc.id;
      const patientData = patientDoc.data();
      const patientCreatedAt = patientData.createdAt;

      console.log(`\n👤 Patient: ${patientData.firstName} ${patientData.lastName} (${patientId})`);
      console.log(`📅 Patient créé le: ${patientCreatedAt}`);

      try {
        // 3. Récupérer toutes les consultations de ce patient
        const consultationsRef = collection(db, 'consultations');
        const consultationsQuery = query(
          consultationsRef,
          where('patientId', '==', patientId),
          where('osteopathId', '==', osteopathId)
        );
        const consultationsSnapshot = await getDocs(consultationsQuery);

        if (consultationsSnapshot.empty) {
          console.log('  ⚠️  Aucune consultation trouvée pour ce patient');
          result.patientsProcessed++;
          continue;
        }

        console.log(`  📅 ${consultationsSnapshot.docs.length} consultation(s) trouvée(s)`);

        // 4. Trier les consultations par date de création
        const consultations = consultationsSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data(),
          ref: doc.ref
        }));

        // Trier par date de création (createdAt) puis par date de consultation (date)
        consultations.sort((a, b) => {
          const createdAtA = a.data.createdAt?.toDate?.() || new Date(a.data.createdAt);
          const createdAtB = b.data.createdAt?.toDate?.() || new Date(b.data.createdAt);

          // Si les dates de création sont proches (moins de 5 secondes), utiliser la date de consultation
          const timeDiff = Math.abs(createdAtA.getTime() - createdAtB.getTime());
          if (timeDiff < 5000) {
            const dateA = a.data.date?.toDate?.() || new Date(a.data.date);
            const dateB = b.data.date?.toDate?.() || new Date(b.data.date);
            return dateA.getTime() - dateB.getTime();
          }

          return createdAtA.getTime() - createdAtB.getTime();
        });

        // 5. Identifier la consultation initiale
        let initialConsultation = null;

        // Stratégie 1 : Chercher une consultation créée au même moment que le patient (±5 secondes)
        if (patientCreatedAt) {
          const patientCreatedDate = new Date(patientCreatedAt);

          for (const consultation of consultations) {
            const consultationCreatedAt = consultation.data.createdAt?.toDate?.() || new Date(consultation.data.createdAt);
            const timeDiff = Math.abs(patientCreatedDate.getTime() - consultationCreatedAt.getTime());

            // Tolérance de 5 secondes
            if (timeDiff < 5000) {
              initialConsultation = consultation;
              console.log(`  ✅ Consultation initiale identifiée par createdAt (${consultationCreatedAt.toISOString()})`);
              break;
            }
          }
        }

        // Stratégie 2 : Si aucune correspondance par createdAt, prendre la première par date de consultation
        if (!initialConsultation && consultations.length > 0) {
          initialConsultation = consultations[0];
          const consultationDate = initialConsultation.data.date?.toDate?.() || new Date(initialConsultation.data.date);
          console.log(`  ⚠️  Aucune correspondance par createdAt, utilisation de la plus ancienne (${consultationDate.toISOString()})`);
        }

        // 6. Mettre à jour les flags pour toutes les consultations
        for (const consultation of consultations) {
          const isInitial = consultation.id === initialConsultation?.id;

          // Vérifier si le flag existe déjà
          const currentFlag = consultation.data.isInitialConsultation;

          // Mettre à jour seulement si nécessaire
          if (currentFlag !== isInitial) {
            await updateDoc(consultation.ref, {
              isInitialConsultation: isInitial
            });

            if (isInitial) {
              console.log(`  ✅ Consultation ${consultation.id} marquée comme INITIALE`);
              result.consultationsMarkedAsInitial++;
            } else {
              console.log(`  📝 Consultation ${consultation.id} marquée comme NON-INITIALE`);
              result.consultationsMarkedAsNonInitial++;
            }

            result.consultationsUpdated++;
          } else {
            console.log(`  ⏭️  Consultation ${consultation.id} déjà à jour (isInitial=${isInitial})`);
          }
        }

        result.patientsProcessed++;

      } catch (patientError) {
        const errorMessage = `Erreur pour le patient ${patientId}: ${(patientError as Error).message}`;
        console.error(`  ❌ ${errorMessage}`);
        result.errors.push(errorMessage);
      }
    }

    console.log('\n📊 RÉSUMÉ DE LA MIGRATION:');
    console.log(`✅ Patients traités: ${result.patientsProcessed}`);
    console.log(`📝 Consultations mises à jour: ${result.consultationsUpdated}`);
    console.log(`🎯 Consultations marquées comme INITIALES: ${result.consultationsMarkedAsInitial}`);
    console.log(`📋 Consultations marquées comme NON-INITIALES: ${result.consultationsMarkedAsNonInitial}`);
    console.log(`⚠️  Erreurs: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ LISTE DES ERREURS:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

  } catch (error) {
    const errorMessage = `Erreur globale de migration: ${(error as Error).message}`;
    console.error(`❌ ${errorMessage}`);
    result.errors.push(errorMessage);
  }

  return result;
}

/**
 * Trouve l'ostéopathe par email et lance la migration pour lui
 */
export async function syncForOsteopathByEmail(email: string): Promise<MigrationResult> {
  console.log(`🔍 Recherche de l'ostéopathe: ${email}`);

  try {
    // Chercher l'utilisateur par email
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', email), limit(1));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      throw new Error(`Aucun utilisateur trouvé avec l'email ${email}`);
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const osteopathId = userDoc.id;

    console.log(`✅ Utilisateur trouvé: ${userData.firstName} ${userData.lastName} (${osteopathId})`);

    return await syncInitialConsultationFlag(osteopathId);

  } catch (error) {
    console.error('❌ Erreur lors de la recherche de l\'ostéopathe:', error);
    return {
      patientsProcessed: 0,
      consultationsUpdated: 0,
      consultationsMarkedAsInitial: 0,
      consultationsMarkedAsNonInitial: 0,
      errors: [(error as Error).message]
    };
  }
}
