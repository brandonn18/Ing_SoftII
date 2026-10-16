// Contrato de ComentarioRepository: el doble en memoria y el adaptador
// Sequelize deben comportarse igual (LSP).
const { Comentario } = require('../../../src/modules/comentarios/domain');
const { definirModeloComentario } = require('../../../src/modules/comentarios');
const SequelizeComentarioRepository = require('../../../src/modules/comentarios/adapters/persistencia/SequelizeComentarioRepository');
const { abrirBdDePrueba } = require('../../infrastructure/bdDePrueba');
const { ComentarioRepositoryEnMemoria } = require('./fakes');

const AHORA = new Date('2026-10-15T12:00:00.000Z');
const nuevo = (ticketId, texto) => Comentario.crear({ ticketId, autor: { id: 10, nombre: 'Luis', rol: 'usuario' }, texto }, { ahora: AHORA });

const probarContrato = (nombre, fabrica) => {
  describe(`Contrato ComentarioRepository — ${nombre}`, () => {
    let ctx;
    beforeAll(async () => { ctx = await fabrica(); });
    beforeEach(async () => { await ctx.limpiar(); });
    afterAll(async () => { await ctx.cerrar(); });

    it('debería guardar y devolver una entidad Comentario con id y fecha', async () => {
      const guardado = await ctx.repo.guardar(nuevo('TKT-2026-0001', 'hola'));
      expect(guardado).toBeInstanceOf(Comentario);
      expect(guardado).toMatchObject({ ticketId: 'TKT-2026-0001', autorId: 10, autor_nombre: 'Luis', autor_rol: 'usuario', texto: 'hola' });
      expect(Number.isInteger(guardado.id)).toBe(true);
      expect(guardado.createdAt).toBeInstanceOf(Date);
    });

    it('debería listar solo los del ticket pedido, en el orden en que se guardaron', async () => {
      await ctx.repo.guardar(nuevo('TKT-2026-0001', 'uno'));
      await ctx.repo.guardar(nuevo('TKT-2026-0002', 'otro ticket'));
      await ctx.repo.guardar(nuevo('TKT-2026-0001', 'dos'));
      expect((await ctx.repo.listarPorTicket('TKT-2026-0001')).map((c) => c.texto)).toEqual(['uno', 'dos']);
      expect(await ctx.repo.listarPorTicket('TKT-2026-0003')).toEqual([]);
    });
  });
};

probarContrato('en memoria', async () => {
  const ctx = { repo: null, cerrar: async () => {} };
  ctx.limpiar = async () => { ctx.repo = new ComentarioRepositoryEnMemoria(); };
  return ctx;
});

probarContrato('Sequelize (PostgreSQL)', async () => {
  const bd = await abrirBdDePrueba();
  const modelo = definirModeloComentario(bd.sequelize);
  await modelo.sync({ force: true });
  return {
    repo: new SequelizeComentarioRepository(modelo),
    limpiar: () => modelo.destroy({ truncate: true, force: true, restartIdentity: true }),
    cerrar: bd.cerrar,
  };
});

describe('SequelizeComentarioRepository', () => {
  it('no debería construirse sin modelo', () => {
    expect(() => new SequelizeComentarioRepository()).toThrow(/requiere el modelo/);
  });
});
