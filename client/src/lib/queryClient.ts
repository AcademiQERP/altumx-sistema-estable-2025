import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Importar las funciones de manejo de autenticación
import { 
  getAuthToken, 
  createAuthHeaders as createAuthHeadersFromService, 
  isTokenPotentiallyExpired,
  AUTH_TOKEN_KEY
} from "@/services/auth-service";

// Función para crear headers con token de autenticación si existe
function createAuthHeaders(hasContent: boolean = false): HeadersInit {
  return createAuthHeadersFromService(hasContent);
}

// Función para depurar las solicitudes
function logRequestInfo(method: string, url: string, headers: HeadersInit, hasToken: boolean) {
  console.log(`🔍 Enviando solicitud ${method} a ${url}`);
  console.log(`🔑 Token incluido: ${hasToken ? 'Sí' : 'No'}`);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAuthToken();
  const hasContent = !!data;
  
  // Crear headers base
  const baseHeaders: HeadersInit = hasContent 
    ? { "Content-Type": "application/json" } 
    : {};
  
  // Agregar token de autorización explícitamente (no usar createAuthHeaders)
  const headers: HeadersInit = {
    ...baseHeaders,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  // Log detallado para depuración
  logRequestInfo(method, url, headers, !!token);
  console.log(`🔒 Headers para ${method} ${url}:`, headers);
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Manejo especial para errores de autenticación
  if (res.status === 401) {
    console.error(`⚠️ Error de autenticación (401) en solicitud ${method} a ${url}`);
    
    try {
      // Intentar obtener el mensaje de error detallado del servidor
      const errorData = await res.json();
      const errorMessage = errorData.message || "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.";
      
      console.warn(`⚠️ Mensaje del servidor: ${errorMessage}`);
      
      // Invalidar consultas relacionadas con autenticación
      queryClient.invalidateQueries({
        queryKey: ["/api/me"]
      });
      
      // Personalizar el error con el mensaje del servidor
      const authError = new Error(errorMessage);
      // @ts-ignore: Añadir propiedad adicional para identificar errores de autenticación
      authError.isAuthError = true;
      // @ts-ignore: Añadir código de error si está disponible
      authError.errorCode = errorData.errorCode;
      throw authError;
    } catch (parseError) {
      // Si no podemos analizar la respuesta JSON, usamos un mensaje predeterminado
      console.warn("⚠️ No se pudo obtener mensaje detallado del servidor, usando mensaje genérico");
      
      // Si el token parece expirado basado en tiempo, actualizar mensaje de error
      if (token && isTokenPotentiallyExpired(45)) { // 45 minutos
        console.warn("⚠️ Token potencialmente expirado, posible sesión caducada");
        
        // Invalidar consultas relacionadas con autenticación
        queryClient.invalidateQueries({
          queryKey: ["/api/me"]
        });
        
        // Mensaje más específico para sesión expirada
        const authError = new Error("Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.");
        // @ts-ignore: Añadir propiedad adicional para identificar errores de autenticación
        authError.isAuthError = true;
        throw authError;
      }
      
      // Error de autenticación genérico
      const authError = new Error("No autorizado. Por favor, inicia sesión.");
      // @ts-ignore: Añadir propiedad adicional para identificar errores de autenticación
      authError.isAuthError = true;
      throw authError;
    }
  }
  else if (!res.ok) {
    console.error(`❌ Error en solicitud ${method} ${url}: ${res.status} ${res.statusText}`);
  }
  else {
    // Si la solicitud fue exitosa, actualizar la marca de tiempo del token
    // para extender su vida útil basada en actividad
    if (token) {
      localStorage.setItem(`${AUTH_TOKEN_KEY}_timestamp`, Date.now().toString());
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAuthToken();
    
    // Crear headers explícitamente para que sean consistentes 
    // con apiRequest() y no usar createAuthHeaders()
    const headers: HeadersInit = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    // Log adicional para depuración de autenticación
    console.log(`🔐 DEBUG: Enviando solicitud a ${queryKey[0]} con headers:`, headers);
    console.log(`🔐 DEBUG: Token disponible:`, token ? "Sí" : "No");
    if (token) {
      console.log(`🔐 DEBUG: Token parcial:`, token.substring(0, 10) + "...");
    }
    
    // Log para depuración
    logRequestInfo("GET", queryKey[0] as string, headers, !!token);
    console.log(`🔒 Headers para GET ${queryKey[0]}:`, headers);
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers,
      });

      if (res.status === 401) {
        console.error(`❌ Error 401 en solicitud GET ${queryKey[0]}: No autenticado`);
        
        try {
          // Intentar obtener el mensaje de error detallado del servidor
          const errorData = await res.json();
          const errorMessage = errorData.message || "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.";
          
          console.warn(`⚠️ Mensaje del servidor: ${errorMessage}`);
          
          // Invalidar consultas relacionadas con autenticación
          queryClient.invalidateQueries({
            queryKey: ["/api/me"]
          });
          
          // Invalidar la consulta actual
          queryClient.invalidateQueries({
            queryKey: [queryKey[0] as string]
          });
          
          if (unauthorizedBehavior === "returnNull") {
            return null;
          } else {
            // Personalizar el error con el mensaje del servidor
            const authError = new Error(errorMessage);
            // @ts-ignore: Añadir propiedad adicional para identificar errores de autenticación
            authError.isAuthError = true;
            // @ts-ignore: Añadir código de error si está disponible
            authError.errorCode = errorData.errorCode;
            throw authError;
          }
        } catch (parseError) {
          // Si no podemos analizar la respuesta JSON, usamos mensaje basado en el tiempo
          console.warn("⚠️ No se pudo obtener mensaje detallado del servidor, usando mensaje basado en heurística");
          
          // Si el token parece expirado basado en tiempo
          if (token && isTokenPotentiallyExpired(30)) { // 30 minutos
            console.warn("⚠️ Token potencialmente expirado, limpiando caché y sesión");
            
            // Invalidar consultas relacionadas con autenticación
            queryClient.invalidateQueries({
              queryKey: ["/api/me"]
            });
            
            // Invalidar la consulta actual
            queryClient.invalidateQueries({
              queryKey: [queryKey[0] as string]
            });
            
            // Crear un error más específico para indicar que la sesión expiró
            if (unauthorizedBehavior === "returnNull") {
              return null;
            } else {
              const authError = new Error("Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.");
              // @ts-ignore: Añadimos propiedad para identificar el tipo de error
              authError.isAuthError = true;
              throw authError;
            }
          }
          
          if (unauthorizedBehavior === "returnNull") {
            return null;
          } else {
            // Error de autenticación genérico
            const authError = new Error("No autorizado. Por favor, inicia sesión.");
            // @ts-ignore: Añadimos propiedad para identificar el tipo de error
            authError.isAuthError = true;
            throw authError;
          }
        }
      }

      await throwIfResNotOk(res);
      
      // Comprobar que la respuesta es JSON válido
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`❌ Error: La respuesta no es JSON válido en ${queryKey[0]}. Content-Type: ${contentType}`);
        throw new Error(`La respuesta no es JSON válido. Recibido: ${contentType}`);
      }
      
      // Si la solicitud fue exitosa, actualizar la marca de tiempo del token
      // para extender su vida útil basada en actividad
      if (token) {
        localStorage.setItem(`${AUTH_TOKEN_KEY}_timestamp`, Date.now().toString());
      }
      
      return await res.json();
    } catch (error) {
      console.error(`❌ Error en solicitud GET ${queryKey[0]}:`, error);
      
      // Si hay un error de red (servidor caído), programar un reintento automático
      // usando la capacidad de reintentos de React Query
      throw error;
    }
  };

