import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Payment, Student } from "@shared/schema";
import { format, parse, isAfter, isBefore, isEqual } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ArrowLeft, Calendar, Filter, FileText, 
  CreditCardIcon, BanknoteIcon, ReceiptIcon, Search,
  CalendarIcon, Receipt, PieChart
} from "lucide-react";
import DownloadReceiptButton from "@/components/payments/DownloadReceiptButton";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Ciclos escolares predefinidos
const SCHOOL_CYCLES = [
  "2024-2025",
  "2023-2024",
  "2022-2023",
];

// Función auxiliar para obtener el año del pago
const getPaymentYear = (date: string) => {
  return new Date(date).getFullYear();
};

// Obtiene un icono según el método de pago
const getPaymentMethodIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'efectivo':
      return <BanknoteIcon className="h-4 w-4 mr-2 text-green-600" />;
    case 'tarjeta':
      return <CreditCardIcon className="h-4 w-4 mr-2 text-blue-600" />;
    case 'transferencia':
      return <ReceiptIcon className="h-4 w-4 mr-2 text-purple-600" />;
    default:
      return <CreditCardIcon className="h-4 w-4 mr-2 text-gray-600" />;
  }
};

// Evalúa si el pago está dentro del rango de fechas
const isPaymentInDateRange = (paymentDate: string, startDate: string | null, endDate: string | null) => {
  if (!startDate && !endDate) return true;
  
  const paymentDateTime = new Date(paymentDate);
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (isAfter(paymentDateTime, start) || isEqual(paymentDateTime, start)) && 
           (isBefore(paymentDateTime, end) || isEqual(paymentDateTime, end));
  }
  
  if (startDate && !endDate) {
    const start = new Date(startDate);
    return isAfter(paymentDateTime, start) || isEqual(paymentDateTime, start);
  }
  
  if (!startDate && endDate) {
    const end = new Date(endDate);
    return isBefore(paymentDateTime, end) || isEqual(paymentDateTime, end);
  }
  
  return true;
};

// Determina si un pago corresponde a un ciclo escolar
// Un ciclo escolar va desde agosto del primer año hasta julio del segundo año
const isPaymentInSchoolCycle = (paymentDate: string, cycle: string) => {
  if (cycle === "todos") return true;
  
  const [startYearStr, endYearStr] = cycle.split("-");
  const startYear = parseInt(startYearStr);
  const endYear = parseInt(endYearStr);
  
  const paymentDateTime = new Date(paymentDate);
  const paymentYear = paymentDateTime.getFullYear();
  const paymentMonth = paymentDateTime.getMonth(); // 0-11
  
  // Agosto a diciembre del primer año
  if (paymentYear === startYear && paymentMonth >= 7) {
    return true;
  }
  
  // Enero a julio del segundo año
  if (paymentYear === endYear && paymentMonth <= 6) {
    return true;
  }
  
  return false;
};

