import { useEffect, useMemo, useRef, useState } from 'react'
import { formatEUR, formatDateDMY, formatDateMonthYear } from '@/lib/format'

type Group = { id:number; name:string; items: Item[] }
type Item = { id:number; name:string; description?:string; parentItemId?:number|null; hidden?: boolean; depreciationAmount?: number; valuations?: { month:string; value:number }[] }

export function AssetsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [manualMonths, setManualMonths] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<{ itemId:number; month:string; initial:string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  async function refresh() {
    const res = await fetch('/api/asset-groups', { headers: tokenHeader() })
    const data = await res.json()
    setGroups(data)
    const set = new Set<string>()
    const nowKey = monthKey(new Date())
    set.add(nowKey)
    data.forEach((g:Group)=> g.items?.forEach((it:Item)=> it.valuations?.forEach(v=> set.add(monthKey(new Date(v.month))))))
    
    // Preserve manually added months
    manualMonths.forEach(month => set.add(month))
    
    const sorted = Array.from(set).sort((a,b)=> new Date(b).getTime() - new Date(a).getTime())
    setMonths(sorted)
  }
  useEffect(()=>{ refresh() }, [])
  
  // Refresh when manualMonths changes to ensure consistency
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
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth()+1).padStart(2,'0')
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
    await fetch(`/api/asset-items/${item.id}`, { method:'PUT', headers:{ 'Content-Type':'application/json', ...tokenHeader() }, body: JSON.stringify({ hidden: !item.hidden }) })
    await refresh()
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
    const current = String(valueFor(item, month) || '')
    setEditing({ itemId: item.id, month, initial: current })
    setEditValue(current)
  }

  async function saveEdit() {
    if (!editing) return
    const { itemId, month } = editing
    const body = { month, value: Number(editValue||0) }
    await fetch(`/api/asset-items/${itemId}/valuations`, { method:'POST', headers:{ 'Content-Type':'application/json', ...tokenHeader() }, body: JSON.stringify(body) })
    setEditing(null)
    setEditValue('')
    refresh()
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
      // Don't apply depreciation for past months - just add the month
      setManualMonths(prev => new Set([...prev, mk]))
      setMonths([...months, mk])
      // Don't call refresh() immediately to avoid race condition
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
      // Apply depreciation to the new month first
      try {
        await fetch('/api/asset-valuations/apply-depreciation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...tokenHeader() },
          body: JSON.stringify({ month: mk })
        })
        // Then add the month to the list
        setManualMonths(prev => new Set([...prev, mk]))
        setMonths([mk, ...months])
        // Don't call refresh() immediately to avoid race condition
      } catch (error) {
        console.error('Error applying depreciation:', error)
        // Still add the month even if depreciation fails
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
    // observe vertical scroll of inner container to keep header sticky relative to it
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

  // Render a fixed scrollbar bar at bottom of viewport when overflow-x
  useEffect(()=>{
    if (!showFixedScrollbar) return
    if (!fixedScrollRef.current) return
    // ensure width tracks table width
    fixedScrollRef.current.style.width = '100%'
  }, [showFixedScrollbar, scrollContentWidth])

  return (
    <div ref={wrapperRef} className="bg-white p-2 sm:p-4 rounded shadow -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 relative">
      <div ref={scrollRef} className="overflow-y-auto overflow-x-auto" style={{ maxHeight: '85vh' }}>
        <table className="min-w-full text-sm">
          <thead className="sticky top-0" style={{ zIndex: 90 }}>
            <tr className="border-b" style={{ backgroundColor: '#10b981' }}>
              <th className="p-2 sticky top-0 left-0 text-left" style={{ zIndex: 100, minWidth: '340px', width: '380px', backgroundColor: '#10b981' }}>
                <span className="font-semibold" style={{ fontSize: '1.08rem' }}>Asset</span>
              </th>
              {months.map((m, i)=> (
                <th key={m} onContextMenu={async (e)=>{ 
                  e.preventDefault(); 
                  if(confirm(`Cancellare tutte le valutazioni del mese ${new Date(m).toLocaleDateString(undefined,{ month:'long', year:'numeric' })}?`)){ 
                    // Remove from manual months first
                    setManualMonths(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(m)
                      return newSet
                    })
                    // Then delete valuations
                    await fetch(`/api/asset-valuations?month=${encodeURIComponent(m)}`, { method:'DELETE', headers: { ...tokenHeader() } })
                    // Finally refresh
                    await refresh() 
                  } 
                }} className="p-2 whitespace-nowrap text-center border-l border-gray-200 relative sticky top-0" style={{ zIndex: 95, minWidth: '140px', backgroundColor: '#10b981' }}>
                  {i===0 && (
                    <button onClick={addNextMonth} className="absolute left-1 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-gray-600 hover:text-gray-900" title="Aggiungi mese successivo" aria-label="Aggiungi mese successivo">‹</button>
                  )}
                  {formatDateMonthYear(new Date(m))}
                  {i===months.length-1 && (
                    <button onClick={addPrevMonth} className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-gray-600 hover:text-gray-900" title="Aggiungi mese precedente" aria-label="Aggiungi mese precedente">›</button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx)=> (
              <tr key={idx} className={`border-b ${row.isGroup? '' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}`}>
                <td className={`p-2 sticky left-0 bg-white ${row.isGroup? 'font-semibold text-gray-900':''}`} style={{ zIndex: 80, paddingLeft: `${row.depth*26}px`, fontSize: row.isGroup? '0.95rem' : (row.depth>1? '0.85rem':'0.9rem') , minWidth: '340px', width: '380px', backgroundColor: row.isGroup ? '#FFE37A' : '#FFFFFF', textAlign: 'center', boxShadow: '2px 0 0 #d1d5db' }}>
                  {row.isGroup ? (
                    row.name
                  ) : (
                    <div className="flex items-center gap-2">
                      {hasChildren(row.item) && (
                        <button
                          onClick={()=> {
                            const it = row.item!
                            if (hasVisibleChildren(it)) collapseItem(it); else expandItem(it)
                          }}
                          className="bg-transparent border-0 p-0 text-gray-400 hover:text-gray-700 focus:outline-none cursor-pointer"
                          title={hasVisibleChildren(row.item) ? 'Comprimi' : 'Espandi'}
                          aria-label={hasVisibleChildren(row.item) ? 'Comprimi' : 'Espandi'}
                        >
                          {hasVisibleChildren(row.item) ? '▾' : '▸'}
                        </button>
                      )}
                      <span>{row.name}</span>
                    </div>
                  )}
                </td>
                {months.map(m=> {
                  if (row.isGroup) {
                    const group = groups.find(g=> g.id===row.groupId)
                    const items = (group?.items||[]).filter(it=> !it.parentItemId && !it.hidden)
                    const v = items.reduce((sum, it)=> sum + valueFor(it, m, true), 0)
                    return <td key={m} className="p-2 text-center font-semibold text-gray-800 border-l border-gray-200" style={{ minWidth: '140px', backgroundColor: '#fef3c7' }}>{v ? formatEUR(v) : ''}</td>
                  }
                  const item = row.item!
                  const val = valueFor(item, m, true)
                  const isEditing = editing && editing.itemId===item.id && editing.month===m
                  return (
                    <td
                      key={m}
                      onClick={()=>{ if(!isEditing) onCellClick(item, m) }}
                      className="p-2 text-center border-l border-gray-200 hover:bg-blue-50 cursor-text"
                      style={{ minWidth: '140px' }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={e=>setEditValue(e.target.value)}
                          onBlur={()=>{ saveEdit() }}
                          onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveEdit() } if(e.key==='Escape'){ setEditing(null); setEditValue('') } }}
                          className="no-spin w-full text-center bg-transparent outline-none focus:outline-none focus:ring-0 border-0 p-0 m-0 appearance-none"
                        />
                      ) : (
                        <div className="w-32 mx-auto">
                          {val? formatEUR(val) : <span className="text-gray-400">—</span>}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {/* Footer totals pinned at bottom */}
          <tfoot className="sticky bottom-0" style={{ zIndex: 90 }}>
            {/* Riga Total Net Worth (invariata) */}
            <tr style={{ backgroundColor: '#FFE37A' }}>
              <td className="p-2 sticky left-0" style={{ backgroundColor: '#FFE37A', zIndex: 90, fontWeight: 600, textAlign: 'center', minWidth: '340px', width: '380px' }}>Total Net Worth</td>
              {months.map(m=>{
                const v = groups.reduce((sum, g)=>{
                  const roots = (g.items||[]).filter(it=> !it.parentItemId && !it.hidden)
                  const s = roots.reduce((acc, it)=> acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0)
                return <td key={m} className="p-2 text-center border-l border-gray-200" style={{ backgroundColor: '#FFE37A' }}>{v? formatEUR(v): ''}</td>
              })}
            </tr>

            {/* Riga Growth vs previous month (CAMBIATO COLORE VERDE) */}
            <tr style={{ backgroundColor: '#22c55e' }}> {/* <-- Verde più acceso */}
              <td className="p-2 sticky left-0" style={{ backgroundColor: 'white', zIndex: 90, fontWeight: 600, textAlign: 'center', color: 'black', minWidth: '340px', width: '380px' }}>Growth vs previous month</td>
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
                return <td key={m} className="p-2 text-center border-l border-gray-200" style={{ backgroundColor: 'white', color: 'black' }}>{prevKey? formatEUR(diff): ''}</td>
              })}
            </tr>

            {/* Riga Growth percentage (CAMBIATO CALCOLO COLORE) */}
            <tr style={{ backgroundColor: 'white' }}>
              <td className="p-2 sticky left-0" style={{ backgroundColor: 'white', zIndex: 90, fontWeight: 600, textAlign: 'center', minWidth: '340px', width: '380px' }}>Growth percentage</td>
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
                
                // Calcola colore dinamico basato sulla percentuale (CON NUOVO VERDE)
                let bgColor = 'white'; // Default per 0% o primo mese
                if (prevKey && prev !== 0) {
                    const absPct = Math.abs(pct);
                    // Scala l'opacità: 0% = 0 opacity, 10% (o più) = 1 opacity
                    const opacity = Math.min(absPct / 10, 1);
                    if (pct > 0) {
                        // Verde (nuovo colore) per valori positivi
                        bgColor = `rgba(34, 197, 94, ${opacity})`; // RGB per #22c55e
                    } else if (pct < 0) {
                        // Rosso per valori negativi (mantenuto)
                        bgColor = `rgba(239, 68, 68, ${opacity})`; // RGB per #ef4444
                    }
                }
                
                return <td key={m} className="p-2 text-center border-l border-gray-200" style={{ backgroundColor: bgColor }}>{prevKey && prev!==0? `${pct.toFixed(2)}%` : ''}</td>
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      {/* bottom fixed scrollbar removed per user request */}
    </div>
  )
}


