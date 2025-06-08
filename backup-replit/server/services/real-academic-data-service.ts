/**
 * Real Academic Data Service
 * Retrieves actual student grades and academic data from the database
 */

import { db } from "../db";
import { grades, students, subjects } from "../../shared/schema";
import { eq } from "drizzle-orm";

export interface StudentGradeData {
  subjectName: string;
  grades: Array<{
    criteria: string;
    value: number;
    comment?: string;
  }>;
  average: number;
}

export interface RealAcademicData {
  studentId: number;
  studentName: string;
  period: string;
  overallAverage: number;
  subjectGrades: StudentGradeData[];
  totalGrades: number;
}

/**
 * Calculates the real academic performance for a student
 */
export async function getRealAcademicData(studentId: number, period?: string): Promise<RealAcademicData> {
  // Get student information
  const [student] = await db.select().from(students).where(eq(students.id, studentId));
  
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  // Get all grades for the student
  const studentGrades = await db.select({
    gradeId: grades.id,
    subjectId: grades.materiaId,
    criteria: grades.rubro,
    value: grades.valor,
    period: grades.periodo,
    comment: grades.comentario
  })
  .from(grades)
  .where(eq(grades.alumnoId, studentId));

  // Get subject information
  const allSubjects = await db.select().from(subjects);
  const subjectMap = new Map(allSubjects.map(s => [s.id, s.nombre]));

  // Group grades by subject
  const gradesBySubject = new Map<number, Array<{
    criteria: string;
    value: number;
    comment?: string;
  }>>();

  let totalSum = 0;
  let totalCount = 0;

  studentGrades.forEach(grade => {
    const subjectId = grade.subjectId;
    const gradeValue = parseFloat(grade.value);
    
    if (!gradesBySubject.has(subjectId)) {
      gradesBySubject.set(subjectId, []);
    }
    
    gradesBySubject.get(subjectId)!.push({
      criteria: grade.criteria,
      value: gradeValue,
      comment: grade.comment || undefined
    });
    
    totalSum += gradeValue;
    totalCount++;
  });

  // Calculate subject averages and build response
  const subjectGrades: StudentGradeData[] = [];
  
  gradesBySubject.forEach((gradeList, subjectId) => {
    const subjectName = subjectMap.get(subjectId) || `Materia ${subjectId}`;
    const subjectSum = gradeList.reduce((sum, g) => sum + g.value, 0);
    const subjectAverage = gradeList.length > 0 ? subjectSum / gradeList.length : 0;
    
    subjectGrades.push({
      subjectName,
      grades: gradeList,
      average: Math.round(subjectAverage * 10) / 10
    });
  });

  // Calculate overall average
  const overallAverage = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : 0;

  return {
    studentId,
    studentName: student.nombreCompleto,
    period: period || "Período Actual",
    overallAverage,
    subjectGrades,
    totalGrades: totalCount
  };
}

/**
 * Gets the most recent academic period for a student
 */
export async function getLatestPeriodForStudent(studentId: number): Promise<string | null> {
  const latestGrades = await db.select({
    period: grades.periodo
  })
  .from(grades)
  .where(eq(grades.alumnoId, studentId))
  .orderBy(grades.id)
  .limit(1);

  return latestGrades.length > 0 ? latestGrades[0].period : null;
}