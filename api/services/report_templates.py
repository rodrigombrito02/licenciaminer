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


def render_proposta_tecnica_viabilidade(data: dict) -> str:
    """Gera Proposta Tecnica (HTML) a partir de uma analise de viabilidade.

    Inclui escopo da DD recomendada, cronograma macro, entregaveis, condicoes
    gerais e validade. NAO inclui preco — decisao comercial dos socios.
    """
    perfil = data.get("perfil", {})
    escopo = data.get("escopo", {})
    inp = data.get("input", {})
    empresa = data.get("empresa") or {}
    fatores = data.get("fatores", [])

    prob = perfil.get("probabilidade") or 0
    risco_geral = data.get("risco_geral", "moderado")

    # Tag color por risco
    if risco_geral == "alto":
        tag_class, tag_text = "tag-orange", "DD Completa Recomendada"
    elif risco_geral == "moderado":
        tag_class, tag_text = "tag-teal", "DD Padrao Recomendada"
    else:
        tag_class, tag_text = "tag-gold", "DD Simplificada Recomendada"

    titulo_empresa = empresa.get("razao_social") or "Empreendimento a definir"
    cnpj_str = inp.get("cnpj") or empresa.get("cnpj") or "-"
    if cnpj_str and len(cnpj_str) == 14 and cnpj_str.isdigit():
        cnpj_str = f"{cnpj_str[:2]}.{cnpj_str[2:5]}.{cnpj_str[5:8]}/{cnpj_str[8:12]}-{cnpj_str[12:]}"

    ref = f"PROP-VIAB-{datetime.now().strftime('%Y%m%d')}"

    # Cronograma adaptativo conforme risco
    cronograma = [
        ("Semana 1", "Configuracao e escopo (Fase 1)", "Reuniao kick-off, escopo formal, plano de DD"),
        ("Semana 2-3", "Diagnostico documental (Fase 2)", "Coleta + checklist + inventario completo"),
        ("Semana 4-5", "Avaliacao tecnica (Fase 3)", "Analise de requisitos + matriz de criticidade"),
    ]
    if risco_geral != "baixo":
        cronograma.extend([
            ("Semana 6", "Plano de acao PDCA (Fase 4)", "Acoes corretivas + responsaveis + prazos"),
            ("Semana 7-8", "Resultado final (Fase 5)", "Relatorio conclusivo + apresentacao"),
        ])
    else:
        cronograma.append(
            ("Semana 6", "Resultado integrado (Fase 4+5)", "Relatorio + plano de acao consolidado")
        )

    cronograma_rows = "".join(
        f'<tr><td><strong>{s}</strong></td><td>{ent}</td><td class="mu sm">{det}</td></tr>'
        for s, ent, det in cronograma
    )

    # Entregaveis
    entregaveis = [
        "Relatorio de Configuracao e Escopo (R1)",
        "Diagnostico Documental com inventario completo (R2)",
        "Avaliacao de Conformidade + Matriz de Criticidade (R3)",
    ]
    if risco_geral != "baixo":
        entregaveis.append("Plano de Acao PDCA estruturado (R4)")
    entregaveis.extend([
        "Relatorio Conclusivo com score de conformidade (R5)",
        "Planilha XLSX de acompanhamento (4 abas)",
        "Apresentacao executiva (versao para Conselho)",
    ])

    entregaveis_html = "".join(f"<li>{e}</li>" for e in entregaveis)

    # Fatores de risco
    fator_rows = ""
    for f in fatores:
        bc = "br2" if f.get("risco") == "alto" else "bo" if f.get("risco") == "moderado" else "bg"
        fator_rows += f'<tr><td>{f.get("fator","")}</td><td>{f.get("valor","")}</td><td><span class="b {bc}">{f.get("risco","").title()}</span></td></tr>'

    cover = _cover(
        'Proposta<br><span class="gold">Tecnica</span>',
        "",
        titulo_empresa,
        f'Due Diligence Ambiental . {escopo.get("licenca_tipo","")} . Classe {inp.get("classe","")}',
        tag_text, tag_class,
        [("Empreendimento", titulo_empresa),
         ("CNPJ", cnpj_str),
         ("Atividade", inp.get("atividade", "")),
         ("Modalidade", escopo.get("licenca_tipo", "")),
         ("Classe", f"Classe {inp.get('classe','')}"),
         ("Emissao", _fmt_date()),
         ("Validade", "30 dias"),
         ("Referencia", ref)]
    )

    body = f"""{cover}
<div class="pg">{_page_header(f"{ref} . Proposta Tecnica")}

<h2><span class="ic t">&#9432;</span> Objeto</h2>
<p>Esta proposta tem por objeto a contratacao dos servicos de
<strong>Due Diligence Ambiental</strong> da Summo Quartile para o empreendimento
<strong>{titulo_empresa}</strong>, modalidade
<strong>{escopo.get("licenca_tipo","")}</strong> ({escopo.get("licenca_desc","")}),
classe de impacto <strong>{inp.get("classe","")}</strong>, atividade
<strong>{inp.get("atividade","")}</strong>.</p>

<p>O escopo recomendado considera a analise preliminar de viabilidade conduzida,
que apurou <strong>{prob}% de probabilidade historica de aprovacao</strong> baseada em
{_fmt_num(perfil.get("n_decisoes", 0))} decisoes similares na base
SEMAD/MG e classificou o caso como <strong>risco geral {risco_geral.upper()}</strong>.</p>

<h2><span class="ic o">&#9888;</span> Fatores de Atencao</h2>
<table><thead><tr><th>Fator</th><th>Valor</th><th>Risco</th></tr></thead>
<tbody>{fator_rows}</tbody></table>

<h2><span class="ic gl">&#9776;</span> Escopo dos Servicos</h2>
<p>A Due Diligence Ambiental sera conduzida em <strong>{"3 fases" if risco_geral == "baixo" else "5 fases"}</strong>
do ciclo PDCA, com base no inventario completo aplicavel a modalidade
<strong>{escopo.get("licenca_tipo","")}</strong>:</p>

<div class="ks">
<div class="k"><div class="n">{escopo.get("n_documentos", 0)}</div><div class="lb">Documentos analisados</div></div>
<div class="k"><div class="n">{_fmt_num(escopo.get("n_requisitos", 0))}</div><div class="lb">Requisitos avaliados</div></div>
<div class="k"><div class="n">{escopo.get("n_normas", 6)}</div><div class="lb">Normas aplicaveis</div></div>
<div class="k"><div class="n">{"3" if risco_geral == "baixo" else "5"}</div><div class="lb">Fases PDCA</div></div>
</div>

<h2><span class="ic t">&#9432;</span> Cronograma Macro</h2>
<table><thead><tr><th>Periodo</th><th>Entrega</th><th>Detalhe</th></tr></thead>
<tbody>{cronograma_rows}</tbody>
<tfoot><tr><td colspan="3" style="text-align:right;"><strong>Prazo total estimado: {"6 semanas" if risco_geral == "baixo" else "8 semanas"}</strong></td></tr></tfoot>
</table>

<h2><span class="ic gl">&#9776;</span> Entregaveis</h2>
<ol style="padding-left:22px;font-size:10pt;line-height:1.8;">{entregaveis_html}</ol>

<h2><span class="ic t">&#9432;</span> Condicoes Gerais</h2>
<table>
<tr><td><strong>Validade desta proposta</strong></td><td>30 dias a partir da data de emissao</td></tr>
<tr><td><strong>Local de execucao</strong></td><td>Sede do CLIENTE + escritorios da Summo Quartile</td></tr>
<tr><td><strong>Metodologia</strong></td><td>DD em 5 fases (PDCA) sobre arcabouco regulatorio aplicavel</td></tr>
<tr><td><strong>Base de dados utilizada</strong></td><td>Sistema Summo Quartile (16+ fontes publicas oficiais, dados auditaveis)</td></tr>
<tr><td><strong>Equipe alocada</strong></td><td>Consultor senior responsavel + analista de dados + revisor independente</td></tr>
<tr><td><strong>Reunioes incluidas</strong></td><td>Kick-off + 3 reunioes de andamento + apresentacao final</td></tr>
<tr><td><strong>Condicoes comerciais</strong></td><td>A definir em sessao executiva com socios da Summo</td></tr>
</table>

<div class="cl info"><div class="ci">&#9432;</div><div class="bd">
<strong>Sobre o investimento</strong>
Os valores referentes a esta proposta serao apresentados em documento complementar,
apos confirmacao do escopo final pelo CLIENTE. A Summo Quartile considera modelos
flexiveis (projeto fechado, hora tecnica ou subscription) conforme conveniencia.
</div></div>

<p class="xs mu" style="margin-top:18px;">
Documento elaborado pela Summo Quartile . www.summoquartile.com . Confidencial.
Validade: 30 dias. Esta proposta nao constitui obrigacao contratual ate
formalizacao via instrumento juridico especifico.
</p>
{_page_footer("Summo Quartile . " + ref, "1/1")}
</div>"""

    return _html_wrap(f"{ref} - Proposta Tecnica - {titulo_empresa}", body)


