"use client";

import { useEffect, useState } from "react";
import { Phone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchComites, type Comite } from "@/lib/crises-api";

const NIVEL_COLOR: Record<string, string> = {
  estrategico: "#dc2626",
  tatico: "#f59e0b",
  operacional: "#0ea5e9",
};

export default function ComitesPage() {
  const [comites, setComites] = useState<Comite[]>([]);

  useEffect(() => {
    fetchComites().then(setComites);
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Comitês de crise</h1>
        <p className="text-sm text-muted-foreground">
          {comites.length} comitês ativos · papéis, contatos 24×7 e membros designados.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {comites.map((c) => {
          const nivelColor = NIVEL_COLOR[c.nivel ?? ""] ?? "#64748b";
          return (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {c.nome}
                    </CardTitle>
                    {c.descricao && (
                      <p className="mt-1 text-xs text-muted-foreground">{c.descricao}</p>
                    )}
                  </div>
                  {c.nivel && (
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                      style={{
                        backgroundColor: `${nivelColor}22`,
                        color: nivelColor,
                      }}
                    >
                      {c.nivel}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {c.membros.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum membro cadastrado.
                    </p>
                  ) : (
                    c.membros.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-start justify-between gap-3 rounded border border-border p-2 text-sm"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{m.pessoa_nome ?? "—"}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {m.papel}
                          </div>
                        </div>
                        {m.contato_24_7 && (
                          <div className="flex items-center gap-1 whitespace-nowrap text-[11px] font-mono text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {m.contato_24_7}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
