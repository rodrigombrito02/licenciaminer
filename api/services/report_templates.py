"""Infraestrutura de geração de relatórios HTML.

Funções compartilhadas para gerar relatórios DD (5 fases), Viabilidade
e Proposta Técnica a partir de dados estruturados.
Cada relatório é HTML auto-contido (CSS inline, logo base64) pronto para
impressão (Ctrl+P → PDF) e compartilhamento.
"""

from __future__ import annotations

import base64
import logging
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Logo base64 (carregado uma vez) ──
_LOGO_B64: str | None = None

def _get_logo() -> str:
    global _LOGO_B64
    if _LOGO_B64 is None:
        logo_path = Path(__file__).resolve().parent.parent.parent / "web" / "public" / "logo2.png"
        if logo_path.exists():
            with open(logo_path, "rb") as f:
                _LOGO_B64 = f"data:image/png;base64,{base64.b64encode(f.read()).decode()}"
        else:
            _LOGO_B64 = ""
    return _LOGO_B64


# ── CSS compartilhado ──
REPORT_CSS = """
@page{size:A4;margin:18mm 16mm;}
:root{--navy:#0A2540;--navy2:#1A2C42;--teal:#156082;--gold:#FFC000;--orange:#FF5F00;--success:#27AE60;--danger:#E74C3C;--warning:#F39C12;--light:#F8F9FB;--gray:#6B7280;--gray-light:#9CA3AF;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,sans-serif;color:#1a1a1a;line-height:1.65;font-size:10pt;background:#fff;}
.cover{background:var(--navy);color:#fff;padding:60px 56px 50px;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;position:relative;overflow:hidden;}
.cover::before{content:'';position:absolute;inset:0;opacity:.03;background-image:radial-gradient(circle at 1px 1px,#fff 1px,transparent 0);background-size:28px 28px;}
.cover::after{content:'';position:absolute;top:0;right:0;width:45%;height:100%;background:radial-gradient(ellipse at 80% 40%,rgba(21,96,130,.18) 0%,transparent 70%);}
.cover *{position:relative;z-index:1;}
.cover-logo{width:48px;height:48px;border-radius:12px;margin-bottom:40px;}
.ca{display:flex;gap:5px;margin-bottom:32px;}
.ca span:nth-child(1){width:56px;height:4px;background:var(--gold);border-radius:2px;}
.ca span:nth-child(2){width:18px;height:4px;background:var(--teal);border-radius:2px;}
.ca span:nth-child(3){width:9px;height:4px;background:var(--orange);border-radius:2px;}
.cover h1{font-size:30pt;font-weight:800;line-height:1.08;margin-bottom:12px;}
.cover .gold{color:var(--gold);}
.cover .sub{font-size:13pt;color:rgba(255,255,255,.65);margin-bottom:6px;}
.tag{display:inline-block;padding:6px 22px;border-radius:20px;font-size:9pt;font-weight:700;margin-top:28px;}
.tag-teal{background:var(--teal);}
.tag-orange{background:var(--orange);}
.tag-gold{background:var(--gold);color:var(--navy);}
.cc{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:24px 28px;margin-top:36px;}
.cg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px 28px;}
.cg .l{font-size:7.5pt;text-transform:uppercase;letter-spacing:1.2px;color:rgba(255,255,255,.35);margin-bottom:3px;}
.cg .v{font-size:10pt;color:rgba(255,255,255,.9);}
.cf{margin-top:36px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;}
.cf .br{font-size:9pt;font-weight:700;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:8px;}
.cf .br img{width:18px;height:18px;border-radius:4px;}
.cf .co{font-size:7.5pt;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:1.5px;}
.wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80pt;font-weight:900;color:rgba(0,0,0,.02);pointer-events:none;letter-spacing:8px;z-index:0;white-space:nowrap;}
.pg{padding:0 56px;max-width:210mm;margin:0 auto;}
.ph{display:flex;justify-content:space-between;align-items:center;padding:18px 0 14px;border-bottom:2px solid var(--light);margin-bottom:22px;}
.ph .lt{display:flex;align-items:center;gap:8px;}
.ph .lt img{width:20px;height:20px;border-radius:4px;}
.ph .lt span{font-size:8.5pt;font-weight:700;color:var(--navy);}
.ph .rt{font-size:7.5pt;color:var(--gray-light);}
.pf{margin-top:28px;padding:12px 0;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:7pt;color:var(--gray-light);page-break-after:always;}
h2{font-size:15pt;font-weight:800;color:var(--navy);margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--light);display:flex;align-items:center;gap:8px;}
h2 .ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;}
h2 .ic.t{background:rgba(21,96,130,.1);color:var(--teal);}
h2 .ic.o{background:rgba(255,95,0,.1);color:var(--orange);}
h2 .ic.g{background:rgba(39,174,96,.1);color:var(--success);}
h2 .ic.r{background:rgba(231,76,60,.1);color:var(--danger);}
h2 .ic.gl{background:rgba(255,192,0,.12);color:#B8860B;}
h3{font-size:11pt;font-weight:700;color:var(--teal);margin:18px 0 6px;}
p{margin-bottom:8px;}
.mu{color:var(--gray);}.sm{font-size:8.5pt;}.xs{font-size:7.5pt;}
strong{color:var(--navy);}
.ks{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0;}
.k{background:var(--light);border-radius:10px;padding:14px 16px;text-align:center;border-top:3px solid var(--teal);}
.k:nth-child(2){border-top-color:var(--success);}
.k:nth-child(3){border-top-color:var(--danger);}
.k:nth-child(4){border-top-color:var(--gold);}
.k .n{font-size:20pt;font-weight:800;color:var(--navy);line-height:1.1;}
.k .lb{font-size:7pt;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin-top:3px;}
.gw{display:flex;align-items:center;gap:24px;margin:16px 0;}
.ga{position:relative;width:140px;height:70px;overflow:hidden;}
.ga-bg{position:absolute;bottom:0;left:0;width:140px;height:70px;border-radius:70px 70px 0 0;background:conic-gradient(from 180deg at 50% 100%,var(--danger) 0deg,var(--warning) 90deg,var(--success) 180deg);}
.ga-m{position:absolute;bottom:0;left:10px;width:120px;height:60px;border-radius:60px 60px 0 0;background:#fff;}
.ga-n{position:absolute;bottom:0;left:70px;width:2px;height:58px;background:var(--navy);border-radius:1px;transform-origin:bottom center;}
.ga-v{position:absolute;bottom:4px;left:0;width:140px;text-align:center;font-size:18pt;font-weight:800;color:var(--navy);}
.gi{flex:1;}.gi .ti{font-size:10pt;font-weight:700;color:var(--navy);margin-bottom:4px;}.gi .de{font-size:8.5pt;color:var(--gray);line-height:1.5;}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:8.5pt;}
th{background:var(--navy);color:#fff;padding:7px 10px;text-align:left;font-size:7pt;text-transform:uppercase;letter-spacing:.6px;font-weight:600;}
th:first-child{border-radius:6px 0 0 0;}th:last-child{border-radius:0 6px 0 0;}
td{padding:6px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top;}
tr:hover td{background:rgba(21,96,130,.015);}
.nc{text-align:right;font-variant-numeric:tabular-nums;}
tfoot td{background:var(--light);font-weight:700;}
.b{display:inline-flex;align-items:center;gap:3px;font-size:7pt;padding:2px 8px;border-radius:10px;font-weight:600;}
.bg{background:rgba(39,174,96,.1);color:var(--success);}
.bo{background:rgba(255,95,0,.1);color:var(--orange);}
.br2{background:rgba(231,76,60,.1);color:var(--danger);}
.bgy{background:rgba(107,114,128,.1);color:var(--gray);}
.bt{background:rgba(21,96,130,.1);color:var(--teal);}
.cl{border-radius:10px;padding:14px 18px;margin:14px 0;display:flex;gap:12px;align-items:flex-start;}
.cl .ci{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;}
.cl.info{background:rgba(21,96,130,.05);border:1px solid rgba(21,96,130,.12);}
.cl.info .ci{background:rgba(21,96,130,.1);color:var(--teal);}
.cl.warn{background:rgba(255,192,0,.06);border:1px solid rgba(255,192,0,.15);}
.cl.warn .ci{background:rgba(255,192,0,.15);color:#B8860B;}
.cl.next{background:rgba(39,174,96,.05);border:1px solid rgba(39,174,96,.12);}
.cl.next .ci{background:rgba(39,174,96,.1);color:var(--success);}
.cl.danger{background:rgba(231,76,60,.05);border:1px solid rgba(231,76,60,.12);}
.cl.danger .ci{background:rgba(231,76,60,.1);color:var(--danger);}
.cl .bd{flex:1;font-size:9pt;}.cl .bd strong{display:block;margin-bottom:4px;}
.tl{display:flex;gap:0;margin:14px 0;border-radius:10px;overflow:hidden;}
.ts{flex:1;padding:10px 12px;text-align:center;}
.ts .tn{font-size:14pt;font-weight:800;}
.ts .tt{font-size:6.5pt;text-transform:uppercase;letter-spacing:.6px;margin-top:1px;}
.ta{background:var(--teal);color:#fff;}
.tao{background:var(--orange);color:#fff;}
.td2{background:rgba(39,174,96,.12);color:var(--success);}
.tp{background:var(--light);color:var(--gray-light);}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle;}
.dr{background:var(--danger);}.do2{background:var(--orange);}.dg{background:var(--success);}
.pf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0;}
.pf-c{border-radius:10px;padding:14px 16px;text-align:center;border:1px solid #eee;position:relative;overflow:hidden;}
.pf-c .bar{position:absolute;top:0;left:0;right:0;height:3px;}
.pf-c .val{font-size:18pt;font-weight:800;line-height:1.2;}
.pf-c .lab{font-size:7.5pt;color:var(--gray);margin-top:3px;}
.pf-c .sub2{font-size:7pt;color:var(--gray-light);margin-top:2px;}
.pf-c.grn{background:rgba(39,174,96,.04);}.pf-c.grn .bar{background:var(--success);}.pf-c.grn .val{color:var(--success);}
.pf-c.org{background:rgba(255,95,0,.04);}.pf-c.org .bar{background:var(--orange);}.pf-c.org .val{color:var(--orange);}
.pf-c.red2{background:rgba(231,76,60,.04);}.pf-c.red2 .bar{background:var(--danger);}.pf-c.red2 .val{color:var(--danger);}
.bf{height:6px;border-radius:3px;background:var(--teal);margin-top:4px;}
.lg{border-left:3px solid var(--teal);padding:8px 14px;margin:7px 0;background:rgba(21,96,130,.025);border-radius:0 8px 8px 0;}
.lg .nm{font-weight:700;font-size:9pt;color:var(--navy);}.lg .ds{font-size:8pt;color:var(--gray);margin-top:1px;}
.ix{background:var(--light);border-radius:10px;padding:16px 20px;margin:14px 0 20px;}
.ix-t{font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:var(--gray);margin-bottom:8px;font-weight:700;}
.ix ol{margin:0;padding-left:18px;}.ix li{font-size:9pt;padding:2px 0;color:var(--navy);}
@media print{.cover{min-height:auto;padding:50px 0;}.pg{padding:0;}.wm{display:none;}}
"""


