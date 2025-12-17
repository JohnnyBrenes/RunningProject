# AI Coding Instructions - Running Project

## Project Overview

**Running Project** is a full-stack running training tracker application built with:

- **Backend**: .NET 8 ASP.NET Core with Supabase (PostgreSQL) database
- **Frontend**: React 19 + Vite with TailwindCSS and i18n support
- **Architecture**: RESTful API with JWT authentication and role-based access control

The app manages running workouts with features like filtering, pagination, charts, and multi-language support (Spanish/English).

## Architecture & Data Flow

### Backend Service Layers (Dependency Injection Pattern)

The backend follows a **three-tier service architecture** with dependency injection:

1. **Controllers** (`Backend/RunningWebApi/Controllers/`) - HTTP endpoints

   - `AuthController` - JWT login endpoint
   - `TrainningsController` - [Authorize] CRUD operations for workouts
   - `UsersController` - User management
   - All requests are intercepted by JWT middleware; `/api/auth/login` is the only public endpoint

2. **Services** (`Backend/RunningWebApi/Services/`) - Business logic

   - `SupabaseClientService` - Singleton that manages Supabase client connection from `.env` variables
   - `AuthService` - JWT token generation using BCrypt-hashed passwords stored in Users table
   - `TrainningService` - CRUD operations for Trainnings table using Supabase.Postgrest ORM
   - `UserService` - User queries from Users table
   - Services are registered in `Program.cs` and injected via constructor

3. **Models** (`Backend/RunningWebApi/Models/`) - DTOs and database entities
   - `Users` - Maps to Supabase users table (id, username, email, password_hash)
   - `Trainnings` - Maps to Supabase trainnings table (id, user_id, distance, duration, pace)
   - `*Dto` classes - Transfer objects for API responses (e.g., `TrainningResponseDto` adds computed `pace` field)
   - **Important**: DTOs often differ from entity models; always check both when modifying endpoints

### Frontend Component Structure

- **API Integration**: `src/utils/Api.jsx` - Axios instance with JWT Bearer token interceptor (reads from `localStorage`)
- **Authentication Flow**:
  1. `Login.jsx` → POST `/api/auth/login` → token stored in `localStorage`
  2. All subsequent requests automatically include `Authorization: Bearer <token>` header
  3. Token validity checked by backend JWT middleware; 1-hour expiration configured in `AuthService`
- **State Management**: React hooks (useState) + localStorage for persistence
- **i18n**: Via `react-i18next` with `/locales/{en,es}/translation.json` files
- **UI**: TailwindCSS utility classes; components located in `src/components/`

## Developer Workflows

### Build & Run

**Backend:**

```bash
# Build (from workspace root)
dotnet build Backend/RunningWebApi/src.csproj

# Run locally (requires .env with SUPABASE_URL, SUPABASE_KEY, JWT_KEY)
dotnet run --project Backend/RunningWebApi/src.csproj

# Swagger available at http://localhost:5000/swagger/index.html
```

**Frontend:**

```bash
# Install dependencies
npm install

# Dev server (Vite hot reload on localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Docker**: Full stack runs with `docker-compose` or Docker Desktop. Image uses multi-stage build to compile backend and copy runtime.

### Environment Variables

Backend requires (in `.env` file or container env):

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase API key (anon key, not service role)
- `JWT_KEY` - Secret key for JWT signing (minimum 32 characters)

Frontend requires (in `.env.local` or via Vite):

- `VITE_API_URL` - Backend API base URL (e.g., `http://localhost:5000`)

## Project-Specific Conventions

### .NET Patterns

- **File naming**: `[Feature]Controller.cs`, `[Feature]Service.cs`, `[Feature]Dto.cs`
- **Async/await**: All service methods are `async Task<T>`, use `.Result` only if unavoidable
- **Error handling**: Services return `null` for not-found; controllers map to `NotFound()` or `BadRequest()`
- **BCrypt**: Password hashing uses `BCrypt.Net.BCrypt.HashPassword()` and `.Verify()` (never store plaintext)

### React Patterns

- **API calls**: Always use `Api` utility (Axios instance) to ensure JWT interceptor works
- **Loading states**: Components manage local `isLoading` state during async operations
- **Error messages**: Displayed in UI using i18n translation keys (e.g., `t("invalid_credentials")`)
- **Components**: Functional components with hooks; destructure props in signature

### Supabase Integration

- Tables auto-created in Supabase console; schema must match Models in C# (id, user_id, etc.)
- Supabase.Postgrest ORM used in services; queries are strongly typed
- Supports filtering, sorting, pagination via ORM fluent API
- **Row-level security (RLS)**: Not yet implemented; all authenticated users can see all records

## Integration Points & Dependencies

### Key External Dependencies

| Layer    | Package                                  | Purpose              |
| -------- | ---------------------------------------- | -------------------- |
| Backend  | `Supabase` v1.1.1                        | Database access      |
| Backend  | `BCrypt.Net-Next` v4.0.3                 | Password hashing     |
| Backend  | `DotNetEnv` v3.1.1                       | .env file loading    |
| Backend  | `System.IdentityModel.Tokens.Jwt` v8.8.0 | JWT token handling   |
| Frontend | `axios` v1.8.4                           | HTTP client          |
| Frontend | `react-i18next` v15.5.2                  | Internationalization |
| Frontend | `chart.js` + `react-chartjs-2`           | Data visualization   |

### Cross-Component Communication

1. **Frontend → Backend**: HTTP requests via `Api` utility (Axios)
2. **Authentication flow**: Token stored in `localStorage`; refreshed on each request via interceptor
3. **Error propagation**: Backend returns HTTP status codes (401 for auth failures, 404 for not-found, 500 for server errors)
4. **Frontend rendering**: Components conditionally render based on authentication state and data availability

## Common Workflows for AI Agents

### Adding a New Endpoint

1. Create `[Feature]Dto.cs` in Models if needed
2. Add method to `[Feature]Service.cs` using Supabase.Postgrest ORM
3. Create corresponding controller method in `[Feature]Controller.cs` with `[Authorize]` and HTTP verb
4. Frontend: Call via `Api.get()/post()/delete()` and handle response/error

### Fixing JWT Authentication Issues

- Verify `JWT_KEY` is ≥32 characters
- Check `appsettings.json` has correct JWT configuration
- Ensure token is persisted to `localStorage` after login
- Verify `Api` interceptor is adding `Authorization: Bearer <token>` header
- Check browser DevTools → Application → localStorage for token presence

### Multi-Language Support

- Add translation keys to `/Frontend/src/locales/{en,es}/translation.json`
- Use `const { t } = useAppTranslation()` hook in components
- Call `t("key_name")` in JSX to render translated text

### Database Schema Changes

- Modify Supabase table structure in Supabase console
- Update corresponding Model class in `Backend/RunningWebApi/Models/`
- Update DTOs if response shape changes
- Update services to include new fields in queries

## Files to Review First

- [Program.cs](Backend/RunningWebApi/Program.cs) - Service registration and middleware setup
- [AuthService.cs](Backend/RunningWebApi/Services/AuthService.cs) - JWT token generation logic
- [Api.jsx](Frontend/src/utils/Api.jsx) - HTTP client with JWT interceptor
- [Login.jsx](Frontend/src/components/Login.jsx) - Authentication flow example
- [appsettings.json](Backend/RunningWebApi/appsettings.json) - JWT configuration
