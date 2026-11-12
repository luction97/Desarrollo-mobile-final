import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useSinRed() {
  const [sinRed, setSinRed] = useState(false);
  useEffect(() => {
    let vigente = true;
    let huboEvento = false;
    const actualizar = (estado: Network.NetworkState) => {
      if (vigente) setSinRed(estado.isConnected === false || estado.isInternetReachable === false);
    };
    const escucha = Network.addNetworkStateListener(estado => {
      huboEvento = true;
      actualizar(estado);
    });
    void Network.getNetworkStateAsync().then(estado => {
      if (!huboEvento) actualizar(estado);
    }).catch(() => undefined);
    return () => { vigente = false; escucha.remove(); };
  }, []);
  return sinRed;
}
