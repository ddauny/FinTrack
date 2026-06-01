import re

files = [
    '/mnt/ssd/Fintrack/client/src/pages/TransactionsPage.tsx',
    '/mnt/ssd/Fintrack/client/src/pages/DashboardPage.tsx'
]

for file in files:
    try:
        with open(file, 'r') as f:
            content = f.read()

        # Fix invalid payload issue: `categoryId` must be undefined if not set. Zod fails if it's 0 or "" because it has `.optional()`.
        old_payload_part = "categoryId: formData.categoryId,"
        new_payload_part = "categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,"
        content = content.replace(old_payload_part, new_payload_part)
        
        with open(file, 'w') as f:
            f.write(content)
        print(f"Fixed {file}")
    except Exception as e:
        print(f"Failed {file}: {e}")

