import React, { useEffect, useRef, forwardRef, useCallback, useImperativeHandle } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  // If undefined or <= 0, height is unbounded and grows to show all content
  maxRows?: number;
}

const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ minRows = 3, maxRows, className = '', ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Callback for function refs; avoid writing to read-only object refs
    const setRefs = useCallback((el: HTMLTextAreaElement | null) => {
      textareaRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      }
    }, [ref]);

    // Expose our internal ref to object refs safely
    useImperativeHandle(ref, () => textareaRef.current);

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
    });

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
        ref={setRefs}
        className={`resize-none overflow-hidden whitespace-pre-wrap break-words ${className}`}
        onInput={handleInput}
        onChange={handleChange}
        style={{
          minHeight: `${20 * minRows}px`,
          // Fallbacks au cas où les classes utilitaires ne sont pas disponibles
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...props.style
        }}
      />
    );
  }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export default AutoResizeTextarea;