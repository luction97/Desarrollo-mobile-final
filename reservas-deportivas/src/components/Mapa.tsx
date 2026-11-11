import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

export function Mapa({ latitud, longitud, nombre }: { latitud: number, longitud: number, nombre: string }) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: latitud,
        longitude: longitud,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={true}
    >
      <Marker
        coordinate={{ latitude: latitud, longitude: longitud }}
        title={nombre}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, borderRadius: 10, overflow: 'hidden' },
});