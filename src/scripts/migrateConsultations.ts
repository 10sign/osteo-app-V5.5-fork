/**
 * Script de migration pour corriger toutes les consultations existantes
 * 
 * Ce script :
 * 1. Identifie les consultations avec des UUIDs ou des champs manquants
 * 2. Remplace les UUIDs par les vraies valeurs du patient
 * 3. Remplit les champs manquants avec les données du patient
 * 4. Ne modifie PAS les consultations déjà correctement remplies
 * 
 * ⚠️ IMPORTANT : Ce script nécessite une authentification Firebase valide
 * 
 * Pour exécuter ce script :
 * 1. Ouvrez la console du navigateur dans l'application
 * 2. Copiez-collez tout le contenu de cette fonction
 * 3. Appelez : await runConsultationMigration()
 */

import { ConsultationMigrationService } from '../services/consultationMigrationService';

/**
 * Fonction principale de migration
 */
export async function runConsultationMigration() {
  console.log('🔄 Début de la migration des consultations...');
  console.log('⚠️ Cette opération peut prendre plusieurs minutes selon le nombre de consultations');
  
  try {
    const results = await ConsultationMigrationService.migrateAllConsultations();
    
    console.log('\n✅ Migration terminée avec succès !');
    console.log('📊 Résumé de la migration :');
    console.log(`   - Total de consultations analysées : ${results.total}`);
    console.log(`   - Consultations migrées : ${results.migrated}`);
    console.log(`   - Consultations déjà à jour : ${results.total - results.migrated - results.errors.length}`);
    console.log(`   - Erreurs rencontrées : ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Détails des erreurs :');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    return results;
  } catch (error) {
    console.error('❌ Erreur lors de la migration :', error);
    throw error;
  }
}

/**
 * Fonction pour migrer une seule consultation spécifique
 * @param consultationId - L'ID de la consultation à migrer
 */
export async function migrateOneConsultation(consultationId: string) {
  console.log(`🔄 Migration de la consultation ${consultationId}...`);
  
  try {
    const success = await ConsultationMigrationService.migrateConsultation(consultationId);
    
    if (success) {
      console.log(`✅ Consultation ${consultationId} migrée avec succès !`);
    }
    
    return success;
  } catch (error) {
    console.error(`❌ Erreur lors de la migration de la consultation ${consultationId} :`, error);
    throw error;
  }
}

/**
 * Fonction pour vérifier si une consultation a besoin de migration
 * @param consultationId - L'ID de la consultation à vérifier
 */
export async function checkConsultationNeedsMigration(consultationId: string) {
  console.log(`🔍 Vérification de la consultation ${consultationId}...`);
  
  try {
    const needsMigration = await ConsultationMigrationService.needsMigration(consultationId);
    
    if (needsMigration) {
      console.log(`⚠️ La consultation ${consultationId} nécessite une migration`);
    } else {
      console.log(`✅ La consultation ${consultationId} est déjà à jour`);
    }
    
    return needsMigration;
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification de la consultation ${consultationId} :`, error);
    throw error;
  }
}

// Export pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).runConsultationMigration = runConsultationMigration;
  (window as any).migrateOneConsultation = migrateOneConsultation;
  (window as any).checkConsultationNeedsMigration = checkConsultationNeedsMigration;
  
  console.log('🚀 Scripts de migration chargés !');
  console.log('📝 Fonctions disponibles :');
  console.log('   - runConsultationMigration() : Migrer toutes les consultations');
  console.log('   - migrateOneConsultation(consultationId) : Migrer une consultation spécifique');
  console.log('   - checkConsultationNeedsMigration(consultationId) : Vérifier si une consultation a besoin de migration');
}

