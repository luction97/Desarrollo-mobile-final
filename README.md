# Reservas Deportivas

Aplicación móvil para consultar y reservar espacios deportivos municipales de Villaguay. Trabajo final de **Desarrollo para Móviles — UNER**.

El repositorio contiene el frontend en desarrollo y la API proporcionada por la cátedra. La aplicación todavía tiene funcionalidades pendientes; no se considera lista para producción.

## Tecnologías y estructura

| Componente | Tecnologías | Carpeta |
|---|---|---|
| Aplicación móvil | Expo SDK 54, React Native 0.81.5, React 19.1, TypeScript, Expo Router | `reservas-deportivas/` |
| Backend de la cátedra | NestJS 12, TypeORM, SQLite por defecto | `api-reservas-deportivas/` |
| Persistencia móvil | `expo-sqlite` | `reservas-deportivas/src/services/` |

```text
reservas-deportivas/
  app/                Rutas y pantallas
  src/components/     Componentes de la aplicación
  src/context/        Contexto de sesión
  src/services/       HTTP, autenticación y persistencia
  src/tipos/          Tipos del dominio
  src/mocks/          Datos de prueba
  .env.example        Plantilla del entorno del frontend
api-reservas-deportivas/
  README.md           Documentación del backend de la cátedra
```

El frontend se comunica con el backend por HTTP; no accede directamente a su base de datos. SQLite del servidor guarda los datos centrales y SQLite del teléfono sirve para persistencia local. **No hace falta Docker** para el arranque descrito aquí.

## Requisitos

- **Node.js 24.15.0**, versión comprobada y registrada en `reservas-deportivas/.nvmrc`.
- npm incluido con esa instalación de Node para el frontend.
- **pnpm 10.34.6** para el backend, según su `packageManager`.
- Para celular: computadora y teléfono en la misma red, y un cliente compatible con **Expo SDK 54**.
- Para emulador Android: Android Studio con un dispositivo virtual configurado y las herramientas Android disponibles en el sistema.

Si usás NVM para Windows:

```powershell
nvm install 24.15.0
nvm use 24.15.0
node --version
npm --version
```

La instalación de Node se hace una sola vez. No mezcles una instalación independiente de Node con la administrada por NVM. Para diagnosticar rutas en Windows: `where.exe node` y `where.exe npm`.

Si pnpm no está disponible, podés instalar la versión requerida:

```powershell
npm install --global pnpm@10.34.6
```

## Instalación inicial

Los siguientes comandos utilizan **PowerShell** y parten de la raíz del repositorio. Cada proyecto tiene su propio gestor y lockfile; no ejecutar `npm ci` en la raíz ni usar pnpm para instalar el frontend.

### 1. Preparar el backend

```powershell
cd api-reservas-deportivas
pnpm install --frozen-lockfile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

La plantilla permite desarrollo con SQLite. Al arrancar con su configuración predeterminada, la API crea el esquema y carga datos de demo si la base está vacía. Los datos quedan en `datos/api.sqlite` y los archivos en `archivos/`, dentro del backend.

**No ejecutar `pnpm db:reiniciar` para el arranque habitual:** elimina y reconstruye el esquema. La API pertenece a la cátedra; su código y contrato no se modifican como parte del desarrollo del frontend.

### 2. Preparar el frontend

Desde la raíz, en otra terminal:

```powershell
cd reservas-deportivas
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Estos comandos respetan los lockfiles y no sobrescriben un `.env` existente. `npm ci` reinstala las dependencias locales: no es necesario ejecutarlo cada vez que iniciás la aplicación.

### 3. Configurar la URL de la API

Editar `reservas-deportivas/.env` según dónde se ejecutará la aplicación:

| Destino | `EXPO_PUBLIC_API_URL` |
|---|---|
| Navegador en la misma PC que el backend | `http://localhost:3000` |
| Emulador Android estándar de Android Studio | `http://10.0.2.2:3000` |
| Celular físico | `http://<IPv4-local-de-la-PC>:3000` |
| Servicio publicado | URL HTTPS del backend |

Ejemplo para celular, reemplazando la IP por la de tu computadora:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.0.100:3000
```

En Windows, obtener la IPv4 de la interfaz Wi-Fi o Ethernet activa con `ipconfig`. **`localhost` en el celular apunta al celular, no a la PC.** Si la IP cambia, actualizar el `.env` local y reiniciar Metro.

## Iniciar el proyecto

Se necesitan **dos terminales abiertas**, una por proceso. Los comandos parten de la raíz del repositorio y suponen que la instalación inicial ya está completa.

### Terminal 1: backend

```powershell
cd api-reservas-deportivas
pnpm dev
```

- Salud: `http://localhost:3000/salud`
- Documentación interactiva: `http://localhost:3000/docs`

### Terminal 2: frontend

```powershell
cd reservas-deportivas
npm start
```

Metro muestra un QR y las opciones de apertura. Al guardar cambios del frontend, Fast Refresh normalmente los muestra sin reiniciar todo el proyecto. Para detener cada servidor, usar `Ctrl+C` en su terminal.

