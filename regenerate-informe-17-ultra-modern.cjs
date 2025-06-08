/**
 * Ultra-Modern Academic Report Generator
 * Creates professional educational platform-style reports with modern design standards
 */

const { jsPDF } = require("jspdf");
const fs = require('fs');
const path = require('path');

/**
 * Generates an ultra-modern academic report with professional styling
 */
function generateUltraModernAcademicReport(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions and modern spacing
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Modern color palette
  const colors = {
    primary: [24, 119, 242],     // Modern blue
    secondary: [246, 247, 249],  // Light gray background
    accent: [42, 183, 136],      // Success green
    warning: [255, 149, 0],      // Warning orange
    danger: [234, 67, 53],       // Error red
    text: [28, 30, 33],          // Dark text
    textLight: [96, 103, 112],   // Light text
    border: [218, 221, 225],     // Border gray
    white: [255, 255, 255]
  };
  
  let y = 0;
  
  // === MODERN HEADER WITH GRADIENT EFFECT ===
  // Main header background with gradient simulation
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Overlay for gradient effect
  doc.setFillColor(colors.primary[0] + 20, colors.primary[1] + 20, colors.primary[2] + 20);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  // Institution logo placeholder (modern circular design)
  doc.setFillColor(...colors.white);
  doc.circle(25, 22, 12, 'F');
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ALTUM", 25, 25, { align: "center" });
  
  // Modern header typography
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("SISTEMA EDUCATIVO ALTUM", 45, 18);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INFORME ACADÉMICO", 45, 28);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Reporte de rendimiento académico generado automáticamente", 45, 36);
  
  y = 60;
  
  // === STUDENT INFORMATION CARD ===
  // Modern card design with shadow effect
  doc.setFillColor(...colors.secondary);
  doc.rect(margin, y - 3, contentWidth, 50, 'F');
  
  // Card border
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.5);
  doc.rect(margin, y - 3, contentWidth, 50);
  
  // Card header
  doc.setFillColor(...colors.white);
  doc.rect(margin + 2, y - 1, contentWidth - 4, 12, 'F');
  
  doc.setTextColor(...colors.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("👤 INFORMACIÓN DEL ESTUDIANTE", margin + 8, y + 6);
  
  y += 18;
  
  // Student details in modern grid layout
  doc.setTextColor(...colors.textLight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("NOMBRE COMPLETO", margin + 8, y);
  doc.setTextColor(...colors.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(reportData.studentName, margin + 8, y + 8);
  
  doc.setTextColor(...colors.textLight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("PERÍODO ACADÉMICO", margin + 8, y + 18);
  doc.setTextColor(...colors.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(reportData.period, margin + 8, y + 26);
  
  // Modern average score badge
  const avgScore = reportData.average;
  let badgeColor = colors.danger;
  let badgeLabel = "NECESITA MEJORA";
  
  if (avgScore >= 9.0) {
    badgeColor = colors.accent;
    badgeLabel = "EXCELENTE";
  } else if (avgScore >= 8.0) {
    badgeColor = colors.primary;
    badgeLabel = "MUY BUENO";
  } else if (avgScore >= 7.0) {
    badgeColor = colors.warning;
    badgeLabel = "BUENO";
  }
  
  // Badge background
  doc.setFillColor(...badgeColor);
  doc.roundedRect(margin + 120, y - 2, 45, 20, 3, 3, 'F');
  
  // Badge text
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(avgScore.toFixed(1), margin + 142.5, y + 6, { align: "center" });
  
  doc.setFontSize(7);
  doc.text(badgeLabel, margin + 142.5, y + 12, { align: "center" });
  
  y += 45;
  
  // === ACADEMIC PERFORMANCE SECTION ===
  // Section header with icon
  doc.setTextColor(...colors.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("📊 RENDIMIENTO ACADÉMICO", margin, y);
  
  y += 15;
  
  // Modern table design
  const tableHeaderHeight = 14;
  const rowHeight = 16;
  const subjects = [
    ["Matemáticas", "8.5", "Muy Bueno", "Excelente comprensión de conceptos algebraicos"],
    ["Español", "9.0", "Excelente", "Destacado en análisis literario y redacción"],
    ["Ciencias", "8.7", "Muy Bueno", "Participación activa en experimentos"],
    ["Historia", "8.9", "Excelente", "Análisis crítico sobresaliente"],
    ["Inglés", "8.6", "Muy Bueno", "Progreso notable en conversación"]
  ];
  
  // Table header
  doc.setFillColor(...colors.primary);
  doc.rect(margin, y, contentWidth, tableHeaderHeight, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("MATERIA", margin + 5, y + 9);
  doc.text("CALIFICACIÓN", margin + 50, y + 9);
  doc.text("NIVEL", margin + 85, y + 9);
  doc.text("OBSERVACIONES", margin + 115, y + 9);
  
  y += tableHeaderHeight;
  
  // Table rows with alternating colors
  subjects.forEach((subject, index) => {
    // Row background
    const bgColor = index % 2 === 0 ? colors.white : colors.secondary;
    doc.setFillColor(...bgColor);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');
    
    // Row border
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    
    // Row content
    doc.setTextColor(...colors.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(subject[0], margin + 5, y + 10);
    
    // Score with color coding
    const score = parseFloat(subject[1]);
    let scoreColor = colors.danger;
    if (score >= 9.0) scoreColor = colors.accent;
    else if (score >= 8.0) scoreColor = colors.primary;
    else if (score >= 7.0) scoreColor = colors.warning;
    
    doc.setTextColor(...scoreColor);
    doc.setFont("helvetica", "bold");
    doc.text(subject[1], margin + 55, y + 10);
    
    doc.setTextColor(...colors.textLight);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(subject[2], margin + 85, y + 10);
    
    // Wrap long observations
    const observations = doc.splitTextToSize(subject[3], 55);
    doc.text(observations[0], margin + 115, y + 10);
    
    y += rowHeight;
  });
  
  y += 15;
  
  // === RECOMMENDATIONS CARD ===
  // Card background
  doc.setFillColor(...colors.secondary);
  doc.rect(margin, y, contentWidth, 65, 'F');
  
  // Card border
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 65);
  
  // Card header
  doc.setFillColor(...colors.accent);
  doc.rect(margin, y, contentWidth, 12, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("💡 RECOMENDACIONES PERSONALIZADAS", margin + 8, y + 8);
  
  y += 20;
  
  // Recommendations list
  const recommendations = [
    "Continuar fortaleciendo habilidades matemáticas con ejercicios avanzados",
    "Mantener el excelente nivel de lectura con literatura más compleja",
    "Participar en proyectos científicos extracurriculares",
    "Desarrollar presentaciones orales para mejorar expresión verbal"
  ];
  
  doc.setTextColor(...colors.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  recommendations.forEach((rec, index) => {
    doc.setFillColor(...colors.accent);
    doc.circle(margin + 8, y + 2, 1.5, 'F');
    
    const wrappedText = doc.splitTextToSize(rec, contentWidth - 25);
    doc.text(wrappedText, margin + 15, y + 4);
    y += wrappedText.length * 4 + 4;
  });
  
  y += 15;
  
  // === PAYMENT INFORMATION CARD ===
  doc.setFillColor(colors.primary[0] + 230, colors.primary[1] + 230, colors.primary[2] + 230);
  doc.rect(margin, y, contentWidth, 25, 'F');
  
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 25);
  
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("💳 INFORMACIÓN DE PAGO ASOCIADO", margin + 8, y + 8);
  
  doc.setTextColor(...colors.textLight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Recibo: #${reportData.paymentId} • Monto: $${reportData.paymentAmount.toLocaleString('es-MX')} • Ref: ${reportData.paymentReference}`, margin + 8, y + 16);
  
  y += 35;
  
  // === MODERN FOOTER ===
  // Footer separator
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(1);
  doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);
  
  // Footer content with modern styling
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("SISTEMA EDUCATIVO ALTUM", pageWidth / 2, pageHeight - 30, { align: "center" });
  
  doc.setTextColor(...colors.textLight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Informe generado automáticamente por la plataforma AcademiQ", pageWidth / 2, pageHeight - 22, { align: "center" });
  
  const now = new Date();
  doc.text(`Generado: ${now.toLocaleDateString('es-MX')} a las ${now.toLocaleTimeString('es-MX')}`, pageWidth / 2, pageHeight - 16, { align: "center" });
  
  // Digital validation badge
  doc.setFillColor(...colors.accent);
  doc.roundedRect(pageWidth / 2 - 35, pageHeight - 12, 70, 8, 2, 2, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("✓ VALIDACIÓN DIGITAL 24/7", pageWidth / 2, pageHeight - 7, { align: "center" });
  
  return doc;
}

async function main() {
  try {
    console.log('🎨 Generando informe académico ultra-moderno...');
    
    const reportData = {
      id: 17,
      studentId: 4,
      studentName: 'Andrea Cebreros Contreras',
      period: 'Junio 2025',
      average: 8.5,
      paymentId: 17,
      paymentAmount: 5000,
      paymentReference: 'pi_AndreaSimulado'
    };

    const doc = generateUltraModernAcademicReport(reportData);
    
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
    
    console.log('✅ Informe ultra-moderno generado exitosamente');
    console.log(`📁 Archivo: /informes/informe_17.pdf`);
    console.log(`🎯 Diseño: Ultra-moderno con estándares educativos actuales`);
    console.log(`📊 Estudiante: ${reportData.studentName} | Promedio: ${reportData.average}`);
  } catch (error) {
    console.error('❌ Error generando informe ultra-moderno:', error);
    process.exit(1);
  }
}

main();