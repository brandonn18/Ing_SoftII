# Módulos de domain-service: una funcionalidad, cuatro arquitecturas

Cada carpeta implementa **el mismo requerimiento** (comentarios en un ticket) con
una arquitectura distinta, para compararlas por separado. Las cuatro usan la misma
tabla `ticket_comentarios`, así que un comentario creado por una se ve en las demás.

| Carpeta | Arquitectura | Ruta | Responde | Flag |
|---|---|---|---|---|
| `hexagonal_comentarios/` | Hexagonal (puertos y adaptadores) | `/api/v1/tickets/:id/comentarios` | JSON | `MODULO_COMENTARIOS` |
| `capas_comentarios/` | Capas (presentation → business → data) | `/api/v1/capas/tickets/:id/comentarios` | JSON | `MODULO_CAPAS` |
| `mvc_comentarios/` | Modelo-Vista-Controlador | `/api/v1/mvc/tickets/:id/comentarios` | HTML (solo admin) | `MODULO_MVC` |
| `oop_comentarios/` | Orientado a objetos | `/api/v1/oop/tickets/:id/comentarios` | JSON | `MODULO_OOP` |

## Comparación

| | Hexagonal | Capas | MVC | OOP |
|---|---|---|---|---|
| Dónde viven las reglas | `domain/` (puro) | `business/` | `models/` | Entidades (`HiloDeComentarios`, `Comentario`) |
| Cómo se llega a la BD | Puerto + adaptador Sequelize | DAO con SQL | Modelo Sequelize | Interfaz + clase concreta |
| Dirección de dependencias | Todo apunta al dominio | De arriba hacia abajo | Controlador → modelo y vista | Servicio → interfaces |
| Cambiar de base de datos | Nuevo adaptador; el dominio no cambia | Cambiar `data/` | Cambiar `models/` | Nueva subclase de la interfaz |
| Probar sin base de datos | Dobles de los puertos | Dobles de los DAO | Las vistas son funciones puras | Subclases en memoria |

## Reglas comunes

- El núcleo solo importa el `index.js` de cada módulo, desde `src/composicion.js`.
- Un módulo nunca importa archivos de otro módulo.
- `app.js` monta cada módulo con `verificarToken`, sin conocerlo por nombre.
- Todos los flags están apagados por defecto: sin ellos, domain-service se comporta igual que antes.

Las dos primeras reglas las comprueba `tests/domain/arquitectura.test.js`. Que las tres
APIs JSON respondan exactamente igual, y que con el flag apagado la ruta no exista,
lo comprueba `tests/modules/contratoComentarios.http.test.js`.

## Encender

| Entorno | Cómo |
|---|---|
| Local | `MODULO_CAPAS=true` (etc.) en `domain-service/.env` |
| Docker Compose | Las mismas variables en `tickets-ti/.env` y `docker compose up -d domain-service` |
| AWS | `.\desplegar.ps1 -EmailAlertas ... -ModuloComentarios true -ModuloCapas true -ModuloMvc true -ModuloOop true` |
