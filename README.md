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

## Roles y permisos

| Rol | Qué puede hacer en Deporturnos |
|---|---|
| Invitado | Consultar canchas, fichas, mapa y disponibilidad. Puede elegir un turno y la cantidad de personas. Para confirmar, debe ingresar o registrarse. |
| Jugador | Reservar turnos libres, consultar sus reservas, mostrar su QR incluso con una copia guardada sin conexión, cancelar dentro del plazo y gestionar favoritos. |
| Encargado | Consultar agenda, reservas fijas y tarifas. Validar ingresos por QR, marcar ausencias, tramitar cancelaciones, gestionar bloqueos y documentar el estado de la cancha con fotos y video. |
| Administrador | Realizar las operaciones del encargado y, además, crear, editar o dar de baja reservas fijas y cambiar tarifas: el servidor limita esas dos operaciones al administrador. |

El registro público crea una cuenta de jugador. La API de la cátedra valida los permisos de cada operación.
La ficha muestra las imágenes publicadas por la API. Las fotos de estado y los videos grabados se suben como archivos independientes y su asociación con la cancha queda en el dispositivo.

Para preparar y grabar la demostración, seguí la [guía de permisos y pruebas manuales](GUIA_DEMOSTRACION.md).

## Requisitos

- **Node.js 24.15.0** (ver `reservas-deportivas/.nvmrc`) con npm, para la app.
- Para grabar con la API compartida: **conexión a Internet**. No hace falta Docker ni que la PC del equipo quede encendida.
- Para desarrollar con Expo Go: **Expo Go compatible con SDK 54** y PC + celular en la misma red Wi-Fi.