export default function PaymentHistory() {
  const { alumnoId } = useParams();
  const [, navigate] = useLocation();
  const [filterTab, setFilterTab] = useState<string>("cycle");
  const [selectedCycle, setSelectedCycle] = useState<string>("todos");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const studentId = alumnoId ? parseInt(alumnoId) : null;

  // Obtener información del estudiante
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: [`/api/students/${studentId}`],
    enabled: !!studentId,
    refetchOnWindowFocus: false,
  });

  // Obtener pagos del estudiante
  const { 
    data: payments, 
    isLoading: paymentsLoading,
    error: paymentsError
  } = useQuery({
    queryKey: [`/api/payments?alumno_id=${studentId}`],
    enabled: !!studentId,
    refetchOnWindowFocus: false,
  });

  // Obtener conceptos de pago para mostrar nombres
  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['/api/payment-concepts'],
    refetchOnWindowFocus: false,
  });

  const isLoading = studentLoading || paymentsLoading || conceptsLoading;

  // Función para obtener nombre del concepto
  const getConceptName = (conceptId: number) => {
    if (!concepts) return "Cargando...";
    const concept = Array.isArray(concepts) ? concepts.find((c) => c.id === conceptId) : null;
    return concept ? concept.nombre : "Desconocido";
  };

  // Obtener años disponibles para filtrado
  const getAvailableYears = () => {
    if (!payments || !Array.isArray(payments) || payments.length === 0) return [];
    
    const years = [...new Set(payments.map((payment) => 
      getPaymentYear(payment.fechaPago)
    ))];
    
    return years.sort((a, b) => b - a); // Ordenar descendente (más reciente primero)
  };

  // Filtrar pagos según criterios seleccionados
  const getFilteredPayments = () => {
    if (!Array.isArray(payments)) return [];
    
    if (filterTab === "cycle") {
      return selectedCycle === "todos" 
        ? payments
        : payments.filter(payment => isPaymentInSchoolCycle(payment.fechaPago, selectedCycle));
    } else {
      return payments.filter(payment => 
        isPaymentInDateRange(payment.fechaPago, startDate, endDate)
      );
    }
  };

  const filteredPayments = getFilteredPayments();

  // Cálculo de estadísticas
  const calculateStats = () => {
    if (!filteredPayments.length) return { total: 0, count: 0 };
    
    const total = filteredPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.monto), 0);
      
    return {
      total,
      count: filteredPayments.length
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/pagos")} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Historial de Pagos
          </h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Cargando información...</p>
          </div>
        </div>
      </div>
    );
  }

  if (paymentsError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/pagos")} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Historial de Pagos
          </h1>
        </div>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error al cargar pagos</h2>
              <p className="text-muted-foreground mb-6">
                No se pudieron cargar los pagos del estudiante. Por favor intenta de nuevo.
              </p>
              <Button onClick={() => navigate("/pagos")}>
                Volver al listado de pagos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/pagos")} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Historial de Pagos
          </h1>
          {student && (
            <p className="text-muted-foreground">
              Estudiante: <span className="font-medium">{student && typeof student === 'object' ? (student as any).nombreCompleto : ""}</span>
              {student && typeof student === 'object' && (student as any).nivel ? ` - ${(student as any).nivel}` : ""}
              {student && typeof student === 'object' && (student as any).grupo ? ` (${(student as any).grupo})` : ""}
            </p>
          )}
        </div>
      </div>
      
      {/* Panel de resumen/estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
              <CardDescription>En el período seleccionado</CardDescription>
            </div>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium">Número de Pagos</CardTitle>
              <CardDescription>En el período seleccionado</CardDescription>
            </div>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium">Promedio por Pago</CardTitle>
              <CardDescription>En el período seleccionado</CardDescription>
            </div>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtra el historial de pagos por período o rango de fechas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="cycle">Ciclo Escolar</TabsTrigger>
              <TabsTrigger value="date">Rango de Fechas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cycle" className="pt-2">
              <div className="w-full sm:w-1/2">
                <Select
                  value={selectedCycle}
                  onValueChange={setSelectedCycle}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar ciclo escolar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los ciclos</SelectItem>
                    {SCHOOL_CYCLES.map((cycle) => (
                      <SelectItem key={cycle} value={cycle}>
                        {cycle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="date" className="pt-2">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-1/2">
                  <Label htmlFor="start-date">Fecha Inicial</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate || ''}
                    onChange={(e) => setStartDate(e.target.value || null)}
                    className="mt-1"
                  />
                </div>
                <div className="w-full sm:w-1/2">
                  <Label htmlFor="end-date">Fecha Final</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate || ''}
                    onChange={(e) => setEndDate(e.target.value || null)}
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Pagos Realizados
          </CardTitle>
          <CardDescription>
            Historial completo de pagos del estudiante
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments && filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: Payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.fechaPago), "PPP", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {getConceptName(payment.conceptoId)}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${parseFloat(payment.monto).toFixed(2)}
                      </TableCell>
                      <TableCell className="flex items-center whitespace-nowrap">
                        {getPaymentMethodIcon(payment.metodoPago)}
                        {payment.metodoPago}
                      </TableCell>
                      <TableCell>
                        {payment.referencia || 
                         `P${payment.id.toString().padStart(4, '0')}`}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          Pagado
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          (payment as any).canal === "Online" ? 
                          "bg-blue-50 text-blue-700 border-blue-200" : ""
                        }>
                          {(payment as any).canal === "Online" ? "En línea" : "Caja"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DownloadReceiptButton
                          payment={payment}
                          studentName={student && typeof student === 'object' ? (student as any).nombreCompleto || "" : ""}
                          conceptName={getConceptName(payment.conceptoId)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Sin pagos registrados</h2>
              <p className="text-muted-foreground">
                Este estudiante aún no ha realizado pagos durante el período seleccionado.
              </p>
            </div>
          )}
        </CardContent>
        {filteredPayments && filteredPayments.length > 0 && (
          <CardFooter className="flex justify-between text-sm text-muted-foreground">
            <div>
              Mostrando {filteredPayments.length} {filteredPayments.length === 1 ? 'pago' : 'pagos'}
            </div>
            <div>
              Última actualización: {format(new Date(), "PPP", { locale: es })}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}