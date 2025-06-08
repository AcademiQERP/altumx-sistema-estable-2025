import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Search, Bookmark, Filter, X, Settings, Calendar, Brain, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

type Notificacion = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  priority: "alta" | "media" | "baja";
};

// Componente de Onboarding para Notificaciones
function NotificationsOnboardingCard() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("notificacionesOnboardingDismissed");
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("notificacionesOnboardingDismissed", "true");
    setIsVisible(false);
  };

  const showOnboarding = () => {
    setIsVisible(true);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={showOnboarding}
          size="sm"
          variant="outline"
          className="rounded-full shadow-lg bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
        >
          <Settings className="h-4 w-4 mr-2 text-blue-600" />
          <span className="text-sm text-blue-700">¿Cómo funciona Notificaciones?</span>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleDismiss} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl mx-auto bg-white shadow-2xl border-2 border-blue-200">
          <CardHeader className="relative pb-4">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                💬 Notificaciones Inteligentes
              </CardTitle>
            </div>
            
            <p className="text-sm text-gray-600 leading-relaxed">
              Este submódulo permite mantener informados a estudiantes, padres y docentes mediante alertas personalizadas y mensajes clave automatizados.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                ✅ <span>¿Qué puedes hacer aquí?</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">🔔 Visualiza todas las notificaciones</h4>
                    <p className="text-sm text-gray-600">
                      Consulta los avisos generados por el sistema, ya sea desde recordatorios de pago, cambios de horario, actividades escolares u otras fuentes integradas.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">📆 Recibe alertas contextuales</h4>
                    <p className="text-sm text-gray-600">
                      Las notificaciones pueden generarse automáticamente en función de eventos financieros, académicos o administrativos.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                    <Brain className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">🧠 Automatización inteligente (Próximamente)</h4>
                    <p className="text-sm text-gray-600">
                      El sistema analizará patrones y comportamientos para generar notificaciones predictivas y relevantes con ayuda de IA.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🛠️ <span>Características clave</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-3 bg-blue-50 rounded-lg">
                  <Settings className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900 mb-1">Centralización</h4>
                  <p className="text-xs text-gray-600">Unifica avisos en un solo lugar</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-3 bg-green-50 rounded-lg">
                  <Filter className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900 mb-1">Filtrado</h4>
                  <p className="text-xs text-gray-600">Busca por tipo o destinatario</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-3 bg-purple-50 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900 mb-1">Seguridad</h4>
                  <p className="text-xs text-gray-600">Solo usuarios autorizados</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <p className="text-center text-blue-800 font-medium">
                ✨ Un sistema para comunicar de forma clara, oportuna y automatizada.
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <Button 
                onClick={handleDismiss}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 font-medium"
              >
                Entendido
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function NotificacionesTab() {
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "noLeidas" | "leidas">("todas");
  
  // Consulta para obtener notificaciones - temporalmente desactivada para evitar error 500
  const { data: responseData = { notifications: [] }, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: false, // Desactivamos temporalmente mientras se finaliza la integración
  });

  // Extraer las notificaciones del objeto de respuesta, asegurando que siempre sea un array
  const notificaciones = Array.isArray(responseData?.notifications) ? responseData.notifications : [];

  // Filtrar notificaciones según búsqueda y filtro
  const notificacionesFiltradas = notificaciones.filter((notif: Notificacion) => {
    // Aplicar búsqueda
    if (busqueda && !notif.title.toLowerCase().includes(busqueda.toLowerCase()) && 
        !notif.content.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }
    
    // Aplicar filtro
    if (filtro === "noLeidas" && notif.isRead) {
      return false;
    } else if (filtro === "leidas" && !notif.isRead) {
      return false;
    }
    
    return true;
  });

  // Obtener color según prioridad
  const getColorPorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "bg-red-500";
      case "media": return "bg-amber-500";
      case "baja": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  // Obtener iniciales para el avatar
  const getIniciales = (nombre: string) => {
    return nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-4">
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Notificaciones</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filtro === "todas" ? "Todas" : filtro === "noLeidas" ? "No leídas" : "Leídas"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFiltro("todas")}>
                Todas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFiltro("noLeidas")}>
                No leídas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFiltro("leidas")}>
                Leídas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center pt-2">
          <Input
            placeholder="Buscar notificaciones..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-grow"
          />
          <Button variant="ghost" size="icon" className="ml-2">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
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
          ) : notificacionesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <Bell className="h-12 w-12 text-blue-500 mb-4" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">🛠</span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Centro de Notificaciones</h3>
              <p className="text-sm text-muted-foreground text-center mt-2 max-w-md">
                Estamos preparando el sistema de notificaciones personalizado para brindarte alertas importantes sobre calificaciones, pagos y eventos académicos.
              </p>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  ✨ Próximamente disponible
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Recibirás notificaciones automáticas y personalizadas
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {notificacionesFiltradas.map((notif: Notificacion) => (
                <div 
                  key={notif.id} 
                  className={`p-4 rounded-lg border ${!notif.isRead ? 'bg-muted/50' : ''}`}
                >
                  <div className="flex">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback className={getColorPorPrioridad(notif.priority)}>
                        <Bell className="h-5 w-5 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{notif.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={notif.priority === "alta" ? "destructive" : notif.priority === "media" ? "default" : "secondary"}>
                            {notif.priority === "alta" ? "Alta" : notif.priority === "media" ? "Media" : "Baja"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notif.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm mt-1 text-muted-foreground">
                        {notif.content}
                      </p>
                      <div className="flex justify-end mt-2">
                        <Button variant="ghost" size="sm">
                          <Bookmark className="h-4 w-4 mr-2" />
                          {notif.isRead ? "Marcar como no leída" : "Marcar como leída"}
                        </Button>
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
    
    <NotificationsOnboardingCard />
    </div>
  );
}