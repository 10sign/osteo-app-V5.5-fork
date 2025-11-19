IDEMPOTENCE ABSOLUE
- Aucune mutation ne modifie un champ non explicitement édité par l’utilisateur
- La date d’une consultation initiale est immuable et ne peut jamais être modifiée

REVALIDATION SYSTÉMATIQUE
- Après toute mutation (create/update/delete) sur consultations ou rendez‑vous
- Déclencher automatiquement le recalcul et le rafraîchissement des données côté store/UI
- Mettre à jour l’en‑tête du patient (nextAppointment) via une resynchronisation

CONSULTATION INITIALE = IMMUTABLE
- Conserver 100 % des données d’origine
- Interdire toute modification automatique de sa date
- Préserver le flag isInitialConsultation

AFFICHAGE DE LA PROCHAINE CONSULTATION
- L’en‑tête reflète strictement l’état réel de la base
- Si aucune consultation future n’existe : afficher “Aucune prochaine consultation”
- Supprimer en cascade le rendez‑vous lié lors de la suppression d’une consultation, puis resynchroniser

DATES PASSÉES AUTORISÉES
- Autoriser création/mise à jour de consultations datées dans le passé
- Ne jamais imposer minDate = today
- Aucune validation bloquante sur dates antérieures pour consultations

ANTI‑STALE‑STATE
- Interdiction totale d’utiliser des valeurs obsolètes en cache après mutation
- Toute mutation invalide et rafraîchit les données (consultations, rendez‑vous, en‑tête patient)