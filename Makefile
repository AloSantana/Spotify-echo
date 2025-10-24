 .PHONY: build up down logs sh docker-test

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=200 app

sh:
	docker compose exec app sh

docker-test:
	docker compose up -d && powershell -Command "Start-Sleep -s 5" && curl -sf http://127.0.0.1:${PORT:-3000}/healthz || (echo "Healthcheck failed" && exit 1)


