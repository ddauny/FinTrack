#!/bin/bash
cat /mnt/ssd/Fintrack/server/src/routes/transactions.ts | sed 's/return res.status(400).json({ error: "Invalid payload" });/console.error(parse.error); return res.status(400).json({ error: "Invalid payload", details: parse.error });/' > tmp.ts
mv tmp.ts /mnt/ssd/Fintrack/server/src/routes/transactions.ts
