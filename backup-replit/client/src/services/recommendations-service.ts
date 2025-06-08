import { Recommendation, RecommendationType } from "@/components/observaciones/RecommendationBlock";
import { GradeCategory, getCategoryFromGrade } from "@/components/grades/GradeDisplay";

// Tipos de estructuras para los datos de entrada
export interface SubjectPerformance {
  id: number;
  nombre: string;
  promedio: number;
}

export interface StudentPerformance {
  id: number;
  nombre: string;
  promedio: number;
  materias: SubjectPerformance[];
  grado?: string;
  observacionesAdicionales?: string;
}

// Banco de recomendaciones por categoría y rango de calificación
const recommendationBank: Record<GradeCategory, Record<RecommendationType, string[]>> = {
  critico: {
    refuerzo_conceptos: [
      "Revisar los conceptos fundamentales del tema con apoyo de recursos visuales y ejemplos concretos.",
      "Elaborar un glosario personal con los términos clave para fortalecer la comprensión básica.",
      "Trabajar con materiales simplificados que expliquen las bases de la materia paso a paso."
    ],
    ejercicios_adicionales: [
      "Resolver ejercicios de nivel básico para fortalecer la comprensión de conceptos fundamentales.",
      "Completar práctica diaria de 15-20 minutos con ejercicios adaptados a su nivel actual.",
      "Trabajar en secuencias de aprendizaje progresivas, avanzando solo después de dominar cada paso."
    ],
    participacion_activa: [
      "Establecer momentos específicos de intervención para que el alumno pueda prepararse con anticipación.",
      "Formular preguntas dirigidas específicamente al alumno para verificar comprensión en clase.",
      "Asignar pequeñas presentaciones sobre temas básicos para desarrollar seguridad y expresión oral."
    ],
    tutoria_recomendada: [
      "Implementar un plan intensivo de tutoría individual con sesiones 2-3 veces por semana.",
      "Utilizar evaluaciones diagnósticas para identificar y abordar las brechas específicas de conocimiento.",
      "Designar un mentor estudiantil para apoyo adicional y seguimiento diario de avances."
    ],
    estrategias_sugeridas: [
      "Subdividir el contenido en unidades más pequeñas y manejables con objetivos específicos para cada sesión.",
      "Utilizar métodos multisensoriales (visual, auditivo, táctil) para reforzar el aprendizaje.",
      "Implementar un sistema de recompensas inmediatas para logros pequeños pero significativos."
    ]
  },
  bajo: {
    refuerzo_conceptos: [
      "Crear mapas conceptuales que conecten ideas previas con nuevo conocimiento.",
      "Utilizar ejemplos de la vida real para ilustrar conceptos abstractos.",
      "Implementar estrategias de mnemotécnica para la retención de información clave."
    ],
    ejercicios_adicionales: [
      "Asignar ejercicios graduados en dificultad, comenzando con nivel básico-intermedio.",
      "Proporcionar problemas que relacionen diferentes conceptos para desarrollar pensamiento integrado.",
      "Incorporar actividades de autoevaluación al finalizar cada unidad de ejercicios."
    ],
    participacion_activa: [
      "Incorporar actividades de aprendizaje colaborativo donde pueda aportar desde sus fortalezas.",
      "Realizar preguntas abiertas que estimulen la reflexión y análisis sobre los temas estudiados.",
      "Alternar entre participación en grupos pequeños y discusiones con toda la clase."
    ],
    tutoria_recomendada: [
      "Establecer sesiones semanales de tutoría enfocadas en los temas de mayor dificultad.",
      "Desarrollar un plan de estudio personalizado con metas a corto plazo.",
      "Implementar evaluaciones formativas frecuentes para monitorear progreso y ajustar estrategias."
    ],
    estrategias_sugeridas: [
      "Utilizar técnicas de estudio variadas: resúmenes, cuestionarios, enseñanza entre pares.",
      "Incorporar tecnología educativa para presentar el contenido de manera interactiva.",
      "Establecer rutinas de repaso espaciado para fortalecer la retención a largo plazo."
    ]
  },
  enProceso: {
    refuerzo_conceptos: [
      "Elaborar síntesis personales que conecten los conceptos clave con ejemplos prácticos.",
      "Fomentar el planteamiento de preguntas propias sobre los temas estudiados.",
      "Utilizar analogías y metáforas para consolidar la comprensión de conceptos complejos."
    ],
    ejercicios_adicionales: [
      "Integrar ejercicios de aplicación real que requieran análisis y síntesis de conceptos.",
      "Asignar problemas que presenten situaciones novedosas para aplicar lo aprendido.",
      "Incorporar actividades que requieran justificación y explicación del proceso de resolución."
    ],
    participacion_activa: [
      "Asignar roles de liderazgo en actividades grupales que aprovechen sus fortalezas.",
      "Fomentar la formulación de preguntas complejas y la proposición de soluciones alternativas.",
      "Involucrar al estudiante en debates estructurados sobre temas relevantes de la materia."
    ],
    tutoria_recomendada: [
      "Implementar sesiones quincenales de seguimiento para reforzar áreas específicas de mejora.",
      "Proporcionar recursos de extensión para profundizar en temas de interés particular.",
      "Diseñar proyectos personalizados que conecten diferentes áreas del conocimiento."
    ],
    estrategias_sugeridas: [
      "Implementar técnicas de estudio avanzadas como elaboración de casos y aplicación práctica.",
      "Fomentar la metacognición mediante diarios de aprendizaje y reflexión sobre el proceso.",
      "Establecer metas de aprendizaje autodirigidas con planes concretos de acción."
    ]
  },
  satisfactorio: {
    refuerzo_conceptos: [
      "Profundizar en las interrelaciones entre conceptos para desarrollar una comprensión sistémica.",
      "Estimular el análisis crítico de los fundamentos teóricos de la materia.",
      "Fomentar la transferencia de conocimientos entre diferentes áreas y contextos."
    ],
    ejercicios_adicionales: [
      "Proponer retos que requieran pensamiento divergente y soluciones creativas.",
      "Asignar proyectos interdisciplinarios que apliquen conocimientos de múltiples áreas.",
      "Desarrollar ejercicios de nivel avanzado que preparen para competencias académicas."
    ],
    participacion_activa: [
      "Fomentar que el alumno lidere discusiones y presente temas avanzados a sus compañeros.",
      "Incorporar metodologías como el aprendizaje basado en problemas donde tome rol protagónico.",
      "Estimular la formulación de hipótesis y el diseño de procedimientos para comprobarlas."
    ],
    tutoria_recomendada: [
      "Orientar hacia recursos de enriquecimiento y extensión del currículo regular.",
      "Vincular con mentores especializados para desarrollar intereses específicos.",
      "Implementar proyectos de investigación autodirigidos con asesoría periódica."
    ],
    estrategias_sugeridas: [
      "Desarrollar habilidades de nivel superior mediante análisis crítico y evaluación de fuentes.",
      "Fomentar la creación de contenido original como ensayos argumentativos o proyectos innovadores.",
      "Implementar técnicas avanzadas de organización del conocimiento como revisiones sistemáticas."
    ]
  },
  optimo: {
    refuerzo_conceptos: [
      "Explorar conceptos avanzados que van más allá del currículo estándar.",
      "Analizar la evolución histórica y epistemológica de los conceptos fundamentales.",
      "Estimular conexiones interdisciplinarias y aplicaciones innovadoras del conocimiento."
    ],
    ejercicios_adicionales: [
      "Desarrollar proyectos de investigación originales con metodología rigurosa.",
      "Resolver problemas de competencias avanzadas nacionales e internacionales.",
      "Diseñar y ejecutar experimentos o estudios que generen conocimiento nuevo."
    ],
    participacion_activa: [
      "Asumir roles de tutoría para compañeros, desarrollando habilidades de comunicación y liderazgo.",
      "Participar en foros académicos externos presentando investigaciones o proyectos propios.",
      "Contribuir al diseño de actividades de aprendizaje innovadoras para el grupo."
    ],
    tutoria_recomendada: [
      "Establecer contacto con especialistas o investigadores en el área de interés.",
      "Desarrollar un plan de mentoría orientado a la participación en olimpiadas o concursos.",
      "Explorar opciones de aprendizaje avanzado, como cursos universitarios o especializados."
    ],
    estrategias_sugeridas: [
      "Implementar metodologías de aprendizaje autodirigido con objetivos establecidos por el alumno.",
      "Desarrollar portafolios de evidencias que documenten su proceso de aprendizaje profundo.",
      "Fomentar la metacognición avanzada y la autorregulación del proceso de aprendizaje."
    ]
  }
};

