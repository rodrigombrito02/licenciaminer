"use client";

import { useState } from "react";
import { AlertTriangle, Flame, Plus, Trash2, Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Barreira,
  type Bowtie,
  type Causa,
  type Consequencia,
} from "@/lib/riscos-api";

interface Props {
  bowtie: Bowtie;
  onUpdateBowtie: (patch: { top_event?: string; frequencia_pura?: number | null; frequencia_residual?: number | null }) => Promise<void>;
  onAddCausa: () => Promise<void>;
  onUpdateCausa: (causaId: number, patch: { codigo?: string; descricao?: string; critica?: boolean }) => Promise<void>;
  onDeleteCausa: (causaId: number) => Promise<void>;
  onAddBarreiraPrev: (causaId: number) => Promise<void>;
  onUpdateBarreiraPrev: (id: number, patch: { descricao?: string; efetividade?: number | null }) => Promise<void>;
  onDeleteBarreiraPrev: (id: number) => Promise<void>;
  onAddConsequencia: () => Promise<void>;
  onUpdateConsequencia: (id: number, patch: { codigo?: string; descricao?: string; critica?: boolean }) => Promise<void>;
  onDeleteConsequencia: (id: number) => Promise<void>;
  onAddBarreiraCorr: (consequenciaId: number) => Promise<void>;
  onUpdateBarreiraCorr: (id: number, patch: { descricao?: string; efetividade?: number | null }) => Promise<void>;
  onDeleteBarreiraCorr: (id: number) => Promise<void>;
  acoesPreventivasCount?: number;
  acoesCorretivasCount?: number;
}

const NIVEIS = [1, 2, 3, 4, 5];

