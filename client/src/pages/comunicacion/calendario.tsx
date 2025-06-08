import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Tipos
type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
};

export default function CalendarioTab() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Consulta para obtener eventos del calendario - temporalmente desactivada 
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar"],
    enabled: false, // Desactivamos temporalmente mientras se finaliza la integración
  });

  // Eventos para el día seleccionado
  const eventsForSelectedDay = selectedDate
    ? events.filter((event: CalendarEvent) => 
        isSameDay(new Date(event.startDate), selectedDate))
    : [];

  // Días con eventos en el mes actual
  const daysWithEvents = events
    .filter((event: CalendarEvent) => 
      isSameMonth(new Date(event.startDate), currentMonth))
    .map((event: CalendarEvent) => new Date(event.startDate));

  // Navegar entre meses
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Vista mensual personalizada
  const MonthView = () => {
    const currentMonthStart = startOfMonth(currentMonth);
    const currentMonthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });
    
    return (
      <div className="mt-4">
        {/* Cabecera con navegación */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Selector de calendario */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="mb-4 w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Selecciona una fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              locale={es}
              modifiers={{
                hasEvent: daysWithEvents,
              }}
              modifiersClassNames={{
                hasEvent: "bg-primary/20 text-primary font-bold",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Panel izquierdo: Calendario */}
      <Card className="flex-grow lg:w-1/3">
        <CardHeader>
          <CardTitle>Calendario</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthView />
        </CardContent>
      </Card>

      {/* Panel derecho: Lista de eventos */}
      <Card className="flex-grow lg:w-2/3">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Eventos</CardTitle>
          <div className="text-sm text-muted-foreground">
            {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-6">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-6 py-1">
                    <div className="h-2 bg-slate-200 rounded"></div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                        <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                      </div>
                      <div className="h-2 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : eventsForSelectedDay.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No hay eventos programados</h3>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  No hay eventos para {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : "esta fecha"}.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {eventsForSelectedDay.map((event: CalendarEvent) => (
                  <div key={event.id} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start">
                      <div className="rounded-full bg-primary/10 p-2 mr-3">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between">
                          <h4 className="font-medium">{event.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {format(new Date(event.startDate), "HH:mm", { locale: es })}
                              {event.endDate && ` - ${format(new Date(event.endDate), "HH:mm", { locale: es })}`}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            Creado por: {event.createdBy} · {format(new Date(event.createdAt), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}