def _render_gistm_block(gistm_data: dict | None) -> str:
    """Bloco premium GISTM no relatório — rating por princípio."""
    if not gistm_data or not gistm_data.get("principios"):
        return ""
    global_score = gistm_data.get("score_global_gistm")
    avaliados = gistm_data.get("principios_avaliados", 0)
    total_p = gistm_data.get("total_principios", 15)
    angle = (global_score or 0) * 1.8

    rows = ""
    for p in gistm_data["principios"]:
        score = p.get("score_pct")
        if score is None:
            bc, badge = "bgy", "Nao avaliado"
        elif score >= 80:
            bc, badge = "bg", f"{score}%"
        elif score >= 60:
            bc, badge = "bo", f"{score}%"
        else:
            bc, badge = "br2", f"{score}%"
        avaliados_p = p["total"] - p["nao_aplica"] - p["nao_avaliado"]
        rows += f"""<tr>
<td><strong>P{p["principio"]:02d}</strong></td>
<td>{p["nome"]}</td>
<td class="nc">{avaliados_p}/{p["total"]}</td>
<td class="nc">{p["atende"]}</td>
<td class="nc">{p["parcial"]}</td>
<td class="nc">{p["nao_atende"]}</td>
<td><span class="b {bc}">{badge}</span></td>
</tr>"""

    score_label = f"{global_score}%" if global_score is not None else "n/d"
    color_classe = "next" if (global_score or 0) >= 80 else "warn" if (global_score or 0) >= 60 else "danger"
    icon = "&#10004;" if (global_score or 0) >= 80 else "&#9888;" if (global_score or 0) >= 60 else "&#10060;"
    summary = (
        "Aderencia GISTM compativel com expectativa ICMM para disclosure publico."
        if (global_score or 0) >= 80 else
        "Aderencia GISTM parcial - revisar princpios com maior gap antes de Conformance Report."
        if (global_score or 0) >= 60 else
        "Aderencia GISTM critica - rota de remediacao mandatoria antes de divulgacao publica."
    )

    return f"""
<h2><span class="ic gl">&#9776;</span> GISTM - Conformidade por Principio (Premium)</h2>
<div class="gw">
<div class="ga"><div class="ga-bg"></div><div class="ga-m"></div><div class="ga-n" style="--angle:{angle}deg;"></div><div class="ga-v">{score_label}</div></div>
<div class="gi"><div class="ti">Score Global GISTM: {score_label}</div>
<div class="de">{avaliados}/{total_p} principios com avaliacao suficiente. Padrao global de gestao de rejeitos
publicado por ICMM, UNEP e PRI em 2020.</div></div></div>

<table>
<thead><tr><th>#</th><th>Principio</th><th>Aval.</th><th>Atende</th><th>Parc.</th><th>Nao At.</th><th>Score</th></tr></thead>
<tbody>{rows}</tbody>
</table>

<div class="cl {color_classe}"><div class="ci">{icon}</div><div class="bd">
<strong>{summary}</strong>Cobertura dos 15 principios GISTM nos 6 topicos:
comunidades afetadas, base de conhecimento, design e monitoramento, gestao e governanca,
resposta a emergencia e disclosure publico.</div></div>
"""


