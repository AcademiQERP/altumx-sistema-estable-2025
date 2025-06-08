import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, Users, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SubjectAssignment } from "@shared/schema";

// Componente para estadísticas de calificaciones por grupo
const GradeStats = ({ groupId }: { groupId: number }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/grades/stats", groupId],
    queryFn: () => fetch(`/api/grades/stats?groupId=${groupId}`).then(res => res.json()),
    enabled: !!groupId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <div className="text-2xl font-bold">{data?.promedioGeneral || "N/A"}</div>
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
              {data?.porcentajeAprobados || "0"}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.alumnosAprobados || "0"} de {data?.totalAlumnos || "0"} alumnos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mejores Calificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.mejoresAlumnos?.slice(0, 3).map((alumno: any) => (
                <div key={alumno.id} className="flex items-center justify-between">
                  <span className="text-sm truncate">{alumno.nombre}</span>
                  <span className="text-sm font-medium">{alumno.promedio}</span>
                </div>
              )) || (
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
  const { data, isLoading } = useQuery({
    queryKey: ["/api/attendance/stats", groupId],
    queryFn: () => fetch(`/api/attendance/stats?groupId=${groupId}`).then(res => res.json()),
    enabled: !!groupId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <div className="text-2xl font-bold">{data?.porcentajeAsistencia || "N/A"}%</div>
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
              {data?.asistenciaHoy?.porcentaje || "0"}%
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
              {data?.alumnosMenosAsistencia?.slice(0, 3).map((alumno: any) => (
                <div key={alumno.id} className="flex items-center justify-between">
                  <span className="text-sm truncate">{alumno.nombre}</span>
                  <span className="text-sm font-medium">{alumno.porcentaje}%</span>
                </div>
              )) || (
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
    queryKey: ["/api/subject-assignments/teacher", user?.id],
    queryFn: () => fetch(`/api/subject-assignments/teacher/${user?.id}`)
      .then(res => {
        if (!res.ok) {
          // Si hay un error (como 401 o 404), retorna un array vacío para evitar el error
          return [];
        }
        return res.json();
      })
      .catch(err => {
        console.error("Error al cargar asignaciones:", err);
        return []; // Retorna un array vacío en caso de error
      }),
    enabled: !!user?.id,
  });

  // Obtener lista de grupos únicos (con verificación de que assignments sea un array)
  const assignmentsArray = Array.isArray(assignments) ? assignments : [];
  const uniqueGroups = assignmentsArray.length > 0 
    ? Array.from(new Set(assignmentsArray.map((a: any) => a.grupoId)))
    : [];

  return (
    <div className="h-full">
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
          
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grupos asignados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueGroups.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Materias impartidas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Asistencia promedio</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
            </CardContent>
          </Card>
        </div>
        
        {isLoadingAssignments ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : uniqueGroups.length > 0 ? (
          <Tabs defaultValue={uniqueGroups[0]?.toString()} className="mt-6">
            <div className="flex flex-col md:flex-row justify-between items-start mb-2">
              <div>
                <h2 className="text-lg font-semibold">Estadísticas por grupo</h2>
                <p className="text-sm text-muted-foreground">Monitorea el desempeño académico de tus grupos</p>
              </div>
              <TabsList className="mt-2 md:mt-0">
                {uniqueGroups.map(groupId => {
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
                  <Card>
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
                  
                  <Card>
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
        ) : (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-center">
              <h3 className="mt-2 text-xl font-semibold">No tienes grupos asignados</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Contacta al coordinador académico para solicitar la asignación de grupos y materias
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;