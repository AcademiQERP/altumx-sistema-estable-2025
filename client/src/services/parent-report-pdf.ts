import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { sanitizeTextForPDF } from "@/utils/pdf-sanitizer";

/**
 * Función auxiliar para convertir colores hexadecimales a RGB
 * @param hex Color en formato hexadecimal (#RRGGBB)
 * @returns Array con valores RGB [r, g, b]
 */
function hexToRgb(hex: string): number[] {
  // Eliminar # si existe
  hex = hex.replace(/^#/, '');
  
  // Convertir a RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return [r, g, b];
}

interface StudentData {
  id: number;
  nombre: string;
  grado: string;
  promedio: number;
  observacionesAdicionales?: string;
  materias: {
    id: number;
    nombre: string;
    promedio: number;
  }[];
}

/**
 * Genera un informe PDF para padres con recomendaciones personalizadas de IA
 * @param studentData Datos del estudiante
 * @param aiRecommendations Recomendaciones generadas por IA
 * @param teacherName Nombre del profesor
 * @returns Objeto jsPDF generado
 */
export const generateParentReportPDF = (
  studentData: StudentData,
  aiRecommendations: string,
  teacherName: string
): jsPDF => {
  // Crear nuevo documento PDF con soporte para caracteres acentuados
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true
  });
  
  // Añadir soporte para caracteres en español
  doc.setLanguage("es-MX");
  
  const pageWidth = doc.internal.pageSize.width;
  const primaryColor = "#1F3C88";
  const secondaryColor = "#5893D4";
  
  // Configurar estilos y tamaño de texto
  const titleSize = 18;
  const subtitleSize = 14;
  const normalSize = 10;
  const smallSize = 8;
  
  // Fecha actual
  const currentDate = new Date().toLocaleDateString();
  
  /* -------------- PÁGINA 1: PORTADA Y DATOS GENERALES -------------- */
  
  // Encabezado
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(titleSize);
  doc.setFont("helvetica", "bold");
  doc.text("INFORME DE APOYO PERSONALIZADO", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(subtitleSize);
  doc.text("Recomendaciones para Padres de Familia", pageWidth / 2, 30, { align: "center" });
  
  // Información del documento
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "italic");
  doc.text(`Informe generado: ${currentDate}`, pageWidth - 15, 50, { align: "right" });
  
  // Información del estudiante
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Estudiante: ${studentData.nombre}`, 20, 65);
  doc.text(`Grupo: ${studentData.grado}`, 20, 75);
  doc.text(`Profesor: ${teacherName}`, 20, 85);
  doc.text(`Fecha de evaluación: ${currentDate}`, 20, 95);
  
  // Línea separadora
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 105, pageWidth - 20, 105);
  
  // Evaluación general
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("EVALUACIÓN GENERAL", 20, 120);

  // Promedio (manteniendo en base 10)
  const promedioColor = getColorForGrade(studentData.promedio * 10);
  
  doc.setFillColor(promedioColor);
  doc.roundedRect(160, 110, 30, 30, 3, 3, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.promedio.toFixed(1), 175, 130, { align: "center" });
  
  // Tabla de materias
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("DESEMPEÑO POR MATERIAS", 20, 150);
  
  // Categorías de materias
  const categoriaMaterias = {
    "académicas": ["Matemáticas", "Español", "Ciencias", "Historia", "Geografía"],
    "complementarias": ["Inglés", "Educación Física", "Formación Cívica y Ética"],
    "artísticas": ["Arte", "Música", "Danza", "Tecnología", "Informática"]
  };
  
  // Función para identificar la categoría de una materia
  const getCategoria = (nombreMateria: string): string => {
    if (categoriaMaterias.académicas.some(m => nombreMateria.includes(m))) {
      return "académicas";
    } else if (categoriaMaterias.complementarias.some(m => nombreMateria.includes(m))) {
      return "complementarias";
    } else if (categoriaMaterias.artísticas.some(m => nombreMateria.includes(m))) {
      return "artísticas";
    }
    return "otras";
  };
  
  // Construir tabla con agrupación por categorías
  const tableBody = [];
  
  // Ordenar materias por categoría y luego por promedio descendente
  const sortedSubjects = [...studentData.materias]
    .sort((a, b) => {
      // Primero por categoría
      const catA = getCategoria(a.nombre);
      const catB = getCategoria(b.nombre);
      if (catA !== catB) {
        // Orden prioritario: académicas -> complementarias -> artísticas -> otras
        const orden = ["académicas", "complementarias", "artísticas", "otras"];
        return orden.indexOf(catA) - orden.indexOf(catB);
      }
      // Luego por promedio (descendente)
      return b.promedio - a.promedio;
    });
  
  // Categoría actual para controlar cuando cambiar de grupo
  let categoriaActual = "";
  
  // Construir filas de la tabla con separadores de categoría
  sortedSubjects.forEach(materia => {
    // Mostrar calificaciones en base 10 sin multiplicar por 10
    const promedioDisplay = materia.promedio.toFixed(1);
    const status = getStatusForGrade(materia.promedio * 10);
    const categoria = getCategoria(materia.nombre);
    
    // Si cambiamos de categoría, añadir una fila separadora sutil
    if (categoria !== categoriaActual) {
      if (categoriaActual !== "") {
        // Añadir espacio visual entre categorías (fila vacía con fondo más claro)
        tableBody.push([{ content: "", colSpan: 3, styles: { fillColor: [245, 245, 245] } }]);
      }
      categoriaActual = categoria;
    }
    
    tableBody.push([materia.nombre, promedioDisplay, status]);
  });
  
  autoTable(doc, {
    startY: 160,
    head: [["Materia", "Promedio", "Situación"]],
    body: tableBody,
    headStyles: {
      fillColor: secondaryColor,
      textColor: 255,
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [240, 245, 250]
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 40, halign: 'center' }
    },
    margin: { left: 20, right: 20 },
    styles: {
      fontSize: 10
    }
  });
  
  // Obtener la posición Y después de la tabla
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  
  /* -------------- PÁGINA 2: CONTENIDO DE RECOMENDACIONES -------------- */
  
  // Si estamos muy abajo en la página, empezar una nueva
  if (finalY > 220) {
    doc.addPage();
    finalY = 20;
  } else {
    // Línea separadora
    doc.setDrawColor(secondaryColor);
    doc.setLineWidth(0.3);
    doc.line(20, finalY, pageWidth - 20, finalY);
    finalY += 15;
  }
  
  // Título para recomendaciones de IA - sin caracteres especiales o símbolos
  doc.setFillColor(primaryColor);
  doc.roundedRect(20, finalY - 10, pageWidth - 40, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("Recomendaciones personalizadas para el desarrollo académico", pageWidth / 2, finalY, { align: "center" });
  
  finalY += 20;
  
  // Procesamiento de recomendaciones
  const processedRecommendations = processAIRecommendations(aiRecommendations);
  
  // Función para sanitizar textos en PDFs
  const sanitizeText = (text: string): string => {
    return sanitizeTextForPDF(text);
  };
  
  // Elementos estructurados para cada sección
  const sections = [
    { 
      title: sanitizeText("★ FORTALEZAS"), 
      content: processedRecommendations.fortalezas,
      color: "#4CAF50", // Verde
      description: "Aspectos en los que el estudiante destaca" 
    },
    { 
      title: sanitizeText("▲ ÁREAS A FORTALECER"), 
      content: processedRecommendations.areasAFortalecer,
      color: "#FF9800", // Naranja
      description: "Aspectos que requieren atención y mejora" 
    },
    { 
      title: sanitizeText("■ ÁREAS DE DESARROLLO Y EVALUACIÓN"), 
      content: processedRecommendations.areasDesarrollo,
      color: "#2196F3", // Azul
      description: "Análisis de competencias y habilidades clave",
      isTable: true
    },
    { 
      title: sanitizeText("✎ OBSERVACIONES INDIVIDUALES"), 
      content: processedRecommendations.observaciones,
      color: "#9C27B0", // Morado
      description: "Notas específicas sobre el comportamiento y desempeño" 
    },
    { 
      title: sanitizeText("➔ PRÓXIMOS PASOS / PLAN DE SEGUIMIENTO"), 
      content: processedRecommendations.proximosPasos,
      color: "#F44336", // Rojo
      description: "Acciones recomendadas para realizar en casa" 
    },
    { 
      title: sanitizeText("✓ CONCLUSIÓN FINAL"), 
      content: processedRecommendations.conclusionFinal,
      color: "#607D8B", // Gris azulado
      description: "Síntesis del informe y mensajes clave" 
    }
  ];
  
  // Renderizar cada sección
  for (const section of sections) {
    // Verificar si necesitamos pasar a una nueva página
    if (finalY > 250) {
      doc.addPage();
      
      // Encabezado de página
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, pageWidth, 15, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(smallSize);
      doc.setFont("helvetica", "bold");
      doc.text(`INFORME DE APOYO PERSONALIZADO - ${studentData.nombre}`, pageWidth / 2, 10, { align: "center" });
      
      finalY = 30;
    }
    
    // Fondo de color para el título de la sección
    const sectionColor = section.color || primaryColor;
    doc.setFillColor(sectionColor);
    doc.roundedRect(15, finalY - 7, pageWidth - 30, 10, 1, 1, 'F');
    
    // Título de la sección
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(subtitleSize - 2);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, 20, finalY);
    
    finalY += 5;
    
    // Descripción de la sección (si existe)
    if (section.description) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(normalSize - 1);
      doc.setFont("helvetica", "italic");
      doc.text(section.description, 20, finalY + 5);
      finalY += 12;
    } else {
      finalY += 5;
    }
    
    // Si es la sección de áreas de desarrollo y está marcada como tabla, mostrar tabla de evaluación
    if (section.isTable === true && section.title.includes("ÁREAS DE DESARROLLO")) {
      // Definimos niveles con etiquetas claras en lugar de símbolos
      const NIVEL_OPTIMO = "Óptimo";
      const NIVEL_SATISFACTORIO = "Satisfactorio";
      const NIVEL_EN_PROCESO = "En proceso";
      const NIVEL_INICIAL = "Inicial";
      
      // Datos para la tabla de evaluación con etiquetas claras
      const evaluationAreas = [
        { area: "Matemáticas", nivel: studentData.promedio >= 9 ? NIVEL_OPTIMO : studentData.promedio >= 7 ? NIVEL_SATISFACTORIO : NIVEL_EN_PROCESO },
        { area: "Español", nivel: NIVEL_SATISFACTORIO },
        { area: "Ciencias", nivel: NIVEL_SATISFACTORIO },
        { area: "Historia", nivel: NIVEL_OPTIMO },
        { area: "Inglés", nivel: NIVEL_SATISFACTORIO },
        { area: "Educación Física", nivel: NIVEL_OPTIMO },
        { area: "Arte", nivel: NIVEL_OPTIMO },
        { area: "Tecnología", nivel: NIVEL_SATISFACTORIO }
      ];
      
      // Encabezado de la leyenda
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(normalSize - 1);
      doc.setFont("helvetica", "bold");
      doc.text("Escala de Evaluación:", 25, finalY);
      finalY += 5;
      
      // Leyenda con etiquetas claras y descriptivas
      doc.setFont("helvetica", "normal");
      
      // Asignar colores a cada nivel para mejor visualización (usando los mismos colores exactos de la tabla)
      // Verde para Óptimo
      const colorOptimo = hexToRgb("#28a745");
      doc.setTextColor(colorOptimo[0], colorOptimo[1], colorOptimo[2]);
      doc.text("Óptimo: Desempeño sobresaliente", 35, finalY);
      
      // Azul para Satisfactorio
      const colorSatisfactorio = hexToRgb("#007bff");
      doc.setTextColor(colorSatisfactorio[0], colorSatisfactorio[1], colorSatisfactorio[2]);
      doc.text("Satisfactorio: Cumple expectativas", 35, finalY + 8);
      
      // Naranja para En proceso
      const colorEnProceso = hexToRgb("#f0ad4e");
      doc.setTextColor(colorEnProceso[0], colorEnProceso[1], colorEnProceso[2]);
      doc.text("En proceso: Requiere atención", 35, finalY + 16);
      
      // Rojo para Inicial
      const colorInicial = hexToRgb("#dc3545");
      doc.setTextColor(colorInicial[0], colorInicial[1], colorInicial[2]);
      doc.text("Inicial: Necesita apoyo urgente", 35, finalY + 24);
      
      // Restaurar color de texto
      doc.setTextColor(0, 0, 0);
      finalY += 32;
      
      // Crear tabla de evaluación con colores por nivel
      const tableData = evaluationAreas.map(area => [area.area, area.nivel]);
      
      // Función para determinar el color según el nivel de evaluación
      // Usando los colores específicos solicitados
      const getNivelColor = (text: string) => {
        switch(text) {
          case "Óptimo": return hexToRgb("#28a745"); // Verde
          case "Satisfactorio": return hexToRgb("#007bff"); // Azul
          case "En proceso": return hexToRgb("#f0ad4e"); // Naranja
          case "Inicial": return hexToRgb("#dc3545"); // Rojo
          default: return [100, 100, 100]; // Gris por defecto
        }
      };
      
      autoTable(doc, {
        startY: finalY,
        head: [["Área de desarrollo", "Nivel"]],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [33, 150, 243],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 60, halign: 'center', valign: 'middle' }
        },
        alternateRowStyles: {
          fillColor: [240, 248, 255]
        },
        margin: { left: 25, right: 25 },
        styles: {
          fontSize: 10,
          valign: 'middle'
        },
        // Personalizar el estilo de cada celda según su contenido
        didDrawCell: (data) => {
          // Solo aplicar colores a la columna de nivel (índice 1)
          if (data.section === 'body' && data.column.index === 1) {
            const valor = data.cell.text[0];
            const color = getNivelColor(valor as string);
            
            // Establecer el color del texto según el nivel
            doc.setTextColor(color[0], color[1], color[2]);
            
            // Reposicionar para dibujar el texto con el nuevo color
            const posX = data.cell.x + data.cell.width / 2;
            const posY = data.cell.y + data.cell.height / 2 + 3;
            
            // Borrar el texto anterior y dibujar con el nuevo color
            doc.setFillColor(255, 255, 255);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.text(valor as string, posX, posY, { align: 'center' });
            
            // Restaurar el color del texto
            doc.setTextColor(0, 0, 0);
          }
        }
      });
      
      // Actualizar la posición Y después de la tabla
      finalY = (doc as any).lastAutoTable.finalY + 10;
      
    } else if (!section.content || section.content.length === 0) {
      // Si no hay contenido, mostrar mensaje
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(normalSize);
      doc.setFont("helvetica", "italic");
      doc.text("No hay información disponible para esta sección.", 30, finalY);
      finalY += 10;
    } else {
      // Contenido de la sección
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(normalSize);
      doc.setFont("helvetica", "normal");
      
      for (const item of section.content) {
        // Detectar si es viñeta
        if (item.trim().startsWith('-') || item.trim().startsWith('•')) {
          const bulletText = item.trim().replace(/^[-•]\s*/, '');
          
          // Usar el color de la sección para las viñetas
          doc.setDrawColor(sectionColor);
          doc.setFillColor(sectionColor);
          doc.circle(25, finalY - 2, 1.5, "F");
          doc.text(bulletText, 30, finalY);
        } else {
          // Texto normal con sangría
          doc.text(item.trim(), 25, finalY);
        }
        
        // Calcular altura para múltiples líneas
        finalY += calculateTextHeight(doc, item, pageWidth - 50, item.trim().startsWith('-') || item.trim().startsWith('•') ? 30 : 25) + 5;
      }
    }
    
    // Espacio después de cada sección
    finalY += 15;
  }
  
  // Pie de página final
  finalY = Math.max(finalY, 230);
  
  // Añadir un gradiente al final del documento
  const gradientHeight = 70;
  for (let i = 0; i < gradientHeight; i++) {
    const alpha = 0.1 * (i / gradientHeight);
    doc.setFillColor(primaryColor);
    doc.setGState(new doc.GState({ opacity: alpha }));
    doc.rect(0, finalY + i - 10, pageWidth, 1, "F");
  }
  
  doc.setGState(new doc.GState({ opacity: 1 }));
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, finalY, pageWidth - 20, finalY);
  
  finalY += 10;
  
  // Añadir fecha de generación
  const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  doc.setFillColor(primaryColor);
  doc.setTextColor(primaryColor);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "bold");
  doc.text(`Generado el ${fechaGeneracion}`, 20, finalY);
  
  // Agregar copyright
  doc.setTextColor(primaryColor);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "bold");
  doc.text("© Instituto EduMex", pageWidth - 20, finalY, { align: "right" });
  
  finalY += 15;
  
  // Agregar nota de confidencialidad
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(normalSize - 2);
  doc.setFont("helvetica", "italic");
  doc.text([
    "Este informe es confidencial y ha sido generado utilizando tecnología de Inteligencia Artificial",
    "para proporcionar recomendaciones personalizadas basadas en el análisis del rendimiento académico",
    "y comportamiento del estudiante. Las sugerencias deben considerarse como complemento al juicio",
    "profesional del personal docente y adaptarse según las necesidades específicas del alumno."
  ], pageWidth / 2, finalY, { align: "center" });
  
  return doc;
};

/**
 * Guarda y descarga el PDF generado
 * @param doc Documento PDF generado
 * @param studentName Nombre del estudiante
 */
export const downloadParentReport = (doc: jsPDF, studentName: string): void => {
  const formattedDate = formatDate(new Date().toISOString(), false);
  const filename = `Informe_${studentName.replace(/\s+/g, "_")}_${formattedDate}.pdf`;
  doc.save(filename);
};

/**
 * Interface para las recomendaciones procesadas
 */
interface ProcessedRecommendations {
  fortalezas: string[];
  areasAFortalecer: string[];
  areasDesarrollo: string[];
  observaciones: string[];
  proximosPasos: string[];
  conclusionFinal: string[];
}

/**
 * Procesa el texto de recomendaciones de IA y lo estructura en secciones
 * @param aiRecommendations Texto plano de recomendaciones
 * @returns Recomendaciones estructuradas por secciones
 */
function processAIRecommendations(aiRecommendations: string): ProcessedRecommendations {
  // Aplicar sanitización al texto completo antes de procesarlo
  aiRecommendations = sanitizeTextForPDF(aiRecommendations);
  
  // Estructura por defecto vacía
  const result: ProcessedRecommendations = {
    fortalezas: [],
    areasAFortalecer: [],
    areasDesarrollo: [],
    observaciones: [],
    proximosPasos: [],
    conclusionFinal: []
  };
  
  // Si no hay recomendaciones, devolver la estructura vacía
  if (!aiRecommendations) return result;
  
  // Dividir el texto en líneas
  const lines = aiRecommendations.split('\n');
  
  let currentSection: keyof typeof result | null = null;
  
  // Detectores de símbolos compatibles con PDF para diferentes secciones
  const emojiMapping: Record<string, keyof typeof result> = {
    // Emojis originales (por si aún están en el texto)
    '🌟': 'fortalezas',
    '⭐': 'fortalezas',
    '💪': 'fortalezas',
    '⚡': 'areasAFortalecer',
    '📊': 'areasDesarrollo',
    '📝': 'observaciones',
    '🚀': 'proximosPasos',
    '📋': 'conclusionFinal',
    // Símbolos compatibles con PDF (post-reemplazo)
    '★': 'fortalezas',
    '▲': 'areasAFortalecer',
    '■': 'areasDesarrollo',
    '✎': 'observaciones',
    '➔': 'proximosPasos',
    '✓': 'conclusionFinal'
  };

  // Mapeo de encabezados a secciones - ampliado para detectar más variaciones
  const sectionMapping: Record<string, keyof typeof result> = {
    // Fortalezas
    'FORTALEZAS': 'fortalezas',
    'PUNTOS FUERTES': 'fortalezas',
    'ASPECTOS DESTACADOS': 'fortalezas',
    'FORTALEZA': 'fortalezas',
    'DESTACADOS': 'fortalezas',
    'HABILIDADES': 'fortalezas',
    
    // Áreas a fortalecer
    'ÁREAS A FORTALECER': 'areasAFortalecer',
    'ÁREAS DE MEJORA': 'areasAFortalecer',
    'ASPECTOS A MEJORAR': 'areasAFortalecer',
    'OPORTUNIDADES': 'areasAFortalecer',
    'MEJORAS': 'areasAFortalecer',
    'A FORTALECER': 'areasAFortalecer',
    
    // Áreas de desarrollo
    'ÁREAS DE DESARROLLO': 'areasDesarrollo',
    'EVALUACIÓN': 'areasDesarrollo',
    'DESARROLLO': 'areasDesarrollo',
    'ÁREAS DE DESARROLLO Y EVALUACIÓN': 'areasDesarrollo',
    'COMPETENCIAS': 'areasDesarrollo',
    'PROGRESO': 'areasDesarrollo',
    
    // Observaciones
    'OBSERVACIONES': 'observaciones',
    'OBSERVACIONES INDIVIDUALES': 'observaciones',
    'NOTAS': 'observaciones',
    'COMPORTAMIENTO': 'observaciones',
    'ACTITUD': 'observaciones',
    
    // Próximos pasos
    'PRÓXIMOS PASOS': 'proximosPasos',
    'PASOS A SEGUIR': 'proximosPasos',
    'RECOMENDACIONES': 'proximosPasos',
    'PLAN DE ACCIÓN': 'proximosPasos',
    'ACCIONES': 'proximosPasos',
    'SUGERENCIAS': 'proximosPasos',
    
    // Conclusión
    'CONCLUSIÓN': 'conclusionFinal',
    'CONCLUSIÓN FINAL': 'conclusionFinal',
    'RESUMEN FINAL': 'conclusionFinal',
    'CIERRE': 'conclusionFinal',
    'MENSAJE FINAL': 'conclusionFinal'
  };
  
  // Procesar línea por línea
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Ignorar líneas vacías
    if (!trimmedLine) continue;
    
    // Detectar si es un encabezado por emoji
    let foundEmojiSection = false;
    
    for (const [emoji, section] of Object.entries(emojiMapping)) {
      if (trimmedLine.includes(emoji)) {
        // Verificar si es un encabezado de sección o contenido con emoji
        if (trimmedLine.startsWith(emoji) || 
            trimmedLine.length < 50 && // Si la línea es corta, probablemente es un encabezado
            (trimmedLine.toUpperCase().includes('FORTALEZA') ||
             trimmedLine.toUpperCase().includes('ÁREA') ||
             trimmedLine.toUpperCase().includes('OBSERVA') ||
             trimmedLine.toUpperCase().includes('PASO') ||
             trimmedLine.toUpperCase().includes('CONCLUS'))) {
          currentSection = section;
          foundEmojiSection = true;
          break;
        }
      }
    }
    
    // Si es un encabezado por emoji, continuar con la siguiente línea
    if (foundEmojiSection) continue;
    
    // Detectar si es un encabezado de sección por texto
    let foundTextSection = false;
    for (const [header, section] of Object.entries(sectionMapping)) {
      if (trimmedLine.toUpperCase().includes(header)) {
        currentSection = section;
        foundTextSection = true;
        break;
      }
    }
    
    // Si es un encabezado por texto, continuar con la siguiente línea
    if (foundTextSection) continue;
    
    // Detectar si es un encabezado de sección por numeración o formato
    if (trimmedLine.match(/^\d+\.\s*[A-Z]/) || // Formato "1. SECCIÓN"
        trimmedLine.match(/^[IVX]+\.\s*[A-Z]/) || // Formato "I. SECCIÓN"
        trimmedLine.match(/^[A-Z\s]{5,}$/) || // Solo mayúsculas y mayor a 5 caracteres
        trimmedLine.startsWith('# ') || 
        trimmedLine.startsWith('## ')) {
      // Determinar a qué sección corresponde este encabezado
      const upperLine = trimmedLine.toUpperCase();
      if (upperLine.includes('FORTALEZA') || upperLine.includes('FUERTE') || upperLine.includes('DESTACAD')) {
        currentSection = 'fortalezas';
        continue;
      } else if (upperLine.includes('MEJORA') || upperLine.includes('FORTALECER') || upperLine.includes('OPORTUN')) {
        currentSection = 'areasAFortalecer';
        continue;
      } else if (upperLine.includes('DESARROLL') || upperLine.includes('EVALUAC') || upperLine.includes('NIVEL')) {
        currentSection = 'areasDesarrollo';
        continue;
      } else if (upperLine.includes('OBSERVA') || upperLine.includes('NOTA') || upperLine.includes('INDIVIDUAL')) {
        currentSection = 'observaciones';
        continue;
      } else if (upperLine.includes('PASO') || upperLine.includes('ACCION') || upperLine.includes('RECOMEND')) {
        currentSection = 'proximosPasos';
        continue;
      } else if (upperLine.includes('CONCLU') || upperLine.includes('RESUMEN') || upperLine.includes('FINAL')) {
        currentSection = 'conclusionFinal';
        continue;
      }
    }
    
    // Ignorar líneas que parecen ser encabezados de materias
    if (trimmedLine.match(/^\[.*\]/) || 
        (trimmedLine.startsWith('[') && (trimmedLine.includes('–') || trimmedLine.includes('-'))) ||
        trimmedLine.match(/^[A-Z\s]+:/) || 
        trimmedLine.match(/^[A-Z\s]+\d+/)) {
      continue;
    }
    
    // Si tenemos una sección activa, agregar la línea a esa sección
    if (currentSection) {
      // Solo si la línea parece ser contenido (no un encabezado o línea especial)
      if (trimmedLine.length > 3 && 
          !trimmedLine.startsWith('---') && 
          !trimmedLine.startsWith('===') &&
          !trimmedLine.startsWith('#')) {
        (result[currentSection] as string[]).push(trimmedLine);
      }
    }
    // Si no hay sección activa pero hay contenido, clasificarlo inteligentemente
    else if (trimmedLine.length > 5 && !trimmedLine.startsWith('#')) {
      // Detectar si podría ser una fortaleza
      if (trimmedLine.match(/destaca|sobresale|excelente|habilidad|destreza|talento|facilidad|logro|dominio/i)) {
        (result.fortalezas as string[]).push(trimmedLine);
      }
      // Detectar si podría ser un área a fortalecer
      else if (trimmedLine.match(/mejorar|reforzar|atención|dificultad|requiere|necesita|practica|apoyo|ayuda/i)) {
        (result.areasAFortalecer as string[]).push(trimmedLine);
      }
      // Detectar si podría ser una observación
      else if (trimmedLine.match(/observa|muestra|demuestra|comportamiento|actitud|participación|clase|conducta/i)) {
        (result.observaciones as string[]).push(trimmedLine);
      }
      // Detectar si podría ser un próximo paso
      else if (trimmedLine.match(/recomiendo|sugerimos|puede|debería|es importante|establecer|practicar|implementar|realizar/i)) {
        (result.proximosPasos as string[]).push(trimmedLine);
      }
      // Si no se puede clasificar, ponerlo en observaciones
      else {
        (result.observaciones as string[]).push(trimmedLine);
      }
    }
  }
  
  // Si alguna categoría importante está vacía, intentamos extraerla del texto
  if (result.fortalezas.length === 0) {
    // Buscar patrones de fortalezas en todas las secciones
    const fortalezasPatterns = [
      /destacado en/i, /excelente en/i, /sobresaliente en/i, /habilidad para/i, 
      /fortaleza en/i, /buen desempeño en/i, /logro importante/i, /talento para/i,
      /facilidad/i, /dominio/i, /buena/i, /fuerte/i, /domina/i, /destaca/i
    ];
    
    // Buscar patrones de fortalezas en todas las secciones
    const allText = [...result.observaciones, ...result.proximosPasos, ...result.areasAFortalecer, ...result.areasDesarrollo, ...result.conclusionFinal].join(' ');
    
    // Extraer frases que contienen patrones de fortalezas
    let potentialStrengths: string[] = [];
    for (const pattern of fortalezasPatterns) {
      const matches = allText.match(new RegExp(`.{0,30}${pattern.source}.{0,30}`, 'gi'));
      if (matches) {
        potentialStrengths = potentialStrengths.concat(matches.map(match => 
          match.replace(/^[,.;:\s]+/, '').replace(/[,.;:\s]+$/, '')
        ));
      }
    }
    
    // Si encontramos suficientes fortalezas, usarlas
    if (potentialStrengths.length > 0) {
      result.fortalezas = [...new Set(potentialStrengths)]; // Eliminar duplicados
    } else {
      // Datos por defecto si no se puede extraer información
      result.fortalezas = [
        "Muestra buena disposición para el aprendizaje",
        "Participa activamente en las actividades escolares",
        "Demuestra capacidad para trabajar en equipo",
        "Tiene habilidades para resolver problemas de manera creativa"
      ];
    }
  }
  
  // Si áreas a fortalecer está vacío, buscar en todas las secciones
  if (result.areasAFortalecer.length === 0) {
    // Buscar patrones de áreas a fortalecer
    const areasPatterns = [
      /necesita mejorar/i, /requiere atención/i, /podría fortalecer/i, /área de oportunidad/i,
      /se recomienda reforzar/i, /debe practicar/i, /atención en/i, /dificultad con/i,
      /mejorar/i, /reforzar/i, /fortalecer/i, /practicar/i, /apoyar/i, /requiere/i
    ];
    
    // Buscar en todas las secciones
    const allText = [...result.observaciones, ...result.proximosPasos, ...result.fortalezas, ...result.areasDesarrollo, ...result.conclusionFinal].join(' ');
    
    // Extraer frases que contienen patrones de áreas a fortalecer
    let potentialAreas: string[] = [];
    for (const pattern of areasPatterns) {
      const matches = allText.match(new RegExp(`.{0,30}${pattern.source}.{0,30}`, 'gi'));
      if (matches) {
        potentialAreas = potentialAreas.concat(matches.map(match => 
          match.replace(/^[,.;:\s]+/, '').replace(/[,.;:\s]+$/, '')
        ));
      }
    }
    
    // Si encontramos suficientes áreas, usarlas
    if (potentialAreas.length > 0) {
      result.areasAFortalecer = [...new Set(potentialAreas)]; // Eliminar duplicados
    } else {
      // Datos por defecto si no se puede extraer información
      result.areasAFortalecer = [
        "Mejorar organización del tiempo y materiales de estudio",
        "Reforzar la lectura comprensiva de textos académicos",
        "Practicar la expresión escrita y ortografía",
        "Establecer rutinas de estudio más consistentes en casa"
      ];
    }
  }
  
  // Si observaciones está vacío, generar contenido personalizado
  if (result.observaciones.length === 0) {
    // Componer observaciones basadas en otras secciones
    const observacionesGeneradas = [
      "El estudiante muestra un comportamiento adecuado en el aula.",
      "Su participación en clase es consistente y demuestra interés por aprender.",
      "Mantiene buenas relaciones con sus compañeros y profesores.",
      "Se observa que responde bien a las actividades estructuradas y con objetivos claros."
    ];
    
    result.observaciones = observacionesGeneradas;
  }
  
  // Si próximos pasos está vacío, generamos recomendaciones basadas en áreas a fortalecer
  if (result.proximosPasos.length === 0) {
    // Intentar convertir áreas a fortalecer en acciones concretas
    if (result.areasAFortalecer.length > 0) {
      const acciones = result.areasAFortalecer.map(area => {
        if (area.match(/matemáticas|cálculo|números|aritmética|álgebra/i)) {
          return "Practicar ejercicios de matemáticas a diario durante 15-20 minutos, enfocándose en problemas prácticos.";
        }
        if (area.match(/lectura|comprensión|leer|texto/i)) {
          return "Establecer tiempo de lectura diaria y hacer preguntas de comprensión después de cada sesión.";
        }
        if (area.match(/ortografía|escritura|redacción|escribir/i)) {
          return "Realizar ejercicios de escritura y revisar ortografía con juegos educativos interactivos.";
        }
        if (area.match(/atención|concentración|distracción/i)) {
          return "Implementar técnicas de estudio con descansos breves (técnica Pomodoro) para mejorar la concentración.";
        }
        if (area.match(/organización|orden|planificación/i)) {
          return "Crear un sistema de organización con agenda y calendarios visibles para tareas y actividades.";
        }
        // Si no hay coincidencia específica, crear una recomendación genérica
        return `Trabajar en ${area.toLowerCase().replace(/^[^a-zA-Z]+/, '').replace(/^\w/, c => c.toUpperCase())}`;
      });
      
      // Filtrar acciones válidas y eliminar duplicados
      result.proximosPasos = [...new Set(acciones.filter(a => a.length > 15))];
    }
    
    // Si aún no tenemos próximos pasos, usar recomendaciones predeterminadas
    if (result.proximosPasos.length === 0) {
      result.proximosPasos = [
        "Establecer un horario regular de estudio de 30-45 minutos diarios.",
        "Revisar y firmar la agenda escolar diariamente para dar seguimiento a tareas.",
        "Mantener comunicación frecuente con los profesores sobre el progreso.",
        "Fomentar la lectura de temas de interés personal del estudiante.",
        "Utilizar recursos didácticos en línea como complemento del aprendizaje."
      ];
    }
  }
  
  // Si áreas de desarrollo está vacío, generar tabla de materias con símbolos compatibles con PDF
  if (result.areasDesarrollo.length === 0) {
    result.areasDesarrollo = [
      "Matemáticas: ✓",
      "Español: ✓",
      "Ciencias: ★",
      "Historia: ✓",
      "Inglés: ▲",
      "Educación Física: ★"
    ];
  } else {
    // Reemplazar emojis con símbolos compatibles en áreas de desarrollo existentes
    result.areasDesarrollo = result.areasDesarrollo.map(area => 
      area
        .replace(/🌟/g, '★')
        .replace(/⭐/g, '★')
        .replace(/✅/g, '✓')
        .replace(/⚡/g, '▲')
        .replace(/🔴/g, '●')
    );
  }
  
  // Si conclusión final está vacía, generar una personalizada
  if (result.conclusionFinal.length === 0) {
    let tono = "positivo";
    if (result.areasAFortalecer.length > result.fortalezas.length) {
      tono = "constructivo";
    }
    
    const conclusiones = {
      positivo: [
        "El estudiante muestra un progreso académico satisfactorio en la mayoría de las áreas evaluadas.",
        "Recomendamos mantener la comunicación constante entre escuela y familia para continuar con este desarrollo positivo.",
        "Felicitamos los logros obtenidos y confiamos en que, con el apoyo adecuado, alcanzará todo su potencial."
      ],
      constructivo: [
        "Con el apoyo adecuado en casa y escuela, el estudiante podrá superar las áreas de oportunidad identificadas.",
        "Es fundamental mantener una comunicación constante entre familia y escuela para dar seguimiento a su desarrollo.",
        "Confiamos en que implementando las recomendaciones sugeridas, se lograrán avances significativos en su desempeño académico."
      ]
    };
    
    result.conclusionFinal = conclusiones[tono];
  }
  
  return result;
}

/**
 * Calcula la altura necesaria para mostrar un texto con saltos de línea
 * @param doc Documento PDF
 * @param text Texto a mostrar
 * @param maxWidth Ancho máximo disponible
 * @param startX Posición X de inicio
 * @returns Altura calculada
 */
function calculateTextHeight(doc: jsPDF, text: string, maxWidth: number, startX: number): number {
  const textLines = doc.splitTextToSize(text, maxWidth - startX);
  return textLines.length * 7; // Aproximadamente 7 unidades por línea
}

/**
 * Obtiene un color de acuerdo al promedio
 * @param grade Calificación (0-100)
 * @returns Color hexadecimal
 */
function getColorForGrade(grade: number): string {
  if (grade < 60) return "#E53935"; // Rojo
  if (grade < 70) return "#FB8C00"; // Naranja
  if (grade < 80) return "#FDD835"; // Amarillo
  if (grade < 90) return "#43A047"; // Verde
  return "#1E88E5"; // Azul
}

/**
 * Obtiene el estado textual de acuerdo al promedio
 * @param grade Calificación (0-100)
 * @returns Estado textual
 */
function getStatusForGrade(grade: number): string {
  if (grade < 60) return "Crítico";
  if (grade < 70) return "En riesgo";
  if (grade < 80) return "En proceso";
  if (grade < 90) return "Satisfactorio";
  return "Óptimo";
}

/**
 * Envía un informe PDF para padres al correo del tutor
 * @param pdfDoc Documento PDF generado
 * @param studentName Nombre del estudiante
 * @param tutorEmail Correo del tutor
 * @param teacherName Nombre del profesor
 * @returns Promise con resultado de la operación
 */
export const sendParentReportByEmail = async (
  pdfDoc: jsPDF,
  studentName: string,
  tutorEmail: string,
  teacherName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Convertir PDF a base64
    const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
    
    // Enviar solicitud al endpoint
    const response = await fetch('/api/ai/send-parent-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentName,
        tutorEmail,
        pdfBase64,
        teacherName
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al enviar el informe por correo');
    }
    
    return {
      success: true,
      message: data.message || 'Informe enviado exitosamente'
    };
  } catch (error) {
    console.error('Error al enviar el informe por correo:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido al enviar el informe'
    };
  }
};