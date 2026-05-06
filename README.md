# Frontend Gestion Pre-Electoral

Aplicación React + TypeScript + Vite para el módulo de Gestión Pre-Electoral del Sistema Registraduría (Sello Legítimo).

## Scripts

```bash
npm run dev      # Servidor de desarrollo (puerto 5174)
npm run build    # Compilación TypeScript + build Vite
npm run lint     # ESLint
npm run preview  # Preview del build de producción
```

## Variables de entorno

```bash
VITE_API_GATEWAY_URL=https://preeleccion.sello-legitimo.site:8091
VITE_AUTHELIA_URL=https://auth.sello-legitimo.site:8091
VITE_OIDC_CLIENT_ID=frontend-gestion-pre
VITE_OIDC_REDIRECT_URI=https://preeleccion.sello-legitimo.site:8091/callback
VITE_JURADOS_API_URL=http://localhost:8083   # MockJurados-service (directo o vía gateway)
```

## Rutas de la aplicación

| Ruta | Página | Descripción |
|---|---|---|
| `/login` | `Login.tsx` | Inicio de sesión vía Authelia / OIDC |
| `/callback` | `Callback.tsx` | Callback OIDC para intercambio de tokens |
| `/censo/gestion` | `GestionCenso.tsx` | Administración del censo electoral (RF-M2-001) |
| `/jurados/sorteo` | `SorteoJurados.tsx` | Sorteo determinístico de jurados de votación |
| `/jurados/excusas` | `GestionExcusas.tsx` | Gestión de excusas y reemplazos de jurados |
| `/jurados/asistencia` | `ControlAsistencia.tsx` | Control de asistencia de jurados el día de votación |

## Endpoints del backend consumidos

### API Gateway (M2 - Gestion Pre-Electoral)

| Método | Endpoint | Descripción | Usado en |
|---|---|---|---|
| `GET` | `/api/censo/elecciones` | Listar elecciones configuradas | `GestionCenso.tsx` |
| `GET` | `/api/censo/elecciones/{id}/registros` | Listar registros de censo | `GestionCenso.tsx` |
| `POST` | `/api/censo/registros` | Registrar ciudadano manualmente | `GestionCenso.tsx` |
| `PUT` | `/api/censo/registros/{id}` | Actualizar estado de registro | `GestionCenso.tsx` |
| `POST` | `/api/censo/importaciones/csv` | Importar censo desde CSV | `GestionCenso.tsx` |
| `POST` | `/api/censo/importaciones/api` | Importar censo desde API externa | `GestionCenso.tsx` |
| `GET` | `/api/censo/elecciones/{id}/causales` | Obtener causales de la elección | `GestionCenso.tsx` |

### MockJurados-service (M3 - Mock de Jurados de Votación)

Base URL configurable vía `VITE_JURADOS_API_URL`. Expone REST en `:8083` y gRPC en `:9091`.

#### Endpoints funcionales

| Método | Endpoint | Descripción | Usado en |
|---|---|---|---|
| `POST` | `/api/jurados/sorteo` | Ejecutar sorteo determinístico de jurados | `SorteoJurados.tsx` |
| `POST` | `/api/jurados/excusa` | Presentar excusa de un jurado | `GestionExcusas.tsx` |
| `POST` | `/api/jurados/excusa/{id}/resolver` | Resolver excusa (APROBADA / RECHAZADA) | `GestionExcusas.tsx` |
| `POST` | `/api/jurados/asistencia` | Registrar asistencia (PRESENTE / AUSENTE) | `ControlAsistencia.tsx` |
| `GET` | `/api/jurados/mesa/{mesaId}` | Consultar jurados asignados a una mesa | `SorteoJurados.tsx` (expandible) |
| `GET` | `/api/jurados/cedula/{cedula}` | Buscar jurado por cédula | — |
| `GET` | `/api/jurados/{id}` | Buscar jurado por UUID | — |

#### Endpoints debug / mock

| Método | Endpoint | Descripción | Usado en |
|---|---|---|---|
| `GET` | `/mock/jurados` | Listar todos los jurados en memoria | `GestionExcusas.tsx`, `ControlAsistencia.tsx` |
| `GET` | `/mock/excusas` | Listar todas las excusas | `GestionExcusas.tsx` |
| `GET` | `/mock/asistencias` | Listar todos los registros de asistencia | `ControlAsistencia.tsx` |
| `GET` | `/mock/state` | Resumen del estado en memoria | `SorteoJurados.tsx` |
| `DELETE` | `/mock/reset` | Reiniciar todo el estado del mock | `SorteoJurados.tsx` |

## Estructura de archivos relevantes

```
src/
├── api/
│   ├── apiClient.ts          # Utilidades para construir URLs del gateway
│   ├── authApi.ts            # Autenticación con Authelia / OIDC
│   ├── censoApi.ts           # Cliente API del censo (M2)
│   ├── gatewayValidation.ts  # Validación de token con el gateway
│   └── juradosApi.ts         # Cliente API de MockJurados (M3) ← nuevo
├── pages/
│   ├── GestionCenso.tsx      # Gestión de censo electoral
│   ├── SorteoJurados.tsx     # Sorteo de jurados ← nuevo
│   ├── GestionExcusas.tsx    # Excusas y reemplazos ← nuevo
│   ├── ControlAsistencia.tsx # Control de asistencia ← nuevo
│   ├── Login.tsx
│   └── Callback.tsx
├── components/
│   ├── NavBar.tsx
│   ├── UserMenu.tsx
│   ├── Footer.tsx
│   ├── ComingSoonToast.tsx
│   ├── ProtectedRoute.tsx
│   └── AppErrorBoundary.tsx
├── services/
│   └── authService.ts        # Gestión de sesión, tokens, roles
├── utils/
│   └── debugLogger.ts
└── App.tsx                   # Router con todas las rutas
```

## Dependencias principales

- React 19 + React DOM
- React Router DOM 7
- Tailwind CSS 4
- Lucide React (iconos)
- Vite 8 + @vitejs/plugin-react

## Notas de integración

- El `MockJurados-service` actúa como microservicio standalone (puerto 8083). En desarrollo se apunta directamente; en producción se debe enrutar a través del gateway (`jurados.sello-legitimo.site → mock-jurados:8083`).
- El sorteo es determinístico: misma `seed` + `eleccionId` + `departamento` + `municipio` producen los mismos jurados.
- Las excusas APROBADAS y la asistencia AUSENTE generan reemplazos automáticos en el backend.
- No se usa estado global (Redux/Zustand); cada página maneja su propio `useState`/`useEffect`.
