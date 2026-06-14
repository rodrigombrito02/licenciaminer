"use client";

/**
 * Painel de acesso reutilizável para cards internos (mapeamentos, oportunidades,
 * projetos...). Define líder-responsável + quem pode ver/editar entre os membros
 * internos da Summo. Só o criador/líder/admin podem alterar.
 */

import { useEffect, useState } from "react";
import { Shield, Loader2, Save, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/multi-select";
import { fetchMembros, type CardAcl, type MembroSummo } from "@/lib/card-acl";

interface Props {
  lider: string | null;
  criador: string | null;
  acl: CardAcl | null;
  /** Pode alterar a configuração (criador/líder/admin). */
  podeGerenciar: boolean;
  onSave: (data: { lider_responsavel: string; acl: CardAcl }) => Promise<void> | void;
}

export function CardAcessoPanel({ lider, criador, acl, podeGerenciar, onSave }: Props) {
  const [membros, setMembros] = useState<MembroSummo[]>([]);
  const [liderSel, setLiderSel] = useState(lider ?? "");
  const [podeVer, setPodeVer] = useState<string[]>(acl?.pode_ver ?? []);
  const [podeEditar, setPodeEditar] = useState<string[]>(acl?.pode_editar ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembros().then((ms) => {
      setMembros(ms);
      // Padrão: todos selecionados quando não há restrição salva.
      const todos = ms.map((m) => m.nome);
      setPodeVer((cur) => (cur.length ? cur : todos));
      setPodeEditar((cur) => (cur.length ? cur : todos));
    });
  }, []);

  const nomes = membros.map((m) => m.nome);

  async function salvar() {
    setSaving(true);
    try {
      // Se tudo está selecionado, salva vazio (= todos) para não marcar como restrito.
      const verFinal = podeVer.length === nomes.length ? [] : podeVer;
      const editarFinal = podeEditar.length === nomes.length ? [] : podeEditar;
      await onSave({
        lider_responsavel: liderSel || (criador ?? ""),
        acl: { pode_ver: verFinal, pode_editar: editarFinal },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand-teal" /> Acesso
        </h3>

        {criador && (
          <p className="text-[11px] text-muted-foreground">
            Criado por <span className="font-semibold">{criador}</span>
          </p>
        )}

        {!podeGerenciar ? (
          <div className="rounded-lg bg-muted/40 p-3 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              Apenas o criador, o líder ou um admin podem alterar o acesso.
              Líder atual: <span className="font-semibold">{lider || "—"}</span>.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold block mb-1">Líder responsável</label>
              <Select value={liderSel} onValueChange={setLiderSel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolher líder" /></SelectTrigger>
                <SelectContent>
                  {nomes.map((n) => (
                    <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">
                Pode ver <span className="font-normal text-muted-foreground">(vazio = todos da Summo)</span>
              </label>
              <MultiSelect options={nomes} selected={podeVer} onChange={setPodeVer} placeholder="Todos" />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">
                Pode editar <span className="font-normal text-muted-foreground">(vazio = todos)</span>
              </label>
              <MultiSelect options={nomes} selected={podeEditar} onChange={setPodeEditar} placeholder="Todos" />
            </div>

            <Button size="sm" variant="outline" className="w-full" onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar acesso
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
