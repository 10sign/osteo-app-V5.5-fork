#!/bin/bash

echo "🚀 Déploiement des règles Firebase Storage..."

# Vérifier si Firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI n'est pas installé"
    exit 1
fi

# Vérifier si l'utilisateur est connecté
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Connexion à Firebase requise..."
    echo "Veuillez exécuter: firebase login"
    echo "Puis relancer ce script"
    exit 1
fi

# Déployer les règles de sécurité
echo "📝 Déploiement des règles de sécurité Storage..."
firebase deploy --only storage

if [ $? -eq 0 ]; then
    echo "✅ Règles de sécurité déployées avec succès!"
    echo "🧪 Testez maintenant l'upload de documents dans l'application"
else
    echo "❌ Erreur lors du déploiement des règles"
    exit 1
fi
