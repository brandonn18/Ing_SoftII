const { SLAConfig } = require('../models');

const getAll = async (req, res, next) => {
  try {
    const configs = await SLAConfig.findAll({ order: [['tiempo_horas', 'ASC']] });
    res.json({ success: true, data: configs });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const config = await SLAConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Configuración SLA no encontrada' });
    await config.update(req.body);
    res.json({ success: true, data: config, message: 'Configuración SLA actualizada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, update };
