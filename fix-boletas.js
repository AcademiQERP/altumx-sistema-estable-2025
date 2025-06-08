// Implementación para manejar tanto calificaciones tradicionales como calificaciones por criterio
// En calificaciones tradicionales (criterioId: 0), mostrar "Calificación General" en lugar de "Desconocido"

app.get(`${API_PREFIX}/report-cards/:id`, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    
    // Obtener información del estudiante
    const student = await storage.getStudent(studentId);
    if (!student) {
      return res.status(404).json({ message: "Estudiante no encontrado" });
    }
    
    // Obtener el grupo al que pertenece el estudiante
    const grupo = student.grupoId;
    console.log(`📊 Generando boleta académica para estudiante ${studentId} (${student.nombreCompleto}) del grupo ${grupo}`);
    
    // Obtener todas las asignaciones de materias para el grupo del estudiante
    const asignaciones = await storage.getSubjectAssignmentsByGroup(grupo);
    
    // Eliminar asignaciones duplicadas (mismo ID de materia)
    const materiasUnicas = new Map();
    asignaciones.forEach(asignacion => {
      if (!materiasUnicas.has(asignacion.materiaId)) {
        materiasUnicas.set(asignacion.materiaId, asignacion);
      }
    });
    
    const materiasIds = Array.from(materiasUnicas.keys());
    console.log(`📚 Materias únicas asignadas al grupo ${grupo}: ${materiasIds.join(', ')}`);
    
    // Obtener todas las materias para mapear IDs a nombres
    const subjects = await storage.getSubjects();
    const subjectsMap = new Map(subjects.map(s => [s.id, s]));
    
    // Obtener asistencia
    const attendance = await storage.getAttendanceByStudent(studentId);
    
    // Para cada materia, obtener las calificaciones
    const reportCard = [];
    
    for (const materiaId of materiasIds) {
      const materia = subjectsMap.get(materiaId);
      if (!materia) continue;
      
      // Obtener criterios de evaluación para esta materia y grupo
      const criteriosAsignados = await storage.getCriteriaAssignmentsByGroupAndSubject(grupo, materiaId);
      const criteriosIds = criteriosAsignados.map(ca => ca.criterioId);
      console.log(`🔍 Criterios asignados para materia ${materiaId}: ${criteriosIds.join(', ')}`);
      
      // Obtener todos los criterios
      const allCriteria = await storage.getEvaluationCriteria();
      const criteriaMap = new Map(allCriteria.map(c => [c.id, c]));
      
      // Obtener calificaciones por criterio para este estudiante y materia
      const criteriaGrades = await storage.getCriteriaGradesByStudentAndSubject(studentId, materiaId);
      
      console.log(`🔍 Buscando calificaciones por criterio para estudiante ${studentId} y materia ${materiaId}`);
      if (criteriaGrades.length > 0) {
        console.log(`✅ Encontradas ${criteriaGrades.length} calificaciones por criterio`);
      } else {
        console.log(`⚠️ No se encontraron calificaciones por criterio para estudiante ${studentId} y materia ${materiaId}`);
        
        // Si no hay calificaciones por criterio, buscar calificaciones tradicionales
        console.log(`🔍 Buscando calificaciones tradicionales para estudiante ${studentId} y materia ${materiaId}`);
        
        // Obtener todas las calificaciones del estudiante y filtrar por materia
        const allGrades = await storage.getGradesByStudent(studentId);
        const traditionalGrades = allGrades.filter(grade => grade.materiaId === materiaId);
        
        if (traditionalGrades && traditionalGrades.length > 0) {
          console.log(`✅ Encontradas ${traditionalGrades.length} calificaciones tradicionales`);
          
          // Convertir las calificaciones tradicionales a formato de criterio para procesarlas igual
          traditionalGrades.forEach(grade => {
            if (!criteriaGrades.find(cg => cg.periodo === grade.periodo)) {
              criteriaGrades.push({
                id: grade.id,
                alumnoId: grade.alumnoId,
                materiaId: grade.materiaId,
                criterioId: 0, // Asignamos 0 como ID de criterio para indicar que es calificación tradicional
                rubro: grade.rubro || "Calificación General",
                valor: grade.valor,
                periodo: grade.periodo,
                observaciones: ""
              });
            }
          });
          
          console.log(`📝 Total de calificaciones disponibles después de combinar: ${criteriaGrades.length}`);
        } else {
          console.log(`⚠️ No se encontraron calificaciones tradicionales para estudiante ${studentId} y materia ${materiaId}`);
        }
      }
      
      console.log(`📝 Calificaciones encontradas: ${criteriaGrades.length}`);
      
      // Organizar calificaciones por periodo
      const gradesByPeriod = {};
      
      criteriaGrades.forEach(grade => {
        const period = grade.periodo;
        if (!gradesByPeriod[period]) {
          gradesByPeriod[period] = [];
        }
        gradesByPeriod[period].push(grade);
      });
      
      // Calcular promedios por periodo, conservando la información de cada criterio
      const periodAverages = Object.entries(gradesByPeriod).map(([period, grades]) => {
        // Agrupar calificaciones por criterio
        const gradesByCriteria = {};
        grades.forEach(grade => {
          gradesByCriteria[grade.criterioId] = grade;
        });
        
        // Transformar a formato requerido
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
        
        // Calcular promedio del periodo
        const totalValue = formattedGrades.reduce((sum, grade) => sum + Number(grade.valor), 0);
        const average = formattedGrades.length > 0 ? totalValue / formattedGrades.length : 0;
        
        return {
          period,
          average: Math.round(average * 10) / 10, // Redondear a 1 decimal
          grades: formattedGrades
        };
      });
      
      reportCard.push({
        subject: materia,
        periods: periodAverages
      });
    }
    
    // Calcular estadísticas de asistencia
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.asistencia).length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    const result = {
      student,
      reportCard,
      attendance: {
        total: totalDays,
        present: presentDays,
        percentage: attendancePercentage
      }
    };
    
    console.log(`✅ Boleta académica generada correctamente para estudiante ${studentId}`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error al generar boleta académica:", error);
    res.status(500).json({ message: "Error al generar boleta académica", error: error.message });
  }
});