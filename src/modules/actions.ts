import { Dispatch } from 'redux';
import { createType } from '../helpers';
import { AsyncActionTypes, SyncActionTypes, PromiseObject } from './types';
import { DEFAULT_REDUCER } from './selectors';

function proccessMiddleware(args: any[]) {
  if (args.length === 2) {
    // likely it is redux-thunk
    return { dispatch: args[0], getState: args[1] };
  } else if (args.length === 1 && typeof args[0] === 'object') {
    // our own middleware
    return args[0];
  }
}

function shouldBeFetched({ getState, selectors, params }: any): boolean {
  const { isPending, data, error } = selectors.get(getState(), params);
  // intentionally to check on empty objects
  return error == null && data == null && isPending !== true;
}

function handleMiddleware(fn: Function) {
  return (fnParams: any, additionalParams: any) => (...args: any[]) =>
    fn(proccessMiddleware(args), fnParams, additionalParams);
}

export function asyncAction({
  START, SUCCESS, FAILURE, fn, type, caching, nesting, selectors
}: AsyncActionTypes) {
  return handleMiddleware((
    { dispatch, getState, promisesStorage = {}, ...middlewares }:
    { dispatch: Dispatch<any>, getState: () => any, promisesStorage: PromiseObject },
    params: any,
    { forceAsync }: { forceAsync?: boolean } = {}
  ) => {
    const path = nesting ? nesting(params) : null;

    const getIdentificator = createType({ type, path });
    const activePromise = promisesStorage[getIdentificator];

    if (activePromise) {
      return activePromise;
    }

    if (caching && !forceAsync) {
      const isFetchingNeeded = shouldBeFetched({ getState, selectors, params });

      if (!isFetchingNeeded) {
        return Promise.resolve();
      }
    }

    dispatch({
      type: START,
      payload: { path }
    });

    const promise = fn({ params, dispatch, getState, ...middlewares });
    promisesStorage[getIdentificator] = promise;

    return promise
      .then((data: any) => {
        dispatch({
          type: SUCCESS,
          payload: { path, data }
        });
        promisesStorage[getIdentificator] = undefined;
      })
      .catch((error: any) => {
        dispatch({
          error,
          type: FAILURE,
          payload: { path },
        });
        promisesStorage[getIdentificator] = undefined;
      });
  });
}

export function createResetAction({ type }: { type: string }) {
  return handleMiddleware(({ dispatch }: { dispatch: Dispatch<any> }) => dispatch({ type }));
}

export function syncAction({ TYPE, fn, nesting }: SyncActionTypes) {
  return handleMiddleware(({ dispatch, getState, ...middlewares }: any, params: any) => {
    const path = nesting ? nesting(params) : null;

    return dispatch({
      type: TYPE,
      payload: {
        path,
        data: fn({ params, dispatch, getState, ...middlewares })
      }
    });
  });
}