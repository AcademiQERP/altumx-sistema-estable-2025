/**
 * Single-Page Academic Report Generator
 * Based on SISTEMA_EDUCATIVO_ALTUM_Informe_Académico_Una_Página.pdf design
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
 * Generates single-page academic report with institutional design
 */
async function generateSinglePageReport(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions and margins
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  
  // Institutional colors matching the reference
  const colors = {
    institutionalBlue: [0, 112, 192],   // #0070C0
    black: [0, 0, 0],
    darkGray: [64, 64, 64],
    lightGray: [128, 128, 128]
  };
  
  let y = 30;
  
  // === INSTITUTIONAL HEADER ===
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
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INFORMACIÓN DEL ESTUDIANTE", margin, y);
  
  y += 15;
  
  // Student details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Nombre: ${reportData.studentName}`, margin, y);
  y += 8;
  doc.text(`Nivel: Preparatoria`, margin, y);
  y += 8;
  doc.text(`${reportData.period}`, margin, y);
  
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
  
  // === ACADEMIC PERFORMANCE TABLE ===
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DESEMPEÑO ACADÉMICO", margin, y);
  
  y += 15;
  
  // Table setup
  const tableStartY = y;
  const rowHeight = 16;
  const colWidths = [35, 25, 25, 80]; // MATERIA, CALIFICACION, NIVEL, OBSERVACIONES
  const colPositions = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ];
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentWidth, 12, 'F');
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("MATERIA", colPositions[0] + 2, y + 8);
  doc.text("CALIFICACIÓN", colPositions[1] + 2, y + 8);
  doc.text("NIVEL", colPositions[2] + 2, y + 8);
  doc.text("OBSERVACIONES", colPositions[3] + 2, y + 8);
  
  y += 12;
  
  // Table data
  const subjects = [
    ["Matemáticas", "8.5", "Muy Bueno", "Excelente comprensión"],
    ["Español", "9.0", "Excelente", "Redacción destacada"],
    ["Ciencias", "8.7", "Muy Bueno", "Participación activa en experimentos"],
    ["Historia", "8.5", "Muy Bueno", "Análisis crítico sobresaliente"],
    ["Inglés", "8.6", "Muy Bueno", "Progreso notable en conversación"]
  ];
  
  // Table rows
  subjects.forEach((subject, index) => {
    // Alternating row backgrounds
    if (index % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    
    // Row content
    doc.setTextColor(...colors.black);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(subject[0], colPositions[0] + 2, y + 10);
    
    // Score in blue
    doc.setTextColor(...colors.institutionalBlue);
    doc.setFont("helvetica", "bold");
    doc.text(subject[1], colPositions[1] + 8, y + 10, { align: "center" });
    
    // Level and observations
    doc.setTextColor(...colors.black);
    doc.setFont("helvetica", "normal");
    doc.text(subject[2], colPositions[2] + 2, y + 10);
    doc.text(subject[3], colPositions[3] + 2, y + 10);
    
    y += rowHeight;
  });
  
  y += 20;
  
  // === FINAL RECOMMENDATIONS ===
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RECOMENDACIÓN FINAL", margin, y);
  
  y += 12;
  
  // Recommendations list
  const recommendations = [
    "Continuar reforzando habilidades matemáticas con ejercicios prácticos",
    "Participar en proyectos de investigación en ciencias"
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  recommendations.forEach((rec) => {
    doc.text("•", margin, y);
    const wrappedText = doc.splitTextToSize(rec, contentWidth - 15);
    wrappedText.forEach((line) => {
      doc.text(line, margin + 8, y);
      y += 5;
    });
    y += 2;
  });
  
  // === QR CODE SECTION ===
  // Generate QR code
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
  
  // Position QR code in bottom right
  const qrSize = 40;
  const qrX = pageWidth - margin - qrSize - 5;
  const qrY = y + 10;
  
  doc.addImage(qrCodeBuffer, 'PNG', qrX, qrY, qrSize, qrSize);
  
  // QR validation text
  doc.setTextColor(...colors.lightGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Escanea este código QR para validar este informe en línea. Verificación", pageWidth / 2, pageHeight - 20, { align: "center" });
  doc.text("disponible 24/7 – SISTEMA EDUCATIVO ALTUM", pageWidth / 2, pageHeight - 15, { align: "center" });
  
  // === PAYMENT INFORMATION (SMALL SECTION) ===
  doc.setTextColor(...colors.darkGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Información de pago asociado: Recibo ID ${reportData.paymentId} | $${reportData.paymentAmount.toLocaleString('es-MX')} MXN | ${reportData.paymentReference}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  
  return doc;
}

async function main() {
  try {
    console.log('📄 Generando informe académico de una página...');
    
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

    const doc = await generateSinglePageReport(reportData);
    
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
    
    console.log('✅ Informe de una página generado exitosamente');
    console.log(`📁 Archivo: /informes/informe_17.pdf`);
    console.log(`🎯 Diseño: Una página con encabezado institucional y QR integrado`);
    console.log(`📊 Estudiante: ${reportData.studentName} | Promedio: ${reportData.average}`);
    console.log(`🔗 QR URL: ${generarURLValidacion(reportData.id)}`);
  } catch (error) {
    console.error('❌ Error generando informe de una página:', error);
    process.exit(1);
  }
}

main();