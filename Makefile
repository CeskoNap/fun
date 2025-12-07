.PHONY: help install dev build start test lint format clean up down docker-up docker-down docker-build docker-logs db-migrate db-generate db-studio db-seed

# Default target
.DEFAULT_GOAL := help

# Variables
PNPM := pnpm
DOCKER_COMPOSE := docker-compose

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

##@ Help

help: ## Mostra questo messaggio di aiuto
	@echo "$(BLUE)Fun Gaming Platform - Makefile$(NC)"
	@echo ""
	@echo "$(GREEN)Comandi disponibili:$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(GREEN)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup

install: ## Installa tutte le dipendenze del progetto
	@echo "$(BLUE)Installando dipendenze...$(NC)"
	$(PNPM) install

install-frontend: ## Installa solo le dipendenze del frontend
	@echo "$(BLUE)Installando dipendenze frontend...$(NC)"
	cd frontend && $(PNPM) install

install-backend: ## Installa solo le dipendenze del backend
	@echo "$(BLUE)Installando dipendenze backend...$(NC)"
	cd backend && $(PNPM) install

install-contracts: ## Installa solo le dipendenze dei contratti
	@echo "$(BLUE)Installando dipendenze contracts...$(NC)"
	cd contracts && $(PNPM) install

##@ Development

dev: ## Avvia frontend e backend in modalità sviluppo
	@echo "$(BLUE)Avviando ambiente di sviluppo...$(NC)"
	$(PNPM) dev

dev-frontend: ## Avvia solo il frontend in modalità sviluppo
	@echo "$(BLUE)Avviando frontend...$(NC)"
	cd frontend && $(PNPM) dev

dev-backend: ## Avvia solo il backend in modalità sviluppo
	@echo "$(BLUE)Avviando backend...$(NC)"
	cd backend && $(PNPM) start:dev

##@ Build

build: docker-build ## Compila frontend, backend e costruisce immagini Docker
	@echo "$(BLUE)Compilando progetto...$(NC)"
	$(PNPM) build

build-frontend: ## Compila solo il frontend
	@echo "$(BLUE)Compilando frontend...$(NC)"
	cd frontend && $(PNPM) build

build-backend: ## Compila solo il backend
	@echo "$(BLUE)Compilando backend...$(NC)"
	cd backend && $(PNPM) build

##@ Production

start: ## Avvia frontend e backend in produzione
	@echo "$(BLUE)Avviando in produzione...$(NC)"
	cd frontend && $(PNPM) start & cd backend && $(PNPM) start:prod

start-frontend: ## Avvia solo il frontend in produzione
	@echo "$(BLUE)Avviando frontend in produzione...$(NC)"
	cd frontend && $(PNPM) start

start-backend: ## Avvia solo il backend in produzione
	@echo "$(BLUE)Avviando backend in produzione...$(NC)"
	cd backend && $(PNPM) start:prod

##@ Testing

test: ## Esegue tutti i test
	@echo "$(BLUE)Eseguendo test...$(NC)"
	$(PNPM) test

test-backend: ## Esegue i test del backend
	@echo "$(BLUE)Eseguendo test backend...$(NC)"
	cd backend && $(PNPM) test

test-backend-watch: ## Esegue i test del backend in modalità watch
	@echo "$(BLUE)Eseguendo test backend (watch)...$(NC)"
	cd backend && $(PNPM) test:watch

test-backend-cov: ## Esegue i test del backend con coverage
	@echo "$(BLUE)Eseguendo test backend con coverage...$(NC)"
	cd backend && $(PNPM) test:cov

test-contracts: ## Esegue i test dei contratti
	@echo "$(BLUE)Eseguendo test contracts...$(NC)"
	cd contracts && $(PNPM) test

##@ Code Quality

lint: ## Esegue il linting su tutto il progetto
	@echo "$(BLUE)Eseguendo linting...$(NC)"
	$(PNPM) lint

lint-frontend: ## Esegue il linting del frontend
	@echo "$(BLUE)Eseguendo linting frontend...$(NC)"
	cd frontend && $(PNPM) lint

lint-backend: ## Esegue il linting del backend
	@echo "$(BLUE)Eseguendo linting backend...$(NC)"
	cd backend && $(PNPM) lint

format: ## Formatta il codice con Prettier
	@echo "$(BLUE)Formattando codice...$(NC)"
	$(PNPM) format

