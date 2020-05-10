define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');

  function LogHeadingView() {
      View.apply(this, arguments);
      
      this.startIndex = 1;
      this.middleIndex = ' ';
      this.endIndex = 100;

      this.mainMod = new StateModifier({
        size:[470,80],
        transform: Transform.translate(98,10,1)
      })

      this.node = this.add(this.mainMod)
      _createHeaderSquares.call(this)

      // this._eventInput.on('message', function(data){
      //   console.log(data, 'log view')
      // }.bind(this))
  }

  LogHeadingView.prototype = Object.create(View.prototype);
  LogHeadingView.prototype.constructor = LogHeadingView;

  LogHeadingView.DEFAULT_OPTIONS = {};
  
  function _createHeaderSquares(){
    var squareSize = 60;
    var offset = 25;
    this.font = '12px'
    this.topPadding = '5px'
    this.fontfamily = 'verdana'

    this.middleSquareMod = new StateModifier({
        transform: Transform.translate(0,0,1)
    })

    this.startSquare = new Surface({
      size:[squareSize,squareSize],
      content: 'START INDEX:<br><b>' + this.startIndex+'</b>',
      properties: {
        backgroundColor: 'green',
        fontFamily:this.fontfamily,
        textAlign:'center',
        boxShadow: '1px 1px 10px #000000',
        fontSize: this.font,
        paddingTop: this.topPadding
      }
    })

    this.endSquareMod = new StateModifier({
      transform: Transform.translate(squareSize + offset,0,1)
    })

    this.middleSquare = new Surface({
      size:[squareSize,squareSize],
      content: 'MIDDLE INDEX:<br><b>' + this.middleIndex+'</b>',
      properties: {
        backgroundColor: 'orange',
        fontFamily:this.fontfamily,
        textAlign:'center',
        boxShadow: '1px 1px 10px #000000',
        fontSize: this.font,
        paddingTop: this.topPadding
      }
    })
    
    this.startSquareMod = new StateModifier({
      transform: Transform.translate(-(squareSize + offset),0,0)
    })

    this.endSquare = new Surface({
      size:[squareSize,squareSize],
      content: 'END INDEX:<br><b>' + this.endIndex+'<b>',
      properties: {
        backgroundColor: 'green',
        fontFamily:this.fontfamily,
        textAlign:'center',
        boxShadow: '1px 1px 10px #000000',
        fontSize:this.font,
        paddingTop: this.topPadding
      }
    })


    this.node.add(this.startSquareMod).add(this.startSquare)
    this.node.add(this.middleSquareMod).add(this.middleSquare)
    this.node.add(this.endSquareMod).add(this.endSquare)
    
  }

  LogHeadingView.prototype.updateTitles = function(data){
    var middle = data.middle + 1 || ' ';

    // this.startSquare.setProperties({boxShadow:'none'})
    // this.middleSquare.setProperties({boxShadow:'none'})    
    // this.endSquare.setProperties({boxShadow:'none'})

      this.startSquare.setContent('START INDEX:<br><b> ' + (data.start+1)+'</b>')
      // this.startSquare.setProperties({boxShadow: '0px 0px 15px yellow'})


    
      this.middleSquare.setContent('MIDDLE INDEX:<br><b>' +middle+'</b>')
 
      this.endSquare.setContent('END INDEX:<br><b>' + (data.end+1)+'</b>')
   
  }

  module.exports = LogHeadingView;
});
