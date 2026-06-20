"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, ClipboardCheck, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ddApi, OBJETO_TIPO_LABEL, fmtDataHora,
  type DDInstancia, type DDTemplate,
} from "@/lib/dd-api";

const STATUS_COR: Record<string, string> = {
  rascunho: "border-muted text-muted-foreground",
  em_andamento: "border-warning/30 text-warning",
  concluida: "border-success/30 text-success",
  concluído: "border-success/30 text-success",
};

export default function InstanciasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
        </div>
      }
    >
      <InstanciasInner />
    </Suspense>
  );
}

function InstanciasInner() {
  const searchParams = useSearchParams();
  const [instancias, setInstancias] = useState<DDInstancia[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros iniciais a partir da URL (?objeto=...&codigo=...)
  const [fObjeto] = useState<string>(() => searchParams.get("objeto") || "");
  const [fLicenca] = useState<string>(() => searchParams.get("codigo") || "");

  const carregar = useCallback(async () => {
    setLoading(true);
    try { setInstancias(await ddApi.instancias()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const instanciasFiltradas = useMemo(
    () =>
      instancias.filter((i) => {
        if (fObjeto && i.objeto_tipo !== fObjeto) return false;
        if (fLicenca && i.licenca_codigo !== fLicenca) return false;
        return true;
      }),
    [instancias, fObjeto, fLicenca],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
            Diligências
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Avaliações de conformidade derivadas de uma régua-mestre versionada
          </p>
        </div>
        <NovaInstanciaDialog onCriada={carregar} />
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
        </div>
      ) : instanciasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Nenhuma diligência encontrada</p>
            <p className="text-xs text-muted-foreground">
              {fObjeto || fLicenca
                ? "Nenhuma diligência corresponde ao filtro aplicado."
                : "Inicie uma nova diligência a partir de um template."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {instanciasFiltradas.map((i) => (
            <Link key={i.id} href={`/due-diligence/instancias/${i.id}`}>
              <Card className="transition-colors hover:border-brand-teal/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.cliente}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[9px]">{i.licenca_codigo}</Badge>
                      <Badge variant="outline" className="text-[9px]">{OBJETO_TIPO_LABEL[i.objeto_tipo] ?? i.objeto_tipo}</Badge>
                      {i.escopo && <span className="text-[10px] text-muted-foreground truncate max-w-[280px]">{i.escopo}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="outline" className={`text-[9px] ${STATUS_COR[i.status] ?? ""}`}>{i.status}</Badge>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDataHora(i.criado_em)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Nova diligência ── */

function NovaInstanciaDialog({ onCriada }: { onCriada: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<DDTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [cliente, setCliente] = useState("");
  const [escopo, setEscopo] = useState("");
  const [atividade, setAtividade] = useState("");
  const [classe, setClasse] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTemplateId(""); setCliente(""); setEscopo(""); setAtividade(""); setClasse("");
    ddApi.templates().then((ts) => setTemplates(ts.filter((t) => t.ativo)));
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />Nova diligência
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova diligência</DialogTitle>
            <DialogDescription>
              A diligência copia os critérios da versão atual do template escolhido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Template (régua-mestre) <span className="text-danger">*</span></label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione um template ativo" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nome} <span className="text-muted-foreground">— {t.licenca_codigo} v{t.versao}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Cliente <span className="text-danger">*</span></label>
              <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente / empreendedor" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Escopo</label>
              <Input value={escopo} onChange={(e) => setEscopo(e.target.value)} placeholder="Ex.: Ampliação da cava norte" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Atividade</label>
                <Input value={atividade} onChange={(e) => setAtividade(e.target.value)} placeholder="A-02" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Classe</label>
                <Input type="number" value={classe} onChange={(e) => setClasse(e.target.value)} placeholder="4" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!templateId || !cliente.trim() || salvando}
              onClick={async () => {
                setSalvando(true);
                try {
                  const inst = await ddApi.criarInstancia({
                    template_id: Number(templateId),
                    cliente: cliente.trim(),
                    escopo: escopo.trim() || null,
                    atividade: atividade.trim() || null,
                    classe: classe.trim() ? Number(classe) : null,
                  });
                  setOpen(false);
                  onCriada();
                  router.push(`/due-diligence/instancias/${inst.id}`);
                } finally { setSalvando(false); }
              }}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar e abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
