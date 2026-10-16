# Comentarios con arquitectura en capas (`capas_comentarios`)

La misma funcionalidad que `hexagonal_comentarios`, organizada en tres capas
apiladas. Cada capa solo llama a la de abajo, nunca al revés.

```
  HTTP
   │
   ▼
┌───────────────────────────────┐
│ presentation/                 │  rutas.js: rutas + express-validator
│                               │  comentarios.controller.js: HTTP ↔ negocio, forma del JSON
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ business/                     │  comentariosService.js: reglas (permisos, ticket
│                               │  cerrado, longitud). Sin HTTP ni SQL
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ data/                         │  comentariosDAO.js, ticketsDAO.js: SQL
│                               │  parametrizado. Sin reglas de negocio
└──────────────┬────────────────┘
               ▼
          PostgreSQL (ticket_comentarios, tickets)
```

## Diferencia con hexagonal

En capas, el negocio depende de la capa de datos: el servicio recibe los DAO
concretos. En hexagonal, el negocio define puertos y la base de datos es un
adaptador intercambiable. Capas es más simple de leer; hexagonal aísla mejor
el dominio de los cambios de infraestructura.

## API

Ruta: `/api/v1/capas/tickets/:id/comentarios` (GET y POST). Requiere el JWT de
authcore. Las respuestas son idénticas a las de la versión hexagonal; lo
comprueba `tests/modules/contratoComentarios.http.test.js`.

## Encender

`MODULO_CAPAS=true` (local o Docker) · `.\desplegar.ps1 ... -ModuloCapas true` (AWS).

## Reglas que verifica `tests/domain/arquitectura.test.js`

- `presentation/` no importa `data/` ni Sequelize.
- `business/` no importa `presentation/`, frameworks ni infraestructura, y no lee el reloj.
- `data/` no importa `business/`, `presentation/` ni Express.

## Tests

`tests/modules/capas_comentarios/` (negocio con DAO falsos) y el contrato HTTP común.
