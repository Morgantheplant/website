define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var InputSurface = require("famous/surfaces/InputSurface");

  function InputView() {
    View.apply(this, arguments);
    
    _createInput.call(this)

  }

  InputView.prototype = Object.create(View.prototype);
  InputView.prototype.constructor = InputView;

  InputView.DEFAULT_OPTIONS = {};

  function _createInput(){

    var inputButton = new Surface({
      size: [100,25],
      content: 'Enter Number',
      properties: {
            backgroundColor: '#fa5c4f',
            color: 'white',
            textAlign: 'center',
            borderRadius: '5px',
            paddingTop:'5px',
            fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
            fontSize: '14px',
            cursor: 'pointer'
        }
    })

    var inputModifier = new StateModifier({
      transform: Transform.translate(0,30,0)
    })

    this.inputSurface = new InputSurface({
      size:[100,25],
      name: 'inputSurface',
      placeholder: 'Enter Number',
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
  
    this.add(this.inputSurface)
    this.add(inputModifier).add(inputButton)

  }

  InputView.prototype.getValue = function() {
    var text = this.inputSurface.getValue();
    if(text.length === 0){
      alert('enter a number between 0 and 256') 
    } else if(+text >= 0 && +text < 256){
       this._eventOutput.emit('enter', {value:text})
    } else {
      alert('enter a number between 0 and 256')

    }
  }
  
  module.exports = InputView;
});
