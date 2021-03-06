import { identity } from 'lodash';
import { asyncAction, createResetAction, syncAction } from './actions';
import { createReducer } from './reducer';
import { createSelectors } from './selectors';
import { createType } from '../helpers';
import {
  AsyncActionTypes,
  SyncActionTypes,
  CreateSelectorsTypes,
  TileParams,
  SyncTileParams,
  OverloadedAction,
  Tile
} from './types';

const prefix = 'Redux_Tiles_';

export interface Types {
  [key:string]: string
}

export interface ReducerAction {
  payload: { data: any }|undefined,
  error: string|Object|undefined|null
}

export function createTile(params: TileParams): Tile {
  const { type, fn, caching, initialState = {}, nesting, selectorFallback = null } = params;
  const identificator = createType({ type });
  const types: Types = {
    START: `${prefix}${identificator}_START`,
    SUCCESS: `${prefix}${identificator}_SUCCESS`,
    FAILURE: `${prefix}${identificator}_FAILURE`,
    RESET: `${prefix}${identificator}_RESET`
  };

  const selectorParams: CreateSelectorsTypes = {
    selectorFallback: {
      isPending: false,
      error: null,
      data: selectorFallback
    },
    moduleName: type,
    nesting
  };

  const selectors = createSelectors(selectorParams);
  
  const actionParams: AsyncActionTypes = {
    START: types.START,
    SUCCESS: types.SUCCESS,
    FAILURE: types.FAILURE,
    fn,
    type,
    caching,
    nesting,
    selectors
  };
  const action: OverloadedAction = asyncAction(actionParams);
  action.reset = createResetAction({ type: types.RESET });

  const reducer = createReducer(initialState, {
    [types.START]: {
      data: null,
      isPending: true,
      error: null
    },
    [types.ERROR]: (_storeState: any, storeAction: ReducerAction) => ({
      data: null,
      isPending: false,
      error: storeAction.error
    }),
    [types.SUCCESS]: (_storeState: any, storeAction: ReducerAction) => ({
      error: null,
      isPending: false,
      data: storeAction.payload && storeAction.payload.data
    }),
    [types.RESET]: initialState
  });

  return { action, reducer, selectors, moduleName: type, constants: types, reflect: params };
}

export function createSyncTile(params: SyncTileParams): Tile {
  const { type, nesting, fn = identity, initialState = {}, selectorFallback } = params;
  const identificator = createType({ type });
  const types = {
    TYPE: `${prefix}${identificator}type`,
    RESET: `${prefix}${identificator}reset`
  };

  const selectorParams: CreateSelectorsTypes = {
    selectorFallback,
    moduleName: type,
    nesting
  };
  const selectors = createSelectors(selectorParams);

  const action: OverloadedAction = syncAction({
    TYPE: types.TYPE,
    nesting,
    fn
  } as SyncActionTypes);

  const reducer = createReducer(initialState, {
    [types.TYPE]: (_storeState: any, storeAction: ReducerAction) =>
      storeAction.payload && storeAction.payload.data,
    [types.RESET]: initialState
  });
  
  action.reset = createResetAction({ type: types.RESET });

  return { action, selectors, reducer, moduleName: type, constants: types, reflect: params };
}