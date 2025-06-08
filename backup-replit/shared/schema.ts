import { pgTable, text, serial, date, boolean, numeric, timestamp, uuid, primaryKey, integer, time, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Estudiantes
export const students = pgTable("alumnos", {
  id: serial("id").primaryKey(),
  nombreCompleto: text("nombre_completo").notNull(),
  curp: text("curp").notNull(),
  fechaNacimiento: date("fecha_nacimiento").notNull(),
  genero: text("genero").notNull(),
  grupoId: serial("grupo_id").references(() => groups.id),
  nivel: text("nivel").notNull(),
  estatus: text("estatus").default("activo").notNull(),
});

// Profesores
export const teachers = pgTable("profesores", {
  id: serial("id").primaryKey(),
  nombreCompleto: text("nombre_completo").notNull(),
  correo: text("correo").notNull(),
  materiaPrincipal: text("materia_principal"),
});

// Grupos
export const groups = pgTable("grupos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  nivel: text("nivel").notNull(),
  cicloEscolar: text("ciclo_escolar").notNull(),
  estado: text("estado").default("activo").notNull(), // activo, archivado
});

// Materias
export const subjects = pgTable("materias", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  nivel: text("nivel").notNull(),
  areaAcademica: text("area_academica"),
  horasPorSemana: integer("horas_por_semana"),
  tipoMateria: text("tipo_materia"), // Regular, Optativa, Taller, etc.
  estado: text("estado").default("activo").notNull(), // activo, inactivo
});

// Horarios
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  grupoId: integer("grupo_id").references(() => groups.id, { onDelete: "cascade" }),
  materiaId: integer("materia_id").references(() => subjects.id, { onDelete: "cascade" }),
  profesorId: integer("profesor_id").references(() => teachers.id, { onDelete: "set null" }),
  diaSemana: text("dia_semana").notNull(), // Lunes, Martes, Miércoles, etc.
  horaInicio: time("hora_inicio").notNull(),
  horaFin: time("hora_fin").notNull(),
  modo: text("modo").default("Presencial"), // Presencial, Virtual, Híbrido
  estatus: text("estatus").default("Activo"), // Activo, Cancelado, Reprogramado
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas de inserción y tipos para Horarios
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

// Asignaciones de profesores a grupos
export const groupTeachers = pgTable("group_teachers", {
  id: serial("id").primaryKey(),
  groupId: serial("group_id").references(() => groups.id),
  teacherId: serial("teacher_id").references(() => teachers.id),
});

// Asignaciones de materias
export const subjectAssignments = pgTable("asignaciones_materia", {
  id: serial("id").primaryKey(),
  grupoId: serial("grupo_id").references(() => groups.id),
  materiaId: serial("materia_id").references(() => subjects.id),
  profesorId: serial("profesor_id").references(() => teachers.id),
});

// Calificaciones
export const grades = pgTable("calificaciones", {
  id: serial("id").primaryKey(),
  alumnoId: serial("alumno_id").references(() => students.id),
  materiaId: serial("materia_id").references(() => subjects.id),
  rubro: text("rubro").notNull(), // Examen, Proyecto, etc.
  valor: numeric("valor").notNull(),
  periodo: text("periodo").notNull(),
  comentario: text("comentario"),
});

// Asistencias
export const attendance = pgTable("asistencias", {
  id: serial("id").primaryKey(),
  alumnoId: serial("alumno_id").references(() => students.id),
  fecha: date("fecha").notNull(),
  asistencia: boolean("asistencia").notNull(),
  justificacion: text("justificacion"),
});

