package main

import (
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// devProxyFS returns an http.FileSystem that proxies requests to the Vite dev server.
func devProxyFS(target string) http.FileSystem {
	return &proxyFS{target: target}
}

type proxyFS struct {
	target string
}

func (p *proxyFS) Open(name string) (http.File, error) {
	url := p.target + name
	if !strings.HasPrefix(name, "/") {
		url = p.target + "/" + name
	}
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	return &proxyFile{ReadCloser: resp.Body, size: resp.ContentLength}, nil
}

type proxyFile struct {
	io.ReadCloser
	size int64
}

func (f *proxyFile) Seek(offset int64, whence int) (int64, error) { return 0, nil }
func (f *proxyFile) Readdir(count int) ([]os.FileInfo, error)     { return nil, nil }
func (f *proxyFile) Stat() (os.FileInfo, error)                   { return &proxyFileInfo{}, nil }

type proxyFileInfo struct{}

func (fi *proxyFileInfo) Name() string      { return "proxy" }
func (fi *proxyFileInfo) Size() int64       { return 0 }
func (fi *proxyFileInfo) Mode() os.FileMode { return 0444 }
func (fi *proxyFileInfo) ModTime() time.Time { return time.Time{} }
func (fi *proxyFileInfo) IsDir() bool       { return false }
func (fi *proxyFileInfo) Sys() any          { return nil }
