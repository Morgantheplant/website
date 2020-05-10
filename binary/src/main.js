define(function(require, exports, module) {
  var Engine = require('famous/core/Engine');

  var AppView = require('views/AppView');
  var Transitionable = require('famous/transitions/Transitionable');
  var WallTransition = require('famous/transitions/SpringTransition');
  var Easing = require('famous/transitions/Easing');

  Transitionable.registerMethod('wall', WallTransition);

  var wall = {
    method: 'wall',
    period: 500,
    dampingRatio: 0.4
  };
  


  var mainContext = Engine.createContext();
  mainContext.setPerspective(0);

  setTimeout(function(){
  	initApp()
  }, 10);

  function initApp(data) {
      
    var appView = new AppView();

    mainContext.add(appView);
    
    var state = new Transitionable(0);
    state.set(1000, {duration : 500});
  
    var state2 = new Transitionable(0);
    state.set(1000, {duration : 500});



   

    appView.on('hide_modal', function(){
      mainContext.setPerspective(2000)
    })

    appView.on('show_modal', function(){
      mainContext.setPerspective(0)
    })
    
   
  }
});
