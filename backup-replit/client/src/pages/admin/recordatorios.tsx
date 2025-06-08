import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Play, 
  RotateCw, 
  XCircle, 
  Power, 
  PowerOff,
  Calendar
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';

interface CronJob {
  name: string;
  running: boolean;
  nextRun: string;
  nextRunTimestamp: number | null;
  enabled: boolean;
}

interface CronStatusResponse {
  jobs: CronJob[];
  systemTime: string;
}

interface EmailLog {
  id: number;
  studentId: number | null;
  paymentId: number | null;
  debtId: number | null;
  recipientEmails: string;
  guardianEmail: string;
  subject: string;
  conceptName: string;
  status: string;
  sentAt: string;
  errorMessage: string | null;
  studentName?: string;
}

interface AuditLog {
  id: number;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  details: string;
  status: string;
  errorMessage: string | null;
  ipAddress: string;
  createdAt: string;
}

export default function RecordatoriosDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('cron-jobs');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [enabledStatus, setEnabledStatus] = useState<boolean>(false);
  
  // Obtener estado de los cron jobs
  const cronStatusQuery = useQuery<CronStatusResponse>({
    queryKey: ['/api/cron/status'],
    refetchInterval: 10000, // Refrescar cada 10 segundos
  });
  
  // Obtener logs de correos
  const emailLogsQuery = useQuery<EmailLog[]>({
    queryKey: ['/api/email-logs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/email-logs');
      return await response.json();
    },
  });
  
  // Obtener logs de auditoría
  const auditLogsQuery = useQuery<{total: number, logs: AuditLog[]}>({
    queryKey: ['/api/audit-logs/cron'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/audit-logs/cron');
      return await response.json();
    },
  });
  
  // Ejecutar manualmente el cron job de recordatorios
  const runRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/cron/reminders/run');
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Recordatorios ejecutados',
        description: 'El proceso de recordatorios ha sido ejecutado manualmente con éxito.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cron/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs/cron'] });
    },
    onError: (error) => {
      toast({
        title: 'Error al ejecutar recordatorios',
        description: `Ocurrió un error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive',
      });
    }
  });
  
  // Reiniciar todos los cron jobs
  const restartCronJobsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/cron/restart');
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Cron jobs reiniciados',
        description: 'Todos los cron jobs han sido reiniciados.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cron/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs/cron'] });
    },
    onError: (error) => {
      toast({
        title: 'Error al reiniciar cron jobs',
        description: `Ocurrió un error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive',
      });
    }
  });
  
  // Activar/desactivar cron jobs
  const toggleCronJobsMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const response = await apiRequest('POST', '/api/cron/toggle', { enable });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.enabled ? 'Cron jobs activados' : 'Cron jobs desactivados',
        description: data.enabled 
          ? 'Los cron jobs se ejecutarán según lo programado.' 
          : 'Los cron jobs no se ejecutarán hasta que sean reactivados.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cron/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs/cron'] });
    },
    onError: (error) => {
      toast({
        title: 'Error al cambiar estado de cron jobs',
        description: `Ocurrió un error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive',
      });
    }
  });
  
  // Enviar recordatorios de forma manual
  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/send-reminders');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Recordatorios enviados',
        description: `Se han enviado ${data.success_count} recordatorios. ${data.errors} errores. ${data.omitted} omitidos.`,
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs/cron'] });
    },
    onError: (error) => {
      toast({
        title: 'Error al enviar recordatorios',
        description: `Ocurrió un error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive',
      });
    }
  });
  
  useEffect(() => {
    if (cronStatusQuery.data?.jobs) {
      // Si hay al menos un trabajo, tomar su estado enabled
      const job = cronStatusQuery.data.jobs[0];
      if (job) {
        setEnabledStatus(job.enabled);
      }
    }
  }, [cronStatusQuery.data]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX');
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Enviado</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'omitido':
        return <Badge variant="outline">Omitido</Badge>;
      case 'sistema':
        return <Badge variant="secondary">Sistema</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getCronStatusBadge = (running: boolean, enabled: boolean) => {
    if (!enabled) {
      return <Badge variant="outline" className="flex items-center"><PowerOff className="w-3 h-3 mr-1" />Desactivado</Badge>;
    }
    
    if (running) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600 flex items-center"><Play className="w-3 h-3 mr-1" />Ejecutando</Badge>;
    } else {
      return <Badge variant="secondary" className="flex items-center"><Clock className="w-3 h-3 mr-1" />En espera</Badge>;
    }
  };
  
  const handleConfirmToggle = (enable: boolean) => {
    toggleCronJobsMutation.mutate(enable);
    setConfirmDialogOpen(false);
  };

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Panel de Recordatorios</h1>
          <p className="text-muted-foreground mt-2">
            Administración de recordatorios automáticos y tareas programadas del sistema
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="cron-jobs" className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Tareas Programadas
            </TabsTrigger>
            <TabsTrigger value="email-logs" className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Historial de Recordatorios
            </TabsTrigger>
            <TabsTrigger value="audit-logs" className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Logs de Auditoría
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cron-jobs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Estado de Tareas Programadas</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-normal">
                      {enabledStatus ? 'Activado' : 'Desactivado'}
                    </span>
                    <Switch 
                      checked={enabledStatus}
                      onCheckedChange={(checked) => {
                        setEnabledStatus(checked);
                        setConfirmDialogOpen(true);
                      }}
                    />
                  </div>
                </CardTitle>
                <CardDescription>
                  Visualiza y administra las tareas automáticas del sistema, como el envío diario de recordatorios
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cronStatusQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : cronStatusQuery.isError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      No se pudo obtener el estado de los cron jobs.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">
                        Hora del sistema: <span className="font-medium">{cronStatusQuery.data?.systemTime}</span>
                      </p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarea</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Próxima ejecución</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cronStatusQuery.data?.jobs?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                              No hay tareas programadas configuradas
                            </TableCell>
                          </TableRow>
                        ) : (
                          cronStatusQuery.data?.jobs?.map((job) => (
                            <TableRow key={job.name}>
                              <TableCell className="font-medium">{job.name}</TableCell>
                              <TableCell>{getCronStatusBadge(job.running, job.enabled)}</TableCell>
                              <TableCell>{job.nextRunTimestamp ? job.nextRun : 'No programado'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => cronStatusQuery.refetch()}
                    disabled={cronStatusQuery.isRefetching}
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => restartCronJobsMutation.mutate()}
                    disabled={restartCronJobsMutation.isPending}
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Reiniciar tareas
                  </Button>
                </div>
                <Button
                  onClick={() => runRemindersMutation.mutate()}
                  disabled={runRemindersMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Ejecutar recordatorios ahora
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Envío Manual de Recordatorios</CardTitle>
                <CardDescription>
                  Envía recordatorios de pagos pendientes y próximos a vencer sin esperar a la ejecución automática
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Al hacer clic en el botón, se enviarán recordatorios a los padres/tutores de alumnos con adeudos próximos
                  a vencer. El sistema evaluará el nivel de riesgo de cada estudiante y personalizará los mensajes según corresponda.
                </p>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Nota</AlertTitle>
                  <AlertDescription>
                    Los recordatorios se enviarán inmediatamente. Asegúrate de que los datos de contacto estén actualizados.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => sendRemindersMutation.mutate()}
                  disabled={sendRemindersMutation.isPending}
                  className="w-full"
                >
                  {sendRemindersMutation.isPending ? (
                    <>
                      <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Enviar recordatorios ahora
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="email-logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Recordatorios Enviados</CardTitle>
                <CardDescription>
                  Registro detallado de todos los recordatorios y notificaciones enviadas por el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emailLogsQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : emailLogsQuery.isError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      No se pudo obtener el historial de recordatorios.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Estudiante</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Destinatario</TableHead>
                          <TableHead className="w-[100px]">Detalles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailLogsQuery.data && emailLogsQuery.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No hay registros de recordatorios enviados
                            </TableCell>
                          </TableRow>
                        ) : (
                          emailLogsQuery.data?.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className="text-xs">{formatDate(log.sentAt)}</TableCell>
                              <TableCell className="font-medium">{log.conceptName}</TableCell>
                              <TableCell>{log.studentName || 'N/A'}</TableCell>
                              <TableCell>{getStatusBadge(log.status)}</TableCell>
                              <TableCell className="truncate max-w-[150px]" title={log.recipientEmails}>
                                {log.recipientEmails || log.guardianEmail || 'Sistema'}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      Ver
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>Detalles del Recordatorio</DialogTitle>
                                      <DialogDescription>
                                        Información completa del recordatorio enviado
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Fecha:</span>
                                        <span className="col-span-3">{formatDate(log.sentAt)}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Concepto:</span>
                                        <span className="col-span-3">{log.conceptName}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Asunto:</span>
                                        <span className="col-span-3">{log.subject}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Estudiante:</span>
                                        <span className="col-span-3">{log.studentName || 'N/A'}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Estado:</span>
                                        <span className="col-span-3">{getStatusBadge(log.status)}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Destinatarios:</span>
                                        <span className="col-span-3">{log.recipientEmails || log.guardianEmail || 'N/A'}</span>
                                      </div>
                                      {log.errorMessage && (
                                        <div className="grid grid-cols-4 items-start gap-4">
                                          <span className="text-sm font-medium">Mensaje de error:</span>
                                          <div className="col-span-3 bg-muted p-2 rounded-md text-sm overflow-auto max-h-32">
                                            <pre>{log.errorMessage}</pre>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => emailLogsQuery.refetch()}
                  disabled={emailLogsQuery.isRefetching}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="audit-logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Acciones del Sistema</CardTitle>
                <CardDescription>
                  Historial detallado de todas las operaciones administrativas realizadas en el sistema de recordatorios
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogsQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : auditLogsQuery.isError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      No se pudo obtener el registro de auditoría.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Acción</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-[100px]">Detalles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogsQuery.data?.logs && auditLogsQuery.data.logs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No hay registros de auditoría
                            </TableCell>
                          </TableRow>
                        ) : (
                          auditLogsQuery.data?.logs?.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className="text-xs">{formatDate(log.createdAt)}</TableCell>
                              <TableCell className="font-medium">{log.userName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{log.userRole}</Badge>
                              </TableCell>
                              <TableCell>{log.action}</TableCell>
                              <TableCell>
                                {log.status === 'success' ? (
                                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">Éxito</Badge>
                                ) : (
                                  <Badge variant="destructive">Error</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      Ver
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>Detalles de la Operación</DialogTitle>
                                      <DialogDescription>
                                        Información detallada sobre la acción realizada
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Fecha:</span>
                                        <span className="col-span-3">{formatDate(log.createdAt)}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Usuario:</span>
                                        <span className="col-span-3">{log.userName}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Rol:</span>
                                        <span className="col-span-3 capitalize">{log.userRole}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Acción:</span>
                                        <span className="col-span-3">{log.action}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Recurso:</span>
                                        <span className="col-span-3">{log.resource}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <span className="text-sm font-medium">Dirección IP:</span>
                                        <span className="col-span-3">{log.ipAddress}</span>
                                      </div>
                                      <div className="grid grid-cols-4 items-start gap-4">
                                        <span className="text-sm font-medium">Detalles:</span>
                                        <div className="col-span-3 bg-muted p-2 rounded-md text-sm overflow-auto max-h-32">
                                          <pre className="whitespace-pre-wrap">{log.details}</pre>
                                        </div>
                                      </div>
                                      {log.errorMessage && (
                                        <div className="grid grid-cols-4 items-start gap-4">
                                          <span className="text-sm font-medium">Error:</span>
                                          <div className="col-span-3 bg-muted p-2 rounded-md text-sm overflow-auto max-h-32">
                                            <pre className="whitespace-pre-wrap text-destructive">{log.errorMessage}</pre>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  {auditLogsQuery.data?.total && auditLogsQuery.data.logs ? (
                    <p className="text-sm text-muted-foreground">
                      Mostrando {auditLogsQuery.data.logs.length} de {auditLogsQuery.data.total} registros
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  onClick={() => auditLogsQuery.refetch()}
                  disabled={auditLogsQuery.isRefetching}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enabledStatus ? 'Activar tareas programadas' : 'Desactivar tareas programadas'}
            </DialogTitle>
            <DialogDescription>
              {enabledStatus 
                ? '¿Estás seguro de que deseas activar las tareas programadas? Las tareas se ejecutarán según lo programado.' 
                : '¿Estás seguro de que deseas desactivar las tareas programadas? No se ejecutarán hasta que las actives nuevamente.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleConfirmToggle(enabledStatus)}
              variant={enabledStatus ? 'default' : 'destructive'}
            >
              {enabledStatus ? (
                <><Power className="w-4 h-4 mr-2" />Activar</>
              ) : (
                <><PowerOff className="w-4 h-4 mr-2" />Desactivar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}