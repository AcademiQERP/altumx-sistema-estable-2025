import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowUpDown, 
  Search, 
  Eye, 
  RefreshCw, 
  Calendar, 
  User, 
  FileText, 
  Filter,
  BarChart,
  Trash2
} from 'lucide-react';

// Interfaz para los resúmenes de IA
interface AIFinancialSummary {
  id: number;
  anio: number;
  mes: number;
  resumenTexto: string;
  usuarioId: string;
  nombreUsuario?: string;
  fechaGeneracion: string;
  metadatos: string | null;
  grupoId?: number | null;
  conceptoId?: number | null;
}

export default function HistorialIA() {
  // Estados para los filtros
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>('all');
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('all');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('all');
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');
  const [resumenSeleccionado, setResumenSeleccionado] = useState<AIFinancialSummary | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const { toast } = useToast();

  // Consulta para obtener los resúmenes
  const { 
    data: resumenes, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/ai/resumen-financiero-logs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ai/resumen-financiero-logs');
      const data = await response.json();
      return data.summaries || [];
    },
  });

  // Consulta para obtener la lista de usuarios
  const { data: usuarios } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      const data = await response.json();
      return data || [];
    },
  });

  // Función para eliminar un resumen
  const eliminarResumen = async (id: number) => {
    try {
      await apiRequest('DELETE', `/api/ai/resumen-financiero-log/${id}`);
      toast({
        title: 'Resumen eliminado',
        description: 'El resumen ha sido eliminado correctamente.',
        variant: 'default',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el resumen.',
        variant: 'destructive',
      });
    }
  };

  // Función para obtener los años únicos de los resúmenes
  const getAniosUnicos = () => {
    if (!resumenes) return [];
    const anios = new Set(resumenes.map((resumen: AIFinancialSummary) => resumen.anio));
    return Array.from(anios).sort((a, b) => b - a); // Ordenar de más reciente a más antiguo
  };

  // Función para obtener el nombre del mes
  const getNombreMes = (numeroMes: number) => {
    const fecha = new Date();
    fecha.setMonth(numeroMes - 1);
    return format(fecha, 'MMMM', { locale: es });
  };

  // Función para formatear fecha
  const formatearFecha = (fechaString: string) => {
    const fecha = new Date(fechaString);
    return format(fecha, 'dd MMM yyyy HH:mm', { locale: es });
  };

  // Función para extraer metadatos (filtros) como texto legible
  const extraerMetadatos = (metadatosString: string | null) => {
    if (!metadatosString) return 'Sin filtros';
    
    try {
      const metadatos = JSON.parse(metadatosString);
      const filtros = [];
      
      if (metadatos.grupoId && metadatos.grupoId !== 'all') {
        filtros.push(`Grupo: ${metadatos.grupoNombre || metadatos.grupoId}`);
      }
      
      if (metadatos.conceptoId && metadatos.conceptoId !== 'all') {
        filtros.push(`Concepto: ${metadatos.conceptoNombre || metadatos.conceptoId}`);
      }
      
      if (metadatos.anio) {
        filtros.push(`Año: ${metadatos.anio}`);
      }
      
      if (metadatos.mes) {
        filtros.push(`Mes: ${getNombreMes(parseInt(metadatos.mes))}`);
      }
      
      return filtros.length > 0 ? filtros.join(', ') : 'Sin filtros específicos';
    } catch (e) {
      return 'Formato de metadatos inválido';
    }
  };

  // Filtrar resúmenes
  const resumenesFiltered = React.useMemo(() => {
    if (!resumenes) return [];
    
    return resumenes.filter((resumen: AIFinancialSummary) => {
      // Filtrar por año
      if (anioSeleccionado && anioSeleccionado !== 'all' && resumen.anio.toString() !== anioSeleccionado) {
        return false;
      }
      
      // Filtrar por mes
      if (mesSeleccionado && mesSeleccionado !== 'all' && resumen.mes.toString() !== mesSeleccionado) {
        return false;
      }
      
      // Filtrar por usuario
      if (usuarioSeleccionado && usuarioSeleccionado !== 'all' && resumen.usuarioId !== usuarioSeleccionado) {
        return false;
      }
      
      // Filtrar por texto
      if (busquedaTexto && !resumen.resumenTexto.toLowerCase().includes(busquedaTexto.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [resumenes, anioSeleccionado, mesSeleccionado, usuarioSeleccionado, busquedaTexto]);

  // Componente para los filtros
  const Filtros = () => (
    <div className="grid gap-4 md:grid-cols-5">
      <div>
        <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
          <SelectTrigger>
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {getAniosUnicos().map((anio) => (
              <SelectItem key={anio} value={anio.toString()}>
                {anio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
          <SelectTrigger>
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
              <SelectItem key={mes} value={mes.toString()}>
                {getNombreMes(mes)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Select value={usuarioSeleccionado} onValueChange={setUsuarioSeleccionado}>
          <SelectTrigger>
            <SelectValue placeholder="Usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {usuarios && usuarios.map((usuario: any) => (
              <SelectItem key={usuario.id} value={usuario.id}>
                {usuario.nombreCompleto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en el texto..."
          value={busquedaTexto}
          onChange={(e) => setBusquedaTexto(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <Button variant="outline" onClick={() => {
        setAnioSeleccionado('all');
        setMesSeleccionado('all');
        setUsuarioSeleccionado('all');
        setBusquedaTexto('');
      }}>
        Limpiar Filtros
      </Button>
    </div>
  );

  // Componente para el diálogo de detalles
  const VerDetalleDialog = () => (
    <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del Resumen</DialogTitle>
          <DialogDescription>
            Generado el {resumenSeleccionado && formatearFecha(resumenSeleccionado.fechaGeneracion)}
          </DialogDescription>
        </DialogHeader>
        
        {resumenSeleccionado && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="flex gap-1 items-center">
                <Calendar className="h-3 w-3" />
                {resumenSeleccionado.anio} - {getNombreMes(resumenSeleccionado.mes)}
              </Badge>
              
              <Badge variant="outline" className="flex gap-1 items-center">
                <User className="h-3 w-3" />
                {resumenSeleccionado.nombreUsuario || resumenSeleccionado.usuarioId}
              </Badge>
              
              <Badge variant="outline" className="flex gap-1 items-center">
                <Filter className="h-3 w-3" />
                {extraerMetadatos(resumenSeleccionado.metadatos)}
              </Badge>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Resumen Generado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm">
                  {resumenSeleccionado.resumenTexto}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button variant="outline" className="mr-2" onClick={() => setDialogAbierto(false)}>
                Cerrar
              </Button>
              <Button variant="default" disabled>
                Comparar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Historial de Resúmenes con IA</h2>
          <p className="text-muted-foreground">
            Consulta el historial de resúmenes financieros generados con Inteligencia Artificial
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>
            Filtra los resúmenes por año, mes, usuario o contenido del texto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Filtros />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Historial de Resúmenes</CardTitle>
          <CardDescription>
            {resumenesFiltered.length} resúmenes encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500">
              Error al cargar los resúmenes: {error instanceof Error ? error.message : 'Error desconocido'}
            </div>
          ) : resumenesFiltered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron resúmenes con los filtros seleccionados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Generación</TableHead>
                  <TableHead>Año/Mes</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Filtros Aplicados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumenesFiltered.map((resumen: AIFinancialSummary) => (
                  <TableRow key={resumen.id}>
                    <TableCell>
                      {formatearFecha(resumen.fechaGeneracion)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {resumen.anio} - {getNombreMes(resumen.mes)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {resumen.nombreUsuario || resumen.usuarioId}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {extraerMetadatos(resumen.metadatos)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setResumenSeleccionado(resumen);
                          setDialogAbierto(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => eliminarResumen(resumen.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <VerDetalleDialog />
    </div>
  );
}