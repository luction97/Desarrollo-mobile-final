# Club

Entrada pública: `src/theme/index.ts`. `useTheme()` sigue el esquema del sistema
y usa claro si no está definido. Los colores se aplican durante el render;
los tokens de geometría y tipografía son estáticos. Fuente del sistema, sin assets nuevos.

`constants/Colors.ts` es un adaptador de compatibilidad que deriva sus valores de
esta paleta. El kit no importa los componentes de la plantilla. No se deben
añadir paletas paralelas ni copiar tokens en pantallas.

Kit: `src/components/ui/index.ts`.

- `Text`: variante tipográfica, tono y números tabulares opcionales.
- `Button`: primary/secondary/ghost/destructive; sm/md/lg; pressed, foco,
  disabled y loading. El nombre accesible permanece mientras aparece el spinner.
- `Surface`: plain/outlined/raised y padding por token; contenido por children.
- `Badge`: neutral/success/warning/danger; etiqueta del consumidor, sin inferir estados.
- `TextField`: label persistente, default/error, sm/md/lg, foco y editable/readOnly;
  conserva las props de TextInput y expone ref. No valida ni transforma valores.

Los overrides de estilo se combinan al final y se reservan para layout, no para
redefinir la identidad visual. Los controles tienen minHeight, no altura fija;
no se limita el escalado del texto. Las superficies no agregan safe areas:
esa responsabilidad sigue en los contenedores de pantalla/navegación.

No hay animaciones decorativas. Motion solo declara duraciones para adopción
posterior con Reduce Motion. `boxShadow` requiere New Architecture y Android 9+;
el borde de la superficie mantiene la agrupación sin sombra.

El kit se comparte entre pantallas y el tema de navegación. `Screen` resuelve
safe areas y ancho de lectura; `ScrollScreen` añade scroll y manejo de taps del
teclado. Las listas virtualizadas se colocan en `Screen`, sin ScrollView exterior.
`PressableSurface` y `Chip` comparten selección y feedback táctil. `StateView`
agrupa estados existentes sin inferir carga, error o permisos de negocio.
