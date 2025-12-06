# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy root package.json for workspace setup
COPY package.json ./
COPY package-lock.json* ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install all dependencies using npm (workspace aware)
RUN npm install

# Copy frontend source code
COPY frontend ./frontend

WORKDIR /app/frontend

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "dev"]

