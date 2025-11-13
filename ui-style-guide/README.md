# Guide de Style UI OsteoApp

Ce guide contient tous les éléments nécessaires pour reproduire exactement le même style graphique et UI dans un nouvel outil de rendez-vous.

## 🎨 Palette de Couleurs

### Couleurs Principales
```css
/* Apple Blue - Couleur primaire */
--primary-50: #E5F2FF;
--primary-100: #CCE5FF;
--primary-200: #99CAFF;
--primary-300: #66B0FF;
--primary-400: #3395FF;
--primary-500: #0A84FF; /* Couleur principale */
--primary-600: #0969C6;
--primary-700: #074F9E;
--primary-800: #053566;
--primary-900: #021A33;

/* Apple Green - Couleur secondaire */
--secondary-50: #E7F9F0;
--secondary-100: #CFF3E0;
--secondary-200: #9FE7C2;
--secondary-300: #6FDBA3;
--secondary-400: #3FCF85;
--secondary-500: #30D158; /* Vert Apple */
--secondary-600: #26A746;
--secondary-700: #1D7D35;
--secondary-800: #135423;
--secondary-900: #0A2A12;

/* Apple Orange - Couleur d'accent */
--accent-50: #FFF1E5;
--accent-100: #FFE3CC;
--accent-200: #FFC799;
--accent-300: #FFAB66;
--accent-400: #FF8F33;
--accent-500: #FF9500; /* Orange Apple */
--accent-600: #CC7600;
--accent-700: #995700;
--accent-800: #663A00;
--accent-900: #331D00;

/* Couleurs d'état */
--success: #30D158; /* Apple Green */
--warning: #FF9F0A; /* Apple Yellow */
--error: #FF453A;   /* Apple Red */

/* Nuances de gris */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
```

### Utilisation des Couleurs
- **Primary (Bleu)** : Actions principales, liens, éléments interactifs
- **Secondary (Vert)** : Confirmations, succès, éléments positifs
- **Accent (Orange)** : Alertes, notifications, éléments d'attention
- **Error (Rouge)** : Erreurs, suppressions, actions destructives
- **Warning (Jaune)** : Avertissements, actions à confirmer

## 📝 Typographie

### Police de Caractères
```css
font-family: -apple-system, BlinkMacSystemFont, 'system-ui', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
```

### Hiérarchie Typographique
```css
/* Titres */
h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; } /* 32px */
h2 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; } /* 24px */
h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; } /* 20px */
h4 { font-size: 1.125rem; font-weight: 500; line-height: 1.4; } /* 18px */

/* Corps de texte */
body { font-size: 1rem; line-height: 1.5; } /* 16px */
.text-sm { font-size: 0.875rem; line-height: 1.4; } /* 14px */
.text-xs { font-size: 0.75rem; line-height: 1.3; } /* 12px */

/* Poids de police */
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

## 🔘 Composants Boutons

### Classes CSS Boutons
```css
/* Bouton de base */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem; /* 8px */
  padding: 0.5rem 1rem; /* 8px 16px */
  font-size: 0.875rem; /* 14px */
  font-weight: 500;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;
  outline: none;
  text-decoration: none;
}

/* Variantes de boutons */
.btn-primary {
  background-color: #0A84FF;
  color: white;
}
.btn-primary:hover {
  background-color: #0969C6;
}

.btn-secondary {
  background-color: #F3F4F6;
  color: #374151;
}
.btn-secondary:hover {
  background-color: #E5E7EB;
}

.btn-outline {
  background-color: transparent;
  color: #374151;
  border: 1px solid #D1D5DB;
}
.btn-outline:hover {
  background-color: #F3F4F6;
}

.btn-danger {
  background-color: #FF453A;
  color: white;
}
.btn-danger:hover {
  background-color: #E53E3E;
}

.btn-ghost {
  background-color: transparent;
  color: #6B7280;
}
.btn-ghost:hover {
  background-color: #F3F4F6;
}

/* Tailles */
.btn-sm {
  height: 2rem; /* 32px */
  padding: 0.25rem 0.75rem; /* 4px 12px */
  font-size: 0.75rem; /* 12px */
}

.btn-md {
  height: 2.5rem; /* 40px */
  padding: 0.5rem 1rem; /* 8px 16px */
  font-size: 0.875rem; /* 14px */
}

.btn-lg {
  height: 3rem; /* 48px */
  padding: 0.75rem 1.5rem; /* 12px 24px */
  font-size: 1rem; /* 16px */
}

