import { Platform } from 'react-native';
import { api } from './api';
import { fechaRecordatorio } from '../utils/recordatorios';

let carga: Promise<typeof import('expo-notifications')> | undefined;
let cola = Promise.resolve();

function encolar<T>(accion: () => Promise<T>): Promise<T> {
  const tarea = cola.then(accion);
  cola = tarea.then(() => undefined, () => undefined);
  return tarea;
}

// El import público tiene efectos push internos en Expo Go; se carga sólo al usar avisos locales.
function cargarNotificaciones() {
  carga ??= import('expo-notifications').then(Notifications => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
      }),
    });
    return Notifications;
  }).catch(error => {
    carga = undefined;
    throw error;
  });
  return carga;
}

export const notificacionesService = {
  async inicializar(): Promise<void> {
    if (Platform.OS !== 'web') await cargarNotificaciones();
  },

  async pedirPermisos(solicitar = true): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const Notifications = await cargarNotificaciones();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recordatorios', {
        name: 'Recordatorios de reservas', importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted || actual.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
    if (!solicitar || actual.canAskAgain === false) return false;
    const permiso = await Notifications.requestPermissionsAsync();
    return permiso.granted || permiso.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  },

  async programarRecordatorio(nombre: string, inicio: Date, reservaId: string, solicitarPermiso = true): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    return encolar(async () => {
      const fecha = fechaRecordatorio(inicio, new Date());
      const Notifications = await cargarNotificaciones();
      const identifier = `reserva-${reservaId}`;
      if (!fecha) { await Notifications.cancelScheduledNotificationAsync(identifier); return false; }
      const programadoPara = fecha.toISOString();
      if (!solicitarPermiso) {
        const pendientes = await Notifications.getAllScheduledNotificationsAsync();
        if (pendientes.some(n => n.identifier === identifier && n.content.data?.programadoPara === programadoPara)) return true;
      }
      await Notifications.cancelScheduledNotificationAsync(identifier);
      if (!await this.pedirPermisos(solicitarPermiso)) return false;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: 'Tu turno empieza en dos horas', body: `${nombre}. Llevá el QR para ingresar.`, data: { reservaId, programadoPara }, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fecha, channelId: 'recordatorios' },
      });
      // Con el permiso concedido, el teléfono queda anotado para los avisos de suspensión.
      void this.registrarDispositivo().catch(() => undefined);
      return true;
    });
  },

  async cancelarRecordatorio(reservaId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await encolar(async () => {
      const Notifications = await cargarNotificaciones();
      await Notifications.cancelScheduledNotificationAsync(`reserva-${reservaId}`);
    });
  },

  async cancelarTodos(): Promise<void> {
    if (Platform.OS === 'web') return;
    await encolar(async () => {
      const Notifications = await cargarNotificaciones();
      await Notifications.cancelAllScheduledNotificationsAsync();
    });
  },

  /**
   * Escucha el toque en una notificación para abrir la reserva correspondiente.
   * Devuelve la función para dejar de escuchar.
   */
  async suscribirApertura(callback: (datos: Record<string, unknown>) => void): Promise<() => void> {
    if (Platform.OS === 'web') return () => { };
    const Notifications = await cargarNotificaciones();
    const suscripcion = Notifications.addNotificationResponseReceivedListener(respuesta => {
      const datos = respuesta.notification.request.content.data;
      callback((datos ?? {}) as Record<string, unknown>);
    });
    return () => suscripcion.remove();
  },

  /**
   * Anota el teléfono en el servidor para que pueda mandar los avisos de
   * suspensión (lluvia o mantenimiento). Sin token de Expo la app sigue
   * funcionando: los avisos quedan dentro de la app.
   */
  async registrarDispositivo(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const Notifications = await cargarNotificaciones();
      const permisos = await Notifications.getPermissionsAsync();
      const concedido = permisos.granted || permisos.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!concedido) return false;
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      if (!token) return false;
      await api.post('/dispositivos', { tokenExpo: token, plataforma: Platform.OS });
      return true;
    } catch {
      return false;
    }
  },
};
