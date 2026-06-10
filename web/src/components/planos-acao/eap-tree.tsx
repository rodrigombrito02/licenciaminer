"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { PaTarefa } from "@/lib/api";

interface Node {
  tarefa: PaTarefa | null;
  codigo: string;
  filhos: Node[];
}

function buildTree(tarefas: PaTarefa[]): Node[] {
  const byCode: Record<string, Node> = {};
  const semCodigo: Node[] = [];

  for (const t of tarefas) {
    if (!t.eap_codigo) {
      semCodigo.push({ tarefa: t, codigo: "·", filhos: [] });
      continue;
    }
    byCode[t.eap_codigo] = { tarefa: t, codigo: t.eap_codigo, filhos: [] };
  }

  const roots: Node[] = [];
  for (const code of Object.keys(byCode)) {
    const node = byCode[code];
    const parent = node.tarefa?.parent_eap;
    if (parent && byCode[parent]) {
      byCode[parent].filhos.push(node);
    } else {
      roots.push(node);
    }
  }

  // sort por código
  function sortRec(nodes: Node[]) {
    nodes.sort((a, b) => {
      const aa = a.codigo.split(".").map(Number);
      const bb = b.codigo.split(".").map(Number);
      for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
        const ai = aa[i] ?? 0;
        const bi = bb[i] ?? 0;
        if (ai !== bi) return ai - bi;
      }
      return 0;
    });
    nodes.forEach(n => sortRec(n.filhos));
  }
  sortRec(roots);

  return [...roots, ...semCodigo];
}

interface EapTreeProps {
  tarefas: PaTarefa[];
}

export function EapTree({ tarefas }: EapTreeProps) {
  const tree = useMemo(() => buildTree(tarefas), [tarefas]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(codigo: string) {
    setExpanded(prev => ({ ...prev, [codigo]: !prev[codigo] }));
  }

  if (tree.length === 0) {
    return <div className="text-xs text-muted-foreground italic p-4">Sem tarefas para árvore EAP</div>;
  }

  return (
    <div className="text-xs">
      {tree.map((n, i) => (
        <NodeRow key={`${n.codigo}-${i}`} node={n} depth={0} expanded={expanded} onToggle={toggle} />
      ))}
    </div>
  );
}

function NodeRow({
  node, depth, expanded, onToggle,
}: { node: Node; depth: number; expanded: Record<string, boolean>; onToggle: (c: string) => void }) {
  const hasChildren = node.filhos.length > 0;
  const isOpen = expanded[node.codigo] ?? depth < 1; // raízes começam abertas
  const t = node.tarefa;
  return (
    <>
      <div
        className="flex items-center gap-1 py-1 border-b hover:bg-muted/30"
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {hasChildren ? (
          <button onClick={() => onToggle(node.codigo)} className="text-muted-foreground hover:text-brand-teal">
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <span className="font-mono text-[10px] text-muted-foreground w-12 flex-shrink-0">{node.codigo}</span>
        <span className="flex-1 truncate">{t?.descricao || "—"}</span>
        {t?.status && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t.status}</span>
        )}
        {t?.pct_concluido != null && (
          <span className="text-[10px] tabular-nums w-10 text-right text-muted-foreground">
            {t.pct_concluido}%
          </span>
        )}
      </div>
      {hasChildren && isOpen && node.filhos.map((c, i) => (
        <NodeRow key={`${c.codigo}-${i}`} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
}
