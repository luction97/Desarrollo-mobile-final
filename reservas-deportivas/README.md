# Deporturnos — app móvil

App para consultar canchas, ver su grilla horaria, reservar, registrar ingresos con QR y
gestionar favoritos, bloqueos y reservas fijas. Backend (NestJS): `api-reservas-deportivas/`.

## Requisitos y arranque

Necesitás Node.js 24, npm, Docker Desktop instalado y abierto, y un cliente Expo compatible con
SDK 54. La API y la app se levantan en **dos terminales**, en este orden. Abrí ambas en la raíz del
monorepo:

1. **API** — en la primera terminal:

   ```powershell
   cd api-reservas-deportivas
   docker compose up
   ```

   Esperá a que inicie y comprobá <http://localhost:3000/salud>. Dejá la terminal abierta.

2. **App** — en una segunda terminal, también desde la raíz del monorepo:

   ```powershell
   cd reservas-deportivas
   npm ci
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   npm start
   ```

   Escaneá el QR con Expo Go. `npm ci` respeta `package-lock.json`. Para la guía principal,
   resolución de la URL de la API y pasos de verificación, consultá el
   [README raíz](../README.md#levantar-el-proyecto).

API: <http://localhost:3000> · Salud: <http://localhost:3000/salud>

## Verificar

```bash
curl http://localhost:3000/salud
```

## Si no conecta

- Firewall de Windows: permitir `node.exe` (Metro/Expo) y **Docker Desktop**
  (`com.docker.backend.exe`), que expone la API en el puerto 3000.
- Celular y PC en la misma red; desde el teléfono no sirve `localhost`.
- La app usa el puerto 3000 por omisión. Si está ocupado, en PowerShell, desde
  `api-reservas-deportivas`, ejecutá `$env:PUERTO = "3001"` y luego `docker compose up`. En
  `reservas-deportivas/.env`, fijá `EXPO_PUBLIC_API_URL=http://<IP-de-la-PC>:3001` y reiniciá Metro.

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
