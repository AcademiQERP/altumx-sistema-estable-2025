import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { generateRecommendations } from "@/services/recommendations-service";
import { Recommendation, RecommendationType } from "@/components/observaciones/RecommendationBlock";

// Definición de constantes para los tipos de recomendación usados en el PDF
const TIPO_REFUERZO_CONCEPTOS: RecommendationType = "refuerzo_conceptos";
const TIPO_EJERCICIOS_ADICIONALES: RecommendationType = "ejercicios_adicionales";
const TIPO_PARTICIPACION_ACTIVA: RecommendationType = "participacion_activa";
const TIPO_TUTORIA_RECOMENDADA: RecommendationType = "tutoria_recomendada";
const TIPO_ESTRATEGIAS_SUGERIDAS: RecommendationType = "estrategias_sugeridas";

// Tipos de datos necesarios para el reporte
type Alumno = {
  id: number;
  nombre: string;
  grupoId: number;
  grupoNombre: string;
  nivel: string;
  promedio: number;
  estado: "completo" | "incompleto" | "sin_iniciar";
  progreso: {
    completados: number;
    total: number;
    porcentaje: number;
  };
  materias?: {
    id: number;
    nombre: string;
    promedio: number;
  }[];
};

type ResumenGrupal = {
  evaluacionCompleta: number;
  evaluacionIncompleta: number;
  sinIniciar: number;
  totalSubtemas: number;
};

type SeguimientoGrupal = {
  totalAlumnos: number;
  resumen: ResumenGrupal;
  grupos: {
    id: number;
    nombre: string;
    nivel: string;
  }[];
  alumnos: Alumno[];
};

/**
 * Genera un reporte PDF individual con la información detallada del alumno
 * @param alumno Datos del alumno para generar el reporte
 * @param subtemas Lista de subtemas evaluados (opcional)
 * @param includeRecommendations Indica si se deben incluir recomendaciones personalizadas
 * @returns Objeto jsPDF con el documento generado
 */
