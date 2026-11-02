import * as SQLite from 'expo-sqlite';
import { Turno } from '../tipos';

// VERSIÓN CELULAR: Usa SQLite real
const db = SQLite.openDatabaseSync('reservas.db');

export async function inicializarDB() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS turnos (
      id TEXT PRIMARY KEY,
      espacioId TEXT,
      fecha TEXT,
      inicio TEXT,
      fin TEXT,
      estado TEXT,
      motivoBloqueo TEXT
    );
  `);
}

export async function guardarTurnosLocalmente(turnos: Turno[]) {
  await db.withTransactionAsync(async () => {
    for (const t of turnos) {
      await db.runAsync(
        'INSERT OR REPLACE INTO turnos (id, espacioId, fecha, inicio, fin, estado, motivoBloqueo) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.espacioId, t.fecha, t.inicio, t.fin, t.estado, t.motivoBloqueo]
      );
    }
  });
}

export async function obtenerTurnosLocales(espacioId: string, fecha: string): Promise<Turno[]> {
  return await db.getAllAsync<Turno>(
    'SELECT * FROM turnos WHERE espacioId = ? AND fecha = ? ORDER BY inicio ASC',
    [espacioId, fecha]
  );
}