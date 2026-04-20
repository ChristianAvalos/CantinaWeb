# Etapa de build
FROM node:20-alpine as build

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

# Etapa final: usar "serve" para servir el contenido estático de Vite
FROM node:20-alpine

WORKDIR /app

# Instalar "serve" globalmente
RUN npm install -g serve

# Copiar el resultado del build
COPY --from=build /app/dist .

# Exponer el puerto 3000 (o el que quieras)
EXPOSE 3000

# Comando para servir
CMD ["serve", "-s", ".", "-l", "3000"]
