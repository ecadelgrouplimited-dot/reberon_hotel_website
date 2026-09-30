# The website (APP=web) or the House (APP=admin), as a standalone Next.js server.
# NEXT_PUBLIC_* values are baked in at build time; the website also pre-renders
# from the API, so build it while the API is running (deploy.sh does this).
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS build
ARG APP
ARG API_URL
ARG WEB_URL
ARG ADMIN_URL
ARG MEDIA_PUBLIC_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL
ARG SITE_ENV=production
ENV API_URL=$API_URL WEB_URL=$WEB_URL ADMIN_URL=$ADMIN_URL MEDIA_PUBLIC_URL=$MEDIA_PUBLIC_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL SITE_ENV=$SITE_ENV
COPY . .
RUN pnpm install --frozen-lockfile --filter "@reberon/${APP}..."
RUN pnpm --filter "@reberon/${APP}..." run build
RUN mkdir -p apps/${APP}/public

FROM node:24-bookworm-slim AS runtime
ARG APP
ENV NODE_ENV=production HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1 APP=${APP}
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/${APP}/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=node:node /app/apps/${APP}/public ./apps/${APP}/public
USER node
CMD ["sh", "-c", "node apps/${APP}/server.js"]
