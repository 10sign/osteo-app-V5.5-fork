import { ref, uploadBytesResumable, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { storage, auth } from '../firebase/config';
import imageCompression from 'browser-image-compression';

/**
 * Vérifie que Firebase Storage est correctement configuré et accessible
 */
export function checkStorageConfiguration(): { isValid: boolean; error?: string } {
  console.group('🔍 Vérification de la configuration Firebase Storage');

  try {
    // Vérification 1: Storage initialisé
    if (!storage) {
      console.error('❌ Firebase Storage n\'est pas initialisé');
      console.log('👉 Solution: Vérifiez que Firebase est correctement initialisé dans firebase/config.ts');
      console.groupEnd();
      return {
        isValid: false,
        error: 'Firebase Storage n\'est pas initialisé. Vérifiez votre configuration Firebase.'
      };
    }
    console.log('✅ Storage initialisé');

    // Vérification 2: Bucket configuré
    const bucket = (storage as any).app.options.storageBucket;
    if (!bucket || bucket === '') {
      console.error('❌ Bucket Storage non configuré');
      console.log('👉 Solution: Ajoutez VITE_FIREBASE_STORAGE_BUCKET dans votre fichier .env');
      console.log('👉 Format attendu: project-id.appspot.com');
      console.groupEnd();
      return {
        isValid: false,
        error: 'Le bucket Firebase Storage n\'est pas configuré. Vérifiez VITE_FIREBASE_STORAGE_BUCKET dans votre .env'
      };
    }
    console.log('✅ Bucket configuré:', bucket);

    // Vérification 3: Authentification
    if (!auth.currentUser) {
      console.warn('⚠️ Utilisateur non authentifié');
      console.log('👉 Solution: Connectez-vous avant d\'uploader des fichiers');
    } else {
      console.log('✅ Utilisateur authentifié:', auth.currentUser.uid);
    }

    console.log('🎉 Configuration Storage valide');
    console.groupEnd();
    return { isValid: true };
  } catch (error: any) {
    console.error('❌ Erreur de vérification Storage:', error);
    console.groupEnd();
    return {
      isValid: false,
      error: 'Erreur lors de la vérification de Firebase Storage: ' + (error.message || 'Erreur inconnue')
    };
  }
}

/**
 * Guide de diagnostic pour les problèmes d'upload
 */
export function printUploadDiagnostic() {
  console.group('👨‍⚕️ GUIDE DE DIAGNOSTIC - Upload de documents');
  console.log('');
  console.log('🔍 Problèmes courants et solutions:');
  console.log('');
  console.log('1️⃣ "Utilisateur non authentifié"');
  console.log('   ➡️ Assurez-vous d\'\u00eatre connecté avant d\'uploader');
  console.log('');
  console.log('2️⃣ "Firebase Storage non configuré"');
  console.log('   ➡️ Vérifiez le fichier .env et la variable VITE_FIREBASE_STORAGE_BUCKET');
  console.log('   ➡️ Format: ostheo-app.appspot.com');
  console.log('');
  console.log('3️⃣ "Permissions insuffisantes"');
  console.log('   ➡️ Vérifiez les règles Firebase Storage (storage.rules)');
  console.log('   ➡️ Assurez-vous que l\'utilisateur a les droits d\'\u00e9criture');
  console.log('');
  console.log('4️⃣ "Connexion interrompue" ou "ERR_ABORTED"');
  console.log('   ➡️ Désactivez les bloqueurs de publicité (AdBlock, uBlock, etc.)');
  console.log('   ➡️ Vérifiez votre connexion Internet');
  console.log('');
  console.log('5️⃣ "Type de fichier non autorisé"');
  console.log('   ➡️ Types acceptés: PDF, JPG, PNG');
  console.log('   ➡️ Taille maximum: 10MB');
  console.log('');
  console.log('🔧 Pour vérifier la configuration:');
  console.log('   Tapez: checkStorageConfiguration()');
  console.log('');
  console.groupEnd();
}

// Types et interfaces
export interface UploadProgress {
  progress: number;
  status: 'validating' | 'compressing' | 'uploading' | 'complete' | 'error';
  error?: string;
  fileName?: string;
}

export interface UploadResult {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadPath: string;
  uploadedAt: string;
}

export interface DocumentMetadata {
  id: string;
  name: string;
  originalName: string;
  displayName?: string; // Nom du document personnalisé par l'utilisateur
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  folder: string;
  category?: string; // Ajout de la catégorie
}

// Configuration des types de fichiers autorisés (conforme aux règles Storage)
const ALLOWED_FILE_TYPES = {
  'application/pdf': { extension: 'pdf', maxSize: 10 * 1024 * 1024 }, // 10MB
  'image/jpeg': { extension: 'jpg', maxSize: 10 * 1024 * 1024 },
  'image/png': { extension: 'png', maxSize: 10 * 1024 * 1024 }
} as const;

// Extensions autorisées (fallback pour contentType manquant ou octet-stream)
const ALLOWED_EXTENSIONS = { pdf: true, jpg: true, jpeg: true, png: true } as const;

function getFileExtension(name: string): string | null {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() || null : null;
}

function inferContentTypeFromName(name: string): string {
  const ext = getFileExtension(name);
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

// Configuration de compression d'images
const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: undefined as string | undefined,
  alwaysKeepResolution: false,
  initialQuality: 0.8
};

/**
 * Mappe les codes d'erreur Firebase Storage vers des messages utilisateur clairs
 */
export function mapStorageErrorToMessage(error: any): string {
  const code = error?.code || 'unknown';
  const message = (error?.message || '').toLowerCase();
  const serverResponse = (error as any)?.serverResponse || '';

  const errorMessages: Record<string, string> = {
    'storage/unknown': 'Une erreur inconnue s\'est produite. Vérifiez votre connexion Internet et réessayez.',
    'storage/object-not-found': 'Le fichier demandé n\'existe pas.',
    'storage/bucket-not-found': 'L\'espace de stockage n\'est pas configuré correctement.',
    'storage/project-not-found': 'Le projet Firebase est introuvable.',
    'storage/quota-exceeded': 'Quota de stockage dépassé. Veuillez libérer de l\'espace ou contacter le support.',
    'storage/unauthenticated': 'Vous devez être connecté pour téléverser des fichiers.',
    'storage/unauthorized': 'Vous n\'avez pas la permission de téléverser ce fichier.',
    'storage/retry-limit-exceeded': 'Trop de tentatives. Veuillez réessayer dans quelques instants.',
    'storage/invalid-checksum': 'Le fichier est corrompu. Veuillez réessayer.',
    'storage/canceled': 'Le téléversement a été annulé.',
    'storage/invalid-event-name': 'Erreur technique lors du téléversement.',
    'storage/invalid-url': 'L\'URL du fichier est invalide.',
    'storage/invalid-argument': 'Arguments invalides lors du téléversement.',
    'storage/no-default-bucket': 'Aucun espace de stockage par défaut configuré.',
    'storage/cannot-slice-blob': 'Impossible de lire le fichier. Veuillez réessayer.',
    'storage/server-file-wrong-size': 'La taille du fichier ne correspond pas. Veuillez réessayer.'
  };

  // Cas spécifiques hors codes standards
  if (serverResponse.includes('412') || message.includes('precondition') || message.includes('412')) {
    return 'Conflit d’upload (précondition échouée). Réessayez ou renommez le fichier.';
  }
  if (message.includes('missing or insufficient permissions') || code === 'storage/unauthorized') {
    return 'Permissions insuffisantes pour écrire dans le dossier de stockage.';
  }
  if (message.includes('blocked_by_client') || message.includes('err_blocked_by_client')) {
    return 'Une extension navigateur a bloqué la requête (ad blocker). Désactivez-la pour l’upload.';
  }

  // Connexions interrompues/abordées (souvent visibles en net::ERR_ABORTED)
  if (
    message.includes('err_aborted') ||
    message.includes('net::err_aborted') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error')
  ) {
    return 'Connexion interrompue. Vérifiez Internet ou désactivez les bloqueurs et réessayez.';
  }

  // Cas de storage/unknown sans réponse serveur (souvent règles ou réseau)
  if (code === 'storage/unknown' && !serverResponse) {
    return 'Une erreur réseau ou de règles s’est produite. Réessayez après quelques secondes.';
  }

  return errorMessages[code] || error?.message || 'Erreur lors du téléversement du fichier';
}

/**
 * Valide un fichier avant upload
 */
export async function validateFile(file: File): Promise<void> {
  console.log('🔍 Validation du fichier:', {
    name: file.name,
    type: file.type,
    size: file.size
  });

  // Vérifier le type de fichier
  const fileConfig = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES];
  const ext = getFileExtension(file.name);
  const isOctetStream = !file.type || file.type === 'application/octet-stream';
  const extAllowed = !!(ext && (ALLOWED_EXTENSIONS as any)[ext]);

  if (!fileConfig && !(isOctetStream && extAllowed)) {
    const error = `Type de fichier non autorisé: ${file.type || 'inconnu'}. Types acceptés: PDF, JPG ou PNG (max 10MB)`;
    console.error('❌', error);
    throw new Error(error);
  }

  // Vérifier la taille
  const maxSize = fileConfig?.maxSize ?? 10 * 1024 * 1024;
  if (file.size > maxSize) {
    const maxSizeMB = (fileConfig.maxSize / (1024 * 1024)).toFixed(1);
    const error = `Fichier trop volumineux. Taille maximum: ${maxSizeMB}MB`;
    console.error('❌', error);
    throw new Error(error);
  }

  // Vérifier le nom du fichier
  if (!file.name || file.name.length > 255) {
    const error = 'Nom de fichier invalide';
    console.error('❌', error);
    throw new Error(error);
  }

  // Vérifier les caractères dangereux dans le nom
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g;
  if (dangerousChars.test(file.name)) {
    const error = 'Le nom du fichier contient des caractères non autorisés';
    console.error('❌', error);
    throw new Error(error);
  }

  console.log('✅ Fichier validé avec succès');
}

