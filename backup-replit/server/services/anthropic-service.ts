import Anthropic from '@anthropic-ai/sdk';

// El modelo más nuevo de Anthropic es "claude-3-7-sonnet-20250219" que fue lanzado el 24 de febrero de 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SuggestionResponse {
  suggestions: string[];
}

interface PriorityResponse {
  priority: 'alta' | 'media' | 'baja';
  reason: string;
}

interface SummaryResponse {
  summary: string;
}

interface ChatbotResponse {
  response: string;
}

interface StudentAcademicData {
  id: number;
  nombre: string;
  grado: string;
  promedio: number;
  materias: Array<{
    id?: number;
    nombre: string;
    promedio: number;
  }>;
  observaciones?: string;
}

interface AIRecommendationsResponse {
  recomendaciones: string;
  error?: string;
}

interface StudentContext {
  nombreEstudiante: string;
  promedios: {
    materia: string;
    calificacion: number;
  }[];
  promedioGeneral: number;
  asistencia: {
    porcentaje: number;
    presente: number;
    total: number;
  };
  tareasPendientes?: {
    materia: string;
    titulo: string;
    fechaEntrega: string;
  }[];
  estadoCuenta?: {
    totalDeuda: number;
    totalPagado: number;
    balance: number;
    deudas: any[];
  };
}

/**
 * Genera sugerencias de respuesta rápida basadas en el contenido del mensaje recibido
 */
