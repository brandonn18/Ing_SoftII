// Capa de negocio probada sola: los DAO de la capa de datos son dobles.
const { crearComentariosService } = require('../../../src/modules/capas_comentarios/business/comentariosService');

const LUIS = { id: 10, nombre: 'Luis Usuario', rol: 'usuario' };
const ANA = { id: 20, nombre: 'Ana Técnica', rol: 'tecnico' };
const BETO = { id: 21, nombre: 'Beto Técnico', rol: 'tecnico' };
const MARIA = { id: 11, nombre: 'María Usuaria', rol: 'usuario' };
const ADMIN = { id: 1, nombre: 'Admin', rol: 'administrador' };

const crearDao = (ticket = { id: 'TKT-2026-0001', usuarioId: 10, tecnicoId: 20, estado: 'en_proceso' }) => ({
  tickets: { buscarPorId: jest.fn().mockResolvedValue(ticket) },
  comentarios: {
    listarPorTicket: jest.fn().mockResolvedValue([{ id: 1, texto: 'hola' }]),
    insertar: jest.fn().mockImplementation(async (datos) => ({ id: 1, ...datos })),
  },
});

describe('capas_comentarios / business / comentariosService', () => {
  it('no debería construirse sin los DAO', () => {
    expect(() => crearComentariosService({ comentarios: {} })).toThrow(/requiere los DAO/);
  });

  describe('comentar', () => {
    it('debería insertar el texto recortado con el snapshot del autor', async () => {
      // Arrange
      const dao = crearDao();
      // Act
      await crearComentariosService(dao).comentar('TKT-2026-0001', '  Ya lo reinicié  ', LUIS);
      // Assert
      expect(dao.comentarios.insertar).toHaveBeenCalledWith({
        ticketId: 'TKT-2026-0001', autorId: 10, autorNombre: 'Luis Usuario', autorRol: 'usuario', texto: 'Ya lo reinicié',
      });
    });

    it.each([['el dueño', LUIS], ['el técnico asignado', ANA], ['un administrador', ADMIN]])('debería permitir a %s', async (_q, actor) => {
      await expect(crearComentariosService(crearDao()).comentar('TKT-2026-0001', 'hola', actor)).resolves.toBeDefined();
    });

    it.each([['otro técnico', BETO], ['otra usuaria', MARIA]])('no debería permitir a %s', async (_q, actor) => {
      const dao = crearDao();
      await expect(crearComentariosService(dao).comentar('TKT-2026-0001', 'hola', actor)).rejects.toMatchObject({ codigo: 'ACCESO_DENEGADO' });
      expect(dao.comentarios.insertar).not.toHaveBeenCalled();
    });

    it('debería rechazar un ticket cerrado, uno inexistente y un texto inválido', async () => {
      const cerrado = crearDao({ id: 'TKT-2026-0001', usuarioId: 10, tecnicoId: 20, estado: 'cerrado' });
      await expect(crearComentariosService(cerrado).comentar('TKT-2026-0001', 'hola', LUIS)).rejects.toMatchObject({ codigo: 'TRANSICION_INVALIDA' });
      await expect(crearComentariosService(crearDao(null)).comentar('TKT-2026-0001', 'hola', LUIS)).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      await expect(crearComentariosService(crearDao()).comentar('TKT-2026-0001', '  ', LUIS)).rejects.toMatchObject({ codigo: 'VALIDACION' });
      await expect(crearComentariosService(crearDao()).comentar('TKT-2026-0001', 'a'.repeat(2001), LUIS)).rejects.toThrow(/no puede superar/);
    });
  });

  describe('listar', () => {
    it('debería devolver lo que entrega la capa de datos a quien ve el ticket', async () => {
      expect(await crearComentariosService(crearDao()).listar('TKT-2026-0001', BETO)).toEqual([{ id: 1, texto: 'hola' }]);
    });

    it('no debería mostrar el hilo a otra usuaria', async () => {
      await expect(crearComentariosService(crearDao()).listar('TKT-2026-0001', MARIA)).rejects.toMatchObject({ codigo: 'ACCESO_DENEGADO' });
    });
  });
});
