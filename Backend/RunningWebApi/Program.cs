using System.Text;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RunningWebApi.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Cargar variables de entorno desde el archivo .env (solo en desarrollo local)
if (File.Exists(".env"))
{
    Env.Load();
}

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

// Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowAllOrigins",
        builder =>
        {
            builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        }
    );
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

// Habilitar OpenAPI/Scalar en todos los entornos
app.MapOpenApi();
app.MapScalarApiReference();

// Configurar el pipeline de middleware
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Endpoint de health check para Koyeb
app.MapGet("/health", () => Results.Ok("Healthy"));

// Middleware adicional
app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("AllowAllOrigins");
app.UseAuthentication();
app.UseAuthorization();

// Mapear controladores
app.MapControllers();

// Ejecutar la aplicación
await app.RunAsync();
