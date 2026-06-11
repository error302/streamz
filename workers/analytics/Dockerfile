FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json ./
COPY ../../packages/shared/package.json /app/packages/shared/package.json
COPY ../../packages/db/package.json /app/packages/db/package.json
COPY ../../packages/storage/package.json /app/packages/storage/package.json

# Copy source
COPY . .

# Install
RUN npm install --production

CMD ["node", "dist/index.js"]
