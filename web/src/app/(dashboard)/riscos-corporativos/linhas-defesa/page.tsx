"use client";

import { useEffect, useState } from "react";
import { Shield, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchLinhasDefesa, type LinhaDefesa } from "@/lib/corporativo-api";

const CORES_LINHA = ["#dc2626", "#f59e0b", "#0ea5e9"];

export default function LinhasDefesaPage() {
  const [linhas, setLinhas] = useState<LinhaDefesa[]>([]);

  useEffect(() => {
    fetchLinhasDefesa().then(setLinhas);
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          3 Linhas de Defesa (IIA / ISO 31000)
        </h1>
        <p className="text-sm text-muted-foreground">
          Modelo de governança de riscos conforme{" "}
          <strong>IIA (The Institute of Internal Auditors)</strong> e{" "}
          <strong>ISO 31000 §5.2.4</strong>. Cada risco corporativo é atribuído à linha
          que será responsável por sua gestão primária.
        </p>
      </header>

      <div className="space-y-3">
        {linhas.map((l, idx) => (
          <Card
            key={l.id}
            style={{ borderLeftWidth: 4, borderLeftColor: CORES_LINHA[idx] ?? "#64748b" }}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white"
                    style={{ backgroundColor: CORES_LINHA[idx] ?? "#64748b" }}
                  >
                    {l.numero}ª
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {l.nome}
                    </CardTitle>
                    {l.descricao && (
                      <p className="mt-1 text-sm text-muted-foreground">{l.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{l.n_riscos}</div>
                  <div className="text-[10px] text-muted-foreground">riscos vinculados</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {l.responsabilidades && (
                <div className="mb-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Responsabilidades
                  </div>
                  <p className="text-sm">{l.responsabilidades}</p>
                </div>
              )}
              {l.responsavel_nome && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" /> Responsável: <strong>{l.responsavel_nome}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
