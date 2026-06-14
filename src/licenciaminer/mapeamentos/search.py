"""Motor de busca dos Mapeamentos — constroi SQL sobre a base local de
concessoes (v_concessoes, MG enriquecido) a partir de criterios + pesos.

Funcoes puras: nao executam SQL (isso fica no router via run_query), apenas
montam a query e derivam motivos. Mantem o acoplamento src -> api em zero.

Etapa 1 (local): os sinais usados sao TODOS computaveis a partir dos parquets
ja coletados — sem agua/energia/logistica (que dependem de fontes externas a
serem integradas na etapa de enriquecimento). Honesto sobre o que da hoje.
"""

from __future__ import annotations

import re

# View base — MG enriquecido (categoria, estrategico, ativo_cfem, valor_relativo).
VIEW = "v_concessoes"

# Colunas retornadas pela varredura
SELECT_COLS = [
    "processo_norm AS processo",
    "titular",
    "cpf_cnpj_do_titular AS cpf_cnpj",
    "substancia_principal AS substancia",
    "categoria",
    "municipio_principal AS municipio",
    "fase_atual AS fase",
    "AREA_HA AS area_ha",
    "ativo_cfem",
    "cfem_total",
    "cfem_ultimo_ano",
    "valor_relativo",
    "estrategico",
    "ULT_EVENTO AS ult_evento",
    # Enriquecimento espacial (2.2) — sobreposicao ambiental
    "tem_uc",
    "tem_ti",
    "biomas",
]

# Pesos default (0-100 no total aproximado) — todos sobre sinais locais.
PESOS_DEFAULT = {
    "cfem_inativo": 30,        # ativo_cfem = false  -> parado, destravavel
    "estrategico": 25,         # substancia estrategica
    "area": 15,                # porte do direito
    "sem_cfem_historico": 15,  # nunca recolheu CFEM
    "alto_valor": 15,          # categoria/valor relativo alto
    "distress": 10,            # ULT_EVENTO sinaliza multa/paralisacao
    "espolio": 10,             # titular em espolio (sinal sucessorio)
    "sem_restricao": 10,       # sem sobreposicao com UC/TI (licenciamento mais simples)
}

# Validacao de membros de lista usados em IN (...) — evita injecao.
_SAFE = re.compile(r"^[0-9A-Za-zÀ-ÿ \-/().,&]+$")


def _esc(value: str) -> str:
    """Escapa string para literal SQL (dobra aspas simples)."""
    return value.replace("'", "''")


def _str_list(values: list[str]) -> list[str]:
    """Filtra/escapa membros de lista para uso seguro em IN (...)."""
    out = []
    for v in values or []:
        v = str(v).strip()
        if v and _SAFE.match(v):
            out.append(_esc(v))
    return out


