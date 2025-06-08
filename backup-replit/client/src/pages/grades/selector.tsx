import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, PlusCircle, BarChart, RefreshCcw, Info } from "lucide-react";
import { Student, Subject, Group, CriteriaGrade, EvaluationCriteria } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function GradesSelector() {
  // Estados para los selectores
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Consulta para obtener datos de grupos activos asignados al docente
  const { 
    data: groups, 
    isLoading: isLoadingGroups, 
    error: groupsError 
  } = useQuery<Group[]>({
    queryKey: ["/api/profesor/grupos-asignados"],
    // Solo cargar si el usuario está autenticado
    enabled: !!user,
  });

  // Consulta para obtener datos de materias asignadas al docente en el grupo seleccionado
  const { 
    data: subjects, 
    isLoading: isLoadingSubjects, 
    error: subjectsError 
  } = useQuery<Subject[]>({
    queryKey: [`/api/profesor/materias-asignadas/${selectedGroupId}`],
    // Solo cargar si hay un grupo seleccionado
    enabled: !!selectedGroupId,
  });

  // Inicializar valores por defecto al cargar la página
  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (subjects && subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Al cambiar de grupo, resetear la materia seleccionada
  useEffect(() => {
    setSelectedSubjectId(null);
  }, [selectedGroupId]);

  // Log para depuración
  useEffect(() => {
    console.log("Parámetros seleccionados:", { selectedGroupId, selectedSubjectId });
  }, [selectedGroupId, selectedSubjectId]);

  // Manejar cambio de grupo
  const handleGroupChange = (value: string) => {
    const groupId = parseInt(value);
    setSelectedGroupId(groupId);
  };

  // Manejar cambio de materia
  const handleSubjectChange = (value: string) => {
    const subjectId = parseInt(value);
    setSelectedSubjectId(subjectId);
  };

  // Función para navegar a la vista de calificaciones por criterio
  const navigateToGrades = () => {
    if (selectedGroupId && selectedSubjectId) {
      navigate(`/grades/group/${selectedGroupId}/subject/${selectedSubjectId}`);
    }
  };

  // Preparar nombres para mostrar en UI
  const getGroupName = () => {
    if (!groups || !selectedGroupId) return "Seleccione un grupo";
    const group = groups.find(g => g.id === selectedGroupId);
    return group ? group.nombre : "Grupo no encontrado";
  };

  const getSubjectName = () => {
    if (!subjects || !selectedSubjectId) return "Seleccione una materia";
    const subject = subjects.find(s => s.id === selectedSubjectId);
    return subject ? subject.nombre : "Materia no encontrada";
  };

  const isLoading = isLoadingGroups || 
                   (!!selectedGroupId && isLoadingSubjects);

  const hasError = groupsError || 
                  (!!selectedGroupId && subjectsError);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Calificaciones por Criterio</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <span className="text-primary cursor-pointer">Inicio</span>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Calificaciones</span>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Seleccionar grupo y materia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Selector de grupo */}
            <div>
              <label className="text-sm font-medium mb-1 block">Grupo</label>
              <Select
                value={selectedGroupId?.toString() || ""}
                onValueChange={handleGroupChange}
                disabled={isLoadingGroups || !groups || groups.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de materia */}
            <div>
              <label className="text-sm font-medium mb-1 block">Materia</label>
              <Select
                value={selectedSubjectId?.toString() || ""}
                onValueChange={handleSubjectChange}
                disabled={isLoadingSubjects || !subjects || subjects.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.nombre}
                      {/* Indicador para materias sin criterios (simulado) */}
                      {subject.id % 3 === 0 && (
                        <span className="text-amber-500 text-xs ml-2">⚠️ Sin criterios aún registrados</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Indicador de periodo académico activo */}
            <div className="flex items-end">
              <div className="py-2 px-3 rounded-md bg-blue-50 border border-blue-100">
                <span className="text-blue-700 text-sm">📅 Periodo activo: </span>
                <span className="font-medium text-blue-800">1er Trimestre</span>
              </div>
            </div>
          </div>
          
          {/* Separador para acciones disponibles */}
          <div className="mt-6 mb-4">
            <h4 className="text-sm font-medium text-gray-500 flex items-center">
              <span className="mr-2">🧩</span> Acciones disponibles para esta materia
              <span className="h-px flex-grow bg-gray-200 ml-3"></span>
            </h4>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Botón para ver calificaciones */}
            <div className="relative group">
              <Button 
                onClick={navigateToGrades}
                disabled={!selectedGroupId || !selectedSubjectId}
                className="w-full md:w-auto"
                title="Accede al panel para calificar con base en los criterios definidos para la materia"
              >
                <BarChart className="mr-2 h-4 w-4" />
                📊 Visualizar Registro de Calificaciones
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estados de error o carga */}
      {hasError && (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <BarChart className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error al cargar datos</h2>
          <p className="text-muted-foreground mb-6">
            No se pudieron cargar los datos necesarios para mostrar las calificaciones.
          </p>
        </div>
      )}

      {!hasError && isLoading && (!selectedGroupId || !selectedSubjectId) && (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Cargando datos</h2>
          <p className="text-muted-foreground">
            Por favor espere mientras se cargan los datos...
          </p>
        </div>
      )}
      
      {/* Mensaje cuando no hay grupos asignados */}
      {!hasError && !isLoading && groups && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <BarChart className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No tienes grupos activos asignados</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            No se encontraron grupos activos asignados a tu perfil docente.
            Contacta al administrador para obtener acceso a tus grupos.
          </p>
        </div>
      )}
      
      {/* Mensaje cuando no hay materias asignadas al grupo seleccionado */}
      {!hasError && !isLoading && selectedGroupId && subjects && subjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <BarChart className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No tienes materias asignadas en este grupo</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            No se encontraron materias asignadas para ti en este grupo.
            Contacta al administrador para obtener acceso a tus materias.
          </p>
        </div>
      )}

      {/* Instrucciones para calificaciones por criterio */}
      {!hasError && !isLoading && selectedGroupId && selectedSubjectId && (
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-xl font-medium mb-4">Sistema de Calificaciones por Criterio</h3>
          <p className="text-muted-foreground mb-6">
            El sistema de calificaciones por criterio te permite evaluar a tus estudiantes basado en criterios 
            específicos de evaluación definidos para cada materia. Selecciona un grupo y materia y haz clic 
            en "Ver Calificaciones" para comenzar a registrar calificaciones.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <Button 
              onClick={navigateToGrades} 
              disabled={!selectedGroupId || !selectedSubjectId}
              title="Accede al panel para calificar con base en los criterios definidos para la materia"
            >
              <BarChart className="mr-2 h-4 w-4" />
              📊 Calificaciones para {getGroupName()} - {getSubjectName()}
            </Button>
            
            <Link href="/grades/new">
              <Button 
                variant="outline"
                title="Permite registrar calificaciones fuera de los criterios establecidos"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                ✏️ Agregar Calificación Manual
              </Button>
            </Link>
            
            {/* Botón Ver historial por trimestre (opcional) - En desarrollo */}
            <div className="flex flex-col items-start">
              <Button 
                variant="ghost" 
                className="border border-gray-200 cursor-not-allowed opacity-70"
                disabled={true}
                title="Próximamente disponible: podrás revisar el historial de calificaciones por trimestre."
              >
                <span className="mr-2">🚧</span> Ver historial por trimestre
              </Button>
              <span className="text-xs text-muted-foreground mt-1 ml-2">Funcionalidad en desarrollo</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}