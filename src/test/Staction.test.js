import Staction from '../Staction'

var staction = new Staction();

describe("Staction", function() {
  beforeEach(function() {
     staction = new Staction();
  })

  it("Is new'ed correctly", function() {
    console.log(process.env.NODE_ENV);
    expect(staction).to.be.exist;
    expect(staction)
  })
})
