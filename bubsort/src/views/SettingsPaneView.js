define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var HTMLcontent = require('data/slidersHTML')

  function SettingsPaneView() {
      View.apply(this, arguments);

      _createSettingsView.call(this)
      
  }

  SettingsPaneView.prototype = Object.create(View.prototype);
  SettingsPaneView.prototype.constructor = SettingsPaneView;

  SettingsPaneView.DEFAULT_OPTIONS = {};
  
  
  
  function _createSettingsView(){

    var contentMod = new StateModifier({
     transform: Transform.translate(78,0,1)
    })

    var contentZMod = new StateModifier({
      transform: Transform.inFront
    })

    var contentSurface = new Surface({
      size:[300,250],
      content: HTMLcontent,
      properties:{
        backgroundColor:'',
        borderRadius: '15px'
      }
    })

    var settingsPane = new Surface({
      size:[300,270],
      properties:{
       backgroundColor:'gray',
        borderRadius: '15px'
      }
    });

    

    this.add(settingsPane)
    this.add(contentZMod).add(contentMod).add(contentSurface)

  }

  module.exports = SettingsPaneView;
});
