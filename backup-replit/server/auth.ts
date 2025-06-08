import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { processRemindersOnAdminLogin } from "./middleware/admin-reminder-middleware";

// Configuración para bcrypt
const SALT_ROUNDS = 10;

// Clave secreta para JWT - En producción debe estar en variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || "edumex_secret_key";

// Duración del token - 1 día
const TOKEN_EXPIRES_IN = "24h";

export function setupAuth(app: Express) {
  // Definir middleware para la autenticación JWT
  const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    // Bypass en modo desarrollo para rutas de IA
    const DEV_MODE = process.env.NODE_ENV !== "production";
    if (DEV_MODE && req.originalUrl.includes('/api/ai/')) {
      console.log(`[DevAuth] Bypass de autenticación para ruta de IA en modo desarrollo: ${req.originalUrl}`);
      (req as any).user = {
        id: "dev-user-id",
        rol: "docente",
        profesorId: 3, // ID de profesor simulado para desarrollo
        nombre: "Usuario Simulado",
        correo: "dev@altum.edu.mx"
      };
      next();
      return;
    }
    
    // Obtener el token del header Authorization
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: "No se proporcionó un token de autenticación" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log(`[AUTH ERROR] Token verification failed for ${req.originalUrl}:`, {
          error: err.message,
          tokenPartial: token.substring(0, 20) + '...'
        });
        return res.status(403).json({ message: "Token inválido o expirado" });
      }

      console.log(`[AUTH SUCCESS] Token verified for ${req.originalUrl}:`, {
        userId: (decoded as any)?.id,
        rol: (decoded as any)?.rol
      });

      // Añadir el usuario decodificado a la request
      (req as any).user = decoded;
      next();
    });
  };

  // Middleware para verificar roles
  const checkRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Debe ser llamado después de verifyToken
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ message: "No autenticado" });
      }

      if (!roles.includes(user.rol)) {
        return res.status(403).json({ message: "No tiene permisos para esta acción" });
      }

      next();
    };
  };

  // Ruta de registro
  app.post("/api/register", async (req, res) => {
    try {
      // Validar datos de registro
      const validatedData = loginSchema
        .extend({
          nombreCompleto: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
          rol: z.enum(["admin", "docente", "padre", "alumno"], {
            errorMap: () => ({ message: "Rol inválido" }),
          }),
        })
        .parse(req.body);

      // Verificar si el correo ya existe
      const existingUser = await storage.getUserByEmail(validatedData.correo);
      if (existingUser) {
        return res.status(400).json({ message: "El correo electrónico ya está registrado" });
      }

      // Generar hash de la contraseña
      const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);
      
      // Crear el usuario con la contraseña cifrada
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        activo: true,
      });

      // Eliminar la contraseña del objeto de respuesta
      const { password, ...userWithoutPassword } = newUser;

      // Generar token JWT
      const token = jwt.sign(
        {
          id: userWithoutPassword.id,
          correo: userWithoutPassword.correo,
          rol: userWithoutPassword.rol,
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRES_IN }
      );

      // Responder con el usuario y el token
      res.status(201).json({
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Datos de registro inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error al registrar el usuario", error });
      }
    }
  });

  // Ruta de login
  app.post("/api/login", async (req, res) => {
    try {
      // Validar datos de login
      const validatedData = loginSchema.parse(req.body);

      // Buscar el usuario por correo
      const user = await storage.getUserByEmail(validatedData.correo);
      if (!user) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      // Verificar la contraseña con bcrypt
      console.log(`Intento de login para: ${validatedData.correo}`);
      console.log(`Contraseña recibida: ${validatedData.password}`);
      console.log(`Hash almacenado: ${user.password}`);
      
      const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
      console.log(`Resultado de la comparación: ${passwordMatch}`);
      
      if (!passwordMatch) {
        console.log(`Contraseña incorrecta para: ${validatedData.correo}`);
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      console.log(`Login exitoso para: ${validatedData.correo}`);

      // Verificar si el usuario está activo
      if (!user.activo) {
        return res.status(403).json({ message: "Usuario desactivado" });
      }

      // Eliminar la contraseña del objeto de respuesta
      const { password, ...userWithoutPasswordOriginal } = user;
      
      // Crear una copia mutable del objeto usuario
      let userWithoutPassword = { ...userWithoutPasswordOriginal };

      // Generar token JWT con información adicional para docentes
      let tokenPayload: any = {
        id: userWithoutPassword.id,
        correo: userWithoutPassword.correo,
        rol: userWithoutPassword.rol,
      };

      // Añadir el ID del profesor si el usuario es un docente
      if (userWithoutPassword.rol === 'docente') {
        try {
          const profesorId = await storage.getProfesorIdByUserId(userWithoutPassword.id);
          if (profesorId) {
            console.log(`Añadiendo profesorId: ${profesorId} al token para usuario: ${userWithoutPassword.id}`);
            // Agregar profesorId directamente al objeto tokenPayload
            tokenPayload.profesorId = profesorId;
            
            // También añadimos el ID del profesor a la respuesta del usuario
            userWithoutPassword.profesorId = profesorId;
          }
        } catch (err) {
          console.error("Error al obtener ID de profesor para token:", err);
        }
      }

      const token = jwt.sign(
        tokenPayload,
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRES_IN }
      );

      // Responder con el usuario y el token
      res.json({
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Datos de login inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error al iniciar sesión", error });
      }
    }
  });

  // Ruta para obtener información del usuario actual
  // Añadir el middleware de recordatorios de pagos para administradores
  app.get("/api/me", verifyToken, processRemindersOnAdminLogin, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Eliminar la contraseña del objeto de respuesta
      const { password, ...userWithoutPassword } = user;
      
      let userData = userWithoutPassword;
      
      // Si el usuario es un docente, obtener su ID de profesor
      if (user.rol === 'docente') {
        try {
          const profesorId = await storage.getProfesorIdByUserId(userId);
          if (profesorId) {
            console.log(`Añadiendo profesorId: ${profesorId} a la respuesta /api/me para usuario: ${userId}`);
            userData = { ...userData, profesorId };
          } else {
            console.log(`No se encontró profesorId para el usuario docente: ${userId}`);
          }
        } catch (err) {
          console.error("Error al obtener ID de profesor para usuario", userId, ":", err);
        }
      }

      res.json(userData);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la información del usuario", error });
    }
  });

  // Ruta para listar usuarios (solo administradores)
  app.get("/api/users", verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const users = await storage.getUsers();

      // Eliminar las contraseñas de los objetos de respuesta
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);

      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la lista de usuarios", error });
    }
  });

  // Ruta para obtener un usuario específico
  app.get("/api/users/:id", verifyToken, async (req, res) => {
    try {
      const userId = req.params.id;
      const requestingUserId = (req as any).user.id;
      const requestingUserRole = (req as any).user.rol;

      // Solo permitir acceso si es el mismo usuario o un administrador
      if (userId !== requestingUserId && requestingUserRole !== "admin") {
        return res.status(403).json({ message: "No tiene permisos para ver este usuario" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Eliminar la contraseña del objeto de respuesta
      const { password, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el usuario", error });
    }
  });

  // Ruta para actualizar un usuario
  app.put("/api/users/:id", verifyToken, async (req, res) => {
    try {
      const userId = req.params.id;
      const requestingUserId = (req as any).user.id;
      const requestingUserRole = (req as any).user.rol;

      // Solo permitir actualización si es el mismo usuario o un administrador
      if (userId !== requestingUserId && requestingUserRole !== "admin") {
        return res.status(403).json({ message: "No tiene permisos para actualizar este usuario" });
      }

      // No permitir cambio de rol excepto para administradores
      if (req.body.rol && requestingUserRole !== "admin") {
        return res.status(403).json({ message: "No tiene permisos para cambiar el rol" });
      }
      
      // Si se está actualizando la contraseña, cifrarla primero
      let updatedData = { ...req.body };
      if (updatedData.password) {
        updatedData.password = await bcrypt.hash(updatedData.password, SALT_ROUNDS);
      }

      const updatedUser = await storage.updateUser(userId, updatedData);

      if (!updatedUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Eliminar la contraseña del objeto de respuesta
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar el usuario", error });
    }
  });

  // Ruta para desactivar un usuario (soft delete)
  app.delete("/api/users/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Soft delete: actualizar el campo 'activo' a false
      await storage.updateUser(userId, { activo: false });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al desactivar el usuario", error });
    }
  });

  // Ruta para crear relación padre-alumno
  app.post("/api/parent-student-relations", verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const { padreId, alumnoId } = req.body;

      // Verificar que el usuario padre exista y sea de rol 'padre'
      const parent = await storage.getUser(padreId);
      if (!parent || parent.rol !== "padre") {
        return res.status(400).json({ message: "Usuario padre no válido" });
      }

      // Verificar que el estudiante exista
      const student = await storage.getStudent(alumnoId);
      if (!student) {
        return res.status(400).json({ message: "Estudiante no encontrado" });
      }

      // Verificar que la relación no exista ya
      const existingRelations = await storage.getRelationsByParent(padreId);
      const alreadyExists = existingRelations.some(rel => rel.alumnoId === alumnoId);

      if (alreadyExists) {
        return res.status(400).json({ message: "Esta relación padre-alumno ya existe" });
      }

      // Crear la relación
      const relation = await storage.createParentStudentRelation({ padreId, alumnoId });

      res.status(201).json(relation);
    } catch (error) {
      res.status(500).json({ message: "Error al crear la relación padre-alumno", error });
    }
  });

  // Ruta para obtener estudiantes asociados a un padre
  app.get("/api/parents/:id/students", verifyToken, async (req, res) => {
    try {
      const parentId = req.params.id;
      const requestingUserId = (req as any).user.id;
      const requestingUserRole = (req as any).user.rol;

      // Solo permitir acceso si es el mismo usuario padre o un administrador
      if (parentId !== requestingUserId && requestingUserRole !== "admin") {
        return res.status(403).json({ message: "No tiene permisos para ver estos estudiantes" });
      }

      // Obtener todas las relaciones del padre
      const relations = await storage.getRelationsByParent(parentId);
      
      // Obtener los datos completos de cada estudiante
      const studentsPromises = relations.map(relation => 
        storage.getStudent(relation.alumnoId)
      );
      
      const students = (await Promise.all(studentsPromises)).filter(Boolean);

      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener los estudiantes del padre", error });
    }
  });

  // Ruta para eliminar relación padre-alumno
  app.delete("/api/parent-student-relations/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
    try {
      const relationId = req.params.id;
      const deleted = await storage.deleteParentStudentRelation(relationId);

      if (!deleted) {
        return res.status(404).json({ message: "Relación no encontrada" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la relación padre-alumno", error });
    }
  });

  // Exportar middlewares para su uso en otras rutas
  return { verifyToken, checkRole };
}