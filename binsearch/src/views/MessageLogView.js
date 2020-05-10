define(function(require, exports, module) {
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Transform = require('famous/core/Transform');
  var StateModifier = require('famous/modifiers/StateModifier');
  var ContainerSurface = require("famous/surfaces/ContainerSurface");
  var Scrollview = require("famous/views/Scrollview");
  var Modifier = require("famous/core/Modifier");
  var Draggable = require('famous/modifiers/Draggable');
  var LogHeadingView = require('views/LogHeadingView')

  function MessageLogView() {
    View.apply(this, arguments);
    _createMessageLog.call(this)
    _createHeaderContent.call(this)

    this.stepCounter = 0;


    this._eventInput.on('reload', function(data){
      this.reload(data)
    }.bind(this))

    
    this._eventInput.on('message', function(data){
      this.addMessage(data)
      this.logHeading._eventInput.trigger('message', data)
      this.updateTitleContent(data)
      this.logHeading.updateTitles(data)
    }.bind(this))

  }

  MessageLogView.prototype = Object.create(View.prototype);
  MessageLogView.prototype.constructor = MessageLogView;

  MessageLogView.DEFAULT_OPTIONS = {};

  function _createHeaderContent(){
    this.targetValue = 200;
    this.midValue = ' ';
    this.indexesChecked = 0;

    this.headerContentMod = new StateModifier({
      transform: Transform.translate(0,-290,0)
    })

    this.headerContent = new Surface({
      size:[470,80],
      //content:'<div class="messageLogTitle">INDEXES: </div>',
      properties: {
        backgroundColor: '#fa5c4f',
        borderRadius: '10px'
       // pointerEvents: 'none'
      }
    })

    this.logHeading = new LogHeadingView()
    
    this.valueTrackerMod = new StateModifier({
      transform: Transform.translate(140,5,0)
    })

    this.valueTrackerTitle = new Surface({
      size:[210,70],
      content: '<div id="indexesChecked">Indexes Checked: '+this.indexesChecked+'</div><div id="targetValue">Target Value: ' + this.targetValue + '</div><div id="midValue">Current Middle Value: ' + this.midValue+'</div>',
      properties: {
        color: 'white', 
       // fontFamily: 'lobster',
        fontFamily: 'AvenirNextLTW02-Regular, sans-serif',
        //fontSize: '12px'
      }
    })



    var headerViewNode = this.node.add(this.headerContentMod)
    headerViewNode.add(this.headerContent)
    headerViewNode.add(this.logHeading)
    headerViewNode.add(this.valueTrackerMod).add(this.valueTrackerTitle)


  }

  function _createMessageLog(){
    

    var container = new ContainerSurface({
      size: [500, 510],
        properties: {
        overflow: 'hidden',
        borderRadius: '20px'
      }
    });


    this.messages = [];
    this.scrollview = new Scrollview();

    this.messageSurface = new Surface({
      size: [500, 300],
      content: '<div class="messageLogPanel">Welcome to the Binary Search Visualization. </br >This is where info from each step will apear.</div>',
      properties: {
          textAlign: 'center',
            //backgroundColor:'grey',
          borderRadius:'10px'
      }
    })

    this.messageSurface.pipe(this.scrollview);

    this.messages.push(this.messageSurface)
    this.scrollview.sequenceFrom(this.messages);
    container.add(this.scrollview);

    this.node = this.add(new Modifier({
      align: [0.35, .51],
    }))

    this.node.add(container);
  }
    
  MessageLogView.prototype.addMessage = function(message){
     this.stepCounter++;
    var messageSurface = new Surface({
      size: [undefined, 100],
      content: '<div class="messageLogPanel"><b>Step '+this.stepCounter +':</b><br> ' + message.info+'</div>',
      properties: {
          textAlign: 'left',
          
      }
    })

    this.messageSurface.pipe(this.scrollview);

    this.messages.unshift(messageSurface)  
  
  }

  MessageLogView.prototype.reload = function(data){
    var pop = this.messages.pop()
    this.messages.splice(0)
    this.stepCounter = 0;
    this.messages.push(pop)
  }


   MessageLogView.prototype.updateTitleContent = function(data){
      this.targetValue = data.target;
      this.midValue = data.midValue || ' ';
      
      if(data.center){
        this.indexesChecked++;
      }
     
      var newContent = '<div id="indexesChecked">Indexes Checked: '+this.indexesChecked+'</div><div id="targetValue">Target Value: ' + this.targetValue + '</div><div id="midValue">Current Middle Value: ' + this.midValue+'</div>';
      this.valueTrackerTitle.setContent(newContent)
   }

  

    module.exports = MessageLogView;
});
