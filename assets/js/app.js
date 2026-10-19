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
          <p class="small">Contacto: <a href="mailto:${esc(CONFIG.EMAIL_CONTACTO)}">${esc(CONFIG.EMAIL_CONTACTO)}</a></p>
        </div>
        <div>
          <h3>Academia</h3>
          <ul>
            <li><a href="${BASE}cursos/roblox-luau.html">Curso de Roblox con Luau</a></li>
            <li><a href="${BASE}cursos/roblox-luau.html#programa">Programa del curso</a></li>
            <li><a href="${BASE}cursos/roblox-luau.html#precio">Precio y garantía</a></li>
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
  document.querySelectorAll("[data-buy]").forEach(el => {
    const c = CONFIG.CURSOS[el.dataset.buy];
    if (!c) return;
    if (c.checkoutUrl) {
      // Con el link de pago cargado, el botón lleva directo a Mercado Pago.
      el.href = c.checkoutUrl;
      return;
    }
    // Mientras no haya link de pago, el botón abre un email para anotarse.
    const asunto = encodeURIComponent(`Quiero inscribirme: ${c.titulo}`);
    el.href = `mailto:${CONFIG.EMAIL_CONTACTO}?subject=${asunto}`;
  });
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
