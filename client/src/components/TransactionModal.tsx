import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import { api, secureFetch } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import { useAlert } from '../contexts/AlertContext'
import { TagInput } from './TagInput'

const CategorySelector = ({
    value,
    onChange,
    categories,
    placeholder = "Search category...",
    idPrefix
}: {
    value: number | '';
    onChange: (id: number) => void;
    categories: any[];
    placeholder?: string;
    idPrefix: string;
}) => {
    const [query, setQuery] = useState('');
    const [showList, setShowList] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const categoryMap = useMemo(() => {
        const m: Record<number, any> = {}
        for (const c of categories) m[c.id] = c
        return m
    }, [categories])

    const groups = useMemo(() => {
        const filtered = (categories || []).filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
        const groups: Record<string, any[]> = { 'Expense': [], 'Income': [], 'Transfer': [] };
        if (filtered) {
            filtered.forEach(c => { if (groups[c.type]) groups[c.type].push(c); });
        }
        Object.keys(groups).forEach(key => { groups[key].sort((a, b) => a.name.localeCompare(b.name)); });
        return groups;
    }, [categories, query]);

    useEffect(() => {
        const flat = [...(groups['Expense'] || []), ...(groups['Income'] || []), ...(groups['Transfer'] || [])];
        setSuggestions(flat);
        if (flat.length > 0 && showList) setSelectedIndex(0);
        else setSelectedIndex(-1);
    }, [groups, showList]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => (p < suggestions.length - 1 ? p + 1 : p)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => (p > 0 ? p - 1 : 0)); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (showList && selectedIndex >= 0 && suggestions[selectedIndex]) {
                onChange(suggestions[selectedIndex].id);
                setQuery('');
                setShowList(false);
            }
        } else if (e.key === 'Escape') { setShowList(false); }
    };

    if (value && categoryMap[value]) {
        const c = categoryMap[value];
        return (
            <div onClick={() => { onChange(''); setTimeout(() => document.getElementById(`${idPrefix}-search-input`)?.focus(), 0); }}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl cursor-pointer border-2 transition-all ${c.type === 'Income' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' : c.type === 'Transfer' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${c.type === 'Income' ? 'bg-emerald-500' : c.type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                    <span className={`font-bold ${c.type === 'Income' ? 'text-emerald-700 dark:text-emerald-400' : c.type === 'Transfer' ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'}`}>{c.name}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-300"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-300"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>
            </div>
            <input id={`${idPrefix}-search-input`} placeholder={placeholder} value={query} onChange={e => {setQuery(e.target.value); setShowList(true)}} onKeyDown={handleKeyDown} onBlur={() => setTimeout(() => setShowList(false), 200)} onFocus={() => setShowList(true)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-base font-medium text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" autoComplete="off" />
            {(showList || (query.length > 0 && suggestions.length > 0)) && (
                <div className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto hide-scrollbar border border-slate-100 dark:border-[#1f1f1f] rounded-xl bg-white dark:bg-[#101010] shadow-xl">
                    {(() => {
                        const types = ['Expense', 'Income', 'Transfer'];
                        let renderedAny = false;
                        let traverseIndex = -1;
                        const res = types.map(type => {
                            const group = groups[type];
                            if (!group || group.length === 0) return null;
                            renderedAny = true;
                            return (
                                <div key={type}>
                                    <div className="px-4 py-2 text-[10px] font-bold text-slate-300 dark:text-[#666] bg-slate-50 dark:bg-[#111111] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-100 dark:border-[#1f1f1f]">{type}</div>
                                    {group.map((c: any) => {
                                        traverseIndex++;
                                        const isSelected = traverseIndex === selectedIndex;
                                        return (
                                            <div key={c.id} ref={(el) => { if (isSelected && el) el.scrollIntoView({ block: 'nearest' }); }} onClick={() => { onChange(c.id); setQuery(''); }} className={`px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-[#1f1f1f] last:border-0 flex items-center gap-3 transition-colors ${isSelected ? 'bg-slate-100 dark:bg-[#111111]' : 'hover:bg-slate-50 dark:hover:bg-[#242424] dark:bg-[#1a1a1a]'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${c.type === 'Income' ? 'bg-emerald-500' : c.type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                                                <span className="text-sm font-medium text-slate-700 dark:text-[#d8d8d8]">{c.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        });
                        if (!renderedAny && query.length > 0) return <div className="p-4 text-center text-slate-500 text-sm">No categories found</div>;
                        return res;
                    })()}
                </div>
            )}
        </div>
    );
};

