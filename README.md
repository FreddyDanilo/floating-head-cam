<div align="center">
  <img src="resources/icon.png" width="128" alt="Floating Head Cam Logo" />

# Floating Head Cam

**Version 1.0.2** | **Created by Freddy Danilo**

_Minimalist picture-in-picture (PiP) webcam application._
</div>

---

## Sobre

**Floating Head Cam** é um aplicativo de câmera "picture-in-picture" construído com Electron, React e TypeScript. Ele permite exibir a imagem da tua webcam em uma janela flutuante que fica **sempre no topo** das outras janelas.

É a ferramenta perfeita para quem grava tutoriais, faz transmissões ao vivo (streams), apresentações ou reuniões online, e quer manter seu rosto visível na tela sem complicação.

## Funcionalidades

- **Sempre no Topo:** A câmera nunca é coberta por outras janelas.
- **Formatos Personalizáveis:** Altere entre Círculo, Quadrado ou Retângulos (vertical/horizontal).
- **Ajustes Visuais:** Altere o tamanho da câmera e o arredondamento das bordas.
- **Modo Espelho:** Inverta a imagem da câmera horizontalmente.
- **Atalhos Globais:** Posicione a câmera instantaneamente em qualquer canto da tela usando o teclado.
- **Múltiplas Câmeras:** Troque facilmente entre as webcams conectadas.

## Download

Baixe a versão mais recente diretamente aqui do repositório (acesse a página e baixe o instalador `.dmg` para Mac ou `.exe` para Windows):

- **[Baixar Versão Mais Recente (Página de Releases)](https://github.com/FreddyDanilo/floating-head-cam/releases/latest)**

## Como usar

1. **Abra o aplicativo:** Inicie o Floating Head Cam.
2. **Barra de Tarefas / Menu Bar:** O app roda em segundo plano. Procure pelo ícone de claquete na tua barra de menus (Mac) ou bandeja do sistema (Windows).
3. **Ligar Câmera:** Clique no ícone e selecione "Turn On" para mostrar a tua câmera.
4. **Preferências:** Vá em "Preferences..." para configurar os seus atalhos de teclado e ajustar o comportamento do app.

---

### Para Desenvolvedores

Se quiser rodar o projeto localmente:

```bash
# Instalar dependências
npm install

# Rodar em modo de desenvolvimento
npm run dev

# Gerar build para Mac
npm run build:mac

# Gerar build para Windows
npm run build:win
```
