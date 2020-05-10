define(function(require, exports, module) {
    var View = require('famous/core/View');
    var Surface = require('famous/core/Surface');
    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');

    function TitleView() {
        View.apply(this, arguments);

        _createTitle.call(this)
    }

    TitleView.prototype = Object.create(View.prototype);
    TitleView.prototype.constructor = TitleView;

    TitleView.DEFAULT_OPTIONS = {};

    function _createTitle(){
      
      var names = {
        1: 'Bit',
        4:'Nibble',
        8: 'Byte'
      }
      
      //look up name or add 'n'-bit to title
      var typeShown = this.options.bits > 8 ? this.options.bits + '-bit' : names[this.options.bits]; 
     
      //sum all cards in collection and add 1 for zero
      var possibleValues = this.options.cardCollection.reduce(function(previousValue, currentValue, index, array) {
         return previousValue + currentValue;
      }, 1);
      

      
      var title = new Surface({
        size: [undefined,100],
        content: 'A ' + typeShown +' has ' + this.options.bits + ' bits and '+ possibleValues + ' possible values',
        properties: {
          fontSize: '22px',
          color: 'red',
          textAlign: 'center',
          fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
          color: 'rgb(245, 245, 245)'
        }
      })

      var numberMod = new StateModifier({
        transform: Transform.translate(121,26,0)
      })

      var numberAnimateMod = new StateModifier()

      var number = new Surface({
        size: [25,25],
        content: '',
        properties: {
          fontSize: '22px',
          color: 'red',
          textAlign: 'center',
          fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
          color: 'rgb(245, 245, 245)'
        }
      })

      this.add(title)
      this.add(numberAnimateMod).add(numberMod).add(number);

      this._eventInput.on('increment', function(data){
        var newContent = 'A ' + typeShown +' has ' + this.options.bits + ' bits and '+ possibleValues + ' possible values.' + '<br> <b id="number">Current number shown: </b>255';
        number.setContent(data.counter)
        title.setContent(newContent)
      }.bind(this))
      
      this._eventInput.on('move_title', function(){
        numberAnimateMod.setTransform(Transform.translate(121,26,0))
        numberAnimateMod.setOpacity(1)
        number.setProperties({textShadow: '0px 0px 10px yellow'})
        numberAnimateMod.setTransform(Transform.translate(121,-10,0), {duration:500}, function(){
          numberAnimateMod.setOpacity(0)
          numberAnimateMod.setTransform(Transform.translate(121,26,0), {duration:300})
          number.setProperties({textShadow: 'none'}) 

        })
      })

    }

    module.exports = TitleView;
});
