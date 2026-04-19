export function slugifyDataSourceName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[äå]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'kirjanpito'
  );
}
