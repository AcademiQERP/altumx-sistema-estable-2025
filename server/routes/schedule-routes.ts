import express from "express";
import { storage } from "../storage";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// Clave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || "edumex_secret_key";

// Middleware para verificar JWT
const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  // Obtener el token del header Authorization
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "No se proporcionó un token de autenticación" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido o expirado" });
    }

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
      return res.status(403).json({ message: "Acceso denegado" });
    }

    next();
  };
};

const router = express.Router();

// Ruta GET para obtener todos los horarios de un grupo con detalles completos
router.get("/:id/schedules", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { day } = req.query;
    const groupId = Number(id);
    
    if (isNaN(groupId)) {
      return res.status(400).json({ message: "ID de grupo inválido" });
    }
    
    // Obtener los detalles completos de los horarios
    let scheduleDetails = await storage.getScheduleDetails();
    
    // Filtrar por grupo
    scheduleDetails = scheduleDetails.filter(schedule => schedule.grupoId === groupId);
    
    // Filtrar por día si se especifica
    if (day && typeof day === 'string') {
      scheduleDetails = scheduleDetails.filter(schedule => 
        schedule.diaSemana.toLowerCase() === day.toLowerCase()
      );
    }
    
    // Convertir campos null a valores predeterminados para evitar problemas en el frontend
    const processedSchedules = scheduleDetails.map(schedule => ({
      ...schedule,
      // Asegurar que siempre haya valores para estos campos
      materiaNombre: schedule.materiaNombre || "Clase sin nombre",
      profesorNombre: schedule.profesorNombre || "Profesor no asignado",
      modo: schedule.modo || "Sin modalidad"
    }));
    
    console.log(`Devolviendo ${processedSchedules.length} horarios para el grupo ${groupId}`);
    
    res.json(processedSchedules);
  } catch (error) {
    console.error("Error al obtener horarios:", error);
    res.status(500).json({ message: "Error al obtener horarios del grupo" });
  }
});

// Ruta POST para crear un horario para un grupo
router.post("/:id/schedules", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) {
      return res.status(400).json({ message: "ID de grupo inválido" });
    }
    
    // Asegurarse de que el grupo exista
    const group = await storage.getGroup(groupId);
    if (!group) {
      return res.status(404).json({ message: "Grupo no encontrado" });
    }
    
    // Validar datos mínimos requeridos
    const { diaSemana, horaInicio, horaFin, materiaId, profesorId } = req.body;
    if (!diaSemana || !horaInicio || !horaFin || !materiaId || !profesorId) {
      return res.status(400).json({ message: "Faltan campos requeridos para crear el horario" });
    }
    
    // Validar que no haya superposición de horarios
    const existingSchedules = await storage.getSchedulesByGroup(groupId);
    
    // Función auxiliar para convertir hora (HH:MM) a minutos desde las 00:00
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const newStartMinutes = timeToMinutes(horaInicio);
    const newEndMinutes = timeToMinutes(horaFin);
    
    const isOverlapping = existingSchedules.some(schedule => {
      // Solo verificar en el mismo día
      if (schedule.diaSemana.toLowerCase() !== diaSemana.toLowerCase()) {
        return false;
      }
      
      const existingStartMinutes = timeToMinutes(schedule.horaInicio);
      const existingEndMinutes = timeToMinutes(schedule.horaFin);
      
      // Verificar superposición real (permite bloques contiguos)
      // La condición correcta para superposición es: newStart < existingEnd && newEnd > existingStart
      return (
        newStartMinutes < existingEndMinutes && 
        newEndMinutes > existingStartMinutes
      );
    });
    
    if (isOverlapping) {
      return res.status(400).json({ 
        message: "El horario se superpone con otra clase existente" 
      });
    }
    
    // Crear el nuevo horario
    const scheduleData = {
      ...req.body,
      grupoId: groupId,
      estatus: "Activo"
    };
    
    const newSchedule = await storage.createSchedule(scheduleData);
    
    res.status(201).json(newSchedule);
  } catch (error) {
    console.error("Error al crear horario:", error);
    res.status(500).json({ message: "Error al crear horario para el grupo" });
  }
});

