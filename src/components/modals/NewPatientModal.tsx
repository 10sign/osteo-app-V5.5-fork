import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, X as XIcon, User, Calendar, Trash2, CheckCircle, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { Button } from '../ui/Button';
import { Patient, PatientFormData, TreatmentHistoryEntry } from '../../types';
import { validatePatientData } from '../../utils/validation';
import { ConsultationService } from '../../services/consultationService';
import { InvoiceService } from '../../services/invoiceService';
import AutoResizeTextarea from '../ui/AutoResizeTextarea';
import AutoCapitalizeInput from '../ui/AutoCapitalizeInput';
import { patientCache } from '../../utils/patientCache';
import DocumentUploadManager from '../ui/DocumentUploadManager';
import { DocumentMetadata } from '../../utils/documentStorage';
import { saveFormData, getFormData, clearFormData } from '../../utils/sessionPersistence';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PastAppointment {
  date: string;
  time: string;
  notes: string;
}

const COMMON_PATHOLOGIES = [
  'Lombalgie',
  'Cervicalgie',
  'Dorsalgie',
  'Sciatique',
  'Migraine',
  'Vertiges',
  'Entorse',
  'Tendinite',
  'Arthrose',
  'Scoliose',
  'Stress',
  'Troubles digestifs',
  'Troubles du sommeil'
];

const FORM_ID = 'new_patient_form';

