/**
 * Script d'exécution pour synchroniser les premières consultations de Julie Boddaert
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { syncFirstConsultationsWithPatients } from './syncFirstConsultationWithPatient';

async function runSyncForJulie() {
  console.log('🔍 Recherche de l\'utilisateur Julie Boddaert...');

  try {
    // Rechercher l'utilisateur par email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', 'julie.boddaert@hotmail.fr'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error('❌ Utilisateur Julie Boddaert non trouvé');
      return;
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log('✅ Utilisateur trouvé:', {
      id: userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName
    });

    console.log('\n🚀 Lancement de la synchronisation des premières consultations...\n');

    // Exécuter la synchronisation pour cet utilisateur
    const result = await syncFirstConsultationsWithPatients(userId);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ FINAL DE LA SYNCHRONISATION');
    console.log('='.repeat(60));
    console.log(`✅ Succès: ${result.success ? 'OUI' : 'NON'}`);
    console.log(`👥 Patients traités: ${result.patientsProcessed}`);
    console.log(`📝 Consultations mises à jour: ${result.consultationsUpdated}`);
    console.log(`⚠️  Erreurs: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Liste des erreurs:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('='.repeat(60) + '\n');

    return result;

  } catch (error) {
    console.error('❌ Erreur critique:', error);
    throw error;
  }
}

// Exécuter le script
runSyncForJulie()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script échoué:', error);
    process.exit(1);
  });
