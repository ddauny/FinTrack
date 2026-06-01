import re

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'r') as f:
    content = f.read()

# I want to inject an elegant custom combobox for the split instead of HTML select tag.
new_split_combo_ui = """                              <div className="flex-1 space-y-2">
                                  {/* Custom Combobox for Splits */}
                                  <div className="relative group">
                                      {split.categoryId && categoryMap.current[split.categoryId] ? (
                                          <div 
                                            onClick={() => {
                                              const ns = [...form.splits]; ns[idx].categoryId = ''; setForm({...form, splits: ns});
                                            }}
                                            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 transition-all"
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${categoryMap.current[split.categoryId].type === 'Income' ? 'bg-emerald-500' : categoryMap.current[split.categoryId].type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                                              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                                                {categoryMap.current[split.categoryId].name}
                                              </span>
                                            </div>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
                                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                            </svg>
                                          </div>
                                      ) : (
                                          <div className="relative">
                                              <select 
                                                  value=""
                                                  onChange={(e) => {
                                                      const ns = [...form.splits]; ns[idx].categoryId = Number(e.target.value); setForm({...form, splits: ns});
                                                  }}
                                                  className="w-full text-sm px-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                              >
                                                  <option value="" disabled hidden>Search / Select Category...</option>
                                                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                              </select>
                                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-500">
                                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                                  </svg>
                                              </div>
                                          </div>
                                      )}
                                  </div>"""

old_split_combo_ui = """                              <div className="flex-1 space-y-2">
                                  <select 
                                      value={split.categoryId || ''} 
                                      onChange={(e) => {
                                          const ns = [...form.splits]; ns[idx].categoryId = Number(e.target.value); setForm({...form, splits: ns});
                                      }}
                                      className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white outline-none"
                                  >
                                      <option value="">Select Category...</option>
                                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>"""

content = content.replace(old_split_combo_ui, new_split_combo_ui)

# Update disabled Submit logic in TransactionModal
content = content.replace(
    "disabled={!form.categoryId || !form.amount}",
    "disabled={isSplit ? (!form.splits?.length || !form.amount) : (!form.categoryId || !form.amount)}"
)

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'w') as f:
    f.write(content)

