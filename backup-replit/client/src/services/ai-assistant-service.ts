import { apiRequest } from "@/lib/queryClient";

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequest {
  messages: AssistantMessage[];
  userRole?: string | null;
  systemPrompt?: string;
}

export interface AssistantResponse {
  response: string;
  success: boolean;
}

/**
 * Servicio que interactúa con la API de Claude (Anthropic) para proporcionar
 * asistencia guiada al usuario.
 */
export const AIAssistantService = {
  /**
   * Envía una solicitud al asistente IA y recibe una respuesta.
   * 
   * @param userMessage - Mensaje del usuario
   * @param userRole - Rol del usuario actual (opcional)
   * @param systemPrompt - Prompt de sistema personalizado basado en contexto (opcional)
   * @returns La respuesta del asistente
   */
  async sendMessage(
    userMessage: string, 
    userRole?: string | null,
    systemPrompt?: string
  ): Promise<AssistantResponse> {
    try {
      console.log("🤖 Enviando mensaje al asistente:", {
        mensaje: userMessage.substring(0, 50) + "...",
        rol: userRole,
        promptPersonalizado: !!systemPrompt
      });
      
      // Crear el mensaje en el formato esperado por el servidor
      const messages = [
        {
          role: "user",
          content: userMessage
        }
      ];
      
      // Enviar tanto el mensaje único como el array para mayor compatibilidad
      const response = await apiRequest('POST', '/api/assistant/chat', {
        message: userMessage,
        messages,
        userRole,
        systemPrompt
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("❌ Error al recibir respuesta del servidor:", data);
        throw new Error(data.message || 'Error al comunicarse con el asistente');
      }
      
      // Verificar que la respuesta tenga el formato correcto
      if (!data.response) {
        console.error("❌ Formato de respuesta incorrecto:", data);
        throw new Error('Formato de respuesta inválido');
      }
      
      console.log("✅ Respuesta del asistente recibida exitosamente");
      
      return {
        response: data.response,
        success: true
      };
    } catch (error) {
      console.error('Error en el servicio del asistente IA:', error);
      return {
        response: 'Lo siento, no pude procesar tu solicitud en este momento. Por favor, intenta de nuevo más tarde.',
        success: false
      };
    }
  }
};