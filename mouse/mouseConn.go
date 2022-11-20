package mouse

import (
	"sync"
	"fmt"
	"net/http"
	"encoding/json"

	"github.com/gorilla/websocket"
	"github.com/go-vgo/robotgo"
)

/******************************************************************************
 *                     WebSocket Handling                                     *
 ******************************************************************************/


 type wsClient struct {
	wsConn  *websocket.Conn
	channel chan []byte
}

type mouseEvent struct {
	E      string `json:"e"`
	B   int `json:"b"`
	X int `json:"x"`
	Y int `json:"y"`
}

 type mouseConn struct {
	// reqLock         sync.RWMutex
	// resLock         sync.RWMutex
	webSocketLock   sync.RWMutex
	nextWebsocketId uint64
	serverMux       *http.ServeMux
	wsClients       map[uint64]*wsClient
 }

 func NewMouseConn() *mouseConn {
	mc := new(mouseConn)
	mc.nextWebsocketId = 1;
	mc.serverMux = http.NewServeMux()
	mc.wsClients = make(map[uint64]*wsClient)
	mc.serverMux.HandleFunc("/ws", mc.handleWebSocket)
	return mc
}


func (mc *mouseConn) newChannelForChild(ws *websocket.Conn) (uint64, *wsClient) {
	mc.webSocketLock.Lock()
	defer mc.webSocketLock.Unlock()
	nextId := mc.nextWebsocketId
	mc.nextWebsocketId += 1
	ch := make(chan []byte, 10)
	wsc := &wsClient{ws, ch}
	mc.wsClients[nextId] = wsc
	return nextId, wsc
}

func (mc *mouseConn) removeChannelForChild(id uint64) {
	mc.webSocketLock.Lock()
	defer mc.webSocketLock.Unlock()
	delete(mc.wsClients, id)
}



var mouseButtons = [...]string{"left", "center", "right"}

func (mc *mouseConn) websocketRead(wc *wsClient, c chan bool) {
	var e mouseEvent
	for {
		_, y, err := wc.wsConn.ReadMessage()
		if err != nil {
			c <- true
			break
		}
		json.Unmarshal(y, &e)
		fmt.Println(string(y[:]), e)
		if e.E == "move" {
			robotgo.MoveRelative(e.X, e.Y)
		} else if e.E == "down" {
			robotgo.Toggle(mouseButtons[e.B], "down")
		} else if e.E == "up" {
			robotgo.Toggle(mouseButtons[e.B], "up")
		}
	}
}

func (mc *mouseConn) websocketWriter(conn *websocket.Conn) {
	id, wc := mc.newChannelForChild(conn)
	defer func() {
		mc.removeChannelForChild(id)
	}()
	c := make(chan bool, 1)
	go mc.websocketRead(wc, c)

bigfor:
	for {
		select {
		case msg := <-wc.channel:
			err := conn.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				break bigfor
			}
		case <-c:
			break bigfor
		}
	}
	fmt.Println("Disconnected")
}

func (mc *mouseConn) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	var upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("mouseConn:", err)
		return
	}
	fmt.Println("New socket connected")
	go mc.websocketWriter(conn)
}

func (mc *mouseConn) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	mc.serverMux.ServeHTTP(w, r)
}
