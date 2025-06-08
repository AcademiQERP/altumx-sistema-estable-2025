import { useEffect } from "react";
import { useLocation } from "wouter";
import { useParams } from "wouter";

// Este archivo es un redireccionador para mantener la URL en español
// pero usar la implementación en inglés que ya está lista
export default function CalificacionesGrupoMateria() {
  const params = useParams();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Redireccionar a la versión en inglés manteniendo los parámetros
    navigate(`/grades/group/${params.groupId}/subject/${params.subjectId}`);
  }, [params.groupId, params.subjectId]);

  return null;
}