/**
 * Genera recomendaciones personalizadas
 * @param student Información del estudiante completo
 * @returns Lista de recomendaciones personalizadas
 */
export function generateRecommendations(student: StudentPerformance): Recommendation[];
/**
 * Genera recomendaciones personalizadas
 * @param materiaNombre Nombre de la materia
 * @param promedio Promedio de la materia
 * @returns Lista de recomendaciones personalizadas
 */
export function generateRecommendations(materiaNombre: string, promedio: number): Recommendation[];

/**
 * Función independiente para generar recomendaciones con IA (Claude)
 */
/**
 * Función para generar recomendaciones simuladas para desarrollo
 * Usada cuando la API de Claude está inaccesible (error 403)
 */
export function generateSimulatedAIRecommendations(student: StudentPerformance): string {
  // Determinar materias con bajo rendimiento
  let materiasConBajoPuntaje = student.materias
    .filter(m => m.promedio < 7.0)
    .map(m => m.nombre);
  
  if (materiasConBajoPuntaje.length === 0 && student.materias.length > 0) {
    // Si no hay materias con bajo puntaje, usar la primera para el ejemplo
    materiasConBajoPuntaje = [student.materias[0].nombre];
  }
  
  let recomendacionesEjemplo = `Recomendaciones personalizadas para ${student.nombre}:\n\n`;
  
  // Generar recomendaciones por materia
  materiasConBajoPuntaje.forEach(materia => {
    recomendacionesEjemplo += `[${materia}]\n`;
    recomendacionesEjemplo += `• Establece un horario de estudio regular dedicando al menos 30 minutos diarios.\n`;
    recomendacionesEjemplo += `• Utiliza técnicas de estudio activo como mapas conceptuales y ejercicios prácticos.\n`;
    recomendacionesEjemplo += `• Busca ayuda adicional con el profesor cuando tengas dudas específicas.\n\n`;
  });
  
  // Agregar estrategias generales
  recomendacionesEjemplo += `Estrategias generales:\n`;
  recomendacionesEjemplo += `• Organiza un grupo de estudio con compañeros para reforzar conceptos.\n`;
  recomendacionesEjemplo += `• Utiliza recursos en línea como videos educativos y tutoriales.\n`;
  recomendacionesEjemplo += `• Establece metas específicas y alcanzables para cada semana.\n`;
  
  return recomendacionesEjemplo;
}

