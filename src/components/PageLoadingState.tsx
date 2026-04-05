'use client';

interface PageLoadingStateProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function PageLoadingState({
  eyebrow,
  title,
  description,
}: PageLoadingStateProps) {
  return (
    <div className="p-5">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            {eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-border-subtle bg-surface-2/60"
            />
          ))}
        </div>

        <div className="h-[420px] animate-pulse rounded-2xl border border-border-subtle bg-surface-2/60" />
      </div>
    </div>
  );
}
