import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api, secureFetch } from '../lib/api'
import { formatEUR, formatDateDMY } from '../lib/format'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useAlert } from '../contexts/AlertContext'

function useLongPress(
  onLongPress: (e: any) => void,
  onClick: (e: any) => void,
  { shouldPreventDefault = true, delay = 500 } = {}
) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<any>();
  const target = useRef<EventTarget>();
  const startCoord = useRef<{x: number, y: number} | null>(null);
  const isScrolling = useRef(false);

  const start = useCallback(
    (event: any) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, { passive: false });
        target.current = event.target;
      }
      
      if (event.touches && event.touches.length > 0) {
        startCoord.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        isScrolling.current = false;
      }

      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const move = useCallback((event: any) => {
      if (startCoord.current && event.touches && event.touches.length > 0) {
          const x = event.touches[0].clientX;
          const y = event.touches[0].clientY;
          const diffX = Math.abs(x - startCoord.current.x);
          const diffY = Math.abs(y - startCoord.current.y);
          if (diffX > 10 || diffY > 10) {
              isScrolling.current = true;
              timeout.current && clearTimeout(timeout.current);
          }
      }
  }, []);

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerClick && !longPressTriggered && !isScrolling.current) {
        onClick(event);
      }
      setLongPressTriggered(false);
      isScrolling.current = false;
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onTouchMove: (e: any) => move(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any) => clear(e, false),
    onTouchEnd: (e: any) => clear(e)
  };
}

const preventDefault = (e: Event) => {
  if (!isTouchEvent(e)) return;
  if (e.touches.length < 2 && e.preventDefault) {
    e.preventDefault();
  }
};

const isTouchEvent = (e: Event): e is TouchEvent => {
  return e && 'touches' in e;
};

// Icons
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z"/>
  </svg>
)

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/>
  </svg>
)

const IconUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
)

const IconDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

const IconDots = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
  </svg>
)

const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

