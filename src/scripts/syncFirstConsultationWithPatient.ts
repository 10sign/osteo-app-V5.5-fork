/**
 * Script de migration rétroactive : Synchroniser les premières consultations avec les données du patient
 *
 * Ce script écrase TOUTES les données des consultations initiales avec les données cliniques du dossier patient.
 *
 * ⚠️ ATTENTION : Ce script ÉCRASE SYSTÉMATIQUEMENT tous les champs cliniques,
 * même si la consultation initiale contient déjà des données.
 *
 * Objectif:
 * - Pour chaque patient, identifier sa consultation initiale (flag isInitialConsultation ou plus ancienne)
 * - ÉCRASER TOUS LES CHAMPS CLINIQUES avec les données du dossier patient
 * - Les données existantes dans la consultation initiale seront remplacées
 */

import { collection, getDocs, query, where, doc, updateDoc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { HDSCompliance } from '../utils/hdsCompliance';
import { InitialConsultationSyncService } from '../services/initialConsultationSyncService';

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  currentTreatment?: string;
  consultationReason?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  tags?: string[];
}

interface ConsultationData {
  id: string;
  patientId: string;
  date: any;
  currentTreatment?: string;
  consultationReason?: string;
  medicalAntecedents?: string;
  medicalHistory?: string;
  osteopathicTreatment?: string;
  symptoms?: string[];
}

/**
 * Trouve un ostéopathe par son email
 */
export async function findOsteopathByEmail(email: string): Promise<string | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      return null;
    }

    const userDoc = snapshot.docs[0];
    console.log(`✅ Utilisateur trouvé: ${userDoc.data().firstName} ${userDoc.data().lastName} (${userDoc.id})`);
    return userDoc.id;
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de l\'utilisateur:', error);
    return null;
  }
}

/**
 * Synchronise les premières consultations avec les données des patients
 * ⚠️ NOUVELLE VERSION : Utilise le service InitialConsultationSyncService pour un écrasement complet
 */
export async function syncFirstConsultationsWithPatients(osteopathId?: string): Promise<{
  success: boolean;
  patientsProcessed: number;
  consultationsUpdated: number;
  errors: string[];
}> {
  try {
    // Utiliser l'osteopathe connecté ou celui fourni
    const userId = osteopathId || auth.currentUser?.uid;

    if (!userId) {
      throw new Error('Aucun utilisateur authentifié');
    }

    console.log('🔄 ⚠️ SYNCHRONISATION RÉTROACTIVE AVEC ÉCRASEMENT COMPLET');
    console.log('📋 Ce script va ÉCRASER toutes les données des consultations initiales');
    console.log('👤 Ostéopathe:', userId);

    // Utiliser le service InitialConsultationSyncService qui gère l'écrasement complet
    const result = await InitialConsultationSyncService.syncAllInitialConsultationsRetroactive(userId);

    return {
      success: result.success,
      patientsProcessed: result.patientsProcessed,
      consultationsUpdated: result.consultationsUpdated,
      errors: result.errors
    };

  } catch (error) {
    console.error('❌ Erreur critique lors de la synchronisation:', error);
    return {
      success: false,
      patientsProcessed: 0,
      consultationsUpdated: 0,
      errors: [`Erreur critique: ${(error as Error).message}`]
    };
  }
}

// Fonction helper pour exécuter le script manuellement
export async function runSyncScript() {
  console.log('🚀 Lancement du script de synchronisation...');
  const result = await syncFirstConsultationsWithPatients();
  return result;
}

/**
 * Synchronise les consultations pour un ostéopathe spécifique identifié par email
 */
export async function syncForOsteopathByEmail(email: string) {
  console.log(`🔍 Recherche de l'ostéopathe: ${email}`);

  const osteopathId = await findOsteopathByEmail(email);

  if (!osteopathId) {
    return {
      success: false,
      patientsProcessed: 0,
      consultationsUpdated: 0,
      errors: [`Ostéopathe non trouvé: ${email}`]
    };
  }

  console.log(`\n🚀 Lancement de la synchronisation pour ${email}...\n`);
  const result = await syncFirstConsultationsWithPatients(osteopathId);
  return result;
}
