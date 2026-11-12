# Deporturnos — app móvil

App para consultar canchas, ver su grilla horaria, reservar, registrar ingresos con QR y
gestionar favoritos, bloqueos y reservas fijas. Backend (NestJS): `api-reservas-deportivas/`.

## Requisitos

Node.js 24 · npm · Docker Desktop · Expo Go en el celular · misma red WiFi.

## Instalación

```bash
# API
cd api-reservas-deportivas
docker compose up

# App (otra terminal)
cd reservas-deportivas
npm install
cp .env.example .env     # con Expo Go: dejá EXPO_PUBLIC_API_URL vacía
npx expo start
```

Escaneá el QR con Expo Go. API: <http://localhost:3000> · Salud: <http://localhost:3000/salud>

## Verificar

```bash
curl http://localhost:3000/salud
```

## Si no conecta

- Firewall de Windows: permitir `node.exe` (Metro/Expo) y **Docker Desktop**
  (`com.docker.backend.exe`), que expone la API en el puerto 3000.
- Celular y PC en la misma red; desde el teléfono no sirve `localhost`.

## Usuarios demo — contraseña `villaguay2026`

| Email | Rol |
|---|---|
| `emiliano@mail.com` | jugador (con cancelación tardía) |
| `lleno@demo.ar` | jugador (3 reservas activas) |
| `nuevo@demo.ar` | jugador (cuenta vacía) |
| `marcelo@villaguay.demo.ar` | encargado |
| `nahuel@villaguay.demo.ar` | administrador |

## Scripts

```bash
npm run typecheck
npm test
```

Expo Go no soporta push remota (SDK 53+); los recordatorios locales sí.
