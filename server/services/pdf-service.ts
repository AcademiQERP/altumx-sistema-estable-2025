/**
 * Servicio para la generación de archivos PDF en el servidor
 * 
 * Este servicio proporciona funciones para crear documentos PDF para
 * diferentes propósitos: informes académicos, boletas, etc.
 * Incluye funciones de utilidad para el manejo de estilos y formatos.
 */

import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Estructura de datos del estudiante para generar PDF
 */
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
 * Estructura para las recomendaciones procesadas
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
 * Reemplaza emojis con caracteres compatibles con PDF
 * @param text Texto a procesar
 * @returns Texto con emojis reemplazados
 */
function replaceEmojis(text: string): string {
  // Mapeo de emojis a caracteres compatibles con PDF
  const emojiMap: Record<string, string> = {
    "🌟": "★", // Estrella
    "⭐": "★", // Estrella
    "✨": "★", // Destellos
    "💪": "▲", // Músculo (fortaleza)
    "👍": "✓", // Pulgar arriba
    "✅": "✓", // Marca de verificación
    "🔍": "□", // Lupa
    "📝": "✎", // Lápiz
    "📊": "▣", // Gráfico
    "🧠": "○", // Cerebro
    "🎯": "◎", // Diana
    "⚡": "▲", // Rayo
    "📚": "≡", // Libros
    "🤔": "?", // Pensativo
    "❗": "!", // Exclamación
    "❤️": "♥", // Corazón
    "📈": "↑", // Tendencia al alza
    "📉": "↓", // Tendencia a la baja
    "⬆️": "↑", // Flecha arriba
    "⬇️": "↓", // Flecha abajo
    "➡️": "→", // Flecha derecha
    "⬅️": "←", // Flecha izquierda
    "✍️": "✎", // Escribiendo
    "👏": "•", // Aplausos
    "🚀": "▲", // Cohete
    "💡": "○", // Bombilla
    "⏰": "○", // Reloj
    "📌": "•", // Pin
    "🔑": "•", // Llave
    "❓": "?", // Pregunta
    "❕": "!", // Exclamación
    "☑️": "✓", // Casilla marcada
    "☐": "□", // Casilla sin marcar
  };
  
  let processedText = text;
  
  // Reemplazar emojis conocidos
  for (const emoji in emojiMap) {
    processedText = processedText.replace(new RegExp(emoji, "g"), emojiMap[emoji]);
  }
  
  // Eliminar cualquier otro emoji usando una expresión regular más compatible
  // En lugar de usar el rango Unicode completo, eliminamos algunos rangos comunes de emojis
  processedText = processedText.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "");
  
  return processedText;
}

/**
 * Procesa un texto de recomendaciones y lo estructura en secciones
 * @param aiRecommendations Texto plano de recomendaciones (formato markdown)
 * @returns Objeto estructurado con secciones
 */
function processAIRecommendations(aiRecommendations: string): ProcessedRecommendations {
  // Inicializar resultado
  const result: ProcessedRecommendations = {
    fortalezas: [],
    areasAFortalecer: [],
    areasDesarrollo: [],
    observaciones: [],
    proximosPasos: [],
    conclusionFinal: []
  };
  
  // Dividir por líneas
  const lines = aiRecommendations.split("\n");
  
  // Variables para el seguimiento de la sección actual
  let currentSection: keyof ProcessedRecommendations | null = null;
  
  // Procesar línea por línea
  for (const line of lines) {
    // Reemplazar emojis en cada línea
    const cleanLine = replaceEmojis(line.trim());
    
    // Saltar líneas vacías
    if (!cleanLine) continue;
    
    // Detectar encabezados de sección
    if (cleanLine.startsWith("# ") || cleanLine.startsWith("## ")) {
      // Ignorar el título principal
      if (cleanLine.includes("Recomendaciones")) continue;
      
      if (cleanLine.toLowerCase().includes("fortaleza")) {
        currentSection = "fortalezas";
        continue;
      } else if (cleanLine.toLowerCase().includes("fortalecer") || 
                 cleanLine.toLowerCase().includes("mejorar")) {
        currentSection = "areasAFortalecer";
        continue;
      } else if (cleanLine.toLowerCase().includes("desarrollo") || 
                 cleanLine.toLowerCase().includes("evaluación")) {
        currentSection = "areasDesarrollo";
        continue;
      } else if (cleanLine.toLowerCase().includes("observaci")) {
        currentSection = "observaciones";
        continue;
      } else if (cleanLine.toLowerCase().includes("próximo") || 
                 cleanLine.toLowerCase().includes("siguiente") || 
                 cleanLine.toLowerCase().includes("pasos")) {
        currentSection = "proximosPasos";
        continue;
      } else if (cleanLine.toLowerCase().includes("conclusi") || 
                 cleanLine.toLowerCase().includes("final")) {
        currentSection = "conclusionFinal";
        continue;
      }
    }
    
    // Si estamos en una sección y la línea es un elemento de lista
    if (currentSection && (cleanLine.startsWith("- ") || cleanLine.startsWith("* "))) {
      // Agregar sin el guión o asterisco
      const content = cleanLine.substring(2).trim();
      result[currentSection].push(content);
    } 
    // Si la línea tiene contenido pero no es un elemento de lista
    else if (currentSection && cleanLine && !cleanLine.startsWith("#")) {
      // Podría ser un párrafo de conclusión
      result[currentSection].push(cleanLine);
    }
  }
  
  return result;
}

