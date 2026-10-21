# Duvna Academy

Sitio de cursos online de Duvna Academy: landings, cuentas de alumnos, clases protegidas, certificados verificables y páginas legales.

- **Sitio:** HTML, CSS y JavaScript sin compilar, publicado en GitHub Pages en `academy.duvna.com`.
- **Servidor:** Supabase (cuentas, base de datos, reglas de acceso y videos privados).
- **Pagos:** Mercado Pago (se conecta en el paso 3).

## Estructura

```
index.html              Inicio de la academia
inscripcion.html        Inscripción en 3 pasos
ingresar.html           Ingreso y registro
cuenta.html             Contraseña nueva
aula.html               Aula: clase de muestra gratis y curso completo
admin.html              Panel de administrador
certificado.html        Certificado del alumno
verificar.html          Verificación pública de certificados
assets/curso/           Índice, clase de muestra y curso cifrado
cursos/roblox-luau.html Landing de venta del curso de Roblox
legal/                  Términos, privacidad, reembolsos, arrepentimiento y baja
404.html                Página de error
assets/js/config.js     ← TUS DATOS: titular, precios, link de pago, Supabase
assets/js/app.js        Código compartido (encabezado, pie, precios, botones de compra)
assets/css/duvna.css    Estilos
supabase/               Base de datos para cuando se sumen las cuentas
```

## Cómo funciona (con Supabase)

1. **Cuenta**: el alumno crea su cuenta en `ingresar.html`.
2. **Inscripción** (`inscripcion.html`): acepta los términos, paga con Mercado Pago y registra su pedido. El pedido aparece en el panel.
3. **Acceso**: desde `admin.html` → Pedidos, tocás "Pago confirmado: dar 30 días". El alumno ya ve las 41 clases en `aula.html`.
4. **Progreso y certificado**: se guardan en la base. Al terminar, el alumno obtiene su certificado con código único, verificable en `verificar.html`.
5. **Bajas y arrepentimientos**: llegan al panel con su código de constancia. Desde ahí cortás el acceso al final del período o en el momento.

La seguridad la da `supabase/schema.sql`: el servidor solo entrega una clase si es de muestra o si el alumno tiene acceso vigente, y solo el administrador puede dar acceso.

## Puesta en marcha de Supabase

1. Creá el proyecto y pegá `supabase/schema.sql` completo en **SQL Editor → Run**.
2. **Authentication → Sign In / Providers → Email**: desactivá **Confirm email** mientras no tengas un servicio de email propio (el de Supabase solo envía a los miembros del equipo).
3. **Authentication → URL Configuration**: Site URL `https://lautiiaquino.github.io/duvna/` y en Redirect URLs `https://lautiiaquino.github.io/duvna/**`.
4. Copiá **Project URL** y **anon public key** en `assets/js/config.js`. Nunca pongas la `service_role` key en el sitio.
5. Creá tu cuenta en la web y hacete administrador en el SQL Editor:
   `update profiles set is_admin = true where email = 'tu@email.com';`
6. Entrá a **Panel → Curso** y cargá las clases con el código del archivo del curso.

## Datos para completar en `assets/js/config.js`

| Dato | Para qué |
|---|---|
| `checkoutUrl` | Link de pago o suscripción de Mercado Pago |
| `EMAIL_CONTACTO` | Email que recibe inscripciones y pedidos |
| `WHATSAPP` | Número con código de país, solo dígitos. Activa el botón de chat |
| `INSTAGRAM`, `TIKTOK` | Usuarios, sin @. Aparecen en el pie |
| `CUIT`, `DOMICILIO` | Obligatorios por la Ley de Defensa del Consumidor |
| `SITE_URL` | Cambialo cuando tengas el dominio propio |
