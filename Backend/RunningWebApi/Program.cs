using System.Text;
using System.Threading.RateLimiting;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RunningWebApi.Services;
using Scalar.AspNetCore;

// Cargar variables de entorno desde el archivo .env (solo en desarrollo local).
// Debe ir antes de CreateBuilder para que la configuración (p. ej. Jwt__Key) las vea.
if (File.Exists(".env"))
{
    Env.Load();
}

var builder = WebApplication.CreateBuilder(args);

// Validar variables de entorno críticas al arrancar
var requiredVars = new[] { "SUPABASE_URL", "SUPABASE_SERVICE_KEY" };
var missingVars = requiredVars
    .Where(v => string.IsNullOrEmpty(Environment.GetEnvironmentVariable(v)))
    .ToList();
if (missingVars.Count > 0)
{
    throw new InvalidOperationException(
        $"Faltan variables de entorno requeridas: {string.Join(", ", missingVars)}"
    );
}

// Configuración de JWT
builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    builder.Configuration["Jwt:Key"]
                        ?? throw new InvalidOperationException("JWT Key is not configured")
                )
            ),
        };
    });

// Agregar servicios al contenedor
builder.Services.AddControllers();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer(
        (document, context, ct) =>
        {
            document.Info = new OpenApiInfo { Title = "RunningWebApi", Version = "v1" };
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes.Add(
                "Bearer",
                new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Ingrese el token JWT en el formato: Bearer {token}",
                }
            );
            foreach (var path in document.Paths.Values)
            {
                foreach (var operation in path.Operations.Values)
                {
                    operation.Security ??= [];
                    operation.Security.Add(
                        new OpenApiSecurityRequirement
                        {
                            {
                                new OpenApiSecuritySchemeReference("Bearer", document, null),
                                new List<string>()
                            },
                        }
                    );
                }
            }
            return Task.CompletedTask;
        }
    );
});

// Registrar Servicios
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<SupabaseClientService>();
builder.Services.AddSingleton<TrainningService>();
builder.Services.AddScoped<UserService>();

// Configurar CORS: solo los orígenes de Cors__AllowedOrigins (separados por comas).
// En desarrollo, si no está configurada, se permite el frontend de Vite en localhost.
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(origin => origin.TrimEnd('/'))
    .ToArray();
if (allowedOrigins.Length == 0)
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "Falta la variable de entorno requerida: Cors__AllowedOrigins"
        );
    }
    allowedOrigins = ["http://localhost:5173"];
}
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "Frontend",
        policy =>
        {
            policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader();
        }
    );
});

// Limitar intentos de login/registro por IP para frenar ataques de fuerza bruta
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(
        "auth",
        context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                }
            )
    );
});

// Koyeb termina TLS en su proxy y envía la IP real del cliente en X-Forwarded-For.
// Sus IPs no son fijas, así que se confía en el último salto (ForwardLimit = 1 por defecto).
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Configurar logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Configurar Kestrel para escuchar en todas las interfaces (necesario para Docker y Koyeb)
builder.WebHost.ConfigureKestrel(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        options.ListenAnyIP(5291); // Puerto para desarrollo local
    }
    else
    {
        options.ListenAnyIP(80); // Puerto para Docker
    }
});

var app = builder.Build();

app.UseForwardedHeaders();

// Configurar el pipeline de middleware
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();

    // OpenAPI/Scalar solo en desarrollo para no publicar el mapa de la API
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Endpoint de health check para Koyeb
app.MapGet("/health", () => Results.Ok("Healthy"));

// Middleware adicional
app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Mapear controladores
app.MapControllers();

// Ejecutar la aplicación
await app.RunAsync();
