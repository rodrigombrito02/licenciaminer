"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  UserCheck,
  Activity,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleHero } from "@/components/module-hero";

interface StatsResponse {
  periodo_dias: number;
  total_eventos: number;
  usuarios_unicos: number;
  por_tipo: Record<string, number>;
  por_role: Record<string, number>;
  top_rotas: { rota: string; n: number }[];
}

interface UsuariosResponse {
  total?: number;
  usuarios?: Array<{
    id: string;
    email: string;
    ultima_sessao: string | null;
    criado_em: string;
    metadata: { role?: string; nome?: string; area?: string };
  }>;
  erro?: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [usuarios, setUsuarios] = useState<UsuariosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  async function recarregar() {
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
      const [s, u] = await Promise.all([
        fetch(`${API}/admin/stats?dias=${dias}`).then(r => r.json()),
        fetch(`${API}/admin/usuarios`).then(r => r.json()),
      ]);
      setStats(s);
      setUsuarios(u);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { recarregar(); }, [dias]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <ModuleHero
        icon={Briefcase}
        badge="Painel Admin"
        title="Tráfego, conversões e gestão de usuários"
        description="Monitoramento da plataforma. Tráfego e conversões dos últimos dias, lista de usuários cadastrados e suas atividades."
        variant="navy"
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={dias === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDias(d)}
            >
              {d} dias
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={recarregar} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="h-3 w-3 mr-1" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="h-3 w-3 mr-1" /> Usuários ({usuarios?.total ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          {loading && !stats ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-navy" /></div>
          ) : stats ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPI label="Eventos no período" value={stats.total_eventos} icon={Activity} color="#0A2540" />
                <KPI label="Usuários únicos" value={stats.usuarios_unicos} icon={UserCheck} color="#156082" />
                <KPI label="Page views" value={stats.por_tipo["pageview"] || 0} icon={Eye} color="#27AE60" />
                <KPI label="CTAs clicados" value={stats.por_tipo["cta_click"] || 0} icon={MousePointerClick} color="#FF5F00" />
              </div>

              {/* Top rotas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-brand-teal" />
                    Páginas mais visitadas ({dias} dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.top_rotas.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Sem dados ainda. O tracking começa a coletar a partir da próxima visita.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stats.top_rotas.map((r, i) => {
                        const max = stats.top_rotas[0].n;
                        const pct = (r.n / max) * 100;
                        return (
                          <div key={r.rota} className="flex items-center gap-2 text-xs">
                            <span className="w-6 text-muted-foreground font-mono">{i + 1}</span>
                            <span className="w-40 truncate font-mono">{r.rota}</span>
                            <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                              <div className="h-full bg-brand-teal/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-12 text-right tabular-nums font-bold">{r.n}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Por role */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-teal" />
                    Tráfego por perfil de usuário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(stats.por_role).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Sem eventos com role identificado.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(stats.por_role).map(([role, n]) => (
                        <div key={role} className="flex items-center justify-between text-sm border-b pb-1">
                          <Badge variant="outline">{role}</Badge>
                          <span className="font-bold tabular-nums">{n}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          {loading && !usuarios ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-navy" /></div>
          ) : usuarios?.erro ? (
            <Card className="border-destructive/30">
              <CardContent className="p-4 text-sm text-destructive">
                Erro: {usuarios.erro}
              </CardContent>
            </Card>
          ) : usuarios?.usuarios ? (
            <Card>
              <CardContent className="p-0 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Última sessão</th>
                      <th className="text-left p-2">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.usuarios.map((u) => (
                      <tr key={u.id} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-mono text-[11px]">{u.email}</td>
                        <td className="p-2">{u.metadata?.nome || "—"}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{u.metadata?.role || "—"}</Badge></td>
                        <td className="p-2 text-muted-foreground">
                          {u.ultima_sessao ? new Date(u.ultima_sessao).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold font-tabular" style={{ color }}>{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
          </div>
          <Icon className="h-4 w-4 opacity-40" />
        </div>
      </CardContent>
    </Card>
  );
}
