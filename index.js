const { BadRequest } = require('http-errors')
const fp = require('fastify-plugin')

function parseQuery(query, fastify) {
	if (typeof query == 'string') {
		query = JSON.parse(query)
	}

	Object.keys(query)
		.forEach(k => {
			if (k == 'include' && typeof query[k] != 'string') {
				if (Array.isArray(query[k])) {
					query[k].map(e => parseInclude(e, fastify))
				} else {
					query[k] = parseInclude(query[k], fastify)
				}
			}
        })
    
	return typeof query != 'string' ? JSON.stringify(query) : query
}

function parseInclude(include, fastify) {
	Object.keys(include)
		.forEach(k => {
			if (k == 'model') {
				let model = fastify.sequelize.models[include[k]]
				if (!!model) {
					include[k] = model
				} else {
					const models = Object.keys(fastify.sequelize.models)
					const meant = models.find(m => m.toLowerCase() == include[k].toLowerCase())
					throw new Error(`Model '${include[k]}' does not exist. ${meant ? `Did you mean '${meant}'?` : ''}`)
				}
			} else if (k == 'include' && typeof include[k] != 'string') {
				if (Array.isArray(include[k])) {
					include[k].forEach(e => parseInclude(e, fastify))
				} else {
					include[k] = parseInclude(include[k], fastify)
				}
			}
		})
	return include
}


module.exports = fp(function (fastify, opts, next) {
	fastify.addHook('onRequest', function (request, reply, next) {
		if (request.query.q) {
			try {
				request.query.q = parseQuery(request.query.q, fastify)
			} catch (e) {
				const err = new BadRequest(e)
				return reply.code(err.statusCode).send(err)
			}
		}
		return next()
	})
	return next()
})