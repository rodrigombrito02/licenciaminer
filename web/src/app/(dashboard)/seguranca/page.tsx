"use client";

import {
  Shield,
  ShieldCheck,
  Radio,
  Smartphone,
  Watch,
  Activity,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Camera,
  TrendingUp,
  Users,
  Cpu,
  ExternalLink,
  Vibrate,
  Thermometer,
  Heart,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ── Data ── */

const SOFTWARE_PRODUCTS = [
  {
    name: "SIM",
    fullName: "Safety Inspection Manager",
    description:
      "Gestão digital de inspeções de segurança e checklists automáticos para operações industriais.",
    icon: ClipboardCheck,
    color: "text-brand-teal",
    borderColor: "border-brand-teal/30",
    features: [
      { icon: CheckCircle2, text: "Auditorias e compliance em tempo real" },
      { icon: ClipboardCheck, text: "Checklists automatizados com notificações" },
      { icon: Camera, text: "Inspeções de campo com fotos e anotações" },
      { icon: TrendingUp, text: "Identificação de tendências e anomalias" },
      { icon: Users, text: "Gestão unificada de equipamentos, pessoas e áreas" },
      { icon: Cpu, text: "Eliminação total de papel e impressões" },
    ],
  },
  {
    name: "Dersalis Hub",
    fullName: "Hub de Saúde e Segurança",
    description:
      "Plataforma de monitoramento de riscos ocupacionais com wearables. Integra sensores, protocolos e decisões em tempo real.",
    icon: Activity,
    color: "text-brand-orange",
    borderColor: "border-brand-orange/30",
    features: [
      { icon: Eye, text: "Monitoramento de fadiga e baixa atenção" },
      { icon: Thermometer, text: "Prevenção de estresse térmico" },
      { icon: Heart, text: "Risco cardiovascular em tempo real" },
      { icon: Vibrate, text: "Exposição a vibração (NHO 09)" },
      { icon: MapPin, text: "Geolocalização indoor/outdoor" },
      { icon: AlertTriangle, text: "5 níveis de alerta escaláveis (operador → resgate)" },
    ],
  },
];

const HARDWARE_DEVICES = [
  {
    name: "Crachá Inteligente",
    manufacturer: "Kofre",
    description: "Dispositivo de identificação e segurança com localização em tempo real.",
    features: [
      "Botão de pânico (SOS)",
      "Localização indoor/outdoor",
      "Gestão de evacuação",
      "Controle de acesso",
      "Alertas luminosos e sonoros",
    ],
    specs: ["LTE", "BLE", "LoRaWAN", "IP65", "EX"],
  },
  {
    name: "Tag Humano × Máquina",
    manufacturer: "Kofre / Rombit",
    description:
      "Detecção de proximidade e prevenção de colisões entre pessoas e máquinas.",
    features: [
      "Detecção de queda e não-movimento",
      "Alerta de colisão homem-máquina",
      "Alerta de colisão máquina-máquina",
      "Gestão de certificados",
      "3 zonas de alerta configuráveis",
    ],
    specs: ["LoRaWAN", "WiFi", "IP67", "EX"],
  },
  {
    name: "Braçadeira Biomédica",
    manufacturer: "Rombit",
    description:
      "Wearable para monitoramento contínuo de sinais vitais e condições ambientais.",
    features: [
      "Monitoramento de parâmetros biomédicos",
      "Prevenção de estresse térmico",
      "Sensores ambientais (beacons)",
      "Botão de pânico (SOS)",
      "Localização indoor/outdoor",
    ],
    specs: ["LTE", "BLE", "IP68", "EX (em certificação)"],
  },
];

const ALERT_ZONES = [
  {
    level: "Área Segura",
    color: "bg-success",
    textColor: "text-success",
    borderColor: "border-success/30",
    description: "Operação normal. Indicador verde.",
  },
  {
    level: "Área de Risco",
    color: "bg-warning",
    textColor: "text-warning",
    borderColor: "border-warning/30",
    description: "Alerta amarelo. Proximidade de zona restrita.",
  },
  {
    level: "Área de Risco Crítico",
    color: "bg-danger",
    textColor: "text-danger",
    borderColor: "border-danger/30",
    description: "Alerta vermelho. Ação imediata necessária.",
  },
];

const PARTNERS = ["Kofre", "Rombit", "Dersalis"];

/* ── Page ── */

export default function SegurancaPage() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-orange/10 p-2.5">
            <Shield className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
              SQ Solutions
            </h1>
            <p className="text-sm text-muted-foreground">
              Soluções digitais de segurança e saúde no trabalho para operações
              complexas
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/60 max-w-2xl">
          Tecnologia aplicada à prevenção de acidentes e monitoramento de riscos
          ocupacionais. Presente em editais de prestação de serviço para
          Petrobras, incluindo plataformas offshore.
        </p>
      </div>

      {/* Software Products */}
      <section>
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-4">
          Plataformas de Software
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {SOFTWARE_PRODUCTS.map((product) => {
            const Icon = product.icon;
            return (
              <Card
                key={product.name}
                className={`border ${product.borderColor} transition-shadow hover:shadow-md`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3">
                    <div className={`rounded-lg bg-muted p-2 ${product.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-base font-bold">{product.name}</span>
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {product.fullName}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {product.features.map((feat) => {
                      const FeatIcon = feat.icon;
                      return (
                        <div
                          key={feat.text}
                          className="flex items-start gap-2 text-xs"
                        >
                          <FeatIcon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span>{feat.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Hardware Devices */}
      <section>
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-1">
          Dispositivos de Hardware
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Fabricantes: Kofre · Rombit — Certificados para ambientes
          classificados
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HARDWARE_DEVICES.map((device) => (
            <Card key={device.name} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">
                  {device.name}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  {device.manufacturer}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {device.description}
                </p>
                <ul className="space-y-1">
                  {device.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-2 text-xs"
                    >
                      <ShieldCheck className="h-3 w-3 shrink-0 text-brand-teal" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {device.specs.map((spec) => (
                    <Badge
                      key={spec}
                      variant="secondary"
                      className="text-[9px] font-mono"
                    >
                      {spec}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Alert Zones */}
      <section>
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-4">
          Zonas de Alerta Configuráveis
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {ALERT_ZONES.map((zone) => (
            <div
              key={zone.level}
              className={`rounded-xl border ${zone.borderColor} p-5 text-center`}
            >
              <div
                className={`mx-auto h-4 w-4 rounded-full ${zone.color} mb-3`}
              />
              <p className={`text-sm font-semibold ${zone.textColor}`}>
                {zone.level}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {zone.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#0A2540] px-8 py-10 text-center">
        <h2 className="font-heading text-xl font-bold text-white">
          Quer saber mais?
        </h2>
        <p className="mt-2 text-sm text-white/70 max-w-md mx-auto">
          Solicite uma demonstração ou fale com nosso time de consultoria para
          encontrar a solução ideal para sua operação.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="https://summoquartile.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-brand-orange hover:bg-brand-orange/90">
              Solicitar Demonstração
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </a>
          <a
            href="https://summoquartile.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Fale Conosco
            </Button>
          </a>
        </div>
      </section>

      {/* Partners */}
      <section className="flex flex-col items-center gap-3 py-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
          Parceiros Tecnológicos
        </p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {PARTNERS.map((name) => (
            <span
              key={name}
              className="text-sm font-medium text-muted-foreground/40"
            >
              {name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
