"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Target,
  Plus,
  Loader2,
  Trash2,
  FileText,
  ArrowRight,
  ChevronRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleHero } from "@/components/module-hero";
import { opApi, type Oportunidade, type OportunidadeEtapa } from "@/lib/api";

const ETAPA_COLORS: Record<string, string> = {
  prospect: "bg-blue-100 text-blue-800 border-blue-200",
  avaliacao: "bg-teal-100 text-teal-800 border-teal-200",
  relatorio: "bg-yellow-100 text-yellow-800 border-yellow-200",
  investidores: "bg-purple-100 text-purple-800 border-purple-200",
  aprovacao: "bg-amber-100 text-amber-800 border-amber-200",
  estruturacao: "bg-orange-100 text-orange-800 border-orange-200",
  implantacao: "bg-red-100 text-red-800 border-red-200",
  operacao: "bg-green-100 text-green-800 border-green-200",
};

export default function OportunidadesPage() {
  const [etapas, setEtapas] = useState<OportunidadeEtapa[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<{
    total: number;
    por_etapa: Record<string, number>;
    valor_pipeline_estimado: number;
  } | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const [e, ops, k] = await Promise.all([
        opApi.etapas(),
        opApi.listar(),
        opApi.kpis(),
      ]);
      setEtapas(e);
      setOportunidades(ops);
      setKpis(k);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return (
    <div className="space-y-6">
      <ModuleHero
        icon={Target}
        badge="Funil de Oportunidades"
        title="Prospecção e avaliação de direitos minerários"
        description="Pipeline visual de oportunidades — da prospecção à operação, com avaliação dos 9 parâmetros e Relatório de Viabilidade Summo gerado automaticamente."
        variant="gold"
      />

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Total no funil" value={kpis.total} color="#0A2540" />
          <KPICard
            label="Em avaliação"
            value={kpis.por_etapa.avaliacao || 0}
            color="#156082"
          />
          <KPICard
            label="Para investidores"
            value={kpis.por_etapa.investidores || 0}
            color="#9333EA"
          />
          <KPICard
            label="Pipeline estimado"
            value={`R$ ${(kpis.valor_pipeline_estimado / 1e6).toFixed(1)}M`}
            color="#FFC000"
          />
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <NovaOportunidadeDialog onCriada={recarregar} />
      </div>

      {/* Kanban por etapa */}
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
        </div>
      ) : oportunidades.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Target className="h-12 w-12 text-brand-gold mx-auto" />
            <h3 className="font-bold">Funil vazio</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Comece criando sua primeira oportunidade. Pode ser uma prospecção
              identificada no mapa ou um processo ANM que você quer avaliar.
            </p>
            <NovaOportunidadeDialog onCriada={recarregar} />
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-3 min-w-max">
            {etapas.map((e) => {
              const items = oportunidades.filter((o) => o.etapa === e.codigo);
              return (
                <div key={e.codigo} className="w-72 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="font-bold text-xs uppercase tracking-wider">
                      {e.label}
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {items.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {items.map((o) => (
                      <OportunidadeCard
                        key={o.id}
                        op={o}
                        etapas={etapas}
                        onChange={recarregar}
                      />
                    ))}
                    {items.length === 0 && (
                      <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground/60">vazio</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="p-4">
        <div className="text-2xl font-bold font-tabular" style={{ color }}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function OportunidadeCard({
  op,
  etapas,
  onChange,
}: {
  op: Oportunidade;
  etapas: OportunidadeEtapa[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function mudar(novaEtapa: string) {
    setBusy(true);
    try {
      await opApi.mudarEtapa(op.id, novaEtapa);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function deletar() {
    if (!confirm(`Deletar oportunidade "${op.titulo}"?`)) return;
    setBusy(true);
    try {
      await opApi.deletar(op.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function gerarRelatorio() {
    setBusy(true);
    try {
      await opApi.gerarRelatorio(op.id);
    } finally {
      setBusy(false);
    }
  }

  const score = op.score_consolidado;
  const scoreColor = score == null ? "text-muted-foreground" :
    score >= 7 ? "text-success" : score >= 4 ? "text-warning" : "text-destructive";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/oportunidades/${op.id}`} className="flex-1 min-w-0 group">
            <h4 className="font-bold text-sm truncate group-hover:text-brand-teal">{op.titulo}</h4>
            {op.substancia && (
              <p className="text-xs text-muted-foreground">{op.substancia}</p>
            )}
          </Link>
          <Button variant="ghost" size="sm" onClick={deletar} disabled={busy}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
        {(op.municipio || op.uf) && (
          <p className="text-[11px] text-muted-foreground">
            📍 {[op.municipio, op.uf].filter(Boolean).join("/")}
          </p>
        )}
        {op.processo_anm && (
          <p className="text-[10px] font-mono text-muted-foreground">ANM {op.processo_anm}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className={`text-[10px] ${scoreColor}`}>
            Score: {score != null ? score.toFixed(1) : "n/d"}
          </Badge>
          {op.valor_estimado && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              R$ {(op.valor_estimado / 1e6).toFixed(1)}M
            </span>
          )}
        </div>
        <div className="flex gap-1 pt-1">
          <Select value={op.etapa} onValueChange={mudar} disabled={busy}>
            <SelectTrigger className="h-7 text-[11px] flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {etapas.map((e) => (
                <SelectItem key={e.codigo} value={e.codigo} className="text-xs">
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={gerarRelatorio} disabled={busy} title="Gerar Relatório de Viabilidade">
            <FileText className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NovaOportunidadeDialog({ onCriada }: { onCriada: () => void }) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [substancia, setSubstancia] = useState("");
  const [processoAnm, setProcessoAnm] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await opApi.criar({
        titulo: titulo.trim(),
        substancia: substancia.trim() || null,
        processo_anm: processoAnm.trim() || null,
        municipio: municipio.trim() || null,
        uf: uf.trim().toUpperCase() || null,
        area_ha: areaHa ? Number(areaHa) : null,
      });
      setOpen(false);
      setTitulo(""); setSubstancia(""); setProcessoAnm("");
      setMunicipio(""); setUf(""); setAreaHa("");
      onCriada();
    } catch (e) {
      alert("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-gold text-brand-navy hover:bg-brand-gold/90">
          <Plus className="h-4 w-4 mr-1" /> Nova Oportunidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">Título *</label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Mina Conceição Norte" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Substância</label>
              <Input value={substancia} onChange={e => setSubstancia(e.target.value)} placeholder="Ex: Minério de Ferro" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Processo ANM</label>
              <Input value={processoAnm} onChange={e => setProcessoAnm(e.target.value)} placeholder="000000/0000" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium block mb-1">Município</label>
              <Input value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="Ex: Itabirito" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">UF</label>
              <Input value={uf} onChange={e => setUf(e.target.value)} placeholder="MG" maxLength={2} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Área (hectares)</label>
            <Input type="number" value={areaHa} onChange={e => setAreaHa(e.target.value)} placeholder="Ex: 1200" />
          </div>
          <Button onClick={handleSave} disabled={saving || !titulo.trim()} className="bg-brand-gold text-brand-navy hover:bg-brand-gold/90">
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Criar e adicionar ao Prospect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
