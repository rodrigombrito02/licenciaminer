"""Motor de regras da Trilha do Ativo Minerário.

A Trilha é o ciclo de vida REGULATÓRIO de um direito minerário, do requerimento
de pesquisa à operação. As datas/prazos NÃO vêm preenchidas por registro na base
local (~96% nulas) — elas decorrem da legislação (Código de Mineração, DL 227/1967,
e regulação ANM). Por isso este módulo é um motor de REGRAS: dada a fase atual do
processo, diz em que etapa ele está e quais prazos legais se aplicam.

Camada "regra" (o que está sujeito a quê) → disponível agora, para todos os processos.
Camada "countdown" (vence em X dias) → depende de ingerir a data-âncora (publicação
do alvará etc.); por ora é calculada só quando a data existe no registro.
"""

from __future__ import annotations

import unicodedata
from datetime import date, datetime
from typing import Optional, TypedDict


# ── Etapas canônicas da trilha (regime ordinário de pesquisa → lavra) ──
class Etapa(TypedDict):
    ordem: int
    key: str
    label: str
    descricao: str


ETAPAS: list[Etapa] = [
    {"ordem": 1, "key": "requerimento_pesquisa", "label": "Requerimento de Pesquisa",
     "descricao": "Protocolo do pedido e análise pela ANM."},
    {"ordem": 2, "key": "autorizacao_pesquisa", "label": "Autorização de Pesquisa",
     "descricao": "Alvará válido por 1 a 3 anos. TAH anual e janela de prorrogação."},
    {"ordem": 3, "key": "relatorio_pesquisa", "label": "Relatório Final de Pesquisa",
     "descricao": "Entrega dentro da validade do alvará. Aprovado, reconhece a jazida."},
    {"ordem": 4, "key": "requerimento_lavra", "label": "Requerimento de Lavra",
     "descricao": "Pedido de concessão em até 1 ano após aprovação do RFP."},
    {"ordem": 5, "key": "concessao_lavra", "label": "Concessão de Lavra",
     "descricao": "Portaria de lavra. Início dos trabalhos em até 6 meses."},
    {"ordem": 6, "key": "operacao", "label": "Operação",
     "descricao": "Mina ativa. RAL anual, CFEM e condicionantes ambientais."},
]

ETAPA_POR_ORDEM = {e["ordem"]: e for e in ETAPAS}


# ── Prazos legais aplicáveis por etapa (camada "regra") ──
class Prazo(TypedDict):
    codigo: str
    evento: str
    prazo: str
    base: str
    recorrente: bool
    fonte: str


PRAZOS_POR_ETAPA: dict[int, list[Prazo]] = {
    1: [
        {"codigo": "exigencia", "evento": "Resposta a exigências", "prazo": "60 dias", "base": "publicação da exigência",
         "recorrente": False, "fonte": "ANM"},
    ],
    2: [
        {"codigo": "tah", "evento": "TAH (Taxa Anual por Hectare)", "prazo": "anual", "base": "recorrente",
         "recorrente": True, "fonte": "Código de Mineração, art. 20"},
        {"codigo": "prorrogacao", "evento": "Pedido de prorrogação da pesquisa", "prazo": "até 60 dias antes do vencimento",
         "base": "vencimento do alvará", "recorrente": False, "fonte": "Código de Mineração, art. 22 §1º"},
        {"codigo": "rfp", "evento": "Entrega do Relatório Final de Pesquisa", "prazo": "dentro da validade do alvará",
         "base": "vencimento do alvará", "recorrente": False, "fonte": "Código de Mineração, art. 22"},
    ],
    3: [
        {"codigo": "req_lavra", "evento": "Requerimento de Lavra", "prazo": "1 ano após aprovação do RFP",
         "base": "aprovação do RFP", "recorrente": False, "fonte": "Código de Mineração, art. 31"},
    ],
    4: [
        {"codigo": "exigencia", "evento": "Resposta a exigências da concessão", "prazo": "60 dias", "base": "publicação da exigência",
         "recorrente": False, "fonte": "ANM"},
    ],
    5: [
        {"codigo": "inicio_lavra", "evento": "Início dos trabalhos de lavra", "prazo": "6 meses após a portaria",
         "base": "publicação da portaria", "recorrente": False, "fonte": "Código de Mineração, art. 47"},
        {"codigo": "ral", "evento": "RAL (Relatório Anual de Lavra)", "prazo": "anual, até 15 de março",
         "base": "recorrente", "recorrente": True, "fonte": "ANM"},
    ],
    6: [
        {"codigo": "ral", "evento": "RAL (Relatório Anual de Lavra)", "prazo": "anual, até 15 de março",
         "base": "recorrente", "recorrente": True, "fonte": "ANM"},
        {"codigo": "cfem", "evento": "CFEM", "prazo": "mensal, até o último dia útil do mês seguinte",
         "base": "recorrente", "recorrente": True, "fonte": "Lei 8.876/1994"},
    ],
}


