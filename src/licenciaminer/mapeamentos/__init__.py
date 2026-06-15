"""Modulo Mapeamentos — motor de prospeccao multi-tese de direitos minerarios.

Cada Mapeamento e uma "tese de busca" salva (criterios + pesos) que roda sobre
a base local de concessoes (v_concessoes / v_scm) e produz oportunidades
ranqueadas. Restrito a consultor/admin Summo.

Etapa 1: dados locais (parquets ja coletados), sem chamadas a API ANM.
A varredura nao se atualiza sozinha — roda sob demanda. Automacao fica para
etapa posterior (radar de eventos / diff diario SCM).
"""
