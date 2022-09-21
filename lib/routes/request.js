const { respond } = require('../utils')

const processRequest = function (req, res) {
    return respond(req, res, async () => {
        return {
            "geoState": "ca",
            "publisher": "abc",
            "timestamp": "2018-07-19T23:28:59.513Z"
        }
    })
}

module.exports = {
    processRequest
}