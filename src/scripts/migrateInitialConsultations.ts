import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { InitialConsultationSyncService } from '../services/initialConsultationSyncService';
import { InitialConsultationIntegrityService } from '../services/initialConsultationIntegrityService';

export async function resolveOsteopathIdByEmail(email: string): Promise<string> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error(`Aucun utilisateur trouvé avec l'email: ${email}`);
  }
  return snapshot.docs[0].id;
}

export async function migrateInitialConsultationsByEmail(email: string, beforeEleven = true) {
  const osteopathId = await resolveOsteopathIdByEmail(email);
  let res;
  if (beforeEleven) {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0);
    res = await InitialConsultationSyncService.syncAllInitialConsultationsBefore(osteopathId, cutoff);
  } else {
    res = await InitialConsultationSyncService.syncAllInitialConsultationsRetroactive(osteopathId);
  }
  return res;
}

export async function verifyInitialConsultationsByEmail(email: string) {
  const osteopathId = await resolveOsteopathIdByEmail(email);
  return InitialConsultationIntegrityService.checkDivergencesForOsteopath(osteopathId);
}