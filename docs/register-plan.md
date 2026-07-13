# Plan: Registro de usuarios nuevos

## Estado de implementación

- **Backend: implementado y probado** (`RegisterRequest`, `POST /api/auth/register`, `AuthService.RegisterAsync`, `UserService.GetByEmailAsync`). Probado manualmente contra el backend local + Supabase real: registro exitoso (200), login con la cuenta nueva (200 + JWT), registro duplicado (409), validación de datos inválidos (400). Usuario de prueba eliminado después de la prueba.
- **Frontend: implementado**. `Login.jsx` y `Register.jsx` ahora se enlazan entre sí (`onSwitchToRegister` / `onSwitchToLogin`), `Register.jsx` llama a `/api/auth/register`, usa i18n, `icon.svg`, estado de carga y maneja el 409 con un mensaje específico. Verificado con `npm run build` (compila sin errores). **No se pudo probar en un navegador real** (no hay herramienta de automatización de navegador disponible en este entorno) — falta una pasada manual en el navegador antes de dar el flujo por completamente cerrado.
- Nota aparte: no hay archivo de configuración de ESLint en el repo (`npm run lint` falla con "ESLint couldn't find a configuration file"). Es preexistente, no introducido por este trabajo — no se tocó.

## Estado actual (diagnóstico)

`Login.jsx` no tiene ningún enlace/botón hacia el registro. Sin embargo, ya existe código parcial:

- `App.jsx` ya maneja el estado `isRegistering` y renderiza `<Register onRegisterSuccess={...} />`, y ya pasa `onSwitchToRegister` a `<Login>` — pero **`Login.jsx` no usa esa prop** (no hay botón que la invoque).
- `Register.jsx` existe y hace `POST /api/users`, pero **no funciona hoy**:
  1. `UsersController` tiene `[Authorize]` a nivel de clase y ninguna acción tiene `[AllowAnonymous]` → un usuario no autenticado recibe **401** antes de llegar al controlador.
  2. Incluso si estuviera autenticado, `UsersDto.PasswordHash` tiene `[JsonIgnore]`, lo que en System.Text.Json bloquea la propiedad tanto en serialización como en deserialización → **la contraseña nunca se bindea desde el body**, así que `UserService.CreateAsync` siempre hashea un string vacío.
  3. `UserService.CreateAsync` no valida usuario/email duplicados a nivel de aplicación (dependería de una constraint única en la tabla de Supabase, si existe).
- `Register.jsx` no usa `i18n` (textos hardcodeados en español), aunque ya existen las claves `register_account`, `email`, `success_register`, `error_register`, `register_button` en `es`/`en` `translation.json`.
- No existe `onSwitchToLogin` en `Register.jsx` para volver al login.

Conclusión: hace falta trabajo tanto en backend (endpoint público real de registro) como en frontend (conectar el botón en Login, arreglar el DTO/llamada, volver a Login desde Register, i18n).

## Backend

### 1. Nuevo DTO de registro
Crear `Models/RegisterRequest.cs`:
```csharp
public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
```
(Con `Password` como propiedad normal, no `[JsonIgnore]`, para que sí se bindee desde el body.)

### 2. Endpoint público `POST /api/auth/register`
Agregar a `AuthController` (ya es público, sin `[Authorize]`, así que no hace falta `[AllowAnonymous]`):
```csharp
[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] RegisterRequest request)
{
    var result = await _authService.RegisterAsync(request.Username, request.Email, request.Password);

    if (result == null)
        return Conflict(new { message = "El usuario o correo ya está en uso." });

    return Ok(new { message = "Usuario registrado exitosamente." });
}
```
Alternativa más simple: loguear automáticamente al usuario tras registrarse, devolviendo un JWT igual que `/login` (mejor UX, evita un segundo POST inmediato desde el frontend). Recomendado si se quiere evitar que el usuario tenga que loguearse manualmente después de registrarse.

