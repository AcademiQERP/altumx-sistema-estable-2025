/**
 * Generate Receipt #17 with Official SISTEMA EDUCATIVO ALTUM Format
 * Matches exactly the design and layout of recibo_13.pdf
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const QRCode = require('qrcode');

// Generate secure HMAC-SHA256 token using the exact same method as the system
function generarTokenSeguro(pagoId) {
  const secretKey = 'academiq-qr-secret-2025';
  return crypto.createHmac('sha256', secretKey).update(pagoId.toString()).digest('hex');
}

// Generate validation URL with correct format
function generarURLValidacion(pagoId) {
  const token = generarTokenSeguro(pagoId);
  const baseUrl = 'https://b6b54b41-1576-4f1a-a2d6-a0641b3572d0-00-3fqsaxdymujt.riker.replit.dev';
  return `${baseUrl}/validar?id=${pagoId}&token=${token}`;
}

/**
 * Generate receipt using the official SISTEMA EDUCATIVO ALTUM template
 */
async function generateOfficialReceipt(paymentData) {
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
    
    doc.text(paymentData.emissonDate, 400, yPosition);

    // === STUDENT INFORMATION ===
    yPosition += 40;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('INFORMACIÓN DEL ESTUDIANTE', 50, yPosition);

    yPosition += 20;
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('Nombre del alumno:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.studentName, 170, yPosition);

    yPosition += 15;
    doc.font('Helvetica-Bold')
       .text('ID del estudiante:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.studentId.toString(), 170, yPosition);

    yPosition += 15;
    doc.font('Helvetica-Bold')
       .text('Padre/Madre/Tutor:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.tutorName, 170, yPosition);

    // === PAYMENT INFORMATION ===
    yPosition += 40;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('INFORMACIÓN DEL PAGO', 50, yPosition);

    // QR Code positioning (aligned with payment info section)
    const qrX = 450;
    const qrY = yPosition + 20;
    doc.image(qrCodeBuffer, qrX, qrY, { width: 80, height: 80 });

    yPosition += 25;
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('Fecha de pago:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.paymentDate, 170, yPosition);

    yPosition += 15;
    doc.font('Helvetica-Bold')
       .text('Método de pago:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.paymentMethod, 170, yPosition);

    yPosition += 15;
    doc.font('Helvetica-Bold')
       .text('Referencia:', 50, yPosition);
    
    doc.font('Helvetica')
       .text(paymentData.reference, 170, yPosition);

    // QR code label and validation message
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

    // === PAYMENT DETAILS ===
    yPosition += 60;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('DETALLE DEL PAGO', 50, yPosition);

    yPosition += 25;
    // Table headers
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('Concepto', 50, yPosition)
       .text('Descripción', 200, yPosition)
       .text('Monto', 450, yPosition);

    yPosition += 20;
    doc.font('Helvetica')
       .text(paymentData.concept, 50, yPosition)
       .text(paymentData.description, 200, yPosition)
       .text(`$${paymentData.amount.toLocaleString()}`, 450, yPosition);

    yPosition += 40;
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('Total Pagado:', 350, yPosition);
    
    doc.fontSize(14)
       .text(`$${paymentData.amount.toLocaleString()}`, 450, yPosition);

    // === OBSERVATIONS ===
    yPosition += 50;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('OBSERVACIONES', 50, yPosition);

    yPosition += 20;
    doc.fontSize(11)
       .font('Helvetica')
       .text(paymentData.observations, 50, yPosition);

    yPosition += 40;
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#999999')
       .text('Espacio reservado para sello digital o validación administrativa', 50, yPosition, { 
         align: 'center',
         style: 'italic'
       });

    // === FOOTER ===
    yPosition = 720;
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#000000')
       .text('Este documento es un comprobante de pago oficial emitido por Sistema Educativo Altum.', 50, yPosition, { align: 'center' });
    
    yPosition += 15;
    doc.fontSize(9)
       .fillColor('#666666')
       .text('Para cualquier aclaración favor de comunicarse a admin@altum.edu.mx', 50, yPosition, { align: 'center' });
    
    yPosition += 12;
    doc.text('Recibo generado automáticamente con tecnología de AcademiQ (https://academiq.mx)', 50, yPosition, { align: 'center' });

    doc.end();
  });
}

async function main() {
  try {
    console.log('🔧 Regenerando recibo #17 con formato oficial SISTEMA EDUCATIVO ALTUM...');
    
    const paymentData = {
      id: 17,
      studentName: 'Andrea Cebreros Contreras',
      studentId: 4,
      tutorName: 'Fernando Cebreros Beltrán',
      emissonDate: '1 de junio de 2025, 12:00 AM',
      paymentDate: '1 de junio de 2025',
      paymentMethod: 'Tarjeta de Crédito/Débito',
      reference: 'pi_AndreaSimulado',
      concept: 'Colegiatura Mensual',
      description: 'Colegiatura mensual ciclo 2025-2026',
      amount: 5000,
      observations: 'Pago de colegiatura para Andrea Cebreros Contreras'
    };

    const pdfPath = await generateOfficialReceipt(paymentData);
    console.log('✅ Recibo oficial regenerado exitosamente');
    console.log(`📁 Archivo disponible en: /recibos/recibo_17.pdf`);
    console.log(`🔗 URL de validación: ${generarURLValidacion(paymentData.id)}`);
  } catch (error) {
    console.error('❌ Error regenerando recibo oficial:', error);
    process.exit(1);
  }
}

main();