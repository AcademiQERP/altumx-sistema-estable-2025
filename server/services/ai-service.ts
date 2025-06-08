import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";
import { RiskSnapshot, InsertRiskSnapshot } from "@shared/schema";
import { storage } from "../storage";

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

// Modelo a utilizar - el más reciente disponible
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const MODEL = "claude-3-7-sonnet-20250219";

/**
 * Genera un resumen financiero utilizando IA
 *
 * @param data Datos financieros para analizar
 * @returns Un resumen textual generado por IA
 */
async function generarResumenFinanciero(data: any, userId?: string) {
  try {
    // Log detallado de los parámetros recibidos
    console.log(
      "[DEBUG IA] generarResumenFinanciero iniciado con userId:",
      userId,
    );
    console.log(
      "[DEBUG IA] Datos recibidos:",
      JSON.stringify(
        {
          mes: data.mes,
          anio: data.anio,
          grupoId: data.grupoId,
          conceptoId: data.conceptoId,
        },
        null,
        2,
      ),
    );

    // Creamos un prompt estructurado con los datos financieros
    const systemPrompt = `
Eres un asistente financiero escolar especializado. Analiza estos datos de cobranza y genera un resumen
ejecutivo profesional para el administrador de la escuela.

Estructura tu respuesta en las siguientes secciones claras:

1. RESUMEN GENERAL (máximo 3 párrafos)
   - Incluye el total recaudado, total adeudado, porcentaje de cumplimiento.
   - Menciona tendencias importantes y compáralas con períodos anteriores.
   - Destaca los conceptos más comunes de pago.

2. PUNTOS DESTACADOS
   - Muestra 3-5 puntos clave en formato de lista.
   - Destaca grupos o segmentos con mejor/peor desempeño.
   - Menciona patrones significativos en las tendencias de pago.

3. ÁREAS DE ATENCIÓN
   - Identifica claramente los grupos con mayor morosidad.
   - Menciona los casos específicos más críticos que requieren atención inmediata.
   - Sugiere estrategias para mejorar la recuperación en las áreas problemáticas.

4. RECOMENDACIONES ACCIONABLES
   - Proporciona 3-4 recomendaciones prácticas.
   - Enfócate en acciones concretas para mejorar la recuperación financiera.
   - Sugiere plazos y responsables donde sea apropiado.

Sé conciso pero completo. Usa lenguaje claro y profesional. Evita repetir números exactos más de lo necesario.
Aporta ideas valiosas y accionables en lugar de simplemente resumir datos obvios.
`;

    logger.info("Enviando solicitud a Claude para generar resumen financiero");

    // Llamamos a la API de Claude
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Aquí están los datos financieros para analizar: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    // Obtenemos el texto generado
    const contenido = response.content[0];
    if (
      "type" in contenido &&
      contenido.type === "text" &&
      "text" in contenido
    ) {
      const resumen = contenido.text;

      logger.info("Resumen financiero generado con éxito");

      // Si se proporciona un ID de usuario, guardar el resumen en la base de datos
      if (userId) {
        try {
          console.log(
            "[DEBUG IA] Intentando guardar resumen en la base de datos para userId:",
            userId,
          );

          // Obtener mes y año de los datos o usar la fecha actual
          const today = new Date();
          const month = data.mes || today.getMonth() + 1;
          const year = data.anio || today.getFullYear();

          // Preparar filtros para guardar
          const filters = {
            mes: month,
            anio: year,
            grupoId: data.grupoId || null,
            estado: data.estado || null,
          };

          console.log(
            "[DEBUG IA] Guardando resumen con filtros:",
            JSON.stringify(filters, null, 2),
          );

          // Guardar en la base de datos
          const saveResult = await saveFinancialSummary(
            userId,
            resumen,
            filters,
          );
          console.log(
            "[DEBUG IA] Resultado de guardar resumen:",
            JSON.stringify(saveResult, null, 2),
          );

          if (saveResult.success) {
            logger.info(
              "Resumen financiero guardado en la base de datos con ID:",
              saveResult.summary?.id,
            );
          } else {
            logger.error(
              "Error al guardar el resumen en la base de datos:",
              saveResult.error,
            );
          }
        } catch (saveError) {
          console.log("[DEBUG IA] Error al guardar resumen:", saveError);
          logger.error(
            "Error al guardar el resumen financiero en la base de datos:",
            saveError,
          );
          // No lanzamos error para no interrumpir el flujo principal
        }
      } else {
        console.log(
          "[DEBUG IA] No se guardó el resumen porque no se proporcionó userId",
        );
      }

      return { success: true, resumen };
    } else {
      throw new Error("El formato de respuesta de Claude no es el esperado");
    }
  } catch (error) {
    console.log("[DEBUG IA] Error en generarResumenFinanciero:", error);
    logger.error("Error generando resumen financiero con IA:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al generar el resumen",
    };
  }
}

