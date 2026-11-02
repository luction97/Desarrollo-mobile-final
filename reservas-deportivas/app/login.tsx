import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  // Cambiamos el estado de "password" a "contrasena"
  const [contrasena, setContrasena] = useState(''); 
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    // Validamos la nueva variable
    if (!email || !contrasena) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    
    setCargando(true);
    try {
      // Le pasamos la contraseña a la función login
      await login(email, contrasena);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error de inicio de sesión', error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={contrasena} // Usamos la nueva variable
        onChangeText={setContrasena} // Usamos el nuevo setter
        secureTextEntry
      />
      
      <Button 
        title={cargando ? "Ingresando..." : "Ingresar"} 
        onPress={handleLogin} 
        disabled={cargando}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 15 },
});