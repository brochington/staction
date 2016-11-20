import Staction from '../Staction'

var staction = new Staction();

describe("Staction", function() {
  beforeEach(function() {
     staction = new Staction();
  })

  it("Is new'ed correctly", function() {
    expect(staction).to.be.exist;
    expect(staction)
  })
})
