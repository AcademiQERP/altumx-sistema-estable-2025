import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  Download, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Filter
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

type RemindersResult = {
  success: boolean;
  message: string;
  details?: {
    success: number;
    errors: number;
    omitted: number;
    sentTo?: string[];
    errorDetails?: string[];
    omittedDetails?: string[];
  };
};

type EmailLog = {
  id: number;
  paymentId: number | null;
  studentId: number;
  debtId: number | null;
  conceptName: string | null;
  dueDate: string | null;
  recipientEmails: string;
  status: "enviado" | "error" | "omitido";
  sentAt: string;
  errorMessage: string | null;
  createdAt: string;
  studentName?: string;
};

export default function TestRemindersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RemindersResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("test");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [conceptFilter, setConceptFilter] = useState<string>("todos");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [expandedLogs, setExpandedLogs] = useState<number[]>([]);
  
  // Consulta para obtener el historial de emails enviados
  const { data: emailLogs, isLoading: isLoadingLogs } = useQuery<EmailLog[]>({
    queryKey: ["/api/email-logs"],
  });

  // Obtener conceptos de pago únicos para el filtro
  const uniqueConcepts = useMemo(() => {
    if (!emailLogs) return [];
    
    const concepts = new Set<string>();
    emailLogs.forEach(log => {
      if (log.conceptName) {
        concepts.add(log.conceptName);
      }
    });
    
    return Array.from(concepts);
  }, [emailLogs]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!emailLogs) return {
      totalThisMonth: 0,
      successRate: 0,
      studentsWithoutContact: 0,
      totalErrors: 0
    };
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const logsThisMonth = emailLogs.filter(log => {
      const logDate = new Date(log.sentAt);
      return logDate.getMonth() === thisMonth && logDate.getFullYear() === thisYear;
    });
    
    const totalThisMonth = logsThisMonth.length;
    const successfulLogs = logsThisMonth.filter(log => log.status === "enviado").length;
    const successRate = totalThisMonth > 0 ? Math.round((successfulLogs / totalThisMonth) * 100) : 0;
    
    // Esta es una aproximación - idealmente calcularíamos estudiantes sin contactos desde una API específica
    const omittedStudentIds = new Set(
      emailLogs
        .filter(log => log.status === "omitido" && log.errorMessage?.includes("No tiene tutores"))
        .map(log => log.studentId)
    );
    
    const totalErrors = emailLogs.filter(log => 
      log.status === "error" && 
      new Date(log.sentAt) > new Date(now.setDate(now.getDate() - 30))
    ).length;
    
    return {
      totalThisMonth,
      successRate,
      studentsWithoutContact: omittedStudentIds.size,
      totalErrors
    };
  }, [emailLogs]);

  // Función para alternar la expansión de un log
  const toggleExpand = (logId: number) => {
    setExpandedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId) 
        : [...prev, logId]
    );
  };

  // Solo los admin y coordinadores pueden acceder a esta página
  if (user?.rol !== "admin" && user?.rol !== "coordinador") {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-4">Acceso Restringido</h1>
        <p>No tienes permisos para acceder a esta página.</p>
        <Button 
          className="mt-4" 
          variant="outline" 
          onClick={() => navigate("/")}
        >
          Volver al inicio
        </Button>
      </div>
    );
  }
  
  // Filtrar logs según la búsqueda y los filtros aplicados
  const filteredLogs = useMemo(() => {
    if (!emailLogs) return [];
    
    return emailLogs.filter((log) => {
      // Filtro de búsqueda de texto
      const matchesSearch = 
        searchQuery === "" || 
        log.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.recipientEmails.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.conceptName && log.conceptName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filtro de estado
      const matchesStatus = 
        statusFilter === "todos" || 
        log.status === statusFilter;
      
      // Filtro de concepto
      const matchesConcept = 
        conceptFilter === "todos" || 
        log.conceptName === conceptFilter;
      
      // Filtro de rango de fechas
      let matchesDateRange = true;
      if (dateRange.from || dateRange.to) {
        const logDate = new Date(log.sentAt);
        
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          matchesDateRange = matchesDateRange && logDate >= fromDate;
        }
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = matchesDateRange && logDate <= toDate;
        }
      }
      
      return matchesSearch && matchesStatus && matchesConcept && matchesDateRange;
    });
  }, [emailLogs, searchQuery, statusFilter, conceptFilter, dateRange]);

  const handleSendReminders = async () => {
    setIsLoading(true);
    try {
      // Hacer la petición al endpoint con el token incluido automáticamente
      const response = await apiRequest("GET", "/api/test-send-reminders");
      const data = await response.json();
      
      setResult(data);
      
      toast({
        title: data.success ? "Recordatorios enviados" : "Error",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error al enviar recordatorios:", error);
      setResult({
        success: false,
        message: "Error al conectar con el servidor. Comprueba la consola para más detalles."
      });
      
      toast({
        title: "Error",
        description: "No se pudo enviar los recordatorios. Comprueba la consola para más detalles.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para exportar logs a CSV
  const exportToCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "No hay registros de correos para exportar a CSV.",
        variant: "destructive",
      });
      return;
    }
    
    // Campos para el CSV
    const headers = [
      "ID",
      "Estudiante",
      "Destinatarios",
      "Concepto",
      "Fecha Vencimiento",
      "Estado",
      "Fecha Envío",
      "Mensaje Error"
    ];
    
    // Convertir datos a filas CSV
    const rows = filteredLogs.map(log => [
      log.id,
      log.studentName || `ID: ${log.studentId}`,
      log.recipientEmails,
      log.conceptName || "N/A",
      log.dueDate ? new Date(log.dueDate).toLocaleDateString() : "N/A",
      log.status,
      new Date(log.sentAt).toLocaleString(),
      log.errorMessage || ""
    ]);
    
    // Crear contenido CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => 
        // Escapar comillas y comas en los valores
        `"${String(cell).replace(/"/g, '""')}"`
      ).join(","))
    ].join("\n");
    
    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `recordatorios-pagos-${timestamp}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exportación completada",
      description: `Se han exportado ${filteredLogs.length} registros a CSV.`,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Recordatorios de Pagos</h1>
        <p className="text-muted-foreground">
          Administración y seguimiento de recordatorios de pago para adeudos
        </p>
      </div>

      <Tabs 
        defaultValue="test" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test">Enviar Recordatorios</TabsTrigger>
          <TabsTrigger value="history">Historial de Envíos</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de envío de recordatorios */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prueba de Recordatorios</CardTitle>
              <CardDescription>
                Al hacer clic en el botón se enviarán recordatorios de pago para adeudos que vencen en los próximos 3 días.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 border border-blue-200">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <div>
                      <strong>Información importante:</strong> Esta es una herramienta de prueba que enviará correos reales a los padres de familia.
                    </div>
                  </div>
                  <p className="mt-2 ml-7">
                    Solo se enviarán recordatorios para adeudos con fecha de vencimiento entre hoy y los próximos 3 días.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={handleSendReminders}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                    Enviando...
                  </>
                ) : (
                  "Enviar Recordatorios"
                )}
              </Button>
            </CardFooter>
          </Card>

          {result && (
            <Card className={result.success ? "border-green-200" : "border-red-200"}>
              <CardHeader className={result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}>
                <CardTitle>{result.success ? "Recordatorios Enviados" : "Error al Enviar"}</CardTitle>
                <CardDescription className={result.success ? "text-green-700" : "text-red-700"}>
                  {result.message}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {result.details && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-md">
                        <p className="text-sm font-medium mb-2">Correos Enviados</p>
                        <p className="text-2xl font-bold">{result.details.success}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-md">
                        <p className="text-sm font-medium mb-2">Errores</p>
                        <p className="text-2xl font-bold">{result.details.errors}</p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-md">
                        <p className="text-sm font-medium mb-2">Omitidos</p>
                        <p className="text-2xl font-bold">{result.details.omitted}</p>
                      </div>
                    </div>

                    {result.details.sentTo && result.details.sentTo.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Recordatorios enviados a:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {result.details.sentTo.map((email, index) => (
                            <li key={index} className="text-sm">{email}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.details.errorDetails && result.details.errorDetails.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 text-red-700">Errores:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {result.details.errorDetails.map((error, index) => (
                            <li key={index} className="text-sm text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {result.details.omittedDetails && result.details.omittedDetails.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 text-amber-700">Adeudos omitidos:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {result.details.omittedDetails.map((detail, index) => (
                            <li key={index} className="text-sm text-amber-600">{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Pestaña de historial */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Historial de Recordatorios</CardTitle>
                  <CardDescription>
                    Registro histórico de todos los recordatorios de pago enviados
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={exportToCSV} className="flex items-center">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Panel de estadísticas */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <h3 className="text-sm font-medium text-blue-800 mb-1">Total este mes</h3>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalThisMonth}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-md border border-green-100">
                    <h3 className="text-sm font-medium text-green-800 mb-1">Tasa de éxito</h3>
                    <p className="text-2xl font-bold text-green-900">{stats.successRate}%</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-md border border-amber-100">
                    <h3 className="text-sm font-medium text-amber-800 mb-1">Sin contactos</h3>
                    <p className="text-2xl font-bold text-amber-900">{stats.studentsWithoutContact}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-md border border-red-100">
                    <h3 className="text-sm font-medium text-red-800 mb-1">Errores (30 días)</h3>
                    <p className="text-2xl font-bold text-red-900">{stats.totalErrors}</p>
                  </div>
                </div>

                {/* Controles de búsqueda y filtros */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center relative">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por estudiante, correo o concepto..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Filtro de estado */}
                    <div className="flex items-center">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los estados</SelectItem>
                          <SelectItem value="enviado">Enviados</SelectItem>
                          <SelectItem value="error">Errores</SelectItem>
                          <SelectItem value="omitido">Omitidos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Filtro de concepto */}
                    {uniqueConcepts.length > 0 && (
                      <div className="flex items-center">
                        <Select value={conceptFilter} onValueChange={setConceptFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Concepto de pago" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos los conceptos</SelectItem>
                            {uniqueConcepts.map((concept) => (
                              <SelectItem key={concept} value={concept}>
                                {concept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Filtro de rango de fechas */}
                    <div className="flex items-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-start text-left font-normal w-[240px]"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateRange.from || dateRange.to ? (
                              <>
                                {dateRange.from
                                  ? format(dateRange.from, "dd/MM/yyyy")
                                  : "Inicio"}
                                {" - "}
                                {dateRange.to
                                  ? format(dateRange.to, "dd/MM/yyyy")
                                  : "Fin"}
                              </>
                            ) : (
                              "Seleccionar fechas"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            initialFocus
                            mode="range"
                            selected={{
                              from: dateRange.from || undefined,
                              to: dateRange.to || undefined
                            }}
                            onSelect={(range) => 
                              setDateRange({ 
                                from: range?.from, 
                                to: range?.to 
                              })
                            }
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                      
                      {/* Botón para limpiar filtros de fecha */}
                      {(dateRange.from || dateRange.to) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDateRange({ from: undefined, to: undefined })}
                          className="ml-2"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {isLoadingLogs ? (
                  <div className="py-8 flex justify-center">
                    <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
                  </div>
                ) : (
                  <>
                    {filteredLogs.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        {searchQuery ? 
                          "No se encontraron resultados para tu búsqueda" : 
                          "No hay registros de recordatorios enviados"}
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Estudiante</TableHead>
                              <TableHead>Correo</TableHead>
                              <TableHead>Concepto</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredLogs.map((log) => {
                              return (
                                <React.Fragment key={log.id}>
                                  <TableRow>
                                    <TableCell className="whitespace-nowrap">
                                      {new Date(log.sentAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>{log.studentName || `ID: ${log.studentId}`}</TableCell>
                                    <TableCell className="max-w-xs truncate">
                                      {log.recipientEmails}
                                    </TableCell>
                                    <TableCell>{log.conceptName || "N/A"}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          log.status === "enviado" 
                                            ? "bg-green-100 text-green-800" 
                                            : log.status === "error"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-amber-100 text-amber-800"
                                        }`}>
                                          {log.status === "enviado" && (
                                            <>
                                              <CheckCircle className="mr-1 h-3 w-3" /> 
                                              Enviado
                                            </>
                                          )}
                                          {log.status === "error" && (
                                            <>
                                              <XCircle className="mr-1 h-3 w-3" /> 
                                              Error
                                            </>
                                          )}
                                          {log.status === "omitido" && (
                                            <>
                                              <AlertTriangle className="mr-1 h-3 w-3" /> 
                                              Omitido
                                            </>
                                          )}
                                        </span>
                                        
                                        {/* Botón para expandir detalles */}
                                        {(log.status === "error" || log.status === "omitido") && log.errorMessage && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="ml-2 h-6 w-6"
                                            onClick={() => toggleExpand(log.id)}
                                          >
                                            {expandedLogs.includes(log.id) ? (
                                              <ChevronUp className="h-4 w-4" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4" />
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  
                                  {/* Fila expandible con el detalle del error */}
                                  {expandedLogs.includes(log.id) && (log.status === "error" || log.status === "omitido") && (
                                    <TableRow className="bg-muted/50">
                                      <TableCell colSpan={5} className="p-3">
                                        <div className={`text-sm px-4 py-3 rounded ${
                                          log.status === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}>
                                          <p className="font-medium mb-1">
                                            {log.status === "error" ? "Detalle del error:" : "Motivo de omisión:"}
                                          </p>
                                          <p>{log.errorMessage}</p>
                                          
                                          {/* Contexto adicional (deuda, concepto, fecha límite) */}
                                          {log.conceptName && (
                                            <div className="mt-2 pt-2 border-t border-amber-200 grid grid-cols-2 gap-2 text-xs">
                                              <div>
                                                <span className="font-medium">Concepto:</span> {log.conceptName}
                                              </div>
                                              {log.dueDate && (
                                                <div>
                                                  <span className="font-medium">Fecha límite:</span> {new Date(log.dueDate).toLocaleDateString()}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}