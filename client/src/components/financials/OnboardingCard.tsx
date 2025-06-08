import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OnboardingCardProps {
  moduleType: 'main' | 'pagos' | 'adeudos' | 'estado-cuenta' | 'recordatorios' | 'reportes' | 'clasificacion' | 'general';
}

const OnboardingCard: React.FC<OnboardingCardProps> = ({ moduleType }) => {
  const [isVisible, setIsVisible] = useState(false);
  const localStorageKey = `onboarding-finance-${moduleType}-viewed`;

  useEffect(() => {
    // Verificar si el usuario ya ha visto este onboarding
    const hasViewed = localStorage.getItem(localStorageKey) === 'true';
    if (!hasViewed) {
      setIsVisible(true);
    }
  }, [localStorageKey]);

  const handleClose = () => {
    localStorage.setItem(localStorageKey, 'true');
    setIsVisible(false);
  };

  const handleReset = () => {
    setIsVisible(true);
  };

  // Si la tarjeta no es visible, mostrar solo el botón flotante para volver a mostrarla
  if (!isVisible) {
    return (
      <Button
        onClick={handleReset}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-white dark:bg-slate-800 shadow-md"
      >
        <Info className="mr-2 h-4 w-4" />
        ¿Cómo funciona este módulo?
      </Button>
    );
  }

  // Determinar el contenido según el tipo de módulo
  const getContent = () => {
    switch (moduleType) {
      case 'main':
        return (
          <>
            <CardTitle>👋 Bienvenido al Módulo de Finanzas</CardTitle>
            <CardContent className="pt-4">
              <p className="mb-4">Este módulo te permite gestionar toda la información financiera del sistema de forma centralizada y visual. Aquí podrás:</p>
              
              <div className="space-y-2">
                <p><strong>💰 Pagos</strong><br />
                Registra y consulta los pagos realizados por los estudiantes de forma rápida y segura.</p>
                
                <p><strong>📄 Adeudos</strong><br />
                Visualiza los conceptos pendientes de pago por estudiante y mantén actualizado el estado financiero.</p>
                
                <p><strong>📊 Estado de Cuenta</strong><br />
                Consulta el balance general, aplica pagos disponibles y emite comprobantes.</p>
                
                <p><strong>🔔 Recordatorios</strong><br />
                Automatiza notificaciones para los tutores con base en adeudos y riesgo.</p>
                
                <p><strong>📈 Reportes Financieros</strong><br />
                Analiza ingresos, cumplimiento y morosidad por grupo o concepto, exportando fácilmente a PDF o Excel.</p>
                
                <p><strong>🧠 Clasificación de Riesgo</strong><br />
                Evalúa automáticamente el riesgo de pago de cada alumno y obtén acciones sugeridas.</p>
              </div>
              
              <p className="mt-4">Todo en un solo lugar, con navegación fluida y herramientas optimizadas para tu operación administrativa.</p>
            </CardContent>
          </>
        );
      case 'pagos':
        return (
          <>
            <CardTitle>💰 Módulo de Pagos</CardTitle>
            <CardContent className="pt-4">
              <p className="mb-4">Este módulo te permite gestionar los pagos de los estudiantes:</p>
              
              <div className="space-y-2">
                <p><strong>Registrar Pagos</strong>: Captura nuevos pagos con datos completos (estudiante, concepto, método, etc.)</p>
                <p><strong>Historial</strong>: Consulta todos los pagos realizados con opciones de filtrado</p>
                <p><strong>Comprobantes</strong>: Genera y descarga recibos de pago en PDF</p>
                <p><strong>Validación</strong>: El sistema verifica la información para evitar duplicados o errores</p>
              </div>
            </CardContent>
          </>
        );
      case 'adeudos':
        return (
          <>
            <CardTitle>📄 Módulo de Adeudos</CardTitle>
            <CardContent className="pt-4">
              <p className="mb-4">Administra eficientemente los adeudos pendientes:</p>
              
              <div className="space-y-2">
                <p><strong>Registro de Adeudos</strong>: Crea nuevos conceptos de pago pendientes</p>
                <p><strong>Vencimientos</strong>: Visualiza fechas límite y estatus (vigente o vencido)</p>
                <p><strong>Notificaciones</strong>: Envía recordatorios directamente desde la interfaz</p>
                <p><strong>Asociación</strong>: Vincula pagos a adeudos específicos</p>
              </div>
            </CardContent>
          </>
        );
      case 'estado-cuenta':
        return (
          <>
            <CardTitle>📊 Estado de Cuenta</CardTitle>
            <CardContent className="pt-4">
              <p className="mb-4">Visualiza el balance financiero completo de cada estudiante:</p>
              
              <div className="space-y-2">
                <p><strong>Resumen Financiero</strong>: Visualiza pagados, adeudados y balance actual</p>
                <p><strong>Pagos sin Aplicar</strong>: Administra excedentes o anticipos disponibles</p>
                <p><strong>Historial Completo</strong>: Revisa todos los movimientos en una sola vista</p>
                <p><strong>Impresión</strong>: Genera reportes en PDF para compartir con padres/tutores</p>
              </div>
            </CardContent>
          </>
        );
      case 'recordatorios':
        return (
          <>
            <CardTitle>🔔 Recordatorios de Pago</CardTitle>
            <CardContent className="pt-4">
              <p className="mb-4">Automatiza las notificaciones de pagos pendientes:</p>
              
              <div className="space-y-2">
                <p><strong>Programación</strong>: Configura envíos automáticos o manuales</p>
                <p><strong>Personalización</strong>: Adapta mensajes según nivel de riesgo</p>
                <p><strong>Historial</strong>: Consulta todos los recordatorios enviados</p>
                <p><strong>Auditoría</strong>: Verifica éxitos y errores en las comunicaciones</p>
              </div>
            </CardContent>
          </>
        );
      case 'reportes':
        return (
          <>
            <CardTitle>📈 Reportes Financieros</CardTitle>
            <CardContent className="pt-4">
              <p className="mb-4">Analiza la situación financiera con métricas avanzadas:</p>
              
              <div className="space-y-2">
                <p><strong>Indicadores Principales</strong>: Recaudación, adeudos y cumplimiento</p>
                <p><strong>Gráficas</strong>: Visualiza tendencias mensuales y distribución por concepto</p>
                <p><strong>Filtros</strong>: Configura reportes por mes, año, grupo o concepto</p>
                <p><strong>Exportación</strong>: Descarga reportes en Excel, PDF o genera resúmenes con IA</p>
              </div>
            </CardContent>
          </>
        );
      case 'clasificacion':
        return (
          <>
            <CardTitle>🧠 Clasificación de Riesgo</CardTitle>
            <CardContent className="pt-4">
              <p className="mb-4">Evalúa el comportamiento de pago y anticipa situaciones críticas:</p>
              
              <div className="space-y-2">
                <p><strong>Niveles de Riesgo</strong>: Clasifica automáticamente en Bajo, Medio o Alto</p>
                <p><strong>Indicadores</strong>: Análisis basado en historial de pagos y adeudos</p>
                <p><strong>Criterios</strong>: Transparencia en las reglas de clasificación</p>
                <p><strong>Acciones Sugeridas</strong>: Recomendaciones específicas según cada caso</p>
              </div>
            </CardContent>
          </>
        );
      case 'general':
        return (
          <>
            <CardTitle>👋 Bienvenido al Módulo de Finanzas</CardTitle>
            <CardContent className="pt-4">
              <p className="mb-4">Este módulo centraliza todo lo relacionado con la gestión financiera escolar, facilitando el seguimiento de pagos, adeudos y reportes financieros de forma clara y organizada.</p>
              
              <div className="space-y-3">
                <p><strong>Aquí podrás:</strong></p>
                
                <p><strong>💵 Pagos</strong><br />
                Registra y consulta todos los pagos realizados por los estudiantes de forma rápida y eficiente.</p>
                
                <p><strong>📄 Estado de Cuenta</strong><br />
                Visualiza el balance financiero individual de cada estudiante, incluyendo historial de pagos y adeudos pendientes.</p>
                
                <p><strong>📊 Reportes Financieros</strong><br />
                Accede a estadísticas mensuales, tasas de cumplimiento, grupos con mayor morosidad y más.</p>
                
                <p><strong>🚨 Clasificación de Riesgo</strong><br />
                Detecta automáticamente alumnos en riesgo de morosidad y aplica acciones preventivas basadas en IA.</p>
                
                <p><strong>📅 Recordatorios Automáticos</strong><br />
                Programa o ejecuta manualmente recordatorios de pago para mantener al día a los tutores.</p>
              </div>
              
              <p className="mt-4 font-medium">Todo en un solo módulo, con métricas precisas, flujos automatizados y análisis inteligentes.</p>
            </CardContent>
          </>
        );
      default:
        return (
          <>
            <CardTitle>Información del Módulo</CardTitle>
            <CardContent className="pt-4">
              <p>Este módulo forma parte del sistema financiero de AcademiQ.</p>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          {getContent()}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardFooter className="flex justify-end pt-0">
          <Button onClick={handleClose}>Entendido</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OnboardingCard;