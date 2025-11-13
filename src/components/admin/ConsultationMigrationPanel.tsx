import React, { useState } from 'react';
import { Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConsultationMigrationService } from '../../services/consultationMigrationService';

interface MigrationResult {
  total: number;
  migrated: number;
  errors: string[];
}

const ConsultationMigrationPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const migrationResult = await ConsultationMigrationService.migrateAllConsultations();
      setResult(migrationResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Database size={24} className="text-primary-600 mr-3" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Migration des consultations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Ajoute les champs cliniques manquants aux consultations existantes
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Que fait cette migration ?
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ajoute les champs cliniques aux consultations existantes</li>
          <li>• Pré-remplit avec les données du patient si disponibles</li>
          <li>• N'affecte pas les données existantes</li>
          <li>• Peut être exécutée plusieurs fois sans problème</li>
        </ul>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/5 border border-error/20 rounded-lg flex items-start">
          <AlertCircle size={16} className="text-error mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-error text-sm">
            <p className="font-medium">Erreur lors de la migration</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <CheckCircle size={20} className="text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                Migration terminée avec succès
              </h4>
              <div className="text-sm text-green-800 space-y-1">
                <p>• Consultations trouvées : {result.total}</p>
                <p>• Consultations migrées : {result.migrated}</p>
                {result.errors.length > 0 && (
                  <p className="text-yellow-800 mt-2">
                    • Erreurs rencontrées : {result.errors.length}
                  </p>
                )}
              </div>
              {result.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm font-medium text-yellow-900 cursor-pointer">
                    Voir les erreurs
                  </summary>
                  <ul className="mt-2 text-sm text-yellow-800 space-y-1">
                    {result.errors.map((err, index) => (
                      <li key={index} className="pl-4">• {err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleMigration}
        disabled={isRunning}
        variant="primary"
        leftIcon={isRunning ? <Loader size={16} className="animate-spin" /> : <Database size={16} />}
      >
        {isRunning ? 'Migration en cours...' : 'Lancer la migration'}
      </Button>

      {isRunning && (
        <p className="mt-3 text-sm text-gray-600">
          La migration peut prendre quelques instants selon le nombre de consultations...
        </p>
      )}
    </div>
  );
};

export default ConsultationMigrationPanel;
