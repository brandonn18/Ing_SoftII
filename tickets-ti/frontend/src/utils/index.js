export const formatDate = (d) => d ? new Date(d).toLocaleString('es-CO') : '—';
export const formatEstado = (e) => e?.replace(/_/g, ' ') || '';
export const isSLAVencido = (sla_limite) => sla_limite && new Date(sla_limite) < new Date();
