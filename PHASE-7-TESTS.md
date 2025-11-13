# Phase 7 : Tests de non-régression

## Vue d'ensemble

Ce document fournit un guide détaillé pour tester le système de synchronisation bidirectionnelle et l'affichage de l'historique des champs cliniques.

## Prérequis

- Application déployée et accessible
- Compte utilisateur avec accès complet
- Navigateur avec console développeur ouverte
- Aucun patient de test existant (commencer avec une base propre)

---

## Test 1 : Création d'un nouveau patient

### Objectif
Vérifier que la création d'un patient avec des données cliniques crée automatiquement une consultation initiale synchronisée.

### Étapes

1. **Accéder à la liste des patients**
   - Cliquer sur "Patients" dans le menu

2. **Ouvrir le formulaire de création**
   - Cliquer sur "+ Nouveau patient"

3. **Remplir les informations de base**
   - Prénom : `Jean`
   - Nom : `Dupont`
   - Date de naissance : `01/01/1980`
   - Téléphone : `0612345678`

4. **Remplir les champs cliniques (IMPORTANTS)**
   - Motif de consultation : `Lombalgie chronique depuis 3 mois`
   - Traitement effectué : `Prise d'anti-inflammatoires (Ibuprofène 400mg)`
   - Antécédents médicaux : `Hernie discale L4-L5 opérée en 2015`
   - Traitement ostéopathique : `Manipulation vertébrale, techniques myotensives`
   - Historique médical : `Scoliose légère, pas de problème cardiovasculaire`
   - Notes : `Patient sportif, course à pied 3x/semaine`

5. **Valider le formulaire**
   - Cliquer sur "Créer le patient"
   - ✅ **Attendu :** Message de succès affiché

### Vérifications

1. **Vérifier le patient créé**
   - Le patient "Jean Dupont" apparaît dans la liste
   - Les informations sont correctes

2. **Vérifier la consultation initiale**
   - Cliquer sur le patient pour ouvrir sa fiche
   - Aller dans l'onglet "Consultations"
   - ✅ **Attendu :** 1 consultation existe
   - ✅ **Attendu :** Badge "Consultation initiale" visible
   - ✅ **Attendu :** Date = date de création du patient

3. **Vérifier les champs synchronisés**
   - Cliquer sur "Voir" la consultation initiale
   - ✅ **Attendu :** Motif = "Lombalgie chronique depuis 3 mois"
   - ✅ **Attendu :** Traitement effectué = "Prise d'anti-inflammatoires (Ibuprofène 400mg)"
   - ✅ **Attendu :** Antécédents = "Hernie discale L4-L5 opérée en 2015"
   - ✅ **Attendu :** Traitement ostéo = "Manipulation vertébrale, techniques myotensives"
   - ✅ **Attendu :** Historique médical = "Scoliose légère, pas de problème cardiovasculaire"
   - ✅ **Attendu :** Notes = "Patient sportif, course à pied 3x/semaine"

4. **Vérifier les logs console**
   - Ouvrir la console développeur
   - ✅ **Attendu :** Aucune erreur rouge
   - ✅ **Attendu :** Log "✅ Patient created successfully"
   - ✅ **Attendu :** Log "✅ Consultation initiale créée automatiquement"

### Résultat attendu
✅ **SUCCÈS** : Le patient est créé avec une consultation initiale contenant tous les champs cliniques synchronisés.

---

## Test 2 : Modification du dossier patient

### Objectif
Vérifier que la modification d'un champ clinique dans le dossier patient met à jour automatiquement la consultation initiale.

### Étapes

1. **Ouvrir le dossier patient de Jean Dupont**
   - Cliquer sur le patient créé au Test 1

2. **Ouvrir le formulaire d'édition**
   - Cliquer sur "Modifier" (icône crayon)

3. **Vérifier l'affichage du message informatif**
   - ✅ **Attendu :** Bandeau bleu en haut du formulaire
   - ✅ **Attendu :** Titre "Synchronisation automatique"
   - ✅ **Attendu :** Message expliquant la synchronisation automatique
   - ✅ **Attendu :** Liste des champs concernés

4. **Vérifier les indicateurs visuels**
   - ✅ **Attendu :** Titre "Informations cliniques" avec badge bleu "Synchronisé avec consultation initiale"
   - ✅ **Attendu :** Icône de synchronisation (↻) à côté de chaque champ clinique
   - ✅ **Attendu :** Bordure bleue sur les champs cliniques

