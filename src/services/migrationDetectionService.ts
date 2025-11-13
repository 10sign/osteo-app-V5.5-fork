import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export interface MigrationStatus {
  needsMigration: boolean;
  totalPatients: number;
  totalConsultations: number;
  consultationsWithoutFlag: number;
  consultationsWithFlag: number;
  affectedPatients: string[];
  lastChecked: Date;
}

export class MigrationDetectionService {
  private static cachedStatus: MigrationStatus | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Vérifie si l'utilisateur actuel a des données nécessitant une migration
   */
  static async checkMigrationStatus(): Promise<MigrationStatus> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    // Retourner le cache si valide
    const now = Date.now();
    if (this.cachedStatus && now < this.cacheExpiry) {
      console.log('📦 Returning cached migration status');
      return this.cachedStatus;
    }

    console.log('🔍 Checking migration status for user:', auth.currentUser.uid);

    try {
      const userId = auth.currentUser.uid;

      // 1. Récupérer tous les patients de l'utilisateur
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(patientsRef, where('osteopathId', '==', userId));
      const patientsSnapshot = await getDocs(patientsQuery);
      const totalPatients = patientsSnapshot.size;

      console.log(`📊 Found ${totalPatients} patients`);

      if (totalPatients === 0) {
        const status: MigrationStatus = {
          needsMigration: false,
          totalPatients: 0,
          totalConsultations: 0,
          consultationsWithoutFlag: 0,
          consultationsWithFlag: 0,
          affectedPatients: [],
          lastChecked: new Date()
        };

        this.cachedStatus = status;
        this.cacheExpiry = now + this.CACHE_DURATION;
        return status;
      }

      // 2. Récupérer toutes les consultations de l'utilisateur
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('osteopathId', '==', userId)
      );
      const consultationsSnapshot = await getDocs(consultationsQuery);
      const totalConsultations = consultationsSnapshot.size;

      console.log(`📊 Found ${totalConsultations} consultations`);

      // 3. Analyser les consultations
      let consultationsWithoutFlag = 0;
      let consultationsWithFlag = 0;
      const affectedPatientIds = new Set<string>();

      consultationsSnapshot.forEach((doc) => {
        const data = doc.data();
        const hasFlag = data.isInitialConsultation !== undefined;

        if (hasFlag) {
          consultationsWithFlag++;
        } else {
          consultationsWithoutFlag++;
          if (data.patientId) {
            affectedPatientIds.add(data.patientId);
          }
        }
      });

      const needsMigration = consultationsWithoutFlag > 0;

      console.log(`📊 Migration status:`, {
        needsMigration,
        consultationsWithoutFlag,
        consultationsWithFlag,
        affectedPatients: affectedPatientIds.size
      });

      const status: MigrationStatus = {
        needsMigration,
        totalPatients,
        totalConsultations,
        consultationsWithoutFlag,
        consultationsWithFlag,
        affectedPatients: Array.from(affectedPatientIds),
        lastChecked: new Date()
      };

      // Mettre en cache le résultat
      this.cachedStatus = status;
      this.cacheExpiry = now + this.CACHE_DURATION;

      return status;

    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      throw error;
    }
  }

  /**
   * Force le rechargement du statut de migration (ignore le cache)
   */
  static async refreshMigrationStatus(): Promise<MigrationStatus> {
    this.cachedStatus = null;
    this.cacheExpiry = 0;
    return this.checkMigrationStatus();
  }

  /**
   * Invalide le cache (à appeler après une migration)
   */
  static invalidateCache(): void {
    this.cachedStatus = null;
    this.cacheExpiry = 0;
    console.log('🗑️ Migration status cache invalidated');
  }

  /**
   * Vérifie si un patient spécifique a des consultations non migrées
   */
  static async checkPatientMigrationStatus(patientId: string): Promise<{
    needsMigration: boolean;
    consultationsWithoutFlag: number;
    totalConsultations: number;
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const consultationsRef = collection(db, 'consultations');
      const consultationsQuery = query(
        consultationsRef,
        where('osteopathId', '==', auth.currentUser.uid),
        where('patientId', '==', patientId)
      );

      const consultationsSnapshot = await getDocs(consultationsQuery);
      const totalConsultations = consultationsSnapshot.size;

      let consultationsWithoutFlag = 0;

      consultationsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isInitialConsultation === undefined) {
          consultationsWithoutFlag++;
        }
      });

      return {
        needsMigration: consultationsWithoutFlag > 0,
        consultationsWithoutFlag,
        totalConsultations
      };

    } catch (error) {
      console.error('❌ Error checking patient migration status:', error);
      throw error;
    }
  }

  /**
   * Enregistre qu'une migration a été effectuée (pour historique)
   */
  static async recordMigration(result: {
    patientsProcessed: number;
    consultationsUpdated: number;
    consultationsMarkedAsInitial: number;
    consultationsMarkedAsNonInitial: number;
    errors: string[];
  }): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const migrationRecord = {
        userId: auth.currentUser.uid,
        timestamp: new Date().toISOString(),
        result,
        success: result.errors.length === 0
      };

      console.log('📝 Recording migration:', migrationRecord);

      // Invalider le cache après la migration
      this.invalidateCache();

      // Note: On pourrait stocker cet historique dans Firestore si nécessaire
      // Pour l'instant, on se contente de l'invalider le cache

    } catch (error) {
      console.error('❌ Error recording migration:', error);
      // Ne pas faire échouer la migration si l'enregistrement échoue
    }
  }
}
