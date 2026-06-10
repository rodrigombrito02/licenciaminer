"""Geração de relatórios PDF (risco, cenário de crise, consolidado executivo).

Usa fpdf2 — sem dependências nativas. Layout simples, direto, com cabeçalho
padronizado e seções claras.
"""

from __future__ import annotations

import io
from datetime import date, datetime
from typing import Any

from fpdf import FPDF
from sqlalchemy.orm import Session

from licenciaminer.riscos.models import Acao, Bowtie, Controle, Projeto, Risco
from licenciaminer.riscos.models_comunicacoes import (
    MatrizRACIComunicacao,
    TemplateComunicacao,
)
from licenciaminer.riscos.models_corporativo import (
    CategoriaERM,
    LinhaDefesa,
    ObjetivoEstrategico,
    RiscoObjetivoLink,
    TopRiscoSnapshot,
)
from licenciaminer.riscos.models_crises import CenarioCrise
from licenciaminer.riscos.models_monitoramento import KRI, RiskAppetite


BRAND_DARK = (15, 23, 42)
BRAND_LIGHT = (100, 116, 139)
RED = (220, 38, 38)
AMBER = (245, 158, 11)
GREEN = (22, 163, 74)
BLUE = (14, 165, 233)


def _strip(txt: Any) -> str:
    """Normaliza texto para não quebrar o PDF (fpdf2 default suporta latin-1)."""
    if txt is None:
        return ""
    s = str(txt)
    replacements = {
        "—": "-",
        "–": "-",
        "→": "->",
        "←": "<-",
        "≥": ">=",
        "≤": "<=",
        "≠": "!=",
        "±": "+/-",
        "×": "x",
        "·": "-",
        "⚠": "!",
        "✓": "v",
        "✗": "x",
        "•": "-",
        "…": "...",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "°": " graus",
        "™": "(TM)",
        "®": "(R)",
        "©": "(C)",
        "🛡️": "[S]",
        "🔥": "[!]",
        "📈": "",
        "📦": "",
        "⚖️": "",
        "📡": "",
        "👥": "",
        "🚨": "[ALERTA]",
        "🔴": "[VM]",
        "🟡": "[AM]",
        "🟢": "[VD]",
    }
    for old, new in replacements.items():
        s = s.replace(old, new)
    # Fallback: qualquer char fora de latin-1 vira '?'
    out = []
    for ch in s:
        try:
            ch.encode("latin-1")
            out.append(ch)
        except UnicodeEncodeError:
            out.append("?")
    return "".join(out)