def render_relatorio_viabilidade_oportunidade(data: dict) -> str:
    """Relatorio Completo de Viabilidade de Oportunidade (HTML).

    Gera relatorio com identidade Summo a partir de uma Oportunidade do
    funil — inclui dados ANM, scores dos 9 parametros, score consolidado
    e recomendacao.
    """
    titulo = data.get("titulo") or "Oportunidade sem titulo"
    descricao = data.get("descricao") or ""
    processo = data.get("processo_anm") or "-"
    substancia = data.get("substancia") or "-"
    fase_anm = data.get("fase_anm") or "-"
    area_ha = data.get("area_ha")
    municipio = data.get("municipio") or "-"
    uf = data.get("uf") or "-"
    valor = data.get("valor_estimado")
    consolidado = data.get("score_consolidado")
    etapa = data.get("etapa", "prospect")

    scores = [
        ("Disponibilidade de Agua", data.get("score_agua")),
        ("Energia", data.get("score_energia")),
        ("Logistica", data.get("score_logistica")),
        ("Mao de obra", data.get("score_mao_obra")),
        ("Licenciamento ambiental", data.get("score_licenciamento")),
        ("Financeiro", data.get("score_financeiro")),
        ("Stakeholder e ESG", data.get("score_stakeholder")),
        ("Potencial geologico", data.get("score_geologico")),
        ("Risco climatico", data.get("score_climatico")),
    ]
    notas = data.get("notas_avaliacao") or {}

    score_rows = ""
    for label, s in scores:
        if s is None:
            badge_class = "bgy"
            label_val = "Nao avaliado"
            bar_width = 0
        elif s >= 7:
            badge_class = "bg"
            label_val = f"{s:.1f} / 10 — Favoravel"
            bar_width = s * 10
        elif s >= 4:
            badge_class = "bo"
            label_val = f"{s:.1f} / 10 — Moderado"
            bar_width = s * 10
        else:
            badge_class = "br2"
            label_val = f"{s:.1f} / 10 — Desafio"
            bar_width = s * 10
        nota = notas.get(label, "")
        bar_html = f'<div style="height:6px;background:#eee;border-radius:3px;overflow:hidden;"><div style="height:100%;width:{bar_width}%;background:var(--teal);"></div></div>'
        score_rows += f"""
<tr>
<td><strong>{label}</strong></td>
<td><span class="b {badge_class}">{label_val}</span></td>
<td style="width:120px;">{bar_html}</td>
<td class="mu sm">{nota}</td>
</tr>"""

    consolidado_str = f"{consolidado:.1f} / 10" if consolidado is not None else "n/d"
    angle = (consolidado or 0) * 18  # 0-10 mapeado pra 0-180 graus

    if consolidado is None:
        recomendacao = "Complete a avaliacao dos parametros para emitir recomendacao."
        cor_recom = "bgy"
    elif consolidado >= 7:
        recomendacao = "Oportunidade FAVORAVEL. Recomendado prosseguir para captacao de investidores e estruturacao."
        cor_recom = "bg"
    elif consolidado >= 4:
        recomendacao = "Oportunidade MODERADA. Aprofundar avaliacao dos parametros desafiadores antes de aprovar."
        cor_recom = "bo"
    else:
        recomendacao = "Oportunidade DESAFIADORA. Recomenda-se reavaliar viabilidade ou descartar."
        cor_recom = "br2"

    ref = f"VIAB-OP-{datetime.now().strftime('%Y%m%d')}-{data.get('id', '0')}"

    cover = _cover(
        'Relatorio de<br><span class="gold">Viabilidade</span>',
        "",
        titulo,
        f"Processo ANM {processo} . {substancia} . {municipio}-{uf}",
        "Funil de Oportunidades Summo", "tag-gold",
        [("Titulo", titulo),
         ("Processo ANM", processo),
         ("Substancia", substancia),
         ("Fase ANM", fase_anm),
         ("Area (ha)", str(area_ha) if area_ha else "-"),
         ("Municipio", f"{municipio}/{uf}"),
         ("Score Consolidado", consolidado_str),
         ("Referencia", ref)]
    )

    body = f"""{cover}
<div class="pg">{_page_header(f"{ref} . Etapa atual: {etapa.title()}")}

<h2><span class="ic t">&#9432;</span> Sumario Executivo</h2>
<p>Avaliacao da oportunidade minerária <strong>{titulo}</strong>
({substancia}, processo ANM {processo}) localizada em
<strong>{municipio}/{uf}</strong>. Analise consolidada dos 9 parametros
estrategicos da metodologia Summo de avaliacao de prospects minerais.</p>

{f'<p class="mu">{descricao}</p>' if descricao else ''}

<div class="gw">
<div class="ga"><div class="ga-bg"></div><div class="ga-m"></div><div class="ga-n" style="--angle:{angle}deg;"></div><div class="ga-v">{consolidado_str}</div></div>
<div class="gi"><div class="ti">Score Consolidado: {consolidado_str}</div>
<div class="de">Media dos {sum(1 for _, s in scores if s is not None)} de 9 parametros avaliados.</div></div></div>

<h2><span class="ic gl">&#9776;</span> Avaliacao dos 9 Parametros</h2>
<table><thead><tr><th>Parametro</th><th>Avaliacao</th><th>Score</th><th>Notas</th></tr></thead>
<tbody>{score_rows}</tbody></table>

<h2><span class="ic o">&#9888;</span> Dados do Direito Minerario</h2>
<table>
<tr><td><strong>Numero do processo ANM</strong></td><td>{processo}</td></tr>
<tr><td><strong>Substancia mineral</strong></td><td>{substancia}</td></tr>
<tr><td><strong>Fase atual ANM</strong></td><td>{fase_anm}</td></tr>
<tr><td><strong>Area total (ha)</strong></td><td>{area_ha if area_ha else "-"}</td></tr>
<tr><td><strong>Municipio / UF</strong></td><td>{municipio} / {uf}</td></tr>
<tr><td><strong>Valor estimado de investimento</strong></td><td>{'R$ ' + _fmt_num(valor) if valor else "A definir"}</td></tr>
<tr><td><strong>Etapa atual no funil</strong></td><td>{etapa.title()}</td></tr>
</table>

<div class="cl {"next" if cor_recom == "bg" else "warn" if cor_recom == "bo" else "danger" if cor_recom == "br2" else "info"}">
<div class="ci">&#9432;</div><div class="bd">
<strong>Recomendacao Summo</strong>{recomendacao}
</div></div>

<h2><span class="ic t">&#9432;</span> Metodologia Summo</h2>
<p>A avaliacao de oportunidades minerarias da Summo Quartile considera
9 parametros estrategicos:</p>
<ol style="padding-left:22px;font-size:10pt;line-height:1.8;">
<li><strong>Disponibilidade de agua:</strong> ANA outorgas, bacias, UCs hidricas, conflitos de uso</li>
<li><strong>Energia:</strong> ANEEL geracao/transmissao, distancia a subestacoes, capacidade local</li>
<li><strong>Logistica:</strong> DNIT rodovias, ANTT ferrovias, ANTAQ portos, escoamento</li>
<li><strong>Mao de obra:</strong> IBGE PNAD/Caged, RAIS, universidades, skill local</li>
<li><strong>Licenciamento ambiental:</strong> probabilidade historica via base SEMAD-MG/IBAMA</li>
<li><strong>Financeiro:</strong> CFEM, commodities, opex/capex regionais, TIR/Payback</li>
<li><strong>Stakeholder e ESG:</strong> UCs, TIs, comunidades, biomas sensiveis</li>
<li><strong>Potencial geologico:</strong> CPRM, reservas, qualidade do deposito</li>
<li><strong>Risco climatico:</strong> CEMADEN/INMET, eventos extremos previsiveis</li>
</ol>

<p class="xs mu" style="margin-top:18px;">
Relatorio gerado pela plataforma Summo Quartile. Validade: 90 dias a partir
da emissao. Documento confidencial — restrito a equipe e investidores
autorizados.
</p>
{_page_footer("Summo Quartile . " + ref, "1/1")}
</div>"""

    return _html_wrap(f"{ref} - Viabilidade - {titulo}", body)


