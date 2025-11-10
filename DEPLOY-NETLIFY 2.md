# Déploiement sur Netlify (Osteo App)

Ce guide décrit la configuration Netlify, les variables d'environnement Vite/Firebase, et les points de vérification pour éviter les erreurs Firestore/Storage.

## Prérequis
- Repo connecté à Netlify (Project configuration → Build & deploy).
- Build Vite: `npm run build` produit `dist/`.
- Fichier de config Netlify présent et valide (voir `.netlify/netlify.toml` ou `netlify.toml` à la racine).

## Build & Publish
- Base: racine du repo (laisse vide si non monorepo).
- Publish directory: `dist`
- Build command: `npm ci && npm run build`

> Si le fichier `.netlify/netlify.toml` contient un chemin absolu (ex. `/Users/.../dist`), remplace par `dist` (relatif). Les chemins absolus locaux ne fonctionnent pas sur Netlify.

## Variables d'environnement (Vite + Firebase)
Déclare ces variables dans Netlify UI: Project configuration → Environment variables.
- `VITE_FIREBASE_API_KEY` (secret)
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID` (si utilisé)
- `VITE_FIREBASE_APP_ID` (si utilisé)
- `VITE_FIREBASE_MEASUREMENT_ID` (si Analytics)

Raisons:
- Vite expose les variables préfixées `VITE_` à `import.meta.env.*` côté client.
- Ne stocke PAS ces secrets dans le repo. Les variables en `netlify.toml` ne doivent contenir que des valeurs non sensibles. Réf: Netlify Docs sur variables d’environnement (Build / Framework prefixes).

## Firebase: domaines et règles
- Authentication → Authorized domains:
  - Ajoute `osteoappv3.netlify.app` et/ou `osteoappv4.netlify.app`, ainsi que le domaine du site actuel.
- Firestore Rules:
  - Vérifie que les règles autorisent les opérations attendues pour les comptes utilisés.
- Storage CORS:
  - Voir `DEPLOY-FIREBASE-RULES.md` déjà présent dans le repo pour la configuration et la mise à jour CORS.
  - Les origins Netlify doivent apparaître dans `cors.json` si tu utilises gsutil.

## Déploiement
1. Configure les variables dans Netlify UI.
2. Vérifie `Publish = dist` et `Build command = npm ci && npm run build`.
3. Re-déploie:
   - via UI (Trigger deploy)
   - ou via CLI (voir commandes).

## Vérifications post-déploiement
- Accès Firestore: aucune erreur réseau dans la console (Listen/Write).
- Accès Storage: pas d’erreur CORS sur upload/download.
- URL: le site s’ouvre sur `https://<site>.netlify.app` et utilise le bon projet Firebase (via `import.meta.env`).

## Dépannage (Firestore `net::ERR_ABORTED`)
- Variables manquantes: assure-toi que toutes les `VITE_FIREBASE_*` sont renseignées dans Netlify.
- Domaine non autorisé: ajoute le domaine Netlify à Firebase Auth → Authorized domains.
- Règles Firestore: ouvre la console Firebase → Rules et valide qu’elles autorisent la lecture/écriture pour l’utilisateur/role.
- Build sans variables: redeploie après création des variables (elles ne s’injectent pas rétroactivement).
- Conflit de `publish` ou base: vérifie que `publish = "dist"` (chemin relatif) est bien appliqué.

## Réfs utiles
- Netlify: Build environment variables — https://docs.netlify.com/build/configure-builds/environment-variables/
- Netlify: Framework prefixes (`VITE_`) — https://docs.netlify.com/integrations/frameworks/environment-variables/
- Netlify: File-based configuration (`netlify.toml`) — https://docs.netlify.com/build/configure-builds/file-based-configuration/
- Firebase: Authorized domains — https://firebase.google.com/docs/auth/web/start