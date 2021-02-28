export = Staction;

type InitState = 'uninitialized' | 'initializing' | 'initialized' | 'initerror';

type WrappedParamAction<Actions> = {
  [Action in keyof Actions]: Actions[Action] extends (
    params: any,
    ...args: infer Args
  ) => infer R
    ? (...args: Args) => Promise<R>
    : never;
};

interface ActionParams<State, Actions> {
  state: () => State;
  actions: WrappedParamAction<Actions>;
  name: string;
}

type WrappedActions<State, Actions> = {
  [Action in keyof Actions]: Actions[Action] extends (
    params: ActionParams<State, Actions>,
    ...args: infer Args
  ) => infer R
    ? (...args: Args) => Promise<R>
    : never;
};

interface StactionMiddleware {
  type: 'pre' | 'post';
  method: Function;
  meta: object;
}

declare class Staction<State, Actions> {
  constructor();

  public actions: WrappedActions<State, Actions>;

  public state: State;

  getState(): State;

  enableLogging(): void;
  disableLogging(): void;

  enableStateWhenLogging(): void;
  disableStateWhenLogging(): void;

  setMiddleware(middleware: StactionMiddleware[]): void;

  init(actions: Actions, initFunc: (actions: WrappedActions<State, Actions>) => State, stateSetCallback: (state: State) => void): void;

  get initialized(): boolean;

  get initState(): InitState;
}

declare namespace Staction {
  export interface StactionMiddleware {
    type: 'pre' | 'post';
    method: Function;
    meta: object;
  }

  export interface StactionActionParams<State, Actions> {
    state: () => State;
    actions: Actions;
    name: string;
  }

  export interface StactionMiddlewareParams<State, Meta = object> {
    state: () => State;
    name: string;
    args: any[];
    meta: Meta
  }

  export type InitState = 'uninitialized' | 'initializing' | 'initialized' | 'initerror';

  export type WrappedParamAction<Actions> = {
    [Action in keyof Actions]: Actions[Action] extends (
      params: any,
      ...args: infer Args
    ) => infer R
      ? (...args: Args) => Promise<R>
      : never;
  };
  
  export interface ActionParams<State, Actions> {
    state: () => State;
    actions: WrappedParamAction<Actions>;
    name: string;
  }
  
  export type WrappedActions<State, Actions> = {
    [Action in keyof Actions]: Actions[Action] extends (
      params: ActionParams<State, Actions>,
      ...args: infer Args
    ) => infer R
      ? (...args: Args) => Promise<R>
      : never;
  };
}