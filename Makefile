up: ; docker compose up -d --build
down: ; docker compose down -v
logs: ; docker compose logs -f api
test: ; pnpm test
lint: ; pnpm eslint .
openapi: ; pnpm openapi:gen
