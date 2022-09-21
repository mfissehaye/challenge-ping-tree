function respond(req, res, callback = () => '', status = 200) {
    let body = []
    req.on('data', (chunks) => {
        body.push(chunks)
    })

    req.on('end', async () => {
        try {
            body = JSON.parse(body.join(''))
        } catch (ex) { }
        res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        const responseBody = await callback(body, req.params)
        return res.end(JSON.stringify(responseBody))
    })

    req.on('error', (err) => {
        console.log('There is error in the input')
    })
}

module.exports = {
    respond
}