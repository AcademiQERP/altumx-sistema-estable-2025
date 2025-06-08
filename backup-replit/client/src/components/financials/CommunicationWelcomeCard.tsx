import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Bell, Zap, Brain } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CommunicationWelcomeCardProps {
  forceShow?: boolean;
  onClose?: () => void;
}

const CommunicationWelcomeCard: React.FC<CommunicationWelcomeCardProps> = ({ forceShow = false, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showHelpButton, setShowHelpButton] = useState(false);
  const localStorageKey = 'onboarding-comunicacion-dismissed';

  useEffect(() => {
    // Si se fuerza a mostrar (desde el menú), mostrar siempre
    if (forceShow) {
      setIsVisible(true);
      setShowHelpButton(false);
      return;
    }
    
    // Verificar si el usuario ya ha visto esta tarjeta de bienvenida general
    const hasViewed = localStorage.getItem(localStorageKey) === 'true';
    if (!hasViewed) {
      setIsVisible(true);
    } else {
      setShowHelpButton(true);
    }
  }, [forceShow]);

  const handleClose = () => {
    // Solo guardar en localStorage si no se forzó a mostrar
    if (!forceShow) {
      localStorage.setItem(localStorageKey, 'true');
      setShowHelpButton(true);
    }
    setIsVisible(false);
    
    // Llamar al callback si está disponible
    if (onClose) {
      onClose();
    }
  };

  const handleShowHelp = () => {
    setIsVisible(true);
    setShowHelpButton(false);
  };

  if (!isVisible && !showHelpButton) return null;

  return (
    <>
      {/* Tarjeta de bienvenida general del módulo */}
      {isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="absolute top-2 right-2 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-full">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">📬 Bienvenido al Módulo de Comunicación</CardTitle>
                  <p className="text-blue-100 mt-2">
                    Este módulo centraliza todos los canales de contacto entre la escuela, docentes, padres y alumnos. 
                    Facilita la gestión de mensajes, avisos importantes y alertas automatizadas de forma clara y eficiente.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Funcionalidades Principales */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-green-100 p-2 rounded-full mr-3">
                      ✅
                    </span>
                    Funcionalidades Principales
                  </h3>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-start space-x-3">
                      <MessageSquare className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-800">📢 Mensajería Directa</h4>
                        <p className="text-blue-700 text-sm mt-1">
                          Envía mensajes a padres de familia, estudiantes o grupos completos desde una plataforma segura y centralizada.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                    <div className="flex items-start space-x-3">
                      <Bell className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-amber-800">🛎️ Alertas Automatizadas</h4>
                        <p className="text-amber-700 text-sm mt-1">
                          Notifica sobre pagos pendientes, fechas importantes o cambios de horario utilizando reglas configurables.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Herramientas Avanzadas */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-purple-100 p-2 rounded-full mr-3">
                      🛠️
                    </span>
                    Herramientas Avanzadas
                  </h3>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                    <div className="flex items-start space-x-3">
                      <Zap className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-purple-800">📤 Recordatorios Inteligentes</h4>
                        <p className="text-purple-700 text-sm mt-1">
                          Programación inteligente de notificaciones con base en comportamiento financiero o académico.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
                    <div className="flex items-start space-x-3">
                      <Brain className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-indigo-800">🧠 Integración con IA <span className="text-xs text-indigo-600">(próximamente)</span></h4>
                        <p className="text-indigo-700 text-sm mt-1">
                          Mensajes personalizados sugeridos por inteligencia artificial para mejorar el alcance y comprensión.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensaje final */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg text-center">
                <p className="text-gray-700 font-medium">
                  ✨ Un solo módulo, múltiples formas de mantener a todos informados y conectados.
                </p>
              </div>
            </CardContent>

            <CardFooter className="bg-gray-50 flex justify-center">
              <Button 
                onClick={handleClose}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
              >
                Entendido
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Botón de ayuda flotante */}
      {showHelpButton && !forceShow && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            onClick={handleShowHelp}
            variant="outline"
            size="sm"
            className="bg-white shadow-lg hover:shadow-xl transition-all duration-200 border-blue-200 hover:border-blue-400"
          >
            <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
            <span className="text-blue-600 font-medium">❓ ¿Cómo funciona el módulo de Comunicación?</span>
          </Button>
        </div>
      )}
    </>
  );
};

export default CommunicationWelcomeCard;