/**
 * Utilitaire pour nettoyer les champs déchiffrés et gérer les erreurs de décodage
 */

/**
 * Nettoie un champ déchiffré en gérant les erreurs et les valeurs par défaut
 * @param value - La valeur à nettoyer
 * @param forEditing - Si true, retourne une chaîne vide pour les valeurs corrompues/par défaut
 * @param defaultValue - Valeur par défaut à utiliser si forEditing est false
 * @returns La valeur nettoyée
 */
export function cleanDecryptedField(
  value: any,
  forEditing: boolean = false,
  defaultValue: string = "Information non disponible"
): string {
  // Si la valeur est null, undefined ou vide
  if (!value || value === null || value === undefined) {
    return forEditing ? '' : defaultValue;
  }

  const stringValue = String(value);

  // Liste des marqueurs d'erreur à détecter
  const errorMarkers = [
    '[DECODING_FAILED]',
    '[RECOVERED_DATA]:',
    '[DECRYPTION_ERROR:',
    '[ENCRYPTION_ERROR:',
    '[PROTECTED_DATA]',
    '[NOT_ENCRYPTED_OR_INVALID]',
    '[EMPTY_DATA]',
    '[MALFORMED_ENCRYPTED_DATA]',
    '[MISSING_IV_OR_CIPHERTEXT]',
    '[EMPTY_CIPHERTEXT]',
    '[INVALID_IV_FORMAT]',
    '[EMPTY_DECRYPTION_RESULT]',
    '[AES_DECRYPTION_FAILED]',
    '[EMPTY_UTF8_DATA]',
    '[GENERAL_DECRYPTION_ERROR]',
    '[PREVIOUS_DECRYPTION_ERROR]'
  ];

  // Liste des valeurs par défaut à remplacer
  const defaultValues = [
    'Information non disponible',
    'Consultation ostéopathique',
    'Traitement ostéopathique standard',
    'Notes de consultation - données non récupérables',
    'Données non récupérables',
    'Adresse non disponible'
  ];

  // Vérifier si la valeur contient un marqueur d'erreur
  const hasErrorMarker = errorMarkers.some(marker => stringValue.includes(marker));

  // Vérifier si c'est une valeur par défaut
  const isDefaultValue = defaultValues.includes(stringValue.trim());

  // Vérifier les caractères de remplacement UTF-8 ou caractères non imprimables
  const hasInvalidChars = stringValue.includes('�') ||
                         stringValue.match(/[^\x20-\x7E\u00C0-\u017F\u0100-\u024F\u0400-\u04FF]/);

  // Si c'est pour l'édition et qu'il y a un problème, retourner une chaîne vide
  if (forEditing && (hasErrorMarker || isDefaultValue || hasInvalidChars)) {
    // Log seulement si c'est une vraie erreur de déchiffrement
    if (hasErrorMarker) {
      console.warn('⚠️ Données corrompues détectées lors de l\'édition, champ vidé');
    }
    return '';
  }

  // Si ce n'est pas pour l'édition et qu'il y a un problème, retourner le message par défaut
  if (!forEditing && (hasErrorMarker || isDefaultValue || hasInvalidChars)) {
    // Log seulement si c'est une vraie erreur de déchiffrement
    if (hasErrorMarker) {
      console.warn('⚠️ Données corrompues détectées lors de l\'affichage, valeur par défaut utilisée');
    }
    return defaultValue;
  }

  // Sinon, retourner la valeur nettoyée
  return stringValue.trim();
}

/**
 * Vérifie si une valeur contient des données corrompues
 */
export function isCorruptedData(value: any): boolean {
  if (!value) return false;
  
  const stringValue = String(value);
  
  const errorMarkers = [
    '[DECODING_FAILED]',
    '[RECOVERED_DATA]:',
    '[DECRYPTION_ERROR:',
    '[ENCRYPTION_ERROR:',
    '[PROTECTED_DATA]'
  ];
  
  return errorMarkers.some(marker => stringValue.includes(marker)) ||
         stringValue.includes('�') ||
         stringValue.match(/[^\x20-\x7E\u00C0-\u017F\u0100-\u024F\u0400-\u04FF]/);
}

/**
 * Nettoie un objet en appliquant cleanDecryptedField à tous ses champs string
 */
export function cleanDecryptedObject(
  obj: any, 
  forEditing: boolean = false, 
  fieldsToClean: string[] = []
): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = { ...obj };
  
  // Si aucun champ spécifié, nettoyer tous les champs string
  const fields = fieldsToClean.length > 0 ? fieldsToClean : Object.keys(cleaned);
  
  fields.forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = cleanDecryptedField(cleaned[field], forEditing);
    }
  });
  
  return cleaned;
}