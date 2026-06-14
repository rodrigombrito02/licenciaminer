"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Map as MapIcon,
  Loader2,
  Layers,
  Palette,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelect } from "@/components/multi-select";
import { StatCard } from "@/components/stat-card";
import { AtivoPanel } from "@/components/ativo-panel";
import { ETAPA_COLORS, ETAPA_LEGEND } from "@/lib/ativos-api";
import { useEffectiveRole } from "@/hooks/use-effective-role";
import {
  fetchGeoConcessoes,
  fetchGeoStats,
  fetchGeoFilters,
  fetchGeoLayer,
  fmtNumber,
  type GeoStats,
  type GeoFilterOptions,
} from "@/lib/api";
import { fmtBR, fmtHa } from "@/lib/format";

const MiningMap = dynamic(
  () => import("@/components/mining-map").then((m) => m.MiningMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

type ColorBy = "categoria" | "regime" | "fase" | "cfem" | "etapa";

// Limite default de polígonos — mantém o mapa rápido (de 50k para <=1000).
const MAP_LIMIT = 1000;

// Filtro default no primeiro acesso: classes minerais relevantes (exclui
// Construção Civil e não-categorizados). Soma ~1.200 → exibe 1.000, rápido.
const DEFAULT_CATEGORIAS = [
  "Metálicos Ferrosos",
  "Metálicos Não-Ferrosos",
  "Metálicos Preciosos",
  "Metálicos Estratégicos",
  "Rochas Ornamentais",
  "Industrial",
  "Gemas e Pedras Preciosas",
];

const COLOR_BY_LABELS: Record<ColorBy, string> = {
  categoria: "Categoria Mineral",
  regime: "Regime",
  fase: "Fase ANM",
  etapa: "Etapa da Trilha",
  cfem: "Status CFEM",
};

/** Anzol: CTA de captação no mapa público, só para visitante anônimo. */
function AnzolBanner() {
  const roleState = useEffectiveRole();
  if (roleState.status !== "anonymous") return null;
  return (
    <div className="rounded-xl border border-brand-gold/40 bg-gradient-to-r from-brand-gold/10 to-brand-teal/5 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="font-semibold text-sm">Você está vendo o mapa público.</p>
        <p className="text-xs text-muted-foreground">
          Clique em qualquer polígono e crie uma conta para ver a <strong>trilha do ativo</strong>, os <strong>prazos legais</strong> e o <strong>portfólio do titular</strong>.
        </p>
      </div>
      <a
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90 transition-colors shrink-0"
      >
        Criar conta grátis <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

export default function MapaPage() {
  return (
    <Suspense>
      <MapaContent />
    </Suspense>
  );
}

function MapaContent() {
  const params = useSearchParams();
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [stats, setStats] = useState<GeoStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<GeoFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters — restore from URL; no primeiro acesso (sem nenhum filtro na URL)
  // aplica o filtro mineral padrão para carregar rápido.
  const urlRegime = params.getAll("regime");
  const urlCategoria = params.getAll("categoria");
  const urlSubstancia = params.getAll("substancia");
  const semFiltrosNaUrl =
    !urlRegime.length && !urlCategoria.length && !urlSubstancia.length;
  const [regime, setRegime] = useState<string[]>(urlRegime);
  const [categoria, setCategoria] = useState<string[]>(
    urlCategoria.length ? urlCategoria : semFiltrosNaUrl ? DEFAULT_CATEGORIAS : []
  );
  const [substancia, setSubstancia] = useState<string[]>(urlSubstancia);
  const [colorBy, setColorBy] = useState<ColorBy>(
    (params.get("colorBy") as ColorBy) || "categoria"
  );

  // Restriction layers — restore from URL
  const [showUCs, setShowUCs] = useState(params.get("ucs") === "1");
  const [showTIs, setShowTIs] = useState(params.get("tis") === "1");
  const [showBiomas, setShowBiomas] = useState(params.get("biomas") === "1");
  const [showEnergia, setShowEnergia] = useState(params.get("energia") === "1");
  const [showSubestacoes, setShowSubestacoes] = useState(params.get("subest") === "1");
  const [showAgua, setShowAgua] = useState(params.get("agua") === "1");
  const [showFerrovias, setShowFerrovias] = useState(params.get("ferrovias") === "1");
  const [showPortos, setShowPortos] = useState(params.get("portos") === "1");
  const [ucsGeojson, setUcsGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [tisGeojson, setTisGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [biomasGeojson, setBiomasGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [energiaGeojson, setEnergiaGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [subestacoesGeojson, setSubestacoesGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [aguaGeojson, setAguaGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [ferroviasGeojson, setFerroviasGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [portosGeojson, setPortosGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [ativoProcesso, setAtivoProcesso] = useState<string | null>(null);

  // Sync filters to URL (no re-render)
  useEffect(() => {
    const qs = new URLSearchParams();
    regime.forEach((v) => qs.append("regime", v));
    categoria.forEach((v) => qs.append("categoria", v));
    substancia.forEach((v) => qs.append("substancia", v));
    if (colorBy !== "categoria") qs.set("colorBy", colorBy);
    if (showUCs) qs.set("ucs", "1");
    if (showTIs) qs.set("tis", "1");
    if (showBiomas) qs.set("biomas", "1");
    if (showEnergia) qs.set("energia", "1");
    if (showSubestacoes) qs.set("subest", "1");
    if (showAgua) qs.set("agua", "1");
    const q = qs.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
  }, [regime, categoria, substancia, colorBy, showUCs, showTIs]);

  // Load filter options on mount
  useEffect(() => {
    fetchGeoFilters().then(setFilterOptions).catch((e) => { console.error("geoFilters:", e); });
  }, []);

  // Load concessoes
  const loadConcessoes = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {
      regime: regime.length > 0 ? regime : undefined,
      categoria: categoria.length > 0 ? categoria : undefined,
      substancia: substancia.length > 0 ? substancia : undefined,
      limit: MAP_LIMIT,
    };

    Promise.all([
      fetchGeoConcessoes(params),
      fetchGeoStats(params),
    ])
      .then(([geoData, statsData]) => {
        setGeojson(geoData.geojson);
        setStats(statsData);
        if (geoData.truncated) {
          setError(`Exibindo ${fmtBR(geoData.returned)} de ${fmtBR(geoData.total)} polígonos. Refine os filtros.`);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [regime, categoria, substancia]);

  useEffect(() => {
    loadConcessoes();
  }, [loadConcessoes]);

  // Lazy load restriction layers
  useEffect(() => {
    if (showUCs && !ucsGeojson) {
      fetchGeoLayer("ucs").then(setUcsGeojson).catch((e) => { console.error("UCs layer:", e); });
    }
  }, [showUCs, ucsGeojson]);

  useEffect(() => {
    if (showTIs && !tisGeojson) {
      fetchGeoLayer("tis").then(setTisGeojson).catch((e) => { console.error("TIs layer:", e); });
    }
  }, [showTIs, tisGeojson]);

  useEffect(() => {
    if (showBiomas && !biomasGeojson) {
      fetchGeoLayer("biomas").then(setBiomasGeojson).catch((e) => { console.error("Biomas layer:", e); });
    }
  }, [showBiomas, biomasGeojson]);

  useEffect(() => {
    if (showEnergia && !energiaGeojson) {
      fetchGeoLayer("energia").then(setEnergiaGeojson).catch((e) => { console.error("Energia layer:", e); });
    }
  }, [showEnergia, energiaGeojson]);

  useEffect(() => {
    if (showSubestacoes && !subestacoesGeojson) {
      fetchGeoLayer("subestacoes").then(setSubestacoesGeojson).catch((e) => { console.error("Subestacoes:", e); });
    }
  }, [showSubestacoes, subestacoesGeojson]);

  useEffect(() => {
    if (showAgua && !aguaGeojson) {
      fetchGeoLayer("agua").then(setAguaGeojson).catch((e) => { console.error("Agua:", e); });
    }
  }, [showAgua, aguaGeojson]);

  useEffect(() => {
    if (showFerrovias && !ferroviasGeojson) {
      fetchGeoLayer("ferrovias").then(setFerroviasGeojson).catch((e) => { console.error("Ferrovias:", e); });
    }
  }, [showFerrovias, ferroviasGeojson]);

  useEffect(() => {
    if (showPortos && !portosGeojson) {
      fetchGeoLayer("portos").then(setPortosGeojson).catch((e) => { console.error("Portos:", e); });
    }
  }, [showPortos, portosGeojson]);

  const colorPalettes = filterOptions?.color_palettes ?? {
    categoria: {},
    regime: {},
    fase: {},
  };

  // Legend entries for current colorBy
  const legendPalette =
    colorBy === "cfem"
      ? { Ativo: "#27AE60", Inativo: "#E74C3C" }
      : colorBy === "etapa"
        ? Object.fromEntries(Object.keys(ETAPA_LEGEND).map((k) => [ETAPA_LEGEND[k], ETAPA_COLORS[k]]))
        : colorBy === "fase"
          ? colorPalettes.fase
          : colorBy === "regime"
            ? colorPalettes.regime
            : colorPalettes.categoria;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
          Mapa Geoespacial
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Concessões minerárias com camadas de UCs, Terras Indígenas e Biomas
        </p>
      </div>

      <AnzolBanner />

      {/* KPIs */}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Polígonos"
            value={fmtBR(stats.total_polygons)}
            subtitle={stats.total_polygons !== stats.total_all ? `de ${fmtBR(stats.total_all)} total` : undefined}
            icon={MapIcon}
          />
          <StatCard
            label="Enriquecidos"
            value={stats.enriched_count != null ? fmtBR(stats.enriched_count) : "—"}
            subtitle="com dados SCM"
            icon={Layers}
            accentClass="bg-brand-teal"
          />
          <StatCard
            label="Substâncias"
            value={stats.distinct_substances != null ? fmtBR(stats.distinct_substances) : "—"}
            icon={Palette}
            accentClass="bg-brand-gold"
          />
          <StatCard
            label="Área Total"
            value={stats.total_area_ha != null ? fmtHa(stats.total_area_ha) : "—"}
            icon={MapIcon}
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

      {/* Warning for truncation */}
      {error && (
        <Card className="border-warning/30">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Controls + Map */}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Sidebar controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Regime
                </label>
                <MultiSelect
                  options={filterOptions?.options.regimes ?? []}
                  selected={regime}
                  onChange={setRegime}
                  placeholder="Todos"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Categoria
                </label>
                <MultiSelect
                  options={filterOptions?.options.categorias ?? []}
                  selected={categoria}
                  onChange={setCategoria}
                  placeholder="Todas"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Substância
                </label>
                <MultiSelect
                  options={filterOptions?.options.substancias ?? []}
                  selected={substancia}
                  onChange={setSubstancia}
                  placeholder="Todas"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Colorir por
                </label>
                <Select value={colorBy} onValueChange={(v) => setColorBy(v as ColorBy)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(COLOR_BY_LABELS) as ColorBy[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {COLOR_BY_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading">Camadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Grupo Ambiental */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Ambiental</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="show-ucs" checked={showUCs} onCheckedChange={(v) => setShowUCs(!!v)} />
                    <label htmlFor="show-ucs" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success" />
                      Unidades de Conservação
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="show-tis" checked={showTIs} onCheckedChange={(v) => setShowTIs(!!v)} />
                    <label htmlFor="show-tis" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-danger" />
                      Terras Indígenas
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="show-biomas" checked={showBiomas} onCheckedChange={(v) => setShowBiomas(!!v)} />
                    <label htmlFor="show-biomas" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#D4A017" }} />
                      Biomas
                    </label>
                  </div>
                </div>
              </div>

              {/* Disponibilidade de Energia (transmissão + distribuição) */}
              <div className="border-t pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Disponibilidade de Energia</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="show-energia" checked={showEnergia} onCheckedChange={(v) => setShowEnergia(!!v)} />
                    <label htmlFor="show-energia" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-3" style={{ background: "#F39C12" }} />
                      Linhas de Transmissão
                      <span className="text-[9px] text-muted-foreground">ANEEL</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="show-subest" checked={showSubestacoes} onCheckedChange={(v) => setShowSubestacoes(!!v)} />
                    <label htmlFor="show-subest" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#E67E22" }} />
                      Subestações
                      <span className="text-[9px] text-muted-foreground">distribuição</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Recursos Hídricos */}
              <div className="border-t pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Recursos Hídricos</p>
                <div className="flex items-center gap-2">
                  <Checkbox id="show-agua" checked={showAgua} onCheckedChange={(v) => setShowAgua(!!v)} />
                  <label htmlFor="show-agua" className="text-xs cursor-pointer flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#0097A7" }} />
                    Estações Fluviométricas
                    <span className="text-[9px] text-muted-foreground">ANA</span>
                  </label>
                </div>
              </div>

              {/* Logística multimodal */}
              <div className="border-t pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Logística</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox id="show-ferrovias" checked={showFerrovias} onCheckedChange={(v) => setShowFerrovias(!!v)} />
                    <label htmlFor="show-ferrovias" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-3" style={{ background: "#7B1FA2" }} />
                      Ferrovias
                      <span className="text-[9px] text-muted-foreground">MInfra</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="show-portos" checked={showPortos} onCheckedChange={(v) => setShowPortos(!!v)} />
                    <label htmlFor="show-portos" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#1565C0" }} />
                      Portos
                      <span className="text-[9px] text-muted-foreground">MInfra</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Próximas dimensões */}
              <div className="border-t pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Próximas camadas</p>
                <div className="space-y-1.5 opacity-60">
                  {[
                    { l: "Geologia", f: "CPRM", c: "#795548" },
                    { l: "Pluviometria", f: "INMET", c: "#0288D1" },
                  ].map((x) => (
                    <div key={x.l} className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: x.c }} />
                      <span className="text-xs flex-1">{x.l}</span>
                      <span className="text-[9px] text-muted-foreground">{x.f}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                  Mesma base alimenta os scores do Funil de Oportunidades.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading flex items-center justify-between">
                Legenda
                {geojson && (
                  <Badge variant="secondary" className="text-[10px] font-tabular ml-2">
                    {fmtBR(geojson.features.length)} polígonos
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(legendPalette).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-3 w-3 rounded-sm shrink-0 bg-[#95A5A6]" />
                  <span>Outros / Sem dados</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <Card className="overflow-hidden">
          <div className="relative h-[400px] sm:h-[500px] lg:h-[700px]">
            {loading && !geojson ? (
              <div className="flex h-full items-center justify-center bg-muted/30">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Carregando geometrias...</p>
                </div>
              </div>
            ) : (
              <MiningMap
                geojson={geojson}
                colorBy={colorBy}
                colorPalettes={colorPalettes}
                showUCs={showUCs}
                showTIs={showTIs}
                showBiomas={showBiomas}
                showEnergia={showEnergia}
                showSubestacoes={showSubestacoes}
                showAgua={showAgua}
                ucsGeojson={ucsGeojson}
                tisGeojson={tisGeojson}
                biomasGeojson={biomasGeojson}
                energiaGeojson={energiaGeojson}
                subestacoesGeojson={subestacoesGeojson}
                aguaGeojson={aguaGeojson}
                showFerrovias={showFerrovias}
                showPortos={showPortos}
                ferroviasGeojson={ferroviasGeojson}
                portosGeojson={portosGeojson}
                onOpenAtivo={setAtivoProcesso}
              />
            )}
          </div>
        </Card>
      </div>

      <AtivoPanel
        processo={ativoProcesso}
        open={ativoProcesso !== null}
        onClose={() => setAtivoProcesso(null)}
      />
    </div>
  );
}
