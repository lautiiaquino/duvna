// Aula de Duvna Academy (versión preview, sin base de datos).
// El curso viaja cifrado en assets/curso/curso.enc.json y solo se abre con el código de acceso.
import { BASE } from "./app.js";

const CLAVE_ACCESO = "duvna_acceso";
const CLAVE_PROGRESO = "duvna_progreso";

// ---------- Almacenamiento local (puede no estar disponible) ----------
function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch {
    return porDefecto;
  }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento: sigue funcionando en esta pestaña */ }
}

export function accesoGuardado() { return leer(CLAVE_ACCESO, null); }
export function guardarAcceso(codigo, nombre) { escribir(CLAVE_ACCESO, { codigo, nombre }); }
export function cerrarSesion() { try { localStorage.removeItem(CLAVE_ACCESO); } catch {} }

export function progreso() { return new Set(leer(CLAVE_PROGRESO, [])); }
export function marcar(id, hecho) {
  const p = progreso();
  hecho ? p.add(id) : p.delete(id);
  escribir(CLAVE_PROGRESO, [...p]);
  return p;
}

// ---------- Datos del curso ----------
export async function cargarIndice() {
  const r = await fetch(`${BASE}assets/curso/indice.json`);
  return r.json();
}
export async function cargarMuestra() {
  const r = await fetch(`${BASE}assets/curso/muestra.json`);
  return r.json();
}

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const normalizar = (codigo) => String(codigo || "").trim().toUpperCase();

let cache = null;
// Devuelve { id: html } con todas las clases, o lanza un error si el código no es válido.
export async function abrirCurso(codigo) {
  if (cache && cache.codigo === normalizar(codigo)) return cache.clases;
  const r = await fetch(`${BASE}assets/curso/curso.enc.json`);
  const enc = await r.json();
  const material = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(normalizar(codigo)), "PBKDF2", false, ["deriveKey"]);
  const clave = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(enc.sal), iterations: enc.iter, hash: "SHA-256" },
    material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  let plano;
  try {
    plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, clave, b64(enc.datos));
  } catch {
    throw new Error("codigo");
  }
  const clases = JSON.parse(new TextDecoder().decode(plano));
  cache = { codigo: normalizar(codigo), clases };
  return clases;
}

// ---------- Certificados ----------
// Código del certificado: se calcula a partir del nombre, el curso y la fecha,
// así siempre sale el mismo para el mismo alumno.
export async function codigoCertificado(nombre, curso, fecha) {
  const datos = new TextEncoder().encode(`${nombre.trim().toLowerCase()}|${curso}|${fecha}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", datos));
  const hex = [...hash.slice(0, 4)].map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `DUV-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

// Certificados registrados. El archivo público no muestra nombres: cada registro
// está cifrado con su propio código, así que solo se puede leer teniendo el código.
async function sha256(texto) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}
const hex = (bytes) => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");

export async function buscarCertificado(codigo) {
  codigo = normalizar(codigo);
  let lista = [];
  try {
    const r = await fetch(`${BASE}assets/curso/certificados.json`, { cache: "no-store" });
    lista = await r.json();
  } catch {
    return null;
  }
  const id = hex(await sha256(`duvna-id|${codigo}`));
  const entrada = lista.find(e => e.id === id);
  if (!entrada) return null;
  const clave = await crypto.subtle.importKey("raw", await sha256(`duvna-cert|${codigo}`), "AES-GCM", false, ["decrypt"]);
  try {
    const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(entrada.iv) }, clave, b64(entrada.datos));
    return JSON.parse(new TextDecoder().decode(plano));
  } catch {
    return null;
  }
}

const CLAVE_FIN = "duvna_fin";
export function fechaFinalizacion() { return leer(CLAVE_FIN, null); }
export function guardarFinalizacion(fecha) { escribir(CLAVE_FIN, fecha); }