export async function getClaudeRecommendations(student: StudentPerformance): Promise<string> {
  try {
    // Verificar si estamos en modo desarrollo para manejar errores de API
    const isDevelopment = import.meta.env.DEV;
    
    // ===== CONFIGURACIÓN DE PRUEBA =====
    // Forzar el uso de recomendaciones reales de Claude AI para pruebas
    const AI_BYPASS = false; // Desactivado para usar Claude AI real en lugar de simulación
    
    if (isDevelopment && AI_BYPASS) {
      console.log('Usando recomendaciones IA simuladas (modo desarrollo)');
      return generateSimulatedAIRecommendations(student);
    }
    
    console.log('Intentando obtener recomendaciones desde Claude AI en modo real');
    // ================================
    
    // Solo continuar con la solicitud real si no estamos en modo desarrollo o bypass
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // En producción o cuando queremos probar autenticación, agregamos el token
    if (!isDevelopment) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
    } else {
      console.log('Enviando solicitud a Claude AI sin token en modo desarrollo');
    }
    
    const response = await fetch('/api/ai/recomendaciones', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        alumno: {
          id: student.id,
          nombre: student.nombre,
          grado: student.grado || 'No especificado', 
          promedio: student.promedio,
          materias: student.materias,
          observaciones: student.observacionesAdicionales || ''
        }
      })
    });

    if (!response.ok) {
      console.error('Error al obtener recomendaciones AI:', response.statusText);
      
      // Devolver mensaje de fallback para que siempre se muestre el bloque
      return `No se pudieron generar recomendaciones personalizadas. Se utilizará el sistema de recomendaciones predeterminado.`;
    }

    const data = await response.json();
    
    if (!data.success || !data.recomendaciones) {
      console.warn('No se pudieron generar recomendaciones AI:', data.error);
      return `No se pudieron generar recomendaciones personalizadas. Se utilizará el sistema de recomendaciones predeterminado.`;
    }

    return data.recomendaciones;
  } catch (error) {
    console.error('Error en generateRecommendationsAI:', error);
    
    // Si estamos en desarrollo, generar datos simulados para errores generales
    if (import.meta.env.DEV) {
      console.log('Error capturado, usando recomendaciones IA simuladas');
      return generateSimulatedAIRecommendations(student);
    }
    
    // Mensaje de fallback para producción
    return `No se pudieron generar recomendaciones personalizadas. Se utilizará el sistema de recomendaciones predeterminado.`;
  }
}

