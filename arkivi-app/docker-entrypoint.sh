#!/bin/sh
set -e

echo "=========================================================="
echo "🚀 Arkivi Përkujtimor Dritan Berisha — Docker Boot"
echo "=========================================================="

# 1. Siguro dosjet e persistencës
mkdir -p /app/data /app/public/uploads /app/backups

# 2. Ekzekuto seeding-un automatik (krijon cms-data.json, bazën arkivi.db dhe superuserin nëse nuk ekzistojnë)
echo "🔍 Duke inicializuar të dhënat fillestare dhe llogarinë superadmin..."
npx tsx src/seed/runSeed.ts || echo "⚠️ Paralajmërim gjatë inicializimit të seed-it (vazhdon nisja normale)."

echo "✅ Inicializimi përfundoi. Shërbyesi po fillon..."
echo "=========================================================="

# 3. Nis procesin kryesor
exec "$@"
