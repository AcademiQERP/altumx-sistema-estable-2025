# Documentación Técnica: Asistente de Limpieza de Grupos

## Descripción General

El Asistente de Limpieza de Grupos es una herramienta implementada para gestionar de manera segura la eliminación de grupos escolares, considerando todas sus dependencias y relaciones con otras entidades del sistema educativo. Esta herramienta permite archivar grupos en lugar de eliminarlos cuando tienen datos históricos importantes que deben preservarse.

## Modificaciones en la Base de Datos

Se realizaron los siguientes cambios en el esquema de la base de datos:

1. **Tabla `grupos`**:
   - Se agregó el campo `estado` de tipo `text` con valores posibles "activo" (predeterminado) o "archivado".
   ```sql
   ALTER TABLE grupos ADD COLUMN estado text NOT NULL DEFAULT 'activo';
   ```

## Operaciones del Asistente de Limpieza

El Asistente de Limpieza realiza las siguientes verificaciones y operaciones:

1. **Verificación de Dependencias**:
   - Estudiantes vinculados al grupo
   - Profesores asignados al grupo
   - Materias asignadas al grupo
   - Horarios vinculados al grupo
   - Calificaciones asociadas con el grupo
   - Asistencias relacionadas con el grupo
   - Evaluaciones vinculadas al grupo
   - Observaciones registradas para el grupo

2. **Operaciones de Limpieza**:
   - **Mover estudiantes**: Transfiere estudiantes del grupo seleccionado a otro grupo destino.
   - **Desvincular materias**: Elimina la asociación entre materias y el grupo.
   - **Eliminar horarios**: Elimina todos los horarios asociados al grupo.
   - **Desvincular profesores**: Elimina la asociación entre profesores y el grupo.
   - **Archivar grupo**: Cambia el estado del grupo de "activo" a "archivado".

## Flujo de Trabajo

1. Al seleccionar un grupo, el Asistente verifica todas las dependencias.
2. Muestra las dependencias encontradas y ofrece opciones para resolverlas.
3. El usuario puede seleccionar qué operaciones realizar (mover estudiantes, desvincular materias, etc.).
4. El sistema ejecuta las operaciones seleccionadas de manera transaccional y segura.
5. Si hay datos históricos importantes (calificaciones, asistencias, etc.), se recomienda archivar el grupo en lugar de eliminarlo.
6. Los grupos archivados permanecen en la base de datos pero no aparecen por defecto en la lista principal.

## Interfaz de Usuario

La interfaz incluye:
- Listado de dependencias actuales
- Opciones para diferentes operaciones de limpieza
- Capacidad para seleccionar grupos destino para estudiantes
- Confirmación antes de cada operación
- Visualización de resultados y verificación

## Implementación Técnica

El Asistente utiliza las siguientes clases y componentes:

1. **Backend:**
   - `DependencyChecker`: Servicio para verificar dependencias del grupo.
   - `GroupCleanupRoutes`: Rutas para las operaciones de limpieza de grupos.
   - `DatabaseStorage`: Capa de abstracción para operaciones de base de datos.

2. **Frontend:**
   - `GroupCleanupAssistant`: Componente React para la interfaz del asistente.
   - Implementación del filtro para ocultar/mostrar grupos archivados.

## Restauración de Grupos Archivados

Para restaurar un grupo archivado, se debe:

1. Activar el filtro "Mostrar grupos archivados" en la lista de grupos.
2. Editar el grupo archivado.
3. Cambiar el campo "estado" de "archivado" a "activo".
4. Guardar los cambios.

Alternativamente, se puede ejecutar la siguiente consulta SQL:

```sql
UPDATE grupos SET estado = 'activo' WHERE id = [ID_DEL_GRUPO];
```

## Mejoras de Seguridad y Persistencia

- Se implementó un sistema de validación para verificar que los cambios se apliquen correctamente después de cada operación.
- Se mejoró el manejo de errores con mensajes específicos para cada tipo de problema.
- Se implementó logging detallado para facilitar la depuración y seguimiento de las operaciones.
- Se centralizó la autenticación a nivel de router para evitar problemas de validación de token.

## Consideraciones Importantes

- Los grupos archivados mantienen todas sus relaciones intactas en la base de datos.
- La función de archivado es una alternativa segura a la eliminación cuando hay datos históricos importantes.
- Por defecto, los grupos archivados no aparecen en la lista principal para mantener la interfaz limpia.
- El sistema proporciona una opción para mostrar grupos archivados cuando sea necesario.