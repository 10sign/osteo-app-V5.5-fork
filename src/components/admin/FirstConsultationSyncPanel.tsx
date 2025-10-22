import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Info, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { auth } from '../../firebase/config';
import { syncFirstConsultationData, syncAllOsteopaths } from '../../scripts/syncFirstConsultationData';

interface SyncDetail {
  patientId: string;
  patientName: string;
  consultationId: string;
  fieldsUpdated: string[];
}

interface SingleResult {
  totalPatients: number;
  patientsWithConsultations: number;
  consultationsUpdated: number;
  errors: string[];
  details: SyncDetail[];
}

const FirstConsultationSyncPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [result, setResult] = useState<SingleResult | null>(null);
  const [allResults, setAllResults] = useState<Record<string, SingleResult> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour lancer la synchronisation');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);
    setAllResults(null);

    try {
      const migrationResult = await syncFirstConsultationData(auth.currentUser.uid);
      setResult(migrationResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSyncAll = async () => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour lancer la synchronisation');
      return;
    }

    setIsRunningAll(true);
    setError(null);
    setResult(null);
    setAllResults(null);

    try {
      const results = await syncAllOsteopaths();
      setAllResults(results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRunningAll(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-red-900">
            ⚠️ Synchronisation rétroactive avec écrasement complet
          </h3>
          <p className="mt-1 text-sm text-red-600 font-medium">
            ATTENTION : Cette action écrase TOUTES les données des consultations initiales
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={isRunning || isRunningAll}
            isLoading={isRunning}
            loadingText="Synchronisation..."
            leftIcon={<RefreshCw size={16} />}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Mon compte uniquement
          </Button>
          <Button
            onClick={handleSyncAll}
            disabled={isRunning || isRunningAll}
            isLoading={isRunningAll}
            loadingText="Synchronisation globale..."
            leftIcon={<Users size={16} />}
            className="bg-red-600 hover:bg-red-700"
          >
            TOUS les ostéopathes
          </Button>
        </div>
      </div>

      <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-start">
          <AlertCircle className="flex-shrink-0 mr-3 text-red-600" size={20} />
          <div className="text-sm text-red-900">
            <p className="font-bold mb-2">⚠️ ATTENTION - ÉCRASEMENT DES DONNÉES</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Cette action va ÉCRASER TOUTES les données des consultations initiales</strong></li>
              <li>Les données de la consultation initiale seront remplacées par celles du dossier patient</li>
              <li>Cette opération est <strong>IRRÉVERSIBLE</strong></li>
              <li>Toutes les modifications manuelles dans les consultations initiales seront perdues</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-4 mb-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-start">
          <Info className="flex-shrink-0 mr-3 text-blue-600" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">Comment fonctionne cette synchronisation ?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Identifie la consultation initiale de chaque patient (flag isInitialConsultation ou plus ancienne)</li>
              <li>Écrase TOUS les champs cliniques avec les données actuelles du dossier patient</li>
              <li>Synchronise : traitement, motif, antécédents, historique médical, traitement ostéopathique, symptômes</li>
              <li>Les données du dossier patient restent inchangées</li>
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

      {allResults && (
        <div className="space-y-4">
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-start">
              <CheckCircle className="flex-shrink-0 mr-3 text-green-600" size={20} />
              <div className="flex-1">
                <p className="font-medium text-green-900">Synchronisation globale terminée</p>
                <p className="mt-1 text-sm text-green-800">
                  {Object.keys(allResults).length} ostéopathes traités
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(allResults).map(([osteopathId, osteopathResult]) => (
              <div key={osteopathId} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Ostéopathe: {osteopathId}</h4>
                  {osteopathResult.errors.length > 0 ? (
                    <AlertCircle className="text-red-600" size={20} />
                  ) : (
                    <CheckCircle className="text-green-600" size={20} />
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>• {osteopathResult.totalPatients} patients traités</p>
                  <p>• {osteopathResult.patientsWithConsultations} patients avec consultations</p>
                  <p>• {osteopathResult.consultationsUpdated} consultations mises à jour</p>
                  {osteopathResult.errors.length > 0 && (
                    <p className="text-red-700">• {osteopathResult.errors.length} erreurs</p>
                  )}
                </div>
                {osteopathResult.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs font-medium text-red-900 mb-1">Erreurs:</p>
                    {osteopathResult.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-red-800">• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
