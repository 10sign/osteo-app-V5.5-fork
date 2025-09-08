import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  FileText, 
  Plus, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Eye,
  Download,
  Upload,
  X,
  History,
  Stethoscope,
  Activity,
  Heart,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { PatientService } from '../../services/patientService';
import { ConsultationService } from '../../services/consultationService';
import { Button } from '../../components/ui/Button';
import EditPatientModal from '../../components/modals/EditPatientModal';
import DeletePatientModal from '../../components/modals/DeletePatientModal';
import AddConsultationModal from '../../components/modals/AddConsultationModal';
import EditConsultationModal from '../../components/modals/EditConsultationModal';
import ViewConsultationModal from '../../components/modals/ViewConsultationModal';
import DeleteConsultationModal from '../../components/modals/DeleteConsultationModal';
import NewInvoiceModal from '../../components/modals/NewInvoiceModal';
import DocumentManagerModal from '../../components/modals/DocumentManagerModal';
import { Patient, Consultation } from '../../types';
import { db, auth } from '../../firebase/config';
import { HDSCompliance } from '../../utils/hdsCompliance';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddConsultationModalOpen, setIsAddConsultationModalOpen] = useState(false);
  const [isEditConsultationModalOpen, setIsEditConsultationModalOpen] = useState(false);
  const [isViewConsultationModalOpen, setIsViewConsultationModalOpen] = useState(false);
  const [isDeleteConsultationModalOpen, setIsDeleteConsultationModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [consultationToDelete, setConsultationToDelete] = useState<{
    id: string;
    patientName: string;
    date: string;
    time: string;
  } | null>(null);
  const [isDeletingConsultation, setIsDeletingConsultation] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    consultations: true,
    documents: false
  });

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load patient data
  useEffect(() => {
    const loadPatientData = async () => {
      if (!id || !auth.currentUser) {
        setError('ID patient manquant ou utilisateur non authentifié');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load patient data
        const patientData = await PatientService.getPatientById(id);
        setPatient(patientData);

        // Load consultations for this patient
        const consultationsData = await ConsultationService.getConsultationsByPatientId(id);
        setConsultations(consultationsData);

      } catch (error) {
        console.error('Error loading patient data:', error);
        setError('Erreur lors du chargement des données du patient');
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [id]);

  // Real-time updates for consultations
  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const unsubscribe = onSnapshot(
      doc(db, 'patients', id),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const decryptedData = HDSCompliance.decryptDataForDisplay(
            data,
            'patients',
            auth.currentUser!.uid
          );
          setPatient({ ...decryptedData, id: doc.id } as Patient);
        }
      },
      (error) => {
        console.error('Error in patient listener:', error);
      }
    );

    return () => unsubscribe();
  }, [id]);

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    // Patient data will be updated via the real-time listener
  };

  const handleDeleteSuccess = () => {
    navigate('/patients');
  };

  const handleConsultationSuccess = () => {
    setIsAddConsultationModalOpen(false);
    setIsEditConsultationModalOpen(false);
    setSelectedConsultationId(null);
    // Reload consultations
    if (id) {
      ConsultationService.getConsultationsByPatientId(id)
        .then(setConsultations)
        .catch(console.error);
    }
  };

  const handleViewConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setIsViewConsultationModalOpen(true);
  };

  const handleEditConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setIsEditConsultationModalOpen(true);
  };

  const handleDeleteConsultation = (consultationId: string) => {
    const consultation = consultations.find(c => c.id === consultationId);
    if (consultation) {
      setConsultationToDelete({
        id: consultation.id,
        patientName: consultation.patientName,
        date: format(consultation.date, 'dd/MM/yyyy', { locale: fr }),
        time: format(consultation.date, 'HH:mm')
      });
      setIsDeleteConsultationModalOpen(true);
    }
  };

  const confirmConsultationDeletion = async () => {
    if (!consultationToDelete) return;

    setIsDeletingConsultation(true);
    try {
      await ConsultationService.deleteConsultation(consultationToDelete.id);
      setIsDeleteConsultationModalOpen(false);
      setConsultationToDelete(null);
      
      // Reload consultations
      if (id) {
        const updatedConsultations = await ConsultationService.getConsultationsByPatientId(id);
        setConsultations(updatedConsultations);
      }
    } catch (error) {
      console.error('Error deleting consultation:', error);
      setError('Erreur lors de la suppression de la consultation');
    } finally {
      setIsDeletingConsultation(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const formatDateTime = (date: Date) => {
    try {
      return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const calculateAge = (birthDate: string) => {
    try {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return 'N/A';
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

  const isSmallScreen = windowWidth < 768;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/patients')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Patients
          </Button>
        </div>
        
        <div className="p-6 bg-error/5 border border-error/20 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="text-error mr-3" size={24} />
            <div>
              <h3 className="font-medium text-error">Erreur</h3>
              <p className="text-error/80">{error || 'Patient non trouvé'}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/patients')}
            >
              Retour à la liste des patients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/patients')}
            leftIcon={<ArrowLeft size={16} />}
            className="mr-2"
          >
            {isSmallScreen ? "" : "Patients"}
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              {calculateAge(patient.dateOfBirth)} ans • {formatDate(patient.dateOfBirth)}
            </p>
          </div>
        </div>
        
        {/* Desktop actions */}
        <div className="hidden sm:flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={<Calendar size={16} />}
            onClick={() => setIsAddConsultationModalOpen(true)}
          >
            Nouvelle consultation
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={<FileText size={16} />}
            onClick={() => setIsNewInvoiceModalOpen(true)}
          >
            Nouvelle facture
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={<Edit size={16} />}
            onClick={() => setIsEditModalOpen(true)}
          >
            Modifier
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={<Trash2 size={16} />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Supprimer
          </Button>
        </div>
        
        {/* Mobile actions */}
        <div className="sm:hidden relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileActions(!showMobileActions)}
            leftIcon={<MoreVertical size={16} />}
          >
            Actions
          </Button>
          
          {showMobileActions && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="py-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setIsAddConsultationModalOpen(true);
                    setShowMobileActions(false);
                  }}
                >
                  <Calendar size={14} className="mr-2" />
                  Nouvelle consultation
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setIsNewInvoiceModalOpen(true);
                    setShowMobileActions(false);
                  }}
                >
                  <FileText size={14} className="mr-2" />
                  Nouvelle facture
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setIsEditModalOpen(true);
                    setShowMobileActions(false);
                  }}
                >
                  <Edit size={14} className="mr-2" />
                  Modifier
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-error hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setShowMobileActions(false);
                  }}
                >
                  <Trash2 size={14} className="mr-2" />
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient overview card */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {patient.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone size={16} className="mr-2 text-gray-400" />
                  <span className="text-sm">{patient.phone}</span>
                </div>
              )}
              
              {patient.email && (
                <div className="flex items-center text-gray-600">
                  <Mail size={16} className="mr-2 text-gray-400" />
                  <span className="text-sm">{patient.email}</span>
                </div>
              )}
              
              {patient.profession && (
                <div className="flex items-center text-gray-600">
                  <User size={16} className="mr-2 text-gray-400" />
                  <span className="text-sm">{patient.profession}</span>
                </div>
              )}
              
              {patient.address?.street && (
                <div className="flex items-start text-gray-600 sm:col-span-2 lg:col-span-3">
                  <MapPin size={16} className="mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{patient.address.street}</span>
                </div>
              )}
            </div>
            
            {patient.tags && patient.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {patient.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm bg-primary-50 text-primary-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User size={16} className="inline mr-2" />
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('consultations')}
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'consultations'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Stethoscope size={16} className="inline mr-2" />
          Consultations ({consultations.length})
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} className="inline mr-2" />
          Documents
        </button>
      </div>

      {/* Tab content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medical information */}
            <div className="bg-white rounded-xl shadow p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Heart size={20} className="mr-2 text-red-500" />
                  Informations médicales
                </h3>
                <button
                  onClick={() => toggleSection('medical')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expandedSections.medical ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              
              {expandedSections.medical !== false && (
                <div className="space-y-4">
                  {patient.medicalHistory && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Historique médical</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {cleanDecryptedField(patient.medicalHistory, false, 'Aucun historique médical renseigné')}
                      </p>
                    </div>
                  )}
                  
                  {patient.currentTreatment && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Traitement actuel</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {cleanDecryptedField(patient.currentTreatment, false, 'Aucun traitement actuel')}
                      </p>
                    </div>
                  )}
                  
                  {patient.medicalAntecedents && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Antécédents médicaux</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {cleanDecryptedField(patient.medicalAntecedents, false, 'Aucun antécédent médical renseigné')}
                      </p>
                    </div>
                  )}
                  
                  {patient.osteopathicTreatment && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Traitement ostéopathique</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {cleanDecryptedField(patient.osteopathicTreatment, false, 'Aucun traitement ostéopathique renseigné')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Insurance and contact */}
            <div className="bg-white rounded-xl shadow p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Shield size={20} className="mr-2 text-blue-500" />
                Assurance et contact
              </h3>
              
              <div className="space-y-4">
                {patient.insurance?.provider && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Mutuelle</h4>
                    <p className="text-sm text-gray-600">{patient.insurance.provider}</p>
                    {patient.insurance.policyNumber && (
                      <p className="text-xs text-gray-500">N° {patient.insurance.policyNumber}</p>
                    )}
                  </div>
                )}
                
                {patient.nextAppointment && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Prochain rendez-vous</h4>
                    <div className="flex items-center text-sm text-primary-600">
                      <Calendar size={14} className="mr-1" />
                      <span>{formatDateTime(new Date(patient.nextAppointment))}</span>
                    </div>
                  </div>
                )}
                
                {patient.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {cleanDecryptedField(patient.notes, false, 'Aucune note')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consultations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Consultations ({consultations.length})
              </h3>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={() => setIsAddConsultationModalOpen(true)}
              >
                {isSmallScreen ? "Nouvelle" : "Nouvelle consultation"}
              </Button>
            </div>

            {consultations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow">
                <Stethoscope size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune consultation</h3>
                <p className="text-gray-500 mb-4">
                  Commencez par créer la première consultation pour ce patient.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsAddConsultationModalOpen(true)}
                  leftIcon={<Plus size={16} />}
                >
                  Créer une consultation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <div key={consultation.id} className="bg-white rounded-xl shadow p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-base font-medium text-gray-900">
                            {cleanDecryptedField(consultation.reason, false, 'Consultation ostéopathique')}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consultation.status)}`}>
                            {getStatusText(consultation.status)}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <Clock size={14} className="mr-1" />
                          <span>{formatDateTime(consultation.date)}</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {cleanDecryptedField(consultation.treatment, false, 'Traitement ostéopathique standard')}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewConsultation(consultation.id)}
                          leftIcon={<Eye size={14} />}
                        >
                          {isSmallScreen ? "" : "Voir"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditConsultation(consultation.id)}
                          leftIcon={<Edit size={14} />}
                        >
                          {isSmallScreen ? "" : "Modifier"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConsultation(consultation.id)}
                          leftIcon={<Trash2 size={14} />}
                          className="text-error hover:text-error/80"
                        >
                          {isSmallScreen ? "" : "Supprimer"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Documents médicaux
              </h3>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Upload size={16} />}
                onClick={() => setIsDocumentManagerOpen(true)}
              >
                {isSmallScreen ? "Gérer" : "Gérer les documents"}
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow p-4 sm:p-6">
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Documents médicaux</h3>
                <p className="text-gray-500 mb-4">
                  Gérez les documents médicaux de ce patient (ordonnances, comptes-rendus, imagerie, etc.)
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsDocumentManagerOpen(true)}
                  leftIcon={<Upload size={16} />}
                >
                  Ouvrir le gestionnaire de documents
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditPatientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        patient={patient}
      />

      <DeletePatientModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteSuccess}
        isLoading={false}
        patientName={`${patient.firstName} ${patient.lastName}`}
        patientId={patient.id}
      />

      <AddConsultationModal
        isOpen={isAddConsultationModalOpen}
        onClose={() => setIsAddConsultationModalOpen(false)}
        onSuccess={handleConsultationSuccess}
        patientId={patient.id}
        patientName={`${patient.firstName} ${patient.lastName}`}
      />

      {selectedConsultationId && (
        <>
          <EditConsultationModal
            isOpen={isEditConsultationModalOpen}
            onClose={() => {
              setIsEditConsultationModalOpen(false);
              setSelectedConsultationId(null);
            }}
            onSuccess={handleConsultationSuccess}
            consultationId={selectedConsultationId}
            preselectedPatientId={patient.id}
            preselectedPatientName={`${patient.firstName} ${patient.lastName}`}
          />

          <ViewConsultationModal
            isOpen={isViewConsultationModalOpen}
            onClose={() => {
              setIsViewConsultationModalOpen(false);
              setSelectedConsultationId(null);
            }}
            consultationId={selectedConsultationId}
          />
        </>
      )}

      <DeleteConsultationModal
        isOpen={isDeleteConsultationModalOpen}
        onClose={() => {
          setIsDeleteConsultationModalOpen(false);
          setConsultationToDelete(null);
        }}
        onConfirm={confirmConsultationDeletion}
        isLoading={isDeletingConsultation}
        consultationInfo={consultationToDelete || {
          id: '',
          patientName: '',
          date: '',
          time: ''
        }}
      />

      <NewInvoiceModal
        isOpen={isNewInvoiceModalOpen}
        onClose={() => setIsNewInvoiceModalOpen(false)}
        onSuccess={() => setIsNewInvoiceModalOpen(false)}
        preselectedPatientId={patient.id}
      />

      <DocumentManagerModal
        isOpen={isDocumentManagerOpen}
        onClose={() => setIsDocumentManagerOpen(false)}
        documentType="patient"
        entityId={patient.id}
        title={`Documents de ${patient.firstName} ${patient.lastName}`}
      />
    </div>
  );
};

export default PatientDetail;