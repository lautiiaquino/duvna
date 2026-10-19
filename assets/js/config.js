// Configuración de Duvna Academy.
// Completá estos datos antes de publicar. La "anon key" de Supabase es pública
// por diseño: la seguridad real la dan las reglas (RLS) de supabase/schema.sql.
export const CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "TU-ANON-KEY",

  // Datos del titular (obligatorios por la Ley de Defensa del Consumidor).
  TITULAR: "Lautaro Aquino",
  CUIT: "CUIT a completar",
  DOMICILIO: "Domicilio a completar",
  EMAIL_CONTACTO: "hola@duvna.com",

  // Cursos a la venta. El precio que se muestra en la web sale de acá.
  CURSOS: {
    "roblox-luau": {
      titulo: "Programación de juegos en Roblox con Luau",
      precio: "ARS 4.999",
      periodo: "por mes",
      // Link de pago de Mercado Pago (se completa en el paso 3).
      // Mientras esté vacío, la web muestra "Inscripciones abren pronto".
      checkoutUrl: ""
    }
  }
};
