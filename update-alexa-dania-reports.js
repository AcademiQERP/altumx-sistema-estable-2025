/**
 * Update Academic Reports for Alexa (#9) and Dania (#13)
 * Using the exact design template from Andrea's report (#17)
 */

import { jsPDF } from "jspdf";
import "jspdf-autotable";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates standardized academic report PDF matching informe_17.pdf design
 */
async function generateStandardizedReportPDF(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  let y = 20;
  
  // === HEADER DESIGN (exact match to informe_17.pdf) ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SISTEMA EDUCATIVO ALTUM", pageWidth / 2, y, { align: "center" });
  
  y += 8;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.text("INFORME ACADÉMICO", pageWidth / 2, y, { align: "center" });
  
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Informe generado automáticamente a través de la plataforma AcademiQ", pageWidth / 2, y, { align: "center" });
  
  y += 20;
  
  // === STUDENT INFORMATION SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INFORMACIÓN DEL ESTUDIANTE", 20, y, { align: "left" });
  
  y += 10;
  
  // Student information layout
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  // Left side - Student details
  doc.setFont("helvetica", "bold");
  doc.text("Nombre: ", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(reportData.studentName, 45, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Nivel: ", 20, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text("Preparatoria", 40, y + 8);
  
  doc.setFont("helvetica", "bold");
  doc.text("Período: ", 20, y + 16);
  doc.setFont("helvetica", "normal");
  doc.text(reportData.period, 50, y + 16);
  
  // Right side - Average score card (blue design matching informe_17.pdf)
  const avgScore = reportData.average;
  
  // Blue rounded card for average
  doc.setFillColor(0, 123, 191);
  doc.roundedRect(130, y - 5, 50, 30, 3, 3, 'F');
  
  // Score text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(avgScore.toFixed(1), 155, y + 8, { align: "center" });
  
  doc.setFontSize(8);
  doc.text("MUY BUENO", 155, y + 16, { align: "center" });
  
  y += 40;
  
  // === FORTALEZAS SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("FORTALEZAS", 20, y);
  y += 10;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const strengths = reportData.strengths || [
    "• Demuestra excelente comprensión de conceptos matemáticos y resolución analítica de problemas complejos",
    "• Sobresale en análisis literario y redacción académica con perspectiva crítica excepcional", 
    "• Participa activamente en experimentos científicos aplicando metodología correcta"
  ];
  
  strengths.forEach(strength => {
    const lines = doc.splitTextToSize(strength, pageWidth - 40);
    doc.text(lines, 20, y);
    y += lines.length * 4 + 1;
  });
  
  y += 8;
  
  // === ÁREAS A FORTALECER SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ÁREAS A FORTALECER", 20, y);
  y += 10;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const improvements = reportData.improvements || [
    "• Expandir técnicas avanzadas de resolución matemática para alcanzar niveles superiores",
    "• Incorporar análisis de literatura clásica para enriquecer perspectiva crítica",
    "• Desarrollar proyectos de investigación independientes en ciencias"
  ];
  
  improvements.forEach(improvement => {
    const lines = doc.splitTextToSize(improvement, pageWidth - 40);
    doc.text(lines, 20, y);
    y += lines.length * 4 + 1;
  });
  
  y += 15;
  
  // === QR CODE POSITIONING ===
  const qrSize = 25;
  const qrX = pageWidth - qrSize - 20;
  const qrY = y - 10;
  
  // Footer validation text (left side)
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Validar este informe en línea", 20, y + 15);
  doc.text("con código QR para verificar", 20, y + 19);
  doc.text("autenticidad académica", 20, y + 23);
  doc.text("SISTEMA EDUCATIVO ALTUM", 20, y + 27);
  
  y += 12;
  
  // === RECOMENDACIÓN PREDICTIVA POR IA SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RECOMENDACIÓN PREDICTIVA POR IA", 20, y);
  y += 8;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  // AI recommendation text personalized for each student
  const aiText = reportData.aiRecommendation || `Con base en el análisis del perfil académico de ${reportData.studentName.split(' ')[0]}, se observa una estudiante con potencial en áreas STEM (Ciencia, Tecnología, Ingeniería y Matemáticas). Su desempeño consistente de ${avgScore.toFixed(1)} refleja capacidades analíticas sobresalientes y metodología de estudio eficaz.`;
  
  const aiLines = doc.splitTextToSize(aiText, pageWidth - qrSize - 50);
  doc.text(aiLines, 20, y);
  y += aiLines.length * 3;
  
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Recomendaciones de desarrollo:", 20, y);
  y += 4;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const devRecs = [
    "• Participación en olimpiadas de matemáticas y ciencias para potenciar sus habilidades competitivas",
    "• Exploración de cursos avanzados en programación o robótica educativa",
    "• Desarrollo de proyectos de investigación interdisciplinarios que combinen ciencias exactas con humanidades"
  ];
  
  devRecs.forEach(rec => {
    const lines = doc.splitTextToSize(rec, pageWidth - qrSize - 50);
    doc.text(lines, 20, y);
    y += lines.length * 3;
  });
  
  // === QR CODE AND FOOTER ===
  // Update QR position using existing qrSize variable
  qrX = pageWidth - qrSize - 20;
  qrY = pageHeight - qrSize - 30;
  
  // Generate QR code data for validation with proper URL format
  const validationToken = await generateValidationToken(reportData.id);
  const baseURL = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://localhost:5000';
  const qrValidationUrl = `${baseURL}/validar?id=${reportData.id}&token=${validationToken}`;
  
  // Add QR code with high resolution for better scanning
  try {
    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.default.toDataURL(qrValidationUrl, { 
      width: 120,
      margin: 2,
      color: { 
        dark: '#000000', 
        light: '#FFFFFF' 
      },
      errorCorrectionLevel: 'M'
    });
    
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    
    // Add QR label below for clarity
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text('Escanear para validar', qrX - 5, qrY + qrSize + 5);
    
  } catch (error) {
    console.log('QR code generation failed, using placeholder');
    doc.setDrawColor(0, 0, 0);
    doc.rect(qrX, qrY, qrSize, qrSize);
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0);
    doc.text('QR', qrX + qrSize/2, qrY + qrSize/2, { align: 'center' });
  }
  
  // Payment information footer
  y = pageHeight - 25;
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Monto: $${reportData.paymentAmount.toLocaleString('es-MX')} MXN | Referencia: ${reportData.paymentReference}`, 20, y);
  
  return doc;
}

/**
 * Generate validation token for QR code using the same method as validar.ts
 */
async function generateValidationToken(reportId) {
  const crypto = await import('crypto');
  const secret = process.env.QR_SECRET || 'academiq-qr-secret-2025';
  return crypto.default.createHmac('sha256', secret).update(reportId.toString()).digest('hex');
}

/**
 * Main function to update reports
 */
async function main() {
  console.log('🔄 Updating academic reports for Alexa (#9) and Dania (#13)...');
  
  // Report data for Alexa Fernanda Cebreros Contreras (#9)
  const alexaReportData = {
    id: 9,
    studentId: 2,
    studentName: "Alexa Fernanda Cebreros Contreras",
    period: "junio de 2025",
    average: 8.7,
    paymentId: 9,
    paymentAmount: 5000,
    paymentReference: "pi_AlexaSimulado",
    strengths: [
      "• Demuestra excelente comprensión de conceptos matemáticos y resolución analítica de problemas complejos",
      "• Sobresale en análisis literario y redacción académica con perspectiva crítica excepcional",
      "• Participa activamente en experimentos científicos aplicando metodología correcta"
    ],
    improvements: [
      "• Expandir técnicas avanzadas de resolución matemática para alcanzar niveles superiores", 
      "• Incorporar análisis de literatura clásica para enriquecer perspectiva crítica",
      "• Desarrollar proyectos de investigación independientes en ciencias"
    ],
    aiRecommendation: "Con base en el análisis del perfil académico de Alexa, se observa una estudiante con potencial destacado en áreas STEM (Ciencia, Tecnología, Ingeniería y Matemáticas). Su desempeño consistente de 8.7 refleja capacidades analíticas sobresalientes y metodología de estudio eficaz."
  };
  
  // Report data for Dania María Cebreros Contreras (#13)
  const daniaReportData = {
    id: 13,
    studentId: 3,
    studentName: "Dania María Cebreros Contreras", 
    period: "junio de 2025",
    average: 8.3,
    paymentId: 13,
    paymentAmount: 5000,
    paymentReference: "pi_DaniaSimulado",
    strengths: [
      "• Demuestra excelente comprensión de conceptos matemáticos y resolución analítica de problemas complejos",
      "• Sobresale en análisis literario y redacción académica con perspectiva crítica excepcional", 
      "• Participa activamente en experimentos científicos aplicando metodología correcta"
    ],
    improvements: [
      "• Expandir técnicas avanzadas de resolución matemática para alcanzar niveles superiores",
      "• Incorporar análisis de literatura clásica para enriquecer perspectiva crítica", 
      "• Desarrollar proyectos de investigación independientes en ciencias"
    ],
    aiRecommendation: "Con base en el análisis del perfil académico de Dania, se observa una estudiante con potencial en áreas STEM (Ciencia, Tecnología, Ingeniería y Matemáticas). Su desempeño consistente de 8.3 refleja capacidades analíticas sobresalientes y metodología de estudio eficaz."
  };
  
  // Ensure informes directory exists
  const informesDir = path.join(process.cwd(), 'public', 'informes');
  if (!fs.existsSync(informesDir)) {
    fs.mkdirSync(informesDir, { recursive: true });
  }
  
  try {
    // Generate Alexa's report
    console.log('📄 Generating report for Alexa (#9)...');
    const alexaPdf = await generateStandardizedReportPDF(alexaReportData);
    const alexaBuffer = Buffer.from(alexaPdf.output('arraybuffer'));
    fs.writeFileSync(path.join(informesDir, 'informe_9.pdf'), alexaBuffer);
    console.log('✅ Alexa report updated: informe_9.pdf');
    
    // Generate Dania's report  
    console.log('📄 Generating report for Dania (#13)...');
    const daniaPdf = await generateStandardizedReportPDF(daniaReportData);
    const daniaBuffer = Buffer.from(daniaPdf.output('arraybuffer'));
    fs.writeFileSync(path.join(informesDir, 'informe_13.pdf'), daniaBuffer);
    console.log('✅ Dania report updated: informe_13.pdf');
    
    console.log('🎉 Both reports have been successfully updated with the standardized design!');
    console.log('📋 Next steps:');
    console.log('   - Test QR code validation for both reports');
    console.log('   - Verify reports appear correctly in parent portal');
    console.log('   - Confirm single-page A4 layout is maintained');
    
  } catch (error) {
    console.error('❌ Error updating reports:', error);
    throw error;
  }
}

// Run the script
main().catch(console.error);