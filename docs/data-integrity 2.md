# Mécanisme d’intégrité des données (Patients et Consultations)

Objectif: garantir que 100% des données saisies sont validées, stockées correctement, et affichées à jour dans les vues Patient, Consultation et Consultation initiale.

## Validation avant sauvegarde
- Consultations: `validateConsultationData` (création) et `validateConsultationUpdate` (mise à jour) vérifient champs requis, types, plages, et structures.
- Patients: validation minimale des champs essentiels à la création; validation ciblée des champs mis à jour (email, téléphone, date de naissance).
- En cas d’erreurs, l’enregistrement est bloqué et un log d’audit est écrit (`validate_before_save`).

## Journalisation des échecs
- Tous les échecs de validation et de synchronisation sont journalisés via `AuditLogger` avec `AuditEventType.DATA_MODIFICATION`.
- Les logs incluent `resource`, `action`, `sensitivity`, `status` et `details` (erreurs).

## Synchronisation bidirectionnelle
- Lors de la mise à jour d’une consultation initiale, une synchronisation non bloquante vers le dossier patient est déclenchée via `BidirectionalSyncService.syncPatientFromInitialConsultation`.
- Cette synchronisation respecte HDS (données déchiffrées pour construire un payload clair) et ne provoque pas de régression en cas d’échec (warning + log).

## Tests
- Unitaires:
  - `tests/validation.consultation.test.ts`: validation consultation (champs requis, mises à jour partielles).
  - `tests/sync.initialConsultation.test.ts`: déclenchement de la sync sur mise à jour d’une consultation initiale.
- Intégration:
  - `tests/integration/patient-consultation.flow.test.ts` (placeholder): scénario bout‑en‑bout avec émulateur Firestore.

## Plan de tests manuel
- Création patient avec champs valides → succès, affichage dans vue patient.
- Création consultation avec payload valide → succès, affichage dans onglet consultation.
- Mise à jour consultation initiale → patient mirroir mis à jour (ou log d’échec si sync impossible).
- Tentatives invalides (email/phone/date) → blocage + message d’erreur + log.

## Contraintes et périmètre
- Changements limités aux services `PatientService` et `ConsultationService` + utilitaires de validation et sync.
- Aucun impact attendu sur autres modules (factures, rendez‑vous), hors journaux.