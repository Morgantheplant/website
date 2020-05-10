define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var SnapTransition = require('famous/transitions/SnapTransition');
  
  var snap = {
    method: 'snap',
    period: 400,
    dampingRatio: 0.2
  };

  function BigNumberView() {
    View.apply(this, arguments);
    this.currentNumber = 0;

    _createBigNumber.call(this)
  }

  BigNumberView.prototype = Object.create(View.prototype);
  BigNumberView.prototype.constructor = BigNumberView;

  BigNumberView.DEFAULT_OPTIONS = {};
  

  function _createBigNumber(){
     
     this.bigNumber = new Surface({
       size:[200,130],
       content:'255',
       properties: {
        fontSize: '100px',
        color: 'white',
        textAlign:'center',
        fontFamily: 'verdana',
        textShadow: '0px 0px 100px yellow'
       }
     })
     
     this.bigNumberMod = new StateModifier({
      transform: Transform.scale(0,0,0)
     })
    
    this.add(this.bigNumberMod).add(this.bigNumber)

  }
  
  BigNumberView.prototype.enterExitNumber = function(){
    this.bigNumber.setContent(this.currentNumber)
    this.bigNumberMod.setOpacity(1)
    this.bigNumberMod.setTransform(Transform.scale(1,1,1), snap, function(){
      this.bigNumberMod.setTransform(Transform.scale(0,0,0), snap)
      this.bigNumberMod.setOpacity(0, {duration:200})
    }.bind(this))
  }

  BigNumberView.prototype.updateCounter = function(value){
    this.currentNumber = value;
  }

  module.exports = BigNumberView;
});
