"use client";

import Link from "next/link";
import { useRef, useCallback, useState, useMemo } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Badge } from "@/components/ui/badge";
import { fmtHa } from "@/lib/format";
import { trilhaResumoFromFase, ETAPA_COLORS } from "@/lib/ativos-api";

interface MiningMapProps {
  geojson: GeoJSON.FeatureCollection | null;
  colorBy: "categoria" | "regime" | "fase" | "cfem" | "etapa";
  colorPalettes: {
    categoria: Record<string, string>;
    regime: Record<string, string>;
    fase: Record<string, string>;
  };
  showUCs: boolean;
  showTIs: boolean;
  showBiomas: boolean;
  showEnergia: boolean;
  showSubestacoes: boolean;
  showAgua: boolean;
  ucsGeojson: GeoJSON.FeatureCollection | null;
  tisGeojson: GeoJSON.FeatureCollection | null;
  biomasGeojson: GeoJSON.FeatureCollection | null;
  energiaGeojson: GeoJSON.FeatureCollection | null;
  subestacoesGeojson: GeoJSON.FeatureCollection | null;
  aguaGeojson: GeoJSON.FeatureCollection | null;
  showFerrovias?: boolean;
  showPortos?: boolean;
  ferroviasGeojson?: GeoJSON.FeatureCollection | null;
  portosGeojson?: GeoJSON.FeatureCollection | null;
  /** Abre o painel do ativo (trilha + portfólio) para um processo. */
  onOpenAtivo?: (processo: string) => void;
}

interface PopupInfo {
  lng: number;
  lat: number;
  properties: Record<string, unknown>;
}

const MG_CENTER = { longitude: -43.9, latitude: -19.9 };
const INITIAL_ZOOM = 6;

const CFEM_COLORS: Record<string, string> = {
  true: "#27AE60",
  false: "#E74C3C",
};

/** Código de etapa (chave da paleta) a partir da fase ANM de uma feature. */
function etapaCodigo(fase: unknown): string {
  const r = trilhaResumoFromFase(typeof fase === "string" ? fase : null);
  if (r.ordem) return String(r.ordem);
  if (r.especial) return "especial";
  return "outro";
}

