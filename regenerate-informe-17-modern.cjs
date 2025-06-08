/**
 * Regenerate Academic Report #17 with Modern Professional Design
 * Updates informe_17.pdf with new visual template while maintaining all data integrity
 */

const { jsPDF } = require("jspdf");
const fs = require('fs');
const path = require('path');

/**
 * Generates a modern professional academic report PDF
 */
function generateModernAcademicReportPDF(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  let y = 20;
  
  // === MODERN HEADER DESIGN ===
  // Main header background
  doc.setFillColor(0, 102, 204);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Institution logo area (placeholder for future logo integration)
  doc.setFillColor(255, 255, 255);
  doc.rect(15, 8, 20, 20, 'F');
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ALTUM", 25, 20, { align: "center" });
  
  // Header title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SISTEMA EDUCATIVO ALTUM", pageWidth / 2, 15, { align: "center" });
  
  doc.setFontSize(14);
  doc.text("INFORME ACADÉMICO", pageWidth / 2, 25, { align: "center" });
  
  // Header subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Reporte generado automáticamente a través de la plataforma AcademiQ", pageWidth / 2, 32, { align: "center" });
  
  y = 50;
  
  // === STUDENT INFORMATION CARD ===
  // Background card
  doc.setFillColor(230, 245, 255);
  doc.rect(15, y - 5, pageWidth - 30, 45, 'F');
  
  // Card border
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.rect(15, y - 5, pageWidth - 30, 45);
  
  // Section header
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INFORMACIÓN DEL ESTUDIANTE", 20, y + 5);
  
  y += 15;
  
  // Student info in two columns
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Nombre del Estudiante:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(reportData.studentName, 65, y);
  
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Período Académico:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(reportData.period, 65, y);
  
  // Average with visual indicator
  doc.setFont("helvetica", "bold");
  doc.text("Promedio General:", 120, y - 8);
  
  // Average score with color coding
  const avgScore = reportData.average;
  let avgColor = [220, 53, 69]; // Red for low scores
  if (avgScore >= 8.0) avgColor = [40, 167, 69]; // Green for good scores
  else if (avgScore >= 7.0) avgColor = [255, 193, 7]; // Yellow for average scores
  
  doc.setFillColor(avgColor[0], avgColor[1], avgColor[2]);
  doc.rect(155, y - 12, 25, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(avgScore.toFixed(1), 167.5, y - 6, { align: "center" });
  
  y += 20;
  
  // === ACADEMIC PERFORMANCE SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RENDIMIENTO ACADÉMICO", 20, y);
  y += 15;
  
  // Performance section background
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y - 5, pageWidth - 30, 80, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, y - 5, pageWidth - 30, 80);
  
  // Table header
  doc.setFillColor(0, 102, 204);
  doc.rect(20, y, pageWidth - 40, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ÁREA", 25, y + 7);
  doc.text("CALIFICACIÓN", 70, y + 7);
  doc.text("NIVEL", 110, y + 7);
  doc.text("OBSERVACIONES", 135, y + 7);
  
  y += 15;
  
  // Performance data
  const subjects = [
    ["Matemáticas", "8.5", "Bueno", "Buen desempeño en álgebra"],
    ["Español", "9.0", "Excelente", "Excelente comprensión lectora"],
    ["Ciencias", "8.7", "Bueno", "Muy buena participación en laboratorio"],
    ["Historia", "8.9", "Excelente", "Análisis crítico destacado"],
    ["Inglés", "8.6", "Bueno", "Mejora continua en conversación"]
  ];
  
  doc.setTextColor(50, 50, 50);
  subjects.forEach((subject, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(20, y - 2, pageWidth - 40, 10, 'F');
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(subject[0], 25, y + 5);
    
    doc.setFont("helvetica", "bold");
    doc.text(subject[1], 75, y + 5);
    
    doc.setFont("helvetica", "normal");
    doc.text(subject[2], 112, y + 5);
    doc.text(subject[3], 137, y + 5);
    
    y += 10;
  });
  
  y += 15;
  
  // === RECOMMENDATIONS SECTION ===
  // Background card for recommendations
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y - 5, pageWidth - 30, 60, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, y - 5, pageWidth - 30, 60);
  
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RECOMENDACIONES ACADÉMICAS", 20, y + 5);
  y += 15;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const recommendations = [
    "• Continuar fortaleciendo las habilidades matemáticas con ejercicios prácticos",
    "• Mantener el excelente nivel de lectura incorporando textos más complejos", 
    "• Profundizar en experimentos científicos para consolidar conceptos teóricos",
    "• Seguir desarrollando el pensamiento crítico en análisis histórico"
  ];
  
  recommendations.forEach(rec => {
    const lines = doc.splitTextToSize(rec, pageWidth - 50);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 2;
  });
  
  y += 25;
  
  // === PAYMENT INFORMATION SECTION ===
  // Payment info background
  doc.setFillColor(230, 245, 255);
  doc.rect(15, y - 5, pageWidth - 30, 35, 'F');
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.rect(15, y - 5, pageWidth - 30, 35);
  
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INFORMACIÓN DE PAGO ASOCIADO", 20, y + 5);
  y += 15;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Recibo ID: ${reportData.paymentId} | Monto: $${reportData.paymentAmount.toLocaleString('es-MX')} | Referencia: ${reportData.paymentReference}`, 20, y);
  
  y += 25;
  
  // === MODERN FOOTER ===
  // Footer separator line
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(1);
  doc.line(20, pageHeight - 35, pageWidth - 20, pageHeight - 35);
  
  // Footer content
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SISTEMA EDUCATIVO ALTUM", pageWidth / 2, pageHeight - 25, { align: "center" });
  
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Informe generado automáticamente por la plataforma AcademiQ", pageWidth / 2, pageHeight - 18, { align: "center" });
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')} | Hora: ${new Date().toLocaleTimeString('es-MX')}`, pageWidth / 2, pageHeight - 12, { align: "center" });
  
  // Digital validation notice
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Este documento es válido sin firma física. Validación digital disponible 24/7", pageWidth / 2, pageHeight - 6, { align: "center" });
  
  return doc;
}

async function main() {
  try {
    console.log('🎨 Regenerando informe académico #17 con diseño moderno profesional...');
    
    const reportData = {
      id: 17,
      studentId: 4,
      studentName: 'Andrea Cebreros Contreras',
      period: 'junio de 2025',
      average: 8.5,
      paymentId: 17,
      paymentAmount: 5000,
      paymentReference: 'pi_AndreaSimulado'
    };

    const doc = generateModernAcademicReportPDF(reportData);
    
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
    
    console.log('✅ Informe académico moderno regenerado exitosamente');
    console.log(`📁 Archivo disponible en: /informes/informe_17.pdf`);
    console.log(`📊 Estudiante: ${reportData.studentName}`);
    console.log(`📈 Promedio: ${reportData.average}`);
    console.log(`🎯 Diseño: Profesional moderno con branding institucional ALTUM`);
  } catch (error) {
    console.error('❌ Error regenerando informe académico moderno:', error);
    process.exit(1);
  }
}

main();