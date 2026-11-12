# Deporturnos — app móvil

App para consultar canchas deportivas, ver su grilla horaria, reservar, registrar
ingresos con QR y gestionar favoritos, bloqueos y reservas fijas.

Backend (NestJS): `api-reservas-deportivas/`.

## Requisitos

- Node.js 24 y npm.
- Expo Go instalado en el celular (Android o iOS).
- Docker Desktop (para la API) y PC + celular en la **misma red WiFi**.

## Levantar el proyecto

### 1. API

```bash
cd api-reservas-deportivas
docker compose up
```

- API: <http://localhost:3000> · Salud: <http://localhost:3000/salud>

### 2. App

```bash
cd reservas-deportivas
npm install
cp .env.example .env    # con Expo Go: dejar EXPO_PUBLIC_API_URL VACÍA
npx expo start
```

- Escanear el QR de Expo CLI con Expo Go.
- Con Expo Go no se fija `localhost`: la app usa la IP de la PC del host de Metro.
- Desde el celular: `http://<IP-de-la-PC>:3000/salud`.

### Verificar

```bash
curl http://localhost:3000/salud
```

## Usuarios demo

| Email | Rol | Uso |
|---|---|---|
| `emiliano@mail.com` | jugador | Cuenta del PRD con cancelación tardía |
| `lleno@demo.ar` | jugador | Tres reservas activas: la cuarta da el límite |
| `nuevo@demo.ar` | jugador | Cuenta sin nada |
| `marcelo@villaguay.demo.ar` | encargado | Agenda, ingresos, bloqueos |
| `nahuel@villaguay.demo.ar` | administrador | Fijas, precios, todo |

Contraseña demo: `villaguay2026`.

## Validaciones

```bash
npm run typecheck   # TypeScript strict
npm test            # suite de tests
```

## Notas

- Expo Go no soporta push remota (SDK 53+); los recordatorios locales sí funcionan.
- Para push remoto o APK: `eas build` con los perfiles de `eas.json`.
