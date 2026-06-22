#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

# Seed only when the database is still empty, so restarts keep your data.
ORG_COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.organization.count().then(c=>{console.log(c);return p.\$disconnect()}).catch(()=>{console.log(0)})" 2>/dev/null || echo 0)
if [ "$ORG_COUNT" = "0" ]; then
  echo "Empty database -> seeding demo data..."
  npm run db:seed
else
  echo "Database already has data -> skipping seed."
fi

echo "Starting PR-Agent on http://localhost:3000"
exec npm run start
