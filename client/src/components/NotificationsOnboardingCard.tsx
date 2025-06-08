import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Calendar, Brain, Shield, Filter, Info } from "lucide-react";

interface NotificationsOnboardingCardProps {
  onDismiss?: () => void;
  forceShow?: boolean;
}

export function NotificationsOnboardingCard({ 
  onDismiss, 
  forceShow = false 
}: NotificationsOnboardingCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    const hasSeenOnboarding = localStorage.getItem('notificacionesOnboardingDismissed');
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, [forceShow]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (!forceShow) {
      localStorage.setItem('notificacionesOnboardingDismissed', 'true');
    }
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="relative pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <Bell className="h-8 w-8 text-blue-600" />
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-orange-400 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-medium">🛠</span>
              </div>
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">
                💬 Notificaciones Inteligentes
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Sistema de comunicación centralizado y automatizado
              </p>
            </div>
          </div>
          
          <p className="text-gray-700 leading-relaxed">
            Este submódulo permite mantener informados a estudiantes, padres y docentes mediante 
            alertas personalizadas y mensajes clave automatizados.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Funcionalidades principales */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              ✅ ¿Qué puedes hacer aquí?
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Bell className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">Visualiza todas las notificaciones</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Consulta los avisos generados por el sistema, ya sea desde recordatorios de pago, 
                    cambios de horario, actividades escolares u otras fuentes integradas.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Calendar className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">Recibe alertas contextuales</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Las notificaciones pueden generarse automáticamente en función de eventos 
                    financieros, académicos o administrativos.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Brain className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Automatización inteligente 
                    <Badge variant="secondary" className="ml-2 text-xs">Próximamente</Badge>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    El sistema analizará patrones y comportamientos para generar notificaciones 
                    predictivas y relevantes con ayuda de IA.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Características clave */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🛠️ Características clave
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-sm text-gray-900">Centralización</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Unifica avisos en un solo lugar
                </p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Filter className="h-4 w-4 text-green-600" />
                </div>
                <h4 className="font-medium text-sm text-gray-900">Filtrado</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Busca y filtra por tipo de notificación
                </p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <h4 className="font-medium text-sm text-gray-900">Seguridad</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Solo usuarios autorizados pueden ver notificaciones
                </p>
              </div>
            </div>
          </div>

          {/* Mensaje final */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg text-center">
            <p className="font-medium">
              ✨ Un sistema para comunicar de forma clara, oportuna y automatizada.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleDismiss} className="bg-blue-600 hover:bg-blue-700">
              Entendido
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente del botón de ayuda flotante
export function NotificationsHelpButton() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-40 shadow-lg bg-white hover:bg-gray-50 border-gray-300"
        onClick={() => setShowOnboarding(true)}
      >
        <Info className="h-4 w-4 mr-2" />
        ¿Cómo funciona Notificaciones?
      </Button>

      <NotificationsOnboardingCard
        forceShow={showOnboarding}
        onDismiss={() => setShowOnboarding(false)}
      />
    </>
  );
}