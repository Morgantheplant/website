define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');

  function PlayButtonsView() {
    View.apply(this, arguments);
    this.stopped = true;
    
    this.offset = 3;
    this.startX = 0;
    this.baseSize = 25;

    _createSettingsButton.call(this,1)
    _createReloadButton.call(this, 2)
    _createPlayButtons.call(this, 3)
    _createNextButton.call(this, 4)

  }

  PlayButtonsView.prototype = Object.create(View.prototype);
  PlayButtonsView.prototype.constructor = PlayButtonsView;

  PlayButtonsView.DEFAULT_OPTIONS = {};

  function _createSettingsButton(position){
    
    var xPos = ((this.baseSize * position) + (this.offset * position));

    var settingsMod = new StateModifier({
       transform: Transform.translate(xPos,0,0)
    })
    
     var settingButton = new Surface({
      content: '<i class="fa fa-cog"></i>',
      size:[25,25],
      properties: {
        fontSize: '24px',
        color: 'rgb(128, 128, 128)',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign:'center',
        cursor: 'pointer'
      }
    })

    
    settingButton.on('click', function(){
      if(this.paneHidden){
        this._eventOutput.emit('show_settings')
        settingButton.setProperties({color:'black'})
        this.paneHidden = false;
      } else if(!this.paneHidden){
        this._eventOutput.emit('hide_settings')
        settingButton.setProperties({color:'rgb(128, 128, 128)'})
        this.paneHidden = true;
      }
    }.bind(this))

    this.add(settingsMod).add(settingButton)
  }

  
  function _createPlayButtons(position) {
    var xPos = ((this.baseSize * position) + (this.offset * position));

    var playButtonMod = new StateModifier({
      transform: Transform.translate(xPos,0,0)
    })

    this.playButton = new Surface({
      content: '<i class="fa fa-play"></i>',
      size:[25,25],
      properties: {
        fontSize: '24px',
        color: 'rgb(0,188,0)',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign:'center',
        cursor: 'pointer'
      }
    })
    
    this.playButton.on('click', function(){
      if(this.stopped){
        this._eventOutput.emit('play')
        this.playButton.setContent('<i class="fa fa-pause"></i>')
        this.playButton.setProperties({color:'red'})
        this.nextButton.setProperties({color:'rgb(128, 128, 128)', cursor:'default'})
        this.stopped = false;
      } else if(!this.stopped){
        this._eventOutput.emit('pause')
        this.playButton.setContent('<i class="fa fa-play"></i>')
        this.playButton.setProperties({color:'rgb(0,188,0)'})
        this.nextButton.setProperties({color:'rgb(0, 188, 0)', cursor:'pointer'})
        this.stopped = true;
      }
    }.bind(this))

     this._eventInput.on('new_board', function(){
      console.log('here')
      if(!this.stopped){
        this.playButton.setContent('<i class="fa fa-play"></i>')
        this.playButton.setProperties({color:'rgb(0,188,0)'})
        this.nextButton.setProperties({color:'rgb(0, 188, 0)', cursor:'pointer'})
        this.stopped = true;
      }
    }.bind(this))


    this.add(playButtonMod).add(this.playButton)
  }

  function _createReloadButton(position){
    var xPos = ((this.baseSize * position) + (this.offset * position));

    var reloadButtonMod = new StateModifier({
      transform: Transform.translate(xPos,0,0)
    })
    
    var reloadButton = new Surface({
      content: '<i class="fa fa-rotate-right"></i>',
      size:[25,25],
      properties: {
        fontSize: '24px',
        color: 'rgb(0,188,0)',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign:'center',
        cursor: 'pointer'
      }
    })
    
    reloadButton.on('click', function(){
      this._eventOutput.emit('reload')
      if(!this.stopped){
        this.playButton.setContent('<i class="fa fa-play"></i>')
        this.playButton.setProperties({color:'rgb(0,188,0)'})
        this.nextButton.setProperties({color:'rgb(0, 188, 0)', cursor:'pointer'})
        this.stopped = true;
      }
    }.bind(this))

    this.add(reloadButtonMod).add(reloadButton)
  }

  function _createNextButton(position){
    var xPos = ((this.baseSize * position) + (this.offset * position));

    var nextButtonMod = new StateModifier({
      transform: Transform.translate(xPos,0,0)
    })
    this.nextButton = new Surface({
      content: '<i class="fa fa-step-forward"></i>',
      size:[25,25],
      properties: {
        fontSize: '24px',
        color: 'rgb(0,188,0)',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign:'center',
        cursor: 'pointer'
      }
    })
    
    this.nextButton.on('click', function(){
      if(this.stopped){
        this._eventOutput.emit('next')
      }
    }.bind(this))

    this.add(nextButtonMod).add(this.nextButton)

  }

  module.exports = PlayButtonsView;
});