export const TransactionModal = memo(function TransactionModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    editingId,
    initialData,
    categories
}: {
    isOpen: boolean,
    onClose: () => void,
    onSave: (formData: any) => Promise<void>,
    onDelete: (id: number) => Promise<void>,
    editingId: number | null,
    initialData?: any,
    categories: any[]
}) {
    const { showToast } = useToast()
    const { showAlert } = useAlert()
    
    // Form State - Managed internally to avoid parent re-renders
    const [form, setForm] = useState<any>({ 
        date: new Date().toISOString().slice(0,10), 
        amount: '', 
        accountId: '', 
        categoryId: '', 
        notes: '', 
        tags: [], 
        assetItemId: '',
        isRecurring: false, 
        frequency: 'MONTHLY', 
        endDate: '',
        attachmentPath: null,
        receipt: null,
        splits: []
    })

    const [isSplit, setIsSplit] = useState(false)
    // Auto-complete States
    const [notesSuggestions, setNotesSuggestions] = useState<any[]>([])
    const [showNotesSuggestions, setShowNotesSuggestions] = useState(false)
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
    
    // Category Suggestion States
    const [categoryQuery, setCategoryQuery] = useState('')
    const [categorySuggestions, setCategorySuggestions] = useState<any[]>([])
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
    const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1)
    const [showCategoryList, setShowCategoryList] = useState(false)
    
    const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false)
    const [isHoveringReceipt, setIsHoveringReceipt] = useState(false)
    const [assetGroups, setAssetGroups] = useState<any[]>([])

    useEffect(() => {
        if (isOpen && assetGroups.length === 0) {
            secureFetch('/api/asset-groups', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then(res => res.json())
            .then(data => setAssetGroups(data))
            .catch(console.error)
        }
    }, [isOpen])

    // Dropdown Positioning
    const categoryInputRef = useRef<HTMLDivElement>(null)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
    const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if ((showCategoryList || showCategorySuggestions) && categoryInputRef.current) {
            const rect = categoryInputRef.current.getBoundingClientRect()
            setDropdownPos({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            })
        }
    }, [showCategoryList, showCategorySuggestions])

    // Derived States
    const categoryMap = useRef<Record<number, any>>({})
    
    useEffect(() => {
        const m: Record<number, any> = {}
        for (const c of categories) m[c.id] = c
        categoryMap.current = m
    }, [categories])

    // Reset or Initialize Form
    useEffect(() => {
        if (isOpen) {
            if (editingId && initialData) {
               // When editing, initialData comes from parent
               setForm(initialData)
               if (initialData.categoryId) {
                   const cat = categories.find(c => c.id === initialData.categoryId)
                   if (cat) setCategoryQuery(cat.name)
               }
            } else {
               // Reset for new transaction
               setForm({ 
                   date: new Date().toISOString().slice(0,10), 
                   amount: '', 
                   accountId: initialData?.accountId || '', 
                   categoryId: '', 
                   notes: '', 
                   tags: [], 
                   assetItemId: '',
                   isRecurring: false, 
                   frequency: 'MONTHLY', 
                   endDate: '',
                   attachmentPath: null,
                   receipt: null,
                   splits: []
               })
               setCategoryQuery('')
               setIsSplit(false)
            }
            
            // Clear suggestions
            setNotesSuggestions([])
            setShowNotesSuggestions(false)
            setCategorySuggestions([])
            setShowCategorySuggestions(false)
            setShowCategoryList(false)
        }
    }, [isOpen, editingId, initialData, categories])

    // Group categories for dropdown
    const groupedCategories = useMemo(() => {
        const q = categoryQuery.toLowerCase()
        const filtered = q ? categories.filter(c => c.name.toLowerCase().includes(q)) : categories
        const groups: Record<string, any[]> = { 'Expense': [], 'Income': [], 'Transfer': [] };
        
        filtered.forEach(c => {
          if (groups[c.type]) groups[c.type].push(c);
        });
    
        Object.keys(groups).forEach(key => {
          groups[key].sort((a, b) => a.name.localeCompare(b.name));
        });
    
        return groups;
    }, [categories, categoryQuery])

    // Update suggestions when categories or query changes
    useEffect(() => {
        const flat = [
          ...(groupedCategories['Expense'] || []),
          ...(groupedCategories['Income'] || []),
          ...(groupedCategories['Transfer'] || [])
        ]
        setCategorySuggestions(flat)
        // Auto-select first item when list changes or opens
        if (flat.length > 0 && (showCategoryList || showCategorySuggestions)) {
             setSelectedCategoryIndex(0)
        } else {
             setSelectedCategoryIndex(-1)
        }
    }, [groupedCategories, showCategoryList, showCategorySuggestions])


    // Handle Notes
    async function handleNotesChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value
        setForm((prev: any) => ({...prev, notes: value}))
        
        if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)

        if (value.length >= 2) {
          notesDebounceRef.current = setTimeout(async () => {
            try {
              const suggestions = await api.transactions.getNotes(value)
              setNotesSuggestions(suggestions as any[])
              setShowNotesSuggestions((suggestions as any[]).length > 0)
              setSelectedSuggestionIndex(suggestions.length > 0 ? 0 : -1)
            } catch (error) {
              console.error('Error fetching notes suggestions:', error)
            }
          }, 250)
        } else {
          setShowNotesSuggestions(false)
          setNotesSuggestions([])
        }
    }

    function handleNotesKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!showNotesSuggestions) return
    
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedSuggestionIndex(prev => prev < notesSuggestions.length - 1 ? prev + 1 : 0)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : notesSuggestions.length - 1)
        } else if (e.key === 'Tab' || e.key === 'Enter') {
          // If suggestions exist, pick first one even if index is -1
          if (notesSuggestions.length > 0) {
            e.preventDefault()
            const indexToUse = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0
            selectSuggestion(notesSuggestions[indexToUse])
          }
        } else if (e.key === 'Escape') {
          setShowNotesSuggestions(false)
          setSelectedSuggestionIndex(-1)
        }
    }

    function selectSuggestion(suggestion: any) {
        setForm(prev => ({
            ...prev, 
            notes: suggestion.note, 
            categoryId: suggestion.category?.id || prev.categoryId
        }))
        if (suggestion.category) {
            setCategoryQuery(suggestion.category.name)
        }
        setShowNotesSuggestions(false)
        setSelectedSuggestionIndex(-1)
    }

    // Handle Category
    const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setCategoryQuery(value)
        if (value.length >= 0) {
          setShowCategoryList(true)
          if (value.length > 0) setShowCategorySuggestions(true)
        }
    }, [])
    
    const handleCategoryKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((!showCategorySuggestions && !showCategoryList) || categorySuggestions.length === 0) return
    
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedCategoryIndex(prev => prev < categorySuggestions.length - 1 ? prev + 1 : 0)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedCategoryIndex(prev => prev > 0 ? prev - 1 : categorySuggestions.length - 1)
        } else if (e.key === 'Tab' || e.key === 'Enter') {
           // Only select if user has interacted or pressed down
           if (selectedCategoryIndex !== -1 || categorySuggestions.length === 1) {
              e.preventDefault()
              const indexToUse = selectedCategoryIndex >= 0 ? selectedCategoryIndex : 0
              const category = categorySuggestions[indexToUse]
              if (category) {
                  setForm(prev => ({...prev, categoryId: category.id}))
                  setCategoryQuery(category.name)
                  setShowCategorySuggestions(false)
                  setShowCategoryList(false)
                  setSelectedCategoryIndex(-1)
              }
           }
        } else if (e.key === 'Escape') {
          setShowCategorySuggestions(false)
          setShowCategoryList(false)
          setSelectedCategoryIndex(-1)
        }
    }, [showCategorySuggestions, showCategoryList, categorySuggestions, selectedCategoryIndex])

    // Handle Paste for Receipt
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
          if (!isHoveringReceipt) return;
          if (e.clipboardData && e.clipboardData.files.length > 0) {
            e.preventDefault();
            const file = e.clipboardData.files[0];
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                 setForm((prev: any) => ({...prev, receipt: file}));
            }
          }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isHoveringReceipt]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        
        if (isSplit) {
            if (!form.splits || form.splits.length === 0) {
                showToast('Please add at least one split.', 'warning'); return;
            }
            for (let i = 0; i < form.splits.length; i++) {
                const s = form.splits[i];
                if (!s.categoryId) { showToast('Please select a category for all splits.', 'warning'); return; }
                if (!s.amount || Number(s.amount) <= 0) { showToast('Please enter a valid amount for all splits.', 'warning'); return; }
            }
            if (!form.amount) { showToast('Please enter total amount.', 'warning'); return; }
            const totalSplits = form.splits.reduce((acc: number, s: any) => acc + Number(s.amount), 0);
            if (Math.abs(totalSplits - Number(form.amount)) > 0.01) {
                showToast(`Splits total (${totalSplits}) must equal main amount (${form.amount}).`, 'warning'); return;
            }
            await onSave({...form, splits: form.splits})
        } else {
            if (!form.categoryId) { showToast('Please select a category.', 'warning'); return }
            if (!form.amount) { showToast('Please enter an amount.', 'warning'); return }
            await onSave({ ...form, splits: undefined })
        }
    }

    // Handle Global Enter to save (unless in a dropdown)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                // Only close if no dropdowns are open
                 if (!showNotesSuggestions && !showCategorySuggestions && !showCategoryList && !showFrequencyDropdown) {
                     onClose()
                 }
            }
            if (e.key === 'Enter' && !e.shiftKey && !e.defaultPrevented) {
                 // Check if any dropdown is open and active
                 if (showNotesSuggestions || showCategorySuggestions || showCategoryList || showFrequencyDropdown) return;
                 
                 // Also ensure we aren't in a textarea or something (input type text is fine)
                 if (form.categoryId && form.amount) {
                    // Slight delay/check to avoid race with dropdown selection events
                    handleSubmit();
                 }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, showNotesSuggestions, showCategorySuggestions, showCategoryList, showFrequencyDropdown, form, onSave, onClose]);




    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-white dark:bg-[#090909] sm:bg-black/70 sm:dark:bg-black/80 sm:backdrop-blur-md p-0 sm:p-4">
          <div className="w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-3xl bg-white dark:bg-[#111111] sm:rounded-lg shadow-none sm:shadow-2xl sm:border sm:border-slate-800/60 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1f1f1f] flex justify-between items-center shrink-0 bg-white dark:bg-[#111111] z-10">
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-[#f0f0f0] tracking-tight">
                  {editingId ? 'Edit Transaction' : 'New Transaction'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">Enter transaction details below</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#666] dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div 
              onScroll={() => {
                if (showCategoryList || showCategorySuggestions) {
                  setShowCategoryList(false)
                  setShowCategorySuggestions(false)
                  document.getElementById('category-search-input')?.blur()
                }
                if (showNotesSuggestions) {
                  setShowNotesSuggestions(false)
                  // document.getElementById('notes-input')?.blur() // Optional
                }
              }}
              className="flex-1 overflow-y-auto p-6 space-y-5 hide-scrollbar bg-white dark:bg-[#111111]"
            >
              
              
              {/* Split Toggle */}
              {!editingId && (
                <div className="flex items-center justify-between mx-1 bg-slate-50 dark:bg-[#111111] p-3 rounded-xl border border-slate-100 dark:border-[#1f1f1f]">
                    <div className="flex items-center space-x-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                         <span className="text-sm font-medium text-slate-700 dark:text-[#bbb]">Split Transaction</span>
                    </div>
                    <button type="button" onClick={() => setIsSplit(!isSplit)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSplit ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSplit ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
              )}

              {/* Amount and Date Input Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-lg font-medium">€</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={form.amount} 
                      onChange={e=>setForm({...form, amount:e.target.value})} 
                      placeholder="0.00" 
                      className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-2xl font-bold text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-300 dark:placeholder-slate-300 dark:placeholder-slate-300 dark:placeholder-[#444]"
                      autoFocus={!editingId}
                    />
                  </div>
                </div>

                {/* Date Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={form.date} 
                      onChange={e=>setForm({...form, date:e.target.value})} 
                      className="w-full px-4 py-4 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-xl font-medium text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none min-w-0" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Splits Editor */}
              {isSplit && (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-[#1f1f1f]">
                      <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-[#bbb]">Splits</label>
                          <span className="text-xs text-slate-500 dark:text-[#888]">
                            Total: {form.splits?.reduce((acc: number, s: any) => acc + Number(s.amount || 0), 0).toFixed(2)} / {form.amount || '0.00'}
                          </span>
                      </div>
                      {form.splits?.map((split: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-start relative bg-white dark:bg-[#101010] p-2 rounded-lg border border-slate-100 dark:border-[#1f1f1f]">
                              <button type="button" onClick={() => {
                                  const ns = [...form.splits]; ns.splice(idx, 1); setForm({...form, splits: ns});
                              }} className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                              <div className="flex-1 space-y-2">
                                  <CategorySelector 
                                      categories={categories}
                                      value={split.categoryId || ''} 
                                      onChange={(val: any) => { const ns = [...form.splits]; ns[idx].categoryId = Number(val) || ''; setForm({...form, splits: ns}); }} 
                                      placeholder="Search category..." 
                                      idPrefix={`split-${idx}`} 
                                  />
                                  <div className="flex gap-2">
                                    <input type="number" placeholder="Amount" value={split.amount} onChange={(e) => {
                                      const ns = [...form.splits]; ns[idx].amount = e.target.value; setForm({...form, splits: ns});
                                    }} className="w-1/2 text-sm p-2 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg outline-none dark:text-[#f0f0f0]" />
                                    <input type="text" placeholder="Note (optional)" value={split.notes || ''} onChange={(e) => {
                                      const ns = [...form.splits]; ns[idx].notes = e.target.value; setForm({...form, splits: ns});
                                    }} className="w-1/2 text-sm p-2 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg outline-none dark:text-[#f0f0f0]" />
                                  </div>
                              </div>
                          </div>
                      ))}
                      <button type="button" onClick={() => setForm({...form, splits: [...(form.splits||[]), {categoryId: '', amount: '', notes: ''}]})} 
                          className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                          + Add Split
                      </button>
                  </div>
              )}

              {!isSplit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">Notes</label>
                <div className="relative">
                  {showNotesSuggestions && notesSuggestions.length > 0 && (
                    <div className="absolute bottom-full mb-1 z-10 w-full bg-white dark:bg-[#111111] border border-slate-100 dark:border-[#1f1f1f] rounded-xl shadow-xl max-h-40 overflow-y-auto hide-scrollbar">
                      {notesSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => selectSuggestion(suggestion)}
                          className={`px-4 py-2.5 cursor-pointer text-sm text-slate-700 dark:text-[#d8d8d8] ${
                            index === selectedSuggestionIndex
                              ? 'bg-blue-50 dark:bg-blue-500/15 border-l-2 border-blue-500'
                              : 'bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#242424]'
                          }`}
                        >
                          <span className="font-medium">{suggestion.note}</span>
                          {suggestion.category && (
                             <span className="ml-2 text-xs text-slate-400 dark:text-[#666]">
                               ({suggestion.category.name})
                             </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <input 
                    type="text"
                    value={form.notes} 
                    onChange={handleNotesChange}
                    onKeyDown={handleNotesKeyDown}
                    onBlur={() => setTimeout(() => setShowNotesSuggestions(false), 200)}
                    onFocus={() => form.notes.length >= 2 && notesSuggestions.length > 0 && setShowNotesSuggestions(true)}
                    placeholder="Add a note..." 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-base font-medium text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-400" 
                  />
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">Category</label>
                
                {form.categoryId && categoryMap.current[form.categoryId] ? (
                  <div 
                    onClick={() => {
                      setCategoryQuery('')
               setIsSplit(false);
                      setForm({...form, categoryId: ''});
                      // Focus the input in a little bit
                      setTimeout(() => document.getElementById('category-search-input')?.focus(), 0);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl cursor-pointer border-2 transition-all ${
                      categoryMap.current[form.categoryId].type === 'Income' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' 
                        : categoryMap.current[form.categoryId].type === 'Transfer'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50'
                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        categoryMap.current[form.categoryId].type === 'Income' ? 'bg-emerald-500' : 
                        categoryMap.current[form.categoryId].type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'
                      }`}></div>
                      <span className={`font-bold ${
                        categoryMap.current[form.categoryId].type === 'Income' ? 'text-emerald-700 dark:text-emerald-400' : 
                        categoryMap.current[form.categoryId].type === 'Transfer' ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {categoryMap.current[form.categoryId].name}
                      </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-300">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </div>
                ) : (
                  <div className="relative" ref={categoryInputRef}>
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-300">
                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="category-search-input"
                      placeholder="Search category..."
                      value={categoryQuery}
                      onChange={handleCategoryChange}
                      onKeyDown={handleCategoryKeyDown}
                      onBlur={() => setTimeout(() => { setShowCategorySuggestions(false); setShowCategoryList(false); }, 200)}
                      onFocus={() => { setShowCategoryList(true); }}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-base font-medium text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      autoComplete="off"
                    />
                    
                    {(showCategoryList || (categoryQuery.length > 0 && categorySuggestions.length > 0)) && !form.categoryId && (
                      <div 
                        className="fixed z-[110] max-h-60 overflow-y-auto hide-scrollbar border border-slate-100 dark:border-[#1f1f1f] rounded-xl bg-white dark:bg-[#101010] shadow-xl"
                        style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                      >
                        {(() => {
                            const groups = groupedCategories
                            const types = ['Expense', 'Income', 'Transfer']
                            let renderedAny = false
                            
                            // Flattened list purely for index tracking if needed
                            let traverseIndex = -1;

                            const content = types.map(type => {
                                const group = groups[type];
                                if (!group || group.length === 0) return null;
                                renderedAny = true
                                return (
                                  <div key={type}>
                                    <div className="px-4 py-2 text-[10px] font-bold text-slate-300 dark:text-[#666] bg-slate-50 dark:bg-[#111111] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-100 dark:border-[#1f1f1f]">
                                      {type}
                                    </div>
                                    {group.map((c: any) => {
                                      traverseIndex++;
                                      const isSelected = traverseIndex === selectedCategoryIndex;
                                      return (
                                        <div
                                          key={c.id}
                                          ref={(el) => {
                                            if (isSelected && el) {
                                                el.scrollIntoView({ block: 'nearest' });
                                            }
                                          }}
                                          onClick={()=>{setForm({...form, categoryId: c.id}); setCategoryQuery(c.name)}}
                                          className={`px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-[#1f1f1f] last:border-0 flex items-center gap-3 transition-colors ${
                                            isSelected ? 'bg-slate-100 dark:bg-[#111111]' : 'hover:bg-slate-50 dark:hover:bg-[#242424] dark:bg-[#1a1a1a]'
                                          }`}
                                        >
                                          <div className={`w-1.5 h-1.5 rounded-full ${
                                            c.type==='Income' ? 'bg-emerald-500' : 
                                            c.type==='Transfer' ? 'bg-blue-500' : 'bg-rose-500'
                                          }`}></div>
                                          <span className="text-sm font-medium text-slate-700 dark:text-[#d8d8d8]">{c.name}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                            })
                            
                            if (!renderedAny && categoryQuery.length > 0) {
                                return <div className="p-4 text-center text-slate-500 text-sm">No categories found</div>
                            }
                            return content
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tags Input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">Tags</label>
                <TagInput
                  tags={form.tags || []}
                  onChange={(newTags) => setForm({ ...form, tags: newTags })}
                />
              </div>

               {/* Receipt Attachment */}
               <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">Receipt</label>
                <div 
                  className={`relative transition-all ${isHoveringReceipt ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 rounded-xl' : ''}`}
                  onMouseEnter={() => setIsHoveringReceipt(true)}
                  onMouseLeave={() => setIsHoveringReceipt(false)}
                >
                  <input 
                    type="file" 
                    id="receipt-upload"
                    accept="image/*,application/pdf"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setForm({...form, receipt: e.target.files[0]});
                      }
                    }}
                    className="hidden"
                  />
                  <label 
                    htmlFor="receipt-upload"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl flex items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] transition-colors"
                  >
                    <span className="mr-4 py-2 px-4 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                      Choose File
                    </span>
                    <span className="text-sm text-slate-500 dark:text-[#888] truncate flex-1">
                      {form.receipt ? form.receipt.name : (form.attachmentPath ? "Existing Receipt Attached" : (isHoveringReceipt ? "Paste to upload..." : "No file chosen"))}
                    </span>
                    
                    {/* Clear pending upload */}
                    {form.receipt && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setForm({...form, receipt: null});
                            }}
                            className="ml-2 p-1 text-slate-500 hover:text-slate-700 dark:text-[#888] dark:hover:text-slate-200"
                            title="Clear selection"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    )}

                    {/* View/Delete existing attachment */}
                    {form.attachmentPath && !form.receipt && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    secureFetch(`/api/transactions/${editingId}/attachment`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                                    .then(res => {
                                        if (!res.ok) throw new Error('Failed to load');
                                        return res.blob();
                                    })
                                    .then(blob => {
                                      const url = window.URL.createObjectURL(blob);
                                      window.open(url, '_blank');
                                    })
                                    .catch(() => showToast('Could not load receipt', 'error'));
                                }}
                                className="ml-2 p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                title="View Receipt"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    showAlert({
                                      title: 'Remove Attachment',
                                      message: 'Are you sure you want to remove this attachment?',
                                      confirmText: 'Remove',
                                      type: 'danger',
                                      onConfirm: () => {
                                        setForm({...form, attachmentPath: null, deleteAttachment: true});
                                      }
                                    });
                                }}
                                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                title="Remove Receipt"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                  <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.636-1.452zM12.9 8.11a.75.75 0 10-1.5 0v6.923a.75.75 0 001.5 0V8.11zm-4.05.75a.75.75 0 00-1.5 0v6.923a.75.75 0 001.5 0V8.86zm9.6 0a.75.75 0 00-1.5 0v6.923a.75.75 0 001.5 0V8.86z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}
                  </label>
                </div>
              </div>
              </div>
              
              {!isSplit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">Asset Item</label>
                  <select
                    value={form.assetItemId || ''}
                    onChange={e => setForm({...form, assetItemId: e.target.value ? Number(e.target.value) : ''})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-sm font-medium text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">No linked asset</option>
                    {assetGroups.map((g: any) => {
                      const rootItems = (g.items || []).filter((it: any) => !it.parentItemId)
                      if (rootItems.length === 0) return null
                      return (
                        <optgroup key={g.id} label={g.name}>
                          {rootItems.map((it: any) => (
                            <option key={it.id} value={it.id}>{it.name}</option>
                          ))}
                        </optgroup>
                      )
                    })}
                  </select>
                 </div>
                </div>
              )}

               {/* Recurring Toggle */}
               {!editingId && !isSplit && (
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#1f1f1f] cursor-pointer hover:bg-slate-200 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={form.isRecurring} 
                        onChange={e => setForm({...form, isRecurring: e.target.checked})}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 dark:border-[#282828] transition-all checked:border-blue-500 checked:bg-blue-500"
                      />
                      <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-[#d8d8d8]">Recurring Transaction</span>
                  </label>
                  
                  {form.isRecurring && (
                    <div className="mt-3 pl-3 border-l-2 border-slate-100 dark:border-[#1f1f1f] space-y-3 animate-in slide-in-from-top-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">Frequency</label>
                        <div className="relative">
                          <div 
                            onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                            className={`w-full px-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-sm font-medium text-slate-900 dark:text-[#f0f0f0] cursor-pointer flex items-center justify-between transition-all ${showFrequencyDropdown ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                          >
                            <span>
                              {form.frequency === 'WEEKLY' && 'Weekly'}
                              {form.frequency === 'BIWEEKLY' && 'Every 2 weeks'}
                              {form.frequency === 'MONTHLY' && 'Monthly'}
                              {form.frequency === 'BIMONTHLY' && 'Every 2 months'}
                              {form.frequency === 'QUARTERLY' && 'Quarterly'}
                              {form.frequency === 'SEMIANNUAL' && 'Every 6 months'}
                              {form.frequency === 'YEARLY' && 'Yearly'}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 text-slate-500 dark:text-[#bbb] transition-transform ${showFrequencyDropdown ? 'rotate-180' : ''}`}>
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </div>
                          
                          {showFrequencyDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowFrequencyDropdown(false)}></div>
                              <div className="absolute z-20 w-full bottom-full mb-1 bg-white dark:bg-[#111111] border border-slate-100 dark:border-[#1f1f1f] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                {[
                                  { val: 'WEEKLY', label: 'Weekly' },
                                  { val: 'BIWEEKLY', label: 'Every 2 weeks' },
                                  { val: 'MONTHLY', label: 'Monthly' },
                                  { val: 'BIMONTHLY', label: 'Every 2 months' },
                                  { val: 'QUARTERLY', label: 'Quarterly' },
                                  { val: 'SEMIANNUAL', label: 'Every 6 months' },
                                  { val: 'YEARLY', label: 'Yearly' }
                                ].map(opt => (
                                  <div 
                                    key={opt.val}
                                    onClick={() => { setForm({...form, frequency: opt.val}); setShowFrequencyDropdown(false); }}
                                    className={`px-4 py-3 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                                      form.frequency === opt.val 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                        : 'text-slate-700 dark:text-[#d8d8d8] hover:bg-slate-200 dark:hover:bg-[#242424] dark:bg-[#1a1a1a]'
                                    }`}
                                  >
                                    {opt.label}
                                    {form.frequency === opt.val && (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1.5">End Date (Inclusive)</label>
                        <div className="relative flex items-center">
                          <input 
                            type="date" 
                            value={form.endDate} 
                            onChange={e => setForm({...form, endDate: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-sm font-medium text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <div className="absolute right-4 pointer-events-none text-slate-300">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 pb-8 sm:pb-6 border-t border-slate-100 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] shrink-0 flex gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                   showAlert({
                      title: 'Delete Transaction',
                      message: 'Are you sure you want to delete this transaction?',
                      confirmText: 'Delete',
                      type: 'danger',
                      onConfirm: async () => {
                          await onDelete(editingId)
                      }
                    });
                  }}
                  className="px-5 py-3 bg-white dark:bg-transparent text-red-500 dark:text-red-400 font-semibold rounded-xl border border-slate-200 dark:border-[#1f1f1f] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm"
                >
                  Delete
                </button>
              )}
              <button 
                onClick={() => handleSubmit()}
                disabled={isSplit ? (!form.splits?.length || !form.amount) : (!form.categoryId || !form.amount)} 
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-sm hover:shadow-glow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {editingId ? 'Save Changes' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </div>
    )
})
