'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Landmark,
  List,
  BarChart3,
  Scale,
  BookOpen,
  Percent,
  Settings,
  CalendarRange,
  PanelLeftClose,
  ChevronRight,
  Database,
} from 'lucide-react';
import { periodLabel } from '@/lib/accounting';
import DataSourceSelector from './DataSourceSelector';

const mainNav = [
  { name: 'Tiliotteet', href: '/bank-statements', icon: Landmark },
  { name: 'Tositteet', href: '/documents', icon: FileText },
  { name: 'Tilit ja viennit', href: '/accounts-entries', icon: BookOpen },
  { name: 'Arvonlisävero', href: '/vat', icon: Percent },
];

const reportNav = [
  { name: 'Tase', href: '/reports/balance-sheet', icon: Scale },
  { name: 'Tuloslaskelma', href: '/reports/income-statement', icon: BarChart3 },
  { name: 'Pääkirja', href: '/reports/general-ledger', icon: BookOpen },
  { name: 'Päiväkirja', href: '/reports/journal', icon: FileText },
  { name: 'Tilinpäätös', href: '/reports/tilinpaatos', icon: BarChart3 },
];

type NavItem = (typeof mainNav)[number];

interface SidebarProps {
  dataSources: { slug: string; name: string }[];
  currentSource: string;
  periods: {
    id: number;
    start_date: number;
    end_date: number;
    locked: boolean;
  }[];
  currentPeriodId: number;
  onToggle?: () => void;
}

function NavLink({
  item,
  active,
  href,
}: {
  item: NavItem;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
        active
          ? 'bg-accent-muted text-accent-light'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-3/60'
      }`}
    >
      <item.icon
        className={`w-4 h-4 shrink-0 transition-colors ${
          active
            ? 'text-accent'
            : 'text-text-muted group-hover:text-text-secondary'
        }`}
      />
      <span className="truncate">{item.name}</span>
      {active && <ChevronRight className="w-3 h-3 ml-auto text-accent/60" />}
    </Link>
  );
}

export default function Sidebar({
  dataSources,
  currentSource,
  periods,
  currentPeriodId,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPeriodId =
    Number(searchParams.get('period')) || currentPeriodId;

  const buildHref = (href: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedPeriodId) {
      params.set('period', String(selectedPeriodId));
    }
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  };

  const isActive = (href: string, options?: { exact?: boolean }) =>
    options?.exact
      ? pathname === href
      : pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <aside className="w-52 bg-surface-1 text-text-secondary flex flex-col border-r border-border-subtle min-h-screen">
      <div className="px-4 py-3.5 border-b border-border-subtle">
        <Link
          href={buildHref('/documents')}
          className="flex items-center gap-2.5 min-w-0"
        >
          <div className="w-7 h-7 bg-linear-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/20">
            <span className="text-white font-bold text-xs tracking-tight">
              T
            </span>
          </div>
          <span className="text-base font-semibold text-text-primary tracking-tight truncate">
            Tilittaja
          </span>
        </Link>
      </div>

      <div className="pt-3 border-b border-border-subtle pb-3">
        <DataSourceSelector
          dataSources={dataSources}
          currentSource={currentSource}
        />
        <div className="px-2.5">
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-text-muted mb-1 px-0.5 font-medium">
            <CalendarRange className="w-3 h-3" />
            Tilikausi
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('period', e.target.value);
              const query = params.toString();
              router.push(query ? `${pathname}?${query}` : pathname);
            }}
            className="w-full bg-surface-2 border border-border-subtle text-text-primary text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-accent/40 focus:border-accent/40 cursor-pointer transition-colors hover:border-border-medium outline-none"
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {periodLabel(period.start_date, period.end_date)}
                {period.locked ? ' (lukittu)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            active={isActive(item.href)}
            href={buildHref(item.href)}
          />
        ))}

        <div className="pt-3 pb-1.5 px-2.5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold">
            Raportit
          </span>
        </div>

        {reportNav.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            active={isActive(item.href)}
            href={buildHref(item.href)}
          />
        ))}

        <div className="pt-3 pb-1.5 px-2.5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold">
            Järjestelmä
          </span>
        </div>
        <NavLink
          item={{ name: 'Asetukset', href: '/settings', icon: Settings }}
          active={isActive('/settings', { exact: true })}
          href={buildHref('/settings')}
        />
        <NavLink
          item={{
            name: 'Tuonti ja vienti',
            href: '/settings/export-import',
            icon: Database,
          }}
          active={isActive('/settings/export-import')}
          href={buildHref('/settings/export-import')}
        />
        <NavLink
          item={{ name: 'Tilikartta', href: '/accounts', icon: List }}
          active={isActive('/accounts')}
          href={buildHref('/accounts')}
        />
      </nav>

      {onToggle ? (
        <div className="border-t border-border-subtle p-2.5">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-3/60 hover:text-text-secondary"
            aria-label="Piilota sivupalkki"
          >
            <PanelLeftClose className="h-4 w-4" />
            Piilota sivupalkki
          </button>
        </div>
      ) : null}
    </aside>
  );
}
