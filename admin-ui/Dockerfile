# --- Base Stage ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Development Stage ---
FROM base AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# --- Build Stage (for Production) ---
FROM base AS build
COPY . .
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
