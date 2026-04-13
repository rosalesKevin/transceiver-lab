package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mmt/multicast-tester/internal/api"
	"github.com/mmt/multicast-tester/internal/engine"
	"github.com/mmt/multicast-tester/internal/store"
)

var version = "1.0.0"

func main() {
	port := flag.Int("port", 8080, "HTTP server port")
	bind := flag.String("bind", "127.0.0.1", "Bind address")
	dbPath := flag.String("db", "./mmt.db", "SQLite database path")
	logLevel := flag.String("log-level", "info", "Log level: debug, info, warn, error")
	dev := flag.Bool("dev", false, "Development mode (proxy to Vite dev server)")
	showVersion := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Printf("mmt version %s\n", version)
		os.Exit(0)
	}

	// Configure logger
	var lvl slog.Level
	switch *logLevel {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl}))
	slog.SetDefault(logger)

	// Open database
	db, err := store.Open(*dbPath)
	if err != nil {
		slog.Error("open database", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	templateStore := store.NewTemplateStore(db)
	historyStore := store.NewHistoryStore(db)

	// Seed default templates
	if err := templateStore.SeedDefaults(); err != nil {
		slog.Warn("seed templates", "err", err)
	}

	// Hub
	hub := api.NewHub()

	// Session manager
	sm := engine.NewSessionManager(hub, historyStore)

	// API server
	srv := api.NewServer(hub, sm, templateStore, historyStore)

	var staticFS http.FileSystem
	if *dev {
		staticFS = devProxyFS("http://localhost:5173")
		slog.Info("dev mode: proxying UI to localhost:5173")
	} else {
		staticFS = staticFileSystem()
	}

	handler := srv.Router(staticFS)
	addr := fmt.Sprintf("%s:%d", *bind, *port)
	httpSrv := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
	}

	slog.Info("Transceiver Lab starting", "addr", addr, "version", version)
	fmt.Printf("\n  Transceiver Lab v%s\n  Open: http://localhost:%d\n\n", version, *port)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("http server", "err", err)
			os.Exit(1)
		}
	}()

	<-quit
	slog.Info("shutting down...")
	sm.StopAll()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	httpSrv.Shutdown(ctx)
	slog.Info("stopped")
}
