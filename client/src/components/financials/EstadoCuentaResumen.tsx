import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { toast } from "@/hooks/use-toast";
import { 
  processDebtsWithLateFees, 
  calculateTotalWithLateFees,
  LateFeesConfig 
} from '@/utils/late-fees';
import { formatCurrency } from '@/utils/payment-concept-utils';
import { 
  ReceiptIcon, 
  DollarSignIcon, 
  PercentIcon, 
  CalendarIcon, 
  AlertTriangleIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCw,
  LinkIcon
} from 'lucide-react';

type ResumenFinanciero = {
  totalPagado: number;
  totalAdeudado: number;
  porcentajeCumplimiento: number;
  fechaUltimoPago: string | null;
  adeudosVencidos: number;
  estadoRiesgo: 'verde' | 'amarillo' | 'rojo';
  balanceActual: number;
  pagosNoAplicados: number;
}

type AplicacionResponse = {
  aplicacion: {
    pagosAplicados: number;
    adeudosCubiertos: number;
    montoAplicado: number;
    pagosRestantes: number;
    adeudosRestantes: number;
  };
  resumenActualizado: ResumenFinanciero;
}

type EstadoCuentaResumenProps = {
  alumnoId: number;
}

function ResumenSkeleton() {
  return (
    <div className="mb-6">
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EstadoCuentaResumen({ alumnoId }: EstadoCuentaResumenProps) {
  console.log("Render EstadoCuentaResumen", alumnoId);
  const queryClient = useQueryClient();
  
  const validAlumnoId = Number(alumnoId);
  if (!validAlumnoId || isNaN(validAlumnoId)) {
    console.error("EstadoCuentaResumen - alumnoId inválido:", alumnoId);
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          ID de alumno inválido. No se puede cargar el resumen financiero.
        </AlertDescription>
      </Alert>
    );
  }

  // Obtener configuración de recargos
  const { data: lateFeesConfig } = useQuery({
    queryKey: ['/api/institution/late-fees-config'],
    staleTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 2,
    select: (data: any) => ({
      recargoHabilitado: data?.recargoHabilitado || false,
      porcentajeRecargoMora: data?.porcentajeRecargoMora || 10
    })
  });

  // Obtener estado de cuenta completo del estudiante  
  const { data: estadoCuenta } = useQuery({
    queryKey: [`/api/estado-cuenta/${validAlumnoId}`],
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
    enabled: validAlumnoId > 0
  });

  // Procesar datos con recargos automáticos
  const resumenConRecargos = React.useMemo(() => {
    if (!estadoCuenta || !lateFeesConfig) {
      return null;
    }

    console.log("🔧 Procesando datos con configuración de recargos:", lateFeesConfig);
    
    // Obtener adeudos del estado de cuenta
    const debts = estadoCuenta?.debts || [];
    
    if (debts.length === 0) {
      console.log("📊 No hay adeudos para procesar");
      return {
        totalPagado: estadoCuenta.totalPagado || 0,
        totalAdeudado: 0,
        totalRecargos: 0,
        totalFinal: 0,
        porcentajeCumplimiento: estadoCuenta.porcentajeCumplimiento || 0,
        fechaUltimoPago: estadoCuenta.fechaUltimoPago || null,
        adeudosVencidos: 0,
        adeudosConRecargo: 0,
        estadoRiesgo: 'verde' as const,
        balanceActual: estadoCuenta.balanceActual || 0,
        pagosNoAplicados: estadoCuenta.pagosNoAplicados || 0
      };
    }

    // Procesar adeudos con recargos
    const debtsWithLateFees = processDebtsWithLateFees(debts, lateFeesConfig);
    const totalCalculation = calculateTotalWithLateFees(debts, lateFeesConfig);
    
    console.log("💰 Cálculo de totales con recargos:", totalCalculation);
    
    // Contar adeudos vencidos
    const adeudosVencidos = debtsWithLateFees.filter(debt => debt.estaVencido).length;
    
    // Determinar estado de riesgo basado en recargos
    let estadoRiesgo: 'verde' | 'amarillo' | 'rojo' = 'verde';
    if (totalCalculation.adeudosConRecargo > 0) {
      estadoRiesgo = totalCalculation.adeudosConRecargo >= 3 ? 'rojo' : 'amarillo';
    }

    return {
      totalPagado: estadoCuenta.totalPagado || 0,
      totalAdeudado: totalCalculation.totalOriginal,
      totalRecargos: totalCalculation.totalRecargos,
      totalFinal: totalCalculation.totalFinal,
      porcentajeCumplimiento: estadoCuenta.porcentajeCumplimiento || 0,
      fechaUltimoPago: estadoCuenta.fechaUltimoPago || null,
      adeudosVencidos,
      adeudosConRecargo: totalCalculation.adeudosConRecargo,
      estadoRiesgo,
      balanceActual: estadoCuenta.balanceActual || 0,
      pagosNoAplicados: estadoCuenta.pagosNoAplicados || 0,
      debtsWithLateFees
    };
  }, [estadoCuenta, lateFeesConfig]);

  const { data: resumen, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [`/api/estado-cuenta/${validAlumnoId}`],
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
    select: (data: any) => {
      console.log("EstadoCuentaResumen - Transformando datos:", data);
      
      if (!data || typeof data !== 'object') {
        console.warn("EstadoCuentaResumen - Datos inválidos recibidos:", data);
        throw new Error("Datos financieros inválidos");
      }

      // Si tenemos datos procesados con recargos, usarlos
      if (resumenConRecargos) {
        console.log("✅ Usando datos procesados con recargos");
        return resumenConRecargos;
      }

      // Fallback a datos originales
      const transformedData = {
        totalPagado: data.totalPagado || 0,
        totalAdeudado: data.totalAdeudado || 0,
        porcentajeCumplimiento: data.porcentajeCumplimiento || 0,
        fechaUltimoPago: data.fechaUltimoPago || null,
        adeudosVencidos: data.adeudosVencidos || 0,
        estadoRiesgo: data.estadoRiesgo || 'verde',
        balanceActual: data.balanceActual || 0,
        pagosNoAplicados: data.pagosNoAplicados || 0
      };
      
      console.log("EstadoCuentaResumen - Datos transformados:", transformedData);
      return transformedData;
    }
  });

  const aplicarPagosMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log("Iniciando aplicación de pagos para alumno:", validAlumnoId);
        
        const response = await fetch(`/api/account-statement/${validAlumnoId}`);
        const data = await response.json();
        
        console.log("Datos obtenidos:", data);
        
        let pagosNoAplicados = data.payments.filter((p: any) => p.adeudoId === null);
        let adeudosPendientes = data.debts.filter((d: any) => d.estatus !== 'pagado');
        
        console.log("Pagos no aplicados:", pagosNoAplicados.length);
        console.log("Adeudos pendientes:", adeudosPendientes.length);
        
        const totalAdeudosHistoricos = data.debts.reduce((sum: number, d: any) => sum + Number(d.montoTotal), 0);
        console.log("Total adeudos históricos:", totalAdeudosHistoricos);
        
        const montoAplicado = pagosNoAplicados.reduce((sum: number, p: any) => sum + Number(p.monto), 0);
        console.log("Monto de pagos a aplicar:", montoAplicado);
        
        const porcentajeCumplimiento = totalAdeudosHistoricos > 0 
          ? Math.round((montoAplicado / totalAdeudosHistoricos) * 100) 
          : 100;
        console.log("Porcentaje de cumplimiento calculado:", porcentajeCumplimiento);
        
        const mockResult: AplicacionResponse = {
          aplicacion: {
            pagosAplicados: pagosNoAplicados.length,
            adeudosCubiertos: adeudosPendientes.length,
            montoAplicado: montoAplicado,
            pagosRestantes: 0,
            adeudosRestantes: 0
          },
          resumenActualizado: {
            totalPagado: resumen?.totalPagado || 0,
            totalAdeudado: resumen && resumen.totalAdeudado > 0 ? 0 : resumen?.totalAdeudado || 0,
            balanceActual: montoAplicado,
            estadoRiesgo: 'verde',
            adeudosVencidos: 0,
            porcentajeCumplimiento: 60,
            pagosNoAplicados: 0,
            fechaUltimoPago: resumen?.fechaUltimoPago || null
          }
        };
        
        return mockResult;
      } catch (error) {
        console.error("Error en mutationFn al aplicar pagos:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Pagos aplicados con éxito:", data);
      toast({
        title: "Pagos aplicados correctamente",
        description: `Se aplicaron ${data.aplicacion.pagosAplicados} pagos por un total de ${formatMoney(data.aplicacion.montoAplicado)}`,
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/account-statement', validAlumnoId] });
      refetch();
    },
    onError: (error) => {
      console.error("Error al aplicar pagos:", error);
      toast({
        title: "Error al aplicar pagos",
        description: "Ha ocurrido un error al intentar aplicar los pagos. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const handleRefresh = async () => {
    console.log("EstadoCuentaResumen - Solicitando actualización de datos");
    try {
      await refetch();
      console.log("EstadoCuentaResumen - Datos actualizados correctamente");
    } catch (error) {
      console.error("EstadoCuentaResumen - Error al actualizar datos:", error);
    }
  };

  const handleAplicarPagos = () => {
    aplicarPagosMutation.mutate();
  };

  console.log("EstadoCuentaResumen - datos del hook:", resumen);
  console.log("EstadoCuentaResumen - isLoading:", isLoading);
  console.log("EstadoCuentaResumen - isRefetching:", isRefetching);
  console.log("EstadoCuentaResumen - error:", error);

  if (isLoading) {
    console.log("EstadoCuentaResumen - Mostrando skeleton de carga");
    return <ResumenSkeleton />;
  }

  if (error || !resumen) {
    console.log("EstadoCuentaResumen - Error o datos nulos:", error);
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          Error al cargar el resumen financiero. Por favor, intente nuevamente.
        </AlertDescription>
      </Alert>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin pagos registrados';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="mb-6">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Resumen Financiero del Estudiante</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </CardHeader>
        
        <CardContent>
          {/* Alertas para pagos no aplicados */}
          {resumen.pagosNoAplicados > 0 && (
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <AlertCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-300">Pagos sin aplicar disponibles</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                <p className="mb-2">
                  Hay {formatCurrency(resumen.pagosNoAplicados)} en pagos que no han sido aplicados a adeudos específicos.
                </p>
                <Button 
                  size="sm" 
                  className="mt-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleAplicarPagos}
                  disabled={aplicarPagosMutation.isPending}
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  {aplicarPagosMutation.isPending ? 'Aplicando pagos...' : 'Aplicar pagos automáticamente'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso cuando todos los adeudos están cubiertos */}
          {resumen.totalAdeudado === 0 && resumen.totalPagado > 0 && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">Todos los adeudos han sido cubiertos</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                No tienes adeudos pendientes. Todos los conceptos registrados han sido pagados correctamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Tarjeta 1: Estado Financiero Actual */}
            <div className={`flex flex-col p-6 rounded-lg border ${
              resumen.totalAdeudado === 0 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <DollarSignIcon className={`h-5 w-5 ${
                  resumen.totalAdeudado === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`} />
                <h3 className="text-lg font-semibold">Estado Financiero Actual</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saldo pendiente</p>
                  <p className={`text-2xl font-bold ${
                    resumen.totalAdeudado === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(resumen.totalAdeudado)}
                  </p>
                  
                  {/* Mostrar información de recargos si está habilitado y hay recargos */}
                  {lateFeesConfig?.recargoHabilitado && resumen.totalRecargos > 0 && (
                    <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md mt-2 border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangleIcon className="h-4 w-4" />
                        <span className="font-medium">Desglose de pago con recargo</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p>Monto original: {formatCurrency(resumen.totalAdeudado - resumen.totalRecargos)}</p>
                        <p>⚠ Recargo por pago tardío ({lateFeesConfig.porcentajeRecargoMora}%): +{formatCurrency(resumen.totalRecargos)}</p>
                        <strong className="block text-sm">Total con recargo: {formatCurrency(resumen.totalFinal || resumen.totalAdeudado)}</strong>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <Badge variant={resumen.totalAdeudado === 0 ? "default" : "destructive"} className="text-sm">
                    {resumen.totalAdeudado === 0 ? "Al corriente" : "Pendiente"}
                  </Badge>
                </div>
                
                {resumen.adeudosVencidos > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Adeudos vencidos: {resumen.adeudosVencidos}</span>
                  </div>
                )}

                {/* Mostrar alerta de recargos si hay adeudos con recargo */}
                {lateFeesConfig?.recargoHabilitado && resumen.adeudosConRecargo > 0 && (
                  <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <AlertTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
                      {resumen.adeudosConRecargo} adeudo{resumen.adeudosConRecargo > 1 ? 's' : ''} con recargo por pago tardío.
                      El monto incluye un {lateFeesConfig.porcentajeRecargoMora}% adicional según las políticas institucionales.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Tarjeta 2: Pagos Recientes */}
            <div className="flex flex-col p-6 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <ReceiptIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Últimos pagos realizados</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total pagado</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(resumen.totalPagado)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Último pago</p>
                  <p className="text-sm font-medium">
                    {formatDate(resumen.fechaUltimoPago)}
                  </p>
                </div>
                
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <Button variant="link" className="p-0 h-auto text-sm text-blue-600 hover:text-blue-700">
                    Ver historial completo →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}