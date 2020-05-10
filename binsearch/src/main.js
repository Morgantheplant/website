define(function(require, exports, module) {
    var Engine = require('famous/core/Engine');
    //var Utility = require('famous/utilities/Utility');

    var AppView = require('views/AppView');
   // var SlideData = require('data/SlideData');



    var mainContext = Engine.createContext();
    mainContext.setPerspective(2000);

    setTimeout(function(){
    	initApp()
    }, 10);

    function initApp(data) {
        
        var appView = new AppView();

        appView.on('set_perspective', function(){
            mainContext.setPerspective(0)
        })

        mainContext.add(appView);
        
    }
});