# ── Helper functions ──

def _detail(label: str, value: str) -> str:
    return f'<div><div class="l">{label}</div><div class="v">{value}</div></div>'


def _timeline(steps: list[tuple[str, str, str]]) -> str:
    """steps: list of (num, label, css_class)"""
    items = "".join(
        f'<div class="ts {cls}"><div class="tn">{num}</div><div class="tt">{label}</div></div>'
        for num, label, cls in steps
    )
    return f'<div class="tl">{items}</div>'


def _page_header(right: str) -> str:
    logo = _get_logo()
    return f'<div class="ph"><div class="lt"><img src="{logo}" alt=""><span>Summo Quartile - Due Diligence Ambiental</span></div><div class="rt">{right}</div></div>'


def _page_footer(left: str, page: str) -> str:
    return f'<div class="pf"><span>{left}</span><span>Pagina {page}</span></div>'


def _cover(title: str, subtitle: str, company: str, sub2: str, tag_text: str, tag_class: str, details: list[tuple[str, str]]) -> str:
    logo = _get_logo()
    dets = "".join(_detail(l, v) for l, v in details)
    return f"""<div class="cover">
<div><img src="{logo}" class="cover-logo" alt=""><div class="ca"><span></span><span></span><span></span></div>
<h1>{title}</h1><p class="sub">{company}</p><p class="sub" style="color:rgba(255,255,255,.4);font-size:10.5pt;">{sub2}</p>
<span class="tag {tag_class}">{tag_text}</span></div>
<div><div class="cc"><div class="cg">{dets}</div></div>
<div class="cf"><span class="br"><img src="{logo}" alt="">Summo Quartile . summoquartile.com</span><span class="co">Confidencial</span></div></div></div>"""


