# Backend Dockerfile
FROM node:18-alpine

# Install required dependencies for Prisma
RUN apk add --no-cache \
    openssl \
    libc6-compat

WORKDIR /app

# Copy root package.json for workspace setup
COPY package.json ./
COPY package-lock.json* ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install all dependencies using npm (workspace aware)
RUN npm install

# Copy backend source code
COPY backend ./backend

WORKDIR /app/backend

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Start in development mode with watch
CMD ["sh", "-c", "npx prisma migrate deploy && (npm run start:dev || /app/node_modules/.bin/nest start --watch)"]

