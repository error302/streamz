FROM node:20-slim

WORKDIR /app

# Copy workspace files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY workers/optimizer/package.json ./workers/optimizer/

# Install dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY workers/optimizer/ ./workers/optimizer/

WORKDIR /app/workers/optimizer

RUN npm run build
CMD ["node", "dist/index.js"]
