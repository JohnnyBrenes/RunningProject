# Usa una imagen base de .NET SDK 8.0 para compilar la aplicación
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copia el archivo de proyecto y restaura las dependencias
COPY Backend/RunningWebApi/src.csproj ./RunningWebApi/
RUN dotnet restore ./RunningWebApi/src.csproj

# Copia el resto de los archivos del backend al contenedor
COPY Backend/RunningWebApi/ ./RunningWebApi/

# Publica la aplicación en modo Release
RUN dotnet publish ./RunningWebApi/src.csproj -c Release -o /app/out

# Usa una imagen base de .NET Runtime 8.0 para ejecutar la aplicación
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copia los archivos publicados desde la etapa de compilación
COPY --from=build /app/out .

# Copia el archivo .env al contenedor
COPY Backend/RunningWebApi/.env .env

# Expone el puerto en el que la aplicación escucha (por defecto 80)
EXPOSE 80

# Configura el comando de inicio de la aplicación
ENTRYPOINT ["dotnet", "src.dll"]