5. **Modifier un champ clinique**
   - Modifier "Motif de consultation" : `Lombalgie chronique - Aggravation récente`
   - Cliquer sur "Mettre à jour"
   - ✅ **Attendu :** Message de succès mentionnant la synchronisation

6. **Vérifier la synchronisation**
   - Aller dans l'onglet "Consultations"
   - Ouvrir la consultation initiale
   - ✅ **Attendu :** Motif = "Lombalgie chronique - Aggravation récente"

7. **Modifier plusieurs champs**
   - Revenir à "Vue d'ensemble"
   - Cliquer sur "Modifier"
   - Modifier "Traitement effectué" : `Ibuprofène 400mg + paracétamol 1g`
   - Modifier "Notes" : `Patient sportif, course à pied 3x/semaine. Douleur accrue après effort.`
   - Cliquer sur "Mettre à jour"

8. **Vérifier les logs d'audit (Console)**
   - Ouvrir la console développeur
   - ✅ **Attendu :** Log "🔄 Déclenchement de la synchronisation automatique..."
   - ✅ **Attendu :** Log "✅ Consultation initiale synchronisée: X champs mis à jour"
   - ✅ **Attendu :** Aucune erreur

### Résultat attendu
✅ **SUCCÈS** : Les modifications du dossier patient sont automatiquement synchronisées avec la consultation initiale.

---

## Test 3 : Modification de la consultation initiale (avec confirmation)

### Objectif
Vérifier que la modification de la consultation initiale affiche une confirmation et met à jour le dossier patient si accepté.

### Étapes

1. **Ouvrir la consultation initiale**
   - Depuis la fiche patient, onglet "Consultations"
   - Cliquer sur "Modifier" la consultation initiale

2. **Modifier un champ clinique**
   - Modifier "Antécédents médicaux" : `Hernie discale L4-L5 opérée en 2015. Récidive en 2023.`
   - Cliquer sur "Mettre à jour"

3. **Vérifier la modale de confirmation**
   - ✅ **Attendu :** Modale de confirmation affichée
   - ✅ **Attendu :** Titre "Synchronisation avec le dossier patient"
   - ✅ **Attendu :** Message explicatif clair
   - ✅ **Attendu :** Liste des champs qui seront synchronisés :
     - "Antécédents médicaux"
   - ✅ **Attendu :** 2 boutons : "Annuler" et "Confirmer et mettre à jour"

4. **Confirmer la synchronisation**
   - Cliquer sur "Confirmer et mettre à jour"
   - ✅ **Attendu :** Message de succès

5. **Vérifier la synchronisation**
   - Aller dans "Vue d'ensemble"
   - ✅ **Attendu :** Section "Antécédents médicaux" affiche la nouvelle valeur
   - Cliquer sur "Modifier" le patient
   - ✅ **Attendu :** Champ "Antécédents médicaux" = "Hernie discale L4-L5 opérée en 2015. Récidive en 2023."

6. **Vérifier les logs d'audit**
   - Console développeur
   - ✅ **Attendu :** Log "🔄 Synchronisation consultation → patient confirmée"
   - ✅ **Attendu :** Log indiquant les champs synchronisés

### Résultat attendu
✅ **SUCCÈS** : La modification de la consultation initiale met à jour le dossier patient après confirmation.

---

## Test 4 : Modification de la consultation initiale (sans confirmation)

### Objectif
Vérifier que le refus de synchronisation ne met PAS à jour le dossier patient.

### Étapes

1. **Ouvrir la consultation initiale**
   - Onglet "Consultations" → Modifier la consultation initiale

2. **Modifier un champ clinique**
   - Modifier "Traitement ostéopathique" : `Manipulation vertébrale, techniques myotensives, étirements`
   - Cliquer sur "Mettre à jour"

3. **Refuser la synchronisation**
   - Modale de confirmation affichée
   - Cliquer sur "Annuler" (ou "Ne pas synchroniser" selon le libellé)
   - ✅ **Attendu :** Message de succès (sans mention de synchronisation)

4. **Vérifier que le patient n'est PAS mis à jour**
   - Aller dans "Vue d'ensemble"
   - Cliquer sur "Modifier" le patient
   - ✅ **Attendu :** Champ "Traitement ostéopathique" = ancienne valeur (sans ", étirements")

