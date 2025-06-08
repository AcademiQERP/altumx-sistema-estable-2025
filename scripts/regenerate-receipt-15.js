import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import crypto from 'crypto';

async function regenerateReceipt15() {
  try {
    console.log('Regenerando recibo PDF para pago ID 15 con token correcto...');
    
    // Generar token usando la misma clave secreta que el sistema de validación
    const QR_SECRET = process.env.QR_SECRET || "academiq-qr-secret-2025";
    const correctToken = crypto
      .createHmac('sha256', QR_SECRET)
      .update('15')
      .digest('hex');
    
    // Datos del pago
    const paymentData = {
      id: 15,
      alumnoId: 2,
      studentName: 'Alexa Fernanda Cebreros Contreras',
      concept: 'Colegiatura Junio 2025',
      amount: 5000.00,
      paymentDate: '2025-06-01',
      paymentMethod: 'Transferencia Bancaria',
      reference: 'REF-2025-06-001',
      level: 'Preparatoria'
    };

    // Crear documento PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Configurar ruta de salida
    const outputPath = path.join(process.cwd(), 'public', 'recibos', 'recibo_15.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Encabezado
    doc.fillColor('#2563eb')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('RECIBO DE PAGO', 50, 50);

    doc.fillColor('#64748b')
       .fontSize(12)
       .font('Helvetica')
       .text('Sistema AcademiQ - Comprobante Oficial', 50, 75);

    // Información del recibo
    doc.fillColor('#000')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(`FOLIO: #${paymentData.id.toString().padStart(6, '0')}`, 50, 110);

    // Información del estudiante
    let yPos = 150;
    const receiptInfo = [
      ['ESTUDIANTE:', paymentData.studentName],
      ['NIVEL ACADÉMICO:', paymentData.level],
      ['CONCEPTO:', paymentData.concept],
      ['MONTO:', `$${paymentData.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`],
      ['FECHA DE PAGO:', paymentData.paymentDate],
      ['MÉTODO DE PAGO:', paymentData.paymentMethod],
      ['REFERENCIA:', paymentData.reference],
      ['ESTADO:', 'CONFIRMADO']
    ];

    receiptInfo.forEach(([label, value]) => {
      doc.fillColor('#64748b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(label, 50, yPos);
      
      doc.fillColor('#000')
         .font('Helvetica')
         .text(value, 200, yPos);
      
      yPos += 25;
    });

    // URL de validación con token correcto
    const baseURL = process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
    const validationUrl = `${baseURL}/validar?id=${paymentData.id}&token=${correctToken}`;
    
    // Generar código QR real
    const qrCodeBuffer = await QRCode.toBuffer(validationUrl, {
      errorCorrectionLevel: 'M',
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 120
    });

    // Código QR para validación
    doc.fillColor('#2563eb')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('CÓDIGO QR PARA VALIDACIÓN:', 50, yPos + 30);

    doc.fillColor('#000')
       .fontSize(10)
       .font('Helvetica')
       .text('Escanea este código para validar la autenticidad del recibo', 50, yPos + 55)
       .text('y acceder al informe académico personalizado del estudiante', 50, yPos + 70);

    // Insertar código QR real como imagen
    doc.image(qrCodeBuffer, 50, yPos + 95, {
      fit: [120, 120],
      align: 'left',
      valign: 'top'
    });

    // URL de validación clickeable debajo del QR
    doc.fillColor('#0f766e')
       .fontSize(8)
       .font('Helvetica')
       .text('URL: ', 50, yPos + 225)
       .fillColor('#1d4ed8')
       .text(validationUrl, 75, yPos + 225, { width: 450, link: validationUrl });

    // Pie de página
    doc.fillColor('#64748b')
       .fontSize(8)
       .font('Helvetica')
       .text(`Documento generado automáticamente el ${new Date().toLocaleDateString('es-MX')}`, 50, 720)
       .text('Sistema AcademiQ - Recibo con firma digital HMAC-SHA256', 50, 735)
       .text('Para validar la autenticidad, escanee el código QR o visite la URL proporcionada', 50, 750);

    // Finalizar documento
    doc.end();

    // Esperar a que se complete la escritura
    await new Promise((resolve) => {
      stream.on('finish', resolve);
    });

    console.log('✅ Recibo PDF regenerado exitosamente:', outputPath);
    console.log('🔗 URL de validación:', validationUrl);
    console.log('📁 URL del recibo PDF:', `/recibos/recibo_15.pdf`);

    return {
      pdfPath: outputPath,
      pdfUrl: `/recibos/recibo_15.pdf`,
      validationToken: correctToken,
      validationUrl: validationUrl
    };

  } catch (error) {
    console.error('❌ Error regenerando recibo PDF:', error);
    throw error;
  }
}

// Ejecutar
regenerateReceipt15().then(result => {
  console.log('✅ Regeneración completada:', result);
}).catch(error => {
  console.error('❌ Error en la regeneración:', error);
});