# Staction
A straightforward method of managing state, with support for Promises, Generators, and Async/Await.

Because sometimes all you really need is state and actions.

[![Build Status](https://travis-ci.org/brochington/staction.svg?branch=master)](https://travis-ci.org/brochington/staction)

Basic usage:

```
import Staction from 'staction';

let staction = new Staction();

/*
   Actions should always yield/return the full new state, or a Promise that resolves to the new state.
   They can be regular, async, or generator functions, and async call order will be maintained!
   The state argument is a function that will always return the current state.
   additional arguments passed when the action is invoked are passed after state and actions.
*/

let actions = {
  increment: (state, actions, incrementAmount = 1) => {
    return {
      count: state().count + incrementAmount
    };
  }
}

let initialState = (actions) => {
  return {count: 0};
};

/*
   This method is called every time after state is updated.
   Useful for calling setState at the top of a React component tree.
*/

let onStateUpdate = (state, actions) => console.log(`count is ${state}`)

staction.init(
  actions,
  initialState,
  onStateUpdate
)

let incrementAmount = 5

staction.actions.increment(incrementAmount).then(newState => {
  /*
     all actions return a promise, that resolves with the updated state.
     This helps eliminate passing callbacks through
  */

  console.log(newState);
})


console.log(staction.state) // state is {count: 5}
```
