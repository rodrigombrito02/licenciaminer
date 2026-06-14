"use client";

import { useEffect, useMemo, useState } from "react";
import { paApi, type PaTarefa } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface KanbanProps {
  tarefas: PaTarefa[];
  /** Colunas em ordem; se nao especificado, gera dinamicamente */
  colunas?: string[];
  /** Desabilita o arrastar-e-soltar (somente leitura) */
  readOnly?: boolean;
}

// Status canonico salvo ao soltar o card em cada coluna.
const BUCKET_TO_STATUS: Record<string, string> = {
  "A Fazer": "Nao iniciado",
  "Em Andamento": "Em andamento",
  "Bloqueado": "Bloqueado",
  "Concluído": "Concluido",
  "Cancelado": "Cancelado",
};

const STATUS_BUCKETS: Record<string, string> = {
  "a fazer": "A Fazer",
  "todo": "A Fazer",
  "open": "A Fazer",
  "aberto": "A Fazer",
  "pendente": "A Fazer",
  "nao iniciado": "A Fazer",
  "não iniciado": "A Fazer",
  "em andamento": "Em Andamento",
  "in progress": "Em Andamento",
  "em execucao": "Em Andamento",
  "em execução": "Em Andamento",
  "andamento": "Em Andamento",
  "bloqueado": "Bloqueado",
  "blocked": "Bloqueado",
  "stuck": "Bloqueado",
  "atrasado": "Bloqueado",
  "concluido": "Concluído",
  "concluído": "Concluído",
  "done": "Concluído",
  "complete": "Concluído",
  "finalizado": "Concluído",
  "feito": "Concluído",
  "cancelado": "Cancelado",
  "cancelled": "Cancelado",
};

const COL_COLORS: Record<string, string> = {
  "A Fazer": "bg-gray-100 border-gray-300",
  "Em Andamento": "bg-blue-50 border-blue-300",
  "Bloqueado": "bg-red-50 border-red-300",
  "Concluído": "bg-green-50 border-green-300",
  "Cancelado": "bg-gray-50 border-gray-200",
  "Sem status": "bg-amber-50 border-amber-200",
};

const COL_DOT: Record<string, string> = {
  "A Fazer": "bg-gray-500",
  "Em Andamento": "bg-blue-500",
  "Bloqueado": "bg-red-500",
  "Concluído": "bg-green-500",
  "Cancelado": "bg-gray-400",
  "Sem status": "bg-amber-500",
};

function bucketize(status: string | null): string {
  if (!status) return "Sem status";
  return STATUS_BUCKETS[status.toLowerCase().trim()] ?? "A Fazer";
}

export function Kanban({ tarefas, readOnly = false }: KanbanProps) {
  // Estado local para mover cards de forma otimista
  const [itens, setItens] = useState<PaTarefa[]>(tarefas);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);

  useEffect(() => setItens(tarefas), [tarefas]);

  // Sempre mostra as 4 colunas principais (mesmo vazias) para servir de alvo
  const buckets = useMemo(() => {
    const map = new Map<string, PaTarefa[]>();
    for (const t of itens) {
      const b = bucketize(t.status);
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(t);
    }
    const ordered: { nome: string; tarefas: PaTarefa[] }[] = [];
    const ordemFixa = ["A Fazer", "Em Andamento", "Bloqueado", "Concluído", "Cancelado", "Sem status"];
    for (const nome of ordemFixa) {
      // colunas drop-target sempre presentes; Cancelado/Sem status só se tiverem itens
      const principal = ["A Fazer", "Em Andamento", "Bloqueado", "Concluído"].includes(nome);
      if (map.has(nome) || principal) {
        ordered.push({ nome, tarefas: map.get(nome) ?? [] });
      }
    }
    return ordered;
  }, [itens]);

  async function soltarEm(bucket: string) {
    const id = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (id == null) return;
    const novoStatus = BUCKET_TO_STATUS[bucket];
    if (!novoStatus) return;
    const atual = itens.find((t) => t.id === id);
    if (!atual || bucketize(atual.status) === bucket) return;

    const anterior = itens;
    // otimista
    setItens((prev) => prev.map((t) => (t.id === id ? { ...t, status: novoStatus } : t)));
    try {
      await paApi.atualizarStatusTarefa(id, novoStatus);
    } catch {
      setItens(anterior); // reverte em erro
    }
  }

  if (itens.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic p-4 text-center">
        Sem tarefas pra Kanban.
      </div>
    );
  }

  return (
    <div>
      {!readOnly && (
        <p className="text-[11px] text-muted-foreground mb-2">
          Arraste os cards entre as colunas para mudar o status.
        </p>
      )}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3 min-w-max">
          {buckets.map((col) => {
            const dropavel = !readOnly && col.nome in BUCKET_TO_STATUS;
            return (
              <div key={col.nome} className="w-72 flex-shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${COL_DOT[col.nome] ?? "bg-gray-400"}`} />
                    <h3 className="font-bold text-xs uppercase tracking-wider">{col.nome}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{col.tarefas.length}</Badge>
                </div>
                <div
                  onDragOver={(e) => {
                    if (!dropavel) return;
                    e.preventDefault();
                    setAlvo(col.nome);
                  }}
                  onDragLeave={() => setAlvo((a) => (a === col.nome ? null : a))}
                  onDrop={() => dropavel && soltarEm(col.nome)}
                  className={`space-y-2 min-h-[100px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                    alvo === col.nome ? "border-brand-teal bg-brand-teal/10" : COL_COLORS[col.nome] ?? "bg-gray-50 border-gray-200"
                  }`}
                >
                  {col.tarefas.map((t) => (
                    <KanbanCard
                      key={t.id}
                      tarefa={t}
                      draggable={!readOnly}
                      onDragStart={() => setArrastando(t.id)}
                      onDragEnd={() => { setArrastando(null); setAlvo(null); }}
                    />
                  ))}
                  {col.tarefas.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/60 text-center pt-3">
                      {dropavel ? "solte aqui" : "vazio"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({
  tarefa, draggable, onDragStart, onDragEnd,
}: {
  tarefa: PaTarefa;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const isAtrasada = tarefa.data_fim
    ? new Date(tarefa.data_fim) < new Date() && !/concluido|concluído|done/i.test(tarefa.status || "")
    : false;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-md p-2 border border-gray-200 hover:shadow-sm transition-shadow space-y-1 ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex items-start gap-1.5">
        {tarefa.eap_codigo && (
          <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1 rounded">{tarefa.eap_codigo}</span>
        )}
        <p className="text-xs font-medium flex-1 min-w-0 line-clamp-2">{tarefa.descricao}</p>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="truncate">{tarefa.responsavel_pessoa || tarefa.area_responsavel || "—"}</span>
        {tarefa.data_fim && (
          <span className={isAtrasada ? "text-destructive font-bold" : ""}>
            {new Date(tarefa.data_fim).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      {tarefa.pct_concluido != null && (
        <div className="h-1 bg-muted rounded overflow-hidden">
          <div className="h-full bg-brand-teal" style={{ width: `${tarefa.pct_concluido}%` }} />
        </div>
      )}
    </div>
  );
}
