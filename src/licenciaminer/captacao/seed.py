"""Seed da Captação — prospect Jaguar Mining (idempotente).

Cria o prospect Jaguar no funil de captação já com o dossiê: análise da
oportunidade, link da proposta (HTML) e links integrados para as três
diligências (licenciamento, anuência IPHAN, regularização fundiária).
"""

from __future__ import annotations

import logging

from licenciaminer.captacao.database import Demanda, InteracaoDemanda, SessionLocal

logger = logging.getLogger(__name__)

TITULO_JAGUAR = "Proposta Jaguar Mining"

ANALISE_JAGUAR = """OPORTUNIDADE JAGUAR MINING — análise (reunião dia 30)

CONTEXTO DE CRESCIMENTO (notícia): plano de exploração de 5 anos com 227.200 m de
sondagem e US$ 43 mi, parceiros Major Drilling + GEOSOL, no Corredor Chamé-Bahú
(Quadrilátero Ferrífero), a <1 km do Complexo Paciência (Itabirito). Estudo para
reabrir a Mina Santa Isabel em 2026. Esse crescimento multiplica frentes de novo
licenciamento, anuências e fundiário — onde hoje NÃO há sistema. Risco = cronograma
travado por anuência ou matrícula irregular.

AS 3 DORES (do áudio da colega da Jaguar):
1) Novos licenciamentos sem apoio (faseamento, prazos, informação complementar). O
   sistema atual (Verde Ghaia/Ambipar) cobre só o PÓS-licença.
2) Anuências além do estadual (IPHAN/patrimônio e federais/espeleologia) dispersas,
   concentradas em especialistas — faseamento "perdido".
3) Regularização fundiária = grande problema: documentos perdidos, não se sabe o que
   tem / falta / precisa.

POSICIONAMENTO: complementaridade — Verde Ghaia = pós-licença; Summo = pré-licença +
anuências + fundiário. Mesmo motor (objeto de conformidade → inventário → documento →
critério → status → plano de ação) aplicado aos três casos.

ABORDAGEM: âncora nos novos licenciamentos (pronto/demonstrável, frente da Giulia) como
prova de valor; regularização fundiária como piloto co-desenhado (dói no coordenador
fundiário novo). Sempre mostrar o portfólio completo como rede de segurança."""


def seed_captacao(force: bool = False) -> dict:
    db = SessionLocal()
    try:
        existe = db.query(Demanda).filter(Demanda.titulo == TITULO_JAGUAR).first()
        if existe and not force:
            return {"seeded": False}

        # Links para as diligências Jaguar (instâncias já criadas pelo seed do DD)
        links = [
            {"label": "Proposta comercial (HTML)", "url": "/propostas/proposta-jaguar.html", "tipo": "proposta"},
            {"label": "Notícia — plano de exploração 5 anos",
             "url": "https://www.conexaomineral.com.br/noticia/4991/jaguar-mining-acelera-plano-de-exploracao-com-parcerias-de-perfuracao-de-nivel-mundial.html",
             "tipo": "noticia"},
        ]
        try:
            from licenciaminer.dd.database import DDInstancia, SessionLocal as DDSession
            dd = DDSession()
            try:
                for inst in dd.query(DDInstancia).filter(DDInstancia.cliente == "Jaguar Mining").all():
                    links.append({
                        "label": f"Diligência: {inst.escopo or inst.licenca_codigo}",
                        "url": f"/due-diligence/instancias/{inst.id}",
                        "tipo": "diligencia",
                    })
            finally:
                dd.close()
        except Exception as exc:  # DD ainda não semeado — links da diligência entram depois
            logger.warning("seed_captacao: instâncias DD indisponíveis (%s)", exc)

        if existe and force:
            existe.analise = ANALISE_JAGUAR
            existe.proposta_url = "/propostas/proposta-jaguar.html"
            existe.links = links
            db.commit()
            return {"seeded": True, "updated": True}

        d = Demanda(
            titulo=TITULO_JAGUAR,
            descricao="Mineradora de ouro no Quadrilátero Ferrífero (MG). Dores: novos "
                      "licenciamentos, anuências (IPHAN/espeleologia) e regularização fundiária. "
                      "Reunião agendada para o dia 30.",
            origem="indicacao",
            frente="ambiental",
            status="proposta",
            empresa="Jaguar Mining",
            contato_nome="(contato via colega da Jaguar)",
            responsavel="Giulia",
            analise=ANALISE_JAGUAR,
            proposta_url="/propostas/proposta-jaguar.html",
            links=links,
            criado_por="seed",
        )
        db.add(d)
        db.flush()
        db.add(InteracaoDemanda(
            demanda_id=d.id, autor="Sistema", tipo="nota",
            texto="Prospect criado a partir da análise da oportunidade + transcrição do "
                  "áudio da Jaguar. Proposta e diligências vinculadas no dossiê.",
        ))
        db.commit()
        logger.info("Captação: prospect Jaguar Mining criado (id=%s)", d.id)
        return {"seeded": True, "id": d.id}
    finally:
        db.close()
