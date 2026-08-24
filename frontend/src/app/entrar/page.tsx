import Link from 'next/link';
import { LoginForm } from '@/features/auth/login-form';

export const metadata = {
  title: 'Entrar | Marketplace de Automações',
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Marketplace de Automações
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
          Entre na sua conta
        </h1>
        <p className="mt-3 text-slate-600">
          Acesse suas automações e solicitações.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-slate-600">
          Ainda não tem uma conta?{' '}
          <Link
            className="font-semibold text-blue-700 hover:text-blue-800"
            href="/cadastro"
          >
            Criar conta
          </Link>
        </p>
      </section>
    </main>
  );
}
