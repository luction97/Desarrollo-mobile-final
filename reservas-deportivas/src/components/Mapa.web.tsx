import { View, Text, StyleSheet } from 'react-native';

export function Mapa() {
  return (
    <View style={styles.map}>
      <Text>El mapa interactivo solo se ve en el celular.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, borderRadius: 10, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
});