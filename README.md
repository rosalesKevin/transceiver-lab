# Transceiver Lab

Test tool for UDP multicast messaging. Single binary — drop it anywhere, open a browser.

It handles CoT 2.0 XML, JSON, VMF binary, and raw payloads. You can send one-shot messages or loop them on a timer, join multicast groups and watch live traffic, save templates, and browse TX/RX history. Multiple sessions run independently, so you can be sending to `239.2.3.1:6969` and listening on `239.0.0.5:4000` at the same time.

Built to replace the usual `socat`/Wireshark combo when you just need to poke at a multicast pipeline.

## Build

Go 1.22+ and Node.js 18+.

```bash
cd impl/multicast-tester
make build
# output: bin/mmt
```

Cross-compile flags work as expected:

```bash
GOOS=linux   GOARCH=amd64 make build
GOOS=windows GOARCH=amd64 make build
GOOS=darwin  GOARCH=arm64 make build
```

The binary embeds the web UI — no separate web server, no static files to manage.

## Run

```bash
./bin/mmt
# Open http://localhost:8080
```

```
--port        HTTP server port          (default: 8080)
--bind        Bind address              (default: 127.0.0.1)
--db          SQLite path               (default: ./mmt.db)
--log-level   debug | info | warn | error (default: info)
--dev         Proxy UI to Vite dev server at :5173
--version     Print version and exit
```

By default it binds to loopback only. Pass `--bind 0.0.0.0` if you need it reachable from other machines, but there is no auth.

## Dev mode

Go handles the API; Vite handles the frontend with hot reload.

```bash
# terminal 1
cd impl/multicast-tester/web && npm install && npm run dev

# terminal 2
cd impl/multicast-tester && go run ./cmd/mmt --dev --port 8080
```

## Formats

**CoT 2.0** — Cursor on Target XML. The send page has a default template. Dynamic tokens work anywhere in the payload: `{{timestamp}}`, `{{seq}}`, `{{uuid}}`.

**JSON** — any JSON. No schema required, but schema validation is available via the API if you want it.

**VMF** — Variable Message Format binary. Input as a hex string (spaces allowed). Wire format: 4-byte magic `0x4d4d5400`, 2-byte message type, 2-byte body length, body bytes.

**Raw** — sent verbatim, no processing. Useful for custom protocols or seeing how a receiver handles garbage.

On receive, format is auto-detected: XML prefix → CoT, `{` or `[` → JSON, less than 70% printable bytes → VMF, otherwise unknown.

## Multicast

Default group: `239.2.3.1:6969`. ASM and SSM both work.

Send uses `net.UDPConn` with `ipv4.PacketConn` socket options for TTL and loopback control. Receive uses `net.ListenMulticastUDP`. Both are configurable per session.

On Windows, the TTL and loopback socket options fail silently. The connection still works.

## Data

SQLite at `./mmt.db`. Sessions are in memory only — they do not survive a restart. History records are trimmed automatically once you hit the configured limit (default 10,000).

Templates and history persist across restarts. Settings too.

## Stack

Go backend: Chi router, gorilla/websocket, modernc/sqlite (pure Go, no CGo required).

Frontend: React 18, Vite 6, TypeScript, Tailwind 3, Zustand.

Format codecs: beevik/etree for CoT XML, xeipuuv/gojsonschema for JSON schema validation, custom VMF codec.
