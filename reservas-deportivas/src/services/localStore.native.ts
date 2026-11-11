import * as SQLite from 'expo-sqlite';

let apertura: Promise<SQLite.SQLiteDatabase> | undefined;

async function base() {
  if (!apertura) {
    apertura = (async () => {
      const db = await SQLite.openDatabaseAsync('reservas.db');
      await db.execAsync('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS cache_app (clave TEXT PRIMARY KEY NOT NULL, datos TEXT NOT NULL);');
      return db;
    })().catch(error => { apertura = undefined; throw error; });
  }
  return apertura;
}

export async function leerLocal<T>(clave: string): Promise<T | null> {
  const db = await base();
  const fila = await db.getFirstAsync<{ datos: string }>('SELECT datos FROM cache_app WHERE clave = ?', clave);
  if (!fila) return null;
  try { return JSON.parse(fila.datos) as T; } catch { return null; }
}

export async function escribirLocal(clave: string, datos: unknown): Promise<void> {
  const db = await base();
  await db.runAsync('INSERT OR REPLACE INTO cache_app (clave, datos) VALUES (?, ?)', clave, JSON.stringify(datos));
}
