"use client";

import { useMemo } from "react";
import type { PaTarefa } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface KanbanProps {
  tarefas: PaTarefa[];
  /** Colunas em ordem; se nao especificado, gera dinamicamente */
  colunas?: string[];
}

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

export function Kanban({ tarefas }: KanbanProps) {
  const buckets = useMemo(() => {
    const map = new Map<string, PaTarefa[]>();
    for (const t of tarefas) {
      const b = bucketize(t.status);
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(t);
    }
    // Ordem fixa dos buckets principais
    const ordered: { nome: string; tarefas: PaTarefa[] }[] = [];
    const ordemFixa = ["A Fazer", "Em Andamento", "Bloqueado", "Concluído", "Cancelado", "Sem status"];
    for (const nome of ordemFixa) {
      if (map.has(nome)) {
        ordered.push({ nome, tarefas: map.get(nome)! });
      }
    }
    return ordered;
  }, [tarefas]);

  if (tarefas.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic p-4 text-center">
        Sem tarefas pra Kanban.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {buckets.map((col) => (
          <div key={col.nome} className="w-72 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${COL_DOT[col.nome] ?? "bg-gray-400"}`} />
                <h3 className="font-bold text-xs uppercase tracking-wider">{col.nome}</h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">{col.tarefas.length}</Badge>
            </div>
            <div className={`space-y-2 min-h-[100px] p-2 rounded-lg border-2 border-dashed ${COL_COLORS[col.nome] ?? "bg-gray-50 border-gray-200"}`}>
              {col.tarefas.map((t) => (
                <KanbanCard key={t.id} tarefa={t} />
              ))}
              {col.tarefas.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 text-center pt-3">vazio</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ tarefa }: { tarefa: PaTarefa }) {
  const isAtrasada = tarefa.data_fim
    ? new Date(tarefa.data_fim) < new Date() && !/concluido|concluído|done/i.test(tarefa.status || "")
    : false;

  return (
    <div className="bg-white rounded-md p-2 border border-gray-200 hover:shadow-sm transition-shadow space-y-1">
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