export default function NewPatientModal({ isOpen, onClose, onSuccess }: NewPatientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [treatmentHistory, setTreatmentHistory] = useState<TreatmentHistoryEntry[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<DocumentMetadata[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasFormData, setHasFormData] = useState(false);

  const { register, handleSubmit, formState: { errors, isValid, isDirty }, reset, watch, setValue, trigger } = useForm<PatientFormData>({
    mode: 'onChange',
    // Remove defaultValues to ensure completely empty form
    // Values will be set explicitly in initializeFormWithEmptyData()
  });

  // Function to initialize form with empty data
  const initializeFormWithEmptyData = () => {
    console.log('Initializing form with empty data for new patient');
    
    // Initialize with completely empty data for new patient
    const emptyFormData: Partial<PatientFormData> = {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      profession: '',
      gender: '', // Ensure gender starts empty, not pre-selected
      email: '',
      address: '',
      phone: '',
      medicalHistory: '',
      insurance: '',
      insuranceNumber: '',
      notes: '',
      nextAppointment: '',
      nextAppointmentTime: '',
      currentTreatment: '',
      consultationReason: '',
      medicalAntecedents: '',
      osteopathicTreatment: ''
    };

    console.log('Setting empty form values:', emptyFormData);
    
    try {
      Object.entries(emptyFormData).forEach(([key, value]) => {
        setValue(key as any, value);
      });
    } catch (error) {
      console.error('Error setting empty form values:', error);
    }
  };

  // Load saved form data when modal opens
  useEffect(() => {
    if (isOpen) {
      // ALWAYS start with completely empty form for new patient creation
      // Clear any existing form data and initialize with empty values
      clearFormData(FORM_ID);
      initializeFormWithEmptyData();
      
      // Reset all state values to empty
      setSelectedTags([]);
      setTreatmentHistory([]);
      setPatientDocuments([]);
      setClickCount(0);
      setShowConfirmation(false);
      setHasFormData(false);
      
      console.log('New patient modal opened - form initialized with empty data');
    }
  }, [isOpen, trigger]);

  // Force validation trigger when form values change
  useEffect(() => {
    if (isOpen) {
      const subscription = watch(() => {
        // Trigger validation on any form change
        setTimeout(() => trigger(), 100);
      });
      return () => subscription.unsubscribe();
    }
  }, [isOpen, watch, trigger]);

  // Save form data periodically
  useEffect(() => {
    if (!isOpen) return;

    // Détecter si le formulaire contient des données
    const detectFormData = () => {
      const formData = watch();
      
      // Vérifier si des champs du formulaire ont été modifiés
      const hasFormDataValue = Object.values(formData).some(value => 
        value && value !== '' && value !== undefined && value !== null
      );
      
      // Vérifier si des éléments ont été ajoutés aux listes
      const hasListData = selectedTags.length > 0 || 
 
                          treatmentHistory.length > 0 ||
                          patientDocuments.length > 0;
      
      const hasData = hasFormDataValue || hasListData || isDirty;
      
      console.log('Form data detection:', {
        hasFormDataValue,
        hasListData,
        isDirty,
        hasData,
        formData: Object.keys(formData).filter(key => formData[key])
      });
      
      setHasFormData(hasData);
      
      return hasData;
    };
    
    // Détecter immédiatement
    detectFormData();
    
    const saveData = () => {
      const formData = watch();
      saveFormData(FORM_ID, {
        formData,
        selectedTags,
        treatmentHistory
      });
    };

    // Save immediately
    saveData();

    // Set up interval to save periodically
    const intervalId = setInterval(saveData, 10000); // Save every 10 seconds

    return () => {
      clearInterval(intervalId);
      saveData(); // Save on unmount
    };
  }, [isOpen, watch, selectedTags, treatmentHistory, patientDocuments, isDirty]);

  // Gérer le clic extérieur avec double-clic
  const handleBackdropClick = () => {
    if (!hasFormData) {
      // Pas de données, fermer directement
      onClose();
      return;
    }

    setClickCount(prev => {
      const newCount = prev + 1;
      
      if (newCount === 1) {
        // Premier clic - ne rien faire, juste incrémenter
        setTimeout(() => setClickCount(0), 2000); // Reset après 2 secondes
        return newCount;
      } else if (newCount >= 2) {
        // Deuxième clic - afficher la confirmation
        setShowConfirmation(true);
        return 0; // Reset le compteur
      }
      
      return newCount;
    });
  };

  // Gérer la fermeture avec vérification
  const handleClose = () => {
    if (!hasFormData) {
      // Pas de données, fermer directement
      clearFormData(FORM_ID);
      reset();
      setSelectedTags([]);
        setTreatmentHistory([]);
      setPatientDocuments([]);
      setError(null);
      setSuccess(null);
      onClose();
      return;
    }

    // Il y a des données, afficher la confirmation
    setShowConfirmation(true);
  };

  // Confirmer la fermeture sans sauvegarder
  const handleConfirmClose = () => {
    console.log('User confirmed close without saving');
    setShowConfirmation(false);
    
    // Clear any saved form data when closing
    try {
      clearFormData(FORM_ID);
      console.log('Cleared form data on confirmed close');
    } catch (error) {
      console.error('Error clearing form data:', error);
    }
    
    // Reset all form state
    reset();
    setSelectedTags([]);
    setTreatmentHistory([]);
    setPatientDocuments([]);
    setError(null);
    setSuccess(null);
    setClickCount(0);
    setShowConfirmation(false);
    setHasFormData(false);
    
    console.log('New patient modal force closed - all data cleared');
    
    // Close the modal
    onClose();
  };

  // Annuler la fermeture et continuer l'édition
  const handleCancelClose = () => {
    console.log('User cancelled close, continuing editing');
    setShowConfirmation(false);
    setClickCount(0);
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Cette fonction est conservée mais n'est plus utilisée
  }, []);

  const handleAddTag = useCallback((tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  }, [selectedTags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleAddCustomTag = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTag.trim()) {
      e.preventDefault();
      handleAddTag(customTag.trim());
      setCustomTag('');
    }
  }, [customTag, handleAddTag]);

  // Fonctions pour gérer l'historique des traitements
  const addTreatmentHistoryEntry = () => {
    setTreatmentHistory([...treatmentHistory, { date: '', treatment: '', provider: '', notes: '' }]);
  };

  const removeTreatmentHistoryEntry = (index: number) => {
    setTreatmentHistory(treatmentHistory.filter((_, i) => i !== index));
  };

  const updateTreatmentHistoryEntry = (index: number, field: keyof TreatmentHistoryEntry, value: string) => {
    const updatedHistory = [...treatmentHistory];
    updatedHistory[index] = { ...updatedHistory[index], [field]: value };
    setTreatmentHistory(updatedHistory);
  };


  const handleDocumentsUpdate = (documents: DocumentMetadata[]) => {
    setPatientDocuments(documents);
  };

  const handleDocumentError = (error: string) => {
    setError(error);
  };

  const onSubmit = async (data: any) => {
    console.log('Starting patient creation...', { data });
    
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour créer un patient');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setProgress(20);

    try {
      const patientId = crypto.randomUUID();
      

      // Extract address components from the full address
      const addressParts = data.address.split(',').map(part => part.trim());
      const street = data.address;
      
      const patientData: Record<string, any> = {
        id: patientId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        profession: data.profession || '',
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        email: data.email || '',
        phone: data.phone || '',
        address: {
          street: street,
          city: '',
          state: '',
          zipCode: '',
          country: 'France'
        },
        insurance: data.insurance || '',
        insuranceNumber: data.insuranceNumber || '',
        medicalHistory: data.medicalHistory || '',
        notes: data.notes || '',
        pathologies: selectedTags,
        nextAppointment: data.nextAppointment && data.nextAppointmentTime
          ? `${data.nextAppointment}T${data.nextAppointmentTime}:00`
          : null,
        currentTreatment: data.currentTreatment || '',
        consultationReason: data.consultationReason || '',
        osteopathicTreatment: data.osteopathicTreatment || '',
        medicalAntecedents: data.medicalAntecedents || '',
        
        // Ensure this is NOT test data - explicitly set to false
        isTestData: false,
        osteopathId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Only add treatmentHistory if it has entries to avoid undefined
      if (treatmentHistory.length > 0) {
        patientData.treatmentHistory = treatmentHistory;
      }

      // Ajouter les documents si présents
      if (patientDocuments.length > 0) {
        patientData.documents = patientDocuments;
      }

      setProgress(60);

      console.log('About to save patient to Firestore:', patientId, patientData);

      // Save to Firestore
      await setDoc(doc(db, 'patients', patientId), patientData);
      
      console.log('Patient successfully saved to Firestore');
      
      setProgress(80);

      // Créer automatiquement une consultation initiale avec TOUTES les données du patient (snapshot complet)
      const initialConsultationData = {
        patientId: patientId,
        patientName: `${data.firstName.trim()} ${data.lastName.trim()}`,
        osteopathId: auth.currentUser.uid,
        date: new Date(),
        // ✅ CORRECTION: Mapping correct des champs principaux
        reason: data.consultationReason || 'Première consultation',
        treatment: data.osteopathicTreatment || 'Évaluation initiale et anamnèse',
        notes: data.notes || 'Consultation générée automatiquement lors de la création du patient.',
        duration: 60,
        price: 60,
        status: 'completed' as 'draft' | 'completed' | 'cancelled',
        examinations: [],
        prescriptions: [],

        // ✅ SNAPSHOT COMPLET - Champs d'identité du patient au moment T
        patientFirstName: data.firstName.trim(),
        patientLastName: data.lastName.trim(),
        patientDateOfBirth: data.dateOfBirth,
        patientGender: data.gender,
        patientPhone: data.phone || '',
        patientEmail: data.email || '',
        patientProfession: data.profession || '',
        patientAddress: data.address || '',
        patientInsurance: data.insurance || '',
        patientInsuranceNumber: data.insuranceNumber || '',

        // ✅ SNAPSHOT COMPLET - Champs cliniques au moment T (mapping correct)
        currentTreatment: data.currentTreatment || '',
        consultationReason: data.consultationReason || '',
        medicalAntecedents: data.medicalAntecedents || '',
        medicalHistory: data.medicalHistory || '',
        osteopathicTreatment: data.osteopathicTreatment || '',
        symptoms: selectedTags || [],
        treatmentHistory: [],

        // ✅ FLAG DE CONSULTATION INITIALE
        // Cette consultation est créée automatiquement lors de la création du dossier patient
        // Elle est la seule à être pré-remplie avec les données du dossier patient
        isInitialConsultation: true
      };

      console.log('🔍 CRÉATION PREMIÈRE CONSULTATION - Données envoyées:', {
        currentTreatment: initialConsultationData.currentTreatment,
        consultationReason: initialConsultationData.consultationReason,
        medicalAntecedents: initialConsultationData.medicalAntecedents,
        medicalHistory: initialConsultationData.medicalHistory,
        osteopathicTreatment: initialConsultationData.osteopathicTreatment,
        symptoms: initialConsultationData.symptoms,
        notes: initialConsultationData.notes,
        isInitialConsultation: initialConsultationData.isInitialConsultation
      });

      const initialConsultationId = await ConsultationService.createConsultation(initialConsultationData);
      console.log('✅ Consultation automatique créée avec snapshot complet des données patient - ID:', initialConsultationId);

      // Créer automatiquement une facture liée à cette consultation
      const invoiceNumber = `F-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}`;
      
      const invoiceData = {
        number: invoiceNumber,
        patientId: patientId,
        patientName: `${data.firstName.trim()} ${data.lastName.trim()}`,
        osteopathId: auth.currentUser.uid,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{
          id: crypto.randomUUID(),
          description: 'Première consultation',
          quantity: 1,
          unitPrice: 55,
          amount: 55
        }],
        subtotal: 55,
        tax: 0,
        total: 55,
        status: 'draft',
        notes: 'Facture générée automatiquement pour la première consultation.',
        consultationId: initialConsultationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await InvoiceService.createInvoice(invoiceData);

      // Update cache
      patientCache.set(patientId, patientData as Patient);

      // Move documents from temp folder to patient's permanent folder
      if (patientDocuments.length > 0) {
        console.log('Moving documents from temp folder to patient folder...');
        const updatedDocuments: DocumentMetadata[] = [];
        
        for (const doc of patientDocuments) {
          try {
            // Check if document is in temp folder
            if (doc.folder.includes('/temp/')) {
              const oldPath = `${doc.folder}/${doc.name}`;
              const newFolder = createFolderStructure(auth.currentUser.uid, 'patient', patientId);
              const newPath = `${newFolder}/${doc.name}`;
              
              console.log(`Moving document from ${oldPath} to ${newPath}`);
              
              // Move file in Firebase Storage
              const { moveFile } = await import('../../utils/documentStorage');
              const newUrl = await moveFile(oldPath, newPath);
              
              // Update document metadata
              const updatedDoc: DocumentMetadata = {
                ...doc,
                url: newUrl,
                folder: newFolder
              };
              
              updatedDocuments.push(updatedDoc);
              console.log(`Document moved successfully: ${doc.name}`);
            } else {
              // Document is already in correct location
              updatedDocuments.push(doc);
            }
          } catch (error) {
            console.error(`Error moving document ${doc.name}:`, error);
            // Keep original document metadata if move fails
            updatedDocuments.push(doc);
          }
        }
        
        // Update patient data with corrected document paths
        if (updatedDocuments.length > 0) {
          patientData.documents = updatedDocuments;
          
          // Update Firestore with corrected document paths
          await setDoc(doc(db, 'patients', patientId), patientData);
          console.log('Patient document paths updated in Firestore');
        }
      }
      setProgress(100);

      setSuccess('Dossier patient créé avec succès !');
      
      // Clear saved form data after successful submission
      
      // Afficher le message de succès
      setSuccess('Le dossier patient a été créé avec succès');
      
      // Clear saved form data
      clearFormData(FORM_ID);
      
      console.log('Patient created with ID:', patientId, 'Data:', patientData);
      
      // Wait for Firestore to commit and then refresh the list
      setTimeout(() => {
        // Reset form
        reset();
        setSelectedTags([]);
            setTreatmentHistory([]);
        setPatientDocuments([]);
        
        console.log('Calling onSuccess to refresh patient list...');
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error creating new patient:', error);
      setError('Erreur lors de la création du nouveau dossier patient: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  // Clear form data when modal closes
  const handleModalClose = () => {
    // Vérifier une dernière fois s'il y a des changements non enregistrés
    const formData = watch();
    const hasFormData = Object.values(formData).some(value => 
      value && value !== '' && value !== undefined && value !== null
    );
    const hasListData = selectedTags.length > 0 || 
                        pastAppointments.length > 0 || 
                        treatmentHistory.length > 0 ||
                        patientDocuments.length > 0;
    const currentlyHasChanges = hasFormData || hasListData || isDirty;
    
    console.log('Attempting to close modal, hasUnsavedChanges:', currentlyHasChanges);
    
    console.log('Final unsaved changes check:', {
      hasFormData,
      hasListData,
      isDirty,
      currentlyHasChanges,
      showConfirmation
    });
    
    // Si des données non sauvegardées existent et qu'on n'a pas encore montré l'avertissement
    if (currentlyHasChanges && !showConfirmation) {
      console.log('Showing unsaved warning modal');
      setShowConfirmation(true);
      return;
    }
    
    // Clear any saved form data when closing
    try {
      clearFormData(FORM_ID);
      console.log('Cleared form data on modal close');
    } catch (error) {
      console.error('Error clearing form data:', error);
    }
    
    // Reset all form state
    reset();
    setSelectedTags([]);
    setTreatmentHistory([]);
    setPatientDocuments([]);
    setError(null);
    setSuccess(null);
    
    console.log('New patient modal closed - all data cleared');
    
    // Close the modal
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-[calc(100%-2rem)] md:w-[800px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Nouveau dossier patient</h2>
              <button
                onClick={handleModalClose}
                className="text-gray-400 transition-colors hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 px-6 py-4 overflow-y-auto">
              {error && (
                <div className="p-3 mb-4 text-sm border rounded-lg bg-error/5 border-error/20 text-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
                  <CheckCircle size={20} className="mr-2 text-green-500" />
                  <span className="text-green-700">{success}</span>
                </div>
              )}


              {isSubmitting && progress > 0 && (
                <div className="mb-4">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 transition-all duration-300 rounded-full bg-primary-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {progress === 100 ? 'Terminé' : 'Création en cours...'}
                  </p>
                </div>
              )}

              <form id="newPatientForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="block mb-1 text-sm font-medium text-gray-700">
                      Prénom *
                    </label>
                    <AutoCapitalizeInput
                      type="text"
                      id="firstName"
                      className={`input w-full ${errors.firstName ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('firstName', { 
                        required: 'Ce champ est requis',
                        minLength: { value: 1, message: 'Le prénom est requis' },
                        validate: value => value?.trim().length > 0 || 'Le prénom ne peut pas être vide'
                      })}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-error">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block mb-1 text-sm font-medium text-gray-700">
                      Nom *
                    </label>
                    <AutoCapitalizeInput
                      type="text"
                      id="lastName"
                      className={`input w-full ${errors.lastName ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('lastName', { 
                        required: 'Ce champ est requis',
                        minLength: { value: 1, message: 'Le nom est requis' },
                        validate: value => value?.trim().length > 0 || 'Le nom ne peut pas être vide'
                      })}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-error">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="block mb-1 text-sm font-medium text-gray-700">
                      Date de naissance *
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      className={`input w-full ${errors.dateOfBirth ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('dateOfBirth', { 
                        required: 'Ce champ est requis',
                        validate: value => {
                          if (!value) return 'La date de naissance est requise';
                          const date = new Date(value);
                          const today = new Date();
                          if (date > today) return 'La date de naissance ne peut pas être dans le futur';
                          return true;
                        }
                      })}
                    />
                    {errors.dateOfBirth && (
                      <p className="mt-1 text-sm text-error">{errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="gender" className="block mb-1 text-sm font-medium text-gray-700">
                      Sexe
                    </label>
                    <select
                      id="gender"
                      className={`input w-full ${errors.gender ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('gender')}
                      defaultValue="" // Ensure no default selection
                    >
                      <option value="">Sélectionner</option>
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                      <option value="other">Autre</option>
                    </select>
                    {errors.gender && (
                      <p className="mt-1 text-sm text-error">{errors.gender.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="profession" className="block mb-1 text-sm font-medium text-gray-700">
                      Profession
                    </label>
                    <AutoCapitalizeInput
                      type="text"
                      id="profession"
                      className="w-full input"
                      {...register('profession')}
                      placeholder="Ex: Enseignant, Ingénieur, Retraité..."
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block mb-1 text-sm font-medium text-gray-700">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className={`input w-full ${errors.phone ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('phone', { 
                        pattern: {
                          value: /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
                          message: 'Numéro de téléphone invalide'
                        }
                      })}
                      placeholder="06 12 34 56 78"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-error">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className={`input w-full ${errors.email ? 'border-error focus:border-error focus:ring-error' : ''}`}
                    {...register('email', { 
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Format d\'email invalide'
                      }
                    })}
                    placeholder="exemple@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-error">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="address" className="block mb-1 text-sm font-medium text-gray-700">
                    Adresse postale complète
                  </label>
                  <AutoResizeTextarea
                    id="address"
                    minRows={3}
                    maxRows={6}
                    className={`input w-full resize-none ${errors.address ? 'border-error focus:border-error focus:ring-error' : ''}`}
                    {...register('address')}
                    placeholder="123 rue des Fleurs, 75001 Paris"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-error">{errors.address.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Format : numéro, rue, code postal, ville
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="insurance" className="block mb-1 text-sm font-medium text-gray-700">
                      Mutuelle
                    </label>
                    <input
                      type="text"
                      id="insurance"
                      className="w-full input"
                      {...register('insurance')}
                    />
                  </div>

                  <div>
                    <label htmlFor="insuranceNumber" className="block mb-1 text-sm font-medium text-gray-700">
                      Numéro d'assuré
                    </label>
                    <input
                      type="text"
                      id="insuranceNumber"
                      className="w-full input"
                      {...register('insuranceNumber')}
                    />
                  </div>
                </div>

                {/* Nouveaux champs */}
                <div>
                  <label htmlFor="consultationReason" className="block mb-1 text-sm font-medium text-gray-700">
                    Motif de consultation
                  </label>
                  <AutoResizeTextarea
                    id="consultationReason"
                    minRows={3}
                    maxRows={6}
                    className="w-full resize-none input"
                    {...register('consultationReason')}
                    placeholder="Raison principale de la consultation"
                  />
                </div>

                <div>
                  <label htmlFor="currentTreatment" className="block mb-1 text-sm font-medium text-gray-700">
                    Traitement effectué
                  </label>
                  <AutoResizeTextarea
                    id="currentTreatment"
                    minRows={3}
                    maxRows={6}
                    className="w-full resize-none input"
                    {...register('currentTreatment')}
                    placeholder="Traitements médicamenteux ou autres thérapies en cours"
                  />
                </div>

                <div>
                  <label htmlFor="medicalAntecedents" className="block mb-1 text-sm font-medium text-gray-700">
                    Antécédents médicaux
                  </label>
                  <AutoResizeTextarea
                    id="medicalAntecedents"
                    minRows={4}
                    maxRows={8}
                    className="w-full resize-none input"
                    {...register('medicalAntecedents')}
                    placeholder="Antécédents médicaux significatifs, chirurgies, etc."
                  />
                </div>

                <div>
                  <label htmlFor="medicalHistory" className="block mb-1 text-sm font-medium text-gray-700">
                    Historique médical général
                  </label>
                  <AutoResizeTextarea
                    id="medicalHistory"
                    minRows={4}
                    maxRows={8}
                    className="w-full resize-none input"
                    {...register('medicalHistory')}
                  />
                </div>

                {/* Documents médicaux */}
                <div className="pt-6 border-t">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Documents médicaux</h3>
                  <DocumentUploadManager
                    patientId="temp"
                    onUploadSuccess={handleDocumentsUpdate}
                    onUploadError={handleDocumentError}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Historique des traitements */}
                <div className="pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Historique des traitements
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTreatmentHistoryEntry}
                      leftIcon={<Plus size={16} />}
                    >
                      Ajouter un traitement
                    </Button>
                  </div>

                  {treatmentHistory.length > 0 ? (
                    <div className="space-y-4">
                      {treatmentHistory.map((entry, index) => (
                        <div key={index} className="relative p-4 border border-gray-200 rounded-lg">
                          <button
                            type="button"
                            onClick={() => removeTreatmentHistoryEntry(index)}
                            className="absolute text-gray-400 top-2 right-2 hover:text-gray-600"
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
                            <div>
                              <label className="block mb-1 text-sm font-medium text-gray-700">
                                Date
                              </label>
                              <input
                                type="date"
                                value={entry.date}
                                onChange={(e) => updateTreatmentHistoryEntry(index, 'date', e.target.value)}
                                className="w-full input"
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <label className="block mb-1 text-sm font-medium text-gray-700">
                                Prestataire
                              </label>
                              <input
                                type="text"
                                value={entry.provider || ''}
                                onChange={(e) => updateTreatmentHistoryEntry(index, 'provider', e.target.value)}
                                className="w-full input"
                                placeholder="Nom du praticien ou établissement"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">
                              Traitement
                            </label>
                            <AutoResizeTextarea
                              value={entry.treatment}
                              onChange={(e) => updateTreatmentHistoryEntry(index, 'treatment', e.target.value)}
                              minRows={2}
                              maxRows={4}
                              className="w-full resize-none input"
                              placeholder="Description du traitement"
                            />
                          </div>
                          <div className="mt-2">
                            <label className="block mb-1 text-sm font-medium text-gray-700">
                              Notes
                            </label>
                            <AutoResizeTextarea
                              value={entry.notes || ''}
                              onChange={(e) => updateTreatmentHistoryEntry(index, 'notes', e.target.value)}
                              minRows={2}
                              maxRows={4}
                              className="w-full resize-none input"
                              placeholder="Note sur le patient"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">
                      Aucun historique de traitement enregistré
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Symptômes / Syndromes
                  </label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 text-sm rounded-full bg-primary-50 text-primary-700"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-primary-600 hover:text-primary-800"
                          >
                            <XIcon size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyDown={handleAddCustomTag}
                        placeholder="Ajouter des symptômes / syndromes personnalisés"
                        className="flex-1 input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (customTag.trim()) {
                            handleAddTag(customTag.trim());
                            setCustomTag('');
                          }
                        }}
                        disabled={!customTag.trim()}
                      >
                        Ajouter
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_PATHOLOGIES.map((pathology) => (
                        <button
                          key={pathology}
                          type="button"
                          onClick={() => handleAddTag(pathology)}
                          disabled={selectedTags.includes(pathology)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            selectedTags.includes(pathology)
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pathology}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block mb-1 text-sm font-medium text-gray-700">
                    Note sur le patient
                  </label>
                  <AutoResizeTextarea
                    id="notes"
                    minRows={4}
                    maxRows={8}
                    className="w-full resize-none input"
                    {...register('notes')}
                    placeholder="Note sur le patient"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="nextAppointment" className="block mb-1 text-sm font-medium text-gray-700">
                      Prochain rendez-vous
                    </label>
                    <input
                      type="date"
                      id="nextAppointment"
                      className="w-full input"
                      {...register('nextAppointment')}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label htmlFor="nextAppointmentTime" className="block mb-1 text-sm font-medium text-gray-700">
                      Heure du rendez-vous
                    </label>
                    <input
                      type="time"
                      id="nextAppointmentTime"
                      className="w-full input"
                      {...register('nextAppointmentTime')}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-500">
                {hasFormData && (
                  <span className="text-amber-600">
                    Données non sauvegardées - Double-cliquez à l'extérieur pour fermer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  form="newPatientForm"
                  disabled={isSubmitting || !isValid}
                  loading={isSubmitting}
                >
                  {isSubmitting ? 'Création...' : 'Créer le dossier'}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Modal de confirmation de fermeture */}
          <AnimatePresence>
            {showConfirmation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-md p-6 mx-4 bg-white shadow-2xl rounded-xl"
                >
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Données non sauvegardées
                  </h3>
                  <p className="mb-6 text-gray-600">
                    Vous avez des modifications non sauvegardées. Êtes-vous sûr de
                    vouloir fermer sans sauvegarder ?
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelClose}
                    >
                      Continuer l'édition
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleConfirmClose}
                    >
                      Fermer sans sauvegarder
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}