def _html_wrap(title: str, body: str) -> str:
    return f"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title><style>{REPORT_CSS}</style></head><body>
<div class="wm">CONFIDENCIAL</div>
{body}
</body></html>"""


def _fmt_date(dt: datetime | None = None) -> str:
    d = dt or datetime.now()
    meses = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]
    return f"{d.day} de {meses[d.month-1]} de {d.year}"


def _fmt_num(n: int | float) -> str:
    if isinstance(n, float):
        return f"{n:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{n:,}".replace(",", ".")


# ══════════════════════════════════════════════════════════════════
# PUBLIC API: render functions
# ══════════════════════════════════════════════════════════════════


def render_viabilidade(data: dict) -> str:
    """Gera relatório de Análise de Viabilidade a partir dos dados do endpoint."""
    perfil = data.get("perfil", {})
    fatores = data.get("fatores", [])
    escopo = data.get("escopo", {})
    inp = data.get("input", {})
    prob = perfil.get("probabilidade", 0) or 0
    angle = prob * 1.8

    # Fatores rows
    fator_rows = ""
    for f in fatores:
        bc = "br2" if f["risco"] == "alto" else "bo" if f["risco"] == "moderado" else "bg"
        fator_rows += f'<tr><td>{f["fator"]}</td><td>{f["valor"]}</td><td><span class="b {bc}">{f["risco"].title()}</span></td></tr>'

    cover = _cover(
        'Analise de<br><span class="gold">Viabilidade</span>', "",
        "Analise Preliminar",
        f'{escopo.get("licenca_tipo","")} . Classe {inp.get("classe","")} . {inp.get("atividade","")}',
        "Analise Preliminar de Viabilidade", "tag-gold",
        [("Atividade", inp.get("atividade", "")),
         ("Classe", str(inp.get("classe", ""))),
         ("Modalidade", escopo.get("licenca_tipo", "")),
         ("Emissao", _fmt_date()),
         ("Validade", "90 dias"),
         ("Risco Geral", data.get("risco_geral", "").title())]
    )

    body = f"""{cover}
