import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
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
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Stethoscope,
  Activity,
  ChevronLeft,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { deleteDocument } from '../../utils/documentStorage';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { PatientService } from '../../services/patientService';
import { ConsultationService } from '../../services/consultationService';
import { Button } from '../../components/ui/Button';
import EditPatientModal from '../../components/modals/EditPatientModal';
import DeletePatientModal from '../../components/modals/DeletePatientModal';
import NewConsultationModal from '../../components/modals/NewConsultationModal';
import EditConsultationModal from '../../components/modals/EditConsultationModal';
import ViewConsultationModal from '../../components/modals/ViewConsultationModal';
import DeleteConsultationModal from '../../components/modals/DeleteConsultationModal';
import NewInvoiceModal from '../../components/modals/NewInvoiceModal';
import { Patient, Consultation } from '../../types';
import { db, auth } from '../../firebase/config';
import { HDSCompliance } from '../../utils/hdsCompliance';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewConsultationModalOpen, setIsNewConsultationModalOpen] = useState(false);
  const [isEditConsultationModalOpen, setIsEditConsultationModalOpen] = useState(false);
  const [isViewConsultationModalOpen, setIsViewConsultationModalOpen] = useState(false);
  const [isDeleteConsultationModalOpen, setIsDeleteConsultationModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [consultationToDelete, setConsultationToDelete] = useState<{
    id: string;
    patientName: string;
    date: string;
    time: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingConsultation, setIsDeletingConsultation] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for tab parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const loadPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load patient data
        const patientRef = doc(db, 'patients', id);
        const patientDoc = await getDoc(patientRef);

        if (!patientDoc.exists()) {
          setError('Patient non trouvé');
          setLoading(false);
          return;
        }

        const patientData = patientDoc.data();

        // Verify ownership
        if (patientData.osteopathId !== auth.currentUser.uid) {
          setError('Vous n\'avez pas accès à ce patient');
          setLoading(false);
          return;
        }

        // Decrypt patient data for display
        const decryptedPatientData = HDSCompliance.decryptDataForDisplay(
          patientData,
          'patients',
          auth.currentUser.uid
        );

        setPatient({
          ...decryptedPatientData,
          id: patientDoc.id
        } as Patient);

        // Load consultations
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

    // Set up real-time listener for patient data
    const patientRef = doc(db, 'patients', id);
    const unsubscribe = onSnapshot(patientRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const patientData = docSnapshot.data();
        
        // Verify ownership
        if (patientData.osteopathId === auth.currentUser?.uid) {
          // Decrypt patient data for display
          const decryptedPatientData = HDSCompliance.decryptDataForDisplay(
            patientData,
            'patients',
            auth.currentUser.uid
          );

          setPatient({
            ...decryptedPatientData,
            id: docSnapshot.id
          } as Patient);
        }
      }
    });

    return () => unsubscribe();
  }, [id]);

  const handleDeleteDocument = async (documentId: string) => {
    if (!patient || !documentId) return;

    // Find the document to delete
    const documentToDelete = patient.documents?.find(doc => doc.id === documentId);
    if (!documentToDelete) {
      setDeleteError('Document non trouvé');
      return;
    }

    // Show confirmation
    const confirmed = window.confirm('Supprimer définitivement ce document ? Cette action est irréversible.');
    if (!confirmed) return;

    setIsDeletingDocument(true);
    setDeleteError(null);

    try {
      // Delete from storage
      const filePath = `${documentToDelete.folder}/${documentToDelete.name}`;
      await deleteDocument(filePath);

      // Update patient document in Firestore
      const updatedDocuments = patient.documents?.filter(doc => doc.id !== documentId) || [];
      
      const patientRef = doc(db, 'patients', patient.id);
      await updateDoc(patientRef, {
        documents: updatedDocuments,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setPatient(prev => prev ? {
        ...prev,
        documents: updatedDocuments
      } : null);

      // Show success message
      setDeleteSuccess('Document supprimé');
      setTimeout(() => setDeleteSuccess(null), 3000);

    } catch (error) {
      console.error('Delete error:', error);
      setDeleteError('Erreur lors de la suppression du document');
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setIsDeletingDocument(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!patient) return;

    setIsDeleting(true);
    try {
      await PatientService.deletePatient(patient.id);
      navigate('/patients');
    } catch (error) {
      console.error('Error deleting patient:', error);
      setError('Erreur lors de la suppression du patient');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleEditConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setIsEditConsultationModalOpen(true);
  };

  const handleViewConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setIsViewConsultationModalOpen(true);
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
      
      // Update local consultations list
      setConsultations(prev => prev.filter(c => c.id !== consultationToDelete.id));
      
      setIsDeleteConsultationModalOpen(false);
      setConsultationToDelete(null);
    } catch (error) {
      console.error('Error deleting consultation:', error);
      setError('Erreur lors de la suppression de la consultation');
    } finally {
      setIsDeletingConsultation(false);
    }
  };

  const handleConsultationSuccess = () => {
    // Reload consultations
    if (id) {
      ConsultationService.getConsultationsByPatientId(id)
        .then(setConsultations)
        .catch(console.error);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const formatBirthDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('fr-FR');
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

  const formatAppointmentDate = (date: string) => {
    try {
      const appointmentDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = appointmentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return "Aujourd'hui";
      } else if (diffDays === 1) {
        return "Demain";
      } else if (diffDays <= 7) {
        return `Dans ${diffDays} jours`;
      }

      return appointmentDate.toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date invalide';
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
              <p className="text-error/80">{error || 'Une erreur est survenue'}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/patients')}
            >
              Retour aux patients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {deleteSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
          <CheckCircle size={16} className="text-green-600 mr-2" />
          <span className="text-green-700 text-sm">{deleteSuccess}</span>
        </div>
      )}

      {deleteError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
          <AlertCircle size={16} className="text-red-600 mr-2" />
          <span className="text-red-700 text-sm">{deleteError}</span>
          <button 
            onClick={() => setDeleteError(null)}
            className="ml-2 text-red-600 hover:text-red-800"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
          {isSmallScreen && <ChevronLeft size={16} className="text-gray-500 mr-1" />}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {patient.firstName} {patient.lastName}
          </h1>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={<Edit size={16} />}
            onClick={() => setIsEditModalOpen(true)}
          >
            {isSmallScreen ? "Modifier" : "Modifier"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={<Trash2 size={16} />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            {isSmallScreen ? "Supprimer" : "Supprimer"}
          </Button>
        </div>
      </div>

      {/* Patient Overview Card */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold text-primary-600">
                {getInitials(patient.firstName, patient.lastName)}
              </span>
            </div>
          </div>
          
          <div className="flex-1 space-y-3 sm:space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500 mt-1">
                <span>{calculateAge(patient.dateOfBirth)} ans</span>
                <span>•</span>
                <span>Né(e) le {formatBirthDate(patient.dateOfBirth)}</span>
                {patient.profession && (
                  <>
                    <span>•</span>
                    <span>{patient.profession}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {patient.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-2 text-gray-400" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail size={16} className="mr-2 text-gray-400" />
                  <span>{patient.email}</span>
                </div>
              )}
              {patient.address?.street && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={16} className="mr-2 text-gray-400" />
                  <span>{patient.address.street}</span>
                </div>
              )}
            </div>
            
            {patient.nextAppointment && (
              <div className="bg-primary-50 rounded-lg p-3">
                <div className="flex items-center text-primary-700">
                  <Calendar size={16} className="mr-2" />
                  <span className="font-medium">Prochain rendez-vous : {formatAppointmentDate(patient.nextAppointment)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: <User size={16} /> },
            { id: 'consultations', label: 'Consultations', icon: <Stethoscope size={16} /> },
            { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
            { id: 'history', label: 'Historique', icon: <Activity size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medical Information */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations médicales</h3>
              <div className="space-y-4">
                {patient.medicalHistory && cleanDecryptedField(patient.medicalHistory, false, '') && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Historique médical</h4>
                    <p className="text-gray-600 mt-1">{cleanDecryptedField(patient.medicalHistory, false, 'Aucun historique médical')}</p>
                  </div>
                )}
                
                {patient.currentTreatment && cleanDecryptedField(patient.currentTreatment, false, '') && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Traitement actuel</h4>
                    <p className="text-gray-600 mt-1">{cleanDecryptedField(patient.currentTreatment, false, 'Aucun traitement en cours')}</p>
                  </div>
                )}
                
                {patient.medicalAntecedents && cleanDecryptedField(patient.medicalAntecedents, false, '') && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Antécédents médicaux</h4>
                    <p className="text-gray-600 mt-1">{cleanDecryptedField(patient.medicalAntecedents, false, 'Aucun antécédent médical')}</p>
                  </div>
                )}
                
                {patient.osteopathicTreatment && cleanDecryptedField(patient.osteopathicTreatment, false, '') && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Traitement ostéopathique</h4>
                    <p className="text-gray-600 mt-1">{cleanDecryptedField(patient.osteopathicTreatment, false, 'Aucun traitement ostéopathique spécifié')}</p>
                  </div>
                )}
                
                {patient.tags && patient.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Symptômes / Syndromes</h4>
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
                  </div>
                )}
              </div>
            </div>

            {/* Insurance Information */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations administratives</h3>
              <div className="space-y-4">
                {patient.insurance?.provider && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Mutuelle</h4>
                    <p className="text-gray-600 mt-1">{patient.insurance.provider}</p>
                  </div>
                )}
                
                {patient.insurance?.policyNumber && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Numéro d'assuré</h4>
                    <p className="text-gray-600 mt-1">{patient.insurance.policyNumber}</p>
                  </div>
                )}
                
                {patient.notes && cleanDecryptedField(patient.notes, false, '') && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                    <p className="text-gray-600 mt-1">{cleanDecryptedField(patient.notes, false, 'Aucune note')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consultations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Consultations ({consultations.length})</h3>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={() => setIsNewConsultationModalOpen(true)}
              >
                Nouvelle consultation
              </Button>
            </div>
            
            {consultations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow">
                <Stethoscope size={48} className="mx-auto text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune consultation</h4>
                <p className="text-gray-500 mb-4">
                  Aucune consultation n'a encore été enregistrée pour ce patient.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsNewConsultationModalOpen(true)}
                  leftIcon={<Plus size={16} />}
                >
                  Ajouter une consultation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <div key={consultation.id} className="bg-white rounded-xl shadow p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {cleanDecryptedField(consultation.reason, false, 'Consultation ostéopathique')}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            consultation.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {consultation.status === 'completed' ? 'Terminée' : 'En cours'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            <span>{format(consultation.date, 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                          </div>
                          {consultation.duration && (
                            <div className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              <span>{consultation.duration} min</span>
                            </div>
                          )}
                        </div>
                        {consultation.treatment && cleanDecryptedField(consultation.treatment, false, '') && (
                          <p className="text-gray-600 mt-2 text-sm">
                            {cleanDecryptedField(consultation.treatment, false, 'Traitement ostéopathique standard').substring(0, 100)}
                            {cleanDecryptedField(consultation.treatment, false, '').length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye size={14} />}
                          onClick={() => handleViewConsultation(consultation.id)}
                        >
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit size={14} />}
                          onClick={() => handleEditConsultation(consultation.id)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Trash2 size={14} />}
                          onClick={() => handleDeleteConsultation(consultation.id)}
                        >
                          Supprimer
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Documents ({patient.documents?.length || 0})
              </h3>
            </div>
            
            {!patient.documents || patient.documents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Aucun document</h4>
                <p className="text-gray-500">
                  Aucun document n'a encore été ajouté pour ce patient.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {patient.documents.map((document) => (
                  <div key={document.id} className="bg-white rounded-xl shadow p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <FileText size={24} className="text-gray-500" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {document.originalName || document.name}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-xs text-gray-500">
                              {document.size ? `${(document.size / 1024).toFixed(1)} KB` : 'Taille inconnue'}
                            </p>
                            {document.uploadedAt && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(document.uploadedAt), 'dd/MM/yyyy', { locale: fr })}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye size={14} />}
                          onClick={() => window.open(document.url, '_blank')}
                        >
                          Voir
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Download size={14} />}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = document.url;
                            link.download = document.originalName || document.name;
                            link.click();
                          }}
                        >
                          Télécharger
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Trash2 size={14} />}
                          onClick={() => handleDeleteDocument(document.id)}
                          disabled={isDeletingDocument}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        >
                          {isDeletingDocument ? 'Suppression...' : 'Supprimer'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Historique des modifications</h3>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Clock size={14} className="mr-2" />
                <span>Créé le {formatBirthDate(patient.createdAt)}</span>
              </div>
              {patient.updatedAt && patient.updatedAt !== patient.createdAt && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock size={14} className="mr-2" />
                  <span>Dernière modification le {formatBirthDate(patient.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditPatientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          // Patient data will be updated via the real-time listener
        }}
        patient={patient}
      />

      <DeletePatientModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeletePatient}
        isLoading={isDeleting}
        patientName={`${patient.firstName} ${patient.lastName}`}
        patientId={patient.id}
      />

      <NewConsultationModal
        isOpen={isNewConsultationModalOpen}
        onClose={() => setIsNewConsultationModalOpen(false)}
        onSuccess={() => {
          setIsNewConsultationModalOpen(false);
          handleConsultationSuccess();
        }}
        preselectedPatientId={patient.id}
        preselectedPatientName={`${patient.firstName} ${patient.lastName}`}
      />

      {selectedConsultationId && (
        <>
          <EditConsultationModal
            isOpen={isEditConsultationModalOpen}
            onClose={() => {
              setIsEditConsultationModalOpen(false);
              setSelectedConsultationId(null);
            }}
            onSuccess={() => {
              setIsEditConsultationModalOpen(false);
              setSelectedConsultationId(null);
              handleConsultationSuccess();
            }}
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
        onSuccess={() => {
          setIsNewInvoiceModalOpen(false);
        }}
        preselectedPatientId={patient.id}
      />
    </div>
  );
};

export default PatientDetail;