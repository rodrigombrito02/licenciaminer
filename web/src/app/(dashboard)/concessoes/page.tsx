"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileSearch,
  Map,
  Search,
  Loader2,
  MapPin,
  Coins,
  X,
  Pickaxe,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/multi-select";
import { Separator } from "@/components/ui/separator";
import { FilterChips } from "@/components/filter-chips";
import { DataTable, columnsFromKeys } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import {
  fetchConcessoes,
  fetchConcessoesStats,
  fetchConcessoesFilters,
  fetchConcessaoDetail,
  concessoesExportUrl,
  type ConcessoesFilters,
  type ConcessoesStats,
  type ConcessoesFilterOptions,
  type ConcessoesResponse,
  fmtNumber,
} from "@/lib/api";
import { fmtBR, fmtHa, fmtReais } from "@/lib/format";
import type { ColumnDef } from "@tanstack/react-table";

const PAGE_SIZE = 100;

const HIDDEN_COLUMNS = new Set([
  "texto_documentos",
  "documentos_pdf",
  "documents_str",
  "processo_norm",
]);

export default function ConcessoesPage() {
  return (
    <Suspense>
      <ConcessoesContent />
    </Suspense>
  );
}

function ConcessoesContent() {
  const params = useSearchParams();
  const [filterOptions, setFilterOptions] = useState<ConcessoesFilterOptions | null>(null);
  const [stats, setStats] = useState<ConcessoesStats | null>(null);
  const [data, setData] = useState<ConcessoesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Filters — restore from URL search params
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [searchInput, setSearchInput] = useState(params.get("search") ?? "");
  const [regime, setRegime] = useState<string[]>(params.getAll("regime"));
  const [categoria, setCategoria] = useState<string[]>(params.getAll("categoria"));
  const [substancia, setSubstancia] = useState<string[]>(params.getAll("substancia"));
  const [municipio, setMunicipio] = useState<string[]>(params.getAll("municipio"));
  const [cfemStatus, setCfemStatus] = useState(params.get("cfem_status") ?? "");
  const [estrategicoOnly, setEstrategicoOnly] = useState(params.get("estrategico") === "1");
  const [uf, setUf] = useState(params.get("uf") ?? "");

  // Detail
  const [selectedProcesso, setSelectedProcesso] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    fetchConcessoesFilters()
      .then(setFilterOptions)
      .catch((e) => setError(e.message));
  }, []);

  const filters: ConcessoesFilters = useMemo(
    () => ({
      search: search || undefined,
      regime: regime.length > 0 ? regime : undefined,
      categoria: categoria.length > 0 ? categoria : undefined,
      substancia: substancia.length > 0 ? substancia : undefined,
      municipio: municipio.length > 0 ? municipio : undefined,
      cfem_status: (cfemStatus || undefined) as ConcessoesFilters["cfem_status"],
      estrategico: estrategicoOnly || undefined,
      uf: uf || undefined,
    }),
    [search, regime, categoria, substancia, municipio, cfemStatus, estrategicoOnly, uf]
  );

  // Sync filters to URL (no re-render)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    regime.forEach((v) => qs.append("regime", v));
    categoria.forEach((v) => qs.append("categoria", v));
    substancia.forEach((v) => qs.append("substancia", v));
    municipio.forEach((v) => qs.append("municipio", v));
    if (cfemStatus) qs.set("cfem_status", cfemStatus);
    if (estrategicoOnly) qs.set("estrategico", "1");
    if (uf) qs.set("uf", uf);
    const q = qs.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
  }, [search, regime, categoria, substancia, municipio, cfemStatus, estrategicoOnly, uf]);

  const loadData = useCallback(
    (pg: number) => {
      setLoading(true);
      setError(null);

      const params: ConcessoesFilters = {
        ...filters,
        limit: PAGE_SIZE,
        offset: pg * PAGE_SIZE,
      };

      Promise.all([
        fetchConcessoes(params),
        fetchConcessoesStats(filters),
      ])
        .then(([concessoesData, statsData]) => {
          setData(concessoesData);
          setStats(statsData);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [filters]
  );

  useEffect(() => {
    loadData(page);
  }, [page, loadData]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setRegime([]);
    setUf("");
    setCategoria([]);
    setSubstancia([]);
    setMunicipio([]);
    setCfemStatus("");
    setEstrategicoOnly(false);
    setPage(0);
  };

  const hasActiveFilters = !!(search || regime.length || categoria.length || substancia.length || municipio.length || cfemStatus || estrategicoOnly || uf);

  // Detail panel
  useEffect(() => {
    if (!selectedProcesso) {
      setDetailRecord(null);
      setDetailError(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    fetchConcessaoDetail(selectedProcesso)
      .then(setDetailRecord)
      .catch((e) => {
        setDetailRecord(null);
        setDetailError(e.message ?? "Erro ao carregar detalhes");
      })
      .finally(() => setDetailLoading(false));
  }, [selectedProcesso]);

  // Build columns
  const columns: ColumnDef<Record<string, unknown>, unknown>[] = useMemo(() => {
    if (!data?.rows?.[0]) return [];
    const keys = Object.keys(data.rows[0]).filter((k) => !HIDDEN_COLUMNS.has(k));

    return keys.map((key) => ({
      accessorKey: key,
      header: key,
      cell: ({ getValue }: { getValue: () => unknown }) => {
        const value = getValue();
        if (key === "ativo_cfem") {
          return (
            <Badge variant={value === true ? "default" : "secondary"} className="text-[10px]">
              {value === true ? "Ativo" : "Inativo"}
            </Badge>
          );
        }
        if (key === "cfem_total" && typeof value === "number") {
          return fmtReais(value);
        }
        if (key === "AREA_HA" && typeof value === "number") {
          return fmtHa(value);
        }
        return formatCell(value);
      },
    }));
  }, [data]);

  const handleRowClick = (row: Record<string, unknown>) => {
    const processo = row.processo_norm ?? row.processo;
    if (!processo) return;
    const key = String(processo);
    // Toggle: clicking the same row again closes the detail panel
    setSelectedProcesso((prev) => (prev === key ? null : key));
  };

  const regimeLabels = data?.regime_labels ?? filterOptions?.regime_labels ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
          Cadastro Mineiro Nacional
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fmtNumber(stats?.total ?? 0)} processos minerários em {filterOptions?.ufs?.length ?? 0} estados — Todas as fases do ciclo de vida
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          Clique em uma linha para ver detalhes · Filtros combinam com AND · Dados: ANM Cadastro Mineiro (atualização diária)
        </p>

      {/* Pipeline chart */}
      {filterOptions?.pipeline && Object.keys(filterOptions.pipeline).length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(filterOptions.pipeline)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([key, count]) => (
              <div
                key={key}
                className="rounded-lg border bg-card px-3 py-2 text-center cursor-pointer hover:border-brand-teal/50 transition-colors"
                onClick={() => { setRegime([key]); setPage(0); }}
              >
                <p className="text-lg font-bold tabular-nums">{fmtNumber(count)}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {filterOptions.regime_labels?.[key] ?? key}
                </p>
              </div>
            ))}
        </div>
      )}
      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">
            Erro: {error}
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Concessões"
            value={fmtBR(stats.total)}
            icon={FileSearch}
          />
          <StatCard
            label="CFEM Ativas"
            value={stats.cfem_ativas != null ? fmtBR(stats.cfem_ativas) : "—"}
            icon={Coins}
            accentClass="bg-success"
          />
          <StatCard
            label="Substâncias"
            value={fmtBR(stats.substancias)}
            icon={Pickaxe}
            accentClass="bg-brand-teal"
          />
          <StatCard
            label="Municípios"
            value={fmtBR(stats.municipios)}
            icon={MapPin}
            accentClass="bg-brand-orange"
          />
        </div>
      ) : !error ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 p-4">
          {/* Search row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Busca
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Processo, titular, substância..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} size="default">
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Buscar
              </Button>
            </div>
          </div>

          {/* Filter grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Estado (UF)
              </label>
              <Select value={uf || "__all__"} onValueChange={(v) => { setUf(v === "__all__" ? "" : v); setPage(0); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os estados</SelectItem>
                  {(filterOptions?.ufs ?? []).map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Regime
              </label>
              <MultiSelect
                options={filterOptions?.regimes ?? []}
                selected={regime}
                onChange={(v) => { setRegime(v); setPage(0); }}
                placeholder="Todos"
                labels={regimeLabels}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              <MultiSelect
                options={filterOptions?.categorias ?? []}
                selected={categoria}
                onChange={(v) => { setCategoria(v); setPage(0); }}
                placeholder="Todas"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Substância
              </label>
              <MultiSelect
                options={filterOptions?.substancias ?? []}
                selected={substancia}
                onChange={(v) => { setSubstancia(v); setPage(0); }}
                placeholder="Todas"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Município
              </label>
              <MultiSelect
                options={filterOptions?.municipios ?? []}
                selected={municipio}
                onChange={(v) => { setMunicipio(v); setPage(0); }}
                placeholder="Todos"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                CFEM
              </label>
              <Select value={cfemStatus || "all"} onValueChange={(v) => { setCfemStatus(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="estrategico"
              checked={estrategicoOnly}
              onCheckedChange={(v) => { setEstrategicoOnly(!!v); setPage(0); }}
            />
            <label htmlFor="estrategico" className="text-xs cursor-pointer">
              Apenas minerais estratégicos
            </label>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Active filter chips */}
      <FilterChips
        chips={[
          ...(search ? [{ label: "Busca", value: search, onRemove: () => { setSearch(""); setSearchInput(""); setPage(0); } }] : []),
          ...regime.map((r) => ({ label: "Regime", value: regimeLabels[r] ?? r, onRemove: () => { setRegime((prev) => prev.filter((x) => x !== r)); setPage(0); } })),
          ...categoria.map((c) => ({ label: "Categoria", value: c, onRemove: () => { setCategoria((prev) => prev.filter((x) => x !== c)); setPage(0); } })),
          ...substancia.map((s) => ({ label: "Substância", value: s, onRemove: () => { setSubstancia((prev) => prev.filter((x) => x !== s)); setPage(0); } })),
          ...municipio.map((m) => ({ label: "Município", value: m, onRemove: () => { setMunicipio((prev) => prev.filter((x) => x !== m)); setPage(0); } })),
          ...(cfemStatus ? [{ label: "CFEM", value: cfemStatus === "ativo" ? "Ativo" : "Inativo", onRemove: () => { setCfemStatus(""); setPage(0); } }] : []),
        ]}
        onClearAll={clearFilters}
      />

      {/* Data table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <FileSearch className="h-4 w-4 text-brand-teal" />
            Concessões
            {data && (
              <Badge variant="secondary" className="ml-2 tabular-nums">
                {fmtNumber(data.total)} registros
              </Badge>
            )}
          </CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {data && columns.length > 0 ? (
            <DataTable
              columns={columns}
              data={data.rows}
              total={data.total}
              pageSize={PAGE_SIZE}
              page={page}
              onPageChange={setPage}
              onRowClick={handleRowClick}
              exportUrl={concessoesExportUrl(filters)}
              loading={loading}
            />
          ) : !loading && !error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileSearch className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma concessão encontrada
              </p>
            </div>
          ) : !error ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Inline detail panel */}
      {selectedProcesso && (
        <Card className="relative border-l-2 border-l-brand-teal animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-7 w-7"
            onClick={() => setSelectedProcesso(null)}
          >
            <X className="h-4 w-4" />
          </Button>

          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <FileSearch className="h-4 w-4 text-brand-teal" />
              Detalhe da Concessão
            </CardTitle>
          </CardHeader>

          <CardContent>
            {detailLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {detailError && !detailLoading && (
              <p className="py-8 text-center text-sm text-destructive">
                {detailError}
              </p>
            )}

            {detailRecord && !detailLoading && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm">
                    {str(detailRecord.titular)}
                  </h3>
                  <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                    {str(detailRecord.processo_norm ?? detailRecord.processo)}
                  </p>
                  {detailRecord.regime != null && (
                    <Badge variant="secondary" className="mt-1">
                      {regimeLabels[str(detailRecord.regime)] ?? str(detailRecord.regime)}
                    </Badge>
                  )}
                </div>

                <Separator />

                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                  <Field label="Substância" value={str(detailRecord.substancia_principal)} />
                  <Field label="Categoria" value={str(detailRecord.categoria)} />
                  <Field label="Município" value={str(detailRecord.municipio_principal)} />
                  <Field label="CNPJ" value={str(detailRecord.cpf_cnpj_do_titular)} mono />
                  <Field label="Área" value={detailRecord.AREA_HA != null ? fmtHa(Number(detailRecord.AREA_HA)) : "—"} />
                  <Field label="CFEM Total" value={detailRecord.cfem_total != null ? fmtReais(Number(detailRecord.cfem_total)) : "—"} />
                  <Field label="CFEM Status" value={detailRecord.ativo_cfem === true ? "Ativo" : "Inativo"} />
                  <Field label="Estratégico" value={detailRecord.estrategico === "sim" ? "Sim" : "Não"} />
                </dl>

                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/mapa?search=${encodeURIComponent(str(detailRecord.processo_norm ?? detailRecord.processo))}`}>
                      <Map className="mr-2 h-3.5 w-3.5" />
                      Ver no Mapa
                    </Link>
                  </Button>
                  {detailRecord.scm_url != null && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={String(detailRecord.scm_url)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Pesquisar no SCM/ANM
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : "text-sm"}>{value}</dd>
    </div>
  );
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return value % 1 === 0
      ? value.toLocaleString("pt-BR")
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  const s = String(value);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}
