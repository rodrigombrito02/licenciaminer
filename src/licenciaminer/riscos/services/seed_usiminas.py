"""Seed de organograma e cadeia de valor fictícios (Usiminas Mineração)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import EloCadeiaValor, Pessoa, UnidadeOrg

ORGANOGRAMA: list[dict] = [
    {"nome": "Presidência", "tipo": "presidencia", "children": [
        {"nome": "Diretoria de Operações", "tipo": "diretoria", "children": [
            {"nome": "Gerência Geral de Lavra", "tipo": "gerencia"},
            {"nome": "Gerência Geral de Beneficiamento", "tipo": "gerencia"},
            {"nome": "Gerência Geral de Planejamento de Mina", "tipo": "gerencia"},
            {"nome": "Gerência Geral de Manutenção", "tipo": "gerencia"},
        ]},
        {"nome": "Diretoria Técnica", "tipo": "diretoria", "children": [
            {"nome": "Gerência Geral de Pesquisa Mineral", "tipo": "gerencia"},
            {"nome": "Gerência Geral de Engenharia", "tipo": "gerencia"},
            {"nome": "Gerência Geral de Projetos", "tipo": "gerencia"},
        ]},
        {"nome": "Diretoria de SSMA e Comunidades", "tipo": "diretoria", "children": [
            {"nome": "Gerência de Saúde e Segurança", "tipo": "gerencia"},
            {"nome": "Gerência de Meio Ambiente e Licenciamento", "tipo": "gerencia"},
            {"nome": "Gerência de Relações com Comunidades", "tipo": "gerencia"},
            {"nome": "Gerência de Gestão de Barragens", "tipo": "gerencia"},
        ]},
        {"nome": "Diretoria Comercial e Logística", "tipo": "diretoria", "children": [
            {"nome": "Gerência de Vendas e Comercialização", "tipo": "gerencia"},
            {"nome": "Gerência de Logística e Escoamento", "tipo": "gerencia"},
        ]},
        {"nome": "Diretoria Financeira", "tipo": "diretoria", "children": [
            {"nome": "Gerência de Planejamento Financeiro", "tipo": "gerencia"},
            {"nome": "Gerência de Controladoria", "tipo": "gerencia"},
            {"nome": "Gerência de Riscos e Controles Internos", "tipo": "gerencia"},
        ]},
        {"nome": "Diretoria Jurídica e Compliance", "tipo": "diretoria", "children": [
            {"nome": "Gerência Jurídica", "tipo": "gerencia"},
            {"nome": "Gerência de Compliance", "tipo": "gerencia"},
        ]},
        {"nome": "Diretoria de Pessoas e TI", "tipo": "diretoria", "children": [
            {"nome": "Gerência de Gestão de Pessoas", "tipo": "gerencia"},
            {"nome": "Gerência de Tecnologia da Informação", "tipo": "gerencia"},
        ]},
    ]},
]

CADEIA_VALOR: list[tuple[str, str, int, str]] = [
    # (nome, tipo, ordem, descricao)
    ("Pesquisa Mineral", "primario", 1, "Prospecção, caracterização e definição de reservas"),
    ("Planejamento de Mina", "primario", 2, "Planejamento de longo, médio e curto prazo"),
    ("Lavra", "primario", 3, "Desmonte, carregamento, transporte de minério"),
    ("Beneficiamento", "primario", 4, "Britagem, moagem, concentração e disposição de rejeitos"),
    ("Logística e Escoamento", "primario", 5, "Ferrovia, rodovia, porto e estoques intermediários"),
    ("Comercialização", "primario", 6, "Vendas, contratos, atendimento a clientes"),
    ("Meio Ambiente e Licenciamento", "apoio", 1, "Gestão ambiental, licenças, outorgas, condicionantes"),
    ("Relações com Comunidades", "apoio", 2, "Diálogo social, compensações, acordos"),
    ("Saúde, Segurança e Emergências", "apoio", 3, "HSE, contingência, brigadas, simulados"),
    ("Gestão de Barragens", "apoio", 4, "Integridade e monitoramento de estruturas de contenção"),
    ("Gestão de Pessoas", "apoio", 5, "Atração, retenção, cultura, clima"),
    ("TI e Dados", "apoio", 6, "Infraestrutura, cibersegurança, dados operacionais"),
    ("Jurídico e Compliance", "apoio", 7, "Jurídico contencioso, contratos, compliance, ética"),
    ("Financeiro e Controladoria", "apoio", 8, "Planejamento financeiro, riscos financeiros, auditoria interna"),
]

PESSOAS_FICTICIAS = [
    ("Marina Magalhães", "marina@usiminas-mineracao.fake", "Diretoria de SSMA e Comunidades", "GG Comunidades"),
    ("Ricardo Ferreira", "ricardo@usiminas-mineracao.fake", "Diretoria de Operações", "GG Lavra"),
    ("Juliana Costa", "juliana@usiminas-mineracao.fake", "Diretoria de Operações", "GG Beneficiamento"),
    ("Fernando Alves", "fernando@usiminas-mineracao.fake", "Diretoria Técnica", "GG Pesquisa Mineral"),
    ("Camila Souza", "camila@usiminas-mineracao.fake", "Diretoria Financeira", "GG Riscos"),
    ("Paulo Lima", "paulo@usiminas-mineracao.fake", "Diretoria Jurídica", "G Compliance"),
    ("Beatriz Martins", "beatriz@usiminas-mineracao.fake", "Diretoria de SSMA", "G Meio Ambiente"),
    ("Rafael Torres", "rafael@usiminas-mineracao.fake", "Diretoria Comercial", "G Logística"),
    ("Luciana Pereira", "luciana@usiminas-mineracao.fake", "Diretoria de Pessoas e TI", "G TI"),
    ("Daniel Oliveira", "daniel@usiminas-mineracao.fake", "Diretoria de SSMA", "G Barragens"),
]


def _insert_org(db: Session, node: dict, parent_id: int | None, nivel: int) -> None:
    unidade = UnidadeOrg(
        nome=node["nome"],
        parent_id=parent_id,
        nivel=nivel,
        tipo=node.get("tipo"),
    )
    db.add(unidade)
    db.flush()
    for child in node.get("children", []):
        _insert_org(db, child, unidade.id, nivel + 1)


def seed_usiminas_ficticia(db: Session) -> None:
    """Popula organograma hierárquico + cadeia de valor Porter + pessoas fictícias."""
    if db.query(UnidadeOrg).count() == 0:
        for root in ORGANOGRAMA:
            _insert_org(db, root, parent_id=None, nivel=0)

    if db.query(EloCadeiaValor).count() == 0:
        for nome, tipo, ordem, descricao in CADEIA_VALOR:
            db.add(EloCadeiaValor(nome=nome, tipo=tipo, ordem=ordem, descricao=descricao))

    if db.query(Pessoa).count() == 0:
        for nome, email, area, cargo in PESSOAS_FICTICIAS:
            db.add(Pessoa(nome=nome, email=email, area=area, cargo=cargo))
