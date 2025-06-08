import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { exportReport } from "@/lib/export";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Pie,
  PieChart,
  Cell,
  LineChart,
  Line
} from "recharts";
import { DownloadIcon, RefreshCw, FileText, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import type { Group } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Componente principal para la página de reportes
export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Todos");

  // Verificar si el usuario tiene permisos para ver reportes
  const hasAccess = user?.rol === "admin" || user?.rol === "coordinador";

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              No tienes permiso para acceder a la sección de reportes y análisis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Esta área está reservada para administradores y coordinadores. Si necesitas acceso, contacta al administrador del sistema.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Consultar los grupos disponibles
  const { data: groups, isLoading: loadingGroups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes y Análisis</h2>
          <p className="text-muted-foreground">
            Visualiza estadísticas y genera reportes sobre el desempeño académico, asistencia y finanzas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between">
          <TabsList>
            <TabsTrigger value="summary">Resumen General</TabsTrigger>
            <TabsTrigger value="academic">Rendimiento Académico</TabsTrigger>
            <TabsTrigger value="attendance">Asistencia</TabsTrigger>
            <TabsTrigger value="financial">Finanzas</TabsTrigger>
          </TabsList>

          {activeTab !== "summary" && (
            <div className="flex items-center space-x-2">
              <div className="grid gap-2">
                <Label htmlFor="group">Grupo</Label>
                <Select
                  value={selectedGroupId?.toString() || "all"}
                  onValueChange={(value) => {
                    setSelectedGroupId(value !== "all" ? parseInt(value) : undefined);
                  }}
                >
                  <SelectTrigger id="group" className="w-[180px]">
                    <SelectValue placeholder="Todos los grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="period">Periodo</Label>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger id="period" className="w-[180px]">
                    <SelectValue placeholder="Seleccionar periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="2023-2024">2023-2024</SelectItem>
                    <SelectItem value="Trimestre 1">Trimestre 1</SelectItem>
                    <SelectItem value="Trimestre 2">Trimestre 2</SelectItem>
                    <SelectItem value="Trimestre 3">Trimestre 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <TabsContent value="summary" className="space-y-4">
          <InstitutionSummary />
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <AcademicPerformanceReport 
            groupId={selectedGroupId} 
            period={selectedPeriod} 
          />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceReport 
            groupId={selectedGroupId} 
            period={selectedPeriod} 
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <FinancialReport 
            groupId={selectedGroupId} 
            status={selectedPeriod === "Pagados" ? "pagado" : 
                   selectedPeriod === "Pendientes" ? "pendiente" : undefined} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente para mostrar el resumen institucional
function InstitutionSummary() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["/api/reports/summary"],
    retry: 1,
  });
  
  console.log('Summary query error:', error);

  // Función para exportar el resumen
  const handleExport = (type: 'pdf' | 'excel') => {
    if (summary) {
      exportReport(summary, type, 'summary');
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!summary) {
    return (
      <div className="text-center p-8">
        <p>No se pudo cargar el resumen institucional</p>
        <Button variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }
  
  // Agregar botones de exportación en el encabezado
  const ExportActions = () => (
    <div className="flex items-center gap-2 mt-2 md:mt-0">
      <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
        <FileText className="mr-2 h-4 w-4" />
        Exportar PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
        <FileType className="mr-2 h-4 w-4" />
        Exportar Excel
      </Button>
    </div>
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Promedio General"
          value={`${summary.promedioGeneral.toFixed(1)}`}
          description="Calificación promedio de toda la institución"
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
        />
        <MetricCard
          title="Asistencia Media"
          value={`${summary.asistenciaMedia.toFixed(1)}%`}
          description="Porcentaje medio de asistencia"
          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
        />
        <MetricCard
          title="Recuperación Financiera"
          value={`${summary.recuperacionFinanciera.toFixed(1)}%`}
          description="Porcentaje de pagos recuperados"
          className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900"
        />
        <MetricCard
          title="Grupos Totales"
          value={summary.mejoresGrupos.length.toString()}
          description="Número total de grupos activos"
          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Mejores Grupos Académicos</CardTitle>
            <CardDescription>
              Grupos con mejor rendimiento académico promedio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={summary.mejoresGrupos}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <XAxis dataKey="grupoNombre" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="promedio" fill="#8884d8" name="Promedio" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Distribución Financiera</CardTitle>
            <CardDescription>
              Porcentaje de recuperación de pagos por nivel educativo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pagado', value: summary.recuperacionFinanciera },
                    { name: 'Pendiente', value: 100 - summary.recuperacionFinanciera }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { name: 'Pagado', value: summary.recuperacionFinanciera },
                    { name: 'Pendiente', value: 100 - summary.recuperacionFinanciera }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Componente para mostrar reportes de rendimiento académico
function AcademicPerformanceReport({ groupId, period }: { groupId?: number; period?: string }) {
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["/api/reports/academic", { groupId, period }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (groupId) params.append("grupoId", groupId.toString());
      if (period && period !== "Todos") params.append("periodo", period);
      
      // Usar apiRequest en lugar de fetch directamente
      const response = await apiRequest("GET", `/api/reports/academic?${params.toString()}`);
      return await response.json();
    },
    retry: 1,
  });
  
  console.log('Academic report error:', error);
  
  // Función para exportar el reporte
  const handleExport = (type: 'pdf' | 'excel') => {
    if (reports && reports.length > 0) {
      exportReport(reports, type, 'academic');
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="text-center p-8">
        <p>No hay datos disponibles para los filtros seleccionados</p>
        <Button variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }
  
  // Agregar botones de exportación
  const ExportActions = () => (
    <div className="flex items-center gap-2 mb-4">
      <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
        <FileText className="mr-2 h-4 w-4" />
        Exportar PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
        <FileType className="mr-2 h-4 w-4" />
        Exportar Excel
      </Button>
    </div>
  );

  return (
    <div className="grid gap-4">
      {reports.map((report: any) => (
        <Card key={report.grupoId} className="overflow-hidden">
          <CardHeader className="bg-muted/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{report.grupoNombre}</CardTitle>
                <CardDescription>
                  Nivel: {report.nivel} | Periodo: {report.periodo}
                </CardDescription>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-bold">{report.promedioGeneral.toFixed(1)}</h3>
                <p className="text-xs text-muted-foreground">Promedio General</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-4">Distribución de Calificaciones</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={report.distribucionCalificaciones}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cantidad"
                      nameKey="rango"
                      label={({ rango, percent }) => `${rango}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {report.distribucionCalificaciones?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Estadísticas Detalladas</h4>
                <div className="space-y-4">
                  {report.distribucionCalificaciones?.map((dist: any) => (
                    <div key={dist.rango} className="flex items-center">
                      <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-4 dark:bg-gray-700 overflow-hidden">
                        <div 
                          className={cn(
                            "h-4 rounded-full",
                            dist.rango === "9-10" ? "bg-green-500" : 
                            dist.rango === "7-8.9" ? "bg-blue-500" : "bg-red-500"
                          )} 
                          style={{ width: `${dist.porcentaje}%` }}
                        />
                      </div>
                      <div className="min-w-[100px] ml-4">
                        <span className="font-medium">{dist.rango}</span>: {dist.cantidad} alumnos
                        <span className="text-xs text-muted-foreground ml-1">({dist.porcentaje.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Componente para mostrar reportes de asistencia
function AttendanceReport({ groupId, period }: { groupId?: number; period?: string }) {
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["/api/reports/attendance", { groupId, period }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (groupId) params.append("grupoId", groupId.toString());
      if (period && period !== "Todos") params.append("mes", period);
      
      // Usar apiRequest en lugar de fetch directamente
      const response = await apiRequest("GET", `/api/reports/attendance?${params.toString()}`);
      return await response.json();
    },
    retry: 1,
  });
  
  console.log('Attendance report error:', error);
  
  // Función para exportar el reporte
  const handleExport = (type: 'pdf' | 'excel') => {
    if (reports && reports.length > 0) {
      exportReport(reports, type, 'attendance');
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="text-center p-8">
        <p>No hay datos disponibles para los filtros seleccionados</p>
        <Button variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }
  
  // Agregar botones de exportación
  const ExportActions = () => (
    <div className="flex items-center gap-2 mb-4">
      <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
        <FileText className="mr-2 h-4 w-4" />
        Exportar PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
        <FileType className="mr-2 h-4 w-4" />
        Exportar Excel
      </Button>
    </div>
  );

  // Agrega log para inspeccionar la estructura del reporte
  console.log('Attendance Report Data:', reports);
  
  return (
    <div className="grid gap-4">
      <ExportActions />
      {reports.map((report: any) => (
        <Card key={report.grupoId} className="overflow-hidden">
          <CardHeader className="bg-muted/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{report.grupoNombre}</CardTitle>
                <CardDescription>
                  Periodo: {report.periodo}
                </CardDescription>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-bold">
                  {report.porcentajeGrupal ? `${report.porcentajeGrupal.toFixed(1)}%` : 'N/A'}
                </h3>
                <p className="text-xs text-muted-foreground">Asistencia General</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-4">Asistencia por Fecha</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={report.registrosPorFecha}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="porcentaje" stroke="#8884d8" name="% Asistencia" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Alumnos con Más Faltas</h4>
                <div className="space-y-4">
                  {report.estudiantesMenorAsistencia?.slice(0, 5).map((alumno: any) => (
                    <div key={alumno.estudianteId} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20">
                            {alumno.nombreCompleto.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <p className="font-medium">{alumno.nombreCompleto}</p>
                          <p className="text-xs text-muted-foreground">ID: {alumno.estudianteId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{alumno.ausente} faltas</Badge>
                        {alumno.retardos > 0 && <Badge variant="outline">{alumno.retardos || 0} retardos</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Componente para mostrar reportes financieros
function FinancialReport({ groupId, status }: { groupId?: number; status?: string }) {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["/api/reports/financial", { groupId, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (groupId) params.append("grupoId", groupId.toString());
      if (status) params.append("estado", status);
      
      // Usar apiRequest en lugar de fetch directamente
      const response = await apiRequest("GET", `/api/reports/financial?${params.toString()}`);
      return await response.json();
    },
    retry: 1,
  });
  
  // Agregar log para inspeccionar la estructura del reporte
  console.log('Financial Report Data:', report);
  console.log('Financial report error:', error);
  
  // Función para exportar el reporte
  const handleExport = (type: 'pdf' | 'excel') => {
    if (report) {
      exportReport(report, type, 'financial');
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!report) {
    return (
      <div className="text-center p-8">
        <p>No hay datos disponibles para los filtros seleccionados</p>
        <Button variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }
  
  // Agregar botones de exportación
  const ExportActions = () => (
    <div className="flex items-center gap-2 mb-4">
      <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
        <FileText className="mr-2 h-4 w-4" />
        Exportar PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
        <FileType className="mr-2 h-4 w-4" />
        Exportar Excel
      </Button>
    </div>
  );

  return (
    <div className="grid gap-4">
      <ExportActions />
      <Card>
        <CardHeader className="bg-muted/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {report.grupoNombre ? report.grupoNombre : "Reporte Financiero Institucional"}
              </CardTitle>
              <CardDescription>
                {report.nivel ? `Nivel: ${report.nivel} | ` : ""}
                Periodo: {report.periodo}
              </CardDescription>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold">
                {report.porcentajePagado ? `${report.porcentajePagado.toFixed(1)}%` : 'N/A'}
              </h3>
              <p className="text-xs text-muted-foreground">Recuperación</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-4">Resumen Financiero</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Total Adeudos</p>
                    <p className="text-2xl font-bold">
                      ${report.totalAdeudado ? report.totalAdeudado.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Total Pagado</p>
                    <p className="text-2xl font-bold">
                      ${report.totalPagado ? report.totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                    </p>
                  </div>
                </div>
                
                <h4 className="font-semibold mt-6 mb-4">Adeudos por Concepto</h4>
                <div className="space-y-3">
                  {report.adeudosPorConcepto && report.adeudosPorConcepto.map((concepto: any) => (
                    <div key={concepto.conceptoId} className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                        <div 
                          className="bg-primary h-3 rounded-full" 
                          style={{ width: `${concepto.porcentaje || 0}%` }}
                        />
                      </div>
                      <div className="min-w-[200px] ml-3 flex justify-between">
                        <span className="text-sm">{concepto.nombreConcepto}</span>
                        <span className="text-sm font-medium">
                          ${concepto.monto ? concepto.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Alumnos con Adeudos</h4>
              <div className="space-y-3">
                {report.alumnosConAdeudos && report.alumnosConAdeudos.slice(0, 8).map((alumno: any) => (
                  <div key={alumno.alumnoId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/20">
                          {alumno.nombreCompleto.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{alumno.nombreCompleto}</p>
                        {alumno.diasVencimiento > 0 && (
                          <Badge variant={alumno.diasVencimiento > 30 ? "destructive" : "outline"} className="mt-1">
                            {alumno.diasVencimiento} días vencido
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        ${alumno.montoAdeudo ? alumno.montoAdeudo.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para mostrar una tarjeta de métrica
function MetricCard({ 
  title, 
  value, 
  description,
  className 
}: { 
  title: string; 
  value: string; 
  description: string;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// Componente para mostrar un esqueleto de carga
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={`skeleton-card-${i}`}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}