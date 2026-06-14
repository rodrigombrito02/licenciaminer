"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crosshair,
  Plus,
  Loader2,
  Search,
  Trash2,
  Clock,
  Layers,
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
import { Lock } from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { RoleGate } from "@/components/role-gate";
import { useRole } from "@/hooks/use-role";
import { podeVer, temRestricao } from "@/lib/card-acl";
import { mapApi, type Mapeamento, type MapTemplate } from "@/lib/api";

const OBJETIVO_LABEL: Record<string, string> = {
  pf_pequeno: "Pequenos DMs / PF",
  investidor_estrangeiro: "Investidor estrangeiro",
  projeto_interno: "Projeto interno",
  consolidacao: "Consolidação",
  livre: "Tese livre",
};

const OBJETIVO_COLOR: Record<string, string> = {
  pf_pequeno: "bg-teal-100 text-teal-800 border-teal-200",
  investidor_estrangeiro: "bg-purple-100 text-purple-800 border-purple-200",
  projeto_interno: "bg-amber-100 text-amber-800 border-amber-200",
  consolidacao: "bg-blue-100 text-blue-800 border-blue-200",
  livre: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function MapeamentosPage() {
  return (
    <RoleGate
      minRole="consultor"
      fallback={
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Crosshair className="h-10 w-10 text-brand-teal mx-auto" />
            <h3 className="font-bold">Área interna Summo</h3>
            <p className="text-sm text-muted-foreground">
              Os Mapeamentos de prospecção são uma ferramenta interna, disponível
              para consultores e administradores Summo.
            </p>
          </CardContent>
        </Card>
      }
    >
      <MapeamentosInner />
    </RoleGate>
  );
}

function MapeamentosInner() {
  const router = useRouter();
  const role = useRole();
  const meuNome = role.status === "authenticated" ? role.nome : "";
  const isAdmin = role.status === "authenticated" && role.role === "admin";

  const [todos, setTodos] = useState<Mapeamento[]>([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      setTodos(await mapApi.listar());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Filtra pelo que eu posso ver (admin vê tudo)
  const itens = todos.filter((m) =>
    podeVer({ acl: m.acl, lider: m.lider_responsavel, criador: m.criado_por, meuNome, isAdmin })
  );

  async function deletar(id: number, nome: string) {
    if (!confirm(`Excluir o mapeamento "${nome}"? Os resultados serão perdidos.`)) return;
    await mapApi.deletar(id);
    recarregar();
  }

  return (
    <div className="space-y-6">
      <ModuleHero
        icon={Crosshair}
        badge="Direitos e Concessões · Interno"
        title="Mapeamentos de prospecção"
        description="Crie teses de busca configuráveis sobre a base de direitos minerários. Cada mapeamento varre a base, ranqueia oportunidades e alimenta o Funil. Da prospecção dirigida ao roll-up — você define os critérios."
        variant="teal"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {itens.length} {itens.length === 1 ? "tese salva" : "teses salvas"}
        </p>
        <NovaTeseDialog meuNome={meuNome} onCriada={(id) => router.push(`/mapeamentos/${id}`)} />
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
        </div>
      ) : itens.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Crosshair className="h-12 w-12 text-brand-teal mx-auto" />
            <h3 className="font-bold">Nenhuma tese ainda</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Comece a partir de um modelo (ex: pequenos DMs para PF, ativos para
              investidor estrangeiro) ou crie uma tese livre com seus próprios
              critérios.
            </p>
            <NovaTeseDialog meuNome={meuNome} onCriada={(id) => router.push(`/mapeamentos/${id}`)} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/mapeamentos/${m.id}`)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm leading-tight">{m.nome}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletar(m.id, m.nome);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${OBJETIVO_COLOR[m.objetivo] ?? OBJETIVO_COLOR.livre}`}
                  >
                    {OBJETIVO_LABEL[m.objetivo] ?? m.objetivo}
                  </Badge>
                  {temRestricao(m.acl) && (
                    <Badge variant="secondary" className="text-[9px] gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> restrito
                    </Badge>
                  )}
                  {m.lider_responsavel && (
                    <span className="text-[10px] text-muted-foreground">· {m.lider_responsavel}</span>
                  )}
                </div>
                {m.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {m.descricao}
                  </p>
                )}
                <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" /> {m.n_resultados} resultados
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {m.ultima_varredura_em
                      ? new Date(m.ultima_varredura_em).toLocaleDateString("pt-BR")
                      : "nunca rodou"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NovaTeseDialog({ meuNome, onCriada }: { meuNome: string; onCriada: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<MapTemplate[]>([]);
  const [escolhido, setEscolhido] = useState<MapTemplate | null>(null);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && templates.length === 0) {
      mapApi.templates().then((d) => setTemplates(d.templates));
    }
  }, [open, templates.length]);

  function escolher(t: MapTemplate) {
    setEscolhido(t);
    setNome(t.nome);
  }

  async function criar() {
    if (!escolhido || !nome.trim()) return;
    setSaving(true);
    try {
      const m = await mapApi.criar({
        nome: nome.trim(),
        objetivo: escolhido.objetivo,
        descricao: escolhido.descricao,
        criterios: escolhido.criterios,
        pesos: escolhido.pesos,
        criado_por: meuNome || undefined,
        lider_responsavel: meuNome || undefined,
      });
      setOpen(false);
      setEscolhido(null);
      setNome("");
      onCriada(m.id);
    } catch (e) {
      alert("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-teal text-white hover:bg-brand-teal/90">
          <Plus className="h-4 w-4 mr-1" /> Nova tese
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tese de mapeamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Escolha um modelo de partida. Você ajusta todos os critérios depois.
          </p>
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.objetivo}
                onClick={() => escolher(t)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  escolhido?.objetivo === t.objetivo
                    ? "border-brand-teal bg-brand-teal/5"
                    : "border-border hover:border-brand-teal/40"
                }`}
              >
                <div className="font-semibold text-sm">{t.nome}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {t.descricao}
                </div>
              </button>
            ))}
          </div>
          {escolhido && (
            <div>
              <label className="text-xs font-medium block mb-1">Nome da tese</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          )}
          <Button
            onClick={criar}
            disabled={!escolhido || !nome.trim() || saving}
            className="w-full bg-brand-teal text-white hover:bg-brand-teal/90"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Search className="h-3 w-3 mr-1" />
            )}
            Criar e configurar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