def build_where(criterios: dict | None) -> str:
    """Monta a clausula WHERE a partir dos criterios da tese."""
    criterios = criterios or {}
    clauses = ["regime IS NOT NULL"]

    # Categorias (Metalicos Ferrosos, Construcao Civil, ...)
    cats = _str_list(criterios.get("categorias"))
    if cats:
        inner = ", ".join(f"'{c}'" for c in cats)
        clauses.append(f"categoria IN ({inner})")

    # Substancias (match textual em substancia_principal / substancia)
    subs = _str_list(criterios.get("substancias"))
    if subs:
        ors = " OR ".join(
            f"(upper(substancia_principal) LIKE '%{s.upper()}%' "
            f"OR upper(substancia) LIKE '%{s.upper()}%')"
            for s in subs
        )
        clauses.append(f"({ors})")

    # Fases (Concessao de Lavra, Licenciamento, ...)
    fases = _str_list(criterios.get("fases"))
    if fases:
        inner = ", ".join(f"'{f}'" for f in fases)
        clauses.append(f"fase_atual IN ({inner})")

    # Area (ha)
    amin = criterios.get("area_min")
    amax = criterios.get("area_max")
    if isinstance(amin, (int, float)):
        clauses.append(f"AREA_HA >= {float(amin)}")
    if isinstance(amax, (int, float)):
        clauses.append(f"AREA_HA <= {float(amax)}")

    # Status CFEM: inativo | ativo | qualquer
    cfem = (criterios.get("cfem_status") or "qualquer").lower()
    if cfem == "inativo":
        clauses.append("(ativo_cfem = false OR ativo_cfem IS NULL)")
    elif cfem == "ativo":
        clauses.append("ativo_cfem = true")

    # Tipo de titular: pf | pj | espolio | qualquer
    tipo = (criterios.get("titular_tipo") or "qualquer").lower()
    digits = "regexp_replace(COALESCE(cpf_cnpj_do_titular, ''), '[^0-9]', '', 'g')"
    if tipo == "pf":
        clauses.append(f"length({digits}) = 11")
    elif tipo == "pj":
        clauses.append(f"length({digits}) = 14")
    elif tipo == "espolio":
        clauses.append("(upper(titular) LIKE '%ESPOLIO%' OR upper(titular) LIKE '%ESPÓLIO%')")

    # Apenas estrategico
    if criterios.get("apenas_estrategico"):
        clauses.append("estrategico = 'sim'")

    # Sem sobreposicao ambiental (exclui UC/TI) — enriquecimento 2.2
    if criterios.get("sem_sobreposicao"):
        clauses.append("COALESCE(tem_uc, false) = false AND COALESCE(tem_ti, false) = false")

    return " AND ".join(clauses)


def build_score_expr(pesos: dict | None) -> str:
    """Monta a expressao de score (0-100) a partir dos pesos (inteiros nossos)."""
    p = {**PESOS_DEFAULT, **(pesos or {})}

    def w(key: str) -> float:
        try:
            return float(p.get(key, 0))
        except (TypeError, ValueError):
            return 0.0

    return f"""(
        CASE WHEN ativo_cfem = false OR ativo_cfem IS NULL THEN {w('cfem_inativo')} ELSE 0 END
        + CASE WHEN estrategico = 'sim' THEN {w('estrategico')} ELSE 0 END
        + CASE WHEN AREA_HA > 500 THEN {w('area')}
               WHEN AREA_HA > 100 THEN {w('area') * 0.5}
               ELSE 0 END
        + CASE WHEN cfem_total IS NULL OR cfem_total = 0 THEN {w('sem_cfem_historico')} ELSE 0 END
        + CASE WHEN categoria IN ('Metálicos Preciosos', 'Metálicos Estratégicos')
                    OR valor_relativo IN ('alto', 'muito_alto')
               THEN {w('alto_valor')} ELSE 0 END
        + CASE WHEN upper(COALESCE(ULT_EVENTO, '')) LIKE '%MULTA%'
                    OR upper(COALESCE(ULT_EVENTO, '')) LIKE '%PARALIS%'
               THEN {w('distress')} ELSE 0 END
        + CASE WHEN upper(titular) LIKE '%ESPOLIO%' OR upper(titular) LIKE '%ESPÓLIO%'
               THEN {w('espolio')} ELSE 0 END
        + CASE WHEN COALESCE(tem_uc, false) = false AND COALESCE(tem_ti, false) = false
               THEN {w('sem_restricao')} ELSE 0 END
    )"""


def build_search_sql(criterios: dict | None, pesos: dict | None, limit: int = 200) -> str:
    """SQL completo da varredura: SELECT colunas + score, WHERE, ORDER, LIMIT.

    Junta v_concessoes (MG enriquecido) com v_spatial (sobreposicao UC/TI/bioma)
    por processo, para o enriquecimento ambiental v1.
    """
    where = build_where(criterios)
    score = build_score_expr(pesos)
    cols = ",\n        ".join(SELECT_COLS)
    return f"""
    WITH base AS (
        SELECT c.*, s.tem_uc, s.tem_ti, s.biomas
        FROM {VIEW} c
        LEFT JOIN v_spatial s ON s.PROCESSO = c.processo
    )
    SELECT
        {cols},
        {score} AS score
    FROM base
    WHERE {where}
    ORDER BY score DESC, AREA_HA DESC NULLS LAST
    LIMIT {int(limit)}
    """


