import React from "react";
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
  CreditCard,
  CheckCircle as CheckCircle2,
  Brain,
  Bell,
  Receipt,
  User,
  ListTodo,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * Dashboard principal del Portal para Padres
 * Muestra un resumen de la información más relevante para los padres
 */
export default function ParentDashboard() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // Consulta para obtener los hijos vinculados del padre
  const { 
    data: children = [], 
    isLoading: isLoadingChildren
  } = useQuery({
    queryKey: [`/api/parents/${user?.id}/students`],
    enabled: !!user?.id && user?.rol === "padre",
  });

  // Seleccionar el primer hijo para mostrar su información en el dashboard
  const selectedStudent = Array.isArray(children) && children.length > 0 ? children[0].id : null;

  // Query para obtener datos de estado de cuenta para el dashboard
  const {
    data: accountStatement = {},
    isLoading: isLoadingAccount
  } = useQuery({
    queryKey: [selectedStudent ? `/api/estado-cuenta/${selectedStudent}` : null],
    enabled: !!selectedStudent,
  });

  // Consultar tareas pendientes
  const {
    data: tasks = [],
    isLoading: isLoadingTasks
  } = useQuery({
    queryKey: [selectedStudent ? `/api/tasks/student/${selectedStudent}` : null],
    enabled: !!selectedStudent,
  });

  // Consultar asistencias
  const {
    data: attendance = [],
    isLoading: isLoadingAttendance
  } = useQuery({
    queryKey: [selectedStudent ? `/api/students/${selectedStudent}/attendance` : null],
    enabled: !!selectedStudent,
  });

  // Consultar avisos escolares
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications
  } = useQuery({
    queryKey: ['/api/notices'],
    enabled: true,
  });

  // Función para calcular adeudos pendientes correctamente
  const getPendingDebtTotal = () => {
    if (!accountStatement?.debts || !Array.isArray(accountStatement.debts)) {
      return 0;
    }
    
    // Filtrar solo adeudos pendientes (no pagados)
    const pendingDebts = accountStatement.debts.filter((debt: any) => 
      debt.estatus !== 'pagado'
    );
    
    // Sumar los montos de adeudos pendientes
    return pendingDebts.reduce((total: number, debt: any) => {
      return total + (parseFloat(debt.montoTotal?.toString() || '0'));
    }, 0);
  };

  if (isLoadingChildren) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin text-primary mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Cargando información del dashboard...</p>
        </div>
      </div>
    );
  }

  // Calcular estadísticas de asistencia
  const attendanceStats = Array.isArray(attendance) ? {
    total: attendance.length,
    present: attendance.filter(a => a.asistencia).length,
    absent: attendance.filter(a => !a.asistencia).length,
    percentage: attendance.length > 0 
      ? Math.round((attendance.filter(a => a.asistencia).length / attendance.length) * 100) 
      : 100
  } : { total: 0, present: 0, absent: 0, percentage: 100 };

  // Calcular tareas pendientes
  const taskStats = Array.isArray(tasks) ? {
    total: tasks.length,
    completed: tasks.filter(t => t.estado === 'entregada' || t.estado === 'calificada').length,
    pending: tasks.filter(t => t.estado === 'pendiente' || t.estado === 'retrasada').length,
    percentage: tasks.length > 0 
      ? Math.round((tasks.filter(t => t.estado === 'entregada' || t.estado === 'calificada').length / tasks.length) * 100) 
      : 100
  } : { total: 0, completed: 0, pending: 0, percentage: 100 };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Resumen Familiar</h1>
          <p className="text-muted-foreground">
            Resumen general de la información escolar de tus hijos
          </p>
        </div>
      </div>

      {/* Tarjetas de estudiantes - Con scroll horizontal responsivo */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Mis hijos</h2>
        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
             style={{ scrollSnapType: 'x mandatory' }}>
          {Array.isArray(children) && children.map((child) => (
          <Card 
            key={child.id} 
            className="min-w-[280px] overflow-hidden hover:shadow-md transition-all duration-300 flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={child.fotoUrl || ""} alt={child.nombreCompleto} />
                  <AvatarFallback>{child.nombreCompleto?.charAt(0) || "E"}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{child.nombreCompleto}</CardTitle>
                  <CardDescription>
                    {child.nivel} • {child.grupo || "Sin grupo"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 text-xs"
                  onClick={() => navigate(`/portal-padres/boletas/${child.id}`)}
                >
                  <FileText className="h-3 w-3" />
                  Ver Boletas
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 text-xs"
                  onClick={() => navigate(`/portal-padres/estado-cuenta?studentId=${child.id}`)}
                >
                  <Receipt className="h-3 w-3" />
                  Estado de Cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
        
        {/* Resumen de Logros por Alumno */}
        {Array.isArray(children) && children.map((child) => {
          // Generar logros basados en datos ya disponibles para este alumno específico
          const logros = [];
          
          // Solo mostrar logros si tenemos datos del alumno seleccionado
          if (selectedStudent && selectedStudent.id === child.id) {
            // Verificar asistencia (usando datos disponibles)
            if (attendanceStats.percentage >= 100) {
              logros.push("✅ Asistencia perfecta esta semana");
            } else if (attendanceStats.percentage >= 90) {
              logros.push("📈 Excelente asistencia semanal");
            }
            
            // Verificar tareas (usando datos disponibles)
            if (taskStats.pending === 0 && taskStats.total > 0) {
              logros.push("📚 Todas las tareas entregadas a tiempo");
            } else if (taskStats.completed > 0) {
              logros.push("✏️ Tareas completadas satisfactoriamente");
            }
            
            // Verificar adeudos (usando datos del estado de cuenta)
            if (accountStatement && typeof accountStatement === 'object' && 'totalDebt' in accountStatement) {
              if (accountStatement.totalDebt === "0" || !accountStatement.totalDebt) {
                logros.push("💳 Sin adeudos pendientes");
              }
            }
          }
          
          // Siempre agregar logros básicos disponibles
          if (child.id) {
            logros.push("📋 Boleta académica disponible para consulta");
          }
          
          // Agregar logro general si hay algunos logros
          if (logros.length >= 2) {
            logros.push("🌟 Buen desempeño general este mes");
          }
          
          return (
            <Card key={`logros-${child.id}`} className="mt-4 bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 rounded-lg shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  ⭐ Resumen del Mes – {child.nombreCompleto}
                </CardTitle>
                <div className="text-xs text-gray-500 mt-1">
                  Periodo: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </div>
              </CardHeader>
              <CardContent>
                {logros.length > 0 ? (
                  <div className="space-y-2">
                    {logros.slice(0, 3).map((logro, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-gray-700 py-1">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="flex-1">{logro}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <div className="text-2xl mb-2">⭐</div>
                    <p className="text-sm text-gray-600">
                      Este mes no hay logros destacados registrados aún.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ¡Ánimo para el siguiente!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dashboard de tarjetas resumen */}
      {selectedStudent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* Tarjeta de Adeudos */}
          <Card className={`p-4 shadow-sm border-l-4 transition-colors ${
            !isLoadingAccount && getPendingDebtTotal() === 0
              ? 'border-l-gray-400 border-gray-200 bg-gray-50 hover:border-gray-300' 
              : 'border-l-red-500 border-muted hover:border-muted-foreground/20'
          }`}>
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isLoadingAccount && getPendingDebtTotal() === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-gray-500" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-red-500" />
                  )}
                  <p className="font-medium">Saldo Pendiente del Periodo</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/portal-padres/estado-cuenta')}>
                  <span className="text-xs">Ver detalle</span>
                </Button>
              </div>
              {!isLoadingAccount && getPendingDebtTotal() === 0 ? (
                <div>
                  <h3 className="text-xl font-bold text-gray-500">
                    $0.00 MXN
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Todos los adeudos han sido cubiertos</p>
                </div>
              ) : (
                <h3 className="text-xl font-bold text-red-500">
                  {isLoadingAccount ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `$${new Intl.NumberFormat('es-MX').format(getPendingDebtTotal())} MXN`
                  )}
                </h3>
              )}
            </CardContent>
          </Card>

          {/* Tarjeta de Pagos */}
          <Card className="p-4 shadow-sm border-l-4 border-l-green-500 bg-green-50 border-green-200 hover:border-green-300 transition-colors">
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isLoadingAccount && accountStatement && accountStatement.balance < 0 ? (
                    <span className="text-lg">💰</span>
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  <p className="font-medium">Total Pagado del Periodo</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/portal-padres/historial-pagos')}>
                  <span className="text-xs">Ver historial</span>
                </Button>
              </div>
              <h3 className="text-xl font-bold text-green-600">
                {isLoadingAccount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : accountStatement && accountStatement.totalPaid ? (
                  `$${new Intl.NumberFormat('es-MX').format(parseFloat(accountStatement.totalPaid))} MXN`
                ) : (
                  "$0.00 MXN"
                )}
              </h3>
              {!isLoadingAccount && accountStatement && accountStatement.balance < 0 && (
                <p className="text-xs text-green-600 mt-1">Saldo suficiente para cubrir adeudos</p>
              )}
            </CardContent>
          </Card>

          {/* Tarjeta de Asistencias - temporalmente deshabilitada */}
          {import.meta.env.VITE_SHOW_ATTENDANCE_MODULE === 'true' && (
            <Card className="p-4 shadow-sm border-l-4 border-l-blue-500 border-muted hover:border-muted-foreground/20 transition-colors">
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <p className="font-medium">Asistencia</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/portal-padres/asistencias')}>
                    <span className="text-xs">Ver detalle</span>
                  </Button>
                </div>
                <div className="space-y-2">
                  <Progress value={attendanceStats.percentage} className="h-2" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Asistencias: {attendanceStats.present}</span>
                    <span className="font-medium">{attendanceStats.percentage}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tarjeta de Tareas */}
          <Card className="p-4 shadow-sm border-l-4 border-l-amber-500 border-muted hover:border-muted-foreground/20 transition-colors">
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-amber-500" />
                  <p className="font-medium">Tareas</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/portal-padres/tareas')}>
                  <span className="text-xs">Ver todas</span>
                </Button>
              </div>
              <div className="space-y-2">
                <Progress value={taskStats.percentage} className="h-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Completadas: {taskStats.completed}/{taskStats.total}</span>
                  <span className="font-medium">{taskStats.pending} pendientes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sección: Próximas actividades y Avisos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Tarjeta: Próximas tareas */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Próximas tareas
            </CardTitle>
            {/* Mini resumen de tareas */}
            {Array.isArray(tasks) && tasks.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Tareas completadas: {taskStats.completed} / Pendientes: {taskStats.pending}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingTasks ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : Array.isArray(tasks) && tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 pb-3 border-b border-muted">
                    <div className={
                      task.estado === 'calificada' ? "h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0" :
                      task.estado === 'entregada' ? "h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0" :
                      task.estado === 'retrasada' ? "h-8 w-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0" :
                      "h-8 w-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"
                    }>
                      {task.estado === 'calificada' ? <CheckCircle2 className="h-4 w-4" /> :
                       task.estado === 'entregada' ? <Clock className="h-4 w-4" /> :
                       task.estado === 'retrasada' ? <XCircle className="h-4 w-4" /> :
                       <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{task.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.materia} - Entrega: {new Date(task.fechaEntrega).toLocaleDateString()}
                      </p>
                      <Badge className="mt-1" variant={
                        task.estado === 'calificada' ? "default" :
                        task.estado === 'entregada' ? "secondary" :
                        task.estado === 'retrasada' ? "destructive" :
                        "outline"
                      }>
                        {task.estado === 'calificada' ? "Calificada" :
                         task.estado === 'entregada' ? "Entregada" :
                         task.estado === 'retrasada' ? "Retrasada" :
                         "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">📝</div>
                <h3 className="text-sm font-medium mb-1">Sin tareas pendientes</h3>
                <p className="text-xs text-muted-foreground">No hay tareas asignadas actualmente.</p>
              </div>
            )}
          </CardContent>
          {Array.isArray(tasks) && tasks.length > 0 && (
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full text-center" onClick={() => navigate('/portal-padres/tareas')}>
                Ver todas las tareas
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Tarjeta: Avisos escolares */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Avisos escolares recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingNotifications ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : Array.isArray(notifications) && notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.slice(0, 3).map((notice) => (
                  <div key={notice.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{notice.titulo}</h3>
                      <Badge>{new Date(notice.fechaPublicacion).toLocaleDateString()}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{notice.contenido}</p>
                    {notice.adjuntoUrl && (
                      <div className="flex items-center gap-2 text-primary text-sm">
                        <FileText className="h-4 w-4" />
                        <a href={notice.adjuntoUrl} target="_blank" rel="noopener noreferrer">
                          Ver adjunto
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">📢</div>
                <div className="text-2xl mb-3">📭</div>
                <h3 className="text-sm font-medium mb-2">No hay avisos escolares por ahora</h3>
                <p className="text-xs text-muted-foreground">Te notificaremos cuando se publique alguno.</p>
              </div>
            )}
          </CardContent>
          {Array.isArray(notifications) && notifications.length > 0 && (
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full text-center" onClick={() => navigate('/portal-padres/avisos')}>
                Ver todos los avisos
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Sección: Accesos rápidos */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/portal-padres/boletas')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <FileText className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Boletas Académicas</h3>
              <p className="text-sm text-muted-foreground">Consulta calificaciones</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/portal-padres/resumen-ia')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Brain className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Resumen IA</h3>
              <p className="text-sm text-muted-foreground">Análisis inteligente</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/portal-padres/estado-cuenta')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Estado de Cuenta</h3>
              <p className="text-sm text-muted-foreground">Pagos y adeudos</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/portal-padres/chatbot')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <MessageSquare className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Chatbot</h3>
              <p className="text-sm text-muted-foreground">Asistente inteligente</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}