"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import {
  STATUS_ACAO,
  STATUS_ACAO_COLOR,
  atualizarAcao,
  atualizarControle,
  atualizarRisco,
  criarAcao,
  criarControle,
  excluirAcao,
  excluirControle,
  excluirRisco,
  fetchAcoes,
  fetchCadeiaValor,
  fetchCategorias,
  fetchControles,
  fetchPessoas,
  fetchRisco,
  fetchUnidadesOrg,
  type Acao,
  type Categoria,
  type Controle,
  type EloCadeiaValor,
  type Pessoa,
  type Risco,
  type UnidadeOrg,
} from "@/lib/riscos-api";
import { Plus, Trash2 } from "lucide-react";

const NIVEIS = [1, 2, 3, 4, 5];
const ESTAGIOS = [
  { value: "aprovacao", label: "Aprovação do Projeto" },
  { value: "implantacao", label: "Implantação e Transição" },
  { value: "operacao", label: "Operação" },
];

export default function RiscoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const router = useRouter();

  const [risco, setRisco] = useState<Risco | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOrg[]>([]);
  const [elos, setElos] = useState<EloCadeiaValor[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [r, c, p, u, e] = await Promise.all([
        fetchRisco(id),
        fetchCategorias(),
        fetchPessoas(),
        fetchUnidadesOrg(),
        fetchCadeiaValor(),
      ]);
      setRisco(r);
      setCategorias(c);
      setPessoas(p);
      setUnidades(u);
      setElos(e);
    })();
  }, [id]);

  if (!risco) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const save = async (patch: Partial<Risco>) => {
    setSaving(true);
    setError(null);
    try {
      const atualizado = await atualizarRisco(id, patch);
      setRisco(atualizado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const deletar = async () => {
    if (!confirm(`Excluir risco ${risco.codigo}? Isso removerá bowtie, ações e controles.`))
      return;
    await excluirRisco(id);
    router.push("/gestao-riscos/riscos");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">
            <Link href="/gestao-riscos/riscos" className="hover:underline">
              Riscos
            </Link>{" "}
            / <span className="font-mono">{risco.codigo}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{risco.nome}</h1>
          <div className="mt-1 flex items-center gap-2">
            <ClassificacaoBadge value={risco.classificacao_residual} />
            <span className="text-xs text-muted-foreground">
              ({risco.prob_residual ?? "—"} × {risco.impacto_residual ?? "—"} residual)
            </span>
            {risco.estagio && (
              <span className="rounded bg-muted px-2 py-0.5 text-[11px]">{risco.estagio}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.open(
                `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/riscos/riscos/${risco.id}/exportar-pdf`,
                "_blank",
              );
            }}
          >
            ⬇ Exportar PDF
          </Button>
          <Button variant="destructive" onClick={deletar}>
            Excluir
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="avaliacao">
        <TabsList>
          <TabsTrigger value="avaliacao">Identificação & Avaliação</TabsTrigger>
          <TabsTrigger value="bowtie">Bowtie</TabsTrigger>
          <TabsTrigger value="acoes">Ações</TabsTrigger>
          <TabsTrigger value="controles">Controles</TabsTrigger>
        </TabsList>

        <TabsContent value="avaliacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Nome"
                value={risco.nome}
                onSave={(v) => save({ nome: v })}
                full
              />
              <TextField
                label="Descrição"
                value={risco.descricao ?? ""}
                onSave={(v) => save({ descricao: v })}
                full
                multiline
              />
              <SelectField
                label="Estágio"
                value={risco.estagio ?? "none"}
                onSave={(v) => save({ estagio: v === "none" ? null : v })}
                options={[{ value: "none", label: "—" }, ...ESTAGIOS]}
              />
              <SelectField
                label="Categoria"
                value={risco.categoria_id ? String(risco.categoria_id) : "none"}
                onSave={(v) =>
                  save({ categoria_id: v === "none" ? null : Number(v) })
                }
                options={[
                  { value: "none", label: "—" },
                  ...categorias.map((c) => ({ value: String(c.id), label: c.nome })),
                ]}
              />
              <SelectField
                label="Responsável"
                value={risco.responsavel_id ? String(risco.responsavel_id) : "none"}
                onSave={(v) =>
                  save({ responsavel_id: v === "none" ? null : Number(v) })
                }
                options={[
                  { value: "none", label: "—" },
                  ...pessoas.map((p) => ({
                    value: String(p.id),
                    label: `${p.nome}${p.cargo ? ` · ${p.cargo}` : ""}`,
                  })),
                ]}
              />
              <SelectField
                label="Unidade organizacional"
                value={risco.unidade_org_id ? String(risco.unidade_org_id) : "none"}
                onSave={(v) =>
                  save({ unidade_org_id: v === "none" ? null : Number(v) })
                }
                options={[
                  { value: "none", label: "—" },
                  ...unidades.map((u) => ({
                    value: String(u.id),
                    label: `${"·".repeat(u.nivel)} ${u.nome}`,
                  })),
                ]}
              />
              <SelectField
                label="Elo da cadeia de valor"
                value={
                  risco.elo_cadeia_valor_id ? String(risco.elo_cadeia_valor_id) : "none"
                }
                onSave={(v) =>
                  save({ elo_cadeia_valor_id: v === "none" ? null : Number(v) })
                }
                options={[
                  { value: "none", label: "—" },
                  ...elos.map((e) => ({
                    value: String(e.id),
                    label: `[${e.tipo}] ${e.nome}`,
                  })),
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avaliação P × I</CardTitle>
              <p className="text-xs text-muted-foreground">
                Alterações recalculam a classificação automaticamente.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <NivelField
                label="Probabilidade pura"
                value={risco.prob_pura}
                onSave={(v) => save({ prob_pura: v })}
              />
              <NivelField
                label="Impacto puro"
                value={risco.impacto_pura}
                onSave={(v) => save({ impacto_pura: v })}
              />
              <NivelField
                label="Probabilidade residual"
                value={risco.prob_residual}
                onSave={(v) => save({ prob_residual: v })}
              />
              <NivelField
                label="Impacto residual"
                value={risco.impacto_residual}
                onSave={(v) => save({ impacto_residual: v })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classificação</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-xs text-muted-foreground">Puro</div>
                <ClassificacaoBadge value={risco.classificacao_pura} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Residual</div>
                <ClassificacaoBadge value={risco.classificacao_residual} />
              </div>
              {saving && (
                <div className="text-xs text-muted-foreground">salvando…</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bowtie">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Abra o editor completo do bowtie deste risco (causas, barreiras,
                consequências, top event, frequência pura/residual).
              </p>
              <Button asChild>
                <Link href={`/gestao-riscos/bowtie/${risco.id}`}>Abrir editor de Bowtie</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="acoes">
          <AcoesTab riscoId={risco.id} pessoas={pessoas} />
        </TabsContent>
        <TabsContent value="controles">
          <ControlesTab riscoId={risco.id} pessoas={pessoas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AcoesTab({ riscoId, pessoas }: { riscoId: number; pessoas: Pessoa[] }) {
  const [acoes, setAcoes] = useState<Acao[] | null>(null);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoTipo, setNovoTipo] = useState<"preventiva" | "corretiva">("preventiva");
  const [saving, setSaving] = useState(false);

  const reload = () => fetchAcoes({ risco_id: riscoId }).then(setAcoes);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riscoId]);

  if (acoes === null) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const criar = async () => {
    if (!novaDescricao.trim()) return;
    setSaving(true);
    try {
      await criarAcao({
        risco_id: riscoId,
        descricao: novaDescricao,
        tipo: novoTipo,
      });
      setNovaDescricao("");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const atrasadas = acoes.filter((a) => {
    if (!a.prazo || a.status === "concluida") return false;
    return new Date(a.prazo) < new Date();
  }).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Total" value={acoes.length} />
        <MiniStat
          label="Preventivas"
          value={acoes.filter((a) => a.tipo === "preventiva").length}
          accent="#3b82f6"
        />
        <MiniStat
          label="Concluídas"
          value={acoes.filter((a) => a.status === "concluida").length}
          accent="#16a34a"
        />
        <MiniStat label="Atrasadas" value={atrasadas} accent="#dc2626" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nova ação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-[10px] uppercase text-muted-foreground">
              Descrição
            </label>
            <Input
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              placeholder="Ex.: Implementar monitoramento contínuo de indicadores…"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-muted-foreground">Tipo</label>
            <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as typeof novoTipo)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preventiva">Preventiva</SelectItem>
                <SelectItem value="corretiva">Corretiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={criar} disabled={saving || !novaDescricao.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      {acoes.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma ação cadastrada para este risco.
        </p>
      ) : (
        <div className="space-y-2">
          {acoes
            .sort((a, b) => (a.prazo ?? "").localeCompare(b.prazo ?? ""))
            .map((a) => {
              const atrasada =
                a.prazo && new Date(a.prazo) < new Date() && a.status !== "concluida";
              return (
                <Card key={a.id}>
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span
                        className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase"
                        style={{ color: a.tipo === "preventiva" ? "#3b82f6" : "#dc2626" }}
                      >
                        {a.tipo}
                      </span>
                      {a.codigo && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {a.codigo}
                        </span>
                      )}
                      <div className="flex-1 text-sm font-medium">{a.descricao}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm("Excluir esta ação?")) return;
                          await excluirAcao(a.id);
                          await reload();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <div>
                        <label className="text-[9px] uppercase text-muted-foreground">
                          Responsável
                        </label>
                        <Select
                          value={a.responsavel_id ? String(a.responsavel_id) : "none"}
                          onValueChange={async (v) => {
                            await atualizarAcao(a.id, {
                              responsavel_id: v === "none" ? null : Number(v),
                            });
                            reload();
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {pessoas.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase text-muted-foreground">
                          Status
                        </label>
                        <Select
                          value={a.status}
                          onValueChange={async (v) => {
                            await atualizarAcao(a.id, { status: v });
                            reload();
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_ACAO.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase text-muted-foreground">
                          Prazo
                        </label>
                        <Input
                          type="date"
                          className={`h-7 text-xs ${atrasada ? "border-red-500 text-red-700 font-semibold" : ""}`}
                          defaultValue={a.prazo ?? ""}
                          onBlur={async (e) => {
                            await atualizarAcao(a.id, { prazo: e.target.value || null });
                            reload();
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase text-muted-foreground">
                          % Concluído
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-7 text-xs"
                          defaultValue={a.percentual}
                          onBlur={async (e) => {
                            const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            await atualizarAcao(a.id, { percentual: n });
                            reload();
                          }}
                        />
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded bg-muted">
                      <div
                        className="h-1.5 rounded"
                        style={{
                          width: `${a.percentual}%`,
                          backgroundColor: STATUS_ACAO_COLOR[a.status] ?? "#64748b",
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

function ControlesTab({ riscoId, pessoas }: { riscoId: number; pessoas: Pessoa[] }) {
  const [controles, setControles] = useState<Controle[] | null>(null);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoTipo, setNovoTipo] = useState<"preventivo" | "corretivo">("preventivo");
  const [saving, setSaving] = useState(false);

  const reload = () => fetchControles({ risco_id: riscoId }).then(setControles);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riscoId]);

  if (controles === null) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const criar = async () => {
    if (!novaDescricao.trim()) return;
    setSaving(true);
    try {
      await criarControle({
        risco_id: riscoId,
        descricao: novaDescricao,
        tipo: novoTipo,
      });
      setNovaDescricao("");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const testados = controles.filter((c) => c.ultimo_teste).length;
  const aprovados = controles.filter((c) => c.status_teste === "aprovado").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Total" value={controles.length} />
        <MiniStat
          label="Preventivos"
          value={controles.filter((c) => c.tipo === "preventivo").length}
          accent="#3b82f6"
        />
        <MiniStat label="Testados" value={testados} accent="#0ea5e9" />
        <MiniStat label="Aprovados no último teste" value={aprovados} accent="#16a34a" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Novo controle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-[10px] uppercase text-muted-foreground">
              Descrição
            </label>
            <Input
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              placeholder="Ex.: Procedimento de inspeção diária…"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-muted-foreground">Tipo</label>
            <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as typeof novoTipo)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preventivo">Preventivo</SelectItem>
                <SelectItem value="corretivo">Corretivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={criar} disabled={saving || !novaDescricao.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      {controles.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Nenhum controle cadastrado para este risco.
        </p>
      ) : (
        <div className="space-y-2">
          {controles.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span
                    className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase"
                    style={{ color: c.tipo === "preventivo" ? "#3b82f6" : "#dc2626" }}
                  >
                    {c.tipo}
                  </span>
                  <div className="flex-1 text-sm font-medium">{c.descricao}</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm("Excluir este controle?")) return;
                      await excluirControle(c.id);
                      await reload();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>
                    <label className="text-[9px] uppercase text-muted-foreground">
                      Responsável
                    </label>
                    <Select
                      value={c.responsavel_id ? String(c.responsavel_id) : "none"}
                      onValueChange={async (v) => {
                        await atualizarControle(c.id, {
                          responsavel_id: v === "none" ? null : Number(v),
                        });
                        reload();
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {pessoas.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase text-muted-foreground">
                      Efetividade
                    </label>
                    <Select
                      value={c.efetividade == null ? "none" : String(c.efetividade)}
                      onValueChange={async (v) => {
                        await atualizarControle(c.id, {
                          efetividade: v === "none" ? null : Number(v),
                        });
                        reload();
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}/5
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase text-muted-foreground">
                      Periodicidade
                    </label>
                    <Input
                      className="h-7 text-xs"
                      placeholder="mensal…"
                      defaultValue={c.periodicidade_teste ?? ""}
                      onBlur={async (e) => {
                        await atualizarControle(c.id, {
                          periodicidade_teste: e.target.value || null,
                        });
                        reload();
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase text-muted-foreground">
                      Último teste
                    </label>
                    <div className="flex h-7 items-center text-xs">
                      {c.ultimo_teste ? (
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            c.status_teste === "aprovado"
                              ? "bg-green-500/20 text-green-700"
                              : c.status_teste === "parcial"
                              ? "bg-yellow-500/20 text-yellow-700"
                              : c.status_teste === "reprovado"
                              ? "bg-red-500/20 text-red-700"
                              : "bg-muted"
                          }`}
                        >
                          {c.ultimo_teste} · {c.status_teste ?? "—"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-2">
        <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
        <div className="text-xl font-bold" style={{ color: accent }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function TextField({
  label,
  value,
  onSave,
  full,
  multiline,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  full?: boolean;
  multiline?: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const changed = v !== value;
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {multiline ? (
        <textarea
          className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => changed && onSave(v)}
        />
      ) : (
        <Input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => changed && onSave(v)}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onSave,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onSave}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NivelField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number | null | undefined;
  onSave: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select
        value={value == null ? "none" : String(value)}
        onValueChange={(v) => onSave(v === "none" ? null : Number(v))}
      >
        <SelectTrigger>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {NIVEIS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
