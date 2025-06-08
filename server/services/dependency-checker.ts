import { pool } from "../lib/db";
import { storage } from "../storage";

// Logging mejorado para depuración
const log = (message: string, ...args: any[]) => {
  console.log(`[DependencyChecker] ${message}`, ...args);
};

// Tipos de dependencias de un grupo
export interface GroupDependencies {
  hasDependencies: boolean;
  details: {
    students?: number;
    assignments?: number;
    schedules?: number;
    teachers?: number;
    tasks?: number;
    observaciones?: number;
    avisos?: number;
    asignacionesCriterios?: number;
    grades?: number; // Nueva: calificaciones asociadas
    attendance?: number; // Nueva: registros de asistencia
    error?: string;
    message?: string;
  };
}

// Información detallada sobre cada tipo de dependencia
export interface DetailedDependencies {
  students: {
    id: number;
    nombreCompleto: string;
  }[];
  assignments: {
    id: number;
    materiaId: number;
    nombreMateria: string;
    profesorId: number;
    nombreProfesor: string;
  }[];
  schedules: {
    id: number;
    dia: string;
    horaInicio: string;
    horaFin: string;
    materiaId: number;
    nombreMateria: string;
  }[];
  teachers: {
    id: number;
    nombreCompleto: string;
  }[];
  grades: {
    count: number;
    materias: {
      id: number;
      nombre: string;
      calificaciones: number;
    }[];
  };
  attendance: {
    count: number;
  };
}

// Opciones para el proceso de limpieza
export interface CleanupOptions {
  archiveGroup?: boolean;
  moveStudentsToGroupId?: number;
  unlinkSubjects?: boolean;
  removeSchedules?: boolean;
  removeTeachers?: boolean;
}

/**
 * Verifica todas las dependencias de un grupo antes de permitir su eliminación
 * @param groupId ID del grupo a verificar
 * @returns Objeto con información sobre dependencias encontradas
 */
