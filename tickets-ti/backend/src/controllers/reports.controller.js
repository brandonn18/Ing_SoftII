const { Ticket, User, SLAConfig } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// ─── Admin: KPIs generales ────────────────────────────────────────────────

const summary = async (req, res, next) => {
  try {
    const ahora = new Date();

    const [
      totalTickets,
      porEstado,
      porPrioridad,
      porCategoria,
      tecnicosActivos,
      slaVencidos,
      slaCumplidos,
      resolutionData,
    ] = await Promise.all([
      Ticket.count(),
      Ticket.findAll({
        attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        group: ['estado'],
        raw: true,
      }),
      Ticket.findAll({
        attributes: ['prioridad', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        group: ['prioridad'],
        raw: true,
      }),
      Ticket.findAll({
        attributes: ['categoria', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        group: ['categoria'],
        raw: true,
      }),
      User.count({ where: { rol: 'tecnico', activo: true } }),
      Ticket.count({
        where: {
          sla_limite: { [Op.lt]: ahora },
          estado: { [Op.notIn]: ['resuelto', 'cerrado'] },
        },
      }),
      Ticket.count({
        where: {
          estado: { [Op.in]: ['resuelto', 'cerrado'] },
          [Op.and]: sequelize.literal('"updatedAt" <= "sla_limite"'),
        },
      }),
      Ticket.findAll({
        where: { estado: { [Op.in]: ['resuelto', 'cerrado'] } },
        attributes: [
          [sequelize.fn('AVG',
            sequelize.fn('EXTRACT', sequelize.literal("EPOCH FROM (\"updatedAt\" - \"createdAt\") / 3600"))
          ), 'promedioHoras'],
        ],
        raw: true,
      }),
    ]);

    const estadoMap = Object.fromEntries(porEstado.map((e) => [e.estado, parseInt(e.total)]));

    res.json({
      success: true,
      data: {
        totalTickets,
        abiertos: estadoMap.abierto || 0,
        asignados: estadoMap.asignado || 0,
        enProceso: estadoMap.en_proceso || 0,
        enEspera: estadoMap.en_espera || 0,
        resueltos: estadoMap.resuelto || 0,
        cerrados: estadoMap.cerrado || 0,
        promedioResolucionHoras: parseFloat(resolutionData[0]?.promedioHoras || 0).toFixed(1),
        ticketsPorPrioridad: porPrioridad,
        ticketsPorCategoria: porCategoria,
        tecnicosActivos,
        slaVencidos,
        slaCumplidos,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Tickets por período ───────────────────────────────────────────

const ticketsByPeriod = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const ahora = new Date();
    let desde;
    let truncar;

    if (period === 'week') {
      desde = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      truncar = 'day';
    } else if (period === 'quarter') {
      desde = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
      truncar = 'week';
    } else {
      desde = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
      truncar = 'day';
    }

    const data = await Ticket.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', truncar, sequelize.col('createdAt')), 'periodo'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      ],
      where: { createdAt: { [Op.gte]: desde } },
      group: [sequelize.fn('DATE_TRUNC', truncar, sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE_TRUNC', truncar, sequelize.col('createdAt')), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Rendimiento por técnico ──────────────────────────────────────

const technicianPerformance = async (req, res, next) => {
  try {
    const tecnicos = await User.findAll({
      where: { rol: 'tecnico' },
      attributes: ['id', 'nombre', 'email'],
    });

    const ahora = new Date();

    const data = await Promise.all(
      tecnicos.map(async (t) => {
        const [asignados, resueltos, slaVencidos] = await Promise.all([
          Ticket.count({ where: { tecnicoId: t.id } }),
          Ticket.count({ where: { tecnicoId: t.id, estado: { [Op.in]: ['resuelto', 'cerrado'] } } }),
          Ticket.count({
            where: {
              tecnicoId: t.id,
              sla_limite: { [Op.lt]: ahora },
              estado: { [Op.notIn]: ['resuelto', 'cerrado'] },
            },
          }),
        ]);

        const promResult = await Ticket.findOne({
          where: { tecnicoId: t.id, estado: { [Op.in]: ['resuelto', 'cerrado'] } },
          attributes: [
            [sequelize.fn('AVG',
              sequelize.fn('EXTRACT', sequelize.literal("EPOCH FROM (\"updatedAt\" - \"createdAt\") / 3600"))
            ), 'prom'],
          ],
          raw: true,
        });

        return {
          tecnicoId: t.id,
          nombre: t.nombre,
          email: t.email,
          ticketsAsignados: asignados,
          ticketsResueltos: resueltos,
          promedioResolucionHoras: parseFloat(promResult?.prom || 0).toFixed(1),
          slasCumplidos: resueltos,
          slasVencidos: slaVencidos,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Cumplimiento SLA por categoría y prioridad ───────────────────

const slaCompliance = async (req, res, next) => {
  try {
    const ahora = new Date();

    const porCategoria = await Ticket.findAll({
      attributes: [
        'categoria',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal(
          `CASE WHEN "sla_limite" < '${ahora.toISOString()}' AND estado NOT IN ('resuelto','cerrado') THEN 1 ELSE 0 END`
        )), 'vencidos'],
      ],
      group: ['categoria'],
      raw: true,
    });

    const porPrioridad = await Ticket.findAll({
      attributes: [
        'prioridad',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal(
          `CASE WHEN "sla_limite" < '${ahora.toISOString()}' AND estado NOT IN ('resuelto','cerrado') THEN 1 ELSE 0 END`
        )), 'vencidos'],
      ],
      group: ['prioridad'],
      raw: true,
    });

    res.json({ success: true, data: { porCategoria, porPrioridad } });
  } catch (error) {
    next(error);
  }
};

// ─── Técnico: Su dashboard personal ──────────────────────────────────────

const myDashboard = async (req, res, next) => {
  try {
    const tecnicoId = req.user.id;
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const semana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [misTickets, porEstado, resueltosSemana, resueltoHoy, slaVencidos, slaEnRiesgo] = await Promise.all([
      Ticket.count({ where: { tecnicoId, estado: { [Op.notIn]: ['resuelto', 'cerrado'] } } }),
      Ticket.findAll({
        attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        where: { tecnicoId },
        group: ['estado'],
        raw: true,
      }),
      Ticket.count({ where: { tecnicoId, estado: { [Op.in]: ['resuelto', 'cerrado'] }, updatedAt: { [Op.gte]: semana } } }),
      Ticket.count({ where: { tecnicoId, estado: { [Op.in]: ['resuelto', 'cerrado'] }, updatedAt: { [Op.gte]: hoy } } }),
      Ticket.count({
        where: { tecnicoId, sla_limite: { [Op.lt]: ahora }, estado: { [Op.notIn]: ['resuelto', 'cerrado'] } },
      }),
      Ticket.count({
        where: {
          tecnicoId,
          sla_alerta_enviada: true,
          estado: { [Op.notIn]: ['resuelto', 'cerrado'] },
        },
      }),
    ]);

    res.json({
      success: true,
      data: { misTickets, porEstado, resueltosSemana, resueltoHoy, slaVencidos, slaEnRiesgo },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Usuario: Resumen de sus tickets ─────────────────────────────────────

const myTicketsSummary = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;

    const [total, abiertos, enEspera, resueltos, recientes] = await Promise.all([
      Ticket.count({ where: { usuarioId } }),
      Ticket.count({ where: { usuarioId, estado: { [Op.in]: ['abierto', 'asignado', 'en_proceso'] } } }),
      Ticket.count({ where: { usuarioId, estado: 'en_espera' } }),
      Ticket.count({ where: { usuarioId, estado: { [Op.in]: ['resuelto', 'cerrado'] } } }),
      Ticket.findAll({
        where: { usuarioId },
        order: [['updatedAt', 'DESC']],
        limit: 1,
        attributes: ['updatedAt'],
        raw: true,
      }),
    ]);

    res.json({
      success: true,
      data: { total, abiertos, enEspera, resueltos, ultimaActividad: recientes[0]?.updatedAt || null },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Legacy endpoints (compatibilidad) ───────────────────────────────────

const resumen = async (req, res, next) => {
  try {
    const total = await Ticket.count();
    const porEstado = await Ticket.findAll({
      attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['estado'],
      raw: true,
    });
    const porPrioridad = await Ticket.findAll({
      attributes: ['prioridad', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['prioridad'],
      raw: true,
    });
    res.json({ success: true, data: { total, porEstado, porPrioridad } });
  } catch (error) {
    next(error);
  }
};

const slaReport = async (req, res, next) => {
  try {
    const ahora = new Date();
    const vencidos = await Ticket.count({
      where: { sla_limite: { [Op.lt]: ahora }, estado: { [Op.notIn]: ['resuelto', 'cerrado'] } },
    });
    const enRiesgo = await Ticket.count({
      where: {
        sla_limite: { [Op.between]: [ahora, new Date(ahora.getTime() + 2 * 60 * 60 * 1000)] },
        estado: { [Op.notIn]: ['resuelto', 'cerrado'] },
      },
    });
    res.json({ success: true, data: { vencidos, enRiesgo } });
  } catch (error) {
    next(error);
  }
};

const porTecnico = async (req, res, next) => {
  try {
    const data = await Ticket.findAll({
      attributes: ['tecnicoId', [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'total']],
      include: [{ model: User, as: 'tecnico', attributes: ['nombre'] }],
      group: ['tecnicoId', 'tecnico.id'],
      raw: false,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  summary, ticketsByPeriod, technicianPerformance, slaCompliance,
  myDashboard, myTicketsSummary,
  resumen, slaReport, porTecnico,
};
