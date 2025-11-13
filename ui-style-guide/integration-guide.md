# Guide d'Intégration UI OsteoApp

Ce guide explique comment intégrer le style UI d'OsteoApp dans un nouvel outil de rendez-vous.

## 🚀 Installation Rapide

### 1. Configuration Tailwind CSS
Copiez le fichier `tailwind-config.js` dans votre projet et renommez-le `tailwind.config.js`.

### 2. Importation des Styles
```css
/* Dans votre fichier CSS principal */
@import './ui-style-guide/components.css';

/* Ou importez directement dans votre index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Puis ajoutez les composants personnalisés */
@layer components {
  /* Copiez le contenu de components.css ici */
}
```

### 3. Installation des Dépendances
```bash
npm install framer-motion lucide-react class-variance-authority clsx tailwind-merge
```

## 📦 Structure des Composants

### Organisation Recommandée
```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Alert.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Avatar.tsx
│   │   ├── Toast.tsx
│   │   ├── DropZone.tsx
│   │   ├── Table.tsx
│   │   ├── Tabs.tsx
│   │   └── Calendar.tsx
│   └── features/
│       ├── appointments/
│       ├── patients/
│       └── documents/
├── styles/
│   ├── globals.css
│   └── components.css
└── utils/
    └── cn.ts
```

### Utilitaire cn.ts
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## 🎨 Exemples d'Intégration

### Page de Rendez-vous
```jsx
import React, { useState } from 'react';
import { Calendar, Plus, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

const AppointmentsPage = () => {
  const [view, setView] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          Nouveau rendez-vous
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex space-x-4">
          <Input
            placeholder="Rechercher un patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={16} className="text-gray-400" />}
            className="flex-1"
          />
          <Button variant="outline" leftIcon={<Filter size={16} />}>
            Filtres
          </Button>
        </div>
      </Card>

      {/* Calendar View */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {['day', 'week', 'month'].map((viewType) => (
              <button
                key={viewType}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === viewType 
                    ? 'bg-white shadow text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setView(viewType)}
              >
                {viewType === 'day' ? 'Jour' : viewType === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          
          <h2 className="text-lg font-medium text-gray-900">
            Mars 2024
          </h2>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">Précédent</Button>
            <Button variant="outline" size="sm">Suivant</Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-gray-50 rounded-lg p-4 min-h-96">
          {/* Votre logique de calendrier ici */}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card size="sm">
          <div className="flex items-center">
            <Calendar size={20} className="text-primary-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">24</div>
              <div className="text-sm text-gray-500">Aujourd'hui</div>
            </div>
          </div>
        </Card>
        
        <Card size="sm">
          <div className="flex items-center">
            <Calendar size={20} className="text-secondary-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">156</div>
              <div className="text-sm text-gray-500">Cette semaine</div>
            </div>
          </div>
        </Card>
        
        <Card size="sm">
          <div className="flex items-center">
            <Calendar size={20} className="text-accent-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">89%</div>
              <div className="text-sm text-gray-500">Taux d'occupation</div>
            </div>
          </div>
        </Card>
        
        <Card size="sm">
          <div className="flex items-center">
            <Calendar size={20} className="text-gray-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">12</div>
              <div className="text-sm text-gray-500">Annulations</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentsPage;
```

### Formulaire de Rendez-vous
```jsx
import React from 'react';
import { User, Calendar, Clock, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import Modal from '../components/ui/Modal';

const AppointmentForm = ({ isOpen, onClose, onSubmit }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouveau rendez-vous"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={onSubmit}>
            Créer le rendez-vous
          </Button>
        </>
      }
    >
      <form className="space-y-6">
        {/* Sélection du patient */}
        <div>
          <label className="label">Patient *</label>
          <select className="input">
            <option value="">Sélectionner un patient</option>
            <option value="1">Jean Dupont</option>
            <option value="2">Marie Martin</option>
          </select>
        </div>

        {/* Date et heure */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Date *"
            required
          />
          <Input
            type="time"
            label="Heure *"
            required
          />
        </div>

        {/* Type de consultation */}
        <div>
          <label className="label">Type de consultation</label>
          <select className="input">
            <option value="standard">Consultation standard</option>
            <option value="first">Première consultation</option>
            <option value="emergency">Consultation urgence</option>
            <option value="child">Consultation enfant</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea 
            className="input resize-none" 
            rows={3}
            placeholder="Notes sur le rendez-vous..."
          />
        </div>
      </form>
    </Modal>
  );
};
```

## 🔧 Hooks Utiles

### Hook pour les Toasts
```typescript
import { useState } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
};
```

### Hook pour les Modales
```typescript
import { useState } from 'react';

export const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const toggleModal = () => setIsOpen(prev => !prev);

  return { isOpen, openModal, closeModal, toggleModal };
};
```

## 📱 Responsive Breakpoints

```css
/* Mobile First Approach */
.container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
    margin: 0 auto;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
    padding: 2rem;
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}
```

## ✅ Checklist d'Intégration

- [ ] Configuration Tailwind CSS avec les couleurs OsteoApp
- [ ] Import des composants UI de base
- [ ] Configuration des animations Framer Motion
- [ ] Import des icônes Lucide React
- [ ] Configuration des hooks utilitaires
- [ ] Test des composants sur mobile et desktop
- [ ] Vérification de l'accessibilité
- [ ] Test des états de chargement et d'erreur
- [ ] Validation des formulaires
- [ ] Test des interactions (hover, focus, active)

Ce guide vous donne tous les éléments nécessaires pour reproduire fidèlement l'UI d'OsteoApp dans votre nouvel outil de rendez-vous !