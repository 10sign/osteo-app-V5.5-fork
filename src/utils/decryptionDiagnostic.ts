import { isEncrypted, decryptData } from './encryption'

/**
 * Diagnostic des problèmes de déchiffrement
 */
export class DecryptionDiagnostic {
  
  /**
   * Diagnostique un champ chiffré et propose des solutions
   */
  static diagnoseField(fieldName: string, fieldValue: any, userId: string): {
    isEncrypted: boolean;
    isUUIDEncrypted: boolean;
    decryptionAttempt: any;
    recommendation: string;
    canRecover: boolean;
  } {
    const result = {
      isEncrypted: false,
      isUUIDEncrypted: false,
      decryptionAttempt: null,
      recommendation: '',
      canRecover: false
    };

    if (!fieldValue || typeof fieldValue !== 'string') {
      result.recommendation = 'Champ vide ou non-string, pas de déchiffrement nécessaire';
      return result;
    }

    // Vérifier si c'est chiffré
    result.isEncrypted = isEncrypted(fieldValue);
    
    if (!result.isEncrypted) {
      result.recommendation = 'Champ non chiffré, affichage normal';
      return result;
    }

    // Vérifier si c'est un UUID chiffré
    const uuidPattern = /^[0-9a-f]{32}:/i;
    result.isUUIDEncrypted = uuidPattern.test(fieldValue);

    if (result.isUUIDEncrypted) {
      console.log(`🔍 Diagnostic UUID chiffré pour ${fieldName}:`, fieldValue.substring(0, 50) + '...');
    }

    // Tentative de déchiffrement
    try {
      result.decryptionAttempt = decryptData(fieldValue, userId);
      
      if (typeof result.decryptionAttempt === 'string' && 
          !result.decryptionAttempt.startsWith('[') && 
          !result.decryptionAttempt.includes('DECODING_FAILED') &&
          result.decryptionAttempt.length > 0) {
        result.recommendation = 'Déchiffrement réussi';
        result.canRecover = true;
      } else {
        result.recommendation = 'Déchiffrement échoué - données corrompues ou clé incorrecte';
        result.canRecover = false;
      }
    } catch (error) {
      result.decryptionAttempt = `[ERROR: ${error}]`;
      result.recommendation = 'Erreur de déchiffrement - données corrompues';
      result.canRecover = false;
    }

    return result;
  }

  /**
   * Diagnostique tous les champs d'une consultation
   */
  static diagnoseConsultation(consultationData: any, userId: string): {
    fieldDiagnostics: Record<string, any>;
    summary: {
      totalFields: number;
      encryptedFields: number;
      recoverableFields: number;
      corruptedFields: number;
    };
  } {
    const fieldDiagnostics: Record<string, any> = {};
    const sensitiveFields = [
      'notes', 'consultationReason', 'currentTreatment', 
      'medicalAntecedents', 'medicalHistory', 'osteopathicTreatment'
    ];

    let totalFields = 0;
    let encryptedFields = 0;
    let recoverableFields = 0;
    let corruptedFields = 0;

    sensitiveFields.forEach(field => {
      if (consultationData[field]) {
        totalFields++;
        const diagnostic = this.diagnoseField(field, consultationData[field], userId);
        fieldDiagnostics[field] = diagnostic;

        if (diagnostic.isEncrypted) {
          encryptedFields++;
        }
        if (diagnostic.canRecover) {
          recoverableFields++;
        } else if (diagnostic.isEncrypted) {
          corruptedFields++;
        }
      }
    });

    return {
      fieldDiagnostics,
      summary: {
        totalFields,
        encryptedFields,
        recoverableFields,
        corruptedFields
      }
    };
  }

  /**
   * Propose une stratégie de récupération
   */
  static proposeRecoveryStrategy(diagnostic: any, patientData: any): {
    strategy: string;
    actions: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const { summary } = diagnostic;
    
    if (summary.corruptedFields === 0) {
      return {
        strategy: 'Aucune récupération nécessaire',
        actions: ['Tous les champs sont déchiffrables normalement'],
        riskLevel: 'low'
      };
    }

    if (summary.corruptedFields <= 2 && patientData) {
      return {
        strategy: 'Récupération partielle avec données patient',
        actions: [
          'Utiliser les données du patient pour remplacer les champs corrompus',
          'Préserver les champs déchiffrables',
          'Marquer les champs récupérés pour audit'
        ],
        riskLevel: 'medium'
      };
    }

    return {
      strategy: 'Récupération d\'urgence',
      actions: [
        'Remplacer tous les champs corrompus par les données patient',
        'Créer une sauvegarde avant migration',
        'Documenter les pertes de données',
        'Notifier l\'administrateur'
      ],
      riskLevel: 'high'
    };
  }
}
