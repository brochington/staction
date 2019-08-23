import Staction from '../Staction'

var staction = new Staction()
var noop = () => {}

var sleep = (time = 50) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

describe("Staction", function() {
  beforeEach(function() {
     staction = new Staction()
     staction.disableLogging();
  })

  it("Is new'ed correctly", function() {
    expect(staction).to.be.exist
    expect(staction)
  })

  it("Init and call basic action", function(done) {
    var actions = {
      testAction: function({ state, actions }) {
        expect(state).to.be.an.instanceof(Function)
        expect(state()).to.eql({count: 1})

        expect(actions).to.have.property('testAction')
        expect(actions.testAction).to.be.an.instanceof(Function)

        return {
          count: state().count + 1
        };
      }
    }

    var callback = function(appState) {
      expect(appState).to.eql({count: 2})
    }

    staction.init(
      actions,
      () => {return {count: 1}},
      callback
    )
    // @ts-ignore
    var result = staction.actions.testAction()

    expect(result).to.be.an.instanceof(Promise)

    result.then(newState => {
      expect(newState).to.eql({count: 2})
      expect(staction.state).to.eql({count: 2})
      done()
    })
  })

  context('actions', function() {
    it('async/await', function(done) {
      var actions = {
        testAction: async function() {
          await sleep()

          done()

          return {}
        }
      }

      staction.init(actions, () => {return {}}, noop);
      // @ts-ignore
      staction.actions.testAction()
    })

    it('generator', function(done) {
      var setStateCount = 0;
      var actions = {
        testAction: function* ({ state }) {

          yield {count: state().count + 1}

          expect(state().count).to.equal(1)

          yield {count: state().count + 1}

          expect(state().count).to.equal(2)
        }
      }

      staction.init(actions, () => {return {count: 0}}, () => {
        setStateCount += 1;
      })
      // @ts-ignore
      var result = staction.actions.testAction()

      result.then((state) => {
        expect(state).to.eql({count: 2});
        expect(setStateCount).to.equal(2);
        done()
      })
    })

    it('promise', function(done) {
      var actions = {
        testAction: function ({ state }) {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve({count: state().count + 1})
            }, 50)
          })
        }
      }

      staction.init(actions, () => {return {count: 0}}, noop)
      // @ts-ignore
      var result = staction.actions.testAction()

      result.then((state) => {
        expect(state).to.eql({count: 1})
        done()
      })
    })

    it('generator and async/await', function(done) {
      var actions = {
        testAction: function* ({ state }) {
          yield {count: state().count + 1}
          expect(state().count).to.equal(1)

          yield (async function(){
            return {count: state().count + 1}
          }())

          expect(state().count).to.equal(2)

          yield {count: state().count + 1}
        }
      }

      staction.init(actions, () => {return {count: 0}}, noop)
      // @ts-ignore
      var result = staction.actions.testAction()

      result.then(state => {
        expect(state.count).to.equal(3)
        expect(staction.state).to.eql({count: 3})

        done()
      })
    })
  })
})
