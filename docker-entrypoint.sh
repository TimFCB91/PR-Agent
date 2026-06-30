#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

# Demo data is only seeded when SEED_DEMO=true (local/dev). In production the
# app starts empty and you register your real organisation at /register — so no
# weak demo logins exist on a public URL.
if [ "$SEED_DEMO" = "true" ]; then
  ORG_COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.organization.count().then(c=>{console.log(c);return p.\$disconnect()}).catch(()=>{console.log(0)})" 2>/dev/null || echo 0)
  if [ "$ORG_COUNT" = "0" ]; then
    echo "Empty database + SEED_DEMO=true -> seeding demo data..."
    npm run db:seed
  else
    echo "Database already has data -> skipping seed."
  fi
else
  echo "SEED_DEMO not set -> starting WITHOUT demo data. Register your org at /register."
fi

echo "Starting PR-Agent..."
exec npm run start
