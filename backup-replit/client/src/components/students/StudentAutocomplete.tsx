import { useState, useEffect } from 'react';
import Select from 'react-select';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, User, School } from 'lucide-react';
import { FormControl } from '@/components/ui/form';

// Definir la interfaz Student basada en el schema
interface Student {
  id: number;
  nombreCompleto: string;
  curp: string;
  fechaNacimiento: string;
  genero: string;
  grupoId: number;
  nivel: string;
  estatus: string;
}

interface StudentOption {
  value: string;
  label: string;
  group?: string;
  student: Student;
}

interface StudentAutocompleteProps {
  value?: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allStudents?: Student[];
}

const StudentAutocomplete = ({
  value,
  onChange,
  placeholder = 'Buscar estudiante...',
  disabled = false,
  className = '',
  allStudents
}: StudentAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<StudentOption | null>(null);

  // Convertir allStudents a opciones para el selector
  useEffect(() => {
    if (allStudents && Array.isArray(allStudents)) {
      const studentOptions = allStudents.map((student) => ({
        value: student.id.toString(),
        label: student.nombreCompleto,
        group: student.nivel || 'Sin grupo',
        student
      }));
      
      setOptions(studentOptions);
      
      // Si hay un valor seleccionado, buscarlo en las opciones
      if (value) {
        const selected = studentOptions.find(option => Number(option.value) === Number(value));
        if (selected) {
          setSelectedOption(selected);
        }
      } else {
        setSelectedOption(null);
      }
    }
  }, [allStudents, value]);

  // Función para filtrar las opciones basado en el texto de entrada
  const filterOptions = (inputValue: string) => {
    if (!inputValue || inputValue.length < 2) return [];
    
    const lowerInput = inputValue.toLowerCase();
    
    return options.filter(option => 
      option.label.toLowerCase().includes(lowerInput) ||
      (option.group && option.group.toLowerCase().includes(lowerInput))
    );
  };
  
  // Manejar el cambio de opción seleccionada
  const handleChange = (selected: StudentOption | null) => {
    setSelectedOption(selected);
    if (selected) {
      onChange(Number(selected.value));
    } else {
      onChange(0); // O el valor por defecto que prefieras
    }
  };

  return (
    <div className={className}>
      <FormControl>
        <Select
          inputValue={inputValue}
          onInputChange={(newValue) => setInputValue(newValue)}
          value={selectedOption}
          onChange={handleChange as any}
          options={filterOptions(inputValue)}
          isDisabled={disabled}
          placeholder={placeholder}
          isClearable
          classNamePrefix="react-select"
          className="react-select-container"
          formatOptionLabel={(option: StudentOption) => (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                <span>{option.label}</span>
              </div>
              {option.group && (
                <div className="text-xs text-gray-500 flex items-center">
                  <School className="h-3 w-3 mr-1" />
                  {option.group}
                </div>
              )}
            </div>
          )}
          noOptionsMessage={({ inputValue }) => 
            !inputValue || inputValue.length < 2 
              ? "Escribe al menos 2 caracteres para buscar"
              : "No se encontraron estudiantes"
          }
          components={{
            DropdownIndicator: () => (
              <div className="px-2 flex items-center text-gray-500">
                <ChevronsUpDown className="h-4 w-4" />
              </div>
            )
          }}
          styles={{
            control: (base) => ({
              ...base,
              minHeight: '40px',
              borderRadius: '0.375rem',
              borderColor: 'rgb(226, 232, 240)',
              '&:hover': {
                borderColor: 'rgb(148, 163, 184)'
              }
            }),
            menu: (base) => ({
              ...base,
              zIndex: 50,
              borderRadius: '0.375rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }),
            option: (base, { isFocused, isSelected }) => ({
              ...base,
              backgroundColor: isSelected 
                ? 'rgb(59, 130, 246)' 
                : isFocused 
                  ? 'rgba(59, 130, 246, 0.1)' 
                  : base.backgroundColor,
              color: isSelected ? 'white' : 'inherit',
              padding: '8px 12px',
              cursor: 'pointer'
            })
          }}
        />
      </FormControl>
    </div>
  );
};

export default StudentAutocomplete;