5. **Vérifier que la consultation EST mise à jour**
   - Onglet "Consultations" → Voir la consultation initiale
   - ✅ **Attendu :** "Traitement ostéopathique" = nouvelle valeur (avec ", étirements")

### Résultat attendu
✅ **SUCCÈS** : Le refus de synchronisation met à jour uniquement la consultation, pas le dossier patient.

---

## Test 5 : Création d'une consultation suivante

### Objectif
Vérifier que les consultations suivantes (isFirst=false) ne synchronisent PAS le dossier patient.

### Étapes

1. **Créer une 2e consultation**
   - Onglet "Consultations" → "+ Nouvelle consultation"
   - Date : Date du jour
   - Motif : `Suivi lombalgie - amélioration progressive`
   - Traitement effectué : `Arrêt des anti-inflammatoires`
   - Antécédents : `Aucun nouvel antécédent`
   - ✅ **Attendu :** AUCUN badge "Consultation initiale"
   - Créer la consultation

2. **Créer une 3e consultation**
   - Date : Demain
   - Motif : `Contrôle - douleur résiduelle`
   - Traitement effectué : `Séances de kinésithérapie recommandées`
   - Créer la consultation

3. **Créer une 4e consultation**
   - Date : Dans 1 semaine
   - Motif : `Consultation de suivi final`
   - Traitement effectué : `Guérison complète, reprise du sport autorisée`
   - Créer la consultation

4. **Vérifier qu'aucune synchronisation n'a eu lieu**
   - Aller dans "Vue d'ensemble"
   - Cliquer sur "Modifier" le patient
   - ✅ **Attendu :** Tous les champs cliniques = valeurs de la consultation initiale
   - ✅ **Attendu :** AUCUNE valeur des consultations 2, 3, 4

5. **Vérifier les logs console**
   - ✅ **Attendu :** AUCUN log de synchronisation pour les consultations 2, 3, 4

### Résultat attendu
✅ **SUCCÈS** : Les consultations suivantes ne modifient pas le dossier patient.

---

## Test 6 : Affichage de l'historique

### Objectif
Vérifier que l'historique des champs s'affiche correctement avec le bon ordre, les bonnes dates, et le code couleur.

### Étapes

1. **Aller dans la vue d'ensemble du patient**
   - Fiche patient → Onglet "Vue d'ensemble"

2. **Vérifier la présence des chevrons**
   - ✅ **Attendu :** Chaque section de champ clinique a un bouton "Historique" avec icône chevron
   - ✅ **Attendu :** Chevrons repliés par défaut

