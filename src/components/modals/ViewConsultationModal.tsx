import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, FileText, User, Eye, AlertCircle, Download, Image as ImageIcon, Trash2, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConsultationService } from '../../services/consultationService';
import { PatientService } from '../../services/patientService';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DocumentMetadata, formatFileSize, isImageFile, deleteDocument } from '../../utils/documentStorage';
import { HDSCompliance } from '../../utils/hdsCompliance';
import { auth } from '../../firebase/config';

interface ViewConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
}

interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  date: Date;
  reason: string;
  treatment: string;
  notes: string;
  duration: number;
  price: number;
  status: 'draft' | 'completed' | 'cancelled';
  osteopathId: string;
  appointmentId?: string;
  examinations?: string[];
  prescriptions?: string[];
  isInitialConsultation?: boolean;

  // Champs cliniques
  currentTreatment?: string;
  consultationReason?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  symptoms?: string[];
  documents?: DocumentMetadata[];

  // Champs d'identité patient (snapshot)
  patientFirstName?: string;
  patientLastName?: string;
  patientDateOfBirth?: string;
  patientGender?: string;
  patientPhone?: string;
  patientEmail?: string;
  patientProfession?: string;
  patientAddress?: string;
  patientInsurance?: string;
  patientInsuranceNumber?: string;
}

