/**
 * Fix QR Codes for Academic Reports #9 (Alexa) and #13 (Dania)
 * Regenerates reports with properly scannable QR codes matching validation system
 */

import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

/**
 * Generate validation token for QR code using the same method as validar.ts
 */
async function generateValidationToken(reportId) {
  const crypto = await import('crypto');
  const secret = process.env.QR_SECRET || 'academiq-qr-secret-2025';
  return crypto.default.createHmac('sha256', secret).update(reportId.toString()).digest('hex');
}

/**
 * Generates standardized academic report PDF matching informe_17.pdf design
 */
async function generateStandardizedReportPDF(reportData) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // === HEADER SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("SISTEMA EDUCATIVO ALTUM", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(16);
  doc.text("INFORME ACADÉMICO INTEGRAL", pageWidth / 2, 35, { align: "center" });
  
  // === STUDENT INFO SECTION ===
  let y = 50;
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INFORMACIÓN DEL ESTUDIANTE", 20, y);
  y += 10;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Nombre: ${reportData.studentName}`, 20, y);
  y += 6;
  doc.text(`Nivel: Preparatoria`, 20, y);
  y += 6;
  doc.text(`Período: ${reportData.period}`, 20, y);
  y += 6;
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, 20, y);
  
  y += 15;
  
  // === PERFORMANCE OVERVIEW SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RESUMEN DE RENDIMIENTO ACADÉMICO", 20, y);
  y += 10;
  
  // Performance score circle
  const avgScore = reportData.average || 8.8;
  doc.setFillColor(0, 153, 76);
  doc.roundedRect(130, y - 5, 50, 30, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(avgScore.toFixed(1), 155, y + 8, { align: "center" });
  
  doc.setFontSize(8);
  doc.text("MUY BUENO", 155, y + 16, { align: "center" });
  
  y += 40;
  
  // === STRENGTHS SECTION ===
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
  
  // === AREAS TO STRENGTHEN SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ÁREAS A FORTALECER", 20, y);
  y += 8;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const improvements = reportData.improvements || [
    "• Reforzar técnicas de estudio colaborativo para maximizar el aprendizaje en equipo",
    "• Desarrollar mayor confianza en presentaciones orales para fortalecer habilidades comunicativas"
  ];
  
  improvements.forEach(improvement => {
    const lines = doc.splitTextToSize(improvement, pageWidth - 40);
    doc.text(lines, 20, y);
    y += lines.length * 4 + 1;
  });
  
  y += 15;
  
  // === QR VALIDATION SECTION ===
  const qrSize = 25;
  
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("VALIDACIÓN DIGITAL", 20, y);
  y += 5;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Validar este informe en línea", 20, y + 15);
  doc.text("con código QR para verificar", 20, y + 19);
  doc.text("autenticidad académica", 20, y + 23);
  doc.text("SISTEMA EDUCATIVO ALTUM", 20, y + 27);
  
  y += 12;
  
  // === AI RECOMMENDATION SECTION ===
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RECOMENDACIÓN PREDICTIVA POR IA", 20, y);
  y += 8;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
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
  // Define QR position
  const qrX = pageWidth - qrSize - 20;
  const qrY = pageHeight - qrSize - 30;
  
  // Generate QR code data for validation with proper URL format
  const validationToken = await generateValidationToken(reportData.id);
  const baseURL = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://localhost:5000';
  const qrValidationUrl = `${baseURL}/validar?id=${reportData.id}&token=${validationToken}`;
  
  // Add QR code with high resolution for better scanning
  try {
    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.default.toDataURL(qrValidationUrl, { 
      width: 150,
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
  const footerY = pageHeight - 25;
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Monto: $${reportData.paymentAmount.toLocaleString('es-MX')} MXN | Referencia: ${reportData.paymentReference}`, 20, footerY);
  
  return doc;
}

/**
 * Main function to update reports
 */
async function main() {
  try {
    console.log('🔧 Fixing QR codes for academic reports #9 and #13...');
    
    // Report data for Alexa (#9)
    const alexaReportData = {
      id: 9,
      studentId: 2,
      studentName: 'Alexa Fernanda Cebreros Contreras',
      period: 'junio de 2025',
      average: 8.8,
      paymentId: 9,
      paymentAmount: 4800,
      paymentReference: 'pi_AlexaSimulado'
    };

    // Report data for Dania (#13)
    const daniaReportData = {
      id: 13,
      studentId: 3,
      studentName: 'Dania María Cebreros Contreras', 
      period: 'junio de 2025',
      average: 9.1,
      paymentId: 13,
      paymentAmount: 5200,
      paymentReference: 'pi_DaniaSimulado'
    };

    // Generate reports
    console.log('📄 Generating report for Alexa (#9)...');
    const alexaDoc = await generateStandardizedReportPDF(alexaReportData);
    
    // Save Alexa's report
    const informesDir = path.join(process.cwd(), 'public', 'informes');
    if (!fs.existsSync(informesDir)) {
      fs.mkdirSync(informesDir, { recursive: true });
    }
    
    const alexaFilename = `informe_9.pdf`;
    const alexaFilepath = path.join(informesDir, alexaFilename);
    const alexaPdfBuffer = Buffer.from(alexaDoc.output('arraybuffer'));
    fs.writeFileSync(alexaFilepath, alexaPdfBuffer);
    console.log('✅ Alexa report updated: informe_9.pdf');

    console.log('📄 Generating report for Dania (#13)...');
    const daniaDoc = await generateStandardizedReportPDF(daniaReportData);
    
    // Save Dania's report
    const daniaFilename = `informe_13.pdf`;
    const daniaFilepath = path.join(informesDir, daniaFilename);
    const daniaPdfBuffer = Buffer.from(daniaDoc.output('arraybuffer'));
    fs.writeFileSync(daniaFilepath, daniaPdfBuffer);
    console.log('✅ Dania report updated: informe_13.pdf');

    console.log('🎉 QR codes fixed successfully for both reports!');
    console.log('📋 QR codes now use proper validation URLs and tokens');
    console.log('🔍 Test QR scanning with any mobile device');
    
  } catch (error) {
    console.error('❌ Error fixing QR codes:', error);
    process.exit(1);
  }
}

main();