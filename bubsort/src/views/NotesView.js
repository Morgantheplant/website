define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var AudioSynth = require('../node_modules/audiosynth/index.js');
  var Timer = require('famous/utilities/Timer');
  var musicNotesData = require('data/musicNoteData')
  var SnapTransition = require('famous/transitions/SnapTransition');
  var Modifier   = require('famous/core/Modifier');
  var SpringTransition = require('famous/transitions/SpringTransition');
  var Transitionable = require('famous/transitions/Transitionable');
  Transitionable.registerMethod('spring', SnapTransition);
  Transitionable.registerMethod('snap', SnapTransition);
  
  var context = new AudioContext();
  var synth = new AudioSynth(context);
  
  //global values that will be bound to modifiers
  var sizeWidth = 600;
  var sizeHeight = 500;
  var notesNumber; 
  var offsetX = 10;
  var timeBetweenSteps;
  var timeBetweenNotes;
  var rotateY = 0;
  var translateZ = 0;
  var toneVal1 = 1.0;
  var toneVal2 = 1.0;

  function NotesView() {
    View.apply(this, arguments);
    //init states
    this.colorMod = 2.5
    //track original X locations so you can reset notes after animation has been played
    this.notesXLocations = [];
    //store references to surfaces so you can access from outside the for loop
    this.order =[];
    //different values for each timed event  
    timeBetweenNotes = 400;
    timeBetweenSteps = 400;
    this.compareTime = 400;
    //counter to see which note to compare 
    this.checkArrayCounter = 0;
    //store swaps number to break out of calls early if no swaps occur(collection sorted)
    this.swaps = 0;
    //store this value to break out of calls if paused is called
    this.playing = true;


   
    this._eventInput.on('play', function(){
        this.playing = true;
        nextStep.call(this)
    }.bind(this))

    this._eventInput.on('pause', function(){
      this.playing = false;
    }.bind(this))

    this._eventInput.on('next', function(){
      if(steps.length > 0){
        nextStep.call(this)
        this.playing = false
      }
    }.bind(this))
    
    this._eventInput.on('reset', function(){
      console.log('here')
      resetAll.call(this)
    }.bind(this))

    this.snap = {
      method: 'snap',
      period: timeBetweenSteps/2,
      dampingRatio: 0.3
    };
    
    //music notes
    var westminsterChimes = ['E4','G#4','F#4','B3','E4','F#4','G#4', 'E4']
    var yankeeDoodle = ['C4','C4','D4','E4','C4','E4','D4', 'G4', 'C4','C4','D4','E4','C4','B4']
    var oldMacDonald = ['G4','G4','G4','D4','E4','E4','D4','B4','B4','A4','A4','G4']
    
    createMusic.call(this, yankeeDoodle);
    
    /********modifiers bound to the sliders********/
    var sizeMod = new Modifier({
      size: function(){
        return [sizeWidth,sizeHeight]
      }
    })

    var rotateYMod = new Modifier({
      transform: function(){
        return Transform.rotate(0,rotateY,0)
      }
    })
    
     var transZMod = new Modifier({
      transform: function(){
        return Transform.translate(0,0,translateZ)
      }
    })
    

    this.node = this.add(rotateYMod).add(transZMod).add(sizeMod)
    _createNotes.call(this)

  }

  NotesView.prototype = Object.create(View.prototype);
  NotesView.prototype.constructor = NotesView;

  NotesView.DEFAULT_OPTIONS = {};

  var spring = {
    method: 'spring',
    period: 1000,
    dampingRatio: 0.2
  };

  NotesView.prototype.refresh = function(data){
    
    //delete all past surfaces
    this.order.forEach(function(item){
      item.noteSurface.render = function(){ return null; }
    })
    
    //erase all pointers and reset counters
    this.notesXLocations = [];
    this.order =[];
    this.checkArrayCounter = 0;
    this.swaps = 0;
    this.playing = false;
    finished = true;
    var music = data.music|| yankeeDoodle
    
    createMusic.call(this, music);
    _createNotes.call(this)

    resetAll.call(this);


  }

  function createMusic(rawNotes){ 
      var music = {}
      rawNotes.forEach(function(item, index){
        //naive initial implementation of music look up, need to fix to avoid errors on undefined/bad values
        var noteLookup = musicNotesData[item.toUpperCase()]
        if(noteLookup===undefined){alert('fix your music!!')}
        music[index] = noteLookup
      })
      
      this.sheetMusic = music
      this.initNoteLocations = this.sheetMusic; 
      notesNumber = Object.keys(this.initNoteLocations).length
      this.locationsToCheck = notesNumber;
    
    }


  function _createNotes(){

    for(var i = 0; i < notesNumber; i++){
      var hertz = Math.round(this.initNoteLocations[i].hertz)
      var content = this.initNoteLocations[i].note +' '+this.initNoteLocations[i].octave;
      
      
      var noteSurface = new Surface({
        properties: {
          backgroundColor: "hsl(" + (this.initNoteLocations[i].hertz/this.colorMod) + ", 100%, 50%)",
        }
      })
      
     noteSurface.note = this.initNoteLocations[i].note 
     noteSurface.octave = this.initNoteLocations[i].octave;

      //track original location of notes so you can reset to init positions later
      this.notesXLocations.push(((sizeWidth*.05)*i) + (offsetX*i));

      var noteSurfaceMod = new StateModifier({
        transform: Transform.translate(this.notesXLocations[i],0,0)
      })

      var noteEffectsMod = new StateModifier({
        size:[undefined,undefined],
        origin:[0,0.5],
        align:[0,0.5],
        proportions:[.05,hertz/600],
        transform: Transform.translate(0,0,0)
      })
      
       //store pointers to modifiers, value and surfaces in the for loop
       this.order.push({
        noteSurface: noteSurface,
        noteMod: noteSurfaceMod,
        note: this.initNoteLocations[i].note,
        effects: noteEffectsMod,
        octave: this.initNoteLocations[i].octave,
        hertz: this.initNoteLocations[i].hertz,
        index: i
      })
      
      //center the notes based on the size of the offsets
      var mainMod = new Modifier({        
      transform: function(){
          var largeHalf = (((sizeWidth*.05)*(notesNumber)) + ((offsetX)*(notesNumber-1)))/2
          var smallHalf = sizeWidth/2; 
          var centerSpot = smallHalf - largeHalf;
         return Transform.translate(centerSpot, 0, 0)
        }
      })

      noteSurface.on('click', function(){
       synth.playNote(synth.noteToMIDI(this.note, this.octave), toneVal1, toneVal2, 0);
      })

      this.node.add(noteEffectsMod).add(mainMod).add(noteSurfaceMod).add(noteSurface)
     
    }

  }
  
  //make a stack to store callbacks
  var steps = [playAllNotes]
  //value to track how many locations to check, simple optimization of algorithm
  var iterations = 0;
  //not being used but can add ability to play all notes after each step
  var playBetweenIterations = false;
  var finished = false;


 // function that calls each callback  
  function nextStep(args){
    if(steps.length === 0) {steps.push(playAllNotes), finished = false}
    Timer.setTimeout(function(args){
        steps.pop().apply(this, args)
    }.bind(this), timeBetweenSteps)
  }

  function playAllNotes(){
    
    this.playSoundArrayCounter = 0
    play.call(this)

    function play(){
      Timer.setTimeout(function(){
        
        if(this.playSoundArrayCounter===notesNumber){
          //play end animation if the end has been reached
          var next = (finished)? finishedEvent : bubbleCheckValues
          steps.push(next)
          if(this.playing){
            nextStep.call(this)
          }
        }
        //play notes until end is reached
        if(this.playSoundArrayCounter<notesNumber){
          var note = this.order[this.playSoundArrayCounter].note
          var octave = this.order[this.playSoundArrayCounter].octave
          var xLocation = this.notesXLocations[this.playSoundArrayCounter];
          var noteRef =  this.order[this.playSoundArrayCounter];
          
          playNoteAnimation(noteRef)
          
          
          synth.playNote(synth.noteToMIDI(note, octave), toneVal1, toneVal2, 0);
          this.playSoundArrayCounter++;
          play.call(this)
        }
        
      }.bind(this), timeBetweenNotes)
    }
  }
  
  //move note when played
  function playNoteAnimation(noteReference){
    noteReference.effects.setTransform(Transform.translate(0,0,-5), this.snap, function(){
            noteReference.effects.setTransform(Transform.translate(0,0,0), {duration:100})
     })
  }

  function bubbleCheckValues(){
    this.playSoundArrayCounter = 0;
    //queue up play all notes when you arrive at the end
    if(this.checkArrayCounter+1===this.locationsToCheck){
      iterations++;
      if(this.swaps === 0){ 
        iterations = notesNumber
        finished = true;
        steps.push(playAllNotes);
        if(this.playing){
          nextStep.call(this)
        }
        return;
      }
      //reset all values
      this.checkArrayCounter = 0;
      this.locationsToCheck--;
      this.swaps = 0;
      steps.pop()
      var next = (playBetweenIterations) ? playAllNotes : bubbleCheckValues; 
      steps.push(next)
      
      if(this.playing){
        nextStep.call(this)
      }

      return;
    }
    //compare values and queue up same event when end isnt yet reached
    if(iterations<notesNumber){
      this.currentValue = this.order[this.checkArrayCounter]
      this.nextValue = this.order[this.checkArrayCounter+1]
        steps.push(bubbleCompare)
      if(this.playing){
        nextStep.call(this)
      }
    }

  }

  function bubbleCompare(){
    var note1 = this.currentValue.note;
    var hertz1 = this.currentValue.hertz
    var octave1 = this.currentValue.octave;
    var note2 = this.nextValue.note;
    var octave2 = this.nextValue.octave;
    var hertz2 = this.nextValue.hertz;

    //similate comparing by triggering event calls

    synth.playNote(synth.noteToMIDI(note1, octave1), toneVal1, toneVal2, 0);
    playNoteAnimation(this.currentValue);
    this.currentValue.noteSurface.setProperties({backgroundColor: "hsl(" + (hertz2+this.colorMod++) + ", 100%, 50%)"})
    
    Timer.setTimeout(function(){
      synth.playNote(synth.noteToMIDI(note2, octave2), toneVal1, toneVal2, 0);
      playNoteAnimation(this.nextValue)
      steps.push(bubbleSwap)
      if(this.playing){
        nextStep.call(this);
      }

    }.bind(this), this.compareTime)


  }

  function bubbleSwap(){
    //compare values
    if(this.currentValue.hertz > this.nextValue.hertz){
      this.swaps++;
      var temp = this.order[this.checkArrayCounter]
      this.order[this.checkArrayCounter] = this.order[this.checkArrayCounter+1]
      this.order[this.checkArrayCounter+1] = temp;
      
      //move larger to new loaction and swap values/pointers
      var newX = this.notesXLocations[this.checkArrayCounter]
      var newX2 = this.notesXLocations[this.checkArrayCounter+1]
      this.order[this.checkArrayCounter].noteMod.setTransform(Transform.translate(newX,0,0), this.snap)
      this.order[this.checkArrayCounter+1].noteMod.setTransform(Transform.translate(newX2,0,0), this.snap)
    }
   
    this.checkArrayCounter++;
    steps.push(bubbleCheckValues)
    if(this.playing){
      nextStep.call(this)
    }

  }

  function finishedEvent(){
    console.log('finished!!')
  }

