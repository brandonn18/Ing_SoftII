// Clases del módulo OOP probadas sin base de datos: las interfaces se
// implementan con dobles en memoria (herencia + polimorfismo).
const Autor = require('../../../src/modules/oop_comentarios/entidades/Autor');
const Comentario = require('../../../src/modules/oop_comentarios/entidades/Comentario');
const HiloDeComentarios = require('../../../src/modules/oop_comentarios/entidades/HiloDeComentarios');
const RepositorioDeComentarios = require('../../../src/modules/oop_comentarios/interfaces/RepositorioDeComentarios');
const FuenteDeTickets = require('../../../src/modules/oop_comentarios/interfaces/FuenteDeTickets');
const GestorDeComentarios = require('../../../src/modules/oop_comentarios/servicios/GestorDeComentarios');
const FuenteDeTicketsDelNucleo = require('../../../src/modules/oop_comentarios/infraestructura/FuenteDeTicketsDelNucleo');
const RepositorioComentariosSequelize = require('../../../src/modules/oop_comentarios/infraestructura/RepositorioComentariosSequelize');
const ControladorComentarios = require('../../../src/modules/oop_comentarios/infraestructura/http/ControladorComentarios');

const LUIS = { id: 10, nombre: 'Luis Usuario', rol: 'usuario' };
const ANA = { id: 20, nombre: 'Ana Técnica', rol: 'tecnico' };
const BETO = { id: 21, nombre: 'Beto Técnico', rol: 'tecnico' };
const MARIA = { id: 11, nombre: 'María Usuaria', rol: 'usuario' };
const ADMIN = { id: 1, nombre: 'Admin', rol: 'administrador' };
const TICKET = Object.freeze({ id: 'TKT-2026-0001', usuarioId: 10, tecnicoId: 20, estado: 'en_proceso' });
const FECHA = new Date('2026-10-15T12:00:00.000Z');

class RepositorioEnMemoria extends RepositorioDeComentarios {
  filas = [];

  async guardar(comentario) {
    const guardado = comentario.persistido(this.filas.length + 1, FECHA);
    this.filas.push(guardado);
    return guardado;
  }

  async listarPorTicket(ticketId) { return this.filas.filter((c) => c.ticketId === ticketId); }
}

class FuenteEnMemoria extends FuenteDeTickets {
  constructor(tickets) { super(); this.tickets = tickets; }

  async buscar(id) { return this.tickets.find((t) => t.id === id) || null; }
}

const crearGestor = (tickets = [TICKET]) => {
  const repositorio = new RepositorioEnMemoria();
  return { repositorio, gestor: new GestorDeComentarios({ repositorio, tickets: new FuenteEnMemoria(tickets) }) };
};

describe('oop_comentarios / entidades', () => {
  it('Autor debería encapsular el rol y validar sus datos', () => {
    const admin = Autor.desdeActor(ADMIN);
    expect([admin.esAdministrador(), admin.esTecnico()]).toEqual([true, false]);
    expect(admin.aJSON()).toEqual(ADMIN);
    expect(() => Autor.desdeActor(undefined)).toThrow('Autor inválido');
    expect(() => Autor.desdeActor({ id: 1, nombre: ' ', rol: 'usuario' })).toThrow('Nombre del autor requerido');
    expect(() => Autor.desdeActor({ id: 1, nombre: 'X', rol: 'jefe' })).toThrow('Rol del autor inválido');
  });

  it('Comentario debería ocultar su estado y devolver una copia al persistirse', () => {
    const nuevo = new Comentario({ ticketId: 'TKT-2026-0001', autor: Autor.desdeActor(LUIS), texto: '  hola  ' });
    const guardado = nuevo.persistido(7, FECHA);
    expect([nuevo.id, nuevo.texto]).toEqual([null, 'hola']);
    expect(guardado.aJSON()).toEqual({ id: 7, ticketId: 'TKT-2026-0001', texto: 'hola', createdAt: FECHA, autor: LUIS });
    expect(Object.keys(guardado)).toEqual([]); // campos privados: nada enumerable
  });

  it.each([
    [{ texto: '' }, 'El comentario no puede estar vacío'],
    [{ texto: 'a'.repeat(Comentario.LONGITUD_MAXIMA + 1) }, /no puede superar/],
    [{ ticketId: '' }, 'Ticket requerido'],
    [{ autor: LUIS }, 'Autor inválido'],
  ])('Comentario no debería aceptar %p', (cambio, error) => {
    const datos = { ticketId: 'TKT-2026-0001', autor: Autor.desdeActor(LUIS), texto: 'hola', ...cambio };
    expect(() => new Comentario(datos)).toThrow(error);
  });

  it('HiloDeComentarios debería decidir quién lee y quién comenta', () => {
    const hilo = new HiloDeComentarios(TICKET);
    expect([LUIS, ANA, ADMIN].map((a) => hilo.puedeComentar(Autor.desdeActor(a)))).toEqual([true, true, true]);
    expect([BETO, MARIA].map((a) => hilo.puedeComentar(Autor.desdeActor(a)))).toEqual([false, false]);
    expect(hilo.puedeLeer(Autor.desdeActor(BETO))).toBe(true);
    expect(() => hilo.exigirLectura(Autor.desdeActor(MARIA))).toThrow(expect.objectContaining({ codigo: 'ACCESO_DENEGADO' }));
    expect(() => new HiloDeComentarios({ ...TICKET, estado: 'cerrado' }).comentar(Autor.desdeActor(LUIS), 'hola'))
      .toThrow(expect.objectContaining({ codigo: 'TRANSICION_INVALIDA' }));
    expect(() => new HiloDeComentarios(null)).toThrow(/requiere un ticket/);
  });
});

