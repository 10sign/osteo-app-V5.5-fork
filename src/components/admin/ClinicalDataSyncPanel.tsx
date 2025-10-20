import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { ClinicalDataSyncService } from '../../services/clinicalDataSyncService';
import { auth } from '../../firebase/config';

export default function ClinicalDataSyncPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number; message: string } | null>(null);

  const handleSync = async () => {
    if (!auth.currentUser) {
      setResult({
        success: false,
        count: 0,
        message: 'Vous devez être connecté pour effectuer cette opération'
      });
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const count = await ClinicalDataSyncService.syncAllPatientsRetroactively(auth.currentUser.uid);
      setResult({
        success: true,
        count,
        message: `Synchronisation terminée avec succès. ${count} patient(s) traité(s).`
      });
    } catch (error: any) {
      console.error('Erreur lors de la synchronisation:', error);
      setResult({
        success: false,
        count: 0,
        message: `Erreur: ${error.message || 'Erreur inconnue'}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        Synchronisation des données cliniques
      </h3>
      <p className="mb-4 text-sm text-gray-600">
        Cette opération synchronise automatiquement les données cliniques des dossiers patients vers leur première consultation.
        Elle ne modifie que les consultations qui n'ont pas encore de données cliniques renseignées.
      </p>

      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">Ce qui sera synchronisé :</h4>
        <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
          <li>Motif de consultation</li>
          <li>Traitement effectué</li>
          <li>Antécédents médicaux</li>
          <li>Historique médical général</li>
          <li>Traitement ostéopathique prescrit</li>
          <li>Symptômes / Syndromes</li>
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">Règles de sécurité :</h4>
        <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
          <li>Seules les premières consultations <strong>sans données cliniques</strong> seront modifiées</li>
          <li>Les consultations existantes avec des données ne seront <strong>jamais</strong> écrasées</li>
          <li>Aucune perte de données</li>
        </ul>
      </div>

      {result && (
        <div className={`mb-4 p-4 rounded-lg border ${
          result.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            {result.success ? (
              <CheckCircle className="mr-2 text-green-600" size={20} />
            ) : (
              <AlertCircle className="mr-2 text-red-600" size={20} />
            )}
            <div>
              <p className={`text-sm font-medium ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.message}
              </p>
              {result.success && result.count > 0 && (
                <p className="mt-1 text-xs text-green-700">
                  Les données des dossiers patients ont été copiées dans leur première consultation.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleSync}
        disabled={isRunning}
        loading={isRunning}
        leftIcon={<RefreshCw size={16} />}
        variant="primary"
      >
        {isRunning ? 'Synchronisation en cours...' : 'Lancer la synchronisation rétroactive'}
      </Button>

      {isRunning && (
        <p className="mt-2 text-xs text-gray-500">
          Cela peut prendre quelques secondes selon le nombre de patients...
        </p>
      )}
    </div>
  );
}
