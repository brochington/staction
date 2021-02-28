import reduce from 'lodash/reduce';
import groupBy from 'lodash/groupBy';

function isIterable(testSubject: object): boolean {
  return typeof testSubject[Symbol.iterator] === 'function';
}

function isAsyncIterable(testSubject: object) {
  return typeof testSubject[Symbol.asyncIterator] === 'function';
}

function isPromise(obj: any): boolean {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function'
  );
}

function isGeneratorFunction(testSub: any): boolean {
  return testSub && typeof testSub.next === 'function' && isIterable(testSub);
}

function isAsyncGeneratorFunction(testSub: any): boolean {
  return (
    testSub && typeof testSub.next === 'function' && isAsyncIterable(testSub)
  );
}

const GeneratorFunction = function* () {}.constructor;
const AsyncFunction = async function () {}.constructor;

type WrappedActions<Actions> = {
  [Action in keyof Actions]: Actions[Action] extends (
    params: any,
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

interface StactionMiddlewareParams<State, Meta = object> {
  state: () => State;
  name: string;
  args: any[];
  meta: Meta;
}

type InitState = 'uninitialized' | 'initializing' | 'initialized' | 'initerror';

class Staction<State, Actions> {
  private _initState: InitState = 'uninitialized';
  private _actions: Actions; // used to keep reference of actions, so they aren't gc'ed.
  private _wrappedActions: WrappedActions<Actions>;
  private _state: State;
  private _stateSetCallback: Function;
  private _loggingEnabled: boolean = true;
  private _addStateToLogs: boolean = false;
  private _preMiddleware: StactionMiddleware[] = [];
  private _postMiddleware: StactionMiddleware[] = [];

  init(
    actions: Actions,
    initFunc: (actions: object) => any,
    stateSetCallback: (state: State, actions: Actions) => void
  ) {
    try {
      if (this._initState === 'uninitialized') {
        this._initState = 'initializing';

        /* wrap actions */
        this._wrappedActions = reduce(actions, this.wrapActions, {});

        /* Keep reference to actions */
        this._actions = actions;

        /* Set initial state from init function */
        this._state = initFunc(this._wrappedActions);

        /* set state callback, most likely a setState React method */
        this._stateSetCallback = stateSetCallback;

        this._initState = 'initialized';
      } else {
        let errorMsg = '';
        switch (this._initState) {
          case 'initialized':
            errorMsg = 'Staction instance has already been initialized';
          case 'initializing':
            errorMsg = 'Staction instance is currently being initialized';
          case 'initerror':
          default:
            errorMsg =
              'An error has previously occured when trying to init this instance';
        }

        throw new Error(errorMsg);
      }
    } catch (e) {
      this._initState = 'initerror';
      console.error(e);
    }
  }

  get actions(): WrappedActions<Actions> {
    return this._wrappedActions;
  }

  get state(): State {
    return this._state;
  }

  get initialized(): boolean {
    return this._initState === 'initialized';
  }

  get initState(): InitState {
    return this._initState;
  }

  getState = (): State => {
    return this._state;
  };

  /* wraps actions with... the actionWrapper */
  wrapActions = (acc: Object, actionFunc: Function, name: string) => {
    acc[name] = (...args) => this.actionWrapper(name, actionFunc, ...args);
    return acc;
  };

  /* injects state and actions as args into actions that are called. */
  async actionWrapper(
    name: string,
    func: Function,
    ...args: any[]
  ): Promise<State> {
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
      actions: this._wrappedActions,
      name: name,
    };

    try {
      await this.processMiddleware(this._preMiddleware, name, args);

      const newState = func(params, ...args);

      await this.handleActionReturnTypes(newState);

      await this.processMiddleware(this._postMiddleware, name, args);

      if (typeof newState.next !== 'function') {
        // setState callback is called whenever a generator function yields.
        this.callSetStateCallback(this._state);
      }

      return this._state;
    } catch (e) {
      throw e;
    }
  }

  /* handles standard values, promises (from async functions) and generator function return values */
  handleActionReturnTypes = async (newState: any): Promise<void> => {
    try {
      if (isPromise(newState)) {
        this._state = await newState;
      } else if (isGeneratorFunction(newState)) {
        for (const g of newState) {
          await this.handleActionReturnTypes(g);

          this.callSetStateCallback(this._state);
        }
      } else if (isAsyncGeneratorFunction(newState)) {
        for await (const g of newState) {
          await this.handleActionReturnTypes(g);

          this.callSetStateCallback(this._state);
        }
      } else {
        this._state = newState;
      }
    } catch (e) {
      throw e;
    }
  };

  processMiddleware = async (
    middleware: StactionMiddleware[],
    name: string,
    args: any[]
  ): Promise<void> => {
    for (const m of middleware) {
      if (typeof m.method === 'function') {
        const params: StactionMiddlewareParams<State> = {
          state: this.getState,
          name,
          args,
          meta: m.meta,
        };

        const mState = m.method(params);

        await this.handleActionReturnTypes(mState);
      }
    }
  };

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
