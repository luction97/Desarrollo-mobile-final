import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const notificacionesService = {
  async pedirPermisos() {
    if (Platform.OS === 'web') return false;

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

  async programarRecordatorio(nombreEspacio: string, fechaTurno: Date) {
    if (Platform.OS === 'web') {
      console.log('🔔 [WEB] Notificación simulada. En el celular sí va a vibrar y aparecer.');
      return; 
    }

    const tienePermisos = await this.pedirPermisos();
    if (!tienePermisos) return;

    // Pendiente E5: reemplazar el retardo corto de desarrollo por 2 horas antes de fechaTurno.
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