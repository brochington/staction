import { describe, expect, test, beforeEach } from '@jest/globals';
import Staction from '../Staction';
import { ActionParams, WrappedActions } from '../Staction.d';

const noop = () => {};

var sleep = (time = 50) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

describe('Staction', () => {
  test("Is new'ed correctly", () => {
    const staction = new Staction();
    staction.disableLogging();
    expect(staction).toBeDefined();
  });

  test('Init and call basic action', async () => {
    type State = { count: number };
    type Actions = any;
    type Params = ActionParams<State, Actions>;

    var actions = {
      testAction: function ({ state, actions }: Params) {
        expect(state).toBeInstanceOf(Function);
        expect(state()).toMatchObject({ count: 1 });

        expect(actions).toHaveProperty('testAction');
        expect(actions.testAction).toBeInstanceOf(Function);

        return {
          count: state().count + 1,
        };
      },
    };

    const callback = function (appState: State) {
      expect(appState).toMatchObject({ count: 2 });
    };

    const staction = new Staction<State, Actions>();
    staction.disableLogging();

    expect(staction.initState).toEqual('uninitialized');

    staction.init(
      actions,
      () => {
        return { count: 1 };
      },
      callback
    );

    expect(staction.initState).toEqual('initialized');

    // @ts-ignore
    var result = staction.actions.testAction();

    expect(result).toBeInstanceOf(Promise);

    const newState = await result;

    expect(newState).toMatchObject({ count: 2 });
    expect(staction.state).toMatchObject({ count: 2 });
  });

  describe('actions', () => {
    test('async/await', (done) => {
      var actions = {
        testAction: async function () {
          await sleep();

          done();

          return {};
        },
      };

      const staction = new Staction<{}, typeof actions>();
      staction.disableLogging();

      staction.init(
        actions,
        () => {
          return {};
        },
        noop
      );
      // @ts-ignore
      staction.actions.testAction();
    });

    test('generator', async () => {
      type State = { count: number };
      type StateFunc = () => State;

      let setStateCount = 0;
      const actions = {
        testAction: function* ({ state }: Params) {
          yield { count: state().count + 1 };

          expect(state().count).toEqual(1);

          yield { count: state().count + 1 };

          expect(state().count).toEqual(2);
        },
      };

      type Actions = typeof actions;

      type Params = {
        state: StateFunc;
        actions: WrappedActions<Actions, Params>;
        name: string;
      };

      const staction = new Staction<State, typeof actions>();
      staction.disableLogging();

      staction.init(
        actions,
        () => {
          return { count: 0 };
        },
        () => {
          setStateCount += 1;
        }
      );

      // @ts-ignore
      const finalState = (await staction.actions.testAction()) as State;

      expect(finalState).toMatchObject({ count: 2 });
      expect(setStateCount).toEqual(2);
    });

    test('promise', async () => {
      type State = { count: number };
      type StateFunc = () => State;
      const actions = {
        testAction: function ({ state }: Params) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ count: state().count + 1 });
            }, 50);
          });
        },
      };

      type Actions = typeof actions;

      type Params = {
        state: StateFunc;
        actions: WrappedActions<Actions, Params>;
        name: string;
      };

      const staction = new Staction<State, Actions>();
      staction.disableLogging();

      staction.init(
        actions,
        () => {
          return { count: 0 };
        },
        noop
      );
      // @ts-ignore
      const finalState = (await staction.actions.testAction()) as State;

      expect(finalState).toMatchObject({ count: 1 });
    });

    test('generator and async/await', async () => {
      type State = { count: number };
      type StateFunc = () => State;

      const actions = {
        testAction: function* ({ state }: Params) {
          yield { count: state().count + 1 };
          expect(state().count).toEqual(1);

          yield (async function () {
            return { count: state().count + 1 };
          })();

          expect(state().count).toEqual(2);

          yield { count: state().count + 1 };
        },
      };

      type Actions = typeof actions;

      type Params = {
        state: StateFunc;
        actions: WrappedActions<Actions, Params>;
        name: string;
      };

      const staction = new Staction<State, Actions>();
      staction.disableLogging();

      staction.init(
        actions,
        () => {
          return { count: 0 };
        },
        noop
      );

      // @ts-ignore
      const finalState = (await staction.actions.testAction()) as State;

      expect(finalState.count).toEqual(3);
      expect(staction.state).toMatchObject({ count: 3 });
    });

    test('Only interates over generator functions, not state that is iterable', async () => {
      type State = number[];
      type StateFunc = () => State;
      var testIterable = [1, 2, 3];
      var actions = {
        testAction: function* ({ state }: Params) {
          yield state().map((v) => v + 2);

          expect(state()[0]).toEqual(3);
          expect(state()[1]).toEqual(4);
          expect(state()[2]).toEqual(5);

          yield state().map((v) => v + 2);
        },
      };

      type Actions = typeof actions;

      type Params = {
        state: StateFunc;
        actions: WrappedActions<Actions, Params>;
        name: string;
      };

      let localStaction = new Staction<typeof testIterable, typeof actions>();
      localStaction.disableLogging();

      localStaction.init(actions, () => testIterable, noop);

      // @ts-ignore
      const finalState =
        (await localStaction.actions.testAction()) as unknown as number[];

      expect(finalState[0]).toEqual(5);
      expect(finalState[1]).toEqual(6);
      expect(finalState[2]).toEqual(7);
    });

    test('async generator (asyncIterable)', async () => {
      type State = { count: number };
      type StateFunc = () => State;
      var actions = {
        testAction: async function* ({ state }: Params) {
          yield { count: state().count + 1 };

          expect(state().count).toEqual(1);

          const secondCount = await Promise.resolve({
            count: state().count + 1,
          });

          yield secondCount;

          expect(state().count).toEqual(2);

          yield Promise.resolve({ count: state().count + 1 });
        },
      };

      type Actions = typeof actions;

      type Params = {
        state: StateFunc;
        actions: WrappedActions<Actions, Params>;
        name: string;
      };

      const staction = new Staction<State, Actions>();
      staction.disableLogging();

      staction.init(actions, () => ({ count: 0 }), noop);

      // @ts-ignore
      const result = (await staction.actions.testAction()) as unknown as State;

      expect(result.count).toEqual(3);
    });
  });
});
