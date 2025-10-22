import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { syncForOsteopathByEmail, syncInitialConsultationFlag } from '../../scripts/syncInitialConsultationFlag';
import { auth } from '../../firebase/config';

interface MigrationResult {
  patientsProcessed: number;
  consultationsUpdated: number;
  consultationsMarkedAsInitial: number;
  consultationsMarkedAsNonInitial: number;
  errors: string[];
}

const InitialConsultationFlagPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigrateCurrentUser = async () => {
    if (!auth.currentUser) {
      setError('Vous devez être connecté pour lancer la migration');
      return;
    }

    if (!confirm('⚠️ Voulez-vous vraiment lancer la migration pour l\'utilisateur actuel ?\n\nCette opération va :\n- Identifier la consultation initiale de chaque patient\n- Marquer cette consultation avec le flag isInitialConsultation = true\n- Marquer toutes les autres consultations avec isInitialConsultation = false\n\nCette opération est sûre et ne supprime aucune donnée.')) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Lancement de la migration pour l\'utilisateur actuel:', auth.currentUser.uid);
      const migrationResult = await syncInitialConsultationFlag(auth.currentUser.uid);
      setResult(migrationResult);

      if (migrationResult.errors.length === 0) {
        console.log('✅ Migration terminée avec succès');
      } else {
        console.warn('⚠️ Migration terminée avec des erreurs');
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('❌ Erreur lors de la migration:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  const handleMigrateByEmail = async () => {
    const email = prompt('Entrez l\'email de l\'ostéopathe pour lequel lancer la migration:');

    if (!email) {
      return;
    }

    if (!confirm(`⚠️ Voulez-vous vraiment lancer la migration pour ${email} ?\n\nCette opération va :\n- Identifier la consultation initiale de chaque patient de cet ostéopathe\n- Marquer cette consultation avec le flag isInitialConsultation = true\n- Marquer toutes les autres consultations avec isInitialConsultation = false\n\nCette opération est sûre et ne supprime aucune donnée.`)) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Lancement de la migration pour:', email);
      const migrationResult = await syncForOsteopathByEmail(email);
      setResult(migrationResult);

      if (migrationResult.errors.length === 0) {
        console.log('✅ Migration terminée avec succès');
      } else {
        console.warn('⚠️ Migration terminée avec des erreurs');
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('❌ Erreur lors de la migration:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow rounded-xl">
      <div className="flex items-center mb-4 space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Flag className="text-blue-600" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Migration des flags de consultation initiale</h3>
          <p className="text-sm text-gray-500">
            Marque automatiquement les consultations initiales pour chaque patient
          </p>
        </div>
      </div>

      <div className="p-4 mb-4 border-l-4 border-blue-500 bg-blue-50">
        <div className="flex items-start">
          <AlertCircle className="flex-shrink-0 mt-0.5 mr-3 text-blue-500" size={20} />
          <div>
            <h4 className="mb-2 font-medium text-blue-900">Comment fonctionne cette migration ?</h4>
            <ul className="space-y-1 text-sm text-blue-800 list-disc list-inside">
              <li>Pour chaque patient, identifie la consultation créée au même moment que le patient</li>
              <li>Si aucune correspondance exacte, prend la consultation avec la date la plus ancienne</li>
              <li>Marque cette consultation avec <code className="px-1 py-0.5 bg-blue-200 rounded">isInitialConsultation = true</code></li>
              <li>Marque toutes les autres consultations avec <code className="px-1 py-0.5 bg-blue-200 rounded">isInitialConsultation = false</code></li>
              <li><strong>Aucune donnée n'est supprimée ou modifiée</strong>, seul le flag est ajouté/mis à jour</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="primary"
          onClick={handleMigrateCurrentUser}
          disabled={isRunning}
          leftIcon={isRunning ? <RefreshCw className="animate-spin" size={16} /> : <Flag size={16} />}
        >
          {isRunning ? 'Migration en cours...' : 'Migrer mes données'}
        </Button>

        <Button
          variant="outline"
          onClick={handleMigrateByEmail}
          disabled={isRunning}
          leftIcon={<Flag size={16} />}
        >
          Migrer par email
        </Button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mt-4 border-l-4 border-red-500 bg-red-50"
        >
          <div className="flex items-start">
            <AlertCircle className="flex-shrink-0 mt-0.5 mr-3 text-red-500" size={20} />
            <div>
              <h4 className="font-medium text-red-900">Erreur lors de la migration</h4>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 mt-4 border-l-4 ${result.errors.length === 0 ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}
        >
          <div className="flex items-start">
            <CheckCircle className={`flex-shrink-0 mt-0.5 mr-3 ${result.errors.length === 0 ? 'text-green-500' : 'text-yellow-500'}`} size={20} />
            <div className="flex-1">
              <h4 className={`font-medium ${result.errors.length === 0 ? 'text-green-900' : 'text-yellow-900'}`}>
                Migration terminée
              </h4>
              <div className="mt-2 space-y-1 text-sm">
                <p className={result.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}>
                  <strong>Patients traités:</strong> {result.patientsProcessed}
                </p>
                <p className={result.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}>
                  <strong>Consultations mises à jour:</strong> {result.consultationsUpdated}
                </p>
                <p className={result.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}>
                  <strong>Consultations initiales:</strong> {result.consultationsMarkedAsInitial}
                </p>
                <p className={result.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}>
                  <strong>Consultations non-initiales:</strong> {result.consultationsMarkedAsNonInitial}
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-3">
                  <h5 className="mb-1 font-medium text-yellow-900">Erreurs rencontrées:</h5>
                  <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
                    {result.errors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default InitialConsultationFlagPanel;
