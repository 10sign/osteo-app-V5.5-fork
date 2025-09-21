import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  AlertTriangle,
  Clock,
  Euro,
  Stethoscope,
  History,
  Plus,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Activity,
  Heart,
  Pill,
  FileImage,
  CalendarPlus,
  CreditCard,
  Shield
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { Button } from '../../components/ui/Button';
import EditPatientModal from '../../components/modals/EditPatientModal';
import DeletePatientModal from '../../components/modals/DeletePatientModal';
import AddDocumentModal from '../../components/modals/AddDocumentModal';
import ViewConsultationModal from '../../components/modals/ViewConsultationModal';
import { Patient } from '../../types';
import { HDSCompliance } from '../../utils/hdsCompliance';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { format, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConsultationWithLinkedData {
  id: string;
  date: Date;
  reason: string;
  treatment: string;
  notes: string;
  duration: number;
  price: number;
  status: string;
  linkedInvoice?: Invoice;
  linkedDocuments?: Document[];
  isInAgenda: boolean;
}

interface Invoice {
  id: string;
  number: string;
  total: number;
  status: string;
  issueDate: string;
  consultationId?: string;
}

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
  consultationId?: string;
  category?: string;
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultationsWithLinkedData, setConsultationsWithLinkedData] = useState<ConsultationWithLinkedData[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [isViewConsultationModalOpen, setIsViewConsultationModalOpen] = useState(false);

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

      // Load patient data
      const patientRef = doc(db, 'patients', id);
      const patientDoc = await getDoc(patientRef);

      if (!patientDoc.exists()) {
        setError('Patient non trouvé');
        return;
      }

      const patientData = patientDoc.data();
      
      // Verify ownership
      if (patientData.osteopathId !== auth.currentUser.uid) {
        setError('Accès non autorisé à ce patient');
        return;
      }

      // Decrypt patient data
      const decryptedPatientData = HDSCompliance.decryptDataForDisplay(
        patientData,
        'patients',
        auth.currentUser.uid
      );

      setPatient({
        ...decryptedPatientData,
        id: patientDoc.id
      } as Patient);

      // Load all related data
      await loadAllRelatedData();

    } catch (error) {
      console.error('Error loading patient data:', error);
      setError('Erreur lors du chargement du dossier patient');
    } finally {
      setLoading(false);
    }
  };

  const loadAllRelatedData = async () => {
    if (!id || !auth.currentUser) return;

    try {
      // Load consultations
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('patientId', '==', id),
        where('osteopathId', '==', auth.currentUser.uid),
        orderBy('date', 'desc')
      );

      const consultationsSnapshot = await getDocs(consultationsQuery);
      
      // Load invoices
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('patientId', '==', id),
        where('osteopathId', '==', auth.currentUser.uid)
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoicesData = invoicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];

      // Load appointments (for agenda integration check)
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsQuery = query(
        appointmentsRef,
        where('patientId', '==', id),
        where('osteopathId', '==', auth.currentUser.uid)
      );

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        consultationId: doc.data().consultationId,
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));

      // Process consultations and link them with invoices and documents
      const consultationsWithLinked: ConsultationWithLinkedData[] = [];

      for (const consultationDoc of consultationsSnapshot.docs) {
        const consultationData = consultationDoc.data();
        
        // Decrypt consultation data
        const decryptedData = HDSCompliance.decryptDataForDisplay(
          consultationData,
          'consultations',
          auth.currentUser.uid
        );

        // Find linked invoice
        const linkedInvoice = invoicesData.find(invoice => 
          invoice.consultationId === consultationDoc.id
        );

        // Check if consultation is in agenda
        const isInAgenda = appointmentsData.some(appointment => 
          appointment.consultationId === consultationDoc.id
        );

        consultationsWithLinked.push({
          id: consultationDoc.id,
          date: consultationData.date?.toDate?.() || new Date(consultationData.date),
          reason: cleanDecryptedField(decryptedData.reason, false, 'Consultation ostéopathique'),
          treatment: cleanDecryptedField(decryptedData.treatment, false, 'Traitement ostéopathique'),
          notes: cleanDecryptedField(decryptedData.notes, false, ''),
          duration: decryptedData.duration || 60,
          price: decryptedData.price || 60,
          status: decryptedData.status || 'completed',
          linkedInvoice,
          linkedDocuments: [], // Will be populated when document system is enhanced
          isInAgenda
        });
      }

      setConsultationsWithLinkedData(consultationsWithLinked);
      setInvoices(invoicesData);

    } catch (error) {
      console.error('Error loading related data:', error);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    try {
      return differenceInYears(new Date(), new Date(dateOfBirth));
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd/MM/yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateTime = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd/MM/yyyy à HH:mm', { locale: fr });
    } catch {
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
      case 'unpaid':
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
      case 'paid':
        return 'Payée';
      case 'unpaid':
        return 'Impayée';
      default:
        return status;
    }
  };

  const handleViewConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setIsViewConsultationModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    loadPatientData();
  };

  const handleDeleteSuccess = () => {
    navigate('/patients');
  };

  const handleAddDocumentSuccess = () => {
    setIsAddDocumentModalOpen(false);
    loadPatientData();
  };

  // Get most recent consultation
  const lastConsultation = consultationsWithLinkedData[0];
  
  // Get next scheduled consultation
  const nextConsultation = patient?.nextAppointment ? {
    date: patient.nextAppointment,
    isUpcoming: new Date(patient.nextAppointment) > new Date()
  } : null;

  // Get important alerts
  const alerts = [];
  if (patient?.medicalHistory && patient.medicalHistory.toLowerCase().includes('allergie')) {
    alerts.push({ type: 'allergy', message: 'Allergies signalées' });
  }
  if (patient?.currentTreatment) {
    alerts.push({ type: 'treatment', message: 'Traitement en cours' });
  }

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
            <AlertTriangle className="text-error mr-3" size={24} />
            <div>
              <h3 className="font-medium text-error">Erreur</h3>
              <p className="text-error/80">{error || 'Une erreur est survenue'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/patients')}
            leftIcon={<ArrowLeft size={16} />}
            className="mr-4"
          >
            Patients
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-500">
              {calculateAge(patient.dateOfBirth)} ans • {patient.profession || 'Profession non renseignée'}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertTriangle size={16} className="text-red-600 mr-2" />
              <span className="text-red-800 text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: <User size={16} /> },
            { id: 'consultations', label: 'Consultations', icon: <Stethoscope size={16} />, count: consultationsWithLinkedData.length },
            { id: 'invoices', label: 'Factures', icon: <FileText size={16} />, count: invoices.length },
            { id: 'medical', label: 'Médical & Documents', icon: <Heart size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Identity */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User size={20} className="mr-2 text-primary-600" />
                Identité
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Né(e) le {formatDate(patient.dateOfBirth)}</span>
                </div>
                {patient.phone && (
                  <div className="flex items-center">
                    <Phone size={16} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center">
                    <Mail size={16} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{patient.email}</span>
                  </div>
                )}
                {patient.address?.street && (
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-400 mr-2 mt-0.5" />
                    <span className="text-sm text-gray-600">{patient.address.street}</span>
                  </div>
                )}
                {patient.insurance?.provider && (
                  <div className="flex items-center">
                    <Shield size={16} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{patient.insurance.provider}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Last Consultation */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Stethoscope size={20} className="mr-2 text-secondary-600" />
                Dernière consultation
              </h3>
              {lastConsultation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Date</span>
                    <span className="text-sm font-medium">{formatDateTime(lastConsultation.date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Motif</span>
                    <span className="text-sm font-medium">{lastConsultation.reason}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Durée</span>
                    <span className="text-sm font-medium">{lastConsultation.duration} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Statut</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lastConsultation.status)}`}>
                      {getStatusText(lastConsultation.status)}
                    </span>
                  </div>
                  {lastConsultation.linkedInvoice && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Facture</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{lastConsultation.linkedInvoice.total} €</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lastConsultation.linkedInvoice.status)}`}>
                            {getStatusText(lastConsultation.linkedInvoice.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewConsultation(lastConsultation.id)}
                      leftIcon={<Eye size={14} />}
                      fullWidth
                    >
                      Voir les détails
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucune consultation enregistrée</p>
              )}
            </div>

            {/* Next Consultation */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CalendarPlus size={20} className="mr-2 text-accent-600" />
                Prochain rendez-vous
              </h3>
              {nextConsultation && nextConsultation.isUpcoming ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Date</span>
                    <span className="text-sm font-medium">{formatDateTime(nextConsultation.date)}</span>
                  </div>
                  <div className="pt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/consultations')}
                      leftIcon={<Calendar size={14} />}
                      fullWidth
                    >
                      Voir dans l'agenda
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500 text-sm mb-3">Aucun rendez-vous programmé</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/consultations?action=new')}
                    leftIcon={<Plus size={14} />}
                    fullWidth
                  >
                    Programmer un rendez-vous
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'consultations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Historique des consultations ({consultationsWithLinkedData.length})
              </h3>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => navigate('/consultations?action=new')}
              >
                Nouvelle consultation
              </Button>
            </div>

            {consultationsWithLinkedData.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <Stethoscope size={48} className="mx-auto text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune consultation</h4>
                <p className="text-gray-500 mb-4">
                  Aucune consultation n'a été enregistrée pour ce patient.
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/consultations?action=new')}
                  leftIcon={<Plus size={16} />}
                >
                  Créer la première consultation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {consultationsWithLinkedData.map((consultation) => (
                  <div key={consultation.id} className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {formatDateTime(consultation.date)}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consultation.status)}`}>
                            {getStatusText(consultation.status)}
                          </span>
                          {!consultation.isInAgenda && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Pas dans l'agenda
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">
                          <strong>Motif :</strong> {consultation.reason}
                        </p>
                        <p className="text-gray-600 text-sm">
                          <strong>Traitement :</strong> {consultation.treatment}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewConsultation(consultation.id)}
                          leftIcon={<Eye size={14} />}
                        >
                          Voir
                        </Button>
                      </div>
                    </div>

                    {/* Linked Invoice */}
                    {consultation.linkedInvoice && (
                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CreditCard size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Facture {consultation.linkedInvoice.number}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{consultation.linkedInvoice.total} €</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consultation.linkedInvoice.status)}`}>
                              {getStatusText(consultation.linkedInvoice.status)}
                            </span>
                            <Link 
                              to={`/invoices/${consultation.linkedInvoice.id}`}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              <Eye size={14} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Consultation Details */}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <Clock size={14} className="text-gray-400 mr-2" />
                        <span className="text-gray-600">{consultation.duration} minutes</span>
                      </div>
                      <div className="flex items-center">
                        <Euro size={14} className="text-gray-400 mr-2" />
                        <span className="text-gray-600">{consultation.price} €</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Factures ({invoices.length})
              </h3>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => navigate('/invoices?action=new')}
              >
                Nouvelle facture
              </Button>
            </div>

            {invoices.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h4>
                <p className="text-gray-500 mb-4">
                  Aucune facture n'a été créée pour ce patient.
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/invoices?action=new')}
                  leftIcon={<Plus size={16} />}
                >
                  Créer une facture
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => {
                  const linkedConsultation = consultationsWithLinkedData.find(c => 
                    c.linkedInvoice?.id === invoice.id
                  );
                  
                  return (
                    <div key={invoice.id} className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-medium text-gray-900">
                              Facture {invoice.number}
                            </h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                              {getStatusText(invoice.status)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Émise le {formatDate(invoice.issueDate)}</span>
                            <span className="font-medium">{invoice.total} €</span>
                          </div>
                          
                          {/* Linked Consultation */}
                          {linkedConsultation && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Stethoscope size={14} className="text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    Consultation du {formatDate(linkedConsultation.date)}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewConsultation(linkedConsultation.id)}
                                  leftIcon={<Eye size={12} />}
                                >
                                  Voir
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{linkedConsultation.reason}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Link 
                            to={`/invoices/${invoice.id}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            <Button variant="outline" size="sm" leftIcon={<Eye size={14} />}>
                              Voir
                            </Button>
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
            {/* Medical History */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Heart size={20} className="mr-2 text-red-500" />
                Historique médical
              </h3>
              <div className="space-y-4">
                {patient.medicalAntecedents && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Antécédents médicaux</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {cleanDecryptedField(patient.medicalAntecedents, false, 'Aucun antécédent signalé')}
                    </p>
                  </div>
                )}
                
                {patient.medicalHistory && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Historique général</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {cleanDecryptedField(patient.medicalHistory, false, 'Aucun historique médical')}
                    </p>
                  </div>
                )}

                {patient.currentTreatment && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                      <Pill size={16} className="mr-2 text-blue-500" />
                      Traitement en cours
                    </h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {cleanDecryptedField(patient.currentTreatment, false, 'Aucun traitement en cours')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents by Consultation */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileImage size={20} className="mr-2 text-purple-500" />
                  Documents médicaux
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddDocumentModalOpen(true)}
                  leftIcon={<Plus size={14} />}
                >
                  Ajouter un document
                </Button>
              </div>

              {consultationsWithLinkedData.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun document disponible</p>
              ) : (
                <div className="space-y-4">
                  {consultationsWithLinkedData.map((consultation) => (
                    <div key={consultation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Consultation du {formatDate(consultation.date)}
                        </h4>
                        <span className="text-sm text-gray-500">{consultation.reason}</span>
                      </div>
                      
                      {consultation.linkedDocuments && consultation.linkedDocuments.length > 0 ? (
                        <div className="space-y-2">
                          {consultation.linkedDocuments.map((document) => (
                            <div key={document.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <FileText size={14} className="text-gray-400" />
                                <span className="text-sm text-gray-700">{document.name}</span>
                              </div>
                              <div className="flex space-x-2">
                                <a
                                  href={document.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:text-primary-700"
                                >
                                  <Eye size={14} />
                                </a>
                                <a
                                  href={document.url}
                                  download
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic">Aucun document pour cette consultation</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Treatment History */}
            {patient.treatmentHistory && patient.treatmentHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <History size={20} className="mr-2 text-gray-500" />
                  Historique des traitements
                </h3>
                <div className="space-y-3">
                  {patient.treatmentHistory.map((treatment, index) => (
                    <div key={index} className="border-l-4 border-primary-200 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{formatDate(treatment.date)}</span>
                        {treatment.provider && (
                          <span className="text-sm text-gray-500">{treatment.provider}</span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm">{treatment.treatment}</p>
                      {treatment.notes && (
                        <p className="text-gray-500 text-xs mt-1">{treatment.notes}</p>
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
      {patient && (
        <>
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

          <AddDocumentModal
            isOpen={isAddDocumentModalOpen}
            onClose={() => setIsAddDocumentModalOpen(false)}
            onSuccess={handleAddDocumentSuccess}
            patientId={patient.id}
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
        </>
      )}
    </div>
  );
};

export default PatientDetail;