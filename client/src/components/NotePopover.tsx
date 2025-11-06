import React, { useEffect, useState, useRef } from 'react';

type NotePopoverProps = {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onSave: (note: string) => void;
};

export default function NotePopover({ visible, initial, onClose, onSave }: NotePopoverProps) {
  // --- MODIFICA: Ho riunito i tuoi due state 'note' e 'value' in uno solo ---
  const [value, setValue] = useState(initial || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Gestisce Escape e Autofocus
  useEffect(() => {
    if (!visible) return;
    
    // Aggiorna il valore quando il popover si apre
    setValue(initial || '');

    // Autofocus sulla textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 100); 

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [visible, initial, onClose]);


  if (!visible) return null;

 return (
    // --- MODIFICA CHIAVE: z-index portato da 50 a 110 per coprire la tabella ---
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-[110] backdrop-blur-sm"
      onClick={onClose} // Chiudi cliccando sullo sfondo
    >
      <div 
        className="bg-yellow-50 dark:bg-gray-800 p-6 rounded-xl shadow-lg max-w-sm w-full border border-yellow-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()} // Impedisce al click di chiudere il modal
      >
        <label className="block mb-2 font-semibold text-gray-900 dark:text-gray-100">
          {/* --- MODIFICA: Testo tradotto --- */}
          Cell note 
          <span className="text-xs text-gray-500 font-normal"> (max 250 characters)</span>
        </label>
        <textarea
          ref={textareaRef}
          className="w-full p-2 rounded border focus:ring-yellow-400 focus:border-yellow-400 resize-none bg-white dark:bg-gray-700 dark:text-gray-100 min-h-[80px]"
          maxLength={250}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Add a note..."
        />
        <div className="flex mt-4 gap-2 justify-end">
          <button
            className="px-3 py-1 rounded text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-1 rounded text-white bg-blue-600 hover:bg-blue-700 font-medium"
            onClick={() => onSave(value)}
            disabled={value.length > 250}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}