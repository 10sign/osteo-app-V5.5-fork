import React from 'react';
import { FileText, Stethoscope, Pill, AlertTriangle, Info, Plus, Upload, CreditCard as Edit, ArrowLeft, Eye, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Patient, Consultation, Invoice } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cleanDecryptedField } from '../../utils/dataCleaning';
import { DocumentMetadata } from '../../utils/documentStorage';

interface PatientOverviewProps {
  patient: Patient;
  consultations: Consultation[];
  invoices: Invoice[];
  onNewConsultation: () => void;
  onNewInvoice: () => void;
  onEditPatient: () => void;
  onNavigateToTab: (tab: string) => void;
  getConsultationStatusColor: (status: string) => string;
  getConsultationStatusText: (status: string) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  formatDate: (dateString: string) => string;
  formatDateTime: (date: Date) => string;
}

export const PatientOverview: React.FC<PatientOverviewProps> = ({
  patient,
  consultations,
  invoices,
  onNewConsultation,
  onNewInvoice,
  onEditPatient,
  onNavigateToTab,
  getConsultationStatusColor,
  getConsultationStatusText,
  getStatusColor,
  getStatusText,
  formatDate,
  formatDateTime,
}) => {
  const lastConsultation = consultations.length > 0 ? consultations[0] : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Résumé rapide des statistiques du patient */}
      <div className="p-6 bg-white shadow rounded-xl lg:col-span-2">
        <h3 className="mb-4 text-lg font-medium text-gray-900">Résumé du dossier</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-3 text-center rounded-lg bg-primary-50">
            <div className="text-2xl font-bold text-primary-600">{consultations.length}</div>
            <div className="text-sm text-gray-600">Consultations</div>
          </div>
          <div className="p-3 text-center rounded-lg bg-secondary-50">
            <div className="text-2xl font-bold text-secondary-600">{invoices.length}</div>
            <div className="text-sm text-gray-600">Factures</div>
          </div>
          <div className="p-3 text-center rounded-lg bg-accent-50">
            <div className="text-2xl font-bold text-accent-600">
              {invoices.filter(i => i.status === 'paid').length}
            </div>
            <div className="text-sm text-gray-600">Factures payées</div>
          </div>
          <div className="p-3 text-center rounded-lg bg-green-50">
            <div className="text-2xl font-bold text-green-600">
              {consultations.filter(c => c.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Consultations terminées</div>
          </div>
        </div>
      </div>

      {/* Section Données cliniques - LECTURE SEULE depuis dernière consultation */}

      {/* Motif de consultation (dernière consultation) */}
      <div className="p-6 bg-white shadow rounded-xl">
        <h3 className="flex items-center mb-4 text-lg font-medium text-gray-900">
          <FileText size={20} className="mr-2 text-gray-600" />
          Motif de consultation
        </h3>
        <p className="text-gray-700 whitespace-pre-wrap">
          {lastConsultation
            ? cleanDecryptedField(lastConsultation.reason, false, '—')
            : '—'}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          {lastConsultation
            ? `Dernière consultation: ${formatDateTime(lastConsultation.date)}`
            : 'Aucune consultation enregistrée'}
        </p>
      </div>

      {/* Traitement ostéopathique (dernière consultation) */}
      <div className="p-6 bg-white shadow rounded-xl">
        <h3 className="flex items-center mb-4 text-lg font-medium text-gray-900">
          <Stethoscope size={20} className="mr-2 text-gray-600" />
          Traitement ostéopathique
        </h3>
        <p className="text-gray-700 whitespace-pre-wrap">
          {lastConsultation
            ? cleanDecryptedField(lastConsultation.treatment, false, '—')
            : '—'}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          {lastConsultation
            ? `Dernière consultation: ${formatDateTime(lastConsultation.date)}`
            : 'Aucune consultation enregistrée'}
        </p>
      </div>

      {/* Notes / Traitement actuel (dernière consultation) */}
      {lastConsultation?.notes && cleanDecryptedField(lastConsultation.notes, false, '') !== '—' && cleanDecryptedField(lastConsultation.notes, false, '') !== '' && (
        <div className="p-6 bg-white shadow rounded-xl">
          <h3 className="flex items-center mb-4 text-lg font-medium text-gray-900">
            <Pill size={20} className="mr-2 text-gray-600" />
            Notes / Observations
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {cleanDecryptedField(lastConsultation.notes, false, '—')}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Dernière consultation: {formatDateTime(lastConsultation.date)}
          </p>
        </div>
      )}

      {/* Antécédents médicaux (patient) */}
      <div className="p-6 bg-white shadow rounded-xl">
        <h3 className="flex items-center mb-4 text-lg font-medium text-gray-900">
          <AlertTriangle size={20} className="mr-2 text-gray-600" />
          Antécédents médicaux
        </h3>
        <p className="text-gray-700 whitespace-pre-wrap">
          {patient.medicalHistory
            ? cleanDecryptedField(patient.medicalHistory, false, '—')
            : '—'}
        </p>
      </div>

      {/* Bloc unique Informations du dossier */}
      <div className="p-6 bg-white shadow rounded-xl">
        <h3 className="flex items-center mb-4 text-lg font-medium text-gray-900">
          <Info size={20} className="mr-2 text-gray-600" />
          Informations du dossier
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-gray-500">Dossier créé le</div>
            <div className="font-medium text-gray-900">
              {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Dernière modification</div>
            <div className="font-medium text-gray-900">
              {patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Statut du dossier</div>
            <div className="flex items-center">
              <div className="w-2 h-2 mr-2 bg-green-500 rounded-full"></div>
              <span className="font-medium text-green-700">Actif</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">ID du dossier</div>
            <div className="font-mono text-sm text-gray-600">{patient.id}</div>
          </div>
        </div>
      </div>

      {/* Actions rapides - CTA pour rediriger vers onglets éditables */}
      <div className="p-6 bg-white shadow rounded-xl">
        <h3 className="mb-4 text-lg font-medium text-gray-900">Actions rapides</h3>
        <p className="mb-4 text-sm text-gray-500">
          La vue d'ensemble est en lecture seule. Pour modifier le dossier, utilisez les boutons ci-dessous.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Plus size={16} />}
            onClick={onNewConsultation}
          >
            Nouvelle consultation
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<FileText size={16} />}
            onClick={onNewInvoice}
          >
            Nouvelle facture
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Upload size={16} />}
            onClick={() => onNavigateToTab('documents')}
          >
            Ajouter un document
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Edit size={16} />}
            onClick={onEditPatient}
          >
            Modifier les informations patient
          </Button>
        </div>
      </div>

      {/* Historique des dernières consultations (aperçu rapide) - LECTURE SEULE */}
      <div className="p-6 bg-white shadow rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Dernières consultations</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToTab('consultations')}
            rightIcon={<ArrowLeft className="rotate-180" size={14} />}
          >
            Voir tout
          </Button>
        </div>
        {consultations.length > 0 ? (
          <div className="space-y-3">
            {consultations.slice(0, 3).map((consultation) => (
              <div key={consultation.id} className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatDateTime(consultation.date)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConsultationStatusColor(consultation.status)}`}>
                    {getConsultationStatusText(consultation.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 truncate">
                  {cleanDecryptedField(consultation.reason, false, 'Consultation ostéopathique')}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{consultation.duration || 60} min</span>
                  <span className="text-xs font-medium text-gray-700">{consultation.price || 60} €</span>
                </div>
              </div>
            ))}
            {consultations.length > 3 && (
              <p className="text-sm text-center text-gray-500">
                +{consultations.length - 3} autres consultations
              </p>
            )}
          </div>
        ) : (
          <p className="py-4 italic text-center text-gray-500">Aucune consultation enregistrée</p>
        )}
      </div>

      {/* Historique des factures récentes - LECTURE SEULE */}
      <div className="p-6 bg-white shadow rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Factures récentes</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToTab('invoices')}
            rightIcon={<ArrowLeft className="rotate-180" size={14} />}
          >
            Voir tout
          </Button>
        </div>
        {invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.slice(0, 3).map((invoice) => (
              <div key={invoice.id} className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {invoice.number}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {formatDate(invoice.issueDate)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{invoice.total} €</span>
                </div>
              </div>
            ))}
            {invoices.length > 3 && (
              <p className="text-sm text-center text-gray-500">
                +{invoices.length - 3} autres factures
              </p>
            )}
          </div>
        ) : (
          <p className="py-4 italic text-center text-gray-500">Aucune facture créée</p>
        )}
      </div>

      {/* Historique des documents - LECTURE SEULE */}
      <div className="p-6 bg-white shadow rounded-xl lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Documents médicaux</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToTab('documents')}
            rightIcon={<ArrowLeft className="rotate-180" size={14} />}
          >
            Gérer les documents
          </Button>
        </div>
        {patient.documents && patient.documents.length > 0 ? (
          <div className="space-y-3">
            {patient.documents.slice(0, 5).map((document: DocumentMetadata, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {document.type?.startsWith('image/') ? (
                    <ImageIcon size={20} className="text-blue-500" />
                  ) : (
                    <FileText size={20} className="text-gray-500" />
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {document.originalName || document.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {document.category || 'Document'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(document.url, '_blank')}
                  leftIcon={<Eye size={14} />}
                >
                  Voir
                </Button>
              </div>
            ))}
            {patient.documents.length > 5 && (
              <p className="text-sm text-center text-gray-500">
                +{patient.documents.length - 5} autres documents
              </p>
            )}
          </div>
        ) : (
          <p className="py-4 italic text-center text-gray-500">Aucun document médical</p>
        )}
      </div>
    </div>
  );
};
