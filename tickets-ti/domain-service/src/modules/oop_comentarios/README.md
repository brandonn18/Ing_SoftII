# Comentarios con diseño orientado a objetos (`oop_comentarios`)

La misma funcionalidad modelada con clases: estado privado, interfaces como
clases abstractas, herencia, polimorfismo e inyección de dependencias.

```
                ControladorComentarios  (infraestructura/http)
                          │ usa
                          ▼
                 GestorDeComentarios   (servicios)
                 │                   │
      usa ▼      │                   │      ▼ usa (solo interfaces)
 ┌────────────────────────┐   ┌──────────────────────────────┐
 │ entidades/             │   │ interfaces/                  │
 │ Autor                  │   │ «abstracta» RepositorioDe-   │
 │ Comentario             │   │             Comentarios      │
 │ HiloDeComentarios ─────┼─┐ │ «abstracta» FuenteDeTickets  │
 └────────────────────────┘ │ └──────────────▲───────────────┘
        crea Comentario ◄───┘                │ extends
                              ┌──────────────┴───────────────┐
                              │ infraestructura/             │
                              │ RepositorioComentarios-      │
                              │   Sequelize                  │
                              │ FuenteDeTicketsDelNucleo     │
                              └──────────────────────────────┘
```

| Concepto | Dónde se ve |
|---|---|
| Encapsulamiento | Campos privados `#` en `Autor`, `Comentario`, `HiloDeComentarios`; solo getters |
| Abstracción | `RepositorioDeComentarios` y `FuenteDeTickets` no se pueden instanciar |
| Herencia | `RepositorioComentariosSequelize extends RepositorioDeComentarios` |
| Polimorfismo | El gestor usa cualquier subclase; los tests le pasan una versión en memoria |
| Inyección de dependencias | `new GestorDeComentarios({ repositorio, tickets })` verifica `instanceof` |
| Composición | `FuenteDeTicketsDelNucleo` envuelve el `TicketRepository` del núcleo |
| Responsabilidad única | `HiloDeComentarios` decide permisos y crea comentarios; el gestor coordina |

## API

Ruta: `/api/v1/oop/tickets/:id/comentarios` (GET y POST). Requiere el JWT de
authcore. Las respuestas son idénticas a las de la versión hexagonal; lo
comprueba `tests/modules/contratoComentarios.http.test.js`.

## Encender

`MODULO_OOP=true` (local o Docker) · `.\desplegar.ps1 ... -ModuloOop true` (AWS).

## Reglas que verifica `tests/domain/arquitectura.test.js`

- `entidades/` e `interfaces/` no importan frameworks ni infraestructura, y no leen el reloj.
- `servicios/` no importa `infraestructura/`: solo conoce las interfaces.

## Tests

`tests/modules/oop_comentarios/oop.test.js`: clases sin base de datos, con
implementaciones en memoria de las interfaces.
