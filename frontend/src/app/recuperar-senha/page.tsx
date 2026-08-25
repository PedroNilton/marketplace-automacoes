import Link from 'next/link';
import { PasswordRecoveryForm } from '@/features/auth/password-recovery-form';

export const metadata = {
  title: 'Recuperar senha | Marketplace de Automações',
};

export default function PasswordRecoveryPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Marketplace de Automações
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
          Recuperar senha
        </h1>
        <p className="mt-3 text-slate-600">
          Informe seu e-mail para receber as instruções de recuperação.
        </p>
        <PasswordRecoveryForm />
        <p className="mt-6 text-center text-sm text-slate-600">
          Lembrou sua senha?{' '}
          <Link
            className="font-semibold text-blue-700 hover:text-blue-800"
            href="/entrar"
          >
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
