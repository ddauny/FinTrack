import re

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'r') as f:
    content = f.read()

# 1. Wrap Notes and Category
content = content.replace('{/* Notes Input */}', '{!isSplit && (\n              <>\n              {/* Notes Input */}')
content = content.replace('              </div>\n\n              {/* Tags Input */}', '              </div>\n              </>\n              )}\n\n              {/* Tags Input */}')

# 2. Fix Validation Logic
old_validation = """        if (isSplit) {
            const validSplits = form.splits.filter((s: any) => s.categoryId && s.amount);
            if (validSplits.length === 0) { showToast('Please add at least one split.', 'warning'); return; }
            if (!form.amount) { showToast('Please enter total amount.', 'warning'); return; }
            const totalSplits = validSplits.reduce((acc: number, s: any) => acc + Number(s.amount), 0);
            if (Math.abs(totalSplits - Number(form.amount)) > 0.01) {
                showToast(`Splits total (${totalSplits}) must equal main amount (${form.amount}).`, 'warning'); return;
            }
            await onSave({...form, splits: validSplits})
        }"""

new_validation = """        if (isSplit) {
            if (!form.splits || form.splits.length === 0) {
                showToast('Please add at least one split.', 'warning'); return;
            }
            for (let i = 0; i < form.splits.length; i++) {
                const s = form.splits[i];
                if (!s.categoryId) { showToast('Please select a category for all splits.', 'warning'); return; }
                if (!s.amount || Number(s.amount) <= 0) { showToast('Please enter a valid amount for all splits.', 'warning'); return; }
            }
            if (!form.amount) { showToast('Please enter total amount.', 'warning'); return; }
            const totalSplits = form.splits.reduce((acc: number, s: any) => acc + Number(s.amount), 0);
            if (Math.abs(totalSplits - Number(form.amount)) > 0.01) {
                showToast(`Splits total (${totalSplits}) must equal main amount (${form.amount}).`, 'warning'); return;
            }
            await onSave({...form, splits: form.splits})
        }"""

content = content.replace(old_validation, new_validation)

with open('/mnt/ssd/Fintrack/client/src/components/TransactionModal.tsx', 'w') as f:
    f.write(content)

