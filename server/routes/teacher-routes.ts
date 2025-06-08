import { Router, Express } from "express";
import { storage } from "../storage";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// Clave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || "edumex_secret_key";

const router = Router();

// Obtener tareas filtradas para el profesor autenticado (grupos asignados activos)
router.get("/tasks", async (req, res) => {
  try {
    // Verificar que el usuario está autenticado y es un profesor
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    if (user.rol !== "docente" && user.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. Rol no autorizado" });
    }
    
    // Si es admin, devolver todas las tareas
    if (user.rol === "admin") {
      const allTasks = await storage.getTasks();
      return res.json(allTasks);
    }
    
    // Si es profesor, obtener su ID numérico
    const profesorId = user.profesorId;
    
    if (!profesorId) {
      return res.status(404).json({ 
        error: "No se encontró un registro de profesor asociado",
        message: "No tienes un perfil de profesor asociado a tu cuenta"
      });
    }
    
    // Obtener las asignaciones del profesor (grupos y materias)
    const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
    
    if (asignaciones.length === 0) {
      return res.json([]);
    }
    
    // Obtener IDs de grupos y materias asignadas
    const gruposIds = [...new Set(asignaciones.map(a => a.grupoId))];
    const materiasIds = [...new Set(asignaciones.map(a => a.materiaId))];
    
    // Obtener todas las tareas
    const allTasks = await storage.getTasks();
    
    // Filtrar tareas por grupos y materias asignados al profesor
    const teacherTasks = allTasks.filter(task => 
      (task.grupoId && gruposIds.includes(task.grupoId)) || 
      (task.materiaId && materiasIds.includes(task.materiaId))
    );
    
    res.json(teacherTasks);
  } catch (error) {
    console.error("Error al obtener tareas del profesor:", error);
    res.status(500).json({ 
      error: "Error al obtener tareas",
      message: "Ocurrió un error al procesar la solicitud"
    });
  }
});

// Obtener asistencias filtradas para el profesor autenticado (grupos asignados activos)
router.get("/attendance", async (req, res) => {
  try {
    // Verificar que el usuario está autenticado y es un profesor
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    if (user.rol !== "docente" && user.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. Rol no autorizado" });
    }
    
    // Si es admin, devolver todas las asistencias
    if (user.rol === "admin") {
      const allAttendance = await storage.getAttendance();
      return res.json(allAttendance);
    }
    
    // Si es profesor, obtener su ID numérico
    const profesorId = user.profesorId;
    
    if (!profesorId) {
      return res.status(404).json({ 
        error: "No se encontró un registro de profesor asociado",
        message: "No tienes un perfil de profesor asociado a tu cuenta"
      });
    }
    
    // Obtener las asignaciones del profesor (grupos y materias)
    const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
    
    if (asignaciones.length === 0) {
      return res.json([]);
    }
    
    // Obtener IDs de grupos asignados activos
    const gruposIds = [...new Set(asignaciones.map(a => a.grupoId))];
    
    // Obtener estudiantes de esos grupos
    const students = await storage.getStudents();
    const studentIdsByGroup = students
      .filter(student => gruposIds.includes(student.grupoId) && student.estatus === 'activo')
      .map(student => student.id);
    
    // Obtener asistencias de esos estudiantes
    const allAttendance = await storage.getAttendance();
    const teacherAttendance = allAttendance.filter(
      attendance => studentIdsByGroup.includes(attendance.alumnoId)
    );
    
    res.json(teacherAttendance);
  } catch (error) {
    console.error("Error al obtener asistencias del profesor:", error);
    res.status(500).json({ 
      error: "Error al obtener asistencias",
      message: "Ocurrió un error al procesar la solicitud"
    });
  }
});

// Obtener asignaciones por profesor
router.get("/assignments/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    if (!teacherId) {
      return res.status(400).json({ error: "Se requiere un ID de profesor" });
    }
    
    // Verificar que el usuario autenticado está solicitando sus propias asignaciones
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    if (user.id !== teacherId && user.rol !== "admin") {
      return res.status(403).json({ error: "No autorizado para acceder a estos datos" });
    }
    
    const assignments = await storage.getSubjectAssignmentsByTeacher(teacherId);
    res.json(assignments);
  } catch (error) {
    console.error("Error al obtener asignaciones del profesor:", error);
    res.status(500).json({ error: "Error al obtener asignaciones del profesor" });
  }
});