class RelatorioPDF(FPDF):
    def __init__(self, titulo: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.titulo = titulo
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(15, 18, 15)

    def header(self):
        self.set_font("helvetica", "B", 9)
        self.set_text_color(*BRAND_LIGHT)
        self.cell(0, 6, _strip("Sistema Summo - Gestão de Riscos"), align="L")
        self.cell(0, 6, _strip(datetime.now().strftime("%d/%m/%Y %H:%M")), align="R")
        self.ln(5)
        self.set_draw_color(*BRAND_LIGHT)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(3)

    def footer(self):
        self.set_y(-12)
        self.set_font("helvetica", "", 8)
        self.set_text_color(*BRAND_LIGHT)
        self.cell(0, 6, _strip(f"Página {self.page_no()}"), align="C")

    def _full_width(self) -> float:
        return self.w - self.r_margin - self.l_margin

    def _reset_x(self) -> None:
        self.set_x(self.l_margin)

    def multi_cell(self, w, h=None, text="", *args, **kwargs):
        """Override seguro: w=0 vira full_width; se x fora da margem, reseta."""
        if w == 0:
            if self.x > self.l_margin + 1 or self.x < self.l_margin - 1:
                self.set_x(self.l_margin)
            w = self._full_width()
        # Se width ficar muito pequena, forçar quebra de linha e reset
        avail = self.w - self.r_margin - self.x
        if w > avail:
            self.ln(h if h else 5)
            self.set_x(self.l_margin)
        return super().multi_cell(w, h, text, *args, **kwargs)

    def h1(self, text: str):
        self._reset_x()
        self.set_font("helvetica", "B", 18)
        self.set_text_color(*BRAND_DARK)
        self.multi_cell(self._full_width(), 8, _strip(text))
        self.ln(2)

    def h2(self, text: str, color=BRAND_DARK):
        self._reset_x()
        self.set_font("helvetica", "B", 12)
        self.set_text_color(*color)
        self.ln(2)
        self.multi_cell(self._full_width(), 6, _strip(text))
        self.ln(1)
        self.set_text_color(*BRAND_DARK)

    def h3(self, text: str):
        self._reset_x()
        self.set_font("helvetica", "B", 10)
        self.set_text_color(*BRAND_DARK)
        self.multi_cell(self._full_width(), 5, _strip(text))

    def p(self, text: str, size: int = 10):
        self._reset_x()
        self.set_font("helvetica", "", size)
        self.set_text_color(*BRAND_DARK)
        self.multi_cell(self._full_width(), 5, _strip(text))

    def p_muted(self, text: str, size: int = 8, indent: int = 0):
        """Parágrafo em cor mais clara (para detalhes, responsáveis, etc)."""
        self._reset_x()
        if indent:
            self.set_x(self.l_margin + indent)
        self.set_font("helvetica", "", size)
        self.set_text_color(*BRAND_LIGHT)
        self.multi_cell(self._full_width() - indent, 4.5, _strip(text))
        self.set_text_color(*BRAND_DARK)

    def p_bold(self, text: str, size: int = 9):
        self._reset_x()
        self.set_font("helvetica", "B", size)
        self.set_text_color(*BRAND_DARK)
        self.multi_cell(self._full_width(), 5, _strip(text))

    def kv(self, key: str, value: str):
        label = _strip(key)[:50]
        val = _strip(value or "-")
        self.set_font("helvetica", "B", 9)
        self.set_text_color(*BRAND_LIGHT)
        self.cell(50, 5, label, border=0)
        self.set_font("helvetica", "", 9)
        self.set_text_color(*BRAND_DARK)
        remaining = self.w - self.r_margin - self.x
        if remaining < 30:
            self.ln(5)
            remaining = self.w - self.r_margin - self.l_margin - 50
            self.set_x(self.l_margin + 50)
        self.multi_cell(remaining, 5, val)

    def badge(self, text: str, color=BRAND_LIGHT):
        w = self.get_string_width(_strip(text)) + 6
        self.set_fill_color(*color)
        self.set_text_color(255, 255, 255)
        self.set_font("helvetica", "B", 8)
        self.cell(w, 5, _strip(text), fill=True, align="C")
        self.set_text_color(*BRAND_DARK)

    def hr(self):
        self.ln(2)
        self.set_draw_color(*BRAND_LIGHT)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(2)


def _class_cor(cls: str | None) -> tuple[int, int, int]:
    return {
        "C": RED,
        "MS": (249, 115, 22),
        "S": AMBER,
        "PS": GREEN,
    }.get(cls or "", BRAND_LIGHT)


def exportar_risco_pdf(db: Session, risco_id: int) -> bytes:
    risco = db.get(Risco, risco_id)
    if not risco:
        raise ValueError("Risco não encontrado")

    pdf = RelatorioPDF(f"Risco {risco.codigo}")
    pdf.add_page()

    pdf.h1(f"{risco.codigo} — {risco.nome}")

    # Classificação como badges
    pdf.set_font("helvetica", "", 9)
    if risco.classificacao_residual:
        pdf.badge(
            f"Residual: {risco.classificacao_residual}",
            color=_class_cor(risco.classificacao_residual),
        )
        pdf.cell(2, 5, " ")
    if risco.classificacao_pura:
        pdf.badge(
            f"Puro: {risco.classificacao_pura}",
            color=_class_cor(risco.classificacao_pura),
        )
    pdf.ln(8)

    if risco.descricao:
        pdf.p(risco.descricao)
        pdf.ln(2)

    # Metadados
    pdf.h2("Identificação")
    pdf.kv("Estágio", risco.estagio or "—")
    pdf.kv("Categoria", risco.categoria.nome if risco.categoria else "—")
    pdf.kv("Responsável", risco.responsavel.nome if risco.responsavel else "—")
    pdf.kv("Unidade org.", risco.unidade_org.nome if risco.unidade_org else "—")
    pdf.kv("Elo cadeia valor", risco.elo_cadeia_valor.nome if risco.elo_cadeia_valor else "—")
    pdf.ln(2)

    pdf.h2("Avaliação P x I")
    pdf.kv(
        "Puro",
        f"P={risco.prob_pura or '-'} x I={risco.impacto_pura or '-'} => {risco.classificacao_pura or '-'}",
    )
    pdf.kv(
        "Residual",
        f"P={risco.prob_residual or '-'} x I={risco.impacto_residual or '-'} => {risco.classificacao_residual or '-'}",
    )
    pdf.ln(2)

    # Bowtie
    bowtie = (
        db.query(Bowtie)
        .filter_by(risco_id=risco_id)
        .order_by(Bowtie.versao.desc())
        .first()
    )
    if bowtie:
        pdf.h2("Bowtie — estrutura")
        pdf.kv("Top Event", bowtie.top_event or risco.nome)
        pdf.kv("Frequência pura", str(bowtie.frequencia_pura or "-"))
        pdf.kv("Frequência residual", str(bowtie.frequencia_residual or "-"))
        pdf.ln(2)

        pdf.h3(f"Ameaças/Causas ({len(bowtie.causas)})")
        for c in bowtie.causas:
            prefix = f"[{c.codigo}]"
            if c.critica:
                prefix += " [CRITICA]"
            pdf.set_font("helvetica", "B", 9)
            pdf.multi_cell(0, 5, _strip(f"{prefix} {c.descricao}"))
            pdf.set_font("helvetica", "", 8)
            pdf.set_text_color(*BRAND_LIGHT)
            for b in c.barreiras:
                pdf.multi_cell(
                    0,
                    4.5,
                    _strip(
                        f"   > Barreira preventiva: {b.descricao}"
                        + (f" (Ef. {b.efetividade})" if b.efetividade else "")
                    ),
                )
            pdf.set_text_color(*BRAND_DARK)
            pdf.ln(1)

        pdf.ln(2)
        pdf.h3(f"Consequências/Impactos ({len(bowtie.consequencias)})")
        for q in bowtie.consequencias:
            prefix = f"[{q.codigo}]"
            if q.critica:
                prefix += " [CRITICA]"
            pdf.set_font("helvetica", "B", 9)
            pdf.multi_cell(0, 5, _strip(f"{prefix} {q.descricao}"))
            pdf.set_font("helvetica", "", 8)
            pdf.set_text_color(*BRAND_LIGHT)
            for b in q.barreiras:
                pdf.multi_cell(
                    0,
                    4.5,
                    _strip(
                        f"   > Barreira corretiva: {b.descricao}"
                        + (f" (Ef. {b.efetividade})" if b.efetividade else "")
                    ),
                )
            pdf.set_text_color(*BRAND_DARK)
            pdf.ln(1)

    # Ações
    acoes = db.query(Acao).filter_by(risco_id=risco_id).all()
    if acoes:
        pdf.add_page()
        pdf.h2(f"Plano de Ações ({len(acoes)})")
        for a in sorted(acoes, key=lambda x: (x.prazo or date(9999, 1, 1), x.codigo or "")):
            tipo_label = "PREV" if a.tipo == "preventiva" else "CORR"
            prazo = a.data_fim.isoformat() if a.data_fim else (a.prazo.isoformat() if a.prazo else "—")
            pdf.set_font("helvetica", "B", 9)
            pdf.multi_cell(
                0,
                5,
                _strip(f"[{tipo_label}] {a.codigo or ''} {a.descricao}"),
            )
            pdf.set_font("helvetica", "", 8)
            pdf.set_text_color(*BRAND_LIGHT)
            responsavel = a.responsavel.nome if a.responsavel else "—"
            dono = a.dono_risco.nome if a.dono_risco else "—"
            pdf.multi_cell(
                0,
                4.5,
                _strip(
                    f"   Responsável: {responsavel} | Dono risco: {dono} | "
                    f"Área: {a.area or '-'} | Status: {a.status} ({a.percentual}%) | "
                    f"Prazo: {prazo}"
                ),
            )
            if a.detalhamento:
                pdf.multi_cell(0, 4.5, _strip(f"   {a.detalhamento[:300]}"))
            pdf.set_text_color(*BRAND_DARK)
            pdf.ln(1)

    # Controles
    controles = db.query(Controle).filter_by(risco_id=risco_id).all()
    if controles:
        pdf.add_page()
        pdf.h2(f"Controles ({len(controles)})")
        for c in controles:
            tipo_label = "PREV" if c.tipo == "preventivo" else "CORR"
            pdf.set_font("helvetica", "B", 9)
            pdf.multi_cell(0, 5, _strip(f"[{tipo_label}] {c.descricao}"))
            pdf.set_font("helvetica", "", 8)
            pdf.set_text_color(*BRAND_LIGHT)
            info = []
            if c.categoria:
                info.append(f"Categoria: {c.categoria}")
            if c.responsavel:
                info.append(f"Responsável: {c.responsavel.nome}")
            if c.efetividade:
                info.append(f"Efetividade: {c.efetividade}/5")
            if c.periodicidade_teste:
                info.append(f"Periodicidade: {c.periodicidade_teste}")
            if c.ultimo_teste:
                info.append(f"Último teste: {c.ultimo_teste.isoformat()}")
            if c.status_teste:
                info.append(f"Status: {c.status_teste}")
            if info:
                pdf.multi_cell(0, 4.5, _strip("   " + " | ".join(info)))
            pdf.set_text_color(*BRAND_DARK)
            pdf.ln(1)

    # KRIs vinculados
    kris = db.query(KRI).filter_by(risco_id=risco_id).all()
    if kris:
        pdf.h2("KRIs vinculados")
        for k in kris:
            ultima = sorted(k.medicoes, key=lambda m: m.data)[-1] if k.medicoes else None
            status_txt = ultima.status if ultima else "sem dados"
            pdf.kv(
                k.codigo,
                f"{k.nome} | Último: {ultima.valor if ultima else '-'} {k.unidade} ({status_txt})",
            )

    buf = io.BytesIO()
    buf.write(bytes(pdf.output()))
    buf.seek(0)
    return buf.getvalue()


def exportar_cenario_pdf(db: Session, cenario_id: int) -> bytes:
    cen = db.get(CenarioCrise, cenario_id)
    if not cen:
        raise ValueError("Cenário não encontrado")

    pdf = RelatorioPDF(f"Cenário {cen.codigo}")
    pdf.add_page()
    pdf.h1(f"{cen.codigo} — {cen.nome}")

    sev_color = RED if (cen.severidade or 0) >= 4 else AMBER
    pdf.badge(f"Severidade {cen.severidade or '-'}/5", color=sev_color)
    pdf.cell(2, 5, " ")
    pdf.badge(
        f"Probabilidade {cen.probabilidade or '-'}/5",
        color=BLUE,
    )
    pdf.cell(2, 5, " ")
    pdf.badge(
        f"Score {(cen.severidade or 0) * (cen.probabilidade or 0)}",
        color=BRAND_DARK,
    )
    pdf.ln(8)

    if cen.descricao:
        pdf.p(cen.descricao)
        pdf.ln(2)

    pdf.h2("Identificação")
    pdf.kv("Categoria", cen.categoria or "—")
    pdf.kv("Status", cen.status)
    pdf.kv("Comitê", cen.comite.nome if cen.comite else "—")
    pdf.kv("Coordenador", cen.coordenador.nome if cen.coordenador else "—")
    if cen.risco:
        pdf.kv("Risco vinculado", f"{cen.risco.codigo} — {cen.risco.nome}")
    pdf.kv("Última revisão", cen.ultima_revisao.isoformat() if cen.ultima_revisao else "—")
    pdf.ln(2)

    # Acionamento
    if cen.acionamentos:
        pdf.h2("Árvore de acionamento")
        for a in sorted(cen.acionamentos, key=lambda x: x.ordem):
            tempo = (
                "T+0 min (imediato)"
                if a.tempo_resposta_min == 0
                else (f"T+{a.tempo_resposta_min} min" if a.tempo_resposta_min else "—")
            )
            pdf.set_font("helvetica", "B", 9)
            pdf.multi_cell(0, 5, _strip(f"  Passo {a.ordem + 1}: {a.papel}"))
            pdf.set_font("helvetica", "", 8)
            pdf.set_text_color(*BRAND_LIGHT)
            pdf.multi_cell(0, 4.5, _strip(f"  Tempo: {tempo}"))
            if a.criterio:
                pdf.multi_cell(0, 4.5, _strip(f"  Critério: {a.criterio}"))
            if a.contato:
                pdf.multi_cell(0, 4.5, _strip(f"  Contato: {a.contato}"))
            pdf.set_text_color(*BRAND_DARK)
            pdf.ln(1)

    # Runbook
    if cen.runbooks:
        pdf.add_page()
        for rb in cen.runbooks:
            pdf.h2(f"Runbook — {rb.titulo} (v{rb.versao})")
            if rb.descricao:
                pdf.p(rb.descricao, size=9)
                pdf.ln(2)
            for s in sorted(rb.steps, key=lambda x: x.ordem):
                pdf.set_font("helvetica", "B", 9)
                pdf.multi_cell(0, 5, _strip(f"  {s.ordem + 1}. {s.descricao}"))
                pdf.set_font("helvetica", "", 8)
                pdf.set_text_color(*BRAND_LIGHT)
                parts = []
                if s.tempo_estimado_min is not None:
                    parts.append(
                        "Imediato"
                        if s.tempo_estimado_min == 0
                        else f"{s.tempo_estimado_min} min"
                    )
                if s.recursos_necessarios:
                    parts.append(f"Recursos: {s.recursos_necessarios}")
                if s.responsavel:
                    parts.append(f"Resp: {s.responsavel.nome}")
                if parts:
                    pdf.multi_cell(0, 4.5, _strip("  " + " | ".join(parts)))
                pdf.set_text_color(*BRAND_DARK)
                pdf.ln(1)

    # Simulados
    if cen.simulados:
        pdf.h2("Simulados")
        for s in cen.simulados:
            data = s.data_prevista.isoformat() if s.data_prevista else "—"
            nota = f" | Nota: {s.nota_performance}/5" if s.nota_performance else ""
            pdf.kv(
                f"{s.tipo.upper()} · {data}",
                f"{s.titulo} ({s.status}){nota}",
            )

    # RACI de comunicação
    raci = (
        db.query(MatrizRACIComunicacao)
        .filter_by(entidade_tipo="cenario", entidade_id=cenario_id)
        .all()
    )
    if raci:
        pdf.h2("Matriz RACI de Comunicação")
        for momento in ("deteccao", "resolucao", "pos_evento", "continuo"):
            grupo = [r for r in raci if r.momento == momento]
            if not grupo:
                continue
            pdf.h3(momento.replace("_", " ").upper())
            for r in grupo:
                pdf.kv(
                    f"[{r.papel[0].upper()}] {r.stakeholder.nome if r.stakeholder else '-'}",
                    f"{r.canal_preferido or '-'} | prazo {r.prazo_max_min or '-'} min"
                    + (" | obrigatório" if r.obrigatorio else " | opcional"),
                )

    # Templates associados
    templates = (
        db.query(TemplateComunicacao).filter_by(cenario_id=cenario_id).all()
    )
    if templates:
        pdf.h2(f"Templates de comunicação ({len(templates)})")
        for t in templates:
            pdf.kv(t.codigo, t.titulo)

    buf = io.BytesIO()
    buf.write(bytes(pdf.output()))
    buf.seek(0)
    return buf.getvalue()


def exportar_board_report_pdf(db: Session) -> bytes:
    """Reporte Trimestral ao Board (COSO ERM + ISO 31000)."""
    from datetime import date as _date

    riscos_corp = db.query(Risco).filter_by(tipo_escopo="corporativo").all()
    ameacas = [r for r in riscos_corp if r.natureza == "ameaca"]
    oportunidades = [r for r in riscos_corp if r.natureza == "oportunidade"]
    cats_erm = {c.id: c for c in db.query(CategoriaERM).all()}
    linhas = {l.id: l for l in db.query(LinhaDefesa).all()}
    objetivos = db.query(ObjetivoEstrategico).filter_by(ativo=True).all()
    snapshots = (
        db.query(TopRiscoSnapshot)
        .filter_by(tipo_escopo="corporativo")
        .order_by(TopRiscoSnapshot.data_snapshot.desc())
        .limit(2)
        .all()
    )
    apts = (
        db.query(RiskAppetite)
        .filter_by(ativo=True, escopo="por_categoria_erm")
        .all()
    )

    pdf = RelatorioPDF("Reporte Trimestral ao Board")
    pdf.add_page()
    pdf.h1("Reporte Trimestral ao Board")
    pdf.set_text_color(*BRAND_LIGHT)
    pdf.set_font("helvetica", "", 9)
    pdf.multi_cell(
        0,
        5,
        _strip(
            f"Gestão de Riscos Corporativos (ERM) | {datetime.now().strftime('%d/%m/%Y')} | "
            f"COSO ERM 2017 + ISO 31000:2018"
        ),
    )
    pdf.set_text_color(*BRAND_DARK)
    pdf.ln(3)

    # Sumário executivo
    pdf.h2("Sumário Executivo")
    criticos = sum(1 for r in ameacas if r.classificacao_residual == "C")
    ms = sum(1 for r in ameacas if r.classificacao_residual == "MS")
    pdf.kv("Total de riscos corporativos", str(len(riscos_corp)))
    pdf.kv("Ameaças mapeadas", str(len(ameacas)))
    pdf.kv("Oportunidades (ISO 31000)", str(len(oportunidades)))
    pdf.kv("Críticos (residual)", str(criticos))
    pdf.kv("Muito Significativos", str(ms))
    pdf.kv("Objetivos estratégicos ativos", str(len(objetivos)))
    pdf.kv("Snapshots disponíveis", str(db.query(TopRiscoSnapshot).count()))
    pdf.ln(2)

    # Apetite COSO
    pdf.h2("Apetite a Risco declarado vs Exposição Real")
    class_rank = {"PS": 1, "S": 2, "MS": 3, "C": 4}
    total_breaches = 0
    for a in apts:
        cat = cats_erm.get(a.categoria_erm_id or 0)
        if not cat:
            continue
        riscos_cat = [r for r in ameacas if r.categoria_erm_id == cat.id]
        tol_rank = class_rank.get(a.tolerancia_max_classificacao, 3)
        em_breach = [
            r for r in riscos_cat
            if r.classificacao_residual
            and class_rank.get(r.classificacao_residual, 0) > tol_rank
        ]
        total_breaches += len(em_breach)
        status = "OK" if not em_breach else f"BREACH ({len(em_breach)})"
        color = GREEN if not em_breach else RED
        pdf.set_font("helvetica", "B", 9)
        pdf.set_text_color(*color)
        pdf.multi_cell(
            0, 5,
            _strip(f"[{status}] {cat.codigo} - {cat.nome}: apetite {a.apetite_nivel}/5, tolerancia {a.tolerancia_max_classificacao}"),
        )
        pdf.set_text_color(*BRAND_DARK)
        pdf.set_font("helvetica", "", 8)
        if em_breach:
            codigos = ", ".join(r.codigo for r in em_breach[:8])
            pdf.multi_cell(0, 4.5, _strip(f"   Em breach: {codigos}"))
        pdf.ln(0.5)
    pdf.ln(2)

    # Top 10 com comparação trimestral
    pdf.add_page()
    pdf.h2("Top 10 Riscos Corporativos Residuais")
    top10 = sorted(
        ameacas,
        key=lambda r: (r.prob_residual or 0) * (r.impacto_residual or 0),
        reverse=True,
    )[:10]

    # Se temos snapshot anterior, compara posição
    posicoes_anteriores: dict[int, int] = {}
    if len(snapshots) >= 2:
        for it in snapshots[1].itens:  # penúltimo snapshot
            posicoes_anteriores[it.risco_id] = it.posicao

    for pos, r in enumerate(top10, start=1):
        cat = cats_erm.get(r.categoria_erm_id or 0)
        cat_cod = cat.codigo if cat else "-"
        pos_ant = posicoes_anteriores.get(r.id)
        delta = ""
        if pos_ant is not None:
            diff = pos_ant - pos
            if diff > 0:
                delta = f" (subiu {diff})"
            elif diff < 0:
                delta = f" (caiu {-diff})"
            else:
                delta = " (estavel)"
        pdf.set_font("helvetica", "B", 9)
        pdf.multi_cell(
            0, 5,
            _strip(f"#{pos} [{r.codigo}] {cat_cod} - {r.classificacao_residual or '-'}{delta}"),
        )
        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*BRAND_LIGHT)
        pdf.multi_cell(0, 4.5, _strip(f"   {r.nome}"))
        score = (r.prob_residual or 0) * (r.impacto_residual or 0)
        pdf.multi_cell(
            0, 4.5,
            _strip(f"   P={r.prob_residual or '-'} x I={r.impacto_residual or '-'} = score {score} | horizonte {r.horizonte or '-'} | tratamento: {r.tipo_tratamento_estrategico or '-'}")
        )
        pdf.set_text_color(*BRAND_DARK)
        pdf.ln(0.5)

    # Oportunidades
    if oportunidades:
        pdf.add_page()
        pdf.h2("Oportunidades Identificadas (ISO 31000 reconhece)")
        for o in oportunidades:
            pdf.set_font("helvetica", "B", 9)
            pdf.set_text_color(*GREEN)
            pdf.multi_cell(
                0, 5,
                _strip(f"[OPORT] [{o.codigo}] {o.nome}")
            )
            pdf.set_text_color(*BRAND_DARK)
            pdf.set_font("helvetica", "", 8)
            if o.descricao:
                pdf.multi_cell(0, 4.5, _strip(f"   {o.descricao[:250]}"))
            pdf.multi_cell(
                0, 4.5,
                _strip(f"   Tratamento: {o.tipo_tratamento_estrategico or 'explorar'} | horizonte: {o.horizonte or '-'}")
            )
            pdf.ln(0.5)

    # Distribuição por linha de defesa
    pdf.add_page()
    pdf.h2("Cobertura por 3 Linhas de Defesa (IIA)")
    por_linha: dict[int, list[Risco]] = {}
    for r in ameacas:
        if r.linha_defesa_id:
            por_linha.setdefault(r.linha_defesa_id, []).append(r)
    for ld in sorted(linhas.values(), key=lambda x: x.numero):
        lista = por_linha.get(ld.id, [])
        pdf.kv(
            f"{ld.numero}a Linha - {ld.nome[:40]}",
            f"{len(lista)} riscos | Responsavel: {ld.responsavel.nome if ld.responsavel else '-'}"
        )
    pdf.ln(2)

    # Cobertura por objetivo estratégico
    pdf.h2("Cobertura por Objetivo Estratégico (BSC)")
    for o in objetivos:
        n = db.query(RiscoObjetivoLink).filter_by(objetivo_id=o.id).count()
        badge = "[OK]" if n > 0 else "[SEM COBERTURA]"
        pdf.set_font("helvetica", "B", 9)
        pdf.multi_cell(0, 5, _strip(f"{badge} {o.codigo} - {o.descricao[:70]}"))
        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*BRAND_LIGHT)
        pdf.multi_cell(0, 4.5, _strip(f"   Perspectiva: {o.perspectiva_bsc} | Riscos mapeados: {n} | Meta: {o.meta or '-'}"))
        pdf.set_text_color(*BRAND_DARK)
        pdf.ln(0.5)

    # Snapshots recentes
    if snapshots:
        pdf.add_page()
        pdf.h2("Snapshots Trimestrais Recentes")
        for s in snapshots:
            pdf.kv(s.periodo or s.data_snapshot.isoformat(), f"{s.titulo} ({s.n_itens if hasattr(s, 'n_itens') else len(s.itens)} itens)")
            if s.observacoes:
                pdf.p_muted(f"   {s.observacoes[:200]}")

    # Projetos e seus riscos (referência cruzada)
    pdf.add_page()
    pdf.h2("Portfolio de Projetos e Riscos Associados")
    projetos = db.query(Projeto).filter_by(ativo=True).all()
    for p in projetos:
        n_riscos = db.query(Risco).filter_by(projeto_id=p.id).count()
        status_texto = p.status.replace('_', ' ').upper()
        pdf.set_font("helvetica", "B", 9)
        pdf.multi_cell(
            0, 5,
            _strip(f"[{p.codigo}] {p.nome} - {status_texto} - {n_riscos} riscos")
        )
        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*BRAND_LIGHT)
        pdf.multi_cell(
            0, 4.5,
            _strip(f"   Owner: {p.owner.nome if p.owner else '-'} | Periodo: {p.data_inicio or '-'} -> {p.data_fim or '-'}")
        )
        pdf.set_text_color(*BRAND_DARK)
        pdf.ln(0.5)

    pdf.ln(3)
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(*BRAND_LIGHT)
    pdf.multi_cell(
        0, 4,
        _strip(
            "Este reporte seguiu o framework COSO ERM 2017 (Enterprise Risk Management Integrated with Strategy and Performance), "
            "ISO 31000:2018 (principios e processo), IIA 3 Lines of Defense, e recomendacoes IBGC e CVM 586/2017."
        )
    )

    buf = io.BytesIO()
    buf.write(bytes(pdf.output()))
    buf.seek(0)
    return buf.getvalue()


