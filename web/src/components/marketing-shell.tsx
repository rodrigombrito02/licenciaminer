"use client";

/**
 * Casca de marketing — exibida a visitantes não logados.
 * Top-nav horizontal limpo (sem a sidebar de ferramentas internas) + rodapé
 * com CTA e telefone do consultor. O app interno (logado) usa outra casca.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight } from "lucide-react";

const PRODUTOS = [
  { href: "/ambiental", label: "SQ Ambiental" },
  { href: "/direitos", label: "Ativos Minerários" },
  { href: "/inteligencia-comercial", label: "Mineral Intelligence" },
  { href: "/sq-consultoria", label: "SQ Consultoria" },
  { href: "/sq-solutions", label: "SQ Soluções" },
  { href: "/treinamentos", label: "Treinamentos" },
  { href: "/mapa", label: "Mapa" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo2.png" alt="Summo Quartile" width={34} height={34} className="rounded-lg" />
            <div className="leading-tight">
              <div className="font-heading text-sm font-bold text-brand-navy">Summo Quartile</div>
              <div className="text-[10px] font-medium tracking-wide text-brand-teal">Inteligência Mineral</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {PRODUTOS.map((p) => (
              <Link key={p.href} href={p.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                {p.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/login" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90 transition-colors">
              Entrar
            </Link>
          </div>

          <button className="lg:hidden p-2" onClick={() => setOpen((v) => !v)} aria-label="menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="border-t border-border/60 bg-white lg:hidden">
            <div className="mx-auto max-w-6xl px-4 py-2">
              {PRODUTOS.map((p) => (
                <Link key={p.href} href={p.href} onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60">
                  {p.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-border/60 pt-3">
                <Link href="/login" className="block rounded-lg bg-brand-navy px-4 py-2 text-center text-sm font-semibold text-white">Entrar</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo da página (landing) */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-6 lg:py-10">{children}</main>

      {/* Rodapé com CTA */}
      <footer className="mt-8 border-t border-border/60 bg-brand-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="font-heading text-xl font-bold">Vamos transformar dado em decisão?</h3>
              <p className="mt-1 text-sm text-white/70">Fale com um consultor sênior da Summo Quartile.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-brand-gold/90 transition-colors">
                Falar com a Summo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-xs text-white/50">
            {PRODUTOS.map((p) => (
              <Link key={p.href} href={p.href} className="hover:text-white/80">{p.label}</Link>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-white/40">© 2026 Summo Quartile · Inteligência Mineral · Consultoria estratégica para o setor mineral brasileiro.</p>
        </div>
      </footer>
    </div>
  );
}
