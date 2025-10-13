import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { auth } from '../../firebase/config';
import { syncFirstConsultationData } from '../../scripts/syncFirstConsultationData';

interface SyncDetail {
  patientId: string;
  patientName: string;
  consultationId: string;
  fieldsUpdated: string[];
}

const FirstConsultationSyncPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    totalPatients: number;
    patientsWithConsultations: number;
    consultationsUpdated: number;
    errors: string[];
    details: SyncDetail[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour lancer la synchronisation');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const migrationResult = await syncFirstConsultationData(auth.currentUser.uid);
      setResult(migrationResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Synchronisation des premières consultations
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Copie les données du dossier patient dans leur première consultation
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={isRunning}
          isLoading={isRunning}
          loadingText="Synchronisation..."
          leftIcon={<RefreshCw size={16} />}
        >
          Lancer la synchronisation
        </Button>
      </div>

      <div className="p-4 mb-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-start">
          <Info className="flex-shrink-0 mr-3 text-blue-600" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">À quoi sert cette synchronisation ?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Vérifie que chaque première consultation contient les données du dossier patient</li>
              <li>Copie automatiquement les informations manquantes (nom, prénom, antécédents, etc.)</li>
              <li>Ne modifie que les premières consultations qui ont des données incomplètes</li>
              <li>Sécurisé : aucune donnée n'est supprimée, seulement ajoutée</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start">
            <AlertCircle className="flex-shrink-0 mr-3 text-red-600" size={20} />
            <div>
              <p className="font-medium text-red-900">Erreur</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-start">
              <CheckCircle className="flex-shrink-0 mr-3 text-green-600" size={20} />
              <div className="flex-1">
                <p className="font-medium text-green-900">Synchronisation terminée</p>
                <div className="mt-2 space-y-1 text-sm text-green-800">
                  <p>• {result.totalPatients} patients traités</p>
                  <p>• {result.patientsWithConsultations} patients avec consultations</p>
                  <p>• {result.consultationsUpdated} consultations mises à jour</p>
                  {result.errors.length > 0 && (
                    <p className="text-red-700">• {result.errors.length} erreurs rencontrées</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {result.details.length > 0 && (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="mb-3 font-medium text-gray-900">
                Détails des mises à jour ({result.details.length})
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {result.details.map((detail, index) => (
                  <div
                    key={`${detail.consultationId}-${index}`}
                    className="p-3 bg-white border border-gray-200 rounded"
                  >
                    <p className="font-medium text-gray-900">{detail.patientName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Patient: {detail.patientId}
                    </p>
                    <p className="text-xs text-gray-500">
                      Consultation: {detail.consultationId}
                    </p>
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Champs mis à jour:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h4 className="mb-3 font-medium text-red-900">
                Erreurs ({result.errors.length})
              </h4>
              <div className="space-y-1 text-sm text-red-800 max-h-48 overflow-y-auto">
                {result.errors.map((err, index) => (
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

export default FirstConsultationSyncPanel;
