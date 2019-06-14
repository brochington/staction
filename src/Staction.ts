import reduce from 'lodash/reduce';

var noop: Function = (): void => {};

type WrappedActions = {
    [key: string]: Function
}

class Staction<State, Actions> {
  private _hasBeenInitialized: boolean;
  private _actions: Actions;
  private _wrappedActions: WrappedActions;
  private _wrappedPrivateActions: object;
  private _privateActions: object;
  private _state: State;
  private _stateSetCallback: Function;
  private _loggingEnabled: boolean = true;
  private _addStateToLogs: boolean = false;

  init(
    actions: Actions,
    initFunc: (actions: object) => any,
    stateSetCallback: (state: State, actions: Actions) => void
  ) {
    try {
      if (!this._hasBeenInitialized) {
        this._hasBeenInitialized = true;

        /* wrap actions */
        this._wrappedActions = reduce(actions, this.wrapActions, {});

        /* Keep reference to actions */
        this._actions = actions;

        /* Set initial state from init function */
        this._state = initFunc(this._wrappedActions);

        /* set state callback, most likely a setState React method */
        this._stateSetCallback = stateSetCallback;
      } else {
        throw new Error('StateManager has already been initialized');
      }
    } catch (e) {
      console.error(e);
    }
  }

  get actions(): WrappedActions {
    return this._wrappedActions;
  }

  get state(): State {
    return this._state;
  }

  getState = (): State => {
    return this._state;
  }

  /* wraps actions with... the actionWrapper */
  wrapActions = (acc: Object, val: any, name: string) => {
    if (typeof val === 'function') {
      acc[name] = (...args) => this.actionWrapper(name, val, ...args);
    }
    return acc;
  };

  /* injects state and actions as args into actions that are called. */
  actionWrapper(name: string, func: Function, ...args: any[]): Promise<any> {
    // call the action function with correct args.
    if (this._loggingEnabled) {
      if (this._addStateToLogs) {
        console.log('action: ', name, this._state);
      } else {
        console.log('action: ', name);
      }
    }

    const params = {
        state: this.getState,
        actions: this._wrappedActions
    }

    const newState = func(params, ...args);

    // TODO: Add message to warn against undefined newState.

    return new Promise((resolve, reject) => {
      this.handleActionReturnTypes(newState, resolve, reject);
    });
  }

  /* handles standard values, promises (from async functions) and generator function return values */
  handleActionReturnTypes = async (
    newState: any,
    isComplete: Function = noop,
    reject: Function
  ) => {
    if (typeof newState.then === 'function') {
      try {
        const n = await newState;
        this.callSetStateCallback(n);
        isComplete(n);
      } catch (e) {
        reject(e);
      }
    }

    // Detect if newState is actually a generator function.
    else if (typeof newState.next === 'function') {
      this.generatorHandler(newState, isComplete, reject);
    } else {
      this.callSetStateCallback(newState);
      isComplete(newState);
    }
  };

  /* A recursive function to handle the output of generator functions. */
  generatorHandler = async (
    genObject: Generator,
    whenComplete: Function = noop,
    reject: Function
  ) => {
    const { value, done } = genObject.next();

    if (done) {
      whenComplete(this._state);
      return;
    }

    if (value) {
      if (typeof value.then === 'function') {
        try {
          await value;
        } catch (e) {
          reject(e);
        }
      }

      await this.handleActionReturnTypes(value, noop, reject);
    }

    this.generatorHandler(genObject, whenComplete, reject);
  };

  /* Calls the setState callback */
  callSetStateCallback = (newState: State) => {
    // call the callback specified in the init method.
    // NOTE: can do a check to see if state has been changed.
    this._state = newState;
    this._stateSetCallback(this._state, this._wrappedActions);
  };

  /* Debugging assist methods */
  enableLogging = () => {
    this._loggingEnabled = true;
    return `Staction logging is enabled`;
  };

  disableLogging = () => {
    this._loggingEnabled = false;
    return `Staction logging is disabled`;
  };

  disableStateWhenLogging = () => {
    this._addStateToLogs = false;
  };

  enableStateWhenLogging = () => {
    this._addStateToLogs = true;
  };
}

export default Staction;