/**
 * Predice el nivel de riesgo de un estudiante basado en su historial financiero
 *
 * @param prompt El texto con información del estudiante para analizar
 * @returns La predicción de riesgo en formato JSON
 */
async function predictRisk(prompt: string) {
  try {
    const systemPrompt = `
Eres un analista financiero especializado en evaluación de riesgo crediticio para instituciones educativas. 
Tu tarea es analizar el historial de pagos de un estudiante y predecir su nivel de riesgo para futuros pagos.
Basándote en los datos proporcionados, clasifica al estudiante en una de las siguientes categorías:

1. RIESGO BAJO: Historial de pagos excelente, pocos o ningún pago atrasado, alta probabilidad de pago puntual.
2. RIESGO MEDIO: Algunos retrasos ocasionales en pagos, pero generalmente cumple con sus obligaciones.
3. RIESGO ALTO: Múltiples pagos atrasados, largos períodos de mora, alta probabilidad de incumplimiento.

IMPORTANTE: Tu respuesta debe ser un objeto JSON con los siguientes campos:
- nivelRiesgo: "BAJO", "MEDIO" o "ALTO" (en mayúsculas)
- probabilidadPagoATiempo: número entre 0 y 1 (donde 1 es 100%)
- justificacion: breve explicación de tu evaluación (máximo 3 frases)
- recomendacion: sugerencia concreta para la administración escolar

NO incluyas ningún texto adicional, SOLO el objeto JSON. Tu respuesta debe ser válida para JSON.parse().
`;

    logger.info("Enviando solicitud de predicción de riesgo a Claude");

    const response = await anthropic.messages.create({
      model: MODEL,
      system: systemPrompt,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const contenido = response.content[0];
    if (
      "type" in contenido &&
      contenido.type === "text" &&
      "text" in contenido
    ) {
      const responseText = contenido.text.trim();

      // Intentar extraer el JSON de la respuesta
      try {
        const prediction = JSON.parse(responseText);
        logger.info("Predicción de riesgo generada con éxito", { prediction });
        return { success: true, prediction };
      } catch (parseError) {
        logger.error("Error al parsear la respuesta JSON de Claude", {
          responseText,
        });
        return {
          success: false,
          error: "La respuesta de la IA no pudo ser procesada como JSON válido",
        };
      }
    } else {
      throw new Error("El formato de respuesta de Claude no es el esperado");
    }
  } catch (error) {
    logger.error("Error en predictRisk:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido en la predicción de riesgo",
    };
  }
}

/**
 * Guarda una predicción de riesgo en la base de datos
 *
 * @param studentId ID del estudiante
 * @param prediction Predicción generada por la IA
 * @returns Resultado de la operación
 */
async function saveRiskPrediction(studentId: number, prediction: any) {
  try {
    logger.info("Guardando predicción de riesgo para estudiante", {
      studentId,
    });

    const student = await storage.getStudent(studentId);
    if (!student) {
      return {
        success: false,
        error: `No se encontró estudiante con ID ${studentId}`,
      };
    }

    const today = new Date();
    const month = today.toLocaleString("es-MX", { month: "long" });
    const year = today.getFullYear();

    // Convertir nivel de riesgo al formato esperado por la base de datos
    let riskLevel: "bajo" | "medio" | "alto";
    switch (prediction.nivelRiesgo) {
      case "BAJO":
        riskLevel = "bajo";
        break;
      case "MEDIO":
        riskLevel = "medio";
        break;
      case "ALTO":
        riskLevel = "alto";
        break;
      default:
        riskLevel = "medio"; // Valor por defecto
    }

    // Crear snapshot de riesgo
    const snapshot: InsertRiskSnapshot = {
      studentId: student.id,
      month,
      year,
      riskLevel,
      totalDebt: prediction.totalDeuda || "0",
      totalPaid: prediction.totalPagado || "0",
      duePayments: prediction.pagosVencidos || 0,
      onTimePayments: prediction.pagosATiempo || 0,
    };

    const savedSnapshot = await storage.createRiskSnapshot(snapshot);

    return {
      success: true,
      savedPrediction: savedSnapshot,
    };
  } catch (error) {
    logger.error("Error guardando predicción de riesgo:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al guardar la predicción",
    };
  }
}

/**
 * Obtiene todas las predicciones de riesgo para un estudiante
 *
 * @param studentId ID del estudiante
 * @returns Array de predicciones
 */
async function getStudentRiskPredictions(
  studentId: number,
): Promise<RiskSnapshot[]> {
  try {
    return await storage.getRiskSnapshotsByStudent(studentId);
  } catch (error) {
    logger.error("Error obteniendo predicciones de riesgo:", error);
    throw error;
  }
}

/**
 * Guarda un resumen financiero generado por IA en la base de datos
 *
 * @param userId ID del usuario que generó el resumen
 * @param resumen Texto del resumen generado
 * @param filters Filtros aplicados (opcional)
 * @returns Resultado de la operación
 */
async function saveFinancialSummary(
  userId: string,
  resumen: string,
  filters?: {
    mes?: number;
    anio?: number;
    grupoId?: number;
    estado?: string;
  },
) {
  try {
    console.log("[DEBUG IA] saveFinancialSummary iniciado");
    console.log("[DEBUG IA] userId recibido:", userId);
    console.log(
      "[DEBUG IA] Longitud del resumen:",
      resumen.length,
      "caracteres",
    );
    console.log("[DEBUG IA] Filters:", JSON.stringify(filters, null, 2));

    logger.info("Guardando resumen financiero en base de datos", { userId });

    const today = new Date();
    const month = filters?.mes || today.getMonth() + 1; // getMonth() es 0-indexado
    const year = filters?.anio || today.getFullYear();

    console.log("[DEBUG IA] Valores a guardar: mes:", month, "año:", year);

    // Datos a insertar
    const dataToInsert = {
      usuarioId: userId,
      anio: year,
      mes: month,
      resumenTexto: resumen,
      metadatos: filters ? JSON.stringify(filters) : null,
    };

    console.log(
      "[DEBUG IA] Datos a insertar:",
      JSON.stringify(
        {
          usuarioId: dataToInsert.usuarioId,
          anio: dataToInsert.anio,
          mes: dataToInsert.mes,
          resumenTextoLength: dataToInsert.resumenTexto.length,
          metadatos: dataToInsert.metadatos,
        },
        null,
        2,
      ),
    );

    // Crear entrada en la bitácora
    console.log("[DEBUG IA] Ejecutando storage.createAIFinancialSummary...");
    const summary = await storage.createAIFinancialSummary(dataToInsert);

    console.log(
      "[DEBUG IA] Resultado de la inserción:",
      JSON.stringify(
        {
          id: summary?.id,
          anio: summary?.anio,
          mes: summary?.mes,
          fechaGeneracion: summary?.fechaGeneracion,
        },
        null,
        2,
      ),
    );

    logger.info("Resumen financiero guardado correctamente", {
      summaryId: summary.id,
    });

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.log("[DEBUG IA] Error en saveFinancialSummary:", error);
    logger.error("Error guardando resumen financiero:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al guardar el resumen",
    };
  }
}

/**
 * Obtiene todos los resúmenes financieros almacenados en la base de datos
 *
 * @returns Lista de resúmenes financieros
 */
async function getFinancialSummaries() {
  try {
    const summaries = await storage.getAIFinancialSummaries();
    return {
      success: true,
      summaries,
    };
  } catch (error) {
    logger.error("Error obteniendo resúmenes financieros:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al obtener los resúmenes",
    };
  }
}

// Objeto que agrupa todas las funcionalidades relacionadas con IA
export const aiService = {
  generarResumenFinanciero,
  predictRisk,
  saveRiskPrediction,
  getStudentRiskPredictions,
  saveFinancialSummary,
  getFinancialSummaries,
};
