import React, { useState, useEffect, forwardRef, useRef, useCallback, useImperativeHandle } from 'react';
import { useAutoCapitalize } from '../../hooks/useAutoCapitalize';

interface AutoCapitalizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
  minRows?: number;
  // If undefined or <= 0, height is unbounded and grows to show all content
  maxRows?: number;
}

const AutoCapitalizeTextarea = forwardRef<HTMLTextAreaElement, AutoCapitalizeTextareaProps>(
  ({ value: propValue, onChange, onValueChange, minRows = 3, maxRows, className = '', ...props }, ref) => {
    const [localValue, setLocalValue] = useState(propValue as string || '');
    const [value, setValue, handleAutoCapitalize] = useAutoCapitalize(localValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Bridge our internal ref with any external ref safely
    const setRefs = useCallback((el: HTMLTextAreaElement | null) => {
      textareaRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      }
    }, [ref]);

    // Expose our internal ref to object refs without assigning directly
    useImperativeHandle(ref, () => textareaRef.current);

    // Update local value when prop value changes
    useEffect(() => {
      if (propValue !== undefined && propValue !== value) {
        setValue(propValue as string);
      }
    }, [propValue, setValue]);

    // Update parent when value changes
    useEffect(() => {
      if (onValueChange && value !== propValue) {
        onValueChange(value);
      }
    }, [value, propValue, onValueChange]);

    // Auto-resize functionality
    const adjustHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Store the current scroll position
      const scrollTop = textarea.scrollTop;
      
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Get line height with fallback
      const computedStyle = getComputedStyle(textarea);
      const fontSize = parseInt(computedStyle.fontSize) || 16;
      const lineHeight = computedStyle.lineHeight === 'normal' 
        ? fontSize * 1.2 // Fallback: 1.2 * fontSize
        : parseInt(computedStyle.lineHeight) || fontSize * 1.2;
      
      const minHeight = lineHeight * minRows;
      const hasMax = typeof maxRows === 'number' && maxRows > 0;
      const maxHeight = hasMax ? lineHeight * (maxRows as number) : Infinity;
      
      // Calculate the new height based on scrollHeight
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      // Set the height
      textarea.style.height = `${newHeight}px`;
      
      // Restore scroll position
      textarea.scrollTop = scrollTop;
    }, [minRows, maxRows]);

    useEffect(() => {
      // Use setTimeout to ensure the DOM is updated
      const timeoutId = setTimeout(() => {
        adjustHeight();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }, [adjustHeight, value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleAutoCapitalize(e);
      
      // Auto-resize after content change
      setTimeout(adjustHeight, 0);
      
      // Create a synthetic event to pass to the original onChange
      if (onChange) {
        // Split by lines, capitalize first letter of each line, then join back
        const lines = e.target.value.split('\n');
        const capitalizedLines = lines.map(line => 
          line ? line.charAt(0).toUpperCase() + line.slice(1) : line
        );
        const capitalizedValue = capitalizedLines.join('\n');
        
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: capitalizedValue
          }
        };
        onChange(syntheticEvent as React.ChangeEvent<HTMLTextAreaElement>);
      }
    };

    return (
      <textarea
        {...props}
        ref={setRefs}
        value={value}
        onChange={handleChange}
        className={`resize-none overflow-hidden whitespace-pre-wrap break-words ${className}`}
        style={{
          minHeight: `${20 * minRows}px`,
          // Ensure long words and pasted text wrap nicely
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...props.style
        }}
      />
    );
  }
);

AutoCapitalizeTextarea.displayName = 'AutoCapitalizeTextarea';

export default AutoCapitalizeTextarea;