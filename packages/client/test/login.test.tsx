import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth';
import Login from '../src/pages/Login';

vi.mock('../src/api', () => ({
  api: {
    me: vi.fn().mockRejectedValue(new Error('Bạn cần đăng nhập')),
    login: vi.fn().mockRejectedValue(new Error('Sai tên đăng nhập hoặc mật khẩu')),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Login page', () => {
  it('shows the server error after a failed login', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'lam');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'wrong12');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText('Sai tên đăng nhập hoặc mật khẩu')).toBeInTheDocument();
  });

  it('switches to the register tab', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('tab', { name: 'Đăng ký' }));
    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeInTheDocument();
  });
});
