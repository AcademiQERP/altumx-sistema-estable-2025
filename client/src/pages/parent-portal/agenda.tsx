import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar, 
  Clock, 
  Book, 
  Users, 
  CreditCard, 
  Award, 
  Sparkles, 
  Search, 
  Filter,
  ChevronDown
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AvisoVacio } from "@/components/ui/aviso-vacio";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Tipos
interface EventoAgenda {
  id: number;
  estudianteId: number;
  studentName?: string; // Campo adicional que viene de la API
  fecha: string;
  hora: string | null;
  titulo: string;
  tipo: "tarea" | "reunion" | "pago" | "evaluacion" | "actividad";
  descripcion: string | null;
}

// Función para organizar eventos por fecha
function agruparEventosPorFecha(eventos: EventoAgenda[]) {
  const grupos: { [key: string]: EventoAgenda[] } = {};
  
  eventos.forEach(evento => {
    const fecha = evento.fecha.split('T')[0];
    if (!grupos[fecha]) {
      grupos[fecha] = [];
    }
    grupos[fecha].push(evento);
  });
  
  // Convertir el objeto a un array y ordenar por fecha
  return Object.entries(grupos)
    .map(([fecha, eventos]) => ({ fecha, eventos }))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

// Colores para cada tipo de evento
const tipoEventoColor: Record<string, string> = {
  tarea: "bg-blue-100 text-blue-800",
  reunion: "bg-purple-100 text-purple-800",
  pago: "bg-red-100 text-red-800",
  evaluacion: "bg-amber-100 text-amber-800",
  actividad: "bg-green-100 text-green-800"
};

// Iconos para cada tipo de evento
const tipoEventoIcono: Record<string, JSX.Element> = {
  tarea: <Book className="h-4 w-4" />,
  reunion: <Users className="h-4 w-4" />,
  pago: <CreditCard className="h-4 w-4" />,
  evaluacion: <Award className="h-4 w-4" />,
  actividad: <Sparkles className="h-4 w-4" />
};

export default function AgendaCompleta() {
  const { user } = useAuth();
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<string>("todos");
  const [fechaInicio, setFechaInicio] = useState<Date>(() => {
    // Iniciar con el primer día del mes actual
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [busqueda, setBusqueda] = useState<string>("");
  const [tiposFiltrados, setTiposFiltrados] = useState<Record<string, boolean>>({
    tarea: true,
    reunion: true,
    pago: true,
    evaluacion: true,
    actividad: true
  });

  // Obtener la lista de estudiantes (hijos) del usuario
  const { data: estudiantes = [], isLoading: loadingEstudiantes } = useQuery({
    queryKey: [`/api/parents/${user?.id}/students`],
    enabled: !!user?.id,
    staleTime: 300000, // Mantener fresco por 5 minutos
    refetchOnWindowFocus: false,
  });

  // Obtener eventos de agenda para todos los hijos o para un hijo específico
  const { data: eventos = [], isLoading: loadingEventos, isError } = useQuery({
    queryKey: [
      `/api/parents/${user?.id}/agenda`, 
      { start_date: fechaInicio.toISOString() }
    ],
    enabled: !!user?.id,
    staleTime: 60000, // Mantener fresco por 1 minuto
    refetchOnWindowFocus: false, // Evitar recargas innecesarias
  });

  // Aplicar filtros a los eventos
  const eventosFiltrados = useMemo(() => {
    if (!Array.isArray(eventos)) return [];
    
    return eventos.filter((evento: EventoAgenda) => {
      // Filtro por estudiante
      const pasaFiltroEstudiante = 
        estudianteSeleccionado === "todos" || 
        evento.estudianteId === parseInt(estudianteSeleccionado);
      
      // Filtro por tipo de evento
      const pasaFiltroTipo = tiposFiltrados[evento.tipo];
      
      // Filtro por búsqueda de texto
      const pasaFiltroBusqueda = 
        !busqueda || 
        evento.titulo.toLowerCase().includes(busqueda.toLowerCase()) || 
        (evento.descripcion && evento.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
      
      return pasaFiltroEstudiante && pasaFiltroTipo && pasaFiltroBusqueda;
    });
  }, [eventos, estudianteSeleccionado, tiposFiltrados, busqueda]);

  // Agrupar eventos por fecha
  const eventosPorFecha = agruparEventosPorFecha(eventosFiltrados);

  // Togglear filtros de tipo de evento
  const toggleTipoFiltro = (tipo: string) => {
    setTiposFiltrados(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  // Reset de filtros
  const resetFiltros = () => {
    setTiposFiltrados({
      tarea: true,
      reunion: true,
      pago: true,
      evaluacion: true,
      actividad: true
    });
    setBusqueda("");
  };

  // Obtener el nombre del estudiante seleccionado
  const nombreEstudiante = useMemo(() => {
    if (estudianteSeleccionado === "todos") return "todos los estudiantes";
    
    const estudiante = estudiantes?.find((e: any) => e.id.toString() === estudianteSeleccionado);
    return estudiante ? estudiante.nombreCompleto : "estudiante";
  }, [estudiantes, estudianteSeleccionado]);

  // Estado de carga
  if (loadingEstudiantes || loadingEventos) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                🗓️ Agenda completa de {nombreEstudiante}
              </CardTitle>
              <CardDescription>
                Consulta todos los eventos escolares programados
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Barra de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector de estudiante */}
        <Select 
          value={estudianteSeleccionado}
          onValueChange={setEstudianteSeleccionado}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar estudiante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estudiantes</SelectItem>
            {estudiantes?.map((estudiante: any) => (
              <SelectItem key={estudiante.id} value={estudiante.id.toString()}>
                {estudiante.nombreCompleto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            className="pl-10"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Filtro por tipo */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex justify-between w-full">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filtrar por tipo</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Tipos de evento</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={tiposFiltrados.tarea}
              onCheckedChange={() => toggleTipoFiltro("tarea")}
            >
              <div className="flex items-center gap-2">
                <Book className="h-4 w-4 text-blue-600" />
                <span>Tareas</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={tiposFiltrados.reunion}
              onCheckedChange={() => toggleTipoFiltro("reunion")}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Reuniones</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={tiposFiltrados.pago}
              onCheckedChange={() => toggleTipoFiltro("pago")}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                <span>Pagos</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={tiposFiltrados.evaluacion}
              onCheckedChange={() => toggleTipoFiltro("evaluacion")}
            >
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600" />
                <span>Evaluaciones</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={tiposFiltrados.actividad}
              onCheckedChange={() => toggleTipoFiltro("actividad")}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                <span>Actividades</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={resetFiltros}>
              <span className="w-full text-center">Reiniciar filtros</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contenido de eventos */}
      {isError ? (
        <div className="p-6 text-center">
          <div className="text-xl mb-2">🛠️ Funcionalidad en desarrollo</div>
          <p className="text-muted-foreground">
            Estamos trabajando para implementar esta funcionalidad. Vuelve pronto para ver los eventos de agenda.
          </p>
        </div>
      ) : eventosPorFecha.length > 0 ? (
        <div className="space-y-6">
          {eventosPorFecha.map(({ fecha, eventos }) => (
            <Card key={fecha}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {new Date(fecha).toLocaleDateString('es-MX', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </CardTitle>
                <Separator />
              </CardHeader>
              <CardContent className="space-y-4">
                {eventos.map(evento => {
                  const eventoTipo = evento.tipo;
                  let borderClass = "";
                  
                  switch (eventoTipo) {
                    case "tarea":
                      borderClass = "border-blue-300";
                      break;
                    case "reunion":
                      borderClass = "border-purple-300";
                      break;
                    case "pago":
                      borderClass = "border-red-300";
                      break;
                    case "evaluacion":
                      borderClass = "border-amber-300";
                      break;
                    case "actividad":
                      borderClass = "border-green-300";
                      break;
                    default:
                      borderClass = "border-gray-300";
                  }
                  
                  return (
                    <div key={evento.id} className={`flex gap-4 items-start border-l-4 pl-4 py-2 ${borderClass}`}>
                      <div className="min-w-[80px] text-sm text-muted-foreground">
                        {evento.hora ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {evento.hora}
                          </div>
                        ) : (
                          <span>Todo el día</span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium">
                          {evento.titulo}
                          <Badge className={`ml-2 ${tipoEventoColor[evento.tipo]}`}>
                            <span className="flex items-center gap-1">
                              {tipoEventoIcono[evento.tipo]}
                              {evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}
                            </span>
                          </Badge>
                        </div>
                        
                        {evento.descripcion && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {evento.descripcion}
                          </p>
                        )}
                        
                        {/* Mostrar nombre del estudiante si estamos viendo todos */}
                        {estudianteSeleccionado === "todos" && evento.studentName && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Estudiante: {evento.studentName}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <AvisoVacio
          titulo="No hay eventos programados"
          mensaje="No se encontraron eventos para los filtros seleccionados. Vuelve pronto para consultar novedades escolares."
          icono="🌴"
        />
      )}
    </div>
  );
}