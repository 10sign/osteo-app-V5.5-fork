# Corrections diagnostics et logs Firestore

Objectif: éliminer les erreurs de type "aborted Listen" et corriger les problèmes de linting, avec tests et mécanismes de prévention.

## Causes racines
- Listeners `onSnapshot` démarrés alors que la requête est refusée par les règles Firestore ou que la connectivité est instable, générant des logs réseau `net::ERR_ABORTED`.
- Imports inutilisés dans certains fichiers (`FileText` dans `InvoiceDetail`) provoquant des avertissements ESLint.

## Corrections apportées
- Ajout de `setupSafeSnapshot` (`src/utils/firestoreListener.ts`) qui:
  - exécute un `getDocs` préalable pour valider l’accès/connexion;
  - démarre `onSnapshot` uniquement si la requête initiale réussit;
  - fournit une fonction de `unsubscribe` sûre.
- Refactor des listeners temps réel dans:
  - `src/pages/invoices/Invoices.tsx`
  - `src/pages/consultations/Consultations.tsx`
  - `src/components/admin/UserManagement.tsx`
  - `src/components/admin/SystemLogs.tsx`
- Suppression d’imports inutilisés dans `src/pages/invoices/InvoiceDetail.tsx`.

## Tests unitaires
- `src/test/firestoreListener.test.ts` valide:
  - démarrage du listener et retour d’un `unsubscribe` quand `getDocs` réussit;
  - appel du callback `error` et absence de listener quand `getDocs` échoue.

## Prévention des régressions
- Utiliser `setupSafeSnapshot` pour tout nouveau listener Firestore.
- Conserver la logique d’`unsubscribe` dans les `useEffect` afin d’éviter les fuites de listeners.
- Continuer à forcer le long polling en dev (`src/firebase/config.ts`) pour des transports stables.

## Vérifications
- Lancer la suite de tests Vitest pour valider le comportement.
- Ouvrir l’application et vérifier qu’aucun log "aborted Listen" n’apparaît lors de la navigation dans Invoices/Consultations/Admin.