export function MiningMap({
  geojson,
  colorBy,
  colorPalettes,
  showUCs,
  showTIs,
  showBiomas,
  showEnergia,
  showSubestacoes,
  showAgua,
  ucsGeojson,
  tisGeojson,
  biomasGeojson,
  energiaGeojson,
  subestacoesGeojson,
  aguaGeojson,
  showFerrovias,
  showPortos,
  ferroviasGeojson,
  portosGeojson,
  onOpenAtivo,
}: MiningMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  // Para "etapa", derivamos a geojson adicionando _etapa em cada feature
  // (a partir da FASE) — assim o color-match opera sobre uma propriedade estável.
  const sourceData = useMemo(() => {
    if (!geojson || colorBy !== "etapa") return geojson;
    return {
      ...geojson,
      features: geojson.features.map((f) => ({
        ...f,
        properties: { ...f.properties, _etapa: etapaCodigo(f.properties?.FASE) },
      })),
    } as GeoJSON.FeatureCollection;
  }, [geojson, colorBy]);

  const getColorExpression = useCallback((): string | unknown[] => {
    const palette =
      colorBy === "cfem"
        ? CFEM_COLORS
        : colorBy === "etapa"
          ? ETAPA_COLORS
          : colorBy === "fase"
            ? colorPalettes.fase
            : colorBy === "regime"
              ? colorPalettes.regime
              : colorPalettes.categoria;

    const propName =
      colorBy === "cfem"
        ? "ativo_cfem"
        : colorBy === "etapa"
          ? "_etapa"
          : colorBy === "fase"
            ? "FASE"
            : colorBy;

    const entries = Object.entries(palette);
    if (entries.length === 0) return "#95A5A6";

    const matchExpr: unknown[] = ["match", ["to-string", ["get", propName]]];
    for (const [key, color] of entries) {
      matchExpr.push(key, color);
    }
    matchExpr.push("#95A5A6"); // fallback
    return matchExpr;
  }, [colorBy, colorPalettes]);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) {
      setPopup(null);
      return;
    }
    setPopup({
      lng: e.lngLat.lng,
      lat: e.lngLat.lat,
      properties: feature.properties as Record<string, unknown>,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "pointer";
  }, []);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "";
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        ...MG_CENTER,
        zoom: INITIAL_ZOOM,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      interactiveLayerIds={geojson ? ["concessoes-fill"] : []}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <NavigationControl position="top-right" />

      {/* UCs layer */}
      {/* Biomas layer (fundo — renderizado primeiro) */}
      {showBiomas && biomasGeojson && (
        <Source id="biomas" type="geojson" data={biomasGeojson}>
          <Layer
            id="biomas-fill"
            type="fill"
            paint={{
              "fill-color": [
                "match", ["get", "Bioma"],
                "Amazônia", "#2E7D32",
                "Caatinga", "#C2864A",
                "Cerrado", "#D4A017",
                "Mata Atlântica", "#388E3C",
                "Pampa", "#7CB342",
                "Pantanal", "#0097A7",
                "#9E9E9E",
              ],
              "fill-opacity": 0.10,
            }}
          />
          <Layer
            id="biomas-outline"
            type="line"
            paint={{ "line-color": "#5D4037", "line-width": 0.8, "line-opacity": 0.4 }}
          />
        </Source>
      )}

      {showUCs && ucsGeojson && (
        <Source id="ucs" type="geojson" data={ucsGeojson}>
          <Layer
            id="ucs-fill"
            type="fill"
            paint={{
              "fill-color": "#27AE60",
              "fill-opacity": 0.12,
            }}
          />
          <Layer
            id="ucs-outline"
            type="line"
            paint={{
              "line-color": "#27AE60",
              "line-width": 1,
              "line-opacity": 0.5,
            }}
          />
        </Source>
      )}

      {/* TIs layer */}
      {showTIs && tisGeojson && (
        <Source id="tis" type="geojson" data={tisGeojson}>
          <Layer
            id="tis-fill"
            type="fill"
            paint={{
              "fill-color": "#E74C3C",
              "fill-opacity": 0.12,
            }}
          />
          <Layer
            id="tis-outline"
            type="line"
            paint={{
              "line-color": "#E74C3C",
              "line-width": 1,
              "line-opacity": 0.5,
            }}
          />
        </Source>
      )}

      {/* Energia — linhas de transmissão (ANEEL/SIGEL) */}
      {showEnergia && energiaGeojson && (
        <Source id="energia" type="geojson" data={energiaGeojson}>
          <Layer
            id="energia-line"
            type="line"
            paint={{
              "line-color": "#F39C12",
              "line-width": 1.5,
              "line-opacity": 0.8,
              "line-dasharray": [3, 1.5],
            }}
          />
        </Source>
      )}

      {/* Subestações (energia — pontos) */}
      {showSubestacoes && subestacoesGeojson && (
        <Source id="subestacoes" type="geojson" data={subestacoesGeojson}>
          <Layer id="subestacoes-pt" type="circle" paint={{
            "circle-radius": 4, "circle-color": "#E67E22",
            "circle-stroke-color": "#fff", "circle-stroke-width": 1, "circle-opacity": 0.85,
          }} />
        </Source>
      )}

      {/* Água — estações fluviométricas (pontos) */}
      {showAgua && aguaGeojson && (
        <Source id="agua" type="geojson" data={aguaGeojson}>
          <Layer id="agua-pt" type="circle" paint={{
            "circle-radius": 3, "circle-color": "#0097A7",
            "circle-stroke-color": "#fff", "circle-stroke-width": 0.5, "circle-opacity": 0.8,
          }} />
        </Source>
      )}

      {/* Ferrovias (MInfra) — linhas */}
      {showFerrovias && ferroviasGeojson && (
        <Source id="ferrovias" type="geojson" data={ferroviasGeojson}>
          <Layer id="ferrovias-line" type="line" paint={{
            "line-color": "#7B1FA2", "line-width": 1.4, "line-opacity": 0.85,
          }} />
        </Source>
      )}

      {/* Portos (MInfra) — pontos */}
      {showPortos && portosGeojson && (
        <Source id="portos" type="geojson" data={portosGeojson}>
          <Layer id="portos-pt" type="circle" paint={{
            "circle-radius": 4, "circle-color": "#1565C0",
            "circle-stroke-color": "#fff", "circle-stroke-width": 1, "circle-opacity": 0.9,
          }} />
        </Source>
      )}

      {/* Concessões layer */}
      {sourceData && (
        <Source id="concessoes" type="geojson" data={sourceData}>
          <Layer
            id="concessoes-fill"
            type="fill"
            paint={{
              "fill-color": getColorExpression() as string,
              "fill-opacity": 0.5,
            }}
          />
          <Layer
            id="concessoes-outline"
            type="line"
            paint={{
              "line-color": getColorExpression() as string,
              "line-width": 1.5,
              "line-opacity": 0.8,
            }}
          />
        </Source>
      )}

      {/* Popup */}
      {popup && (
        <Popup
          longitude={popup.lng}
          latitude={popup.lat}
          closeOnClick={false}
          onClose={() => setPopup(null)}
          maxWidth="300px"
          className="mining-popup"
        >
          <div className="space-y-1.5 text-xs">
            <p className="font-mono font-medium">
              {str(popup.properties.processo_norm)}
            </p>
            {popup.properties.titular != null && (
              <p className="text-muted-foreground truncate max-w-[260px]">
                {str(popup.properties.titular)}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {popup.properties.substancia_principal != null && (
                <Badge variant="secondary" className="text-[9px]">
                  {str(popup.properties.substancia_principal)}
                </Badge>
              )}
              {popup.properties.FASE != null && (
                <Badge variant="outline" className="text-[9px]">
                  {str(popup.properties.FASE)}
                </Badge>
              )}
            </div>
            {popup.properties.AREA_HA != null && (
              <p className="tabular-nums">
                Área: {fmtHa(Number(popup.properties.AREA_HA))}
              </p>
            )}
            {onOpenAtivo && popup.properties.processo_norm != null && (
              <button
                type="button"
                onClick={() => onOpenAtivo(str(popup.properties.processo_norm))}
                className="mt-1 w-full rounded-md bg-brand-navy px-2 py-1.5 text-[11px] font-medium text-white hover:bg-brand-navy/90 transition-colors"
              >
                Abrir trilha do ativo →
              </button>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {popup.properties.processo_norm != null && (
                <Link
                  href={`/concessoes?search=${encodeURIComponent(str(popup.properties.processo_norm))}`}
                  className="text-[10px] text-brand-teal hover:underline"
                >
                  Ver detalhes →
                </Link>
              )}
              {popup.properties.cpf_cnpj_do_titular != null && String(popup.properties.cpf_cnpj_do_titular).replace(/\D/g, "").length >= 11 && (
                <Link
                  href={`/empresa?cnpj=${encodeURIComponent(String(popup.properties.cpf_cnpj_do_titular).replace(/\D/g, ""))}`}
                  className="text-[10px] text-brand-orange hover:underline"
                >
                  Abrir Dossiê →
                </Link>
              )}
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}
