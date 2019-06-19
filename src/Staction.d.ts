export = Staction;

type WrappedActions<State, Actions> = {
  [Action in keyof Actions]: Actions[Action] extends (params: any, ...args: infer Args) => infer R ? (...args: Args) => Promise<R> : never;
}

declare class Staction<State, Actions> {
  constructor();

  public actions: WrappedActions<State, Actions>;

  init(actions: Actions, initFunc: (actions: WrappedActions<State, Actions>) => State, stateSetCallback: (state: State) => void): void;
}