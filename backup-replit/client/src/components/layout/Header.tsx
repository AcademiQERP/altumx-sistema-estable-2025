import { Bell, Search, Menu, LogOut, User, Book, Calendar, Receipt, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

interface HeaderProps {
  toggleSidebar: () => void;
}

// Interfaz para las notificaciones
interface Notification {
  id: number;
  title: string;
  message?: string;
  type: 'payment' | 'homework' | 'meeting' | 'grade' | 'general' | 'attention';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Componente para generar el icono según tipo de notificación
const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
  switch (type) {
    case 'payment':
      return <Receipt className="h-5 w-5 text-blue-500" />;
    case 'homework':
      return <Book className="h-5 w-5 text-emerald-500" />;
    case 'meeting':
      return <Calendar className="h-5 w-5 text-purple-500" />;
    case 'grade':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'attention':
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

// Componente para mostrar una notificación
const NotificationItem = ({ notification }: { notification: Notification }) => {
  return (
    <DropdownMenuItem asChild className={`p-3 ${!notification.read ? 'bg-muted/30' : ''}`}>
      <div className="flex items-start gap-3 cursor-pointer w-full">
        <div className="mt-0.5">
          <NotificationIcon type={notification.type} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-start">
            <p className="font-medium text-sm">{notification.title}</p>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(notification.timestamp)}
            </span>
          </div>
          {notification.message && (
            <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
          )}
          {notification.actionUrl && (
            <Link href={notification.actionUrl}>
              <Badge variant="outline" className="text-xs mt-1 cursor-pointer">
                Ver detalles
              </Badge>
            </Link>
          )}
        </div>
      </div>
    </DropdownMenuItem>
  );
};

// Función para formatear tiempo
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `Hace ${diffMins} min`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  } else if (diffDays < 7) {
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [initials, setInitials] = useState("...");
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: "Nuevo pago disponible",
      message: "Ya está disponible el pago de colegiatura de mayo 2025.",
      type: "payment",
      timestamp: new Date(new Date().getTime() - 45 * 60000), // 45 minutos atrás
      read: false,
      actionUrl: "/portal-padres/estado-cuenta"
    },
    {
      id: 2,
      title: "Tarea de inglés asignada",
      message: "Se ha publicado una nueva tarea de inglés con entrega para el 20 de abril.",
      type: "homework",
      timestamp: new Date(new Date().getTime() - 3 * 3600000), // 3 horas atrás
      read: false,
      actionUrl: "/portal-padres/tareas"
    },
    {
      id: 3,
      title: "Recordatorio de reunión",
      message: "Reunión de padres de familia este miércoles a las 17:00 horas en el auditorio.",
      type: "meeting",
      timestamp: new Date(new Date().getTime() - 1 * 86400000), // 1 día atrás
      read: true,
      actionUrl: "/portal-padres/avisos"
    },
    {
      id: 4,
      title: "Calificación publicada",
      message: "Se ha publicado la calificación del examen de matemáticas.",
      type: "grade",
      timestamp: new Date(new Date().getTime() - 2 * 86400000), // 2 días atrás
      read: true,
      actionUrl: "/portal-padres/calificaciones"
    }
  ]);
  
  const unreadNotifications = notifications.filter(n => !n.read).length;
  
  useEffect(() => {
    if (user?.nombreCompleto) {
      const parts = user.nombreCompleto.split(" ");
      const firstInitial = parts[0] ? parts[0][0] : "";
      const lastInitial = parts[1] ? parts[1][0] : "";
      setInitials((firstInitial + lastInitial).toUpperCase());
    }
  }, [user]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const markAllAsRead = () => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({
        ...notification,
        read: true
      }))
    );
  };

  return (
    <header className="main-nav bg-white/90 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.05)] border-b border-gray-100 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        {/* Botón de menú para móvil */}
        <div className="flex items-center md:hidden">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="rounded-full hover:bg-gray-100">
            <Menu className="h-6 w-6 text-muted-foreground" />
          </Button>
        </div>
        
        {/* Buscador */}
        <div className="flex items-center relative md:ml-0 ml-auto">
          <div className="relative mr-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-10 pr-4 py-2 w-48 md:w-64 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-gray-200 focus:border-primary/20 focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>
        
        {/* Perfil de usuario y notificaciones */}
        <div className="flex items-center">
          {/* Dropdown de notificaciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative mr-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-destructive flex items-center justify-center text-[10px] text-white font-medium">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-4">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs h-7 px-2"
                  disabled={unreadNotifications === 0}
                >
                  Marcar como leídas
                </Button>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No hay notificaciones
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/portal-padres/avisos">
                    Ver todas las notificaciones
                  </Link>
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Dropdown de perfil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center cursor-pointer">
                <Avatar className="h-8 w-8 bg-primary text-white mr-2">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm">
                  {user ? user.nombreCompleto : <Skeleton className="h-4 w-24" />}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
