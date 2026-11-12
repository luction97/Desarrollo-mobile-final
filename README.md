# Reservas Deportivas — Deporturnos

Aplicación móvil para consultar y reservar canchas deportivas de Villaguay. Trabajo final de
**Desarrollo para Móviles — UNER**.

| Componente | Stack | Carpeta |
|---|---|---|
| App móvil | Expo SDK 54, React Native 0.81, TypeScript, Expo Router | `reservas-deportivas/` |
| API (cátedra) | NestJS 12, TypeORM, SQLite | `api-reservas-deportivas/` |
| Persistencia local | `expo-sqlite` + `expo-secure-store` | `reservas-deportivas/src/services/` |

La app se comunica con la API por HTTP; no accede a la base del servidor. La API pertenece a la
cátedra: su código y su contrato no se modifican.

## Requisitos

- **Node.js 24.15.0** (ver `reservas-deportivas/.nvmrc`) con npm, para la app.
- **Docker Desktop**, para la API.
- **Expo Go compatible con SDK 54** en el celular, y PC + celular en la **misma red Wi-Fi**.

```powershell
nvm install 24.15.0
nvm use 24.15.0
node --version
```

## Levantar el proyecto

Dos terminales, desde la raíz del repositorio.

### Terminal 1 — API (Docker)

```powershell
cd api-reservas-deportivas
docker compose up
```

- API: <http://localhost:3000> · Salud: <http://localhost:3000/salud> · Docs: <http://localhost:3000/docs>
- Levanta sola el esquema y carga los datos de demo. No hace falta `pnpm install` ni `.env` del backend.
- Apagar: `Ctrl+C` o `docker compose down`. Resetear datos: `docker compose down -v` y volver a `up`.

### Terminal 2 — app

```powershell
cd reservas-deportivas
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm start
```

Metro muestra un QR: escanearlo con Expo Go. `npm ci` respeta el lockfile y solo hace falta la
primera vez.

## URL de la API

Con **Expo Go no hay que configurar nada**: la app toma la IP de la PC del host de Metro y prueba
después `10.0.2.2` (emulador) y `localhost` como alternativas.

Si preferís fijarla, editá `reservas-deportivas/.env`:

| Destino | `EXPO_PUBLIC_API_URL` |
|---|---|
| Navegador en la PC | `http://localhost:3000` |
| Emulador Android | `http://10.0.2.2:3000` |
| Celular físico | `http://<IPv4-de-la-PC>:3000` |

`localhost` en el celular apunta al celular. La IPv4 de la PC sale de `ipconfig`. Cambiar el `.env`
requiere reiniciar Metro. `npm start -- --tunnel` solo tuneliza Metro: la API sigue estando en la
IP de la PC.

## Verificar

```powershell
curl http://localhost:3000/salud
```

## Si no conecta

- **Firewall de Windows**: permitir `node.exe` (Metro/Expo) y **Docker Desktop**
  (`com.docker.backend.exe`), que expone la API en el puerto 3000. No desactivar el firewall completo.
- Celular y PC en la misma red; confirmá desde el navegador del celular
  `http://<IPv4-de-la-PC>:3000/salud`.
- Expo Go de otro SDK no abre este proyecto: usá el cliente de SDK 54 de [expo.dev/go](https://expo.dev/go).

## Comandos

Dentro de `reservas-deportivas/`:

| Comando | Función |
|---|---|
| `npm start` | Inicia Metro |
| `npm run android` | Inicia Expo e intenta abrir Android |
| `npm run web` | Versión web de desarrollo |
| `npm run typecheck` | Verifica TypeScript |
| `npm test` | Pruebas automatizadas (node:test) |
| `npm run mapas:assets` | Regenera los recursos de Leaflet incluidos en la app |

Para el backend: [api-reservas-deportivas/README.md](api-reservas-deportivas/README.md).

## Problemas frecuentes

| Problema | Comprobación |
|---|---|
| El celular no llega a la API | Misma red, IP correcta, firewall para `node.exe` y Docker Desktop |
| El emulador no llega al backend | Usar `10.0.2.2`, no `localhost` |
| Expo Go informa SDK incompatible | Instalar el cliente de SDK 54; no cambiar el SDK del proyecto |
| `ERR_PNPM_NO_LOCKFILE` en el frontend | Usar `npm ci`: su lockfile es `package-lock.json` |
| Puerto 3000 u 8081 ocupado | Verificar si ya está activo ese servidor. Si el 3000 está ocupado: `PUERTO=3001 docker compose up` y fijá `EXPO_PUBLIC_API_URL=http://<IP-de-la-PC>:3001` (la app usa el 3000 por omisión) |
| Metro muestra código viejo | Recargar la app; si persiste, `npm start -- --clear` |

## Estado de la entrega

- Objetivo funcional: catálogo, disponibilidad, reservas, QR offline y operación del personal.
- La API incluye la consigna pendiente de notificaciones push: los avisos remotos no funcionan
  todavía. Con Expo Go no hay push remota (SDK 53+); los recordatorios locales sí.
- Cámara, biometría, háptica y notificaciones requieren validación en dispositivo físico y un
  build de producción con EAS (`eas.json`).
- Los mapas usan Leaflet local y teselas de OpenStreetMap, sin API Key ni tarjeta.
- Versionar `.env.example`, nunca `.env`. Las variables `EXPO_PUBLIC_*` viajan en la app y no son secretas.

## Contribuciones

Trabajar en una rama distinta de `main`, no modificar la API de la cátedra ni los tipos del contrato,
y antes de enviar cambios ejecutar `npm run typecheck` y `npm test`.

## Licencia

Consultar [LICENSE](LICENSE). El backend de la cátedra declara `UNLICENSED` en su `package.json`.
