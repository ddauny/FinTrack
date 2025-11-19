import { useEffect, useMemo, useRef, useState } from 'react'
import { formatEUR, formatDateDMY, formatDateMonthYear } from '../lib/format'
import { Parser } from 'expr-eval'
// @ts-ignore
import NotePopover from '../components/NotePopover' // Assicurati che questo percorso sia corretto
import { PrivacyNumber } from '@/components/PrivacyNumber'

// --- Icone per la UI ---
const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 10.5 6.5 7.5 12 7.5c5.5 0 8.577 3 9.964 4.183c.397.522.397 1.35 0 1.872C20.577 14.5 17.5 17.5 12 17.5c-5.5 0-8.577-3-9.964-4.183Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
)
const IconEyeSlash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 14.39 6.226 17.25 12 17.25c.996 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c5.774 0 8.774 2.86 10.066 5.176a1.011 1.011 0 0 1 0 .648c-.093.228-.296.582-.586.979M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.175 6.338 19.65 19.65M4.5 12.442V12a10.053 10.053 0 0 1 1.615-5.223" />
  </svg>
)

type Group = { id:number; name:string; items: Item[] }
type Item = { id:number; name:string; description?:string; parentItemId?:number|null; hidden?: boolean; depreciationAmount?: number; valuations?: { month:string; value:number; formula?: string | null; note?: string | null }[] }

