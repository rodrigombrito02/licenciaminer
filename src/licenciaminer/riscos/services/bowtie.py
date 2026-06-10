"""Serviço de bowtie: serialização e manipulação."""

from __future__ import annotations

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import (
    BarreiraCorretiva,
    BarreiraPreventiva,
    Bowtie,
    Causa,
    Consequencia,
    FatorEscalonamento,
)


def serialize_bowtie(bowtie: Bowtie) -> dict:
    return {
        "id": bowtie.id,
        "risco_id": bowtie.risco_id,
        "versao": bowtie.versao,
        "top_event": bowtie.top_event,
        "hazard": bowtie.hazard,
        "canvas_json": bowtie.canvas_json,
        "frequencia_pura": bowtie.frequencia_pura,
        "frequencia_residual": bowtie.frequencia_residual,
        "causas": [serialize_causa(c) for c in bowtie.causas],
        "consequencias": [serialize_consequencia(c) for c in bowtie.consequencias],
        "fatores": [serialize_fator(f) for f in bowtie.fatores],
        "created_at": bowtie.created_at,
        "updated_at": bowtie.updated_at,
    }


def serialize_causa(c: Causa) -> dict:
    return {
        "id": c.id,
        "bowtie_id": c.bowtie_id,
        "codigo": c.codigo,
        "descricao": c.descricao,
        "ordem": c.ordem,
        "critica": c.critica,
        "barreiras": [
            {
                "id": b.id,
                "descricao": b.descricao,
                "efetividade": b.efetividade,
                "ordem": b.ordem,
                "controle_id": b.controle_id,
            }
            for b in c.barreiras
        ],
    }


def serialize_consequencia(c: Consequencia) -> dict:
    return {
        "id": c.id,
        "bowtie_id": c.bowtie_id,
        "codigo": c.codigo,
        "descricao": c.descricao,
        "ordem": c.ordem,
        "critica": c.critica,
        "barreiras": [
            {
                "id": b.id,
                "descricao": b.descricao,
                "efetividade": b.efetividade,
                "ordem": b.ordem,
                "controle_id": b.controle_id,
            }
            for b in c.barreiras
        ],
    }


def serialize_fator(f: FatorEscalonamento) -> dict:
    return {
        "id": f.id,
        "bowtie_id": f.bowtie_id,
        "descricao": f.descricao,
        "lado": f.lado,
        "barreira_alvo_id": f.barreira_alvo_id,
    }


def proximo_codigo_causa(db: Session, bowtie_id: int) -> str:
    existing = db.query(Causa).filter_by(bowtie_id=bowtie_id).count()
    return f"C.{existing + 1}"


def proximo_codigo_consequencia(db: Session, bowtie_id: int) -> str:
    existing = db.query(Consequencia).filter_by(bowtie_id=bowtie_id).count()
    return f"I.{existing + 1}"
