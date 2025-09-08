# Exemples d'Utilisation - Guide UI OsteoApp

Ce document présente des exemples concrets d'utilisation des composants et styles pour reproduire l'UI d'OsteoApp.

## 🔘 Boutons

### Boutons Principaux
```jsx
// Bouton principal (actions importantes)
<Button variant="primary" size="md" leftIcon={<Plus size={16} />}>
  Nouveau patient
</Button>

// Bouton secondaire (actions secondaires)
<Button variant="outline" size="md" leftIcon={<Edit size={16} />}>
  Modifier
</Button>

// Bouton de suppression
<Button variant="danger" size="sm" leftIcon={<Trash2 size={16} />}>
  Supprimer
</Button>

// Bouton avec état de chargement
<Button 
  variant="primary" 
  isLoading={isSubmitting}
  loadingText="Enregistrement..."
>
  Enregistrer
</Button>
```

### Groupes de Boutons
```jsx
<div className="flex space-x-3">
  <Button variant="outline">Annuler</Button>
  <Button variant="primary">Confirmer</Button>
</div>
```

## 📋 Formulaires

### Champ de Saisie Standard
```jsx
<div>
  <label className="label">Nom du patient *</label>
  <input
    type="text"
    className="input"
    placeholder="Nom complet"
    required
  />
</div>
```

### Champ avec Erreur
```jsx
<div>
  <label className="label">Email</label>
  <input
    type="email"
    className={`input ${hasError ? 'border-error' : ''}`}
    placeholder="email@exemple.com"
  />
  {hasError && (
    <p className="mt-1 text-sm text-error">Format d'email invalide</p>
  )}
</div>
```

### Sélecteur de Catégorie
```jsx
<div>
  <label className="label">Catégorie du document</label>
  <select className="input">
    <option value="prescription">Ordonnance</option>
    <option value="report">Compte-rendu</option>
    <option value="imaging">Imagerie</option>
    <option value="analysis">Analyse</option>
    <option value="certificate">Certificat</option>
    <option value="other">Autre</option>
  </select>
</div>
```

## 🃏 Cartes et Conteneurs

### Carte Standard
```jsx
<div className="card">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">
    Informations Patient
  </h3>
  <div className="space-y-4">
    {/* Contenu de la carte */}
  </div>
</div>
```

### Carte Interactive (Hover Effect)
```jsx
<div className="card hover:shadow-card-hover transition-all duration-200 cursor-pointer">
  <div className="flex items-center space-x-4">
    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
      <User size={20} className="text-primary-600" />
    </div>
    <div>
      <h4 className="font-medium text-gray-900">Jean Dupont</h4>
      <p className="text-sm text-gray-500">Dernière consultation: 15/03/2024</p>
    </div>
  </div>
</div>
```

## 🏷️ Badges et Statuts

### Badges de Statut
```jsx
// Statut actif
<span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
  Actif
</span>

// Statut en attente
<span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
  En attente
</span>

// Statut erreur
<span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
  Erreur
</span>
```

### Badge HDS
```jsx
<div className="inline-flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
  <Shield size={12} className="mr-1" />
  HDS Conforme
</div>
```

## 📱 Modales

### Modale Standard
```jsx
<AnimatePresence>
  {isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Titre de la modale</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Contenu */}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="primary">Confirmer</Button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

## 📊 Listes et Tableaux

### Liste de Patients
```jsx
<div className="space-y-4">
  {patients.map((patient) => (
    <div key={patient.id} className="card hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium">
              {patient.firstName[0]}{patient.lastName[0]}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {patient.firstName} {patient.lastName}
            </h3>
            <p className="text-sm text-gray-500">{patient.phone}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">Voir</Button>
          <Button variant="outline" size="sm">Modifier</Button>
        </div>
      </div>
    </div>
  ))}
