#!/bin/bash

# Crear usuario padre
echo "Creando usuario padre..."
PADRE_RESPONSE=$(curl -s -X POST http://localhost:5000/api/register -H "Content-Type: application/json" -d '{"nombreCompleto":"Juan Pérez","correo":"padre@altum.edu.mx","password":"password123","rol":"padre"}')
PADRE_ID=$(echo $PADRE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
PADRE_TOKEN=$(echo $PADRE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "ID del padre: $PADRE_ID"

# Crear usuario admin
echo "Creando usuario admin..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/register -H "Content-Type: application/json" -d '{"nombreCompleto":"Admin","correo":"admin@altum.edu.mx","password":"admin123","rol":"admin"}')
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Crear materias
echo "Creando materias..."
curl -s -X POST http://localhost:5000/api/subjects -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"nombre":"Matemáticas","nivel":"Secundaria"}'
curl -s -X POST http://localhost:5000/api/subjects -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"nombre":"Español","nivel":"Secundaria"}'
curl -s -X POST http://localhost:5000/api/subjects -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"nombre":"Ciencias","nivel":"Primaria"}'
curl -s -X POST http://localhost:5000/api/subjects -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"nombre":"Historia","nivel":"Primaria"}'

# Crear estudiantes
echo "Creando estudiantes..."
STUDENT1_RESPONSE=$(curl -s -X POST http://localhost:5000/api/students -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"nombreCompleto":"Ana Pérez","curp":"PERA050630MDFRZN03","fechaNacimiento":"2005-06-30","genero":"F","nivel":"Secundaria","estatus":"activo"}')
STUDENT1_ID=$(echo $STUDENT1_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

STUDENT2_RESPONSE=$(curl -s -X POST http://localhost:5000/api/students -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"nombreCompleto":"Carlos Pérez","curp":"PERC070415HDFRZR08","fechaNacimiento":"2007-04-15","genero":"M","nivel":"Primaria","estatus":"activo"}')
STUDENT2_ID=$(echo $STUDENT2_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "ID estudiante 1: $STUDENT1_ID"
echo "ID estudiante 2: $STUDENT2_ID"

# Crear relaciones padre-alumno
echo "Creando relaciones padre-alumno..."
curl -s -X POST http://localhost:5000/api/parent-student-relations -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"padreId":"'$PADRE_ID'","alumnoId":'$STUDENT1_ID'}'
curl -s -X POST http://localhost:5000/api/parent-student-relations -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"padreId":"'$PADRE_ID'","alumnoId":'$STUDENT2_ID'}'

# Agregar calificaciones
echo "Agregando calificaciones..."
curl -s -X POST http://localhost:5000/api/grades -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"materiaId":1,"alumnoId":'$STUDENT1_ID',"rubro":"Primer Bimestre","valor":"9.5","periodo":"2024-2025"}'
curl -s -X POST http://localhost:5000/api/grades -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"materiaId":2,"alumnoId":'$STUDENT1_ID',"rubro":"Primer Bimestre","valor":"8.7","periodo":"2024-2025"}'
curl -s -X POST http://localhost:5000/api/grades -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"materiaId":3,"alumnoId":'$STUDENT2_ID',"rubro":"Primer Bimestre","valor":"9.8","periodo":"2024-2025"}'
curl -s -X POST http://localhost:5000/api/grades -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"materiaId":4,"alumnoId":'$STUDENT2_ID',"rubro":"Primer Bimestre","valor":"8.5","periodo":"2024-2025"}'

# Agregar asistencias
echo "Agregando asistencias..."
curl -s -X POST http://localhost:5000/api/attendance -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT1_ID',"fecha":"2025-04-01","asistencia":true}'
curl -s -X POST http://localhost:5000/api/attendance -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT1_ID',"fecha":"2025-04-02","asistencia":true}'
curl -s -X POST http://localhost:5000/api/attendance -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT1_ID',"fecha":"2025-04-03","asistencia":false,"justificacion":"Cita médica"}'
curl -s -X POST http://localhost:5000/api/attendance -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT2_ID',"fecha":"2025-04-01","asistencia":true}'
curl -s -X POST http://localhost:5000/api/attendance -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT2_ID',"fecha":"2025-04-02","asistencia":true}'
curl -s -X POST http://localhost:5000/api/attendance -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT2_ID',"fecha":"2025-04-03","asistencia":true}'

# Crear conceptos de pago
echo "Creando conceptos de pago..."
curl -s -X POST http://localhost:5000/api/payment-concepts -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"nombre":"Colegiatura Abril","descripcion":"Pago de colegiatura del mes de abril","monto":"2500","fechaVencimiento":"2025-04-10"}'
curl -s -X POST http://localhost:5000/api/payment-concepts -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"nombre":"Materiales Escolares","descripcion":"Pago de materiales escolares del semestre","monto":"1200","fechaVencimiento":"2025-04-15"}'

# Crear adeudos
echo "Creando adeudos..."
curl -s -X POST http://localhost:5000/api/debts -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT1_ID',"conceptoId":1,"montoTotal":"2500","fechaLimite":"2025-04-10","estatus":"pendiente"}'
curl -s -X POST http://localhost:5000/api/debts -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT1_ID',"conceptoId":2,"montoTotal":"1200","fechaLimite":"2025-04-15","estatus":"pendiente"}'
curl -s -X POST http://localhost:5000/api/debts -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT2_ID',"conceptoId":1,"montoTotal":"2500","fechaLimite":"2025-04-10","estatus":"pendiente"}'
curl -s -X POST http://localhost:5000/api/debts -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT2_ID',"conceptoId":2,"montoTotal":"1200","fechaLimite":"2025-04-15","estatus":"pendiente"}'

# Crear pagos
echo "Creando pagos..."
curl -s -X POST http://localhost:5000/api/payments -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT1_ID',"conceptoId":1,"monto":"2500","fechaPago":"2025-04-05","metodoPago":"Transferencia","referencia":"TRF123456"}'
curl -s -X POST http://localhost:5000/api/payments -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"alumnoId":'$STUDENT2_ID',"conceptoId":1,"monto":"2500","fechaPago":"2025-04-05","metodoPago":"Transferencia","referencia":"TRF123457"}'

# Crear avisos
echo "Creando avisos escolares..."
curl -s -X POST http://localhost:5000/api/avisos -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"titulo":"Suspensión de clases","contenido":"Se suspenden las clases el día 15 de abril por junta de docentes","publico":"todos"}'
curl -s -X POST http://localhost:5000/api/avisos -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"titulo":"Exámenes Secundaria","contenido":"Los exámenes de secundaria se realizarán del 20 al 24 de abril","publico":"nivel","nivel":"Secundaria"}'
curl -s -X POST http://localhost:5000/api/avisos -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"titulo":"Entrega de boletas Ana","contenido":"Se cita a los padres de Ana a recoger su boleta el día 27 de abril","publico":"individual","alumnoId":'$STUDENT1_ID'}'

echo "Configuración completada. Usuario padre: padre@altum.edu.mx, password: password123"