export const generarReporteIndividualPDF = (
  alumno: Alumno,
  subtemas?: { id: number; nombre: string; comentario?: string }[],
  includeRecommendations: boolean = true
): jsPDF => {
  // Crear nuevo documento PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Configuración de colores y estilos
  const primaryColor = "#1F3C88";
  const secondaryColor = "#5893D4";
  const accentColor = "#F0A500";
  const textColor = "#333333";
  
  // Configurar estilos y tamaño de texto
  const titleSize = 18;
  const subtitleSize = 14;
  const normalSize = 10;
  const smallSize = 8;
  
  // Fecha actual
  const currentDate = new Date().toLocaleDateString('es-MX');
  
  /* -------------- PÁGINA 1: PORTADA Y DATOS DEL ALUMNO -------------- */
  
  // Encabezado
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(titleSize);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE EVALUACIÓN INDIVIDUAL", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(subtitleSize);
  doc.text("Panel de Seguimiento Académico", pageWidth / 2, 30, { align: "center" });
  
  // Información del documento
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "italic");
  doc.text(`Documento generado: ${currentDate}`, pageWidth - 15, 50, { align: "right" });
  
  // Información del alumno
  doc.setTextColor(textColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL ALUMNO", 14, 65);
  
  // Línea separadora
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(14, 67, 196, 67);
  
  // Datos personales
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "bold");
  doc.text("Nombre:", 14, 80);
  doc.setFont("helvetica", "normal");
  doc.text(alumno.nombre, 50, 80);
  
  doc.setFont("helvetica", "bold");
  doc.text("Grupo:", 14, 90);
  doc.setFont("helvetica", "normal");
  doc.text(alumno.grupoNombre, 50, 90);
  
  doc.setFont("helvetica", "bold");
  doc.text("Nivel:", 14, 100);
  doc.setFont("helvetica", "normal");
  doc.text(alumno.nivel, 50, 100);
  
  doc.setFont("helvetica", "bold");
  doc.text("Promedio general:", 14, 110);
  doc.setFont("helvetica", "normal");
  doc.text((alumno.promedio / 10).toFixed(1), 50, 110);
  
  // Estado de evaluación
  const estadoLabel = {
    "completo": "Evaluación completa",
    "incompleto": "Evaluación incompleta",
    "sin_iniciar": "Sin evaluación"
  }[alumno.estado];
  
  const estadoColor = {
    "completo": [34, 197, 94], // verde
    "incompleto": [245, 158, 11], // ámbar
    "sin_iniciar": [239, 68, 68], // rojo
  }[alumno.estado];
  
  // Recuadro para el estado
  doc.setFillColor(estadoColor[0], estadoColor[1], estadoColor[2], 0.1);
  doc.setDrawColor(estadoColor[0], estadoColor[1], estadoColor[2]);
  doc.roundedRect(120, 75, 75, 20, 3, 3, "FD");
  
  doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2]);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "bold");
  doc.text(estadoLabel || "Sin estado", 157.5, 87, { align: "center" });
  
  // Progreso académico
  doc.setTextColor(textColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("PROGRESO ACADÉMICO", 14, 130);
  
  // Línea separadora
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(14, 132, 196, 132);
  
  // Barra de progreso
  const progresoY = 145;
  const barraWidth = 170;
  const barraHeight = 10;
  
  // Fondo de la barra
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(14, progresoY, barraWidth, barraHeight, 2, 2, "F");
  
  // Progreso real
  const porcentaje = alumno.progreso.porcentaje;
  const progressWidth = (barraWidth * porcentaje) / 100;
  
  const progressColor = porcentaje >= 100 ? [34, 197, 94] : // verde
                       porcentaje >= 50 ? [245, 158, 11] : // ámbar
                       porcentaje > 0 ? [254, 240, 138] : // amarillo claro
                       [239, 68, 68]; // rojo
  
  doc.setFillColor(progressColor[0], progressColor[1], progressColor[2]);
  doc.roundedRect(14, progresoY, progressWidth, barraHeight, 2, 2, "F");
  
  // Texto de progreso
  doc.setTextColor(textColor);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "bold");
  doc.text(`${porcentaje}% completado`, 14, progresoY + 20);
  
  doc.setFont("helvetica", "normal");
  doc.text(`${alumno.progreso.completados} de ${alumno.progreso.total} subtemas evaluados`, 14, progresoY + 30);
  
  // Lista de materias si están disponibles
  if (alumno.materias && alumno.materias.length > 0) {
    doc.setTextColor(textColor);
    doc.setFontSize(subtitleSize);
    doc.setFont("helvetica", "bold");
    doc.text("DESEMPEÑO POR MATERIAS", 14, 190);
    
    // Línea separadora
    doc.setDrawColor(secondaryColor);
    doc.setLineWidth(0.5);
    doc.line(14, 192, 196, 192);
    
    // Tabla de materias
    const materiasData = alumno.materias.map(materia => [
      materia.nombre,
      (materia.promedio / 10).toFixed(1)
    ]);
    
    autoTable(doc, {
      startY: 200,
      head: [["Materia", "Promedio"]],
      body: materiasData,
      theme: "grid",
      headStyles: {
        fillColor: [31, 60, 136], // primaryColor
        textColor: 255,
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: [240, 245, 255]
      },
      margin: { left: 14, right: 14 }
    });
  }
  
  // Generar y agregar recomendaciones personalizadas si es necesario
  if (includeRecommendations && alumno.materias) {
    // Identificar materias que necesitan recomendaciones (promedio < 7.0)
    const materiasEnRiesgo = alumno.materias.filter(materia => materia.promedio < 7.0);
    
    if (materiasEnRiesgo.length > 0) {
      // Verificar si necesitamos una nueva página para las recomendaciones
      const finalY = (doc as any).lastAutoTable?.finalY;
      const yPos = finalY ? finalY + 20 : 200;
      
      // Si no hay espacio suficiente, agregar una nueva página
      if (yPos > pageHeight - 60) {
        doc.addPage();
        
        // Encabezado para la página de recomendaciones
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, pageWidth, 20, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(smallSize);
        doc.setFont("helvetica", "bold");
        doc.text(`REPORTE DE EVALUACIÓN: ${alumno.nombre}`, pageWidth / 2, 12, { align: "center" });
        
        // Título de la sección
        doc.setTextColor(textColor);
        doc.setFontSize(subtitleSize);
        doc.setFont("helvetica", "bold");
        doc.text("📌 RECOMENDACIONES PERSONALIZADAS", 14, 35);
        
        // Línea separadora
        doc.setDrawColor(secondaryColor);
        doc.setLineWidth(0.5);
        doc.line(14, 37, 196, 37);
        
        // Generar recomendaciones para cada materia en riesgo
        let currentY = 45;
        
        for (const materia of materiasEnRiesgo) {
          // Título de la materia
          doc.setTextColor(accentColor);
          doc.setFontSize(normalSize);
          doc.setFont("helvetica", "bold");
          doc.text(`Materia: ${materia.nombre} (Promedio: ${(materia.promedio / 10).toFixed(1)})`, 14, currentY);
          currentY += 8;
          
          // Generar recomendaciones para esta materia
          const recomendaciones = generateRecommendations(materia.nombre, materia.promedio);
          
          doc.setTextColor(textColor);
          doc.setFontSize(normalSize);
          doc.setFont("helvetica", "normal");
          
          for (const recomendacion of recomendaciones) {
            // Icono según el tipo de recomendación
            let icon = "🔍";
            if (recomendacion.tipo === TIPO_REFUERZO_CONCEPTOS) icon = "📚";
            if (recomendacion.tipo === TIPO_EJERCICIOS_ADICIONALES) icon = "✏️";
            if (recomendacion.tipo === TIPO_PARTICIPACION_ACTIVA) icon = "🙋";
            if (recomendacion.tipo === TIPO_TUTORIA_RECOMENDADA) icon = "👨‍🏫";
            if (recomendacion.tipo === TIPO_ESTRATEGIAS_SUGERIDAS) icon = "📝";
            
            // Limitar el ancho del texto y manejar saltos de línea
            const text = `${icon} ${recomendacion.descripcion}`;
            const textLines = doc.splitTextToSize(text, 175);
            
            // Si no hay espacio suficiente, agregar una nueva página
            if (currentY + (textLines.length * 7) > pageHeight - 20) {
              doc.addPage();
              
              // Encabezado para la página adicional
              doc.setFillColor(primaryColor);
              doc.rect(0, 0, pageWidth, 20, "F");
              
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(smallSize);
              doc.setFont("helvetica", "bold");
              doc.text(`REPORTE DE EVALUACIÓN: ${alumno.nombre}`, pageWidth / 2, 12, { align: "center" });
              
              currentY = 30;
            }
            
            // Agregar la recomendación
            doc.text(textLines, 14, currentY);
            currentY += (textLines.length * 7) + 5;
          }
          
          // Espacio entre materias
          currentY += 10;
        }
      } else {
        // Si hay espacio en la página actual
        doc.setTextColor(textColor);
        doc.setFontSize(subtitleSize);
        doc.setFont("helvetica", "bold");
        doc.text("📌 RECOMENDACIONES PERSONALIZADAS", 14, yPos);
        
        // Línea separadora
        doc.setDrawColor(secondaryColor);
        doc.setLineWidth(0.5);
        doc.line(14, yPos + 2, 196, yPos + 2);
        
        // Generar recomendaciones para cada materia en riesgo
        let currentY = yPos + 15;
        
        for (const materia of materiasEnRiesgo) {
          // Título de la materia
          doc.setTextColor(accentColor);
          doc.setFontSize(normalSize);
          doc.setFont("helvetica", "bold");
          doc.text(`Materia: ${materia.nombre} (Promedio: ${(materia.promedio / 10).toFixed(1)})`, 14, currentY);
          currentY += 8;
          
          // Generar recomendaciones para esta materia
          const recomendaciones = generateRecommendations(materia.nombre, materia.promedio);
          
          doc.setTextColor(textColor);
          doc.setFontSize(normalSize);
          doc.setFont("helvetica", "normal");
          
          for (const recomendacion of recomendaciones) {
            // Icono según el tipo de recomendación
            let icon = "🔍";
            if (recomendacion.tipo === TIPO_REFUERZO_CONCEPTOS) icon = "📚";
            if (recomendacion.tipo === TIPO_EJERCICIOS_ADICIONALES) icon = "✏️";
            if (recomendacion.tipo === TIPO_PARTICIPACION_ACTIVA) icon = "🙋";
            if (recomendacion.tipo === TIPO_TUTORIA_RECOMENDADA) icon = "👨‍🏫";
            if (recomendacion.tipo === TIPO_ESTRATEGIAS_SUGERIDAS) icon = "📝";
            
            // Limitar el ancho del texto y manejar saltos de línea
            const text = `${icon} ${recomendacion.descripcion}`;
            const textLines = doc.splitTextToSize(text, 175);
            
            // Si no hay espacio suficiente, agregar una nueva página
            if (currentY + (textLines.length * 7) > pageHeight - 20) {
              doc.addPage();
              
              // Encabezado para la página adicional
              doc.setFillColor(primaryColor);
              doc.rect(0, 0, pageWidth, 20, "F");
              
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(smallSize);
              doc.setFont("helvetica", "bold");
              doc.text(`REPORTE DE EVALUACIÓN: ${alumno.nombre}`, pageWidth / 2, 12, { align: "center" });
              
              currentY = 30;
            }
            
            // Agregar la recomendación
            doc.text(textLines, 14, currentY);
            currentY += (textLines.length * 7) + 5;
          }
          
          // Espacio entre materias
          currentY += 10;
        }
      }
    }
  }
  
  // Si hay subtemas para mostrar, agregarlos
  if (subtemas && subtemas.length > 0) {
    // Verificar si necesitamos una nueva página
    const finalY = (doc as any).lastAutoTable?.finalY;
    
    if (finalY && finalY > 220) {
      doc.addPage();
      
      // Encabezado para la página de subtemas
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, pageWidth, 20, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(smallSize);
      doc.setFont("helvetica", "bold");
      doc.text(`REPORTE DE EVALUACIÓN: ${alumno.nombre}`, pageWidth / 2, 12, { align: "center" });
      
      doc.setTextColor(textColor);
      doc.setFontSize(subtitleSize);
      doc.setFont("helvetica", "bold");
      doc.text("SUBTEMAS EVALUADOS", 14, 35);
      
      // Línea separadora
      doc.setDrawColor(secondaryColor);
      doc.setLineWidth(0.5);
      doc.line(14, 37, 196, 37);
      
      // Preparar datos para la tabla
      const subtemasData = subtemas.map(subtema => [
        subtema.id.toString(),
        subtema.nombre,
        subtema.comentario || "Sin comentarios"
      ]);
      
      autoTable(doc, {
        startY: 45,
        head: [["ID", "Subtema", "Comentarios"]],
        body: subtemasData,
        theme: "grid",
        headStyles: {
          fillColor: [31, 60, 136], // primaryColor
          textColor: 255,
          fontStyle: "bold"
        },
        alternateRowStyles: {
          fillColor: [240, 245, 255]
        },
        columnStyles: {
          0: { cellWidth: 15 },
          2: { cellWidth: 80 }
        },
        margin: { left: 14, right: 14 }
      });
    } else {
      // Si hay espacio en la primera página
      let yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : 200;
      
      doc.setTextColor(textColor);
      doc.setFontSize(subtitleSize);
      doc.setFont("helvetica", "bold");
      doc.text("SUBTEMAS EVALUADOS", 14, yPos);
      
      // Línea separadora
      doc.setDrawColor(secondaryColor);
      doc.setLineWidth(0.5);
      doc.line(14, yPos + 2, 196, yPos + 2);
      
      // Preparar datos para la tabla
      const subtemasData = subtemas.map(subtema => [
        subtema.id.toString(),
        subtema.nombre,
        subtema.comentario || "Sin comentarios"
      ]);
      
      autoTable(doc, {
        startY: yPos + 10,
        head: [["ID", "Subtema", "Comentarios"]],
        body: subtemasData,
        theme: "grid",
        headStyles: {
          fillColor: [31, 60, 136], // primaryColor
          textColor: 255,
          fontStyle: "bold"
        },
        alternateRowStyles: {
          fillColor: [240, 245, 255]
        },
        columnStyles: {
          0: { cellWidth: 15 },
          2: { cellWidth: 80 }
        },
        margin: { left: 14, right: 14 }
      });
    }
  }
  
  // Pie de página en todas las páginas
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(smallSize);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Reporte generado el ${currentDate} - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
  
  return doc;
};