<div class="pg">{_page_header("Analise de Viabilidade")}

<h2><span class="ic t">&#9432;</span> Perfil de Licenciamento</h2>

<div class="gw">
<div class="ga"><div class="ga-bg"></div><div class="ga-m"></div><div class="ga-n" style="--angle:{angle}deg;"></div><div class="ga-v">{prob}%</div></div>
<div class="gi"><div class="ti">Probabilidade de Aprovacao: {prob}%</div>
<div class="de">Baseado em {_fmt_num(perfil.get("n_decisoes",0))} decisoes. Media geral: {perfil.get("media_geral",78.3)}%.</div></div></div>

<div class="pf-grid">
<div class="pf-c {"org" if prob < 65 else "grn"}"><div class="bar"></div><div class="val">{prob}%</div><div class="lab">Probabilidade</div></div>
<div class="pf-c {"red2" if (perfil.get("rigor_delta") or 0) < -3 else "grn"}"><div class="bar"></div><div class="val">{perfil.get("rigor_delta",0):+.1f}pp</div><div class="lab">Rigor Regional</div></div>
<div class="pf-c {"grn" if (perfil.get("tendencia") or 0) >= 0 else "org"}"><div class="bar"></div><div class="val">{perfil.get("tendencia",0):+.1f}pp</div><div class="lab">Tendencia 3 anos</div></div>
</div>

<h2><span class="ic o">&#9888;</span> Fatores de Atencao</h2>
<table><thead><tr><th>Fator</th><th>Valor</th><th>Risco</th></tr></thead>
<tbody>{fator_rows}</tbody></table>

<h2><span class="ic gl">&#9776;</span> Estimativa de Escopo</h2>
<div class="ks">
<div class="k"><div class="n">~{escopo.get("n_documentos",0)}</div><div class="lb">Documentos</div></div>
<div class="k"><div class="n">~{_fmt_num(escopo.get("n_requisitos",0))}</div><div class="lb">Requisitos</div></div>
<div class="k"><div class="n">{escopo.get("n_normas",6)}</div><div class="lb">Normas</div></div>
<div class="k"><div class="n">5</div><div class="lb">Relatorios</div></div>
</div>

<div class="cl {"warn" if data.get("risco_geral") != "baixo" else "next"}">
<div class="ci">{"&#9888;" if data.get("risco_geral") != "baixo" else "&#10004;"}</div>
<div class="bd"><strong>{data.get("recomendacao","")}</strong>
{"A DD reduz significativamente o risco de exigencias complementares." if data.get("risco_geral") != "baixo" else "Mesmo com perfil favoravel, a DD garante conformidade total."}</div></div>

<p class="xs mu" style="margin-top:16px;">Analise baseada em dados publicos historicos. Nao constitui garantia de resultado. Validade: 90 dias.</p>
{_page_footer("Summo Quartile . summoquartile.com", "1/1")}
</div>"""

    return _html_wrap("Analise de Viabilidade - Summo Quartile", body)


def render_dd_fase1(
    licenca_tipo: str,
    licenca_desc: str,
    atividade: str,
    classe: int,
    n_docs: int,
    n_reqs: int,
    perfil: dict,
    ref: str = "",
) -> str:
    """Gera relatório DD Fase 1 — Configuração e Escopo."""
    prob = perfil.get("probabilidade", 0) or 0
    angle = prob * 1.8
    ref = ref or f"DD-{datetime.now().strftime('%Y')}-{datetime.now().strftime('%m%d')}-R1"

    cover = _cover(
        'Due Diligence<br><span class="gold">Ambiental</span>', "",
        "Configuracao e Escopo",
        f"{licenca_tipo} . Classe {classe} . {atividade}",
        f"Relatorio 1/5 - Configuracao e Escopo", "tag-teal",
        [("Atividade", atividade), ("Classe", str(classe)), ("Modalidade", licenca_tipo),
         ("Emissao", _fmt_date()), ("Validade", "90 dias"), ("Referencia", ref)]
    )

    tl = _timeline([("1","Config","ta"),("2","Docs","tp"),("3","Avaliacao","tp"),("4","Plano","tp"),("5","Resultado","tp")])

    body = f"""{cover}
