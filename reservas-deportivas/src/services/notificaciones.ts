import { Platform } from 'react-native';
import { fechaRecordatorio } from '../utils/recordatorios';

let carga: Promise<typeof import('expo-notifications')> | undefined;

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

  async pedirPermisos(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const Notifications = await cargarNotificaciones();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recordatorios', {
        name: 'Recordatorios de reservas', importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted || actual.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
    const permiso = await Notifications.requestPermissionsAsync();
    return permiso.granted || permiso.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  },

  async programarRecordatorio(nombre: string, inicio: Date, reservaId: string): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const fecha = fechaRecordatorio(inicio, new Date());
    await this.cancelarRecordatorio(reservaId);
    if (!fecha || !await this.pedirPermisos()) return false;
    const Notifications = await cargarNotificaciones();
    await Notifications.scheduleNotificationAsync({
      identifier: `reserva-${reservaId}`,
      content: { title: 'Tu turno empieza en dos horas', body: `${nombre}. Llevá el QR para ingresar.`, data: { reservaId }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fecha, channelId: 'recordatorios' },
    });
    return true;
  },

  async cancelarRecordatorio(reservaId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    const Notifications = await cargarNotificaciones();
    await Notifications.cancelScheduledNotificationAsync(`reserva-${reservaId}`);
  },

  async cancelarTodos(): Promise<void> {
    if (Platform.OS === 'web') return;
    const Notifications = await cargarNotificaciones();
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
