import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';

interface MarkResult {
  success: boolean;
  totalPatients: number;
  consultationsMarked: number;
  errors: string[];
  details: Array<{
    patientId: string;
    patientName: string;
    consultationId: string;
    consultationDate: string;
  }>;
}

export class MarkInitialConsultationService {
  /**
   * Marque toutes les premières consultations comme isInitialConsultation: true
   * Pour chaque patient, trouve la consultation la plus ancienne et y ajoute le flag
   */
  static async markAllInitialConsultations(osteopathId: string): Promise<MarkResult> {
    const result: MarkResult = {
      success: true,
      totalPatients: 0,
      consultationsMarked: 0,
      errors: [],
      details: []
    };

    try {
      console.log('🏁 DÉBUT: Marquage des premières consultations');
      console.log('👤 Ostéopathe:', osteopathId);

      // 1. Récupérer tous les patients de l'ostéopathe
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(patientsRef, where('osteopathId', '==', osteopathId));
      const patientsSnapshot = await getDocs(patientsQuery);

      result.totalPatients = patientsSnapshot.size;
      console.log(`📊 ${result.totalPatients} patient(s) trouvé(s)`);

      // 2. Pour chaque patient, trouver et marquer la première consultation
      for (const patientDoc of patientsSnapshot.docs) {
        try {
          const patientId = patientDoc.id;
          const patientData = patientDoc.data();
          const patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient sans nom';

          console.log(`\n👤 Traitement du patient: ${patientName} (${patientId})`);

          // Rechercher la première consultation (la plus ancienne) de ce patient
          const consultationsRef = collection(db, 'consultations');
          const consultationsQuery = query(
            consultationsRef,
            where('osteopathId', '==', osteopathId),
            where('patientId', '==', patientId),
            orderBy('date', 'asc'),
            limit(1)
          );

          const consultationsSnapshot = await getDocs(consultationsQuery);

          if (consultationsSnapshot.empty) {
            console.log('  ℹ️  Aucune consultation trouvée pour ce patient');
            continue;
          }

          const firstConsultationDoc = consultationsSnapshot.docs[0];
          const firstConsultationData = firstConsultationDoc.data();
          const consultationId = firstConsultationDoc.id;

          // Vérifier si le flag est déjà défini
          if (firstConsultationData.isInitialConsultation === true) {
            console.log(`  ✅ Consultation ${consultationId} déjà marquée comme initiale`);
            continue;
          }

          // Marquer la consultation comme initiale
          const consultationRef = doc(db, 'consultations', consultationId);
          await updateDoc(consultationRef, {
            isInitialConsultation: true,
            updatedAt: Timestamp.fromDate(new Date())
          });

          result.consultationsMarked++;

          const consultationDate = firstConsultationData.date?.toDate?.()
            ? firstConsultationData.date.toDate().toLocaleDateString('fr-FR')
            : 'Date inconnue';

          result.details.push({
            patientId,
            patientName,
            consultationId,
            consultationDate
          });

          console.log(`  ✅ Consultation ${consultationId} marquée comme initiale (date: ${consultationDate})`);

          // Journaliser dans les audit logs
          await AuditLogger.log(
            AuditEventType.DATA_MODIFICATION,
            `consultations/${consultationId}`,
            'mark_as_initial',
            SensitivityLevel.LOW,
            'success',
            {
              patientId,
              patientName,
              consultationDate
            }
          );

        } catch (error) {
          const errorMessage = `Patient ${patientDoc.id}: ${(error as Error).message}`;
          console.error(`  ❌ ${errorMessage}`);
          result.errors.push(errorMessage);
        }
      }

      console.log('\n✅ TERMINÉ: Marquage des premières consultations');
      console.log(`📊 Résumé:`);
      console.log(`   - Patients traités: ${result.totalPatients}`);
      console.log(`   - Consultations marquées: ${result.consultationsMarked}`);
      console.log(`   - Erreurs: ${result.errors.length}`);

    } catch (error) {
      console.error('❌ Erreur critique lors du marquage des consultations:', error);
      result.success = false;
      result.errors.push(`Erreur critique: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Marque toutes les premières consultations pour TOUS les ostéopathes
   */
  static async markAllInitialConsultationsForAllOsteopaths(): Promise<{
    success: boolean;
    totalOsteopaths: number;
    results: Record<string, MarkResult>;
  }> {
    const globalResult = {
      success: true,
      totalOsteopaths: 0,
      results: {} as Record<string, MarkResult>
    };

    try {
      console.log('🌍 DÉBUT: Marquage global pour tous les ostéopathes');

      // Récupérer tous les utilisateurs ostéopathes
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      console.log(`📊 ${usersSnapshot.size} utilisateurs trouvés, filtrage des ostéopathes...`);

      // Filtrer les rôles d'ostéopathes (plusieurs variations possibles)
      const osteopathDocs = usersSnapshot.docs.filter(doc => {
        const role = doc.data().role;
        return role && (
          role === 'Ostéopathe' ||
          role === 'osteopathe' ||
          role === 'OSTEOPATHE' ||
          role === 'osteo'
        );
      });

      globalResult.totalOsteopaths = osteopathDocs.length;
      console.log(`👥 ${globalResult.totalOsteopaths} ostéopathe(s) trouvé(s)`);

      if (globalResult.totalOsteopaths === 0) {
        console.warn('⚠️ Aucun ostéopathe trouvé dans la base de données');
        return globalResult;
      }

      // Traiter chaque ostéopathe
      for (const osteopathDoc of osteopathDocs) {
        const osteopathId = osteopathDoc.id;
        const osteopathData = osteopathDoc.data();
        const osteopathName = `${osteopathData.firstName || ''} ${osteopathData.lastName || ''}`.trim() || osteopathId;

        console.log(`\n👨‍⚕️ Traitement de l'ostéopathe: ${osteopathName} (${osteopathId})`);

        try {
          const result = await this.markAllInitialConsultations(osteopathId);
          globalResult.results[osteopathId] = result;

          if (!result.success) {
            globalResult.success = false;
          }

        } catch (error) {
          console.error(`❌ Erreur pour l'ostéopathe ${osteopathName}:`, error);
          globalResult.results[osteopathId] = {
            success: false,
            totalPatients: 0,
            consultationsMarked: 0,
            errors: [(error as Error).message],
            details: []
          };
          globalResult.success = false;
        }
      }

      console.log('\n🎉 TERMINÉ: Marquage global terminé');

      // Calculer les totaux
      const totalConsultationsMarked = Object.values(globalResult.results).reduce(
        (sum, result) => sum + result.consultationsMarked,
        0
      );
      const totalErrors = Object.values(globalResult.results).reduce(
        (sum, result) => sum + result.errors.length,
        0
      );

      console.log(`📊 Résumé global:`);
      console.log(`   - Ostéopathes traités: ${globalResult.totalOsteopaths}`);
      console.log(`   - Consultations marquées: ${totalConsultationsMarked}`);
      console.log(`   - Erreurs totales: ${totalErrors}`);

    } catch (error) {
      console.error('❌ Erreur critique lors du marquage global:', error);
      globalResult.success = false;
    }

    return globalResult;
  }
}
