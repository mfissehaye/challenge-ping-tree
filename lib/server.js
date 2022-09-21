var URL = require('url')
var http = require('http')
var cuid = require('cuid')
var Corsify = require('corsify')
var sendJson = require('send-data/json')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')
var HttpHashRouter = require('http-hash-router')
var targetRoutes = require('./routes/targets')
var requestRoutes = require('./routes/request')

var redis = require('./redis')
const { match } = require('assert')
var version = require('../package.json').version

var router = HttpHashRouter()
var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, redis.healthCheck)
var cors = Corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, accept, content-type'
})

router.set('/favicon.ico', empty)

module.exports = function createServer() {
  return http.createServer(cors(handler))
}

function handler(req, res) {
  if (req.url === '/health') return health(req, res)
  var match = req.url.match(/\/api\/target\/(\d+)\/?/)
  if (match && match.length > 1) {
    req.params = { id: parseInt(match[1]) }
    if (req.method === 'GET') return targetRoutes.get(req, res)
    if (req.method === 'POST') return targetRoutes.update(req, res)
  }

  if (/\/api\/targets\/?/.test(req.url)) {
    if (req.method === 'POST') return targetRoutes.create(req, res)
    if (req.method === 'GET') return targetRoutes.list(req, res)
  }

  if (/\/route\/?/.test(req.url) && req.method === 'POST') {
    return requestRoutes.processRequest(req, res)
  }
  req.id = cuid()
  logger(req, res, { requestId: req.id }, function (info) {
    info.authEmail = (req.auth || {}).email
    console.log(info)
  })
  router(req, res, { query: getQuery(req.url) }, onError.bind(null, req, res))
}

function onError(req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

function logError(req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  var logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

function empty(req, res) {
  res.writeHead(204)
  res.end()
}

function getQuery(url) {
  return URL.parse(url, true).query // eslint-disable-line
}
