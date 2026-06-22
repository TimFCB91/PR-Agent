# Simple single-image build for the PR-Agent app (development/demo use).
FROM node:22-bookworm-slim

# OpenSSL is needed by Prisma.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (keep devDependencies — we need prisma CLI + tsx at runtime
# for migrations and seeding).
COPY package*.json ./
RUN npm install

# Copy the rest of the source and build.
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Entrypoint applies migrations, seeds once, then starts the server.
RUN chmod +x ./docker-entrypoint.sh
CMD ["./docker-entrypoint.sh"]
