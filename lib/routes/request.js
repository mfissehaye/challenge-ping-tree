const { respond } = require('../utils')
const { getTargets, incrementRequestsServedCount } = require('../models')
const _get = require('lodash/get')
const _maxBy = require('lodash/maxBy')

const processRequest = function (req, res) {
  return respond(req, res, async (body) => {
    const { geoState, publisher, timestamp } = body
    // Validate input
    if (!geoState || !publisher || !timestamp) return 'Invalid request'

    const targets = await getTargets()

    // get the current hour of the request
    // I am assuming I don't have to worry about timezone differences
    const requestHour = 13 // (new Date()).getHours()

    // filter targets by request - according to below conditions
    // target should support geo state of the request
    // target shouldn't receive more than the max attempts it can accept
    // target should be active during the request hour
    const filteredTargets = targets.filter(t => {
      return _get(t, 'accept.geoState.$in', []).some(s => s === geoState) &&
                t.requestsServed < _get(t, 'maxAcceptsPerDay', 0) &&
                _get(t, 'accept.hour.$in', []).some(h => parseInt(h) === requestHour)
    })

    // Pick the target with the maximum value
    // and return the url
    const bestTarget = _maxBy(filteredTargets, 'value')
    console.log(bestTarget)
    if (bestTarget) {
      // Increment the number of requests served by target
      await incrementRequestsServedCount(bestTarget.id, bestTarget.requestsServed)
      return { url: bestTarget.url }
    }

    return { decision: 'reject' }
  })
}

module.exports = {
  processRequest
}
