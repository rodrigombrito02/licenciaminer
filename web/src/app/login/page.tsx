"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Mail, Lock } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createBrowserClient();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(traduzirErro(signInError.message));
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/callback` },
      );
      if (resetError) {
        setError(traduzirErro(resetError.message));
      } else {
        setResetSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#0A2540] p-4">
      <Card className="w-full max-w-md border-2 border-brand-teal/20">
        <CardHeader className="text-center pb-3">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo2.png"
              alt="Summo Quartile"
              width={56}
              height={56}
              className="rounded-xl"
            />
          </div>
          <CardTitle className="font-heading text-2xl text-brand-navy">
            Summo Quartile
          </CardTitle>
          <p className="text-xs text-muted-foreground tracking-wide uppercase mt-1">
            {resetMode ? "Recuperar Senha" : "Acesso à plataforma"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {resetSent ? (
            <div className="text-center space-y-3 py-4">
              <Mail className="h-12 w-12 text-brand-teal mx-auto" />
              <h3 className="font-bold">Email enviado</h3>
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada para resetar a senha.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setResetMode(false);
                  setResetSent(false);
                }}
                className="mt-2"
              >
                Voltar
              </Button>
            </div>
          ) : (
            <form
              onSubmit={resetMode ? handleReset : handleSignIn}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-medium block mb-1 text-brand-navy">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@summoquartile.com"
                  autoComplete="email"
                />
              </div>
              {!resetMode && (
                <div>
                  <label className="text-xs font-medium block mb-1 text-brand-navy">
                    Senha
                  </label>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              )}

              {error && (
                <div className="text-xs text-destructive flex items-start gap-1.5 bg-destructive/10 p-2 rounded">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-teal hover:bg-brand-teal/90"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : resetMode ? (
                  <Mail className="h-4 w-4 mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {resetMode ? "Enviar link" : "Entrar"}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(!resetMode);
                    setError(null);
                  }}
                  className="text-xs text-brand-teal hover:underline"
                >
                  {resetMode ? "Voltar ao login" : "Esqueci minha senha"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function traduzirErro(msg: string): string {
  const traducoes: Record<string, string> = {
    "Invalid login credentials": "Email ou senha inválidos",
    "Email not confirmed": "Email não confirmado — verifique sua caixa de entrada",
    "User not found": "Usuário não encontrado",
    "Too many requests": "Muitas tentativas — aguarde alguns minutos",
  };
  return traducoes[msg] || msg;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-navy">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
