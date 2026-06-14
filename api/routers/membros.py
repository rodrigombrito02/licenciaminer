"""Membros internos da Summo — pool para liderança e ACL de cards.

Por ora estatico. Futuramente vem do Supabase (lista de usuarios consultor/admin).
Usado para escolher lider-responsavel e quem pode ver/editar cada card
(projeto, oportunidade, mapeamento, etc).
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/membros", tags=["Membros"])

# Equipe Summo (primeiro nome usado como chave de ACL/atribuicao).
MEMBROS = [
    {"nome": "Rodrigo", "papel": "admin"},
    {"nome": "Leo", "papel": "admin"},
    {"nome": "Maury", "papel": "admin"},
    {"nome": "Bernardo", "papel": "admin"},
    {"nome": "Roberto", "papel": "admin"},
    {"nome": "Lima", "papel": "admin"},
    {"nome": "Giulia", "papel": "consultor"},
]


@router.get("")
def listar_membros() -> list[dict]:
    return MEMBROS
