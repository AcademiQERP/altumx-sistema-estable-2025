import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";

interface RecommendationSection {
  titulo: string;
  contenido: string[];
  prioridad?: "alta" | "media" | "baja";
}

interface TeacherRecommendation {
  fechaGeneracion: string;
  grupoId: number;
  grupoNombre: string;
  profesorNombre: string;
  nivel: string;
  resumenEstadistico: {
    promedioGeneral: number;
    porcentajeAsistencia: number;
    porcentajeAprobacion: number;
    estudiantesEnRiesgo: number;
    totalEstudiantes: number;
  };
  recomendaciones: {
    estrategiasGenerales: RecommendationSection;
    materialApoyo: RecommendationSection;
    estudiantesRiesgo: RecommendationSection;
  };
}

// Función para generar PDF a partir de texto libre
export const generateRecommendationsFromText = (
  recommendationsText: string,
  teacherName: string,
  groupName: string
): jsPDF => {
  // Crear nuevo documento PDF
  const doc = new jsPDF();
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
  
  /* -------------- PÁGINA 1: PORTADA Y CONTENIDO -------------- */
  
  // Encabezado
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(titleSize);
  doc.setFont("helvetica", "bold");
  doc.text("RECOMENDACIONES PEDAGÓGICAS", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(subtitleSize);
  doc.text("Asistente Educativo IA", pageWidth / 2, 30, { align: "center" });
  
  // Información del documento
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "italic");
  doc.text(`Documento generado: ${currentDate}`, pageWidth - 15, 50, { align: "right" });
  
  // Información del grupo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Profesor: ${teacherName}`, 20, 65);
  doc.text(`Grupo: ${groupName}`, 20, 75);
  doc.text(`Fecha de análisis: ${currentDate}`, 20, 85);
  
  // Línea separadora
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 95, pageWidth - 20, 95);
  
  // Título de sección
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("RECOMENDACIONES DETALLADAS", pageWidth / 2, 110, { align: "center" });
  
  // Contenido principal
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  // Dividir el texto en párrafos
  const paragraphs = recommendationsText.split(/\n\n+/);
  let y = 125;
  const lineHeight = 7;
  
  paragraphs.forEach((paragraph, index) => {
    // Detectar si es un título de sección
    const isTitle = paragraph.trim().toUpperCase() === paragraph.trim();
    
    if (isTitle) {
      // Si parece un título, formatearlo como tal
      doc.setTextColor(primaryColor);
      doc.setFontSize(subtitleSize - 2);
      doc.setFont("helvetica", "bold");
      
      // Añadir espacio antes del título excepto el primero
      if (index > 0) y += 10;
      
      doc.text(paragraph.trim(), 20, y);
      y += 8;
      
      // Línea bajo el título
      doc.setDrawColor(secondaryColor);
      doc.setLineWidth(0.3);
      doc.line(20, y - 3, pageWidth - 20, y - 3);
      
      // Restaurar estilo para texto normal
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(normalSize);
      doc.setFont("helvetica", "normal");
    } else {
      // Dividir párrafo en líneas y buscar puntos/viñetas
      const lines = paragraph.split(/\n/);
      
      lines.forEach(line => {
        // Identificar si es punto/viñeta
        const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
        
        if (isBullet) {
          // Formatear como viñeta
          const bulletText = line.trim().replace(/^[-•]\s*/, '');
          
          doc.setDrawColor(secondaryColor);
          doc.setFillColor(secondaryColor);
          doc.circle(25, y - 2, 1, "F");
          doc.text(bulletText, 30, y);
        } else {
          // Texto normal con sangría
          doc.text(line.trim(), 20, y);
        }
        
        // Calcular altura para múltiples líneas
        y += calculateTextHeight(doc, line, pageWidth - 40, isBullet ? 30 : 20) + 2;
      });
      
      // Espacio después del párrafo
      y += 5;
    }
    
    // Verificar si necesitamos una nueva página
    if (y > 270) {
      doc.addPage();
      
      // Encabezado de página
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, pageWidth, 15, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(smallSize);
      doc.setFont("helvetica", "bold");
      doc.text(`RECOMENDACIONES PEDAGÓGICAS - GRUPO ${groupName}`, pageWidth / 2, 10, { align: "center" });
      
      y = 30;
    }
  });
  
  // Pie de página final
  if (y < 250) {
    y = 250;
  }
  
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  
  y += 15;
  
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize - 2);
  doc.setFont("helvetica", "bold");
  doc.text("NOTAS FINALES", pageWidth / 2, y, { align: "center" });
  
  y += 10;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  doc.text([
    "1. Este informe ha sido generado automáticamente basado en análisis de IA.",
    "2. Se recomienda complementar estas recomendaciones con su criterio profesional.",
    "3. El documento debe interpretarse considerando el contexto específico del grupo."
  ], 30, y);
  
  return doc;
};

