# Système de Synchronisation Bidirectionnelle

## Vue d'ensemble

Le système de synchronisation bidirectionnelle assure la cohérence des données cliniques entre le dossier patient et sa consultation initiale. Ce mécanisme garantit que les informations médicales essentielles sont toujours à jour dans les deux entités.

## Architecture

### Composants principaux

1. **BidirectionalSyncService** (`src/services/bidirectionalSyncService.ts`)
   - Service principal gérant la synchronisation bidirectionnelle
   - Détecte automatiquement la direction de synchronisation (Patient → Consultation ou Consultation → Patient)
   - Gère les logs d'audit et les erreurs

2. **InitialConsultationSyncService** (`src/services/initialConsultationSyncService.ts`)
   - Service spécialisé pour la synchronisation Patient → Consultation initiale
   - Utilisé lors de la modification du dossier patient
   - Synchronisation automatique et transparente

3. **FieldHistory** (`src/components/patient/FieldHistory.tsx`)
   - Composant d'affichage de l'historique des champs cliniques
   - Affiche la valeur actuelle avec un chevron déroulant
   - Permet de visualiser l'évolution chronologique des données

4. **buildFieldHistory** (`src/utils/fieldHistoryBuilder.ts`)
   - Fonction utilitaire construisant l'historique complet d'un champ
   - Agrège les données du patient et de toutes les consultations
   - Détecte les valeurs identiques pour optimiser l'affichage

## Schéma de synchronisation

```
┌─────────────────────────────────────────────────────────────┐
│                    DOSSIER PATIENT                          │
│  - Motif de consultation                                    │
│  - Traitement effectué                                      │
│  - Antécédents médicaux                                     │
│  - Traitement ostéopathique                                 │
│  - Historique médical général                               │
│  - Notes complémentaires                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Synchronisation UNIDIRECTIONNELLE
                 │ (Patient → Consultation initiale)
                 │ AUTOMATIQUE lors de l'édition patient
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              CONSULTATION INITIALE (isFirst=true)           │
│  - consultationReason                                       │
│  - currentTreatment                                         │
│  - medicalAntecedents                                       │
│  - osteopathicTreatment                                     │
│  - medicalHistory                                           │
│  - notes                                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Synchronisation BIDIRECTIONNELLE
                 │ (Consultation ⟷ Patient)
                 │ AVEC CONFIRMATION lors de l'édition consultation
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOSSIER PATIENT                          │
│  (Mise à jour uniquement si l'utilisateur confirme)         │
└─────────────────────────────────────────────────────────────┘
```

## Champs synchronisés

| Champ Patient | Champ Consultation | Sens de synchronisation |
|---------------|-------------------|------------------------|
| `consultationReason` | `consultationReason` | ⟷ Bidirectionnel |
| `currentTreatment` | `currentTreatment` | ⟷ Bidirectionnel |
| `medicalAntecedents` | `medicalAntecedents` | ⟷ Bidirectionnel |
| `osteopathicTreatment` | `osteopathicTreatment` | ⟷ Bidirectionnel |
| `medicalHistory` | `medicalHistory` | ⟷ Bidirectionnel |
| `notes` | `notes` | ⟷ Bidirectionnel |

## Workflows

### 1. Création d'un nouveau patient

```
Utilisateur crée un patient avec données cliniques
    ↓
Le dossier patient est créé dans Firestore
    ↓
Une consultation initiale (isFirst=true) est créée automatiquement
    ↓
Les champs cliniques sont copiés du patient vers la consultation
    ↓
✅ Synchronisation terminée
```

**Code concerné:**
- `src/components/modals/NewPatientModal.tsx` (lignes 350-380)
- `src/services/patientService.ts`

### 2. Modification du dossier patient

```
Utilisateur modifie un champ clinique dans EditPatientModal
    ↓
Affichage du message informatif (synchronisation automatique)
    ↓
Le dossier patient est mis à jour
    ↓
InitialConsultationSyncService.syncInitialConsultationForPatient() est appelé
    ↓
Les champs modifiés sont détectés et copiés vers la consultation initiale
    ↓
Log d'audit créé
    ↓
✅ Synchronisation terminée automatiquement
```

**Code concerné:**
- `src/components/modals/EditPatientModal.tsx` (lignes 468-505)
- `src/services/initialConsultationSyncService.ts`

### 3. Modification de la consultation initiale

