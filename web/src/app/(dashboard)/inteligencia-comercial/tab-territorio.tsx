"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Anchor, Map as MapIcon, BarChart3, ZoomIn } from "lucide-react";

const IMAGES = {
  mapa: {
    src: "/mi/pellet-map-2024.jpeg",
    label: "Mapa",
    alt: "Mapa do mercado seaborne de pelotas de minério de ferro — 2024",
  },
  stats: {
    src: "/mi/pellet-stats-2024.jpeg",
    label: "Key Statistics",
    alt: "Principais estatísticas do mercado seaborne de pelotas de minério de ferro — 2024",
  },
} as const;

type ViewKey = keyof typeof IMAGES;

interface TerritorioTabProps {
  activeMetric: string;
  onMetricChange: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TerritorioTab(_props: TerritorioTabProps) {
  const [view, setView] = useState<ViewKey>("mapa");
  const [zoomOpen, setZoomOpen] = useState(false);

  const active = IMAGES[view];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="rounded-xl bg-gradient-to-r from-[#0A2540]/8 to-brand-teal/10 border border-brand-teal/30 p-5">
        <div className="flex items-start gap-3">
          <Anchor className="h-5 w-5 text-brand-teal flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm mb-1">Iron Ore Pellets — Seaborne Market 2024</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Visualização do mercado transoceânico de pelotas de minério de ferro:
              rotas, principais destinos e estatísticas-chave. Clique na imagem para ampliar.
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Mapa / Key Statistics */}
      <div className="flex gap-2">
        <Button
          variant={view === "mapa" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("mapa")}
          className="gap-1.5"
        >
          <MapIcon className="h-4 w-4" />
          Mapa
        </Button>
        <Button
          variant={view === "stats" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("stats")}
          className="gap-1.5"
        >
          <BarChart3 className="h-4 w-4" />
          Key Statistics
        </Button>
      </div>

      {/* Imagem */}
      <Card>
        <CardContent className="p-3">
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="group relative block w-full overflow-hidden rounded-lg cursor-zoom-in"
            aria-label="Ampliar imagem"
          >
            <Image
              src={active.src}
              alt={active.alt}
              width={1600}
              height={1000}
              priority
              className="w-full h-auto object-contain"
            />
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-3.5 w-3.5" /> Ampliar
            </span>
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Fonte: comexstat / trademap · edição 2024. {active.label}.
          </p>
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          className="max-w-[95vw] w-fit border-none bg-transparent p-0 shadow-none sm:max-w-[95vw]"
          showCloseButton
        >
          <DialogTitle className="sr-only">{active.alt}</DialogTitle>
          <div className="max-h-[90vh] overflow-auto rounded-lg bg-background">
            <Image
              src={active.src}
              alt={active.alt}
              width={2400}
              height={1500}
              className="h-auto w-auto max-w-none object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
