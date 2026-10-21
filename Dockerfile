FROM node:20-alpine

WORKDIR /app

# Dependências primeiro (aproveita cache do Docker)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Código da aplicação
COPY --chown=node:node . .

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
