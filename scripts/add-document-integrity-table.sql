-- Script para añadir tabla de integridad de documentos
-- Propósito: Almacenar hashes SHA256 para verificación de integridad de PDFs

CREATE TABLE IF NOT EXISTS document_integrity (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL,  -- 'receipt', 'report_card', etc.
  document_id INTEGER NOT NULL,        -- ID del documento referenciado
  file_path VARCHAR(500) NOT NULL,     -- Ruta del archivo
  sha256_hash VARCHAR(64) NOT NULL,    -- Hash SHA256 del contenido
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_document_integrity_type_id ON document_integrity(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_document_integrity_hash ON document_integrity(sha256_hash);

-- Comentarios para documentación
COMMENT ON TABLE document_integrity IS 'Almacena hashes SHA256 para verificación de integridad de documentos PDF';
COMMENT ON COLUMN document_integrity.document_type IS 'Tipo de documento: receipt, report_card, etc.';
COMMENT ON COLUMN document_integrity.document_id IS 'ID del documento en su tabla correspondiente';
COMMENT ON COLUMN document_integrity.file_path IS 'Ruta relativa del archivo desde public/';
COMMENT ON COLUMN document_integrity.sha256_hash IS 'Hash SHA256 del contenido completo del archivo PDF';