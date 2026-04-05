import PageLoadingState from '@/components/PageLoadingState';

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Arvonlisävero"
      title="Ladataan ALV-näkymää"
      description="Lasketaan ALV-raportti, tilitys ja aiemmat ilmoitukset."
    />
  );
}