// Obtener estadísticas de calificaciones por grupo o combinadas
router.get("/grades/stats", async (req, res) => {
  try {
    const { groupId } = req.query;
    
    // Verificar que el usuario autenticado
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    // Obtener el ID del profesor
    const profesorId = user.profesorId;
    if (!profesorId) {
      return res.status(404).json({ 
        error: "No se encontró un registro de profesor asociado",
        message: "No tienes un perfil de profesor asociado a tu cuenta"
      });
    }
    
    // Obtener las asignaciones del profesor
    const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
    
    // Si se especificó un grupo, verificar que el profesor tiene asignado este grupo
    if (groupId && user.rol === 'docente') {
      const tieneGrupoAsignado = asignaciones.some(a => a.grupoId === Number(groupId));
      
      if (!tieneGrupoAsignado) {
        return res.status(403).json({ 
          error: "No autorizado para acceder a este grupo",
          message: "Este grupo no está asignado a su perfil docente"
        });
      }
    }
    
    // Determinar qué grupos procesar según si se especificó un groupId o no
    let gruposAConsiderar = [];
    let students = [];
    let grades = [];
    
    if (groupId) {
      // Si se especificó un grupo, obtener solo los datos de ese grupo
      gruposAConsiderar = [Number(groupId)];
      students = await storage.getStudentsByGroup(Number(groupId));
      grades = await storage.getGradesByGroup(Number(groupId));
    } else {
      // Si no se especificó un grupo, obtener datos de todos los grupos asignados al profesor
      gruposAConsiderar = [...new Set(asignaciones.map(a => a.grupoId))];
      
      // Obtener estudiantes de todos esos grupos
      let allStudents = [];
      for (const grupoId of gruposAConsiderar) {
        const studentsInGroup = await storage.getStudentsByGroup(grupoId);
        allStudents = [...allStudents, ...studentsInGroup];
      }
      students = allStudents;
      
      // Obtener calificaciones de todos esos grupos
      let allGrades = [];
      for (const grupoId of gruposAConsiderar) {
        const gradesInGroup = await storage.getGradesByGroup(grupoId);
        allGrades = [...allGrades, ...gradesInGroup];
      }
      grades = allGrades;
    }
    
    // Contador de aprobados y calificaciones
    let alumnosAprobados = 0;
    let totalCalificaciones = 0;
    let sumaCalificaciones = 0;
    const totalAlumnos = students.length;
    
    // Crear mapa de promedios por alumno (solo con datos reales)
    const promediosPorAlumno: {[key: number]: any} = {};
    
    // Inicializar el objeto para cada estudiante
    students.forEach(student => {
      promediosPorAlumno[student.id] = {
        calificaciones: [],
        promedio: 0,
        alumno: student,
        haCalificaciones: false
      };
    });
    
    // Procesar solo las calificaciones reales
    grades.forEach(grade => {
      // Verificar que el alumno esté en el grupo
      if (!promediosPorAlumno[grade.alumnoId]) {
        return; // Ignorar calificaciones de alumnos que no están en el grupo
      }
      
      // Asegurarnos de usar el campo correcto
      const valorCalificacion = parseFloat(grade.valor);
      if (!isNaN(valorCalificacion)) {
        promediosPorAlumno[grade.alumnoId].calificaciones.push(valorCalificacion);
        promediosPorAlumno[grade.alumnoId].haCalificaciones = true;
      }
    });
    
    // Calcular promedios por alumno usando solo datos reales
    Object.keys(promediosPorAlumno).forEach(alumnoId => {
      const calificaciones = promediosPorAlumno[alumnoId].calificaciones;
      if (calificaciones.length > 0) {
        const suma = calificaciones.reduce((a, b) => a + b, 0);
        promediosPorAlumno[alumnoId].promedio = suma / calificaciones.length;
        
        // Acumular para el promedio general
        sumaCalificaciones += suma;
        totalCalificaciones += calificaciones.length;
        
        // Contar aprobados (promedio >= 6.0)
        if (promediosPorAlumno[alumnoId].promedio >= 6.0) {
          alumnosAprobados++;
        }
      }
    });
    
    // Calcular promedio general (solo si hay calificaciones reales)
    let promedioGeneral = 0;
    if (totalCalificaciones > 0) {
      promedioGeneral = sumaCalificaciones / totalCalificaciones;
    }
    
    // Calcular porcentaje de aprobados (solo si hay alumnos con calificaciones)
    const alumnosConCalificaciones = Object.values(promediosPorAlumno).filter((a: any) => a.haCalificaciones).length;
    const porcentajeAprobados = alumnosConCalificaciones > 0 ? (alumnosAprobados / alumnosConCalificaciones) * 100 : 0;
    
    // Ordenar alumnos por promedio para obtener los mejores (solo con calificaciones reales)
    const mejoresAlumnos = Object.values(promediosPorAlumno)
      .filter((a: any) => a.haCalificaciones && a.promedio > 0)
      .sort((a: any, b: any) => b.promedio - a.promedio)
      .map((a: any) => ({
        id: a.alumno?.id,
        nombre: a.alumno?.nombreCompleto || "Unknown",
        promedio: a.promedio.toFixed(1)
      }));
    
    res.json({
      promedioGeneral: promedioGeneral.toFixed(1),
      porcentajeAprobados: porcentajeAprobados.toFixed(0),
      alumnosAprobados,
      totalAlumnos,
      alumnosConCalificaciones,
      mejoresAlumnos,
      // Añadir bandera para indicar si hay datos reales
      hayDatosReales: totalCalificaciones > 0
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de calificaciones:", error);
    res.status(500).json({ error: "Error al obtener estadísticas de calificaciones" });
  }
});

// Obtener estadísticas de asistencia por grupo o combinadas
router.get("/attendance/stats", async (req, res) => {
  try {
    const { groupId } = req.query;
    
    // Verificar que el usuario autenticado
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    // Obtener el ID del profesor
    const profesorId = user.profesorId;
    if (!profesorId) {
      return res.status(404).json({ 
        error: "No se encontró un registro de profesor asociado",
        message: "No tienes un perfil de profesor asociado a tu cuenta"
      });
    }
    
    // Obtener las asignaciones del profesor
    const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
    
    // Si se especificó un grupo, verificar que el profesor tiene asignado este grupo
    if (groupId && user.rol === 'docente') {
      const tieneGrupoAsignado = asignaciones.some(a => a.grupoId === Number(groupId));
      
      if (!tieneGrupoAsignado) {
        return res.status(403).json({ 
          error: "No autorizado para acceder a este grupo",
          message: "Este grupo no está asignado a su perfil docente"
        });
      }
    }
    
    // Determinar qué grupos procesar según si se especificó un groupId o no
    let gruposAConsiderar = [];
    let students = [];
    let attendances = [];
    
    if (groupId) {
      // Si se especificó un grupo, obtener solo los datos de ese grupo
      gruposAConsiderar = [Number(groupId)];
      students = await storage.getStudentsByGroup(Number(groupId));
      attendances = await storage.getAttendancesByGroup(Number(groupId));
    } else {
      // Si no se especificó un grupo, obtener datos de todos los grupos asignados al profesor
      gruposAConsiderar = [...new Set(asignaciones.map(a => a.grupoId))];
      
      // Obtener estudiantes de todos esos grupos
      let allStudents = [];
      for (const grupoId of gruposAConsiderar) {
        const studentsInGroup = await storage.getStudentsByGroup(grupoId);
        allStudents = [...allStudents, ...studentsInGroup];
      }
      students = allStudents;
      
      // Obtener asistencias de todos esos grupos
      let allAttendances = [];
      for (const grupoId of gruposAConsiderar) {
        const attendancesInGroup = await storage.getAttendancesByGroup(grupoId);
        allAttendances = [...allAttendances, ...attendancesInGroup];
      }
      attendances = allAttendances;
    }
    
    const totalAlumnos = students.length;
    let presentes = 0;
    let totalRegistros = 0;
    
    // Mapa de asistencia por alumno (solo datos reales)
    const asistenciasPorAlumno: {[key: number]: any} = {};
    
    // Inicializar el mapa para todos los estudiantes
    students.forEach(student => {
      asistenciasPorAlumno[student.id] = {
        presentes: 0,
        total: 0,
        porcentaje: 0,
        alumno: student,
        hayRegistros: false
      };
    });
    
    // Fecha de hoy
    const hoy = new Date().toISOString().split('T')[0];
    // Inicializar contadores para hoy
    const asistenciaHoy = {
      presentes: 0,
      ausentes: 0,
      porcentaje: 0,
      hayRegistrosHoy: false
    };
    
    // Procesar solo las asistencias reales
    attendances.forEach(attendance => {
      // Verificar que el alumno esté en el grupo
      if (!asistenciasPorAlumno[attendance.alumnoId]) {
        return; // Ignorar asistencias de alumnos que no están en el grupo
      }
      
      // Incrementar contadores generales
      totalRegistros++;
      if (attendance.asistencia) {
        presentes++;
        asistenciasPorAlumno[attendance.alumnoId].presentes++;
      }
      asistenciasPorAlumno[attendance.alumnoId].total++;
      asistenciasPorAlumno[attendance.alumnoId].hayRegistros = true;
      
      // Contar asistencia de hoy
      if (attendance.fecha === hoy) {
        asistenciaHoy.hayRegistrosHoy = true;
        if (attendance.asistencia) {
          asistenciaHoy.presentes++;
        } else {
          asistenciaHoy.ausentes++;
        }
      }
    });
    
    // Calcular porcentajes por alumno (solo con datos reales)
    Object.keys(asistenciasPorAlumno).forEach(alumnoId => {
      const registro = asistenciasPorAlumno[alumnoId];
      if (registro.total > 0) {
        registro.porcentaje = (registro.presentes / registro.total) * 100;
      }
    });
    
    // Calcular porcentaje general (solo si hay registros reales)
    const porcentajeAsistencia = totalRegistros > 0 ? (presentes / totalRegistros) * 100 : 0;
    
    // Calcular porcentaje de hoy (solo si hay registros de hoy)
    const totalHoy = asistenciaHoy.presentes + asistenciaHoy.ausentes;
    asistenciaHoy.porcentaje = totalHoy > 0 ? (asistenciaHoy.presentes / totalHoy) * 100 : 0;
    
    // Ordenar alumnos por menor asistencia (solo con datos reales)
    const alumnosMenosAsistencia = Object.values(asistenciasPorAlumno)
      .filter((a: any) => a.hayRegistros && a.total > 0)
      .sort((a: any, b: any) => a.porcentaje - b.porcentaje)
      .map((a: any) => ({
        id: a.alumno?.id,
        nombre: a.alumno?.nombreCompleto || "Unknown",
        porcentaje: Math.round(a.porcentaje),
        presentes: a.presentes,
        total: a.total
      }));
    
    res.json({
      porcentajeAsistencia: porcentajeAsistencia.toFixed(0),
      presentes,
      totalRegistros,
      totalAlumnos,
      asistenciaHoy,
      alumnosMenosAsistencia,
      // Añadir bandera para indicar si hay datos reales
      hayDatosReales: totalRegistros > 0,
      hayRegistrosHoy: asistenciaHoy.hayRegistrosHoy
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de asistencia:", error);
    res.status(500).json({ error: "Error al obtener estadísticas de asistencia" });
  }
});

// Ruta para actualizar todas las materias de un profesor de una vez
router.put("/:id/subjects", async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const { subjectIds } = req.body; // Array de IDs de materias
    
    if (!Array.isArray(subjectIds)) {
      return res.status(400).json({ 
        message: "Formato inválido", 
        details: "Se espera un array de IDs de materias en el campo 'subjectIds'" 
      });
    }
    
    // Verificar que el profesor existe
    const teacher = await storage.getTeacher(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Profesor no encontrado" });
    }
    
    // 1. Obtener todas las asignaciones actuales del profesor para registro
    const assignments = await storage.getSubjectAssignments();
    const currentAssignments = assignments.filter(
      assignment => assignment.profesorId === teacherId
    );
    
    // Registramos las asignaciones que se van a eliminar para debugging
    console.log(`[UPDATE_SUBJECTS] Eliminando todas las asignaciones del profesor ID ${teacherId}. Asignaciones actuales: ${currentAssignments.length}`);
    
    // 2. Eliminar TODAS las asignaciones actuales del profesor
    // Esto garantiza que no queden asignaciones duplicadas o desactualizadas
    for (const assignment of currentAssignments) {
      await storage.deleteSubjectAssignment(assignment.id);
    }
    
    console.log(`[UPDATE_SUBJECTS] Creando ${subjectIds.length} nuevas asignaciones para el profesor ID ${teacherId}`);
    
    // 3. Crear todas las nuevas asignaciones según la lista recibida
    for (const subjectId of subjectIds) {
      // Por simplicidad, asignamos al grupo 1 por defecto
      // En una implementación real, se debería especificar el grupo para cada materia
      await storage.createSubjectAssignment({
        grupoId: 1,
        materiaId: subjectId,
        profesorId: teacherId
      });
    }
    
    // 4. Verificar las asignaciones resultantes para confirmar que el cambio fue exitoso
    // Obtenemos por ID numérico en lugar de UUID para evitar inconsistencias
    const newAssignments = await storage.getSubjectAssignmentsByTeacherId(teacherId);
    
    res.status(200).json({ 
      message: "Materias del profesor actualizadas correctamente",
      previousCount: currentAssignments.length,
      updatedCount: subjectIds.length,
      actualCount: newAssignments.length,
      teacher
    });
    
  } catch (error) {
    console.error("Error al actualizar materias del profesor:", error);
    res.status(500).json({ 
      message: "Error al actualizar materias del profesor", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Ruta para obtener el horario de clases del profesor autenticado
router.get("/horario", async (req, res) => {
  try {
    // Verificar que existe un usuario autenticado
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    // Verificar que el usuario es un profesor
    if (user.rol !== "docente" && user.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. Rol no autorizado" });
    }
    
    console.log("Usuario solicitando horario:", user);
    
    // Buscar el ID del profesor asociado al usuario autenticado
    const profesores = await storage.getTeachers();
    let profesorId = null;
    
    // Buscar el profesor por correo electrónico
    const profesor = profesores.find(p => p.correo.toLowerCase() === user.correo.toLowerCase());
    
    if (profesor) {
      profesorId = profesor.id;
    } else {
      console.log(`No se encontró el profesor asociado al usuario con correo ${user.correo}`);
      // Si es un administrador, podemos devolver horarios de demostración o un mensaje claro
      if (user.rol === "admin") {
        return res.status(404).json({ 
          error: "No se encontró un profesor asociado a esta cuenta de administrador" 
        });
      } else {
        return res.status(404).json({ 
          error: "No se encontró un registro de profesor asociado a su cuenta de usuario" 
        });
      }
    }
    
    // Obtener todos los horarios
    const allSchedules = await storage.getSchedules();
    
    // Filtrar horarios por el ID del profesor
    const teacherSchedules = allSchedules.filter(schedule => 
      schedule.profesorId === profesorId
    );
    
    // Enriquecer los datos con información de grupos y materias
    const enrichedSchedules = await Promise.all(teacherSchedules.map(async (schedule) => {
      // Obtener detalles del grupo
      const grupo = await storage.getGroup(schedule.grupoId);
      // Obtener detalles de la materia
      const materia = await storage.getSubject(schedule.materiaId);
      
      return {
        id: schedule.id,
        grupoId: schedule.grupoId,
        grupoNombre: grupo ? grupo.nombre : "Grupo no encontrado",
        materiaId: schedule.materiaId,
        materiaNombre: materia ? materia.nombre : "Materia no encontrada",
        profesorId: schedule.profesorId,
        profesorNombre: profesor.nombreCompleto,
        diaSemana: schedule.diaSemana,
        horaInicio: schedule.horaInicio,
        horaFin: schedule.horaFin,
        modo: schedule.modo,
        estatus: schedule.estatus,
      };
    }));
    
    res.json(enrichedSchedules);
  } catch (error) {
    console.error("Error al obtener horario del profesor:", error);
    res.status(500).json({ 
      error: "Error al obtener horario del profesor", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para obtener los grupos activos asignados a un profesor
router.get("/grupos-asignados", async (req, res) => {
  try {
    // Verificar que existe un usuario autenticado
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    // Verificar que el usuario es un profesor o administrador
    if (user.rol !== "docente" && user.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. Rol no autorizado" });
    }
    
    // Si el usuario es administrador, devolver todos los grupos activos
    if (user.rol === "admin") {
      const todosLosGrupos = await storage.getGroups();
      const gruposActivos = todosLosGrupos.filter(grupo => grupo.estado === 'activo');
      return res.json(gruposActivos);
    }
    
    // Para usuarios docentes, buscar el ID del profesor asociado al usuario
    const profesores = await storage.getTeachers();
    let profesorId = null;
    
    // Buscar el profesor por ID de usuario o por correo electrónico
    const profesor = profesores.find(p => 
      p.id === user.profesorId || 
      p.correo?.toLowerCase() === user.correo?.toLowerCase()
    );
    
    if (!profesor) {
      return res.status(404).json({ 
        error: "No se encontró un registro de profesor asociado a su cuenta de usuario" 
      });
    }
    
    profesorId = profesor.id;
    
    // Obtener asignaciones del profesor usando el método para IDs numéricos
    const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
    
    // Obtener todos los grupos
    const todosLosGrupos = await storage.getGroups();
    
    // Filtrar grupos activos y asignados al profesor
    const gruposIds = Array.from(new Set(asignaciones.map((a: any) => a.grupoId)));
    const gruposAsignados = todosLosGrupos.filter(grupo => 
      gruposIds.includes(grupo.id) && grupo.estado === 'activo'
    );
    
    res.json(gruposAsignados);
  } catch (error) {
    console.error("Error al obtener grupos asignados al profesor:", error);
    res.status(500).json({ 
      error: "Error al obtener grupos asignados al profesor", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para obtener las materias asignadas a un profesor en un grupo específico
router.get("/materias-asignadas/:grupoId", async (req, res) => {
  try {
    const grupoId = parseInt(req.params.grupoId);
    
    // Verificar que existe un usuario autenticado
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    // Verificar que el usuario es un profesor o administrador
    if (user.rol !== "docente" && user.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. Rol no autorizado" });
    }
    
    // Obtener todas las materias
    const materias = await storage.getSubjects();
    
    // Si el usuario es administrador, devolver todas las materias activas
    if (user.rol === "admin") {
      const materiasActivas = materias.filter(materia => materia.estado === 'activo');
      return res.json(materiasActivas);
    }
    
    // Para usuarios docentes, buscar el ID del profesor asociado al usuario
    const profesores = await storage.getTeachers();
    let profesorId = null;
    
    // Buscar el profesor por ID de usuario o por correo electrónico
    const profesor = profesores.find(p => 
      p.id === user.profesorId || 
      p.correo?.toLowerCase() === user.correo?.toLowerCase()
    );
    
    if (!profesor) {
      return res.status(404).json({ 
        error: "No se encontró un registro de profesor asociado a su cuenta de usuario" 
      });
    }
    
    profesorId = profesor.id;
    
    // Obtener asignaciones del profesor para el grupo específico usando el método para IDs numéricos
    const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
    const asignacionesGrupo = asignaciones.filter(a => a.grupoId === grupoId);
    
    // Filtrar materias asignadas al profesor en el grupo específico
    const materiasIds = asignacionesGrupo.map(a => a.materiaId);
    const materiasAsignadas = materias.filter(materia => 
      materiasIds.includes(materia.id)
    );
    
    res.json(materiasAsignadas);
  } catch (error) {
    console.error("Error al obtener materias asignadas al profesor para el grupo:", error);
    res.status(500).json({ 
      error: "Error al obtener materias asignadas al profesor para el grupo", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Exportamos el router para ser utilizado en routes.ts
// Las rutas ya están registradas en routes.ts con el middleware de verificación de token

export default router;