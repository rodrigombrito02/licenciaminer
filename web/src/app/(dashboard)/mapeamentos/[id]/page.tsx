"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Search,
  Play,
  Save,
  ArrowUpRight,
  AlertTriangle,
  Info,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleGate } from "@/components/role-gate";
import { CardAcessoPanel } from "@/components/card-acesso-panel";
import { useRole } from "@/hooks/use-role";
import { podeEditar, podeGerenciarAcesso, type CardAcl } from "@/lib/card-acl";
import {
  mapApi,
  type Mapeamento,
  type MapCriterios,
  type MapResultado,
  type MapPesos,
} from "@/lib/api";

const CATEGORIAS = [
  "Metálicos Ferrosos",
  "Metálicos Preciosos",
  "Metálicos Não-Ferrosos",
  "Metálicos Estratégicos",
  "Construção Civil",
  "Rochas Ornamentais",
  "Industrial",
  "Gemas e Pedras Preciosas",
];

const FASES = [
  "Concessão de Lavra",
  "Licenciamento",
  "Lavra Garimpeira",
  "Registro de Extração",
];

const PESO_LABEL: Record<string, string> = {
  cfem_inativo: "CFEM inativo",
  estrategico: "Substância estratégica",
  area: "Porte (área)",
  sem_cfem_historico: "Sem histórico CFEM",
  alto_valor: "Alto valor relativo",
  distress: "Distress (multa/paralisação)",
  espolio: "Espólio (sucessória)",
  sem_restricao: "Sem sobreposição UC/TI",
};

const POTENCIAL_BADGE: Record<string, string> = {
  alto: "bg-green-100 text-green-800 border-green-200",
  medio: "bg-amber-100 text-amber-800 border-amber-200",
  baixo: "bg-gray-100 text-gray-600 border-gray-200",
};
const POTENCIAL_LABEL: Record<string, string> = { alto: "Alto", medio: "Médio", baixo: "Baixo" };

const STATUS_OPTIONS = [
  { v: "triagem", l: "Triagem" },
  { v: "analise", l: "Em análise" },
  { v: "descartado", l: "Descartado" },
  { v: "promovido", l: "Promovido" },
];

export default function MapeamentoDetailPage() {
  return (
    <RoleGate minRole="consultor" fallback={<p className="p-8 text-center text-sm text-muted-foreground">Área interna Summo.</p>}>
      <DetailInner />
    </RoleGate>
  );
}

