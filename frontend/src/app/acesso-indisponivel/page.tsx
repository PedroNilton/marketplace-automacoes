import Link from 'next/link';
import {
  accessUnavailableContent,
  readAccessUnavailableReason,
} from '@/features/auth/access-unavailable';

export const metadata = {
  title: 'Acesso indisponível | Marketplace de Automações',
};

export default async function AccessUnavailablePage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly reason?: string | string[];
  }>;
}) {
  const reason = readAccessUnavailableReason((await searchParams).reason);
  const content = accessUnavailableContent(reason);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
      <section
        aria-labelledby="access-unavailable-title"
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Marketplace de Automações
        </p>
        <h1
          className="mt-4 text-3xl font-bold tracking-tight text-slate-950"
          id="access-unavailable-title"
        >
          {content.title}
        </h1>
        <p className="mt-3 text-slate-600">{content.description}</p>
        <Link
          className="mt-8 inline-flex rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          href={content.actionHref}
        >
          {content.actionLabel}
        </Link>
      </section>
    </main>
  );
}
