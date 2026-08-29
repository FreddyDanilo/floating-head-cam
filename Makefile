# Makefile cross-platform (CMD, PowerShell, Linux, macOS)

PM = npm

# ANSI colors
C_RESET  = \033[0m
C_BOLD   = \033[1m
C_CYAN   = \033[36m
C_GREEN  = \033[32m
C_YELLOW = \033[33m
C_GRAY   = \033[90m

.PHONY: help install reinstall dev start build build-unpack \
        lint format typecheck typecheck-node typecheck-web \
        test test-watch test-coverage \
        build-win build-mac build-linux \
        release release-prepare release-linux \
        clean doctor

help:
	@printf "$(C_BOLD)$(C_CYAN)Floating Head Cam - comandos disponiveis$(C_RESET)\n\n"
	@printf "$(C_BOLD)Uso:$(C_RESET) $(C_GREEN)make <comando>$(C_RESET)\n\n"

	@printf "$(C_BOLD)Setup$(C_RESET)\n"
	@printf "  $(C_GREEN)make help$(C_RESET)             $(C_GRAY)-> Mostra esta ajuda com todos os comandos$(C_RESET)\n"
	@printf "  $(C_GREEN)make install$(C_RESET)          $(C_GRAY)-> Instala as dependencias do projeto (npm install)$(C_RESET)\n"
	@printf "  $(C_GREEN)make reinstall$(C_RESET)        $(C_GRAY)-> Remove artefatos/dependencias e reinstala tudo do zero$(C_RESET)\n\n"

	@printf "$(C_BOLD)Desenvolvimento$(C_RESET)\n"
	@printf "  $(C_GREEN)make dev$(C_RESET)              $(C_GRAY)-> Inicia o ambiente de desenvolvimento (electron-vite dev)$(C_RESET)\n"
	@printf "  $(C_GREEN)make start$(C_RESET)            $(C_GRAY)-> Executa preview da app (electron-vite preview)$(C_RESET)\n"
	@printf "  $(C_GREEN)make build$(C_RESET)            $(C_GRAY)-> Executa typecheck e build de producao$(C_RESET)\n"
	@printf "  $(C_GREEN)make build-unpack$(C_RESET)     $(C_GRAY)-> Gera build unpacked (diretorio sem instalador)$(C_RESET)\n\n"

	@printf "$(C_BOLD)Qualidade$(C_RESET)\n"
	@printf "  $(C_GREEN)make lint$(C_RESET)             $(C_GRAY)-> Executa analise de codigo com ESLint$(C_RESET)\n"
	@printf "  $(C_GREEN)make format$(C_RESET)           $(C_GRAY)-> Formata o codigo com Prettier$(C_RESET)\n"
	@printf "  $(C_GREEN)make typecheck$(C_RESET)        $(C_GRAY)-> Executa verificacao de tipos (node + web)$(C_RESET)\n"
	@printf "  $(C_GREEN)make typecheck-node$(C_RESET)   $(C_GRAY)-> Executa verificacao de tipos apenas do Node$(C_RESET)\n"
	@printf "  $(C_GREEN)make typecheck-web$(C_RESET)    $(C_GRAY)-> Executa verificacao de tipos apenas do frontend/web$(C_RESET)\n"
	@printf "  $(C_GREEN)make test$(C_RESET)             $(C_GRAY)-> Executa testes uma vez (vitest run)$(C_RESET)\n"
	@printf "  $(C_GREEN)make test-watch$(C_RESET)       $(C_GRAY)-> Executa testes em modo observacao (watch)$(C_RESET)\n"
	@printf "  $(C_GREEN)make test-coverage$(C_RESET)    $(C_GRAY)-> Executa testes com relatorio de cobertura$(C_RESET)\n\n"

	@printf "$(C_BOLD)Empacotamento$(C_RESET)\n"
	@printf "  $(C_GREEN)make build-win$(C_RESET)        $(C_GRAY)-> Gera pacote/build para Windows x64$(C_RESET)\n"
	@printf "  $(C_GREEN)make build-mac$(C_RESET)        $(C_GRAY)-> Gera pacote/build para macOS arm64$(C_RESET)\n"
	@printf "  $(C_GREEN)make build-linux$(C_RESET)      $(C_GRAY)-> Gera pacote/build para Linux x64$(C_RESET)\n\n"

	@printf "$(C_BOLD)Release$(C_RESET)\n"
	@printf "  $(C_GREEN)make release-prepare$(C_RESET)  $(C_GRAY)-> Prepara release (scripts de versao/notas)$(C_RESET)\n"
	@printf "  $(C_GREEN)make release$(C_RESET)          $(C_GRAY)-> Executa pipeline de release completa$(C_RESET)\n"
	@printf "  $(C_GREEN)make release-linux$(C_RESET)    $(C_GRAY)-> Executa release apenas para Linux$(C_RESET)\n\n"

	@printf "$(C_BOLD)Manutencao$(C_RESET)\n"
	@printf "  $(C_GREEN)make clean$(C_RESET)            $(C_GRAY)-> Remove pastas temporarias/artefatos de build$(C_RESET)\n"
	@printf "  $(C_GREEN)make doctor$(C_RESET)           $(C_GRAY)-> Mostra diagnostico do ambiente (Node, npm, SO, arquitetura)$(C_RESET)\n"

install:
	$(PM) install

reinstall:
	node -e "const fs=require('fs');['node_modules','dist','out','coverage','.turbo','node_modules/.cache'].forEach(p=>fs.rmSync(p,{recursive:true,force:true}));console.log('pastas removidas')"
	$(PM) install

dev:
	$(PM) run dev

start:
	$(PM) run start

build:
	$(PM) run build

build-unpack:
	$(PM) run build:unpack

lint:
	$(PM) run lint

format:
	$(PM) run format

typecheck:
	$(PM) run typecheck

typecheck-node:
	$(PM) run typecheck:node

typecheck-web:
	$(PM) run typecheck:web

test:
	$(PM) run test

test-watch:
	$(PM) run test:watch

test-coverage:
	$(PM) run test:coverage

build-win:
	$(PM) run build:win

build-mac:
	$(PM) run build:mac

build-linux:
	$(PM) run build:linux

release-prepare:
	$(PM) run release:prepare

release:
	$(PM) run release

release-linux:
	$(PM) run release:linux

clean:
	node -e "const fs=require('fs');['dist','out','coverage','.turbo','node_modules/.cache'].forEach(p=>fs.rmSync(p,{recursive:true,force:true}));console.log('clean ok')"

doctor:
	node -e "const os=require('os');console.log('Node:',process.version);console.log('Platform:',process.platform);console.log('Release:',os.release());console.log('Arch:',process.arch)"
	$(PM) -v
