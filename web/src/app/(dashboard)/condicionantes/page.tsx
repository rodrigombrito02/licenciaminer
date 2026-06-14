"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ModuleHero } from "@/components/module-hero";
import { RoleGate } from "@/components/role-gate";
import { useRole } from "@/hooks/use-role";
import { podeVer, temRestricao } from "@/lib/card-acl";
import {
  condApi,
  COND_STATUS_COLOR,
  COND_STATUS_LABEL,
  type Licenca,
  type CondResumo,
} from "@/lib/condicionantes-api";

export default function CondicionantesPage() {
  return (
    <RoleGate
      minRole="consultor"
      fallback={
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <ClipboardCheck className="h-10 w-10 text-brand-teal mx-auto" />
            <h3 className="font-bold">Radar de Condicionantes</h3>
            <p className="text-sm text-muted-foreground">
              Ferramenta de gestão de condicionantes ambientais. Em construção interna.
            </p>
          </CardContent>
        </Card>
      }
    >
      <Inner />
    </RoleGate>
  );
}

function Inner() {
  const router = useRouter();
  const role = useRole();
  const meuNome = role.status === "authenticated" ? role.nome : "";
  const isAdmin = role.status === "authenticated" && role.role === "admin";

  const [todas, setTodas] = useState<Licenca[]>([]);
  const [resumo, setResumo] = useState<CondResumo | null>(null);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([condApi.listar(), condApi.resumo()]);
      setTodas(l);
      setResumo(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const [cat, setCat] = useState<"todos" | "ambiental" | "anm">("todos");

  const visiveis = todas.filter((l) =>
    podeVer({ acl: l.acl, lider: l.lider_responsavel, criador: l.criado_por, meuNome, isAdmin })
  );
  const licencas = cat === "todos" ? visiveis : visiveis.filter((l) => (l.categoria ?? "ambiental") === cat);

  return (
    <div className="space-y-6">
      <ModuleHero
        icon={ClipboardCheck}
        badge="SQ Ambiental · Radar de Compliance"
        title="Compliance de licenças e direitos minerários"
        description="Cada condicionante ambiental e cada prazo da ANM (TAH, exigências, RFP) vira uma obrigação com prazo e status. Acompanhe o que vence, comprove o cumprimento — fim da planilha solta e do risco de caducidade."
        variant="teal"
      />

      {/* Filtro Ambiental / ANM */}
      <div className="flex gap-1.5">
        {([["todos", "Todos"], ["ambiental", "🛡️ Ambiental"], ["anm", "⛏️ Direitos ANM"]] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setCat(v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              cat === v ? "bg-brand-teal text-white border-brand-teal" : "bg-background border-border hover:border-brand-teal/40"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Licenças" value={resumo.licencas} color="#0A2540" icon={FileText} />
          <KPI label="Condicionantes" value={resumo.condicionantes} color="#156082" icon={ClipboardCheck} />
          <KPI label="Atrasadas" value={resumo.por_status.atrasada ?? 0} color="#E74C3C" icon={AlertTriangle} />
          <KPI label="Vencem em 30 dias" value={resumo.vencendo_30_dias} color="#F39C12" icon={Clock} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{licencas.length} licença(s)</p>
        <NovaLicencaDialog meuNome={meuNome} onCriada={(id) => router.push(`/condicionantes/${id}`)} />
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-brand-teal" /></div>
      ) : licencas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <ClipboardCheck className="h-12 w-12 text-brand-teal mx-auto" />
            <h3 className="font-bold">Nenhuma licença cadastrada</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Cadastre uma licença e suas condicionantes para começar a acompanhar prazos e cumprimento.
            </p>
            <NovaLicencaDialog meuNome={meuNome} onCriada={(id) => router.push(`/condicionantes/${id}`)} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {licencas.map((l) => (
            <Card key={l.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/condicionantes/${l.id}`)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm leading-tight">{l.empreendimento}</h3>
                  {temRestricao(l.acl) && <Lock className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                  {l.tipo && <Badge variant="outline" className="text-[9px]">{l.tipo}</Badge>}
                  {l.municipio && <span>{l.municipio}/{l.uf}</span>}
                  {l.orgao && <span>· {l.orgao}</span>}
                </div>
                {l.data_validade && (
                  <p className="text-[11px] text-muted-foreground">Validade: {new Date(l.data_validade).toLocaleDateString("pt-BR")}</p>
                )}
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {Object.entries(l.resumo_status).filter(([, n]) => n > 0).map(([st, n]) => (
                    <Badge key={st} variant="outline" className={`text-[9px] ${COND_STATUS_COLOR[st] ?? ""}`}>
                      {n} {COND_STATUS_LABEL[st] ?? st}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4" />
          <span className="text-2xl font-bold" style={{ color }}>{value}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

function NovaLicencaDialog({ meuNome, onCriada }: { meuNome: string; onCriada: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ empreendimento: "", orgao: "", processo: "", numero_licenca: "", tipo: "LO", municipio: "", uf: "MG", data_emissao: "", data_validade: "" });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function salvar() {
    if (!form.empreendimento.trim()) return;
    setSaving(true);
    try {
      const l = await condApi.criar({
        ...form,
        data_emissao: form.data_emissao || null,
        data_validade: form.data_validade || null,
        lider_responsavel: meuNome || undefined,
        criado_por: meuNome || undefined,
      } as Partial<Licenca>);
      setOpen(false);
      onCriada(l.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-teal text-white hover:bg-brand-teal/90"><Plus className="h-4 w-4 mr-1" /> Nova licença</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova licença</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">Empreendimento *</label>
            <Input value={form.empreendimento} onChange={(e) => set("empreendimento", e.target.value)} placeholder="Razão social" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Órgão</label><Input value={form.orgao} onChange={(e) => set("orgao", e.target.value)} placeholder="SEMAD, IBAMA..." /></div>
            <div><label className="text-xs font-medium block mb-1">Tipo</label><Input value={form.tipo} onChange={(e) => set("tipo", e.target.value)} placeholder="LO" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Processo</label><Input value={form.processo} onChange={(e) => set("processo", e.target.value)} /></div>
            <div><label className="text-xs font-medium block mb-1">Nº licença</label><Input value={form.numero_licenca} onChange={(e) => set("numero_licenca", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className="text-xs font-medium block mb-1">Município</label><Input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} /></div>
            <div><label className="text-xs font-medium block mb-1">UF</label><Input value={form.uf} onChange={(e) => set("uf", e.target.value)} maxLength={2} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Emissão</label><Input type="date" value={form.data_emissao} onChange={(e) => set("data_emissao", e.target.value)} /></div>
            <div><label className="text-xs font-medium block mb-1">Validade</label><Input type="date" value={form.data_validade} onChange={(e) => set("data_validade", e.target.value)} /></div>
          </div>
          <Button onClick={salvar} disabled={saving || !form.empreendimento.trim()} className="w-full bg-brand-teal text-white hover:bg-brand-teal/90">
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Criar licença
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
