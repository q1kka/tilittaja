'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';

interface OpeningBalanceImportPanelProps {
  periodId: number;
  periodLabel: string;
  periodLocked: boolean;
}

interface OpeningBalanceImportResponse {
  ok: true;
  documentId: number;
  documentNumber: number;
  periodId: number;
  createdAccounts: number;
  createdEntries: number;
  previousPeriodEnd: string;
  importedAccounts: number;
  savedFiles: string[];
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export default function OpeningBalanceImportPanel({
  periodId,
  periodLabel,
  periodLocked,
}: OpeningBalanceImportPanelProps) {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OpeningBalanceImportResponse | null>(null);

  const selectedSummary = useMemo(() => {
    if (selectedFiles.length === 0) return null;
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    return `${selectedFiles.length} PDF:tä, yhteensä ${formatBytes(totalBytes)}`;
  }, [selectedFiles]);

  async function handleImport() {
    if (periodLocked) {
      setError('Tilikausi on lukittu. Avaa kausi ennen avaussaldojen tuontia.');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Valitse vähintään yksi PDF-tiedosto.');
      return;
    }

    if (selectedFiles.length > 10) {
      setError('Voit lähettää korkeintaan 10 PDF-tiedostoa.');
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('periodId', String(periodId));
      selectedFiles.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/opening-balance/import-pdf', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | ({ error?: string } & Partial<OpeningBalanceImportResponse>)
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Tilikauden avauksen tuonti epäonnistui.');
      }

      setSuccess(payload as OpeningBalanceImportResponse);
      setSelectedFiles([]);
      router.refresh();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'Tilikauden avauksen tuonti epäonnistui.',
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border-subtle bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_40%),linear-gradient(135deg,rgba(23,23,23,0.96),rgba(12,12,12,0.96))] p-6 shadow-[0_34px_120px_-58px_rgba(0,0,0,0.95)] md:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">
              Tilikauden avaus
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Luo alkutilanne tilinpäätösmateriaaleista
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Työkalu lukee 1-10 aiemman tilikauden PDF-materiaalia, poimii
              tasetilien päättösaldot GPT:llä ja muodostaa valitun tilikauden
              alkuun yhden avaus-tositteen.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                Kohdekausi
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {periodLabel}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                Tila
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {periodLocked ? 'Lukittu' : 'Avoin'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-[24px] border border-border-subtle bg-surface-2/70 p-6 shadow-[0_24px_90px_-54px_rgba(0,0,0,0.95)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent-light">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Aineisto
              </p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary">
                Valitse tilinpäätös-PDF:t
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Suositeltuja tiedostoja ovat esimerkiksi tase, tase-erittely,
                pääkirja, päiväkirja ja muu tilinpäätösaineisto. Mitä
                täydellisempi aineisto, sitä varmempana avaus täsmää.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
              <span className="mb-2 block">PDF-tiedostot (1-10 kpl)</span>
              <input
                type="file"
                multiple
                accept="application/pdf,.pdf"
                disabled={isImporting || periodLocked}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []).slice(0, 10);
                  setSelectedFiles(files);
                  setError(null);
                  setSuccess(null);
                }}
                className="block w-full rounded-2xl border border-border-subtle bg-surface-0/50 px-4 py-3 text-sm text-text-secondary file:mr-4 file:rounded-xl file:border-0 file:bg-accent/12 file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-light"
              />
            </label>

            <div className="rounded-2xl border border-border-subtle bg-surface-0/35 px-4 py-3 text-sm text-text-secondary">
              {selectedSummary ?? 'Valittuja tiedostoja ei ole.'}
            </div>

            {selectedFiles.length > 0 ? (
              <div className="rounded-2xl border border-border-subtle bg-surface-0/35 p-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                  Valitut tiedostot
                </div>
                <div className="space-y-2">
                  {selectedFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-0/45 px-3 py-2 text-sm text-text-primary"
                    >
                      <FileText className="h-4 w-4 text-accent-light" />
                      <span className="truncate">{file.name}</span>
                      <span className="ml-auto shrink-0 text-xs text-text-muted">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </p>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Avaustuonti onnistui
                </div>
                <p className="mt-2 leading-6">
                  Tosite #{success.documentNumber} luotiin kaudelle {periodLabel}.
                  Tuotuja tilejä: {success.importedAccounts}, vientejä:{' '}
                  {success.createdEntries}, uusia tilejä: {success.createdAccounts}.
                  Lähdeaineiston päättymispäivä: {success.previousPeriodEnd}.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={isImporting || selectedFiles.length === 0 || periodLocked}
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-accent-light hover:text-surface-0 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-text-muted"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Luodaan avausta
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Luo tilikauden avaus
                </>
              )}
            </button>
          </div>
        </section>

        <section className="rounded-[24px] border border-border-subtle bg-surface-2/70 p-6 shadow-[0_24px_90px_-54px_rgba(0,0,0,0.95)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Huomioi
              </p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary">
                Mitä työkalu tekee
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-6 text-text-secondary">
            <p>
              PDF-aineisto lähetetään OpenAI API:lle, joka muodostaa siitä
              tilikohtaiset päättösaldot.
            </p>
            <p>
              Tuonti luo puuttuvat tasetilit automaattisesti, jos materiaalissa
              on tilejä joita nykyisessä tilikartassa ei vielä ole.
            </p>
            <p>
              Jos aineistosta saatavat saldot eivät täsmää debet/kredit-tasolla,
              tuonti keskeytetään eikä avaus-tositetta luoda.
            </p>
            <p>
              Sama työkalu ei tee toista avausajoa kaudelle, jos siellä on jo
              olemassa `AVAUS`-kategorian tosite.
            </p>
          </div>

          {periodLocked ? (
            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm leading-6 text-amber-100/90">
              Valittu tilikausi on lukittu. Avaa kausi asetuksista ennen tuontia.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
