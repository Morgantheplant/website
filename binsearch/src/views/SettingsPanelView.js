define(function(require, exports, module) {
    var View = require('famous/core/View');
    var Surface = require('famous/core/Surface');
    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');
    var ContainerSurface = require('famous/surfaces/ContainerSurface')
    var Scrollview = require('famous/views/Scrollview')
    var Modifier = require("famous/core/Modifier");
    var Timer = require('famous/utilities/Timer');
    var Transitionable = require('famous/transitions/Transitionable');
    var SpringTransition = require('famous/transitions/SpringTransition');
    
    Transitionable.registerMethod('spring', SpringTransition);



    function SettingsPanelView() {

      View.apply(this, arguments);
      _createSettingsPanel.call(this)

      this._eventInput.on('show_settings', function(){
        this.showSettingsPanel();
      }.bind(this))

      this._eventInput.on('hide_settings', function(){
        this.hideSettingsPanel();
      }.bind(this))

     
    }

    SettingsPanelView.prototype = Object.create(View.prototype);
    SettingsPanelView.prototype.constructor = SettingsPanelView;

    SettingsPanelView.DEFAULT_OPTIONS = {};
    
    var spring = {
      method: 'spring',
      period: 800,
      dampingRatio: 0.7
    };
    
    function _createSettingsPanel(){

     
     this.container = new ContainerSurface({
         size: [105, 150],
         properties: {
             overflow: 'hidden'
         }
     });
      

      this.settingsPanelMod = new StateModifier({
        align:[-.1,0],
        origin: [0,0],
        transform: Transform.translate(-150,0,0)
      })
     
      this.settingsPanelSurface = new Surface({
        size:[undefined,undefined],
        content: '<div class="settings">SPEED:<input id="timeBetween" type="range" min="500" max="2000"></input><br>MIN SQUARES:<input id="minSquares" type="text"></input><i class="fa fa-toggle-off-2x"></div>',
        properties:{
          backgroundColor: 'grey',
          borderRadius: '10px',
          color:'rgb(0, 188, 0)',
          backgroundImage: 'linear-gradient( to right, #616161,gray)'
        }
      })
      
      this.submitButtonMod = new StateModifier({
        transform: Transform.translate(20,105,0)
      })

      this.submitButton = new Surface({
        size:[80,25],
        content:'SUBMIT',
        properties:{
          backgroundColor:'rgb(227, 221, 216)',
          fontFamily:'verdana',
          fontSize:'10px',
          borderRadius:'5px',
          textAlign: 'center',
          paddingTop:'6px',
          cursor:'pointer'
        }
      })

      this.submitButton.on('click', function(){
        var text = document.getElementById('minSquares').value;
        if(text.toString().length>3 || +text > 100 || +text < 1){
          alert('enter a valid number between 1 and 100')
        } else{
          var timeBetween = document.getElementById('timeBetween').value
        console.log(text, timeBetween)
          this._eventOutput.emit('settings_info', {timebetween:timeBetween, min: text})
        }

      }.bind(this))
  
      var node = this.container.add(this.settingsPanelMod)
      node.add(this.settingsPanelSurface)
      node.add(this.submitButtonMod).add(this.submitButton)
       

      this.add(new Modifier({
        align: [1, 0],
        origin: [0, 0],
        transform: Transform.translate(-9,9,0)
      })).add(this.container);

    
      Timer.setTimeout(function(){
        this.hideSettingsPanel()
      }.bind(this), 1000)
      
      this.add(this.panelContainer).add(this.panelSurface)
    }


  SettingsPanelView.prototype.showSettingsPanel = function(){
    this.settingsPanelMod.setTransform(Transform.translate(0,0,0), spring);
  }
      
  SettingsPanelView.prototype.hideSettingsPanel = function(){
    this.settingsPanelMod.setTransform(Transform.translate(-150,0,0), spring)
  }

    module.exports = SettingsPanelView;
});
