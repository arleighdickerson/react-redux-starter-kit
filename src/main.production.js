import React from "react";
import ReactDOM from "react-dom";
import createStore from "./store/createStore";
import AppContainer from "./containers/AppContainer";
import {browserHistory as history, match} from "react-router";

const initialState = global.__INITIAL_STATE__
const store = createStore(history, initialState)
const routes = require('./routes/index').default(store)

const MOUNT_NODE = document.getElementById('root')

// ========================================================
// Go!
// ========================================================
match({history, routes}, (error, redirectLocation, renderProps) => {
  ReactDOM.render(
    <AppContainer store={store} routes={routes} history={history} renderProps={renderProps}/>,
    MOUNT_NODE
  )
})
