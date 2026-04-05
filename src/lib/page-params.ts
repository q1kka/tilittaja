export type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export function resolvePeriodId(
  params: Record<string, string | string[] | undefined>,
  periods: { id: number }[],
  fallbackPeriodId?: number,
): number {
  const rawValue = params.period;
  const raw = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (raw) {
    const parsed = Number(raw);
    if (
      Number.isFinite(parsed) &&
      periods.some((period) => period.id === parsed)
    ) {
      return parsed;
    }
  }
  if (
    fallbackPeriodId != null &&
    periods.some((period) => period.id === fallbackPeriodId)
  ) {
    return fallbackPeriodId;
  }
  return periods[0]?.id ?? 0;
}
