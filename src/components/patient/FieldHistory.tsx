import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface FieldHistoryEntry {
  date: Date;
  value: string;
  source: 'consultation' | 'patient';
  consultationNumber?: number;
  isIdentical?: boolean;
  updatedAt?: string | Date;
}

interface FieldHistoryProps {
  fieldLabel: string;
  currentValue: string;
  history: FieldHistoryEntry[];
  emptyMessage?: string;
}

export const FieldHistory: React.FC<FieldHistoryProps> = ({
  fieldLabel,
  currentValue,
  history,
  emptyMessage = 'Aucune donnée disponible'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasHistory = history && history.length > 1;
  const displayValue = currentValue || emptyMessage;
  const isEmpty = !currentValue || currentValue.trim() === '';

  const formatDate = (date?: Date): string => {
    if (!date || isNaN(date.getTime())) {
      return 'Date invalide';
    }
    try {
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      return 'Date invalide';
    }
  };

  const getEntryDate = (entry: FieldHistoryEntry): Date | undefined => {
    if (entry.date) return entry.date;
    if (entry.updatedAt) {
      return typeof entry.updatedAt === 'string' ? new Date(entry.updatedAt) : entry.updatedAt;
    }
    return undefined;
  };

  const getSourceLabel = (source: 'consultation' | 'patient', consultationNumber?: number): string => {
    if (source === 'patient') {
      return 'Dossier patient';
    }
    if (consultationNumber !== undefined) {
      return `Consultation n°${consultationNumber}`;
    }
    return 'Consultation';
  };

  return (
    <div className="p-6 bg-white shadow rounded-xl">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-medium text-gray-900 mb-3">{fieldLabel}</h3>
        {hasHistory && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
            aria-label={isExpanded ? 'Masquer l\'historique' : 'Afficher l\'historique'}
          >
            <span className="font-medium">Historique</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      <div className={`text-gray-700 whitespace-pre-wrap break-words ${isEmpty ? 'italic text-gray-500' : 'font-medium'}`}>
        {displayValue}
      </div>

      {hasHistory && isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Évolution chronologique</h4>
          <div className="space-y-3">
            {history.map((entry, index) => {
              const isLatest = index === 0;
              const entryIsEmpty = !entry.value || entry.value.trim() === '';

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    isLatest
                      ? 'bg-primary-50 border-primary-200'
                      : entry.isIdentical
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${
                      isLatest ? 'text-primary-700' : 'text-gray-600'
                    }`}>
                      {getSourceLabel(entry.source, entry.consultationNumber)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(getEntryDate(entry))}
                    </span>
                  </div>
                  <div className={`text-sm whitespace-pre-wrap break-words ${
                    entryIsEmpty
                      ? 'italic text-gray-400'
                      : isLatest
                      ? 'text-gray-900 font-medium'
                      : entry.isIdentical
                      ? 'text-gray-500'
                      : 'text-gray-700'
                  }`}>
                    {entryIsEmpty ? emptyMessage : entry.value}
                  </div>
                  {entry.isIdentical && !isLatest && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      Identique à la valeur précédente
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldHistory;
