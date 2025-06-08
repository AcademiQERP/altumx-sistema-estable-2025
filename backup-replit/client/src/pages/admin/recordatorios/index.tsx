import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Mail, 
  FileDown, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Filter,
  RefreshCw,
  Calendar,
  LoaderCircle
} from "lucide-react";

// Componentes UI
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

// Componente para estado vacío

// Componente de visualización del historial de recordatorios
interface EmailLog {
  id: number;
  status: "error" | "enviado" | "omitido";
  studentId: number;
  studentName?: string;
  createdAt?: Date;
  sentAt: Date;
  dueDate: Date | null;
  paymentId: number;
  debtId: number | null;
  conceptName: string | null;
  recipientEmails: string;
  errorMessage: string | null;
}

// Interfaz para resultados de envío
interface SendResult {
  success: boolean;
  message: string;
  success_count?: number;
  errors?: number;
  omitted?: number;
  errorDetails?: string[];
  omittedDetails?: string[];
}

// Estado de filtros
interface FilterState {
  searchTerm: string;
  status: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export default function RemindersDashboard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    status: "todos",
    dateFrom: null,
    dateTo: null,
  });
  
  // Referencia para guardar datos para exportación
  const allLogsRef = useRef<EmailLog[]>([]);
  
  // Consulta para obtener logs de correos
  const { 
    data: emailLogs, 
    isLoading,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ["/api/email-logs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/email-logs");
      if (!response.ok) {
        throw new Error("Error al cargar historial de recordatorios");
      }
      const data = await response.json();
      allLogsRef.current = data; // Guardar los datos completos para exportación
      return data;
    },
  });
  
  // Consulta para obtener deudas próximas a vencer
  const { 
    data: upcomingDebts,
    isLoading: isLoadingDebts
  } = useQuery({
    queryKey: ["/api/debts/upcoming"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/debts/upcoming");
      if (!response.ok) {
        throw new Error("Error al cargar deudas próximas");
      }
      return response.json();
    },
  });
  
  // Mutación para enviar recordatorios
  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/send-reminders");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al enviar recordatorios");
      }
      return await response.json();
    },
    onSuccess: (data: SendResult) => {
      toast({
        title: "Recordatorios procesados",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      
      // Refrescar datos después de enviar recordatorios
      refetchLogs();
      queryClient.invalidateQueries({ queryKey: ["/api/debts/upcoming"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al enviar recordatorios",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Función para enviar recordatorios
  const handleSendReminders = () => {
    sendRemindersMutation.mutate();
  };
  
  // Función para aplicar filtros
  const filteredLogs = emailLogs
    ? emailLogs.filter((log: EmailLog) => {
        // Filtro por término de búsqueda (nombre o correo)
        const searchMatch = !filters.searchTerm || 
          log.studentName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          log.recipientEmails?.toLowerCase().includes(filters.searchTerm.toLowerCase());
        
        // Filtro por estado
        const statusMatch = filters.status === "todos" || 
          log.status === filters.status;
        
        // Filtro por fecha
        const sentDate = new Date(log.sentAt);
        const dateFromMatch = !filters.dateFrom || 
          isBefore(filters.dateFrom, sentDate);
        const dateToMatch = !filters.dateTo || 
          isBefore(sentDate, addDays(filters.dateTo, 1));
        
        return searchMatch && statusMatch && dateFromMatch && dateToMatch;
      })
    : [];
  
  // Función para exportar a CSV
  const exportToCSV = () => {
    if (!allLogsRef.current.length) {
      toast({
        title: "No hay datos para exportar",
        description: "No se encontraron registros para descargar",
        variant: "destructive",
      });
      return;
    }
    
    // Formatear datos para CSV
    const headers = [
      "Fecha Envío", 
      "Alumno", 
      "Correo Tutor", 
      "Concepto", 
      "Fecha Vencimiento", 
      "Estado", 
      "Mensaje de Error"
    ];
    
    // Crear filas de datos
    const rows = allLogsRef.current.map((log: EmailLog) => [
      format(new Date(log.sentAt), "dd/MM/yyyy HH:mm"),
      log.studentName || `Alumno ID: ${log.studentId}`,
      log.recipientEmails,
      log.conceptName || "No especificado",
      log.dueDate ? format(new Date(log.dueDate), "dd/MM/yyyy") : "No especificado",
      log.status === "enviado" ? "Enviado" : 
        log.status === "error" ? "Error" : "Omitido",
      log.errorMessage || ""
    ]);
    
    // Combinar encabezados y filas
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\\n");
    
    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `recordatorios-pagos-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exportación completada",
      description: `Se exportaron ${rows.length} registros a CSV`,
    });
  };
  
  // Componente para mostrar detalles de resultados de envío
  const ResultDetails = ({ result }: { result: SendResult }) => (
    <div className="space-y-2 mt-4">
      {result.errorDetails && result.errorDetails.length > 0 && (
        <div>
          <h4 className="font-semibold text-red-500 mb-1">Errores:</h4>
          <ul className="text-sm space-y-1">
            {result.errorDetails.map((error, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {result.omittedDetails && result.omittedDetails.length > 0 && (
        <div>
          <h4 className="font-semibold text-amber-500 mb-1">Omitidos:</h4>
          <ul className="text-sm space-y-1">
            {result.omittedDetails.map((omitted, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span>{omitted}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
  
  // Obtener el número de alumnos con adeudos próximos
  const upcomingDebtCount = upcomingDebts?.length || 0;
  
  // Estados para el diálogo de resultados
  const [showResults, setShowResults] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);
  
  // Actualizar el resultado después de una mutación exitosa
  useEffect(() => {
    if (sendRemindersMutation.isSuccess && sendRemindersMutation.data) {
      setLastResult(sendRemindersMutation.data);
      setShowResults(true);
    }
  }, [sendRemindersMutation.isSuccess, sendRemindersMutation.data]);
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Encabezado */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            📧 Recordatorios de Pago
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de recordatorios enviados a padres/tutores para adeudos próximos a vencer.
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="gap-1"
          disabled={!emailLogs || emailLogs.length === 0}
        >
          <FileDown className="h-4 w-4" />
          <span>Exportar a CSV</span>
        </Button>
      </div>
      
      <Separator />
      
      {/* Sección de próxima ejecución */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle>Próximos Recordatorios</CardTitle>
          <CardDescription>
            Alumnos con adeudos próximos a vencer en los siguientes 3 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">
              🎯 Hoy se podrían enviar recordatorios a {isLoadingDebts ? (
                <span className="inline-flex items-center">
                  <LoaderCircle className="h-5 w-5 animate-spin mr-1" />
                  cargando...
                </span>
              ) : (
                <span>{upcomingDebtCount} {upcomingDebtCount === 1 ? "familia" : "familias"}</span>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Última actualización: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
          <AlertDialog open={showResults} onOpenChange={setShowResults}>
            <AlertDialogTrigger asChild>
              <Button 
                className="gap-1" 
                onClick={handleSendReminders}
                disabled={sendRemindersMutation.isPending || upcomingDebtCount === 0}
              >
                {sendRemindersMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                <span>📨 Enviar recordatorios ahora</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resultado del envío de recordatorios</AlertDialogTitle>
                <AlertDialogDescription>
                  {lastResult?.message}
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              {lastResult && <ResultDetails result={lastResult} />}
              
              <AlertDialogFooter>
                <AlertDialogAction>Aceptar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
      
      {/* Sección de filtros */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtrar historial
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por alumno o correo..."
              value={filters.searchTerm}
              onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="flex-1"
            />
          </div>
          
          <div className="flex flex-col gap-1 justify-center">
            <label className="text-xs text-muted-foreground">Estado</label>
            <Select
              value={filters.status}
              onValueChange={value => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="enviado">Enviados</SelectItem>
                <SelectItem value="error">Errores</SelectItem>
                <SelectItem value="omitido">Omitidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-1 justify-center">
            <label className="text-xs text-muted-foreground">Desde</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? (
                    format(filters.dateFrom, "dd/MM/yyyy", { locale: es })
                  ) : (
                    "Seleccionar fecha"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={filters.dateFrom || undefined}
                  onSelect={date => setFilters(prev => ({ ...prev, dateFrom: date || null }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex flex-col gap-1 justify-center">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {filters.dateTo ? (
                    format(filters.dateTo, "dd/MM/yyyy", { locale: es })
                  ) : (
                    "Seleccionar fecha"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={filters.dateTo || undefined}
                  onSelect={date => setFilters(prev => ({ ...prev, dateTo: date || null }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setFilters({
              searchTerm: "",
              status: "todos",
              dateFrom: null,
              dateTo: null,
            })}
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Limpiar filtros
          </Button>
        </div>
      </div>
      
      {/* Sección de historial */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Historial de recordatorios enviados</h2>
          <div className="text-sm text-muted-foreground">
            {filteredLogs?.length || 0} registros encontrados
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha de Envío</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Correo Tutor</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: EmailLog) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.sentAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.studentName || `Alumno ID: ${log.studentId}`}
                    </TableCell>
                    <TableCell>
                      <span className="truncate block max-w-[150px]" title={log.recipientEmails}>
                        {log.recipientEmails}
                      </span>
                    </TableCell>
                    <TableCell>{log.conceptName || "No especificado"}</TableCell>
                    <TableCell>
                      {log.dueDate ? 
                        format(new Date(log.dueDate), "dd/MM/yyyy", { locale: es }) : 
                        "No especificado"}
                    </TableCell>
                    <TableCell>
                      {log.status === "enviado" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Enviado
                        </Badge>
                      ) : log.status === "error" ? (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Omitido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.status === "error" && log.errorMessage ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Ver detalle
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium">Error de envío</h4>
                              <p className="text-sm text-muted-foreground">{log.errorMessage}</p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : log.status === "omitido" ? (
                        <span className="text-sm text-muted-foreground">
                          Datos incompletos
                        </span>
                      ) : (
                        <span className="text-sm text-green-600">
                          OK
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No hay recordatorios registrados"
            description="No se ha encontrado ningún registro de recordatorios enviados con los filtros aplicados."
            icon={<Mail className="h-12 w-12 text-muted-foreground" />}
          />
        )}
      </div>
    </div>
  );
}