### Abrir en un celular

1. Conectar PC y celular a la misma red Wi-Fi.
2. Desde el navegador del celular, abrir `http://<IPv4-local-de-la-PC>:3000/salud`. Debe devolver `datos.estado: "ok"`.
3. Usar **Expo Go compatible con SDK 54** y abrir el proyecto mediante el QR de Metro.

**Compatibilidad:** Expo Go para SDK 58 no puede abrir este proyecto SDK 54. En Android se puede descargar un cliente compatible desde [expo.dev/go](https://expo.dev/go). En un iPhone físico no se puede asumir la disponibilidad de una versión anterior: se necesita un cliente admitido o preparar un development build compatible. No actualizar el SDK solo para hacer coincidir el Expo Go instalado.

### Abrir en el emulador Android

1. Iniciar un dispositivo virtual desde **Android Studio → Device Manager**.
2. Configurar `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` y reiniciar Metro si estaba abierto.
3. Con el backend activo y Metro iniciado, presionar **`a`** en la terminal de Expo. También se puede ejecutar `npm run android` en lugar de `npm start`.
4. Si aparece incompatibilidad de SDK, instalar Expo Go para SDK 54 en el emulador desde [expo.dev/go](https://expo.dev/go).

El cliente de desarrollo no reemplaza la prueba en dispositivo: cámara, biometría y notificaciones requieren validaciones específicas. **Push en Android no se valida con Expo Go para SDK 54**; requiere un development build y credenciales. Un development build también exige preparación adicional y no está listo solo por existir un perfil en `eas.json`.

## Comandos disponibles

Ejecutar dentro de `reservas-deportivas/`:

| Comando | Función |
|---|---|
| `npm start` | Inicia Metro |
| `npm run android` | Inicia Expo e intenta abrir Android |
| `npm run ios` | Inicia Expo e intenta abrir el simulador iOS; requiere macOS y su entorno |
| `npm run web` | Inicia la versión web de desarrollo |
| `npm run typecheck` | Verifica TypeScript sin generar archivos |

Los comandos Android/iOS anteriores **no generan un build de producción**. El frontend todavía no tiene scripts de lint ni una suite de pruebas de negocio configurados. La versión web no sustituye las pruebas de las capacidades nativas.

Para los comandos y opciones del backend, consultar su [README](api-reservas-deportivas/README.md).

## Problemas frecuentes

| Problema | Comprobación |
|---|---|
| `Class extends value undefined…` al ejecutar npm | Revisar Node/npm/NVM y sus rutas. En este entorno se resolvió con una instalación limpia de Node 24.15.0 en NVM, sin borrar las otras versiones. |
| `ERR_PNPM_NO_LOCKFILE` dentro del frontend | Usar `npm ci`; su lockfile es `package-lock.json`. |
| `pnpm dev` no existe dentro del frontend | Usar `npm start`. `pnpm dev` corresponde al backend. |
| Expo Go informa SDK incompatible | Instalar el cliente correspondiente o preparar un development build; no cambiar dependencias indiscriminadamente. |
| El teléfono no llega a la API | Verificar IP, misma red, backend activo y permisos de firewall en red privada. No desactivar el firewall completo. |
| El emulador no llega al backend | Usar `10.0.2.2`, no `localhost`. |
| Puerto 3000 u 8081 ocupado | Revisar si ya está activo el servidor correspondiente antes de iniciar otro. |
| Metro muestra código viejo | Recargar la app; si persiste, detener Metro y ejecutar `npm start -- --clear`. |

`npm start -- --tunnel` puede facilitar la conexión con Metro, pero **no publica la API del backend**.

## Seguridad y estado de la entrega

- Versionar `.env.example`, nunca `.env`, claves privadas, credenciales de firma o bases locales.
- Las variables `EXPO_PUBLIC_*` quedan incorporadas a la aplicación y **no son secretas**. No incluir claves JWT, contraseñas de base de datos ni credenciales privadas del servidor.
- Los secretos y usuarios de demo del backend son para desarrollo; no reutilizarlos en producción.
- El objetivo funcional incluye catálogo, disponibilidad, reservas, QR offline y operación del personal. Su presencia en una pantalla no significa que todos esos flujos estén completos o validados.
- La API incluye la consigna pendiente de notificaciones push. Consultar su documentación; no asumir que los avisos remotos ya funcionan.
- La entrega requiere validación Android/iOS y build de producción con EAS. Tener Metro activo o un bundle generado no certifica ejecución nativa ni preparación para producción.

## Contribuciones

Trabajar en una rama distinta de `main`, mantener los tipos del contrato y separar las pantallas de los servicios. Antes de enviar cambios, ejecutar `npm run typecheck`, probar el flujo afectado y revisar que el diff no incluya secretos ni archivos generados. No actualizar dependencias ni modificar la API de la cátedra sin acuerdo previo.

## Licencia

Consultar [LICENSE](LICENSE) y las condiciones particulares declaradas por los componentes incluidos. El backend de la cátedra declara `UNLICENSED` en su `package.json`.
