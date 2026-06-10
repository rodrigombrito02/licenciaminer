"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { type Bowtie } from "@/lib/riscos-api";

const COL_CAUSA_X = 0;
const COL_BARREIRA_WIDTH = 220;
const COL_CONSEQ_OFFSET = 280;
const ROW_HEIGHT = 160;

type BowtieXPCanvasProps = {
  bowtie: Bowtie;
  acoesPreventivasCount?: number;
  acoesCorretivasCount?: number;
};

interface NodeData {
  label: string;
  code?: string;
  efetividade?: number | null;
  critica?: boolean;
  alerta?: boolean;
  [key: string]: unknown;
}

function CausaNode({ data }: NodeProps) {
  const d = data as NodeData;
  const border = d.critica ? "border-red-500" : "border-blue-500";
  const bg = d.critica ? "bg-red-50" : "bg-blue-50";
  return (
    <div
      className={`rounded-lg border-2 ${border} ${bg} p-2 text-xs shadow-sm`}
      style={{ width: 200 }}
    >
      <div className="flex items-center justify-between">
        <div className={`text-[10px] font-semibold ${d.critica ? "text-red-700" : "text-blue-700"}`}>
          {d.code ?? "Causa"}
        </div>
        {d.critica && (
          <span className="rounded bg-red-500 px-1 text-[8px] font-bold uppercase text-white">
            {d.alerta ? "⚠ CRÍTICA" : "CRÍTICA"}
          </span>
        )}
      </div>
      <div className="line-clamp-3 text-foreground">{d.label}</div>
      {d.alerta && (
        <div className="mt-1 rounded bg-red-500 px-1 text-center text-[9px] font-semibold uppercase text-white">
          Sem controle nem ação
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function ConsequenciaNode({ data }: NodeProps) {
  const d = data as NodeData;
  const border = d.critica ? "border-red-700" : "border-red-500";
  const bg = d.critica ? "bg-red-100" : "bg-red-50";
  return (
    <div
      className={`rounded-lg border-2 ${border} ${bg} p-2 text-xs shadow-sm`}
      style={{ width: 200 }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold text-red-700">
          {d.code ?? "Consequência"}
        </div>
        {d.critica && (
          <span className="rounded bg-red-600 px-1 text-[8px] font-bold uppercase text-white">
            {d.alerta ? "⚠ CRÍTICA" : "CRÍTICA"}
          </span>
        )}
      </div>
      <div className="line-clamp-3 text-foreground">{d.label}</div>
      {d.alerta && (
        <div className="mt-1 rounded bg-red-600 px-1 text-center text-[9px] font-semibold uppercase text-white">
          Sem controle nem ação
        </div>
      )}
    </div>
  );
}

function BarreiraPrevNode({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className="rounded-md border border-emerald-500 bg-emerald-50 p-2 text-[11px] shadow-sm"
      style={{ width: 180 }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1 text-emerald-700">
        <span>🛡️</span>
        <span className="text-[9px] font-semibold uppercase">Preventiva</span>
        {d.efetividade != null && (
          <span className="ml-auto rounded bg-emerald-200 px-1 text-[9px] font-bold">
            Ef. {String(d.efetividade)}
          </span>
        )}
      </div>
      <div className="line-clamp-2 text-foreground">{d.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function BarreiraCorrNode({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className="rounded-md border border-orange-500 bg-orange-50 p-2 text-[11px] shadow-sm"
      style={{ width: 180 }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1 text-orange-700">
        <span>🛡️</span>
        <span className="text-[9px] font-semibold uppercase">Corretiva</span>
        {d.efetividade != null && (
          <span className="ml-auto rounded bg-orange-200 px-1 text-[9px] font-bold">
            Ef. {String(d.efetividade)}
          </span>
        )}
      </div>
      <div className="line-clamp-2 text-foreground">{d.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function TopEventNode({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className="flex flex-col items-center justify-center rounded-full border-4 border-amber-500 bg-amber-100 p-3 text-center font-semibold shadow-md"
      style={{ width: 200, height: 200 }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-[9px] uppercase tracking-widest text-amber-700">Top Event</div>
      <div className="mt-1 line-clamp-5 text-xs text-foreground">{d.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  causa: CausaNode,
  consequencia: ConsequenciaNode,
  barreiraPrev: BarreiraPrevNode,
  barreiraCorr: BarreiraCorrNode,
  topEvent: TopEventNode,
};

function buildGraph(
  bowtie: Bowtie,
  acoesPrev: number,
  acoesCorr: number,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const maxPrevBarriers = Math.max(
    1,
    ...bowtie.causas.map((c) => c.barreiras.length),
  );
  const maxCorrBarriers = Math.max(
    1,
    ...bowtie.consequencias.map((q) => q.barreiras.length),
  );

  const topEventX = COL_CAUSA_X + 220 + maxPrevBarriers * COL_BARREIRA_WIDTH + 40;
  const totalRows = Math.max(bowtie.causas.length, bowtie.consequencias.length, 1);
  const topEventY = ((totalRows - 1) * ROW_HEIGHT) / 2;

  nodes.push({
    id: "top-event",
    type: "topEvent",
    position: { x: topEventX, y: topEventY },
    data: { label: bowtie.top_event ?? "Top Event" },
    draggable: true,
  });

  bowtie.causas.forEach((c, rowIdx) => {
    const y = rowIdx * ROW_HEIGHT;
    const causaId = `causa-${c.id}`;
    const causaAlerta = c.critica && c.barreiras.length === 0 && acoesPrev === 0;
    nodes.push({
      id: causaId,
      type: "causa",
      position: { x: COL_CAUSA_X, y },
      data: {
        label: c.descricao,
        code: c.codigo,
        critica: c.critica,
        alerta: causaAlerta,
      },
      draggable: true,
    });
    let prevNode = causaId;
    c.barreiras.forEach((b, bIdx) => {
      const bid = `bp-${b.id}`;
      nodes.push({
        id: bid,
        type: "barreiraPrev",
        position: { x: COL_CAUSA_X + 230 + bIdx * COL_BARREIRA_WIDTH, y: y + 30 },
        data: { label: b.descricao, efetividade: b.efetividade },
        draggable: true,
      });
      edges.push({
        id: `e-${prevNode}-${bid}`,
        source: prevNode,
        target: bid,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
      });
      prevNode = bid;
    });
    edges.push({
      id: `e-${prevNode}-top`,
      source: prevNode,
      target: "top-event",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
    });
  });

  bowtie.consequencias.forEach((q, rowIdx) => {
    const y = rowIdx * ROW_HEIGHT;
    const startX = topEventX + 220 + COL_CONSEQ_OFFSET;
    const consequenciaId = `cons-${q.id}`;
    const consX = startX + maxCorrBarriers * COL_BARREIRA_WIDTH;
    const consAlerta = q.critica && q.barreiras.length === 0 && acoesCorr === 0;
    nodes.push({
      id: consequenciaId,
      type: "consequencia",
      position: { x: consX, y },
      data: {
        label: q.descricao,
        code: q.codigo,
        critica: q.critica,
        alerta: consAlerta,
      },
      draggable: true,
    });
    let prevNode: string = "top-event";
    q.barreiras.forEach((b, bIdx) => {
      const bid = `bc-${b.id}`;
      nodes.push({
        id: bid,
        type: "barreiraCorr",
        position: { x: startX + bIdx * COL_BARREIRA_WIDTH, y: y + 30 },
        data: { label: b.descricao, efetividade: b.efetividade },
        draggable: true,
      });
      edges.push({
        id: `e-${prevNode}-${bid}`,
        source: prevNode,
        target: bid,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
      });
      prevNode = bid;
    });
    edges.push({
      id: `e-${prevNode}-${consequenciaId}`,
      source: prevNode,
      target: consequenciaId,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
    });
  });

  return { nodes, edges };
}

export function BowtieXPCanvas({
  bowtie,
  acoesPreventivasCount = 0,
  acoesCorretivasCount = 0,
}: BowtieXPCanvasProps) {
  const { nodes, edges } = useMemo(
    () => buildGraph(bowtie, acoesPreventivasCount, acoesCorretivasCount),
    [bowtie, acoesPreventivasCount, acoesCorretivasCount],
  );

  return (
    <div className="h-[700px] w-full rounded-md border border-border bg-white">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e5e7eb" gap={24} />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
