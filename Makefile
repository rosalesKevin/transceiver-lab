.PHONY: all build build-ui build-go run dev clean test

BINARY   := bin/mmt.exe
WEB_DIST := internal/assets/dist

all: build

## Build everything (UI + Go binary)
build: build-ui build-go

## Build the React SPA
build-ui:
	cd web && npm install && npm run build

## Build the Go binary (requires build-ui first)
build-go:
	go build -ldflags="-s -w" -o $(BINARY) ./cmd/mmt/

## Run the production binary
run: build
	./$(BINARY) --port 8080

## Dev mode: run Go server with --dev flag (proxies to Vite)
## Open two terminals: `make dev-ui` and `make dev-api`
dev-ui:
	cd web && npm run dev

dev-api:
	go run ./cmd/mmt/ --dev --port 8080

## Run Go tests
test:
	go test ./...

## Remove build artifacts
clean:
	rm -rf $(BINARY) $(WEB_DIST)
	mkdir -p $(WEB_DIST)
	echo '<!DOCTYPE html><html><body>Run make build-ui</body></html>' > $(WEB_DIST)/index.html
