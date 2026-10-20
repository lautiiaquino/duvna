// Núcleo compartido: cliente de Supabase, encabezado, pie y utilidades.
import { CONFIG } from "./config.js";

export { CONFIG };

// Raíz del sitio: funciona tanto en academy.duvna.com como en usuario.github.io/duvna/
export const BASE = new URL("../../", import.meta.url).pathname;

// El pie y los datos legales se muestran primero, aunque falle la conexión.
renderFooter();
renderConfigFields();

const configured = !CONFIG.SUPABASE_URL.includes("TU-PROYECTO");
let client = null;
let loadFailed = false;
if (configured) {
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  } catch {
    loadFailed = true;
  }
}
export const supabase = client;

export function requireBackend(msgEl) {
  if (supabase) return true;
  if (msgEl) {
    msgEl.className = "msg msg-info";
    msgEl.textContent = loadFailed
      ? "No pudimos conectar con el sistema de cuentas. Revisá tu conexión y recargá la página."
      : "El sistema de cuentas todavía no está conectado. Completá SUPABASE_URL y SUPABASE_ANON_KEY en assets/js/config.js.";
  }
  return false;
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Redirige al ingreso si no hay sesión; vuelve a la página actual después.
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `${BASE}ingresar.html?next=${next}`;
    return null;
  }
  return session;
}

export function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Contacto ----------
export function linkWhatsApp(texto = "") {
  if (!CONFIG.WHATSAPP) return "";
  return `https://wa.me/${CONFIG.WHATSAPP}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
export function linkEmail(asunto = "", cuerpo = "") {
  const q = [asunto && `subject=${encodeURIComponent(asunto)}`, cuerpo && `body=${encodeURIComponent(cuerpo)}`].filter(Boolean).join("&");
  return `mailto:${CONFIG.EMAIL_CONTACTO}${q ? `?${q}` : ""}`;
}
// Mejor canal disponible para mandar un mensaje: WhatsApp si está cargado, si no email.
export function linkMensaje(asunto, cuerpo) {
  return linkWhatsApp(`${asunto}\n\n${cuerpo}`) || linkEmail(asunto, cuerpo);
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export function showMsg(el, type, text) {
  el.className = `msg msg-${type}`;
  el.textContent = text;
}

// Traduce los errores más comunes de Supabase.
export function authError(err) {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("invalid login")) return "El email o la contraseña no coinciden.";
  if (m.includes("already registered")) return "Ya existe una cuenta con ese email. Probá ingresar.";
  if (m.includes("password") && m.includes("6")) return "La contraseña tiene que tener al menos 8 caracteres.";
  if (m.includes("email not confirmed")) return "Confirmá tu email con el enlace que te enviamos antes de ingresar.";
  if (m.includes("rate limit")) return "Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.";
  return err?.message || "Algo falló. Probá de nuevo.";
}

// ---------- Encabezado y pie comunes ----------
function tieneAcceso() {
  try { return !!JSON.parse(localStorage.getItem("duvna_acceso") || "null")?.codigo; } catch { return false; }
}

async function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;
  el.className = "site-header";
  el.innerHTML = `
    <div class="wrap">
      <a class="brand" href="${BASE}" aria-label="Duvna Academy, inicio">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
        <span class="brand-name">duvna</span><span class="brand-sub">academy</span>
      </a>
      <nav class="nav" aria-label="Principal">
        <a class="hide-sm" href="${BASE}cursos/roblox-luau.html">Curso de Roblox</a>
        <a class="hide-sm" href="${BASE}aula.html">Clase gratis</a>
        ${tieneAcceso()
          ? `<a class="btn btn-primary btn-sm" href="${BASE}aula.html">Mi curso</a>`
          : `<a href="${BASE}acceso.html">Ingresar</a>
             <a class="btn btn-primary btn-sm hide-xs" data-buy="roblox-luau" href="${BASE}cursos/roblox-luau.html#precio">Inscribirme</a>`}
      </nav>
    </div>`;
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  const year = new Date().getFullYear();
  el.className = "site-footer";
  el.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <h3>Duvna Academy</h3>
          <p>Cursos online de programación y creación digital, en español y a tu ritmo.</p>
          <ul class="footer-contact">
            <li><a href="mailto:${esc(CONFIG.EMAIL_CONTACTO)}">${esc(CONFIG.EMAIL_CONTACTO)}</a></li>
            ${CONFIG.WHATSAPP ? `<li><a href="${linkWhatsApp()}" target="_blank" rel="noopener">WhatsApp</a></li>` : ""}
            ${CONFIG.INSTAGRAM ? `<li><a href="https://instagram.com/${esc(CONFIG.INSTAGRAM)}" target="_blank" rel="noopener">Instagram</a></li>` : ""}
            ${CONFIG.TIKTOK ? `<li><a href="https://www.tiktok.com/@${esc(CONFIG.TIKTOK)}" target="_blank" rel="noopener">TikTok</a></li>` : ""}
          </ul>
        </div>
        <div>
          <h3>Academia</h3>
          <ul>
            <li><a href="${BASE}cursos/roblox-luau.html">Curso de Roblox con Luau</a></li>
            <li><a href="${BASE}cursos/roblox-luau.html#programa">Programa del curso</a></li>
            <li><a href="${BASE}aula.html">Clase gratis</a></li>
            <li><a href="${BASE}acceso.html">Ingresar al curso</a></li>
            <li><a href="${BASE}verificar.html">Verificar un certificado</a></li>
          </ul>
        </div>
        <div>
          <h3>Legales</h3>
          <ul>
            <li><a href="${BASE}legal/terminos.html">Términos y condiciones</a></li>
            <li><a href="${BASE}legal/privacidad.html">Política de privacidad</a></li>
            <li><a href="${BASE}legal/reembolsos.html">Reembolsos y cancelación</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-legal-btns">
        <a class="btn btn-on-dark btn-sm" href="${BASE}legal/arrepentimiento.html">Botón de arrepentimiento</a>
        <a class="btn btn-on-dark btn-sm" href="${BASE}legal/baja.html">Botón de baja</a>
      </div>
      <div class="footer-base">
        <p>© ${year} Duvna Academy. Titular: ${esc(CONFIG.TITULAR)}, ${esc(CONFIG.CUIT)}, ${esc(CONFIG.DOMICILIO)}.</p>
        <p>Roblox es una marca registrada de Roblox Corporation. Duvna Academy no está afiliada, patrocinada ni avalada por Roblox Corporation.</p>
        <p><a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" rel="noopener" target="_blank">Defensa de las y los Consumidores</a>. Para reclamos ingrese <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" rel="noopener" target="_blank">aquí</a>.</p>
      </div>
    </div>`;
}