export async function generateResponseSuggestions(messageContent: string, senderRole: string): Promise<string[]> {
  try {
    console.log(`[DEBUG] Generando sugerencias para mensaje de rol: ${senderRole}`);
    console.log(`[DEBUG] Contenido del mensaje (primeros 50 caracteres): ${messageContent.substring(0, 50)}`);
    
    const systemPrompt = `Eres un asistente educativo para un sistema de mensajería escolar. 
    Basado en este mensaje de un usuario con rol "${senderRole}", genera EXACTAMENTE 3 sugerencias de respuesta cortas 
    (máximo 7 palabras cada una). Las respuestas deben ser profesionales, útiles y relevantes al mensaje recibido.
    Devuelve solo un array JSON con las 3 sugerencias, sin explicaciones ni otro texto.`;

    console.log(`[DEBUG] Enviando solicitud a API de Anthropic Claude`);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 150,
      system: systemPrompt,
      messages: [
        { role: 'user', content: messageContent }
      ],
    });

    // Intentar extraer el JSON del texto de respuesta
    const content = response.content[0].text;
    console.log(`[DEBUG] Respuesta de Claude recibida: ${content.substring(0, 100)}`);
    
    try {
      // Buscar un array en el texto de respuesta usando una expresión regular
      const match = content.match(/\[.*?\]/s);
      if (match) {
        console.log(`[DEBUG] Encontrado array en la respuesta: ${match[0]}`);
        const parsedSuggestions = JSON.parse(match[0]);
        const suggestions = parsedSuggestions.slice(0, 3); // Asegurar que haya exactamente 3 sugerencias
        console.log(`[DEBUG] Sugerencias generadas: ${JSON.stringify(suggestions)}`);
        return suggestions;
      }
      
      // Si no se puede encontrar un array, intentar analizar todo el contenido
      console.log(`[DEBUG] Intentando analizar como JSON completo`);
      const parsedResponse = JSON.parse(content);
      if (Array.isArray(parsedResponse)) {
        console.log(`[DEBUG] Respuesta es un array de ${parsedResponse.length} elementos`);
        const suggestions = parsedResponse.slice(0, 3);
        console.log(`[DEBUG] Sugerencias generadas: ${JSON.stringify(suggestions)}`);
        return suggestions;
      } else if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
        console.log(`[DEBUG] Respuesta es un objeto con array de sugerencias`);
        const suggestions = parsedResponse.suggestions.slice(0, 3);
        console.log(`[DEBUG] Sugerencias generadas: ${JSON.stringify(suggestions)}`);
        return suggestions;
      }
    } catch (parseError) {
      console.error("[DEBUG] Error al analizar sugerencias:", parseError);
      // Fallback: extraer líneas que parezcan sugerencias
      const lines = content.split('\n').filter(line => 
        line.trim().length > 0 && 
        line.trim().length < 50 && 
        !line.includes('{') && 
        !line.includes('}')
      );
      if (lines.length > 0) {
        const suggestions = lines.slice(0, 3).map(line => line.replace(/^["'\d\s.]+/, '').trim());
        console.log(`[DEBUG] Extrayendo sugerencias de texto: ${JSON.stringify(suggestions)}`);
        return suggestions;
      }
    }

    // Si todo falla, devolver sugerencias predeterminadas
    console.log(`[DEBUG] Usando sugerencias predeterminadas como último recurso`);
    return [
      "Entendido, gracias.",
      "¿Podría proporcionar más detalles?",
      "Lo revisaré pronto."
    ];
  } catch (error) {
    console.error("[DEBUG] Error generando sugerencias:", error);
    return [
      "Entendido, gracias.",
      "¿Podría proporcionar más detalles?",
      "Lo revisaré pronto."
    ];
  }
}

/**
 * Analiza el contenido del mensaje para determinar su prioridad
 */
export async function determinePriority(
  subject: string, 
  content: string, 
  senderRole: string
): Promise<'alta' | 'media' | 'baja'> {
  try {
    const systemPrompt = `Eres un sistema de análisis de prioridad de mensajes para una escuela.
    Analiza el asunto y contenido del mensaje para determinar su prioridad: "alta", "media", o "baja".
    
    Criterios para prioridad alta:
    - Contiene palabras como "urgente", "inmediato", "emergencia"
    - Menciona temas críticos como "accidente", "problema grave", "cancelación"
    - Proviene de administradores o directivos con temas importantes
    - Relacionado con seguridad o salud
    
    Criterios para prioridad media:
    - Solicitudes de información con plazos cercanos
    - Confirmaciones importantes
    - Comunicación regular de profesores sobre tareas o evaluaciones
    
    Criterios para prioridad baja:
    - Información general
    - Actualizaciones rutinarias
    - Mensajes sociales o saludos
    
    Devuelve SOLO UNA PALABRA: "alta", "media" o "baja", sin explicaciones ni otro texto.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 50,
      system: systemPrompt,
      messages: [
        { 
          role: 'user', 
          content: `Analiza este mensaje:
          Asunto: ${subject}
          Contenido: ${content}
          Remitente con rol: ${senderRole}`
        }
      ],
    });

    const priorityText = response.content[0].text.trim().toLowerCase();
    
    if (priorityText.includes('alta')) {
      return 'alta';
    } else if (priorityText.includes('media')) {
      return 'media';
    } else {
      return 'baja';
    }
  } catch (error) {
    console.error("Error determinando prioridad:", error);
    // En caso de error, asignar prioridad media por defecto
    return 'media';
  }
}

/**
 * Genera un resumen de una conversación larga
 */
export async function generateConversationSummary(messages: any[]): Promise<string> {
  try {
    if (messages.length < 5) {
      return ""; // No generar resumen para conversaciones cortas
    }

    // Formatear los mensajes para la API
    const formattedConversation = messages.map(msg => 
      `${msg.isUser ? 'Usuario' : 'Contacto'}: ${msg.body}`
    ).join('\n\n');

    const systemPrompt = `Eres un asistente educativo para un sistema de mensajería escolar.
    Resume esta conversación en 2-3 oraciones concisas, destacando los puntos clave, 
    acuerdos o acciones mencionadas. Mantén un tono neutral y profesional.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        { role: 'user', content: formattedConversation }
      ],
    });

    return response.content[0].text.trim();
  } catch (error) {
    console.error("Error generando resumen:", error);
    return "No se pudo generar un resumen de la conversación.";
  }
}

/**
 * Genera un comentario personalizado para boletas académicas
 * 
 * @param studentData - Objeto con datos académicos del alumno
 */
