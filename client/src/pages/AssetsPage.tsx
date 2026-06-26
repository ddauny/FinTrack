import { useEffect, useMemo, useRef, useState } from 'react'
import { secureFetch, authHeaders } from '../lib/api'
import { formatEUR, formatDateDMY, formatDateMonthYear } from '../lib/format'
import { Parser } from 'expr-eval'
import NotePopover from '../components/NotePopover' // Assicurati che questo percorso sia corretto
import { PrivacyNumber } from '../components/PrivacyNumber'
import { useToast } from '../contexts/ToastContext'
import { useAlert } from '../contexts/AlertContext'
import { usePrivacy } from '../contexts/PrivacyContext'

// --- HELPER PER DATE SICURE ---
function safeISODate(d: any) {
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  } catch (e) {
    return '';
  }
}

function safeMonthKey(d: any) {
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  } catch (e) {
    return '';
  }
}


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
  const { showToast } = useToast()
  const { showAlert } = useAlert()
  const { hideNumbers } = usePrivacy()
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
  const [mobileMonthIdx, setMobileMonthIdx] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [isFullScreen, setIsFullScreen] = useState(true)
  const [showPercentageChanges, setShowPercentageChanges] = useState(true)

  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const res = await secureFetch('/api/asset-groups', { headers: tokenHeader() })
      if (!res.ok) {
        console.error('Failed to fetch asset groups', res.status)
        return
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        console.error('Asset groups data is not an array', data)
        return
      }
      setGroups(data)
      const set = new Set<string>()
      const nowKey = monthKey(new Date())
      set.add(nowKey)
      data.forEach((g: Group) => {
        if (!g.items) return
        g.items.forEach((it: Item) => {
          if (!it.valuations) return
          it.valuations.forEach(v => {
            if (v.month) {
              set.add(safeMonthKey(v.month))
            }
          })
        })
      })
      
      manualMonths.forEach(month => set.add(month))
      
      const sorted = Array.from(set).sort((a,b)=> new Date(b).getTime() - new Date(a).getTime())
      setMonths(sorted)
    } catch (err) {
      console.error('Error in refresh:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
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
    const r: { depth:number; isGroup:boolean; groupId?:number; item?:Item; name:string; isHiddenIndicator?:boolean; hiddenItems?:Item[] }[] = []
    if (!Array.isArray(groups)) return r
    for (const g of groups) {
      r.push({ depth:0, isGroup:true, groupId:g.id, name:g.name })
      const items = (g.items||[]).filter(Boolean)
      const roots = items.filter(it=> it && !it.parentItemId)
      const childrenOf = (id:number)=> items.filter(it=> it && it.parentItemId===id)
      
      // Use a visited set to prevent infinite recursion in case of cycles
      const visited = new Set<number>()
      
      const emitSiblings = (list: Item[], depth: number)=>{
        let hiddenRun: Item[] = []
        
        const flushHidden = () => {
           if (hiddenRun.length > 0) {
               r.push({ depth, isGroup: false, isHiddenIndicator: true, hiddenItems: [...hiddenRun], name: 'hidden_indicator' })
               hiddenRun = []
           }
        }

        for (const it of list) {
          if (!it) continue
          if (it.hidden) {
              hiddenRun.push(it)
              continue
          }
          if (visited.has(it.id)) continue
          
          flushHidden()
          
          visited.add(it.id)
          
          r.push({ depth, isGroup:false, groupId:g.id, item:it, name:it.name })
          const children = childrenOf(it.id)
          if (children && children.length && depth < 10) emitSiblings(children, depth+1)
        }
        flushHidden()
      }
      emitSiblings(roots, 1)
    }
    return r
  }, [groups])

  const tokenHeader = authHeaders;

  function monthKey(d: Date) {
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth()+1).padStart(2,'0')
    return `${yyyy}-${mm}-01`
  }

  function valueFor(item: Item|undefined, month: string, includeHidden: boolean = false, depth: number = 0, visited: Set<number> = new Set()): number {
    if (!item || depth > 10 || visited.has(item.id)) return 0
    visited.add(item.id)
    
    const direct = item.valuations?.find(v=> v.month && safeMonthKey(v.month)===month)?.value
    if (direct !== undefined) return Number(direct)
    
    if (!Array.isArray(groups)) return 0
    const group = groups.find(g=> g.items?.some(i=> i.id===item.id))
    if (!group) return 0
    
    const children = (group.items||[]).filter(it=> it.parentItemId===item.id && (includeHidden || !it.hidden))
    if (children.length===0) return 0
    
    return children.reduce((sum, ch)=> sum + valueFor(ch, month, includeHidden, depth + 1, new Set(visited)), 0)
  }

  function isLeaf(item: Item|undefined): boolean {
    if (!item || !Array.isArray(groups)) return false
    const group = groups.find(g=> g.items?.some(i=> i.id===item.id))
    if (!group) return true
    return !(group.items||[]).some(it=> it.parentItemId===item.id)
  }

  function calculatePercentageChange(item: Item|undefined, currentMonth: string, months: string[]): { percentage: number; prevValue: number; currentValue: number } | null {
    if (!item || !currentMonth || !Array.isArray(groups)) return null
    
    const currentIdx = months.indexOf(currentMonth)
    if (currentIdx === -1 || currentIdx >= months.length - 1) return null // No previous month
    
    const prevMonth = months[currentIdx + 1]
    const currentValue = valueFor(item, currentMonth, false)
    const prevValue = valueFor(item, prevMonth, false)
    
    if (prevValue === 0) return null // Can't calculate percentage from 0
    
    const percentage = ((currentValue - prevValue) / prevValue) * 100
    return { percentage, prevValue, currentValue }
  }

  async function toggleHidden(item: Item) {
    try {
      await secureFetch(`/api/asset-items/${item.id}`, { 
        method:'PUT', 
        headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
        body: JSON.stringify({ hidden: !item.hidden }) 
      })
      await refresh()
    } catch (e) {
      console.error("Failed to toggle hidden state:", e)
    }
  }

  async function unhideMultiple(itemsToUnhide: Item[]) {
    try {
      await Promise.all(itemsToUnhide.map(item => 
        secureFetch(`/api/asset-items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...tokenHeader() },
          body: JSON.stringify({ hidden: false }) 
        })
      ));
      await refresh();
    } catch (e) {
      console.error("Failed to unhide multiple items:", e);
    }
  }

  function groupOfItem(item: Item | undefined) {
    if (!item) return undefined
    return groups.find(g=> g.items?.some(i=> i.id===item.id))
  }

  function childrenOfItem(item: Item | undefined): Item[] {
    const g = groupOfItem(item)
    if (!g || !item) return []
    return (g.items||[]).filter(it => it && it.parentItemId===item.id)
  }

  function hasChildren(item: Item | undefined): boolean {
    return childrenOfItem(item).length > 0
  }

  function hasVisibleChildren(item: Item | undefined): boolean {
    return childrenOfItem(item).some(ch=> !ch.hidden)
  }

  async function collapseItem(item: Item) {
    await secureFetch(`/api/asset-items/${item.id}/collapse`, { method:'POST', headers: { ...tokenHeader() } })
    await refresh()
  }

  async function expandItem(item: Item) {
    await secureFetch(`/api/asset-items/${item.id}/expand`, { method:'POST', headers: { ...tokenHeader() } })
    await refresh()
  }

  function onCellClick(item: Item|undefined, month: string) {
    if (!item) return
    if (!isLeaf(item)) return
    
    const valuation = item.valuations?.find(v=> safeISODate(v.month) === month)
    const raw = valuation && valuation.formula ? String(valuation.formula) : String(valueFor(item, month) || '')
    
    // Calculate suggestion if cell is empty and item has depreciation
    let suggestedValue: number | null = null
    const currentValue = valueFor(item, month)
    
    
    // Show suggestion if cell is empty (no value or value is 0) and item has depreciation
    if (item.depreciationAmount && currentValue === 0) {
      // Find previous month value - use direct valuation, not aggregated
      const currentMonthDate = new Date(month)
      const prevMonthDate = new Date(currentMonthDate)
      prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1)
      const prevMonthKey = monthKey(prevMonthDate)
      
      // Get direct valuation value, not aggregated from children
      const prevValuation = item.valuations?.find(v=> safeMonthKey(v.month) === prevMonthKey)
      const prevValue = prevValuation ? Number(prevValuation.value) : 0
      
      
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
    
    if (!Array.isArray(groups)) return null;
    const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
    const existingVal = item?.valuations?.find(v=> safeISODate(v.month) === month)
    if (existingVal && existingVal.note) payload.note = existingVal.note
    
    try {
      await secureFetch(`/api/asset-items/${itemId}/valuations`, { 
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
        if (trimmed.length > 201) {
          throw new Error('Formula too long (max 200 characters)');
        }
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
    if (!Array.isArray(groups)) return null;
    const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
    const existingVal = item?.valuations?.find(v=> safeISODate(v.month) === month)
    if (existingVal && existingVal.note) payload.note = existingVal.note
    try {
      await secureFetch(`/api/asset-items/${itemId}/valuations`, { method:'POST', headers:{ 'Content-Type':'application/json', ...tokenHeader() }, body: JSON.stringify(payload) })
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
      // Do nothing if the user is already typing in an input or if the modal is already open
      if (editing || showNoteFor) return;

      // Avoid triggering if typing in an input (though editing check covers most, explicit check is safer)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key.toLowerCase() === 'n'){
        // Use hoveredCell instead of selectedCell
        if (hoveredCell) {
          e.preventDefault();
          e.stopPropagation();

          const { itemId, month } = hoveredCell
          if (!Array.isArray(groups)) return null;
    const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
          const v = item?.valuations?.find(v=> safeISODate(v.month) === month)
          setNoteValue(v?.note || '')
          setShowNoteFor(hoveredCell)
        }
      }

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFullScreen(prev => !prev);
      }
      }
      window.addEventListener('keydown', onKey)
      return ()=> window.removeEventListener('keydown', onKey)
      }, [hoveredCell, groups, editing, showNoteFor])
      // --- END OF CHANGE ---

      // --- CHANGE: Fixed 'saveNote' function for 500 error ---
      async function saveNote(itemId: number, month: string, note: string) {
      if (!Array.isArray(groups)) return null;
    const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
      const v = item?.valuations?.find(v=> safeISODate(v.month) === month)
      const payload: any = { month }

      if (v) {
      payload.value = Number(v.value || 0)
      payload.formula = v.formula ?? null // Preserve existing formula
      } else {
      // FIX: Always send 'value' and 'formula' fields to avoid 500 errors
      payload.value = 0
      payload.formula = null // <-- HERE IS THE FIX
      }
      payload.note = note && note.trim() !== '' ? note : null;


    if (!payload.value || !payload.month) {
  showToast("Value or month is missing", "warning");
  return;
}
    try {
      const res = await secureFetch(`/api/asset-items/${itemId}/valuations`, { 
        method:'POST', 
        headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
        body: JSON.stringify(payload) 
      })

      if (!res.ok) {
        // Gestisce errori 500 o 400 dal backend
        console.error("Error saving note:", res.status, res.statusText)
        showToast("Failed to save note. Check console for details.", "error") // Feedback per l'utente
        return; // Non chiudere il popover se il salvataggio fallisce
      }

      // Successo!
      await refresh()
      setShowNoteFor(null)
      setNoteValue('')
    } catch (err) {
      console.error("Fetch error saving note:", err)
      showToast("Failed to save note. Check console for details.", "error")
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
      await secureFetch(`/api/asset-groups/${groupId}/hide-all`, { 
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
      await secureFetch(`/api/asset-items/show-all`, { 
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
    prev.setMonth(prev.getMonth()-1)
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
    nxt.setMonth(nxt.getMonth()+1)
    const mk = monthKey(nxt)
    if (!months.includes(mk)) {
      try {
        await secureFetch('/api/asset-valuations/apply-depreciation', {
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

  if (loading && (!Array.isArray(groups) || groups.length === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-48 h-1 bg-slate-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-600 w-1/3 animate-[shimmer_1.5s_infinite] rounded-full" style={{ animationTimingFunction: 'ease-in-out' }}></div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">Reconstructing Assets</p>
          <p className="text-[9px] font-medium text-slate-300 dark:text-slate-700">Calibrating valuation matrix...</p>
        </div>
      </div>
    )
  }

  // Mobile Card View Component
  const MobileView = () => {
    const currentMonth = months[mobileMonthIdx]
    const prevMonth = months[mobileMonthIdx + 1]

    if (!Array.isArray(groups)) return null;

    // Calculate totals
    const totalNetWorth = groups.reduce((sum, g) => {
      const roots = (g.items || []).filter(it => !it.parentItemId)
      return sum + roots.reduce((acc, it) => acc + valueFor(it, currentMonth, true), 0)
    }, 0)

    const prevNetWorth = prevMonth ? groups.reduce((sum, g) => {
      const roots = (g.items || []).filter(it => !it.parentItemId)
      return sum + roots.reduce((acc, it) => acc + valueFor(it, prevMonth, true), 0)
    }, 0) : 0

    const diff = totalNetWorth - prevNetWorth
    const pct = prevNetWorth !== 0 ? (diff / prevNetWorth) * 100 : 0

    const toggleGroup = (groupId: number) => {
      setExpandedGroups(prev => {
        const newSet = new Set(prev)
        if (newSet.has(groupId)) newSet.delete(groupId)
        else newSet.add(groupId)
        return newSet
      })
    }

    const renderMobileChildren = (list: Item[], depth: number, groupItems: Item[]) => {
       let hiddenRun: Item[] = []
       const elements: React.ReactNode[] = []
       
       const flush = () => {
         if (hiddenRun.length > 0) {
           const itemsToUnhide = [...hiddenRun]
           elements.push(
              <div 
                key={`hidden-${itemsToUnhide[0].id}`} 
                className="relative h-[2px] w-full bg-blue-500/20 my-[1px] group/hidden flex items-center cursor-pointer hover:bg-blue-500/40 transition-colors z-[60]" 
                onClick={() => unhideMultiple(itemsToUnhide)}
                title={`Show ${itemsToUnhide.length} hidden row${itemsToUnhide.length > 1 ? 's' : ''}`}
              >
                 <div className="ml-6 text-blue-500/70 dark:text-blue-500/60 absolute opacity-70 group-hover/hidden:opacity-100 transition-opacity z-[70]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                 </div>
              </div>
           )
           hiddenRun = []
         }
       }

       for (const it of list) {
          if (it.hidden) {
             hiddenRun.push(it)
             continue
          }
          flush()
          elements.push(<MobileItemRow key={it.id} item={it} depth={depth} groupItems={groupItems} />)
       }
       flush()
       return elements
    }

    // Recursive item row component
    const MobileItemRow = ({ item, depth, groupItems }: { item: Item, depth: number, groupItems: Item[] }) => {
      const value = valueFor(item, currentMonth, false)
      const children = groupItems.filter(it => it.parentItemId === item.id)
      const hasChildren = children.length > 0
      const [expanded, setExpanded] = useState(true)

      return (
        <div className="select-none">
          <div 
            onClick={() => {
               if (!hasChildren) {
                 onCellClick(item, currentMonth)
               } else {
                 setExpanded(!expanded)
               }
            }}
            className={`
              flex items-center justify-between py-3 px-4 border-b border-slate-50 dark:border-[#1f1f1f] last:border-0
              ${depth > 0 ? 'bg-slate-50/50 dark:bg-[#101010]/50' : ''}
              active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer
            `}
            style={{ paddingLeft: `${depth * 1 + 1}rem` }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {hasChildren && (
                <span className="text-slate-300 text-xs w-4 text-center">{expanded ? '▼' : '▶'}</span>
              )}
              {!hasChildren && depth > 0 && <span className="w-4"></span>}
              <span className={`truncate ${depth === 0 ? 'font-medium text-slate-900 dark:text-[#d8d8d8]' : 'text-slate-600 dark:text-[#bbb] text-sm'}`}>
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
               {item.valuations?.find(v => safeMonthKey(v.month) === currentMonth)?.note && (
                 <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
               )}
               <span className={`font-medium ${!value ? 'text-slate-300 dark:text-slate-700' : 'text-slate-900 dark:text-[#f0f0f0]'}`}>
                 {value ? <PrivacyNumber value={value}>{formatEUR(value)}</PrivacyNumber> : '—'}
               </span>
               {!hasChildren && (
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-300 dark:text-slate-600">
                   <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                 </svg>
               )}
            </div>
          </div>
          {hasChildren && expanded && renderMobileChildren(children, depth + 1, groupItems)}
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        {/* Sticky Header: Month Navigation */}
        <div className="sticky top-0 z-30 bg-white dark:bg-[#101010] border-b border-slate-200 dark:border-[#1f1f1f] shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setMobileMonthIdx(prev => Math.min(prev + 1, months.length - 1))}
              disabled={mobileMonthIdx >= months.length - 1}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-[#bbb] dark:hover:text-white disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-900 dark:text-[#f0f0f0] uppercase tracking-wide">
                {currentMonth ? formatDateMonthYear(new Date(currentMonth)) : 'No Data'}
              </div>
            </div>

            <button 
              onClick={() => setMobileMonthIdx(prev => Math.max(prev - 1, 0))}
              disabled={mobileMonthIdx <= 0}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-[#bbb] dark:hover:text-white disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="px-4 py-6 bg-white dark:bg-[#101010] mb-4 border-b border-slate-200 dark:border-[#1f1f1f]">
          <div className="text-center">
            <p className="text-xs font-medium text-slate-500 dark:text-[#bbb] uppercase tracking-wider mb-1">Total Net Worth</p>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-[#f0f0f0] mb-2">
              <PrivacyNumber value={totalNetWorth}>{formatEUR(totalNetWorth)}</PrivacyNumber>
            </h2>
            {prevMonth && (
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${diff >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                {diff >= 0 ? '↑' : '↓'} {formatEUR(Math.abs(diff))} ({Math.abs(pct).toFixed(1)}%)
              </div>
            )}
          </div>
        </div>

        {/* Groups List */}
        <div className="px-3 space-y-3">
          {groups.map(group => {
            const isExpanded = expandedGroups.has(group.id)
            const groupTotal = (group.items || []).filter(it => !it.parentItemId).reduce((sum, it) => sum + valueFor(it, currentMonth, true), 0)
            
            return (
              <div key={group.id} className="bg-white dark:bg-[#101010] rounded-xl shadow-sm border border-slate-200 dark:border-[#1f1f1f] overflow-hidden">
                <div 
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-[#111111] dark:text-[#bbb]'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-[#f0f0f0]">{group.name}</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-[#f0f0f0]">
                    <PrivacyNumber value={groupTotal}>{formatEUR(groupTotal)}</PrivacyNumber>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-[#1f1f1f]">
                    {renderMobileChildren((group.items || []).filter(it => !it.parentItemId), 0, group.items || [])}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#101010] rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="p-4 border-b border-slate-100 dark:border-[#1f1f1f] flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900 dark:text-[#f0f0f0]">Update Value</h3>
                <button onClick={() => { setEditing(null); setEditValue(''); }} className="p-2 bg-slate-100 dark:bg-[#111111] rounded-full text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#bbb] uppercase mb-1">Asset</label>
                  <div className="text-lg font-medium text-slate-900 dark:text-[#f0f0f0]">
                    {groups.flatMap(g => g.items || []).find(i => i.id === editing.itemId)?.name}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#bbb] uppercase mb-1">Value ({formatDateMonthYear(new Date(editing.month))})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">€</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-xl font-bold text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <button 
                  onClick={saveEdit}
                  className="w-full py-3.5 bg-blue-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]"
                >
                  Save Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // If mobile view, show cards instead of table
  if (isMobileView) {
    return (
      <div className="bg-white dark:bg-[#111111] shadow-none">
        <MobileView />
      </div>
    )
  }

  return (
    <div 
      ref={wrapperRef} 
      className={(isFullScreen 
        ? "bg-slate-50 dark:bg-slate-950 fixed top-14 bottom-0 left-0 right-0 z-50" 
        : "relative w-full h-[calc(100vh-8rem)] bg-white dark:bg-[#101010] rounded-xl shadow-sm border border-slate-200 dark:border-[#1f1f1f] overflow-hidden") + " animate-in fade-in slide-in-from-bottom duration-700"}
    >
      <div 
        ref={scrollRef} 
        className="overflow-auto assets-scrollbar w-full h-full" 
      >
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-[9998] shadow-md">
            <tr className="bg-[#181818] text-slate-100">
              <th className="px-6 py-4 sticky top-0 left-0 text-left bg-[#181818] z-[9999] font-bold uppercase tracking-wider text-xs border-b border-[#2b2b2b] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.35)]" style={{ minWidth: '240px', width: '20%' }}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    className="p-1.5 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    {isFullScreen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    )}
                  </button>
                  <span>Asset</span>
                  {countHiddenRows() > 0 && (
                    <button 
                      onClick={showAllHidden}
                      title={`Show ${countHiddenRows()} hidden row${countHiddenRows() > 1 ? 's' : ''}`}
                      className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      <IconEye />
                      {countHiddenRows()}
                    </button>
                  )}
                  <button
                    onClick={() => setShowPercentageChanges(!showPercentageChanges)}
                    title={showPercentageChanges ? "Hide percentage changes" : "Show percentage changes"}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                      showPercentageChanges 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13.5m0 0v3m0-3l3-3m-3 3l-3-3M3 9h13.5M9 3v3m0 0l3-3m-3 3l-3-3" />
                    </svg>
                    %
                  </button>
                  <button
                    onClick={() => setIsMobileView(true)}
                    title="Switch to card view"
                    className="ml-auto md:hidden text-slate-400 hover:text-white"
                  >
                    📱
                  </button>
                </div>
              </th>
              {months.map((m, i)=> (
                <th key={m} className="px-4 py-4 whitespace-nowrap text-center font-medium text-xs uppercase tracking-wider border-b border-[#2b2b2b] bg-[#181818] text-slate-300 group relative" style={{ minWidth: '140px', width: 'auto' }}>
                  <div className="relative flex items-center justify-center gap-2 group/inner">
                    {i===0 && (
                      <button onClick={addNextMonth} className="opacity-0 group-hover/inner:opacity-100 transition-opacity absolute -left-2 p-1 hover:text-white">‹</button>
                    )}
                    <span>{formatDateMonthYear(new Date(m))}</span>
                    {i===months.length-1 && (
                      <button onClick={addPrevMonth} className="opacity-0 group-hover/inner:opacity-100 transition-opacity absolute -right-2 p-1 hover:text-white">›</button>
                    )}
                  </div>
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      showAlert({
                        title: 'Delete Valuations',
                        message: `Delete all valuations for ${new Date(m).toLocaleDateString(undefined,{ month:'long', year:'numeric' })}?`,
                        confirmText: 'Delete',
                        type: 'danger',
                        onConfirm: async () => {
                          await secureFetch(`/api/asset-valuations?month=${encodeURIComponent(m)}`, { method:'DELETE', headers: { ...tokenHeader() } })
                          setManualMonths(prev => {
                            const newSet = new Set(prev)
                            newSet.delete(m)
                            return newSet
                          })
                        }
                      });
                    }}
                    className="absolute top-1 right-1 p-1 text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete month"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#101010] divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, idx)=> {
              if (row.isHiddenIndicator && row.hiddenItems) {
                return (
                  <tr key={`hidden-indicator-${idx}`} className="group/hidden-row relative z-[60]">
                    <td colSpan={months.length + 1} className="p-0 m-0 border-0 relative h-0 z-[60]">
                       <div 
                         className="absolute left-0 w-full h-[2px] bg-blue-500/20 hover:bg-blue-500/40 cursor-pointer flex items-center -translate-y-[2px] z-[60] transition-colors group/indicator" 
                         onClick={() => unhideMultiple(row.hiddenItems!)} 
                         title={`Show ${row.hiddenItems.length} hidden row${row.hiddenItems.length > 1 ? 's' : ''}`}
                       >
                          <div className="ml-10 text-blue-500/70 dark:text-blue-500/60 opacity-70 group-hover/indicator:opacity-100 transition-opacity relative z-[70]">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          </div>
                       </div>
                    </td>
                  </tr>
                )
              }
              // Check if this is a new group (not the first row)
              const isNewGroup = row.isGroup && idx > 0
              return (
              <tr key={idx} 
                  onMouseEnter={()=>setHoveredRowIdx(idx)} 
                  onMouseLeave={()=>setHoveredRowIdx(null)} 
                  className={`
                    transition-colors duration-75
                    ${row.isGroup 
                      ? 'bg-slate-50 dark:bg-[#111111]' 
                      : 'hover:bg-sky-50/50 dark:hover:bg-sky-900/10'
                    }
                    ${isNewGroup ? 'border-t-2 border-slate-100 dark:border-[#1f1f1f]' : ''}
                  `}
              >
                <td className={`
                    sticky left-0 z-50 border-r border-slate-100 dark:border-[#1f1f1f]
                    ${row.isGroup 
                      ? 'py-3 px-6 font-bold text-slate-900 dark:text-[#f0f0f0] bg-slate-50 dark:bg-[#111111]' 
                      : 'py-2 px-6 text-slate-700 dark:text-[#d8d8d8] bg-white dark:bg-[#101010]'
                    }
                    shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]
                  `} 
                  style={{ 
                    paddingLeft: row.isGroup ? '1.5rem' : `${row.depth * 1.5 + 0.5}rem`,
                    fontSize: row.isGroup ? '0.875rem' : '0.8125rem'
                  }}>
                  {row.isGroup ? (
                    <div className="flex items-center justify-between group">
                      <span className="truncate tracking-tight">{row.name}</span>
                      <button 
                        title="Hide group" 
                        onClick={()=> row.groupId && hideGroup(row.groupId)} 
                        className={`ml-2 text-slate-300 hover:text-red-500 transition-colors ${hoveredRowIdx===idx ? 'opacity-100' : 'opacity-0'}`}
                      >
                        <IconEyeSlash />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      {hasChildren(row.item) && (
                        <button
                          onClick={()=> {
                            const it = row.item!
                            if (hasVisibleChildren(it)) collapseItem(it); else expandItem(it)
                          }}
                          className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {hasVisibleChildren(row.item) ? '▾' : '▸'}
                        </button>
                      )}
                      <span className="truncate">{row.name}</span>
                      <button 
                        title="Hide row" 
                        onClick={()=> toggleHidden(row.item!)} 
                        className={`ml-auto text-slate-300 hover:text-red-500 transition-colors ${hoveredRowIdx===idx ? 'opacity-100' : 'opacity-0'}`}
                      >
                        <IconEyeSlash />
                      </button>
                    </div>
                  )}
                </td>
                
                {months.map(m=> {
                  if (row.isGroup) {
                    const group = Array.isArray(groups) ? groups.find(g=> g.id===row.groupId) : null
                    const items = (group?.items||[]).filter(it=> it && !it.parentItemId)
                    const v = items.reduce((sum, it)=> sum + valueFor(it, m, true), 0)
                    
                    // Calculate percentage change for group
                    const currentIdx = months.indexOf(m)
                    const prevMonth = currentIdx >= 0 && currentIdx < months.length - 1 ? months[currentIdx + 1] : null
                    const prevV = prevMonth ? items.reduce((sum, it)=> sum + valueFor(it, prevMonth, true), 0) : 0
                    const groupPercentageChange = prevMonth && prevV !== 0 ? ((v - prevV) / prevV) * 100 : null
                    
                    return <td key={m} className="px-4 py-3 text-center font-bold text-slate-800 dark:text-[#f0f0f0] text-xs tabular-nums bg-slate-50 dark:bg-[#111111]">
                      <div className="flex items-center justify-center gap-1">
                        <div className="truncate">{v ? <PrivacyNumber value={v}>{formatEUR(v)}</PrivacyNumber> : ''}</div>
                        
                        {showPercentageChanges && groupPercentageChange !== null && groupPercentageChange !== -100 && (
                          <div className="group/indicator">
                            {(() => {
                              const isPositive = groupPercentageChange > 0
                              const colors = isPositive 
                                ? 'text-emerald-500 dark:text-emerald-400' 
                                : 'text-rose-500 dark:text-rose-400'
                              return (
                                <div className="relative flex items-center justify-center">
                                  <span className={`text-[10px] font-bold ${colors}`}>
                                    {isPositive ? '↑' : '↓'}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover/indicator:opacity-100 transition-opacity whitespace-nowrap z-[10000] pointer-events-none dark:bg-[#111111]">
                                    {hideNumbers ? '••••••' : `${isPositive ? '+' : ''}${groupPercentageChange.toFixed(2)}%`}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    </td>
                  }
                  const item = row.item!
                  const val = valueFor(item, m, true)
                  const isEditing = editing && editing.itemId===item.id && editing.month===m
                  const valObj = item.valuations?.find(v=> safeMonthKey(v.month)===m)
                  return (
                    <td
                      key={m}
                      onClick={(e)=>{ if(!isEditing) onCellClick(item, m) }}
                      onMouseEnter={()=>{ if(!isEditing) setHoveredCell({ itemId: item.id, month: m }) }}
                      onMouseLeave={()=>setHoveredCell(null)}
                      className={`
                        px-4 py-2 text-center text-xs tabular-nums cursor-pointer border-l-0 border-r-0 hover:border-l hover:border-r hover:border-slate-200 dark:hover:border-slate-700
                        ${isEditing ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-500' : ''}
                      `}
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
                            className="w-full text-center bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 font-medium text-blue-700 dark:text-blue-300 p-0 m-0"
                          />
                          {suggestion !== null && !editValue.trim() && (
                            <div 
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await acceptAndSaveSuggestion();
                              }}
                              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white dark:bg-[#111111] border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 shadow-xl z-50 min-w-[120px]"
                            >
                              <div className="text-[10px] text-slate-300 mb-1 text-center">Suggestion</div>
                              <div className="font-bold text-blue-600 dark:text-blue-400 text-center">{formatEUR(suggestion)}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative group/cell">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`
                              ${!val ? 'text-slate-300 dark:text-slate-700' : 'text-slate-700 dark:text-[#bbb] font-medium'}
                            `}>
                              {val ? <PrivacyNumber value={val}>{formatEUR(val)}</PrivacyNumber> : '—'}
                            </span>
                            
                            {showPercentageChanges && isLeaf(item) && calculatePercentageChange(item, m, months) && (
                              <div className="group/indicator">
                                {(() => {
                                  const change = calculatePercentageChange(item, m, months)
                                  if (!change || change.percentage === -100) return null
                                  const isPositive = change.percentage > 0
                                  const colors = isPositive 
                                    ? 'text-emerald-500 dark:text-emerald-400' 
                                    : 'text-rose-500 dark:text-rose-400'
                                  return (
                                    <div className="relative flex items-center justify-center">
                                      <span className={`text-[10px] font-bold ${colors}`}>
                                        {isPositive ? '↑' : '↓'}
                                      </span>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover/indicator:opacity-100 transition-opacity whitespace-nowrap z-[10000] pointer-events-none dark:bg-[#111111]">
                                        {hideNumbers ? '••••••' : `${isPositive ? '+' : ''}${change.percentage.toFixed(2)}%`}
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
                          </div>
                          
                          {valObj && valObj.note && (
                            <div className="absolute top-0 right-0 group/note">
                              <div className="h-2.5 w-2.5 rounded-full border border-amber-200/80 bg-amber-400 shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"></div>
                              <div className="absolute right-0 bottom-full mb-2 w-64 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-left text-xs leading-5 text-slate-100 opacity-0 shadow-2xl shadow-black/60 transition-opacity pointer-events-none group-hover/note:opacity-100 whitespace-pre-wrap break-words z-[10000] dark:border-slate-500 dark:bg-black">
                                {valObj.note}
                              </div>
                            </div>
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
          <tfoot className="sticky bottom-0 z-[60] bg-[#181818] shadow-[0_-4px_12px_rgba(0,0,0,0.12)]">
            <tr className="bg-[#181818] text-slate-100">
              <td className="p-4 sticky left-0 bg-[#181818] z-50 font-bold text-sm uppercase tracking-wider shadow-[4px_0_8px_-2px_rgba(0,0,0,0.35)]">
                Total Net Worth
              </td>
              {months.map(m=>{
                const v = Array.isArray(groups) ? groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0) : 0
                return <td key={m} className="p-4 text-center font-bold text-sm tabular-nums bg-[#181818] text-slate-100 shadow-[inset_1px_0_0_0_#2b2b2b]">
                  {v? <PrivacyNumber value={v}>{formatEUR(v)}</PrivacyNumber>: ''}
                </td>
              })}
            </tr>
            <tr className="bg-[#202020] text-slate-300">
              <td className="p-3 sticky left-0 bg-[#202020] z-50 font-medium text-xs uppercase tracking-wide shadow-[4px_0_8px_-2px_rgba(0,0,0,0.35)]">
                Growth (Amount)
              </td>
              {months.map((m, i)=>{
                const curr = Array.isArray(groups) ? groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0) : 0
                const prevKey = months[i+1]
                const prev = prevKey && Array.isArray(groups) ? groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, prevKey, true), 0)
                  return sum + s
                }, 0) : 0
                const diff = prevKey ? (curr - prev) : 0
                const isPos = diff > 0
                return <td key={m} className={`p-3 text-center font-medium text-xs tabular-nums bg-[#202020] shadow-[inset_1px_0_0_0_#323232] ${isPos ? 'text-emerald-400' : (diff < 0 ? 'text-rose-400' : '')}`}>
                  {prevKey? <PrivacyNumber value={diff}>{diff > 0 ? '+' : ''}{formatEUR(diff)}</PrivacyNumber>: ''}
                </td>
              })}
            </tr>
            <tr className="bg-[#202020] text-slate-300">
              <td className="p-3 sticky left-0 bg-[#202020] z-50 font-medium text-xs uppercase tracking-wide shadow-[4px_0_8px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_0_#323232]">
                Growth (%)
              </td>
              {months.map((m, i)=>{
                const curr = Array.isArray(groups) ? groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0) : 0
                const prevKey = months[i+1]
                const prev = prevKey && Array.isArray(groups) ? groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, prevKey, true), 0)
                  return sum + s
                }, 0) : 0
                const pct = prevKey && prev !== 0 ? ((curr - prev) / prev) * 100 : 0
                
                // Heatmap logic for text color instead of background
                let textColor = 'text-slate-400';
                if (prevKey && prev !== 0) {
                  if (pct > 0) textColor = 'text-emerald-400';
                  else if (pct < 0) textColor = 'text-rose-400';
                }

                return <td key={m} className={`p-3 text-center font-medium text-xs tabular-nums bg-[#202020] shadow-[inset_1px_1px_0_0_#323232] ${textColor}`}>
                  {prevKey && prev!==0 ? (
                    <PrivacyNumber value={pct}>{pct > 0 ? '+' : ''}{pct.toFixed(2)}%</PrivacyNumber>
                  ) : ''}
                </td>
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