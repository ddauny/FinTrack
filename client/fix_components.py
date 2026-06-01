import re

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'r') as f:
    content = f.read()

# 1. Add CategorySelector inner component before the `return (` of the main component
# That means I should inject a component right above `return (`
category_selector = """
    const CategorySelectorProps = ({
        value,
        onChange,
        placeholder = "Search category...",
        idPrefix
    }: {
        value: number | '';
        onChange: (id: number) => void;
        placeholder?: string;
        idPrefix: string;
    }) => {
        const [query, setQuery] = useState('');
        const [showList, setShowList] = useState(false);
        const [suggestions, setSuggestions] = useState<any[]>([]);
        const [selectedIndex, setSelectedIndex] = useState(-1);

        const groups = useMemo(() => {
            const filtered = categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
            const groups: Record<string, any[]> = { 'Expense': [], 'Income': [], 'Transfer': [] };
            filtered.forEach(c => { if (groups[c.type]) groups[c.type].push(c); });
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

        if (value && categoryMap.current[value]) {
            const c = categoryMap.current[value];
            return (
                <div onClick={() => { onChange(''); setTimeout(() => document.getElementById(`${idPrefix}-search-input`)?.focus(), 0); }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl cursor-pointer border-2 transition-all ${c.type === 'Income' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' : c.type === 'Transfer' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${c.type === 'Income' ? 'bg-emerald-500' : c.type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                        <span className={`font-bold ${c.type === 'Income' ? 'text-emerald-700 dark:text-emerald-400' : c.type === 'Transfer' ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'}`}>{c.name}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-stone-300"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </div>
            );
        }

        return (
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-stone-300"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>
                </div>
                <input id={`${idPrefix}-search-input`} placeholder={placeholder} value={query} onChange={e => {setQuery(e.target.value); setShowList(true)}} onKeyDown={handleKeyDown} onBlur={() => setTimeout(() => setShowList(false), 200)} onFocus={() => setShowList(true)} className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-base font-medium text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" autoComplete="off" />
                {(showList || (query.length > 0 && suggestions.length > 0)) && (
                    <div className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto hide-scrollbar border border-stone-100 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-xl">
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
                                        <div className="px-4 py-2 text-[10px] font-bold text-stone-300 dark:text-stone-500 bg-stone-50 dark:bg-stone-800 uppercase tracking-wider sticky top-0 z-10 border-b border-stone-100 dark:border-stone-800">{type}</div>
                                        {group.map((c: any) => {
                                            traverseIndex++;
                                            const isSelected = traverseIndex === selectedIndex;
                                            return (
                                                <div key={c.id} ref={(el) => { if (isSelected && el) el.scrollIntoView({ block: 'nearest' }); }} onClick={() => { onChange(c.id); setQuery(''); }} className={`px-4 py-3 cursor-pointer border-b border-stone-50 dark:border-stone-800 last:border-0 flex items-center gap-3 transition-colors ${isSelected ? 'bg-stone-100 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${c.type === 'Income' ? 'bg-emerald-500' : c.type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                                                    <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{c.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            });
                            if (!renderedAny && query.length > 0) return <div className="p-4 text-center text-stone-500 text-sm">No categories found</div>;
                            return res;
                        })()}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null

"""

content = content.replace("    if (!isOpen) return null\n\n    return (", category_selector + "    return (")

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'w') as f:
    f.write(content)

