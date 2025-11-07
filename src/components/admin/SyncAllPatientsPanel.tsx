import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { AppointmentService } from '../../services/appointmentService';

const SyncAllPatientsPanel: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    updated: number;
    errors: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔄 Starting sync of all patient appointments...');
      const syncResult = await AppointmentService.syncAllPatientAppointments();

      setResult(syncResult);
      console.log('✅ Sync completed:', syncResult);
    } catch (err) {
      console.error('❌ Sync failed:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Synchronisation des consultations à venir
            </h3>
            <p className="text-sm text-gray-500">
              Recalcule le champ "nextAppointment" pour tous les patients
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 mb-4 border border-blue-100 rounded-lg bg-blue-50">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="flex-shrink-0 mt-0.5 text-blue-600" size={18} />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Quand utiliser cette synchronisation ?</p>
            <ul className="ml-4 space-y-1 list-disc">
              <li>Après avoir supprimé d'anciennes consultations</li>
              <li>Pour nettoyer les références à des consultations supprimées</li>
              <li>Si l'onglet "Consultations à venir" affiche des consultations qui n'existent plus</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="flex-shrink-0 mt-0.5 text-red-600" size={18} />
            <div className="text-sm text-red-800">
              <p className="font-medium">Erreur</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="p-4 mb-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-start space-x-2">
            <CheckCircle className="flex-shrink-0 mt-0.5 text-green-600" size={18} />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-2">Synchronisation terminée</p>
              <div className="space-y-1">
                <p><span className="font-medium">Patients traités:</span> {result.processed}</p>
                <p><span className="font-medium">Patients mis à jour:</span> {result.updated}</p>
                {result.errors > 0 && (
                  <p className="text-red-700">
                    <span className="font-medium">Erreurs:</span> {result.errors}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        variant="primary"
        leftIcon={<RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />}
        onClick={handleSync}
        disabled={syncing}
        fullWidth
      >
        {syncing ? 'Synchronisation en cours...' : 'Synchroniser tous les patients'}
      </Button>
    </div>
  );
};

export default SyncAllPatientsPanel;
