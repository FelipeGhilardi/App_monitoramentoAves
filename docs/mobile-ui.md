# Interface mobile do AvistAI

A identidade usa azul, branco e cinza. `constants/theme.ts` concentra os tokens;
estenda essa escala antes de adicionar cores ou tamanhos locais.

- Azul indica ações e seleção. Erro usa vermelho e sucesso usa verde, sempre
  acompanhados de texto ou ícone. O visualizador de fotos mantém fundo preto.
- Conteúdo e formulários usam 16 unidades lógicas; metadados usam 14, e rótulos
  compactos usam 12. Preserve a ampliação de fonte do sistema e a quebra de linhas.
- Espaçamentos seguem 4, 8, 16, 24 e 32. Cards usam raio 16; campos e botões, 12.
- Ações têm área mínima de 48 × 48. Ícones interativos precisam de rótulo acessível.
- `ScreenHeader`, `IconButton`, `FormField` e `ScreenState` compartilham os padrões.
  Cabeçalhos aplicam o inset superior; não adicione uma segunda safe area superior.
  Modais e conteúdo aplicam o inset inferior quando necessário.
- Layout é mobile-first com Flexbox. Imagens seguem o contêiner e gráficos medem
  sua área com `onLayout`. Não use a largura da janela capturada no carregamento.
- 320, 360 e 412 são larguras lógicas de conferência, não breakpoints de aparelhos.
  Teste fonte em 200%, teclado aberto, nomes longos, erros e conteúdo vazio.
- Coleção continua sendo o catálogo da API; não implica favoritos ou descoberta
  pessoal. Cards podem expandir descrição e dicas, sem outra rota.
- Estatísticas preservam os cálculos existentes e oferecem 7, 30 e 90 dias,
  iniciando em 7. Os valores dos gráficos também ficam disponíveis como texto.
- Configurações reusa conta, edição e logout; Sobre permanece na quarta aba.
  Não há novas preferências ou integração de câmera/bateria.
- O sino preserva seu conteúdo demonstrativo atual. Este refinamento não habilita
  push nem atualização automática. Recuperação de senha permanece fora do escopo.

Os testes de componentes não comprovam layout nativo. A validação final deve
incluir Android, barras por gestos/botões e permissões/serviços apenas quando
essas funcionalidades realmente fizerem parte do escopo.
