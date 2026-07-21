FROM node:22-alpine

WORKDIR /app

# Poora project copy hoga: frontend + backend
COPY . .

WORKDIR /app/backend

RUN npm ci

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]