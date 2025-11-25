import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, hdsConfig } from '../firebase/config';
import { encryptData, decryptData, pseudonymizeData, isEncrypted, isValidEncryptedFormat, attemptDataRepair } from './encryption';
import { AuditLogger, AuditEventType, SensitivityLevel } from './auditLogger';

/**
 * Convertit récursivement les objets Timestamp Firestore en chaînes ISO
 */
function convertTimestampsToISOStrings(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Vérifier si c'est un objet Timestamp Firestore
  if (obj && typeof obj === 'object' && 'seconds' in obj && 'nanoseconds' in obj) {
    try {
      // Convertir le Timestamp en objet Date JavaScript
      return new Date(obj.seconds * 1000 + obj.nanoseconds / 1000000);
    } catch (error) {
      console.warn('Failed to convert Timestamp to Date:', error);
      return obj;
    }
  }
  
  // Si c'est un tableau, traiter chaque élément
  if (Array.isArray(obj)) {
    return obj.map(item => convertTimestampsToISOStrings(item));
  }
  
  // Si c'est un objet, traiter chaque propriété
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertTimestampsToISOStrings(value);
    }
    return converted;
  }
  
  // Pour les types primitifs, retourner tel quel
  return obj;
}

export function cleanFirestoreData(data: any): any {
  if (data === undefined) return undefined;
  if (data === null) return null;
  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestoreData(item)).filter((v) => v !== undefined);
  }
  if (typeof data === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      const cleaned = cleanFirestoreData(v as any);
      if (cleaned !== undefined) result[k] = cleaned;
    }
    return result;
  }
  return data;
}

// Champs sensibles par collection
const SENSITIVE_FIELDS: Record<string, string[]> = {
  patients: [
    'firstName', 
    'lastName', 
    'dateOfBirth', 
    'socialSecurityNumber', 
    'email', 
    'phone', 
    'address', 
    'medicalHistory', 
    'allergies'
  ],
  consultations: [
    'reason',
    'treatment',
    'notes',
    // ✅ AJOUT: Champs cliniques manquants
    'consultationReason',
    'currentTreatment',
    'medicalAntecedents',
    'medicalHistory',
    'osteopathicTreatment',
    'symptoms',
    // Champs d'identité patient (snapshot)
    'patientFirstName',
    'patientLastName',
    'patientDateOfBirth',
    'patientGender',
    'patientPhone',
    'patientEmail',
    'patientProfession',
    'patientAddress',
    'patientInsurance',
    'patientInsuranceNumber'
  ],
  invoices: [
    'patientName',
    'notes'
  ]
};

// Champs à pseudonymiser
const PSEUDONYMIZED_FIELDS: Record<string, string[]> = {
  patients: ['socialSecurityNumber', 'email', 'phone'],
  consultations: [],
  invoices: []
};

/**
 * Classe utilitaire pour la conformité HDS
 */
export class HDSCompliance {
  /**
   * Vérifie si la conformité HDS est activée
   */
  static isEnabled(): boolean {
    return hdsConfig.enabled;
  }
  
