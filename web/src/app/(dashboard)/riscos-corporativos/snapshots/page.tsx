"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  criarSnapshot,
  fetchAlertaSnapshot,
  fetchSnapshots,
  type AlertaSnapshot,
  type SnapshotResumo,
} from "@/lib/corporativo-api";

export default function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<SnapshotResumo[]>([]);
  const [alerta, setAlerta] = useState<AlertaSnapshot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = () => {
    fetchSnapshots().then(setSnapshots);
    fetchAlertaSnapshot().then(setAlerta);
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Snapshots Trimestrais — Reporte ao Board
          </h1>
          <p className="text-sm text-muted-foreground">
            Fotografia trimestral dos top-N riscos corporativos para reporte ao Board
            e Comitê de Auditoria. Padrão CVM 586/2017 + COSO ERM para cias listadas.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Novo snapshot</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar snapshot trimestral</DialogTitle>
            </DialogHeader>
            <NovoSnapshotForm
              onSaved={() => {
                setDialogOpen(false);
                reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      {alerta && alerta.alerta && (
        <Card className="border-red-500/60 bg-red-500/5">
          <CardContent className="flex flex-wrap items-center gap-4 py-3">
            <div className="text-2xl">⏰</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-700">
                {alerta.motivo === "nenhum_snapshot"
                  ? "Nenhum snapshot criado ainda"
                  : `Prazo de snapshot vencido: há ${alerta.dias_desde_ultimo} dias desde o último (meta: ${alerta.periodicidade_dias} dias)`}
              </div>
              <p className="text-xs text-muted-foreground">
                Data sugerida para próximo snapshot: {alerta.data_sugerida_proximo}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {alerta && !alerta.alerta && (
        <Card className="border-green-500/60 bg-green-500/5">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="text-xl">✓</div>
            <div className="flex-1 text-sm text-green-700">
              Snapshot atualizado. Próximo previsto em {alerta.dias_restantes} dias ({alerta.data_sugerida_proximo}).
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {snapshots.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Nenhum snapshot ainda.
            </CardContent>
          </Card>
        ) : (
          snapshots.map((s) => (
            <Link
              key={s.id}
              href={`/riscos-corporativos/snapshots/${s.id}`}
              className="block no-underline"
            >
              <Card className="transition hover:border-primary/50">
                <CardContent className="flex items-center gap-3 py-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">{s.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.periodo ?? s.data_snapshot} · {s.gerado_por ?? "—"} · {s.n_itens} riscos
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function NovoSnapshotForm({ onSaved }: { onSaved: () => void }) {
  const hoje = new Date();
  const quarter = Math.floor(hoje.getMonth() / 3) + 1;
  const periodoDefault = `Q${quarter}-${hoje.getFullYear()}`;
  const [titulo, setTitulo] = useState(`Snapshot ${periodoDefault} — Reporte ao Board`);
  const [periodo, setPeriodo] = useState(periodoDefault);
  const [geradoPor, setGeradoPor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await criarSnapshot({
            titulo,
            periodo,
            tipo_escopo: "corporativo",
            gerado_por: geradoPor,
            observacoes: observacoes || undefined,
            top_n: 10,
          });
          onSaved();
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium">Título</label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Período</label>
        <Input
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Q1-2026"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Gerado por</label>
        <Input
          value={geradoPor}
          onChange={(e) => setGeradoPor(e.target.value)}
          placeholder="Ex.: Camila Souza (CRO)"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Observações</label>
        <textarea
          className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Gerando…" : "Gerar snapshot"}
      </Button>
    </form>
  );
}
