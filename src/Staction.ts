import reduce from 'lodash/reduce';
import groupBy from 'lodash/groupBy';

var noop: Function = (): void => {};

type WrappedActions<Actions> = {
  [Action in keyof Actions]: Actions[Action] extends (params: any, ...args: infer Args) => infer R ? (...args: Args) => Promise<R> : never;
}

interface StactionMiddleware {
  type: 'pre' | 'post';
  method: Function;
  meta: object;
}

interface StactionMiddlewareParams<State, Meta = object> {
  state: () => State;
  name: string;
  args: any[];
  meta: Meta
}

class Staction<State, Actions> {
  private _hasBeenInitialized: boolean;
  private _actions: Actions;
  private _wrappedActions: WrappedActions<Actions>;
  private _wrappedPrivateActions: object;
  private _privateActions: object;
  private _state: State;
  private _stateSetCallback: Function;
  private _loggingEnabled: boolean = true;
  private _addStateToLogs: boolean = false;
  private _preMiddleware: [];
  private _postMiddleware: [];

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

  get actions(): WrappedActions<Actions> {
    return this._wrappedActions;
  }

  get state(): State {
    return this._state;
  }

  getState = (): State => {
    return this._state;
  }

  /* wraps actions with... the actionWrapper */
  wrapActions = (acc: Object, actionFunc: Function, name: string) => {
    acc[name] = (...args) => this.actionWrapper(name, actionFunc, ...args);
    return acc;
  };

  /* injects state and actions as args into actions that are called. */
  async actionWrapper(name: string, func: Function, ...args: any[]): Promise<State> {
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

    try {
      await this.processMiddleware(this._preMiddleware, name, args);

      const newState = func(params, ...args);

      await this.handleActionReturnTypes(newState);

      await this.processMiddleware(this._postMiddleware, name, args);

      this.callSetStateCallback(this._state);

      return this._state;
    } catch (e) {
      throw e;
    }
  }

  /* handles standard values, promises (from async functions) and generator function return values */
  handleActionReturnTypes = async (
    newState: any,
  ): Promise<void> => {
    try {
      if (typeof newState.then === 'function') {
        this._state = await newState;
      }
  
      // Detect if newState is actually a generator function.
      else if (typeof newState.next === 'function') {
        for (const g of newState) {
          await this.handleActionReturnTypes(g);
        }
      } 
      
      else {
        this._state = newState;
      }
    } catch (e) {
      throw e;
    }
  };

  processMiddleware = async (middleware: StactionMiddleware[], name: string, args: any[]): Promise<void> => {
    for (const m of middleware) {
      if (typeof m.method === 'function') {
        const params: StactionMiddlewareParams<State> = {
          state: this.getState,
          name,
          args,
          meta: m.meta
        }

        const mState = m.method(params);

        await this.handleActionReturnTypes(mState);
      }
    }
  }

  /* Calls the setState callback */
  callSetStateCallback = (newState: State) => {
    // call the callback specified in the init method.
    // NOTE: can do a check to see if state has been changed.
    this._state = newState;
    this._stateSetCallback(this._state, this._wrappedActions);
  };

  setMiddleware = (middleware: StactionMiddleware[]) => {
    const { pre, post } = groupBy(middleware, 'type');

    this._preMiddleware = pre || [];
    this._postMiddleware = post || [];
  }

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
