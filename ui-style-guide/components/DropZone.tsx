import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon } from 'lucide-react';

export interface DropZoneProps {
  onFileSelect: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // en bytes
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  accept = "image/*,application/pdf,.doc,.docx",
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  className = "",
  children,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled || !e.dataTransfer.files.length) return;
    
    onFileSelect(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
        ${isDragOver 
          ? 'border-primary-500 bg-primary-50' 
          : disabled 
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
          : 'border-gray-300 hover:border-primary-500 hover:bg-gray-50'
        }
        ${className}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
      />

      {children || (
        <div className="space-y-2">
          <Upload className={`mx-auto h-12 w-12 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
          <div>
            <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
              {isDragOver ? 'Déposez vos fichiers ici' : 'Cliquez ou glissez vos fichiers ici'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF, DOC, DOCX, JPG, PNG jusqu'à {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropZone;