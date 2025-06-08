import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser, loginSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  setAuthToken, 
  removeAuthToken, 
  getAuthToken, 
  isTokenPotentiallyExpired 
} from "@/services/auth-service";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{user: User, token: string}, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{user: User, token: string}, Error, RegisterData>;
};

export type LoginData = z.infer<typeof loginSchema>;

export type RegisterData = LoginData & {
  nombreCompleto: string;
  rol: "admin" | "docente" | "padre" | "alumno";
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Verificar al inicio si hay un token almacenado
  console.log("AuthProvider inicializado, verificando token existente...");
  const hasToken = getAuthToken();
  console.log(`Token en localStorage: ${hasToken ? 'Presente' : 'No presente'}`);
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | null, Error>({
    queryKey: ["/api/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: hasToken ? 3 : 0, // Reintentar si hay token
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
  
  // Añadir un efecto para refrescar el usuario después de una desconexión
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasToken) {
        console.log('Pestaña visible nuevamente, refrescando estado de autenticación...');
        
        // Verificar si el token parece estar expirado basado en tiempo de inactividad
        if (isTokenPotentiallyExpired(30)) { // Verificar si pasaron más de 30 minutos
          console.warn('⚠️ Token potencialmente expirado después de inactividad, forzando reautenticación');
          // Limpiar caché de consultas para forzar reautenticación
          queryClient.invalidateQueries({
            queryKey: ["/api/me"]
          });
        }
        
        refetchUser();
      }
    };
    
    // También podemos añadir un listener para reconexiones de red
    const handleOnline = () => {
      if (hasToken) {
        console.log('Navegador reconectado a la red, refrescando estado de autenticación...');
        
        // Notificar al usuario que la conexión se ha restaurado
        toast({
          title: "Conexión restaurada",
          description: "Tu conexión a internet ha sido restablecida.",
          variant: "default",
        });
        
        // También verificamos expiración en reconexiones de red
        if (isTokenPotentiallyExpired(15)) { // Verificamos con un tiempo menor en reconexiones
          console.warn('⚠️ Token potencialmente expirado después de reconexión, forzando reautenticación');
          queryClient.invalidateQueries({
            queryKey: ["/api/me"]
          });
          
          toast({
            title: "Verificando sesión",
            description: "Verificando estado de tu sesión después de la reconexión...",
            variant: "default",
          });
        }
        
        refetchUser();
      }
    };
    
    // Detector de pérdida de conexión
    const handleOffline = () => {
      toast({
        title: "Sin conexión",
        description: "Se ha perdido la conexión a internet. Algunas funciones no estarán disponibles hasta que se restablezca.",
        variant: "destructive",
        duration: 5000,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetchUser, hasToken, toast]);

  // Función para establecer el token usando el servicio de auth
  const setToken = (token: string) => {
    setAuthToken(token);
  };

  // Función para eliminar el token usando el servicio de auth
  const removeToken = () => {
    removeAuthToken();
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Enviando credenciales:", credentials);
        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        });
        
        console.log("Respuesta recibida:", res.status);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Error de autenticación (${res.status})`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error en la función de mutación de login:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Login exitoso, respuesta:", data);
      // Guardar el token en localStorage
      setToken(data.token);
      // Actualizar el usuario en el cache
      queryClient.setQueryData(["/api/me"], data.user);
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido, ${data.user.nombreCompleto}`,
      });
    },
    onError: (error: Error) => {
      console.error("Error en onError del login:", error);
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al registrar usuario");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Guardar el token en localStorage
      setToken(data.token);
      // Actualizar el usuario en el cache
      queryClient.setQueryData(["/api/me"], data.user);
      toast({
        title: "Registro exitoso",
        description: `Bienvenido, ${data.user.nombreCompleto}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar usuario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Solo eliminamos el token del localStorage
      removeToken();
      // No realizamos la solicitud HTTP ya que no existe un endpoint de logout
      // en el servidor que implementa la autenticación con JWT
    },
    onSuccess: () => {
      // Actualizar el usuario en el cache
      queryClient.setQueryData(["/api/me"], null);
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}