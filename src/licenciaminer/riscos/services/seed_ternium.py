"""Seed da metodologia Ternium 5×5 (Probabilidade × Impacto)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import (
    Categoria,
    EscalaImpacto,
    EscalaProbabilidade,
    MatrizClassificacao,
    Metodologia,
)

PROBABILIDADE = [
    (1, "Muy Baja", "Uma vez a cada 5 anos ou menos", 0.0, 0.2),
    (2, "Baja", "Uma vez a cada 2–3 anos", 0.2, 0.5),
    (3, "Media", "Uma vez por ano", 0.5, 1.0),
    (4, "Alta", "Algumas vezes por ano", 1.0, 2.0),
    (5, "Muy Alta", "Muitas vezes por ano", 2.0, None),
]

CATEGORIAS_IMPACTO = ["pessoal", "infraestrutura", "financeiro", "ambiental", "reputacional"]

IMPACTO_LABELS = {
    1: ("Muy Bajo", "Impacto mínimo, sem consequências relevantes"),
    2: ("Bajo", "Impacto pequeno, contido internamente"),
    3: ("Medio", "Impacto moderado, requer atenção gerencial"),
    4: ("Alto", "Emergência — impacto relevante em área"),
    5: ("Muy Alto", "Crise — impacto catastrófico na unidade/empresa"),
}

IMPACTO_DESCRICOES: dict[str, dict[int, str]] = {
    "pessoal": {
        1: "Lesão leve sem afastamento",
        2: "Lesão com afastamento < 15 dias",
        3: "Lesão incapacitante / afastamento prolongado",
        4: "Múltiplas lesões graves",
        5: "Fatalidade(s)",
    },
    "infraestrutura": {
        1: "Dano mínimo, reparo imediato",
        2: "Dano localizado, reparo em horas",
        3: "Dano em subsistema, reparo em dias",
        4: "Dano em sistema crítico, reparo em semanas",
        5: "Perda catastrófica de instalação",
    },
    "financeiro": {
        1: "< USD 100 mil",
        2: "USD 100 mil – 1 mi",
        3: "USD 1 – 10 mi",
        4: "USD 10 – 100 mi",
        5: "> USD 100 mi",
    },
    "ambiental": {
        1: "Impacto contido no site, reversível rápido",
        2: "Impacto local reversível",
        3: "Impacto significativo, recuperação em meses",
        4: "Impacto regional, recuperação em anos",
        5: "Impacto catastrófico / irreversível",
    },
    "reputacional": {
        1: "Nenhuma exposição externa",
        2: "Notícia local isolada",
        3: "Cobertura regional / questionamento de stakeholders",
        4: "Cobertura nacional, dano à marca",
        5: "Crise internacional, dano irreversível à marca",
    },
}


# Matriz 5×5: classificação por (prob, impacto). PS=Pouco Significativo,
# S=Significativo, MS=Muito Significativo, C=Crítico.
MATRIZ = {
    (1, 1): "PS", (1, 2): "PS", (1, 3): "PS", (1, 4): "S",  (1, 5): "S",
    (2, 1): "PS", (2, 2): "PS", (2, 3): "S",  (2, 4): "S",  (2, 5): "MS",
    (3, 1): "PS", (3, 2): "S",  (3, 3): "S",  (3, 4): "MS", (3, 5): "MS",
    (4, 1): "S",  (4, 2): "S",  (4, 3): "MS", (4, 4): "MS", (4, 5): "C",
    (5, 1): "S",  (5, 2): "MS", (5, 3): "MS", (5, 4): "C",  (5, 5): "C",
}


CATEGORIAS_RISCO = [
    ("Planta física / Processo", "Riscos operacionais em instalações e processos produtivos", "#ef4444"),
    ("Produto / Serviço", "Riscos ligados à cadeia de produto e serviços prestados", "#f97316"),
    ("Ambiental", "Riscos ambientais e de licenciamento", "#22c55e"),
    ("Mudança climática", "Riscos físicos e de transição climáticos", "#14b8a6"),
    ("Propriedade intelectual", "Riscos de patentes, know-how, segredos de negócio", "#a855f7"),
    ("TI / Informação", "Ciber, perda de dados, indisponibilidade", "#3b82f6"),
    ("Financeiro", "Câmbio, liquidez, crédito, mercado", "#eab308"),
    ("Governança / RH", "Gestão, compliance, pessoas", "#8b5cf6"),
    ("Licenciamento e Comunidades", "Licença social, comunidades, regulatório", "#f59e0b"),
    ("Outros", "Demais riscos estratégicos não categorizados", "#64748b"),
]


def seed_metodologia_ternium(db: Session) -> Metodologia:
    """Cria (se não existir) a metodologia Ternium 5×5 e a marca como ativa."""
    existing = db.query(Metodologia).filter_by(nome="Ternium 5x5").first()
    if existing:
        return existing

    met = Metodologia(
        nome="Ternium 5x5",
        descricao=(
            "Metodologia corporativa Ternium. Matriz 5×5 (Probabilidade × Impacto) "
            "com impactos multidimensionais (Pessoal, Infraestrutura, Financeiro, "
            "Ambiental, Reputacional) e 4 níveis de classificação final "
            "(Pouco Significativo, Significativo, Muito Significativo, Crítico)."
        ),
        ativa=True,
    )
    db.add(met)
    db.flush()

    for nivel, label, desc, fmin, fmax in PROBABILIDADE:
        db.add(
            EscalaProbabilidade(
                metodologia_id=met.id,
                nivel=nivel,
                label=label,
                descricao=desc,
                frequencia_anual_min=fmin,
                frequencia_anual_max=fmax,
            )
        )

    for categoria in CATEGORIAS_IMPACTO:
        for nivel, (label, _desc) in IMPACTO_LABELS.items():
            db.add(
                EscalaImpacto(
                    metodologia_id=met.id,
                    nivel=nivel,
                    label=label,
                    categoria=categoria,
                    descricao=IMPACTO_DESCRICOES[categoria][nivel],
                )
            )

    for (prob, imp), cls in MATRIZ.items():
        db.add(
            MatrizClassificacao(
                metodologia_id=met.id,
                prob=prob,
                impacto=imp,
                classificacao=cls,
            )
        )

    for nome, descricao, cor in CATEGORIAS_RISCO:
        if not db.query(Categoria).filter_by(nome=nome).first():
            db.add(Categoria(nome=nome, descricao=descricao, cor=cor))

    return met