// Función adaptada especialmente para endpoints financieros
export const getFinancialQueryFn = <T>(studentId?: number) => {
  return async () => {
    if (!studentId) {
      console.error("⚠️ getFinancialQueryFn: ID de estudiante no proporcionado o inválido");
      throw new Error("Se requiere un ID de estudiante válido");
    }
    
    const url = `/api/finanzas/resumen/${studentId}`;
    console.log(`📊 Solicitando datos financieros para estudiante ID: ${studentId}`);
    
    const token = getAuthToken();
    
    // Usar el mismo formato de headers que en las otras funciones
    const headers: HeadersInit = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    logRequestInfo("GET", url, headers, !!token);
    console.log(`🔒 Headers para GET ${url}:`, headers);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers,
      });
      
      if (res.status === 401) {
        console.error(`❌ Error 401 en resumen financiero: No autenticado`);
        
        try {
          // Intentar obtener el mensaje de error detallado del servidor
          const errorData = await res.json();
          const errorMessage = errorData.message || "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.";
          
          console.warn(`⚠️ Mensaje del servidor: ${errorMessage}`);
          
          // Invalidar consultas relacionadas con autenticación
          queryClient.invalidateQueries({
            queryKey: ["/api/me"]
          });
          
          // Invalidar la consulta actual
          queryClient.invalidateQueries({
            queryKey: [`/api/finanzas/resumen/${studentId}`]
          });
          
          // Personalizar el error con el mensaje del servidor
          const authError = new Error(errorMessage);
          // @ts-ignore: Añadir propiedad adicional para identificar errores de autenticación
          authError.isAuthError = true;
          // @ts-ignore: Añadir código de error si está disponible
          authError.errorCode = errorData.errorCode;
          throw authError;
        } catch (parseError) {
          // Si no podemos analizar la respuesta JSON, usamos mensaje basado en el tiempo
          console.warn("⚠️ No se pudo obtener mensaje detallado del servidor, usando mensaje basado en heurística");
          
          // Si el token parece expirado basado en tiempo
          if (token && isTokenPotentiallyExpired(30)) { // 30 minutos
            console.warn("⚠️ Token potencialmente expirado, limpiando caché y sesión");
            
            // Invalidar consultas relacionadas con autenticación
            queryClient.invalidateQueries({
              queryKey: ["/api/me"]
            });
            
            // Invalidar la consulta actual
            queryClient.invalidateQueries({
              queryKey: [`/api/finanzas/resumen/${studentId}`]
            });
            
            // Crear un error más específico para indicar que la sesión expiró
            const authError = new Error("Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.");
            // @ts-ignore: Añadimos propiedad para identificar el tipo de error
            authError.isAuthError = true;
            throw authError;
          }
          
          // Error de autenticación genérico
          const authError = new Error("No autorizado. Por favor, inicia sesión.");
          // @ts-ignore: Añadimos propiedad para identificar el tipo de error
          authError.isAuthError = true;
          throw authError;
        }
      }
      
      if (!res.ok) {
        console.error(`❌ Error en resumen financiero: ${res.status} ${res.statusText}`);
        console.error(`Para estudiante ID: ${studentId}`);
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      // Si la solicitud fue exitosa, actualizar la marca de tiempo del token
      // para extender su vida útil basada en actividad
      if (token) {
        localStorage.setItem(`${AUTH_TOKEN_KEY}_timestamp`, Date.now().toString());
      }
      
      const data = await res.json();
      console.log("✅ Datos financieros recibidos:", data);
      return data as T;
    } catch (error) {
      console.error("❌ Excepción en consulta financiera:", error);
      throw error;
    }
  };
};

// Función para determinar cuándo reintentar una solicitud
const retryFn = (failureCount: number, error: Error) => {
  // Evitar reintentos en errores de autenticación
  // @ts-ignore: Verificar propiedad personalizada de errores de autenticación
  if (error.isAuthError) {
    console.log('⚠️ Error de autenticación detectado, no reintentaremos la solicitud');
    return false;
  }
  
  // Si hay un token y no es un error de autenticación, reintentamos hasta 3 veces
  if (getAuthToken() && failureCount < 3) {
    console.log(`🔄 Reintentando solicitud (intento ${failureCount})...`);
    return true;
  }
  
  // Si no hay token o se superaron los reintentos, no seguimos reintentando
  return false;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Hacemos más corto el tiempo de caducidad de datos para refrescar más frecuentemente
      staleTime: 1000 * 60 * 5, // 5 minutos
      // Configuramos reintentos personalizados
      retry: retryFn,
      retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000), // Backoff exponencial hasta 30 segundos
    },
    mutations: {
      retry: false, // Las mutaciones no reintentan por defecto
    },
  },
});
