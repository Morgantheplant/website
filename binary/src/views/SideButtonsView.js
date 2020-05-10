define(function(require, exports, module) {
    var View = require('famous/core/View');
    var Surface = require('famous/core/Surface');
    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');
    var InputView = require('views/InputView') 
    
    function SideButtonsView() {
        View.apply(this, arguments);

        _createSideNav.call(this)
    }

    SideButtonsView.prototype = Object.create(View.prototype);
    SideButtonsView.prototype.constructor = SideButtonsView;

    SideButtonsView.DEFAULT_OPTIONS = {};

    function _createSideNav(){

      this.stopped = true;
      
      var sideNavMod = new StateModifier({
        align:[.01,0.01]
    })

    /******* Input Surface & Enter Button *******/
    
    var inputViewMod = new StateModifier({
      transform: Transform.translate(0,30,-200)
    });

    var inputView = new InputView();

    inputView.on('enter', function(data){
      this._eventOutput.emit('enter', data)
    }.bind(this))


    /******* About Button *******/

    var aboutButtonMod = new StateModifier({
      transform: Transform.translate(0,0,-200)
    });

    var aboutButton = new Surface({
      size:[100,25],
      content:'About',
      className: 'navButton',
      properties: {
        backgroundColor: '#fa5c4f',
        color: 'white',
        textAlign: 'center',
        borderRadius: '5px',
        paddingTop:'5px',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        fontSize: '14px',
        cursor: 'pointer'
      }
    })
      
    aboutButton.addClass('navButton')

    aboutButton.on('click', function(){
      this._eventOutput.emit('show_modal')
      inputViewMod.setTransform(Transform.translate(0,30,-200))
      aboutButtonMod.setTransform(Transform.translate(0,0,-200))
    }.bind(this))

    this._eventInput.on('hide_modal', function(){
      inputViewMod.setTransform(Transform.translate(0,30,0))
      aboutButtonMod.setTransform(Transform.translate(0,0,0))
    }) 

    var node = this.add(sideNavMod)
    
    node.add(inputViewMod).add(inputView)
    node.add(aboutButtonMod).add(aboutButton)
  
    }

    module.exports = SideButtonsView;
});
