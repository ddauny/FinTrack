import React, { useEffect, useState, useRef } from 'react';

type NotePopoverProps = {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onSave: (note: string) => void;
};

export default function NotePopover({ visible, initial, onClose, onSave }: NotePopoverProps) {
  const [value, setValue] = useState(initial || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(initial || '');

  // Keep ref in sync with state for event handlers
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleClose = () => {
    if (valueRef.current !== (initial || '')) {
      onSave(valueRef.current);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!visible) return;
    
    setValue(initial || '');
    valueRef.current = initial || '';

    // Autofocus with a slight delay to ensure render
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Place cursor at end of text
        textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      }
    }, 50); 

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Use the ref to get the latest value without needing to recreate the listener
        if (valueRef.current !== (initial || '')) {
          onSave(valueRef.current);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      clearTimeout(timer);
    };
  }, [visible, initial, onClose, onSave]);

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[110]"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div 
        className="relative bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-stone-100 dark:border-stone-800 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/50">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Note
          </h3>
          <button 
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-500 dark:hover:text-stone-300 transition-colors rounded-full p-1 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="relative">
            <textarea
              ref={textareaRef}
              className="w-full p-4 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none min-h-[140px] text-sm leading-relaxed shadow-sm placeholder:text-stone-400"
              maxLength={250}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter your note here..."
            />
            <div className="absolute bottom-3 right-3 text-xs text-stone-400 pointer-events-none bg-white/80 dark:bg-stone-950/80 px-1 rounded">
              {value.length}/250
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
