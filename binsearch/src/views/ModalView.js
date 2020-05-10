define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var Easing = require('famous/transitions/Easing');
  var Transitionable = require('famous/transitions/Transitionable');
  var WallTransition = require('famous/transitions/SpringTransition');
  var ModalText = require('data/modaltext')

  Transitionable.registerMethod('wall', WallTransition);

  var wall = {
    method: 'wall',
    period: 100,
    dampingRatio: 0.3
  };
  
  

  function ModalView() {

    View.apply(this, arguments);

    this._eventInput.on('show_modal', function(){
      this.showModal()
    }.bind(this))

    _createModal.call(this)
    
  }

  ModalView.prototype = Object.create(View.prototype);
  ModalView.prototype.constructor = ModalView;

  ModalView.DEFAULT_OPTIONS = {};

  function _createModal(){
    
    var modalPaneMod = new StateModifier({
       align:[0.5,0.5],
       origin:[0.5,0.5],
       size:[601,290],
       transform: Transform.rotate(Math.PI/2,0,-Math.PI/2)
    });
   
    var modalPaneModZ = new StateModifier({
       transform: Transform.translate(0,0,200)
    });

   
    var darkenMod = new StateModifier({
      opacity: 0.2
    })

    var darkenModZ = new StateModifier({
       transform: Transform.translate(0,0,100)
    });
  
    var darkener = new Surface({
      size:[undefined, undefined],
      properties: {
      //  backgroundColor: 'black'
      }
    })

    this.hideModal = function(){
      var wallExit = {
        method: 'wall',
        period: 100,
        dampingRatio: 0.8
      }

      modalPaneMod.setTransform(Transform.rotate(-Math.PI/2,0,Math.PI/2), wallExit, function(){
         modalPaneMod.setOpacity(0)
      });

      darkenMod.setOpacity(0,  { duration : 500, curve: Easing.inQuad }, function(){
        this._eventOutput.emit('hide_modal')
      }.bind(this))

      darkener.setProperties({pointerEvents:'none'})
      this.modalButton.setProperties({pointerEvents:'none'})

     
    }

    this.showModal = function(){
     modalPaneMod.setOpacity(1)
     modalPaneMod.setTransform(Transform.rotate(0,0,0), wall)
     darkenMod.setOpacity(.6,  { duration : 900, curve: Easing.inQuad })
     this.modalButton.setProperties({pointerEvents:'auto'})
     darkener.setProperties({pointerEvents:'auto'})
    }
   

   this.add(darkenModZ).add(darkenMod).add(darkener)
   this.modalNode = this.add(modalPaneModZ).add(modalPaneMod)
  
   _createModalButtons.call(this)
   
   this.showModal();

    darkener.on('click', function(){
      this.hideModal();
    }.bind(this))

  }

  function _createModalButtons(){
    
    var modalMainView = new View()

     var modalButtonModZ = new StateModifier({
      transform: Transform.translate(0,0,1)
    })
    
    var modalButtonMod = new StateModifier({
      align: [.96,.06],
      origin: [0.5,0.5]
    })

    this.modalButton = new Surface({
      size:[25,25],
      content: 'x',
      properties: {
        color: '#f2f2f0',
        backgroundColor: '#404040',
        borderRadius: '12.5px',
        paddingLeft: '5px',
        color: 'white',
        border: '2px solid white',
        fontFamily: 'verdana',
        fontWeight:'bold',
        textSize: '10px',
        cursor: 'pointer'
      }
    })

     var modalPane = new Surface({   
      size: [601, 290],
      content: ModalText,
      properties: {
        backgroundColor: '#fa5c4f',
        color: 'white',
        textAlign: 'center',
        borderRadius: '10px',
        paddingTop:'6px',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        fontSize: '12px'
      }
    });

    this.modalButton.on('click', function(){
      this.hideModal();
    }.bind(this))

   modalMainView._add(modalPane)   
   modalMainView._add(modalButtonModZ).add(modalButtonMod).add(this.modalButton)
    
    this.modalNode.add(modalMainView)
  }
  


  module.exports = ModalView;
});
