import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, FileText, User, Plus, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { Button } from '../ui/Button';
import AutoResizeTextarea from '../ui/AutoResizeTextarea';
import SuccessBanner from '../ui/SuccessBanner';
import { Patient, Consultation, ConsultationFormData as ConsultationFormType } from '../../types';
import { ConsultationService } from '../../services/consultationService';
import { AppointmentService } from '../../services/appointmentService';
import DocumentUploadManager from '../ui/DocumentUploadManager';
import { DocumentMetadata, moveFile } from '../../utils/documentStorage';
import SymptomsSyndromesField from '../ui/SymptomsSyndromesField';

interface NewConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPatientId?: string; // ID du patient pré-sélectionné
  preselectedPatientName?: string; // Nom du patient pré-sélectionné
  preselectedDate?: string;
  preselectedTime?: string;
}

interface ConsultationFormData {
  patientId: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  treatment: string;
  notes: string;
  price: number;
  status: string;
  examinations: { value: string }[];
  prescriptions: { value: string }[];

  // Champs d'identité du patient (pré-remplis, lecture seule)
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: string;
  patientGender: string;
  patientPhone: string;
  patientProfession: string;
  patientEmail: string;
  patientAddress: string;
  patientInsurance: string;
  patientInsuranceNumber: string;

  // Champs cliniques (modifiables pour cette consultation)
  currentTreatment?: string;
  consultationReason?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  symptoms?: string;
}


