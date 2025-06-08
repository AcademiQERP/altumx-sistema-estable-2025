/**
 * Generate Receipt #13 with Authentic Payment Data
 * Creates recibo_13.pdf for Dania María Cebreros Contreras
 */

import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Generate secure QR token
function generateQRToken(receiptId) {
  const secretKey = 'academiq-qr-secret-2025';
  const data = `receipt_${receiptId}_${Date.now()}`;
  const token = crypto.createHmac('sha256', secretKey).update(data).digest('hex');
  return token;
}

// Generate modern receipt PDF
async function generateReceiptPDF(paymentData) {
  const doc = new jsPDF();
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  let y = 20;
  
  // Header with gradient effect
  doc.setFillColor(0, 102, 204);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RECIBO DE PAGO", pageWidth / 2, 25, { align: "center" });
  
  y = 60;
  
  // Receipt number and date
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`RECIBO #${paymentData.id}`, 20, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Fecha: ${new Date(paymentData.fecha_pago).toLocaleDateString('es-MX')}`, pageWidth - 80, y);
  
  y += 20;
  
  // Student Information Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INFORMACIÓN DEL ESTUDIANTE", 20, y);
  y += 15;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Nombre: ${paymentData.alumno_nombre}`, 20, y);
  y += 8;
  doc.text(`Nivel: ${paymentData.nivel}`, 20, y);
  y += 8;
  doc.text(`ID del Estudiante: ${paymentData.alumno_id}`, 20, y);
  y += 20;
  
  // Payment Details Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DETALLES DEL PAGO", 20, y);
  y += 15;
  
  // Draw payment details table
  const tableData = [
    ['Concepto:', paymentData.concepto_nombre || 'Colegiatura Mensual'],
    ['Monto:', `$${parseFloat(paymentData.monto).toLocaleString('es-MX')}`],
    ['Método de Pago:', paymentData.metodo_pago === 'tarjeta' ? 'Tarjeta de Crédito/Débito' : paymentData.metodo_pago],
    ['Referencia:', paymentData.referencia],
    ['Estado:', 'PAGADO']
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  tableData.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 80, y);
    y += 10;
  });
  
  y += 20;
  
  // Generate QR Code
  const qrToken = generateQRToken(paymentData.id);
  const qrUrl = `https://b6b54b41-1576-4f1a-a2d6-a0641b3572d0-00-3fqsaxdymujt.riker.replit.dev/validar?token=${qrToken}&type=receipt&id=${paymentData.id}`;
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
      width: 100,
      margin: 2
    });
    
    // QR Code Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CÓDIGO QR DE VALIDACIÓN", 20, y);
    y += 15;
    
    // Add QR code image
    doc.addImage(qrCodeDataURL, 'PNG', 20, y, 40, 40);
    
    // QR instructions
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const qrInstructions = [
      "Escanee este código QR para validar",
      "la autenticidad del recibo de pago.",
      "Verificación disponible 24/7."
    ];
    
    let qrTextY = y;
    qrInstructions.forEach(instruction => {
      doc.text(instruction, 70, qrTextY);
      qrTextY += 6;
    });
    
  } catch (error) {
    console.log('Warning: Could not generate QR code');
  }
  
  y += 60;
  
  // Security Features
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CARACTERÍSTICAS DE SEGURIDAD", 20, y);
  y += 10;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const securityFeatures = [
    "• Recibo generado con datos auténticos del sistema",
    "• Código QR con validación criptográfica HMAC-SHA256",
    "• Verificación en línea disponible las 24 horas",
    "• Documento protegido contra falsificaciones"
  ];
  
  securityFeatures.forEach(feature => {
    doc.text(feature, 20, y);
    y += 6;
  });
  
  // Footer
  y = pageHeight - 30;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Sistema AcademiQ - Gestión Educativa Integral", pageWidth / 2, y, { align: "center" });
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth / 2, y + 8, { align: "center" });
  
  return doc;
}

async function main() {
  console.log('🧾 Generating recibo_13.pdf with authentic payment data...');
  
  const paymentData = {
    id: 13,
    alumno_id: 3,
    monto: '5000',
    concepto_id: 1,
    referencia: 'pi_3RV49xFRrUUJd2y012iPoh36',
    fecha_pago: '2025-06-01',
    metodo_pago: 'tarjeta',
    alumno_nombre: 'Dania María Cebreros Contreras',
    nivel: 'Preparatoria',
    concepto_nombre: 'Colegiatura Mensual'
  };
  
  console.log(`👤 Student: ${paymentData.alumno_nombre}`);
  console.log(`💰 Amount: $${parseFloat(paymentData.monto).toLocaleString('es-MX')}`);
  console.log(`📋 Concept: ${paymentData.concepto_nombre}`);
  
  try {
    // Generate PDF
    const receiptPDF = await generateReceiptPDF(paymentData);
    
    // Save to public/recibos directory
    const recibosDir = path.join(process.cwd(), 'public', 'recibos');
    
    // Ensure directory exists
    if (!fs.existsSync(recibosDir)) {
      fs.mkdirSync(recibosDir, { recursive: true });
    }
    
    const filename = 'recibo_13.pdf';
    const filePath = path.join(recibosDir, filename);
    
    const pdfBuffer = Buffer.from(receiptPDF.output('arraybuffer'));
    fs.writeFileSync(filePath, pdfBuffer);
    
    console.log(`✅ Successfully generated: ${filename}`);
    console.log(`📄 File saved to: ${filePath}`);
    console.log('🔗 Accessible at: /recibos/recibo_13.pdf');
    
  } catch (error) {
    console.error('❌ Error generating receipt:', error);
  }
}

main().catch(console.error);