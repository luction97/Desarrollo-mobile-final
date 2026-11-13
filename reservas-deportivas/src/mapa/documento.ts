import leaflet from '../../assets/leaflet/bundle.json';
import { CoordenadasMapa, PuntoMapa, puntoValido, coordenadasValidas, ATRIBUCION_URL } from './modelo';

export function crearDocumentoMapa(puntos: PuntoMapa[], ubicacion: CoordenadasMapa | null, sinRed: boolean): string {
  // Evita que datos del catálogo cierren un script o introduzcan HTML ejecutable.
  const datos = JSON.stringify({ puntos: puntos.filter(puntoValido),
    ubicacion: coordenadasValidas(ubicacion) ? ubicacion : null, sinRed })
    .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https://tile.openstreetmap.org; connect-src 'none'; base-uri 'none'; form-action 'none'">
<style>${leaflet.css}</style><style>
html,body,#map{height:100%;width:100%;margin:0;background:#edf1eb;font-family:system-ui}
.leaflet-control-zoom a{width:48px;height:48px;line-height:48px}
.leaflet-control-attribution{font-size:12px;max-width:85%;white-space:normal}
.leaflet-popup-content{font-size:14px;max-width:190px}
</style></head><body><div id="map" role="region" aria-label="Mapa de complejos deportivos"></div>
<script>${leaflet.javascript}</script><script>
(function(){
  var datos=${datos};
  function enviar(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s);}else{window.parent.postMessage(s,'*');}}
  function estado(s){enviar({tipo:'estado',estado:s});}
  try {
    var map=L.map('map',{zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,minZoom:3,maxZoom:18});
    var ubicaciones=[];
    datos.puntos.forEach(function(p){
      var ll=[p.latitud,p.longitud];ubicaciones.push(ll);
      var texto=document.createElement('span');texto.textContent=p.nombre;
      L.circleMarker(ll,{radius:10,color:'#14532d',fillColor:'#2e7d32',fillOpacity:1,weight:3})
        .addTo(map).bindPopup(texto,{closeButton:false,offset:[0,-4]})
        .on('click',function(){enviar({tipo:'seleccion',id:p.id});});
    });
    if(ubicaciones.length===1){map.setView(ubicaciones[0],15);}
    else if(ubicaciones.length){map.fitBounds(ubicaciones,{padding:[40,45],maxZoom:15});}
    else{map.setView([0,0],3);}
    if(datos.ubicacion){
      L.circleMarker([datos.ubicacion.latitud,datos.ubicacion.longitud],{radius:8,color:'#fff',fillColor:'#1565c0',fillOpacity:1,weight:3})
        .addTo(map).bindTooltip('Tu ubicación');
    }
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.attributionControl.addAttribution('© <a href="${ATRIBUCION_URL}">OpenStreetMap</a> contributors');
    document.addEventListener('click',function(e){var a=e.target.closest('a');if(a){e.preventDefault();enviar({tipo:'enlace',url:a.href});}});
    if(datos.sinRed){estado('error');return;}
    var errores=0,cargas=0,ultimo='';
    function notificar(s){if(s!==ultimo){ultimo=s;estado(s);}}
    var plazo=setTimeout(function(){notificar('error');},12000);
    var tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:18,keepBuffer:0,updateWhenIdle:true,detectRetina:false
    });
    tiles.on('loading',function(){errores=0;cargas=0;notificar('cargando');clearTimeout(plazo);plazo=setTimeout(function(){notificar('error');},12000);});
    tiles.on('tileerror',function(){errores++;notificar('error');});
    tiles.on('tileload',function(){cargas++;});
    tiles.on('load',function(){clearTimeout(plazo);notificar(errores || !cargas ? 'error' : 'disponible');});
    tiles.addTo(map);
  } catch(e){estado('error');}
})();</script></body></html>`;
}
