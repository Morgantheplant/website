define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');

    var AppView = require('views/AppView');



    var mainContext = Engine.createContext();
    mainContext.setPerspective(500);

  
    	
   

    $(function(){ 
       initApp()
   
    
    });
    
    function initApp(data) {
        
        var appView = new AppView();

        mainContext.add(appView);
        
    }
  
   

});
