# Plan: Seguridad del backend

## Estado

- **Revisión: hecha** (2026-10-23). Revisión estática del código de `Backend/RunningWebApi` (controllers, services, modelos, `Program.cs`, configuración, `Dockerfile`) y del historial de git en busca de secretos filtrados.
- **Fase 1: desplegada en producción** (2026-10-23). `Jwt__Key` configurada en Koyeb como secret; verificado desde fuera que el token falso da 401 y que los endpoints eliminados dan 404/405.
- **Fase 2: implementada y probada en local** (2026-10-23), **pendiente de deploy**. Ver "Estado de la Fase 2". **Antes del deploy hay que añadir `Cors__AllowedOrigins` en Koyeb.**
- Fase 3: no implementada.
- Contexto importante: **el repositorio es público** en GitHub y **el registro es abierto** (`POST /api/auth/register`), así que cualquier persona en internet puede obtener un token válido.

## Resumen

| # | Severidad | Hallazgo |
|---|---|---|
| C1 | 🔴 Crítica | Cualquier usuario autenticado puede leer, crear y borrar entrenamientos de **cualquier** usuario |
| C2 | 🔴 Crítica | Cualquier usuario autenticado puede listar todos los usuarios (emails), borrar cuentas y crear cuentas sin contraseña |
| C3 | 🔴 Crítica | **Producción firma los JWT con una clave de ejemplo publicada en el repo**: cualquiera puede fabricar tokens válidos (confirmado) |
| A1 | 🟠 Alta | Sin límite de intentos en login/registro (fuerza bruta, spam de cuentas) |
| A2 | 🟠 Alta | URL + anon key de Supabase públicas en el repo: la seguridad de los datos depende de que RLS esté bien configurado (sin verificar) |
| M1 | 🟡 Media | CORS abierto a cualquier origen |
| M2 | 🟡 Media | Documentación de la API (Scalar/OpenAPI) expuesta en producción |
| M3 | 🟡 Media | JWT sin issuer/audience; el token no contenía el `username` que se usa para filtrar datos |
| M4 | 🟡 Media | Validación de entrada débil o ausente |
| B1 | 🔵 Baja | Datos personales en los logs |
| B2 | 🔵 Baja | Enumeración de usuarios (registro y tiempos de respuesta del login) |
| B3 | 🔵 Baja | HTTPS/HSTS/forwarded headers mal configurados detrás del proxy de Koyeb |
| B4 | 🔵 Baja | Docker: sin `.dockerignore` y el contenedor corre como root |

### Lo que ya está bien

- Contraseñas hasheadas con BCrypt.
- `UsersDto.PasswordHash` tiene `[JsonIgnore]`, así que los hashes nunca salen en las respuestas.
- La service key de Supabase solo está en variables de entorno y **no aparece en el historial de git**. En el historial solo aparecen la anon key, pública por diseño (ver A2), y la clave JWT de ejemplo (ver C3).
- El token valida la expiración y dura 1 hora.
- `UseDeveloperExceptionPage` solo se activa en desarrollo.
- Las dependencias están al día y sin vulnerabilidades conocidas (actualizadas el 2026-10-23).

---

## Hallazgos

### C1 — Control de acceso roto en entrenamientos 🔴

`TrainningsController` tiene `[Authorize]`, pero **nunca compara al usuario del token con los datos que pide o modifica**. El `userId` viene de la URL o del body, y el frontend lo saca de `localStorage`, que el usuario puede editar.

| Endpoint | Problema |
|---|---|
| `GET /api/trainnings` | Devuelve **todos** los entrenamientos de todos los usuarios, con sus IDs. El frontend no lo usa. |
| `GET /api/trainnings/{id}` | Devuelve cualquier entrenamiento. |
| `GET /api/trainnings/user/{userId}` (+ `/year/{year}`, `/years`) | Cualquiera puede consultar los datos de otro usuario cambiando el `username` en la URL. |
| `POST /api/trainnings` | `UserId` viene del body (`TrainningDto.UserId`), así que se pueden crear entrenamientos a nombre de otro. |
| `DELETE /api/trainnings/{id}` | Borra cualquier entrenamiento, sin comprobar el dueño. |

