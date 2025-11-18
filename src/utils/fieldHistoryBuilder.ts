/**
 * Utilitaire pour construire l'historique d'un champ clinique
 * Analyse le dossier patient et toutes les consultations pour construire
 * une timeline complète des modifications d'un champ spécifique
 */

import { Patient, Consultation } from '../types';

interface FieldHistoryEntry {
  date: Date;
  value: string;
  source: 'consultation' | 'patient';
  consultationNumber?: number;
  isIdentical?: boolean;
  // Optionnel pour compatibilité avec certains tests qui enregistrent l'horodatage
  updatedAt?: Date;
}

type ClinicalField =
  | 'currentTreatment'
  | 'consultationReason'
  | 'medicalAntecedents'
  | 'medicalHistory'
  | 'osteopathicTreatment'
  | 'symptoms'
  | 'notes';

/**
 * Construit l'historique complet d'un champ clinique
 * @param fieldKey - Clé du champ à analyser
 * @param patient - Dossier patient
 * @param consultations - Liste de toutes les consultations (triées du plus récent au plus ancien)
 * @returns Liste des entrées d'historique triées du plus récent au plus ancien
 */
export function buildFieldHistory(
  fieldKey: ClinicalField,
  patient: Patient,
  consultations: Consultation[]
): FieldHistoryEntry[] {
  const history: FieldHistoryEntry[] = [];

  if (!consultations || consultations.length === 0) {
    const patientValue = extractFieldValue(fieldKey, patient, 'patient');
    if (patientValue !== null) {
      history.push({
        date: patient.updatedAt ? new Date(patient.updatedAt) : new Date(patient.createdAt),
        value: patientValue,
        source: 'patient'
      });
    }
    return history;
  }

  const sortedConsultations = [...consultations].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  sortedConsultations.forEach((consultation, index) => {
    const value = extractFieldValue(fieldKey, consultation, 'consultation');
    if (value !== null) {
      const consultationNumber = sortedConsultations.length - index;
      history.push({
        date: consultation.date instanceof Date ? consultation.date : new Date(consultation.date),
        value,
        source: 'consultation',
        consultationNumber
      });
    }
  });

  const patientValue = extractFieldValue(fieldKey, patient, 'patient');
  if (patientValue !== null) {
    history.push({
      date: patient.updatedAt ? new Date(patient.updatedAt) : new Date(patient.createdAt),
      value: patientValue,
      source: 'patient'
    });
  }

  history.sort((a, b) => b.date.getTime() - a.date.getTime());

  markIdenticalEntries(history);

  return history;
}

/**
 * Extrait la valeur d'un champ depuis un objet Patient ou Consultation
 */
function extractFieldValue(
  fieldKey: ClinicalField,
  data: Patient | Consultation,
  source: 'patient' | 'consultation'
): string | null {
  let value: string | string[] | undefined;

  switch (fieldKey) {
    case 'currentTreatment':
      value = data.currentTreatment;
      break;
    case 'consultationReason':
      value = data.consultationReason;
      break;
    case 'medicalAntecedents':
      value = data.medicalAntecedents;
      break;
    case 'medicalHistory':
      value = data.medicalHistory;
      break;
    case 'osteopathicTreatment':
      value = data.osteopathicTreatment;
      break;
    case 'symptoms':
      if (source === 'patient' && 'tags' in data) {
        value = data.tags;
      } else if (source === 'consultation' && 'symptoms' in data) {
        value = data.symptoms;
      }
      break;
    case 'notes':
      // Lecture harmonisée avec fallback pour anciennes clés
      // Canonique: `notes`; fallback: `patientNote`, `patient_notes`, `note_patient`, `patientNotes`, `notePatient`
      // Cela permet l'affichage correct même si des anciennes consultations utilisaient des clés différentes
      value = (data as any).notes ?? (data as any).patientNote ?? (data as any).patient_notes ?? (data as any).note_patient ?? (data as any).patientNotes ?? (data as any).notePatient;
      break;
    default:
      return null;
  }

  if (value === undefined || value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '';
  }

  return String(value);
}

/**
 * Marque les entrées identiques à la valeur précédente
 */
function markIdenticalEntries(history: FieldHistoryEntry[]): void {
  for (let i = 1; i < history.length; i++) {
    const current = history[i];
    const previous = history[i - 1];

    if (normalizeValue(current.value) === normalizeValue(previous.value)) {
      current.isIdentical = true;
    }
  }
}

/**
 * Normalise une valeur pour la comparaison
 */
function normalizeValue(value: string): string {
  return value?.trim().toLowerCase() || '';
}

/**
 * Vérifie si un champ a un historique significatif
 */
export function hasSignificantHistory(history: FieldHistoryEntry[]): boolean {
  if (!history || history.length <= 1) {
    return false;
  }

  const uniqueValues = new Set(
    history.map(entry => normalizeValue(entry.value)).filter(val => val !== '')
  );

  return uniqueValues.size > 1;
}

/**
 * Obtient la dernière valeur d'un champ depuis l'historique
 */
export function getLatestValue(history: FieldHistoryEntry[]): string {
  if (!history || history.length === 0) {
    return '';
  }
  return history[0].value || '';
}

/**
 * Compte le nombre de modifications d'un champ
 */
export function countModifications(history: FieldHistoryEntry[]): number {
  if (!history || history.length <= 1) {
    return 0;
  }

  let count = 0;
  for (let i = 1; i < history.length; i++) {
    if (!history[i].isIdentical) {
      count++;
    }
  }

  return count;
}
