.PHONY: up down logs seed test test-be test-fe audit audit-be audit-fe reset

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
	docker compose run --rm --no-deps fe npm test -- --run

audit: audit-be audit-fe

audit-be:
	docker compose run --rm be sh -c "pip-audit -r requirements-dev.txt && bandit -q -r . -x ./.venv,'*/tests/*',./conftest.py && DJANGO_DEBUG=0 DJANGO_SECRET_KEY=\$$(python -c 'import secrets;print(secrets.token_urlsafe(50))') DJANGO_ALLOWED_HOSTS=fudoo.example python manage.py check --deploy --fail-level WARNING"

audit-fe:
	docker compose run --rm --no-deps fe sh -c "npm audit --audit-level=low && npm run lint"

reset:
	docker compose down -v