Instalá Node.js 24.15.0 desde [nodejs.org](https://nodejs.org/) si todavía no lo tenés. Si usás
`nvm`, podés seleccionar esa versión así:

```powershell
nvm install 24.15.0
nvm use 24.15.0
node --version
```

## Probar la app con el backend compartido (recomendado para la grabación)

La API de demostración está publicada en Render y el frontend ya usa esa URL en el perfil EAS
`preview` y en `.env.example`:

<https://api-reservas-deportivas-crsl.onrender.com>

Antes de grabar, abrí <https://api-reservas-deportivas-crsl.onrender.com/salud> y esperá la
respuesta `estado: ok`. El servicio gratuito puede dormir por inactividad; su primer acceso puede
tardar alrededor de un minuto. La API de demostración usa SQLite temporal: los integrantes
comparten las reservas mientras la instancia siga activa, pero un reinicio puede borrar los cambios
y volver a cargar los datos de demostración.

### Usar el APK

Instalá el mismo APK `preview` en cada teléfono Android. No requiere Expo Go, Metro ni Docker; sí
necesita Internet para consultar la API. Antes de iniciar la grabación, abrí la app y esperá que
cargue el catálogo si Render estaba dormido.

### Usar Expo Go

Cloná o actualizá el repositorio. Desde `reservas-deportivas/`, prepará el entorno local y arrancá
Expo:

```powershell
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npx expo start --clear --go --lan
```

`npm ci` instala las dependencias según el lockfile. Metro muestra un QR: escanealo con Expo Go
compatible con el SDK del proyecto. `.env.example` configura la API compartida de Render. El archivo
`.env` local no se versiona.

## Desarrollo con API local (opcional)

Solo si necesitás trabajar sin Internet o probar una API local, levantá Docker en la PC:

```powershell
cd api-reservas-deportivas
docker compose up
```

Comprobá <http://localhost:3000/salud>. Para que Expo Go use esa API, editá
`reservas-deportivas/.env` y configurá `EXPO_PUBLIC_API_URL` con una dirección accesible desde el
dispositivo:

| Destino | `EXPO_PUBLIC_API_URL` |
|---|---|
| Navegador en la PC | `http://localhost:3000` |
| Emulador Android | `http://10.0.2.2:3000` |
| Celular físico | `http://<IPv4-de-la-PC>:3000` |

`localhost` en el celular apunta al celular. La IPv4 de la PC sale de `ipconfig`. Cambiar el `.env`
requiere reiniciar Metro. `--tunnel` solo tuneliza Metro; no hace pública la API local.

### Puerto 3000 ocupado

En la terminal de la API (dentro de `api-reservas-deportivas`), usá el puerto 3001:

```powershell
$env:PUERTO = "3001"
docker compose up
```

En `reservas-deportivas/.env`, fijá `EXPO_PUBLIC_API_URL` con el host correspondiente de la tabla
anterior y el puerto `3001` (por ejemplo, `http://<IPv4-de-la-PC>:3001` para un celular). Reiniciá
Metro para que tome el cambio.

## Verificar

```powershell
curl http://localhost:3000/salud
```

## Si no conecta

- **Con API compartida**, el teléfono necesita Internet. Para Expo Go por LAN, permitir `node.exe`
  (Metro/Expo) en el firewall. Docker Desktop solo necesita permiso cuando se usa la API local.
- Celular y PC en la misma red; confirmá desde el navegador del celular
  `http://<IPv4-de-la-PC>:3000/salud`.
- Expo Go debe ser compatible con SDK 54. En Android podés obtener versiones anteriores desde
  [expo.dev/go](https://expo.dev/go); en iOS, si la versión de App Store no es compatible, usá un
  development build.

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

### APK de entrega y código fuente

El perfil `preview` genera una APK de Android y ya contiene la URL pública de la API. Desde
`reservas-deportivas/`, cuando corresponda compilar, ejecutá:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

La entrega de código fuente es el repositorio Git e incluye `reservas-deportivas/eas.json` y
`reservas-deportivas/app.json`; no incluye `node_modules`. Para una demostración autónoma, instalá
el APK y verificá el inicio, el acceso a la API y una reserva con Metro y la PC apagados. Consultá
la [guía de distribución interna de Expo](https://docs.expo.dev/build/internal-distribution/).

## Problemas frecuentes

| Problema | Comprobación |
|---|---|
| El celular no llega a la API local | Misma red, IP correcta, firewall para `node.exe` y Docker Desktop |
| El emulador no llega al backend | Usar `10.0.2.2`, no `localhost` |
| Expo Go informa SDK incompatible | En Android, obtener Expo Go SDK 54 desde `expo.dev/go`; en iOS, usar un development build si la versión de App Store no es compatible |
| `ERR_PNPM_NO_LOCKFILE` en el frontend | Usar `npm ci`: su lockfile es `package-lock.json` |
| Puerto 3000 ocupado | Seguí los pasos de [puerto alternativo](#puerto-3000-ocupado). |
| Puerto 8081 ocupado | Verificá si Metro ya está activo; si no, cerrá el proceso que ocupa el puerto antes de iniciar Expo. |
| Metro muestra código viejo | Recargar la app; si persiste, `npm start -- --clear` |

## Estado de la entrega

- Objetivo funcional: catálogo, disponibilidad, reservas, QR offline y operación del personal.
- Deporturnos desactiva su servicio de avisos en Expo Go. Probá el recordatorio local en una
  app instalada. Los avisos remotos dependen de las credenciales y configuración de la API.
- Validá cámara, archivos, biometría, háptica y multimedia en Android físico. Comprobá ícono,
  splash y arranque autónomo con el APK instalado.
- Los mapas usan Leaflet y OpenStreetMap, con ubicación opcional mediante `expo-location`.
  La consigna AC-05 menciona `react-native-maps`.
- Versionar `.env.example`, nunca `.env`. Las variables `EXPO_PUBLIC_*` viajan en la app y no son secretas.

## Contribuciones

Trabajar en una rama distinta de `main`, no modificar la API de la cátedra ni los tipos del contrato,
y antes de enviar cambios ejecutar `npm run typecheck` y `npm test`.

## Licencia

Consultar [LICENSE](LICENSE). El backend de la cátedra declara `UNLICENSED` en su `package.json`.
