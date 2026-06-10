"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import { fetchSnapshotDetalhe, type SnapshotDetalhe } from "@/lib/corporativo-api";

export default function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const [snap, setSnap] = useState<SnapshotDetalhe | null>(null);

  useEffect(() => {
    fetchSnapshotDetalhe(id).then(setSnap);
  }, [id]);

  if (!snap) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-muted-foreground">
          <Link href="/riscos-corporativos/snapshots" className="hover:underline">
            Snapshots
          </Link>{" "}
          / {snap.periodo ?? snap.data_snapshot}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{snap.titulo}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Data: <strong>{snap.data_snapshot}</strong></span>
          <span>Escopo: <strong>{snap.tipo_escopo}</strong></span>
          <span>Gerado por: <strong>{snap.gerado_por ?? "—"}</strong></span>
          <span>Itens: <strong>{snap.n_itens}</strong></span>
        </div>
      </header>

      {snap.observacoes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{snap.observacoes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">#</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead className="text-center">P × I</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="text-right">Ações abertas</TableHead>
                <TableHead className="text-right">Atrasadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snap.itens.map((it) => (
                <TableRow key={it.risco_id}>
                  <TableCell className="text-center font-bold">{it.posicao}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/gestao-riscos/riscos/${it.risco_id}`}
                      className="hover:underline"
                    >
                      {it.risco_codigo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/gestao-riscos/riscos/${it.risco_id}`}
                      className="hover:underline"
                    >
                      {it.risco_nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {it.prob_residual ?? "—"} × {it.impacto_residual ?? "—"}
                  </TableCell>
                  <TableCell className="text-center font-bold">{it.score ?? "—"}</TableCell>
                  <TableCell>
                    <ClassificacaoBadge value={it.classificacao_residual} />
                  </TableCell>
                  <TableCell className="text-right text-xs">{it.acoes_abertas}</TableCell>
                  <TableCell
                    className={`text-right text-xs ${
                      it.acoes_atrasadas > 0 ? "text-red-600 font-semibold" : ""
                    }`}
                  >
                    {it.acoes_atrasadas}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
