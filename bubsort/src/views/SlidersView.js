define(function(require, exports, module) {
    var View = require('famous/core/View');
    var Surface = require('famous/core/Surface');
    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');
    var InputSurface = require("famous/surfaces/InputSurface");

    function SlidersView() {
        View.apply(this, arguments);
    }

    SlidersView.prototype = Object.create(View.prototype);
    SlidersView.prototype.constructor = SlidersView;

    SlidersView.DEFAULT_OPTIONS = {};

    function _createSliders(){

     this.inputSurface = new InputSurface({
      size:[300,25],
      name: 'inputSurface',
      type: 'text',
      properties: {
        backgroundColor: 'grey',
        borderRadius:'5px',
        fontWeight: '20px'
      }
    })

    }

    module.exports = SlidersView;
});
