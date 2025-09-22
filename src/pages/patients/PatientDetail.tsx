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
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Stethoscope,
  CreditCard,
  Download,
  Share2,
  MoreVertical,
  History,
  X
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { Button } from '../../components/ui/Button';
import EditPatientModal from '../../components/modals/EditPatientModal';
import DeletePatientModal from '../../components/modals/DeletePatientModal';
import NewConsultationModal from '../../components/modals/NewConsultationModal';
import ViewConsultationModal from '../../components/modals/ViewConsultationModal';
import NewInvoiceModal from '../../components/modals/NewInvoiceModal';
import AddDocumentModal from '../../components/modals/AddDocumentModal';
import { Patient } from '../../types';
import { HDSCompliance } from '../../utils/hdsCompliance';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!id || !auth.currentUser) {
        setError('ID patient manquant ou utilisateur non authentifié');
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 Loading patient data for ID:', id);
        
        // Charger directement depuis Firestore
        const patientRef = doc(db, 'patients', id);
        const patientDoc = await getDoc(patientRef);
        
        if (!patientDoc.exists()) {
          setError('Patient non trouvé');
          setLoading(false);
          return;
        }
        
        const rawData = patientDoc.data();
        console.log('📋 Raw patient data:', rawData);
        
        // Vérifier la propriété
        if (rawData.osteopathId !== auth.currentUser.uid) {
          setError('Accès non autorisé à ce patient');
          setLoading(false);
          return;
        }
        
        // Déchiffrer les données pour l'affichage
        const decryptedData = HDSCompliance.decryptDataForDisplay(
          rawData,
          'patients',
          auth.currentUser.uid
        );
        
        console.log('🔓 Decrypted patient data:', decryptedData);
        
        const patient = {
          id: patientDoc.id,
          ...decryptedData
        };
        
        setPatient(patient);
        
        console.log('✅ Final patient data:', patient);
        
        // Charger les consultations
        await loadConsultations(id);
        
        // Charger les factures
        await loadInvoices(id);
        
      } catch (error) {
        console.error('Error fetching patient data:', error);
        setError('Erreur lors de la récupération des données du patient');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id]);

  const loadConsultations = async (patientId: string) => {
    try {
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('patientId', '==', patientId),
        where('osteopathId', '==', auth.currentUser!.uid),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const consultationsData: Consultation[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Déchiffrer les données pour l'affichage
        const decryptedData = HDSCompliance.decryptDataForDisplay(
          data,
          'consultations',
          auth.currentUser!.uid
        );
        
        consultationsData.push({
          id: docSnap.id,
          ...decryptedData,
          date: data.date?.toDate?.() || new Date(data.date)
        });
      }
      
      setConsultations(consultationsData);
    } catch (error) {
      console.error('Error loading consultations:', error);
    }
  };

  const loadInvoices = async (patientId: string) => {
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('patientId', '==', patientId),
        where('osteopathId', '==', auth.currentUser!.uid),
        orderBy('issueDate', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const invoicesData: Invoice[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    // Recharger les données du patient
    window.location.reload();
  };

  const handleDeleteSuccess = () => {
    navigate('/patients');
  };

  const handleConsultationSuccess = () => {
    setIsNewConsultationModalOpen(false);
    // Recharger les consultations
    if (id) {
      loadConsultations(id);
    }
  };

  const handleInvoiceSuccess = () => {
    setIsNewInvoiceModalOpen(false);
    // Recharger les factures
    if (id) {
      loadInvoices(id);
    }
  };

  const handleDocumentSuccess = () => {
    setIsAddDocumentModalOpen(false);
    // Recharger les données du patient
    window.location.reload();
  };

  const handleViewConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setIsViewConsultationModalOpen(true);
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
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'draft':
        return 'Brouillon';
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

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      console.error('Error formatting date:', date);
      return 'Date invalide';
    }
  };

  const formatDateTime = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd/MM/yyyy à HH:mm', { locale: fr });
    } catch (error) {
      console.error('Error formatting datetime:', date);
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
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-lg">
              {patient.firstName?.[0]}{patient.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {cleanDecryptedField(patient.firstName, false, 'Prénom')} {cleanDecryptedField(patient.lastName, false, 'Nom')}
              </h1>
              <p className="text-gray-500">
                {patient.dateOfBirth ? `Né(e) le ${formatDate(patient.dateOfBirth)}` : 'Date de naissance non renseignée'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Desktop actions */}
        <div className="hidden sm:flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsNewConsultationModalOpen(true)}
          >
            Consultation
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={<CreditCard size={16} />}
            onClick={() => setIsNewInvoiceModalOpen(true)}
          >
            Facture
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
                    setIsNewConsultationModalOpen(true);
                    setShowMobileActions(false);
                  }}
                >
                  <Plus size={14} className="mr-2" />
                  Nouvelle consultation
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setIsNewInvoiceModalOpen(true);
                    setShowMobileActions(false);
                  }}
                >
                  <CreditCard size={14} className="mr-2" />
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Vue d'ensemble
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'consultations'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('consultations')}
        >
          Consultations ({consultations.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('invoices')}
        >
          Factures ({invoices.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <Stethoscope size={24} className="mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-blue-600">{consultations.length}</div>
                <div className="text-sm text-gray-600">Consultations</div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <FileText size={24} className="mx-auto text-green-600 mb-2" />
                <div className="text-2xl font-bold text-green-600">{invoices.length}</div>
                <div className="text-sm text-gray-600">Factures</div>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <CreditCard size={24} className="mx-auto text-orange-600 mb-2" />
                <div className="text-2xl font-bold text-orange-600">
                  {invoices.filter(i => i.status === 'paid').length}
                </div>
                <div className="text-sm text-gray-600">Factures payées</div>
              </div>
              
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <Clock size={24} className="mx-auto text-purple-600 mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {consultations.filter(c => c.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Consultations terminées</div>
              </div>
            </div>

            {/* Dernières consultations */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Dernières consultations</h3>
                <Link 
                  to="#" 
                  className="text-sm text-primary-600 hover:text-primary-700"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('consultations');
                  }}
                >
                  Voir tout →
                </Link>
              </div>
              
              {consultations.length > 0 ? (
                <div className="space-y-3">
                  {consultations.slice(0, 3).map((consultation) => (
                    <div 
                      key={consultation.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      onClick={() => handleViewConsultation(consultation.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {cleanDecryptedField(consultation.reason, false, 'Consultation')}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consultation.status)}`}>
                            {getStatusText(consultation.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(consultation.date)} • {consultation.duration} min • {consultation.price} €
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Stethoscope size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Aucune consultation enregistrée</p>
                </div>
              )}
            </div>

            {/* Factures récentes */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Factures récentes</h3>
                <Link 
                  to="#" 
                  className="text-sm text-primary-600 hover:text-primary-700"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('invoices');
                  }}
                >
                  Voir tout →
                </Link>
              </div>
              
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.slice(0, 3).map((invoice) => (
                    <Link 
                      key={invoice.id} 
                      to={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {invoice.number}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(invoice.issueDate)} • {invoice.total} €
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Aucune facture enregistrée</p>
                </div>
              )}
            </div>

            {/* Alertes et informations importantes */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Alertes et informations importantes</h3>
              
              {patient.medicalHistory && cleanDecryptedField(patient.medicalHistory, false, '') ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                  <div className="flex items-start">
                    <AlertCircle size={16} className="text-yellow-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Historique médical</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        {cleanDecryptedField(patient.medicalHistory, false, 'Aucun historique médical renseigné')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Aucune alerte ou information importante</p>
                </div>
              )}
            </div>

            {/* Historique médical */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Historique médical</h3>
              
              {patient.medicalHistory && cleanDecryptedField(patient.medicalHistory, false, '') ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {cleanDecryptedField(patient.medicalHistory, false, 'Aucun historique médical renseigné')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Aucun historique médical renseigné</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact info */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact</h3>
              
              <div className="space-y-3">
                {patient.phone && (
                  <div className="flex items-center">
                    <Phone size={16} className="text-gray-400 mr-3" />
                    <a 
                      href={`tel:${patient.phone}`} 
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {patient.phone}
                    </a>
                  </div>
                )}
                
                {patient.email && (
                  <div className="flex items-center">
                    <Mail size={16} className="text-gray-400 mr-3" />
                    <a 
                      href={`mailto:${patient.email}`} 
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {patient.email}
                    </a>
                  </div>
                )}
                
                {patient.address && (
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-400 mr-3 mt-0.5" />
                    <span className="text-gray-700">
                      {typeof patient.address === 'string' 
                        ? cleanDecryptedField(patient.address, false, 'Adresse non disponible')
                        : patient.address?.street || 'Adresse non disponible'
                      }
                    </span>
                  </div>
                )}
                
                {!patient.phone && !patient.email && !patient.address && (
                  <div className="text-center py-4 text-gray-500">
                    <span>Adresse non disponible</span>
                  </div>
                )}
              </div>
            </div>

            {/* Prochaine consultation */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Prochaine consultation</h3>
              
              {patient.nextAppointment ? (
                <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center">
                    <Calendar size={16} className="text-primary-600 mr-2" />
                    <span className="text-primary-800 font-medium">
                      {formatDateTime(patient.nextAppointment)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <span>Aucune consultation prévue</span>
                </div>
              )}
            </div>

            {/* Informations du dossier */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations du dossier</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Dossier créé le</span>
                  <span className="text-gray-900">
                    {patient.createdAt ? formatDate(patient.createdAt) : 'Date inconnue'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Dernière modification</span>
                  <span className="text-gray-900">
                    {patient.updatedAt ? formatDate(patient.updatedAt) : 'Date inconnue'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">ID du dossier</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {patient.id ? `${patient.id.substring(0, 8)}...` : 'ID non disponible'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Statut du dossier</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle size={12} className="mr-1" />
                    Actif
                  </span>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<Plus size={16} />}
                  onClick={() => setIsNewConsultationModalOpen(true)}
                >
                  Nouvelle consultation
                </Button>
                
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<CreditCard size={16} />}
                  onClick={() => setIsNewInvoiceModalOpen(true)}
                >
                  Nouvelle facture
                </Button>
                
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<FileText size={16} />}
                  onClick={() => setIsAddDocumentModalOpen(true)}
                >
                  Ajouter un document
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
          </div>
        </div>
      )}

      {/* Consultations tab */}
      {activeTab === 'consultations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Consultations</h2>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => setIsNewConsultationModalOpen(true)}
            >
              Nouvelle consultation
            </Button>
          </div>
          
          {consultations.length > 0 ? (
            <div className="space-y-4">
              {consultations.map((consultation) => (
                <div 
                  key={consultation.id} 
                  className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewConsultation(consultation.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium text-gray-900">
                      {cleanDecryptedField(consultation.reason, false, 'Consultation')}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consultation.status)}`}>
                      {getStatusText(consultation.status)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>{formatDateTime(consultation.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        <span>{consultation.duration} min</span>
                      </div>
                      <div className="flex items-center">
                        <CreditCard size={14} className="mr-1" />
                        <span>{consultation.price} €</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {cleanDecryptedField(consultation.treatment, false, 'Traitement non renseigné')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Stethoscope size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune consultation</h3>
              <p className="text-gray-500 mb-4">
                Commencez par créer la première consultation pour ce patient.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsNewConsultationModalOpen(true)}
                leftIcon={<Plus size={16} />}
              >
                Nouvelle consultation
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Invoices tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Factures</h2>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => setIsNewInvoiceModalOpen(true)}
            >
              Nouvelle facture
            </Button>
          </div>
          
          {invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Link 
                  key={invoice.id} 
                  to={`/invoices/${invoice.id}`}
                  className="block bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium text-gray-900">
                      {invoice.number}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                      {getStatusText(invoice.status)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Date d'émission: {formatDate(invoice.issueDate)}</span>
                      <span className="font-medium text-gray-900">{invoice.total} €</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune facture</h3>
              <p className="text-gray-500 mb-4">
                Commencez par créer la première facture pour ce patient.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsNewInvoiceModalOpen(true)}
                leftIcon={<Plus size={16} />}
              >
                Nouvelle facture
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => setIsAddDocumentModalOpen(true)}
            >
              Ajouter un document
            </Button>
          </div>
          
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun document</h3>
            <p className="text-gray-500 mb-4">
              Les documents du patient apparaîtront ici.
            </p>
            <Button
              variant="primary"
              onClick={() => setIsAddDocumentModalOpen(true)}
              leftIcon={<Plus size={16} />}
            >
              Ajouter le premier document
            </Button>
          </div>
        </div>
      )}

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
        isLoading={isDeleting}
        patientName={`${cleanDecryptedField(patient.firstName, false, 'Prénom')} ${cleanDecryptedField(patient.lastName, false, 'Nom')}`}
        patientId={patient.id}
      />

      <NewConsultationModal
        isOpen={isNewConsultationModalOpen}
        onClose={() => setIsNewConsultationModalOpen(false)}
        onSuccess={handleConsultationSuccess}
        preselectedPatientId={patient.id}
        preselectedPatientName={`${cleanDecryptedField(patient.firstName, false, 'Prénom')} ${cleanDecryptedField(patient.lastName, false, 'Nom')}`}
      />

      {selectedConsultationId && (
        <ViewConsultationModal
          isOpen={isViewConsultationModalOpen}
          onClose={() => {
            setIsViewConsultationModalOpen(false);
            setSelectedConsultationId(null);
          }}
          consultationId={selectedConsultationId}
        />
      )}

      <NewInvoiceModal
        isOpen={isNewInvoiceModalOpen}
        onClose={() => setIsNewInvoiceModalOpen(false)}
        onSuccess={handleInvoiceSuccess}
        preselectedPatientId={patient.id}
      />

      <AddDocumentModal
        isOpen={isAddDocumentModalOpen}
        onClose={() => setIsAddDocumentModalOpen(false)}
        onSuccess={handleDocumentSuccess}
        patientId={patient.id}
      />
    </div>
  );
};

export default PatientDetail;