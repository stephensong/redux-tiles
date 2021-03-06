import { get, forEachRight, mapValues, isFunction } from 'lodash';
import { Action } from 'redux';

/**
 * @overview create reducer function from the object
 * @param  {Any} initialState – initial state of this part of the store
 * @param  {Object} handlers – object with keys as action types, and
 * reduce functions to change store as values
 * @return {Function} – function to act as a reducer
 */
export function createReducerFromObject(initialState: any, handlers: { [key:string]: Function|Object }) {
  return function reducer(state = initialState, action: any) {
    const handler = handlers[action.type];

    return typeof handler === 'function' ? handler(state, action) : state;
  };
}

/**
 * @overview create reducer from the object, with creating reducing functions
 * @param  {Any} initialState – initial state of this part of the store
 * @param  {Object} handlers – object with keys as action types, and
 * newValues to set at store as values
 * @return {Function} – function to act as a reducer
 */
export function createReducer(initialState: any, handlers: { [key:string]: Function|Object }) {
  return createReducerFromObject(
    initialState,
    mapValues(handlers, (value: any) => (state: any, action: Action) => reducerCreator({
      state,
      action,
      newValue: isFunction(value) ? value(state, action) : value
    }))
  );
}

/**
 * @overview reducer function, which changes the state with new values
 * @param  {Object} action – reducer action object, with type and payload
 * @param  {Object} state – previous redux state in this branch
 * @param  {Any} newValue – new value to set up in state in corresponding path
 * @return {Object} – changed reducer
 */
export function reducerCreator({ action, state, newValue }: any) {
  const { path } = action.payload;

  const hasNoNestInStore = !path;
  if (hasNoNestInStore) {
    return newValue;
  }

  let result = {};
  let lookupPath;

  // index stays as it was in original array, so the first
  // element in the iteration has `i` of the last element!
  forEachRight(path, (el: string, i: number) => {
    const isLastItem = i === path.length - 1;
    const newNestedResult = {
      [el]: isLastItem ? newValue : result
    };
    lookupPath = path.slice(0, i);
    const oldState = get(state, lookupPath) || {};
    result = {
      ...oldState,
      ...newNestedResult
    };
  });

  return {
    ...state,
    ...result
  };
}
