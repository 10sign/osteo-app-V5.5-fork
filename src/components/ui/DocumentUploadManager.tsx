import React, { useState, useRef, useCallback, useEffect, useId } from 'react';
import { Upload, FileText, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import {
  uploadDocument,
  deleteDocument,
  formatFileSize,
  isImageFile,
  DocumentMetadata,
  validateFile,
  checkStorageConfiguration,
  printUploadDiagnostic
} from '../../utils/documentStorage';
import { mapStorageErrorToMessage } from '../../utils/documentStorage';
import { auth } from '../../firebase/config';

interface DocumentUploadManagerProps {
  onUploadSuccess: (documents: DocumentMetadata[]) => void;
  onUploadError: (error: string) => void;
  patientId: string;
  initialDocuments?: DocumentMetadata[];
  className?: string;
  disabled?: boolean;
  // Nouveaux props pour la flexibilité
  entityType?: 'patient' | 'consultation';
  entityId?: string;
  customFolderPath?: string;
}

export const DOCUMENT_CATEGORIES = [
  { value: 'prescription', label: 'Ordonnance' },
  { value: 'report', label: 'Compte-rendu' },
  { value: 'imaging', label: 'Imagerie' },
  { value: 'analysis', label: 'Analyse' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'other', label: 'Autre' }
];

interface UploadingFile {
  file: File;
  progress: number;
  status: 'validating' | 'compressing' | 'uploading' | 'complete' | 'error';
  error?: string;
  category: string;
  displayName?: string;
}

const DocumentUploadManager: React.FC<DocumentUploadManagerProps> = ({
  onUploadSuccess,
  onUploadError,
  patientId,
  initialDocuments = [],
  className = "",
  disabled = false,
  entityType = 'patient',
  entityId,
  customFolderPath
}) => {
  const baseId = useId();
  const documentNameId = `${baseId}-document-name`;
  const fileInputId = `${baseId}-file-input`;
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>(initialDocuments);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0].value);
  const [documentName, setDocumentName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Vérifier la configuration Storage au montage
  useEffect(() => {
    console.log('📝 DocumentUploadManager monté avec:', {
      patientId,
      entityType,
      entityId,
      customFolderPath,
      disabled
    });

    const storageCheck = checkStorageConfiguration();
    if (!storageCheck.isValid) {
      console.error('❌ Problème de configuration Storage:', storageCheck.error);
      console.log('💡 Pour plus d\'aide, tapez: printUploadDiagnostic()');
      setStorageError(storageCheck.error || 'Erreur de configuration Storage');
      onUploadError(storageCheck.error || 'Erreur de configuration Storage');
    } else {
      console.log('✅ Configuration Storage validée');
      setStorageError(null);
    }

    // Exposer la fonction de diagnostic globalement pour débogage
    (window as any).printUploadDiagnostic = printUploadDiagnostic;
    (window as any).checkStorageConfig = checkStorageConfiguration;

    return () => {
      // Nettoyer les fonctions globales au démontage
      delete (window as any).printUploadDiagnostic;
      delete (window as any).checkStorageConfig;
    };
  }, [patientId, entityType, entityId, customFolderPath, disabled]);

  // Synchronize documents state with initialDocuments prop
  useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      console.log('📄 Synchronizing documents from initialDocuments:', initialDocuments.length);
      setDocuments(initialDocuments);
    }
  }, [initialDocuments]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      console.warn('⚠️ Aucun fichier sélectionné');
      return;
    }

    if (!auth.currentUser) {
      console.error('❌ Utilisateur non authentifié');
      onUploadError('Vous devez être connecté pour uploader des fichiers');
      return;
    }

    console.log('📂 Fichiers sélectionnés:', event.target.files.length);

    const files = Array.from(event.target.files);

    // Valider et nettoyer le nom du document
    const cleanedDisplayName = documentName.trim();
    const finalDisplayName = cleanedDisplayName || undefined;

    // Pré-validation locale avant upload (types/tailles)
    const validatedFiles: { file: File; error?: string }[] = await Promise.all(
      files.map(async (file) => {
        try {
          await validateFile(file);
          return { file };
        } catch (e: any) {
          return { file, error: e?.message || 'Fichier invalide' };
        }
      })
    );

    // Ajouter les fichiers à la liste des uploads en cours avec état initial
    const newUploadingFiles = validatedFiles.map(({ file, error }) => ({
      file,
      progress: 0,
      status: error ? ('error' as const) : ('validating' as const),
      error,
      category: selectedCategory,
      displayName: finalDisplayName || file.name.replace(/\.[^/.]+$/, '') // Par défaut : nom sans extension
    }));

    setUploadingFiles(prev => {
      const updatedFiles = [...prev, ...newUploadingFiles];
      
      // Traiter chaque fichier avec les bons index
      validatedFiles.forEach(({ file, error }, index) => {
        const uploadIndex = prev.length + index; // Index correct dans le tableau global
        const fileDisplayName = newUploadingFiles[index].displayName;
        if (!error) {
          processFile(file, selectedCategory, uploadIndex, fileDisplayName);
        }
      });
      
      return updatedFiles;
    });

    // Réinitialiser le nom du document et l'input après upload
    setDocumentName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedCategory, documentName, patientId]);

  const processFile = async (file: File, category: string, index: number, displayName?: string) => {
    if (!auth.currentUser) {
      console.error('❌ Utilisateur non authentifié');
      updateFileError(index, 'Vous devez être connecté pour uploader des fichiers');
      return;
    }

    try {
      // Créer le chemin du dossier selon le type d'entité
      let folderPath: string;

      console.log('📋 Configuration upload:', {
        customFolderPath,
        entityType,
        entityId,
        patientId,
        category
      });

      if (customFolderPath) {
        folderPath = customFolderPath;
        console.log('✅ Utilisation du chemin personnalisé:', folderPath);
      } else if (entityType === 'consultation' && entityId) {
        folderPath = `users/${auth.currentUser.uid}/consultations/${entityId}/documents`;
        console.log('✅ Chemin consultation avec ID:', folderPath);
      } else if (entityType === 'consultation' && !entityId) {
        // Générer un ID temporaire unique pour les consultations non encore créées
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        folderPath = `users/${auth.currentUser.uid}/consultations/${tempId}/documents`;
        console.log('⚠️ Chemin consultation temporaire:', folderPath);
      } else {
        folderPath = `users/${auth.currentUser.uid}/patients/${patientId}/documents/${category}`;
        console.log('✅ Chemin patient:', folderPath);
      }

      // Vérification du chemin avant upload
      if (!folderPath || folderPath.includes('undefined') || folderPath.includes('null')) {
        throw new Error('Chemin d\'upload invalide. Vérifiez la configuration.');
      }

      console.log('🚀 Démarrage de l\'upload vers:', folderPath);

      // Mettre à jour le statut
      updateFileStatus(index, 'uploading', 10);

      // Uploader le document avec gestion d'erreur améliorée
      const result = await uploadDocument(
        file,
        folderPath,
        undefined,
        (progress) => {
          console.log(`📊 Progression upload (${index}):`, progress.progress, '%', progress.status);
          updateFileStatus(index, progress.status, progress.progress);
          if (progress.status === 'error') {
            console.error('❌ Erreur callback upload:', progress.error);
            updateFileError(index, progress.error || 'Erreur lors du téléversement');
          }
        }
      );

      console.log('✅ Upload réussi, résultat:', result);

      // Ajouter les métadonnées de catégorie et displayName
      const documentWithCategory: DocumentMetadata = {
        ...result,
        id: result.fileName,
        name: result.fileName,
        originalName: file.name,
        displayName: displayName, // Nom personnalisé du document
        url: result.url,
        type: file.type,
        size: result.fileSize,
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.currentUser.uid,
        folder: folderPath,
        category
      };
      
      // Mettre à jour la liste des documents
      setDocuments(prev => {
        const updatedDocuments = [...prev, documentWithCategory];
        // Notifier le parent avec la liste mise à jour
        onUploadSuccess(updatedDocuments);
        return updatedDocuments;
      });
      
      // Marquer comme terminé
      updateFileStatus(index, 'complete', 100);
      
      // Supprimer de la liste des uploads après 3 secondes
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter((_, i) => i !== index));
      }, 3000);
      
    } catch (error: any) {
      console.group('❌ Erreur processFile');
      console.error('Type:', error?.constructor?.name);
      console.error('Message:', error?.message);
      console.error('Code:', error?.code);
      console.error('Stack:', error?.stack);
      console.groupEnd();

      const errorMessage = mapStorageErrorToMessage(error);
      updateFileError(index, errorMessage);
      onUploadError(errorMessage);
    }
  };

  const updateFileStatus = (index: number, status: UploadingFile['status'], progress: number) => {
    setUploadingFiles(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, status, progress } : item
      )
    );
  };

  const updateFileError = (index: number, error: string) => {
    setUploadingFiles(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, status: 'error', error } : item
      )
    );
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    if (disabled) {
      console.warn('⚠️ Upload désactivé');
      return;
    }

    if (!event.dataTransfer.files.length) {
      console.warn('⚠️ Aucun fichier déposé');
      return;
    }

    if (!auth.currentUser) {
      console.error('❌ Utilisateur non authentifié');
      onUploadError('Vous devez être connecté pour uploader des fichiers');
      return;
    }

    console.log('📂 Fichiers déposés:', event.dataTransfer.files.length);

    const files = Array.from(event.dataTransfer.files);

    // Valider et nettoyer le nom du document
    const cleanedDisplayName = documentName.trim();
    const finalDisplayName = cleanedDisplayName || undefined;

    // Pré-validation locale avant upload (types/tailles)
    const validatedFiles: { file: File; error?: string }[] = await Promise.all(
      files.map(async (file) => {
        try {
          await validateFile(file);
          return { file };
        } catch (e: any) {
          return { file, error: e?.message || 'Fichier invalide' };
        }
      })
    );

    // Ajouter les fichiers à la liste des uploads en cours avec état initial
    const newUploadingFiles = validatedFiles.map(({ file, error }) => ({
      file,
      progress: 0,
      status: error ? ('error' as const) : ('validating' as const),
      error,
      category: selectedCategory,
      displayName: finalDisplayName || file.name.replace(/\.[^/.]+$/, '') // Par défaut : nom sans extension
    }));

    setUploadingFiles(prev => {
      const updatedFiles = [...prev, ...newUploadingFiles];
      
      // Traiter chaque fichier avec les bons index
      validatedFiles.forEach(({ file, error }, index) => {
        const uploadIndex = prev.length + index; // Index correct dans le tableau global
        const fileDisplayName = newUploadingFiles[index].displayName;
        if (!error) {
          processFile(file, selectedCategory, uploadIndex, fileDisplayName);
        }
      });
      
      return updatedFiles;
    });

    // Réinitialiser le nom du document après upload
    setDocumentName('');
  };

  const handleDeleteDocument = async (document: DocumentMetadata) => {
    if (!auth.currentUser) return;
    
    setIsDeleting(document.id);
    try {
      await deleteDocument(`${document.folder}/${document.name}`);
      
      // Mettre à jour la liste des documents
      const updatedDocuments = documents.filter(doc => doc.id !== document.id);
      setDocuments(updatedDocuments);
      
      // Notifier le parent
      onUploadSuccess(updatedDocuments);
      
    } catch (error) {
      console.error('Delete error:', error);
      onUploadError(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(null);
      setShowDeleteConfirm(null);
    }
  };

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'validating':
      case 'compressing':
      case 'uploading':
        return <Loader2 className="animate-spin" size={16} />;
      case 'complete':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return null;
    }
  };

  const getStatusText = (file: UploadingFile) => {
    switch (file.status) {
      case 'validating':
        return 'Validation...';
      case 'compressing':
        return 'Compression...';
      case 'uploading':
        return `Upload... ${Math.round(file.progress)}%`;
      case 'complete':
        return 'Terminé';
      case 'error':
        return file.error || 'Erreur';
      default:
        return '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Message d'information sur l'authentification */}
      {!auth.currentUser && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠️ Vous devez être connecté pour uploader des fichiers
        </div>
      )}

      {/* Message d'erreur de configuration Storage */}
      {storageError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-1">
                Problème de configuration
              </h4>
              <p className="text-sm text-red-700 mb-2">
                {storageError}
              </p>
              <details className="text-xs text-red-600">
                <summary className="cursor-pointer hover:text-red-800 font-medium">
                  Solutions possibles
                </summary>
                <ul className="mt-2 ml-4 space-y-1 list-disc">
                  <li>Vérifiez que vous êtes bien connecté</li>
                  <li>Vérifiez votre connexion Internet</li>
                  <li>Désactivez les bloqueurs de publicité (AdBlock, etc.)</li>
                  <li>Actualisez la page (F5)</li>
                  <li>Ouvrez la console navigateur (F12) pour plus de détails</li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Sélection de catégorie et zone de drop */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catégorie du document
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-full"
            disabled={disabled}
          >
            {DOCUMENT_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="w-full md:w-2/3">
          <label htmlFor={documentNameId} className="block text-sm font-medium text-gray-700 mb-1">
            Nom du document (optionnel)
          </label>
          <input
            id={documentNameId}
            name="documentName"
            type="text"
            value={documentName}
            onChange={(e) => {
              const value = e.target.value;
              // Filtrer les caractères de contrôle, autoriser accents et espaces
              const cleaned = value.replace(/[\x00-\x1F\x7F]/g, '');
              if (cleaned.length <= 120) {
                setDocumentName(cleaned);
              }
            }}
            placeholder="Ex: Ordonnance Dr. Martin du 15/12/2024"
            className="input w-full mb-3"
            disabled={disabled}
            maxLength={120}
            autoComplete="off"
          />

          <label htmlFor={fileInputId} className="block text-sm font-medium text-gray-700 mb-1">
            Téléverser un document
          </label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              dragOver
                ? 'border-primary-500 bg-primary-50'
                : disabled
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-primary-500 hover:bg-gray-50 cursor-pointer'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              disabled={disabled}
              id={fileInputId}
              name="consultationDocuments"
              autoComplete="off"
            />

            <div className="space-y-2">
              <Upload className={`mx-auto h-8 w-8 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
              <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
                {dragOver ? 'Déposez vos fichiers ici' : 'Cliquez ou glissez vos fichiers ici'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPG, PNG uniquement • Taille max 10MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des fichiers en cours d'upload */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Fichiers en cours de traitement</h4>
          {uploadingFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0">
                  {isImageFile(item.file.type) ? (
                    <ImageIcon size={20} className="text-blue-500" />
                  ) : (
                    <FileText size={20} className="text-gray-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.file.size)}
                    </p>
                    <span className="text-xs text-gray-400">•</span>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(item.status)}
                      <span className="text-xs text-gray-500">
                        {getStatusText(item)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  {(item.status === 'uploading' || item.status === 'compressing') && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-primary-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liste des documents déjà téléversés */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Documents téléversés</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {isImageFile(document.type) ? (
                      <ImageIcon size={20} className="text-blue-500" />
                    ) : (
                      <FileText size={20} className="text-gray-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {document.displayName || document.originalName || document.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(document.size)}
                      </p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500">
                        {DOCUMENT_CATEGORIES.find(c => c.value === document.category)?.label || 'Document'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                    title="Voir le document"
                  >
                    <Button variant="ghost" size="sm">
                      Voir
                    </Button>
                  </a>
                  
                  {showDeleteConfirm === document.id ? (
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(null)}
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(document)}
                        isLoading={isDeleting === document.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        Confirmer
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(document.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={isDeleting !== null}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informations d'aide */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Types acceptés: PDF, JPG, PNG</p>
        <p>• Taille maximum: 10MB par fichier</p>
        <p>• Les images sont automatiquement compressées si nécessaire</p>
      </div>
    </div>
  );
};

export default DocumentUploadManager;