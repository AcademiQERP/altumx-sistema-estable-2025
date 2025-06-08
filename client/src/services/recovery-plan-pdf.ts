import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { generateRecommendations } from "@/services/recommendations-service";
import { Recommendation, RecommendationType } from "@/components/observaciones/RecommendationBlock";
import { sanitizeTextForPDF } from "@/utils/pdf-sanitizer";

// Función auxiliar para calcular altura del texto
const calculateTextHeight = (
  doc: jsPDF, 
  text: string, 
  maxWidth: number,
  startX: number
): number => {
  const textLines = doc.splitTextToSize(text, maxWidth - startX);
  return textLines.length * 7; // 7 es aproximadamente la altura de una línea
};

// Función para formatear fechas en formato legible
export const formatDate = (dateString: string, withTime = true): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return date.toLocaleDateString('es-MX', options);
};

// Interfaz para el objeto de datos del plan de recuperación (versión estructurada)
export interface RecoveryPlanData {
  student: {
    id: number;
    nombre: string;
    grupo?: string;
    nivel?: string;
    promedio?: number;
  };
  teacher: string;
  subjects: Array<{
    id?: number;
    nombre: string;
    promedio?: number;
  }>;
  date: string;
  recommendations?: string[] | Recommendation[];
  goals: string[];
  autoGenerateRecommendations?: boolean;
  // Nuevos campos
  aiRecommendations?: string; // Recomendaciones generadas por Claude AI
}

