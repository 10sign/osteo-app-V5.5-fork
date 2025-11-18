import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Stethoscope,
  CreditCard,
  Info,
  RefreshCw,
  Image as ImageIcon,
  X,
  ZoomIn,
  ZoomOut,
  RefreshCcw
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { setupSafeSnapshot } from '../../utils/firestoreListener';
import { db, auth } from '../../firebase/config';
import { Button } from '../../components/ui/Button';
import EditPatientModal from '../../components/modals/EditPatientModal';
import DeletePatientModal from '../../components/modals/DeletePatientModal';
import AddDocumentModal from '../../components/modals/AddDocumentModal';
import NewInvoiceModal from '../../components/modals/NewInvoiceModal';
import EditInvoiceModal from '../../components/modals/EditInvoiceModal';
import DeleteInvoiceModal from '../../components/modals/DeleteInvoiceModal';
import NewConsultationModal from '../../components/modals/NewConsultationModal';
import EditConsultationModal from '../../components/modals/EditConsultationModal';
import ViewConsultationModal from '../../components/modals/ViewConsultationModal';
import DeleteConsultationModal from '../../components/modals/DeleteConsultationModal';
import { Patient, Consultation, Invoice } from '../../types';
import { isImageFile } from '../../utils/documentStorage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HDSCompliance } from '../../utils/hdsCompliance';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { PatientService } from '../../services/patientService';
import { ConsultationService } from '../../services/consultationService';
import { InvoiceService } from '../../services/invoiceService';
import { InitialConsultationSyncService } from '../../services/initialConsultationSyncService';
import { patientCache } from '../../utils/patientCache';
// Analytics supprimés: retirer les imports et utiliser des stubs locaux
const trackEvent = (..._args: any[]) => {};
const trackMatomoEvent = (..._args: any[]) => {};
const trackGAEvent = (..._args: any[]) => {};
import FieldHistory from '../../components/patient/FieldHistory';
import { buildFieldHistory, getLatestValue } from '../../utils/fieldHistoryBuilder';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [isDeleteInvoiceModalOpen, setIsDeleteInvoiceModalOpen] = useState(false);
  const [isNewConsultationModalOpen, setIsNewConsultationModalOpen] = useState(false);
  const [isEditConsultationModalOpen, setIsEditConsultationModalOpen] = useState(false);
  const [isViewConsultationModalOpen, setIsViewConsultationModalOpen] = useState(false);
  const [isDeleteConsultationModalOpen, setIsDeleteConsultationModalOpen] = useState(false);
  const [isViewInvoiceModalOpen, setIsViewInvoiceModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<{ id: string; number: string } | null>(null);
  const [consultationToDelete, setConsultationToDelete] = useState<{
    id: string;
    patientName: string;
    date: string;
    time: string;
  } | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [isDeletingConsultation, setIsDeletingConsultation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const viewingInvoice = selectedInvoiceId ? invoices.find(i => i.id === selectedInvoiceId) : null;

  const downloadInvoicePdf = (inv: Invoice) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const patientName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim();
    const issued = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('fr-FR') : '';
    const due = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '';
    const itemsRows = (inv.items || [])
      .map(
        (it) => `
        <tr>
          <td>${it.description}</td>
          <td style="text-align:center;">${it.quantity}</td>
          <td style="text-align:right;">${it.unitPrice} €</td>
          <td style="text-align:right;">${it.amount} €</td>
        </tr>`
      )
      .join('');
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Facture ${inv.number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          .meta { margin-bottom: 16px; font-size: 14px; color: #374151; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border-bottom: 1px solid #f3f4f6; padding: 8px; font-size: 13px; }
          th { background: #f9fafb; text-align: left; color: #6b7280; text-transform: uppercase; font-weight: 600; }
          .totals { margin-top: 12px; float: right; font-size: 14px; }
          .totals div { display:flex; justify-content: space-between; gap: 24px; }
        </style>
      </head>
      <body>
        <h1>Facture ${inv.number}</h1>
        <div class="meta">
          <div>Patient: ${patientName || '—'}</div>
          <div>Émise le: ${issued || '—'}${due ? ` · Échéance: ${due}` : ''}</div>
          <div>Total: <strong>${inv.total} €</strong></div>
        </div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>Prestation</th>
                <th style="text-align:center;">Qté</th>
                <th style="text-align:right;">PU</th>
                <th style="text-align:right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="totals">
            <div><span>Sous-total</span><span>${inv.subtotal} €</span></div>
            <div><span>TVA</span><span>${inv.tax} €</span></div>
            <div style="font-weight:700;"><span>Total</span><span>${inv.total} €</span></div>
          </div>
        </div>
        ${inv.notes ? `<div style="margin-top:16px;font-size:13px;color:#374151;"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
      </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  // Mise à jour de l'heure actuelle toutes les secondes
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(clockInterval);
  }, []);

  // Rafraîchissement automatique des données toutes les 3 secondes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      handleRefresh(false);
    }, 3000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Effect to ensure UI updates when consultations change
  useEffect(() => {
    if (consultations.length > 0) {
      console.log('📊 Consultations updated in UI:', consultations.length, 'consultations');
      console.log('📅 Most recent consultation date:', consultations[0]?.date);
      console.log('📋 Most recent consultation reason:', consultations[0]?.reason);
    }
  }, [consultations]);


  // Load patient data
  const loadPatientData = useCallback(async () => {
    if (!id || !auth.currentUser) {
      setError('ID patient manquant ou utilisateur non authentifié');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Check cache first
      const cachedPatient = patientCache.get(id);
      if (cachedPatient) {
        console.log('Using cached patient data');
        setPatient(cachedPatient);
        setLoading(false);
      }

      // Load from Firestore
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

      // Decrypt data for display
      const decryptedData = HDSCompliance.decryptDataForDisplay(
        patientData,
        'patients',
        auth.currentUser.uid
      );

      const patient: Patient = {
        ...decryptedData,
        id: patientDoc.id
      };

      // Vérifier si le patient a une consultation, sinon en créer une rétroactivement
      const consultationsRef = collection(db, 'consultations');
      const existingConsultationsQuery = query(
        consultationsRef,
        where('patientId', '==', id),
        where('osteopathId', '==', auth.currentUser.uid)
      );
      const existingConsultations = await getDocs(existingConsultationsQuery);
      
      if (existingConsultations.empty) {
        try {
          // Avant toute création rétroactive, vérifier via le service dédié
          const initialId = await InitialConsultationSyncService.findInitialConsultation(id, auth.currentUser.uid);
          if (!initialId) {
            // Déclencher la synchronisation/creation via le service centralisé
            const syncResult = await InitialConsultationSyncService.syncInitialConsultationForPatient(
              id,
              { ...(decryptedData as any), id },
              auth.currentUser.uid
            );

            // Créer une facture liée à cette consultation uniquement si une consultation a été créée
            if (syncResult.success && syncResult.consultationId) {
              const creationDate = patientData.createdAt ? new Date(patientData.createdAt) : new Date();
              const invoiceNumber = `F-${creationDate.getFullYear()}${String(creationDate.getMonth() + 1).padStart(2, '0')}${String(creationDate.getDate()).padStart(2, '0')}-${id.substring(0, 6)}`;
              const invoiceData = {
                number: invoiceNumber,
                patientId: id,
                patientName: `${decryptedData.firstName} ${decryptedData.lastName}`,
                osteopathId: auth.currentUser.uid,
                issueDate: creationDate.toISOString().split('T')[0],
                dueDate: new Date(creationDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
                notes: 'Facture générée rétroactivement pour la première consultation.',
                consultationId: syncResult.consultationId,
                createdAt: creationDate.toISOString(),
                updatedAt: new Date().toISOString()
              };
              await InvoiceService.createInvoice(invoiceData);
              console.log('✅ Created retroactive initial consultation via sync service and linked invoice');
            }
          }
        } catch (retroError) {
          console.warn('⚠️ Could not create retroactive consultation via sync service:', retroError);
        }
      }

      setPatient(patient);
      
      // Update cache
      patientCache.set(id, patient);
      
      console.log('Patient data loaded:', patient);
      
    } catch (error) {
      console.error('Error loading patient:', error);
      setError('Erreur lors du chargement du patient');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load consultations (use service to ensure documents are populated)
  const loadConsultations = useCallback(async () => {
    if (!id || !auth.currentUser) return;

    try {
      const consultationsData = await ConsultationService.getConsultationsByPatientId(id);

      // Sort by date (most recent first) - ensure proper sorting
      consultationsData.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date as any);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date as any);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('📋 Loaded consultations via service:', consultationsData.length, 'consultations');
      if (consultationsData.length > 0) {
        console.log('📅 Most recent consultation:', {
          id: consultationsData[0].id,
          date: consultationsData[0].date,
          reason: consultationsData[0].reason
        });
      }

      setConsultations(consultationsData);
    } catch (error) {
      console.error('Error loading consultations via service:', error);
    }
  }, [id]);

  // Get the most recent consultation for overview display (by date chronologique)
  const getLatestConsultation = useCallback(() => {
    if (consultations.length === 0) return null;

    // Sort by date to ensure we get the most recent
    const sortedConsultations = [...consultations].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedConsultations[0];
  }, [consultations]);

  // Removed unused getInitialConsultation helper

  // Load invoices
  const loadInvoices = useCallback(async () => {
    if (!id || !auth.currentUser) return;

    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('patientId', '==', id),
        // Guard against null currentUser
        where('osteopathId', '==', auth.currentUser?.uid ?? '')
      );

      const snapshot = await getDocs(q);
      const invoicesData: Invoice[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Validation des données
        if (data.number && data.patientName && data.issueDate && data.total !== undefined) {
          const createdAtStr = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
          const updatedAtStr = data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || createdAtStr;
          invoicesData.push({
            id: doc.id,
            number: data.number,
            patientId: data.patientId || '',
            practitionerId: data.practitionerId || data.osteopathId || (auth.currentUser?.uid ?? ''),
            issueDate: data.issueDate,
            dueDate: data.dueDate || '',
            items: data.items || [],
            subtotal: data.subtotal || 0,
            tax: data.tax || 0,
            total: data.total,
            status: data.status || 'draft',
            notes: data.notes || '',
            createdAt: createdAtStr,
            updatedAt: updatedAtStr
          });
        }
      });

      // Sort by issue date (most recent first)
      invoicesData.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
      setInvoices(invoicesData);
      
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    if (id) {
      loadPatientData();
      loadConsultations();
      loadInvoices();
      
      // Track page view
      trackEvent("patient_detail_view", { patient_id: id });
      trackMatomoEvent('Patient', 'Detail View', id);
      trackGAEvent('view_patient_detail', { patient_id: id });
    }
  }, [id, loadPatientData, loadConsultations, loadInvoices]);

  // Set up real-time listeners
  useEffect(() => {
    if (!id || !auth.currentUser) return;

    let consultationsUnsubscribe: () => void = () => {};
    let invoicesUnsubscribe: () => void = () => {};

    (async () => {
      // Consultations listener
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('patientId', '==', id),
        where('osteopathId', '==', auth.currentUser!.uid)
      );

      consultationsUnsubscribe = await setupSafeSnapshot(consultationsQuery, () => {
        if (!loading) {
          loadConsultations();
        }
      }, (err) => {
        console.error('Consultations listener error in PatientDetail:', err);
      });

      // Invoices listener
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('patientId', '==', id),
        where('osteopathId', '==', auth.currentUser!.uid)
      );

      invoicesUnsubscribe = await setupSafeSnapshot(invoicesQuery, () => {
        if (!loading) {
          loadInvoices();
        }
      }, (err) => {
        console.error('Invoices listener error in PatientDetail:', err);
      });
    })();

    return () => {
      consultationsUnsubscribe();
      invoicesUnsubscribe();
    };
  }, [id, loadConsultations, loadInvoices]);

  // Fonction de rafraîchissement manuel
  const handleRefresh = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setRefreshing(true);
    }
    try {
      await Promise.all([loadPatientData(), loadConsultations(), loadInvoices()]);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  }, [loadPatientData, loadConsultations, loadInvoices]);

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    // Invalidate cache and reload
    if (id) {
      patientCache.invalidate(id);
      loadPatientData();
    }
  };

  const handleDeletePatient = async () => {
    if (!patient) return;

    setIsDeletingPatient(true);
    try {
      await PatientService.deletePatient(patient.id);
      
      // Track deletion
      trackEvent("patient_deleted", { patient_id: patient.id });
      trackMatomoEvent('Patient', 'Deleted', patient.id);
      trackGAEvent('delete_patient', { patient_id: patient.id });
      try {
        await PatientService.deletePatient(patient.id);
      } catch (deleteError: any) {
        // Si le patient n'est pas trouvé, c'est que la suppression a déjà eu lieu
        // ou que le patient n'existe plus - dans tous les cas, rediriger vers la liste
        if (deleteError.message === 'Patient non trouvé') {
          console.log('Patient already deleted or not found, redirecting to patient list');
        } else {
          // Pour les autres erreurs, les relancer
          throw deleteError;
        }
      }
      
      // Rediriger vers la liste des patients dans tous les cas
      navigate('/patients');
    } catch (error) {
      console.error('Error deleting patient:', error);
      setError('Erreur lors de la suppression du patient');
    } finally {
      setIsDeletingPatient(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleDocumentSuccess = () => {
    setIsAddDocumentModalOpen(false);
    // Reload patient data to show new document
    loadPatientData();
  };


  // Invoice handlers
  const handleEditInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setIsEditInvoiceModalOpen(true);
  };

  const handleDeleteInvoice = (invoiceId: string, invoiceNumber: string) => {
    setInvoiceToDelete({ id: invoiceId, number: invoiceNumber });
    setIsDeleteInvoiceModalOpen(true);
  };

  const confirmInvoiceDeletion = async () => {
    if (!invoiceToDelete) return;

    setIsDeletingInvoice(true);
    try {
      await InvoiceService.deleteInvoice(invoiceToDelete.id);
      
      setIsDeleteInvoiceModalOpen(false);
      setInvoiceToDelete(null);
      
      // Reload invoices
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setError('Erreur lors de la suppression de la facture');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleInvoiceSuccess = async () => {
    setIsNewInvoiceModalOpen(false);
    setIsEditInvoiceModalOpen(false);
    setSelectedInvoiceId(null);
    
    // Reload invoices
    loadInvoices();
  };

  // Consultation handlers
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

      setIsDeleteConsultationModalOpen(false);
      setConsultationToDelete(null);

      // Reload consultations AND patient data to update nextAppointment field
      await Promise.all([
        loadConsultations(),
        loadPatientData()
      ]);

      console.log('✅ Consultation deleted and patient data refreshed');
    } catch (error) {
      console.error('Error deleting consultation:', error);
      setError('Erreur lors de la suppression de la consultation');
    } finally {
      setIsDeletingConsultation(false);
    }
  };

  const handleConsultationSuccess = async () => {
    setIsNewConsultationModalOpen(false);
    setIsEditConsultationModalOpen(false);
    setIsViewConsultationModalOpen(false);
    setSelectedConsultationId(null);
    
    console.log('✅ Consultation created successfully, refreshing all data...');
    
    // Recharger toutes les données pour s'assurer que la vue d'ensemble est à jour
    await Promise.all([
      loadConsultations(),
      loadInvoices(),
      loadPatientData() // Recharger aussi les données du patient
    ]);
    
    console.log('🔄 All data refreshed successfully');
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (error) {
      console.error('Error formatting date:', dateString);
      return 'Date invalide';
    }
  };

  const formatDateTime = (date: Date) => {
    try {
      return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
    } catch (error) {
      console.error('Error formatting date:', date);
      return 'Date invalide';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const calculateAge = (dateOfBirth: string) => {
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', dateOfBirth);
      return 'N/A';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-red-200 text-red-800';
      case 'sent':
        return 'bg-green-200 text-green-800';
      case 'paid':
        return 'bg-blue-200 text-blue-800';
      case 'overdue':
        return 'bg-error/10 text-error';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'sent':
        return 'Envoyée';
      case 'paid':
        return 'Payée';
      case 'overdue':
        return 'En retard';
      default:
        return status;
    }
  };

  const getConsultationStatusColor = (status: string) => {
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

  const getConsultationStatusText = (status: string) => {
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

  // Formatage de la date et de l'heure
  const formatCurrentDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrentTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-primary-600"></div>
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
        
        <div className="p-6 border bg-error/5 border-error/20 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="mr-3 text-error" size={24} />
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.firstName} {patient.lastName}
          </h1>
          {patient.isTestData && (
            <span className="px-2 py-1 ml-3 text-xs text-yellow-800 bg-yellow-100 rounded-full">
              Donnée test
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {formatCurrentDate(currentDateTime)} - {formatCurrentTime(currentDateTime)}
          </div>
          <div className="text-xs text-gray-400">
            Dernière mise à jour: {formatCurrentTime(lastRefreshTime)}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleRefresh(true)}
            leftIcon={<RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />}
            disabled={refreshing}
            className="hidden"
          >
            Actualiser
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
      </div>


      {/* Patient overview card */}
      <div className="p-6 bg-white shadow rounded-xl">
        <div className="flex items-start space-x-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-primary-700 ${
            patient.isTestData ? 'bg-yellow-100' : 'bg-primary-100'
          }`}>
            {getInitials(patient.firstName, patient.lastName)}
          </div>
          
          <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <h3 className="mb-1 text-sm font-medium text-gray-500">Informations personnelles</h3>
              <div className="space-y-1">
                <p className="text-gray-900">
                  <span className="font-medium">Âge:</span> {calculateAge(patient.dateOfBirth)} ans
                </p>
                <p className="text-gray-900">
                  <span className="font-medium">Né(e) le:</span> {formatDate(patient.dateOfBirth)}
                </p>
                <p className="text-gray-900">
                  <span className="font-medium">Sexe:</span> {
                    patient.gender === 'male' ? 'Homme' : 
                    patient.gender === 'female' ? 'Femme' : 
                    patient.gender === 'other' ? 'Autre' : 'Non spécifié'
                  }
                </p>
                {patient.profession && (
                  <p className="text-gray-900">
                    <span className="font-medium">Profession:</span> {cleanDecryptedField(patient.profession, false, 'Non spécifiée')}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="mb-1 text-sm font-medium text-gray-500">Contact</h3>
              <div className="space-y-1">
                {patient.phone && (
                  <div className="flex items-center">
                    <Phone size={16} className="mr-2 text-gray-400" />
                    <span className="text-gray-900">{cleanDecryptedField(patient.phone, false, 'Non renseigné')}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center">
                    <Mail size={16} className="mr-2 text-gray-400" />
                    <span className="text-gray-900">{cleanDecryptedField(patient.email, false, 'Non renseigné')}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-400 mr-2 mt-0.5" />
                    <span className="text-gray-900">
                      {typeof patient.address === 'object' && patient.address.street 
                        ? cleanDecryptedField(patient.address.street, false, 'Adresse non disponible')
                        : typeof patient.address === 'string' 
                        ? cleanDecryptedField(patient.address, false, 'Adresse non disponible')
                        : 'Adresse non disponible'
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="mb-1 text-sm font-medium text-gray-500">Prochaine consultation</h3>
              {patient.nextAppointment ? (
                <div className="flex items-center">
                  <Calendar size={16} className="mr-2 text-primary-500" />
                  <span className="font-medium text-primary-600">
                    {formatDate(patient.nextAppointment.split('T')[0])} à {patient.nextAppointment.split('T')[1]?.slice(0, 5)}
                  </span>
                </div>
              ) : (
                <span className="text-gray-500">Aucune consultation prévue</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Tags */}
        {patient.tags && patient.tags.length > 0 && (
          <div className="pt-6 mt-6 border-t border-gray-200">
            <h3 className="mb-2 text-sm font-medium text-gray-500">Symptômes / Syndromes</h3>
            <div className="flex flex-wrap gap-2">
              {patient.tags.map((tag, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 text-sm rounded-full ${
                    patient.isTestData 
                      ? 'bg-yellow-50 text-yellow-700' 
                      : 'bg-primary-50 text-primary-700'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Vue d'ensemble
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'consultations'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('consultations')}
        >
          Consultations ({consultations.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('invoices')}
        >
          Factures ({invoices.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* AJOUT: Résumé rapide des statistiques du patient */}
            <div className="p-6 bg-white shadow rounded-xl lg:col-span-2">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Résumé du dossier</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="p-3 text-center rounded-lg bg-primary-50">
                  <div className="text-2xl font-bold text-primary-600">{consultations.length}</div>
                  <div className="text-sm text-gray-600">Consultations</div>
                </div>
                <div className="p-3 text-center rounded-lg bg-secondary-50">
                  <div className="text-2xl font-bold text-secondary-600">{invoices.length}</div>
                  <div className="text-sm text-gray-600">Factures</div>
                </div>
                <div className="p-3 text-center rounded-lg bg-accent-50">
                  <div className="text-2xl font-bold text-accent-600">
                    {invoices.filter(i => i.status === 'paid').length}
                  </div>
                  <div className="text-sm text-gray-600">Factures payées</div>
                </div>
                <div className="p-3 text-center rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {consultations.filter(c => c.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Consultations terminées</div>
                </div>
              </div>
            </div>

            {/* AJOUT : Section Profession - Champ manquant dans la vue d'ensemble */}
            {patient.profession && (
              <div className="p-6 bg-white shadow rounded-xl">
                <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                  <User size={20} className="mr-2 text-gray-600" />
                  Profession
                </h3>
                <p className="text-gray-700">{patient.profession}</p>
              </div>
            )}

            {(() => {
              const latestConsultation = getLatestConsultation();
              if (!latestConsultation) return null;

              return (
                <FieldHistory
                  fieldLabel="Traitement effectué"
                  currentValue={latestConsultation.currentTreatment || ''}
                  history={patient ? buildFieldHistory('currentTreatment', patient, consultations) : []}
                  emptyMessage="Aucun traitement effectué renseigné"
                />
              );
            })()}

            {(() => {
              const latestConsultation = getLatestConsultation();
              if (!latestConsultation) return null;

              return (
                <FieldHistory
                  fieldLabel="Motif de consultation"
                  currentValue={latestConsultation.consultationReason || ''}
                  history={patient ? buildFieldHistory('consultationReason', patient, consultations) : []}
                  emptyMessage="Aucun motif de consultation renseigné"
                />
              );
            })()}

            {(() => {
              const latestConsultation = getLatestConsultation();
              if (!latestConsultation) return null;

              return (
                <FieldHistory
                  fieldLabel="Antécédents médicaux"
                  currentValue={latestConsultation.medicalAntecedents || ''}
                  history={patient ? buildFieldHistory('medicalAntecedents', patient, consultations) : []}
                  emptyMessage="Aucun antécédent médical renseigné"
                />
              );
            })()}

            {(() => {
              const latestConsultation = getLatestConsultation();
              if (!latestConsultation) return null;

              return (
                <FieldHistory
                  fieldLabel="Traitement ostéopathique"
                  currentValue={latestConsultation.osteopathicTreatment || ''}
                  history={patient ? buildFieldHistory('osteopathicTreatment', patient, consultations) : []}
                  emptyMessage="Aucun traitement ostéopathique renseigné"
                />
              );
            })()}

            {(() => {
              const latestConsultation = getLatestConsultation();
              if (!latestConsultation) return null;

              const notesHistory = patient ? buildFieldHistory('notes', patient, consultations) : [];
              // latestValue: dossier patient en priorité, sinon consultation la plus récente
              const latestNotes = getLatestValue(notesHistory);
              return (
                <FieldHistory
                  fieldLabel="Note sur le patient"
                  currentValue={cleanDecryptedField(latestNotes || '', false, '')}
                  history={notesHistory}
                  emptyMessage="Aucune note sur le patient"
                />
              );
            })()}

            {/* ✅ NOUVEAU : Section Dernière consultation - Informations spécifiques à la consultation */}
            {/* Bloc masqué selon les spécifications - redondant avec "Dernières consultations" */}
            {/* {(() => {
              const latestConsultation = getLatestConsultation();
              return latestConsultation && (
                <div className="p-6 bg-white shadow rounded-xl">
                  <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                    <Calendar size={20} className="mr-2 text-gray-600" />
                    Dernière consultation
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500">Date</div>
                      <div className="font-medium text-gray-900">
                        {formatDateTime(latestConsultation.date)}
                      </div>
                    </div>
                    {latestConsultation.reason && (
                      <div>
                        <div className="text-sm text-gray-500">Raison</div>
                        <div className="text-gray-700 whitespace-pre-wrap break-words">{latestConsultation.reason}</div>
                      </div>
                    )}
                    {latestConsultation.treatment && (
                      <div>
                        <div className="text-sm text-gray-500">Traitement</div>
                        <div className="text-gray-700 whitespace-pre-wrap break-words">{latestConsultation.treatment}</div>
                      </div>
                    )}
                    {latestConsultation.notes && (
                      <div>
                        <div className="text-sm text-gray-500">Notes</div>
                        <div className="text-gray-700 whitespace-pre-wrap break-words">{latestConsultation.notes}</div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          Durée: {latestConsultation.duration || 60} min
                        </span>
                        <span className="text-sm text-gray-500">
                          Prix: {latestConsultation.price || 60} €
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConsultationStatusColor(latestConsultation.status)}`}>
                        {getConsultationStatusText(latestConsultation.status)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()} */}


            {/* AJOUT : Section Métadonnées du dossier - Informations système manquantes */}
            <div className="p-6 bg-white shadow rounded-xl">
              <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                <Info size={20} className="mr-2 text-gray-600" />
                Informations du dossier
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-500">Dossier créé le</div>
                  <div className="font-medium text-gray-900">
                    {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Dernière modification</div>
                  <div className="font-medium text-gray-900">
                    {patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Statut du dossier</div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 mr-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-700">Actif</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">ID du dossier</div>
                  <div className="font-mono text-sm text-gray-600">{patient.id}</div>
                </div>
              </div>
            </div>

            {/* AJOUT: Dernières consultations (aperçu rapide) */}
            <div className="p-6 bg-white shadow rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Dernières consultations</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('consultations')}
                  rightIcon={<ArrowLeft className="rotate-180" size={14} />}
                >
                  Voir tout
                </Button>
              </div>
              {consultations.length > 0 ? (
                <div className="space-y-3">
                  {consultations.slice(0, 3).map((consultation) => (
                    <div key={consultation.id} className="p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDateTime(consultation.date)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConsultationStatusColor(consultation.status)}`}>
                          {getConsultationStatusText(consultation.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {cleanDecryptedField(consultation.reason, false, 'Consultation ostéopathique')}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{consultation.duration || 60} min</span>
                        <span className="text-xs font-medium text-gray-700">{consultation.price || 60} €</span>
                      </div>
                    </div>
                  ))}
                  {consultations.length > 3 && (
                    <p className="text-sm text-center text-gray-500">
                      +{consultations.length - 3} autres consultations
                    </p>
                  )}
                </div>
              ) : (
                <p className="py-4 italic text-center text-gray-500">Aucune consultation enregistrée</p>
              )}
            </div>

            {/* AJOUT: Factures récentes (aperçu rapide) */}
            <div className="p-6 bg-white shadow rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Factures récentes</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('invoices')}
                  rightIcon={<ArrowLeft className="rotate-180" size={14} />}
                >
                  Voir tout
                </Button>
              </div>
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.slice(0, 3).map((invoice) => (
                    <div key={invoice.id} className="p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {invoice.number}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {formatDate(invoice.issueDate)}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{invoice.total} €</span>
                      </div>
                    </div>
                  ))}
                  {invoices.length > 3 && (
                    <p className="text-sm text-center text-gray-500">
                      +{invoices.length - 3} autres factures
                    </p>
                  )}
                </div>
              ) : (
                <p className="py-4 italic text-center text-gray-500">Aucune facture créée</p>
              )}
            </div>

            {/* AJOUT: Alertes et informations importantes */}
            <div className="p-6 bg-white shadow rounded-xl lg:col-span-2">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Alertes et informations importantes</h3>
              <div className="space-y-3">
                {/* Alerte pour prochain rendez-vous */}
                {patient.nextAppointment && (
                  <div className="flex items-center p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <Calendar size={16} className="mr-3 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Prochain rendez-vous programmé</p>
                      <p className="text-sm text-blue-700">
                        {formatDate(patient.nextAppointment.split('T')[0])} à {patient.nextAppointment.split('T')[1]?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Alerte pour factures impayées */}
                {invoices.filter(i => i.status === 'draft' || i.status === 'sent').length > 0 && (
                  <div className="flex items-center p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                    <AlertCircle size={16} className="mr-3 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        {invoices.filter(i => i.status === 'draft' || i.status === 'sent').length} facture(s) en attente de paiement
                      </p>
                      <p className="text-sm text-yellow-700">
                        Total: {invoices.filter(i => i.status === 'draft' || i.status === 'sent').reduce((sum, i) => sum + i.total, 0)} €
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Alerte si aucune consultation récente */}
                {consultations.length === 0 && (
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <Stethoscope size={16} className="mr-3 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Aucune consultation enregistrée</p>
                      <p className="text-sm text-gray-600">Commencez par ajouter une première consultation</p>
                    </div>
                  </div>
                )}
                
                {/* Message si tout va bien */}
                {patient.nextAppointment && 
                 invoices.filter(i => i.status === 'draft' || i.status === 'sent').length === 0 && 
                 consultations.length > 0 && (
                  <div className="flex items-center p-3 border border-green-200 rounded-lg bg-green-50">
                    <CheckCircle size={16} className="mr-3 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Dossier à jour</p>
                      <p className="text-sm text-green-700">Toutes les informations sont complètes</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(() => {
              const latestConsultation = getLatestConsultation();
              if (!latestConsultation) return null;

              return (
                <FieldHistory
                  fieldLabel="Historique médical général"
                  currentValue={cleanDecryptedField(latestConsultation.medicalHistory || '', false, '')}
                  history={patient ? buildFieldHistory('medicalHistory', patient, consultations) : []}
                  emptyMessage="Aucun historique médical renseigné"
                />
              );
            })()}

            {/* AJOUT: Actions rapides */}
            <div className="p-6 bg-white shadow rounded-xl">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Actions rapides</h3>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<Plus size={16} />}
                  onClick={() => setIsNewConsultationModalOpen(true)}
                >
                  Nouvelle consultation
                </Button>
                {/* Boutons masqués selon les spécifications */}
                {/* <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<FileText size={16} />}
                  onClick={() => setIsNewInvoiceModalOpen(true)}
                >
                  Nouvelle facture
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<Upload size={16} />}
                  onClick={() => setIsAddDocumentModalOpen(true)}
                >
                  Ajouter un document
                </Button> */}
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

            {/* Osteopathic Treatment */}
            {patient.osteopathicTreatment && (
              <div className="p-6 bg-white shadow rounded-xl">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Traitement ostéopathique</h3>
                <div className="prose-sm prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {cleanDecryptedField(patient.osteopathicTreatment, false, 'Aucun traitement ostéopathique spécifique')}
                  </p>
                </div>
              </div>
            )}

            {/* ✅ CORRIGÉ : Note sur le patient - Affiche les données de la dernière consultation */}
            {(() => {
              const latestConsultation = getLatestConsultation();
              return latestConsultation?.notes && (
                <div className="p-6 bg-white shadow rounded-xl">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Note sur le patient (dernière consultation)</h3>
                  <div className="prose-sm prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {cleanDecryptedField(latestConsultation.notes, false, 'Aucune note sur le patient')}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Insurance */}
            {patient.insurance && (
              <div className="p-6 bg-white shadow rounded-xl">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Assurance</h3>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Mutuelle:</span> {cleanDecryptedField(patient.insurance.provider, false, 'Non renseignée')}
                  </p>
                  {patient.insurance.policyNumber && (
                    <p className="text-gray-700">
                      <span className="font-medium">Numéro:</span> {cleanDecryptedField(patient.insurance.policyNumber, false, 'Non renseigné')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Treatment History */}
            {patient.treatmentHistory && patient.treatmentHistory.length > 0 && (
              <div className="p-6 bg-white shadow rounded-xl lg:col-span-2">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Historique des traitements</h3>
                <div className="space-y-4">
                  {patient.treatmentHistory.map((treatment, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(treatment.date)}
                        </span>
                        {treatment.provider && (
                          <span className="text-sm text-gray-500">{treatment.provider}</span>
                        )}
                      </div>
                      <p className="mb-2 text-gray-700">{treatment.treatment}</p>
                      {treatment.notes && (
                        <p className="text-sm text-gray-500">{treatment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section Rendez-vous passés supprimée conformément aux nouvelles règles */}
          </div>
        )}

        {activeTab === 'consultations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Historique des consultations</h3>
                <p className="text-sm text-gray-500">Chaque consultation conserve un snapshot indépendant des données du patient au moment T</p>
              </div>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => setIsNewConsultationModalOpen(true)}
              >
                Nouvelle consultation
              </Button>
            </div>

            {consultations.length === 0 ? (
              <div className="py-12 text-center bg-white shadow rounded-xl">
                <Stethoscope size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="mb-1 text-lg font-medium text-gray-900">Aucune consultation</h3>
                <p className="mb-4 text-gray-500">
                  Aucune consultation n'a encore été enregistrée pour ce patient.
                </p>
                <Button
                  variant="primary"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setIsNewConsultationModalOpen(true)}
                >
                  Ajouter une consultation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation, index) => (
                  <div key={consultation.id} className="p-6 bg-white border-l-4 shadow rounded-xl border-primary-500">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2 space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            Consultation #{consultations.length - index} - {formatDateTime(consultation.date)}
                          </h4>
                          {consultation.isInitialConsultation && (
                            <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                              Consultation initiale
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConsultationStatusColor(consultation.status)}`}>
                            {getConsultationStatusText(consultation.status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock size={14} className="mr-1" />
                            <span>{consultation.duration || 60} min</span>
                          </div>
                          <div className="flex items-center">
                            <CreditCard size={14} className="mr-1" />
                            <span>{consultation.price || 60} €</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye size={16} />}
                          onClick={() => handleViewConsultation(consultation.id)}
                        >
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit size={16} />}
                          onClick={() => handleEditConsultation(consultation.id)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Trash2 size={16} />}
                          onClick={() => handleDeleteConsultation(consultation.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* ✅ SUPPRIMÉ : Anciens champs "Motif de consultation" et "Traitement effectué" 
                          Ces champs sont remplacés par les champs détaillés dans la section "Données cliniques" */}

                      {consultation.notes && cleanDecryptedField(consultation.notes, false, '') && (
                        <div>
                          <h5 className="mb-1 text-sm font-medium text-gray-700">Note sur le patient</h5>
                          <p className="text-gray-900 whitespace-pre-wrap break-words">
                            {cleanDecryptedField(consultation.notes, false, '')}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4 pt-4 border-t md:grid-cols-2">
                        {consultation.consultationReason && (
                          <div>
                            <h5 className="mb-1 text-xs font-medium text-gray-500 uppercase">Motif détaillé</h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {cleanDecryptedField(consultation.consultationReason, false, '-')}
                            </p>
                          </div>
                        )}
                        {consultation.currentTreatment && (
                          <div>
                            <h5 className="mb-1 text-xs font-medium text-gray-500 uppercase">Traitement en cours</h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {cleanDecryptedField(consultation.currentTreatment, false, '-')}
                            </p>
                          </div>
                        )}
                        {consultation.medicalAntecedents && (
                          <div>
                            <h5 className="mb-1 text-xs font-medium text-gray-500 uppercase">Antécédents</h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {cleanDecryptedField(consultation.medicalAntecedents, false, '-')}
                            </p>
                          </div>
                        )}
                        {consultation.osteopathicTreatment && (
                          <div>
                            <h5 className="mb-1 text-xs font-medium text-gray-500 uppercase">Traitement ostéopathique</h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {cleanDecryptedField(consultation.osteopathicTreatment, false, '-')}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ✅ NOUVEAU : Documents de la consultation */}
                      {consultation.documents && consultation.documents.length > 0 && (
                        <div className="pt-4 border-t">
                          <h5 className="mb-3 text-sm font-medium text-gray-700">Documents de la consultation</h5>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {consultation.documents.map((docMeta, docIndex) => (
                              <div key={docIndex} className="p-3 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex items-center space-x-3 min-w-0">
                                    <div className="flex-shrink-0">
                                      {docMeta.type?.startsWith('image/') ? (
                                        <ImageIcon size={20} className="text-blue-500" />
                                      ) : (
                                        <FileText size={20} className="text-gray-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h6 className="text-sm font-medium text-gray-900 truncate">
                                        {docMeta.originalName || docMeta.name}
                                      </h6>
                                      <p className="text-xs text-gray-500 truncate">
                                        {docMeta.size ? `${(docMeta.size / (1024 * 1024)).toFixed(2)} MB` : 'Taille inconnue'}
                                        {docMeta.category && ` • ${docMeta.category}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex space-x-1 flex-shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setZoom(1);
                                        setViewerLoading(true);
                                        setViewingDocument(docMeta);
                                      }}
                                      leftIcon={<Eye size={12} />}
                                      className="text-xs"
                                    >
                                      Voir
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = docMeta.url;
                                        link.download = docMeta.originalName || docMeta.name;
                                        link.click();
                                      }}
                                      leftIcon={<Download size={12} />}
                                      className="text-xs"
                                    >
                                      Télécharger
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
              <h3 className="text-lg font-medium text-gray-900">Factures</h3>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => setIsNewInvoiceModalOpen(true)}
              >
                Nouvelle facture
              </Button>
            </div>

            {invoices.length === 0 ? (
              <div className="py-12 text-center bg-white shadow rounded-xl">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="mb-1 text-lg font-medium text-gray-900">Aucune facture</h3>
                <p className="mb-4 text-gray-500">
                  Aucune facture n'a encore été créée pour ce patient.
                </p>
                <Button
                  variant="primary"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setIsNewInvoiceModalOpen(true)}
                >
                  Créer une facture
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-6 bg-white shadow rounded-xl">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2 space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            Facture {invoice.number}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            <span>Émise le {formatDate(invoice.issueDate)}</span>
                          </div>
                          <div className="flex items-center">
                            <CreditCard size={14} className="mr-1" />
                            <span className="font-medium">{invoice.total} €</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye size={16} />}
                          onClick={() => {
                            setSelectedInvoiceId(invoice.id);
                            setIsViewInvoiceModalOpen(true);
                          }}
                        >
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit size={16} />}
                          onClick={() => handleEditInvoice(invoice.id)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Trash2 size={16} />}
                          onClick={() => handleDeleteInvoice(invoice.id, invoice.number)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    {invoice.notes && (
                      <div>
                        <h5 className="mb-1 text-sm font-medium text-gray-700">Notes</h5>
                        <p className="text-gray-900">{invoice.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
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
        onConfirm={handleDeletePatient}
        isLoading={isDeletingPatient}
        patientName={`${patient.firstName} ${patient.lastName}`}
        patientId={patient.id}
      />

      <AddDocumentModal
        isOpen={isAddDocumentModalOpen}
        onClose={() => setIsAddDocumentModalOpen(false)}
        onSuccess={handleDocumentSuccess}
        patientId={patient.id}
      />

      <NewInvoiceModal
        isOpen={isNewInvoiceModalOpen}
        onClose={() => setIsNewInvoiceModalOpen(false)}
        onSuccess={handleInvoiceSuccess}
        preselectedPatientId={patient.id}
      />

      {selectedInvoiceId && (
        <EditInvoiceModal
          isOpen={isEditInvoiceModalOpen}
          onClose={() => {
            setIsEditInvoiceModalOpen(false);
            setSelectedInvoiceId(null);
          }}
          onSuccess={handleInvoiceSuccess}
          invoiceId={selectedInvoiceId}
        />
      )}

      <DeleteInvoiceModal
        isOpen={isDeleteInvoiceModalOpen}
        onClose={() => {
          setIsDeleteInvoiceModalOpen(false);
          setInvoiceToDelete(null);
        }}
        onConfirm={confirmInvoiceDeletion}
        isLoading={isDeletingInvoice}
        invoiceNumber={invoiceToDelete?.number || ''}
      />

      {isViewInvoiceModalOpen && viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setIsViewInvoiceModalOpen(false);
              setSelectedInvoiceId(null);
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
                  {`Facture ${viewingInvoice.number}`}
                </span>
                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(viewingInvoice.status)}`}>
                  {getStatusText(viewingInvoice.status)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download size={14} />}
                  onClick={() => downloadInvoicePdf(viewingInvoice)}
                >
                  Télécharger
                </Button>
              <button
                onClick={() => {
                  setIsViewInvoiceModalOpen(false);
                  setSelectedInvoiceId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-50">
              <div className="w-full h-full overflow-auto p-4">
                <div className="mb-4 flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    <span>Émise le {formatDate(viewingInvoice.issueDate)}</span>
                  </div>
                  {viewingInvoice.dueDate && (
                    <div className="flex items-center">
                      <Clock size={14} className="mr-1" />
                      <span>Échéance le {formatDate(viewingInvoice.dueDate)}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CreditCard size={14} className="mr-1" />
                    <span className="font-medium">{viewingInvoice.total} €</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow border border-gray-200">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-2">Prestation</th>
                        <th className="px-4 py-2">Qté</th>
                        <th className="px-4 py-2">PU</th>
                        <th className="px-4 py-2 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewingInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <div className="text-sm font-medium text-gray-900">{item.description}</div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{item.unitPrice} €</td>
                          <td className="px-4 py-2 text-sm font-medium text-right">{item.amount} €</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="px-4 pt-4 text-right font-medium">Sous-total</td>
                        <td className="px-4 pt-4 text-right font-medium">{viewingInvoice.subtotal} €</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 pt-2 text-right font-medium">TVA</td>
                        <td className="px-4 pt-2 text-right font-medium">{viewingInvoice.tax} €</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 pt-4 text-right text-lg font-bold">Total</td>
                        <td className="px-4 pt-4 text-right text-lg font-bold">{viewingInvoice.total} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {viewingInvoice.notes && (
                  <div className="mt-4">
                    <h5 className="mb-1 text-sm font-medium text-gray-700">Notes</h5>
                    <p className="text-gray-900">{viewingInvoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <NewConsultationModal
        isOpen={isNewConsultationModalOpen}
        onClose={() => setIsNewConsultationModalOpen(false)}
        onSuccess={handleConsultationSuccess}
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
            onSuccess={handleConsultationSuccess}
            consultationId={selectedConsultationId}
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

      {viewingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
                {isImageFile(viewingDocument.type || '') && (
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
                {isImageFile(viewingDocument.type || '') ? (
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
        </div>
      )}
    </div>
  );
};

export default PatientDetail;