export function AssetsPage() {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const [groups, setGroups] = useState<Group[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [manualMonths, setManualMonths] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<{ itemId:number; month:string; initial:string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [selectedCell, setSelectedCell] = useState<{ itemId:number; month:string } | null>(null)
  const [showNoteFor, setShowNoteFor] = useState<{ itemId:number; month:string } | null>(null)
  const [noteValue, setNoteValue] = useState<string>('')
  const [hoveredRowIdx, setHoveredRowIdx] = useState<number | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ itemId:number; month:string } | null>(null)
  const [suggestion, setSuggestion] = useState<number | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  async function refresh() {
    const res = await fetch('/api/asset-groups', { headers: tokenHeader() })
    const data = await res.json()
    setGroups(data)
    const set = new Set<string>()
    const nowKey = monthKey(new Date())
    set.add(nowKey)
    data.forEach((g:Group)=> g.items?.forEach((it:Item)=> it.valuations?.forEach(v=> set.add(monthKey(new Date(v.month))))))
    
    manualMonths.forEach(month => set.add(month))
    
    const sorted = Array.from(set).sort((a,b)=> new Date(b).getTime() - new Date(a).getTime())
    setMonths(sorted)
  }
  useEffect(()=>{ refresh() }, [])
  
  useEffect(() => {
    if (manualMonths.size > 0) {
      refresh()
    }
  }, [manualMonths])

  // Auto-detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const rows = useMemo(()=>{
    const r: { depth:number; isGroup:boolean; groupId?:number; item?:Item; name:string }[] = []
    for (const g of groups) {
      r.push({ depth:0, isGroup:true, groupId:g.id, name:g.name })
      const items = (g.items||[])
      const roots = items.filter(it=> !it.parentItemId)
      const childrenOf = (id:number)=> items.filter(it=> it.parentItemId===id)
      const emitSiblings = (list: Item[], depth: number)=>{
        for (const it of list) {
          if (it.hidden) continue
          r.push({ depth, isGroup:false, groupId:g.id, item:it, name:it.name })
          const children = childrenOf(it.id)
          if (children.length) emitSiblings(children, depth+1)
        }
      }
      emitSiblings(roots, 1)
    }
    return r
  }, [groups])

  function tokenHeader(): Record<string, string> {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  function monthKey(d: Date) {
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth()+1).padStart(2,'0')
    return `${yyyy}-${mm}-01`
  }

  function valueFor(item: Item|undefined, month: string, includeHidden: boolean = false): number {
    if (!item) return 0
    const direct = item.valuations?.find(v=> monthKey(new Date(v.month))===month)?.value
    if (direct !== undefined) return Number(direct)
    const group = groups.find(g=> g.items?.some(i=> i.id===item.id))
    if (!group) return 0
    const children = (group.items||[]).filter(it=> it.parentItemId===item.id && (includeHidden || !it.hidden))
    if (children.length===0) return 0
    return children.reduce((sum, ch)=> sum + valueFor(ch, month, includeHidden), 0)
  }

  function isLeaf(item: Item|undefined): boolean {
    if (!item) return false
    const group = groups.find(g=> g.items?.some(i=> i.id===item.id))
    if (!group) return true
    return !(group.items||[]).some(it=> it.parentItemId===item.id)
  }

  async function toggleHidden(item: Item) {
    try {
      await fetch(`/api/asset-items/${item.id}`, { 
        method:'PUT', 
        headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
        body: JSON.stringify({ hidden: !item.hidden }) 
      })
      await refresh()
    } catch (e) {
      console.error("Failed to toggle hidden state:", e)
    }
  }

  function groupOfItem(item: Item | undefined) {
    if (!item) return undefined
    return groups.find(g=> g.items?.some(i=> i.id===item.id))
  }

  function childrenOfItem(item: Item | undefined): Item[] {
    const g = groupOfItem(item)
    if (!g || !item) return []
    return (g.items||[]).filter(it=> it.parentItemId===item.id)
  }

  function hasChildren(item: Item | undefined): boolean {
    return childrenOfItem(item).length > 0
  }

  function hasVisibleChildren(item: Item | undefined): boolean {
    return childrenOfItem(item).some(ch=> !ch.hidden)
  }

  async function collapseItem(item: Item) {
    await fetch(`/api/asset-items/${item.id}/collapse`, { method:'POST', headers: { ...tokenHeader() } })
    await refresh()
  }

  async function expandItem(item: Item) {
    await fetch(`/api/asset-items/${item.id}/expand`, { method:'POST', headers: { ...tokenHeader() } })
    await refresh()
  }

  function onCellClick(item: Item|undefined, month: string) {
    if (!item) return
    if (!isLeaf(item)) return
    
    const valuation = item.valuations?.find(v=> new Date(v.month).toISOString().slice(0,10) === month)
    const raw = valuation && valuation.formula ? String(valuation.formula) : String(valueFor(item, month) || '')
    
    // Calculate suggestion if cell is empty and item has depreciation
    let suggestedValue: number | null = null
    const currentValue = valueFor(item, month)
    
    console.log('Cell click debug:', {
      itemName: item.name,
      month,
      hasValuation: !!valuation,
      currentValue,
      hasDepreciation: !!item.depreciationAmount,
      depreciationAmount: item.depreciationAmount
    })
    
    // Show suggestion if cell is empty (no value or value is 0) and item has depreciation
    if (item.depreciationAmount && currentValue === 0) {
      // Find previous month value - use direct valuation, not aggregated
      const currentMonthDate = new Date(month)
      const prevMonthDate = new Date(currentMonthDate)
      prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1)
      const prevMonthKey = monthKey(prevMonthDate)
      
      // Get direct valuation value, not aggregated from children
      const prevValuation = item.valuations?.find(v=> monthKey(new Date(v.month)) === prevMonthKey)
      const prevValue = prevValuation ? Number(prevValuation.value) : 0
      
      console.log('Depreciation calculation:', {
        item: item.name,
        currentMonth: month,
        prevMonth: prevMonthKey,
        prevValuation: prevValuation ? Number(prevValuation.value) : 'not found',
        depreciation: item.depreciationAmount,
        suggested: prevValue - Number(item.depreciationAmount)
      })
      
      if (prevValue > 0) {
        suggestedValue = Math.max(0, prevValue - Number(item.depreciationAmount))
      }
    }
    
    setSuggestion(suggestedValue)
    setEditing({ itemId: item.id, month, initial: raw })
    setEditValue(raw)
    setSelectedCell({ itemId: item.id, month })
  }

  function acceptSuggestion() {
    if (suggestion !== null) {
      setEditValue(String(suggestion))
      // Don't clear suggestion yet, will be cleared on save
    }
  }

  async function acceptAndSaveSuggestion() {
    if (!editing || suggestion === null) return
    const { itemId, month } = editing
    
    // Save the suggestion value directly
    const payload: any = { 
      month,
      value: suggestion,
      formula: null
    }
    
    const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
    const existingVal = item?.valuations?.find(v=> new Date(v.month).toISOString().slice(0,10) === month)
    if (existingVal && existingVal.note) payload.note = existingVal.note
    
    try {
      await fetch(`/api/asset-items/${itemId}/valuations`, { 
        method:'POST', 
        headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
        body: JSON.stringify(payload) 
      })
      await refresh()
    } catch (err) {
      console.error('Error saving valuation:', err)
    } finally {
      setEditing(null)
      setEditValue('')
      setSuggestion(null)
    }
  }

  async function saveEdit() {
    if (!editing) return
    const { itemId, month } = editing
    let payload: any = { month }
    const trimmed = (editValue || '').trim()
    
    // Clear suggestion after we've used editValue
    setSuggestion(null)
    if (trimmed.startsWith('=')) {
      try {
        const parser = new Parser()
        const expr = trimmed.slice(1)
        const result = parser.evaluate(expr)
        const numeric = Number(result || 0)
        payload.value = Number.isFinite(numeric) ? numeric : 0
        payload.formula = trimmed
      } catch (err) {
        console.error('Formula parse error', err)
        payload.value = 0
        payload.formula = trimmed
      }
    } else {
      const numeric = Number(trimmed || 0)
      payload.value = Number.isFinite(numeric) ? numeric : 0
      payload.formula = null
    }
    const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
    const existingVal = item?.valuations?.find(v=> new Date(v.month).toISOString().slice(0,10) === month)
    if (existingVal && existingVal.note) payload.note = existingVal.note
    try {
      await fetch(`/api/asset-items/${itemId}/valuations`, { method:'POST', headers:{ 'Content-Type':'application/json', ...tokenHeader() }, body: JSON.stringify(payload) })
      await refresh()
    } catch (err) {
      console.error('Error saving valuation:', err)
    } finally {
      setEditing(null)
      setEditValue('')
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!editing) return;
    
    // If there's a suggestion and Tab is pressed, accept and save it, then navigate
    if (e.key === 'Tab' && suggestion !== null && !editValue.trim()) {
      e.preventDefault();
      const { itemId, month } = editing;
      await acceptAndSaveSuggestion();
      
      // Navigate to next/previous row after saving
      const currentRowIndex = rows.findIndex(r => r.item?.id === itemId);
      if (currentRowIndex === -1) return;
      const direction = e.shiftKey ? -1 : 1;
      let nextRowIndex = currentRowIndex + direction;
      while (nextRowIndex >= 0 && nextRowIndex < rows.length) {
        const nextRow = rows[nextRowIndex];
        if (nextRow.item && isLeaf(nextRow.item)) {
          onCellClick(nextRow.item, month);
          return;
        }
        nextRowIndex += direction;
      }
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveEdit();
    } 
    else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(null);
      setEditValue('');
      setSuggestion(null);
    } 
    else if (e.key === 'Tab') {
      e.preventDefault(); 
      const { itemId, month } = editing; 
      await saveEdit(); 
      const currentRowIndex = rows.findIndex(r => r.item?.id === itemId);
      if (currentRowIndex === -1) return; 
      const direction = e.shiftKey ? -1 : 1;
      let nextRowIndex = currentRowIndex + direction;
      while (nextRowIndex >= 0 && nextRowIndex < rows.length) {
        const nextRow = rows[nextRowIndex];
        if (nextRow.item && isLeaf(nextRow.item)) {
          onCellClick(nextRow.item, month); 
          return; 
        }
        nextRowIndex += direction;
      }
    }
  }

  // --- MODIFICA: Corretto il gestore del tasto 'N' per l'highlight ---
  useEffect(()=>{
    const onKey = (e: KeyboardEvent)=>{
      // Non fare nulla se l'utente sta già scrivendo in un input o se il modal è già aperto
      if (editing || showNoteFor) return; 
      
      if (e.key.toLowerCase() === 'n'){
        // Usa hoveredCell invece di selectedCell
        if (hoveredCell) {
          e.preventDefault();
          e.stopPropagation();

          const { itemId, month } = hoveredCell
          const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
          const v = item?.valuations?.find(v=> new Date(v.month).toISOString().slice(0,10) === month)
          setNoteValue(v?.note || '')
          setShowNoteFor(hoveredCell)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [hoveredCell, groups, editing, showNoteFor])
  // --- FINE MODIFICA ---

  // --- MODIFICA: Corretta la funzione 'saveNote' per l'errore 500 ---
  async function saveNote(itemId: number, month: string, note: string) {
    const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
    const v = item?.valuations?.find(v=> new Date(v.month).toISOString().slice(0,10) === month)
    const payload: any = { month }
    
    if (v) {
      payload.value = Number(v.value || 0)
      payload.formula = v.formula ?? null // Preserve existing formula
    } else {
      // FIX: Invia sempre i campi 'value' e 'formula' per evitare errori 500
      payload.value = 0
      payload.formula = null // <-- ECCO LA CORREZIONE
    }
    payload.note = note && note.trim() !== '' ? note : null;  

  // LOG AGGIUNTI
  console.log('== SAVE NOTE DEBUG ==')
  console.log('itemId:', itemId)
  console.log('month:', month)
  console.log('note:', note)
  console.log('payload:', payload)

    if (!payload.value || !payload.month) {
  alert("Value or month is missing");
  return;
}
    try {
      const res = await fetch(`/api/asset-items/${itemId}/valuations`, { 
        method:'POST', 
        headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
        body: JSON.stringify(payload) 
      })

      if (!res.ok) {
        // Gestisce errori 500 o 400 dal backend
        console.error("Error saving note:", res.status, res.statusText)
        alert("Failed to save note. Check console for details.") // Feedback per l'utente
        return; // Non chiudere il popover se il salvataggio fallisce
      }

      // Successo!
      await refresh()
      setShowNoteFor(null)
      setNoteValue('')
    } catch (err) {
      console.error("Fetch error saving note:", err)
      alert("Failed to save note. Check console for details.")
    }
  }
  // --- FINE MODIFICA ---

  function countHiddenRows() {
    return groups.reduce((acc, g)=> acc + ((g.items||[]).filter(it=> it.hidden).length), 0)
  }

  async function hideGroup(groupId: number) {
    const g = groups.find(x=> x.id===groupId)
    if (!g) return
    try {
      await fetch(`/api/asset-groups/${groupId}/hide-all`, { 
        method:'POST', 
        headers: { ...tokenHeader() } 
      })
    } catch(e){ 
      console.error(e) 
    }
    await refresh()
  }

  async function showAllHidden() {
    try {
      await fetch(`/api/asset-items/show-all`, { 
        method:'POST', 
        headers: { ...tokenHeader() } 
      })
    } catch(e) {
      console.error(e)
    }
    await refresh()
  }
  
  async function addPrevMonth() {
    if (months.length===0) {
      const mk = monthKey(new Date())
      setManualMonths(prev => new Set([...prev, mk]))
      setMonths([mk])
      return
    }
    const oldest = new Date(months[months.length-1])
  const prev = new Date(oldest)
  // Use UTC setters/getters to match monthKey (which uses UTC) and avoid
  // timezone shifts that can move the local date to the previous day and
  // cause an off-by-one-month when decrementing.
  prev.setUTCMonth(prev.getUTCMonth()-1)
    const mk = monthKey(prev)
    if (!months.includes(mk)) {
      setManualMonths(prev => new Set([...prev, mk]))
      setMonths([...months, mk])
    }
  }

  async function addNextMonth() {
    if (months.length===0) {
      const mk = monthKey(new Date())
      setManualMonths(prev => new Set([...prev, mk]))
      setMonths([mk])
      return
    }
    const newest = new Date(months[0])
  const nxt = new Date(newest)
  // Use UTC setters/getters to match monthKey (which uses UTC) and avoid
  // timezone shifts when incrementing the month.
  nxt.setUTCMonth(nxt.getUTCMonth()+1)
    const mk = monthKey(nxt)
    if (!months.includes(mk)) {
      try {
        await fetch('/api/asset-valuations/apply-depreciation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...tokenHeader() },
          body: JSON.stringify({ month: mk })
        })
        setManualMonths(prev => new Set([...prev, mk]))
        setMonths([mk, ...months])
      } catch (error) {
        console.error('Error applying depreciation:', error)
        setManualMonths(prev => new Set([...prev, mk]))
        setMonths([mk, ...months])
      }
    }
  }

  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fixedScrollRef = useRef<HTMLDivElement>(null)
  const [showFixedScrollbar, setShowFixedScrollbar] = useState(false)
  const [scrollContentWidth, setScrollContentWidth] = useState(0)
  const [fixedBarLeft, setFixedBarLeft] = useState(0)
  const [fixedBarWidth, setFixedBarWidth] = useState(0)
  useEffect(()=>{
    const sc = scrollRef.current
    if (!sc) return
    const update = ()=>{
      const overflow = sc.scrollWidth > sc.clientWidth
      setShowFixedScrollbar(overflow)
      setScrollContentWidth(sc.scrollWidth)
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        setFixedBarLeft(rect.left)
        setFixedBarWidth(rect.width)
      }
    }
    update()
    const onResize = ()=> update()
    window.addEventListener('resize', onResize)
    sc.addEventListener('scroll', onResize, { passive: true } as any)
    let syncing = false
    const onMainScroll = ()=>{
      if (!fixedScrollRef.current) return
      if (syncing) return
      syncing = true
      fixedScrollRef.current.scrollLeft = sc.scrollLeft
      syncing = false
    }
    const onFixedScroll = ()=>{
      if (!fixedScrollRef.current) return
      if (syncing) return
      syncing = true
      sc.scrollLeft = fixedScrollRef.current.scrollLeft
      syncing = false
    }
    sc.addEventListener('scroll', onMainScroll)
    fixedScrollRef.current?.addEventListener('scroll', onFixedScroll)
    return ()=>{
      window.removeEventListener('resize', onResize)
      sc.removeEventListener('scroll', onResize as any)
      sc.removeEventListener('scroll', onMainScroll)
      fixedScrollRef.current?.removeEventListener('scroll', onFixedScroll)
    }
  }, [groups, months])

  useEffect(()=>{
    if (!showFixedScrollbar) return
    if (!fixedScrollRef.current) return
    fixedScrollRef.current.style.width = '100%'
  }, [showFixedScrollbar, scrollContentWidth])

  // Mobile Card View Component
  const MobileView = () => {
    const toggleGroup = (groupId: number) => {
      setExpandedGroups(prev => {
        const newSet = new Set(prev)
        if (newSet.has(groupId)) {
          newSet.delete(groupId)
        } else {
          newSet.add(groupId)
        }
        return newSet
      })
    }

    return (
      <div className="space-y-4 p-2">
        {/* Total Summary Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg p-4 text-white shadow-lg">
          <h3 className="text-sm font-medium opacity-90 mb-1">Total Net Worth</h3>
          <div className="text-2xl font-bold">
            <PrivacyNumber value={groups.reduce((sum, g)=>{
              const roots = (g.items||[]).filter(it=> !it.parentItemId)
              return sum + roots.reduce((acc, it)=> acc + valueFor(it, months[0], true), 0)
            }, 0)}>
              {formatEUR(groups.reduce((sum, g)=>{
                const roots = (g.items||[]).filter(it=> !it.parentItemId)
                return sum + roots.reduce((acc, it)=> acc + valueFor(it, months[0], true), 0)
              }, 0))}
            </PrivacyNumber>
          </div>
          <div className="text-xs opacity-75 mt-1">
            {months[0] && formatDateMonthYear(new Date(months[0]))}
          </div>
        </div>

        {/* Groups as expandable cards */}
        {groups.map((group, groupIndex) => {
          const isExpanded = expandedGroups.has(group.id)
          const groupTotal = (group.items||[]).filter(it=> !it.parentItemId).reduce((sum, it)=> sum + valueFor(it, months[0], true), 0)
          
          return (
            <div key={group.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${groupIndex > 0 ? 'mt-6' : ''}`}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full p-4 flex items-center justify-between bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    <PrivacyNumber value={groupTotal}>
                      {formatEUR(groupTotal)}
                    </PrivacyNumber>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(group.items||[]).filter(it => !it.hidden).length} items
                  </div>
                </div>
              </button>

              {/* Group Items - shown when expanded */}
              {isExpanded && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(group.items||[]).filter(it => !it.parentItemId && !it.hidden).map(item => {
                    const itemValue = valueFor(item, months[0], false)
                    
                    return (
                      <div key={item.id} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {item.name}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            <PrivacyNumber value={itemValue}>
                              {formatEUR(itemValue)}
                            </PrivacyNumber>
                          </span>
                        </div>
                        
                        {/* Last 3 months mini-trend */}
                        <div className="flex gap-2 text-xs">
                          {months.slice(0, 3).map((m, idx) => {
                            const val = valueFor(item, m, false)
                            return (
                              <div key={m} className={`flex-1 ${idx === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700/50'} rounded p-1.5`}>
                                <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">
                                  {formatDateMonthYear(new Date(m))}
                                </div>
                                <div className={`font-medium ${idx === 0 ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {val > 0 ? (
                                    <PrivacyNumber value={val}>
                                      {formatEUR(val)}
                                    </PrivacyNumber>
                                  ) : '—'}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Show nested items if any */}
                        {(group.items||[]).filter(it => it.parentItemId === item.id && !it.hidden).length > 0 && (
                          <div className="mt-2 ml-4 space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                            {(group.items||[]).filter(it => it.parentItemId === item.id && !it.hidden).map(child => {
                              const childValue = valueFor(child, months[0], false)
                              return (
                                <div key={child.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 dark:text-gray-400">↳ {child.name}</span>
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    <PrivacyNumber value={childValue}>
                                      {formatEUR(childValue)}
                                    </PrivacyNumber>
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Growth Stats Card */}
        {months.length > 1 && (() => {
          const curr = groups.reduce((sum, g)=>{
            const roots = (g.items||[]).filter(it=> !it.parentItemId)
            return sum + roots.reduce((acc, it)=> acc + valueFor(it, months[0], true), 0)
          }, 0)
          const prev = groups.reduce((sum, g)=>{
            const roots = (g.items||[]).filter(it=> !it.parentItemId)
            return sum + roots.reduce((acc, it)=> acc + valueFor(it, months[1], true), 0)
          }, 0)
          const diff = curr - prev
          const pct = prev !== 0 ? ((curr - prev) / prev) * 100 : 0
          const isPositive = diff > 0

          return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                Growth vs Previous Month
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</div>
                  <div className={`text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <PrivacyNumber value={diff}>
                      {isPositive ? '+' : ''}{formatEUR(diff)}
                    </PrivacyNumber>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Percentage</div>
                  <div className={`text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isPositive ? '+' : ''}{pct.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* View all data button */}
        <button
          onClick={() => setIsMobileView(false)}
          className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          📊 View Full Table
        </button>
      </div>
    )
  }

  // If mobile view, show cards instead of table
  if (isMobileView) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded shadow">
        <MobileView />
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded shadow -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 relative">
      <div 
        ref={scrollRef} 
        className="overflow-x-auto overflow-y-auto hide-scrollbar-y" 
        style={{ maxHeight: '85vh' }}
      >
        <table className="min-w-full text-sm">
          <thead className="sticky top-0" style={{ zIndex: 90 }}>
            <tr className="border-b bg-slate-700 dark:bg-slate-900 text-white">
              <th className="p-2 sticky top-0 left-0 text-left bg-slate-700 dark:bg-slate-900 text-white" style={{ zIndex: 100, minWidth: '280px', width: 'clamp(140px, 40vw, 450px)' }}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm sm:text-base">Asset</span>
                  {countHiddenRows() > 0 && (
                    <button 
                      onClick={showAllHidden}
                      title={`Show ${countHiddenRows()} hidden row${countHiddenRows() > 1 ? 's' : ''}`}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors"
                    >
                      <IconEye />
                      {countHiddenRows()}
                    </button>
                  )}
                  <button
                    onClick={() => setIsMobileView(true)}
                    title="Switch to card view"
                    className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 transition-colors md:hidden"
                  >
                    📱 Cards
                  </button>
                </div>
              </th>
              {months.map((m, i)=> (
                <th key={m} onContextMenu={async (e)=>{ 
                  e.preventDefault(); 
                  if(confirm(`Delete all valuations for ${new Date(m).toLocaleDateString(undefined,{ month:'long', year:'numeric' })}?`)){ 
                    setManualMonths(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(m)
                      return newSet
                    })
                    await fetch(`/api/asset-valuations?month=${encodeURIComponent(m)}`, { method:'DELETE', headers: { ...tokenHeader() } })
                    await refresh() 
                  } 
                }} className="p-2 whitespace-nowrap text-center border-l border-gray-200 dark:border-gray-700 relative sticky top-0 bg-slate-600 dark:bg-slate-800 text-white" style={{ zIndex: 95, minWidth: '100px' }}>
                  {i===0 && (
                    <button onClick={addNextMonth} className="absolute left-1 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-white hover:text-gray-200 text-sm" title="Add next month" aria-label="Add next month">‹</button>
                  )}
                  <span className="text-xs sm:text-sm">{formatDateMonthYear(new Date(m))}</span>
                  {i===months.length-1 && (
                    <button onClick={addPrevMonth} className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-white hover:text-gray-200 text-sm" title="Add previous month" aria-label="Add previous month">›</button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx)=> {
              // Check if this is a new group (not the first row)
              const isNewGroup = row.isGroup && idx > 0
              return (
              <tr key={idx} onMouseEnter={()=>setHoveredRowIdx(idx)} onMouseLeave={()=>setHoveredRowIdx(null)} className={`border-b ${isNewGroup ? 'border-t-[16px] border-t-white dark:border-t-gray-900' : ''} ${row.isGroup? '' : (idx % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700/50')}`}>
                <td className={`sticky left-0 border-r border-gray-200 dark:border-gray-700 ${row.isGroup ? 'p-2 text-center bg-slate-100 dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100' : 'p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`} style={{ zIndex: 80, paddingLeft: row.isGroup ? undefined : `${row.depth*20}px`, fontSize: row.isGroup? '0.9rem' : (row.depth>1? '0.8rem':'0.85rem') , minWidth: '280px', width: 'clamp(140px, 40vw, 450px)' }}>
                  {row.isGroup ? (
                    <div className="flex items-center justify-between">
                      <span className="truncate">{row.name}</span>
                      {hoveredRowIdx===idx && (
                        <button 
                          title="Hide group" 
                          onClick={()=> row.groupId && hideGroup(row.groupId)} 
                          className="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <IconEyeSlash />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {hasChildren(row.item) && (
                        <button
                          onClick={()=> {
                            const it = row.item!
                            if (hasVisibleChildren(it)) collapseItem(it); else expandItem(it)
                          }}
                          className="bg-transparent border-0 p-0 text-gray-400 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none cursor-pointer flex-shrink-0"
                          title={hasVisibleChildren(row.item) ? 'Collapse' : 'Expand'}
                          aria-label={hasVisibleChildren(row.item) ? 'Collapse' : 'Expand'}
                        >
                          {hasVisibleChildren(row.item) ? '▾' : '▸'}
                        </button>
                      )}
                      <span className="truncate">{row.name}</span>
                      {hoveredRowIdx===idx && (
                        <button 
                          title="Hide row" 
                          onClick={()=> toggleHidden(row.item!)} 
                          className="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <IconEyeSlash />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                
                {months.map(m=> {
                  if (row.isGroup) {
                    const group = groups.find(g=> g.id===row.groupId)
                    const items = (group?.items||[]).filter(it=> !it.parentItemId)
                    const v = items.reduce((sum, it)=> sum + valueFor(it, m, true), 0)
                    return <td key={m} className="p-2 text-center font-semibold text-slate-900 dark:text-slate-100 border-l border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800" style={{ minWidth: '100px' }}>
                      <div className="truncate">{v ? <PrivacyNumber value={v}>{formatEUR(v)}</PrivacyNumber> : ''}</div>
                    </td>
                  }
                  const item = row.item!
                  const val = valueFor(item, m, true)
                  const isEditing = editing && editing.itemId===item.id && editing.month===m
                  const valObj = item.valuations?.find(v=> monthKey(new Date(v.month))===m)
                  return (
                    <td
                      key={m}
                      onClick={(e)=>{ if(!isEditing) onCellClick(item, m) }}
                      onMouseEnter={()=>{ if(!isEditing) setHoveredCell({ itemId: item.id, month: m }) }}
                      onMouseLeave={()=>setHoveredCell(null)}
                      className="p-1 sm:p-2 text-center border-l border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 cursor-text"
                      style={{ minWidth: '100px' }}
                    >
                      {isEditing ? (
                        <div className="relative">
                          <input
                            autoFocus
                            type="text"
                            step="0.01"
                            value={editValue}
                            onChange={e=>setEditValue(e.target.value)}
                            onBlur={()=>{ saveEdit(); setSuggestion(null); }}
                            onKeyDown={handleKeyDown}
                            className="no-spin w-full text-center bg-transparent outline-none focus:outline-none focus:ring-0 border-0 p-0 m-0 appearance-none"
                          />
                          {suggestion !== null && !editValue.trim() && (
                            <div 
                              onMouseDown={(e) => {
                                // Prevent input blur when clicking suggestion
                                e.preventDefault();
                              }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await acceptAndSaveSuggestion();
                              }}
                              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-blue-100 dark:bg-blue-900/80 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors shadow-lg z-50"
                            >
                              <div className="flex items-center gap-2 justify-center whitespace-nowrap">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                </svg>
                                <span className="font-medium text-blue-700 dark:text-blue-300">{formatEUR(suggestion)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 sm:w-32 mx-auto relative text-xs sm:text-sm">
                          {val? <PrivacyNumber value={val}>{formatEUR(val)}</PrivacyNumber> : <span className="text-gray-400">—</span>}
                          
                          {/* --- MODIFICA: Stile dell'indicatore della nota (giallo post-it) --- */}
                          {valObj && valObj.note && (
                            <span 
  title={valObj.note} 
  className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-yellow-400 border-r-transparent"
  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
/>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
              )
            })}
          </tbody>
          <tfoot className="sticky bottom-0" style={{ zIndex: 90 }}>
            <tr className="bg-slate-200 dark:bg-slate-800">
  <td className="p-2 sticky left-0 bg-slate-200 dark:bg-slate-800 text-xs sm:text-sm" style={{ zIndex: 90, fontWeight: 600, textAlign: 'center', minWidth: '280px', width: 'clamp(140px, 40vw, 450px)' }}>Total Net Worth</td>
  {months.map(m=>{
    const v = groups.reduce((sum, g)=>{
      const roots = (g.items||[]).filter(it=> !it.parentItemId)
      const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
      return sum + s
    }, 0)
    return <td key={m} className="p-2 text-center border-l border-gray-200 dark:border-gray-700 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
      {v? <PrivacyNumber value={v}>{formatEUR(v)}</PrivacyNumber>: ''}
    </td>
  })}
</tr>
            <tr className="bg-slate-100 dark:bg-slate-900">
  <td className="p-2 sticky left-0 bg-slate-100 dark:bg-slate-900 text-xs sm:text-sm" style={{ zIndex: 90, fontWeight: 600, textAlign: 'center', minWidth: '280px', width: 'clamp(140px, 40vw, 450px)' }}>Growth vs prev</td>
  {months.map((m, i)=>{
    const curr = groups.reduce((sum, g)=>{
      const roots = (g.items||[]).filter(it=> !it.parentItemId)
      const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
      return sum + s
    }, 0)
    const prevKey = months[i+1]
    const prev = prevKey ? groups.reduce((sum, g)=>{
      const roots = (g.items||[]).filter(it=> !it.parentItemId)
      const s = roots.reduce((acc, it)=> acc + valueFor(it, prevKey, true), 0)
      return sum + s
    }, 0) : 0
    const diff = prevKey ? (curr - prev) : 0
    return <td key={m} className="p-2 text-center border-l border-gray-200 dark:border-gray-700 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {prevKey? <PrivacyNumber value={diff}>{formatEUR(diff)}</PrivacyNumber>: ''}
    </td>
  })}
</tr>
            <tr className="bg-white dark:bg-gray-800">
  <td className="p-2 sticky left-0 bg-white dark:bg-gray-800 text-xs sm:text-sm" style={{ zIndex: 90, fontWeight: 600, textAlign: 'center', minWidth: '280px', width: 'clamp(140px, 40vw, 450px)' }}>Growth %</td>
  {months.map((m, i)=>{
    const curr = groups.reduce((sum, g)=>{
      const roots = (g.items||[]).filter(it=> !it.parentItemId)
      const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
      return sum + s
    }, 0)
    const prevKey = months[i+1]
    const prev = prevKey ? groups.reduce((sum, g)=>{
      const roots = (g.items||[]).filter(it=> !it.parentItemId)
      const s = roots.reduce((acc, it)=> acc + valueFor(it, prevKey, true), 0)
      return sum + s
    }, 0) : 0
    const pct = prevKey && prev !== 0 ? ((curr - prev) / prev) * 100 : 0
    
    let bgColor = isDark ? 'rgb(31 41 55)' : 'white'; // Sfondo opaco
    if (prevKey && prev !== 0) {
      const absPct = Math.abs(pct);
      const opacity = Math.min(absPct / 10, 1);
      if (pct > 0) {
        bgColor = isDark ? `rgba(34,197,94,${Math.max(opacity * 0.35, 0.08)})` : `rgba(34,197,94,${opacity})`;
      } else if (pct < 0) {
        bgColor = isDark ? `rgba(239,68,68,${Math.max(opacity * 0.35, 0.08)})` : `rgba(239,68,68,${opacity})`;
      }
    }

    return <td key={m} className="p-2 text-center border-l border-gray-200 dark:border-gray-700" style={{ backgroundColor: bgColor }}>{prevKey && prev!==0? `${pct.toFixed(2)}%` : ''}</td>
  })}
</tr>
          </tfoot>
        </table>
      </div>
      
<NotePopover
  visible={!!showNoteFor}
  initial={noteValue}
  onClose={()=> setShowNoteFor(null)}
  onSave={(n)=> { if(showNoteFor) saveNote(showNoteFor.itemId, showNoteFor.month, n) }}
/>
    </div>
  )
}