```
Utilisateur modifie un champ clinique dans EditConsultationModal (isFirst=true)
    ↓
Détection des changements sur les champs synchronisés
    ↓
Modal de confirmation affichée:
  "Cette consultation est marquée comme consultation initiale.
   Voulez-vous mettre à jour le dossier patient avec ces modifications ?"
    ↓
┌─────────────────────┬─────────────────────┐
│ Utilisateur REFUSE  │ Utilisateur CONFIRME│
├─────────────────────┼─────────────────────┤
│ Consultation mise   │ Consultation mise   │
│ à jour uniquement   │ à jour              │
│                     │        +            │
│                     │ Dossier patient mis │
│                     │ à jour              │
│                     │        +            │
│                     │ Log d'audit créé    │
└─────────────────────┴─────────────────────┘
```

**Code concerné:**
- `src/components/modals/EditConsultationModal.tsx` (lignes 350-450)
- `src/services/bidirectionalSyncService.ts`

### 4. Création d'une consultation suivante (isFirst=false)

```
Utilisateur crée une 2e, 3e, ... consultation
    ↓
La consultation est créée normalement
    ↓
AUCUNE synchronisation avec le dossier patient
    ↓
Les données restent indépendantes
    ↓
✅ L'historique des champs affiche toutes les valeurs chronologiquement
```

**Logique:**
- Les consultations suivantes ne modifient JAMAIS le dossier patient
- Le dossier patient conserve les données de la consultation initiale
- L'historique permet de voir l'évolution des données

## Affichage de l'historique

Le composant `FieldHistory` permet de visualiser l'évolution d'un champ clinique :

### Comportement

1. **Valeur actuelle affichée** : Toujours la dernière consultation
2. **Chevron replié par défaut** : Économise l'espace à l'écran
3. **Chevron caché si une seule consultation** : Pas d'historique à afficher
4. **Au clic sur le chevron** : Affiche l'historique complet du plus récent au plus ancien

### Code couleur

- **Dernière valeur** : Fond bleu clair, texte en gras
- **Valeurs identiques** : Grisées avec opacité réduite + mention "Identique à la valeur précédente"
- **Valeurs différentes** : Fond blanc, texte normal

### Format

```
[Dernière consultation - Fond bleu]
Consultation n°3 - 15/10/2024
"Lombalgie aiguë suite à un effort"

[Consultation précédente - Fond blanc]
Consultation n°2 - 22/09/2024
"Suivi lombalgie"

[Consultation initiale - Fond blanc]
Consultation n°1 - 01/09/2024
"Première consultation pour lombalgie"

[Dossier patient - Fond blanc]
Dossier patient - 01/09/2024
"Lombalgie chronique depuis 2 ans"
```

## Points d'attention

### 1. Sécurité et chiffrement

- ✅ Toutes les données sensibles sont chiffrées avec `HDSCompliance`
- ✅ Les données sont déchiffrées avant synchronisation
- ✅ Les données sont re-chiffrées avant enregistrement
- ✅ Les logs d'audit sont chiffrés

### 2. Détection de la consultation initiale

La consultation initiale est identifiée par :
- `isFirst === true` (flag explicite)
- OU ordre chronologique : première consultation créée pour un patient

**Code de détection :**
```typescript
const isFirstConsultation = consultation.isFirst === true ||
  (consultations.length > 0 && consultation.id === consultations[0].id);
```

### 3. Gestion des erreurs

- La synchronisation Patient → Consultation est **non bloquante**
- Si la synchronisation échoue, le patient est quand même mis à jour
- Une erreur est loggée dans la console
- L'utilisateur reçoit un message de succès pour l'opération principale

### 4. Performance

