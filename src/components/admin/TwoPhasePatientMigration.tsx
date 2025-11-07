import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Info, ArrowRight, Database } from 'lucide-react';
import { Button } from '../ui/Button';
import { auth } from '../../firebase/config';
import { PatientDataMigrationService } from '../../services/patientDataMigrationService';
import { InitialConsultationSyncService } from '../../services/initialConsultationSyncService';

interface Phase1Result {
  success: boolean;
  totalPatients: number;
  patientsUpdated: number;
  errors: string[];
  details: Array<{
    patientId: string;
    patientName: string;
    fieldsUpdated: string[];
    source: 'consultation' | 'none';
  }>;
}

interface Phase2Result {
  success: boolean;
  patientsProcessed: number;
  consultationsUpdated: number;
  errors: string[];
  details: Array<{
    patientId: string;
    patientName: string;
    consultationId: string;
    fieldsUpdated: string[];
  }>;
}

const TwoPhasePatientMigration: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2>(0);
  const [isRunningPhase1, setIsRunningPhase1] = useState(false);
  const [isRunningPhase2, setIsRunningPhase2] = useState(false);
  const [phase1Result, setPhase1Result] = useState<Phase1Result | null>(null);
  const [phase2Result, setPhase2Result] = useState<Phase2Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePhase1 = async () => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour lancer la migration');
      return;
    }

    setIsRunningPhase1(true);
    setError(null);
    setPhase1Result(null);

    try {
      console.log('🚀 Phase 1: Migration des dossiers patients');
      const result = await PatientDataMigrationService.migrateAllPatients(auth.currentUser.uid);

      setPhase1Result(result);

      if (result.success) {
        setCurrentPhase(1);
        console.log('✅ Phase 1 terminée avec succès');
      } else {
        setError('La Phase 1 a rencontré des erreurs. Consultez les détails ci-dessous.');
      }
    } catch (err) {
      console.error('❌ Erreur Phase 1:', err);
      setError((err as Error).message);
    } finally {
      setIsRunningPhase1(false);
    }
  };

  const handlePhase2 = async () => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour lancer la synchronisation');
      return;
    }

    if (!phase1Result || !phase1Result.success) {
      setError('Vous devez d\'abord terminer la Phase 1 avec succès');
      return;
    }

    setIsRunningPhase2(true);
    setError(null);
    setPhase2Result(null);

    try {
      console.log('🚀 Phase 2: Synchronisation des consultations initiales');
      const result = await InitialConsultationSyncService.syncAllInitialConsultationsRetroactive(auth.currentUser.uid);

      setPhase2Result({
        success: result.success,
        patientsProcessed: result.patientsProcessed,
        consultationsUpdated: result.consultationsUpdated,
        errors: result.errors,
        details: result.details
      });

      if (result.success) {
        setCurrentPhase(2);
        console.log('✅ Phase 2 terminée avec succès');
      } else {
        setError('La Phase 2 a rencontré des erreurs. Consultez les détails ci-dessous.');
      }
    } catch (err) {
      console.error('❌ Erreur Phase 2:', err);
      setError((err as Error).message);
    } finally {
      setIsRunningPhase2(false);
    }
  };

  const resetMigration = () => {
    setCurrentPhase(0);
    setPhase1Result(null);
    setPhase2Result(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Migration des Anciens Dossiers Patients
          </h3>
          <p className="text-sm text-gray-600">
            Cette migration en deux phases va corriger vos anciens dossiers pour qu'ils bénéficient de la synchronisation automatique.
          </p>
        </div>

        <div className="p-4 mb-6 border border-amber-200 rounded-lg bg-amber-50">
          <div className="flex items-start">
            <AlertCircle className="flex-shrink-0 mr-3 text-amber-600" size={20} />
            <div className="text-sm text-amber-900">
              <p className="font-bold mb-2">Important</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Cette migration est nécessaire une seule fois pour vos anciens dossiers</li>
                <li>Les nouveaux dossiers créés après cette date fonctionnent déjà correctement</li>
                <li>Cette opération va modifier vos dossiers patients et consultations initiales</li>
                <li>Les deux phases doivent être exécutées dans l'ordre</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className={`relative p-4 border-2 rounded-lg transition-all ${
            currentPhase === 0 ? 'border-blue-400 bg-blue-50' :
            currentPhase >= 1 ? 'border-green-400 bg-green-50' :
            'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 mr-4 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentPhase >= 1 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
              }`}>
                {currentPhase >= 1 ? <CheckCircle size={20} /> : '1'}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Phase 1: Remplissage des Dossiers Patients
                </h4>
                <p className="text-sm text-gray-700 mb-3">
                  Extrait les données cliniques des consultations existantes et remplit les champs manquants dans les dossiers patients (motif, traitement, antécédents, etc.).
                </p>
                <Button
                  onClick={handlePhase1}
                  disabled={isRunningPhase1 || isRunningPhase2 || currentPhase >= 1}
                  isLoading={isRunningPhase1}
                  loadingText="Migration en cours..."
                  leftIcon={<Database size={16} />}
                  variant={currentPhase >= 1 ? 'outline' : 'primary'}
                  size="sm"
                >
                  {currentPhase >= 1 ? 'Phase 1 terminée' : 'Lancer Phase 1'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="text-gray-400" size={24} />
          </div>

          <div className={`relative p-4 border-2 rounded-lg transition-all ${
            currentPhase === 1 ? 'border-blue-400 bg-blue-50' :
            currentPhase >= 2 ? 'border-green-400 bg-green-50' :
            'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 mr-4 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentPhase >= 2 ? 'bg-green-500 text-white' :
                currentPhase === 1 ? 'bg-blue-500 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {currentPhase >= 2 ? <CheckCircle size={20} /> : '2'}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Phase 2: Synchronisation des Consultations Initiales
                </h4>
                <p className="text-sm text-gray-700 mb-3">
                  Copie les données des dossiers patients (maintenant complets) vers les consultations initiales pour activer la synchronisation automatique.
                </p>
                <Button
                  onClick={handlePhase2}
                  disabled={isRunningPhase1 || isRunningPhase2 || currentPhase !== 1}
                  isLoading={isRunningPhase2}
                  loadingText="Synchronisation en cours..."
                  leftIcon={<RefreshCw size={16} />}
                  variant={currentPhase >= 2 ? 'outline' : currentPhase === 1 ? 'primary' : 'outline'}
                  size="sm"
                >
                  {currentPhase >= 2 ? 'Phase 2 terminée' : currentPhase === 1 ? 'Lancer Phase 2' : 'Terminer Phase 1 d\'abord'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {currentPhase === 2 && (
          <div className="flex justify-center">
            <Button
              onClick={resetMigration}
              variant="outline"
              leftIcon={<RefreshCw size={16} />}
              size="sm"
            >
              Réinitialiser (nouvelle migration)
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start">
            <AlertCircle className="flex-shrink-0 mr-3 text-red-600" size={20} />
            <div>
              <p className="font-medium text-red-900">Erreur</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {phase1Result && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-start mb-4">
            <CheckCircle className="flex-shrink-0 mr-3 text-green-600" size={24} />
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Phase 1 Terminée: Dossiers Patients Migrés
              </h4>
              <div className="space-y-1 text-sm text-gray-700">
                <p>• {phase1Result.totalPatients} patients traités</p>
                <p>• {phase1Result.patientsUpdated} dossiers mis à jour</p>
                {phase1Result.errors.length > 0 && (
                  <p className="text-red-700">• {phase1Result.errors.length} erreurs</p>
                )}
              </div>
            </div>
          </div>

          {phase1Result.details.length > 0 && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h5 className="font-medium text-gray-900 mb-3">
                Détails des mises à jour ({phase1Result.details.length})
              </h5>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {phase1Result.details.map((detail, index) => (
                  <div
                    key={`${detail.patientId}-${index}`}
                    className="p-3 bg-white border border-gray-200 rounded text-sm"
                  >
                    <p className="font-medium text-gray-900">{detail.patientName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Source: {detail.source === 'consultation' ? 'Données extraites de la consultation' : 'Initialisé avec valeurs vides'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {detail.fieldsUpdated.map((field) => (
                        <span
                          key={field}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase1Result.errors.length > 0 && (
            <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
              <h5 className="font-medium text-red-900 mb-2">
                Erreurs ({phase1Result.errors.length})
              </h5>
              <div className="space-y-1 text-sm text-red-800 max-h-40 overflow-y-auto">
                {phase1Result.errors.map((err, index) => (
                  <p key={index}>• {err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {phase2Result && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-start mb-4">
            <CheckCircle className="flex-shrink-0 mr-3 text-green-600" size={24} />
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Phase 2 Terminée: Consultations Initiales Synchronisées
              </h4>
              <div className="space-y-1 text-sm text-gray-700">
                <p>• {phase2Result.patientsProcessed} patients traités</p>
                <p>• {phase2Result.consultationsUpdated} consultations mises à jour</p>
                {phase2Result.errors.length > 0 && (
                  <p className="text-red-700">• {phase2Result.errors.length} erreurs</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-start">
              <Info className="flex-shrink-0 mr-3 text-green-600" size={20} />
              <div className="text-sm text-green-900">
                <p className="font-bold mb-2">Migration Complète!</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Vos anciens dossiers patients ont maintenant tous les champs cliniques remplis</li>
                  <li>Les consultations initiales sont synchronisées avec les dossiers patients</li>
                  <li>La synchronisation automatique est maintenant active pour tous vos dossiers</li>
                  <li>Toute modification future d'un dossier patient se reflétera automatiquement dans sa consultation initiale</li>
                </ul>
              </div>
            </div>
          </div>

          {phase2Result.details.length > 0 && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h5 className="font-medium text-gray-900 mb-3">
                Détails des synchronisations ({phase2Result.details.length})
              </h5>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {phase2Result.details.map((detail, index) => (
                  <div
                    key={`${detail.consultationId}-${index}`}
                    className="p-3 bg-white border border-gray-200 rounded text-sm"
                  >
                    <p className="font-medium text-gray-900">{detail.patientName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Consultation: {detail.consultationId}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {detail.fieldsUpdated.map((field) => (
                        <span
                          key={field}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase2Result.errors.length > 0 && (
            <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
              <h5 className="font-medium text-red-900 mb-2">
                Erreurs ({phase2Result.errors.length})
              </h5>
              <div className="space-y-1 text-sm text-red-800 max-h-40 overflow-y-auto">
                {phase2Result.errors.map((err, index) => (
                  <p key={index}>• {err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TwoPhasePatientMigration;
