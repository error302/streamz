FROM node:20-slim

# Install FFmpeg for clip extraction and audio analysis
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY workers/highlight/package.json ./workers/highlight/

# Install dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY workers/highlight/ ./workers/highlight/

WORKDIR /app/workers/highlight

RUN npm run build
CMD ["node", "dist/index.js"]
