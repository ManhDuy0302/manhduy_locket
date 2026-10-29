# Locket keeps its SQLite database and uploaded photos on disk, so any host
# using this image needs a persistent volume mounted at /data.
FROM node:24-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=3000 \
    LOCKET_DATA_DIR=/data

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /data

EXPOSE 3000

CMD ["npm", "run", "start"]
