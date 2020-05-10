define(function(require, exports, module) {
    var View = require('famous/core/View');
    var Surface = require('famous/core/Surface');
    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');
    var ContainerSurface = require('famous/surfaces/ContainerSurface')
    var Scrollview = require('famous/views/Scrollview')
    var Modifier = require("famous/core/Modifier");
    var Timer = require('famous/utilities/Timer');

    function ControlsPanelView() {
      View.apply(this, arguments);
      _createPanel.call(this)

      this._eventInput.on('play', function(){
        this.showPanel.call(this, 'PLAYING');
      }.bind(this))

      this._eventInput.on('pause', function(){
        this.showPanel.call(this, 'PAUSED');
      }.bind(this))

      this._eventInput.on('reload', function(){
        this.showPanel.call(this, 'RESTART');
      }.bind(this))

      this._eventInput.on('next', function(){
        this.showPanel.call(this, 'NEXT STEP')
      }.bind(this))
      
    }

    ControlsPanelView.prototype = Object.create(View.prototype);
    ControlsPanelView.prototype.constructor = ControlsPanelView;

    ControlsPanelView.DEFAULT_OPTIONS = {};
    
    function _createPanel(){

     var text = 'PLAYING';

     var container = new ContainerSurface({
         size: [105, 100],
         properties: {
             overflow: 'hidden'
         }
     });

      var panelMod = new StateModifier({
        align:[0,0.5],
        origin: [0,1],
        transform: Transform.translate(0,-50,0)
      })
     
      var panelSurface = new Surface({
        size:[105,200],
        content:'<div id="messagePanelText">'+text+'</div>',
        classes:['messagePanel'],
        properties:{
          backgroundColor: 'grey',
          borderRadius: '10px',
          color:'rgb(0, 188, 0)'
        }
      })

      var node = container.add(panelMod)
      node.add(panelSurface)
       
      this.add(new Modifier({
        align: [.5, .5],
        origin: [.5, .5]
      })).add(container);

      this.showPanel = function(message){
       
        if(message === 'PAUSED'){
          panelSurface.setProperties({color: 'rgb(247, 36, 19)'})
        }
        var text = '<div class="messagePanelText">'+message+'</div>'
        panelSurface.setContent(text)
        panelMod.setTransform(Transform.translate(0,0,0), {duration: 1200, method:'spring'})

        Timer.setTimeout(function(){
           panelMod.setTransform(Transform.translate(0,-50,0), {duration: 1200, method:'spring'})  
           if(message === 'PAUSED'){
             panelSurface.setProperties({color:'rgb(0, 188, 0)'})
           }

         }, 1500)
      }

     
     
      
      this.add(this.panelContainer).add(this.panelSurface)
    }


    module.exports = ControlsPanelView;
});
