// Funciones de utilidad para formatear fechas en español

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const DAYS_ES = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
];

const SHORT_DAYS_ES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Formatea una fecha al formato dd/mm/yyyy
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formatea una fecha en formato largo (ej: "lunes, 6 de septiembre de 2023")
 */
export function formatLongDate(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = MONTHS_ES[d.getMonth()];
  const year = d.getFullYear();
  const weekday = DAYS_ES[d.getDay()];
  
  return `${weekday}, ${day} de ${month} de ${year}`;
}

/**
 * Obtiene el nombre del mes en español
 */
export function getMonthName(month: number): string {
  return MONTHS_ES[month];
}

/**
 * Obtiene los nombres cortos de los días de la semana
 */
export function getShortDays(): string[] {
  return SHORT_DAYS_ES;
}

/**
 * Obtiene la fecha actual en formato ISO para inputs de tipo date
 */
export function getCurrentDateForInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene un array con los días del mes actual para mostrar en el calendario
 */
export function getCalendarDays(year: number, month: number): { date: number, currentMonth: boolean }[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Día de la semana del primer día del mes (0 = domingo, 6 = sábado)
  const firstDayWeekday = firstDayOfMonth.getDay();
  
  // Días del mes anterior para completar la primera semana
  const previousMonthDays = [];
  if (firstDayWeekday > 0) {
    const lastDayPrevMonth = new Date(year, month, 0).getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      previousMonthDays.push({
        date: lastDayPrevMonth - i,
        currentMonth: false
      });
    }
  }
  
  // Días del mes actual
  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push({
      date: i,
      currentMonth: true
    });
  }
  
  // Días del mes siguiente para completar la última semana
  const nextMonthDays = [];
  const totalDaysShown = previousMonthDays.length + currentMonthDays.length;
  const remainingDays = 42 - totalDaysShown; // 6 semanas x 7 días = 42
  
  for (let i = 1; i <= remainingDays; i++) {
    nextMonthDays.push({
      date: i,
      currentMonth: false
    });
  }
  
  return [...previousMonthDays, ...currentMonthDays, ...nextMonthDays];
}