export async function generateAcademicComment(studentData: {
  nombre: string;
  periodo: string;
  materias: Array<{nombre: string, calificacion: number}>;
  asistencia: number;
  observacionesDocente?: string;
}): Promise<string> {
  try {
    console.log(`[DEBUG] Generando comentario académico para: ${studentData.nombre}`);
    
    // Extraer promedios y estadísticas para el contexto
    const calificaciones = studentData.materias.map(m => m.calificacion);
    const promedio = calificaciones.reduce((sum, grade) => sum + grade, 0) / calificaciones.length;
    const calificacionMasAlta = Math.max(...calificaciones);
    const calificacionMasBaja = Math.min(...calificaciones);
    const materiaDestacada = studentData.materias.find(m => m.calificacion === calificacionMasAlta)?.nombre || '';
    const materiaAMejorar = studentData.materias.find(m => m.calificacion === calificacionMasBaja)?.nombre || '';
    
    // Preparar la información para el modelo
    const studentInfo = `
    Nombre del alumno: ${studentData.nombre}
    Periodo académico: ${studentData.periodo}
    Promedio general: ${promedio.toFixed(1)}
    Porcentaje de asistencia: ${studentData.asistencia}%
    Materia con mejor desempeño: ${materiaDestacada} (${calificacionMasAlta})
    Materia con oportunidad de mejora: ${materiaAMejorar} (${calificacionMasBaja})
    
    Calificaciones por materia:
    ${studentData.materias.map(m => `- ${m.nombre}: ${m.calificacion}`).join('\n')}
    
    Observaciones adicionales del docente:
    ${studentData.observacionesDocente || 'No hay observaciones adicionales.'}
    `;

    const systemPrompt = `Eres un asistente educativo especializado en generar comentarios para boletas escolares.
    Genera un comentario personalizado para incluir en el reporte académico del alumno.

    Sigue estas pautas específicas:
    - Usa un tono profesional, cálido y constructivo
    - Destaca claramente las fortalezas del alumno basadas en sus calificaciones
    - Menciona áreas a mejorar con tacto y enfoque positivo, sugiriendo estrategias específicas
    - Evita juicios negativos o comparaciones con otros estudiantes
    - Incluye observaciones sobre asistencia y su impacto en el rendimiento si es relevante
    - Personaliza el comentario al contexto académico del alumno (periodos, materias, etc.)
    - Extiende el comentario entre 100-150 palabras aproximadamente
    - Incluye sugerencias específicas para continuar mejorando
    - Termina con una nota motivadora y positiva

    Basándote en los datos proporcionados, redacta un comentario que ofrezca una evaluación 
    justa, constructiva y personalizada del desempeño académico del alumno.`;

    console.log(`[DEBUG] Enviando solicitud a API de Anthropic Claude para comentario académico`);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: studentInfo }
      ],
    });

    const comment = response.content[0].text.trim();
    console.log(`[DEBUG] Comentario académico generado (primeros 100 caracteres): ${comment.substring(0, 100)}...`);
    
    return comment;
  } catch (error) {
    console.error("Error generando comentario académico:", error);
    return "No se pudo generar un comentario personalizado. Por favor, inténtelo de nuevo más tarde.";
  }
}

/**
 * Genera un resumen académico para el portal del padre
 * 
 * @param data - Datos académicos del estudiante
 * @param temperature - Valor de temperatura para la generación (opcional, por defecto 0.5)
 */
