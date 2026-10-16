// CONTROLADOR: recibe la petición, pide datos a los modelos y elige qué vista
// mostrar. No contiene reglas de negocio ni HTML.
const { validationResult } = require('express-validator');
const { CODIGOS } = require('../../../domain/errores');
const { STATUS_POR_CODIGO } = require('../../../infrastructure/http/middlewares/errorHandler');
const { sanitizarTexto } = require('../../../infrastructure/http/presentadores');
const { hiloView } = require('../views/hiloView');
const { errorView } = require('../views/errorView');

const ERRORES_DE_FORMULARIO = Object.freeze([CODIGOS.VALIDACION, CODIGOS.TRANSICION_INVALIDA]);

const _html = (res, status, contenido) => res.status(status).type('html').send(contenido);

const _errorDeId = (req) => validationResult(req).array().find((e) => e.path === 'id');

// Errores de dominio → página de error con su status; el resto, al errorHandler central
const _manejarError = (res, next, error) => {
  const status = error.name === 'ErrorDominio' && STATUS_POR_CODIGO[error.codigo];
  if (!status) return next(error);
  return _html(res, status, errorView({ mensaje: error.message }));
};

// modelos: { comentarioModel, ticketModel }
const crearComentariosController = ({ comentarioModel, ticketModel }) => {
  const _mostrarHilo = async (res, ticket, extra = {}, status = 200) => {
    const comentarios = await comentarioModel.listarPorTicket(ticket.id);
    return _html(res, status, hiloView({ ticket, comentarios, ...extra }));
  };

  // [] si se guardó; mensajes para repintar el formulario si no
  const _intentarComentar = async (req, ticket) => {
    const invalidos = validationResult(req).array().map((e) => e.msg);
    if (invalidos.length) return invalidos;
    try {
      await comentarioModel.crear({ ticket, autor: req.actor, texto: sanitizarTexto(req.body.texto) });
      return [];
    } catch (error) {
      if (error.name === 'ErrorDominio' && ERRORES_DE_FORMULARIO.includes(error.codigo)) return [error.message];
      throw error;
    }
  };

  const mostrar = async (req, res, next) => {
    try {
      if (_errorDeId(req)) return _html(res, 400, errorView({ mensaje: 'id de ticket inválido' }));
      return await _mostrarHilo(res, await ticketModel.buscar(req.params.id));
    } catch (error) {
      return _manejarError(res, next, error);
    }
  };

  const comentar = async (req, res, next) => {
    try {
      if (_errorDeId(req)) return _html(res, 400, errorView({ mensaje: 'id de ticket inválido' }));
      const ticket = await ticketModel.buscar(req.params.id);
      const errores = await _intentarComentar(req, ticket);
      if (errores.length) return await _mostrarHilo(res, ticket, { errores, texto: req.body.texto }, 400);
      return res.redirect(303, req.originalUrl); // Post/Redirect/Get
    } catch (error) {
      return _manejarError(res, next, error);
    }
  };

  return { mostrar, comentar };
};

module.exports = { crearComentariosController };
