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
