"""Serviço de riscos: cálculo de classificação e serialização."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import (
    Acao,
    Controle,
    MatrizClassificacao,
    Metodologia,
    Risco,
)

CLASSIFICACAO_LABELS = {
    "PS": "Pouco Significativo",
    "S": "Significativo",
    "MS": "Muito Significativo",
    "C": "Crítico",
}


def metodologia_ativa(db: Session) -> Metodologia | None:
    return db.query(Metodologia).filter_by(ativa=True).first()


def classificar(db: Session, prob: int | None, impacto: int | None) -> str | None:
    """Aplica a matriz da metodologia ativa para obter a classificação."""
    if prob is None or impacto is None:
        return None
    met = metodologia_ativa(db)
    if not met:
        return None
    cell = (
        db.query(MatrizClassificacao)
        .filter_by(metodologia_id=met.id, prob=prob, impacto=impacto)
        .first()
    )
    return cell.classificacao if cell else None


def recalcular_classificacoes(db: Session, risco: Risco) -> None:
    """Recalcula classificacao_pura e classificacao_residual in-place."""
    risco.classificacao_pura = classificar(db, risco.prob_pura, risco.impacto_pura)
    risco.classificacao_residual = classificar(db, risco.prob_residual, risco.impacto_residual)


def serialize(risco: Risco) -> dict:
    return {
        "id": risco.id,
        "codigo": risco.codigo,
        "nome": risco.nome,
        "descricao": risco.descricao,
        "estagio": risco.estagio,
        "categoria_id": risco.categoria_id,
        "categoria_nome": risco.categoria.nome if risco.categoria else None,
        "categoria_cor": risco.categoria.cor if risco.categoria else None,
        "responsavel_id": risco.responsavel_id,
        "responsavel_nome": risco.responsavel.nome if risco.responsavel else None,
        "unidade_org_id": risco.unidade_org_id,
        "unidade_org_nome": risco.unidade_org.nome if risco.unidade_org else None,
        "elo_cadeia_valor_id": risco.elo_cadeia_valor_id,
        "elo_cadeia_valor_nome": (
            risco.elo_cadeia_valor.nome if risco.elo_cadeia_valor else None
        ),
        "tipo_escopo": risco.tipo_escopo,
        "projeto_id": risco.projeto_id,
        "projeto_codigo": risco.projeto.codigo if risco.projeto else None,
        "projeto_nome": risco.projeto.nome if risco.projeto else None,
        "categoria_erm_id": risco.categoria_erm_id,
        "linha_defesa_id": risco.linha_defesa_id,
        "tipo_tratamento_estrategico": risco.tipo_tratamento_estrategico,
        "horizonte": risco.horizonte,
        "natureza": risco.natureza,
        "prob_pura": risco.prob_pura,
        "impacto_pura": risco.impacto_pura,
        "classificacao_pura": risco.classificacao_pura,
        "prob_residual": risco.prob_residual,
        "impacto_residual": risco.impacto_residual,
        "classificacao_residual": risco.classificacao_residual,
        "created_at": risco.created_at,
        "updated_at": risco.updated_at,
    }


def contar_dashboard_kpis(db: Session) -> dict:
    riscos = db.query(Risco).all()
    por_cls_residual: dict[str, int] = {}
    por_cls_pura: dict[str, int] = {}
    por_estagio: dict[str, int] = {}
    por_categoria: dict[str, int] = {}
    for r in riscos:
        if r.classificacao_residual:
            por_cls_residual[r.classificacao_residual] = por_cls_residual.get(
                r.classificacao_residual, 0
            ) + 1
        if r.classificacao_pura:
            por_cls_pura[r.classificacao_pura] = por_cls_pura.get(r.classificacao_pura, 0) + 1
        if r.estagio:
            por_estagio[r.estagio] = por_estagio.get(r.estagio, 0) + 1
        cat_nome = r.categoria.nome if r.categoria else "(sem categoria)"
        por_categoria[cat_nome] = por_categoria.get(cat_nome, 0) + 1

    total_acoes = db.query(Acao).count()
    today = date.today()
    atrasadas = (
        db.query(Acao)
        .filter(Acao.prazo.isnot(None), Acao.prazo < today, Acao.status != "concluida")
        .count()
    )

    return {
        "total_riscos": len(riscos),
        "por_classificacao_residual": por_cls_residual,
        "por_classificacao_pura": por_cls_pura,
        "por_estagio": por_estagio,
        "por_categoria": por_categoria,
        "acoes_total": total_acoes,
        "acoes_atrasadas": atrasadas,
        "controles_total": db.query(Controle).count(),
    }
