# Floating Head Cam - Makefile
# Compatível com Linux/macOS e Windows (Git Bash, MSYS2, MinGW ou WSL)

SHELL := /bin/sh
PM ?= npm

.PHONY: help install reinstall dev start build build-unpack \
	lint format typecheck typecheck-node typecheck-web \
	test test-watch test-coverage \
	build-win build-mac build-linux \
	release release-prepare release-linux \
	clean doctor

help:
	@echo ""
	@echo "Floating Head Cam - comandos disponíveis"
	@echo ""
	@echo "  make install         Instala dependências"
	@echo "  make reinstall       Reinstala deps do zero"
	@echo "  make dev             Ambiente de desenvolvimento (electron-vite dev)"
	@echo "  make start           Preview da app (electron-vite preview)"
	@echo "  make build           Typecheck + build"
	@echo "  make build-unpack    Build em modo unpacked"
	@echo ""
	@echo "  make lint            ESLint"
	@echo "  make format          Prettier --write ."
	@echo "  make typecheck       Typecheck completo"
	@echo "  make test            Testes (vitest run)"
	@echo "  make test-watch      Testes em watch"
	@echo "  make test-coverage   Testes com cobertura"
	@echo ""
	@echo "  make build-win       Empacota para Windows x64"
	@echo "  make build-mac       Empacota para macOS arm64"
	@echo "  make build-linux     Empacota para Linux x64"
	@echo ""
	@echo "  make release         Release multi-plataforma"
	@echo "  make release-prepare Prepara release notes/versionamento"
	@echo "  make release-linux   Release Linux"
	@echo ""
	@echo "  make clean           Remove artefatos temporários"
	@echo "  make doctor          Mostra versões do ambiente"
	@echo ""

install:
	$(PM) install

reinstall:
	rm -rf node_modules dist out
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

release:
	$(PM) run release

release-prepare:
	$(PM) run release:prepare

release-linux:
	$(PM) run release:linux

clean:
	rm -rf dist out node_modules/.cache .turbo coverage

doctor:
	@echo "Node: $$(node -v)"
	@echo "npm:  $$($(PM) -v)"
	@echo "OS:   $$(uname -s 2>/dev/null || echo Windows)"