// Conceptos de Pago
export const paymentConcepts = pgTable("conceptos_pago", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  montoBase: numeric("monto_base").notNull(),
  aplicaA: text("aplica_a").notNull(), // 'individual', 'grupo', 'nivel'
  cicloEscolar: text("ciclo_escolar").notNull(),
  tipoAplicacion: text("tipo_aplicacion", { enum: ["mensual", "anual"] }).default("mensual").notNull(),
  fechaInicioVigencia: date("fecha_inicio_vigencia"),
  fechaFinVigencia: date("fecha_fin_vigencia"),
  categoriaContable: text("categoria_contable"),
  notasInternas: text("notas_internas"),
  nivelAplicable: text("nivel_aplicable"), // 'Preescolar', 'Primaria', 'Secundaria', 'Preparatoria', 'Todos'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Adeudos
export const debts = pgTable("adeudos", {
  id: serial("id").primaryKey(),
  alumnoId: serial("alumno_id").references(() => students.id),
  conceptoId: serial("concepto_id").references(() => paymentConcepts.id),
  montoTotal: numeric("monto_total").notNull(),
  fechaLimite: date("fecha_limite").notNull(),
  estatus: text("estatus").default("pendiente").notNull(), // 'pendiente', 'pagado', 'parcial', 'vencido'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pagos
export const payments = pgTable("pagos", {
  id: serial("id").primaryKey(),
  alumnoId: serial("alumno_id").references(() => students.id),
  conceptoId: serial("concepto_id").references(() => paymentConcepts.id),
  adeudoId: integer("adeudo_id").references(() => debts.id),
  monto: numeric("monto").notNull(),
  fechaPago: date("fecha_pago").notNull(),
  metodoPago: text("metodo_pago").notNull(), // 'efectivo', 'transferencia', 'tarjeta', etc.
  estado: text("estado", { enum: ["pendiente", "validando", "confirmado", "rechazado", "cancelado"] }).default("pendiente").notNull(),
  referencia: text("referencia"),
  observaciones: text("observaciones"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Usuarios del sistema
export const users = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombreCompleto: text("nombre_completo").notNull(),
  correo: text("correo").notNull().unique(),
  // Mapeamos el campo 'contraseña' de la BD al nombre 'password' en el código
  password: text("contraseña").notNull(),
  rol: text("rol").notNull().$type<'admin' | 'coordinador' | 'docente' | 'padre' | 'alumno'>(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relación antigua entre padres y alumnos (mantener para compatibilidad)
export const parentStudentRelations = pgTable("relacion_padres_alumnos", {
  id: uuid("id").primaryKey().defaultRandom(),
  padreId: uuid("padre_id").notNull().references(() => users.id),
  alumnoId: serial("alumno_id").notNull().references(() => students.id),
});

// Relación entre responsables y alumnos (nueva tabla)
export const alumnosResponsables = pgTable("alumnos_responsables", {
  id: uuid("id").primaryKey().defaultRandom(),
  id_alumno: serial("id_alumno").notNull().references(() => students.id),
  id_usuario: uuid("id_usuario").notNull().references(() => users.id),
  tipo_relacion: text("tipo_relacion").notNull(), // 'padre', 'madre', 'tutor', etc.
  fecha_vinculo: timestamp("fecha_vinculo").defaultNow().notNull(),
}, (table) => {
  return {
    // Crear un índice único compuesto para evitar duplicados
    unqUserStudent: primaryKey({ columns: [table.id_alumno, table.id_usuario] }),
  };
});

// Esquemas de inserción y tipos

// Estudiantes
export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// Profesores
export const insertTeacherSchema = createInsertSchema(teachers).omit({ id: true });
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachers.$inferSelect;

// Grupos
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true });
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

// Materias
export const insertSubjectSchema = createInsertSchema(subjects).omit({ id: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

// Asignaciones de profesores a grupos
export const insertGroupTeacherSchema = createInsertSchema(groupTeachers).omit({ id: true });
export type InsertGroupTeacher = z.infer<typeof insertGroupTeacherSchema>;
export type GroupTeacher = typeof groupTeachers.$inferSelect;

// Asignaciones de materias
export const insertSubjectAssignmentSchema = createInsertSchema(subjectAssignments).omit({ id: true });
export type InsertSubjectAssignment = z.infer<typeof insertSubjectAssignmentSchema>;
export type SubjectAssignment = typeof subjectAssignments.$inferSelect;

// Calificaciones
export const insertGradeSchema = createInsertSchema(grades)
  .omit({ id: true })
  .extend({
    valor: z.number().min(0).max(10),
    comentario: z.string().max(300).nullable().optional(),
  });
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof grades.$inferSelect;

// Asistencias
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

// Conceptos de Pago
export const insertPaymentConceptSchema = createInsertSchema(paymentConcepts).omit({ id: true, createdAt: true });
export type InsertPaymentConcept = z.infer<typeof insertPaymentConceptSchema>;
export type PaymentConcept = typeof paymentConcepts.$inferSelect;

// Adeudos
export const insertDebtSchema = createInsertSchema(debts).omit({ id: true, createdAt: true });
export type InsertDebt = z.infer<typeof insertDebtSchema>;
export type Debt = typeof debts.$inferSelect;

// Pagos
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Usuarios
export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export const loginSchema = z.object({
  correo: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});
export type LoginData = z.infer<typeof loginSchema>;

// Relaciones Padre-Alumno (tabla antigua - mantener por compatibilidad)
export const insertParentStudentRelationSchema = createInsertSchema(parentStudentRelations).omit({ id: true });
export type InsertParentStudentRelation = z.infer<typeof insertParentStudentRelationSchema>;
export type ParentStudentRelation = typeof parentStudentRelations.$inferSelect;

// Vinculaciones de Responsables-Alumnos (nueva tabla)
export const insertAlumnoResponsableSchema = createInsertSchema(alumnosResponsables).omit({ id: true, fecha_vinculo: true });
export type InsertAlumnoResponsable = z.infer<typeof insertAlumnoResponsableSchema>;
export type AlumnoResponsable = typeof alumnosResponsables.$inferSelect;

// Criterios de evaluación
export const evaluationCriteria = pgTable("criterios_evaluacion", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  porcentaje: integer("porcentaje").notNull(), // Porcentaje sobre la calificación total (0-100)
  nivel: text("nivel").notNull(), // Nivel educativo al que aplica: Preescolar, Primaria, etc.
  materiaId: serial("materia_id").references(() => subjects.id),
  cicloEscolar: text("ciclo_escolar").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Asignación de criterios a materias por grupo
export const criteriaAssignments = pgTable("asignaciones_criterios", {
  id: serial("id").primaryKey(),
  criterioId: serial("criterio_id").references(() => evaluationCriteria.id),
  materiaId: serial("materia_id").references(() => subjects.id),
  grupoId: serial("grupo_id").references(() => groups.id),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Calificaciones por criterio
export const criteriaGrades = pgTable("calificaciones_criterio", {
  id: serial("id").primaryKey(),
  alumnoId: serial("alumno_id").references(() => students.id),
  materiaId: serial("materia_id").references(() => subjects.id),
  criterioId: serial("criterio_id").references(() => evaluationCriteria.id),
  valor: numeric("valor").notNull(), // Calificación del 0 al 10
  periodo: text("periodo").notNull(),
  observaciones: text("observaciones"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Avisos escolares
export const avisos = pgTable("avisos", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  contenido: text("contenido").notNull(),
  fechaPublicacion: date("fecha_publicacion").defaultNow().notNull(),
  publico: text("publico", { enum: ["todos", "nivel", "grupo", "individual"] }).notNull(),
  nivel: text("nivel"),
  grupoId: serial("grupo_id").references(() => groups.id),
  alumnoId: serial("alumno_id").references(() => students.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recomendaciones IA (caching para Claude)
export const iaRecommendations = pgTable("ia_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: integer("student_id").notNull().references(() => students.id),
  textoGenerado: text("texto_generado").notNull(),
  fechaGeneracion: timestamp("fecha_generacion").defaultNow().notNull(),
});

// Historial de Recomendaciones IA
export const iaRecommendationHistory = pgTable("ia_recommendation_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: integer("student_id").notNull().references(() => students.id),
  contenido: text("contenido").notNull(),
  fechaGeneracion: timestamp("fecha_generacion").defaultNow().notNull(),
  tipoGeneracion: text("tipo_generacion").notNull(), // 'individual', 'lote'
  modoGeneracion: text("modo_generacion").notNull(), // 'simulado', 'real'
  generadoPor: text("generado_por"), // email del usuario que lo generó
  version: integer("version").notNull().default(1), // versión secuencial por estudiante
});

export const insertIaRecommendationSchema = createInsertSchema(iaRecommendations).omit({ id: true, fechaGeneracion: true });
export type InsertIaRecommendation = z.infer<typeof insertIaRecommendationSchema>;
export type IaRecommendation = typeof iaRecommendations.$inferSelect;

export const insertIaRecommendationHistorySchema = createInsertSchema(iaRecommendationHistory).omit({ id: true, fechaGeneracion: true, version: true });
export type InsertIaRecommendationHistory = z.infer<typeof insertIaRecommendationHistorySchema>;
export type IaRecommendationHistory = typeof iaRecommendationHistory.$inferSelect;

// Criterios de Evaluación
export const insertEvaluationCriteriaSchema = createInsertSchema(evaluationCriteria).omit({ id: true, createdAt: true });
export type InsertEvaluationCriteria = z.infer<typeof insertEvaluationCriteriaSchema>;
export type EvaluationCriteria = typeof evaluationCriteria.$inferSelect;

// Asignaciones de Criterios
export const insertCriteriaAssignmentSchema = createInsertSchema(criteriaAssignments).omit({ id: true, createdAt: true });
export type InsertCriteriaAssignment = z.infer<typeof insertCriteriaAssignmentSchema>;
export type CriteriaAssignment = typeof criteriaAssignments.$inferSelect;

// Calificaciones por Criterio
export const insertCriteriaGradeSchema = createInsertSchema(criteriaGrades).omit({ id: true, createdAt: true });
export type InsertCriteriaGrade = z.infer<typeof insertCriteriaGradeSchema>;
export type CriteriaGrade = typeof criteriaGrades.$inferSelect;

// Avisos
export const insertAvisoSchema = createInsertSchema(avisos).omit({ id: true, createdAt: true });
export type InsertAviso = z.infer<typeof insertAvisoSchema>;
export type Aviso = typeof avisos.$inferSelect;



// Tareas
export const tasks = pgTable("tareas", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  instrucciones: text("instrucciones").notNull(),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
  fechaEntrega: timestamp("fecha_entrega").notNull(),
  grupoId: serial("grupo_id").references(() => groups.id),
  materiaId: serial("materia_id").references(() => subjects.id),
  profesorId: uuid("profesor_id").notNull().references(() => users.id),
  archivoUrl: text("archivo_url"),
  enlaceUrl: text("enlace_url"),
  estado: text("estado", { enum: ["activo", "completada", "vencida"] }).default("activo").notNull(),
});

// Entregas de tareas
export const taskSubmissions = pgTable("entregas_tareas", {
  id: serial("id").primaryKey(),
  tareaId: serial("tarea_id").references(() => tasks.id),
  alumnoId: serial("alumno_id").references(() => students.id),
  fechaEntrega: timestamp("fecha_entrega").defaultNow().notNull(),
  archivoUrl: text("archivo_url"),
  comentarios: text("comentarios"),
  estado: text("estado", { enum: ["entregada", "revisada", "retrasada"] }).default("entregada").notNull(),
  calificacion: numeric("calificacion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tareas schema
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, fechaCreacion: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Entregas de tareas schema
export const insertTaskSubmissionSchema = createInsertSchema(taskSubmissions).omit({ id: true, createdAt: true });
export type InsertTaskSubmission = z.infer<typeof insertTaskSubmissionSchema>;
export type TaskSubmission = typeof taskSubmissions.$inferSelect;

// Tipos para reportes y analítica
export interface AcademicPerformanceReport {
  grupoId: number;
  grupoNombre: string;
  nivel: string;
  periodos: string[];
  promedioGeneral: number;
  promediosPorMateria: {
    materia: string;
    calificacionesPromedio: number[];
    promedio: number;
  }[];
  asistencia: {
    porcentaje: number;
    presente: number;
    total: number;
  };
  mejoresEstudiantes: {
    id: number;
    nombre: string;
    promedio: number;
  }[];
  peoresEstudiantes: {
    id: number;
    nombre: string;
    promedio: number;
  }[];
  distribucionCalificaciones?: {
    rango: string;
    cantidad: number;
    porcentaje: number;
  }[];
  periodo?: string;
}

export interface AttendanceReport {
  grupoId: number;
  grupoNombre: string;
  nivel: string;
  periodo: string;
  porcentajeGrupal: number;
  totalEstudiantes: number;
  estudiantesMenorAsistencia: {
    estudianteId: number;
    nombreCompleto: string;
    porcentajeAsistencia: number;
    presente: number;
    ausente: number;
    total: number;
  }[];
  detalleEstudiantes: {
    estudianteId: number;
    nombreCompleto: string;
    porcentajeAsistencia: number;
    presente: number;
    ausente: number;
    total: number;
  }[];
  registrosPorFecha?: {
    fecha: string;
    asistencias: number;
    ausencias: number;
    retardos: number;
    total: number;
    porcentaje: number;
  }[];
  alumnosConMasFaltas?: {
    alumnoId: number;
    nombreCompleto: string;
    faltas: number;
    retardos: number;
  }[];
  porcentajeAsistencia?: number;
}

export interface FinancialReport {
  totalAdeudado: number;
  totalPagado: number;
  porcentajeRecuperacion: number;
  detalleGrupos: {
    grupoId: number;
    grupoNombre: string;
    nivel: string;
    totalAlumnos: number;
    totalAdeudado: number;
    totalPagado: number;
    porcentajeRecuperacion: number;
  }[];
  resumenConceptos: {
    conceptoId: number;
    nombre: string;
    totalAdeudado: number;
    totalPagado: number;
    porcentajeRecuperacion: number;
  }[];
  grupoId?: number;
  grupoNombre?: string;
  nivel?: string;
  periodo?: string;
  totalAdeudos?: number;
  porcentajePagado?: number;
  adeudosPorConcepto?: {
    conceptoId: number;
    nombreConcepto: string;
    monto: number;
    porcentaje: number;
  }[];
  alumnosConAdeudos?: {
    alumnoId: number;
    nombreCompleto: string;
    montoAdeudo: number;
    diasVencimiento: number;
  }[];
};

// Tipo para boletas académicas
export type StudentReport = {
  alumnoId: number;
  nombreCompleto: string;
  grupo: string;
  nivel: string;
  periodo: string;
  cicloEscolar: string;
  calificaciones: {
    materiaId: number;
    materiaNombre: string;
    promedio: number;
    criterios: {
      criterioId: number;
      criterioNombre: string;
      porcentaje: number;
      valor: number;
    }[];
    observaciones?: string;
  }[];
  promedioGeneral: number;
  asistencia: {
    total: number;
    ausencias: number;
    porcentaje: number;
  };
};

// Historial de cambios en calificaciones
export const gradeHistory = pgTable("historial_calificaciones", {
  id: serial("id").primaryKey(),
  calificacionId: serial("calificacion_id").references(() => grades.id),
  valorAnterior: numeric("valor_anterior"),
  valorNuevo: numeric("valor_nuevo").notNull(),
  comentarioAnterior: text("comentario_anterior"),
  comentarioNuevo: text("comentario_nuevo"),
  usuarioId: uuid("usuario_id").notNull().references(() => users.id),
  fechaModificacion: timestamp("fecha_modificacion").defaultNow().notNull(),
});

export const insertGradeHistorySchema = createInsertSchema(gradeHistory).omit({ id: true, fechaModificacion: true });
export type InsertGradeHistory = z.infer<typeof insertGradeHistorySchema>;
export type GradeHistory = typeof gradeHistory.$inferSelect;

// Periodos académicos
export const academicPeriods = pgTable("periodos_academicos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin").notNull(),
  cicloEscolar: text("ciclo_escolar").notNull(),
  estado: text("estado", { enum: ["abierto", "cerrado"] }).default("abierto").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAcademicPeriodSchema = createInsertSchema(academicPeriods).omit({ id: true, createdAt: true });
export type InsertAcademicPeriod = z.infer<typeof insertAcademicPeriodSchema>;
export type AcademicPeriod = typeof academicPeriods.$inferSelect;

// ======== SISTEMA DE COMUNICACIÓN ESCOLAR ========

// Tabla de mensajes
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  receiverId: uuid("receiver_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  priority: text("priority", { enum: ["alta", "media", "baja"] }).default("media").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tipo del modelo Message
export type Message = typeof messages.$inferSelect;
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Tabla de anuncios escolares
export const schoolAnnouncements = pgTable("school_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetRoles: text("target_roles").array().notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tipo del modelo SchoolAnnouncement
export type SchoolAnnouncement = typeof schoolAnnouncements.$inferSelect;
export const insertSchoolAnnouncementSchema = createInsertSchema(schoolAnnouncements).omit({ id: true, createdAt: true });
export type InsertSchoolAnnouncement = z.infer<typeof insertSchoolAnnouncementSchema>;

// Tabla de notificaciones
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  type: text("type", { enum: ["mensaje", "evento", "recordatorio"] }).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tipo del modelo Notification
export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Tabla de eventos de calendario
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tipo del modelo CalendarEvent
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true });
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

// Relaciones de mensajes
export const messageRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

// Relaciones de anuncios escolares
export const schoolAnnouncementRelations = relations(schoolAnnouncements, ({ one }) => ({
  creator: one(users, {
    fields: [schoolAnnouncements.createdBy],
    references: [users.id],
  }),
}));

// Relaciones de notificaciones
export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Relaciones de eventos de calendario
export const calendarEventRelations = relations(calendarEvents, ({ one }) => ({
  creator: one(users, {
    fields: [calendarEvents.createdBy],
    references: [users.id],
  }),
}));

// Configuración institucional
export const institutionSettings = pgTable("configuracion_institucional", {
  id: serial("id").primaryKey(),
  clave: text("clave").notNull().unique(), // 'recargo_habilitado', 'porcentaje_recargo_mora', etc.
  valor: text("valor").notNull(), // Valor como string que se parsea según el tipo
  tipo: text("tipo", { enum: ["boolean", "number", "string", "json"] }).default("string").notNull(),
  descripcion: text("descripcion"),
  actualizadoPor: uuid("actualizado_por").references(() => users.id),
  fechaActualizacion: timestamp("fecha_actualizacion").defaultNow().notNull(),
});

// Tipos para configuración institucional
export const insertInstitutionSettingSchema = createInsertSchema(institutionSettings).omit({ id: true, fechaActualizacion: true });
export type InsertInstitutionSetting = z.infer<typeof insertInstitutionSettingSchema>;
export type InstitutionSetting = typeof institutionSettings.$inferSelect;

// Registro de envío de correos electrónicos
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  paymentId: serial("payment_id").references(() => payments.id),
  studentId: serial("student_id").references(() => students.id),
  debtId: integer("debt_id"),
  conceptName: text("concept_name"),
  dueDate: date("due_date"),
  recipientEmails: text("recipient_emails"),
  guardianEmail: text("guardian_email"),
  subject: text("subject"),
  status: text("status"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  // Nota: No existe columna created_at en la base de datos
});

// Tipos para registros de correos
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true });
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// Bitácora de resúmenes financieros generados por IA
export const aiFinancialSummaries = pgTable("resumen_financiero_ia", {
  id: serial("id").primaryKey(),
  anio: integer("anio").notNull(),
  mes: integer("mes").notNull(),
  resumenTexto: text("resumen_texto").notNull(),
  usuarioId: uuid("usuario_id").notNull().references(() => users.id),
  fechaGeneracion: timestamp("fecha_generacion").defaultNow().notNull(),
  grupoId: integer("grupo_id"), // Opcional: para filtros aplicados
  conceptoId: integer("concepto_id"), // Opcional: para filtros aplicados
  metadatos: text("metadatos"), // JSON con información adicional como filtros
});

// Tipos para resúmenes financieros IA
export const insertAIFinancialSummarySchema = createInsertSchema(aiFinancialSummaries).omit({ id: true, fechaGeneracion: true });
export type InsertAIFinancialSummary = z.infer<typeof insertAIFinancialSummarySchema>;
export type AIFinancialSummary = typeof aiFinancialSummaries.$inferSelect;

// Registro de auditoría para acciones administrativas
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(), // 'activar_cron', 'desactivar_cron', 'reiniciar_cron', 'ejecutar_recordatorios', etc
  resource: text("resource").notNull(), // 'cron_job', 'recordatorios', etc
  details: text("details"), // JSON con detalles adicionales
  status: text("status").notNull(), // 'success', 'error', 'warning'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  errorMessage: text("error_message"),
});

// Tipos para registros de auditoría
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Instantáneas mensuales de clasificación de riesgo
export const riskSnapshots = pgTable("risk_snapshots", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  riskLevel: text("risk_level", { enum: ["bajo", "medio", "alto"] }).notNull(),
  // Estos campos no existen en la base de datos actual pero están definidos en el esquema
  // para compatibilidad futura cuando se realice la migración
  // justification: text("justification"),
  // recommendedAction: text("recommended_action"),
  // confidenceScore: text("confidence_score"),
  // overdueDays: text("overdue_days").default("0"),
  // overdueAmount: text("overdue_amount").default("0"),
  totalDebt: numeric("total_adeudos").default("0").notNull(),
  totalPaid: numeric("total_pagado").default("0").notNull(),
  duePayments: integer("pagos_vencidos").default(0),
  onTimePayments: integer("pagos_a_tiempo").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relaciones para instantáneas de riesgo
export const riskSnapshotRelations = relations(riskSnapshots, ({ one }) => ({
  student: one(students, {
    fields: [riskSnapshots.studentId],
    references: [students.id],
  }),
}));

// Tipos para instantáneas de riesgo
export const insertRiskSnapshotSchema = createInsertSchema(riskSnapshots).omit({ id: true, createdAt: true });
export type InsertRiskSnapshot = z.infer<typeof insertRiskSnapshotSchema>;
export type RiskSnapshot = typeof riskSnapshots.$inferSelect;

// Pagos Pendientes (para transferencias SPEI)
export const pendingPayments = pgTable("pagos_pendientes", {
  id: serial("id").primaryKey(),
  alumnoId: serial("alumno_id").references(() => students.id),
  conceptoId: serial("concepto_id").references(() => paymentConcepts.id),
  montoEsperado: numeric("monto_esperado").notNull(),
  referencia: text("referencia").notNull().unique(),
  metodoPago: text("metodo_pago").default("SPEI").notNull(),
  estado: text("estado", { enum: ["pendiente_confirmacion", "verificado", "caducado", "pagado"] }).default("pendiente_confirmacion").notNull(),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
  fechaVencimiento: timestamp("fecha_vencimiento").notNull(),
  observaciones: text("observaciones"),
  archivoComprobante: text("archivo_comprobante"),
  usuarioConfirmacion: uuid("usuario_confirmacion").references(() => users.id),
  fechaConfirmacion: timestamp("fecha_confirmacion"),
});

// Tipos para pagos pendientes
export const insertPendingPaymentSchema = createInsertSchema(pendingPayments).omit({ id: true, fechaCreacion: true });
export type InsertPendingPayment = z.infer<typeof insertPendingPaymentSchema>;
export type PendingPayment = typeof pendingPayments.$inferSelect;

// Eventos de Agenda
export const eventosAgenda = pgTable("eventos_agenda", {
  id: serial("id").primaryKey(),
  estudianteId: serial("estudiante_id").references(() => students.id),
  fecha: date("fecha").notNull(),
  hora: text("hora"),
  titulo: text("titulo").notNull(),
  tipo: text("tipo", { enum: ["tarea", "reunion", "pago", "evaluacion", "actividad"] }).notNull(),
  descripcion: text("descripcion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventoAgendaSchema = createInsertSchema(eventosAgenda).omit({ id: true, createdAt: true });
export type InsertEventoAgenda = z.infer<typeof insertEventoAgendaSchema>;
export type EventoAgenda = typeof eventosAgenda.$inferSelect;

// Observaciones de profesores sobre estudiantes
export const observaciones = pgTable("observaciones", {
  id: serial("id").primaryKey(),
  profesorId: integer("profesor_id").references(() => teachers.id).notNull(),
  alumnoId: integer("alumno_id").references(() => students.id).notNull(),
  grupoId: integer("grupo_id").references(() => groups.id).notNull(),
  materiaId: integer("materia_id").references(() => subjects.id).notNull(),
  categoria: text("categoria"), // 'Desempeño académico', 'Conducta', 'Asistencia', 'Comunicación con padres'
  contenido: text("contenido").notNull(),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
});

export const insertObservacionSchema = createInsertSchema(observaciones).omit({ id: true, fechaCreacion: true });
export type InsertObservacion = z.infer<typeof insertObservacionSchema>;
export type Observacion = typeof observaciones.$inferSelect;

// Secciones de recomendaciones estructuradas
export const RecommendationSectionSchema = z.object({
  titulo: z.string(),
  contenido: z.array(z.string()),
  prioridad: z.enum(["alta", "media", "baja"]).optional(),
});
export type RecommendationSection = z.infer<typeof RecommendationSectionSchema>;

// Estructura estandarizada para recomendaciones pedagógicas
export const TeacherRecommendationContentSchema = z.object({
  fechaGeneracion: z.string(),
  grupoId: z.number(),
  grupoNombre: z.string(),
  profesorNombre: z.string(),
  nivel: z.string(),
  resumenEstadistico: z.object({
    promedioGeneral: z.number(),
    porcentajeAsistencia: z.number(),
    porcentajeAprobacion: z.number(),
    estudiantesEnRiesgo: z.number(),
    totalEstudiantes: z.number(),
  }),
  recomendaciones: z.object({
    estrategiasGenerales: RecommendationSectionSchema,
    materialApoyo: RecommendationSectionSchema,
    estudiantesRiesgo: RecommendationSectionSchema,
  }),
});
export type TeacherRecommendationContent = z.infer<typeof TeacherRecommendationContentSchema>;

// Estructura para plan individual de estudiante
export const StudentPlanSchema = z.object({
  materiasDificultad: z.array(z.object({
    nombre: z.string(),
    promedio: z.number(),
    descripcion: z.string(),
  })),
  accionesMejora: z.array(z.object({
    titulo: z.string(),
    descripcion: z.string(),
    fechaLimite: z.string().optional(),
    responsable: z.string().optional(),
    estado: z.enum(["pendiente", "completado"]).optional(),
  })),
  actividadesRefuerzo: z.array(z.string()),
  recomendacionesPadres: z.array(z.string()),
});
export type StudentPlan = z.infer<typeof StudentPlanSchema>;

// Estructura estandarizada para planes de recuperación
export const RecoveryPlanContentSchema = z.object({
  fechaGeneracion: z.string(),
  grupoId: z.number(),
  grupoNombre: z.string(),
  nivel: z.string(),
  profesorNombre: z.string(),
  cicloEscolar: z.string(),
  periodo: z.string(),
  resumenEstadistico: z.object({
    promedioGeneral: z.number(),
    porcentajeAsistencia: z.number(),
    porcentajeAprobacion: z.number(),
    estudiantesEnRiesgo: z.number(),
    totalEstudiantes: z.number(),
  }),
  estudiantes: z.array(z.object({
    id: z.number(),
    nombre: z.string(),
    promedio: z.number(),
    asistencia: z.number(),
    nivelRiesgo: z.enum(["alto", "medio", "bajo"]),
    plan: StudentPlanSchema,
  })),
});
export type RecoveryPlanContent = z.infer<typeof RecoveryPlanContentSchema>;

// Recomendaciones pedagógicas IA
export const teacherRecommendations = pgTable("teacher_recommendations", {
  id: serial("id").primaryKey(),
  profesorId: integer("profesorid").references(() => teachers.id, { onDelete: "cascade" }),
  grupoId: integer("grupoid").references(() => groups.id, { onDelete: "cascade" }),
  contenido: jsonb("contenido").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Planes de recuperación IA
export const recoveryPlans = pgTable("recovery_plans", {
  id: serial("id").primaryKey(),
  profesorId: integer("profesorid").references(() => teachers.id, { onDelete: "cascade" }),
  grupoId: integer("grupoid").references(() => groups.id, { onDelete: "cascade" }),
  contenido: jsonb("contenido").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Esquemas de inserción y tipos para recomendaciones
export const insertTeacherRecommendationSchema = createInsertSchema(teacherRecommendations).omit({ id: true, createdAt: true });
export type InsertTeacherRecommendation = z.infer<typeof insertTeacherRecommendationSchema>;
export type TeacherRecommendation = typeof teacherRecommendations.$inferSelect;

// Esquemas de inserción y tipos para planes de recuperación
export const insertRecoveryPlanSchema = createInsertSchema(recoveryPlans).omit({ id: true, createdAt: true });
export type InsertRecoveryPlan = z.infer<typeof insertRecoveryPlanSchema>;
export type RecoveryPlan = typeof recoveryPlans.$inferSelect;
