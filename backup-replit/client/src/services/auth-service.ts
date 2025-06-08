/**
 * Servicio para manejar la autenticación y el almacenamiento/recuperación del token JWT
 */

export const AUTH_TOKEN_KEY = "auth_token";

/**
 * Establece el token JWT en localStorage
 * @param token - El token JWT a almacenar
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  // También almacenamos la fecha y hora cuando se guardó el token
  localStorage.setItem(`${AUTH_TOKEN_KEY}_timestamp`, Date.now().toString());
};

/**
 * Elimina el token JWT de localStorage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(`${AUTH_TOKEN_KEY}_timestamp`);
};

/**
 * Obtiene el token JWT de localStorage
 * @returns El token JWT almacenado, o null si no hay token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * Verifica si hay un token JWT almacenado
 * @returns true si hay token almacenado, false en caso contrario
 */
export const hasAuthToken = (): boolean => {
  return !!getAuthToken();
};

/**
 * Verifica si el token JWT está potencialmente expirado basado en su tiempo de almacenamiento
 * @param maxAgeInMinutes - Edad máxima del token en minutos
 * @returns true si el token está potencialmente expirado, false en caso contrario
 */
export const isTokenPotentiallyExpired = (maxAgeInMinutes = 60): boolean => {
  const timestamp = localStorage.getItem(`${AUTH_TOKEN_KEY}_timestamp`);
  
  if (!timestamp) {
    return true;
  }
  
  const tokenTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  const maxAgeInMs = maxAgeInMinutes * 60 * 1000;
  
  return currentTime - tokenTime > maxAgeInMs;
};

/**
 * Crea los headers de autorización necesarios para las solicitudes HTTP
 * @param includeContentType - Si se debe incluir el header Content-Type: application/json
 * @returns Un objeto con los headers necesarios
 */
export const createAuthHeaders = (includeContentType = false): HeadersInit => {
  const headers: HeadersInit = includeContentType 
    ? { "Content-Type": "application/json" } 
    : {};
  
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
};