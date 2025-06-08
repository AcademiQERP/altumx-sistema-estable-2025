import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertTriangle } from "lucide-react";
import { Route, Redirect, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType<any>;
  roles?: string[];
};

export function ProtectedRoute({ path, component: Component, roles }: ProtectedRouteProps) {
  const { user, isLoading, error } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState<string | null>(null);
  const [authErrorShown, setAuthErrorShown] = useState(false);
  
  // Capturar la ubicación actual para redirigir de vuelta después del login
  useEffect(() => {
    if (path !== '/auth') {
      setLocation(path);
    }
  }, [path]);
  
  // Mostrar mensajes de error de autenticación
  useEffect(() => {
    if (error && !authErrorShown) {
      toast({
        title: "Error de autenticación",
        description: error.message || "Ha ocurrido un error con tu sesión. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
      });
      
      // Evitar que se muestre el error múltiples veces
      setAuthErrorShown(true);
    }
  }, [error, toast, authErrorShown]);

  return (
    <Route path={path}>
      {(params) => {
        // Si está cargando, mostramos el loader
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Verificando tu sesión...</p>
            </div>
          );
        }
        
        // Si hay un error de autenticación, redirigir a la página de login
        if (error) {
          // Almacenar la ubicación actual para redirigir después del login
          if (path !== '/auth') {
            sessionStorage.setItem('redirectAfterLogin', path);
          }
          
          return <Redirect to="/auth" />;
        }
        
        // Si no hay usuario autenticado, redirigir a la página de login
        if (!user) {
          // Almacenar la ubicación actual para redirigir después del login
          if (path !== '/auth') {
            sessionStorage.setItem('redirectAfterLogin', path);
          }
          
          return <Redirect to="/auth" />;
        }
        
        // Si el usuario es un padre y está en la ruta del dashboard principal
        // redirigirlo al portal para padres
        if (user.rol === "padre" && path === "/") {
          return <Redirect to="/portal-padres" />;
        }
        
        // Si se especificaron roles y el usuario no tiene el rol requerido
        if (roles && roles.length > 0 && !roles.includes(user.rol)) {
          // Mostrar un mensaje informativo sobre la redirección
          toast({
            title: "Acceso restringido",
            description: "No tienes permisos para acceder a esta sección.",
            variant: "default",
          });
          
          if (user.rol === "padre") {
            return <Redirect to="/portal-padres" />;
          } else {
            return <Redirect to="/" />;
          }
        }
        
        // Si todo está bien, renderizar el componente pasando el usuario
        return <Component {...params} user={user} />;
      }}
    </Route>
  );
}