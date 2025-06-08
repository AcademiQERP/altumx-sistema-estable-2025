/**
 * Servicio de integridad de documentos
 * Propósito: Calcular y verificar hashes SHA256 para detectar modificaciones en PDFs
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pool } from '../db';

export interface DocumentIntegrityRecord {
  id: number;
  document_type: string;
  document_id: number;
  file_path: string;
  sha256_hash: string;
  created_at: Date;
  updated_at: Date;
}

export class DocumentIntegrityService {
  
  /**
   * Calcula el hash SHA256 de un archivo
   */
  static async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Registra el hash de integridad de un documento
   */
  static async storeDocumentHash(
    documentType: string,
    documentId: number,
    filePath: string,
    fullPath: string
  ): Promise<void> {
    try {
      const sha256Hash = await this.calculateFileHash(fullPath);
      
      // Insertar registro de integridad (permitir duplicados para historial)
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO document_integrity (document_type, document_id, file_path, sha256_hash)
          VALUES ($1, $2, $3, $4)
        `, [documentType, documentId, filePath, sha256Hash]);
      } finally {
        client.release();
      }
      
      console.log(`✅ Hash de integridad almacenado para ${documentType} ${documentId}: ${sha256Hash.substring(0, 16)}...`);
    } catch (error) {
      console.error(`❌ Error almacenando hash de integridad:`, error);
      throw error;
    }
  }

  /**
   * Verifica la integridad de un documento comparando hashes
   */
  static async verifyDocumentIntegrity(
    documentType: string,
    documentId: number
  ): Promise<{
    isValid: boolean;
    storedHash?: string;
    currentHash?: string;
    filePath?: string;
    error?: string;
  }> {
    try {
      // Obtener el hash almacenado
      const client = await pool.connect();
      let result;
      try {
        result = await client.query(`
          SELECT file_path, sha256_hash, created_at
          FROM document_integrity 
          WHERE document_type = $1 AND document_id = $2
          ORDER BY created_at DESC 
          LIMIT 1
        `, [documentType, documentId]);
      } finally {
        client.release();
      }

      if (result.rows.length === 0) {
        return {
          isValid: false,
          error: 'No se encontró registro de integridad para este documento'
        };
      }

      const record = result.rows[0] as any;
      const storedHash = record.sha256_hash;
      const relativePath = record.file_path;
      
      // Construir la ruta completa del archivo
      const fullPath = path.join(process.cwd(), 'public', relativePath);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(fullPath)) {
        return {
          isValid: false,
          storedHash,
          filePath: relativePath,
          error: 'El archivo original no existe en el servidor'
        };
      }

      // Calcular el hash actual del archivo
      const currentHash = await this.calculateFileHash(fullPath);
      
      // Comparar hashes
      const isValid = storedHash === currentHash;
      
      console.log(`🔍 Verificación de integridad ${documentType} ${documentId}:`);
      console.log(`   Hash almacenado: ${storedHash.substring(0, 16)}...`);
      console.log(`   Hash actual:     ${currentHash.substring(0, 16)}...`);
      console.log(`   Estado: ${isValid ? 'VÁLIDO' : 'MODIFICADO'}`);
      
      return {
        isValid,
        storedHash,
        currentHash,
        filePath: relativePath
      };
      
    } catch (error) {
      console.error(`❌ Error verificando integridad:`, error);
      return {
        isValid: false,
        error: `Error interno: ${(error as Error).message}`
      };
    }
  }

  /**
   * Obtiene todos los registros de integridad para un tipo de documento
   */
  static async getIntegrityRecords(documentType: string): Promise<DocumentIntegrityRecord[]> {
    try {
      const client = await pool.connect();
      let result;
      try {
        result = await client.query(`
          SELECT * FROM document_integrity 
          WHERE document_type = $1
          ORDER BY created_at DESC
        `, [documentType]);
      } finally {
        client.release();
      }

      return result.rows as DocumentIntegrityRecord[];
    } catch (error) {
      console.error(`❌ Error obteniendo registros de integridad:`, error);
      return [];
    }
  }

  /**
   * Elimina un registro de integridad
   */
  static async deleteIntegrityRecord(documentType: string, documentId: number): Promise<boolean> {
    try {
      const client = await pool.connect();
      let result;
      try {
        result = await client.query(`
          DELETE FROM document_integrity 
          WHERE document_type = $1 AND document_id = $2
        `, [documentType, documentId]);
      } finally {
        client.release();
      }

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error(`❌ Error eliminando registro de integridad:`, error);
      return false;
    }
  }
}