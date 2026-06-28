FROM node:26-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

ENV NODE_ENV=production
ENV TYRAVEL_HOST=0.0.0.0
ENV TYRAVEL_PORT=3000

RUN npx tyravel route:cache && npx tyravel view:cache

EXPOSE 3000

CMD ["./deploy/docker-entrypoint.sh"]
