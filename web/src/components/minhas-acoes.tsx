"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckSquare, Target, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api")
  .replace(/\/api$/, "") + "/api/minhas-acoes";

interface MinhasAcoes {
  nome: string;
  resumo: { tarefas_abertas: number; atrasadas: number; oportunidades: number; total: number };
  tarefas: { origem: string; titulo: string; prazo: string | null; status: string | null; pct: number | null }[];
  oportunidades: { origem: string; titulo: string; etapa: string | null; prazo: string | null }[];
}

export function MinhasAcoes({ nome }: { nome: string }) {
  const [data, setData] = useState<MinhasAcoes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nome) return;
    fetch(`${API}?nome=${encodeURIComponent(nome)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [nome]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-brand-teal" />
          Minhas ações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Mini label="Tarefas abertas" value={data?.resumo.tarefas_abertas ?? 0} color="#156082" icon={CheckSquare} />
          <Mini label="Atrasadas" value={data?.resumo.atrasadas ?? 0} color="#E74C3C" icon={AlertTriangle} />
          <Mini label="Oportunidades" value={data?.resumo.oportunidades ?? 0} color="#FFC000" icon={Target} />
          <Mini label="Total atribuído" value={data?.resumo.total ?? 0} color="#0A2540" icon={Clock} />
        </div>

        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
          </div>
        ) : (data?.resumo.total ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nenhuma ação atribuída a você ainda. Ações de planos, oportunidades e
            mapeamentos com você como responsável aparecem aqui.
          </p>
        ) : (
          <div className="space-y-3">
            {(data?.tarefas?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Tarefas
                </p>
                <div className="space-y-1.5">
                  {data!.tarefas.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                      <Badge variant="outline" className="text-[9px] shrink-0">{t.origem}</Badge>
                      <span className="text-xs flex-1 min-w-0 truncate">{t.titulo}</span>
                      {t.prazo && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{t.prazo}</span>
                      )}
                      {t.status && (
                        <Badge variant="secondary" className="text-[9px] shrink-0">{t.status}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(data?.oportunidades?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Oportunidades que lidero
                </p>
                <div className="space-y-1.5">
                  {data!.oportunidades.map((o, i) => (
                    <Link key={i} href="/oportunidades" className="flex items-center gap-2 rounded-lg border p-2 hover:border-brand-teal/40">
                      <Target className="h-3.5 w-3.5 text-brand-gold shrink-0" />
                      <span className="text-xs flex-1 min-w-0 truncate">{o.titulo}</span>
                      {o.etapa && <Badge variant="secondary" className="text-[9px] shrink-0">{o.etapa}</Badge>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Mini({
  label, value, color, icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border p-3" style={{ borderTopColor: color, borderTopWidth: 2 }}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xl font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
