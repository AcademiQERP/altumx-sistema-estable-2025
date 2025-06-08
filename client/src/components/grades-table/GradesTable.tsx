import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Student, Grade, Subject, Group } from "@shared/schema";
import EditableGradeRow from "./EditableGradeRow";
import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, 
  Save, 
  RefreshCcw, 
  ChevronDown, 
  ChevronRight, 
  Book, 
  Calculator, 
  User,
  Search,
  ChevronUp,
  Edit,
  PlusCircle,
  Pencil,
  XCircle,
  FileText,
  Download
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// Definición de categorías de calificación
const GRADE_CATEGORIES = ["Tarea", "Participación", "Examen", "Proyecto", "Final"];

// Tipos de datos para la vista agrupada
interface GradeValue {
  id?: number;
  valor: string | null;
  comentario: string | null;
  rubro: string;
  periodo: string;
}

interface SubjectGrades {
  materiaId: number;
  materiaNombre: string;
  calificaciones: {
    [rubro: string]: GradeValue;
  };
  promedio: number;
}

// Tipo para los datos de calificaciones en formato plano (compatibilidad con vista anterior)
interface StudentGrades {
  [studentId: number]: {
    [category: string]: {
      valor: number | null;
      comentario: string | null;
    };
  };
}

interface StudentWithGrades {
  student: Student;
  subjects: {
    [materiaId: number]: SubjectGrades;
  };
  expanded: boolean;
}

// Tipo para las calificaciones modificadas que se enviarán al servidor
type GradeUpdate = {
  id?: number;
  alumnoId: number;
  materiaId: number;
  grupoId: number;
  rubro: string;
  valor: number | null;
  periodo: string;
  comentario: string | null;
};

interface GradesTableProps {
  groupId: number;
  subjectId: number;
  groupName?: string;
  subjectName?: string;
  students: Student[];
  grades: Grade[];
  isLoading: boolean;
  onRefetch: () => void;
}

