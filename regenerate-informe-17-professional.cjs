/**
 * Professional Academic Report Generator
 * Creates clean, institutional-style reports matching the reference design
 */

const { jsPDF } = require("jspdf");
const fs = require('fs');
const path = require('path');

/**
 * Generates a professional academic report with clean institutional design
 */
function generateProfessionalAcademicReport(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions and margins
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  
  // Professional color palette (institutional blues and grays)
  const colors = {
    primaryBlue: [66, 133, 244],    // Clean institutional blue
    lightBlue: [240, 248, 255],     // Very light blue background
    darkText: [33, 37, 41],         // Dark text
    mediumGray: [108, 117, 125],    // Medium gray for secondary text
    lightGray: [248, 249, 250],     // Light gray backgrounds
    borderGray: [222, 226, 230],    // Border color
    white: [255, 255, 255],
    tableHeader: [66, 133, 244]     // Table header blue
  };
  
  let y = 30;
  
  // === CLEAN HEADER SECTION ===
  // Institution name in blue
  doc.setTextColor(...colors.primaryBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SISTEMA EDUCATIVO ALTUM", margin, y);
  
  y += 10;
  
  // Report title
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INFORME ACADÉMICO", margin, y);
  
  y += 8;
  
  // Subtitle
  doc.setTextColor(...colors.mediumGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Reporte de rendimiento académico generado automáticamente", margin, y);
  
  y += 25;
  
  // === STUDENT INFORMATION SECTION ===
  // Section title
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INFORMACIÓN DEL ESTUDIANTE", margin, y);
  
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
  
  // Average score badge (positioned to the right)
  const badgeX = pageWidth - margin - 60;
  const badgeY = y - 25;
  
  // Badge background
  doc.setFillColor(...colors.primaryBlue);
  doc.roundedRect(badgeX, badgeY, 50, 30, 4, 4, 'F');
  
  // Badge score
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(reportData.average.toFixed(1), badgeX + 25, badgeY + 16, { align: "center" });
  
  // Badge label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("MUY BUENO", badgeX + 25, badgeY + 24, { align: "center" });
  
  y += 25;
  
  // === ACADEMIC PERFORMANCE SECTION ===
  // Section title
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RENDIMIENTO ACADÉMICO", margin, y);
  
  y += 15;
  
  // Table setup
  const tableStartY = y;
  const rowHeight = 16;
  const colWidths = [40, 30, 30, 65]; // Area, Calificación, Nivel, Observaciones
  const colPositions = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ];
  
  // Table header background
  doc.setFillColor(...colors.tableHeader);
  doc.rect(margin, y, contentWidth, 12, 'F');
  
  // Table header text
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ÁREA", colPositions[0] + 3, y + 8);
  doc.text("CALIFICACIÓN", colPositions[1] + 3, y + 8);
  doc.text("NIVEL", colPositions[2] + 3, y + 8);
  doc.text("OBSERVACIONES", colPositions[3] + 3, y + 8);
  
  y += 12;
  
  // Table data
  const subjects = [
    ["Matemáticas", "8.5", "Muy Bueno", "Excelente comprensión de conceptos"],
    ["Español", "8.9", "Excelente", "Destacado en análisis literario y redacción"],
    ["Ciencias", "8.7", "Muy Bueno", "Participación activa en experimentos"],
    ["Historia", "8.5", "Excelente", "Análisis crítico sobresaliente"],
    ["Inglés", "8.6", "Muy Bueno", "Progreso notable en conversación"]
  ];
  
  // Table rows
  subjects.forEach((subject, index) => {
    // Alternating row backgrounds
    if (index % 2 === 0) {
      doc.setFillColor(...colors.lightGray);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    
    // Row text
    doc.setTextColor(...colors.darkText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    // Subject name (bold)
    doc.setFont("helvetica", "bold");
    doc.text(subject[0], colPositions[0] + 3, y + 10);
    
    // Score (blue and bold)
    doc.setTextColor(...colors.primaryBlue);
    doc.setFont("helvetica", "bold");
    doc.text(subject[1], colPositions[1] + 8, y + 10, { align: "center" });
    
    // Level
    doc.setTextColor(...colors.darkText);
    doc.setFont("helvetica", "normal");
    doc.text(subject[2], colPositions[2] + 3, y + 10);
    
    // Observations (wrapped text)
    const observations = doc.splitTextToSize(subject[3], colWidths[3] - 6);
    doc.text(observations[0], colPositions[3] + 3, y + 10);
    
    y += rowHeight;
  });
  
  y += 20;
  
  // === RECOMMENDATIONS SECTION ===
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RECOMENDACIONES PERSONALIZADAS", margin, y);
  
  y += 15;
  
  // Recommendations list
  const recommendations = [
    "Continuar fortaleciendo habilidades matemáticas avanzadas prácticos",
    "Mantener el excelente nivel de lectura de textos complejos",
    "Participar en proyectos de investigación en ciencias"
  ];
  
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  recommendations.forEach((rec) => {
    // Bullet point
    doc.text("•", margin, y);
    
    // Recommendation text (wrapped)
    const wrappedText = doc.splitTextToSize(rec, contentWidth - 10);
    doc.text(wrappedText, margin + 8, y);
    y += wrappedText.length * 5 + 3;
  });
  
  y += 15;
  
  // === PAYMENT INFORMATION SECTION ===
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INFORMACIÓN DE PAGO ASOCIADO", margin, y);
  
  y += 12;
  
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Recibo ID: ${reportData.paymentId} | Monto: $${reportData.paymentAmount.toLocaleString('es-MX')} MXN | Referencia: ${reportData.paymentReference}`, margin, y);
  
  // === FOOTER ===
  const footerY = pageHeight - 25;
  
  // Footer separator line
  doc.setDrawColor(...colors.borderGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  // Footer text
  doc.setTextColor(...colors.mediumGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("SISTEMA EDUCATIVO ALTUM. Informe generado automáticamente | 29/6/2", pageWidth / 2, footerY, { align: "center" });
  
  return doc;
}

async function main() {
  try {
    console.log('📋 Generando informe académico profesional...');
    
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

    const doc = generateProfessionalAcademicReport(reportData);
    
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
    
    console.log('✅ Informe profesional generado exitosamente');
    console.log(`📁 Archivo: /informes/informe_17.pdf`);
    console.log(`🎯 Diseño: Profesional institucional limpio`);
    console.log(`📊 Estudiante: ${reportData.studentName} | Promedio: ${reportData.average}`);
  } catch (error) {
    console.error('❌ Error generando informe profesional:', error);
    process.exit(1);
  }
}

main();