### 3. Lógica de negocio en `AuthService`/`UserService`
- Agregar `AuthService.RegisterAsync(username, email, password)`:
  - Verifica duplicados llamando a `UserService.GetByUsernameAsync` (y agregar un `GetByEmailAsync` en `UserService` para chequear también el email).
  - Si ya existe, retorna `null`.
  - Si no, llama a `UserService.CreateAsync` con una versión corregida del DTO (ver abajo) y opcionalmente genera el JWT igual que `AuthenticateAsync`.
- Corregir `UserService.CreateAsync` para que reciba la contraseña en texto plano de forma explícita en vez de reusar el campo `PasswordHash` del `UsersDto` (que está `[JsonIgnore]`). Opciones:
  - Cambiar la firma a `CreateAsync(string username, string email, string password)`, o
  - Agregar un parámetro `string plainPassword` separado.
- Mantener el trabajo de hash con `BCrypt.Net.BCrypt.HashPassword(...)` (ya existe, funciona bien).
- Validación mínima: username/email no vacíos, longitud mínima de password (p.ej. 6-8 caracteres), formato de email básico. Puede hacerse con Data Annotations en `RegisterRequest` (`[Required]`, `[EmailAddress]`, `[MinLength(6)]`) + `ModelState.IsValid` en el controller, ya que ASP.NET Core valida automáticamente con `[ApiController]`.

### 4. `UsersController.Create` (POST /api/users)
Dejarlo como está (protegido, para administración/gestión de usuarios ya autenticados), o eliminarlo si no se usa para nada más — no es el endpoint que debe usar el flujo de registro público. **No** quitarle `[Authorize]`.

## Frontend

### 1. `Login.jsx`
- Aceptar la prop `onSwitchToRegister` (ya la pasa `App.jsx`, solo falta usarla).
- Agregar un enlace/botón debajo del form o del botón de submit, ej.:
  ```jsx
  <p className="text-center text-sm text-gray-500 mt-4">
    {t("no_account")}{" "}
    <button
      type="button"
      onClick={onSwitchToRegister}
      className="text-indigo-600 font-semibold hover:underline"
    >
      {t("register")}
    </button>
  </p>
  ```
- Agregar la clave `no_account` a `translation.json` (es: "¿No tienes una cuenta?", en: "Don't have an account?").

### 2. `Register.jsx`
- Aceptar y usar `onSwitchToLogin` (agregar la prop en `App.jsx` también: `<Register onRegisterSuccess={...} onSwitchToLogin={() => setIsRegistering(false)} />` — nota: `onRegisterSuccess` ya hace `setIsRegistering(false)`, pero conviene un botón explícito "Volver a iniciar sesión" para cancelar sin registrarse).
- Cambiar el POST de `/api/users` a `/api/auth/register`.
- Ajustar el body enviado: `{ username, email, password }` (ya coincide con el `RegisterRequest` propuesto).
- Reemplazar textos hardcodeados por `useAppTranslation()` + las claves ya existentes (`register_account`, `email`, `success_register`, `error_register`, `register_button`, y `username`/`password` que ya existen).
- Reemplazar el ícono `Footprints` por `<img src="/icon.svg" ... />` (igual que se hizo en `Login.jsx` y `App.jsx`, para consistencia — `Footprints`/`lucide-react` ya no debería usarse en ningún componente).
- Manejo de error 409 (conflicto por duplicado) para mostrar un mensaje específico (ej. "El usuario o correo ya existe") en vez del genérico `error_register`.
- Estado de carga (`isLoading`) igual que en `Login.jsx`, ya que hoy `Register.jsx` no deshabilita el botón/inputs durante el submit.

### 3. Traducciones
Agregar a `es/translation.json` y `en/translation.json`:
```json
"no_account": "¿No tienes una cuenta?",      // "Don't have an account?"
"has_account": "¿Ya tienes una cuenta?",      // "Already have an account?"
"back_to_login": "Volver a iniciar sesión",   // "Back to login"
"user_or_email_taken": "El usuario o correo ya está en uso." // "Username or email is already taken."
```

