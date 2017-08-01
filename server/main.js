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
const compiler = webpack(webpackConfig)

logger.info('Enabling webpack development and HMR middleware')
if (project.env === 'development') {
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
}

// Serve static assets from ~/public since Webpack is unaware of
// these files. This middleware doesn't need to be enabled outside
// of development since this directory will be copied into ~/dist
// when the application is compiled.
app.get('/', renderView)

if (__PROD__) {
  app.use(express.static(path.resolve(project.basePath, project.outDir)))
} else {
  app.use(express.static(path.resolve(project.basePath, 'public')))
}

// This rewrites all routes requests to the root /index.html file
// (ignoring file requests). If you want to implement universal
// rendering, you'll want to remove this middleware.

app.use('*', renderView)

function renderView(req, res, next) {
  const fs = require('fs')
  const filesystem = __DEV__ ? compiler.outputFileSystem : fs
  const filename = (__DEV__ ? path.join(filesystem, 'index.html') : path.join(project.outDir, 'index.html'))
  fs.readFile(filename, (err, result) => {
    if (err) {
      next(err)
      return
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
      res.set('content-type', 'text/html')
      res.send(
        template({
          initialState: JSON.stringify(initialState),
          component
        })
      )
    }

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
}

// Serving ~/dist by default. Ideally these files should be served by
// the web server and not the app server, but this helps to demo the
// server in production.
module.exports = app
