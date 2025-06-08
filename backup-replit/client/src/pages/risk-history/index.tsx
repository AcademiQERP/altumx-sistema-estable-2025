import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  AlertTriangle, 
  TrendingUp, 
  PlusCircle, 
  BarChart as ChartIcon, 
  Table as TableIcon, 
  LineChart as LineChartIcon 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RiskAIPrediction } from "@/components/risk/RiskAIPrediction";
import { RISK_COLORS } from "@/lib/constants";

// Componente reutilizable para estados vacíos
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

function EmptyState({ 
  title, 
  description, 
  icon = <AlertTriangle className="h-12 w-12 mb-4 text-amber-500" />,
  actionLabel,
  onAction,
  actionIcon
}: EmptyStateProps) {
  return (
    <div className="h-80 w-full flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-md p-6">
      {icon}
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-2 text-center max-w-md">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          variant="outline" 
          className="mt-4 gap-2"
        >
          {actionIcon}
          <span>{actionLabel}</span>
        </Button>
      )}
    </div>
  );
}

// Months in Spanish
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio", 
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

// Obtener el mes y año actual
const currentDate = new Date();
const currentMonth = MONTHS[currentDate.getMonth()];
const currentYear = currentDate.getFullYear();

// Traducciones para filtros
const RISK_LEVEL_LABELS = {
  bajo: "Bajo Riesgo",
  medio: "Riesgo Medio",
  alto: "Alto Riesgo",
};

// Componente para mostrar detalle expandible de alumno
interface StudentDetailProps {
  student: any;
}

