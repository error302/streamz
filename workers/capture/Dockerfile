FROM node:20-slim

# Install yt-dlp and FFmpeg for stream capture
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && pip3 install --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY workers/capture/package.json ./workers/capture/

# Install dependencies (workspace-aware)
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY workers/capture/ ./workers/capture/

WORKDIR /app/workers/capture

# Build and run
RUN npm run build
CMD ["node", "dist/index.js"]