export async function checkGroupDependencies(groupId: number): Promise<GroupDependencies> {
  const dependencies: GroupDependencies = {
    hasDependencies: false,
    details: {}
  };
  
  try {
    // 1. Verificar estudiantes asociados
    const studentsResult = await pool.query(`
      SELECT COUNT(*) as total FROM alumnos WHERE grupo_id = $1
    `, [groupId]);
    
    dependencies.details.students = parseInt(studentsResult.rows[0].total);
    
    // 2. Verificar asignaciones de materias
    const assignmentsResult = await pool.query(`
      SELECT COUNT(*) as total FROM asignaciones_materia WHERE grupo_id = $1
    `, [groupId]);
    
    dependencies.details.assignments = parseInt(assignmentsResult.rows[0].total);
    
    // 3. Verificar horarios
    const schedulesResult = await pool.query(`
      SELECT COUNT(*) as total FROM schedules WHERE grupo_id = $1
    `, [groupId]);
    
    dependencies.details.schedules = parseInt(schedulesResult.rows[0].total);
    
    // 4. Verificar profesores asignados
    const teachersResult = await pool.query(`
      SELECT COUNT(*) as total FROM group_teachers WHERE group_id = $1
    `, [groupId]);
    
    dependencies.details.teachers = parseInt(teachersResult.rows[0].total);
    
    // 5. Verificar tareas
    try {
      const tasksResult = await pool.query(`
        SELECT COUNT(*) as total FROM tareas WHERE grupo_id = $1
      `, [groupId]);
      
      dependencies.details.tasks = parseInt(tasksResult.rows[0].total);
    } catch (err) {
      console.log("Tabla tareas no encontrada o error al consultar:", err);
      dependencies.details.tasks = 0;
    }
    
    // 6. Verificar observaciones
    try {
      const observacionesResult = await pool.query(`
        SELECT COUNT(*) as total FROM observaciones WHERE grupo_id = $1
      `, [groupId]);
      
      dependencies.details.observaciones = parseInt(observacionesResult.rows[0].total);
    } catch (err) {
      console.log("Tabla observaciones no encontrada o error al consultar:", err);
      dependencies.details.observaciones = 0;
    }
    
    // 7. Verificar avisos
    try {
      const avisosResult = await pool.query(`
        SELECT COUNT(*) as total FROM avisos WHERE grupo_id = $1
      `, [groupId]);
      
      dependencies.details.avisos = parseInt(avisosResult.rows[0].total);
    } catch (err) {
      console.log("Tabla avisos no encontrada o error al consultar:", err);
      dependencies.details.avisos = 0;
    }
    
    // 8. Verificar asignaciones de criterios
    try {
      const criteriosResult = await pool.query(`
        SELECT COUNT(*) as total FROM asignaciones_criterios WHERE grupo_id = $1
      `, [groupId]);
      
      dependencies.details.asignacionesCriterios = parseInt(criteriosResult.rows[0].total);
    } catch (err) {
      console.log("Tabla asignaciones_criterios no encontrada o error al consultar:", err);
      dependencies.details.asignacionesCriterios = 0;
    }
    
    // 9. Verificar calificaciones
    try {
      // Para verificar calificaciones, necesitamos los IDs de estudiantes en el grupo
      const studentIdsResult = await pool.query(`
        SELECT id FROM alumnos WHERE grupo_id = $1
      `, [groupId]);
      
      // Si hay estudiantes, verificamos si tienen calificaciones
      if (studentIdsResult.rows.length > 0) {
        const studentIds = studentIdsResult.rows.map((row: any) => row.id);
        
        const gradesResult = await pool.query(`
          SELECT COUNT(*) as total FROM calificaciones 
          WHERE alumno_id = ANY($1)
        `, [studentIds]);
        
        dependencies.details.grades = parseInt(gradesResult.rows[0].total);
      } else {
        dependencies.details.grades = 0;
      }
    } catch (err) {
      console.log("Error al verificar calificaciones:", err);
      dependencies.details.grades = 0;
    }
    
    // 10. Verificar asistencias
    try {
      // Similar a calificaciones, necesitamos los IDs de estudiantes
      const studentIdsResult = await pool.query(`
        SELECT id FROM alumnos WHERE grupo_id = $1
      `, [groupId]);
      
      if (studentIdsResult.rows.length > 0) {
        const studentIds = studentIdsResult.rows.map((row: any) => row.id);
        
        const attendanceResult = await pool.query(`
          SELECT COUNT(*) as total FROM asistencias 
          WHERE alumno_id = ANY($1)
        `, [studentIds]);
        
        dependencies.details.attendance = parseInt(attendanceResult.rows[0].total);
      } else {
        dependencies.details.attendance = 0;
      }
    } catch (err) {
      console.log("Error al verificar asistencias:", err);
      dependencies.details.attendance = 0;
    }
    
    // Determinar si hay dependencias
    dependencies.hasDependencies = (
      (dependencies.details.students || 0) > 0 ||
      (dependencies.details.assignments || 0) > 0 ||
      (dependencies.details.schedules || 0) > 0 || 
      (dependencies.details.teachers || 0) > 0 ||
      (dependencies.details.tasks || 0) > 0 ||
      (dependencies.details.observaciones || 0) > 0 ||
      (dependencies.details.avisos || 0) > 0 ||
      (dependencies.details.asignacionesCriterios || 0) > 0 ||
      (dependencies.details.grades || 0) > 0 ||
      (dependencies.details.attendance || 0) > 0
    );
    
    return dependencies;
  } catch (error) {
    console.error("Error al verificar dependencias del grupo:", error);
    // En caso de error, asumimos que hay dependencias para evitar eliminar algo indebidamente
    return {
      hasDependencies: true,
      details: {
        error: "No se pudieron verificar las dependencias",
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Obtiene información detallada sobre las dependencias de un grupo
 * @param groupId ID del grupo a verificar
 * @returns Información detallada sobre las dependencias
 */
export async function getDetailedGroupDependencies(groupId: number): Promise<DetailedDependencies> {
  const detailedDependencies: DetailedDependencies = {
    students: [],
    assignments: [],
    schedules: [],
    teachers: [],
    grades: {
      count: 0,
      materias: []
    },
    attendance: {
      count: 0
    }
  };
  
  try {
    // 1. Obtener estudiantes
    const studentsResult = await pool.query(`
      SELECT id, nombre_completo as "nombreCompleto"
      FROM alumnos 
      WHERE grupo_id = $1
    `, [groupId]);
    
    detailedDependencies.students = studentsResult.rows;
    
    // 2. Obtener asignaciones de materias con nombres
    const assignmentsResult = await pool.query(`
      SELECT am.id, am.materia_id as "materiaId", m.nombre as "nombreMateria", 
             am.profesor_id as "profesorId", p.nombre_completo as "nombreProfesor"
      FROM asignaciones_materia am
      LEFT JOIN materias m ON am.materia_id = m.id
      LEFT JOIN profesores p ON am.profesor_id = p.id
      WHERE am.grupo_id = $1
    `, [groupId]);
    
    detailedDependencies.assignments = assignmentsResult.rows;
    
    // 3. Obtener horarios con nombres de materias
    const schedulesResult = await pool.query(`
      SELECT s.id, s.dia_semana as "dia", s.hora_inicio as "horaInicio", s.hora_fin as "horaFin",
             s.materia_id as "materiaId", m.nombre as "nombreMateria"
      FROM schedules s
      LEFT JOIN materias m ON s.materia_id = m.id
      WHERE s.grupo_id = $1
    `, [groupId]);
    
    detailedDependencies.schedules = schedulesResult.rows;
    
    // 4. Obtener profesores asignados
    const teachersResult = await pool.query(`
      SELECT p.id, p.nombre_completo as "nombreCompleto"
      FROM group_teachers gt
      JOIN profesores p ON gt.teacher_id = p.id
      WHERE gt.group_id = $1
    `, [groupId]);
    
    detailedDependencies.teachers = teachersResult.rows;
    
    // 5. Obtener información sobre calificaciones
    const studentIds = detailedDependencies.students.map(student => student.id);
    
    if (studentIds.length > 0) {
      // Contar calificaciones totales
      const gradesCountResult = await pool.query(`
        SELECT COUNT(*) as total 
        FROM calificaciones 
        WHERE alumno_id = ANY($1)
      `, [studentIds]);
      
      detailedDependencies.grades.count = parseInt(gradesCountResult.rows[0].total);
      
      // Obtener calificaciones por materia
      const gradesBySubjectResult = await pool.query(`
        SELECT m.id, m.nombre, COUNT(c.id) as calificaciones
        FROM materias m
        JOIN calificaciones c ON c.materia_id = m.id
        WHERE c.alumno_id = ANY($1)
        GROUP BY m.id, m.nombre
      `, [studentIds]);
      
      detailedDependencies.grades.materias = gradesBySubjectResult.rows;
    }
    
    // 6. Obtener información sobre asistencias
    if (studentIds.length > 0) {
      const attendanceCountResult = await pool.query(`
        SELECT COUNT(*) as total 
        FROM asistencias 
        WHERE alumno_id = ANY($1)
      `, [studentIds]);
      
      detailedDependencies.attendance.count = parseInt(attendanceCountResult.rows[0].total);
    }
    
    return detailedDependencies;
  } catch (error) {
    console.error("Error al obtener dependencias detalladas del grupo:", error);
    throw new Error(`No se pudieron obtener las dependencias detalladas: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Genera un mensaje en español indicando las dependencias activas de un grupo
 * @param dependencies Objeto de dependencias obtenido con checkGroupDependencies
 * @returns String formateado con el resumen de dependencias
 */
export function formatDependencyMessage(dependencies: GroupDependencies): string {
  if (!dependencies.hasDependencies) {
    return "No hay dependencias activas para este grupo.";
  }
  
  if (dependencies.details.error) {
    return `Error al verificar dependencias: ${dependencies.details.message || "Error desconocido"}`;
  }
  
  const messages: string[] = [];
  
  if ((dependencies.details.students || 0) > 0) {
    messages.push(`${dependencies.details.students} alumno(s) asignado(s) a este grupo`);
  }
  
  if ((dependencies.details.teachers || 0) > 0) {
    messages.push(`${dependencies.details.teachers} profesor(es) asignado(s) a este grupo`);
  }
  
  if ((dependencies.details.assignments || 0) > 0) {
    messages.push(`${dependencies.details.assignments} asignación(es) de materia asociada(s)`);
  }
  
  if ((dependencies.details.schedules || 0) > 0) {
    messages.push(`${dependencies.details.schedules} horario(s) configurado(s)`);
  }
  
  if ((dependencies.details.tasks || 0) > 0) {
    messages.push(`${dependencies.details.tasks} tarea(s) asociada(s)`);
  }
  
  if ((dependencies.details.observaciones || 0) > 0) {
    messages.push(`${dependencies.details.observaciones} observación(es) registrada(s)`);
  }
  
  if ((dependencies.details.avisos || 0) > 0) {
    messages.push(`${dependencies.details.avisos} aviso(s) dirigido(s) a este grupo`);
  }
  
  if ((dependencies.details.asignacionesCriterios || 0) > 0) {
    messages.push(`${dependencies.details.asignacionesCriterios} criterio(s) de evaluación asignado(s)`);
  }
  
  if ((dependencies.details.grades || 0) > 0) {
    messages.push(`${dependencies.details.grades} calificación(es) asociada(s) a alumnos del grupo`);
  }
  
  if ((dependencies.details.attendance || 0) > 0) {
    messages.push(`${dependencies.details.attendance} registro(s) de asistencia asociado(s) a alumnos del grupo`);
  }
  
  return `El grupo tiene las siguientes dependencias activas:\n• ${messages.join('\n• ')}`;
}

/**
 * Realiza la limpieza de las dependencias de un grupo según las opciones indicadas
 * @param groupId ID del grupo a limpiar
 * @param options Opciones de limpieza
 * @returns Resultados de la operación
 */
export async function cleanupGroupDependencies(
  groupId: number, 
  options: CleanupOptions
): Promise<{ success: boolean; message: string; details: Record<string, any> }> {
  const result = {
    success: true,
    message: "Operación de limpieza completada",
    details: {
      movedStudents: 0,
      unlinkedSubjects: 0,
      removedSchedules: 0,
      removedTeachers: 0,
      archivedGroup: false,
      errors: [] as string[]
    }
  };
  
  try {
    // 1. Mover estudiantes a otro grupo si se especificó
    if (options.moveStudentsToGroupId) {
      try {
        log("Moviendo estudiantes del grupo", groupId, "al grupo", options.moveStudentsToGroupId);
        
        // Obtener estudiantes del grupo actual
        const students = await storage.getStudentsByGroup(groupId);
        log(`Encontrados ${students.length} estudiantes para mover`);
        
        // Mover cada estudiante usando la capa de abstracción
        let movedCount = 0;
        for (const student of students) {
          await storage.updateStudent(student.id, { grupoId: options.moveStudentsToGroupId });
          movedCount++;
        }
        
        // Verificar que los estudiantes se movieron correctamente
        const remainingStudents = await storage.getStudentsByGroup(groupId);
        log(`Estudiantes restantes en grupo original: ${remainingStudents.length}`);
        
        result.details.movedStudents = movedCount;
      } catch (error) {
        const errorMsg = `Error al mover estudiantes: ${error instanceof Error ? error.message : String(error)}`;
        log(errorMsg);
        result.details.errors.push(errorMsg);
        result.success = false;
      }
    }
    
    // 2. Desvincular materias
    if (options.unlinkSubjects) {
      try {
        log("Desvinculando materias del grupo:", groupId);
        
        // Obtener asignaciones actuales de materias al grupo usando SQL directo
        // ya que el storage no tiene este método específico
        const assignmentsResult = await pool.query(`
          SELECT id, materia_id, profesor_id FROM asignaciones_materia 
          WHERE grupo_id = $1
        `, [groupId]);
        
        const assignments = assignmentsResult.rows;
        log(`Encontradas ${assignments.length} asignaciones de materias para desvincular`);
        
        // Eliminar cada asignación usando la capa de almacenamiento si está disponible,
        // o usando SQL directo como alternativa
        let unlinkedCount = 0;
        for (const assignment of assignments) {
          // Intentar usar storage si está disponible
          try {
            if (typeof storage.deleteSubjectAssignment === 'function') {
              await storage.deleteSubjectAssignment(assignment.id);
            } else {
              // Alternativa: SQL directo
              await pool.query(`DELETE FROM asignaciones_materia WHERE id = $1`, [assignment.id]);
            }
            unlinkedCount++;
            log(`Desvinculada asignación de materia ID: ${assignment.id}`);
          } catch (err) {
            log(`Error al desvincular materia ID: ${assignment.id}`, err);
            throw err;
          }
        }
        
        // Verificar que las asignaciones se hayan eliminado
        const remainingAssignmentsResult = await pool.query(`
          SELECT COUNT(*) as count FROM asignaciones_materia 
          WHERE grupo_id = $1
        `, [groupId]);
        
        const remainingCount = parseInt(remainingAssignmentsResult.rows[0].count);
        log(`Asignaciones restantes después de desvincular: ${remainingCount}`);
        
        result.details.unlinkedSubjects = unlinkedCount;
      } catch (error) {
        const errorMsg = `Error al desvincular materias: ${error instanceof Error ? error.message : String(error)}`;
        log(errorMsg);
        result.details.errors.push(errorMsg);
        result.success = false;
      }
    }
    
    // 3. Eliminar horarios
    if (options.removeSchedules) {
      try {
        log("Eliminando horarios del grupo:", groupId);
        
        // Obtener todos los horarios del grupo usando SQL directo
        // ya que el storage puede no tener este método específico
        const schedulesResult = await pool.query(`
          SELECT id, materia_id, grupo_id, dia_semana, hora_inicio, hora_fin 
          FROM schedules WHERE grupo_id = $1
        `, [groupId]);
        
        const schedules = schedulesResult.rows;
        log(`Encontrados ${schedules.length} horarios para eliminar`);
        
        // Eliminar cada horario individualmente
        let removedCount = 0;
        for (const schedule of schedules) {
          try {
            if (typeof storage.deleteSchedule === 'function') {
              await storage.deleteSchedule(schedule.id);
            } else {
              // Alternativa: SQL directo
              await pool.query(`DELETE FROM schedules WHERE id = $1`, [schedule.id]);
            }
            removedCount++;
            log(`Eliminado horario ID: ${schedule.id}`);
          } catch (err) {
            log(`Error al eliminar horario ID: ${schedule.id}`, err);
            throw err;
          }
        }
        
        // Verificar que los horarios se eliminaron
        const remainingSchedulesResult = await pool.query(`
          SELECT COUNT(*) as count FROM schedules WHERE grupo_id = $1
        `, [groupId]);
        
        const remainingCount = parseInt(remainingSchedulesResult.rows[0].count);
        log(`Horarios restantes después de la eliminación: ${remainingCount}`);
        
        result.details.removedSchedules = removedCount;
      } catch (error) {
        const errorMsg = `Error al eliminar horarios: ${error instanceof Error ? error.message : String(error)}`;
        log(errorMsg);
        result.details.errors.push(errorMsg);
        result.success = false;
      }
    }
    
    // 4. Desvincular profesores
    if (options.removeTeachers) {
      try {
        log("Desvinculando profesores del grupo:", groupId);
        
        // Obtener los profesores actuales asignados al grupo usando SQL directo
        const groupTeachersResult = await pool.query(`
          SELECT id, teacher_id, group_id FROM group_teachers WHERE group_id = $1
        `, [groupId]);
        
        const groupTeachers = groupTeachersResult.rows;
        log(`Encontrados ${groupTeachers.length} profesores para desvincular`);
        
        // Eliminar cada asignación de profesor
        let removedCount = 0;
        for (const groupTeacher of groupTeachers) {
          try {
            if (typeof storage.removeTeacherFromGroup === 'function') {
              await storage.removeTeacherFromGroup(groupId, groupTeacher.teacher_id);
            } else {
              // Alternativa: SQL directo
              await pool.query(`DELETE FROM group_teachers WHERE id = $1`, [groupTeacher.id]);
            }
            removedCount++;
            log(`Desvinculado profesor ID: ${groupTeacher.teacher_id} del grupo ID: ${groupId}`);
          } catch (err) {
            log(`Error al desvincular profesor ID: ${groupTeacher.teacher_id}`, err);
            throw err;
          }
        }
        
        // Verificar que los profesores han sido desvinculados
        const remainingTeachersResult = await pool.query(`
          SELECT COUNT(*) as count FROM group_teachers WHERE group_id = $1
        `, [groupId]);
        
        const remainingCount = parseInt(remainingTeachersResult.rows[0].count);
        log(`Profesores restantes asignados al grupo: ${remainingCount}`);
        
        result.details.removedTeachers = removedCount;
      } catch (error) {
        const errorMsg = `Error al desvincular profesores: ${error instanceof Error ? error.message : String(error)}`;
        log(errorMsg);
        result.details.errors.push(errorMsg);
        result.success = false;
      }
    }
    
    // 5. Archivar grupo (cambiar estatus)
    if (options.archiveGroup) {
      try {
        // Usar la capa de DatabaseStorage en lugar de SQL directo
        log("Archivando grupo:", groupId);
        await storage.updateGroup(groupId, { estado: 'archivado' });
        
        // Verificar que el grupo fue archivado correctamente
        const updatedGroup = await storage.getGroup(groupId);
        log("Estado del grupo después de archivar:", updatedGroup?.estado);
        
        if (updatedGroup && updatedGroup.estado === 'archivado') {
          result.details.archivedGroup = true;
        } else {
          throw new Error("No se pudo verificar el cambio de estado del grupo");
        }
      } catch (error) {
        const errorMsg = `Error al archivar grupo: ${error instanceof Error ? error.message : String(error)}`;
        log(errorMsg);
        result.details.errors.push(errorMsg);
        result.success = false;
      }
    }
    
    // Verificar si hubo errores y actualizar mensaje
    if (!result.success) {
      result.message = `La limpieza de grupo se completó parcialmente con errores: ${result.details.errors.join('; ')}`;
    } else if (
      result.details.movedStudents || 
      result.details.unlinkedSubjects || 
      result.details.removedSchedules || 
      result.details.removedTeachers || 
      result.details.archivedGroup
    ) {
      const summaryParts = [];
      
      if (result.details.movedStudents) {
        summaryParts.push(`${result.details.movedStudents} estudiante(s) movido(s)`);
      }
      
      if (result.details.unlinkedSubjects) {
        summaryParts.push(`${result.details.unlinkedSubjects} materia(s) desvinculada(s)`);
      }
      
      if (result.details.removedSchedules) {
        summaryParts.push(`${result.details.removedSchedules} horario(s) eliminado(s)`);
      }
      
      if (result.details.removedTeachers) {
        summaryParts.push(`${result.details.removedTeachers} profesor(es) desvinculado(s)`);
      }
      
      if (result.details.archivedGroup) {
        summaryParts.push("grupo archivado");
      }
      
      result.message = `Limpieza completada: ${summaryParts.join(', ')}`;
    } else {
      result.message = "No se realizaron cambios en el grupo";
    }
    
    return result;
  } catch (error) {
    console.error("Error general en la limpieza de grupo:", error);
    return {
      success: false,
      message: `Error al realizar la limpieza del grupo: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        errors: [String(error)],
        movedStudents: 0,
        unlinkedSubjects: 0,
        removedSchedules: 0,
        removedTeachers: 0,
        archivedGroup: false
      }
    };
  }
}

/**
 * Verifica si un grupo puede ser eliminado de forma segura
 * @param groupId ID del grupo a verificar
 * @returns Booleano indicando si el grupo puede eliminarse + mensaje descriptivo
 */
export async function canDeleteGroup(groupId: number): Promise<{ canDelete: boolean; reason: string }> {
  try {
    // 1. Verificar dependencias del grupo
    const dependencies = await checkGroupDependencies(groupId);
    
    // Si no hay dependencias, se puede eliminar
    if (!dependencies.hasDependencies) {
      return { 
        canDelete: true, 
        reason: "El grupo no tiene dependencias y puede ser eliminado de forma segura."
      };
    }
    
    // 2. Verificar si sólo hay dependencias que se pueden eliminar automáticamente
    const onlyHasRemovableDependencies = 
      (dependencies.details.students || 0) === 0 &&
      (dependencies.details.assignments || 0) === 0 &&
      (dependencies.details.grades || 0) === 0 &&
      (dependencies.details.attendance || 0) === 0;
      
    if (onlyHasRemovableDependencies) {
      return {
        canDelete: true,
        reason: "El grupo tiene dependencias menores que pueden ser eliminadas automáticamente (horarios, vinculaciones de profesores)."
      };
    }
    
    // 3. Si hay estudiantes o calificaciones, no se puede eliminar
    const criticalDependencies = [];
    
    if ((dependencies.details.students || 0) > 0) {
      criticalDependencies.push(`${dependencies.details.students} alumno(s)`);
    }
    
    if ((dependencies.details.grades || 0) > 0) {
      criticalDependencies.push(`${dependencies.details.grades} calificación(es)`);
    }
    
    if ((dependencies.details.attendance || 0) > 0) {
      criticalDependencies.push(`${dependencies.details.attendance} registro(s) de asistencia`);
    }
    
    if (criticalDependencies.length > 0) {
      return {
        canDelete: false,
        reason: `No se puede eliminar el grupo porque tiene dependencias críticas: ${criticalDependencies.join(', ')}. Utilice el Asistente de Limpieza para resolver estas dependencias primero.`
      };
    }
    
    // 4. Si llegamos aquí, hay otras dependencias pero no son críticas
    return {
      canDelete: false,
      reason: "El grupo tiene dependencias que deben ser gestionadas antes de eliminar. Utilice el Asistente de Limpieza para resolverlas."
    };
  } catch (error) {
    console.error("Error al verificar si el grupo puede ser eliminado:", error);
    return {
      canDelete: false,
      reason: `Error al verificar si el grupo puede ser eliminado: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}