export async function generarResumenAcademicoParaPadres(data: {
  nombreEstudiante: string;
  nivel: string;
  periodos: string[];
  promediosPorMateria: Array<{
    materia: string;
    promedios: Record<string, number>;
  }>;
  asistencia: {
    porcentaje: number;
    presente: number;
    total: number;
  };
}, temperature: number = 0.5): Promise<string> {
  try {
    console.log(`[DEBUG] Generando resumen académico para: ${data.nombreEstudiante} (temperatura: ${temperature})`);
    
    // Calcular el promedio general
    let totalCalificaciones = 0;
    let cantidadCalificaciones = 0;
    
    for (const materiaData of data.promediosPorMateria) {
      for (const periodo in materiaData.promedios) {
        totalCalificaciones += materiaData.promedios[periodo];
        cantidadCalificaciones++;
      }
    }
    
    const promedioGeneral = cantidadCalificaciones > 0 
      ? totalCalificaciones / cantidadCalificaciones 
      : 0;

    // Identificar materias destacadas y con oportunidad de mejora
    const promediosPorMateria: { materia: string; promedio: number }[] = [];
    
    for (const materiaData of data.promediosPorMateria) {
      let totalMateria = 0;
      let cantidadPeriodos = 0;
      
      for (const periodo in materiaData.promedios) {
        totalMateria += materiaData.promedios[periodo];
        cantidadPeriodos++;
      }
      
      const promedioMateria = cantidadPeriodos > 0 ? totalMateria / cantidadPeriodos : 0;
      promediosPorMateria.push({ materia: materiaData.materia, promedio: promedioMateria });
    }
    
    // Ordenar para encontrar mejor y peor
    promediosPorMateria.sort((a, b) => b.promedio - a.promedio);
    
    const mejorMateria = promediosPorMateria.length > 0 ? promediosPorMateria[0] : null;
    const peorMateria = promediosPorMateria.length > 0 ? promediosPorMateria[promediosPorMateria.length - 1] : null;
    
    // Preparar la información para el modelo
    const studentInfo = `
    Nombre del estudiante: ${data.nombreEstudiante}
    Nivel educativo: ${data.nivel}
    Periodos académicos: ${data.periodos.join(', ')}
    Promedio general: ${promedioGeneral.toFixed(1)}
    Asistencia: ${data.asistencia.porcentaje}% (${data.asistencia.presente} de ${data.asistencia.total} días)
    
    Promedios por materia:
    ${promediosPorMateria.map(m => `- ${m.materia}: ${m.promedio.toFixed(1)}`).join('\n')}
    
    Materia con mejor desempeño: ${mejorMateria ? `${mejorMateria.materia} (${mejorMateria.promedio.toFixed(1)})` : 'No disponible'}
    Materia con oportunidad de mejora: ${peorMateria ? `${peorMateria.materia} (${peorMateria.promedio.toFixed(1)})` : 'No disponible'}
    `;

    const systemPrompt = `Eres un asistente educativo especializado en analizar el desempeño académico de estudiantes.
    Genera un resumen claro y amigable para padres de familia sobre el desempeño académico de su hijo/a.

    Sigue estas pautas específicas:
    - Usa un tono profesional pero accesible para padres sin jerga educativa especializada
    - Comienza saludando personalmente al padre/madre (usando "Estimado padre/madre de [nombre]")
    - Proporciona un análisis claro y conciso del rendimiento académico general
    - Destaca fortalezas y áreas de mejora (siempre con un enfoque constructivo)
    - Comenta sobre la asistencia y su relación con el desempeño
    - Ofrece 2-3 recomendaciones específicas y prácticas que los padres pueden implementar en casa
    - Termina con una nota positiva y motivadora
    - El texto debe tener entre 150-200 palabras aproximadamente
    
    Basándote en los datos proporcionados, redacta un resumen que ofrezca a los padres una
    visión clara del desempeño de su hijo/a y cómo pueden apoyarle.`;

    console.log(`[DEBUG] Enviando solicitud a API de Anthropic Claude para resumen académico para padres (temperatura: ${temperature})`);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 800,
      temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: studentInfo }
      ],
    });

    const summary = response.content[0].text.trim();
    console.log(`[DEBUG] Resumen académico generado (primeros 100 caracteres): ${summary.substring(0, 100)}...`);
    
    return summary;
  } catch (error) {
    console.error("Error generando resumen académico:", error);
    return "No se pudo generar un resumen académico personalizado. Por favor, inténtelo de nuevo más tarde.";
  }
}

