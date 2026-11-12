# Ilha dos Dinos

Jogo original de blocos para crianças pequenas: construir, partir, explorar uma ilha,
fazer festinhas a animais, montar dinossauros e subir de nível com missões curtas.
Sem texto no jogo, sem inimigos, sem morrer, sem relógio, blocos infinitos, gravação automática.

Corre em qualquer browser moderno (HTML5 + WebGL). Não precisa de instalação nem de compilação.

## 1. Testar no PC

Opção rápida: fazer duplo clique em `index.html`.

Opção mais fiel à Xbox (servidor local, abrir no Edge):

```bash
npx serve .
```

Ligar um comando Xbox por USB ou Bluetooth e carregar em **A** no ecrã inicial.

Lista de verificação sugerida antes de passar à consola:

- andar, olhar e saltar com o comando;
- pôr e tirar blocos (RT / LT) e escolher bloco (LB / RB);
- montar um dinossauro (X) e desmontar (X);
- concluir a missão do nível 1 (apanhar 3 estrelas) e ver o número subir para 2;
- fechar o separador, voltar a abrir e confirmar que a construção e o nível ficaram gravados.

## 2. Publicar (alojamento estático gratuito)

O jogo é uma pasta de ficheiros estáticos. Qualquer alojamento serve. Duas formas simples:

**GitHub Pages**

1. Em github.com, criar um repositório público (um nome curto facilita escrever o endereço na Xbox, por exemplo `dinos`).
2. "Add file" → "Upload files" → arrastar **o conteúdo desta pasta** (`index.html`, `style.css`, `js/`, `vendor/`) → "Commit changes".
3. Settings → Pages → Source: "Deploy from a branch" → Branch `main`, pasta `/ (root)` → Save.
4. Passado um ou dois minutos o jogo fica em `https://UTILIZADOR.github.io/dinos/`.

**Netlify Drop**

1. Abrir app.netlify.com/drop e arrastar esta pasta.
2. Fica logo com um endereço `https://qualquer-nome.netlify.app` (pode mudar o nome nas definições do site).

## 3. Jogar na Xbox One

1. Abrir o **Microsoft Edge** na consola.
2. Escrever o endereço do passo 2 e guardar nos favoritos.
3. Com o cursor, carregar no botão grande de jogar (botão **A**). O jogo passa a ecrã inteiro.
4. **Manter o botão ☰ (Menu) premido** até abrir um menu do Edge, escolher **Use game controls**
   (usar controlos de jogo) com o manípulo esquerdo e carregar em **A**. O aviso no topo do ecrã
   desaparece quando o jogo começa a receber o comando. Para voltar ao cursor, manter ☰ premido outra vez.

Sem o passo 4 o Edge fica em modo de navegação e só entrega setas ao jogo: o manípulo esquerdo ou o D-pad
andam para a frente e para trás e rodam para os lados, o que dá para passear mas não para olhar para cima e para baixo.

A gravação fica no browser da consola, associada ao endereço. Limpar os dados do Edge apaga a ilha.

### Se algo correr mal na consola

- **O comando só anda e roda, ou só mexe o cursor:** falta o passo 4 (☰ premido → Use game controls → A).
- **Para ver o que a consola envia ao jogo:** abrir o endereço terminado em `diag.html`, mexer no comando e fotografar o ecrã.
- **Lento:** o jogo baixa sozinho a resolução e a distância de visão quando a imagem fica abaixo de ~28 fps.
  Para ver os números, abrir o endereço terminado em `#fps` (ou tecla F3 no PC).
- **Ecrã preto ou erro de gráficos:** fechar e reabrir o Edge (o WebGL do Edge da Xbox por vezes precisa de reinício).
- **O botão B saiu do jogo:** só acontece em modo cursor; a ilha está gravada, basta voltar a abrir o favorito.

## Controlos

| Ação | Comando Xbox | Teclado e rato |
|---|---|---|
| Andar | Manípulo esquerdo | W A S D (ou setas ↑ ↓) |
| Olhar | Manípulo direito | Rato (setas ← → rodam, PageUp / PageDown sobem e descem a vista) |
| Saltar / subir / nadar | A | Espaço |
| Pôr bloco | RT | Botão direito (ou X) |
| Tirar bloco | LT | Botão esquerdo (ou Z) |
| Escolher bloco | LB / RB ou D-pad ← → | Roda, Q / R ou 1–9 |
| Festinhas / montar / desmontar | X | E |
| Voar (ligar / desligar) | Y | F |
| Descer em voo | B ou D-pad ↓ | Shift |
| Menu | ☰ | Esc ou P |

