define(function(require, exports, module) {
var View = require('famous/core/View');
var Surface = require('famous/core/Surface');
var Transform = require('famous/core/Transform');
var StateModifier = require('famous/modifiers/StateModifier');
var ImageSurface = require('famous/surfaces/ImageSurface');
var ContainerSurface = require('famous/surfaces/ContainerSurface');
var Modifier   = require('famous/core/Modifier');

var CardView = require('views/CardView');
var TitleView = require('views/TitleView');
var Timer = require('famous/utilities/Timer');
var EventHandler = require('famous/core/EventHandler');
var SideButtonsView = require('views/SideButtonsView')
var ModalView = require('views/ModalView')
var PlayButtonsView = require('views/PlayButtonsView')
var AdderView = require('views/AdderView')
var BigNumberView = require('views/BigNumberView');
var Easing = require('famous/transitions/Easing');

var appEvents = new EventHandler();

function AppView() {
  View.apply(this, arguments);
  
  var mainAppMod = new StateModifier({
    align:[0,0],
    size:[undefined,undefined]
  })
  
  //stores references to cards based on values
  this.cardDict = {}

  this.mainNode = this.add(mainAppMod)

  //grabs events from the helper functions *possibly refactor out*

  this._eventOutput.on('showCard', function(data){
    this.cardDict[data.num]._eventInput.trigger('showCard');
  }.bind(this))


  this._eventOutput.on('hideCard', function(data){
    this.cardDict[data.num]._eventInput.trigger('hideCard');
  }.bind(this))

  this._eventOutput.on('hide_modal', function(){
    this.options.cardCollection.forEach(function(item){
      this.cardDict[item]._eventInput.trigger('hide_modal')
    }.bind(this))
  }.bind(this)) 

  this._eventOutput.on('show_modal', function(){
    this.options.cardCollection.forEach(function(item){
      this.cardDict[item]._eventInput.trigger('show_modal')
    }.bind(this))
  }.bind(this)) 

  
  //main counter that gets displayed in the title
  this.counter = 0;

  _createCards.call(this)
  _createTitle.call(this)
  _createSideButtonsView.call(this)
  _createModal.call(this)
  _createPlayButtonsView.call(this)
  _createAdderView.call(this)
  _createBigNumber.call(this)
}



AppView.prototype = Object.create(View.prototype);
AppView.prototype.constructor = AppView;

AppView.DEFAULT_OPTIONS = {
  cardNumber: 1,
  leftOffset: 0,
  bits: 8,
  cardCollection: []
};

function _createBigNumber(){
  var numberMod = new StateModifier({
    transform: Transform.translate(100,-75,0)
  });


  var bigNumber = new BigNumberView();

  this._eventOutput.on('increment', function(data){
    bigNumber.updateCounter(data.counter)
  })
  
  this._eventOutput.on('show_bignumber', function(){
    bigNumber.enterExitNumber();
  }.bind(this))

  this.cardNode.add(numberMod).add(bigNumber)
}

function _createAdderView(){

  var adderView = new AdderView()

  var adderMod = new StateModifier({
    transform: Transform.translate(-800,-75,-200)
  })

  this.cardNode.add(adderMod).add(adderView)

  adderView.on('show_bignumber', function(){
    this._eventOutput.emit('show_bignumber')
  }.bind(this))
 
  adderView.on('fauxlision', function(data){
    this.cardDict[data.card]._eventInput.trigger('fauxlision')
  }.bind(this))

   //delay add arrow event slightly from call
  this._eventOutput.on('increment', function(){
      adderView.trigger('add_cards')
  }) 
  
  this._eventOutput.on('current_shown', function(data){
    adderView._eventInput.trigger('current_shown', data)
  })


}


function _createModal(){

  var modalView = new ModalView()
  this.add(modalView)

  this._eventOutput.on('show_modal', function(){
    modalView._eventInput.trigger('show_modal')
  }.bind(this))

  modalView.on('hide_modal', function(){
    this._eventOutput.emit('hide_modal')
  }.bind(this))

}

function _createPlayButtonsView(){
  var playButtonsView = new PlayButtonsView();
  var playButtonsMod = new StateModifier({
    align:[0.05,0.5],
    transform: Transform.translate(0,0,-200)
  })

  playButtonsView.on('play', function(){
    console.log('hello')
    this._eventOutput.trigger('play')
  }.bind(this))
  
  this._eventOutput.on('show_modal', function(){
    playButtonsMod.setTransform(Transform.translate(0,0,-200))
  })


  this._eventOutput.on('hide_modal', function(){
    playButtonsMod.setTransform(Transform.translate(0,0,0))
  })


  this.cardNode.add(playButtonsMod).add(playButtonsView)

}


  //main timer function that is called from button click

  function _startTimer(){
    
    //call immediately before starting timer
    this._eventOutput.emit('increment', {counter:this.counter});
    cardTurner.call(this, this.counter, this.options.bits);
    this.counter++;

    this.timer = Timer.setInterval(function(){
      cardTurner.call(this,this.counter, this.options.bits);      
      this._eventOutput.emit('increment', {counter:this.counter});
       
        this.counter++;
      //handle number limit
      if(this.counter > 255){
        this.counter = 0;
      }
    }.bind(this), 3100)

  }



  //the view for side nav and number entry features
  function _createSideButtonsView() {

    var sideButtonsView = new SideButtonsView()
    this.add(sideButtonsView)
    
    //keep track if timer has been called or not
    this.stopped = true;
   
   //start or stop the timer depending on this.stopped
    this._eventOutput.on('play', function(){
      console.log(this.stopped, 'hello here')
      if(this.stopped){
        _startTimer.call(this)
        this.stopped = false;
      } else if(!this.stopped){
       Timer.clear(this.timer)
       this.stopped = true;
      }
    }.bind(this))

   //reset the timer to zero and reset all cards
    sideButtonsView.on('reset', function(){
      this.counter = 0;
      cardTurner.call(this, this.counter, this.options.bits)
      this._eventOutput.emit('increment', {counter: this.counter});
    
    }.bind(this))

  //set the current card value to number from input field
    sideButtonsView.on('enter', function(data){
      this.counter = +data.value;
      cardTurner.call(this, this.counter, this.options.bits)    
      this._eventOutput.emit('increment', {counter: this.counter});  
    }.bind(this))

  //set about button event for opening modal
    sideButtonsView.on('show_modal', function(){
      this._eventOutput.emit('show_modal', {counter: this.counter});
    }.bind(this))

  //set Z index events to avoid blurring of about text 
    this._eventOutput.on('hide_modal', function(){
      sideButtonsView.trigger('hide_modal')
    })


  }

  function _createCards(){

    var mainCardMod = new StateModifier({
      align:[.75,0.5],
      origin:[0,0.5]
    })

    this.cardNode = this.mainNode.add(mainCardMod)


    //evenly offset cards from one another
    var xOffset = this.options.leftOffset;
    var cardDict = this.cardDict
      
    //loop to build all of the card views  
    for( var i = 0; i < this.options.bits; i++) { 
      
      var cardView = new CardView({
        cardNumber: this.options.cardNumber
      });
      
      //add value to main card hash and store reference to cardview
      cardDict[this.options.cardNumber] = cardView

      var individualCardMod = new StateModifier({
        transform: Transform.translate(xOffset,0,0)
      });
        
      this.cardNode.add(individualCardMod).add(cardView);
        
      this.options.cardCollection.push(this.options.cardNumber);
      
      // increment value of each card by power of 2
      this.options.cardNumber === 1 ? this.options.cardNumber++ : this.options.cardNumber *= 2;
      
      //distance to offset eachnew card
      xOffset -= 90;

     
    }

     

  }
 
  function _createTitle() { 

    //title view at top
    var titleView = new TitleView({ 
      bits: this.options.bits, 
      cardCollection: this.options.cardCollection
    })
    
    
    this._eventOutput.on('increment', function(data){
      titleView._eventInput.trigger('increment', data)
    })

    this._eventOutput.on('show_bignumber', function(){
      titleView._eventInput.trigger('move_title')
    })

    var titleMod = new StateModifier({
      align:[0.48, 0.02],
      origin: [0.5, 0]
    });

    this.mainNode.add(titleMod).add(titleView)
  }

  //helper function to emit a hide card event
  function hideCard(num){
    this._eventOutput.emit('hideCard', {num: num})
  }

  //helper function to emit a show card event
  function showCard(num){
    this._eventOutput.emit('showCard', {num: num})
  }

  //takes a number and converts it into hide and show binary events
  function cardTurner(bitNumber, bitLength){
    
    var currentShown = {}

      //covert number to binary
    var binary = bitNumber.toString(2)
    
    //decides whther to show or hide each character in number
    for(var i = binary.length-1, j = 0; i >= 0; i--, j++){
      if(binary[i] === '0'){
        hideCard.call(this, Math.pow(2,j));
      }
      if(binary[i] === '1'){
        showCard.call(this, Math.pow(2,j))
        currentShown[Math.pow(2,j)] = true;
      }
    }
    
    //hide remaining digits not listed in binary number
    if(bitLength > binary.length){
      for(var i = bitLength - binary.length, j = binary.length; i > 0; i--, j++){
        hideCard.call(this, Math.pow(2,j))     
      }
    }
    
    if(i = binary.length-1 || binary ==='1'){
      this._eventOutput.emit('current_shown', {onhand:currentShown})
    }

  }



  module.exports = AppView;

});
