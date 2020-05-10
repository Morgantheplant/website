define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');

  function PlayButtonsView() {
    View.apply(this, arguments);
    this.stopped = true;
    
    
    _createPlayButtons.call(this)

  }

  PlayButtonsView.prototype = Object.create(View.prototype);
  PlayButtonsView.prototype.constructor = PlayButtonsView;

  PlayButtonsView.DEFAULT_OPTIONS = {};
  
  function _createPlayButtons() {
    var mainButton = new Surface({
      content: '<i class="fa fa-play"></i><br>PLAY',
      size:[50,50],
      properties: {
        //backgroundColor: 'green',
        fontSize: '14px',
        color: 'rgb(0,188,0)',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign:'center'

      }
    })
    
    mainButton.on('click', function(){
      console.log('clicked', this.stopped)
      if(this.stopped){
        this._eventOutput.emit('play')
        mainButton.setContent('<i class="fa fa-pause"></i><br>PAUSE')
        mainButton.setProperties({color:'red'})
        this.stopped = false;
      } else if(!this.stopped){
        this._eventOutput.emit('play')
        mainButton.setContent('<i class="fa fa-play"></i><br>PLAY')
        mainButton.setProperties({color:'rgb(0,188,0)'})
        this.stopped = true;
      }
    }.bind(this))

    this.add(mainButton)
  }

  module.exports = PlayButtonsView;
});
