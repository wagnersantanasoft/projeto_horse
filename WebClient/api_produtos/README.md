# Aplicação Front-End de Produtos

Agora com:
- Busca inteligente (multi-termo, debounce, highlight).
- Campo de data com `type="date"` (abre calendário nativo).
- Conversão automática de formato de data entre input (ISO: yyyy-MM-dd) e API/tabela (dd/MM/yyyy).

## Busca Inteligente

Campos considerados: `PRO_CODIGO`, `PRO_COD_BARRA`, `PRO_NOME`, `GP_DESCRI`, `MAR_DESCRI`, `UND_NOME`.

- Digite vários termos separados por espaço: todos precisam existir em algum dos campos.
- Processo "case-insensitive".
- Destaque (highlight) via `<mark>`.

## Data

- Input usa ISO (padrão do HTML date).
- Enviado / exibido em dd/MM/yyyy conforme esperado.
- Conversões em `dateUtils.js`.

## Arquivos Novos / Alterados

- `index.html`: adicionada barra de busca + inputs date.
- `css/styles.css`: estilos de busca e highlight.
- `js/dateUtils.js`: utilitários de data.
- `js/ui.js`: highlight + busca + ajustes modal.
- `js/main.js`: filtragem e estado da busca.
- `js/productService.js`: inalterado no formato de data (mantém dd/MM/yyyy).
- `README.md`: atualizado.

## Ajustes Extras Possíveis

- Fuzzy match (ex: tolerância a erros) usando algoritmo de distância.
- Paginação server-side aplicada à busca (consultar API com query params).
- Ordenação clicável por coluna.
- Máscara e validação adicional da data antes do POST/PUT.
