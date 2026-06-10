"""Algoritmo CPM (Critical Path Method) sobre a WBS.

PMBoK §6.5 — Método do Caminho Crítico. Execução em 3 passos:
1. Topological sort (Kahn) das atividades "trabalháveis" (leaves + marcos)
2. Forward pass: calcula inicio_cedo (ES) e termino_cedo (EF)
3. Backward pass: calcula inicio_tarde (LS) e termino_tarde (LF) e folga total
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from datetime import date, timedelta

from sqlalchemy.orm import Session

from licenciaminer.riscos.models_pmsuite import DependenciaWBS, WBSNode

logger = logging.getLogger(__name__)


def _nos_trabalhaveis(db: Session, projeto_id: int) -> list[WBSNode]:
    """Retorna nós que entram no cálculo CPM: marcos + work packages (leaves).

    Fases (nível 1 com filhos não-marco) são agregadas depois.
    """
    todos = db.query(WBSNode).filter_by(projeto_id=projeto_id).all()
    # Um nó é "trabalhável" se for marco OU se não tem filhos work_package
    pais_com_filhos_wp = set()
    for n in todos:
        if n.parent_id and n.tipo != "marco":
            # adiciona o parent_id como pai que tem filho wp
            pais_com_filhos_wp.add(n.parent_id)
    return [n for n in todos if (n.is_marco or n.id not in pais_com_filhos_wp)]


def _duracao_dias(n: WBSNode) -> int:
    if n.is_marco:
        return 0
    return n.duracao_dias_estimada or 30


def _data_ref_projeto(db: Session, projeto_id: int) -> date:
    """Data de referência = data_inicio_prevista do charter, ou data do projeto, ou hoje."""
    from licenciaminer.riscos.models import Projeto
    from licenciaminer.riscos.models_pmsuite import ProjectCharter

    c = db.query(ProjectCharter).filter_by(projeto_id=projeto_id).first()
    if c and c.data_inicio_prevista:
        return c.data_inicio_prevista
    p = db.get(Projeto, projeto_id)
    if p and p.data_inicio:
        return p.data_inicio
    return date.today()


def calcular_cpm(db: Session, projeto_id: int) -> dict[str, int]:
    """Executa CPM completo sobre a WBS de um projeto.

    Escreve inicio_cedo/termino_cedo/inicio_tarde/termino_tarde/folga_total/caminho_critico
    em cada nó trabalhável. Fases (níveis superiores) são recalculadas agregando filhos.
    """
    nos = _nos_trabalhaveis(db, projeto_id)
    nos_por_id = {n.id: n for n in nos}

    # Dependências entre nós trabalháveis
    deps = (
        db.query(DependenciaWBS)
        .filter(
            DependenciaWBS.predecessor_id.in_(nos_por_id.keys()),
            DependenciaWBS.sucessor_id.in_(nos_por_id.keys()),
        )
        .all()
    )

    # Grafo sucessores + in-degree
    sucessores: dict[int, list[DependenciaWBS]] = defaultdict(list)
    predecessores: dict[int, list[DependenciaWBS]] = defaultdict(list)
    in_deg: dict[int, int] = {nid: 0 for nid in nos_por_id}
    for d in deps:
        sucessores[d.predecessor_id].append(d)
        predecessores[d.sucessor_id].append(d)
        in_deg[d.sucessor_id] += 1

    # Topological sort (Kahn)
    queue: deque[int] = deque([nid for nid, v in in_deg.items() if v == 0])
    ordem: list[int] = []
    while queue:
        nid = queue.popleft()
        ordem.append(nid)
        for dep in sucessores[nid]:
            in_deg[dep.sucessor_id] -= 1
            if in_deg[dep.sucessor_id] == 0:
                queue.append(dep.sucessor_id)

    if len(ordem) < len(nos_por_id):
        logger.warning(
            "CPM: grafo de dependências tem ciclo; %d nós não processados",
            len(nos_por_id) - len(ordem),
        )

    data_ref = _data_ref_projeto(db, projeto_id)

    # Forward pass — calcula ES (inicio_cedo) e EF (termino_cedo)
    for nid in ordem:
        n = nos_por_id[nid]
        dur = _duracao_dias(n)
        if not predecessores[nid]:
            # Sem predecessores: começa na data ref, exceto se tiver data preset
            n.inicio_cedo = n.data_inicio_planejada or data_ref
        else:
            max_start = data_ref
            for d in predecessores[nid]:
                pred = nos_por_id[d.predecessor_id]
                if d.tipo == "FS":  # sucessor start >= predecessor end + lag
                    candidato = (pred.termino_cedo or data_ref) + timedelta(days=d.lag_dias)
                elif d.tipo == "SS":
                    candidato = (pred.inicio_cedo or data_ref) + timedelta(days=d.lag_dias)
                elif d.tipo == "FF":
                    # sucessor termina após predecessor, então sucessor começa em EF_pred + lag - dur
                    candidato = (pred.termino_cedo or data_ref) + timedelta(
                        days=d.lag_dias
                    ) - timedelta(days=dur)
                else:  # SF (raro)
                    candidato = (pred.inicio_cedo or data_ref) + timedelta(
                        days=d.lag_dias
                    ) - timedelta(days=dur)
                if candidato > max_start:
                    max_start = candidato
            n.inicio_cedo = max_start
        n.termino_cedo = (n.inicio_cedo or data_ref) + timedelta(days=dur)

    # Data de término do projeto = max(EF) dos nós sem sucessores
    terminos = [
        n.termino_cedo
        for n in nos_por_id.values()
        if n.termino_cedo and not sucessores.get(n.id)
    ]
    data_termino_projeto = max(terminos) if terminos else data_ref

    # Backward pass — calcula LS e LF
    for nid in reversed(ordem):
        n = nos_por_id[nid]
        dur = _duracao_dias(n)
        if not sucessores[nid]:
            n.termino_tarde = data_termino_projeto
        else:
            min_end = data_termino_projeto
            for d in sucessores[nid]:
                suc = nos_por_id[d.sucessor_id]
                if d.tipo == "FS":
                    candidato = (suc.inicio_tarde or data_termino_projeto) - timedelta(
                        days=d.lag_dias
                    )
                elif d.tipo == "SS":
                    candidato = (suc.inicio_tarde or data_termino_projeto) - timedelta(
                        days=d.lag_dias
                    ) + timedelta(days=dur)
                elif d.tipo == "FF":
                    candidato = (suc.termino_tarde or data_termino_projeto) - timedelta(
                        days=d.lag_dias
                    )
                else:  # SF
                    candidato = (suc.termino_tarde or data_termino_projeto) - timedelta(
                        days=d.lag_dias
                    ) + timedelta(days=dur)
                if candidato < min_end:
                    min_end = candidato
            n.termino_tarde = min_end
        n.inicio_tarde = (n.termino_tarde or data_termino_projeto) - timedelta(days=dur)
        # Folga total
        if n.termino_cedo and n.termino_tarde:
            n.folga_total_dias = (n.termino_tarde - n.termino_cedo).days
        else:
            n.folga_total_dias = None
        n.caminho_critico = (n.folga_total_dias or 0) == 0

    # Propagar para fases (parent nodes)
    _agregar_fases(db, projeto_id)

    db.commit()
    return {
        "nos_processados": len(ordem),
        "nos_criticos": sum(1 for n in nos_por_id.values() if n.caminho_critico),
        "data_termino_projeto": data_termino_projeto.isoformat(),
    }


def _agregar_fases(db: Session, projeto_id: int) -> None:
    """Fases (nível 1 com filhos) recebem datas agregadas dos filhos."""
    todos = db.query(WBSNode).filter_by(projeto_id=projeto_id).all()
    por_id = {n.id: n for n in todos}
    filhos_por_pai: dict[int, list[WBSNode]] = defaultdict(list)
    for n in todos:
        if n.parent_id:
            filhos_por_pai[n.parent_id].append(n)

    # Processa de baixo pra cima (maior nível primeiro)
    for n in sorted(todos, key=lambda x: -x.nivel):
        filhos = filhos_por_pai.get(n.id, [])
        if not filhos:
            continue
        inicios = [f.inicio_cedo for f in filhos if f.inicio_cedo]
        terminos = [f.termino_cedo for f in filhos if f.termino_cedo]
        if inicios:
            n.inicio_cedo = min(inicios)
        if terminos:
            n.termino_cedo = max(terminos)
        # Caminho crítico na fase = qualquer filho crítico
        n.caminho_critico = any(f.caminho_critico for f in filhos)
