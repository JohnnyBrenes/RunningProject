# Plan: Sincronizar entrenamientos con Garmin (desde una fecha parámetro)

## Decisión: no se implementa (por ahora)

Tras evaluarlo como decisión de producto/arquitectura, **se decide no construir esto**, al menos no en el corto plazo. Queda el documento como referencia por si en el futuro cambian las condiciones.

**Por qué:** el propósito real de esta app no es competir con Garmin en cantidad de datos — ahí Garmin gana siempre (sensores, historial, métricas que esta app nunca va a igualar). El proyecto nació para practicar React y, con el tiempo, tener una vista simple con **los datos que el usuario considera relevantes**, curados a mano — no un espejo de Garmin. El único valor real que aportaría el sync es evitar tipear dos veces el mismo dato (correr → Garmin lo registra solo → cargarlo de nuevo a mano acá), y ese beneficio es chico (la carga manual son ~5 campos, segundos) frente al costo de construir y **mantener** una integración no oficial: credenciales de terceros guardadas, login que puede romperse sin aviso si Garmin cambia algo, riesgo de ToS, y la reconciliación de "gear"/zapatillas para no ensuciar los datos curados a mano. Es una solución sobredimensionada para el problema que resuelve.

**Si en algún momento se retoma**, la alternativa más liviana discutida (y preferible a todo lo descripto abajo) es importar el CSV que Garmin ya exporta oficialmente desde su web — sin login automatizado, sin credenciales guardadas, sin riesgo de ToS — para precargar el formulario manual existente (`InsertData.jsx`) y que el usuario siga confirmando/editando/guardando como hoy. El resto de este documento (login no oficial, tabla de gear mapping, endpoints de reconciliación, etc.) queda como referencia de lo que *no* se va a hacer así, no como plan activo.

---

## Resumen ejecutivo

**Sí es viable.** Se puede agregar un botón "Sincronizar con Garmin" (por ejemplo en `ViewData.jsx`, junto al botón de exportar Excel, o en una nueva sección de "Configuración") que dispare una importación de actividades desde una **fecha mínima parametrizable** elegida por el usuario, evitando traer todo el historial cada vez.

**Solo dos disciplinas**, consistente con el modelo actual (`Location`: `"Treadmill"` | `"Outdoor"`): el sync trae únicamente actividades de Garmin tipo `treadmill_running` y `running`/variantes (trail, calle, pista). Todo lo demás que Garmin pueda registrar (ciclismo, natación, fuerza, caminata, etc.) se descarta explícitamente en el mapeo — ver detalle en la sección de Backend, punto 2.

**Matiz importante antes de empezar:** Garmin no ofrece una API REST pública y gratuita de uso inmediato.

- La vía **oficial** es el *Garmin Connect Developer Program* (Activity API), que requiere solicitud y aprobación como partner/negocio — no es viable para activarlo hoy mismo.
- La vía que usan en la práctica casi todos los proyectos personales (ej. librerías Python `garminconnect`/`garth`) es **no oficial**: autenticarse contra los endpoints internos que usa la app móvil/web de Garmin Connect (email + password, con manejo de MFA/CAPTCHA en algunos casos). Funciona bien hoy, pero **no está soportado por Garmin, puede romperse sin aviso si cambian su login, y técnicamente va contra sus Términos de Servicio.**

Dado que este es un proyecto personal, el enfoque no oficial es razonable, pero hay que dejarlo documentado como riesgo aceptado, no como decisión implícita. Ver sección "Riesgos" al final.

No hay ningún código de Garmin/sync/integración externa en el repo hoy — esto es una feature nueva de punta a punta.

---

## Estado actual relevante (diagnóstico)

- **Modelo `Trainnings`** (`Backend/RunningWebApi/Models/Trainnings.cs`) es muy simple y manual: `Date`, `Kilometers` (double), `Time` (string libre "MM:SS"), `Pace` (string libre, calculado en frontend), `Shoes` (texto libre), `Location` ("Treadmill"|"Outdoor"), `UserId` (es el **username**, no un FK numérico).
- No hay campo para guardar el origen de un registro (manual vs. importado) ni un identificador externo → **hoy no hay forma de evitar duplicados si se sincroniza dos veces el mismo rango de fechas.**
- `Models/Users.cs` solo tiene `Id`, `Username`, `Email`, `PasswordHash` — no hay lugar para credenciales/tokens de terceros ni fecha de última sincronización.
- Backend no tiene ningún job en background (`IHostedService`/`BackgroundService`) ni scheduler — todo lo que existe es 100% disparado por request HTTP. Esto encaja bien con un sync **manual por botón**, no automático.
- Frontend no tiene página de "Settings"/perfil — solo `Dashboard`, `Charts`, `InsertData`, `ViewData`, navegados por `selectedOption` en `App.jsx` (sin React Router).
- `Api.jsx` ya maneja JWT vía interceptor de Axios; cualquier endpoint nuevo se protege igual que los existentes con `[Authorize]`.

