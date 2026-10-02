import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import LoginScreen from '../app/login';
import SignupScreen from '../app/signup';
import { EditProfileModal } from '../components/AccountModals';
import { AuthResult, login, register, updateProfile } from '../services/auth';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../services/auth', () => ({ login: jest.fn(), register: jest.fn(), updateProfile: jest.fn() }));

const replace = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push: jest.fn(), back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), replace,
    dismiss: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn(), canDismiss: () => false,
    setParams: jest.fn(), reload: jest.fn(), prefetch: jest.fn(),
  });
});

test('login mantém validação e controles acessíveis de senha', async () => {
  const screen = await render(<LoginScreen />);
  await fireEvent.press(screen.getByText('Entrar'));
  expect(screen.getByText('Preencha e-mail e senha.')).toBeTruthy();
  expect(login).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('OK'));
  expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
  await fireEvent.press(screen.getByLabelText('Mostrar senha'));
  expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
  await fireEvent.press(screen.getByLabelText('Ocultar senha'));
  expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
});

test('login mostra envio, bloqueia repetição e navega após sucesso', async () => {
  let resolve!: (result: AuthResult) => void;
  jest.mocked(login).mockReturnValue(new Promise((done) => { resolve = done; }));
  const screen = await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText('E-mail'), ' observer@example.test ');
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'synthetic-password');
  const pendingPress = fireEvent.press(screen.getByText('Entrar'));
  await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: 'Entrando...' }).props.accessibilityState.disabled).toBe(true);
  expect(login).toHaveBeenCalledTimes(1);
  expect(login).toHaveBeenCalledWith('observer@example.test', 'synthetic-password');
  await act(async () => resolve({ success: true }));
  await pendingPress;
  expect(replace).toHaveBeenCalledWith('/(tabs)');
});

test('cadastro mantém validação de confirmação e confirmação de sucesso', async () => {
  jest.mocked(register).mockResolvedValue({ success: true });
  const screen = await render(<SignupScreen />);
  await fireEvent.changeText(screen.getByLabelText('Nome completo'), ' Pessoa de teste ');
  await fireEvent.changeText(screen.getByLabelText('E-mail'), 'observer@example.test');
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'synthetic-password');
  await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'different-password');
  await fireEvent.press(screen.getByText('Criar conta'));
  expect(screen.getByText('As senhas não coincidem.')).toBeTruthy();
  expect(register).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('OK'));
  await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'synthetic-password');
  await fireEvent.press(screen.getByText('Criar conta'));
  await waitFor(() => expect(screen.getByText('Conta criada!')).toBeTruthy());
  expect(register).toHaveBeenCalledWith('Pessoa de teste', 'observer@example.test', 'synthetic-password');
  expect(replace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('OK'));
  expect(replace).toHaveBeenCalledWith('/login');
});

test('edição de perfil mostra erro do serviço sem fechar o formulário', async () => {
  jest.mocked(updateProfile).mockResolvedValue({ success: false, message: 'Falha sintética de atualização' });
  const onClose = jest.fn();
  const onSaved = jest.fn();
  const screen = await render(<EditProfileModal visible user={{ id: 'synthetic-user', name: 'Pessoa de teste', email: 'observer@example.test', createdAt: '', updatedAt: '' }} onClose={onClose} onSaved={onSaved} />);
  await fireEvent.press(screen.getByText('Salvar alterações'));
  await waitFor(() => expect(screen.getByText('Falha sintética de atualização')).toBeTruthy());
  await fireEvent.press(screen.getByText('OK'));
  expect(onClose).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Nome').props.value).toBe('Pessoa de teste');
});

test('erro inesperado ao atualizar perfil também é exibido e permite repetir', async () => {
  jest.mocked(updateProfile).mockRejectedValueOnce(new Error('storage unavailable')).mockResolvedValueOnce({
    success: true,
    user: { id: 'synthetic-user', name: 'Pessoa de teste', email: 'observer@example.test', createdAt: '', updatedAt: '' },
  });
  const onSaved = jest.fn();
  const screen = await render(<EditProfileModal visible user={{ id: 'synthetic-user', name: 'Pessoa de teste', email: 'observer@example.test', createdAt: '', updatedAt: '' }} onClose={jest.fn()} onSaved={onSaved} />);
  await fireEvent.press(screen.getByText('Salvar alterações'));
  await waitFor(() => expect(screen.getByText('Não foi possível salvar')).toBeTruthy());
  await fireEvent.press(screen.getByText('OK'));
  await fireEvent.press(screen.getByText('Salvar alterações'));
  await waitFor(() => expect(screen.getByText('Perfil atualizado')).toBeTruthy());
  expect(onSaved).toHaveBeenCalledTimes(1);
});
