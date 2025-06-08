import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../logger';

// Verificar que la API key esté configurada
const API_KEY = process.env.ANTHROPIC_API_KEY;
console.log("Verificando ANTHROPIC_API_KEY en el servidor:");
console.log(`API KEY disponible: ${API_KEY ? 'Sí ✅' : 'No ❌'}`);
console.log(`Longitud de la clave: ${API_KEY?.length || 0} caracteres`);

if (!API_KEY) {
  logger.warn('⚠️ ANTHROPIC_API_KEY no configurada. El asistente IA usará respuestas simuladas.');
}

// Configura el cliente de Anthropic
const anthropic = new Anthropic({
  apiKey: API_KEY,
});

// El modelo más reciente de Anthropic es "claude-3-7-sonnet-20250219", lanzado el 24 de febrero de 2025
const MODEL = 'claude-3-7-sonnet-20250219';

// Prompt base para el sistema
const SYSTEM_PROMPT = `Eres un asistente inteligente dentro de un sistema ERP escolar llamado EduMex.  
Tu trabajo es guiar al personal administrativo para realizar operaciones dentro del sistema de forma eficiente y precisa.  

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

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantRequest {
  messages: AssistantMessage[];
  userRole?: string | null;
  systemPrompt?: string;
}

/**
 * Verifica si hay una API key válida configurada
 */
export const isAssistantConfigured = (): boolean => {
  return !!process.env.ANTHROPIC_API_KEY;
};

/**
 * Función para generar una respuesta simulada cuando no hay API key
 */
export const generateMockResponse = (message: string): string => {
  if (message.toLowerCase().includes('registrar pago')) {
    return "Para registrar un pago, sigue estos pasos:\n\n1. Ve al menú 'Pagos' en la barra lateral\n2. Haz clic en 'Nuevo Pago'\n3. Selecciona al estudiante\n4. Elige el concepto de pago\n5. Ingresa el monto y método de pago\n6. Completa los datos adicionales\n7. Haz clic en 'Guardar'\n\nNecesitarás tener a mano: ID del estudiante, concepto de pago y comprobante si aplica.";
  }
  
  if (message.toLowerCase().includes('consultar adeudo')) {
    return "Para consultar adeudos, sigue estos pasos:\n\n1. Ve al menú 'Adeudos' en la barra lateral\n2. Usa los filtros para encontrar el adeudo específico\n3. También puedes ir a 'Estado de Cuenta' y seleccionar un estudiante\n\nNecesitarás tener el nombre o ID del estudiante para realizar la consulta.";
  }
  
  return "Bienvenido al asistente de EduMex. Puedo ayudarte a navegar por el sistema y realizar tareas. ¿En qué puedo asistirte hoy?";
};

/**
 * Procesa una solicitud del asistente y devuelve una respuesta
 */
export const processAssistantRequest = async (request: AssistantRequest): Promise<string> => {
  try {
    // Si no hay API key configurada, verificar nuevamente y mostrar un mensaje de error detallado
    if (!isAssistantConfigured()) {
      logger.error('🔑 API KEY NO DISPONIBLE en processAssistantRequest()');
      console.error('🔑 API KEY en processAssistantRequest():', process.env.ANTHROPIC_API_KEY ? 'Disponible' : 'No disponible');
      
      const lastMessage = request.messages[request.messages.length - 1].content;
      logger.info(`Usando respuesta simulada para: "${lastMessage.substring(0, 50)}..."`);
      return generateMockResponse(lastMessage);
    }
    
    // Prepara el prompt basado en el prompt personalizado o el rol del usuario
    let systemPrompt = request.systemPrompt || SYSTEM_PROMPT;
    
    // Si no hay prompt personalizado pero hay rol de usuario, añadir información del rol
    if (!request.systemPrompt && request.userRole) {
      systemPrompt += `\n\nEstás asistiendo a un usuario con el rol: ${request.userRole}.`;
    }
    
    // Log para depuración
    console.log(`📨 Enviando mensaje a Claude (mensaje de ${request.messages[0].content.length} caracteres)`);
    
    // Realiza la solicitud a Claude
    const response = await anthropic.messages.create({
      model: MODEL,
      system: systemPrompt,
      messages: request.messages,
      max_tokens: 1024,
    });
    
    // Verificar respuesta
    if (!response.content || response.content.length === 0) {
      throw new Error('La respuesta de Claude no contiene contenido');
    }
    
    // Extraer y manejar texto de la respuesta
    const responseText = response.content[0].text;
    console.log(`✅ Respuesta recibida de Claude (${responseText.length} caracteres)`);
    
    // Devuelve la respuesta del modelo
    return responseText;
  } catch (error) {
    logger.error('Error al procesar la solicitud del asistente:', error);
    console.error('Detalles del error:', error instanceof Error ? error.message : String(error));
    return "Lo siento, encontré un problema al procesar tu solicitud. Por favor, intenta de nuevo más tarde.";
  }
};