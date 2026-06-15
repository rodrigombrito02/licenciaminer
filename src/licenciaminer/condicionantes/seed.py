"""Seed do Radar de Condicionantes — caso real Partecal (Vazante/MG), Parecer
Unico SUPRAM Noroeste, processo 286/2020. Idempotente (so roda se vazio).
"""

from __future__ import annotations

import logging
from datetime import date

from licenciaminer.condicionantes.database import Condicionante, Licenca, SessionLocal

logger = logging.getLogger(__name__)

# (numero, descricao, prazo_tipo, prazo_dias, recorrencia, status)
COND_PARTECAL = [
    ("01", "Executar o Programa de Automonitoramento (efluentes, resíduos via MTR-MG, atmosférico) atendendo os padrões das normas vigentes.", "vigencia", None, None, "em_andamento"),
    ("02", "Apresentar relatório técnico/fotográfico comprovando a execução dos programas, planos e projetos, acompanhado de ART.", "recorrente", None, "anual", "pendente"),
    ("03", "Continuar a aspersão de água para controle de emissão de poeira nas vias e frentes de lavra.", "vigencia", None, None, "em_andamento"),
    ("04", "Disposição adequada de sucatas e resíduos (Lei Estadual 18.031/2009); destinar filtros/estopas contaminadas a empresas regularizadas, mantendo recibos.", "vigencia", None, None, "em_andamento"),
    ("05", "Monitoramento sismográfico periódico das cavidades Partecal I, II e Não Cadastrada II, por equipe especializada, com relatórios anuais à SUPRAM NOR.", "recorrente", None, "anual", "pendente"),
    ("06", "Comprovar, por relatório fotográfico, a delimitação com bandeirolas da área de proteção das cavidades.", "dias_publicacao", 120, None, "atrasada"),
    ("07", "Paralisar a lavra imediatamente e comunicar a SUPRAM NOR caso surja cavidade natural subterrânea.", "vigencia", None, None, "pendente"),
]


def seed_condicionantes(force: bool = False) -> dict:
    db = SessionLocal()
    try:
        if db.query(Licenca).count() > 0 and not force:
            return {"seeded": False}

        lic = Licenca(
            empreendimento="Partecal Partezani Calcários Ltda.",
            cnpj="56.374.374/0003-93",
            orgao="SUPRAM Noroeste de Minas",
            processo="286/2020",
            numero_licenca="LOC 013/2014 (renovação)",
            tipo="LO",
            data_emissao=date(2020, 3, 30),
            data_validade=date(2026, 3, 30),
            municipio="Vazante",
            uf="MG",
            lider_responsavel="Giulia",
            criado_por="Giulia",
            acl=None,
        )
        db.add(lic)
        db.flush()

        for numero, desc, ptipo, pdias, rec, status in COND_PARTECAL:
            db.add(Condicionante(
                licenca_id=lic.id, numero=numero, descricao=desc,
                prazo_tipo=ptipo, prazo_dias=pdias, recorrencia=rec, status=status,
            ))

        db.commit()
        logger.info("Condicionantes: seed Partecal criado")
        return {"seeded": True, "licenca_id": lic.id, "condicionantes": len(COND_PARTECAL)}
    finally:
        db.close()


# Direito ANM exemplo (categoria='anm') — prazos do direito minerário
COND_ANM = [
    ("TAH", "Pagamento da Taxa Anual por Hectare (TAH) — vencimento anual. Inadimplência leva à caducidade do título.", "recorrente", None, "anual", "pendente"),
    ("RFP", "Apresentar o Relatório Final de Pesquisa (RFP) à ANM dentro do prazo do alvará.", "data", None, None, "pendente"),
    ("EXIG", "Cumprir exigência técnica publicada pela ANM (prazo de 60 dias da publicação).", "dias_publicacao", 60, None, "pendente"),
    ("REQ-LAVRA", "Protocolar Requerimento de Lavra após aprovação do RFP (janela legal).", "data", None, None, "pendente"),
]


def seed_anm(force: bool = False) -> dict:
    """Seed de um direito minerário (categoria ANM) com seus prazos."""
    db = SessionLocal()
    try:
        ja = db.query(Licenca).filter(Licenca.categoria == "anm").count()
        if ja > 0 and not force:
            return {"seeded": False}
        d = Licenca(
            categoria="anm",
            empreendimento="Mineração Exemplo Ltda (titular)",
            cnpj="00.000.000/0001-00",
            orgao="ANM",
            processo="830410/2005",
            numero_licenca="830410/2005",
            tipo="Autorização de Pesquisa",
            data_emissao=date(2023, 6, 1),
            data_validade=date(2026, 6, 1),
            municipio="Conceição do Mato Dentro",
            uf="MG",
            lider_responsavel="Maury",
            criado_por="Maury",
        )
        db.add(d)
        db.flush()
        for numero, desc, ptipo, pdias, rec, status in COND_ANM:
            db.add(Condicionante(
                licenca_id=d.id, numero=numero, descricao=desc,
                prazo_tipo=ptipo, prazo_dias=pdias, recorrencia=rec, status=status,
            ))
        db.commit()
        logger.info("Condicionantes: seed ANM criado")
        return {"seeded": True, "direito_id": d.id, "prazos": len(COND_ANM)}
    finally:
        db.close()
