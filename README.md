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

**Cuentas de alumnos, panel, clases y certificados** están guardados en la rama `login` del repositorio, listos para sumarlos más adelante. Por ahora la web es solo de venta:

- Los botones de compra llevan directo al link de pago de `config.js` (`checkoutUrl`). Mientras esté vacío, abren un email a `EMAIL_CONTACTO` para anotarse.
- Los botones de arrepentimiento y baja arman un email con el pedido. Respondé cada uno con un código de constancia dentro de las 24 horas.

## Cómo funciona la protección

- Cada alumno tiene una cuenta con un ID único (lo genera Supabase).
- Las clases **no están en GitHub**: viven en la base de datos. Las reglas de `schema.sql` hacen que el servidor solo entregue una clase si es de muestra o si el alumno tiene una suscripción vigente. Aunque alguien lea el código del sitio, no puede saltearse eso.
- Las inscripciones solo las puede crear el servidor (el aviso de pago de Mercado Pago). Un alumno no puede darse acceso a sí mismo.
- Los videos están en un depósito privado y se entregan con enlaces que vencen a las 2 horas.
- El video lleva una marca de agua con el email del alumno que cambia de lugar.

**Límite honesto:** nada impide al 100% que alguien grabe la pantalla. La marca de agua sirve para identificar quién lo filtró.

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pegá y ejecutá `supabase/schema.sql` y después `supabase/seed.sql`.
3. En **Authentication > URL Configuration**:
   - Site URL: `https://academy.duvna.com`
   - Redirect URLs: `https://academy.duvna.com/**` y, mientras tanto, `https://lautiiaquino.github.io/duvna/**`
4. En **Authentication > Providers > Email**: dejá activada la confirmación de email y poné 8 caracteres como mínimo de contraseña.
5. En **Project Settings > API**, copiá la *Project URL* y la *anon public key* en `assets/js/config.js`.

> Nunca pongas la *service_role key* en el sitio. Esa clave salta todas las reglas.

### 2. Tus datos en `config.js`

Completá `CUIT`, `DOMICILIO` y `EMAIL_CONTACTO`. La ley exige que el titular esté identificado en el sitio. Se muestran solos en el pie y en las páginas legales.

### 3. GitHub Pages

1. Creá un repositorio y subí todos estos archivos a la rama `main`.
2. En **Settings > Pages**, elegí *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. Cuando compres el dominio, en Namecheap, en el DNS de `duvna.com`, agregá un registro **CNAME** con host `academy` y valor `lautiiaquino.github.io`.
4. Volvé a **Settings > Pages**, escribí `academy.duvna.com` como dominio y activá **Enforce HTTPS** cuando aparezca.

Mientras no tengas el dominio, el sitio funciona en `https://lautiiaquino.github.io/duvna/`. Cuando lo tengas, creá en la raíz del repo un archivo `CNAME` con una sola línea: `academy.duvna.com`.

### 4. Probar en tu computadora

```bash
python3 -m http.server 8000
```

Y abrí `http://localhost:8000`. Para probar cuentas, agregá `http://localhost:8000/**` a las Redirect URLs de Supabase.

## Cargar clases y videos

- Cada clase es una fila en la tabla `lessons`: módulo, posición, título y contenido en Markdown (`body_md`).
- `is_preview = true` la vuelve clase de muestra, visible para cualquiera con cuenta.
- Para un video: subilo en **Storage > lecciones** dentro de una carpeta con el ID del curso (ej: `roblox-luau/m02-c01.mp4`) y poné esa ruta en `video_path`.

## Mientras no esté conectado Mercado Pago

- Los botones de compra dicen "Inscripciones abren pronto" e invitan a crear la cuenta.
- Para dar acceso a mano (por ejemplo, para probar), en **Table Editor > enrollments** creá una fila con el `user_id` del alumno, `course_id = roblox-luau`, `status = active` y una fecha en `current_period_end`.
- Los pedidos de **baja** y **arrepentimiento** llegan a la tabla `requests`. Revisala todos los días y resolvelos: es una obligación legal. Cuando termines uno, cambiá su `status` a `procesado`.

## Antes de vender: lista legal

Esto no reemplaza el consejo de un abogado o contador. Revisá con uno:

- [ ] Estar inscripto en ARCA (monotributo) y emitir factura por cada cobro.
- [ ] Completar CUIT y domicilio en `config.js`.
- [ ] Inscribir la base de datos de alumnos en el Registro Nacional de Bases de Datos de la AAIP.
- [ ] Confirmar que los enlaces de Defensa del Consumidor del pie sigan vigentes.
- [ ] Si vendés a menores, que la persona adulta sea quien paga (Mercado Pago lo exige igual).
- [ ] Revisar los textos de `legal/` con un profesional.

## Próximos pasos

1. ~~Estructura del sitio, login, panel y políticas~~
2. ~~Base de datos y reglas de acceso~~
3. Conexión con Mercado Pago (suscripción mensual, aviso automático de pago y baja automática)
4. Contenido completo del curso de Roblox
5. Ajustes finales del certificado
