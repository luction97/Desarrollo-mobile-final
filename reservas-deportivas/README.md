# Deporturnos — app móvil

App para consultar canchas deportivas, ver su grilla horaria, reservar, registrar
ingresos con QR y gestionar favoritos, bloqueos y reservas fijas.

Backend (NestJS): `api-reservas-deportivas/`. Contrato: `docs/` del repo raíz.

## Requisitos

- Node.js 24 (LTS) y npm.
- Expo Go instalado en el celular (Android o iOS).
- Backend corriendo (Docker o local; ver más abajo).
- PC y celular en la **misma red WiFi** (o el celular en el hotspot de la PC).

## 1. Levantar la API

### Con Docker (recomendado)

```bash
cd api-reservas-deportivas
docker compose up
```

- API: <http://localhost:3000>
- Salud: <http://localhost:3000/salud>
- `docker compose down` para apagar. `docker compose down -v` + `up` para resetear datos.

### Sin Docker (SQLite)

```bash
cd api-reservas-deportivas
corepack enable        # o: npm i -g pnpm@10
pnpm install
pnpm db:reiniciar      # crea la base y carga los datos de demo
pnpm dev                # API en el puerto 3000
```

## 2. Levantar la app

```bash
cd reservas-deportivas
npm install
cp .env.example .env    # con Expo Go: dejar EXPO_PUBLIC_API_URL VACÍA
npx expo start
```

- Escaneá el QR que muestra Expo CLI con la app **Expo Go**.
- Con Expo Go no se fija `localhost`: la app toma la IP de la PC desde el host de
  Metro (`src/services/api.ts`). Si cambió de red, se recalcula solo.

### Verificar la conexión

- Desde el celular (misma red): `http://<IP-de-la-PC>:3000/salud` → debe responder
  `{"datos":{"estado":"ok",...}}`.
- Si no carga: revisar firewall/antivirus del Windows (puerto 3000).

## 3. Probar con Expo Go

1. Tener la API corriendo (`docker compose up` o `pnpm dev`).
2. `npx expo start` en la PC.
3. Escanear QR con Expo Go → abrir canchas, grilla horaria, reservas.
4. Ingresar con un usuario demo (ver tabla).

> La API no arranca con `ENTORNO=publicado`; en desarrollo usa `development`.

## 4. Usuarios demo (contraseña: `villaguay2026`)

| Email | Rol | Qué puede |
|---|---|---|
| `emiliano@mail.com` | jugador | Cuenta del PRD (`usr-207`), con una cancelación tardía |
| `lleno@demo.ar` | jugador | Tres reservas activas: la cuarta da el límite de reservas |
| `nuevo@demo.ar` | jugador | Cuenta sin nada |
| `marcelo@villaguay.demo.ar` | encargado | Agenda, ingresos, bloqueos |
| `nahuel@villaguay.demo.ar` | administrador | Todo: fijas, precios, reservas |

## Validaciones de la app

```bash
npm run typecheck   # TypeScript strict
npm test            # suite de tests
```

## Notas

- Expo Go no soporta push remota (desde SDK 53); los recordatorios locales sí funcionan.
- Para push remoto o APK: `eas build` con los perfiles de `eas.json`.