// Ruta PUT para actualizar un horario
router.put("/:groupId/schedules/:scheduleId", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const scheduleId = parseInt(req.params.scheduleId);
    
    if (isNaN(groupId) || isNaN(scheduleId)) {
      return res.status(400).json({ message: "ID de grupo o horario inválido" });
    }
    
    console.log(`Actualizando horario: groupId=${groupId}, scheduleId=${scheduleId}, body=`, req.body);
    
    // Verificar que el horario exista - CORREGIDO: Cambiado a getSchedule
    const existingSchedule = await storage.getSchedule(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({ message: "Horario no encontrado" });
    }
    
    // Verificar que el horario pertenezca al grupo
    if (existingSchedule.grupoId !== groupId) {
      return res.status(403).json({ 
        message: "El horario no pertenece al grupo especificado" 
      });
    }
    
    // Validar datos mínimos requeridos
    const { diaSemana, horaInicio, horaFin, materiaId, profesorId } = req.body;
    if (!diaSemana || !horaInicio || !horaFin || !materiaId || !profesorId) {
      return res.status(400).json({ message: "Faltan campos requeridos para actualizar el horario" });
    }
    
    // Validar que no haya superposición de horarios (excluyendo el horario actual)
    const existingSchedules = await storage.getSchedulesByGroup(groupId);
    
    // Función auxiliar para convertir hora (HH:MM) a minutos desde las 00:00
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const newStartMinutes = timeToMinutes(horaInicio);
    const newEndMinutes = timeToMinutes(horaFin);
    
    const isOverlapping = existingSchedules.some(schedule => {
      // Excluir el horario que estamos actualizando
      if (schedule.id === scheduleId) return false;
      
      // Solo verificar en el mismo día
      if (schedule.diaSemana.toLowerCase() !== diaSemana.toLowerCase()) {
        return false;
      }
      
      const existingStartMinutes = timeToMinutes(schedule.horaInicio);
      const existingEndMinutes = timeToMinutes(schedule.horaFin);
      
      // Verificar superposición real (permite bloques contiguos)
      // La condición correcta para superposición es: newStart < existingEnd && newEnd > existingStart
      return (
        newStartMinutes < existingEndMinutes && 
        newEndMinutes > existingStartMinutes
      );
    });
    
    if (isOverlapping) {
      return res.status(400).json({ 
        message: "El horario se superpone con otra clase existente" 
      });
    }
    
    // Actualizar el horario
    const scheduleData = {
      ...req.body,
      id: scheduleId,
      grupoId: groupId,
      estatus: "Activo"
    };
    
    console.log("Datos a actualizar:", scheduleData);
    
    const updatedSchedule = await storage.updateSchedule(scheduleId, scheduleData);
    
    if (!updatedSchedule) {
      return res.status(500).json({ message: "No se pudo actualizar el horario" });
    }
    
    res.json({
      message: "Horario actualizado exitosamente",
      data: updatedSchedule
    });
  } catch (error) {
    console.error("Error al actualizar horario:", error);
    res.status(500).json({ message: "Error al actualizar el horario", error: error.message });
  }
});

// Ruta DELETE para eliminar un horario
router.delete("/:groupId/schedules/:scheduleId", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const scheduleId = parseInt(req.params.scheduleId);
    
    if (isNaN(groupId) || isNaN(scheduleId)) {
      return res.status(400).json({ message: "ID de grupo o horario inválido" });
    }
    
    // Verificar que el horario exista - CORREGIDO: Cambiado a getSchedule
    const existingSchedule = await storage.getSchedule(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({ message: "Horario no encontrado" });
    }
    
    // Verificar que el horario pertenezca al grupo
    if (existingSchedule.grupoId !== groupId) {
      return res.status(403).json({ 
        message: "El horario no pertenece al grupo especificado" 
      });
    }
    
    // Eliminar el horario
    await storage.deleteSchedule(scheduleId);
    
    res.json({ message: "Horario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar horario:", error);
    res.status(500).json({ message: "Error al eliminar el horario" });
  }
});

export default router;