/**
 * Genera respuestas para el chatbot educativo del portal para padres
 * 
 * @param question Pregunta del usuario
 * @param studentContext Datos académicos y financieros del estudiante
 * @returns Respuesta del chatbot
 */
export async function generateParentChatbotResponse(
  question: string, 
  studentContext: StudentContext
): Promise<string> {
  try {
    console.log(`[DEBUG] Generando respuesta de chatbot para pregunta: "${question.substring(0, 50)}..."`);
    
    // Formatear el contexto del estudiante para enviarlo al modelo con manejo robusto de errores
    let promedioGeneral = 'No disponible';
    try {
      if (typeof studentContext.promedioGeneral === 'number') {
        promedioGeneral = studentContext.promedioGeneral.toFixed(1);
      } else if (studentContext.promedioGeneral !== undefined && studentContext.promedioGeneral !== null) {
        promedioGeneral = String(studentContext.promedioGeneral);
      }
    } catch (e) {
      console.error("Error formateando promedio general:", e);
    }
    
    let porcentajeAsistencia = 'No disponible';
    let asistenciaPresente = 0;
    let asistenciaTotal = 0;
    
    try {
      if (studentContext.asistencia) {
        porcentajeAsistencia = `${studentContext.asistencia.porcentaje || 0}%`;
        asistenciaPresente = studentContext.asistencia.presente || 0;
        asistenciaTotal = studentContext.asistencia.total || 0;
      }
    } catch (e) {
      console.error("Error formateando asistencia:", e);
    }
    
    let calificacionesPorMateria = 'No hay información de calificaciones disponible';
    try {
      if (Array.isArray(studentContext.promedios) && studentContext.promedios.length > 0) {
        calificacionesPorMateria = studentContext.promedios.map(m => {
          try {
            const calificacion = typeof m.calificacion === 'number' 
              ? m.calificacion.toFixed(1)
              : String(m.calificacion || 'N/A');
            
            return `- ${m.materia || 'Materia sin nombre'}: ${calificacion}`;
          } catch (err) {
            return `- ${m.materia || 'Materia sin nombre'}: No disponible`;
          }
        }).join('\n');
      }
    } catch (e) {
      console.error("Error formateando calificaciones por materia:", e);
    }
    
    let tareasPendientesInfo = 'No hay tareas pendientes registradas.';
    try {
      if (Array.isArray(studentContext.tareasPendientes) && studentContext.tareasPendientes.length > 0) {
        tareasPendientesInfo = `Tareas pendientes:
        ${studentContext.tareasPendientes.map(t => {
          try {
            return `- ${t.materia || 'Materia sin especificar'}: "${t.titulo || 'Sin título'}" (Entrega: ${t.fechaEntrega || 'Fecha no especificada'})`;
          } catch (err) {
            return `- Tarea pendiente (detalles no disponibles)`;
          }
        }).join('\n')}`;
      }
    } catch (e) {
      console.error("Error formateando tareas pendientes:", e);
    }
    
    let estadoCuentaInfo = 'Información financiera no disponible.';
    try {
      if (studentContext.estadoCuenta) {
        const totalDeuda = typeof studentContext.estadoCuenta.totalDeuda === 'number'
          ? `$${studentContext.estadoCuenta.totalDeuda.toFixed(2)}`
          : `$${studentContext.estadoCuenta.totalDeuda || 0}`;
          
        const totalPagado = typeof studentContext.estadoCuenta.totalPagado === 'number'
          ? `$${studentContext.estadoCuenta.totalPagado.toFixed(2)}`
          : `$${studentContext.estadoCuenta.totalPagado || 0}`;
          
        const balance = typeof studentContext.estadoCuenta.balance === 'number'
          ? `$${studentContext.estadoCuenta.balance.toFixed(2)}`
          : `$${studentContext.estadoCuenta.balance || 0}`;
          
        estadoCuentaInfo = `Estado de cuenta:
        Total adeudado: ${totalDeuda}
        Total pagado: ${totalPagado}
        Balance actual: ${balance}`;
      }
    } catch (e) {
      console.error("Error formateando estado de cuenta:", e);
    }
    
    const formattedContext = `
    Información del estudiante:
    Nombre: ${studentContext.nombreEstudiante || 'Estudiante'}
    Promedio general: ${promedioGeneral}
    Asistencia: ${porcentajeAsistencia} (${asistenciaPresente} de ${asistenciaTotal} días)
    
    Calificaciones por materia:
    ${calificacionesPorMateria}
    
    ${tareasPendientesInfo}
    
    ${estadoCuentaInfo}
    `;

    const systemPrompt = `Eres un asistente educativo amigable integrado en el portal para padres de una escuela mexicana.
    Tu objetivo es ayudar a los padres a entender el desempeño académico de sus hijos y responder preguntas 
    sobre calificaciones, asistencia, tareas y pagos de forma clara y útil.

    LINEAMIENTOS IMPORTANTES:
    - Usa un tono conversacional, amable y empático, propio de un asistente escolar
    - Responde de manera breve y directa (máximo 3-4 oraciones por respuesta)
    - Sé específico, usando los datos proporcionados sobre el estudiante
    - Nunca inventes información que no está en el contexto
    - Si te piden información que no tienes, menciona amablemente que esos datos no están disponibles
    - Utiliza un lenguaje sencillo y accesible para padres no familiarizados con términos educativos técnicos
    - Ofrece consejos prácticos y concretos cuando sean solicitados
    - No sugieras contactar a profesores o administrativos específicos por nombre
    - Nunca menciones que eres una IA, simplemente responde como un asistente escolar

    Preguntas comunes que podrías recibir:
    - Información sobre calificaciones generales o en materias específicas
    - Porcentaje de asistencia y faltas
    - Tareas pendientes o próximas
    - Estado de cuenta y pagos pendientes
    - Consejos para ayudar al estudiante en materias específicas

    Basándote en el contexto proporcionado, responde a la pregunta del padre de manera útil, 
    específica y empática.`;

    console.log(`[DEBUG] Enviando solicitud a API de Anthropic Claude para chatbot educativo`);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { 
          role: 'user', 
          content: `CONTEXTO DEL ESTUDIANTE:\n${formattedContext}\n\nPREGUNTA DEL PADRE:\n${question}` 
        }
      ],
    });

    const chatbotResponse = response.content[0].text.trim();
    console.log(`[DEBUG] Respuesta de chatbot generada (primeros 100 caracteres): ${chatbotResponse.substring(0, 100)}...`);
    
    return chatbotResponse;
  } catch (error) {
    console.error("Error generando respuesta del chatbot:", error);
    return "Lo siento, no puedo procesar tu pregunta en este momento. Puedes intentar con preguntas como: '¿Cómo va académicamente mi hijo?', '¿Cuánto debo de colegiatura?', o '¿Qué tareas tiene pendientes?'";
  }
}

