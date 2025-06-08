import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  CreditCard,
  Download,
  FileDown,
  Receipt,
  AlertTriangle,
  Banknote,
  ArrowRightLeft,
  FileSpreadsheet,
  Loader2,
  Search,
  DollarSign,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AvisoVacio } from "@/components/ui/aviso-vacio";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

// Definir tipos de datos
interface Payment {
  id: number;
  alumnoId: number;
  conceptoId: number;
  monto: number;
  metodoPago: string;
  fechaPago: string;
  estatus: string;
  pdfUrl?: string;
  notas?: string;
  conceptName?: string;
  studentName?: string;
}

interface PaymentHistoryResponse {
  success: boolean;
  payments: Payment[];
}

interface PaymentSummaryResponse {
  success: boolean;
  resumen: {
    totalPagado: number;
    totalPendiente: number;
    totalRechazado: number;
    mes: string;
  };
}

// Componente principal
export default function HistorialPagosPage() {
  const { user } = useAuth();
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("todos");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Obtener el historial de pagos
  const {
    data,
    isLoading,
    error,
    isError
  } = useQuery<PaymentHistoryResponse>({
    queryKey: [`/api/pagos/padres/${user?.id}/historial-pagos`],
    enabled: !!user?.id,
    retry: 2,
    retryDelay: 1000
  });
  
  // Obtener el resumen de pagos del mes actual
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
  } = useQuery<PaymentSummaryResponse>({
    queryKey: [`/api/pagos/padres/${user?.id}/resumen`],
    enabled: !!user?.id,
    retry: 2,
    retryDelay: 1000
  });

  // Actualizar los pagos filtrados cada vez que cambien los filtros
  useEffect(() => {
    if (!data?.payments) return;

    let filtered = [...data.payments];

    // Filtrar por estado
    if (statusFilter !== "todos") {
      filtered = filtered.filter(payment => payment.estatus === statusFilter);
    }

    // Filtrar por fecha
    if (dateFilter !== "todos") {
      const [month, year] = dateFilter.split('-').map(Number);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.fechaPago);
        return paymentDate.getMonth() + 1 === month && paymentDate.getFullYear() === year;
      });
    }

    // Filtrar por búsqueda en concepto o nombre del estudiante
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.conceptName?.toLowerCase().includes(query) || 
        payment.studentName?.toLowerCase().includes(query)
      );
    }

    setFilteredPayments(filtered);
  }, [data?.payments, statusFilter, dateFilter, searchQuery]);

  // Función para descargar el recibo
  const downloadReceipt = async (paymentId: number) => {
    try {
      const response = await apiRequest("GET", `/api/pagos/padres/recibo/${paymentId}`);
      const { receiptUrl } = await response.json();
      
      if (receiptUrl) {
        // Crear un elemento a temporal para la descarga
        const link = document.createElement('a');
        link.href = receiptUrl;
        link.target = '_blank';
        link.click();
      }
    } catch (error) {
      console.error("Error al descargar el recibo:", error);
    }
  };

  // Exportar a PDF
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const table = document.getElementById('payment-history-table');
      if (!table) return;

      // Crear el PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Convertir la tabla HTML a imagen
      const canvas = await html2canvas(table, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      // Añadir la imagen al PDF
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 280; // Ancho del PDF en mm (A4 landscape)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Agregar título al PDF
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Historial de Pagos', 10, 10);
      
      // Agregar fecha de generación
      pdf.setFontSize(10);
      pdf.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy')}`, 10, 18);

      // Añadir la tabla como imagen
      pdf.addImage(imgData, 'PNG', 10, 25, imgWidth, imgHeight);

      // Guardar el PDF
      pdf.save(`historial-pagos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error("Error al exportar a PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar a Excel
  const exportToExcel = () => {
    setIsExportingExcel(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        filteredPayments.map(payment => ({
          'Fecha': format(new Date(payment.fechaPago), 'dd/MM/yyyy'),
          'Estudiante': payment.studentName,
          'Concepto': payment.conceptName,
          'Monto': `$${payment.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          'Método de Pago': payment.metodoPago,
          'Estado': payment.estado === 'confirmado' ? 'Confirmado' : 
                   payment.estado === 'pendiente' ? 'Pendiente' :
                   payment.estado === 'en_revision' ? 'En revisión' :
                   payment.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'
        }))
      );
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial de Pagos");
      XLSX.writeFile(workbook, `historial-pagos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Generar opciones de meses para el filtro
  const generateMonthOptions = () => {
    if (!data?.payments || data.payments.length === 0) return [];
    
    const monthsMap = new Map();
    
    data.payments.forEach(payment => {
      const date = new Date(payment.fechaPago);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${month}-${year}`;
      
      if (!monthsMap.has(key)) {
        monthsMap.set(key, {
          value: key,
          label: format(date, 'MMMM yyyy', { locale: es })
        });
      }
    });
    
    // Convertir a array y ordenar por fecha (más reciente primero)
    return Array.from(monthsMap.values())
      .sort((a, b) => {
        const [monthA, yearA] = a.value.split('-').map(Number);
        const [monthB, yearB] = b.value.split('-').map(Number);
        
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      });
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando historial de pagos...</p>
      </div>
    );
  }

  // Error
  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="shadow-[0_1px_4px_rgba(0,0,0,0.1)] rounded-xl border border-gray-100">
          <CardHeader className="bg-red-50 text-red-900">
            <CardTitle>Error al cargar historial</CardTitle>
            <CardDescription className="text-red-800">
              Ocurrió un error al cargar el historial de pagos: {(error as Error).message}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <p>Por favor, intenta recargar la página o contacta al soporte técnico si el problema persiste.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No hay pagos
  if (!data?.payments || data.payments.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <AvisoVacio
          titulo="Sin historial de pagos"
          mensaje="No se encontraron pagos registrados en tu historial."
          icono="💰"
          ayuda="Aquí se mostrarán todos los pagos que hayas realizado por conceptos escolares. Cuando realices un pago, aparecerá en esta sección."
          acciones={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Actualizar
            </Button>
          }
        />
      </div>
    );
  }

  // Componente de tarjeta de métrica de pago
  const PaymentMetricCard = ({
    title,
    amount,
    icon,
    color,
    isLoading
  }: {
    title: string;
    amount: number;
    icon: React.ReactNode;
    color: string;
    isLoading: boolean;
  }) => (
    <Card className={cn("border-l-4", color)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            {isLoading ? (
              <div className="h-7 w-24 bg-muted/30 animate-pulse rounded-md"></div>
            ) : (
              <h3 className="text-2xl font-bold">
                ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h3>
            )}
          </div>
          <div className={cn("p-3 rounded-full bg-opacity-10", color.replace("border", "bg"))}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderiza la tabla de historial de pagos
  return (
    <div className="container mx-auto py-8">
      {/* Botón de navegación - Regresar a Estado de Cuenta */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 hover:bg-blue-50 transition-colors"
        >
          <ArrowRightLeft className="h-4 w-4 rotate-180" />
          Regresar a Estado de Cuenta
        </Button>
      </div>
      {/* Tarjetas de resumen mejoradas - coherencia con Estado de Cuenta */}
      {summaryData?.resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Tarjeta 1: Total Pagado */}
          <Card className="p-4 rounded-lg border shadow-sm bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 transition-all duration-300">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold">Total Pagado del Periodo</h3>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mes actual: {summaryData.resumen.mes}</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {isLoadingSummary ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      `$${new Intl.NumberFormat('es-MX').format(summaryData.resumen.totalPagado)} MXN`
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <Badge variant={summaryData.resumen.totalPagado > 0 ? "default" : "secondary"} className="text-sm">
                    {summaryData.resumen.totalPagado > 0 ? "Pagos realizados" : "Sin pagos"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 2: Pagos Pendientes */}
          <Card className="p-4 rounded-lg border shadow-sm bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 transition-all duration-300">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-lg font-semibold">Saldo Pendiente del Periodo</h3>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Adeudos pendientes</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {isLoadingSummary ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      `$${new Intl.NumberFormat('es-MX').format(summaryData.resumen.totalPendiente)} MXN`
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <Badge variant={summaryData.resumen.totalPendiente > 0 ? "destructive" : "default"} className="text-sm">
                    {summaryData.resumen.totalPendiente > 0 ? "⚠️ Pendiente" : "Al corriente"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-[0_1px_4px_rgba(0,0,0,0.1)] rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
        <CardHeader className="bg-gray-50/50">
          <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
            <div>
              <CardTitle className="text-xl text-primary-700 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Historial de Pagos
              </CardTitle>
              <CardDescription className="text-gray-600">
                Registro de todos los pagos realizados
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToPDF}
                disabled={isExporting || filteredPayments.length === 0}
                className="flex items-center gap-1"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                Exportar PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToExcel}
                disabled={isExportingExcel || filteredPayments.length === 0}
                className="flex items-center gap-1"
              >
                {isExportingExcel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="search" className="mb-2 block">Buscar por concepto</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search" 
                  placeholder="Buscar..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter" className="mb-2 block">Estado</Label>
              <Select 
                defaultValue="todos" 
                onValueChange={value => setStatusFilter(value)}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-filter" className="mb-2 block">Mes/Año</Label>
              <Select 
                defaultValue="todos" 
                onValueChange={value => setDateFilter(value)}
              >
                <SelectTrigger id="date-filter">
                  <SelectValue placeholder="Todos los periodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los periodos</SelectItem>
                  {generateMonthOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredPayments.length} de {data.payments.length} registros
              </p>
            </div>
          </div>

          {/* Tabla de historial */}
          <div className="rounded-md border">
            <Table id="payment-history-table">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Concepto</TableHead>
                  <TableHead className="font-semibold">Monto</TableHead>
                  <TableHead className="font-semibold">Método de Pago</TableHead>
                  <TableHead className="font-semibold">Estado del Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron registros que coincidan con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {format(new Date(payment.fechaPago), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{payment.conceptName}</span>
                          <span className="text-xs text-muted-foreground">{payment.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          ${payment.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payment.metodoPago === 'tarjeta' && (
                            <CreditCard className="h-4 w-4 text-blue-600" />
                          )}
                          {payment.metodoPago === 'efectivo' && (
                            <Banknote className="h-4 w-4 text-green-600" />
                          )}
                          {payment.metodoPago === 'spei' && (
                            <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                          )}
                          {payment.metodoPago === 'transferencia' && (
                            <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="capitalize">{payment.metodoPago}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.estado === 'confirmado' && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                            ✅ Confirmado
                          </Badge>
                        )}
                        {payment.estado === 'pendiente' && (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
                            🕓 Pendiente
                          </Badge>
                        )}
                        {payment.estado === 'en_revision' && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                            🔄 En revisión
                          </Badge>
                        )}
                        {payment.estado === 'rechazado' && (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                            ❌ Rechazado
                          </Badge>
                        )}
                        {!payment.estado && (
                          <Badge variant="outline" className="text-muted-foreground">
                            🕓 Pendiente
                          </Badge>
                        )}
                      </TableCell>

                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}