const NewConsultationModal: React.FC<NewConsultationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatientId,
  preselectedPatientName,
  preselectedDate,
  preselectedTime,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isPatientPreselected, setIsPatientPreselected] = useState(false);
  const [consultationDocuments, setConsultationDocuments] = useState<DocumentMetadata[]>([]);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors, isValid }, reset, control, watch, setValue } = useForm<ConsultationFormData>({
    mode: 'onChange',
    defaultValues: {
      duration: 60,
      price: 60,
      status: 'draft',
      examinations: [],
      prescriptions: [],
      date: preselectedDate || new Date().toISOString().split('T')[0],
      time: preselectedTime || '09:00'
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

  const watchedPatientId = watch('patientId');

  // Gestionnaires pour les documents
  const handleDocumentsUpdate = (documents: DocumentMetadata[]) => {
    setConsultationDocuments(documents);
  };

  const handleDocumentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Load patients
  useEffect(() => {
    const loadPatients = async () => {
      if (!auth.currentUser) {
        console.log('No authenticated user for patient loading');
        return;
      }

      // Si un patient est pré-sélectionné, on n'a pas besoin de charger tous les patients
      if (preselectedPatientId) {
        setIsPatientPreselected(true);
        try {
          const patientRef = doc(db, 'patients', preselectedPatientId);
          const patientDoc = await getDoc(patientRef);
          
          console.log('Loading preselected patient:', preselectedPatientId);
          if (patientDoc.exists()) {
            const patientData = { ...patientDoc.data(), id: patientDoc.id } as Patient;
            setSelectedPatient(patientData);
            setValue('patientId', preselectedPatientId);
            fillPatientFields(patientData);
          } else {
            setError('Patient pré-sélectionné non trouvé');
            console.error('Preselected patient not found:', preselectedPatientId);
          }
        } catch (error) {
          console.error('Error loading preselected patient:', error);
          setError('Erreur lors du chargement du patient');
        }
        return;
      }

      try {
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where('osteopathId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        
        const patientsList = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as Patient[];
        
        setPatients(patientsList);

      } catch (error) {
        console.error('Error loading patients:', error);
      }
    };

    if (isOpen) {
      loadPatients();
      console.log('NewConsultationModal opened with preselected patient:', preselectedPatientId);
    }
  }, [isOpen, preselectedPatientId, setValue, preselectedPatientName]);

  // Update selected patient when patientId changes
  useEffect(() => {
    if (watchedPatientId && !isPatientPreselected) {
      const patient = patients.find(p => p.id === watchedPatientId);
      setSelectedPatient(patient || null);
      if (patient) {
        console.log('Patient selected from dropdown:', patient.firstName, patient.lastName);
        fillPatientFields(patient);
      }
    }
  }, [watchedPatientId, patients, isPatientPreselected]);

  // Fill patient fields with existing data
  const fillPatientFields = (patient: Patient) => {
    console.log('Filling patient fields for:', patient.firstName, patient.lastName);
    // Champs d'identité (lecture seule)
    setValue('patientFirstName', patient.firstName || '');
    setValue('patientLastName', patient.lastName || '');
    setValue('patientDateOfBirth', patient.dateOfBirth || '');
    setValue('patientGender', patient.gender || '');
    setValue('patientPhone', patient.phone || '');
    setValue('patientProfession', patient.profession || '');
    setValue('patientEmail', patient.email || '');
    setValue('patientAddress', patient.address?.street || '');
    setValue('patientInsurance', patient.insurance?.provider || '');
    setValue('patientInsuranceNumber', patient.insurance?.policyNumber || '');

    // Champs cliniques (pré-remplis avec les données du patient, modifiables)
    setValue('currentTreatment', patient.currentTreatment || '');
    setValue('consultationReason', patient.consultationReason || '');
    setValue('medicalAntecedents', patient.medicalAntecedents || '');
    setValue('medicalHistory', patient.medicalHistory || '');
    setValue('osteopathicTreatment', patient.osteopathicTreatment || '');
    setSelectedSymptoms(patient.pathologies || patient.tags || []);
  };

  const onSubmit = async (data: ConsultationFormData) => {
    if (!auth.currentUser) {
      setError('Informations manquantes pour créer la consultation');
      return;
    }

    console.log('Form submission - preselectedPatientId:', preselectedPatientId);
    console.log('Form submission - selectedPatient:', selectedPatient);
    console.log('Form submission - form data patientId:', data.patientId);

    // Utiliser le patient pré-sélectionné ou le patient sélectionné
    const patientToUse = selectedPatient;
    const patientIdToUse = preselectedPatientId || data.patientId;
    const patientNameToUse = preselectedPatientName || (patientToUse ? `${patientToUse.firstName} ${patientToUse.lastName}` : '');

    console.log('Using patient:', { patientIdToUse, patientNameToUse });
    if (!patientIdToUse || !patientNameToUse) {
      setError('Patient non sélectionné ou informations manquantes');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const consultationDate = new Date(`${data.date}T${data.time}`);
      
      // 1. Créer le rendez-vous dans l'agenda
      const endTime = new Date(consultationDate.getTime() + data.duration * 60000);
      const appointmentData = {
        patientId: patientIdToUse,
        patientName: patientNameToUse,
        practitionerId: auth.currentUser.uid,
        practitionerName: auth.currentUser.displayName || auth.currentUser.email,
        date: consultationDate,
        endTime: endTime,
        duration: data.duration,
        type: data.reason || 'Consultation ostéopathique',
        status: 'confirmed',
        location: {
          type: 'office',
          name: 'Cabinet principal'
        },
        notes: data.notes
      };

      const appointmentId = await AppointmentService.createAppointment(appointmentData);

      // 2. Créer la consultation avec tous les champs cliniques
      const consultationData = {
        patientId: patientIdToUse,
        patientName: patientNameToUse,
        osteopathId: auth.currentUser.uid,
        date: consultationDate,
        reason: data.reason,
        treatment: data.treatment,
        notes: data.notes,
        duration: data.duration,
        price: data.price,
        status: data.status,
        examinations: data.examinations.map(item => item.value),
        prescriptions: data.prescriptions.map(item => item.value),
        appointmentId: appointmentId,

        // Champs d'identité du patient (snapshot)
        patientFirstName: data.patientFirstName,
        patientLastName: data.patientLastName,
        patientDateOfBirth: data.patientDateOfBirth,
        patientGender: data.patientGender,
        patientPhone: data.patientPhone,
        patientProfession: data.patientProfession,
        patientEmail: data.patientEmail,
        patientAddress: data.patientAddress,
        patientInsurance: data.patientInsurance,
        patientInsuranceNumber: data.patientInsuranceNumber,

        // Champs cliniques (snapshot au moment de la consultation)
        currentTreatment: data.currentTreatment || '',
        consultationReason: data.consultationReason || '',
        medicalAntecedents: data.medicalAntecedents || '',
        medicalHistory: data.medicalHistory || '',
        osteopathicTreatment: data.osteopathicTreatment || '',
        symptoms: selectedSymptoms
      };

      const consultationId = await ConsultationService.createConsultation(consultationData);

      // Déplacer les documents du dossier temporaire vers le dossier de la consultation réelle
      if (consultationDocuments.length > 0) {
        const updatedDocuments: DocumentMetadata[] = [];
        for (const doc of consultationDocuments) {
          try {
            const oldPath = `${doc.folder}/${doc.name}`;
            const newFolder = `users/${auth.currentUser.uid}/consultations/${consultationId}/documents`;
            const newPath = `${newFolder}/${doc.name}`;

            const newUrl = await moveFile(oldPath, newPath);
            updatedDocuments.push({
              ...doc,
              url: newUrl,
              folder: newFolder
            });
          } catch (moveError) {
            console.error(`Erreur lors du déplacement du document ${doc.name}:`, moveError);
          }
        }

        // Mettre à jour la consultation avec les documents déplacés
        if (updatedDocuments.length > 0) {
          await updateDoc(doc(db, 'consultations', consultationId), {
            documents: updatedDocuments
          });
        }
      }

      // Afficher le message de succès après que tout soit enregistré
      setShowSuccessBanner(true);
      
      // 3. Lier la consultation au rendez-vous
      await AppointmentService.updateAppointment(appointmentId, {
        consultationId: consultationId
      });
      
      // Attendre 2 secondes avant de fermer le modal
      setTimeout(() => {
        setShowSuccessBanner(false);
        reset();
        setSelectedSymptoms([]);
        setConsultationDocuments([]);
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating consultation:', error);
      setError('Erreur lors de la création de la consultation: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
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
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-[calc(100%-2rem)] md:w-[800px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Nouvelle consultation</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <SuccessBanner
                message="Consultation créée avec succès. Toutes les informations saisies ont été sauvegardées."
                isVisible={showSuccessBanner}
              />
              
              {error && (
                <div className="mb-4 p-3 bg-error/5 border border-error/20 rounded-lg text-error text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <CheckCircle size={20} className="text-green-500 mr-2" />
                  <span className="text-green-700">{success}</span>
                </div>
              )}

              <form id="consultationForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Patient Selection - Conditionnel */}
                {!isPatientPreselected ? (
                  <div>
                    <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
                      Patient *
                    </label>
                    <select
                      id="patientId"
                      className={`input w-full ${errors.patientId ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('patientId', { required: 'Veuillez sélectionner un patient' })}
                    >
                      <option value="">Sélectionner un patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </option>
                      ))}
                    </select>
                    {errors.patientId && (
                      <p className="mt-1 text-sm text-error">{errors.patientId.message}</p>
                    )}
                    
                    {/* Selected Patient Info */}
                    {selectedPatient && (
                      <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                        <div className="flex items-center">
                          <User size={20} className="text-primary-600 mr-2" />
                          <div>
                            <div className="font-medium text-primary-900">
                              {selectedPatient.firstName} {selectedPatient.lastName}
                            </div>
                            <div className="text-sm text-primary-700">
                              {selectedPatient.phone} • {selectedPatient.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patient
                    </label>
                    <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                      <div className="flex items-center">
                        <User size={20} className="text-primary-600 mr-2" />
                        <div>
                          <div className="font-medium text-primary-900">
                            {preselectedPatientName || (selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Patient inconnu')}
                          </div>
                          <div className="text-sm text-primary-700">
                            Consultation pour ce patient
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Patient Info - Toujours affiché si patient pré-sélectionné */}
                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      id="date"
                      className={`input w-full ${errors.date ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('date', { required: 'Ce champ est requis' })}
                    />
                    {errors.date && (
                      <p className="mt-1 text-sm text-error">{errors.date.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                      Heure *
                    </label>
                    <input
                      type="time"
                      id="time"
                      className={`input w-full ${errors.time ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('time', { required: 'Ce champ est requis' })}
                    />
                    {errors.time && (
                      <p className="mt-1 text-sm text-error">{errors.time.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Motif de consultation *
                  </label>
                  <input
                    type="text"
                    id="reason"
                    className={`input w-full ${errors.reason ? 'border-error focus:border-error focus:ring-error' : ''}`}
                    {...register('reason', { required: 'Ce champ est requis' })}
                    placeholder="Ex: Lombalgie, Cervicalgie..."
                  />
                  {errors.reason && (
                    <p className="mt-1 text-sm text-error">{errors.reason.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="treatment" className="block text-sm font-medium text-gray-700 mb-1">
                    Traitement effectué *
                  </label>
                  <AutoResizeTextarea
                    id="treatment"
                    minRows={4}
                    maxRows={8}
                    className={`input w-full resize-none ${errors.treatment ? 'border-error focus:border-error focus:ring-error' : ''}`}
                    {...register('treatment', { required: 'Ce champ est requis' })}
                    placeholder="Décrivez le traitement effectué..."
                  />
                  {errors.treatment && (
                    <p className="mt-1 text-sm text-error">{errors.treatment.message}</p>
                  )}
                </div>

                {/* Section Champs Cliniques */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Données cliniques de la consultation</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Ces champs sont pré-remplis avec les données du patient, mais vous pouvez les modifier pour cette consultation spécifique.
                  </p>

                  {/* Motif de consultation spécifique */}
                  <div className="mb-4">
                    <label htmlFor="consultationReason" className="block text-sm font-medium text-gray-700 mb-1">
                      Motif de consultation détaillé
                    </label>
                    <AutoResizeTextarea
                      id="consultationReason"
                      minRows={2}
                      maxRows={4}
                      className="input w-full resize-none"
                      {...register('consultationReason')}
                      placeholder="Détaillez le motif de consultation..."
                    />
                  </div>

                  {/* Traitement actuel */}
                  <div className="mb-4">
                    <label htmlFor="currentTreatment" className="block text-sm font-medium text-gray-700 mb-1">
                      Traitement actuel du patient
                    </label>
                    <AutoResizeTextarea
                      id="currentTreatment"
                      minRows={2}
                      maxRows={4}
                      className="input w-full resize-none"
                      {...register('currentTreatment')}
                      placeholder="Traitements médicamenteux ou thérapies en cours..."
                    />
                  </div>

                  {/* Antécédents médicaux */}
                  <div className="mb-4">
                    <label htmlFor="medicalAntecedents" className="block text-sm font-medium text-gray-700 mb-1">
                      Antécédents médicaux
                    </label>
                    <AutoResizeTextarea
                      id="medicalAntecedents"
                      minRows={3}
                      maxRows={6}
                      className="input w-full resize-none"
                      {...register('medicalAntecedents')}
                      placeholder="Antécédents médicaux significatifs..."
                    />
                  </div>

                  {/* Historique médical */}
                  <div className="mb-4">
                    <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-1">
                      Historique médical
                    </label>
                    <AutoResizeTextarea
                      id="medicalHistory"
                      minRows={3}
                      maxRows={6}
                      className="input w-full resize-none"
                      {...register('medicalHistory')}
                      placeholder="Historique médical général..."
                    />
                  </div>

                  {/* Traitement ostéopathique */}
                  <div className="mb-4">
                    <label htmlFor="osteopathicTreatment" className="block text-sm font-medium text-gray-700 mb-1">
                      Traitement ostéopathique prévu
                    </label>
                    <AutoResizeTextarea
                      id="osteopathicTreatment"
                      minRows={3}
                      maxRows={6}
                      className="input w-full resize-none"
                      {...register('osteopathicTreatment')}
                      placeholder="Décrivez le traitement ostéopathique prévu..."
                    />
                  </div>

                  {/* Symptômes */}
                  <div className="mb-4">
                    <SymptomsSyndromesField
                      selectedTags={selectedSymptoms}
                      onTagsChange={setSelectedSymptoms}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Examens demandés */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Examens demandés
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => appendExamination({ value: '' })}
                      leftIcon={<Plus size={14} />}
                    >
                      Ajouter
                    </Button>
                  </div>
                  
                  {examinationFields.length > 0 ? (
                    <div className="space-y-2">
                      {examinationFields.map((field, index) => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <AutoResizeTextarea
                            minRows={1}
                            maxRows={3}
                            className="input flex-1"
                            placeholder="Ex: Radiographie lombaire..."
                            {...register(`examinations.${index}.value`)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExamination(index)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Aucun examen demandé
                    </div>
                  )}
                </div>

                {/* Prescriptions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Prescriptions
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => appendPrescription({ value: '' })}
                      leftIcon={<Plus size={14} />}
                    >
                      Ajouter
                    </Button>
                  </div>
                  
                  {prescriptionFields.length > 0 ? (
                    <div className="space-y-2">
                      {prescriptionFields.map((field, index) => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <AutoResizeTextarea
                            minRows={1}
                            maxRows={3}
                            className="input flex-1"
                            placeholder="Ex: Antalgiques, repos..."
                            {...register(`prescriptions.${index}.value`)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePrescription(index)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Aucune prescription
                    </div>
                  )}
                </div>

                {/* Documents de consultation */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Documents de consultation</h3>
                  <DocumentUploadManager
                    patientId="temp"
                    onUploadSuccess={handleDocumentsUpdate}
                    onUploadError={handleDocumentError}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes complémentaires
                  </label>
                  <AutoResizeTextarea
                    id="notes"
                    minRows={3}
                    maxRows={6}
                    className="input w-full resize-none"
                    {...register('notes')}
                    placeholder="Notes additionnelles..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                      Durée (minutes) *
                    </label>
                    <input
                      type="number"
                      id="duration"
                      min="15"
                      step="15"
                      className={`input w-full ${errors.duration ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('duration', { 
                        required: 'Ce champ est requis',
                        min: { value: 15, message: 'Durée minimum 15 minutes' }
                      })}
                    />
                    {errors.duration && (
                      <p className="mt-1 text-sm text-error">{errors.duration.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Tarif (€) *
                    </label>
                    <input
                      type="number"
                      id="price"
                      min="0"
                      step="5"
                      className={`input w-full ${errors.price ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('price', { 
                        required: 'Ce champ est requis',
                        min: { value: 0, message: 'Le tarif doit être positif' }
                      })}
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-error">{errors.price.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Statut *
                    </label>
                    <select
                      id="status"
                      className={`input w-full ${errors.status ? 'border-error focus:border-error focus:ring-error' : ''}`}
                      {...register('status', { required: 'Ce champ est requis' })}
                    >
                      <option value="completed">Effectué</option>
                      <option value="draft">En cours</option>
                    </select>
                    {errors.status && (
                      <p className="mt-1 text-sm text-error">{errors.status.message}</p>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                form="consultationForm"
                variant="primary"
                isLoading={isSubmitting}
                loadingText="Création en cours..."
                disabled={!isValid || isSubmitting || (!selectedPatient && !preselectedPatientId)}
              >
                Créer la consultation
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewConsultationModal;