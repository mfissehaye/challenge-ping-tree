// A generic utility to process request body and respond
// result from the callback.
// TODO: create a way for the callback to be able to set the status
function respond (req, res, callback = () => '', status = 200) {
  let body = []
  req.on('data', (chunks) => {
    body.push(chunks)
  })

  req.on('end', async () => {
    try {
      body = JSON.parse(body.join(''))
    } catch (ex) { }
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    const responseBody = await callback(body, req.params)
    return res.end(JSON.stringify(responseBody))
  })

  req.on('error', () => {
    console.log('There is error in the input')
  })
}

module.exports = {
  respond
}
