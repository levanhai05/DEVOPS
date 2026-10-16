# Dùng node:sqlite có sẵn trong Node 22, không cần build native
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000 DB_PATH=/data/hai.db UPLOAD_DIR=/data/uploads
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["npm", "start"]
