(() => {
    if (!(window.top === window.self)) return

    const ws = new WebSocket(`ws://${location.hostname}:${location.port}`)
    ws.onopen = () => {
        console.log('Connected to Development server.')
    }

    ws.onclose = () => {
        location.reload()
    }
})()