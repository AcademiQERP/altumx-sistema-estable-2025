import React, { useState, useEffect } from 'react';
import { X, Info, DollarSign } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FinanceWelcomeCardProps {
  forceShow?: boolean;
  onClose?: () => void;
}

const FinanceWelcomeCard: React.FC<FinanceWelcomeCardProps> = ({ forceShow = false, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showHelpButton, setShowHelpButton] = useState(false);
  const localStorageKey = 'onboarding-finanzas-dismissed';

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

  // Botón flotante de ayuda cuando la tarjeta no está visible
  if (!isVisible && showHelpButton) {
    return (
      <Button
        onClick={handleShowHelp}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-40 bg-white dark:bg-slate-800 shadow-lg border-blue-200 hover:border-blue-300"
      >
        <Info className="mr-2 h-4 w-4 text-blue-600" />
        <span className="text-blue-600">Información del Módulo</span>
      </Button>
    );
  }

  // Modal de bienvenida
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                👋 Bienvenido al Módulo de Finanzas
              </CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            Este módulo centraliza todo lo relacionado con la gestión financiera escolar, facilitando el seguimiento de pagos, adeudos y reportes financieros de forma clara y organizada.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                🎯 Funcionalidades Principales:
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-400">
                  <span className="text-xl">💵</span>
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-400">Pagos</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Registra y consulta todos los pagos realizados por los estudiantes de forma rápida y eficiente.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
                  <span className="text-xl">📄</span>
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-400">Estado de Cuenta</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Visualiza el balance financiero individual de cada estudiante, incluyendo historial de pagos y adeudos pendientes.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-400">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="font-semibold text-purple-800 dark:text-purple-400">Reportes Financieros</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Accede a estadísticas mensuales, tasas de cumplimiento, grupos con mayor morosidad y más.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                🚀 Herramientas Avanzadas:
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <span className="text-xl">🚨</span>
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-400">Clasificación de Riesgo</p>
                    <p className="text-sm text-red-700 dark:text-red-300">Detecta automáticamente alumnos en riesgo de morosidad y aplica acciones preventivas basadas en IA.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-400">
                  <span className="text-xl">📅</span>
                  <div>
                    <p className="font-semibold text-orange-800 dark:text-orange-400">Recordatorios Automáticos</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Programa o ejecuta manualmente recordatorios de pago para mantener al día a los tutores.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-l-4 border-indigo-400">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="font-semibold text-indigo-800 dark:text-indigo-400">Automatización</p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">Flujos automatizados y análisis inteligentes para optimizar la gestión financiera.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-center font-semibold text-blue-800 dark:text-blue-300">
              ✨ Todo en un solo módulo, con métricas precisas, flujos automatizados y análisis inteligentes ✨
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end pt-4 bg-gray-50 dark:bg-gray-800/50">
          <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 text-white">
            Entendido, ¡Empecemos!
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FinanceWelcomeCard;