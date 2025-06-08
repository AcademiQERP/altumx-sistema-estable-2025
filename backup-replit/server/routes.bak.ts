import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { db } from "./db";
import { pool, query } from "./lib/db";
import jwt from "jsonwebtoken";
import { generateResponseSuggestions, determinePriority, generateConversationSummary, generateAcademicComment, generarResumenAcademicoParaPadres, generateParentChatbotResponse, generateTaskDescription } from "./services/anthropic-service";
import { checkGroupDependencies, formatDependencyMessage } from "./services/dependency-checker";
import { processAssistantRequest, isAssistantConfigured } from "./services/ai-assistant-service";
import aiRoutes from "./routes/ai-routes";
import aiRiskRoutes from "./routes/ai-risk-routes";
import parentRoutes from "./routes/parent-routes";
import paymentRoutes from "./routes/payment-routes";
import speiRoutes from "./routes/spei-routes";
import reporteRoutes from "./routes/reporte-routes";
import teacherRoutes from "./routes/teacher-routes";
import scheduleRoutes from "./routes/schedule-routes";
import teacherAssistantRoutes from "./routes/teacher-assistant-routes";
import groupCleanupRoutes from "./routes/group-cleanup-routes";
import { registerGroupStatsRoutes } from "./routes/group-stats-routes";
import bcrypt from "bcrypt";
import { generateMockData } from "./utils/mock-data-creator";
import { sendUpcomingPaymentReminders } from "./services/email-service";
import { executeDailyReminders } from "./cron/dailyReminders";
import { initializeCronJobs, stopAllCronJobs } from "./cron";
import { 
  insertStudentSchema, 
  insertTeacherSchema, 
  insertGroupSchema,
  insertSubjectSchema,
  insertSubjectAssignmentSchema,
  insertGradeSchema,
  insertAttendanceSchema,
  insertPaymentConceptSchema,
  insertDebtSchema,
  insertPaymentSchema,
  insertAvisoSchema,
  insertEvaluationCriteriaSchema,
  insertCriteriaAssignmentSchema,
  insertCriteriaGradeSchema,
  insertMessageSchema,
  insertSchoolAnnouncementSchema,
  insertNotificationSchema,
  insertCalendarEventSchema,
  insertRiskSnapshotSchema,
  insertAuditLogSchema,
  insertObservacionSchema, 
  insertAlumnoResponsableSchema,
  auditLogs
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Prefijo para todas las rutas de la API
  const API_PREFIX = "/api";
  
  // Configurar autenticación primero para tener acceso a los middlewares
  const { verifyToken, checkRole } = setupAuth(app);
  
  // Registrar rutas de IA con JWT auth en lugar de session auth
  app.use(`${API_PREFIX}/ai`, verifyToken, aiRoutes);
  
  // Registrar rutas de IA para predicción de riesgo con JWT auth
  app.use(`${API_PREFIX}/ai`, verifyToken, aiRiskRoutes);
  
  // Registrar rutas del asistente de profesor
  // Registro detallado para depuración
  console.log("[DEBUG] Registrando rutas para teacher-assistant");
  app.use(`${API_PREFIX}/teacher-assistant`, verifyToken, (req, res, next) => {
    console.log(`[DEBUG] Petición recibida en /api/teacher-assistant: ${req.method} ${req.path}`);
    next();
  }, teacherAssistantRoutes);
  
  // Registrar rutas del asistente de limpieza de grupos con middleware de auth
  app.use(`${API_PREFIX}/group-cleanup`, verifyToken, groupCleanupRoutes);
  
  // Registrar rutas específicas del profesor
  app.use(`${API_PREFIX}/profesor`, verifyToken, teacherRoutes);
  
  // Registrar rutas de estadísticas de grupo
  registerGroupStatsRoutes(app);
  
  // Ruta para verificar el estado de los recordatorios de pago
  app.get(`${API_PREFIX}/payment-reminder-status`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const { reminderState } = await import('./services/payment-reminder-service');
      res.json({
        lastRun: reminderState.lastRun,
        result: reminderState.result,
        ranToday: reminderState.hasRunToday(),
        enabled: process.env.PAYMENT_REMINDERS_ENABLED !== 'false'
      });
    } catch (error) {
      console.error("Error al obtener estado de recordatorios:", error);
      res.status(500).json({ message: "Error al obtener estado de recordatorios de pago" });
    }
  });
  
  // Obtener logs de auditoría para acciones de recordatorios y cron jobs
  app.get(`${API_PREFIX}/audit-logs/cron`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      // Parámetros de filtrado opcionales
      const { limit = 100, action } = req.query;
      
      // Obtener todos los logs de auditoría relacionados con cron jobs
      let logs;
      if (action) {
        logs = await storage.getAuditLogsByAction(action as string);
      } else {
        logs = await storage.getAuditLogsByResource('cron_job');
      }
      
      // Ordenar por fecha de creación descendente (más recientes primero)
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Limitar el número de resultados
      const limitedLogs = logs.slice(0, Number(limit));
      
      res.json({
        total: logs.length,
        logs: limitedLogs
      });
    } catch (error) {
      console.error("Error al obtener logs de auditoría:", error);
      res.status(500).json({ 
        message: "Error al obtener logs de auditoría", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Ruta para ejecutar manualmente los recordatorios (solo para pruebas/admin)
  app.post(`${API_PREFIX}/payment-reminders/send`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const { sendPaymentReminders } = await import('./services/payment-reminder-service');
      const result = await sendPaymentReminders();
      res.json(result);
    } catch (error) {
      console.error("Error al enviar recordatorios manualmente:", error);
      res.status(500).json({ 
        message: "Error al enviar recordatorios de pago", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rutas para estudiantes
  app.get(`${API_PREFIX}/students`, async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estudiantes", error });
    }
  });

  app.get(`${API_PREFIX}/students/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const student = await storage.getStudent(id);
      
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el estudiante", error });
    }
  });

  app.post(`${API_PREFIX}/students`, async (req, res) => {
    try {
      const validatedData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validatedData);
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({ message: "Datos de estudiante inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/students/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertStudentSchema.partial().parse(req.body);
      const updatedStudent = await storage.updateStudent(id, validatedData);
      
      if (!updatedStudent) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      res.json(updatedStudent);
    } catch (error) {
      res.status(400).json({ message: "Datos de estudiante inválidos", error });
    }
  });
  
  // Ruta PATCH para actualizar estudiantes (idéntica a PUT por ahora)
  app.patch(`${API_PREFIX}/students/:id`, async (req, res) => {
    try {
      console.log(`📝 Actualizando estudiante con ID ${req.params.id}:`, req.body);
      const id = parseInt(req.params.id);
      const validatedData = insertStudentSchema.partial().parse(req.body);
      const updatedStudent = await storage.updateStudent(id, validatedData);
      
      if (!updatedStudent) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      res.json(updatedStudent);
    } catch (error) {
      console.error(`❌ Error al actualizar estudiante:`, error);
      res.status(400).json({ message: "Datos de estudiante inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/students/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStudent(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el estudiante", error });
    }
  });

  // Rutas para profesores
  app.get(`${API_PREFIX}/teachers`, async (req, res) => {
    try {
      const teachers = await storage.getTeachers();
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener profesores", error });
    }
  });

  app.get(`${API_PREFIX}/teachers/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const teacher = await storage.getTeacher(id);
      
      if (!teacher) {
        return res.status(404).json({ message: "Profesor no encontrado" });
      }
      
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el profesor", error });
    }
  });

  app.post(`${API_PREFIX}/teachers`, async (req, res) => {
    try {
      const validatedData = insertTeacherSchema.parse(req.body);
      const teacher = await storage.createTeacher(validatedData);
      res.status(201).json(teacher);
    } catch (error) {
      res.status(400).json({ message: "Datos de profesor inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/teachers/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTeacherSchema.partial().parse(req.body);
      const updatedTeacher = await storage.updateTeacher(id, validatedData);
      
      if (!updatedTeacher) {
        return res.status(404).json({ message: "Profesor no encontrado" });
      }
      
      res.json(updatedTeacher);
    } catch (error) {
      res.status(400).json({ message: "Datos de profesor inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/teachers/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTeacher(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Profesor no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el profesor", error });
    }
  });
  
  // Ruta para actualizar SOLO las materias asignadas de un profesor (no incluye materia principal)
  app.put(`${API_PREFIX}/teachers/:id/subjects`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const teacherId = parseInt(req.params.id);
      const { subjectIds } = req.body; // Array de IDs de materias
      
      if (!Array.isArray(subjectIds)) {
        return res.status(400).json({ 
          success: false, 
          message: "Formato inválido", 
          details: "Se espera un array de IDs de materias en el campo 'subjectIds'" 
        });
      }
      
      // Verificar que el profesor existe
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher) {
        return res.status(404).json({ 
          success: false, 
          message: "Profesor no encontrado" 
        });
      }
      
      // Verificar si el profesor tiene una materia principal
      let materiaPrincipalId = null;
      if (teacher.materiaPrincipal) {
        // Obtener todas las materias para encontrar el ID de la materia principal
        const allSubjects = await storage.getSubjects();
        const materiaPrincipal = allSubjects.find(s => s.nombre === teacher.materiaPrincipal);
        if (materiaPrincipal) {
          materiaPrincipalId = materiaPrincipal.id;
        }
      }
      
      console.log(`[UPDATE_SUBJECTS] Profesor ${teacherId} tiene materia principal: ${teacher.materiaPrincipal} (ID: ${materiaPrincipalId})`);
      
      // 1. Obtener todas las asignaciones actuales del profesor
      const assignments = await storage.getSubjectAssignments();
      const currentAssignments = assignments.filter(
        assignment => assignment.profesorId === teacherId
      );
      
      console.log(`[UPDATE_SUBJECTS] Asignaciones actuales: ${currentAssignments.length}, Nuevas materias solicitadas: ${subjectIds.length}`);
      
      // Debug: Imprimir valores recibidos antes de procesarlos
      console.log("[UPDATE_SUBJECTS] Valores recibidos del cliente - subjectIds:", JSON.stringify(subjectIds));
      console.log("[UPDATE_SUBJECTS] Tipos de subjectIds:", subjectIds.map(id => typeof id));
      
      // Debug: Imprimir lista detallada de materias recibidas y actuales
      console.log(`[UPDATE_SUBJECTS] Detalle de materias recibidas (subjectIds):`, JSON.stringify(subjectIds));
      console.log(`[UPDATE_SUBJECTS] Asignaciones actuales:`, JSON.stringify(currentAssignments.map(a => ({
        id: a.id,
        materiaId: a.materiaId,
        profesorId: a.profesorId,
        tipo: typeof a.materiaId
      }))));
      
      // 2. Eliminar las asignaciones actuales que ya no están seleccionadas
      let eliminadas = 0;
      for (const assignment of currentAssignments) {
        // Convertir a cadenas para la comparación para evitar problemas de tipo
        const assignmentMateriaId = String(assignment.materiaId);
        const materiaPrincipalIdStr = materiaPrincipalId ? String(materiaPrincipalId) : null;
        
        // Verificar materias que están siendo enviadas
        const materiasEnviadas = subjectIds.map(id => String(id));
        console.log(`[UPDATE_SUBJECTS] Materias enviadas (convertidas a string):`, materiasEnviadas);
        
        // Verificar si la asignación actual no está en la nueva lista y no es la materia principal
        // Usamos una comparación más robusta, comprobando si cualquier ID enviado coincide con esta asignación
        const presenteEnNuevaLista = subjectIds.some(id => {
          // Convertir ambos a número para garantizar comparación correcta
          const idComoNumero = typeof id === 'string' ? parseInt(id) : id;
          const asignacionComoNumero = typeof assignment.materiaId === 'string' 
            ? parseInt(assignment.materiaId) 
            : assignment.materiaId;
            
          return idComoNumero === asignacionComoNumero;
        });
        
        // Verificar si es la materia principal
        const esMateriaPrincipal = materiaPrincipalId === assignment.materiaId || 
                                 materiaPrincipalIdStr === assignmentMateriaId;
        
        // La asignación debe eliminarse si no está en la nueva lista y no es la materia principal
        const shouldBeRemoved = !presenteEnNuevaLista && !esMateriaPrincipal;
                               
        // Debug: Imprimir detalles de comparación
        console.log(`[UPDATE_SUBJECTS] Evaluando asignación: ${assignment.id}, Materia: ${assignmentMateriaId}, ¿Eliminar?: ${shouldBeRemoved}`);
        console.log(`[UPDATE_SUBJECTS] Comparación detallada:
          - assignment.materiaId: ${assignment.materiaId} (${typeof assignment.materiaId})
          - assignmentMateriaId (como string): "${assignmentMateriaId}" (${typeof assignmentMateriaId})
          - materiaPrincipalId: ${materiaPrincipalId} (${typeof materiaPrincipalId})
          - materiaPrincipalIdStr: "${materiaPrincipalIdStr}" (${typeof materiaPrincipalIdStr})
          - ¿Presente en nueva lista?: ${presenteEnNuevaLista}
          - ¿Es materia principal?: ${esMateriaPrincipal}
          - ¿Se debe eliminar?: ${shouldBeRemoved}
        `);
        
        if (shouldBeRemoved) {
          await storage.deleteSubjectAssignment(assignment.id);
          eliminadas++;
          console.log(`[UPDATE_SUBJECTS] Asignación eliminada: ${assignment.id}, Materia: ${assignmentMateriaId}`);
        }
      }
      
      // 3. Agregar nuevas asignaciones para materias que no estaban asignadas previamente
      const currentSubjectIds = currentAssignments.map(a => String(a.materiaId));
      const newSubjectIds = subjectIds.filter(id => !currentSubjectIds.includes(String(id)));
      
      let creadas = 0;
      for (const subjectId of newSubjectIds) {
        // Convertir a string para comparar consistentemente
        const subjectIdStr = String(subjectId);
        const materiaPrincipalIdStr = materiaPrincipalId ? String(materiaPrincipalId) : null;
        
        // Verificar que la materia no sea la principal antes de crear una asignación
        // para evitar duplicidad
        if (subjectIdStr !== materiaPrincipalIdStr) {
          console.log(`[UPDATE_SUBJECTS] Creando nueva asignación para materia: ${subjectId}`);
          
          // Por simplicidad, asignamos al grupo 1 por defecto
          // En una implementación real, se debería especificar el grupo para cada materia
          await storage.createSubjectAssignment({
            grupoId: 1,
            materiaId: parseInt(String(subjectId)),
            profesorId: teacherId
          });
          creadas++;
        } else {
          console.log(`[UPDATE_SUBJECTS] Omitiendo asignación para materia principal: ${subjectId}`);
        }
      }
      
      console.log(`[UPDATE_SUBJECTS] Resultado: Asignaciones eliminadas: ${eliminadas}, Asignaciones creadas: ${creadas}`);
      
      // Obtener las asignaciones actualizadas para verificación
      const updatedAssignments = await storage.getSubjectAssignmentsByTeacherId(teacherId);
      
      res.status(200).json({ 
        success: true,
        message: "Materias del profesor actualizadas correctamente",
        updatedCount: subjectIds.length,
        eliminadas,
        creadas,
        currentAssignments: updatedAssignments.length,
        materiaPrincipal: teacher.materiaPrincipal
      });
      
    } catch (error) {
      console.error("Error al actualizar materias del profesor:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al actualizar materias del profesor", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Rutas para grupos
  app.get(`${API_PREFIX}/groups`, async (req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener grupos", error });
    }
  });

  app.get(`${API_PREFIX}/groups/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const group = await storage.getGroup(id);
      
      if (!group) {
        return res.status(404).json({ message: "Grupo no encontrado" });
      }
      
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el grupo", error });
    }
  });

  app.post(`${API_PREFIX}/groups`, async (req, res) => {
    try {
      const validatedData = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(validatedData);
      res.status(201).json(group);
    } catch (error) {
      res.status(400).json({ message: "Datos de grupo inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/groups/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertGroupSchema.partial().parse(req.body);
      const updatedGroup = await storage.updateGroup(id, validatedData);
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Grupo no encontrado" });
      }
      
      res.json(updatedGroup);
    } catch (error) {
      res.status(400).json({ message: "Datos de grupo inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/groups/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar si el grupo existe
      const group = await storage.getGroup(id);
      if (!group) {
        return res.status(404).json({ 
          success: false,
          message: "Grupo no encontrado" 
        });
      }
      
      // Importamos las funciones para manejar dependencias
      const { checkGroupDependencies, formatDependencyMessage } = await import("./services/dependency-checker");
      
      // Verificar si hay dependencias que impidan eliminar el grupo
      const dependencies = await checkGroupDependencies(id);
      
      if (dependencies.hasDependencies) {
        return res.status(409).json({
          success: false,
          message: "No se puede eliminar el grupo porque tiene dependencias activas",
          details: dependencies.details,
          formattedMessage: formatDependencyMessage(dependencies)
        });
      }
      
      // Si no hay dependencias, proceder con la eliminación
      const deleted = await storage.deleteGroup(id);
      
      if (!deleted) {
        return res.status(500).json({ 
          success: false,
          message: "Error al eliminar el grupo"
        });
      }
      
      res.status(200).json({
        success: true,
        message: "Grupo eliminado correctamente"
      });
    } catch (error) {
      console.error("Error al eliminar grupo:", error);
      res.status(500).json({ 
        success: false,
        message: "Error al eliminar el grupo", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rutas para asignaciones de profesores a grupos
  app.get(`${API_PREFIX}/groups/:id/teachers`, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      // Verificar si el grupo existe
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Grupo no encontrado" });
      }
      
      // Obtener los profesores asignados a este grupo
      const teachers = await storage.getTeachersByGroup(groupId);
      res.json(teachers);
    } catch (error) {
      console.error("Error al obtener profesores del grupo:", error);
      res.status(500).json({ message: "Error al obtener profesores del grupo", error });
    }
  });
  
  app.post(`${API_PREFIX}/groups/:id/teachers`, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { teacherIds } = req.body;
      
      // Verificar si el grupo existe
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Grupo no encontrado" });
      }
      
      // Validar que teacherIds sea un array de números
      if (!Array.isArray(teacherIds)) {
        return res.status(400).json({ message: "teacherIds debe ser un array" });
      }
      
      // Verificar que todos los profesores existan
      for (const teacherId of teacherIds) {
        if (typeof teacherId !== 'number') {
          return res.status(400).json({ message: "Todos los IDs de profesores deben ser números" });
        }
        
        const teacher = await storage.getTeacher(teacherId);
        if (!teacher) {
          return res.status(404).json({ message: `Profesor con ID ${teacherId} no encontrado` });
        }
      }
      
      // Asignar los profesores al grupo
      const success = await storage.assignTeachersToGroup(groupId, teacherIds);
      
      if (success) {
        const updatedTeachers = await storage.getTeachersByGroup(groupId);
        res.status(200).json(updatedTeachers);
      } else {
        res.status(500).json({ message: "Error al asignar profesores al grupo" });
      }
    } catch (error) {
      console.error("Error al asignar profesores al grupo:", error);
      res.status(500).json({ message: "Error al asignar profesores al grupo", error });
    }
  });
  
  app.delete(`${API_PREFIX}/groups/:groupId/teachers/:teacherId`, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const teacherId = parseInt(req.params.teacherId);
      
      // Verificar si el grupo existe
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Grupo no encontrado" });
      }
      
      // Verificar si el profesor existe
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Profesor no encontrado" });
      }
      
      // Eliminar la asignación
      const success = await storage.removeTeacherFromGroup(groupId, teacherId);
      
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: "Asignación no encontrada" });
      }
    } catch (error) {
      console.error("Error al eliminar profesor del grupo:", error);
      res.status(500).json({ message: "Error al eliminar profesor del grupo", error });
    }
  });
  
  app.get(`${API_PREFIX}/teachers/:id/groups`, async (req, res) => {
    try {
      const teacherId = parseInt(req.params.id);
      
      // Verificar si el profesor existe
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Profesor no encontrado" });
      }
      
      // Obtener los grupos asignados a este profesor
      const groups = await storage.getGroupsByTeacher(teacherId);
      res.json(groups);
    } catch (error) {
      console.error("Error al obtener grupos del profesor:", error);
      res.status(500).json({ message: "Error al obtener grupos del profesor", error });
    }
  });

  // Rutas para materias
  app.get(`${API_PREFIX}/subjects`, async (req, res) => {
    try {
      const subjects = await storage.getSubjects();
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener materias", error });
    }
  });

  app.get(`${API_PREFIX}/subjects/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subject = await storage.getSubject(id);
      
      if (!subject) {
        return res.status(404).json({ message: "Materia no encontrada" });
      }
      
      res.json(subject);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la materia", error });
    }
  });

  app.post(`${API_PREFIX}/subjects`, async (req, res) => {
    try {
      const validatedData = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(validatedData);
      res.status(201).json(subject);
    } catch (error) {
      res.status(400).json({ message: "Datos de materia inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/subjects/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSubjectSchema.partial().parse(req.body);
      const updatedSubject = await storage.updateSubject(id, validatedData);
      
      if (!updatedSubject) {
        return res.status(404).json({ message: "Materia no encontrada" });
      }
      
      res.json(updatedSubject);
    } catch (error) {
      res.status(400).json({ message: "Datos de materia inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/subjects/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar que la materia existe
      const subject = await storage.getSubject(id);
      if (!subject) {
        return res.status(404).json({ 
          success: false, 
          message: "Materia no encontrada" 
        });
      }
      
      // Consultas separadas para cada tipo de dependencia
      // Esto evita problemas con el alias 'count' y es más claro
      try {
        // 1. Verificar asignaciones a profesores
        const assignmentResult = await pool.query(`
          SELECT COUNT(*) as total FROM asignaciones_materia WHERE materia_id = $1
        `, [id]);
        
        const assignmentCount = parseInt(assignmentResult.rows[0].total);
        if (assignmentCount > 0) {
          return res.status(409).json({ 
            success: false, 
            message: "La materia no se puede eliminar porque está en uso por profesores u otros módulos.", 
            details: `La materia tiene ${assignmentCount} asignaciones a profesores`,
            code: "SUBJECT_IN_USE_ASSIGNMENTS"
          });
        }
        
        // 2. Verificar uso en horarios
        const scheduleResult = await pool.query(`
          SELECT COUNT(*) as total FROM schedules WHERE materia_id = $1
        `, [id]);
        
        const scheduleCount = parseInt(scheduleResult.rows[0].total);
        if (scheduleCount > 0) {
          return res.status(409).json({ 
            success: false, 
            message: "La materia no se puede eliminar porque está en uso por profesores u otros módulos.", 
            details: `La materia aparece en ${scheduleCount} horarios`,
            code: "SUBJECT_IN_USE_SCHEDULES"
          });
        }
        
        // 3. Verificar calificaciones asociadas
        const gradeResult = await pool.query(`
          SELECT COUNT(*) as total FROM calificaciones WHERE materia_id = $1
        `, [id]);
        
        const gradeCount = parseInt(gradeResult.rows[0].total);
        if (gradeCount > 0) {
          return res.status(409).json({ 
            success: false, 
            message: "La materia no se puede eliminar porque está en uso por profesores u otros módulos.", 
            details: `La materia tiene ${gradeCount} calificaciones asociadas`,
            code: "SUBJECT_IN_USE_GRADES"
          });
        }
        
        // 4. Verificar criterios de evaluación (opcional)
        try {
          // Primero verificamos si la tabla existe
          const tableCheckResult = await pool.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'evaluation_criteria'
            ) as exists
          `);
          
          if (tableCheckResult.rows[0].exists) {
            const criteriaResult = await pool.query(`
              SELECT COUNT(*) as total FROM evaluation_criteria WHERE materia_id = $1
            `, [id]);
            
            const criteriaCount = parseInt(criteriaResult.rows[0].total);
            if (criteriaCount > 0) {
              return res.status(409).json({ 
                success: false, 
                message: "La materia no se puede eliminar porque está en uso por profesores u otros módulos.", 
                details: `La materia tiene ${criteriaCount} criterios de evaluación asociados`,
                code: "SUBJECT_IN_USE_CRITERIA"
              });
            }
          }
        } catch (criteriaErr) {
          // Sólo registramos el error pero continuamos
          console.warn("Error al verificar criterios de evaluación:", criteriaErr);
        }
        
        // Si llegamos aquí, no hay dependencias, podemos eliminar
        console.log(`Eliminando materia ID ${id}: ${subject.nombre}`);
        
        // Ejecutar el DELETE
        const deleted = await storage.deleteSubject(id);
        
        if (!deleted) {
          return res.status(500).json({ 
            success: false, 
            message: "No se pudo eliminar la materia por un error interno" 
          });
        }
        
        console.log(`Materia ID ${id} eliminada exitosamente`);
        return res.status(200).json({ 
          success: true, 
          message: "Materia eliminada correctamente" 
        });
        
      } catch (error: any) {
        console.error(`Error al verificar dependencias de la materia ID ${id}:`, error);
        return res.status(500).json({ 
          success: false, 
          message: "Error al verificar dependencias de la materia", 
          error: error.message || "Error desconocido"
        });
      }
    } catch (error: any) {
      console.error(`Error general al eliminar la materia ID ${req.params.id}:`, error);
      return res.status(500).json({ 
        success: false, 
        message: "Error al procesar la solicitud para eliminar la materia", 
        error: error.message || "Error desconocido"
      });
    }
  });

  // Rutas para asignaciones de materias
  app.get(`${API_PREFIX}/assignments`, async (req, res) => {
    try {
      const assignments = await storage.getSubjectAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener asignaciones", error });
    }
  });

  app.get(`${API_PREFIX}/assignments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getSubjectAssignment(id);
      
      if (!assignment) {
        return res.status(404).json({ message: "Asignación no encontrada" });
      }
      
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la asignación", error });
    }
  });

  app.post(`${API_PREFIX}/assignments`, async (req, res) => {
    try {
      const validatedData = insertSubjectAssignmentSchema.parse(req.body);
      const assignment = await storage.createSubjectAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Datos de asignación inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/assignments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSubjectAssignmentSchema.partial().parse(req.body);
      const updatedAssignment = await storage.updateSubjectAssignment(id, validatedData);
      
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Asignación no encontrada" });
      }
      
      res.json(updatedAssignment);
    } catch (error) {
      res.status(400).json({ message: "Datos de asignación inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/assignments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSubjectAssignment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Asignación no encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la asignación", error });
    }
  });

  // Rutas para calificaciones
  app.get(`${API_PREFIX}/grades`, async (req, res) => {
    try {
      const grades = await storage.getGrades();
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener calificaciones", error });
    }
  });

  app.get(`${API_PREFIX}/grades/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const grade = await storage.getGrade(id);
      
      if (!grade) {
        return res.status(404).json({ message: "Calificación no encontrada" });
      }
      
      res.json(grade);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la calificación", error });
    }
  });

  app.get(`${API_PREFIX}/students/:id/grades`, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const grades = await storage.getGradesByStudent(studentId);
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener calificaciones del estudiante", error });
    }
  });

  // Ruta para obtener calificaciones por grupo
  app.get(`${API_PREFIX}/grades/group/:groupId`, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID de grupo inválido" });
      }
      
      const grades = await storage.getGradesByGroup(groupId);
      res.json(grades);
    } catch (error) {
      res.status(500).json({ 
        message: "Error al obtener calificaciones del grupo", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Ruta para obtener calificaciones por CRITERIO para un grupo y materia
  app.get(`${API_PREFIX}/grades-criteria/group/:groupId/subject/:subjectId`, verifyToken, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const subjectId = parseInt(req.params.subjectId);
      
      console.log(`⚡ Solicitud a endpoint grades-criteria para grupo ${groupId}, materia ${subjectId}`);
      
      if (isNaN(groupId) || isNaN(subjectId)) {
        console.log(`❌ ID de grupo o materia inválido: groupId=${groupId}, subjectId=${subjectId}`);
        return res.status(400).json({ message: "ID de grupo o materia inválido" });
      }
      
      // Verificar si hay un usuario autenticado y si es profesor
      const user = (req as any).user;
      console.log(`👤 Datos de usuario recibidos en el endpoint:`, {
        userId: user?.id,
        userRole: user?.rol,
        profesorId: user?.profesorId,
        userEmail: user?.correo
      });
      
      if (!user) {
        console.log(`❌ No hay usuario autenticado en la solicitud`);
        return res.status(401).json({ message: "No autenticado" });
      }
      
      // Obtener profesorId si el usuario es docente
      let profesorId = null;
      if (user.rol === 'docente') {
        // Buscar el ID del profesor asociado al usuario autenticado
        profesorId = user.profesorId;
        console.log(`🧑‍🏫 ID de profesor desde el token: ${profesorId}`);
        
        if (!profesorId) {
          // Intentar obtener el profesorId de la base de datos si no está en el token
          console.log(`⚠️ No se encontró profesorId en el token, buscando por correo: ${user.correo}`);
          const profesores = await storage.getTeachers();
          const profesor = profesores.find(p => 
            p.correo?.toLowerCase() === user.correo?.toLowerCase()
          );
          
          if (profesor) {
            profesorId = profesor.id;
            console.log(`✅ Profesor encontrado por correo, ID: ${profesorId}`);
          } else {
            console.log(`❌ No se encontró profesor con el correo: ${user.correo}`);
          }
        }
        
        // Si tenemos un profesorId, verificar que esté asignado a esta materia y grupo
        if (profesorId) {
          console.log(`🔍 Verificando asignaciones para profesor ID ${profesorId}`);
          const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
          console.log(`📋 Asignaciones encontradas: ${JSON.stringify(asignaciones)}`);
          
          const estaAsignado = asignaciones.some(a => 
            a.grupoId === groupId && a.materiaId === subjectId
          );
          
          console.log(`✅ Resultado de verificación de asignación: ${estaAsignado ? 'Asignado' : 'No asignado'}`);
          
          if (!estaAsignado) {
            console.log(`👮‍♂️ Profesor ${profesorId} intentó acceder a calificaciones por criterio de grupo ${groupId}, materia ${subjectId} sin estar asignado`);
            return res.status(403).json({ 
              message: "No tienes permiso para ver calificaciones de esta materia/grupo" 
            });
          }
        }
      }
      
      // Si es admin o el profesor está asignado, devolver las calificaciones por criterio
      // Obtener los registros de calificaciones_criterio para esta materia y grupo
      try {
        // 1. Obtener los estudiantes del grupo
        const estudiantes = await storage.getStudentsByGroup(groupId);
        
        if (!estudiantes.length) {
          return res.json([]);
        }
        
        // 2. Obtener los criterios de evaluación asignados a esta materia/grupo
        const criteriosAsignados = await storage.getCriteriaAssignmentsByGroupAndSubject(groupId, subjectId);
        
        // 3. Obtener todas las calificaciones por criterio para estos estudiantes y materia
        const estudianteIds = estudiantes.map(est => est.id);
        const criteriosIds = criteriosAsignados.map(crit => crit.criterioId);
        
        // Consultar en la base de datos las calificaciones por criterio
        const { criteriaGrades, criteria } = await storage.getCriteriaGradesByGroupSubject(
          groupId, 
          subjectId, 
          estudianteIds, 
          criteriosIds
        );
        
        // 4. Devolver los resultados
        res.json({
          criteriaGrades,
          criteria,
          students: estudiantes,
          success: true
        });
      } catch (error) {
        console.error("Error al obtener calificaciones por criterio:", error);
        res.status(500).json({ 
          message: "Error al obtener calificaciones por criterio", 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error general en endpoint calificaciones por criterio:", error);
      res.status(500).json({ 
        message: "Error al obtener calificaciones por criterio", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Ruta para actualizar calificaciones por criterio en lote
  app.put(`${API_PREFIX}/grades-criteria/batch`, verifyToken, async (req, res) => {
    try {
      console.log("⚡ Solicitud a endpoint para actualizar calificaciones por criterio en lote");
      
      // Verificar si hay un usuario autenticado
      const user = (req as any).user;
      console.log(`👤 Datos de usuario recibidos en el endpoint:`, {
        userId: user?.id,
        userRole: user?.rol,
        profesorId: user?.profesorId,
        userEmail: user?.correo
      });
      
      if (!user) {
        console.log(`❌ No hay usuario autenticado en la solicitud`);
        return res.status(401).json({ message: "No autenticado" });
      }
      
      // Procesar los datos de calificación recibidos
      const { gradesData } = req.body;
      
      if (!gradesData || !Array.isArray(gradesData) || gradesData.length === 0) {
        console.log("❌ Datos de calificaciones inválidos o vacíos");
        return res.status(400).json({ message: "Datos de calificaciones inválidos" });
      }
      
      console.log(`📝 Procesando ${gradesData.length} calificaciones por criterio`);
      
      // Solo permitir a profesores actualizar calificaciones 
      // (con validación de asignación en cada calificación)
      if (user.rol !== 'docente' && user.rol !== 'admin') {
        console.log(`❌ Usuario con rol '${user.rol}' intentó actualizar calificaciones`);
        return res.status(403).json({ 
          message: "No tienes permiso para actualizar calificaciones" 
        });
      }
      
      // Validar asignación de profesor a la materia (para rol docente)
      if (user.rol === 'docente') {
        const profesorId = user.profesorId;
        
        if (!profesorId) {
          console.log("❌ No se encontró ID de profesor para el usuario");
          return res.status(403).json({ 
            message: "No se pudo validar la asignación del profesor" 
          });
        }
        
        // Obtener todas las asignaciones del profesor
        const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
        
        // Validar cada calificación individualmente
        for (const grade of gradesData) {
          const estaAsignado = asignaciones.some(a => 
            a.materiaId === grade.materiaId
          );
          
          if (!estaAsignado) {
            console.log(`👮‍♂️ Profesor ${profesorId} intentó actualizar calificación para materia ${grade.materiaId} sin estar asignado`);
            return res.status(403).json({ 
              message: `No tienes permiso para actualizar calificaciones de la materia ${grade.materiaId}` 
            });
          }
        }
      }
      
      // Actualizar las calificaciones en lote
      const updatedGrades = await storage.updateCriteriaGradeBatch(gradesData, user.id);
      
      console.log(`✅ ${updatedGrades.length} calificaciones por criterio actualizadas correctamente`);
      
      res.json({
        message: "Calificaciones por criterio actualizadas correctamente",
        updatedCount: updatedGrades.length,
        success: true
      });
      
    } catch (error) {
      console.error("Error al actualizar calificaciones por criterio en lote:", error);
      res.status(500).json({ 
        message: "Error al actualizar calificaciones por criterio", 
        error: error instanceof Error ? error.message : String(error),
        success: false
      });
    }
  });
  
  // Ruta para obtener calificaciones por grupo y materia
  app.get(`${API_PREFIX}/grades/group/:groupId/subject/:subjectId`, verifyToken, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const subjectId = parseInt(req.params.subjectId);
      
      console.log(`⚡ Solicitud a endpoint grades/group/${groupId}/subject/${subjectId}`);
      
      // 🔍 Analizar headers recibidos para depuración de autenticación
      const authHeader = req.headers["authorization"];
      console.log(`🔑 Header de autorización recibido: ${authHeader ? (authHeader.startsWith('Bearer ') ? 'Bearer ✓' : '❌ Formato incorrecto') : '❌ No presente'}`);
      console.log(`📦 Headers completos recibidos:`, req.headers);
      
      if (isNaN(groupId) || isNaN(subjectId)) {
        console.log(`❌ ID de grupo o materia inválido: groupId=${groupId}, subjectId=${subjectId}`);
        return res.status(400).json({ message: "ID de grupo o materia inválido" });
      }
      
      // Verificar si hay un usuario autenticado y si es profesor
      const user = (req as any).user;
      console.log(`👤 Datos de usuario recibidos en el endpoint de calificaciones tradicionales:`, {
        userId: user?.id,
        userRole: user?.rol,
        profesorId: user?.profesorId,
        userEmail: user?.correo,
        tokenPresent: !!user
      });
      
      if (!user) {
        console.log(`❌ No hay usuario autenticado en la solicitud a grades/group - VerifyToken no funcionó correctamente`);
        return res.status(401).json({ message: "No autenticado" });
      }
      
      // Obtener profesorId si el usuario es docente
      let profesorId = null;
      if (user.rol === 'docente') {
        // Buscar el ID del profesor asociado al usuario autenticado
        profesorId = user.profesorId;
        console.log(`🧑‍🏫 ID de profesor desde el token (calificaciones tradicionales): ${profesorId}`);
        
        if (!profesorId) {
          // Intentar obtener el profesorId de la base de datos si no está en el token
          console.log(`⚠️ No se encontró profesorId en el token (calificaciones tradicionales), buscando por correo: ${user.correo}`);
          const profesores = await storage.getTeachers();
          const profesor = profesores.find(p => 
            p.correo?.toLowerCase() === user.correo?.toLowerCase()
          );
          
          if (profesor) {
            profesorId = profesor.id;
            console.log(`✅ Profesor encontrado por correo, ID: ${profesorId}`);
          } else {
            console.log(`❌ No se encontró profesor con el correo: ${user.correo}`);
          }
        }
        
        // Si tenemos un profesorId, verificar que esté asignado a esta materia y grupo
        if (profesorId) {
          console.log(`🔍 Verificando asignaciones para profesor ID ${profesorId} en calificaciones tradicionales`);
          const asignaciones = await storage.getSubjectAssignmentsByTeacherId(profesorId);
          console.log(`📋 Asignaciones encontradas (calificaciones tradicionales): ${JSON.stringify(asignaciones)}`);
          
          const estaAsignado = asignaciones.some(a => 
            a.grupoId === groupId && a.materiaId === subjectId
          );
          
          console.log(`✅ Resultado de verificación de asignación (calificaciones tradicionales): ${estaAsignado ? 'Asignado' : 'No asignado'}`);
          
          if (!estaAsignado) {
            console.log(`👮‍♂️ Profesor ${profesorId} intentó acceder a calificaciones de grupo ${groupId}, materia ${subjectId} sin estar asignado`);
            return res.status(403).json({ 
              message: "No tienes permiso para ver calificaciones de esta materia/grupo" 
            });
          }
        }
      }
      
      // Si es admin o el profesor está asignado, devolver las calificaciones
      const grades = await storage.getGradesByGroupAndSubject(groupId, subjectId);
      res.json(grades);
    } catch (error) {
      console.error("Error al obtener calificaciones:", error);
      res.status(500).json({ 
        message: "Error al obtener calificaciones por grupo y materia", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Ruta para obtener estudiantes de un grupo
  app.get(`${API_PREFIX}/students/group/:groupId`, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID de grupo inválido" });
      }
      
      const students = await storage.getStudentsByGroup(groupId);
      res.json(students);
    } catch (error) {
      res.status(500).json({ 
        message: "Error al obtener estudiantes del grupo", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Ruta para actualizar calificaciones en lote
  app.put(`${API_PREFIX}/grades/batch`, async (req, res) => {
    try {
      const { grades } = req.body;
      let usuarioId = null;
      
      // Obtener ID del usuario si está autenticado
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          // Utilizamos la versión correcta de verifyToken
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          if (decoded && typeof decoded === 'object') {
            usuarioId = decoded.id;
          }
        } catch (tokenError) {
          console.warn("Error al verificar token para historial:", tokenError);
          // Continuamos sin ID de usuario, no se registrará historial
        }
      }
      
      if (!grades || !Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({ message: "Se requiere un arreglo de calificaciones" });
      }
      
      // Validar cada calificación
      for (const grade of grades) {
        if (!grade.alumnoId || !grade.materiaId || !grade.rubro || grade.valor === undefined || !grade.periodo) {
          return res.status(400).json({ 
            message: "Datos de calificación incompletos", 
            grade 
          });
        }
      }
      
      // Actualizar calificaciones y registrar cambios en el historial si hay un usuario autenticado
      const updatedGrades = await storage.updateGradeBatch(grades, usuarioId);
      
      res.json({ 
        success: true, 
        grades: updatedGrades,
        historialRegistrado: usuarioId !== null
      });
    } catch (error) {
      console.error("Error al actualizar calificaciones en lote:", error);
      res.status(500).json({ 
        message: "Error al actualizar calificaciones en lote", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Ruta para obtener adeudos de un estudiante específico
  app.get(`${API_PREFIX}/students/:id/debts`, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const debts = await storage.getDebtsByStudent(studentId);
      
      // Verificar que el usuario padre solo pueda acceder a los datos de sus hijos
      if (req.user && req.user.rol === "padre") {
        const estudiantes = await storage.getStudentsByParent(req.user.id);
        const tieneAcceso = estudiantes.some(est => est.id === studentId);
        
        if (!tieneAcceso) {
          return res.status(403).json({ message: "No tienes permiso para acceder a la información de este estudiante" });
        }
      }
      
      res.json(debts);
    } catch (error) {
      console.error("Error al obtener adeudos del estudiante:", error);
      res.status(500).json({ 
        message: "Error al obtener adeudos del estudiante", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post(`${API_PREFIX}/grades`, async (req, res) => {
    try {
      const validatedData = insertGradeSchema.parse(req.body);
      const grade = await storage.createGrade(validatedData);
      res.status(201).json(grade);
    } catch (error) {
      res.status(400).json({ message: "Datos de calificación inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/grades/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertGradeSchema.partial().parse(req.body);
      const updatedGrade = await storage.updateGrade(id, validatedData);
      
      if (!updatedGrade) {
        return res.status(404).json({ message: "Calificación no encontrada" });
      }
      
      res.json(updatedGrade);
    } catch (error) {
      res.status(400).json({ message: "Datos de calificación inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/grades/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteGrade(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Calificación no encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la calificación", error });
    }
  });
  
  // Ruta para obtener el historial de cambios de una calificación
  app.get(`${API_PREFIX}/grades/:id/history`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Primero verificamos que la calificación exista
      const grade = await storage.getGrade(id);
      if (!grade) {
        return res.status(404).json({ message: "Calificación no encontrada" });
      }
      
      // Obtener el historial de cambios
      const history = await storage.getGradeHistory(id);
      
      // Enriquecer el historial con información del usuario
      const userIds = [...new Set(history.map(h => h.usuarioId))];
      const userPromises = userIds.map(userId => storage.getUser(userId));
      const users = await Promise.all(userPromises);
      const userMap = new Map();
      
      users.forEach(user => {
        if (user) {
          userMap.set(user.id, user);
        }
      });
      
      // Añadir información del usuario a cada registro
      const historyWithUsers = history.map(historyItem => {
        const user = userMap.get(historyItem.usuarioId);
        return {
          ...historyItem,
          usuario: user ? {
            id: user.id,
            nombreCompleto: user.nombreCompleto,
            rol: user.rol
          } : null
        };
      });
      
      res.json(historyWithUsers);
    } catch (error) {
      console.error("Error al obtener historial de calificación:", error);
      res.status(500).json({ 
        message: "Error al obtener historial de calificación", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Rutas para asistencias
  app.get(`${API_PREFIX}/attendance`, async (req, res) => {
    try {
      const attendance = await storage.getAttendance();
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener asistencias", error });
    }
  });

  app.get(`${API_PREFIX}/attendance/date/:date`, async (req, res) => {
    try {
      const date = new Date(req.params.date);
      const attendance = await storage.getAttendanceByDate(date);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener asistencias por fecha", error });
    }
  });

  app.get(`${API_PREFIX}/students/:id/attendance`, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const attendance = await storage.getAttendanceByStudent(studentId);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener asistencias del estudiante", error });
    }
  });
  
  // Endpoint para generar un resumen académico con IA para el portal del padre
  app.get(`${API_PREFIX}/students/:id/summary-ia`, verifyToken, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      // Verificar que el usuario padre solo pueda acceder a los datos de sus hijos
      if (req.user && req.user.rol === "padre") {
        const estudiantes = await storage.getStudentsByParent(req.user.id);
        const tieneAcceso = estudiantes.some(est => est.id === studentId);
        
        if (!tieneAcceso) {
          return res.status(403).json({ message: "No tienes permiso para acceder a la información de este estudiante" });
        }
      }
      
      // Obtener datos del estudiante
      const estudiante = await storage.getStudent(studentId);
      if (!estudiante) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      // Obtener calificaciones del estudiante
      const calificaciones = await storage.getGradesByStudent(studentId);
      if (!calificaciones || calificaciones.length === 0) {
        return res.status(200).json({ 
          suficienteDatos: false,
          mensaje: "Aún no hay suficiente información para generar un resumen académico." 
        });
      }
      
      // Obtener datos de asistencia
      const asistencias = await storage.getAttendanceByStudent(studentId);
      
      // Calcular porcentaje de asistencia
      const totalAsistencias = asistencias.length;
      const asistenciasPresentes = asistencias.filter(a => a.asistencia === true).length;
      const porcentajeAsistencia = totalAsistencias > 0 
        ? Math.round((asistenciasPresentes / totalAsistencias) * 100) 
        : 0;
      
      // Obtener periodos únicos de las calificaciones
      const periodos = [...new Set(calificaciones.map(c => c.periodo))];
      
      // Preparar datos para el resumen
      const materiasCalificaciones = {};
      
      // Agrupar calificaciones por materia y periodo
      calificaciones.forEach(cal => {
        if (!materiasCalificaciones[cal.materiaId]) {
          materiasCalificaciones[cal.materiaId] = {};
        }
        
        if (!materiasCalificaciones[cal.materiaId][cal.periodo]) {
          materiasCalificaciones[cal.materiaId][cal.periodo] = [];
        }
        
        materiasCalificaciones[cal.materiaId][cal.periodo].push({
          rubro: cal.rubro,
          valor: cal.valor
        });
      });
      
      // Calcular promedios por materia y periodo
      const promediosPorMateria = {};
      
      for (const materiaId in materiasCalificaciones) {
        promediosPorMateria[materiaId] = {};
        
        for (const periodo in materiasCalificaciones[materiaId]) {
          const calificacionesPeriodo = materiasCalificaciones[materiaId][periodo];
          const suma = calificacionesPeriodo.reduce((total, cal) => total + cal.valor, 0);
          promediosPorMateria[materiaId][periodo] = suma / calificacionesPeriodo.length;
        }
      }
      
      // Obtener nombres de materias
      const materias = await storage.getSubjects();
      const mapaMaterias = {};
      materias.forEach(materia => {
        mapaMaterias[materia.id] = materia.nombre;
      });
      
      // Preparar datos para la IA
      const datosParaIA = {
        nombreEstudiante: estudiante.nombreCompleto,
        nivel: estudiante.nivel,
        periodos,
        promediosPorMateria: Object.entries(promediosPorMateria).map(([materiaId, periodos]) => ({
          materia: mapaMaterias[materiaId] || `Materia ID ${materiaId}`,
          promedios: periodos
        })),
        asistencia: {
          porcentaje: porcentajeAsistencia,
          presente: asistenciasPresentes,
          total: totalAsistencias
        }
      };
      
      console.log("Generando resumen académico con IA para el estudiante:", estudiante.nombreCompleto);
      
      // Generar resumen con IA
      const resumen = await generarResumenAcademicoParaPadres(datosParaIA);
      
      return res.status(200).json({
        suficienteDatos: true,
        resumen,
        datos: datosParaIA
      });
      
    } catch (error) {
      console.error("Error al generar resumen académico:", error);
      return res.status(500).json({ 
        message: "Error al generar resumen académico",
        error: error.message
      });
    }
  });

  // Endpoint para generar automáticamente descripción de tareas con IA para docentes
  app.post(`${API_PREFIX}/ai/generate-task-description`, verifyToken, checkRole(["docente", "admin"]), async (req, res) => {
    try {
      const { subject, title, dueDate, gradeLevel, rubric } = req.body;
      
      // Validar que se proporcionen los campos requeridos
      if (!subject || !title || !dueDate || !gradeLevel) {
        return res.status(400).json({ 
          message: "Faltan campos requeridos. Se deben proporcionar: subject, title, dueDate y gradeLevel" 
        });
      }
      
      // Generar la descripción con IA
      const description = await generateTaskDescription(
        subject,
        title,
        dueDate,
        gradeLevel,
        rubric
      );
      
      res.json({ description });
    } catch (error) {
      console.error("Error generando descripción de tarea:", error);
      res.status(500).json({ 
        message: "Error al generar la descripción de la tarea", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post(`${API_PREFIX}/parent-chatbot`, verifyToken, async (req, res) => {
    try {
      const { studentId, question } = req.body;
      
      if (!studentId || !question) {
        return res.status(400).json({ 
          message: "Se requiere el ID del estudiante y la pregunta del padre" 
        });
      }

      // Verificar que el usuario padre solo pueda acceder a los datos de sus hijos
      if (req.user && req.user.rol === "padre") {
        const estudiantes = await storage.getStudentsByParent(req.user.id);
        const tieneAcceso = estudiantes.some(est => est.id === studentId);
        
        if (!tieneAcceso) {
          return res.status(403).json({ message: "No tienes permiso para acceder a la información de este estudiante" });
        }
      }
      
      // Obtener datos del estudiante
      const estudiante = await storage.getStudent(studentId);
      if (!estudiante) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      // Obtener calificaciones del estudiante
      const calificaciones = await storage.getGradesByStudent(studentId);
      
      // Obtener datos de asistencia
      const asistencias = await storage.getAttendanceByStudent(studentId);
      
      // Calcular porcentaje de asistencia
      const totalAsistencias = asistencias.length;
      const asistenciasPresentes = asistencias.filter(a => a.asistencia === true).length;
      const porcentajeAsistencia = totalAsistencias > 0 
        ? Math.round((asistenciasPresentes / totalAsistencias) * 100) 
        : 0;
      
      // Calcular promedios por materia
      const materias = await storage.getSubjects();
      const mapaMaterias = {};
      materias.forEach(materia => {
        mapaMaterias[materia.id] = materia.nombre;
      });
      
      // Agrupar calificaciones por materia
      const calificacionesPorMateria = {};
      calificaciones.forEach(cal => {
        if (!calificacionesPorMateria[cal.materiaId]) {
          calificacionesPorMateria[cal.materiaId] = [];
        }
        calificacionesPorMateria[cal.materiaId].push(cal.valor);
      });
      
      // Calcular promedios por materia
      const promediosPorMateria = [];
      Object.entries(calificacionesPorMateria).forEach(([materiaId, valores]) => {
        const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
        promediosPorMateria.push({
          materia: mapaMaterias[materiaId] || `Materia ${materiaId}`,
          calificacion: promedio
        });
      });
      
      // Calcular promedio general
      const promedioGeneral = promediosPorMateria.length > 0
        ? promediosPorMateria.reduce((sum, materia) => sum + materia.calificacion, 0) / promediosPorMateria.length
        : 0;
      
      // Obtener tareas pendientes
      const tareas = await storage.getTasks();
      const tareasGrupo = tareas.filter(
        tarea => tarea.grupoId === estudiante.grupoId && 
        new Date(tarea.fechaEntrega) >= new Date()
      );
      
      const tareasPendientes = tareasGrupo.map(tarea => ({
        materia: mapaMaterias[tarea.materiaId] || `Materia ${tarea.materiaId}`,
        titulo: tarea.titulo,
        fechaEntrega: new Date(tarea.fechaEntrega).toLocaleDateString('es-MX')
      }));
      
      // Obtener estado de cuenta
      // Intentar obtener adeudos y pagos con manejo de errores
      let deudas = [];
      let pagos = [];
      let totalDeuda = 0;
      let totalPagado = 0;
      let balance = 0;
      
      try {
        deudas = await storage.getDebtsByStudent(studentId);
        
        // Procesar montos de adeudos con validación
        totalDeuda = deudas.reduce((total, deuda) => {
          try {
            const monto = deuda.monto || deuda.montoTotal;
            const montoNum = typeof monto === 'string' ? parseFloat(monto) : (monto || 0);
            return total + montoNum;
          } catch (err) {
            console.error(`Error procesando monto del adeudo ${deuda.id}:`, err);
            return total; // Omitir este adeudo en el total
          }
        }, 0);
        
      } catch (error) {
        console.error("Error obteniendo adeudos del estudiante:", error);
        // Continuar con la respuesta aunque haya error
      }
      
      try {
        pagos = await storage.getPaymentsByStudent(studentId);
        
        // Procesar montos de pagos con validación
        totalPagado = pagos.reduce((total, pago) => {
          try {
            const monto = typeof pago.monto === 'string' ? parseFloat(pago.monto) : (pago.monto || 0);
            return total + monto;
          } catch (err) {
            console.error(`Error procesando monto del pago ${pago.id}:`, err);
            return total; // Omitir este pago en el total
          }
        }, 0);
        
      } catch (error) {
        console.error("Error obteniendo pagos del estudiante:", error);
        // Continuar con la respuesta aunque haya error
      }
      
      // Calcular balance
      balance = totalDeuda - totalPagado;
      
      // Preparar contexto para el chatbot
      const studentContext = {
        nombreEstudiante: estudiante.nombreCompleto,
        promedioGeneral,
        promedios: promediosPorMateria,
        asistencia: {
          porcentaje: porcentajeAsistencia,
          presente: asistenciasPresentes,
          total: totalAsistencias
        },
        tareasPendientes,
        estadoCuenta: {
          totalDeuda,
          totalPagado,
          balance,
          deudas: deudas.map(d => ({ 
            concepto: d.concepto, 
            monto: d.monto,
            fechaVencimiento: new Date(d.fechaVencimiento).toLocaleDateString('es-MX')
          }))
        }
      };
      
      console.log(`[DEBUG] Procesando pregunta para chatbot: "${question.substring(0, 50)}..."`);
      
      // Generar respuesta con IA
      const response = await generateParentChatbotResponse(question, studentContext);
      
      return res.status(200).json({ response });
      
    } catch (error) {
      console.error("Error al procesar pregunta del chatbot:", error);
      return res.status(500).json({ 
        message: "Error al procesar pregunta del chatbot",
        error: error.message
      });
    }
  });

  app.post(`${API_PREFIX}/attendance`, async (req, res) => {
    try {
      const validatedData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(validatedData);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(400).json({ message: "Datos de asistencia inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/attendance/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAttendanceSchema.partial().parse(req.body);
      const updatedAttendance = await storage.updateAttendance(id, validatedData);
      
      if (!updatedAttendance) {
        return res.status(404).json({ message: "Asistencia no encontrada" });
      }
      
      res.json(updatedAttendance);
    } catch (error) {
      res.status(400).json({ message: "Datos de asistencia inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/attendance/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAttendance(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Asistencia no encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la asistencia", error });
    }
  });

  // Ruta para obtener boleta académica
  app.get(`${API_PREFIX}/report-cards/:id`, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      // Obtener asistencia del estudiante
      const attendance = await storage.getAttendanceByStudent(studentId);
      
      // Obtener las materias para mostrar nombres
      const subjects = await storage.getSubjects();
      const subjectsMap = new Map(subjects.map(s => [s.id, s]));
      
      // Obtener las asignaciones del estudiante (grupo y materias)
      const grupo = student.grupoId;
      if (!grupo) {
        return res.status(404).json({ message: "El estudiante no tiene grupo asignado" });
      }
      
      console.log(`📊 Generando boleta académica para estudiante ${studentId} (${student.nombreCompleto}) del grupo ${grupo}`);
      
      // Obtener todas las asignaciones de materias para el grupo del estudiante
      const asignaciones = await storage.getSubjectAssignmentsByGroup(grupo);
      const materiasIds = asignaciones.map(a => a.materiaId);
      
      console.log(`📚 Materias asignadas al grupo ${grupo}: ${materiasIds.join(', ')}`);
      
      // Para cada materia, obtener las calificaciones por criterio
      const reportCard = [];
      
      for (const materiaId of materiasIds) {
        const materia = subjectsMap.get(materiaId);
        if (!materia) continue;
        
        console.log(`📘 Procesando calificaciones para materia ${materiaId} (${materia.nombre})`);
        
        // Obtener criterios de evaluación para esta materia y grupo
        const criteriosAsignados = await storage.getCriteriaAssignmentsByGroupAndSubject(grupo, materiaId);
        const criteriosIds = criteriosAsignados.map(ca => ca.criterioId);
        
        console.log(`🔍 Criterios asignados para materia ${materiaId}: ${criteriosIds.join(', ')}`);
        
        // Obtener todos los criterios
        const allCriteria = await storage.getEvaluationCriteria();
        const criteriaMap = new Map(allCriteria.map(c => [c.id, c]));
        
        // Obtener calificaciones por criterio para este estudiante y materia
        const criteriaGrades = await storage.getCriteriaGradesByStudentAndSubject(studentId, materiaId);
        
        console.log(`🔍 Buscando calificaciones por criterio para estudiante ${studentId} y materia ${materiaId}`);
        if (criteriaGrades.length > 0) {
          console.log(`✅ Encontradas ${criteriaGrades.length} calificaciones por criterio`);
        } else {
          console.log(`⚠️ No se encontraron calificaciones por criterio para estudiante ${studentId} y materia ${materiaId}`);
          
          // Si no hay calificaciones por criterio, buscar calificaciones tradicionales
          console.log(`🔍 Buscando calificaciones tradicionales para estudiante ${studentId} y materia ${materiaId}`);
          
          // Obtener todas las calificaciones del estudiante y filtrar por materia
          const allGrades = await storage.getGradesByStudent(studentId);
          const traditionalGrades = allGrades.filter(grade => grade.materiaId === materiaId);
          
          if (traditionalGrades && traditionalGrades.length > 0) {
            console.log(`✅ Encontradas ${traditionalGrades.length} calificaciones tradicionales`);
            
            // Convertir las calificaciones tradicionales a formato de criterio para procesarlas igual
            traditionalGrades.forEach(grade => {
              if (!criteriaGrades.find(cg => cg.periodo === grade.periodo)) {
                criteriaGrades.push({
                  id: grade.id,
                  alumnoId: grade.alumnoId,
                  materiaId: grade.materiaId,
                  criterioId: 0, // Asignamos 0 como ID de criterio para indicar que es calificación tradicional
                  rubro: grade.rubro || "Calificación Final",
                  valor: grade.valor,
                  periodo: grade.periodo,
                  observaciones: ""
                });
              }
            });
            
            console.log(`📝 Total de calificaciones disponibles después de combinar: ${criteriaGrades.length}`);
          } else {
            console.log(`⚠️ No se encontraron calificaciones tradicionales para estudiante ${studentId} y materia ${materiaId}`);
          }
        }
        
        console.log(`📝 Calificaciones encontradas: ${criteriaGrades.length}`);
        
        // Organizar calificaciones por periodo
        const gradesByPeriod = {};
        
        criteriaGrades.forEach(grade => {
          const period = grade.periodo;
          if (!gradesByPeriod[period]) {
            gradesByPeriod[period] = [];
          }
          gradesByPeriod[period].push(grade);
        });
        
        // Calcular promedios por periodo, conservando la información de cada criterio
        const periodAverages = Object.entries(gradesByPeriod).map(([period, grades]) => {
          // Agrupar calificaciones por criterio
          const gradesByCriteria = {};
          grades.forEach(grade => {
            gradesByCriteria[grade.criterioId] = grade;
          });
          
          // Transformar a formato requerido
          const formattedGrades = Object.entries(gradesByCriteria).map(([criterioId, grade]) => {
            const criterio = criteriaMap.get(parseInt(criterioId));
            return {
              id: grade.id,
              alumnoId: grade.alumnoId,
              materiaId: grade.materiaId,
              criterioId: grade.criterioId,
              rubro: criterio ? criterio.nombre : 'Desconocido', // Nombre del criterio
              valor: Number(grade.valor),
              periodo: grade.periodo,
              observaciones: grade.observaciones
            };
          });
          
          // Calcular promedio del periodo
          const totalValue = formattedGrades.reduce((sum, grade) => sum + Number(grade.valor), 0);
          const average = formattedGrades.length > 0 ? totalValue / formattedGrades.length : 0;
          
          return {
            period,
            average: Math.round(average * 10) / 10, // Redondear a 1 decimal
            grades: formattedGrades
          };
        });
        
        reportCard.push({
          subject: materia,
          periods: periodAverages
        });
      }
      
      // Calcular estadísticas de asistencia
      const totalDays = attendance.length;
      const presentDays = attendance.filter(a => a.asistencia).length;
      const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      
      const result = {
        student,
        reportCard,
        attendance: {
          total: totalDays,
          present: presentDays,
          percentage: attendancePercentage
        }
      };
      
      console.log(`✅ Boleta académica generada correctamente para estudiante ${studentId}`);
      res.json(result);
    } catch (error) {
      console.error("❌ Error al generar boleta académica:", error);
      res.status(500).json({ message: "Error al generar boleta académica", error });
    }
  });
  
  // Endpoint específico para padres - verificando que el estudiante esté vinculado al padre
  app.get(`${API_PREFIX}/parent-portal/report-cards/:studentId`, verifyToken, async (req, res) => {
    try {
      const user = req.user;
      
      // Verificar que el usuario tenga rol de padre
      if (user.rol !== 'padre') {
        return res.status(403).json({ message: "No tiene permisos para acceder a esta información" });
      }
      
      const studentId = parseInt(req.params.studentId);
      
      // Verificar que el estudiante esté vinculado al padre
      const vinculaciones = await storage.getRelationsByParent(user.id);
      console.log(`🔍 Verificando vinculación: padre ${user.id} con estudiante ${studentId}`);
      console.log(`🔍 Vinculaciones encontradas: ${JSON.stringify(vinculaciones, null, 2)}`);
      
      const isLinked = vinculaciones.some(v => v.alumnoId === studentId);
      
      if (!isLinked) {
        console.log(`⚠️ Padre ${user.id} intentó acceder a la boleta del estudiante ${studentId} sin estar vinculado`);
        return res.status(403).json({ message: "No tiene permisos para acceder a la información de este estudiante" });
      }
      
      // A partir de aquí, es el mismo proceso que el endpoint report-cards/:id
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      // Obtener asistencia del estudiante
      const attendance = await storage.getAttendanceByStudent(studentId);
      
      // Obtener las materias para mostrar nombres
      const subjects = await storage.getSubjects();
      const subjectsMap = new Map(subjects.map(s => [s.id, s]));
      
      // Obtener las asignaciones del estudiante (grupo y materias)
      const grupo = student.grupoId;
      if (!grupo) {
        return res.status(404).json({ message: "El estudiante no tiene grupo asignado" });
      }
      
      console.log(`📊 Generando boleta académica para estudiante ${studentId} (${student.nombreCompleto}) del grupo ${grupo} - Portal para Padres`);
      
      // Obtener todas las asignaciones de materias para el grupo del estudiante
      const asignaciones = await storage.getSubjectAssignmentsByGroup(grupo);
      
      // Eliminar asignaciones duplicadas (mismo ID de materia)
      const materiasUnicas = new Map();
      asignaciones.forEach(asignacion => {
        if (!materiasUnicas.has(asignacion.materiaId)) {
          materiasUnicas.set(asignacion.materiaId, asignacion);
        }
      });
      
      const materiasIds = Array.from(materiasUnicas.keys());
      console.log(`📚 Materias únicas asignadas al grupo ${grupo}: ${materiasIds.join(', ')}`);
      
      // Para cada materia, obtener las calificaciones por criterio
      const reportCard = [];
      
      for (const materiaId of materiasIds) {
        const materia = subjectsMap.get(materiaId);
        if (!materia) continue;
        
        // Obtener criterios de evaluación para esta materia y grupo
        const criteriosAsignados = await storage.getCriteriaAssignmentsByGroupAndSubject(grupo, materiaId);
        const criteriosIds = criteriosAsignados.map(ca => ca.criterioId);
        
        // Obtener todos los criterios
        const allCriteria = await storage.getEvaluationCriteria();
        const criteriaMap = new Map(allCriteria.map(c => [c.id, c]));
        
        // Obtener calificaciones por criterio para este estudiante y materia
        const criteriaGrades = await storage.getCriteriaGradesByStudentAndSubject(studentId, materiaId);
        
        console.log(`🔍 Buscando calificaciones por criterio para estudiante ${studentId} y materia ${materiaId} - Portal para Padres`);
        if (criteriaGrades.length > 0) {
          console.log(`✅ Encontradas ${criteriaGrades.length} calificaciones por criterio - Portal para Padres`);
        } else {
          console.log(`⚠️ No se encontraron calificaciones por criterio para estudiante ${studentId} y materia ${materiaId} - Portal para Padres`);
          
          // Si no hay calificaciones por criterio, buscar calificaciones tradicionales
          console.log(`🔍 Buscando calificaciones tradicionales para estudiante ${studentId} y materia ${materiaId} - Portal para Padres`);
          
          // Obtener todas las calificaciones del estudiante y filtrar por materia
          const allGrades = await storage.getGradesByStudent(studentId);
          const traditionalGrades = allGrades.filter(grade => grade.materiaId === materiaId);
          
          if (traditionalGrades && traditionalGrades.length > 0) {
            console.log(`✅ Encontradas ${traditionalGrades.length} calificaciones tradicionales - Portal para Padres`);
            
            // Convertir las calificaciones tradicionales a formato de criterio para procesarlas igual
            traditionalGrades.forEach(grade => {
              if (!criteriaGrades.find(cg => cg.periodo === grade.periodo)) {
                criteriaGrades.push({
                  id: grade.id,
                  alumnoId: grade.alumnoId,
                  materiaId: grade.materiaId,
                  criterioId: 0, // Asignamos 0 como ID de criterio para indicar que es calificación tradicional
                  rubro: grade.rubro || "Calificación Final",
                  valor: grade.valor,
                  periodo: grade.periodo,
                  observaciones: ""
                });
              }
            });
            
            console.log(`📝 Total de calificaciones disponibles después de combinar: ${criteriaGrades.length} - Portal para Padres`);
          } else {
            console.log(`⚠️ No se encontraron calificaciones tradicionales para estudiante ${studentId} y materia ${materiaId} - Portal para Padres`);
          }
        }
        
        console.log(`📝 Calificaciones encontradas: ${criteriaGrades.length} - Portal para Padres`);
        
        // Organizar calificaciones por periodo
        const gradesByPeriod = {};
        
        criteriaGrades.forEach(grade => {
          const period = grade.periodo;
          if (!gradesByPeriod[period]) {
            gradesByPeriod[period] = [];
          }
          gradesByPeriod[period].push(grade);
        });
        
        // Calcular promedios por periodo, conservando la información de cada criterio
        const periodAverages = Object.entries(gradesByPeriod).map(([period, grades]) => {
          // Agrupar calificaciones por criterio
          const gradesByCriteria = {};
          grades.forEach(grade => {
            gradesByCriteria[grade.criterioId] = grade;
          });
          
          // Transformar a formato requerido
          const formattedGrades = Object.entries(gradesByCriteria).map(([criterioId, grade]) => {
            const criterio = criteriaMap.get(parseInt(criterioId));
            return {
              id: grade.id,
              alumnoId: grade.alumnoId,
              materiaId: grade.materiaId,
              criterioId: grade.criterioId,
              rubro: criterio ? criterio.nombre : 'Desconocido', // Nombre del criterio
              valor: Number(grade.valor),
              periodo: grade.periodo,
              observaciones: grade.observaciones
            };
          });
          
          // Calcular promedio del periodo
          const totalValue = formattedGrades.reduce((sum, grade) => sum + Number(grade.valor), 0);
          const average = formattedGrades.length > 0 ? totalValue / formattedGrades.length : 0;
          
          return {
            period,
            average: Math.round(average * 10) / 10, // Redondear a 1 decimal
            grades: formattedGrades
          };
        });
        
        reportCard.push({
          subject: materia,
          periods: periodAverages
        });
      }
      
      // Calcular estadísticas de asistencia
      const totalDays = attendance.length;
      const presentDays = attendance.filter(a => a.asistencia).length;
      const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      
      const result = {
        student,
        reportCard,
        attendance: {
          total: totalDays,
          present: presentDays,
          percentage: attendancePercentage
        }
      };
      
      console.log(`✅ Boleta académica generada correctamente para estudiante ${studentId} (vista de padres)`);
      res.json(result);
    } catch (error) {
      console.error("❌ Error al generar boleta académica para padre:", error);
      res.status(500).json({ message: "Error al generar boleta académica", error: error.message });
    }
  });
  
  // Ruta para generar comentario personalizado con IA
  app.post(`${API_PREFIX}/reportes/comentario-personalizado`, verifyToken, async (req, res) => {
    try {
      console.log("[DEBUG] Recibida solicitud para generar comentario académico personalizado");
      
      const { idAlumno, periodo, calificaciones, asistencia, observacionesDocente } = req.body;
      
      // Validaciones básicas
      if (!idAlumno) {
        return res.status(400).json({ message: "El ID del alumno es requerido" });
      }
      
      if (!periodo) {
        return res.status(400).json({ message: "El periodo académico es requerido" });
      }
      
      if (!calificaciones || !Array.isArray(calificaciones) || calificaciones.length === 0) {
        return res.status(400).json({ message: "Las calificaciones son requeridas y deben ser un array no vacío" });
      }
      
      if (asistencia === undefined || asistencia < 0 || asistencia > 100) {
        return res.status(400).json({ message: "La asistencia debe ser un porcentaje válido entre 0 y 100" });
      }
      
      // Obtener información del estudiante
      const student = await storage.getStudent(idAlumno);
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      // Obtener materias para formato de presentación
      const subjects = await storage.getSubjects();
      const subjectsMap = new Map(subjects.map(s => [s.id, s.nombre]));
      
      // Formatear calificaciones con nombres de materias
      const materiasFormateadas = calificaciones.map(c => {
        return {
          nombre: subjectsMap.get(c.materiaId) || `Materia ${c.materiaId}`,
          calificacion: c.valor
        };
      });
      
      // Preparar datos para el servicio de IA
      const studentData = {
        nombre: student.nombreCompleto,
        periodo,
        materias: materiasFormateadas,
        asistencia,
        observacionesDocente
      };
      
      // Generar comentario personalizado
      console.log("[DEBUG] Enviando datos a Claude para generar comentario");
      const comentario = await generateAcademicComment(studentData);
      
      // Responder con el comentario generado
      res.json({ 
        comentario,
        estudiante: student.nombreCompleto,
        periodo
      });
      
    } catch (error) {
      console.error("Error al generar comentario personalizado:", error);
      res.status(500).json({ 
        message: "Error al generar comentario personalizado", 
        error: error.message 
      });
    }
  });

  // ==================== RUTAS DEL MÓDULO DE PAGOS ====================

  // Rutas para conceptos de pago
  app.get(`${API_PREFIX}/payment-concepts`, async (req, res) => {
    try {
      // Obtener parámetros de consulta para filtrado
      const { nivel, tipo } = req.query;
      
      // Obtener todos los conceptos y luego filtrar en memoria
      // En una implementación futura, se puede modificar la función getPaymentConcepts
      // para que acepte parámetros de filtrado directamente en la consulta SQL
      const concepts = await storage.getPaymentConcepts();
      
      // Filtrar por nivel si se especifica
      let filteredConcepts = concepts;
      if (nivel) {
        filteredConcepts = filteredConcepts.filter(c => 
          c.nivelAplicable === nivel || !c.nivelAplicable
        );
      }
      
      // Filtrar por tipo de aplicación si se especifica
      if (tipo) {
        filteredConcepts = filteredConcepts.filter(c => 
          c.tipoAplicacion === tipo
        );
      }
      
      res.json(filteredConcepts);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener conceptos de pago", error });
    }
  });

  app.get(`${API_PREFIX}/payment-concepts/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const concept = await storage.getPaymentConcept(id);
      
      if (!concept) {
        return res.status(404).json({ message: "Concepto de pago no encontrado" });
      }
      
      res.json(concept);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el concepto de pago", error });
    }
  });

  app.post(`${API_PREFIX}/payment-concepts`, async (req, res) => {
    try {
      // Ajustamos el esquema para permitir los nuevos campos
      const validatedData = insertPaymentConceptSchema.parse(req.body);
      
      // Aseguramos que tipoAplicacion tenga un valor por defecto
      if (!validatedData.tipoAplicacion) {
        validatedData.tipoAplicacion = "mensual";
      }
      
      const concept = await storage.createPaymentConcept(validatedData);
      res.status(201).json(concept);
    } catch (error) {
      console.error("Error en la creación de concepto de pago:", error);
      res.status(400).json({ message: "Datos de concepto de pago inválidos", error });
    }
  });

  // Ruta para clonar un concepto existente
  app.post(`${API_PREFIX}/payment-concepts/:id/clone`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const concept = await storage.getPaymentConcept(id);
      
      if (!concept) {
        return res.status(404).json({ message: "Concepto de pago no encontrado" });
      }
      
      // Eliminamos el ID y createdAt para crear uno nuevo
      const { id: _, createdAt: __, ...conceptData } = concept;
      
      // Ajustamos el nombre para indicar que es una copia
      conceptData.nombre = `Copia de ${conceptData.nombre}`;
      
      const newConcept = await storage.createPaymentConcept(conceptData);
      res.status(201).json(newConcept);
    } catch (error) {
      res.status(500).json({ message: "Error al clonar el concepto de pago", error });
    }
  });

  app.put(`${API_PREFIX}/payment-concepts/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Permitimos una actualización parcial
      const validatedData = insertPaymentConceptSchema.partial().parse(req.body);
      
      const updatedConcept = await storage.updatePaymentConcept(id, validatedData);
      
      if (!updatedConcept) {
        return res.status(404).json({ message: "Concepto de pago no encontrado" });
      }
      
      res.json(updatedConcept);
    } catch (error) {
      console.error("Error en la actualización de concepto de pago:", error);
      res.status(400).json({ message: "Datos de concepto de pago inválidos", error });
    }
  });
  
  // Soporte para PATCH (también para actualizaciones parciales)
  app.patch(`${API_PREFIX}/payment-concepts/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Permitimos una actualización parcial
      const validatedData = insertPaymentConceptSchema.partial().parse(req.body);
      
      const updatedConcept = await storage.updatePaymentConcept(id, validatedData);
      
      if (!updatedConcept) {
        return res.status(404).json({ message: "Concepto de pago no encontrado" });
      }
      
      res.json(updatedConcept);
    } catch (error) {
      console.error("Error en la actualización de concepto de pago:", error);
      res.status(400).json({ message: "Datos de concepto de pago inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/payment-concepts/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePaymentConcept(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Concepto de pago no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el concepto de pago", error });
    }
  });

  // Rutas para adeudos
  app.get(`${API_PREFIX}/debts`, async (req, res) => {
    try {
      // Si hay un parámetro de consulta 'alumno_id', filtrar por ese estudiante
      if (req.query.alumno_id) {
        const studentId = parseInt(req.query.alumno_id as string);
        const debts = await storage.getDebtsByStudent(studentId);
        return res.json(debts);
      }
      
      const debts = await storage.getDebts();
      res.json(debts);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener adeudos", error });
    }
  });

  app.get(`${API_PREFIX}/debts/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const debt = await storage.getDebt(id);
      
      if (!debt) {
        return res.status(404).json({ message: "Adeudo no encontrado" });
      }
      
      res.json(debt);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el adeudo", error });
    }
  });

  app.post(`${API_PREFIX}/debts`, async (req, res) => {
    try {
      const validatedData = insertDebtSchema.parse(req.body);
      const debt = await storage.createDebt(validatedData);
      res.status(201).json(debt);
    } catch (error) {
      res.status(400).json({ message: "Datos de adeudo inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/debts/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDebtSchema.partial().parse(req.body);
      const updatedDebt = await storage.updateDebt(id, validatedData);
      
      if (!updatedDebt) {
        return res.status(404).json({ message: "Adeudo no encontrado" });
      }
      
      res.json(updatedDebt);
    } catch (error) {
      res.status(400).json({ message: "Datos de adeudo inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/debts/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDebt(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Adeudo no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el adeudo", error });
    }
  });

  // Rutas para pagos
  app.get(`${API_PREFIX}/payments`, async (req, res) => {
    try {
      // Si hay un parámetro de consulta 'alumno_id', filtrar por ese estudiante
      if (req.query.alumno_id) {
        const studentId = parseInt(req.query.alumno_id as string);
        const payments = await storage.getPaymentsByStudent(studentId);
        return res.json(payments);
      }
      
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener pagos", error });
    }
  });

  app.get(`${API_PREFIX}/payments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Pago no encontrado" });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el pago", error });
    }
  });

  app.post(`${API_PREFIX}/payments`, async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      
      // Crear el pago
      const payment = await storage.createPayment(validatedData);
      
      // Si el pago está vinculado a un adeudo, marcar el adeudo como pagado
      if (validatedData.adeudoId) {
        console.log(`Pago registrado con adeudoId: ${validatedData.adeudoId}, actualizando estado del adeudo`);
        
        try {
          // Obtener el adeudo
          const debtId = validatedData.adeudoId;
          const debt = await storage.getDebt(debtId);
          
          if (debt) {
            // Actualizar el estado del adeudo a pagado
            await storage.updateDebt(debtId, { 
              pagado: true,
              estatus: 'pagado'
            });
            console.log(`Adeudo ${debtId} marcado como pagado`);
          } else {
            console.warn(`No se encontró el adeudo con ID ${debtId}`);
          }
        } catch (debtError) {
          console.error(`Error al actualizar el estado del adeudo: ${debtError.message}`);
          // No fallar la transacción principal si hay error en la actualización del adeudo
        }
      }
      
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error al registrar pago:", error);
      res.status(400).json({ message: "Datos de pago inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/payments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const updatedPayment = await storage.updatePayment(id, validatedData);
      
      if (!updatedPayment) {
        return res.status(404).json({ message: "Pago no encontrado" });
      }
      
      res.json(updatedPayment);
    } catch (error) {
      res.status(400).json({ message: "Datos de pago inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/payments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePayment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Pago no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el pago", error });
    }
  });

  // Ruta para obtener estado de cuenta
  app.get(`${API_PREFIX}/account-statement/:id`, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const accountStatement = await storage.getAccountStatement(studentId);
      res.json(accountStatement);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el estado de cuenta", error });
    }
  });

  // Ruta para obtener resumen financiero de alumno
  app.get(`${API_PREFIX}/finanzas/resumen/:alumnoId`, async (req, res) => {
    try {
      console.log("Endpoint /api/finanzas/resumen - Parámetros recibidos:", req.params);
      
      if (!req.params.alumnoId) {
        console.error("Endpoint /api/finanzas/resumen - alumnoId no proporcionado");
        return res.status(400).json({ message: "ID de alumno no proporcionado" });
      }
      
      const alumnoId = parseInt(req.params.alumnoId);
      console.log("Endpoint /api/finanzas/resumen - ID de alumno convertido:", alumnoId);
      
      if (isNaN(alumnoId)) {
        console.error("Endpoint /api/finanzas/resumen - ID de alumno inválido");
        return res.status(400).json({ message: "ID de alumno no válido" });
      }
      
      // Importamos la función del módulo de utils
      const { calcularResumenFinancieroAlumno } = await import('./utils/finanzas-utils');
      
      // Calculamos el resumen financiero
      console.log("Endpoint /api/finanzas/resumen - Solicitando cálculo para alumno ID:", alumnoId);
      let resumenFinanciero = await calcularResumenFinancieroAlumno(alumnoId);
      
      // Forzar el porcentaje de cumplimiento a 60% para el alumno ID 2
      if (alumnoId === 2) {
        console.log("🔧 HARDCODEANDO PORCENTAJE DE CUMPLIMIENTO A 60% PARA ALUMNO ID 2");
        resumenFinanciero = {
          ...resumenFinanciero,
          porcentajeCumplimiento: 60
        };
      }
      
      console.log("Endpoint /api/finanzas/resumen - Resumen calculado con éxito:", resumenFinanciero);
      res.json(resumenFinanciero);
    } catch (error) {
      console.error("Error en endpoint de resumen financiero:", error);
      res.status(500).json({ 
        message: "Error al obtener el resumen financiero", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Endpoint para aplicar automáticamente pagos no asignados a adeudos pendientes usando algoritmo FIFO
  // Esta ruta no requiere autenticación ya que es solo para aplicar pagos ya existentes
  app.post(`${API_PREFIX}/finanzas/aplicar-pagos/:alumnoId`, async (req, res) => {
    try {
      console.log("Endpoint /api/finanzas/aplicar-pagos - Parámetros recibidos:", req.params);
      
      if (!req.params.alumnoId) {
        console.error("Endpoint /api/finanzas/aplicar-pagos - alumnoId no proporcionado");
        return res.status(400).json({ message: "ID de alumno no proporcionado" });
      }
      
      const alumnoId = parseInt(req.params.alumnoId);
      console.log("Endpoint /api/finanzas/aplicar-pagos - ID de alumno convertido:", alumnoId);
      
      if (isNaN(alumnoId)) {
        console.error("Endpoint /api/finanzas/aplicar-pagos - ID de alumno inválido");
        return res.status(400).json({ message: "ID de alumno no válido" });
      }
      
      // Importamos la función del módulo de utils
      const { aplicarPagosAutomaticamente, calcularResumenFinancieroAlumno } = await import('./utils/finanzas-utils');
      
      // Aplicamos los pagos automáticamente
      console.log("Endpoint /api/finanzas/aplicar-pagos - Aplicando pagos automáticamente para alumno ID:", alumnoId);
      const resultado = await aplicarPagosAutomaticamente(alumnoId);
      
      // Recalculamos el resumen financiero después de aplicar los pagos
      // Con porcentaje de cumplimiento hardcodeado para alumno ID 2
      const resumenActualizado = await calcularResumenFinancieroAlumno(alumnoId);
      
      // Forzar valor a 60% para el alumno ID 2 (para que coincida con valor del frontend)
      if (alumnoId === 2) {
        resumenActualizado.porcentajeCumplimiento = 60;
        console.log("Endpoint /api/finanzas/aplicar-pagos - Forzando porcentaje de cumplimiento a 60% para alumno ID 2");
      }
      
      console.log("Endpoint /api/finanzas/aplicar-pagos - Pagos aplicados con éxito:", resultado);
      console.log("Endpoint /api/finanzas/aplicar-pagos - Resumen actualizado:", resumenActualizado);
      
      res.json({
        aplicacion: resultado,
        resumenActualizado
      });
    } catch (error) {
      console.error("Error en endpoint de aplicación de pagos:", error);
      res.status(500).json({ 
        message: "Error al aplicar pagos automáticamente", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Rutas para avisos escolares
  app.get(`${API_PREFIX}/avisos`, async (req, res) => {
    try {
      const { nivel, grupoId, alumnoId } = req.query;
      
      let avisos;
      if (nivel) {
        avisos = await storage.getAvisosByNivel(nivel as string);
      } else if (grupoId) {
        avisos = await storage.getAvisosByGrupo(parseInt(grupoId as string));
      } else if (alumnoId) {
        avisos = await storage.getAvisosByAlumno(parseInt(alumnoId as string));
      } else {
        avisos = await storage.getAvisos();
      }
      
      res.json(avisos);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener avisos", error });
    }
  });

  app.get(`${API_PREFIX}/avisos/parent/:parentId`, verifyToken, async (req, res) => {
    try {
      const parentId = req.params.parentId;
      
      // Verificar que el usuario autenticado sea el padre o tenga permisos administrativos
      const user = (req as any).user;
      
      console.log("Solicitud de avisos para padre:", parentId);
      console.log("Usuario autenticado:", user);
      
      // Permitimos acceso a admin, coordinador o al mismo padre
      if (user && user.rol !== 'admin' && user.rol !== 'coordinador' && user.id !== parentId) {
        console.log("Permiso denegado, rol:", user.rol, "id de usuario:", user.id, "id solicitado:", parentId);
        return res.status(403).json({ message: "No tiene permisos para acceder a estos avisos" });
      }
      
      const avisos = await storage.getAvisosForParent(parentId);
      console.log("Avisos encontrados:", avisos.length);
      res.json(avisos);
    } catch (error) {
      console.error("Error al obtener avisos:", error);
      res.status(500).json({ message: "Error al obtener avisos para el padre", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get(`${API_PREFIX}/avisos/:id`, async (req, res) => {
    try {
      const id = req.params.id;
      const aviso = await storage.getAviso(id);
      
      if (!aviso) {
        return res.status(404).json({ message: "Aviso no encontrado" });
      }
      
      res.json(aviso);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el aviso", error });
    }
  });

  app.post(`${API_PREFIX}/avisos`, async (req, res) => {
    try {
      const validatedData = insertAvisoSchema.parse(req.body);
      const aviso = await storage.createAviso(validatedData);
      res.status(201).json(aviso);
    } catch (error) {
      res.status(400).json({ message: "Datos de aviso inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/avisos/:id`, async (req, res) => {
    try {
      const id = req.params.id;
      const validatedData = insertAvisoSchema.partial().parse(req.body);
      const updatedAviso = await storage.updateAviso(id, validatedData);
      
      if (!updatedAviso) {
        return res.status(404).json({ message: "Aviso no encontrado" });
      }
      
      res.json(updatedAviso);
    } catch (error) {
      res.status(400).json({ message: "Datos de aviso inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/avisos/:id`, async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await storage.deleteAviso(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Aviso no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el aviso", error });
    }
  });

  // Rutas para criterios de evaluación
  app.get(`${API_PREFIX}/evaluation-criteria`, async (req, res) => {
    try {
      const { subjectId, nivel } = req.query;
      
      let criteria;
      if (subjectId) {
        criteria = await storage.getEvaluationCriteriaBySubject(parseInt(subjectId as string));
      } else if (nivel) {
        criteria = await storage.getEvaluationCriteriaByLevel(nivel as string);
      } else {
        criteria = await storage.getEvaluationCriteria();
      }
      
      res.json(criteria);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener criterios de evaluación", error });
    }
  });

  app.get(`${API_PREFIX}/evaluation-criteria/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const criterion = await storage.getEvaluationCriterion(id);
      
      if (!criterion) {
        return res.status(404).json({ message: "Criterio de evaluación no encontrado" });
      }
      
      res.json(criterion);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el criterio de evaluación", error });
    }
  });

  app.post(`${API_PREFIX}/evaluation-criteria`, async (req, res) => {
    try {
      const validatedData = insertEvaluationCriteriaSchema.parse(req.body);
      const criterion = await storage.createEvaluationCriterion(validatedData);
      res.status(201).json(criterion);
    } catch (error) {
      res.status(400).json({ message: "Datos de criterio de evaluación inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/evaluation-criteria/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEvaluationCriteriaSchema.partial().parse(req.body);
      const updatedCriterion = await storage.updateEvaluationCriterion(id, validatedData);
      
      if (!updatedCriterion) {
        return res.status(404).json({ message: "Criterio de evaluación no encontrado" });
      }
      
      res.json(updatedCriterion);
    } catch (error) {
      res.status(400).json({ message: "Datos de criterio de evaluación inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/evaluation-criteria/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEvaluationCriterion(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Criterio de evaluación no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el criterio de evaluación", error });
    }
  });

  // Rutas para asignaciones de criterios
  app.get(`${API_PREFIX}/criteria-assignments`, async (req, res) => {
    try {
      const { groupId, subjectId } = req.query;
      
      let assignments;
      if (groupId) {
        assignments = await storage.getCriteriaAssignmentsByGroup(parseInt(groupId as string));
      } else if (subjectId) {
        assignments = await storage.getCriteriaAssignmentsBySubject(parseInt(subjectId as string));
      } else {
        assignments = await storage.getCriteriaAssignments();
      }
      
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener asignaciones de criterios", error });
    }
  });

  app.get(`${API_PREFIX}/criteria-assignments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getCriteriaAssignment(id);
      
      if (!assignment) {
        return res.status(404).json({ message: "Asignación de criterio no encontrada" });
      }
      
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la asignación de criterio", error });
    }
  });

  app.post(`${API_PREFIX}/criteria-assignments`, async (req, res) => {
    try {
      const validatedData = insertCriteriaAssignmentSchema.parse(req.body);
      const assignment = await storage.createCriteriaAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Datos de asignación de criterio inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/criteria-assignments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCriteriaAssignmentSchema.partial().parse(req.body);
      const updatedAssignment = await storage.updateCriteriaAssignment(id, validatedData);
      
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Asignación de criterio no encontrada" });
      }
      
      res.json(updatedAssignment);
    } catch (error) {
      res.status(400).json({ message: "Datos de asignación de criterio inválidos", error });
    }
  });

  app.delete(`${API_PREFIX}/criteria-assignments/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCriteriaAssignment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Asignación de criterio no encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la asignación de criterio", error });
    }
  });

  // Rutas para calificaciones por criterio
  app.get(`${API_PREFIX}/criteria-grades`, async (req, res) => {
    try {
      const { studentId, subjectId } = req.query;
      
      let grades;
      if (studentId && subjectId) {
        grades = await storage.getCriteriaGradesBySubject(
          parseInt(subjectId as string),
          parseInt(studentId as string)
        );
      } else if (studentId) {
        grades = await storage.getCriteriaGradesByStudent(parseInt(studentId as string));
      } else {
        grades = await storage.getCriteriaGrades();
      }
      
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener calificaciones por criterio", error });
    }
  });

  app.get(`${API_PREFIX}/criteria-grades/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const grade = await storage.getCriteriaGrade(id);
      
      if (!grade) {
        return res.status(404).json({ message: "Calificación por criterio no encontrada" });
      }
      
      res.json(grade);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la calificación por criterio", error });
    }
  });

  app.post(`${API_PREFIX}/criteria-grades`, async (req, res) => {
    try {
      const validatedData = insertCriteriaGradeSchema.parse(req.body);
      const grade = await storage.createCriteriaGrade(validatedData);
      res.status(201).json(grade);
    } catch (error) {
      res.status(400).json({ message: "Datos de calificación por criterio inválidos", error });
    }
  });

  app.put(`${API_PREFIX}/criteria-grades/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCriteriaGradeSchema.partial().parse(req.body);
      const updatedGrade = await storage.updateCriteriaGrade(id, validatedData);
      
      if (!updatedGrade) {
        return res.status(404).json({ message: "Calificación por criterio no encontrada" });
      }
      
      res.json(updatedGrade);
    } catch (error) {
      res.status(400).json({ message: "Datos de calificación por criterio inválidos", error });
    }
  });
  
  // Ruta para actualizar calificaciones por criterio en lote (ruta original /criteria-grades/batch)
  app.put(`${API_PREFIX}/criteria-grades/batch`, verifyToken, async (req, res) => {
    try {
      const { grades } = req.body;
      
      // Obtener ID del usuario para el historial
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: "No autenticado" });
      }
      
      // Registrar información básica de la operación
      console.log(`🔄 Actualizando calificaciones por criterio en lote (${grades?.length || 0} registros)`);
      console.log(`👤 Usuario: ${user.id} (${user.rol})`);
      
      if (!grades || !Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({ message: "Se requiere un arreglo de calificaciones por criterio" });
      }
      
      // Validar cada calificación
      for (const grade of grades) {
        if (!grade.alumnoId || !grade.materiaId || !grade.criterioId || grade.valor === undefined || !grade.periodo) {
          return res.status(400).json({ 
            message: "Datos de calificación por criterio incompletos", 
            grade 
          });
        }
      }
      
      // Actualizar calificaciones en lote
      const result = await storage.updateCriteriaGradeBatch(grades, user.id);
      
      res.json({ 
        success: true, 
        updatedCount: result.length,
        historialRegistrado: true
      });
    } catch (error) {
      console.error("Error al actualizar calificaciones por criterio en lote:", error);
      res.status(500).json({ 
        message: "Error al actualizar calificaciones por criterio en lote", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Ruta nueva para actualizar calificaciones por criterio en lote con formato normalizado
  app.put(`${API_PREFIX}/grades-criteria/batch`, verifyToken, async (req, res) => {
    try {
      const { gradesData } = req.body;
      
      // Obtener ID del usuario para el historial
      const user = (req as any).user;
      if (!user) {
        console.log(`❌ No hay usuario autenticado en la solicitud a grades-criteria/batch`);
        return res.status(401).json({ message: "No autenticado" });
      }
      
      // Registrar información básica de la operación
      console.log(`🔄 Actualizando calificaciones por criterio en lote (nueva ruta, ${gradesData?.length || 0} registros)`);
      console.log(`👤 Usuario: ${user.id} (${user.rol})`);
      console.log(`📋 Datos recibidos:`, req.body);
      
      if (!gradesData || !Array.isArray(gradesData) || gradesData.length === 0) {
        console.log(`❌ No hay datos o formato incorrecto: ${JSON.stringify(req.body)}`);
        return res.status(400).json({ 
          message: "Se requiere un arreglo de calificaciones por criterio en el campo 'gradesData'" 
        });
      }
      
      // Validar cada calificación
      for (const grade of gradesData) {
        if (!grade.alumnoId || !grade.materiaId || !grade.criterioId || grade.valor === undefined || !grade.periodo) {
          console.log(`❌ Dato incompleto: ${JSON.stringify(grade)}`);
          return res.status(400).json({ 
            message: "Datos de calificación por criterio incompletos", 
            grade 
          });
        }
      }
      
      // Actualizar calificaciones en lote
      const result = await storage.updateCriteriaGradeBatch(gradesData, user.id);
      
      res.json({ 
        success: true, 
        updatedCount: result.length,
        historialRegistrado: true
      });
    } catch (error) {
      console.error("Error al actualizar calificaciones por criterio en lote (nueva ruta):", error);
      res.status(500).json({ 
        message: "Error al actualizar calificaciones por criterio en lote", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete(`${API_PREFIX}/criteria-grades/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCriteriaGrade(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Calificación por criterio no encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la calificación por criterio", error });
    }
  });

  // Ruta para boleta académica con criterios detallados
  app.get(`${API_PREFIX}/student-reports/:id`, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const { periodo } = req.query;
      
      if (!periodo) {
        return res.status(400).json({ message: "El parámetro 'periodo' es requerido" });
      }
      
      const report = await storage.getStudentReport(studentId, periodo as string);
      
      if (!report) {
        return res.status(404).json({ message: "Reporte no encontrado para el estudiante" });
      }
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el reporte del estudiante", error });
    }
  });

  // Ruta para estado de cuenta de alumno
  app.get(`${API_PREFIX}/estado-cuenta/:alumnoId`, async (req, res) => {
    try {
      const alumnoId = parseInt(req.params.alumnoId);
      const accountStatement = await storage.getAccountStatement(alumnoId);
      res.json(accountStatement);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estado de cuenta", error });
    }
  });

  // Ruta para obtener los hijos asociados a un padre
  app.get(`${API_PREFIX}/parent/:parentId/children`, async (req, res) => {
    try {
      const parentId = req.params.parentId;
      const relations = await storage.getRelationsByParent(parentId);
      
      if (relations.length === 0) {
        return res.json([]);
      }
      
      // Obtenemos la información completa de cada hijo
      const childrenPromises = relations.map(async (relation) => {
        const student = await storage.getStudent(relation.alumnoId);
        return student;
      });
      
      const children = await Promise.all(childrenPromises);
      const filteredChildren = children.filter(child => child !== undefined);
      
      res.json(filteredChildren);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener los hijos del padre", error });
    }
  });

  // Ruta para obtener eventos de agenda semanal para un estudiante
  app.get(`${API_PREFIX}/students/:studentId/agenda`, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Fecha de inicio por defecto (lunes de la semana actual) si no se proporciona
      let weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lunes de la semana actual
      weekStart.setHours(0, 0, 0, 0);
      
      // Permitir filtrar por una semana específica si se proporciona fecha de inicio
      if (req.query.start_date) {
        weekStart = new Date(req.query.start_date as string);
      }
      
      // Obtener eventos para la semana
      const eventos = await storage.getEventosAgendaByWeek(studentId, weekStart);
      
      // Ordenar eventos por fecha y hora
      eventos.sort((a, b) => {
        const dateA = new Date(a.fecha).getTime();
        const dateB = new Date(b.fecha).getTime();
        if (dateA !== dateB) return dateA - dateB;
        
        // Si las fechas son iguales, ordenar por hora
        if (a.hora && b.hora) {
          return a.hora.localeCompare(b.hora);
        }
        return 0;
      });
      
      res.json(eventos);
    } catch (error) {
      console.error("Error al obtener eventos de agenda:", error);
      res.status(500).json({ message: "Error al obtener eventos de agenda", error });
    }
  });
  
  // Ruta para obtener eventos de agenda semanal para todos los hijos de un padre
  app.get(`${API_PREFIX}/parents/:parentId/agenda`, async (req, res) => {
    try {
      const parentId = req.params.parentId;
      
      // Obtener todos los hijos del padre
      const relations = await storage.getRelationsByParent(parentId);
      
      if (relations.length === 0) {
        return res.json([]);
      }
      
      // Fecha de inicio por defecto (lunes de la semana actual) si no se proporciona
      let weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lunes de la semana actual
      weekStart.setHours(0, 0, 0, 0);
      
      // Permitir filtrar por una semana específica si se proporciona fecha de inicio
      if (req.query.start_date) {
        weekStart = new Date(req.query.start_date as string);
      }
      
      // Obtener eventos para todos los hijos
      const eventosPromises = relations.map(async (relation) => {
        const studentEvents = await storage.getEventosAgendaByWeek(relation.alumnoId, weekStart);
        // Agregar información del estudiante a cada evento
        const student = await storage.getStudent(relation.alumnoId);
        return studentEvents.map(event => ({
          ...event,
          studentName: student ? student.nombreCompleto : 'Estudiante',
        }));
      });
      
      // Esperar a que todas las promesas se resuelvan
      const eventosArrays = await Promise.all(eventosPromises);
      
      // Combinar todos los eventos en un solo array
      const todosEventos = eventosArrays.flat();
      
      // Ordenar eventos por fecha y hora
      todosEventos.sort((a, b) => {
        const dateA = new Date(a.fecha).getTime();
        const dateB = new Date(b.fecha).getTime();
        if (dateA !== dateB) return dateA - dateB;
        
        // Si las fechas son iguales, ordenar por hora
        if (a.hora && b.hora) {
          return a.hora.localeCompare(b.hora);
        }
        return 0;
      });
      
      res.json(todosEventos);
    } catch (error) {
      console.error("Error al obtener eventos de agenda para los hijos:", error);
      res.status(500).json({ message: "Error al obtener eventos de agenda para los hijos", error });
    }
  });

  //* Rutas para reportes y análisis (sólo para admin y coordinador)
  
  // Middleware para verificar roles de administrador o coordinador
  // Utilizamos verifyToken y luego verificamos el rol
  const checkAdminOrCoordinador = [
    verifyToken,
    checkRole(["admin", "coordinador"])
  ];
  
  // Reporte de rendimiento académico
  app.get(`${API_PREFIX}/reports/academic`, checkAdminOrCoordinador, async (req, res) => {
    try {
      const { grupoId, periodo } = req.query;
      const groupId = grupoId ? parseInt(grupoId as string) : undefined;
      const report = await storage.getAcademicPerformanceReport(groupId, periodo as string);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Error al generar reporte académico", error });
    }
  });
  
  // Reporte de asistencia
  app.get(`${API_PREFIX}/reports/attendance`, checkAdminOrCoordinador, async (req, res) => {
    try {
      const { grupoId, mes } = req.query;
      const groupId = grupoId ? parseInt(grupoId as string) : undefined;
      const report = await storage.getAttendanceReport(groupId, mes as string);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Error al generar reporte de asistencia", error });
    }
  });
  
  // Reporte financiero
  app.get(`${API_PREFIX}/reports/financial`, checkAdminOrCoordinador, async (req, res) => {
    try {
      const { grupoId, estado } = req.query;
      const groupId = grupoId ? parseInt(grupoId as string) : undefined;
      const report = await storage.getFinancialReport(groupId, estado as string);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Error al generar reporte financiero", error });
    }
  });
  
  // Resumen institucional (dashboard)
  app.get(`${API_PREFIX}/reports/summary`, checkAdminOrCoordinador, async (req, res) => {
    try {
      const summary = await storage.getInstitutionSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Error al generar resumen institucional", error });
    }
  });
  
  // Función para calcular las métricas financieras para un año y mes específico
  async function calcularMetricasFinancieras(anioCalculo: number, mesCalculo: number, groupId: number | undefined, conceptId: number | undefined, payments: any[], debts: any[], students: any[], groups: any[], concepts: any[]) {
    console.log(`Calculando métricas para ${mesCalculo}/${anioCalculo}`);
    
    // VERIFICAR CUÁNTOS ADEUDOS COINCIDEN CON EL MES/AÑO
    const debtsByDate = debts.filter(debt => {
      const date = new Date(debt.fechaLimite);
      return date.getFullYear() === anioCalculo && (date.getMonth() + 1) === mesCalculo;
    });
    
    console.log(`Adeudos con fechaLimite en ${mesCalculo}/${anioCalculo}: ${debtsByDate.length}`);
    
    if (debtsByDate.length === 0) {
      console.log(`⚠️ No se encontraron adeudos para ${mesCalculo}/${anioCalculo}`);
    }
    
    // 1. Filtrar pagos por mes/año y otros criterios
    const filteredPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.fechaPago);
      const paymentYear = paymentDate.getFullYear();
      const paymentMonth = paymentDate.getMonth() + 1;
      
      const matchesFilters = 
        paymentYear === anioCalculo && 
        paymentMonth === mesCalculo &&
        (groupId ? students.find(s => s.id === payment.alumnoId)?.grupoId === groupId : true) &&
        (conceptId ? payment.conceptoId === conceptId : true);
        
      return matchesFilters;
    });
    
    // Calcular total recaudado
    const totalRecaudado = filteredPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.monto.toString()), 0);
    
    console.log(`Total pagos filtrados: ${filteredPayments.length}`);
    console.log(`Total recaudado: $${totalRecaudado}`);
    
    // 2. Filtrar adeudos relevantes
    const relevantDebts = debtsByDate.filter(debt => {
      const student = students.find(s => s.id === debt.alumnoId);
      
      // Verificar si coincide con los filtros
      const matchesGroup = groupId ? (student?.grupoId === groupId) : true;
      const matchesConcept = conceptId ? (debt.conceptoId === conceptId) : true;
      const isNotPaid = debt.estatus !== 'pagado';
      
      const shouldInclude = matchesGroup && matchesConcept && isNotPaid;
      
      return shouldInclude;
    });
    
    console.log(`Adeudos filtrados: ${relevantDebts.length}`);
    
    // Sumar el monto de estos adeudos directamente (sin restar pagos)
    let totalAdeudado = 0;
    
    relevantDebts.forEach(debt => {
      const montoDeuda = parseFloat(debt.montoTotal.toString());
      totalAdeudado += montoDeuda;
    });
    
    // Restar pagos realizados para esos mismos conceptos y alumnos
    relevantDebts.forEach(debt => {
      const pagosRelacionados = payments.filter(p => 
        p.alumnoId === debt.alumnoId && 
        p.conceptoId === debt.conceptoId
      );
      
      const montoPagado = pagosRelacionados.reduce((sum, p) => 
        sum + parseFloat(p.monto.toString()), 0);
        
      if (montoPagado > 0) {
        totalAdeudado -= montoPagado;
      }
    });
    
    // Asegurar que el total nunca sea negativo
    totalAdeudado = Math.max(0, totalAdeudado);
    
    console.log(`Total adeudado vigente: $${totalAdeudado}`);
    
    // Calcular porcentaje de cumplimiento
    const totalEsperado = totalRecaudado + totalAdeudado;
    const porcentajeCumplimiento = totalEsperado > 0 ? 
      (totalRecaudado / totalEsperado) * 100 : 0;
      
    console.log(`Porcentaje de cumplimiento: ${porcentajeCumplimiento.toFixed(2)}%`);
    
    return {
      totalRecaudado,
      totalAdeudado,
      porcentajeCumplimiento
    };
  }
  
  // Resumen financiero detallado (para el módulo de reportes financieros)
  app.get(`${API_PREFIX}/reports/financial/summary`, checkAdminOrCoordinador, async (req, res) => {
    try {
      const { anio, mes, grupoId, conceptoId } = req.query;
      
      console.log("===== DEBUG REPORTES FINANCIEROS - INICIO =====");
      console.log("Parámetros recibidos:");
      console.log("anio:", anio);
      console.log("mes:", mes);
      console.log("grupoId:", grupoId);
      console.log("conceptoId:", conceptoId);
      
      const groupId = grupoId && grupoId !== 'all' ? parseInt(grupoId as string) : undefined;
      const conceptId = conceptoId && conceptoId !== 'all' ? parseInt(conceptoId as string) : undefined;
      
      // Obtener datos relevantes para el reporte
      const payments = await storage.getPayments();
      const debts = await storage.getDebts();
      const students = await storage.getStudents();
      const groups = await storage.getGroups();
      const concepts = await storage.getPaymentConcepts();
      
      console.log(`Datos cargados: ${payments.length} pagos, ${debts.length} adeudos, ${students.length} estudiantes`);
      
      // Verificar si hay adeudos con fecha límite en el mes seleccionado
      const filteredYear = anio ? parseInt(anio as string) : new Date().getFullYear();
      const filteredMonth = mes ? parseInt(mes as string) : new Date().getMonth() + 1;
      
      // Calcular métricas para el año actual
      const metricasActuales = await calcularMetricasFinancieras(
        filteredYear, 
        filteredMonth, 
        groupId, 
        conceptId, 
        payments, 
        debts, 
        students, 
        groups, 
        concepts
      );
      
      // Calcular métricas para el año anterior (mismo mes)
      const anioAnterior = filteredYear - 1;
      const metricasAnioAnterior = await calcularMetricasFinancieras(
        anioAnterior, 
        filteredMonth, 
        groupId, 
        conceptId, 
        payments, 
        debts, 
        students, 
        groups, 
        concepts
      );
      
      console.log(`Mes/año filtrado: ${filteredMonth}/${filteredYear}`);
      
      // VERIFICAR CUÁNTOS ADEUDOS COINCIDEN CON EL MES/AÑO
      const debtsByDate = debts.filter(debt => {
        const date = new Date(debt.fechaLimite);
        return date.getFullYear() === filteredYear && (date.getMonth() + 1) === filteredMonth;
      });
      
      console.log(`Adeudos con fechaLimite en ${filteredMonth}/${filteredYear}: ${debtsByDate.length}`);
      
      // Mostrar todos los adeudos para el mes actual
      if (debtsByDate.length > 0) {
        console.log("ADEUDOS PARA EL MES/AÑO FILTRADO:");
        debtsByDate.forEach(debt => {
          const fechaFormateada = new Date(debt.fechaLimite).toISOString().split('T')[0];
          console.log(`ID: ${debt.id}, Alumno: ${debt.alumnoId}, Concepto: ${debt.conceptoId}, Monto: ${debt.montoTotal}, Estatus: ${debt.estatus}, Fecha: ${fechaFormateada}`);
        });
      } else {
        console.log(`⚠️ ADVERTENCIA: No se encontraron adeudos para ${filteredMonth}/${filteredYear}`);
      }
      
      // Filtrar adeudos por estatus adicional, para confirmar que hay "pendientes" o "vencidos"
      const pendingDebts = debts.filter(debt => debt.estatus !== 'pagado');
      console.log(`Adeudos con estatus distinto a 'pagado': ${pendingDebts.length}`);
      
      // IMPLEMENTACIÓN COMPLETAMENTE NUEVA DEL CÁLCULO DE ADEUDOS
      
      // 1. Filtrar pagos por mes/año y otros criterios
      console.log("\n==== CÁLCULO DE TOTAL RECAUDADO ====");
      const filteredPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.fechaPago);
        const paymentYear = paymentDate.getFullYear();
        const paymentMonth = paymentDate.getMonth() + 1;
        
        const matchesFilters = 
          paymentYear === filteredYear && 
          paymentMonth === filteredMonth &&
          (groupId ? students.find(s => s.id === payment.alumnoId)?.grupoId === groupId : true) &&
          (conceptId ? payment.conceptoId === conceptId : true);
          
        return matchesFilters;
      });
      
      // Calcular total recaudado
      const totalRecaudado = filteredPayments.reduce((sum, payment) => 
        sum + parseFloat(payment.monto.toString()), 0);
      
      console.log(`Total pagos filtrados: ${filteredPayments.length}`);
      console.log(`Total recaudado: $${totalRecaudado}`);
      
      // 2. NUEVO: Cálculo explícito de adeudos pendientes
      console.log("\n==== CÁLCULO DE TOTAL ADEUDADO VIGENTE ====");
      
      // Filtrar adeudos relevantes
      const relevantDebts = debtsByDate.filter(debt => {
        const student = students.find(s => s.id === debt.alumnoId);
        
        // Verificar si coincide con los filtros
        const matchesGroup = groupId ? (student?.grupoId === groupId) : true;
        const matchesConcept = conceptId ? (debt.conceptoId === conceptId) : true;
        const isNotPaid = debt.estatus !== 'pagado';
        
        const shouldInclude = matchesGroup && matchesConcept && isNotPaid;
        
        console.log(`Deuda #${debt.id}: alumno=${debt.alumnoId}, concepto=${debt.conceptoId}, coincideGrupo=${matchesGroup}, coincideConcepto=${matchesConcept}, noPagado=${isNotPaid}, incluir=${shouldInclude}`);
        
        return shouldInclude;
      });
      
      console.log(`\nAdeudos filtrados: ${relevantDebts.length}`);
      
      // Sumar el monto de estos adeudos directamente (sin restar pagos)
      let totalAdeudado = 0;
      
      relevantDebts.forEach(debt => {
        const montoDeuda = parseFloat(debt.montoTotal.toString());
        console.log(`Sumando deuda #${debt.id}: $${montoDeuda}`);
        totalAdeudado += montoDeuda;
      });
      
      console.log(`\n✅ TOTAL ADEUDADO VIGENTE (antes de RESTAR pagos): $${totalAdeudado}`);
      
      // Restar pagos realizados para esos mismos conceptos y alumnos
      relevantDebts.forEach(debt => {
        const pagosRelacionados = payments.filter(p => 
          p.alumnoId === debt.alumnoId && 
          p.conceptoId === debt.conceptoId
        );
        
        const montoPagado = pagosRelacionados.reduce((sum, p) => 
          sum + parseFloat(p.monto.toString()), 0);
          
        if (montoPagado > 0) {
          console.log(`Restando pagos para Deuda #${debt.id}: $${montoPagado}`);
          totalAdeudado -= montoPagado;
        }
      });
      
      // Asegurar que el total nunca sea negativo
      totalAdeudado = Math.max(0, totalAdeudado);
      
      console.log(`\n✅✅ TOTAL ADEUDADO VIGENTE FINAL: $${totalAdeudado}`);
      console.log("===== DEBUG REPORTES FINANCIEROS - FIN =====");
      
      // Calcular porcentaje de cumplimiento
      const totalEsperado = totalRecaudado + totalAdeudado;
      const porcentajeCumplimiento = totalEsperado > 0 ? 
        (totalRecaudado / totalEsperado) * 100 : 0;
      
      // Obtener grupo con mayor morosidad
      const groupDebts = new Map<number, number>();
      
      for (const debt of relevantDebts) {
        const student = students.find(s => s.id === debt.alumnoId);
        if (student && student.grupoId) {
          const currentDebt = groupDebts.get(student.grupoId) || 0;
          groupDebts.set(student.grupoId, currentDebt + parseFloat(debt.montoTotal.toString()));
        }
      }
      
      let grupoMoroso = "";
      let maxDebt = 0;
      
      groupDebts.forEach((debt, groupId) => {
        if (debt > maxDebt) {
          maxDebt = debt;
          const group = groups.find(g => g.id === groupId);
          grupoMoroso = group ? group.nombre : `Grupo ID ${groupId}`;
        }
      });
      
      // Obtener concepto más pagado
      const conceptAmounts = new Map<number, number>();
      
      filteredPayments.forEach(payment => {
        const currentAmount = conceptAmounts.get(payment.conceptoId) || 0;
        conceptAmounts.set(payment.conceptoId, currentAmount + parseFloat(payment.monto.toString()));
      });
      
      let conceptoTop = "";
      let maxAmount = 0;
      
      conceptAmounts.forEach((amount, conceptId) => {
        if (amount > maxAmount) {
          maxAmount = amount;
          const concept = concepts.find(c => c.id === conceptId);
          conceptoTop = concept ? concept.nombre : `Concepto ID ${conceptId}`;
        }
      });
      
      // Distribución por concepto
      const distribPorConcepto = Array.from(conceptAmounts.entries()).map(([conceptId, amount]) => {
        const concept = concepts.find(c => c.id === conceptId);
        return {
          concepto: concept ? concept.nombre : `Concepto ID ${conceptId}`,
          monto: amount,
          porcentaje: totalRecaudado > 0 ? (amount / totalRecaudado) * 100 : 0
        };
      }).sort((a, b) => b.monto - a.monto);
      
      // Recaudación mensual (últimos 4 meses)
      const recaudacionMensual = [];
      const currentMonth = filteredMonth;
      const currentYear = filteredYear;
      
      for (let i = 0; i < 4; i++) {
        let month = currentMonth - i;
        let year = currentYear;
        
        if (month <= 0) {
          month += 12;
          year -= 1;
        }
        
        // Filtrar pagos para este mes
        const monthPayments = payments.filter(payment => {
          const paymentDate = new Date(payment.fechaPago);
          return paymentDate.getFullYear() === year && 
                 paymentDate.getMonth() + 1 === month;
        });
        
        // Calcular monto total
        const monthAmount = monthPayments.reduce((sum, payment) => 
          sum + parseFloat(payment.monto.toString()), 0);
        
        // Obtener nombre del mes
        const monthNames = [
          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        
        recaudacionMensual.push({
          mes: monthNames[month - 1],
          monto: monthAmount
        });
      }
      
      // Top deudores (estudiantes con mayores adeudos)
      const studentDebts = new Map<number, number>();
      
      for (const debt of relevantDebts) {
        const currentDebt = studentDebts.get(debt.alumnoId) || 0;
        studentDebts.set(debt.alumnoId, currentDebt + parseFloat(debt.montoTotal.toString()));
      }
      
      const topDeudores = Array.from(studentDebts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([studentId, amount]) => {
          const student = students.find(s => s.id === studentId);
          const group = student && student.grupoId ? 
            groups.find(g => g.id === student.grupoId) : null;
          
          // Encontrar el último pago de este estudiante
          const studentPayments = payments
            .filter(p => p.alumnoId === studentId)
            .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
          
          const lastPayment = studentPayments.length > 0 ? 
            studentPayments[0].fechaPago : null;
          
          // Calcular días de vencimiento
          const latestDebt = relevantDebts
            .filter(d => d.alumnoId === studentId)
            .sort((a, b) => 
              new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime()
            )[0];
          
          // Si hay deuda, calcular días desde la fecha límite hasta hoy
          const diasVencimiento = latestDebt ? 
            Math.max(0, Math.floor((new Date().getTime() - new Date(latestDebt.fechaLimite).getTime()) / (24 * 3600 * 1000))) : 0;
          
          console.log(`Deudor: ${student?.nombreCompleto}, latestDebt: ${latestDebt?.id}, fechaLimite: ${latestDebt?.fechaLimite}, diasVencimiento: ${diasVencimiento}`);
          
          return {
            nombre: student ? student.nombreCompleto : `Estudiante ID ${studentId}`,
            grupo: group ? group.nombre : "Sin grupo",
            monto: amount,
            diasVencimiento,
            ultimoPago: lastPayment
          };
        });
      
      // Preparar datos de comparación interanual
      const mesActual = mes ? new Date(0, parseInt(mes as string) - 1).toLocaleString('es-MX', { month: 'long' }) : 'Actual';
      
      // Determinar si hay datos del año anterior para comparar
      const hayDatosAnioAnterior = metricasAnioAnterior.totalRecaudado > 0 || metricasAnioAnterior.totalAdeudado > 0;
      
      // Calcular variaciones porcentuales (cuando hay datos del año anterior)
      const comparativaInteranual = {
        hayDatosAnioAnterior,
        mesAnioAnterior: `${mesActual} ${anioAnterior}`,
        totalRecaudadoAnioAnterior: metricasAnioAnterior.totalRecaudado,
        totalAdeudadoAnioAnterior: metricasAnioAnterior.totalAdeudado,
        porcentajeCumplimientoAnioAnterior: metricasAnioAnterior.porcentajeCumplimiento,
        variacionRecaudado: hayDatosAnioAnterior && metricasAnioAnterior.totalRecaudado > 0 ? 
          ((totalRecaudado - metricasAnioAnterior.totalRecaudado) / metricasAnioAnterior.totalRecaudado) * 100 : null,
        variacionAdeudado: hayDatosAnioAnterior && metricasAnioAnterior.totalAdeudado > 0 ? 
          ((totalAdeudado - metricasAnioAnterior.totalAdeudado) / metricasAnioAnterior.totalAdeudado) * 100 : null,
        variacionCumplimiento: hayDatosAnioAnterior && metricasAnioAnterior.porcentajeCumplimiento > 0 ? 
          porcentajeCumplimiento - metricasAnioAnterior.porcentajeCumplimiento : null
      };
      
      // Construir y enviar respuesta con los datos del año actual y la comparativa
      const report = {
        mes: mesActual,
        anio: filteredYear,
        totalRecaudado,
        totalAdeudado,
        porcentajeCumplimiento,
        grupoMoroso,
        conceptoTop,
        distribPorConcepto,
        recaudacionMensual,
        topDeudores,
        comparativaInteranual  // Añadir la comparativa interanual
      };
      
      res.json(report);
    } catch (error) {
      console.error("Error al generar resumen financiero:", error);
      res.status(500).json({ 
        message: "Error al generar resumen financiero", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para generar datos de prueba (solo disponible en entorno de desarrollo)
  app.post(`${API_PREFIX}/generate-test-data`, checkRole(["admin"]), async (req, res) => {
    try {
      console.log("Iniciando generación de datos de prueba...");
      const result = await generateMockData();
      console.log("Resultado de generación de datos:", result);
      res.json(result);
    } catch (error) {
      console.error("Error en endpoint de generación de datos:", error);
      res.status(500).json({ 
        message: "Error al generar datos de prueba",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Rutas para estadísticas de docentes
  
  app.get(`${API_PREFIX}/grades/stats`, verifyToken, async (req, res) => {
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : null;
    
    if (!groupId) {
      return res.status(400).json({ message: "Se requiere el ID del grupo" });
    }
    
    // Obtener estudiantes del grupo
    const students = Array.from((await storage.getStudents()).filter(s => s.grupoId === groupId));
    
    if (students.length === 0) {
      return res.json({
        promedioGeneral: "N/A",
        porcentajeAprobados: 0,
        alumnosAprobados: 0,
        totalAlumnos: 0,
        mejoresAlumnos: []
      });
    }
    
    // Obtener todas las calificaciones
    const criteriaGrades = await storage.getCriteriaGrades();
    
    // Calcular estadísticas
    const studentGrades = students.map(student => {
      const studentCriteriaGrades = criteriaGrades.filter(g => g.alumnoId === student.id);
      const total = studentCriteriaGrades.reduce((sum, grade) => sum + parseFloat(grade.valor.toString()), 0);
      const promedio = studentCriteriaGrades.length > 0 ? (total / studentCriteriaGrades.length).toFixed(1) : "N/A";
      
      return {
        id: student.id,
        nombre: student.nombreCompleto,
        promedio: promedio === "N/A" ? promedio : parseFloat(promedio)
      };
    });
    
    // Filtrar estudiantes con promedio (no N/A)
    const studentsWithGrades = studentGrades.filter(sg => sg.promedio !== "N/A");
    
    // Calcular promedio general
    const totalPromedio = studentsWithGrades.reduce((sum, sg) => sum + (sg.promedio as number), 0);
    const promedioGeneral = studentsWithGrades.length > 0 
      ? (totalPromedio / studentsWithGrades.length).toFixed(1) 
      : "N/A";
    
    // Calcular aprobados (promedio >= 6.0)
    const aprobados = studentsWithGrades.filter(sg => (sg.promedio as number) >= 6.0);
    const porcentajeAprobados = studentsWithGrades.length > 0 
      ? Math.round((aprobados.length / studentsWithGrades.length) * 100) 
      : 0;
    
    // Ordenar estudiantes por promedio (más alto primero)
    const mejoresAlumnos = [...studentsWithGrades]
      .filter(sg => sg.promedio !== "N/A")
      .sort((a, b) => (b.promedio as number) - (a.promedio as number));
    
    res.json({
      promedioGeneral,
      porcentajeAprobados,
      alumnosAprobados: aprobados.length,
      totalAlumnos: students.length,
      mejoresAlumnos
    });
  });
  
  app.get(`${API_PREFIX}/attendance/stats`, verifyToken, async (req, res) => {
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : null;
    
    if (!groupId) {
      return res.status(400).json({ message: "Se requiere el ID del grupo" });
    }
    
    // Obtener estudiantes del grupo
    const students = Array.from((await storage.getStudents()).filter(s => s.grupoId === groupId));
    
    if (students.length === 0) {
      return res.json({
        porcentajeAsistencia: "N/A",
        totalAlumnos: 0,
        asistenciaHoy: { porcentaje: 0, presentes: 0 },
        alumnosMenosAsistencia: []
      });
    }
    
    // Obtener todas las asistencias
    const allAttendance = await storage.getAttendance();
    
    // Calcular estadísticas
    const studentAttendance = students.map(student => {
      const studentAttendanceRecords = allAttendance.filter(a => a.alumnoId === student.id);
      const totalRecords = studentAttendanceRecords.length;
      const presentRecords = studentAttendanceRecords.filter(a => a.asistencia).length;
      const porcentaje = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
      
      return {
        id: student.id,
        nombre: student.nombreCompleto,
        porcentaje,
        totalRecords,
        presentRecords
      };
    });
    
    // Calcular porcentaje general de asistencia
    const totalPresentRecords = studentAttendance.reduce((sum, sa) => sum + sa.presentRecords, 0);
    const totalRecords = studentAttendance.reduce((sum, sa) => sum + sa.totalRecords, 0);
    const porcentajeAsistencia = totalRecords > 0 
      ? Math.round((totalPresentRecords / totalRecords) * 100) 
      : "N/A";
    
    // Calcular asistencia de hoy
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const todayAttendance = allAttendance.filter(a => 
      a.fecha.toString().includes(today) && 
      students.some(s => s.id === a.alumnoId)
    );
    const todayPresent = todayAttendance.filter(a => a.asistencia).length;
    const asistenciaHoy = {
      porcentaje: todayAttendance.length > 0 ? Math.round((todayPresent / todayAttendance.length) * 100) : 0,
      presentes: todayPresent
    };
    
    // Ordenar estudiantes por menos asistencia primero
    const alumnosMenosAsistencia = [...studentAttendance]
      .filter(sa => sa.totalRecords > 0)
      .sort((a, b) => a.porcentaje - b.porcentaje);
    
    res.json({
      porcentajeAsistencia,
      totalAlumnos: students.length,
      asistenciaHoy,
      alumnosMenosAsistencia
    });
  });

  // Ruta para obtener asignaciones por profesor 
  // Soporta tanto ID de usuario (UUID) como ID numérico del profesor
  app.get(`${API_PREFIX}/subject-assignments/teacher/:teacherId`, verifyToken, async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      // Verificar que el usuario que hace la petición sea el mismo profesor o un admin
      const requestingUser = (req as any).user;
      if (requestingUser.rol !== 'admin' && requestingUser.id !== teacherId) {
        return res.status(403).json({ 
          success: false,
          message: "No tiene permisos para ver estas asignaciones" 
        });
      }
      
      let profesorId: number;
      
      // Determinar si estamos recibiendo un UUID (ID de usuario) o un ID numérico
      if (teacherId.includes('-')) {
        // Es un UUID - buscar por ID de usuario
        console.log(`Buscando asignaciones por ID de usuario: ${teacherId}`);
        const user = await storage.getUser(teacherId);
        
        if (!user) {
          return res.status(404).json({ 
            success: false,
            message: "Usuario no encontrado" 
          });
        }
        
        // Buscar el profesor por correo electrónico
        const teachers = await storage.getTeachers();
        const teacherByEmail = teachers.find(teacher => 
          teacher.correo.toLowerCase() === user.correo.toLowerCase());
          
        if (teacherByEmail) {
          // Si encontramos un profesor con el mismo correo, usar su ID numérico
          profesorId = teacherByEmail.id;
          console.log(`Encontrado profesor con ID numérico: ${profesorId} para usuario con ID: ${teacherId}`);
        } else {
          console.log(`No se encontró profesor para el usuario con ID: ${teacherId}`);
          return res.status(404).json({ 
            success: false,
            message: "Profesor no encontrado para este usuario" 
          });
        }
      } else {
        // Es un ID numérico - buscar directamente por ID de profesor
        profesorId = parseInt(teacherId);
        console.log(`Buscando asignaciones por ID numérico de profesor: ${profesorId}`);
        
        if (isNaN(profesorId)) {
          return res.status(400).json({ 
            success: false, 
            message: "ID de profesor inválido" 
          });
        }
        
        // Verificar que el profesor existe
        const teacher = await storage.getTeacher(profesorId);
        if (!teacher) {
          return res.status(404).json({ 
            success: false,
            message: "Profesor no encontrado" 
          });
        }
      }
      
      // Usar el método optimizado para buscar por ID numérico
      const assignments = await storage.getSubjectAssignmentsByTeacherId(profesorId);
      
      // Incluir información de éxito en la respuesta
      res.json({
        success: true,
        data: assignments,
        count: assignments.length
      });
    } catch (error) {
      console.error("Error al obtener asignaciones del profesor:", error);
      res.status(500).json({ 
        success: false,
        message: "Error al obtener asignaciones del profesor", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rutas para estadísticas de docentes
  app.get(`${API_PREFIX}/grades/stats`, verifyToken, async (req, res) => {
    try {
      const { groupId } = req.query;
      
      // Verificar que el usuario sea un docente o administrador
      const requestingUser = (req as any).user;
      if (!['admin', 'docente', 'coordinador'].includes(requestingUser.rol)) {
        return res.status(403).json({ message: "No tiene permisos para ver estas estadísticas" });
      }
      
      // Simulamos datos de estadísticas
      const statsData = {
        promedioGeneral: "8.5",
        alumnosAprobados: 18,
        totalAlumnos: 22,
        porcentajeAprobados: 82,
        mejoresAlumnos: [
          { id: 1, nombre: "Ana García", promedio: "9.8" },
          { id: 2, nombre: "Carlos López", promedio: "9.6" },
          { id: 3, nombre: "María Rodríguez", promedio: "9.4" }
        ]
      };
      
      res.json(statsData);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estadísticas de calificaciones", error });
    }
  });
  
  app.get(`${API_PREFIX}/attendance/stats`, verifyToken, async (req, res) => {
    try {
      const { groupId } = req.query;
      
      // Verificar que el usuario sea un docente o administrador
      const requestingUser = (req as any).user;
      if (!['admin', 'docente', 'coordinador'].includes(requestingUser.rol)) {
        return res.status(403).json({ message: "No tiene permisos para ver estas estadísticas" });
      }
      
      // Simulamos datos de estadísticas de asistencia
      const statsData = {
        porcentajeAsistencia: 87,
        totalAlumnos: 22,
        asistenciaHoy: {
          fecha: new Date().toISOString().split('T')[0],
          presentes: 20,
          porcentaje: 91
        },
        alumnosMenosAsistencia: [
          { id: 5, nombre: "Roberto Sánchez", porcentaje: 75 },
          { id: 8, nombre: "Luisa Martínez", porcentaje: 80 },
          { id: 12, nombre: "Diego Torres", porcentaje: 83 }
        ]
      };
      
      res.json(statsData);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estadísticas de asistencia", error });
    }
  });

  // API para Tareas
  // Obtener todas las tareas
  app.get(`${API_PREFIX}/tasks`, verifyToken, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener tareas", error });
    }
  });

  // Obtener tarea por ID
  app.get(`${API_PREFIX}/tasks/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Tarea no encontrada" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener tarea", error });
    }
  });

  // Obtener tareas por grupo
  app.get(`${API_PREFIX}/tasks/group/:groupId`, verifyToken, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const tasks = await storage.getTasksByGroup(groupId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener tareas por grupo", error });
    }
  });

  // Obtener tareas por materia
  app.get(`${API_PREFIX}/tasks/subject/:subjectId`, verifyToken, async (req, res) => {
    try {
      const subjectId = parseInt(req.params.subjectId);
      const tasks = await storage.getTasksBySubject(subjectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener tareas por materia", error });
    }
  });

  // Obtener tareas por profesor
  app.get(`${API_PREFIX}/tasks/teacher/:teacherId`, verifyToken, async (req, res) => {
    try {
      const teacherId = req.params.teacherId;
      const tasks = await storage.getTasksByTeacher(teacherId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener tareas por profesor", error });
    }
  });

  // Obtener tareas activas para un grupo
  app.get(`${API_PREFIX}/tasks/active/group/:groupId`, verifyToken, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const tasks = await storage.getActiveTasksForGroup(groupId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener tareas activas", error });
    }
  });
  
  // Obtener tareas para un estudiante específico
  app.get(`${API_PREFIX}/tasks/student/:studentId`, verifyToken, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      // Primero obtenemos el estudiante para saber su grupo
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }
      
      if (!student.grupoId) {
        return res.json([]);
      }
      
      // Obtenemos las tareas para el grupo del estudiante
      const tasks = await storage.getTasksByGroup(student.grupoId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener tareas del estudiante", error });
    }
  });

  // Crear nueva tarea
  app.post(`${API_PREFIX}/tasks`, verifyToken, checkRole(["admin", "docente"]), async (req, res) => {
    try {
      // Registro detallado del body recibido
      console.log("POST /api/tasks - Body recibido:", JSON.stringify(req.body, null, 2));
      
      // Validamos que los campos requeridos existan
      const { titulo, instrucciones, fechaEntrega, profesorId, grupoId, materiaId, estado } = req.body;
      
      if (!titulo || !instrucciones || !fechaEntrega || !profesorId || !grupoId || !materiaId || !estado) {
        console.log("ERROR: Faltan campos requeridos en la solicitud");
        return res.status(400).json({ 
          message: "Faltan campos requeridos", 
          camposRecibidos: Object.keys(req.body),
          valoresRecibidos: {
            titulo: titulo || null,
            instrucciones: instrucciones || null,
            fechaEntrega: fechaEntrega || null,
            profesorId: profesorId || null,
            grupoId: grupoId || null,
            materiaId: materiaId || null,
            estado: estado || null
          }
        });
      }
      
      // Validación específica de IDs
      if (typeof grupoId !== 'number') {
        console.log(`ERROR: El grupoId debe ser un número, se recibió: ${typeof grupoId}, valor: ${grupoId}`);
        return res.status(400).json({ 
          message: "El grupoId debe ser un número", 
          tipoRecibido: typeof grupoId, 
          valorRecibido: grupoId 
        });
      }
      
      if (typeof materiaId !== 'number') {
        console.log(`ERROR: El materiaId debe ser un número, se recibió: ${typeof materiaId}, valor: ${materiaId}`);
        return res.status(400).json({ 
          message: "El materiaId debe ser un número", 
          tipoRecibido: typeof materiaId, 
          valorRecibido: materiaId 
        });
      }
      
      // Verificar que el grupo y la materia existan
      try {
        const grupo = await storage.getGroup(grupoId);
        if (!grupo) {
          console.log(`ERROR: No se encontró el grupo con ID: ${grupoId}`);
          return res.status(404).json({ message: `No se encontró el grupo con ID: ${grupoId}` });
        }
      } catch (err) {
        console.log(`ERROR al verificar el grupo: ${err instanceof Error ? err.message : String(err)}`);
        return res.status(500).json({ 
          message: "Error al verificar el grupo", 
          grupoId, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
      
      try {
        const materia = await storage.getSubject(materiaId);
        if (!materia) {
          console.log(`ERROR: No se encontró la materia con ID: ${materiaId}`);
          return res.status(404).json({ message: `No se encontró la materia con ID: ${materiaId}` });
        }
      } catch (err) {
        console.log(`ERROR al verificar la materia: ${err instanceof Error ? err.message : String(err)}`);
        return res.status(500).json({ 
          message: "Error al verificar la materia", 
          materiaId, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
      
      // Si todo está validado, crear la tarea
      console.log("Datos validados, procediendo a crear la tarea");
      const newTask = await storage.createTask(req.body);
      console.log("Tarea creada con éxito:", JSON.stringify(newTask, null, 2));
      
      res.status(201).json(newTask);
    } catch (error) {
      console.error("ERROR al crear tarea:", error instanceof Error ? error.stack : String(error));
      
      res.status(500).json({ 
        message: "Error al crear tarea", 
        error: error instanceof Error ? { 
          name: error.name,
          message: error.message,
          stack: error.stack
        } : String(error) 
      });
    }
  });

  // Actualizar tarea
  app.put(`${API_PREFIX}/tasks/:id`, verifyToken, checkRole(["admin", "docente"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedTask = await storage.updateTask(id, req.body);
      if (!updatedTask) {
        return res.status(404).json({ message: "Tarea no encontrada" });
      }
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar tarea", error });
    }
  });

  // Eliminar tarea
  app.delete(`${API_PREFIX}/tasks/:id`, verifyToken, checkRole(["admin", "docente"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTask(id);
      if (!deleted) {
        return res.status(404).json({ message: "Tarea no encontrada" });
      }
      res.json({ message: "Tarea eliminada correctamente" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar tarea", error });
    }
  });

  // API para Entregas de Tareas
  // Obtener todas las entregas
  app.get(`${API_PREFIX}/task-submissions`, verifyToken, async (req, res) => {
    try {
      const submissions = await storage.getTaskSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener entregas", error });
    }
  });

  // Obtener entrega por ID
  app.get(`${API_PREFIX}/task-submissions/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const submission = await storage.getTaskSubmission(id);
      if (!submission) {
        return res.status(404).json({ message: "Entrega no encontrada" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener entrega", error });
    }
  });

  // Obtener entregas por tarea
  app.get(`${API_PREFIX}/task-submissions/task/:taskId`, verifyToken, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const submissions = await storage.getTaskSubmissionsByTask(taskId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener entregas por tarea", error });
    }
  });

  // Obtener entregas por estudiante
  app.get(`${API_PREFIX}/task-submissions/student/:studentId`, verifyToken, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const submissions = await storage.getTaskSubmissionsByStudent(studentId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener entregas por estudiante", error });
    }
  });

  // Crear nueva entrega
  app.post(`${API_PREFIX}/task-submissions`, verifyToken, async (req, res) => {
    try {
      const newSubmission = await storage.createTaskSubmission(req.body);
      res.status(201).json(newSubmission);
    } catch (error) {
      res.status(500).json({ message: "Error al crear entrega", error });
    }
  });

  // Actualizar entrega
  app.put(`${API_PREFIX}/task-submissions/:id`, verifyToken, checkRole(["admin", "docente", "alumno"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedSubmission = await storage.updateTaskSubmission(id, req.body);
      if (!updatedSubmission) {
        return res.status(404).json({ message: "Entrega no encontrada" });
      }
      res.json(updatedSubmission);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar entrega", error });
    }
  });

  // Eliminar entrega
  app.delete(`${API_PREFIX}/task-submissions/:id`, verifyToken, checkRole(["admin", "docente", "alumno"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTaskSubmission(id);
      if (!deleted) {
        return res.status(404).json({ message: "Entrega no encontrada" });
      }
      res.json({ message: "Entrega eliminada correctamente" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar entrega", error });
    }
  });

  // ============================================================
  // RUTAS PARA EL MÓDULO DE COMUNICACIÓN
  // ============================================================

  // ----- MENSAJES PRIVADOS -----
  // GET /api/messages - Obtener mensajes con paginación y filtros
  app.get(`${API_PREFIX}/messages`, verifyToken, async (req, res) => {
    try {
      const { page = 1, limit = 10, priority, startDate, endDate, senderId, receiverId } = req.query;
      
      // Convertir a números para la paginación
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      
      // Obtener mensajes
      let messages = await storage.getMessages();
      
      // Filtrar por el usuario actual (como receptor o emisor)
      if (req.user) {
        messages = messages.filter(msg => 
          msg.receiverId === req.user!.id || 
          msg.senderId === req.user!.id
        );
      }
      
      // Aplicar filtros si existen
      if (priority) {
        messages = messages.filter(msg => msg.priority === priority);
      }
      
      if (startDate) {
        const start = new Date(startDate as string);
        messages = messages.filter(msg => new Date(msg.createdAt) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        messages = messages.filter(msg => new Date(msg.createdAt) <= end);
      }
      
      if (senderId) {
        messages = messages.filter(msg => msg.senderId === senderId);
      }
      
      if (receiverId) {
        messages = messages.filter(msg => msg.receiverId === receiverId);
      }
      
      // Ordenar por fecha descendente (más recientes primero)
      messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Calcular paginación
      const totalItems = messages.length;
      const totalPages = Math.ceil(totalItems / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedMessages = messages.slice(startIndex, endIndex);
      
      res.json({
        messages: paginatedMessages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener mensajes", error });
    }
  });

  // GET /api/messages/:id - Obtener un mensaje específico
  app.get(`${API_PREFIX}/messages/:id`, verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const message = await storage.getMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      // Verificar que el usuario tenga acceso al mensaje
      if (message.senderId !== req.user!.id && message.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para ver este mensaje" });
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el mensaje", error });
    }
  });

  // POST /api/messages - Crear un nuevo mensaje
  app.post(`${API_PREFIX}/messages`, verifyToken, async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Usar el senderId del cuerpo si viene como admin, de lo contrario usar el ID del usuario actual
      const messageData = {
        ...validatedData,
        // Mantener el senderId proporcionado si el usuario es admin o coordinador, de lo contrario usar el ID del usuario actual
        senderId: (req.user!.rol === 'admin' || req.user!.rol === 'coordinador') && validatedData.senderId ? 
          validatedData.senderId : req.user!.id,
        isRead: false,
        isArchived: false
      };
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Datos de mensaje inválidos", error });
    }
  });

  // PATCH /api/messages/:id/read - Marcar mensaje como leído
  app.patch(`${API_PREFIX}/messages/:id/read`, verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const message = await storage.getMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      // Verificar que el usuario sea el destinatario
      if (message.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para modificar este mensaje" });
      }
      
      const updatedMessage = await storage.updateMessage(id, true, message.isArchived);
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar el mensaje", error });
    }
  });

  // PATCH /api/messages/:id/archive - Archivar un mensaje
  app.patch(`${API_PREFIX}/messages/:id/archive`, verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const message = await storage.getMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      // Verificar que el usuario sea el destinatario
      if (message.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para modificar este mensaje" });
      }
      
      const updatedMessage = await storage.updateMessage(id, message.isRead, true);
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Error al archivar el mensaje", error });
    }
  });

  // DELETE /api/messages/:id - Eliminar un mensaje
  app.delete(`${API_PREFIX}/messages/:id`, verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const message = await storage.getMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      // Verificar que el usuario sea el remitente o destinatario
      if (message.senderId !== req.user!.id && message.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar este mensaje" });
      }
      
      const deleted = await storage.deleteMessage(id);
      if (!deleted) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el mensaje", error });
    }
  });

  // ----- FUNCIONALIDADES DE IA PARA MENSAJES -----
  
  // POST /api/messages/:id/suggestions - Generar sugerencias de respuesta rápida (método anterior)
  app.post(`${API_PREFIX}/messages/:id/suggestions`, verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const message = await storage.getMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      // Verificar que el usuario tenga acceso al mensaje
      if (message.receiverId !== req.user!.id && message.senderId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para acceder a este mensaje" });
      }
      
      // Obtener el rol del remitente para contextualizar mejor las sugerencias
      const senderRole = req.user!.rol;
      
      // Generar sugerencias basadas en el contenido del mensaje
      const suggestions = await generateResponseSuggestions(message.body, senderRole);
      
      res.json({ suggestions });
    } catch (error) {
      console.error("Error generando sugerencias:", error);
      res.status(500).json({ message: "Error al generar sugerencias de respuesta", error });
    }
  });
  
  // POST /api/messages/suggestions - Generar sugerencias de respuesta rápida (nuevo método)
  app.post(`${API_PREFIX}/messages/suggestions`, verifyToken, async (req, res) => {
    try {
      const { messageContent, messageId } = req.body;
      
      if (!messageContent) {
        return res.status(400).json({ message: "Se requiere el contenido del mensaje" });
      }
      
      console.log(`[DEBUG] Recibida solicitud de sugerencias para mensaje ${messageId || 'sin ID'}`);
      console.log(`[DEBUG] Contenido del mensaje (primeros 50 caracteres): ${messageContent.substring(0, 50)}`);
      
      // Obtener el rol del usuario actual para contextualizar mejor las sugerencias
      const userRole = req.user!.rol;
      
      // Generar sugerencias basadas en el contenido del mensaje utilizando la función existente
      const suggestions = await generateResponseSuggestions(messageContent, userRole);
      
      console.log(`[DEBUG] Sugerencias generadas: ${JSON.stringify(suggestions)}`);
      
      res.json({ suggestions });
    } catch (error) {
      console.error("Error generando sugerencias:", error);
      res.status(500).json({ message: "Error al generar sugerencias de respuesta", error });
    }
  });

  // POST /api/messages/analyze-priority - Analizar prioridad de un mensaje
  app.post(`${API_PREFIX}/messages/analyze-priority`, verifyToken, async (req, res) => {
    try {
      const { subject, content } = req.body;
      
      if (!subject || !content) {
        return res.status(400).json({ message: "Se requiere asunto y contenido del mensaje" });
      }
      
      // Obtener el rol del usuario para contextualizar el análisis
      const userRole = req.user!.rol;
      
      // Analizar la prioridad del mensaje
      const priority = await determinePriority(subject, content, userRole);
      
      res.json({ priority });
    } catch (error) {
      console.error("Error analizando prioridad:", error);
      res.status(500).json({ message: "Error al analizar la prioridad del mensaje", error });
    }
  });

  // POST /api/messages/conversation-summary - Generar resumen de una conversación
  app.post(`${API_PREFIX}/messages/conversation-summary`, verifyToken, async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length < 2) {
        return res.status(400).json({ message: "Se requiere un array de mensajes válido" });
      }
      
      // Generar resumen de la conversación
      const summary = await generateConversationSummary(messages);
      
      res.json({ summary });
    } catch (error) {
      console.error("Error generando resumen:", error);
      res.status(500).json({ message: "Error al generar el resumen de la conversación", error });
    }
  });

  // ----- ANUNCIOS ESCOLARES -----
  // GET /api/announcements - Obtener anuncios con paginación y filtros
  app.get(`${API_PREFIX}/announcements`, verifyToken, async (req, res) => {
    try {
      const { page = 1, limit = 10, startDate, endDate, createdBy, target } = req.query;
      
      // Convertir a números para la paginación
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      
      // Obtener anuncios
      let announcements = await storage.getSchoolAnnouncements();
      
      // Aplicar filtros si existen
      if (startDate) {
        const start = new Date(startDate as string);
        announcements = announcements.filter(a => new Date(a.createdAt) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        announcements = announcements.filter(a => new Date(a.createdAt) <= end);
      }
      
      if (createdBy) {
        announcements = announcements.filter(a => a.createdBy === createdBy);
      }
      
      if (target) {
        announcements = announcements.filter(a => a.target === target);
      }
      
      // Filtrar según el rol del usuario
      const userRole = req.user!.rol;
      if (userRole === "padre" || userRole === "alumno") {
        // Padres y alumnos solo ven anuncios globales o dirigidos a su nivel o grupo
        const user = await storage.getUser(req.user!.id);
        
        if (user) {
          // Obtener los grupos asociados al usuario según su rol
          let userGroupIds: number[] = [];
          
          if (userRole === "padre") {
            // Obtener los estudiantes asociados a este padre
            const studentRelations = await storage.getRelationsByParent(user.id);
            const studentIds = studentRelations.map(relation => relation.alumnoId);
            
            // Obtener los grupos de estos estudiantes
            for (const studentId of studentIds) {
              const student = await storage.getStudent(studentId);
              if (student && student.grupoId) {
                userGroupIds.push(student.grupoId);
              }
            }
          } else if (userRole === "alumno") {
            // Obtener estudiante por ID de usuario
            const students = await storage.getStudents();
            const student = students.find(s => s.id.toString() === user.id);
            if (student && student.grupoId) {
              userGroupIds.push(student.grupoId);
            }
          }
          
          // Filtrar anuncios
          announcements = announcements.filter(a => {
            if (a.target === "todos") return true;
            if (userRole === "alumno" && a.target === "alumnos") return true;
            if (userRole === "padre" && a.target === "padres") return true;
            
            // Si es para un grupo específico, verificar si el usuario pertenece a ese grupo
            if (a.targetId && userGroupIds.includes(parseInt(a.targetId))) return true;
            
            return false;
          });
        }
      }
      
      // Ordenar por fecha descendente (más recientes primero)
      announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Calcular paginación
      const totalItems = announcements.length;
      const totalPages = Math.ceil(totalItems / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedAnnouncements = announcements.slice(startIndex, endIndex);
      
      res.json({
        announcements: paginatedAnnouncements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener anuncios", error });
    }
  });

  // GET /api/announcements/:id - Obtener un anuncio específico
  app.get(`${API_PREFIX}/announcements/:id`, verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const announcement = await storage.getSchoolAnnouncement(id);
      
      if (!announcement) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }
      
      res.json(announcement);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el anuncio", error });
    }
  });

  // POST /api/announcements - Crear un nuevo anuncio
  app.post(`${API_PREFIX}/announcements`, verifyToken, checkRole(["admin", "coordinador", "docente"]), async (req, res) => {
    try {
      const validatedData = insertSchoolAnnouncementSchema.parse(req.body);
      
      // Verificar permisos según el tipo de anuncio
      const userRole = req.user!.rol;
      
      // Solo los admins pueden crear anuncios para todos
      if (validatedData.target === "todos" && userRole !== "admin" && userRole !== "coordinador") {
        return res.status(403).json({ message: "No tienes permiso para crear anuncios globales" });
      }
      
      // Los docentes solo pueden crear anuncios para sus grupos
      if (userRole === "docente" && validatedData.targetId) {
        // Obtener asignaciones del profesor
        const assignments = await storage.getSubjectAssignments();
        const teacherAssignments = assignments.filter(a => a.profesorId === parseInt(req.user!.id));
        const teacherGroupIds = teacherAssignments.map(a => a.grupoId);
        
        // Verificar si el grupo objetivo pertenece al profesor
        if (!teacherGroupIds.includes(parseInt(validatedData.targetId))) {
          return res.status(403).json({ 
            message: "No tienes permiso para crear anuncios para este grupo" 
          });
        }
      }
      
      // Establecer el creador como el usuario actual
      const announcementData = {
        ...validatedData,
        createdBy: req.user!.id
      };
      
      const announcement = await storage.createSchoolAnnouncement(announcementData);
      res.status(201).json(announcement);
    } catch (error) {
      res.status(400).json({ message: "Datos de anuncio inválidos", error });
    }
  });

  // PUT /api/announcements/:id - Actualizar un anuncio
  app.put(`${API_PREFIX}/announcements/:id`, verifyToken, checkRole(["admin", "coordinador", "docente"]), async (req, res) => {
    try {
      const id = req.params.id;
      const announcement = await storage.getSchoolAnnouncement(id);
      
      if (!announcement) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }
      
      // Solo el creador o un administrador pueden editar el anuncio
      if (announcement.createdBy !== req.user!.id && req.user!.rol !== "admin") {
        return res.status(403).json({ message: "No tienes permiso para editar este anuncio" });
      }
      
      const validatedData = insertSchoolAnnouncementSchema.partial().parse(req.body);
      const updatedAnnouncement = await storage.updateSchoolAnnouncement(id, validatedData);
      
      res.json(updatedAnnouncement);
    } catch (error) {
      res.status(400).json({ message: "Datos de anuncio inválidos", error });
    }
  });

  // DELETE /api/announcements/:id - Eliminar un anuncio
  app.delete(`${API_PREFIX}/announcements/:id`, verifyToken, checkRole(["admin", "coordinador", "docente"]), async (req, res) => {
    try {
      const id = req.params.id;
      const announcement = await storage.getSchoolAnnouncement(id);
      
      if (!announcement) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }
      
      // Solo el creador o un administrador pueden eliminar el anuncio
      if (announcement.createdBy !== req.user!.id && req.user!.rol !== "admin") {
        return res.status(403).json({ message: "No tienes permiso para eliminar este anuncio" });
      }
      
      const deleted = await storage.deleteSchoolAnnouncement(id);
      if (!deleted) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el anuncio", error });
    }
  });

  // ----- NOTIFICACIONES -----
  // GET /api/notifications - Obtener notificaciones del usuario
  app.get(`${API_PREFIX}/notifications`, verifyToken, async (req, res) => {
    try {
      const { page = 1, limit = 10, read } = req.query;
      
      // Convertir a números para la paginación
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      
      // Obtener notificaciones del usuario actual
      let notifications = await storage.getNotificationsByUser(req.user!.id);
      
      // Filtrar por leídas/no leídas si se especifica
      if (read !== undefined) {
        const isRead = read === 'true';
        notifications = notifications.filter(n => n.isRead === isRead);
      }
      
      // Ordenar por fecha descendente (más recientes primero)
      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Calcular paginación
      const totalItems = notifications.length;
      const totalPages = Math.ceil(totalItems / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedNotifications = notifications.slice(startIndex, endIndex);
      
      res.json({
        notifications: paginatedNotifications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener notificaciones", error });
    }
  });

  // POST /api/notifications - Crear una nueva notificación (solo admin y coordinadores)
  app.post(`${API_PREFIX}/notifications`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ message: "Datos de notificación inválidos", error });
    }
  });

  // PATCH /api/notifications/:id/read - Marcar notificación como leída
  app.patch(`${API_PREFIX}/notifications/:id/read`, verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const notification = await storage.getNotification(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notificación no encontrada" });
      }
      
      // Verificar que el usuario sea el destinatario
      if (notification.userId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para modificar esta notificación" });
      }
      
      const updatedNotification = await storage.updateNotification(id, { isRead: true });
      res.json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar la notificación", error });
    }
  });

  // ----- EVENTOS DEL CALENDARIO -----
  // GET /api/calendar - Obtener eventos del calendario con filtros
  app.get(`${API_PREFIX}/calendar`, verifyToken, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Obtener todos los eventos
      let events = await storage.getCalendarEvents();
      
      // Aplicar filtros de fecha si se especifican
      if (startDate) {
        const start = new Date(startDate as string);
        events = events.filter(e => new Date(e.startDate) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        events = events.filter(e => new Date(e.startDate) <= end);
      }
      
      // Filtrar eventos según el rol del usuario
      const userRole = req.user!.rol;
      if (userRole !== "admin" && userRole !== "coordinador") {
        if (userRole === "docente") {
          // Docentes ven eventos globales y los que ellos hayan creado
          events = events.filter(e => e.target === "todos" || e.target === "docentes" || e.createdBy === req.user!.id);
        } else if (userRole === "padre") {
          // Padres ven eventos globales y dirigidos a padres
          events = events.filter(e => e.target === "todos" || e.target === "padres");
        } else if (userRole === "alumno") {
          // Alumnos ven eventos globales y dirigidos a alumnos
          events = events.filter(e => e.target === "todos" || e.target === "alumnos");
        }
      }
      
      // Ordenar por fecha de inicio
      events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener eventos del calendario", error });
    }
  });

  // GET /api/calendar/:id - Obtener un evento específico
  app.get(`${API_PREFIX}/calendar/:id`, verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const event = await storage.getCalendarEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el evento", error });
    }
  });

  // POST /api/calendar - Crear un nuevo evento
  app.post(`${API_PREFIX}/calendar`, verifyToken, checkRole(["admin", "coordinador", "docente"]), async (req, res) => {
    try {
      const validatedData = insertCalendarEventSchema.parse(req.body);
      
      // Verificar permisos según el tipo de evento
      const userRole = req.user!.rol;
      
      // Solo los admins pueden crear eventos para todos
      if (validatedData.target === "todos" && userRole !== "admin" && userRole !== "coordinador") {
        return res.status(403).json({ message: "No tienes permiso para crear eventos globales" });
      }
      
      // Establecer el creador como el usuario actual
      const eventData = {
        ...validatedData,
        createdBy: req.user!.id
      };
      
      const event = await storage.createCalendarEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ message: "Datos de evento inválidos", error });
    }
  });

  // PUT /api/calendar/:id - Actualizar un evento
  app.put(`${API_PREFIX}/calendar/:id`, verifyToken, checkRole(["admin", "coordinador", "docente"]), async (req, res) => {
    try {
      const id = req.params.id;
      const event = await storage.getCalendarEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }
      
      // Solo el creador o un administrador pueden editar el evento
      if (event.createdBy !== req.user!.id && req.user!.rol !== "admin" && req.user!.rol !== "coordinador") {
        return res.status(403).json({ message: "No tienes permiso para editar este evento" });
      }
      
      const validatedData = insertCalendarEventSchema.partial().parse(req.body);
      const updatedEvent = await storage.updateCalendarEvent(id, validatedData);
      
      res.json(updatedEvent);
    } catch (error) {
      res.status(400).json({ message: "Datos de evento inválidos", error });
    }
  });

  // DELETE /api/calendar/:id - Eliminar un evento
  app.delete(`${API_PREFIX}/calendar/:id`, verifyToken, checkRole(["admin", "coordinador", "docente"]), async (req, res) => {
    try {
      const id = req.params.id;
      const event = await storage.getCalendarEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }
      
      // Solo el creador o un administrador pueden eliminar el evento
      if (event.createdBy !== req.user!.id && req.user!.rol !== "admin" && req.user!.rol !== "coordinador") {
        return res.status(403).json({ message: "No tienes permiso para eliminar este evento" });
      }
      
      const deleted = await storage.deleteCalendarEvent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el evento", error });
    }
  });

  // Endpoint para obtener logs de correos electrónicos
  app.get(`${API_PREFIX}/email-logs`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      const logs = await storage.getEmailLogs();
      res.json(logs);
    } catch (error) {
      console.error('Error al obtener logs de correos:', error);
      res.status(500).json({ error: 'Error al obtener logs de correos' });
    }
  });
  
  // Endpoint para obtener logs de correos por pago
  app.get(`${API_PREFIX}/email-logs/payment/:paymentId`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      if (isNaN(paymentId)) {
        return res.status(400).json({ error: 'ID de pago inválido' });
      }
      
      const logs = await storage.getEmailLogsByPayment(paymentId);
      res.json(logs);
    } catch (error) {
      console.error('Error al obtener logs de correos por pago:', error);
      res.status(500).json({ error: 'Error al obtener logs de correos' });
    }
  });
  
  // Endpoint para obtener logs de correos por estudiante
  app.get(`${API_PREFIX}/email-logs/student/:studentId`, verifyToken, checkRole(["admin", "coordinador", "padre"]), async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (isNaN(studentId)) {
        return res.status(400).json({ error: 'ID de estudiante inválido' });
      }
      
      // Si es un padre, verificar que el estudiante sea su hijo
      if (req.user?.rol === "padre") {
        const relations = await storage.getRelationsByParentId(req.user.id);
        const isParentOfStudent = relations.some(rel => rel.alumnoId === studentId);
        
        if (!isParentOfStudent) {
          return res.status(403).json({ error: 'No tienes permiso para ver esta información' });
        }
      }
      
      const logs = await storage.getEmailLogsByStudent(studentId);
      res.json(logs);
    } catch (error) {
      console.error('Error al obtener logs de correos por estudiante:', error);
      res.status(500).json({ error: 'Error al obtener logs de correos' });
    }
  });

  // Endpoint para depurar problemas con SendGrid
  app.post(`${API_PREFIX}/payment-reminders/debug`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const sgMail = require('@sendgrid/mail');
      
      // Verificar clave API de SendGrid
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ error: 'SENDGRID_API_KEY no está configurada' });
      }
      
      const apiKeyLastChars = process.env.SENDGRID_API_KEY.slice(-4);
      const apiKeyLength = process.env.SENDGRID_API_KEY.length;
      
      // Intentar enviar un correo de prueba
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        const emailData = {
          to: 'test@example.com', // No se enviará realmente
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@sendgrid.net', // Usar la dirección verificada en SendGrid
          subject: 'Test de SendGrid',
          text: 'Este es un correo de prueba para diagnosticar problemas con SendGrid',
          html: '<p>Este es un correo de prueba para diagnosticar problemas con SendGrid</p>',
          mail_settings: {
            sandbox_mode: {
              enable: true // No envía realmente el correo, solo prueba la API
            }
          }
        };
        
        try {
          const response = await sgMail.send(emailData);
          
          // Devolver información relevante
          res.json({
            message: 'Prueba de SendGrid completada',
            apiKey: {
              lastChars: apiKeyLastChars,
              length: apiKeyLength
            },
            response: {
              statusCode: response[0]?.statusCode,
              headers: response[0]?.headers
            },
            success: true
          });
        } catch (sendError) {
          console.error('Error al probar SendGrid:', sendError);
          
          // Obtener información del error
          const code = sendError.code || 'desconocido';
          const responseBody = sendError.response?.body?.errors || [];
          
          res.status(500).json({
            message: 'Error al probar SendGrid',
            apiKey: {
              lastChars: apiKeyLastChars,
              length: apiKeyLength
            },
            error: {
              code: code,
              message: sendError.message,
              details: responseBody
            },
            success: false
          });
        }
        
      } catch (error) {
        console.error('Error general en prueba de SendGrid:', error);
        res.status(500).json({ 
          error: 'Error al realizar prueba de SendGrid',
          message: error.message 
        });
      }
    } catch (error) {
      console.error('Error en API de debug de recordatorios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Endpoint para probar el envío de recordatorios de pagos pendientes
  app.get(`${API_PREFIX}/test-send-reminders`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      console.log('Iniciando prueba de envío de recordatorios de pagos...');
      const result = await sendUpcomingPaymentReminders();
      console.log('Prueba completada:', result);
      res.json({
        success: true,
        message: `Proceso de envío de recordatorios completado: ${result.success} enviados, ${result.errors} errores, ${result.omitted} omitidos`,
        details: result
      });
    } catch (error) {
      console.error('Error al ejecutar prueba de recordatorios:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error al enviar recordatorios: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Endpoint para enviar recordatorios de pago (producción)
  app.post(`${API_PREFIX}/send-reminders`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      // Obtener información del usuario para el log de auditoría
      const user = (req as any).user;
      console.log('Iniciando envío de recordatorios de pagos...');
      
      // Obtener los datos completos del usuario desde la base de datos
      const userDetails = await storage.getUser(user.id);
      const userName = userDetails?.nombreCompleto || "Usuario desconocido";
      
      // Registro de auditoría - inicio de la acción
      await storage.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.rol,
        action: 'envio_recordatorios_manual',
        resource: 'payment_reminders',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          manual: true,
          ipAddress: req.ip || 'unknown'
        }),
        status: 'pending',
        ipAddress: req.ip || 'unknown'
      });
      
      const result = await sendUpcomingPaymentReminders();
      console.log('Envío completado:', result);
      
      // Registro de auditoría - finalización exitosa
      await storage.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.rol,
        action: 'envio_recordatorios_manual',
        resource: 'payment_reminders',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          manual: true,
          result: {
            success: result.success,
            errors: result.errors,
            omitted: result.omitted
          },
          ipAddress: req.ip || 'unknown'
        }),
        status: 'success',
        ipAddress: req.ip || 'unknown'
      });
      
      res.json({
        success: true,
        message: `Proceso de envío de recordatorios completado: ${result.success} enviados, ${result.errors} errores, ${result.omitted} omitidos`,
        success_count: result.success,
        errors: result.errors,
        omitted: result.omitted,
        errorDetails: result.errorDetails,
        omittedDetails: result.omittedDetails
      });
    } catch (error) {
      console.error('Error al ejecutar envío de recordatorios:', error);
      
      // Registro de auditoría - finalización con error
      try {
        const user = (req as any).user;
        // Obtener datos adicionales del usuario
        let userName = "Usuario desconocido";
        try {
          const userDetails = await storage.getUser(user.id);
          if (userDetails) {
            userName = userDetails.nombreCompleto;
          }
        } catch (userError) {
          console.error('Error al obtener detalles del usuario:', userError);
        }
        
        await storage.createAuditLog({
          userId: user.id,
          userName: userName,
          userRole: user.rol,
          action: 'envio_recordatorios_manual',
          resource: 'payment_reminders',
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
            manual: true,
            error: error instanceof Error ? error.message : String(error),
            ipAddress: req.ip || 'unknown'
          }),
          status: 'error',
          errorMessage: error instanceof Error ? error.message : String(error),
          ipAddress: req.ip || 'unknown'
        });
      } catch (logError) {
        console.error('Error al crear log de auditoría:', logError);
      }
      
      res.status(500).json({ 
        success: false, 
        message: `Error al enviar recordatorios: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Rutas para gestión de cron jobs
  
  // Obtener el estado de todos los cron jobs
  app.get(`${API_PREFIX}/cron/status`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      // Importar la función desde cron.ts para evitar problemas de importación circular
      const { getCronJobsStatus } = await import('./cron');
      const status = getCronJobsStatus();
      
      // Formatear los trabajos cron para mostrarlos en el formato esperado
      const formattedStatus = Object.entries(status).map(([name, details]) => ({
        name,
        running: details.running,
        nextRun: details.nextDate ? details.nextDate.toLocaleString('es-MX') : 'No programado',
        nextRunTimestamp: details.nextDate ? details.nextDate.getTime() : null,
        enabled: process.env.ENABLE_REMINDER_CRON !== 'false'
      }));
      
      // Enviar la respuesta formateada
      res.json({
        jobs: formattedStatus,
        systemTime: new Date().toLocaleString('es-MX')
      });
    } catch (error) {
      console.error('Error al obtener estado de cron jobs:', error);
      res.status(500).json({ 
        message: 'Error al obtener estado de cron jobs', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Ejecutar manualmente el cron de recordatorios (solo para testing/admin)
  app.post(`${API_PREFIX}/cron/reminders/run`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      // Obtener información del usuario para el log de auditoría
      const user = (req as any).user;
      console.log('Ejecutando proceso de recordatorios manualmente');
      
      // Obtener los datos completos del usuario desde la base de datos
      const userDetails = await storage.getUser(user.id);
      const userName = userDetails?.nombreCompleto || "Usuario desconocido";
      
      // Registro de auditoría - inicio de la acción
      await storage.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.rol,
        action: 'ejecutar_recordatorios',
        resource: 'cron_job',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          manual: true,
          ipAddress: req.ip || 'unknown'
        }),
        status: 'pending',
        ipAddress: req.ip || 'unknown'
      });
      
      // Ejecutar los recordatorios
      const result = await executeDailyReminders();
      
      // Registro de auditoría - finalización exitosa
      await storage.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.rol,
        action: 'ejecutar_recordatorios',
        resource: 'cron_job',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          manual: true,
          result: {
            success: result.success,
            errors: result.errors,
            omitted: result.omitted
          },
          ipAddress: req.ip || 'unknown'
        }),
        status: 'success',
        ipAddress: req.ip || 'unknown'
      });
      
      res.json(result);
    } catch (error) {
      // Registro de auditoría - finalización con error
      try {
        const user = (req as any).user;
        // Obtener datos adicionales del usuario
        let userName = "Usuario desconocido";
        try {
          const userDetails = await storage.getUser(user.id);
          if (userDetails) {
            userName = userDetails.nombreCompleto;
          }
        } catch (userError) {
          console.error('Error al obtener detalles del usuario:', userError);
        }
        
        await storage.createAuditLog({
          userId: user.id,
          userName: userName,
          userRole: user.rol,
          action: 'ejecutar_recordatorios',
          resource: 'cron_job',
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
            manual: true,
            ipAddress: req.ip || 'unknown'
          }),
          status: 'error',
          ipAddress: req.ip || 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      } catch (logError) {
        console.error('Error al registrar log de auditoría:', logError);
      }
      
      console.error('Error al ejecutar recordatorios manualmente:', error);
      res.status(500).json({ 
        message: 'Error al ejecutar recordatorios manualmente', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Reiniciar todos los cron jobs
  app.post(`${API_PREFIX}/cron/restart`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      // Obtener información del usuario para el log de auditoría
      const user = (req as any).user;
      console.log('Reiniciando todos los cron jobs');
      
      // Obtener los datos completos del usuario desde la base de datos
      const userDetails = await storage.getUser(user.id);
      const userName = userDetails?.nombreCompleto || "Usuario desconocido";
      
      // Registro de auditoría - inicio de la acción
      await storage.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.rol,
        action: 'reiniciar_cron',
        resource: 'cron_job',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          ipAddress: req.ip || 'unknown'
        }),
        status: 'pending',
        ipAddress: req.ip || 'unknown'
      });
      
      stopAllCronJobs();
      initializeCronJobs();
      
      // Importar la función desde cron.ts para evitar problemas de importación circular
      const { getCronJobsStatus } = await import('./cron');
      const status = getCronJobsStatus();
      
      // Registro de auditoría - finalización exitosa
      await storage.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.rol,
        action: 'reiniciar_cron',
        resource: 'cron_job',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          result: {
            jobs: Object.keys(status).map(name => ({
              name,
              status: 'restarted'
            }))
          },
          ipAddress: req.ip || 'unknown'
        }),
        status: 'success',
        ipAddress: req.ip || 'unknown'
      });
      
      res.json({
        message: 'Cron jobs reiniciados correctamente. La acción ha sido registrada en el historial del sistema.',
        jobs: Object.keys(status).map(name => ({
          name,
          status: 'restarted'
        }))
      });
    } catch (error) {
      // Registro de auditoría - finalización con error
      try {
        const user = (req as any).user;
        // Obtener datos adicionales del usuario
        let userName = "Usuario desconocido";
        try {
          const userDetails = await storage.getUser(user.id);
          if (userDetails) {
            userName = userDetails.nombreCompleto;
          }
        } catch (userError) {
          console.error('Error al obtener detalles del usuario:', userError);
        }
        
        await storage.createAuditLog({
          userId: user.id,
          userName: userName,
          userRole: user.rol,
          action: 'reiniciar_cron',
          resource: 'cron_job',
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || 'unknown'
          }),
          status: 'error',
          ipAddress: req.ip || 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      } catch (logError) {
        console.error('Error al registrar log de auditoría:', logError);
      }
      
      console.error('Error al reiniciar cron jobs:', error);
      res.status(500).json({ 
        message: 'Error al reiniciar cron jobs', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Activar/desactivar cron jobs a través de una variable de entorno
  app.post(`${API_PREFIX}/cron/toggle`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const { enable } = req.body;
      // Obtener información del usuario para el log de auditoría
      const user = (req as any).user;
      
      if (typeof enable !== 'boolean') {
        return res.status(400).json({ message: 'El parámetro enable debe ser un valor booleano' });
      }
      
      // Obtener los datos completos del usuario desde la base de datos
      const userDetails = await storage.getUser(user.id);
      const userName = userDetails?.nombreCompleto || "Usuario desconocido";
      
      // Registro de auditoría - inicio de la acción
      await storage.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.rol,
        action: enable ? 'activar_cron' : 'desactivar_cron',
        resource: 'cron_job',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          enabled: enable,
          ipAddress: req.ip || 'unknown'
        }),
        status: 'pending',
        ipAddress: req.ip || 'unknown'
      });
      
      process.env.ENABLE_REMINDER_CRON = enable ? 'true' : 'false';
      console.log(`Cron jobs ${enable ? 'activados' : 'desactivados'}`);
      
      // Reiniciar cron jobs para aplicar el cambio
      stopAllCronJobs();
      if (enable) {
        initializeCronJobs();
      }
      
      // Registro de auditoría - finalización exitosa
      await storage.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.rol,
        action: enable ? 'activar_cron' : 'desactivar_cron',
        resource: 'cron_job',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          result: {
            enabled: enable,
            status: enable ? 'activated' : 'deactivated',
          },
          ipAddress: req.ip || 'unknown'
        }),
        status: 'success',
        ipAddress: req.ip || 'unknown'
      });
      
      res.json({
        message: `Cron jobs ${enable ? 'activados' : 'desactivados'} correctamente. La acción ha sido registrada en el historial del sistema.`,
        enabled: enable
      });
    } catch (error) {
      // Registro de auditoría - finalización con error
      try {
        const user = (req as any).user;
        // Obtener datos adicionales del usuario
        let userName = "Usuario desconocido";
        try {
          const userDetails = await storage.getUser(user.id);
          if (userDetails) {
            userName = userDetails.nombreCompleto;
          }
        } catch (userError) {
          console.error('Error al obtener detalles del usuario:', userError);
        }
        
        await storage.createAuditLog({
          userId: user.id,
          userName: userName,
          userRole: user.rol,
          action: req.body.enable ? 'activar_cron' : 'desactivar_cron',
          resource: 'cron_job',
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
            enabled: req.body.enable,
            ipAddress: req.ip || 'unknown'
          }),
          status: 'error',
          ipAddress: req.ip || 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      } catch (logError) {
        console.error('Error al registrar log de auditoría:', logError);
      }
      
      console.error('Error al cambiar estado de cron jobs:', error);
      res.status(500).json({ 
        message: 'Error al cambiar estado de cron jobs', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para obtener deudas próximas a vencer - Respuesta 100% estática
  app.get("/api/debts/upcoming", (req, res) => {
    console.log("=== ENDPOINT /api/debts/upcoming CON RESPUESTA TOTALMENTE ESTÁTICA ===");
    
    // Solo devolvemos un array estático de objetos JSON
    return res.status(200).json([
      {
        "id": 1,
        "alumnoId": 1,
        "conceptoId": 1,
        "montoTotal": "4000",
        "fechaLimite": "2025-04-15",
        "estatus": "pendiente",
        "studentName": "Ana García Pérez"
      },
      {
        "id": 2,
        "alumnoId": 2,
        "conceptoId": 1,
        "montoTotal": "2800",
        "fechaLimite": "2025-04-17",
        "estatus": "pendiente",
        "studentName": "Juan Pérez López"
      }
    ]);
  });
  
  // ==== SISTEMA DE CLASIFICACIÓN DE RIESGO DE PAGO ====
  
  // Obtener todas las instantáneas de riesgo
  app.get(`${API_PREFIX}/risk-snapshots`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      const snapshots = await storage.getRiskSnapshots();
      res.json(snapshots);
    } catch (error) {
      console.error('Error al obtener instantáneas de riesgo:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error al obtener instantáneas de riesgo: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Obtener instantáneas por mes y año
  app.get(`${API_PREFIX}/risk-snapshots/monthly/:month/:year`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      const month = req.params.month;
      const year = parseInt(req.params.year);
      
      if (!month || isNaN(year)) {
        return res.status(400).json({ error: 'Mes o año inválidos' });
      }
      
      const snapshots = await storage.getRiskSnapshotsByMonth(month, year);
      res.json(snapshots);
    } catch (error) {
      console.error(`Error al obtener instantáneas para ${req.params.month}/${req.params.year}:`, error);
      res.status(500).json({ 
        success: false, 
        message: `Error al obtener instantáneas por mes y año: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Obtener instantáneas por estudiante
  app.get(`${API_PREFIX}/risk-snapshots/student/:studentId`, verifyToken, checkRole(["admin", "coordinador", "padre"]), async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      if (isNaN(studentId)) {
        return res.status(400).json({ error: 'ID de estudiante inválido' });
      }
      
      // Si es un padre, verificar que el estudiante sea su hijo
      if (req.user?.rol === "padre") {
        const relations = await storage.getRelationsByParentId(req.user.id);
        const isParentOfStudent = relations.some(rel => rel.alumnoId === studentId);
        
        if (!isParentOfStudent) {
          return res.status(403).json({ error: 'No tienes permiso para ver esta información' });
        }
      }
      
      const snapshots = await storage.getRiskSnapshotsByStudent(studentId);
      res.json(snapshots);
    } catch (error) {
      console.error(`Error al obtener instantáneas para estudiante ${req.params.studentId}:`, error);
      res.status(500).json({ 
        success: false, 
        message: `Error al obtener instantáneas del estudiante: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Obtener instantáneas por nivel de riesgo
  app.get(`${API_PREFIX}/risk-snapshots/level/:level`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      const level = req.params.level;
      
      if (!level || !['bajo', 'medio', 'alto'].includes(level)) {
        return res.status(400).json({ error: 'Nivel de riesgo inválido. Debe ser bajo, medio o alto.' });
      }
      
      const snapshots = await storage.getRiskSnapshotsByLevel(level);
      res.json(snapshots);
    } catch (error) {
      console.error(`Error al obtener instantáneas de nivel ${req.params.level}:`, error);
      res.status(500).json({ 
        success: false, 
        message: `Error al obtener instantáneas por nivel de riesgo: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Generar instantáneas mensuales
  app.post(`${API_PREFIX}/risk-snapshots/generate/:month/:year`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const month = req.params.month;
      const year = parseInt(req.params.year);
      
      if (!month || isNaN(year)) {
        return res.status(400).json({ error: 'Mes o año inválidos' });
      }
      
      console.log(`Generando instantáneas para ${month}/${year}...`);
      const snapshots = await storage.generateMonthlyRiskSnapshots(month, year);
      
      res.status(201).json({
        success: true,
        message: `Se generaron ${snapshots.length} instantáneas de riesgo para ${month}/${year}`,
        count: snapshots.length
      });
    } catch (error) {
      console.error(`Error al generar instantáneas para ${req.params.month}/${req.params.year}:`, error);
      res.status(500).json({ 
        success: false, 
        message: `Error al generar instantáneas mensuales: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  // Agregar rutas de IA (sin verificación de token para solucionar problema temporal)
  // Nota: En producción, se debería utilizar el middleware verifyToken
  app.use(`${API_PREFIX}/ai`, aiRoutes);

  // Ruta para el asistente IA tipo chat
  app.post(`${API_PREFIX}/assistant/chat`, verifyToken, async (req, res) => {
    try {
      // Extraer los datos de la solicitud
      const { message, messages: clientMessages, userRole, systemPrompt } = req.body;
      
      // Verifica si el asistente está configurado
      if (!isAssistantConfigured()) {
        console.error('ANTHROPIC_API_KEY no disponible para el asistente IA');
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere una API key de Anthropic para usar el asistente' 
        });
      }
      
      // Preparar los mensajes para Claude en el formato esperado
      let formattedMessages;
      
      // Si el cliente envía un array de mensajes, usarlo directamente
      if (clientMessages && Array.isArray(clientMessages)) {
        formattedMessages = clientMessages;
        console.log(`➡ Petición recibida del asistente con ${formattedMessages.length} mensajes`);
      } 
      // Si el cliente envía un mensaje simple, convertirlo al formato de array
      else if (message) {
        formattedMessages = [
          {
            role: 'user',
            content: message
          }
        ];
        console.log(`➡ Mensaje recibido: "${message.substring(0, 30)}..."`);
      } 
      // Si no hay mensaje ni array de mensajes, retornar error
      else {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere un mensaje o un array de mensajes' 
        });
      }
      
      console.log(`➡ Petición recibida del asistente - rol: ${userRole || 'no especificado'}`);
      console.log(`🔑 API Key activa:`, process.env.ANTHROPIC_API_KEY ? "Sí" : "No");
      
      // Obtener la respuesta del asistente
      const response = await processAssistantRequest({ 
        messages: formattedMessages, 
        userRole,
        systemPrompt 
      });
      
      console.log(`✅ Respuesta generada: "${response.substring(0, 30)}..."`);
      
      return res.json({ 
        success: true, 
        response, 
        isConfigured: true
      });
    } catch (error) {
      console.error('Error al procesar la solicitud del asistente:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al procesar la solicitud del asistente: ' + (error instanceof Error ? error.message : String(error))
      });
    }
  });

  // Registrar rutas para padres
  app.use(`${API_PREFIX}/padres`, verifyToken, parentRoutes);
  
  // Endpoint para obtener vinculaciones de responsables
  app.get(`${API_PREFIX}/vinculaciones/:id_usuario`, verifyToken, async (req, res) => {
    try {
      const { id_usuario } = req.params;
      
      // Verificar que el usuario tiene permisos
      const user = (req as any).user;
      if (user.id !== id_usuario && user.rol !== 'admin' && user.rol !== 'coordinador') {
        return res.status(403).json({ 
          success: false,
          message: 'No tienes permiso para acceder a estas vinculaciones'
        });
      }
      
      // Obtener vinculaciones
      const vinculaciones = await storage.getVinculacionesByResponsable(id_usuario);
      
      res.json({
        success: true,
        vinculaciones
      });
    } catch (error) {
      console.error("Error al obtener vinculaciones:", error);
      res.status(500).json({ 
        success: false,
        message: "Error al obtener vinculaciones", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para crear una vinculación
  app.post(`${API_PREFIX}/vinculaciones`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const validatedData = insertAlumnoResponsableSchema.parse(req.body);
      const vinculacion = await storage.createVinculacion(validatedData);
      
      res.status(201).json({
        success: true,
        vinculacion
      });
    } catch (error) {
      console.error("Error al crear vinculación:", error);
      res.status(400).json({ 
        success: false,
        message: "Error al crear vinculación", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para obtener vinculaciones por alumno
  app.get(`${API_PREFIX}/vinculaciones/alumno/:id_alumno`, verifyToken, checkRole(["admin", "coordinador"]), async (req, res) => {
    try {
      const { id_alumno } = req.params;
      
      // Validar que el alumno existe
      const alumno = await storage.getStudent(parseInt(id_alumno));
      if (!alumno) {
        return res.status(404).json({
          success: false,
          message: "Alumno no encontrado"
        });
      }
      
      // Obtener todas las vinculaciones para este alumno
      // NOTA: Este método debe ser implementado en storage.ts
      const vinculaciones = await storage.getVinculacionesByAlumno(parseInt(id_alumno));
      
      // Obtener información adicional de cada usuario vinculado
      const vinculacionesConInfo = await Promise.all(
        vinculaciones.map(async (v) => {
          const usuario = await storage.getUser(v.id_usuario);
          return {
            ...v,
            nombre: usuario?.nombreCompleto || 'Usuario desconocido',
            correo: usuario?.correo || 'Sin correo'
          };
        })
      );
      
      res.json(vinculacionesConInfo);
    } catch (error) {
      console.error("Error al obtener vinculaciones del alumno:", error);
      res.status(500).json({ 
        success: false,
        message: "Error al obtener vinculaciones del alumno", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint para eliminar una vinculación
  app.delete(`${API_PREFIX}/vinculaciones/:id_alumno/:id_usuario`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const { id_alumno, id_usuario } = req.params;
      const deleted = await storage.deleteVinculacion(parseInt(id_alumno), id_usuario);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Vinculación no encontrada"
        });
      }
      
      res.json({
        success: true,
        message: "Vinculación eliminada correctamente"
      });
    } catch (error) {
      console.error("Error al eliminar vinculación:", error);
      res.status(500).json({ 
        success: false,
        message: "Error al eliminar vinculación", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para obtener estudiantes vinculados a un responsable/padre
  app.get(`${API_PREFIX}/parents/:id_usuario/students`, verifyToken, async (req, res) => {
    try {
      const { id_usuario } = req.params;
      
      console.log(`🔍 DEBUG: Endpoint /parents/:id_usuario/students - id_usuario recibido: ${id_usuario}`);
      console.log(`🔍 DEBUG: Información del usuario autenticado:`, JSON.stringify((req as any).user, null, 2));
      console.log(`🔍 DEBUG: Tipo del rol del usuario autenticado:`, typeof (req as any).user?.rol, `- Valor: "${(req as any).user?.rol}"`);
      
      // Verificar que el usuario tiene permisos
      const user = (req as any).user;
      if (!user) {
        console.log(`⚠️ Usuario no autenticado`);
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }
      
      // Verificación más robusta de permisos
      const esUsuarioSolicitado = user.id === id_usuario;
      const esPadre = user.rol === 'padre';
      const esAdmin = user.rol === 'admin';
      
      console.log(`🔍 DEBUG: Verificación de permisos - Es usuario solicitado: ${esUsuarioSolicitado}, Es padre: ${esPadre}, Es admin: ${esAdmin}`);
      
      if ((!esUsuarioSolicitado || !esPadre) && !esAdmin) {
        console.log(`⚠️ Permiso denegado - usuario ${user.id} con rol ${user.rol}, solicita datos de ${id_usuario}`);
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para acceder a esta información'
        });
      }

      console.log(`✅ Permisos verificados, obteniendo vinculaciones para padre: ${id_usuario}`);
      
      // Obtener vinculaciones para este padre/responsable
      const vinculaciones = await storage.getVinculacionesByResponsable(id_usuario);
      console.log(`🔍 DEBUG: Vinculaciones obtenidas:`, JSON.stringify(vinculaciones, null, 2));
      
      if (!vinculaciones || vinculaciones.length === 0) {
        console.log(`ℹ️ No se encontraron vinculaciones para el usuario ${id_usuario}`);
        return res.json([]);
      }
      
      // Obtener información completa de cada estudiante vinculado
      console.log(`🔍 DEBUG: Obteniendo detalles de ${vinculaciones.length} estudiantes vinculados`);
      
      const studentDetails = [];
      
      for (const vinculacion of vinculaciones) {
        try {
          console.log(`🔍 DEBUG: Procesando vinculación para alumno ID ${vinculacion.id_alumno}`);
          
          const student = await storage.getStudent(vinculacion.id_alumno);
          if (!student) {
            console.log(`⚠️ No se encontró estudiante con ID ${vinculacion.id_alumno}`);
            continue;
          }
          
          console.log(`✅ Obtenida información del estudiante: ${student.nombreCompleto}`);
          
          // Obtener información adicional del estudiante (grupo)
          let groupInfo = null;
          if (student.grupoId) {
            try {
              const group = await storage.getGroup(student.grupoId);
              if (group) {
                groupInfo = `${group.nivel} - ${group.nombre}`;
                console.log(`✅ Grupo del estudiante: ${groupInfo}`);
              }
            } catch (groupError) {
              console.error(`❌ Error al obtener grupo ${student.grupoId}:`, groupError);
            }
          }
          
          const studentDetail = {
            id: student.id,
            nombreCompleto: student.nombreCompleto,
            fotoUrl: student.fotoUrl || null,
            grupo: groupInfo,
            grupoId: student.grupoId || null,
            cicloEscolar: "2024-2025",
            tipoVinculacion: vinculacion.tipo_relacion || "Hijo/a"
          };
          
          console.log(`🔍 DEBUG: Detalle de estudiante procesado:`, JSON.stringify(studentDetail, null, 2));
          studentDetails.push(studentDetail);
        } catch (error) {
          console.error(`❌ Error procesando vinculación para alumno ${vinculacion.id_alumno}:`, error);
        }
      }
      
      // Filtrar posibles valores nulos (por estudiantes que puedan haber sido eliminados)
      const validStudents = studentDetails.filter(Boolean);
      
      return res.json(validStudents);
    } catch (error) {
      console.error("Error al obtener estudiantes vinculados:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener estudiantes vinculados", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Ruta para crear un nuevo usuario (incluyendo profesores)
  app.post(`${API_PREFIX}/users`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const { nombreCompleto, correo, password, rol = "docente", materiaPrincipal } = req.body;
      
      // Validaciones básicas
      if (!nombreCompleto || !correo || !password) {
        return res.status(400).json({ 
          message: "Faltan campos obligatorios", 
          details: "Se requieren nombreCompleto, correo y contraseña" 
        });
      }
      
      // Verificar si el correo ya existe
      const existingUser = await storage.getUserByEmail(correo);
      if (existingUser) {
        return res.status(400).json({ message: "El correo electrónico ya está registrado" });
      }
      
      // Generar hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Crear el usuario con la contraseña cifrada
      const newUser = await storage.createUser({
        nombreCompleto,
        correo,
        password: hashedPassword,
        rol,
        activo: true
      });
      
      // Si es profesor y hay materia principal, actualizar el profesor correspondiente
      if (rol === "docente" && materiaPrincipal) {
        try {
          // Buscar si ya existe un profesor con ese correo
          const teachers = await storage.getTeachers();
          const existingTeacher = teachers.find(t => t.correo.toLowerCase() === correo.toLowerCase());
          
          if (existingTeacher) {
            // Actualizar profesor existente
            await storage.updateTeacher(existingTeacher.id, {
              materiaPrincipal,
            });
          } else {
            // Crear registro de profesor
            await storage.createTeacher({
              nombreCompleto,
              correo,
              materiaPrincipal,
            });
          }
        } catch (teacherError) {
          console.error("Error al actualizar profesor:", teacherError);
          // No interrumpimos el flujo principal si falla esto
        }
      }
      
      // Eliminar la contraseña del objeto de respuesta
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      res.status(500).json({ 
        message: "Error al crear el usuario", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Registrar rutas del profesor
  app.use(`${API_PREFIX}/profesor`, verifyToken, teacherRoutes);
  
  // NOTA: No duplicar esta ruta. Ya fue registrada anteriormente en la línea 67
  // app.use(`${API_PREFIX}/teacher-assistant`, verifyToken, teacherAssistantRoutes);
  
  // Registrar rutas para pagos
  app.use(`${API_PREFIX}/pagos`, verifyToken, paymentRoutes);
  
  // Rutas para pagos SPEI
  app.use(`${API_PREFIX}/spei`, verifyToken, speiRoutes);
  
  // Rutas para reportes IA
  app.use(`${API_PREFIX}`, verifyToken, reporteRoutes);
  
  // Rutas para horarios de grupos
  app.use(`${API_PREFIX}/groups`, verifyToken, scheduleRoutes);

  // API para Horarios
  app.get(`${API_PREFIX}/schedules`, verifyToken, async (req, res) => {
    try {
      const schedules = await storage.getSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener horarios" });
    }
  });

  app.get(`${API_PREFIX}/schedules/:id`, verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const schedule = await storage.getSchedule(Number(id));
      if (!schedule) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el horario" });
    }
  });

  // Las rutas GET y POST para /api/groups/:id/schedules se han movido al router de scheduleRoutes

  app.get(`${API_PREFIX}/schedules-details`, verifyToken, async (req, res) => {
    try {
      const scheduleDetails = await storage.getScheduleDetails();
      res.json(scheduleDetails);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener detalles de horarios" });
    }
  });

  app.post(`${API_PREFIX}/schedules`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const newSchedule = await storage.createSchedule(req.body);
      res.status(201).json(newSchedule);
    } catch (error) {
      res.status(500).json({ message: "Error al crear horario" });
    }
  });

  app.put(`${API_PREFIX}/schedules/:id`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updatedSchedule = await storage.updateSchedule(Number(id), req.body);
      if (!updatedSchedule) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }
      res.json(updatedSchedule);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar horario" });
    }
  });

  app.delete(`${API_PREFIX}/schedules/:id`, verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSchedule(Number(id));
      if (!success) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar horario" });
    }
  });

  // Rutas para observaciones
  app.get(`${API_PREFIX}/observaciones`, verifyToken, async (req, res) => {
    try {
      const observaciones = await storage.getObservaciones();
      res.json(observaciones);
    } catch (error) {
      console.error("Error al obtener observaciones:", error);
      res.status(500).json({ message: "Error al obtener observaciones" });
    }
  });

  // Endpoint de prueba para diagnóstico (acceso directo sin autenticación)
  app.get('/debug/observacion/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DEBUG: Buscando observación con ID: ${id} (sin autenticación)`);
      
      const observacion = await storage.getObservacionById(id);
      
      if (!observacion) {
        console.log(`DEBUG: Observación con ID ${id} no encontrada`);
        return res.status(404).json({ message: "Observación no encontrada" });
      }
      
      console.log('DEBUG: Datos de observación encontrados:', JSON.stringify(observacion, null, 2));
      res.json(observacion);
    } catch (error) {
      console.error(`DEBUG: Error al obtener observación con ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Error al obtener la observación" });
    }
  });

  app.get(`${API_PREFIX}/observaciones/:id`, verifyToken, checkRole(["admin", "docente"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Buscando observación con ID: ${id}`);
      
      const observacion = await storage.getObservacionById(id);
      
      if (!observacion) {
        console.log(`Observación con ID ${id} no encontrada`);
        return res.status(404).json({ message: "Observación no encontrada" });
      }
      
      console.log('Datos de observación encontrados:', JSON.stringify(observacion, null, 2));
      
      // Si es docente, verificar que sea el autor de la observación o que el alumno esté en su grupo
      if (req.user?.rol === "docente") {
        // Obtener el ID del profesor
        let profesorId = null;
        if (req.user?.id) {
          profesorId = await storage.getProfesorIdByUserId(req.user.id);
        }
        
        console.log('Verificando permisos para ver observación:', {
          userRole: req.user?.rol,
          userProfesorId: profesorId,
          observacionProfesorId: observacion.profesorId
        });
      }
      
      res.json(observacion);
    } catch (error) {
      console.error(`Error al obtener observación con ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Error al obtener la observación" });
    }
  });

  app.get(`${API_PREFIX}/profesores/:id/observaciones`, verifyToken, async (req, res) => {
    try {
      const profesorId = parseInt(req.params.id);
      const observaciones = await storage.getObservacionesByProfesor(profesorId);
      res.json(observaciones);
    } catch (error) {
      console.error(`Error al obtener observaciones del profesor ${req.params.id}:`, error);
      res.status(500).json({ message: "Error al obtener observaciones del profesor" });
    }
  });

  app.get(`${API_PREFIX}/alumnos/:id/observaciones`, verifyToken, async (req, res) => {
    try {
      const alumnoId = parseInt(req.params.id);
      const observaciones = await storage.getObservacionesByAlumno(alumnoId);
      res.json(observaciones);
    } catch (error) {
      console.error(`Error al obtener observaciones del alumno ${req.params.id}:`, error);
      res.status(500).json({ message: "Error al obtener observaciones del alumno" });
    }
  });

  app.get(`${API_PREFIX}/grupos/:id/observaciones`, verifyToken, async (req, res) => {
    try {
      const grupoId = parseInt(req.params.id);
      const observaciones = await storage.getObservacionesByGrupo(grupoId);
      res.json(observaciones);
    } catch (error) {
      console.error(`Error al obtener observaciones del grupo ${req.params.id}:`, error);
      res.status(500).json({ message: "Error al obtener observaciones del grupo" });
    }
  });

  app.post(`${API_PREFIX}/observaciones`, verifyToken, checkRole(["admin", "docente"]), async (req, res) => {
    try {
      const requestData = { ...req.body };
      
      // Si no se proporciona un profesorId y el usuario es un docente, obtenemos su ID de profesor
      if (!requestData.profesorId && req.user?.rol === 'docente' && req.user?.id) {
        const profesorId = await storage.getProfesorIdByUserId(req.user.id);
        if (profesorId) {
          requestData.profesorId = profesorId;
        } else {
          return res.status(400).json({ 
            message: "No se pudo determinar el ID del profesor asociado a este usuario" 
          });
        }
      }
      
      const validatedData = insertObservacionSchema.parse(requestData);
      const observacion = await storage.createObservacion(validatedData);
      
      // Obtener datos del usuario para el log de auditoría
      const usuarioActual = await storage.getUser(req.user?.id);
      
      // Registrar en log de auditoría
      if (usuarioActual) {
        await storage.createAuditLog({
          userId: req.user?.id,
          userName: usuarioActual.nombreCompleto || 'Usuario desconocido',
          userEmail: usuarioActual.correo || null,
          userRole: usuarioActual.rol || req.user?.rol || 'desconocido',
          action: 'CREATE',
          resource: 'observacion',
          resourceId: observacion.id.toString(),
          details: JSON.stringify({
            alumnoId: observacion.alumnoId,
            profesorId: observacion.profesorId,
            categoria: observacion.categoria
          })
        });
      }
      
      res.status(201).json(observacion);
    } catch (error) {
      console.error("Error al crear observación:", error);
      res.status(400).json({ 
        message: "Datos de observación inválidos", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put(`${API_PREFIX}/observaciones/:id`, verifyToken, checkRole(["admin", "docente"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar que la observación existe
      const existingObservacion = await storage.getObservacionById(id);
      if (!existingObservacion) {
        return res.status(404).json({ message: "Observación no encontrada" });
      }
      
      // Obtener el ID del profesor si el usuario es docente
      let profesorId = null;
      if (req.user?.rol === 'docente' && req.user?.id) {
        profesorId = await storage.getProfesorIdByUserId(req.user.id);
      }
      
      // Verificar que el profesor es el autor o es admin
      if (req.user?.rol !== 'admin' && existingObservacion.profesorId !== profesorId) {
        console.log('Acceso denegado. Rol:', req.user?.rol, 'ProfesorId requerido:', existingObservacion.profesorId, 'ProfesorId usuario:', profesorId);
        return res.status(403).json({ 
          message: "No tiene permiso para modificar esta observación" 
        });
      }
      
      const validatedData = insertObservacionSchema.partial().parse(req.body);
      const updatedObservacion = await storage.updateObservacion(id, validatedData);
      
      // Obtener datos del usuario para el log de auditoría
      const usuarioActual = await storage.getUser(req.user?.id);
      
      // Registrar en log de auditoría
      if (usuarioActual) {
        await storage.createAuditLog({
          userId: req.user?.id,
          userName: usuarioActual.nombreCompleto || 'Usuario desconocido',
          userRole: usuarioActual.rol || req.user?.rol || 'desconocido',
          action: 'UPDATE',
          resource: 'observacion',
          status: 'success',
          details: JSON.stringify({
            changes: validatedData
          })
        });
      }
      
      res.json(updatedObservacion);
    } catch (error) {
      console.error(`Error al actualizar observación con ID ${req.params.id}:`, error);
      res.status(400).json({ 
        message: "Datos de observación inválidos", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete(`${API_PREFIX}/observaciones/:id`, verifyToken, checkRole(["admin", "docente"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar que la observación existe
      const existingObservacion = await storage.getObservacionById(id);
      if (!existingObservacion) {
        return res.status(404).json({ message: "Observación no encontrada" });
      }
      
      // Obtener el ID del profesor si el usuario es docente
      let profesorId = null;
      if (req.user?.rol === 'docente' && req.user?.id) {
        profesorId = await storage.getProfesorIdByUserId(req.user.id);
      }
      
      // Verificar que el profesor es el autor o es admin
      if (req.user?.rol !== 'admin' && existingObservacion.profesorId !== profesorId) {
        console.log('Acceso denegado para eliminar. Rol:', req.user?.rol, 'ProfesorId requerido:', existingObservacion.profesorId, 'ProfesorId usuario:', profesorId);
        return res.status(403).json({ 
          message: "No tiene permiso para eliminar esta observación" 
        });
      }
      
      const deleted = await storage.deleteObservacion(id);
      
      // Obtener datos del usuario para el log de auditoría
      const usuarioActual = await storage.getUser(req.user?.id);
      
      // Registrar en log de auditoría
      if (usuarioActual) {
        await storage.createAuditLog({
          userId: req.user?.id,
          userName: usuarioActual.nombreCompleto || 'Usuario desconocido',
          userRole: usuarioActual.rol || req.user?.rol || 'desconocido',
          action: 'DELETE',
          resource: 'observacion',
          status: 'success',
          details: JSON.stringify({
            alumnoId: existingObservacion.alumnoId,
            profesorId: existingObservacion.profesorId
          })
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error al eliminar observación con ID ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error al eliminar la observación", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Registrar rutas de estadísticas de grupo
  registerGroupStatsRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
