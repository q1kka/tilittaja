import { redirect } from 'next/navigation';
import { type PageSearchParams } from '@/lib/page-params';

export const dynamic = 'force-dynamic';
const DEFAULT_ROUTE = '/documents';

export default async function Home({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      query.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const queryString = query.toString();
  redirect(queryString ? `${DEFAULT_ROUTE}?${queryString}` : DEFAULT_ROUTE);
}