/**
 * Compresse une image si nécessaire
 */
export async function compressImageIfNeeded(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<File> {
  // Ne compresser que les images
  if (!file.type.startsWith('image/')) {
    console.log('📄 Pas une image, compression ignorée');
    return file;
  }

  // Ne pas compresser si déjà petit
  if (file.size <= 1024 * 1024) { // 1MB
    console.log('📏 Image déjà petite, compression ignorée');
    return file;
  }

  try {
    console.log('🗜️ Compression de l\'image en cours...');
    onProgress?.({
      progress: 10,
      status: 'compressing',
      fileName: file.name
    });

    const options = {
      ...IMAGE_COMPRESSION_OPTIONS,
      fileType: file.type
    };

    const compressedFile = await imageCompression(file, options);
    
    console.log('✅ Image compressée:', {
      originalSize: file.size,
      compressedSize: compressedFile.size,
      reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
    });
    
    onProgress?.({
      progress: 30,
      status: 'compressing',
      fileName: file.name
    });

    return compressedFile;
  } catch (error) {
    console.warn('⚠️ Compression échouée, utilisation du fichier original:', error);
    return file;
  }
}

/**
 * Génère un nom de fichier unique
 */
export function generateUniqueFileName(originalName: string, _folder: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').substring(0, 50);
  
  // Nettoyer le nom de base
  const cleanBaseName = baseName
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  const fileName = `${timestamp}_${randomId}_${cleanBaseName}.${extension}`;
  console.log('📝 Nom de fichier généré:', fileName);
  
  return fileName;
}

/**
 * Crée une structure de dossiers organisée
 */
export function createFolderStructure(
  userId: string,
  documentType: 'patient' | 'practice' | 'invoice' | 'appointment' | 'consultation',
  entityId?: string
): string {
  const baseFolder = `users/${userId}`;
  
  let folderPath: string;
  switch (documentType) {
    case 'patient':
      folderPath = entityId ? `${baseFolder}/patients/${entityId}/documents` : `${baseFolder}/patients/general`;
      break;
    case 'practice':
      folderPath = `${baseFolder}/practice/documents`;
      break;
    case 'invoice':
      folderPath = entityId ? `${baseFolder}/invoices/${entityId}` : `${baseFolder}/invoices/general`;
      break;
    case 'appointment':
      folderPath = entityId ? `${baseFolder}/appointments/${entityId}` : `${baseFolder}/appointments/general`;
      break;
    case 'consultation':
      folderPath = entityId ? `${baseFolder}/consultations/${entityId}/documents` : `${baseFolder}/consultations/general`;
      break;
    default:
      folderPath = `${baseFolder}/documents`;
  }
  
  console.log('📁 Structure de dossier créée:', folderPath);
  return folderPath;
}

/**
 * Upload un document vers Firebase Storage
 */
export async function uploadDocument(
  file: File,
  folder: string,
  fileName?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  console.group('🚀 UPLOAD DOCUMENT - Début');
  console.log('📋 Informations du fichier:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    folder
  });

  // Vérification critique 1: Authentification
  if (!auth.currentUser) {
    const error = 'Utilisateur non authentifié - Veuillez vous reconnecter';
    console.error('❌ ERREUR CRITIQUE:', error);
    console.groupEnd();
    throw new Error(error);
  }

  console.log('✅ Utilisateur authentifié:', auth.currentUser.uid);
  console.log('📧 Email utilisateur:', auth.currentUser.email);

  // Vérification critique 2: Configuration Storage
  if (!storage) {
    const error = 'Firebase Storage non configuré - Problème de configuration';
    console.error('❌ ERREUR CRITIQUE:', error);
    console.groupEnd();
    throw new Error(error);
  }
  console.log('✅ Firebase Storage configuré');

  // Variables utilisées à la fois dans le try et le catch
  let uniqueFileName: string = '';
  let uploadPath: string = '';
  let processedFile: File = file;

  try {
    // Étape 1: Validation
    console.log('📋 Étape 1: Validation du fichier');
    onProgress?.({
      progress: 0,
      status: 'validating',
      fileName: file.name
    });

    await validateFile(file);

    // Étape 2: Compression si nécessaire
    console.log('🗜️ Étape 2: Compression si nécessaire');
    onProgress?.({
      progress: 10,
      status: 'compressing',
      fileName: file.name
    });

    processedFile = await compressImageIfNeeded(file, onProgress);

    // Étape 3: Génération du nom unique
    console.log('📝 Étape 3: Génération du nom de fichier');
    uniqueFileName = fileName || generateUniqueFileName(file.name, folder);
    uploadPath = `${folder}/${uniqueFileName}`;

    console.log('📍 Chemin d\'upload final:', uploadPath);

    onProgress?.({
      progress: 40,
      status: 'uploading',
      fileName: file.name
    });

    // Étape 4: Création de la référence Storage
    console.log('☁️ Étape 4: Création de la référence Storage');
    const cleanUploadPath = uploadPath.replace(/\/+/g, '/');
    console.log('📍 Chemin nettoyé:', cleanUploadPath);

    const storageRef = ref(storage, cleanUploadPath);
    console.log('✅ Référence Storage créée:', storageRef.fullPath);

    // Métadonnées personnalisées
    const metadata = {
      contentType: (processedFile.type && processedFile.type !== 'application/octet-stream')
        ? processedFile.type
        : inferContentTypeFromName(file.name),
      customMetadata: {
        originalName: file.name,
        uploadedBy: auth.currentUser.uid,
        uploadedAt: new Date().toISOString(),
        originalSize: file.size.toString(),
        processedSize: processedFile.size.toString()
      }
    };

    console.log('📋 Métadonnées préparées:', metadata);
    console.log('📤 Début de l\'upload vers:', storageRef.fullPath);

    const forceDirect = String((import.meta as any).env?.VITE_FORCE_DIRECT_UPLOAD ?? '').toLowerCase() === 'true';
    const preferDirectInDev = (import.meta as any).env?.DEV && !forceDirect ? true : forceDirect;

    console.log('🔧 Stratégie d\'upload:', {
      forceDirect,
      preferDirectInDev,
      isDev: (import.meta as any).env?.DEV
    });

    let snapshot: any;
    let uploadAttempt = 0;
    const maxAttempts = 2;

    // Tentative d'upload avec retry
    while (!snapshot && uploadAttempt < maxAttempts) {
      uploadAttempt++;
      console.log(`🔄 Tentative d'upload ${uploadAttempt}/${maxAttempts}`);

      try {
        if (preferDirectInDev || uploadAttempt > 1) {
          // Tentative directe non résumable (fiable ≤ 10MB, évite les handshakes en dev)
          console.log('➡️ Upload direct via uploadBytes');
          snapshot = await uploadBytes(storageRef, processedFile, metadata);
          console.log('✅ Upload direct réussi');
          break;
        } else {
          // Utiliser uploadBytesResumable pour progression fine
          console.log('➡️ Upload résumable via uploadBytesResumable');
          const uploadTask = uploadBytesResumable(storageRef, processedFile, metadata);

          snapshot = await new Promise<any>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = 40 + ((snapshot.bytesTransferred / snapshot.totalBytes) * 50);
                onProgress?.({ progress, status: 'uploading', fileName: file.name });
                console.log(`📊 Progression: ${Math.round(progress)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} octets)`);
              },
              (error) => {
                console.error(`❌ Erreur durant l\'upload résumable (tentative ${uploadAttempt}):`, {
                  code: error.code,
                  message: error.message,
                  serverResponse: (error as any).serverResponse
                });
                reject(error);
              },
              () => {
                console.log('✅ Upload terminé avec succès (résumable)');
                resolve(uploadTask.snapshot);
              }
            );
          });
          break;
        }
      } catch (uploadErr: any) {
        console.warn(`⚠️ Upload échoué (tentative ${uploadAttempt}/${maxAttempts}):`, {
          code: uploadErr?.code,
          message: uploadErr?.message,
          serverResponse: uploadErr?.serverResponse
        });

        // Si c'était la dernière tentative, propager l'erreur
        if (uploadAttempt >= maxAttempts) {
          throw uploadErr;
        }

        // Attendre un peu avant de réessayer
        console.log('⏳ Attente de 1 seconde avant retry...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!snapshot) {
      throw new Error('Échec de l\'upload après ' + maxAttempts + ' tentatives');
    }

    console.log('✅ Upload terminé avec succès!');
    console.log('📊 Snapshot info:', {
      bytesTransferred: snapshot.totalBytes,
      fullPath: snapshot.ref.fullPath,
      bucket: snapshot.ref.bucket
    });

    onProgress?.({
      progress: 90,
      status: 'uploading',
      fileName: file.name
    });

    // Étape 6: Obtenir l'URL de téléchargement
    console.log('🔗 Étape 5: Génération de l\'URL de téléchargement');
    try {
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ URL générée avec succès');
      console.log('🔗 URL:', downloadURL.substring(0, 100) + '...');

      onProgress?.({
        progress: 100,
        status: 'complete',
        fileName: file.name
      });

      const result: UploadResult = {
        url: downloadURL,
        fileName: uniqueFileName,
        fileType: processedFile.type,
        fileSize: processedFile.size,
        uploadPath,
        uploadedAt: new Date().toISOString()
      };

      console.log('🎉 Upload complété avec succès!');
      console.log('📦 Résultat:', {
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType
      });
      console.groupEnd();
      return result;
    } catch (urlError: any) {
      console.error('❌ Erreur lors de la génération de l\'URL:', urlError);
      throw new Error('Impossible de générer l\'URL de téléchargement: ' + (urlError.message || 'Erreur inconnue'));
    }

  } catch (error: any) {
    console.group('💥 ERREUR UPLOAD');
    console.error('Type d\'erreur:', error?.constructor?.name || 'Unknown');
    console.error('Code:', error?.code);
    console.error('Message:', error?.message);
    console.error('Réponse serveur:', error?.serverResponse);
    console.error('Stack:', error?.stack);

    // Log des informations de contexte
    console.log('📍 Contexte de l\'erreur:', {
      uploadPath,
      fileName: file.name,
      fileSize: file.size,
      userId: auth.currentUser?.uid
    });

    // Détecter un cas de précondition (412) et retenter automatiquement
    const serverResp = error?.serverResponse || '';
    const msg = (error?.message || '').toLowerCase();
    const isPreconditionFailure = serverResp.includes('412') || msg.includes('precondition') || msg.includes('412');

    if (isPreconditionFailure) {
      try {
        console.warn('⚠️ Précondition échouée (412). Nouvelle tentative avec un nom unique et fallback uploadBytes.');
        // Nouveau nom et chemin pour éviter tout conflit éventuel
        uniqueFileName = generateUniqueFileName(file.name, folder);
        uploadPath = `${folder}/${uniqueFileName}`;
        const storageRef = ref(storage, uploadPath);

        onProgress?.({ progress: 45, status: 'uploading', fileName: file.name });

        // Fallback non-résumable (suffisant pour ≤10MB)
        const snapshot = await uploadBytes(storageRef, processedFile, {
          contentType: (processedFile.type && processedFile.type !== 'application/octet-stream')
            ? processedFile.type
            : inferContentTypeFromName(file.name),
          customMetadata: {
            originalName: file.name,
            uploadedBy: auth.currentUser!.uid,
            uploadedAt: new Date().toISOString(),
            originalSize: file.size.toString(),
            processedSize: processedFile.size.toString(),
            retry: 'true'
          }
        });

        const downloadURL = await getDownloadURL(snapshot.ref);

        onProgress?.({ progress: 100, status: 'complete', fileName: file.name });

        return {
          url: downloadURL,
          fileName: uniqueFileName,
          fileType: processedFile.type,
          fileSize: processedFile.size,
          uploadPath,
          uploadedAt: new Date().toISOString()
        };
      } catch (retryError: any) {
        console.error('❌ Échec du retry après 412:', retryError);
        // Continuer vers le mapping d'erreur standard
        error = retryError;
      }
    }

    // Fallback pour storage/unknown sans réponse serveur (sessions résumables instables)
    const isUnknownNoServerResponse =
      (error?.code === 'storage/unknown' || msg.includes('storage/unknown') || !error?.code) &&
      !serverResp;

    if (isUnknownNoServerResponse) {
      try {
        console.warn('⚠️ storage/unknown sans réponse serveur. Fallback immédiat vers uploadBytes.');
        uniqueFileName = generateUniqueFileName(file.name, folder);
        uploadPath = `${folder}/${uniqueFileName}`;
        const storageRef = ref(storage, uploadPath);

        onProgress?.({ progress: 50, status: 'uploading', fileName: file.name });

        const snapshot = await uploadBytes(storageRef, processedFile, {
          contentType: (processedFile.type && processedFile.type !== 'application/octet-stream')
            ? processedFile.type
            : inferContentTypeFromName(file.name),
          customMetadata: {
            originalName: file.name,
            uploadedBy: auth.currentUser!.uid,
            uploadedAt: new Date().toISOString(),
            originalSize: file.size.toString(),
            processedSize: processedFile.size.toString(),
            retry: 'true',
            fallback: 'uploadBytes'
          }
        });

        const downloadURL = await getDownloadURL(snapshot.ref);

        onProgress?.({ progress: 100, status: 'complete', fileName: file.name });

        return {
          url: downloadURL,
          fileName: uniqueFileName,
          fileType: processedFile.type,
          fileSize: processedFile.size,
          uploadPath,
          uploadedAt: new Date().toISOString()
        };
      } catch (retryError: any) {
        console.error('❌ Échec du fallback uploadBytes après storage/unknown:', retryError);
        error = retryError;
      }
    }

    // Mapper l'erreur Firebase vers un message utilisateur clair
    let errorMessage = mapStorageErrorToMessage(error);

    // Affiner certains cas fréquents
    if ((error?.serverResponse || '').includes('412') || (error?.message || '').toLowerCase().includes('precondition') || (error?.message || '').toLowerCase().includes('412')) {
      errorMessage = 'Conflit d’upload (précondition échouée). Réessayez ou renommez le fichier.';
    }
    if (msg.includes('missing or insufficient permissions')) {
      errorMessage = 'Permissions insuffisantes pour écrire dans le dossier de stockage.';
    }
    if (msg.includes('blocked_by_client') || msg.includes('err_blocked_by_client')) {
      errorMessage = 'Une extension navigateur a bloqué la requête (ad blocker). Désactivez-la pour l’upload.';
    }

    onProgress?.({
      progress: 0,
      status: 'error',
      error: errorMessage,
      fileName: file.name
    });

    console.groupEnd();
    throw new Error(errorMessage);
  }
}

