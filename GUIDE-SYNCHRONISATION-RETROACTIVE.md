# Guide de Synchronisation Rétroactive des Dossiers Patients

## 🎯 Objectif

Copier automatiquement les données cliniques des **anciens dossiers patients** vers leurs **consultations initiales** correspondantes.

## ✅ Ce qui a été corrigé

### 1. **Service de synchronisation** (`InitialConsultationSyncService`)
- ✅ Par défaut, copie **seulement les champs NON VIDES** du dossier patient
- ✅ Ne remplace **PAS** les données existantes avec des chaînes vides (mode standard)
- ✅ Nouveau: **Mode miroir exact** pour la correction rétroactive — copie aussi les champs vides afin d'uniformiser strictement avec le dossier patient
- ✅ Dans ce mode, une sauvegarde est créée avant mise à jour pour permettre un rollback
- ✅ Logs détaillés pour suivre chaque étape de la synchronisation

### 2. **Script manuel** (`manualSyncConsole.ts`)
- ✅ Même logique de copie sélective
- ✅ Déchiffrement correct des données patient avant copie
- ✅ Gestion complète des champs d'identité patient (adresse, assurance, etc.)

### 3. **Interface de synchronisation** (`/admin/sync-consultations`)
- ✅ Appelle maintenant le vrai service de synchronisation
- ✅ Affiche les résultats réels (nombre de patients traités, consultations mises à jour)
- ✅ Gestion des erreurs avec détails

## 📋 Champs synchronisés

### Champs cliniques (copie sélective - seulement si non vides)
- ✅ `currentTreatment` (Traitement en cours)
- ✅ `consultationReason` (Motif de consultation)
- ✅ `medicalAntecedents` (Antécédents médicaux)
- ✅ `medicalHistory` (Historique médical)
- ✅ `osteopathicTreatment` (Traitement ostéopathique)
- ✅ `symptoms` (Symptômes - depuis les tags patient)

### Champs d'identité patient (toujours copiés)
- ✅ Prénom, Nom, Date de naissance
- ✅ Genre, Email, Téléphone
- ✅ Profession, Adresse
- ✅ Assurance et numéro d'assurance

## 🚀 Comment utiliser la synchronisation

### Méthode 1 : Interface Admin (RECOMMANDÉE)

1. **Se connecter en tant qu'administrateur**
   - Aller sur `/admin/login`
   - Se connecter avec vos identifiants admin

2. **Ouvrir l'interface de synchronisation**
   - Sur le tableau de bord admin, cliquer sur le bouton **"Ouvrir l'interface de synchronisation"**
   - Ou aller directement sur `/admin/sync-consultations`

3. **Entrer l'email de l'ostéopathe**
   - Par défaut : `julie.boddaert@hotmail.fr`
   - Vous pouvez changer cet email si besoin

4. **Lancer la synchronisation**
   - Cliquer sur "Lancer la synchronisation"
   - Confirmer l'opération
   - Attendre la fin du traitement

5. **Vérifier les résultats**
   - Nombre de patients traités
   - Nombre de consultations mises à jour
   - Liste des erreurs éventuelles

### Méthode 2 : Console développeur (AVANCÉ)

1. Ouvrir la console développeur (F12)
2. Importer le script :
   ```javascript
   import { runManualSync } from './scripts/manualSyncConsole';
   ```
3. Exécuter :
   ```javascript
   await runManualSync('julie.boddaert@hotmail.fr');
   ```

## 🔍 Vérification après synchronisation

1. **Aller sur la page Patients**
   - `/patients`

2. **Ouvrir un dossier patient**
   - Cliquer sur un patient qui a des données cliniques remplies

3. **Vérifier la consultation initiale**
   - Regarder la première consultation (marquée "Consultation initiale")
   - Vérifier que les champs cliniques contiennent maintenant les mêmes données que le dossier patient

4. **Vérifier dans la console**
   - Ouvrir la console développeur (F12)
   - Vérifier les logs pour voir quels champs ont été copiés

## 🔐 Sécurité et chiffrement

- ✅ Toutes les données sont **déchiffrées** avant copie
- ✅ Toutes les données sont **rechiffrées** avant écriture
- ✅ Le chiffrement HDS est maintenu
- ✅ Aucune donnée sensible n'est exposée

## ⚠️ Règles importantes

1. **Copie unidirectionnelle** : Dossier Patient → Consultation Initiale (pas l'inverse)
2. **Copie sélective (mode standard)** : Seulement les champs NON VIDES sont copiés
3. **Mode miroir exact (rétroactif)** : Les champs vides sont aussi copiés pour assurer une égalité parfaite
4. **Rétroactif** : Ne traite que les anciens dossiers (les nouveaux fonctionnent déjà automatiquement)
5. **Idempotent** : Peut être exécuté plusieurs fois sans danger

## 📊 Exemple de résultat

```
🚀 DÉMARRAGE DE LA SYNCHRONISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Ostéopathe: Julie Boddaert (xyz123)
📊 25 patient(s) trouvé(s)

👤 Patient: Jean Dupont
  📋 Consultation initiale: abc456
  ✅ 5 champs mis à jour: currentTreatment, consultationReason, medicalAntecedents, medicalHistory, osteopathicTreatment

👤 Patient: Marie Martin
  📋 Consultation initiale: def789
  ✅ 3 champs mis à jour: consultationReason, medicalHistory, symptoms

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RÉSUMÉ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Patients traités: 25
✅ Consultations mises à jour: 18
❌ Erreurs: 0

✅ SYNCHRONISATION TERMINÉE
```

## 🆘 En cas de problème

### Aucun champ n'est copié
- Vérifier que les champs du dossier patient ne sont **pas vides**
- Vérifier que le patient a bien une **consultation initiale**
- Ouvrir la console développeur (F12) et regarder les logs

### Erreur "Utilisateur non trouvé"
- Vérifier que l'email de l'ostéopathe est correct
- Vérifier que l'utilisateur existe dans Firestore

### Erreur de chiffrement
- Vérifier que `VITE_ENCRYPTION_KEY` est correctement configurée
- Vérifier les permissions Firestore

### Les données ne s'affichent pas
- Rafraîchir la page (F5)
- Vider le cache du navigateur
- Vérifier dans Firestore que les données ont bien été écrites

## 📝 Notes techniques

- **Déchiffrement** : Les données patient sont déchiffrées avant copie
- **Chiffrement** : Les données sont rechiffrées avant écriture dans la consultation
- **Filtrage** : Les valeurs `undefined` et `null` sont supprimées avant écriture
- **Validation** : Double vérification pour éviter les erreurs Firestore

## 🎉 Résultat final

Après la synchronisation, chaque ancien dossier patient aura sa consultation initiale remplie avec les mêmes informations cliniques, créant ainsi un **double** parfait entre :

- **Dossier Patient** (source de vérité)
- **Consultation Initiale** (copie au moment T)

Les nouveaux patients continueront à fonctionner automatiquement comme avant.
### Vérifications automatiques et corrections

Sur la même page `/admin/sync-consultations`, une section "Vérifications automatiques" permet de:

- Détecter les écarts entre consultations initiales et dossiers patients
- Afficher un résumé des divergences
- Appliquer une correction automatique (mode miroir exact) si souhaité

Lors de la correction automatique, une sauvegarde de la consultation est stockée avant mise à jour dans `consultation_backups`.
### Rollback d'une correction rétroactive
- Chaque mise à jour rétroactive crée une entrée de sauvegarde dans `consultation_backups`
- Pour restaurer, rechercher l'entrée correspondante et réécrire les données `before` dans la consultation