/**
 * Genera automáticamente una descripción para una tarea escolar
 * 
 * @param subjectName Nombre de la materia
 * @param taskTitle Título de la tarea
 * @param dueDate Fecha de entrega
 * @param gradeLevel Nivel educativo (primaria/secundaria/preparatoria)
 * @param rubric Criterios de evaluación (opcional)
 */
/**
 * Genera recomendaciones académicas personalizadas utilizando IA (Claude)
 * para un estudiante basado en su rendimiento académico
 * 
 * @param student - Datos académicos del estudiante
 * @returns Recomendaciones generadas por IA
 */
export async function generateRecommendationsAI(student: StudentAcademicData): Promise<AIRecommendationsResponse> {
  try {
    console.log(`[DEBUG] Generando recomendaciones personalizadas con IA para: ${student.nombre}`);
    
    // Verificamos si el estudiante tiene buen rendimiento (promedio general >= 7.0)
    const promedioGeneral = student.promedio || 
      (student.materias.reduce((sum, m) => sum + m.promedio, 0) / student.materias.length);
    
    const tieneAltoRendimiento = promedioGeneral >= 7.0;
    
    // Preparar los datos para el prompt
    const formatoMaterias = student.materias
      .map(m => `- ${m.nombre}: ${m.promedio.toFixed(1)}`)
      .join('\n');
    
    // Construir el prompt para Claude adaptado según el rendimiento
    let prompt = `
Actúa como un orientador académico experto en educación básica y media superior. Recibirás información sobre un estudiante, incluyendo sus calificaciones por materia y observaciones generales de su desempeño. Tu tarea es generar un Informe de Apoyo Personalizado para padres con recomendaciones pedagógicas estructuradas.

Responde con un informe claro y directo, usando lenguaje accesible para padres de familia, evitando términos técnicos y enfocándote en sugerencias prácticas.

Estructura la salida EXACTAMENTE en las siguientes secciones:

📌 ${tieneAltoRendimiento ? 'Recomendaciones de fortalecimiento para' : 'Recomendaciones para'} ${student.nombre}

🌟 FORTALEZAS
- Menciona 3-5 aspectos en los que el estudiante destaca, ya sea en materias específicas o habilidades transversales
- Sé específico sobre qué cualidades académicas o personales son sus puntos fuertes

⚡ ÁREAS A FORTALECER
- Identifica 3-5 aspectos específicos que requieren atención o mejora
- Enfócate en oportunidades de crecimiento concretas, no en debilidades generales

📊 ÁREAS DE DESARROLLO Y EVALUACIÓN
[Lista materias relevantes y su nivel de desempeño usando los siguientes símbolos:
 🌟 (Sobresaliente), ✅ (Satisfactorio), ⚡ (Requiere atención), 🔴 (Crítico)]

📝 OBSERVACIONES INDIVIDUALES
- Incluye notas específicas sobre comportamiento, participación y actitud del estudiante
- Menciona patrones observados y cómo afectan su aprendizaje

🚀 PRÓXIMOS PASOS
- Proporciona 3-5 acciones concretas que los padres pueden implementar en casa
- Da sugerencias específicas de materiales, actividades o estrategias de apoyo

📋 CONCLUSIÓN FINAL
- Resume el panorama general del estudiante
- Termina con un mensaje motivador y positivo

${tieneAltoRendimiento 
  ? 'Este estudiante tiene buen rendimiento académico. Proporciona recomendaciones positivas enfocadas en fortalecer y potenciar sus conocimientos y habilidades actuales. Sugiere material avanzado, desafíos adicionales y formas de profundizar su aprendizaje.' 
  : 'Proporciona un análisis equilibrado que reconozca tanto fortalezas como áreas a mejorar. Usa sugerencias prácticas, como estrategias de aprendizaje específicas, materiales recomendados, acompañamiento en casa o tutoría especializada.'}

IMPORTANTE: Asegúrate de incluir contenido en TODAS las secciones solicitadas, aunque sea breve. No dejes secciones vacías.

---

Nombre: ${student.nombre}  
Grado: ${student.grado}  
Desempeño:
${formatoMaterias}  
Observaciones: ${student.observaciones || 'No hay observaciones adicionales disponibles.'}
`;

    console.log(`[DEBUG] Enviando solicitud a API de Anthropic Claude para recomendaciones académicas`);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      temperature: 0.7, // Equilibrio entre creatividad y consistencia
      system: "Eres un orientador educativo especializado en generar recomendaciones pedagógicas personalizadas basadas en el rendimiento académico de los estudiantes.",
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const recommendations = response.content[0].text.trim();
    console.log(`[DEBUG] Recomendaciones AI generadas (primeros 100 caracteres): ${recommendations.substring(0, 100)}...`);
    
    return {
      recomendaciones: recommendations
    };
  } catch (error) {
    console.error("Error generando recomendaciones con IA:", error);
    return {
      recomendaciones: "",
      error: "No se pudieron generar recomendaciones personalizadas. Se utilizará el sistema de recomendaciones predeterminado."
    };
  }
}