Menu de pausa (só ícones): continuar · voltar à cabana · som · saltar a missão · ilha nova
(a ilha nova apaga as construções mas mantém o nível e os bebés; exige manter o botão premido durante 2 segundos).

## Níveis e missões

Cada nível é uma missão curta, mostrada no canto superior esquerdo: o número do nível,
o desenho do objetivo e bolinhas (ou uma barra) com o progresso. Não há relógio nem forma de perder.
Os níveis não têm fim; a dificuldade sobe devagar (mais quantidade, mais longe, mais alto).

| Missão | O que fazer | Como fica mais difícil |
|---|---|---|
| Estrelas | Tocar nas estrelas douradas | De 3 a 10; a partir do nível 6 algumas em cima de árvores, a partir do 12 algumas no céu |
| Ovos | Chegar ao pé dos ovos para chocarem | De 2 a 6, cada vez mais longe |
| Construir pelo molde | Preencher os blocos fantasma | De 3 a cerca de 40 blocos; a partir do nível 8 é preciso escolher a cor certa |
| Bebé perdido | Encontrar o bebé (coração por cima) e levá-lo à mãe | Mais longe; 2 bebés a partir do nível 14, 3 a partir do 30 |

- Os níveis 1 a 4 apresentam os quatro tipos por esta ordem; depois são sorteados sem repetir o anterior.
- **Ajuda:** ao fim de algum tempo sem progresso aparece uma seta no cartão a apontar o caminho.
- **Saltar:** no menu de pausa, o botão laranja troca a missão por outra de tipo diferente, no mesmo nível.
- **Moldes:** basta olhar para um bloco fantasma e carregar em RT; não é preciso ter um bloco ao lado.
- **Bebés dos ovos:** os 4 mais recentes seguem a criança; os outros ficam a viver ao pé da cabana (máximo 8).
- A missão em curso recomeça do zero ao reabrir o jogo; o nível e as construções mantêm-se.

Prémios ao concluir níveis:

| Nível concluído | Prémio |
|---|---|
| 5 | Blocos laranja, verde-lima, roxo e rosa |
| 10 | Espinossauro |
| 15 | Blocos de água e luminoso |
| 20 | Anquilossauro |
| 25 | Blocos preto, ciano e dourado |
| 30 | Parassaurolofo |
| 35, 40, 45, 50 | Um dinossauro de cor diferente |

Para os pais: abrir o endereço terminado em `#nivel=12` começa nesse nível (útil para testar ou recuperar o progresso).

## O que há na ilha

- 13 blocos para construir no início, 22 com os desbloqueios.
- Dinossauros para montar: tiranossauro, tricerátopo, braquiossauro, estegossauro e pterossauro (este voa), mais os desbloqueáveis.
- Animais para festinhas: cachorro (segue a criança), coelhos, patos e tartarugas.
- Uma cabana no ponto de partida, um vulcão, praias com palmeiras, dia e noite suaves.

## Estrutura

```
index.html      página
diag.html       diagnóstico do comando (mostra o que o browser entrega)
style.css       interface
js/world.js     blocos e geração da ilha
js/render.js    malhas, céu, resolução
js/physics.js   colisões e mira
js/creatures.js dinossauros, animais, ovos, partículas
js/audio.js     sons sintetizados
js/input.js     comando, teclado e rato
js/ui.js        barra de blocos, cartão da missão, menus
js/missions.js  níveis, missões e prémios
js/game.js      ciclo principal e gravação
vendor/         three.js r160 (licença MIT, ver three.LICENSE)
tests/          testes automáticos (não são precisos para jogar)
```

## Testes automáticos (opcional)

Precisam de Node.js e do Playwright (`npm i playwright && npx playwright install chromium`).

```bash
node tests/servidor.js . 8123
```

Noutro terminal:

```bash
node tests/mecanicas.js
```

```bash
node tests/missoes.js
```

```bash
node tests/niveis.js
```

```bash
node tests/resistencia.js
```

`mecanicas.js` simula um comando e verifica os controlos; `missoes.js` joga os quatro tipos de missão, o saltar,
os prémios e a gravação; `niveis.js` corre 120 níveis seguidos; `resistencia.js` carrega em botões ao acaso durante 45 s.

## Estado dos testes

Testado automaticamente em Chromium (sem placa gráfica) com comando simulado: movimento, blocos,
voo, montar e desmontar, menu, gravação e recarregamento, ilha nova, os quatro tipos de missão,
120 níveis seguidos, e 45 s de botões aleatórios sem erros. **Não foi testado numa Xbox real**: o passo ☰ e o desempenho na consola têm de ser confirmados lá.