function DetailInner() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const role = useRole();
  const meuNome = role.status === "authenticated" ? role.nome : "";
  const isAdmin = role.status === "authenticated" && role.role === "admin";

  const [tese, setTese] = useState<Mapeamento | null>(null);
  const [criterios, setCriterios] = useState<MapCriterios>({});
  const [pesos, setPesos] = useState<MapPesos>({});
  const [resultados, setResultados] = useState<MapResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const m = await mapApi.obter(id);
      setTese(m);
      setCriterios(m.criterios ?? {});
      setPesos(m.pesos ?? {});
      setResultados(m.resultados ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Prévia ao vivo (debounce) — quantos direitos batem com os critérios atuais
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(async () => {
      try {
        const r = await mapApi.preview(criterios, pesos, 1);
        setPreviewCount(r.total);
      } catch {
        setPreviewCount(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [criterios, pesos, loading]);

  async function salvar() {
    setSaving(true);
    try {
      await mapApi.atualizar(id, { criterios, pesos });
    } finally {
      setSaving(false);
    }
  }

  async function rodar() {
    setRunning(true);
    try {
      await mapApi.atualizar(id, { criterios, pesos });
      await mapApi.varredura(id);
      await carregar();
    } finally {
      setRunning(false);
    }
  }

  function toggleLista(campo: "categorias" | "fases", valor: string) {
    setCriterios((c) => {
      const atual = c[campo] ?? [];
      const novo = atual.includes(valor)
        ? atual.filter((x) => x !== valor)
        : [...atual, valor];
      return { ...c, [campo]: novo };
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (!tese) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Mapeamento não encontrado.</p>;
  }

  const aclCtx = {
    acl: tese.acl as CardAcl | null,
    lider: tese.lider_responsavel,
    criador: tese.criado_por,
    meuNome,
    isAdmin,
  };
  const canEdit = podeEditar(aclCtx);
  const canManage = podeGerenciarAcesso(aclCtx);

  async function salvarAcesso(data: { lider_responsavel: string; acl: CardAcl }) {
    await mapApi.atualizar(id, data);
    await carregar();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/mapeamentos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{tese.nome}</h1>
          {tese.descricao && (
            <p className="text-xs text-muted-foreground">{tese.descricao}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {/* ── Painel de critérios ── */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-sm">Critérios da tese</h3>

              {/* Categorias */}
              <div>
                <label className="text-xs font-semibold block mb-1.5">Categorias</label>
                <div className="grid grid-cols-1 gap-1">
                  {CATEGORIAS.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={(criterios.categorias ?? []).includes(cat)}
                        onCheckedChange={() => toggleLista("categorias", cat)}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              {/* Substâncias (texto livre) */}
              <div>
                <label className="text-xs font-semibold block mb-1">
                  Substâncias (texto, separar por vírgula)
                </label>
                <Input
                  className="h-8 text-xs"
                  placeholder="ex: ferro, ouro, lítio"
                  value={(criterios.substancias ?? []).join(", ")}
                  onChange={(e) =>
                    setCriterios((c) => ({
                      ...c,
                      substancias: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>

              {/* Fases */}
              <div>
                <label className="text-xs font-semibold block mb-1.5">Fases</label>
                <div className="grid grid-cols-1 gap-1">
                  {FASES.map((f) => (
                    <label key={f} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={(criterios.fases ?? []).includes(f)}
                        onCheckedChange={() => toggleLista("fases", f)}
                      />
                      {f}
                    </label>
                  ))}
                </div>
              </div>

              {/* Área */}
              <div>
                <label className="text-xs font-semibold block mb-1">Área (hectares)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    placeholder="mín"
                    value={criterios.area_min ?? ""}
                    onChange={(e) =>
                      setCriterios((c) => ({
                        ...c,
                        area_min: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    placeholder="máx"
                    value={criterios.area_max ?? ""}
                    onChange={(e) =>
                      setCriterios((c) => ({
                        ...c,
                        area_max: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
              </div>

              {/* CFEM + Titular */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">Status CFEM</label>
                  <Select
                    value={criterios.cfem_status ?? "qualquer"}
                    onValueChange={(v) =>
                      setCriterios((c) => ({ ...c, cfem_status: v as MapCriterios["cfem_status"] }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualquer" className="text-xs">Qualquer</SelectItem>
                      <SelectItem value="inativo" className="text-xs">Inativo (parado)</SelectItem>
                      <SelectItem value="ativo" className="text-xs">Ativo (produzindo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Tipo de titular</label>
                  <Select
                    value={criterios.titular_tipo ?? "qualquer"}
                    onValueChange={(v) =>
                      setCriterios((c) => ({ ...c, titular_tipo: v as MapCriterios["titular_tipo"] }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualquer" className="text-xs">Qualquer</SelectItem>
                      <SelectItem value="pf" className="text-xs">Pessoa Física</SelectItem>
                      <SelectItem value="pj" className="text-xs">Pessoa Jurídica</SelectItem>
                      <SelectItem value="espolio" className="text-xs">Espólio (sucessória)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={!!criterios.apenas_estrategico}
                  onCheckedChange={(v) =>
                    setCriterios((c) => ({ ...c, apenas_estrategico: !!v }))
                  }
                />
                Apenas substâncias estratégicas
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={!!criterios.sem_sobreposicao}
                  onCheckedChange={(v) =>
                    setCriterios((c) => ({ ...c, sem_sobreposicao: !!v }))
                  }
                />
                Excluir sobreposição com UC / Terra Indígena
              </label>
            </CardContent>
          </Card>

          {/* Pesos */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-bold text-sm mb-1">Pesos do ranqueamento</h3>
              <p className="text-[11px] text-muted-foreground mb-2">
                Quanto cada sinal contribui para o score. Ajuste por tese.
              </p>
              {Object.keys(PESO_LABEL).map((k) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-xs">{PESO_LABEL[k]}</span>
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs text-right"
                    value={pesos[k] ?? 0}
                    onChange={(e) =>
                      setPesos((p) => ({ ...p, [k]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ações */}
          {!canEdit && (
            <div className="rounded-lg bg-muted/40 border p-2 text-[11px] text-muted-foreground">
              Somente leitura — você não tem permissão para editar esta tese.
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={salvar} disabled={saving || !canEdit}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-brand-teal text-white hover:bg-brand-teal/90"
              onClick={rodar}
              disabled={running || !canEdit}
            >
              {running ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              Rodar varredura
            </Button>
          </div>
          {previewCount != null && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" />
              {previewCount} {previewCount === 1 ? "direito bate" : "direitos batem"} com os critérios atuais
            </p>
          )}

          {/* Acesso (ACL) */}
          <CardAcessoPanel
            lider={tese.lider_responsavel}
            criador={tese.criado_por}
            acl={tese.acl as CardAcl | null}
            podeGerenciar={canManage}
            onSave={salvarAcesso}
          />
        </div>

        {/* ── Resultados ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-bold text-sm">
              Resultados {resultados.length > 0 && `(${resultados.length})`}
            </h3>
            <div className="flex items-center gap-2">
              {resultados.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}`.replace(/\/api$/, "") + `/api/mapeamentos/${id}/relatorio?top=10`, "_blank")}
                >
                  <FileText className="h-3 w-3 mr-1" /> Relatório
                </Button>
              )}
              {tese.ultima_varredura_em && (
                <span className="text-[11px] text-muted-foreground">
                  {new Date(tese.ultima_varredura_em).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-3 flex gap-2">
            <Info className="h-4 w-4 text-brand-gold shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Base local de concessões de MG (sem atualização automática nesta etapa).
              O sinal <strong>CFEM inativo</strong> é confiável para direitos pequenos/PF,
              mas pode marcar grandes operadores erroneamente (que recolhem CFEM sob
              outro processo) — valide na análise.
            </p>
          </div>

          {resultados.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <Search className="h-10 w-10 text-brand-teal mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Configure os critérios e clique em <strong>Rodar varredura</strong> para
                  ver as oportunidades ranqueadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Score</TableHead>
                    <TableHead>Direito</TableHead>
                    <TableHead>Sinais</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((r) => (
                    <ResultadoRow key={r.id} r={r} onChange={carregar} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultadoRow({ r, onChange }: { r: MapResultado; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const score = r.score ?? 0;
  const scoreColor =
    score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-muted-foreground";

  async function setStatus(status: string) {
    setBusy(true);
    try {
      await mapApi.atualizarResultado(r.id, { status });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function promover() {
    setBusy(true);
    try {
      const res = await mapApi.promover(r.id);
      alert(`Promovido ao Funil de Oportunidades (#${res.oportunidade_id}).`);
      onChange();
    } catch (e) {
      alert("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableRow className={r.status === "descartado" ? "opacity-50" : ""}>
      <TableCell className="align-top">
        <div className={`font-bold tabular-nums ${scoreColor}`}>{score.toFixed(0)}</div>
        {r.potencial && (
          <Badge variant="outline" className={`text-[8px] px-1 py-0 mt-0.5 ${POTENCIAL_BADGE[r.potencial] ?? ""}`}>
            {POTENCIAL_LABEL[r.potencial] ?? r.potencial}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="font-semibold text-xs">{r.substancia ?? "—"}</div>
        <div className="text-[11px] text-muted-foreground">
          {r.municipio ?? "—"} · {r.area_ha != null ? `${r.area_ha.toFixed(0)} ha` : "área n/d"}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          ANM {r.processo} · {r.titular ?? ""}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1 max-w-[260px]">
          {(r.motivos ?? []).map((m) => (
            <Badge key={m} variant="outline" className="text-[9px] px-1.5 py-0">
              {m}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Select value={r.status} onValueChange={setStatus} disabled={busy}>
          <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.v} value={s.v} className="text-xs">{s.l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {r.promovido_oportunidade_id ? (
          <Badge variant="secondary" className="text-[9px]">no funil</Badge>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={promover}
            disabled={busy}
            title="Promover ao Funil de Oportunidades"
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-brand-teal" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
