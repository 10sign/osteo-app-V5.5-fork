import React, { useEffect, useRef, forwardRef, useCallback } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ minRows = 3, maxRows = 10, className = '', ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const combinedRef = ref || textareaRef;

    const adjustHeight = useCallback(() => {
      const textarea = (combinedRef as React.RefObject<HTMLTextAreaElement>)?.current;
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
      const maxHeight = lineHeight * maxRows;
      
      // Calculate the new height based on scrollHeight
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      // Set the height
      textarea.style.height = `${newHeight}px`;
      
      // Restore scroll position
      textarea.scrollTop = scrollTop;
    }, [minRows, maxRows, combinedRef]);

    useEffect(() => {
      // Use setTimeout to ensure the DOM is updated
      const timeoutId = setTimeout(() => {
        adjustHeight();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }, [adjustHeight, props.value]);

    const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (props.onInput) {
        props.onInput(e);
      }
    }, [adjustHeight, props.onInput]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (props.onChange) {
        props.onChange(e);
      }
    }, [adjustHeight, props.onChange]);

    return (
      <textarea
        {...props}
        ref={combinedRef}
        className={`resize-none overflow-hidden ${className}`}
        onInput={handleInput}
        onChange={handleChange}
        style={{
          minHeight: `${20 * minRows}px`,
          ...props.style
        }}
      />
    );
  }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export default AutoResizeTextarea;