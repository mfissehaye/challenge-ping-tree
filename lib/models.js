const redis = require('./redis')

const getTarget = (id) => {
  if (`${id}`.startsWith('target')) id = id.slice(7)
  return new Promise((resolve, reject) => {
    redis.get(`target:${id}`, (err, val) => {
      if (err) reject(err)
      if (val) {
        // check how many requests it has served today
        let today = new Date()
        today = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
        redis.get(`requests:${id}:${today}`, (err2, count) => {
          if (err2) reject(Error('Could not find the number of requests served'))
          resolve({ id: parseInt(id), ...JSON.parse(val), requestsServed: parseInt(count) || 0 })
        })
      } else reject(Error('Not found'))
    })
  })
}

const getTargets = () => {
  return new Promise((resolve, reject) => {
    redis.keys('target:*', (err, keys) => {
      if (err) return reject(err)
      if (keys && keys.length) {
        Promise.all(keys.map(getTarget)).then(resolve)
      } else resolve([])
    })
  })
}

const updateTarget = (target) => {
  return new Promise((resolve, reject) => {
    getTarget(target.id).then(record => {
      const updated = {
        ...record,
        ...target
      }

      redis.set(`target:${record.id}`, JSON.stringify(updated), (err, ok) => {
        if (err) reject(err)
        resolve(updated)
      })
    }).catch(ex => {
      reject(ex)
    })
  })
}

const createTarget = (target) => {
  return new Promise((resolve, reject) => {
    redis.get('meta:last_id', (err, lastId) => {
      if (err) reject(Error('Unable to get the last id'))
      const newLastId = lastId ? (parseInt(lastId) + 1) : 1
      redis.set(`target:${newLastId}`, JSON.stringify(target), (err2, reply) => {
        if (err2) reject(err2)
        redis.set('meta:last_id', `${newLastId}`, (err3) => {
          if (err3) reject(err3)
          resolve({ id: newLastId, ...target })
        })
      })
    })
  })
}

const incrementRequestsServedCount = (targetId, count) => {
  return new Promise((resolve, reject) => {
    let today = new Date()
    today = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    redis.set(`requests:${targetId}:${today}`, parseInt(count) + 1, (err, ok) => {
      if (err) reject(err)
      resolve(count + 1)
    })
  })
}

module.exports = {
  getTarget,
  getTargets,
  createTarget,
  updateTarget,
  incrementRequestsServedCount
}
