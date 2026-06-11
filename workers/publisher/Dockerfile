FROM node:20-slim

WORKDIR /app

# Copy workspace files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY workers/publisher/package.json ./workers/publisher/

# Install dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY workers/publisher/ ./workers/publisher/

WORKDIR /app/workers/publisher

RUN npm run build
CMD ["node", "dist/index.js"]
