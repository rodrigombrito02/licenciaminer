"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, ChevronDown, ChevronRight, FileText, Plus, CheckCircle2,
} from "lucide-react";
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
  ddApi, OBJETO_TIPO_LABEL, OBRIGATORIEDADE_LABEL, AVALIACAO_OPTIONS, fmtDataHora,
  type DDInstanciaArvore, type DDInstanciaDocumento, type DDInstanciaCriterio,
  type DDScore, type DDScoreDoc,
} from "@/lib/dd-api";

export default function InstanciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = use(params);
  const id = Number(idStr);

  const [arvore, setArvore] = useState<DDInstanciaArvore | null>(null);
  const [score, setScore] = useState<DDScore | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarTudo = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([ddApi.instancia(id), ddApi.score(id)]);
      setArvore(a);
      setScore(s);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const recarregarScore = useCallback(async () => {
    setScore(await ddApi.score(id));
  }, [id]);

  useEffect(() => { carregarTudo(); }, [carregarTudo]);

  if (loading || !arvore) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
      </div>
    );
  }

  const inst = arvore.instancia;
  const scoreByDoc = new Map<number, DDScoreDoc>(
    (score?.por_documento ?? []).map((d) => [d.doc_id, d]),
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs text-muted-foreground">
          <Link href="/due-diligence/instancias" className="hover:underline">Diligências</Link>
          {" / "}<span className="font-mono">#{inst.id}</span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">{inst.cliente}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[9px]">{inst.licenca_codigo}</Badge>
          <Badge variant="outline" className="text-[9px]">{OBJETO_TIPO_LABEL[inst.objeto_tipo] ?? inst.objeto_tipo}</Badge>
          <Badge variant="outline" className="text-[9px]">template v{inst.template_versao}</Badge>
          {inst.atividade && <Badge variant="outline" className="text-[9px]">{inst.atividade}</Badge>}
          {inst.classe != null && <Badge variant="outline" className="text-[9px]">Classe {inst.classe}</Badge>}
          <span className="text-[10px] text-muted-foreground">criada {fmtDataHora(inst.criado_em)}</span>
        </div>
        {inst.escopo && <p className="mt-1 text-sm text-muted-foreground">{inst.escopo}</p>}
      </div>

      {/* Score global */}
      {score && <ScoreGlobalCard score={score} />}

      {/* Documentos */}
      <div className="space-y-2">
        {arvore.documentos.map((doc) => (
          <DocumentoCard
            key={doc.id}
            instId={id}
            doc={doc}
            scoreDoc={scoreByDoc.get(doc.id)}
            onAvaliado={recarregarScore}
            onCriterioAdicionado={carregarTudo}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Card de score global ── */

function ScoreGlobalCard({ score }: { score: DDScore }) {
  const g = score.global;
  const pct = Math.round(g.conformidade_ponderada * 100);
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: g.cor }} />
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="text-center sm:text-left">
          <div className="font-tabular text-4xl font-bold" style={{ color: g.cor }}>{pct}%</div>
          <p className="text-[10px] uppercase text-muted-foreground">Conformidade ponderada</p>
        </div>
        <div className="flex-1">
          <p className="font-heading text-lg font-bold" style={{ color: g.cor }}>{g.classificacao}</p>
          <p className="text-xs text-muted-foreground">{g.descricao}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <span className="text-success">{g.atende} atende</span>
            <span className="text-warning">{g.atende_parcial} parcial</span>
            <span className="text-danger">{g.nao_atende} não atende</span>
            <span className="text-muted-foreground">{g.nao_aplica} N/A</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Card colapsável de documento ── */

function DocumentoCard({
  instId, doc, scoreDoc, onAvaliado, onCriterioAdicionado,
}: {
  instId: number;
  doc: DDInstanciaDocumento;
  scoreDoc?: DDScoreDoc;
  onAvaliado: () => void;
  onCriterioAdicionado: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const criterios = doc.criterios ?? [];
  const pct = scoreDoc ? Math.round(scoreDoc.pct) : null;

  return (
    <Card>
      <CardContent className="p-0">
        <button onClick={() => setAberto(!aberto)} className="flex w-full items-center gap-3 p-4 text-left">
          {aberto ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <FileText className="h-4 w-4 shrink-0 text-brand-teal" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{doc.nome}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {doc.obrigatorio && <Badge variant="outline" className="text-[9px]">Obrigatório</Badge>}
              {scoreDoc && (
                <Badge variant="outline" className="text-[9px]">
                  {scoreDoc.obrigatorios_atendidos} de {scoreDoc.obrigatorios_total} obrigatórios atendidos
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">{criterios.length} critérios</span>
            </div>
          </div>
          {pct != null && (
            <div className="shrink-0 text-right">
              <span className="font-tabular text-xl font-bold" style={{ color: scoreDoc?.cor }}>{pct}%</span>
              {scoreDoc?.status && <p className="text-[9px]" style={{ color: scoreDoc.cor }}>{scoreDoc.status}</p>}
            </div>
          )}
        </button>

        {aberto && (
          <div className="space-y-2 border-t p-3">
            {criterios.map((c) => (
              <CriterioAvaliacao key={c.id} instId={instId} criterio={c} onAvaliado={onAvaliado} />
            ))}
            <AddCriterioInstanciaDialog
              instId={instId}
              instDocumentoId={doc.id}
              onCriado={onCriterioAdicionado}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Avaliação de um critério ── */

function CriterioAvaliacao({
  instId, criterio, onAvaliado,
}: { instId: number; criterio: DDInstanciaCriterio; onAvaliado: () => void }) {
  const [avaliacao, setAvaliacao] = useState(criterio.avaliacao ?? "");
  const [observacao, setObservacao] = useState(criterio.observacao ?? "");
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [pendente, setPendente] = useState(false);
  const consultor = criterio.proveniencia === "consultor";

  const salvar = useCallback(async (campos: Record<string, unknown>) => {
    setPendente(true);
    try {
      await ddApi.avaliarCriterio(instId, criterio.id, campos);
      onAvaliado();
    } finally {
      setPendente(false);
    }
  }, [instId, criterio.id, onAvaliado]);

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {criterio.requisito_id && <Badge variant="outline" className="font-mono text-[9px]">{criterio.requisito_id}</Badge>}
        {criterio.topico && <span className="text-[10px] text-muted-foreground">{criterio.topico}</span>}
        <Badge variant="outline" className="text-[9px]">{OBRIGATORIEDADE_LABEL[criterio.obrigatoriedade] ?? criterio.obrigatoriedade}</Badge>
        {consultor && (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-[9px] text-blue-600">consultor</Badge>
        )}
        {pendente && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {criterio.teste_aderencia && <p className="text-xs font-medium">{criterio.teste_aderencia}</p>}
      <p className="mt-1 text-xs italic text-muted-foreground">Evidência esperada: {criterio.evidencia_esperada}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {AVALIACAO_OPTIONS.map((opt) => {
          const ativo = avaliacao === opt.value;
          return (
            <Button
              key={opt.value}
              size="sm"
              variant={ativo ? "default" : "outline"}
              className={`h-7 text-xs ${ativo ? opt.classe : ""}`}
              onClick={() => { setAvaliacao(opt.value); salvar({ avaliacao: opt.value, observacao }); }}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-2">
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={2}
          placeholder="Observação / evidência encontrada…"
          className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        />
        {observacao !== (criterio.observacao ?? "") && (
          <div className="mt-1 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={salvandoObs}
              onClick={async () => {
                setSalvandoObs(true);
                try { await salvar({ avaliacao: avaliacao || null, observacao }); }
                finally { setSalvandoObs(false); }
              }}
            >
              {salvandoObs && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Salvar observação
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Adicionar critério (consultor) na instância ── */

function AddCriterioInstanciaDialog({
  instId, instDocumentoId, onCriado,
}: { instId: number; instDocumentoId: number; onCriado: () => void }) {
  const [open, setOpen] = useState(false);
  const [topico, setTopico] = useState("");
  const [teste, setTeste] = useState("");
  const [evidencia, setEvidencia] = useState("");
  const [peso, setPeso] = useState("1");
  const [obrig, setObrig] = useState("desejavel");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) { setTopico(""); setTeste(""); setEvidencia(""); setPeso("1"); setObrig("desejavel"); }
  }, [open]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" />Adicionar critério (consultor)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar critério à diligência</DialogTitle>
            <DialogDescription>
              Critério específico desta diligência (proveniência consultor). Não altera a régua-mestre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Tópico</label>
              <Input value={topico} onChange={(e) => setTopico(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Teste de aderência</label>
              <Input value={teste} onChange={(e) => setTeste(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Evidência esperada <span className="text-danger">*</span></label>
              <textarea
                value={evidencia} onChange={(e) => setEvidencia(e.target.value)} rows={2}
                className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Peso</label>
                <Input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Obrigatoriedade</label>
                <Select value={obrig} onValueChange={setObrig}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="obrigatorio">{OBRIGATORIEDADE_LABEL.obrigatorio}</SelectItem>
                    <SelectItem value="desejavel">{OBRIGATORIEDADE_LABEL.desejavel}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!evidencia.trim() || salvando}
              onClick={async () => {
                setSalvando(true);
                try {
                  await ddApi.addCriterioInstancia(instId, {
                    inst_documento_id: instDocumentoId,
                    topico: topico.trim() || null,
                    teste_aderencia: teste.trim() || null,
                    evidencia_esperada: evidencia.trim(),
                    proveniencia: "consultor",
                    obrigatoriedade: obrig,
                    peso: Number(peso),
                  });
                  setOpen(false); onCriado();
                } finally { setSalvando(false); }
              }}
            >
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
