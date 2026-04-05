// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PeriodSelector from '../PeriodSelector';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('period=2'),
}));

afterEach(() => {
  cleanup();
});

describe('PeriodSelector', () => {
  const periods = [
    {
      id: 1,
      start_date: Date.UTC(2023, 0, 1),
      end_date: Date.UTC(2023, 11, 31),
      locked: false,
    },
    {
      id: 2,
      start_date: Date.UTC(2024, 0, 1),
      end_date: Date.UTC(2024, 11, 31),
      locked: true,
    },
  ];

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders without crashing', () => {
    render(
      <PeriodSelector periods={periods} currentPeriodId={1} basePath="/docs" />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeDefined();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('reflects period from search params when present', () => {
    render(<PeriodSelector periods={periods} currentPeriodId={1} />);
    expect(screen.getByRole('combobox')).toHaveValue('2');
  });

  it('navigates with updated period on change', () => {
    render(
      <PeriodSelector
        periods={periods}
        currentPeriodId={1}
        basePath="/reports"
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    expect(mockPush).toHaveBeenCalledWith('/reports?period=1');
  });
});
