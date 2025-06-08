/**
 * Script para corregir los valores 9.5 por 10.0 en planes de recuperación
 * 
 * Este script actualiza todos los planes de recuperación existentes en la base de datos
 * para asegurar que las referencias al promedio 9.5 sean actualizadas a 10.0
 */
import pg from 'pg';
const { Pool } = pg;

// Conexión a la base de datos usando directamente la variable de entorno
// que está disponible en el entorno de Replit
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixRecoveryPlans() {
  console.log('Iniciando corrección de planes de recuperación académica...');
  const client = await pool.connect();
  
  try {
    // Obtener todos los planes existentes
    const { rows } = await client.query('SELECT id, contenido FROM recovery_plans');
    console.log(`Encontrados ${rows.length} planes de recuperación`);
    
    let plansFixed = 0;
    
    for (const row of rows) {
      let needsUpdate = false;
      let contenido = row.contenido;
      
      // Conversión previa si es necesario
      if (typeof contenido === 'string') {
        try {
          contenido = JSON.parse(contenido);
        } catch (e) {
          console.error(`Error al parsear JSON para plan ID ${row.id}:`, e);
          continue;
        }
      }
      
      // Corregir promedio en el resumen estadístico
      if (contenido.resumenEstadistico && contenido.resumenEstadistico.promedioGeneral === 9.5) {
        contenido.resumenEstadistico.promedioGeneral = 10.0;
        needsUpdate = true;
        console.log(`- Corregido promedio general del grupo en plan ${row.id}`);
      }
      
      // Recorrer estudiantes
      if (Array.isArray(contenido.estudiantes)) {
        contenido.estudiantes.forEach(estudiante => {
          // Corregir promedio del estudiante
          if (estudiante.promedio === 9.5) {
            estudiante.promedio = 10.0;
            needsUpdate = true;
            console.log(`- Corregido promedio de estudiante ${estudiante.id} en plan ${row.id}`);
          }
          
          // Corregir en materias con dificultad
          if (Array.isArray(estudiante.plan?.materiasDificultad)) {
            estudiante.plan.materiasDificultad.forEach(materia => {
              if (materia.promedio === 9.5) {
                materia.promedio = 10.0;
                needsUpdate = true;
                console.log(`- Corregido promedio de materia ${materia.nombre} para estudiante ${estudiante.id} en plan ${row.id}`);
              }
              
              // Corregir en la descripción de materias (texto)
              if (materia.descripcion && materia.descripcion.includes('9.5')) {
                materia.descripcion = materia.descripcion.replace(/9\.5/g, '10.0');
                needsUpdate = true;
                console.log(`- Corregida descripción de materia ${materia.nombre} en plan ${row.id}`);
              }
            });
          }
        });
      }
      
      // Actualizar si hay cambios
      if (needsUpdate) {
        await client.query(
          'UPDATE recovery_plans SET contenido = $1 WHERE id = $2',
          [contenido, row.id]
        );
        plansFixed++;
        console.log(`✅ Plan ${row.id} actualizado correctamente`);
      }
    }
    
    console.log(`Proceso completado. Se actualizaron ${plansFixed} de ${rows.length} planes.`);
    
  } catch (error) {
    console.error('Error al corregir planes de recuperación:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Ejecutar la función
fixRecoveryPlans().catch(console.error);