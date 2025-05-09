type TestSubject = {
  [Symbol.iterator]: string;
  [Symbol.asyncIterator]: string;
};

function isIterable(testSubject: TestSubject): boolean {
  return typeof testSubject[Symbol.iterator] === 'function';
}

function isAsyncIterable(testSubject: TestSubject) {
  return typeof testSubject[Symbol.asyncIterator] === 'function';
}

function isPromise(obj: any): obj is Promise<any> {
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

// Helper type for internal wrapped actions
type InternalWrappedActions<UserActionsObject extends { [s: string]: Function }, CurrentState> = {
  [K in keyof UserActionsObject]: UserActionsObject[K] extends (
    params: any, 
    ...args: infer Args 
  ) => any 
    ? (...args: Args) => Promise<{ state: CurrentState; aux: any | undefined }>
    : never; 
};

class Staction<State, ActionsInput extends { [s: string]: Function }> {
  private _initState: InitState = 'uninitialized';
  private _actions!: ActionsInput;
  
  private _wrappedActions: InternalWrappedActions<ActionsInput, State> = {} as any; 
  
  private _state: State = {} as State;
  private _stateSetCallback: Function = () => {};
  private _loggingEnabled: boolean = true;
  private _addStateToLogs: boolean = false;
  private _preMiddleware: StactionMiddleware[] = [];
  private _postMiddleware: StactionMiddleware[] = [];

  async init(
    actions: ActionsInput,
    initFunc: (actions: any) => Promise<State> | State,
    stateSetCallback: (state: State, actions: any) => void
  ) {
    if (this._initState !== 'uninitialized') {
      let errorMsg = '';
      switch (this._initState) {
        case 'initialized':
          errorMsg = 'Staction instance has already been initialized';
          break;
        case 'initializing':
          errorMsg = 'Staction instance is currently being initialized';
          break;
        case 'initerror':
        default:
          errorMsg =
            'An error has previously occured when trying to init this instance';
          break;
      }
      const err = new Error(errorMsg);
      console.error(err); 
      throw err; 
    }
    
    try {
      this._initState = 'initializing';
      this._stateSetCallback = stateSetCallback;
      
      this._wrappedActions = Object.entries(actions).reduce(
        (acc, [name, actionFunc]) => {
          (acc as any)[name as keyof ActionsInput] = (...args: any[]) => 
            this.actionWrapper(name, actionFunc, ...args);
          return acc;
        },
        {} as InternalWrappedActions<ActionsInput, State>
      );

      this._actions = actions;
      const initialStateCandidate = initFunc(this._wrappedActions as any);
      if (isPromise(initialStateCandidate)) {
        this._state = await initialStateCandidate;
      } else {
        this._state = initialStateCandidate;
      }

      this._initState = 'initialized';
    } catch (e) {
      this._initState = 'initerror';
      console.error(e);
      throw e;
    }
  }

  get actions(): InternalWrappedActions<ActionsInput, State> {
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

  async actionWrapper(
    name: string,
    func: Function, 
    ...args: any[]
  ): Promise<{ state: State; aux: any | undefined }> {
    if (this._loggingEnabled) {
      if (this._addStateToLogs) {
        console.log('action: ', name, this._state);
      } else {
        console.log('action: ', name);
      }
    }

    let auxData: any | undefined = undefined;

    const updateAuxData = (
      valueOrUpdater: any | ((currentValue: any | undefined) => any)
    ) => {
      if (typeof valueOrUpdater === 'function') {
        auxData = (valueOrUpdater as Function)(auxData);
      } else {
        auxData = valueOrUpdater;
      }
    };

    const params = {
      state: this.getState,
      actions: this._wrappedActions as any, 
      aux: updateAuxData,
      name: name,
    };

    try {
      await this.processMiddleware(this._preMiddleware, name, args);
      const newState = func(params, ...args);
      await this.handleActionReturnTypes(newState);
      await this.processMiddleware(this._postMiddleware, name, args);

      if (
        !isGeneratorFunction(newState) &&
        !isAsyncGeneratorFunction(newState)
      ) {
        this.callSetStateCallback(this._state);
      }

      return { state: this._state, aux: auxData };
    } catch (e) {
      throw e;
    }
  }

  handleActionReturnTypes = async (newState: any): Promise<void> => {
    try {
      if (isPromise(newState)) {
        this._state = await newState;
      } else if (isGeneratorFunction(newState)) {
        let result = newState.next();
        while (!result.done) {
          await this.handleActionReturnTypes(result.value);
          this.callSetStateCallback(this._state);
          result = newState.next();
        }
        if (result.value !== undefined) {
          await this.handleActionReturnTypes(result.value);
          this.callSetStateCallback(this._state);
        }
      } else if (isAsyncGeneratorFunction(newState)) {
        let result = await newState.next();
        while (!result.done) {
          await this.handleActionReturnTypes(result.value);
          this.callSetStateCallback(this._state);
          result = await newState.next();
        }
        if (result.value !== undefined) {
          await this.handleActionReturnTypes(result.value);
          this.callSetStateCallback(this._state);
        }
      } else {
        if (newState !== undefined) {
          this._state = newState;
        }
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

        const mReturnedValue = m.method(params);
        let mStateToProcess;

        if (
          mReturnedValue === undefined &&
           !isPromise(mReturnedValue) && 
           !isGeneratorFunction(mReturnedValue) &&
           !isAsyncGeneratorFunction(mReturnedValue)
        ) {
           mStateToProcess = params.state();
        } else {
            mStateToProcess = mReturnedValue;
        }

        await this.handleActionReturnTypes(mStateToProcess);
      }
    }
  };

  callSetStateCallback = (newState: State) => {
    this._state = newState;
    this._stateSetCallback(this._state, this._wrappedActions as any);
  };

  setMiddleware = (middleware: StactionMiddleware[]) => {
    const grouped = middleware.reduce<{
      pre: StactionMiddleware[];
      post: StactionMiddleware[];
    }>(
      (acc, mw) => {
        if (mw.type === 'pre') {
          acc.pre.push(mw);
        } else if (mw.type === 'post') {
          acc.post.push(mw);
        }
        return acc;
      },
      { pre: [], post: [] }
    );

    this._preMiddleware = grouped.pre;
    this._postMiddleware = grouped.post;
  };

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
