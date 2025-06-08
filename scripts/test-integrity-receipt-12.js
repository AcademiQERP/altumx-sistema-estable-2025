/**
 * Script para generar y verificar la integridad del recibo ID 12
 */

import { storage } from '../server/storage.js';
import { DocumentIntegrityService } from '../server/services/document-integrity-service.ts';
import { generateReceiptPDF } from '../server/services/receipt-generator.js';
import fs from 'fs';
import path from 'path';

async function testReceiptIntegrity() {
  try {
    console.log('🔍 Probando integridad del recibo ID 12...');

    // Obtener datos del recibo
    const recibo = await storage.getPayment(12);
    if (!recibo) {
      console.error('❌ Recibo no encontrado');
      return;
    }

    // Obtener datos del estudiante
    const estudiante = await storage.getStudent(recibo.alumnoId);
    if (!estudiante) {
      console.error('❌ Estudiante no encontrado');
      return;
    }

    console.log(`📄 Recibo encontrado: $${recibo.monto} para ${estudiante.nombreCompleto}`);

    // Generar PDF del recibo
    const pdfBuffer = await generateReceiptPDF(recibo, estudiante);
    
    // Crear directorio temporal
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPdfPath = path.join(tempDir, `receipt-${recibo.id}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    console.log('🔐 Generando hash SHA256 del PDF original...');
    
    // Almacenar hash de integridad
    const success = await DocumentIntegrityService.storeDocumentHash(
      'receipt',
      recibo.id,
      tempPdfPath,
      pdfBuffer
    );

    if (success) {
      console.log('✅ Hash almacenado correctamente');
      
      // Verificar integridad
      const verification = await DocumentIntegrityService.verifyDocumentIntegrity('receipt', recibo.id);
      console.log('🔍 Verificación:', verification);

      if (verification.isValid) {
        console.log('✅ PRUEBA 1 EXITOSA: Integridad verificada para PDF original');
      } else {
        console.log('❌ PRUEBA 1 FALLIDA: No se pudo verificar integridad');
      }
    }

    // Limpiar archivo temporal
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }

    console.log('🎯 Hash SHA256 registrado. Ahora puede probar la validación en:');
    console.log(`https://academiq.replit.dev/validar?id=${recibo.id}&token=...`);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testReceiptIntegrity();