export async function generateTaskDescription(
  subjectName: string,
  taskTitle: string,
  dueDate: string,
  gradeLevel: string,
  rubric?: string
): Promise<string> {
  try {
    console.log(`[DEBUG] Generando descripción para tarea: "${taskTitle}" de ${subjectName}`);
    
    // Formatear la información para el modelo
    const taskInfo = `
    Materia: ${subjectName}
    Título de la tarea: ${taskTitle}
    Fecha de entrega: ${dueDate}
    Nivel educativo: ${gradeLevel}
    ${rubric ? `Criterios de evaluación: ${rubric}` : ''}
    `;

    const systemPrompt = `Eres un asistente especializado en educación que ayuda a docentes a crear descripciones 
    de tareas claras, motivadoras y pedagógicamente efectivas.
    
    Genera una descripción completa para una tarea escolar con las siguientes características:
    
    1. Estructura clara:
       - Introduce el propósito educativo de la tarea
       - Explica detalladamente qué debe hacer el estudiante (pasos, metodología)
       - Menciona los materiales o recursos necesarios
       - Especifica los entregables concretos
       - Incluye la fecha de entrega en formato destacado
       
    2. Contenido:
       - Utiliza un lenguaje apropiado para el nivel educativo indicado
       - Relaciona la tarea con conocimientos previos cuando sea posible
       - Explica claramente los objetivos de aprendizaje
       - Si se proporcionan criterios de evaluación, incorpóralos adecuadamente
       
    3. Tono y estilo:
       - Emplea un tono motivador y positivo
       - Usa lenguaje claro y directo
       - Incluye preguntas guía cuando sea apropiado
       - Evita ambigüedades o instrucciones confusas
       
    La descripción debe ser completa pero concisa (máximo 350 palabras) y debe poder copiarse 
    directamente a un sistema de gestión educativa.`;

    console.log(`[DEBUG] Enviando solicitud a API de Anthropic Claude para generación de descripción de tarea`);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: taskInfo }
      ],
    });

    const description = response.content[0].text.trim();
    console.log(`[DEBUG] Descripción de tarea generada (primeros 100 caracteres): ${description.substring(0, 100)}...`);
    
    return description;
  } catch (error) {
    console.error("Error generando descripción de tarea:", error);
    return "No se pudo generar la descripción de la tarea. Por favor, intenta nuevamente o redacta la descripción manualmente.";
  }
}

