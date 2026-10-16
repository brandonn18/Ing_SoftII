# Comentarios con Modelo-Vista-Controlador (`mvc_comentarios`)

La misma funcionalidad como **panel de administración** que responde HTML.
El controlador recibe la petición, pide datos a los modelos y elige la vista.

```
            GET / POST (formulario)
                     │
                     ▼
           ┌──────────────────┐
           │  controllers/    │  ComentariosController.js
           │  orquesta        │  (sin reglas ni HTML)
           └───┬──────────┬───┘
     pide datos│          │elige vista y le pasa los datos
               ▼          ▼
   ┌──────────────┐   ┌──────────────────────────┐
   │  models/     │   │  views/                  │
   │  datos +     │   │  HTML con datos escapados│
   │  reglas      │   │  (funciones puras)       │
   └──────┬───────┘   └──────────────────────────┘
          ▼
   PostgreSQL (ticket_comentarios, tickets)
```

| Carpeta | Archivo | Rol |
|---|---|---|
| `models/` | `ComentarioModel.js` | Modelo Sequelize + reglas: texto 1–2000, sin comentar tickets cerrados |
| `models/` | `TicketModel.js` | Lee el ticket con el modelo `Ticket` del núcleo |
| `views/` | `layout.js`, `hiloView.js`, `errorView.js` | HTML; todo dato pasa por `escapar()` |
| `controllers/` | `ComentariosController.js` | Post/Redirect/Get, repinta el formulario con errores |
| raíz | `rutas.js` | Rutas, `requireRole('administrador')`, validación del formulario |

## API

Ruta: `/api/v1/mvc/tickets/:id/comentarios`, solo para administradores y con JWT.

- `GET`: página HTML con el ticket, sus comentarios y un formulario.
- `POST` (`application/x-www-form-urlencoded`, campo `texto`): guarda y responde
  `303` hacia la misma página. Si el texto es inválido o el ticket está cerrado,
  devuelve la página con el error (400).

Como la autenticación es por `Authorization: Bearer`, el panel se prueba con
Postman o curl, no abriéndolo directo en el navegador.

## Encender

`MODULO_MVC=true` (local o Docker) · `.\desplegar.ps1 ... -ModuloMvc true` (AWS).

## Reglas que verifica `tests/domain/arquitectura.test.js`

- `models/` no importa vistas, controladores ni Express.
- `views/` no importa modelos, controladores ni frameworks.
- `controllers/` no importa modelos ni Sequelize: los recibe ya construidos.

## Tests

`tests/modules/mvc_comentarios/mvc.test.js`: vistas (escapado) y ciclo HTTP completo.