**Ataque posible:** registrarse → login → `GET /api/trainnings` (lista todo con IDs) → `DELETE` de cada uno. Se podría **borrar la base de datos de entrenamientos completa** con un script.

Archivos: `Controllers/TrainningsController.cs`, `Services/TrainningService.cs`, `Models/TrainningDto.cs`.

### C2 — `UsersController` abierto a cualquier usuario 🔴

`UsersController` solo exige estar autenticado; no hay roles. El frontend **no lo usa**: el registro va por `/api/auth/register`.

| Endpoint | Problema |
|---|---|
| `GET /api/users` | Lista todos los usuarios con **username y email**. |
| `GET /api/users/{id}` | Datos de cualquier usuario. |
| `DELETE /api/users/{id}` | **Borra la cuenta de cualquier usuario.** |
| `POST /api/users` | Crea cuentas. Como `UsersDto.PasswordHash` tiene `[JsonIgnore]`, la contraseña nunca se recibe del body y se hashea un string vacío. `LoginRequest` no exige contraseña, así que esas cuentas **probablemente aceptan login con contraseña vacía**. |

Archivos: `Controllers/UsersController.cs`, `Services/UserService.cs`, `Models/LoginRequest.cs`.

### C3 — Clave JWT pública en producción 🔴

`appsettings.json` (en git, repo público) contenía `"Jwt": { "Key": "TuClaveSecretaMuySeguraMayorA32Caracteres" }`. En Koyeb **no está configurado `Jwt__Key`**, así que producción usa esa clave.

**Confirmado el 2026-10-23:** un token fabricado y firmado con esa clave fue aceptado por `https://running-backend.koyeb.app` (HTTP 200; sin token, 401). Cualquiera que lea el repo puede fabricar un token y, combinado con C1 y C2, leer o borrar todos los datos **sin siquiera registrarse**.

Además, en local la clave de `.env` nunca se aplicaba, porque `Env.Load()` se ejecutaba después de `WebApplication.CreateBuilder`, cuando la configuración ya estaba construida.

### A1 — Sin rate limiting 🟠

`POST /api/auth/login` y `POST /api/auth/register` no limitan intentos. Con contraseñas de mínimo 6 caracteres, un ataque de fuerza bruta contra un usuario conocido es viable, y se pueden crear miles de cuentas para llenar la base de datos.

### A2 — Supabase: URL y anon key públicas; RLS sin verificar 🟠

`appsettings.json` está en git (repo público) y contiene la URL del proyecto de Supabase y la **anon key**. El código del backend no las usa: usa la service key desde el entorno. La anon key es pública por diseño, pero con ella **cualquiera puede llamar directamente a la API REST de Supabase**, saltándose el backend. Lo único que protege las tablas `Users` (con los hashes de contraseñas) y `Trainnings` es **Row Level Security**.

El commit `22b2c40 rsl problem in supabase` sugiere que RLS está activado (por eso el backend pasó a usar la service key), pero hay que **confirmar** que:
- RLS está activado en **todas** las tablas.
- No existen políticas que den acceso al rol `anon` (ni a `authenticated`, ya que no usas Supabase Auth).

### M1 — CORS abierto 🟡

`AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()`. Como el token va en el header `Authorization` y no en cookies, no hay CSRF clásico. Aun así, cualquier web puede llamar a la API desde el navegador de una víctima si consigue el token. Lo correcto es limitarlo al dominio de Vercel y a `localhost` en desarrollo.

### M2 — Scalar/OpenAPI en producción 🟡

`app.MapOpenApi()` y `app.MapScalarApiReference()` se mapean "en todos los entornos". Publica el mapa completo de la API, incluidos los endpoints vulnerables de C1 y C2, y facilita el ataque.

### M3 — Configuración del JWT 🟡

- `ValidateIssuer = false` y `ValidateAudience = false`. Hoy es aceptable con un solo servicio, pero conviene fijarlos.
- El token lleva `ClaimTypes.Name = user.Id` (Guid) y el email, **pero no el `username`**. Los entrenamientos se guardan por username (`userid` = username), así que para corregir C1 el backend necesita saber el username del token.
- La clave de producción resultó ser la de ejemplo: ver C3.

### M4 — Validación de entrada 🟡