def render_pilhas_portal_publico(
    dados_pilha: dict | None,
    resultado: dict | None = None,
    gistm_data: dict | None = None,
    empresa: dict | None = None,
    base_url: str = "",
) -> str:
    """Gera página pública de transparência conforme PL 2.519/2024 (MG) e PL 3.799/2024 (Fed).

    Diferente do relatório confidencial: linguagem acessível à comunidade,
    foco em segurança e emergência, sem expor não-conformidades sensíveis.

    Args:
        dados_pilha: dict com campos de DadosPilha (nome, classe, tipo, etc.)
        resultado: opcional — usado apenas para indicar nível de gestão (não expõe %)
        gistm_data: opcional — se presente, mostra adesão GISTM
        empresa: opcional — razão social, município sede
        base_url: URL base se publicado (para canonical link)
    """
    dp = dados_pilha or {}
    nome = dp.get("nome") or "Pilha sem identificacao"
    classe = dp.get("classe") or "-"
    tipo = (dp.get("tipo") or "-").replace("_", " ").title()
    metodo = (dp.get("metodo_construtivo") or "-").replace("_", " ").title()
    material = (dp.get("material") or "-").replace("_", " ").title()
    altura = dp.get("altura_m")
    volume = dp.get("volume_m3")
    municipio = dp.get("municipio") or "-"
    consequencia = (dp.get("consequencia") or "-").replace("_", " ").upper()
    data_inicio = dp.get("data_inicio") or "-"

    razao = (empresa or {}).get("razao_social") or "Empresa nao informada"

    # Status simplificado da gestao (sem expor %)
    nivel_gestao = "Em conformidade"
    nivel_cor = "#27AE60"
    nivel_icone = "&#10004;"
    if resultado:
        score = (resultado.get("conformidade_nao_ponderada", 0) or 0) * 100
        if score >= 80:
            nivel_gestao = "Em conformidade com arcabouco regulatorio aplicavel"
            nivel_cor = "#27AE60"
        elif score >= 60:
            nivel_gestao = "Em adequacao - plano de acao em execucao"
            nivel_cor = "#F39C12"
            nivel_icone = "&#9888;"
        else:
            nivel_gestao = "Em remediacao prioritaria"
            nivel_cor = "#E74C3C"
            nivel_icone = "&#9888;"

    # Indicador GISTM (se aplicavel)
    gistm_html = ""
    if gistm_data and gistm_data.get("score_global_gistm") is not None:
        gscore = gistm_data["score_global_gistm"]
        gistm_html = f"""
<div class="card-info">
  <h3>Adesao ao Padrao Internacional GISTM</h3>
  <p>Esta pilha tem cobertura avaliada nos <strong>15 principios do Global Industry
  Standard on Tailings Management</strong> (ICMM, UNEP, PRI - 2020), padrao internacional
  de referencia para gestao de rejeitos de mineracao.</p>
  <p><strong>{gscore}%</strong> de aderencia agregada aos principios avaliados
  ({gistm_data.get("principios_avaliados", 0)}/15 com avaliacao suficiente).</p>
</div>
"""

    # Consequencia humanizada
    consequencia_desc = {
        "LOW": "Baixa",
        "SIGNIFICANT": "Significativa",
        "HIGH": "Alta",
        "VERY HIGH": "Muito Alta",
        "EXTREME": "Extrema",
    }.get(consequencia, consequencia)

    portal_css = """
@page{size:A4;margin:14mm 14mm;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,sans-serif;color:#1f2937;line-height:1.65;background:#f9fafb;}
.wrap{max-width:920px;margin:0 auto;padding:32px 24px;background:#fff;}
.hdr{background:linear-gradient(135deg,#0A2540 0%,#156082 100%);color:#fff;padding:36px 28px;border-radius:14px;margin-bottom:28px;}
.hdr h1{font-size:28px;font-weight:800;line-height:1.15;margin-bottom:6px;}
.hdr .sub{font-size:13px;color:rgba(255,255,255,.75);}
.hdr .tag{display:inline-block;margin-top:14px;padding:6px 16px;background:rgba(255,192,0,.18);border:1px solid rgba(255,192,0,.4);color:#FFC000;font-size:11px;font-weight:700;border-radius:20px;letter-spacing:.5px;text-transform:uppercase;}
.banner{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#92400e;}
section{margin-bottom:28px;}
h2{font-size:18px;font-weight:800;color:#0A2540;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e5e7eb;}
h3{font-size:14px;font-weight:700;color:#156082;margin-top:14px;margin-bottom:6px;}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:14px 0;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0;}
.metric{background:#f3f4f6;border-radius:10px;padding:14px 16px;border-left:4px solid #156082;}
.metric .l{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:4px;font-weight:600;}
.metric .v{font-size:15px;font-weight:700;color:#0A2540;}
.metric.alert{border-left-color:#FF5F00;background:#fff7ed;}
.metric.alert .v{color:#9a3412;}
.status-box{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:10px;color:#fff;font-weight:600;margin:14px 0;}
.status-box .icn{font-size:22px;}
.card-info{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin:14px 0;}
.card-info h3{margin-top:0;color:#1e40af;}
.card-info p{font-size:13px;color:#1e3a8a;margin-bottom:6px;}
.emergency{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:18px 20px;}
.emergency h2{border-bottom-color:#fecaca;color:#991b1b;}
.emergency p{color:#7f1d1d;font-size:14px;}
.contact{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px;}
.contact .item{padding:10px 14px;background:#fff;border-radius:8px;border:1px solid #fecaca;}
.contact .label{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#991b1b;font-weight:600;}
.contact .value{font-size:14px;color:#7f1d1d;font-weight:700;margin-top:2px;}
.footer{margin-top:36px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;}
.footer strong{color:#0A2540;}
.legal-list{background:#f9fafb;border-radius:8px;padding:14px 18px;font-size:12px;}
.legal-list li{margin-bottom:4px;color:#374151;}
ul{padding-left:22px;}
"""

    html_body = f"""
<div class="hdr">
  <h1>Portal Publico de Transparencia</h1>
  <p class="sub">Informacoes da pilha de rejeito/esteril conforme PL 2.519/2024 MG e PL 3.799/2024 Federal</p>
  <span class="tag">Transparencia Ativa</span>
</div>

<div class="banner">
  Esta pagina e mantida em conformidade com os requisitos de transparencia ativa
  para ativos minerarios estabelecidos no PL 2.519/2024 (MG) e PL 3.799/2024 (Federal).
  Informacoes atualizadas a cada ciclo de auditoria.
</div>

<section>
  <h2>Identificacao do ativo</h2>
  <div class="grid">
    <div class="metric"><div class="l">Nome da pilha</div><div class="v">{nome}</div></div>
    <div class="metric"><div class="l">Empresa responsavel</div><div class="v">{razao}</div></div>
    <div class="metric"><div class="l">Municipio</div><div class="v">{municipio}</div></div>
    <div class="metric"><div class="l">Tipo de material</div><div class="v">{tipo}</div></div>
    <div class="metric"><div class="l">Metodo construtivo</div><div class="v">{metodo}</div></div>
    <div class="metric"><div class="l">Material beneficiado</div><div class="v">{material}</div></div>
  </div>
</section>

<section>
  <h2>Caracteristicas tecnicas</h2>
  <div class="grid-3">
    <div class="metric"><div class="l">Classe (DN COPAM 217)</div><div class="v">Classe {classe}</div></div>
    <div class="metric"><div class="l">Altura (m)</div><div class="v">{altura if altura else "n/d"}</div></div>
    <div class="metric"><div class="l">Volume (m3)</div><div class="v">{_fmt_num(volume) if volume else "n/d"}</div></div>
  </div>
  <div class="grid">
    <div class="metric alert"><div class="l">Classe de consequencia (GISTM)</div><div class="v">{consequencia_desc}</div></div>
    <div class="metric"><div class="l">Data de inicio de operacao</div><div class="v">{data_inicio}</div></div>
  </div>
  <p style="font-size:12px;color:#6b7280;margin-top:8px;">
  <em>A classe de consequencia indica a magnitude potencial de impacto em caso de
  ruptura hipotetica. Classes Alta, Muito Alta e Extrema demandam controles
  reforcados de monitoramento e plano de emergencia robusto.</em>
  </p>
</section>

<section>
  <h2>Status de gestao</h2>
  <div class="status-box" style="background:{nivel_cor};">
    <span class="icn">{nivel_icone}</span>
    <span>{nivel_gestao}</span>
  </div>
  <p style="font-size:13px;color:#4b5563;">
  Avaliacao mais recente da gestao da pilha contra o arcabouco regulatorio
  brasileiro aplicavel (DN COPAM 217/2017, Res. ANM 85/2021, 189/2024 e 191/2024,
  NBR 13029:2017) e boas praticas internacionais.
  </p>
  {gistm_html}
</section>

<section class="emergency">
  <h2>Resposta a emergencia</h2>
  <p>Em caso de emergencia ou risco percebido envolvendo este ativo, contate
  imediatamente o Plano de Acao de Emergencia (PAE).</p>
  <div class="contact">
    <div class="item">
      <div class="label">Defesa Civil (Federal)</div>
      <div class="value">199</div>
    </div>
    <div class="item">
      <div class="label">Bombeiros</div>
      <div class="value">193</div>
    </div>
    <div class="item">
      <div class="label">Contato emergencia 24h da empresa</div>
      <div class="value">A ser publicado pela operadora</div>
    </div>
    <div class="item">
      <div class="label">Ouvidoria publica ANM</div>
      <div class="value">https://www.gov.br/anm/ouvidoria</div>
    </div>
  </div>
  <p style="font-size:12px;color:#7f1d1d;margin-top:14px;">
  <strong>Zona de Autossalvamento (ZAS) e Zona de Seguranca Secundaria (ZSS):</strong>
  Comunidades situadas em ZAS/ZSS recebem treinamento periodico e simulados.
  Em emergencia, sirenes e/ou comunicacao direta serao acionadas.
  </p>
</section>

<section>
  <h2>Mecanismo de manifestacao publica</h2>
  <p>Qualquer cidadao pode solicitar informacoes adicionais sobre esta pilha
  ou registrar manifestacao referente ao ativo.</p>
  <ul>
    <li>Solicitacao formal via Lei de Acesso a Informacao (LAI) ao orgao licenciador
    (SEMAD/MG ou IBAMA conforme caso)</li>
    <li>Canal de relacionamento com comunidade da empresa operadora</li>
    <li>Ouvidoria publica da ANM para questoes de seguranca de barragens e pilhas</li>
  </ul>
  <p style="font-size:12px;color:#6b7280;margin-top:8px;">
  <em>Prazo de resposta a solicitacoes via LAI: 20 dias uteis, prorrogavel por
  10 dias mediante justificativa.</em>
  </p>
</section>

<section>
  <h2>Arcabouco legal aplicavel</h2>
  <ul class="legal-list">
    <li><strong>Lei Federal 12.334/2010</strong> - Politica Nacional de Seguranca de Barragens (PNSB)</li>
    <li><strong>Lei MG 23.291/2019</strong> - Politica Estadual de Seguranca de Barragens</li>
    <li><strong>DN COPAM 217/2017 (MG)</strong> - Classificacao e licenciamento ambiental</li>
    <li><strong>Resolucao ANM 85/2021, 95/2022, 189/2024 e 191/2024</strong> - PAEBM, PARE, monitoramento</li>
    <li><strong>NBR 13028, 13029 e 22336 (ABNT)</strong> - Elaboracao, operacao e geoquimica de pilhas</li>
    <li><strong>NRM-19 (ANM)</strong> - Norma reguladora de mineracao - disposicao de esteril e rejeito</li>
    <li><strong>GISTM - Global Industry Standard on Tailings Management</strong> (ICMM/UNEP/PRI 2020)</li>
    <li><strong>PL 2.519/2024 (MG)</strong> - Projeto de Lei de transparencia ativa (em tramitacao)</li>
    <li><strong>PL 3.799/2024 (Federal)</strong> - Projeto de Lei federal de transparencia (em tramitacao)</li>
  </ul>
</section>

<div class="footer">
  Pagina publicada via <strong>Summo Quartile</strong> - plataforma de governanca e
  conformidade de ativos minerarios.
  <br>
  Conteudo de responsabilidade da empresa operadora. Atualizado em {_fmt_date()}.
</div>
"""

    return f"""<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Portal Publico - {nome} - {razao}</title>
<meta name="description" content="Pagina de transparencia ativa da pilha {nome} - {razao}, conforme PL 2.519/2024 MG e PL 3.799/2024 Federal.">
<style>{portal_css}</style></head>
<body><div class="wrap">{html_body}</div></body></html>"""


