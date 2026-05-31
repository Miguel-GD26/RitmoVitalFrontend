# RitmoVital — Frontend

Interfaz web para clasificación de arritmias cardíacas en señales ECG, desarrollada como proyecto de tesis de Ingeniería de Sistemas.

**Universidad:** Universidad Señor de Sipán (USS)  
**Autores:** Percy Gálvez · Miguel García

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework | Angular 20.3 (Zoneless) |
| Lenguaje | TypeScript 5.9 |
| Estilos | Tailwind CSS 3.4 + Angular CDK 20 |
| Alertas | SweetAlert2 11 |
| Servidor | nginx:alpine (producción) |
| Deploy | Railway — Docker multi-stage |

---

## Requisitos previos

| Herramienta | Versión |
|---|---|
| Node.js | 24.x |
| npm | 10.x |
| Angular CLI | 20.3.x |

---

## Configuración local

### 1. Instalar dependencias

```bash
cd frontend/ondavital-ui
npm install
```

### 2. Iniciar servidor de desarrollo

```bash
ng serve
# → http://localhost:4200
```

El backend Django debe estar corriendo en `http://localhost:8000`.

---

## Environments

| Archivo | Entorno | `apiBaseUrl` |
|---|---|---|
| `src/environments/environment.ts` | Desarrollo | `http://localhost:8000` |
| `src/environments/environment.prod.ts` | Producción | `''` (proxy nginx) |

En producción, `apiBaseUrl` es vacío porque nginx redirige internamente `/api/*` al backend de Railway, evitando restricciones de cookies cross-site en dispositivos móviles.

---

## Estructura del proyecto

```
src/app/
├── core/
│   ├── services/
│   │   ├── auth/           ← AuthService (login, 2FA, Google OAuth, sesión)
│   │   └── alert/          ← AlertService (SweetAlert2)
│   ├── interceptors/
│   │   ├── credentials.interceptor.ts   ← withCredentials en todas las requests
│   │   ├── auth-refresh.interceptor.ts  ← Reintento automático con refresh token
│   │   └── error.interceptor.ts
│   ├── guards/             ← Protección de rutas
│   └── models/             ← Interfaces TypeScript
├── features/
│   ├── auth/
│   │   └── login/          ← Pantalla de login + 2FA
│   ├── dashboard/          ← Panel principal
│   ├── pacientes/          ← Gestión de pacientes
│   └── clasificador/       ← Análisis ECG
└── shared/                 ← Componentes reutilizables
```

---

## Scripts disponibles

```bash
# Servidor de desarrollo
ng serve

# Build de producción
ng build

# Tests unitarios
ng test

# Build en modo watch
npm run watch
```

---

## Docker

El `Dockerfile` usa build multi-stage:

1. **Stage 1** — `node:24-alpine`: compila la aplicación Angular
2. **Stage 2** — `nginx:alpine`: sirve los archivos estáticos y proxea `/api/` al backend

```bash
# Build
docker build -t ritmovital-frontend .

# Correr
docker run -p 8080:8080 ritmovital-frontend
```

---

## Autenticación

El sistema usa **JWT almacenado en cookies HttpOnly** (no localStorage), lo que protege contra ataques XSS.

Flujo de login:
1. Usuario ingresa credenciales → `POST /api/v1/auth/login/`
2. Backend responde con cookies `access_token` y `refresh_token`
3. Si el usuario tiene 2FA activo, se solicita el código TOTP
4. El interceptor `auth-refresh` renueva automáticamente el token de acceso cuando expira