<div class="pg">{_page_header(f"{ref} . Fase 1/5")}

<h2><span class="ic t">&#9432;</span> Sumario Executivo</h2>
<p>Relatorio de configuracao e escopo para licenciamento <strong>{licenca_tipo}</strong> ({licenca_desc}), classe <strong>{classe}</strong>, atividade <strong>{atividade}</strong>.</p>

<div class="ks">
<div class="k"><div class="n">{n_docs}</div><div class="lb">Documentos</div></div>
<div class="k"><div class="n">{_fmt_num(n_reqs)}</div><div class="lb">Requisitos</div></div>
<div class="k"><div class="n">6</div><div class="lb">Normas</div></div>
<div class="k"><div class="n">{prob}%</div><div class="lb">Probabilidade</div></div>
</div>

{tl}

<h2><span class="ic o">&#9888;</span> Perfil de Licenciamento</h2>
<div class="gw">
<div class="ga"><div class="ga-bg"></div><div class="ga-m"></div><div class="ga-n" style="--angle:{angle}deg;"></div><div class="ga-v">{prob}%</div></div>
<div class="gi"><div class="ti">Probabilidade: {prob}%</div>
<div class="de">Media geral: {perfil.get("media_geral",78.3)}%. Rigor: {perfil.get("rigor_delta",0):+.1f}pp. Tendencia: {perfil.get("tendencia",0):+.1f}pp.</div></div></div>

<h2><span class="ic gl">&#9776;</span> Escopo Documental</h2>
<p><strong>{n_docs}</strong> documentos aplicaveis e <strong>{_fmt_num(n_reqs)}</strong> requisitos de conformidade para a modalidade {licenca_tipo}.</p>

<div class="cl next"><div class="ci">&#10132;</div><div class="bd"><strong>Fase 2 - Diagnostico Documental</strong>Prazo para envio da documentacao: ate <strong>{_fmt_date(datetime.now() + timedelta(days=5))}</strong> (5 dias uteis).</div></div>

<table><thead><tr><th>Fase</th><th>Entregavel</th><th>Status</th></tr></thead><tbody>
<tr><td>1. Configuracao</td><td>Este relatorio</td><td><span class="b bg">Concluido</span></td></tr>
<tr><td>2. Documentos</td><td>Diagnostico documental</td><td><span class="b bgy">Pendente</span></td></tr>
<tr><td>3. Avaliacao</td><td>Conformidade</td><td><span class="b bgy">Pendente</span></td></tr>
<tr><td>4. Plano de Acao</td><td>PDCA</td><td><span class="b bgy">Pendente</span></td></tr>
<tr><td>5. Resultado</td><td>Relatorio final</td><td><span class="b bgy">Pendente</span></td></tr>
</tbody></table>

<p class="xs mu" style="margin-top:14px;">Documento consultivo. Validade: 90 dias.</p>
{_page_footer("Summo Quartile . " + ref, "1/1")}
</div>"""

    return _html_wrap(f"{ref} - Fase 1", body)


def render_dd_fase2(
    licenca_tipo: str,
    licenca_desc: str,
    atividade: str,
    classe: int,
    documents: list[dict],
    doc_status: dict[str, dict],
    ref: str = "",
) -> str:
    """Fase 2 — Diagnóstico Documental (inventário + status de upload)."""
    ref = ref or f"DD-{datetime.now().strftime('%Y-%m%d')}-R2"
    total = len(documents)
    apresentados = sum(1 for d in documents if doc_status.get(d.get("doc_name") or d.get("nome_documento") or "", {}).get("status") == "apresentado")
    ausentes = total - apresentados
    pct = round(100.0 * apresentados / total, 1) if total else 0.0

    cover = _cover(
        'Diagnostico<br><span class="gold">Documental</span>', "",
        "Fase 2/5 - Inventario e Status",
        f"{licenca_tipo} . Classe {classe} . {atividade}",
        "Relatorio 2/5 - Diagnostico Documental", "tag-teal",
        [("Atividade", atividade), ("Classe", str(classe)), ("Modalidade", licenca_tipo),
         ("Emissao", _fmt_date()), ("Documentos", str(total)), ("Referencia", ref)]
    )

    tl = _timeline([("1","Config","td2"),("2","Docs","ta"),("3","Avaliacao","tp"),("4","Plano","tp"),("5","Resultado","tp")])

    rows = ""
    for d in documents[:60]:
        nm = d.get("doc_name") or d.get("nome_documento") or ""
        st = doc_status.get(nm, {}).get("status") or "pendente"
        if st == "apresentado":
            bc, label = "bg", "Apresentado"
        elif st == "ausente":
            bc, label = "br2", "Ausente"
        else:
            bc, label = "bgy", "Pendente"
        rows += f'<tr><td>{nm}</td><td>{d.get("doc_id") or "-"}</td><td><span class="b {bc}">{label}</span></td></tr>'

    body = f"""{cover}
