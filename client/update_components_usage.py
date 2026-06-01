import re

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'r') as f:
    content = f.read()

# Replace Split ComboBox with the new `<CategorySelectorProps>`

old_split_combo = """                                  {/* Custom Combobox for Splits */}
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

new_split_combo = """                                  <CategorySelectorProps 
                                      value={split.categoryId || ''} 
                                      onChange={(val: any) => { const ns = [...form.splits]; ns[idx].categoryId = Number(val) || ''; setForm({...form, splits: ns}); }} 
                                      placeholder="Search category..." 
                                      idPrefix={`split-${idx}`} 
                                  />"""

content = content.replace(old_split_combo, new_split_combo)


# Replace Main Category selector block
old_main_combo = """                {form.categoryId && categoryMap.current[form.categoryId] ? (
                  <div 
                    onClick={() => {
                      setCategoryQuery('')
               setIsSplit(false);
                      setForm({...form, categoryId: ''});
                      // Focus the input in a little bit
                      setTimeout(() => document.getElementById('category-search-input')?.focus(), 0);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl cursor-pointer border-2 transition-all ${
                        categoryMap.current[form.categoryId].type === 'Income' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50'
                        : categoryMap.current[form.categoryId].type === 'Transfer'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50'
                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        categoryMap.current[form.categoryId].type === 'Income' ? 'bg-emerald-500' :
                        categoryMap.current[form.categoryId].type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'
                      }`}></div>
                      <span className={`font-bold ${
                        categoryMap.current[form.categoryId].type === 'Income' ? 'text-emerald-700 dark:text-emerald-400' :
                        categoryMap.current[form.categoryId].type === 'Transfer' ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {categoryMap.current[form.categoryId].name}
                      </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-stone-300">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-stone-300">
                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="category-search-input"
                      placeholder="Search category..."
                      value={categoryQuery}
                      onChange={handleCategoryChange}
                      onKeyDown={handleCategoryKeyDown}
                      onBlur={() => setTimeout(() => { setShowCategorySuggestions(false); setShowCategoryList(false); }, 200)}
                      onFocus={() => { setShowCategoryList(true); }}
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-base font-medium text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      autoComplete="off"
                    />
                    
                    {(showCategoryList || (categoryQuery.length > 0 && categorySuggestions.length > 0)) && !form.categoryId && (
                      <div className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto hide-scrollbar border border-stone-100 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-xl">
                        {(() => {
                            const groups = groupedCategories()
                            const types = ['Expense', 'Income', 'Transfer']
                            let renderedAny = false
                            
                            // Flattened list purely for index tracking if needed
                            let traverseIndex = -1;

                            const content = types.map(type => {
                                const group = groups[type];
                                if (!group || group.length === 0) return null;
                                renderedAny = true
                                return (
                                  <div key={type}>
                                    <div className="px-4 py-2 text-[10px] font-bold text-stone-300 dark:text-stone-500 bg-stone-50 dark:bg-stone-800 uppercase tracking-wider sticky top-0 z-10 border-b border-stone-100 dark:border-stone-800">
                                      {type}
                                    </div>
                                    {group.map((c: any) => {
                                      traverseIndex++;
                                      const isSelected = traverseIndex === selectedCategoryIndex;
                                      return (
                                        <div
                                          key={c.id}
                                          ref={(el) => {
                                            if (isSelected && el) {
                                                el.scrollIntoView({ block: 'nearest' });
                                            }
                                          }}
                                          onClick={()=>{setForm({...form, categoryId: c.id}); setCategoryQuery(c.name)}}
                                          className={`px-4 py-3 cursor-pointer border-b border-stone-50 dark:border-stone-800 last:border-0 flex items-center gap-3 transition-colors ${
                                            isSelected ? 'bg-stone-100 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                          }`}
                                        >
                                          <div className={`w-1.5 h-1.5 rounded-full ${
                                            c.type==='Income' ? 'bg-emerald-500' :
                                            c.type==='Transfer' ? 'bg-blue-500' : 'bg-rose-500'
                                          }`}></div>
                                          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{c.name}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                            })
                            
                            if (!renderedAny && categoryQuery.length > 0) {
                                return <div className="p-4 text-center text-stone-500 text-sm">No categories found</div>
                            }
                            return content
                        })()}
                      </div>
                    )}
                  </div>
                )}"""

new_main_combo = """                <CategorySelectorProps 
                    value={form.categoryId || ''} 
                    onChange={(val: any) => { setForm({...form, categoryId: Number(val) || ''}); }} 
                    placeholder="Search category..." 
                    idPrefix="main-category" 
                />"""

content = content.replace(old_main_combo, new_main_combo)

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'w') as f:
    f.write(content)

