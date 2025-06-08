// Script para generar calificaciones vacías para los estudiantes especificados
import { pool, db } from '../server/db.js';
import { DatabaseStorage } from '../server/database-storage.js';

async function main() {
  try {
    console.log('Iniciando generación de calificaciones vacías para estudiantes...');
    
    const storage = new DatabaseStorage();
    
    // IDs de los estudiantes a procesar
    const studentIds = [2, 3, 4]; // Alexa, Dania y Andrea
    const groupId = 2; // Grupo 1-A
    
    for (const studentId of studentIds) {
      console.log(`Procesando estudiante ID ${studentId}...`);
      await storage.generateEmptyGradesForStudent(studentId, groupId);
      console.log(`Calificaciones generadas para estudiante ID ${studentId}`);
    }
    
    console.log('Proceso completado exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error al generar calificaciones:', error);
    process.exit(1);
  }
}

main();