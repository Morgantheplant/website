define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var GridLayout = require("famous/views/GridLayout");
  var Transitionable = require('famous/transitions/Transitionable');
  var SpringTransition = require('famous/transitions/SpringTransition');
  var Flipper = require('famous/views/Flipper');
  var Timer = require('famous/utilities/Timer');

  function GridView() {
    View.apply(this, arguments);  
    this.steps = [this.initAndRecurse, this.checkBounds,this.setBounds,this.findMiddle,this.compareMiddle,this.hideRedundant];
    this.blockHash = {};
    this.tempHash = {};
    this.tempContent = [];
    this.timeBetweenEvents = 500;
    this.currentBoardLength = 100;
    this.minimumBoardSize = 15;
    this.finished = false;
    this.target = 200;
    this.currentStep = 0;

    _createBlocks.call(this)
  
    this._eventInput.on('new_board', function(data){
      this.target = data.value;
      newBoard.call(this)
    }.bind(this))

    this._eventInput.on('settings_info', function(data){
      this.timeBetweenEvents = data.timebetween || 1000;
      this.minimumBoardSize = data.min || 15
      newBoard.call(this)
    }.bind(this))

    this._eventInput.on('play', function(data){
      this.finished = false;
      this.target = data.value;
      this.play.call(this, this.currentStep)
    }.bind(this))

    this._eventInput.on('pause', function(){
      this.pause.call(this)
    }.bind(this))


    this._eventInput.on('reload', function(data){
      this.target = data.value
      resetAll.call(this)
    }.bind(this))

    this._eventInput.on('next', function(){
      this.finished = false
      this.play.call(this, this.currentStep, true)
    }.bind(this))

  }


  GridView.prototype = Object.create(View.prototype);
  GridView.prototype.constructor = GridView;

  GridView.DEFAULT_OPTIONS = {};
  
  var famousLogo = [14, 23, 33, 43, 53, 64, 65, 66, 67, 68, 59,49, 39,29, 18, 17, 16,  26,   36,   46,  56,  76, 86, 96]

  var spring = {
    method: 'spring',
    period: 500,
    dampingRatio: 0.3
  };
  
  var spring1 = {
    method: 'spring',
    period: 600,
    dampingRatio: 0.4
  };

   var spring2 = {
    method: 'spring',
    period: 440,
    dampingRatio: 1
  };
  

  function _createBlocks(){

    var grid = new GridLayout({
      dimensions: [10, 10],
      gutterSize:[3,3]
    });
    
    //keep track of content so we can newBoard/reassign blocks later
    this.contentAry =[];
  
    this.blocks = [];

    grid.sequenceFrom(this.blocks);

    for(var i = 0, content = 0; i < 100; i++){
      
      this.miniBlockView = new View()

      var content = content + Math.floor(Math.random()*4)+1
      this.contentAry.push(content)

      this.flipper = new Flipper({
        origin:[0.5,0.5]
      })
  
      this.blockMod = new StateModifier({
         origin:[0.5,0.5],
         opacity: 1
      });

      this.block =  new Surface({
        content: "<br >"+content,
        size: [undefined, undefined],
        properties: {
          backgroundColor: "hsl(" + (content) + ", 100%, 50%)",
          color: 'rgb(31, 31, 31)',
          fontFamily:'lobster, verdana',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '16px',
        }
      })

      this.blockBack =  new Surface({
        size: [undefined, undefined],
        properties: {
          backgroundColor: "hsl(" + (content) + ", 100%, 50%)",
        }
      })
      
      _checkingAnimation.call(this, i)
      
       
      this.flipper.setFront(this.block)
      this.flipper.setBack(this.blockBack)

      this.miniBlockView._add(this.blockMod).add(this.flipper)
      
      //store references to the surfaces and modifiers in the loop
      this.blockHash[content] = {
        flipper: this.flipper, 
        back: this.blockBack,
        front: this.block,
        mod: this.blockMod,
        check: this.checkingMod,
        frontShowing: true
      }

      this.blocks.push(this.miniBlockView);
    }

    this.add(grid)
  }


  
  GridView.prototype.updateNumber = function(oldNumber, newNumber, remove){
    //copy all links from old hash to temp hash
    this.tempHash[newNumber] = this.blockHash[oldNumber]
   //set content for each front
    this.tempHash[newNumber].front.setContent(newNumber) 
    //change color too!
    var newColor = "hsl(" + (newNumber) + ", 100%, 50%)";
    
      this.tempHash[newNumber].front.setProperties({backgroundColor: newColor});
      this.tempHash[newNumber].back.setProperties({backgroundColor: newColor});

  } 