/**
 * Genera recomendaciones predictivas personalizadas usando Claude AI
 * Basado en el perfil académico completo del estudiante
 */
export async function generatePredictiveRecommendation(studentData: {
  nombre: string;
  promedio: number;
  fortalezas: string[];
  areasAFortalecer: string[];
}): Promise<string> {
  try {
    console.log(`[AI] Generando recomendación predictiva para: ${studentData.nombre}`);
    
    const prompt = `Basado en este perfil académico, genera una recomendación predictiva personalizada para el estudiante:

Nombre del estudiante: ${studentData.nombre}
Promedio general: ${studentData.promedio}
Fortalezas:
${studentData.fortalezas.map(f => `- ${f}`).join('\n')}
Áreas a fortalecer:
${studentData.areasAFortalecer.map(a => `- ${a}`).join('\n')}

Tu recomendación debe:
- Ser precisa, breve y clara
- Sugerir 3 posibles caminos de desarrollo (académico, vocacional o personal)
- Redactarse en español formal, orientada a padres de familia

Estructura tu respuesta comenzando directamente con el análisis del perfil académico, seguido de recomendaciones de desarrollo y perfil vocacional sugerido.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
      max_tokens: 800,
      temperature: 0.7,
      system: "Eres un orientador educativo especializado en análisis predictivo académico y desarrollo estudiantil.",
      messages: [{ role: 'user', content: prompt }],
    });

    const recommendation = response.content[0].text.trim();
    console.log(`[AI] Recomendación generada exitosamente (${recommendation.length} caracteres)`);
    
    return recommendation;
  } catch (error) {
    console.error('Error generando recomendación predictiva:', error);
    throw new Error('No se pudo generar la recomendación predictiva');
  }
}