import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/animatedGradient.css'; // Importation des styles d'animation
import { initClarity } from './lib/clarityClient';
import { initMatomoTagManager } from './lib/matomoTagManager';
import { initGoogleAnalytics } from './lib/googleAnalytics';
import { initPersistenceSystem } from './utils/sessionPersistence';
import { runManualSync } from './scripts/manualSyncConsole';

// Rendre accessible globalement pour la console développeur
if (typeof window !== 'undefined') {
  (window as any).runManualSync = runManualSync;
  console.log('🔧 Script de synchronisation manuelle disponible. Utilisez: runManualSync("email@example.com")');
}

// Initialize Microsoft Clarity
initClarity();

// Initialize Matomo Tag Manager
initMatomoTagManager();

// Initialize Google Analytics
initGoogleAnalytics();

// Initialize persistence system
initPersistenceSystem();

// Initialize the root element
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Create and render the root
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);