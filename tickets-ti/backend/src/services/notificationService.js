const { Notification } = require('../models');
const { sendEmail } = require('../config/email');
const socketService = require('./socketService');

// ─── Persistencia en DB ────────────────────────────────────────────────────

const crear = async ({ usuarioId, ticketId, tipo, mensaje }) => {
  const notif = await Notification.create({ usuarioId, ticketId, tipo, mensaje });
  socketService.emitToUser(usuarioId, 'notificacion:nueva', notif);
  return notif;
};

// ─── Helpers de plantilla ──────────────────────────────────────────────────

const _layout = (title, body) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
  .header{background:#1d4ed8;padding:28px 32px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:.5px}
  .body{padding:32px}
  .body p{color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600}
  .badge-blue{background:#dbeafe;color:#1d4ed8}
  .badge-orange{background:#fef3c7;color:#b45309}
  .badge-red{background:#fee2e2;color:#b91c1c}
  .badge-green{background:#d1fae5;color:#065f46}
  .info-box{background:#f8fafc;border-left:4px solid #1d4ed8;padding:16px;border-radius:0 6px 6px 0;margin:20px 0}
  .info-box p{margin:4px 0;color:#374151;font-size:14px}
  .info-box strong{color:#111827}
  .btn{display:inline-block;background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin:8px 0}
  .footer{background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head>
<body>
<div class="wrap">
  <div class="header"><h1>🎫 Tickets TI — ${title}</h1></div>
  <div class="body">${body}</div>
  <div class="footer">Sistema de Gestión de Tickets · Universidad de Pamplona<br>Este es un mensaje automático, no respondas a este correo.</div>
</div>
</body></html>`;

const _prioridadBadge = (p) => {
  const map = { critica: 'badge-red', alta: 'badge-orange', media: 'badge-blue', baja: 'badge-green' };
  return `<span class="badge ${map[p] || 'badge-blue'}">${p?.toUpperCase()}</span>`;
};

// ─── Emails de usuarios ────────────────────────────────────────────────────

const sendWelcomeEmail = (user, tempPassword) =>
  sendEmail({
    to: user.email,
    subject: '¡Bienvenido al Sistema de Tickets TI!',
    html: _layout('Bienvenido', `
      <p>Hola <strong>${user.nombre}</strong>,</p>
      <p>Tu cuenta ha sido creada exitosamente en el Sistema de Gestión de Tickets TI.</p>
      <div class="info-box">
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Contraseña temporal:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
        <p><strong>Rol asignado:</strong> ${user.rol}</p>
      </div>
      <p>⚠️ <strong>Por seguridad</strong>, cambia tu contraseña al ingresar por primera vez desde tu perfil.</p>
    `),
  });

const sendPasswordResetEmail = (user, tempPassword) =>
  sendEmail({
    to: user.email,
    subject: 'Restablecimiento de contraseña — Tickets TI',
    html: _layout('Restablecimiento de contraseña', `
      <p>Hola <strong>${user.nombre}</strong>,</p>
      <p>Un administrador ha restablecido tu contraseña.</p>
      <div class="info-box">
        <p><strong>Contraseña temporal:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
      </div>
      <p>⚠️ Esta contraseña es temporal. Ingresar y cambiarla de inmediato desde <strong>Mi Perfil</strong>.</p>
      <p>Si no solicitaste este cambio, contacta al administrador inmediatamente.</p>
    `),
  });

// ─── Emails de tickets ─────────────────────────────────────────────────────

const sendTicketAssignedEmail = (tecnico, ticket) =>
  sendEmail({
    to: tecnico.email,
    subject: `[${ticket.id}] Ticket asignado — ${ticket.titulo}`,
    html: _layout('Ticket asignado', `
      <p>Hola <strong>${tecnico.nombre}</strong>,</p>
      <p>Se te ha asignado un nuevo ticket de soporte que requiere tu atención.</p>
      <div class="info-box">
        <p><strong>ID:</strong> ${ticket.id}</p>
        <p><strong>Título:</strong> ${ticket.titulo}</p>
        <p><strong>Tipo:</strong> ${ticket.tipo} &nbsp;|&nbsp; <strong>Categoría:</strong> ${ticket.categoria}</p>
        <p><strong>Prioridad:</strong> ${_prioridadBadge(ticket.prioridad)}</p>
        <p><strong>SLA límite:</strong> ${new Date(ticket.sla_limite).toLocaleString('es-CO')}</p>
      </div>
      <p><strong>Descripción:</strong><br>${ticket.descripcion}</p>
      <p>Ingresa al sistema para gestionar este ticket.</p>
    `),
  });

const sendTicketResolvedEmail = (usuario, ticket) =>
  sendEmail({
    to: usuario.email,
    subject: `[${ticket.id}] Tu ticket ha sido resuelto`,
    html: _layout('Ticket resuelto', `
      <p>Hola <strong>${usuario.nombre}</strong>,</p>
      <p>Nos complace informarte que tu solicitud de soporte ha sido atendida.</p>
      <div class="info-box">
        <p><strong>ID:</strong> ${ticket.id}</p>
        <p><strong>Título:</strong> ${ticket.titulo}</p>
        <p><strong>Estado:</strong> <span class="badge badge-green">RESUELTO</span></p>
        <p><strong>Técnico:</strong> ${ticket.tecnico?.nombre || 'Sin asignar'}</p>
      </div>
      <p>Si el problema persiste, puedes reabrir el ticket desde el sistema indicando el motivo.</p>
    `),
  });

const sendSLAAlertEmail = (tecnico, ticket, porcentajeConsumido) =>
  sendEmail({
    to: tecnico.email,
    subject: `⚠️ Alerta SLA — ${ticket.id} al ${Math.round(porcentajeConsumido)}%`,
    html: _layout('Alerta de SLA', `
      <p>Hola <strong>${tecnico.nombre}</strong>,</p>
      <p>⚠️ El siguiente ticket está próximo a vencer su SLA:</p>
      <div class="info-box">
        <p><strong>ID:</strong> ${ticket.id}</p>
        <p><strong>Título:</strong> ${ticket.titulo}</p>
        <p><strong>Prioridad:</strong> ${_prioridadBadge(ticket.prioridad)}</p>
        <p><strong>SLA límite:</strong> ${new Date(ticket.sla_limite).toLocaleString('es-CO')}</p>
        <p><strong>Tiempo consumido:</strong>
          <span class="badge badge-red">${Math.round(porcentajeConsumido)}%</span>
        </p>
      </div>
      <p>Por favor atiende este ticket a la brevedad para evitar el vencimiento del SLA.</p>
    `),
  });

// ─── Notificación genérica por email ───────────────────────────────────────

const notificarPorEmail = async ({ to, subject, html }) => {
  try {
    await sendEmail({ to, subject, html });
  } catch (err) {
    console.error('Error enviando email:', err.message);
  }
};

module.exports = {
  crear,
  notificarPorEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTicketAssignedEmail,
  sendTicketResolvedEmail,
  sendSLAAlertEmail,
};
