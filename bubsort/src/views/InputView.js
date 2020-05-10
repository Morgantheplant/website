define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var InputSurface = require("famous/surfaces/InputSurface");
  var SpringTransition = require('famous/transitions/SpringTransition');
  var SnapTransition = require('famous/transitions/SnapTransition');
  var Transitionable = require('famous/transitions/Transitionable');
  var Timer = require('famous/utilities/Timer');
  Transitionable.registerMethod('snap', SnapTransition);
  Transitionable.registerMethod('spring', SpringTransition);

  function InputView() {
    View.apply(this, arguments);
    this.playlistShowing = false;
    
    this.spring = {
      method: 'spring',
      period: 400,
      dampingRatio: 0.4
    }
     this.snap = {
      method: 'snap',
      period: 200,
      dampingRatio: 0.2
    }
    _createInput.call(this)
    _createPanal.call(this)
  }

  InputView.prototype = Object.create(View.prototype);
  InputView.prototype.constructor = InputView;

  InputView.DEFAULT_OPTIONS = {};

  function _createInput(){

    var inputButton = new Surface({
      size: [120,25],
      content: 'Enter Music',
      properties: {
            backgroundColor: 'rgba(0, 255, 196, 0.78)',
            color: 'rgb(64,64,64)',
            textAlign: 'center',
            borderRadius: '5px',
            paddingTop:'5px',
            fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 'bold'
        }
    })

    var inputModifier = new StateModifier({
      transform: Transform.translate(0,30,0)
    })

    this.inputSurface = new InputSurface({
      size:[300,25],
      name: 'inputSurface',
      placeholder: 'Enter Notes: ie. A4, C4, G#2',
      value: '',
      type: 'text',
      properties: {
        backgroundColor: 'grey',
        borderRadius:'5px',
        fontWeight: '20px'
      }
    })
    
    inputButton.on('click', function(){
      this.getValue()
    }.bind(this))
    
    var playlistIconMod = new StateModifier({
      transform: Transform.translate(167,3,0)
    })



    var playlistIcon = new Surface({
      size:[25,25],
      content:'<i class="fa fa-list-ul"></i>',
      properties: {
        color: 'gray'
      }
    })
    
    //show and hide playlist next to input
    playlistIcon.on('click', function(){

      if(!this.playlistShowing){
        this.panelAnimateMod.halt()
        this.panelAnimateMod.setTransform(Transform.rotate(0,0,0), this.spring)
        this.playlistShowing = true;
        return
      }
      if(this.playlistShowing){
        this.panelAnimateMod.halt()
        this.panelAnimateMod.setTransform(Transform.rotate(0,-1.50,0), {
      method: 'spring',
      period: 400,
      dampingRatio: 0.4
    })
        this.playlistShowing = false;
        return
      }
    }.bind(this))

  
    this.add(this.inputSurface)
    this.add(inputModifier).add(inputButton)
    this.add(playlistIconMod).add(playlistIcon)

  }

  function _createPanal(){
    var westminsterChimes = ['E4','G#4','F#4','B3','E4','F#4','G#4', 'E4']
    var yankeeDoodle = ['C4','C4','D4','E4','C4','E4','D4', 'G4', 'C4','C4','D4','E4','C4','B4']
    var oldMacDonald = ['G4','G4','G4','D4','E4','E4','D4','B4','B4','A4','A4','G4']
    
    var buttonX = 120;
    var buttonY = 25;
    var offsetY = 5;

    var panelSurface = new Surface({
      size:[140,100],
      properties:{
        backgroundColor: 'gray',
        borderRadius:'10px'
      }
    })
   
    this.panelAnimateMod = new StateModifier({
      transform: Transform.rotate(0,-1.5,0)
    })
    
    //panel background that extends from playlist button
    var panelMod = new StateModifier({
      transform: Transform.translate(256,20,0)
    })

    var triangleMod = new StateModifier({
      transform: Transform.translate(-70,-30,0)
    })
    var triangle = new Surface({
      size:[25,25],
      content:'<i class="fa fa-caret-left"></i>',
      properties:{
        color:'grey',
        fontSize:'40px'
      }
    })
    
    //modifier for all the buttons, can add an animation here later
    this.buttonsMod = new StateModifier({
       transform: Transform.translate(0,-67,0)
    })
    
    //buttons each have a modifier so they can be animated later
    var westMod = new StateModifier({
      transform: Transform.translate(0,0,0)
    })
    var westSurface = new Surface({
       size:[buttonX, buttonY],
       content:'WM Chimes',
       properties: {
        backgroundColor: 'teal',
        color: 'white',
        textAlign: 'center',
        borderRadius: '5px',
        paddingTop:'5px',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        fontSize: '14px',
        cursor: 'pointer'
      }
    })
    
    westSurface.on('click', function(){
      this.inputSurface.setValue('')
      this.inputSurface.setValue(westminsterChimes.toString())
    }.bind(this))

    var yankMod = new StateModifier({
      transform: Transform.translate(0,30,0)
    })
    
    var yankSurface = new Surface({
      size:[buttonX, buttonY],
      content: 'Yankee Doodle',
      properties: {
        backgroundColor: 'teal',
        color: 'white',
        textAlign: 'center',
        borderRadius: '5px',
        paddingTop:'5px',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        fontSize: '14px',
        cursor: 'pointer'
      }
    })

     yankSurface.on('click', function(){
      this.inputSurface.setValue('')
      this.inputSurface.setValue(yankeeDoodle.toString())
    }.bind(this))

    var oldMacMod = new StateModifier({
      transform: Transform.translate(0,60,0)
    })

    var oldMacSurface = new Surface({
      size:[buttonX, buttonY],
      content:'Old MacDonald',
      properties: {
        backgroundColor: 'teal',
        color: 'white',
        textAlign: 'center',
        borderRadius: '5px',
        paddingTop:'5px',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        fontSize: '14px',
        cursor: 'pointer'
      }
    })

     oldMacSurface.on('click', function(){
      this.inputSurface.setValue('')
      this.inputSurface.setValue(oldMacDonald.toString())
    }.bind(this))

    var node = this.add(this.panelAnimateMod).add(panelMod)
    node.add(panelSurface)

    node.add(triangleMod).add(triangle)

    var buttonsBranch = node.add(this.buttonsMod)
    buttonsBranch.add(westMod).add(westSurface)
    buttonsBranch.add(yankMod).add(yankSurface)
    buttonsBranch.add(oldMacMod).add(oldMacSurface)
  }

  InputView.prototype.getValue = function() {
    //grabs music text from input
    var text = this.inputSurface.getValue();
    //simple conversion to readable string
    var musicAry = text.replace(/\s/g, '').split(',')
    
    musicAry.forEach(function(item){
      //all note must be a length of 3, need to fix data checking from field
      if(item.length>3){
        alert('invalid entry')
        this.inputSurface.setValue('')
        return
      }
    }.bind(this))
    this.inputSurface.setValue('')
      this._eventOutput.emit('sheet_music', {music: musicAry})
  }
  module.exports = InputView;
});
