import { createElement, useEffect, useRef } from 'react';
import type { VisorMapaProps } from './VisorMapa';

export function VisorMapa({ html, onMensaje, onError }: VisorMapaProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const recibir = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && typeof event.data === 'string') onMensaje(event.data);
    };
    window.addEventListener('message', recibir);
    return () => window.removeEventListener('message', recibir);
  }, [onMensaje]);
  return createElement('iframe', {
    ref: frame, title: 'Mapa de complejos deportivos', srcDoc: html,
    sandbox: 'allow-scripts', referrerPolicy: 'strict-origin-when-cross-origin',
    onError, style: { width: '100%', height: '100%', border: 0 },
  });
}