  /**
   * Prépare les données pour stockage conforme HDS
   */
  static prepareDataForStorage(
    data: any, 
    collectionName: string, 
    userId: string
  ): any {
    if (!data) return data;
    
    // Clone des données
    const processedData = { ...data };

    // ✅ AJOUT: Liste des champs cliniques qui doivent TOUJOURS être sauvegardés même s'ils sont vides
    const clinicalFields = [
      'currentTreatment',
      'consultationReason',
      'medicalAntecedents',
      'medicalHistory',
      'osteopathicTreatment',
      'notes',
      'reason',
      'treatment'
    ];

    // ✅ CORRECTION: Initialiser les champs cliniques vides AVANT le filtrage
    // Ceci garantit qu'ils seront inclus dans fieldsToEncrypt
    if (collectionName === 'consultations') {
      clinicalFields.forEach(field => {
        if (processedData[field] === undefined || processedData[field] === null || processedData[field] === '') {
          processedData[field] = ''; // Initialiser avec chaîne vide
        }
      });
    }

    // Récupération des champs sensibles pour cette collection
    const sensitiveFields = SENSITIVE_FIELDS[collectionName] || [];
    const fieldsToEncrypt = sensitiveFields.filter(field =>
      processedData[field] !== undefined &&
      processedData[field] !== null &&
      !isEncrypted(processedData[field])
    );

    // Chiffrement des champs sensibles (uniquement si HDS activé)
    if (this.isEnabled()) {
      fieldsToEncrypt.forEach(field => {
        try {
          // Chiffrer toutes les valeurs (y compris les chaînes vides initialisées)
          const value = processedData[field];

          // Gestion spéciale pour les objets complexes comme address
          if (field === 'address' && typeof value === 'object') {
            processedData[field] = encryptData(value, userId);
          } else {
            // Chiffrer la valeur (convertir en string, même vide)
            const valueToEncrypt = String(value || '');
            processedData[field] = encryptData(valueToEncrypt, userId);

            // Log pour le champ notes spécifiquement
            if (field === 'notes') {
              console.log(`🔍 HDS - Chiffrement du champ notes:`, {
                originalValue: value,
                valueToEncrypt: valueToEncrypt,
                encrypted: processedData[field]
              });
            }

            // Log pour les champs cliniques vides
            if (clinicalFields.includes(field) && valueToEncrypt === '') {
              console.log(`✅ Champ clinique vide chiffré: ${field}`);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to encrypt field ${field}:`, error);
          // Marquer le champ comme ayant une erreur de chiffrement
          processedData[field] = `[ENCRYPTION_ERROR]:${processedData[field]}`;
        }
      });
    }
    
    // Pseudonymisation si nécessaire
    const pseudoFields = PSEUDONYMIZED_FIELDS[collectionName] || [];
    if (pseudoFields.length > 0) {
      const fieldsToProcess = pseudoFields.filter(field => 
        processedData[field] !== undefined && 
        processedData[field] !== null
      );
      
      if (fieldsToProcess.length > 0) {
        // Création d'un index pseudonymisé pour recherche
        processedData._pseudoIndex = {};
        
        fieldsToProcess.forEach(field => {
          // Stockage de la version pseudonymisée pour recherche
          processedData._pseudoIndex[field] = pseudonymizeData(processedData[field], [field]);
        });
      }
    }
    
    // Ajout des métadonnées HDS
    processedData._hds = {
      version: hdsConfig.complianceVersion,
      encryptedFields: this.isEnabled() ? fieldsToEncrypt : [],
      pseudonymizedFields: pseudoFields,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId
    };
    
    return processedData;
  }
  
  /**
   * Déchiffre les données pour affichage avec gestion robuste des erreurs
   */
  static decryptDataForDisplay(
    data: any, 
    collectionName: string, 
    userId: string
  ): any {
    // Même si le mode HDS est désactivé, tenter de déchiffrer les champs
    // qui semblent chiffrés afin d'afficher des données lisibles.
    if (!data) return data;
    
    // Debug: Log pour diagnostiquer les problèmes de déchiffrement
    if (import.meta.env.DEV) {
      console.log('🔍 Déchiffrement des données pour:', collectionName, {
        userId: userId.substring(0, 8) + '...',
        hasHdsMetadata: !!data._hds,
        encryptedFields: data._hds?.encryptedFields || [],
        // ✅ DEBUG: Vérifier la date de création
        createdAt: data.createdAt,
        isToday: data.createdAt && new Date(data.createdAt).toDateString() === new Date().toDateString()
      });
    }
    
    // Clone des données
    const processedData = { ...data };
    
    // Récupération des champs sensibles pour cette collection
    const sensitiveFields = SENSITIVE_FIELDS[collectionName] || [];
    
    // Déchiffrement des champs sensibles
    sensitiveFields.forEach(field => {
      try {
        if (processedData[field] && typeof processedData[field] === 'string') {
          // ✅ DEBUG: Log spécifique pour les champs cliniques
          if (['consultationReason', 'currentTreatment', 'medicalAntecedents', 'medicalHistory', 'osteopathicTreatment', 'symptoms'].includes(field)) {
            console.log(`🔍 Déchiffrement du champ clinique ${field}:`, {
              value: processedData[field].substring(0, 100) + '...',
              isEncrypted: isEncrypted(processedData[field]),
              isValidFormat: isValidEncryptedFormat(processedData[field]),
              // ✅ DEBUG: Vérifier si c'est une consultation d'aujourd'hui
              isToday: processedData.createdAt && new Date(processedData.createdAt).toDateString() === new Date().toDateString()
            });
          }
          // Gestion spéciale pour les champs vides ou null
          if (processedData[field] === '' || processedData[field] === 'null' || processedData[field] === 'undefined') {
            processedData[field] = '';
            return;
          }
          
          if (import.meta.env.DEV) {
            console.log(`🔓 Tentative de déchiffrement du champ ${field}:`, {
              isEncrypted: isEncrypted(processedData[field]),
              isValidFormat: isValidEncryptedFormat(processedData[field]),
              fieldValue: processedData[field].substring(0, 50) + '...'
            });
          }
          
          // Vérifier si le champ contient déjà une erreur de déchiffrement
          if (processedData[field].startsWith('[DECRYPTION_ERROR:') || 
              processedData[field].startsWith('[ENCRYPTION_ERROR:')) {
            if (import.meta.env.DEV) {
              console.warn(`⚠️ Champ ${field} contient déjà une erreur, conservation de l'état`);
            }
            // Garder le marqueur d'erreur pour que cleanDecryptedField puisse le traiter
            // Ne pas remplacer ici pour préserver la logique de nettoyage
            return;
          }
          
          // Vérifier si le champ est chiffré
          if (isEncrypted(processedData[field])) {
            try {
              const decryptedValue = decryptData(processedData[field], userId);
              
              if (import.meta.env.DEV) {
                console.log(`🔓 Déchiffrement de ${field}:`, {
                  success: !decryptedValue.toString().startsWith('[') && !decryptedValue.toString().includes('DECODING_FAILED'),
                  value: decryptedValue.toString().substring(0, 50) + '...'
                });
              }
              
              // ✅ CORRECTION : Vérifier si le déchiffrement a réussi
              if (typeof decryptedValue === 'string' && 
                  !decryptedValue.startsWith('[') && 
                  !decryptedValue.includes('DECODING_FAILED') &&
                  !decryptedValue.includes('DECRYPTION_ERROR') &&
                  decryptedValue.length > 0) {
                processedData[field] = decryptedValue;
                if (import.meta.env.DEV) {
                  console.log(`✅ Déchiffrement réussi pour ${field}:`, decryptedValue.substring(0, 50) + '...');
                }
              } else {
                // Si le déchiffrement échoue, essayer de récupérer le texte original
                console.warn(`⚠️ Échec du déchiffrement pour ${field}:`, decryptedValue);
                
                // Essayer de récupérer le texte original si c'est un UUID chiffré
                if (processedData[field].includes(':') && processedData[field].length > 50) {
                  const parts = processedData[field].split(':');
                  if (parts.length >= 2) {
                    const uuidPattern = /^[0-9a-f]{32}$/i;
                    if (uuidPattern.test(parts[0])) {
                      // C'est un UUID chiffré, essayer de déchiffrer juste la partie après l'UUID
                      try {
                        const encryptedPart = parts.slice(1).join(':');
                        const retryDecrypt = decryptData(encryptedPart, userId);
                        if (typeof retryDecrypt === 'string' && 
                            !retryDecrypt.startsWith('[') && 
                            !retryDecrypt.includes('DECODING_FAILED') &&
                            retryDecrypt.length > 0) {
                          processedData[field] = retryDecrypt;
                          if (import.meta.env.DEV) {
                            console.log(`✅ Déchiffrement réussi au 2ème essai pour ${field}:`, retryDecrypt.substring(0, 50) + '...');
                          }
                        }
                      } catch (retryError) {
                        console.error(`❌ Échec du déchiffrement au 2ème essai pour ${field}:`, retryError);
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`❌ Erreur de déchiffrement pour ${field}:`, error);
              // Garder la valeur chiffrée - pas de réassignation nécessaire
            }
          }
          // Données non chiffrées sont déjà dans processedData[field]
        }
        
      } catch (error) {
        console.error(`❌ Échec du déchiffrement pour ${field}:`, error);
        processedData[field] = '[DECODING_FAILED]';
      }
    });
    
    // Gestion spéciale pour l'objet address
    if (processedData.address && typeof processedData.address === 'string' && isEncrypted(processedData.address)) {
      try {
        const decryptedAddress = decryptData(processedData.address, userId);
        
        // Gestion unifiée des erreurs de déchiffrement pour l'adresse
        if (typeof decryptedAddress === 'string') {
          if (decryptedAddress.startsWith('[') && decryptedAddress.endsWith(']')) {
            // C'est un marqueur d'erreur
            processedData.address = { street: 'Adresse non disponible' };
          } else if (decryptedAddress.startsWith('{')) {
            // Tenter de parser le JSON
            try {
              processedData.address = JSON.parse(decryptedAddress);
            } catch (jsonError) {
              processedData.address = { street: decryptedAddress };
            }
          } else {
            // Texte simple
            processedData.address = { street: decryptedAddress };
          }
        } else if (typeof decryptedAddress === 'object') {
          processedData.address = decryptedAddress;
        } else {
          processedData.address = { street: 'Adresse non disponible' };
        }
      } catch (error) {
        processedData.address = { street: 'Adresse non disponible' };
      }
    }
    
    // Suppression des métadonnées HDS pour l'affichage
    delete processedData._hds;
    delete processedData._pseudoIndex;
    
    // Conversion des Timestamps Firestore en chaînes ISO pour éviter les erreurs de rendu React
    return convertTimestampsToISOStrings(processedData);
  }
  
  /**
   * Sauvegarde des données conformes HDS
   */
  static async saveCompliantData(
    collectionName: string,
    docId: string,
    data: any
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Préparation des données
      const userId = auth.currentUser.uid;
      const compliantData = this.prepareDataForStorage(data, collectionName, userId);
      
      // Sauvegarde dans Firestore
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, compliantData);
      
      // Journalisation de l'opération
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `${collectionName}/${docId}`,
        'create_or_update',
        SensitivityLevel.SENSITIVE,
        'success',
        { fields: Object.keys(data) }
      );
      
    } catch (error) {
      console.error('❌ Failed to save compliant data:', error);
      
      // Journalisation de l'échec
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `${collectionName}/${docId}`,
        'create_or_update',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Récupération des données avec déchiffrement
   */
  static async getCompliantData(
    collectionName: string,
    docId: string
  ): Promise<any> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupération depuis Firestore
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document non trouvé');
      }
      
      // Déchiffrement des données
      const userId = auth.currentUser.uid;
      const data = docSnap.data();
      const decryptedData = this.decryptDataForDisplay(data, collectionName, userId);
      
      // Journalisation de l'accès
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        `${collectionName}/${docId}`,
        'read',
        SensitivityLevel.SENSITIVE,
        'success'
      );
      
      return {
        ...decryptedData,
        id: docId
      };
      
    } catch (error) {
      console.error('❌ Failed to get compliant data:', error);
      
      // Journalisation de l'échec
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        `${collectionName}/${docId}`,
        'read',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Mise à jour des données conformes HDS
   */
  static async updateCompliantData(
    collectionName: string,
    docId: string,
    updates: any
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupération du document existant
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document non trouvé');
      }
      
      const existingData = docSnap.data();
      const userId = auth.currentUser.uid;
      
      // Préparation des mises à jour
      const sensitiveFields = SENSITIVE_FIELDS[collectionName] || [];
      const updatesWithEncryption: Record<string, any> = {};
      
      // Traitement des champs à mettre à jour
      Object.entries(updates).forEach(([key, value]) => {
        try {
          const isSensitive = sensitiveFields.includes(key);
          const isAddressObject = key === 'address' && value !== null && typeof value === 'object';
          const isStringValue = typeof value === 'string';
          const isComplexValue = !isStringValue && value !== undefined && value !== null;

          if (this.isEnabled() && isSensitive && value !== undefined) {
            if (isAddressObject) {
              updatesWithEncryption[key] = encryptData(value, userId);
            } else if (isStringValue) {
              // Chiffrement des champs sensibles (valeur string)
              const strVal = value as string;
              updatesWithEncryption[key] = isEncrypted(strVal) ? strVal : encryptData(strVal, userId);
            } else if (isComplexValue) {
              // ✅ Nouveau: chiffrer aussi les valeurs non-string (objets, nombres, tableaux)
              updatesWithEncryption[key] = encryptData(value, userId);
            } else {
              // Valeur null/undefined, conserver telle quelle
              updatesWithEncryption[key] = value;
            }
          } else {
            updatesWithEncryption[key] = value;
          }
        } catch (error) {
          console.error(`❌ Failed to encrypt field ${key}:`, error);
          // Conserver la valeur originale en cas d'erreur
          updatesWithEncryption[key] = value;
        }
      });
      
      // Mise à jour des métadonnées HDS
      updatesWithEncryption['_hds'] = {
        ...(existingData._hds || {}),
        version: hdsConfig.complianceVersion,
        lastUpdated: new Date().toISOString(),
        updatedBy: userId
      };
      
      // Mise à jour dans Firestore
      const cleanedUpdates = cleanFirestoreData(updatesWithEncryption);
      await updateDoc(docRef, cleanedUpdates);
      
      // Journalisation de l'opération
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `${collectionName}/${docId}`,
        'update',
        SensitivityLevel.SENSITIVE,
        'success',
        { fields: Object.keys(updates) }
      );
      
    } catch (error) {
      console.error('❌ Failed to update compliant data:', error);
      
      // Journalisation de l'échec
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `${collectionName}/${docId}`,
        'update',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      throw error;
    }
  }
  
  /**
   * Vérifie la conformité HDS d'un document
   */
  static isCompliant(data: any): boolean {
    if (!this.isEnabled() || !data) return false;
    
    // Vérification des métadonnées HDS
    return (
      data._hds &&
      data._hds.version === hdsConfig.complianceVersion &&
      data._hds.lastUpdated &&
      data._hds.updatedBy
    );
  }
  
  /**
   * Migre les données existantes vers le format HDS
   */
  static async migrateToCompliant(
    collectionName: string,
    docId: string
  ): Promise<boolean> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupération du document
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document non trouvé');
      }
      
      const data = docSnap.data();
      
      // Vérification si déjà conforme
      if (this.isCompliant(data)) {
        return true;
      }
      
      // Préparation des données conformes
      const userId = auth.currentUser.uid;
      const compliantData = this.prepareDataForStorage(data, collectionName, userId);
      
      // Mise à jour dans Firestore
      await updateDoc(docRef, compliantData);
      
      // Journalisation de la migration
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `${collectionName}/${docId}`,
        'migrate_to_hds',
        SensitivityLevel.SENSITIVE,
        'success'
      );
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to migrate data to HDS format:', error);
      
      // Journalisation de l'échec
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `${collectionName}/${docId}`,
        'migrate_to_hds',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      return false;
    }
  }
  
  /**
   * Répare les données chiffrées corrompues
   */
  static async repairCorruptedData(
    collectionName: string,
    docId: string
  ): Promise<boolean> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      // Récupération du document
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document non trouvé');
      }
      
      const data = docSnap.data();
      const userId = auth.currentUser.uid;
      
      // Récupération des champs sensibles pour cette collection
      const sensitiveFields = SENSITIVE_FIELDS[collectionName] || [];
      const updates: Record<string, any> = {};
      let hasUpdates = false;
      
      // Vérification et réparation de chaque champ sensible
      for (const field of sensitiveFields) {
        if (data[field] && typeof data[field] === 'string') {
          // Vérifier si le champ est chiffré mais corrompu
          if (isEncrypted(data[field]) && !isValidEncryptedFormat(data[field])) {
            // Tenter de réparer
            const repairedData = attemptDataRepair(data[field], userId);
            if (repairedData) {
              updates[field] = repairedData;
              hasUpdates = true;
            }
          }
          // Vérifier si le champ contient une erreur de déchiffrement
          else if (typeof data[field] === 'string' && 
                  (data[field].startsWith('[DECRYPTION_ERROR:') || 
                   data[field].startsWith('[ENCRYPTION_ERROR:'))) {
            // Tenter de migrer
            const cleanValue = data[field].includes(':') ? 
              data[field].split(':').slice(1).join(':') : 
              '';
            
            if (cleanValue) {
              updates[field] = encryptData(cleanValue, userId);
              hasUpdates = true;
            }
          }
        }
      }
      
      // Gestion spéciale pour l'objet address
      if (data.address && typeof data.address === 'string') {
        if (isEncrypted(data.address) && !isValidEncryptedFormat(data.address)) {
          // Tenter de réparer
          const repairedData = attemptDataRepair(data.address, userId);
          if (repairedData) {
            updates.address = repairedData;
            hasUpdates = true;
          }
        }
      }
      
      // Appliquer les mises à jour si nécessaire
      if (hasUpdates) {
        // Mise à jour des métadonnées HDS
        updates['_hds'] = {
          ...(data._hds || {}),
          version: hdsConfig.complianceVersion,
          lastUpdated: new Date().toISOString(),
          updatedBy: userId,
          repaired: true
        };
        
        await updateDoc(docRef, updates);
        
        // Journalisation de la réparation
        await AuditLogger.log(
          AuditEventType.DATA_MODIFICATION,
          `${collectionName}/${docId}`,
          'repair_encrypted_data',
          SensitivityLevel.SENSITIVE,
          'success',
          { fields: Object.keys(updates) }
        );
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to repair corrupted data:', error);
      
      // Journalisation de l'échec
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        `${collectionName}/${docId}`,
        'repair_encrypted_data',
        SensitivityLevel.SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );
      
      return false;
    }
  }
}

export default HDSCompliance;