import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, RefreshCw, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';
import { MigrationDetectionService, MigrationStatus } from '../../services/migrationDetectionService';
import { syncInitialConsultationFlag } from '../../scripts/syncInitialConsultationFlag';
import { auth } from '../../firebase/config';

interface MigrationAlertBannerProps {
  onMigrationComplete?: () => void;
}

const MigrationAlertBanner: React.FC<MigrationAlertBannerProps> = ({ onMigrationComplete }) => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setIsLoading(true);
    try {
      const status = await MigrationDetectionService.checkMigrationStatus();
      setMigrationStatus(status);

      // Ne pas afficher la bannière si pas besoin de migration ou si déjà dismissée
      const dismissed = localStorage.getItem('migration_banner_dismissed');
      if (!status.needsMigration || dismissed === 'true') {
        setIsDismissed(true);
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!auth.currentUser || isMigrating) return;

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      console.log('🚀 Starting automatic migration...');
      const result = await syncInitialConsultationFlag(auth.currentUser.uid);

      setMigrationResult(result);

      // Enregistrer la migration
      await MigrationDetectionService.recordMigration(result);

      // Rafraîchir le statut
      const newStatus = await MigrationDetectionService.refreshMigrationStatus();
      setMigrationStatus(newStatus);

      if (result.errors.length === 0) {
        // Succès complet - cacher la bannière après 5 secondes
        setTimeout(() => {
          setIsDismissed(true);
          if (onMigrationComplete) {
            onMigrationComplete();
          }
        }, 5000);
      }

    } catch (error) {
      console.error('❌ Migration error:', error);
      setMigrationResult({
        patientsProcessed: 0,
        consultationsUpdated: 0,
        consultationsMarkedAsInitial: 0,
        consultationsMarkedAsNonInitial: 0,
        errors: [(error as Error).message]
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('migration_banner_dismissed', 'true');
  };

  const handleRefresh = async () => {
    await checkMigrationStatus();
    localStorage.removeItem('migration_banner_dismissed');
    setIsDismissed(false);
  };

  if (isLoading || !migrationStatus || isDismissed || !migrationStatus.needsMigration) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <div className={`rounded-lg border-l-4 shadow-md ${
          migrationResult?.errors?.length === 0
            ? 'border-green-500 bg-green-50'
            : 'border-yellow-500 bg-yellow-50'
        }`}>
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {migrationResult?.errors?.length === 0 ? (
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
                ) : (
                  <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${
                      migrationResult?.errors?.length === 0 ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      {migrationResult?.errors?.length === 0
                        ? '✅ Migration terminée avec succès !'
                        : '⚠️ Migration des données nécessaire'
                      }
                    </h3>
                  </div>

                  {!migrationResult ? (
                    <>
                      <p className="mt-1 text-sm text-yellow-800">
                        Nous avons détecté <strong>{migrationStatus.consultationsWithoutFlag} consultation(s)</strong> dans
                        votre base de données qui nécessitent une mise à jour pour bénéficier des nouvelles fonctionnalités.
                      </p>

                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          <strong>Patients concernés :</strong> {migrationStatus.affectedPatients.length} / {migrationStatus.totalPatients}
                        </p>
                        <p>
                          <strong>Consultations à mettre à jour :</strong> {migrationStatus.consultationsWithoutFlag} / {migrationStatus.totalConsultations}
                        </p>
                      </div>

                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="mt-2 flex items-center space-x-1 text-sm text-yellow-800 hover:text-yellow-900 font-medium"
                      >
                        {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <span>{showDetails ? 'Masquer les détails' : 'Voir les détails'}</span>
                      </button>

                      {showDetails && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 p-3 bg-yellow-100 rounded-md"
                        >
                          <h4 className="font-medium text-yellow-900 mb-2">Qu'est-ce qui va être fait ?</h4>
                          <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
                            <li>Identification automatique de la consultation initiale pour chaque patient</li>
                            <li>Marquage avec le flag <code className="px-1 py-0.5 bg-yellow-200 rounded">isInitialConsultation</code></li>
                            <li>Aucune donnée ne sera supprimée ou modifiée</li>
                            <li>Opération sûre et réversible</li>
                          </ul>
                        </motion.div>
                      )}

                      <div className="mt-4 flex items-center space-x-3">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleMigrate}
                          disabled={isMigrating}
                          leftIcon={isMigrating ? <RefreshCw className="animate-spin" size={16} /> : undefined}
                        >
                          {isMigrating ? 'Migration en cours...' : 'Lancer la migration'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefresh}
                          leftIcon={<RefreshCw size={16} />}
                        >
                          Actualiser
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2">
                      <div className="space-y-1 text-sm">
                        <p className={migrationResult.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}>
                          <strong>Patients traités :</strong> {migrationResult.patientsProcessed}
                        </p>
                        <p className={migrationResult.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}>
                          <strong>Consultations mises à jour :</strong> {migrationResult.consultationsUpdated}
                        </p>
                        <p className={migrationResult.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}>
                          <strong>Consultations initiales :</strong> {migrationResult.consultationsMarkedAsInitial}
                        </p>
                        <p className={migrationResult.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}>
                          <strong>Consultations non-initiales :</strong> {migrationResult.consultationsMarkedAsNonInitial}
                        </p>
                      </div>

                      {migrationResult.errors.length > 0 && (
                        <div className="mt-3">
                          <h5 className="mb-1 font-medium text-yellow-900">Erreurs rencontrées :</h5>
                          <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
                            {migrationResult.errors.map((err: string, index: number) => (
                              <li key={index}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {migrationResult.errors.length === 0 && (
                        <p className="mt-2 text-sm text-green-800">
                          🎉 Toutes vos données ont été migrées avec succès ! Cette bannière va se fermer automatiquement.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="ml-4 text-yellow-600 hover:text-yellow-800 transition-colors"
                title="Masquer cette bannière"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MigrationAlertBanner;
