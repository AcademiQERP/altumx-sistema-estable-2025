import { 
  Student, InsertStudent, 
  Teacher, InsertTeacher,
  Group, InsertGroup,
  Subject, InsertSubject,
  SubjectAssignment, InsertSubjectAssignment,
  Grade, InsertGrade,
  Attendance, InsertAttendance,
  PaymentConcept, InsertPaymentConcept,
  Debt, InsertDebt,
  Aviso, InsertAviso,
  Payment, InsertPayment,
  User, InsertUser, 
  ParentStudentRelation, InsertParentStudentRelation,
  AcademicPerformanceReport,
  AttendanceReport,
  FinancialReport,
  StudentReport,
  EvaluationCriteria, InsertEvaluationCriteria,
  CriteriaAssignment, InsertCriteriaAssignment,
  EventoAgenda, InsertEventoAgenda,
  AuditLog, InsertAuditLog,
  CriteriaGrade, InsertCriteriaGrade,
  Task, InsertTask,
  TaskSubmission, InsertTaskSubmission,
  Message, InsertMessage,
  SchoolAnnouncement, InsertSchoolAnnouncement,
  Notification, InsertNotification,
  CalendarEvent, InsertCalendarEvent,
  EmailLog, InsertEmailLog,
  GradeHistory, InsertGradeHistory,
  payments,
  RiskSnapshot, InsertRiskSnapshot,
  AIFinancialSummary, InsertAIFinancialSummary,
  PendingPayment, InsertPendingPayment,
  Schedule, InsertSchedule,
  Observacion, InsertObservacion,
  AlumnoResponsable, InsertAlumnoResponsable,
  alumnosResponsables,
  TeacherRecommendation, InsertTeacherRecommendation,
  IaRecommendation, InsertIaRecommendation
} from "@shared/schema";
import session from "express-session";
import crypto from "crypto";
import createMemoryStore from "memorystore";
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { db } from './db';

// Define the account statement type
export interface AccountStatement {
  student: Student;
  debts: Debt[];
  payments: Payment[];
  totalDebt: number;
  totalPaid: number;
  balance: number;
}

export interface IStorage {
  // Métodos para profesores
  getProfesorIdByUserId(userId: string): Promise<number | null>;
  
