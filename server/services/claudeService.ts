import Anthropic from "@anthropic-ai/sdk";

// Verificamos que exista una API key válida para Anthropic Claude
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.warn(
    "ANTHROPIC_API_KEY no está configurada. Se utilizarán respuestas simuladas.",
  );
}

// Inicializamos el cliente de Anthropic
const anthropic = new Anthropic({
  apiKey: apiKey,
});

/**
 * Envía un prompt a Claude y devuelve la respuesta como texto
 * @param prompt El prompt a enviar a Claude
 * @returns La respuesta de Claude como texto
 */
export async function enviarPromptAClaude(prompt: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return response.content[0].text;
  } catch (error) {
    console.error("Error al comunicarse con Claude:", error);
    throw new Error(`Error al comunicarse con Claude: ${error.message}`);
  }
}

/**
 * Envía un prompt a Claude y devuelve la respuesta como JSON estructurado
 * @param prompt El prompt a enviar a Claude
 * @param schemaType Instrucciones para el formato JSON esperado
 * @returns La respuesta de Claude como objeto JSON
 */
export async function enviarPromptAClaudeJSON<T>(prompt: string, schemaType: string): Promise<T> {
  try {
    // Añadimos instrucciones específicas para formato JSON
    const jsonPrompt = `${prompt}
    
    IMPORTANTE: Debes responder únicamente con un objeto JSON válido siguiendo esta estructura:
    ${schemaType}
    
    No incluyas texto adicional, comentarios, explicaciones o markdown, solo el objeto JSON válido.`;

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 4000,
      messages: [{ role: "user", content: jsonPrompt }],
      temperature: 0.5,
      system: "Eres un asistente educativo especializado en generar datos estructurados en formato JSON. Debes responder siempre con JSON válido según el esquema solicitado."
    });

    const jsonText = response.content[0].text.trim();
    
    // Intentamos parsear el resultado como JSON
    try {
      const jsonResponse = JSON.parse(jsonText);
      return jsonResponse as T;
    } catch (parseError) {
      console.error("Error al parsear respuesta JSON de Claude:", parseError);
      
      // Si falla, hacemos un intento de limpieza de posibles caracteres markdown
      const cleanedText = jsonText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
        
      try {
        const jsonResponse = JSON.parse(cleanedText);
        return jsonResponse as T;
      } catch (secondParseError) {
        throw new Error(`No se pudo obtener una respuesta JSON válida: ${secondParseError.message}`);
      }
    }
  } catch (error) {
    console.error("Error al comunicarse con Claude para JSON:", error);
    throw new Error(`Error al comunicarse con Claude para JSON: ${error.message}`);
  }
}

/**
 * Genera un prompt para análisis educativo basado en los datos del estudiante
 */
export function generarPromptIA(
  nombre: string,
  datosAcademicos: any,
  asistencia: any,
  finanzas: any,
): string {
  return `
Eres una inteligencia artificial educativa. Genera un análisis detallado y profesional del desempeño del estudiante **${nombre}** con base en sus calificaciones, asistencias y estado financiero. Divide el análisis en las siguientes secciones:

1. Resumen General  
2. Análisis Académico por Materia  
3. Registro de Asistencia  
4. Resumen Financiero  
5. Recomendaciones del Análisis IA  
6. Nota del Tutor

=== DATOS DEL ESTUDIANTE ===
📚 Calificaciones:
${datosAcademicos.materias.map((d) => `- ${d.nombre}: ${d.calificacion}`).join("\n")}

📅 Asistencia:
${asistencia.periodos.map((a) => `- ${a.mes}: ${a.porcentaje}% (${a.tendencia})`).join("\n")}

💰 Finanzas:
- Pagado este mes: ${finanzas.pagadoMes}
- Adeudo actual: ${finanzas.adeudoActual}

Genera el reporte con un tono profesional pero accesible para padres de familia.
`.trim();
}
