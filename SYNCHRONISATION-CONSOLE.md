# Guide de Synchronisation Console

## 🚀 Utilisation du Script de Synchronisation Manuelle

Ce guide explique comment utiliser le script de synchronisation des consultations initiales directement depuis la console du navigateur.

---

## 📋 Prérequis

1. Être connecté à l'application OsteoApp
2. Avoir les droits administrateur ou être connecté en tant qu'ostéopathe
3. Avoir accès à la console développeur du navigateur

---

## 🔧 Étape 1: Ouvrir la Console Développeur

### Sur Chrome / Edge / Brave
- **Windows/Linux**: Appuyez sur `F12` ou `Ctrl + Shift + I`
- **Mac**: Appuyez sur `Cmd + Option + I`

### Sur Firefox
- **Windows/Linux**: Appuyez sur `F12` ou `Ctrl + Shift + K`
- **Mac**: Appuyez sur `Cmd + Option + K`

### Sur Safari
1. Activez d'abord le menu Développement :
   - Safari > Préférences > Avancées
   - Cochez "Afficher le menu Développement dans la barre des menus"
2. Ensuite : `Cmd + Option + C`

---

## 💻 Étape 2: Exécuter le Script

Une fois la console ouverte, vous devriez voir un message de confirmation :
```
🔧 Script de synchronisation manuelle disponible. Utilisez: runManualSync("email@example.com")
```

### Commande de Base

Pour synchroniser les consultations d'un ostéopathe spécifique :

```javascript
await runManualSync('julie.boddaert@hotmail.fr')
```

**Remplacez l'email par celui de l'ostéopathe concerné.**

---

## 📊 Comprendre la Sortie

Le script affiche une sortie détaillée dans la console :

```
🚀 DÉMARRAGE DE LA SYNCHRONISATION MANUELLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Utilisateur trouvé: Julie Boddaert (abc123...)

📊 5 patient(s) trouvé(s)

👤 Patient: Margaux Cresson
  📋 Consultation initiale: xyz789...
  ✅ 5 champs mis à jour: currentTreatment, consultationReason, medicalAntecedents, medicalHistory, osteopathicTreatment

[... autres patients ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RÉSUMÉ DE LA SYNCHRONISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Patients traités: 5
✅ Consultations mises à jour: 5
❌ Erreurs: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SYNCHRONISATION TERMINÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ⚠️ Ce que Fait le Script

Le script de synchronisation :

1. **Trouve l'ostéopathe** par son email
2. **Récupère tous ses patients** depuis la base de données
3. **Pour chaque patient** :
   - Trouve la consultation initiale (flag `isInitialConsultation` ou la plus ancienne)
   - **ÉCRASE** les champs cliniques de la consultation avec les données du dossier patient
   - Met à jour : motif, traitement, antécédents, historique médical, traitement ostéopathique, symptômes

4. **Affiche un rapport détaillé** avec le nombre de patients traités et de consultations mises à jour

---

## ✅ Champs Synchronisés

Les champs suivants de la **consultation initiale** sont écrasés avec les données du **dossier patient** :

- ✏️ **Traitement en cours** (`currentTreatment`)
- ✏️ **Motif de consultation** (`consultationReason`)
- ✏️ **Antécédents médicaux** (`medicalAntecedents`)
- ✏️ **Historique médical** (`medicalHistory`)
- ✏️ **Traitement ostéopathique** (`osteopathicTreatment`)
- ✏️ **Symptômes / Tags** (`symptoms`)

---

## 🛡️ Sécurité

- ⚠️ **ATTENTION** : Cette opération **ÉCRASE** les données existantes dans les consultations initiales
- ✅ Les données du **dossier patient** restent inchangées (elles sont la source de vérité)
- ✅ Seules les **consultations initiales** sont modifiées
- ✅ Les **autres consultations** ne sont pas affectées
- ✅ L'opération est **chiffrée** selon les normes HDS

---

## 🐛 En Cas de Problème

### Erreur: "Ostéopathe non trouvé"
- Vérifiez que l'email est correct
- Vérifiez que l'utilisateur existe dans la base de données

### Erreur: "Cannot read property..."
- Actualisez la page et réessayez
- Vérifiez que vous êtes bien connecté

### Erreur: "Permission denied"
- Vérifiez que vous avez les droits d'accès nécessaires
- Vérifiez votre connexion Firebase

### Aucune consultation mise à jour
- Vérifiez que les patients ont bien des consultations
- Vérifiez que les consultations ont le flag `isInitialConsultation` ou une date de création

---

## 📝 Exemples d'Utilisation

### Synchroniser Julie Boddaert
```javascript
await runManualSync('julie.boddaert@hotmail.fr')
```

### Synchroniser un autre ostéopathe
```javascript
await runManualSync('autre.osteo@exemple.fr')
```

---

## 🔄 Vérifier les Résultats

Après l'exécution du script :

1. Allez sur un **dossier patient**
2. Cliquez sur l'onglet **"Consultations (1)"**
3. Ouvrez la **consultation initiale** (la première consultation listée)
4. Vérifiez que les données cliniques correspondent au dossier patient
5. Vérifiez que tous les champs sont en **lecture seule** (🔒)

---

## 💡 Conseils

- ✅ **Faites un test** avec un seul patient d'abord pour vérifier le résultat
- ✅ **Lisez attentivement** la sortie de la console pour détecter les erreurs
- ✅ **Conservez un backup** si vous avez des doutes (demandez à un administrateur)
- ✅ **Documentez** les consultations mises à jour si nécessaire

---

## 📞 Support

En cas de problème persistant, contactez le support technique avec :
- La sortie complète de la console
- L'email de l'ostéopathe concerné
- La description du problème rencontré