/****************************quick sort events **************************/

//not yet fully implemented

function quickSort(){
  var left = 0;
  var right = this.order.length-1;
  steps.pop()
  steps.push(initSort)
  nextStep.call(this, [left, right])
}


var first = true;
var rightTemp = [];
var newPivotTemp = [];
var leftTemp = [];
var statusAry = ['init']

function initSort(left, right, newPivot) {
  console.log('caled init sort', left, right)
  this.pivot = null;
  var status = statusAry.shift()
  
  if(status ==='big'){
        if(this.order[newPivot-1]===undefined){
          statusAry.push('small');
          steps.push(initSort)
          nextStep.call(this, [newPivot, right])
        } else{  
        console.log('called here')
          statusAry.push('init')  
          leftTemp.push(left)
          rightTemp.push(right);
          newPivotTemp.push(newPivot)
          steps.push(findPivot)
          nextStep.call(this, [left, newPivot - 1])
        }
    }

  if(status === 'small'){  
    if(this.order[right+1]===undefined) {
       statusAry.push('init')
      steps.push(findPivot)
      nextStep.call(this, [leftTemp.shift(), rightTemp.shift()])
    } else {
      statusAry.push('init')
      steps.push(findPivot)
      nextStep.call(this, [left+1, right])
    } 
    
  }
  
  if(status === 'init'){
    if(left < right) {
      statusAry.push('big')
      steps.push(findPivot)
      nextStep.call(this, [left, right])
    }
  }


}

