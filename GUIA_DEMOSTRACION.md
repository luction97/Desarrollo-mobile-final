# Deporturnos · Guía de demostración y pruebas manuales

Usá esta lista para ensayar antes de grabar. Marcá cada caso después de obtener el resultado esperado en el teléfono. Si falta un dato de prueba o una capacidad de la API, dejalo anotado como pendiente.

## Permisos por rol

| Operación | Invitado | Jugador | Encargado | Administrador |
|---|---|---|---|---|
| Ver canchas, fichas, mapa y horarios | Sí | Sí | Sí | Sí |
| Guardar favoritos | Requiere cuenta | Sí | Sí | Sí |
| Crear reserva individual | Requiere cuenta de jugador | Sí | No | No |
| Ver reservas propias y presentar el QR | No | Sí | No | No |
| Cancelar una reserva propia | No | Sí, si faltan al menos 4 h | No aplica | No aplica |
| Consultar agenda y tramitar cancelaciones del personal | No | No | Sí | Sí |
| Validar ingreso por QR y marcar ausencias | No | No | Sí | Sí |
| Crear y dar de baja bloqueos | No | No | Sí | Sí |
| Consultar reservas fijas | No | No | Sí | Sí |
| Crear, editar y dar de baja reservas fijas | No | No | No | Sí |
| Cambiar tarifa | No | No | No | Sí |
| Capturar, seleccionar y subir una foto desde la ficha | No | No | No | Sí, como archivo independiente |

«Invitado» es el estado sin sesión. Las cuentas nuevas se registran como jugador. El servidor decide si una operación concreta es válida según el rol, el horario y el estado de la reserva.

## Preparación

