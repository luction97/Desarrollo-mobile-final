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
| Agregar una foto del estado y grabar el video de la cancha | No | No | Sí | Sí |
| Subir esa foto o ese video como archivo independiente | No | No | Sí | Sí |

«Invitado» es el estado sin sesión. Las cuentas nuevas se registran como jugador. El servidor decide si una operación concreta es válida según el rol, el horario y el estado de la reserva.

## Preparación

- Levantá la API y Metro según el [README](README.md#levantar-el-proyecto). Usá un Android con Expo Go compatible con SDK 54 en la misma red. Para escanear, prepará otro teléfono o una pantalla donde mostrar el QR del jugador.
- Tené a mano las cuentas demo que figuran en el [README de la app](reservas-deportivas/README.md#usuarios-demo--contraseña-villaguay2026). Usá cuentas y turnos de prueba. Evitá mostrar contraseñas, tokens o datos personales en el video.
- Prepará turnos distintos para cancelar, validar un ingreso, marcar una ausencia y bloquear. Para grabar el recordatorio, elegí un turno cuyo inicio esté un poco más de dos horas por delante. Si el catálogo trae un video, reservá esa ficha para la prueba multimedia.
- Si la semilla de demo es antigua, prepará turnos nuevos para el ensayo. En una instalación descartable podés regenerar la semilla con `docker compose down -v` y luego `docker compose up -d`. El primer comando borra el volumen y sus datos.
- Grabá el recorrido exitoso de cada rol y un par de casos de error representativos. Ensayá el resto de los casos antes de grabar. La especificación indica de 5 a 8 minutos por integrante.

## Lista de pruebas para la demostración

1. [ ] **Catálogo como invitado.** Abrí la app sin iniciar sesión. Recorré los 11 espacios del catálogo demo y verificá que la ficha de la cancha muestra foto, tarifa, deporte, superficie e iluminación. Deslizá el carrusel para pasar de cancha y confirmá que cambian el nombre, la foto y los horarios.
2. [ ] **Filtros y ficha.** Abrí Filtros, elegí deporte y complejo en la hoja que se abre, probá una combinación vacía y usá Limpiar para quitar los filtros. Abrí una ficha y recorré sus fotos, capacidad, características, reglamento, precio y acceso a horarios.
3. [ ] **Mapa y ubicación.** Abrí el mapa general: debe haber un destino por complejo y uno por cada cancha independiente. Tocá distintos puntos y comprobá que se muestra un solo nombre a la vez. Probá «Cómo llegar», permitir o denegar ubicación, y el indicador de destino más cercano. Verificá que el mapa de una ficha conserva la ubicación de esa cancha.
4. [ ] **Disponibilidad.** Cambiá de cancha y fecha. Revisá hoy y los seis días siguientes, las 16 franjas de 08:00 a 24:00, el orden por hora y los estados libre, reservado, fijo y mantenimiento. Solo deben poder elegirse horarios libres vigentes. Abrí «Ver anteriores» cuando corresponda.
5. [ ] **Registro y retorno a la reserva.** Como invitado elegí turno y personas, y tocá la acción para ingresar. Probá el regreso desde login y desde registro. Se recupera la selección si sigue libre. Si otra cuenta la ocupa durante el ingreso, la app pide elegir otro horario.
6. [ ] **Sesión y biometría.** Probá contraseña incorrecta y correcta. Activá el acceso biométrico cuando lo ofrece o desde Cuenta. Cerrá y reabrí la app para comprobar el reingreso automático. Cancelá la verificación y probá «Ingresar con huella o rostro» o «Usar contraseña». En un equipo sin biometría, verificá el acceso con contraseña. Cerrá sesión y confirmá que se ocultan los accesos privados.
7. [ ] **Reserva confirmada.** Revisá deporte, capacidad, tarifa y pago en el lugar. Probá cantidad vacía, cero y superior a la capacidad. Confirmá un turno válido y verificá que se crea una sola reserva y que «Ver QR» abre el código correspondiente.
8. [ ] **Cupo y conflicto de turno.** Con tres reservas activas, intentá una cuarta en forma secuencial. Con dos cuentas y la misma franja libre, confirmá desde una y luego desde la otra para comprobar que se muestra el conflicto y se actualiza la grilla. El ensayo secuencial no certifica las carreras conocidas de la API.
9. [ ] **Mis reservas y cancelación.** Revisá próximas y pasadas. Cancelá una reserva elegible y verificá que cambia su estado y se libera la franja. A exactamente 4 h corresponde permitir la cancelación; con menos de 4 h debe indicarse contactar al encargado. Verificá los antecedentes disponibles en el perfil, sin penalización automática.
10. [ ] **QR sin señal.** Abrí una reserva confirmada con conexión para guardar la copia. Reabrí la app sin red, ingresá a Mis reservas y tocá «Mostrar QR». Verificá que conserva el código y señala la copia local. Consultá el catálogo guardado y comprobá que confirmar una reserva requiere conexión. El arranque independiente se verifica en la etapa de APK.
11. [ ] **Recordatorio local.** Probalo en una app instalada o un development build: Deporturnos desactiva su servicio de avisos en Expo Go. Confirmá una reserva a más de 2 h, concedé permiso y comprobá el aviso a T−2 h y su apertura en la reserva. Probá permiso denegado, reprogramación del recordatorio desde la reserva y cancelación antes del disparo.
12. [ ] **Favoritos y cambios detectados.** Agregá y quitá un favorito y usá el botón Favoritos de la pantalla principal. Para probar una liberación, consultá primero la franja ocupada de una cancha favorita, cancelá esa reserva desde otra cuenta y volvé a consultar la misma fecha. Para probar una suspensión, consultá antes la reserva confirmada, aplicá un bloqueo desde el personal y actualizá Mis reservas. Mostrá los avisos que aparecen al detectar el cambio en la app. El aviso con la app cerrada llega por push: probalo en la app instalada o en un development build.
13. [ ] **Agenda y restricciones.** Como encargado, filtrá por fecha y cancha. Identificá los turnos libres, reservados, fijos y bloqueados. En Gestión del complejo consultá las fijas y la tarifa: las acciones para modificarlas están disponibles con cuenta de administrador. Jugador e invitado quedan fuera de agenda, lector y gestión.
14. [ ] **Lector de QR, permisos y háptica.** Desde la agenda o el lector elegí la cancha. Probá permiso de cámara denegado, ajustes, confirmación con biometría y alternativa con contraseña. Escaneá primero casos inválidos con la reserva todavía confirmada, como cancha equivocada, otro día, código inválido o fuera de horario. Después validá un QR correcto desde 30 min antes del inicio hasta antes del fin. Comprobá mensaje, hora registrada, respuesta háptica distinta y rechazo de un segundo ingreso. Con el teléfono sin red, el lector debe indicar que necesita conexión.
15. [ ] **Ausencia y cancelación por personal.** En otro turno, verificá que marcar ausente está disponible desde 15 min después del inicio y que el estado queda en agenda. En una reserva futura fuera del plazo de autocancelación, usá la acción del personal y verificá estado, disponibilidad y antecedentes devueltos por la API.
16. [ ] **Bloqueos.** Elegí una o varias canchas, fecha y motivo. Probá un bloqueo de día completo y uno de 23:00 a 24:00. Tocá «Revisar» y comprobá el resumen y las reservas que podrían cancelarse. Si tocás «Editar datos», verificá que tengas que revisar otra vez. Confirmá y verificá la grilla de cada cancha. Al dar de baja, comprobá que las reservas canceladas siguen canceladas.
17. [ ] **Reservas fijas.** Como administrador, elegí la cancha y creá una serie con titular, día semanal, horario y fechas. Probá la franja 23:00–24:00, los atajos «Sin fin» y «Fin de mes» y el calendario de fin. Verificá el resumen, la presencia de «Reserva fija» en la grilla, el rechazo de un solapamiento, la edición y la disponibilidad después de la baja.
18. [ ] **Cambio de tarifa.** Como administrador, seleccioná la cancha y guardá un importe entero distinto del actual. Verificá que «Tarifa vigente» cambia en el momento y sigue actualizada al volver a entrar. Revisá el catálogo, la ficha y el precio de una nueva reserva. Como encargado, consultá la tarifa.
19. [ ] **Fotos y archivos.** Abrí una ficha con conexión y recorré las imágenes con las flechas sobre la foto. Reabrí la ficha sin red y verificá las copias guardadas. Como encargado o administrador, elegí una foto desde la galería en «Estado de la cancha». Comprobá la fecha del reporte, su recuperación en el mismo teléfono y la opción de quitarla. El archivo se sube, pero la asociación con la cancha se guarda en este dispositivo.
20. [ ] **Video.** Como encargado o administrador, grabá y subí un video corto de la cancha. Comprobá reproducción y pausa con los controles visibles, y reabrilo sin señal en el mismo teléfono. Si hay un video publicado por la API, comprobá también su reproducción. En una cancha sin video, revisá el estado vacío.
21. [ ] **Estados y presentación.** Probá carga, resultado vacío, error de API y recuperación. Deslizá hacia abajo para actualizar los horarios y las reservas, y pasá entre las pestañas para comprobar que no parpadea la pantalla ni aparecen avisos de datos guardados. Revisá claro y oscuro, pantalla angosta, tamaño de letra aumentado, teclado, Atrás y objetivos táctiles. Verificá que los controles de filtros, reserva y QR siguen accesibles y que se distinguen los estados sin depender solo del color.
22. [ ] **Identidad y entrega autónoma.** Durante la etapa autorizada de APK, verificá en Android el nombre, el ícono de 1024 × 1024 y el splash, y probá abrir y reservar desde otra red con Metro y la PC apagados. Hace falta una URL pública HTTPS accesible para la API. Grabá este caso después de comprobarlo.

## Qué aclarar en el video

- Los avisos de suspensión y liberación que se muestran son cambios detectados al consultar o sincronizar. El aviso con la app cerrada requiere la app instalada o un development build y que la API tenga credenciales de Expo; en Expo Go no hay push. La reprogramación depende de funciones que la API docente no ofrece para este recorrido.
- El mapa usa OpenStreetMap y Leaflet. La prueba sin conexión verifica datos y archivos guardados; las teselas del mapa dependen de la red.
- Expo Go sirve para demostrar recorridos en el teléfono. La aceptación del ícono, splash y arranque autónomo corresponde al APK instalado.
