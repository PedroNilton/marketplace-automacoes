import { RegisterForm } from '@/features/auth/register-form';

export const metadata = {
  title: 'Criar conta | Marketplace de Automações',
};

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Marketplace de Automações
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
          Crie sua conta
        </h1>
        <p className="mt-3 text-slate-600">
          Cadastre-se para encontrar ou oferecer automações.
        </p>
        <RegisterForm />
      </section>
    </main>
  );
}
