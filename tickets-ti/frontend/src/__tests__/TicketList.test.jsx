import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Tickets from '../pages/Tickets';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../services/ticketService', () => ({
  ticketService: {
    getAll: jest.fn(),
  },
}));

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const { ticketService } = require('../services/ticketService');

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const ahora = Date.now();
const MOCK_TICKETS = [
  {
    id: 'TKT-2026-0001',
    titulo: 'Fallo de red en piso 3',
    tipo: 'incidente',
    categoria: 'red',
    prioridad: 'critica',
    estado: 'abierto',
    createdAt: new Date(ahora - 3600000).toISOString(),
    sla_limite: new Date(ahora + 2 * 60 * 60 * 1000).toISOString(), // 2h → SLA 83% consumido (alerta)
    usuario: { id: 1, nombre: 'Juan', email: 'juan@test.com' },
    tecnico: null,
  },
  {
    id: 'TKT-2026-0002',
    titulo: 'Excel no abre archivos .xlsx',
    tipo: 'incidente',
    categoria: 'software',
    prioridad: 'alta',
    estado: 'asignado',
    createdAt: new Date(ahora - 7200000).toISOString(),
    sla_limite: new Date(ahora + 5 * 60 * 60 * 1000).toISOString(),
    usuario: { id: 2, nombre: 'Maria', email: 'maria@test.com' },
    tecnico: { id: 3, nombre: 'Carlos Técnico', email: 'carlos@test.com' },
  },
  {
    id: 'TKT-2026-0003',
    titulo: 'Sin acceso al sistema de nómina',
    tipo: 'solicitud',
    categoria: 'accesos',
    prioridad: 'media',
    estado: 'en_proceso',
    createdAt: new Date(ahora - 10800000).toISOString(),
    sla_limite: new Date(ahora + 20 * 60 * 60 * 1000).toISOString(),
    usuario: { id: 1, nombre: 'Juan', email: 'juan@test.com' },
    tecnico: { id: 3, nombre: 'Carlos Técnico', email: 'carlos@test.com' },
  },
];

const META_BASE = { total: 3, page: 1, limit: 20, totalPages: 1 };

// Helper para renderizar con Router
const renderTickets = () =>
  render(
    <MemoryRouter>
      <Tickets />
    </MemoryRouter>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TicketList — renderizado de la lista', () => {
  beforeEach(() => {
    ticketService.getAll.mockReset();
    ticketService.getAll.mockResolvedValue({ data: MOCK_TICKETS, meta: META_BASE });
  });

  test('Renderiza correctamente la lista de tickets con sus títulos', async () => {
    renderTickets();

    await waitFor(() => {
      expect(screen.getByText('Fallo de red en piso 3')).toBeInTheDocument();
      expect(screen.getByText('Excel no abre archivos .xlsx')).toBeInTheDocument();
      expect(screen.getByText('Sin acceso al sistema de nómina')).toBeInTheDocument();
    });
  });

  test('Muestra el total de tickets en el encabezado', async () => {
    renderTickets();

    await waitFor(() => {
      expect(screen.getByText(/3 tickets/i)).toBeInTheDocument();
    });
  });

  test('Muestra el nombre del técnico asignado o "—" si no hay', async () => {
    renderTickets();

    await waitFor(() => {
      expect(screen.getAllByText('Carlos Técnico')).toHaveLength(2);
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  test('Muestra estado "Cargando tickets..." mientras fetch está en curso', () => {
    ticketService.getAll.mockImplementation(() => new Promise(() => {})); // nunca resuelve
    renderTickets();
    expect(screen.getByText(/cargando tickets/i)).toBeInTheDocument();
  });

  test('Muestra "No se encontraron tickets" cuando el resultado está vacío', async () => {
    ticketService.getAll.mockResolvedValue({ data: [], meta: { ...META_BASE, total: 0 } });
    renderTickets();

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron tickets/i)).toBeInTheDocument();
    });
  });
});

// ─── Tests de badges de prioridad ─────────────────────────────────────────────

// El Badge renderiza un <span class="... rounded-full ...">texto</span>.
// Los select options usan el mismo texto (ej. 'critica', 'alta') pero NO tienen
// la clase rounded-full, lo que permite distinguirlos con getAllByText + filter.
const getBadge = (texto) => {
  const elementos = screen.getAllByText(texto);
  return elementos.find((el) => el.classList.contains('rounded-full'));
};

describe('TicketList — badges de prioridad y estado', () => {
  beforeEach(() => {
    ticketService.getAll.mockResolvedValue({ data: MOCK_TICKETS, meta: META_BASE });
  });

  test('Badge de prioridad "critica" tiene clases de color rojo', async () => {
    renderTickets();

    await waitFor(() => {
      const badge = getBadge('critica');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });
  });

  test('Badge de prioridad "alta" tiene clases de color naranja', async () => {
    renderTickets();

    await waitFor(() => {
      const badge = getBadge('alta');
      expect(badge).toHaveClass('bg-orange-100');
      expect(badge).toHaveClass('text-orange-800');
    });
  });

  test('Badge de prioridad "media" tiene clases de color amarillo', async () => {
    renderTickets();

    await waitFor(() => {
      const badge = getBadge('media');
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
    });
  });

  test('Badge de estado "abierto" tiene clases de color azul', async () => {
    renderTickets();

    await waitFor(() => {
      const badge = getBadge('abierto');
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-800');
    });
  });

  test('Badge de estado "en proceso" tiene clases de color naranja', async () => {
    renderTickets();

    await waitFor(() => {
      // 'en proceso' solo aparece en el badge (los options usan 'en_proceso' sin reemplazar)
      const badgeEnProceso = screen.getByText('en proceso');
      expect(badgeEnProceso).toHaveClass('bg-orange-100');
    });
  });
});

// ─── Tests de filtros ─────────────────────────────────────────────────────────

describe('TicketList — filtros actualizan la lista', () => {
  const TICKETS_ABIERTOS = [MOCK_TICKETS[0]];

  beforeEach(() => {
    ticketService.getAll.mockReset();
    // Primera llamada: carga inicial con todos
    // Segunda llamada: resultado filtrado por estado=abierto
    ticketService.getAll
      .mockResolvedValueOnce({ data: MOCK_TICKETS, meta: META_BASE })
      .mockResolvedValueOnce({
        data: TICKETS_ABIERTOS,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
  });

  test('Cambiar filtro de estado llama getAll con parámetro correcto', async () => {
    renderTickets();
    await waitFor(() => screen.getByText('Fallo de red en piso 3'));

    const selectEstado = screen.getByDisplayValue('Todos los estados');
    await userEvent.selectOptions(selectEstado, 'abierto');

    await waitFor(() => {
      expect(ticketService.getAll).toHaveBeenCalledTimes(2);
      const segundaLlamada = ticketService.getAll.mock.calls[1][0];
      expect(segundaLlamada).toMatchObject({ estado: 'abierto', page: 1 });
    });
  });

  test('Filtro de estado actualiza los tickets mostrados', async () => {
    renderTickets();
    await waitFor(() => screen.getByText('Excel no abre archivos .xlsx'));

    const selectEstado = screen.getByDisplayValue('Todos los estados');
    await userEvent.selectOptions(selectEstado, 'abierto');

    await waitFor(() => {
      expect(screen.getByText('Fallo de red en piso 3')).toBeInTheDocument();
      expect(screen.queryByText('Excel no abre archivos .xlsx')).not.toBeInTheDocument();
    });
  });
});
