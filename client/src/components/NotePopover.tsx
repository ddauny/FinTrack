import React, { useEffect, useState, useRef } from 'react';

type NotePopoverProps = {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onSave: (note: string) => void;
};

export default function NotePopover({ visible, initial, onClose, onSave }: NotePopoverProps) {
  const [note, setNote] = useState(initial);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Aggiorna lo stato interno se la nota iniziale (dal prop) cambia
  // e fa l'autofocus sulla textarea quando il modal appare
  useEffect(() => {
  if (!visible) return;
  
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };
  
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, [visible, onClose]);



  if (!visible) return null;

  return (
    // Overlay per chiudere cliccando fuori
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
      onClick={onClose}
    >
      {/* Contenuto del Modal */}
      <div
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700"
        onClick={(e) => e.stopPropagation()} // Impedisce al click di chiudere il modal
      >
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Cell note
          </h3>
        </div>
        
        {/* Content (Textarea) */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            id="note-textarea"
            rows={4}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white dark:bg-gray-700"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        
        {/* Footer (Buttons) */}
        <div className="flex justify-end items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 rounded-b-lg">
          <button
            type="button"
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={() => onSave(note)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}