---

## Diseño de datos (Supabase)

### Tabla `users` — nuevas columnas
```sql
alter table users add column garmin_username text;              -- email de Garmin
alter table users add column garmin_password_enc text;          -- password encriptado (no plano)
alter table users add column garmin_last_sync timestamptz;       -- última fecha sincronizada con éxito
```
`garmin_password_enc` se encripta simétricamente en el backend (ej. AES con una clave en variable de entorno `GARMIN_ENC_KEY`), **nunca en texto plano**, porque hace falta reenviarla al login de Garmin en cada sync (no hay refresh token de larga duración expuesto públicamente en el flujo no oficial).

### Tabla `trainnings` — nuevas columnas (para evitar duplicados y saber el origen)
```sql
alter table trainnings add column source text default 'manual';        -- 'manual' | 'garmin'
alter table trainnings add column external_id text;                    -- id de actividad de Garmin
create unique index trainnings_external_id_unique on trainnings(external_id) where external_id is not null;
```

### Tabla `garmin_gear_mapping` (nueva — ver Backend punto 6 para el porqué)
```sql
create table garmin_gear_mapping (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  garmin_gear_uuid text not null,
  shoes_label text not null,
  created_at timestamptz default now(),
  unique (user_id, garmin_gear_uuid)
);
```
Guarda, por usuario y por par de zapatillas de Garmin, el texto exacto que se debe escribir en `trainnings.shoes` — evita que el sync invente un string distinto al que el usuario ya usa a mano para la misma zapatilla física.

### Cambios en `Models/`
- `Users.cs` / `UsersDto.cs`: agregar `GarminUsername`, `GarminPasswordEnc` (con `[JsonIgnore]` en el DTO de salida, igual que se hizo con `PasswordHash`), `GarminLastSync`.
- `Trainnings.cs` / `TrainningDto.cs` / `TrainningResponseDto.cs`: agregar `Source` y `ExternalId` (opcionales, default `"manual"` / `null`).

---

## Backend

### 1. Nuevo paquete NuGet
No hay SDK oficial de Garmin para .NET. Se usa `HttpClient` estándar (ya disponible) para replicar el flujo de login + consulta de actividades. No hace falta instalar nada nuevo salvo, opcionalmente, algo para manejo de cookies/CSRF si el login lo requiere (`HttpClientHandler` con `CookieContainer` alcanza).

