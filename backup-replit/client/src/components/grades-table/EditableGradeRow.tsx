import { useState, useEffect } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Student, Grade } from "@shared/schema";
import { MessageSquare } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EditableGradeRowProps {
  student: Student;
  grades: Record<string, { valor: number | null; comentario?: string | null }>;
  categories: string[];
  onGradeChange: (studentId: number, category: string, value: number | null, comentario?: string | null) => void;
  dirtyFields: Set<string>;
  setDirtyFields: (fields: Set<string>) => void;
}

export default function EditableGradeRow({
  student,
  grades,
  categories,
  onGradeChange,
  dirtyFields,
  setDirtyFields
}: EditableGradeRowProps) {
  const [localGrades, setLocalGrades] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(grades).map(([key, gradeData]) => [
        key, 
        gradeData.valor !== null ? gradeData.valor.toString() : ""
      ])
    )
  );
  
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(grades).map(([key, gradeData]) => [
        key, 
        gradeData.comentario !== null && gradeData.comentario !== undefined ? gradeData.comentario : ""
      ])
    )
  );
  
  // Calculate average grade
  const gradesArray = Object.values(grades)
    .map(gradeData => gradeData.valor)
    .filter(val => val !== null) as number[];
  
  const average = gradesArray.length > 0 
    ? gradesArray.reduce((sum, val) => sum + val, 0) / gradesArray.length 
    : null;

  // Handle input change for grade value
  const handleInputChange = (category: string, value: string) => {
    setLocalGrades(prev => ({ ...prev, [category]: value }));
    
    // Mark field as dirty
    const fieldId = `${student.id}-${category}`;
    const newDirtyFields = new Set(dirtyFields);
    newDirtyFields.add(fieldId);
    setDirtyFields(newDirtyFields);
    
    // Update parent component with numeric value
    const numericValue = value.trim() === "" ? null : Number(value);
    if (value === "" || (!isNaN(numericValue as number) && (numericValue as number) >= 0 && (numericValue as number) <= 10)) {
      onGradeChange(
        student.id, 
        category, 
        numericValue, 
        comments[category] || null
      );
    }
  };
  
  // Handle change for comment text
  const handleCommentChange = (category: string, comment: string) => {
    setComments(prev => ({ ...prev, [category]: comment }));
    
    // Mark field as dirty
    const fieldId = `${student.id}-${category}`;
    const newDirtyFields = new Set(dirtyFields);
    newDirtyFields.add(fieldId);
    setDirtyFields(newDirtyFields);
    
    // Get current grade value
    const gradeValue = localGrades[category]?.trim() === "" 
      ? null 
      : Number(localGrades[category]);
    
    // Update parent component with proper type casting for null values
    if (gradeValue === null || (!isNaN(gradeValue as number) && (gradeValue as number) >= 0 && (gradeValue as number) <= 10)) {
      onGradeChange(student.id, category, gradeValue, comment || null);
    }
  };

  // Validate the input
  const isValidGrade = (value: string): boolean => {
    if (value.trim() === "") return true;
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 10;
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{student.nombreCompleto}</TableCell>
      
      {categories.map(category => {
        const value = localGrades[category] || "";
        const comment = comments[category] || "";
        const fieldId = `${student.id}-${category}`;
        const isDirty = dirtyFields.has(fieldId);
        const isValid = isValidGrade(value);

        return (
          <TableCell key={category} className="relative">
            <div className="flex items-center gap-2">
              <Input
                value={value}
                onChange={(e) => handleInputChange(category, e.target.value)}
                className={`w-20 text-center ${isDirty ? "border-amber-500" : ""} ${!isValid ? "border-red-500" : ""}`}
                type="text"
                inputMode="decimal"
                placeholder="—"
              />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 rounded-full ${comment ? 'text-blue-500' : 'text-gray-400'}`}
                    title={comment ? "Ver/editar comentario" : "Agregar comentario"}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Comentario para {category}</h4>
                    <p className="text-sm text-muted-foreground">
                      Agrega un comentario o retroalimentación para esta calificación
                    </p>
                    <Textarea
                      className="min-h-[80px]"
                      placeholder="Escribe un comentario (máximo 300 caracteres)"
                      value={comment}
                      onChange={(e) => handleCommentChange(category, e.target.value)}
                      maxLength={300}
                    />
                    <div className="text-xs text-right text-muted-foreground">
                      {comment.length}/300 caracteres
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </TableCell>
        );
      })}
      
      <TableCell>
        {average !== null ? (
          <Badge 
            className={`font-bold ${average >= 7 ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}
          >
            {average.toFixed(1)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}