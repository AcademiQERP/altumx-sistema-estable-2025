import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";

// Inicializamos el cliente de Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Interfaz para los datos de entrada
export interface RiskPredictionInput {
  student_name: string;
  student_id: number;
  total_debt: string;
  percentage_on_time: number;
  average_delay_days: number;
  active_debts: number;
  payment_history: string;
  group_risk_level: string;
  group_name: string;
  school_level: string;
  // Prompt estructurado en formato JSON (opcional)
  structured_prompt?: string;
}

// Interfaz para el resultado
export interface RiskPredictionResult {
  risk_level: "bajo" | "medio" | "alto";
  justification: string;
}

/**
 * Genera un prompt para Claude basado en los datos del estudiante
 * Si se proporciona un prompt estructurado en formato JSON, lo utiliza en lugar del formato simple
 */
function generatePrompt(data: RiskPredictionInput): string {
  // Si hay un prompt estructurado en formato JSON, lo usamos
  if (data.structured_prompt) {
    return `Tú eres un analista inteligente de comportamiento financiero en un sistema escolar. 
Se te proporcionará un prompt estructurado en formato JSON con toda la información necesaria para analizar el riesgo de pago futuro de un estudiante.

A continuación, el prompt JSON:
${data.structured_prompt}

Con base en estos datos, analiza el caso y determina si el estudiante representa un riesgo BAJO, MEDIO o ALTO para pagos futuros.

INSTRUCCIONES IMPORTANTES:
1. Responde ÚNICAMENTE con el objeto JSON. No añadas ningún texto antes o después.
2. No utilices formato markdown (como acentos graves o bloques de código).
3. El JSON debe tener exactamente esta estructura:
{"risk_level": "bajo|medio|alto", "justification": "Tu justificación aquí"}
4. La justificación debe ser breve (máximo 2 líneas).
5. El valor de risk_level debe ser exactamente: "bajo", "medio", o "alto".
`;
  }

  // Si no hay prompt estructurado, usamos el formato simple
  return `Tú eres un analista inteligente de comportamiento financiero en un sistema escolar. Se te proporcionarán los siguientes datos sobre un estudiante y deberás predecir su nivel de riesgo de pago futuro:

- Nombre: ${data.student_name}
- Monto total vencido: ${data.total_debt}
- % de pagos realizados a tiempo: ${data.percentage_on_time}%
- Días promedio de retraso en pagos anteriores: ${data.average_delay_days}
- Número de adeudos activos: ${data.active_debts}
- Historial de pagos: ${data.payment_history}
- Riesgo promedio del grupo académico: ${data.group_risk_level}
- Nombre del grupo: ${data.group_name}
- Nivel escolar: ${data.school_level}

Con base en estos datos, responde con uno de los siguientes niveles: alto, medio o bajo.  

INSTRUCCIONES IMPORTANTES:
1. Responde ÚNICAMENTE con el objeto JSON. No añadas ningún texto antes o después.
2. No utilices formato markdown (como acentos graves o bloques de código).
3. El JSON debe tener exactamente esta estructura:
{"risk_level": "bajo|medio|alto", "justification": "Tu justificación aquí"}
4. La justificación debe ser breve (máximo 2 líneas).
5. El valor de risk_level debe ser exactamente: "bajo", "medio", o "alto".
`;
}

/**
 * Envía una solicitud a Claude para predecir el nivel de riesgo
 */