/********************************* Card Events ********************************************/

  function bounds(){
    if(this.frontShowing){
      this.mod.setOpacity(1)
      this.flipper.flip(spring)
      this.back.setProperties({backgroundColor:'green', boxShadow: '0px 0px 15px yellow'})
      this.frontShowing = false;
    } 
    if(!this.frontShowing){
      this.mod.setOpacity(1)
      this.frontShowing = false;
    }
  }

  function center(){
    
    if(!this.frontShowing){
       this.check.setTransform(Transform.scale(.75,.75,.75), spring1, function(){
          this.check.setTransform(Transform.scale(0,0,0), spring2)
      }.bind(this))
      this.back.setSize([100,100], spring)
      this.mod.setTransform(Transform.translate(0,0,200), spring)
      this.back.setProperties({backgroundColor:'orange', boxShadow: '0px 0px 15px yellow'})
    }
    
    if(this.frontShowing){
      this.flipper.flip(spring)
      this.check.setTransform(Transform.scale(.75,.75,.75), spring1, function(){
          this.check.setTransform(Transform.scale(0,0,0), spring2 )
      }.bind(this))
      this.back.setSize([100,100])
      this.mod.setTransform(Transform.translate(0,0,200))
      this.back.setProperties({backgroundColor:'orange', boxShadow: '0px 0px 15px yellow'})
      this.frontShowing = false;
    }

  }

  function hide(){
    if(!this.frontShowing){
      this.mod.setOpacity(0.2)
      this.mod.setTransform(Transform.translate(0,0,0))
      this.back.setProperties({backgroundColor:'grey', boxShadow: '0px 0px 15px yellow'})
      this.back.setSize([undefined, undefined])
    }

    if(this.frontShowing){
      this.flipper.flip(spring)
      this.mod.setOpacity(0.2)
      this.mod.setTransform(Transform.translate(0,0,0))
      this.back.setSize([undefined, undefined])
      this.back.setProperties({backgroundColor:'grey', boxShadow: '0px 0px 15px yellow'})
      this.frontShowing = false;
    }
  }

  function removeView(){
    this.mod.setOpacity(0)
  }

  function reset(){
    var newColor = "hsl(" + (this.front.getContent()) + ", 100%, 50%)"
    this.front.setProperties({backgroundColor: newColor, boxShadow: 'none'})
    this.back.setProperties({backgroundColor: newColor, boxShadow: 'none'})
    this.mod.setOpacity(1)

    if(!this.frontShowing){
      this.flipper.flip()
      this.frontShowing = true;
    }
  }

  function resetAll(){
    this.pause()    
    this.redundant = undefined;
    this.start = undefined;
    this.end = this.currentBoardLength-1;
    this.finished = false;
    this.currentStep = 0;
    for(var i =0; i < this.currentBoardLength; i++){
      var currentItem = this.contentAry[i]  
      reset.call(this.blockHash[currentItem])
    }
  }


  
  
