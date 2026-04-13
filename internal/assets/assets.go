package assets

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed dist
var embeddedFS embed.FS

// StaticFS returns the embedded dist/ as an http.FileSystem with SPA fallback.
func StaticFS() http.FileSystem {
	sub, err := fs.Sub(embeddedFS, "dist")
	if err != nil {
		panic("assets embed: " + err.Error())
	}
	return &spaFileSystem{http.FS(sub)}
}

type spaFileSystem struct {
	fs http.FileSystem
}

func (s *spaFileSystem) Open(name string) (http.File, error) {
	f, err := s.fs.Open(name)
	if err != nil {
		// Unknown path — serve index.html so React Router handles it client-side.
		return s.fs.Open("/index.html")
	}
	return f, nil
}
