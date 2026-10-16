const { Comentario, LONGITUD_MAXIMA, politicaComentarios } = require('../../../src/modules/hexagonal_comentarios/domain');

const AHORA = new Date('2026-10-15T12:00:00.000Z');
const LUIS = { id: 10, nombre: 'Luis Usuario', rol: 'usuario' };
const ANA = { id: 20, nombre: 'Ana Técnica', rol: 'tecnico' };
const BETO = { id: 21, nombre: 'Beto Técnico', rol: 'tecnico' };
const MARIA = { id: 11, nombre: 'María Usuaria', rol: 'usuario' };
const ADMIN = { id: 1, nombre: 'Admin', rol: 'administrador' };

const ticket = (overrides = {}) => ({ id: 'TKT-2026-0001', usuarioId: 10, tecnicoId: 20, estado: 'en_proceso', ...overrides });
const crear = (texto, autor = LUIS) => Comentario.crear({ ticketId: 'TKT-2026-0001', autor, texto }, { ahora: AHORA });

describe('Comentario', () => {
  describe('crear', () => {
    it('debería guardar el texto recortado y el snapshot del autor', () => {
      // Act
      const comentario = crear('  No enciende  ', ANA);
      // Assert
      expect(comentario).toMatchObject({
        id: null, ticketId: 'TKT-2026-0001', autorId: 20, autor_nombre: 'Ana Técnica', autor_rol: 'tecnico', texto: 'No enciende', createdAt: AHORA,
      });
    });

    it('debería ser inmutable', () => {
      expect(Object.isFrozen(crear('hola'))).toBe(true);
    });

    it.each([[''], ['   '], [undefined], [42]])('no debería aceptar el texto %p', (texto) => {
      expect(() => crear(texto)).toThrow(expect.objectContaining({ codigo: 'VALIDACION' }));
    });

    it(`debería aceptar hasta ${LONGITUD_MAXIMA} caracteres y rechazar uno más`, () => {
      expect(crear('a'.repeat(LONGITUD_MAXIMA)).texto).toHaveLength(LONGITUD_MAXIMA);
      expect(() => crear('a'.repeat(LONGITUD_MAXIMA + 1))).toThrow(/no puede superar/);
    });

    it('no debería aceptar un autor sin id o sin nombre', () => {
      expect(() => crear('hola', { nombre: 'X', rol: 'usuario' })).toThrow('Autor inválido');
      expect(() => crear('hola', { id: 1, nombre: ' ', rol: 'usuario' })).toThrow('Nombre del autor requerido');
    });

    it('no debería aceptar un comentario sin ticket', () => {
      expect(() => Comentario.crear({ ticketId: '', autor: LUIS, texto: 'hola' }, { ahora: AHORA })).toThrow('Ticket requerido');
    });
  });

  it('debería reconstruirse desde persistencia y volver a primitivos', () => {
    const props = { id: 7, ticketId: 'TKT-2026-0001', autorId: 10, autor_nombre: 'Luis', autor_rol: 'usuario', texto: 'x', createdAt: AHORA };
    expect(Comentario.desdePersistencia(props).aPrimitivos()).toEqual(props);
  });
});

describe('politicaComentarios', () => {
  describe('exigirComentar', () => {
    it.each([['el dueño', LUIS], ['el técnico asignado', ANA], ['un administrador', ADMIN]])('debería permitir a %s', (_quien, actor) => {
      expect(() => politicaComentarios.exigirComentar(ticket(), actor)).not.toThrow();
    });

    it.each([['otro técnico', BETO], ['otro usuario', MARIA]])('no debería permitir a %s', (_quien, actor) => {
      expect(() => politicaComentarios.exigirComentar(ticket(), actor)).toThrow(expect.objectContaining({ codigo: 'ACCESO_DENEGADO' }));
    });

    it('no debería permitir comentar un ticket cerrado', () => {
      expect(() => politicaComentarios.exigirComentar(ticket({ estado: 'cerrado' }), LUIS))
        .toThrow(expect.objectContaining({ codigo: 'TRANSICION_INVALIDA' }));
    });
  });

  describe('exigirLeer', () => {
    it('debería seguir la misma regla que ver el ticket', () => {
      expect(() => politicaComentarios.exigirLeer(ticket(), BETO)).not.toThrow();
      expect(() => politicaComentarios.exigirLeer(ticket(), LUIS)).not.toThrow();
      expect(() => politicaComentarios.exigirLeer(ticket(), MARIA)).toThrow(expect.objectContaining({ codigo: 'ACCESO_DENEGADO' }));
    });
  });
});