def derive_motivos(row: dict) -> list[str]:
    """Deriva a lista de motivos (badges explicativos) a partir da linha."""
    motivos: list[str] = []
    if row.get("ativo_cfem") in (False, None):
        motivos.append("CFEM inativo")
    if row.get("estrategico") == "sim":
        motivos.append("Substância estratégica")
    area = row.get("area_ha") or 0
    if area > 500:
        motivos.append("Área grande (>500 ha)")
    elif area > 100:
        motivos.append("Área média (>100 ha)")
    if not row.get("cfem_total"):
        motivos.append("Sem histórico de CFEM")
    if row.get("categoria") in ("Metálicos Preciosos", "Metálicos Estratégicos") or row.get(
        "valor_relativo"
    ) in ("alto", "muito_alto"):
        motivos.append("Alto valor relativo")
    evento = (row.get("ult_evento") or "").upper()
    if "MULTA" in evento:
        motivos.append("Multa recente (distress)")
    if "PARALIS" in evento:
        motivos.append("Paralisação (distress)")
    titular = (row.get("titular") or "").upper()
    if "ESPOLIO" in titular or "ESPÓLIO" in titular:
        motivos.append("Titular em espólio (sucessória)")
    # Sobreposicao ambiental (enriquecimento 2.2)
    if row.get("tem_uc"):
        motivos.append("⚠ Sobrepõe Unidade de Conservação")
    if row.get("tem_ti"):
        motivos.append("⚠ Sobrepõe Terra Indígena")
    if not row.get("tem_uc") and not row.get("tem_ti"):
        motivos.append("Sem sobreposição UC/TI")
    return motivos


def potencial_tier(score: float | None) -> str:
    """Classifica o score de exito em faixas (orientacao de abordagem)."""
    s = score or 0
    if s >= 80:
        return "alto"
    if s >= 50:
        return "medio"
    return "baixo"


# ── Presets de tese (templates) — pontos de partida que o usuario clona ──
TEMPLATES = [
    {
        "objetivo": "pf_pequeno",
        "nome": "Pequenos DMs para PF (modelo Gilmar)",
        "descricao": (
            "Direitos pequenos, parados e de baixo custo de entrada — viaveis "
            "para pessoa fisica. Inclui titulares em espolio (oportunidade sucessoria)."
        ),
        "criterios": {
            "categorias": [],
            "substancias": [],
            "fases": ["Concessão de Lavra", "Licenciamento"],
            "area_min": None,
            "area_max": 100,
            "cfem_status": "inativo",
            "titular_tipo": "qualquer",
            "apenas_estrategico": False,
        },
        "pesos": {**PESOS_DEFAULT, "cfem_inativo": 30, "espolio": 20, "area": 5},
    },
    {
        "objetivo": "investidor_estrangeiro",
        "nome": "Ativos para investidor estrangeiro",
        "descricao": (
            "Direitos de porte e substancia estrategica, preferencialmente com "
            "sinais de distress (multa/paralisacao) — alvo de aquisicao por capital externo."
        ),
        "criterios": {
            "categorias": ["Metálicos Estratégicos", "Metálicos Preciosos", "Metálicos Ferrosos"],
            "substancias": [],
            "fases": ["Concessão de Lavra"],
            "area_min": 100,
            "area_max": None,
            "cfem_status": "qualquer",
            "titular_tipo": "qualquer",
            "apenas_estrategico": True,
        },
        "pesos": {**PESOS_DEFAULT, "estrategico": 30, "area": 20, "distress": 20},
    },
    {
        "objetivo": "projeto_interno",
        "nome": "Projeto interno Summo",
        "descricao": "Tese aberta para o time configurar criterios proprios.",
        "criterios": {
            "categorias": [],
            "substancias": [],
            "fases": [],
            "area_min": None,
            "area_max": None,
            "cfem_status": "qualquer",
            "titular_tipo": "qualquer",
            "apenas_estrategico": False,
        },
        "pesos": dict(PESOS_DEFAULT),
    },
]
