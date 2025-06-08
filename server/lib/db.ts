import { pool } from '../db';

// Función auxiliar para realizar consultas SQL
export const query = async (text: string, params: any[] = []) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Consulta SQL ejecutada:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error en consulta SQL:', text, error);
    throw error;
  }
};

// Re-exportamos pool para mantener compatibilidad
export { pool };