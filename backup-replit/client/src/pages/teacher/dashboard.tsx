import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Calendar, 
  FileText, 
  MessageSquare, 
  Presentation,
  Users,
  BookOpen,
  ClipboardCheck,
  Brain,
  Bell,
  CheckCircle,
  User,
  ListTodo,
  Clock,
  LineChart,
  PieChart,
  Activity,
  Loader2,
  BookOpenCheck,
  CalendarCheck,
  Sparkles
} from "lucide-react";
import TeacherAIAssistant from "@/components/dashboard/TeacherAIAssistant";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";

/**
 * Dashboard principal del Portal para Profesores
 * Muestra un resumen de la información más relevante para los profesores
 */
export default function TeacherDashboard() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  


  // Consulta para obtener los grupos asignados al profesor
  const { 
    data: assignments = [], 
    isLoading: isLoadingAssignments
  } = useQuery({
    queryKey: [`/api/profesor/assignments/${user?.id}`],
    enabled: !!user?.id && user?.rol === "docente",
  });

  // Consulta para obtener los grupos asignados
  const {
    data: groups = [],
    isLoading: isLoadingGroups
  } = useQuery({
    queryKey: ['/api/profesor/grupos-asignados'],
    enabled: !!user?.id && user?.rol === "docente",
  });

  // Consulta para obtener tareas asignadas
  const {
    data: tasks = [],
    isLoading: isLoadingTasks
  } = useQuery({
    queryKey: ['/api/profesor/tasks'],
    enabled: !!user?.id && user?.rol === "docente",
  });

  // Consulta para obtener horario del profesor
  const {
    data: schedule = [],
    isLoading: isLoadingSchedule
  } = useQuery({
    queryKey: ['/api/profesor/horario'],
    enabled: !!user?.id && user?.rol === "docente",
  });
  
  // Consulta para obtener todas las materias
  const {
    data: subjects = [],
    isLoading: isLoadingSubjects
  } = useQuery({
    queryKey: ['/api/subjects'],
    enabled: !!user?.id && user?.rol === "docente",
  });

  // Construcción de las URLs con parámetros de consulta
  const gradesStatsUrl = selectedGroup !== 'all' 
    ? `/api/profesor/grades/stats?groupId=${selectedGroup}` 
    : '/api/profesor/grades/stats';
    
  const attendanceStatsUrl = selectedGroup !== 'all' 
    ? `/api/profesor/attendance/stats?groupId=${selectedGroup}` 
    : '/api/profesor/attendance/stats';

  // Consulta para obtener estadísticas de calificaciones
  const {
    data: gradeStats = {},
    isLoading: isLoadingGradeStats,
    isError: isErrorGradeStats,
    isFetched: isFetchedGradeStats
  } = useQuery({
    queryKey: [gradesStatsUrl],
    enabled: !!user?.id && user?.rol === "docente",
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Consulta para obtener estadísticas de asistencia
  const {
    data: attendanceStats = {},
    isLoading: isLoadingAttendance,
    isError: isErrorAttendance,
    isFetched: isFetchedAttendance
  } = useQuery({
    queryKey: [attendanceStatsUrl],
    enabled: !!user?.id && user?.rol === "docente",
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (isLoadingAssignments || isLoadingGroups) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin text-primary mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Cargando información del dashboard...</p>
        </div>
      </div>
    );
  }

  // Obtener asignaciones únicas por grupo
  const uniqueGroups = Array.isArray(groups) 
    ? [...new Map(groups.map(item => [item.id, item])).values()]
    : [];

  // Obtener información de hoy para el horario
  const today = new Date();
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todaySchedule = Array.isArray(schedule)
    ? schedule.filter(s => s.diaSemana && daysOfWeek[today.getDay()].toLowerCase() === s.diaSemana.toLowerCase())
    : [];

  // Tareas pendientes
  const pendingTasks = Array.isArray(tasks) 
    ? tasks.filter(t => t.estado === 'pendiente' || t.estado === 'retrasada').slice(0, 4)
    : [];
    
  // Tareas recientes
  const recentTasks = Array.isArray(tasks) ? tasks.slice(0, 4) : [];

  // Mostrar los datos de la API en la consola para diagnóstico
  console.log('Datos de calificaciones:', gradeStats);
  console.log('Datos de asistencia:', attendanceStats);

  // Verificar si hay datos de calificaciones disponibles
  const hasGradeData = 
    isFetchedGradeStats && 
    !isErrorGradeStats && 
    gradeStats && 
    typeof gradeStats === 'object' && 
    Object.keys(gradeStats).length > 0 &&
    gradeStats.promedioGeneral !== undefined;
  
  // Verificar si hay datos de asistencia disponibles
  const hasAttendanceData = 
    isFetchedAttendance && 
    !isErrorAttendance && 
    attendanceStats && 
    typeof attendanceStats === 'object' && 
    Object.keys(attendanceStats).length > 0 &&
    attendanceStats.porcentajeAsistencia !== undefined;
  
  // Procesar estadísticas de calificaciones con verificación de disponibilidad de datos
  const gradeSummary = {
    hasData: hasGradeData,
    average: hasGradeData ? gradeStats.promedioGeneral : '0.0',
    approved: hasGradeData ? gradeStats.porcentajeAprobados : '0',
    lowPerforming: hasGradeData ? gradeStats.alumnosBajoRendimiento || [] : []
  };
  
  // Procesar estadísticas de asistencia con verificación de disponibilidad de datos
  const attendanceSummary = {
    hasData: hasAttendanceData,
    percentage: hasAttendanceData ? attendanceStats.porcentajeAsistencia : '0',
    present: hasAttendanceData ? attendanceStats.totalPresentes : 0,
    absent: hasAttendanceData ? attendanceStats.totalAusentes : 0,
    lowAttendance: hasAttendanceData ? attendanceStats.alumnosBajaAsistencia || [] : []
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard del Profesor</h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.nombreCompleto || 'Profesor'}. Resumen de tus clases, grupos y actividades.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select 
            value={selectedGroup}
            onValueChange={(value) => setSelectedGroup(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              {uniqueGroups.map((group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.nombre} - {group.nivel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/profesor/horario')}
          >
            <Calendar className="h-4 w-4" />
            Ver horario completo
          </Button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta: Grupos asignados */}
        <Card className="p-4 shadow-sm border-l-4 border-l-blue-500 border-muted hover:border-muted-foreground/20 transition-colors">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <p className="font-medium">Grupos asignados</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/grupos')}>
                <span className="text-xs">Ver detalle</span>
              </Button>
            </div>
            <h3 className="text-xl font-bold">
              {uniqueGroups.length}
            </h3>
            <div className="flex gap-1 flex-wrap mt-1">
              {uniqueGroups.slice(0, 3).map(group => (
                <Badge key={group.id} variant="outline" className="bg-blue-50">
                  {group.nombre}
                </Badge>
              ))}
              {uniqueGroups.length > 3 && (
                <Badge variant="outline" className="bg-blue-50">
                  +{uniqueGroups.length - 3} más
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta: Materias impartidas */}
        <Card className="p-4 shadow-sm border-l-4 border-l-indigo-500 border-muted hover:border-muted-foreground/20 transition-colors">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                <p className="font-medium">Materias impartidas</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/materias')}>
                <span className="text-xs">Ver detalle</span>
              </Button>
            </div>
            <h3 className="text-xl font-bold">
              {Array.isArray(assignments) 
                ? [...new Set(assignments.map(a => a.materiaId))].length 
                : 0}
            </h3>
            <div className="flex gap-1 flex-wrap mt-1">
              {Array.isArray(assignments) && Array.isArray(subjects) && 
                [...new Set(assignments.map(a => a.materiaId))]
                .slice(0, 3)
                .map(materiaId => {
                  const materia = subjects.find(s => s.id === materiaId);
                  return (
                    <Badge key={materiaId} variant="outline" className="bg-indigo-50">
                      {materia ? materia.nombre : 'Materia no asignada'}
                    </Badge>
                  );
                })
              }
              {Array.isArray(assignments) && 
                [...new Set(assignments.map(a => a.materiaId))].length > 3 && (
                <Badge variant="outline" className="bg-indigo-50">
                  +{[...new Set(assignments.map(a => a.materiaId))].length - 3} más
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta: Promedio de calificaciones */}
        <Card className="p-4 shadow-sm border-l-4 border-l-green-500 border-muted hover:border-muted-foreground/20 transition-colors">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-green-500" />
                <p className="font-medium">Promedio general</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calificaciones')}>
                <span className="text-xs">Ver detalle</span>
              </Button>
            </div>
            {isLoadingGradeStats ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : !gradeSummary.hasData ? (
              <div className="text-center py-3">
                <p className="text-sm text-muted-foreground">No hay calificaciones registradas aún para este grupo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-green-600">
                  {gradeStats.promedioGeneral}
                </h3>
                <Progress value={parseFloat(gradeStats.promedioGeneral) * 10} className="h-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Aprobados:</span>
                  <span className="font-medium">{gradeStats.porcentajeAprobados}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarjeta: Asistencia */}
        <Card className="p-4 shadow-sm border-l-4 border-l-amber-500 border-muted hover:border-muted-foreground/20 transition-colors">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-amber-500" />
                <p className="font-medium">Asistencia</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/asistencias')}>
                <span className="text-xs">Ver detalle</span>
              </Button>
            </div>
            {isLoadingAttendance ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : !attendanceSummary.hasData ? (
              <div className="text-center py-3">
                <p className="text-sm text-muted-foreground">No hay registros de asistencia aún para este grupo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-amber-600">
                  {`${attendanceStats.porcentajeAsistencia}%`}
                </h3>
                <Progress value={parseInt(attendanceStats.porcentajeAsistencia)} className="h-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Presentes/Total:</span>
                  <span className="font-medium">{attendanceStats.presentes || 0}/{attendanceStats.totalRegistros || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sección central - Horario de hoy y tareas pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
        {/* Horario del día (3 columnas en desktop) */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Horario de hoy ({daysOfWeek[today.getDay()]})
            </CardTitle>
            <CardDescription>
              {today.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoadingSchedule ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.map((session) => (
                  <div key={session.id} className="flex items-start space-x-4 p-3 rounded-md border border-muted hover:bg-muted/30 transition-colors">
                    <div className="bg-primary/10 text-primary rounded-md p-2.5 flex-shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{session.materiaNombre}</h4>
                        <Badge variant="outline" className="rounded-md">
                          {session.horaInicio} - {session.horaFin}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Grupo {session.grupoNombre} - Aula {session.aula || 'No asignada'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-base font-medium">No hay clases programadas</h3>
                <p className="text-sm text-muted-foreground">No tienes clases asignadas para hoy</p>
              </div>
            )}
          </CardContent>
          {todaySchedule.length > 0 && (
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full text-center" onClick={() => navigate('/profesor/horario')}>
                Ver horario completo
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Tareas pendientes (2 columnas en desktop) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-4 w-4 text-primary" />
              Tareas pendientes por calificar
            </CardTitle>
            <CardDescription>
              Tareas enviadas por los estudiantes que requieren tu atención
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoadingTasks ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingTasks.length > 0 ? (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-md border border-muted hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{task.titulo}</h4>
                      <Badge 
                        variant={
                          task.estado === 'entregada' ? 'secondary' :
                          task.estado === 'retrasada' ? 'destructive' :
                          'outline'
                        }
                      >
                        {task.estado === 'entregada' ? 'Por calificar' :
                         task.estado === 'retrasada' ? 'Retrasada' :
                         'Pendiente'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center justify-between">
                      <span>{task.grupoNombre} - {task.materiaNombre}</span>
                      <span>{task.entregasPendientes || 0} entregas</span>
                    </div>
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs w-full"
                        onClick={() => navigate(`/tareas/${task.id}`)}
                      >
                        Ver entregas
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <CheckCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-base font-medium">¡Todo al día!</h3>
                <p className="text-sm text-muted-foreground">No hay tareas pendientes por calificar</p>
              </div>
            )}
          </CardContent>
          {pendingTasks.length > 0 && (
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full text-center" onClick={() => navigate('/tareas')}>
                Ver todas las tareas
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Sección inferior - Acciones rápidas */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/asistencias')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <ClipboardCheck className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Tomar asistencia</h3>
              <p className="text-sm text-muted-foreground">Registrar asistencias</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/grades/selector')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <LineChart className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Registrar calificaciones</h3>
              <p className="text-sm text-muted-foreground">Capturar notas</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/tareas/nueva')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <ListTodo className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Asignar tarea</h3>
              <p className="text-sm text-muted-foreground">Crear nueva tarea</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/comunicacion/mensajes')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <MessageSquare className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Enviar mensaje</h3>
              <p className="text-sm text-muted-foreground">Comunicarse con padres</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/boletas')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <FileText className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Generar boletas</h3>
              <p className="text-sm text-muted-foreground">Reportes académicos</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sección: Asistente Pedagógico IA */}
      <div className="mt-8">
        <Card className="shadow-sm border border-muted">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">🎯 Asistente Pedagógico IA</h2>
              </div>
              
              <p className="text-muted-foreground">
                Accede al espacio donde podrás generar recomendaciones, planes de recuperación y reportes individuales con ayuda de la inteligencia artificial.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-primary">📊</span>
                  <span>Diagnóstico Grupal</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary">🎓</span>
                  <span>Seguimiento Individual</span>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate('/profesor/asistente-pedagogico')}
                className="mt-2"
              >
                Ir al Asistente Pedagógico IA
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección: Resumen académico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Estadísticas de rendimiento */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Rendimiento académico
            </CardTitle>
            <CardDescription>
              Estadísticas de calificaciones por grupos y materias
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoadingGradeStats ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !gradeSummary.hasData ? (
              <div className="text-center py-6 border border-dashed rounded-lg">
                <LineChart className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-base font-medium">Sin datos de calificaciones</h3>
                <p className="text-sm text-muted-foreground">No hay calificaciones registradas para este grupo</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Promedio general</p>
                    <h3 className="text-2xl font-bold text-primary">{gradeSummary.average}</h3>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Aprobados</p>
                    <h3 className="text-2xl font-bold text-green-500">{gradeSummary.approved}%</h3>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Mejores alumnos</h4>
                  {gradeStats && Array.isArray(gradeStats.mejoresAlumnos) && gradeStats.mejoresAlumnos.length > 0 ? (
                    <div className="space-y-2">
                      {gradeStats.mejoresAlumnos.slice(0, 3).map((student, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback>{student.nombre?.charAt(0) || 'A'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{student.nombre}</span>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {student.promedio}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No hay alumnos con calificaciones</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estadísticas de asistencia */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Asistencia escolar
            </CardTitle>
            <CardDescription>
              Estadísticas de asistencia por grupos y alumnos
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoadingAttendance ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !attendanceSummary.hasData ? (
              <div className="text-center py-6 border border-dashed rounded-lg">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-base font-medium">Sin datos de asistencia</h3>
                <p className="text-sm text-muted-foreground">No hay registros de asistencia para este grupo</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Asistencia general</p>
                    <h3 className="text-2xl font-bold text-primary">{attendanceSummary.percentage}%</h3>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Presentes/Total</p>
                    <h3 className="text-2xl font-bold text-amber-500">
                      {attendanceStats.presentes || 0}/{attendanceStats.totalRegistros || 0}
                    </h3>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Registro de asistencia</h4>
                  {attendanceStats && Array.isArray(attendanceStats.alumnosMenosAsistencia) && attendanceStats.alumnosMenosAsistencia.length > 0 ? (
                    <div className="space-y-2">
                      {attendanceStats.alumnosMenosAsistencia.slice(0, 3).map((student, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback>{student.nombre?.charAt(0) || 'A'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{student.nombre}</span>
                          </div>
                          <Badge variant="outline" className={student.porcentaje > 80 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                            {student.porcentaje}% ({student.presentes}/{student.total})
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No hay registros de asistencia</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}