- `LoginRequest`: sin `[Required]`, acepta usuario y contraseña vacíos.
- `TrainningDto`: sin validación. Se aceptan kilómetros negativos, fechas absurdas y strings de cualquier tamaño en `Time`, `Pace`, `Shoes` y `Location`.
- `RegisterRequest`: contraseña de mínimo 6 caracteres; `Username` sin límites de tamaño ni de caracteres.

### B1 — Datos personales en logs 🔵

- `GetByEmailAsync` y `GetByUsernameAsync` loguean emails y usernames en cada login o registro.
- `TrainningService.GetAsync` loguea **cada entrenamiento** de la base.
- `TrainningService.cs:248` serializa la petición completa en el log de error.

### B2 — Enumeración de usuarios 🔵

- El registro devuelve 409 "usuario o correo ya está en uso", lo que confirma si un email está registrado. Es común y aceptable en apps pequeñas, pero hay que saberlo.
- El login no ejecuta BCrypt cuando el usuario no existe, así que responde más rápido. Midiendo tiempos se puede saber qué usernames existen.

### B3 — HTTPS detrás de Koyeb 🔵

Kestrel solo escucha en el puerto 80 y Koyeb termina el TLS. `UseHttpsRedirection()` no tiene puerto HTTPS al que redirigir, y sin `UseForwardedHeaders()` la app no sabe que la petición original llegó por HTTPS. Tampoco hay HSTS.

### B4 — Docker 🔵

- No hay `.dockerignore`. Un `docker build` local copiaría `Backend/RunningWebApi/.env` (con la service key) y `bin/`/`obj/` dentro de la imagen. Koyeb construye desde git, así que en producción no pasa, pero es un riesgo si alguna vez se construye y publica una imagen desde tu máquina.
- El contenedor corre como root en el puerto 80. Las imágenes de .NET 8+ traen el usuario `app` y usan el puerto 8080 por defecto.

### Nota fuera de alcance (frontend)

El JWT se guarda en `localStorage`. Si alguna vez hubiera una vulnerabilidad XSS en el frontend, el token podría robarse. Con React el riesgo es bajo mientras no se use `dangerouslySetInnerHTML`.

---

## Estado de la Fase 1

Implementado en código (pendiente de commit y deploy):

| Paso | Estado |
|---|---|
| 1. Claim `username` en el token | ✅ `AuthService.cs` |
| 2. `TrainningsController` atado al usuario del token | ✅ 403 si la URL es de otro usuario; `POST` usa el usuario del token; `GET/DELETE {id}` de otro → 404; eliminado `GET /api/trainnings`; un token sin `username` → 401 (el frontend cierra sesión solo) |
| 3. `UsersController` | ✅ Eliminado (y los métodos sin uso de `UserService`) |
| 4. Cuentas con contraseña vacía | ✅ Revisado: 0 de 1 usuarios. `LoginRequest` ahora exige usuario y contraseña |
| 5. RLS en Supabase | ✅ Lectura con la anon key pública → 0 filas en `Users` y `Trainnings`. ⚠️ Falta revisar `pg_policies` para descartar políticas de **escritura** para `anon` (no se probó escribir en producción) |
| 6. `Jwt__Key` | ❌ **No configurada en Koyeb** (C3). Se quitó la clave de ejemplo de `appsettings.json` y se movió `Env.Load()` antes de `CreateBuilder` |

Pruebas en local contra Supabase con dos usuarios de prueba, que se borraron al terminar: las 10 comprobaciones de "Cómo verificar" dieron el resultado esperado, incluido el 401 con un token sin `username`.

### ⚠️ Orden obligatorio del deploy

Como `appsettings.json` ya no trae clave, **si se despliega el código sin `Jwt__Key` en Koyeb, el login y todos los endpoints protegidos fallan con 500**.

1. Generar una clave: `openssl rand -base64 64`.
2. Koyeb → servicio → Environment variables → añadir `Jwt__Key` como **secret** y redeployar. Esto ya cierra C3 con el código actual, y todas las sesiones se cierran.
3. Comprobar que la app de Vercel sigue funcionando (login y ver datos).
4. Hacer push del código de la Fase 1 y volver a probar la app.
5. Opcional: revisar los logs de Koyeb en busca de accesos con usernames desconocidos. No hay forma de saber si alguien usó la clave pública antes.

