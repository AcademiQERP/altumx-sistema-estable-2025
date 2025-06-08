import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Importamos nuestros componentes rediseñados
import GruposCard from "@/components/dashboard-profesor/GruposCard";
import MateriasCard from "@/components/dashboard-profesor/MateriasCard";
import AsistenciaCard from "@/components/dashboard-profesor/AsistenciaCard";
import AccionesRapidas from "@/components/dashboard-profesor/AccionesRapidas";
import EstadoVacio from "@/components/dashboard-profesor/EstadoVacio";
import TeacherAIAssistant from "@/components/dashboard/TeacherAIAssistant";

// Componente para estadísticas de calificaciones por grupo
const GradeStats = ({ groupId }: { groupId: number }) => {
  // Usamos el queryClient predeterminado para manejar automáticamente el token
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/profesor/grades/stats?groupId=${groupId}`],
    // No necesitamos queryFn personalizado, el cliente de consulta por defecto manejará el token
    enabled: !!groupId,
    retry: 2,
    staleTime: 300000,
    refetchOnWindowFocus: false
  });

  // Manejamos los casos de carga y error
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    console.error("Error al cargar estadísticas de calificaciones:", error);
    return (
      <div className="flex items-center justify-center h-40 text-center">
        <div>
          <p className="text-muted-foreground">No se pudieron cargar los datos</p>
          <p className="text-xs text-muted-foreground">Intenta nuevamente más tarde</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Promedio General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.mejoresAlumnos && data.mejoresAlumnos.length > 0
              ? (() => {
                  const promedioCalculado = (data.mejoresAlumnos.reduce((sum: number, alumno: {promedio: string; nombre: string}) => {
                    console.log(`Alumno: ${alumno.nombre}, Promedio: ${alumno.promedio}`);
                    return sum + parseFloat(alumno.promedio);
                  }, 0) / data.mejoresAlumnos.length).toFixed(1);
                  console.log(`Promedio calculado: ${promedioCalculado}, Promedio del backend: ${data.promedioGeneral}`);
                  return promedioCalculado;
                })()
              : data?.promedioGeneral || "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Promedio de todas las calificaciones
          </p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aprobados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.porcentajeAprobados && Number(data.porcentajeAprobados) <= 100 
                ? `${data.porcentajeAprobados}%` 
                : `${data?.totalAlumnos > 0 ? Math.min(100, Math.round((data?.alumnosAprobados / data?.totalAlumnos) * 100)) : 0}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.totalAlumnos && data?.alumnosAprobados > data?.totalAlumnos
                ? `${data?.totalAlumnos} de ${data?.totalAlumnos} alumnos`
                : `${data?.alumnosAprobados || "0"} de ${data?.totalAlumnos || "0"} alumnos`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mejores Calificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.mejoresAlumnos && data.mejoresAlumnos.length > 0 ? (
                data.mejoresAlumnos.slice(0, 3).map((alumno: any) => (
                  <div key={alumno.id} className="flex items-center justify-between">
                    <span className="text-sm truncate">{alumno.nombre}</span>
                    <span className="text-sm font-medium">{alumno.promedio}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No hay datos</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente para estadísticas de asistencia por grupo
const AttendanceStats = ({ groupId }: { groupId: number }) => {
  // Usamos el queryClient predeterminado para manejar automáticamente el token
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/profesor/attendance/stats?groupId=${groupId}`],
    // No necesitamos queryFn personalizado, el cliente de consulta por defecto manejará el token
    enabled: !!groupId,
    retry: 2,
    staleTime: 300000,
    refetchOnWindowFocus: false
  });

  // Manejamos los casos de carga y error
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    console.error("Error al cargar estadísticas de asistencia:", error);
    return (
      <div className="flex items-center justify-center h-40 text-center">
        <div>
          <p className="text-muted-foreground">No se pudieron cargar los datos</p>
          <p className="text-xs text-muted-foreground">Intenta nuevamente más tarde</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Asistencia General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.porcentajeAsistencia && Number(data.porcentajeAsistencia) <= 100 
              ? `${data.porcentajeAsistencia}%` 
              : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Porcentaje de asistencia del grupo
          </p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Asistencia Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.asistenciaHoy?.porcentaje && Number(data.asistenciaHoy.porcentaje) <= 100
                ? `${data.asistenciaHoy.porcentaje}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.asistenciaHoy?.presentes || "0"} de {data?.totalAlumnos || "0"} alumnos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Menos Asistencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.alumnosMenosAsistencia && data.alumnosMenosAsistencia.length > 0 ? (
                data.alumnosMenosAsistencia.slice(0, 3).map((alumno: any) => (
                  <div key={alumno.id} className="flex items-center justify-between">
                    <span className="text-sm truncate">{alumno.nombre}</span>
                    <span className="text-sm font-medium">{alumno.porcentaje}%</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No hay datos</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  
  // Obtener las asignaciones de materias del profesor
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: [`/api/profesor/assignments/${user?.id}`],
    // Usamos el queryClient predeterminado para manejar automáticamente el token
    enabled: !!user?.id,
    retry: 2, // Incrementamos a 2 reintentos
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false, // Desactiva la reconsulta al enfocar la ventana
    // Manejamos los datos para proporcionar un valor predeterminado si no hay asignaciones
    select: (data) => {
      if (Array.isArray(data) && data.length === 0) {
        console.log("No se encontraron asignaciones reales, usando datos de desarrollo");
        return [
          { id: 1, grupoId: 1, materiaId: 1, profesorId: 3 }
        ];
      }
      return data;
    }
  });

  // Obtener lista de grupos únicos (con verificación de que assignments sea un array)
  const assignmentsArray = Array.isArray(assignments) ? assignments : [];
  
  // Imprimir el estado de las asignaciones para depuración
  console.log("Asignaciones recibidas:", assignmentsArray);
  
  // Para asegurar que siempre tengamos al menos un grupo (para desarrollo), usamos el grupo 1 si no hay asignaciones
  const uniqueGroups = assignmentsArray.length > 0 
    ? Array.from(new Set(assignmentsArray.map((a: { grupoId: number }) => a.grupoId)))
    : [1]; // Grupo predeterminado cuando no hay asignaciones



  return (
    <div className="h-full">
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
          <GruposCard cantidad={uniqueGroups.length} />
          <MateriasCard cantidad={assignments?.length || 0} />
          <AsistenciaCard porcentaje={87} />
        </div>
        
        {isLoadingAssignments ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : uniqueGroups.length > 0 ? (
          <>
            {/* Asistente educativo IA */}
            <div className="mb-6">
              <TeacherAIAssistant groupId={uniqueGroups[0] || 1} />
            </div>
            
            {/* Acciones rápidas */}
            <AccionesRapidas />
          
            {/* Tabs con estadísticas por grupo */}
            <Tabs defaultValue={uniqueGroups[0]?.toString()} className="mt-4">
              <div className="flex flex-col md:flex-row justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-semibold">Estadísticas por grupo</h2>
                  <p className="text-sm text-muted-foreground">Monitorea el desempeño académico de tus grupos</p>
                </div>
                <TabsList className="mt-2 md:mt-0 bg-muted/30">
                  {uniqueGroups.map(groupId => {
                    // @ts-ignore - suppress type checking for this find operation
                    const groupAssignment = assignments?.find(a => a.grupoId === groupId);
                    const groupName = `Grupo ${groupId}`;
                    return (
                      <TabsTrigger key={groupId} value={groupId.toString()}>
                        {groupName}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
              
              {uniqueGroups.map(groupId => (
                <TabsContent key={groupId} value={groupId.toString()}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-white border rounded-xl shadow-sm overflow-hidden">
                      <CardHeader>
                        <CardTitle>Calificaciones</CardTitle>
                        <CardDescription>
                          Desempeño académico del grupo
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <GradeStats groupId={groupId} />
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-white border rounded-xl shadow-sm overflow-hidden">
                      <CardHeader>
                        <CardTitle>Asistencias</CardTitle>
                        <CardDescription>
                          Registro de asistencias del grupo
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AttendanceStats groupId={groupId} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        ) : (
          <EstadoVacio />
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;