import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Users,
  FileText,
  Clock,
  Info,
  Search,
  Wrench
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface SyncResult {
  success: boolean;
  patientsProcessed: number;
  consultationsUpdated: number;
  errors: string[];
}

const SyncConsultations: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('julie.boddaert@hotmail.fr');
  const [isRunning, setIsRunning] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [progress, setProgress] = useState<{
    currentPatient: string;
    patientsProcessed: number;
    total: number;
  } | null>(null);
  const [limitBeforeEleven, setLimitBeforeEleven] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    success: boolean;
    patientsChecked: number;
    divergentPatients: number;
    divergences: Array<{
      patientId: string;
      patientName: string;
      consultationId: string | null;
      fields: Array<{ field: string; patientValue: any; consultationValue: any }>;
    }>;
  } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleSync = async () => {
    setIsRunning(true);
    setResult(null);
    setShowConfirmation(false);

    try {
      console.log('🚀 Lancement de la synchronisation pour:', email);

      const { InitialConsultationSyncService } = await import('../../services/initialConsultationSyncService');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      // Trouver l'ostéopathe par email (normalisé)
      const normalizedEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', normalizedEmail));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error(`Aucun utilisateur trouvé avec l'email: ${normalizedEmail}`);
      }

      const osteopathId = snapshot.docs[0].id;
      console.log('✅ Ostéopathe trouvé:', osteopathId);

      let syncResult;
      if (limitBeforeEleven) {
        const now = new Date();
        const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0);
        syncResult = await InitialConsultationSyncService.syncAllInitialConsultationsBefore(osteopathId, cutoff);
      } else {
        syncResult = await InitialConsultationSyncService.syncAllInitialConsultationsRetroactive(osteopathId);
      }

      console.log('📊 Résultat de la synchronisation:', syncResult);
      setResult({
        success: syncResult.success,
        patientsProcessed: syncResult.patientsProcessed,
        consultationsUpdated: syncResult.consultationsUpdated,
        errors: syncResult.errors
      });
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      setResult({
        success: false,
        patientsProcessed: 0,
        consultationsUpdated: 0,
        errors: [(error as Error).message]
      });
    } finally {
      setIsRunning(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setShowConfirmation(false);
    setProgress(null);
    setCheckResult(null);
  };

  const resolveOsteopathIdByEmail = async (inputEmail: string): Promise<string> => {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../../firebase/config');
    const usersRef = collection(db, 'users');
    const normalizedEmail = inputEmail.trim().toLowerCase();
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      throw new Error(`Aucun utilisateur trouvé avec l'email: ${normalizedEmail}`);
    }
    return snapshot.docs[0].id;
  };

  const handleCheck = async () => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const osteopathId = await resolveOsteopathIdByEmail(email);
      const { InitialConsultationIntegrityService } = await import('../../services/initialConsultationIntegrityService');
      const res = await InitialConsultationIntegrityService.checkDivergencesForOsteopath(osteopathId);
      setCheckResult(res);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error);
      setCheckResult({ success: false, patientsChecked: 0, divergentPatients: 0, divergences: [] });
    } finally {
      setIsChecking(false);
    }
  };

  const handleAutoCorrect = async () => {
    setIsRunning(true);
    try {
      const osteopathId = await resolveOsteopathIdByEmail(email);
      const { InitialConsultationIntegrityService } = await import('../../services/initialConsultationIntegrityService');
      const res = await InitialConsultationIntegrityService.applyCorrectionsForOsteopath(osteopathId);
      // Refresh check after correction
      const check = await InitialConsultationIntegrityService.checkDivergencesForOsteopath(osteopathId);
      setCheckResult(check);
      setResult({ success: res.success, patientsProcessed: 0, consultationsUpdated: res.updatedConsultations, errors: res.errors });
    } catch (error) {
      console.error('❌ Erreur lors de la correction automatique:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const osteopathId = await resolveOsteopathIdByEmail(email);
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');
      const { HDSCompliance } = await import('../../utils/hdsCompliance');

      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('osteopathId', '==', osteopathId),
        where('isInitialConsultation', '==', true)
      );
      const snapshot = await getDocs(q);

      const backups: any[] = [];
      snapshot.forEach(docSnap => {
        const raw = docSnap.data();
        const decrypted = HDSCompliance.decryptDataForDisplay(raw, 'consultations', osteopathId);
        backups.push({
          id: docSnap.id,
          patientId: decrypted.patientId || raw.patientId,
          isInitialConsultation: decrypted.isInitialConsultation ?? raw.isInitialConsultation ?? true,
          date: decrypted.date || raw.date || null,
          data: decrypted
        });
      });

      const payload = {
        osteopathId,
        email: email.trim().toLowerCase(),
        count: backups.length,
        consultations: backups
      };

      const content = JSON.stringify(payload, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fname = `backup_consultations_initiales_${email.trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '_')}.json`;
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Erreur lors du backup JSON:', error);
      alert(`Erreur lors du backup: ${(error as Error).message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <img src="/Icon-logo-osteoapp-bleu.png" alt="OsteoApp Logo" width={32} height={32} className="mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Synchronisation des Consultations
                </h1>
                <p className="text-sm text-gray-500">
                  Synchronisez les premières consultations avec les données patients
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              leftIcon={<ArrowLeft size={16} />}
            >
              Retour
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Avertissement */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertTriangle size={24} className="text-amber-600 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Attention - Écrasement des données</h3>
              <p className="text-sm text-amber-800 mb-2">
                Cette synchronisation va <strong>ÉCRASER</strong> les données des premières consultations de l'ostéopathe sélectionné avec les données cliniques complètes du dossier patient.
              </p>
              <p className="text-sm text-amber-800">
                Les données existantes dans les premières consultations seront <strong>REMPLACÉES</strong> par celles du dossier patient (motif de consultation, antécédents, traitement, etc.).
              </p>
            </div>
          </div>
        </div>

        {!result && !isRunning && !showConfirmation && (
          <>
            {/* Étape 1: Informations */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="p-6 border-b">
                <div className="flex items-center">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Ce qui sera synchronisé</h2>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Pour chaque patient de l'ostéopathe, sa première consultation sera mise à jour avec:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0" />
                    Motif de consultation détaillé
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0" />
                    Traitement effectué
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0" />
                    Antécédents médicaux
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0" />
                    Historique médical
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0" />
                    Traitement ostéopathique
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0" />
                    Symptômes
                  </div>
                </div>
              </div>
            </div>

            {/* Étape 2: Sélection de l'ostéopathe */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="p-6 border-b">
                <div className="flex items-center">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Email de l'ostéopathe</h2>
                </div>
              </div>
              <div className="p-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="julie.boddaert@hotmail.fr"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  <Info size={14} className="inline mr-1" />
                  Entrez l'adresse email de l'ostéopathe dont vous souhaitez synchroniser les consultations
                </p>
                <div className="mt-4 flex items-center">
                  <input
                    id="limitBeforeEleven"
                    type="checkbox"
                    checked={limitBeforeEleven}
                    onChange={(e) => setLimitBeforeEleven(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="limitBeforeEleven" className="text-sm text-gray-700">
                    Limiter aux patients créés avant 11h aujourd'hui
                  </label>
                </div>
              </div>
            </div>

            {/* Étape 3: Lancement */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Lancer la synchronisation</h2>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Cliquez sur le bouton ci-dessous pour démarrer la synchronisation. L'opération peut prendre quelques minutes selon le nombre de patients.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowConfirmation(true)}
                  leftIcon={<RefreshCw size={16} />}
                  disabled={!email || !email.includes('@')}
                  fullWidth
                  size="lg"
                >
                  Lancer la synchronisation
                </Button>
              </div>
            </div>

            {/* Vérifications automatiques */}
            <div className="bg-white rounded-lg shadow-sm border mt-6">
              <div className="p-6 border-b">
                <div className="flex items-center">
                  <div className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    ✓
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Vérifications automatiques</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-600">
                  Détectez les écarts entre les consultations initiales et les dossiers patients, puis appliquez des corrections automatiques si nécessaire.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCheck}
                    leftIcon={<Search size={16} />}
                    disabled={!email || !email.includes('@') || isChecking}
                    isLoading={isChecking}
                  >
                    Lancer la vérification
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAutoCorrect}
                    leftIcon={<Wrench size={16} />}
                    disabled={!checkResult || isRunning}
                    isLoading={isRunning}
                  >
                    Corriger automatiquement
                  </Button>
                </div>

                {checkResult && (
                  <div className="mt-4">
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-start">
                        {(checkResult.divergentPatients > 0) ? (
                          <AlertTriangle className="text-amber-600 mr-3" size={20} />
                        ) : (
                          <CheckCircle className="text-green-600 mr-3" size={20} />
                        )}
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {checkResult.divergentPatients > 0
                              ? `${checkResult.divergentPatients} patient(s) présentent des écarts`
                              : 'Aucun écart détecté — tout est synchronisé'}
                          </p>
                          <p className="text-gray-700 mt-1">
                            Patients analysés: {checkResult.patientsChecked}
                          </p>
                        </div>
                      </div>

                      {checkResult.divergences.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-600 mb-2">Aperçu des divergences (top 10):</div>
                          <ul className="space-y-2">
                            {checkResult.divergences.slice(0, 10).map((d) => (
                              <li key={`${d.patientId}-${d.consultationId || 'none'}`} className="p-2 bg-white border rounded">
                                <div className="font-medium text-gray-900">{d.patientName || d.patientId}</div>
                                <div className="text-xs text-gray-600">Consultation: {d.consultationId || 'Aucune'}</div>
                                <div className="mt-1 text-xs text-gray-700">
                                  {d.fields.slice(0, 5).map(f => (
                                    <span key={f.field} className="inline-block mr-2">
                                      {f.field}
                                    </span>
                                  ))}
                                  {d.fields.length > 5 && <span className="text-gray-500">…</span>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Confirmation */}
        {showConfirmation && !isRunning && !result && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Confirmation</h2>
              <p className="text-gray-700 mb-2">
                Vous êtes sur le point de synchroniser les premières consultations pour :
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-900 font-semibold text-lg">{email}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 font-medium">
                  <AlertTriangle size={16} className="inline mr-1" />
                  Cette action va ÉCRASER les données existantes dans les premières consultations. Cette action est irréversible.
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  fullWidth
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSync}
                  fullWidth
                >
                  Confirmer et synchroniser
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Synchronisation en cours */}
        {isRunning && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-8">
              <div className="text-center">
                <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Synchronisation en cours...
                </h2>
                <p className="text-gray-600 mb-6">
                  Veuillez patienter pendant que nous synchronisons les consultations
                </p>

                {progress && (
                  <div className="max-w-md mx-auto">
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Patient en cours</span>
                        <span>{progress.patientsProcessed} / {progress.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(progress.patientsProcessed / progress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{progress.currentPatient}</p>
                  </div>
                )}

                <div className="mt-6 text-sm text-gray-500">
                  <Clock size={16} className="inline mr-1" />
                  Cette opération peut prendre quelques minutes
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Résultats */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              {result.success ? (
                <>
                  <div className="flex items-center justify-center mb-6">
                    <CheckCircle className="text-green-600" size={64} />
                  </div>
                  <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
                    Synchronisation terminée
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <Users size={32} className="mx-auto mb-2 text-blue-600" />
                      <div className="text-3xl font-bold text-blue-900">{result.patientsProcessed}</div>
                      <div className="text-sm text-blue-700">Patients traités</div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <FileText size={32} className="mx-auto mb-2 text-green-600" />
                      <div className="text-3xl font-bold text-green-900">{result.consultationsUpdated}</div>
                      <div className="text-sm text-green-700">Consultations mises à jour</div>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-amber-900 mb-2 flex items-center">
                        <AlertTriangle size={18} className="mr-2" />
                        Erreurs détectées ({result.errors.length})
                      </h3>
                      <ul className="text-sm text-amber-800 space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.map((error, index) => (
                          <li key={index} className="pl-4">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Prochaines étapes</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li className="flex items-start">
                        <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        Allez sur la page "Patients" pour vérifier les consultations
                      </li>
                      <li className="flex items-start">
                        <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        Cliquez sur un patient pour voir sa première consultation
                      </li>
                      <li className="flex items-start">
                        <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        Vérifiez que les champs sont maintenant remplis avec les données du dossier
                      </li>
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      fullWidth
                    >
                      Nouvelle synchronisation
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => navigate('/admin')}
                      fullWidth
                    >
                      Retour au tableau de bord
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-6">
                    <AlertTriangle className="text-red-600" size={64} />
                  </div>
                  <h2 className="text-2xl font-bold text-center text-red-900 mb-4">
                    Erreur lors de la synchronisation
                  </h2>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800 mb-2">
                      Une erreur s'est produite lors de la synchronisation. Veuillez vérifier les détails ci-dessous et réessayer.
                    </p>
                    {result.errors.length > 0 && (
                      <ul className="text-sm text-red-700 space-y-1 mt-3">
                        {result.errors.map((error, index) => (
                          <li key={index} className="pl-4">• {error}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      fullWidth
                    >
                      Réessayer
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => navigate('/admin')}
                      fullWidth
                    >
                      Retour au tableau de bord
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncConsultations;
