import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Variable de entorno para determinar si estamos en modo de desarrollo
const DEV_MODE = process.env.NODE_ENV !== "production";

// Middleware para entorno de desarrollo que permite bypass de autenticación para ciertas rutas
export const devModeAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Solo aplicamos el bypass en modo desarrollo
  if (DEV_MODE) {
    console.log(`[DevMode] Validando ruta para bypass de autenticación: ${req.originalUrl}`);
    // Verificamos si la ruta es parte del módulo AcademicObserver o del API de IA
    if (req.originalUrl.includes('/api/academic-observer') || req.originalUrl.includes('/api/ai/')) {
      try {
        // Intentamos obtener el token normal primero
        const authHeader = req.headers["authorization"];
        const token = authHeader?.split(" ")[1];
        
        if (token) {
          try {
            // Primero intentamos verificar el token normalmente
            const secret = process.env.JWT_SECRET || "eduMex_default_secret_key";
            const decoded = jwt.verify(token, secret);
            (req as any).user = decoded;
            const moduleType = req.originalUrl.includes('/api/ai/') ? 'AI' : 'AcademicObserver';
            console.log(`[DevMode] Token válido para ${moduleType}, usando el usuario autenticado`);
          } catch (error) {
            // Si falla, inyectamos un usuario simulado para AcademicObserver o AI
            const moduleType = req.originalUrl.includes('/api/ai/') ? 'AI' : 'AcademicObserver';
            console.log(`[DevMode] Token inválido para ${moduleType}, inyectando usuario simulado`);
            (req as any).user = {
              id: "dev-user-id",
              rol: req.originalUrl.includes('/api/ai/') ? "admin" : "docente", // Admin para rutas AI
              profesorId: 3, // ID de profesor simulado para desarrollo
              nombre: req.originalUrl.includes('/api/ai/') ? "Usuario Simulado Administrador" : "Usuario Simulado",
              correo: "dev@altum.edu.mx"
            };
          }
        } else {
          // Si no hay token, inyectamos un usuario simulado para AcademicObserver o AI
          const moduleType = req.originalUrl.includes('/api/ai/') ? 'AI' : 'AcademicObserver';
          console.log(`[DevMode] No hay token para ${moduleType}, inyectando usuario simulado`);
          (req as any).user = {
            id: "dev-user-id",
            rol: req.originalUrl.includes('/api/ai/') ? "admin" : "docente", // Admin para rutas AI
            profesorId: 3, // ID de profesor simulado para desarrollo
            nombre: req.originalUrl.includes('/api/ai/') ? "Usuario Simulado Administrador" : "Usuario Simulado",
            correo: "dev@altum.edu.mx"
          };
        }
        
        next();
        return;
      } catch (error) {
        console.error(`[DevMode] Error en bypass de autenticación:`, error);
        // Continuamos de todos modos
        next();
        return;
      }
    }
  }
  
  // Si no estamos en modo desarrollo o la ruta no es de AcademicObserver, 
  // continuamos con la autenticación normal
  next();
};

// Middleware para verificar el token JWT
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  // Obtener el token del encabezado Authorization
  const authHeader = req.headers["authorization"];
  console.log(`📑 Cabecera de autorización recibida: ${authHeader ? `${authHeader.substring(0, 20)}...` : 'ninguna'}`);
  
  // Análisis detallado de headers para depuración
  console.log(`🔍 Headers completos de la solicitud:`, req.headers);
  
  const token = authHeader?.split(" ")[1]; // Bearer TOKEN
  
  const reqUrl = req.originalUrl || req.url;
  console.log(`💡 Validando token para ruta: ${reqUrl}`);
  console.log(`🔑 Token extraído: ${token ? `${token.substring(0, 10)}...` : 'ninguno'}`);

  // Bypass para rutas de API de IA en modo desarrollo
  if (DEV_MODE && reqUrl.includes('/api/ai/')) {
    // Primero intentamos verificar si hay un token válido
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || "eduMex_default_secret_key";
        const decoded = jwt.verify(token, secret);
        // Si el token es válido y el usuario es admin, utilizamos sus credenciales reales
        if ((decoded as any).rol === 'admin') {
          console.log(`🔐 Usuario admin autenticado accediendo a ruta de IA: ${reqUrl}`);
          (req as any).user = decoded;
          next();
          return;
        }
      } catch (error) {
        // Si hay un error con el token, continuamos con el usuario simulado
        console.log(`🔄 Error al verificar token para IA, usando simulado:`, error);
      }
    }
    
    console.log(`🔄 Bypass de autenticación para ruta de IA en modo desarrollo: ${reqUrl}`);
    (req as any).user = {
      id: "dev-user-id",
      rol: "admin", // Cambiado de "docente" a "admin" para permitir acceso
      profesorId: 3, // ID de profesor simulado para desarrollo
      nombre: "Usuario Simulado Administrador",
      correo: "dev@altum.edu.mx"
    };
    next();
    return;
  }

  if (!token) {
    console.log(`❌ No se encontró token en la solicitud a ${reqUrl}`);
    return res.status(401).json({ 
      message: "Tu sesión ha expirado o no has iniciado sesión. Por favor, inicia sesión para continuar.",
      errorCode: "NO_TOKEN"
    });
  }

  try {
    // Verificar el token con la clave secreta
    const secret = process.env.JWT_SECRET || "eduMex_default_secret_key";
    const decoded = jwt.verify(token, secret);
    
    // Adjuntar el usuario decodificado a la solicitud
    (req as any).user = decoded;
    
    console.log(`✅ Token verificado para ${reqUrl}`, {
      userId: (decoded as any).id,
      userRole: (decoded as any).rol,
      profesorId: (decoded as any).profesorId
    });
    
    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.log(`❌ Error al verificar token para ${reqUrl}:`, errorMessage);
    return res.status(401).json({ 
      message: "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.",
      errorCode: "INVALID_TOKEN"
    });
  }
};

// Middleware para verificar el rol del usuario
export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ 
        message: "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.",
        errorCode: "SESSION_EXPIRED"
      });
    }
    
    if (roles.includes(user.rol)) {
      next();
    } else {
      return res.status(403).json({ 
        message: "No tienes permisos para acceder a este recurso" 
      });
    }
  };
};