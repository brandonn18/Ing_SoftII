import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginForm — validaciones client-side', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  test('Muestra error si el email está vacío al intentar hacer login', async () => {
    renderLogin();

    const boton = screen.getByRole('button', { name: /ingresar/i });
    await userEvent.click(boton);

    await waitFor(() => {
      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('Muestra error si la contraseña tiene menos de 8 caracteres', async () => {
    renderLogin();

    const inputEmail = screen.getByPlaceholderText(/tu@empresa\.com/i);
    const inputPassword = screen.getByLabelText(/contraseña/i);

    await userEvent.type(inputEmail, 'usuario@test.com');
    await userEvent.type(inputPassword, 'abc');

    const boton = screen.getByRole('button', { name: /ingresar/i });
    await userEvent.click(boton);

    await waitFor(() => {
      expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('No muestra error con credenciales de formato válido', async () => {
    mockLogin.mockResolvedValue({ token: 'tok123', user: { rol: 'usuario' } });

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/tu@empresa\.com/i), 'usuario@test.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Password1!');

    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('usuario@test.com', 'Password1!');
    });
    expect(screen.queryByText(/requerido/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/al menos 8 caracteres/i)).not.toBeInTheDocument();
  });
});

describe('LoginForm — estado del botón', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  test('El botón está habilitado en estado inicial', () => {
    renderLogin();
    const boton = screen.getByRole('button', { name: /ingresar/i });
    expect(boton).not.toBeDisabled();
  });

  test('Deshabilita el botón mientras la petición de login está en curso', async () => {
    // Login que nunca resuelve → simula petición lenta
    mockLogin.mockImplementation(() => new Promise(() => {}));

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/tu@empresa\.com/i), 'usuario@test.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Password1!');

    const boton = screen.getByRole('button', { name: /ingresar/i });
    await userEvent.click(boton);

    await waitFor(() => {
      expect(boton).toBeDisabled();
    });
  });

  test('Muestra texto "Ingresando..." en el botón durante la carga', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/tu@empresa\.com/i), 'usuario@test.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText(/ingresando/i)).toBeInTheDocument();
    });
  });
});

describe('LoginForm — manejo de errores de API', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  test('Muestra mensaje de credenciales inválidas si el servidor responde 401', async () => {
    const err = new Error('Unauthorized');
    err.response = { status: 401, data: { message: 'Credenciales inválidas' } };
    mockLogin.mockRejectedValue(err);

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/tu@empresa\.com/i), 'malo@test.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Wrongpass1!');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText(/email o contraseña incorrectos/i)).toBeInTheDocument();
    });
  });

  test('Muestra mensaje de cuenta bloqueada si el servidor responde 423', async () => {
    const err = new Error('Locked');
    err.response = { status: 423, data: { message: 'Cuenta bloqueada' } };
    mockLogin.mockRejectedValue(err);

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/tu@empresa\.com/i), 'bloqueado@test.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Test1234!');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText(/bloqueada temporalmente/i)).toBeInTheDocument();
    });
  });

  test('El botón vuelve a habilitarse después de un error', async () => {
    const err = new Error('Unauthorized');
    err.response = { status: 401, data: { message: 'Credenciales inválidas' } };
    mockLogin.mockRejectedValue(err);

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/tu@empresa\.com/i), 'x@test.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Test1234!');

    const boton = screen.getByRole('button', { name: /ingresar/i });
    await userEvent.click(boton);

    await waitFor(() => {
      expect(boton).not.toBeDisabled();
    });
  });

  test('Login exitoso redirige según el rol del usuario', async () => {
    mockLogin.mockResolvedValue({ token: 'tok123', user: { rol: 'administrador' } });

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/tu@empresa\.com/i), 'admin@test.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Admin123!');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
