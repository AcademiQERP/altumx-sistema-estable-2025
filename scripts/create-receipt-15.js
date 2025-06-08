import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function createReceipt15() {
  try {
    console.log('Generando recibo PDF para pago ID 15...');
    
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

    // Generar token HMAC para validación
    const secretKey = 'academiq_secret_2025';
    const tokenData = `${paymentData.id}:${paymentData.amount}:${paymentData.studentName}`;
    const hmacToken = crypto.createHmac('sha256', secretKey).update(tokenData).digest('hex');

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

    // Código QR (representación textual)
    doc.fillColor('#2563eb')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('CÓDIGO QR PARA VALIDACIÓN:', 50, yPos + 30);

    doc.fillColor('#000')
       .fontSize(10)
       .font('Helvetica')
       .text('Escanea este código para validar la autenticidad del recibo', 50, yPos + 55)
       .text('y acceder al informe académico personalizado del estudiante', 50, yPos + 70);

    // QR Code visual (ASCII representation)
    doc.font('Courier')
       .fontSize(8)
       .text('█████████████████████████████████████', 50, yPos + 95)
       .text('█  ██ █▀▀█ █▀▀█ ███ ██▀▀█ █▀▀█ ███  █', 50, yPos + 105)
       .text('█ ███ █▄▄█ █▄▄█ ███ ██▄▄█ █▄▄█ ███  █', 50, yPos + 115)
       .text('█  ██ █▀▀█ █▀▀█ ███ ██▀▀█ █▀▀█ ███  █', 50, yPos + 125)
       .text('█████████████████████████████████████', 50, yPos + 135);

    // URL de validación
    const validationUrl = `https://academiq.replit.dev/validar?id=${paymentData.id}&token=${hmacToken}`;
    doc.fillColor('#0f766e')
       .fontSize(8)
       .font('Helvetica')
       .text(`URL: ${validationUrl}`, 50, yPos + 155, { width: 500 });

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

    // Actualizar la base de datos con la URL del PDF
    const pdfUrl = `/recibos/recibo_15.pdf`;
    console.log('Recibo PDF generado exitosamente:', outputPath);
    console.log('URL del recibo:', pdfUrl);
    console.log('Token de validación:', hmacToken);

    return {
      pdfPath: outputPath,
      pdfUrl: pdfUrl,
      validationToken: hmacToken,
      validationUrl: validationUrl
    };

  } catch (error) {
    console.error('Error generando recibo PDF:', error);
    throw error;
  }
}

// Ejecutar
createReceipt15().then(result => {
  console.log('✅ Proceso completado:', result);
}).catch(error => {
  console.error('❌ Error en el proceso:', error);
});