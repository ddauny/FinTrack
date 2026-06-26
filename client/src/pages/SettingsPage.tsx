import React, { useEffect, useState, useRef, useCallback } from 'react'
import { api, secureFetch, authHeaders } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useAlert } from '../contexts/AlertContext'

// --- Icons ---
const IconChevronLeft = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
)
const IconChevronRight = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
)
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z"/></svg>
)
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
)
const IconDots = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
)

// --- Shared Components ---
function ActionMenu({ actions }: { actions: { label: string, onClick: () => void, icon?: React.ReactNode, variant?: 'danger' | 'default' }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) { if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="p-1.5 rounded-lg transition-colors text-slate-400 dark:text-[#555] hover:bg-slate-100 dark:hover:bg-white/5">
        <IconDots />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#181818] rounded-lg shadow-xl border border-slate-200 dark:border-[#282828] z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          {actions.map((action, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${action.variant === 'danger' ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10' : 'text-slate-700 dark:text-[#aaa] hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <span className="shrink-0">{action.icon}</span> {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsHeader({ title, description, onBack }: any) {
    return (
        <div className="mb-8">
            {onBack && (
                <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors mb-4 group">
                    <IconChevronLeft />
                    Back to Settings
                </button>
            )}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-[#f0f0f0]">{title}</h2>
            {description && <p className="text-sm text-slate-500 dark:text-[#666] mt-1">{description}</p>}
        </div>
    )
}

function SectionCard({ title, children, footer }: any) {
    return (
        <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg overflow-hidden flex flex-col">
            {title && (
                <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1f1f1f] bg-slate-50/50 dark:bg-[#151515]">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#555]">{title}</h3>
                </div>
            )}
            <div className="p-6 flex-1">
                {children}
            </div>
            {footer && (
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#151515] border-t border-slate-200 dark:border-[#1f1f1f] flex justify-end">
                    {footer}
                </div>
            )}
        </div>
    )
}

function ControlRow({ title, description, icon, onClick }: any) {
    return (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#161616] transition-colors group text-left border-b border-slate-100 dark:border-[#1a1a1a] last:border-0">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#1f1f1f] flex items-center justify-center text-slate-500 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                    <span className="text-lg">{icon}</span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-[#e0e0e0]">{title}</h4>
                    <p className="text-[11px] text-slate-400 dark:text-[#555] mt-0.5">{description}</p>
                </div>
            </div>
            <div className="text-slate-300 dark:text-[#333] group-hover:text-blue-500 transition-colors">
                <IconChevronRight />
            </div>
        </button>
    )
}

// --- Main Page ---
export function SettingsPage() {
  const { showToast } = useToast(); const { showAlert } = useAlert(); const navigate = useNavigate()
  const [view, setView] = useState('dashboard')
  const [profile, setProfile] = useState<any>(null); const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [categories, setCategories] = useState<any[]>([]); const [groups, setGroups] = useState<any[]>([]); const [recurringTransactions, setRecurringTransactions] = useState<any[]>([])
  const [automationToken, setAutomationToken] = useState<string | null>(null); const [showToken, setShowToken] = useState(false); const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<any>(null); const [showCatModal, setShowCatModal] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<any>(null)
  const [catForm, setCatForm] = useState<any>({ name:'', type:'Expense', color: '#3b82f6' })
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null); const [depreciationValues, setDepreciationValues] = useState<Record<number, string>>({}); const [initialContributionValues, setInitialContributionValues] = useState<Record<number, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    const headers = authHeaders()
    try {
        const [p, c, g, r, tData] = await Promise.all([
          api.settings.profile(), api.categories.list(), 
          secureFetch('/api/asset-groups', { headers }).then(r=>r.json()),
          api.recurringTransactions.list(), api.settings.getAutomationToken()
        ])
        setProfile(p); setEmail(p?.email||''); setCategories(c); setGroups(g); setRecurringTransactions(r); setAutomationToken(tData.token)
        if (g.length > 0 && activeGroupId === null) setActiveGroupId(g[0].id)
    } catch (err) {
        console.error('Settings load error:', err)
        showToast('Failed to load settings data', 'error')
    } finally { setLoading(false) }
  }, [activeGroupId, showToast])

  useEffect(()=>{ refresh() }, [refresh])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingRecurring) setEditingRecurring(null)
        if (editingCategory) setEditingCategory(null)
        if (showCatModal) {
          setShowCatModal(false)
          setCatForm({ name: '', type: 'Expense', color: '#3b82f6' })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingRecurring, editingCategory, showCatModal])

  const tokenHeader = authHeaders;

  const moveItem = async (groupId: number, itemIdx: number, dir: 'up'|'down') => {
    const g = groups.find(x=>x.id === groupId); if (!g) return
    const items = g.items.filter((it:any)=>!it.parentItemId)
    const target = dir === 'up' ? itemIdx - 1 : itemIdx + 1; if (target < 0 || target >= items.length) return
    [items[itemIdx], items[target]] = [items[target], items[itemIdx]]
    await secureFetch('/api/asset-items/reorder', { method:'POST', headers:{'Content-Type':'application/json', ...tokenHeader()}, body: JSON.stringify({ itemIds: items.map((it:any)=>it.id) }) })
    refresh()
  }

  if (loading) return (
    <div className="p-8 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-[#1f1f1f] rounded mb-12" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg" />)}
            </div>
            <div className="h-64 bg-slate-100 dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg" />
        </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto page-enter flex flex-col items-center w-full">
      <div className="w-full">
      {view === 'dashboard' ? (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <SettingsHeader title="Settings" description="Configure your workspace and preferences." />
                <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-bold">
                        {profile?.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-wider">Active Account</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-[#ccc] truncate">{profile?.email}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <SectionCard title="Personal & Identity">
                        <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a] -mx-6 -my-6">
                            <ControlRow title="Profile Information" description="Update your email and password." icon="👤" onClick={() => setView('profile')} />
                        </div>
                    </SectionCard>

                    <SectionCard title="Financial Configuration">
                        <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a] -mx-6 -my-6">
                            <ControlRow title="Categories & Buckets" description="Organize how your transactions are grouped." icon="🏷️" onClick={() => setView('categories')} />
                            <ControlRow title="Wealth Assets" description="Define your accounts and physical assets." icon="🏦" onClick={() => setView('assets')} />
                            <ControlRow title="Habitual Flows" description="Manage your recurring income and expenses." icon="🔄" onClick={() => setView('recurring')} />
                        </div>
                    </SectionCard>

                    <SectionCard title="Advanced Features">
                        <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a] -mx-6 -my-6">
                            <ControlRow title="Automation & API" description="Tokens for Shortcuts and external integrations." icon="⚡" onClick={() => setView('automation')} />
                            <ControlRow title="Data Management" description="Export your data or import from CSV." icon="📥" onClick={() => setView('data')} />
                        </div>
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg p-6">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-[#f0f0f0]">Help & Support</h4>
                        <p className="text-[11px] text-slate-500 dark:text-[#666] mt-1 leading-relaxed">Need help with Fintrack? Check our documentation or contact support.</p>
                        <button className="mt-4 w-full py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-[#1f1f1f] text-slate-700 dark:text-[#aaa] text-[11px] font-bold rounded-lg">Documentation</button>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {view === 'profile' && (
                <div className="max-w-2xl mx-auto w-full">
                    <SettingsHeader title="Profile Info" description="Update your personal details." onBack={() => setView('dashboard')} />
                    <SectionCard footer={
                        <div className="flex justify-between items-center w-full">
                            <button onClick={() => showAlert({ title: 'Logout?', message: 'Are you sure you want to sign out?', confirmText: 'Sign Out', onConfirm: () => { localStorage.removeItem('token'); navigate('/login') } })} 
                                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors">
                                Sign Out
                            </button>
                            <button onClick={async()=>{await api.settings.updateProfile({email, password:password||undefined}); showToast('Updated!','success'); setPassword(''); refresh()}} className="btn-primary">Save Changes</button>
                        </div>
                    }>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Email Address</label>
                                <input value={email} onChange={e=>setEmail(e.target.value)} className="input-field" placeholder="Email" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">New Password</label>
                                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input-field" placeholder="Leave blank to keep current" />
                            </div>
                        </div>
                    </SectionCard>
                </div>
            )}

            {view === 'recurring' && (
                <div className="max-w-4xl mx-auto w-full">
                    <SettingsHeader title="Habitual Flows" description="Manage your recurring transactions." onBack={() => setView('dashboard')} />
                    <SectionCard>
                        <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a] -mx-6 -my-6">
                            {recurringTransactions.map(rt => (
                                <div key={rt.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#161616] transition-colors cursor-pointer" onClick={() => setEditingRecurring({...rt, nextDate: rt.nextDate.split('T')[0]})}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${rt.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {rt.type === 'Income' ? 'IN' : 'EX'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-[#f0f0f0]">{rt.notes || 'Untitled Flow'}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-[#555] uppercase font-bold tracking-tight">{rt.frequency} · {categories.find(c => c.id === rt.categoryId)?.name || 'No Category'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${rt.type === 'Income' ? 'text-emerald-500' : 'text-rose-500'}`}>€{Number(rt.amount).toFixed(2)}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-[#555]">Next: {new Date(rt.nextDate).toLocaleDateString()}</p>
                                        </div>
                                        <div onClick={e => e.stopPropagation()}>
                                            <ActionMenu actions={[
                                                { label: rt.isActive ? 'Deactivate' : 'Activate', icon: rt.isActive ? '⏸' : '▶', onClick: async () => { await api.recurringTransactions.update(rt.id, { isActive: !rt.isActive }); refresh() } },
                                                { label: 'Delete', icon: <IconTrash />, variant: 'danger', onClick: () => showAlert({ title: 'Delete Flow?', message: 'Delete this recurring transaction?', confirmText: 'Delete', type: 'danger', onConfirm: async () => { await api.recurringTransactions.remove(rt.id); refresh() } }) }
                                            ]} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {recurringTransactions.length === 0 && (
                                <div className="p-12 text-center">
                                    <p className="text-sm text-slate-400 dark:text-[#555] italic">No habitual flows defined yet.</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                </div>
            )}

            {view === 'data' && (
                <div className="max-w-2xl mx-auto w-full">
                    <SettingsHeader title="Data Management" description="Import or export your financial history." onBack={() => setView('dashboard')} />
                    <div className="space-y-6">
                        <SectionCard title="Export Data">
                            <p className="text-xs text-slate-500 dark:text-[#666] mb-6 leading-relaxed">Download your entire transaction history in various formats for backup or analysis.</p>
                            <div className="flex gap-3">
                                <button onClick={async () => {
                                    const data = await api.transactions.exportJson()
                                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a'); a.href = url; a.download = `fintrack_export_${new Date().toISOString().split('T')[0]}.json`; a.click()
                                }} className="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black text-[11px] font-bold rounded-lg">Export JSON</button>
                                <button onClick={async () => {
                                    const csv = await api.reports.exportCsv('/api/transactions')
                                    const blob = new Blob([csv], { type: 'text/csv' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a'); a.href = url; a.download = `fintrack_export_${new Date().toISOString().split('T')[0]}.csv`; a.click()
                                }} className="flex-1 py-2.5 bg-white dark:bg-black/20 border border-slate-200 dark:border-[#1f1f1f] text-slate-700 dark:text-[#aaa] text-[11px] font-bold rounded-lg">Export CSV</button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Import Data">
                            <p className="text-xs text-slate-500 dark:text-[#666] mb-6 leading-relaxed">Upload a CSV file to bulk import transactions. Ensure columns match the required format.</p>
                            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0]; if (!file) return
                                try {
                                    await api.transactions.importCsv(file); showToast('Import successful', 'success'); refresh()
                                } catch (err: any) {
                                    showToast(err.message, 'error')
                                }
                            }} />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg shadow-lg shadow-blue-500/20">Upload CSV File</button>
                        </SectionCard>
                    </div>
                </div>
            )}

            {view === 'categories' && (
                <div className="max-w-6xl mx-auto w-full">
                    <div className="flex justify-between items-end mb-8">
                        <SettingsHeader title="Categories" description="Manage how your money is organized." onBack={() => setView('dashboard')} />
                        <button onClick={()=>setShowCatModal(true)} className="btn-primary mb-8">
                            <IconPlus /> Add Category
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['Expense','Income','Transfer'].map(t => (
                            <SectionCard key={t} title={`${t}s`}>
                                <div className="space-y-2">
                                    {categories.filter(c=>c.type===t).map(c => (
                                        <div key={c.id} onClick={() => setEditingCategory(c)} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-[#1a1a1a] hover:border-blue-500/40 hover:bg-slate-50 dark:hover:bg-[#161616] cursor-pointer transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: c.color || '#3b82f6' }}></div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-[#ccc]">{c.name}</span>
                                                {c.isAssetLinked && <span className="text-[8px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">PAC</span>}
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <IconChevronRight />
                                            </div>
                                        </div>
                                    ))}
                                    {categories.filter(c=>c.type===t).length === 0 && (
                                        <p className="text-[11px] text-slate-400 dark:text-[#555] text-center py-4 italic">No categories defined.</p>
                                    )}
                                </div>
                            </SectionCard>
                        ))}
                    </div>
                </div>
            )}

            {view === 'assets' && (
                <div className="max-w-6xl mx-auto w-full">
                    <SettingsHeader title="Wealth Assets" description="Manage your accounts and investment items." onBack={() => setView('dashboard')} />
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar border-b border-slate-200 dark:border-[#1f1f1f]">
                        {groups.map(g => (
                            <button key={g.id} onClick={()=>setActiveGroupId(g.id)} 
                                className={`px-4 py-2 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap ${activeGroupId===g.id?'bg-blue-600 text-white shadow-lg shadow-blue-500/20':'bg-white dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] text-slate-500 hover:border-blue-500/40'}`}>
                                {g.name}
                            </button>
                        ))}
                        <button onClick={()=>{const n=prompt('Group Name?'); if(n) secureFetch('/api/asset-groups',{method:'POST',headers:{'Content-Type':'application/json',...tokenHeader()},body:JSON.stringify({name:n})}).then(()=>refresh())}} 
                            className="px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-[#333] text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-colors">
                            <IconPlus />
                        </button>
                    </div>
                    {activeGroupId && (() => {
                        const group = groups.find(x => x.id === activeGroupId);
                        if (!group) return null;
                        return (
                            <div className="mb-6 bg-slate-50 dark:bg-black/10 border border-slate-200 dark:border-[#1f1f1f] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-800 dark:text-[#f0f0f0] uppercase tracking-wider">Group Settings: {group.name}</span>
                                        <button onClick={() => { const n=prompt('Rename Group?', group.name); if(n) secureFetch(`/api/asset-groups/${group.id}`, { method:'PUT', headers:{'Content-Type':'application/json', ...tokenHeader()}, body:JSON.stringify({name:n}) }).then(()=>refresh()) }}
                                            className="text-[10px] text-blue-500 hover:underline font-bold">Rename</button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Configure how this group behaves across the app.</p>
                                </div>
                                <div className="flex items-center gap-3 bg-white dark:bg-[#111] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1f1f1f]">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={group.isInvestment ?? true}
                                            onChange={async (e) => {
                                                await secureFetch(`/api/asset-groups/${group.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                                                    body: JSON.stringify({ isInvestment: e.target.checked })
                                                });
                                                refresh();
                                            }}
                                            className="rounded border-slate-300 dark:border-[#333] text-blue-600 focus:ring-blue-500 w-4 h-4" 
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 dark:text-[#ddd]">Include in Portfolio</span>
                                            <span className="text-[9px] text-slate-400">Track in Portfolio IQ performance metrics and CAGR</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        );
                    })()}
                    {activeGroupId && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {groups.find(x=>x.id===activeGroupId)?.items.filter((it:any)=>!it.parentItemId).map((it:any, idx:number) => {
                                const group = groups.find(x=>x.id===activeGroupId)
                                const children = group.items.filter((c:any)=>c.parentItemId===it.id)
                                return (
                                    <div key={it.id} className="bg-white dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg p-5 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0">
                                                <h4 className="truncate text-sm font-bold text-slate-900 dark:text-[#f0f0f0]">{it.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase mt-0.5">{children.length} sub-items</p>
                                            </div>
                                            <ActionMenu actions={[
                                                { label: 'Add Sub-item', icon: <IconPlus />, onClick: () => { const n=prompt('Name?'); if(n) secureFetch(`/api/asset-items/${it.id}/children`, { method:'POST', headers:{'Content-Type':'application/json', ...tokenHeader()}, body: JSON.stringify({name:n}) }).then(()=>refresh()) } },
                                                { label: 'Move Up', icon: '↑', onClick: () => moveItem(activeGroupId, idx, 'up') },
                                                { label: 'Delete', icon: <IconTrash />, variant: 'danger', onClick: () => showAlert({ title: 'Delete Asset?', message: `Delete "${it.name}" and all its history?`, confirmText: 'Delete', type: 'danger', onConfirm: async () => { await secureFetch(`/api/asset-items/${it.id}`, { method:'DELETE', headers: tokenHeader() }); refresh() } }) }
                                            ]} />
                                        </div>
                                        <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-[#1a1a1a]">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Monthly Depr.</span>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">€</span>
                                                    <input type="number" step="0.01" value={depreciationValues[it.id] !== undefined ? depreciationValues[it.id] : (it.depreciationAmount || '')}
                                                        onChange={e => setDepreciationValues((prev: any) => ({ ...prev, [it.id]: e.target.value }))}
                                                        onBlur={async () => { const val=depreciationValues[it.id]?Number(depreciationValues[it.id]):null; await secureFetch(`/api/asset-items/${it.id}`, { method:'PUT', headers:{'Content-Type':'application/json', ...tokenHeader()}, body: JSON.stringify({ depreciationAmount: val }) }); refresh() }}
                                                        className="w-24 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-[#282828] pl-6 pr-3 py-1.5 text-xs font-bold text-right outline-none focus:border-blue-500 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Initial Capital</span>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">€</span>
                                                        <input type="number" step="0.01" value={initialContributionValues[it.id] !== undefined ? initialContributionValues[it.id] : (it.initialContribution || '')}
                                                            onChange={e => setInitialContributionValues((prev: any) => ({ ...prev, [it.id]: e.target.value }))}
                                                            onBlur={async () => { const val=initialContributionValues[it.id]?Number(initialContributionValues[it.id]):null; await secureFetch(`/api/asset-items/${it.id}`, { method:'PUT', headers:{'Content-Type':'application/json', ...tokenHeader()}, body: JSON.stringify({ initialContribution: val }) }); refresh() }}
                                                            className="w-24 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-[#282828] pl-6 pr-3 py-1.5 text-xs font-bold text-right outline-none focus:border-blue-500 transition-colors" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Start Month</span>
                                                    <input type="date" value={it.initialContributionDate ? String(it.initialContributionDate).slice(0, 10) : ''}
                                                        onChange={async (e) => {
                                                            const val = e.target.value ? e.target.value : null;
                                                            await secureFetch(`/api/asset-items/${it.id}`, { method:'PUT', headers:{'Content-Type':'application/json', ...tokenHeader()}, body: JSON.stringify({ initialContributionDate: val }) });
                                                            refresh();
                                                        }}
                                                        className="w-28 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-[#282828] px-2 py-1 text-xs font-bold text-right outline-none focus:border-blue-500 transition-colors text-slate-700 dark:text-slate-300" />
                                                </div>
                                                <div className="text-[9px] text-slate-400 dark:text-[#555] italic text-right mt-0.5">
                                                    {it.firstTransactionDate ? (
                                                        <span>First transaction: {new Date(it.firstTransactionDate).toLocaleDateString('it-IT')}</span>
                                                    ) : (
                                                        <span>No transactions linked</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <button onClick={()=>{const n=prompt('Asset Name?'); if(n) secureFetch(`/api/asset-groups/${activeGroupId}/items`,{method:'POST',headers:{'Content-Type':'application/json',...tokenHeader()},body:JSON.stringify({name:n})}).then(()=>refresh())}} 
                                className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-100 dark:border-[#1a1a1a] flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500/40 hover:bg-blue-500/[0.02] transition-all gap-2">
                                <IconPlus />
                                <span className="text-xs font-bold">New Asset Item</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {view === 'automation' && (
                <div className="max-w-2xl mx-auto w-full">
                    <SettingsHeader title="API Hub" description="Connect external tools to your Fintrack data." onBack={() => setView('dashboard')} />
                    <SectionCard title="Automation Token">
                        <p className="text-xs text-slate-500 dark:text-[#666] mb-6 leading-relaxed">Use this token to authenticate requests from iOS Shortcuts or external scripts. Treat it like a password.</p>
                        <div className="space-y-4">
                            <div className="relative">
                                <input readOnly value={automationToken||'Not Generated'} type={showToken?'text':'password'} 
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-[#282828] p-4 rounded-lg font-mono text-[11px] text-blue-500 outline-none" />
                                <button onClick={()=>setShowToken(!showToken)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-blue-500 transition-colors">
                                    {showToken?'MASK':'REVEAL'}
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={()=>{navigator.clipboard.writeText(automationToken||''); showToast('Token copied','success')}} 
                                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-[11px] rounded-lg hover:opacity-90 transition-opacity">
                                    Copy Token
                                </button>
                                <button onClick={async() => { if(confirm('Regenerate token? Old one will stop working.')) { await secureFetch('/api/settings/automation-token', { method:'POST', headers: tokenHeader() }); refresh(); showToast('Regenerated','success') } }}
                                    className="px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-[#1f1f1f] text-slate-500 dark:text-[#666] font-bold text-[11px] rounded-lg hover:border-blue-500/40 hover:text-blue-500 transition-all">
                                    Regenerate
                                </button>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            )}
        </div>
      )}
      </div>

      {/* --- Modals --- */}
      {editingRecurring && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] p-8 rounded-lg w-full max-w-md shadow-2xl">
                  <h3 className="text-lg font-bold mb-6 dark:text-[#f0f0f0]">Edit Habitual Flow</h3>
                  <div className="space-y-4 mb-8">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Notes</label>
                            <input value={editingRecurring.notes || ''} onChange={e=>setEditingRecurring({...editingRecurring, notes:e.target.value})} className="input-field" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Amount</label>
                            <input type="number" step="0.01" value={editingRecurring.amount} onChange={e=>setEditingRecurring({...editingRecurring, amount:e.target.value})} className="input-field" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Category</label>
                            <select value={editingRecurring.categoryId} onChange={e=>setEditingRecurring({...editingRecurring, categoryId: Number(e.target.value)})} className="input-field">
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Frequency</label>
                            <select value={editingRecurring.frequency} onChange={e=>setEditingRecurring({...editingRecurring, frequency: e.target.value})} className="input-field">
                                {['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY'].map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase">Next Charge Date</label>
                        <input type="date" value={editingRecurring.nextDate} onChange={e=>setEditingRecurring({...editingRecurring, nextDate:e.target.value})} className="input-field" />
                      </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>setEditingRecurring(null)} className="flex-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-[#888] transition-colors">Cancel</button>
                    <button onClick={async()=>{await api.recurringTransactions.update(editingRecurring.id, editingRecurring); setEditingRecurring(null); refresh(); showToast('Flow updated','success')}} className="btn-primary flex-1">Save Changes</button>
                  </div>
              </div>
          </div>
      )}

      {editingCategory && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] p-8 rounded-2xl w-full max-w-sm shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg" style={{ backgroundColor: editingCategory.color || '#3b82f6' }}>
                      {editingCategory.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <h3 className="text-lg font-bold dark:text-[#f0f0f0]">Edit Category</h3>
                  </div>
                  <div className="space-y-5 mb-8">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-wider">Name</label>
                        <input value={editingCategory.name} onChange={e=>setEditingCategory({...editingCategory, name:e.target.value})} className="input-field" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-wider">Color</label>
                        <div className="grid grid-cols-10 gap-1.5">
                          {['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#14b8a6','#3b82f6','#6366f1','#8b5cf6','#ec4899','#64748b','#0ea5e9','#10b981','#a855f7','#f43f5e','#fb923c','#facc15','#4ade80','#2dd4bf','#818cf8'].map(col => (
                            <button key={col} onClick={() => setEditingCategory({...editingCategory, color: col})}
                              className={`w-full aspect-square rounded-lg transition-all duration-150 hover:scale-110 ${editingCategory.color === col ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#111] ring-slate-800 dark:ring-white scale-110' : ''}`}
                              style={{ backgroundColor: col }} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-7 h-7 rounded-lg shrink-0 border border-slate-200 dark:border-[#333] overflow-hidden">
                            <input type="color" value={editingCategory.color || '#3b82f6'} onChange={e => setEditingCategory({...editingCategory, color: e.target.value})} className="w-10 h-10 -translate-x-1 -translate-y-1 cursor-pointer border-0 bg-transparent" />
                          </div>
                          <input value={editingCategory.color || ''} onChange={e => setEditingCategory({...editingCategory, color: e.target.value})} placeholder="#3b82f6" maxLength={7}
                            className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-[#282828] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 outline-none focus:border-blue-500 transition-colors uppercase" />
                          <span className="text-[10px] text-slate-400 font-medium">Custom</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/20 p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center text-sm">📈</div>
                            <div>
                              <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300">Investment Contribution</p>
                              <p className="text-[10px] text-violet-500 dark:text-violet-400 leading-relaxed">Tag transactions as portfolio deposits (PAC).</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" checked={editingCategory.isAssetLinked ?? false}
                              onChange={e => setEditingCategory({...editingCategory, isAssetLinked: e.target.checked})}
                              className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-200 dark:bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        </div>
                      </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>setEditingCategory(null)} className="flex-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-[#888] transition-colors">Cancel</button>
                    <button onClick={async()=>{await api.categories.update(editingCategory.id, editingCategory); setEditingCategory(null); refresh(); showToast('Category updated','success')}} className="btn-primary flex-1">Save Changes</button>
                  </div>
              </div>
          </div>
      )}

      {showCatModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] p-8 rounded-2xl w-full max-w-sm shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg" style={{ backgroundColor: catForm.color || '#3b82f6' }}>
                      {catForm.name?.[0]?.toUpperCase() || '+'}
                    </div>
                    <h3 className="text-lg font-bold dark:text-[#f0f0f0]">New Category</h3>
                  </div>
                  <div className="space-y-5 mb-8">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-wider">Name</label>
                        <input value={catForm.name} onChange={e=>setCatForm({...catForm, name:e.target.value})} placeholder="e.g. Shopping" className="input-field" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-wider">Type</label>
                        <select value={catForm.type} onChange={e=>setCatForm({...catForm, type:e.target.value})} className="input-field">
                            <option>Expense</option><option>Income</option><option>Transfer</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-wider">Color</label>
                        <div className="grid grid-cols-10 gap-1.5">
                          {['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#14b8a6','#3b82f6','#6366f1','#8b5cf6','#ec4899','#64748b','#0ea5e9','#10b981','#a855f7','#f43f5e','#fb923c','#facc15','#4ade80','#2dd4bf','#818cf8'].map(col => (
                            <button key={col} onClick={() => setCatForm({...catForm, color: col})}
                              className={`w-full aspect-square rounded-lg transition-all duration-150 hover:scale-110 ${catForm.color === col ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#111] ring-slate-800 dark:ring-white scale-110' : ''}`}
                              style={{ backgroundColor: col }} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-7 h-7 rounded-lg shrink-0 border border-slate-200 dark:border-[#333] overflow-hidden">
                            <input type="color" value={catForm.color || '#3b82f6'} onChange={e => setCatForm({...catForm, color: e.target.value})} className="w-10 h-10 -translate-x-1 -translate-y-1 cursor-pointer border-0 bg-transparent" />
                          </div>
                          <input value={catForm.color || ''} onChange={e => setCatForm({...catForm, color: e.target.value})} placeholder="#3b82f6" maxLength={7}
                            className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-[#282828] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 outline-none focus:border-blue-500 transition-colors uppercase" />
                          <span className="text-[10px] text-slate-400 font-medium">Custom</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/20 p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center text-sm">📈</div>
                            <div>
                              <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300">Investment Contribution</p>
                              <p className="text-[10px] text-violet-500 dark:text-violet-400 leading-relaxed">Tag transactions as portfolio deposits (PAC).</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" checked={catForm.isAssetLinked ?? false}
                              onChange={e => setCatForm({...catForm, isAssetLinked: e.target.checked})}
                              className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-200 dark:bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        </div>
                      </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>{setShowCatModal(false); setCatForm({name:'',type:'Expense',color:'#3b82f6'})}} className="flex-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-[#888] transition-colors">Cancel</button>
                    <button onClick={async()=>{if(catForm.name) {await api.categories.create(catForm); setShowCatModal(false); setCatForm({name:'',type:'Expense',color:'#3b82f6'}); refresh(); showToast('Category created','success')}}} className="btn-primary flex-1">Create</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  )
}
