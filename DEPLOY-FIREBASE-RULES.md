# 🚀 Déploiement des règles Firebase Storage

## ✅ Corrections apportées

1. **Règles Firebase Storage optimisées** - Simplifiées et corrigées
2. **Warnings de placeholder corrigés** - Plus de doublons dans Settings.tsx
3. **Script de déploiement créé** - `deploy-storage-rules.sh`

## 🔧 Déploiement des règles

### Option 1 : Déploiement automatique (Recommandé)
```bash
# Exécuter le script de déploiement
./deploy-storage-rules.sh
```

### Option 2 : Déploiement manuel via console Firebase
1. Allez sur : https://console.firebase.google.com/project/ostheo-app/storage/rules
2. Copiez le contenu du fichier `storage-rules-simple.rules`
3. Collez-le dans l'éditeur de règles
4. Cliquez sur "Publier"

### Option 3 : Déploiement via Firebase CLI
```bash
# Se connecter à Firebase
firebase login

# Déployer les règles
firebase deploy --only storage
```

## 🧪 Test de l'upload

1. **Accédez à l'application** : http://localhost:5174
2. **Connectez-vous** avec vos identifiants
3. **Testez l'upload** dans :
   - Création de consultation
   - Modification de consultation
   - Création de dossier patient
   - Modification de dossier patient

## 📋 Règles appliquées

- ✅ **Authentification** : Seuls les utilisateurs connectés peuvent uploader
- ✅ **Propriété** : Seuls le propriétaire, admin et Julie peuvent accéder
- ✅ **Types autorisés** : Images, PDF, DOC, DOCX, TXT
- ✅ **Taille max** : 10MB
- ✅ **Nom de fichier** : Validation des caractères interdits

## 🚨 En cas de problème

Si l'upload ne fonctionne toujours pas :
1. Vérifiez que les règles sont bien déployées
2. Vérifiez l'authentification dans la console du navigateur
3. Vérifiez les logs Firebase dans la console
