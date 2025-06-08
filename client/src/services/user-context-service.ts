import { User } from "@shared/schema"; 
import { apiRequest } from "@/lib/queryClient";

// Tipos para el contexto del usuario
export interface UserContextData {
  rol: string;
  nombreUsuario: string;
  modulosRecientes: string[];
  estadisticas: {
    totalAlumnos?: number;
    alumnosConAdeudos?: number;
    pagosVencidos?: number;
    recordatoriosPendientes?: number;
    tareasProximas?: number;
  };
  sugerenciasPersonalizadas: SugerenciaPersonalizada[];
}

export interface SugerenciaPersonalizada {
  texto: string;
  prompt: string;
  prioridad: number; // 1-5, donde 5 es la más alta
  categoria: string;
  intent?: string;
  navigateTo?: string;
  params?: Record<string, any>;
}

/**
 * Genera contexto del usuario basado en su actividad y estado del sistema
 */
export async function generateUserContext(user: User | null): Promise<UserContextData | null> {
  if (!user) return null;
  
  try {
    // Contexto básico del usuario
    const contextData: UserContextData = {
      rol: user.rol,
      nombreUsuario: user.nombreCompleto.split(' ')[0],
      modulosRecientes: [], // Esto podría almacenarse en localStorage
      estadisticas: {},
      sugerenciasPersonalizadas: []
    };
    
    // Obtener datos según el rol del usuario
    switch (user.rol) {
      case 'admin':
        await enrichAdminContext(contextData);
        break;
      case 'docente':
        await enrichTeacherContext(contextData);
        break;
      case 'padre':
        await enrichParentContext(contextData, user.id);
        break;
      case 'coordinador':
        await enrichCoordinatorContext(contextData);
        break;
      default:
        await enrichBasicContext(contextData);
    }
    
    // Generar sugerencias personalizadas
    contextData.sugerenciasPersonalizadas = generatePersonalizedSuggestions(contextData);
    
    return contextData;
  } catch (error) {
    console.error("Error al generar contexto de usuario:", error);
    return {
      rol: user.rol,
      nombreUsuario: user.nombreCompleto.split(' ')[0],
      modulosRecientes: [],
      estadisticas: {},
      sugerenciasPersonalizadas: []
    };
  }
}

/**
 * Enriquece el contexto para administradores
 */
async function enrichAdminContext(contextData: UserContextData): Promise<void> {
  try {
    // Obtener estudiantes
    const studentsResponse = await apiRequest("GET", "/api/students");
    const students = await studentsResponse.json();
    contextData.estadisticas.totalAlumnos = students.length;
    
    // Obtener deudas
    const debtsResponse = await apiRequest("GET", "/api/debts");
    const debts = await debtsResponse.json();
    
    // Alumnos con adeudos (eliminar duplicados)
    const studentsWithDebts = new Set(debts.map((debt: any) => debt.alumnoId));
    contextData.estadisticas.alumnosConAdeudos = studentsWithDebts.size;
    
    // Pagos vencidos
    const overdueDebts = debts.filter((debt: any) => 
      debt.estatus === 'vencido' || 
      (debt.estatus === 'pendiente' && new Date(debt.fechaLimite) < new Date())
    );
    contextData.estadisticas.pagosVencidos = overdueDebts.length;
    
    // Recordatorios pendientes (si hay pagos vencidos)
    if (overdueDebts.length > 0) {
      // Verificar cuántos de los pagos vencidos no tienen recordatorios recientes
      const emailLogsResponse = await apiRequest("GET", "/api/email-logs");
      const emailLogs = await emailLogsResponse.json();
      
      // Contar alumnos con pagos vencidos que no tienen recordatorios recientes (últimos 3 días)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentReminderIds = new Set(
        emailLogs
          .filter((log: any) => new Date(log.createdAt) > threeDaysAgo)
          .map((log: any) => log.studentId)
      );
      
      const studentsNeedingReminders = new Set(
        overdueDebts
          .map((debt: any) => debt.alumnoId)
          .filter((id: number) => !recentReminderIds.has(id))
      );
      
      contextData.estadisticas.recordatoriosPendientes = studentsNeedingReminders.size;
    }
  } catch (error) {
    console.error("Error al enriquecer contexto de administrador:", error);
  }
}

/**
 * Enriquece el contexto para docentes
 */
async function enrichTeacherContext(contextData: UserContextData): Promise<void> {
  try {
    // Obtener tareas próximas a vencer (para los próximos 7 días)
    const tasksResponse = await apiRequest("GET", "/api/tasks");
    const tasks = await tasksResponse.json();
    
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    const upcomingTasks = tasks.filter((task: any) => {
      const dueDate = new Date(task.fechaEntrega);
      return dueDate > new Date() && dueDate < oneWeekFromNow;
    });
    
    contextData.estadisticas.tareasProximas = upcomingTasks.length;
  } catch (error) {
    console.error("Error al enriquecer contexto de docente:", error);
  }
}

