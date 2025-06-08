import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { 
  CurrencyIcon,
  CreditCardIcon,
  BellIcon,
  BarChartIcon,
  PieChartIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  UsersIcon,
  BrainCircuitIcon,
  DownloadIcon,
  CopyIcon,
  FileTextIcon,
  FileSpreadsheetIcon
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#4caf50', '#f44336'];
const meses = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" }
];

// Tipo para el resumen financiero
type ResumenFinanciero = {
  mes: string;
  anio: number;
  totalRecaudado: number;
  totalAdeudado: number;
  porcentajeCumplimiento: number;
  grupoMoroso: string;
  conceptoTop: string;
  distribPorConcepto: {
    concepto: string;
    monto: number;
    porcentaje: number;
  }[];
  recaudacionMensual: {
    mes: string;
    monto: number;
  }[];
  topDeudores: {
    nombre: string;
    grupo: string;
    monto: number;
    diasVencimiento: number;
    ultimoPago: string | null;
  }[];
  comparativaInteranual?: {
    hayDatosAnioAnterior: boolean;
    mesAnioAnterior: string;
    totalRecaudadoAnioAnterior: number;
    totalAdeudadoAnioAnterior: number;
    porcentajeCumplimientoAnioAnterior: number;
    variacionRecaudado: number | null;
    variacionAdeudado: number | null;
    variacionCumplimiento: number | null;
  };
}

