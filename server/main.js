const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ReactRouter = require('react-router')
const express = require('express')
const path = require('path')
const webpack = require('webpack')
const compress = require('compression')
const _ = require('lodash')

const webpackConfig = require('../build/webpack.config')
const logger = require('../build/lib/logger')
const project = require('../project.config')
Object.assign(global, project.globals)

const app = express()
app.use(compress())

// ------------------------------------
// Apply Webpack HMR Middleware
// ------------------------------------
if (project.env === 'development') {
  const compiler = webpack(webpackConfig)

  logger.info('Enabling webpack development and HMR middleware')
  app.use(require('webpack-dev-middleware')(compiler, {
    publicPath: webpackConfig.output.publicPath,
    contentBase: path.resolve(project.basePath, project.srcDir),
    hot: true,
    quiet: false,
    noInfo: false,
    lazy: false,
    stats: 'normal',
  }))
  app.use(require('webpack-hot-middleware')(compiler, {
    path: '/__webpack_hmr'
  }))

  // Serve static assets from ~/public since Webpack is unaware of
  // these files. This middleware doesn't need to be enabled outside
  // of development since this directory will be copied into ~/dist
  // when the application is compiled.
  app.use(express.static(path.resolve(project.basePath, 'public')))

  // This rewrites all routes requests to the root /index.html file
  // (ignoring file requests). If you want to implement universal
  // rendering, you'll want to remove this middleware.
  app.use('*', function (req, res, next) {
    const filename = path.join(compiler.outputPath, 'index.html')
    compiler.outputFileSystem.readFile(filename, (err, result) => {
      if (err) {
        return next(err)
      }

      const initialState = {
        routing: {
          location: {
            pathname: req.originalUrl
          }
        }
      }

      function render(component = '') {
        const options = {interpolate: /{{([\s\S]+?)}}/g}
        const template = _.template(result, options)
        res.send(
          template({
            initialState: JSON.stringify(initialState),
            component
          })
        )
      }

      res.set('content-type', 'text/html')
      if (__DEV__) {
        render()
      } else {
        const AppContainer = require('../src/containers/AppContainer').default
        const createStore = require('../src/store/createStore').default
        const createRoutes = require('../src/routes/index').default

        const history = ReactRouter.createMemoryHistory(initialState.routing.location.pathname)
        const store = createStore(history, initialState)
        const routes = createRoutes(store)
        const component = ReactDOMServer.renderToString(
          React.createElement(AppContainer, {store, routes, history})
        )
        render(component)
      }
      res.end()
    })
  })
} else {
  logger.warn(
    'Server is being run outside of live development mode, meaning it will ' +
    'only serve the compiled application bundle in ~/dist. Generally you ' +
    'do not need an application server for this and can instead use a web ' +
    'server such as nginx to serve your static files. See the "deployment" ' +
    'section in the README for more information on deployment strategies.'
  )

  // Serving ~/dist by default. Ideally these files should be served by
  // the web server and not the app server, but this helps to demo the
  // server in production.
  app.use(express.static(path.resolve(project.basePath, project.outDir)))
}
module.exports = app