- La synchronisation est optimisée (uniquement les champs modifiés)
- L'historique est construit à la demande (uniquement au clic sur le chevron)
- Les requêtes Firestore sont minimales (1 requête de lecture + 1 d'écriture max)

### 5. Logs d'audit

Chaque synchronisation génère un log d'audit contenant :
- Type d'action : `patient_to_consultation_sync` ou `consultation_to_patient_sync`
- Champs modifiés
- Valeurs avant/après (chiffrées)
- Timestamp
- ID utilisateur
- ID patient et consultation

## Tests recommandés

### Test 1 : Création patient → Consultation initiale

1. Créer un nouveau patient avec des données cliniques
2. ✅ Vérifier qu'une consultation initiale est créée
3. ✅ Vérifier que les champs sont identiques

### Test 2 : Modification patient → Consultation initiale

1. Modifier un champ clinique dans le dossier patient
2. ✅ Vérifier que le message informatif s'affiche
3. ✅ Vérifier que la consultation initiale est mise à jour automatiquement
4. ✅ Vérifier les logs d'audit

### Test 3 : Modification consultation initiale → Patient (avec confirmation)

1. Modifier un champ clinique dans la consultation initiale
2. ✅ Vérifier que la modale de confirmation s'affiche
3. Confirmer la synchronisation
4. ✅ Vérifier que le dossier patient est mis à jour
5. ✅ Vérifier les logs d'audit

### Test 4 : Modification consultation initiale → Patient (sans confirmation)

1. Modifier un champ clinique dans la consultation initiale
2. ✅ Vérifier que la modale de confirmation s'affiche
3. Refuser la synchronisation
4. ✅ Vérifier que seule la consultation est mise à jour
5. ✅ Vérifier que le dossier patient reste inchangé

### Test 5 : Consultation suivante (pas de synchronisation)

1. Créer une 2e consultation
2. Modifier des champs cliniques
3. ✅ Vérifier qu'aucune synchronisation n'a lieu
4. ✅ Vérifier que le dossier patient reste inchangé

### Test 6 : Affichage de l'historique

1. Créer 3-4 consultations avec des valeurs différentes
2. Aller dans la vue d'ensemble du patient
3. ✅ Vérifier que les chevrons apparaissent
4. Cliquer sur un chevron
5. ✅ Vérifier l'ordre chronologique (du plus récent au plus ancien)
6. ✅ Vérifier les dates formatées en français
7. ✅ Vérifier le code couleur (dernière en gras, identiques grisées)

### Test 7 : Performance

1. Créer un patient avec 20 consultations
2. ✅ Vérifier que la vue d'ensemble se charge rapidement (< 2s)
3. Cliquer sur un chevron
4. ✅ Vérifier que l'historique s'affiche instantanément (< 500ms)

## Maintenance et évolution

### Ajouter un nouveau champ synchronisé

1. Ajouter le champ dans `Patient` et `Consultation` types
2. Ajouter le mapping dans `CLINICAL_FIELDS_MAPPING` (`bidirectionalSyncService.ts`)
3. Ajouter le champ dans `ClinicalField` type (`fieldHistoryBuilder.ts`)
4. Ajouter le case dans `extractFieldValue()` (`fieldHistoryBuilder.ts`)
5. Ajouter le champ dans `EditPatientModal` avec indicateur visuel
6. Ajouter le champ dans `EditConsultationModal`
7. Ajouter le champ dans `PatientDetail` avec `<FieldHistory>`

### Désactiver la synchronisation pour un champ

1. Retirer le champ de `CLINICAL_FIELDS_MAPPING`
2. Le champ continuera d'exister mais ne sera plus synchronisé

### Changer la direction de synchronisation

La direction est déterminée automatiquement :
- **Patient → Consultation** : Toujours automatique dans `EditPatientModal`
- **Consultation → Patient** : Toujours avec confirmation dans `EditConsultationModal`

Pour changer ce comportement, modifier :
- `EditPatientModal.tsx` (ligne 486) : Enlever l'appel à `syncInitialConsultationForPatient`
- `EditConsultationModal.tsx` (ligne 380) : Enlever la logique de confirmation

## FAQ

**Q: Que se passe-t-il si je supprime la consultation initiale ?**
R: La suppression est bloquée par le système. Vous devez d'abord marquer une autre consultation comme initiale.

**Q: Puis-je avoir plusieurs consultations initiales ?**
R: Non, un seul `isFirst=true` par patient. Le système détecte et corrige automatiquement les doublons.

**Q: L'historique affiche-t-il les données chiffrées ?**
R: Non, les données sont automatiquement déchiffrées avant affichage.

**Q: Puis-je voir qui a modifié un champ ?**
R: Oui, via les logs d'audit dans la console admin (fonctionnalité à développer).

**Q: La synchronisation fonctionne-t-elle hors ligne ?**
R: Non, une connexion internet est requise. Firestore met en queue les modifications et les synchronise à la reconnexion.

## Support

Pour toute question ou problème :
1. Vérifier les logs de la console navigateur
2. Vérifier les logs d'audit dans Firestore (`auditLogs` collection)
3. Contacter l'équipe de développement

---

**Version:** 1.0.0
**Dernière mise à jour:** 22 octobre 2024
**Auteur:** Équipe de développement OsteoApp
