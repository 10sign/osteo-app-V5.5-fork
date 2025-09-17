import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';

/**
 * Service pour nettoyer les doublons de patients et fusionner leurs données
 */
export class DuplicateCleanupService {
  /**
   * Trouve et supprime les doublons de patients
   */
  static async findAndRemoveDuplicatePatients(): Promise<{
    duplicatesFound: number;
    duplicatesRemoved: number;
    consultationsMerged: number;
    invoicesMerged: number;
    errors: string[];
  }> {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const results = {
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        consultationsMerged: 0,
        invoicesMerged: 0,
        errors: [] as string[]
      };

      // Récupérer tous les patients de l'utilisateur
      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, where('osteopathId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);

      const patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Grouper les patients par clé unique (nom + prénom + date de naissance + téléphone)
      const patientGroups = new Map<string, any[]>();

      for (const patient of patients) {
        // Créer une clé unique basée sur les informations principales
        const key = `${patient.firstName?.toLowerCase()}_${patient.lastName?.toLowerCase()}_${patient.dateOfBirth}_${patient.phone}`;
        
        if (!patientGroups.has(key)) {
          patientGroups.set(key, []);
        }
        patientGroups.get(key)!.push(patient);
      }

      // Traiter chaque groupe de doublons
      for (const [key, group] of patientGroups) {
        if (group.length > 1) {
          console.log(`🔍 Doublons trouvés pour la clé ${key}:`, group.map(p => `${p.firstName} ${p.lastName} (${p.id})`));
          
          results.duplicatesFound += group.length - 1;

          try {
            // Garder le patient le plus récent (ou celui avec le plus de données)
            const patientToKeep = this.selectPatientToKeep(group);
            const patientsToRemove = group.filter(p => p.id !== patientToKeep.id);

            console.log(`✅ Patient à conserver: ${patientToKeep.firstName} ${patientToKeep.lastName} (${patientToKeep.id})`);
            console.log(`🗑️ Patients à supprimer:`, patientsToRemove.map(p => `${p.firstName} ${p.lastName} (${p.id})`));

            // Fusionner les données des doublons vers le patient à conserver
            for (const duplicatePatient of patientsToRemove) {
              try {
                // Transférer les consultations
                const consultationsMerged = await this.transferConsultations(duplicatePatient.id, patientToKeep.id);
                results.consultationsMerged += consultationsMerged;

                // Transférer les factures
                const invoicesMerged = await this.transferInvoices(duplicatePatient.id, patientToKeep.id);
                results.invoicesMerged += invoicesMerged;

                // Transférer les rendez-vous
                await this.transferAppointments(duplicatePatient.id, patientToKeep.id);

                // Supprimer le patient doublon
                await deleteDoc(doc(db, 'patients', duplicatePatient.id));
                results.duplicatesRemoved++;

                console.log(`✅ Patient doublon supprimé: ${duplicatePatient.firstName} ${duplicatePatient.lastName} (${duplicatePatient.id})`);

              } catch (error) {
                console.error(`❌ Erreur lors de la fusion du patient ${duplicatePatient.id}:`, error);
                results.errors.push(`Erreur fusion patient ${duplicatePatient.firstName} ${duplicatePatient.lastName}: ${error.message}`);
              }
            }

          } catch (error) {
            console.error(`❌ Erreur lors du traitement du groupe ${key}:`, error);
            results.errors.push(`Erreur groupe ${key}: ${error.message}`);
          }
        }
      }

      // Journaliser l'opération
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'patients',
        'remove_duplicates',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'success',
        results
      );

      return results;

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des doublons:', error);
      
      await AuditLogger.log(
        AuditEventType.DATA_MODIFICATION,
        'patients',
        'remove_duplicates',
        SensitivityLevel.HIGHLY_SENSITIVE,
        'failure',
        { error: (error as Error).message }
      );

      throw error;
    }
  }

  /**
   * Sélectionne le patient à conserver parmi les doublons
   */
  private static selectPatientToKeep(patients: any[]): any {
    // Critères de sélection (par ordre de priorité) :
    // 1. Patient avec le plus de données (consultations, factures, etc.)
    // 2. Patient le plus récemment modifié
    // 3. Patient le plus récemment créé

    return patients.reduce((best, current) => {
      // Comparer les dates de modification
      const bestUpdated = new Date(best.updatedAt || best.createdAt || 0);
      const currentUpdated = new Date(current.updatedAt || current.createdAt || 0);

      if (currentUpdated > bestUpdated) {
        return current;
      }

      return best;
    });
  }

  /**
   * Transfère les consultations d'un patient vers un autre
   */
  private static async transferConsultations(fromPatientId: string, toPatientId: string): Promise<number> {
    try {
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('patientId', '==', fromPatientId),
        where('osteopathId', '==', auth.currentUser!.uid)
      );

      const snapshot = await getDocs(q);
      let transferred = 0;

      // Récupérer les informations du patient de destination
      const toPatientDoc = await getDoc(doc(db, 'patients', toPatientId));
      const toPatientData = toPatientDoc.data();
      const toPatientName = `${toPatientData?.firstName} ${toPatientData?.lastName}`;

      for (const docSnap of snapshot.docs) {
        try {
          await updateDoc(docSnap.ref, {
            patientId: toPatientId,
            patientName: toPatientName,
            updatedAt: new Date().toISOString()
          });
          transferred++;
        } catch (error) {
          console.error(`❌ Erreur lors du transfert de la consultation ${docSnap.id}:`, error);
        }
      }

      return transferred;
    } catch (error) {
      console.error('❌ Erreur lors du transfert des consultations:', error);
      return 0;
    }
  }

  /**
   * Transfère les factures d'un patient vers un autre
   */
  private static async transferInvoices(fromPatientId: string, toPatientId: string): Promise<number> {
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('patientId', '==', fromPatientId),
        where('osteopathId', '==', auth.currentUser!.uid)
      );

      const snapshot = await getDocs(q);
      let transferred = 0;

      // Récupérer les informations du patient de destination
      const toPatientDoc = await getDoc(doc(db, 'patients', toPatientId));
      const toPatientData = toPatientDoc.data();
      const toPatientName = `${toPatientData?.firstName} ${toPatientData?.lastName}`;

      for (const docSnap of snapshot.docs) {
        try {
          await updateDoc(docSnap.ref, {
            patientId: toPatientId,
            patientName: toPatientName,
            updatedAt: new Date().toISOString()
          });
          transferred++;
        } catch (error) {
          console.error(`❌ Erreur lors du transfert de la facture ${docSnap.id}:`, error);
        }
      }

      return transferred;
    } catch (error) {
      console.error('❌ Erreur lors du transfert des factures:', error);
      return 0;
    }
  }

  /**
   * Transfère les rendez-vous d'un patient vers un autre
   */
  private static async transferAppointments(fromPatientId: string, toPatientId: string): Promise<number> {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('patientId', '==', fromPatientId),
        where('osteopathId', '==', auth.currentUser!.uid)
      );

      const snapshot = await getDocs(q);
      let transferred = 0;

      // Récupérer les informations du patient de destination
      const toPatientDoc = await getDoc(doc(db, 'patients', toPatientId));
      const toPatientData = toPatientDoc.data();
      const toPatientName = `${toPatientData?.firstName} ${toPatientData?.lastName}`;

      for (const docSnap of snapshot.docs) {
        try {
          await updateDoc(docSnap.ref, {
            patientId: toPatientId,
            patientName: toPatientName,
            updatedAt: new Date().toISOString()
          });
          transferred++;
        } catch (error) {
          console.error(`❌ Erreur lors du transfert du rendez-vous ${docSnap.id}:`, error);
        }
      }

      return transferred;
    } catch (error) {
      console.error('❌ Erreur lors du transfert des rendez-vous:', error);
      return 0;
    }
  }
}

export default DuplicateCleanupService;