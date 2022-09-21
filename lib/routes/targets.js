const { respond } = require('../utils')
const { getTargets, createTarget, getTarget, updateTarget } = require('../models')

const create = function (req, res) {
    return respond(req, res, async (body) => {
        await createTarget(body)
        return body
    }, 201)
}

const get = function (req, res) {
    return respond(req, res, async () => {
        try {
            return await getTarget(req.params.id)
        } catch (ex) {
            return ex
        }
    })
}

const list = function (req, res) {
    return respond(req, res, async () => {
        const targets = await getTargets()
        return targets
    })
}

const update = function (req, res) {
    return respond(req, res, async (body) => {
        return await updateTarget({ id: req.params.id, ...body })
    }, 200)
}

module.exports = {
    create,
    get,
    list,
    update
}