import { getClaudeRecommendations, generateRecommendations } from "@/services/recommendations-service";
import { generateRecoveryPlanPDF } from "@/services/recovery-plan-pdf";

// Tipo para los datos del alumno
export type AlumnoData = {
  id: number;
  nombre: string;
  promedio: number;
  requierePlanRecuperacion?: boolean;
  materias: {
    id: number;
    nombre: string;
    promedio: number;
  }[];
};

/**
 * Verifica si hay recomendaciones IA disponibles para un alumno
 * @param alumno Datos del alumno
 * @param recomendacionesCached Cache de recomendaciones IA por alumno
 * @returns Recomendaciones IA o null si no hay disponibles
 */
export const verificarRecomendacionesIA = async (
  alumno: AlumnoData,
  recomendacionesCached: Record<number, any> = {}
): Promise<any> => {
  // Si ya tenemos las recomendaciones guardadas, reutilizarlas
  if (recomendacionesCached[alumno.id]) {
    return recomendacionesCached[alumno.id];
  }
  
  try {
    // Preparar los datos del alumno para solicitar recomendaciones
    const studentData = {
      id: alumno.id,
      nombre: alumno.nombre,
      promedio: alumno.promedio,
      materias: alumno.materias.map(mat => ({
        id: mat.id,
        nombre: mat.nombre,
        promedio: mat.promedio
      }))
    };
    
    // Intentar obtener recomendaciones de IA (Claude)
    const aiRecommendations = await getClaudeRecommendations(studentData);
    
    return aiRecommendations;
  } catch (error) {
    console.error("Error al obtener recomendaciones AI:", error instanceof Error ? error.message : "Error desconocido");
    return null;
  }
};

/**
 * Genera un PDF de plan de recuperación académica
 * @param alumno Datos del alumno
 * @param profesor Nombre del profesor
 * @param includeAI Incluir recomendaciones de IA
 * @param recomendacionesCached Cache de recomendaciones existentes
 * @param onSuccess Callback para éxito
 * @param onError Callback para error
 */
export const generarPlanRecuperacionPDF = async (
  alumno: AlumnoData,
  profesor: string,
  includeAI: boolean = true,
  recomendacionesCached: Record<number, any> = {},
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
): Promise<void> => {
  try {
    // Variables para el control de la IA
    let aiRecommendations = null;
    
    // Si se solicita inclusión de IA, intentar obtener recomendaciones
    if (includeAI) {
      aiRecommendations = await verificarRecomendacionesIA(alumno, recomendacionesCached);
    }
    
    // Generar el plan de recuperación con datos básicos
    const recoveryPlanData = {
      student: {
        id: alumno.id,
        nombre: alumno.nombre,
        apellido: "",
        promedio: alumno.promedio
      },
      teacher: profesor,
      subjects: alumno.materias.map(m => ({
        nombre: m.nombre,
        promedio: m.promedio
      })),
      date: new Date().toISOString(),
      recommendations: generateRecommendations({
        id: alumno.id,
        nombre: alumno.nombre,
        promedio: alumno.promedio,
        materias: alumno.materias
      }),
      goals: [
        "Mejorar el rendimiento académico del estudiante.",
        "Desarrollar hábitos de estudio eficientes.",
        "Fomentar la participación activa en clase."
      ],
      autoGenerateRecommendations: false,
      aiRecommendations: aiRecommendations
    };
    
    // Generar el PDF
    await generateRecoveryPlanPDF(recoveryPlanData);
    
    // Notificar éxito
    if (onSuccess) {
      onSuccess(`Plan de recuperación para ${alumno.nombre} ${includeAI ? 'con' : 'sin'} recomendaciones IA.`);
    }
  } catch (error) {
    console.error("Error al generar PDF del plan de recuperación:", error instanceof Error ? error.message : "Error desconocido");
    
    // Notificar error
    if (onError) {
      onError("Ocurrió un problema al generar el plan de recuperación. Por favor, intente de nuevo.");
    }
  }
};