/**
 * Prompts predefinidos para el asistente IA
 * Con soporte para personalización basada en contexto de usuario
 */
import { UserContextData, SugerenciaPersonalizada } from "@/services/user-context-service";

export interface QuickActionItem {
  label: string;
  prompt: string;
  category?: string;
  icon?: string;
  priority?: number;
  intent?: string;
  navigateTo?: string;
  params?: Record<string, any>;
}

// Acciones rápidas principales que se muestran como botones destacados con navegación integrada
export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    label: "Ver pagos vencidos",
    prompt: "¿Cómo ver los pagos vencidos?",
    category: "pagos",
    intent: "ver_pagos_vencidos",
    navigateTo: "/pagos",
    params: { vencidos: true }
  },
  {
    label: "Enviar recordatorios",
    prompt: "¿Cómo enviar recordatorios de pago?",
    category: "comunicacion",
    intent: "enviar_recordatorios",
    navigateTo: "/admin/recordatorios",
    params: { ejecutar: true }
  },
  {
    label: "Registrar nuevo pago",
    prompt: "¿Cómo registrar un pago?",
    category: "pagos",
    intent: "registrar_pago",
    navigateTo: "/pagos/nuevo",
    params: {}
  },
  {
    label: "Consultar adeudos",
    prompt: "¿Cómo consulto los adeudos pendientes?",
    category: "pagos",
    intent: "consultar_adeudos",
    navigateTo: "/adeudos",
    params: {}
  },
  {
    label: "Ver estado de cuenta",
    prompt: "¿Cómo consultar el estado de cuenta de un alumno?",
    category: "pagos",
    intent: "estado_cuenta",
    navigateTo: "/estado-cuenta",
    params: {}
  },
  {
    label: "Descargar boleta",
    prompt: "¿Cómo genero una boleta de calificaciones?",
    category: "academico",
    intent: "descargar_boleta",
    navigateTo: "/boletas",
    params: {}
  },
];

// Colección completa de prompts categorizados
export const CATEGORIZED_PROMPTS: Record<string, QuickActionItem[]> = {
  "pagos": [
    { label: "Registrar pago con transferencia", prompt: "¿Cómo registrar un pago con transferencia?", category: "pagos" },
    { label: "Ver historial de pagos", prompt: "¿Dónde veo los pagos hechos por un alumno?", category: "pagos" },
    { label: "Aplicar descuento o beca", prompt: "¿Cómo aplico un descuento o beca a una colegiatura?", category: "pagos" },
    { label: "Eliminar pago erróneo", prompt: "¿Cómo elimino un pago registrado por error?", category: "pagos" },
  ],
  "estados-cuenta": [
    { label: "Consultar estado de cuenta", prompt: "¿Cómo consultar el estado de cuenta de un alumno?", category: "estados-cuenta" },
    { label: "Descargar comprobante", prompt: "¿Puedo descargar un comprobante o recibo de pago?", category: "estados-cuenta" },
    { label: "Adeudos pendientes del mes", prompt: "¿Cómo veo qué alumnos tienen adeudos pendientes este mes?", category: "estados-cuenta" },
  ],
  "recordatorios": [
    { label: "Enviar recordatorios automáticos", prompt: "¿Cómo envío recordatorios automáticos de pago?", category: "recordatorios" },
    { label: "Verificar envío de recordatorios", prompt: "¿Cómo veo si se envió un recordatorio a un padre de familia?", category: "recordatorios" },
  ],
  "grupos-alumnos": [
    { label: "Agregar nuevo alumno", prompt: "¿Cómo agrego un nuevo alumno al sistema?", category: "grupos-alumnos" },
    { label: "Editar información de grupo", prompt: "¿Cómo edito la información de un grupo?", category: "grupos-alumnos" },
    { label: "Consultar alumnos por grupo", prompt: "¿Dónde consulto qué alumnos están en cierto grupo?", category: "grupos-alumnos" },
  ],
  "reportes-boletas": [
    { label: "Generar boleta", prompt: "¿Cómo genero una boleta de calificaciones?", category: "reportes-boletas" },
    { label: "Exportar listado de pagos", prompt: "¿Cómo exporto un listado de pagos o adeudos?", category: "reportes-boletas" },
  ],
  "configuracion": [
    { label: "Crear concepto de pago", prompt: "¿Cómo creo un nuevo concepto de pago?", category: "configuracion" },
    { label: "Configurar periodos escolares", prompt: "¿Dónde configuro los periodos escolares o ciclos?", category: "configuracion" },
  ],
};

