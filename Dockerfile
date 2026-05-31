### STAGE 1: Build ###
FROM node:24-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

### STAGE 2: Serve ###
FROM nginx:alpine

COPY --from=build /usr/src/app/dist/ondavital-ui/browser/ /usr/share/nginx/html/

RUN printf '%s\n' \
    'server {' \
    '    listen 8080;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '    location /api/ {' \
    '        proxy_pass https://ritmo-vital.up.railway.app/api/;' \
    '        proxy_http_version 1.1;' \
    '        proxy_set_header Host ritmo-vital.up.railway.app;' \
    '        proxy_set_header X-Real-IP $remote_addr;' \
    '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
    '        proxy_set_header X-Forwarded-Proto https;' \
    '        proxy_ssl_server_name on;' \
    '        proxy_read_timeout 300s;' \
    '        proxy_connect_timeout 30s;' \
    '        proxy_send_timeout 300s;' \
    '    }' \
    '    location / { try_files $uri $uri/ /index.html; }' \
    '    gzip on;' \
    '    gzip_types text/plain text/css application/json application/javascript text/javascript;' \
    '}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
