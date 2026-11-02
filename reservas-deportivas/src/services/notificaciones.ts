import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuramos cómo se ve la notificación si la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificacionesService = {
  // 1. Pedir permisos (obligatorio en iOS y Android 13+)
  async pedirPermisos() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('¡Error! Necesitamos permisos para enviarte notificaciones.');
      return false;
    }
    return true;
  },

  // 2. Programar el recordatorio para un turno
  async programarRecordatorio(nombreEspacio: string, fechaTurno: Date) {
    const tienePermisos = await this.pedirPermisos();
    if (!tienePermisos) return;

    // Calculamos la hora: 2 horas antes del turno
    // const horaAviso = new Date(fechaTurno.getTime() - 2 * 60 * 60 * 1000); 

    // ⚠️ PARA PROBAR AHORA: Lo programamos para dentro de 5 segundos
    const horaAviso = new Date();
    horaAviso.setSeconds(horaAviso.getSeconds() + 5);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚽ Recordatorio de Turno',
        body: `Tu reserva en ${nombreEspacio} empieza pronto. ¡No te olvides de llevar el QR!`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: horaAviso },
    });

    console.log('Notificación programada para:', horaAviso);
  }
};