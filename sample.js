const createLogstash = require('./src')

// required
const host = process.env.LOGSTASH_HOST
const port = process.env.LOGSTASH_PORT

// optional
const tags = ['production', 'api']
const level = 'info'

// Create logger instance
const logger = createLogstash(host, port, tags, level)

logger.info("testMessage",{test:"test"})
