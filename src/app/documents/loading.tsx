import PageLoadingState from '@/components/PageLoadingState';

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Tositteet"
      title="Ladataan tositteita"
      description="Haetaan tilikauden tositteet, viennit ja liitteet."
    />
  );
}