## Orden sugerido de implementación
1. ~~Backend: `RegisterRequest` DTO + `POST /api/auth/register` + `AuthService.RegisterAsync` + ajuste de `UserService.CreateAsync`/duplicado.~~ ✅ Hecho.
2. ~~Frontend: conectar `Login.jsx` → `Register.jsx` (botones de ida y vuelta).~~ ✅ Hecho.
3. ~~Frontend: corregir `Register.jsx` para llamar al nuevo endpoint, agregar i18n, ícono, loading state, manejo de 409.~~ ✅ Hecho.
4. Probar manualmente el flujo completo en un navegador real (pendiente — solo se probó a nivel de API con curl).

---

# Plan: Recuperar contraseña vía código de recuperación (pendiente de revisión — no implementado)

## Enfoque elegido

En vez de correo (requiere proveedor externo, dominio verificado, más variables de entorno), se usa un **código de recuperación** tipo "backup code" (igual al patrón de códigos de respaldo de 2FA de Google/GitHub):

- Al registrarse, el backend genera un código aleatorio de alta entropía y lo devuelve **una sola vez** en la respuesta del registro.
- El usuario debe guardarlo en un lugar seguro (gestor de contraseñas, papel, etc.) — no se puede volver a ver.
- Para resetear la contraseña, el usuario ingresa `username` + `código de recuperación` + `nueva contraseña`.
- Al resetear exitosamente, se genera y devuelve un **código nuevo** (el anterior queda invalidado), para que el usuario pueda seguir usando la función si vuelve a olvidar su contraseña.

**Tradeoff principal:** si el usuario pierde el código, no hay recuperación de self-service — quedaría igual que hoy (sin ninguna función de recuperación), y requeriría una intervención manual directa en Supabase. Es un balance razonable para una app de uso personal/grupo pequeño, y evita depender de un proveedor de email externo.

## Backend

### 1. Esquema de datos (cambio manual en Supabase, sin ORM/migraciones)
Agregar una columna nueva a la tabla `users`:
- `recovery_code_hash` (`text`, nullable) — se guarda hasheado con BCrypt, igual que `password_hash`.

Los usuarios que ya existen (registrados antes de este cambio) tendrán `recovery_code_hash = null` — no van a poder usar "recuperar contraseña" hasta que se les genere uno (ver punto 5).

### 2. `Models/Users.cs` y `Models/UsersDto.cs`
Agregar la propiedad `RecoveryCodeHash` (con `[Column("recovery_code_hash")]` en la entidad, y `[JsonIgnore]` en el DTO — mismo patrón que `PasswordHash`, nunca debe salir en una respuesta JSON normal).

### 3. Generación del código
Usar `RandomNumberGenerator` (no `Guid.NewGuid()`, que no es para secretos) para generar bytes aleatorios y codificarlos en un formato legible, ej. Base32 en grupos de 4 separados por guion: `K7F2-9QXR-3MPZ-8LNH` (~80 bits de entropía, suficiente para no ser adivinable por fuerza bruta razonable). Un método helper en `AuthService` o un nuevo `RecoveryCodeService` pequeño.

### 4. Cambios en `AuthService`
- `RegisterAsync` ahora también genera el código de recuperación, lo hashea, lo guarda junto con el usuario nuevo, y **devuelve el código en texto plano** al llamador (cambiar el tipo de retorno de `bool` a algo como `(bool Success, string? RecoveryCode)` o una clase de resultado pequeña).
- Nuevo método `ResetPasswordAsync(string username, string recoveryCode, string newPassword)`:
  - Busca el usuario por username (`GetByUsernameAsync`).
  - Si no existe, o `BCrypt.Verify(recoveryCode, user.RecoveryCodeHash)` falla → retorna `null`/failure (mensaje genérico, sin distinguir cuál fue el problema, mismo criterio que login).
  - Si es válido: hashea la nueva contraseña, genera **un nuevo** código de recuperación, actualiza ambos campos (`password_hash` y `recovery_code_hash`) en Supabase, y devuelve el nuevo código en texto plano.

