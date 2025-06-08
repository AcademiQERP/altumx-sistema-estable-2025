/**
 * Generate Receipt #17 for Andrea Cebreros Contreras
 * Creates recibo_17.pdf with payment data for pi_AndreaSimulado
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const QRCode = require('qrcode');

function generarTokenSeguro(pagoId) {
  const secretKey = 'academiq-qr-secret-2025';
  return crypto.createHmac('sha256', secretKey)
               .update(pagoId.toString())
               .digest('hex');
}

function generarURLValidacion(pagoId) {
  const token = generarTokenSeguro(pagoId);
  const baseUrl = 'https://b6b54b41-1576-4f1a-a2d6-a0641b3572d0-00-3fqsaxdymujt.riker.replit.dev';
  return `${baseUrl}/validar?id=${pagoId}&token=${token}`;
}

/**
 * Generate receipt using the standard modern template
 */
async function generateStandardReceipt(paymentData) {
  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50,
    info: {
      Title: `Recibo de Pago ${paymentData.id}`,
      Author: 'AcademiQ',
      Subject: 'Comprobante de Pago',
      Creator: 'Sistema AcademiQ'
    }
  });

  const outputPath = path.join(__dirname, 'public', 'recibos', `recibo_${paymentData.id}.pdf`);
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Header with enhanced branding
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor('#1e40af')
     .text('AcademiQ', 50, 50);

  doc.fontSize(12)
     .font('Helvetica')
     .fillColor('#64748b')
     .text('Sistema de Gestión Educativa', 50, 80);

  // Receipt title and number
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('Comprobante de Pago', 350, 50);

  doc.fontSize(14)
     .font('Helvetica')
     .fillColor('#666666')
     .text(`Recibo #${paymentData.id}`, 350, 75);

  // Horizontal line
  doc.strokeColor('#e2e8f0')
     .lineWidth(1)
     .moveTo(50, 110)
     .lineTo(550, 110)
     .stroke();

  // Student and payment information
  let yPosition = 140;

  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#1f2937')
     .text('Información del Estudiante', 50, yPosition);

  yPosition += 30;
  doc.fontSize(12)
     .font('Helvetica')
     .text(`Nombre: ${paymentData.studentName}`, 70, yPosition);

  yPosition += 20;
  doc.text(`Nivel: ${paymentData.level}`, 70, yPosition);

  yPosition += 40;
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#1f2937')
     .text('Detalles del Pago', 50, yPosition);

  yPosition += 30;
  doc.fontSize(12)
     .font('Helvetica')
     .text(`Concepto: ${paymentData.concept}`, 70, yPosition);

  yPosition += 20;
  doc.text(`Fecha de Pago: ${paymentData.paymentDate}`, 70, yPosition);

  yPosition += 20;
  doc.text(`Método de Pago: ${paymentData.paymentMethod}`, 70, yPosition);

  yPosition += 20;
  doc.text(`Referencia: ${paymentData.reference}`, 70, yPosition);

  // Amount section with emphasis
  yPosition += 40;
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#059669')
     .text('Monto Total', 50, yPosition);

  yPosition += 25;
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor('#059669')
     .text(`$${paymentData.amount.toLocaleString()} MXN`, 70, yPosition);

  // Status
  yPosition += 40;
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor('#059669')
     .text('Estado: PAGADO', 50, yPosition);

  // QR Code section
  const validationUrl = generarURLValidacion(paymentData.id);
  
  // Generate QR code
  const qrOptions = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 80
  };

  try {
    const qrCodeDataURL = await QRCode.toDataURL(validationUrl, qrOptions);
    const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
    
    // Position QR code
    const qrX = 420;
    const qrY = yPosition - 60;
    
    doc.image(qrBuffer, qrX, qrY, { width: 80, height: 80 });
    
    // QR code label
    doc.fontSize(8)
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

    doc.fontSize(11)
       .font('Helvetica')
       .text(paymentData.paymentDate, 150, yPosition);

  } catch (error) {
    console.error('Error generating QR code:', error);
  }

  // Observations section
  yPosition += 40;
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Observaciones:', 50, yPosition);

  yPosition += 20;
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#666666')
     .text(paymentData.observations || 'Pago procesado correctamente. Gracias por su confianza.', 50, yPosition, {
       width: 500,
       align: 'justify'
     });

  // Footer
  yPosition = 720;
  doc.fontSize(8)
     .fillColor('#999999')
     .text('Este comprobante es válido para efectos fiscales y académicos', 50, yPosition)
     .text('Para verificar la autenticidad del documento, escanee el código QR', 50, yPosition + 12)
     .text(`Generado el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}`, 50, yPosition + 24);

  doc.text('AcademiQ - Sistema de Gestión Educativa', 350, yPosition + 24);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✅ Recibo generado: ${outputPath}`);
      resolve(outputPath);
    });
    stream.on('error', reject);
  });
}

async function main() {
  try {
    console.log('🔧 Generando recibo #17 para Andrea Cebreros Contreras...');
    
    const paymentData = {
      id: 17,
      studentName: 'Andrea Cebreros Contreras',
      level: 'Preparatoria',
      concept: 'Colegiatura Mensual',
      amount: 5000,
      paymentDate: '1 de junio de 2025',
      paymentMethod: 'Tarjeta de crédito/débito',
      reference: 'pi_AndreaSimulado',
      observations: 'Pago simulado para generación de informe académico. Procesado correctamente por el sistema AcademiQ.'
    };

    const pdfPath = await generateStandardReceipt(paymentData);
    console.log('✅ Recibo completado exitosamente');
    console.log(`📁 Archivo disponible en: /recibos/recibo_17.pdf`);
    console.log(`🔗 URL de validación: ${generarURLValidacion(paymentData.id)}`);
  } catch (error) {
    console.error('❌ Error generando recibo:', error);
    process.exit(1);
  }
}

main();