# Regimes especiais (fora da trilha ordinária pesquisa→lavra)
REGIME_ESPECIAL = {
    "licenciamento": "Licenciamento",
    "requerimento_licenciamento": "Requerimento de Licenciamento",
    "plg": "Lavra Garimpeira (PLG)",
    "requerimento_plg": "Requerimento de Lavra Garimpeira (PLG)",
    "cessao_direitos": "Cessão de Direitos",
    "registro_extracao": "Registro de Extração",
    "requerimento_registro_extracao": "Requerimento de Registro de Extração",
    "guia_utilizacao": "Guia de Utilização",
}


def _norm(s: Optional[str]) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return s.strip().lower()


def _etapa_por_fase(fase: str) -> Optional[int]:
    """Mapeia o texto de fase_atual para a ordem da etapa canônica (1-6)."""
    f = _norm(fase)
    if not f:
        return None
    # ordem importa: garimpeira antes de lavra, requerimento antes de concessão
    if "garimpeira" in f or "plg" in f:
        return None  # regime especial
    if "disponibilidade" in f or "disponivel" in f:
        return None
    if "licenciamento" in f:
        return None  # regime especial
    if "requerimento de pesquisa" in f:
        return 1
    if "autorizacao de pesquisa" in f or "autorizado de pesquisa" in f:
        return 2
    if "relatorio" in f:
        return 3
    if "requerimento de lavra" in f:
        return 4
    if "concessao de lavra" in f or "portaria de lavra" in f:
        return 5
    if "lavra" in f and "requerimento" not in f:
        return 5
    return None


def _etapa_por_regime(regime: str) -> Optional[int]:
    r = _norm(regime)
    mapping = {
        "requerimento_pesquisa": 1,
        "alvara_pesquisa": 2,
        "relatorio_pesquisa": 3,
        "requerimento_lavra": 4,
        "portaria_lavra": 5,
    }
    return mapping.get(r)


def _ultimo_dia_util(ano: int, mes: int) -> date:
    """Último dia útil do mês (aproximação: recua sábado/domingo, sem feriados)."""
    if mes == 12:
        prox = date(ano + 1, 1, 1)
    else:
        prox = date(ano, mes + 1, 1)
    from datetime import timedelta
    d = prox - timedelta(days=1)
    while d.weekday() >= 5:  # 5=sáb, 6=dom
        d -= timedelta(days=1)
    return d


def _proximo_recorrente(codigo: str, hoje: date) -> Optional[date]:
    """Próxima ocorrência de um prazo recorrente de calendário (sem dado por processo).

    RAL: 15 de março de cada ano. CFEM: último dia útil do mês seguinte ao fato gerador.
    TAH: anual, mas a data é definida pela ANM por edital — não calculamos aqui.
    """
    if codigo == "ral":
        alvo = date(hoje.year, 3, 15)
        if alvo < hoje:
            alvo = date(hoje.year + 1, 3, 15)
        return alvo
    if codigo == "cfem":
        # fato gerador no mês corrente → vencimento no mês seguinte
        mes = hoje.month + 1
        ano = hoje.year
        if mes > 12:
            mes, ano = 1, ano + 1
        return _ultimo_dia_util(ano, mes)
    return None


