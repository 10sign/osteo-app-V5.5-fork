import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { getFirestore, initializeFirestore, enableMultiTabIndexedDbPersistence, setLogLevel, CACHE_SIZE_UNLIMITED, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { enableCryptoEngine, initializeEncryption } from "../utils/encryption";

const firebaseConfig = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY ?? ""),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

// Configuration HDS
const hdsConfig = {
  enabled: false, // Temporairement désactivé pour uniformiser le comportement
  encryptionLevel: 'AES-256-GCM',
  auditEnabled: true,
  auditRetentionDays: 1095, // 3 ans
  pseudonymizationEnabled: true,
  securityLevel: 'high',
  dataResidency: 'eu-west-3', // Paris (France)
  complianceVersion: 'HDS-2022-01'
};

// Initialisation de Firebase (anti-double init via getApps)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const isDev = import.meta.env.DEV;
// Important: interpret env flags as explicit strings, not Boolean(string)
// Boolean("false") === true, which caused accidental emulator/prod toggles
const useProduction = String(import.meta.env.VITE_FIREBASE_USE_PRODUCTION ?? "false") === "true";
const useEmulator = String(import.meta.env.VITE_FIREBASE_USE_EMULATOR ?? "false") === "true";
// Analytics totalement supprimés: aucune initialisation ni export

// Vérification masquée des variables d'environnement (présence/fallback)
(() => {
  const keys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_DATABASE_URL',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_ENCRYPTION_KEY',
  ];
  console.groupCollapsed('🔎 Env check (masked)');
  for (const k of keys) {
    const present = Boolean((import.meta.env as any)[k]);
    console.log(`${k}:`, present ? 'present' : 'missing → fallback');
  }
  console.groupEnd();
})();

// Journalisation en développement (réduit pour éviter le bruit des erreurs réseau Listen)
if (import.meta.env.DEV) {
  setLogLevel('error');
  console.log('🔥 Firebase logging set to error level in dev');
  console.log('🔒 HDS compliance mode:', hdsConfig.enabled ? 'ENABLED' : 'DISABLED');
}

// Initialisation des services
// Analytics supprimés: aucune initialisation

const auth = getAuth(app);

// Configure Firestore transport to avoid net::ERR_ABORTED on Listen/channel.
// In dev, force long polling unconditionally and disable auto-detection to keep a stable transport.
const forceLongPolling = import.meta.env.DEV ? true : (String(import.meta.env.VITE_FIRESTORE_FORCE_LONG_POLLING ?? "false") === "true");
const autoDetectLongPolling = import.meta.env.DEV ? false : (String(import.meta.env.VITE_FIRESTORE_AUTO_DETECT_LONG_POLLING ?? "false") === "true");

const db = (() => {
  try {
    const instance = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: forceLongPolling,
      experimentalAutoDetectLongPolling: autoDetectLongPolling,
    });
    if (import.meta.env.DEV) {
      console.log('🛰️ Firestore transport:', {
        experimentalForceLongPolling: forceLongPolling,
        experimentalAutoDetectLongPolling: autoDetectLongPolling,
      });
      if (forceLongPolling && !autoDetectLongPolling) {
        console.log('📡 Firestore dev mode with long polling enabled');
      }
    }
    return instance;
  } catch (err) {
    console.warn('⚠️ initializeFirestore failed, falling back to getFirestore:', err);
    return getFirestore(app);
  }
})();

// IMPORTANT: Enable multi-tab persistence right after Firestore initialization
// Use the supported API; options like "synchronizeTabs" are not part of the type
enableMultiTabIndexedDbPersistence(db)
  .catch((err: any) => {
    if (err?.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err?.code === 'unimplemented') {
      console.warn('⚠️ The current browser doesn\'t support persistence.');
    } else {
      console.warn('⚠️ Could not enable Firestore persistence:', err);
    }
  });

const storage = getStorage(app);
const functions = getFunctions(app, 'europe-west1'); // Région européenne pour conformité RGPD

// Configuration des émulateurs Firebase en développement
if (isDev && !useProduction && useEmulator) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectStorageEmulator(storage, 'localhost', 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log('🔧 Connected to Firebase emulators (Firestore/Auth/Storage/Functions)');
  } catch (error) {
    console.warn('⚠️ Could not connect to Firebase emulators:', error);
  }
}

// Configuration de l'émulateur Functions en développement
if (import.meta.env.DEV && !import.meta.env.VITE_FIREBASE_USE_PRODUCTION) {
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log('🔧 Connected to Functions emulator');
  } catch (error) {
    console.warn('⚠️ Could not connect to Functions emulator:', error);
  }
}

// Configuration de l'authentification renforcée
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("✅ Auth persistence configured");
    
    // Configuration MFA si HDS activé
    if (hdsConfig.enabled && hdsConfig.securityLevel === 'high') {
      console.log("🔐 MFA enforcement prepared for HDS compliance");
    }
  })
  .catch((error) => {
    console.error("❌ Error setting auth persistence:", error);
  });

// Configuration Firestore pour HDS
const firestoreSettings: any = {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
};

// Activation du chiffrement côté client si HDS activé
if (hdsConfig.enabled) {
  try {
    // Initialisation du moteur de chiffrement
    initializeEncryption();
    enableCryptoEngine(db);
    console.log("🔐 Client-side encryption initialized for HDS compliance");
    
    // Ajout des métadonnées de conformité
    firestoreSettings.hdsCompliance = {
      version: hdsConfig.complianceVersion,
      encryptionLevel: hdsConfig.encryptionLevel,
      dataResidency: hdsConfig.dataResidency
    };
  } catch (error) {
    console.error("❌ Failed to initialize encryption:", error);
  }
}

// Journalisation de l'initialisation
console.log("✅ Firebase initialized successfully");
console.log("🔑 Authentication service ready");
console.log("💾 Firestore service ready");
console.log("📦 Storage service ready");
console.log("⚡ Functions service ready");
console.log("📊 Analytics:", "REMOVED");
console.log("🏛️ HDS compliance mode:", hdsConfig.enabled ? "ENABLED" : "DISABLED");

export { app, auth, db, storage, functions, hdsConfig };