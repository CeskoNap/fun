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

# Build the NestJS application
RUN npm run build

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Start server using compiled dist
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
