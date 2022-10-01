process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
const createServer = require('../lib/server')
const redis = require('../lib/redis')
const ReadableStream = require('stream').Readable
const bl = require('bl')

const testGet = (url, assertionsCallback = () => null) => {
  test.cb(`get ${url}`, function (t) {
    servertest(t.context.server, url, { encoding: 'utf8' }, function (err, res) {
      t.falsy(err, 'no error')
      assertionsCallback(t, res)
      t.end()
    })
  })
}

const testPost = (url, data, assertionsCallback = () => null, name = null) => {
  test.cb(name || `post ${url}`, function (t) {
    const serverStream = servertest(t.context.server, url, { method: 'POST' })
    const stream = new ReadableStream()
    stream.push(JSON.stringify(data))
    stream.push(null)
    stream.pipe(serverStream)

    serverStream.pipe(bl(function (err, data) {
      t.falsy(err, 'no error')
      assertionsCallback(t, data.toString())
    }))
  })
}

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
  redis.flushdb(function (err, ok) {
    t.falsy(err, 'no error')
    redis.mset([
      'target:1',
      JSON.stringify(t.context.targets[0]),
      'target:2',
      JSON.stringify(t.context.targets[1])
    ], (err1, ok) => {
      t.falsy(err1, 'no error')
      t.end()
    })
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

testGet('/api/targets', function (t, res) {
  t.is(res.statusCode, 200)
  t.is(JSON.parse(res.body).length, 2)
})

testGet('/api/target/1', function (t, res) {
  t.is(res.statusCode, 200)
  t.like(JSON.parse(res.body), t.context.targets[0])
})

testPost('/api/targets', {
  id: 3,
  url: 'http://target3.com',
  value: '2',
  maxAcceptsPerDay: '3',
  accept: {
    geoState: {
      $in: ['et', 'ch']
    },
    hour: {
      $in: ['8', '9', '10']
    }
  }
}, (t, data) => {
  redis.keys('target:*', function (err, keys) {
    t.falsy(err, 'no error')
    t.is(keys.length, 3)
    t.end()
  })
})

testPost('/api/targets/1', {
  id: 1,
  url: 'http://target11.com',
  value: '11',
  maxAcceptsPerDay: '11',
  accept: {
    geoState: {
      $in: ['et', 'ch']
    },
    hour: {
      $in: ['8', '9', '10']
    }
  }
}, function (t, data) {
  redis.get('target:1', (err, result) => {
    t.falsy(err, 'no error')
    t.is(JSON.parse(result).value, '11')
    t.end()
  })
})

testPost('/route', {
  geoState: 'et',
  publisher: 'abc',
  timestamp: '2018-07-19T08:28:59'
}, function (t, data) {
  t.is(JSON.parse(data).url, 'http://target11.com')
  t.end()
}, 'test a route gets proper response on success')