<div class="pg">{_page_header(f"{ref} . Fase 2/5")}

<h2><span class="ic t">&#9432;</span> Sumario do Diagnostico</h2>

<div class="ks">
<div class="k"><div class="n">{total}</div><div class="lb">Documentos</div></div>
<div class="k"><div class="n">{apresentados}</div><div class="lb">Apresentados</div></div>
<div class="k"><div class="n">{ausentes}</div><div class="lb">Ausentes</div></div>
<div class="k"><div class="n">{pct}%</div><div class="lb">Cobertura</div></div>
</div>

{tl}

<h2><span class="ic gl">&#9776;</span> Inventario de Documentos</h2>
<table><thead><tr><th>Documento</th><th>Codigo</th><th>Status</th></tr></thead>
<tbody>{rows}</tbody></table>

<div class="cl {"next" if pct >= 80 else "warn"}"><div class="ci">{"&#10004;" if pct >= 80 else "&#9888;"}</div><div class="bd">
<strong>{"Cobertura adequada - prossiga para avaliacao." if pct >= 80 else "Cobertura incompleta - complete envio antes da avaliacao."}</strong>
{ausentes} documentos pendentes de envio.</div></div>

<p class="xs mu" style="margin-top:14px;">Diagnostico inicial. Valido por 30 dias.</p>
{_page_footer("Summo Quartile . " + ref, "1/1")}
</div>"""
    return _html_wrap(f"{ref} - Fase 2", body)


def render_dd_fase3(
    licenca_tipo: str,
    licenca_desc: str,
    atividade: str,
    classe: int,
    evaluations: dict[str, str],
    criticality: dict[str, str] | None = None,
    ref: str = "",
) -> str:
    """Fase 3 — Avaliação de requisitos + criticidade."""
    ref = ref or f"DD-{datetime.now().strftime('%Y-%m%d')}-R3"
    criticality = criticality or {}

    counts = {"atende": 0, "atende_parcial": 0, "nao_atende": 0, "nao_aplica": 0}
    for v in evaluations.values():
        k = v.replace(" ", "_").lower().replace("atende_parcialmente", "atende_parcial").replace("não_atende", "nao_atende").replace("não_aplica", "nao_aplica")
        if k in counts:
            counts[k] += 1

    total = sum(counts.values()) or 1
    conformidade = round(100.0 * (counts["atende"] + 0.5 * counts["atende_parcial"]) / max(1, total - counts["nao_aplica"]), 1)
    angle = conformidade * 1.8

    crit_counts = {"alta": 0, "media": 0, "baixa": 0}
    for v in criticality.values():
        k = (v or "").lower()
        if k in crit_counts:
            crit_counts[k] += 1

    cover = _cover(
        'Avaliacao de<br><span class="gold">Conformidade</span>', "",
        "Fase 3/5 - Requisitos e Criticidade",
        f"{licenca_tipo} . Classe {classe} . {atividade}",
        "Relatorio 3/5 - Avaliacao e Criticidade", "tag-orange",
        [("Atividade", atividade), ("Classe", str(classe)), ("Modalidade", licenca_tipo),
         ("Emissao", _fmt_date()), ("Requisitos", str(total)), ("Referencia", ref)]
    )

    tl = _timeline([("1","Config","td2"),("2","Docs","td2"),("3","Avaliacao","ta"),("4","Plano","tp"),("5","Resultado","tp")])

    body = f"""{cover}
<div class="pg">{_page_header(f"{ref} . Fase 3/5")}

<h2><span class="ic t">&#9432;</span> Resultado da Avaliacao</h2>

<div class="gw">
<div class="ga"><div class="ga-bg"></div><div class="ga-m"></div><div class="ga-n" style="--angle:{angle}deg;"></div><div class="ga-v">{conformidade}%</div></div>
<div class="gi"><div class="ti">Conformidade: {conformidade}%</div>
<div class="de">{total} requisitos avaliados.</div></div></div>

