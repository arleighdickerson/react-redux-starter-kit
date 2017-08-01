import {reducer as formReducer} from 'redux-form'
import {combineReducers} from 'redux'
import {routeReducer} from "redux-simple-router";

export const makeRootReducer = (asyncReducers) => {
  return combineReducers({
    form: formReducer,
    routing: routeReducer,
    ...asyncReducers
  })
}

export const injectReducer = (store, {key, reducer}) => {
  store.asyncReducers[key] = reducer
  store.replaceReducer(makeRootReducer(store.asyncReducers))
}

export default makeRootReducer
