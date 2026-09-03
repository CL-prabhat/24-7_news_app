FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Node.js 20 + build tools (better-sqlite3 compiles a native SQLite binding on install)
RUN apt-get update && \
    apt-get install -y curl python3 make g++ ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY db ./db
COPY scripts ./scripts

CMD ["node", "scripts/fetch-and-summarize.js"]