3. **Cliquer sur le chevron "Motif de consultation"**
   - ✅ **Attendu :** Historique déplié
   - ✅ **Attendu :** Titre "Évolution chronologique"
   - ✅ **Attendu :** 4 entrées affichées :
     1. Consultation n°4 (dans 1 semaine) - "Consultation de suivi final" - Fond bleu clair, gras
     2. Consultation n°3 (demain) - "Contrôle - douleur résiduelle" - Fond blanc
     3. Consultation n°2 (aujourd'hui) - "Suivi lombalgie - amélioration progressive" - Fond blanc
     4. Consultation n°1 (date création) - "Lombalgie chronique - Aggravation récente" - Fond blanc
     5. Dossier patient (date création) - "Lombalgie chronique - Aggravation récente" - Fond gris, opacité réduite + mention "Identique à la valeur précédente"

4. **Vérifier le code couleur**
   - ✅ **Attendu :** Dernière consultation (n°4) : Fond bleu primaire (`bg-primary-50`), texte en gras
   - ✅ **Attendu :** Valeurs identiques (Consultation 1 et Dossier patient) : Fond gris (`bg-gray-50`), opacité 60%, texte gris
   - ✅ **Attendu :** Valeurs différentes : Fond blanc, texte normal

5. **Vérifier les dates**
   - ✅ **Attendu :** Format français `JJ/MM/AAAA` (ex: "22/10/2024")
   - ✅ **Attendu :** Dates affichées à droite de chaque entrée

6. **Vérifier les labels**
   - ✅ **Attendu :** "Consultation n°4", "Consultation n°3", etc.
   - ✅ **Attendu :** "Dossier patient" pour l'entrée patient

7. **Tester avec un autre champ**
   - Cliquer sur le chevron "Traitement effectué"
   - ✅ **Attendu :** Historique différent mais même structure
   - Replier le chevron
   - ✅ **Attendu :** Historique caché à nouveau

8. **Tester le repliage/dépliage**
   - Cliquer plusieurs fois sur différents chevrons
   - ✅ **Attendu :** Animations fluides
   - ✅ **Attendu :** Un seul historique ouvert à la fois (ou plusieurs si souhaité)

### Résultat attendu
✅ **SUCCÈS** : L'historique s'affiche correctement avec ordre chronologique inverse, dates formatées, et code couleur approprié.

---

## Test 7 : Performance avec 20 consultations

### Objectif
Vérifier que l'application reste performante avec un grand nombre de consultations.

### Étapes

1. **Créer 16 consultations supplémentaires**
   - Total souhaité : 20 consultations
   - Créer rapidement 16 consultations avec des données variées
   - Varier les valeurs des champs cliniques

2. **Mesurer le temps de chargement de la vue d'ensemble**
   - Ouvrir les outils de développement → Onglet "Performance"
   - Démarrer l'enregistrement
   - Naviguer vers la fiche patient → Vue d'ensemble
   - Arrêter l'enregistrement
   - ✅ **Attendu :** Temps de chargement < 2 secondes

3. **Tester l'ouverture des chevrons**
   - Cliquer sur un chevron
   - Chronométrer le temps d'affichage de l'historique
   - ✅ **Attendu :** Affichage instantané (< 500ms)

4. **Tester la fluidité du scroll**
   - Scroller dans la page
   - ✅ **Attendu :** Scroll fluide, pas de lag
   - ✅ **Attendu :** 60 FPS maintenu

5. **Vérifier la mémoire**
   - Outils de développement → Onglet "Memory"
   - Prendre un snapshot
   - ✅ **Attendu :** Consommation mémoire raisonnable (< 100 MB pour la page)

6. **Vérifier les requêtes réseau**
   - Onglet "Network"
   - ✅ **Attendu :** Nombre de requêtes minimal
   - ✅ **Attendu :** Pas de requêtes en double

### Résultat attendu
✅ **SUCCÈS** : L'application reste performante avec 20 consultations.

---

## Test 8 : Vérification des régressions

### Objectif
S'assurer qu'aucune fonctionnalité existante n'a été cassée.

### Étapes

1. **Test de création de patient sans champs cliniques**
   - Créer un patient avec uniquement nom, prénom, date de naissance
   - ✅ **Attendu :** Patient créé sans erreur
   - ✅ **Attendu :** Consultation initiale créée avec champs cliniques vides

2. **Test de modification de champs non-cliniques**
   - Modifier téléphone, email, adresse d'un patient
   - ✅ **Attendu :** Modification réussie
   - ✅ **Attendu :** AUCUNE synchronisation de la consultation initiale

3. **Test de suppression d'un patient**
   - Supprimer un patient de test
   - ✅ **Attendu :** Patient supprimé
   - ✅ **Attendu :** Consultations associées supprimées

4. **Test de recherche de patients**
   - Rechercher "Dupont"
   - ✅ **Attendu :** Résultats corrects

5. **Test de filtrage des consultations**
   - Filtrer par date, par type
   - ✅ **Attendu :** Filtres fonctionnels

6. **Test de navigation**
   - Naviguer entre différentes pages
   - ✅ **Attendu :** Navigation fluide
   - ✅ **Attendu :** Pas de perte de données

### Résultat attendu
✅ **SUCCÈS** : Aucune régression détectée.

---

## Checklist finale

- [ ] Test 1 : Création patient → Consultation initiale ✅
- [ ] Test 2 : Modification patient → Consultation initiale ✅
- [ ] Test 3 : Modification consultation → Patient (avec confirmation) ✅
- [ ] Test 4 : Modification consultation → Patient (sans confirmation) ✅
- [ ] Test 5 : Consultations suivantes (pas de synchronisation) ✅
- [ ] Test 6 : Affichage de l'historique ✅
- [ ] Test 7 : Performance avec 20 consultations ✅
- [ ] Test 8 : Vérification des régressions ✅

## Résultat global

**Status :** [ ] TOUS LES TESTS PASSÉS ✅ | [ ] ÉCHECS DÉTECTÉS ❌

**Commentaires :**
_[À remplir par le testeur]_

**Date du test :** __________
**Testeur :** __________
**Version de l'application :** __________

---

**Note :** En cas d'échec d'un test, noter le détail de l'erreur, capturer une capture d'écran, et copier les logs de la console.