/***************************************************************************************/


  function newBoard(min){
    this.pause();
    //set random length between min and 400 
    var min = min||this.minimumBoardSize;
    len = Math.floor(Math.random()*(100-min)+min);
    this.currentBoardLength = len;
    resetAll.call(this)
    
    this.newNumber = 0;
    
    this.contentAry.forEach(function(item, index){
      //hide all views that are greater than new board length
      var remove = (index>=len) ? true: false; 
      console.log(index, len, remove, 'index,len remove')
      if(remove){
        reset.call(this.blockHash[item])
        removeView.call(this.blockHash[item])
      }

      if(!remove){
        reset.call(this.blockHash[item])
      }

      this.newNumber += Math.floor(Math.random()*4)+1
      
      this.updateNumber(item, this.newNumber)   
      this.tempContent.push(this.newNumber)
   
    }.bind(this))
    

    //copy new hash and reset the temp hash after storing
    this.blockHash = this.tempHash;
    this.tempHash = {};
    
    //copy all new numbers from temp location 
    // and assign them back to the main content array  
    this.contentAry = this.tempContent;
    this.tempContent = [];

  }



  /**************************** Binary Search Step by Step Events **********************/


  GridView.prototype.play = function(override, singlestep){
    var step = override || 0
    
    nextStep.call(this)
    function nextStep(){  
      //reset step if you get to the end
      step = (step === this.steps.length) ? 0 : step;
      this.currentStep = (this.currentStep === this.steps.length) ? 0 : this.currentStep;

      this.playTimer = Timer.setTimeout(function(){         
       //cycle through this.steps
        if(!this.finished){
          //call with all values
          this.steps[step].call(this)
          step++;
          this.currentStep++
          //only call if it isnt a single step
          if(!singlestep){
            nextStep.call(this)
          }
        } 
      }.bind(this), this.timeBetweenEvents)
    }
  }

  GridView.prototype.pause = function(){
    this.finished = true;
    Timer.clear(this.playTimer);
  }


  
  GridView.prototype.initAndRecurse = function(){
    
    if(this.redundant === undefined){
      this.start = 0;
      this.end = this.currentBoardLength-1;
      var message = 'Initializing the board.'
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, target: this.target})
    }
    if(this.redundant === 'greater') {
      this.end = this.middle-1;
      var message = 'Everything greater than the middle is redundant.'
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, target: this.target})
    }
    if(this.redundant === 'smaller'){
      this.start = this.middle+1
      var message = 'Everything smaller than the middle is redundant.'
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, target: this.target})
    }
    

  }


  GridView.prototype.checkBounds = function(){
   // this.currentStep = 1;     
    var message = 'Checking new Start and End indexes.'
    this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, target: this.target})
    if (this.start > this.end) { 
      var message = 'Start index greater than End index. Number not found'
      this.finished = true;
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, target: this.target})
     // alert('number not found')
      endAnimation.call(this) 
      return; 
    } //does not exist
    var message = 'Start and End indexes valid. Bounds are valid.'
    this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, target: this.target})
  }

  GridView.prototype.setBounds = function(){ 
   // this.currentStep = 2;
    this.startBlock = this.contentAry[this.start]
    this.endBlock = this.contentAry[this.end]
    var message = 'Setting new bounds.'
    this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, target: this.target})

    bounds.call(this.blockHash[this.endBlock])
    bounds.call(this.blockHash[this.startBlock])  
  }



  GridView.prototype.findMiddle = function(){
    
    this.middle = Math.floor((this.start + this.end) / 2);
    this.value = this.contentAry[this.middle];
    center.call(this.blockHash[this.value])
  
    var message = 'Finding middle between Start and End index'
     this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, middle: this.middle, target:this.target, midValue: this.value, center: true })
  
  }

  GridView.prototype.compareMiddle = function(){
   // this.currentStep = 4;
    var message = 'Comparing the middle index\'s value to our target value'
    this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, middle: this.middle, target: this.target, midValue: this.value})
  
    if (this.value > this.target) { 
      this.redundant = 'greater';
      var message = 'Value is larger than the target.'
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, middle: this.middle, target: this.target, midValue: this.value})
    }

    if (this.value < this.target) { 
      this.redundant = 'smaller';
      var message = 'Value is smaller than the target.'
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, middle: this.middle, target: this.target, midValue: this.value})
    }
   
    if(this.value == this.target){
      var message = 'Value is equal to the target. TARGET FOUND!!'
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, middle: this.middle, target: this.target, midValue: this.value})
      endAnimation.call(this)
      this.finished = true;
    } 
  }

  GridView.prototype.hideRedundant = function(){
     if(this.redundant === 'smaller'){
      this.hideAnythingSmaller.call(this)
      var message = 'Hide the middle index and everything smaller';
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, middle: this.middle, target: this.target, midValue: this.value})
     }

     if(this.redundant === 'greater') {
       this.hideAnythingGreater.call(this)
      var message = 'Hide the middle index and everything greater';
      this._eventOutput.emit('message', {info:message, start: this.start, end: this.end, middle: this.middle, target: this.target, midValue: this.value})
     }
  }


   GridView.prototype.hideAnythingGreater = function(){
     for(var i = this.middle; i <= this.end; i++){
      var blockNumber = this.contentAry[i]
      hide.call(this.blockHash[blockNumber])
      
     }
  }
  
  GridView.prototype.hideAnythingSmaller = function(){
    for(var i = this.start; i <= this.middle; i++){
      var blockNumber = this.contentAry[i]
      hide.call(this.blockHash[blockNumber])
     }
  }
  
  
  function _checkingAnimation(num){
    var textNumber = (num+1) + '<br><span class="checkingIndex">Checking Index</span>';   
    this.checking = new Surface({
      size:[300,300],
      content: textNumber,
      properties:{
        textShadow: '0px 0px 5px yellow',
        color: 'white',
        fontWeight:'bold',
        textAlign:'center',
        fontSize:'50px',
        fontFamily:'lobster'
      }
    })

    this.checkingMod = new StateModifier({
      transform: Transform.scale(0,0,0)
    })
    
    var checkingModZ = new StateModifier({
      origin:[0.5,0.5],
      transform: Transform.translate(0,0,500)
    })

    this.miniBlockView._add(checkingModZ).add(this.checkingMod).add(this.checking)

  }

 
  function endAnimation(){
    
    Timer.setTimeout(function(){
      for(var i =0; i < this.currentBoardLength; i++){
        var currentItem = this.contentAry[i]  
        hide.call(this.blockHash[currentItem])
      }
        flipNextLetter.call(this)
    }.bind(this), 2000)
    
  var count = 0;
  var pointers = []
  
  function flipNextLetter(){
    Timer.setTimeout(function(){
      if(count < famousLogo.length){
        var index = famousLogo[count]
        var itemValue = this.contentAry[index-1]
        var itemPointer = this.blockHash[itemValue]
        
        if(!itemPointer.frontShowing){
          itemPointer.flipper.flip(spring)
          itemPointer.frontShowing = true;
          itemPointer.mod.setOpacity(1)
        }
        
        if(itemPointer.frontShowing){
          itemPointer.mod.setOpacity(1)
        }

        count++
        pointers.push(itemPointer);
        flipNextLetter.call(this)
      }
    }.bind(this), 100)
  }
  
  
  pointers.forEach(function(item){
    console.log('happening')
    item.front.setProperties({boxShadow:'0px 0px 10px white'})
  }) 


  }


  module.exports = GridView;

});
