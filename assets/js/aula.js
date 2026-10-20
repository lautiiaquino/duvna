// Aula de Duvna Academy conectada a Supabase.
// Las clases viven en la base de datos: el servidor solo entrega una clase
// si es de muestra o si el alumno tiene acceso vigente.
import { supabase, getSession, getPerfil } from "./app.js";

export async function estadoAlumno(curso) {
  const session = await getSession();
  const [{ data: outline, error }, perfil] = await Promise.all([
    supabase.rpc("course_outline", { p_course: curso }),
    getPerfil(),
  ]);
  if (error) throw error;

  let inscripcion = null, hechas = new Set(), certificado = null;
  if (session) {
    const [ins, prog, cert] = await Promise.all([
      supabase.from("enrollments").select("status, current_period_end").eq("course_id", curso).eq("user_id", session.user.id).maybeSingle(),
      supabase.from("progress").select("lesson_id").eq("user_id", session.user.id),
      supabase.from("certificates").select("code").eq("course_id", curso).eq("user_id", session.user.id).maybeSingle(),
    ]);
    inscripcion = ins.data;
    hechas = new Set((prog.data || []).map(p => p.lesson_id));
    certificado = cert.data?.code || null;
  }
  const vigente = !!inscripcion && new Date(inscripcion.current_period_end) > new Date();
  return { session, perfil, outline: outline || [], inscripcion, acceso: vigente || !!perfil?.is_admin, hechas, certificado };
}

// Devuelve la clase, o null si el servidor no la entrega (sin acceso).
export async function cargarClase(id) {
  const { data } = await supabase.from("lessons")
    .select("id, title, module_no, module_title, position, body_html, is_preview").eq("id", id).maybeSingle();
  return data;
}

export async function marcar(userId, lessonId, hecho) {
  if (hecho) {
    const { error } = await supabase.from("progress").insert({ user_id: userId, lesson_id: lessonId });
    return !error || error.code === "23505"; // 23505 = ya estaba marcada
  }
  const { error } = await supabase.from("progress").delete().eq("user_id", userId).eq("lesson_id", lessonId);
  return !error;
}

export async function pedirCertificado(curso) {
  const { data, error } = await supabase.rpc("issue_certificate", { p_course: curso });
  if (error) throw new Error(error.message);
  return data;
}

export async function verificarCertificado(codigo) {
  const { data, error } = await supabase.rpc("verify_certificate", { p_code: String(codigo || "").trim().toUpperCase() });
  if (error) throw error;
  return data?.[0] || null;
}

export function ultimaClase(id) {
  try {
    if (id) localStorage.setItem("duvna_ultima", id);
    return localStorage.getItem("duvna_ultima");
  } catch {
    return null;
  }
}
