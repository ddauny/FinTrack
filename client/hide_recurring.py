import re

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'r') as f:
    content = f.read()

# Hide Recurring if isSplit
content = content.replace(
    '<label className="flex items-center space-x-3 group relative cursor-pointer p-0.5">',
    '{!isSplit && (\n                    <label className="flex items-center space-x-3 group relative cursor-pointer p-0.5">'
)

content = content.replace(
    "{form.frequency === 'YEARLY' && 'Yearly'}\n                            </span>\n                          </div>",
    "{form.frequency === 'YEARLY' && 'Yearly'}\n                            </span>\n                          </div>"
) # Find end of Recurring block

content = re.sub(
    r'(<label className="flex items-center space-x-3 group relative cursor-pointer p-0.5">[\s\S]*?\{form\.isRecurring && \([\s\S]*?</div>\n                    \)\}\n                  </div>)',
    r'{!isSplit && (\n                  \1\n                  )}',
    content
)

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'w') as f:
    f.write(content)