describe('oop_comentarios / interfaces', () => {
  it('no deberían poder instanciarse y deberían avisar del método faltante', async () => {
    expect(() => new RepositorioDeComentarios()).toThrow(/abstracta/);
    expect(() => new FuenteDeTickets()).toThrow(/abstracta/);
    class Incompleto extends RepositorioDeComentarios {}
    class FuenteIncompleta extends FuenteDeTickets {}
    await expect(new Incompleto().guardar()).rejects.toThrow('Incompleto no implementa guardar');
    await expect(new Incompleto().listarPorTicket()).rejects.toThrow('Incompleto no implementa listarPorTicket');
    await expect(new FuenteIncompleta().buscar()).rejects.toThrow('FuenteIncompleta no implementa buscar');
  });
});

describe('oop_comentarios / servicios / GestorDeComentarios', () => {
  it('debería exigir implementaciones de las interfaces por constructor', () => {
    expect(() => new GestorDeComentarios()).toThrow(/RepositorioDeComentarios/);
    expect(() => new GestorDeComentarios({ repositorio: new RepositorioEnMemoria(), tickets: {} })).toThrow(/FuenteDeTickets/);
  });

  it('debería comentar y listar a través de las interfaces', async () => {
    const { gestor, repositorio } = crearGestor();
    const comentario = await gestor.comentar('TKT-2026-0001', 'Ya lo reinicié', LUIS);
    expect(comentario).toBeInstanceOf(Comentario);
    expect(comentario.aJSON()).toMatchObject({ id: 1, texto: 'Ya lo reinicié', autor: LUIS });
    expect(await gestor.listar('TKT-2026-0001', ANA)).toEqual(repositorio.filas);
  });

  it('debería responder NO_ENCONTRADO y ACCESO_DENEGADO', async () => {
    const { gestor, repositorio } = crearGestor();
    await expect(gestor.comentar('TKT-2026-9999', 'hola', LUIS)).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    await expect(gestor.comentar('TKT-2026-0001', 'hola', MARIA)).rejects.toMatchObject({ codigo: 'ACCESO_DENEGADO' });
    await expect(gestor.listar('TKT-2026-0001', MARIA)).rejects.toMatchObject({ codigo: 'ACCESO_DENEGADO' });
    expect(repositorio.filas).toHaveLength(0);
  });
});

describe('oop_comentarios / infraestructura', () => {
  it('FuenteDeTicketsDelNucleo debería adaptar el TicketRepository del núcleo', async () => {
    const nucleo = { buscarPorId: jest.fn(async (id) => (id === TICKET.id ? { ...TICKET, titulo: 'x' } : null)) };
    const fuente = new FuenteDeTicketsDelNucleo(nucleo);
    expect(fuente).toBeInstanceOf(FuenteDeTickets);
    expect(await fuente.buscar(TICKET.id)).toEqual(TICKET);
    expect(await fuente.buscar('TKT-2026-9999')).toBeNull();
    expect(() => new FuenteDeTicketsDelNucleo({})).toThrow(/buscarPorId/);
  });

  it('las clases concretas deberían exigir sus dependencias', async () => {
    expect(() => new RepositorioComentariosSequelize()).toThrow(/requiere una conexión/);
    expect(() => new ControladorComentarios({})).toThrow(/GestorDeComentarios/);
  });
});
