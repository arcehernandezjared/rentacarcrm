# RentaCar CRM — guía de instalación

Sistema para un negocio de **renta de carros**: lee la bandeja de Gmail,
clasifica cada correo en **venta / soporte / cobro / cotización**, y cuando
detecta una solicitud de cotización busca el vehículo disponible, calcula el
precio, genera un PDF y lo envía automáticamente. Todo queda registrado en un
CRM (clientes, cotizaciones, correos) con seguimiento automático.

Este proyecto reemplaza a `gmailIA` (que queda sin usar en el repo).

## Dos formas de sincronizar el correo

Hay **dos caminos independientes** para que el sistema lea y responda
correos — puedes usar uno o ambos, pero ten en cuenta que si ambos están
activos al mismo tiempo, existe un pequeño riesgo de que un mismo correo se
procese (y se responda) dos veces si ambos sincronizan casi al mismo
instante:

1. **n8n** (workflows en `n8n/`): revisa la bandeja cada minuto de forma
   automática, sin que nadie tenga que hacer nada. Requiere tener n8n
   corriendo y configurado (sección 4).
2. **Sincronización directa desde el dashboard** (botón "Conectar Gmail" /
   "Sincronizar ahora" en la página principal): no depende de n8n, vive
   dentro de esta misma app. Requiere conectar tu cuenta de Gmail por OAuth2
   una sola vez (sección 3) y luego presionar "Sincronizar ahora" cuando
   quieras revisar correos nuevos (procesa hasta 5 por clic). Es la opción
   recomendada si no quieres depender de n8n para el flujo principal.

## Estado actual del despliegue