def render_pilhas_conformidade(
    modo: str,
    modo_desc: str,
    dados_pilha: dict | None,
    resultado: dict,
    recomendacoes: list[dict],
    incluir_gistm: bool = False,
    gistm_data: dict | None = None,
    ref: str = "",
) -> str:
    """Relatório de Conformidade de Pilha (Auditoria / Licenciamento / Fechamento).

    Args:
        modo: AUDITORIA | LICENCIAMENTO | FECHAMENTO_MODO
        modo_desc: descricao do modo
        dados_pilha: dict com campos de DadosPilha (nome, classe, tipo, etc.)
        resultado: output de /api/pilhas/score (conformidade, classificacao, cor, counts)
        recomendacoes: lista de recomendacoes geradas pelo motor DD
        incluir_gistm: se o módulo GISTM premium foi ativado
    """
    ref = ref or f"PILHA-{datetime.now().strftime('%Y-%m%d')}-" + (modo[:3] if modo else "AUD")
    dp = dados_pilha or {}
    nome = dp.get("nome") or "Pilha nao identificada"
    classe = dp.get("classe") or "-"
    tipo = (dp.get("tipo") or "-").replace("_", " ").title()
    metodo = (dp.get("metodo_construtivo") or "-").replace("_", " ").title()
    material = (dp.get("material") or "-").replace("_", " ").title()
    altura = dp.get("altura_m")
    volume = dp.get("volume_m3")
    municipio = dp.get("municipio") or "-"
    consequencia = (dp.get("consequencia") or "-").replace("_", " ").title()

    score = round((resultado.get("conformidade_nao_ponderada", 0) or 0) * 100, 1)
    angle = score * 1.8
    classificacao = resultado.get("classificacao", "-")
    descricao = resultado.get("descricao", "")
    cor = resultado.get("cor", "#156082")

    atende = resultado.get("atende", 0)
    parcial = resultado.get("atende_parcial", 0)
    nao_atende = resultado.get("nao_atende", 0)
    nao_aplica = resultado.get("nao_aplica", 0)
    n_reqs = resultado.get("requisitos_aplicaveis", atende + parcial + nao_atende)

    modo_tag_class = "tag-teal" if modo == "AUDITORIA" else "tag-orange" if modo == "LICENCIAMENTO" else "tag-gold"
    modo_label = {"AUDITORIA": "Auditoria de Ativo", "LICENCIAMENTO": "Licenciamento", "FECHAMENTO_MODO": "Fechamento"}.get(modo, modo)

    cover = _cover(
        'Conformidade de<br><span class="gold">Pilhas</span>', "",
        modo_label,
        f"{nome} . {tipo} . Classe {classe}",
        f"Relatorio de Conformidade - {modo_label}", modo_tag_class,
        [("Pilha", nome),
         ("Classe", f"Classe {classe}"),
         ("Metodo", metodo),
         ("Emissao", _fmt_date()),
         ("Score", f"{score}%"),
         ("Referencia", ref)]
    )

    # Dados da pilha (detalhes)
    dados_rows = f"""
<tr><td>Nome da pilha</td><td><strong>{nome}</strong></td></tr>
<tr><td>Classe (DN COPAM 217)</td><td>Classe {classe}</td></tr>
<tr><td>Tipo de material</td><td>{tipo}</td></tr>
<tr><td>Metodo construtivo</td><td>{metodo}</td></tr>
<tr><td>Material beneficiado</td><td>{material}</td></tr>
<tr><td>Altura (m)</td><td>{altura if altura else "-"}</td></tr>
<tr><td>Volume (m3)</td><td>{_fmt_num(volume) if volume else "-"}</td></tr>
<tr><td>Municipio</td><td>{municipio}</td></tr>
<tr><td>Classe de consequencia (GISTM)</td><td>{consequencia}</td></tr>
"""

    # Recomendações (top 15)
    rec_rows = ""
    for r in (recomendacoes or [])[:15]:
        crit = (r.get("criticidade") or "").lower()
        bc = "br2" if crit == "alta" else "bo" if crit == "media" else "bg"
        rec_rows += f"""<tr>
<td>{r.get("documento", "-")}</td>
<td>{r.get("requisito", "-")}</td>
<td><span class="b {bc}">{crit.title() or "-"}</span></td>
<td>{r.get("acao", "-")}</td>
</tr>"""
    if not rec_rows:
        rec_rows = '<tr><td colspan="4" class="mu">Nenhuma recomendacao - conformidade plena.</td></tr>'

    gistm_badge = '<span class="b bt">GISTM Premium ativo</span>' if incluir_gistm else ""

    body = f"""{cover}
<div class="pg">{_page_header(f"{ref} . {modo_label}")}

<h2><span class="ic t">&#9432;</span> Sumario Executivo</h2>
<p>Avaliacao de conformidade da pilha <strong>{nome}</strong> ({tipo}, Classe {classe}) segundo o arcabouço regulatório brasileiro e boas praticas internacionais. {gistm_badge}</p>

<div class="gw">
<div class="ga"><div class="ga-bg"></div><div class="ga-m"></div><div class="ga-n" style="--angle:{angle}deg;"></div><div class="ga-v">{score}%</div></div>
<div class="gi"><div class="ti" style="color:{cor};">{classificacao}</div>
<div class="de">{descricao}</div></div></div>

<div class="ks">
<div class="k"><div class="n">{atende}</div><div class="lb">Atende</div></div>
<div class="k"><div class="n">{parcial}</div><div class="lb">Parcial</div></div>
<div class="k"><div class="n">{nao_atende}</div><div class="lb">Nao Atende</div></div>
<div class="k"><div class="n">{nao_aplica}</div><div class="lb">Nao Aplica</div></div>
</div>

<h2><span class="ic gl">&#9776;</span> Dados da Pilha</h2>
<table><thead><tr><th>Atributo</th><th>Valor</th></tr></thead>
<tbody>{dados_rows}</tbody></table>

{_render_gistm_block(gistm_data) if incluir_gistm else ""}

<h2><span class="ic o">&#9888;</span> Plano de Acao - Recomendacoes</h2>
<table><thead><tr><th>Documento</th><th>Requisito</th><th>Criticidade</th><th>Acao recomendada</th></tr></thead>
<tbody>{rec_rows}</tbody></table>

<h2><span class="ic t">&#9432;</span> Arcabouco Regulatorio Aplicado</h2>
<div class="lg"><div class="nm">Lei Geral do Licenciamento Ambiental (Lei 15.190/2025)</div><div class="ds">Modalidades de licenciamento federais e estaduais.</div></div>
<div class="lg"><div class="nm">DN COPAM 217/2017 (MG)</div><div class="ds">Classificacao por porte e potencial poluidor. Atividades A-05-04-5/7.</div></div>
<div class="lg"><div class="nm">NRM-19 / Res. ANM 85/2021 / 189/2024 / 191/2024</div><div class="ds">Regulamentacao mineraria - PAE/PAEBM, PARE (aproveitamento), instrumentacao.</div></div>
<div class="lg"><div class="nm">NBR 13028/13029:2017-2025</div><div class="ds">Elaboracao e operacao de pilhas de esteril/rejeito.</div></div>
{'<div class="lg"><div class="nm">GISTM (ICMM 2020)</div><div class="ds">Global Industry Standard on Tailings Management - 15 principios, 77 requisitos.</div></div>' if incluir_gistm else ""}
<div class="lg"><div class="nm">Boas praticas - ICMM / MAC / ANCOLD / AECOM</div><div class="ds">Instrumentacao continua, RISR, MoC, engajamento de stakeholders, gestao de mudancas climaticas.</div></div>

<div class="cl {"next" if score >= 80 else "warn" if score >= 60 else "danger"}">
<div class="ci">{"&#10004;" if score >= 80 else "&#9888;" if score >= 60 else "&#10060;"}</div>
<div class="bd"><strong>{"Alta aderencia - Conformidade adequada." if score >= 80 else "Aderencia parcial - Ajustes recomendados antes de auditoria externa." if score >= 60 else "Baixa aderencia - Acao corretiva mandatoria."}</strong>
{n_reqs} requisitos avaliados. {nao_atende} nao-conformidades identificadas.</div></div>

<p class="xs mu" style="margin-top:14px;">Relatorio de conformidade. Validade: 180 dias. Confidencial.</p>
{_page_footer("Summo Quartile . " + ref, "1/1")}
</div>"""

    return _html_wrap(f"{ref} - Conformidade de Pilha", body)


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
