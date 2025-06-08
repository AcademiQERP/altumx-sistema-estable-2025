// Script para ejecutar manualmente
import { db } from '../server/db.ts';
import { DatabaseStorage } from '../server/database-storage.ts';
import { eq, and } from 'drizzle-orm';
import { criteriaGrades, criteriaAssignments } from '../shared/schema.ts';

// IDs de estudiantes mencionados en la prueba
const studentIds = [2, 3, 4]; // Alexa, Dania y Andrea Cebreros Contreras
const groupId = 2; // Grupo 1-A

async function generateEmptyGradesForStudent(studentId, groupId) {
  try {
    console.log(`Generando calificaciones vacías para estudiante ${studentId} en grupo ${groupId}`);
    
    // 1. Obtener todas las asignaciones de criterios para el grupo
    const assignments = await db.query.criteriaAssignments.findMany({
      where: eq(criteriaAssignments.grupoId, groupId),
    });
    
    console.log(`Encontradas ${assignments.length} asignaciones de criterios para el grupo ${groupId}`);
    
    if (assignments.length === 0) {
      console.log(`No hay criterios asignados al grupo ${groupId}, no se generarán calificaciones`);
      return;
    }
    
    // Períodos a utilizar
    const periodos = ["1er Trimestre", "2do Trimestre", "3er Trimestre"];
    
    // 2. Para cada asignación de criterio, crear un registro de calificación vacío para cada período
    for (const asignacion of assignments) {
      for (const periodo of periodos) {
        try {
          // Verificar si ya existe una calificación para este criterio, estudiante y período
          const existingGrade = await db.select()
            .from(criteriaGrades)
            .where(
              and(
                eq(criteriaGrades.alumnoId, studentId),
                eq(criteriaGrades.criterioId, asignacion.criterioId),
                eq(criteriaGrades.materiaId, asignacion.materiaId),
                eq(criteriaGrades.periodo, periodo)
              )
            );
          
          // Si no existe o está vacío, crear una calificación vacía
          if (!existingGrade || existingGrade.length === 0) {
            await db.insert(criteriaGrades).values({
              alumnoId: studentId,
              criterioId: asignacion.criterioId,
              materiaId: asignacion.materiaId,
              valor: 0, // Calificación inicial 0
              periodo: periodo,
              observaciones: null
            });
            
            console.log(`Calificación creada para estudiante ${studentId}, criterio ${asignacion.criterioId}, materia ${asignacion.materiaId}, período ${periodo}`);
          } else {
            console.log(`Ya existe calificación para estudiante ${studentId}, criterio ${asignacion.criterioId}, materia ${asignacion.materiaId}, período ${periodo}`);
          }
        } catch (err) {
          console.error(`Error procesando criterio ${asignacion.criterioId}, materia ${asignacion.materiaId}, período ${periodo}:`, err);
        }
      }
    }
    
    console.log(`Proceso de generación de calificaciones completado para estudiante ${studentId}`);
  } catch (error) {
    console.error(`Error al generar calificaciones vacías para estudiante ${studentId}:`, error);
  }
}

async function main() {
  try {
    console.log("Iniciando proceso de generación de calificaciones por criterio para los estudiantes...");
    
    // Procesar cada estudiante
    for (const studentId of studentIds) {
      await generateEmptyGradesForStudent(studentId, groupId);
    }
    
    console.log("Proceso completado exitosamente.");
    process.exit(0);
  } catch (error) {
    console.error("Error en el proceso:", error);
    process.exit(1);
  }
}

main();