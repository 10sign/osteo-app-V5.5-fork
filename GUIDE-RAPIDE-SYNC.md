# 🚀 Guide Rapide - Synchronisation des Consultations Initiales

## ⚡ Méthode Simple (Console Navigateur)

### Étape 1: Ouvrez la Console
- **Windows/Linux**: `F12`
- **Mac**: `Cmd + Option + I`

### Étape 2: Vérifiez le Message
Vous devriez voir :
```
🔧 Script de synchronisation manuelle disponible. Utilisez: runManualSync("email@example.com")
```

### Étape 3: Exécutez
```javascript
await runManualSync('julie.boddaert@hotmail.fr')
```

### ✅ C'est tout !

---

## 📊 Le Script va :

1. ✅ Trouver l'ostéopathe par email
2. ✅ Récupérer tous ses patients
3. ✅ Pour chaque patient :
   - Trouver la consultation initiale
   - **ÉCRASER** ses champs cliniques avec les données du dossier patient
4. ✅ Afficher un rapport détaillé

---

## 🔧 Champs Synchronisés

Les données suivantes de la **consultation initiale** seront écrasées :

- ✏️ Traitement en cours
- ✏️ Motif de consultation
- ✏️ Antécédents médicaux
- ✏️ Historique médical
- ✏️ Traitement ostéopathique
- ✏️ Symptômes

---

## ⚠️ IMPORTANT

- Cette action **ÉCRASE** les données existantes
- Les données du **dossier patient** restent la source de vérité
- Seules les **consultations initiales** sont affectées
- Les **autres consultations** ne sont pas touchées

---

## 🔍 Vérifier les Résultats

1. Allez sur un dossier patient
2. Ouvrez la consultation initiale
3. Vérifiez que les champs correspondent au dossier patient
4. Vérifiez que tout est en **lecture seule** (🔒)

---

## 🐛 Problèmes ?

### "Ostéopathe non trouvé"
→ Vérifiez l'email

### "runManualSync is not defined"
→ Actualisez la page

### "Permission denied"
→ Vérifiez votre connexion

---

## 📞 Besoin d'aide ?

Consultez le fichier `SYNCHRONISATION-CONSOLE.md` pour un guide détaillé.