  // Horarios
  getSchedules(): Promise<Schedule[]>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  getSchedulesByGroup(groupId: number): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: number): Promise<boolean>;
  getScheduleDetails(): Promise<Array<{
    id: number;
    grupoId: number;
    grupoNombre: string;
    materiaId: number;
    materiaNombre: string;
    profesorId: number | null;
    profesorNombre: string | null;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    modo: string;
    estatus: string;
  }>>;
    
  // Estudiantes
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;

  // Profesores
  getTeachers(): Promise<Teacher[]>;
  getTeacher(id: number): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: number, teacher: Partial<InsertTeacher>): Promise<Teacher | undefined>;
  deleteTeacher(id: number): Promise<boolean>;
  
  // Asignaciones de profesores a grupos
  getGroupTeachers(): Promise<GroupTeacher[]>;
  getGroupTeachersByGroup(groupId: number): Promise<GroupTeacher[]>;
  getTeachersByGroup(groupId: number): Promise<Teacher[]>;
  getGroupsByTeacher(teacherId: number): Promise<Group[]>;
  assignTeachersToGroup(groupId: number, teacherIds: number[]): Promise<boolean>;
  removeTeacherFromGroup(groupId: number, teacherId: number): Promise<boolean>;

  // Grupos
  getGroups(): Promise<Group[]>;
  getGroup(id: number): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, group: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;

  // Materias
  getSubjects(): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<boolean>;

  // Asignaciones de materias
  getSubjectAssignments(): Promise<SubjectAssignment[]>;
  getSubjectAssignment(id: number): Promise<SubjectAssignment | undefined>;
  getSubjectAssignmentsByTeacher(teacherId: string): Promise<SubjectAssignment[]>;
  getSubjectAssignmentsByTeacherId(teacherId: number): Promise<SubjectAssignment[]>;
  getSubjectAssignmentsByGroup(groupId: number): Promise<SubjectAssignment[]>;
  createSubjectAssignment(assignment: InsertSubjectAssignment): Promise<SubjectAssignment>;
  updateSubjectAssignment(id: number, assignment: Partial<InsertSubjectAssignment>): Promise<SubjectAssignment | undefined>;
  deleteSubjectAssignment(id: number): Promise<boolean>;

  // Calificaciones
  getGrades(): Promise<Grade[]>;
  getGrade(id: number): Promise<Grade | undefined>;
  getGradesByStudent(studentId: number): Promise<Grade[]>;
  getGradesByGroup(groupId: number): Promise<Grade[]>;
  getGradesByGroupAndSubject(groupId: number, subjectId: number): Promise<Grade[]>;
  getStudentsByGroup(groupId: number): Promise<Student[]>;
  
  // Estadísticas de grupos
  getGroupStats(groupId: number): Promise<{
    promedioGeneral: string;
    porcentajeAsistencia: string;
    totalEstudiantes: number;
    porcentajeAprobados: string;
  } | null>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  updateGradeBatch(gradesData: (Grade | InsertGrade)[]): Promise<Grade[]>;
  createGradeHistory(historyData: InsertGradeHistory): Promise<GradeHistory>;
  getGradeHistory(gradeId: number): Promise<GradeHistory[]>;
  updateGrade(id: number, grade: Partial<InsertGrade>): Promise<Grade | undefined>;
  deleteGrade(id: number): Promise<boolean>;

  // Asistencias
  getAttendance(): Promise<Attendance[]>;
  getAttendanceByDate(date: Date): Promise<Attendance[]>;
  getAttendanceByStudent(studentId: number): Promise<Attendance[]>;
  getAttendancesByGroup(groupId: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  deleteAttendance(id: number): Promise<boolean>;
  
  // Conceptos de Pago
  getPaymentConcepts(): Promise<PaymentConcept[]>;
  getPaymentConcept(id: number): Promise<PaymentConcept | undefined>;
  createPaymentConcept(concept: InsertPaymentConcept): Promise<PaymentConcept>;
  updatePaymentConcept(id: number, concept: Partial<InsertPaymentConcept>): Promise<PaymentConcept | undefined>;
  deletePaymentConcept(id: number): Promise<boolean>;
  
  // Adeudos
  getDebts(): Promise<Debt[]>;
  getDebt(id: number): Promise<Debt | undefined>;
  getDebtsByStudent(studentId: number): Promise<Debt[]>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt | undefined>;
  deleteDebt(id: number): Promise<boolean>;
  
  // Pagos
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByStudent(studentId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  
  // Estado de Cuenta
  getAccountStatement(studentId: number): Promise<AccountStatement>;

  // Usuarios
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Relaciones Padre-Alumno
  getParentStudentRelations(): Promise<ParentStudentRelation[]>;
  getParentStudentRelation(id: string): Promise<ParentStudentRelation | undefined>;
  getRelationsByParent(parentId: string | null, studentId?: number): Promise<ParentStudentRelation[]>;
  getRelationsByStudent(studentId: number): Promise<ParentStudentRelation[]>;
  getStudentsByParent(parentId: string): Promise<Student[]>;
  verifyStudentParentRelation(studentId: number, parentId: string): Promise<boolean>;
  createParentStudentRelation(relation: InsertParentStudentRelation): Promise<ParentStudentRelation>;
  deleteParentStudentRelation(id: string): Promise<boolean>;
  
  // Logs de Correos Electrónicos
  getEmailLogs(): Promise<EmailLog[]>;
  getEmailLogsByPayment(paymentId: number): Promise<EmailLog[]>;
  getEmailLogsByStudent(studentId: number): Promise<EmailLog[]>;
  createEmailLog(emailLog: InsertEmailLog): Promise<EmailLog>;
  
  // Instantáneas de Riesgo de Pago
  getRiskSnapshots(): Promise<RiskSnapshot[]>;
  getRiskSnapshotsByMonth(month: string, year: number): Promise<RiskSnapshot[]>;
  getRiskSnapshotsByStudent(studentId: number): Promise<RiskSnapshot[]>;
  getRiskSnapshotsByLevel(riskLevel: string): Promise<RiskSnapshot[]>;
  createRiskSnapshot(snapshot: InsertRiskSnapshot): Promise<RiskSnapshot>;
  generateMonthlyRiskSnapshots(month: string, year: number): Promise<RiskSnapshot[]>;
  
  // Avisos Escolares
  getAvisos(): Promise<Aviso[]>;
  getAviso(id: string): Promise<Aviso | undefined>;
  getAvisosByNivel(nivel: string): Promise<Aviso[]>;
  getAvisosByGrupo(grupoId: number): Promise<Aviso[]>;
  getAvisosByAlumno(alumnoId: number): Promise<Aviso[]>;
  getAvisosForParent(parentId: string): Promise<Aviso[]>;
  createAviso(aviso: InsertAviso): Promise<Aviso>;
  updateAviso(id: string, aviso: Partial<InsertAviso>): Promise<Aviso | undefined>;
  deleteAviso(id: string): Promise<boolean>;
  
  // Criterios de Evaluación
  getEvaluationCriteria(): Promise<EvaluationCriteria[]>;
  getEvaluationCriterion(id: number): Promise<EvaluationCriteria | undefined>;
  getEvaluationCriteriaBySubject(subjectId: number): Promise<EvaluationCriteria[]>;
  getEvaluationCriteriaByLevel(nivel: string): Promise<EvaluationCriteria[]>;
  createEvaluationCriterion(criterion: InsertEvaluationCriteria): Promise<EvaluationCriteria>;
  updateEvaluationCriterion(id: number, criterion: Partial<InsertEvaluationCriteria>): Promise<EvaluationCriteria | undefined>;
  deleteEvaluationCriterion(id: number): Promise<boolean>;

  // Asignaciones de Criterios
  getCriteriaAssignments(): Promise<CriteriaAssignment[]>;
  getCriteriaAssignment(id: number): Promise<CriteriaAssignment | undefined>;
  getCriteriaAssignmentsByGroup(groupId: number): Promise<CriteriaAssignment[]>;
  getCriteriaAssignmentsBySubject(subjectId: number): Promise<CriteriaAssignment[]>;
  createCriteriaAssignment(assignment: InsertCriteriaAssignment): Promise<CriteriaAssignment>;
  updateCriteriaAssignment(id: number, assignment: Partial<InsertCriteriaAssignment>): Promise<CriteriaAssignment | undefined>;
  deleteCriteriaAssignment(id: number): Promise<boolean>;

  // Calificaciones por Criterio
  getCriteriaGrades(): Promise<CriteriaGrade[]>;
  getCriteriaGrade(id: number): Promise<CriteriaGrade | undefined>;
  getCriteriaGradesByStudent(studentId: number): Promise<CriteriaGrade[]>;
  getCriteriaGradesBySubject(subjectId: number, studentId: number): Promise<CriteriaGrade[]>;
  getCriteriaGradesByStudentAndSubject(studentId: number, subjectId: number): Promise<CriteriaGrade[]>;
  createCriteriaGrade(grade: InsertCriteriaGrade): Promise<CriteriaGrade>;
  updateCriteriaGrade(id: number, grade: Partial<InsertCriteriaGrade>): Promise<CriteriaGrade | undefined>;
  updateCriteriaGradeBatch(gradesData: any[], userId: string): Promise<CriteriaGrade[]>;
  deleteCriteriaGrade(id: number): Promise<boolean>;
  
  // Boleta Académica
  getStudentReport(studentId: number, periodo: string): Promise<StudentReport>;

  // Relaciones Grupo-Profesor
  getGroupTeachers(): Promise<GroupTeacher[]>;
  getGroupTeachersByGroup(groupId: number): Promise<GroupTeacher[]>;
  getTeachersByGroup(groupId: number): Promise<Teacher[]>;
  getGroupsByTeacher(teacherId: number): Promise<Group[]>;
  assignTeachersToGroup(groupId: number, teacherIds: number[]): Promise<boolean>;
  removeTeacherFromGroup(groupId: number, teacherId: number): Promise<boolean>;

  // Tareas
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByGroup(groupId: number): Promise<Task[]>;
  getTasksBySubject(subjectId: number): Promise<Task[]>;
  getTasksByTeacher(teacherId: string): Promise<Task[]>;
  getActiveTasksForGroup(groupId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Entregas de Tareas
  getTaskSubmissions(): Promise<TaskSubmission[]>;
  getTaskSubmission(id: number): Promise<TaskSubmission | undefined>;
  getTaskSubmissionsByTask(taskId: number): Promise<TaskSubmission[]>;
  getTaskSubmissionsByStudent(studentId: number): Promise<TaskSubmission[]>;
  createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission>;
  updateTaskSubmission(id: number, submission: Partial<InsertTaskSubmission>): Promise<TaskSubmission | undefined>;
  deleteTaskSubmission(id: number): Promise<boolean>;

  // Reportes y Analítica
  getAcademicPerformanceReport(grupoId?: number, periodo?: string): Promise<AcademicPerformanceReport[]>;
  getAttendanceReport(grupoId?: number, mes?: string): Promise<AttendanceReport[]>;
  getFinancialReport(grupoId?: number, estado?: string): Promise<FinancialReport>;
  getInstitutionSummary(): Promise<{
    promedioGeneral: number;
    mejoresGrupos: { grupoId: number, grupoNombre: string, promedio: number }[];
    asistenciaMedia: number;
    recuperacionFinanciera: number;
  }>;

  // === SISTEMA DE COMUNICACIÓN ESCOLAR ===
  
  // Mensajes
  getMessages(): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesBySender(senderId: string): Promise<Message[]>;
  getMessagesByReceiver(receiverId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, isRead: boolean, isArchived: boolean): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
  
  // Anuncios Escolares
  getSchoolAnnouncements(): Promise<SchoolAnnouncement[]>;
  getSchoolAnnouncement(id: string): Promise<SchoolAnnouncement | undefined>;
  getSchoolAnnouncementsByRole(role: string): Promise<SchoolAnnouncement[]>;
  createSchoolAnnouncement(announcement: InsertSchoolAnnouncement): Promise<SchoolAnnouncement>;
  updateSchoolAnnouncement(id: string, announcement: Partial<InsertSchoolAnnouncement>): Promise<SchoolAnnouncement | undefined>;
  deleteSchoolAnnouncement(id: string): Promise<boolean>;
  
  // Notificaciones
  getNotifications(): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  
  // Eventos de Calendario
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  getCalendarEventsByDateRange(startDate: Date, endDate?: Date): Promise<CalendarEvent[]>;
  getCalendarEventsByCreator(creatorId: string): Promise<CalendarEvent[]>;
  createCalendarEvent(calendarEvent: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, calendarEvent: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: string): Promise<boolean>;
  
  // Eventos de Agenda
  getEventosAgenda(): Promise<EventoAgenda[]>;
  getEventoAgenda(id: number): Promise<EventoAgenda | undefined>;
  getEventosAgendaByStudent(estudianteId: number): Promise<EventoAgenda[]>;
  getEventosAgendaByDateRange(estudianteId: number, startDate: Date, endDate: Date): Promise<EventoAgenda[]>;
  getEventosAgendaByWeek(estudianteId: number, weekStart: Date): Promise<EventoAgenda[]>;
  createEventoAgenda(evento: InsertEventoAgenda): Promise<EventoAgenda>;
  updateEventoAgenda(id: number, evento: Partial<InsertEventoAgenda>): Promise<EventoAgenda | undefined>;
  deleteEventoAgenda(id: number): Promise<boolean>;
  
  // Observaciones
  getObservaciones(): Promise<Observacion[]>;
  getObservacionById(id: number): Promise<Observacion | undefined>;
  getObservacionesByProfesor(profesorId: number): Promise<Observacion[]>;
  getObservacionesByAlumno(alumnoId: number): Promise<Observacion[]>;
  getObservacionesByGrupo(grupoId: number): Promise<Observacion[]>;
  
  // Asistente IA para profesores
  saveTeacherRecommendations(data: InsertTeacherRecommendation): Promise<TeacherRecommendation>;
  getTeacherRecommendations(filter: {profesorId: number, grupoId?: number}): Promise<TeacherRecommendation[]>;
  saveRecoveryPlan(data: InsertRecoveryPlan): Promise<RecoveryPlan>;
  getRecoveryPlans(filter: {profesorId: number, grupoId?: number}): Promise<RecoveryPlan[]>;
  
  // Vinculaciones Responsables-Alumnos
  getVinculacionesByResponsable(usuarioId: string): Promise<{
    id_alumno: number;
    nombre: string;
    nivel: string;
    matricula: string;
  }[]>;
  getVinculacionesByAlumno(alumnoId: number): Promise<AlumnoResponsable[]>;
  createVinculacion(vinculacion: InsertAlumnoResponsable): Promise<AlumnoResponsable>;
  deleteVinculacion(idAlumno: number, idUsuario: string): Promise<boolean>;
  createObservacion(observacion: InsertObservacion): Promise<Observacion>;
  updateObservacion(id: number, observacion: Partial<InsertObservacion>): Promise<Observacion | undefined>;
  deleteObservacion(id: number): Promise<boolean>;
  
  // Sesión
  sessionStore: session.Store;
  
  // Resúmenes Financieros IA
  getAIFinancialSummaries(): Promise<AIFinancialSummary[]>;
  getAIFinancialSummariesByUser(userId: string): Promise<AIFinancialSummary[]>;
  getAIFinancialSummariesByMonth(month: number, year: number): Promise<AIFinancialSummary[]>;
  getAIFinancialSummary(id: number): Promise<AIFinancialSummary | undefined>;
  createAIFinancialSummary(summary: InsertAIFinancialSummary): Promise<AIFinancialSummary>;
  deleteAIFinancialSummary(id: number): Promise<boolean>;
  
  // Pagos Pendientes SPEI
  getPendingPayments(): Promise<PendingPayment[]>;
  getPendingPayment(id: number): Promise<PendingPayment | undefined>;
  getPendingPaymentsByStudent(studentId: number): Promise<PendingPayment[]>;
  getPendingPaymentByReference(reference: string): Promise<PendingPayment | undefined>;
  getExpiredPendingPayments(): Promise<PendingPayment[]>;
  createPendingPayment(payment: InsertPendingPayment): Promise<PendingPayment>;
  updatePendingPayment(id: number, payment: Partial<InsertPendingPayment>): Promise<PendingPayment | undefined>;
  deletePendingPayment(id: number): Promise<boolean>;
  
  // Vinculaciones Alumnos-Responsables
  getVinculacionesByResponsable(usuarioId: string): Promise<{
    id_alumno: number;
    nombre: string;
    nivel: string;
    matricula: string;
  }[]>;
  createVinculacion(vinculacion: InsertAlumnoResponsable): Promise<AlumnoResponsable>;
  deleteVinculacion(idAlumno: number, idUsuario: string): Promise<boolean>;

  // Recomendaciones IA (caching)
  getIaRecommendation(studentId: number): Promise<IaRecommendation | undefined>;
  createIaRecommendation(recommendation: InsertIaRecommendation): Promise<IaRecommendation>;
}

export class MemStorage implements IStorage {
  private students: Map<number, Student>;
  private teachers: Map<number, Teacher>;
  private groups: Map<number, Group>;
  private subjects: Map<number, Subject>;
  private subjectAssignments: Map<number, SubjectAssignment>;
  private groupTeachers: Map<number, GroupTeacher>;
  private grades: Map<number, Grade>;
  private gradeHistory: Map<number, GradeHistory>;
  private attendance: Map<number, Attendance>;
  private paymentConcepts: Map<number, PaymentConcept>;
  private debts: Map<number, Debt>;
  private payments: Map<number, Payment>;
  private users: Map<string, User>;
  private parentStudentRelations: Map<string, ParentStudentRelation>;
  private alumnosResponsables: Map<string, AlumnoResponsable>;
  private avisos: Map<string, Aviso>;
  private evaluationCriteria: Map<number, EvaluationCriteria>;
  private criteriaAssignments: Map<number, CriteriaAssignment>;
  private criteriaGrades: Map<number, CriteriaGrade>;
  private tasks: Map<number, Task>;
  private taskSubmissions: Map<number, TaskSubmission>;
  
  // Módulo de Comunicación
  private messages: Map<string, Message>;
  private schoolAnnouncements: Map<string, SchoolAnnouncement>;
  private notifications: Map<string, Notification>;
  private calendarEvents: Map<string, CalendarEvent>;
  private eventosAgenda: Map<number, EventoAgenda>;
  private observaciones: Map<number, Observacion>;
  
  // Horarios
  private schedules: Map<number, Schedule>;
  
  // Logs de correos
  private emailLogs: Map<number, EmailLog>;
  
  // Asistente educativo IA
  private teacherRecommendations: Map<number, TeacherRecommendation>;
  private recoveryPlans: Map<number, RecoveryPlan>;
  
  private currentStudentId: number;
  private currentTeacherId: number;
  private currentGroupId: number;
  private currentSubjectId: number;
  private currentSubjectAssignmentId: number;
  private currentGradeId: number;
  private currentAttendanceId: number;
  private currentPaymentConceptId: number;
  private currentDebtId: number;
  private currentPaymentId: number;
  private currentEvaluationCriteriaId: number;
  private currentCriteriaAssignmentId: number;
  private currentCriteriaGradeId: number;
  private currentTaskId: number;
  private currentTaskSubmissionId: number;
  private currentGradeHistoryId: number;
  private currentGroupTeacherId: number;
  private currentScheduleId: number;
  
  // Contadores para IDs del Módulo de Comunicación
  private messageCounter: number = 1;
  private schoolAnnouncementCounter: number = 1;
  private notificationCounter: number = 1;
  private calendarEventCounter: number = 1;
  private emailLogCounter: number = 1;
  private eventoAgendaCounter: number = 1;
  private observacionCounter: number = 1;
  
  // Contadores para IDs del Asistente IA
  private teacherRecommendationCounter: number = 1;
  private recoveryPlanCounter: number = 1;
  
  // Almacén de sesiones en memoria
  readonly sessionStore: session.Store;

  constructor() {
    this.students = new Map();
    this.teachers = new Map();
    this.groups = new Map();
    this.subjects = new Map();
    this.subjectAssignments = new Map();
    this.groupTeachers = new Map();
    this.grades = new Map();
    this.attendance = new Map();
    this.paymentConcepts = new Map();
    this.debts = new Map();
    this.payments = new Map();
    this.users = new Map();
    this.parentStudentRelations = new Map();
    this.alumnosResponsables = new Map();
    this.avisos = new Map();
    this.evaluationCriteria = new Map();
    this.criteriaAssignments = new Map();
    this.criteriaGrades = new Map();
    this.tasks = new Map();
    this.taskSubmissions = new Map();
    this.emailLogs = new Map();
    
    // Inicializar mapas para el módulo de comunicación
    this.messages = new Map();
    this.schoolAnnouncements = new Map();
    this.notifications = new Map();
    this.calendarEvents = new Map();
    this.eventosAgenda = new Map();
    this.observaciones = new Map();
    this.gradeHistory = new Map();
    this.schedules = new Map();
    
    // Inicializar mapas para el asistente educativo IA
    this.teacherRecommendations = new Map();
    this.recoveryPlans = new Map();
    
    this.currentStudentId = 1;
    this.currentTeacherId = 1;
    this.currentGroupId = 1;
    this.currentSubjectId = 1;
    this.currentSubjectAssignmentId = 1;
    this.currentGradeId = 1;
    this.currentAttendanceId = 1;
    this.currentPaymentConceptId = 1;
    this.currentDebtId = 1;
    this.currentPaymentId = 1;
    this.currentEvaluationCriteriaId = 1;
    this.currentCriteriaAssignmentId = 1;
    this.currentCriteriaGradeId = 1;
    this.currentTaskId = 1;
    this.currentTaskSubmissionId = 1;
    this.currentGradeHistoryId = 1;
    this.currentGroupTeacherId = 1;
    this.currentScheduleId = 1;
    
    // Crear un almacén de sesión en memoria
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Eliminar sesiones expiradas cada 24h
    });

    // Inicializar con algunos datos de ejemplo
    this._initializeData();
  }
  
  // Función auxiliar para llamar a la inicialización de datos asíncrona
  private _initializeData() {
    // Llamamos al método asíncrono y capturamos cualquier error
    this.initializeData().catch(error => {
      console.error("Error al inicializar datos:", error);
    });
  }

  private async initializeData() {
    // Grupos de ejemplo
    const grupos = [
      { nombre: "1°A Preescolar", nivel: "Preescolar", cicloEscolar: "2023-2024" },
      { nombre: "2°B Preescolar", nivel: "Preescolar", cicloEscolar: "2023-2024" },
      { nombre: "3°A Primaria", nivel: "Primaria", cicloEscolar: "2023-2024" },
      { nombre: "3°B Primaria", nivel: "Primaria", cicloEscolar: "2023-2024" }
    ];
    
    grupos.forEach(grupo => this.createGroup(grupo));
    
    // Materias de ejemplo
    const materias = [
      { nombre: "Matemáticas", nivel: "Primaria" },
      { nombre: "Español", nivel: "Primaria" },
      { nombre: "Ciencias Naturales", nivel: "Primaria" },
      { nombre: "Educación Física", nivel: "Preescolar" }
    ];
    
    materias.forEach(materia => this.createSubject(materia));
    
    // Profesores de ejemplo
    const profesores = [
      { nombreCompleto: "María Rodríguez", correo: "maria@edumex.com", materiaPrincipal: "Matemáticas" },
      { nombreCompleto: "Juan López", correo: "juan@edumex.com", materiaPrincipal: "Español" }
    ];
    
    profesores.forEach(profesor => this.createTeacher(profesor));
    
    // Usuarios de ejemplo
    const usuarios = [
      { 
        nombreCompleto: "Fernando Cebreros", 
        correo: "fernando.cebreros@altum.edu.mx", 
        password: "admin123", 
        rol: "admin" as const,
        activo: true
      },
      { 
        nombreCompleto: "Admin Sistema", 
        correo: "admin@edumex.com", 
        password: "admin123", 
        rol: "admin" as const,
        activo: true
      },
      { 
        nombreCompleto: "Coordinador Académico", 
        correo: "coordinador@edumex.com", 
        password: "coord123", 
        rol: "coordinador" as const,
        activo: true
      }
    ];
    
    usuarios.forEach(usuario => this.createUser(usuario));

    // Criterios de evaluación de ejemplo
    const criterios = [
      { 
        nombre: "Examen escrito", 
        descripcion: "Evaluación escrita de conocimientos", 
        porcentaje: 30, 
        nivel: "Primaria",
        cicloEscolar: "2023-2024" 
      },
      { 
        nombre: "Tareas y proyectos", 
        descripcion: "Entrega de tareas y proyectos asignados", 
        porcentaje: 30, 
        nivel: "Primaria",
        cicloEscolar: "2023-2024" 
      },
      { 
        nombre: "Participación en clase", 
        descripcion: "Evaluación de la participación activa del alumno", 
        porcentaje: 20, 
        nivel: "Primaria",
        cicloEscolar: "2023-2024" 
      },
      { 
        nombre: "Asistencia", 
        descripcion: "Cumplimiento con la asistencia a clases", 
        porcentaje: 10, 
        nivel: "Primaria",
        cicloEscolar: "2023-2024" 
      },
      { 
        nombre: "Cuaderno", 
        descripcion: "Orden y limpieza del cuaderno", 
        porcentaje: 10, 
        nivel: "Primaria",
        cicloEscolar: "2023-2024" 
      },
      { 
        nombre: "Actividades en clase", 
        descripcion: "Evaluación de actividades realizadas en el aula", 
        porcentaje: 40, 
        nivel: "Preescolar",
        cicloEscolar: "2023-2024" 
      },
      { 
        nombre: "Desarrollo motriz", 
        descripcion: "Evaluación del desarrollo de habilidades motrices", 
        porcentaje: 30, 
        nivel: "Preescolar",
        cicloEscolar: "2023-2024" 
      },
      { 
        nombre: "Desarrollo social", 
        descripcion: "Evaluación de habilidades sociales y cooperación", 
        porcentaje: 30, 
        nivel: "Preescolar",
        cicloEscolar: "2023-2024" 
      }
    ];
    
    // Creamos los criterios y guardamos referencia a sus IDs
    const criterioIds: {[key: string]: number} = {};
    for (const criterio of criterios) {
      const createdCriterion = await this.createEvaluationCriterion(criterio);
      criterioIds[criterio.nombre] = createdCriterion.id;
    }
    
    // Inicializamos algunas asignaciones de criterios a grupos y materias
    if (this.groups.size > 0 && this.subjects.size > 0) {
      const gruposPrimaria = Array.from(this.groups.values()).filter(g => g.nivel === "Primaria");
      const gruposPreescolar = Array.from(this.groups.values()).filter(g => g.nivel === "Preescolar");
      
      const materiasPrimaria = Array.from(this.subjects.values()).filter(s => s.nivel === "Primaria");
      const materiasPreescolar = Array.from(this.subjects.values()).filter(s => s.nivel === "Preescolar");
      
      // Asignaciones para primaria
      for (const grupo of gruposPrimaria) {
        for (const materia of materiasPrimaria) {
          await this.createCriteriaAssignment({
            grupoId: grupo.id,
            materiaId: materia.id,
            criterioId: criterioIds["Examen escrito"],
            activo: true
          });
          
          await this.createCriteriaAssignment({
            grupoId: grupo.id,
            materiaId: materia.id,
            criterioId: criterioIds["Tareas y proyectos"],
            activo: true
          });
          
          await this.createCriteriaAssignment({
            grupoId: grupo.id,
            materiaId: materia.id,
            criterioId: criterioIds["Participación en clase"],
            activo: true
          });
        }
      }
      
      // Asignaciones para preescolar
      for (const grupo of gruposPreescolar) {
        for (const materia of materiasPreescolar) {
          await this.createCriteriaAssignment({
            grupoId: grupo.id,
            materiaId: materia.id,
            criterioId: criterioIds["Actividades en clase"],
            activo: true
          });
          
          await this.createCriteriaAssignment({
            grupoId: grupo.id,
            materiaId: materia.id,
            criterioId: criterioIds["Desarrollo motriz"],
            activo: true
          });
          
          await this.createCriteriaAssignment({
            grupoId: grupo.id,
            materiaId: materia.id,
            criterioId: criterioIds["Desarrollo social"],
            activo: true
          });
        }
      }
      
      // Creamos algunos estudiantes de ejemplo si no hay ninguno
      if (this.students.size === 0) {
        const estudiantes = [
          {
            nombreCompleto: "Ana García López",
            curp: "GALA050623MDFPNA09",
            fechaNacimiento: "2005-06-23",
            genero: "Femenino",
            nivel: "Primaria",
            grupoId: gruposPrimaria[0]?.id,
            estatus: "Activo"
          },
          {
            nombreCompleto: "Carlos Martínez Ruiz",
            curp: "MARC060815HDFRRL02",
            fechaNacimiento: "2006-08-15",
            genero: "Masculino",
            nivel: "Primaria",
            grupoId: gruposPrimaria[0]?.id,
            estatus: "Activo"
          },
          {
            nombreCompleto: "Sofía Hernández Flores",
            curp: "HEFS070212MDFRLF03",
            fechaNacimiento: "2007-02-12",
            genero: "Femenino",
            nivel: "Primaria",
            grupoId: gruposPrimaria[0]?.id,
            estatus: "Activo"
          }
        ];
        
        for (const estudiante of estudiantes) {
          await this.createStudent(estudiante);
        }
      }
      
      // Agregaremos algunas calificaciones por criterio de ejemplo
      const estudiantes = Array.from(this.students.values());
      if (estudiantes.length > 0) {
        const asignaciones = Array.from(this.criteriaAssignments.values());
        
        for (const estudiante of estudiantes) {
          for (const asignacion of asignaciones) {
            if (estudiante.nivel === "Primaria" && gruposPrimaria.some(g => g.id === asignacion.grupoId)) {
              // Solo creamos calificaciones para asignaciones que correspondan al nivel del estudiante
              if (asignacion.grupoId === estudiante.grupoId) {
                // Calificación aleatoria entre 7 y 10
                const valor = Math.floor(Math.random() * 31) + 70;
                
                await this.createCriteriaGrade({
                  alumnoId: estudiante.id,
                  materiaId: asignacion.materiaId,
                  criterioId: asignacion.criterioId,
                  valor: valor.toString(),
                  periodo: "2023-2024-1",
                  observaciones: valor >= 90 ? "Excelente desempeño" : 
                                valor >= 80 ? "Buen desempeño" : 
                                "Necesita mejorar"
                });
              }
            }
          }
        }
      }
    }
  }

  // Implementación de los métodos para estudiantes
  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.currentStudentId++;
    const newStudent: Student = { ...student, id };
    this.students.set(id, newStudent);
    return newStudent;
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined> {
    const existingStudent = this.students.get(id);
    if (!existingStudent) return undefined;
    
    const updatedStudent = { ...existingStudent, ...student };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    return this.students.delete(id);
  }

  // Implementación de los métodos para profesores
  async getTeachers(): Promise<Teacher[]> {
    return Array.from(this.teachers.values());
  }

  async getTeacher(id: number): Promise<Teacher | undefined> {
    return this.teachers.get(id);
  }

  async createTeacher(teacher: InsertTeacher): Promise<Teacher> {
    const id = this.currentTeacherId++;
    const newTeacher: Teacher = { ...teacher, id };
    this.teachers.set(id, newTeacher);
    return newTeacher;
  }

  async updateTeacher(id: number, teacher: Partial<InsertTeacher>): Promise<Teacher | undefined> {
    const existingTeacher = this.teachers.get(id);
    if (!existingTeacher) return undefined;
    
    const updatedTeacher = { ...existingTeacher, ...teacher };
    this.teachers.set(id, updatedTeacher);
    return updatedTeacher;
  }

  async deleteTeacher(id: number): Promise<boolean> {
    return this.teachers.delete(id);
  }
  
  // Implementación de los métodos para asignaciones de profesores a grupos
  
  async getGroupTeachers(): Promise<GroupTeacher[]> {
    return Array.from(this.groupTeachers.values());
  }
  
  async getGroupTeachersByGroup(groupId: number): Promise<GroupTeacher[]> {
    return Array.from(this.groupTeachers.values()).filter(
      assignment => assignment.groupId === groupId
    );
  }
  
  async getGroupsByTeacher(teacherId: number): Promise<Group[]> {
    // Obtener todas las asignaciones para este profesor
    const assignments = Array.from(this.groupTeachers.values()).filter(
      assignment => assignment.teacherId === teacherId
    );
    
    // Obtener los IDs de los grupos asignados
    const groupIds = assignments.map(assignment => assignment.groupId);
    
    // Si no hay asignaciones, devolver un array vacío
    if (groupIds.length === 0) {
      return [];
    }
    
    // Obtener los detalles de cada grupo
    return Array.from(this.groups.values()).filter(
      group => groupIds.includes(group.id)
    );
  }
  
  async getTeachersByGroup(groupId: number): Promise<Teacher[]> {
    // Obtener todas las asignaciones para este grupo
    const assignments = Array.from(this.groupTeachers.values()).filter(
      assignment => assignment.groupId === groupId
    );
    
    // Obtener los IDs de los profesores asignados
    const teacherIds = assignments.map(assignment => assignment.teacherId);
    
    // Si no hay asignaciones, devolver un array vacío
    if (teacherIds.length === 0) {
      return [];
    }
    
    // Obtener los detalles de cada profesor
    return Array.from(this.teachers.values()).filter(
      teacher => teacherIds.includes(teacher.id)
    );
  }
  
  async assignTeachersToGroup(groupId: number, teacherIds: number[]): Promise<boolean> {
    try {
      // Eliminar todas las asignaciones existentes para este grupo
      Array.from(this.groupTeachers.values())
        .filter(assignment => assignment.groupId === groupId)
        .forEach(assignment => this.groupTeachers.delete(assignment.id));
      
      // Si no hay profesores para asignar, terminamos
      if (teacherIds.length === 0) {
        return true;
      }
      
      // Crear nuevas asignaciones
      for (const teacherId of teacherIds) {
        const id = this.currentGroupTeacherId++;
        const assignment: GroupTeacher = {
          id,
          groupId,
          teacherId
        };
        this.groupTeachers.set(id, assignment);
      }
      
      return true;
    } catch (error) {
      console.error(`Error al asignar profesores al grupo ${groupId}:`, error);
      return false;
    }
  }
  
  async removeTeacherFromGroup(groupId: number, teacherId: number): Promise<boolean> {
    try {
      // Buscar la asignación específica
      const assignment = Array.from(this.groupTeachers.values()).find(
        a => a.groupId === groupId && a.teacherId === teacherId
      );
      
      // Si no existe, retornar falso
      if (!assignment) {
        return false;
      }
      
      // Eliminar la asignación
      return this.groupTeachers.delete(assignment.id);
    } catch (error) {
      console.error(`Error al eliminar al profesor ${teacherId} del grupo ${groupId}:`, error);
      return false;
    }
  }

  // Implementación de los métodos para horarios
  async getSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async getSchedulesByGroup(groupId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(schedule => schedule.grupoId === groupId);
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const id = this.currentScheduleId++;
    const now = new Date();
    const newSchedule: Schedule = { 
      ...schedule, 
      id, 
      createdAt: now 
    };
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }

  async updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const existingSchedule = this.schedules.get(id);
    if (!existingSchedule) return undefined;
    
    const updatedSchedule = { ...existingSchedule, ...schedule };
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteSchedule(id: number): Promise<boolean> {
    return this.schedules.delete(id);
  }

  async getScheduleDetails(): Promise<Array<{
    id: number;
    grupoId: number;
    grupoNombre: string;
    materiaId: number;
    materiaNombre: string;
    profesorId: number | null;
    profesorNombre: string | null;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    modo: string;
    estatus: string;
  }>> {
    const result: Array<{
      id: number;
      grupoId: number;
      grupoNombre: string;
      materiaId: number;
      materiaNombre: string;
      profesorId: number | null;
      profesorNombre: string | null;
      diaSemana: string;
      horaInicio: string;
      horaFin: string;
      modo: string;
      estatus: string;
    }> = [];

    for (const schedule of this.schedules.values()) {
      const grupo = this.groups.get(schedule.grupoId);
      const materia = this.subjects.get(schedule.materiaId);
      const profesor = schedule.profesorId ? this.teachers.get(schedule.profesorId) : null;

      if (grupo && materia) {
        result.push({
          id: schedule.id,
          grupoId: schedule.grupoId,
          grupoNombre: grupo.nombre,
          materiaId: schedule.materiaId,
          materiaNombre: materia.nombre,
          profesorId: schedule.profesorId,
          profesorNombre: profesor ? profesor.nombreCompleto : null,
          diaSemana: schedule.diaSemana,
          horaInicio: schedule.horaInicio,
          horaFin: schedule.horaFin,
          modo: schedule.modo,
          estatus: schedule.estatus
        });
      }
    }

    return result;
  }

  // Implementación de los métodos para grupos
  async getGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }

  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const id = this.currentGroupId++;
    const newGroup: Group = { ...group, id };
    this.groups.set(id, newGroup);
    return newGroup;
  }

  async updateGroup(id: number, group: Partial<InsertGroup>): Promise<Group | undefined> {
    const existingGroup = this.groups.get(id);
    if (!existingGroup) return undefined;
    
    const updatedGroup = { ...existingGroup, ...group };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteGroup(id: number): Promise<boolean> {
    return this.groups.delete(id);
  }

  // Implementación de los métodos para materias
  async getSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const id = this.currentSubjectId++;
    const newSubject: Subject = { ...subject, id };
    this.subjects.set(id, newSubject);
    return newSubject;
  }

  async updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject | undefined> {
    const existingSubject = this.subjects.get(id);
    if (!existingSubject) return undefined;
    
    const updatedSubject = { ...existingSubject, ...subject };
    this.subjects.set(id, updatedSubject);
    return updatedSubject;
  }

  async deleteSubject(id: number): Promise<boolean> {
    return this.subjects.delete(id);
  }

  // Implementación de los métodos para asignaciones de materias
  async getSubjectAssignments(): Promise<SubjectAssignment[]> {
    return Array.from(this.subjectAssignments.values());
  }
  
  async getSubjectAssignmentsByTeacher(teacherId: string): Promise<SubjectAssignment[]> {
    return Array.from(this.subjectAssignments.values()).filter(
      assignment => assignment.profesorId === teacherId
    );
  }
  
  async getSubjectAssignmentsByTeacherId(teacherId: number): Promise<SubjectAssignment[]> {
    return Array.from(this.subjectAssignments.values()).filter(
      assignment => assignment.profesorId === teacherId
    );
  }
  
  async getSubjectAssignmentsByGroup(groupId: number): Promise<SubjectAssignment[]> {
    return Array.from(this.subjectAssignments.values()).filter(
      assignment => assignment.grupoId === groupId
    );
  }

  async getSubjectAssignment(id: number): Promise<SubjectAssignment | undefined> {
    return this.subjectAssignments.get(id);
  }

  async createSubjectAssignment(assignment: InsertSubjectAssignment): Promise<SubjectAssignment> {
    const id = this.currentSubjectAssignmentId++;
    const newAssignment: SubjectAssignment = { ...assignment, id };
    this.subjectAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async updateSubjectAssignment(
    id: number, 
    assignment: Partial<InsertSubjectAssignment>
  ): Promise<SubjectAssignment | undefined> {
    const existingAssignment = this.subjectAssignments.get(id);
    if (!existingAssignment) return undefined;
    
    const updatedAssignment = { ...existingAssignment, ...assignment };
    this.subjectAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deleteSubjectAssignment(id: number): Promise<boolean> {
    console.log(`[STORAGE] Intentando eliminar asignación de materia con ID ${id}`);
    const assignmentBeforeDeletion = this.subjectAssignments.get(id);
    console.log(`[STORAGE] Asignación a eliminar:`, assignmentBeforeDeletion);
    
    const result = this.subjectAssignments.delete(id);
    console.log(`[STORAGE] Resultado de eliminación: ${result ? "Exitoso" : "Fallido"}`);
    
    // Verificar que la eliminación funcionó correctamente
    const assignmentAfterDeletion = this.subjectAssignments.get(id);
    console.log(`[STORAGE] Verificación post-eliminación:`, 
      assignmentAfterDeletion ? "❌ La asignación sigue existiendo" : "✅ Asignación eliminada correctamente");
    
    return result;
  }

  // Implementación de los métodos para calificaciones
  async getGrades(): Promise<Grade[]> {
    return Array.from(this.grades.values());
  }

  async getGrade(id: number): Promise<Grade | undefined> {
    return this.grades.get(id);
  }

  async getGradesByStudent(studentId: number): Promise<Grade[]> {
    return Array.from(this.grades.values()).filter(
      grade => grade.alumnoId === studentId
    );
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    const id = this.currentGradeId++;
    const newGrade: Grade = { ...grade, id };
    this.grades.set(id, newGrade);
    return newGrade;
  }

  async createGradeHistory(historyData: InsertGradeHistory): Promise<GradeHistory> {
    const id = this.currentGradeHistoryId++;
    const newHistory: GradeHistory = { 
      ...historyData, 
      id, 
      fechaModificacion: new Date() 
    };
    this.gradeHistory.set(id, newHistory);
    return newHistory;
  }
  
  async getGradeHistory(gradeId: number): Promise<GradeHistory[]> {
    return Array.from(this.gradeHistory.values())
      .filter(history => history.calificacionId === gradeId)
      .sort((a, b) => {
        // Ordenar por fecha de modificación (más reciente primero)
        const dateA = new Date(a.fechaModificacion).getTime();
        const dateB = new Date(b.fechaModificacion).getTime();
        return dateB - dateA;
      });
  }

  async updateGrade(id: number, grade: Partial<InsertGrade>): Promise<Grade | undefined> {
    const existingGrade = this.grades.get(id);
    if (!existingGrade) return undefined;
    
    // Si hay cambios en el valor o el comentario, registrar en el historial
    if (grade.valor !== undefined || grade.comentario !== undefined) {
      // Buscar al usuario por su token / sesión activa
      const valorAnterior = existingGrade.valor ? parseFloat(existingGrade.valor) : null;
      const valorNuevo = grade.valor !== undefined ? 
                        (typeof grade.valor === 'string' ? parseFloat(grade.valor) : grade.valor) : 
                        valorAnterior;
      
      // Suponemos que el ID de usuario viene en la solicitud o usamos un valor predeterminado
      const usuarioId = (grade as any).usuarioId || "00000000-0000-0000-0000-000000000000";
      
      this.createGradeHistory({
        calificacionId: id,
        valorAnterior,
        valorNuevo,
        comentarioAnterior: existingGrade.comentario,
        comentarioNuevo: grade.comentario !== undefined ? grade.comentario : existingGrade.comentario,
        usuarioId
      });
    }
    
    const updatedGrade = { ...existingGrade, ...grade };
    this.grades.set(id, updatedGrade);
    return updatedGrade;
  }

  async updateGradeBatch(gradesData: (Grade | InsertGrade)[]): Promise<Grade[]> {
    const updatedGrades: Grade[] = [];
    
    for (const gradeData of gradesData) {
      // Si tiene ID, es una actualización
      if ('id' in gradeData) {
        const id = gradeData.id;
        const existingGrade = this.grades.get(id);
        
        if (existingGrade) {
          // Registrar en historial si hay cambios relevantes
          if (gradeData.valor !== existingGrade.valor || 
              gradeData.comentario !== existingGrade.comentario) {
            
            const valorAnterior = existingGrade.valor ? parseFloat(existingGrade.valor) : null;
            const valorNuevo = gradeData.valor !== undefined ? 
                             (typeof gradeData.valor === 'string' ? parseFloat(gradeData.valor) : gradeData.valor) : 
                             valorAnterior;
            
            // Suponemos que el ID de usuario viene en la solicitud o usamos un valor predeterminado
            const usuarioId = (gradeData as any).usuarioId || "00000000-0000-0000-0000-000000000000";
            
            this.createGradeHistory({
              calificacionId: id,
              valorAnterior,
              valorNuevo,
              comentarioAnterior: existingGrade.comentario,
              comentarioNuevo: gradeData.comentario || null,
              usuarioId
            });
          }
          
          // Actualizar calificación
          const updatedGrade = { ...existingGrade, ...gradeData };
          this.grades.set(id, updatedGrade);
          updatedGrades.push(updatedGrade);
        }
      } else {
        // Si no tiene ID, es una nueva calificación
        const newGrade = await this.createGrade(gradeData);
        updatedGrades.push(newGrade);
      }
    }
    
    return updatedGrades;
  }

  async deleteGrade(id: number): Promise<boolean> {
    return this.grades.delete(id);
  }

  // Implementación de los métodos para asistencias
  async getAttendance(): Promise<Attendance[]> {
    return Array.from(this.attendance.values());
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      att => {
        const attDate = new Date(att.fecha);
        return attDate.getFullYear() === date.getFullYear() &&
               attDate.getMonth() === date.getMonth() &&
               attDate.getDate() === date.getDate();
      }
    );
  }

  async getAttendanceByStudent(studentId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      att => att.alumnoId === studentId
    );
  }

  // Nuevo método para obtener asistencias por grupo
  async getAttendancesByGroup(groupId: number): Promise<Attendance[]> {
    // Primero obtenemos todos los estudiantes del grupo
    const students = await this.getStudentsByGroup(groupId);
    const studentIds = students.map(student => student.id);
    
    // Luego filtramos las asistencias por esos IDs de estudiantes
    return Array.from(this.attendance.values()).filter(
      att => studentIds.includes(att.alumnoId)
    );
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const id = this.currentAttendanceId++;
    const newAttendance: Attendance = { ...attendance, id };
    this.attendance.set(id, newAttendance);
    return newAttendance;
  }

  async updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const existingAttendance = this.attendance.get(id);
    if (!existingAttendance) return undefined;
    
    const updatedAttendance = { ...existingAttendance, ...attendance };
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
  }

  async deleteAttendance(id: number): Promise<boolean> {
    return this.attendance.delete(id);
  }

  // Implementación de los métodos para conceptos de pago
  async getPaymentConcepts(): Promise<PaymentConcept[]> {
    return Array.from(this.paymentConcepts.values());
  }

  async getPaymentConcept(id: number): Promise<PaymentConcept | undefined> {
    return this.paymentConcepts.get(id);
  }

  async createPaymentConcept(concept: InsertPaymentConcept): Promise<PaymentConcept> {
    const id = this.currentPaymentConceptId++;
    const createdAt = new Date().toISOString();
    const newConcept: PaymentConcept = { ...concept, id, createdAt };
    this.paymentConcepts.set(id, newConcept);
    return newConcept;
  }

  async updatePaymentConcept(id: number, concept: Partial<InsertPaymentConcept>): Promise<PaymentConcept | undefined> {
    const existingConcept = this.paymentConcepts.get(id);
    if (!existingConcept) return undefined;
    
    const updatedConcept = { ...existingConcept, ...concept };
    this.paymentConcepts.set(id, updatedConcept);
    return updatedConcept;
  }

  async deletePaymentConcept(id: number): Promise<boolean> {
    return this.paymentConcepts.delete(id);
  }

  // Implementación de los métodos para adeudos
  async getDebts(): Promise<Debt[]> {
    return Array.from(this.debts.values());
  }

  async getDebt(id: number): Promise<Debt | undefined> {
    return this.debts.get(id);
  }

  async getDebtsByStudent(studentId: number): Promise<Debt[]> {
    return Array.from(this.debts.values()).filter(
      debt => debt.alumnoId === studentId
    );
  }

  async createDebt(debt: InsertDebt): Promise<Debt> {
    const id = this.currentDebtId++;
    const createdAt = new Date().toISOString();
    const newDebt: Debt = { 
      ...debt, 
      id, 
      createdAt,
      pagado: false 
    };
    this.debts.set(id, newDebt);
    return newDebt;
  }

  async updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt | undefined> {
    const existingDebt = this.debts.get(id);
    if (!existingDebt) return undefined;
    
    const updatedDebt = { ...existingDebt, ...debt };
    this.debts.set(id, updatedDebt);
    return updatedDebt;
  }

  async deleteDebt(id: number): Promise<boolean> {
    return this.debts.delete(id);
  }

  // Implementación de los métodos para pagos
  async getPayments(): Promise<Payment[]> {
    try {
      console.log("[DEBUG] Iniciando consulta de pagos desde la base de datos");
      const result = await db.select({
        id: payments.id,
        alumnoId: payments.alumnoId,
        conceptoId: payments.conceptoId,
        adeudoId: payments.adeudoId,
        monto: payments.monto,
        fechaPago: payments.fechaPago,
        metodoPago: payments.metodoPago,
        referencia: payments.referencia,
        observaciones: payments.observaciones,
        pdfUrl: payments.pdfUrl,
        createdAt: payments.createdAt
      }).from(payments);
      
      console.log("[DEBUG] Resultado de la consulta de pagos:", result.length, "pagos encontrados");
      
      return result.map(payment => ({
        ...payment,
        // Asegurarnos que adeudoId siempre sea un número o null, nunca undefined
        adeudoId: payment.adeudoId || null
      }));
    } catch (error) {
      console.error("Error al obtener pagos:", error);
      if (error instanceof Error) {
        console.error("Mensaje de error:", error.message);
        console.error("Stack trace:", error.stack);
      }
      
      console.log("[DEBUG] Usando fallback a versión en memoria, hay", this.payments.size, "pagos");
      // Fallback a la versión en memoria si hay error
      return Array.from(this.payments.values());
    }
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByStudent(studentId: number): Promise<Payment[]> {
    try {
      console.log(`[DEBUG] Iniciando consulta de pagos para el estudiante ID: ${studentId}`);
      const result = await db.select({
        id: payments.id,
        alumnoId: payments.alumnoId,
        conceptoId: payments.conceptoId,
        adeudoId: payments.adeudoId,
        monto: payments.monto,
        fechaPago: payments.fechaPago,
        metodoPago: payments.metodoPago,
        referencia: payments.referencia,
        observaciones: payments.observaciones,
        pdfUrl: payments.pdfUrl,
        createdAt: payments.createdAt
      })
      .from(payments)
      .where(eq(payments.alumnoId, studentId));
      
      console.log(`[DEBUG] Encontrados ${result.length} pagos para el estudiante ID: ${studentId}`);
      
      return result.map(payment => ({
        ...payment,
        // Asegurarnos que adeudoId siempre sea un número o null, nunca undefined
        adeudoId: payment.adeudoId || null
      }));
    } catch (error) {
      console.error(`Error al obtener pagos para el estudiante ID: ${studentId}`, error);
      if (error instanceof Error) {
        console.error("Mensaje de error:", error.message);
      }
      
      // Fallback a la versión en memoria si hay error
      console.log(`[DEBUG] Usando fallback a versión en memoria para pagos del estudiante ${studentId}`);
      return Array.from(this.payments.values()).filter(
        payment => payment.alumnoId === studentId
      );
    }
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const createdAt = new Date().toISOString();
    const newPayment: Payment = { ...payment, id, createdAt };
    this.payments.set(id, newPayment);

    // Actualizar el estado del adeudo si está completamente pagado
    if (payment.adeudoId) {
      const debt = this.debts.get(payment.adeudoId);
      if (debt) {
        const totalPaid = await this.getTotalPaidForDebt(payment.adeudoId);
        
        // Obtener el monto del adeudo como número
        const debtAmount = typeof debt.montoTotal === 'string'
          ? parseFloat(debt.montoTotal)
          : Number(debt.montoTotal);
          
        // Actualizar el estado del adeudo
        if (totalPaid >= debtAmount) {
          // Actualizamos solo el estatus, no el campo "pagado" que no existe
          const updatedDebt = { 
            ...debt, 
            estatus: 'pagado' 
          };
          this.debts.set(debt.id, updatedDebt);
        } else if (totalPaid > 0) {
          // Pago parcial
          const updatedDebt = { 
            ...debt, 
            estatus: 'parcial' 
          };
          this.debts.set(debt.id, updatedDebt);
        }
      }
    }

    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) return undefined;
    
    const updatedPayment = { ...existingPayment, ...payment };
    this.payments.set(id, updatedPayment);

    // Recalcular el estado de pago del adeudo
    if (existingPayment.adeudoId) {
      const debt = this.debts.get(existingPayment.adeudoId);
      if (debt) {
        const totalPaid = await this.getTotalPaidForDebt(existingPayment.adeudoId);
        
        // Obtener el monto del adeudo como número
        const debtAmount = typeof debt.montoTotal === 'string'
          ? parseFloat(debt.montoTotal)
          : Number(debt.montoTotal);
          
        // Actualizar el estado del adeudo
        if (totalPaid >= debtAmount) {
          // Actualizamos solo el estatus, no el campo "pagado" que no existe
          const updatedDebt = { 
            ...debt, 
            estatus: 'pagado' 
          };
          this.debts.set(debt.id, updatedDebt);
        } else if (totalPaid > 0) {
          // Pago parcial
          const updatedDebt = { 
            ...debt, 
            estatus: 'parcial' 
          };
          this.debts.set(debt.id, updatedDebt);
        } else {
          // Sin pagos
          const updatedDebt = { 
            ...debt, 
            estatus: 'pendiente' 
          };
          this.debts.set(debt.id, updatedDebt);
        }
      }
    }

    return updatedPayment;
  }

  async deletePayment(id: number): Promise<boolean> {
    const payment = this.payments.get(id);
    if (!payment) return false;
    
    const result = this.payments.delete(id);
    
    // Recalcular el estado de pago del adeudo
    if (payment.adeudoId) {
      const debt = this.debts.get(payment.adeudoId);
      if (debt) {
        const totalPaid = await this.getTotalPaidForDebt(payment.adeudoId);
        
        // Obtener el monto del adeudo como número
        const debtAmount = typeof debt.montoTotal === 'string'
          ? parseFloat(debt.montoTotal)
          : Number(debt.montoTotal);
          
        // Actualizar el estado del adeudo
        if (totalPaid >= debtAmount) {
          // Actualizamos solo el estatus, no el campo "pagado" que no existe
          const updatedDebt = { 
            ...debt, 
            estatus: 'pagado' 
          };
          this.debts.set(debt.id, updatedDebt);
        } else if (totalPaid > 0) {
          // Pago parcial
          const updatedDebt = { 
            ...debt, 
            estatus: 'parcial' 
          };
          this.debts.set(debt.id, updatedDebt);
        } else {
          // Sin pagos
          const updatedDebt = { 
            ...debt, 
            estatus: 'pendiente' 
          };
          this.debts.set(debt.id, updatedDebt);
        }
      }
    }

    return result;
  }

  // Método auxiliar para calcular el total pagado para un adeudo
  private async getTotalPaidForDebt(debtId: number): Promise<number> {
    try {
      console.log(`[DEBUG] Calculando total pagado para el adeudo ID: ${debtId}`);
      // Intentar obtener pagos desde la base de datos
      const paymentsResult = await db.select({
        id: payments.id,
        monto: payments.monto,
        adeudoId: payments.adeudoId
      })
      .from(payments)
      .where(eq(payments.adeudoId, debtId));
      
      console.log(`[DEBUG] Encontrados ${paymentsResult.length} pagos para el adeudo ID: ${debtId}`);
      
      return paymentsResult.reduce((total, payment) => {
        // Convertir 'monto' a número si es string
        const amount = typeof payment.monto === 'string'
          ? parseFloat(payment.monto)
          : Number(payment.monto);
        return total + amount;
      }, 0);
    } catch (error) {
      console.error(`Error al obtener pagos para el adeudo ${debtId}:`, error);
      if (error instanceof Error) {
        console.error("Mensaje de error:", error.message);
      }
      
      // Fallback al método en memoria
      console.log(`[DEBUG] Usando fallback a versión en memoria para pagos del adeudo ${debtId}`);
      const paymentsForDebt = Array.from(this.payments.values()).filter(
        payment => payment.adeudoId === debtId
      );
      
      return paymentsForDebt.reduce((total, payment) => {
        // Convertir 'monto' a número si es string
        const amount = typeof payment.monto === 'string'
          ? parseFloat(payment.monto)
          : Number(payment.monto);
        return total + amount;
      }, 0);
    }
  }

  // Estado de cuenta
  async getAccountStatement(studentId: number): Promise<AccountStatement> {
    const student = await this.getStudent(studentId);
    if (!student) {
      throw new Error(`Estudiante con ID ${studentId} no encontrado`);
    }

    const debts = await this.getDebtsByStudent(studentId);
    const payments = await this.getPaymentsByStudent(studentId);
    
    // Calculamos el total de adeudos convirtiendo montoTotal a número
    const totalDebt = debts.reduce((sum, debt) => {
      const amount = typeof debt.montoTotal === 'string' 
        ? parseFloat(debt.montoTotal) 
        : Number(debt.montoTotal);
      return sum + amount;
    }, 0);
    
    // Calculamos el total pagado convirtiendo monto a número
    const totalPaid = payments.reduce((sum, payment) => {
      const amount = typeof payment.monto === 'string'
        ? parseFloat(payment.monto)
        : Number(payment.monto);
      return sum + amount;
    }, 0);
    
    const balance = totalDebt - totalPaid;

    return {
      student,
      debts,
      payments,
      totalDebt,
      totalPaid,
      balance
    };
  }

  // Implementación de los métodos para usuarios
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.correo === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newUser: User = { ...user, id, createdAt };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Implementación de los métodos para relaciones padre-alumno
  async getParentStudentRelations(): Promise<ParentStudentRelation[]> {
    return Array.from(this.parentStudentRelations.values());
  }

  async getParentStudentRelation(id: string): Promise<ParentStudentRelation | undefined> {
    return this.parentStudentRelations.get(id);
  }

  async getRelationsByParent(parentId: string): Promise<ParentStudentRelation[]> {
    return Array.from(this.parentStudentRelations.values()).filter(
      relation => relation.padreId === parentId
    );
  }

  async getRelationsByStudent(studentId: number): Promise<ParentStudentRelation[]> {
    return Array.from(this.parentStudentRelations.values()).filter(
      relation => relation.alumnoId === studentId
    );
  }

  async createParentStudentRelation(relation: InsertParentStudentRelation): Promise<ParentStudentRelation> {
    const id = crypto.randomUUID();
    const newRelation: ParentStudentRelation = { ...relation, id };
    this.parentStudentRelations.set(id, newRelation);
    return newRelation;
  }

  async deleteParentStudentRelation(id: string): Promise<boolean> {
    return this.parentStudentRelations.delete(id);
  }
  
  // Vinculaciones Responsables-Alumnos (nueva implementación)
  async getVinculacionesByResponsable(usuarioId: string): Promise<{
    id_alumno: number;
    nombre: string;
    nivel: string;
    matricula: string;
  }[]> {
    // Verificar si el usuario existe y tiene rol de padre
    const usuario = this.users.get(usuarioId);
    if (!usuario || (usuario.rol !== "padre" && usuario.rol !== "admin")) {
      return [];
    }
    
    // Obtener todas las vinculaciones para este usuario
    console.log(`Buscando vinculaciones para usuario ${usuarioId}, total de vinculaciones: ${this.alumnosResponsables.size}`);
    
    const vinculaciones = Array.from(this.alumnosResponsables.values())
      .filter(v => v.id_usuario === usuarioId);
    
    console.log(`Encontradas ${vinculaciones.length} vinculaciones para este usuario`);
    
    // Obtener información de cada alumno vinculado
    const result = [];
    for (const vinculacion of vinculaciones) {
      console.log(`Procesando vinculación: ${JSON.stringify(vinculacion)}`);
      const alumno = this.students.get(vinculacion.id_alumno);
      if (alumno) {
        console.log(`Alumno encontrado: ${alumno.nombreCompleto}, estatus: ${alumno.estatus}`);
        if (alumno.estatus === "Activo") {
          result.push({
            id_alumno: alumno.id,
            nombre: alumno.nombreCompleto,
            nivel: alumno.nivel,
            matricula: alumno.curp // Usamos CURP como matrícula ya que no hay campo específico
          });
        }
      } else {
        console.log(`Alumno con ID ${vinculacion.id_alumno} no encontrado`);
      }
    }
    
    console.log(`Retornando ${result.length} vinculaciones activas`);
    return result;
  }
  
  async createVinculacion(vinculacion: InsertAlumnoResponsable): Promise<AlumnoResponsable> {
    // Generar un ID único para la vinculación
    const id = crypto.randomUUID();
    const fechaVinculo = new Date();
    
    // Crear la nueva vinculación
    const nuevaVinculacion: AlumnoResponsable = {
      ...vinculacion,
      id,
      fecha_vinculo: fechaVinculo
    };
    
    // Guardar en el mapa usando una clave combinada para facilitar búsquedas
    const key = `${vinculacion.id_alumno}-${vinculacion.id_usuario}`;
    this.alumnosResponsables.set(key, nuevaVinculacion);
    
    return nuevaVinculacion;
  }
  
  async deleteVinculacion(idAlumno: number, idUsuario: string): Promise<boolean> {
    const key = `${idAlumno}-${idUsuario}`;
    return this.alumnosResponsables.delete(key);
  }
  
  async getVinculacionesByAlumno(alumnoId: number): Promise<AlumnoResponsable[]> {
    // Verificar si el alumno existe
    const alumno = this.students.get(alumnoId);
    if (!alumno) {
      return [];
    }
    
    // Obtener todas las vinculaciones para este alumno
    console.log(`Buscando vinculaciones para alumno ${alumnoId}, total de vinculaciones: ${this.alumnosResponsables.size}`);
    
    const vinculaciones = Array.from(this.alumnosResponsables.values())
      .filter(v => v.id_alumno === alumnoId);
    
    console.log(`Encontradas ${vinculaciones.length} vinculaciones para este alumno`);
    
    return vinculaciones;
  }
  
  // Implementación de los métodos para avisos escolares
  async getAvisos(): Promise<Aviso[]> {
    return Array.from(this.avisos.values());
  }

  async getAviso(id: string): Promise<Aviso | undefined> {
    return this.avisos.get(id);
  }

  async getAvisosByNivel(nivel: string): Promise<Aviso[]> {
    return Array.from(this.avisos.values()).filter(
      aviso => aviso.publico === "nivel" && aviso.nivel === nivel
    );
  }

  async getAvisosByGrupo(grupoId: number): Promise<Aviso[]> {
    return Array.from(this.avisos.values()).filter(
      aviso => aviso.publico === "grupo" && aviso.grupoId === grupoId
    );
  }

  async getAvisosByAlumno(alumnoId: number): Promise<Aviso[]> {
    return Array.from(this.avisos.values()).filter(
      aviso => aviso.publico === "individual" && aviso.alumnoId === alumnoId
    );
  }

  async getAvisosForParent(parentId: string): Promise<Aviso[]> {
    // Obtenemos las relaciones padre-alumno para este padre
    const relaciones = await this.getRelationsByParent(parentId);
    if (relaciones.length === 0) return [];
    
    // Obtenemos los IDs de los alumnos asociados a este padre
    const alumnosIds = relaciones.map(rel => rel.alumnoId);
    
    // Obtenemos todos los avisos
    const todosAvisos = await this.getAvisos();
    
    // Filtramos los avisos que aplican para este padre:
    // 1. Avisos para todos
    // 2. Avisos para niveles específicos de sus hijos
    // 3. Avisos para grupos específicos de sus hijos
    // 4. Avisos individuales para sus hijos
    return todosAvisos.filter(aviso => {
      // Avisos para todos
      if (aviso.publico === "todos") return true;
      
      // Avisos para niveles específicos (necesitamos obtener el nivel de cada alumno)
      if (aviso.publico === "nivel") {
        // Verificamos que alguno de los alumnos esté en ese nivel
        return alumnosIds.some(async (alumnoId) => {
          const alumno = await this.getStudent(alumnoId);
          return alumno && alumno.nivel === aviso.nivel;
        });
      }
      
      // Avisos para grupos específicos
      if (aviso.publico === "grupo") {
        // Verificamos que alguno de los alumnos esté en ese grupo
        return alumnosIds.some(async (alumnoId) => {
          const alumno = await this.getStudent(alumnoId);
          return alumno && alumno.grupoId === aviso.grupoId;
        });
      }
      
      // Avisos individuales
      if (aviso.publico === "individual") {
        // Verificamos que el aviso sea para alguno de los hijos
        return alumnosIds.includes(aviso.alumnoId);
      }
      
      return false;
    });
  }

  async createAviso(aviso: InsertAviso): Promise<Aviso> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newAviso: Aviso = { ...aviso, id, createdAt };
    this.avisos.set(id, newAviso);
    return newAviso;
  }

  async updateAviso(id: string, aviso: Partial<InsertAviso>): Promise<Aviso | undefined> {
    const existingAviso = this.avisos.get(id);
    if (!existingAviso) return undefined;
    
    const updatedAviso = { ...existingAviso, ...aviso };
    this.avisos.set(id, updatedAviso);
    return updatedAviso;
  }

  async deleteAviso(id: string): Promise<boolean> {
    return this.avisos.delete(id);
  }

  // Implementación para obtener reportes de rendimiento académico
  async getAcademicPerformanceReport(grupoId?: number, periodo?: string): Promise<AcademicPerformanceReport[]> {
    const allGrades = Array.from(this.grades.values());
    const groups = grupoId ? [await this.getGroup(grupoId)] : await this.getGroups();
    const filteredGroups = groups.filter(g => g !== undefined) as Group[];
    
    return Promise.all(filteredGroups.map(async group => {
      // Obtener estudiantes del grupo
      const students = Array.from(this.students.values()).filter(s => s.grupoId === group.id);
      const studentIds = students.map(s => s.id);
      
      // Filtrar calificaciones por grupo y periodo
      let groupGrades = allGrades.filter(g => studentIds.includes(g.alumnoId));
      if (periodo) {
        groupGrades = groupGrades.filter(g => g.periodo === periodo);
      }
      
      // Calcular promedio general
      const totalGrades = groupGrades.reduce((total, grade) => total + parseFloat(grade.valor), 0);
      const averageGrade = groupGrades.length > 0 ? totalGrades / groupGrades.length : 0;
      
      // Calcular distribución de calificaciones
      const ranges = [
        { min: 9, max: 10, label: "9-10", count: 0 },
        { min: 7, max: 8.9, label: "7-8.9", count: 0 },
        { min: 0, max: 6.9, label: "<7", count: 0 }
      ];
      
      groupGrades.forEach(grade => {
        const value = parseFloat(grade.valor);
        for (const range of ranges) {
          if (value >= range.min && value <= range.max) {
            range.count++;
            break;
          }
        }
      });
      
      // Calcular porcentajes
      const distribution = ranges.map(range => ({
        rango: range.label,
        cantidad: range.count,
        porcentaje: groupGrades.length > 0 ? (range.count / groupGrades.length) * 100 : 0
      }));
      
      return {
        grupoId: group.id,
        grupoNombre: group.nombre,
        nivel: group.nivel,
        promedioGeneral: Number(averageGrade.toFixed(2)),
        distribucionCalificaciones: distribution,
        periodo: periodo || 'Todos'
      };
    }));
  }
  
  // Implementación para obtener reportes de asistencia
  async getAttendanceReport(grupoId?: number, mes?: string): Promise<AttendanceReport[]> {
    const allAttendance = Array.from(this.attendance.values());
    const groups = grupoId ? [await this.getGroup(grupoId)] : await this.getGroups();
    const filteredGroups = groups.filter(g => g !== undefined) as Group[];
    
    return Promise.all(filteredGroups.map(async group => {
      // Obtener estudiantes del grupo
      const students = Array.from(this.students.values()).filter(s => s.grupoId === group.id);
      const studentIds = students.map(s => s.id);
      
      // Filtrar asistencias por grupo y mes
      let groupAttendance = allAttendance.filter(a => studentIds.includes(a.alumnoId));
      
      if (mes) {
        const [year, month] = mes.split('-');
        groupAttendance = groupAttendance.filter(a => {
          const date = new Date(a.fecha);
          return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
        });
      }
      
      // Agrupar registros por fecha
      const attendanceByDate = new Map<string, { asistencias: number, ausencias: number, retardos: number, total: number }>();
      
      groupAttendance.forEach(a => {
        const dateStr = new Date(a.fecha).toISOString().split('T')[0];
        if (!attendanceByDate.has(dateStr)) {
          attendanceByDate.set(dateStr, { asistencias: 0, ausencias: 0, retardos: 0, total: 0 });
        }
        
        const record = attendanceByDate.get(dateStr)!;
        if (a.asistencia) {
          record.asistencias++;
        } else {
          record.ausencias++;
        }
        record.total++;
      });
      
      // Convertir a formato de reporte
      const registrosPorFecha = Array.from(attendanceByDate.entries()).map(([fecha, datos]) => ({
        fecha,
        asistencias: datos.asistencias,
        ausencias: datos.ausencias,
        retardos: datos.retardos,
        total: datos.total,
        porcentaje: datos.total > 0 ? (datos.asistencias / datos.total) * 100 : 0
      }));
      
      // Calcular alumnos con más faltas
      const faltasPorAlumno = new Map<number, { faltas: number, retardos: number }>();
      
      groupAttendance.forEach(a => {
        if (!faltasPorAlumno.has(a.alumnoId)) {
          faltasPorAlumno.set(a.alumnoId, { faltas: 0, retardos: 0 });
        }
        
        if (!a.asistencia) {
          const record = faltasPorAlumno.get(a.alumnoId)!;
          record.faltas++;
        }
      });
      
      // Ordenar alumnos por faltas y tomar los 5 primeros
      const alumnosConMasFaltas = Array.from(faltasPorAlumno.entries())
        .map(([alumnoId, datos]) => {
          const student = students.find(s => s.id === alumnoId);
          return {
            alumnoId,
            nombreCompleto: student ? student.nombreCompleto : `Alumno ID ${alumnoId}`,
            faltas: datos.faltas,
            retardos: datos.retardos
          };
        })
        .sort((a, b) => b.faltas - a.faltas)
        .slice(0, 5);
      
      // Calcular porcentaje general de asistencia
      const totalRegistros = groupAttendance.length;
      const totalAsistencias = groupAttendance.filter(a => a.asistencia).length;
      const porcentajeAsistencia = totalRegistros > 0 ? (totalAsistencias / totalRegistros) * 100 : 0;
      
      return {
        grupoId: group.id,
        grupoNombre: group.nombre,
        porcentajeAsistencia: Number(porcentajeAsistencia.toFixed(2)),
        periodo: mes || 'Todos',
        registrosPorFecha,
        alumnosConMasFaltas
      };
    }));
  }
  
  // Implementación para obtener reportes financieros
  async getFinancialReport(grupoId?: number, estado?: string): Promise<FinancialReport> {
    const allDebts = Array.from(this.debts.values());
    const allPayments = Array.from(this.payments.values());
    const allConcepts = Array.from(this.paymentConcepts.values());
    
    // Filtrar por grupo si se especifica
    let filteredStudentIds: number[] = [];
    let groupName = '';
    let groupLevel = '';
    
    if (grupoId) {
      const group = await this.getGroup(grupoId);
      if (group) {
        const students = Array.from(this.students.values()).filter(s => s.grupoId === grupoId);
        filteredStudentIds = students.map(s => s.id);
        groupName = group.nombre;
        groupLevel = group.nivel;
      }
    } else {
      filteredStudentIds = Array.from(this.students.values()).map(s => s.id);
    }
    
    // Filtrar adeudos por estudiantes y estado
    let filteredDebts = allDebts.filter(d => filteredStudentIds.includes(d.alumnoId));
    if (estado) {
      const isPaid = estado.toLowerCase() === 'pagado';
      filteredDebts = filteredDebts.filter(d => (d as any).pagado === isPaid);
    }
    
    // Calcular montos totales
    const totalAdeudos = filteredDebts.reduce((total, debt) => {
      return total + parseFloat(debt.montoTotal);
    }, 0);
    
    // Calcular pagos realizados
    const totalPagado = allPayments
      .filter(p => filteredStudentIds.includes(p.alumnoId))
      .reduce((total, payment) => {
        return total + parseFloat(payment.monto);
      }, 0);
    
    // Calcular porcentaje pagado
    const porcentajePagado = totalAdeudos > 0 ? (totalPagado / totalAdeudos) * 100 : 0;
    
    // Adeudos por concepto
    const adeudosPorConcepto: { conceptoId: number; nombreConcepto: string; monto: number; porcentaje: number }[] = [];
    
    // Agrupar adeudos por concepto
    const conceptosMap = new Map<number, number>();
    filteredDebts.forEach(debt => {
      const monto = parseFloat(debt.montoTotal);
      const currentAmount = conceptosMap.get(debt.conceptoId) || 0;
      conceptosMap.set(debt.conceptoId, currentAmount + monto);
    });
    
    // Crear el reporte por concepto
    for (const [conceptoId, monto] of conceptosMap.entries()) {
      const concepto = allConcepts.find(c => c.id === conceptoId);
      const nombreConcepto = concepto ? concepto.nombre : `Concepto ID ${conceptoId}`;
      const porcentaje = totalAdeudos > 0 ? (monto / totalAdeudos) * 100 : 0;
      
      adeudosPorConcepto.push({
        conceptoId,
        nombreConcepto,
        monto,
        porcentaje
      });
    }
    
    // Ordenar por monto
    adeudosPorConcepto.sort((a, b) => b.monto - a.monto);
    
    // Alumnos con adeudos
    const alumnosConAdeudos = await Promise.all(
      filteredStudentIds
        .map(async studentId => {
          const studentDebts = filteredDebts.filter(d => d.alumnoId === studentId);
          if (studentDebts.length === 0) return null;
          
          const montoAdeudo = studentDebts.reduce((total, debt) => total + parseFloat(debt.montoTotal), 0);
          
          // Calcular días de vencimiento (para el adeudo más antiguo)
          let diasVencimiento = 0;
          if (studentDebts.length > 0) {
            const oldestDebt = studentDebts.reduce((oldest, current) => {
              const oldestDate = new Date(oldest.fechaLimite);
              const currentDate = new Date(current.fechaLimite);
              return currentDate < oldestDate ? current : oldest;
            });
            
            const fechaLimite = new Date(oldestDebt.fechaLimite);
            const hoy = new Date();
            const diffTime = hoy.getTime() - fechaLimite.getTime();
            diasVencimiento = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            diasVencimiento = diasVencimiento > 0 ? diasVencimiento : 0;
          }
          
          const student = await this.getStudent(studentId);
          return {
            alumnoId: studentId,
            nombreCompleto: student ? student.nombreCompleto : `Alumno ID ${studentId}`,
            montoAdeudo,
            diasVencimiento
          };
        })
    );
    
    // Filtrar valores nulos y ordenar por monto de adeudo
    const validStudentsWithDebt = alumnosConAdeudos
      .filter(a => a !== null) as { alumnoId: number, nombreCompleto: string, montoAdeudo: number, diasVencimiento: number }[];
    
    validStudentsWithDebt.sort((a, b) => b.montoAdeudo - a.montoAdeudo);
    
    return {
      grupoId: grupoId,
      grupoNombre: groupName,
      nivel: groupLevel,
      periodo: new Date().getFullYear().toString(),
      totalAdeudos,
      totalPagado,
      porcentajePagado: Number(porcentajePagado.toFixed(2)),
      adeudosPorConcepto,
      alumnosConAdeudos: validStudentsWithDebt
    };
  }
  
  // Implementación de métodos para criterios de evaluación
  async getEvaluationCriteria(): Promise<EvaluationCriteria[]> {
    return Array.from(this.evaluationCriteria.values());
  }

  async getEvaluationCriterion(id: number): Promise<EvaluationCriteria | undefined> {
    return this.evaluationCriteria.get(id);
  }

  async getEvaluationCriteriaBySubject(subjectId: number): Promise<EvaluationCriteria[]> {
    return Array.from(this.evaluationCriteria.values()).filter(
      criteria => criteria.materiaId === subjectId
    );
  }
  
  async getEvaluationCriteriaByLevel(nivel: string): Promise<EvaluationCriteria[]> {
    return Array.from(this.evaluationCriteria.values()).filter(
      criteria => criteria.nivel === nivel
    );
  }
  
  async createEvaluationCriterion(criterion: InsertEvaluationCriteria): Promise<EvaluationCriteria> {
    const id = this.currentEvaluationCriteriaId++;
    const createdAt = new Date().toISOString();
    const newCriterion: EvaluationCriteria = { ...criterion, id, createdAt };
    this.evaluationCriteria.set(id, newCriterion);
    return newCriterion;
  }
  
  async updateEvaluationCriterion(id: number, criterion: Partial<InsertEvaluationCriteria>): Promise<EvaluationCriteria | undefined> {
    const existingCriterion = this.evaluationCriteria.get(id);
    if (!existingCriterion) return undefined;
    
    const updatedCriterion = { ...existingCriterion, ...criterion };
    this.evaluationCriteria.set(id, updatedCriterion);
    return updatedCriterion;
  }
  
  async deleteEvaluationCriterion(id: number): Promise<boolean> {
    return this.evaluationCriteria.delete(id);
  }
  
  // Implementación de métodos para asignaciones de criterios
  async getCriteriaAssignments(): Promise<CriteriaAssignment[]> {
    return Array.from(this.criteriaAssignments.values());
  }
  
  async getCriteriaAssignment(id: number): Promise<CriteriaAssignment | undefined> {
    return this.criteriaAssignments.get(id);
  }
  
  async getCriteriaAssignmentsByGroup(groupId: number): Promise<CriteriaAssignment[]> {
    return Array.from(this.criteriaAssignments.values()).filter(
      assignment => assignment.grupoId === groupId
    );
  }
  
  async getCriteriaAssignmentsBySubject(subjectId: number): Promise<CriteriaAssignment[]> {
    return Array.from(this.criteriaAssignments.values()).filter(
      assignment => assignment.materiaId === subjectId
    );
  }
  
  async createCriteriaAssignment(assignment: InsertCriteriaAssignment): Promise<CriteriaAssignment> {
    const id = this.currentCriteriaAssignmentId++;
    const createdAt = new Date().toISOString();
    const newAssignment: CriteriaAssignment = { ...assignment, id, createdAt };
    this.criteriaAssignments.set(id, newAssignment);
    return newAssignment;
  }
  
  async updateCriteriaAssignment(id: number, assignment: Partial<InsertCriteriaAssignment>): Promise<CriteriaAssignment | undefined> {
    const existingAssignment = this.criteriaAssignments.get(id);
    if (!existingAssignment) return undefined;
    
    const updatedAssignment = { ...existingAssignment, ...assignment };
    this.criteriaAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }
  
  async deleteCriteriaAssignment(id: number): Promise<boolean> {
    return this.criteriaAssignments.delete(id);
  }
  
  // Implementación de métodos para calificaciones por criterio
  async getCriteriaGrades(): Promise<CriteriaGrade[]> {
    return Array.from(this.criteriaGrades.values());
  }
  
  async getCriteriaGrade(id: number): Promise<CriteriaGrade | undefined> {
    return this.criteriaGrades.get(id);
  }
  
  async getCriteriaGradesByStudent(studentId: number): Promise<CriteriaGrade[]> {
    return Array.from(this.criteriaGrades.values()).filter(
      grade => grade.alumnoId === studentId
    );
  }
  
  async getCriteriaGradesBySubject(subjectId: number, studentId: number): Promise<CriteriaGrade[]> {
    return Array.from(this.criteriaGrades.values()).filter(
      grade => grade.materiaId === subjectId && grade.alumnoId === studentId
    );
  }
  
  // Nuevo método específico para obtener calificaciones por criterio para un estudiante y materia
  async getCriteriaGradesByStudentAndSubject(studentId: number, subjectId: number): Promise<CriteriaGrade[]> {
    return Array.from(this.criteriaGrades.values()).filter(
      grade => grade.materiaId === subjectId && grade.alumnoId === studentId
    );
  }
  
  async createCriteriaGrade(grade: InsertCriteriaGrade): Promise<CriteriaGrade> {
    const id = this.currentCriteriaGradeId++;
    const createdAt = new Date().toISOString();
    const newGrade: CriteriaGrade = { ...grade, id, createdAt };
    this.criteriaGrades.set(id, newGrade);
    return newGrade;
  }
  
  async updateCriteriaGrade(id: number, grade: Partial<InsertCriteriaGrade>): Promise<CriteriaGrade | undefined> {
    const existingGrade = this.criteriaGrades.get(id);
    if (!existingGrade) return undefined;
    
    const updatedGrade = { ...existingGrade, ...grade };
    this.criteriaGrades.set(id, updatedGrade);
    return updatedGrade;
  }
  
  async deleteCriteriaGrade(id: number): Promise<boolean> {
    return this.criteriaGrades.delete(id);
  }
  
  // Implementación del método para generar boleta académica del estudiante
  async getStudentReport(studentId: number, periodo: string): Promise<StudentReport> {
    const student = await this.getStudent(studentId);
    if (!student) {
      throw new Error(`Estudiante con ID ${studentId} no encontrado`);
    }
    
    const group = await this.getGroup(student.grupoId);
    if (!group) {
      throw new Error(`Grupo del estudiante no encontrado`);
    }
    
    // Obtener asignaciones de materias para el grupo del estudiante
    const subjectAssignments = Array.from(this.subjectAssignments.values()).filter(
      assignment => assignment.grupoId === student.grupoId
    );
    
    // Obtener calificaciones de criterios para el estudiante
    const criteriaGrades = await this.getCriteriaGradesByStudent(studentId);
    
    // Obtener todas las asistencias del estudiante
    const attendanceRecords = await this.getAttendanceByStudent(studentId);
    
    // Filtrar solo los registros del periodo dado
    const periodAttendance = attendanceRecords.filter(record => 
      record.fecha.includes(periodo)
    );
    
    // Calcular estadísticas de asistencia
    const totalAttendanceDays = periodAttendance.length;
    const absences = periodAttendance.filter(record => !record.asistencia).length;
    const attendancePercentage = totalAttendanceDays > 0 
      ? ((totalAttendanceDays - absences) / totalAttendanceDays) * 100 
      : 100;
    
    // Organizar calificaciones por materia
    const subjectCriteria = new Map<number, { criterios: any[], promedio: number }>();
    
    for (const assignment of subjectAssignments) {
      const subjectId = assignment.materiaId;
      const subject = await this.getSubject(subjectId);
      
      if (subject) {
        // Obtener los criterios asignados a esta materia
        const criteriaAssignments = await this.getCriteriaAssignmentsBySubject(subjectId);
        
        // Para cada criterio asignado, buscar la calificación
        const criteriosCalificados = [];
        let sumaCalificaciones = 0;
        let sumaPorcentajes = 0;
        
        for (const criteriaAssignment of criteriaAssignments) {
          const criterio = await this.getEvaluationCriterion(criteriaAssignment.criterioId);
          
          if (criterio) {
            // Buscar la calificación para este alumno, materia y criterio
            const criteriaGrade = criteriaGrades.find(g => 
              g.materiaId === subjectId && 
              g.criterioId === criterio.id
            );
            
            const valorNumerico = criteriaGrade ? parseInt(criteriaGrade.valor) : 0;
            sumaCalificaciones += (valorNumerico * criterio.porcentaje / 100);
            sumaPorcentajes += criterio.porcentaje;
            
            criteriosCalificados.push({
              criterioId: criterio.id,
              criterioNombre: criterio.nombre,
              porcentaje: criterio.porcentaje,
              valor: valorNumerico
            });
          }
        }
        
        // Calcular promedio ponderado
        const promedio = sumaPorcentajes > 0 ? sumaCalificaciones : 0;
        
        subjectCriteria.set(subjectId, {
          criterios: criteriosCalificados,
          promedio
        });
      }
    }
    
    // Construir la estructura de la boleta
    const calificaciones = [];
    let promedioGeneral = 0;
    let countMaterias = 0;
    
    for (const assignment of subjectAssignments) {
      const subject = await this.getSubject(assignment.materiaId);
      const criteriaData = subjectCriteria.get(assignment.materiaId);
      
      if (subject && criteriaData) {
        calificaciones.push({
          materiaId: subject.id,
          materiaNombre: subject.nombre,
          promedio: criteriaData.promedio,
          criterios: criteriaData.criterios,
          observaciones: "" // Aquí se podría agregar observaciones si se implementa
        });
        
        promedioGeneral += criteriaData.promedio;
        countMaterias++;
      }
    }
    
    // Calcular promedio general
    promedioGeneral = countMaterias > 0 ? promedioGeneral / countMaterias : 0;
    
    return {
      alumnoId: student.id,
      nombreCompleto: student.nombreCompleto,
      grupo: group.nombre,
      nivel: group.nivel,
      periodo,
      cicloEscolar: group.cicloEscolar,
      calificaciones,
      promedioGeneral,
      asistencia: {
        total: totalAttendanceDays,
        ausencias: absences,
        porcentaje: attendancePercentage
      }
    };
  }

  // Implementación para obtener resumen institucional
  async getInstitutionSummary(): Promise<{
    promedioGeneral: number;
    mejoresGrupos: { grupoId: number, grupoNombre: string, promedio: number }[];
    asistenciaMedia: number;
    recuperacionFinanciera: number;
  }> {
    // Obtener todos los datos
    const allGrades = Array.from(this.grades.values());
    const allAttendance = Array.from(this.attendance.values());
    const allDebts = Array.from(this.debts.values());
    const allPayments = Array.from(this.payments.values());
    const allGroups = await this.getGroups();
    
    // Calcular promedio general
    const totalGrades = allGrades.reduce((total, grade) => total + parseFloat(grade.valor), 0);
    const promedioGeneral = allGrades.length > 0 ? totalGrades / allGrades.length : 0;
    
    // Calcular promedios por grupo
    const groupAverages = await Promise.all(
      allGroups.map(async (group) => {
        const students = Array.from(this.students.values()).filter(s => s.grupoId === group.id);
        const studentIds = students.map(s => s.id);
        
        const groupGrades = allGrades.filter(g => studentIds.includes(g.alumnoId));
        const totalGroupGrades = groupGrades.reduce((total, grade) => total + parseFloat(grade.valor), 0);
        const promedio = groupGrades.length > 0 ? totalGroupGrades / groupGrades.length : 0;
        
        return {
          grupoId: group.id,
          grupoNombre: group.nombre,
          promedio: Number(promedio.toFixed(2))
        };
      })
    );
    
    // Ordenar por promedio y tomar los 3 mejores
    groupAverages.sort((a, b) => b.promedio - a.promedio);
    const mejoresGrupos = groupAverages.slice(0, 3);
    
    // Calcular asistencia media
    const totalAsistencias = allAttendance.filter(a => a.asistencia).length;
    const asistenciaMedia = allAttendance.length > 0 ? (totalAsistencias / allAttendance.length) * 100 : 0;
    
    // Calcular recuperación financiera
    const totalAdeudos = allDebts.reduce((total, debt) => total + parseFloat(debt.montoTotal), 0);
    const totalPagado = allPayments.reduce((total, payment) => total + parseFloat(payment.monto), 0);
    const recuperacionFinanciera = totalAdeudos > 0 ? (totalPagado / totalAdeudos) * 100 : 0;
    
    return {
      promedioGeneral: Number(promedioGeneral.toFixed(2)),
      mejoresGrupos,
      asistenciaMedia: Number(asistenciaMedia.toFixed(2)),
      recuperacionFinanciera: Number(recuperacionFinanciera.toFixed(2))
    };
  }

  // Implementación de los métodos para tareas
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByGroup(groupId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.grupoId === groupId
    );
  }

  async getTasksBySubject(subjectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.materiaId === subjectId
    );
  }

  async getTasksByTeacher(teacherId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.profesorId === teacherId
    );
  }

  async getActiveTasksForGroup(groupId: number): Promise<Task[]> {
    const now = new Date();
    return Array.from(this.tasks.values()).filter(
      task => task.grupoId === groupId && 
              task.estado === "activo" && 
              new Date(task.fechaEntrega) >= now
    );
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const newTask: Task = { 
      ...task, 
      id,
      fechaCreacion: new Date(),
      estado: task.estado || "activo" 
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask = { ...existingTask, ...task };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Implementación de los métodos para entregas de tareas
  async getTaskSubmissions(): Promise<TaskSubmission[]> {
    return Array.from(this.taskSubmissions.values());
  }

  async getTaskSubmission(id: number): Promise<TaskSubmission | undefined> {
    return this.taskSubmissions.get(id);
  }

  async getTaskSubmissionsByTask(taskId: number): Promise<TaskSubmission[]> {
    return Array.from(this.taskSubmissions.values()).filter(
      submission => submission.tareaId === taskId
    );
  }

  async getTaskSubmissionsByStudent(studentId: number): Promise<TaskSubmission[]> {
    return Array.from(this.taskSubmissions.values()).filter(
      submission => submission.alumnoId === studentId
    );
  }

  async createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission> {
    const id = this.currentTaskSubmissionId++;
    const newSubmission: TaskSubmission = { 
      ...submission, 
      id,
      fechaEntrega: submission.fechaEntrega || new Date(),
      estado: submission.estado || "entregada",
      createdAt: new Date()
    };
    this.taskSubmissions.set(id, newSubmission);
    return newSubmission;
  }

  async updateTaskSubmission(id: number, submission: Partial<InsertTaskSubmission>): Promise<TaskSubmission | undefined> {
    const existingSubmission = this.taskSubmissions.get(id);
    if (!existingSubmission) return undefined;
    
    const updatedSubmission = { ...existingSubmission, ...submission };
    this.taskSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  async deleteTaskSubmission(id: number): Promise<boolean> {
    return this.taskSubmissions.delete(id);
  }

  // === IMPLEMENTACIÓN DEL SISTEMA DE COMUNICACIÓN ESCOLAR ===

  // Implementación de métodos para mensajes
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesBySender(senderId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      message => message.senderId === senderId
    );
  }

  async getMessagesByReceiver(receiverId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      message => message.receiverId === receiverId
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = crypto.randomUUID();
    const newMessage: Message = {
      ...message,
      id,
      isRead: false,
      isArchived: false,
      createdAt: new Date()
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async updateMessage(id: string, isRead: boolean, isArchived: boolean): Promise<Message | undefined> {
    const existingMessage = this.messages.get(id);
    if (!existingMessage) return undefined;

    const updatedMessage = { 
      ...existingMessage, 
      isRead, 
      isArchived 
    };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }

  // Implementación de métodos para anuncios escolares
  async getSchoolAnnouncements(): Promise<SchoolAnnouncement[]> {
    return Array.from(this.schoolAnnouncements.values());
  }

  async getSchoolAnnouncement(id: string): Promise<SchoolAnnouncement | undefined> {
    return this.schoolAnnouncements.get(id);
  }

  async getSchoolAnnouncementsByRole(role: string): Promise<SchoolAnnouncement[]> {
    return Array.from(this.schoolAnnouncements.values()).filter(
      announcement => announcement.targetRoles.includes(role)
    );
  }

  async createSchoolAnnouncement(announcement: InsertSchoolAnnouncement): Promise<SchoolAnnouncement> {
    const id = crypto.randomUUID();
    const newAnnouncement: SchoolAnnouncement = {
      ...announcement,
      id,
      createdAt: new Date()
    };
    this.schoolAnnouncements.set(id, newAnnouncement);
    return newAnnouncement;
  }

  async updateSchoolAnnouncement(
    id: string,
    announcement: Partial<InsertSchoolAnnouncement>
  ): Promise<SchoolAnnouncement | undefined> {
    const existingAnnouncement = this.schoolAnnouncements.get(id);
    if (!existingAnnouncement) return undefined;

    const updatedAnnouncement = { ...existingAnnouncement, ...announcement };
    this.schoolAnnouncements.set(id, updatedAnnouncement);
    return updatedAnnouncement;
  }

  async deleteSchoolAnnouncement(id: string): Promise<boolean> {
    return this.schoolAnnouncements.delete(id);
  }

  // Implementación de métodos para notificaciones
  async getNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values());
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId
    );
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId && !notification.isRead
    );
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = crypto.randomUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      isRead: false,
      createdAt: new Date()
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const existingNotification = this.notifications.get(id);
    if (!existingNotification) return undefined;

    const updatedNotification = { ...existingNotification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }

  // Implementación de métodos para eventos de calendario
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values());
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }

  async getCalendarEventsByDateRange(startDate: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const events = Array.from(this.calendarEvents.values());
    
    if (!endDate) {
      return events.filter(event => 
        event.startDate >= startDate
      );
    }
    
    return events.filter(event => 
      event.startDate >= startDate && 
      (event.endDate ? event.endDate <= endDate : event.startDate <= endDate)
    );
  }

  async getCalendarEventsByCreator(creatorId: string): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values()).filter(
      event => event.createdBy === creatorId
    );
  }

  async createCalendarEvent(calendarEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = crypto.randomUUID();
    const newEvent: CalendarEvent = {
      ...calendarEvent,
      id,
      createdAt: new Date()
    };
    this.calendarEvents.set(id, newEvent);
    return newEvent;
  }

  async updateCalendarEvent(
    id: string,
    calendarEvent: Partial<InsertCalendarEvent>
  ): Promise<CalendarEvent | undefined> {
    const existingEvent = this.calendarEvents.get(id);
    if (!existingEvent) return undefined;

    const updatedEvent = { ...existingEvent, ...calendarEvent };
    this.calendarEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    return this.calendarEvents.delete(id);
  }

  // Implementación de métodos para eventos de agenda
  async getEventosAgenda(): Promise<EventoAgenda[]> {
    return Array.from(this.eventosAgenda.values());
  }

  async getEventoAgenda(id: number): Promise<EventoAgenda | undefined> {
    return this.eventosAgenda.get(id);
  }

  async getEventosAgendaByStudent(estudianteId: number): Promise<EventoAgenda[]> {
    return Array.from(this.eventosAgenda.values()).filter(
      evento => evento.estudianteId === estudianteId
    );
  }

  async getEventosAgendaByDateRange(estudianteId: number, startDate: Date, endDate: Date): Promise<EventoAgenda[]> {
    const eventos = await this.getEventosAgendaByStudent(estudianteId);
    
    return eventos.filter(evento => {
      const fechaEvento = new Date(evento.fecha);
      return fechaEvento >= startDate && fechaEvento <= endDate;
    });
  }

  async getEventosAgendaByWeek(estudianteId: number, weekStart: Date): Promise<EventoAgenda[]> {
    // Creamos la fecha de fin sumando 6 días a la fecha de inicio
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return this.getEventosAgendaByDateRange(estudianteId, weekStart, weekEnd);
  }

  async createEventoAgenda(evento: InsertEventoAgenda): Promise<EventoAgenda> {
    const id = this.eventoAgendaCounter++;
    const newEvento: EventoAgenda = {
      ...evento,
      id,
      createdAt: new Date()
    };
    this.eventosAgenda.set(id, newEvento);
    return newEvento;
  }

  async updateEventoAgenda(id: number, evento: Partial<InsertEventoAgenda>): Promise<EventoAgenda | undefined> {
    const existingEvento = this.eventosAgenda.get(id);
    if (!existingEvento) return undefined;
    
    const updatedEvento = { ...existingEvento, ...evento };
    this.eventosAgenda.set(id, updatedEvento);
    return updatedEvento;
  }

  async deleteEventoAgenda(id: number): Promise<boolean> {
    return this.eventosAgenda.delete(id);
  }

  // Implementación de los métodos para logs de correos
  async getEmailLogs(): Promise<EmailLog[]> {
    return Array.from(this.emailLogs.values());
  }

  async getEmailLogsByPayment(paymentId: number): Promise<EmailLog[]> {
    return Array.from(this.emailLogs.values()).filter(
      log => log.paymentId === paymentId
    );
  }

  async getEmailLogsByStudent(studentId: number): Promise<EmailLog[]> {
    return Array.from(this.emailLogs.values()).filter(
      log => log.studentId === studentId
    );
  }

  async createEmailLog(emailLog: InsertEmailLog): Promise<EmailLog> {
    const id = this.emailLogCounter++;
    const newEmailLog: EmailLog = {
      ...emailLog,
      id,
      createdAt: new Date()
    };
    this.emailLogs.set(id, newEmailLog);
    return newEmailLog;
  }

  // Implementación de métodos para observaciones
  async getObservaciones(): Promise<Observacion[]> {
    return Array.from(this.observaciones.values());
  }

  async getObservacionById(id: number): Promise<Observacion | undefined> {
    return this.observaciones.get(id);
  }

  async getObservacionesByProfesor(profesorId: number): Promise<Observacion[]> {
    return Array.from(this.observaciones.values()).filter(
      observacion => observacion.profesorId === profesorId
    );
  }

  async getObservacionesByAlumno(alumnoId: number): Promise<Observacion[]> {
    return Array.from(this.observaciones.values()).filter(
      observacion => observacion.alumnoId === alumnoId
    );
  }

  async getObservacionesByGrupo(grupoId: number): Promise<Observacion[]> {
    return Array.from(this.observaciones.values()).filter(
      observacion => observacion.grupoId === grupoId
    );
  }

  async createObservacion(observacion: InsertObservacion): Promise<Observacion> {
    const id = this.observacionCounter++;
    const newObservacion: Observacion = {
      ...observacion,
      id,
      fechaCreacion: new Date()
    };
    this.observaciones.set(id, newObservacion);
    return newObservacion;
  }

  async updateObservacion(id: number, observacion: Partial<InsertObservacion>): Promise<Observacion | undefined> {
    const existingObservacion = this.observaciones.get(id);
    if (!existingObservacion) return undefined;
    
    const updatedObservacion = { ...existingObservacion, ...observacion };
    this.observaciones.set(id, updatedObservacion);
    return updatedObservacion;
  }

  async deleteObservacion(id: number): Promise<boolean> {
    return this.observaciones.delete(id);
  }
  
  // Implementación de los métodos para el asistente educativo IA
  async saveTeacherRecommendations(data: InsertTeacherRecommendation): Promise<TeacherRecommendation> {
    const id = this.teacherRecommendationCounter++;
    const now = new Date();
    const newRecommendation: TeacherRecommendation = {
      ...data,
      id,
      createdAt: now
    };
    this.teacherRecommendations.set(id, newRecommendation);
    return newRecommendation;
  }
  
  async getTeacherRecommendations(filter: {profesorId: number, grupoId?: number}): Promise<TeacherRecommendation[]> {
    return Array.from(this.teacherRecommendations.values())
      .filter(rec => {
        const matchesProfesor = rec.profesorId === filter.profesorId;
        const matchesGrupo = !filter.grupoId || rec.grupoId === filter.grupoId;
        return matchesProfesor && matchesGrupo;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Ordenar por fecha descendente
  }
  
  // Métodos para obtener datos del informe de padres (versión web)
  
  async getStudentGrades(studentId: number): Promise<{
    id: number;
    nombre: string;
    grado: string;
    promedio: number;
    materias: {
      id: number;
      nombre: string;
      promedio: number;
    }[];
  }> {
    // Obtener el estudiante
    const student = await this.getStudent(studentId);
    if (!student) {
      throw new Error(`Estudiante con ID ${studentId} no encontrado`);
    }
    
    // Obtener el grupo del estudiante
    const group = await this.getGroup(student.grupoId);
    if (!group) {
      throw new Error(`Grupo del estudiante no encontrado`);
    }
    
    // Obtener las calificaciones del estudiante
    const grades = await this.getGradesByStudent(studentId);
    
    // Agrupar calificaciones por materia y calcular promedios
    const materiaMap = new Map<number, { id: number, nombre: string, total: number, count: number }>();
    
    // Obtener todas las materias para asegurar que incluso materias sin calificaciones aparezcan
    const subjects = await this.getSubjects();
    
    // Inicializar el mapa con todas las materias
    for (const subject of subjects) {
      materiaMap.set(subject.id, { id: subject.id, nombre: subject.nombre, total: 0, count: 0 });
    }
    
    // Agregar calificaciones
    for (const grade of grades) {
      const materia = materiaMap.get(grade.materiaId);
      if (materia) {
        materia.total += grade.calificacion;
        materia.count += 1;
      }
    }
    
    // Calcular el promedio general y la lista de materias con sus promedios
    let totalPromedio = 0;
    let countMaterias = 0;
    const materias = Array.from(materiaMap.values())
      .filter(m => m.count > 0)  // Solo incluir materias con calificaciones
      .map(m => {
        const promedio = m.count > 0 ? Math.round((m.total / m.count) * 10) / 10 : 0;
        totalPromedio += promedio;
        countMaterias += 1;
        return {
          id: m.id,
          nombre: m.nombre,
          promedio
        };
      });
    
    // Calcular promedio general
    const promedioGeneral = countMaterias > 0 ? Math.round((totalPromedio / countMaterias) * 10) / 10 : 0;
    
    return {
      id: student.id,
      nombre: student.nombreCompleto,
      grado: group.nombre,
      promedio: promedioGeneral,
      materias
    };
  }
  
  async getStudentRecommendations(studentId: number): Promise<TeacherRecommendation | undefined> {
    // Obtener el estudiante
    const student = await this.getStudent(studentId);
    if (!student) {
      return undefined;
    }
    
    // Obtener el grupo del estudiante
    const grupoId = student.grupoId;
    
    // Obtener todas las recomendaciones y filtrar por grupo
    const allRecommendations = Array.from(this.teacherRecommendations.values())
      .filter(rec => rec.grupoId === grupoId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Devolver la recomendación más reciente para ese grupo
    return allRecommendations.length > 0 ? allRecommendations[0] : undefined;
  }
  
  async getTeacherForStudent(studentId: number): Promise<{
    id: number;
    nombreCompleto: string;
    correo: string;
  } | undefined> {
    // Obtener el estudiante
    const student = await this.getStudent(studentId);
    if (!student) {
      return undefined;
    }
    
    // Obtener el grupo del estudiante
    const grupoId = student.grupoId;
    
    // Obtener profesores asignados al grupo
    const teachers = await this.getTeachersByGroup(grupoId);
    
    // Devolver el primer profesor encontrado (idealmente sería el profesor titular)
    if (teachers.length > 0) {
      const teacher = teachers[0];
      return {
        id: teacher.id,
        nombreCompleto: teacher.nombreCompleto,
        correo: teacher.correo
      };
    }
    
    return undefined;
  }
  
  async saveRecoveryPlan(data: any): Promise<any> {
    const id = this.recoveryPlanCounter++;
    const now = new Date();
    const newPlan: RecoveryPlan = {
      ...data,
      id,
      createdAt: now
    };
    this.recoveryPlans.set(id, newPlan);
    return newPlan;
  }
  
  async getRecoveryPlans(filter: {profesorId: number, grupoId?: number}): Promise<RecoveryPlan[]> {
    return Array.from(this.recoveryPlans.values())
      .filter(plan => {
        const matchesProfesor = plan.profesorId === filter.profesorId;
        const matchesGrupo = !filter.grupoId || plan.grupoId === filter.grupoId;
        return matchesProfesor && matchesGrupo;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Ordenar por fecha descendente
  }
}

// Using DatabaseStorage for production
import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();

// Using MemStorage for development until database is ready
// export const storage = new MemStorage();
