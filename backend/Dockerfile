# ==========================================
# STAGE 1: Builder Stage (Dependencies Installation)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Layer Caching: Pehle sirf package files copy karo
COPY package*.json ./

# Deterministic Clean Install (Production Only)
RUN npm ci --only=production

# ==========================================
# STAGE 2: Runner Stage (Minimal Production Runtime)
# ==========================================
FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /usr/src/app

# Security: Set directory ownership for non-root 'node' user (UID 1000)
RUN chown -R node:node /usr/src/app

# Builder stage se sirf tayyar shuda node_modules uthana
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules

# Application source code copy karna
COPY --chown=node:node . .

# Root privileges chhor kar standard user banna
USER node

# Documentation of listening port
EXPOSE 5000

# Exec Form: Linux Kernel Signal Friendly Execution
CMD ["node", "server.js"]