function ActionMenu({ actions }: { actions: { label: string, onClick: () => void, icon?: React.ReactNode, variant?: 'danger' | 'default' }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="p-2 rounded-full transition-colors text-slate-400 dark:text-[#8f96a3] hover:bg-slate-100 dark:hover:bg-[#1b2028] hover:text-slate-600 dark:hover:text-[#eceff5]">
        <IconDots />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-[#111] rounded-2xl shadow-xl border border-slate-200 dark:border-[#282828] z-20 overflow-hidden py-1.5">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${action.variant === 'danger' ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-700 dark:text-[#ccc] hover:bg-slate-50 dark:hover:bg-[#1a1a1a]'}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type Group = {
  id: number
  name: string
  order: number
  items?: Item[]
}

type Item = {
  id: number
  name: string
  description?: string
  parentItemId?: number | null
  depreciationAmount?: number | null
  order: number
  valuations?: any[]
}

const frequencyOptions = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'BIMONTHLY', label: 'Every 2 months' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMIANNUAL', label: 'Every 6 months' },
  { value: 'YEARLY', label: 'Yearly' }
]

function CategoryCard({ c, selectionMode, selectedIds, toggleSelection, onEdit }: any) {
  const handleClick = () => {
    if (selectionMode) {
      toggleSelection(c.id)
    } else {
      onEdit(c)
    }
  }

  const handleLongPress = () => {
    toggleSelection(c.id)
    if (navigator.vibrate) navigator.vibrate(50)
  }

  const longPressProps = useLongPress(handleLongPress, handleClick, { delay: 500 })

  return (
    <div 
      {...longPressProps}
      className={`group relative flex items-center justify-between p-3.5 bg-white dark:bg-[#111] border rounded-2xl transition-all cursor-pointer select-none hover:shadow-sm ${
        selectedIds.has(c.id)
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
          : 'border-slate-200 dark:border-[#1f1f1f] hover:border-blue-300 dark:hover:border-blue-700'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-1.5 h-8 rounded-full ${
            !c.color ? (
              c.type === 'Income' ? 'bg-emerald-500' : 
              c.type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'
            ) : ''
        }`} style={c.color ? { backgroundColor: c.color } : {}}></div>
        <div className="font-semibold text-slate-700 dark:text-[#d8d8d8] truncate">
          {c.name}
        </div>
      </div>
      
      {selectionMode && (
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
          selectedIds.has(c.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-[#282828]'
        }`}>
          {selectedIds.has(c.id) && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      )}
    </div>
  )
}

function AssetItemCard({ 
  it, 
  g, 
  itIdx, 
  childrenItems, 
  depreciationValues, 
  setDepreciationValues, 
  refresh, 
  tokenHeader, 
  moveItem, 
  assetSelectionMode, 
  selectedAssetItemIds, 
  toggleAssetItemSelection 
}: any) {
  const { showAlert } = useAlert()
  
  const handleClick = () => {
    if (assetSelectionMode) {
      toggleAssetItemSelection(it.id)
    }
  }

  const handleLongPress = () => {
    toggleAssetItemSelection(it.id)
    if (navigator.vibrate) navigator.vibrate(50)
  }

  const longPressProps = useLongPress(handleLongPress, handleClick, { delay: 500 })

  return (
    <div 
      {...longPressProps}
      className={`min-h-[168px] bg-white dark:bg-[#10151d] border rounded-2xl p-4 flex flex-col gap-3 transition-all group select-none shadow-sm ${
        selectedAssetItemIds.has(it.id)
          ? 'border-slate-500 bg-slate-100 dark:bg-[#1a202a] ring-1 ring-slate-400 dark:ring-slate-500'
          : 'border-slate-200 dark:border-[#262d38] hover:border-slate-300 dark:hover:border-[#343d4b]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold text-slate-900 dark:text-[#f5f7fb]">{it.name}</h4>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#a8b6cc]">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-[#1f2631] dark:text-[#d3d7df]">
              {childrenItems.length > 0 ? `${childrenItems.length} sub-items` : 'Single item'}
            </span>
            {it.description && <span className="truncate">{it.description}</span>}
          </div>
        </div>
        
        {assetSelectionMode ? (
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
            selectedAssetItemIds.has(it.id) ? 'bg-slate-700 border-slate-700 dark:bg-[#5a6474] dark:border-[#5a6474]' : 'border-slate-300 dark:border-[#3a4250]'
          }`}>
            {selectedAssetItemIds.has(it.id) && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu actions={[
              {
                label: 'Add Child Item',
                icon: <IconPlus />,
                onClick: () => {
                  const name=prompt('Child item name?')
                  if(name){ 
                    secureFetch(`/api/asset-items/${it.id}/children`, { 
                      method:'POST', 
                      headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
                      body: JSON.stringify({ name }) 
                    }).then(()=>refresh()) 
                  } 
                }
              },
              {
                label: 'Move Up',
                icon: <IconUp />,
                onClick: () => moveItem(g.id, itIdx, 'up')
              },
              {
                label: 'Move Down',
                icon: <IconDown />,
                onClick: () => moveItem(g.id, itIdx, 'down')
              },
              {
                label: 'Delete Item',
                icon: <IconTrash />,
                variant: 'danger',
                onClick: () => {
                  showAlert({
                    title: 'Delete Item',
                    message: `Delete item "${it.name}"?`,
                    confirmText: 'Delete',
                    type: 'danger',
                    onConfirm: async () => {
                      await secureFetch(`/api/asset-items/${it.id}`, { method:'DELETE', headers: tokenHeader() })
                      refresh()
                    }
                  })
                }
              }
            ]} />
          </div>
        )}
      </div>

      {/* Depreciation Input */}
      {childrenItems.length === 0 && (
         <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 dark:border-[#262d38] dark:bg-[#0e141d]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-[#cbd1dc]">Monthly depreciation</span>
              <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 dark:text-[#9aa3b3]">EUR</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={depreciationValues[it.id] !== undefined ? depreciationValues[it.id] : (it.depreciationAmount || '')}
                onChange={(e) => setDepreciationValues((prev: any) => ({ ...prev, [it.id]: e.target.value }))}
                onBlur={async () => {
                  const value = depreciationValues[it.id] ? Number(depreciationValues[it.id]) : null
                  await secureFetch(`/api/asset-items/${it.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                    body: JSON.stringify({ depreciationAmount: value })
                  })
                  await refresh()
                }}
                className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-[#313948] dark:bg-[#181f2a] dark:text-[#d9e0ec]"
              />
              </div>
            </div>
         </div>
      )}

      {/* Children List */}
      {childrenItems.length > 0 && (
        <div className="mt-1 space-y-2.5" onClick={e => e.stopPropagation()}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#c0c7d4]">Sub-items</div>
          {childrenItems.map((ch: any) => (
            <div key={ch.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 dark:border-[#262d38] dark:bg-[#0e141d]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800 dark:text-[#d9e0ec]">{ch.name}</div>
                </div>
                <button 
                  onClick={() => {
                    showAlert({
                      title: 'Delete Child Item',
                      message: `Delete child item "${ch.name}"?`,
                      confirmText: 'Delete',
                      type: 'danger',
                      onConfirm: async () => {
                        await secureFetch(`/api/asset-items/${ch.id}`, { method:'DELETE', headers: tokenHeader() })
                        refresh()
                      }
                    })
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <IconTrash />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#a7b0c0]">Monthly depreciation</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 dark:text-[#9aa3b3]">EUR</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={depreciationValues[ch.id] !== undefined ? depreciationValues[ch.id] : (ch.depreciationAmount || '')}
                    onChange={(e) => setDepreciationValues((prev: any) => ({ ...prev, [ch.id]: e.target.value }))}
                    onBlur={async () => {
                      const value = depreciationValues[ch.id] ? Number(depreciationValues[ch.id]) : null
                      await secureFetch(`/api/asset-items/${ch.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                        body: JSON.stringify({ depreciationAmount: value })
                      })
                      await refresh()
                    }}
                    className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-[#313948] dark:bg-[#181f2a] dark:text-[#d9e0ec]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SettingsPage() {
  const { showToast } = useToast()
  const { showAlert } = useAlert()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [catForm, setCatForm] = useState<any>({ name:'', type:'Expense', color: '#000000' })
  const [showCatModal, setShowCatModal] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupForm, setGroupForm] = useState<any>({ name:'' })
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [itemForm, setItemForm] = useState<Record<number, { name: string; description?: string }>>({})
  const [showItemModalForGroup, setShowItemModalForGroup] = useState<number | null>(null)
  const [depreciationValues, setDepreciationValues] = useState<Record<number, string>>({})
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, any>>({})
  const [accountMap, setAccountMap] = useState<Record<number, any>>({})
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [automationToken, setAutomationToken] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [showImportInfo, setShowImportInfo] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)
  const [editingAmountId, setEditingAmountId] = useState<number | null>(null)
  const [openFrequencyId, setOpenFrequencyId] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [tempAmount, setTempAmount] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [isEditCategoryTypeOpen, setIsEditCategoryTypeOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')

  const [selectedAssetItemIds, setSelectedAssetItemIds] = useState<Set<number>>(new Set())
  const [assetSelectionMode, setAssetSelectionMode] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  const [editingRecurringTransaction, setEditingRecurringTransaction] = useState<any>(null)
  const [editingRecurringTransactionForm, setEditingRecurringTransactionForm] = useState<any>(null)
  const [isRecTxCategoryOpen, setIsRecTxCategoryOpen] = useState(false)
  const [isRecTxFrequencyOpen, setIsRecTxFrequencyOpen] = useState(false)
  const [assetGroups, setAssetGroups] = useState<any[]>([])

  useEffect(() => {
    if (editingRecurringTransaction) {
        secureFetch('/api/asset-groups', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(data => setAssetGroups(data))
        .catch(console.error)
    }
  }, [editingRecurringTransaction])

  useEffect(() => {
    const handleScroll = () => {
      if (openFrequencyId !== null) setOpenFrequencyId(null)
    }
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [openFrequencyId])

  const [importFile, setImportFile] = useState<File | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState({ date: -1, amount: -1, incomeAmount: -1, expenseAmount: -1, category: -1, notes: -1 })
  const [splitAmount, setSplitAmount] = useState(false)
  const [hasHeader, setHasHeader] = useState(true)

  function toggleCategorySelection(id: number) {
    const newSelected = new Set(selectedCategoryIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedCategoryIds(newSelected)
    
    if (newSelected.size > 0 && !selectionMode) {
      setSelectionMode(true)
    } else if (newSelected.size === 0 && selectionMode) {
      setSelectionMode(false)
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Delete this category?')) return
    try {
      await api.categories.remove(id)
      refresh()
    } catch (error) {
      console.error(error)
      showToast('Failed to delete category', 'error')
    }
  }

  function handleSelectAllCategories() {
    const allIds = categories.map(c => c.id)
    setSelectedCategoryIds(new Set(allIds))
  }

  function toggleAssetItemSelection(id: number) {
    const newSelected = new Set(selectedAssetItemIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedAssetItemIds(newSelected)
    
    if (newSelected.size > 0 && !assetSelectionMode) {
      setAssetSelectionMode(true)
    } else if (newSelected.size === 0 && assetSelectionMode) {
      setAssetSelectionMode(false)
    }
  }

  function handleSelectAllAssetItems() {
      const group = groups.find(g => g.id === activeGroupId)
      if (!group || !group.items) return
      const ids = group.items.map(it => it.id)
      setSelectedAssetItemIds(new Set(ids))
  }

  async function handleBulkDeleteAssetItems() {
      if (selectedAssetItemIds.size === 0) return
      if (!confirm(`Delete ${selectedAssetItemIds.size} items?`)) return
      
      try {
          await Promise.all(Array.from(selectedAssetItemIds).map(id => 
              secureFetch(`/api/asset-items/${id}`, { method:'DELETE', headers: tokenHeader() })
          ))
          showToast('Items deleted', 'success')
          setSelectedAssetItemIds(new Set())
          setAssetSelectionMode(false)
          refresh()
      } catch (error) {
          console.error(error)
          showToast('Failed to delete items', 'error')
      }
  }

  async function handleBulkDeleteCategories() {
    if (selectedCategoryIds.size === 0) return
    if (!confirm(`Delete ${selectedCategoryIds.size} categories?`)) return
    
    try {
      await Promise.all(Array.from(selectedCategoryIds).map(id => api.categories.remove(id)))
      showToast('Categories deleted', 'success')
      setSelectedCategoryIds(new Set())
      setSelectionMode(false)
      refresh()
    } catch (error) {
      console.error(error)
      showToast('Failed to delete categories', 'error')
    }
  }

  useEffect(() => {
    if (groups.length > 0 && activeGroupId === null) {
      setActiveGroupId(groups[0].id)
    }
  }, [groups, activeGroupId])

  function parseCSVLine(line: string, delim: string): string[] {
    const row: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === delim && !inQuote) {
        row.push(current.trim().replace(/^"(.*)"$/, '$1'));
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim().replace(/^"(.*)"$/, '$1'));
    return row;
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setImportFile(f)
    
    const text = await f.slice(0, 5000).text()
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length === 0) return

    const delim = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ';' : ','
    const rows = lines.slice(0, 6).map(l => parseCSVLine(l, delim))
    
    setPreviewRows(rows)
    // Try to auto-detect columns
    const header = rows[0].map(c => c.toLowerCase())
    setMapping({
      date: header.findIndex(c => c.includes('date') || c.includes('data')),
      amount: header.findIndex(c => c.includes('amount') || c.includes('price') || c.includes('prezzo') || c.includes('importo')),
      incomeAmount: header.findIndex(c => c.includes('entrata') || c.includes('dare') || c.includes('income') || c.includes('credit')),
      expenseAmount: header.findIndex(c => c.includes('uscita') || c.includes('spesa') || c.includes('expense') || c.includes('debit')),
      category: header.findIndex(c => c.includes('category') || c.includes('categoria')),
      notes: header.findIndex(c => c.includes('note') || c.includes('desc'))
    })
    setShowImportModal(true)
    e.target.value = ''
  }

  async function executeImport() {
    if (!importFile) return
    if (mapping.date === -1) {
      showToast('Date column is required', 'warning')
      return
    }
    if (!splitAmount && mapping.amount === -1) {
      showToast('Amount column is required', 'warning')
      return
    }
    if (splitAmount && (mapping.incomeAmount === -1 || mapping.expenseAmount === -1)) {
      showToast('Both Income and Expense columns are required for split mode', 'warning')
      return
    }

    try {
      const text = await importFile.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      const delim = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ';' : ','
      const startIdx = hasHeader ? 1 : 0
      
      const newRows = lines.slice(startIdx).map(line => {
        const row = parseCSVLine(line, delim)
        const date = row[mapping.date] || ''
        
        let amount = '0'
        let category = mapping.category !== -1 ? (row[mapping.category] || '') : ''
        
        if (splitAmount) {
            // Simple check: if income column has a number > 0, use it. Else use expense.
            // We strip non-numeric chars to check value
            const cleanNum = (s: string) => parseFloat(s.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
            const inc = cleanNum(row[mapping.incomeAmount] || '')
            const exp = cleanNum(row[mapping.expenseAmount] || '')
            
            if (inc > 0) {
                amount = (row[mapping.incomeAmount] || '').replace(/-/g, '')
                if (!category) category = 'Income'
            } else if (exp > 0) {
                amount = (row[mapping.expenseAmount] || '').replace(/-/g, '')
                if (!category) category = 'To Categorize'
            }
        } else {
            amount = row[mapping.amount] || '0'
            if (!category) category = 'To Categorize'
        }
        
        const notes = mapping.notes !== -1 ? (row[mapping.notes] || '') : ''
        
        // Backend has a naive CSV parser that splits by delimiter without respecting quotes.
        // We use semicolon as delimiter to avoid issues with commas in amounts (e.g. "12,50").
        // We also strip semicolons from content to prevent splitting issues.
        const clean = (s: string) => s.replace(/;/g, ' ')
        const escape = (s: string) => `"${clean(s).replace(/"/g, '""')}"`
        return `${escape(date)};${escape(amount)};${escape(category)};${escape(notes)}`
      })

      const csvContent = `date;amount;category;notes\n${newRows.join('\n')}`
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const file = new File([blob], 'import.csv', { type: 'text/csv' })

      await api.transactions.importCsv(file)
      showToast('Transactions imported successfully!', 'success')
      setShowImportModal(false)
      refresh()
    } catch (error) {
      console.error('Import failed:', error)
      showToast('Import failed. Please check the file format.', 'error')
    }
  }
  
  function tokenHeader(): Record<string, string> {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function refresh() {
    const [p, c, g, r, accounts, tokenData] = await Promise.all([
      api.settings.profile(), 
      api.categories.list(), 
      secureFetch('/api/asset-groups', { headers: tokenHeader() }).then(r=>r.json()),
      api.recurringTransactions.list(),
      api.accounts.list(),
      api.settings.getAutomationToken()
    ])
    setProfile(p)
    setEmail((p as any)?.email||'')
    setCategories(c as any[])
    setGroups(g as Group[])
    setRecurringTransactions(r)
    setAutomationToken(tokenData.token)
    
    // Create maps for easier lookups
    const catMap: Record<number, any> = {}
    c.forEach((cat: any) => catMap[cat.id] = cat)
    setCategoryMap(catMap)
    
    const accMap: Record<number, any> = {}
    accounts.forEach((acc: any) => accMap[acc.id] = acc)
    setAccountMap(accMap)
  }

  useEffect(()=>{ refresh() }, [])

  // Move group up/down
  async function moveGroup(index: number, direction: 'up' | 'down') {
    const newGroups = [...groups]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newGroups.length) return
    
    [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]]
    setGroups(newGroups)
    
    await secureFetch('/api/asset-groups/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify({ groupIds: newGroups.map(g => g.id) })
    })
  }

  // Move item up/down within its group
  async function moveItem(groupId: number, itemIndex: number, direction: 'up' | 'down') {
    const group = groups.find(g => g.id === groupId)
    if (!group || !group.items) return
    
    const items = group.items.filter(it => !it.parentItemId)
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1
    if (targetIndex < 0 || targetIndex >= items.length) return
    
    [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]]
    
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        const children = (g.items || []).filter(it => it.parentItemId)
        return { ...g, items: [...items, ...children] }
      }
      return g
    })
    setGroups(newGroups)
    
    await secureFetch('/api/asset-items/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify({ itemIds: items.map(it => it.id) })
    })
  }

  // Export functions
  async function exportTransactions() {
    try {
      const response = await secureFetch('/api/settings/export/transactions', {
        headers: tokenHeader()
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fintrack-transactions-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Export failed. Please try again.', 'error')
    }
  }

  async function exportAssets() {
    try {
      const response = await secureFetch('/api/settings/export/assets', {
        headers: tokenHeader()
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fintrack-assets-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Export failed. Please try again.', 'error')
    }
  }

  const settingsTabs = [
    {
      id: 'profile', label: 'Profile', group: 'Account',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
    },
    {
      id: 'recurring', label: 'Recurring Transactions', group: 'Finances',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
    },
    {
      id: 'categories', label: 'Categories', group: 'Finances',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
    },
    {
      id: 'assets', label: 'Asset Tracking', group: 'Finances',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
    },
    {
      id: 'data', label: 'Data Mgmt', group: 'System',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
    },
    {
      id: 'automation', label: 'Automation', group: 'System',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
    },
  ]

  const navGroups = {
    'Account': settingsTabs.filter(t => t.group === 'Account'),
    'Finances': settingsTabs.filter(t => t.group === 'Finances'),
    'System': settingsTabs.filter(t => t.group === 'System'),
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090909] overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c0c] z-20">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                 <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.819l1.019-.393c.115-.044.283-.032.45.083.315.218.647.412.986.57.182.088.277.228.297.348l.177 1.072c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.177-1.072c.02-.12.115-.26.297-.348.338-.158.67-.352.986-.57.166-.115.334-.126.45-.083l1.02.393a1.875 1.875 0 002.282-.819l.922-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.015-.2.059-.352.153-.43l.841-.692a1.875 1.875 0 00.432-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.819l-1.019.393c-.115.044-.283.032-.45-.083a7.49 7.49 0 00-.986-.57c-.182-.088-.277-.228-.297-.348l-.177-1.072a1.875 1.875 0 00-1.85-1.567h-1.844zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
              </svg>
            </span>
            Settings
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 space-y-8">
          {Object.entries(navGroups).map(([groupName, tabs]) => (
            <div key={groupName}>
              <h3 className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {groupName}
              </h3>
              <div className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group ${
                      activeTab === tab.id
                        ? 'bg-slate-900 dark:bg-[#eceff5] text-white dark:text-slate-900 shadow-md shadow-slate-900/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`${activeTab === tab.id ? 'text-slate-200 dark:text-slate-700' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'} transition-colors`}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
             <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-700">
                    {profile?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {profile?.email}
                    </p>
                </div>
             </div>
        </div>
      </aside>

      {/* ── Main panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Mobile tab bar */}
        <div className="md:hidden sticky top-0 z-30 bg-white/90 dark:bg-[#0c0c0c]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-slate-200 flex items-center justify-center text-white dark:text-slate-900 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.819l1.019-.393c.115-.044.283.032-.45.083.315.218.647.412.986.57.182.088.277.228.297.348l.177 1.072c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.177-1.072c.02-.12.115-.26.297-.348.338-.158.67-.352.986-.57.166-.115.334-.126.45-.083l1.02.393a1.875 1.875 0 002.282-.819l.922-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.015-.2.059-.352.153-.43l.841-.692a1.875 1.875 0 00.432-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.819l-1.019.393c-.115.044-.283.032-.45-.083a7.49 7.49 0 00-.986-.57c-.182-.088-.277-.228-.297-.348l-.177-1.072a1.875 1.875 0 00-1.85-1.567h-1.844zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                </svg>
            </span>
            <span className="font-bold text-slate-900 dark:text-white">Settings</span>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar gap-2 p-2">
            {settingsTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#090909]">
          <div className="max-w-5xl mx-auto p-4 sm:p-8 lg:p-12 w-full">

            {/* Page heading – desktop only */}
            <div className="hidden md:block mb-10">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-[#f0f0f0] tracking-tight">
                {settingsTabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-lg text-slate-500 dark:text-[#666] mt-2 max-w-3xl">
                {activeTab === 'profile' && 'Manage your account details and security preferences.'}
                {activeTab === 'data' && 'Import your financial history or export data for safekeeping.'}
                {activeTab === 'automation' && 'Connect external tools and create workflows with your personal API token.'}
                {activeTab === 'recurring' && 'Set up subscriptions and regular payments to automate your budget.'}
                {activeTab === 'categories' && 'Customize how you categorize your expenses to match your spending habits.'}
                {activeTab === 'assets' && 'Track the value of your assets over time including stocks, crypto, and property.'}
              </p>
            </div>

            {/* ─── PROFILE TAB ─── */}
            {activeTab === 'profile' && (
            <div className="space-y-5 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">

              <div className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-[#1f1f1f] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1a1a1a] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm select-none">
                    {profile?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f0f0f0]">Account details</h3>
                    <p className="text-xs text-slate-500 dark:text-[#666] mt-0.5">{profile?.email || 'Loading...'}</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-[#1a1a1a]">
                  <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <label className="text-sm font-medium text-slate-500 dark:text-[#888] w-28 shrink-0">Email</label>
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0d0d0d] border border-slate-200 dark:border-[#282828] text-slate-900 dark:text-[#f0f0f0] text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <label className="text-sm font-medium text-slate-500 dark:text-[#888] w-28 shrink-0">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="New password (leave blank to keep current)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0d0d0d] border border-slate-200 dark:border-[#282828] text-slate-900 dark:text-[#f0f0f0] text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 dark:bg-[#0d0d0d] flex justify-end border-t border-slate-100 dark:border-[#1a1a1a]">
                  <button
                    onClick={async () => {
                      await api.settings.updateProfile({ email, password: password || undefined })
                      setPassword('')
                      refresh()
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    Save changes
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111] rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-red-50 dark:border-red-900/20 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h3>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-[#f0f0f0]">Sign out</p>
                    <p className="text-xs text-slate-500 dark:text-[#666] mt-0.5">End your current session</p>
                  </div>
                  <button
                    onClick={() => showAlert({
                      title: 'Sign Out',
                      message: 'Are you sure you want to sign out?',
                      confirmText: 'Sign Out',
                      type: 'danger',
                      onConfirm: () => { localStorage.removeItem('token'); navigate('/login') }
                    })}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>

            </div>
            )}

            {/* ─── DATA TAB ─── */}
            {activeTab === 'data' && (
            <div className="space-y-5 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileSelected} className="hidden" />

              <div className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-[#1f1f1f] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1a1a1a] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <IconUpload />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f0f0f0]">Import transactions</h3>
                    <p className="text-xs text-slate-500 dark:text-[#666] mt-0.5">CSV with flexible column mapping</p>
                  </div>
                </div>
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <p className="flex-1 text-sm text-slate-600 dark:text-[#999]">
                    Supports flexible column mapping — date, amount, category, notes. Automatic delimiter detection (comma or semicolon).
                  </p>
                  <button
                    onClick={() => setShowImportInfo(true)}
                    className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    <IconUpload />
                    Import CSV
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#101010] rounded-lg border border-slate-200 dark:border-[#1f1f1f] overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1f1f1f]">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f0f0f0]">Export data</h3>
                  <p className="text-xs text-slate-500 dark:text-[#666] mt-0.5">Download as JSON for backup or analysis</p>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-[#1a1a1a]">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-[#f0f0f0]">Transactions</p>
                      <p className="text-xs text-slate-500 dark:text-[#666] mt-0.5">All transactions with account and category</p>
                    </div>
                    <button
                      onClick={exportTransactions}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-slate-700 dark:text-[#d8d8d8] text-sm font-semibold transition-colors"
                    >
                      <IconDownload />
                      Export
                    </button>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-[#f0f0f0]">Assets</p>
                      <p className="text-xs text-slate-500 dark:text-[#666] mt-0.5">Groups, items, valuations and notes</p>
                    </div>
                    <button
                      onClick={exportAssets}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-slate-700 dark:text-[#d8d8d8] text-sm font-semibold transition-colors"
                    >
                      <IconDownload />
                      Export
                    </button>
                  </div>
                </div>
                <div className="px-6 py-3 bg-blue-50 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900/20">
                  <p className="text-xs text-blue-700 dark:text-blue-300">Files include all data and hidden entries. Store them securely.</p>
                </div>
              </div>

            </div>
            )}

            {/* ─── AUTOMATION TAB ─── */}
            {activeTab === 'automation' && (
            <div className="space-y-5 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">

              <div className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-[#1f1f1f] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1a1a1a] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f0f0f0]">Automation API token</h3>
                    <p className="text-xs text-slate-500 dark:text-[#666] mt-0.5">For iPhone Shortcuts, external apps and automation tools</p>
                  </div>
                </div>

                {automationToken ? (
                  <div className="divide-y divide-slate-50 dark:divide-[#1a1a1a]">
                    <div className="px-6 py-5">
                      <p className="text-xs text-slate-500 dark:text-[#666] mb-3">
                        Send this header with requests: <code className="bg-slate-100 dark:bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono">Authorization: Bearer &lt;token&gt;</code>
                      </p>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={automationToken}
                          readOnly
                          className="w-full px-3 py-2.5 pr-32 rounded-xl bg-slate-50 dark:bg-[#0d0d0d] border border-slate-200 dark:border-[#282828] text-slate-900 dark:text-[#f0f0f0] font-mono text-xs focus:outline-none"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5">
                          <button
                            onClick={() => setShowToken(!showToken)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-slate-200 dark:bg-[#222] hover:bg-slate-300 dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-[#bbb] transition-colors font-medium"
                          >
                            {showToken ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(automationToken); showToast('Token copied!', 'success') }}
                            className="px-2.5 py-1 text-xs rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors font-medium"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-[#f0f0f0]">Regenerate token</p>
                        <p className="text-xs text-slate-500 dark:text-[#666] mt-0.5">The old token will stop working immediately</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure? The old token will stop working.')) {
                            const { token } = await api.settings.generateAutomationToken()
                            setAutomationToken(token)
                            setShowToken(true)
                          }
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-8 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-[#f0f0f0]">No token yet</p>
                      <p className="text-sm text-slate-500 dark:text-[#666] mt-1">Create a token to integrate FinTrack with external tools and automations.</p>
                    </div>
                    <button
                      onClick={async () => {
                        const { token } = await api.settings.generateAutomationToken()
                        setAutomationToken(token)
                        setShowToken(true)
                      }}
                      className="shrink-0 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-sm"
                    >
                      Generate token
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 px-5 py-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-amber-800 dark:text-amber-200"><strong>Security note:</strong> Treat this token like a password. Anyone with it can access your FinTrack data. Never share it publicly.</p>
              </div>

            </div>
            )}

            {/* ─── RECURRING TAB ─── */}
            {activeTab === 'recurring' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-4xl">
              {recurringTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center mb-5 text-slate-400 dark:text-[#555]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-slate-700 dark:text-[#bbb]">No recurring transactions</p>
                  <p className="text-sm text-slate-400 dark:text-[#555] mt-1.5">Create a transaction and enable "Make recurring"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {recurringTransactions.map(rt => {
                    const category = categoryMap[rt.categoryId] || rt.category
                    const isIncome = category?.type === 'Income'
                    const frequencyLabel = ({
                      'WEEKLY': 'Weekly', 'BIWEEKLY': 'Every 2 wks',
                      'MONTHLY': 'Monthly', 'BIMONTHLY': 'Every 2 mo',
                      'QUARTERLY': 'Quarterly', 'SEMIANNUAL': 'Every 6 mo', 'YEARLY': 'Yearly'
                    } as Record<string, string>)[rt.frequency] || rt.frequency
                    return (
                      <div
                        key={rt.id}
                        onClick={() => {
                          setEditingRecurringTransaction(rt)
                          setEditingRecurringTransactionForm({
                            notes: rt.notes, amount: rt.amount, categoryId: rt.categoryId,
                            frequency: rt.frequency, isActive: rt.isActive,
                            nextDate: rt.nextDate ? String(rt.nextDate).slice(0, 10) : '',
                            endDate: rt.endDate ? String(rt.endDate).slice(0, 10) : '',
                            assetItemId: rt.assetItemId ?? null
                          })
                        }}
                        className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-[#1f1f1f] shadow-sm p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-[#f0f0f0] truncate">{rt.notes || 'Untitled'}</h4>
                            <div className="mt-1.5">
                              <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                category?.type === 'Income' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                category?.type === 'Transfer' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                              }`}>
                                {category?.name || 'Uncategorized'}
                              </span>
                            </div>
                          </div>
                          <span className={`text-lg font-bold tabular-nums shrink-0 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-[#f0f0f0]'}`}>
                            {formatEUR(rt.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#1a1a1a]">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#666]">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                            </svg>
                            <span>{frequencyLabel}</span>
                            <span className="text-slate-300 dark:text-[#333]">·</span>
                            <span>{formatDateDMY(rt.nextDate)}</span>
                          </div>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            rt.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
                              : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-[#1a1a1a] dark:text-[#555] dark:border-[#282828]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rt.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {rt.isActive ? 'Active' : 'Paused'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            )}

            {/* ─── CATEGORIES TAB ─── */}
            {activeTab === 'categories' && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-200">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-slate-500 dark:text-[#888]">{categories.length} categories · tap to edit, long-press to select</p>
                </div>
                <button
                  onClick={() => setShowCatModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  <IconPlus /> Add category
                </button>
              </div>
              {/* Kanban: one column per type */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {['Expense', 'Income', 'Transfer'].map(type => {
                  const groupCats = categories.filter(c => c.type === type).sort((a, b) => a.name.localeCompare(b.name))
                  const colorClass = type === 'Income' ? 'text-emerald-500' : type === 'Transfer' ? 'text-blue-500' : 'text-rose-500'
                  const bgClass = type === 'Income' 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : type === 'Transfer' 
                      ? 'bg-blue-500/10 border-blue-500/20' 
                      : 'bg-rose-500/10 border-rose-500/20'
                  
                  return (
                    <div key={type} className="flex flex-col gap-3">
                       <div className={`px-4 py-3 rounded-xl border flex items-center justify-between ${bgClass}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${type === 'Income' ? 'bg-emerald-500' : type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'}`}></span>
                            <span className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>{type}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-black/20 px-2 py-0.5 rounded-md tabular-nums">{groupCats.length}</span>
                       </div>

                      {groupCats.length === 0 ? (
                        <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center gap-2 text-slate-400 dark:text-slate-600">
                          <p className="text-sm">No {type.toLowerCase()} categories</p>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {groupCats.map(c => (
                            <CategoryCard
                              key={c.id}
                              c={c}
                              selectionMode={selectionMode}
                              selectedIds={selectedCategoryIds}
                              toggleSelection={toggleCategorySelection}
                              onEdit={(cat: any) => setEditingCategory(cat)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            )}



            {/* ─── ASSETS TAB ─── */}
            {activeTab === 'assets' && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-200 space-y-5">

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#262d38] dark:bg-[#0f131b]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#a8b0bf]">Asset Groups</p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-[#8f98a8]">Pick a group from the bar or create a new one.</p>
                  </div>
                  <button
                    onClick={() => setShowGroupModal(true)}
                    className="h-9 px-3 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors dark:border-[#384050] dark:bg-[#1c222d] dark:hover:bg-[#282f3c] dark:text-[#e8ecf3] flex items-center gap-1.5"
                  >
                    <IconPlus /> New group
                  </button>
                </div>

                {groups.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center dark:border-[#303846] dark:bg-[#131923]">
                    <p className="text-sm font-medium text-slate-700 dark:text-[#d5dbe6]">No groups yet</p>
                    <p className="text-xs text-slate-500 dark:text-[#9099ab] mt-1">Create your first group to organize assets.</p>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {groups.map((g) => {
                      const itemCount = (g.items || []).filter((it: Item) => !it.parentItemId).length
                      const active = activeGroupId === g.id
                      return (
                        <button
                          key={g.id}
                          onClick={() => setActiveGroupId(g.id)}
                          className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-colors ${
                            active
                              ? 'border-slate-500 bg-slate-900 text-white dark:border-[#616b7c] dark:bg-[#2a313e]'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#303846] dark:bg-[#141b26] dark:text-[#d4dae5] dark:hover:bg-[#1d2430]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold whitespace-nowrap">{g.name}</span>
                            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                              active
                                ? 'bg-white/15 text-white'
                                : 'bg-slate-100 text-slate-500 dark:bg-[#202733] dark:text-[#a6afbf]'
                            }`}>{itemCount}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-[#262d38] dark:bg-[#0f131b]">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2e3644] dark:bg-[#161d28]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a2acbc]">Groups</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-[#f4f6fb] tabular-nums leading-tight">{groups.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2e3644] dark:bg-[#161d28]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a2acbc]">Root Items</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-[#f4f6fb] tabular-nums leading-tight">{groups.reduce((sum, g) => sum + (g.items || []).filter((it: Item) => !it.parentItemId).length, 0)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2e3644] dark:bg-[#161d28]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a2acbc]">Sub-items</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-[#f4f6fb] tabular-nums leading-tight">{groups.reduce((sum, g) => sum + (g.items || []).filter((it: Item) => !!it.parentItemId).length, 0)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2e3644] dark:bg-[#161d28]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a2acbc]">Active Group</p>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#f4f6fb]">{groups.find(g => g.id === activeGroupId)?.name || 'None selected'}</p>
                  </div>
                </div>
              </div>

              {activeGroupId && groups.find(g => g.id === activeGroupId) ? (
                (() => {
                  const g = groups.find(g => g.id === activeGroupId)!
                  const gIdx = groups.findIndex(grp => grp.id === g.id)
                  return (
                    <div className="bg-white dark:bg-[#0f131b] rounded-2xl border border-slate-200 dark:border-[#262d38] overflow-hidden animate-in fade-in duration-150 shadow-sm">
                      <div className="px-5 py-4 border-b border-slate-100 dark:border-[#222a36] flex items-center justify-between">
                        <div>
                          {editingGroupId === g.id ? (
                            <input
                              value={editingGroupName}
                              onChange={e => setEditingGroupName(e.target.value)}
                              onBlur={async () => {
                                if (editingGroupName.trim() && editingGroupName !== g.name) {
                                  await secureFetch(`/api/asset-groups/${g.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                                    body: JSON.stringify({ name: editingGroupName })
                                  })
                                  refresh()
                                }
                                setEditingGroupId(null)
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  if (editingGroupName.trim() && editingGroupName !== g.name) {
                                    await secureFetch(`/api/asset-groups/${g.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                                      body: JSON.stringify({ name: editingGroupName })
                                    })
                                    refresh()
                                  }
                                  setEditingGroupId(null)
                                } else if (e.key === 'Escape') {
                                  setEditingGroupId(null)
                                }
                              }}
                              autoFocus
                              className="text-base font-semibold text-slate-900 dark:text-[#f5f7fb] bg-transparent border-b border-slate-500 focus:outline-none px-1"
                            />
                          ) : (
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#f5f7fb]">{g.name}</h3>
                          )}
                          <p className="text-xs text-slate-500 dark:text-[#a0a9b8] mt-0.5">{(g.items || []).filter((it: Item) => !it.parentItemId).length} root items</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ActionMenu actions={[
                            {
                              label: 'Edit name',
                              icon: <IconEdit />,
                              onClick: () => { setEditingGroupId(g.id); setEditingGroupName(g.name) }
                            },
                            {
                              label: 'Move left',
                              icon: <IconUp />,
                              onClick: () => moveGroup(gIdx, 'up')
                            },
                            {
                              label: 'Move right',
                              icon: <IconDown />,
                              onClick: () => moveGroup(gIdx, 'down')
                            },
                            {
                              label: 'Delete group',
                              icon: <IconTrash />,
                              variant: 'danger',
                              onClick: async () => {
                                const ok = confirm(`Delete group "${g.name}" and all its items?`)
                                if (!ok) return
                                await secureFetch(`/api/asset-groups/${g.id}`, { method: 'DELETE', headers: tokenHeader() })
                                setActiveGroupId(null)
                                refresh()
                              }
                            }
                          ]} />
                          <button
                            onClick={() => setShowItemModalForGroup(g.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors shadow-sm dark:border-[#384050] dark:bg-[#1c222d] dark:hover:bg-[#282f3c] dark:text-[#edf1f8]"
                          >
                            <IconPlus /> Add item
                          </button>
                        </div>
                      </div>
                      {(g.items || []).filter((it: Item) => !it.parentItemId).length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-3 text-center">
                          <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-[#1a212d] flex items-center justify-center text-slate-400 dark:text-[#9ba6b8]">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-[#d4dae6]">No items in this group</p>
                            <p className="text-xs text-slate-400 dark:text-[#96a0b1] mt-0.5">Add your first asset to start tracking it</p>
                          </div>
                          <button
                            onClick={() => setShowItemModalForGroup(g.id)}
                            className="mt-1 px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors dark:border-[#384050] dark:bg-[#1c222d] dark:hover:bg-[#282f3c] dark:text-[#edf1f8]"
                          >
                            Add item
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 p-5">
                          {(g.items || []).filter((it: Item) => !it.parentItemId).map((it: Item, itIdx: number) => {
                            const children = (g.items || []).filter((ch: Item) => ch.parentItemId === it.id)
                            return (
                              <AssetItemCard
                                key={it.id}
                                it={it}
                                g={g}
                                itIdx={itIdx}
                                childrenItems={children}
                                depreciationValues={depreciationValues}
                                setDepreciationValues={setDepreciationValues}
                                refresh={refresh}
                                tokenHeader={tokenHeader}
                                moveItem={moveItem}
                                assetSelectionMode={assetSelectionMode}
                                selectedAssetItemIds={selectedAssetItemIds}
                                toggleAssetItemSelection={toggleAssetItemSelection}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div className="bg-white dark:bg-[#0f131b] rounded-2xl border border-slate-200 dark:border-[#262d38] py-20 flex flex-col items-center gap-2 text-center shadow-sm">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-[#1a212d] flex items-center justify-center text-slate-300 dark:text-[#9aa6b9] mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  {groups.length === 0 ? (
                    <>
                      <p className="text-sm font-medium text-slate-700 dark:text-[#d4dae6]">No asset groups yet</p>
                      <p className="text-xs text-slate-400 dark:text-[#96a0b1]">Create a group to start tracking assets</p>
                      <button onClick={() => setShowGroupModal(true)} className="mt-2 px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors dark:border-[#384050] dark:bg-[#1c222d] dark:hover:bg-[#282f3c] dark:text-[#edf1f8]">New group</button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-700 dark:text-[#d4dae6]">Select a group to view its items</p>
                      <p className="text-xs text-slate-400 dark:text-[#96a0b1]">Use the top group bar to switch groups</p>
                    </>
                  )}
                </div>
              )}

            </div>
            )}

          </div>{/* end inner content wrapper */}
        </div>{/* end scrollable content area */}
      </div>{/* end main panel */}

      {/* CSV Import Info Modal */}
      {showImportInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
            <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-900 dark:text-[#f0f0f0]">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              CSV Import Format
            </h3>
            
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#101010]/20 border border-slate-200 dark:border-[#1f1f1f] rounded-lg p-4">
                <p className="text-sm text-slate-700 dark:text-[#bbb] mb-2">
                  You can import transactions from any CSV file. The system will help you map your columns to the required fields.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-[#d8d8d8]">Supported Formats:</h4>
                <div className="bg-slate-50 dark:bg-[#101010]/50 rounded p-3 border border-slate-200 dark:border-[#1f1f1f] space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-[#888] mb-1">Standard (Single Amount Column)</p>
                    <code className="text-sm bg-white dark:bg-[#111111] px-3 py-2 rounded block font-mono text-slate-800 dark:text-[#d8d8d8]">
                      date,amount,category,notes
                    </code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-[#888] mb-1">Split (Income/Expense Columns)</p>
                    <code className="text-sm bg-white dark:bg-[#111111] px-3 py-2 rounded block font-mono text-slate-800 dark:text-[#d8d8d8]">
                      date,income,expense,category,notes
                    </code>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-[#d8d8d8]">Field Details:</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-[#bbb]">
                  <li className="flex gap-2">
                    <span className="font-mono bg-slate-100 dark:bg-[#111111] px-2 py-0.5 rounded text-xs">date</span>
                    <span>DD/MM/YYYY or YYYY-MM-DD</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-slate-100 dark:bg-[#111111] px-2 py-0.5 rounded text-xs">amount</span>
                    <span>Positive or negative numbers. Both dot (.) and comma (,) are supported as decimal separators.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-slate-100 dark:bg-[#111111] px-2 py-0.5 rounded text-xs">category</span>
                    <span>Optional. Will be created if it doesn't exist.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1">📌 Features:</p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 ml-4 list-disc">
                  <li>Auto-detection of column delimiters (comma or semicolon)</li>
                  <li>Flexible column mapping - no specific order required</li>
                  <li>Support for separate Income/Expense columns</li>
                  <li>Automatic handling of negative signs in split mode</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-[#1f1f1f]">
              <button
                onClick={() => setShowImportInfo(false)}
                className="px-4 py-2 rounded bg-slate-200 dark:bg-[#111111] text-slate-700 dark:text-[#d8d8d8] hover:bg-slate-300 dark:hover:bg-[#242424] dark:bg-[#1a1a1a]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowImportInfo(false)
                  fileInputRef.current?.click()
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 dark:hover:bg-blue-500 font-medium"
              >
                Select CSV File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111111] rounded-lg p-6 w-full max-w-md space-y-4 text-slate-900 dark:text-[#f0f0f0] shadow-xl">
            <h3 className="text-xl font-semibold">Add Category</h3>
            <input 
              value={catForm.name} 
              onChange={e=>setCatForm({...catForm, name:e.target.value})} 
              placeholder="Category name" 
              className="w-full border p-2.5 rounded-xl bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] border-slate-300 dark:border-[#282828] focus:ring-2 focus:ring-blue-500" 
            />
            <select 
              value={catForm.type} 
              onChange={e=>setCatForm({...catForm, type:e.target.value})} 
              className="w-full border p-2.5 rounded-xl bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] border-slate-300 dark:border-[#282828] focus:ring-2 focus:ring-blue-500"
            >
              <option>Expense</option>
              <option>Income</option>
              <option>Transfer</option>
            </select>
            <div className="flex items-center gap-2 border p-2.5 rounded-xl bg-white dark:bg-[#111111] border-slate-300 dark:border-[#282828]">
                <span className="text-sm text-slate-500 dark:text-[#888]">Color:</span>
                <input 
                  type="color" 
                  value={catForm.color || '#000000'} 
                  onChange={e=>setCatForm({...catForm, color:e.target.value})}
                  className="w-8 h-8 rounded cursor-pointer border-none p-0" 
                />
            </div>
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#282828] bg-slate-50 dark:bg-[#0e0e0e] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#181818] transition-colors">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={!!(catForm as any).isAssetLinked}
                  onChange={e => setCatForm({...(catForm as any), isAssetLinked: e.target.checked})}
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${(catForm as any).isAssetLinked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-[#333]'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(catForm as any).isAssetLinked ? 'translate-x-4' : ''}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-[#f0f0f0]">Asset-linked category</p>
                <p className="text-xs text-slate-500 dark:text-[#888]">Transactions in this category can be linked to an asset</p>
              </div>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={()=>setShowCatModal(false)} 
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#111111] dark:hover:bg-[#242424] dark:bg-[#1a1a1a] text-slate-700 dark:text-[#d8d8d8] font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async()=>{ 
                  if(!catForm.name) return
                  await api.categories.create(catForm)
                  setCatForm({ name:'', type:'Expense', color: '#000000' })
                  setShowCatModal(false)
                  refresh() 
                }} 
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111111] rounded-lg p-6 w-full max-w-md space-y-4 text-slate-900 dark:text-[#f0f0f0] shadow-xl">
            <h3 className="text-xl font-semibold">Add Asset Group</h3>
            <input 
              value={groupForm.name} 
              onChange={e=>setGroupForm({...groupForm, name:e.target.value})} 
              placeholder="Group name (e.g., Stock & ETF)" 
              className="w-full border p-2.5 rounded-xl bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] border-slate-300 dark:border-[#282828] focus:ring-2 focus:ring-blue-500" 
            />
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={()=>setShowGroupModal(false)} 
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#111111] dark:hover:bg-[#242424] dark:bg-[#1a1a1a] text-slate-700 dark:text-[#d8d8d8] font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async()=>{ 
                  if(!groupForm.name) return
                  await secureFetch('/api/asset-groups', { 
                    method:'POST', 
                    headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
                    body: JSON.stringify({ name: groupForm.name }) 
                  })
                  setGroupForm({ name:'' })
                  setShowGroupModal(false)
                  refresh() 
                }} 
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showItemModalForGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111111] rounded-lg p-6 w-full max-w-md space-y-4 text-slate-900 dark:text-[#f0f0f0] shadow-xl">
            <h3 className="text-xl font-semibold">Add Item</h3>
            <input 
              value={itemForm[showItemModalForGroup]?.name||''} 
              onChange={e=>setItemForm({ ...itemForm, [showItemModalForGroup]: { ...(itemForm[showItemModalForGroup]||{}), name:e.target.value } })} 
              placeholder="Item name (e.g., Trade Republic)" 
              className="w-full border p-2.5 rounded-xl bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] border-slate-300 dark:border-[#282828] focus:ring-2 focus:ring-blue-500" 
            />
            <input 
              value={itemForm[showItemModalForGroup]?.description||''} 
              onChange={e=>setItemForm({ ...itemForm, [showItemModalForGroup]: { ...(itemForm[showItemModalForGroup]||{}), description:e.target.value } })} 
              placeholder="Description (optional)" 
              className="w-full border p-2.5 rounded-xl bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] border-slate-300 dark:border-[#282828] focus:ring-2 focus:ring-blue-500" 
            />
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={()=>setShowItemModalForGroup(null)} 
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#111111] dark:hover:bg-[#242424] dark:bg-[#1a1a1a] text-slate-700 dark:text-[#d8d8d8] font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async()=>{ 
                  const it=itemForm[showItemModalForGroup!]
                  if(!it?.name) return
                  await secureFetch(`/api/asset-groups/${showItemModalForGroup}/items`, { 
                    method:'POST', 
                    headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
                    body: JSON.stringify(it) 
                  })
                  setItemForm({ ...itemForm, [showItemModalForGroup!]: { name:'', description:'' } })
                  setShowItemModalForGroup(null)
                  refresh() 
                }} 
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 z-[5000] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#101010] flex justify-between items-center shadow-sm shrink-0">
            <div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-[#f0f0f0]">Import Transactions</h3>
              <p className="text-sm text-slate-500 dark:text-[#888]">Map columns from your CSV file</p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-[#bbb] hover:bg-slate-100 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={executeImport}
                    disabled={mapping.date === -1 || (!splitAmount && mapping.amount === -1) || (splitAmount && (mapping.incomeAmount === -1 || mapping.expenseAmount === -1))}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    Import Transactions
                </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Configuration Sidebar */}
            <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#101010] p-6 overflow-y-auto shrink-0">
                <h4 className="font-semibold text-slate-900 dark:text-[#f0f0f0] mb-4">Configuration</h4>
                
                <div className="space-y-6">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#111111] rounded-lg border border-slate-100 dark:border-[#1f1f1f]">
                        <input
                        type="checkbox"
                        id="splitAmount"
                        checked={splitAmount}
                        onChange={e => setSplitAmount(e.target.checked)}
                        className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="splitAmount" className="text-sm text-slate-700 dark:text-[#bbb] cursor-pointer">
                            <span className="font-medium block mb-0.5">Split Columns</span>
                            <span className="text-xs text-slate-500 dark:text-[#888]">Enable if your CSV has separate columns for Income and Expense</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        id="hasHeader"
                        checked={hasHeader}
                        onChange={e => setHasHeader(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="hasHeader" className="text-sm font-medium text-slate-700 dark:text-[#bbb] cursor-pointer">
                        First row contains headers
                        </label>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-[#1f1f1f]">
                        <h5 className="text-xs font-bold text-slate-500 dark:text-[#888] uppercase tracking-wider">Column Mapping</h5>
                        {[
                        { label: 'Date (Required)', key: 'date', show: true },
                        { label: 'Amount (Required)', key: 'amount', show: !splitAmount },
                        { label: 'Income (Required)', key: 'incomeAmount', show: splitAmount },
                        { label: 'Expense (Required)', key: 'expenseAmount', show: splitAmount },
                        { label: 'Category', key: 'category', show: true },
                        { label: 'Notes', key: 'notes', show: true }
                        ].filter(f => f.show).map(field => (
                        <div key={field.key}>
                            <label className="block text-xs font-medium text-slate-700 dark:text-[#bbb] mb-1.5">
                            {field.label}
                            </label>
                            <select
                            value={mapping[field.key as keyof typeof mapping]}
                            onChange={e => setMapping({ ...mapping, [field.key]: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-[#1f1f1f] rounded-lg text-sm text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                            <option value={-1} className="text-slate-500 dark:text-[#888]">Select Column...</option>
                            {previewRows[0]?.map((_, i) => (
                                <option key={i} value={i} className="text-slate-900 dark:text-[#f0f0f0]">
                                Column {i + 1} {hasHeader && previewRows[0][i] ? `(${previewRows[0][i]})` : ''}
                                </option>
                            ))}
                            </select>
                        </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-100 dark:bg-[#101010] sticky top-0 z-10 shadow-sm">
                        <tr>
                        {previewRows[0]?.map((_, i) => (
                            <th key={i} className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-[#888] uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-[#1f1f1f]">
                            Column {i + 1}
                            </th>
                        ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
                        {previewRows.slice(0, 20).map((row, i) => (
                        <tr key={i} className={hasHeader && i === 0 ? 'bg-slate-50 dark:bg-[#101010]/50 opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors'}>
                            {row.map((cell, j) => (
                            <td key={j} className="px-6 py-4 text-sm text-slate-900 dark:text-[#bbb] whitespace-nowrap">
                                {cell}
                            </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111111] rounded-lg p-6 w-full max-w-md space-y-4 text-slate-900 dark:text-[#f0f0f0] shadow-xl">
            <h3 className="text-xl font-semibold">Edit Category</h3>
            <input 
              value={editingCategory.name} 
              onChange={e=>setEditingCategory({...editingCategory, name:e.target.value})} 
              placeholder="Category name" 
              className="w-full border p-2.5 rounded-xl bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] border-slate-300 dark:border-[#282828] focus:ring-2 focus:ring-blue-500" 
            />
            <div className="flex items-center gap-2 border p-2.5 rounded-xl bg-white dark:bg-[#111111] border-slate-300 dark:border-[#282828]">
                <span className="text-sm text-slate-500 dark:text-[#888]">Color:</span>
                <input 
                  type="color" 
                  value={editingCategory.color || '#000000'} 
                  onChange={e=>setEditingCategory({...editingCategory, color:e.target.value})}
                  className="w-8 h-8 rounded cursor-pointer border-none p-0" 
                />
            </div>
            <div className="relative">
              <div 
                onClick={() => setIsEditCategoryTypeOpen(!isEditCategoryTypeOpen)}
                className="w-full border p-2.5 rounded-xl bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] border-slate-300 dark:border-[#282828] cursor-pointer flex justify-between items-center"
              >
                <span>{editingCategory.type}</span>
                <IconDown />
              </div>
              {isEditCategoryTypeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsEditCategoryTypeOpen(false)}></div>
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#282828] rounded-md shadow-lg overflow-hidden">
                    {['Expense', 'Income', 'Transfer'].map((type) => (
                      <div
                        key={type}
                        onClick={() => {
                          setEditingCategory({...editingCategory, type});
                          setIsEditCategoryTypeOpen(false);
                        }}
                        className={`px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] ${editingCategory.type === type ? 'bg-slate-50 dark:bg-slate-600/50 font-medium' : ''}`}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Asset-linked toggle */}
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#282828] bg-slate-50 dark:bg-[#0e0e0e] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#181818] transition-colors">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={!!(editingCategory as any).isAssetLinked}
                  onChange={e => setEditingCategory({...editingCategory, isAssetLinked: e.target.checked})}
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${(editingCategory as any).isAssetLinked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-[#333]'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(editingCategory as any).isAssetLinked ? 'translate-x-4' : ''}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-[#f0f0f0]">Asset-linked category</p>
                <p className="text-xs text-slate-500 dark:text-[#888]">Transactions here can be linked to an asset item</p>
              </div>
            </label>
            <div className="flex justify-between items-center pt-4">
              <button 
                onClick={async () => {
                  if (confirm('Delete this category?')) {
                    try {
                      await api.categories.remove(editingCategory.id)
                      setEditingCategory(null)
                      refresh()
                    } catch (error) {
                      console.error(error)
                      showToast('Failed to delete category', 'error')
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 font-medium transition-colors flex items-center gap-2"
              >
                <IconTrash /> Delete
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={()=>setEditingCategory(null)} 
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#111111] dark:hover:bg-[#242424] dark:bg-[#1a1a1a] text-slate-700 dark:text-[#d8d8d8] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async()=>{ 
                    if (!editingCategory.name) return
                    const payload = {
                      name: editingCategory.name,
                      type: editingCategory.type,
                      color: editingCategory.color || undefined,
                      isAssetLinked: !!(editingCategory as any).isAssetLinked
                    }
                    try {
                      await api.categories.update(editingCategory.id, payload)
                      setEditingCategory(null)
                      refresh()
                      showToast('Category updated', 'success')
                    } catch (error) {
                      console.error(error)
                      showToast('Failed to update category', 'error')
                    }
                  }} 
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectionMode && selectedCategoryIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900 dark:bg-[#111111] text-slate-50 dark:text-[#f0f0f0] border border-slate-700 dark:border-[#282828] rounded-full shadow-xl shadow-black/30 animate-in slide-in-from-bottom-10 fade-in duration-200">
          <span className="font-medium whitespace-nowrap text-sm pl-1">
            {selectedCategoryIds.size} selected
          </span>
          
          <div className="h-4 w-px bg-slate-700 dark:bg-slate-300 mx-1"></div>
          
          <button
            onClick={handleSelectAllCategories}
            className="px-3 py-1.5 text-sm font-medium text-slate-300 dark:text-[#aaa] hover:text-white dark:hover:text-white hover:bg-slate-700 dark:hover:bg-[#333] rounded-lg transition-colors"
          >
            Select All
          </button>

          <button
            onClick={handleBulkDeleteCategories}
            className="px-3 py-1.5 text-sm font-medium text-red-400 dark:text-red-600 hover:bg-red-900/30 dark:hover:bg-red-100 rounded-lg transition-colors"
          >
            Delete
          </button>

          <div className="h-4 w-px bg-slate-700 dark:bg-slate-300 mx-1"></div>

          <button
            onClick={() => { setSelectedCategoryIds(new Set()); setSelectionMode(false); }}
            className="p-1 hover:bg-slate-700 dark:hover:bg-[#333] rounded-full transition-colors"
            aria-label="Cancel selection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-400 dark:text-[#666]">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {editingRecurringTransaction && (
        <div className="fixed inset-0 z-50 flex sm:items-center justify-center sm:p-4">
          {/* Backdrop for desktop */}
          <div className="absolute inset-0 bg-black/50 hidden sm:block" onClick={() => setEditingRecurringTransaction(null)}></div>
          
          {/* Modal Content */}
          <div className="relative w-full h-full sm:h-auto sm:max-w-md bg-white dark:bg-[#101010] sm:dark:bg-[#111111] sm:rounded-lg shadow-xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#1f1f1f] shrink-0">
              <button 
                onClick={() => setEditingRecurringTransaction(null)}
                className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[#f0f0f0]">Edit Transaction</h3>
              <button 
                onClick={async()=>{ 
                    try {
                      await api.recurringTransactions.update(editingRecurringTransaction.id, editingRecurringTransactionForm)
                      setEditingRecurringTransaction(null)
                      refresh()
                    } catch (err) {
                      console.error(err)
                      showToast('Failed to update transaction', 'error')
                    }
                }} 
                className="text-blue-600 dark:text-blue-400 font-semibold text-sm px-2"
              >
                Save
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#888] uppercase tracking-wider mb-2">Description</label>
                <input 
                  value={editingRecurringTransactionForm.notes || ''} 
                  onChange={e=>setEditingRecurringTransactionForm({...editingRecurringTransactionForm, notes:e.target.value})} 
                  placeholder="Description" 
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#888] uppercase tracking-wider mb-2">Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-bold">€</span>
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    value={editingRecurringTransactionForm.amount} 
                    onChange={e=>setEditingRecurringTransactionForm({...editingRecurringTransactionForm, amount:parseFloat(e.target.value)})} 
                    placeholder="0.00" 
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-[#f0f0f0] font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 dark:text-[#888] uppercase tracking-wider mb-2">Category</label>
                <div 
                  onClick={() => setIsRecTxCategoryOpen(!isRecTxCategoryOpen)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-[#f0f0f0] cursor-pointer flex justify-between items-center"
                >
                  <span>
                    {categories.find(c => c.id === editingRecurringTransactionForm.categoryId)?.name || 'Select Category'}
                  </span>
                  <IconDown />
                </div>
                {isRecTxCategoryOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsRecTxCategoryOpen(false)}></div>
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl shadow-xl max-h-60 overflow-y-auto hide-scrollbar">
                      {categories.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setEditingRecurringTransactionForm({...editingRecurringTransactionForm, categoryId: c.id});
                            setIsRecTxCategoryOpen(false);
                          }}
                          className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] ${
                            editingRecurringTransactionForm.categoryId === c.id ? 'bg-slate-50 dark:bg-[#111111] font-medium' : ''
                          }`}
                        >
                          <span className="text-slate-900 dark:text-[#f0f0f0]">{c.name}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                            c.type==='Income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                            c.type==='Transfer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                            'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                            {c.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Frequency Dropdown */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 dark:text-[#888] uppercase tracking-wider mb-2">Frequency</label>
                <div 
                  onClick={() => setIsRecTxFrequencyOpen(!isRecTxFrequencyOpen)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-[#f0f0f0] cursor-pointer flex justify-between items-center"
                >
                  <span>
                    {frequencyOptions.find(opt => opt.value === editingRecurringTransactionForm.frequency)?.label || editingRecurringTransactionForm.frequency}
                  </span>
                  <IconDown />
                </div>
                {isRecTxFrequencyOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsRecTxFrequencyOpen(false)}></div>
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl shadow-xl max-h-60 overflow-y-auto hide-scrollbar">
                      {frequencyOptions.map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setEditingRecurringTransactionForm({...editingRecurringTransactionForm, frequency: opt.value});
                            setIsRecTxFrequencyOpen(false);
                          }}
                          className={`px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] ${
                            editingRecurringTransactionForm.frequency === opt.value ? 'bg-slate-50 dark:bg-[#111111] font-medium' : ''
                          }`}
                        >
                          <span className="text-slate-900 dark:text-[#f0f0f0]">{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Asset Item */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#888] uppercase tracking-wider mb-2">Asset Item</label>
                  <select
                    value={editingRecurringTransactionForm.assetItemId || ''}
                    onChange={e => setEditingRecurringTransactionForm({...editingRecurringTransactionForm, assetItemId: e.target.value ? Number(e.target.value) : null})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-xl text-sm font-medium text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">No linked asset</option>
                    {assetGroups.map((g: any) => (
                      <optgroup key={g.id} label={g.name}>
                        {g.items.map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
              </div>

              {/* Next Due Date */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#888] uppercase tracking-wider mb-2">Next Due Date</label>
                  <input 
                    type="date"
                    value={editingRecurringTransactionForm.nextDate || ''} 
                    onChange={e=>setEditingRecurringTransactionForm({...editingRecurringTransactionForm, nextDate: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                  />
              </div>

              {/* End Date */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#888] uppercase tracking-wider mb-2">End Date (Inclusive)</label>
                  <input
                    type="date"
                    value={editingRecurringTransactionForm.endDate || ''} 
                    onChange={e=>setEditingRecurringTransactionForm({...editingRecurringTransactionForm, endDate: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                  />
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <button
                  onClick={() => setEditingRecurringTransactionForm({...editingRecurringTransactionForm, isActive: !editingRecurringTransactionForm.isActive})}
                  className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-sm ${
                    editingRecurringTransactionForm.isActive 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' 
                      : 'bg-slate-200 text-slate-600 dark:bg-[#111111] dark:text-[#bbb]'
                  }`}
                >
                  {editingRecurringTransactionForm.isActive ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                      </svg>
                      Active
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                      </svg>
                      Paused
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Footer (Delete) */}
            <div className="p-4 border-t border-slate-100 dark:border-[#1f1f1f] shrink-0 safe-area-bottom bg-white dark:bg-[#101010] sm:dark:bg-[#111111]">
              <button 
                onClick={async () => {
                  if (confirm('Delete this recurring transaction?')) {
                    try {
                      await api.recurringTransactions.remove(editingRecurringTransaction.id)
                      setEditingRecurringTransaction(null)
                      refresh()
                    } catch (error) {
                      console.error(error)
                      showToast('Failed to delete transaction', 'error')
                    }
                  }
                }}
                className="w-full py-3 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <IconTrash /> Delete Transaction
              </button>
            </div>

          </div>
        </div>
      )}

      {assetSelectionMode && selectedAssetItemIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900 dark:bg-[#111111] text-slate-50 dark:text-[#f0f0f0] border border-slate-700 dark:border-[#282828] rounded-full shadow-xl shadow-black/30 animate-in slide-in-from-bottom-10 fade-in duration-200">
          <span className="font-medium whitespace-nowrap text-sm pl-1">
            {selectedAssetItemIds.size} selected
          </span>
          
          <div className="h-4 w-px bg-slate-700 dark:bg-slate-300 mx-1"></div>
          
          <button
            onClick={handleSelectAllAssetItems}
            className="px-3 py-1.5 text-sm font-medium text-slate-300 dark:text-[#aaa] hover:text-white dark:hover:text-white hover:bg-slate-700 dark:hover:bg-[#333] rounded-lg transition-colors"
          >
            Select All
          </button>

          <button
            onClick={handleBulkDeleteAssetItems}
            className="px-3 py-1.5 text-sm font-medium text-red-400 dark:text-red-600 hover:bg-red-900/30 dark:hover:bg-red-100 rounded-lg transition-colors"
          >
            Delete
          </button>

          <div className="h-4 w-px bg-slate-700 dark:bg-slate-300 mx-1"></div>

          <button
            onClick={() => { setSelectedAssetItemIds(new Set()); setAssetSelectionMode(false); }}
            className="p-1 hover:bg-slate-700 dark:hover:bg-[#333] rounded-full transition-colors"
            aria-label="Cancel selection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-400 dark:text-[#666]">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
