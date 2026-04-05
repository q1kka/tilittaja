import PageLoadingState from '@/components/PageLoadingState';

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Tiliotteet"
      title="Ladataan tiliotteita"
      description="Haetaan tiliotteet, käsittelytila ja linkitykset."
    />
  );
}