### 2. `Services/GarminService.cs` (nuevo, Scoped)
Responsabilidades:
- `ConnectAsync(Guid userId, string garminEmail, string garminPassword)`: valida login contra Garmin (endpoint tipo `https://sso.garmin.com/sso/signin` + `connectapi.garmin.com`), y si es exitoso, guarda `garmin_username` + `garmin_password_enc` (encriptado) en `Users`. Si Garmin devuelve MFA/CAPTCHA, propagar error claro al frontend en vez de fallar silenciosamente.
- `SyncActivitiesAsync(Guid userId, DateTime fromDate)`:
  1. Desencripta credenciales guardadas, hace login contra Garmin.
  2. Llama al endpoint de actividades (`activitylist-service/activities/search/activities?startDate={fromDate:yyyy-MM-dd}&...`) — Garmin permite filtrar por rango de fechas server-side, así que **`fromDate` se manda directo en la query**, no se filtra en memoria.
  3. **Filtra solo las dos disciplinas que interesan hoy** (allowlist explícita, todo lo demás —ciclismo, natación, fuerza, etc.— se descarta sin importar):
     - `activityType.typeKey == "treadmill_running"` → mapea a `Location = "Treadmill"`
     - `activityType.typeKey == "running"` (o variantes tipo `trail_running`, `street_running`, `track_running`) → mapea a `Location = "Outdoor"`
     - Cualquier otro `typeKey` (`cycling`, `lap_swimming`, `strength_training`, `indoor_cardio`, `walking`, etc.) se ignora explícitamente y se cuenta aparte en el resumen (`skippedOtherDiscipline`), para que el usuario vea que no es un error silencioso sino un filtro intencional.
  4. Mapea cada actividad Garmin filtrada → `TrainningDto`:
     - `Kilometers` = `distance` (metros) / 1000
     - `Time` = `duration` (segundos) → formateado a "MM:SS" u "HH:MM:SS"
     - `Pace` = calculado igual que en frontend (`Time / Kilometers`)
     - `Location` = según el mapeo del punto 3 (Treadmill / Outdoor)
     - `Shoes` = resultado del mapeo de gear — ver punto 6 más abajo
     - `Source` = `"garmin"`, `ExternalId` = `activityId` de Garmin
  5. Antes de insertar, hace `GetAsync` filtrando por `external_id` para **saltar duplicados** (idempotente — se puede re-sincronizar el mismo rango sin duplicar).
  6. Las actividades cuyo gear no está resuelto en `garmin_gear_mapping` **no se insertan en este paso** — quedan pendientes hasta que el usuario resuelva el mapeo (ver punto 6 más abajo).
  7. Al terminar, actualiza `garmin_last_sync` en `Users` con `DateTime.UtcNow` (o con la fecha de la actividad más reciente importada) — solo considerando lo efectivamente insertado, no lo pendiente de gear.
  8. Devuelve un resumen: `{ imported: N, skippedDuplicates: M, skippedOtherDiscipline: K, pendingGearResolution: P, fromDate }`.

### 6. Mapeo de `Shoes` (gear de Garmin) — con reconciliación manual, no auto-mapeo

**Problema clave a evitar**: `Shoes` hoy es texto libre tipeado a mano (ej. `"pegasus 39"`, `"Nike Peg 39 negras"`, sin catálogo ni normalización detrás). Si el sync escribe directo el nombre que arma Garmin (`gearMakeName + gearModelName`, ej. `"Nike Pegasus 39"`), ese string casi seguro **no va a coincidir textualmente** con lo que el usuario ya tiene cargado para el mismo par físico → terminarían conviviendo dos "tenis" distintos en los filtros/estadísticas de `ViewData.jsx` para la misma zapatilla real. Auto-mapear ciegamente crea el problema en vez de resolverlo, así que **no se hace matching automático de texto** (ni exacto ni fuzzy) — se resuelve una vez por par de zapatillas, con confirmación del usuario, y se reutiliza esa decisión en cada sync futuro.

**Lo siguiente sobre los endpoints de Garmin está basado en el comportamiento documentado por proyectos comunitarios (`python-garminconnect` y similares) contra la API no oficial, no en documentación propia de Garmin — hay que validarlo contra una cuenta real en Fase 1 antes de darlo por definitivo.**

Endpoints conocidos (no oficiales, mismo dominio `connect.garmin.com` que el resto del sync):
- `GET gear-service/gear/{userProfilePk}` → catálogo completo de gear del usuario (zapatillas, bicicletas, etc.), cada item con algo como `uuid`, `gearTypeName` (ej. `"Shoes"`), `gearMakeName`, `gearModelName`, `displayName`, `customMakeModel`, `gearStatusName` (`"active"`/`"retired"`).
- `GET gear-service/gear/filterGear?activityId={activityId}` → gear específico asociado **a esa actividad puntual** (normalmente un solo par, si el usuario lo marcó en Garmin al guardar la actividad).

#### Tabla nueva: `garmin_gear_mapping`
```sql
create table garmin_gear_mapping (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,           -- mismo valor que trainnings.userid (username)
  garmin_gear_uuid text not null,
  shoes_label text not null,       -- texto EXACTO a escribir en trainnings.shoes
  created_at timestamptz default now(),
  unique (user_id, garmin_gear_uuid)
);
```

#### Flujo de reconciliación
1. Antes (o al inicio) de `SyncActivitiesAsync`, traer el catálogo de gear del usuario (`gear-service/gear/{userProfilePk}`) filtrado a `gearTypeName == "Shoes"`.
2. Comparar contra `garmin_gear_mapping` existente: separar en **gear ya mapeado** (se reutiliza `shoes_label` tal cual) vs. **gear nuevo/sin mapear**.
3. Si hay gear sin mapear, **no seguir con el sync automáticamente para esas actividades** — se devuelve al frontend la lista de gear pendiente de resolver (nombre que le puso Garmin, ej. `"Nike Pegasus 39"`) junto con la lista de valores distintos que el usuario ya usa hoy en `trainnings.shoes` (`SELECT DISTINCT shoes FROM trainnings WHERE userid = ...`), para que el usuario:
   - **a)** lo vincule a un valor existente (ej. elige `"pegasus 39"` de su lista) — de ahí en adelante todo lo importado con ese gear usa ese mismo texto, o
   - **b)** escriba un texto nuevo si es una zapatilla que nunca cargó a mano.
