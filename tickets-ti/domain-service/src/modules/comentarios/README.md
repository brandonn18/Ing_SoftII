# Módulo `comentarios`

Hilo de comentarios por ticket, construido como **módulo hexagonal aislado**
dentro de domain-service. Sirve de plantilla para agregar requerimientos nuevos
sin tocar el núcleo ya desplegado.

## API

Ambas rutas exigen el JWT de authcore (`Authorization: Bearer ...`).

| Método | Ruta | Quién | Respuesta |
|--------|------|-------|-----------|
| GET | `/api/v1/tickets/:id/comentarios` | quien puede ver el ticket | `200 { success, data: Comentario[] }` en orden cronológico |
| POST | `/api/v1/tickets/:id/comentarios` | dueño, técnico asignado o admin | `201 { success, data: Comentario, message }` |

Body del POST: `{ "texto": "..." }` (1–2000 caracteres; se elimina el HTML).
No se puede comentar un ticket `cerrado` (400): primero hay que reabrirlo.

```json
{ "id": 1, "ticketId": "TKT-2026-0001", "texto": "Ya lo reinicié", "createdAt": "...",
  "autor": { "id": 10, "nombre": "luis", "rol": "usuario" } }
```

## Estructura

```
comentarios/
├── domain/                  Comentario (entidad) + politicaComentarios. Sin frameworks ni reloj.
├── application/
│   ├── ports/               ComentarioRepository, TicketsConsultaPort (solo buscarPorId), Clock
│   └── casosDeUso/          ComentarTicket, ListarComentarios (puertos por constructor)
├── adapters/
│   ├── persistencia/        modelo Sequelize (ticket_comentarios) + SequelizeComentarioRepository
│   └── http/                rutas, middlewares (express-validator) y controller
└── index.js                 crearModuloComentarios() → { ruta, router, casos }
```

## Cómo se conecta con el núcleo (y nada más)

1. `src/composicion.js` llama a `crearModuloComentarios({ sequelize, tickets, clock })`
   solo si el flag está encendido. `tickets` es el `TicketRepository` del núcleo, que
   cumple `TicketsConsultaPort`.
2. `src/infrastructure/http/app.js` monta cada módulo recibido con `verificarToken`,
   sin conocerlo por nombre.
3. La migración `20261015000001-create-ticket-comentarios.js` crea una tabla nueva y
   no altera las existentes.

Del núcleo, el módulo solo reutiliza el dominio (`errores`, `catalogos`,
`politicaAcceso.puedeVer`), `definirPuerto`/`requerirDependencias` y utilidades HTTP
(`manejar`, `validar`, `sanitizarTexto`). `tests/domain/arquitectura.test.js` hace
cumplir estas fronteras.

## Encender / apagar

| Entorno | Cómo |
|---------|------|
| Local | `MODULO_COMENTARIOS=true` en `domain-service/.env` |
| Docker Compose | `MODULO_COMENTARIOS=true` en `tickets-ti/.env` y `docker compose up -d domain-service` |
| AWS | `.\desplegar.ps1 -EmailAlertas ... -ModuloComentarios true` |

Apagado (por defecto), la ruta responde 404 y el servicio se comporta igual que antes
del módulo. Para quitarlo del todo: borrar la carpeta, la línea de `composicion.js`, el
flag de `env.js` y revertir la migración.

## Tests

```powershell
npx jest tests/modules/comentarios
```

- `dominio.test.js`: entidad y política, sin base de datos.
- `casosDeUso.test.js`: casos de uso con dobles en memoria.
- `comentarioRepository.test.js`: el mismo contrato contra memoria y PostgreSQL.
- `comentarios.http.test.js`: de punta a punta, incluido el flag apagado.
