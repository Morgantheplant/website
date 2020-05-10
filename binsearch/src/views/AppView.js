define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var GridView = require('views/GridView');
  var SideNavView = require('views/SideNavView');
  var ModalView = require('views/ModalView');
  var PlayButtonsView = require('views/PlayButtonsView');
  var MessageLogView = require('views/MessageLogView')
  var Modifier = require("famous/core/Modifier");
  var Draggable = require('famous/modifiers/Draggable');
  var Transitionable = require('famous/transitions/Transitionable');
  var SnapTransition = require('famous/transitions/SnapTransition');
  Transitionable.registerMethod('snap', SnapTransition);


  function AppView() {
    View.apply(this, arguments);
      this.targetNumber = 200;

     _createBlocks.call(this)
     _createSideNavView.call(this)
    _createModalView.call(this)
    _createMessageLogView.call(this)

  }

  AppView.prototype = Object.create(View.prototype);
  AppView.prototype.constructor = AppView;

  AppView.DEFAULT_OPTIONS = {};
  
  var snap = {
    duration: 800
  };

  function _createModalView(){
    var modalView = new ModalView()
    this.add(modalView)

    this._eventOutput.on('show_modal', function(){
      modalView._eventInput.trigger('show_modal')
    })
  }
  
  
  function _createMessageLogView(){
    this.messageLogMod = new Modifier({
      origin:[0.5,0.5],
      align:[0,0]
    })

    this.messageLogView = new MessageLogView()

    this.add(this.messageLogMod).add(this.messageLogView)
  }


  
  function _createBlocks(){


    this.blockPerspectiveMod = new StateModifier({
       transform: Transform.rotate(0,-.6,0),
       origin:[0.5,0.5]
    })

    this._eventOutput.on('play', function(){
      this.blockPerspectiveMod.setTransform(Transform.rotate(0,0,0), snap, function(){
        this._eventOutput.emit('set_perspective')
      }.bind(this))
    }.bind(this))

    this.blockMod = new StateModifier({
      size:[600,600],
      origin:[0.5,0.5],
      align:[.75,0.5]
    })

    this.gridView = new GridView()
    
    this.gridView.on('message', function(data){
      this.messageLogView._eventInput.trigger('message', data)
    }.bind(this))
    

    this.add(this.blockPerspectiveMod).add(this.blockMod).add(this.gridView)

  }

  function _createSideNavView(){
    
    var sideNavMod = new StateModifier()
    var sideNav = new SideNavView()

    

    this.add(sideNavMod).add(sideNav)
    
    //about button clicked
    sideNav.on('show_modal', function(){
      this.blockMod.setTransform(Transform.translate(0,0,-200))
      this._eventOutput.emit('show_modal')
    }.bind(this))
    
    sideNav.on('new_board', function(){
      var data = { value: this.targetNumber };
      this.gridView._eventInput.trigger('new_board', data)
      this.messageLogView._eventInput.trigger('new_board', data)
    }.bind(this))

    sideNav.on('settings_info', function(data){
      var target = { value: this.targetNumber };
      this.messageLogView._eventInput.trigger('new_board', target) 
      this.gridView._eventInput.trigger('settings_info', data)
    }.bind(this))

    sideNav.on('entered_number', function(data){
      this.targetNumber = data.value
      this.gridView._eventInput.trigger('reload', data)
      this.messageLogView._eventInput.trigger('reload', data)
    }.bind(this))

    sideNav.on('reload', function(){
      var data = { value: this.targetNumber };
      this.gridView._eventInput.trigger('reload', data)
      this.messageLogView._eventInput.trigger('reload', data)
    }.bind(this))

    sideNav.on('play', function(){
      var data = { value: this.targetNumber };
      this._eventOutput.trigger('play')
      this.gridView._eventInput.trigger('play', data)
    }.bind(this))

    sideNav.on('pause', function(){
      this.gridView._eventInput.trigger('pause')
    }.bind(this))

    sideNav.on('next', function(){
      this.gridView._eventInput.trigger('next')
    }.bind(this))

  }


  module.exports = AppView;
});
