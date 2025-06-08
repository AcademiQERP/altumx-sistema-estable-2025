import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Genera un PDF de prueba con PDFKit para validar la configuración
 */
function generateTestReceipt() {
  // Crear directorio si no existe
  const receiptDir = path.join(process.cwd(), 'public', 'recibos');
  if (!fs.existsSync(receiptDir)) {
    fs.mkdirSync(receiptDir, { recursive: true });
  }
  
  // Definir archivo de salida
  const filePath = path.join(receiptDir, 'recibo_5.pdf');
  
  // Crear un stream para escribir el PDF
  const writeStream = fs.createWriteStream(filePath);
  writeStream.on('finish', () => {
    console.log(`PDF generado exitosamente en: ${filePath}`);
  });
  
  writeStream.on('error', (err) => {
    console.error('Error al escribir el PDF:', err);
  });
  
  // Crear un nuevo documento PDF
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4'
  });
  
  // Pipe el documento al stream de escritura
  doc.pipe(writeStream);
  
  // Añadir contenido al PDF
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('SISTEMA EDUCATIVO ALTUM', { align: 'center' });
  
  doc.moveDown(0.5);
  doc.fontSize(16)
     .text('RECIBO DE PAGO', { align: 'center' });
  
  doc.moveDown(0.5);
  doc.fontSize(10)
     .font('Helvetica')
     .text('Calle Principal #123, Ciudad de México', { align: 'center' })
     .text('RFC: ALTUM123456XYZ', { align: 'center' });
  
  // Línea horizontal
  doc.moveDown(1);
  doc.lineWidth(1)
     .lineCap('butt')
     .strokeColor('#cccccc')
     .moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke();
  
  // Información del recibo
  doc.moveDown(1);
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text(`RECIBO NO: 5`, { align: 'left' });
  
  doc.fontSize(10)
     .font('Helvetica')
     .text(`FECHA DE EMISIÓN: 15 de abril, 2025, 6:52 PM`, { align: 'right' });
  
  // Información del estudiante
  doc.moveDown(1);
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('INFORMACIÓN DEL ESTUDIANTE');
  
  doc.moveDown(0.5);
  doc.fontSize(10)
     .font('Helvetica')
     .text(`Nombre: Alexa Fernanda Cebreros Contreras`)
     .text(`ID Estudiante: 2`);
  
  // Información del pago
  doc.moveDown(1);
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('INFORMACIÓN DEL PAGO');
  
  doc.moveDown(0.5);
  doc.fontSize(10)
     .font('Helvetica')
     .text(`Fecha de pago: 15 de abril, 2025`)
     .text(`Método de pago: Transferencia`)
     .text(`Referencia: ABC12345`);
  
  // Tabla de concepto y monto
  doc.moveDown(1);
  
  // Cabecera de la tabla
  doc.fontSize(12)
     .font('Helvetica-Bold');
     
  const tableTop = doc.y;
  const tableWidth = doc.page.width - 100;
  const conceptoWidth = tableWidth * 0.4;
  const descripcionWidth = tableWidth * 0.4;
  const montoWidth = tableWidth * 0.2;
  
  // Dibuja cabecera de tabla
  doc.fillColor('#2980b9')
     .rect(50, tableTop, tableWidth, 20)
     .fill();
     
  doc.fillColor('white')
     .text('Concepto', 60, tableTop + 5, { width: conceptoWidth, align: 'left' })
     .text('Descripción', 60 + conceptoWidth, tableTop + 5, { width: descripcionWidth, align: 'left' })
     .text('Monto', 60 + conceptoWidth + descripcionWidth, tableTop + 5, { width: montoWidth, align: 'right' });
  
  // Fila de datos
  doc.fillColor('black')
     .font('Helvetica')
     .fontSize(10);
  
  const dataRowY = tableTop + 25;
  doc.text('Mensualidad Abril', 60, dataRowY, { width: conceptoWidth, align: 'left' })
     .text('Pago correspondiente al mes de abril 2025', 60 + conceptoWidth, dataRowY, { width: descripcionWidth, align: 'left' })
     .text('$ 2,500.00 MXN', 60 + conceptoWidth + descripcionWidth, dataRowY, { width: montoWidth, align: 'right' });
  
  // Línea horizontal
  doc.moveDown(3);
  doc.lineWidth(1)
     .lineCap('butt')
     .strokeColor('#cccccc')
     .moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke();
  
  // Total
  doc.moveDown(1);
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Total', doc.page.width - 150, doc.y, { width: 100, align: 'left' })
     .text('$ 2,500.00 MXN', { width: 100, align: 'right' });
  
  // Pie de página
  doc.moveDown(2);
  doc.fontSize(9)
     .font('Helvetica-Oblique')
     .text('Este documento es un comprobante de pago oficial.', { align: 'center' })
     .text('Para cualquier aclaración favor de comunicarse a admin@altum.edu.mx', { align: 'center' });
  
  // Finalizar el documento PDF
  doc.end();
}

// Ejecutar la función
generateTestReceipt();

console.log('Iniciando generación de PDF de prueba...');