# Prompt 1
  Estructura generada: 70 archivos

  Comandos para iniciar el proyecto

  Opción A — Desarrollo local (sin Docker)

  Prerequisito: PostgreSQL corriendo en localhost:5432
 # 1. Backend
  cd tickets-ti/backend
  cp .env.example .env          # edita credenciales de DB y JWT_SECRET
  npm install
  node src/seeders/seed.js      # crea tablas y datos iniciales
  npm run dev                   # inicia en http://localhost:3001

  # 2. Frontend (terminal separada)
  cd tickets-ti/frontend
  npm install
  npm start                     # inicia en http://localhost:3000

  Opción B — Docker Compose (recomendado)

  cd tickets-ti
  docker-compose up --build
  Accede en http://localhost:3000

  Tests

  cd tickets-ti/backend
  npm test                  # Jest + Supertest
  npm run test:coverage     # con cobertura

  ---
  Credenciales iniciales (seeder)

  ┌───────────────┬──────────────────────┬───────────┐
  │      Rol      │        Email         │ Password  │
  ├───────────────┼──────────────────────┼───────────┤
  │ Administrador │ admin@empresa.com    │ Admin123! │
  ├───────────────┼──────────────────────┼───────────┤
  │ Técnico 1     │ tecnico1@empresa.com │ Tecnico1! │
  ├───────────────┼──────────────────────┼───────────┤
  │ Técnico 2     │ tecnico2@empresa.com │ Tecnico2! │
  ├───────────────┼──────────────────────┼───────────┤
  │ Usuario       │ usuario1@empresa.com │ Usuario1! │
  └───────────────┴──────────────────────┴───────────┘

  ---
  Resumen de lo implementado

  - Backend completo: 6 modelos Sequelize, 5 controllers, 5 rutas, 4 middlewares (JWT auth, RBAC, rate limiting, error handler), 4 servicios
  (tickets con SLA, notificaciones, asignación automática)
  - Frontend React: Layout con sidebar/navbar, 7 páginas, hooks personalizados, contextos de auth y notificaciones, Tailwind CSS
  - SLA automático: al crear un ticket se calcula sla_limite según prioridad (crítica=4h, alta=8h, media=24h, baja=72h)
  - Auditoría: cada acción importante registra en AuditLog
  - Tests: 2 suites con Supertest cubriendo auth y tickets




  # prompt 2
    Backend:
  - src/services/notificationService.js — 5 funciones de email con plantillas HTML profesionales (sendWelcomeEmail, sendPasswordResetEmail, sendTicketAssignedEmail, sendTicketResolvedEmail,
  sendSLAAlertEmail)
  - src/middlewares/rateLimiter.js — deshabilita limitadores en NODE_ENV=test para evitar interferencia con pruebas
  - tests/unit/auth.test.js — 13 tests unitarios nuevos cubriendo CP007, CP008, CP011, validación de tokens y refresh token

  Frontend:
  - src/context/AuthContext.js — expone isAuthenticated, currentUser, role además de user, login, logout
  - src/pages/Login.js — redirección según rol (admin → /dashboard, técnico/usuario → /tickets) + mensajes diferenciados para cuenta bloqueada, inactiva o credenciales inválidas
  - src/pages/Users.js — reemplazado con tabla CRUD completa: búsqueda, filtros por rol/estado, modal crear/editar con validación, resetear contraseña, activar/desactivar, paginación
  - src/components/shared/PrivateRoute.js — redirige a /403 (en lugar de /dashboard) cuando el rol no tiene acceso
  - src/pages/Forbidden.js — página 403 nueva
  - src/App.js — ruta /403 registrada, /users protegida con roles={['administrador']}

  Resultado: 28/28 tests pasan, frontend compila limpio.