export default function GradesTable({
  groupId,
  subjectId,
  groupName = "Grupo",
  subjectName = "Materia",
  students,
  grades,
  isLoading,
  onRefetch
}: GradesTableProps) {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState<string>("Primer Bimestre");
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [studentGrades, setStudentGrades] = useState<StudentGrades>({});
  
  // Estados para las diferentes validaciones
  const [hasInvalidGrades, setHasInvalidGrades] = useState(false);
  const [emptyFields, setEmptyFields] = useState<Set<string>>(new Set());
  const [outOfRangeFields, setOutOfRangeFields] = useState<Set<string>>(new Set());
  const [duplicateFields, setDuplicateFields] = useState<Set<string>>(new Set());

  // Inicializar las calificaciones por estudiante
  useEffect(() => {
    initializeGrades();
  }, [students, grades, periodo]);

  // Función para procesar las calificaciones en formato de estudiantes con materias y rubros
  const [studentsWithGrades, setStudentsWithGrades] = useState<StudentWithGrades[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const [selectedRubro, setSelectedRubro] = useState<string>("Todos");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  // Organizar las calificaciones por estudiante, materia y rubros
  const initializeGrades = () => {
    const newStudentGrades: StudentGrades = {};
    
    // Inicializar estructura con valores vacíos para retrocompatibilidad
    students.forEach(student => {
      newStudentGrades[student.id] = {};
      GRADE_CATEGORIES.forEach(category => {
        newStudentGrades[student.id][category] = {
          valor: null,
          comentario: null
        };
      });
    });

    // Llenar con las calificaciones existentes para retrocompatibilidad
    grades
      .filter(grade => grade.periodo === periodo)
      .forEach(grade => {
        if (
          grade.alumnoId in newStudentGrades && 
          grade.rubro in newStudentGrades[grade.alumnoId]
        ) {
          newStudentGrades[grade.alumnoId][grade.rubro] = {
            valor: Number(grade.valor),
            comentario: grade.comentario
          };
        }
      });

    setStudentGrades(newStudentGrades);

    // Crear nueva estructura anidada para vista expandible
    const newStudentsWithGrades: StudentWithGrades[] = [];
    
    students.forEach(student => {
      // Inicializar estudiante con sus materias
      const studentWithGrade: StudentWithGrades = {
        student,
        subjects: {},
        expanded: false
      };
      
      // Filtrar calificaciones por estudiante y agruparlas por materia
      const studentGrades = grades.filter(grade => grade.alumnoId === student.id && grade.periodo === periodo);
      
      // Agrupar por materias
      const materiaIds = [...new Set(studentGrades.map(grade => grade.materiaId))];
      
      materiaIds.forEach(materiaId => {
        // Buscar información de la materia
        const materiaNombre = subjectName || "Materia";
        
        // Calificaciones por rubro para esta materia
        const materiaGrades = studentGrades.filter(grade => grade.materiaId === materiaId);
        const gradePorRubro: {[rubro: string]: GradeValue} = {};
        
        // Organizar por rubros
        materiaGrades.forEach(grade => {
          gradePorRubro[grade.rubro] = {
            id: grade.id,
            valor: grade.valor,
            comentario: grade.comentario,
            rubro: grade.rubro,
            periodo: grade.periodo
          };
        });
        
        // Calcular promedio de la materia
        let promedio = 0;
        let count = 0;
        
        materiaGrades.forEach(grade => {
          if (grade.valor !== null) {
            promedio += Number(grade.valor);
            count++;
          }
        });
        
        if (count > 0) {
          promedio = parseFloat((promedio / count).toFixed(1));
        }
        
        // Asignar a la estructura
        studentWithGrade.subjects[materiaId] = {
          materiaId,
          materiaNombre,
          calificaciones: gradePorRubro,
          promedio
        };
      });
      
      newStudentsWithGrades.push(studentWithGrade);
    });
    
    setStudentsWithGrades(newStudentsWithGrades);
    setDirtyFields(new Set());
  };
  
  // Funciones para expandir/colapsar todos los estudiantes
  const handleExpandAll = () => {
    setExpandAll(true);
    setStudentsWithGrades(prev => 
      prev.map(studentData => ({
        ...studentData,
        expanded: true
      }))
    );
  };
  
  const handleCollapseAll = () => {
    setExpandAll(false);
    setStudentsWithGrades(prev => 
      prev.map(studentData => ({
        ...studentData,
        expanded: false
      }))
    );
  };
  
  // Función para alternar expansión de un estudiante individual
  const toggleStudentExpanded = (studentId: number) => {
    setStudentsWithGrades(prev => 
      prev.map(studentData => {
        if (studentData.student.id === studentId) {
          return {
            ...studentData,
            expanded: !studentData.expanded
          };
        }
        return studentData;
      })
    );
  };
  
  // Funciones para manejar el ordenamiento
  const handleToggleSort = () => {
    setSortOrder(prev => {
      if (prev === null) return "desc"; // primera vez, ordenar descendente (mejores primero)
      if (prev === "desc") return "asc"; // cambiar a ascendente
      return null; // volver a sin ordenar
    });
  };

  // Filtrar estudiantes por búsqueda y rubro
  const filteredStudents = useMemo(() => {
    // Paso 1: Filtrar por términos de búsqueda
    let filtered = studentsWithGrades;
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        student => student.student.nombreCompleto.toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }
    
    // Paso 2: Filtrar por rubro seleccionado
    if (selectedRubro !== "Todos") {
      filtered = filtered.filter(student => {
        // Verificar si el estudiante tiene calificaciones para este rubro
        const hasRubro = Object.values(student.subjects).some(subject => 
          subject.calificaciones[selectedRubro] !== undefined
        );
        return hasRubro;
      });
    }
    
    // Paso 3: Ordenar por promedio si se ha seleccionado un orden
    if (sortOrder !== null) {
      filtered = [...filtered].sort((a, b) => {
        const promedioA = Object.values(a.subjects).reduce((sum, subject) => sum + subject.promedio, 0) / 
                         (Object.values(a.subjects).length || 1);
        const promedioB = Object.values(b.subjects).reduce((sum, subject) => sum + subject.promedio, 0) / 
                         (Object.values(b.subjects).length || 1);
        
        // Ordenar según la dirección elegida
        return sortOrder === "asc" ? promedioA - promedioB : promedioB - promedioA;
      });
    }
    
    return filtered;
  }, [studentsWithGrades, searchQuery, selectedRubro, sortOrder]);

  // Manejar cambios en calificaciones
  const handleGradeChange = (studentId: number, category: string, value: number | null, comentario: string | null = null) => {
    setStudentGrades(prev => {
      const currentGrade = prev[studentId][category] || { valor: null, comentario: null };
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [category]: {
            valor: value,
            comentario: comentario !== null ? comentario : currentGrade.comentario
          }
        }
      };
    });
  };

  // Validar todas las calificaciones
  useEffect(() => {
    // Conjunto para acumular campos con diferentes tipos de errores
    const newOutOfRangeFields = new Set<string>();
    const newEmptyFields = new Set<string>();
    const newDuplicateFields = new Set<string>();
    
    // Validar rango de calificaciones y campos vacíos
    Object.entries(studentGrades).forEach(([studentId, gradesByCategory]) => {
      // Rastrear rubros existentes por alumno/materia/periodo
      const studentRubros = new Set<string>();
      
      Object.entries(gradesByCategory).forEach(([category, grade]) => {
        const fieldId = `${studentId}-${category}`;
        
        // Validar campos vacíos solo si están marcados como modificados
        if (dirtyFields.has(fieldId) && (grade.valor === null || grade.valor === undefined)) {
          newEmptyFields.add(fieldId);
        }
        
        // Validar rango de calificaciones
        if (grade && grade.valor !== null && (grade.valor < 0 || grade.valor > 10)) {
          newOutOfRangeFields.add(fieldId);
        }
        
        // Construir identificador único para detectar duplicados
        const rubroKey = `${studentId}-${subjectId}-${category}-${periodo}`;
        
        // Verificar si este rubro ya existe para el mismo estudiante/materia/periodo
        if (grade && grade.valor !== null) {
          if (studentRubros.has(rubroKey)) {
            newDuplicateFields.add(fieldId);
          } else {
            studentRubros.add(rubroKey);
          }
        }
      });
    });
    
    // Revisar también las calificaciones existentes en la base de datos para detectar posibles duplicados
    grades
      .filter(grade => grade.periodo === periodo)
      .forEach(grade => {
        const rubroKey = `${grade.alumnoId}-${grade.materiaId}-${grade.rubro}-${grade.periodo}`;
        const fieldId = `${grade.alumnoId}-${grade.rubro}`;
        
        // Para cada calificación modificada, verificamos si ya existe en la BD
        if (dirtyFields.has(fieldId)) {
          const studentGrade = studentGrades[grade.alumnoId]?.[grade.rubro];
          if (studentGrade && studentGrade.valor !== null) {
            // Si esta calificación ya existe en la BD pero pertenece a otro registro
            const existingGradeId = grades
              .filter(g => g.alumnoId === grade.alumnoId && g.rubro === grade.rubro && g.periodo === grade.periodo)
              .map(g => g.id)[0];
            
            if (existingGradeId && existingGradeId !== grade.id) {
              newDuplicateFields.add(fieldId);
            }
          }
        }
      });
    
    // Actualizar los estados de validación
    setOutOfRangeFields(newOutOfRangeFields);
    setEmptyFields(newEmptyFields);
    setDuplicateFields(newDuplicateFields);
    
    // Determinar si hay algún error de validación
    setHasInvalidGrades(
      newOutOfRangeFields.size > 0 || 
      newEmptyFields.size > 0 || 
      newDuplicateFields.size > 0
    );
    
  }, [studentGrades, dirtyFields, grades, periodo, subjectId]);

  // Mutación para guardar calificaciones en lote
  const saveBatchGrades = useMutation({
    mutationFn: async (updates: GradeUpdate[]) => {
      const response = await apiRequest("PUT", "/api/grades/batch", { grades: updates });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Calificaciones guardadas",
        description: "Las calificaciones se han guardado correctamente",
      });
      setDirtyFields(new Set());
      onRefetch();
    },
    onError: (error) => {
      toast({
        title: "Error al guardar",
        description: `No se pudieron guardar las calificaciones: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Preparar y enviar actualizaciones
  const handleSaveChanges = () => {
    if (hasInvalidGrades) {
      // Mostrar mensajes específicos para cada tipo de error
      if (outOfRangeFields.size > 0) {
        toast({
          title: "Calificaciones fuera de rango",
          description: "Hay calificaciones que no están en el rango permitido (0-10)",
          variant: "destructive",
        });
        return;
      }
      
      if (emptyFields.size > 0) {
        toast({
          title: "Campos vacíos",
          description: "Hay campos de calificación que no pueden quedar vacíos",
          variant: "destructive",
        });
        return;
      }
      
      if (duplicateFields.size > 0) {
        toast({
          title: "Rubros duplicados",
          description: "Ya existe un registro con el mismo rubro para este alumno, materia y periodo",
          variant: "destructive",
        });
        return;
      }
      
      // Mensaje genérico por si hay otros errores no especificados
      toast({
        title: "Calificaciones inválidas",
        description: "Hay errores de validación que deben corregirse antes de guardar",
        variant: "destructive",
      });
      return;
    }

    const updates: GradeUpdate[] = [];

    // Buscar los IDs de calificaciones existentes
    const existingGrades = new Map<string, number>();
    grades
      .filter(grade => grade.periodo === periodo)
      .forEach(grade => {
        const key = `${grade.alumnoId}-${grade.rubro}`;
        existingGrades.set(key, grade.id);
      });

    // Preparar actualizaciones solo para campos modificados
    dirtyFields.forEach(fieldId => {
      const [studentId, category] = fieldId.split("-");
      const studentIdNum = parseInt(studentId);
      const gradeInfo = studentGrades[studentIdNum][category];
      
      if (!gradeInfo) {
        toast({
          title: "Error en los datos",
          description: `Información de calificación no válida para el estudiante ${studentId} en ${category}`,
          variant: "destructive",
        });
        return;
      }
      
      const key = `${studentIdNum}-${category}`;
      const existingId = existingGrades.get(key);
      
      updates.push({
        ...(existingId ? { id: existingId } : {}),
        alumnoId: studentIdNum,
        materiaId: subjectId,
        grupoId: groupId,
        rubro: category,
        valor: gradeInfo.valor,
        comentario: gradeInfo.comentario,
        periodo: periodo
      });
    });

    if (updates.length > 0) {
      saveBatchGrades.mutate(updates);
    } else {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar",
      });
    }
  };

  // Función para editar una calificación en la nueva vista agrupada
  const handleNestedGradeChange = (studentId: number, materiaId: number, rubro: string, value: number | null, comentario: string | null = null) => {
    // Actualizar los datos para la vista agrupada
    setStudentsWithGrades(prev => 
      prev.map(student => {
        if (student.student.id === studentId) {
          const updatedSubjects = { ...student.subjects };
          if (updatedSubjects[materiaId]) {
            const updatedCalificaciones = { ...updatedSubjects[materiaId].calificaciones };
            updatedCalificaciones[rubro] = {
              ...updatedCalificaciones[rubro],
              valor: value !== null ? value.toString() : null,
              comentario: comentario
            };
            
            // Recalcular promedio
            let sum = 0;
            let count = 0;
            Object.values(updatedCalificaciones).forEach(grade => {
              if (grade.valor !== null) {
                sum += Number(grade.valor);
                count++;
              }
            });
            
            const newPromedio = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
            
            updatedSubjects[materiaId] = {
              ...updatedSubjects[materiaId],
              calificaciones: updatedCalificaciones,
              promedio: newPromedio
            };
          }
          
          return {
            ...student,
            subjects: updatedSubjects
          };
        }
        return student;
      })
    );
    
    // Actualizaciones para compatibilidad con el sistema anterior
    handleGradeChange(studentId, rubro, value, comentario);
    
    // Marcar el campo como modificado
    const fieldId = `${studentId}-${rubro}`;
    setDirtyFields(prev => {
      const newDirtyFields = new Set(prev);
      newDirtyFields.add(fieldId);
      return newDirtyFields;
    });
  };
  
  // Función para renderizar una celda de calificación editable
  const renderGradeCell = (
    studentId: number,
    materiaId: number,
    rubro: string,
    grade: GradeValue | undefined
  ) => {
    const value = grade?.valor ? Number(grade.valor) : null;
    const comentario = grade?.comentario || null;
    const fieldId = `${studentId}-${rubro}`;
    const isDirty = dirtyFields.has(fieldId);
    
    // Verificar errores de validación para este campo
    const hasOutOfRangeError = outOfRangeFields.has(fieldId);
    const hasEmptyError = emptyFields.has(fieldId);
    const hasDuplicateError = duplicateFields.has(fieldId);
    const hasError = hasOutOfRangeError || hasEmptyError || hasDuplicateError;
    
    // Clases para el estilo según el estado
    let inputClasses = "w-10 text-center border rounded focus:outline-none focus:ring-1 ";
    if (hasError) {
      inputClasses += "border-red-500 bg-red-50 focus:ring-red-500 ";
    } else if (isDirty) {
      inputClasses += "border-amber-300 bg-amber-50 focus:ring-amber-500 ";
    } else {
      inputClasses += "border-gray-200 focus:ring-blue-300 ";
    }
    
    return (
      <div className="flex items-center">
        <div className={`w-10 h-8 flex items-center justify-center rounded relative ${
          hasError ? 'bg-red-50' : (isDirty ? 'bg-amber-50' : '')
        }`}>
          <input
            type="text"
            className={inputClasses}
            value={value !== null ? value.toString() : ''}
            onChange={(e) => {
              const inputValue = e.target.value.trim();
              if (inputValue === '') {
                handleNestedGradeChange(studentId, materiaId, rubro, null, comentario);
              } else {
                const numValue = parseFloat(inputValue);
                if (!isNaN(numValue)) {
                  handleNestedGradeChange(studentId, materiaId, rubro, numValue, comentario);
                }
              }
            }}
          />
          {hasError && (
            <div className="absolute top-[-8px] right-[-8px]">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                !
              </span>
            </div>
          )}
        </div>
        <div className="ml-2 flex gap-1">
          {/* Botón para comentarios */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => {
              // Abrir un diálogo o tooltip para editar el comentario
              const newComment = prompt("Ingresa un comentario:", comentario || "");
              if (newComment !== null) {  // Si el usuario no canceló
                handleNestedGradeChange(studentId, materiaId, rubro, value, newComment || null);
              }
            }}
          >
            <Pencil className={`h-4 w-4 ${comentario ? 'text-blue-500' : 'text-gray-400'}`} />
          </Button>
          
          {/* Mostrar tooltip con descripción del error */}
          {hasError && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-500" 
                  >
                    <AlertCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-red-50 border-red-200 text-red-800 max-w-xs">
                  {hasOutOfRangeError && <p>Valor fuera de rango (0-10)</p>}
                  {hasEmptyError && <p>El campo no puede estar vacío</p>}
                  {hasDuplicateError && <p>Ya existe esta calificación para el mismo periodo</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  };

  // Función para exportar a PDF
  const exportToPDF = () => {
    // Crear el documento PDF
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Calificaciones: ${subjectName} - ${groupName}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Periodo: ${periodo}`, 14, 30);
    
    // Preparar datos para la tabla
    const tableData = filteredStudents.map(student => {
      // Los datos de cada fila (alumno)
      const row = [
        student.student.nombreCompleto,
        ...GRADE_CATEGORIES.map(rubro => {
          const grade = student.subjects[subjectId]?.calificaciones[rubro];
          return grade?.valor || '-';
        }),
        student.subjects[subjectId]?.promedio.toString() || '-'
      ];
      return row;
    });
    
    // Definir encabezados de la tabla
    const headers = [
      'Estudiante',
      ...GRADE_CATEGORIES,
      'Promedio'
    ];
    
    // Generar la tabla en el PDF
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
    
    // Mostrar fecha de generación
    const fecha = new Date().toLocaleDateString('es-MX');
    doc.setFontSize(8);
    doc.text(`Generado el: ${fecha}`, 14, doc.internal.pageSize.height - 10);
    
    // Guardar el PDF
    doc.save(`Calificaciones_${groupName}_${subjectName.replace(' ', '_')}_${periodo.replace(' ', '_')}.pdf`);
    
    toast({
      title: "PDF generado",
      description: "El archivo PDF con las calificaciones ha sido descargado",
    });
  };
  
  // Función para exportar a Excel
  const exportToExcel = () => {
    // Preparar datos para la hoja de cálculo
    const worksheetData = [
      // Encabezados
      ['Estudiante', ...GRADE_CATEGORIES, 'Promedio']
    ];
    
    // Agregar datos de cada estudiante
    filteredStudents.forEach(student => {
      const row = [
        student.student.nombreCompleto,
        ...GRADE_CATEGORIES.map(rubro => {
          const grade = student.subjects[subjectId]?.calificaciones[rubro];
          return grade?.valor ? Number(grade.valor) : null;
        }),
        student.subjects[subjectId]?.promedio || null
      ];
      worksheetData.push(row);
    });
    
    // Crear hoja de cálculo
    const worksheet = utils.aoa_to_sheet(worksheetData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, periodo);
    
    // Ajustar anchos de columna
    const columnsWidth = [{ wch: 30 }]; // Ancho para nombre del alumno
    for (let i = 0; i < GRADE_CATEGORIES.length + 1; i++) {
      columnsWidth.push({ wch: 15 }); // Ancho para calificaciones y promedio
    }
    worksheet['!cols'] = columnsWidth;
    
    // Guardar archivo Excel
    writeFile(
      workbook, 
      `Calificaciones_${groupName}_${subjectName.replace(' ', '_')}_${periodo.replace(' ', '_')}.xlsx`
    );
    
    toast({
      title: "Excel generado",
      description: "El archivo Excel con las calificaciones ha sido descargado",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center">
          <div>
            {subjectName} - {groupName}
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex gap-2 mr-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToPDF}
                title="Exportar a PDF"
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToExcel}
                title="Exportar a Excel"
              >
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
            <span className="text-sm mr-2">Periodo:</span>
            <Select
              value={periodo}
              onValueChange={(value) => {
                if (dirtyFields.size > 0) {
                  if (confirm("Hay cambios sin guardar. ¿Desea continuar sin guardar?")) {
                    setPeriodo(value);
                  }
                } else {
                  setPeriodo(value);
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Primer Bimestre">Primer Bimestre</SelectItem>
                <SelectItem value="Segundo Bimestre">Segundo Bimestre</SelectItem>
                <SelectItem value="Tercer Bimestre">Tercer Bimestre</SelectItem>
                <SelectItem value="Cuarto Bimestre">Cuarto Bimestre</SelectItem>
                <SelectItem value="Quinto Bimestre">Quinto Bimestre</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasInvalidGrades && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de validación</AlertTitle>
            <AlertDescription>
              <div className="grid gap-1">
                {outOfRangeFields.size > 0 && (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 mt-0.5" />
                    <span>Hay {outOfRangeFields.size} calificaciones fuera del rango permitido (0-10)</span>
                  </div>
                )}
                {emptyFields.size > 0 && (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 mt-0.5" />
                    <span>Hay {emptyFields.size} campos de calificación que no pueden quedar vacíos</span>
                  </div>
                )}
                {duplicateFields.size > 0 && (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 mt-0.5" />
                    <span>Hay {duplicateFields.size} rubros duplicados (mismo alumno, materia y periodo)</span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {dirtyFields.size > 0 && !hasInvalidGrades && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-600">Cambios sin guardar</AlertTitle>
            <AlertDescription className="text-amber-700">
              Hay {dirtyFields.size} cambios que no se han guardado
            </AlertDescription>
          </Alert>
        )}

        {/* Barra de herramientas para la tabla */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExpandAll}
              className="flex items-center"
            >
              <ChevronDown className="mr-1 h-4 w-4" />
              Expandir Todos
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCollapseAll}
              className="flex items-center"
            >
              <ChevronUp className="mr-1 h-4 w-4" />
              Colapsar Todos
            </Button>
            <Button
              variant={sortOrder ? "default" : "outline"}
              size="sm"
              onClick={handleToggleSort}
              className="flex items-center ml-2"
              title={sortOrder === "desc" ? "Ordenados por promedio (mejores primero)" : 
                     sortOrder === "asc" ? "Ordenados por promedio (menores primero)" : 
                     "Ordenar por promedio"}
            >
              <Calculator className="mr-1 h-4 w-4" />
              {sortOrder === "desc" ? "↓ Prom." : sortOrder === "asc" ? "↑ Prom." : "Ordenar"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <Select
                value={selectedRubro}
                onValueChange={setSelectedRubro}
              >
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Filtrar por rubro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos los rubros</SelectItem>
                  {GRADE_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alumno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Tabla con vista expandible */}
        <div className="border rounded-md overflow-hidden">
          {isLoading ? (
            <div className="h-24 flex items-center justify-center">
              <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              {(() => {
                if (searchQuery && selectedRubro !== "Todos") {
                  return `No se encontraron estudiantes con nombre "${searchQuery}" y calificaciones en el rubro "${selectedRubro}"`;
                } else if (searchQuery) {
                  return `No se encontraron estudiantes con nombre "${searchQuery}"`;
                } else if (selectedRubro !== "Todos") {
                  return `No hay estudiantes con calificaciones en el rubro "${selectedRubro}"`;
                } else {
                  return "No hay estudiantes asignados a este grupo";
                }
              })()}
            </div>
          ) : (
            <div className="overflow-hidden">
              {filteredStudents.map((studentWithGrades) => (
                <Collapsible
                  key={studentWithGrades.student.id}
                  open={studentWithGrades.expanded}
                  onOpenChange={() => toggleStudentExpanded(studentWithGrades.student.id)}
                  className="border-b last:border-b-0"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex justify-between items-center p-3 hover:bg-gray-50 cursor-pointer select-none">
                      <div className="flex items-center gap-2">
                        {studentWithGrades.expanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{studentWithGrades.student.nombreCompleto}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Promedio general del estudiante */}
                        {Object.keys(studentWithGrades.subjects).length > 0 && (
                          <Badge variant="outline" className="bg-blue-50 border-blue-200">
                            <Calculator className="h-3 w-3 mr-1 text-blue-500" />
                            Prom: {
                              parseFloat(
                                (Object.values(studentWithGrades.subjects)
                                  .reduce((sum, subject) => sum + subject.promedio, 0) / 
                                  Object.values(studentWithGrades.subjects).length).toFixed(1)
                              )
                            }
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="bg-gray-50 p-3 pl-8">
                      {Object.keys(studentWithGrades.subjects).length === 0 ? (
                        <div className="text-sm text-muted-foreground py-2">
                          No hay calificaciones registradas para este alumno
                        </div>
                      ) : (
                        Object.values(studentWithGrades.subjects).map((subject) => (
                          <div key={subject.materiaId} className="mb-4 last:mb-0">
                            <div className="flex items-center mb-2">
                              <Book className="h-4 w-4 mr-2 text-primary" />
                              <span className="font-medium">{subject.materiaNombre}</span>
                              <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                                Prom: {subject.promedio}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                              {GRADE_CATEGORIES.map((rubro) => (
                                <div 
                                  key={rubro} 
                                  className="flex justify-between items-center p-2 bg-white rounded-md border"
                                >
                                  <span className="text-sm font-medium">{rubro}:</span>
                                  {renderGradeCell(
                                    studentWithGrades.student.id,
                                    subject.materiaId,
                                    rubro,
                                    subject.calificaciones[rubro]
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={onRefetch}
            disabled={saveBatchGrades.isPending}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={dirtyFields.size === 0 || hasInvalidGrades || saveBatchGrades.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveBatchGrades.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}