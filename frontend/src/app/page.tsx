import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
      <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Marketplace de Automações
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Fundação técnica preparada.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          O projeto entrou na implementação orientada pelas especificações. A
          primeira capacidade será identidade e acesso, sem regras simuladas
          nesta página inicial.
        </p>

        <dl className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5">
            <dt className="text-sm font-medium text-slate-500">Frontend</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              Next.js, React e Tailwind CSS
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <dt className="text-sm font-medium text-slate-500">Backend</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              NestJS e API REST
            </dd>
          </div>
        </dl>
        <Link
          className="mt-8 inline-flex rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          href="/cadastro"
        >
          Criar conta
        </Link>
      </section>
    </main>
  );
}
