import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { Button } from '../ui/Button';
import AutoResizeTextarea from '../ui/AutoResizeTextarea';
import SuccessBanner from '../ui/SuccessBanner';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { HDSCompliance } from '../../utils/hdsCompliance';
import DocumentUploadManager from '../ui/DocumentUploadManager';
import { DocumentMetadata } from '../../utils/documentStorage';
import { ConsultationService } from '../../services/consultationService';

interface EditConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  consultationId: string;
  preselectedPatientId?: string;
  preselectedPatientName?: string;
}

interface ConsultationFormData {
  date: string;
  time: string;
  reason: string;
  treatment: string;
  notes: string;
  duration: number;
  price: number;
  status: string;
  examinations: { value: string }[];
  prescriptions: { value: string }[];

  // ✅ CORRECTION: Champs cliniques (obligatoires pour la sauvegarde)
  currentTreatment: string;
  consultationReason: string;
  medicalAntecedents: string;
  medicalHistory: string;
  osteopathicTreatment: string;
  symptoms: string;
}

const COMMON_SYMPTOMS = [
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
  'Anxiété',
  'Troubles digestifs',
  'Troubles du sommeil'
];

const EditConsultationModal: React.FC<EditConsultationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  consultationId,
  preselectedPatientId: _preselectedPatientId,
  preselectedPatientName
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, _setSuccess] = useState<string | null>(null);
  const [consultationData, setConsultationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [_showConfirmationModal, _setShowConfirmationModal] = useState(false);
  const [_pendingData, _setPendingData] = useState<ConsultationFormData | null>(null);

  // État pour les données du patient (consultation initiale)
  const [_patientData, _setPatientData] = useState<any>(null);
  const [patientLastUpdated, setPatientLastUpdated] = useState<Date | null>(null);
  const [clinicalFallback, setClinicalFallback] = useState<{ 
    consultationReason: boolean;
    currentTreatment: boolean;
    medicalAntecedents: boolean;
    medicalHistory: boolean;
    osteopathicTreatment: boolean;
    symptoms: boolean;
  }>({
    consultationReason: false,
    currentTreatment: false,
    medicalAntecedents: false,
    medicalHistory: false,
    osteopathicTreatment: false,
    symptoms: false
  });

  // Avertissement pour les données corrompues
  const [hasCorruptedData, setHasCorruptedData] = useState(false);

  // Gestion des documents
  const [consultationDocuments, setConsultationDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');

  const { register, handleSubmit, formState: { errors, isValid }, reset, control, setValue } = useForm<ConsultationFormData>({
    mode: 'onChange',
    defaultValues: {
      duration: 60,
      price: 60,
      status: 'completed' as const,
      examinations: [],
      prescriptions: []
    }
  });

  const { fields: examinationFields, append: appendExamination, remove: removeExamination } = useFieldArray({
    control,
    name: 'examinations'
  });

  const { fields: prescriptionFields, append: appendPrescription, remove: removePrescription } = useFieldArray({
    control,
    name: 'prescriptions'
  });

  // Load consultation data when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (!auth.currentUser || !consultationId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 Loading consultation data for ID:', consultationId);
        
        // Charger directement depuis Firestore
        const consultationRef = doc(db, 'consultations', consultationId);
        const consultationDoc = await getDoc(consultationRef);
        
        if (!consultationDoc.exists()) {
          throw new Error('Consultation non trouvée');
        }
        
        const rawData = consultationDoc.data();
        console.log('📋 Raw consultation data:', rawData);

        // Vérifier la propriété
        if (rawData.osteopathId !== auth.currentUser.uid) {
          throw new Error('Accès non autorisé à cette consultation');
        }

        // ✅ NOUVEAU: Si consultation initiale, charger les données du patient
        let loadedPatientData = null;
        if (rawData.isInitialConsultation && rawData.patientId) {
          console.log('🔄 Consultation initiale détectée, chargement des données patient...');
          try {
            const patientRef = doc(db, 'patients', rawData.patientId);
            const patientDoc = await getDoc(patientRef);

            if (patientDoc.exists()) {
              const rawPatientData = patientDoc.data();
              loadedPatientData = HDSCompliance.decryptDataForDisplay(
                rawPatientData,
                'patients',
                auth.currentUser.uid
              );
              _setPatientData(loadedPatientData);
              setPatientLastUpdated(rawPatientData.updatedAt?.toDate() || null);
              console.log('✅ Données patient chargées pour consultation initiale');
            }
          } catch (patientError) {
            console.error('⚠️ Erreur lors du chargement des données patient:', patientError);
          }
        }
        
        // Déchiffrer les données pour l'affichage avec gestion d'erreur robuste
        let decryptedData;
        try {
          decryptedData = HDSCompliance.decryptDataForDisplay(
            rawData,
            'consultations',
            auth.currentUser.uid
          );
        } catch (decryptError) {
          console.error('❌ Erreur lors du déchiffrement des données consultation:', decryptError);
          // En cas d'erreur de déchiffrement, utiliser les données brutes
          decryptedData = rawData;
        }
        
        console.log('🔓 Decrypted consultation data:', decryptedData);
        
        // ✅ Construire l'objet consultation en conservant les valeurs snapshot
        const consultation = {
          id: consultationDoc.id,
          ...decryptedData,
          date: rawData.date?.toDate?.() || new Date(rawData.date),

          // Rétrocompatibilité : initialiser les champs manquants avec des valeurs vides
          patientFirstName: decryptedData.patientFirstName || '',
          patientLastName: decryptedData.patientLastName || '',
          patientDateOfBirth: decryptedData.patientDateOfBirth || '',
          patientGender: decryptedData.patientGender || '',
          patientPhone: decryptedData.patientPhone || '',
          patientProfession: decryptedData.patientProfession || '',
          patientEmail: decryptedData.patientEmail || '',
          patientAddress: decryptedData.patientAddress || '',
          patientInsurance: decryptedData.patientInsurance || '',
          patientInsuranceNumber: decryptedData.patientInsuranceNumber || '',
          // ⛔ Ne pas remplacer les champs cliniques par le patient; garder le snapshot ici
          currentTreatment: decryptedData.currentTreatment || '',
          consultationReason: decryptedData.consultationReason || '',
          medicalAntecedents: decryptedData.medicalAntecedents || '',
          medicalHistory: decryptedData.medicalHistory || '',
          osteopathicTreatment: decryptedData.osteopathicTreatment || '',
          symptoms: decryptedData.symptoms || []
        };

        setConsultationData(consultation);

        // 🔧 NOUVEAU : Initialiser les documents existants
        if (consultation.documents && consultation.documents.length > 0) {
          setConsultationDocuments(consultation.documents);
          console.log('📄 Documents existants chargés:', consultation.documents.length);
        }

        console.log('✅ Final consultation data for form (with defaults):', consultation);

        // Pre-fill form with consultation data
        const consultationDate = consultation.date?.toDate ? consultation.date.toDate() : new Date(consultation.date);
        const dateString = consultationDate.toISOString().split('T')[0];
        const timeString = consultationDate.toTimeString().slice(0, 5);
        
        // Nettoyer les champs pour l'édition avec protection contre les erreurs
        const cleanNotes = cleanDecryptedField(consultation.notes, true, '');

        // Protection contre les erreurs de déchiffrement pour tous les champs cliniques
        const cleanClinicalFields = (field: any) => {
          const cleaned = cleanDecryptedField(field, true, '');
          // Détecter si des données ont été corrompues
          if (field && typeof field === 'string' && field !== cleaned &&
              (field.includes('[DECODING_FAILED]') || field.includes('[DECRYPTION_ERROR'))) {
            setHasCorruptedData(true);
          }
          return cleaned;
        };

        // Déterminer fallback par champ pour consultation initiale
        const isInitial = !!rawData.isInitialConsultation;
        const cleanSnapshot = (v: any) => cleanDecryptedField(v, true, '');
        const cleanPatient = (v: any) => cleanDecryptedField(v, true, '');

        const crSnapshot = cleanSnapshot(consultation.consultationReason);
        const crPatient = cleanPatient(loadedPatientData?.consultationReason || '');
        const useCrPatient = isInitial && !crSnapshot && !!crPatient;

        const ctSnapshot = cleanSnapshot(consultation.currentTreatment);
        const ctPatient = cleanPatient(loadedPatientData?.currentTreatment || '');
        const useCtPatient = isInitial && !ctSnapshot && !!ctPatient;

        const maSnapshot = cleanSnapshot(consultation.medicalAntecedents);
        const maPatient = cleanPatient(loadedPatientData?.medicalAntecedents || '');
        const useMaPatient = isInitial && !maSnapshot && !!maPatient;

        const mhSnapshot = cleanSnapshot(consultation.medicalHistory);
        const mhPatient = cleanPatient(loadedPatientData?.medicalHistory || '');
        const useMhPatient = isInitial && !mhSnapshot && !!mhPatient;

        const otSnapshot = cleanSnapshot(consultation.osteopathicTreatment);
        const otPatient = cleanPatient(loadedPatientData?.osteopathicTreatment || '');
        const useOtPatient = isInitial && !otSnapshot && !!otPatient;

        // Symptômes
        const symptomsSnapshotArr = Array.isArray(consultation.symptoms) ? consultation.symptoms : (consultation.symptoms ? String(consultation.symptoms).split(',').map((s: string) => s.trim()).filter(Boolean) : []);
        const symptomsPatientArr = Array.isArray(loadedPatientData?.symptoms) ? loadedPatientData?.symptoms : [];
        const useSymptomsPatient = isInitial && symptomsSnapshotArr.length === 0 && symptomsPatientArr.length > 0;

        setClinicalFallback({
          consultationReason: !!useCrPatient,
          currentTreatment: !!useCtPatient,
          medicalAntecedents: !!useMaPatient,
          medicalHistory: !!useMhPatient,
          osteopathicTreatment: !!useOtPatient,
          symptoms: !!useSymptomsPatient
        });

        reset({
          date: dateString,
          time: timeString,
          notes: cleanNotes,
          duration: consultation.duration || 60,
          price: consultation.price || 60,
          status: consultation.status || 'completed',
          examinations: consultation.examinations?.map((exam: string) => ({ value: exam })) || [],
          prescriptions: consultation.prescriptions?.map((presc: string) => ({ value: presc })) || [],

          // Champs cliniques avec protection contre les erreurs de déchiffrement
          currentTreatment: useCtPatient ? ctPatient : cleanClinicalFields(consultation.currentTreatment),
          consultationReason: useCrPatient ? crPatient : cleanClinicalFields(consultation.consultationReason),
          medicalAntecedents: useMaPatient ? maPatient : cleanClinicalFields(consultation.medicalAntecedents),
          medicalHistory: useMhPatient ? mhPatient : cleanClinicalFields(consultation.medicalHistory),
          osteopathicTreatment: useOtPatient ? otPatient : cleanClinicalFields(consultation.osteopathicTreatment),
          symptoms: cleanClinicalFields((useSymptomsPatient ? symptomsPatientArr : symptomsSnapshotArr).join(', '))
        });

        // Initialiser les symptômes sélectionnés
        setSelectedSymptoms(useSymptomsPatient ? symptomsPatientArr : symptomsSnapshotArr);
        
        console.log('📝 Form initialized with cleaned data');
      } catch (error) {
        console.error('Error loading consultation data:', error);
        setError('Erreur lors du chargement de la consultation');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && consultationId) {
      loadData();
    }
  }, [isOpen, consultationId, reset]);

  // Gestionnaires pour les documents
  const handleDocumentsUpdate = (documents: DocumentMetadata[]) => {
    setConsultationDocuments(documents);
  };

  const handleDocumentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const onSubmit = async (data: ConsultationFormData) => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour modifier une consultation');
      return;
    }

    // ✅ Empêcher la modification des consultations initiales
    if (consultationData?.isInitialConsultation) {
      setError('Les consultations initiales sont en lecture seule. Veuillez modifier le dossier patient pour mettre à jour ces informations.');
      return;
    }

    console.log('📤 Submitting consultation update:', {
      consultationId,
      formData: data,
      currentUser: auth.currentUser.uid
    });

    setIsSubmitting(true);
    setError(null);

    try {
      const consultationDate = new Date(`${data.date}T${data.time}`);

      // Préparer les données de mise à jour COMPLETES
      const updateData: any = {
        date: consultationDate,
        notes: data.notes,
        duration: data.duration,
        price: data.price,
        status: data.status,
        examinations: data.examinations.map(item => item.value),
        prescriptions: data.prescriptions.map(item => item.value),
        updatedAt: new Date().toISOString(),

        // Champs d'identité patient (snapshot) - CONSERVER lors de la mise à jour
        patientId: consultationData.patientId,
        patientName: consultationData.patientName,
        patientFirstName: consultationData.patientFirstName || '',
        patientLastName: consultationData.patientLastName || '',
        patientDateOfBirth: consultationData.patientDateOfBirth || '',
        patientGender: consultationData.patientGender || '',
        patientPhone: consultationData.patientPhone || '',
        patientProfession: consultationData.patientProfession || '',
        patientEmail: consultationData.patientEmail || '',
        patientAddress: consultationData.patientAddress || '',
        patientInsurance: consultationData.patientInsurance || '',
        patientInsuranceNumber: consultationData.patientInsuranceNumber || '',

        // Champs cliniques (modifiables)
        // ✅ CORRECTION: Champs cliniques - FORCER la sauvegarde
        consultationReason: data.consultationReason || '',
        currentTreatment: data.currentTreatment || '',
        medicalAntecedents: data.medicalAntecedents || '',
        medicalHistory: data.medicalHistory || '',
        osteopathicTreatment: data.osteopathicTreatment || '',
        symptoms: data.symptoms ? data.symptoms.split(',').map(s => s.trim()).filter(Boolean) : [],
        treatmentHistory: consultationData.treatmentHistory || [],

        // Inclure les documents
        documents: consultationDocuments
      };

      // ✅ FIX: Ajouter les champs optionnels seulement s'ils existent et ne sont pas undefined/null
      if (consultationData.appointmentId !== undefined && consultationData.appointmentId !== null) {
        updateData.appointmentId = consultationData.appointmentId;
      }
      if (consultationData.reason !== undefined && consultationData.reason !== null) {
        updateData.reason = consultationData.reason;
      }
      if (consultationData.treatment !== undefined && consultationData.treatment !== null) {
        updateData.treatment = consultationData.treatment;
      }

      console.log('💾 Prepared update data (complete):', updateData);
      
      // ✅ DEBUG: Vérifier que tous les champs cliniques sont présents
      console.log('🔍 Vérification des champs cliniques dans updateData:', {
        consultationReason: updateData.consultationReason,
        currentTreatment: updateData.currentTreatment,
        medicalAntecedents: updateData.medicalAntecedents,
        medicalHistory: updateData.medicalHistory,
        osteopathicTreatment: updateData.osteopathicTreatment,
        symptoms: updateData.symptoms
      });

      // ✅ DEBUG: Log des champs cliniques dans EditConsultationModal
      console.log('🔍 Champs cliniques dans EditConsultationModal:', {
        consultationReason: data.consultationReason,
        currentTreatment: data.currentTreatment,
        medicalAntecedents: data.medicalAntecedents,
        medicalHistory: data.medicalHistory,
        osteopathicTreatment: data.osteopathicTreatment,
        symptoms: data.symptoms
      });

      // ✅ CORRECTION: Utiliser le service ConsultationService au lieu de faire le chiffrement manuellement
      await ConsultationService.updateConsultation(consultationId, updateData);

      console.log('✅ Consultation updated successfully in Firestore');

      // Afficher le message de succès après que tout soit enregistré
      setShowSuccessBanner(true);

      // Attendre 2 secondes avant de fermer le modal
      setTimeout(() => {
        setShowSuccessBanner(false);
        reset();
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error updating consultation:', error);
      setError('Erreur lors de la modification de la consultation: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="edit-consultation-modal" className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            key="edit-consultation-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="edit-consultation-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-[calc(100%-2rem)] md:w-[700px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Modifier la consultation</h2>
              <button
                onClick={onClose}
                className="text-gray-400 transition-colors hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 px-6 py-4 overflow-y-auto">
              <SuccessBanner
                message="Consultation modifiée avec succès. Toutes les informations saisies ont été sauvegardées."
                isVisible={showSuccessBanner}
              />

              {hasCorruptedData && !consultationData?.isInitialConsultation && (
                <div className="p-4 mb-4 border rounded-lg bg-orange-50 border-orange-200">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mt-0.5 mr-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-900">Données partiellement récupérées</h4>
                      <p className="mt-1 text-sm text-orange-800">
                        Certaines données de cette consultation n'ont pas pu être complètement récupérées en raison d'un ancien format de chiffrement.
                        Les champs vides ont été nettoyés automatiquement. Vous pouvez maintenant les remplir à nouveau avec les bonnes informations.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-primary-600"></div>
                </div>
              ) : consultationData ? (
                <>
                  <div className="p-4 mb-4 rounded-lg bg-primary-50">
                    <div className="flex items-center">
                      <User size={20} className="mr-2 text-primary-600" />
                      <span className="font-medium text-primary-900">
                        Patient: {consultationData?.patientName || preselectedPatientName || 'Patient inconnu'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-primary-700">
                      Consultation du {consultationData.date?.toDate ? 
                        consultationData.date.toDate().toLocaleDateString('fr-FR') : 
                        new Date(consultationData.date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  
                  {/* Debug info in development */}
                  <form id="editConsultationForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="date" className="block mb-1 text-sm font-medium text-gray-700">
                          Date de consultation {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                        </label>
                        <input
                          type="date"
                          id="date"
                          className={`input w-full ${errors.date ? 'border-error focus:border-error focus:ring-error' : ''} ${consultationData?.isInitialConsultation ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          {...register('date', { required: 'Ce champ est requis' })}
                          disabled={consultationData?.isInitialConsultation}
                        />
                        {errors.date && (
                          <p className="mt-1 text-sm text-error">{errors.date.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="time" className="block mb-1 text-sm font-medium text-gray-700">
                          Heure de consultation {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                        </label>
                        <input
                          type="time"
                          id="time"
                          className={`input w-full ${errors.time ? 'border-error focus:border-error focus:ring-error' : ''} ${consultationData?.isInitialConsultation ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          {...register('time', { required: 'Ce champ est requis' })}
                          disabled={consultationData?.isInitialConsultation}
                        />
                        {errors.time && (
                          <p className="mt-1 text-sm text-error">{errors.time.message}</p>
                        )}
                      </div>
                    </div>


                    <div>
                      <label htmlFor="status" className="block mb-1 text-sm font-medium text-gray-700">
                        Statut * {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                      </label>
                      <select
                        id="status"
                        className={`input w-full ${errors.status ? 'border-error focus:border-error focus:ring-error' : ''} ${consultationData?.isInitialConsultation ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        {...register('status', { required: 'Ce champ est requis' })}
                        disabled={consultationData?.isInitialConsultation}
                      >
                        <option value="completed">Effectué</option>
                        <option value="draft">En cours</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                      {errors.status && (
                        <p className="mt-1 text-sm text-error">{errors.status.message}</p>
                      )}
                    </div>

                    {/* Section Données Cliniques */}
                    <div className="pt-6 mt-6 border-t col-span-full">
                      <h3 className="mb-4 text-lg font-medium text-gray-900">Données cliniques de la consultation</h3>

                      {/* Bandeau d'information pour consultation initiale */}
                      {consultationData?.isInitialConsultation && (
                        <div className="p-4 mb-4 border rounded-lg bg-blue-50 border-blue-200">
                          <div className="flex items-start">
                            <svg className="w-5 h-5 mt-0.5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <h4 className="font-medium text-blue-900">✋ Consultation initiale en lecture seule</h4>
                              <p className="mt-1 text-sm text-blue-700">
                                Cette consultation initiale est automatiquement synchronisée avec le dossier patient.
                                <strong> Tous les champs affichés sont en lecture seule</strong> et proviennent directement du dossier patient.
                              </p>
                              <p className="mt-2 text-sm text-blue-700">
                                💡 Pour modifier ces informations, veuillez modifier directement le <strong>dossier patient</strong>.
                              </p>
                              {patientLastUpdated && (
                                <p className="mt-2 text-xs text-blue-600">
                                  📅 Dernière mise à jour du dossier patient : {patientLastUpdated.toLocaleDateString('fr-FR')} à {patientLastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Motif de consultation */}
                      <div className="mb-4">
                        <label htmlFor="consultationReason" className="block mb-1 text-sm font-medium text-gray-700">
                          Motif de consultation * {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                          {clinicalFallback.consultationReason && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              Source : dossier patient
                            </span>
                          )}
                        </label>
                        <AutoResizeTextarea
                          id="consultationReason"
                          minRows={2}
                          className={`w-full resize-none input ${consultationData?.isInitialConsultation ? 'bg-gray-50 cursor-not-allowed text-gray-700 border-blue-200' : ''}`}
                          {...register('consultationReason')}
                          placeholder="Détaillez le motif de consultation..."
                          disabled={consultationData?.isInitialConsultation}
                        />
                        {errors.consultationReason && (
                          <p className="mt-1 text-sm text-error">{errors.consultationReason.message}</p>
                        )}
                      </div>

                      {/* Traitement effectué */}
                      <div className="mb-4">
                        <label htmlFor="currentTreatment" className="block mb-1 text-sm font-medium text-gray-700">
                          Traitement effectué * {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                          {clinicalFallback.currentTreatment && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              Source : dossier patient
                            </span>
                          )}
                        </label>
                        <AutoResizeTextarea
                          id="currentTreatment"
                          minRows={2}
                          className={`w-full resize-none input ${consultationData?.isInitialConsultation ? 'bg-gray-50 cursor-not-allowed text-gray-700 border-blue-200' : ''}`}
                          {...register('currentTreatment')}
                          placeholder="Traitements médicamenteux ou thérapies en cours..."
                          disabled={consultationData?.isInitialConsultation}
                        />
                        {errors.currentTreatment && (
                          <p className="mt-1 text-sm text-error">{errors.currentTreatment.message}</p>
                        )}
                      </div>

                      {/* Antécédents médicaux */}
                      <div className="mb-4">
                        <label htmlFor="medicalAntecedents" className="block mb-1 text-sm font-medium text-gray-700">
                          Antécédents médicaux {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                          {clinicalFallback.medicalAntecedents && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              Source : dossier patient
                            </span>
                          )}
                        </label>
                        <AutoResizeTextarea
                          id="medicalAntecedents"
                          minRows={3}
                          className={`w-full resize-none input ${consultationData?.isInitialConsultation ? 'bg-gray-50 cursor-not-allowed text-gray-700 border-blue-200' : ''}`}
                          {...register('medicalAntecedents')}
                          placeholder="Antécédents médicaux significatifs..."
                          disabled={consultationData?.isInitialConsultation}
                        />
                      </div>

                      {/* Historique médical général */}
                      <div className="mb-4">
                        <label htmlFor="medicalHistory" className="block mb-1 text-sm font-medium text-gray-700">
                          Historique médical général {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                          {clinicalFallback.medicalHistory && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              Source : dossier patient
                            </span>
                          )}
                        </label>
                        <AutoResizeTextarea
                          id="medicalHistory"
                          minRows={3}
                          className={`w-full resize-none input ${consultationData?.isInitialConsultation ? 'bg-gray-50 cursor-not-allowed text-gray-700 border-blue-200' : ''}`}
                          {...register('medicalHistory')}
                          placeholder="Historique médical général..."
                          disabled={consultationData?.isInitialConsultation}
                        />
                      </div>

                      {/* Traitement ostéopathique */}
                      <div className="mb-4">
                        <label htmlFor="osteopathicTreatment" className="block mb-1 text-sm font-medium text-gray-700">
                          Traitement ostéopathique {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                          {clinicalFallback.osteopathicTreatment && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              Source : dossier patient
                            </span>
                          )}
                        </label>
                        <AutoResizeTextarea
                          id="osteopathicTreatment"
                          minRows={3}
                          className={`w-full resize-none input ${consultationData?.isInitialConsultation ? 'bg-gray-50 cursor-not-allowed text-gray-700 border-blue-200' : ''}`}
                          {...register('osteopathicTreatment')}
                          placeholder="Décrivez le traitement ostéopathique..."
                          disabled={consultationData?.isInitialConsultation}
                        />
                      </div>

                      {/* Symptômes / Syndromes */}
                      <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Symptômes / Syndromes {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                          {clinicalFallback.symptoms && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              Source : dossier patient
                            </span>
                          )}
                        </label>
                        <div className="space-y-3">
                          {selectedSymptoms.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {selectedSymptoms.map((symptom, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-3 py-1 text-sm rounded-full bg-primary-50 text-primary-700 border border-primary-200"
                                >
                                  {symptom}
                                  {!consultationData?.isInitialConsultation && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = selectedSymptoms.filter((_, i) => i !== index);
                                        setSelectedSymptoms(updated);
                                        setValue('symptoms', updated.join(', '));
                                      }}
                                      className="ml-2 text-primary-500 hover:text-primary-700"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                          {!consultationData?.isInitialConsultation && (
                            <>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customSymptom}
                                  onChange={(e) => setCustomSymptom(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
                                        const updated = [...selectedSymptoms, customSymptom.trim()];
                                        setSelectedSymptoms(updated);
                                        setValue('symptoms', updated.join(', '));
                                        setCustomSymptom('');
                                      }
                                    }
                                  }}
                                  className="flex-1 input"
                                  placeholder="Ajouter un symptôme personnalisé..."
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
                                      const updated = [...selectedSymptoms, customSymptom.trim()];
                                  setSelectedSymptoms(updated);
                                  setValue('symptoms', updated.join(', '));
                                  setCustomSymptom('');
                                }
                              }}
                              disabled={!customSymptom.trim()}
                            >
                              Ajouter
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {COMMON_SYMPTOMS.map((symptom) => (
                              <button
                                key={symptom}
                                type="button"
                                onClick={() => {
                                  if (!selectedSymptoms.includes(symptom)) {
                                    const updated = [...selectedSymptoms, symptom];
                                    setSelectedSymptoms(updated);
                                    setValue('symptoms', updated.join(', '));
                                  }
                                }}
                                disabled={selectedSymptoms.includes(symptom)}
                                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                                  selectedSymptoms.includes(symptom)
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {symptom}
                              </button>
                            ))}
                          </div>
                            </>
                          )}
                        </div>
                        <input type="hidden" {...register('symptoms')} />
                      </div>
                    </div>

                    {/* Documents médicaux (Examens + Prescriptions) */}
                    <div className="space-y-4">
                      <h3 className="text-base font-medium text-gray-900">Documents médicaux</h3>

                      {/* Examens demandés */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Examens / Imageries demandés {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                          </label>
                          {!consultationData?.isInitialConsultation && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => appendExamination({ value: '' })}
                              leftIcon={<Plus size={14} />}
                            >
                              Ajouter
                            </Button>
                          )}
                        </div>

                        {examinationFields.length > 0 ? (
                          <div className="space-y-2">
                            {examinationFields.map((field, index) => (
                              <div key={field.id} className="flex items-center space-x-2">
                                <AutoResizeTextarea
                                  minRows={1}
                                  className={`flex-1 input ${consultationData?.isInitialConsultation ? 'bg-gray-50 cursor-not-allowed text-gray-700 border-blue-200' : ''}`}
                                  placeholder="Ex: Radiographie lombaire, IRM cervicale..."
                                  {...register(`examinations.${index}.value`)}
                                  disabled={consultationData?.isInitialConsultation}
                                />
                                {!consultationData?.isInitialConsultation && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeExamination(index)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm italic text-gray-500">
                            Aucun examen demandé
                          </div>
                        )}
                      </div>

                      {/* Prescriptions / Ordonnances */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Prescriptions / Ordonnances {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                          </label>
                          {!consultationData?.isInitialConsultation && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => appendPrescription({ value: '' })}
                              leftIcon={<Plus size={14} />}
                            >
                              Ajouter
                            </Button>
                          )}
                        </div>

                        {prescriptionFields.length > 0 ? (
                          <div className="space-y-2">
                            {prescriptionFields.map((field, index) => (
                              <div key={field.id} className="flex items-center space-x-2">
                                <AutoResizeTextarea
                                  minRows={1}
                                  className={`flex-1 input ${consultationData?.isInitialConsultation ? 'bg-gray-50 cursor-not-allowed text-gray-700 border-blue-200' : ''}`}
                                  placeholder="Ex: Antalgiques, anti-inflammatoires, repos..."
                                  {...register(`prescriptions.${index}.value`)}
                                  disabled={consultationData?.isInitialConsultation}
                                />
                                {!consultationData?.isInitialConsultation && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePrescription(index)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm italic text-gray-500">
                            Aucune prescription
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block mb-1 text-sm font-medium text-gray-700">
                        Note sur le patient {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                      </label>
                      <AutoResizeTextarea
                        id="notes"
                        minRows={3}
                        className={`w-full resize-none input ${consultationData?.isInitialConsultation ? 'bg-gray-50 cursor-not-allowed text-gray-700 border-blue-200' : ''}`}
                        {...register('notes')}
                        placeholder="Notes additionnelles sur le patient..."
                        disabled={consultationData?.isInitialConsultation}
                      />
                    </div>

                    {/* Documents de consultation */}
                    <div className="pt-6 border-t">
                      <h3 className="mb-4 text-lg font-medium text-gray-900">Documents de consultation {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}</h3>
                      <DocumentUploadManager
                        patientId="temp"
                        entityType="consultation"
                        entityId={consultationId}
                        customFolderPath={`users/${auth.currentUser?.uid}/consultations/${consultationId}/documents`}
                        onUploadSuccess={handleDocumentsUpdate}
                        onUploadError={handleDocumentError}
                        disabled={isSubmitting || consultationData?.isInitialConsultation}
                        initialDocuments={consultationDocuments}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label htmlFor="duration" className="block mb-1 text-sm font-medium text-gray-700">
                          Durée (minutes) * {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                        </label>
                        <input
                          type="number"
                          id="duration"
                          min="15"
                          step="15"
                          className={`input w-full ${errors.duration ? 'border-error focus:border-error focus:ring-error' : ''} ${consultationData?.isInitialConsultation ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          {...register('duration', {
                            required: 'Ce champ est requis',
                            min: { value: 15, message: 'Durée minimum 15 minutes' },
                            valueAsNumber: true
                          })}
                          disabled={consultationData?.isInitialConsultation}
                        />
                        {errors.duration && (
                          <p className="mt-1 text-sm text-error">{errors.duration.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="price" className="block mb-1 text-sm font-medium text-gray-700">
                          Tarif (€) * {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                        </label>
                        <input
                          type="number"
                          id="price"
                          min="0"
                          step="5"
                          className={`input w-full ${errors.price ? 'border-error focus:border-error focus:ring-error' : ''} ${consultationData?.isInitialConsultation ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          {...register('price', {
                            required: 'Ce champ est requis',
                            min: { value: 0, message: 'Le tarif doit être positif' },
                            valueAsNumber: true
                          })}
                          disabled={consultationData?.isInitialConsultation}
                        />
                        {errors.price && (
                          <p className="mt-1 text-sm text-error">{errors.price.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="status" className="block mb-1 text-sm font-medium text-gray-700">
                          Statut * {consultationData?.isInitialConsultation && <span className="text-xs text-blue-600 font-normal">(🔒 Lecture seule)</span>}
                        </label>
                        <select
                          id="status"
                          className={`input w-full ${errors.status ? 'border-error focus:border-error focus:ring-error' : ''} ${consultationData?.isInitialConsultation ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          {...register('status', { required: 'Ce champ est requis' })}
                          disabled={consultationData?.isInitialConsultation}
                        >
                          <option value="completed">Effectué</option>
                          <option value="draft">En cours</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                        {errors.status && (
                          <p className="mt-1 text-sm text-error">{errors.status.message}</p>
                        )}
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-gray-500">Consultation non trouvée</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {consultationData?.isInitialConsultation ? 'Fermer' : 'Annuler'}
              </Button>
              {!consultationData?.isInitialConsultation && (
                <Button
                  type="submit"
                  form="editConsultationForm"
                  variant="primary"
                  isLoading={isSubmitting}
                  loadingText="Modification en cours..."
                  disabled={!isValid || isSubmitting || loading}
                >
                  Modifier la consultation
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </AnimatePresence>
  );
};

export default EditConsultationModal;