"""Seed do módulo Due Diligence editável.

- Templates de licença ambiental: materializa os 3 CSVs de referência como
  template v1 (as evidências viram critérios `normativo`).
- Templates de anuências (IPHAN, Espeleologia) e regularização fundiária:
  esqueletos normativos prontos para o consultor refinar.
- Instâncias Jaguar Mining: snapshot dos três objetos (licenciamento, anuência
  IPHAN, fundiário) para o prospect de captação.

Idempotente. Reaproveita app/components/dd_inventory (não reescreve a fonte).
"""

from __future__ import annotations

import logging

from app.components.dd_inventory import (
    LICENCA_DESC,
    LICENCA_TIPOS,
    filtrar_documentos,
    filtrar_requisitos,
    load_inventario,
    load_requisitos,
)
from licenciaminer.dd.database import (
    DDCriterio,
    DDDocumento,
    DDInstancia,
    DDTemplate,
    SessionLocal,
    criar_instancia_snapshot,
    registrar_auditoria,
)

logger = logging.getLogger(__name__)

# Mapeamento licença → chaves de documento nos requisitos (espelha o
# LICENCA_REQ_KEYS de api/routers/due_diligence.py; inline para não acoplar
# o pacote à camada de API).
LICENCA_REQ_KEYS: dict[str, list[str]] = {
    "LAS": ["Cadastro via SEI"],
    "LAS-RAS": ["Cadastro via SEI", "LAS_RAS"],
    "LAC1": ["Cadastro via SEI", "LAS_RAS", "EIA", "RIMA_LAE", "PCA", "PRAD", "PEA", "PGA", "PIA", "PAFEM", "IDAL", "RADA"],
    "LAC2": ["Cadastro via SEI", "LAS_RAS", "EIA", "PCA", "PRAD", "PEA", "PGA", "PIA", "PAFEM", "IDAL", "RADA"],
    "LP": ["EIA", "PRAD", "PEA", "PGA", "PIA", "PAFEM", "IDAL", "RADA"],
    "LI": ["PCA", "PRAD", "PEA", "PGA", "PIA", "PAFEM", "IDAL"],
    "LO": ["PCA", "PRAD"],
    "LAU": ["RCA_LAU", "PCA_LAU", "PROJ_LAU"],
    "LAC_FED": ["RCE_LAC", "TAC_LAC"],
    "LAE": ["EIA_LAE", "RIMA_LAE", "PBA_LAE"],
    "LOC": ["RCA_LOC", "PCA_LOC"],
}


def _nk(s: str | None) -> str:
    return (s or "").strip().upper().replace(" ", "_").replace("-", "_")


def _peso(v) -> float:
    try:
        f = float(str(v).strip().replace(",", "."))
        return f if f > 0 else 1.0
    except Exception:
        return 1.0


# ── Esqueletos normativos (anuências + fundiário) ──
# (codigo, nome, norma_origem, [ (doc_nome, doc_norma, [(evidencia, obrigatoriedade), ...]) ])
ANUENCIAS = [
    (
        "IPHAN", "IPHAN — Patrimônio Arqueológico", "IN IPHAN nº 01/2015; Lei 3.924/1961",
        [
            ("FCA — Ficha de Caracterização da Atividade", "IN IPHAN 01/2015",
             [("FCA preenchida e protocolada no IPHAN", "obrigatorio"),
              ("Enquadramento do nível (I a IV) definido no TRE", "obrigatorio")]),
            ("Projeto de Avaliação de Impacto ao Patrimônio Arqueológico", "IN IPHAN 01/2015",
             [("Delimitação da ADA e Área de Influência", "obrigatorio"),
              ("Contextualização arqueológica e histórica regional", "obrigatorio"),
              ("Metodologia de diagnóstico/prospecção", "obrigatorio")]),
            ("Relatório de Diagnóstico / Prospecção Arqueológica", "IN IPHAN 01/2015",
             [("Resultados da prospecção em campo", "obrigatorio"),
              ("Cadastro de sítios arqueológicos identificados", "desejavel")]),
            ("Programa de Educação Patrimonial", "IN IPHAN 01/2015",
             [("Plano de ações de educação patrimonial", "obrigatorio")]),
            ("Relatório de Monitoramento Arqueológico", "IN IPHAN 01/2015",
             [("Monitoramento das atividades de revolvimento de solo", "obrigatorio")]),
        ],
    ),
    (
        "ESPELEOLOGIA", "Espeleologia — Cavidades (ICMBio/CECAV)", "IS SEMAD 08/2017; Decreto 6.640/2008",
        [
            ("Estudo de Potencialidade Espeleológica", "IS SEMAD 08/2017",
             [("Análise de potencialidade de ocorrência de cavidades", "obrigatorio")]),
            ("Prospecção Espeleológica (ADA + 250 m)", "IS SEMAD 08/2017",
             [("Levantamento de cavidades na ADA e entorno de 250 m", "obrigatorio"),
              ("Topografia das cavidades identificadas", "obrigatorio")]),
            ("Caracterização e Classificação de Relevância", "Decreto 6.640/2008",
             [("Classificação de relevância (máxima/alta/média/baixa)", "obrigatorio"),
              ("Estudo de área de influência sobre o patrimônio espeleológico", "obrigatorio")]),
            ("Plano de Proteção / Compensação Espeleológica", "Decreto 6.640/2008",
             [("Medidas de proteção ou compensação conforme a relevância", "obrigatorio")]),
        ],
    ),
]