- Levantá la API y Metro según el [README](README.md#levantar-el-proyecto). Usá un Android con Expo Go compatible con SDK 54 en la misma red. Para escanear, prepará otro teléfono o una pantalla donde mostrar el QR del jugador.
- Tené a mano las cuentas demo que figuran en el [README de la app](reservas-deportivas/README.md#usuarios-demo--contraseña-villaguay2026). Usá cuentas y turnos de prueba. Evitá mostrar contraseñas, tokens o datos personales en el video.
- Prepará turnos distintos para cancelar, validar un ingreso, marcar una ausencia y bloquear. Para grabar el recordatorio, elegí un turno cuyo inicio esté un poco más de dos horas por delante. Si el catálogo trae un video, reservá esa ficha para la prueba multimedia.
- Grabá el recorrido exitoso de cada rol y un par de casos de error representativos. Ensayá el resto de los casos antes de grabar. La especificación indica de 5 a 8 minutos por integrante.

## Lista de pruebas para la demostración

1. [ ] **Catálogo como invitado.** Abrí la app sin iniciar sesión. Recorré los 11 espacios del catálogo demo y verificá que las tarjetas muestran deporte, superficie, iluminación y tarifa.
2. [ ] **Filtros y ficha.** Abrí Filtros, elegí deporte y complejo en la hoja que se abre, probá una combinación vacía y usá Limpiar para quitar los filtros. Abrí una ficha y recorré sus fotos, capacidad, características, reglamento, precio y acceso a horarios.
3. [ ] **Mapa y ubicación.** Abrí el mapa general y el de una cancha. Probá «Cómo llegar», ubicación concedida y ubicación denegada. Verificá que, con permiso, se identifica el complejo más cercano cuando hay varias opciones. Con el permiso denegado deben seguir disponibles el catálogo, los horarios y el mapa general.
4. [ ] **Disponibilidad.** Cambiá de cancha y fecha. Revisá hoy y los seis días siguientes, las 16 franjas de 08:00 a 24:00, el orden por hora y los estados libre, reservado, fijo y mantenimiento. Solo deben poder elegirse horarios libres vigentes. Abrí «Ver anteriores» cuando corresponda.
5. [ ] **Registro y retorno a la reserva.** Como invitado elegí turno y personas, y tocá la acción para ingresar. Probá el regreso desde login y desde registro. Se recupera la selección si sigue libre. Si otra cuenta la ocupa durante el ingreso, la app pide elegir otro horario.
6. [ ] **Sesión y biometría.** Probá contraseña incorrecta y correcta, cierre y reapertura de la app, desbloqueo con biometría donde esté disponible, cancelación del diálogo biométrico y alternativa con contraseña. Cerrá sesión y comprobá que desaparecen los accesos privados del jugador o del personal.
7. [ ] **Reserva confirmada.** Revisá deporte, capacidad, tarifa y pago en el lugar. Probá cantidad vacía, cero y superior a la capacidad. Confirmá un turno válido y verificá que se crea una sola reserva y que «Ver QR» abre el código correspondiente.
8. [ ] **Cupo y conflicto de turno.** Con tres reservas activas, intentá una cuarta en forma secuencial. Con dos cuentas y la misma franja libre, confirmá desde una y luego desde la otra para comprobar que se muestra el conflicto y se actualiza la grilla. El ensayo secuencial no certifica las carreras conocidas de la API.
9. [ ] **Mis reservas y cancelación.** Revisá próximas y pasadas. Cancelá una reserva elegible y verificá que cambia su estado y se libera la franja. A exactamente 4 h corresponde permitir la cancelación; con menos de 4 h debe indicarse contactar al encargado. Verificá los antecedentes disponibles en el perfil, sin penalización automática.
10. [ ] **QR sin señal.** Abrí una reserva confirmada con conexión para guardar la copia. Cerrá y reabrí la app sin red, ingresá a Mis reservas y tocá «Mostrar QR». Verificá que conserva el código y señala la copia local. Probá que desde el catálogo guardado no se confirma una reserva sin red. Expo Go puede necesitar Metro para volver a cargar el bundle; comprobá el arranque independiente en la etapa de APK.
11. [ ] **Recordatorio local.** Confirmá una reserva a más de 2 h, concedé el permiso y grabá el aviso cuando llegue el momento. En otra reserva probá permiso denegado, recuperación desde «Programar recordatorio» y cancelación antes de que dispare. Al sincronizar, verificá que se recupera un recordatorio faltante y no aparecen duplicados.
12. [ ] **Favoritos y cambios detectados.** Agregá y quitá un favorito y usá el botón Favoritos de la pantalla principal. Para probar una liberación, consultá primero la franja ocupada de una cancha favorita, cancelá esa reserva desde otra cuenta y volvé a consultar la misma fecha. Para probar una suspensión, consultá antes la reserva confirmada, aplicá un bloqueo desde el personal y actualizá Mis reservas. Mostrá los avisos que aparecen al detectar el cambio en la app.
13. [ ] **Agenda y restricciones.** Como encargado, recorré la agenda por fecha y cancha y ubicá turnos libres, reservados, fijos y bloqueados. Verificá que jugador e invitado quedan fuera de la agenda, el lector y la gestión. Como encargado, comprobá que se pueden consultar fijas y que las acciones de edición de fijas y tarifa son exclusivas del administrador.
14. [ ] **Lector de QR, permisos y háptica.** Desde la agenda o el lector elegí la cancha. Probá permiso de cámara denegado, ajustes, confirmación con biometría y alternativa con contraseña. Escaneá primero casos inválidos con la reserva todavía confirmada, como cancha equivocada, otro día, código inválido o fuera de horario. Después validá un QR correcto desde 30 min antes del inicio hasta antes del fin. Comprobá mensaje, hora registrada, respuesta háptica distinta y rechazo de un segundo ingreso. Con el teléfono sin red, el lector debe indicar que necesita conexión.
15. [ ] **Ausencia y cancelación por personal.** En otro turno, verificá que marcar ausente está disponible desde 15 min después del inicio y que el estado queda en agenda. En una reserva futura fuera del plazo de autocancelación, usá la acción del personal y verificá estado, disponibilidad y antecedentes devueltos por la API.
16. [ ] **Bloqueos.** Creá un bloqueo parcial y uno de día completo. Verificá motivo obligatorio y vista previa de las reservas afectadas. Cancelá una confirmación y luego probá confirmar otra. Revisá el estado en la grilla y la cancelación de las reservas afectadas. Al dar de baja el bloqueo, revisá la disponibilidad resultante y el historial de las reservas canceladas.
17. [ ] **Reservas fijas.** Como administrador, creá una serie semanal con titular, horario y vigencia. Probá el atajo «Todo el mes» para que la serie ocupe el día y horario elegidos durante todo el mes. Verificá que el público ve «Reserva fija» y que esa franja queda ocupada. Probá un solapamiento secuencial, una edición y la baja. Comprobá el resultado en la agenda y la grilla.
18. [ ] **Cambio de tarifa.** Como administrador cambiá el precio y volvé al catálogo, la ficha y el diálogo de una reserva nueva. Verificá la tarifa vigente y que se indica pago en el lugar.
19. [ ] **Fotos y archivos.** Como encargado o administrador, probá captura y selección desde galería, persistencia de la foto local, subida como archivo y borrado local. Desde la ficha, descargá una foto publicada, abrila sin señal y eliminá la descarga. Probá cancelar el selector y recuperar una descarga fallida. La subida devuelve una URL de archivo; la API carece de una operación para asociarla con la ficha.
20. [ ] **Video.** Como encargado, grabá un video corto de la cancha (máximo 30 s) desde la ficha y subilo; comprobá que queda subido y que se muestra en la ficha. Si hay una ficha con video publicado, probá reproducción, pausa, controles, descarga, reproducción sin señal y borrado. Probá también una ficha sin video y verificá que la ficha sigue funcionando. Si el catálogo de prueba carece de videos, dejá la reproducción como pendiente.
21. [ ] **Estados y presentación.** Probá carga, resultado vacío, error de API y recuperación. Revisá claro y oscuro, pantalla angosta, tamaño de letra aumentado, teclado, Atrás y objetivos táctiles. Verificá que los controles de filtros, reserva y QR siguen accesibles y que se distinguen los estados sin depender solo del color.
22. [ ] **Identidad y entrega autónoma.** Durante la etapa autorizada de APK, verificá en Android el nombre, el ícono de 1024 × 1024 y el splash, y probá abrir y reservar desde otra red con Metro y la PC apagados. Hace falta una URL pública HTTPS accesible para la API. Grabá este caso después de comprobarlo.

## Qué aclarar en el video

- Los avisos de suspensión y liberación que se muestran son cambios detectados al consultar o sincronizar. El envío remoto y la reprogramación dependen de funciones que la API docente no ofrece para este recorrido.
- El mapa usa OpenStreetMap y Leaflet. La prueba sin conexión verifica datos y archivos guardados; las teselas del mapa dependen de la red.
- Expo Go sirve para demostrar recorridos en el teléfono. La aceptación del ícono, splash y arranque autónomo corresponde al APK instalado.
