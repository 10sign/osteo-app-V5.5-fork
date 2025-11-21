import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  Users,
  Calendar,
  FileText,
  ClipboardList,
  Trash2,
  Shield,
  Loader,
  Info
} from 'lucide-react';
import { Button } from '../ui/Button';
import { DataMigrationService } from '../../services/dataMigrationService';
import { auth } from '../../firebase/config';
const trackEvent = (..._args: any[]) => {};
const trackMatomoEvent = (..._args: any[]) => {};
const trackGAEvent = (..._args: any[]) => {};
import FirstConsultationSyncPanel from './FirstConsultationSyncPanel';

const DataMigrationDashboard: React.FC = () => {
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [migrationReport, setMigrationReport] = useState<any>(null);
  const [globalReport, setGlobalReport] = useState<any>(null);
  const [integrityReport, setIntegrityReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [globalReportLoading, setGlobalReportLoading] = useState(false);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cleanupStats, setCleanupStats] = useState<any>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showGlobalReport, setShowGlobalReport] = useState(true);
  const [, setStep] = useState<'report' | 'migrate' | 'verify' | 'repair' | 'complete'>('report');
  type LegacyMigrationStats = { patientsProcessed: number; updatedPatients: number; updatedConsultations: number; errors: number };
  const [legacyMigrationStats, setLegacyMigrationStats] = useState<LegacyMigrationStats | null>(null);
  const [legacyMigrationLoading, setLegacyMigrationLoading] = useState(false);
  const [globalLegacyMigrationStats, setGlobalLegacyMigrationStats] = useState<LegacyMigrationStats | null>(null);
  const [globalLegacyMigrationLoading, setGlobalLegacyMigrationLoading] = useState(false);

  // Charger le rapport initial
  useEffect(() => {
    loadGlobalMigrationReport();
  }, []);

  // Charger le rapport de migration global
  const loadGlobalMigrationReport = async () => {
    try {
      setGlobalReportLoading(true);
      setError(null);

      const report = await DataMigrationService.generateGlobalMigrationReport();
      setGlobalReport(report);

      trackEvent("global_migration_report_generated", {
        osteopaths_count: report.osteopaths.length,
        total_patients: report.totals.totalPatients
      });

      trackMatomoEvent('Data Migration', 'Global Report Generated');
      trackGAEvent('global_migration_report_generated');

    } catch (error) {
      console.error('Error generating global migration report:', error);
      setError('Erreur lors de la génération du rapport global de migration');

      trackEvent("global_migration_report_error", { error: (error as Error).message });
      trackMatomoEvent('Error', 'Global Migration Report', (error as Error).message);
      trackGAEvent('global_migration_report_error', { error_message: (error as Error).message });

    } finally {
      setGlobalReportLoading(false);
    }
  };

  const migrateLegacyPatientModelGlobal = async () => {
    try {
      setGlobalLegacyMigrationLoading(true);
      setError(null);
      setSuccess(null);
      const results = await DataMigrationService.migrateLegacyPatientModelGlobal();
      setGlobalLegacyMigrationStats(results);
      setSuccess('Migration legacy globale terminée avec succès');
      await loadGlobalMigrationReport();
    } catch (error) {
      console.error('Error migrating legacy patient model globally:', error);
      setError('Erreur lors de la migration legacy globale');
    } finally {
      setGlobalLegacyMigrationLoading(false);
    }
  };

  const migrateLegacyPatientModel = async () => {
    try {
      setLegacyMigrationLoading(true);
      setError(null);
      setSuccess(null);
      const results = await DataMigrationService.migrateLegacyPatientModelGlobal();
      setLegacyMigrationStats(results);
      setSuccess('Migration legacy terminée avec succès');
      await loadMigrationReport();
    } catch (error) {
      console.error('Error migrating legacy patient model:', error);
      setError('Erreur lors de la migration legacy');
    } finally {
      setLegacyMigrationLoading(false);
    }
  };

  // Charger le rapport de migration personnel
  const loadMigrationReport = async () => {
    try {
      setReportLoading(true);
      setError(null);

      const report = await DataMigrationService.generateMigrationReport();
      setMigrationReport(report);
      
      // Track report generation
      trackEvent("migration_report_generated", { 
        test_data_count: report.testPatients + report.testAppointments + 
                         report.testConsultations + report.testInvoices,
        real_data_count: report.realPatients + report.realAppointments + 
                         report.realConsultations + report.realInvoices
      });
      
      trackMatomoEvent('Data Migration', 'Report Generated');
      trackGAEvent('migration_report_generated');
      
    } catch (error) {
      console.error('Error generating migration report:', error);
      setError('Erreur lors de la génération du rapport de migration');
      
      // Track error
      trackEvent("migration_report_error", { error: (error as Error).message });
      trackMatomoEvent('Error', 'Migration Report', (error as Error).message);
      trackGAEvent('migration_report_error', { error_message: (error as Error).message });
      
    } finally {
      setReportLoading(false);
    }
  };

  // Vérifier l'intégrité des données
  const verifyDataIntegrity = async () => {
    try {
      setIntegrityLoading(true);
      setError(null);
      
      const integrity = await DataMigrationService.verifyDataIntegrity();
      setIntegrityReport(integrity);
      
      // Track integrity verification
      trackEvent("data_integrity_verified", integrity);
      trackMatomoEvent('Data Migration', 'Integrity Verified');
      trackGAEvent('data_integrity_verified', integrity);
      
      setStep('verify');
      
    } catch (error) {
      console.error('Error verifying data integrity:', error);
      setError('Erreur lors de la vérification de l\'intégrité des données');
      
      // Track error
      trackEvent("data_integrity_error", { error: (error as Error).message });
      trackMatomoEvent('Error', 'Data Integrity', (error as Error).message);
      trackGAEvent('data_integrity_error', { error_message: (error as Error).message });
      
    } finally {
      setIntegrityLoading(false);
    }
  };

  // Réparer les références brisées
  const repairBrokenReferences = async () => {
    try {
      setRepairLoading(true);
      setError(null);
      
      const repairResults = await DataMigrationService.repairBrokenReferences();
      
      // Track repair
      trackEvent("data_references_repaired", repairResults);
      trackMatomoEvent('Data Migration', 'References Repaired');
      trackGAEvent('data_references_repaired', repairResults);
      
      setSuccess(`Réparation terminée : ${repairResults.fixedAppointments + repairResults.fixedConsultations + repairResults.fixedInvoices} références réparées`);
      
      // Recharger le rapport d'intégrité
      await verifyDataIntegrity();
      
    } catch (error) {
      console.error('Error repairing broken references:', error);
      setError('Erreur lors de la réparation des références brisées');
      
      // Track error
      trackEvent("data_repair_error", { error: (error as Error).message });
      trackMatomoEvent('Error', 'Data Repair', (error as Error).message);
      trackGAEvent('data_repair_error', { error_message: (error as Error).message });
      
    } finally {
      setRepairLoading(false);
    }
  };

  // Migrer les données de test vers des données réelles
  const migrateTestData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const results = await DataMigrationService.migrateTestData();
      setMigrationStats(results);
      
      setSuccess('Migration terminée avec succès');
      setStep('migrate');
      
      // Recharger le rapport
      await loadMigrationReport();
      
    } catch (error) {
      console.error('Error migrating test data:', error);
      setError('Erreur lors de la migration des données de test');
    } finally {
      setLoading(false);
    }
  };

  // Nettoyer les données de test
  const cleanupTestData = async () => {
    try {
      setCleanupLoading(true);
      setError(null);
      
      // Remplace l'appel inexistant par un nettoyage des doublons
      const results = await DataMigrationService.cleanDuplicateConsultationsAndInvoices();
      setCleanupStats(results);
      
      setSuccess('Nettoyage terminé avec succès');
      setStep('complete');
      
      // Recharger le rapport
      await loadMigrationReport();
      
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      setError('Erreur lors du nettoyage des données de test');
    } finally {
      setCleanupLoading(false);
    }
  };

  // Exporter le rapport de migration
  const exportMigrationReport = () => {
    if (!migrationReport) return;
    
    const reportData = {
      migrationReport,
      integrityReport,
      migrationStats,
      cleanupStats,
      timestamp: new Date().toISOString(),
      generatedBy: auth.currentUser?.email || 'unknown'
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Track export
    trackEvent("migration_report_exported");
    trackMatomoEvent('Data Migration', 'Report Exported');
    trackGAEvent('migration_report_exported');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Database size={24} className="text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Migration des données</h2>
        </div>
        <div className="flex space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={showGlobalReport ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                if (!showGlobalReport) {
                  setShowGlobalReport(true);
                  loadGlobalMigrationReport();
                }
              }}
              leftIcon={<Users size={16} />}
            >
              Tous les ostéopathes
            </Button>
            <Button
              variant={!showGlobalReport ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                if (showGlobalReport) {
                  setShowGlobalReport(false);
                  loadMigrationReport();
                }
              }}
              leftIcon={<Users size={16} />}
            >
              Mon compte
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={showGlobalReport ? loadGlobalMigrationReport : loadMigrationReport}
            leftIcon={<RefreshCw size={16} className={(reportLoading || globalReportLoading) ? "animate-spin" : ""} />}
            disabled={reportLoading || globalReportLoading}
          >
            Actualiser
          </Button>
          <Button
            variant="outline"
            onClick={exportMigrationReport}
            leftIcon={<Download size={16} />}
            disabled={!migrationReport && !globalReport}
          >
            Exporter
          </Button>
        </div>
      </div>

      {/* Affichage des erreurs */}
      {error && (
        <div className="p-4 bg-error/5 border border-error/20 rounded-lg flex items-center">
          <AlertTriangle size={20} className="text-error mr-3" />
          <div>
            <h3 className="font-medium text-error">Erreur</h3>
            <p className="text-error/80">{error}</p>
          </div>
        </div>
      )}

      {globalLegacyMigrationStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Résultats de la migration legacy (globale)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Patients traités</div>
              <div className="text-xl font-bold text-primary-600">{globalLegacyMigrationStats.patientsProcessed}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Patients mis à jour</div>
              <div className="text-xl font-bold text-primary-600">{globalLegacyMigrationStats.updatedPatients}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Consultations ajustées</div>
              <div className="text-xl font-bold text-primary-600">{globalLegacyMigrationStats.updatedConsultations}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Erreurs</div>
              <div className="text-xl font-bold text-amber-600">{globalLegacyMigrationStats.errors}</div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={loadGlobalMigrationReport}
              leftIcon={<RefreshCw size={16} />}
            >
              Actualiser le rapport global
            </Button>
          </div>
        </div>
      )}

      {/* Affichage des succès */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle size={20} className="text-green-600 mr-3" />
          <div>
            <h3 className="font-medium text-green-800">Succès</h3>
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Rapport global de migration */}
      {showGlobalReport && globalReportLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Loader size={32} className="animate-spin mx-auto text-primary-500 mb-4" />
          <p className="text-gray-600">Génération du rapport global en cours...</p>
        </div>
      ) : showGlobalReport && globalReport ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Rapport global - Tous les ostéopathes</h3>

          <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-start">
              <Info size={20} className="flex-shrink-0 mr-3 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Vue d'ensemble globale</p>
                <p>Ce rapport affiche les données de tous les ostéopathes utilisant la plateforme ({globalReport.osteopaths?.length || 0} ostéopathes au total)</p>
              </div>
            </div>
          </div>

          {globalReport.osteopaths && globalReport.osteopaths.length === 0 && (
            <div className="p-4 mb-6 border border-yellow-200 rounded-lg bg-yellow-50">
              <div className="flex items-start">
                <AlertTriangle size={20} className="flex-shrink-0 mr-3 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium mb-1">Aucun ostéopathe trouvé</p>
                  <p>La requête Firestore n'a trouvé aucun utilisateur avec le rôle "osteopath".</p>
                  <p className="mt-2">Vérifiez que les utilisateurs ont bien un champ <code className="bg-yellow-100 px-1 py-0.5 rounded">role = "osteopath"</code> dans leur document.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Patients totaux</div>
              <div className="text-2xl font-bold text-gray-900">{globalReport.totals.totalPatients}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Consultations totales</div>
              <div className="text-2xl font-bold text-gray-900">{globalReport.totals.totalConsultations}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Rendez-vous totaux</div>
              <div className="text-2xl font-bold text-gray-900">{globalReport.totals.totalAppointments}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Factures totaux</div>
              <div className="text-2xl font-bold text-gray-900">{globalReport.totals.totalInvoices}</div>
            </div>
          </div>

          <h4 className="font-medium text-gray-800 mb-3">Détails par ostéopathe</h4>
          <div className="space-y-4">
            {globalReport.osteopaths.map((osteopath: any) => (
              <div key={osteopath.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-medium text-gray-900">{osteopath.name}</h5>
                    <p className="text-sm text-gray-600">{osteopath.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">ID</div>
                    <div className="text-xs text-gray-400 font-mono">{osteopath.id.substring(0, 8)}...</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs text-gray-500">Patients</div>
                    <div className="text-lg font-bold text-gray-900">{osteopath.totalPatients}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {osteopath.realPatients} réels / {osteopath.testPatients} test
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs text-gray-500">Consultations</div>
                    <div className="text-lg font-bold text-gray-900">{osteopath.totalConsultations}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {osteopath.realConsultations} réelles / {osteopath.testConsultations} test
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs text-gray-500">Rendez-vous</div>
                    <div className="text-lg font-bold text-gray-900">{osteopath.totalAppointments}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {osteopath.realAppointments} réels / {osteopath.testAppointments} test
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs text-gray-500">Factures</div>
                    <div className="text-lg font-bold text-gray-900">{osteopath.totalInvoices}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {osteopath.realInvoices} réelles / {osteopath.testInvoices} test
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-800 mb-2 flex items-center">
              <ArrowRight size={16} className="mr-2 text-primary-500" />
              Migration du modèle legacy des patients (tous les ostéopathes)
            </h5>
            <p className="text-sm text-gray-600 mb-4">
              Normalise les anciens dossiers patients pour tous les ostéopathes et initialise la consultation initiale si nécessaire.
            </p>
            <Button
              variant="primary"
              onClick={migrateLegacyPatientModelGlobal}
              isLoading={globalLegacyMigrationLoading}
              loadingText="Migration legacy globale en cours..."
              disabled={globalLegacyMigrationLoading}
            >
              Migrer les dossiers legacy (global)
            </Button>
          </div>
        </div>
      ) : null}

      {/* Rapport de migration personnel */}
      {!showGlobalReport && reportLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Loader size={32} className="animate-spin mx-auto text-primary-500 mb-4" />
          <p className="text-gray-600">Génération du rapport de migration en cours...</p>
        </div>
      ) : !showGlobalReport && migrationReport ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Rapport de migration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 flex items-center">
                <Users size={16} className="mr-2 text-primary-500" />
                Patients
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-xl font-bold">{migrationReport.totalPatients}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Données test</div>
                  <div className="text-xl font-bold text-amber-600">{migrationReport.testPatients}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Données réelles</div>
                  <div className="text-xl font-bold text-green-600">{migrationReport.realPatients}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Pourcentage réel</div>
                  <div className="text-xl font-bold">
                    {migrationReport.totalPatients > 0 
                      ? Math.round((migrationReport.realPatients / migrationReport.totalPatients) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 flex items-center">
                <Calendar size={16} className="mr-2 text-primary-500" />
                Rendez-vous
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-xl font-bold">{migrationReport.totalAppointments}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Données test</div>
                  <div className="text-xl font-bold text-amber-600">{migrationReport.testAppointments}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Données réelles</div>
                  <div className="text-xl font-bold text-green-600">{migrationReport.realAppointments}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Pourcentage réel</div>
                  <div className="text-xl font-bold">
                    {migrationReport.totalAppointments > 0 
                      ? Math.round((migrationReport.realAppointments / migrationReport.totalAppointments) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 flex items-center">
                <ClipboardList size={16} className="mr-2 text-primary-500" />
                Consultations
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-xl font-bold">{migrationReport.totalConsultations}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Données test</div>
                  <div className="text-xl font-bold text-amber-600">{migrationReport.testConsultations}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Données réelles</div>
                  <div className="text-xl font-bold text-green-600">{migrationReport.realConsultations}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Pourcentage réel</div>
                  <div className="text-xl font-bold">
                    {migrationReport.totalConsultations > 0 
                      ? Math.round((migrationReport.realConsultations / migrationReport.totalConsultations) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 flex items-center">
                <FileText size={16} className="mr-2 text-primary-500" />
                Factures
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-xl font-bold">{migrationReport.totalInvoices}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Données test</div>
                  <div className="text-xl font-bold text-amber-600">{migrationReport.testInvoices}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Données réelles</div>
                  <div className="text-xl font-bold text-green-600">{migrationReport.realInvoices}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Pourcentage réel</div>
                  <div className="text-xl font-bold">
                    {migrationReport.totalInvoices > 0 
                      ? Math.round((migrationReport.realInvoices / migrationReport.totalInvoices) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Références brisées */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-800 flex items-center">
                <Shield size={16} className="mr-2 text-primary-500" />
                Intégrité des références
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={verifyDataIntegrity}
                leftIcon={<RefreshCw size={14} className={integrityLoading ? "animate-spin" : ""} />}
                disabled={integrityLoading}
              >
                Vérifier l'intégrité
              </Button>
            </div>
            
            {integrityLoading ? (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Loader size={20} className="animate-spin mx-auto text-primary-500 mb-2" />
                <p className="text-sm text-gray-600">Vérification de l'intégrité des données en cours...</p>
              </div>
            ) : integrityReport ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500">Références brisées</div>
                    <div className={`text-xl font-bold ${integrityReport.brokenPatientReferences + 
                                                        integrityReport.brokenAppointmentReferences + 
                                                        integrityReport.brokenConsultationReferences + 
                                                        integrityReport.brokenInvoiceReferences > 0 
                                                        ? 'text-error' : 'text-green-600'}`}>
                      {integrityReport.brokenPatientReferences + 
                       integrityReport.brokenAppointmentReferences + 
                       integrityReport.brokenConsultationReferences + 
                       integrityReport.brokenInvoiceReferences}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500">Patients manquants</div>
                    <div className={`text-xl font-bold ${integrityReport.brokenPatientReferences > 0 ? 'text-error' : 'text-green-600'}`}>
                      {integrityReport.brokenPatientReferences}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500">Rendez-vous orphelins</div>
                    <div className={`text-xl font-bold ${integrityReport.brokenAppointmentReferences > 0 ? 'text-error' : 'text-green-600'}`}>
                      {integrityReport.brokenAppointmentReferences}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500">Factures orphelines</div>
                    <div className={`text-xl font-bold ${integrityReport.brokenInvoiceReferences > 0 ? 'text-error' : 'text-green-600'}`}>
                      {integrityReport.brokenInvoiceReferences}
                    </div>
                  </div>
                </div>
                
                {(integrityReport.brokenPatientReferences + 
                  integrityReport.brokenAppointmentReferences + 
                  integrityReport.brokenConsultationReferences + 
                  integrityReport.brokenInvoiceReferences > 0) && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={repairBrokenReferences}
                      leftIcon={<RefreshCw size={14} className={repairLoading ? "animate-spin" : ""} />}
                      disabled={repairLoading}
                    >
                      Réparer les références
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Cliquez sur "Vérifier l'intégrité" pour analyser les références entre les données</p>
              </div>
            )}
          </div>
          
          {/* Actions de migration */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800">Actions de migration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                  <ArrowRight size={16} className="mr-2 text-primary-500" />
                  Migration des données de test
                </h5>
                <p className="text-sm text-gray-600 mb-4">
                  Convertit toutes les données marquées comme "test" en données réelles de production.
                  Cette action conserve toutes les données mais change leur statut.
                </p>
                <Button
                  variant="primary"
                  onClick={migrateTestData}
                  isLoading={loading}
                  loadingText="Migration en cours..."
                  disabled={loading || migrationReport.testPatients + migrationReport.testAppointments + 
                           migrationReport.testConsultations + migrationReport.testInvoices === 0}
                  fullWidth
                >
                  Migrer les données de test
                </Button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                  <Trash2 size={16} className="mr-2 text-error" />
                  Suppression des données de test
                </h5>
                <p className="text-sm text-gray-600 mb-4">
                  Supprime définitivement toutes les données marquées comme "test".
                  Cette action est irréversible et ne conserve que les données réelles.
                </p>
                <Button
                  variant="outline"
                  onClick={cleanupTestData}
                  isLoading={cleanupLoading}
                  loadingText="Suppression en cours..."
                  disabled={cleanupLoading || migrationReport.testPatients + migrationReport.testAppointments + 
                           migrationReport.testConsultations + migrationReport.testInvoices === 0}
                  fullWidth
                  className="border-error text-error hover:bg-error/5"
                >
                  Supprimer les données de test
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                  <ArrowRight size={16} className="mr-2 text-primary-500" />
                  Migration du modèle legacy des patients
                </h5>
                <p className="text-sm text-gray-600 mb-4">
                  Normalise les anciens dossiers patients et initialise la consultation initiale si nécessaire.
                </p>
                <Button
                  variant="primary"
                  onClick={migrateLegacyPatientModel}
                  isLoading={legacyMigrationLoading}
                  loadingText="Migration legacy en cours..."
                  disabled={legacyMigrationLoading}
                  fullWidth
                >
                  Migrer les dossiers legacy
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : !showGlobalReport ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Database size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rapport disponible</h3>
          <p className="text-gray-600 mb-4">
            Cliquez sur "Actualiser" pour générer un rapport de migration.
          </p>
          <Button
            variant="primary"
            onClick={loadMigrationReport}
            leftIcon={<RefreshCw size={16} />}
          >
            Générer le rapport
          </Button>
        </div>
      ) : null}

      {/* Résultats de migration */}
      {migrationStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Résultats de la migration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Patients migrés</div>
              <div className="text-xl font-bold text-primary-600">{migrationStats.patientsUpdated}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Rendez-vous migrés</div>
              <div className="text-xl font-bold text-primary-600">{migrationStats.appointmentsUpdated}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Consultations migrées</div>
              <div className="text-xl font-bold text-primary-600">{migrationStats.consultationsUpdated}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Factures migrées</div>
              <div className="text-xl font-bold text-primary-600">{migrationStats.invoicesUpdated}</div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={verifyDataIntegrity}
              leftIcon={<RefreshCw size={16} />}
              disabled={integrityLoading}
            >
              Vérifier l'intégrité des données
            </Button>
          </div>
        </div>
      )}

      {legacyMigrationStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Résultats de la migration legacy (mon compte)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Patients traités</div>
              <div className="text-xl font-bold text-primary-600">{legacyMigrationStats.patientsProcessed}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Patients mis à jour</div>
              <div className="text-xl font-bold text-primary-600">{legacyMigrationStats.updatedPatients}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Consultations ajustées</div>
              <div className="text-xl font-bold text-primary-600">{legacyMigrationStats.updatedConsultations}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Erreurs</div>
              <div className="text-xl font-bold text-amber-600">{legacyMigrationStats.errors}</div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={loadMigrationReport}
              leftIcon={<RefreshCw size={16} />}
            >
              Actualiser le rapport
            </Button>
          </div>
        </div>
      )}

      {/* Résultats de nettoyage */}
      {cleanupStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Résultats du nettoyage</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Patients supprimés</div>
              <div className="text-xl font-bold text-green-600">{cleanupStats.patientsRemoved}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Rendez-vous supprimés</div>
              <div className="text-xl font-bold text-green-600">{cleanupStats.appointmentsRemoved}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Consultations supprimées</div>
              <div className="text-xl font-bold text-green-600">{cleanupStats.consultationsRemoved}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Factures supprimées</div>
              <div className="text-xl font-bold text-green-600">{cleanupStats.invoicesRemoved}</div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={loadMigrationReport}
              leftIcon={<RefreshCw size={16} />}
            >
              Actualiser le rapport
            </Button>
          </div>
        </div>
      )}

      {/* Panneau de synchronisation des premières consultations */}
      <FirstConsultationSyncPanel />
    </div>
  );
};

export default DataMigrationDashboard;