// Componente para tarjetas de KPI
function KpiCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend = 0,
  loading = false 
}: { 
  title: string; 
  value: string | number; 
  description?: string; 
  icon: React.ReactNode;
  trend?: number;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1">
            <div className="text-sm font-medium text-muted-foreground mb-1">{title}</div>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{value}</div>
            )}
            {description && (
              <div className="text-xs text-muted-foreground mt-1">{description}</div>
            )}
            {trend !== 0 && (
              <div className={`text-xs mt-2 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mes anterior
              </div>
            )}
          </div>
          <div className="text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente principal
export default function ReportesFinancieros() {
  const [anioSeleccionado, setAnioSeleccionado] = useState("2025");
  const [mesSeleccionado, setMesSeleccionado] = useState("4"); // Abril (según fecha actual)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>("all");
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState<string>("all");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [resumenIA, setResumenIA] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const reporteRef = useRef<HTMLDivElement>(null);
  
  // Verificar si el usuario tiene permiso para exportar (admin o coordinador)
  const puedeExportar = user?.rol === 'admin' || user?.rol === 'coordinador';

  // Consulta de datos de grupos
  const { data: grupos, isLoading: cargandoGrupos } = useQuery({
    queryKey: ["/api/groups"],
    retry: 1,
  });

  // Consulta de conceptos de pago
  const { data: conceptos, isLoading: cargandoConceptos } = useQuery({
    queryKey: ["/api/payment-concepts"],
    retry: 1,
  });

  // Consulta principal de datos financieros
  const { 
    data: resumenFinanciero, 
    isLoading: cargandoResumen,
    error: errorResumen,
    refetch: recargarResumen
  } = useQuery({
    queryKey: ["/api/reports/financial/summary", { 
      anio: anioSeleccionado, 
      mes: mesSeleccionado,
      grupoId: grupoSeleccionado !== "all" ? grupoSeleccionado : undefined,
      conceptoId: conceptoSeleccionado !== "all" ? conceptoSeleccionado : undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("anio", anioSeleccionado);
      params.append("mes", mesSeleccionado);
      if (grupoSeleccionado && grupoSeleccionado !== "all") params.append("grupoId", grupoSeleccionado);
      if (conceptoSeleccionado && conceptoSeleccionado !== "all") params.append("conceptoId", conceptoSeleccionado);
      
      try {
        const response = await apiRequest("GET", `/api/reports/financial/summary?${params.toString()}`);
        const data = await response.json();
        return data as ResumenFinanciero;
      } catch (error) {
        console.error("Error obteniendo resumen financiero:", error);
        
        // Datos de ejemplo para desarrollo mientras se implementa el endpoint real
        return {
          mes: meses.find(m => m.value === mesSeleccionado)?.label || "Abril",
          anio: parseInt(anioSeleccionado),
          totalRecaudado: 125000,
          totalAdeudado: 24000,
          porcentajeCumplimiento: 83.8,
          grupoMoroso: "3°A",
          conceptoTop: "Colegiatura",
          distribPorConcepto: [
            { concepto: "Colegiatura", monto: 95000, porcentaje: 76 },
            { concepto: "Material", monto: 15000, porcentaje: 12 },
            { concepto: "Inscripción", monto: 10000, porcentaje: 8 },
            { concepto: "Uniforme", monto: 5000, porcentaje: 4 }
          ],
          recaudacionMensual: [
            { mes: "Enero", monto: 110000 },
            { mes: "Febrero", monto: 115000 },
            { mes: "Marzo", monto: 120000 },
            { mes: "Abril", monto: 125000 }
          ],
          topDeudores: [
            { nombre: "Luis Pérez", grupo: "3°A", monto: 5200, diasVencimiento: 45, ultimoPago: "2025-02-15" },
            { nombre: "Ana Ramírez", grupo: "2°B", monto: 4800, diasVencimiento: 30, ultimoPago: "2025-03-01" },
            { nombre: "Carlos González", grupo: "1°A", monto: 3500, diasVencimiento: 15, ultimoPago: "2025-03-15" },
            { nombre: "María Fernández", grupo: "3°A", monto: 2800, diasVencimiento: 10, ultimoPago: "2025-03-20" },
            { nombre: "Juan Reyes", grupo: "2°C", monto: 2100, diasVencimiento: 5, ultimoPago: "2025-03-25" }
          ]
        };
      }
    },
    retry: 1,
    enabled: true,
  });

  // Mutation para generar resumen con IA
  const generarResumenMutation = useMutation({
    mutationFn: async () => {
      if (!resumenFinanciero) {
        throw new Error("No hay datos disponibles para generar el resumen");
      }
      
      const response = await apiRequest("POST", "/api/ai/resumen-financiero", resumenFinanciero);
      return response.json();
    },
    onSuccess: (data) => {
      setResumenIA(data.resumen);
      setDialogAbierto(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al generar resumen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Función para copiar al portapapeles
  const copiarResumen = async () => {
    try {
      await navigator.clipboard.writeText(resumenIA);
      toast({
        title: "Resumen copiado",
        description: "El texto ha sido copiado al portapapeles",
      });
    } catch (err) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el texto al portapapeles",
        variant: "destructive",
      });
    }
  };

  // Función para aplicar filtros
  const aplicarFiltros = () => {
    recargarResumen();
  };
  
  // Función para exportar a PDF
  const exportarPDF = async () => {
    if (!resumenFinanciero || cargandoResumen) {
      toast({
        title: "No hay datos para exportar",
        description: "Espere a que se carguen los datos del reporte.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Crear un nuevo documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Título y encabezado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE FINANCIERO', 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Sistema de Gestión Escolar - Colegio Altum`, 105, 22, { align: 'center' });
      
      // Fecha de generación
      const fechaActual = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFontSize(10);
      doc.text(`Generado: ${fechaActual}`, 105, 28, { align: 'center' });
      
      // Información de filtros
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Filtros aplicados:', 14, 40);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Año: ${anioSeleccionado}`, 14, 46);
      doc.text(`Mes: ${meses.find(m => m.value === mesSeleccionado)?.label || 'Todos'}`, 14, 52);
      doc.text(`Grupo: ${grupoSeleccionado === 'all' ? 'Todos' : grupos?.find((g: any) => g.id.toString() === grupoSeleccionado)?.nombre || grupoSeleccionado}`, 14, 58);
      doc.text(`Concepto: ${conceptoSeleccionado === 'all' ? 'Todos' : conceptos?.find((c: any) => c.id.toString() === conceptoSeleccionado)?.nombre || conceptoSeleccionado}`, 14, 64);
      
      // Métricas generales
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Métricas financieras', 14, 74);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total recaudado: $${resumenFinanciero.totalRecaudado.toLocaleString('es-MX')}`, 14, 80);
      doc.text(`Total adeudado: $${resumenFinanciero.totalAdeudado.toLocaleString('es-MX')}`, 14, 86);
      doc.text(`Porcentaje de cumplimiento: ${resumenFinanciero.porcentajeCumplimiento.toFixed(1)}%`, 14, 92);
      doc.text(`Grupo con mayor morosidad: ${resumenFinanciero.grupoMoroso}`, 14, 98);
      doc.text(`Concepto con mayor recaudación: ${resumenFinanciero.conceptoTop}`, 14, 104);
      
      // Tabla de Distribución por Concepto
      if (resumenFinanciero.distribPorConcepto && resumenFinanciero.distribPorConcepto.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Distribución por Concepto', 14, 114);
        
        const conceptoHeaders = [['Concepto', 'Monto', 'Porcentaje']];
        const conceptoData = resumenFinanciero.distribPorConcepto.map(item => [
          item.concepto,
          `$${item.monto.toLocaleString('es-MX')}`,
          `${item.porcentaje}%`
        ]);
        
        autoTable(doc, {
          head: conceptoHeaders,
          body: conceptoData,
          startY: 118,
          theme: 'striped',
          headStyles: { fillColor: [0, 136, 254] },
        });
      }
      
      // Tabla de Top Deudores
      if (resumenFinanciero.topDeudores && resumenFinanciero.topDeudores.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 118;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Alumnos con Adeudos Pendientes', 14, finalY + 10);
        
        const deudoresHeaders = [['Alumno', 'Grupo', 'Monto', 'Días Vencimiento', 'Último Pago']];
        const deudoresData = resumenFinanciero.topDeudores.map(deudor => [
          deudor.nombre,
          deudor.grupo,
          `$${deudor.monto.toLocaleString('es-MX')}`,
          deudor.diasVencimiento.toString(),
          deudor.ultimoPago ? new Date(deudor.ultimoPago).toLocaleDateString('es-MX') : 'Sin pagos'
        ]);
        
        autoTable(doc, {
          head: deudoresHeaders,
          body: deudoresData,
          startY: finalY + 14,
          theme: 'striped',
          headStyles: { fillColor: [0, 136, 254] },
        });
      }
      
      // Incluir resumen IA si está disponible
      if (resumenIA) {
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen generado con IA', 14, finalY + 10);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const resumenLines = doc.splitTextToSize(resumenIA, 180);
        doc.text(resumenLines, 14, finalY + 16);
      }
      
      // Guardar el PDF
      const nombreArchivo = `Reporte-Financiero-${meses.find(m => m.value === mesSeleccionado)?.label || 'Mes'}-${anioSeleccionado}.pdf`;
      doc.save(nombreArchivo);
      
      toast({
        title: "PDF exportado con éxito",
        description: `El archivo ${nombreArchivo} se ha descargado correctamente.`,
      });
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast({
        title: "Error al exportar PDF",
        description: "Ocurrió un error al generar el archivo PDF.",
        variant: "destructive",
      });
    }
  };
  
  // Función para exportar a Excel
  const exportarExcel = () => {
    if (!resumenFinanciero || cargandoResumen) {
      toast({
        title: "No hay datos para exportar",
        description: "Espere a que se carguen los datos del reporte.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Crear un nuevo libro de trabajo
      const wb = XLSX.utils.book_new();
      
      // Hoja 1: Información general
      const infoGeneral = [
        ['REPORTE FINANCIERO - COLEGIO ALTUM'],
        [`Generado: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`],
        [''],
        ['FILTROS APLICADOS'],
        [`Año: ${anioSeleccionado}`],
        [`Mes: ${meses.find(m => m.value === mesSeleccionado)?.label || 'Todos'}`],
        [`Grupo: ${grupoSeleccionado === 'all' ? 'Todos' : grupos?.find((g: any) => g.id.toString() === grupoSeleccionado)?.nombre || grupoSeleccionado}`],
        [`Concepto: ${conceptoSeleccionado === 'all' ? 'Todos' : conceptos?.find((c: any) => c.id.toString() === conceptoSeleccionado)?.nombre || conceptoSeleccionado}`],
        [''],
        ['MÉTRICAS FINANCIERAS'],
        [`Total recaudado: $${resumenFinanciero.totalRecaudado.toLocaleString('es-MX')}`],
        [`Total adeudado: $${resumenFinanciero.totalAdeudado.toLocaleString('es-MX')}`],
        [`Porcentaje de cumplimiento: ${resumenFinanciero.porcentajeCumplimiento.toFixed(1)}%`],
        [`Grupo con mayor morosidad: ${resumenFinanciero.grupoMoroso}`],
        [`Concepto con mayor recaudación: ${resumenFinanciero.conceptoTop}`]
      ];
      
      const wsInfo = XLSX.utils.aoa_to_sheet(infoGeneral);
      XLSX.utils.book_append_sheet(wb, wsInfo, "Información General");
      
      // Hoja 2: Distribución por Concepto
      if (resumenFinanciero.distribPorConcepto && resumenFinanciero.distribPorConcepto.length > 0) {
        const conceptoHeaders = [['Concepto', 'Monto', 'Porcentaje']];
        const conceptoData = resumenFinanciero.distribPorConcepto.map(item => [
          item.concepto,
          item.monto,
          `${item.porcentaje}%`
        ]);
        
        const wsConceptos = XLSX.utils.aoa_to_sheet([...conceptoHeaders, ...conceptoData]);
        XLSX.utils.book_append_sheet(wb, wsConceptos, "Distribución por Concepto");
      }
      
      // Hoja 3: Alumnos con Adeudos
      if (resumenFinanciero.topDeudores && resumenFinanciero.topDeudores.length > 0) {
        const deudoresHeaders = [['Alumno', 'Grupo', 'Monto Adeudado', 'Días de Vencimiento', 'Último Pago']];
        const deudoresData = resumenFinanciero.topDeudores.map(deudor => [
          deudor.nombre,
          deudor.grupo,
          deudor.monto,
          deudor.diasVencimiento,
          deudor.ultimoPago ? new Date(deudor.ultimoPago).toLocaleDateString('es-MX') : 'Sin pagos'
        ]);
        
        const wsDeudores = XLSX.utils.aoa_to_sheet([...deudoresHeaders, ...deudoresData]);
        XLSX.utils.book_append_sheet(wb, wsDeudores, "Adeudos Pendientes");
      }
      
      // Hoja 4: Recaudación Mensual
      if (resumenFinanciero.recaudacionMensual && resumenFinanciero.recaudacionMensual.length > 0) {
        const recaudacionHeaders = [['Mes', 'Monto Recaudado']];
        const recaudacionData = resumenFinanciero.recaudacionMensual.map(item => [
          item.mes,
          item.monto
        ]);
        
        const wsRecaudacion = XLSX.utils.aoa_to_sheet([...recaudacionHeaders, ...recaudacionData]);
        XLSX.utils.book_append_sheet(wb, wsRecaudacion, "Recaudación Mensual");
      }
      
      // Hoja 5: Resumen IA
      if (resumenIA) {
        const resumenIAData = [
          ['RESUMEN GENERADO CON IA'],
          [''],
          [resumenIA]
        ];
        
        const wsResumenIA = XLSX.utils.aoa_to_sheet(resumenIAData);
        XLSX.utils.book_append_sheet(wb, wsResumenIA, "Resumen IA");
      }
      
      // Guardar el archivo
      const nombreArchivo = `Reporte-Financiero-${meses.find(m => m.value === mesSeleccionado)?.label || 'Mes'}-${anioSeleccionado}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
      
      toast({
        title: "Excel exportado con éxito",
        description: `El archivo ${nombreArchivo} se ha descargado correctamente.`,
      });
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast({
        title: "Error al exportar Excel",
        description: "Ocurrió un error al generar el archivo Excel.",
        variant: "destructive",
      });
    }
  };

  // Si hay error en la carga de datos
  if (errorResumen) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Reportes Financieros</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-10">
              <div className="text-xl text-red-500 mb-2">Error al cargar los datos</div>
              <p className="text-muted-foreground mb-4">
                No se pudieron obtener los datos financieros. Por favor, intente nuevamente.
              </p>
              <Button onClick={() => recargarResumen()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" ref={reporteRef}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes Financieros</h2>
          <p className="text-muted-foreground">
            Análisis detallado de ingresos, adeudos y tendencias financieras
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeExportar && (
            <>
              <Button 
                onClick={exportarPDF}
                disabled={cargandoResumen}
                variant="outline"
                className="gap-2"
              >
                <FileTextIcon className="h-4 w-4" />
                Exportar PDF
              </Button>
              <Button 
                onClick={exportarExcel}
                disabled={cargandoResumen}
                variant="outline"
                className="gap-2"
              >
                <FileSpreadsheetIcon className="h-4 w-4" />
                Exportar Excel
              </Button>
            </>
          )}
          <Button 
            onClick={() => generarResumenMutation.mutate()}
            disabled={cargandoResumen || generarResumenMutation.isPending}
            className="gap-2"
          >
            <BrainCircuitIcon className="h-4 w-4" />
            {generarResumenMutation.isPending ? "Generando..." : "Generar Resumen con IA"}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Seleccione los parámetros para el reporte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Año Escolar</label>
              <Select
                value={anioSeleccionado}
                onValueChange={setAnioSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select
                value={mesSeleccionado}
                onValueChange={setMesSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione mes" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Grupo</label>
              <Select
                value={grupoSeleccionado}
                onValueChange={setGrupoSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los grupos</SelectItem>
                  {!cargandoGrupos && Array.isArray(grupos) && grupos.map((grupo: any) => (
                    <SelectItem key={grupo.id} value={grupo.id.toString()}>
                      {grupo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Concepto de Pago</label>
              <Select
                value={conceptoSeleccionado}
                onValueChange={setConceptoSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los conceptos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los conceptos</SelectItem>
                  {!cargandoConceptos && Array.isArray(conceptos) && conceptos.map((concepto: any) => (
                    <SelectItem key={concepto.id} value={concepto.id.toString()}>
                      {concepto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={aplicarFiltros}>
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores KPI */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Recaudado"
          value={cargandoResumen 
            ? "Cargando..." 
            : `$${resumenFinanciero?.totalRecaudado.toLocaleString('es-MX')}`
          }
          description={`${mesSeleccionado ? meses.find(m => m.value === mesSeleccionado)?.label : 'Este mes'}`}
          icon={<CurrencyIcon className="h-8 w-8" />}
          trend={resumenFinanciero?.comparativaInteranual?.variacionRecaudado || 0}
          loading={cargandoResumen}
        />
        <KpiCard
          title="Total Adeudado Vigente"
          value={cargandoResumen 
            ? "Cargando..." 
            : `$${resumenFinanciero?.totalAdeudado.toLocaleString('es-MX')}`
          }
          description="Deudas por cobrar"
          icon={<CreditCardIcon className="h-8 w-8" />}
          trend={resumenFinanciero?.comparativaInteranual?.variacionAdeudado || 0}
          loading={cargandoResumen}
        />
        <KpiCard
          title="Cumplimiento de Pagos"
          value={cargandoResumen 
            ? "Cargando..." 
            : `${resumenFinanciero?.porcentajeCumplimiento.toFixed(1)}%`
          }
          description="Recaudado vs Esperado"
          icon={<ClipboardCheckIcon className="h-8 w-8" />}
          trend={resumenFinanciero?.comparativaInteranual?.variacionCumplimiento || 0}
          loading={cargandoResumen}
        />
        <KpiCard
          title="Grupo Con Mayor Morosidad"
          value={cargandoResumen 
            ? "Cargando..." 
            : resumenFinanciero?.grupoMoroso || "N/A"
          }
          description="Mayor índice de retraso"
          icon={<UsersIcon className="h-8 w-8" />}
          loading={cargandoResumen}
        />
      </div>

      {/* Comparativa Año Anterior */}
      {resumenFinanciero?.comparativaInteranual && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Comparativa Interanual</CardTitle>
            <CardDescription>
              Análisis comparativo con {resumenFinanciero.comparativaInteranual.mesAnioAnterior}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!resumenFinanciero.comparativaInteranual.hayDatosAnioAnterior ? (
              <div className="p-4 border rounded bg-muted">
                <p className="text-muted-foreground">No hay datos disponibles para este período en el año anterior.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded">
                    <h3 className="text-sm font-medium mb-2">Total Recaudado</h3>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-xl font-semibold mb-1">${resumenFinanciero.totalRecaudado.toLocaleString('es-MX')}</p>
                        <p className="text-sm text-muted-foreground">${resumenFinanciero.comparativaInteranual.totalRecaudadoAnioAnterior.toLocaleString('es-MX')}</p>
                      </div>
                      {resumenFinanciero.comparativaInteranual.variacionRecaudado !== null && (
                        <Badge className={resumenFinanciero.comparativaInteranual.variacionRecaudado >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {resumenFinanciero.comparativaInteranual.variacionRecaudado >= 0 ? '↑' : '↓'} 
                          {Math.abs(resumenFinanciero.comparativaInteranual.variacionRecaudado).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded">
                    <h3 className="text-sm font-medium mb-2">Total Adeudado</h3>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-xl font-semibold mb-1">${resumenFinanciero.totalAdeudado.toLocaleString('es-MX')}</p>
                        <p className="text-sm text-muted-foreground">${resumenFinanciero.comparativaInteranual.totalAdeudadoAnioAnterior.toLocaleString('es-MX')}</p>
                      </div>
                      {resumenFinanciero.comparativaInteranual.variacionAdeudado !== null && (
                        <Badge className={resumenFinanciero.comparativaInteranual.variacionAdeudado <= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {resumenFinanciero.comparativaInteranual.variacionAdeudado <= 0 ? '↓' : '↑'} 
                          {Math.abs(resumenFinanciero.comparativaInteranual.variacionAdeudado).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded">
                    <h3 className="text-sm font-medium mb-2">Porcentaje de Cumplimiento</h3>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-xl font-semibold mb-1">{resumenFinanciero.porcentajeCumplimiento.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">{resumenFinanciero.comparativaInteranual.porcentajeCumplimientoAnioAnterior.toFixed(1)}%</p>
                      </div>
                      {resumenFinanciero.comparativaInteranual.variacionCumplimiento !== null && (
                        <Badge className={resumenFinanciero.comparativaInteranual.variacionCumplimiento >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {resumenFinanciero.comparativaInteranual.variacionCumplimiento >= 0 ? '↑' : '↓'} 
                          {Math.abs(resumenFinanciero.comparativaInteranual.variacionCumplimiento).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded bg-muted/30">
                  <h3 className="text-sm font-medium mb-2">Análisis Comparativo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-blue-200 text-blue-800">
                            Recaudación
                          </span>
                        </div>
                      </div>
                      <div className="flex h-2 overflow-hidden text-xs bg-blue-200 rounded">
                        <div 
                          style={{ width: `${Math.min(100, (resumenFinanciero.totalRecaudado / Math.max(resumenFinanciero.totalRecaudado, resumenFinanciero.comparativaInteranual.totalRecaudadoAnioAnterior)) * 100)}%` }} 
                          className="flex flex-col justify-center text-center text-white bg-blue-600"
                        ></div>
                      </div>
                    </div>
                    
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-amber-200 text-amber-800">
                            Adeudos
                          </span>
                        </div>
                      </div>
                      <div className="flex h-2 overflow-hidden text-xs bg-amber-200 rounded">
                        <div 
                          style={{ width: `${Math.min(100, (resumenFinanciero.totalAdeudado / Math.max(resumenFinanciero.totalAdeudado, resumenFinanciero.comparativaInteranual.totalAdeudadoAnioAnterior)) * 100)}%` }} 
                          className="flex flex-col justify-center text-center text-white bg-amber-600"
                        ></div>
                      </div>
                    </div>
                    
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-green-200 text-green-800">
                            Cumplimiento
                          </span>
                        </div>
                      </div>
                      <div className="flex h-2 overflow-hidden text-xs bg-green-200 rounded">
                        <div 
                          style={{ width: `${Math.min(100, (resumenFinanciero.porcentajeCumplimiento / 100) * 100)}%` }} 
                          className="flex flex-col justify-center text-center text-white bg-green-600"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráficos y tablas */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Recaudación Mensual */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recaudación Mensual</CardTitle>
            <CardDescription>
              Tendencia de ingresos por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cargandoResumen ? (
              <div className="h-80 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : resumenFinanciero?.recaudacionMensual && resumenFinanciero.recaudacionMensual.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resumenFinanciero.recaudacionMensual}>
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString('es-MX')}`, "Monto"]} />
                  <Legend />
                  <Bar dataKey="monto" name="Recaudación" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribución por Concepto */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Distribución por Concepto</CardTitle>
            <CardDescription>
              Porcentaje por tipo de ingreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cargandoResumen ? (
              <div className="h-80 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : resumenFinanciero?.distribPorConcepto && resumenFinanciero.distribPorConcepto.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={resumenFinanciero.distribPorConcepto}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="monto"
                    nameKey="concepto"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {resumenFinanciero.distribPorConcepto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString('es-MX')}`, "Monto"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Deudores */}
      <Card>
        <CardHeader>
          <CardTitle>Alumnos con Adeudos Pendientes</CardTitle>
          <CardDescription>
            Listado detallado de los adeudos más relevantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargandoResumen ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : resumenFinanciero?.topDeudores && resumenFinanciero.topDeudores.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Monto Adeudado</TableHead>
                    <TableHead>Días Vencimiento</TableHead>
                    <TableHead>Último Pago</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumenFinanciero.topDeudores.map((deudor, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{deudor.nombre}</TableCell>
                      <TableCell>{deudor.grupo}</TableCell>
                      <TableCell>${deudor.monto.toLocaleString('es-MX')}</TableCell>
                      <TableCell>{deudor.diasVencimiento}</TableCell>
                      <TableCell>{deudor.ultimoPago ? new Date(deudor.ultimoPago).toLocaleDateString('es-MX') : "Sin pagos"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={deudor.diasVencimiento > 30 ? "destructive" : 
                                 deudor.diasVencimiento > 0 ? "default" : "outline"}
                        >
                          {deudor.diasVencimiento > 30 ? "Crítico" : 
                           deudor.diasVencimiento > 0 ? "Vencido" : "Al día"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No hay deudores para mostrar con los filtros actuales</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para mostrar el resumen de IA */}
      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuitIcon className="h-5 w-5" />
              Resumen Financiero Generado con IA
            </DialogTitle>
          </DialogHeader>
          
          {generarResumenMutation.isPending ? (
            <div className="py-10 text-center">
              <Skeleton className="h-40 w-full mb-4" />
              <p className="text-muted-foreground">Generando resumen inteligente...</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                {resumenIA}
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={copiarResumen}>
              <CopyIcon className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={() => setDialogAbierto(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}