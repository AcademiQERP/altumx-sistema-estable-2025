import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, PlusCircle, BarChart, RefreshCcw } from "lucide-react";
import { Student, Grade, Subject, Group } from "@shared/schema";
import GradesTable from "@/components/grades-table/GradesTable";
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

export default function CalificacionesPage() {
  // Estados para los selectores
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const { user } = useAuth();
  
  // Consultas separadas para obtener grupos según el rol del usuario
  
  // Consulta de grupos para administradores
  const {
    data: adminGroups,
    isLoading: isLoadingAdminGroups,
    error: adminGroupsError
  } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    // Solo cargar si el usuario es administrador
    enabled: !!user && user.rol === "admin",
    queryFn: async () => {
      console.log("Administrador: cargando grupos generales");
      const response = await fetch("/api/groups");
      if (!response.ok) {
        throw new Error(`Error al cargar grupos: ${response.statusText}`);
      }
      return response.json();
    }
  });
  
  // Consulta de grupos para docentes
  const {
    data: teacherGroups,
    isLoading: isLoadingTeacherGroups,
    error: teacherGroupsError
  } = useQuery<Group[]>({
    queryKey: ["/api/profesor/grupos-asignados"],
    // Solo cargar si el usuario es docente
    enabled: !!user && user.rol === "docente",
    queryFn: async () => {
      console.log("Profesor: cargando grupos asignados");
      const response = await fetch("/api/profesor/grupos-asignados");
      if (!response.ok) {
        throw new Error(`Error al cargar grupos: ${response.statusText}`);
      }
      return response.json();
    }
  });
  
  // Datos combinados para usar en el componente
  const groups = useMemo(() => {
    if (user?.rol === "admin") return adminGroups || [];
    if (user?.rol === "docente") return teacherGroups || [];
    return [];
  }, [user?.rol, adminGroups, teacherGroups]);
  
  const isLoadingGroups = 
    (user?.rol === "admin" && isLoadingAdminGroups) || 
    (user?.rol === "docente" && isLoadingTeacherGroups);
    
  const groupsError = 
    (user?.rol === "admin" && adminGroupsError) || 
    (user?.rol === "docente" && teacherGroupsError);

  // Consultas separadas para obtener materias según el rol del usuario
  
  // Consulta de materias para administradores
  const {
    data: adminSubjects,
    isLoading: isLoadingAdminSubjects,
    error: adminSubjectsError,
    refetch: refetchAdminSubjects
  } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    // Solo cargar si el usuario es administrador
    enabled: !!user && user.rol === "admin",
    queryFn: async () => {
      console.log("Admin: cargando todas las materias");
      const response = await fetch("/api/subjects");
      if (!response.ok) {
        throw new Error(`Error al cargar materias: ${response.statusText}`);
      }
      return response.json();
    }
  });
  
  // Consulta de materias para docentes (por grupo)
  const {
    data: teacherSubjects,
    isLoading: isLoadingTeacherSubjects,
    error: teacherSubjectsError,
    refetch: refetchTeacherSubjects
  } = useQuery<Subject[]>({
    queryKey: [`/api/profesor/materias-asignadas/${selectedGroupId}`],
    // Solo cargar si el usuario es docente y hay un grupo seleccionado
    enabled: !!user && user.rol === "docente" && !!selectedGroupId,
    queryFn: async () => {
      if (!selectedGroupId) {
        return [];
      }
      
      const endpoint = `/api/profesor/materias-asignadas/${selectedGroupId}`;
      console.log("Profesor: cargando materias por grupo:", endpoint);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Error al cargar materias: ${response.statusText}`);
      }
      
      return response.json();
    }
  });
  
  // Datos combinados para usar en el componente
  const subjects = useMemo(() => {
    if (user?.rol === "admin") return adminSubjects || [];
    if (user?.rol === "docente") return teacherSubjects || [];
    return [];
  }, [user?.rol, adminSubjects, teacherSubjects]);
  
  const isLoadingSubjects = 
    (user?.rol === "admin" && isLoadingAdminSubjects) || 
    (user?.rol === "docente" && isLoadingTeacherSubjects);
    
  const subjectsError = 
    (user?.rol === "admin" && adminSubjectsError) || 
    (user?.rol === "docente" && teacherSubjectsError);
    
  // Función para refrescar las materias
  const refetchSubjects = () => {
    if (user?.rol === "admin") {
      refetchAdminSubjects();
    } else if (user?.rol === "docente") {
      refetchTeacherSubjects();
    }
  };

  // Consultar estudiantes del grupo seleccionado
  const { 
    data: students, 
    isLoading: isLoadingStudents, 
    error: studentsError,
    refetch: refetchStudents
  } = useQuery<Student[]>({
    queryKey: [`/api/students/group/${selectedGroupId}`],
    enabled: !!selectedGroupId,
    queryFn: () => fetch(`/api/students/group/${selectedGroupId}`).then(res => {
      if (!res.ok) throw new Error('Error al obtener estudiantes');
      return res.json();
    }),
  });

  // Consultar calificaciones de la materia para el grupo seleccionado
  const { 
    data: grades, 
    isLoading: isLoadingGrades,
    refetch: refetchGrades,
    error: gradesError 
  } = useQuery<Grade[]>({
    queryKey: [`/api/grades/group/${selectedGroupId}/subject/${selectedSubjectId}`],
    enabled: !!selectedGroupId && !!selectedSubjectId,
    queryFn: () => fetch(`/api/grades/group/${selectedGroupId}/subject/${selectedSubjectId}`).then(res => {
      if (!res.ok) throw new Error('Error al obtener calificaciones');
      return res.json();
    }),
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
    console.log("Parámetros seleccionados:", { selectedGroupId, selectedSubjectId, userRole: user?.rol });
    console.log("Datos cargados:", { students, grades });
  }, [selectedGroupId, selectedSubjectId, students, grades, user?.rol]);
  
  // Filtrar materias por grupo si el usuario es administrador
  const filteredSubjects = useMemo(() => {
    // Si no hay materias o no hay usuario, no hay nada que filtrar
    if (!subjects || !user) return [];
    
    // Si el usuario no es administrador o no hay grupo seleccionado, usamos las materias tal como vienen
    if (user.rol !== "admin" || !selectedGroupId) return subjects;
    
    // Para administradores con un grupo seleccionado:
    // En un caso real, aquí necesitaríamos obtener las materias asignadas a este grupo
    // Como no tenemos esa relación directa, mostramos todas (o podríamos simular un filtro)
    return subjects;
    
    // También podríamos implementar un filtro más sofisticado si tuviéramos acceso a la relación 
    // grupo-materia, por ejemplo:
    // return subjects.filter(subject => {
    //   return subject.grupoIds?.includes(selectedGroupId);
    // });
  }, [subjects, user, selectedGroupId]);

  // Función para refrescar los datos
  const refreshData = () => {
    if (selectedGroupId && selectedSubjectId) {
      refetchStudents();
      refetchGrades();
    }
  };

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
                   (!!selectedGroupId && isLoadingSubjects) || 
                   (!!selectedGroupId && isLoadingStudents) || 
                   (!!selectedGroupId && !!selectedSubjectId && isLoadingGrades);

  // Para el administrador, ignoramos ciertos errores
  const hasError = user?.rol === "admin" 
    ? (!!selectedGroupId && studentsError) || (!!selectedGroupId && !!selectedSubjectId && gradesError)
    : groupsError || 
      (!!selectedGroupId && subjectsError) || 
      (!!selectedGroupId && studentsError) ||
      (!!selectedGroupId && !!selectedSubjectId && gradesError);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Calificaciones</h1>
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
                  {filteredSubjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botón para refrescar */}
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={refreshData}
                disabled={!selectedGroupId || !selectedSubjectId}
                className="w-full md:w-auto"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar datos
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
          <Button onClick={refreshData}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Intentar nuevamente
          </Button>
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

      {/* Tabla de calificaciones */}
      {!hasError && selectedGroupId && selectedSubjectId && (
        <GradesTable
          groupId={selectedGroupId}
          subjectId={selectedSubjectId}
          groupName={getGroupName()}
          subjectName={getSubjectName()}
          students={students || []}
          grades={grades || []}
          isLoading={isLoading}
          onRefetch={refreshData}
        />
      )}
    </>
  );
}