4. Esa elección se guarda una sola vez en `garmin_gear_mapping` (por gear UUID, no por actividad) y se usa para siempre en syncs futuros — es un paso de "primera vez" por par de zapatillas, no algo que se repite en cada sync.
5. Actividades sin ningún gear asociado en Garmin (común si el usuario no lo tildó): `Shoes = ""`, igual que una carga manual sin ese dato.

Con esto, el mapeo del punto 4 de `SyncActivitiesAsync` queda: `Shoes = garmin_gear_mapping[gearUuid].shoes_label` si hay match, `""` si la actividad no tiene gear, y **la actividad se posterga** (no se inserta todavía) si su gear está sin resolver — se importa recién después de que el usuario resuelva el mapeo pendiente.

**Costo/riesgo aparte del de reconciliación**: `filterGear?activityId=` sigue siendo una llamada HTTP **por actividad** (N+1) para saber qué gear tiene cada una — no viene en el listado de `activitylist-service`. Mitigación: aplicar un pequeño delay entre llamadas, y confiar en que el usuario controla el tamaño del sync inicial vía `fromDate`.

**Antes de fijar esto en código** (Fase 1), hay que loguear la respuesta cruda de ambos endpoints de gear contra la cuenta real del usuario, para confirmar nombres de campos exactos y casos borde (zapatilla retirada, gear tipo distinto a "Shoes", actividad sin gear).

### 7. `Controllers/GarminController.cs` (nuevo, `[Authorize]`)
```
POST /api/garmin/connect        body: { garminEmail, garminPassword }
POST /api/garmin/sync           body: { fromDate: "2026-01-01" }   -> requiere haber hecho /connect antes
GET  /api/garmin/status         -> { connected: bool, lastSync: datetime? }
GET  /api/garmin/gear/pending   -> [{ garminGearUuid, garminGearName, activityCount }]  -- gear sin resolver, con nombre que le puso Garmin
GET  /api/garmin/gear/known-shoes -> string[]  -- valores distintos de trainnings.shoes ya usados por el usuario, para el picker
POST /api/garmin/gear/resolve   body: { garminGearUuid, shoesLabel }  -> guarda en garmin_gear_mapping y reintenta insertar las actividades que quedaron pendientes por ese gear
```
El `userId` sale del JWT (`ClaimTypes.Name`), igual que en `TrainningsController`, no del body — así no se puede sincronizar la cuenta de otro usuario.

`gear/pending` y `gear/resolve` son el mecanismo de la sección 6: `POST /sync` corre, importa lo que puede, y deja aparte lo que tiene gear sin resolver; el frontend entonces llama `gear/pending` para mostrarle al usuario qué falta resolver, y por cada uno llama `gear/resolve` con el texto elegido (existente o nuevo) — eso libera esas actividades para que se inserten con el `Shoes` correcto.

### 8. `Program.cs`
```csharp
builder.Services.AddScoped<GarminService>();
builder.Services.AddHttpClient<GarminService>(); // maneja el HttpClient hacia Garmin
```

### 9. Validación de `fromDate`
- Si el usuario no manda `fromDate`, usar `garmin_last_sync` guardado (sync incremental por defecto).
- Si manda un `fromDate` explícito, usarlo tal cual (permite re-importar un rango pasado a propósito).
- Rechazar `fromDate` en el futuro con 400.

---

## Frontend

No existe hoy una página de configuración/perfil — hay que crear una mínima.

