import { EmailVerification } from '@/features/auth/email-verification';

export const metadata = {
  title: 'Verificar e-mail | Marketplace de Automações',
};

export default function VerifyEmailPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Marketplace de Automações
        </p>
        <EmailVerification />
      </section>
    </main>
  );
}