- **Dashboard en producción:** https://rentacar-crm.vercel.app (Vercel, proyecto `rentacar-crm`)
- **Base de datos:** MySQL remoto en Hostinger (host `srv633.hstgr.io`), no WAMP local
- **n8n:** instancia en n8n Cloud (https://jaredarce.app.n8n.cloud) — por eso los workflows usan la URL de Vercel y no `localhost`
- Variables de entorno de producción ya configuradas en Vercel (`vercel env ls` para verlas, los valores sensibles no se muestran)

Lo que sigue pendiente es solo conectar Gmail y Anthropic dentro de n8n (pasos 3 y 4 abajo).

## 1. Base de datos (MySQL)

Si necesitas levantar el dashboard en local también (para desarrollo), usa
WAMP: ejecuta [`schema.sql`](./schema.sql) en phpMyAdmin. Crea la base
`rentacar_crm` con las tablas `usuarios`, `vehiculos`, `clientes`,
`cotizaciones`, `correos`, `seguimientos` y `configuracion_categorias`, y
carga un catálogo inicial de 10 vehículos (económico a lujo). En producción
ya está aplicado este mismo esquema sobre la base de Hostinger.

## 2. Dashboard (Next.js)

```bash
cd rentacar-crm
npm install
```

`.env.local` ya viene con `JWT_SECRET` e `INGEST_SECRET` generados, tu API
key de Anthropic, y la conexión a MySQL apuntando a WAMP (`root` sin
contraseña). Crea tu usuario del dashboard:

```bash
npm run seed:admin
npm run seed:demo   # opcional: carga clientes, cotizaciones y correos de ejemplo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con
`ADMIN_EMAIL` / `ADMIN_PASSWORD` de tu `.env.local`.

## 3. Credenciales de Gmail (Google Cloud OAuth2)

1. Ve a [console.cloud.google.com](https://console.cloud.google.com/) y crea
   un proyecto (ej. "RentaCar CRM").
2. **APIs y servicios → Biblioteca** → busca **Gmail API** → **Habilitar**.
3. **APIs y servicios → Pantalla de consentimiento OAuth**: tipo Externo,
   completa los datos básicos, y agrega tu cuenta de Gmail en **Usuarios de
   prueba**.
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente
   OAuth**, tipo **Aplicación web**. En **URI de redirección autorizados**
   agrega la URL de callback que te muestra n8n al crear la credencial
   (paso siguiente).
5. Guarda el Client ID y Client Secret.

## 4. Configurar n8n

Este proyecto usa **dos workflows**:

### a) Workflow principal — [`n8n/n8n-workflow-rentacar.json`](./n8n/n8n-workflow-rentacar.json)

Lee correos nuevos cada minuto, clasifica con Claude, y si es una
cotización busca vehículo disponible, genera el PDF y responde con el
adjunto. Si no es cotización, responde según la categoría. Programa un
seguimiento automático 3 días después de cada cotización enviada.

1. Importa el archivo en n8n (**Workflows → Import from File**).
2. **Credencial de Gmail**: en el nodo "Nuevo correo" crea una credencial
   **Gmail OAuth2 API** con el Client ID/Secret del paso 3, autoriza con la
   cuenta de Gmail del negocio. Asigna la misma credencial a los nodos
   "Responder correo" y "Responder con cotización".
3. **Credencial de Anthropic**: en cualquiera de los nodos "...(Claude)" →
   Authentication → crea una credencial **Header Auth**:
   - Name: `x-api-key`
   - Value: tu API key de Anthropic (la misma de `.env.local`).
   Asígnala también a los otros dos nodos que llaman a Claude.
4. Las URLs de los nodos HTTP Request ya apuntan a
   `https://rentacar-crm.vercel.app` (la producción real en Vercel) y el
   header `x-ingest-secret` ya coincide con el `INGEST_SECRET` configurado
   ahí — no necesitas tocarlos a menos que cambies de dominio.
5. Activa el workflow.

> **Nota sobre el adjunto:** el nodo "Convertir PDF a archivo" y el adjunto
> en "Responder con cotización" usan el nombre de propiedad binaria `data`.
> Si tu versión de n8n nombra distinto el campo de adjuntos en el nodo
> Gmail, ábrelo y verifica que apunte a la propiedad binaria generada por
> "Convertir PDF a archivo".

### b) Workflow de seguimientos — [`n8n/n8n-workflow-seguimientos.json`](./n8n/n8n-workflow-seguimientos.json)

Corre todos los días a las 9am, busca los seguimientos programados que ya
vencieron, envía el correo de seguimiento y los marca como enviados.

1. Impórtalo igual que el anterior.
2. Asigna la credencial de Gmail al nodo "Enviar seguimiento".
3. Las URLs y el `x-ingest-secret` ya apuntan a producción, igual que en el workflow principal.
4. Activa el workflow.

## 5. Cómo funciona

- **Clasificación**: Claude lee el correo y decide entre `venta`, `soporte`,
  `cobro` o `cotizacion`. Si es cotización, también extrae el tipo de
  vehículo y las fechas (o usa valores por defecto si el correo no las da).
- **Cotización automática**: se busca un vehículo disponible en esa
  categoría (o el más barato disponible si no hay de esa categoría exacta),
  se registra/actualiza el cliente en el CRM, se calcula el precio (tarifa
  por día × días + IVA 13%), se genera el PDF y se envía adjunto en la
  respuesta.
- **Seguimiento**: cada cotización enviada programa un recordatorio
  automático 3 días después, que el segundo workflow envía y marca como
  hecho.
- **Configuración**: desde el dashboard puedes pausar la respuesta
  automática por categoría — el correo se sigue clasificando y registrando,
  solo no se contesta solo.
- **CRM**: cada correo deja rastro en la ficha del cliente (estado,
  cotizaciones, historial de correos), visible en **Clientes**.

## Seguridad

- `.env.local` está en `.gitignore` — nunca se sube al repositorio.
- Todos los endpoints `/api/webhooks/*` exigen el header `x-ingest-secret`
  correcto; cualquier otra petición recibe 401.
- Considera rotar la API key de Anthropic si fue compartida fuera de este
  proyecto (panel de Anthropic → Settings → API Keys).
