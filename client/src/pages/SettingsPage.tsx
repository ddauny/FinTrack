import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [accForm, setAccForm] = useState<any>({ name:'', type:'Checking', initialBalance:0 })
  const [catForm, setCatForm] = useState<any>({ name:'', type:'Expense' })
  const [showCatModal, setShowCatModal] = useState(false)
  const [groups, setGroups] = useState<any[]>([])
  const [groupForm, setGroupForm] = useState<any>({ name:'' })
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [itemForm, setItemForm] = useState<Record<number, { name: string; description?: string }>>({})
  const [showItemModalForGroup, setShowItemModalForGroup] = useState<number | null>(null)
  const [depreciationValues, setDepreciationValues] = useState<Record<number, string>>({})
  async function refresh() {
    const [p, c, g] = await Promise.all([api.settings.profile(), api.categories.list(), fetch('/api/asset-groups', { headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } }).then(r=>r.json())])
    setProfile(p); setEmail((p as any)?.email||''); setCategories(c as any[]); setGroups(g as any[])
  }
  useEffect(()=>{ refresh() }, [])
  return (
    <div className="p-2 sm:p-4 space-y-4">
      <div className="bg-white p-3 sm:p-4 rounded shadow">
        <div className="font-semibold mb-2">Profile</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={email} onChange={e=>setEmail(e.target.value)} className="border p-2 rounded flex-1" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" className="border p-2 rounded flex-1" />
          <button onClick={async()=>{ await api.settings.updateProfile({ email, password: password||undefined }); setPassword(''); refresh() }} className="px-3 py-2 rounded bg-blue-600 text-white whitespace-nowrap">Save</button>
        </div>
      </div>
      {/* Accounts section removed per requirements */}
      <div className="bg-white p-3 sm:p-4 rounded shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Categories</div>
          <button title="Add category" onClick={()=>setShowCatModal(true)} className="p-2 rounded bg-blue-600 text-white" aria-label="Add category">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z"/></svg>
          </button>
        </div>
        <div className="border rounded h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left border-b">
                <th className="p-2 w-1/2">Name</th>
                <th className="p-2 w-1/4">Type</th>
                <th className="p-2 w-1/4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c=> (
                <tr key={c.id} className="border-b">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">
                    <select value={c.type} onChange={async(e)=>{ await api.categories.update(c.id, { name: c.name, type: e.target.value }); refresh() }} className="border p-1 rounded">
                      <option>Expense</option>
                      <option>Income</option>
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    <button title="Delete" onClick={async()=>{ const ok = confirm('Delete this category?'); if(!ok) return; const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE', headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } }); if(res.status===409){ alert('Category in use by transactions'); return } refresh() }} className="p-2 text-sm bg-red-600 text-white rounded" aria-label="Delete Category">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 w-full max-w-sm space-y-2">
            <div className="font-semibold mb-2">Add Category</div>
            <input value={catForm.name} onChange={e=>setCatForm({...catForm, name:e.target.value})} placeholder="Name" className="w-full border p-2 rounded" />
            <select value={catForm.type} onChange={e=>setCatForm({...catForm, type:e.target.value})} className="w-full border p-2 rounded">
              <option>Expense</option>
              <option>Income</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=>setShowCatModal(false)} className="px-3 py-2 rounded">Cancel</button>
              <button onClick={async()=>{ if(!catForm.name) return; await api.categories.create(catForm); setCatForm({ name:'', type:'Expense' }); setShowCatModal(false); refresh() }} className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 w-full max-w-sm space-y-2">
            <div className="font-semibold mb-2">Add Asset Group</div>
            <input value={groupForm.name} onChange={e=>setGroupForm({...groupForm, name:e.target.value})} placeholder="Group name (e.g., Stock & ETF)" className="w-full border p-2 rounded" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=>setShowGroupModal(false)} className="px-3 py-2 rounded">Cancel</button>
              <button onClick={async()=>{ if(!groupForm.name) return; await fetch('/api/asset-groups', { method:'POST', headers:{ 'Content-Type':'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }, body: JSON.stringify({ name: groupForm.name }) }); setGroupForm({ name:'' }); setShowGroupModal(false); refresh() }} className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {showItemModalForGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 w-full max-w-sm space-y-2">
            <div className="font-semibold mb-2">Add Item</div>
            <input value={itemForm[showItemModalForGroup]?.name||''} onChange={e=>setItemForm({ ...itemForm, [showItemModalForGroup]: { ...(itemForm[showItemModalForGroup]||{}), name:e.target.value } })} placeholder="New item (e.g., Trade Republic)" className="w-full border p-2 rounded" />
            <input value={itemForm[showItemModalForGroup]?.description||''} onChange={e=>setItemForm({ ...itemForm, [showItemModalForGroup]: { ...(itemForm[showItemModalForGroup]||{}), description:e.target.value } })} placeholder="Description" className="w-full border p-2 rounded" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=>setShowItemModalForGroup(null)} className="px-3 py-2 rounded">Cancel</button>
              <button onClick={async()=>{ const it=itemForm[showItemModalForGroup!]; if(!it?.name) return; await fetch(`/api/asset-groups/${showItemModalForGroup}/items`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }, body: JSON.stringify(it) }); setItemForm({ ...itemForm, [showItemModalForGroup!]: { name:'', description:'' } }); setShowItemModalForGroup(null); refresh() }} className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold">Asset Groups</div>
          <button title="Add group" onClick={()=>setShowGroupModal(true)} className="p-2 rounded bg-blue-600 text-white" aria-label="Add group">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          {groups.map(g=> (
            <div key={g.id} className="border rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold">{g.name}</div>
                <div className="flex gap-2">
                  <button title="Add item" onClick={()=>setShowItemModalForGroup(g.id)} className="p-2 rounded bg-blue-600 text-white" aria-label="Add item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z"/></svg>
                  </button>
                  <button title="Delete group" onClick={async()=>{ const ok = confirm('Delete this group?'); if(!ok) return; await fetch(`/api/asset-groups/${g.id}`, { method:'DELETE', headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } }); refresh() }} className="p-2 rounded bg-red-600 text-white" aria-label="Delete group">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
                  </button>
                </div>
              </div>
              <div className="border rounded max-h-48 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">Item</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Depreciation (€/month)</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items && g.items.filter((it:any)=>!it.parentItemId).map((it:any)=>{
                      return (
                        <>
                          <tr key={it.id} className="border-b">
                            <td className="p-2">{it.name}</td>
                            <td className="p-2">{it.description}</td>
                            <td className="p-2">
                              {g.items.filter((ch:any)=>ch.parentItemId===it.id).length === 0 ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={depreciationValues[it.id] !== undefined ? depreciationValues[it.id] : (it.depreciationAmount || '')}
                                  onChange={(e) => {
                                    setDepreciationValues(prev => ({ ...prev, [it.id]: e.target.value }));
                                  }}
                                  onBlur={async () => {
                                    const value = depreciationValues[it.id] ? Number(depreciationValues[it.id]) : null;
                                    try {
                                      await fetch(`/api/asset-items/${it.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) },
                                        body: JSON.stringify({ depreciationAmount: value })
                                      });
                                      await refresh();
                                    } catch (error) {
                                      console.error('Error updating depreciation:', error);
                                    }
                                  }}
                                  className="w-20 px-2 py-1 text-sm border rounded"
                                  title="Monthly depreciation amount in euros"
                                />
                              ) : (
                                <span className="text-gray-400 text-sm">N/A (has children)</span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex gap-2 justify-end">
                                <button title="Add child item" onClick={()=>{ setShowItemModalForGroup(null); setItemForm({ ...itemForm, [it.id]: { name:'', description:'' } }); const name=prompt('Child item name?'); if(name){ fetch(`/api/asset-items/${it.id}/children`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }, body: JSON.stringify({ name }) }).then(()=>refresh()) } }} className="p-2 rounded bg-blue-600 text-white" aria-label="Add child">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z"/></svg>
                                </button>
                                <button title="Delete Item" onClick={async()=>{ const ok = confirm('Delete this item?'); if(!ok) return; await fetch(`/api/asset-items/${it.id}`, { method:'DELETE', headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } }); refresh() }} className="p-2 bg-red-600 text-white rounded" aria-label="Delete item">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {g.items.filter((ch:any)=>ch.parentItemId===it.id).map((ch:any)=>{
                            return (
                              <tr key={`child-${ch.id}`} className="border-b">
                                <td className="p-2 pl-8">↳ {ch.name}</td>
                                <td className="p-2">{ch.description}</td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={depreciationValues[ch.id] !== undefined ? depreciationValues[ch.id] : (ch.depreciationAmount || '')}
                                    onChange={(e) => {
                                      setDepreciationValues(prev => ({ ...prev, [ch.id]: e.target.value }));
                                    }}
                                    onBlur={async () => {
                                      const value = depreciationValues[ch.id] ? Number(depreciationValues[ch.id]) : null;
                                      try {
                                        await fetch(`/api/asset-items/${ch.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) },
                                          body: JSON.stringify({ depreciationAmount: value })
                                        });
                                        await refresh();
                                      } catch (error) {
                                        console.error('Error updating depreciation:', error);
                                      }
                                    }}
                                    className="w-20 px-2 py-1 text-sm border rounded"
                                    title="Monthly depreciation amount in euros"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <button title="Delete Item" onClick={async()=>{ const ok = confirm('Delete this item?'); if(!ok) return; await fetch(`/api/asset-items/${ch.id}`, { method:'DELETE', headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } }); refresh() }} className="p-2 bg-red-600 text-white rounded" aria-label="Delete item">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Valuation inputs removed. Values will be managed from Assets page. */}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


