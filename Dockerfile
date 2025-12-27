# Development Dockerfile for SvelteKit
FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Expose dev server port
EXPOSE 5173

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev", "--", "--host"]
