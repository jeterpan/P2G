//const coligadas = require('../db_api/coligadas.js')

const web_server = require('../services/web_server.js')

async function post(req, res, next) {

    try {

        const context = {}

        context.event = req.params.event
        context.player = req.params.player
        context.scope = req.params.scope

        web_server.notify(context)

        res.status(200).end({'success': true})

    } catch (err) {

        // Todo: review this point, since res will finish the procedure, the next funcion won't be called
        res.status(400).end({'success': false})

        next(err)
    }
}

module.exports.post = post