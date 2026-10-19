-- Datos iniciales: el curso de Roblox y su clase de muestra.
-- Correr DESPUÉS de schema.sql. El resto de las clases se cargan en el paso 4.

insert into public.courses (id, title)
values ('roblox-luau', 'Programación de juegos en Roblox con Luau')
on conflict (id) do update set title = excluded.title;

insert into public.lessons (course_id, module_no, module_title, position, title, is_preview, body_md)
values (
  'roblox-luau', 1, 'Roblox Studio desde cero', 1, 'Bienvenida y cómo vas a trabajar', true,
$md$
En este curso vas a construir un juego de Roblox completo, escrito por vos. Cada módulo suma una pieza nueva y termina con algo que podés probar en Studio.

## Qué necesitás

- Una computadora con Windows o Mac.
- **Roblox Studio**, que es gratuito. Lo descargás desde la página de creadores de Roblox.
- Una cuenta de Roblox.

## Cómo aprovechar cada clase

1. Leé la clase completa una vez.
2. Abrí Roblox Studio y escribí el código vos mismo, sin copiar y pegar. Escribirlo es lo que hace que lo entiendas.
3. Probalo con el botón **Play** y fijate qué pasa.
4. Cambiá algo a propósito: un número, un texto. Ver qué se rompe enseña tanto como ver qué funciona.

## Tu primer script

En el Explorador, hacé clic derecho en **ServerScriptService**, elegí *Insert Object* y después *Script*. Borrá lo que tenga y escribí:

```lua
print("Hola desde mi primer juego")
```

Apretá **Play** y abrí la ventana **Output** (menú *View*). Si ves el mensaje, tu entorno está listo.

> En la próxima clase recorremos la interfaz de Studio y armamos el primer mapa.
$md$
)
on conflict (course_id, module_no, position) do nothing;