### 1. Nuevo componente `components/GarminSync.jsx`
- Si `GET /api/garmin/status` → `connected: false`: mostrar formulario simple (email + password de Garmin) con botón "Conectar cuenta de Garmin" → `POST /api/garmin/connect`.
- Si `connected: true`: mostrar:
  - Última sincronización (`lastSync`, o "nunca" si es null).
  - Input tipo `date` **"Sincronizar desde"**, pre-rellenado con `lastSync` (o vacío si nunca se sincronizó, obligando a elegir fecha la primera vez).
  - Botón **"Sincronizar con Garmin"** → `POST /api/garmin/sync { fromDate }`, muestra loading, y al terminar un resumen: "Se importaron N entrenamientos (M ya existían, K de otra disciplina descartados)".
  - Si el resumen trae `pendingGearResolution > 0`, mostrar un panel/modal de **"Resolver zapatillas"**: por cada item de `GET /api/garmin/gear/pending` (nombre que le puso Garmin + cuántas actividades usan ese gear), un selector con los valores de `GET /api/garmin/gear/known-shoes` más la opción "otro (escribir nuevo)". Al confirmar cada uno, `POST /api/garmin/gear/resolve`; cuando no queda ningún pendiente, esas actividades ya están importadas con el `Shoes` correcto — no hace falta volver a tocar "Sincronizar".
- Manejo de error claro si Garmin pide MFA/CAPTCHA o si el login falla (mensaje: "No se pudo conectar, verificá tus credenciales o si Garmin requiere verificación adicional").

### 2. Navegación
- Agregar opción "Sincronizar" (o "Garmin") en `Sidebar.jsx` y en el `<select>` móvil equivalente de `App.jsx`, junto a Dashboard/Charts/Form/Ver datos.
- Alternativa más liviana: en vez de una sección nueva, poner el botón + date picker directamente arriba de la tabla en `ViewData.jsx` (junto al botón de exportar a Excel) — más simple de implementar pero mezcla configuración de cuenta con vista de datos. **Recomendado: sección propia**, porque guardar credenciales de Garmin es una acción de "configuración de cuenta", no de "ver datos".

### 3. i18n
Agregar claves en `locales/{en,es}/translation.json`: `garmin_connect`, `garmin_sync`, `garmin_sync_from`, `garmin_last_sync`, `garmin_sync_success`, `garmin_connect_error`, etc.

### 4. `Api.jsx`
No requiere cambios — mismo patrón de Axios con interceptor de `Authorization` ya cubre los endpoints nuevos.

---

## Riesgos y alternativa de respaldo

1. **Fragilidad del login no oficial**: Garmin puede cambiar su flujo de autenticación o agregar CAPTCHA sin aviso, rompiendo el sync hasta que se actualice el `GarminService`. No hay SLA ni soporte.
2. **Términos de servicio**: automatizar login con credenciales fuera de la API oficial de partners no está permitido por Garmin. Para un uso personal el riesgo práctico es bajo, pero es una decisión consciente, no un detalle técnico menor.
3. **Guardar password de Garmin**: aunque esté encriptado en reposo, sigue siendo un password de terceros viviendo en la base de datos — superficie de ataque adicional. Alternativa: no persistir el password, pedirlo en cada sync (peor UX, pero cero credenciales guardadas).
4. **Alternativa sin riesgo de ToS**: agregar en cambio un flujo de **"Importar archivo Garmin (.fit/.gpx/.tcx)"** — Garmin permite exportar actividades manualmente desde su web/app de forma 100% oficial. El botón sería "Importar archivo" en vez de "Sincronizar", el usuario sube el archivo y el backend lo parsea (hay librerías .NET para FIT/GPX/TCX). Pierde la automatización de "un click y trae todo desde tal fecha", pero es robusto y sin riesgo legal. Se podría ofrecer como fallback si el sync automático se rompe.

---

## Fases sugeridas

1. **Fase 1 (backend base + validación con cuenta real)**: migraciones en Supabase, `GarminService` con login + fetch de actividades + mapeo de disciplina, `GarminController`, sin frontend aún — probar con Postman/Scalar. Incluye explorar y loguear la respuesta real de `gear-service/gear/filterGear` contra la cuenta de Garmin del usuario para confirmar el mapeo de `Shoes` del punto 6 antes de darlo por definitivo.
2. **Fase 2 (frontend)**: `GarminSync.jsx`, navegación, i18n.
3. **Fase 3 (endurecimiento)**: manejo de MFA/errores de Garmin, ajuste fino del mapeo de gear (casos borde: zapatilla retirada, actividad sin gear, gear tipo distinto a "Shoes"), dedup robusto, control de rate-limit en las llamadas N+1 de gear.
4. **Fase 4 (opcional)**: fallback de importación de archivo FIT/GPX/TCX como respaldo si el login no oficial deja de funcionar.

No se ha escrito código todavía — este documento es la propuesta a validar antes de implementar.
