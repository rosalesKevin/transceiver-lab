package main

import (
	"net/http"

	"github.com/mmt/multicast-tester/internal/assets"
)

// staticFileSystem returns the embedded web assets as an http.FileSystem with SPA fallback.
func staticFileSystem() http.FileSystem {
	return assets.StaticFS()
}
