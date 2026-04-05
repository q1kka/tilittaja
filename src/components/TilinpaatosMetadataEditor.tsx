'use client';

import { useState } from 'react';
import { TilinpaatosMetadata } from '@/lib/tilinpaatos';
import { updateTilinpaatosMetadataAction } from '@/actions/app-actions';

interface Props {
  initialMetadata: TilinpaatosMetadata;
  section?: 'general' | 'meeting';
}

export default function TilinpaatosMetadataEditor({
  initialMetadata,
  section = 'general',
}: Props) {
  const [form, setForm] = useState<TilinpaatosMetadata>(initialMetadata);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMeetingSection = section === 'meeting';

  const setField = (key: keyof TilinpaatosMetadata, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateTilinpaatosMetadataAction(form);
      setMessage('Tallennettu.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tuntematon virhe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {isMeetingSection ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Kokouspäivä (vvvv-kk-pp)
              </label>
              <input
                value={form.meetingDate}
                onChange={(event) =>
                  setField('meetingDate', event.target.value)
                }
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Vastuuvapaus myönnetään
              </label>
              <select
                value={form.dischargeTarget}
                onChange={(event) =>
                  setField('dischargeTarget', event.target.value)
                }
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              >
                <option value="board-and-ceo">
                  Hallitukselle ja toimitusjohtajalle
                </option>
                <option value="board">Hallitukselle</option>
                <option value="ceo">Toimitusjohtajalle</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Läsnä (esim. &quot;Matti Meikäläinen omistaen yhtiön koko
              osakekannan.&quot;)
            </label>
            <textarea
              value={form.attendees}
              onChange={(event) => setField('attendees', event.target.value)}
              rows={2}
              className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
            />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Paikka
              </label>
              <input
                value={form.place}
                onChange={(event) => setField('place', event.target.value)}
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Päiväys (vvvv-kk-pp)
              </label>
              <input
                value={form.signatureDate}
                onChange={(event) =>
                  setField('signatureDate', event.target.value)
                }
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Laatija
              </label>
              <input
                value={form.preparedBy}
                onChange={(event) => setField('preparedBy', event.target.value)}
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Allekirjoittaja
              </label>
              <input
                value={form.signerName}
                onChange={(event) => setField('signerName', event.target.value)}
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Allekirjoittajan rooli
              </label>
              <input
                value={form.signerTitle}
                onChange={(event) =>
                  setField('signerTitle', event.target.value)
                }
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Henkilöstön määrä
              </label>
              <input
                value={form.personnelCount}
                onChange={(event) =>
                  setField('personnelCount', event.target.value)
                }
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Mikroyrityslausuma
              </label>
              <textarea
                value={form.microDeclaration}
                onChange={(event) =>
                  setField('microDeclaration', event.target.value)
                }
                rows={3}
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Hallituksen ehdotus
              </label>
              <textarea
                value={form.boardProposal}
                onChange={(event) =>
                  setField('boardProposal', event.target.value)
                }
                rows={3}
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Konsernin emoyhtiö
              </label>
              <input
                value={form.parentCompany}
                onChange={(event) =>
                  setField('parentCompany', event.target.value)
                }
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Osaketiedot
              </label>
              <textarea
                value={form.shareInfo}
                onChange={(event) => setField('shareInfo', event.target.value)}
                rows={2}
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Arkistointimuistio
              </label>
              <textarea
                value={form.archiveNote}
                onChange={(event) =>
                  setField('archiveNote', event.target.value)
                }
                rows={2}
                className="w-full bg-surface-0/60 border border-border-subtle text-text-primary rounded-lg px-3 py-2 text-sm outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>
        </>
      )}

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="bg-accent hover:bg-amber-700 disabled:bg-surface-3 disabled:text-text-muted text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving
            ? 'Tallennetaan...'
            : isMeetingSection
              ? 'Tallenna yhtiökokous'
              : 'Tallenna tekstit'}
        </button>
        {message && <span className="text-emerald-400 text-sm">{message}</span>}
        {error && <span className="text-rose-400 text-sm">{error}</span>}
      </div>
    </div>
  );
}
