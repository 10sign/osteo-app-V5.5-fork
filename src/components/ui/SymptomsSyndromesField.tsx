import React, { useState, useCallback } from 'react';
import { X as XIcon, Plus } from 'lucide-react';
import { Button } from './Button';

interface SymptomsSyndromesFieldProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

const COMMON_PATHOLOGIES = [
  'Lombalgie',
  'Cervicalgie',
  'Dorsalgie',
  'Sciatique',
  'Migraine',
  'Vertiges',
  'Entorse',
  'Tendinite',
  'Arthrose',
  'Scoliose',
  'Stress',
  'Troubles digestifs',
  'Troubles du sommeil'
];

export default function SymptomsSyndromesField({
  selectedTags,
  onTagsChange,
  disabled = false
}: SymptomsSyndromesFieldProps) {
  const [customTag, setCustomTag] = useState('');

  const handleAddTag = useCallback((tag: string) => {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag]);
    }
  }, [selectedTags, onTagsChange]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  }, [selectedTags, onTagsChange]);

  const handleAddCustomTag = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTag.trim()) {
      e.preventDefault();
      handleAddTag(customTag.trim());
      setCustomTag('');
    }
  }, [customTag, handleAddTag]);

  const handleAddCustomTagClick = useCallback(() => {
    if (customTag.trim()) {
      handleAddTag(customTag.trim());
      setCustomTag('');
    }
  }, [customTag, handleAddTag]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Symptômes / Syndromes
      </label>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-50 text-primary-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-2 text-primary-600 hover:text-primary-800"
                disabled={disabled}
              >
                <XIcon size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={handleAddCustomTag}
            placeholder="Ajouter des symptômes / syndromes personnalisés"
            className="input flex-1"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomTagClick}
            disabled={!customTag.trim() || disabled}
          >
            Ajouter
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMMON_PATHOLOGIES.map((pathology) => (
            <button
              key={pathology}
              type="button"
              onClick={() => handleAddTag(pathology)}
              disabled={selectedTags.includes(pathology) || disabled}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                selectedTags.includes(pathology)
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {pathology}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
