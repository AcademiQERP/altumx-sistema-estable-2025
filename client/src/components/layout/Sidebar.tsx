import { Link, useLocation } from "wouter";
import { 
  Home, 
  GraduationCap, 
  Presentation, 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  LineChart, 
  FileText,
  Receipt,
  CreditCard,
  DollarSign,
  ScrollText,
  UsersRound,
  Bell,
  Calendar,
  BarChartBig,
  BarChart3,
  PieChart,
  Brain,
  Mail,
  MessageSquare,
  Megaphone,
  Info,
  HelpCircle,
  TrendingUp,
  Target,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  showParentView?: boolean;
  onShowFinanceWelcome?: () => void;
  onShowCommunicationWelcome?: () => void;
}

export default function Sidebar({ showParentView = false, onShowFinanceWelcome, onShowCommunicationWelcome }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    return location === path;
  };
  
  // Función para navegar sin recargar la página para el portal de padres
  const navigateToTab = useCallback((tab: string | null) => {
    if (tab) {
      navigate(`/portal-padres?tab=${tab}`);
    } else {
      navigate('/portal-padres');
    }
  }, [navigate]);

  // Función para mostrar la tarjeta de bienvenida del módulo de Finanzas
  const handleShowFinanceIntro = () => {
    if (onShowFinanceWelcome) {
      onShowFinanceWelcome();
    }
  };

  // Función para mostrar la tarjeta de bienvenida del módulo de Comunicación
  const handleShowCommunicationIntro = () => {
    if (onShowCommunicationWelcome) {
      onShowCommunicationWelcome();
    }
  };

  return (
    <TooltipProvider>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/" className="flex items-start space-x-3 cursor-pointer hover:opacity-90">
          <GraduationCap className="w-7 h-7 text-primary mt-[1px]" />
          <div>
            <div className="text-xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-100">
              Academi<span className="font-bold text-primary">Q</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight -mt-0.5">
              La nueva inteligencia en educación
            </div>
          </div>
        </Link>
        <p className="text-sm text-muted-foreground mt-2">
          {showParentView ? "Portal para Padres" : "Sistema de Gestión Escolar"}
        </p>
      </div>
      
      <nav className="mt-4">
        {showParentView ? (
          // Menú para padres de familia
          <>
            <div className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">
              Portal para Padres
            </div>
            
            <Link href="/portal-padres/dashboard">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/dashboard') || (isActive('/portal-padres') && !location.includes('tab=')) ? 'border-l-3 border-primary' : ''}`}>
                <Home className={`w-5 h-5 mr-3 ${isActive('/portal-padres/dashboard') || (isActive('/portal-padres') && !location.includes('tab=')) ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/portal-padres/dashboard') || (isActive('/portal-padres') && !location.includes('tab=')) ? 'text-primary font-medium' : 'group-hover:text-primary'}>Inicio</span>
              </div>
            </Link>
            
            {/* Sección: Información Académica */}
            <div className="px-4 py-3 mt-4 mb-2">
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                <span className="px-3 bg-white dark:bg-gray-900 border-b-2 border-blue-500 pb-1">
                  📚 INFORMACIÓN ACADÉMICA
                </span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              </div>
            </div>
            
            <Link href="/portal-padres/boletas">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/boletas') || location.includes('/portal-padres/boletas/') ? 'border-l-3 border-primary' : ''}`}>
                <FileText className={`w-5 h-5 mr-3 ${isActive('/portal-padres/boletas') || location.includes('/portal-padres/boletas/') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/portal-padres/boletas') || location.includes('/portal-padres/boletas/') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Boleta Académica</span>
              </div>
            </Link>
            
            {/* Módulo de Asistencias temporalmente deshabilitado */}
            {import.meta.env.VITE_SHOW_ATTENDANCE_MODULE === 'true' && (
              <Link href="/portal-padres/asistencias">
                <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/asistencias') || location.includes('tab=asistencias') ? 'border-l-3 border-primary' : ''}`}>
                  <Calendar className={`w-5 h-5 mr-3 ${isActive('/portal-padres/asistencias') || location.includes('tab=asistencias') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className={isActive('/portal-padres/asistencias') || location.includes('tab=asistencias') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Asistencias</span>
                </div>
              </Link>
            )}
            
            <Link href="/portal-padres/tareas">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/tareas') || location.includes('tab=tareas') ? 'border-l-3 border-primary' : ''}`}>
                <FileText className={`w-5 h-5 mr-3 ${isActive('/portal-padres/tareas') || location.includes('tab=tareas') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/portal-padres/tareas') || location.includes('tab=tareas') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Tareas</span>
              </div>
            </Link>
            
            <Link href="/parent/ia-recommendation">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/parent/ia-recommendation') ? 'border-l-3 border-primary' : ''}`}>
                <Brain className={`w-5 h-5 mr-3 ${isActive('/parent/ia-recommendation') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/parent/ia-recommendation') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Recomendación IA</span>
              </div>
            </Link>
            
            <Link href="/portal-padres/historial-academico">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/historial-academico') ? 'border-l-3 border-primary' : ''}`}>
                <FileText className={`w-5 h-5 mr-3 ${isActive('/portal-padres/historial-academico') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/portal-padres/historial-academico') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Historial Académico</span>
              </div>
            </Link>
            
            {/* Sección: Finanzas */}
            <div className="px-4 py-3 mt-4 mb-2">
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                <span className="px-3 bg-white dark:bg-gray-900 border-b-2 border-yellow-500 pb-1">
                  💰 FINANZAS
                </span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              </div>
            </div>
            
            <Link href="/portal-padres/estado-cuenta">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/estado-cuenta') || location.includes('tab=estado-cuenta') ? 'border-l-3 border-primary' : ''}`}>
                <ScrollText className={`w-5 h-5 mr-3 ${isActive('/portal-padres/estado-cuenta') || location.includes('tab=estado-cuenta') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/portal-padres/estado-cuenta') || location.includes('tab=estado-cuenta') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Estado de Cuenta</span>
              </div>
            </Link>
            
            <Link href="/portal-padres/historial-pagos">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/historial-pagos') ? 'border-l-3 border-primary' : ''}`}>
                <Receipt className={`w-5 h-5 mr-3 ${isActive('/portal-padres/historial-pagos') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/portal-padres/historial-pagos') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Historial de Pagos</span>
              </div>
            </Link>
            
            {/* Sección: Comunicaciones */}
            <div className="px-4 py-3 mt-4 mb-2">
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                <span className="px-3 bg-white dark:bg-gray-900 border-b-2 border-purple-500 pb-1">
                  💬 COMUNICACIONES
                </span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              </div>
            </div>
            
            <Link href="/portal-padres/avisos">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/avisos') || location.includes('tab=avisos') ? 'border-l-3 border-primary' : ''}`}>
                <Bell className={`w-5 h-5 mr-3 ${isActive('/portal-padres/avisos') || location.includes('tab=avisos') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/portal-padres/avisos') || location.includes('tab=avisos') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Avisos Escolares</span>
              </div>
            </Link>
            
            <Link href="/portal-padres/chatbot">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group cursor-pointer ${isActive('/portal-padres/chatbot') || location.includes('tab=chatbot') ? 'border-l-3 border-primary' : ''}`}>
                <MessageSquare className={`w-5 h-5 mr-3 ${isActive('/portal-padres/chatbot') || location.includes('tab=chatbot') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <div className="flex items-center justify-between w-full">
                  <span className={isActive('/portal-padres/chatbot') || location.includes('tab=chatbot') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Chatbot</span>
                  <span className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-sm">
                    🆕 NUEVO
                  </span>
                </div>
              </div>
            </Link>
          </>
        ) : (
          // Menú administrativo
          <>
            <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-700 mb-2">
              <span className="border-b-2 border-blue-500 pb-1">GENERAL</span>
            </div>
            
            <Link href="/">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/') ? 'border-l-3 border-primary' : ''}`}>
                <Home className={`w-5 h-5 mr-3 ${isActive('/') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Dashboard</span>
              </div>
            </Link>
            
            <Link href="/estudiantes">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/estudiantes') ? 'border-l-3 border-primary' : ''}`}>
                <GraduationCap className={`w-5 h-5 mr-3 ${isActive('/estudiantes') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/estudiantes') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Alumnos</span>
              </div>
            </Link>
            
            <Link href="/profesores">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/profesores') ? 'border-l-3 border-primary' : ''}`}>
                <Presentation className={`w-5 h-5 mr-3 ${isActive('/profesores') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/profesores') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Profesores</span>
              </div>
            </Link>
            
            <Link href="/grupos">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/grupos') ? 'border-l-3 border-primary' : ''}`}>
                <Users className={`w-5 h-5 mr-3 ${isActive('/grupos') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/grupos') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Grupos</span>
              </div>
            </Link>
            
            <Link href="/materias">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/materias') ? 'border-l-3 border-primary' : ''}`}>
                <BookOpen className={`w-5 h-5 mr-3 ${isActive('/materias') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/materias') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Materias</span>
              </div>
            </Link>
            
            <div className="px-4 py-3 mt-6 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-700 mb-2">
              <span className="border-b-2 border-green-500 pb-1">ACADÉMICO</span>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/academico/dashboard">
                  <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/academico/dashboard') ? 'border-l-3 border-primary bg-green-50 dark:bg-green-900/20' : ''}`}>
                    <BarChart3 className={`w-5 h-5 mr-3 ${isActive('/academico/dashboard') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                    <span className={isActive('/academico/dashboard') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Dashboard Académico</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Resumen consolidado de indicadores académicos</p>
              </TooltipContent>
            </Tooltip>
            
            <Link href="/asistencias">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/asistencias') ? 'border-l-3 border-primary' : ''}`}>
                <ClipboardCheck className={`w-5 h-5 mr-3 ${isActive('/asistencias') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/asistencias') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Asistencias</span>
              </div>
            </Link>
            
            <Link href="/calificaciones">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/calificaciones') ? 'border-l-3 border-primary' : ''}`}>
                <LineChart className={`w-5 h-5 mr-3 ${isActive('/calificaciones') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/calificaciones') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Calificaciones</span>
              </div>
            </Link>
            
            <Link href="/tareas">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/tareas') ? 'border-l-3 border-primary' : ''}`}>
                <FileText className={`w-5 h-5 mr-3 ${isActive('/tareas') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/tareas') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Tareas</span>
              </div>
            </Link>
            
            <Link href="/boletas">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/boletas') ? 'border-l-3 border-primary bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <Target className={`w-5 h-5 mr-3 ${isActive('/boletas') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/boletas') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Boletas</span>
              </div>
            </Link>
            
            <div className="px-4 py-3 mt-6 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-700 mb-2">
              <span className="border-b-2 border-yellow-500 pb-1">FINANZAS</span>
            </div>
            
            {/* Acceso directo a la introducción del módulo de Finanzas */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  onClick={handleShowFinanceIntro}
                  className="flex items-center px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 group cursor-pointer transition-colors rounded-lg mx-2 mb-1"
                >
                  <HelpCircle className="w-5 h-5 mr-3 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-blue-600 group-hover:text-blue-700 font-medium">Introducción al Módulo</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Introducción completa al Módulo de Finanzas</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Dashboard Principal de Finanzas */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/finanzas/dashboard">
                  <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/finanzas/dashboard') || isActive('/finanzas') ? 'border-l-3 border-primary bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' : ''}`}>
                    <BarChart3 className={`w-5 h-5 mr-3 ${isActive('/finanzas/dashboard') || isActive('/finanzas') ? 'text-primary' : 'text-blue-600 group-hover:text-primary'}`} />
                    <span className={isActive('/finanzas/dashboard') || isActive('/finanzas') ? 'text-primary font-medium' : 'text-blue-600 group-hover:text-primary font-medium'}>Dashboard Financiero</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Resumen general y métricas del módulo de finanzas</p>
              </TooltipContent>
            </Tooltip>
            
            <Link href="/conceptos-pago">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/conceptos-pago') ? 'border-l-3 border-primary' : ''}`}>
                <Receipt className={`w-5 h-5 mr-3 ${isActive('/conceptos-pago') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/conceptos-pago') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Conceptos de Pago</span>
              </div>
            </Link>
            
            <Link href="/adeudos">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/adeudos') ? 'border-l-3 border-primary' : ''}`}>
                <CreditCard className={`w-5 h-5 mr-3 ${isActive('/adeudos') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/adeudos') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Adeudos</span>
              </div>
            </Link>
            
            <Link href="/payments/new">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/payments/new') || isActive('/pagos') ? 'border-l-3 border-primary' : ''}`}>
                <DollarSign className={`w-5 h-5 mr-3 ${isActive('/payments/new') || isActive('/pagos') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/payments/new') || isActive('/pagos') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Pagos</span>
              </div>
            </Link>
            
            <Link href="/estado-cuenta">
              <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/estado-cuenta') ? 'border-l-3 border-primary' : ''}`}>
                <ScrollText className={`w-5 h-5 mr-3 ${isActive('/estado-cuenta') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={isActive('/estado-cuenta') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Estado de Cuenta</span>
              </div>
            </Link>
            
            {/* Solo mostrar Recordatorios de Pagos para administradores */}
            {user?.rol === 'admin' && (
              <Link href="/admin/recordatorios">
                <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/admin/recordatorios') ? 'border-l-3 border-primary' : ''}`}>
                  <Bell className={`w-5 h-5 mr-3 ${isActive('/admin/recordatorios') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className={isActive('/admin/recordatorios') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Recordatorios de Pagos</span>
                </div>
              </Link>
            )}
            
            {/* Reportes Financieros - Solo para administradores y coordinadores */}
            {(user?.rol === 'admin' || user?.rol === 'coordinador') && (
              <Link href="/admin/reportes-financieros">
                <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/admin/reportes-financieros') ? 'border-l-3 border-primary' : ''}`}>
                  <DollarSign className={`w-5 h-5 mr-3 ${isActive('/admin/reportes-financieros') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className={isActive('/admin/reportes-financieros') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Reportes Financieros</span>
                </div>
              </Link>
            )}
            
            {/* Historial de Resúmenes con IA - Solo para administradores y coordinadores */}
            {(user?.rol === 'admin' || user?.rol === 'coordinador') && (
              <Link href="/admin/historial-ia">
                <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/admin/historial-ia') ? 'border-l-3 border-primary' : ''}`}>
                  <PieChart className={`w-5 h-5 mr-3 ${isActive('/admin/historial-ia') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className={isActive('/admin/historial-ia') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Historial IA</span>
                </div>
              </Link>
            )}
            
            {/* Recomendaciones IA - Solo para administradores */}
            {user?.rol === 'admin' && (
              <Link href="/admin/ia-recommendations">
                <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/admin/ia-recommendations') ? 'border-l-3 border-primary' : ''}`}>
                  <Brain className={`w-5 h-5 mr-3 ${isActive('/admin/ia-recommendations') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className={isActive('/admin/ia-recommendations') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Recomendaciones IA</span>
                </div>
              </Link>
            )}
            
            {/* Clasificación de Riesgo de Pago */}
            {(user?.rol === 'admin' || user?.rol === 'coordinador') && (
              <Link href="/clasificacion-riesgo">
                <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/clasificacion-riesgo') ? 'border-l-3 border-primary' : ''}`}>
                  <PieChart className={`w-5 h-5 mr-3 ${isActive('/clasificacion-riesgo') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className={isActive('/clasificacion-riesgo') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Clasificación de Riesgo</span>
                </div>
              </Link>
            )}
            
            {/* Panel Histórico de Riesgo */}
            {(user?.rol === 'admin' || user?.rol === 'coordinador') && (
              <Link href="/risk-history">
                <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/risk-history') ? 'border-l-3 border-primary' : ''}`}>
                  <BarChartBig className={`w-5 h-5 mr-3 ${isActive('/risk-history') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className={isActive('/risk-history') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Histórico de Riesgo</span>
                </div>
              </Link>
            )}
            
            <div className="px-4 py-3 mt-6 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-700 mb-2">
              <span className="border-b-2 border-purple-500 pb-1">PORTAL PARA PADRES</span>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/portal-padres">
                  <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/portal-padres') ? 'border-l-3 border-primary bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <Users className={`w-5 h-5 mr-3 ${isActive('/portal-padres') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                    <span className={isActive('/portal-padres') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Portal para Padres</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Portal web dedicado para padres de familia</p>
              </TooltipContent>
            </Tooltip>
            
            <div className="px-4 py-3 mt-6 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-700 mb-2">
              <span className="border-b-2 border-blue-500 pb-1">COMUNICACIÓN</span>
            </div>
            
            {/* Acceso directo a la introducción del módulo de Comunicación */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  onClick={handleShowCommunicationIntro}
                  className="flex items-center px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 group cursor-pointer transition-colors rounded-lg mx-2 mb-1"
                >
                  <MessageSquare className="w-5 h-5 mr-3 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-blue-600 group-hover:text-blue-700 font-medium">Introducción al Módulo</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Introducción completa al Módulo de Comunicación</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/comunicacion">
                  <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/comunicacion') ? 'border-l-3 border-primary bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <Mail className={`w-5 h-5 mr-3 ${isActive('/comunicacion') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                    <span className={isActive('/comunicacion') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Comunicación</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Centro de mensajería y comunicación escolar</p>
              </TooltipContent>
            </Tooltip>

            {/* Sección de Reportes y Análisis (solo visible para admin y coordinador) */}
            {(user?.rol === 'admin' || user?.rol === 'coordinador') && (
              <>
                <div className="px-4 py-3 mt-6 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-700 mb-2">
                  <span className="border-b-2 border-indigo-500 pb-1">REPORTES Y ANÁLISIS</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/reportes">
                      <div className={`flex items-center px-4 py-3 hover:bg-neutral-light group ${isActive('/reportes') ? 'border-l-3 border-primary bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <BarChartBig className={`w-5 h-5 mr-3 ${isActive('/reportes') ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                        <span className={isActive('/reportes') ? 'text-primary font-medium' : 'group-hover:text-primary'}>Reportes y Estadísticas</span>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reportes detallados y análisis estadístico</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </>
        )}
      </nav>
    </TooltipProvider>
  );
}