/**
 * Genera un documento PDF de informe para padres
 * @param studentData Datos del estudiante
 * @param aiRecommendations Recomendaciones en formato texto (markdown)
 * @param teacherName Nombre del profesor que genera el informe
 * @returns Documento PDF generado
 */
export function generateParentReportPDF(
  studentData: StudentData,
  aiRecommendations: string,
  teacherName: string
): jsPDF {
  // Crear un nuevo documento
  const doc = new jsPDF();
  
  // Procesar el texto de recomendaciones para extraer las secciones
  const recommendations = processAIRecommendations(aiRecommendations);
  
  // Configuración de estilos
  const titleFont = "helvetica";
  const bodyFont = "helvetica";
  const subtitleFont = "helvetica"; // Corregido
  const sectionTitleFont = "helvetica"; // Corregido
  const titleSize = 16;
  const subtitleSize = 14;
  const sectionTitleSize = 12;
  const bodySize = 10;
  
  // Colores
  const primaryColor = [0, 102/255, 204/255]; // Azul
  const secondaryColor = [0, 0, 0]; // Negro
  
  // Configurar la posición inicial
  let y = 20;
  
  // Cabecera del informe
  doc.setFont(titleFont, "bold");
  doc.setFontSize(titleSize);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Informe Académico Personalizado", 105, y, { align: "center" });
  y += 10;
  
  // Fecha
  const today = new Date();
  doc.setFont(bodyFont, "normal");
  doc.setFontSize(bodySize);
  doc.setTextColor(0, 0, 0);
  doc.text(`Fecha: ${today.toLocaleDateString()}`, 105, y, { align: "center" });
  y += 15;
  
  // Datos del estudiante
  doc.setFont(subtitleFont, "bold");
  doc.setFontSize(subtitleSize);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Datos del Estudiante", 20, y);
  y += 8;
  
  doc.setFont(bodyFont, "normal");
  doc.setFontSize(bodySize);
  doc.text(`Nombre: ${studentData.nombre}`, 20, y);
  y += 6;
  doc.text(`Grado: ${studentData.grado}`, 20, y);
  y += 6;
  doc.text(`Promedio General: ${studentData.promedio.toFixed(1)}`, 20, y);
  y += 15;
  
  // Función para agregar secciones de recomendaciones
  const addSection = (title: string, items: string[], icon: string) => {
    // Verificar si hay suficiente espacio en la página
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont(sectionTitleFont, "bold");
    doc.setFontSize(sectionTitleSize);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${icon} ${title}`, 20, y);
    y += 8;
    
    doc.setFont(bodyFont, "normal");
    doc.setFontSize(bodySize);
    doc.setTextColor(0, 0, 0);
    
    items.forEach(item => {
      // Verificar si hay suficiente espacio para el elemento
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      // Texto con ajuste de línea
      const lines = doc.splitTextToSize(item, 170);
      doc.text(lines, 25, y);
      y += lines.length * 6;
    });
    
    y += 5;
  };
  
  // Agregar las secciones
  if (recommendations.fortalezas.length > 0) {
    addSection("Fortalezas", recommendations.fortalezas, "★");
  }
  
  if (recommendations.areasAFortalecer.length > 0) {
    addSection("Áreas para Fortalecer", recommendations.areasAFortalecer, "▲");
  }
  
  if (recommendations.areasDesarrollo.length > 0) {
    addSection("Evaluación de Desarrollo", recommendations.areasDesarrollo, "○");
  }
  
  if (recommendations.observaciones.length > 0) {
    addSection("Observaciones Individuales", recommendations.observaciones, "•");
  }
  
  if (recommendations.proximosPasos.length > 0) {
    addSection("Próximos Pasos", recommendations.proximosPasos, "→");
  }
  
  if (recommendations.conclusionFinal.length > 0) {
    addSection("Conclusión Final", recommendations.conclusionFinal, "□");
  }
  
  // Pie de página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Línea separadora
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(0, 102/255, 204/255);
    doc.line(20, pageHeight - 20, 190, pageHeight - 20);
    
    // Texto del pie
    doc.setFont(bodyFont, "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Informe generado por: ${teacherName}`, 20, pageHeight - 15);
    doc.text(`Página ${i} de ${totalPages}`, 190, pageHeight - 15, { align: "right" });
  }
  
  return doc;
}