export type InitState = 'uninitialized' | 'initializing' | 'initialized' | 'initerror';

// Rename PassedValueUpdater to AuxValueUpdater and PData to AuxData
export type AuxValueUpdater<AuxData> = (
  valueOrUpdater: AuxData | ((currentValue: AuxData | undefined) => AuxData)
) => void;

// Old PassedUpdater for Map - to be removed
// export type PassedUpdater<PMap> = (
//   updater: PMap | ((currentMap: PMap) => PMap)
// ) => void;

// PMap is the PassedMapType specific to THIS action.
export interface ActionParams<
  CurrentState,
  // AllUserActions is the type of the original user-defined actions object, e.g. typeof myActions
  // It needs to conform to the structure expected by StactionActions for inference.
  AllUserActions extends UserActions<CurrentState, AllUserActions>,
  AuxData = any // Renamed PData to AuxData
> {
  state: () => CurrentState;
  actions: StactionActions<CurrentState, AllUserActions>; // The fully typed staction.actions object
  aux: AuxValueUpdater<AuxData>; // Renamed passed to aux
  name: string;
}

// Defines the type of the `staction.actions` object and actions passed into initFunc/setStateCallbacks
export type StactionActions<
  CurrentState,
  UserActionsObject extends UserActions<CurrentState, UserActionsObject> // Constrain UserActionsObject here
> = {
  [K in keyof UserActionsObject]: UserActionsObject[K] extends (
    params: ActionParams<CurrentState, UserActionsObject, infer AuxData_K>, // Infer AuxData_K
    ...args: infer Args_K
  ) => any
    ? (...args: Args_K) => Promise<{ state: CurrentState; aux: AuxData_K | undefined }> // Renamed passed to aux
    : never;
};

// Describes the type for the 'actions' object that the user provides to staction.init()
// Self is the type of the actions object itself, e.g., `typeof myActions`
export type UserActions<CurrentState, Self extends UserActions<CurrentState, Self>> = {
  [K in keyof Self]: (
    // Self, due to the new constraint, now satisfies the requirement for ActionParams' AllUserActions generic
    params: ActionParams<CurrentState, Self, any>, // ActionParams now uses AuxData
    ...args: any[]
  ) => any;
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

// Update Staction class declaration
declare class Staction<
  State,
  // ActionsInput is the type of the raw actions object passed to init()
  // e.g., const myActions: UserActions<MyState, typeof myActions> = { ... }
  ActionsInput extends UserActions<State, ActionsInput>
> {
  constructor();

  // staction.actions will be of type StactionActions<State, ActionsInput>
  public actions: StactionActions<State, ActionsInput>;

  public state: State;

  getState(): State;

  enableLogging(): void;
  disableLogging(): void;

  enableStateWhenLogging(): void;
  disableStateWhenLogging(): void;

  setMiddleware(middleware: StactionMiddleware[]): void;

  init(
    actions: ActionsInput,
    // initFunc and stateSetCallback should expect fully typed StactionActions
    initFunc: (actions: StactionActions<State, ActionsInput>) => Promise<State> | State,
    stateSetCallback: (state: State, actions: StactionActions<State, ActionsInput>) => void
  ): Promise<void>;

  get initialized(): boolean;

  get initState(): InitState;
}

export default Staction;