/**
 * Genera un reporte PDF grupal con el resumen de los alumnos
 * @param data Datos del seguimiento grupal
 * @returns Objeto jsPDF con el documento generado
 */
export const generarReporteGrupalPDF = (data: SeguimientoGrupal): jsPDF => {
  // Crear nuevo documento PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Configuración de colores y estilos
  const primaryColor = "#1F3C88";
  const secondaryColor = "#5893D4";
  const accentColor = "#F0A500";
  const textColor = "#333333";
  
  // Configurar estilos y tamaño de texto
  const titleSize = 18;
  const subtitleSize = 14;
  const normalSize = 10;
  const smallSize = 8;
  
  // Fecha actual
  const currentDate = new Date().toLocaleDateString('es-MX');
  
  /* -------------- PÁGINA 1: PORTADA Y DATOS GENERALES -------------- */
  
  // Encabezado
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(titleSize);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE SEGUIMIENTO GRUPAL", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(subtitleSize);
  doc.text("Panel de Seguimiento Académico", pageWidth / 2, 30, { align: "center" });
  
  // Información del documento
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(smallSize);
  doc.setFont("helvetica", "italic");
  doc.text(`Documento generado: ${currentDate}`, pageWidth - 15, 50, { align: "right" });
  
  // Resumen general
  doc.setTextColor(textColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN GENERAL", 14, 65);
  
  // Línea separadora
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(14, 67, 196, 67);
  
  // Datos generales
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "bold");
  doc.text("Total de alumnos:", 14, 80);
  doc.setFont("helvetica", "normal");
  doc.text(data.totalAlumnos.toString(), 80, 80);
  
  doc.setFont("helvetica", "bold");
  doc.text("Evaluaciones completas:", 14, 90);
  doc.setFont("helvetica", "normal");
  doc.text(data.resumen.evaluacionCompleta.toString(), 80, 90);
  
  doc.setFont("helvetica", "bold");
  doc.text("Evaluaciones incompletas:", 14, 100);
  doc.setFont("helvetica", "normal");
  doc.text(data.resumen.evaluacionIncompleta.toString(), 80, 100);
  
  doc.setFont("helvetica", "bold");
  doc.text("Sin iniciar evaluación:", 14, 110);
  doc.setFont("helvetica", "normal");
  doc.text(data.resumen.sinIniciar.toString(), 80, 110);
  
  doc.setFont("helvetica", "bold");
  doc.text("Total de subtemas:", 14, 120);
  doc.setFont("helvetica", "normal");
  doc.text(data.resumen.totalSubtemas.toString(), 80, 120);
  
  // Barra de progreso de evaluaciones
  const progresoY = 140;
  const barraWidth = 170;
  const barraHeight = 10;
  
  // Fondo de la barra
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(14, progresoY, barraWidth, barraHeight, 2, 2, "F");
  
  // Progreso de evaluaciones
  const totalEvaluaciones = data.totalAlumnos;
  const evaluacionesCompletadas = data.resumen.evaluacionCompleta;
  const porcentajeCompletado = (evaluacionesCompletadas / totalEvaluaciones) * 100;
  const progressWidth = (barraWidth * porcentajeCompletado) / 100;
  
  const progressColor = porcentajeCompletado >= 75 ? [34, 197, 94] : // verde
                      porcentajeCompletado >= 50 ? [245, 158, 11] : // ámbar
                      porcentajeCompletado > 25 ? [254, 240, 138] : // amarillo claro
                      [239, 68, 68]; // rojo
  
  doc.setFillColor(progressColor[0], progressColor[1], progressColor[2]);
  doc.roundedRect(14, progresoY, progressWidth, barraHeight, 2, 2, "F");
  
  // Texto de progreso
  doc.setTextColor(textColor);
  doc.setFontSize(normalSize);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(porcentajeCompletado)}% de evaluaciones completadas`, 14, progresoY + 20);
  
  // Listado de alumnos
  doc.setTextColor(textColor);
  doc.setFontSize(subtitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("LISTADO DE ALUMNOS", 14, 175);
  
  // Línea separadora
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(14, 177, 196, 177);
  
  // Datos para la tabla de alumnos
  const alumnosData = data.alumnos.map(alumno => [
    alumno.nombre,
    alumno.grupoNombre,
    (alumno.promedio / 10).toFixed(1),
    {
      "completo": "Completo",
      "incompleto": "Incompleto",
      "sin_iniciar": "Sin iniciar"
    }[alumno.estado]
  ]);
  
  // Tabla de alumnos
  autoTable(doc, {
    startY: 185,
    head: [["Alumno", "Grupo", "Promedio", "Estado"]],
    body: alumnosData,
    theme: "grid",
    headStyles: {
      fillColor: [31, 60, 136], // primaryColor
      textColor: 255,
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [240, 245, 255]
    },
    margin: { left: 14, right: 14 }
  });
  
  // Pie de página en todas las páginas
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(smallSize);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Reporte grupal generado el ${currentDate} - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
  
  return doc;
};

/**
 * Genera un informe gráfico en formato PDF con estadísticas y visualizaciones
 * @param data Datos del seguimiento grupal
 * @returns Objeto jsPDF con el documento generado
 */
export const generarInfograficoPDF = (data: SeguimientoGrupal): jsPDF => {
  // Implementación básica - Expandir según necesidades
  return generarReporteGrupalPDF(data);
};