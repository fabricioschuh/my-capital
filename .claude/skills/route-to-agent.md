---
name: route-to-agent
description: Use esta skill para identificar qual agente de análise de ativos deve ser acionado com base no ticker fornecido pelo usuário. Execute antes de qualquer análise quando o usuário pede para analisar um ativo sem especificar o mercado.
---

Analise o ticker fornecido pelo usuário e determine qual agente especializado deve ser usado.

## Regras de roteamento

### 1. Ações brasileiras → `br-stocks`
- Sufixo numérico de 1 dígito: `PETR4`, `VALE3`, `ITUB4`, `BBDC4`, `WEGE3`, `ABEV3`
- Ticker com 4-5 letras + número: `RENT3`, `MGLU3`, `EGIE3`, `PRIO3`
- **Exceção:** terminados em `11` podem ser ETF ou FII — verificar abaixo

### 2. ETFs brasileiros → `br-etfs`
- Terminam em `11` E são conhecidos ETFs: `BOVA11`, `IVVB11`, `SMAL11`, `HASH11`, `NASD11`, `GOLD11`, `DIVO11`
- Dica: FIIs também terminam em `11` mas têm nomes como `HGRE11`, `KNRI11`, `MXRF11` — FIIs não têm agente específico, usar `br-stocks`

### 3. Ações americanas → `us-stocks`
- Apenas letras maiúsculas, sem sufixo, 1-5 caracteres: `AAPL`, `MSFT`, `NVDA`, `GOOGL`, `META`, `TSLA`, `AMZN`, `NFLX`, `JPM`, `BRK-B`
- Pode ter hífen para classe de ação: `BRK-B`, `BRK-A`

### 4. ETFs americanos → `us-etfs`
- Apenas letras maiúsculas, sem sufixo, geralmente 2-4 letras
- Conhecidos: `VOO`, `SPY`, `QQQ`, `VTI`, `IWM`, `GLD`, `TLT`, `ARKK`, `SCHD`, `VNQ`, `XLK`, `XLF`
- **Ambiguidade com ações US:** se incerto, consultar `instrumentType` retornado pela API

### 5. Ações alemãs → `de-stocks`
- Sufixo `.DE`: `SAP.DE`, `BMW.DE`, `SIE.DE`, `BAYN.DE`, `ALV.DE`, `VOW3.DE`
- Qualquer ticker com `.DE` no final

### Casos ambíguos

| Situação | Ação |
|----------|------|
| Ticker `11` desconhecido | Assumir `br-etfs`, confirmar com usuário |
| Letras US curtas ambíguas (ex: `V`, `T`) | Assumir `us-stocks` |
| Ticker europeu sem `.DE` (ex: ações francesas `.PA`) | Usar `de-stocks` (mais próximo) |
| Usuário não informou ticker | Perguntar o ticker antes de rotear |

## Fluxo de execução

```
1. Extrair o ticker da mensagem do usuário
2. Aplicar as regras acima
3. Informar: "Vou analisar [TICKER] como [tipo de ativo] no mercado [mercado]. Usando o agente [nome]."
4. Delegar para o agente correto
```

## Exemplos

| Input do usuário | Agente |
|-----------------|--------|
| "analisa PETR4" | `br-stocks` |
| "o que você acha do BOVA11?" | `br-etfs` |
| "IVVB11 vale a pena?" | `br-etfs` |
| "me fala sobre AAPL" | `us-stocks` |
| "como está o VOO?" | `us-etfs` |
| "analisa SAP.DE" | `de-stocks` |
| "quero investir em BMW" | `de-stocks` (confirmar ticker `BMW.DE`) |
| "o que é melhor, BOVA11 ou IVV?" | `br-etfs` para BOVA11 + `us-etfs` para IVV |
