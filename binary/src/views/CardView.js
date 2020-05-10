define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var Transitionable = require('famous/transitions/Transitionable');
  var SpringTransition = require('famous/transitions/SpringTransition');
  var Flipper = require('famous/views/Flipper');
  var SnapTransition = require('famous/transitions/SnapTransition');
  
  Transitionable.registerMethod('spring', SpringTransition);
  Transitionable.registerMethod('snap', SnapTransition);

  var spring = {
    method: 'spring',
    period: 500,
    dampingRatio: 0.3
  };

  var snap = {
    method:'snap',
    period:350,
    dampingRatio:0.3
  }
  
  function CardView() {
      View.apply(this, arguments);
       
      this.cardModifier = new StateModifier({
       // size: [undefined, undefined],
        origin:[0,0]
      });

      this.mainNode = this.add(this.cardModifier);

      this.ModalHidden = false;
      
      _createCard.call(this);


  }

  CardView.prototype = Object.create(View.prototype);
  CardView.prototype.constructor = CardView;

  CardView.DEFAULT_OPTIONS = {
    cardNumber: 1
  };
  
  function _createCard(){
    
    this.shown = true;
    this.card = new Flipper()

    this.number = this.options.cardNumber;
    
    this.cardScaleMod = new StateModifier()

    this.cardMoveMod = new StateModifier({
      origin: [0.5, 0.5],
      transform: Transform.translate(0,-75,-500)
    })


    this.frontCard = new Surface({
      size:[75,100],
      content: this.options.cardNumber,
      properties: {
        backgroundColor: "hsl(" + (this.options.cardNumber * 360 / 40) + ", 100%, 50%)",
        fontWeight: 'bold',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        color: 'black',//'rgb(64, 64, 64)',
        borderRadius: '5px',
        paddingTop: '40px',
        textAlign: 'center',
        boxShadow: '0px 0px 15px hsl(' + (this.options.cardNumber * 360 / 40) + ', 100%, 50%)'

      }
    });

    //back of card and its two modifiers


    this.backCard = new Surface({
      size:[50,75],
      content: '<img style="height:35px; width:35px" src="./img/famous.png" />',
      properties: {
        backgroundColor: "hsl(" + (this.options.cardNumber * 360 / 40) + ", 100%, 50%)",
        borderRadius: '5px',
        textAlign: 'center',
        paddingTop:'20px',
        boxShadow: '0px 0px 15px hsl(' + (this.options.cardNumber * 360 / 40) + ', 100%, 50%)'
      }
    })

     this._eventInput.on('showCard', function(){
          this.showCard();
      }.bind(this))

      this._eventInput.on('hideCard', function(){
          this.hideCard();
      }.bind(this))
    
    this.bottomNumMod = new StateModifier({
      origin:[0.5, 0.5],
      transform: Transform.translate(0,200,-200)
    })
      
    this.bottomNumber = new Surface({
      size: [100,75],
      content: '1',
      properties: {
        color: 'white',
        fontWeight: 'bold',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        fontSize: '75px',
        textAlign: 'center'
      }
    })
    
    this.card.setFront(this.frontCard)
    this.card.setBack(this.backCard)

    this.mainNode.add(this.bottomNumMod).add(this.bottomNumber);
    this.mainNode.add(this.cardScaleMod).add(this.cardMoveMod).add(this.card);

    this._eventInput.on('hide_modal', function(){
      this.ModalHidden = true;
      if(!this.shown){
        this.cardMoveMod.setTransform(Transform.translate(0,75,0))
        this.bottomNumMod.setTransform(Transform.translate(0,200,0))
      }

      if(this.shown){
        this.cardMoveMod.setTransform(Transform.translate(0,-75, 0));
        this.bottomNumMod.setTransform(Transform.translate(0,200,0))
      }

    }.bind(this))

    this._eventInput.on('show_modal', function(){
      this.ModalHidden = false;
      if(!this.shown){
      this.cardMoveMod.setTransform(Transform.translate(0,0,-500))
      this.bottomNumMod.setTransform(Transform.translate(0,200,-200))
      }

      if(this.shown){
        this.cardMoveMod.setTransform(Transform.translate(0,-75, -500))
        this.bottomNumMod.setTransform(Transform.translate(0,200,-200))
      }
    }.bind(this))
    
    this._eventInput.on('fauxlision', function(){
      this.cardScaleMod.setTransform(Transform.translate(0,0,-300), snap, function(){
        this.cardScaleMod.setTransform(Transform.translate(0,0,0), {duration:100})
      }.bind(this))
    }.bind(this))

  }

  CardView.prototype.showCard = function(){
    var zIndex = this.ModalHidden ? 0 : -200
    if(!this.shown){
      this.card.flip(spring);
      this.shown = true;
      this.cardMoveMod.setTransform(Transform.translate(0,-75, zIndex), spring);
      this.bottomNumber.setContent('1')
    }


  }

   CardView.prototype.hideCard = function(){
    var zIndex = this.ModalHidden ? 0 : -200
    if(this.shown){
      this.card.flip(spring),
      this.shown = false;
      this.cardMoveMod.setTransform(Transform.translate(0,75, zIndex), {duration:100});
      this.bottomNumber.setContent('0')  
    }

  }
  
  

  module.exports = CardView;
});
