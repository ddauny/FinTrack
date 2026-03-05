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

type Group = { id: number; name: string; items: Item[] }
type Item = { id: number; name: string; description?: string; parentItemId?: number | null; hidden?: boolean; depreciationAmount?: number; valuations?: { month: string; value: number; formula?: string | null; note?: string | null }[] }

export function AssetsPage() {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const [groups, setGroups] = useState<Group[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [manualMonths, setManualMonths] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<{ itemId: number; month: string; initial: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [selectedCell, setSelectedCell] = useState<{ itemId: number; month: string } | null>(null)
  const [showNoteFor, setShowNoteFor] = useState<{ itemId: number; month: string } | null>(null)
  const [noteValue, setNoteValue] = useState<string>('')
  const [hoveredRowIdx, setHoveredRowIdx] = useState<number | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ itemId: number; month: string } | null>(null)
  const [suggestion, setSuggestion] = useState<number | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [mobileMonthIdx, setMobileMonthIdx] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [isFullScreen, setIsFullScreen] = useState(false)

  async function refresh() {
    const res = await fetch('/api/asset-groups', { headers: tokenHeader() })
    const data = await res.json()
    setGroups(data)
    const set = new Set<string>()
    const nowKey = monthKey(new Date())
    set.add(nowKey)
    data.forEach((g: Group) => g.items?.forEach((it: Item) => it.valuations?.forEach(v => set.add(monthKey(new Date(v.month))))))

    manualMonths.forEach(month => set.add(month))

    const sorted = Array.from(set).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    setMonths(sorted)
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

  const rows = useMemo(() => {
    const r: { depth: number; isGroup: boolean; groupId?: number; item?: Item; name: string }[] = []
    for (const g of groups) {
      r.push({ depth: 0, isGroup: true, groupId: g.id, name: g.name })
      const items = (g.items || [])
      const roots = items.filter(it => !it.parentItemId)
      const childrenOf = (id: number) => items.filter(it => it.parentItemId === id)
      const emitSiblings = (list: Item[], depth: number) => {
        for (const it of list) {
          if (it.hidden) continue
          r.push({ depth, isGroup: false, groupId: g.id, item: it, name: it.name })
          const children = childrenOf(it.id)
          if (children.length) emitSiblings(children, depth + 1)
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
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}-01`
  }

  function valueFor(item: Item | undefined, month: string, includeHidden: boolean = false): number {
    if (!item) return 0
    const direct = item.valuations?.find(v => monthKey(new Date(v.month)) === month)?.value
    if (direct !== undefined) return Number(direct)
    const group = groups.find(g => g.items?.some(i => i.id === item.id))
    if (!group) return 0
    const children = (group.items || []).filter(it => it.parentItemId === item.id && (includeHidden || !it.hidden))
    if (children.length === 0) return 0
    return children.reduce((sum, ch) => sum + valueFor(ch, month, includeHidden), 0)
  }

  function isLeaf(item: Item | undefined): boolean {
    if (!item) return false
    const group = groups.find(g => g.items?.some(i => i.id === item.id))
    if (!group) return true
    return !(group.items || []).some(it => it.parentItemId === item.id)
  }

  async function toggleHidden(item: Item) {
    try {
      await fetch(`/api/asset-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
        body: JSON.stringify({ hidden: !item.hidden })
      })
      await refresh()
    } catch (e) {
      console.error("Failed to toggle hidden state:", e)
    }
  }

  function groupOfItem(item: Item | undefined) {
    if (!item) return undefined
    return groups.find(g => g.items?.some(i => i.id === item.id))
  }

  function childrenOfItem(item: Item | undefined): Item[] {
    const g = groupOfItem(item)
    if (!g || !item) return []
    return (g.items || []).filter(it => it.parentItemId === item.id)
  }

  function hasChildren(item: Item | undefined): boolean {
    return childrenOfItem(item).length > 0
  }

  function hasVisibleChildren(item: Item | undefined): boolean {
    return childrenOfItem(item).some(ch => !ch.hidden)
  }

  async function collapseItem(item: Item) {
    await fetch(`/api/asset-items/${item.id}/collapse`, { method: 'POST', headers: { ...tokenHeader() } })
    await refresh()
  }

  async function expandItem(item: Item) {
    await fetch(`/api/asset-items/${item.id}/expand`, { method: 'POST', headers: { ...tokenHeader() } })
    await refresh()
  }

  function onCellClick(item: Item | undefined, month: string) {
    if (!item) return
    if (!isLeaf(item)) return

    const valuation = item.valuations?.find(v => new Date(v.month).toISOString().slice(0, 10) === month)
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
      const prevValuation = item.valuations?.find(v => monthKey(new Date(v.month)) === prevMonthKey)
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

    const item = groups.flatMap(g => g.items || []).find(it => it.id === itemId)
    const existingVal = item?.valuations?.find(v => new Date(v.month).toISOString().slice(0, 10) === month)
    if (existingVal && existingVal.note) payload.note = existingVal.note

    try {
      await fetch(`/api/asset-items/${itemId}/valuations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
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
    // Normalize decimal separator: replace comma with dot (Italian locale support)
    const normalized = trimmed.replace(',', '.')

    // Clear suggestion after we've used editValue
    setSuggestion(null)
    if (normalized.startsWith('=')) {
      try {
        const parser = new Parser()
        const expr = normalized.slice(1)
        const result = parser.evaluate(expr)
        const numeric = Number(result || 0)
        payload.value = Number.isFinite(numeric) ? numeric : 0
        payload.formula = normalized
      } catch (err) {
        console.error('Formula parse error', err)
        payload.value = 0
        payload.formula = normalized
      }
    } else {
      const numeric = Number(normalized || 0)
      payload.value = Number.isFinite(numeric) ? numeric : 0
      payload.formula = null
    }
    const item = groups.flatMap(g => g.items || []).find(it => it.id === itemId)
    const existingVal = item?.valuations?.find(v => new Date(v.month).toISOString().slice(0, 10) === month)
    if (existingVal && existingVal.note) payload.note = existingVal.note
    try {
      await fetch(`/api/asset-items/${itemId}/valuations`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...tokenHeader() }, body: JSON.stringify(payload) })
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Non fare nulla se l'utente sta già scrivendo in un input o se il modal è già aperto
      if (editing || showNoteFor) return;

      // Avoid triggering if typing in an input (though editing check covers most, explicit check is safer)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key.toLowerCase() === 'n') {
        // Usa hoveredCell invece di selectedCell
        if (hoveredCell) {
          e.preventDefault();
          e.stopPropagation();

          const { itemId, month } = hoveredCell
          const item = groups.flatMap(g => g.items || []).find(it => it.id === itemId)
          const v = item?.valuations?.find(v => new Date(v.month).toISOString().slice(0, 10) === month)
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
    return () => window.removeEventListener('keydown', onKey)
  }, [hoveredCell, groups, editing, showNoteFor])
  // --- FINE MODIFICA ---

  // --- MODIFICA: Corretta la funzione 'saveNote' per l'errore 500 ---
  async function saveNote(itemId: number, month: string, note: string) {
    const item = groups.flatMap(g => g.items || []).find(it => it.id === itemId)
    const v = item?.valuations?.find(v => new Date(v.month).toISOString().slice(0, 10) === month)
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
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
    return groups.reduce((acc, g) => acc + ((g.items || []).filter(it => it.hidden).length), 0)
  }

  async function hideGroup(groupId: number) {
    const g = groups.find(x => x.id === groupId)
    if (!g) return
    try {
      await fetch(`/api/asset-groups/${groupId}/hide-all`, {
        method: 'POST',
        headers: { ...tokenHeader() }
      })
    } catch (e) {
      console.error(e)
    }
    await refresh()
  }

  async function showAllHidden() {
    try {
      await fetch(`/api/asset-items/show-all`, {
        method: 'POST',
        headers: { ...tokenHeader() }
      })
    } catch (e) {
      console.error(e)
    }
    await refresh()
  }

  async function addPrevMonth() {
    if (months.length === 0) {
      const mk = monthKey(new Date())
      setManualMonths(prev => new Set([...prev, mk]))
      setMonths([mk])
      return
    }
    const oldest = new Date(months[months.length - 1])
    const prev = new Date(oldest)
    // Use UTC setters/getters to match monthKey (which uses UTC) and avoid
    // timezone shifts that can move the local date to the previous day and
    // cause an off-by-one-month when decrementing.
    prev.setUTCMonth(prev.getUTCMonth() - 1)
    const mk = monthKey(prev)
    if (!months.includes(mk)) {
      setManualMonths(prev => new Set([...prev, mk]))
      setMonths([...months, mk])
    }
  }

  async function addNextMonth() {
    if (months.length === 0) {
      const mk = monthKey(new Date())
      setManualMonths(prev => new Set([...prev, mk]))
      setMonths([mk])
      return
    }
    const newest = new Date(months[0])
    const nxt = new Date(newest)
    // Use UTC setters/getters to match monthKey (which uses UTC) and avoid
    // timezone shifts when incrementing the month.
    nxt.setUTCMonth(nxt.getUTCMonth() + 1)
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
  useEffect(() => {
    const sc = scrollRef.current
    if (!sc) return
    const update = () => {
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
    const onResize = () => update()
    window.addEventListener('resize', onResize)
    sc.addEventListener('scroll', onResize, { passive: true } as any)
    let syncing = false
    const onMainScroll = () => {
      if (!fixedScrollRef.current) return
      if (syncing) return
      syncing = true
      fixedScrollRef.current.scrollLeft = sc.scrollLeft
      syncing = false
    }
    const onFixedScroll = () => {
      if (!fixedScrollRef.current) return
      if (syncing) return
      syncing = true
      sc.scrollLeft = fixedScrollRef.current.scrollLeft
      syncing = false
    }
    sc.addEventListener('scroll', onMainScroll)
    fixedScrollRef.current?.addEventListener('scroll', onFixedScroll)
    return () => {
      window.removeEventListener('resize', onResize)
      sc.removeEventListener('scroll', onResize as any)
      sc.removeEventListener('scroll', onMainScroll)
      fixedScrollRef.current?.removeEventListener('scroll', onFixedScroll)
    }
  }, [groups, months])

  useEffect(() => {
    if (!showFixedScrollbar) return
    if (!fixedScrollRef.current) return
    fixedScrollRef.current.style.width = '100%'
  }, [showFixedScrollbar, scrollContentWidth])

  // Mobile Card View Component
  const MobileView = () => {
    const currentMonth = months[mobileMonthIdx]
    const prevMonth = months[mobileMonthIdx + 1]

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

    // Recursive item row component
    const MobileItemRow = ({ item, depth, groupItems }: { item: Item, depth: number, groupItems: Item[] }) => {
      const value = valueFor(item, currentMonth, false)
      const children = groupItems.filter(it => it.parentItemId === item.id && !it.hidden)
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
              flex items-center justify-between py-3 px-4 border-b border-stone-50 dark:border-stone-800/50 last:border-0
              ${depth > 0 ? 'bg-stone-50/50 dark:bg-stone-900/50' : ''}
              active:bg-stone-100 dark:active:bg-stone-800 transition-colors cursor-pointer
            `}
            style={{ paddingLeft: `${depth * 1 + 1}rem` }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {hasChildren && (
                <span className="text-stone-400 text-xs w-4 text-center">{expanded ? '▼' : '▶'}</span>
              )}
              {!hasChildren && depth > 0 && <span className="w-4"></span>}
              <span className={`truncate ${depth === 0 ? 'font-medium text-stone-900 dark:text-stone-200' : 'text-stone-600 dark:text-stone-400 text-sm'}`}>
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.valuations?.find(v => monthKey(new Date(v.month)) === currentMonth)?.note && (
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
              )}
              <span className={`font-medium ${!value ? 'text-stone-300 dark:text-stone-700' : 'text-stone-900 dark:text-white'}`}>
                {value ? <PrivacyNumber value={value}>{formatEUR(value)}</PrivacyNumber> : '—'}
              </span>
              {!hasChildren && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-stone-300 dark:text-stone-600">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          {hasChildren && expanded && children.map(child => (
            <MobileItemRow key={child.id} item={child} depth={depth + 1} groupItems={groupItems} />
          ))}
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-20">
        {/* Sticky Header: Month Navigation */}
        <div className="sticky top-0 z-30 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileMonthIdx(prev => Math.min(prev + 1, months.length - 1))}
              disabled={mobileMonthIdx >= months.length - 1}
              className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            <div className="text-center">
              <div className="text-sm font-semibold text-stone-900 dark:text-white uppercase tracking-wide">
                {currentMonth ? formatDateMonthYear(new Date(currentMonth)) : 'No Data'}
              </div>
            </div>

            <button
              onClick={() => setMobileMonthIdx(prev => Math.max(prev - 1, 0))}
              disabled={mobileMonthIdx <= 0}
              className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="px-4 py-6 bg-white dark:bg-stone-900 mb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="text-center">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Total Net Worth</p>
            <h2 className="text-3xl font-bold text-stone-900 dark:text-white mb-2">
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
              <div key={group.id} className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center justify-between p-4 cursor-pointer active:bg-stone-50 dark:active:bg-stone-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-semibold text-stone-900 dark:text-white">{group.name}</span>
                  </div>
                  <div className="font-bold text-stone-900 dark:text-white">
                    <PrivacyNumber value={groupTotal}>{formatEUR(groupTotal)}</PrivacyNumber>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-stone-100 dark:border-stone-800">
                    {(group.items || []).filter(it => !it.parentItemId && !it.hidden).map(item => (
                      <MobileItemRow key={item.id} item={item} depth={0} groupItems={group.items || []} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center">
                <h3 className="font-bold text-lg text-stone-900 dark:text-white">Update Value</h3>
                <button onClick={() => { setEditing(null); setEditValue(''); }} className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 uppercase mb-1">Asset</label>
                  <div className="text-lg font-medium text-stone-900 dark:text-white">
                    {groups.flatMap(g => g.items || []).find(i => i.id === editing.itemId)?.name}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 uppercase mb-1">Value ({formatDateMonthYear(new Date(editing.month))})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -transtone-y-1/2 text-stone-400">€</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } }}
                      className="w-full pl-8 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xl font-bold text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  onClick={saveEdit}
                  className="btn-primary w-full !py-3.5 !font-bold shadow-lg shadow-blue-500/30 active:scale-[0.98]"
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
      <div className="bg-white dark:bg-stone-800 shadow-none">
        <MobileView />
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className={isFullScreen
        ? "bg-stone-50 dark:bg-stone-950 fixed top-16 bottom-0 left-0 right-0 z-50"
        : "relative w-full h-full bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden"
      }
    >
      <div
        ref={scrollRef}
        className="overflow-auto assets-scrollbar w-full h-full"
      >
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-50 shadow-md">
            <tr className="bg-stone-900 text-white">
              <th className="px-6 py-4 sticky top-0 left-0 text-left bg-stone-900 z-50 font-bold uppercase tracking-wider text-xs border-b border-stone-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]" style={{ minWidth: '240px', width: '20%' }}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    className="p-1.5 -ml-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
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
                      className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors"
                    >
                      <IconEye />
                      {countHiddenRows()}
                    </button>
                  )}
                  <button
                    onClick={() => setIsMobileView(true)}
                    title="Switch to card view"
                    className="ml-auto md:hidden text-stone-400 hover:text-white"
                  >
                    📱
                  </button>
                </div>
              </th>
              {months.map((m, i) => (
                <th key={m} className="px-4 py-4 whitespace-nowrap text-center font-medium text-xs uppercase tracking-wider border-b border-stone-700 bg-stone-900 text-stone-300 group relative" style={{ minWidth: '140px', width: 'auto' }}>
                  <div className="relative flex items-center justify-center gap-2 group/inner">
                    {i === 0 && (
                      <button onClick={addNextMonth} className="opacity-0 group-hover/inner:opacity-100 transition-opacity absolute -left-2 p-1 hover:text-white">‹</button>
                    )}
                    <span>{formatDateMonthYear(new Date(m))}</span>
                    {i === months.length - 1 && (
                      <button onClick={addPrevMonth} className="opacity-0 group-hover/inner:opacity-100 transition-opacity absolute -right-2 p-1 hover:text-white">›</button>
                    )}
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Delete all valuations for ${new Date(m).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}?`)) {
                        await fetch(`/api/asset-valuations?month=${encodeURIComponent(m)}`, { method: 'DELETE', headers: { ...tokenHeader() } })
                        setManualMonths(prev => {
                          const newSet = new Set(prev)
                          newSet.delete(m)
                          return newSet
                        })
                      }
                    }}
                    className="absolute top-1 right-1 p-1 text-stone-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
          <tbody className="bg-white dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800">
            {rows.map((row, idx) => {
              // Check if this is a new group (not the first row)
              const isNewGroup = row.isGroup && idx > 0
              return (
                <tr key={idx}
                  onMouseEnter={() => setHoveredRowIdx(idx)}
                  onMouseLeave={() => setHoveredRowIdx(null)}
                  className={`
                    transition-colors duration-75
                    ${row.isGroup
                      ? 'bg-stone-50 dark:bg-stone-800/50'
                      : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                    }
                    ${isNewGroup ? 'border-t-2 border-stone-100 dark:border-stone-800' : ''}
                  `}
                >
                  <td className={`
                    sticky left-0 z-40 border-r border-stone-100 dark:border-stone-800
                    ${row.isGroup
                      ? 'py-3 px-6 font-bold text-stone-900 dark:text-white bg-stone-50 dark:bg-stone-800/90'
                      : 'py-2 px-6 text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900'
                    }
                    shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)]
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
                          onClick={() => row.groupId && hideGroup(row.groupId)}
                          className={`ml-2 text-stone-300 hover:text-red-500 transition-colors ${hoveredRowIdx === idx ? 'opacity-100' : 'opacity-0'}`}
                        >
                          <IconEyeSlash />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        {hasChildren(row.item) && (
                          <button
                            onClick={() => {
                              const it = row.item!
                              if (hasVisibleChildren(it)) collapseItem(it); else expandItem(it)
                            }}
                            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                          >
                            {hasVisibleChildren(row.item) ? '▾' : '▸'}
                          </button>
                        )}
                        <span className="truncate">{row.name}</span>
                        <button
                          title="Hide row"
                          onClick={() => toggleHidden(row.item!)}
                          className={`ml-auto text-stone-300 hover:text-red-500 transition-colors ${hoveredRowIdx === idx ? 'opacity-100' : 'opacity-0'}`}
                        >
                          <IconEyeSlash />
                        </button>
                      </div>
                    )}
                  </td>

                  {months.map(m => {
                    if (row.isGroup) {
                      const group = groups.find(g => g.id === row.groupId)
                      const items = (group?.items || []).filter(it => !it.parentItemId)
                      const v = items.reduce((sum, it) => sum + valueFor(it, m, true), 0)
                      return <td key={m} className="px-4 py-3 text-center font-bold text-stone-800 dark:text-stone-100 text-xs tabular-nums bg-stone-50 dark:bg-stone-800/50">
                        <div className="truncate">{v ? <PrivacyNumber value={v}>{formatEUR(v)}</PrivacyNumber> : ''}</div>
                      </td>
                    }
                    const item = row.item!
                    const val = valueFor(item, m, true)
                    const isEditing = editing && editing.itemId === item.id && editing.month === m
                    const valObj = item.valuations?.find(v => monthKey(new Date(v.month)) === m)
                    return (
                      <td
                        key={m}
                        onClick={(e) => { if (!isEditing) onCellClick(item, m) }}
                        onMouseEnter={() => { if (!isEditing) setHoveredCell({ itemId: item.id, month: m }) }}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`
                        px-4 py-2 text-center text-xs tabular-nums cursor-pointer border-l border-transparent hover:border-stone-200 dark:hover:border-stone-700
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
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => { saveEdit(); setSuggestion(null); }}
                              onKeyDown={handleKeyDown}
                              className="w-full text-center bg-transparent outline-none font-medium text-blue-700 dark:text-blue-300 p-0 m-0"
                            />
                            {suggestion !== null && !editValue.trim() && (
                              <div
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await acceptAndSaveSuggestion();
                                }}
                                className="absolute left-1/2 -transtone-x-1/2 top-full mt-2 bg-white dark:bg-stone-800 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 shadow-xl z-50 min-w-[120px]"
                              >
                                <div className="text-[10px] text-stone-400 mb-1 text-center">Suggestion</div>
                                <div className="font-bold text-blue-600 dark:text-blue-400 text-center">{formatEUR(suggestion)}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative group/cell">
                            <span className={`
                            ${!val ? 'text-stone-300 dark:text-stone-700' : 'text-stone-700 dark:text-stone-300 font-medium'}
                          `}>
                              {val ? <PrivacyNumber value={val}>{formatEUR(val)}</PrivacyNumber> : '—'}
                            </span>

                            {valObj && valObj.note && (
                              <div className="absolute top-0 right-0">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full shadow-sm"></div>
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
          <tfoot className="sticky bottom-0 z-[60] bg-stone-900 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
            <tr className="bg-stone-900 text-white">
              <td className="p-4 sticky left-0 bg-stone-900 z-50 font-bold text-sm uppercase tracking-wider shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">
                Total Net Worth
              </td>
              {months.map(m => {
                const v = groups.reduce((sum, g) => {
                  const roots = (g.items || []).filter(it => !it.parentItemId)
                  const s = roots.reduce((acc, it) => acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0)
                return <td key={m} className="p-4 text-center font-bold text-sm tabular-nums bg-stone-900 text-white shadow-[inset_1px_0_0_0_#1e293b]">
                  {v ? <PrivacyNumber value={v}>{formatEUR(v)}</PrivacyNumber> : ''}
                </td>
              })}
            </tr>
            <tr className="bg-stone-800 text-stone-300">
              <td className="p-3 sticky left-0 bg-stone-800 z-50 font-medium text-xs uppercase tracking-wide shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">
                Growth (Amount)
              </td>
              {months.map((m, i) => {
                const curr = groups.reduce((sum, g) => {
                  const roots = (g.items || []).filter(it => !it.parentItemId)
                  const s = roots.reduce((acc, it) => acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0)
                const prevKey = months[i + 1]
                const prev = prevKey ? groups.reduce((sum, g) => {
                  const roots = (g.items || []).filter(it => !it.parentItemId)
                  const s = roots.reduce((acc, it) => acc + valueFor(it, prevKey, true), 0)
                  return sum + s
                }, 0) : 0
                const diff = prevKey ? (curr - prev) : 0
                const isPos = diff > 0
                return <td key={m} className={`p-3 text-center font-medium text-xs tabular-nums bg-stone-800 shadow-[inset_1px_0_0_0_#334155] ${isPos ? 'text-emerald-400' : (diff < 0 ? 'text-rose-400' : '')}`}>
                  {prevKey ? <PrivacyNumber value={diff}>{diff > 0 ? '+' : ''}{formatEUR(diff)}</PrivacyNumber> : ''}
                </td>
              })}
            </tr>
            <tr className="bg-stone-800 text-stone-300">
              <td className="p-3 sticky left-0 bg-stone-800 z-50 font-medium text-xs uppercase tracking-wide shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_#334155]">
                Growth (%)
              </td>
              {months.map((m, i) => {
                const curr = groups.reduce((sum, g) => {
                  const roots = (g.items || []).filter(it => !it.parentItemId)
                  const s = roots.reduce((acc, it) => acc + valueFor(it, m, true), 0)
                  return sum + s
                }, 0)
                const prevKey = months[i + 1]
                const prev = prevKey ? groups.reduce((sum, g) => {
                  const roots = (g.items || []).filter(it => !it.parentItemId)
                  const s = roots.reduce((acc, it) => acc + valueFor(it, prevKey, true), 0)
                  return sum + s
                }, 0) : 0
                const pct = prevKey && prev !== 0 ? ((curr - prev) / prev) * 100 : 0

                // Heatmap logic for text color instead of background
                let textColor = 'text-stone-400';
                if (prevKey && prev !== 0) {
                  if (pct > 0) textColor = 'text-emerald-400';
                  else if (pct < 0) textColor = 'text-rose-400';
                }

                return <td key={m} className={`p-3 text-center font-medium text-xs tabular-nums bg-stone-800 shadow-[inset_1px_1px_0_0_#334155] ${textColor}`}>
                  {prevKey && prev !== 0 ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%` : ''}
                </td>
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <NotePopover
        visible={!!showNoteFor}
        initial={noteValue}
        onClose={() => setShowNoteFor(null)}
        onSave={(n) => { if (showNoteFor) saveNote(showNoteFor.itemId, showNoteFor.month, n) }}
      />
    </div>
  )
}