import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth, hdsConfig } from '../firebase/config';
import { encryptData, decryptData } from './encryption';

const SENSITIVE_FIELDS: Record<string, string[]> = {
  patients: [
    'firstName', 
    'lastName', 
    'dateOfBirth', 
    'socialSecurityNumber', 
    'email', 
    'phone', 
    'address', 
    'medicalHistory', 
    'allergies'
  ],
  consultations: [
    'reason',
    'consultationReason',
    'symptoms',
    'currentTreatment',
    'ongoingTherapies',
    'medicalHistory',
    'significantHistory',
    'treatment',
    'notes',
    'patientNote'
  ],
  invoices: [
    'patientName',
    'notes'
  ]
};

class HDSCompliance {
  private static instance: HDSCompliance;

  private constructor() {}

  static getInstance(): HDSCompliance {
    if (!HDSCompliance.instance) {
      HDSCompliance.instance = new HDSCompliance();
    }
    return HDSCompliance.instance;
  }

  isEnabled(): boolean {
    return hdsConfig?.enabled || false;
  }

  getSensitiveFields(collection: string): string[] {
    return SENSITIVE_FIELDS[collection] || [];
  }

  async prepareDataForStorage(data: any, collectionName: string): Promise<any> {
    if (!this.isEnabled()) {
      return data;
    }

    const sensitiveFields = this.getSensitiveFields(collectionName);
    const preparedData = { ...data };

    for (const field of sensitiveFields) {
      if (preparedData[field] && typeof preparedData[field] === 'string') {
        try {
          preparedData[field] = await encryptData(preparedData[field]);
        } catch (error) {
          console.error(`Failed to encrypt field ${field}:`, error);
        }
      }
    }

    return preparedData;
  }

  async decryptDataForDisplay(data: any, collectionName: string): Promise<any> {
    if (!this.isEnabled()) {
      return data;
    }

    const sensitiveFields = this.getSensitiveFields(collectionName);
    const decryptedData = { ...data };

    for (const field of sensitiveFields) {
      if (decryptedData[field] && typeof decryptedData[field] === 'string') {
        try {
          decryptedData[field] = await decryptData(decryptedData[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted data if decryption fails
        }
      }
    }

    return decryptedData;
  }

  async repairCorruptedData(collectionName: string, documentId: string): Promise<boolean> {
    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDocs(query(collection(db, collectionName), where('__name__', '==', documentId)));
      
      if (docSnap.empty) {
        return false;
      }

      const data = docSnap.docs[0].data();
      const repairedData = await this.decryptDataForDisplay(data, collectionName);
      const reEncryptedData = await this.prepareDataForStorage(repairedData, collectionName);

      await updateDoc(docRef, reEncryptedData);
      return true;
    } catch (error) {
      console.error('Failed to repair corrupted data:', error);
      return false;
    }
  }
}

export { SENSITIVE_FIELDS, HDSCompliance };

// Export singleton instance for direct use
export const hdsCompliance = HDSCompliance.getInstance();
export default hdsCompliance;