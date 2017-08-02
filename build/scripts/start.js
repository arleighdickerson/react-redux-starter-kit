require('babel-register')
require('babel-polyfill')

const config = require('../../project.config')
const IsomorphicTools = require('webpack-isomorphic-tools')
const logger = require('../lib/logger')

logger.info('Starting server...')

function run() {
  require('../../server/main').listen(3000, () => {
    logger.success('Server is running at http://localhost:3000')
  })
}

if (config.globals.__PROD__) {
  global.isomorphicTools = global.webpackIsomorphicTools = new IsomorphicTools(require('../../build/isomorphic.config'))
    .server(config.basePath, run)
} else {
  run()
}
