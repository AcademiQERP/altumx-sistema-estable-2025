/**
 * Utility functions for safe grade calculation and validation
 * Prevents NaN values from appearing in the UI
 */

/**
 * Safely formats a grade value to prevent NaN display
 * @param value - The grade value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted grade string or fallback message
 */
export function safeGradeFormat(value: number | null | undefined, decimals: number = 1): string {
  // Check if value is null, undefined, or NaN
  if (value === null || value === undefined || isNaN(value)) {
    return "–";
  }
  
  // Check if value is a valid number
  if (typeof value !== 'number' || !isFinite(value)) {
    return "–";
  }
  
  // Ensure value is within reasonable range for grades (0-10)
  if (value < 0 || value > 10) {
    return "–";
  }
  
  return value.toFixed(decimals);
}

/**
 * Safely calculates the average of an array of grades
 * @param grades - Array of grade values
 * @returns Average value or null if no valid grades
 */
export function safeAverageCalculation(grades: (number | null | undefined)[]): number | null {
  // Filter out invalid values
  const validGrades = grades.filter(grade => 
    grade !== null && 
    grade !== undefined && 
    !isNaN(grade) && 
    isFinite(grade) && 
    grade >= 0 && 
    grade <= 10
  ) as number[];
  
  // Return null if no valid grades
  if (validGrades.length === 0) {
    return null;
  }
  
  // Calculate average
  const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
  return sum / validGrades.length;
}

/**
 * Gets display text for missing grade data
 * @param context - Context for the missing data (e.g., "subject", "period")
 * @returns Appropriate message for missing data
 */
export function getMissingGradeText(context: string = "calificaciones"): string {
  return `Sin ${context} registradas`;
}

/**
 * Validates if a period has valid grade data
 * @param period - Period object with average property
 * @returns Boolean indicating if period has valid data
 */
export function isValidPeriod(period: { average?: number | null }): boolean {
  return period.average !== null && 
         period.average !== undefined && 
         !isNaN(period.average) && 
         isFinite(period.average) && 
         period.average >= 0 && 
         period.average <= 10;
}