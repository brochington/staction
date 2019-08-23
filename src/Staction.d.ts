export = Staction;

type WrappedActions<State, Actions> = {
  [Action in keyof Actions]: Actions[Action] extends (params: any, ...args: infer Args) => infer R ? (...args: Args) => Promise<R> : never;
}

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
  }

  export interface StactionMiddlewareParams<State, Meta = object> {
    state: () => State;
    name: string;
    args: any[];
    meta: Meta
  }

  export type WrappedActions<State, Actions> = {
    [Action in keyof Actions]: Actions[Action] extends (params: any, ...args: infer Args) => infer R ? (...args: Args) => Promise<R> : never;
  }
}