<div class="ks">
<div class="k"><div class="n">{counts["atende"]}</div><div class="lb">Atende</div></div>
<div class="k"><div class="n">{counts["atende_parcial"]}</div><div class="lb">Parcial</div></div>
<div class="k"><div class="n">{counts["nao_atende"]}</div><div class="lb">Nao Atende</div></div>
<div class="k"><div class="n">{counts["nao_aplica"]}</div><div class="lb">Nao Aplica</div></div>
</div>

{tl}

<h2><span class="ic r">&#9888;</span> Matriz de Criticidade</h2>
<div class="pf-grid">
<div class="pf-c red2"><div class="bar"></div><div class="val">{crit_counts["alta"]}</div><div class="lab">Criticidade Alta</div></div>
<div class="pf-c org"><div class="bar"></div><div class="val">{crit_counts["media"]}</div><div class="lab">Criticidade Media</div></div>
<div class="pf-c grn"><div class="bar"></div><div class="val">{crit_counts["baixa"]}</div><div class="lab">Criticidade Baixa</div></div>
</div>

<div class="cl {"danger" if counts["nao_atende"] > 5 else "warn" if counts["nao_atende"] > 0 else "next"}">
<div class="ci">{"&#10060;" if counts["nao_atende"] > 5 else "&#9888;" if counts["nao_atende"] > 0 else "&#10004;"}</div>
<div class="bd"><strong>{counts["nao_atende"]} nao-conformidades identificadas.</strong>
{"Elaboracao de plano de acao PDCA recomendada (Fase 4)." if counts["nao_atende"] > 0 else "Conformidade plena. Prossiga para Fase 4."}</div></div>

<p class="xs mu" style="margin-top:14px;">Avaliacao tecnica. Valida por 60 dias.</p>
{_page_footer("Summo Quartile . " + ref, "1/1")}
</div>"""
    return _html_wrap(f"{ref} - Fase 3", body)


def render_dd_fase4(
    licenca_tipo: str,
    licenca_desc: str,
    atividade: str,
    classe: int,
    action_items: list[dict],
    ref: str = "",
) -> str:
    """Fase 4 — Plano de Ação PDCA."""
    ref = ref or f"DD-{datetime.now().strftime('%Y-%m%d')}-R4"
    total = len(action_items)
    alta = sum(1 for a in action_items if (a.get("criticidade") or "").lower() == "alta")
    media = sum(1 for a in action_items if (a.get("criticidade") or "").lower() == "media")
    baixa = sum(1 for a in action_items if (a.get("criticidade") or "").lower() == "baixa")

    cover = _cover(
        'Plano de<br><span class="gold">Acao PDCA</span>', "",
        "Fase 4/5 - Plano Corretivo",
        f"{licenca_tipo} . Classe {classe} . {atividade}",
        "Relatorio 4/5 - Plano de Acao", "tag-orange",
        [("Atividade", atividade), ("Classe", str(classe)), ("Modalidade", licenca_tipo),
         ("Emissao", _fmt_date()), ("Acoes", str(total)), ("Referencia", ref)]
    )

    tl = _timeline([("1","Config","td2"),("2","Docs","td2"),("3","Avaliacao","td2"),("4","Plano","tao"),("5","Resultado","tp")])

    rows = ""
    for a in action_items[:40]:
        crit = (a.get("criticidade") or "").lower()
        bc = "br2" if crit == "alta" else "bo" if crit == "media" else "bg"
        rows += f"""<tr>
<td>{a.get("documento", "-")}</td>
<td>{a.get("requisito", "-")}</td>
<td><span class="b {bc}">{crit.title() or "-"}</span></td>
<td>{a.get("acao", "-")}</td>
<td>{a.get("prazo", "-")}</td>
</tr>"""

    body = f"""{cover}
<div class="pg">{_page_header(f"{ref} . Fase 4/5")}

<h2><span class="ic t">&#9432;</span> Sumario do Plano</h2>

<div class="ks">
<div class="k"><div class="n">{total}</div><div class="lb">Acoes</div></div>
<div class="k"><div class="n">{alta}</div><div class="lb">Criticas</div></div>
<div class="k"><div class="n">{media}</div><div class="lb">Medias</div></div>
<div class="k"><div class="n">{baixa}</div><div class="lb">Baixas</div></div>
</div>

{tl}

<h2><span class="ic o">&#9776;</span> Ciclo PDCA</h2>
<p><strong>P</strong>lan: identificacao e priorizacao / <strong>D</strong>o: execucao das acoes corretivas / <strong>C</strong>heck: verificacao de eficacia / <strong>A</strong>ct: padronizacao e melhoria continua.</p>

