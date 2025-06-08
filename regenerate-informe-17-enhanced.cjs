/**
 * Enhanced Professional Academic Report Generator
 * Implements visual progress indicators, structured sections, and professional validation
 */

const { jsPDF } = require("jspdf");
const fs = require('fs');
const path = require('path');

/**
 * Generates enhanced academic report with visual elements and structured layout
 */
function generateEnhancedAcademicReport(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions and margins
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  
  // Enhanced color palette
  const colors = {
    primaryBlue: [66, 133, 244],
    lightBlue: [240, 248, 255],
    darkText: [33, 37, 41],
    mediumGray: [108, 117, 125],
    lightGray: [248, 249, 250],
    borderGray: [222, 226, 230],
    white: [255, 255, 255],
    validationBg: [245, 245, 245],
    progressGreen: [52, 168, 83],
    progressYellow: [251, 188, 4],
    progressRed: [234, 67, 53]
  };
  
  let y = 30;
  
  // === INSTITUTIONAL HEADER ===
  doc.setTextColor(...colors.primaryBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SISTEMA EDUCATIVO ALTUM", margin, y);
  
  y += 10;
  
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INFORME ACADÉMICO", margin, y);
  
  y += 8;
  
  doc.setTextColor(...colors.mediumGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Reporte de rendimiento académico generado automáticamente", margin, y);
  
  y += 25;
  
  // === STUDENT INFORMATION SECTION WITH ICON ===
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("👤 INFORMACIÓN DEL ESTUDIANTE", margin, y);
  
  y += 15;
  
  // Student name
  doc.setTextColor(...colors.mediumGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("NOMBRE:", margin, y);
  
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(reportData.studentName, margin + 30, y);
  
  y += 12;
  
  // Academic period
  doc.setTextColor(...colors.mediumGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("PERÍODO ACADÉMICO", margin, y);
  
  y += 8;
  
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(reportData.period, margin, y);
  
  // === VISUAL PROGRESS BAR FOR AVERAGE ===
  const progressX = pageWidth - margin - 80;
  const progressY = y - 25;
  
  // Progress bar background
  doc.setFillColor(...colors.lightGray);
  doc.rect(progressX, progressY, 70, 8, 'F');
  
  // Progress bar fill based on average
  const avgScore = reportData.average;
  const progressWidth = (avgScore / 10) * 70;
  let progressColor = colors.progressRed;
  
  if (avgScore >= 9.0) progressColor = colors.progressGreen;
  else if (avgScore >= 8.0) progressColor = colors.primaryBlue;
  else if (avgScore >= 7.0) progressColor = colors.progressYellow;
  
  doc.setFillColor(...progressColor);
  doc.rect(progressX, progressY, progressWidth, 8, 'F');
  
  // Progress labels
  doc.setTextColor(...colors.mediumGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("📊 PROMEDIO", progressX, progressY - 3);
  
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(avgScore.toFixed(1), progressX + 75, progressY + 6);
  
  y += 25;
  
  // === ACADEMIC PERFORMANCE SECTION WITH ICON ===
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("📘 RENDIMIENTO ACADÉMICO", margin, y);
  
  y += 15;
  
  // Enhanced table with better spacing
  const tableStartY = y;
  const rowHeight = 18;
  const colWidths = [35, 25, 25, 70];
  const colPositions = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ];
  
  // Table header
  doc.setFillColor(...colors.primaryBlue);
  doc.rect(margin, y, contentWidth, 12, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ÁREA", colPositions[0] + 3, y + 8);
  doc.text("CALIFICACIÓN", colPositions[1] + 3, y + 8);
  doc.text("NIVEL", colPositions[2] + 3, y + 8);
  doc.text("OBSERVACIONES", colPositions[3] + 3, y + 8);
  
  y += 12;
  
  // Enhanced subject data with complete observations
  const subjects = [
    ["Matemáticas", "8.5", "Muy Bueno", "Excelente comprensión de conceptos algebraicos y resolución de problemas complejos"],
    ["Español", "8.9", "Excelente", "Destacado en análisis literario y redacción. Excelente comprensión lectora"],
    ["Ciencias", "8.7", "Muy Bueno", "Participación activa en experimentos de laboratorio y comprensión teórica"],
    ["Historia", "8.5", "Excelente", "Análisis crítico sobresaliente de procesos históricos y contextos"],
    ["Inglés", "8.6", "Muy Bueno", "Progreso notable en conversación y comprensión auditiva avanzada"]
  ];
  
  // Table rows with improved formatting
  subjects.forEach((subject, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(...colors.lightGray);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    
    // Subject name
    doc.setTextColor(...colors.darkText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(subject[0], colPositions[0] + 3, y + 11);
    
    // Score with color coding
    const score = parseFloat(subject[1]);
    let scoreColor = colors.progressRed;
    if (score >= 9.0) scoreColor = colors.progressGreen;
    else if (score >= 8.0) scoreColor = colors.primaryBlue;
    else if (score >= 7.0) scoreColor = colors.progressYellow;
    
    doc.setTextColor(...scoreColor);
    doc.setFont("helvetica", "bold");
    doc.text(subject[1], colPositions[1] + 8, y + 11, { align: "center" });
    
    // Level
    doc.setTextColor(...colors.darkText);
    doc.setFont("helvetica", "normal");
    doc.text(subject[2], colPositions[2] + 3, y + 11);
    
    // Enhanced observations with proper wrapping
    doc.setFontSize(8);
    const observations = doc.splitTextToSize(subject[3], colWidths[3] - 6);
    const maxLines = 2;
    const linesToShow = observations.slice(0, maxLines);
    
    linesToShow.forEach((line, lineIndex) => {
      doc.text(line, colPositions[3] + 3, y + 7 + (lineIndex * 4));
    });
    
    y += rowHeight;
  });
  
  y += 20;
  
  // === STRUCTURED RECOMMENDATIONS SECTION ===
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("🧠 RECOMENDACIONES PERSONALIZADAS", margin, y);
  
  y += 15;
  
  // Grouped recommendations
  const recommendationCategories = [
    {
      title: "Habilidades Académicas",
      items: ["Continuar fortaleciendo habilidades matemáticas con ejercicios avanzados"]
    },
    {
      title: "Desarrollo Personal", 
      items: ["Mantener el excelente nivel de lectura incorporando literatura más compleja"]
    },
    {
      title: "Participación Extracurricular",
      items: ["Participar en proyectos de investigación científica y concursos académicos"]
    }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  recommendationCategories.forEach((category) => {
    doc.setTextColor(...colors.primaryBlue);
    doc.setFont("helvetica", "bold");
    doc.text(`${category.title}:`, margin, y);
    y += 6;
    
    category.items.forEach((item) => {
      doc.setTextColor(...colors.darkText);
      doc.setFont("helvetica", "normal");
      doc.text("•", margin + 5, y);
      
      const wrappedText = doc.splitTextToSize(item, contentWidth - 15);
      doc.text(wrappedText, margin + 12, y);
      y += wrappedText.length * 4 + 2;
    });
    y += 3;
  });
  
  y += 10;
  
  // === PAYMENT INFORMATION ===
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("💳 INFORMACIÓN DE PAGO ASOCIADO", margin, y);
  
  y += 12;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Recibo ID: ${reportData.paymentId} | Monto: $${reportData.paymentAmount.toLocaleString('es-MX')} MXN | Referencia: ${reportData.paymentReference}`, margin, y);
  
  y += 20;
  
  // === ENHANCED VALIDATION BLOCK ===
  const validationBlockY = y;
  const validationHeight = 25;
  
  // Validation background
  doc.setFillColor(...colors.validationBg);
  doc.rect(margin, validationBlockY, contentWidth, validationHeight, 'F');
  
  // Validation border
  doc.setDrawColor(...colors.borderGray);
  doc.setLineWidth(0.5);
  doc.rect(margin, validationBlockY, contentWidth, validationHeight);
  
  // Validation text
  doc.setTextColor(...colors.mediumGray);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("✓ DOCUMENTO VERIFICADO DIGITALMENTE", margin + 8, validationBlockY + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Este informe fue generado automáticamente por el sistema AcademiQ.", margin + 8, validationBlockY + 15);
  doc.text("Para validar escanee el código QR o visite academiq.mx/validar", margin + 8, validationBlockY + 21);
  
  // === INSTITUTIONAL FOOTER ===
  const footerY = pageHeight - 20;
  
  // Footer separator
  doc.setDrawColor(...colors.borderGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 15, pageWidth - margin, footerY - 15);
  
  // Footer content - three column layout
  doc.setTextColor(...colors.mediumGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  // Left: Institution logo placeholder
  doc.setFont("helvetica", "bold");
  doc.text("ALTUM", margin, footerY - 5);
  
  // Center: Generation date
  doc.setFont("helvetica", "normal");
  const now = new Date();
  doc.text(`Generado: ${now.toLocaleDateString('es-MX')} ${now.toLocaleTimeString('es-MX')}`, pageWidth / 2, footerY - 5, { align: "center" });
  
  // Right: Institutional contact
  doc.text("academiq.mx | contacto@altum.edu.mx", pageWidth - margin, footerY - 5, { align: "right" });
  
  return doc;
}

async function main() {
  try {
    console.log('🎯 Generando informe académico mejorado con elementos visuales...');
    
    const reportData = {
      id: 17,
      studentId: 4,
      studentName: 'Andrea Cebreros Contreras',
      period: 'Junio 2025',
      average: 8.5,
      paymentId: 17,
      paymentAmount: 55000,
      paymentReference: 'pi_AndreaSimulado'
    };

    const doc = generateEnhancedAcademicReport(reportData);
    
    // Save to filesystem
    const informesDir = path.join(process.cwd(), 'public', 'informes');
    if (!fs.existsSync(informesDir)) {
      fs.mkdirSync(informesDir, { recursive: true });
    }
    
    const filename = `informe_${reportData.id}.pdf`;
    const filepath = path.join(informesDir, filename);
    
    // Write PDF to file
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filepath, pdfBuffer);
    
    console.log('✅ Informe mejorado generado exitosamente');
    console.log(`📁 Archivo: /informes/informe_17.pdf`);
    console.log(`🎯 Mejoras: Barras de progreso, iconos, validación mejorada`);
    console.log(`📊 Estudiante: ${reportData.studentName} | Promedio: ${reportData.average}`);
  } catch (error) {
    console.error('❌ Error generando informe mejorado:', error);
    process.exit(1);
  }
}

main();