import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMonthName, getShortDays, getCalendarDays } from "@/lib/dates";

// Eventos de ejemplo (en una aplicación real, vendrían de la API)
const EXAMPLE_EVENTS = [
  { id: 1, date: "2023-09-06", title: "Entrega de calificaciones parciales", type: "primary" },
  { id: 2, date: "2023-09-15", title: "Ceremonia cívica", type: "warning" },
  { id: 3, date: "2023-09-16", title: "Día festivo - Independencia", type: "error" }
];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };
  
  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getCalendarDays(year, month);
  const shortDays = getShortDays();
  
  // Formatear eventos para el mes actual
  const formattedEvents = EXAMPLE_EVENTS.map(event => {
    const eventDate = new Date(event.date);
    return {
      ...event,
      day: eventDate.getDate(),
      month: eventDate.getMonth(),
      year: eventDate.getFullYear()
    };
  }).filter(event => event.month === month && event.year === year);

  // Función para verificar si un día tiene un evento
  const getDayEvent = (day: number) => {
    return formattedEvents.find(event => event.day === day);
  };
  
  return (
    <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            📅 Calendario
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddEventDialog(true)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Agregar evento</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-3 shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">
              {getMonthName(month)} {year}
            </h3>
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={goToPreviousMonth}
                      className="h-9 w-9 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border-gray-300"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mes anterior</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={goToNextMonth}
                      className="h-9 w-9 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border-gray-300"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mes siguiente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center">
            {shortDays.map((day, index) => (
              <div key={index} className="text-xs font-medium text-gray-500 py-2">{day}</div>
            ))}
            
            {days.map((day, index) => {
              const event = day.currentMonth ? getDayEvent(day.date) : null;
              const hasEvent = !!event;
              const isToday = day.currentMonth && 
                new Date().getDate() === day.date && 
                new Date().getMonth() === month && 
                new Date().getFullYear() === year;
              
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={`
                          py-2 text-xs rounded-lg transition-all duration-200 cursor-pointer relative
                          ${!day.currentMonth ? 'text-gray-300' : 'text-gray-700'}
                          ${hasEvent ? 
                            `${event.type === 'primary' ? 'bg-blue-500 text-white hover:bg-blue-600' : 
                              event.type === 'warning' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                              event.type === 'error' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300'} shadow-sm` : 
                            'hover:bg-gray-50'
                          }
                          ${isToday && !hasEvent ? 'bg-blue-100 text-blue-700 font-semibold' : ''}
                          ${day.currentMonth && !hasEvent ? 'hover:bg-blue-50 hover:text-blue-600' : ''}
                        `}
                        onClick={() => day.currentMonth && setSelectedDay(day.date)}
                      >
                        {day.date}
                        {/* Indicador sutil para días con eventos */}
                        {hasEvent && (
                          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/80"></div>
                        )}
                        {/* Indicador para día actual */}
                        {isToday && !hasEvent && (
                          <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600"></div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white border border-gray-200 shadow-lg">
                      <div className="p-2 min-w-[200px]">
                        <div className="font-semibold text-gray-800 mb-2">
                          {`${day.date} de ${getMonthName(month)}`}
                          {isToday && <span className="text-blue-600 ml-1">(Hoy)</span>}
                        </div>
                        {hasEvent ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-2 h-2 rounded-full ${
                                  event.type === 'primary' ? 'bg-blue-500' : 
                                  event.type === 'warning' ? 'bg-amber-500' : 
                                  event.type === 'error' ? 'bg-red-500' : 'bg-gray-300'
                                }`}
                              />
                              <span className="text-sm text-gray-700">{event.title}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {day.currentMonth ? 'No hay eventos programados' : 'Día fuera del mes actual'}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 shadow-sm border">
          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🗓️ Próximos Eventos
          </h4>
          <div className="space-y-3">
            {formattedEvents.map((event) => (
              <div key={event.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div 
                  className={`w-3 h-3 rounded-full mr-3 ${
                    event.type === 'primary' ? 'bg-blue-500' : 
                    event.type === 'warning' ? 'bg-amber-500' : 
                    event.type === 'error' ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">{event.title}</div>
                  <div className="text-xs text-gray-500">
                    {`${getMonthName(event.month).slice(0, 3)} ${event.day}`}
                  </div>
                </div>
              </div>
            ))}
            
            {formattedEvents.length === 0 && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-sm">📅</div>
                <div className="text-gray-500 text-xs mt-1">
                  No hay eventos programados para este mes
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Información del día seleccionado */}
        {selectedDay && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-blue-800">
                Día {selectedDay} de {getMonthName(month)}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDay(null)}
                className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="text-sm text-blue-700">
              {formattedEvents.find(e => e.day === selectedDay) ? 
                `Evento: ${formattedEvents.find(e => e.day === selectedDay)?.title}` :
                'No hay eventos programados para este día'
              }
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Diálogo para agregar eventos */}
      <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📅 Agregar Nuevo Evento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="font-medium">Funcionalidad en desarrollo</span>
              </div>
              <p className="text-blue-700 text-sm leading-relaxed">
                La creación de eventos estará disponible próximamente. 
                Por ahora puedes visualizar los eventos existentes y navegar 
                por el calendario de manera interactiva.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddEventDialog(false)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
