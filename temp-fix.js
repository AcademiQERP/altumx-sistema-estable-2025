// Función para el manejo de calificaciones tradicionales
// Reemplazar criterioId 0 con "Calificación General" en lugar de "Desconocido"

function processGrades(gradesByCriteria, criteriaMap) {
  const formattedGrades = Object.entries(gradesByCriteria).map(([criterioId, grade]) => {
    const criterio = criteriaMap.get(parseInt(criterioId));
    let rubroNombre = 'Desconocido';
    
    if (criterio) {
      rubroNombre = criterio.nombre;
    } else if (grade.criterioId === 0) {
      rubroNombre = 'Calificación General';
    }
    
    return {
      id: grade.id,
      alumnoId: grade.alumnoId,
      materiaId: grade.materiaId,
      criterioId: grade.criterioId,
      rubro: rubroNombre,
      valor: Number(grade.valor),
      periodo: grade.periodo,
      observaciones: grade.observaciones
    };
  });
  
  return formattedGrades;
}