/**
 * Enriquece el contexto para padres de familia
 */
async function enrichParentContext(contextData: UserContextData, userId: string): Promise<void> {
  try {
    // Obtener hijos del padre
    const relationsResponse = await apiRequest("GET", `/api/parent-student-relations?parentId=${userId}`);
    const relations = await relationsResponse.json();
    
    if (relations.length > 0) {
      const studentIds = relations.map((rel: any) => rel.studentId);
      
      // Obtener adeudos de los hijos
      let totalDebts = 0;
      let overdueDebts = 0;
      
      for (const studentId of studentIds) {
        const studentDebtsResponse = await apiRequest("GET", `/api/debts?alumnoId=${studentId}`);
        const studentDebts = await studentDebtsResponse.json();
        
        totalDebts += studentDebts.length;
        
        // Contar adeudos vencidos
        overdueDebts += studentDebts.filter((debt: any) => 
          debt.estatus === 'vencido' || 
          (debt.estatus === 'pendiente' && new Date(debt.fechaLimite) < new Date())
        ).length;
      }
      
      contextData.estadisticas.alumnosConAdeudos = studentIds.length > 0 ? studentIds.length : 0;
      contextData.estadisticas.pagosVencidos = overdueDebts;
    }
  } catch (error) {
    console.error("Error al enriquecer contexto de padre:", error);
  }
}

/**
 * Enriquece el contexto para coordinadores
 */
async function enrichCoordinatorContext(contextData: UserContextData): Promise<void> {
  // Combinación de contexto de admin y docente
  await enrichAdminContext(contextData);
  await enrichTeacherContext(contextData);
}

/**
 * Contexto básico para cualquier rol
 */
async function enrichBasicContext(contextData: UserContextData): Promise<void> {
  // No agregar información adicional
}

/**
 * Genera sugerencias personalizadas basadas en el contexto
 */
function generatePersonalizedSuggestions(contextData: UserContextData): SugerenciaPersonalizada[] {
  const suggestions: SugerenciaPersonalizada[] = [];
  
  // Común para todos los roles
  suggestions.push({
    texto: "Ayuda general",
    prompt: "¿Qué puedo hacer en el sistema?",
    prioridad: 1,
    categoria: "general"
  });
  
  // Sugerencias específicas según estadísticas y rol
  switch (contextData.rol) {
    case 'admin':
      if (contextData.estadisticas.pagosVencidos && contextData.estadisticas.pagosVencidos > 0) {
        suggestions.push({
          texto: `Ver ${contextData.estadisticas.pagosVencidos} pagos vencidos`,
          prompt: "¿Cómo puedo ver los pagos vencidos?",
          prioridad: 5,
          categoria: "pagos",
          intent: "ver_pagos_vencidos",
          navigateTo: "/pagos",
          params: { vencidos: true }
        });
      }
      
      if (contextData.estadisticas.recordatoriosPendientes && contextData.estadisticas.recordatoriosPendientes > 0) {
        suggestions.push({
          texto: `Enviar ${contextData.estadisticas.recordatoriosPendientes} recordatorios`,
          prompt: "¿Cómo envío recordatorios de pago?",
          prioridad: 5,
          categoria: "recordatorios",
          intent: "enviar_recordatorios",
          navigateTo: "/admin/recordatorios",
          params: { ejecutar: true }
        });
      }
      break;
      
    case 'docente':
      if (contextData.estadisticas.tareasProximas && contextData.estadisticas.tareasProximas > 0) {
        suggestions.push({
          texto: `Revisar ${contextData.estadisticas.tareasProximas} tareas próximas`,
          prompt: "¿Cómo puedo revisar las tareas próximas a vencer?",
          prioridad: 4,
          categoria: "academico"
        });
      }
      break;
      
    case 'padre':
      if (contextData.estadisticas.pagosVencidos && contextData.estadisticas.pagosVencidos > 0) {
        suggestions.push({
          texto: `Ver ${contextData.estadisticas.pagosVencidos} pagos pendientes`,
          prompt: "¿Cómo puedo ver los pagos pendientes de mi hijo?",
          prioridad: 5,
          categoria: "pagos"
        });
      }
      break;
      
    case 'coordinador':
      suggestions.push({
        texto: "Generar reportes",
        prompt: "¿Cómo puedo generar reportes académicos?",
        prioridad: 3,
        categoria: "reportes"
      });
      break;
  }
  
  // Ordenar por prioridad (mayor a menor)
  return suggestions.sort((a, b) => b.prioridad - a.prioridad);
}