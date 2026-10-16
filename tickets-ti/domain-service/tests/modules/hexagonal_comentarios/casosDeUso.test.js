const { crearCasosComentarios, ComentarTicket } = require('../../../src/modules/hexagonal_comentarios/application');
const { TicketRepositoryEnMemoria, RelojFijo } = require('../../application/fakes');
const { ComentarioRepositoryEnMemoria } = require('./fakes');

const LUIS = { id: 10, nombre: 'Luis Usuario', rol: 'usuario' };
const ANA = { id: 20, nombre: 'Ana Técnica', rol: 'tecnico' };
const MARIA = { id: 11, nombre: 'María Usuaria', rol: 'usuario' };

const sembrarTicket = (tickets) => tickets.sembrar({
  id: 'TKT-2026-0001', titulo: 'Impresora', descripcion: 'No imprime', tipo: 'incidente', categoria: 'hardware', prioridad: 'alta',
  estado: 'en_proceso', usuarioId: 10, usuario_nombre: 'Luis Usuario', tecnicoId: 20, tecnico_nombre: 'Ana Técnica',
});

describe('Casos de uso de comentarios', () => {
  let deps;
  let casos;

  beforeEach(() => {
    // Arrange: solo dobles en memoria, sin base de datos
    const clock = new RelojFijo(new Date('2026-10-15T12:00:00.000Z'));
    deps = { clock, tickets: new TicketRepositoryEnMemoria({ clock }), comentarioRepository: new ComentarioRepositoryEnMemoria() };
    casos = crearCasosComentarios(deps);
    sembrarTicket(deps.tickets);
  });

  it('no debería construirse si falta un puerto', () => {
    expect(() => new ComentarTicket({ ...deps, clock: undefined })).toThrow(/clock no implementa Clock/);
  });

  describe('comentar', () => {
    it('debería guardar el comentario con la hora del reloj inyectado', async () => {
      // Act
      const comentario = await casos.comentar.ejecutar('TKT-2026-0001', 'Ya lo reinicié', LUIS);
      // Assert
      expect(comentario).toMatchObject({ id: 1, autorId: 10, texto: 'Ya lo reinicié', createdAt: new Date('2026-10-15T12:00:00.000Z') });
    });

    it('debería responder NO_ENCONTRADO si el ticket no existe', async () => {
      await expect(casos.comentar.ejecutar('TKT-2026-9999', 'hola', LUIS)).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    });

    it('no debería guardar nada si el actor no participa del ticket', async () => {
      await expect(casos.comentar.ejecutar('TKT-2026-0001', 'hola', MARIA)).rejects.toMatchObject({ codigo: 'ACCESO_DENEGADO' });
      expect(deps.comentarioRepository.filas).toHaveLength(0);
    });
  });

  describe('listar', () => {
    it('debería devolver el hilo en orden cronológico', async () => {
      await casos.comentar.ejecutar('TKT-2026-0001', 'primero', LUIS);
      deps.clock.avanzarHoras(1);
      await casos.comentar.ejecutar('TKT-2026-0001', 'segundo', ANA);
      // Act
      const hilo = await casos.listar.ejecutar('TKT-2026-0001', LUIS);
      // Assert
      expect(hilo.map((c) => c.texto)).toEqual(['primero', 'segundo']);
    });

    it('no debería mostrar el hilo a quien no puede ver el ticket', async () => {
      await expect(casos.listar.ejecutar('TKT-2026-0001', MARIA)).rejects.toMatchObject({ codigo: 'ACCESO_DENEGADO' });
    });
  });
});
