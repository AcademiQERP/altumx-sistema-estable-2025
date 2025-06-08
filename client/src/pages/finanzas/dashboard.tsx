import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DollarSign,
  CreditCard,
  AlertTriangle,
  Users,
  TrendingUp,
  Download,
  Calendar,
  FileText,
  Clock,
} from "lucide-react";

export default function FinancesDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("mes-actual");
  const [selectedGroup, setSelectedGroup] = useState("todos");

  // Obtener datos de pagos para calcular métricas
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["/api/payments"],
  });

  // Obtener datos de adeudos para calcular métricas
  const { data: debts, isLoading: loadingDebts } = useQuery({
    queryKey: ["/api/debts"],
  });

  // Obtener estudiantes para calcular riesgo
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["/api/students"],
  });

  // Obtener grupos para el filtro
  const { data: groups } = useQuery({
    queryKey: ["/api/groups"],
  });

  // Función auxiliar para obtener la información completa del alumno por ID
  const getStudentInfo = (alumnoId: number) => {
    if (!students || !Array.isArray(students) || !groups || !Array.isArray(groups)) {
      return {
        fullDisplay: `Alumno ID: ${alumnoId}`,
        name: `Alumno ID: ${alumnoId}`,
        group: '',
        level: ''
      };
    }
    
    const student = students.find((s: any) => s.id === alumnoId);
    if (!student) {
      return {
        fullDisplay: `Alumno ID: ${alumnoId}`,
        name: `Alumno ID: ${alumnoId}`,
        group: '',
        level: ''
      };
    }

    // Buscar el grupo del estudiante
    const studentGroup = groups.find((g: any) => g.id === student.grupoId);
    
    // Construir la información completa
    const name = student.nombreCompleto || `Alumno ID: ${alumnoId}`;
    const groupName = studentGroup?.nombre || '';
    const level = studentGroup?.nivel || '';
    
    // Crear display completo
    let fullDisplay = name;
    if (groupName && level) {
      fullDisplay = `${name} – ${groupName} • ${level}`;
    } else if (groupName) {
      fullDisplay = `${name} – ${groupName}`;
    }
    
    return {
      fullDisplay,
      name,
      group: groupName,
      level
    };
  };

  // Calcular métricas financieras basadas en datos reales
  const calculateMetrics = () => {
    if (!payments || !debts || !students) {
      return {
        totalIngresos: 0,
        totalPendientes: 0,
        facturasEmitidas: 0,
        facturasPagadas: 0,
        alumnosConAdeudo: 0,
        alumnosRiesgoAlto: 0,
        alumnosRiesgoMedio: 0,
      };
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Filtrar pagos del período seleccionado
    const filteredPayments = payments.filter((payment: any) => {
      const paymentDate = new Date(payment.createdAt);
      if (selectedPeriod === "mes-actual") {
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      }
      return true; // Para otros períodos, mostrar todos por simplicidad
    });

    // Calcular ingresos totales
    const totalIngresos = filteredPayments.reduce((total: number, payment: any) => {
      return total + (parseFloat(payment.monto) || 0);
    }, 0);

    // Calcular adeudos pendientes
    const totalPendientes = debts.reduce((total: number, debt: any) => {
      if (debt.estatus === "pendiente") {
        return total + (parseFloat(debt.montoTotal) || 0);
      }
      return total;
    }, 0);

    // Contar facturas
    const facturasEmitidas = debts.length;
    const facturasPagadas = debts.filter((debt: any) => debt.estatus === "pagado").length;

    // Calcular alumnos con adeudo
    const alumnosConAdeudo = new Set(
      debts.filter((debt: any) => debt.estatus === "pendiente")
        .map((debt: any) => debt.alumnoId)
    ).size;

    // Simular clasificación de riesgo básica
    const alumnosRiesgoAlto = Math.floor(alumnosConAdeudo * 0.2);
    const alumnosRiesgoMedio = Math.floor(alumnosConAdeudo * 0.3);

    return {
      totalIngresos,
      totalPendientes,
      facturasEmitidas,
      facturasPagadas,
      alumnosConAdeudo,
      alumnosRiesgoAlto,
      alumnosRiesgoMedio,
    };
  };

  const metrics = calculateMetrics();

  // Obtener pagos recientes (últimos 5)
  const recentPayments = payments ? payments.slice(-5).reverse() : [];

  // Obtener adeudos próximos a vencer
  const upcomingDebts = debts ? debts
    .filter((debt: any) => debt.estatus === "pendiente" && debt.fechaLimite)
    .sort((a: any, b: any) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime())
    .slice(0, 5) : [];

  // Datos para el gráfico de ingresos vs adeudos
  const chartData = [
    {
      name: "Ingresos",
      valor: metrics.totalIngresos,
      color: "#10b981",
    },
    {
      name: "Pendientes",
      valor: metrics.totalPendientes,
      color: "#f59e0b",
    },
  ];

  // Datos para el gráfico de clasificación de riesgo
  const totalAlumnos = students?.length || 0;
  const sinRiesgo = Math.max(0, totalAlumnos - metrics.alumnosRiesgoAlto - metrics.alumnosRiesgoMedio);
  
  const riskData = [
    { name: "Riesgo Alto", value: metrics.alumnosRiesgoAlto, color: "#ef4444" },
    { name: "Riesgo Medio", value: metrics.alumnosRiesgoMedio, color: "#f59e0b" },
    { name: "Sin Riesgo", value: sinRiesgo, color: "#10b981" },
  ];

  const handleExportReport = () => {
    // Preparar datos para exportación
    const reportData = {
      fecha: new Date().toLocaleDateString(),
      periodo: selectedPeriod,
      grupo: selectedGroup,
      metricas: metrics,
      pagosRecientes: recentPayments,
      adeudosProximos: upcomingDebts,
    };
    
    // Crear y descargar archivo JSON como ejemplo
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-financiero-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = loadingPayments || loadingDebts || loadingStudents;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
          <p className="text-gray-600 mt-1">
            Resumen general del módulo de finanzas de AcademiQ
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes-actual">Mes actual</SelectItem>
              <SelectItem value="trimestre">Trimestre actual</SelectItem>
              <SelectItem value="semestre">Semestre actual</SelectItem>
              <SelectItem value="ciclo-escolar">Ciclo escolar</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los grupos</SelectItem>
              {groups?.map((group: any) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.nombre} - {group.nivel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleExportReport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50/70 to-emerald-50/70 hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-green-700">
              Ingresos del Período
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800 mb-2">
              ${metrics.totalIngresos.toLocaleString()}
            </div>
            <p className="text-sm text-green-600 leading-relaxed">
              Pagos recibidos y registrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50/70 to-yellow-50/70 hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-amber-700">
              Pagos Pendientes
            </CardTitle>
            <CreditCard className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-800 mb-2">
              ${metrics.totalPendientes.toLocaleString()}
            </div>
            <p className="text-sm text-amber-600 leading-relaxed">
              Adeudos sin liquidar
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50/70 to-sky-50/70 hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-blue-700">
              Facturas Pagadas
            </CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800 mb-2">
              {metrics.facturasPagadas} / {metrics.facturasEmitidas}
            </div>
            <p className="text-sm text-blue-600 leading-relaxed">
              {metrics.facturasEmitidas 
                ? Math.round((metrics.facturasPagadas / metrics.facturasEmitidas) * 100)
                : 0}% de cumplimiento
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50/70 to-rose-50/70 hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-red-700">
              Alumnos en Riesgo
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-800 mb-2">
              {metrics.alumnosRiesgoAlto + metrics.alumnosRiesgoMedio}
            </div>
            <p className="text-sm text-red-600 leading-relaxed">
              {metrics.alumnosRiesgoAlto} alto, {metrics.alumnosRiesgoMedio} medio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos y tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Ingresos vs Adeudos */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Ingresos vs Adeudos
            </CardTitle>
            <CardDescription className="text-sm">
              Comparación de ingresos recibidos contra pagos pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [
                    `$${Number(value).toLocaleString()}`,
                    name === "valor" ? "Monto" : name
                  ]}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Totales debajo del gráfico */}
            <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-sm font-medium text-green-600">Total Ingresos</div>
                <div className="text-lg font-bold text-green-700">${metrics.totalIngresos.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-amber-600">Total Pendientes</div>
                <div className="text-lg font-bold text-amber-700">${metrics.totalPendientes.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Clasificación de Riesgo */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              Clasificación de Riesgo
            </CardTitle>
            <CardDescription className="text-sm">
              Distribución de alumnos por nivel de riesgo financiero
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${value}` : ''}
                  labelLine={false}
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} alumnos`, name]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Leyenda con colores y números */}
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
              {riskData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm font-medium">{entry.name}</span>
                  <span className="text-sm text-gray-600">({entry.value})</span>
                </div>
              ))}
            </div>
            
            {/* Total de alumnos */}
            <div className="text-center mt-3">
              <div className="text-sm text-gray-500">Total de alumnos: {totalAlumnos}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tablas de información reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Últimos Pagos */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              Últimos Pagos Registrados
            </CardTitle>
            <CardDescription className="text-sm">
              Los 5 pagos más recientes del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments && recentPayments.length > 0 ? (
              <div className="space-y-3">
                {/* Encabezados */}
                <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
                  <div className="col-span-1"></div>
                  <div className="col-span-4">Alumno</div>
                  <div className="col-span-3">Fecha</div>
                  <div className="col-span-2">Método</div>
                  <div className="col-span-2 text-right">Monto</div>
                </div>
                
                {/* Tabla con scroll si hay más de 5 registros */}
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {recentPayments.slice(0, 5).map((payment: any) => (
                    <div key={payment.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                      <div className="col-span-1">
                        <CreditCard className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="col-span-4">
                        <div className="font-medium text-gray-900">
                          {getStudentInfo(payment.alumnoId).fullDisplay}
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="text-sm text-gray-600">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm text-gray-600">
                          {payment.metodoPago || 'Efectivo'}
                        </div>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="text-green-600 font-semibold">
                          ${Number(payment.monto).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No hay pagos recientes registrados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Vencimientos */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-orange-600" />
              Próximos Vencimientos
            </CardTitle>
            <CardDescription className="text-sm">
              Adeudos que vencen próximamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDebts && upcomingDebts.length > 0 ? (
              <div className="space-y-3">
                {/* Encabezados */}
                <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
                  <div className="col-span-1"></div>
                  <div className="col-span-4">Alumno</div>
                  <div className="col-span-3">Vence</div>
                  <div className="col-span-2">Concepto</div>
                  <div className="col-span-2 text-right">Monto</div>
                </div>
                
                {/* Tabla con scroll si hay más de 5 registros */}
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {upcomingDebts.slice(0, 5).map((debt: any) => (
                    <div key={debt.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                      <div className="col-span-1">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="col-span-4">
                        <div className="font-medium text-gray-900">
                          {getStudentInfo(debt.alumnoId).fullDisplay}
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="text-sm text-gray-600">
                          {new Date(debt.fechaLimite).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm text-gray-600">
                          ID: {debt.conceptoId}
                        </div>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="text-orange-600 font-semibold">
                          ${Number(debt.montoTotal).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No hay vencimientos próximos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enlaces rápidos a submódulos */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50/80 to-indigo-50/80 hover:shadow-xl transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-blue-800 text-lg">Acceso Rápido a Submódulos</CardTitle>
          <CardDescription className="text-blue-600">
            Navega directamente a las diferentes secciones del módulo financiero
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 px-4 py-3"
              onClick={() => window.location.href = '/pagos'}
              title="Ir a Pagos"
            >
              <DollarSign className="h-6 w-6" />
              <span className="text-xs font-medium">Pagos</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 px-4 py-3"
              onClick={() => window.location.href = '/adeudos'}
              title="Ver Adeudos"
            >
              <CreditCard className="h-6 w-6" />
              <span className="text-xs font-medium">Adeudos</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 px-4 py-3"
              onClick={() => window.location.href = '/estado-cuenta'}
              title="Consultar Estado de Cuenta"
            >
              <FileText className="h-6 w-6" />
              <span className="text-xs font-medium">Estado de Cuenta</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 px-4 py-3"
              onClick={() => window.location.href = '/clasificacion-riesgo'}
              title="Ver Clasificación de Riesgo"
            >
              <AlertTriangle className="h-6 w-6" />
              <span className="text-xs font-medium">Clasificación</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 px-4 py-3"
              onClick={() => window.location.href = '/admin/reportes-financieros'}
              title="Generar Reportes"
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-xs font-medium">Reportes</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 px-4 py-3"
              onClick={() => window.location.href = '/admin/test-reminders'}
              title="Configurar Recordatorios"
            >
              <Clock className="h-6 w-6" />
              <span className="text-xs font-medium">Recordatorios</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 px-4 py-3"
              onClick={handleExportReport}
              title="Descargar Resumen General PDF"
            >
              <Download className="h-6 w-6" />
              <span className="text-xs font-medium">Resumen PDF</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}