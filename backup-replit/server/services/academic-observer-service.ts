import axios from 'axios';
import jwt from 'jsonwebtoken';

// URL base para la API de AcademicObserver
const AO_API_BASE_URL = process.env.AO_API_URL || 'http://localhost:5001/ao-api';
// Clave secreta para la autenticación entre servicios (debe coincidir con la de AcademicObserver)
const AO_API_SECRET = process.env.AO_API_SECRET || 'academic_observer_secret_key';

/**
 * Servicio para interactuar con el módulo AcademicObserver
 */
export class AcademicObserverService {
  private apiUrl: string;
  private apiSecret: string;

  constructor() {
    this.apiUrl = AO_API_BASE_URL;
    this.apiSecret = AO_API_SECRET;
    
    console.log(`[AcademicObserver] Inicializando servicio con URL base: ${this.apiUrl}`);
    
    // Verificamos que tengamos las variables de entorno necesarias
    if (!process.env.AO_API_SECRET) {
      console.warn('[AcademicObserver] ADVERTENCIA: AO_API_SECRET no está definido. Se usará una clave predeterminada para la autenticación entre servicios.');
    }
  }

  /**
   * Genera un token JWT para autenticar las solicitudes a la API de AcademicObserver
   */
  private generateServiceToken(): string {
    return jwt.sign(
      {
        service: 'altumx-sistema-estable-2025',
        timestamp: Date.now()
      },
      this.apiSecret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Configura los encabezados para las solicitudes a la API
   */
  private getHeaders(userToken?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Service-Token': this.generateServiceToken()
    };

    // Si se proporciona un token de usuario, lo incluimos para la trazabilidad
    if (userToken) {
      headers['X-User-Token'] = userToken;
    }

    return headers;
  }

  /**
   * Genera una nueva observación académica a través de la IA
   */
  async generarObservacion(data: {
    alumnoId: number,
    profesorId: string,
    materiaId: number,
    periodo: string,
    contexto?: string,
    temaId?: number
  }, userToken?: string) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/generar-observacion`,
        data,
        { headers: this.getHeaders(userToken) }
      );
      
      return response.data;
    } catch (error) {
      console.error('[AcademicObserver] Error al generar observación:', error);
      throw new Error(`Error al generar observación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene una observación académica por su ID
   */
  async getObservacion(id: string, userToken?: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/observaciones/${id}`,
        { headers: this.getHeaders(userToken) }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[AcademicObserver] Error al obtener observación ${id}:`, error);
      throw new Error(`Error al obtener observación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene la lista de subtemas disponibles para las observaciones
   */
  async getSubtemas(userToken?: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/subtemas`,
        { headers: this.getHeaders(userToken) }
      );
      
      return response.data;
    } catch (error) {
      console.error('[AcademicObserver] Error al obtener subtemas:', error);
      throw new Error(`Error al obtener subtemas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene estadísticas de uso del servicio AcademicObserver
   */
  async getEstadisticas(filtros?: {
    desde?: string,
    hasta?: string,
    profesorId?: string,
    alumnoId?: number,
    materiaId?: number
  }, userToken?: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/estadisticas`,
        { 
          params: filtros,
          headers: this.getHeaders(userToken)
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('[AcademicObserver] Error al obtener estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  /**
   * Obtiene la lista de observaciones para un alumno específico
   */
  async getObservacionesPorAlumno(alumnoId: number, userToken?: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/observaciones/alumno/${alumnoId}`,
        { headers: this.getHeaders(userToken) }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[AcademicObserver] Error al obtener observaciones para alumno ${alumnoId}:`, error);
      throw new Error(`Error al obtener observaciones del alumno: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  /**
   * Obtiene la lista de observaciones generadas por un profesor específico
   */
  async getObservacionesPorProfesor(profesorId: string, userToken?: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/observaciones/profesor/${profesorId}`,
        { headers: this.getHeaders(userToken) }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[AcademicObserver] Error al obtener observaciones del profesor ${profesorId}:`, error);
      throw new Error(`Error al obtener observaciones del profesor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene los datos de seguimiento grupal con filtros opcionales
   */
  async getSeguimientoGrupal(filtros?: {
    grupoId?: number,
    nivel?: string,
    periodo?: string,
    materiaId?: number
  }, userToken?: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/seguimiento-grupo`,
        { 
          params: filtros,
          headers: this.getHeaders(userToken)
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('[AcademicObserver] Error al obtener datos de seguimiento grupal:', error);
      throw new Error(`Error al obtener datos de seguimiento grupal: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  /**
   * Obtiene los subtemas evaluables para un alumno específico
   */
  async getSubtemasAlumno(alumnoId: number, userToken?: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/subtemas-alumno/${alumnoId}`,
        { headers: this.getHeaders(userToken) }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[AcademicObserver] Error al obtener subtemas para alumno ${alumnoId}:`, error);
      throw new Error(`Error al obtener subtemas evaluables del alumno: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  /**
   * Guarda la evaluación de un alumno
   */
  async guardarEvaluacion(alumnoId: number, subtemas: Array<{id: number, completado: boolean}>, userToken?: string) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/guardar-evaluacion/${alumnoId}`,
        { subtemas },
        { headers: this.getHeaders(userToken) }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[AcademicObserver] Error al guardar evaluación para alumno ${alumnoId}:`, error);
      throw new Error(`Error al guardar la evaluación del alumno: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene los datos completos de seguimiento para un alumno específico
   */
  async getSeguimientoAlumno(alumnoId: number, userToken?: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/seguimiento-alumno/${alumnoId}`,
        { headers: this.getHeaders(userToken) }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[AcademicObserver] Error al obtener seguimiento del alumno ${alumnoId}:`, error);
      throw new Error(`Error al obtener seguimiento del alumno: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}

// Exportamos una instancia del servicio para ser usada en toda la aplicación
export const academicObserverService = new AcademicObserverService();