process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
const createServer = require('../lib/server')
const redis = require('../lib/redis')

test.beforeEach.cb((t) => {
  t.context.server = createServer()
  const target1 = {
    url: 'http://target1.com',
    value: '1',
    maxAcceptsPerDay: '5',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }

  const target2 = {
    url: 'http://target2.com',
    value: '2',
    maxAcceptsPerDay: '3',
    accept: {
      geoState: {
        $in: ['et', 'ch']
      },
      hour: {
        $in: ['1', '2', '3']
      }
    }
  }

  t.context.targets = [target1, target2]
  redis.mset([
    'target:1',
    JSON.stringify(t.context.targets[0]),
    'target:2',
    JSON.stringify(t.context.targets[1])
  ], (err, ok) => {
    t.falsy(err, 'no error')
    t.end()
  })
})

test.afterEach.cb((t) => {
  t.context.server.close(() => {
    t.end()
  })
})

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(t.context.server, url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.cb('get /api/targets', function (t) {
  servertest(t.context.server, '/api/targets', { encoding: 'utf8' }, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200)

    t.is(JSON.parse(res.body).length, 2)
    t.end()
  })
})

test.cb('get /api/target/1', function (t) {
  servertest(t.context.server, '/api/target/1', { encoding: 'utf8' }, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200)

    t.like(JSON.parse(res.body), t.context.targets[0])
    t.end()
  })
})
