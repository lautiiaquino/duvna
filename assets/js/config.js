// Configuración de Duvna Academy. Todo lo que cambia seguido está acá.
export const CONFIG = {
  // Dirección pública del sitio (se usa para links de verificación y para compartir).
  SITE_URL: "https://lautiiaquino.github.io/duvna/",

  // Datos del titular (obligatorios por la Ley de Defensa del Consumidor).
  TITULAR: "Lautaro Aquino",
  CUIT: "CUIT a completar",
  DOMICILIO: "Domicilio a completar",

  // Contacto. Si un dato queda vacío, la web no lo muestra.
  EMAIL_CONTACTO: "hola@duvna.com",
  WHATSAPP: "",          // solo números, con código de país. Ej: "5491112345678"
  INSTAGRAM: "",         // usuario sin @. Ej: "duvna.academy"
  TIKTOK: "",            // usuario sin @
  HORAS_RESPUESTA: 24,   // en cuánto tiempo prometés mandar el código de acceso

  // Cursos a la venta. El precio que se muestra en la web sale de acá.
  CURSOS: {
    "roblox-luau": {
      titulo: "Programación de juegos en Roblox con Luau",
      precio: "ARS 4.999",
      periodo: "por mes",
      // Link de pago o de suscripción de Mercado Pago.
      // Mientras esté vacío, la inscripción se hace por mensaje.
      checkoutUrl: "",
    },
  },

  // Supabase: solo la URL del proyecto y la clave pública (anon). Nunca la secret ni la service_role.
  SUPABASE_URL: "https://jcquzmfmwjapwneuncpx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcXV6bWZtd2phcHduZXVuY3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODgyNjAsImV4cCI6MjEwODE2NDI2MH0.Pk-OkftS31JxIcg1zrMHWIqTv6iiMdFdQYWIQjdCD_Y",
};
