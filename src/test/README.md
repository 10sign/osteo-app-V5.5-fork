# Tests Automatisés - Synchronisation Patient-Consultation

## 🎯 Objectif

Ces tests valident la correction du bug de synchronisation entre dossier patient et consultation, garantissant que :

1. **Nouveau patient** → Première consultation contient les vraies valeurs textuelles
2. **Consultation manuelle** → Champs préremplis avec les données du patient
3. **Migration rétroactive** → Anciennes consultations corrigées sans écraser les modifications utilisateur
4. **Aucune régression** → Fonctionnalités existantes préservées

## 📁 Structure des Tests

```
src/test/
├── setup.ts                          # Configuration globale des tests
├── factories/                         # Factories pour créer des données de test
│   ├── patientFactory.ts             # Factory pour les patients
│   └── consultationFactory.ts        # Factory pour les consultations
├── unit/                             # Tests unitaires
│   ├── encryption.test.ts            # Tests du module de chiffrement
│   └── hdsCompliance.test.ts        # Tests de la conformité HDS
├── integration/                      # Tests d'intégration
│   ├── consultationCreation.test.ts # Tests de création de consultation
│   └── consultationMigration.test.ts # Tests de migration
├── e2e/                             # Tests end-to-end
│   └── patientConsultationSync.test.tsx # Tests des composants React
└── README.md                        # Cette documentation
```

## 🧪 Types de Tests

### Tests Unitaires
- **Encryption Utils** : Validation du déchiffrement des UUIDs chiffrés
- **HDSCompliance** : Vérification du traitement des données sensibles

### Tests d'Intégration
- **Consultation Creation** : Création automatique et manuelle avec préremplissage
- **Consultation Migration** : Migration rétroactive des données existantes

### Tests End-to-End
- **Patient-Consultation Sync** : Interface utilisateur et flux complets

## 🚀 Exécution des Tests

### Commandes Disponibles

```bash
# Exécuter tous les tests
npm run test

# Interface graphique des tests
npm run test:ui

# Exécution unique (CI)
npm run test:run

# Avec couverture de code
npm run test:coverage

# Mode watch (développement)
npm run test:watch
```

### Tests Spécifiques

```bash
# Tests unitaires seulement
npm run test -- src/test/unit/

# Tests d'intégration seulement
npm run test -- src/test/integration/

# Tests end-to-end seulement
npm run test -- src/test/e2e/

# Test spécifique
npm run test -- src/test/unit/encryption.test.ts
```

## 📊 Couverture des Tests

### Scénarios Couverts

#### ✅ Création Automatique de Consultation
- [x] Nouveau patient → Consultation avec vraies valeurs textuelles
- [x] Aucun UUID ou référence technique dans les champs
- [x] Snapshot complet des données patient

#### ✅ Création Manuelle de Consultation
- [x] Préremplissage des champs cliniques
- [x] Données patient synchronisées
- [x] Possibilité de modification par l'utilisateur

#### ✅ Migration Rétroactive
- [x] Détection des UUIDs chiffrés
- [x] Remplacement par les vraies valeurs
- [x] Préservation des modifications utilisateur
- [x] Gestion des erreurs

#### ✅ Déchiffrement des Données
- [x] UUIDs chiffrés → Texte lisible
- [x] Gestion des erreurs de déchiffrement
- [x] Données non chiffrées préservées

### Données Testées

- **Motif de consultation** : `consultationReason`
- **Antécédents médicaux** : `medicalAntecedents`
- **Traitement effectué** : `osteopathicTreatment`
- **Notes complémentaires** : `notes`
- **Historique médical général** : `medicalHistory`
- **Symptômes** : `symptoms`

## 🔧 Configuration

### Variables d'Environnement

```bash
# Mode test
NODE_ENV=test

# Firebase (mocké dans les tests)
VITE_FIREBASE_API_KEY=test-key
VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=test-project
```

### Mocks et Fixtures

- **Firebase** : Mocké pour éviter les appels réseau
- **HDSCompliance** : Mocké pour tester la logique métier
- **Services** : Mockés pour isoler les tests
- **Factories** : Données réalistes pour les tests

## 🐛 Dépannage

### Problèmes Courants

1. **Tests qui échouent** : Vérifier les mocks et la configuration
2. **Données non trouvées** : Vérifier les factories et les fixtures
3. **Erreurs Firebase** : Vérifier que les mocks sont correctement configurés

### Debug

```bash
# Mode debug avec logs
npm run test -- --reporter=verbose

# Tests spécifiques avec debug
npm run test -- src/test/unit/encryption.test.ts --reporter=verbose
```

## 📈 Métriques de Qualité

### Objectifs de Couverture

- **Lignes de code** : > 80%
- **Branches** : > 75%
- **Fonctions** : > 85%
- **Statements** : > 80%

### Tests par Scénario

- **Création automatique** : 5 tests
- **Création manuelle** : 4 tests
- **Migration rétroactive** : 8 tests
- **Déchiffrement** : 6 tests
- **Interface utilisateur** : 3 tests

**Total : 26 tests automatisés**

## 🔄 Maintenance

### Ajout de Nouveaux Tests

1. Créer le fichier de test dans le bon répertoire
2. Utiliser les factories existantes
3. Mocker les dépendances externes
4. Documenter les cas de test

### Mise à Jour des Tests

1. Vérifier que les factories sont à jour
2. Adapter les mocks si nécessaire
3. Exécuter tous les tests avant commit
4. Mettre à jour la documentation

## 📝 Notes Importantes

- Les tests utilisent des données mockées pour éviter les appels réseau
- Les factories créent des données réalistes mais fictives
- Les mocks préservent le comportement attendu des services
- La couverture de code est surveillée pour maintenir la qualité