function findPivot(left, right){
    this.pivot = left + Math.ceil((right - left) * 0.5);
    this.pivotValue = this.order[this.pivot].hertz 

    this.order[this.pivot].noteSurface.setProperties({backgroundColor: 'red'})
    steps.push(putPivotOnRight)
    nextStep.call(this, [left, right])
}

function putPivotOnRight(left, right){
  swap.call(this, this.pivot, right, sortBasedOnPivot, [left,right])
}

function swap(index1, index2, next, args){
     var temp = this.order[index1];
     this.order[index1] = this.order[index2];
     this.order[index2] = temp
     
     var newX1 = this.notesXLocations[index1]
     var newX2 = this.notesXLocations[index2]

     this.order[index1].noteMod.setTransform(Transform.translate(newX1,0,0), this.snap)
     this.order[index2].noteMod.setTransform(Transform.translate(newX2,0,0), this.snap)
    
    if(next){
       steps.push(next)
       nextStep.call(this, args)
    } 
  
}

function sortBasedOnPivot(left, right){
  var storeIndex = left;
  
  compareEach.call(this)

  var tempLeft = left; 
  function compareEach(){
    Timer.setTimeout(function(){   
      
      if(tempLeft === right){
        swap.call(this, right, storeIndex, initSort, [left, right, storeIndex])  
      }
        
      if(tempLeft < right){

        if(this.order[tempLeft].hertz < this.pivotValue){
          swap.call(this, tempLeft, storeIndex)
          storeIndex++
        }
      tempLeft++
      compareEach.call(this)
    }
      
        
      }.bind(this), timeBetweenNotes)
    }
   
}

