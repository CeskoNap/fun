FROM node:20-slim

# Install pnpm and required build tools for native modules
# Also install tzdata for timezone support
RUN npm install -g pnpm && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    openssl \
    ca-certificates \
    tzdata && \
    rm -rf /var/lib/apt/lists/*

# Set timezone to Italian timezone
ENV TZ=Europe/Rome
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Set working directory
WORKDIR /app

# Copy workspace configuration and package files
COPY pnpm-workspace.yaml ./
COPY .npmrc* ./
COPY .pnpmrc* ./
COPY package.json ./
COPY backend/package.json ./backend/

# Install dependencies with build scripts enabled
# In dev mode, volumes will override this, but we need base deps for build
# Note: Prisma generate will run when container starts (via docker-compose command)
ENV PNPM_DANGEROUSLY_ALLOW_ALL_BUILDS=true
RUN pnpm install --no-frozen-lockfile

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3001

# Default command (will be overridden by docker-compose)
CMD ["pnpm", "start:dev"]
