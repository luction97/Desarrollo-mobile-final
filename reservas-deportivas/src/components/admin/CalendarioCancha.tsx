import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Text, uiLayout } from '../ui';
import { spacing, useTheme } from '../../theme';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface CalendarioCanchaProps {
  /** Fecha elegida, "AAAA-MM-DD". */
  valor: string;
  onChange: (fecha: string) => void;
  /** No se pueden elegir fechas anteriores (la API rechaza fechas pasadas). */
  minimo?: string;
  maximo?: string;
}

const partes = (fecha: string) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return { anio, mes, dia };
};

const conDia = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

/** Calendario mensual visual: se elige el día con un toque, sin escribir fechas. */
export function CalendarioCancha({ valor, onChange, minimo, maximo }: CalendarioCanchaProps) {
  const { colors } = useTheme();
  const inicial = partes(valor);
  const [mes, setMes] = useState({ anio: inicial.anio, mes: inicial.mes });

  const celdas = useMemo(() => {
    const primero = new Date(Date.UTC(mes.anio, mes.mes - 1, 1));
    // La semana arranca el lunes.
    const desplazamiento = (primero.getUTCDay() + 6) % 7;
    const total = new Date(Date.UTC(mes.anio, mes.mes, 0)).getUTCDate();
    const lista: (string | null)[] = Array.from({ length: desplazamiento }, () => null);
    for (let dia = 1; dia <= total; dia++) lista.push(conDia(mes.anio, mes.mes, dia));
    while (lista.length % 7 !== 0) lista.push(null);
    return lista;
  }, [mes]);

  const mesMinimo = minimo ? partes(minimo) : null;
  const mesMaximo = maximo ? partes(maximo) : null;
  const puedeVerAnterior = !mesMinimo || mes.anio > mesMinimo.anio || (mes.anio === mesMinimo.anio && mes.mes > mesMinimo.mes);
  const puedeVerSiguiente = !mesMaximo || mes.anio < mesMaximo.anio || (mes.anio === mesMaximo.anio && mes.mes < mesMaximo.mes);

  const mover = (delta: number) => {
    const total = mes.mes - 1 + delta;
    const anio = mes.anio + Math.floor(total / 12);
    const mesNumero = ((total % 12) + 12) % 12 + 1;
    setMes({ anio, mes: mesNumero });
  };

  const deshabilitada = (fecha: string) =>
    (minimo !== undefined && fecha < minimo) || (maximo !== undefined && fecha > maximo);

  return <View style={styles.contenedor}>
    <View style={uiLayout.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" disabled={!puedeVerAnterior}
        onPress={() => mover(-1)} style={[styles.flecha, { opacity: puedeVerAnterior ? 1 : 0.35 }]}>
        <Ionicons name="chevron-back" size={spacing.xl} color={colors.primary} />
      </Pressable>
      <Text variant="subtitle" style={uiLayout.grow} accessibilityRole="header">
        {MESES[mes.mes - 1]} {mes.anio}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" disabled={!puedeVerSiguiente}
        onPress={() => mover(1)} style={[styles.flecha, { opacity: puedeVerSiguiente ? 1 : 0.35 }]}>
        <Ionicons name="chevron-forward" size={spacing.xl} color={colors.primary} />
      </Pressable>
    </View>
    <View style={styles.grilla}>
      {DIAS.map(dia => <Text key={dia} variant="caption" tone="muted" style={styles.cabecera}>{dia}</Text>)}
    </View>
    <View style={styles.grilla}>
      {celdas.map((fecha, indice) => {
        if (!fecha) return <View key={`vacio-${indice}`} style={styles.columna} />;
        const elegido = fecha === valor;
        const bloqueada = deshabilitada(fecha);
        const { dia } = partes(fecha);
        return <Pressable key={fecha} accessibilityRole="button" disabled={bloqueada}
          accessibilityLabel={`${dia} de ${MESES[mes.mes - 1]} de ${mes.anio}`}
          accessibilityState={{ selected: elegido, disabled: bloqueada }}
          onPress={() => onChange(fecha)}
          style={[styles.columna, styles.celda, {
            backgroundColor: elegido ? colors.primary : 'transparent',
            borderColor: elegido ? colors.primary : colors.border,
            opacity: bloqueada ? 0.35 : 1,
          }]}>
          <Text variant="label" style={{ color: elegido ? colors.onPrimary : colors.text }}>{dia}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.sm },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  cabecera: { width: `${100 / 7}%`, textAlign: 'center' },
  columna: {
    width: `${100 / 7}%`, aspectRatio: 1, maxHeight: 44, minHeight: 38,
    marginBottom: spacing.xs,
  },
  celda: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10 },
  flecha: { padding: spacing.xs },
});
