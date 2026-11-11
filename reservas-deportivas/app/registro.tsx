import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScrollScreen, Text, TextField, uiLayout } from '../src/components/ui';
import { layout, spacing } from '../src/theme';
import { useAuth } from '../src/context/AuthContext';

export default function RegistroScreen() {
  const { registro } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ volverA?: string; espacioId?: string; fecha?: string }>();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const registrar = async () => {
    if (cargando) return;
    setError('');
    if (!nombre.trim() || !email.trim() || !telefono.trim() || !contrasena) { setError('Completá todos los campos.'); return; }
    if (contrasena.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setCargando(true);
    try {
      await registro({ nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim(), contrasena });
      if (params.volverA === 'reservas') router.replace('/(tabs)/two');
      else router.replace({ pathname: '/(tabs)', params: { espacioId: params.espacioId, fecha: params.fecha } });
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta.'); }
    finally { setCargando(false); }
  };

  return <KeyboardAvoidingView style={uiLayout.grow} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollScreen>
      <View style={{ width: '100%', maxWidth: layout.formWidth, alignSelf: 'center', gap: spacing.xl }}>
        {error !== '' && <Text accessibilityRole="alert" selectable tone="danger">{error}</Text>}
        <TextField label="Nombre" value={nombre} onChangeText={setNombre} autoComplete="name" editable={!cargando} maxLength={80} />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!cargando} maxLength={254} />
        <TextField label="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" autoComplete="tel" editable={!cargando} maxLength={30} />
        <TextField label="Contraseña" value={contrasena} onChangeText={setContrasena} secureTextEntry autoComplete="new-password" editable={!cargando} maxLength={200} onSubmitEditing={registrar} />
        <Button title="Crear cuenta" onPress={registrar} loading={cargando} />
      </View>
    </ScrollScreen>
  </KeyboardAvoidingView>;
}
