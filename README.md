# Proyecto de Práctica de Conceptos React

Este proyecto es una aplicación para gestionar y visualizar datos relacionados con entrenamientos de running. Incluye un **frontend** desarrollado en React y un **backend** desarrollado en .NET 8 que utiliza Supabase como base de datos.

## Tabla de Contenidos

- [Características](#características)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Estructura del Proyecto](#estructura-del-proyecto)

---

## Características

- **Frontend**:

  - Visualización de datos de entrenamientos.
  - Filtros por mes y por tenis usados.
  - Paginación de registros.
  - Ordenamiento por columnas.
  - Formulario para registrar nuevos entrenamientos.
  - Cálculo automático del ritmo promedio (pace).

- **Backend**:
  - API RESTful desarrollada en .NET 8.
  - Conexión con Supabase como base de datos.
  - Endpoints para obtener, crear y eliminar registros.

---

## Tecnologías Utilizadas

### Frontend

- React
- TailwindCSS (para estilos)
- Axios (para llamadas a la API)

### Backend

- .NET 8
- Supabase (base de datos)

---

## Estructura del Proyecto

```text
RunningProject/
├── Backend/ # Código del backend
│ ├── RunningWebApi/
│ │ ├── Controllers/ # Controladores de la API
│ │ ├── Models/ # Modelos de datos
│ │ ├── Program.cs # Configuración principal del servidor
| └ └── appsettings.json # Configuración de la base de datos
├── Frontend/ # Código del frontend
│ ├── src/
│ │ ├── components/ # Componentes de React
│ │ ├── locales/ # recursos de idioma
│ │ ├── utils/ # Utilidades (como Axios)
│ │ └── App.jsx # Componente principal
│ └── package.json # Dependencias del frontend └── README.md # Documentación del proyecto
```