def _parse_data(s: Optional[str]) -> Optional[date]:
    """Tenta DD/MM/YYYY (formato ANM)."""
    if not s:
        return None
    s = s.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def montar_trilha(registro: dict, hoje: Optional[date] = None) -> dict:
    """Constrói a trilha de um ativo a partir do registro da base ANM.

    Args:
        registro: linha de v_scm/v_concessoes (fase_atual, regime, ativo_cfem, ...).
        hoje: data de referência (injetável para testes; default = hoje).

    Returns:
        dict com etapa_atual, regime_especial, etapas[], prazos[], observacao.
    """
    fase = registro.get("fase_atual") or registro.get("FASE") or ""
    regime = registro.get("regime") or ""

    ordem = _etapa_por_fase(fase)
    if ordem is None:
        ordem = _etapa_por_regime(regime)

    # Promoção a Operação (6): concessão com CFEM ativo
    ativo_cfem = registro.get("ativo_cfem")
    if ordem == 5 and ativo_cfem is True:
        ordem = 6

    # Regime especial?
    regime_especial = None
    if ordem is None:
        r = _norm(regime)
        f = _norm(fase)
        for key, label in REGIME_ESPECIAL.items():
            if key in r:
                regime_especial = label
                break
        if regime_especial is None:
            if "garimpeira" in f or "plg" in f:
                regime_especial = "Lavra Garimpeira (PLG)"
            elif "licenciamento" in f:
                regime_especial = "Licenciamento"
            elif "disponibilidade" in f or "disponivel" in f:
                regime_especial = "Disponibilidade"

    # Monta as 6 etapas com status
    etapas_out = []
    for e in ETAPAS:
        if ordem is None:
            status = "futura"
        elif e["ordem"] < ordem:
            status = "concluida"
        elif e["ordem"] == ordem:
            status = "atual"
        else:
            status = "futura"
        etapas_out.append({**e, "status": status})

    if hoje is None:
        try:
            hoje = date.today()
        except Exception:
            hoje = None

    # Prazos da etapa + próxima ocorrência dos recorrentes de calendário
    prazos = []
    for p in (PRAZOS_POR_ETAPA.get(ordem, []) if ordem else []):
        item = dict(p)
        if p.get("recorrente") and hoje:
            prox = _proximo_recorrente(p["codigo"], hoje)
            if prox:
                item["proximo"] = prox.isoformat()
                item["dias_restantes"] = (prox - hoje).days
        prazos.append(item)

    # Countdown real (só quando a data-âncora existe no registro)
    countdown = None
    venc = _parse_data(registro.get("prazo")) or None
    pub = _parse_data(registro.get("data_publicacao"))
    if venc and hoje:
        dias = (venc - hoje).days
        countdown = {"vencimento": venc.isoformat(), "dias_restantes": dias}

    observacao = None
    if regime_especial:
        observacao = (
            f"Regime especial: {regime_especial}. A trilha ordinária pesquisa→lavra "
            "serve de referência; os marcos específicos deste regime serão detalhados."
        )
    elif ordem is None:
        observacao = "Etapa não identificada a partir dos dados disponíveis."

    return {
        "etapa_atual": ordem,
        "etapa_label": ETAPA_POR_ORDEM[ordem]["label"] if ordem else None,
        "regime_especial": regime_especial,
        "etapas": etapas_out,
        "prazos": prazos,
        "countdown": countdown,
        "data_publicacao": pub.isoformat() if pub else None,
        "observacao": observacao,
    }