### 5. Nuevo método en `UserService`
`UpdatePasswordAndRecoveryCodeAsync(Guid id, string newPasswordHash, string newRecoveryCodeHash)` — update directo sobre la fila existente (patrón similar a `DeleteAsync`, con `.Filter("id", ...).Update(...)`).

### 6. Nuevos endpoints en `AuthController` (públicos, sin `[Authorize]`)
```csharp
[HttpPost("reset-password")]
public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
{
    var result = await _authService.ResetPasswordAsync(
        request.Username, request.RecoveryCode, request.NewPassword);

    if (result == null)
        return Unauthorized(new { message = "Usuario o código de recuperación inválido." });

    return Ok(new { message = "Contraseña actualizada.", recoveryCode = result });
}
```
Y ajustar `Register` para incluir el código en la respuesta:
```csharp
return Ok(new { message = "Usuario registrado exitosamente.", recoveryCode = result.RecoveryCode });
```

### 7. Nuevo DTO `Models/ResetPasswordRequest.cs`
```csharp
public class ResetPasswordRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string RecoveryCode { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;
}
```

### 8. Seguridad
- Respuesta genérica sin distinguir "usuario no existe" vs "código incorrecto" (evita enumeración de usuarios).
- Rate limiting básico en `reset-password` recomendable (fuerza bruta sobre el código) — hoy el backend no tiene rate limiting en ningún endpoint, sería la primera vez que se necesita; puede quedar como mejora futura si el volumen de usuarios no lo amerita todavía.
- El código nunca se loguea ni se persiste en texto plano, solo su hash.

## Frontend

### 1. `Register.jsx` — nueva pantalla de confirmación tras registrarse
Hoy, al registrarse exitosamente se vuelve directo a Login. Con el código de recuperación, hace falta un paso intermedio:
- Tras el 200 de `/api/auth/register`, mostrar el código recibido en una tarjeta destacada (fuente monoespaciada, tamaño grande) con:
  - Advertencia clara: "Guarda este código en un lugar seguro. No podrás verlo de nuevo." (traducido)
  - Botón "Copiar" (usa `navigator.clipboard.writeText`).
  - Un botón "Ya guardé mi código, continuar" que recién ahí llama a `onRegisterSuccess()` (o `onSwitchToLogin()`) — para no dejar que se pierda el código por accidente antes de leerlo.

### 2. `Login.jsx`
Agregar un enlace "¿Olvidaste tu contraseña?" cerca del campo de password, que cambie a una nueva vista `ResetPassword`.

### 3. Nuevo componente `ResetPassword.jsx`
Formulario: `username`, `código de recuperación`, `nueva contraseña`. Al enviar, `POST /api/auth/reset-password`. Si es exitoso, muestra el **nuevo** código de recuperación con la misma UI de "guárdalo" que en `Register.jsx` (se puede extraer un componente pequeño compartido, ej. `RecoveryCodeDisplay.jsx`, para no duplicar esa pantalla), y luego vuelve a Login.

### 4. `App.jsx`
Agregar el estado de navegación necesario para la nueva vista (mismo patrón que `isRegistering`), ej. `isResettingPassword`, y pasar los callbacks correspondientes a `Login` y al nuevo componente.

### 5. Traducciones
Nuevas claves: `forgot_password`, `recovery_code`, `new_password`, `reset_password_button`, `save_recovery_code_warning`, `copy_code`, `code_copied`, `confirm_code_saved`, `reset_password_success`, `invalid_reset_credentials`.

## Preguntas para revisar antes de implementar
1. ¿Formato del código está bien (grupos Base32 tipo `XXXX-XXXX-XXXX-XXXX`), o preferís algo más corto/fácil de transcribir a mano (con menos entropía)?
2. ¿Usuarios ya existentes sin `recovery_code_hash` quedan simplemente sin poder usar esta función hasta que alguien (vos, manualmente) les resetee la contraseña por Supabase? ¿O vale la pena un flujo para que generen su código la próxima vez que inicien sesión?
3. ¿Extraemos la pantalla "guarda tu código" como componente compartido entre `Register.jsx` y `ResetPassword.jsx`, o se duplica el JSX (más simple, menos abstracción)?