export function BowtieForm({
  bowtie,
  onUpdateBowtie,
  onAddCausa,
  onUpdateCausa,
  onDeleteCausa,
  onAddBarreiraPrev,
  onUpdateBarreiraPrev,
  onDeleteBarreiraPrev,
  onAddConsequencia,
  onUpdateConsequencia,
  onDeleteConsequencia,
  onAddBarreiraCorr,
  onUpdateBarreiraCorr,
  onDeleteBarreiraCorr,
  acoesPreventivasCount = 0,
  acoesCorretivasCount = 0,
}: Props) {
  return (
    <div className="space-y-4">
      <TopEventCard bowtie={bowtie} onUpdate={onUpdateBowtie} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Shield className="mr-1 inline h-3.5 w-3.5" />
              Ameaças e barreiras preventivas ({bowtie.causas.length})
            </h3>
            <Button size="sm" variant="outline" onClick={onAddCausa}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Nova causa
            </Button>
          </div>
          <div className="space-y-2">
            {bowtie.causas.map((c) => (
              <CausaCard
                key={c.id}
                causa={c}
                onUpdate={(patch) => onUpdateCausa(c.id, patch)}
                onDelete={() => onDeleteCausa(c.id)}
                onAddBarreira={() => onAddBarreiraPrev(c.id)}
                onUpdateBarreira={onUpdateBarreiraPrev}
                onDeleteBarreira={onDeleteBarreiraPrev}
                acoesPreventivasCount={acoesPreventivasCount}
              />
            ))}
            {bowtie.causas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma causa cadastrada. Clique em "Nova causa" para começar.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
              Consequências e barreiras corretivas ({bowtie.consequencias.length})
            </h3>
            <Button size="sm" variant="outline" onClick={onAddConsequencia}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Nova consequência
            </Button>
          </div>
          <div className="space-y-2">
            {bowtie.consequencias.map((q) => (
              <ConsequenciaCard
                key={q.id}
                consequencia={q}
                onUpdate={(patch) => onUpdateConsequencia(q.id, patch)}
                onDelete={() => onDeleteConsequencia(q.id)}
                onAddBarreira={() => onAddBarreiraCorr(q.id)}
                onUpdateBarreira={onUpdateBarreiraCorr}
                onDeleteBarreira={onDeleteBarreiraCorr}
                acoesCorretivasCount={acoesCorretivasCount}
              />
            ))}
            {bowtie.consequencias.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma consequência cadastrada.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TopEventCard({
  bowtie,
  onUpdate,
}: {
  bowtie: Bowtie;
  onUpdate: Props["onUpdateBowtie"];
}) {
  const [topEvent, setTopEvent] = useState(bowtie.top_event ?? "");
  return (
    <div
      className="rounded-lg border-2 border-amber-400 bg-amber-500/10 p-3"
      style={{ backgroundColor: "#fef3c730" }}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
        Top Event
      </div>
      <textarea
        className="min-h-[50px] w-full resize-y rounded-md border border-amber-400/50 bg-background/60 px-3 py-2 text-sm font-medium"
        value={topEvent}
        onChange={(e) => setTopEvent(e.target.value)}
        onBlur={() =>
          topEvent !== (bowtie.top_event ?? "") && onUpdate({ top_event: topEvent })
        }
        placeholder="Evento central do bowtie (ex: Perda da Licença Social)"
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <FreqSelect
          label="Frequência pura (sem controles)"
          value={bowtie.frequencia_pura}
          onChange={(v) => onUpdate({ frequencia_pura: v })}
        />
        <FreqSelect
          label="Frequência residual (com controles)"
          value={bowtie.frequencia_residual}
          onChange={(v) => onUpdate({ frequencia_residual: v })}
        />
      </div>
    </div>
  );
}

function FreqSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">
        {label}
      </label>
      <Select
        value={value == null ? "none" : String(value)}
        onValueChange={(v) => onChange(v === "none" ? null : Number(v))}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {NIVEIS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CausaCard({
  causa,
  onUpdate,
  onDelete,
  onAddBarreira,
  onUpdateBarreira,
  onDeleteBarreira,
  acoesPreventivasCount,
}: {
  causa: Causa;
  onUpdate: (patch: { codigo?: string; descricao?: string; critica?: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddBarreira: () => Promise<void>;
  onUpdateBarreira: (
    id: number,
    patch: { descricao?: string; efetividade?: number | null },
  ) => Promise<void>;
  onDeleteBarreira: (id: number) => Promise<void>;
  acoesPreventivasCount: number;
}) {
  const semTratamento =
    causa.critica && causa.barreiras.length === 0 && acoesPreventivasCount === 0;

  return (
    <div
      className={`rounded-lg border p-3 ${
        causa.critica
          ? "border-red-500/60 bg-red-500/5"
          : "border-blue-500/30 bg-blue-500/5"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUpdate({ critica: !causa.critica })}
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase transition ${
            causa.critica
              ? "bg-red-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
          title={causa.critica ? "Clique para remover marca de crítica" : "Marcar como crítica"}
        >
          <Flame className="h-3 w-3" /> {causa.critica ? "Crítica" : "marcar crítica"}
        </button>
        {semTratamento && (
          <span className="inline-flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
            <AlertTriangle className="h-3 w-3" /> Sem controle nem ação
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        <InlineInput
          className="w-16 font-mono text-xs"
          value={causa.codigo}
          onBlur={(v) => v !== causa.codigo && onUpdate({ codigo: v })}
        />
        <InlineTextarea
          className="flex-1 text-sm"
          value={causa.descricao}
          onBlur={(v) => v !== causa.descricao && onUpdate({ descricao: v })}
        />
        <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 px-2">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
      <div className="mt-2 space-y-1 pl-4">
        {causa.barreiras.map((b) => (
          <BarreiraRow
            key={b.id}
            barreira={b}
            onUpdate={(patch) => onUpdateBarreira(b.id, patch)}
            onDelete={() => onDeleteBarreira(b.id)}
          />
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={onAddBarreira}
        >
          <Plus className="mr-1 h-3 w-3" /> Barreira preventiva
        </Button>
      </div>
    </div>
  );
}

function ConsequenciaCard({
  consequencia,
  onUpdate,
  onDelete,
  onAddBarreira,
  onUpdateBarreira,
  onDeleteBarreira,
  acoesCorretivasCount,
}: {
  consequencia: Consequencia;
  onUpdate: (patch: { codigo?: string; descricao?: string; critica?: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddBarreira: () => Promise<void>;
  onUpdateBarreira: (
    id: number,
    patch: { descricao?: string; efetividade?: number | null },
  ) => Promise<void>;
  onDeleteBarreira: (id: number) => Promise<void>;
  acoesCorretivasCount: number;
}) {
  const semTratamento =
    consequencia.critica &&
    consequencia.barreiras.length === 0 &&
    acoesCorretivasCount === 0;

  return (
    <div
      className={`rounded-lg border p-3 ${
        consequencia.critica
          ? "border-red-600/70 bg-red-600/10"
          : "border-red-500/30 bg-red-500/5"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUpdate({ critica: !consequencia.critica })}
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase transition ${
            consequencia.critica
              ? "bg-red-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
          title={
            consequencia.critica
              ? "Clique para remover marca de crítica"
              : "Marcar como crítica"
          }
        >
          <Flame className="h-3 w-3" />
          {consequencia.critica ? "Crítica" : "marcar crítica"}
        </button>
        {semTratamento && (
          <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
            <AlertTriangle className="h-3 w-3" /> Sem controle nem ação
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        <InlineInput
          className="w-16 font-mono text-xs"
          value={consequencia.codigo}
          onBlur={(v) => v !== consequencia.codigo && onUpdate({ codigo: v })}
        />
        <InlineTextarea
          className="flex-1 text-sm"
          value={consequencia.descricao}
          onBlur={(v) => v !== consequencia.descricao && onUpdate({ descricao: v })}
        />
        <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 px-2">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
      <div className="mt-2 space-y-1 pl-4">
        {consequencia.barreiras.map((b) => (
          <BarreiraRow
            key={b.id}
            barreira={b}
            onUpdate={(patch) => onUpdateBarreira(b.id, patch)}
            onDelete={() => onDeleteBarreira(b.id)}
          />
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={onAddBarreira}
        >
          <Plus className="mr-1 h-3 w-3" /> Barreira corretiva
        </Button>
      </div>
    </div>
  );
}

function BarreiraRow({
  barreira,
  onUpdate,
  onDelete,
}: {
  barreira: Barreira;
  onUpdate: (patch: { descricao?: string; efetividade?: number | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-border/50 bg-background/70 px-2 py-1">
      <div className="text-[10px] font-semibold text-muted-foreground">🛡️</div>
      <InlineInput
        className="flex-1 text-xs"
        value={barreira.descricao}
        onBlur={(v) => v !== barreira.descricao && onUpdate({ descricao: v })}
      />
      <Select
        value={barreira.efetividade == null ? "none" : String(barreira.efetividade)}
        onValueChange={(v) => onUpdate({ efetividade: v === "none" ? null : Number(v) })}
      >
        <SelectTrigger className="h-7 w-16 text-[11px]">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {NIVEIS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              Ef. {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="ghost" onClick={onDelete} className="h-6 w-6 px-0">
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}

function InlineInput({
  value,
  onBlur,
  className,
}: {
  value: string;
  onBlur: (v: string) => void;
  className?: string;
}) {
  const [v, setV] = useState(value);
  return (
    <Input
      className={className}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onBlur(v)}
    />
  );
}

function InlineTextarea({
  value,
  onBlur,
  className,
}: {
  value: string;
  onBlur: (v: string) => void;
  className?: string;
}) {
  const [v, setV] = useState(value);
  return (
    <textarea
      className={`min-h-[32px] resize-y rounded-md border border-input bg-background px-2 py-1 text-sm ${className ?? ""}`}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onBlur(v)}
    />
  );
}