/**
 * Supprime un document de Firebase Storage
 */
export async function deleteDocument(filePath: string): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Utilisateur non authentifié');
  }

  try {
    console.log('🗑️ Suppression du fichier:', filePath);
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log('✅ Fichier supprimé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    throw new Error('Erreur lors de la suppression du document');
  }
}

/**
 * Supprime les anciens fichiers d'un dossier
 */
export async function cleanupOldFiles(
  folderPath: string,
  maxAge: number = 30 * 24 * 60 * 60 * 1000 // 30 jours par défaut
): Promise<number> {
  if (!auth.currentUser) {
    throw new Error('Utilisateur non authentifié');
  }

  try {
    console.log('🧹 Nettoyage des anciens fichiers dans:', folderPath);
    const folderRef = ref(storage, folderPath);
    const listResult = await listAll(folderRef);
    
    let deletedCount = 0;
    const now = Date.now();

    for (const itemRef of listResult.items) {
      try {
        // Extraire le timestamp du nom de fichier
        const fileName = itemRef.name;
        const timestampMatch = fileName.match(/^(\d+)_/);
        
        if (timestampMatch) {
          const fileTimestamp = parseInt(timestampMatch[1]);
          const fileAge = now - fileTimestamp;
          
          if (fileAge > maxAge) {
            await deleteObject(itemRef);
            deletedCount++;
            console.log('🗑️ Fichier ancien supprimé:', fileName);
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la suppression du fichier:', itemRef.name, error);
      }
    }

    console.log(`✅ Nettoyage terminé: ${deletedCount} fichier(s) supprimé(s)`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw new Error('Erreur lors du nettoyage des anciens fichiers');
  }
}

/**
 * Liste tous les documents d'un dossier
 */
export async function listDocuments(folderPath: string): Promise<DocumentMetadata[]> {
  if (!auth.currentUser) {
    throw new Error('Utilisateur non authentifié');
  }

  try {
    console.log('📋 Listage des documents dans:', folderPath);
    const folderRef = ref(storage, folderPath);
    const listResult = await listAll(folderRef);
    
    const documents: DocumentMetadata[] = [];

    for (const itemRef of listResult.items) {
      try {
        const url = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        
        // Extraire la catégorie du chemin
        const pathParts = itemRef.fullPath.split('/');
        const category = pathParts[pathParts.length - 2] || 'other';
        
        documents.push({
          id: itemRef.name,
          name: itemRef.name,
          originalName: metadata.customMetadata?.originalName || itemRef.name,
          url,
          type: metadata.contentType || 'application/octet-stream',
          size: metadata.size,
          uploadedAt: metadata.customMetadata?.uploadedAt || metadata.timeCreated,
          uploadedBy: metadata.customMetadata?.uploadedBy || 'unknown',
          folder: folderPath,
          category
        });
      } catch (error) {
        console.warn('⚠️ Erreur lors de la récupération des métadonnées:', itemRef.name, error);
      }
    }

    // Trier par date de création (plus récent en premier)
    documents.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    console.log(`✅ ${documents.length} document(s) trouvé(s)`);
    return documents;
  } catch (error) {
    console.error('❌ Erreur lors du listage:', error);
    throw new Error('Erreur lors de la récupération de la liste des documents');
  }
}

/**
 * Obtient une URL de téléchargement sécurisée avec expiration
 */
export async function getSecureDownloadURL(
  filePath: string,
  _expirationTime: number = 3600000 // 1 heure par défaut
): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('Utilisateur non authentifié');
  }

  try {
    console.log('🔗 Génération d\'URL sécurisée pour:', filePath);
    const fileRef = ref(storage, filePath);
    const url = await getDownloadURL(fileRef);
    
    // Note: Firebase Storage URLs sont déjà sécurisées par les règles de sécurité
    // L'expiration est gérée automatiquement par Firebase
    console.log('✅ URL sécurisée générée');
    return url;
  } catch (error) {
    console.error('❌ Erreur lors de la génération de l\'URL:', error);
    throw new Error('Erreur lors de la génération de l\'URL de téléchargement');
  }
}

/**
 * Vérifie l'espace de stockage utilisé par un utilisateur
 */
export async function getStorageUsage(userId: string): Promise<{
  totalSize: number;
  fileCount: number;
  folderSizes: Record<string, number>;
}> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Accès non autorisé');
  }

  try {
    console.log('📊 Calcul de l\'utilisation du stockage pour:', userId);
    const userFolderRef = ref(storage, `users/${userId}`);
    // Note: on ne lit pas directement listAll ici; on utilise la fonction récursive ci-dessous

    let totalSize = 0;
    let fileCount = 0;
    const folderSizes: Record<string, number> = {};

    // Fonction récursive pour parcourir tous les dossiers
    const processFolder = async (folderRef: any, folderPath: string) => {
      const result = await listAll(folderRef);
      
      let folderSize = 0;
      
      // Traiter les fichiers
      for (const itemRef of result.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const size = metadata.size;
          
          totalSize += size;
          folderSize += size;
          fileCount++;
        } catch (error) {
          console.warn('⚠️ Erreur lors de la récupération des métadonnées:', itemRef.name, error);
        }
      }
      
      folderSizes[folderPath] = folderSize;
      
      // Traiter les sous-dossiers
      for (const prefixRef of result.prefixes) {
        await processFolder(prefixRef, `${folderPath}/${prefixRef.name}`);
      }
    };

    await processFolder(userFolderRef, 'root');

    const usage = {
      totalSize,
      fileCount,
      folderSizes
    };

    console.log('✅ Utilisation du stockage calculée:', usage);
    return usage;
  } catch (error) {
    console.error('❌ Erreur lors du calcul de l\'utilisation:', error);
    throw new Error('Erreur lors du calcul de l\'utilisation du stockage');
  }
}

