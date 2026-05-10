# =============================================================================
# Multi-stage Dockerfile for Next.js Production Build
# =============================================================================
# This Dockerfile uses a three-stage build to produce a minimal production
# image. Each stage has a single responsibility:
#   1. deps    — Install production dependencies only (npm ci)
#   2. builder — Build the Next.js application (next build with standalone output)
#   3. runner  — Run the compiled application in a minimal Alpine image
#
# The standalone output mode bundles only the files needed at runtime,
# resulting in a much smaller final image (~100MB vs ~1GB).
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: deps — Install production dependencies
# ---------------------------------------------------------------------------
# We use a dedicated stage for dependency installation so that Docker can
# cache this layer. Dependencies only re-install when package*.json changes.
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only the files needed for dependency resolution.
# This maximizes Docker layer caching — source code changes won't bust this cache.
COPY package.json package-lock.json* ./

# npm ci installs exact versions from the lockfile, ensuring reproducible builds.
# --omit=dev excludes devDependencies since they aren't needed in production.
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# Stage 2: builder — Build the Next.js application
# ---------------------------------------------------------------------------
# This stage installs ALL dependencies (including devDependencies like TypeScript)
# because they are needed for the build step, then runs `next build`.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all dependencies (including devDependencies for the build process)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the Next.js application.
# next.config.ts must have `output: 'standalone'` for this to produce
# a self-contained build in .next/standalone.
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runner — Minimal production image
# ---------------------------------------------------------------------------
# The final image contains only the standalone build output and production
# dependencies. No source code, no devDependencies, no build tools.
FROM node:20-alpine AS runner

WORKDIR /app

# Run as non-root for security best practice
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy the standalone build output from the builder stage.
# The standalone directory contains a minimal Node.js server and all
# required dependencies bundled together.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Start the standalone Next.js server
CMD ["node", "server.js"]