// Precios y botones de compra se completan desde config.js
function renderPrices() {
  document.querySelectorAll("[data-price]").forEach(el => {
    const c = CONFIG.CURSOS[el.dataset.price];
    if (c) el.textContent = c.precio;
  });
  document.querySelectorAll("[data-period]").forEach(el => {
    const c = CONFIG.CURSOS[el.dataset.period];
    if (c) el.textContent = c.periodo;
  });
  // Todos los botones de compra llevan a la página de inscripción, que muestra
  // el resumen, pide aceptar los términos y recién ahí manda a pagar.
  document.querySelectorAll("[data-buy]").forEach(el => {
    if (!CONFIG.CURSOS[el.dataset.buy]) return;
    el.href = `${BASE}inscripcion.html?curso=${el.dataset.buy}`;
  });
}

// Botón flotante de WhatsApp (solo si hay número cargado)
function renderWhatsApp() {
  if (!CONFIG.WHATSAPP || document.body.dataset.sinChat !== undefined) return;
  const a = document.createElement("a");
  a.className = "wa-float";
  a.href = linkWhatsApp("Hola, tengo una consulta sobre Duvna Academy");
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", "Escribinos por WhatsApp");
  a.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3z"/></svg>';
  document.body.appendChild(a);
}

// Datos del titular en las páginas legales: <span data-cfg="CUIT"></span>
function renderConfigFields() {
  document.querySelectorAll("[data-cfg]").forEach(el => {
    const v = CONFIG[el.dataset.cfg];
    if (!v) return;
    el.textContent = v;
    if (el.tagName === "A" && el.dataset.cfg === "EMAIL_CONTACTO") el.href = `mailto:${v}`;
  });
}

renderHeader();
renderPrices();
renderWhatsApp();
