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
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  Eye, 
  Download,
  Stethoscope,
  Heart,
  Shield,
  Activity,
  CreditCard,
  CalendarPlus,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { Button } from '../../components/ui/Button';
import EditPatientModal from '../../components/modals/EditPatientModal';
import DeletePatientModal from '../../components/modals/DeletePatientModal';
import NewConsultationModal from '../../components/modals/NewConsultationModal';
import ViewConsultationModal from '../../components/modals/ViewConsultationModal';
import EditConsultationModal from '../../components/modals/EditConsultationModal';
import DeleteConsultationModal from '../../components/modals/DeleteConsultationModal';
import { Patient } from '../../types';
import { HDSCompliance } from '../../utils/hdsCompliance';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { format, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { patientCache } from '../../utils/patientCache';
import DocumentUploadManager from '../../components/ui/DocumentUploadManager';
import { DocumentMetadata } from '../../utils/documentStorage';
import { ConsultationService } from '../../services/consultationService';

interface Consultation {
  id: string;
  date: Date;
  reason: string;
  treatment: string;
  notes: string;
  status: string;
  price: number;
  duration: number;
}

interface Invoice {
  id: string;
  number: string;
  issueDate: string;
  total: number;
  status: string;
  consultationId?: string;
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewConsultationModalOpen, setIsNewConsultationModalOpen] = useState(false);
  const [isViewConsultationModalOpen, setIsViewConsultationModalOpen] = useState(false);
  const [isEditConsultationModalOpen, setIsEditConsultationModalOpen] = useState(false);
  const [isDeleteConsultationModalOpen, setIsDeleteConsultationModalOpen] = useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [consultationToDelete, setConsultationToDelete] = useState<{
    id: string;
    patientName: string;
    date: string;
    time: string;
  } | null>(null);
  const [isDeletingConsultation, setIsDeletingConsultation] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [patientDocuments, setPatientDocuments] = useState<DocumentMetadata[]>([]);

  useEffect(() => {
    if (id) {
      loadPatientData();
    }
  }, [id]);

  const loadPatientData = async () => {
    if (!id || !auth.currentUser) return;

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cachedPatient = patientCache.get(id);
      if (cachedPatient) {
        setPatient(cachedPatient);
        setLoading(false);
      }

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

      const patientWithId = {
        ...decryptedPatientData,
        id: patientDoc.id
      } as Patient;

      setPatient(patientWithId);
      patientCache.set(id, patientWithId);

      // Initialize patient documents
      setPatientDocuments(patientWithId.documents || []);

      // Load consultations
      await loadConsultations();
      
      // Load invoices
      await loadInvoices();

    } catch (error) {
      console.error('Error loading patient:', error);
      setError('Erreur lors du chargement du patient');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadConsultations = async () => {
    if (!id || !auth.currentUser) return;

    try {
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('patientId', '==', id),
        where('osteopathId', '==', auth.currentUser.uid),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const consultationsData: Consultation[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Decrypt consultation data
        const decryptedData = HDSCompliance.decryptDataForDisplay(
          data,
          'consultations',
          auth.currentUser.uid
        );

        consultationsData.push({
          id: docSnap.id,
          date: data.date?.toDate?.() || new Date(data.date),
          reason: decryptedData.reason || '',
          treatment: decryptedData.treatment || '',
          notes: decryptedData.notes || '',
          status: data.status || 'completed',
          price: data.price || 0,
          duration: data.duration || 60
        });
      }

      setConsultations(consultationsData);
    } catch (error) {
      console.error('Error loading consultations:', error);
    }
  };

  const loadInvoices = async () => {
    if (!id || !auth.currentUser) return;

    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('patientId', '==', id),
        where('osteopathId', '==', auth.currentUser.uid)
      );

      const snapshot = await getDocs(q);
      const invoicesData: Invoice[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        number: docSnap.data().number,
        issueDate: docSnap.data().issueDate,
        total: docSnap.data().total,
        status: docSnap.data().status,
        consultationId: docSnap.data().consultationId
      }));

      // Sort by issue date (most recent first)
      invoicesData.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const handleDocumentsUpdate = (documents: DocumentMetadata[]) => {
    setPatientDocuments(documents);
    // Update patient state as well
    if (patient) {
      setPatient(prev => prev ? { ...prev, documents } : null);
    }
  };

  const handleDocumentError = (error: string) => {
    setError(error);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPatientData();
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    // Invalidate cache and reload
    if (id) {
      patientCache.invalidate(id);
      loadPatientData();
    }
  };

  const handleDeleteSuccess = () => {
    navigate('/patients');
  };

  const handleNewConsultationSuccess = () => {
    setIsNewConsultationModalOpen(false);
    loadConsultations();
    loadInvoices();
  };

  const handleViewConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setIsViewConsultationModalOpen(true);
  };

  const handleEditConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setIsEditConsultationModalOpen(true);
  };

  const handleDeleteConsultation = (consultation: Consultation) => {
    setConsultationToDelete({
      id: consultation.id,
      patientName: `${patient?.firstName} ${patient?.lastName}`,
      date: format(consultation.date, 'dd/MM/yyyy', { locale: fr }),
      time: format(consultation.date, 'HH:mm')
    });
    setIsDeleteConsultationModalOpen(true);
  };

  const confirmConsultationDeletion = async () => {
    if (!consultationToDelete) return;

    setIsDeletingConsultation(true);
    try {
      await ConsultationService.deleteConsultation(consultationToDelete.id);
      
      setIsDeleteConsultationModalOpen(false);
      setConsultationToDelete(null);
      
      // Refresh consultations and invoices
      await loadConsultations();
      await loadInvoices();
      
    } catch (error) {
      console.error('Error deleting consultation:', error);
      setError('Erreur lors de la suppression de la consultation');
    } finally {
      setIsDeletingConsultation(false);
    }
  };

  const handleConsultationEditSuccess = () => {
    setIsEditConsultationModalOpen(false);
    setSelectedConsultationId(null);
    // Refresh consultations and invoices
    loadConsultations();
    loadInvoices();
  };

  const calculateAge = (dateOfBirth: string) => {
    try {
      return differenceInYears(new Date(), new Date(dateOfBirth));
    } catch (error) {
      return 'N/A';
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
        return 'bg-purple-100 text-purple-800';
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
      case 'paid':
        return 'Payée';
      case 'sent':
        return 'Envoyée';
      default:
        return status;
    }
  };

  if (loading && !refreshing) {
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
            Patients
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-500">
              {calculateAge(patient.dateOfBirth)} ans • Né(e) le {formatDate(patient.dateOfBirth)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />}
            disabled={refreshing}
          >
            Actualiser
          </Button>
          <Button 
            variant="outline" 
            leftIcon={<Edit size={16} />}
            onClick={() => setIsEditModalOpen(true)}
          >
            Modifier
          </Button>
          <Button 
            variant="outline" 
            leftIcon={<Trash2 size={16} />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Supprimer
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Vue d'ensemble
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'consultations'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('consultations')}
        >
          Consultations ({consultations.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'invoices'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('invoices')}
        >
          Factures ({invoices.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'medical'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('medical')}
        >
          Médical & Documents
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Patient Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Patient Identity Card */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User size={20} className="mr-2 text-primary-600" />
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nom complet</label>
                      <p className="text-gray-900">{patient.firstName} {patient.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Âge</label>
                      <p className="text-gray-900">{calculateAge(patient.dateOfBirth)} ans</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Sexe</label>
                      <p className="text-gray-900">
                        {patient.gender === 'male' ? 'Homme' : patient.gender === 'female' ? 'Femme' : 'Autre'}
                      </p>
                    </div>
                    {patient.profession && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Profession</label>
                        <p className="text-gray-900">{cleanDecryptedField(patient.profession, false, 'Non renseignée')}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Téléphone</label>
                      <div className="flex items-center">
                        <Phone size={16} className="mr-2 text-gray-400" />
                        <p className="text-gray-900">{patient.phone || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <div className="flex items-center">
                        <Mail size={16} className="mr-2 text-gray-400" />
                        <p className="text-gray-900">{patient.email || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Adresse</label>
                      <div className="flex items-start">
                        <MapPin size={16} className="mr-2 text-gray-400 mt-0.5" />
                        <p className="text-gray-900">
                          {patient.address?.street || 'Non renseignée'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Consultation */}
              {consultations.length > 0 && (
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Stethoscope size={20} className="mr-2 text-secondary-600" />
                    Dernière consultation
                  </h3>
                  <div className="bg-secondary-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-2 text-secondary-600" />
                        <span className="font-medium text-secondary-900">
                          {formatDateTime(consultations[0].date)}
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consultations[0].status)}`}>
                        {getStatusText(consultations[0].status)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-secondary-800">Motif: </span>
                        <span className="text-secondary-700">
                          {cleanDecryptedField(consultations[0].reason, false, 'Consultation ostéopathique')}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-secondary-800">Traitement: </span>
                        <span className="text-secondary-700">
                          {cleanDecryptedField(consultations[0].treatment, false, 'Traitement ostéopathique').substring(0, 100)}
                          {cleanDecryptedField(consultations[0].treatment, false, '').length > 100 ? '...' : ''}
                        </span>
                      </div>
                      {consultations[0].price > 0 && (
                        <div>
                          <span className="text-sm font-medium text-secondary-800">Tarif: </span>
                          <span className="text-secondary-700">{consultations[0].price} €</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Linked Invoice */}
                    {(() => {
                      const linkedInvoice = invoices.find(inv => inv.consultationId === consultations[0].id);
                      return linkedInvoice ? (
                        <div className="mt-3 pt-3 border-t border-secondary-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText size={14} className="mr-2 text-secondary-600" />
                              <span className="text-sm text-secondary-800">
                                Facture {linkedInvoice.number}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(linkedInvoice.status)}`}>
                                {getStatusText(linkedInvoice.status)}
                              </span>
                              <Link 
                                to={`/invoices/${linkedInvoice.id}`}
                                className="text-xs text-primary-600 hover:text-primary-700"
                              >
                                Voir →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {/* Medical Information */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Heart size={20} className="mr-2 text-red-500" />
                  Informations médicales
                </h3>
                <div className="space-y-4">
                  {patient.currentTreatment && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Traitement actuel</label>
                      <p className="text-gray-900 mt-1">
                        {cleanDecryptedField(patient.currentTreatment, false, 'Aucun traitement actuel')}
                      </p>
                    </div>
                  )}
                  
                  {patient.medicalAntecedents && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Antécédents médicaux</label>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                        {cleanDecryptedField(patient.medicalAntecedents, false, 'Aucun antécédent médical renseigné')}
                      </p>
                    </div>
                  )}
                  
                  {patient.medicalHistory && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Historique médical</label>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                        {cleanDecryptedField(patient.medicalHistory, false, 'Aucun historique médical renseigné')}
                      </p>
                    </div>
                  )}

                  {patient.consultationReason && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Motif de consultation initial</label>
                      <p className="text-gray-900 mt-1">
                        {cleanDecryptedField(patient.consultationReason, false, 'Motif non renseigné')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Insurance */}
              {patient.insurance && (
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Shield size={20} className="mr-2 text-blue-600" />
                    Assurance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mutuelle</label>
                      <p className="text-gray-900">{patient.insurance.provider || 'Non renseignée'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Numéro d'assuré</label>
                      <p className="text-gray-900">{patient.insurance.policyNumber || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions & Next Appointment */}
            <div className="space-y-6">
              {/* Next Appointment */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar size={20} className="mr-2 text-primary-600" />
                  Prochaine consultation
                </h3>
                {patient.nextAppointment ? (
                  <div className="bg-primary-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-primary-900">
                          {formatDateTime(new Date(patient.nextAppointment))}
                        </div>
                        <div className="text-sm text-primary-700 mt-1">
                          Consultation programmée
                        </div>
                      </div>
                      <CheckCircle size={20} className="text-primary-600" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 mb-4">Aucune consultation programmée</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsNewConsultationModalOpen(true)}
                      leftIcon={<CalendarPlus size={16} />}
                    >
                      Programmer une consultation
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Activity size={20} className="mr-2 text-accent-600" />
                  Actions rapides
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    fullWidth
                    leftIcon={<CalendarPlus size={16} />}
                    onClick={() => setIsNewConsultationModalOpen(true)}
                  >
                    Nouvelle consultation
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    leftIcon={<FileText size={16} />}
                    onClick={() => navigate(`/invoices?patient=${patient.id}`)}
                  >
                    Nouvelle facture
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    leftIcon={<Edit size={16} />}
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    Modifier le dossier
                  </Button>
                </div>
              </div>

              {/* Patient Notes */}
              {patient.notes && cleanDecryptedField(patient.notes, false, '') && (
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileText size={20} className="mr-2 text-gray-600" />
                    Notes
                  </h3>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {cleanDecryptedField(patient.notes, false, '')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'consultations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Consultations ({consultations.length})
              </h3>
              <Button
                variant="primary"
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
                  Ce patient n'a pas encore de consultation enregistrée.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsNewConsultationModalOpen(true)}
                  leftIcon={<Plus size={16} />}
                >
                  Créer la première consultation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => {
                  const linkedInvoice = invoices.find(inv => inv.consultationId === consultation.id);
                  
                  return (
                    <div key={consultation.id} className="bg-white rounded-xl shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {formatDateTime(consultation.date)}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            ({consultation.duration} min)
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consultation.status)}`}>
                            {getStatusText(consultation.status)}
                          </span>
                          {consultation.price > 0 && (
                            <span className="text-sm font-medium text-gray-900">
                              {consultation.price} €
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Motif</label>
                          <p className="text-gray-900">
                            {cleanDecryptedField(consultation.reason, false, 'Consultation ostéopathique')}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Traitement</label>
                          <p className="text-gray-900 whitespace-pre-wrap">
                            {cleanDecryptedField(consultation.treatment, false, 'Traitement ostéopathique standard')}
                          </p>
                        </div>
                        {consultation.notes && cleanDecryptedField(consultation.notes, false, '') && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Notes</label>
                            <p className="text-gray-900 whitespace-pre-wrap">
                              {cleanDecryptedField(consultation.notes, false, '')}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewConsultation(consultation.id)}
                            leftIcon={<Eye size={14} />}
                          >
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditConsultation(consultation.id)}
                            leftIcon={<Edit size={14} />}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteConsultation(consultation)}
                            leftIcon={<Trash2 size={14} />}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>

                      {/* Linked Invoice */}
                      {linkedInvoice && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText size={14} className="mr-2 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                Facture {linkedInvoice.number}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(linkedInvoice.status)}`}>
                                {getStatusText(linkedInvoice.status)}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {linkedInvoice.total} €
                              </span>
                              <Link 
                                to={`/invoices/${linkedInvoice.id}`}
                                className="text-xs text-primary-600 hover:text-primary-700"
                              >
                                Voir →
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Factures ({invoices.length})
              </h3>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => navigate(`/invoices?action=new&patient=${patient.id}`)}
              >
                Nouvelle facture
              </Button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h4>
                <p className="text-gray-500 mb-4">
                  Aucune facture n'a été créée pour ce patient.
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/invoices?action=new&patient=${patient.id}`)}
                  leftIcon={<Plus size={16} />}
                >
                  Créer une facture
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => {
                  const linkedConsultation = consultations.find(cons => cons.id === invoice.consultationId);
                  
                  return (
                    <div key={invoice.id} className="bg-white rounded-xl shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <FileText size={16} className="mr-2 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            Facture {invoice.number}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {invoice.total} €
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Émise le {formatDate(invoice.issueDate)}
                        </div>
                        <div className="flex items-center space-x-2">
                          {linkedConsultation && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Stethoscope size={14} className="mr-1" />
                              <span>
                                Consultation du {formatDateTime(linkedConsultation.date)}
                              </span>
                            </div>
                          )}
                          <Link 
                            to={`/invoices/${invoice.id}`}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Voir la facture →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Dossier médical complet</h3>
            
            {/* Document Upload Manager */}
            <div className="bg-white rounded-xl shadow p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText size={20} className="mr-2 text-primary-600" />
                Documents médicaux
              </h4>
              <DocumentUploadManager
                patientId={patient.id}
                initialDocuments={patientDocuments}
                onUploadSuccess={handleDocumentsUpdate}
                onUploadError={handleDocumentError}
                disabled={false}
              />
            </div>

            {/* Complete Medical History */}
            <div className="bg-white rounded-xl shadow p-6">
              <h4 className="font-medium text-gray-900 mb-4">Historique médical complet</h4>
              <div className="space-y-4">
                {patient.medicalHistory && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Historique général</label>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                      {cleanDecryptedField(patient.medicalHistory, false, 'Aucun historique médical renseigné')}
                    </p>
                  </div>
                )}
                
                {patient.medicalAntecedents && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Antécédents médicaux</label>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                      {cleanDecryptedField(patient.medicalAntecedents, false, 'Aucun antécédent médical renseigné')}
                    </p>
                  </div>
                )}
                
                {patient.currentTreatment && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Traitement actuel</label>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                      {cleanDecryptedField(patient.currentTreatment, false, 'Aucun traitement actuel')}
                    </p>
                  </div>
                )}

                {patient.osteopathicTreatment && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Traitement ostéopathique</label>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                      {cleanDecryptedField(patient.osteopathicTreatment, false, 'Aucun traitement ostéopathique renseigné')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Treatment History */}
            {patient.treatmentHistory && patient.treatmentHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="font-medium text-gray-900 mb-4">Historique des traitements</h4>
                <div className="space-y-4">
                  {patient.treatmentHistory.map((treatment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {formatDate(treatment.date)}
                        </span>
                        {treatment.provider && (
                          <span className="text-sm text-gray-500">
                            {treatment.provider}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700">{treatment.treatment}</p>
                      {treatment.notes && (
                        <p className="text-sm text-gray-500 mt-2">{treatment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      <NewConsultationModal
        isOpen={isNewConsultationModalOpen}
        onClose={() => setIsNewConsultationModalOpen(false)}
        onSuccess={handleNewConsultationSuccess}
        preselectedPatientId={patient.id}
        preselectedPatientName={`${patient.firstName} ${patient.lastName}`}
      />

      {/* Consultation Modals */}
      {selectedConsultationId && (
        <>
          <ViewConsultationModal
            isOpen={isViewConsultationModalOpen}
            onClose={() => {
              setIsViewConsultationModalOpen(false);
              setSelectedConsultationId(null);
            }}
            consultationId={selectedConsultationId}
          />

          <EditConsultationModal
            isOpen={isEditConsultationModalOpen}
            onClose={() => {
              setIsEditConsultationModalOpen(false);
              setSelectedConsultationId(null);
            }}
            onSuccess={handleConsultationEditSuccess}
            consultationId={selectedConsultationId}
            preselectedPatientId={patient.id}
            preselectedPatientName={`${patient.firstName} ${patient.lastName}`}
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
    </div>
  );
};

export default PatientDetail;