/* États */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-loading {
  position: relative;
  color: transparent;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

## 📋 Composants Formulaires

### Champs de Saisie
```css
.input {
  width: 100%;
  border-radius: 0.5rem; /* 8px */
  border: 1px solid #D1D5DB;
  padding: 0.75rem; /* 12px */
  font-size: 0.875rem; /* 14px */
  transition: all 0.2s ease-in-out;
  background-color: white;
}

.input:focus {
  outline: none;
  border-color: #0A84FF;
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.input:disabled {
  background-color: #F9FAFB;
  color: #6B7280;
  cursor: not-allowed;
}

.input.error {
  border-color: #FF453A;
}

.input.error:focus {
  border-color: #FF453A;
  box-shadow: 0 0 0 3px rgba(255, 69, 58, 0.1);
}

/* Labels */
.label {
  display: block;
  margin-bottom: 0.25rem; /* 4px */
  font-size: 0.875rem; /* 14px */
  font-weight: 500;
  color: #374151;
}

/* Messages d'erreur */
.error-message {
  margin-top: 0.25rem; /* 4px */
  font-size: 0.75rem; /* 12px */
  color: #FF453A;
}

/* Select */
.select {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #D1D5DB;
  padding: 0.75rem;
  font-size: 0.875rem;
  background-color: white;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

/* Textarea */
.textarea {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #D1D5DB;
  padding: 0.75rem;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 5rem;
}
```

## 🃏 Composants Cartes

### Cartes de Base
```css
.card {
  background-color: white;
  border-radius: 0.75rem; /* 12px */
  padding: 1.5rem; /* 24px */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s ease-in-out;
}

.card:hover {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

/* Cartes avec bordure */
.card-bordered {
  border: 1px solid #E5E7EB;
}

/* Cartes d'état */
.card-success {
  background-color: #F0FDF4;
  border: 1px solid #BBF7D0;
}

.card-warning {
  background-color: #FFFBEB;
  border: 1px solid #FED7AA;
}

.card-error {
  background-color: #FEF2F2;
  border: 1px solid #FECACA;
}
```

## 📱 Responsive Design

### Points de Rupture
```css
/* Mobile first approach */
@media (min-width: 480px) { /* xs */ }
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Grilles Responsives
```css
/* Grille adaptative */
.responsive-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
}

/* Grilles spécifiques */
.grid-1-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .grid-1-2 {
    grid-template-columns: 1fr 1fr;
  }
}
```

## 🎭 Animations et Transitions

### Animations de Base
```css
/* Transitions standard */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

/* Animation de spin pour les loaders */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Animation de pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Hover states */
.hover-lift {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
```

## 🔧 Utilitaires CSS

### Espacement (Système 8px)
```css
/* Marges et paddings basés sur un système 8px */
.p-1 { padding: 0.25rem; } /* 4px */
.p-2 { padding: 0.5rem; }  /* 8px */
.p-3 { padding: 0.75rem; } /* 12px */
.p-4 { padding: 1rem; }    /* 16px */
.p-6 { padding: 1.5rem; }  /* 24px */
.p-8 { padding: 2rem; }    /* 32px */

/* Marges */
.m-1 { margin: 0.25rem; }
.m-2 { margin: 0.5rem; }
.m-3 { margin: 0.75rem; }
.m-4 { margin: 1rem; }
.m-6 { margin: 1.5rem; }
.m-8 { margin: 2rem; }

/* Espacement entre éléments */
.space-y-2 > * + * { margin-top: 0.5rem; }
.space-y-3 > * + * { margin-top: 0.75rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }

.space-x-2 > * + * { margin-left: 0.5rem; }
.space-x-3 > * + * { margin-left: 0.75rem; }
.space-x-4 > * + * { margin-left: 1rem; }
```

### Bordures et Rayons
```css
/* Rayons de bordure */
.rounded-sm { border-radius: 0.125rem; } /* 2px */
.rounded { border-radius: 0.25rem; }     /* 4px */
.rounded-md { border-radius: 0.375rem; } /* 6px */
.rounded-lg { border-radius: 0.5rem; }   /* 8px */
.rounded-xl { border-radius: 0.75rem; }  /* 12px */
.rounded-2xl { border-radius: 1rem; }    /* 16px */
.rounded-full { border-radius: 9999px; }

/* Bordures */
.border { border: 1px solid #E5E7EB; }
.border-2 { border: 2px solid #E5E7EB; }
.border-dashed { border-style: dashed; }
```

### Ombres
```css
/* Ombres personnalisées */
.shadow-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.shadow-card-hover {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.shadow-modal {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```