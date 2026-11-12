import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useHorarioActual() {
  const [ahora, setAhora] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setTimeout>;
    const actualizar = () => {
      clearTimeout(timer);
      const instante = new Date();
      setAhora(instante);
      timer = setTimeout(actualizar, 60_000 - instante.getTime() % 60_000);
    };
    actualizar();
    const escucha = AppState.addEventListener('change', estado => {
      if (estado === 'active') actualizar();
      else clearTimeout(timer);
    });
    return () => { clearTimeout(timer); escucha.remove(); };
  }, []));
  return ahora;
}