format-backend: ## Formatta il codice del backend
	@echo "$(BLUE)Formattando codice backend...$(NC)"
	cd backend && $(PNPM) format

##@ Database

db-generate: ## Genera il client Prisma
	@echo "$(BLUE)Generando client Prisma...$(NC)"
	cd backend && $(PNPM) prisma:generate

db-migrate: ## Esegue le migrazioni del database
	@echo "$(BLUE)Eseguendo migrazioni database...$(NC)"
	cd backend && $(PNPM) prisma:migrate

db-studio: ## Apre Prisma Studio
	@echo "$(BLUE)Avviando Prisma Studio...$(NC)"
	cd backend && $(PNPM) prisma:studio

db-seed: ## Popola il database con dati di esempio
	@echo "$(BLUE)Popolando database...$(NC)"
	cd backend && $(PNPM) prisma:seed

db-reset: ## Resetta il database (ATTENZIONE: cancella tutti i dati)
	@echo "$(YELLOW)ATTENZIONE: Questo comando cancellerà tutti i dati!$(NC)"
	cd backend && npx prisma migrate reset

##@ Docker

up: docker-up ## Avvia tutti i servizi Docker (alias per docker-up)
down: docker-down ## Ferma tutti i servizi Docker (alias per docker-down)

docker-up: ## Avvia tutti i servizi Docker
	@echo "$(BLUE)Avviando servizi Docker...$(NC)"
	$(DOCKER_COMPOSE) up -d

docker-down: ## Ferma tutti i servizi Docker
	@echo "$(BLUE)Fermando servizi Docker...$(NC)"
	$(DOCKER_COMPOSE) down

docker-build: ## Costruisce le immagini Docker
	@echo "$(BLUE)Costruendo immagini Docker...$(NC)"
	$(DOCKER_COMPOSE) build

docker-logs: ## Mostra i log dei container Docker
	@echo "$(BLUE)Mostrando log Docker...$(NC)"
	$(DOCKER_COMPOSE) logs -f

docker-logs-backend: ## Mostra i log del backend
	@echo "$(BLUE)Mostrando log backend...$(NC)"
	$(DOCKER_COMPOSE) logs -f backend

docker-logs-frontend: ## Mostra i log del frontend
	@echo "$(BLUE)Mostrando log frontend...$(NC)"
	$(DOCKER_COMPOSE) logs -f frontend

docker-logs-postgres: ## Mostra i log di PostgreSQL
	@echo "$(BLUE)Mostrando log PostgreSQL...$(NC)"
	$(DOCKER_COMPOSE) logs -f postgres

docker-restart: ## Riavvia tutti i servizi Docker
	@echo "$(BLUE)Riavviando servizi Docker...$(NC)"
	$(DOCKER_COMPOSE) restart

docker-ps: ## Mostra lo stato dei container Docker
	@echo "$(BLUE)Stato container Docker:$(NC)"
	$(DOCKER_COMPOSE) ps

docker-clean: ## Rimuove container, volumi e immagini Docker
	@echo "$(YELLOW)ATTENZIONE: Questo comando rimuoverà container, volumi e immagini!$(NC)"
	$(DOCKER_COMPOSE) down -v --rmi all

##@ Cleanup

clean: ## Rimuove file di build e cache
	@echo "$(BLUE)Pulendo file di build...$(NC)"
	rm -rf frontend/.next
	rm -rf frontend/out
	rm -rf backend/dist
	rm -rf node_modules
	rm -rf frontend/node_modules
	rm -rf backend/node_modules
	rm -rf contracts/node_modules

clean-frontend: ## Rimuove file di build del frontend
	@echo "$(BLUE)Pulendo frontend...$(NC)"
	rm -rf frontend/.next
	rm -rf frontend/out
	rm -rf frontend/node_modules

clean-backend: ## Rimuove file di build del backend
	@echo "$(BLUE)Pulendo backend...$(NC)"
	rm -rf backend/dist
	rm -rf backend/node_modules

##@ Quick Start

setup: install db-generate ## Setup completo del progetto (install + generate Prisma)
	@echo "$(GREEN)Setup completato!$(NC)"
	@echo "$(YELLOW)Ricorda di configurare i file .env prima di avviare il progetto.$(NC)"

quick-start: docker-up ## Avvia tutto con Docker (quick start)
	@echo "$(GREEN)Servizi Docker avviati!$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:3001$(NC)"

