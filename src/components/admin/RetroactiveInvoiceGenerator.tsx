import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, CheckCircle, AlertTriangle, Play, Database } from 'lucide-react';
import { Button } from '../ui/Button';
import { RetroactiveInvoiceService } from '../../services/retroactiveInvoiceService';

interface RetroactiveInvoiceGeneratorProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

const RetroactiveInvoiceGenerator: React.FC<RetroactiveInvoiceGeneratorProps> = ({ 
  onClose, 
  onSuccess 
}) => {
  const [status, setStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'check' | 'confirm' | 'generate' | 'complete'>('check');

  // Vérifier le statut au chargement
  useEffect(() => {
    checkMissingInvoices();
  }, []);

  const checkMissingInvoices = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const statusData = await RetroactiveInvoiceService.checkMissingInvoicesStatus();
      setStatus(statusData);
      
      if (statusData.consultationsWithoutInvoices > 0) {
        setStep('confirm');
      } else {
        setStep('complete');
        setResults({
          consultationsProcessed: statusData.totalConsultations,
          invoicesCreated: 0,
          invoicesSkipped: statusData.consultationsWithInvoices,
          errors: []
        });
      }
    } catch (error) {
      console.error('Error checking missing invoices:', error);
      setError('Erreur lors de la vérification des factures manquantes');
    } finally {
      setIsChecking(false);
    }
  };

  const generateMissingInvoices = async () => {
    setIsGenerating(true);
    setError(null);
    setStep('generate');

    try {
      const generationResults = await RetroactiveInvoiceService.generateMissingInvoices();
      setResults(generationResults);
      setStep('complete');
      
      if (onSuccess && generationResults.invoicesCreated > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error generating missing invoices:', error);
      setError('Erreur lors de la génération des factures manquantes');
      setStep('confirm');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <FileText size={24} className="mr-2 text-primary-600" />
          Génération rétroactive de factures
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-2" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {step === 'check' && (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center">
              <RefreshCw className={`text-primary-500 mb-4 ${isChecking ? 'animate-spin' : ''}`} size={48} />
              <p className="text-gray-700 text-lg">
                {isChecking ? 'Vérification des consultations en cours...' : 'Démarrage de la vérification...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 'confirm' && status && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Analyse terminée</h3>
            <p className="text-sm text-blue-700">
              L'analyse a détecté des consultations sans factures associées.
            </p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">{status.totalConsultations}</div>
              <div className="text-sm text-gray-600">Consultations totales</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{status.consultationsWithInvoices}</div>
              <div className="text-sm text-gray-600">Avec factures</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{status.consultationsWithoutInvoices}</div>
              <div className="text-sm text-gray-600">Sans factures</div>
            </div>
          </div>

          {/* Détails des consultations sans factures */}
          {status.missingInvoicesDetails.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">
                  Consultations sans factures ({status.missingInvoicesDetails.length})
                </h4>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {status.missingInvoicesDetails.slice(0, 10).map((consultation, index) => (
                  <div key={index} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{consultation.patientName}</div>
                        <div className="text-sm text-gray-600">{consultation.reason}</div>
                      </div>
                      <div className="text-sm text-gray-500">{consultation.date}</div>
                    </div>
                  </div>
                ))}
                {status.missingInvoicesDetails.length > 10 && (
                  <div className="px-4 py-3 text-center text-sm text-gray-500">
                    ... et {status.missingInvoicesDetails.length - 10} autres consultations
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="text-yellow-500 mt-0.5 mr-3" size={20} />
              <div>
                <h4 className="font-medium text-yellow-800">Information importante</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Cette opération va créer automatiquement une facture pour chaque consultation qui n'en a pas.
                  Chaque facture sera générée avec un montant par défaut de <strong>55 €</strong> et un statut "brouillon".
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  Les factures pourront être modifiées individuellement après génération.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
            )}
            <Button
              variant="primary"
              onClick={generateMissingInvoices}
              leftIcon={<Play size={16} />}
              disabled={status.consultationsWithoutInvoices === 0}
            >
              Générer {status.consultationsWithoutInvoices} facture(s)
            </Button>
          </div>
        </div>
      )}

      {step === 'generate' && (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center">
              <Database className="text-primary-500 mb-4" size={48} />
              <div className="flex items-center">
                <RefreshCw className="animate-spin text-primary-500 mr-2" size={20} />
                <p className="text-gray-700 text-lg">Génération des factures en cours...</p>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Création des factures pour les consultations sans facturation
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 'complete' && results && (
        <div className="space-y-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="text-green-500 mt-0.5 mr-3" size={20} />
              <div>
                <h3 className="font-medium text-green-800">Génération terminée</h3>
                <p className="text-sm text-green-700 mt-1">
                  {results.invoicesCreated > 0 
                    ? `${results.invoicesCreated} facture(s) ont été créées avec succès.`
                    : 'Toutes les consultations ont déjà des factures associées.'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">{results.consultationsProcessed}</div>
              <div className="text-sm text-gray-600">Consultations traitées</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{results.invoicesCreated}</div>
              <div className="text-sm text-gray-600">Factures créées</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{results.invoicesSkipped}</div>
              <div className="text-sm text-gray-600">Factures existantes</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
              <div className="text-sm text-gray-600">Erreurs</div>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="border border-yellow-200 rounded-lg">
              <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
                <h4 className="font-medium text-yellow-800">Erreurs rencontrées</h4>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {results.errors.map((error: string, index: number) => (
                  <div key={index} className="px-4 py-2 border-b border-yellow-100 last:border-b-0">
                    <div className="text-sm text-yellow-700">{error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={checkMissingInvoices}
              leftIcon={<RefreshCw size={16} />}
            >
              Vérifier à nouveau
            </Button>
            {onClose && (
              <Button variant="primary" onClick={onClose}>
                Fermer
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RetroactiveInvoiceGenerator;