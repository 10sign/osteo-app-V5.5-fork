# Guide de Débogage - Upload de Documents Médicaux

## 🎯 Objectif
Ce guide vous aide à diagnostiquer et résoudre les problèmes d'upload de documents dans la section "Documents médicaux".

## 🔍 Diagnostic Rapide

### Étape 1: Ouvrir la Console du Navigateur
1. Appuyez sur **F12** (ou clic droit > Inspecter)
2. Allez dans l'onglet **Console**
3. Essayez d'uploader un document
4. Observez les messages dans la console

### Étape 2: Vérifier les Logs
Cherchez ces indicateurs dans la console:

#### ✅ Messages de succès
- `✅ Firebase Storage configuré`
- `✅ Utilisateur authentifié`
- `✅ Configuration Storage validée`
- `🎉 Upload complété avec succès!`

#### ❌ Messages d'erreur
- `❌ Utilisateur non authentifié`
- `❌ Firebase Storage non configuré`
- `❌ Problème de configuration Storage`
- `💥 ERREUR UPLOAD`

### Étape 3: Utiliser les Outils de Diagnostic

Dans la console du navigateur, tapez:
```javascript
// Vérifier la configuration Storage
checkStorageConfig()

// Afficher le guide complet
printUploadDiagnostic()
```

## 🚨 Problèmes Courants et Solutions

### 1. "Utilisateur non authentifié"
**Cause:** Vous n'êtes pas connecté ou votre session a expiré

**Solution:**
- Déconnectez-vous et reconnectez-vous
- Vérifiez que vous voyez votre nom en haut à droite
- Actualisez la page (F5)

### 2. "Firebase Storage non configuré"
**Cause:** Variable d'environnement manquante

**Solution:**
1. Vérifiez que le fichier `.env` contient:
   ```
VITE_FIREBASE_STORAGE_BUCKET=ostheo-app.firebasestorage.app
   ```
2. Redémarrez le serveur de développement:
   ```bash
   npm run dev
   ```

### 3. "Permissions insuffisantes"
**Cause:** Les règles Firebase Storage bloquent l'upload

**Solution:**
1. Vérifiez que vous êtes connecté avec le bon compte
2. Contactez l'administrateur si le problème persiste

### 4. "Connexion interrompue" ou "ERR_ABORTED"
**Cause:** Bloqueur de publicité ou extension navigateur

**Solution:**
1. **Désactivez temporairement** les extensions:
   - AdBlock
   - uBlock Origin
   - Privacy Badger
   - Autres bloqueurs
2. Réessayez l'upload
3. Si ça fonctionne, ajoutez le site en liste blanche

### 5. "Type de fichier non autorisé"
**Cause:** Le fichier n'est pas au bon format

**Solution:**
- ✅ Formats acceptés: **PDF, JPG, PNG**
- ❌ Formats refusés: DOC, DOCX, TXT, etc.
- 📏 Taille maximum: **10MB**

### 6. Upload qui tourne indéfiniment
**Cause:** Problème réseau ou timeout

**Solution:**
1. Vérifiez votre connexion Internet
2. Essayez avec un fichier plus petit
3. Actualisez la page et réessayez
4. Le système fait 2 tentatives automatiques avec retry

## 🔧 Vérifications Techniques

### Vérifier l'État de Firebase Storage
```javascript
// Dans la console du navigateur
checkStorageConfig()
```

Résultat attendu:
```
✅ Storage initialisé
✅ Bucket configuré: ostheo-app.firebasestorage.app
✅ Utilisateur authentifié: [votre-uid]
🎉 Configuration Storage valide
```

### Logs Détaillés d'Upload
Lorsque vous uploadez un fichier, vous devriez voir:
```
🚀 UPLOAD DOCUMENT - Début
📋 Informations du fichier: {...}
✅ Utilisateur authentifié: [uid]
✅ Firebase Storage configuré
📋 Étape 1: Validation du fichier
✅ Fichier validé avec succès
🗜️ Étape 2: Compression si nécessaire
📝 Étape 3: Génération du nom de fichier
☁️ Étape 4: Création de la référence Storage
📤 Début de l'upload vers: [chemin]
🔄 Tentative d'upload 1/2
➡️ Upload direct via uploadBytes
✅ Upload direct réussi
✅ Upload terminé avec succès!
🔗 URL générée avec succès
🎉 Upload complété avec succès!
```

## 🛠️ Améliorations Implémentées

### 1. Système de Retry Automatique
- **2 tentatives** automatiques en cas d'échec
- Délai de 1 seconde entre les tentatives
- Alternance entre upload direct et resumable

### 2. Logs Détaillés
- Chaque étape de l'upload est logguée
- Codes d'erreur explicites
- Contexte complet en cas d'échec

### 3. Validation Préalable
- Vérification du type de fichier
- Vérification de la taille
- Vérification de l'authentification
- Vérification de la configuration Storage

### 4. Gestion des Chemins Temporaires
- ID temporaire unique pour les consultations non créées
- Format: `temp_[timestamp]_[random]`
- Évite les conflits de chemins

### 5. Messages d'Erreur Clairs
- Messages utilisateur compréhensibles
- Solutions suggérées dans l'interface
- Guide de diagnostic accessible

## 📞 Support

Si le problème persiste après avoir suivi ce guide:

1. **Copiez les logs de la console** (Console > Clic droit > "Save as...")
2. **Prenez une capture d'écran** de l'erreur
3. **Notez**:
   - Type de fichier essayé
   - Taille du fichier
   - Navigateur utilisé
   - Extensions installées
4. **Contactez le support** avec ces informations

## 🔐 Sécurité

- Tous les fichiers sont chiffrés en transit (HTTPS)
- Les règles Firebase Storage vérifient l'authentification
- Seuls les utilisateurs autorisés peuvent uploader
- Conformité RGPD et HDS

## 📝 Notes Techniques

### Chemins d'Upload
- **Consultations:** `users/{userId}/consultations/{consultationId}/documents`
- **Patients:** `users/{userId}/patients/{patientId}/documents/{category}`

### Types MIME Acceptés
- `application/pdf`
- `image/jpeg`
- `image/png`

### Compression Automatique
- Images > 1MB sont compressées automatiquement
- Résolution max: 2048px
- Qualité: 80%
- Les PDF ne sont pas compressés
