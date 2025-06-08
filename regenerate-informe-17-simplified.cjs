/**
 * Simplified Single-Page Academic Report Generator
 * Based on fe2ef352-ac95-4da4-9399-872dadcb0838.png design with institutional format
 */

const { jsPDF } = require("jspdf");
const QRCode = require("qrcode");
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');

// Generate secure HMAC-SHA256 token for QR validation
function generarTokenSeguro(informeId) {
  const secretKey = 'academiq-qr-secret-2025';
  return crypto.createHmac('sha256', secretKey).update(informeId.toString()).digest('hex');
}

// Generate validation URL for QR code
function generarURLValidacion(informeId) {
  const token = generarTokenSeguro(informeId);
  const baseUrl = 'https://b6b54b41-1576-4f1a-a2d6-a0641b3572d0-00-3fqsaxdymujt.riker.replit.dev';
  return `${baseUrl}/validar?id=${informeId}&token=${token}`;
}

/**
 * Generates simplified single-page academic report with institutional design
 */
async function generateSimplifiedReport(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions and margins
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  
  // Institutional colors
  const colors = {
    institutionalBlue: [0, 112, 192],   // #0070C0
    black: [0, 0, 0],
    darkGray: [64, 64, 64],
    lightGray: [128, 128, 128]
  };
  
  let y = 30;
  
  // === INSTITUTIONAL HEADER (MATCHING RECEIPT STYLE) ===
  // Institution name in blue
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SISTEMA EDUCATIVO ALTUM", pageWidth / 2, y, { align: "center" });
  
  y += 12;
  
  // Report title
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INFORME ACADÉMICO", pageWidth / 2, y, { align: "center" });
  
  y += 10;
  
  // Subtitle
  doc.setTextColor(...colors.darkGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Informe generado automáticamente a través de la plataforma AcademiQ", pageWidth / 2, y, { align: "center" });
  
  y += 25;
  
  // === STUDENT INFORMATION SECTION ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INFORMACIÓN DEL ESTUDIANTE", margin, y);
  
  y += 15;
  
  // Student details
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Nombre: ${reportData.studentName}`, margin, y);
  y += 8;
  doc.text(`Nivel: Preparatoria`, margin, y);
  y += 8;
  doc.text(`Período: ${reportData.period}`, margin, y);
  
  // Average score badge (positioned to the right)
  const badgeX = pageWidth - margin - 65;
  const badgeY = y - 20;
  
  // Badge background
  doc.setFillColor(...colors.institutionalBlue);
  doc.roundedRect(badgeX, badgeY, 55, 25, 4, 4, 'F');
  
  // Badge score
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(reportData.average.toFixed(1), badgeX + 27.5, badgeY + 12, { align: "center" });
  
  // Badge label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("MUY BUENO", badgeX + 27.5, badgeY + 19, { align: "center" });
  
  y += 25;
  
  // === FORTALEZAS SECTION ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("FORTALEZAS", margin, y);
  
  y += 12;
  
  const fortalezas = [
    "Demuestra excelente comprensión de conceptos matemáticos y resolución analítica de problemas complejos",
    "Sobresale en análisis literario y redacción académica con perspectiva crítica excepcional",
    "Participa activamente en experimentos científicos aplicando metodología correcta"
  ];
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  fortalezas.forEach((fortaleza) => {
    doc.text("•", margin, y);
    const wrappedText = doc.splitTextToSize(fortaleza, contentWidth - 10);
    wrappedText.forEach((line) => {
      doc.text(line, margin + 8, y);
      y += 5;
    });
    y += 2;
  });
  
  y += 10;
  
  // === AREAS A FORTALECER SECTION ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ÁREAS A FORTALECER", margin, y);
  
  y += 12;
  
  const areasAFortalecer = [
    "Expandir técnicas avanzadas de resolución matemática para alcanzar niveles superiores",
    "Incorporar análisis de literatura clásica para enriquecer perspectiva crítica",
    "Desarrollar proyectos de investigación independientes en ciencias"
  ];
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  areasAFortalecer.forEach((area) => {
    doc.text("•", margin, y);
    const wrappedText = doc.splitTextToSize(area, contentWidth - 10);
    wrappedText.forEach((line) => {
      doc.text(line, margin + 8, y);
      y += 5;
    });
    y += 2;
  });
  
  // === QR CODE SECTION (POSITIONED IN MIDDLE RIGHT) ===
  // Generate QR code early and position it in the middle right area
  const validationUrl = generarURLValidacion(reportData.id);
  const qrCodeBuffer = await QRCode.toBuffer(validationUrl, {
    type: 'png',
    width: 120,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  // Position QR code in bottom right, very small size
  const qrSize = 35;
  const qrX = pageWidth - margin - qrSize - 5;
  const qrY = pageHeight - 80; // Bottom right position to avoid text overlap
  
  doc.addImage(qrCodeBuffer, 'PNG', qrX, qrY, qrSize, qrSize);
  
  // QR validation text beside QR code (adjusted for smaller QR in bottom)
  doc.setTextColor(...colors.lightGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  
  const qrTextLines = [
    "Escanea este código QR para",
    "validar este informe en línea.",
    "Verificación disponible 24/7",
    "SISTEMA EDUCATIVO ALTUM"
  ];
  
  let qrTextY = qrY + 3;
  qrTextLines.forEach((line) => {
    doc.text(line, qrX - 5, qrTextY, { align: "right" });
    qrTextY += 3;
  });
  
  y += 25;
  
  // === RECOMENDACIÓN PREDICTIVA POR IA SECTION ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RECOMENDACION PREDICTIVA POR IA", margin, y);
  
  y += 12;
  
  // New content provided by user
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const newContent = "Con base en el analisis del perfil academico de Andrea, se observa una estudiante con alto potencial en areas STEM (Ciencia, Tecnologia, Ingenieria y Matematicas). Su desempeno consistente de 8.5 refleja capacidades analiticas sobresalientes y metodologia de estudio eficaz.\n\nRecomendaciones de desarrollo:\n\n• Participacion en olimpiadas de matematicas y ciencias para potenciar sus habilidades competitivas\n• Exploracion de cursos avanzados en programacion o robotica educativa\n• Desarrollo de proyectos de investigacion interdisciplinarios que combinen ciencias exactas con humanidades\n• Fortalecimiento de habilidades de liderazgo a traves de tutoria a companeros en materias STEM\n\nPerfil vocacional sugerido: Ingenieria, Ciencias de la Computacion, Biotecnologia o Investigacion Cientifica. Andrea muestra las competencias fundamentales para destacar en carreras que requieren pensamiento logico-matematico y capacidad de resolucion de problemas complejos.";
  
  const wrappedContent = doc.splitTextToSize(newContent, contentWidth);
  wrappedContent.forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });
  
  y += 15;
  
  // === FOOTER - PAYMENT INFORMATION ===
  const footerY = pageHeight - 25;
  
  // Footer separator line
  doc.setDrawColor(...colors.lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  // Payment information
  doc.setTextColor(...colors.darkGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Recibo ID: ${reportData.paymentId} | Monto: $${reportData.paymentAmount.toLocaleString('es-MX')} MXN | Referencia: ${reportData.paymentReference}`, pageWidth / 2, footerY, { align: "center" });
  
  return doc;
}

async function main() {
  try {
    console.log('📄 Generando informe académico simplificado...');
    
    const reportData = {
      id: 17,
      studentId: 4,
      studentName: 'Andrea Cebreros Contreras',
      period: 'Junio de 2025',
      average: 8.5,
      paymentId: 17,
      paymentAmount: 5000,
      paymentReference: 'pi_AndreaSimulado'
    };

    const doc = await generateSimplifiedReport(reportData);
    
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
    
    console.log('✅ Informe simplificado generado exitosamente');
    console.log(`📁 Archivo: /informes/informe_17.pdf`);
    console.log(`🎯 Diseño: Formato simplificado con fortalezas y áreas a fortalecer`);
    console.log(`📊 Estudiante: ${reportData.studentName} | Promedio: ${reportData.average}`);
    console.log(`🔗 QR URL: ${generarURLValidacion(reportData.id)}`);
  } catch (error) {
    console.error('❌ Error generando informe simplificado:', error);
    process.exit(1);
  }
}

main();