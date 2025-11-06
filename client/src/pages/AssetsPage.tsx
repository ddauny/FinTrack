import { useEffect, useMemo, useRef, useState } from 'react'
import { formatEUR, formatDateDMY, formatDateMonthYear } from '../lib/format'
import { Parser } from 'expr-eval'
import NotePopover from '../components/NotePopover' // Assicurati che questo percorso sia corretto

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
    setEditing({ itemId: item.id, month, initial: raw })
    setEditValue(raw)
    setSelectedCell({ itemId: item.id, month })
  }

  async function saveEdit() {
    if (!editing) return
    const { itemId, month } = editing
    let payload: any = { month }
    const trimmed = (editValue || '').trim()
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
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveEdit();
    } 
    else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(null);
      setEditValue('');
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
        if (selectedCell) {
          // Ferma l'evento per non far illuminare la riga
          e.preventDefault();
          e.stopPropagation();

          const { itemId, month } = selectedCell
          const item = groups.flatMap(g=> g.items||[]).find(it=> it.id===itemId)
          const v = item?.valuations?.find(v=> new Date(v.month).toISOString().slice(0,10) === month)
          setNoteValue(v?.note || '')
          setShowNoteFor(selectedCell)
          
          // Annulla la selezione della cella per rimuovere l'highlight della riga
          setSelectedCell(null); 
          setHoveredRowIdx(null);
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [selectedCell, groups, editing, showNoteFor]) // Aggiunte dipendenze
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
    payload.note = note || null // 'note' può essere una stringa vuota o null

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

  return (
    <div ref={wrapperRef} className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded shadow -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 relative">
      
      {countHiddenRows() > 0 && (
        <div className="mb-2 flex justify-end">
          <button 
            onClick={showAllHidden} 
            className="flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            <IconEye />
            Mostra {countHiddenRows()} righe nascoste
          </button>
        </div>
      )}

      <div ref={scrollRef} className="overflow-y-auto overflow-x-auto" style={{ maxHeight: '85vh' }}>
        <table className="min-w-full text-sm">
          <thead className="sticky top-0" style={{ zIndex: 90 }}>
            <tr className="border-b bg-slate-700 dark:bg-slate-900 text-white">
              <th className="p-2 sticky top-0 left-0 text-left bg-slate-700 dark:bg-slate-900 text-white" style={{ zIndex: 100, minWidth: '340px', width: '380px' }}>
                <span className="font-semibold" style={{ fontSize: '1.08rem' }}>Asset</span>
              </th>
              {months.map((m, i)=> (
                <th key={m} onContextMenu={async (e)=>{ 
                  e.preventDefault(); 
                  if(confirm(`Cancellare tutte le valutazioni del mese ${new Date(m).toLocaleDateString(undefined,{ month:'long', year:'numeric' })}?`)){ 
                    setManualMonths(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(m)
                      return newSet
                    })
                    await fetch(`/api/asset-valuations?month=${encodeURIComponent(m)}`, { method:'DELETE', headers: { ...tokenHeader() } })
                    await refresh() 
                  } 
                }} className="p-2 whitespace-nowrap text-center border-l border-gray-200 dark:border-gray-700 relative sticky top-0 bg-slate-600 dark:bg-slate-800 text-white" style={{ zIndex: 95, minWidth: '140px' }}>
                  {i===0 && (
                    <button onClick={addNextMonth} className="absolute left-1 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-white hover:text-gray-200" title="Aggiungi mese successivo" aria-label="Aggiungi mese successivo">‹</button>
                  )}
                  {formatDateMonthYear(new Date(m))}
                  {i===months.length-1 && (
                    <button onClick={addPrevMonth} className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-white hover:text-gray-200" title="Aggiungi mese precedente" aria-label="Aggiungi mese precedente">›</button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx)=> (
              <tr key={idx} onMouseEnter={()=>setHoveredRowIdx(idx)} onMouseLeave={()=>setHoveredRowIdx(null)} className={`border-b ${row.isGroup? '' : (idx % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700/50')}`}>
                <td className={`p-2 sticky left-0 ${row.isGroup ? 'bg-slate-100 dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' } border-r border-gray-200 dark:border-gray-700`} style={{ zIndex: 80, paddingLeft: `${row.depth*26}px`, fontSize: row.isGroup? '0.95rem' : (row.depth>1? '0.85rem':'0.9rem') , minWidth: '340px', width: '380px', textAlign: 'center' }}>
                  {row.isGroup ? (
                    <div className="flex items-center justify-between">
                      <span>{row.name}</span>
                      {hoveredRowIdx===idx && (
                        <button 
                          title="Nascondi gruppo" 
                          onClick={()=> row.groupId && hideGroup(row.groupId)} 
                          className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
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
                          className="bg-transparent border-0 p-0 text-gray-400 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none cursor-pointer"
                          title={hasVisibleChildren(row.item) ? 'Comprimi' : 'Espandi'}
                          aria-label={hasVisibleChildren(row.item) ? 'Comprimi' : 'Espandi'}
                        >
                          {hasVisibleChildren(row.item) ? '▾' : '▸'}
                        </button>
                      )}
                      <span>{row.name}</span>
                      {hoveredRowIdx===idx && (
                        <button 
                          title="Nascondi riga" 
                          onClick={()=> toggleHidden(row.item!)} 
                          className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
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
                    const items = (group?.items||[]).filter(it=> !it.parentItemId && !it.hidden)
                    const v = items.reduce((sum, it)=> sum + valueFor(it, m, true), 0)
                    return <td key={m} className="p-2 text-center font-semibold text-slate-900 dark:text-slate-100 border-l border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800" style={{ minWidth: '140px' }}>{v ? formatEUR(v) : ''}</td>
                  }
                  const item = row.item!
                  const val = valueFor(item, m, true)
                  const isEditing = editing && editing.itemId===item.id && editing.month===m
                  const valObj = item.valuations?.find(v=> monthKey(new Date(v.month))===m)
                  return (
                    <td
                      key={m}
                      onClick={(e)=>{ if(!isEditing) onCellClick(item, m) }}
                      className="p-2 text-center border-l border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 cursor-text"
                      style={{ minWidth: '140px' }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          step="0.01"
                          value={editValue}
                          onChange={e=>setEditValue(e.target.value)}
                          onBlur={()=>{ saveEdit() }}
                          onKeyDown={handleKeyDown}
                          className="no-spin w-full text-center bg-transparent outline-none focus:outline-none focus:ring-0 border-0 p-0 m-0 appearance-none"
                        />
                      ) : (
                        <div className="w-32 mx-auto relative">
                          {val? formatEUR(val) : <span className="text-gray-400">—</span>}
                          
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
            ))}
          </tbody>
          <tfoot className="sticky bottom-0" style={{ zIndex: 90 }}>
            <tr className="bg-slate-200 dark:bg-slate-800">
              <td className="p-2 sticky left-0 bg-slate-200 dark:bg-slate-800" style={{ zIndex: 90, fontWeight: 600, textAlign: 'center', minWidth: '340px', width: '380px' }}>Total Net Worth</td>
              {months.map(m=>{
                const v = groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId && !it.hidden)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0)
                return <td key={m} className="p-2 text-center border-l border-gray-200 dark:border-gray-700 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100" >{v? formatEUR(v): ''}</td>
              })}
            </tr>
            <tr className="bg-slate-100 dark:bg-slate-900">
              <td className="p-2 sticky left-0 bg-slate-50 dark:bg-slate-800" style={{ zIndex: 90, fontWeight: 600, textAlign: 'center', minWidth: '340px', width: '380px' }}>Growth vs previous month</td>
              {months.map((m, i)=>{
                const curr = groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId && !it.hidden)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0)
                const prevKey = months[i+1]
                const prev = prevKey ? groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId && !it.hidden)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, prevKey, true), 0)
                  return sum + s
                }, 0) : 0
                const diff = prevKey ? (curr - prev) : 0
                return <td key={m} className="p-2 text-center border-l border-gray-200 dark:border-gray-700 bg-transparent text-slate-900 dark:text-slate-100">{prevKey? formatEUR(diff): ''}</td>
              })}
            </tr>
            <tr className="bg-transparent">
              <td className="p-2 sticky left-0 bg-transparent" style={{ zIndex: 90, fontWeight: 600, textAlign: 'center', minWidth: '340px', width: '380px' }}>Growth percentage</td>
              {months.map((m, i)=>{
                const curr = groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId && !it.hidden)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0)
                const prevKey = months[i+1]
                const prev = prevKey ? groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId && !it.hidden)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, prevKey, true), 0)
                  return sum + s
                }, 0) : 0
                const pct = prevKey && prev !== 0 ? ((curr - prev) / prev) * 100 : 0
                
                let bgColor = isDark ? 'transparent' : 'white'; 
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
        onSave={(n: string)=> { if (showNoteFor) saveNote(showNoteFor.itemId, showNoteFor.month, n) }}
      />
    </div>
  )
}