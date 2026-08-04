<div align="center">
  <img src="resources/icon.png" width="128" alt="Floating Head Cam Logo" />
  
  # Floating Head Cam
  
  **Version 1.0.0** | **Created by Freddy Danilo**
  
  *Minimalist picture-in-picture (PiP) webcam application.*
</div>

---

## Sobre (About)

**Floating Head Cam** é um aplicativo de câmera "picture-in-picture" construído com Electron, React e TypeScript. Ele permite exibir a imagem da sua webcam em uma janela flutuante que fica **sempre no topo** das outras janelas. 

É a ferramenta perfeita para quem grava tutoriais, faz transmissões ao vivo (streams), apresentações ou reuniões online, e quer manter seu rosto visível na tela sem complicação.

## Funcionalidades (Features)

- **Sempre no Topo (Always on Top):** A câmera nunca é coberta por outras janelas.
- **Formatos Personalizáveis:** Altere entre Círculo, Quadrado ou Retângulos (vertical/horizontal).
- **Ajustes Visuais:** Altere o tamanho da câmera e o arredondamento das bordas.
- **Modo Espelho (Mirror):** Inverta a imagem da câmera horizontalmente.
- **Atalhos Globais (Global Shortcuts):** Posicione a câmera instantaneamente em qualquer canto da tela usando o teclado.
- **Múltiplas Câmeras:** Troque facilmente entre as webcams conectadas.

## Download

Baixe a versão mais recente diretamente aqui do repositório (os instaladores são gerados pelo Electron):

- **[Download para Mac (.dmg)](https://github.com/freddydanilo/floating-head-cam/releases/latest/download/floating-head-cam-1.0.0-mac.zip)**
- **[Download para Windows (.exe)](https://github.com/freddydanilo/floating-head-cam/releases/latest/download/floating-head-cam-1.0.0-win.exe)**

*(Nota: Certifique-se de acessar a aba **Releases** do GitHub para baixar as versões compiladas mais recentes.)*

## Como usar

1. **Abra o aplicativo:** Inicie o Floating Head Cam.
2. **Barra de Tarefas / Menu Bar:** O app roda em segundo plano. Procure pelo ícone de claquete na sua barra de menus (Mac) ou bandeja do sistema (Windows).
3. **Ligar Câmera:** Clique no ícone e selecione "Turn On" para mostrar a sua câmera.
4. **Preferências:** Vá em "Preferences..." para configurar os seus atalhos de teclado e ajustar o comportamento do app.

---

### Para Desenvolvedores (Development)

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