export async function predictRiskWithAI(
  data: RiskPredictionInput
): Promise<RiskPredictionResult> {
  try {
    logger.info(`Solicitando predicción de riesgo para estudiante ID: ${data.student_id}`);
    
    // El modelo más reciente de Anthropic es "claude-3-7-sonnet-20250219"
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: generatePrompt(data),
        },
      ],
      temperature: 0.5, // Valor bajo para respuestas más consistentes
      system: "Eres un asistente experto en análisis financiero educativo. Tus respuestas son concisas, basadas en datos y SIEMPRE en formato JSON sin ningún formato markdown o bloques de código. Responde directamente con el objeto JSON sin ningún texto adicional antes o después.",
    });

    // Extraemos la respuesta de Claude y la convertimos a JSON
    const content = response.content[0].text;
    try {
      logger.info(`Respuesta de Claude recibida: ${content}`);
      
      // Extraer JSON de la respuesta en formato markdown
      let jsonContent = content;
      
      // Si la respuesta contiene bloques de código markdown, extraemos el contenido JSON
      if (content.includes("```json")) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1].trim();
        }
      } else if (content.includes("```")) {
        // Intenta extraer cualquier bloque de código
        const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch && codeMatch[1]) {
          jsonContent = codeMatch[1].trim();
        }
      }
      
      logger.info(`JSON extraído: ${jsonContent}`);
      
      // Intentamos parsear el JSON
      const result = JSON.parse(jsonContent);
      
      // Validamos que la respuesta tenga el formato esperado
      if (!result.risk_level || !result.justification) {
        throw new Error("Formato de respuesta inválido");
      }
      
      // Aseguramos que el valor de risk_level sea uno de los valores esperados
      if (!["bajo", "medio", "alto"].includes(result.risk_level.toLowerCase())) {
        result.risk_level = "medio"; // Valor por defecto
      }
      
      return {
        risk_level: result.risk_level.toLowerCase() as "bajo" | "medio" | "alto",
        justification: result.justification
      };
    } catch (parseError) {
      logger.error("Error al parsear la respuesta de Claude:", parseError);
      
      // Si no podemos parsear la respuesta, intentamos extraer la información manualmente
      let riskLevel = "medio";
      if (content.includes("Alto Riesgo")) {
        riskLevel = "alto";
      } else if (content.includes("Bajo Riesgo")) {
        riskLevel = "bajo";
      }
      
      // Extraemos alguna parte del texto como justificación
      const justification = content.split("\n").find(line => 
        !line.includes("Riesgo") && line.length > 10
      ) || "Basado en el análisis de los datos financieros del estudiante.";
      
      return {
        risk_level: riskLevel as "bajo" | "medio" | "alto",
        justification: justification.slice(0, 120) // Limitamos el tamaño
      };
    }
  } catch (error) {
    logger.error("Error al realizar predicción con Claude:", error);
    throw new Error("Error al procesar la predicción de riesgo");
  }
}

/**
 * Simulación de predicción para desarrollo y pruebas
 */
export function simulatePrediction(
  data: RiskPredictionInput
): RiskPredictionResult {
  // Establecemos un nivel de riesgo predeterminado basado en datos simples
  let riskLevel: "bajo" | "medio" | "alto" = "medio";
  let historialInfo = "";
  
  // Si hay un prompt estructurado, intentamos extraer información adicional de él
  if (data.structured_prompt) {
    try {
      const promptData = JSON.parse(data.structured_prompt);
      // Si hay datos de pagos recientes, usamos esa información para determinar el riesgo
      if (promptData.datos_estudiante?.historial_pagos?.length > 0) {
        const pagos = promptData.datos_estudiante.historial_pagos;
        // Calcular cuántos pagos tienen retraso
        const pagosConRetraso = pagos.filter(p => p.estado?.toLowerCase().includes('retraso')).length;
        const porcentajeRetraso = (pagosConRetraso / pagos.length) * 100;
        
        // Determinar nivel de riesgo basado en porcentaje de pagos con retraso
        if (porcentajeRetraso < 20) {
          riskLevel = "bajo";
        } else if (porcentajeRetraso > 50) {
          riskLevel = "alto";
        }
        
        historialInfo = ` basado en historial de ${pagos.length} pagos`;
      }
    } catch (error) {
      // Si hay error al parsear el JSON, ignoramos y seguimos con la lógica simple
      console.log("Error al parsear prompt estructurado:", error);
    }
  }
  
  // Lógica simple basada en porcentaje de pagos a tiempo y deuda si no hay prompt estructurado
  // o si no pudimos extraer suficiente información del prompt
  if (!data.structured_prompt || !historialInfo) {
    if (data.percentage_on_time > 80 && data.average_delay_days < 5) {
      riskLevel = "bajo";
    } else if (data.percentage_on_time < 50 || data.average_delay_days > 15) {
      riskLevel = "alto";
    }
  }
  
  // Generamos una justificación basada en los datos
  let justification = "";
  if (riskLevel === "bajo") {
    justification = `${data.percentage_on_time}% de pagos a tiempo y retrasos promedio bajos de ${data.average_delay_days} días${historialInfo}.`;
  } else if (riskLevel === "medio") {
    justification = `Historial de pagos mixto con ${data.percentage_on_time}% a tiempo y ${data.average_delay_days} días de retraso${historialInfo}.`;
  } else {
    justification = `Solo ${data.percentage_on_time}% de pagos a tiempo y retrasos de ${data.average_delay_days} días en promedio${historialInfo}.`;
  }
  
  return {
    risk_level: riskLevel,
    justification
  };
}