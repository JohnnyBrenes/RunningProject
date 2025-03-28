# Usa una imagen base de .NET SDK 8.0 para compilar la aplicación
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copia los archivos del proyecto al contenedor
COPY . ./

# Restaura las dependencias y publica la aplicación en modo Release
RUN dotnet restore
RUN dotnet publish -c Release -o /out

# Usa una imagen base de .NET Runtime 8.0 para ejecutar la aplicación
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copia los archivos publicados desde la etapa de compilación
COPY --from=build /out .

# Copia el archivo .env al contenedor
COPY .env .env

# Expone el puerto en el que la aplicación escucha (por defecto 80)
EXPOSE 80

# Configura el comando de inicio de la aplicación
ENTRYPOINT ["dotnet", "RunningWebApi.dll"]