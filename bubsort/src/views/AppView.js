define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var NotesView = require('views/NotesView');
  var PlayButtonsView = require('views/PlayButtonsView');
  var SettingsPaneView = require('views/SettingsPaneView');
  var InputView = require('views/InputView')
  var SpringTransition = require('famous/transitions/SpringTransition');
  var Transitionable = require('famous/transitions/Transitionable');
  Transitionable.registerMethod('spring', SpringTransition);

  function AppView() {
    View.apply(this, arguments);
      this.targetNumber = 200;   
    _createNotes.call(this)
    _createPlayButtons.call(this)
    _createSettingsPaneView.call(this)
    _createInputView.call(this)
  
   this.spring = {
    method: 'spring',
    period: 400,
    dampingRatio: 0.4
  };
    
  }

  AppView.prototype = Object.create(View.prototype);
  AppView.prototype.constructor = AppView;

  AppView.DEFAULT_OPTIONS = {};

  function _createSettingsPaneView(){

    this.settingsPaneMod = new StateModifier({
      align:[0,0.5],
      origin:[0.38,0.5],
      transform: Transform.translate(-300,0,0)
    })
  

    this.settingsPaneView = new SettingsPaneView()
    
    this.add(this.settingsPaneMod).add(this.settingsPaneView)

  }

  function _createInputView(){
    this.inputView = new InputView()
    
    this.inputView._eventOutput.on('sheet_music', function(data){
      console.log(data)
      this.notesView.refresh(data)
    }.bind(this))


    var musicOpacityMod = new StateModifier({
    })
    
    var enterMusicIcon = new Surface({
      size:[25,25],
      origin:[0.5,0.5],
      content:'<i class="fa fa-music"></i>',
      properties:{
        fontSize: '36px',
        color:'gray',
      }
    })
    
    

    var inputViewMod = new StateModifier({
      align:[0.5,.95],
      origin:[0.5,1]
       
    })
    
    var inputOpacityMod = new StateModifier({
      transform: Transform.scale(0,0,0),
      opacity:0
    })
    enterMusicIcon.on('click', function(){
      musicOpacityMod.setOpacity(0)
      inputOpacityMod.setOpacity(1)
     inputOpacityMod.setTransform(Transform.scale(1,1,1), this.spring)
    }.bind(this))

    var node = this.add(inputViewMod)
    node.add(inputOpacityMod).add(this.inputView);
    node.add(musicOpacityMod).add(enterMusicIcon)
  }

  function _createNotes(){
    
    this.notesMod = new StateModifier({
       align:[0.5,0.5],
       origin:[0.5,0.5]
    });
    
    this.notesView = new NotesView()
    
    this.add(this.notesMod).add(this.notesView)
    
   
  }
  
  function _createPlayButtons() {
    
    var playButtonsModifier = new StateModifier({
      size:[200,300],
      align:[0,.9]
    })

    var playButtons = new PlayButtonsView();
    
    playButtons.on('play', function(){
      this.notesView._eventInput.trigger('play')
    }.bind(this))
    
    playButtons.on('pause', function(){
      this.notesView._eventInput.trigger('pause')
    }.bind(this))

    playButtons.on('next', function(){
      this.notesView._eventInput.trigger('next')
    }.bind(this))

     playButtons.on('reset', function(){
      this.notesView._eventInput.trigger('reset')
    }.bind(this))
    
    playButtons.on('show_settings', function(){
      this.settingsPaneMod.setTransform(Transform.translate(-50,0,0), this.spring)
    }.bind(this))

    playButtons.on('hide_settings', function(){
      this.settingsPaneMod.setTransform(Transform.translate(-300,0,0), this.spring)
    }.bind(this))

    this.add(playButtonsModifier).add(playButtons)
  }


  module.exports = AppView;
});
