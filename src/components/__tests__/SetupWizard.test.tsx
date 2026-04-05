// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import SetupWizard from '../SetupWizard';

const {
  setupCreateNewDatabaseAction,
  setupImportArchiveAction,
  setupLinkExternalDatabaseAction,
} = vi.hoisted(() => ({
  setupCreateNewDatabaseAction: vi.fn(),
  setupImportArchiveAction: vi.fn(),
  setupLinkExternalDatabaseAction: vi.fn(),
}));

vi.mock('@/actions/app-actions', () => ({
  setupCreateNewDatabaseAction,
  setupImportArchiveAction,
  setupLinkExternalDatabaseAction,
}));

describe('SetupWizard', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/setup' },
    });
  });

  it('switches from the chooser to the new database form', () => {
    render(<SetupWizard />);

    fireEvent.click(
      screen.getByRole('button', { name: /Luo uusi tietokanta/i }),
    );

    expect(
      screen.getByRole('heading', { name: /Uusi kirjanpito/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Yrityksen nimi/i)).toBeInTheDocument();
  });

  it('submits the new database form and redirects on success', async () => {
    setupCreateNewDatabaseAction.mockResolvedValue({
      success: true,
      slug: 'demo',
    });

    render(<SetupWizard />);
    fireEvent.click(
      screen.getByRole('button', { name: /Luo uusi tietokanta/i }),
    );
    fireEvent.change(screen.getByLabelText(/Yrityksen nimi/i), {
      target: { value: 'Demo Oy' },
    });
    fireEvent.change(screen.getByLabelText(/Y-tunnus/i), {
      target: { value: '1234567-8' },
    });
    fireEvent.change(screen.getByLabelText(/Ensimmäinen tilikausi/i), {
      target: { value: '2025' },
    });

    fireEvent.submit(screen.getByLabelText(/Yrityksen nimi/i).closest('form')!);

    await waitFor(() => {
      expect(setupCreateNewDatabaseAction).toHaveBeenCalledWith({
        companyName: 'Demo Oy',
        businessId: '1234567-8',
        periodYear: 2025,
      });
    });
    expect(window.location.href).toBe('/');
  });

  it('shows action errors for archive import', async () => {
    setupImportArchiveAction.mockRejectedValue(new Error('Import epäonnistui'));

    render(<SetupWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Tuo vientipaketti/i }));

    const file = new File([Buffer.from('zip')], 'state.zip', {
      type: 'application/zip',
    });
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(setupImportArchiveAction).toHaveBeenCalledWith(file);
    });
    expect(await screen.findByText('Import epäonnistui')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Palauta$/i }),
    ).not.toBeDisabled();
  });

  it('submits the external database form', async () => {
    setupLinkExternalDatabaseAction.mockResolvedValue({
      success: true,
      slug: 'ulkoinen',
    });

    render(<SetupWizard />);
    fireEvent.click(
      screen.getByRole('button', {
        name: /Käytä olemassa olevaa tietokantaa/i,
      }),
    );
    fireEvent.change(screen.getByLabelText(/Tiedostopolku/i), {
      target: { value: '/tmp/app.sqlite' },
    });
    fireEvent.change(screen.getByLabelText(/^Nimi/i), {
      target: { value: 'Vanha Oy' },
    });

    fireEvent.submit(screen.getByLabelText(/Tiedostopolku/i).closest('form')!);

    await waitFor(() => {
      expect(setupLinkExternalDatabaseAction).toHaveBeenCalledWith({
        filePath: '/tmp/app.sqlite',
        name: 'Vanha Oy',
      });
    });
  });
});