export function generateRecommendations(
  studentOrMateria: StudentPerformance | string,
  promedio?: number
): Recommendation[] {
  // Caso 1: Generar recomendaciones para una sola materia
  if (typeof studentOrMateria === 'string' && promedio !== undefined) {
    const materiaNombre = studentOrMateria;
    const recommendations: Recommendation[] = [];
    
    // Determinar la categoría basada en el promedio
    const categoria = getCategoryFromGrade(promedio);
    
    // Si el desempeño es crítico o bajo, dar varias recomendaciones
    if (categoria === 'critico' || categoria === 'bajo') {
      // Seleccionar tres tipos de recomendación
      const tiposRecomendacion: RecommendationType[] = [
        'refuerzo_conceptos',
        'ejercicios_adicionales',
        'tutoria_recomendada'
      ];
      
      // Generar las recomendaciones
      tiposRecomendacion.forEach(tipo => {
        const opciones = recommendationBank[categoria][tipo];
        const descripcion = opciones[Math.floor(Math.random() * opciones.length)];
        
        recommendations.push({
          materiaId: 0, // No tenemos ID en este caso
          materiaNombre,
          tipo,
          descripcion
        });
      });
    }
    // Si está en proceso, dar algunas recomendaciones para mejorar
    else if (categoria === 'enProceso') {
      // Seleccionar dos tipos de recomendación aleatoriamente
      const tiposDisponibles: RecommendationType[] = [
        'refuerzo_conceptos', 
        'ejercicios_adicionales',
        'participacion_activa',
        'estrategias_sugeridas'
      ];
      
      // Mezclar y tomar 2
      const tiposRecomendacion = shuffleArray(tiposDisponibles).slice(0, 2);
      
      // Generar las recomendaciones
      tiposRecomendacion.forEach(tipo => {
        const opciones = recommendationBank[categoria][tipo];
        const descripcion = opciones[Math.floor(Math.random() * opciones.length)];
        
        recommendations.push({
          materiaId: 0,
          materiaNombre,
          tipo,
          descripcion
        });
      });
    }
    
    return recommendations;
  }
  
  // Caso 2: Generar recomendaciones para un estudiante completo
  else {
    const student = studentOrMateria as StudentPerformance;
    const recommendations: Recommendation[] = [];
    
    // Materia por materia, verificar el rendimiento y generar recomendaciones apropiadas
    student.materias.forEach(materia => {
      // Determinar la categoría basada en el promedio
      const categoria = getCategoryFromGrade(materia.promedio);
      
      // Si el rendimiento es bajo o crítico, generar recomendaciones más intensivas
      if (categoria === 'critico' || categoria === 'bajo') {
        // Siempre incluir recomendación de tutoría y refuerzo de conceptos para casos críticos
        const tiposRecomendacion: RecommendationType[] = ['tutoria_recomendada', 'refuerzo_conceptos'];
        
        // Añadir al menos una recomendación de ejercicios o estrategias
        if (Math.random() > 0.5) {
          tiposRecomendacion.push('ejercicios_adicionales');
        } else {
          tiposRecomendacion.push('estrategias_sugeridas');
        }
        
        // Generar las recomendaciones para esta materia
        tiposRecomendacion.forEach(tipo => {
          const opciones = recommendationBank[categoria][tipo];
          const descripcion = opciones[Math.floor(Math.random() * opciones.length)];
          
          recommendations.push({
            materiaId: materia.id,
            materiaNombre: materia.nombre,
            tipo,
            descripcion
          });
        });
      }
      // Si está en proceso, dar algunas recomendaciones para mejorar
      else if (categoria === 'enProceso') {
        // Seleccionar dos tipos de recomendación aleatoriamente
        const tiposDisponibles: RecommendationType[] = [
          'refuerzo_conceptos', 
          'ejercicios_adicionales',
          'participacion_activa',
          'estrategias_sugeridas'
        ];
        
        // Mezclar y tomar 2
        const tiposRecomendacion = shuffleArray(tiposDisponibles).slice(0, 2);
        
        // Generar las recomendaciones
        tiposRecomendacion.forEach(tipo => {
          const opciones = recommendationBank[categoria][tipo];
          const descripcion = opciones[Math.floor(Math.random() * opciones.length)];
          
          recommendations.push({
            materiaId: materia.id,
            materiaNombre: materia.nombre,
            tipo,
            descripcion
          });
        });
      }
      // Para rendimientos satisfactorios, ofrecer oportunidades de extensión
      else if (categoria === 'satisfactorio') {
        // Elegir un tipo de extensión aleatoriamente
        const tipos: RecommendationType[] = ['participacion_activa', 'estrategias_sugeridas'];
        const tipo = tipos[Math.floor(Math.random() * tipos.length)];
        
        const opciones = recommendationBank[categoria][tipo];
        const descripcion = opciones[Math.floor(Math.random() * opciones.length)];
        
        recommendations.push({
          materiaId: materia.id,
          materiaNombre: materia.nombre,
          tipo,
          descripcion
        });
      }
      // Para rendimientos óptimos, ofrecer oportunidades de profundización
      else if (categoria === 'optimo') {
        // Solo si el promedio general del alumno es también alto, para no sobrecargarlo
        if (student.promedio >= 9.0) {
          const tipo: RecommendationType = 'estrategias_sugeridas';
          const opciones = recommendationBank[categoria][tipo];
          const descripcion = opciones[Math.floor(Math.random() * opciones.length)];
          
          recommendations.push({
            materiaId: materia.id,
            materiaNombre: materia.nombre,
            tipo,
            descripcion
          });
        }
      }
    });
    
    // Si el rendimiento general del alumno es bajo, añadir algunas recomendaciones generales
    if (student.promedio < 7.0) {
      const categoriaGeneral = getCategoryFromGrade(student.promedio);
      
      // Añadir una recomendación general de estrategia
      const tipoGeneral: RecommendationType = 'estrategias_sugeridas';
      const opcionesGenerales = recommendationBank[categoriaGeneral][tipoGeneral];
      const descripcionGeneral = opcionesGenerales[Math.floor(Math.random() * opcionesGenerales.length)];
      
      recommendations.push({
        materiaId: 0,
        materiaNombre: "General",
        tipo: tipoGeneral,
        descripcion: descripcionGeneral
      });
    }
    
    return recommendations;
  }
}

// Función auxiliar para mezclar un array (algoritmo Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}