<h2><span class="ic gl">&#9776;</span> Acoes Corretivas</h2>
<table><thead><tr><th>Documento</th><th>Requisito</th><th>Criticidade</th><th>Acao</th><th>Prazo</th></tr></thead>
<tbody>{rows or '<tr><td colspan="5" class="mu">Nenhuma acao pendente</td></tr>'}</tbody></table>

<div class="cl info"><div class="ci">&#9432;</div><div class="bd">
<strong>Responsaveis a designar</strong>Atribua responsavel e prazo para cada acao antes do protocolo.</div></div>

<p class="xs mu" style="margin-top:14px;">Plano de acao. Revisar trimestralmente.</p>
{_page_footer("Summo Quartile . " + ref, "1/1")}
</div>"""
    return _html_wrap(f"{ref} - Fase 4", body)


def render_dd_fase5(
    licenca_tipo: str,
    licenca_desc: str,
    atividade: str,
    classe: int,
    result: dict,
    n_documentos: int,
    ref: str = "",
) -> str:
    """Fase 5 — Resultado final."""
    ref = ref or f"DD-{datetime.now().strftime('%Y-%m%d')}-R5"
    score = round((result.get("conformidade_nao_ponderada", 0) or 0) * 100, 1)
    angle = score * 1.8
    classificacao = result.get("classificacao", "-")
    descricao = result.get("descricao", "")

    cover = _cover(
        'Resultado<br><span class="gold">Final</span>', "",
        "Fase 5/5 - Relatorio Conclusivo",
        f"{licenca_tipo} . Classe {classe} . {atividade}",
        "Relatorio 5/5 - Resultado Final", "tag-gold",
        [("Atividade", atividade), ("Classe", str(classe)), ("Modalidade", licenca_tipo),
         ("Emissao", _fmt_date()), ("Score", f"{score}%"), ("Referencia", ref)]
    )

    tl = _timeline([("1","Config","td2"),("2","Docs","td2"),("3","Avaliacao","td2"),("4","Plano","td2"),("5","Resultado","ta")])

    atende = result.get("atende", 0)
    parcial = result.get("atende_parcial", 0)
    nao_atende = result.get("nao_atende", 0)
    nao_aplica = result.get("nao_aplica", 0)

    body = f"""{cover}
<div class="pg">{_page_header(f"{ref} . Fase 5/5")}

<h2><span class="ic t">&#9432;</span> Score de Conformidade</h2>

<div class="gw">
<div class="ga"><div class="ga-bg"></div><div class="ga-m"></div><div class="ga-n" style="--angle:{angle}deg;"></div><div class="ga-v">{score}%</div></div>
<div class="gi"><div class="ti">{classificacao}</div>
<div class="de">{descricao}</div></div></div>

<div class="ks">
<div class="k"><div class="n">{atende}</div><div class="lb">Atende</div></div>
<div class="k"><div class="n">{parcial}</div><div class="lb">Parcial</div></div>
<div class="k"><div class="n">{nao_atende}</div><div class="lb">Nao Atende</div></div>
<div class="k"><div class="n">{nao_aplica}</div><div class="lb">Nao Aplica</div></div>
</div>

{tl}

<h2><span class="ic gl">&#9776;</span> Perfil da Operacao</h2>
<table>
<tr><th>Item</th><th>Valor</th></tr>
<tr><td>Modalidade de licenciamento</td><td><strong>{licenca_tipo}</strong> - {licenca_desc}</td></tr>
<tr><td>Atividade</td><td>{atividade}</td></tr>
<tr><td>Classe de impacto</td><td>Classe {classe}</td></tr>
<tr><td>Documentos analisados</td><td>{n_documentos}</td></tr>
<tr><td>Requisitos avaliados</td><td>{result.get("requisitos_aplicaveis", atende+parcial+nao_atende)}</td></tr>
</table>

<div class="cl {"next" if score >= 80 else "warn" if score >= 60 else "danger"}">
<div class="ci">{"&#10004;" if score >= 80 else "&#9888;" if score >= 60 else "&#10060;"}</div>
<div class="bd"><strong>{"Conformidade adequada - Pronto para protocolo." if score >= 80 else "Conformidade parcial - Ajustes recomendados." if score >= 60 else "Conformidade critica - Plano de acao mandatorio."}</strong>
{"Recomenda-se protocolar a licenca com os documentos atuais." if score >= 80 else "Revise o plano de acao da Fase 4 antes do protocolo."}</div></div>

<p class="xs mu" style="margin-top:14px;">Relatorio conclusivo da Due Diligence. Validade: 180 dias.</p>
{_page_footer("Summo Quartile . " + ref, "1/1")}
</div>"""
    return _html_wrap(f"{ref} - Fase 5", body)
