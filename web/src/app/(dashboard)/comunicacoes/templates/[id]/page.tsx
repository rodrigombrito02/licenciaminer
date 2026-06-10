"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchTemplate, type TemplateComunicacao } from "@/lib/comunicacoes-api";

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const [t, setT] = useState<TemplateComunicacao | null>(null);

  useEffect(() => {
    fetchTemplate(id).then(setT);
  }, [id]);

  if (!t) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-muted-foreground">
          <Link href="/comunicacoes/templates" className="hover:underline">
            Templates
          </Link>{" "}
          / <span className="font-mono">{t.codigo}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.titulo}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {t.categoria && (
            <span className="rounded bg-muted px-2 py-0.5 capitalize">
              {t.categoria.replace("_", " ")}
            </span>
          )}
          {t.canal_sugerido && (
            <span className="rounded bg-muted px-2 py-0.5">📡 {t.canal_sugerido}</span>
          )}
          {t.aprovacao_juridica && (
            <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-yellow-700">
              ⚖ Requer aprovação jurídica
            </span>
          )}
        </div>
      </header>

      {t.publicos_sugeridos && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Públicos-alvo sugeridos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{t.publicos_sugeridos}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Corpo do template</CardTitle>
          <p className="text-xs text-muted-foreground">
            Placeholders <code className="rounded bg-muted px-1">{"{campo}"}</code> devem
            ser preenchidos no momento do envio.
          </p>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm font-sans leading-relaxed">
            {t.corpo}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