FUNDIARIO = (
    "REG_FUNDIARIA", "Regularização Fundiária (por matrícula)",
    "Código de Mineração (DL 227/1967) arts. 59-62; Decreto 9.406/2018; Lei 10.267/2001",
    [
        ("Matrícula atualizada do imóvel", "Lei 6.015/1973",
         [("Certidão de matrícula atualizada (≤ 30 dias)", "obrigatorio"),
          ("Confrontações e área conferem com o uso pretendido", "obrigatorio")]),
        ("Cadeia dominial", "Lei 6.015/1973",
         [("Cadeia dominial reconstituída (20–30 anos)", "obrigatorio"),
          ("Sem quebra de cadeia / títulos faltantes", "obrigatorio")]),
        ("CCIR (INCRA)", "Lei 4.947/1966",
         [("CCIR vigente e quitado", "obrigatorio")]),
        ("ITR / DITR", "Lei 9.393/1996",
         [("ITR dos últimos 5 exercícios", "desejavel")]),
        ("Georreferenciamento (SIGEF/INCRA)", "Lei 10.267/2001",
         [("Memorial georreferenciado certificado pelo INCRA/SIGEF", "obrigatorio"),
          ("Certificação de não sobreposição", "obrigatorio")]),
        ("Certidão de ônus reais", "Lei 6.015/1973",
         [("Certidão de ônus, gravames e ações", "obrigatorio")]),
        ("Acordo / Servidão minerária com o superficiário", "Cód. Mineração arts. 59-62",
         [("Instrumento de acordo, servidão ou arrendamento com o proprietário", "obrigatorio"),
          ("Indenização e renda pactuadas", "desejavel")]),
        ("CAR — Cadastro Ambiental Rural", "Lei 12.651/2012",
         [("CAR ativo e regular", "obrigatorio")]),
    ],
)


def _build_skeleton(db, objeto_tipo: str, codigo: str, nome: str, norma: str, docs: list) -> DDTemplate:
    tpl = DDTemplate(
        objeto_tipo=objeto_tipo, licenca_codigo=codigo, nome=nome,
        versao=1, ativo=True, norma_origem=norma, criado_por="seed",
    )
    db.add(tpl)
    db.flush()
    for oi, (doc_nome, doc_norma, criterios) in enumerate(docs):
        doc = DDDocumento(
            template_id=tpl.id, doc_id=_nk(doc_nome)[:80], nome=doc_nome,
            norma_referencia=doc_norma, obrigatorio=True, ordem=oi,
        )
        db.add(doc)
        db.flush()
        for ci, (evid, obrig) in enumerate(criterios):
            db.add(DDCriterio(
                documento_id=doc.id, evidencia_esperada=evid,
                proveniencia="normativo", obrigatoriedade=obrig,
                peso=1.0, norma_origem=doc_norma, ordem=ci,
            ))
    registrar_auditoria(db, "template", tpl.id, "snapshot", autor="seed",
                        justificativa=f"seed esqueleto {codigo}")
    return tpl


