import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatEUR, formatDateDMY } from '@/lib/format';
import { PrivacyNumber } from '@/components/PrivacyNumber';
export function TransactionsPage() {
    const [items, setItems] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Debug log for items changes
    useEffect(() => {
        console.log('Items state changed:', items.length, 'items');
        if (items.length > 0) {
            console.log('First item:', items[0]);
        }
    }, [items]);
    const fileInputRef = useRef(null);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: 0, accountId: '', categoryId: '', notes: '' });
    const [categoryQuery, setCategoryQuery] = useState('');
    const [notesSuggestions, setNotesSuggestions] = useState([]);
    const [showNotesSuggestions, setShowNotesSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [categorySuggestions, setCategorySuggestions] = useState([]);
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
    const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1);
    const [sortBy, setSortBy] = useState('date');
    const [order, setOrder] = useState('desc');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const pageSize = 20;
    async function fetchPage(p, mode = 'replace') {
        if (loading)
            return;
        setLoading(true);
        let query = `?page=${p}&limit=${pageSize}&sortBy=${sortBy}&order=${order}`;
        if (startDate)
            query += `&startDate=${startDate}`;
        if (endDate)
            query += `&endDate=${endDate}`;
        if (selectedCategory) {
            query += `&category=${encodeURIComponent(selectedCategory)}`;
            console.log('Frontend filtering by category:', selectedCategory);
        }
        if (searchQuery.trim()) {
            query += `&search=${encodeURIComponent(searchQuery.trim())}`;
            console.log('Frontend filtering by search:', searchQuery.trim());
        }
        const res = await api.transactions.list(query);
        console.log('Frontend received data:', {
            total: res.total,
            itemsCount: res.items?.length,
            category: selectedCategory,
            query,
            items: res.items
        });
        console.log('Setting items to:', res.items);
        setTotal(res.total || 0);
        if (mode === 'replace') {
            setItems(res.items || []);
            console.log('Items set to:', res.items);
        }
        else {
            // Prevent duplicates by checking if item already exists
            setItems(prev => {
                const existingIds = new Set(prev.map((item) => item.id));
                const newItems = (res.items || []).filter((item) => !existingIds.has(item.id));
                return [...prev, ...newItems];
            });
        }
        setPage(p);
        setLoading(false);
    }
    function refresh() { fetchPage(1, 'replace'); }
    // Handle URL parameters for date and category filtering - MUST be first
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlStartDate = urlParams.get('startDate');
        const urlEndDate = urlParams.get('endDate');
        const urlCategory = urlParams.get('category');
        console.log('Reading URL parameters:', { urlStartDate, urlEndDate, urlCategory });
        if (urlStartDate && urlEndDate) {
            setStartDate(urlStartDate);
            setEndDate(urlEndDate);
        }
        if (urlCategory) {
            setSelectedCategory(urlCategory);
        }
    }, []);
    // Load data and categories after URL parameters are set
    useEffect(() => {
        // Small delay to ensure URL parameters are processed
        const timer = setTimeout(() => {
            console.log('Loading data with filters:', { startDate, endDate, selectedCategory });
            refresh();
        }, 100);
        return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
        Promise.all([api.accounts.list(), api.categories.list()]).then(([accs, cats]) => {
            setCategories(cats);
            if (!form.accountId && accs[0])
                setForm((f) => ({ ...f, accountId: accs[0].id }));
            if (!form.categoryId && cats[0])
                setForm((f) => ({ ...f, categoryId: cats[0].id }));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // re-fetch on sort change or filter change
    useEffect(() => {
        setPage(1); // Reset to first page when filters change
        setItems([]); // Clear existing items to prevent duplicates
        // Force refresh with new parameters
        setTimeout(() => refresh(), 50); // Small delay to ensure state is updated
    }, [sortBy, order, startDate, endDate, selectedCategory, searchQuery]);
    // infinite scroll on window
    useEffect(() => {
        function onScroll() {
            const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
            const hasMore = items.length < total;
            // Only trigger infinite scroll if we're not changing sort/filters
            if (nearBottom && hasMore && !loading)
                fetchPage(page + 1, 'append');
        }
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, [items.length, total, loading, page]);
    async function ensureAccountId() {
        if (form.accountId)
            return Number(form.accountId);
        const accounts = await api.accounts.list();
        if (accounts.length > 0) {
            const id = accounts[0].id;
            setForm((f) => ({ ...f, accountId: id }));
            return id;
        }
        const created = await api.accounts.create({ name: 'Primary', initialBalance: 0 });
        setForm((f) => ({ ...f, accountId: created.id }));
        return created.id;
    }
    async function createTxn(e) {
        e.preventDefault();
        if (!form.categoryId) {
            alert('Please select a category.');
            return;
        }
        const acctId = await ensureAccountId();
        const payload = { ...form, accountId: acctId, amount: Number(form.amount) };
        if (editingId)
            await api.transactions.update(editingId, payload);
        else
            await api.transactions.create(payload);
        setShowModal(false);
        setEditingId(null);
        setShowNotesSuggestions(false);
        setNotesSuggestions([]);
        setSelectedSuggestionIndex(-1);
        setShowCategorySuggestions(false);
        setCategorySuggestions([]);
        setSelectedCategoryIndex(-1);
        refresh();
    }
    async function onFileSelected(e) {
        const f = e.target.files?.[0];
        if (!f)
            return;
        await api.transactions.importCsv(f);
        e.target.value = '';
        refresh();
    }
    function toggleSort(column) {
        if (sortBy === column)
            setOrder(order === 'asc' ? 'desc' : 'asc');
        else {
            setSortBy(column);
            setOrder('asc');
        }
    }
    // Handle notes autocomplete
    async function handleNotesChange(e) {
        const value = e.target.value;
        setForm({ ...form, notes: value });
        if (value.length >= 2) {
            try {
                const suggestions = await api.transactions.getNotes(value);
                setNotesSuggestions(suggestions);
                setShowNotesSuggestions(suggestions.length > 0);
                setSelectedSuggestionIndex(-1);
            }
            catch (error) {
                console.error('Error fetching notes suggestions:', error);
            }
        }
        else {
            setShowNotesSuggestions(false);
            setNotesSuggestions([]);
        }
    }
    function handleNotesKeyDown(e) {
        if (!showNotesSuggestions)
            return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestionIndex(prev => prev < notesSuggestions.length - 1 ? prev + 1 : 0);
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : notesSuggestions.length - 1);
        }
        else if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            if (notesSuggestions.length > 0) {
                const indexToUse = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
                setForm({ ...form, notes: notesSuggestions[indexToUse] });
                setShowNotesSuggestions(false);
                setSelectedSuggestionIndex(-1);
            }
        }
        else if (e.key === 'Escape') {
            setShowNotesSuggestions(false);
            setSelectedSuggestionIndex(-1);
        }
    }
    function selectSuggestion(suggestion) {
        setForm({ ...form, notes: suggestion });
        setShowNotesSuggestions(false);
        setSelectedSuggestionIndex(-1);
    }
    // Handle category autocomplete
    function handleCategoryChange(e) {
        const value = e.target.value;
        setCategoryQuery(value);
        if (value.length >= 1) {
            const filtered = categories.filter(c => c.name.toLowerCase().includes(value.toLowerCase()));
            setCategorySuggestions(filtered);
            setShowCategorySuggestions(filtered.length > 0);
            setSelectedCategoryIndex(-1);
        }
        else {
            setShowCategorySuggestions(false);
            setCategorySuggestions([]);
        }
    }
    function handleCategoryKeyDown(e) {
        if (!showCategorySuggestions)
            return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedCategoryIndex(prev => prev < categorySuggestions.length - 1 ? prev + 1 : 0);
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedCategoryIndex(prev => prev > 0 ? prev - 1 : categorySuggestions.length - 1);
        }
        else if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            if (categorySuggestions.length > 0) {
                const indexToUse = selectedCategoryIndex >= 0 ? selectedCategoryIndex : 0;
                const category = categorySuggestions[indexToUse];
                setForm({ ...form, categoryId: category.id });
                setCategoryQuery(category.name);
                setShowCategorySuggestions(false);
                setSelectedCategoryIndex(-1);
            }
        }
        else if (e.key === 'Escape') {
            setShowCategorySuggestions(false);
            setSelectedCategoryIndex(-1);
        }
    }
    function selectCategorySuggestion(category) {
        setForm({ ...form, categoryId: category.id });
        setCategoryQuery(category.name);
        setShowCategorySuggestions(false);
        setSelectedCategoryIndex(-1);
    }
    const sortIcon = useMemo(() => order === 'asc' ? '▲' : '▼', [order]);
    const categoryMap = useMemo(() => {
        const m = {};
        for (const c of categories)
            m[c.id] = c;
        return m;
    }, [categories]);
    return (_jsxs("div", { className: "bg-white p-2 sm:p-4 rounded shadow", children: [_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "font-semibold mb-3", children: "Transactions" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm font-medium text-gray-700", children: "From Date" }), _jsx("input", { type: "date", value: startDate, onChange: e => setStartDate(e.target.value), className: "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm font-medium text-gray-700", children: "To Date" }), _jsx("input", { type: "date", value: endDate, onChange: e => setEndDate(e.target.value), className: "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm font-medium text-gray-700", children: "Search" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", placeholder: "Search by category, amount, or notes...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), className: "flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" }), _jsx("button", { onClick: () => { setStartDate(''); setEndDate(''); setSelectedCategory(''); setSearchQuery(''); }, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-blue-500 whitespace-nowrap", children: "Clear" })] })] }), (startDate || endDate || selectedCategory || searchQuery) && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg", children: selectedCategory ? `Category: ${selectedCategory}` :
                                            searchQuery ? `Search: "${searchQuery}"` :
                                                'Date filtered' }), _jsx("button", { onClick: () => { setStartDate(''); setEndDate(''); setSelectedCategory(''); setSearchQuery(''); }, className: "text-xs text-red-600 hover:text-red-800", children: "\u00D7" })] }))] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 mt-6", children: [_jsx("input", { ref: fileInputRef, type: "file", accept: ".csv", onChange: onFileSelected, className: "hidden" }), _jsxs("button", { title: "Import CSV", onClick: () => fileInputRef.current?.click(), className: "flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500", "aria-label": "Import CSV", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "w-4 h-4", children: [_jsx("path", { d: "M12 3a1 1 0 011 1v9.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 13.586V4a1 1 0 011-1z" }), _jsx("path", { d: "M5 20a2 2 0 01-2-2v-2a1 1 0 112 0v2h14v-2a1 1 0 112 0v2a2 2 0 01-2 2H5z" })] }), _jsx("span", { children: "Import CSV" })] }), _jsxs("button", { title: "Add Transaction", onClick: () => setShowModal(true), className: "flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500", "aria-label": "Add Transaction", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "w-4 h-4", children: _jsx("path", { d: "M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z" }) }), _jsx("span", { children: "Add Transaction" })] })] })] }), _jsx("div", { className: "block sm:hidden space-y-2", children: items.map((t) => (_jsxs("div", { className: "bg-gray-50 p-3 rounded border", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("div", { className: "text-sm font-medium", children: formatDateDMY(t.date) }), _jsx("div", { className: `text-sm font-bold ${(t.type === 'Income' || categoryMap[t.categoryId]?.type === 'Income' || t.category?.type === 'Income') ? 'text-green-700' : 'text-red-700'}`, children: _jsx(PrivacyNumber, { value: t.amount, children: formatEUR(t.amount) }) })] }), _jsx("div", { className: "text-sm text-gray-600 mb-1", children: t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId }), t.notes && _jsx("div", { className: "text-xs text-gray-500 mb-2", children: t.notes }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { title: "Edit", onClick: () => { setEditingId(t.id); setForm({ date: String(t.date).slice(0, 10), amount: t.amount, accountId: t.accountId, categoryId: t.categoryId, notes: t.notes || '' }); setShowModal(true); }, className: "flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-200 rounded", "aria-label": "Edit Transaction", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "w-3 h-3", children: [_jsx("path", { d: "M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z" }), _jsx("path", { d: "M5.25 19.5h13.5" })] }), "Edit"] }), _jsxs("button", { title: "Delete", onClick: async () => { try {
                                        await api.transactions.remove(t.id);
                                        setItems(prev => prev.filter(x => x.id !== t.id));
                                        setTotal(prev => Math.max(0, prev - 1));
                                    }
                                    catch { /* ignore */ } }, className: "flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-red-600 text-white rounded", "aria-label": "Delete Transaction", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "w-3 h-3", children: _jsx("path", { d: "M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z" }) }), "Delete"] })] })] }, t.id))) }), _jsx("div", { className: "hidden sm:block overflow-x-auto -mx-4 sm:mx-0", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left border-b select-none", children: [_jsxs("th", { className: "p-2 cursor-pointer min-w-[100px]", onClick: () => toggleSort('date'), children: ["Date ", sortBy === 'date' && sortIcon] }), _jsxs("th", { className: "p-2 cursor-pointer min-w-[120px]", onClick: () => toggleSort('amount'), children: ["Amount ", sortBy === 'amount' && sortIcon] }), _jsxs("th", { className: "p-2 cursor-pointer min-w-[120px]", onClick: () => toggleSort('categoryId'), children: ["Category ", sortBy === 'categoryId' && sortIcon] }), _jsxs("th", { className: "p-2 cursor-pointer min-w-[150px] hidden sm:table-cell", onClick: () => toggleSort('notes'), children: ["Notes ", sortBy === 'notes' && sortIcon] }), _jsx("th", { className: "p-2 min-w-[100px]", children: "Actions" })] }) }), _jsx("tbody", { children: items.map((t) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "p-2 min-w-[100px]", children: formatDateDMY(t.date) }), _jsx("td", { className: `p-2 min-w-[120px] ${(t.type === 'Income' || categoryMap[t.categoryId]?.type === 'Income' || t.category?.type === 'Income') ? 'text-green-700' : 'text-red-700'}`, children: _jsx(PrivacyNumber, { value: t.amount, children: formatEUR(t.amount) }) }), _jsx("td", { className: "p-2 min-w-[120px]", children: t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId }), _jsx("td", { className: "p-2 min-w-[150px] hidden sm:table-cell", children: t.notes }), _jsx("td", { className: "p-2 min-w-[100px]", children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-1", children: [_jsx("button", { title: "Edit", onClick: () => { setEditingId(t.id); setForm({ date: String(t.date).slice(0, 10), amount: t.amount, accountId: t.accountId, categoryId: t.categoryId, notes: t.notes || '' }); setShowModal(true); }, className: "p-1 sm:p-2 text-xs sm:text-sm bg-gray-200 rounded", "aria-label": "Edit Transaction", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "w-3 h-3 sm:w-4 sm:h-4", children: [_jsx("path", { d: "M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z" }), _jsx("path", { d: "M5.25 19.5h13.5" })] }) }), _jsx("button", { title: "Delete", onClick: async () => { try {
                                                        await api.transactions.remove(t.id);
                                                        setItems(prev => prev.filter(x => x.id !== t.id));
                                                        setTotal(prev => Math.max(0, prev - 1));
                                                    }
                                                    catch { /* ignore */ } }, className: "p-1 sm:p-2 text-xs sm:text-sm bg-red-600 text-white rounded", "aria-label": "Delete Transaction", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "w-3 h-3 sm:w-4 sm:h-4", children: _jsx("path", { d: "M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z" }) }) })] }) })] }, t.id))) })] }) }), _jsx("div", { className: "py-3 text-center text-sm text-gray-600", children: loading ? 'Loading…' : (items.length >= total ? 'All loaded' : '') }), showModal && (_jsx("div", { className: "fixed inset-0 bg-black/40 flex items-center justify-center p-2 sm:p-4", children: _jsxs("form", { onSubmit: createTxn, className: "bg-white rounded p-4 w-full max-w-sm space-y-2 max-h-[90vh] overflow-y-auto", children: [_jsx("div", { className: "font-semibold mb-2", children: editingId ? 'Edit Transaction' : 'Add Transaction' }), _jsx("div", { className: "text-xs text-gray-500 mb-2", children: "All fields are required except Notes." }), _jsx("label", { className: "text-sm", children: "Date" }), _jsx("input", { type: "date", value: form.date, onChange: e => setForm({ ...form, date: e.target.value }), className: "w-full border p-2 rounded" }), _jsx("label", { className: "text-sm", children: "Amount (e.g., 24.99)" }), _jsx("input", { type: "number", step: "0.01", value: form.amount, onChange: e => setForm({ ...form, amount: e.target.value }), placeholder: "Amount", className: "w-full border p-2 rounded" }), _jsx("label", { className: "text-sm", children: "Category" }), _jsxs("div", { className: "relative", children: [_jsx("input", { placeholder: "Search category...", value: categoryQuery, onChange: handleCategoryChange, onKeyDown: handleCategoryKeyDown, onBlur: () => setTimeout(() => setShowCategorySuggestions(false), 200), onFocus: () => categoryQuery.length >= 1 && categorySuggestions.length > 0 && setShowCategorySuggestions(true), className: "w-full border p-2 rounded" }), showCategorySuggestions && categorySuggestions.length > 0 && (_jsx("div", { className: "absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto", children: categorySuggestions.map((c, index) => (_jsx("div", { onClick: () => selectCategorySuggestion(c), className: `px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === selectedCategoryIndex ? 'bg-blue-100' : ''} ${c.type === 'Income' ? 'text-green-700' : 'text-red-700'}`, children: c.name }, c.id))) }))] }), _jsx("div", { className: "max-h-40 overflow-auto border rounded", children: categories
                                .filter(c => c.name.toLowerCase().includes(categoryQuery.toLowerCase()))
                                .map(c => (_jsx("div", { onClick: () => { setForm({ ...form, categoryId: c.id }); setCategoryQuery(c.name); }, className: `px-3 py-2 cursor-pointer hover:bg-gray-100 ${form.categoryId === c.id ? 'bg-gray-100' : ''} ${c.type === 'Income' ? 'text-green-700' : 'text-red-700'}`, children: c.name }, c.id))) }), _jsx("label", { className: "text-sm", children: "Notes" }), _jsxs("div", { className: "relative", children: [_jsx("input", { value: form.notes, onChange: handleNotesChange, onKeyDown: handleNotesKeyDown, onBlur: () => setTimeout(() => setShowNotesSuggestions(false), 200), onFocus: () => form.notes.length >= 2 && notesSuggestions.length > 0 && setShowNotesSuggestions(true), placeholder: "Optional notes", className: "w-full border p-2 rounded" }), showNotesSuggestions && notesSuggestions.length > 0 && (_jsx("div", { className: "absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto", children: notesSuggestions.map((suggestion, index) => (_jsx("div", { onClick: () => selectSuggestion(suggestion), className: `px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === selectedSuggestionIndex ? 'bg-blue-100' : ''}`, children: suggestion }, index))) }))] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => { setShowModal(false); setEditingId(null); setShowNotesSuggestions(false); setNotesSuggestions([]); setSelectedSuggestionIndex(-1); setShowCategorySuggestions(false); setCategorySuggestions([]); setSelectedCategoryIndex(-1); }, className: "px-3 py-2 rounded", children: "Cancel" }), _jsx("button", { type: "submit", disabled: !form.categoryId || !form.amount, className: "px-3 py-2 rounded bg-blue-600 disabled:bg-blue-400 text-white", children: "Save" })] })] }) }))] }));
}
