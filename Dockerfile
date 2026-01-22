# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN bun build index.ts --outdir dist --target bun

# Production stage
FROM oven/bun:1-slim AS production

WORKDIR /app

# Copy built files and static assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/index.html ./index.html
COPY --from=builder /app/login.html ./login.html
COPY --from=builder /app/index.html ./dist/index.html
COPY --from=builder /app/login.html ./dist/login.html

# Copy environment file into the image
COPY .env .env

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "--env-file=.env", "dist/index.js"]
