import { WebView } from 'react-native-webview';
import { IDENTIFICACION_MAPA } from '../../mapa/modelo';

export interface VisorMapaProps {
  html: string;
  onMensaje: (datos: string) => void;
  onError: () => void;
}

export function VisorMapa({ html, onMensaje, onError }: VisorMapaProps) {
  return <WebView
    source={{ html }}
    originWhitelist={['*']}
    applicationNameForUserAgent={IDENTIFICACION_MAPA}
    cacheEnabled
    cacheMode="LOAD_DEFAULT"
    mixedContentMode="never"
    allowFileAccess={false}
    allowFileAccessFromFileURLs={false}
    allowUniversalAccessFromFileURLs={false}
    geolocationEnabled={false}
    thirdPartyCookiesEnabled={false}
    javaScriptCanOpenWindowsAutomatically={false}
    setSupportMultipleWindows={false}
    nestedScrollEnabled
    onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('about:blank#')}
    onMessage={event => onMensaje(event.nativeEvent.data)}
    onError={onError}
    onHttpError={onError}
    onRenderProcessGone={onError}
    onContentProcessDidTerminate={onError}
    style={{ flex: 1, backgroundColor: '#edf1eb' }}
  />;
}
