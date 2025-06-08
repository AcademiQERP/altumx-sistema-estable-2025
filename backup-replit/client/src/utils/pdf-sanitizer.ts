/**
 * Utilidad para sanitizar texto para PDFs
 * Reemplaza emojis con caracteres compatibles preservando acentos y caracteres especiales del español
 */

/**
 * Sanitiza texto para hacerlo compatible con PDF, reemplazando únicamente emojis y caracteres no imprimibles
 * @param text Texto a sanitizar
 * @returns Texto sanitizado compatible con PDF
 */
export function sanitizeTextForPDF(text: string): string {
  if (!text) return '';
  
  // Primero, reemplazar emojis conocidos por símbolos compatibles
  let sanitized = text
    .replace(/🌟/g, '★') // Estrella
    .replace(/⭐/g, '★') // Estrella alternativa
    .replace(/⚡/g, '▲') // Triángulo
    .replace(/📊/g, '■') // Cuadrado
    .replace(/📝/g, '✎') // Lápiz
    .replace(/🚀/g, '➔') // Flecha
    .replace(/📋/g, '✓') // Check
    .replace(/✅/g, '✓') // Check
    .replace(/🔴/g, '●') // Círculo
    .replace(/📌/g, '•') // Punto
    .replace(/👉/g, '→') // Flecha derecha
    .replace(/🔍/g, '○') // Círculo vacío
    .replace(/📢/g, '!') // Exclamación
    .replace(/⏰/g, '*') // Asterisco
    // Otros emojis comunes
    .replace(/😊/g, ':)') // Sonrisa
    .replace(/👍/g, '+') // Pulgar arriba
    .replace(/💯/g, '100') // 100 puntos
    .replace(/💪/g, '+') // Fuerza
    .replace(/🎯/g, 'o') // Diana
    .replace(/🏆/g, '#1') // Trofeo
    .replace(/📚/g, 'Lib') // Libros
    .replace(/✨/g, '*') // Destellos
    .replace(/💡/g, 'i') // Idea
    .replace(/📈/g, '/\\') // Gráfica ascendente
    .replace(/❤️/g, '<3'); // Corazón
    
  // Conservamos caracteres latinos y acentos, solo eliminamos emojis y caracteres realmente problemáticos
  // Usamos una solución compatible con entornos sin soporte para propiedades unicode \p{}
  const latinChars = 'A-Za-zÀ-ÖØ-öø-ÿ';
  const numbers = '0-9';
  const punctuation = '.,:;\'\"!¡?¿()[\\]{}\\\/\\<>%&$#@=+\\-_*';
  const whitespace = '\\s\\t\\n\\r';
  
  sanitized = sanitized.replace(new RegExp(`[^${latinChars}${numbers}${punctuation}${whitespace}]`, 'g'), ' ');
  
  // Limpieza final para evitar espacios múltiples
  return sanitized.replace(/\s+/g, ' ').trim();
}
