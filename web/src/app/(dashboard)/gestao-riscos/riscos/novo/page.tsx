"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  criarRisco,
  fetchCadeiaValor,
  fetchCategorias,
  fetchPessoas,
  fetchUnidadesOrg,
  type Categoria,
  type EloCadeiaValor,
  type Pessoa,
  type RiscoInput,
  type UnidadeOrg,
} from "@/lib/riscos-api";

const ESTAGIOS = [
  { value: "aprovacao", label: "Aprovação do Projeto" },
  { value: "implantacao", label: "Implantação e Transição" },
  { value: "operacao", label: "Operação" },
];

const NIVEIS = [1, 2, 3, 4, 5];

function nullableNumber(v: string): number | null | undefined {
  if (v === "" || v === "none") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function NovoRiscoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOrg[]>([]);
  const [elos, setElos] = useState<EloCadeiaValor[]>([]);

  const [form, setForm] = useState<RiscoInput>({
    codigo: "",
    nome: "",
    descricao: "",
    estagio: undefined,
    categoria_id: null,
    responsavel_id: null,
    unidade_org_id: null,
    elo_cadeia_valor_id: null,
    prob_pura: null,
    impacto_pura: null,
    prob_residual: null,
    impacto_residual: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [c, p, u, e] = await Promise.all([
        fetchCategorias(),
        fetchPessoas(),
        fetchUnidadesOrg(),
        fetchCadeiaValor(),
      ]);
      setCategorias(c);
      setPessoas(p);
      setUnidades(u);
      setElos(e);
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo || !form.nome) {
      setError("Código e nome são obrigatórios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const novo = await criarRisco(form);
      router.push(`/gestao-riscos/riscos/${novo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo risco</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre um risco. A classificação P×I é calculada automaticamente usando a
            metodologia ativa.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/gestao-riscos/riscos">Cancelar</Link>
        </Button>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Código *">
              <Input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="Ex.: R.EST.01"
              />
            </Field>
            <Field label="Estágio">
              <Select
                value={form.estagio ?? "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, estagio: v === "none" ? undefined : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {ESTAGIOS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nome do risco *" full>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Perda/não obtenção da Licença Social"
              />
            </Field>
            <Field label="Descrição" full>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.descricao ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Contextualização, eventos causais, impactos previstos…"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contexto</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Categoria">
              <Select
                value={form.categoria_id ? String(form.categoria_id) : "none"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    categoria_id: v === "none" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Responsável">
              <Select
                value={form.responsavel_id ? String(form.responsavel_id) : "none"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    responsavel_id: v === "none" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome} {p.cargo ? `· ${p.cargo}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Unidade organizacional">
              <Select
                value={form.unidade_org_id ? String(form.unidade_org_id) : "none"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    unidade_org_id: v === "none" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {"·".repeat(u.nivel)} {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Elo da cadeia de valor">
              <Select
                value={
                  form.elo_cadeia_valor_id ? String(form.elo_cadeia_valor_id) : "none"
                }
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    elo_cadeia_valor_id: v === "none" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {elos.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      [{e.tipo}] {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avaliação P × I</CardTitle>
            <p className="text-xs text-muted-foreground">
              Escala 1–5 (1 = muito baixa, 5 = muito alta). A classificação é calculada
              automaticamente.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <NivelSelect
              label="Probabilidade pura"
              value={form.prob_pura}
              onChange={(v) => setForm((f) => ({ ...f, prob_pura: v }))}
            />
            <NivelSelect
              label="Impacto puro"
              value={form.impacto_pura}
              onChange={(v) => setForm((f) => ({ ...f, impacto_pura: v }))}
            />
            <NivelSelect
              label="Probabilidade residual"
              value={form.prob_residual}
              onChange={(v) => setForm((f) => ({ ...f, prob_residual: v }))}
            />
            <NivelSelect
              label="Impacto residual"
              value={form.impacto_residual}
              onChange={(v) => setForm((f) => ({ ...f, impacto_residual: v }))}
            />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/gestao-riscos/riscos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar risco"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function NivelSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <Field label={label}>
      <Select
        value={value == null ? "none" : String(value)}
        onValueChange={(v) => onChange(nullableNumber(v) ?? null)}
      >
        <SelectTrigger>
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
    </Field>
  );
}
