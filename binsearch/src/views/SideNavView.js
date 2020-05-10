define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var InputSurface = require('famous/surfaces/InputSurface');
  var PlayButtonsView = require('views/PlayButtonsView');
  var ControlsPanelView = require('views/ControlsPanelView')
  var SettingsPanelView = require('views/SettingsPanelView')
  
  function SideNavView() {
    View.apply(this, arguments);
    _createMainPanel.call(this);
    _createButtons.call(this);
    _createInputSurface.call(this);
    _currentNumberDisplay.call(this);
    _createPlayButtons.call(this);
    _createControlsPanel.call(this);
    _createSettingsPanel.call(this)
  }

  SideNavView.prototype = Object.create(View.prototype);
  SideNavView.prototype.constructor = SideNavView;

  SideNavView.DEFAULT_OPTIONS = {};

  var spring = {
    method: 'spring',
    period: 500,
    dampingRatio: 0.3
  };

  function _createMainPanel() {

    var backPanelMod = new StateModifier({
      size:[150,290],
      align: [0.01, 0.03]
    })
   
    var backPanel = new Surface({
      size: [150,270],
      content: '<div class="mainPanel"></div>',
      properties: {
        borderRadius: '10px',
        backgroundColor: '#fa5c4f'
      }
    });

    this.node = this.add(backPanelMod)
    this.node.add(backPanel)
   
  }

  function _createControlsPanel(){
    this.constrolsPanelMod = new StateModifier({
      transform: Transform.translate(-2,164,250)
    })

    this.controlsPanel = new ControlsPanelView()

    this.node.add(this.constrolsPanelMod).add(this.controlsPanel)
  }
  
   function _createSettingsPanel(){
    this.settingsPanelMod = new StateModifier({
      transform: Transform.translate(-2,10,10)
    })

    this.settingsPanel = new SettingsPanelView()

    this.settingsPanel.on('settings_info', function(data){
      this._eventOutput.emit('settings_info', data)
    }.bind(this))

    this.node.add(this.settingsPanelMod).add(this.settingsPanel)
  }


  function _createButtons(){

     /******* About Button *******/

    var aboutButtonMod = new StateModifier({
      transform: Transform.translate(24,20,1)
    })
    
    var aboutButton = new Surface({
      size:[100,25],
      content:'About',
      className: 'navButton',
      properties: {
        backgroundColor: '#fa5c4f',
        color: 'white',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        textAlign: 'center',
        borderRadius: '5px',
        paddingTop:'5px',
        cursor: 'pointer'
      }
    })
    
    this.node.add(aboutButtonMod).add(aboutButton)

    aboutButton.on('click', function(){
      this._eventOutput.emit('show_modal')
    }.bind(this))

    /******* New Board Button *******/
    
    var newBoardMod = new StateModifier({
      transform: Transform.translate(24,50,1)
    })

    this.newBoardButton = new Surface({
      size:[100, 25],
      content: 'New Board',
      properties: {
        backgroundColor: '#fa5c4f',
        textAlign:'center',
        borderRadius: '5px',
        color: 'white',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        paddingTop:'4px',
        cursor:'pointer'
      }
    })
    
    
    this.node.add(newBoardMod).add(this.newBoardButton)

  }

  function _createInputSurface(){

    var input = new InputSurface({
      size:[100,25],
      name: 'inputSurface',
      placeholder: 'Enter Number',
      value: '',
      type: 'text',
      properties: {
        backgroundColor: 'grey',
        borderRadius:'5px',
        fontWeight: '20px'
      }
    })

    var inputMod = new StateModifier({
      transform: Transform.translate(24,80,0)
      
    })

    this.node.add(inputMod).add(input)
    
    var inputButton = new Surface({
      size:[100, 25],
      content: 'Enter',
      properties: {
        backgroundColor: '#fa5c4f',
        textAlign:'center',
        borderRadius: '5px',
        color: 'white',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        paddingTop:'4px',
        cursor:'pointer'
      }
    })
    
    var inputButtonMod = new StateModifier({
      transform: Transform.translate(24,108,0)
    })

    this.node.add(inputButtonMod).add(inputButton)

    inputButton.on('click', function(){
      var text = input.getValue();
      if(text.length === 0){
        alert('Enter a number to see if it\'s in the New Board!') 
      } else if(+text > 0 && +text < 1601){
         this._eventOutput.emit('entered_number', {value:text})
         input.setValue('')
      } else {
        alert('enter a number between 1 and 1200')
        input.setValue('')
      }
    }.bind(this))

  }


  function _currentNumberDisplay(){
    var targetNumberText = '<br><div class="targetNumberText">TARGET NUMBER</div>'
    
    this.numberDisplayMod = new StateModifier({
      origin:[0.5,0.5],
      transform: Transform.translate(73,195,0)
    })
    

    this.numberDisplay = new Surface({
      size:[100,100],
      content:'200' + targetNumberText,
      properties: {
        color: 'black',
        fontSize: '40px',
        textAlign: 'center'     
      }
    }) 
    
    this.node.add(this.numberDisplayMod).add(this.numberDisplay)
    
    this._eventOutput.on('entered_number', function(data){
      this.numberDisplay.setContent(data.value + targetNumberText)
    }.bind(this))
  }


  function _createPlayButtons(){
    var playButtonsMod = new StateModifier({
      transform: Transform.translate(-8,220,1)
    })
    var playButtonsView = new PlayButtonsView()
    this.node.add(playButtonsMod).add(playButtonsView)

    playButtonsView.on('reload', function(){
      this.controlsPanel._eventInput.trigger('reload')
      this._eventOutput.emit('reload')
    }.bind(this));
    
    playButtonsView.on('next', function(){
      this.controlsPanel._eventInput.trigger('next')
      this._eventOutput.emit('next')
    }.bind(this));

    playButtonsView.on('play', function(){
      this.controlsPanel._eventInput.trigger('play')
      this._eventOutput.emit('play')
    }.bind(this))

    playButtonsView.on('pause', function(){
      this.controlsPanel._eventInput.trigger('pause')
      this._eventOutput.emit('pause')
    }.bind(this))

    playButtonsView.on('show_settings', function(){
      this.settingsPanel._eventInput.trigger('show_settings')
    }.bind(this))

    playButtonsView.on('hide_settings', function(){
      this.settingsPanel._eventInput.trigger('hide_settings')
    }.bind(this))

    this.newBoardButton.on('click', function(){
      this._eventOutput.emit('new_board')
      playButtonsView._eventInput.trigger('new_board')
    }.bind(this));


  }

  module.exports = SideNavView;
});