## Estado de la Fase 2

| Paso | Estado |
|---|---|
| 7. Rate limiting | ✅ `AuthController` (login y registro): 5 peticiones por minuto por IP, 429 al superarlo. `UseForwardedHeaders` toma la IP real de `X-Forwarded-For` (último salto). El frontend muestra "Demasiados intentos" con un 429 |
| 8. CORS | ✅ Política `Frontend` con los orígenes de `Cors__AllowedOrigins` (separados por comas; se quita la `/` final). En Development, por defecto `http://localhost:5173`. Fuera de Development, sin la variable la app **no arranca** |
| 9. Scalar/OpenAPI | ✅ Solo en Development |
| 10. Validación | ✅ `LoginRequest` (longitud máxima), `RegisterRequest` (username `^[A-Za-z0-9_.-]{3,50}$`, contraseña de 8 a 128 caracteres; el frontend también exige 8) y `TrainningDto` (km entre 0.01 y 500, tiempo `M:SS`, fecha entre el año 2000 y hoy, longitud máxima de los textos) |

Pruebas en local contra Supabase: 17 de 17 correctas (CORS por origen, validaciones, entrenamiento válido con el formato del frontend, rate limit por IP, el 429 lleva cabecera CORS). Los datos de prueba se borraron.

**No verificable en local:** que Koyeb envíe en `X-Forwarded-For` la IP real del cliente como último salto. Si no fuera así, todos los clientes compartirían el límite de 5 por minuto. Se comprueba tras el deploy.

### Orden del deploy

1. Koyeb → servicio → Settings → Environment variables → añadir `Cors__AllowedOrigins` (Plaintext) = `https://running-project.vercel.app,http://localhost:5173` → Save and deploy. Con el código actual no cambia nada (todavía no lee la variable).
2. Push del código de la Fase 2.
3. Si el deploy queda Unhealthy con "Falta la variable de entorno requerida: Cors__AllowedOrigins", el paso 1 no se aplicó. Koyeb mantiene el deployment anterior.

---

## Plan de corrección

### Fase 1 — Urgente (C1, C2, A2)

1. **Añadir el username al token** (`AuthService.AuthenticateAsync`):
   - `ClaimTypes.NameIdentifier` = `user.Id`, y un claim `username` = `user.Username` (o `ClaimTypes.Name` = username).
   - Los tokens actuales dejan de servir para los endpoints corregidos. Duran 1 hora, así que basta con volver a iniciar sesión.

2. **Corregir `TrainningsController`**:
   - Obtener el username del token con `User.FindFirstValue("username")`.
   - `GET user/{userId}`, `/year/{year}` y `/years`: si `userId != username del token` → `403 Forbid()`. Así el frontend sigue funcionando sin cambios.
   - `POST`: ignorar `TrainningDto.UserId` y asignar el username del token. Quitar `UserId` del DTO.
   - `GET {id}` y `DELETE {id}`: cargar el entrenamiento y comprobar que `UserId == username del token`. Si no coincide, devolver `404`, para no revelar que existe.
   - `GET /api/trainnings` (sin filtro): **eliminarlo**, porque el frontend no lo usa.
   - Más adelante, opcional: cambiar las rutas a `/api/trainnings/me/...` y quitar el username de la URL. Esto sí requiere cambios en el frontend.

3. **Cerrar `UsersController`**:
   - El frontend no lo usa, así que la opción recomendada es **eliminarlo**. Si hace falta, crear solo `GET /api/users/me`, que devuelva el usuario del token.
   - Alternativa: protegerlo con un rol de administrador (`[Authorize(Roles = "admin")]`) y añadir el claim de rol al token.

4. **Buscar cuentas con contraseña vacía** creadas por `POST /api/users`:
   - Script puntual en local: para cada usuario, `BCrypt.Verify("", PasswordHash)`. Si da `true`, eliminar o bloquear la cuenta.
   - Añadir `[Required]` a `LoginRequest` (adelanta parte de M4).