</div>
```

### Tableau Responsive
```jsx
<div className="bg-white shadow rounded-xl overflow-hidden">
  <table className="min-w-full">
    <thead>
      <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        <th className="px-6 py-3">Patient</th>
        <th className="px-6 py-3">Date</th>
        <th className="px-6 py-3">Statut</th>
        <th className="px-6 py-3 text-right">Actions</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      {data.map((item) => (
        <tr key={item.id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-medium text-gray-900">{item.name}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-500">{item.date}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              {item.status}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right">
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm">Voir</Button>
              <Button variant="outline" size="sm">Modifier</Button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

## 🎨 Zones de Upload

### Zone de Glisser-Déposer
```jsx
<div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 hover:bg-gray-50 transition-colors cursor-pointer">
  <input
    type="file"
    className="hidden"
    onChange={handleFileSelect}
    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
    multiple
  />
  
  <div className="space-y-2">
    <Upload className="mx-auto h-12 w-12 text-gray-400" />
    <div>
      <p className="text-sm text-gray-600">
        Cliquez ou glissez vos fichiers ici
      </p>
      <p className="text-xs text-gray-400 mt-1">
        PDF, DOC, DOCX, JPG, PNG jusqu'à 10MB
      </p>
    </div>
  </div>
</div>
```

## 🔔 Messages et Alertes

### Messages de Succès
```jsx
<div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
  <CheckCircle size={20} className="text-green-500 mr-3" />
  <div>
    <h3 className="font-medium text-green-800">Succès</h3>
    <p className="text-sm text-green-700">L'opération a été effectuée avec succès</p>
  </div>
</div>
```

### Messages d'Erreur
```jsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
  <AlertTriangle size={20} className="text-red-500 mr-3" />
  <div>
    <h3 className="font-medium text-red-800">Erreur</h3>
    <p className="text-sm text-red-700">Une erreur est survenue lors de l'opération</p>
  </div>
</div>
```

### Toast Notifications
```jsx
// Utilisation du hook useToast
const { addToast, ToastContainer } = useToast();

// Ajouter un toast
addToast({
  type: 'success',
  title: 'Document supprimé',
  message: 'Le document a été supprimé avec succès',
  duration: 3000
});

// Dans le JSX
<ToastContainer />
```

## 📅 Calendrier et Agenda

### Vue Semaine
```jsx
<div className="bg-white rounded-xl shadow overflow-hidden">
  {/* En-têtes des jours */}
  <div className="grid grid-cols-8 border-b border-gray-200">
    <div className="py-4 px-2 bg-gray-50"></div>
    {weekDays.map((day, index) => (
      <div key={index} className="py-4 px-2 text-center bg-gray-50 border-l border-gray-200">
        <p className="text-sm font-medium text-gray-900">{day.name}</p>
        <p className="text-2xl font-bold text-gray-900">{day.date}</p>
      </div>
    ))}
  </div>
  
  {/* Créneaux horaires */}
  {timeSlots.map((hour) => (
    <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
      <div className="py-3 px-2 text-center text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
        {hour}:00
      </div>
      {weekDays.map((day, dayIndex) => (
        <div 
          key={dayIndex}
          className="relative h-16 border-l border-gray-200 cursor-pointer hover:bg-gray-50"
          onClick={() => onTimeSlotClick(day.date, hour)}
        >
          {/* Rendez-vous */}
          {getAppointments(day.date, hour).map((appointment) => (
            <div 
              key={appointment.id}
              className="absolute inset-1 rounded-lg p-2 text-xs border bg-primary-100 text-primary-800 border-primary-200"
            >
              <div className="font-medium truncate">{appointment.patientName}</div>
              <div className="text-xs opacity-75">{appointment.type}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  ))}
</div>
```

## 🎯 Onglets

### Navigation par Onglets
```jsx
<div className="flex border-b border-gray-200">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab.id
          ? 'border-primary-500 text-primary-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center space-x-2">
        {tab.icon}
        <span>{tab.label}</span>
      </div>
    </button>
  ))}
</div>
```

## 📱 Responsive Design

### Grille Responsive
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <div key={item.id} className="card">
      {/* Contenu de la carte */}
    </div>
  ))}
</div>
```

### Navigation Mobile
```jsx
{/* Desktop */}
<div className="hidden md:flex space-x-4">
  <Button variant="primary">Action 1</Button>
  <Button variant="outline">Action 2</Button>
</div>

{/* Mobile */}
<div className="md:hidden">
  <Button variant="primary" fullWidth className="mb-2">Action 1</Button>
  <Button variant="outline" fullWidth>Action 2</Button>
</div>
```

## 🎨 Animations

### Animation d'Entrée
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="card"
>
  {/* Contenu */}
</motion.div>
```

### Animation de Liste
```jsx
<motion.div className="space-y-4">
  {items.map((item, index) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card"
    >
      {/* Contenu de l'élément */}
    </motion.div>
  ))}
</motion.div>
```

## 🔍 États de Chargement

### Spinner de Chargement
```jsx
<div className="flex items-center justify-center py-12">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
</div>
```

### Skeleton Loading
```jsx
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  <div className="space-y-2">
    <div className="h-4 bg-gray-200 rounded"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>
</div>
```

## 📋 Listes de Documents

### Liste avec Actions
```jsx
<div className="space-y-3">
  {documents.map((document) => (
    <div key={document.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {document.type.includes('image') ? (
            <ImageIcon size={20} className="text-blue-500" />
          ) : (
            <FileText size={20} className="text-gray-500" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{document.name}</h4>
          <p className="text-xs text-gray-500">{document.size} • {document.category}</p>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" leftIcon={<Eye size={14} />}>
          Voir
        </Button>
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />}>
          Télécharger
        </Button>
        <Button variant="outline" size="sm" leftIcon={<Edit size={14} />}>
          Modifier
        </Button>
        <Button variant="outline" size="sm" leftIcon={<Trash2 size={14} />} className="text-red-600 hover:text-red-700">
          Supprimer
        </Button>
      </div>
    </div>
  ))}
</div>
```

## 🎯 Patterns d'Interaction

### Confirmation de Suppression
```jsx
{showDeleteConfirm === document.id ? (
  <div className="flex space-x-2">
    <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(null)}>
      Annuler
    </Button>
    <Button 
      variant="danger" 
      size="sm" 
      onClick={() => handleDelete(document.id)}
      isLoading={isDeleting}
    >
      Confirmer
    </Button>
  </div>
) : (
  <Button 
    variant="outline" 
    size="sm" 
    onClick={() => setShowDeleteConfirm(document.id)}
    className="text-red-600 hover:text-red-700"
  >
    Supprimer
  </Button>
)}
```

### Progress Bar
```jsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div 
    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

## 🎨 Thème Sombre (Optionnel)

### Variables CSS pour Thème Sombre
```css
[data-theme="dark"] {
  --gray-50: #1F2937;
  --gray-100: #374151;
  --gray-200: #4B5563;
  --gray-300: #6B7280;
  --gray-400: #9CA3AF;
  --gray-500: #D1D5DB;
  --gray-600: #E5E7EB;
  --gray-700: #F3F4F6;
  --gray-800: #F9FAFB;
  --gray-900: #FFFFFF;
}
```

## 📐 Règles de Design

### Espacement
- Utilisez toujours des multiples de 4px (système 8px)
- Espacement minimum entre éléments : 8px
- Espacement standard : 16px
- Espacement large : 24px

### Hiérarchie Visuelle
- Titres : font-weight 600-700
- Sous-titres : font-weight 500
- Corps de texte : font-weight 400
- Texte secondaire : couleur gray-500

### Interactions
- Tous les éléments interactifs doivent avoir un état hover
- Transitions de 200ms pour les changements d'état
- Focus visible avec ring de 3px
- États disabled avec opacity 50%

### Accessibilité
- Contraste minimum 4.5:1 pour le texte
- Taille minimum des zones tactiles : 44px
- Navigation au clavier supportée
- Textes alternatifs pour les images