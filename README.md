<div align="center">
  <img src="resources/icon.png" width="128" alt="Floating Head Cam Logo" />

# Floating Head Cam

**Created by Freddy Danilo**

_Posiciona a tua câmera do jeito mais simples possível._
</div>

---

O **Floating Head Cam** é um aplicativo que coloca a tua webcam em uma janela flutuante.

Feito para criadores de conteúdo que não têm domínio de programas de edição ou pretendem econimazar tempo de edição.

## O que ele faz?

- **Sempre no Topo:** A tua câmera flutua sobre todas as outras janelas, não importa o que você esteja a fazer.
- **Vitual Customizável:** Mude o formato (círculo, quadrado, retângulos), ajuste o tamanho e o arredondamento das bordas como preferir.
- **Atalhos Mágicos:** Posiciona a câmera para qualquer canto da tela instantaneamente usando atalhos do teclado.
- **Gravador [BETA]:** Grava a tua tela.

## Como começar

1. **Baixe o app** na [Página de Releases](https://github.com/FreddyDanilo/floating-head-cam/releases/latest) (disponível para Mac, Windows e Linux).
2. **Abra o aplicativo**.
3. Procure o **ícone de claquete** na tua barra de menus (Mac) ou na bandeja do sistema (Windows/Linux) e clique em **Turn On** para exibir a câmera.
4. Acesse as **Preferences** no mesmo menu para configurar seus atalhos e deixar o app com a tua cara!

---

### Para Desenvolvedores

### Para Desenvolvedores

Queres dar uma olhada no código ou contribuir? O projeto é feito com **Electron, React e TypeScript**.

## O que é um Makefile?

Um **Makefile** é um ficheiro de automação que define comandos curtos (targets) para tarefas repetitivas do projeto, como instalar dependências, executar em desenvolvimento, validar código, testar e gerar builds.

Neste projeto (Electron + Vite + TypeScript), o Makefile ajuda a padronizar o fluxo entre Windows, Linux e macOS.

## Vantagens de usar Makefile

- **Rapidez**: comandos curtos para tarefas frequentes.
- **Padronização**: toda a equipa usa os mesmos comandos.
- **Menos erros**: reduz comandos longos digitados manualmente.
- **Produtividade**: facilita onboarding e rotina diária.

---

## Instalar/verificar `make` em qualquer sistema (Windows/Linux/macOS)

Este projeto inclui um script único cross-platform em Node.js:

```bash
npm run setup:make
```

O script:

1. procura o comando `make`;
2. informa se já está instalado;
3. se não estiver, pergunta ao utilizador pelo nome (via variável de ambiente do sistema);
4. tenta instalar automaticamente conforme o sistema operativo.

---

## Comandos base do Makefile

```bash
make help
make install
make dev
make start
make build
make lint
make format
make typecheck
make test
make clean
make doctor
```

### Comandos de build por plataforma

```bash
make build-win
make build-mac
make build-linux
```

### Comandos de release

```bash
make release-prepare
make release
make release-linux
```
