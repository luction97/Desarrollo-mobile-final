import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { autenticarConBiometria } from '../src/services/biometria';
import { authService } from '../src/services/auth';
import { Usuario } from '../src/tipos';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons'; 

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState('');
  
  const [usuarioGuardado, setUsuarioGuardado] = useState<Usuario | null>(null);
  const [tieneBiometria, setTieneBiometria] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    authService.obtenerUsuarioGuardado().then(user => {
      if (user) setUsuarioGuardado(user);
    });

    if (Platform.OS !== 'web') {
      LocalAuthentication.hasHardwareAsync().then(has => {
        if (has) {
          LocalAuthentication.isEnrolledAsync().then(enrolled => {
            if (enrolled) setTieneBiometria(true);
          });
        }
      });
    } else {
      setTieneBiometria(true); 
    }
  }, []);

  const handleLogin = async () => {
    setErrorMensaje('');
    if (!email || !contrasena) {
      setErrorMensaje('Completá todos los campos');
      return;
    }
    
    setCargando(true);
    try {
      await login(email, contrasena);
      router.replace('/(tabs)');
    } catch (error: any) {
      setErrorMensaje(error.message || 'Error desconocido');
    } finally {
      setCargando(false);
    }
  };

  const handleBiometria = async () => {
    const exito = await autenticarConBiometria();
    if (exito && usuarioGuardado) {
      router.replace('/(tabs)');
    } else {
      setErrorMensaje('Autenticación biométrica fallida o cancelada.');
    }
  };

  const handleLogoutCompleto = async () => {
    await authService.logout();
    setUsuarioGuardado(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      
      {errorMensaje ? (
        <Text style={{ color: 'red', marginBottom: 15, textAlign: 'center', fontWeight: 'bold' }}>
          {errorMensaje}
        </Text>
      ) : null}

      {usuarioGuardado && tieneBiometria ? (
        <View style={styles.biometriaContainer}>
          <Text style={styles.welcomeBack}>¡Hola de nuevo, {usuarioGuardado.nombre.split(' ')[0]}!</Text>
          
          <TouchableOpacity style={styles.biometriaButton} onPress={handleBiometria}>
            <Ionicons name="finger-print" size={50} color="#2E7D32" />
            <Text style={styles.biometriaText}>Ingresar con Huella / Rostro</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogoutCompleto}>
            <Text style={styles.switchUserText}>Ingresar con otra cuenta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
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
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
          />
          
          <Button 
            title={cargando ? "Ingresando..." : "Ingresar"} 
            onPress={handleLogin} 
            disabled={cargando}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 15 },
  
  biometriaContainer: { alignItems: 'center', marginTop: 20 },
  welcomeBack: { fontSize: 18, fontWeight: 'bold', marginBottom: 30, color: '#333' },
  biometriaButton: { 
    backgroundColor: '#E8F5E9', 
    padding: 30, 
    borderRadius: 20, 
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#C8E6C9'
  },
  biometriaText: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginTop: 10 },
  switchUserText: { color: '#1976D2', marginTop: 20, textDecorationLine: 'underline' }
});