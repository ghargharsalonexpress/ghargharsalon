# API image (plan C16). Build from the repository root, because the shared package lives outside apps/api:
#   docker build -f apps/api/Dockerfile -t brand-api .

FROM node:22-alpine AS build
WORKDIR /repo
# Tests download MongoDB on install; the image never needs it.
ENV MONGOMS_DISABLE_POSTINSTALL=1

COPY packages/shared/package.json packages/shared/package-lock.json packages/shared/
RUN cd packages/shared && npm ci --omit=dev

COPY apps/api/package.json apps/api/package-lock.json apps/api/
RUN cd apps/api && npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN cd apps/api && npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD wget -qO- http://127.0.0.1:4000/health/live || exit 1
CMD ["node", "--enable-source-maps", "dist/index.js"]
