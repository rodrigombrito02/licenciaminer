"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, ChevronDown, ChevronRight, FileText, Plus, Save, Lock, History,
  Layers, GitBranch, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ddApi, OBJETO_TIPO_LABEL, OBJETO_TIPOS, OBRIGATORIEDADE_LABEL, fmtDataHora,
  type DDTemplate, type DDTemplateArvore, type DDDocumento, type DDCriterio,
  type DDAuditoria,
} from "@/lib/dd-api";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DDTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fObjeto, setFObjeto] = useState<string>("todos");
  const [fLicenca, setFLicenca] = useState("");
  const [abertoId, setAbertoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params: { objeto_tipo?: string; licenca_codigo?: string } = {};
      if (fObjeto !== "todos") params.objeto_tipo = fObjeto;
      if (fLicenca.trim()) params.licenca_codigo = fLicenca.trim();
      setTemplates(await ddApi.templates(params));
    } finally {
      setLoading(false);
    }
  }, [fObjeto, fLicenca]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
          Editor de Régua-Mestre
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates de due diligence versionados — documentos, critérios e auditoria de alterações
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de objeto</label>
            <Select value={fObjeto} onValueChange={setFObjeto}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {OBJETO_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>{OBJETO_TIPO_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Código da licença</label>
            <Input placeholder="Ex.: LP, LI, LO…" value={fLicenca} onChange={(e) => setFLicenca(e.target.value)} />
          </div>
          <NovoTemplateDialog onCriado={carregar} />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum template encontrado.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-0">
                <button
                  onClick={() => setAbertoId(abertoId === t.id ? null : t.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  {abertoId === t.id
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <Layers className="h-4 w-4 shrink-0 text-brand-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t.nome}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px]">{OBJETO_TIPO_LABEL[t.objeto_tipo] ?? t.objeto_tipo}</Badge>
                      <Badge variant="secondary" className="text-[9px]">{t.licenca_codigo}</Badge>
                      {t.norma_origem && <span className="text-[10px] text-muted-foreground">{t.norma_origem}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="outline" className="font-tabular text-[9px]">v{t.versao}</Badge>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${t.ativo ? "border-success/30 text-success" : "border-muted text-muted-foreground"}`}
                    >
                      {t.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </button>
                {abertoId === t.id && <TemplateDetalhe templateId={t.id} onMudou={carregar} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Detalhe do template (árvore + auditoria) ── */

function TemplateDetalhe({ templateId, onMudou }: { templateId: number; onMudou: () => void }) {
  const [arvore, setArvore] = useState<DDTemplateArvore | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try { setArvore(await ddApi.template(templateId)); }
    finally { setLoading(false); }
  }, [templateId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading || !arvore) {
    return (
      <div className="flex justify-center border-t p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border-t p-4">
      <Tabs defaultValue="arvore">
        <TabsList>
          <TabsTrigger value="arvore" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />Documentos & Critérios
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arvore" className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            <NovoDocumentoDialog templateId={templateId} ordem={(arvore.documentos.length ?? 0) + 1} onCriado={carregar} />
            <NovaVersaoDialog template={arvore.template} onCriado={() => { carregar(); onMudou(); }} />
          </div>
          {arvore.documentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento neste template ainda.</p>
          ) : (
            arvore.documentos.map((doc) => (
              <DocumentoSecao key={doc.id} templateId={templateId} doc={doc} onMudou={carregar} />
            ))
          )}
        </TabsContent>

        <TabsContent value="auditoria" className="pt-4">
          <AuditoriaTimeline entidade="template" entidadeId={templateId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Seção colapsável de documento ── */

function DocumentoSecao({ templateId, doc, onMudou }: { templateId: number; doc: DDDocumento; onMudou: () => void }) {
  const [aberto, setAberto] = useState(true);
  const criterios = doc.criterios ?? [];

  return (
    <div className="rounded-lg border">
      <button onClick={() => setAberto(!aberto)} className="flex w-full items-center gap-2 p-3 text-left">
        {aberto ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <FileText className="h-4 w-4 text-brand-teal" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{doc.nome}</p>
          {doc.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{doc.descricao}</p>}
        </div>
        {doc.obrigatorio && <Badge variant="outline" className="text-[9px]">Obrigatório</Badge>}
        <Badge variant="secondary" className="font-tabular text-[9px]">{criterios.length} critérios</Badge>
      </button>
      {aberto && (
        <div className="space-y-2 border-t p-3">
          {criterios.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum critério ainda.</p>
          )}
          {criterios.map((c) => (
            <CriterioEditor key={c.id} criterio={c} onMudou={onMudou} />
          ))}
          <NovoCriterioDialog templateId={templateId} documentoId={doc.id} ordem={criterios.length + 1} onCriado={onMudou} />
        </div>
      )}
    </div>
  );
}

/* ── Editor inline de critério ── */

function CriterioEditor({ criterio, onMudou }: { criterio: DDCriterio; onMudou: () => void }) {
  const normativo = criterio.proveniencia === "normativo";
  const [evidencia, setEvidencia] = useState(criterio.evidencia_esperada);
  const [peso, setPeso] = useState(String(criterio.peso));
  const [obrig, setObrig] = useState(criterio.obrigatoriedade);
  const [dialogJust, setDialogJust] = useState(false);

  const sujo = useMemo(
    () =>
      evidencia !== criterio.evidencia_esperada ||
      peso !== String(criterio.peso) ||
      obrig !== criterio.obrigatoriedade,
    [evidencia, peso, obrig, criterio],
  );

  return (
    <div className={`rounded-lg border p-3 ${normativo ? "bg-muted/30" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {criterio.requisito_id && (
          <Badge variant="outline" className="font-mono text-[9px]">{criterio.requisito_id}</Badge>
        )}
        {criterio.topico && <span className="text-[10px] text-muted-foreground">{criterio.topico}</span>}
        {normativo ? (
          <Badge variant="outline" className="gap-1 border-muted bg-muted text-[9px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />normativo
          </Badge>
        ) : (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-[9px] text-blue-600">
            consultor
          </Badge>
        )}
        {criterio.artigo_referencia && (
          <span className="text-[10px] text-muted-foreground">{criterio.artigo_referencia}</span>
        )}
      </div>

      {criterio.teste_aderencia && (
        <p className="mb-2 text-xs font-medium">{criterio.teste_aderencia}</p>
      )}

      <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Evidência esperada</label>
      <textarea
        value={evidencia}
        onChange={(e) => setEvidencia(e.target.value)}
        disabled={normativo}
        rows={2}
        className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="w-24">
          <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Peso</label>
          <Input
            type="number" step="0.1" value={peso} disabled={normativo}
            onChange={(e) => setPeso(e.target.value)} className="h-8 text-xs"
          />
        </div>
        <div className="w-44">
          <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Obrigatoriedade</label>
          <Select value={obrig} onValueChange={setObrig} disabled={normativo}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="obrigatorio">{OBRIGATORIEDADE_LABEL.obrigatorio}</SelectItem>
              <SelectItem value="desejavel">{OBRIGATORIEDADE_LABEL.desejavel}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-1.5">
          {!normativo && sujo && (
            <Button size="sm" className="h-8" onClick={() => setDialogJust(true)}>
              <Save className="mr-1 h-3.5 w-3.5" />Salvar
            </Button>
          )}
          {!normativo && (
            <DeleteCriterioButton criterioId={criterio.id} onExcluido={onMudou} />
          )}
        </div>
      </div>

      {normativo && (
        <p className="mt-2 text-[10px] italic text-muted-foreground">
          Critério normativo — travado para edição. Origine ajustes em uma nova versão.
        </p>
      )}

      <JustificativaDialog
        open={dialogJust}
        onOpenChange={setDialogJust}
        titulo="Salvar alteração do critério"
        descricao="Toda alteração de critério é registrada na auditoria. Informe a justificativa."
        onConfirmar={async (justificativa) => {
          await ddApi.patchCriterio(criterio.id, {
            evidencia_esperada: evidencia,
            peso: Number(peso),
            obrigatoriedade: obrig,
            justificativa,
          });
          setDialogJust(false);
          onMudou();
        }}
      />
    </div>
  );
}

function DeleteCriterioButton({ criterioId, onExcluido }: { criterioId: number; onExcluido: () => void }) {
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="h-8 text-danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir critério</DialogTitle>
            <DialogDescription>Esta ação remove o critério do template. Deseja continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={salvando}
              onClick={async () => {
                setSalvando(true);
                try { await ddApi.deleteCriterio(criterioId); setOpen(false); onExcluido(); }
                finally { setSalvando(false); }
              }}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Dialog reutilizável de justificativa ── */

function JustificativaDialog({
  open, onOpenChange, titulo, descricao, onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  descricao: string;
  onConfirmar: (justificativa: string) => Promise<void>;
}) {
  const [just, setJust] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (open) setJust(""); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <div>
          <label className="mb-1 block text-xs font-medium">Justificativa <span className="text-danger">*</span></label>
          <textarea
            value={just}
            onChange={(e) => setJust(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo da alteração…"
            className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!just.trim() || salvando}
            onClick={async () => {
              setSalvando(true);
              try { await onConfirmar(just.trim()); }
              finally { setSalvando(false); }
            }}
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Novo template ── */

function NovoTemplateDialog({ onCriado }: { onCriado: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [objeto, setObjeto] = useState<string>("licenca_ambiental");
  const [licenca, setLicenca] = useState("");
  const [descricao, setDescricao] = useState("");
  const [norma, setNorma] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) { setNome(""); setObjeto("licenca_ambiental"); setLicenca(""); setDescricao(""); setNorma(""); }
  }, [open]);

  return (
    <>
      <Button className="ml-auto" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />Novo template
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo template de régua-mestre</DialogTitle>
            <DialogDescription>Cria a versão 1 de um novo template de due diligence.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Régua LP — Mineração" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Tipo de objeto</label>
                <Select value={objeto} onValueChange={setObjeto}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBJETO_TIPOS.map((t) => <SelectItem key={t} value={t}>{OBJETO_TIPO_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Código da licença</label>
                <Input value={licenca} onChange={(e) => setLicenca(e.target.value)} placeholder="LP" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Norma de origem</label>
              <Input value={norma} onChange={(e) => setNorma(e.target.value)} placeholder="Ex.: DN COPAM 217/2017" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Descrição</label>
              <textarea
                value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2}
                className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!nome.trim() || !licenca.trim() || salvando}
              onClick={async () => {
                setSalvando(true);
                try {
                  await ddApi.criarTemplate({
                    nome: nome.trim(), objeto_tipo: objeto, licenca_codigo: licenca.trim(),
                    descricao: descricao.trim() || null, norma_origem: norma.trim() || null,
                  });
                  setOpen(false); onCriado();
                } finally { setSalvando(false); }
              }}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Novo documento ── */

function NovoDocumentoDialog({ templateId, ordem, onCriado }: { templateId: number; ordem: number; onCriado: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [docId, setDocId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [norma, setNorma] = useState("");
  const [obrigatorio, setObrigatorio] = useState("sim");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) { setNome(""); setDocId(""); setDescricao(""); setNorma(""); setObrigatorio("sim"); }
  }, [open]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" />Adicionar documento
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar documento</DialogTitle>
            <DialogDescription>Novo documento na árvore deste template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium">Nome</label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: EIA/RIMA" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Doc ID</label>
                <Input value={docId} onChange={(e) => setDocId(e.target.value)} placeholder="EIA" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Descrição</label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Norma de referência</label>
                <Input value={norma} onChange={(e) => setNorma(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Obrigatório</label>
                <Select value={obrigatorio} onValueChange={setObrigatorio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!nome.trim() || salvando}
              onClick={async () => {
                setSalvando(true);
                try {
                  await ddApi.criarDocumento({
                    template_id: templateId, nome: nome.trim(), doc_id: docId.trim() || null,
                    descricao: descricao.trim() || null, norma_referencia: norma.trim() || null,
                    obrigatorio: obrigatorio === "sim", ordem,
                  });
                  setOpen(false); onCriado();
                } finally { setSalvando(false); }
              }}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Novo critério ── */

function NovoCriterioDialog({
  templateId, documentoId, ordem, onCriado,
}: { templateId: number; documentoId: number; ordem: number; onCriado: () => void }) {
  const [open, setOpen] = useState(false);
  const [topico, setTopico] = useState("");
  const [teste, setTeste] = useState("");
  const [evidencia, setEvidencia] = useState("");
  const [peso, setPeso] = useState("1");
  const [obrig, setObrig] = useState("obrigatorio");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) { setTopico(""); setTeste(""); setEvidencia(""); setPeso("1"); setObrig("obrigatorio"); }
  }, [open]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" />Adicionar critério
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar critério</DialogTitle>
            <DialogDescription>
              Critérios criados aqui têm proveniência <strong>consultor</strong> (editáveis).
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
                  await ddApi.criarCriterio({
                    template_id: templateId, documento_id: documentoId,
                    topico: topico.trim() || null, teste_aderencia: teste.trim() || null,
                    evidencia_esperada: evidencia.trim(), proveniencia: "consultor",
                    obrigatoriedade: obrig, peso: Number(peso), ordem,
                  });
                  setOpen(false); onCriado();
                } finally { setSalvando(false); }
              }}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Nova versão ── */

function NovaVersaoDialog({ template, onCriado }: { template: DDTemplate; onCriado: () => void }) {
  const [open, setOpen] = useState(false);
  const [just, setJust] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (open) setJust(""); }, [open]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <GitBranch className="mr-1 h-3.5 w-3.5" />Nova versão
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova versão do template</DialogTitle>
            <DialogDescription>
              Cria a versão {template.versao + 1} a partir da v{template.versao}.
              As instâncias já criadas <strong>não</strong> são afetadas — elas mantêm a versão com que foram geradas.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs font-medium">Justificativa <span className="text-danger">*</span></label>
            <textarea
              value={just} onChange={(e) => setJust(e.target.value)} rows={3}
              placeholder="O que muda nesta versão?"
              className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!just.trim() || salvando}
              onClick={async () => {
                setSalvando(true);
                try { await ddApi.novaVersao(template.id, { justificativa: just.trim() }); setOpen(false); onCriado(); }
                finally { setSalvando(false); }
              }}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Timeline de auditoria ── */

function AuditoriaTimeline({ entidade, entidadeId }: { entidade: string; entidadeId: number }) {
  const [itens, setItens] = useState<DDAuditoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ddApi.auditoria(entidade, entidadeId).then(setItens).finally(() => setLoading(false));
  }, [entidade, entidadeId]);

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum registro de auditoria.</p>;
  }

  return (
    <div className="space-y-3">
      {itens.map((a) => (
        <div key={a.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-teal" />
            <span className="w-px flex-1 bg-border" />
          </div>
          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[9px]">{a.acao}</Badge>
              <span className="text-xs font-medium">{a.autor ?? "—"}</span>
              <span className="text-[10px] text-muted-foreground">{fmtDataHora(a.criado_em)}</span>
            </div>
            {a.justificativa && (
              <p className="mt-1 text-xs text-muted-foreground">{a.justificativa}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