def exportar_executivo_pdf(db: Session) -> bytes:
    """Consolidado executivo: mapa de riscos, top críticos, KRIs, cenários, apetite."""
    riscos = db.query(Risco).all()
    cenarios = db.query(CenarioCrise).all()
    kris = db.query(KRI).all()
    apetites = db.query(RiskAppetite).filter_by(ativo=True).all()

    pdf = RelatorioPDF("Relatório Executivo de Riscos")
    pdf.add_page()
    pdf.h1("Relatório Executivo de Riscos")
    pdf.set_text_color(*BRAND_LIGHT)
    pdf.set_font("helvetica", "", 9)
    pdf.multi_cell(
        0,
        5,
        _strip(
            f"Gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')} | "
            f"{len(riscos)} riscos | {len(cenarios)} cenários | {len(kris)} KRIs"
        ),
    )
    pdf.set_text_color(*BRAND_DARK)
    pdf.ln(4)

    # Resumo quantitativo
    pdf.h2("Resumo do mapa de riscos")
    por_cls: dict[str, int] = {}
    por_estagio: dict[str, int] = {}
    por_categoria: dict[str, int] = {}
    for r in riscos:
        if r.classificacao_residual:
            por_cls[r.classificacao_residual] = por_cls.get(r.classificacao_residual, 0) + 1
        if r.estagio:
            por_estagio[r.estagio] = por_estagio.get(r.estagio, 0) + 1
        if r.categoria:
            por_categoria[r.categoria.nome] = por_categoria.get(r.categoria.nome, 0) + 1

    pdf.kv("Críticos (C)", str(por_cls.get("C", 0)))
    pdf.kv("Muito Significativos (MS)", str(por_cls.get("MS", 0)))
    pdf.kv("Significativos (S)", str(por_cls.get("S", 0)))
    pdf.kv("Pouco Significativos (PS)", str(por_cls.get("PS", 0)))
    pdf.ln(2)

    pdf.h3("Por estágio")
    for k, v in sorted(por_estagio.items(), key=lambda x: -x[1]):
        pdf.kv(k, str(v))
    pdf.ln(2)

    pdf.h3("Por categoria")
    for k, v in sorted(por_categoria.items(), key=lambda x: -x[1]):
        pdf.kv(k, str(v))

    # Top críticos
    pdf.add_page()
    pdf.h2("Riscos críticos (residual = C)")
    criticos = [r for r in riscos if r.classificacao_residual == "C"]
    for r in sorted(criticos, key=lambda x: x.codigo)[:15]:
        pdf.set_font("helvetica", "B", 9)
        pdf.multi_cell(0, 5, _strip(f"[{r.codigo}] {r.nome}"))
        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*BRAND_LIGHT)
        pdf.multi_cell(
            0,
            4.5,
            _strip(
                f"   P={r.prob_residual or '-'} x I={r.impacto_residual or '-'} | "
                f"{r.categoria.nome if r.categoria else '-'} | "
                f"{r.responsavel.nome if r.responsavel else '-'}"
            ),
        )
        pdf.set_text_color(*BRAND_DARK)
        pdf.ln(1)

    # KRIs em vermelho
    def _status_kri(k: KRI) -> str:
        meds = sorted(k.medicoes, key=lambda m: m.data)
        return meds[-1].status if meds else "sem_dados"

    vermelhos = [k for k in kris if _status_kri(k) == "vermelho"]
    amarelos = [k for k in kris if _status_kri(k) == "amarelo"]
    if vermelhos or amarelos:
        pdf.h2("KRIs — indicadores em alerta")
        for k in vermelhos:
            meds = sorted(k.medicoes, key=lambda m: m.data)
            ultimo = meds[-1] if meds else None
            pdf.set_font("helvetica", "B", 9)
            pdf.set_text_color(*RED)
            pdf.multi_cell(
                0,
                5,
                _strip(f"[VERMELHO] {k.codigo} - {k.nome}"),
            )
            pdf.set_text_color(*BRAND_DARK)
            pdf.set_font("helvetica", "", 8)
            pdf.multi_cell(
                0,
                4.5,
                _strip(
                    f"   Último valor: {ultimo.valor if ultimo else '-'} {k.unidade} "
                    f"(limite vermelho: {k.limite_vermelho or '-'})"
                ),
            )
            pdf.ln(1)
        for k in amarelos:
            meds = sorted(k.medicoes, key=lambda m: m.data)
            ultimo = meds[-1] if meds else None
            pdf.set_font("helvetica", "B", 9)
            pdf.set_text_color(*AMBER)
            pdf.multi_cell(
                0,
                5,
                _strip(f"[AMARELO] {k.codigo} - {k.nome}"),
            )
            pdf.set_text_color(*BRAND_DARK)
            pdf.set_font("helvetica", "", 8)
            pdf.multi_cell(
                0,
                4.5,
                _strip(f"   Último valor: {ultimo.valor if ultimo else '-'} {k.unidade}"),
            )
            pdf.ln(1)

    # Apetite vs exposição
    pdf.add_page()
    pdf.h2("Apetite a Risco vs Exposição Real")
    class_rank = {"PS": 1, "S": 2, "MS": 3, "C": 4}
    for apt in apetites:
        if not apt.categoria:
            continue
        cat = apt.categoria
        riscos_cat = [r for r in riscos if r.categoria_id == cat.id]
        tol_rank = class_rank.get(apt.tolerancia_max_classificacao, 3)
        breach = [
            r
            for r in riscos_cat
            if r.classificacao_residual
            and class_rank.get(r.classificacao_residual, 0) > tol_rank
        ]
        status = "OK" if not breach else f"BREACH ({len(breach)})"
        color = GREEN if not breach else RED
        pdf.set_font("helvetica", "B", 9)
        pdf.set_text_color(*color)
        pdf.multi_cell(
            0,
            5,
            _strip(
                f"[{status}] {cat.nome}: apetite {apt.apetite_nivel}/5, "
                f"tolerância {apt.tolerancia_max_classificacao}"
            ),
        )
        pdf.set_text_color(*BRAND_DARK)
        pdf.set_font("helvetica", "", 8)
        if breach:
            pdf.multi_cell(
                0,
                4.5,
                _strip(
                    f"   Riscos em breach: " + ", ".join(r.codigo for r in breach)
                ),
            )
        pdf.ln(1)

    # Cenários de crise
    if cenarios:
        pdf.add_page()
        pdf.h2(f"Cenários de crise ({len(cenarios)})")
        cenarios_sorted = sorted(
            cenarios,
            key=lambda c: (c.severidade or 0) * (c.probabilidade or 0),
            reverse=True,
        )
        for c in cenarios_sorted:
            score = (c.severidade or 0) * (c.probabilidade or 0)
            pdf.set_font("helvetica", "B", 9)
            pdf.multi_cell(
                0,
                5,
                _strip(f"[{c.codigo}] {c.nome} - score {score}"),
            )
            pdf.set_font("helvetica", "", 8)
            pdf.set_text_color(*BRAND_LIGHT)
            pdf.multi_cell(
                0,
                4.5,
                _strip(
                    f"   Categoria: {c.categoria or '-'} | Status: {c.status} | "
                    f"Sev {c.severidade or '-'}/5 | Prob {c.probabilidade or '-'}/5"
                ),
            )
            pdf.set_text_color(*BRAND_DARK)
            pdf.ln(1)

    buf = io.BytesIO()
    buf.write(bytes(pdf.output()))
    buf.seek(0)
    return buf.getvalue()