const ViewConsultationModal: React.FC<ViewConsultationModalProps> = ({
  isOpen,
  onClose,
  consultationId
}) => {
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [patientLastUpdated, setPatientLastUpdated] = useState<Date | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentMetadata | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Load consultation data when modal opens
  useEffect(() => {
    const loadConsultation = async () => {
      if (!consultationId) return;

      setLoading(true);
      setError(null);

      try {
        console.log('🔄 Loading consultation details for ID:', consultationId);

        const consultationData = await ConsultationService.getConsultationById(consultationId);

        if (!consultationData) {
          throw new Error('Consultation non trouvée');
        }

        console.log('✅ Consultation data loaded:', consultationData);

        // Rétrocompatibilité : s'assurer que tous les champs existent
        const completeConsultation = {
          ...consultationData,
          // Champs requis avec valeurs par défaut pour compatibilité typée
          reason: consultationData.reason || '',
          treatment: consultationData.treatment || '',
          notes: consultationData.notes || '',
          status: consultationData.status || 'draft',
          duration: typeof consultationData.duration === 'number' ? consultationData.duration : 0,
          price: typeof consultationData.price === 'number' ? consultationData.price : 0,
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
          currentTreatment: consultationData.currentTreatment || '',
          consultationReason: consultationData.consultationReason || '',
          medicalAntecedents: consultationData.medicalAntecedents || '',
          medicalHistory: consultationData.medicalHistory || '',
          osteopathicTreatment: consultationData.osteopathicTreatment || '',
          symptoms: consultationData.symptoms || [],
          examinations: consultationData.examinations || [],
          prescriptions: consultationData.prescriptions || [],
          documents: consultationData.documents || []
        };

        setConsultation(completeConsultation);

        // Si consultation initiale, charger les données du patient
        if (completeConsultation.isInitialConsultation && completeConsultation.patientId) {
          console.log('🔄 Consultation initiale détectée, chargement des données patient...');
          try {
            const patient = await PatientService.getPatientById(completeConsultation.patientId);

            if (patient) {
              console.log('✅ Données patient chargées:', patient);

              // Déchiffrer les données patient pour affichage
              const decryptedPatient = HDSCompliance.decryptDataForDisplay(
                patient,
                'patients',
                auth.currentUser?.uid || ''
              );

              setPatientData(decryptedPatient);
              const lastUpdatedSource: any = patient.updatedAt || patient.createdAt;
              const lastUpdated =
                lastUpdatedSource instanceof Date
                  ? lastUpdatedSource
                  : lastUpdatedSource
                  ? new Date(lastUpdatedSource)
                  : new Date();
              setPatientLastUpdated(lastUpdated);
            }
          } catch (patientError) {
            console.error('⚠️ Erreur lors du chargement des données patient:', patientError);
          }
        }

      } catch (error) {
        console.error('Error loading consultation:', error);
        setError('Erreur lors du chargement de la consultation');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && consultationId) {
      loadConsultation();
    }
  }, [isOpen, consultationId]);

  // Format date for display
  const formatDateTime = (date: Date) => {
    try {
      return format(date, 'EEEE d MMMM yyyy à HH:mm', { locale: fr });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date invalide';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'draft':
        return 'En cours';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  // Helper d'affichage avec fallback dossier patient pour consultation initiale
  const renderClinicalField = (
    label: string,
    snapshotValue?: string,
    patientValue?: string,
    isInitial?: boolean
  ) => {
    const snapshotText = cleanDecryptedField(snapshotValue || '', false, '');
    const patientText = cleanDecryptedField(patientValue || '', false, '');

    const useSnapshot = !!snapshotText;
    const usePatientFallback = !!isInitial && !snapshotText && !!patientText;

    if (!useSnapshot && !usePatientFallback) return null;

    return (
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
          {label}
          {usePatientFallback && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
              Source : dossier patient
            </span>
          )}
        </h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-gray-900 whitespace-pre-wrap">
            {useSnapshot ? snapshotText : patientText}
          </p>
        </div>
      </div>
    );
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
            className="relative w-[calc(100%-2rem)] md:w-[700px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Eye size={20} className="text-primary-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {consultation ? `Consultation du ${format(consultation.date, 'dd/MM/yyyy', { locale: fr })}` : 'Détails de la consultation'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && (
                <div className="mb-4 p-3 bg-error/5 border border-error/20 rounded-lg flex items-center">
                  <AlertCircle size={16} className="text-error mr-2" />
                  <span className="text-error text-sm">{error}</span>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : consultation ? (
                <div className="space-y-6">
                  {/* Bandeau d'information pour consultation initiale */}
                  {consultation.isInitialConsultation && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900">Consultation initiale synchronisée</h4>
                          <p className="mt-1 text-sm text-blue-700">
                            Chaque champ affiche le snapshot de la consultation. S'il est vide, la valeur du dossier patient est affichée avec le badge « Source : dossier patient ».
                          </p>
                          {patientLastUpdated && (
                            <p className="mt-1 text-xs text-blue-600">
                              Dernière mise à jour du dossier patient : {patientLastUpdated.toLocaleDateString('fr-FR')} à {patientLastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informations générales de la consultation */}
                  <div className="bg-primary-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-primary-900">
                        Informations générales
                      </h3>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(consultation.status)}`}>
                        {getStatusText(consultation.status)}
                      </span>
                    </div>
                    <div className="flex items-center mb-3">
                      <User size={16} className="mr-2 text-primary-600" />
                      <span className="text-primary-700 font-medium">{consultation.patientName}</span>
                    </div>
                    <div className="flex items-center text-sm text-primary-700 space-x-4">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>{formatDateTime(consultation.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        <span>{consultation.duration} min</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium">{consultation.price} €</span>
                      </div>
                    </div>
                  </div>

                  {/* ✅ SUPPRIMÉ : Anciens champs "Motif de consultation" et "Traitement effectué" 
                      Ces champs sont remplacés par les champs détaillés dans la section "Données cliniques" */}

                  {/* Note sur le patient */}
                  {consultation.notes && cleanDecryptedField(consultation.notes, false, '') && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <FileText size={16} className="mr-2 text-gray-600" />
                        Note sur le patient
                      </h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {cleanDecryptedField(consultation.notes, false, '')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Examens demandés */}
                  {consultation.examinations && consultation.examinations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Examens demandés</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <ul className="list-disc list-inside space-y-1">
                          {consultation.examinations.map((exam, index) => (
                            <li key={index} className="text-gray-900">{exam}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Prescriptions */}
                  {consultation.prescriptions && consultation.prescriptions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Prescriptions</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <ul className="list-disc list-inside space-y-1">
                          {consultation.prescriptions.map((prescription, index) => (
                            <li key={index} className="text-gray-900">{prescription}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Section Données Cliniques */}
                  {(consultation.consultationReason || consultation.currentTreatment || consultation.medicalAntecedents ||
                    consultation.medicalHistory || consultation.osteopathicTreatment || (consultation.symptoms && consultation.symptoms.length > 0)) && (
                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Données cliniques de la consultation</h3>

                      {/* Motif détaillé (avec fallback dossier patient si snapshot vide) */}
                      {renderClinicalField(
                        'Motif de consultation détaillé',
                        consultation.consultationReason,
                        patientData?.consultationReason,
                        consultation.isInitialConsultation
                      )}

                      {/* Traitement effectué du patient */}
                      {renderClinicalField(
                        'Traitement effectué du patient',
                        consultation.currentTreatment,
                        patientData?.currentTreatment,
                        consultation.isInitialConsultation
                      )}

                      {/* Antécédents médicaux */}
                      {renderClinicalField(
                        'Antécédents médicaux',
                        consultation.medicalAntecedents,
                        patientData?.medicalAntecedents,
                        consultation.isInitialConsultation
                      )}

                      {/* Historique médical */}
                      {renderClinicalField(
                        'Historique médical',
                        consultation.medicalHistory,
                        patientData?.medicalHistory,
                        consultation.isInitialConsultation
                      )}

                      {/* Traitement ostéopathique */}
                      {renderClinicalField(
                        'Traitement ostéopathique',
                        consultation.osteopathicTreatment,
                        patientData?.osteopathicTreatment,
                        consultation.isInitialConsultation
                      )}

                      {/* Symptômes (fallback patient si snapshot vide) */}
                      {(() => {
                        const hasSnapshotSymptoms = (consultation.symptoms && consultation.symptoms.length > 0);
                        const fallbackSymptoms = (consultation.isInitialConsultation && patientData?.symptoms && patientData.symptoms.length > 0) ? patientData.symptoms : [];
                        const symptomsToDisplay = hasSnapshotSymptoms ? (consultation.symptoms || []) : fallbackSymptoms;
                        if (!symptomsToDisplay || symptomsToDisplay.length === 0) return null;
                        const showFallbackBadge = !hasSnapshotSymptoms && consultation.isInitialConsultation && fallbackSymptoms.length > 0;
                        return (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                              Symptômes
                              {showFallbackBadge && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                                  Source : dossier patient
                                </span>
                              )}
                            </h4>
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex flex-wrap gap-2">
                                {symptomsToDisplay.map((symptom: string, index: number) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-50 text-primary-700"
                                  >
                                    {symptom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Documents de consultation */}
                  {consultation.documents && consultation.documents.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <FileText size={16} className="mr-2 text-gray-600" />
                        Documents de consultation
                      </h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {consultation.documents.map((document) => (
                            <div
                              key={document.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                                  {consultation.isInitialConsultation && document.folder?.includes('/patients/') && (
                                    <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                                      Source : dossier patient
                                    </span>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(document.size)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<Eye size={14} />}
                                  className="text-primary-600 hover:text-primary-700"
                                  onClick={() => {
                                    setZoom(1);
                                    setViewerLoading(true);
                                    setViewingDocument(document);
                                  }}
                                >
                                  Voir
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<Trash2 size={14} />}
                                  className="text-red-600 hover:text-red-700"
                                  onClick={async () => {
                                    const confirmDelete = window.confirm('Supprimer ce document de la consultation ?');
                                    if (!confirmDelete || !consultation) return;
                                    try {
                                      const filePath = `${document.folder}/${document.name}`;
                                      await deleteDocument(filePath);
                                      const updatedDocs = (consultation.documents || []).filter(d => d.id !== document.id);
                                      await ConsultationService.updateConsultation(consultationId, { documents: updatedDocs });
                                      setConsultation({ ...consultation, documents: updatedDocs });
                                    } catch (err) {
                                      console.error('Erreur de suppression du document:', err);
                                      alert('Échec de la suppression du document.');
                                    }
                                  }}
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Consultation non trouvée</p>
                </div>
              )}
        </div>
            
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button variant="primary" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </motion.div>
          {viewingDocument && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center"
            >
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                  setViewingDocument(null);
                  setViewerLoading(false);
                  setZoom(1);
                }}
              />
              <div
                className="relative w-[calc(100%-2rem)] md:w-[900px] h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center min-w-0">
                    <Eye size={18} className="text-primary-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {viewingDocument.displayName || viewingDocument.originalName || viewingDocument.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isImageFile(viewingDocument.type) && (
                      <>
                        <Button variant="ghost" size="sm" leftIcon={<ZoomOut size={14} />} onClick={() => setZoom(Math.max(0.25, parseFloat((zoom - 0.25).toFixed(2))))}>Zoom -</Button>
                        <Button variant="ghost" size="sm" leftIcon={<ZoomIn size={14} />} onClick={() => setZoom(Math.min(3, parseFloat((zoom + 0.25).toFixed(2))))}>Zoom +</Button>
                        <Button variant="ghost" size="sm" leftIcon={<RefreshCcw size={14} />} onClick={() => setZoom(1)}>Reset</Button>
                      </>
                    )}
                    <a href={viewingDocument.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>Télécharger</Button>
                    </a>
                    <button
                      onClick={() => {
                        setViewingDocument(null);
                        setViewerLoading(false);
                        setZoom(1);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Fermer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden bg-gray-50">
                  {viewerLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                    </div>
                  )}
                  <div className="w-full h-full overflow-auto">
                    {isImageFile(viewingDocument.type) ? (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <img
                          src={viewingDocument.url}
                          alt={viewingDocument.displayName || viewingDocument.originalName || viewingDocument.name}
                          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                          className="max-w-full max-h-full"
                          onLoad={() => setViewerLoading(false)}
                          onError={() => setViewerLoading(false)}
                        />
                      </div>
                    ) : (
                      <iframe
                        src={viewingDocument.url}
                        title={viewingDocument.displayName || viewingDocument.originalName || viewingDocument.name}
                        className="w-full h-full"
                        onLoad={() => setViewerLoading(false)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

export default ViewConsultationModal;