def seed_dd(force: bool = False) -> dict:
    db = SessionLocal()
    try:
        if db.query(DDTemplate).count() > 0 and not force:
            _seed_combos(db)
            _seed_jaguar(db)
            return {"seeded": False}

        inv = load_inventario()
        reqs_all = load_requisitos()

        # Lookup de nome/norma por chave de documento
        name_by_key: dict[str, str] = {}
        norma_by_key: dict[str, str] = {}
        for d in inv:
            did = (d.get("doc_id") or "").strip()
            nome = (d.get("documento") or "").strip()
            norma = (d.get("norma_referencia") or "").strip()
            for k in filter(None, [did if did and did != "-" else None, nome]):
                nk = _nk(k)
                name_by_key.setdefault(nk, nome or k)
                if norma:
                    norma_by_key.setdefault(nk, norma)

        n_templates = n_docs = n_crit = 0

        # ── Templates de licença ambiental (a partir dos CSVs) ──
        for lic in LICENCA_TIPOS:
            tpl = DDTemplate(
                objeto_tipo="licenca_ambiental", licenca_codigo=lic,
                nome=LICENCA_DESC.get(lic, lic), versao=1, ativo=True,
                norma_origem="DN COPAM 217/2017; Lei 15.190/2025; Cód. Mineração",
                criado_por="seed",
            )
            db.add(tpl)
            db.flush()
            n_templates += 1

            # Conjunto de chaves de documento (mapeamento + doc_ids do inventário)
            chaves = list(LICENCA_REQ_KEYS.get(lic, []))
            for d in filtrar_documentos(lic):
                did = (d.get("doc_id") or "").strip()
                if did and did != "-":
                    chaves.append(did)
            ordenadas, vistos = [], set()
            for k in chaves:
                nk = _nk(k)
                if nk not in vistos:
                    vistos.add(nk)
                    ordenadas.append(k)

            for oi, key in enumerate(ordenadas):
                rows = filtrar_requisitos(key, reqs_all)
                nk = _nk(key)
                nome = name_by_key.get(nk, key)
                doc = DDDocumento(
                    template_id=tpl.id, doc_id=key[:80], nome=nome,
                    norma_referencia=norma_by_key.get(nk), obrigatorio=True, ordem=oi,
                )
                db.add(doc)
                db.flush()
                n_docs += 1
                ci = 0
                for r in rows:
                    ev = (r.get("evidencia_esperada") or "").strip() or (r.get("teste_aderencia") or "").strip()
                    if not ev:
                        continue
                    db.add(DDCriterio(
                        documento_id=doc.id,
                        requisito_id=(r.get("requisito_id") or None),
                        topico=(r.get("topico") or None),
                        teste_aderencia=(r.get("teste_aderencia") or None),
                        evidencia_esperada=ev,
                        proveniencia="normativo", obrigatoriedade="obrigatorio",
                        peso=_peso(r.get("peso")),
                        norma_origem=(r.get("norma_origem") or None),
                        artigo_referencia=(r.get("artigo_referencia") or None),
                        ordem=ci,
                    ))
                    ci += 1
                    n_crit += 1
            registrar_auditoria(db, "template", tpl.id, "snapshot", autor="seed",
                                justificativa="seed v1 a partir de dd_*.csv")

        # ── Anuências (esqueletos) ──
        for codigo, nome, norma, docs in ANUENCIAS:
            _build_skeleton(db, "anuencia", codigo, nome, norma, docs)
            n_templates += 1

        # ── Regularização fundiária (esqueleto) ──
        codigo, nome, norma, docs = FUNDIARIO
        _build_skeleton(db, "regularizacao_fundiaria", codigo, nome, norma, docs)
        n_templates += 1

        db.commit()
        logger.info(
            "DD: seed aplicado (%d templates, %d documentos, %d critérios)",
            n_templates, n_docs, n_crit,
        )

        _seed_combos(db)
        _seed_jaguar(db)
        return {"seeded": True, "templates": n_templates, "documentos": n_docs, "criterios": n_crit}
    finally:
        db.close()


COMBOS = {
    "LP+LI+LO": ("LP+LI+LO — concomitante (trifásico unificado)", ["LP", "LI", "LO"]),
    "LP+LI": ("LP+LI — prévia + instalação", ["LP", "LI"]),
    "LI+LO": ("LI+LO — instalação + operação", ["LI", "LO"]),
}


