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
- **Ver tudo** na Home abre a rota `/sightings`; a Home preserva apenas os
  cinco registros recentes. A página carrega resultados da API em páginas de
  até 50, sem buscar o histórico inteiro no aparelho.
- A página de avistamentos oferece dia exato (`AAAA-MM-DD`), espécie,
  inclusão de avistamentos sem identificação e ordenação por data ou primeira
  espécie. As classificações especiais **Outros** e a legada **Ave não
  identificada** não aparecem no seletor; ficam excluídas por padrão e só são
  incluídas pelo checkbox quando nenhuma espécie foi escolhida. Espécie
  selecionada tem prioridade sobre o checkbox.
- Os seletores da página usam `Modal` com `SafeAreaProvider` próprio antes do
  `SafeAreaView`, pois no Android a janela tem uma árvore nativa separada.
  Aplicar ou limpar filtros reinicia o cursor; “Carregar mais” só aparece
  quando a API informar que há nova página. O botão de atualizar no cabeçalho
  recarrega a primeira página preservando os filtros aplicados; a prévia da
  Home também oferece atualizar ao lado de “Ver tudo”.
- Layout é mobile-first com Flexbox. Imagens seguem o contêiner e gráficos medem
  sua área com `onLayout`. Não use a largura da janela capturada no carregamento.
- 320, 360 e 412 são larguras lógicas de conferência, não breakpoints de aparelhos.
  Teste fonte em 200%, teclado aberto, nomes longos, erros e conteúdo vazio.
- Coleção continua sendo o catálogo da API; não implica favoritos ou descoberta
  pessoal. Cards podem expandir descrição e dicas, sem outra rota.
  A busca tem altura própria no cabeçalho, sem `flex: 1` no eixo vertical; o
  campo deve encolher horizontalmente para acomodar a ação de limpar.
  Fotos disponíveis abrem ao toque no mesmo visualizador dos avistamentos, com
  zoom por pinça ou botões de 1x a 4x. Fechar mantém a busca e os cards expandidos;
  espécies sem foto não oferecem uma ação vazia.
- `SightingImageViewer` recebe `uri`, `onClose` e `accessibilityLabel` opcional.
  A coleção informa o nome da espécie; sem o rótulo, permanece o texto padrão
  do avistamento. Erros de imagem permitem tentar novamente ou fechar.
- O detalhe aguarda o ID da rota e confirma um 404 com uma única nova consulta
  após 500 ms. Um 404 persistente oferece nova tentativa sem recarregar o app;
  respostas 400 continuam sendo erros de consulta, não prova de inexistência.
  A confirmação pendente é cancelada ao sair ou trocar de registro.
- Estatísticas preservam os cálculos existentes e oferecem 7, 30 e 90 dias,
  iniciando em 7. Os valores dos gráficos também ficam disponíveis como texto.
- Configurações reusa conta, edição e logout; Sobre permanece na quarta aba.
  A preferência de push é por conta; permissão Android e cadastro do dispositivo
  são estados separados. Não há integração de câmera/bateria.
- O sino usa histórico individual paginado da API, contador real e leitura ao
  tocar. Abrir a lista não marca todos. Carregamento, vazio, erro e repetição
  usam `ScreenState`. Atualizações ocorrem por retomada, push e abertura da caixa,
  sem polling contínuo. Falhas não são tratadas como confirmação de leitura.
  O modal de notificações também usa seu próprio `SafeAreaProvider`.

## Push Android

`NotificationProvider` é instalado uma vez no layout raiz. O primeiro acesso
autenticado registra participação antes de obter token, mesmo com recusa de
push; falhas não invalidam um login já aceito. O canal `sightings` é criado
antes de solicitar permissão. O convite explica o uso e solicita a permissão
somente após tocar em "Ativar alertas"/"Sincronizar alertas"; não repete o
prompt automaticamente. Uma recusa permite abrir as configurações do Android.

`getDevicePushTokenAsync` fornece FCM nativo, não ExpoPushToken. O installationId
aleatório fica no AsyncStorage. Retomada e rotação de token reconciliam o
cadastro; preferência desligada não desativa o histórico. HTTP de notificações
usa a sessão capturada e descarta respostas de outra conta.

Logout serializa cadastro/desativação antes de limpar a sessão; falha mantém a
sessão e permite repetir. JWT expirado não tenta desativar usando credencial
inválida: registra reconciliação pendente e limpa a sessão. O próximo acesso
válido/cadastro transfere o token com transações do backend. Mensagens já aceitas
pelo FCM podem chegar após logout; o payload é mínimo e o destino exige login.

O listener de toque e a resposta inicial usam IDs validados e a rota existente
`/sightings/[id]`, sem URLs arbitrárias. Destino sem sessão aguarda login; push
de outra conta não abre a caixa atual. A mensagem recebida não é marcada lida:
somente toque com confirmação da API. Falha aparece na Home/Configurações.

O cliente usa `br.edu.maua.avistai`, projeto `avistai-tcc` e o arquivo público
`google-services.json`. Nunca incluir a chave Firebase Admin no app.
O backend agora usa outbox na tabela existente e processamento acionado pelo
worker; nenhuma rota/ID do app mudou. Se o worker parar, histórico e push podem
atrasar até a retomada, mesmo que a API de avistamentos esteja disponível.
Participação continua temporal: entrar depois de um evento pendente não
importa aquele passado. A chave de envio fica apenas na Lambda HTTP da API,
nunca neste cliente nem no worker.
Expo Go/Android SDK 54 não suporta essa validação: use build própria em aparelho
com Google Play Services, por exemplo `npx expo run:android --device` em máquina
com SDK/JDK Android configurados. No Expo Go, o histórico e a preferência da
conta continuam disponíveis, mas o módulo nativo de notificações não é
carregado: Configurações explica que push exige uma build própria. Não há
pedido de permissão, cadastro de token ou listener de push nesse ambiente.
O build release e recebimento real ainda
exigem validação no aparelho. iOS/web mantêm histórico, sem cadastro de push.
Não alterar o projeto Android gerado manualmente: configuração vem de app.json.

### Reconstruir a build Android após alterar módulos nativos

`expo-font` é uma dependência explícita compatível com o SDK 54 (`~14.0.11`).
Sem isso, o peer de `@expo/vector-icons` pode resolver uma versão de outro SDK,
causando `NoSuchMethodError` em `FontLoaderModule` com o core nativo do SDK 54.
Não corrigir isso atualizando `expo-modules-core` isoladamente.

Alterações nativas exigem um APK novo; Reload e cache do Metro não atualizam
as bibliotecas já compiladas. Na cópia Windows com `package.json`,
`package-lock.json` e `app.json` atualizados, pare o Metro anterior e execute
na pasta do app (PowerShell):

```powershell
npm ci
npx expo prebuild --platform android
Push-Location android
.\gradlew.bat clean
Pop-Location
npx expo run:android --device
```

O prebuild atualiza o projeto gerado sem `--clean`, preservando a pasta
Android existente. Instale e abra o APK recém-compilado, não o Expo Go ou
uma build antiga. Limpar o Gradle não exige desinstalar o app nem apagar
dados do dispositivo.

Os testes de componentes não comprovam layout nativo. A validação final deve
incluir Android, barras por gestos/botões e permissões/serviços apenas quando
essas funcionalidades realmente fizerem parte do escopo.
