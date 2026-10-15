.PHONY: up down logs seed test test-be test-fe reset

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f be fe

seed:
	docker compose exec be python manage.py seed

test: test-be test-fe

test-be:
	docker compose run --rm be pytest

test-fe:
	docker compose run --rm fe npm test -- --run

reset:
	docker compose down -v