def _seed_combos(db) -> None:
    """Templates de combinações de licença (feedback Giulia). Idempotente."""
    existentes = {
        t.licenca_codigo for t in db.query(DDTemplate)
        .filter(DDTemplate.objeto_tipo == "licenca_ambiental").all()
    }
    faltam = [c for c in COMBOS if c not in existentes]
    if not faltam:
        return

    inv = load_inventario()
    reqs_all = load_requisitos()
    name_by_key: dict[str, str] = {}
    norma_by_key: dict[str, str] = {}
    for d in inv:
        did = (d.get("doc_id") or "").strip()
        nome = (d.get("documento") or "").strip()
        norma = (d.get("norma_referencia") or "").strip()
        for k in filter(None, [did if did and did != "-" else None, nome]):
            nk = _nk(k)
            name_by_key.setdefault(nk, nome or k)
            if norma:
                norma_by_key.setdefault(nk, norma)

    for cod in faltam:
        nome_combo, comps = COMBOS[cod]
        tpl = DDTemplate(
            objeto_tipo="licenca_ambiental", licenca_codigo=cod, nome=nome_combo,
            versao=1, ativo=True, norma_origem="DN COPAM 217/2017", criado_por="seed",
        )
        db.add(tpl)
        db.flush()
        chaves: list[str] = []
        for comp in comps:
            chaves.extend(LICENCA_REQ_KEYS.get(comp, []))
            for d in filtrar_documentos(comp):
                did = (d.get("doc_id") or "").strip()
                if did and did != "-":
                    chaves.append(did)
        ordenadas, vistos = [], set()
        for k in chaves:
            nk = _nk(k)
            if nk not in vistos:
                vistos.add(nk)
                ordenadas.append(k)
        for oi, key in enumerate(ordenadas):
            rows = filtrar_requisitos(key, reqs_all)
            nk = _nk(key)
            doc = DDDocumento(
                template_id=tpl.id, doc_id=key[:80], nome=name_by_key.get(nk, key),
                norma_referencia=norma_by_key.get(nk), obrigatorio=True, ordem=oi,
            )
            db.add(doc)
            db.flush()
            ci = 0
            for r in rows:
                ev = (r.get("evidencia_esperada") or "").strip() or (r.get("teste_aderencia") or "").strip()
                if not ev:
                    continue
                db.add(DDCriterio(
                    documento_id=doc.id, requisito_id=(r.get("requisito_id") or None),
                    topico=(r.get("topico") or None), teste_aderencia=(r.get("teste_aderencia") or None),
                    evidencia_esperada=ev, proveniencia="normativo", obrigatoriedade="obrigatorio",
                    peso=_peso(r.get("peso")), norma_origem=(r.get("norma_origem") or None),
                    artigo_referencia=(r.get("artigo_referencia") or None), ordem=ci,
                ))
                ci += 1
        registrar_auditoria(db, "template", tpl.id, "snapshot", autor="seed",
                            justificativa=f"seed combo {cod}")
    db.commit()
    logger.info("DD: %d combos de licença criados", len(faltam))


def _seed_jaguar(db) -> None:
    """Cria as 3 instâncias DD da Jaguar Mining (idempotente)."""
    ja = db.query(DDInstancia).filter(DDInstancia.cliente == "Jaguar Mining").count()
    if ja > 0:
        return

    def _tpl(objeto_tipo, codigo):
        return (
            db.query(DDTemplate)
            .filter(DDTemplate.objeto_tipo == objeto_tipo,
                    DDTemplate.licenca_codigo == codigo, DDTemplate.ativo == True)  # noqa: E712
            .first()
        )

    alvos = [
        (_tpl("licenca_ambiental", "LAC1"),
         "Novo licenciamento — reabertura Mina Santa Isabel (Complexo Paciência)", "A-05", 5),
        (_tpl("anuencia", "IPHAN"),
         "Anuência IPHAN — Corredor Chamé-Bahú", None, None),
        (_tpl("regularizacao_fundiaria", "REG_FUNDIARIA"),
         "Regularização fundiária — área Paciência / Chamé-Bahú", None, None),
    ]
    criadas = 0
    for tpl, escopo, atividade, classe in alvos:
        if tpl is None:
            continue
        criar_instancia_snapshot(
            db, tpl, cliente="Jaguar Mining", escopo=escopo,
            atividade=atividade, classe=classe, responsavel="Giulia",
            criado_por="seed", status="em_avaliacao",
        )
        criadas += 1
    if criadas:
        db.commit()
        logger.info("DD: %d instâncias Jaguar Mining criadas", criadas)
