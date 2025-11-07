# Architecture du système de gestion des dossiers patients et consultations

## Vue d'ensemble

Le système utilise Firebase Firestore avec une architecture de **snapshot indépendant par consultation**.

## Structure de données

### 1. Collection `patients`
Contient les **données actuelles** du dossier patient :

```
/patients/{patientId}
  ├── firstName: string
  ├── lastName: string
  ├── dateOfBirth: string
  ├── gender: string
  ├── phone: string
  ├── email: string
  ├── profession: string
  ├── address: object
  ├── insurance: object
  ├── medicalHistory: string
  ├── medicalAntecedents: string
  ├── currentTreatment: string
  ├── consultationReason: string
  ├── osteopathicTreatment: string
  ├── notes: string
  ├── tags: array
  ├── documents: array
  ├── treatmentHistory: array
  ├── nextAppointment: string
  ├── osteopathId: string
  ├── createdAt: string
  └── updatedAt: string
```

**Important** : Ces données évoluent dans le temps lorsque le dossier patient est modifié.

### 2. Collection `consultations`
Chaque consultation est **indépendante** et conserve un **snapshot complet** des données du patient au moment T :

```
/consultations/{consultationId}
  ├── patientId: string
  ├── patientName: string
  ├── osteopathId: string
  ├── date: Date
  ├── duration: number
  ├── price: number
  ├── status: string
  ├── reason: string
  ├── treatment: string
  ├── notes: string
  ├── examinations: array
  ├── prescriptions: array
  ├──
  ├── SNAPSHOT IDENTITÉ PATIENT (lecture seule)
  ├── patientFirstName: string
  ├── patientLastName: string
  ├── patientDateOfBirth: string
  ├── patientGender: string
  ├── patientPhone: string
  ├── patientEmail: string
  ├── patientProfession: string
  ├── patientAddress: string
  ├── patientInsurance: string
  ├── patientInsuranceNumber: string
  ├──
  ├── SNAPSHOT DONNÉES CLINIQUES (modifiables)
  ├── currentTreatment: string
  ├── consultationReason: string
  ├── medicalAntecedents: string
  ├── medicalHistory: string
  ├── osteopathicTreatment: string
  ├── symptoms: array
  ├──
  ├── createdAt: Date
  └── updatedAt: Date
```

## Flux de fonctionnement

### Création d'un patient

1. **Création du dossier patient** dans `/patients/{id}`
2. **Création automatique d'une première consultation** dans `/consultations/{id}` avec :
   - Snapshot complet des données du patient
   - Statut : `completed`
   - Motif : "Première consultation"
3. **Création automatique d'une facture** liée à cette consultation

### Ajout d'une nouvelle consultation

1. **Pré-remplissage** du formulaire avec les données actuelles du patient
2. **Modification possible** de tous les champs cliniques pour cette consultation
3. **Sauvegarde** d'un nouveau snapshot indépendant
4. **Non-modification** du dossier patient principal

### Modification d'une consultation existante

1. **Chargement** de la consultation avec son snapshot
2. **Modification** des champs modifiables
3. **Mise à jour** uniquement de cette consultation
4. **Non-modification** des autres consultations

### Modification du dossier patient

1. **Mise à jour** du document dans `/patients/{id}`
2. **Non-modification** des consultations existantes
3. Les nouvelles consultations utiliseront les nouvelles données

## Avantages de cette architecture

✅ **Historique fiable** : Chaque consultation conserve les données exactes du moment T

✅ **Indépendance** : Modifier une consultation ne modifie pas les autres ni le dossier patient

✅ **Traçabilité** : On peut voir l'évolution des données patient dans le temps

✅ **Intégrité** : Les données historiques ne sont jamais perdues

## Interface utilisateur

### Onglet "Vue d'ensemble"
- Affiche les **données actuelles** du dossier patient
- Statistiques et résumés
- Alertes et informations importantes

### Onglet "Consultations"
- Liste **toutes les consultations** par ordre chronologique décroissant
- Affiche le numéro de consultation (#1, #2, #3...)
- Chaque carte montre :
  - Motif et traitement principal
  - Données cliniques snapshot (motif détaillé, traitement en cours, antécédents, etc.)
  - Boutons : Voir / Modifier / Supprimer

### Onglet "Factures"
- Liste des factures liées aux consultations

### Onglet "Documents"
- Documents médicaux du patient

## Fichiers clés

- **Services** :
  - `src/services/patientService.ts` : Gestion du dossier patient
  - `src/services/consultationService.ts` : Gestion des consultations

- **Composants** :
  - `src/pages/patients/PatientDetail.tsx` : Vue détaillée du dossier patient
  - `src/components/modals/NewPatientModal.tsx` : Création d'un nouveau patient
  - `src/components/modals/NewConsultationModal.tsx` : Création d'une nouvelle consultation
  - `src/components/modals/EditConsultationModal.tsx` : Modification d'une consultation

## Règles importantes

⚠️ **NE JAMAIS modifier les consultations existantes lors de la modification du dossier patient**

⚠️ **NE JAMAIS modifier le dossier patient lors de la modification d'une consultation**

✅ **TOUJOURS créer un nouveau snapshot pour chaque nouvelle consultation**

✅ **TOUJOURS préserver l'historique des consultations**

## Conformité HDS (Hébergement de Données de Santé)

- Chiffrement des données sensibles
- Journalisation des accès et modifications
- Traçabilité complète
- Sécurité renforcée

## Résumé

Le système fonctionne comme un **système de versioning** :
- Le dossier patient = version actuelle (HEAD)
- Chaque consultation = snapshot figé d'une version à un instant T
- L'historique des consultations = timeline complète de l'évolution du patient
