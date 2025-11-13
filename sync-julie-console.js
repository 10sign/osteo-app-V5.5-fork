/**
 * Script à exécuter dans la console du navigateur pour synchroniser
 * les premières consultations de Julie Boddaert
 *
 * INSTRUCTIONS:
 * 1. Ouvrir l'application dans le navigateur
 * 2. Se connecter en tant qu'admin
 * 3. Ouvrir la console développeur (F12)
 * 4. Copier-coller ce script complet
 * 5. Appuyer sur Entrée
 */

(async function syncJulieFirstConsultations() {
  console.log('🚀 Démarrage de la synchronisation pour Julie Boddaert...\n');

  try {
    // Importer les modules Firebase nécessaires
    const { collection, query, where, getDocs, doc, updateDoc, orderBy, limit, Timestamp } = window.firebase.firestore;
    const db = window.firebase.db;

    if (!db) {
      throw new Error('Firebase Firestore non initialisé. Assurez-vous d\'être sur l\'application.');
    }

    // 1. Trouver Julie Boddaert
    console.log('🔍 Recherche de Julie Boddaert...');
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', 'julie.boddaert@hotmail.fr'));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      throw new Error('❌ Utilisateur Julie Boddaert non trouvé');
    }

    const julieDoc = userSnapshot.docs[0];
    const julieId = julieDoc.id;
    const julieData = julieDoc.data();

    console.log('✅ Julie trouvée:', {
      id: julieId,
      email: julieData.email,
      nom: `${julieData.firstName} ${julieData.lastName}`
    });

    // 2. Récupérer tous ses patients
    console.log('\n📋 Récupération des patients...');
    const patientsRef = collection(db, 'patients');
    const patientsQuery = query(patientsRef, where('osteopathId', '==', julieId));
    const patientsSnapshot = await getDocs(patientsQuery);

    console.log(`✅ ${patientsSnapshot.size} patient(s) trouvé(s)\n`);

    let patientsProcessed = 0;
    let consultationsUpdated = 0;
    const errors = [];

    // 3. Pour chaque patient
    for (const patientDoc of patientsSnapshot.docs) {
      try {
        const patientData = patientDoc.data();
        const patientId = patientDoc.id;

        console.log(`\n👤 Patient: ${patientData.firstName} ${patientData.lastName} (${patientId})`);

        // 4. Trouver la première consultation
        const consultationsRef = collection(db, 'consultations');
        const firstConsultQuery = query(
          consultationsRef,
          where('osteopathId', '==', julieId),
          where('patientId', '==', patientId),
          orderBy('date', 'asc'),
          limit(1)
        );

        const consultSnapshot = await getDocs(firstConsultQuery);

        if (consultSnapshot.empty) {
          console.log('  ⚠️  Aucune consultation trouvée');
          patientsProcessed++;
          continue;
        }

        const consultDoc = consultSnapshot.docs[0];
        const consultData = consultDoc.data();
        const consultId = consultDoc.id;

        console.log(`  📅 Première consultation: ${consultId}`);

        // 5. Préparer les mises à jour
        const updates = {};
        let hasUpdates = false;

        // Vérifier chaque champ clinique
        if ((!consultData.currentTreatment || consultData.currentTreatment.trim() === '') && patientData.currentTreatment) {
          updates.currentTreatment = patientData.currentTreatment;
          hasUpdates = true;
          console.log('  ✅ Ajout du traitement effectué');
        }

        if ((!consultData.consultationReason || consultData.consultationReason.trim() === '') && patientData.consultationReason) {
          updates.consultationReason = patientData.consultationReason;
          hasUpdates = true;
          console.log('  ✅ Ajout du motif de consultation');
        }

        if ((!consultData.medicalAntecedents || consultData.medicalAntecedents.trim() === '') && patientData.medicalAntecedents) {
          updates.medicalAntecedents = patientData.medicalAntecedents;
          hasUpdates = true;
          console.log('  ✅ Ajout des antécédents médicaux');
        }

        if ((!consultData.medicalHistory || consultData.medicalHistory.trim() === '') && patientData.medicalHistory) {
          updates.medicalHistory = patientData.medicalHistory;
          hasUpdates = true;
          console.log('  ✅ Ajout de l\'historique médical');
        }

        if ((!consultData.osteopathicTreatment || consultData.osteopathicTreatment.trim() === '') && patientData.osteopathicTreatment) {
          updates.osteopathicTreatment = patientData.osteopathicTreatment;
          hasUpdates = true;
          console.log('  ✅ Ajout du traitement ostéopathique');
        }

        if ((!consultData.symptoms || consultData.symptoms.length === 0) && patientData.pathologies && patientData.pathologies.length > 0) {
          updates.symptoms = patientData.pathologies;
          hasUpdates = true;
          console.log('  ✅ Ajout des symptômes');
        }

        // 6. Appliquer les mises à jour si nécessaire
        if (hasUpdates) {
          updates.updatedAt = Timestamp.fromDate(new Date());

          const consultRef = doc(db, 'consultations', consultId);
          await updateDoc(consultRef, updates);

          consultationsUpdated++;
          console.log('  💾 Consultation mise à jour');
        } else {
          console.log('  ℹ️  Aucune mise à jour nécessaire');
        }

        patientsProcessed++;

      } catch (error) {
        console.error(`  ❌ Erreur pour le patient ${patientDoc.id}:`, error);
        errors.push(`Patient ${patientDoc.id}: ${error.message}`);
      }
    }

    // 7. Afficher le résumé
    console.log('\n' + '='.repeat(60));
    console.log('�� RÉSUMÉ DE LA SYNCHRONISATION');
    console.log('='.repeat(60));
    console.log(`✅ Patients traités: ${patientsProcessed}`);
    console.log(`📝 Consultations mises à jour: ${consultationsUpdated}`);
    console.log(`⚠️  Erreurs: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Liste des erreurs:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('='.repeat(60));
    console.log('\n✅ Synchronisation terminée!');

    return {
      success: true,
      patientsProcessed,
      consultationsUpdated,
      errors
    };

  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE:', error);
    return {
      success: false,
      error: error.message
    };
  }
})();
