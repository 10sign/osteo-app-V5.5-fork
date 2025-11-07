import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
// Analytics supprimés: imports retirés pour alléger le bundle

// Layouts
import AuthLayout from './layouts/AuthLayout';
import WaitlistLayout from './layouts/WaitlistLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth pages
import UserLogin from './pages/auth/UserLogin';
import AdminLogin from './pages/admin/AdminLogin';
import Register from './pages/auth/Register';
import BetaWaitlist from './pages/auth/BetaWaitlist';
import ForgotPassword from './pages/auth/ForgotPassword';
import Onboarding from './pages/auth/Onboarding';

// Protected pages
import Dashboard from './pages/Dashboard';
import Patients from './pages/patients/Patients';
import PatientDetail from './pages/patients/PatientDetail';
import Consultations from './pages/consultations/Consultations';
import Invoices from './pages/invoices/Invoices';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Resources from './pages/Resources';
import Referral from './pages/Referral';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import SyncConsultations from './pages/admin/SyncConsultations';

// Other pages
import Unauthorized from './pages/Unauthorized';

// Components
import LoadingScreen from './components/ui/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Exposer des scripts utiles dans la console pour debug
if (typeof window !== 'undefined') {
  // Script de synchronisation
  (window as any).syncJulieConsultations = async () => {
    const { syncForOsteopathByEmail } = await import('./scripts/syncFirstConsultationWithPatient');
    console.log('🚀 Lancement de la synchronisation pour Julie Boddaert...');
    const result = await syncForOsteopathByEmail('julie.boddaert@hotmail.fr');
    console.log('📊 Résultats:', result);
    return result;
  };

  // Script de diagnostic pour débugger les consultations
  (window as any).diagnosticConsultation = async (patientId: string) => {
    const { collection, query, where, getDocs, orderBy, doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase/config');

    console.log('='.repeat(60));
    console.log('🔍 DIAGNOSTIC CONSULTATION - Patient ID:', patientId);
    console.log('='.repeat(60));

    // 1. Charger le patient
    const patientDoc = await getDoc(doc(db, 'patients', patientId));

    if (!patientDoc.exists()) {
      console.error('❌ Patient non trouvé!');
      return;
    }

    const patientData = patientDoc.data();
    console.log('\n📋 DONNÉES DU PATIENT (brutes - chiffrées):');
    console.log('- consultationReason:', patientData.consultationReason);
    console.log('- currentTreatment:', patientData.currentTreatment);
    console.log('- medicalAntecedents:', patientData.medicalAntecedents);
    console.log('- medicalHistory:', patientData.medicalHistory);
    console.log('- osteopathicTreatment:', patientData.osteopathicTreatment);

    // 2. Charger les consultations
    const consultationsRef = collection(db, 'consultations');
    const q = query(
      consultationsRef,
      where('patientId', '==', patientId),
      orderBy('date', 'asc')
    );

    const consultationsSnapshot = await getDocs(q);
    console.log('\n📅 CONSULTATIONS TROUVÉES:', consultationsSnapshot.docs.length);

    consultationsSnapshot.docs.forEach((consultationDoc, index) => {
      const data = consultationDoc.data();
      console.log(`\n--- Consultation #${index + 1} (${consultationDoc.id}) ---`);
      console.log('Date:', data.date?.toDate?.() || data.date);
      console.log('DONNÉES CLINIQUES (brutes - chiffrées):');
      console.log('- consultationReason:', data.consultationReason);
      console.log('- currentTreatment:', data.currentTreatment);
      console.log('- medicalAntecedents:', data.medicalAntecedents);
      console.log('- medicalHistory:', data.medicalHistory);
      console.log('- osteopathicTreatment:', data.osteopathicTreatment);
      console.log('- symptoms:', data.symptoms);
      console.log('- notes:', data.notes);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic terminé');
    console.log('='.repeat(60));
  };

  // Script de diagnostic pour un patient (vérifier données brutes vs déchiffrées)
  (window as any).diagnosticPatient = async (patientId: string) => {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase/config');
    const { HDSCompliance } = await import('./utils/hdsCompliance');
    const { auth } = await import('./firebase/config');

    console.log('='.repeat(60));
    console.log('🔍 DIAGNOSTIC PATIENT - Patient ID:', patientId);
    console.log('='.repeat(60));

    const patientDoc = await getDoc(doc(db, 'patients', patientId));
    if (!patientDoc.exists()) {
      console.error('❌ Patient non trouvé!');
      return null;
    }

    const raw = patientDoc.data();
    console.log('\n📋 DONNÉES DU PATIENT (brutes - chiffrées):');
    console.log(JSON.stringify(raw, null, 2));

    const decrypted = HDSCompliance.decryptDataForDisplay(raw, 'patients', auth.currentUser?.uid || '');
    console.log('\n🔓 DONNÉES DU PATIENT (déchiffrées pour affichage):');
    console.log(JSON.stringify(decrypted, null, 2));

    const coreFields = ['firstName','lastName','dateOfBirth','email','phone','address'];
    const empties = coreFields.filter((f) => !decrypted[f] || (typeof decrypted[f] === 'string' && decrypted[f].trim() === ''));
    console.log('\n🧪 Champs essentiels vides après déchiffrement:', empties);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic patient terminé');
    console.log('='.repeat(60));
    return { raw, decrypted, empties };
  };

  console.log('✅ Scripts disponibles:');
  console.log('  - syncJulieConsultations() : Synchroniser les consultations de Julie');
  console.log('  - diagnosticConsultation("PATIENT_ID") : Diagnostiquer un patient spécifique');
  
  // ===== Export des données patients =====
  const downloadFile = (filename: string, content: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toCSV = (rows: any[]): string => {
    if (!rows || rows.length === 0) return '';
    // Construire l'ensemble des colonnes dynamiquement
    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    const escape = (v: any) => {
      const str = v === undefined || v === null ? '' : String(v);
      return '"' + str.replace(/"/g, '""') + '"';
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map(h => escape((row as any)[h])).join(','));
    }
    return lines.join('\n');
  };

  // Export de tous les patients du praticien (JSON)
  (window as any).exportPatientsJSON = async () => {
    const { PatientService } = await import('./services/patientService');
    const { AuditLogger } = await import('./utils/auditLogger');
    console.log('📦 Récupération de tous les dossiers patients…');
    const patients = await PatientService.getPatientsByOsteopath();
    const content = JSON.stringify(patients, null, 2);
    const filename = `patients-${new Date().toISOString().slice(0,10)}.json`;
    downloadFile(filename, content, 'application/json');
    await AuditLogger.logExport('patients', 'json', 'success', { count: patients.length });
    console.log(`✅ Export JSON terminé (${patients.length} patients) → ${filename}`);
    return patients.length;
  };

  // Export de tous les patients du praticien (CSV)
  (window as any).exportPatientsCSV = async () => {
    const { PatientService } = await import('./services/patientService');
    const { AuditLogger } = await import('./utils/auditLogger');
    console.log('📦 Récupération de tous les dossiers patients…');
    const patients = await PatientService.getPatientsByOsteopath();
    const csv = toCSV(patients);
    const filename = `patients-${new Date().toISOString().slice(0,10)}.csv`;
    downloadFile(filename, csv, 'text/csv');
    await AuditLogger.logExport('patients', 'csv', 'success', { count: patients.length });
    console.log(`✅ Export CSV terminé (${patients.length} patients) → ${filename}`);
    return patients.length;
  };

  // Export d'un patient spécifique (JSON)
  (window as any).exportPatientJSON = async (patientId: string) => {
    const { PatientService } = await import('./services/patientService');
    const data = await PatientService.exportPatientData(patientId, 'json');
    const filename = `patient-${patientId}-${new Date().toISOString().slice(0,10)}.json`;
    downloadFile(filename, JSON.stringify(data, null, 2), 'application/json');
    console.log(`✅ Export JSON du patient ${patientId} terminé → ${filename}`);
    return data;
  };

  // Export d'un patient spécifique (CSV)
  (window as any).exportPatientCSV = async (patientId: string) => {
    const { PatientService } = await import('./services/patientService');
    const data = await PatientService.exportPatientData(patientId, 'csv');
    const csv = toCSV([data]);
    const filename = `patient-${patientId}-${new Date().toISOString().slice(0,10)}.csv`;
    downloadFile(filename, csv, 'text/csv');
    console.log(`✅ Export CSV du patient ${patientId} terminé → ${filename}`);
    return data;
  };

  // Réparation HDS d'un patient spécifique (si données chiffrées corrompues)
  (window as any).repairPatientData = async (patientId: string) => {
    const { HDSCompliance } = await import('./utils/hdsCompliance');
    const { AuditLogger } = await import('./utils/auditLogger');
    console.log('🛠️ Réparation des données HDS pour le patient:', patientId);
    const success = await HDSCompliance.repairCorruptedData('patients', patientId);
    await AuditLogger.log(
      (await import('./utils/auditLogger')).AuditEventType.DATA_MODIFICATION,
      `patients/${patientId}`,
      'repair_encrypted_data',
      (await import('./utils/auditLogger')).SensitivityLevel.SENSITIVE,
      success ? 'success' : 'failure'
    );
    console.log(success ? '✅ Réparation réussie' : '❌ Réparation échouée');
    return success;
  };

  console.log('  - exportPatientsJSON() : Exporter tous les patients en JSON');
  console.log('  - exportPatientsCSV()  : Exporter tous les patients en CSV');
  console.log('  - exportPatientJSON("PATIENT_ID") : Exporter un patient (JSON)');
  console.log('  - exportPatientCSV("PATIENT_ID")  : Exporter un patient (CSV)');
  console.log('  - diagnosticPatient("PATIENT_ID")  : Diagnostiquer un patient (brut vs déchiffré)');
  console.log('  - repairPatientData("PATIENT_ID")  : Réparer données chiffrées corrompues du patient');
}

// Route change tracker component
const RouteChangeTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Get page title from document or generate one based on path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    let pageTitle = document.title;
    
    // If no specific title set, generate one from the path
    if (pageTitle === 'OstheoApp - Gestion de cabinet') {
      if (pathSegments.length === 0) {
        pageTitle = 'Accueil | OstheoApp';
      } else {
        // Capitalize first letter of last path segment
        const pageName = pathSegments[pathSegments.length - 1];
        pageTitle = pageName.charAt(0).toUpperCase() + pageName.slice(1) + ' | OstheoApp';
      }
    }
  
    // Analytics supprimés: pas de tracking de page view
  }, [location]);
  
  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <RouteChangeTracker />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sync-consultations"
        element={
          <ProtectedRoute adminOnly>
            <SyncConsultations />
          </ProtectedRoute>
        }
      />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<UserLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>
      
      {/* Waitlist routes with centered layout */}
      <Route element={<WaitlistLayout />}>
        <Route path="/beta-waitlist" element={<BetaWaitlist />} />
      </Route>

      {/* Protected user routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/consultations" element={<Consultations />} />
        <Route path="/invoices" element={<Invoices />} />
        {/* Only allow actual invoice IDs, not 'new' */}
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/referral" element={<Referral />} />
      </Route>

      {/* Default route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;