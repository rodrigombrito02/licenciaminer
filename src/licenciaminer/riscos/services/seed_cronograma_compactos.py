"""Seed de dependências do cronograma do Projeto Compactos.

Define ~50 dependências entre pacotes WBS cobrindo:
- Sequenciamento de engenharias (básica → detalhadas)
- Aquisições de equipamentos com long-lead paralelos
- Construção civil → montagem eletromecânica
- Comissionamento depende de tudo
- Marcos amarrados aos pacotes principais
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import Projeto
from licenciaminer.riscos.models_pmsuite import DependenciaWBS, WBSNode


# (predecessor_codigo, sucessor_codigo, tipo, lag_dias)
# FAST-TRACKED: maior overlap e paralelismo para atingir Jul/2030
DEPENDENCIAS = [
    # ----- Bloco 1: Engenharia (SS com overlap alto) -----
    ("1.1", "1.2", "SS", 60),    # Eng. Processo inicia 2m após início da Básica (paralelo)
    ("1.1", "1.3", "SS", 90),    # Eng. Elétrica inicia 3m após início da Básica
    ("1.1", "1.4", "SS", 60),    # Eng. Civil idem
    ("1.1", "1.5", "SS", 120),   # Eng. Tubulação 4m
    ("1.1", "M3", "FS", 0),      # Marco M3: Fim da Básica

    # Gerenciadora é marco inicial
    ("1.6", "M2", "FS", 0),

    # ----- Bloco 2: Licenciamento -----
    ("1.1", "2.1", "SS", 0),     # LP em paralelo com Básica
    ("2.1", "2.2", "FS", 30),    # LP → LI 30d análise
    ("2.2", "M4", "FS", 0),      # LI → M4
    ("2.2", "2.3", "FS", 600),   # LI → LO (20 meses — ajustado)
    ("2.3", "M11", "FS", 0),
    ("1.1", "2.4", "SS", 60),    # Autorizações ANM em paralelo

    # ----- Bloco 3: Construção Civil -----
    ("M1", "3.1", "FS", 30),
    ("1.4", "3.2", "SS", 180),   # Fundações começam 6m após início eng civil (paralelo com terraplenagem)
    ("3.1", "3.2", "SS", 60),    # Fundações começam 2m após início terraplenagem
    ("3.1", "M6", "FS", 60),
    ("3.1", "3.3", "SS", 30),
    ("3.1", "3.4", "SS", 60),

    # ----- Equipamentos com LOA antecipada ampliada -----
    ("M7", "5.1", "FS", 0),
    ("5.1", "M10", "FS", 0),

    # Todas as aquisições de equipamentos iniciam quando a eng detalhada tem 20% de progresso
    # Simulado com SS+60d (2m após início da eng detalhada correspondente)
    ("1.2", "4.1", "SS", 90),
    ("1.2", "4.2", "SS", 90),
    ("1.2", "5.2", "SS", 90),
    ("1.2", "5.4", "SS", 90),
    ("1.2", "6.1", "SS", 90),
    ("1.2", "6.2", "SS", 90),
    ("1.2", "7.2", "SS", 120),
    ("1.3", "10.1", "SS", 60),
    ("1.3", "10.2", "SS", 0),    # LT começa com a eng elétrica
    ("10.2", "M5", "FS", 0),
    ("1.3", "10.3", "SS", 60),
    ("1.3", "10.4", "SS", 60),

    # ----- Bloco 14: Montagem (mais paralelismo) -----
    ("3.2", "14.1", "SS", 120),  # Montagem britagem inicia 4m após fundações começarem
    ("5.1", "14.1", "FS", 0),    # Mas depende do SAG chegar
    ("4.1", "14.1", "FS", 0),
    ("14.1", "14.2", "SS", 90),  # Montagem flotação em paralelo com britagem (3m depois)
    ("6.1", "14.2", "FS", 0),
    ("6.2", "14.2", "FS", 0),
    ("14.1", "14.3", "SS", 120), # Montagem elétrica em paralelo
    ("10.1", "14.3", "FS", 0),
    ("10.3", "14.3", "FS", 0),
    ("14.1", "M8", "FS", 0),
    ("14.2", "14.4", "SS", 60),  # Filtragem em paralelo com flotação
    ("7.2", "14.4", "FS", 0),
    ("8.1", "14.4", "FS", 0),

    # ----- Pilha Curtume -----
    ("3.1", "8.1", "SS", 180),   # Base pilha em paralelo com terraplenagem
    ("8.1", "8.2", "SS", 30),
    ("8.1", "8.4", "SS", 60),

    # ----- Elétrica + LT -----
    ("10.2", "M9", "FS", 0),
    ("10.1", "M9", "FS", 0),
    ("M9", "14.3", "SS", 0),     # Energização libera montagem elétrica

    # ----- Comissionamento (overlap com montagem) -----
    ("14.1", "15.1", "SS", 300), # Pré-comissionamento inicia 10m após início montagem britagem
    ("14.2", "15.1", "SS", 180),
    ("14.3", "15.1", "SS", 120),
    ("15.1", "15.2", "SS", 60),  # Comissionamento frio em paralelo com pré-comiss
    ("15.2", "15.3", "FS", 0),
    ("15.3", "15.4", "FS", 0),
    ("15.4", "M12", "FS", 0),
    ("M11", "M12", "FS", 0),

    # M1 amarrado no fim da FEL3 + LI prévia
    ("M3", "M1", "FS", 150),
]


def seed_cronograma_compactos(db: Session) -> int:
    proj = db.query(Projeto).filter_by(codigo="PROJ-COMPACTOS").first()
    if not proj:
        return 0

    nodes = {n.codigo_wbs: n for n in db.query(WBSNode).filter_by(projeto_id=proj.id).all()}
    criadas = 0
    for pred_cod, suc_cod, tipo, lag in DEPENDENCIAS:
        pred = nodes.get(pred_cod)
        suc = nodes.get(suc_cod)
        if not pred or not suc:
            continue
        if db.query(DependenciaWBS).filter_by(
            predecessor_id=pred.id, sucessor_id=suc.id
        ).first():
            continue
        db.add(
            DependenciaWBS(
                predecessor_id=pred.id,
                sucessor_id=suc.id,
                tipo=tipo,
                lag_dias=lag,
                obrigatoria=True,
            )
        )
        criadas += 1
    db.commit()
    return criadas
