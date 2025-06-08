-- SQL para crear la tabla eventos_agenda
CREATE TABLE IF NOT EXISTS "eventos_agenda" (
  "id" SERIAL PRIMARY KEY,
  "estudiante_id" INTEGER NOT NULL REFERENCES "alumnos"("id"),
  "fecha" DATE NOT NULL,
  "hora" TEXT,
  "titulo" TEXT NOT NULL,
  "tipo" TEXT CHECK ("tipo" IN ('tarea', 'reunion', 'pago', 'evaluacion', 'actividad')) NOT NULL,
  "descripcion" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);