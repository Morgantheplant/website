define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var Timer = require('famous/utilities/Timer');
  var SnapTransition = require('famous/transitions/SnapTransition');
  
  var snap = {
    method:'snap',
    period:200,
    dampingRatio:0.3
  }

  var delay = {
    duration: 940
  }

  function AdderView() {
    View.apply(this, arguments);

    this._eventInput.on('current_shown', function(data){
      triggerAddEvents.call(this,data)
    }.bind(this))


    _createAdder.call(this)
    _createArrow.call(this)
  }

  AdderView.prototype = Object.create(View.prototype);
  AdderView.prototype.constructor = AdderView;

  AdderView.DEFAULT_OPTIONS = {
   
  };

  function _createArrow(){

    this.arrowInit = {
      x:130,
      y:27,
      z:0
    }
    
    this.arrowAnimate = {
      x:825,
      y:20,
      z:500
    }

    this.arrowScaleMod = new StateModifier({
      transform: Transform.scale(0,0,0)
    })

    this.arrowMod = new StateModifier({
      transform: Transform.translate(this.arrowInit.x,this.arrowInit.y,this.arrowInit.z)
    })


    this.arrow = new Surface({
      content: '<i class="fa fa-arrow-right" style="line-height:1px; font-size:20px"></i>',
      size:[40,40],
      properties:{
        fontSize:'16px',
        color:'white'
      }
    })
    
    this.add(this.arrowScaleMod).add(this.arrowMod).add(this.arrow)
  } 
  
  function _createAdder(){
    this.plusSign = new Surface({
      content: '<i class="fa fa-plus" style="line-height:1px"></i>',
      size:[25,25],
      origin:[0.5,0.5],
      properties: {
        color:'rgb(0, 255, 255)',
        fontSize: '35px'
      }
    })

    this.plusSignMod = new StateModifier({
      origin:[0.5,0.5],
      transform: Transform.scale(0,0,0)
    })
    
    this._eventInput.on('add_cards', function(){
      enterExitPlus.call(this)

    }.bind(this));


    this.add(this.plusSignMod).add(this.plusSign)
  }

  function enterExitPlus(){  
    //enter plus and trigger arrow animation
    this.plusSignMod.setTransform(Transform.scale(1,1,1), snap, function(){
      arrowAnimation.call(this)
    }.bind(this))
    //hide plus after n seconds
    Timer.setTimeout(function(){
         this.plusSignMod.setTransform(Transform.scale(0,0,0), snap)
    }.bind(this), 2000)
  }

  function arrowAnimation(){
    this.arrowMod.setTransform(Transform.translate(this.arrowInit.x,this.arrowInit.y,this.arrowAnimate.z))
    //show arrow and move it across the screen
    Timer.setTimeout(function(){
      this.arrowScaleMod.setTransform(Transform.scale(1,1,1))
      this.arrowMod.setTransform(Transform.translate(this.arrowAnimate.x,this.arrowAnimate.y,this.arrowAnimate.z), delay, function(){
        //reset arrow position after n seconds
        this._eventOutput.emit('show_bignumber')

        resetArrow.call(this, 0)

      }.bind(this))

    }.bind(this),500)
  }

  function resetArrow(delay){
    Timer.setTimeout(function(){
      this.arrowScaleMod.setTransform(Transform.scale(0,0,0))
      this.arrowMod.setTransform(Transform.translate(this.arrowInit.x,this.arrowInit.y,this.arrowInit.z))
    }.bind(this),delay)
  }

  function triggerAddEvents(data) {
    var eventOutput = this._eventOutput
    var cardShowing = data.onhand
    var numbers = [128,64,32,16,8,4,2,1]
    var index = 0;
    
    //stagger fake hit events
    var delay = function(index){
      Timer.setTimeout(function(){
        if(cardShowing[numbers[index]]){
          eventOutput.emit('fauxlision', {card:numbers[index]})
        }
       if(index<numbers.length){
        index++
        delay(index)
      }
        
      }, 110)
    }

  Timer.setTimeout(function(){delay(index)},800)

  }

  module.exports = AdderView;
});
