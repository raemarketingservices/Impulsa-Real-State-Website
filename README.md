# Impulsa Real Estate

Plataforma inmobiliaria local en Next.js 16, React 19 y TypeScript. Identidad dorado/carbón, Montserrat y Cormorant Garamond alojadas localmente. Diseño adaptable a móvil y escritorio.

## Iniciar

Requiere Node.js 24 (incluye `node:sqlite`).

```sh
npm install
npm run dev
```

Sitio: http://localhost:7007 · Acceso: http://localhost:7007/login

En desarrollo, los botones **Administración** y **Agente** rellenan las credenciales de demostración. Pulsa **Entrar a mi espacio**. Las contraseñas aleatorias se generan en el primer inicio y se guardan en `data/local-access.json`, con permisos 0600; ese archivo está excluido de Git. No se muestran botones de acceso demo en producción.

El servidor local escucha exclusivamente en 127.0.0.1. No lo publiques en Internet como servidor de desarrollo.

## Qué está conectado

- Catálogo persistente, búsqueda por operación, ciudad/sector dependientes, tipo, precio, habitaciones, baños, parqueos, superficie y estado; orden, cuadrícula/lista y favoritos locales.
- Detalles, galería ampliable, agentes, miniwebs, proyectos y destinos.
- Formularios de compradores, captación de propietarios con wizard, solicitudes de agentes y adjuntos. Validación, estados de envío y confirmación.
- Asignación por propiedad/perfil y round robin o manual para consultas generales.
- Login mediante contraseñas scrypt y sesiones de servidor con cookies HttpOnly, cierre de sesión, roles super_admin/admin/agent, permisos verificados en cada API.
- CRUD de propiedades, propietarios, agentes, ubicaciones, proyectos, cursos/lecciones y usuarios. Códigos automáticos, duplicación en borrador, estados, historial de cambios.
- CRM Kanban arrastrable y cambio de estado por select accesible, tabla, filtros, notas, llamadas, WhatsApp, visitas, próximas acciones y exportación CSV.
- Dashboards calculados desde la base de datos; gráficos de pipeline y distribución por ciudad, seguimientos, indicadores y reportes exportables.
- Academia con ocho módulos, contenidos, evaluación, intentos y progreso persistente. Curso y lecciones publicables, orden editando su índice, adjuntos privados.
- Archivos JPG/PNG/WebP/PDF/MP4 con comprobación de contenido y acceso. Las imágenes de propiedades publicadas y avatares activos se sirven públicamente; documentos y training requieren sesión.
- CMS de portada, textos de marca, misión/visión/valores, contacto y plantilla de WhatsApp.
- Metadata de propiedades, OpenGraph, favicon, robots y sitemap dinámico.

Los enlaces de WhatsApp necesitan un número real configurado en el agente o en Configuración. Mientras esté vacío, se abre un formulario de contacto; no se envían mensajes a números inventados.

## Base de datos y alcance de esta entrega

Esta versión funciona con **SQLite local**, en `data/impulsa.db`, y archivos en `data/uploads`. Los datos iniciales son de demostración: 20 propiedades (18 disponibles, 1 reservada y 1 vendida), 5 agentes, 5 propietarios, 25 leads, 5 ciudades, 25 sectores y 1 curso con 8 módulos. Las fotografías de Unsplash son ilustrativas y no acreditan ubicaciones o inmuebles reales; los perfiles también son ficticios.

**Supabase aún no está conectado.** No se proporcionó un proyecto ni credenciales. `supabase/schema.sql` es una propuesta de esquema con RLS, perfiles, registros, secuencia, auditoría y buckets; no se ha ejecutado ni verificado en un servidor PostgreSQL. Agregar URL/anon key al .env por sí solo NO cambia el backend: falta sustituir el adaptador `lib/db.ts`, integrar Supabase Auth/Storage y verificar las políticas en el proyecto real. No se afirma que la RLS de Supabase esté activa; los permisos de esta versión se aplican en el servidor local.

La implementación usa CSS propio y componentes React en lugar de Tailwind/shadcn. Tampoco se incluye Realtime, envío automático de correo/WhatsApp, recuperación de contraseña por email, notificaciones push, certificados, CRM multiorganización o geocodificación. El CMS cubre los campos descritos arriba, no un editor libre de todas las secciones. Los gráficos muestran datos disponibles; no inventan una serie histórica de ventas. El buscador utiliza filtros, no un modelo de IA. Los quizzes iniciales son una pregunta por módulo con puntuación 0/100 y umbral del 80%.

Para una publicación comercial faltan los datos reales de marca/contacto, fotografías autorizadas, revisión de contenido y privacidad, proveedor de correo y configuración del backend de producción. Los formularios locales no notifican a un tercero: guardan solicitudes en el CRM.

## Verificación

```sh
npm run build
npm test
node tests/browser.mjs
```

Las pruebas de navegador usan Chrome instalado (`channel: 'chrome'`). `npm test` espera el servidor de desarrollo en el puerto 7007. Ambas suites crean registros marcados como pruebas; la de integración borra la propiedad y el lead temporales. La prueba de formación guarda progreso y la de archivos crea un PDF de prueba.

Pruebas de integración: autenticación, permisos por agente, estados restringidos, asignación de leads, persistencia, códigos, filtros por zona, privacidad de borradores y respuestas de quizzes, uploads, acceso a materiales, CSRF y logout.

Pruebas de navegador: home, favoritos, filtros, lightbox, formulario, acceso al panel, CRM, edición, training y 16 rutas en móvil sin desbordamiento, más errores de ejecución. Capturas en `data/` (no versionadas).

## Docker / Coolify

```sh
# Definir credenciales iniciales en .env antes del primer arranque.
docker compose up --build -d
```

`Dockerfile` usa salida standalone y usuario no privilegiado. `compose.yaml` persiste `/app/data` en un volumen y expone 7007 solo a localhost. En Coolify, configurar puerto interno 7007, dominio/HTTPS, variables y almacenamiento persistente en `/app/data`. El build de Docker/Coolify no se ejecutó en esta entrega.

Para la versión SQLite usa una sola instancia del servicio. Para escalar horizontalmente, conectar primero PostgreSQL/Supabase. Respaldar la base de datos con la API de backup de SQLite o con el servicio detenido; no copiar únicamente el archivo .db mientras WAL tiene escrituras pendientes.

## Estructura

- `app/[[...slug]]/page.tsx`: rutas y control de acceso del sitio/portal.
- `app/api/[...path]/route.ts`: validación, permisos, formularios y archivos.
- `lib/db.ts`: persistencia, autenticación y auditoría.
- `lib/seed.ts`: datos iniciales y contenidos de training.
- `components/public-site.tsx`: experiencia pública.
- `components/workspace.tsx`: operaciones, CRM, academia y CMS.
- `app/globals.css`: sistema visual y responsive.
- `design-system/MASTER.md`: decisiones de marca.

Fotografías: Unsplash; tipografías: Google Fonts bajo SIL OFL (licencias en `public/fonts`). El símbolo de navegación es una interpretación vectorial provisional de la guía; reemplazar por el archivo oficial del logo para producción.
