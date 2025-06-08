import { useState, useEffect, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Save, RefreshCcw, AlertCircle, Eye, FileDown, CheckCircle2 } from "lucide-react";
import { Student, EvaluationCriteria, CriteriaGrade } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Definición de tipos
interface CriteriaGradesTableProps {
  groupId: number;
  subjectId: number;
  groupName?: string;
  subjectName?: string;
  students: Student[];
  criteriaGrades: CriteriaGrade[];
  criteria: EvaluationCriteria[];
  isLoading: boolean;
  onRefetch: () => void;
}

// Tipo para el valor de calificación
type GradeValue = {
  id?: number;
  valor: string | null;
  observaciones: string | null;
};

// Tipo para actualización de calificación por criterio
type CriteriaGradeUpdate = {
  id?: number;
  alumnoId: number;
  materiaId: number;
  criterioId: number;
  valor: string | null;
  periodo: string;
  observaciones: string | null;
};

export default function CriteriaGradesTable({
  groupId,
  subjectId,
  groupName = "Grupo",
  subjectName = "Materia",
  students,
  criteriaGrades,
  criteria,
  isLoading,
  onRefetch
}: CriteriaGradesTableProps) {
  // Estado para el período seleccionado
  const [periodo, setPeriodo] = useState<string>("1er Trimestre");
  
  // Estado para los campos modificados
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  
  // Estado para errores de validación
  const [outOfRangeFields, setOutOfRangeFields] = useState<Set<string>>(new Set());
  const [emptyFields, setEmptyFields] = useState<Set<string>>(new Set());
  const [duplicateFields, setDuplicateFields] = useState<Set<string>>(new Set());
  const [hasInvalidGrades, setHasInvalidGrades] = useState<boolean>(false);
  
  // Toast para notificaciones
  const { toast } = useToast();

  // Obtener períodos disponibles de las calificaciones existentes
  const periodos = useMemo(() => {
    const periodosSet = new Set(criteriaGrades.map(g => g.periodo));
    return Array.from(periodosSet).sort();
  }, [criteriaGrades]);

  // Si no hay períodos, usar valores predeterminados
  useEffect(() => {
    if (periodos.length > 0 && !periodos.includes(periodo)) {
      setPeriodo(periodos[0]);
    }
  }, [periodos, periodo]);

  // Organizar calificaciones por estudiante y criterio
  const studentGrades = useMemo(() => {
    const gradeMap = new Map<number, Map<number, GradeValue>>();
    
    // Inicializar mapa para cada estudiante
    students.forEach(student => {
      const criteriaMap = new Map<number, GradeValue>();
      gradeMap.set(student.id, criteriaMap);
    });
    
    // Llenar con calificaciones existentes para el período actual
    criteriaGrades.forEach(grade => {
      if (grade.periodo === periodo) {
        const studentMap = gradeMap.get(grade.alumnoId);
        if (studentMap) {
          studentMap.set(grade.criterioId, {
            id: grade.id,
            valor: grade.valor,
            observaciones: grade.observaciones
          });
        }
      }
    });
    
    // Mostrar periodo actual en consola para referencia
    console.log("Periodo académico actual:", periodo);
    
    return gradeMap;
  }, [students, criteriaGrades, periodo]);

  // Manejar cambio de calificación
  const handleGradeChange = (
    studentId: number,
    criterioId: number,
    value: string | null,
    observaciones: string | null
  ) => {
    // Actualizar mapa de calificaciones
    const studentMap = studentGrades.get(studentId);
    if (studentMap) {
      const existingGrade = studentMap.get(criterioId);
      if (existingGrade) {
        // Actualizar calificación existente
        studentMap.set(criterioId, {
          ...existingGrade,
          valor: value,
          observaciones
        });
      } else {
        // Crear nueva calificación
        studentMap.set(criterioId, {
          valor: value,
          observaciones
        });
      }
    }
    
    // Marcar como modificado
    const fieldId = `${studentId}-${criterioId}`;
    setDirtyFields(prev => {
      const newDirtyFields = new Set(prev);
      newDirtyFields.add(fieldId);
      return newDirtyFields;
    });
  };

  // Validar calificaciones
  useEffect(() => {
    // Conjuntos para almacenar campos con errores
    const newOutOfRangeFields = new Set<string>();
    const newEmptyFields = new Set<string>();
    const newDuplicateFields = new Set<string>();
    
    // Recorrer campos modificados
    dirtyFields.forEach(fieldId => {
      const [studentId, criterioId] = fieldId.split('-').map(Number);
      const studentMap = studentGrades.get(studentId);
      
      if (studentMap) {
        const grade = studentMap.get(criterioId);
        
        if (grade) {
          // Verificar si está vacío cuando debería tener valor
          if (!grade.valor && grade.valor !== '0') {
            newEmptyFields.add(fieldId);
          } 
          // Verificar rango válido (0-10 o 0-100 según configuración)
          else {
            const valor = Number(grade.valor);
            // Encontrar criterio correspondiente para validar rangos
            const criterio = criteria.find(c => c.id === criterioId);
            const maxValue = criterio?.escala === '1-10' ? 10 : 100;
            
            if (isNaN(valor) || valor < 0 || valor > maxValue) {
              newOutOfRangeFields.add(fieldId);
            }
          }
        }
      }
    });
    
    // Actualizar estados de validación
    setOutOfRangeFields(newOutOfRangeFields);
    setEmptyFields(newEmptyFields);
    setDuplicateFields(newDuplicateFields);
    
    // Determinar si hay errores de validación
    setHasInvalidGrades(
      newOutOfRangeFields.size > 0 || 
      newEmptyFields.size > 0 || 
      newDuplicateFields.size > 0
    );
    
  }, [studentGrades, dirtyFields, criteriaGrades, periodo, criteria]);

  // Mutación para guardar calificaciones en lote
  const saveBatchGrades = useMutation({
    mutationFn: async (updates: CriteriaGradeUpdate[]) => {
      console.log("📝 Enviando actualizaciones de criterios al endpoint:", { endpoint: "/api/grades-criteria/batch", updates });
      
      // Verificar token antes de enviar
      const token = localStorage.getItem("auth_token");
      console.log(`🔑 Token disponible para actualización:`, token ? "Sí" : "No");
      if (token) {
        console.log(`🔑 Token parcial para actualización:`, token.substring(0, 10) + "...");
      }
      
      // Mostrar toast de guardando antes de la petición
      toast({
        title: "Guardando cambios...",
        description: `Procesando ${updates.length} calificaciones`,
        className: "bg-blue-50 border-blue-200",
      });
      
      const response = await apiRequest("PUT", "/api/grades-criteria/batch", { gradesData: updates });
      if (!response.ok) {
        console.error(`❌ Error en la respuesta: ${response.status} ${response.statusText}`);
        console.error("Detalles:", await response.text());
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Toast de éxito con animación y más detalles
      toast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>Calificaciones guardadas correctamente</span>
          </div>
        ),
        description: (
          <div className="text-sm">
            <p className="text-green-700">Se actualizaron {variables.length} calificaciones</p>
            <p className="text-xs mt-1 text-green-600">Periodo: {periodo} - {new Date().toLocaleTimeString()}</p>
          </div>
        ),
        className: "bg-green-50 border-green-200 shadow-md",
        duration: 4000, // Mostrar por más tiempo
      });
      
      // Limpiar los campos modificados
      setDirtyFields(new Set());
      onRefetch();
    },
    onError: (error: any) => {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span>Error al guardar calificaciones</span>
          </div>
        ),
        description: `No se pudieron guardar las calificaciones: ${error.message}`,
        variant: "destructive",
        duration: 5000, // Mostrar por más tiempo para errores
      });
    }
  });

  // Preparar y enviar actualizaciones
  const handleSaveChanges = () => {
    // Verificar si hay errores de validación
    if (hasInvalidGrades) {
      toast({
        title: "Errores de validación",
        description: "Por favor, corrige los errores antes de guardar.",
        variant: "destructive",
      });
      return;
    }
    
    // Crear lista de actualizaciones desde campos modificados
    const updates: CriteriaGradeUpdate[] = [];
    
    dirtyFields.forEach(fieldId => {
      const [studentId, criterioId] = fieldId.split('-').map(Number);
      const studentMap = studentGrades.get(studentId);
      
      if (studentMap) {
        const grade = studentMap.get(criterioId);
        
        if (grade) {
          updates.push({
            id: grade.id, // Puede ser undefined para nuevas calificaciones
            alumnoId: studentId,
            materiaId: subjectId,
            criterioId: criterioId,
            valor: grade.valor,
            periodo: periodo,
            observaciones: grade.observaciones
          });
        }
      }
    });
    
    // Si hay actualizaciones, enviarlas
    if (updates.length > 0) {
      saveBatchGrades.mutate(updates);
    } else {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar.",
      });
    }
  };

  // Función para renderizar la celda de calificación
  const renderGradeCell = (
    studentId: number,
    criterioId: number,
    grade: GradeValue | undefined
  ) => {
    const value = grade?.valor || '';
    const observaciones = grade?.observaciones || null;
    const fieldId = `${studentId}-${criterioId}`;
    const isDirty = dirtyFields.has(fieldId);
    
    // Verificar errores de validación
    const hasOutOfRangeError = outOfRangeFields.has(fieldId);
    const hasEmptyError = emptyFields.has(fieldId);
    const hasDuplicateError = duplicateFields.has(fieldId);
    const hasError = hasOutOfRangeError || hasEmptyError || hasDuplicateError;
    
    // Encontrar criterio para determinar escala
    const criterio = criteria.find(c => c.id === criterioId);
    const escala = criterio?.escala || '1-10';
    const placeholder = escala === '1-10' ? '0-10' : '0-100';
    
    // Clases para estilos según el estado
    let inputClasses = "w-16 text-center border rounded focus:outline-none focus:ring-1 p-1 transition-all duration-150 ";
    if (hasError) {
      inputClasses += "border-red-500 bg-red-50 focus:ring-red-500 ";
    } else if (isDirty) {
      inputClasses += "border-amber-300 bg-amber-50 focus:ring-amber-500 animate-pulse ";
    } else {
      inputClasses += "border-gray-200 focus:ring-blue-300 ";
    }
    
    // Determinar el mensaje de error para el tooltip
    let errorMessage = '';
    if (hasOutOfRangeError) {
      errorMessage = `Valor fuera de rango. Debe estar entre 0 y ${escala === '1-10' ? '10' : '100'}.`;
    } else if (hasEmptyError) {
      errorMessage = 'Este campo no puede estar vacío.';
    } else if (hasDuplicateError) {
      errorMessage = 'Ya existe una calificación para este criterio en este período.';
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`relative ${
              hasError ? 'bg-red-50 border border-red-100 rounded' : 
              (isDirty ? 'bg-amber-50 border border-amber-200 rounded shadow-sm' : '')
            }`}>
              <input
                type="text"
                className={inputClasses}
                value={value}
                placeholder={placeholder}
                onChange={(e) => {
                  const inputValue = e.target.value.trim();
                  if (inputValue === '') {
                    handleGradeChange(studentId, criterioId, null, observaciones);
                  } else {
                    handleGradeChange(studentId, criterioId, inputValue, observaciones);
                  }
                }}
              />
              {/* Indicador de edición activa */}
              {isDirty && !hasError && (
                <div className="absolute top-[-6px] right-[-6px]">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white" title="Editado">
                    ✏️
                  </span>
                </div>
              )}
              {/* Indicador de error */}
              {hasError && (
                <div className="absolute top-[-6px] right-[-6px]">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white" title={errorMessage}>
                    !
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {hasError ? (
              <div>
                <p className="text-sm font-medium text-red-600">{errorMessage}</p>
                <p className="text-xs mt-1">La calificación debe estar entre 0 y {escala === '1-10' ? '10' : '100'}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">
                  {isDirty ? 'Cambio pendiente de guardar' : 'Calificación guardada'}
                </p>
                {isDirty && (
                  <p className="text-xs mt-1">
                    Haz clic en "Guardar Cambios" para aplicar
                  </p>
                )}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  // Renderizar la tabla de calificaciones por criterio
  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium">Calificaciones por Criterio</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefetch}
            disabled={saveBatchGrades.isPending}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          
          {/* Botón de exportar a Excel (placeholder) */}
          <Button
            variant="outline"
            size="sm"
            disabled
            className="opacity-70 cursor-not-allowed"
            title="Próximamente disponible"
          >
            <span className="flex items-center">
              📥 Exportar a Excel
            </span>
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSaveChanges}
            disabled={dirtyFields.size === 0 || hasInvalidGrades || saveBatchGrades.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            Guardar Cambios
            {dirtyFields.size > 0 && ` (${dirtyFields.size})`}
          </Button>
        </div>
      </div>
      
      {/* Botón flotante para guardar (aparece cuando hay cambios) */}
      {dirtyFields.size > 0 && !hasInvalidGrades && (
        <div className="fixed bottom-6 right-6 z-50 shadow-lg rounded-lg bg-white border-2 border-primary overflow-hidden">
          <div className="px-4 py-2 bg-primary text-white font-medium">
            {dirtyFields.size} {dirtyFields.size === 1 ? 'cambio' : 'cambios'} sin guardar
          </div>
          <div className="p-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDirtyFields(new Set())}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveChanges}
              disabled={saveBatchGrades.isPending}
              className="text-xs"
            >
              {saveBatchGrades.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="h-3 w-3 mr-1" />
                  Guardar ahora
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
      
      <p className="text-muted-foreground mb-4">
        Sistema de evaluación basado en {criteria.length} criterios para {students.length} estudiantes.
        {hasInvalidGrades && (
          <span className="text-red-500 ml-2">
            Hay errores de validación que deben corregirse antes de guardar.
          </span>
        )}
      </p>
      
      {/* Indicador visible de período activo */}
      <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md flex items-center">
        <span className="mr-2">📅</span>
        <span className="font-medium">Estás editando las calificaciones del <span className="text-blue-700">{periodo}</span></span>
      </div>
      
      {periodos.length > 0 && (
        <Tabs value={periodo} onValueChange={setPeriodo} className="mb-4">
          <TabsList>
            {periodos.map(p => (
              <TabsTrigger 
                key={p} 
                value={p} 
                className={p === periodo ? "relative font-medium" : ""}
              >
                {p === periodo && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                )}
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando calificaciones...</p>
          </div>
        </div>
      ) : criteriaGrades.length === 0 ? (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay calificaciones</AlertTitle>
          <AlertDescription>
            No se encontraron calificaciones por criterio para este grupo y materia.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>
              Calificaciones por criterio de {subjectName} para {groupName} - {periodo}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Estudiante</TableHead>
                {criteria.map((criterio) => (
                  <TableHead key={criterio.id} className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            {criterio.nombre}
                            <div className="text-xs text-muted-foreground">
                              {criterio.escala}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{criterio.nombre}</p>
                          <p className="text-sm">Escala: {criterio.escala}</p>
                          <p className="text-sm">Peso: {criterio.peso}%</p>
                          <p className="text-sm text-muted-foreground">{criterio.descripcion}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-between">
                      <span>{student.nombreCompleto}</span>
                      {/* Botón Ver historial por alumno (placeholder para funcionalidad futura) */}
                      <Button
                        variant="ghost"
                        size="sm" 
                        className="h-7 text-xs opacity-70 px-2"
                        disabled
                        title="Próximamente disponible"
                      >
                        <Eye className="h-3 w-3 mr-1" /> Ver historial
                      </Button>
                    </div>
                  </TableCell>
                  {criteria.map((criterio) => (
                    <TableCell key={criterio.id} className="text-center">
                      {renderGradeCell(
                        student.id,
                        criterio.id,
                        studentGrades.get(student.id)?.get(criterio.id)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {saveBatchGrades.isPending && (
        <div className="mt-4 text-center">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full inline-block mr-2"></div>
          <span className="text-sm text-muted-foreground">Guardando calificaciones...</span>
        </div>
      )}
      
      {dirtyFields.size > 0 && !saveBatchGrades.isPending && (
        <div className="mt-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 inline-block mr-1" />
          Hay cambios pendientes de guardar. Haz clic en "Guardar Cambios" para aplicarlos.
        </div>
      )}
    </div>
  );
}