// Función original para generar PDF con formato estructurado
export const generateTeacherRecommendationsPDF = (data: TeacherRecommendation) => {
  // Crear nuevo documento PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const primaryColor = "#1F3C88";
  const secondaryColor = "#5893D4";
  
  // Configurar estilos y tamaño de texto
  const titleSize = 18;
  const subtitleSize = 14;
  const normalSize = 10;
  const smallSize = 8;
  
  // Fechas y datos generales
  const formattedDate = formatDate(data.fechaGeneracion);
  const currentDate = new Date().toLocaleDateString();
  
  /* -------------- PÁGINA 1: PORTADA Y RESUMEN ESTADÍSTICO -------------- */
  
  // Encabezado
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(titleSize);
  doc.setFont("helvetica", "bold");
  doc.text("RECOMENDACIONES PEDAGÓGICAS", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(subtitleSize);
  doc.text("Asistente Educativo IA", pageWidth / 2, 30, { align: "center" });
  
  // Información del documento
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "italic");
  doc.text(`Documento generado: ${currentDate}`, pageWidth - 15, 50, { align: "right" });
  
  // Información del grupo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Profesor: ${data.profesorNombre}`, 20, 65);
  doc.text(`Grupo: ${data.grupoNombre}`, 20, 75);
  doc.text(`Nivel: ${data.nivel}`, 20, 85);
  doc.text(`Fecha de análisis: ${formattedDate}`, 20, 95);
  
  // Línea separadora
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 105, pageWidth - 20, 105);
  
  // Título de sección
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN ESTADÍSTICO", pageWidth / 2, 120, { align: "center" });
  
  // Tabla de resumen estadístico
  const stats = data.resumenEstadistico;
  
  autoTable(doc, {
    startY: 130,
    head: [["Métrica", "Valor"]],
    body: [
      ["Promedio general del grupo", `${stats.promedioGeneral.toFixed(1)} / 10.0`],
      ["Porcentaje de asistencia", `${stats.porcentajeAsistencia.toFixed(1)}%`],
      ["Porcentaje de aprobación", `${stats.porcentajeAprobacion.toFixed(1)}%`],
      ["Estudiantes en situación de riesgo", `${stats.estudiantesEnRiesgo} de ${stats.totalEstudiantes}`]
    ],
    headStyles: {
      fillColor: secondaryColor,
      textColor: 255,
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [240, 242, 245]
    },
    margin: { left: 40, right: 40 },
  });
  
  // Pie de página de la primera página
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 270, pageWidth - 20, 270);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "italic");
  doc.text("Documento generado por Asistente Educativo IA", pageWidth / 2, 280, { align: "center" });
  
  /* -------------- PÁGINA 2: ESTRATEGIAS Y MATERIALES -------------- */
  
  doc.addPage();
  
  // Encabezado de página
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 15, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "bold");
  doc.text(`RECOMENDACIONES PEDAGÓGICAS - GRUPO ${data.grupoNombre}`, pageWidth / 2, 10, { align: "center" });
  
  // Título de sección: Estrategias generales
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("ESTRATEGIAS GENERALES", 20, 30);
  
  // Descripción de sección
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "italic");
  doc.text("Recomendaciones para mejorar el desempeño general del grupo", 20, 40);
  
  // Agregar línea horizontal
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.3);
  doc.line(20, 45, pageWidth - 20, 45);
  
  // Contenido: Estrategias generales
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  let y = 55;
  const lineHeight = 7;
  
  data.recomendaciones.estrategiasGenerales.contenido.forEach((item, index) => {
    doc.setDrawColor(secondaryColor);
    doc.setFillColor(secondaryColor);
    doc.circle(25, y - 2, 1, "F");
    doc.text(item, 30, y);
    y += calculateTextHeight(doc, item, pageWidth - 40, 30) + lineHeight;
  });
  
  // Título de sección: Material de apoyo
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("MATERIAL DE APOYO RECOMENDADO", 20, y + 10);
  
  // Descripción de sección
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "italic");
  doc.text("Recursos específicos para complementar la enseñanza", 20, y + 20);
  
  // Agregar línea horizontal
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.3);
  doc.line(20, y + 25, pageWidth - 20, y + 25);
  
  // Contenido: Material de apoyo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  y += 35;
  
  data.recomendaciones.materialApoyo.contenido.forEach((item, index) => {
    doc.setDrawColor(secondaryColor);
    doc.setFillColor(secondaryColor);
    doc.circle(25, y - 2, 1, "F");
    doc.text(item, 30, y);
    y += calculateTextHeight(doc, item, pageWidth - 40, 30) + lineHeight;
    
    // Si el texto se acerca al final de la página, pasar a la siguiente
    if (y > 260) {
      doc.addPage();
      
      // Encabezado de página
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, pageWidth, 15, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(smallSize);
      doc.setFont("helvetica", "bold");
      doc.text(`RECOMENDACIONES PEDAGÓGICAS - GRUPO ${data.grupoNombre}`, pageWidth / 2, 10, { align: "center" });
      
      y = 30;
    }
  });
  
  /* -------------- PÁGINA 3: ESTUDIANTES EN RIESGO -------------- */
  
  // Si no estamos en una página nueva, añadir una
  if (y > 100) {
    doc.addPage();
    
    // Encabezado de página
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 15, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(smallSize);
    doc.setFont("helvetica", "bold");
    doc.text(`RECOMENDACIONES PEDAGÓGICAS - GRUPO ${data.grupoNombre}`, pageWidth / 2, 10, { align: "center" });
    
    y = 30;
  }
  
  // Título de sección: Estudiantes en riesgo
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("ATENCIÓN A ESTUDIANTES EN RIESGO", 20, y + 10);
  
  // Descripción de sección
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "italic");
  doc.text(`${data.resumenEstadistico.estudiantesEnRiesgo} estudiantes requieren atención prioritaria`, 20, y + 20);
  
  // Agregar línea horizontal
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.3);
  doc.line(20, y + 25, pageWidth - 20, y + 25);
  
  // Contenido: Estudiantes en riesgo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  
  y += 35;
  
  // Recuadro de alerta
  doc.setFillColor(255, 243, 224); // Color ámbar claro
  doc.setDrawColor(255, 167, 38); // Color ámbar oscuro
  doc.roundedRect(20, y - 5, pageWidth - 40, 25, 3, 3, "FD");
  
  doc.setTextColor(230, 81, 0); // Color naranja oscuro
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "bold");
  doc.text("ALERTA:", 30, y + 5);
  
  doc.setFont("helvetica", "normal");
  doc.text("Los estudiantes identificados necesitan intervención inmediata para evitar el fracaso escolar.", 65, y + 5);
  
  y += 30;
  
  // Recomendaciones para estudiantes en riesgo
  data.recomendaciones.estudiantesRiesgo.contenido.forEach((item, index) => {
    doc.setDrawColor(230, 81, 0); // Color naranja oscuro
    doc.setFillColor(230, 81, 0);
    doc.circle(25, y - 2, 1, "F");
    doc.setTextColor(0, 0, 0);
    doc.text(item, 30, y);
    y += calculateTextHeight(doc, item, pageWidth - 40, 30) + lineHeight;
  });
  
  // Información final
  y += 15;
  
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  
  y += 15;
  
  doc.setTextColor(primaryColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("NOTAS IMPORTANTES", pageWidth / 2, y, { align: "center" });
  
  y += 10;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "normal");
  doc.text([
    "1. Este informe ha sido generado automáticamente basado en los datos disponibles.",
    "2. Se recomienda complementar estas estrategias con su criterio profesional.",
    "3. Considere revisar periódicamente el progreso de los estudiantes en riesgo."
  ], 30, y);
  
  // Guardar el documento
  doc.save(`Recomendaciones_${data.grupoNombre.replace(/\s+/g, "_")}_${formatDate(data.fechaGeneracion, false)}.pdf`);
};

// Función auxiliar para calcular la altura de un texto con saltos de línea
function calculateTextHeight(doc: jsPDF, text: string, maxWidth: number, startX: number): number {
  const textLines = doc.splitTextToSize(text, maxWidth - startX);
  return textLines.length * 7; // Aproximadamente 7 unidades por línea
}