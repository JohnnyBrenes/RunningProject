using DotNetEnv;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RunningWebApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Cargar variables de entorno desde el archivo .env
Env.Load();

// Agregar servicios al contenedor
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Registrar SupabaseService
builder.Services.AddSingleton<SupabaseService>();

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
    options.ListenAnyIP(80); // Puerto 80 para Docker
    options.ListenLocalhost(
        5291,
        listenOptions => // Puerto 5291 para HTTPS
        {
            listenOptions.UseHttps(); // Habilitar HTTPS
        }
    );
});

var app = builder.Build();

// Habilitar Swagger en todos los entornos
app.UseSwagger();
app.UseSwaggerUI();

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
app.UseAuthorization();

// Mapear controladores
app.MapControllers();

// Ejecutar la aplicación
await app.RunAsync();