5. **Verificar RLS en Supabase** (panel → Authentication → Policies, o el SQL Editor):
   ```sql
   select tablename, rowsecurity from pg_tables where schemaname = 'public';
   select * from pg_policies where schemaname = 'public';
   ```
   - Hay que confirmar que `rowsecurity = true` en todas las tablas y que no hay políticas para `anon` ni `authenticated`.
   - Prueba desde fuera, con la anon key pública: `GET https://<proyecto>.supabase.co/rest/v1/Users?select=*` con los headers `apikey` y `Authorization: Bearer <anon key>`. Debe devolver `[]` o un error, **nunca filas**.
   - Quitar la sección `Supabase` de `appsettings.json`, porque el código no la usa.

6. **Verificar `Jwt__Key` en Koyeb**: que sea aleatoria y de 64 caracteres o más, y que no sea el valor de ejemplo. Si hay dudas, rotarla con `openssl rand -base64 64`. Rotarla solo cierra las sesiones activas.

### Fase 2 — Endurecimiento (A1, M1, M2, M4)

7. **Rate limiting** con el middleware nativo de .NET (`builder.Services.AddRateLimiter`):
   - Política para `/api/auth/*`, por ejemplo 5 intentos por minuto por IP.
   - Detrás de Koyeb, la IP real llega en `X-Forwarded-For`, así que hay que configurar `UseForwardedHeaders` (ver paso 12) para que la partición por IP funcione.
8. **CORS**: política con `WithOrigins("https://<tu-app>.vercel.app")`, más `http://localhost:5173` solo en desarrollo. Leer los orígenes desde configuración o variables de entorno.
9. **Scalar/OpenAPI solo en desarrollo**: mover `MapOpenApi()` y `MapScalarApiReference()` dentro del `if (app.Environment.IsDevelopment())`.
10. **Validación**:
    - `LoginRequest`: `[Required]`, `[MaxLength]`.
    - `TrainningDto`: `[Range]` para `Kilometers`, `[MaxLength]` en los strings y validación de fecha.
    - `RegisterRequest`: `Username` con `[MaxLength]` y `[RegularExpression]`; subir la contraseña a 8 caracteres o más.

### Fase 3 — Mejoras (M3, B1–B4)

11. **JWT**: fijar `ValidIssuer` y `ValidAudience` y activar su validación; poner `ClockSkew` en 1 minuto.
12. **Proxy/HTTPS**: añadir `UseForwardedHeaders` (con `XForwardedFor | XForwardedProto`) y `UseHsts()` en producción; revisar si `UseHttpsRedirection` hace falta detrás de Koyeb.
13. **Logs**: quitar emails, usernames y datos de entrenamientos de los logs de nivel `Information`; no serializar la petición completa en `TrainningService.cs:248` (esto también desbloquea la migración a Supabase 8.x).
14. **Enumeración**: en el login, ejecutar `BCrypt.Verify` contra un hash ficticio cuando el usuario no existe, para igualar los tiempos.
15. **Docker**: crear `.dockerignore` (`**/.env`, `**/bin`, `**/obj`, `**/appsettings.Development.json`); usar `USER app` y el puerto 8080, y actualizar el puerto en Koyeb.

---

## Cómo verificar (sin staging)

Como Koyeb + Supabase es producción, las pruebas se hacen con **el backend en local contra Supabase**, con **dos usuarios de prueba** que se borran al terminar.

1. Registrar `test_a` y `test_b`, y hacer login con los dos.
2. Con el token de `test_a`:
   - `GET /api/trainnings/user/test_b` → **403**.
   - `POST /api/trainnings` con `UserId = "test_b"` en el body → se crea a nombre de `test_a`.
   - `DELETE` de un entrenamiento de `test_b` → **404**, y el entrenamiento sigue existiendo.
   - `GET /api/trainnings`, `GET /api/users` y `DELETE /api/users/{id}` → **404** (endpoints eliminados).
3. Flujo normal de `test_a`: ver datos, filtrar por año, crear y borrar sus propios entrenamientos → todo funciona.
4. Más de 5 logins fallidos en un minuto → **429**.
5. Probar el frontend en local (`npm run dev`) con `test_a`: dashboard, gráficos, ver datos, exportar y borrar.
6. Borrar `test_a`, `test_b` y sus entrenamientos de Supabase.
7. Después del deploy: comprobar que `/scalar/v1` responde 404 en producción y que la app de Vercel sigue funcionando.