function resetAll(){
    this.playing = false
    finished = false;
    this.checkArrayCounter = 0;
    this.swaps = 0;
    this.playing = true;
    this.colorMod = 2.5;
    
    this.order.forEach(function(item){
      var originIndex = item.index;
      var xTransform = this.notesXLocations[originIndex]
      item.noteMod.setTransform(Transform.translate(xTransform,0,0), spring)

      item.noteSurface.setProperties({ backgroundColor: "hsl(" + (item.hertz/this.colorMod) + ", 100%, 50%)"})
    
    }.bind(this))
      
          

    this.order.sort(function(a,b){
     return a.index - b.index
    })
    console.log(this.order)
    Timer.setTimeout(function(){
      steps.pop();
      steps.push(playAllNotes)
        
    }, timeBetweenSteps)

  
}  

//add listeners to DOM for sliders

Timer.setTimeout(function(){

document.getElementById('widthslider').onchange = function(){
    sizeWidth = this.value
    console.log(sizeWidth)
}


document.getElementById('heightslider').onchange = function(){
    sizeHeight = this.value
}

document.getElementById('speed').onchange = function(){
    timeBetweenSteps = 1010 - this.value
    timeBetweenNotes = 1010 - this.value
    compareTime = 1010 - this.value
}

document.getElementById('rotate').onchange = function(){
    rotateY = this.value
 
}

document.getElementById('translateZ').onchange = function(){
    translateZ = this.value

}


 



}, 1200);

  module.exports = NotesView;
});
