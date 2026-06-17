# Sistema de Gestión de Tickets de Soporte TI
**Ingeniería de Software II — Universidad de Pamplona**
Brandon Jair Martínez Ruda · Juan Esteban Basto Dávila

---

## Contexto rápido
Sistema web para gestionar tickets de soporte técnico (incidentes y solicitudes).
Stack: Node.js + Express + Sequelize + PostgreSQL · React + Tailwind · JWT · Socket.io · Jest.
Repositorio: https://github.com/brandonn18/Ing_SoftII/

---

## Estructura de carpetas

```
Ing_SoftII/
└── tickets-ti/
    ├── backend/src/
    │   ├── config/       db.js, auth.js, email.js
    │   ├── models/       User, Ticket, Category, Notification, SLAConfig, AuditLog
    │   ├── controllers/  auth, users, tickets, notifications, reports, sla
    │   ├── routes/       auth, users, tickets, notifications, reports
    │   ├── middlewares/  auth.js, roles.js, errorHandler.js, rateLimiter.js
    │   ├── services/     ticketService, notificationService, slaService, assignmentService
    │   ├── utils/        helpers.js, constants.js, validators.js
    │   └── app.js / server.js
    ├── backend/tests/    unit/, integration/, acceptance/
    └── frontend/src/
        ├── pages/        Login, Dashboard, Tickets, Users, Reports, Profile
        ├── components/   shared/, layout/, forms/
        ├── hooks/        useAuth, useTickets, useNotifications
        ├── services/     api.js, authService, ticketService
        └── context/      AuthContext, NotificationContext
```

---

## Modelos clave

**User**: id, nombre, email, password(bcrypt·12), rol(`usuario|tecnico|administrador`), activo, intentos_login, bloqueado_hasta

**Ticket**: id(`TKT-YYYY-NNNN`), titulo, descripcion, tipo(`incidente|solicitud`), categoria(`hardware|software|red|accesos|servicios_ti`), prioridad(`baja|media|alta|critica`), estado(ver ciclo abajo), usuarioId(FK), tecnicoId(FK), reabierto(bool), motivo_reapertura, sla_limite, sla_alerta_enviada

**SLAConfig**: critica=4h · alta=8h · media=24h · baja=72h

---

## Ciclo de vida del ticket (transiciones válidas)

```
abierto → asignado → en_proceso ⇄ en_espera
                         ↓
                      resuelto → cerrado
resuelto o cerrado → abierto  (reapertura)
```
Cualquier otra transición = error 400.

---

## Reglas de negocio que no pueden fallar

1. ID de ticket: formato `TKT-YYYY-NNNN`, correlativo por año, generado en `ticketService.createTicket()`
2. Asignación automática: técnico activo con **menor cantidad** de tickets no cerrados en esa categoría
3. Bloqueo de cuenta: 5 intentos fallidos → `bloqueado_hasta = now + 15min`
4. Alerta SLA: cron cada 15min → si ticket activo tiene ≥80% del tiempo SLA consumido y `sla_alerta_enviada=false` → email al técnico + marcar flag
5. `password` nunca aparece en ninguna respuesta JSON (usar `{ exclude: ['password'] }`)

---

## Permisos por rol

| Acción | usuario | tecnico | administrador |
|--------|:-------:|:-------:|:-------------:|
| Crear ticket | ✅ | ✅ | ✅ |
| Ver propios tickets | ✅ | — | — |
| Ver asignados | — | ✅ | — |
| Ver todos | — | — | ✅ |
| Cambiar estado | — | ✅(asignados) | ✅ |
| Reabrir | ✅ | — | ✅ |
| CRUD usuarios | — | — | ✅ |
| Dashboard completo | — | — | ✅ |

---

## Casos de prueba a satisfacer (Plan de Pruebas oficial)

| CP | Qué verifica | Prioridad |
|----|-------------|-----------|
| CP001 | Crear ticket → ID único + estado 'abierto' | Alta |
| CP002 | Clasificación automática por categoría | Alta |
| CP003 | Asignación automática al técnico con menor carga | Alta |
| CP004 | Cambio de estado por técnico válido | Alta |
| CP007 | Login con credenciales válidas → JWT retornado | Alta |
| CP008 | Bloqueo tras 5 intentos fallidos | Alta |
| CP010 | Alerta SLA al 80% | Alta |
| CP005 | Reapertura de ticket resuelto | Media |
| CP006 | Notificación al asignar ticket (≤5 min) | Media |
| CP009 | Dashboard diferenciado por rol | Media |
| CP011 | Admin crea usuario → email enviado | Media |
| CP012 | Cierre de ticket resuelto | Media |

---

## Credenciales seeder

```
admin@empresa.com     / Admin123!       (administrador)
tecnico1@empresa.com  / Tecnico123!     (tecnico)
tecnico2@empresa.com  / Tecnico123!     (tecnico)
usuario1@empresa.com  / Usuario123!     (usuario)
```