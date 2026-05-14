FROM node:^22.0.0-alpine

# Install ssh-client & git
RUN apk add openssh-client git

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Scan github ssh key
RUN mkdir -p -m 0700 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts

# Copy repo in /app
WORKDIR /app
COPY . .

# Install & build
RUN --mount=type=ssh pnpm install
RUN pnpm build

# Clean pnpm store
RUN pnpm store prune

ENTRYPOINT ["pnpm", "start"]
