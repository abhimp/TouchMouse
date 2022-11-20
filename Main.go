package main

import (
	"abhijitmondal.in/touchMouse/webui"

	"abhijitmondal.in/touchMouse/mouse"

	"net/http"

)



func main() {
	ws := webui.StartWebUI(12321)
	mws := mouse.NewMouseConn()
	ws.GerServer().Handle("/ws/", http.StripPrefix("/ws", mws))
	ws.Wait()
}