// Plantilla base del system prompt
const BASE_SYSTEM_PROMPT = `Eres un asistente inteligente dentro de un sistema ERP escolar llamado EduMex.  
Tu trabajo es guiar a los usuarios para realizar operaciones dentro del sistema de forma eficiente y precisa.  

Los módulos disponibles son:  
- Alumnos, Profesores, Grupos, Materias  
- Asistencias, Calificaciones, Tareas, Boletas  
- Conceptos de Pago, Adeudos, Pagos, Estado de Cuenta  
- Recordatorios de Pagos, Clasificación de Riesgo, Histórico de Riesgo  
- Portal para Padres, Comunicación, Reportes y Estadísticas  

Indica paso a paso cómo realizar la acción deseada, qué módulo usar, y qué datos necesita tener el usuario a la mano.  
Responde siempre de forma clara, directa y con tono profesional pero accesible.

Las rutas de navegación del sistema son las siguientes:
- Dashboard principal: /
- Estudiantes: /estudiantes
- Grupos: /grupos
- Materias: /materias
- Asignaciones: /asignaciones
- Calificaciones: /calificaciones
- Asistencias: /asistencias
- Boletas: /boletas
- Conceptos de Pago: /conceptos-pago
- Adeudos: /adeudos
- Pagos: /pagos
- Estado de Cuenta: /estado-cuenta
- Clasificación de Riesgo: /clasificacion-riesgo
- Histórico de Riesgo: /historico-riesgo
- Portal para Padres: /portal-padres
- Reportes: /reportes
- Tareas: /tareas
- Comunicación: /comunicacion

Incluye estas rutas en tus respuestas cuando sean relevantes para guiar al usuario.`;

/**
 * Genera un sistema prompt personalizado basado en el contexto del usuario
 */
export function generateSystemPrompt(userContext?: UserContextData | null): string {
  // Si no hay contexto de usuario, devolver el prompt base
  if (!userContext) {
    return BASE_SYSTEM_PROMPT;
  }
  
  // Construir el prompt personalizado
  let customPrompt = BASE_SYSTEM_PROMPT;
  
  // Agregar información contextual del usuario
  customPrompt += `\n\nInformación del usuario actual:
- Rol: ${userContext.rol}
- Nombre: ${userContext.nombreUsuario}`;
  
  // Agregar estadísticas relevantes según el rol
  if (Object.keys(userContext.estadisticas).length > 0) {
    customPrompt += `\n\nEstadísticas relevantes:`;
    
    if (userContext.estadisticas.totalAlumnos !== undefined) {
      customPrompt += `\n- Total de alumnos: ${userContext.estadisticas.totalAlumnos}`;
    }
    
    if (userContext.estadisticas.alumnosConAdeudos !== undefined) {
      customPrompt += `\n- Alumnos con adeudos: ${userContext.estadisticas.alumnosConAdeudos}`;
    }
    
    if (userContext.estadisticas.pagosVencidos !== undefined) {
      customPrompt += `\n- Pagos vencidos: ${userContext.estadisticas.pagosVencidos}`;
    }
    
    if (userContext.estadisticas.recordatoriosPendientes !== undefined) {
      customPrompt += `\n- Recordatorios pendientes: ${userContext.estadisticas.recordatoriosPendientes}`;
    }
    
    if (userContext.estadisticas.tareasProximas !== undefined) {
      customPrompt += `\n- Tareas próximas a vencer: ${userContext.estadisticas.tareasProximas}`;
    }
  }
  
  // Instrucciones específicas basadas en el rol
  customPrompt += `\n\nCuando respondas, ten en cuenta que estás hablando con un ${userContext.rol} y adapta tus respuestas a sus necesidades específicas.`;
  
  // Instrucciones adicionales basadas en estadísticas
  if (userContext.estadisticas.pagosVencidos && userContext.estadisticas.pagosVencidos > 0) {
    customPrompt += `\nHay ${userContext.estadisticas.pagosVencidos} pagos vencidos en el sistema. Si el usuario pregunta sobre pagos, menciona esta información.`;
  }
  
  if (userContext.estadisticas.recordatoriosPendientes && userContext.estadisticas.recordatoriosPendientes > 0) {
    customPrompt += `\nHay ${userContext.estadisticas.recordatoriosPendientes} recordatorios pendientes de envío. Si el usuario pregunta sobre comunicación con padres, menciona esta información.`;
  }
  
  return customPrompt;
}

/**
 * Convierte las sugerencias personalizadas del contexto a QuickActionItems
 */
export function convertSuggestionsToQuickActions(
  suggestions: SugerenciaPersonalizada[]
): QuickActionItem[] {
  return suggestions.map(suggestion => ({
    label: suggestion.texto,
    prompt: suggestion.prompt,
    category: suggestion.categoria,
    priority: suggestion.prioridad,
    intent: suggestion.intent,
    navigateTo: suggestion.navigateTo,
    params: suggestion.params
  }));
}

// Sistema prompt por defecto (para compatibilidad)
export const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;