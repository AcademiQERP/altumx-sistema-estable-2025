/**
 * Script para generar el hash SHA256 del recibo ID 12 y almacenarlo en la base de datos
 */

const { pool } = require('../server/lib/db');
const crypto = require('crypto');
const { generateReceiptPDF } = require('../server/services/receipt-generator');

async function generateAndStoreHash() {
  try {
    console.log('🔍 Obteniendo datos del recibo ID 12...');
    
    // Obtener el recibo
    const recibo = await storage.getPayment(12);
    if (!recibo) {
      console.error('❌ Recibo no encontrado');
      return;
    }

    // Obtener el estudiante
    const estudiante = await storage.getStudent(recibo.alumnoId);
    if (!estudiante) {
      console.error('❌ Estudiante no encontrado');
      return;
    }

    console.log(`📄 Procesando recibo: $${recibo.monto} para ${estudiante.nombreCompleto}`);

    // Generar el PDF
    const pdfBuffer = await generateReceiptPDF(recibo, estudiante);

    // Calcular hash SHA256
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    console.log(`🔐 Hash SHA256 generado: ${hash.substring(0, 16)}...`);

    // Almacenar en la base de datos
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO document_integrity (document_type, document_id, file_path, sha256_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (document_type, document_id)
        DO UPDATE SET 
          sha256_hash = EXCLUDED.sha256_hash,
          updated_at = NOW()
      `, ['receipt', recibo.id, `/receipts/receipt-${recibo.id}.pdf`, hash]);

      console.log('✅ Hash almacenado correctamente en la base de datos');
    } finally {
      client.release();
    }

    // Verificar que funciona
    const verification = await client.query(`
      SELECT * FROM document_integrity 
      WHERE document_type = $1 AND document_id = $2
    `, ['receipt', recibo.id]);

    if (verification.rows.length > 0) {
      console.log('✅ Verificación exitosa: Hash encontrado en la base de datos');
      console.log(`🎯 Ahora puede probar la validación completa en:`);
      console.log(`https://academiq.replit.dev/validar?id=12&token=02f7f1c0904507b6dd3a57f29d0f56fffd5acf4de7852c3c8c7610a088140178`);
    } else {
      console.log('❌ Error: Hash no encontrado después de la inserción');
    }

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  }
}

generateAndStoreHash();