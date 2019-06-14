export = Staction;

declare class Staction<State, Actions> {
  constructor();

  public actions: any;

  init(actions: Actions, initFunc: (actions: Actions) => any, stateSetCallback: (state: State) => void): void;
}