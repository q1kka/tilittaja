import PageLoadingState from '@/components/PageLoadingState';

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Asetukset"
      title="Ladataan asetuksia"
      description="Haetaan yrityksen tiedot, tilikaudet ja järjestelmäasetukset."
    />
  );
}
