# 🔍 Diagnostic du bug de synchronisation consultation/patient

## Problème observé

Lorsqu'un patient est créé avec toutes ses données (motif, antécédents, traitement, etc.):
1. ✅ Le **dossier patient** contient toutes les données
2. ❌ La **première consultation** est VIDE (tous les champs cliniques sont vides)
3. ❌ La **vue d'ensemble** est VIDE (affiche la dernière consultation qui est vide)

## Script de diagnostic

Ouvrez la console développeur (F12) et exécutez ce script pour un patient spécifique:

```javascript
async function diagnosticConsultation(patientId) {
  const { collection, query, where, getDocs, orderBy } = window.firebase.firestore;
  const db = window.firebase.db;

  console.log('='.repeat(60));
  console.log('🔍 DIAGNOSTIC CONSULTATION - Patient ID:', patientId);
  console.log('='.repeat(60));

  // 1. Charger le patient
  const patientDoc = await window.firebase.firestore.getDoc(
    window.firebase.firestore.doc(db, 'patients', patientId)
  );

  if (!patientDoc.exists()) {
    console.error('❌ Patient non trouvé!');
    return;
  }

  const patientData = patientDoc.data();
  console.log('\n📋 DONNÉES DU PATIENT (brutes - chiffrées):');
  console.log('- consultationReason:', patientData.consultationReason);
  console.log('- currentTreatment:', patientData.currentTreatment);
  console.log('- medicalAntecedents:', patientData.medicalAntecedents);
  console.log('- medicalHistory:', patientData.medicalHistory);
  console.log('- osteopathicTreatment:', patientData.osteopathicTreatment);

  // 2. Charger les consultations
  const consultationsRef = collection(db, 'consultations');
  const q = query(
    consultationsRef,
    where('patientId', '==', patientId),
    orderBy('date', 'asc')
  );

  const consultationsSnapshot = await getDocs(q);
  console.log('\n📅 CONSULTATIONS TROUVÉES:', consultationsSnapshot.docs.length);

  consultationsSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n--- Consultation #${index + 1} (${doc.id}) ---`);
    console.log('Date:', data.date?.toDate?.() || data.date);
    console.log('DONNÉES CLINIQUES (brutes - chiffrées):');
    console.log('- consultationReason:', data.consultationReason);
    console.log('- currentTreatment:', data.currentTreatment);
    console.log('- medicalAntecedents:', data.medicalAntecedents);
    console.log('- medicalHistory:', data.medicalHistory);
    console.log('- osteopathicTreatment:', data.osteopathicTreatment);
    console.log('- symptoms:', data.symptoms);
    console.log('- notes:', data.notes);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic terminé');
  console.log('='.repeat(60));
}

// Exposer la fonction globalement
window.diagnosticConsultation = diagnosticConsultation;

console.log('✅ Fonction diagnostic disponible!');
console.log('📝 Usage: diagnosticConsultation("PATIENT_ID")');
console.log('   Exemple: diagnosticConsultation("abc-123-def")');
```

## Comment l'utiliser

1. **Ouvrir l'application** dans le navigateur
2. **Se connecter** avec votre compte
3. **Aller sur un patient** problématique
4. **Copier son ID** depuis l'URL (ex: `/patients/abc-123-def` → ID = `abc-123-def`)
5. **Ouvrir la console** (F12)
6. **Coller le script** ci-dessus et appuyer sur Entrée
7. **Exécuter**: `diagnosticConsultation("abc-123-def")` (remplacer par le vrai ID)

## Ce que le script va révéler

Le script va afficher:
- ✅ Les données du patient (chiffrées)
- ✅ Toutes les consultations de ce patient
- ✅ Les données cliniques de chaque consultation (chiffrées)

### Si les données sont présentes mais chiffrées

**Problème**: Le déchiffrement échoue
**Solution**: Vérifier la clé de chiffrement et le processus de déchiffrement

### Si les données sont absentes (undefined/null)

**Problème**: Les données ne sont pas sauvegardées lors de la création
**Solution**: Vérifier le mapping des champs dans `ConsultationService.createConsultation`

### Si les données sont présentes et déchiffrées

**Problème**: L'affichage dans la vue d'ensemble ne fonctionne pas
**Solution**: Vérifier `getLatestConsultation()` et l'affichage conditionnel

---

## Actions correctives selon le diagnostic

### Cas 1: Données absentes dans Firebase
→ Corriger `NewPatientModal` et `ConsultationService.createConsultation`

### Cas 2: Données présentes mais le déchiffrement échoue
→ Corriger `HDSCompliance.decryptDataForDisplay`

### Cas 3: Données correctes mais pas affichées
→ Corriger `PatientDetail.tsx` (vue d'ensemble)

---

**Envoyez-moi le résultat du diagnostic pour que je puisse identifier la cause exacte!**
