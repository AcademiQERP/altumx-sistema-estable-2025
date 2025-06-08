import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap,
  FileSpreadsheet,
  Calendar,
  Home,
  Settings,
  LogOut,
  User,
  MenuIcon,
  X,
  MessageSquare,
  Clock,
  FileText,
  ClipboardList,
  NotebookPen,
  Brain,
  Lightbulb,
  BarChart,
  BookOpen,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  color?: string;
};

const TeacherSidebar = () => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Enlaces de navegación específicos para docentes
  const navItems: NavItem[] = [
    // Módulos principales
    {
      title: "Dashboard",
      href: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "Horario",
      href: "/profesor/horario",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      title: "Calificaciones",
      href: "/grades/selector",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      title: "Tareas",
      href: "/tareas",
      icon: <FileSpreadsheet className="h-5 w-5" />,
    },
    {
      title: "Boletas",
      href: "/boletas",
      icon: <FileSpreadsheet className="h-5 w-5" />,
    },
    {
      title: "Asistencias",
      href: "/asistencias",
      icon: <Calendar className="h-5 w-5" />,
    },
    
    // Separador para Asistente Pedagógico IA
    {
      title: "____________________",
      href: "#",
      icon: <Separator className="h-px w-full my-1" />,
    },
    
    // Nuevo módulo unificado: Asistente Pedagógico IA
    {
      title: "📘 Asistente Pedagógico IA",
      href: "/profesor/asistente-pedagogico",
      icon: <Brain className="h-5 w-5 text-primary" />,
    },
    
    // Submódulo: Diagnóstico Grupal (antiguas secciones de recomendaciones y plan de recuperación)
    {
      title: "Diagnóstico Grupal",
      href: "#diagnostico-grupal",
      icon: <BookOpen className="h-5 w-5 text-emerald-600" />,
    },
    {
      title: "Ver Recomendaciones",
      href: "/profesor/recomendaciones",
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      title: "Ver Plan de Recuperación",
      href: "/profesor/plan-recuperacion",
      icon: <FileText className="h-5 w-5" />,
    },
    
    // Submódulo: Seguimiento Individual (antiguas observaciones académicas)
    {
      title: "Seguimiento Individual",
      href: "#seguimiento-individual",
      icon: <NotebookPen className="h-5 w-5 text-blue-600" />,
    },
    {
      title: "Seguimiento Grupal",
      href: "/profesor/observaciones/seguimiento-grupo",
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      title: "Ver Observaciones",
      href: "/profesor/observaciones",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Generar Observación",
      href: "/profesor/observaciones/nueva",
      icon: <Lightbulb className="h-5 w-5" />,
    },
    {
      title: "Estadísticas",
      href: "/profesor/observaciones/estadisticas",
      icon: <BarChart className="h-5 w-5" />,
    },
    
    // Módulos temporalmente ocultos
    /*
    {
      title: "Vista Admin",
      href: "/calificaciones-admin",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      title: "Mensajes",
      href: "/mensajes",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    */
  ];

  const mobileNavButton = (
    <Button
      variant="outline"
      size="icon"
      className="md:hidden fixed top-4 left-4 z-[60] bg-white shadow-md border"
      onClick={() => setOpen(true)}
    >
      <MenuIcon className="h-5 w-5" />
    </Button>
  );

  const mobileSidebar = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
        <div className="flex flex-col h-full bg-background">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold">Altum Educación</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {user && (
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{user.nombreCompleto}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.rol}
                  </p>
                </div>
              </div>
            )}
          </div>
          <nav className="flex-1 overflow-auto p-3 space-y-1">
            {navItems.map((item, index) => {
              // Para el separador, devolver un div en lugar de un enlace
              if (item.title === "____________________") {
                return (
                  <div key={`separator-${index}`} className="my-2 px-2">
                    <Separator className="h-px w-full" />
                  </div>
                );
              }
              
              // Para el título de sección, usar un estilo diferente sin enlace
              if (item.href.startsWith("#")) {
                // Diferenciamos entre módulos principales y submódulos
                if (item.href === "#asistente-pedagogico") {
                  return (
                    <div
                      key={`section-${index}`}
                      className="px-3 py-2 text-sm font-semibold text-primary uppercase tracking-wider mt-3 mb-1"
                    >
                      <div className="flex items-center gap-2 bg-primary/5 p-2 rounded-md">
                        {item.icon}
                        {item.title}
                      </div>
                    </div>
                  );
                } else if (item.href === "#diagnostico-grupal" || item.href === "#seguimiento-individual") {
                  // Estilo para submódulos con colores distintivos
                  const bgColor = item.href === "#diagnostico-grupal" ? "bg-emerald-50" : "bg-blue-50";
                  const textColor = item.href === "#diagnostico-grupal" ? "text-emerald-700" : "text-blue-700";
                  
                  return (
                    <div
                      key={`section-${index}`}
                      className={`px-3 py-1 text-xs font-medium ${textColor} mt-2 ml-2`}
                    >
                      <div className={`flex items-center gap-2 ${bgColor} p-1.5 rounded-md`}>
                        {item.icon}
                        {item.title}
                      </div>
                    </div>
                  );
                } else {
                  // Estilo para otros encabezados
                  return (
                    <div
                      key={`section-${index}`}
                      className="px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider mt-2"
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        {item.title}
                      </div>
                    </div>
                  );
                }
              }
              
              // Para los enlaces normales, con indentación para submódulos
              const isSubmoduleItem = (
                (item.href.includes('/profesor/recomendaciones') || item.href.includes('/profesor/plan-recuperacion')) ||
                (item.href.includes('/profesor/observaciones'))
              );
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary ${
                      location === item.href
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground"
                    } ${isSubmoduleItem ? "ml-4" : ""}`}
                  >
                    {item.icon}
                    {item.title}
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      {mobileNavButton}
      {mobileSidebar}
      <div className="h-full w-full flex flex-col border-r bg-background hidden md:flex">
        <div className="p-6 border-b">
          <div className="mb-6">
            <Link href="/" className="flex items-start space-x-3 cursor-pointer hover:opacity-90">
              <GraduationCap className="w-7 h-7 text-primary mt-[1px]" />
              <div>
                <div className="text-xl font-semibold leading-tight tracking-tight text-gray-900">
                  Academi<span className="font-bold text-primary">Q</span>
                </div>
                <div className="text-xs text-gray-500 leading-tight -mt-0.5">
                  La nueva inteligencia en educación
                </div>
              </div>
            </Link>
          </div>
          {user && (
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{user.nombreCompleto}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.rol}
                </p>
              </div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-auto p-4 space-y-2">
          {navItems.map((item, index) => {
            // Para el separador, devolver un div en lugar de un enlace
            if (item.title === "____________________") {
              return (
                <div key={`separator-${index}`} className="my-2 px-2">
                  <Separator className="h-px w-full" />
                </div>
              );
            }
            
            // Para el título de sección, usar un estilo diferente sin enlace
            if (item.href.startsWith("#")) {
              // Diferenciamos entre módulos principales y submódulos
              if (item.href === "#asistente-pedagogico") {
                return (
                  <div
                    key={`section-${index}`}
                    className="px-3 py-2 text-sm font-semibold text-primary uppercase tracking-wider mt-3 mb-1"
                  >
                    <div className="flex items-center gap-2 bg-primary/10 p-2 rounded-md">
                      {item.icon}
                      {item.title}
                    </div>
                  </div>
                );
              } else if (item.href === "#diagnostico-grupal" || item.href === "#seguimiento-individual") {
                // Estilo para submódulos con colores distintivos
                const bgColor = item.href === "#diagnostico-grupal" ? "bg-emerald-100" : "bg-blue-100";
                const textColor = item.href === "#diagnostico-grupal" ? "text-emerald-700" : "text-blue-700";
                
                return (
                  <div
                    key={`section-${index}`}
                    className={`px-3 py-1 text-xs font-medium ${textColor} mt-2 ml-2`}
                  >
                    <div className={`flex items-center gap-2 ${bgColor} p-1.5 rounded-md`}>
                      {item.icon}
                      {item.title}
                    </div>
                  </div>
                );
              } else {
                // Estilo para otros encabezados
                return (
                  <div
                    key={`section-${index}`}
                    className="px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider mt-2"
                  >
                    <div className="flex items-center gap-2">
                      {item.icon}
                      {item.title}
                    </div>
                  </div>
                );
              }
            }
            
            // Para los enlaces normales, con indentación para submódulos
            const isSubmoduleItem = (
              (item.href.includes('/profesor/recomendaciones') || item.href.includes('/profesor/plan-recuperacion')) ||
              (item.href.includes('/profesor/observaciones'))
            );
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary ${
                    location === item.href
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground"
                  } ${isSubmoduleItem ? "ml-4" : ""}`}
                >
                  {item.icon}
                  {item.title}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </>
  );
};

export default TeacherSidebar;