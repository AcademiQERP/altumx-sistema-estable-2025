import express from "express";
import { storage } from "../storage";
import { verifyToken, checkRole } from "../middleware/auth";
import { 
  checkGroupDependencies, 
  getDetailedGroupDependencies, 
  cleanupGroupDependencies, 
  canDeleteGroup,
  type CleanupOptions
} from "../services/dependency-checker";

// Crear el router
const router = express.Router();

// Middleware para verificar rol de administrador
const isAdmin = checkRole(["admin"]);

/**
 * Ruta para verificar las dependencias de un grupo
 * GET /api/group-cleanup/:id/dependencies
 */
router.get("/:id/dependencies", async (req, res) => {
  // Log para depuración
  console.log("Headers de autorización:", req.headers.authorization);
  console.log("Accediendo a ruta de dependencias para grupo ID:", req.params.id);
  
  try {
    const groupId = parseInt(req.params.id);
    
    // Verificar que el grupo existe
    const group = await storage.getGroup(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: "Grupo no encontrado" 
      });
    }
    
    // Obtener resumen de dependencias
    const dependencies = await checkGroupDependencies(groupId);
    
    // Obtener detalle de dependencias solo si hay dependencias
    let detailedDependencies = null;
    if (dependencies.hasDependencies) {
      detailedDependencies = await getDetailedGroupDependencies(groupId);
    }
    
    // Verificar si se puede eliminar el grupo
    const deleteCheck = await canDeleteGroup(groupId);
    
    res.json({
      success: true,
      group,
      dependencies,
      detailedDependencies,
      canDelete: deleteCheck.canDelete,
      deleteReason: deleteCheck.reason
    });
  } catch (error) {
    console.error("Error al verificar dependencias del grupo:", error);
    res.status(500).json({
      success: false,
      message: "Error al verificar dependencias del grupo",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Ruta para obtener todos los grupos disponibles (para mover estudiantes)
 * GET /api/group-cleanup/available-groups?excludeId=1&level=Preparatoria
 */
router.get("/available-groups", isAdmin, async (req, res) => {
  // Log para depuración
  console.log("Headers de autorización en available-groups:", req.headers.authorization);
  try {
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : undefined;
    const level = req.query.level as string | undefined;
    
    // Obtener todos los grupos
    let groups = await storage.getGroups();
    
    // Filtrar grupos si es necesario
    if (excludeId) {
      groups = groups.filter(group => group.id !== excludeId);
    }
    
    if (level) {
      groups = groups.filter(group => group.nivel === level);
    }
    
    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error("Error al obtener grupos disponibles:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener grupos disponibles",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Ruta para ejecutar la limpieza de un grupo
 * POST /api/group-cleanup/:id/cleanup
 */
router.post("/:id/cleanup", isAdmin, async (req, res) => {
  // Log para depuración
  console.log("Headers de autorización en cleanup:", req.headers.authorization);
  try {
    const groupId = parseInt(req.params.id);
    const options: CleanupOptions = req.body;
    
    // Verificar que el grupo existe
    const group = await storage.getGroup(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: "Grupo no encontrado" 
      });
    }
    
    // Si se especificó un grupo para mover estudiantes, verificar que existe
    if (options.moveStudentsToGroupId) {
      const targetGroup = await storage.getGroup(options.moveStudentsToGroupId);
      if (!targetGroup) {
        return res.status(404).json({ 
          success: false,
          message: "El grupo de destino para mover estudiantes no existe" 
        });
      }
    }
    
    // Ejecutar limpieza
    const cleanupResult = await cleanupGroupDependencies(groupId, options);
    
    // Verificar si el grupo puede ser eliminado después de la limpieza
    let canDeleteAfterCleanup = null;
    if (cleanupResult.success) {
      canDeleteAfterCleanup = await canDeleteGroup(groupId);
    }
    
    res.json({
      ...cleanupResult,
      canDeleteAfterCleanup: canDeleteAfterCleanup ? canDeleteAfterCleanup.canDelete : false,
      deleteReason: canDeleteAfterCleanup ? canDeleteAfterCleanup.reason : null
    });
  } catch (error) {
    console.error("Error al realizar limpieza del grupo:", error);
    res.status(500).json({
      success: false,
      message: "Error al realizar limpieza del grupo",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Ruta para archivar un grupo (alternativa a eliminar)
 * POST /api/group-cleanup/:id/archive
 */
router.post("/:id/archive", isAdmin, async (req, res) => {
  // Log para depuración
  console.log("Headers de autorización en archive:", req.headers.authorization);
  try {
    const groupId = parseInt(req.params.id);
    
    // Verificar que el grupo existe
    const group = await storage.getGroup(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: "Grupo no encontrado" 
      });
    }
    
    // Ejecutar la actualización del estado
    const cleanupResult = await cleanupGroupDependencies(groupId, { archiveGroup: true });
    
    res.json({
      ...cleanupResult,
      group: {
        ...group,
        estado: 'archivado'
      }
    });
  } catch (error) {
    console.error("Error al archivar el grupo:", error);
    res.status(500).json({
      success: false,
      message: "Error al archivar el grupo",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;