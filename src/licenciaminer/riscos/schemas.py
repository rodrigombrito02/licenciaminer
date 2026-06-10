"""Schemas Pydantic (input/output da API de Riscos)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class _ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Metodologia
# ---------------------------------------------------------------------------


class EscalaProbabilidadeOut(_ORM):
    nivel: int
    label: str
    descricao: Optional[str] = None
    frequencia_anual_min: Optional[float] = None
    frequencia_anual_max: Optional[float] = None


class EscalaImpactoOut(_ORM):
    nivel: int
    label: str
    categoria: str
    descricao: Optional[str] = None


class MatrizOut(_ORM):
    prob: int
    impacto: int
    classificacao: str


class MetodologiaOut(_ORM):
    id: int
    nome: str
    descricao: Optional[str] = None
    ativa: bool
    probabilidade: list[EscalaProbabilidadeOut] = []
    impacto: list[EscalaImpactoOut] = []
    matriz: list[MatrizOut] = []


# ---------------------------------------------------------------------------
# Contexto
# ---------------------------------------------------------------------------


class CategoriaOut(_ORM):
    id: int
    nome: str
    descricao: Optional[str] = None
    cor: Optional[str] = None


class PessoaOut(_ORM):
    id: int
    nome: str
    email: Optional[str] = None
    area: Optional[str] = None
    cargo: Optional[str] = None


class PessoaIn(BaseModel):
    nome: str
    email: Optional[str] = None
    area: Optional[str] = None
    cargo: Optional[str] = None


class UnidadeOrgOut(_ORM):
    id: int
    nome: str
    parent_id: Optional[int] = None
    nivel: int
    tipo: Optional[str] = None


class EloCadeiaValorOut(_ORM):
    id: int
    nome: str
    descricao: Optional[str] = None
    ordem: int
    tipo: str


# ---------------------------------------------------------------------------
# Risco
# ---------------------------------------------------------------------------


class RiscoIn(BaseModel):
    codigo: str
    nome: str
    descricao: Optional[str] = None
    estagio: Optional[str] = None
    categoria_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    unidade_org_id: Optional[int] = None
    elo_cadeia_valor_id: Optional[int] = None
    tipo_escopo: str = "projeto"
    projeto_id: Optional[int] = None
    categoria_erm_id: Optional[int] = None
    linha_defesa_id: Optional[int] = None
    tipo_tratamento_estrategico: Optional[str] = None
    horizonte: Optional[str] = None
    natureza: str = "ameaca"
    prob_pura: Optional[int] = Field(None, ge=1, le=5)
    impacto_pura: Optional[int] = Field(None, ge=1, le=5)
    prob_residual: Optional[int] = Field(None, ge=1, le=5)
    impacto_residual: Optional[int] = Field(None, ge=1, le=5)


class RiscoPatch(BaseModel):
    codigo: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    estagio: Optional[str] = None
    categoria_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    unidade_org_id: Optional[int] = None
    elo_cadeia_valor_id: Optional[int] = None
    tipo_escopo: Optional[str] = None
    projeto_id: Optional[int] = None
    categoria_erm_id: Optional[int] = None
    linha_defesa_id: Optional[int] = None
    tipo_tratamento_estrategico: Optional[str] = None
    horizonte: Optional[str] = None
    natureza: Optional[str] = None
    prob_pura: Optional[int] = Field(None, ge=1, le=5)
    impacto_pura: Optional[int] = Field(None, ge=1, le=5)
    prob_residual: Optional[int] = Field(None, ge=1, le=5)
    impacto_residual: Optional[int] = Field(None, ge=1, le=5)


class RiscoOut(_ORM):
    id: int
    codigo: str
    nome: str
    descricao: Optional[str] = None
    estagio: Optional[str] = None
    categoria_id: Optional[int] = None
    categoria_nome: Optional[str] = None
    categoria_cor: Optional[str] = None
    responsavel_id: Optional[int] = None
    responsavel_nome: Optional[str] = None
    unidade_org_id: Optional[int] = None
    unidade_org_nome: Optional[str] = None
    elo_cadeia_valor_id: Optional[int] = None
    elo_cadeia_valor_nome: Optional[str] = None
    prob_pura: Optional[int] = None
    impacto_pura: Optional[int] = None
    classificacao_pura: Optional[str] = None
    prob_residual: Optional[int] = None
    impacto_residual: Optional[int] = None
    classificacao_residual: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MatrizCelulaOut(BaseModel):
    prob: int
    impacto: int
    classificacao: str
    riscos: list[RiscoOut]


class DashboardKpis(BaseModel):
    total_riscos: int
    por_classificacao_residual: dict[str, int]
    por_classificacao_pura: dict[str, int]
    por_estagio: dict[str, int]
    por_categoria: dict[str, int]
    acoes_total: int
    acoes_atrasadas: int
    controles_total: int