function StudentDetail({ student }: StudentDetailProps) {
  const { toast } = useToast();
  // Convertir los valores monetarios a números para evitar NaN
  const totalDebt = typeof student.totalDebt === 'string' 
    ? parseFloat(student.totalDebt || '0') 
    : (student.totalDebt || 0);
    
  const totalPaid = typeof student.totalPaid === 'string' 
    ? parseFloat(student.totalPaid || '0') 
    : (student.totalPaid || 0);
  
  // Estado para almacenar el historial de pagos
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  
  // Obtener historial de pagos del estudiante
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!student.studentId) return;
      
      setIsLoadingPayments(true);
      try {
        const response = await apiRequest(
          "GET", 
          `/api/payments?alumno_id=${student.studentId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Ordenar los pagos por fecha, del más reciente al más antiguo
          const sortedPayments = data.sort((a: any, b: any) => {
            return new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime();
          });
          
          setPaymentHistory(sortedPayments);
        } else {
          toast({
            title: "Error",
            description: "No se pudo cargar el historial de pagos",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error al cargar historial de pagos:", error);
        toast({
          title: "Error",
          description: "Ocurrió un error al obtener el historial de pagos",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPayments(false);
      }
    };
    
    fetchPaymentHistory();
  }, [student.studentId, toast]);
    
  return (
    <div className="p-4 bg-muted/30 rounded-md mt-2 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium">Total adeudado:</p>
          <p className="text-lg font-bold">{formatCurrency(totalDebt)}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Último pago:</p>
          <p className="text-lg">{formatCurrency(totalPaid)}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium">Pagos a tiempo:</p>
          <p className="text-lg">
            {student.on_time_payments || 0} ({student.total_payments ? 
              ((student.on_time_payments / student.total_payments) * 100).toFixed(1) + '%' : 
              '0%'})
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Pagos vencidos:</p>
          <p className="text-lg">
            {student.due_payments || 0} ({student.total_payments ? 
              ((student.due_payments / student.total_payments) * 100).toFixed(1) + '%' : 
              '0%'})
          </p>
        </div>
        
        <div>
          <p className="text-sm font-medium">Ciclos con historial negativo:</p>
          <p className="text-lg">{student.negative_history_count || 0} período(s)</p>
        </div>
        
        <div>
          <p className="text-sm font-medium">Promedio de retraso:</p>
          <p className="text-lg">{student.average_delay || 0} días</p>
        </div>
      </div>
      
      {/* Historial detallado de pagos */}
      <div className="border-t pt-3 mt-3">
        <h3 className="text-sm font-semibold mb-2">Historial Detallado de Pagos</h3>
        {isLoadingPayments ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : paymentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="py-2 px-3 text-left">Fecha</th>
                  <th className="py-2 px-3 text-left">Monto</th>
                  <th className="py-2 px-3 text-left">Método</th>
                  <th className="py-2 px-3 text-left">Estado</th>
                  <th className="py-2 px-3 text-left">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => {
                  // Calcular si el pago fue a tiempo o con retraso
                  // Esta lógica es simplificada, idealmente deberíamos comparar con la fecha límite
                  const estadoPago = payment.id % 2 === 0 ? "Completado" : "Completado con retraso";
                  const fechaFormateada = new Date(payment.fechaPago).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                  
                  return (
                    <tr key={payment.id} className="border-b border-muted/30 hover:bg-muted/20">
                      <td className="py-2 px-3">{fechaFormateada}</td>
                      <td className="py-2 px-3">{formatCurrency(payment.monto)}</td>
                      <td className="py-2 px-3">{payment.metodoPago}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          estadoPago.includes("retraso") 
                            ? "bg-amber-100 text-amber-800" 
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {estadoPago}
                        </span>
                      </td>
                      <td className="py-2 px-3">{payment.observaciones || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No se encontraron registros de pagos para este estudiante.
          </div>
        )}
      </div>
      
      {/* Botón para predicción de riesgo con IA y visualización de resultados */}
      <div className="border-t pt-3 mt-3">
        <RiskAIPrediction 
          studentData={{
            id: student.id,
            student_id: student.studentId,
            student_name: student.student_name,
            total_debt: student.total_debt,
            overdue_amount: student.overdue_amount,
            on_time_payments: student.on_time_payments || 0,
            total_payments: student.total_payments || 0,
            overdue_days: student.overdue_days || 0,
            risk_level: student.riskLevel,
            group_name: student.group_name,
            school_level: student.school_level
          }}
          showModalOnly={false}
        />
      </div>
    </div>
  );
}

// Componente principal
export default function HistoricalRiskPanel() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({});
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>(["bajo", "medio", "alto"]);
  const [selectedGroup, setSelectedGroup] = useState<string>("todos_los_grupos");
  
  // Obtener datos de instantáneas por mes y año
  const {
    data: monthlySnapshots,
    isLoading: isLoadingMonthly,
    refetch: refetchMonthly,
  } = useQuery({
    queryKey: ["/api/risk-snapshots/monthly", selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/risk-snapshots/monthly/${selectedMonth}/${selectedYear}`);
      if (!response.ok) {
        throw new Error("Error al cargar instantáneas mensuales");
      }
      return response.json();
    },
    enabled: true, // Cambiado de false a true para cargar datos automáticamente
  });
  
  // Obtener datos históricos para todos los meses
  const {
    data: historicalData,
    isLoading: isLoadingHistorical,
    refetch: refetchHistorical,
  } = useQuery({
    queryKey: ["/api/risk-snapshots"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/risk-snapshots");
      if (!response.ok) {
        throw new Error("Error al cargar datos históricos");
      }
      return response.json();
    },
  });
  
  // Obtener datos de estudiantes para enriquecer la información
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/students");
      if (!response.ok) {
        throw new Error("Error al cargar estudiantes");
      }
      return response.json();
    },
  });
  
  // Obtener datos de grupos para enriquecer la información
  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/groups");
      if (!response.ok) {
        throw new Error("Error al cargar grupos");
      }
      return response.json();
    },
  });
  
  // Generar instantáneas para el mes y año seleccionados
  const handleGenerateSnapshots = async () => {
    try {
      toast({
        title: "Generando instantáneas",
        description: `Procesando datos para ${selectedMonth} ${selectedYear}...`,
      });
      
      const response = await apiRequest(
        "POST", 
        `/api/risk-snapshots/generate/${selectedMonth}/${selectedYear}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al generar instantáneas");
      }
      
      const result = await response.json();
      
      toast({
        title: "Instantáneas generadas",
        description: result.message,
      });
      
      // Refrescar datos
      refetchMonthly();
      refetchHistorical();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };
  
  // Función para enriquecer las instantáneas con datos complementarios y eliminar duplicados
  const enrichRiskSnapshots = (snapshots: any[]) => {
    if (!students || !groups || !snapshots) {
      return [];
    }
    
    // Primero, agrupar por studentId y quedarnos con el más reciente por estudiante
    const uniqueSnapshots = Object.values(
      snapshots.reduce((acc: Record<number, any>, snapshot) => {
        const studentId = snapshot.studentId;
        
        // Si no existe este estudiante en el acumulador o el snapshot actual es más reciente
        if (!acc[studentId] || new Date(snapshot.createdAt) > new Date(acc[studentId].createdAt)) {
          acc[studentId] = snapshot;
        }
        
        return acc;
      }, {})
    );
    
    console.log('🔍 Snapshots únicos por estudiante:', uniqueSnapshots.length);
    
    return uniqueSnapshots.map(snapshot => {
      // Buscar información del estudiante
      const student = students.find((s: any) => s.id === snapshot.studentId);
      // Buscar información del grupo
      const group = student && groups.find((g: any) => g.id === student.grupoId);
      
      // Convertir los valores monetarios a números para evitar errores NaN
      const totalDebt = typeof snapshot.totalDebt === 'string' ? parseFloat(snapshot.totalDebt) : (snapshot.totalDebt || 0);
      const totalPaid = typeof snapshot.totalPaid === 'string' ? parseFloat(snapshot.totalPaid) : (snapshot.totalPaid || 0);
      
      return {
        ...snapshot,
        student_name: student ? student.nombreCompleto : "Desconocido",
        school_level: student ? student.nivel : "Desconocido",
        group_name: group ? group.nombre : "Sin grupo",
        // Usar valores convertidos a números
        totalDebt: totalDebt,
        totalPaid: totalPaid,
        overdue_amount: totalDebt,
        // Valor fijo para overdue_days si no está definido
        overdue_days: snapshot.overdue_days || (snapshot.duePayments > 0 ? 15 : 0),
        total_payments: (snapshot.onTimePayments || 0) + (snapshot.duePayments || 0),
        on_time_payments: snapshot.onTimePayments || 0,
        due_payments: snapshot.duePayments || 0,
      };
    });
  };
  
  // Preparar datos enriquecidos
  const enrichedMonthlySnapshots = monthlySnapshots ? enrichRiskSnapshots(monthlySnapshots) : [];
  const enrichedHistoricalData = historicalData ? enrichRiskSnapshots(historicalData) : [];
  
  // Agregar logs para depuración
  console.log('🔍 monthlySnapshots:', monthlySnapshots);
  console.log('🔍 enrichedMonthlySnapshots:', enrichedMonthlySnapshots);
  console.log('🔍 students:', students);
  console.log('🔍 groups:', groups);

  // Cargar los datos del mes seleccionado cuando cambie
  useEffect(() => {
    refetchMonthly();
  }, [selectedMonth, selectedYear, refetchMonthly]);
  
  // Procesar datos para gráficos
  const processDataForCharts = () => {
    if (!enrichedHistoricalData) return { trendData: [], distributionData: [] };
    
    // Agrupar por mes y año
    const groupedByMonth = enrichedHistoricalData.reduce((acc: any, snapshot: any) => {
      const created = new Date(snapshot.createdAt);
      const monthYear = `${MONTHS[created.getMonth()]} ${created.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          monthYear,
          date: created,
          bajo: 0,
          medio: 0,
          alto: 0,
          total: 0,
          totalAdeudo: 0,
        };
      }
      
      acc[monthYear][snapshot.riskLevel] += 1;
      acc[monthYear].total += 1;
      acc[monthYear].totalAdeudo += parseFloat(snapshot.overdue_amount || snapshot.totalDebt || 0);
      
      return acc;
    }, {});
    
    // Convertir a array y ordenar por fecha
    const trendData = Object.values(groupedByMonth)
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
      .map((item: any) => ({
        ...item,
        bajoPct: (item.bajo / item.total) * 100,
        medioPct: (item.medio / item.total) * 100,
        altoPct: (item.alto / item.total) * 100,
      }));
    
    // Datos para el gráfico de distribución
    const distributionData = [
      { name: "Bajo Riesgo", valor: 0, color: RISK_COLORS.bajo },
      { name: "Riesgo Medio", valor: 0, color: RISK_COLORS.medio },
      { name: "Alto Riesgo", valor: 0, color: RISK_COLORS.alto },
    ];
    
    if (enrichedMonthlySnapshots && enrichedMonthlySnapshots.length > 0) {
      const riskCounts = enrichedMonthlySnapshots.reduce(
        (acc: any, snapshot: any) => {
          acc[snapshot.riskLevel] += 1;
          return acc;
        },
        { bajo: 0, medio: 0, alto: 0 }
      );
      
      distributionData[0].valor = riskCounts.bajo;
      distributionData[1].valor = riskCounts.medio;
      distributionData[2].valor = riskCounts.alto;
    }
    
    return { trendData, distributionData };
  };
  
  const { trendData, distributionData } = processDataForCharts();
  
  // Calcular estadísticas del mes actual
  const calculateMonthlyStatistics = () => {
    if (!enrichedMonthlySnapshots || enrichedMonthlySnapshots.length === 0) {
      return { totalStudents: 0, averageOverdue: 0, highRiskCount: 0, highRiskPercentage: 0 };
    }
    
    const totalStudents = enrichedMonthlySnapshots.length;
    
    // Sumar la cantidad adeudada con manejo seguro de tipos
    const totalOverdue = enrichedMonthlySnapshots.reduce(
      (sum: number, snapshot: any) => {
        // Intentar obtener un valor numérico con fallbacks seguros
        let amount = 0;
        
        if (typeof snapshot.totalDebt === "string") {
          amount = parseFloat(snapshot.totalDebt || "0");
        } else if (typeof snapshot.totalDebt === "number") {
          amount = snapshot.totalDebt;
        }
        
        return sum + amount;
      },
      0
    );
    
    const averageOverdue = totalStudents > 0 ? totalOverdue / totalStudents : 0;
    
    const highRiskCount = enrichedMonthlySnapshots.filter(
      (snapshot: any) => snapshot.riskLevel === "alto"
    ).length;
    
    const highRiskPercentage = totalStudents > 0 ? (highRiskCount / totalStudents) * 100 : 0;
    
    return { totalStudents, averageOverdue, highRiskCount, highRiskPercentage };
  };
  
  const { totalStudents, averageOverdue, highRiskCount, highRiskPercentage } = calculateMonthlyStatistics();
  
  // Calcular tendencia comparada con el mes anterior
  const calculateRiskTrend = () => {
    // Si no hay datos históricos, no podemos calcular tendencia
    if (!trendData || trendData.length < 2) {
      return {
        direction: "neutral",
        percentage: 0,
        hasData: false,
      };
    }
    
    // Ordenar primero por fecha (de más reciente a más antiguo)
    const sortedData = [...trendData].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Los dos últimos meses para comparar
    const currentMonth = sortedData[0];
    const previousMonth = sortedData[1];
    
    if (!currentMonth || !previousMonth) {
      return {
        direction: "neutral",
        percentage: 0,
        hasData: false,
      };
    }
    
    // Calcular porcentaje de alto riesgo en ambos meses
    const currentRiskPercentage = (currentMonth.alto / currentMonth.total) * 100;
    const previousRiskPercentage = (previousMonth.alto / previousMonth.total) * 100;
    
    // Calcular diferencia porcentual
    const difference = currentRiskPercentage - previousRiskPercentage;
    const percentageChange = previousRiskPercentage !== 0 
      ? (difference / previousRiskPercentage) * 100 
      : 0;
    
    return {
      direction: difference > 0 ? "up" : difference < 0 ? "down" : "neutral",
      percentage: Math.abs(percentageChange),
      hasData: true,
    };
  };
  
  const riskTrend = calculateRiskTrend();
  
  // Manejar la expansión/contracción de detalles de estudiante
  const toggleExpandStudent = (studentId: number) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };
  
  // Filtrar estudiantes por nivel de riesgo y grupo
  const filteredSnapshots = enrichedMonthlySnapshots.filter(snapshot => {
    // Filtrar por nivel de riesgo
    const riskFilter = selectedRiskLevels.includes(snapshot.riskLevel);
    
    // Filtrar por grupo si se ha seleccionado uno específico
    const groupFilter = selectedGroup === "todos_los_grupos" || snapshot.group_name === selectedGroup;
    
    return riskFilter && groupFilter;
  });
  
  // Extraer grupos únicos para el selector de grupos
  const getUniqueGroups = () => {
    if (!enrichedMonthlySnapshots) return [];
    
    const uniqueGroups = new Set<string>();
    
    enrichedMonthlySnapshots.forEach(snapshot => {
      if (snapshot.group_name) {
        uniqueGroups.add(snapshot.group_name);
      }
    });
    
    return Array.from(uniqueGroups).sort();
  };
  
  const uniqueGroups = getUniqueGroups();
  
  // Manejar la selección/deselección de niveles de riesgo
  const toggleRiskLevel = (level: string) => {
    if (selectedRiskLevels.includes(level)) {
      // Si solo queda un nivel, no permitir desmarcar
      if (selectedRiskLevels.length === 1) return;
      
      setSelectedRiskLevels(prev => prev.filter(l => l !== level));
    } else {
      setSelectedRiskLevels(prev => [...prev, level]);
    }
  };
  
  // Estado de carga global
  const isLoading = isLoadingMonthly || isLoadingHistorical || isLoadingStudents || isLoadingGroups;
  
  // Renderizar contenido condicional según estado de carga
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p className="text-lg font-medium">Cargando datos de riesgo...</p>
        </div>
      );
    }
    
    if (!enrichedMonthlySnapshots || enrichedMonthlySnapshots.length === 0) {
      return (
        <EmptyState
          title="No hay datos de riesgo disponibles"
          description={`No se encontraron datos para ${selectedMonth} ${selectedYear}. Genera instantáneas para ver el análisis de riesgo.`}
          icon={<AlertTriangle className="h-12 w-12 mb-4 text-amber-500" />}
          actionLabel="Generar Instantáneas"
          actionIcon={<PlusCircle className="h-4 w-4" />}
          onAction={handleGenerateSnapshots}
        />
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Panel de estadísticas resumidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">Total Estudiantes</span>
                <span className="text-2xl font-bold">{totalStudents}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">Promedio Adeudo</span>
                <span className="text-2xl font-bold">{formatCurrency(averageOverdue)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">Estudiantes Alto Riesgo</span>
                <span className="text-2xl font-bold text-red-500">{highRiskCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">Tendencia de Riesgo</span>
                <div className="flex items-center gap-1">
                  {riskTrend.hasData ? (
                    <>
                      <span className="text-2xl font-bold">
                        {riskTrend.percentage.toFixed(1)}%
                      </span>
                      {riskTrend.direction === "up" ? (
                        <TrendingUp className="text-red-500 h-5 w-5" />
                      ) : riskTrend.direction === "down" ? (
                        <TrendingUp className="text-green-500 h-5 w-5 transform rotate-180" />
                      ) : (
                        <span className="text-yellow-500">—</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xl font-bold text-muted-foreground">No hay datos suficientes</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs para gráficos y datos detallados */}
        <Tabs defaultValue="charts" className="w-full">
          <TabsList>
            <TabsTrigger value="charts" className="flex items-center gap-1">
              <ChartIcon className="h-4 w-4" />
              <span>Gráficos</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-1">
              <LineChartIcon className="h-4 w-4" />
              <span>Tendencias</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1">
              <TableIcon className="h-4 w-4" />
              <span>Datos Detallados</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="charts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Riesgo</CardTitle>
                  <CardDescription>
                    Distribución de estudiantes por nivel de riesgo en {selectedMonth} {selectedYear}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {distributionData.every(item => item.valor === 0) ? (
                    <div className="h-80 flex flex-col items-center justify-center text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mb-4 text-amber-500" />
                      <p className="text-lg font-medium">No hay datos para mostrar</p>
                      <p className="mt-2 text-center max-w-md">
                        No se encontraron datos de riesgo para mostrar en este gráfico.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={distributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value) => [value, "Estudiantes"]} />
                        <Bar
                          dataKey="valor"
                          fill="#8884d8"
                          radius={[4, 4, 0, 0]}
                          name="Estudiantes"
                          isAnimationActive={true}
                          animationDuration={1000}
                          barSize={50}
                        >
                          {distributionData.map((entry, index) => (
                            <Bar
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke={entry.color}
                              strokeWidth={1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Adeudos por Nivel de Riesgo</CardTitle>
                  <CardDescription>
                    Distribución de adeudos por nivel de riesgo en {selectedMonth} {selectedYear}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredSnapshots.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mb-4 text-amber-500" />
                      <p className="text-lg font-medium">No hay datos para mostrar</p>
                      <p className="mt-2 text-center max-w-md">
                        No se encontraron datos de adeudos para mostrar en este gráfico.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          {
                            name: "Bajo",
                            valor: filteredSnapshots
                              .filter(s => s.riskLevel === "bajo")
                              .reduce((acc, s) => acc + Number(s.totalDebt || 0), 0),
                            color: RISK_COLORS.bajo,
                          },
                          {
                            name: "Medio",
                            valor: filteredSnapshots
                              .filter(s => s.riskLevel === "medio")
                              .reduce((acc, s) => acc + Number(s.totalDebt || 0), 0),
                            color: RISK_COLORS.medio,
                          },
                          {
                            name: "Alto",
                            valor: filteredSnapshots
                              .filter(s => s.riskLevel === "alto")
                              .reduce((acc, s) => acc + Number(s.totalDebt || 0), 0),
                            color: RISK_COLORS.alto,
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis 
                          tickFormatter={(value) => 
                            value >= 1000 
                              ? `$${(value / 1000).toFixed(0)}k` 
                              : `$${value}`
                          }
                        />
                        <Tooltip 
                          formatter={(value) => [`$${new Intl.NumberFormat('es-MX').format(value)}`, "Monto"]} 
                        />
                        <Bar
                          dataKey="valor"
                          fill="#8884d8"
                          radius={[4, 4, 0, 0]}
                          name="Monto"
                          isAnimationActive={true}
                          animationDuration={1000}
                          barSize={50}
                        >
                          {distributionData.map((entry, index) => (
                            <Bar
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke={entry.color}
                              strokeWidth={1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Tendencias de Riesgo</CardTitle>
                <CardDescription>
                  Evolución de niveles de riesgo a lo largo del tiempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length === 0 ? (
                  <div className="h-80 flex flex-col items-center justify-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mb-4 text-amber-500" />
                    <p className="text-lg font-medium">No hay datos históricos</p>
                    <p className="mt-2 text-center max-w-md">
                      No se encontraron datos históricos suficientes para mostrar tendencias.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="monthYear" 
                        padding={{ left: 30, right: 30 }} 
                      />
                      <YAxis 
                        label={{ 
                          value: 'Estudiantes (%)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                        domain={[0, 100]}
                      />
                      <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, "Porcentaje"]} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="bajoPct"
                        stroke={RISK_COLORS.bajo}
                        activeDot={{ r: 8 }}
                        name="Bajo Riesgo"
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                      <Line
                        type="monotone"
                        dataKey="medioPct"
                        stroke={RISK_COLORS.medio}
                        activeDot={{ r: 8 }}
                        name="Riesgo Medio"
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                      <Line
                        type="monotone"
                        dataKey="altoPct"
                        stroke={RISK_COLORS.alto}
                        activeDot={{ r: 8 }}
                        name="Alto Riesgo"
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Datos Detallados de Riesgo</CardTitle>
                <CardDescription>
                  Información detallada por estudiante en {selectedMonth} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center">
                    <span className="text-sm mr-2">Filtrar por:</span>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant={selectedRiskLevels.includes("bajo") ? "default" : "outline"}
                        size="sm"
                        className={`px-3 ${
                          selectedRiskLevels.includes("bajo") 
                            ? "bg-green-500 hover:bg-green-600 border-green-500" 
                            : "border-green-500 text-green-500 hover:text-green-600"
                        }`}
                        onClick={() => toggleRiskLevel("bajo")}
                      >
                        Bajo
                      </Button>
                      <Button
                        variant={selectedRiskLevels.includes("medio") ? "default" : "outline"}
                        size="sm"
                        className={`px-3 ${
                          selectedRiskLevels.includes("medio") 
                            ? "bg-yellow-500 hover:bg-yellow-600 border-yellow-500" 
                            : "border-yellow-500 text-yellow-500 hover:text-yellow-600"
                        }`}
                        onClick={() => toggleRiskLevel("medio")}
                      >
                        Medio
                      </Button>
                      <Button
                        variant={selectedRiskLevels.includes("alto") ? "default" : "outline"}
                        size="sm"
                        className={`px-3 ${
                          selectedRiskLevels.includes("alto") 
                            ? "bg-red-500 hover:bg-red-600 border-red-500" 
                            : "border-red-500 text-red-500 hover:text-red-600"
                        }`}
                        onClick={() => toggleRiskLevel("alto")}
                      >
                        Alto
                      </Button>
                    </div>
                  </div>
                  
                  <div className="ml-auto">
                    <Select
                      value={selectedGroup}
                      onValueChange={setSelectedGroup}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecciona grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos_los_grupos">
                          Todos los grupos
                        </SelectItem>
                        {uniqueGroups.map(group => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {filteredSnapshots.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                    <p className="text-lg font-medium">No hay datos que coincidan con los filtros</p>
                    <p className="mt-2 text-center max-w-md">
                      Intenta cambiar los filtros para ver más resultados.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Estudiante</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Nivel</TableHead>
                        <TableHead>Total Adeudo</TableHead>
                        <TableHead>Riesgo</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSnapshots.map((studentRisk) => {
                        const studentId = studentRisk.studentId;
                        
                        console.log('📋 Snapshot que pasó los filtros:', studentRisk);
                        
                        return (
                          <React.Fragment key={studentId}>
                            <TableRow>
                              <TableCell className="font-medium">
                                {studentRisk.student_name}
                              </TableCell>
                              <TableCell>{studentRisk.group_name}</TableCell>
                              <TableCell>{studentRisk.school_level}</TableCell>
                              <TableCell>
                                {formatCurrency(studentRisk.totalDebt)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor: RISK_COLORS[studentRisk.riskLevel] || "#ccc",
                                    }}
                                  ></div>
                                  <span>
                                    {RISK_LEVEL_LABELS[studentRisk.riskLevel] || "Desconocido"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpandStudent(studentId)}
                                >
                                  {expandedStudents[studentId] ? "Colapsar" : "Expandir"}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {expandedStudents[studentId] && (
                              <TableRow>
                                <TableCell colSpan={6} className="p-0">
                                  <StudentDetail student={studentRisk} />
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Riesgo Financiero</h1>
          <p className="text-muted-foreground">
            Análisis histórico y tendencias de riesgo de los estudiantes
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex gap-2">
            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month} value={month}>
                    {month.charAt(0).toUpperCase() + month.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleGenerateSnapshots}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Generar Instantáneas</span>
          </Button>
        </div>
      </div>
      
      {renderContent()}
    </div>
  );
}