// Función para generar PDF a partir de datos estructurados
export const generateRecoveryPlanPDF = (planData: RecoveryPlanData): jsPDF => {
  // Crear documento PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const primaryColor = "#1F3C88";
  const secondaryColor = "#5893D4";
  
  // Configurar estilos y tamaño de texto
  const titleSize = 18;
  const subtitleSize = 14;
  const normalSize = 10;
  const smallSize = 8;
  
  // Compatibilidad con versiones anteriores (subjects como strings)
  // Convertir subjects a formato nuevo si es necesario
  if (planData.subjects && Array.isArray(planData.subjects) && planData.subjects.length > 0) {
    const firstItem = planData.subjects[0];
    if (typeof firstItem === 'string') {
      // Convertir array de strings a objetos con nombre
      planData.subjects = (planData.subjects as unknown as string[]).map(subj => ({
        nombre: subj
      }));
    }
  }
  
  // Fecha formateada
  const formattedDate = formatDate(planData.date);
  
  /* -------------- PÁGINA 1: PORTADA Y DATOS DEL ESTUDIANTE -------------- */
  
  // Encabezado
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(titleSize);
  doc.setFont("helvetica", "bold");
  doc.text("PLAN DE RECUPERACIÓN ACADÉMICA", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(subtitleSize);
  doc.text("Asistente Educativo IA", pageWidth / 2, 30, { align: "center" });
  
  // Información del documento
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "italic");
  doc.text(`Documento generado: ${formattedDate}`, pageWidth - 15, 50, { align: "right" });
  
  // Información del estudiante
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Estudiante: ${planData.student.nombre}`, 20, 65);
  if (planData.student.grupo) {
    doc.text(`Grupo: ${planData.student.grupo}`, 20, 75);
  }
  if (planData.student.nivel) {
    doc.text(`Nivel: ${planData.student.nivel}`, 20, 85);
  }
  doc.text(`Profesor: ${planData.teacher}`, 20, 95);
  doc.text(`Fecha de generación: ${formattedDate}`, 20, 105);
  
  // Línea separadora
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 115, pageWidth - 20, 115);
  
  // Título de sección
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("MATERIAS QUE REQUIEREN ATENCIÓN", pageWidth / 2, 130, { align: "center" });
  
  // Lista de materias
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  let y = 145;
  
  if (planData.subjects && planData.subjects.length > 0) {
    planData.subjects.forEach((subject, index) => {
      doc.setDrawColor(primaryColor);
      doc.setFillColor(primaryColor);
      doc.circle(25, y - 2, 1, "F");
      doc.text(subject.nombre, 30, y);
      y += 10;
    });
  } else {
    doc.text("No se identificaron materias que requieran recuperación académica.", 20, y);
    y += 10;
  }
  
  y += 10;
  
  // Título de sección: Recomendaciones
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("RECOMENDACIONES PEDAGÓGICAS", pageWidth / 2, y, { align: "center" });
  
  y += 15;
  
  // Generar recomendaciones automáticas si se solicita
  let recommendations: Array<string | Recommendation> = [];
  
  if (planData.autoGenerateRecommendations && planData.student.promedio !== undefined) {
    // Formatear los datos en el formato requerido por el generador
    const studentData = {
      id: planData.student.id,
      nombre: planData.student.nombre,
      promedio: planData.student.promedio,
      materias: planData.subjects.map(subject => ({
        id: subject.id || 0,
        nombre: subject.nombre,
        promedio: subject.promedio || planData.student.promedio || 7.0
      }))
    };
    
    // Generar recomendaciones
    const autoRecommendations = generateRecommendations(studentData);
    recommendations = autoRecommendations;
  } else if (planData.recommendations && planData.recommendations.length > 0) {
    // Usar recomendaciones proporcionadas
    recommendations = [...planData.recommendations] as Array<string | Recommendation>;
  } else {
    // Recomendaciones por defecto
    recommendations = [
      "Asistir a sesiones adicionales para reforzar conceptos clave",
      "Revisar y practicar ejercicios modelo diariamente",
      "Solicitar tutoría individual para temas específicos",
      "Formar un grupo de estudio con compañeros"
    ] as string[];
  }
  
  // Agrupar recomendaciones por tipo si es que son objetos estructurados
  const isStructured = recommendations.length > 0 && typeof recommendations[0] !== 'string';
  
  if (isStructured) {
    // Mapeo de tipos a nombres más amigables
    const typeLabels: Record<RecommendationType, string> = {
      refuerzo_conceptos: "Refuerzo de conceptos",
      ejercicios_adicionales: "Ejercicios adicionales",
      participacion_activa: "Participación activa",
      tutoria_recomendada: "Tutoría recomendada",
      estrategias_sugeridas: "Estrategias sugeridas"
    };
    
    // Procesar recomendaciones estructuradas
    const structuredRecs = recommendations as Recommendation[];
    
    // Agrupar por tipo
    const byType: Record<RecommendationType, Recommendation[]> = {
      refuerzo_conceptos: [],
      ejercicios_adicionales: [],
      participacion_activa: [],
      tutoria_recomendada: [],
      estrategias_sugeridas: []
    };
    
    structuredRecs.forEach(rec => {
      byType[rec.tipo].push(rec);
    });
    
    // Mostrar cada grupo
    Object.entries(byType).forEach(([type, recs]) => {
      if (recs.length === 0) return;
      
      const tipoRec = type as RecommendationType;
      
      // Subtítulo para el tipo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(normalSize);
      doc.setTextColor(secondaryColor);
      doc.text(typeLabels[tipoRec], 20, y);
      y += 10;
      
      // Mostrar cada recomendación de este tipo
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      
      recs.forEach(rec => {
        // Si es para una materia específica
        if (rec.materiaNombre) {
          doc.setFont("helvetica", "italic");
          doc.text(`Para ${rec.materiaNombre}:`, 25, y);
          y += 7;
        }
        
        doc.setFont("helvetica", "normal");
        
        // Dibujar bullet point
        doc.setDrawColor(secondaryColor);
        doc.setFillColor(secondaryColor);
        doc.circle(25, y - 2, 1, "F");
        
        // Manejar texto potencialmente largo
        const lines = doc.splitTextToSize(rec.descripcion, pageWidth - 60);
        doc.text(lines, 30, y);
        y += lines.length * 7 + 3;
        
        // Comprobar si necesitamos una nueva página
        if (y > 270) {
          doc.addPage();
          
          // Encabezado de página
          doc.setFillColor(primaryColor);
          doc.rect(0, 0, pageWidth, 15, "F");
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(smallSize);
          doc.setFont("helvetica", "bold");
          doc.text(`PLAN DE RECUPERACIÓN - ${planData.student.nombre}`, pageWidth / 2, 10, { align: "center" });
          
          y = 30;
        }
      });
      
      y += 5; // Espacio extra entre tipos
    });
    
  } else {
    // Lista de recomendaciones en formato texto simple
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(normalSize);
    doc.setFont("helvetica", "normal");
    
    (recommendations as string[]).forEach((rec, index) => {
      doc.setDrawColor(secondaryColor);
      doc.setFillColor(secondaryColor);
      doc.circle(25, y - 2, 1, "F");
      
      // Manejar texto potencialmente largo
      const lines = doc.splitTextToSize(rec, pageWidth - 60);
      doc.text(lines, 30, y);
      y += lines.length * 7 + 3;
      
      // Comprobar si necesitamos una nueva página
      if (y > 270 && index < (recommendations as string[]).length - 1) {
        doc.addPage();
        
        // Encabezado de página
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, pageWidth, 15, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(smallSize);
        doc.setFont("helvetica", "bold");
        doc.text(`PLAN DE RECUPERACIÓN - ${planData.student.nombre}`, pageWidth / 2, 10, { align: "center" });
        
        y = 30;
      }
    });
  }
  
  y += 10;
  
  // Sección para recomendaciones generadas por IA (Claude)
  if (planData.aiRecommendations && planData.aiRecommendations.trim() && planData.subjects && planData.subjects.length > 0) {
    // Sanitizamos las recomendaciones de IA para evitar problemas con caracteres especiales
    planData.aiRecommendations = sanitizeTextForPDF(planData.aiRecommendations);
    doc.setTextColor(primaryColor);
    doc.setFontSize(subtitleSize);
    doc.setFont("helvetica", "bold");
    doc.text("● RECOMENDACIONES GENERADAS POR INTELIGENCIA ARTIFICIAL (CLAUDE)", pageWidth / 2, y, { align: "center" });
    
    y += 15;
    
    // Añadir leyenda sobre el origen de las recomendaciones
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Las siguientes recomendaciones personalizadas fueron generadas por Claude, asistente de IA:", 20, y, { maxWidth: pageWidth - 40 });
    
    y += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    // Fondo suave para la sección completa de IA
    doc.setFillColor(245, 247, 250); // Color de fondo suave
    doc.rect(15, y - 5, pageWidth - 30, calculateTextHeight(doc, planData.aiRecommendations, pageWidth, 20) + 25, "F");
    
    // Borde lateral con el color secundario
    doc.setFillColor(secondaryColor);
    doc.rect(15, y - 5, 5, calculateTextHeight(doc, planData.aiRecommendations, pageWidth, 20) + 25, "F");
    
    // Espacio después del borde
    const contentStartX = 25;
    
    // Separar las recomendaciones por líneas y mostrarlas
    const aiRecommendationsLines = planData.aiRecommendations.split('\n');
    
    for (let i = 0; i < aiRecommendationsLines.length; i++) {
      const line = aiRecommendationsLines[i].trim();
      if (line) {
        // Si la línea es un encabezado de materia (formato [MATERIA – Calificación: X.X])
        if (line.match(/^\[.*\]$/)) {
          y += 5; // Espacio extra antes de cada materia
          
          // Cambiar color y estilo para encabezados de materia
          doc.setFont("helvetica", "bold");
          doc.setTextColor(secondaryColor);
          doc.text(line, contentStartX, y, { maxWidth: pageWidth - contentStartX - 15 });
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
        } else {
          // Para recomendaciones normales
          // Verificar si es una viñeta o punto
          if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
            doc.setDrawColor(secondaryColor);
            doc.setFillColor(secondaryColor);
            doc.circle(contentStartX + 3, y - 2, 1.5, "F");
            doc.text(line.substring(1).trim(), contentStartX + 10, y, { maxWidth: pageWidth - contentStartX - 25 });
          } else {
            doc.text(line, contentStartX, y, { maxWidth: pageWidth - contentStartX - 15 });
          }
        }
        
        const textHeight = doc.getTextDimensions(line, { maxWidth: pageWidth - contentStartX - 15 }).h;
        y += textHeight + 5;
        
        // Verificar si necesitamos una nueva página
        if (y > 270) {
          doc.addPage();
          
          // Encabezado de página
          doc.setFillColor(primaryColor);
          doc.rect(0, 0, pageWidth, 15, "F");
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(smallSize);
          doc.setFont("helvetica", "bold");
          doc.text(`PLAN DE RECUPERACIÓN - ${planData.student.nombre}`, pageWidth / 2, 10, { align: "center" });
          
          y = 30;
          
          // Continuar el fondo y borde en la nueva página
          doc.setFillColor(245, 247, 250);
          doc.rect(15, y - 5, pageWidth - 30, 240, "F");
          
          doc.setFillColor(secondaryColor);
          doc.rect(15, y - 5, 5, 240, "F");
        }
      }
    }
    
    // Agregar un poco de espacio después de las recomendaciones de IA
    y += 15;
  }
  
  // Título de sección: Objetivos
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("OBJETIVOS DEL PLAN", pageWidth / 2, y, { align: "center" });
  
  y += 15;
  
  // Lista de objetivos
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  planData.goals.forEach((goal, index) => {
    doc.setDrawColor(secondaryColor);
    doc.setFillColor(secondaryColor);
    doc.circle(25, y - 2, 1, "F");
    doc.text(goal, 30, y);
    y += 10;
    
    // Si necesitamos una nueva página
    if (y > 270 && index < planData.goals.length - 1) {
      doc.addPage();
      
      // Encabezado de página
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, pageWidth, 15, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(smallSize);
      doc.setFont("helvetica", "bold");
      doc.text(`PLAN DE RECUPERACIÓN - ${planData.student.nombre}`, pageWidth / 2, 10, { align: "center" });
      
      y = 30;
    }
  });
  
  // Pie de página con firma del profesor
  if (y < 220) {
    y = 220;
  }
  
  // Línea para firma
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(pageWidth / 2 - 50, y + 30, pageWidth / 2 + 50, y + 30);
  
  // Texto de firma
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "normal");
  doc.text(planData.teacher, pageWidth / 2, y + 40, { align: "center" });
  doc.text("Profesor", pageWidth / 2, y + 45, { align: "center" });
  
  // Guardar y descargar automáticamente el PDF
  doc.save(`Plan_Recuperacion_${planData.student.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  
  return doc;
};

// Función para generar PDF a partir de texto libre (para compatibilidad)
export const generateRecoveryPlanFromText = (
  recoveryPlanText: string,
  teacherName: string,
  groupName: string
): jsPDF => {
  // Crear datos formateados a partir del texto
  const recoveryPlanData: RecoveryPlanData = {
    student: {
      id: 0, // Valor genérico ya que no se proporciona un ID específico
      nombre: "Estudiante",
      grupo: groupName,
      nivel: "No especificado"
    },
    teacher: teacherName,
    subjects: [], // No hay materias específicas en el texto libre
    date: new Date().toISOString(),
    recommendations: [
      "Asistir a asesorías con el profesor de la materia",
      "Repasar los temas vistos en clase diariamente",
      "Realizar ejercicios adicionales de práctica",
      "Formar grupos de estudio con compañeros"
    ],
    goals: [
      "Mejorar la comprensión de los temas fundamentales",
      "Entregar todas las tareas pendientes",
      "Participar activamente en clase",
      "Aprobar los exámenes de recuperación"
    ]
  };
  
  // Usar la nueva implementación estandarizada
  const doc = generateRecoveryPlanPDF(recoveryPlanData);
  
  return doc;
};