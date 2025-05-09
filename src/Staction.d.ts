export type InitState = 'uninitialized' | 'initializing' | 'initialized' | 'initerror';

export type WrappedParamAction<Actions> = {
  [Action in keyof Actions]: Actions[Action] extends (
    params: any,
    ...args: infer Args
  ) => infer R
    ? (...args: Args) => Promise<R>
    : never;
};

export interface ActionParams<State, Actions extends object, PassedMapType = Map<any, any>> {
  state: () => State;
  actions: WrappedActions<State, Actions, PassedMapType>;
  passed: (
    updater: PassedMapType | ((currentMap: PassedMapType) => PassedMapType)
  ) => void;
  name: string;
}

// Helper type to perform the actual wrapping of an action function
type WrapAction<
  State,
  ActionsObject extends object, // The full object/map of all actions
  PassedMapType,
  F // The specific action function type from ActionsObject[K]
> = F extends (
  // Check if F matches the expected signature for an action
  params: ActionParams<State, ActionsObject, PassedMapType>,
  ...args: infer Args // Capture the ...rest arguments of the original action
) => any // Original return type (can be anything)
  // If it matches, the wrapped action has this signature:
  ? (...args: Args) => Promise<{ state: State; passed: PassedMapType }>
  // If F doesn't match the expected signature, it becomes 'never'
  : never;

// Main WrappedActions type (simplified for non-optional actions)
export type WrappedActions<
  State,
  ActionsObject extends object, // Your map of action names to action functions
  PassedMapType = Map<any, any>
> = {
  // For each key K in ActionsObject
  [K in keyof ActionsObject]: WrapAction< // Apply the WrapAction helper
    State,
    ActionsObject,
    PassedMapType,
    ActionsObject[K] // Pass the specific action function ActionsObject[K] as F
  >;
};

interface StactionMiddleware {
  type: 'pre' | 'post';
  method: Function;
  meta: object;
}

export interface StactionMiddlewareParams<State, Meta = object> {
  state: () => State;
  name: string;
  args: any[];
  meta: Meta
}

declare class Staction<State, Actions extends object, PassedMapType = Map<any, any>> {
  constructor();

  public actions: WrappedActions<State, Actions, PassedMapType>;

  public state: State;

  getState(): State;

  enableLogging(): void;
  disableLogging(): void;

  enableStateWhenLogging(): void;
  disableStateWhenLogging(): void;

  setMiddleware(middleware: StactionMiddleware[]): void;

  init(actions: Actions, initFunc: (actions: WrappedActions<State, Actions, PassedMapType>) => Promise<State> | State, stateSetCallback: (state: State, actions: WrappedActions<State, Actions, PassedMapType>) => void): Promise<void>;

  get initialized(): boolean;

  get initState(): InitState;
}

export default Staction;