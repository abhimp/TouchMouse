package webui

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"path"
	"sync"

)

//go:embed statics
var _content embed.FS

type _prefixed struct {
	prefix string
	fs     embed.FS
}

type WebServer struct {
	listener net.Listener
	server   *http.ServeMux
	wg sync.WaitGroup
}

func (ws *WebServer) Wait() {
	ws.wg.Wait()
}

func (ws *WebServer) GerServer() *http.ServeMux {
	return ws.server
}

func getWebUIFS() *_prefixed {
	pfs := _prefixed{"statics/", _content}
	return &pfs
}

func (p *_prefixed) Open(name string) (fs.File, error) {
	sname := path.Join(p.prefix, name)
	fmt.Println(sname)
	return p.fs.Open(sname)
}

func startServing(wg *sync.WaitGroup, ws *WebServer) {
	ws.server = http.NewServeMux()
	ws.server.Handle("/", http.StripPrefix("/", http.FileServer(http.FS(getWebUIFS()))))
	// ws.server.Handle("/", http.FileServer(http.FS(_content)))
	wg.Done()
	ws.wg.Add(1)
	http.Serve(ws.listener, ws.server)
	ws.wg.Done()
}

func StartWebUI(port int) *WebServer {
	var wg sync.WaitGroup
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		log.Fatalln("Error in webui creation:", err)
	}
	ws := new(WebServer)
	ws.listener = listener
	wg.Add(1)
	go startServing(&wg, ws)
	fmt.Println("Waiting for server to start")
	wg.Wait()
	fmt.Printf("WebUI started at http://%s\n", ws.listener.Addr())
	return ws
}

