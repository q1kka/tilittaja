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
import DataSourceSelector from '../DataSourceSelector';

const { mockRefresh, setDatasourceAction } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  setDatasourceAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock('@/actions/app-actions', () => ({
  setDatasourceAction,
}));

describe('DataSourceSelector', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the available datasources', () => {
    render(
      <DataSourceSelector
        currentSource="demo"
        dataSources={[
          { slug: 'demo', name: 'Demo Oy' },
          { slug: 'archive', name: 'Archive Oy' },
        ]}
      />,
    );

    expect(screen.getByRole('option', { name: 'Demo Oy' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Archive Oy' }),
    ).toBeInTheDocument();
  });

  it('updates the datasource and refreshes the page', async () => {
    setDatasourceAction.mockResolvedValue({ success: true });

    render(
      <DataSourceSelector
        currentSource="demo"
        dataSources={[
          { slug: 'demo', name: 'Demo Oy' },
          { slug: 'archive', name: 'Archive Oy' },
        ]}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'archive' },
    });

    await waitFor(() => {
      expect(setDatasourceAction).toHaveBeenCalledWith('archive');
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});
