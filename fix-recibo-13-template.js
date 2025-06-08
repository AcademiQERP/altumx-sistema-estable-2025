/**
 * Fix Receipt #13 with Modern Template and Correct QR Validation
 * Uses the standard receipt template with proper HMAC-SHA256 token
 */

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Generate secure HMAC-SHA256 token using the exact same method as the system
function generarTokenSeguro(pagoId) {
  const secretKey = 'academiq-qr-secret-2025';
  // Use the exact same format as the validation system
  return crypto.createHmac('sha256', secretKey).update(pagoId.toString()).digest('hex');
}

// Generate validation URL with correct format
function generarURLValidacion(pagoId) {
  const token = generarTokenSeguro(pagoId);
  const baseUrl = 'https://b6b54b41-1576-4f1a-a2d6-a0641b3572d0-00-3fqsaxdymujt.riker.replit.dev';
  return `${baseUrl}/validar?id=${pagoId}&token=${token}`;
}

/**
 * Generate receipt using the standard modern template
 */
async function generateStandardReceipt(paymentData) {
  const receiptDir = path.join(process.cwd(), 'public', 'recibos');
  if (!fs.existsSync(receiptDir)) {
    fs.mkdirSync(receiptDir, { recursive: true });
  }
  
  const filename = `recibo_${paymentData.id}.pdf`;
  const filepath = path.join(receiptDir, filename);
  
  const writeStream = fs.createWriteStream(filepath);
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4'
  });
  
  // Generate validation URL and QR code
  const validationUrl = generarURLValidacion(paymentData.id);
  console.log(`🔗 Generated validation URL: ${validationUrl}`);
  
  const qrCodeBuffer = await QRCode.toBuffer(validationUrl, {
    type: 'png',
    width: 100,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`✅ PDF generated successfully: ${filepath}`);
      resolve(`/recibos/${filename}`);
    });
    
    writeStream.on('error', (error) => {
      console.error('❌ Error writing PDF:', error);
      reject(error);
    });

    // Pipe the PDF to the write stream
    doc.pipe(writeStream);

    // === HEADER SECTION ===
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#0066CC')
       .text('SISTEMA EDUCATIVO ALTUM', 50, 50, { align: 'center' });
    
    doc.fontSize(18)
       .fillColor('#000000')
       .text('RECIBO DE PAGO', 50, 75, { align: 'center' });
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666666')
       .text('Recibo generado automáticamente a través de la plataforma AcademiQ – https://academiq.mx', 50, 95, { align: 'center' });
    
    doc.text('Calle Principal #123, Ciudad de México', 50, 107, { align: 'center' });
    doc.text('RFC: ALTUM123456XYZ', 50, 119, { align: 'center' });

    // === RECEIPT NUMBER AND DATE ===
    let yPosition = 150;
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('RECIBO NO:', 50, yPosition);
    
    doc.text('FECHA DE EMISIÓN:', 400, yPosition);
    
    yPosition += 15;
    doc.fontSize(12)
       .font('Helvetica')
       .text(paymentData.id.toString(), 50, yPosition);
    
    const fechaFormateada = format(new Date(paymentData.fecha_pago), "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es });
    doc.text(fechaFormateada, 400, yPosition);

    // === STUDENT INFORMATION ===
    yPosition += 40;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('INFORMACIÓN DEL ESTUDIANTE', 50, yPosition);
    
    yPosition += 20;
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('Nombre del alumno:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.alumno_nombre, 200, yPosition);
    
    yPosition += 15;
    doc.font('Helvetica-Bold')
       .text('ID del estudiante:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.alumno_id.toString(), 200, yPosition);
    
    yPosition += 15;
    doc.font('Helvetica-Bold')
       .text('Padre/Madre/Tutor:', 50, yPosition);
    
    doc.font('Helvetica')
       .text('Fernando Cebreros Beltrán', 200, yPosition);

    // === PAYMENT INFORMATION ===
    yPosition += 30;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('INFORMACIÓN DEL PAGO', 50, yPosition);

    // QR Code positioned to align perfectly with reference line
    const qrX = 445;
    const qrY = yPosition - 12;
    doc.image(qrCodeBuffer, qrX, qrY, { width: 70, height: 70 });
    
    doc.fontSize(6)
       .font('Helvetica')
       .fillColor('#777777')
       .text('Escanea para validar', qrX - 5, qrY + 75);
    
    // Clean validation message below QR code
    doc.fontSize(4)
       .font('Helvetica')
       .fillColor('#777777')
       .text('Escanea este código QR para validar este recibo en línea.', qrX - 75, qrY + 85, { 
         width: 150, 
         align: 'center',
         lineGap: 0
       })
       .text('Verificación disponible 24/7', qrX - 75, qrY + 92, { 
         width: 150, 
         align: 'center',
         lineGap: 0
       });

    yPosition += 20;
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('Fecha de pago:', 50, yPosition);
    
    const fechaPago = format(new Date(paymentData.fecha_pago), "d 'de' MMMM 'de' yyyy", { locale: es });
    doc.font('Helvetica')
       .text(fechaPago, 200, yPosition);
    
    yPosition += 15;
    doc.font('Helvetica-Bold')
       .text('Método de pago:', 50, yPosition);
    
    const metodoPago = paymentData.metodo_pago === 'tarjeta' ? 'Tarjeta de Crédito/Débito' : 'Transferencia Bancaria';
    doc.font('Helvetica')
       .text(metodoPago, 200, yPosition);
    
    yPosition += 15;
    doc.font('Helvetica-Bold')
       .text('Referencia:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.referencia, 200, yPosition);

    // === PAYMENT DETAIL ===
    yPosition += 40;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('DETALLE DEL PAGO', 50, yPosition);
    
    yPosition += 25;
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('Concepto', 50, yPosition);
    
    doc.text('Descripción', 200, yPosition);
    doc.text('Monto', 450, yPosition);
    
    yPosition += 20;
    doc.font('Helvetica')
       .text(paymentData.concepto_nombre || 'Colegiatura Mensual', 50, yPosition);
    
    doc.text('Colegiatura mensual ciclo 2025-2026', 200, yPosition);
    
    const montoFormateado = `$${parseFloat(paymentData.monto).toLocaleString('es-MX')}`;
    doc.text(montoFormateado, 450, yPosition);
    
    yPosition += 30;
    doc.font('Helvetica-Bold')
       .text('Total Pagado:', 400, yPosition);
    
    yPosition += 15;
    doc.fontSize(12)
       .text(montoFormateado, 450, yPosition);

    // === OBSERVATIONS ===
    yPosition += 30;
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('OBSERVACIONES', 50, yPosition);
    
    yPosition += 15;
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Pago de colegiatura para ${paymentData.alumno_nombre}`, 50, yPosition);

    // === DIGITAL SEAL SPACE ===
    yPosition += 40;
    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .fillColor('#666666')
       .text('Espacio reservado para sello digital o validación administrativa', 50, yPosition, { align: 'center' });

    // === FOOTER ===
    const footerY = 720;
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#000000')
       .text('Este documento es un comprobante de pago oficial emitido por Sistema Educativo Altum.', 50, footerY, { align: 'center' });
    
    doc.fontSize(9)
       .fillColor('#666666')
       .text('Para cualquier aclaración favor de comunicarse a admin@altum.edu.mx', 50, footerY + 12, { align: 'center' });
    
    doc.text('Recibo generado automáticamente con tecnología de AcademiQ (https://academiq.mx)', 50, footerY + 24, { align: 'center' });

    // Finalize the PDF
    doc.end();
  });
}

async function main() {
  console.log('🔧 Fixing recibo_13.pdf with modern template and correct QR validation...');
  
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
  
  try {
    const pdfPath = await generateStandardReceipt(paymentData);
    console.log(`✅ Receipt regenerated successfully: ${pdfPath}`);
    console.log('🔗 Accessible at: /recibos/recibo_13.pdf');
    
  } catch (error) {
    console.error('❌ Error generating receipt:', error);
  }
}

main().catch(console.error);