import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Painel administrativo",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[1.2fr_minmax(420px,480px)] lg:px-10">
        <section className="hidden lg:block">
          <div className="rounded-lg border border-border bg-white p-10 shadow-[0_32px_80px_-52px_rgba(1,0,119,0.22)]">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-primary" />
                <span className="h-3 w-3 rounded-full bg-brand-green" />
                <span className="h-3 w-3 rounded-full bg-accent" />
              </div>

              <div className="space-y-4">
                <div className="font-display inline-flex rounded-md border border-border bg-muted px-3 py-1 text-xs text-primary/75">
                  Only in BR
                </div>
                <h1 className="max-w-[12ch] text-5xl leading-[0.95] text-primary">
                  Painel administrativo
                </h1>
                <p className="max-w-[28ch] text-xl leading-9 text-primary/72">
                  Gestao de feiras, contratos, relatorios e operacao em um painel mais claro, direto e organizado.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-white px-4 py-4">
                  <div className="font-display text-sm text-primary">Operacao</div>
                  <div className="mt-2 text-sm leading-6 text-primary/62">Feiras, barracas e fluxo do evento.</div>
                </div>
                <div className="rounded-lg border border-border bg-white px-4 py-4">
                  <div className="font-display text-sm text-primary">Relacao</div>
                  <div className="mt-2 text-sm leading-6 text-primary/62">Interessados, vitrine e acompanhamento.</div>
                </div>
                <div className="rounded-lg border border-border bg-white px-4 py-4">
                  <div className="font-display text-sm text-primary">Financeiro</div>
                  <div className="mt-2 text-sm leading-6 text-primary/62">Contratos, relatorios e pagamentos.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[420px] items-center justify-center lg:max-w-[480px]">
          {children}
        </div>
      </div>
    </div>
  );
}
