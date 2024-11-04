(() => {
    if (!(window.top === window.self)) return
    const websocketProtocol = location.protocol === "https:" ? "wss" : "ws"
    const ws = new WebSocket(`${websocketProtocol}://${location.hostname}:${location.port}`)
    ws.onopen = () => {
        console.log('Connected to Development server.')
    }

    ws.onclose = () => {
        location.reload()
    }
})()