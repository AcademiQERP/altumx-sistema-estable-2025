import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAuthHeaders, getAuthToken } from "@/services/auth-service";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AvisoVacio } from "@/components/ui/aviso-vacio";
import { 
  processDebtsWithLateFees, 
  calculateTotalWithLateFees,
  LateFeesConfig 
} from '@/utils/late-fees';
import { formatCurrency } from '@/utils/payment-concept-utils';
import { safeGradeFormat, safeAverageCalculation, getMissingGradeText } from '@/utils/grade-validation';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  MessageSquare, 
  Loader2, 
  GraduationCap, 
  Receipt, 
  CheckSquare,
  SendHorizontal,
  Bot,
  Bell,
  BookOpen, 
  Calendar, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Download, 
  ExternalLink, 
  Brain, 
  ClipboardCopy,
  TrendingUp,
  TrendingDown,
  Minus,
  User, 
  CheckCircle, 
  ArrowRight,
  Book,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { EstadoCuentaResumen } from "@/components/financials/EstadoCuentaResumen";

// Componente principal del Portal para Padres
// Tab de Boletas Académicas
function BoletasTab({ studentId }: { studentId: number }) {
  const [location, navigate] = useLocation();
  
  useEffect(() => {
    if (studentId) {
      // Redirigir a la página de boleta académica con el ID del estudiante
      navigate(`/portal-padres/boleta/${studentId}`);
    }
  }, [studentId, navigate]);

  return (
    <div className="p-8 flex justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function ParentPortal() {
  // Hooks básicos
  const { user, isLoading: authLoading } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [location, navigate] = useLocation();
  
  // Obtener el parámetro tab de la URL si existe
  const searchParams = new URLSearchParams(useSearch());
  const urlTabParam = searchParams.get("tab");
  
  // Determinar la pestaña activa basada en la ruta actual
  let routeTab = '';
  if (location.includes('/portal-padres/boletas')) routeTab = 'boletas';
  else if (location.includes('/portal-padres/resumen-ia')) routeTab = 'resumen-ia';
  else if (location.includes('/portal-padres/chatbot')) routeTab = 'chatbot';
  else if (location.includes('/portal-padres/asistencias')) routeTab = 'asistencias';
  else if (location.includes('/portal-padres/tareas')) routeTab = 'tareas';
  else if (location.includes('/portal-padres/estado-cuenta')) routeTab = 'estado-cuenta';
  else if (location.includes('/portal-padres/avisos')) routeTab = 'avisos';
  else if (location.includes('/portal-padres/agenda')) routeTab = 'agenda';
  
  // Redirigir a la página de dashboard cuando se está en la ruta principal del portal
  useEffect(() => {
    if (location === '/portal-padres') {
      console.log("🔀 Redirigiendo automáticamente a /portal-padres/dashboard");
      navigate('/portal-padres/dashboard');
    }
  }, [location, navigate]);
  
  // Priorizar la ruta actual por encima del parámetro de consulta
  const tabParam = routeTab || urlTabParam || "dashboard";
  
  // Si la URL cambia, actualizar la pestaña activa
  useEffect(() => {
    // Capturar la URL completa, incluido el pathname
    const fullPath = location;
    
    // Determinar la pestaña a partir de la URL
    if (fullPath.includes('/portal-padres/boletas')) {
      // No redirigir si ya estamos en la pestaña correcta
      if (tabParam !== 'boletas') {
        console.log("🔄 Sincronizando ruta con pestaña: boletas");
      }
    } else if (fullPath.includes('/portal-padres/resumen-ia')) {
      if (tabParam !== 'resumen-ia') {
        console.log("🔄 Sincronizando ruta con pestaña: resumen-ia");
      }
    } else if (fullPath.includes('/portal-padres/chatbot')) {
      if (tabParam !== 'chatbot') {
        console.log("🔄 Sincronizando ruta con pestaña: chatbot");
      }
    } else if (fullPath.includes('/portal-padres/asistencias')) {
      if (tabParam !== 'asistencias') {
        console.log("🔄 Sincronizando ruta con pestaña: asistencias");
      }
    } else if (fullPath.includes('/portal-padres/tareas')) {
      if (tabParam !== 'tareas') {
        console.log("🔄 Sincronizando ruta con pestaña: tareas");
      }
    } else if (fullPath.includes('/portal-padres/estado-cuenta')) {
      if (tabParam !== 'estado-cuenta') {
        console.log("🔄 Sincronizando ruta con pestaña: estado-cuenta");
      }
    } else if (fullPath.includes('/portal-padres/avisos')) {
      if (tabParam !== 'avisos') {
        console.log("🔄 Sincronizando ruta con pestaña: avisos");
      }
    }
  }, [location, tabParam]);
  
  // Consulta para obtener los hijos vinculados del padre
  const { 
    data: children = [], 
    isLoading: isLoadingChildren,
    error: childrenError
  } = useQuery({
    queryKey: [`/api/parents/${user?.id}/students`],
    enabled: !!user?.id && user?.rol === "padre",
    retry: 3,
    retryDelay: 1000
  });
  
  // Query para obtener datos de estado de cuenta para el dashboard
  const {
    data: accountStatement = {},
    isLoading: isLoadingAccount
  } = useQuery({
    queryKey: [selectedStudent ? `/api/estado-cuenta/${selectedStudent}` : null],
    enabled: !!selectedStudent,
    retry: 3,
    retryDelay: 1000
  });

  // Query para obtener configuración de recargos por mora
  const { data: lateFeesConfig } = useQuery({
    queryKey: ['/api/institution/late-fees-config'],
    retry: 1,
  });
  
  // Estados de carga consolidados
  const isLoading = authLoading || isLoadingChildren;
  
  // Redireccionar si no es un usuario con rol de padre o si no está autenticado
  useEffect(() => {
    if (!authLoading && (!user || user.rol !== "padre")) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Seleccionar automáticamente el primer hijo si hay alguno y no hay ninguno seleccionado
  useEffect(() => {
    if (Array.isArray(children) && children.length > 0 && !selectedStudent) {
      setSelectedStudent(children[0].id);
    }
  }, [children, selectedStudent]);
  
  // Mostrar estado de carga mientras se verifica autenticación o se cargan los hijos
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (childrenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-xl font-semibold text-destructive">
          Error al cargar la información de los hijos
        </h1>
        <p className="text-muted-foreground">{(childrenError as Error).message}</p>
        <Button asChild>
          <Link href="/portal-padres">Volver al Portal de Padres</Link>
        </Button>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-xl font-semibold">No tiene hijos registrados</h1>
        <p className="text-muted-foreground">
          No se encontraron estudiantes asociados a su cuenta de padre.
        </p>
        <div className="border border-amber-200 bg-amber-50 p-4 rounded-md mt-4 max-w-lg text-amber-800">
          <h2 className="text-lg font-medium flex items-center gap-2 mb-2">
            <Bell className="h-5 w-5" />
            ¿Cómo vincular a mis hijos?
          </h2>
          <p className="text-sm">
            Para vincular a sus hijos, por favor contacte al administrador de la escuela.
            Solo un administrador puede crear las vinculaciones entre padres y alumnos.
          </p>
        </div>
        <Button asChild className="mt-4">
          <Link href="/portal-padres">Volver al Portal de Padres</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Portal para Padres</h1>
      
      {/* Selector de estudiante con tarjeta informativa */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex justify-between items-center">
              <span>Estudiantes vinculados a su cuenta</span>
              <Badge className="ml-2 bg-green-600 hover:bg-green-700" variant="secondary">
                {children.length} estudiante{children.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Elija un estudiante para ver su información académica detallada
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          {children.map((child) => (
            <Card 
              key={child.id} 
              className={`w-full sm:w-64 cursor-pointer hover:shadow-lg transition-all duration-300 ${
                selectedStudent === child.id ? "border-primary border-2 shadow-md" : "border border-muted"
              }`}
              onClick={() => setSelectedStudent(child.id)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center mb-3">
                  <Avatar className="h-24 w-24 mb-3">
                    <AvatarImage src={child.fotoUrl || "/images/avatar-generic.png"} alt={child.nombreCompleto} />
                    <AvatarFallback className="text-xl">
                      {child.nombreCompleto
                        .split(' ')
                        .map(name => name[0])
                        .slice(0, 2)
                        .join('')
                      }
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-lg font-bold line-clamp-2 mb-1">{child.nombreCompleto}</h2>
                  <Badge className="mb-2" variant={selectedStudent === child.id ? "default" : "outline"}>
                    {child.tipoVinculacion || "Hijo/a"}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">Grupo</p>
                      {child.grupo ? (
                        <p className="text-gray-600">{child.grupo}</p>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Sin asignar</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">Ciclo escolar</p>
                      <p className="text-gray-600">{child.cicloEscolar || "2024-2025"}</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant={selectedStudent === child.id ? "default" : "outline"} 
                  className="w-full mt-4 flex items-center justify-center gap-2"
                  onClick={() => setSelectedStudent(child.id)}
                >
                  <FileText className="h-4 w-4" /> 
                  {selectedStudent === child.id ? "Seleccionado" : "Ver detalle"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Dashboard de tarjetas resumen y agenda */}
      {selectedStudent && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 mb-4">
          {/* Las tarjetas financieras han sido movidas al componente Estado de Cuenta para evitar duplicación */}
          

        </div>
      )}
      
      {/* Contenido del portal */}
      {selectedStudent && (
        <div className="w-full mt-4">
          {tabParam === "boletas" && <BoletasTab studentId={selectedStudent} />}
          {tabParam === "resumen-ia" && <AcademicSummaryTab studentId={selectedStudent} />}
          {tabParam === "chatbot" && <ChatbotTab studentId={selectedStudent} />}
          {tabParam === "asistencias" && <AttendanceTab studentId={selectedStudent} />}
          {tabParam === "tareas" && <TasksTab studentId={selectedStudent} />}
          {tabParam === "estado-cuenta" && <AccountStatementTab studentId={selectedStudent} />}
          {tabParam === "avisos" && <NotificationsTab parentId={user!.id} />}
        </div>
      )}
    </div>
  );
}

// El componente GradesTab (antiguo sistema de calificaciones) ha sido eliminado.
// La funcionalidad ha sido reemplazada completamente por el nuevo sistema de boletas académicas (BoletasTab)
// que proporciona una experiencia mejorada con evaluación por criterios y diseño moderno.

// Tab de Asistencias
function AttendanceTab({ studentId }: { studentId: number }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const { 
    data: attendance = [], 
    isLoading,
    error
  } = useQuery({
    queryKey: [`/api/students/${studentId}/attendance`],
    enabled: !!studentId,
    retry: 3,
    retryDelay: 1000
  });

  // Función para calcular estadísticas de asistencia
  const calculateAttendanceStats = (records: any[]) => {
    if (!records || records.length === 0) return { total: 0, present: 0, absent: 0, percentage: 0 };
    
    const total = records.length;
    const present = records.filter((r: any) => r.asistencia).length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { total, present, absent, percentage };
  };

  // Función para obtener el nombre del mes
  const getMonthName = (monthIndex: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  };

  // Filtrar registros por mes seleccionado
  const filteredAttendance = Array.isArray(attendance) ? attendance.filter((record: any) => {
    const recordDate = new Date(record.fecha);
    return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
  }) : [];

  // Calcular estadísticas del mes actual y anterior
  const currentMonthStats = calculateAttendanceStats(filteredAttendance);
  const previousMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const previousYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  
  const previousMonthRecords = Array.isArray(attendance) ? attendance.filter((record: any) => {
    const recordDate = new Date(record.fecha);
    return recordDate.getMonth() === previousMonth && recordDate.getFullYear() === previousYear;
  }) : [];
  
  const previousMonthStats = calculateAttendanceStats(previousMonthRecords);

  // Calcular tendencia
  const getTrendIcon = () => {
    if (previousMonthStats.percentage === 0) return <Minus className="h-4 w-4 text-gray-500" />;
    if (currentMonthStats.percentage > previousMonthStats.percentage) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (currentMonthStats.percentage < previousMonthStats.percentage) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendText = () => {
    if (previousMonthStats.percentage === 0) return "Sin comparación";
    const diff = currentMonthStats.percentage - previousMonthStats.percentage;
    if (diff > 0) return `+${diff}% vs. ${getMonthName(previousMonth)}`;
    if (diff < 0) return `${diff}% vs. ${getMonthName(previousMonth)}`;
    return `Sin cambio vs. ${getMonthName(previousMonth)}`;
  };

  // Función para obtener el color y texto de justificación
  const getJustificationBadge = (justificacion: string, asistencia: boolean) => {
    if (asistencia) return null; // No mostrar badge si asistió
    
    if (!justificacion || justificacion === "Sin justificación") {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">⚠️ No justificada</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">✅ Justificada</Badge>;
  };

  // Función para generar el bloque interpretativo
  const getInterpretativeMessage = () => {
    const unjustifiedAbsences = filteredAttendance.filter((record: any) => 
      !record.asistencia && (!record.justificacion || record.justificacion === "Sin justificación")
    ).length;

    if (currentMonthStats.percentage >= 95) {
      return {
        icon: "🌟",
        title: "¡Excelente asistencia!",
        message: "Tu hijo/a tuvo una asistencia excelente este mes. ¡Mantén esta constancia!",
        color: "bg-green-50 border-green-200 text-green-800"
      };
    } else if (currentMonthStats.percentage >= 85) {
      return {
        icon: "👍",
        title: "Buena asistencia",
        message: "Tu hijo/a tuvo una asistencia sólida este mes. ¡Gracias por tu seguimiento!",
        color: "bg-blue-50 border-blue-200 text-blue-800"
      };
    } else if (unjustifiedAbsences >= 2) {
      return {
        icon: "⚠️",
        title: "Atención requerida",
        message: "Tu hijo/a presentó inasistencias sin justificar. Revisa el historial y contacta a coordinación si es necesario.",
        color: "bg-yellow-50 border-yellow-200 text-yellow-800"
      };
    } else {
      return {
        icon: "📋",
        title: "Revisar asistencia",
        message: "La asistencia puede mejorar. Te recomendamos revisar las fechas y justificar las ausencias correspondientes.",
        color: "bg-orange-50 border-orange-200 text-orange-800"
      };
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Error: {(error as Error).message}</p>
      </div>
    );
  }

  if (!Array.isArray(attendance) || attendance.length === 0) {
    return (
      <AvisoVacio
        titulo="Sin registros de asistencia"
        mensaje="Los registros de asistencia se actualizarán diariamente una vez iniciado el periodo escolar."
        icono="📅"
        ayuda="La asistencia es registrada por los docentes de cada materia y actualizada en el sistema al finalizar cada jornada escolar."
      />
    );
  }

  const interpretativeMessage = getInterpretativeMessage();

  return (
    <Card className="mt-4 shadow-[0_1px_4px_rgba(0,0,0,0.1)] rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
      <CardHeader className="bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-primary-700 flex items-center gap-3">
              📅 Asistencias {getMonthName(selectedMonth)} {selectedYear}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{currentMonthStats.percentage}%</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {getTrendIcon()}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getTrendText()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardTitle>
            <CardDescription className="text-gray-600">
              Historial de asistencia a clases
            </CardDescription>
          </div>
          
          {/* Selector de mes */}
          <Select value={`${selectedYear}-${selectedMonth}`} onValueChange={(value) => {
            const [year, month] = value.split('-');
            setSelectedYear(parseInt(year));
            setSelectedMonth(parseInt(month));
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const monthDate = new Date(selectedYear, i);
                const hasRecords = Array.isArray(attendance) && attendance.some((record: any) => {
                  const recordDate = new Date(record.fecha);
                  return recordDate.getMonth() === i && recordDate.getFullYear() === selectedYear;
                });
                
                return (
                  <SelectItem key={i} value={`${selectedYear}-${i}`} disabled={!hasRecords}>
                    {getMonthName(i)} {selectedYear}
                    {!hasRecords && <span className="ml-2 text-gray-400">(Sin datos)</span>}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Bloque interpretativo */}
        <div className={`p-4 rounded-lg border-2 ${interpretativeMessage.color}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{interpretativeMessage.icon}</span>
            <div>
              <h4 className="font-semibold mb-1">{interpretativeMessage.title}</h4>
              <p className="text-sm">{interpretativeMessage.message}</p>
            </div>
          </div>
        </div>

        {/* Tabla de asistencias */}
        {filteredAttendance.length > 0 ? (
          <Table>
            <TableCaption>
              Registros de {getMonthName(selectedMonth)} {selectedYear} - {filteredAttendance.length} día(s) registrado(s)
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Justificación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {format(new Date(record.fecha), "PPP", { locale: es })}
                  </TableCell>
                  <TableCell>
                    {record.asistencia ? (
                      <Badge className="bg-green-500 hover:bg-green-600">✅ Asistió</Badge>
                    ) : (
                      <Badge variant="destructive">❌ Faltó</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {getJustificationBadge(record.justificacion, record.asistencia) || 
                     <span className="text-gray-500 text-sm">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No hay registros para {getMonthName(selectedMonth)} {selectedYear}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tab de Estado de Cuenta
function AccountStatementTab({ studentId }: { studentId: number }) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [loadingReceiptId, setLoadingReceiptId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("2025-05");
  const [receiptStatus, setReceiptStatus] = useState<Record<number, 'pendiente' | 'solicitado' | 'descargado'>>({});
  const [showConfirmModal, setShowConfirmModal] = useState<{show: boolean, paymentId: number, amount: string, date: string} | null>(null);
  
  const { 
    data: accountStatement, 
    isLoading: isLoadingStatement,
    error
  } = useQuery({
    queryKey: [`/api/estado-cuenta/${studentId}`],
    enabled: !!studentId,
    retry: 3,
    retryDelay: 1000
  });

  // Obtener configuración de recargos por mora
  const { data: lateFeesConfig } = useQuery({
    queryKey: ['/api/institution/late-fees-config'],
    retry: 3,
    retryDelay: 1000
  });

  // Función para calcular el total de adeudos pendientes únicamente
  const getPendingDebtTotal = () => {
    if (!accountStatement || !accountStatement.debts) return 0;
    
    return accountStatement.debts
      .filter((debt: any) => debt.estatus === 'pendiente')
      .reduce((total: number, debt: any) => total + parseFloat(debt.montoTotal || '0'), 0);
  };
  
  // Función para obtener el estado visual del recibo con tooltips explicativos
  const getReceiptStatus = (paymentId: number, hasPdfUrl: boolean) => {
    const status = receiptStatus[paymentId];
    if (status === 'descargado') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">📥 Descargado</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recibo descargado exitosamente</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (status === 'solicitado') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">🕒 En revisión</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recibo en proceso de generación. Disponible en máximo 24 horas.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100">🕒 Pendiente</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Solicita tu recibo haciendo clic en el botón "Solicitar"</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  };

  // Función para mostrar modal de confirmación
  const showReceiptConfirmation = (paymentId: number, amount: string, date: string) => {
    setShowConfirmModal({
      show: true,
      paymentId,
      amount,
      date
    });
  };

  // Función para confirmar descarga de recibo
  const confirmDownloadReceipt = async () => {
    if (!showConfirmModal) return;
    
    const { paymentId } = showConfirmModal;
    setShowConfirmModal(null);
    
    // Actualizar estado a "solicitado"
    setReceiptStatus(prev => ({
      ...prev,
      [paymentId]: 'solicitado'
    }));
    
    await handleDownloadReceipt(paymentId);
  };

  // Función para manejar la descarga de recibos
  const handleDownloadReceipt = async (paymentId: number, pdfUrl?: string) => {
    try {
      setLoadingReceiptId(paymentId);
      
      // Si ya tenemos la URL del PDF, descargar directamente
      if (pdfUrl) {
        try {
          // Realizar la solicitud con los headers de autorización usando el servicio auth
          const response = await fetch(pdfUrl, {
            headers: createAuthHeaders(false)
          });
          
          if (!response.ok) {
            throw new Error(`Error al descargar recibo: ${response.status} ${response.statusText}`);
          }
          
          // Obtener el blob del PDF
          const blob = await response.blob();
          
          // Crear una URL para el blob
          const blobUrl = URL.createObjectURL(blob);
          
          // Crear un enlace y simular el clic para la descarga
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `recibo-${paymentId}.pdf`;
          document.body.appendChild(a);
          a.click();
          
          // Limpieza
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          
          // Actualizar estado a "descargado"
          setReceiptStatus(prev => ({
            ...prev,
            [paymentId]: 'descargado'
          }));

          toast({
            title: "Descarga iniciada",
            description: "El recibo se está descargando",
            variant: "default",
            duration: 3000,
          });
          
          setLoadingReceiptId(null);
          return;
        } catch (error) {
          console.error("Error al descargar recibo desde URL:", error);
          // Si falla la descarga directa, continuar con el flujo normal
        }
      }
      
      // Llamar al endpoint para obtener la información del recibo
      // Verificar que tenemos un token de autenticación usando el servicio
      const token = getAuthToken();
      
      if (!token) {
        toast({
          title: "Sesión no iniciada",
          description: "No se detectó una sesión activa. Por favor, inicia sesión para continuar.",
          variant: "destructive",
          duration: 5000,
        });
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
        throw new Error("Sesión no iniciada. Redirigiendo al inicio de sesión...");
      }
      
      console.log("🔍 Enviando solicitud GET a /api/padres/recibo/" + paymentId);
      console.log("🔑 Token incluido: " + (token ? "Sí" : "No"));
      
      // Usar apiRequest para garantizar que se envíe el token correctamente
      const response = await apiRequest("GET", `/api/padres/recibo/${paymentId}`);
      
      // La función apiRequest ya valida y lanza error si hay problemas,
      // pero igualmente necesitamos manejar los estados específicos
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Sesión expirada",
            description: "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.",
            variant: "destructive",
            duration: 5000,
          });
          setTimeout(() => {
            navigate("/auth");
          }, 2000);
          throw new Error("Sesión expirada. Redirigiendo al inicio de sesión...");
        } else if (response.status === 404) {
          toast({
            title: "Recibo no disponible",
            description: "El recibo aún no está disponible. Estará disponible una vez se confirme el pago.",
            variant: "destructive",
            duration: 5000,
          });
          throw new Error("El recibo aún no está disponible.");
        }
        
        let errorMessage = "Error desconocido";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `Error al obtener el recibo: ${response.status}`;
        } catch (e) {
          errorMessage = `Error al obtener el recibo: Código ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.success && data.pdfUrl) {
        // Si hay una URL de PDF, descargarlo con autorización
        try {
          // Realizar la solicitud con los headers de autorización usando el servicio auth
          const response = await fetch(data.pdfUrl, {
            headers: createAuthHeaders(false)
          });
          
          if (!response.ok) {
            throw new Error(`Error al descargar recibo: ${response.status} ${response.statusText}`);
          }
          
          // Obtener el blob del PDF
          const blob = await response.blob();
          
          // Crear una URL para el blob
          const blobUrl = URL.createObjectURL(blob);
          
          // Crear un enlace y simular el clic para la descarga
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `recibo-${paymentId}.pdf`;
          document.body.appendChild(a);
          a.click();
          
          // Limpieza
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          
          toast({
            title: "Descarga iniciada",
            description: "El recibo se está descargando",
            variant: "default",
            duration: 3000,
          });
        } catch (error) {
          console.error("Error al descargar recibo:", error);
          toast({
            title: "Error al descargar",
            description: "No se pudo descargar el recibo. Por favor, intenta nuevamente.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } else if (data.success && data.emailLog) {
        // Si solo hay email log pero no PDF
        toast({
          title: "Recibo enviado por correo",
          description: "El recibo fue enviado por correo electrónico. Revise su bandeja de entrada.",
        });
      } else {
        // No hay recibo disponible
        toast({
          variant: "destructive",
          title: "Recibo no disponible",
          description: data.message || "No se encontró un recibo asociado a este pago.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Error al descargar el recibo",
      });
    } finally {
      setLoadingReceiptId(null);
    }
  };

  if (isLoadingStatement) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Error: {(error as Error).message}</p>
      </div>
    );
  }

  if (!accountStatement) {
    return (
      <AvisoVacio
        titulo="Estado de cuenta no disponible"
        mensaje="No se pudo cargar la información financiera del estudiante en este momento."
        icono="💰"
        ayuda="El estado de cuenta muestra los conceptos de pago pendientes y el historial de pagos realizados."
      />
    );
  }

  return (
    <div className="mt-4">
      {/* Encabezado mejorado del módulo */}
      <h2 className="text-xl font-semibold text-gray-800 mb-1">
        💳 Estado de Cuenta
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Visualiza los adeudos, pagos realizados y saldos pendientes de tu hijo(a).
      </p>
      
      {/* Contenedor agrupado para resumen + tablas */}
      <div className="bg-white shadow-md rounded-xl p-6 space-y-6">
        {/* Resumen financiero con tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tarjeta 1: Estado Financiero Actual */}
          <Card className={`p-4 rounded-lg border shadow-sm transition-all duration-300 ${
            !isLoadingStatement && accountStatement && accountStatement.balance < 0 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className={`h-5 w-5 ${
                  !isLoadingStatement && accountStatement && accountStatement.balance < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`} />
                <h3 className="text-lg font-semibold">Saldo Pendiente del Periodo</h3>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saldo pendiente</p>
                  <p className={`text-2xl font-bold ${
                    getPendingDebtTotal() === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isLoadingStatement ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      `$${new Intl.NumberFormat('es-MX').format(getPendingDebtTotal())} MXN`
                    )}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700">
                          ℹ️ Ver desglose
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Suma solo de adeudos con estado "pendiente" mostrados en la tabla inferior. 
                          Excluye pagos procesados o confirmados.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <Badge variant={
                    !isLoadingStatement && accountStatement && accountStatement.balance < 0 ? "default" : "destructive"
                  } className="text-sm">
                    {!isLoadingStatement && accountStatement && accountStatement.balance < 0 ? "Al corriente" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 2: Últimos Pagos Realizados */}
          <Card className="p-4 rounded-lg border shadow-sm bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 transition-all duration-300">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Total Pagado del Periodo</h3>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total pagado</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {!isLoadingStatement && accountStatement && accountStatement.totalPaid ? (
                      `$${new Intl.NumberFormat('es-MX').format(parseFloat(accountStatement.totalPaid))} MXN`
                    ) : (
                      "$0.00 MXN"
                    )}
                  </p>
                </div>
                
                {/* Mostrar último pago */}
                {!isLoadingStatement && accountStatement && accountStatement.payments && accountStatement.payments.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Último pago: ${new Intl.NumberFormat('es-MX').format(parseFloat(accountStatement.payments[0].monto))} – {format(new Date(accountStatement.payments[0].fechaPago), "PPP", { locale: es })}
                  </p>
                )}
                
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm text-blue-600 hover:text-blue-700"
                    onClick={() => navigate(`/portal-padres/historial-pagos?student=${studentId}`)}
                  >
                    Ver historial completo →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Separación visual entre tarjetas y tablas */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Adeudos Pendientes</h3>
            {accountStatement.debts && accountStatement.debts.filter((d: any) => d.estatus !== 'pagado').length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/parent-portal/payments/${studentId}`)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Ver Todos
              </Button>
            )}
          </div>
          
          {/* Mostrar mensaje diferente según el estado de los adeudos */}
          {!accountStatement.debts || accountStatement.debts.length === 0 ? (
            <p className="text-muted-foreground">No hay adeudos registrados.</p>
          ) : accountStatement.debts.filter((d: any) => d.estatus !== 'pagado').length === 0 ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✅</span>
                <div>
                  <h4 className="font-semibold text-green-800">No tienes adeudos pendientes</h4>
                  <p className="text-sm text-green-700">Todos los pagos están al corriente.</p>
                </div>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Fecha Límite</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountStatement.debts.map((debt: any) => (
                  <TableRow key={debt.id} className={debt.estatus === 'pendiente' ? 'bg-yellow-50' : ''}>
                    <TableCell className="font-medium">
                      {debt.concepto?.nombre || `Concepto no definido (ID: ${debt.conceptoId})`}
                    </TableCell>
                    <TableCell>
                      {format(new Date(debt.fechaLimite), "PPP", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        {(() => {
                          // Determinar si el pago está vencido
                          const isOverdue = new Date(debt.fechaLimite) < new Date() && debt.estatus !== 'pagado';
                          
                          // Usar configuración real de recargos
                          const config = lateFeesConfig || { recargoHabilitado: false, porcentajeRecargoMora: 10 };
                          
                          let originalAmount = parseFloat(debt.montoTotal);
                          let lateFee = 0;
                          let totalWithLateFee = originalAmount;
                          
                          // Calcular recargo solo si está habilitado y el pago está vencido
                          if (config.recargoHabilitado && isOverdue) {
                            lateFee = originalAmount * (config.porcentajeRecargoMora / 100);
                            totalWithLateFee = originalAmount + lateFee;
                          }
                          
                          return (
                            <>
                              {/* Monto principal */}
                              <div className="font-semibold text-gray-800">
                                {formatCurrency(debt.montoTotal)}
                              </div>
                              
                              {/* Desglose de recargo si aplica */}
                              {config.recargoHabilitado && isOverdue && lateFee > 0 && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded-md mt-1 text-sm text-gray-800">
                                  <p>Monto original: {formatCurrency(originalAmount)}</p>
                                  <p>⚠ Recargo por pago tardío ({config.porcentajeRecargoMora}%): +{formatCurrency(lateFee)}</p>
                                  <div className="flex items-center gap-1">
                                    <strong>Total con recargo: {formatCurrency(totalWithLateFee)}</strong>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3 w-3 text-gray-500 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Este recargo aplica por retraso en el pago, según política institucional.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {debt.estatus === "pagado" ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                            ✅ pagado
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            ⚠️ pendiente
                          </Badge>
                        )}
                        
                        {(() => {
                          // Determinar si el pago está vencido para mostrar badge de recargo
                          const isOverdue = new Date(debt.fechaLimite) < new Date() && debt.estatus !== 'pagado';
                          const defaultConfig = { recargoHabilitado: false, porcentajeRecargoMora: 10 };
                          
                          if (defaultConfig.recargoHabilitado && isOverdue) {
                            return (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">
                                🟡 Con recargo
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {debt.estatus !== 'pagado' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {(() => {
                                // Calcular total con recargo para el botón
                                const isOverdue = new Date(debt.fechaLimite) < new Date() && debt.estatus !== 'pagado';
                                const config = lateFeesConfig || { recargoHabilitado: false, porcentajeRecargoMora: 10 };
                                
                                let totalWithLateFee = parseFloat(debt.montoTotal);
                                if (config.recargoHabilitado && isOverdue) {
                                  const lateFee = totalWithLateFee * (config.porcentajeRecargoMora / 100);
                                  totalWithLateFee = totalWithLateFee + lateFee;
                                }
                                
                                const buttonText = config.recargoHabilitado && isOverdue 
                                  ? `Pagar $${new Intl.NumberFormat('es-MX').format(totalWithLateFee)}`
                                  : 'Realizar Pago';
                                
                                return (
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-white font-medium shadow-sm"
                                    onClick={() => navigate(`/parent-portal/payments/${studentId}/${debt.id}`)}
                                  >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    {buttonText}
                                  </Button>
                                );
                              })()}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Haz clic para realizar el pago de este concepto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Separación visual adicional antes de la tabla de pagos */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <h3 className="text-lg font-semibold">Pagos Realizados</h3>
            
            {/* Selector de período */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">🗓️ Período:</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-05">Mayo 2025</SelectItem>
                  <SelectItem value="2025-04">Abril 2025</SelectItem>
                  <SelectItem value="2025-03">Marzo 2025</SelectItem>
                  <SelectItem value="2025-02">Febrero 2025</SelectItem>
                  <SelectItem value="2025-01">Enero 2025</SelectItem>
                  <SelectItem value="2024-12">Diciembre 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {accountStatement.payments.length === 0 ? (
            <p className="text-muted-foreground">No hay pagos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Recibo</TableHead>
                  <TableHead>Estado del Recibo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountStatement.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.fechaPago), "PPP", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.nombreConcepto || `Concepto no definido (ID: ${payment.conceptoId})`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {payment.metodoPago}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      ${new Intl.NumberFormat('es-MX').format(parseFloat(payment.monto))}
                    </TableCell>
                    <TableCell>
                      {payment.pdfUrl ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1 text-primary"
                          onClick={() => handleDownloadReceipt(payment.id, payment.pdfUrl)}
                          title="Descargar recibo de pago"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Descargar</span>
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={() => showReceiptConfirmation(payment.id, payment.monto.toString(), payment.fechaPago)}
                          disabled={loadingReceiptId === payment.id}
                          title="Solicitar recibo de pago"
                        >
                          {loadingReceiptId === payment.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="hidden sm:inline">Cargando</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">Solicitar</span>
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {getReceiptStatus(payment.id, !!payment.pdfUrl)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Leyenda institucional sobre recargos por mora */}
        <div className="mt-6 p-3 bg-gray-50 border-l-4 border-gray-300 rounded-r-md">
          <p className="text-xs text-gray-600 flex items-start gap-2">
            <span className="text-yellow-600">⚠️</span>
            Los recargos por mora se calculan automáticamente con base en las políticas de tu institución. Consulta con administración para más detalles.
          </p>
        </div>
        
        {/* Modal de confirmación para solicitar recibo */}
        <Dialog 
          open={showConfirmModal?.show || false} 
          onOpenChange={(open) => !open && setShowConfirmModal(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                📄 Confirmar Solicitud de Recibo
              </DialogTitle>
              <DialogDescription>
                ¿Desea solicitar el recibo para el siguiente pago?
              </DialogDescription>
            </DialogHeader>
            
            {showConfirmModal && (
              <div className="space-y-3 py-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Fecha de pago:</div>
                  <div className="font-medium">{format(new Date(showConfirmModal.date), "PPP", { locale: es })}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Monto:</div>
                  <div className="font-medium text-lg text-green-600">${showConfirmModal.amount} MXN</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-800">
                    💡 <strong>Nota:</strong> El recibo será procesado y estará disponible para descarga en un máximo de 24 horas.
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmModal(null)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={confirmDownloadReceipt}
                className="bg-primary hover:bg-primary/90"
              >
                Confirmar Solicitud
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Tab de Tareas
function TasksTab({ studentId }: { studentId: number }) {
  const { 
    data: tasks = [], 
    isLoadingTasks,
    error
  } = useQuery({
    queryKey: [`/api/tasks/student/${studentId}`],
    enabled: !!studentId,
    retry: 3,
    retryDelay: 1000
  });

  if (isLoadingTasks) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Error: {(error as Error).message}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <AvisoVacio
        titulo="Sin tareas pendientes"
        mensaje="No hay tareas o actividades asignadas para este estudiante en este momento."
        icono="📚"
        ayuda="Las tareas son asignadas por los profesores y aparecerán aquí cuando estén disponibles."
        acciones={
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Actualizar
          </Button>
        }
      />
    );
  }
  
  return (
    <div className="space-y-6 mt-4">
      <Card className="shadow-[0_1px_4px_rgba(0,0,0,0.1)] rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
        <CardHeader className="bg-gray-50/50">
          <CardTitle className="text-xl text-primary-700">Tareas Asignadas</CardTitle>
          <CardDescription className="text-gray-600">
            Listado de tareas y actividades para realizar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {tasks.map((task) => (
              <Card key={task.id} className="overflow-hidden border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="bg-gray-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-primary-700">{task.titulo}</CardTitle>
                      <CardDescription className="text-gray-600">
                        {`Materia: ${task.materiaId} • Entrega: ${format(new Date(task.fechaEntrega), "PPP", { locale: es })}`}
                      </CardDescription>
                    </div>
                    <Badge 
                      className={
                        task.estado === "activo" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : 
                        task.estado === "completada" ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                        "bg-red-100 text-red-800 hover:bg-red-100"
                      }
                    >
                      {task.estado === "activo" ? "Pendiente" : 
                       task.estado === "completada" ? "Completada" : 
                       "Vencida"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-6">
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Instrucciones:</h4>
                    <p className="text-sm whitespace-pre-wrap">{task.instrucciones}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    {task.archivoUrl && (
                      <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
                        <a href={task.archivoUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                          <span>Descargar material</span>
                        </a>
                      </Button>
                    )}
                    
                    {task.enlaceUrl && (
                      <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
                        <a href={task.enlaceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          <span>Ver recurso</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
                
                {task.estado === "activo" && (
                  <CardFooter className="bg-muted/30 px-4 py-3 flex justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.fechaEntrega) > new Date() 
                          ? `Vence en ${Math.ceil((new Date(task.fechaEntrega).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días` 
                          : "¡Plazo vencido!"}
                      </span>
                    </div>
                    <Button size="sm">
                      Entregar tarea
                    </Button>
                  </CardFooter>
                )}
                
                {task.estado === "completada" && (
                  <CardFooter className="bg-green-50 px-4 py-3">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">
                        Tarea entregada
                      </span>
                    </div>
                  </CardFooter>
                )}
                
                {task.estado === "vencida" && (
                  <CardFooter className="bg-red-50 px-4 py-3">
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 mr-1 text-red-600" />
                      <span className="text-xs text-red-600 font-medium">
                        Plazo vencido
                      </span>
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Tab de Avisos
// Tab de Resumen Académico IA
function AcademicSummaryTab({ studentId }: { studentId: number }) {
  const [isCopying, setIsCopying] = useState(false);
  const { toast } = useToast();
  
  const { 
    data: summary, 
    isLoading,
    error,
    isError 
  } = useQuery({
    queryKey: [`/api/students/${studentId}/summary-ia`],
    enabled: !!studentId,
    retry: 2,
    retryDelay: 1000
  });

  const copyToClipboard = async () => {
    if (!summary?.resumen) return;
    
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(summary.resumen);
      
      if (toast) {
        toast({
          title: "Copiado al portapapeles",
          description: "El resumen académico ha sido copiado correctamente.",
        });
      }
    } catch (err) {
      if (toast) {
        toast({
          variant: "destructive",
          title: "Error al copiar",
          description: "No se pudo copiar el texto al portapapeles.",
        });
      }
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          Generando resumen académico con IA...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-2">
          Error: {(error as Error).message}
        </p>
        <p className="text-muted-foreground">
          No se pudo generar el resumen académico. Por favor, inténtelo de nuevo más tarde.
        </p>
      </div>
    );
  }

  // Si no hay suficientes datos
  if (summary && !summary.suficienteDatos) {
    return (
      <AvisoVacio
        titulo="Resumen IA no disponible"
        mensaje={summary.mensaje || "Aún no hay suficiente información académica para generar un resumen con IA."}
        icono="🧠"
        ayuda="El análisis de IA requiere datos de las boletas académicas, asistencias y tareas de al menos un periodo escolar completo para generar resultados precisos."
      />
    );
  }

  return (
    <Card className="mt-4 shadow-[0_1px_4px_rgba(0,0,0,0.1)] rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
      <CardHeader className="bg-gray-50/50">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl text-primary-700">
              <Brain className="h-5 w-5 text-primary" />
              Resumen Académico con IA
            </CardTitle>
            <CardDescription className="text-gray-600">
              Análisis personalizado del desempeño académico
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={copyToClipboard}
              disabled={isCopying || !summary?.resumen}
            >
              {isCopying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCopy className="h-4 w-4 mr-2" />
              )}
              Copiar texto
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              disabled={!summary?.resumen}
              onClick={() => {
                // Implementar funcionalidad para guardar como PDF
                // Esto sería mejor con un servicio específico para PDF
                if (toast) {
                  toast({
                    title: "Función en desarrollo",
                    description: "La descarga en PDF estará disponible próximamente.",
                  });
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Guardar como PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="prose max-w-none dark:prose-invert">
        <div className="bg-muted/30 p-6 rounded-md whitespace-pre-wrap">
          {summary?.resumen || "No se pudo generar un resumen con los datos actuales."}
        </div>
        
        {summary?.datos && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Datos utilizados para el análisis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="text-base font-medium">Información general</h4>
                <ul className="mt-2 space-y-1">
                  <li><span className="font-medium">Estudiante:</span> {summary.datos.nombreEstudiante}</li>
                  <li><span className="font-medium">Nivel:</span> {summary.datos.nivel}</li>
                  <li><span className="font-medium">Periodos analizados:</span> {summary.datos.periodos.join(', ')}</li>
                </ul>
              </div>
              <div>
                <h4 className="text-base font-medium">Asistencia</h4>
                <ul className="mt-2 space-y-1">
                  <li>
                    <span className="font-medium">Porcentaje:</span> {summary.datos.asistencia.porcentaje}%
                    <div className="w-full bg-muted mt-1 rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${summary.datos.asistencia.porcentaje}%` }}
                      ></div>
                    </div>
                  </li>
                  <li><span className="font-medium">Días presente:</span> {summary.datos.asistencia.presente}</li>
                  <li><span className="font-medium">Total de días:</span> {summary.datos.asistencia.total}</li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="text-base font-medium">Desempeño por materia</h4>
              <div className="overflow-x-auto mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Materia</TableHead>
                      {summary.datos.periodos.map(periodo => (
                        <TableHead key={periodo} className="text-right">Periodo {periodo}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.datos.promediosPorMateria.map((materia, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{materia.materia}</TableCell>
                        {summary.datos.periodos.map(periodo => (
                          <TableCell key={periodo} className="text-right">
                            {safeGradeFormat(materia.promedios[periodo])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tab de Chatbot IA
function ChatbotTab({ studentId }: { studentId: number }) {
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInactivityTooltip, setShowInactivityTooltip] = useState(false);
  const [tooltipShownOnce, setTooltipShownOnce] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Obtener datos del estudiante para el contexto del chatbot
  const { 
    data: student,
    isLoading: isLoadingStudentProfile
  } = useQuery({
    queryKey: [`/api/students/${studentId}`],
    enabled: !!studentId,
    retry: 3,
    retryDelay: 1000
  });
  
  // Mutación para enviar mensajes al chatbot
  const chatMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/parent-chatbot", {
        question: query,
        studentId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response
      }]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al comunicarse con el chatbot",
        description: error.message,
        variant: "destructive",
      });
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo más tarde."
      }]);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });
  
  // Desplazarse al último mensaje cuando se añade uno nuevo
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  // Mensaje inicial del chatbot con formato mejorado
  useEffect(() => {
    if (chatMessages.length === 0 && student) {
      setChatMessages([{ 
        role: "assistant", 
        content: `👋 Hola, soy el **Asistente Educativo IA**.  
Puedo responder preguntas sobre ${student.nombreCompleto}:  
📚 Boletas académicas  
📅 Asistencias  
💰 Estado de cuenta o pagos  
Escribe tu pregunta para comenzar.`
      }]);
    }
  }, [chatMessages.length, student]);
  
  // Manejador para el envío de preguntas predefinidas
  const handleQuickPrompt = (promptText: string) => {
    if (isSubmitting) return;
    
    setQuestion(promptText);
    setChatMessages(prev => [...prev, { role: "user", content: promptText }]);
    setIsSubmitting(true);
    chatMutation.mutate(promptText);
    
    // Actualizar tiempo de actividad
    setLastActivityTime(Date.now());
    setShowInactivityTooltip(false);
  };
  
  // Configurar detector de inactividad
  useEffect(() => {
    // Iniciar temporizador de inactividad
    const startInactivityTimer = () => {
      // Limpiar timer existente si hay alguno
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      // Configurar nuevo timer - 10 segundos
      inactivityTimerRef.current = setTimeout(() => {
        // Solo mostrar el tooltip si no se ha mostrado antes en esta sesión
        if (!tooltipShownOnce) {
          setShowInactivityTooltip(true);
          setTooltipShownOnce(true);
        }
      }, 10000); // 10 segundos
    };
    
    // Iniciar temporizador inmediatamente
    startInactivityTimer();
    
    // Reiniciar temporizador cuando hay actividad en el chat
    const handleActivity = () => {
      setLastActivityTime(Date.now());
      setShowInactivityTooltip(false);
      startInactivityTimer();
    };
    
    // Agregar event listeners para detectar actividad
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('mousemove', handleActivity);
    
    return () => {
      // Limpieza al desmontar
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('mousemove', handleActivity);
    };
  }, [tooltipShownOnce]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || isSubmitting) return;
    
    // Agregar la pregunta del usuario al chat
    setChatMessages(prev => [...prev, { role: "user", content: question }]);
    
    setIsSubmitting(true);
    chatMutation.mutate(question);
    setQuestion("");
    
    // Actualizar tiempo de actividad
    setLastActivityTime(Date.now());
    setShowInactivityTooltip(false);
  };
  
  if (isLoadingStudentProfile) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <Card className="mt-4 shadow-[0_1px_4px_rgba(0,0,0,0.1)] rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
      <CardHeader className="bg-gray-50/50">
        <CardTitle className="flex items-center gap-2 text-xl text-primary-700">
          <MessageSquare className="h-5 w-5 text-primary" />
          Chatbot Educativo IA
        </CardTitle>
        <CardDescription className="text-gray-600">
          Asistente virtual para consultas académicas y financieras
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Área de chat */}
        <ScrollArea ref={chatContainerRef} className="h-[400px] p-4 border rounded-md">
          <div className="space-y-4">
            {chatMessages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            {isSubmitting && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">El asistente está escribiendo...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Indicador de inactividad */}
            {showInactivityTooltip && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-blue-50 border border-blue-100 shadow-sm animate-pulse">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <p className="text-sm font-medium text-primary">¿Tienes dudas sobre boletas académicas o pagos?</p>
                    </div>
                    <p className="text-sm text-gray-700">
                      Pregúntale al <span className="font-semibold">Chatbot Educativo IA</span>:
                    </p>
                    <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                      <li>📚 "¿Cómo va {student?.nombreCompleto} en la evaluación por criterios?"</li>
                      <li>💰 "¿Cuánto debo este mes?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Botones de sugerencias rápidas (Quick Prompts) */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
            onClick={() => handleQuickPrompt("Ver boleta académica más reciente")}
            disabled={isSubmitting}
          >
            <GraduationCap className="h-4 w-4 mr-1" />
            Ver boleta académica
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
            onClick={() => handleQuickPrompt("Consultar adeudo actual")}
            disabled={isSubmitting}
          >
            <Receipt className="h-4 w-4 mr-1" />
            Consultar adeudo actual
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
            onClick={() => handleQuickPrompt("Próxima tarea pendiente")}
            disabled={isSubmitting}
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            Próxima tarea pendiente
          </Button>
        </div>
        
        {/* Formulario de entrada */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Escribe tu pregunta aquí..."
            className="resize-none"
            rows={2}
          />
          <Button 
            type="submit" 
            className="h-auto"
            disabled={!question.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationsTab({ parentId }: { parentId: string }) {
  const { 
    data: notifications = [], 
    isLoading,
    error
  } = useQuery({
    queryKey: [`/api/avisos/parent/${parentId}`],
    enabled: !!parentId,
    retry: 3,
    retryDelay: 1000
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Error: {(error as Error).message}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <AvisoVacio
        titulo="Sin avisos escolares"
        mensaje="No hay comunicados o notificaciones escolares disponibles en este momento."
        icono="📢"
        ayuda="Aquí se mostrarán los mensajes importantes de la escuela, avisos oficiales y notificaciones específicas."
        acciones={
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <Bell className="h-4 w-4 mr-2" />
            Revisar de nuevo
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-xl font-bold">Avisos Escolares</h2>
      {notifications.map((aviso) => (
        <Card key={aviso.id} className="border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="bg-gray-50/50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-primary-700">{aviso.titulo}</CardTitle>
                <CardDescription className="text-gray-600">
                  {`Publicado el ${format(new Date(aviso.createdAt), "d 'de' MMMM, yyyy", { locale: es })} a las ${format(new Date(aviso.createdAt), "h:mm a", { locale: es })}`}
                </CardDescription>
              </div>
              <Badge>
                {aviso.publico === 'todos' ? 'General' : 
                 aviso.publico === 'nivel' ? 'Nivel' : 
                 aviso.publico === 'grupo' ? 'Grupo' : 'Individual'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{aviso.contenido}</p>
          </CardContent>
          {aviso.importante && (
            <CardFooter className="bg-yellow-50 py-2 px-4 text-amber-800 text-sm">
              <span className="font-semibold">Nota Importante:</span> Este aviso requiere atención especial.
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}