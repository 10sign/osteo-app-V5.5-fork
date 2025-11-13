import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Info, Play, Users, Flag } from 'lucide-react';
import { Button } from '../ui/Button';
import { auth } from '../../firebase/config';
import { MarkInitialConsultationService } from '../../services/markInitialConsultationService';

interface PanelResult {
  success: boolean;
  totalPatients: number;
  consultationsMarked: number;
  errors: string[];
  details: Array<{
    patientId: string;
    patientName: string;
    consultationId: string;
    consultationDate: string;
  }>;
}

const MarkInitialConsultationsPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [result, setResult] = useState<PanelResult | null>(null);
  const [globalResults, setGlobalResults] = useState<Record<string, PanelResult> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMarkMyConsultations = async () => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour lancer cette opération');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);
    setGlobalResults(null);

    try {
      console.log('🚀 Marquage des consultations pour mon compte...');
      const markResult = await MarkInitialConsultationService.markAllInitialConsultations(auth.currentUser.uid);
      setResult(markResult);

      if (!markResult.success) {
        setError('Des erreurs sont survenues pendant le marquage. Consultez les détails ci-dessous.');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleMarkAllOsteopaths = async () => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour lancer cette opération');
      return;
    }

    setIsRunningAll(true);
    setError(null);
    setResult(null);
    setGlobalResults(null);

    try {
      console.log('🚀 Marquage des consultations pour TOUS les ostéopathes...');
      const globalResult = await MarkInitialConsultationService.markAllInitialConsultationsForAllOsteopaths();

      setGlobalResults(globalResult.results);

      if (!globalResult.success) {
        setError('Des erreurs sont survenues pendant le marquage global. Consultez les détails ci-dessous.');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError((err as Error).message);
    } finally {
      setIsRunningAll(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Flag size={24} className="mr-3 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Marquage des Premières Consultations
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Marque automatiquement toutes les premières consultations avec le flag isInitialConsultation: true
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleMarkMyConsultations}
            disabled={isRunning || isRunningAll}
            isLoading={isRunning}
            loadingText="Marquage en cours..."
            leftIcon={<Play size={16} />}
            variant="primary"
          >
            Mon compte uniquement
          </Button>
          <Button
            onClick={handleMarkAllOsteopaths}
            disabled={isRunning || isRunningAll}
            isLoading={isRunningAll}
            loadingText="Marquage global..."
            leftIcon={<Users size={16} />}
            className="bg-green-600 hover:bg-green-700"
          >
            TOUS les ostéopathes
          </Button>
        </div>
      </div>

      {/* Explication */}
      <div className="p-4 mb-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-start">
          <Info className="flex-shrink-0 mr-3 text-blue-600" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">Comment ça fonctionne ?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Pour chaque patient, trouve la consultation la plus ancienne (par date)</li>
              <li>Marque cette consultation avec le flag isInitialConsultation: true</li>
              <li>Les consultations déjà marquées sont ignorées</li>
              <li>Ne modifie aucune autre donnée dans les consultations</li>
              <li>Rend les premières consultations en lecture seule automatiquement</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start">
            <AlertTriangle className="flex-shrink-0 mr-3 text-red-600" size={20} />
            <div>
              <p className="font-medium text-red-900">Erreur</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Résultat pour un seul ostéopathe */}
      {result && (
        <div className="space-y-4">
          <div className={`p-4 border rounded-lg ${result.success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
            <div className="flex items-start">
              <CheckCircle className={`flex-shrink-0 mr-3 ${result.success ? 'text-green-600' : 'text-yellow-600'}`} size={20} />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Marquage terminé</p>
                <div className="mt-2 space-y-1 text-sm text-gray-800">
                  <p>✅ {result.totalPatients} patient(s) traité(s)</p>
                  <p>🏁 {result.consultationsMarked} consultation(s) marquée(s) comme initiale</p>
                  {result.errors.length > 0 && (
                    <p className="text-red-700">⚠️ {result.errors.length} erreur(s) rencontrée(s)</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Détails */}
          {result.details.length > 0 && (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="mb-3 font-medium text-gray-900">
                Consultations marquées ({result.details.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.details.map((detail, index) => (
                  <div
                    key={`${detail.consultationId}-${index}`}
                    className="p-3 bg-white border border-gray-200 rounded text-sm"
                  >
                    <p className="font-medium text-gray-900">👤 {detail.patientName}</p>
                    <p className="text-gray-600 text-xs mt-1">📅 {detail.consultationDate}</p>
                    <p className="text-gray-500 text-xs">🔖 {detail.consultationId}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Erreurs */}
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

      {/* Résultats globaux pour tous les ostéopathes */}
      {globalResults && (
        <div className="space-y-4">
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-start">
              <CheckCircle className="flex-shrink-0 mr-3 text-green-600" size={20} />
              <div className="flex-1">
                <p className="font-medium text-green-900">Marquage global terminé</p>
                <p className="mt-1 text-sm text-green-800">
                  {Object.keys(globalResults).length} ostéopathe(s) traité(s)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(globalResults).map(([osteopathId, osteopathResult]) => (
              <div key={osteopathId} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">👨‍⚕️ Ostéopathe: {osteopathId}</h4>
                  {osteopathResult.errors.length > 0 ? (
                    <AlertTriangle className="text-yellow-600" size={20} />
                  ) : (
                    <CheckCircle className="text-green-600" size={20} />
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>• {osteopathResult.totalPatients} patient(s) traité(s)</p>
                  <p>• {osteopathResult.consultationsMarked} consultation(s) marquée(s)</p>
                  {osteopathResult.errors.length > 0 && (
                    <p className="text-red-700">• {osteopathResult.errors.length} erreur(s)</p>
                  )}
                </div>
                {osteopathResult.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs font-medium text-red-900 mb-1">Erreurs:</p>
                    {osteopathResult.errors.slice(0, 3).map((err, idx) => (
                      <p key={idx} className="text-xs text-red-800">• {err}</p>
                    ))}
                    {osteopathResult.errors.length > 3 && (
                      <p className="text-xs text-red-600 mt-1">
                        ... et {osteopathResult.errors.length - 3} autre(s) erreur(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkInitialConsultationsPanel;