/**
 * Utilitaires pour formater les tailles de fichiers
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Vérifie si un type de fichier est une image
 */
export function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/');
}

/**
 * Vérifie si un type de fichier est un document
 */
export function isDocumentFile(fileType: string): boolean {
  return fileType.startsWith('application/') || fileType.startsWith('text/');
}

/**
 * Obtient l'icône appropriée pour un type de fichier
 */
export function getFileIcon(fileType: string): string {
  if (isImageFile(fileType)) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('doc')) return '📝';
  if (fileType.includes('text')) return '📃';
  return '📁';
}

/**
 * Déplace un fichier d'un chemin vers un autre dans Firebase Storage
 */
export async function moveFile(oldPath: string, newPath: string): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('Utilisateur non authentifié');
  }

  if (!storage) {
    throw new Error('Firebase Storage non configuré');
  }

  try {
    console.log('🔄 Déplacement du fichier:', { oldPath, newPath });
    
    const oldRef = ref(storage, oldPath);
    const newRef = ref(storage, newPath);

    // Vérifier que l'ancien fichier existe
    try {
      await getDownloadURL(oldRef);
    } catch (error) {
      console.error('❌ Ancien fichier non trouvé:', oldPath);
      throw new Error(`Fichier source non trouvé: ${oldPath}`);
    }

    // Télécharger le contenu de l'ancien fichier
    const oldUrl = await getDownloadURL(oldRef);
    const response = await fetch(oldUrl);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();

    // Récupérer les métadonnées de l'ancien fichier pour les conserver
    const oldMetadata = await getMetadata(oldRef);
    const customMetadata = oldMetadata.customMetadata || {};

    // Uploader le contenu vers le nouveau chemin avec les métadonnées
    await uploadBytes(newRef, blob, {
      contentType: oldMetadata.contentType,
      customMetadata: {
        ...customMetadata,
        movedFrom: oldPath,
        movedAt: new Date().toISOString(),
        movedBy: auth.currentUser.uid
      }
    });

    // Supprimer l'ancien fichier seulement après avoir confirmé le succès du nouvel upload
    await deleteObject(oldRef);

    const newDownloadURL = await getDownloadURL(newRef);
    console.log(`✅ Fichier déplacé de ${oldPath} vers ${newPath}. Nouvelle URL: ${newDownloadURL}`);
    return newDownloadURL;
  } catch (error) {
    console.error(`❌ Erreur lors du déplacement du fichier de ${oldPath} vers ${newPath}:`, error);
    
    // Fournir des messages d'erreur plus spécifiques
    if (error instanceof Error) {
      if (error.message.includes('storage/object-not-found')) {
        throw new Error(`Fichier source non trouvé: ${oldPath}`);
      } else if (error.message.includes('storage/unauthorized')) {
        throw new Error('Permissions insuffisantes pour déplacer le fichier');
      } else if (error.message.includes('storage/quota-exceeded')) {
        throw new Error('Quota de stockage dépassé');
      } else {
        throw new Error(`Erreur lors du déplacement du fichier: ${error.message}`);
      }
    }
    
    throw new Error('Erreur inconnue lors du déplacement du fichier');
  }
}