(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"c:\\Users\\Morgan\\desktop\\famous\\MixedMode\\node_modules\\cssify\\browser.js":[function(require,module,exports){
module.exports = function (css, customDocument) {
  var doc = customDocument || document;
  if (doc.createStyleSheet) {
    var sheet = doc.createStyleSheet()
    sheet.cssText = css;
    return sheet.ownerNode;
  } else {
    var head = doc.getElementsByTagName('head')[0],
        style = doc.createElement('style');

    style.type = 'text/css';

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(doc.createTextNode(css));
    }

    head.appendChild(style);
    return style;
  }
};

module.exports.byUrl = function(url) {
  if (document.createStyleSheet) {
    return document.createStyleSheet(url).ownerNode;
  } else {
    var head = document.getElementsByTagName('head')[0],
        link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = url;

    head.appendChild(link);
    return link;
  }
};

},{}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Camera.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var MatrixMath     = require('../../math/4x4matrix');
var OptionsManager = require('../OptionsManager');

// CONSTS
var COMPONENT_NAME = 'camera';
var PROJECTION     = 'projection';

var MainCamera     = null;

/**
 * Camera
 *
 * @component Camera
 * @constructor
 * 
 * @param {Entity} [entity]  Entity that the Container is a component of
 * @param {Object} [options] An object of configurable options
 * @param {String} [options.type='pinhole'] The projection model used in the generation of camera's projection matrix, identified by string. Can be either 'perspective', or 'pinhole'.
 * @param {Object} [options.projection] A sub-object of options responsible for configuring projection. These options vary
 * @param {Array | Number 1D | Vector 3}  [options.projection.focalPoint=[0, 0, 0]]  Specifies the focal point for pinhole projection. The first two numbers determine the x and y of the vanishing point, and the third determines the distance of the camera's "eye" to the mathematical xy plane of your scene.
 * @param {Number} [options.projection.nearPlane=0]  Specifies the near bound of the viewing volume for perspective projection.
 * @param {Number} [options.projection.farPlane=0]  Specifies the far bound of the viewing volume for perspective projection.
 * @param {Number} [options.projection.fieldOfView=PI/4]  Specifies the field of view for perspective projection (in radians).
 */
function Camera(entity, options) {
    this._entity              = entity;

    this._projectionTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    this.options              = Object.create(Camera.DEFAULT_OPTIONS);
    this._optionsManager      = new OptionsManager(this.options);
    this._optionsManager.on('change', _eventsChange.bind(this)); //robust integration

    if (options) this.setOptions(options);

    _recalculateProjectionTransform.call(this);
}

Camera.DEFAULT_PINHOLE_OPTIONS = {
    focalPoint: [0, 0, 0]
};

Camera.DEFAULT_PERSPECTIVE_OPTIONS = {
    nearPlane: 0,
    farPlane: 0,
    fieldOfView: 0.78539816339 // PI/4 | 45 degrees
};

Camera.DEFAULT_OPTIONS = {
    type    : 'pinhole',
    projection : Camera.DEFAULT_PINHOLE_OPTIONS
};

Camera.toString = function toString() {
    return COMPONENT_NAME;
};

Camera.getMainCamera = function getMainCamera() {
    return MainCamera;
};

Camera.projectionTransforms = {};

Camera.projectionTransforms.pinhole = function pinhole(transform, options) {
    var focalVector = options.focalPoint;
    var focalDivide = focalVector[2] ? 1/focalVector[2] : 0;

    transform[0]  = 1;
    transform[1]  = 0;
    transform[2]  = 0;
    transform[3]  = 0;
    
    transform[4]  = 0;
    transform[5]  = 1;
    transform[6]  = 0;
    transform[7]  = 0;
   
    transform[8]  = -focalDivide * focalVector[0];
    transform[9]  = -focalDivide * focalVector[1];
    transform[10] = focalDivide;
    transform[11] = -focalDivide;
    
    transform[12] = 0;
    transform[13] = 0;
    transform[14] = 0;
    transform[15] = 1;

    return transform;
};

Camera.projectionTransforms.perspective = function perspective(transform, options) {
    var near = options.nearPlane;
    var far  = options.farPlane;
    var fovy = options.fieldOfView;

    var f  = 1 / Math.tan(fovy / 2);
    var nf = (near && far) ? 1 / (near - far) : 0;

    transform[0]  = f;
    transform[1]  = 0;
    transform[2]  = 0;
    transform[3]  = 0;

    transform[4]  = 0;
    transform[5]  = f;
    transform[6]  = 0;
    transform[7]  = 0;

    transform[8]  = 0;
    transform[9]  = 0;
    transform[10] = (far + near) * nf;
    transform[11] = -1;

    transform[12] = 0;
    transform[13] = 0;
    transform[14] = (2 * far * near) * nf;
    transform[15] = 0;

    return transform;
};

function _eventsChange(data) {
    if (data.id === PROJECTION) {
        _recalculateProjectionTransform.call(this);
    }
}

function _recalculateProjectionTransform() {
    return Camera.projectionTransforms[this.options.type](this._projectionTransform, this.options.projection);
}

Camera.prototype.setOptions = function setOptions(options) {
    return this._optionsManager.setOptions(options);
};

Camera.prototype.getOptions = function getOptions() {
    return this.options;
};

/**
 * Returns the Camera's current projection transform.
 *
 * @method getProjectionTransform
 * @chainable
 *
 * @return {Array | 1D Nmber| Transform}
 */
Camera.prototype.getProjectionTransform = function getProjectionTransform() {
    return this._projectionTransform;
};


Camera.prototype.setPerspective = function setPerspective(focalDepth) {
    //Is there a less garbage-y way to do this? (yes) Is it even desirable? (aliasing allows for one source of logic)
    this.setOptions({
        type: 'pinhole',
        projection: {
                focalPoint: [0, 0, focalDepth]
        }
    });

    return this;
};

Camera.prototype.setMainCamera = function setMainCamera() {
    MainCamera = this;
};

module.exports = Camera;

},{"../../math/4x4matrix":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\4x4matrix.js","../OptionsManager":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\OptionsManager.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Container.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityRegistry = require('../EntityRegistry');
var MatrixMath     = require('../../math/4x4matrix');
var EventHandler   = require('../../events/EventHandler');
var Target   = require('./Target');
var GL   = require('../Renderers/WebGLRenderer');

// Consts
var CONTAINER = 'container';

/**
 * Container is a component that can be added to an Entity that
 *   is represented by a DOM node through which other renderables
 *   in the scene graph can be drawn inside of.
 *
 * @class Container
 * @component
 * @constructor
 * 
 * @param {Entity} entity  Entity that the Container is a component of
 * @param {Object} options options
 */
function Container(entityID, options) {
    this.gl = GL.init(options);

    Target.call(this, entityID, {
        verticies: [new Float32Array([0, 0, 0, 1]),
                    new Float32Array([0, 0, 0, 1]),
                    new Float32Array([0, 0, 0, 1]),
                    new Float32Array([0, 0, 0, 1])]
    });

    var entity = this.getEntity();
    EntityRegistry.register(entity, 'HasContainer');

    this._container     = options.container;
    var transform       = entity.getComponent('transform');
    this._inverseMatrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._size          = options.size || entity.getContext()._size.slice();
    this.origin         = [0.5, 0.5];

    this._eventOutput = new EventHandler();
    this._eventOutput.bindThis(this);

    this._events = {
        eventForwarder: function eventForwarder(event) {
            this.emit(event.type, event);
            event.preventDefault();
        }.bind(this),
        on    : [],
        off   : [],
        dirty : false
    };

    this._transformDirty = true;
    this._sizeDirty      = true;

    // Inverses the Container's transform matrix to have elements nested inside
    // to appear in world space.
    transform.on('invalidated', function(report) {
        MatrixMath.invert(this._inverseMatrix, transform._matrix);
        this._transformDirty = true;
    }.bind(this));
}

Container.toString = function toString() {
    return CONTAINER;
};


Container.prototype             = Object.create(Target.prototype);
Container.prototype.constructor = Container;

/**
 * Bind a callback function to an event type handled by this object's
 *  EventHandler.
 *
 * @method on
 * @chainable
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} handler callback
 */
Container.prototype.on = function on(event, cb) {
    if (typeof event === 'string' && cb instanceof Function) {
        this._eventOutput.on(event, cb);
        if (this._events.on.indexOf(event) < 0) {
            this._events.on.push(event);
            this._events.dirty = true;
        }
        var index = this._events.off.indexOf(event);
        if (index > -1) this._events.off.splice(index, 1);
    } else throw new Error('on takes an event name as a string and a callback to be fired when that event is received');
    return this;
};

/**
 * Remove a function to a particular event occuring.
 *
 * @method  off
 * @chainable
 * 
 * @param {String} event name of the event to call the function when occuring
 * @param {Function} cb callback function to be called when the event is recieved.
 */
Container.prototype.off = function off(event, cb) {
    if (typeof event === 'string' && cb instanceof Function) {
        var index = this._events.on.indexOf(event);
        if (index >= 0) {
            this._eventOutput.removeListener(event, cb);
            this._events.on.splice(index, 1);
            this._events.off.push(event);
            this._events.dirty = true;
        }
    } else throw new Error('off takes an event name as a string and a callback to be fired when that event is received');
    return this;
};

/**
 * Add event handler object to the EventHandler's downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
Container.prototype.pipe = function pipe(target) {
    var result = this._eventOutput.pipe(target);
    for (var event in this._eventOutput.listeners) {
        if (this._events.on.indexOf(event) < 0) {
            this._events.on.push(event);
            this._events.dirty = true;
        }
    }
    return result;
};

 /**
 * Remove handler object from the EventHandler's downstream handlers.
 *   Undoes work of "pipe".
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
Container.prototype.unpipe = function unpipe(target) {
    return this._eventOutput.unpipe(target);
};

/**
 * Trigger an event, sending to all of the EvenetHandler's 
 *  downstream handlers listening for provided 'type' key.
 *
 * @method emit
 *
 * @param {string} type event type key (for example, 'click')
 * @param {Object} event event data
 * @return {EventHandler} this
 */
Container.prototype.emit = function emit(type, event) {
    if (event && !event.origin) event.origin = this;
    var handled = this._eventOutput.emit(type, event);
    if (handled && event && event.stopPropagation) event.stopPropagation();
    return handled;
};

/**
 * Get the display matrix of the Container.
 *
 * @method getDisplayMatrix
 * 
 * @return {Array} display matrix of the Container
 */
Container.prototype.getDisplayMatrix = function getDisplayMatrix() {
    return this._inverseMatrix;
};

/**
 * Set the size of the Container.
 *
 * @method setSize
 * @chainable
 * 
 * @return {Array} 2 dimensional array of representing the size of the Container
 */
Container.prototype.setCSSSize = function setCSSSize(width, height) {
    this._size[0]   = width;
    this._size[1]   = height;
    this._sizeDirty = true;
    return this;
};

Container.prototype.getCSSSize = function getCSSSize() {
    return this._size;
};


Container.prototype._setVertexDisplacement = function _setVertexDisplacement (x, y) {
    var yOriginOffset = this.origin[1] * y,
        xOriginOffset = this.origin[0] * x;

    this.verticies[0][0] = 0 - xOriginOffset;
    this.verticies[0][1] = 0 - yOriginOffset;
    this.verticies[1][0] = x - xOriginOffset;
    this.verticies[1][1] = 0 - yOriginOffset;
    this.verticies[2][0] = x - xOriginOffset;
    this.verticies[2][1] = y - yOriginOffset;
    this.verticies[3][0] = 0 - xOriginOffset;
    this.verticies[3][1] = y - yOriginOffset;
};

module.exports = Container;

},{"../../events/EventHandler":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventHandler.js","../../math/4x4matrix":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\4x4matrix.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js","../Renderers/WebGLRenderer":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Renderers\\WebGLRenderer.js","./Target":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Target.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Opacity.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EventEmitter = require('../../events/EventEmitter');

/**
 * Opacity determines what the Opacity of everything below it in the
 *   scene graph should be.
 *
 * @class Opacity
 * @component
 * @constructor
 */
function Opacity(entityId, options) {
    this._localOpacity  = 1;
    this._globalOpacity = 1;
    this._updateFN      = null;
    this._invalidated   = false;
    this._eventHandler  = new EventEmitter();
    this._entityId      = entityId;

    this._mutator = {
        set: this.set.bind(this),
        opacitate: this.opacitate.bind(this)
    };
}

var OPACITY = 'opacity';
Opacity.toString = function toString() { return OPACITY };

/**
 * Set will update the local opacity and invalidate it
 *
 * @method  set
 * 
 * @param {Number} opacity new opacity value for this Entity
 */
Opacity.prototype.set = function set(opacity) {
    this._invalidated  = true;
    this._localOpacity = opacity;
};

/**
 * Additive version of set.  Also marks the Opacity as invalidated.
 *
 * @method  opacitate
 * 
 * @param  {Number} differential differential to apply to the currect opacity value
 */
Opacity.prototype.opacitate = function opacitate(differential) {
    this._invalidated  = true;
    this._localOpacity += differential;
};

/**
 * Returns what the global opacity is at this part of the scene graph.  Global
 *   is the result of multiplying the parent's opacity with this instance's
 *   opacity.
 *
 * @method getGlobalOpacity
 * 
 * @return {Number} Cumulative opacity at this point in the scene graph
 */
Opacity.prototype.getGlobalOpacity = function getGlobalOpacity() {
    return this._globalOpacity;
};

/**
 * getLocalOpacity returns this instance's specified opacity.
 *
 * @method  getLocalOpacity
 * 
 * @return {Number} this instance's specified opacity
 */
Opacity.prototype.getLocalOpacity = function getLocalOpacity() {
    return this._localOpacity;
};

/**
 * Define where the opacity will be getting it's source of truth from.
 *
 * @method  updateFrom
 * 
 * @param  {Function|Transitionable|Number} provider source of state for the Opacity
 */
Opacity.prototype.updateFrom = function updateFrom(provider) {
    if (provider instanceof Function) {
        this._updateFN = provider.bind(this);
    }
    else if (provider.get && provider.get instanceof Function) {
        if (typeof provider.get() !== 'number') {
            throw new Error('Opacity: Transitionables passed to opacityFrom must return Numbers');
        }
        else {
            this._updateFN = function(opacity) {
                opacity.set(provider.get());
            };
        }
    }
    else {
        if (typeof provider !== 'number') {
            throw new Error('Opacity: Constants passed to opacityFrom must return Numbers');
        }
        else {
            this.set(provider);
        }
    }
};

/**
 * Update the values of the Opacity given information about it's parent.
 *
 * @method  _update
 * @private
 * 
 * @param  {Boolean} parentReport flag denoting whether the parent Opacity was invalidated
 * @param  {Number} parentOpacity value of the global opacity up to this point in the scene graph
 * @return {Boolean} flag denoting if this Opacity was invalidated
 */
Opacity.prototype._update = function _update(parentReport, parentOpacity) {
    if (parentReport) this._invalidated = true;
    if (this._updateFN) this._updateFN(this._mutator);

    if (parentOpacity == null) parentOpacity = 1;

    if (this._invalidated) {
        this._globalOpacity = this._localOpacity * parentOpacity;
        this._invalidated = false;
        this._eventHandler.emit('invalidated', true);
        return true;
    }

    else return false;
};

/**
 * Register functions to be called on opacity events.
 *
 * @method  on
 */
Opacity.prototype.on = function on() {
    this._eventHandler.on.apply(this._eventHandler, arguments);
};

module.exports = Opacity;

},{"../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Size.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EventEmitter = require('../../events/EventEmitter');

/**
 * Size is a component that is part of every RenderNode.  It is
 *   responsible for updating it's own notion of size and incorporating
 *   that with parent information.  Sizes are three dimensional and can be
 *   defined in three seperate manners.
 *   
 *       pixel: Absolute pixel size
 *       proportion: Percent of the parent or local pixel size
 *       differential: +/- a certain amount of pixels
 *
 *  For each dimension, [x, y, z], pixel size is calculated first, then
 *  proportions are applied, and finally differentials are applied.  Sizes
 *  get their parent information via the CoreSystem which uses the scene 
 *  graph as it's source of heirarchy.
 *
 * @class Size
 * @component
 * @constructor
 */
function Size(entityId, options) {
    this._localPixels        = [void 0, void 0, void 0];
    this._localProportions   = [1, 1, 1];
    this._localDifferentials = [0, 0, 0];
    this._globalSize         = [0, 0, 0];
    this._updateFN           = null;
    this._invalidated        = 0;
    this._cachedContextSize  = [0, 0, 0];
    this._eventHandler       = new EventEmitter();
    this._entityId           = entityId;

    this._mutator = {
        setPixels: this.setPixels.bind(this),
        setProportions: this.setProportions.bind(this),
        setDifferentials: this.setDifferentials.bind(this)
    };
}

var SIZE = 'size';
Size.toString = function() {return SIZE;};

/**
 * Define the pixel values for the size.  Invalidates certain
 *   indicies when new values are specified.
 *
 * @method setPixels
 * 
 * @param {Number} x size in pixels
 * @param {Number} y size in pixels
 * @param {Number} z size in pixels
 */
Size.prototype.setPixels = function setPixels(x, y, z) {
    if (x !== this._localPixels[0] && x != null) {
        this._invalidated |= 1;
        this._localPixels[0] = x;
    }

    if (y !== this._localPixels[1] && y != null) {
        this._invalidated |= 2;
        this._localPixels[1] = y;
    }
    if (z !== this._localPixels[2] && z != null) {
        this._invalidated |= 4;
        this._localPixels[2] = z;
    }
};

/**
 * Define the proportional values for the size.  Invalidates
 *   certain indicies when new values are specified.
 *
 * @method setProportions
 * 
 * @param {Number} x size as a percentage of the parentSize or local pixel size
 * @param {Number} y size as a percentage of the parentSize or local pixel size
 * @param {Number} z size as a percentage of the parentSize or local pixel size
 */
Size.prototype.setProportions = function setProportions(x, y, z) {
    if (x !== this._localProportions[0] && x != null) {
        this._invalidated |= 1;
        this._localProportions[0] = x;
    }

    if (y !== this._localProportions[1] && y != null) {
        this._invalidated |= 2;
        this._localProportions[1] = y;
    }

    if (z !== this._localProportions[2] && z != null) {
        this._invalidated |= 4;
        this._localProportions[2] = z;
    }
};

/**
 * Define the pixel differentials for the size.  
 *   Invalidates certain indicies when new values are specified. 
 *
 * @method setDifferentials
 * 
 * @param {Number} x pixel differentials in size
 * @param {Number} y pixel differentials in size
 * @param {Number} z pixel differentials in size
 */
Size.prototype.setDifferentials = function setDifferentials(x, y, z) {
    if (x !== this._localDifferentials[0] && x != null) {
        this._invalidated          |= 1;
        this._localDifferentials[0] = x;
    }

    if (y !== this._localDifferentials[1] && y != null) {
        this._invalidated          |= 2;
        this._localDifferentials[1] = y;
    }

    if (z !== this._localDifferentials[2] && z != null) {
        this._invalidated          |= 4;
        this._localDifferentials[2] = z;
    }
};

/**
 * Return the Size's notion of what the cumulative global size is.
 *
 * @method  getGlobalSize
 * 
 * @return {Array} Array representing size in pixels
 */
Size.prototype.getGlobalSize = function getGlobalSize() {
    return this._globalSize;
};

/**
 * Define the provider of state for the Size.
 *
 * @method  sizeFrom
 * 
 * @param  {Function} provider source of state for the Size
 */
Size.prototype.updateFrom = function updateFrom(provider) {
    if (provider instanceof Function) {
        this._updateFN = provider;
    }
    else {
        throw new Error('Size: updateFrom only accepts functions')
    }
};

/**
 * Updates the Size's values based on the parent invalidations,
 *   parent size (pixels), and possibly context size (pixels).
 *
 * @method _update
 * @private
 * 
 * @param  {Number} parentReport bitScheme invalidations for parent size
 * @param  {Array} parentSize parent size in pixels
 * @param  {Array} contextSize context size in pixels
 * @return {Number} invalidations
 */
Size.prototype._update = function _update(parentReport, parentSize, contextSize) {
    if (contextSize) {
        parentSize = contextSize;
        parentReport = 0;
        if (parentSize[0] !== this._cachedContextSize[0]) parentReport |= 1;
        if (parentSize[1] !== this._cachedContextSize[1]) parentReport |= 2;
        if (parentSize[2] !== this._cachedContextSize[2]) parentReport |= 4;
        this._cachedContextSize = contextSize;
    }

    if (parentReport) this._invalidated |= parentReport;
    if (this._updateFN) this._updateFN(this._mutator);

    if (this._invalidated) {
        if (this._invalidated & 1) {
            this._globalSize[0]  = this._localPixels[0] !== undefined ? this._localPixels[0] : parentSize[0];
            this._globalSize[0] *= this._localProportions[0];
            this._globalSize[0] += this._localDifferentials[0];
        }
        if (this._invalidated & 2) {
            this._globalSize[1]  = this._localPixels[1] !== undefined ? this._localPixels[1] : parentSize[1];
            this._globalSize[1] *= this._localProportions[1];
            this._globalSize[1] += this._localDifferentials[1];
        }
        if (this._invalidated & 4) {
            this._globalSize[2]  = this._localPixels[2] !== undefined ? this._localPixels[2] : parentSize[2];
            this._globalSize[2] *= this._localProportions[2];
            this._globalSize[2] += this._localDifferentials[2];
        }

        var invalidated = this._invalidated;
        this._invalidated = 0;
        if (invalidated) this._eventHandler.emit('invalidated', invalidated);
        return invalidated;
    }

    else return 0;
};

/**
 * Register functions to be called on the Size's events.
 *
 * @method on
 */
Size.prototype.on = function on() {
    this._eventHandler.on.apply(this._eventHandler, arguments);
};

module.exports = Size;

},{"../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Surface.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityRegistry = require('../EntityRegistry'),
    Target         = require('./Target'),
    MatrixMath     = require('../../math/4x4matrix'),
    EventHandler   = require('../../events/EventHandler');

// CONSTS
var TRANSFORM = 'transform';
var SIZE      = 'size';
var OPACITY   = 'opacity';
var SURFACE   = 'surface';

/**
 * Surface is a component that defines the data that should
 *   be drawn to an HTMLElement.  Manages CSS styles, HTML attributes,
 *   classes, and content.
 *
 * @class Surface
 * @component
 * @constructor
 * 
 * @param {Entity} entity Entity that the Surface is a component of
 * @param {Object} options instantiation options
 */
function Surface(entityID, options) {
    Target.call(this, entityID, {
        verticies: [new Float32Array([0, 0, 0, 1]),
                    new Float32Array([0, 0, 0, 1]),
                    new Float32Array([0, 0, 0, 1]),
                    new Float32Array([0, 0, 0, 1])]
    });

    var entity = this.getEntity();

    EntityRegistry.register(entity, 'Surfaces');
    EntityRegistry.register(entity, 'Renderables');

    if (options.tagName) this.tagName = options.tagName;
    this._culled = false;
    this._size     = new Float32Array([0,0]);

    this.invalidations = 127;
    this._eventOutput  = new EventHandler();
    this._eventOutput.bindThis(this);
    this._eventForwarder = function _eventForwarder(event) {
        this._eventOutput.emit(event.type, event);
    }.bind(this);

    this.spec = {
        _id            : entity._id,
        classes        : [],
        attributes     : {},
        properties     : {},
        content        : null,
        invalidations  : (1 << Object.keys(Surface.invalidations).length) - 1,
        origin         : this._origin,
        events         : [],
        eventForwarder : this._eventForwarder
    };

    entity.getComponent(TRANSFORM).on('invalidated', function () {
        this.invalidations |= Surface.invalidations.transform;
    }.bind(this));

    entity.getComponent(SIZE).on('invalidated', function () {
        this.invalidations |= Surface.invalidations.size;
    }.bind(this));

    entity.getComponent(OPACITY).on('invalidated', function () {
        this.invalidations |= Surface.invalidations.opacity;
    }.bind(this));

    this.setOptions(options);

    this._hasOrigin = true;
}

Surface.prototype             = Object.create(Target.prototype);
Surface.prototype.constructor = Surface;

// Invalidation Scheme
Surface.invalidations = {
    classes    : 1,
    properties : 2,
    attributes : 4,
    content    : 8,
    transform  : 16,
    size       : 32,
    opacity    : 64,
    origin     : 128,
    events     : 256
};

Surface.toString = function toString() {return SURFACE;};

Surface.prototype._setVertexDisplacement = function _setVertexDisplacement (x, y) {
    var yOriginOffset = this.spec.origin[1] * y,
        xOriginOffset = this.spec.origin[0] * x;

    this.verticies[0][0] = 0 - xOriginOffset;
    this.verticies[0][1] = 0 - yOriginOffset;
    this.verticies[1][0] = x - xOriginOffset;
    this.verticies[1][1] = 0 - yOriginOffset;
    this.verticies[2][0] = x - xOriginOffset;
    this.verticies[2][1] = y - yOriginOffset;
    this.verticies[3][0] = 0 - xOriginOffset;
    this.verticies[3][1] = y - yOriginOffset;

    this._size[0] = x;
    this._size[1] = y;
    this._eventOutput.emit('sizeChange', this._size);
};

/**
 * Set the options of the Surface.
 *
 * @method setOptions
 * 
 * @param {Object} options object of options
 */
Surface.prototype.setOptions = function setOptions(options) {
    if (options.properties)                         this.setProperties(options.properties);
    if (options.classes)                            this.setClasses(options.classes);
    if (options.attributes)                         this.setAttributes(options.attributes);
    if (options.content || options.content === '')  this.setContent(options.content);
    if (options.size)                               this.setCSSSize.apply(this, options.size);
};

/**
 * Set the CSS classes to be a new Array of strings.
 *
 * @method setClasses
 * 
 * @param {Array} array of CSS classes
 */
Surface.prototype.setClasses = function setClasses(classList) {
    if (!Array.isArray(classList)) throw new Error("Surface: expects an Array to be passed to setClasses");

    var i = 0;
    var removal = [];

    for (i = 0; i < this.spec.classes.length; i++)
        if (classList.indexOf(this.spec.classes[i]) < 0)
            removal.push(this.spec.classes[i]);

    for (i = 0; i < removal.length; i++)   this.removeClass(removal[i]);
    for (i = 0; i < classList.length; i++) this.addClass(classList[i]);

    this.invalidations |= Surface.invalidations.size;
};

/**
 * Return all of the classes associated with this Surface
 *
 * @method getClasses
 * 
 * @return {Array} array of CSS classes
 */
Surface.prototype.getClasses = function getClasses() {
    return this.spec.classes;
};

/**
 * Add a single class to the Surface's list of classes.
 *   Invalidates the Surface's classes.
 *
 * @method addClass
 * 
 * @param {String} className name of the class
 */
Surface.prototype.addClass = function addClass(className) {
    if (typeof className !== 'string') throw new Error('addClass only takes Strings as parameters');
    if (this.spec.classes.indexOf(className) < 0) {
        this.spec.classes.push(className);
        this.invalidations |= Surface.invalidations.classes;
    }

    this.invalidations |= Surface.invalidations.size;
};


/**
 * Remove a single class from the Surface's list of classes.
 *   Invalidates the Surface's classes.
 * 
 * @method removeClass
 * 
 * @param  {String} className class to remove
 */
Surface.prototype.removeClass = function removeClass(className) {
    if (typeof className !== 'string') throw new Error('addClass only takes Strings as parameters');
    var i = this.spec.classes.indexOf(className);
    if (i >= 0) {
        this.spec.classes.splice(i, 1);
        this.invalidations |= Surface.invalidations.classes;
    }

    this.invalidations |= Surface.invalidations.size;
};

/**
 * Set the CSS properties associated with the Surface.
 *   Invalidates the Surface's properties.
 *
 * @method setProperties
 */
Surface.prototype.setProperties = function setProperties(properties) {
    for (var n in properties) this.spec.properties[n] = properties[n];
    this.invalidations |= Surface.invalidations.size;
    this.invalidations |= Surface.invalidations.properties;
    return this;
};

/**
 * Return the CSS properties associated with the Surface.
 *
 * @method getProperties
 * 
 * @return {Object} CSS properties associated with the Surface
 */
Surface.prototype.getProperties = function getProperties() {
    return this.spec.properties;
};

/**
 * Set the HTML attributes associated with the Surface.
 *   Invalidates the Surface's attributes.
 *
 * @method setAttributes
 */
Surface.prototype.setAttributes = function setAttributes(attributes) {
    for (var n in attributes) this.spec.attributes[n] = attributes[n];
    this.invalidations |= Surface.invalidations.attributes;
};

/**
 * Return the HTML attributes associated with the Surface.
 *
 * @method getAttributes
 * 
 * @return {Object} HTML attributes associated with the Surface
 */
Surface.prototype.getAttributes = function getAttributes() {
    return this.spec.attributes;
};

/**
 * Set the innerHTML associated with the Surface.
 *   Invalidates the Surface's content.
 *
 * @method setContent
 */
Surface.prototype.setContent = function setContent(content) {
    if (content !== this.spec.content) {
        this.spec.content   = content;
        this.invalidations |= Surface.invalidations.content;
    }
};

/**
 * Return the innerHTML associated with the Surface.
 *
 * @method getContent
 * 
 * @return {String} innerHTML associated with the Surface
 */
Surface.prototype.getContent = function getContent() {
    return this.spec.content;
};

/**
 * Set the size of the Surface.
 *
 * @method setCSSSize
 * @chainable
 */
Surface.prototype.setCSSSize = function setCSSSize(width, height) {
    if (!this.spec.size) this.spec.size = [];
    if (width) {
        this._size[0] = this.spec.size[0] = width;
    }
    if (height) {
        this._size[1] = this.spec.size[1] = height;
    }
    this.invalidations |= Surface.invalidations.size;
    return this;
};

/**
 *  Get the CSS Size of a surface. Note that when using undefined, or true size, this will
 *  happen a frame later. To get a notification of this change, listen to this surface's
 *  sizeChange event. 
 *
 *  @method getCSSSize
 *  @reutrn {Array} 2
 */
Surface.prototype.getCSSSize = function () {
    return this._size;
}


/**
 * Sets the origin of the Surface.
 *
 * @method setOrigin
 * @chainable
 *
 * @param {Number} x origin on the x-axis as a percent
 * @param {Number} y origin on the y-axis as a percent
 */
Surface.prototype.setOrigin  = function setOrigin(x, y) {
    if ((x != null && (x < 0 || x > 1)) || (y != null && (y < 0 || y > 1)))
        throw new Error('Origin must have an x and y value between 0 and 1');

    this.spec.origin[0] = x != null ? x : this.spec.origin[0];
    this.spec.origin[1] = y != null ? y : this.spec.origin[1];
    this.invalidations |= Surface.invalidations.origin;

    return this;
};

/**
 * Gets the origin of the Surface.
 *
 * @method getOrigin
 *
 * @return {Array} 2-dimensional array representing the Surface's origin
 */
Surface.prototype.getOrigin = function getOrigin() {
    return this.spec.origin;
};

/**
 * Resets the invalidations of the Surface
 *
 * @method resetInvalidations
 * @chainable
 *
 * @return {Surface} this
 */
Surface.prototype.resetInvalidations = function() {
    this.invalidations = 0;
    return this;
};

/**
 * Mark all properties as invalidated.
 *
 * @method invalidateAll
 * @chainable
 *
 * @return {Surface} this
 */
Surface.prototype.invalidateAll = function() {
    this.invalidations = 511;
    return this;
};


/**
 * Bind a callback function to an event type handled by this Surface's
 *  EventHandler.
 *
 * @method on
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} handler callback
 */
Surface.prototype.on = function on(event, cb) {
    if (typeof event === 'string' && cb instanceof Function) {
        this._eventOutput.on(event, cb);
        if (this.spec.events.indexOf(event) < 0) {
            this.spec.events.push(event);
            this.invalidations |= Surface.invalidations.events;
        }
    }
    return this;
};

/**
 * Remove a function to a particular event occuring.
 *
 * @method  off
 * 
 * @param {String} event name of the event to call the function when occuring
 * @param {Function} cb callback function to be called when the event is recieved.
 */
Surface.prototype.off = function off(event, cb) {
    if (typeof event === 'string' && cb instanceof Function) {
        var index = this.spec.events.indexOf(event);
        if (index > 0) {
            this._eventOutput.removeListener(event, cb);
            this.spec.events.splice(index, 1);
            this.invalidations |= Surface.invalidations.events;
        }
    }
};

/**
 * Add event handler object to the EventHandler's downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
Surface.prototype.pipe = function pipe(target) {
    var listeners = target.upstreamListeners || target._eventInput.upstreamListeners;
    var keys = Object.keys(listeners);
    var i = keys.length;
    var event;
    while (i--) {
        event = keys[i];
        if (this.spec.events.indexOf(event) < 0) {
            this.spec.events.push(event);
            this.invalidations |= Surface.invalidations.events;
        }
    }
    return this._eventOutput.pipe(target);
};

/**
 * Remove handler object from the EventHandler's downstream handlers.
 *   Undoes work of "pipe".
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
Surface.prototype.unpipe = function unpipe(target) {
    return this._eventOutput.unpipe(target);
};

/**
 * Get the render specification of the Surface.
 *
 * @method  render
 * 
 * @return {Object} render specification
 */
Surface.prototype.render = function() {
    this.spec.invalidations = this.invalidations;
    return this.spec;
};

module.exports = Surface;

},{"../../events/EventHandler":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventHandler.js","../../math/4x4matrix":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\4x4matrix.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js","./Target":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Target.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Target.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var MatrixMath = require('../../math/4x4matrix');
var EntityRegistry = require('../EntityRegistry');

/**
 * Target is the base class for all renderables.  It holds the state of
 *   its verticies, the Containers it is deployed in, the Context it belongs
 *   to, and whether or not origin alignment needs to be applied.
 *
 * @component Target
 * @constructor
 *
 * @param {Entity} entity  Entity that the Target is a component of
 * @param {Object} options options
 */
function Target(entityID, options) {
    var self        = this;
    this._entityID  = entityID;
    this.verticies  = options.verticies || [];
    this.containers = {};
    this._hasOrigin = false;
    this._origin    = new Float32Array([0.5, 0.5, 0.5]);
}

/**
 * Get the verticies of the Target.
 *
 * @method getVerticies
 *
 * @return {Array} array of the verticies represented as three element arrays [x, y, z]
 */
Target.prototype.getVerticies = function getVerticies(){
    return this.verticies;
};

/**
 * Determines whether a Target was deployed to a particular container
 *
 * @method _isWithin
 *
 * @param {Number} the id of the Container's Entity
 * @return {Boolean} whether or now the Target was deployed to this particular Container
 */
Target.prototype._isWithin = function _isWithin(container) {
    return this.containers[container._id];
};

/**
 * Mark a Container as having a deployed instance of the Target
 *
 * @method _addToContainer
 *
 * @param {Number} the id of the Container's Entity
 * @return {Boolean} staus of the addition
 */
Target.prototype._addToContainer = function _addToContainer(container) {
    this.containers[container._id] = true;
    return true;
};

/**
 * Unmark a Container as having a deployed instance of the Target
 *
 * @method _removeFromContainer
 *
 * @param {Number} the id of the Container's Entity
 * @return {Boolean} staus of the removal
 */
Target.prototype._removeFromContainer = function _removeFromContainer(container) {
    this.containers[container._id] = false;
    return true;
};

/**
 * Get the size of the Surface.
 *
 * @method getSize
 *
 * @return {Array} 2-dimensional array representing the size of the Surface in pixels.
 */
Target.prototype.getSize = function getSize(matrix, divideByW) {
    matrix = matrix || this.getEntity().getComponent('transform')._matrix;
    var result = {
            displacement: {
                left   : 0,
                bottom : 0,
                near   : 0,
                right  : 0,
                top    : 0,
                far    : 0
            },
        };

    var i = this.verticies.length;
    var vectorScratch = [];
    MatrixMath.applyToVector(vectorScratch, matrix, [0, 0, 0, 1]);
    if (divideByW) {
        vectorScratch[0] /= vectorScratch[3];
        vectorScratch[1] /= vectorScratch[3];
        vectorScratch[2] /= vectorScratch[3];
    }
    result.origin = vectorScratch.slice(0, -1);
    while (i--) {
        MatrixMath.applyToVector(vectorScratch, matrix, this.verticies[i]);
        if (divideByW) {
            vectorScratch[0] /= vectorScratch[3];
            vectorScratch[1] /= vectorScratch[3];
            vectorScratch[2] /= vectorScratch[3];
        }
        var x = vectorScratch[0] - result.origin[0], y = vectorScratch[1] - result.origin[1], z = vectorScratch[2] - result.origin[2];
        if (x > result.displacement.right)  result.displacement.right  = x;
        if (x < result.displacement.left)   result.displacement.left   = x;
        if (y > result.displacement.bottom) result.displacement.bottom = y;
        if (y < result.displacement.top)    result.displacement.top    = y;
        if (z > result.displacement.near)   result.displacement.near   = z;
        if (z < result.displacement.far)    result.displacement.far    = z;
    }
    result.size = [result.displacement.right - result.displacement.left, result.displacement.bottom - result.displacement.top, result.displacement.near - result.displacement.far];
    return result;
};

Target.prototype.getEntity = function getEntity() {
    return EntityRegistry.getEntity(this._entityID);
};

Target.prototype.setOrigin = function setOrigin() {
    this._origin[0] = x != null ? x : this._origin[0];
    this._origin[1] = y != null ? y : this._origin[1];
    this._origin[2] = z != null ? z : this._origin[1];
};


module.exports = Target;

},{"../../math/4x4matrix":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\4x4matrix.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Transform.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EventEmitter = require('../../events/EventEmitter');

// CONSTS
var IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

// Functions to be run when an index is marked as invalidated
var VALIDATORS = [
    function validate0(parent, vectors, memory) {
        return parent[0] * (memory[2] * memory[4]) * vectors.scale[0] + parent[4] * (memory[0] * memory[5] + memory[1] * memory[3] * memory[4]) * vectors.scale[0] + parent[8] * (memory[1] * memory[5] - memory[0] * memory[3] * memory[4]) * vectors.scale[0];
    },
    function validate1(parent, vectors, memory) {
        return parent[1] * (memory[2] * memory[4]) * vectors.scale[0] + parent[5] * (memory[0] * memory[5] + memory[1] * memory[3] * memory[4]) * vectors.scale[0] + parent[9] * (memory[1] * memory[5] - memory[0] * memory[3] * memory[4]) * vectors.scale[0];
    },
    function validate2(parent, vectors, memory) {
        return parent[2] * (memory[2] * memory[4]) * vectors.scale[0] + parent[6] * (memory[0] * memory[5] + memory[1] * memory[3] * memory[4]) * vectors.scale[0] + parent[10] * (memory[1] * memory[5] - memory[0] * memory[3] * memory[4]) * vectors.scale[0];
    },
    function validate3(parent, vectors, memory) {
        return parent[3] * (memory[2] * memory[4]) * vectors.scale[0] + parent[7] * (memory[0] * memory[5] + memory[1] * memory[3] * memory[4]) * vectors.scale[0] + parent[11] * (memory[1] * memory[5] - memory[0] * memory[3] * memory[4]) * vectors.scale[0];
    },
    function validate4(parent, vectors, memory) {
        return parent[0] * (-memory[2] * memory[5]) * vectors.scale[1] + parent[4] * (memory[0] * memory[4] - memory[1] * memory[3] * memory[5]) * vectors.scale[1] + parent[8] * (memory[1] * memory[4] + memory[0] * memory[3] * memory[5]) * vectors.scale[1];
    },
    function validate5(parent, vectors, memory) {
        return parent[1] * (-memory[2] * memory[5]) * vectors.scale[1] + parent[5] * (memory[0] * memory[4] - memory[1] * memory[3] * memory[5]) * vectors.scale[1] + parent[9] * (memory[1] * memory[4] + memory[0] * memory[3] * memory[5]) * vectors.scale[1];
    },
    function validate6(parent, vectors, memory) {
        return parent[2] * (-memory[2] * memory[5]) * vectors.scale[1] + parent[6] * (memory[0] * memory[4] - memory[1] * memory[3] * memory[5]) * vectors.scale[1] + parent[10] * (memory[1] * memory[4] + memory[0] * memory[3] * memory[5]) * vectors.scale[1];
    },
    function validate7(parent, vectors, memory) {
        return parent[3] * (-memory[2] * memory[5]) * vectors.scale[1] + parent[7] * (memory[0] * memory[4] - memory[1] * memory[3] * memory[5]) * vectors.scale[1] + parent[11] * (memory[1] * memory[4] + memory[0] * memory[3] * memory[5]) * vectors.scale[1];
    },
    function validate8(parent, vectors, memory) {
        return parent[0] * (memory[3]) * vectors.scale[2] + parent[4] * (-memory[1] * memory[2]) * vectors.scale[2] + parent[8] * (memory[0] * memory[2]) * vectors.scale[2];
    },
    function validate9(parent, vectors, memory) {
        return parent[1] * (memory[3]) * vectors.scale[2] + parent[5] * (-memory[1] * memory[2]) * vectors.scale[2] + parent[9] * (memory[0] * memory[2]) * vectors.scale[2];
    },
    function validate10(parent, vectors, memory) {
        return parent[2] * (memory[3]) * vectors.scale[2] + parent[6] * (-memory[1] * memory[2]) * vectors.scale[2] + parent[10] * (memory[0] * memory[2]) * vectors.scale[2];
    },
    function validate11(parent, vectors, memory) {
        return parent[3] * (memory[3]) * vectors.scale[2] + parent[7] * (-memory[1] * memory[2]) * vectors.scale[2] + parent[11] * (memory[0] * memory[2]) * vectors.scale[2];
    },
    function validate12(parent, vectors, memory) {
        return parent[0] * vectors.translation[0] + parent[4] * vectors.translation[1] + parent[8] * vectors.translation[2] + parent[12];
    },
    function validate13(parent, vectors, memory) {
        return parent[1] * vectors.translation[0] + parent[5] * vectors.translation[1] + parent[9] * vectors.translation[2] + parent[13];
    },
    function validate14(parent, vectors, memory) {
        return parent[2] * vectors.translation[0] + parent[6] * vectors.translation[1] + parent[10] * vectors.translation[2] + parent[14];
    },
    function validate15(parent, vectors, memory) {
        return parent[3] * vectors.translation[0] + parent[7] * vectors.translation[1] + parent[11] * vectors.translation[2] + parent[15];
    }
];

// Map of invalidation numbers
var DEPENDENTS = {
    global : [4369,8738,17476,34952,4369,8738,17476,34952,4369,8738,17476,34952,4096,8192,16384,32768],
    local  : {
        translation : [61440,61440,61440],
        rotation    : [4095,4095,255],
        scale       : [4095,4095,4095],
    }
};

/**
 * Transform is a component that is part of every Entity.  It is
 *   responsible for updating it's own notion of position in space and
 *   incorporating that with parent information.
 *
 * @class Transform
 * @component
 * @constructor
 */
function Transform() {
    this._matrix   = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._memory   = new Float32Array([1, 0, 1, 0, 1, 0]);
    this._vectors  = {
        translation : new Float32Array([0, 0, 0]),
        rotation    : new Float32Array([0, 0, 0]),
        scale       : new Float32Array([1, 1, 1])
    };
    this._IO       = new EventEmitter();
    this._updateFN = null;
    this._mutator  = {
        translate      : this.translate.bind(this),
        rotate         : this.rotate.bind(this),
        scale          : this.scale.bind(this),
        setTranslation : this.setTranslation.bind(this),
        setRotation    : this.setRotation.bind(this),
        setScale       : this.setScale.bind(this)
    };
    this._invalidated = 0;
}

/**
 * Return the transform matrix that represents this Transform's values 
 *   being applied to it's parent's global transform.
 *
 * @method getGlobalMatrix
 * 
 * @return {Float32 Array} representation of this Transform being applied to it's parent
 */
Transform.prototype.getGlobalMatrix = function getGlobalMatrix() {
    return this._matrix;
};

/**
 * Return the vectorized information for this Transform's local
 *   transform.
 *
 * @method getLocalVectors
 * 
 * @return {Object} object with translate, rotate, and scale keys
 */
Transform.prototype.getLocalVectors = function getVectors() {
    return this._vectors;
};

/**
 * Define the provider of state for the Transform.
 *
 * @method updateFrom
 * @chainable
 * 
 * @param  {Function} provider source of state for the Transform
 */
Transform.prototype.updateFrom = function updateFrom(provider) {
    if (provider instanceof Function || !provider) this._updateFN = provider;
    return this;
};

/**
 * Updates the local invalidation scheme based on parent information
 *
 * @method _invalidateFromParent
 * @private
 * 
 * @param  {Number} parentReport parent's invalidation
 */
function _invalidateFromParent(parentReport) {
    var counter = 0;
    while (parentReport) {
        if (parentReport & 1) this._invalidated |= DEPENDENTS.global[counter];
        counter++;
        parentReport >>>= 1;
    }
}

/**
 * Update the global matrix based on local and parent invalidations.
 *
 * @method  _update
 * @private
 * 
 * @param  {Number} parentReport invalidations associated with the parent matrix
 * @param  {Array} parentMatrix parent transform matrix as an Array
 * @return {Number} invalidation scheme
 */
Transform.prototype._update = function _update(parentReport, parentMatrix) {
    if (parentReport)  _invalidateFromParent.call(this, parentReport);
    if (!parentMatrix) parentMatrix = IDENTITY;
    if (this._updateFN) this._updateFN(this._mutator);
    var update;
    var counter     = 0;
    var invalidated = this._invalidated;

    // Based on invalidations update only the needed indicies
    while (this._invalidated) {
        if (this._invalidated & 1) {
            update = VALIDATORS[counter](parentMatrix, this._vectors, this._memory);
            if (update !== this._matrix[counter])
                this._matrix[counter] = update;
            else
                invalidated &= ((1 << 16) - 1) ^ (1 << counter);
        }

        counter++;
        this._invalidated >>>= 1;
    }

    if (invalidated) this._IO.emit('invalidated', invalidated);
    return invalidated;
};

/**
 * Add extra translation to the current values.  Invalidates
 *   translation as needed.
 *
 * @method translate
 *   
 * @param  {Number} x translation along the x-axis in pixels
 * @param  {Number} y translation along the y-axis in pixels
 * @param  {Number} z translation along the z-axis in pixels
 */
Transform.prototype.translate = function translate(x, y, z) {
    var translation = this._vectors.translation;
    var dirty       = false;
    var size;

    if (x) {
        translation[0] += x;
        dirty           = true;
    }

    if (y) {
        translation[1] += y;
        dirty           = true;
    }

    if (z) {
        translation[2] += z;
        dirty           = true;
    }

    if (dirty) this._invalidated |= 61440;
};

/**
 * Add extra rotation to the current values.  Invalidates
 *   rotation as needed.
 *
 * @method rotate
 *   
 * @param  {Number} x rotation about the x-axis in radians
 * @param  {Number} y rotation about the y-axis in radians
 * @param  {Number} z rotation about the z-axis in radians
 */
Transform.prototype.rotate = function rotate(x, y, z) {
    var rotation = this._vectors.rotation;
    this.setRotation((x ? x : 0) + rotation[0], (y ? y : 0) + rotation[1], (z ? z : 0) + rotation[2]);
};

/**
 * Add extra scale to the current values.  Invalidates
 *   scale as needed.
 *
 * @method scale
 *   
 * @param  {Number} x scale along the x-axis as a percent
 * @param  {Number} y scale along the y-axis as a percent
 * @param  {Number} z scale along the z-axis as a percent
 */
Transform.prototype.scale = function scale(x, y, z) {
    var scaleVector = this._vectors.scale;
    var dirty       = false;

    if (x) {
        scaleVector[0] += x;
        dirty     = dirty || true;
    }

    if (y) {
        scaleVector[1] += y;
        dirty     = dirty || true;
    }

    if (z) {
        scaleVector[2] += z;
        dirty     = dirty || true;
    }

    if (dirty) this._invalidated |= 4095;
};

/**
 * Absolute set of the Transform's translation.  Invalidates
 *   translation as needed.
 *
 * @method setTranslation
 * 
 * @param  {Number} x translation along the x-axis in pixels
 * @param  {Number} y translation along the y-axis in pixels
 * @param  {Number} z translation along the z-axis in pixels
 */
Transform.prototype.setTranslation = function setTranslation(x, y, z) {
    var translation = this._vectors.translation;
    var dirty       = false;
    var size;

    if (x !== translation[0] && x != null) {
        translation[0] = x;
        dirty          = dirty || true;
    }

    if (y !== translation[1] && y != null) {
        translation[1] = y;
        dirty          = dirty || true;
    }

    if (z !== translation[2] && z != null) {
        translation[2] = z;
        dirty          = dirty || true;
    }

    if (dirty) this._invalidated |= 61440;
};

/**
 * Absolute set of the Transform's rotation.  Invalidates
 *   rotation as needed.
 *
 * @method setRotate
 *   
 * @param  {Number} x rotation about the x-axis in radians
 * @param  {Number} y rotation about the y-axis in radians
 * @param  {Number} z rotation about the z-axis in radians
 */
Transform.prototype.setRotation = function setRotation(x, y, z) {
    var rotation = this._vectors.rotation;
    var dirty    = false;

    if (x !== rotation[0] && x != null) {
        rotation[0]     = x;
        this._memory[0] = Math.cos(x);
        this._memory[1] = Math.sin(x);
        dirty           = dirty || true;
    }

    if (y !== rotation[1] && y != null) {
        rotation[1]     = y;
        this._memory[2] = Math.cos(y);
        this._memory[3] = Math.sin(y);
        dirty           = dirty || true;
    }

    if (z !== rotation[2] && z != null) {
        rotation[2]        = z;
        this._memory[4]    = Math.cos(z);
        this._memory[5]    = Math.sin(z);
        this._invalidated |= 255;
    }

    if (dirty) this._invalidated |= 4095;
};

/**
 * Absolute set of the Transform's scale.  Invalidates
 *   scale as needed.
 *
 * @method setScale
 *   
 * @param  {Number} x scale along the x-axis as a percent
 * @param  {Number} y scale along the y-axis as a percent
 * @param  {Number} z scale along the z-axis as a percent
 */
Transform.prototype.setScale = function setScale(x, y, z) {
    var scale = this._vectors.scale;
    var dirty = false;

    if (x !== scale[0]) {
        scale[0] = x;
        dirty    = dirty || true;
    }

    if (y !== scale[1]) {
        scale[1] = y;
        dirty    = dirty || true;
    }

    if (z !== scale[2]) {
        scale[2] = z;
        dirty    = dirty || true;
    }

    if (dirty) this._invalidated |= 4095;
};

/**
 * Register functions to be called on the Transform's events.
 *
 * @method on
 * @chainable
 *
 */
Transform.prototype.on = function on() {
    this._IO.on.apply(this._IO, arguments);
    return this;
};

Transform.prototype.toOrigin = function toOrigin() {
    this.setTranslation(0, 0, 0);
    this.setRotation(0, 0, 0);
    this.setScale(1, 1, 1);
};

module.exports = Transform;

},{"../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Context.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var Entity         = require('./Entity');
var EntityRegistry = require('./EntityRegistry');
var Container      = require('./Components/Container');
var Camera         = require('./Components/Camera');

/**
 * Context is the definition of world space for that part of the scene graph.
 *   A context can either have a Container or not.  Having a container means
 *   that parts of the scene graph can be drawn inside of it.  If it does not
 *   have a Container then the Context is only responsible for defining world
 *   space.  The CoreSystem will start at each Context and recursive down
 *   through their children to update each entitiy's Transform, Size,
 *   and Opacity.
 *
 * @class Context
 * @entity
 * @constructor
 *   
 * @param {Object} options the starting options for the Context
 * @param {Array} options.transform the starting transform matrix
 * @param {Array} options.size the starting size
 * @param {Boolean} options.hasContainer whether or not the Context has a Container
 * @param {Boolean} options.hasCamera whether or not the Context has a Camera
 */
function Context(options) {
    if (!options || typeof options !== 'object' || (!options.size && !options.parentEl && !options.container)) throw new Error('Context, must be called with an option hash that at least has a size or a parentEl or a container property');
    Entity.call(this);
    EntityRegistry.register(this, 'Contexts');
    this._rootID = this._id;
    this._parentEl = options.parentEl;
    this._size     = _getSize(options);
    this._components.size.setPixels.apply(this._components.size, this._size);
    this._components.opacity.set.call(this._components.opacity, 1);
    this._components.transform._update((1 << 16) - 1, options.transform);
    if (options.hasContainer !== false) this._components.container = new Container(this._id, options);
    if (options.hasCamera    !== false) this._components.camera    = new Camera(this, options);
}

/**
 * A method for determining what the size of the Context is.
 *  Will be the user defined size if one was provided otherwise it
 *  will default to the DOM representation.  
 *
 * @method _getSize
 * @private
 * 
 * @param  {Object} options starting options for the sizes
 * @return {Array} size of the Context
 */
function _getSize(options) {
    if (options.size)      return options.size;
    if (options.container) return [options.container.offsetWidth, options.container.offsetHeight, 0];
    return [options.parentEl.offsetWidth, options.parentEl.offsetHeight, 0];
}

Context.prototype                     = Object.create(Entity.prototype);
Context.prototype.constructor         = Context;
Context.prototype.update              = null;
Context.prototype.registerComponent   = null;
Context.prototype.deregisterComponent = null;
Context.prototype.addComponent        = null;
Context.prototype.removeComponent     = null;
Context.prototype.getViewportSize     = function getViewportSize() {
    if (this._components.container) return this._components.container.getSize();
    return this.getSize();
};

module.exports = Context;

},{"./Components/Camera":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Camera.js","./Components/Container":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Container.js","./Entity":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Entity.js","./EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Engine.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *         
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var CoreSystem     = require('./Systems/CoreSystem'),
    OptionsManager = require('./OptionsManager'),
    DOMrenderer    = require('./Renderers/DOMrenderer'),
    GLrenderer     = require('./Renderers/WebGLRenderer'),
    RenderSystem   = require('./Systems/RenderSystem'),
    BehaviorSystem = require('./Systems/BehaviorSystem'),
    TimeSystem     = require('./Systems/TimeSystem'),
    LiftSystem     = require('../transitions/LiftSystem'),
    PhysicsSystem  = require('../physics/PhysicsSystem'),
    Context        = require('./Context');

require('./Stylesheet/famous.css');

var options = {
    loop      : true,
    direction : 1,
    speed     : 1,
    rendering : {
        renderers: {
            DOM: DOMrenderer,
            GL: GLrenderer
        }
    }
};

// TODO: what is this doing here?
document.ontouchmove = function(event){
    event.preventDefault();
};

// State
var LOOP                 = 'loop',
    RENDERING            = 'rendering',
    optionsManager       = new OptionsManager(options),
    systems              = [RenderSystem, BehaviorSystem, LiftSystem, CoreSystem, PhysicsSystem, TimeSystem], // We're going backwards
    currentRelativeFrame = 0,
    currentAbsoluteFrame = 0;

function setRenderers(renderers) {
    for (var key in renderers) {
        RenderSystem.register(key, renderers[key]);
    }
}

setRenderers(options.rendering.renderers);

optionsManager.on('change', function(data) {
    if (data.id === LOOP) {
        if (data.value) {
            requestAnimationFrame(Engine.loop);
        }
    }
    if (data.id === RENDERING) {
        setRenderers(data.value.renderers);
    }
});

/**
 * The singleton object initiated upon process
 *   startup which manages all active Systems and acts as a
 *   factory for new Contexts/
 *
 *   On static initialization, window.requestAnimationFrame is called with
 *     the event loop function.
 *     
 * @class Engine
 * @singleton
 */
var Engine = {};

/**
 * Calls update on each of the currently registered systems.
 * 
 * @method step
 */
Engine.step = function step(timestamp) {
    currentRelativeFrame += options.direction * options.speed;
    currentAbsoluteFrame++;
    var i = systems.length;
    while (i--) systems[i].update(timestamp, currentRelativeFrame, currentAbsoluteFrame);// I told you so
    return this;
};

/**
 * A wrapper around requestAnimationFrame that will step 
 * 
 * @method loop
 */
Engine.loop = function loop(timestamp) {
    if (options.loop) {
        Engine.step(timestamp);
        requestAnimationFrame(Engine.loop);
    }
    return this;
};

function _loopFor(value) {
    return function(timestamp) {
        if (value) {
            Engine.step(timestamp);
            requestAnimationFrame(_loopFor(value - 1));
        }
    };
}

Engine.loopFor = function loopFor(value) {
    requestAnimationFrame(_loopFor(value));
    return this;
};

/**
 * A wrapper for the "DOMContentLoaded" event.  Will execute
 *   a given function once the DOM have been loaded.
 *
 * @method ready
 * 
 * @param  {Function} fn Function to be called after DOM loading
 */
Engine.ready = function ready(fn) {
    var listener = function() {
        document.removeEventListener('DOMContentLoaded', listener);
        fn();
    };
    document.addEventListener('DOMContentLoaded', listener);
    return this;
};

/**
 * Will create a brand new Context.  IF a parent element is not provided,
 *   it is assumed to be the body of the document.
 *
 * @method createContext
 * 
 * @param  {Object} options Options for the Context
 * @return {Context} new Context instance
 */
Engine.createContext = function createContext(options) {
    if (typeof options === 'string') {
        var elem = document.querySelector(options);
        if (!(elem instanceof HTMLElement)) throw new Error('the passed in string should be a query selector which returns an element from the dom');
        else                                return new Context({parentEl: elem});
    }

    if (options instanceof HTMLElement)
        return new Context({parentEl: options});

    if (!options)
        return new Context({parentEl: document.body}); // TODO it should be possible to delay assigning document.body until this hits the render stage. This would remove the need for Engine.ready

    if (!options.parentEl && !options.container)
        options.parentEl = document.body;

    return new Context(options);
};

/**
 * Adds a system to the list of systems to update on a per frame basis
 *
 * @method addSystem
 * 
 * @param {System} system System to get run every frame
 */
Engine.addSystem = function addSystem(system) {
    if (system instanceof Object && system.update instanceof Function)
        return systems.splice(systems.indexOf(RenderSystem) + 1, 0, system);
    else throw new Error('systems must be an object with an update method');
};

/**
 * Removes a system from the list of systems to update on a per frame basis
 *
 * @method removeSystem
 * 
 * @param {System} system System to get run every frame
 */
Engine.removeSystem = function removeSystem(system) {
    if (system instanceof Object && system.update instanceof Function) {
        var index = systems.indexOf(system);
        if (index === -1) return false;
        systems.splice(index, 1);
        return true;
    } else throw new Error('systems must be an object with an update method');
};

/**
 * Delegate to the optionsManager.
 *
 * @method setOptions
 * 
 * @param {Object} options Options to patch
 */
Engine.setOptions = optionsManager.setOptions.bind(optionsManager);

/**
 * Set the direction of the flow of time.
 *
 * @method setDirection
 * 
 * @param {Number} val direction as -1 or 1
 */
Engine.setDirection = function setDirection(val) {
    if (val !== 1 && val !== -1) throw new Error('direction must be either 1 for forward or -1 for reverse');
    optionsManager.set('direction', val);
    return this;
};

/**
 * Get the direction of the flow of time.
 *
 * @method getDirection
 * 
 * @return {Number} direction as -1 or 1
 */
Engine.getDirection = function getDirection() {
    return options.direction;
};

/**
 * Set the speed of time.
 *
 * @method setSpeed
 * 
 * @param {Number} val ratio to human time
 */
Engine.setSpeed = function setSpeed(val) {
    if (typeof val !== 'number') throw new Error('speed must be a number, used as a scale factor for the movement of time');
    optionsManager.set('speed', val);
    return this;
};

/**
 * Get the speed of time.
 *
 * @method getSpeed
 * 
 * @return {Number} val ratio to human time
 */
Engine.getSpeed = function getSpeed() {
    return options.speed;
};

/**
 * Get the current frame
 *
 * @method getAbsoluteFrame
 *
 * @return {Number} the current frame number
 */
Engine.getAbsoluteFrame = function getAbsoluteFrame() {
    return currentAbsoluteFrame;
};

/**
 * Get the current frame taking into account engine speed and direction
 *
 * @method getRelativeFrame
 *
 * @return {Number} the current frame number taking into account Engine speed and direction
 */
Engine.getRelativeFrame = function getRelativeFrame() {
    return currentRelativeFrame;
};

module.exports = Engine;

//Start the loop
Engine.ready(function() {
    requestAnimationFrame(Engine.loop);
});

},{"../physics/PhysicsSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\PhysicsSystem.js","../transitions/LiftSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\transitions\\LiftSystem.js","./Context":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Context.js","./OptionsManager":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\OptionsManager.js","./Renderers/DOMrenderer":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Renderers\\DOMrenderer.js","./Renderers/WebGLRenderer":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Renderers\\WebGLRenderer.js","./Stylesheet/famous.css":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Stylesheet\\famous.css","./Systems/BehaviorSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\BehaviorSystem.js","./Systems/CoreSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\CoreSystem.js","./Systems/RenderSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\RenderSystem.js","./Systems/TimeSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\TimeSystem.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Entity.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *         
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityRegistry = require('./EntityRegistry'),
    Transform      = require('./Components/Transform'),
    Size           = require('./Components/Size'),
    Opacity        = require('./Components/Opacity');

/**
 * Entity is the core of the Famo.us scene graph.  The scene graph
 *   is constructed by adding Entitys to other Entities to define heirarchy.
 *   Each Entity comes with a Transform component with the
 *   ability to add infinite other components.  It also acts as a factory by creating
 *   new Entities that will already be considered it's children.
 *
 * @class Entity
 * @entity
 * @constructor
 */
function Entity() {
    EntityRegistry.register(this, 'CoreSystem');

    this._components = {
        transform : new Transform(this._id),
        size      : new Size(this._id),
        opacity   : new Opacity(this._id)
    };

    this._behaviors = [];

    this._parentID   = null;
    this._rootID     = null;

    this._childrenIDs = [];
}

/**
 * Adds a new instance of a component to the Entity.
 *
 * @method  registerComponent
 * 
 * @param  {Function} Constructor constructor function for a component
 * @param  {Object} options options to be passed into the constructor
 * @return {Object} instance of the instantitated component
 */

Entity.prototype.registerComponent = function registerComponent(Constructor, options) {
    if (!Constructor || !(Constructor instanceof Function)) throw new Error('The first argument to .registerComponent must be a component Constructor function');
    if (!Constructor.toString)                              throw new Error('The passed-in component Constructor must have a "toString" method.');

    var component = new Constructor(this._id, options);
    if (component.update) this._behaviors.push(Constructor.toString());
    this._components[Constructor.toString()] = component;
    return component;
};

/**
 * Alias for registerComponent
 * 
 * @method addComponent
 */
Entity.prototype.addComponent = Entity.prototype.registerComponent;

/**
 * Removes a component from the Entity.
 *
 * @method deregisterComponent
 * 
 * @param  {String} type id of the component
 * @return {Boolean} status of the removal
 */
Entity.prototype.deregisterComponent = function deregisterComponent(type) {
    if (typeof type !== 'string') throw new Error('Entity.deregisterComponent must be passed a String as the first parameter');
    if (this._components[type] === undefined || this._components[type] === null) throw new Error('no component of that type');

    this._components[type].cleanup && this._components[type].cleanup();
    this._components[type] = null;

    var behaviorIndex = this._behaviors.indexOf(type);
    if (behaviorIndex > -1)
        this._behaviors.splice(behaviorIndex, 1);

    return true;
};

/**
 * Alias for deregisterComponent
 * 
 * @method removeComponent
 */
Entity.prototype.removeComponent = Entity.prototype.deregisterComponent;

/**
 * Find out if the Entity has a component of a certain name.
 *
 * @method hasComponent
 * 
 * @param  {String} type name of the component
 * @return {Boolean} existance of a component by that name
 */
Entity.prototype.hasComponent = function hasComponent(type) {
    return this._components[type] != null;
};

/**
 * Get a component by name
 *
 * @method getComponent
 * 
 * @param  {String} type name of the component
 * @return {Object} component instance
 */
Entity.prototype.getComponent = function getComponent(type) {
    return this._components[type];
};

/**
 * Get all of the Entity's components
 *
 * @method getAllComponents
 * 
 * @return {Object} Hash of all of the components indexed by name 
 */
Entity.prototype.getAllComponents = function getAllComponents() {
    return this._components;
};

/**
 * Get all of the child nodes in the scene graph
 *
 * @method  getChildren
 * 
 * @return {Array} child entities
 */
Entity.prototype.getChildren = function getChildren() {
    var dereferencedChildren = [];

    for (var i = 0; i < this._childrenIDs.length; i++) {
        var child = EntityRegistry.getEntity(this._childrenIDs[i]);
        dereferencedChildren.push(child);
    }

    return dereferencedChildren;
};

Entity.prototype.getParent = function getParent() {
    return EntityRegistry.getEntity(this._parentID);
};

/**
 * Get the context of the node.
 *
 * @method getContext
 *
 * @return Context Node
 */
Entity.prototype.getContext = function getContext() {
    return EntityRegistry.getEntity(this._rootID);
};

/**
 * Add a new Entity as a child and return it.
 *
 * @method addChild
 *
 * @return {Entity} child Entity
 */
Entity.prototype.addChild = function addChild(entity) {
    if (entity != null && !(entity instanceof Entity)) throw new Error('Only Entities can be added as children of other entities');
    if (entity) {
        var id = entity._id;
        if (this._childrenIDs.indexOf(id) > -1) return void 0;
        if (entity._parentID != null) entity.getParent().detatchChild(entity);
        entity._parentID = this._id;
        _updateChildRoot(entity, this._rootID);
        this._childrenIDs.push(id);
        entity.getComponent('transform').invalidations |= (1 << 16) - 1;
        return entity;
    } else {
        var node       = new Entity();
        node._parentID = this._id;
        node._rootID   = this._rootID;
        this._childrenIDs.push(node._id);
        return node;
    }
};

function _updateChildRoot(child, rootID) {
    child._rootID = rootID;

    var grandChildren = child.getChildren();
    for (var i = 0; i < grandChildren.length; i++) {
        _updateChildRoot(grandChildren[i], rootID)
    }
}


/**
 * Remove a Entity's child.
 *
 * @method detatchChild
 *
 * @return {Entity|void 0} child Entity or void 0 if it is not a child
 */
Entity.prototype.detatchChild = function detatchChild(node) {
    if (!(node instanceof Entity)) throw new Error('Entity.detatchChild only takes in Entities as the parameter');
    var index = this._childrenIDs.indexOf(node._id);
    if (index >= 0) {
        this._childrenIDs.splice(index, 1)[0];
        node._parentID = null;
        return node;
    } else return void 0;
};

/**
 * Remove this Entity from the EntityRegistry
 *
 * @method cleanup
 */
Entity.prototype.cleanup = function cleanup() {
    EntityRegistry.cleanup(this);
};

/**
 * Update all of the custom components on the Entity
 * 
 * @method update
 */
Entity.prototype.update = function update() {
    var i = this._behaviors.length;

    while (i--)
        this._components[this._behaviors[i]].update(this);
};


var emptyVector = new Float32Array([0, 0, 0, 1]);

function _getSize(entity, result) {
    var i      = entity._childrenIDs.length,
        matrix = entity.getComponent('transform')._matrix;

    while (i--) {
        var child = EntityRegistry.getEntity(entity._childrenIDs[i]);
        _getSize(child, result);
    }

    for (var key in entity._components)
        if (entity._components[key].getSize) {

            var size   = entity._components[key].getSize(),
                right  = size.displacement.right  + size.origin[0] - result.origin[0],
                bottom = size.displacement.bottom + size.origin[1] - result.origin[1],
                near   = size.displacement.near   + size.origin[2] - result.origin[2],
                left   = size.displacement.left   + size.origin[0] - result.origin[0],
                top    = size.displacement.top    + size.origin[1] - result.origin[1],
                far    = size.displacement.far    + size.origin[2] - result.origin[2];

            if (right  > result.displacement.right)  result.displacement.right  = right;
            if (bottom > result.displacement.bottom) result.displacement.bottom = bottom;
            if (near   > result.displacement.near)   result.displacement.near   = near;
            if (left   < result.displacement.left)   result.displacement.left   = left;
            if (top    < result.displacement.top)    result.displacement.top    = top;
            if (far    < result.displacement.far)    result.displacement.far    = far;
        }

    var x = matrix[12] - result.origin[0], y = matrix[13] - result.origin[1], z = matrix[14] - result.origin[2];
    if (x > result.displacement.right)  result.displacement.right  = x;
    if (x < result.displacement.left)   result.displacement.left   = x;
    if (y > result.displacement.bottom) result.displacement.bottom = y;
    if (y < result.displacement.top)    result.displacement.top    = y;
    if (z > result.displacement.near)   result.displacement.near   = z;
    if (z < result.displacement.far)    result.displacement.far    = z;
}

Entity.prototype.getSize = function getSize() {
    var matrix = this.getComponent('transform')._matrix,
        i      = this._childrenIDs.length,
        result = {
            displacement: {
                right  : 0,
                bottom : 0,
                near   : 0,
                left   : 0,
                top    : 0,
                far    : 0
            },
            origin: [matrix[12], matrix[13], matrix[14]]
    };

    while (i--) {
        var child = EntityRegistry.getEntity(this._childrenIDs[i]);
        _getSize(child, result);
    }
    result.size = [result.displacement.right - result.displacement.left, result.displacement.bottom - result.displacement.top, result.displacement.near - result.displacement.far];
    return result;
};

module.exports = Entity;

},{"./Components/Opacity":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Opacity.js","./Components/Size":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Size.js","./Components/Transform":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Transform.js","./EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityCollection.js":[function(require,module,exports){
var Entity       = require('./Entity'),
    EventEmitter = require('../events/EventEmitter');

function EntityCollection(num) {
    this.entities = [];

    this.IO = new EventEmitter();

    Object.defineProperty(this, 'length', {
        get: function get() {
            return this.entities.length;
        }
    });

    if (typeof num === 'number') while (num--) this.push(new Entity());
    else if (num instanceof Array) {
        var i   = -1,
            len = num.length;
        while (len - ++i) this.push(num[i]);
    }
}

EntityCollection.prototype.push = function push(entity) {
    if (entity instanceof Entity) {
        this.entities.push(entity);
        this.IO.emit('entityAdded', entity);
        return this;
    } else throw new Error('entity collections can only have entities added to them');
};

EntityCollection.prototype.pop = function pop() {
    var entity = this.entities.pop();
    this.IO.emit('entityRemoved', entity);
    return entity;
};

EntityCollection.prototype.shift = function shift() {
    var entity = this.entities.shift();
    this.IO.emit('entityRemoved', entity);
    return entity;
};

EntityCollection.prototype.unshift = function unshift(entity) {
    if (entity instanceof Entity) {
        this.entities.shift(entity);
        this.IO.emit('entityAdded', entity);
        return this;
    } else throw new Error('entity collections can only have entities added to them');
};

EntityCollection.prototype.splice = function splice(index, howMany, elements) {
    var i, len;
    if (elements instanceof Array) {
        i   = -1,
        len = elements.length;
        while (len - ++i) {
            if (!(elements[i] instanceof Entity)) throw new Error('entity collections can only have entities added to them');
            this.entities.splice(index + howMany, 0, elements[i]);
            this.IO.emit('entityAdded', elements[i]);
        }
    }
    if (elements instanceof Entity) {
        this.entities.splice(index + howMany, 0, elements);
        this.IO.emit('entityAdded', elements);
    }
    if (elements instanceof EntityCollection) {
        var self = this;
        elements.forEach(function(element) {
            self.entities.splice(index + howMany, 0, element);
            self.IO.emit('entityAdded', elements);
        });
    }
    var removed = this.entities.splice(index, howMany);
    i           = -1;
    len         = removed.length;
    while (len - ++i) this.IO.emit('entity removed', removed[i]);
    return removed;
};

EntityCollection.prototype.clone = function clone() {
    var i      = -1,
        length = this.entities.length,
        result = new EntityCollection(0);

    while (length - ++i) result.push(this.entities[i]);

    return result;
};

EntityCollection.prototype.filter = function filter(fn) {
    var i      = -1,
        length = this.entities.length,
        result = new EntityCollection(0);

    if (typeof fn !== 'function') throw new Error('EntityCollection.filter only accepts functions as a parameter');

    while (length - ++i) if (fn(this.entities[i], i, this.entities)) result.push(this.entities[i]);

    return result;
};

EntityCollection.prototype.reject = function reject(fn) {
    var i      = -1,
        length = this.entities.length,
        result = new EntityCollection(0);

    if (typeof fn !== 'function') throw new Error('EntityCollection.reject only accepts functions as a parameter');

    while (length - ++i) if (!fn(this.entities[i], i, this.entities)) result.push(this.entities[i]);

    return result;
};

/**
 * Execute a function that iterates over the collection
 *  of Entities and calls a function where the parameters
 *  are, the Entity, index, and full collection of Entities.
 *
 * @method forEach
 * 
 * @param {Function} function to be run per Entity
 */
EntityCollection.prototype.forEach = function forEach(fn) {
    var i      = -1,
        length = this.entities.length;

    if (typeof fn !== 'function') throw new Error('EntityCollection.forEach only accepts functions as a parameter');

    while (length - ++i) fn(this.entities[i], i, this.entities);
    return this;
};

/**
 * Implements reduce on the collection of Entities
 *
 * @method reduce
 * 
 * @param {Function} function to be run per Entity
 * @param {*} initialValue initial value of the reduce function
 * 
 * @return {*} value after each Entity has had the function run
 */
EntityCollection.prototype.reduce = function reduce(fn, initialValue) {
    var i      = -1,
        length = this.entities.length,
        accumulator;

    if (typeof fn !== 'function') throw new Error('EntityCollection.reduce only accepts functions as a parameter');

    if (initialValue != null) accumulator = initialValue;
    else                      accumulator = this.entities[++i];
    while (length - ++i)      accumulator = fn(accumulator, this.entities[i], i, this.entities);

    return accumulator;
};

/**
 * Implements map on the collection of Entities
 *
 * @method map
 * 
 * @param {Function} function to be run per Entity
 *
 * @return {Array} array of the return values of the mapping function
 */
EntityCollection.prototype.map = function map(fn) {
    var i      = -1,
        length = this.entities.length,
        result = [];

    if (typeof fn !== 'function') throw new Error('EntityCollection.map only accepts functions as a parameter');

    while (length - ++i) result.push(fn(this.entities[i], i, this.entities));

    return result;
};

/**
 * Delegates to the EventHandlers "on"
 *
 * @method on
 */
EntityCollection.prototype.on = function on() {
    return this.IO.on.apply(this.IO, arguments);
};

/**
 * Delegates to the EventHandlers "on"
 *
 * @method off
 */
EntityCollection.prototype.off = function off() {
    return this.IO.removeListener.apply(this.IO, arguments);
};

/**
 * Find where and if an Entity is in the array
 *
 * @method indexOf
 * 
 * @result {Number} index of Entity in the array
 */
EntityCollection.prototype.indexOf = function indexOf() {
    return this.entities.indexOf.apply(this.entities, arguments);
};

/**
 * Removes and entity from the array and emits a message
 *
 * @method remove
 * 
 * @result {Entity} removed Entity
 */
EntityCollection.prototype.remove = function remove(entity) {
    var index = this.entities.indexOf(entity);
    this.IO.emit('entity removed', entity);
    if (index < 0) return false;
    else           return this.entities.splice(index, 1)[0];
};

/**
 * Get the Entity are a particular index
 *
 * @method get
 * 
 * @result {Entity} Entity at that index
 */
EntityCollection.prototype.get = function get(index) {
    return this.entities[index];
};

/**
 * Find of if the EntityCollection has an Entity
 *
 * @method has
 * 
 * @result {Boolean} existence of the Entity in the EntityCollection
 */
EntityCollection.prototype.has = function has(entity) {
    return this.entities.indexOf(entity) !== -1;
};

EntityCollection.prototype.reverse = function reverse() {
    var i      = this.entities.length;
        result = new EntityCollection(0);

    while (i--) result.push(this.entities[i]);
    return result;
};

function _merge(left, right, arr, comparison) {
    var a = 0;
    while (left.length && right.length) arr[a++] = comparison(left[0], right[0]) < 0 ? left.shift() : right.shift();
    while (left.length) arr[a++] = left.shift();
    while (right.length) arr[a++] = right.shift();
}

function _mSort(arr, tmp, l, comparison) {
    if (l===1) return;
    var m = (l/2)|0,
        tmp_l = tmp.slice(0, m),
        tmp_r = tmp.slice(m);
    _mSort(tmp_l, arr.slice(0, m),  m, comparison);
    _mSort(tmp_r, arr.slice(m), l - m, comparison);
    _merge(tmp_l, tmp_r, arr, comparison);
    return arr;
}

EntityCollection.prototype.sort = function sort(comparison) {
    return new EntityCollection(_mSort(this.entities.slice(), this.entities.slice(), this.entities.length, comparison));
};

module.exports = EntityCollection;
},{"../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventEmitter.js","./Entity":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Entity.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityCollection = require('./EntityCollection');

// Map of an Entity's position in a EntityCollection
var entities = [];

// Storage of Entity arrays
var entityCollections = {
    everything: new EntityCollection()
};

// Pool of free spaces in the entites array
var freed = [];

/**
 * A singleton object that manages the Entity reference system.
 *   Entities can be part of many EntityCollections depending on implementation.
 *   
 * @class EntityRegistry
 * @singleton
 */
var EntityRegistry = module.exports;

/**
 * Adds a new EntityCollection key to the entityCollections object.
 *
 * @method  addCollection
 * 
 * @param {String} collection name of the EntityCollection
 * @return {EntityCollection} the EntityCollection added
 */
EntityRegistry.addCollection = function addCollection(collection) {
    if (!collection)                    throw new Error('.addCollection needs to have a name specified');
    if (typeof collection !== 'string') throw new Error('.addCollection can only take a string as an argument');
    if (!entityCollections[collection]) entityCollections[collection] = new EntityCollection();
    return entityCollections[collection];
};

/**
 * Get the EntityCollection by name.
 *
 * @method  getCollection
 * 
 * @param {String} collection name of the EntityCollection
 * @return {EntityCollection|undefined} EntityCollection referenced by a particular name
 */
EntityRegistry.getCollection = function getCollection(collection) {
    return entityCollections[collection];
};

/**
 * Removes a particular EntityCollection from the registry
 *
 * @method  removeCollection
 * 
 * @param {String} collection name of the EntityCollection to remove
 * @return {EntityCollection} EntityCollection that was removed
 */
EntityRegistry.removeCollection = function removeCollection(collection) {
    if (!collection)                    throw new Error('.removeCollection needs to have a collection specified');
    if (typeof collection !== 'string') throw new Error('.removeCollection can only take a string as an argument');

    var currCollection = entityCollections[collection];
    if (!currCollection) return false;

    var i = currCollection.length;
    while (i--) delete entities[currCollection.get(i)._id][collection];

    delete entityCollections[collection];
    return currCollection;
};

/**
 * Adds an entity to a particular collection.
 *
 * @method register
 * 
 * @param  {Entity} instance of an Entity
 * @param  {String} collection name of the EntityCollection to register the entity to
 * @return {Number} id of the Entity
 */
EntityRegistry.register = function register(entity, collection) {
    var idMap;
    if (entity._id == null) {
        Object.defineProperty(entity, '_id', {
            value        : EntityRegistry.getNewID(),
            configurable : false
        });
    }

    var id = entity._id;
    if (entities[id]) {
        idMap = entities[id];
    }
    else {
        idMap = {everything: entityCollections.everything.length};
        entityCollections.everything.push(entity);
    }

    if (collection) {
        if (!entityCollections[collection]) EntityRegistry.addCollection(collection);
        idMap[collection] = entityCollections[collection].length;
        entityCollections[collection].push(entity);
    }

    if (!entities[id]) entities[id] = idMap;
    return id;
};

/**
 * Removes an entity from a EntityCollection
 *
 * @method  deregister
 * 
 * @param  {Entity} entity instance of an Entity
 * @param  {String} collection name of EntityCollection to remove the Entity from
 * @return {Booleam} status of the removal
 */
EntityRegistry.deregister = function deregister(entity, collection) {
    var currentEntity;
    var position = entities[entity._id][collection];
    if (position === undefined) return false;
    entities[entity._id][collection] = null;
    entityCollections[collection].remove(entity);

    var currentEntity;
    for (var i = 0; i < entities.length; i++) {
        currentEntity = entities[i];

        if (currentEntity && currentEntity[collection] > position) currentEntity[collection]--;
    }

    return true;
};

/**
 * Get the id map of the Entity.  Each Entity has an object that
 *   defined the indicies of where it is in each EntityCollection.
 *
 * @method  get
 * 
 * @param  {Number} id ID of the Entity
 * @return {Object} id map of the Entity's index in each EntityCollection
 */
EntityRegistry.get = function get(id) {
    return entities[id];
};

/**
 * Find out if a given entity exists and a specified EntityCollection.
 *
 * @method  inCollection
 * 
 * @param  {Entity} entity Entity instance
 * @param  {String} collection name of the EntityCollection
 * @return {Boolean} whether or not the Entity is in a given EntityCollection
 */
EntityRegistry.inCollection = function inCollection(entity, collection) {
    return entities[entity._id][collection] !== undefined;
};

/**
 * Get a unique ID for an Entity
 *
 * @method  getNewID
 * 
 * @return {Number} ID for an Entity
 */
EntityRegistry.getNewID = function getNewID() {
    if(freed.length) return freed.pop();
    else return entities.length;
};

/**
 * Remove an entity and all references to it.
 *
 * @method cleanup
 * 
 * @param  {Entity} entity Entity instance to remove
 * @return {Number} ID of the Entity that was removed
 */
EntityRegistry.cleanup = function cleanup(entity) {
    var currentEntity;
    var idMap            = entities[entity._id];
    entities[entity._id] = null;

    for (var i = 0; i < entities.length; i++) {
        currentEntity = entities[i];

        if (currentEntity)
            for (var key in idMap)
                if (currentEntity[key] && currentEntity[key] > idMap[key])
                    currentEntity[key]--;
    }

    for (var key in idMap) {
        entityCollections[key].splice(idMap[key], 1);
    }

    freed.push(entity._id);
    return entity._id;
};

/**
 * Get an Entity by id
 *
 * @method getEntity
 * 
 * @param  {Number} id id of the Entity
 * @return {Entity} entity with the id provided
 */
EntityRegistry.getEntity = function getEntity(id) {
    if (!entities[id]) return false;
    return entityCollections.everything.get(entities[id].everything);
};

/**
 * Remove all Entities from the entity registry
 *
 * @method clear
 */
EntityRegistry.clear = function clear() {
    var everything = EntityRegistry.getCollection('everything');
    while (everything.length) EntityRegistry.cleanup(everything.pop());
};

// Regsiter the default entityCollections
EntityRegistry.addCollection('Roots');
EntityRegistry.addCollection('CoreSystem');

// module.exports = EntityRegistry;

},{"./EntityCollection":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityCollection.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\OptionsManager.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */
 
'use strict';

var EventHandler = require('../events/EventHandler');

/**
 *  A collection of methods for setting options which can be extended
 *  onto other classes.
 *
 *
 * @class OptionsManager
 * @constructor
 * 
 * @param {Object} value options dictionary
 */
function OptionsManager(value) {
    this._value = value;
    this.eventOutput = null;
}

/**
 * Create options manager from source dictionary with arguments overriden by patch dictionary.
 *
 * @static
 * @method OptionsManager.patch
 *
 * @param {Object} source source arguments
 * @param {...Object} data argument additions and overwrites
 * @return {Object} source object
 */
OptionsManager.patch = function patchObject(source, data) {
    var manager = new OptionsManager(source);
    for (var i = 1; i < arguments.length; i++) manager.patch(arguments[i]);
    return source;
};

function _createEventOutput() {
    this.eventOutput = new EventHandler();
    this.eventOutput.bindThis(this);
    EventHandler.setOutputHandler(this, this.eventOutput);
}

/**
 * Create OptionsManager from source with arguments overriden by patches.
 *   Triggers 'change' event on this object's event handler if the state of
 *   the OptionsManager changes as a result.
 *
 * @method patch
 *
 * @param {...Object} arguments list of patch objects
 * @return {OptionsManager} this
 */
OptionsManager.prototype.patch = function patch() {
    var myState = this._value;
    for (var i = 0; i < arguments.length; i++) {
        var data = arguments[i];
        for (var k in data) {
            if ((k in myState) && (data[k] && data[k].constructor === Object) && (myState[k] && myState[k].constructor === Object)) {
                if (!myState.hasOwnProperty(k)) myState[k] = Object.create(myState[k]);
                this.key(k).patch(data[k]);
                if (this.eventOutput) this.eventOutput.emit('change', {id: k, value: data[k]});
            }
            else this.set(k, data[k]);
        }
    }
    return this;
};

/**
 * Alias for patch
 *
 * @method setOptions
 *
 */
OptionsManager.prototype.setOptions = OptionsManager.prototype.patch;

/**
 * Return OptionsManager based on sub-object retrieved by key
 *
 * @method key
 *
 * @param {string} identifier key
 * @return {OptionsManager} new options manager with the value
 */
OptionsManager.prototype.key = function key(identifier) {
    var result = new OptionsManager(this._value[identifier]);
    if (!(result._value instanceof Object) || result._value instanceof Array) result._value = {};
    return result;
};

/**
 * Look up value by key
 * @method get
 *
 * @param {string} key key
 * @return {Object} associated object
 */
OptionsManager.prototype.get = function get(key) {
    return this._value[key];
};

/**
 * Alias for get
 * @method getOptions
 */
OptionsManager.prototype.getOptions = OptionsManager.prototype.get;

/**
 * Set key to value.  Outputs 'change' event if a value is overwritten.
 *
 * @method set
 *
 * @param {string} key key string
 * @param {Object} value value object
 * @return {OptionsManager} new options manager based on the value object
 */
OptionsManager.prototype.set = function set(key, value) {
    var originalValue = this.get(key);
    this._value[key] = value;

    if (this.eventOutput && value !== originalValue) this.eventOutput.emit('change', {id: key, value: value});
    return this;
};

/**
 * Return entire object contents of this OptionsManager.
 *
 * @method value
 *
 * @return {Object} current state of options
 */
OptionsManager.prototype.value = function value() {
    return this._value;
};

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @method "on"
 *
 * @param {string} type event type key (for example, 'change')
 * @param {function(string, Object)} handler callback
 * @return {EventHandler} this
 */
OptionsManager.prototype.on = function on() {
    _createEventOutput.call(this);
    return this.on.apply(this, arguments);
};

/**
 * Unbind an event by type and handler.
 *   This undoes the work of "on".
 *
 * @method removeListener
 *
 * @param {string} type event type key (for example, 'change')
 * @param {function} handler function object to remove
 * @return {EventHandler} internal event handler object (for chaining)
 */
OptionsManager.prototype.removeListener = function removeListener() {
    _createEventOutput.call(this);
    return this.removeListener.apply(this, arguments);
};

/**
 * Add event handler object to set of downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
OptionsManager.prototype.pipe = function pipe() {
    _createEventOutput.call(this);
    return this.pipe.apply(this, arguments);
};

/**
 * Remove handler object from set of downstream handlers.
 * Undoes work of "pipe"
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
OptionsManager.prototype.unpipe = function unpipe() {
    _createEventOutput.call(this);
    return this.unpipe.apply(this, arguments);
};

module.exports = OptionsManager;
},{"../events/EventHandler":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventHandler.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Renderers\\DOMrenderer.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var OptionsManager   = require('../OptionsManager'),
    Surface          = require('../Components/Surface'),
    Container        = require('../Components/Container'),
    ElementAllocator = require('./ElementAllocator'),
    EntityRegistry   = require('../EntityRegistry'),
    MatrixMath       = require('../../math/4x4matrix');

// State
var containersToElements = [],
    surfacesToElements   = {},
    containersToSurfaces = [],
    targets              = [Surface.toString()];

var usePrefix = document.createElement('div').style.webkitTransform != null;

// CONSTS
var ZERO                = 0,
    DEVICEPIXELRATIO    = window.devicePixelRatio || 1,
    MATRIX3D            = 'matrix3d(',
    CLOSE_PAREN         = ')',
    COMMA               = ',',
    DIV                 = 'div',
    FA_CONTAINER        = 'fa-container',
    FA_SURFACE          = 'fa-surface',
    CONTAINER           = 'container',
    PX                  = 'px',
    SURFACE             = 'surface',
    TRANSFORM           = 'transform',
    CSSTRANSFORM        = usePrefix ? 'webkitTransform' : 'transform',
    CSSTRANSFORM_ORIGIN = usePrefix ? 'webkitTransformOrigin' : 'transformOrigin';

//scratch memory for matrix calculations
var matrixScratch1   = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    matrixScratch2   = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    matrixScratch3   = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    matrixScratch4   = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

/**
 * DOMRenderer is a singleton object whose responsiblity it is
 *  to draw DOM bound Surfaces to their respective Containers.
 *
 * @class DOMRenderer
 * @singleton
 */
var DOMRenderer = {
    _queues: {
        containers: {
            update: [],
            recall: [],
            deploy: []
        },
        surfaces: {}
    },
    allocators: {}
};

/**
 * Add an Entity with a Container component to the queue to be
 *  added into the DOM.
 *
 * @method deployContainer
 * 
 * @param {Entity} entity Entity that needs to be deployed
 */
DOMRenderer.deployContainer = function deployContainer(entity) {
    this._queues.containers.deploy.push(entity);
    containersToSurfaces[entity._id]  = {};
    this._queues.surfaces[entity._id] = {
        update: [],
        recall: [],
        deploy: []
    };
};

// Deploy a given Entity's Container to the DOM.
function _deployContainer(entity) {
    var context = entity.getContext();

    // If the Container has not previously been deploy and
    // does not have an allocator, create one.
    if (!DOMRenderer.allocators[context._id])
        DOMRenderer.allocators[context._id] = new ElementAllocator(context._parentEl);

    // Create the DOM representation of the Container
    var element = DOMRenderer.allocators[context._id].allocate(DIV);
    containersToElements[entity._id] = element;
    _updateContainer(entity, element);
    element.classList.add(FA_CONTAINER);

    DOMRenderer.allocators[entity._id] = new ElementAllocator(element);
}

/**
 * Add an Entity with a Container component to the queue to be
 *  removed from the DOM.
 *
 * @method recallContainer
 * 
 * @param {Entity} entity Entity that needs to be recalled
 */
DOMRenderer.recallContainer = function recallContainer(entity) {
    this._queues.containers.recall.push(entity);
    delete this._queues.surfaces[entity._id];
};

// Recall the DOM representation of the Entity's Container
// and clean up references.
function _recallContainer(entity) {
    var element = containersToElements[entity._id];
    var context = entity.getContext();
    DOMRenderer.allocators[context._id].deallocate(element);
    element.classList.remove(FA_CONTAINER);
    delete DOMRenderer.allocators[entity._id];
}

/**
 * Add an Entity with a Container component to the queue to be
 *  updated.
 *
 * @method updateContainer
 * 
 * @param {Entity} entity Entity that needs to be updated
 */
DOMRenderer.updateContainer = function updateContainer(entity) {
    this._queues.containers.update.push(entity);
};

// Update the Container's DOM properties
function _updateContainer(entity) {
    var container = entity.getComponent(CONTAINER),
        element   = containersToElements[entity._id],
        i         = 0,
        size,
        origin,
        contextSize;

    if (container._events.dirty) {
        i = container._events.on.length;
        while (container._events.off.length) element.removeEventListener(container._events.off.pop(), container._events.forwarder);
        while (i--) element.removeEventListener(container._events.on[i], container._events.forwarder);
        container._events.dirty = false;
    }

    if (container._sizeDirty || container._transformDirty) {
        contextSize = entity.getContext()._size;
        size        = container.getCSSSize();
        origin      = container.origin;
    }

    if (container._sizeDirty) {
        element.style.width  = size[0] + PX;
        element.style.height = size[1] + PX;
        container._sizeDirty = false;
        container._setVertexDisplacement(element.offsetWidth, element.offsetHeight);
    }

    if (container._transformDirty) {
        var transform               = DOMRenderer.createDOMMatrix(entity.getComponent(TRANSFORM)._matrix, contextSize, size, origin);
        element.style[CSSTRANSFORM] = DOMRenderer.stringifyMatrix(transform);
        container._transformDirty = false;

        var keys = Object.keys(containersToSurfaces[entity._id]);
        i        = keys.length;
        while (i--)
            if (containersToSurfaces[entity._id][keys[i]])
                containersToSurfaces[entity._id][keys[i]].getComponent(SURFACE).invalidations |= Surface.invalidations.transform;
    }
}

/**
 * Add an Entity with a Surface to the queue to be deployed
 *  to a particular Container.
 *
 * @method deploy
 * 
 * @param {Entity} entity Entity that needs to be deployed
 * @param {Entity} container Entity that the Surface will be deployed to
 */
DOMRenderer.deploy = function deploy(entity, container) {
    if (!surfacesToElements[entity._id]) surfacesToElements[entity._id] = {};
    DOMRenderer._queues.surfaces[container._id].deploy.push(entity);
    containersToSurfaces[container._id][entity._id] = entity;
};

// Deploys the Entity's Surface to a particular Container.
function _deploy(entity, containerID) {
    var element = DOMRenderer.allocators[containerID].allocate(entity.getComponent(SURFACE).tagName || DIV);
    entity.getComponent(SURFACE).invalidateAll();
    surfacesToElements[entity._id][containerID] = element;
    element.classList.add(FA_SURFACE);
    _update(entity, containerID);
}

/**
 * Add an Entity with a Surface to the queue to be recalled
 *  from a particular Container.
 *
 * @method recall
 * 
 * @param {Entity} entity Entity that needs to be recalled from
 * @param {Entity} container Entity that the Surface will be recalled from
 */
DOMRenderer.recall = function recall(entity, container) {
    DOMRenderer._queues.surfaces[container._id].recall.push(entity);
    containersToSurfaces[container._id][entity._id] = false;
};

// Recalls the Entity's Surface from a given Container
function _recall(entity, containerID) {
    var element = surfacesToElements[entity._id][containerID];
    var surface = entity.getComponent('surface');
    DOMRenderer.allocators[containerID].deallocate(element);
    var i = surface.spec.events.length;
    while (i--) element.removeEventListener(surface.spec.events[i], surface.eventForwarder);
}

/**
 * Add an Entity with a Surface to the queue to be updated
 *
 * @method update
 * 
 * @param {Entity} entity Entity that needs to be updated
 * @param {Entity} container Entity that the Surface will be updated for
 */
DOMRenderer.update = function update(entity, container) {
    DOMRenderer._queues.surfaces[container._id].update.push(entity);
};

// Vertex culling logic
// TODO figure out vertex culling.
function _isWithin(target, entity, container, targetTransform) {
    var targetSize    = target.getSize(targetTransform, true),
        containerSize = container.getComponent('container').getSize(void 0, true);

    targetSize.origin[0] -= entity.getContext()._size[0] / 2 - targetSize.size[0] * target.getOrigin()[0];
    targetSize.origin[1] -= entity.getContext()._size[1] / 2 - targetSize.size[1] * target.getOrigin()[1];

    var furthestLeftTarget      = targetSize.origin[0]    + targetSize.displacement.left,
        furthestRightTarget     = targetSize.origin[0]    + targetSize.displacement.right,
        furthestTopTarget       = targetSize.origin[1]    + targetSize.displacement.top,
        furthestBottomTarget    = targetSize.origin[1]    + targetSize.displacement.bottom,
        furthestLeftContainer   = containerSize.origin[0] + containerSize.displacement.left,
        furthestRightContainer  = containerSize.origin[0] + containerSize.displacement.right,
        furthestTopContainer    = containerSize.origin[1] + containerSize.displacement.top,
        furthestBottomContainer = containerSize.origin[1] + containerSize.displacement.bottom;

    var value = furthestLeftTarget < furthestRightContainer && furthestLeftTarget > furthestLeftContainer;
    if (value && (furthestTopTarget > furthestTopContainer && furthestTopTarget < furthestBottomContainer))
        return true;
    if (value && (furthestBottomTarget > furthestBottomContainer && furthestBottomTarget < furthestTopContainer))
        return true;

    value = furthestRightTarget < furthestRightContainer && furthestRightTarget > furthestLeftContainer;
    if (value && (furthestTopTarget > furthestTopContainer && furthestTopTarget < furthestBottomContainer))
        return true;
    if (value && (furthestBottomTarget > furthestBottomContainer && furthestBottomTarget < furthestTopContainer))
        return true;

    value = furthestLeftContainer < furthestRightTarget && furthestLeftContainer > furthestLeftTarget;
    if (value && (furthestTopContainer > furthestTopTarget && furthestTopContainer < furthestBottomTarget))
        return true;
    if (value && (furthestBottomContainer > furthestBottomTarget && furthestBottomContainer < furthestTopTarget))
        return true;

    value = furthestRightContainer < furthestRightTarget && furthestRightContainer > furthestLeftTarget;
    if (value && (furthestTopContainer > furthestTopTarget && furthestTopContainer < furthestBottomTarget))
        return true;
    if (value && (furthestBottomContainer > furthestBottomTarget && furthestBottomContainer < furthestTopTarget))
        return true;

    return false;
}

// Update the Surface that is to deployed to a partcular Container
function _update(entity, containerID) {
    var surface         = entity.getComponent(SURFACE),
        spec            = surface.render(),
        i               = 0,
        contextSize     = entity.getContext()._size,
        element         = surfacesToElements[entity._id][containerID],
        containerEntity = EntityRegistry.getEntity(containerID),
        container       = containerEntity.getComponent(CONTAINER),
        key;

    if (Surface.invalidations.classes & spec.invalidations) {
        for (i = 0; i < element.classList.length; i++) element.classList.remove(element.classList[i]);
        for (i = 0; i < spec.classes.length;   i++) element.classList.add(spec.classes[i]);
        element.classList.add(FA_SURFACE);
    }
    
    if (Surface.invalidations.attributes & spec.invalidations)
        for (key in spec.attributes) element.setAttribute(key, spec.attributes[key]);

    if (Surface.invalidations.properties & spec.invalidations)
        for (key in spec.properties) element.style[key] = spec.properties[key];

    if (Surface.invalidations.attributes & spec.invalidations)
        for (key in spec.attributes) element.setAttribute(key, spec.attributes[key]);

    if (Surface.invalidations.content & spec.invalidations) {
        if (spec.content instanceof Node) {
            while (element.hasChildNodes()) element.removeChild(element.firstChild);
            element.appendChild(spec.content);
        }
        else element.innerHTML = spec.content;
        spec.invalidations |= Surface.invalidations.size;
    }

    if (Surface.invalidations.opacity & spec.invalidations && !spec.properties.opacity)
        element.style.opacity = entity.getComponent('opacity')._globalOpacity;

    if (Surface.invalidations.origin & spec.invalidations) {
        element.style[CSSTRANSFORM_ORIGIN] = spec.origin[0].toFixed(2) * 100 + '% ' + spec.origin[1].toFixed(2) * 100 + '%';
    }

    if (Surface.invalidations.events & spec.invalidations) {
        i = spec.events.length;
        while (i--) element.addEventListener(spec.events[i], spec.eventForwarder);
    }

    if (Surface.invalidations.size & spec.invalidations) {
        if (spec.size && spec.size[0]) { 
            if (spec.size[0] !== true) element.style.width = spec.size[0] + 'px';
        } 
        else { // undefined, be the size of it's parent
            element.style.width = entity.getComponent('size')._globalSize[0] + 'px';
        }
        if (spec.size && spec.size[1]) {
            if (spec.size[1] !== true) element.style.height = spec.size[1] + 'px';
        }
        else {
            element.style.height = entity.getComponent('size')._globalSize[1] + 'px';
        }
        surface._setVertexDisplacement(element.offsetWidth, element.offsetHeight);
        spec.invalidations |= Surface.invalidations.transform;
    }

    if (Surface.invalidations.transform & spec.invalidations) {
        var transform = MatrixMath.multiply(matrixScratch3, container.getDisplayMatrix(), entity.getComponent(TRANSFORM)._matrix),
            camera    = entity.getContext().getComponent('camera');
        transform     = DOMRenderer.createDOMMatrix(transform, contextSize, surface._size, spec.origin);
        if (camera) {
            var focalPoint    = camera.getOptions().projection.focalPoint,
                fx            = (focalPoint[0] + 1) * 0.5 * contextSize[0],
                fy            = (1 - focalPoint[1]) * 0.5 * contextSize[1],
                scratchMatrix = [1, 0, 0, 0, 0, 1, 0,  0, 0, 0, 1, 0, fx - surface._size[0] * spec.origin[0],  fy - surface._size[1] * spec.origin[1], 0, 1];
            MatrixMath.multiply(scratchMatrix, scratchMatrix, [1, 0, 0, 0, 0, 1, 0,  0, 0, 0, 1, entity.getContext().getComponent('camera').getProjectionTransform()[11],  0, 0, 0, 1]);
            MatrixMath.multiply(scratchMatrix, scratchMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -(fx - surface._size[0] * spec.origin[0]),  -(fy - surface._size[1] * spec.origin[1]), 0, 1]);
            MatrixMath.multiply(transform, scratchMatrix, transform);
        }
        element.style[CSSTRANSFORM] = DOMRenderer.stringifyMatrix(transform);
        // surface._culled = !_isWithin(surface, entity, containerEntity, transform); // TODO figure out vertex culling again
    }
    surface.resetInvalidations();
}

/**
 * Render will run over all of the queues that have been populated
 *  by the RenderSystem and will execute the deployment, recalling,
 *  and updating.
 *
 * @method render
 */
 DOMRenderer.render = function render() {
    var queue,
        containerID,
        innerQueues,
        queues     = DOMRenderer._queues,
        containers = Object.keys(queues.surfaces),
        j          = containers.length,
        i          = 0,
        k          = 0;
    
    // Deploy Containers
    queue = queues.containers.deploy;
    i     = queue.length;
    while (i--) _deployContainer(queue.shift());

    // Recall Containers
    queue = queues.containers.recall;
    i     = queue.length;
    while (i--) _recallContainer(queue.shift());

    // Update Containers
    queue = queues.containers.update;
    i     = queue.length;
    while (i--) _updateContainer(queue.shift());

    // For each Container
    while (j--) {
        containerID = containers[j];
        innerQueues = queues.surfaces[containerID];

        // Deploy Surfaces
        queue = innerQueues.deploy;
        i     = queue.length;
        while (i--) _deploy(queue.shift(), containerID);

        // Recall Surfaces
        queue = innerQueues.recall;
        i     = queue.length;
        while (i--) _recall(queue.shift(), containerID);

        // Update Surfaces
        queue = innerQueues.update;
        i     = queue.length;
        while (i--) _update(queue.shift(), containerID);
    }

};

// Get the type of Targets the DOMRenderer will work for
DOMRenderer.getTargets = function getTargets() {
    return targets;
};

/**
 * Create the Transform matrix for a Surface based on it transform,
 *  size, origin, and Context's size.  Uses its Context's size to
 *  turn homogenous coordinate Transforms to pixels.
 *
 * @method createDOMMAtrix
 *
 * @param {Array} transform Transform matrix
 * @param {Array} contextSize 2-dimensional size of the Context
 * @param {Array} size size of the DOM element as a 3-dimensional array
 * @param {Array} origin origin of the DOM element as a 2-dimensional array
 * @param {Array} result storage of the DOM bound transform matrix
 */
DOMRenderer.createDOMMatrix = function createDOMMatrix(transform, contextSize, size, origin, result) {
    result             = result || [];
    // size[0]           /= 0.5 * contextSize[0]; // TODO: We're not using the 
    // size[1]           /= 0.5 * contextSize[1];
    matrixScratch1[0]  = 1;
    matrixScratch1[1]  = 0;
    matrixScratch1[2]  = 0;
    matrixScratch1[3]  = 0;
    matrixScratch1[4]  = 0;
    matrixScratch1[5]  = 1;
    matrixScratch1[6]  = 0;
    matrixScratch1[7]  = 0;
    matrixScratch1[8]  = 0;
    matrixScratch1[9]  = 0;
    matrixScratch1[10] = 1;
    matrixScratch1[11] = 0;
    matrixScratch1[12] = -size[0] * origin[0];
    matrixScratch1[13] = -size[1] * origin[1];
    matrixScratch1[14] = 0;
    matrixScratch1[15] = 1;
    MatrixMath.multiply(matrixScratch2, matrixScratch1, transform);

    result[0]  = ((matrixScratch2[0]  < 0.000001 && matrixScratch2[0]  > -0.000001) ? ZERO : matrixScratch2[0]);
    result[1]  = ((matrixScratch2[1]  < 0.000001 && matrixScratch2[1]  > -0.000001) ? ZERO : matrixScratch2[1]);
    result[2]  = ((matrixScratch2[2]  < 0.000001 && matrixScratch2[2]  > -0.000001) ? ZERO : matrixScratch2[2]);
    result[3]  = ((matrixScratch2[3]  < 0.000001 && matrixScratch2[3]  > -0.000001) ? ZERO : matrixScratch2[3]);
    result[4]  = ((matrixScratch2[4]  < 0.000001 && matrixScratch2[4]  > -0.000001) ? ZERO : matrixScratch2[4]);
    result[5]  = ((matrixScratch2[5]  < 0.000001 && matrixScratch2[5]  > -0.000001) ? ZERO : matrixScratch2[5]);
    result[6]  = ((matrixScratch2[6]  < 0.000001 && matrixScratch2[6]  > -0.000001) ? ZERO : matrixScratch2[6]);
    result[7]  = ((matrixScratch2[7]  < 0.000001 && matrixScratch2[7]  > -0.000001) ? ZERO : matrixScratch2[7]);
    result[8]  = ((matrixScratch2[8]  < 0.000001 && matrixScratch2[8]  > -0.000001) ? ZERO : matrixScratch2[8]);
    result[9]  = ((matrixScratch2[9]  < 0.000001 && matrixScratch2[9]  > -0.000001) ? ZERO : matrixScratch2[9]);
    result[10] = ((matrixScratch2[10] < 0.000001 && matrixScratch2[10] > -0.000001) ? ZERO : matrixScratch2[10]);
    result[11] = ((matrixScratch2[11] < 0.000001 && matrixScratch2[11] > -0.000001) ? ZERO : matrixScratch2[11]);
    result[12] = ((matrixScratch2[12] < 0.000001 && matrixScratch2[12] > -0.000001) ? ZERO : matrixScratch2[12]) + 0.5 * contextSize[0];
    result[13] = ((matrixScratch2[13] < 0.000001 && matrixScratch2[13] > -0.000001) ? ZERO : matrixScratch2[13]) + 0.5 * contextSize[1];
    // result[12] = (Math.round((matrixScratch2[12] + 1) * 0.5 * contextSize[0] * DEVICEPIXELRATIO) / DEVICEPIXELRATIO);
    // result[13] = (Math.round((matrixScratch2[13] + 1) * 0.5 * contextSize[1] * DEVICEPIXELRATIO) / DEVICEPIXELRATIO);
    result[14] = ((matrixScratch2[14] < 0.000001 && matrixScratch2[14] > -0.000001) ? ZERO : matrixScratch2[14]);
    result[15] = ((matrixScratch2[15] < 0.000001 && matrixScratch2[15] > -0.000001) ? ZERO : matrixScratch2[15]);

    // size[0] *= 0.5 * contextSize[0];
    // size[1] *= 0.5 * contextSize[1];
    return result;
};

/**
 * Get the CSS representation of a Transform matrix
 *
 * @method stringifyMatrix
 *
 * @param {Array} m Transform matrix
 */
DOMRenderer.stringifyMatrix = function stringifyMatrix(m) {
    return MATRIX3D +
        m[0]  + COMMA +
        m[1]  + COMMA +
        m[2]  + COMMA +
        m[3]  + COMMA +
        m[4]  + COMMA +
        m[5]  + COMMA +
        m[6]  + COMMA +
        m[7]  + COMMA +
        m[8]  + COMMA +
        m[9]  + COMMA +
        m[10] + COMMA +
        m[11] + COMMA +
        m[12] + COMMA +
        m[13] + COMMA +
        m[14] + COMMA +
        m[15] + CLOSE_PAREN;
};


module.exports = DOMRenderer;

},{"../../math/4x4matrix":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\4x4matrix.js","../Components/Container":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Container.js","../Components/Surface":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Surface.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js","../OptionsManager":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\OptionsManager.js","./ElementAllocator":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Renderers\\ElementAllocator.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Renderers\\ElementAllocator.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: mark@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

/**
 * Internal helper object to Container that handles the process of
 *   creating and allocating DOM elements within a managed div.
 *   Private.
 *
 * @class ElementAllocator
 * @constructor
 *
 * @param {DOMElement} container document element in which Famo.us content will be inserted
 */
function ElementAllocator(container) {
    if (!container) container = document.createDocumentFragment();
    this.container     = container;
    this.detachedNodes = {};
    this.nodeCount     = 0;
}

/**
 * Allocate an element of specified type from the pool.
 *
 * @method allocate
 *
 * @param {String} type type of element, e.g. 'div'
 *
 * @return {DOMElement} allocated document element
 */
ElementAllocator.prototype.allocate = function allocate(type) {
    type = type.toLowerCase();
    if (!(type in this.detachedNodes)) this.detachedNodes[type] = [];
    var nodeStore = this.detachedNodes[type];
    var result;
    if (nodeStore.length > 0) {
        result = nodeStore.pop();
    } else {
        result = document.createElement(type);
        this.container.appendChild(result);
    }
    this.nodeCount++;
    result.style.display = '';    
    return result;
};

/**
 * De-allocate an element of specified type to the pool.
 *
 * @method deallocate
 *
 * @param {DOMElement} element document element to deallocate
 */
ElementAllocator.prototype.deallocate = function deallocate(element) {
    var nodeType = element.nodeName.toLowerCase();
    var nodeStore = this.detachedNodes[nodeType];
    nodeStore.push(element);
    element.style.display = 'none';
    element.style.opacity = '';
    element.style.width   = '';
    element.style.height  = '';
    this.nodeCount--;
};

/**
 * Get count of total allocated nodes in the document.
 *
 * @method getNodeCount
 *
 * @return {Number} total node count
 */
ElementAllocator.prototype.getNodeCount = function getNodeCount() {
    return this.nodeCount;
};

module.exports = ElementAllocator;
},{}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Renderers\\WebGLRenderer.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: adnan@famo.us,
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var INDICES        = 'indices';

var EntityRegistry = require('../EntityRegistry');
var Geometry       = require('../../gl/Geometry');
var Texture        = require('../../gl/Texture');
var Shader         = require('../../gl/Shader');
var Buffer         = require('../../gl/Buffer');
var TimeSystem     = require('../Systems/TimeSystem');

var Materials      = EntityRegistry.addCollection('Materials');
var Geometries     = EntityRegistry.addCollection('Geometries');
var Lights         = EntityRegistry.addCollection('Lights');
var FXComposers    = EntityRegistry.addCollection('fx');
var Contexts       = EntityRegistry.getCollection('Contexts');

var WebGLRenderer   = {};
var BufferRegistry  = {};
var TextureRegistry = {};

var identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
var mouse          = [.5, .5];
window.texture = TextureRegistry;

WebGLRenderer.draw = function draw(spec) {
    var vertexBuffers = BufferRegistry[spec.id] || (BufferRegistry[spec.id] = {});

    for (var name in spec.vertexBuffers) {
        if (! spec.invalidations[name]) continue;
        spec.invalidations[name] = void 0;

        var isIndex = name == INDICES;
        
        if (! vertexBuffers[name])
            vertexBuffers[name] = new Buffer(
                isIndex? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                isIndex ? Uint16Array : Float32Array,
                this.gl,
                vertexBuffers.spacing);

        vertexBuffers[name].data = spec.vertexBuffers[name];
        vertexBuffers[name].subData();
    }

    this.gl.depthMask(! spec.uniforms.opacity < 1);
    
    this.shader.setUniforms(spec.uniforms);

    if (TextureRegistry[spec.id]) TextureRegistry[spec.id].bind();
    
    this.drawBuffers(BufferRegistry[spec.id], this.gl[spec.type]);
};

WebGLRenderer.render = function () {
    this.shader.setUniforms({
        mouse: mouse,
        time: TimeSystem.getElapsedRelativeTime()
    });
    
    var i = 0;
    for (var i = 0; i < Lights.entities.length; i++) {
        var entity = Lights.entities[i];
        var light = entity.getComponent('light');

        this.shader.setUniforms({
            lightPos: light._spec.position,
            lightColor: light._spec.color
        });
    }

    for (var i = 0; i < Geometries.entities.length; i++) {
        var entity = Geometries.entities[i];
        var context = entity.getContext();
        if (context) this.shader.setUniforms({
            perspective: applyProjection(entity, context),
            resolution: context._size,
            cameraPos: context._components.camera.getOptions().projection.focalPoint
        });

        var spec = entity._components.geometry.render();
        
        if (spec.offscreen)
            this.RTT(this.draw, spec, context);
        else
            this.draw(spec);
    }
};

WebGLRenderer.drawBuffers = function drawBuffers(vertexBuffers, mode) {
    var length = 0;
    var gl = this.gl;
    var indexBuffer = vertexBuffers.indices;
    var attribute;

    for (attribute in vertexBuffers) {
        if (attribute == INDICES) continue;
        var buffer = vertexBuffers[attribute];
        var location = this.shader.attributes[attribute] || gl.getAttribLocation(this.shader.program, 'a_' + attribute);
        if (location == -1 || ! buffer.buffer) continue;
        this.shader.attributes[attribute] = location;
        gl.bindBuffer(buffer.target, buffer.buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, buffer.buffer.spacing, gl.FLOAT, gl.FALSE, 0, 0);
        length = buffer.buffer.length / 1;
    }

    for (attribute in this.shader.attributes)
        if (! vertexBuffers[attribute]) gl.disableVertexAttribArray(this.shader.attributes[attribute]);

    if (length) {
        if (indexBuffer)
            gl.bindBuffer(indexBuffer.target, indexBuffer.buffer),
            gl.drawElements(mode, indexBuffer.buffer.length, gl.UNSIGNED_SHORT, 0);
        else
            gl.drawArrays(mode, 0, length);
    }
};

WebGLRenderer.getTargets = function getTargets() {
    return [Geometry.toString()];
};

WebGLRenderer.init  = function init(options) {
    options = options || { alpha: true };

    var canvas   = options.canvas;
    var parentEl = options.parentEl || document.body;

    if (! canvas) {
        canvas           = document.createElement('canvas');
        canvas.className = 'GL';
        canvas.width     = window.innerWidth;
        canvas.height    = window.innerHeight;
    }
    
    parentEl.appendChild(canvas);

    var gl = this.gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
    if (! gl) throw 'WebGL not supported';

    function moused(e) {
        if (e.touches && e.touches.length) e = e.touches[0];
        mouse[0] = (e.x || e.clientX)  / innerWidth;
        mouse[1] = 1. - (e.y || e.clientY) / innerHeight;
    };

    window.addEventListener('touchmove', moused);
    window.addEventListener('mousemove', moused);

    this.shader = new Shader(gl);

    gl.polygonOffset(0.1, 0.1);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.LEQUAL);
    
    if (options.backfaceCulling) gl.enable(gl.CULL_FACE);

    var self = this;
    Materials.on('entityAdded', function (entity) {
        setTimeout(function () {
            self.shader.resetProgram();
            var material = entity._components.material;
            var image = material.options.image;
            if (! image) return;

            if (image.bind) TextureRegistry[material.entity] = image;

            else loadImage(image, function () {
                TextureRegistry[material.entity] =
                    new Texture(self.gl, this.target).image(this.target);
            });
        });
    });

    return gl;
}

WebGLRenderer.RTT = function(cb, spec, context) {
    var gl = this.gl;
    var texture = spec.offscreen.texture;
    var v = context._size;

    var framebuffer  = this.framebuffer ? this.framebuffer : this.framebuffer = gl.createFramebuffer();
    var renderbuffer = this.renderbuffer ? this.renderbuffer : this.renderbuffer = gl.createRenderbuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

    if (v[0] != renderbuffer.width || v[1] != renderbuffer.height) {
        renderbuffer.width = v[0];
        renderbuffer.height = v[1];
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, v[0], v[1]);
    }

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.id, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

    cb.call(this, spec);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
;};

WebGLRenderer.deployContainer = function () {};
WebGLRenderer.deploy = function () {};
WebGLRenderer.update = function () {};
WebGLRenderer.setOptions = function() {};
WebGLRenderer.recall = function () {};

function applyProjection (geom, context) {
            var camera = context.getComponent('camera');
            var p = camera ? camera.getProjectionTransform() : identityMatrix;
            var cameraFocal =  camera ? camera.getOptions().projection.focalPoint[2] : 0;
            var contextWidth = context._size[0];
            var contextHeight = context._size[1];
            var contextWider = contextWidth > contextHeight;
            var horizontalAspectRatioCorrection = contextWider ? contextHeight/contextWidth : 1;
            var verticalAspectRatioCorrection = contextWider ? 1 : contextWidth/contextHeight;
            var focalDepth = cameraFocal ?  contextHeight/cameraFocal : 0;

            return [
                horizontalAspectRatioCorrection,
                0,
                0,
                0,

                0,
                verticalAspectRatioCorrection,
                0,
                0,

                0,
                0,
                p[10],
                (-(focalDepth) * 0.5) * verticalAspectRatioCorrection,

                0,
                0,
                0,
                1
            ];
}

module.exports = WebGLRenderer;

function loadImage (img, cb) {
    var obj = (typeof img === 'string' ? new Image() : img) || {};
    obj.crossOrigin = 'anonymous';
    obj.onload = function (img) {
        cb.call(img);
    };
    obj.src = img;
    return obj;
}

},{"../../gl/Buffer":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\gl\\Buffer.js","../../gl/Geometry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\gl\\Geometry.js","../../gl/Shader":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\gl\\Shader.js","../../gl/Texture":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\gl\\Texture.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js","../Systems/TimeSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\TimeSystem.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Stylesheet\\famous.css":[function(require,module,exports){
var css = "/* This Source Code Form is subject to the terms of the Mozilla Public\n * License, v. 2.0. If a copy of the MPL was not distributed with this\n * file, You can obtain one at http://mozilla.org/MPL/2.0/.\n *\n * Owner: mark@famo.us\n * @license MPL 2.0\n * @copyright Famous Industries, Inc. 2014\n */\n\n\nhtml {\n    width: 100%;\n    height: 100%;\n    margin: 0px;\n    padding: 0px;\n    overflow: hidden;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n}\n\nbody {\n    position: absolute;\n    width: 100%;\n    height: 100%;\n    margin: 0px;\n    padding: 0px;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n    -webkit-font-smoothing: antialiased;\n    -webkit-tap-highlight-color: transparent;\n    -webkit-perspective: 0;\n    perspective: none;\n    overflow: hidden;\n}\n\n.famous-container, .famous-group {\n    position: absolute;\n    top: 0px;\n    left: 0px;\n    bottom: 0px;\n    right: 0px;\n    overflow: visible;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n    -webkit-backface-visibility: visible;\n    backface-visibility: visible;\n    pointer-events: none;\n}\n\n.famous-group {\n    width: 0px;\n    height: 0px;\n    margin: 0px;\n    padding: 0px;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n}\n\n.fa-surface {\n    position: absolute;\n    -webkit-transform-origin: 0% 0%;\n    transform-origin: 0% 0%;\n    -webkit-backface-visibility: visible;\n    backface-visibility: visible;\n    -webkit-transform-style: flat;\n    transform-style: preserve-3d; /* performance */\n/*    -webkit-box-sizing: border-box;\n    -moz-box-sizing: border-box;*/\n    -webkit-tap-highlight-color: transparent;\n    pointer-events: auto;\n\n}\n\n.famous-container-group {\n    position: relative;\n    width: 100%;\n    height: 100%;\n}\n\n.fa-container {\n    position: absolute;\n    -webkit-transform-origin: center center;\n    transform-origin: center center;\n    overflow: hidden;\n}\n\ncanvas.GL {\n    pointer-events: none;\n    position: absolute;\n    z-index: 9999;\n    top: 0px;\n    left: 0px;\n}\n"; (require("c:\\Users\\Morgan\\desktop\\famous\\MixedMode\\node_modules\\cssify"))(css); module.exports = css;
},{"c:\\Users\\Morgan\\desktop\\famous\\MixedMode\\node_modules\\cssify":"c:\\Users\\Morgan\\desktop\\famous\\MixedMode\\node_modules\\cssify\\browser.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\BehaviorSystem.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityRegistry = require('../EntityRegistry');
var renderNodes    = EntityRegistry.getCollection('everything');

/**
 * A system that will run over custom components that have an
 *   update function.
 *
 * @class BehaviorSystem
 * @system
 * @singleton
 */
var BehaviorSystem = {};

/**
 * Update will iterate over all of the entities and call
 *   each of their update functions.
 *
 * @method update
 */
BehaviorSystem.update = function update() {
    var i = renderNodes.length;

    while (i--)
        if (renderNodes.entities[i].update)
            renderNodes.entities[i].update();
};

module.exports = BehaviorSystem;


},{"../EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\CoreSystem.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityRegistry = require('../EntityRegistry');

var roots          = EntityRegistry.addCollection('Contexts');

/**
 * CoreSystem is responsible for traversing the scene graph and
 *   updating the Transforms, Sizes, and Opacities of the entities.
 *
 * @class  CoreSystem
 * @system
 * @singleton
 */
var CoreSystem = {};

/**
 * update iterates over each of the Contexts that were registered and
 *   kicks of the recursive updating of their entities.
 *
 * @method update
 */
CoreSystem.update = function update() {
    roots.forEach(core);
};


function core(entity) {
    coreUpdateAndFeed(entity);
}

/**
 * coreUpdateAndFeed feeds parent information to an entity and so that
 *   each entity can update their transform, size, and opacity.  It 
 *   will then pass down invalidation states and values to any children.
 *
 * @method coreUpdateAndFeed
 * @private
 *   
 * @param  {Entity}  entity           Entity in the scene graph
 * @param  {Number}  transformReport  bitScheme report of transform invalidations
 * @param  {Array}   incomingMatrix   parent transform as a Float32 Array
 * @param  {Number}  sizeReport       bitScheme report of size invalidations
 * @param  {Array}   incomingSize     parent size in pixels
 * @param  {Boolean} opacityReport    boolean report of opacity invalidation
 * @param  {Number}  incomingOpacity  parent opacity
 */
function coreUpdateAndFeed(entity, transformReport, incomingMatrix, sizeReport, incomingSize, opacityReport, incomingOpacity) {
    var transform = entity.getComponent('transform');
    var size      = entity.getComponent('size');
    var opacity   = entity.getComponent('opacity');
    var children  = entity.getChildren();
    var i         = children.length;


    transformReport = transform._update(transformReport, incomingMatrix);
    sizeReport      = size._update(sizeReport, incomingSize);
    opacityReport   = opacity._update(opacityReport, incomingOpacity);

    while (i--) 
        coreUpdateAndFeed(
            children[i],
            transformReport,
            transform._matrix,
            sizeReport,
            size._globalSize,
            opacityReport,
            opacity._globalOpacity);
}

module.exports = CoreSystem;

},{"../EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\RenderSystem.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityRegistry = require('../EntityRegistry'),
    MatrixMath     = require('../../math/4x4matrix'),
    OptionsManager = require('../OptionsManager');

var renderers          = {},
    targetsToRenderers = {};

var containers  = EntityRegistry.addCollection('HasContainer'),
    renderables = EntityRegistry.addCollection('Renderables');

var toDeploy = [];

containers.on('entityAdded', deployContainer);
containers.on('entityRemoved', recallContainer);

var containerToTargets = {};

function deployContainer(entity) {
    if (entity.getContext()) renderers.DOM.deployContainer(entity);
    else                     toDeploy.push(entity); // TODO This is temporary and it sucks
}

function recallContainer(entity) {
    renderers.DOM.recallContainer(entity);
}

function _releventToRenderer(renderer, entity) {
    var targets = renderer.getTargets();
    var j       = targets.length;
    while (j--) if (entity.hasComponent(targets[j])) return true;
    return false;
}

function _releventToAnyRenderer(entity) {
    var rendererNames = Object.keys(renderers),
        i             = rendererNames.length;

    while (i--) if (_releventToRenderer(renderers[rendererNames[i]], entity)) return true;
    return false;
}

/**
 * RenderSystem is responsible for keeping track of the various renderers
 *  and feeding them 
 *
 *
 * @class RenderSystem
 * @system
 */
var RenderSystem = {};

RenderSystem.update = function update() {
    var targets             = Object.keys(targetsToRenderers),
        rendererNames       = Object.keys(renderers),
        target              = null,
        entity              = null,
        container           = null,
        targetName          = void 0,
        containerEnts       = containers.entities,
        entities            = renderables.entities,
        i                   = entities.length,
        targetsLength       = targets.length,
        containerEntLengths = containerEnts.length,
        renderersLength     = 0,
        j                   = toDeploy.length,
        k                   = 0,
        l                   = 0;



    // Update the Container if its transform or size are dirty.
    containers.forEach(function(entity) {
        container = entity.getComponent('container');
        if (entity.getContext() && (container._transformDirty || container._sizeDirty)) renderers.DOM.updateContainer(entity);
    });

    while (j--) deployContainer(toDeploy.pop());

    // For all of the renderables
    while (i--) {
        j      = targetsLength;
        entity = entities[i];

        // For each renderer
        while (j--) {
            target = entity.getComponent(targets[j]);
            if (!target) continue; // skip if this Renderable does not container the proper target component for this renderer

            k = containerEntLengths;

            if (k) {
                targetName      = target.constructor.toString();
                renderersLength = targetsToRenderers[targetName].length;

                // For each container
                while (k--) {
                    l          = renderersLength;
                    container  = containerEnts[k];

                    // console.log(entity._rootID)
                    // If the target has a context
                    if (entity.getContext()) {

                        // Decide if to deploy  and update or just update
                        if (target._isWithin(container)) {
                            while (l--) targetsToRenderers[targetName][l].update(entity, container);
                        } else {
                            while (l--) targetsToRenderers[targetName][l].deploy(entity, container);
                            target._addToContainer(container);
                        }
                    } else if (target._isWithin(container)) { // If the target is removed from render tree recall it
                        while (l--) targetsToRenderers[targetName][l].recall(entity, container);
                        target._removeFromContainer(container);
                    }
                }
            }

            // Reset the invalidations after all of the logic for 
            // a particular target 
            // if (target.resetInvalidations) target.resetInvalidations();
        }
    }

    // Have each renderer run
    i = rendererNames.length;
    while (i--) renderers[rendererNames[i]].render();
};

/**
 * Add a new renderer which will be called every frame.
 *
 * @method register
 *
 * @param {String} name name of the renderer
 * @param {Object} renderer singleton renderer object
 */
RenderSystem.register = function register(name, renderer) {
    if (renderers[name] != null) return false;

    renderers[name] = renderer;

    var targets = renderer.getTargets(),
        i       = targets.length;

    while (i--) {
        if (targetsToRenderers[targets[i]] == null) targetsToRenderers[targets[i]] = [];
        targetsToRenderers[targets[i]].push(renderer);
    }

    return true;
};

module.exports = RenderSystem;

},{"../../math/4x4matrix":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\4x4matrix.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js","../OptionsManager":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\OptionsManager.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\TimeSystem.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

 'use strict';

var previousTime       = 0, 
    delta              = 0,
    initializationTime = 0,
    currentTime        = initializationTime,
    relativeTime       = initializationTime,
    absoluteTime       = initializationTime,
    previousRelFrame   = 0;

/**
 * TimeSystem is responsible for determining the current moment.
 *
 * @class TimeSystem
 * @system
 */
var TimeSystem = {};

/**
 * Update the time based on the frame data from the Engine.
 *
 * @method update
 *
 * @param {Number} relFrame 
 */
TimeSystem.update = function update(timestamp, relFrame) {
    previousTime     = currentTime;
    currentTime      = timestamp;
    delta            = currentTime - previousTime;
    relativeTime    += delta * (relFrame - previousRelFrame);
    absoluteTime    += delta;
    previousRelFrame = relFrame;
};

/**
 * Get relative time in ms offfset by the speed at which the Engine is running.
 *
 * @method getRelativeTime
 *
 * @return {Number} the time accounting for Engine's run speed
 */
TimeSystem.getRelativeTime = function getRelativeTime() {
    return relativeTime;
};

/**
 * Get absolute time.
 *
 * @method getAbsoluteTime
 *
 * @return {Number} the time in ms
 */
TimeSystem.getAbsoluteTime = function getAbsoluteTime() {
    return absoluteTime;
};

/**
 * Get the time in which the Engine was instantiated.
 *
 * @method getInitialTime
 *
 * @return {Number} the time in ms
 */
TimeSystem.getInitialTime = function getInitialTime() {
    return initializationTime;
};

/**
 * Get elapsed time since instantiation accounting for Engine speed
 *
 * @method getElapsedRelativeTime
 *
 * @return {Number} the time in ms
 */
TimeSystem.getElapsedRelativeTime = function getElapsedRelativeTime() {
    return relativeTime - initializationTime;
};

/**
 * Get absolute elapsed time since instantiation
 *
 * @method getElapsedAbsoluteTime
 *
 * @return {Number} the time in ms
 */
TimeSystem.getElapsedAbsoluteTime = function getElapsedAbsoluteTime() {
    return absoluteTime - initializationTime;
};

/**
 * Get the time between this frame and last.
 *
 * @method getDelta
 *
 * @return {Number} the time in ms
 */
TimeSystem.getDelta = function getDelta() {
    return delta;
};

module.exports = TimeSystem;

},{}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\components\\Target.js":[function(require,module,exports){
module.exports=require("c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Target.js")
},{"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Target.js":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Target.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventEmitter.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*
* Owner: mark@famo.us
* @license MPL 2.0
* @copyright Famous Industries, Inc. 2014
*/

'use strict';

/**
 * EventEmitter represents a channel for events.
 *
 * @class EventEmitter
 * @constructor
 */
function EventEmitter() {
    this.listeners = {};
    this._owner = this;
}

/**
 * Trigger an event, sending to all downstream handlers
 *   listening for provided 'type' key.
 *
 * @method emit
 *
 * @param {string} type event type key (for example, 'click')
 * @param {Object} event event data
 * @return {EventHandler} this
 */
EventEmitter.prototype.emit = function emit(type, event) {
    var handlers = this.listeners[type];
    if (handlers) {
        for (var i = 0; i < handlers.length; i++) {
            handlers[i].call(this._owner, event);
        }
    }
    return this;
};

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @method "on"
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} handler callback
 * @return {EventHandler} this
 */
EventEmitter.prototype.on = function on(type, handler) {
    if (!(type in this.listeners)) this.listeners[type] = [];
    var index = this.listeners[type].indexOf(handler);
    if (index < 0) this.listeners[type].push(handler);
    return this;
};

/**
 * Alias for "on".
 * @method addListener
 */
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

/**
 * Unbind an event by type and handler.
 *   This undoes the work of "on".
 *
 * @method removeListener
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function} handler function object to remove
 * @return {EventEmitter} this
 */
EventEmitter.prototype.removeListener = function removeListener(type, handler) {
    var index = this.listeners[type].indexOf(handler);
    if (index >= 0) this.listeners[type].splice(index, 1);
    return this;
};

/**
 * Call event handlers with this set to owner.
 *
 * @method bindThis
 *
 * @param {Object} owner object this EventEmitter belongs to
 */
EventEmitter.prototype.bindThis = function bindThis(owner) {
    this._owner = owner;
};

module.exports = EventEmitter;

},{}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventHandler.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*
* Owner: mark@famo.us
* @license MPL 2.0
* @copyright Famous Industries, Inc. 2014
*/

'use strict';

var EventEmitter = require('./EventEmitter');

/**
 * EventHandler forwards received events to a set of provided callback functions.
 * It allows events to be captured, processed, and optionally piped through to other event handlers.
 *
 * @class EventHandler
 * @extends EventEmitter
 * @constructor
 */
function EventHandler() {
    EventEmitter.apply(this, arguments);

    this.downstream = []; // downstream event handlers
    this.downstreamFn = []; // downstream functions

    this.upstream = []; // upstream event handlers
    this.upstreamListeners = {}; // upstream listeners
}
EventHandler.prototype = Object.create(EventEmitter.prototype);
EventHandler.prototype.constructor = EventHandler;

/**
 * Assign an event handler to receive an object's input events.
 *
 * @method setInputHandler
 * @static
 *
 * @param {Object} object object to mix trigger, subscribe, and unsubscribe functions into
 * @param {EventHandler} handler assigned event handler
 */
EventHandler.setInputHandler = function setInputHandler(object, handler) {
    object.trigger = handler.trigger.bind(handler);
    if (handler.subscribe && handler.unsubscribe) {
        object.subscribe = handler.subscribe.bind(handler);
        object.unsubscribe = handler.unsubscribe.bind(handler);
    }
};

/**
 * Assign an event handler to receive an object's output events.
 *
 * @method setOutputHandler
 * @static
 *
 * @param {Object} object object to mix pipe, unpipe, on, addListener, and removeListener functions into
 * @param {EventHandler} handler assigned event handler
 */
EventHandler.setOutputHandler = function setOutputHandler(object, handler) {
    if (handler instanceof EventHandler) handler.bindThis(object);
    object.pipe = handler.pipe.bind(handler);
    object.unpipe = handler.unpipe.bind(handler);
    object.on = handler.on.bind(handler);
    object.addListener = object.on;
    object.removeListener = handler.removeListener.bind(handler);
};

/**
 * Trigger an event, sending to all downstream handlers
 *   listening for provided 'type' key.
 *
 * @method emit
 *
 * @param {string} type event type key (for example, 'click')
 * @param {Object} event event data
 * @return {EventHandler} this
 */
EventHandler.prototype.emit = function emit(type, event) {
    EventEmitter.prototype.emit.apply(this, arguments);
    var i = 0;
    for (i = 0; i < this.downstream.length; i++) {
        if (this.downstream[i].trigger) this.downstream[i].trigger(type, event);
    }
    for (i = 0; i < this.downstreamFn.length; i++) {
        this.downstreamFn[i](type, event);
    }
    return this;
};

/**
 * Alias for emit
 * @method addListener
 */
EventHandler.prototype.trigger = EventHandler.prototype.emit;

/**
 * Add event handler object to set of downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
EventHandler.prototype.pipe = function pipe(target) {
    if (target.subscribe instanceof Function) return target.subscribe(this);

    var downstreamCtx = (target instanceof Function) ? this.downstreamFn : this.downstream;
    var index = downstreamCtx.indexOf(target);
    if (index < 0) downstreamCtx.push(target);

    if (target instanceof Function) target('pipe', null);
    else if (target.trigger) target.trigger('pipe', null);

    return target;
};

/**
 * Remove handler object from set of downstream handlers.
 *   Undoes work of "pipe".
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
EventHandler.prototype.unpipe = function unpipe(target) {
    if (target.unsubscribe instanceof Function) return target.unsubscribe(this);

    var downstreamCtx = (target instanceof Function) ? this.downstreamFn : this.downstream;
    var index = downstreamCtx.indexOf(target);
    if (index >= 0) {
        downstreamCtx.splice(index, 1);
        if (target instanceof Function) target('unpipe', null);
        else if (target.trigger) target.trigger('unpipe', null);
        return target;
    }
    else return false;
};

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @method "on"
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} handler callback
 * @return {EventHandler} this
 */
EventHandler.prototype.on = function on(type, handler) {
    EventEmitter.prototype.on.apply(this, arguments);
    if (!(type in this.upstreamListeners)) {
        var upstreamListener = this.trigger.bind(this, type);
        this.upstreamListeners[type] = upstreamListener;
        for (var i = 0; i < this.upstream.length; i++) {
            this.upstream[i].on(type, upstreamListener);
        }
    }
    return this;
};

/**
 * Alias for "on"
 * @method addListener
 */
EventHandler.prototype.addListener = EventHandler.prototype.on;

/**
 * Listen for events from an upstream event handler.
 *
 * @method subscribe
 *
 * @param {EventEmitter} source source emitter object
 * @return {EventHandler} this
 */
EventHandler.prototype.subscribe = function subscribe(source) {
    var index = this.upstream.indexOf(source);
    if (index < 0) {
        this.upstream.push(source);
        for (var type in this.upstreamListeners) {
            source.on(type, this.upstreamListeners[type]);
        }
    }
    return this;
};

/**
 * Stop listening to events from an upstream event handler.
 *
 * @method unsubscribe
 *
 * @param {EventEmitter} source source emitter object
 * @return {EventHandler} this
 */
EventHandler.prototype.unsubscribe = function unsubscribe(source) {
    var index = this.upstream.indexOf(source);
    if (index >= 0) {
        this.upstream.splice(index, 1);
        for (var type in this.upstreamListeners) {
            source.removeListener(type, this.upstreamListeners[type]);
        }
    }
    return this;
};

module.exports = EventHandler;

},{"./EventEmitter":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\gl\\Buffer.js":[function(require,module,exports){
function Buffer(target, type, gl, spacing) {
    this.buffer = null;
    this.target = target;
    this.type = type;
    this.data = [];
    this.gl = gl;
    this.spacing = spacing || 0;
}

Buffer.prototype.subData = function subData(type) {
    var gl = this.gl;
    var data = [];
    
    for (var i = 0, chunk = 10000; i < this.data.length; i += chunk)
        data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));

    this.buffer = this.buffer || gl.createBuffer();
    this.buffer.length = data.length;
    this.buffer.spacing = this.spacing || (this.data.length ? data.length / this.data.length : 0);
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, new this.type(data), type || gl.STATIC_DRAW);
};

module.exports = Buffer;

},{}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\gl\\Geometry.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: adnan@famo.us, joseph@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var TRANSFORM = 'transform';
var OPACITY = 'opacity';
var SIZE = 'size';
var MATERIALS = 'material';
var GEOMETRY = 'geometry';

var EntityRegistry = require('../core/EntityRegistry');
var Target = require('../core/components/Target');

/**
 * Geometry is a component that defines the data that should
 *   be drawn to the webGL canvas. Manages vertex data and attributes.
 *
 * @class Geometry
 * @component
 * @constructor
 * 
 * @param {Entity} entity Entity that the Geometry is a component of
 * @param {Object} options instantiation options
 */

function Geometry(id, options) {
    this.entity = id;
    this.options = options;

    options = options || {};

    EntityRegistry.register(this.getEntity(), 'Geometries');
    EntityRegistry.register(this.getEntity(), 'Renderables');

    this.spec = {
        id: EntityRegistry.getEntity(this.entity)._id,
        type: (options.type || 'triangles').toUpperCase(),
        vertexBuffers: {},
        uniforms: {
            origin: new Float32Array([0.5, 0.5]),
            size: new Float32Array([1,1,1])
        },
        invalidations: {}
    };

    this.addVertexBuffer('pos');
    this.addVertexBuffer('texCoord');
    this.addVertexBuffer('normal');
    this.addVertexBuffer('indices');

    Target.call(this, id, {
        verticies: [
            new Float32Array([0, 0, 0, 1]),
            new Float32Array([0, 0, 0, 1]),
            new Float32Array([0, 0, 0, 1]),
            new Float32Array([0, 0, 0, 1])]
    });
    
    if (options.origin) this.setOrigin(options.origin);
}

Geometry.toString =  function () {
    return GEOMETRY;
};

Geometry.prototype = Object.create(Target.prototype);

/**
 * Get the Entity the Geometry is a component of.
 *
 * @method getEntity
 *
 * @return {Entity} the Entity the Geometry is a component of
 */
Geometry.prototype.getEntity = function getEntity() {
    return EntityRegistry.getEntity(this.entity);
};

/**
 * Allocates an array buffer where vertex data is sent to via compile.
 *
 * @method addVertexBuffer
 *
 * @param {String} name of vbo
 * @param {Array} Values of new vertex buffer.
 * 
 * @chainable
 */
Geometry.prototype.addVertexBuffer = function addVertexBuffer(bufferName, value) {
    var buffer = this.spec.vertexBuffers[bufferName] = value || [];

    return this;
};

/**
 * Gets the buffer object based on buffer name.
 *
 * @method getVertexBuffer
 *
 * @param {String} Name of vertexBuffer to be retrieved.
 */

Geometry.prototype.getVertexBuffer = function getVertexBuffer(bufferName) {
    if (! bufferName) throw 'getVertexBuffer requires a name';
    return this.spec.vertexBuffers[bufferName];
};

/**
 * @method setVertexBuffer
 */
Geometry.prototype.setVertexBuffer = function setVertexBuffer(buffername, value) {
    this.spec.vertexBuffers[buffername] = value;
    this.spec.invalidations[buffername] = 1;
    return this;
};

/**
 *  Set the positions of the verticies in this geometry.
 *  @method setVertexPositions
 *  @param value {Array}
 */
Geometry.prototype.setVertexPositions = function (value) {
    return this.setVertexBuffer('pos', value);
};

/**
 *  Set the normals on this geometry.
 *  @method setNormals
 *  @param value {Array}
 */
Geometry.prototype.setNormals = function (value) {
    return this.setVertexBuffer('normal', value);
};

/**
 *  Set the texture coordinates on this geometry.
 *  @method setTextureCoords
 *  @param value {Array}
 */
Geometry.prototype.setTextureCoords = function (value) {
    return this.setVertexBuffer('texCoord', value);
};


/**
 *  Set the texture coordinates on this geometry.
 *  @method setTextureCoords
 *  @param value {Array}
 */
Geometry.prototype.setIndices = function (value) {
    return this.setVertexBuffer('indices', value);
};

/**
 * @method getVertexPositions
 */
Geometry.prototype.getVertexPositions = function () {
    return this.getVertexBuffer('pos');
};

/**
 * @method getNormals
 */
Geometry.prototype.getNormals = function () {
    return this.getVertexBuffer('normal');
};

/**
 * @method getTextureCoords
 */
Geometry.prototype.getTextureCoords = function () {
    return this.getVertexBuffer('texCoord');
};

/**
 * Allocates an element array
 *
 * @method getEntity
 * 
 * @param {Number} x origin on the x-axis as a percent
 *
 * @chainable
 */
Geometry.prototype.addIndexBuffer = function addIndexBuffer(bufferName, value) {
    this.spec.indexBuffers[bufferName] = value || [];

    return this;
};

/**
 * Gets the index buffer with corresponding bufferName.
 *
 * @method getIndexBuffer
 *
 * @param {String} Name of indexBuffer to be retrieved.
 */

Geometry.prototype.getIndexBuffer = function getIndexBuffer(bufferName) {
    return this.spec.indexBuffers[bufferName];
};

Geometry.prototype.constructor = Geometry;

/**
 * Gets the origin of the Geometry.
 *
 * @method getOrigin
 *
 * @return {Array} 2-dimensional array representing the Geometry's origin
 */
Geometry.prototype.getOrigin = function getOrigin() {
    return this.spec.uniforms.origin;
};


/**
 * Sets the origin of the Geometry.
 *
 * @method setOrigin
 * @chainable
 *
 * @param {Number} x origin on the x-axis as a percent
 * @param {Number} y origin on the y-axis as a percent
 */

Geometry.prototype.setOrigin  = function setOrigin(x, y) {
    if ((x != null && (x < 0 || x > 1)) || (y != null && (y < 0 || y > 1)))
        throw new Error('Origin must have an x and y value between 0 and 1');

    this.spec.uniforms.origin[0] = x != null ? x : this.spec.uniforms.origin[0];
    this.spec.uniforms.origin[1] = y != null ? y : this.spec.uniforms.origin[1];

    return this;
};

/**
 * Get the render specification of the Geometry.
 *
 * @method  render
 * 
 * @return {Object} render specification
 */
Geometry.prototype.render = function () {
    var transform = this.getEntity().getComponent(TRANSFORM);
    var opacity = this.getEntity().getComponent(OPACITY);
    var size = this.getEntity().getComponent(SIZE);
    var material = this.getEntity().getComponent(MATERIALS) || {chunks: []} ;

    this.spec.uniforms.transform = transform.getGlobalMatrix();
    this.spec.uniforms.opacity = opacity ? opacity._globalOpacity : 1;
    this.spec.uniforms.size = normalizeSize((this.getEntity().getContext() || {})._size, size.getGlobalSize());

    if (material) this.spec.texture = material.texture;
    
    for (var i = 0; i < material.chunks.length; i++)
        this.spec.uniforms[material.chunks[i].name] = 1;

    for (var name in material.uniforms)
        this.spec.uniforms[name] = material.uniforms[name];

    return this.spec;
};

/**
 * Set the options of the Geometry.
 *
 * @method setOptions
 * 
 * @param {Object} options object of options
 */

Geometry.prototype.setOptions = function setOptions(options) {
    if (options.origin) this.setOrigin(options.origin);
};

function normalizeSize(contextSize, val) {
    var xScale = contextSize[0];
    var yScale = contextSize[1];

    var aspectCorrection = 1 / (xScale > yScale ? yScale : xScale);

    return [
        val[0] * aspectCorrection,
        val[1] * aspectCorrection,
        val[2] *  aspectCorrection
    ];
};

module.exports = Geometry;

},{"../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js","../core/components/Target":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\components\\Target.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\gl\\Shader.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: adnan@famo.us, joseph@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

/**
 * Shader is responsible for traversing the list of geometries
 * and converting their specs into gl api calls.
 *
 * @class  Shader
 */

var EntityRegistry = require('../core/EntityRegistry');
var Materials      = EntityRegistry.addCollection('Materials');
var chunks = [];
var chunkMap = {};

var vertexWrapper = [
    'vec4 clipspace(in vec4 pos) {',
      'return vec4((pos.x / u_resolution.x) * 2.,',
      '            (pos.y / u_resolution.y) * 2.,',
      '            pos.z / (u_resolution.y * 0.5),',
      '            pos.w);',
    '}',

    'mat3 getNormalMatrix(in mat4 a) {',
        'mat3 matNorm;',

        'float a00 = a[0][0], a01 = a[0][1], a02 = a[0][2], a03 = a[0][3],',
        'a10 = a[1][0], a11 = a[1][1], a12 = a[1][2], a13 = a[1][3],',
        'a20 = a[2][0], a21 = a[2][1], a22 = a[2][2], a23 = a[2][3],',
        'a30 = a[3][0], a31 = a[3][1], a32 = a[3][2], a33 = a[3][3],',

        'b00 = a00 * a11 - a01 * a10,',
        'b01 = a00 * a12 - a02 * a10,',
        'b02 = a00 * a13 - a03 * a10,',
        'b03 = a01 * a12 - a02 * a11,',
        'b04 = a01 * a13 - a03 * a11,',
        'b05 = a02 * a13 - a03 * a12,',
        'b06 = a20 * a31 - a21 * a30,',
        'b07 = a20 * a32 - a22 * a30,',
        'b08 = a20 * a33 - a23 * a30,',
        'b09 = a21 * a32 - a22 * a31,',
        'b10 = a21 * a33 - a23 * a31,',
        'b11 = a22 * a33 - a23 * a32,',

        'det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;',

        'det = 1.0 / det;',

        'matNorm[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;',
        'matNorm[0][1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;',
        'matNorm[0][2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;',

        'matNorm[1][0] = (a02 * b10 - a01 * b11 - a03 * b09) * det;',
        'matNorm[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * det;',
        'matNorm[1][2] = (a01 * b08 - a00 * b10 - a03 * b06) * det;',

        'matNorm[2][0] = (a31 * b05 - a32 * b04 + a33 * b03) * det;',
        'matNorm[2][1] = (a32 * b02 - a30 * b05 - a33 * b01) * det;',
        'matNorm[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * det;',

        'return matNorm;',
    '}',

    '//define_vsChunk',
    'vec4 pipeline_pos(in vec4 pos) {',
    '    //apply_vsChunk',
    '    mat4 trx = u_transform;',

    '    trx = mat4( 1,0,0,0,' +
        '0,-1,0,0,'+
        '0,0,1,0,'+
        '0,0,0,1'+
        ') * trx;',

    '    pos.xyz *= u_size.xyz;',

    '    trx[3] = clipspace(trx[3]);',
    '    float xT = trx[3][0];',
    '    float yT = trx[3][1];',

    '    trx[3][0] = 0.;',
    '    trx[3][1] = 0.;',

    '    pos = u_perspective * trx * pos;',
    '    pos.xy += vec2(xT, yT);',
    '    pos.z  *= -1.;',
    //'    pos.z  = max(pos.z, 1.);',
    '    return pos;',
    '}',

    'void main() {',
    '    v_texCoord = a_texCoord;',
    '    gl_Position = pipeline_pos(a_pos);',
    '}'
].join('\n');

var fragmentWrapper = [
    '//define_fsChunk',

    'vec4 pipeline_color(in vec4 color) {',
    '    //apply_fsChunk',
    '    return color;',
    '}',

    'void main() {',
    '    vec4 color = vec4(0, 0, 0, u_opacity);',
    '    color = pipeline_color(color);',
    '    gl_FragColor = color;',
    '}'
].join('\n');

var uniforms = {
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    perspective: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    opacity: 1,
    mouse: [0, 0],
    origin: [.5, .5],
    resolution: [0, 0, 0],
    size: [0, 0, 0],
    time: 0,
    image: null,
    lightPos: [0, 0, 0],
    lightColor: [0, 0, 0],
    cameraPos: [0, 0, 0]
};

var attributes = {
    pos: [0, 0, 0, 0],
    texCoord: [0, 0],
    normal: [0, 0, 0]
};

var varyings = {
    texCoord: [0, 0],
    normal: [0, 0, 0],
    lightWeighting: [0, 0, 0]
};

var flaggedUniforms = [];

var header = 'precision mediump float;';

function Shader(gl) {
    this.gl = gl;
    this.resetProgram();
}

Shader.prototype.resetProgram = function resetProgram() {
    var vsChunkDefines = [];
    var vsChunkApplies = [];
    var fsChunkDefines = [];
    var fsChunkApplies = [];

    var vertexHeader = [header];
    var fragmentHeader = [header];

    this.uniformLocations = {};
    this.attributes = {};
    this.uniforms = uniforms;
    flaggedUniforms = [];
    //window.flaggedUniforms = flaggedUniforms;
    Materials.forEach(function (renderNode) {
        var material = renderNode.getComponent('material'), name;

        for (name in material.uniforms) uniforms[name] = uniforms[name] || material.uniforms[name];

        for (name in material.varyings) varyings[name] = varyings[name] || material.varyings[name];

        for (var i = 0; i < material.chunks.length; i++) {
            var chunk = material.chunks[i];
            name = chunk.name;

            if (flaggedUniforms.indexOf(name) !== -1) continue;

            if (chunk.vs) {
                vsChunkDefines.push('void ' + name + '(inout vec4 pos) { ' + chunk.vs + ' }\n');
                vsChunkApplies.push('if (u_' + name +'== 1.)' + name + '(pos);\n');
            }

            if (chunk.fs) {
                fsChunkDefines.push('void ' + name + '(inout vec4 color) { ' + chunk.fs + ' }\n');
                fsChunkApplies.push('if (u_' + name +'== 1.)' + name + '(color);\n');    
        }
            
            this.uniforms[name] = 0;

            flaggedUniforms.push(name);
        };
    }.bind(this));
    
    for (var name  in this.uniforms) {
        vertexHeader.push('uniform ' + dataToUniformType(this.uniforms[name]) + ' u_' + name + ';\n');
        fragmentHeader.push('uniform ' + dataToUniformType(this.uniforms[name]) + ' u_' + name + ';\n');
    }

    for (name in attributes) {
        vertexHeader.push('attribute ' + dataToUniformType(attributes[name]) + ' ' + 'a_' + name + ';\n');
    }

    for (name in varyings) {
        vertexHeader.push('varying ' + dataToUniformType(varyings[name]) + ' ' + 'v_' + name + ';\n');
        fragmentHeader.push('varying ' + dataToUniformType(varyings[name]) + ' ' + 'v_' + name + ';\n');
    }

    var vertexSource = vertexHeader.join('\n') + vertexWrapper
            .replace('//define_vsChunk', vsChunkDefines.join('\n'))
            .replace('//apply_vsChunk', vsChunkApplies.join('\n'));

    var fragmentSource = fragmentHeader.join('\n') + fragmentWrapper
            .replace('//define_fsChunk', fsChunkDefines.join('\n'))
            .replace('//apply_fsChunk', fsChunkApplies.join('\n'));
    
    var program = this.gl.createProgram();
    window.f = fragmentSource
    this.gl.attachShader(program, compileSource(this.gl, this.gl.VERTEX_SHADER, vertexSource));
    this.gl.attachShader(program, compileSource(this.gl, this.gl.FRAGMENT_SHADER, fragmentSource));
    this.gl.linkProgram(program);

    if (! this.gl.getProgramParameter(program, this.gl.LINK_STATUS))
        console.error('link error: ' + this.gl.getProgramInfoLog(program));

    else this.program = program;

    this.isSampler = {};
};

Shader.prototype.setUniforms = function (uniforms) {
    var gl = this.gl;

    gl.useProgram(this.program);

    for (var name in uniforms) {
        var location = this.uniformLocations[name] || gl.getUniformLocation(this.program, 'u_' + name);
        if (! location) continue;
        this.uniformLocations[name] = location;
        var value = uniforms[name];

        if (Array.isArray(value) || value instanceof Float32Array) {
            switch (value.length) {
            case 1: gl.uniform1fv(location, new Float32Array(value)); break;
            case 2: gl.uniform2fv(location, new Float32Array(value)); break;
            case 3: gl.uniform3fv(location, new Float32Array(value)); break;
            case 4: gl.uniform4fv(location, new Float32Array(value)); break;
            case 9: gl.uniformMatrix3fv(location, false, new Float32Array(value)); break;
            case 16: gl.uniformMatrix4fv(location, false, new Float32Array(value)); break;
            default: throw 'cant load uniform "' + name + '" of length :' + value.length;
            }
        } else if (isNumber(value)) {
            (this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
        } else {
            throw 'set uniform "' + name + '" to invalid type :' + value;
        }
    }

    flaggedUniforms.forEach(function (flag) {
        if (! uniforms[flag])  gl.uniform1f(this.uniformLocations[flag], 0);
    }, this);

    return this;
};

function dataToUniformType(type) {
    if (type === null) return 'sampler2D';
    if (! Array.isArray(type)) return 'float';
    var length = type.length;
    if (length < 5) return 'vec' + length;
    else return 'mat' + (type.length / 4 | 0);
}

function compileSource(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var i = 2;
        console.log('1:' + source.replace(/\n/g, function () { return '\n' + (i++) + ': '; }));
        console.error('compile error: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
}

function isNumber(n) {
    return ! isNaN(parseFloat(n)) && isFinite(n);
}

module.exports = Shader;

},{"../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\gl\\Texture.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: adnan@famo.us, joseph@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

/**
 * Texture is a private class that stores image data
 * to be accessed from a shader or used as a render target.
 *
 * @class Texture
 * @constructor
 * 
 */

function Texture(gl, options) {
    options = options || {};
    this.id = gl.createTexture();
    var width = this.width = options.width || 0;
    var height = this.height = options.height || 0;
    this.format = options.format || gl.RGBA;
    this.type = options.type || gl.UNSIGNED_BYTE;
    this.gl = gl;

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,
                     gl[options.filter || options.magFilter] || gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                     gl[options.filter || options.minFilter] || gl.NEAREST);


    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,
                     gl[options.wrap || options.wrapS] || gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,
                     gl[options.wrap || options.wrapS] || gl.CLAMP_TO_EDGE);

    gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);

    if (options.minFilter && options.minFilter != gl.NEAREST && options.minFilter != gl.LINEAR) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }
}

Texture.prototype.bind = function bind(unit) {
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + (unit || 0));
    gl.bindTexture(gl.TEXTURE_2D, this.id);
};

Texture.prototype.unbind = function unbind(unit) {
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + (unit || 0));
    gl.bindTexture(gl.TEXTURE_2D, null);
};

Texture.prototype.image = function image(img) {
    var gl = this.gl;
    gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, img);
    return this;
};


Texture.prototype.readBack = function readBack(x, y, width, height) {
    var gl = this.gl;
    x = x || 0;
    y = y || 0;
    width = width || this.width;
    height = height || this.height;
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {
        var pixels = new Uint8Array(width * height * 4);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    return pixels;
};

module.exports = Texture;

},{}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\4x4matrix.js":[function(require,module,exports){
'use strict';

function multiply(outputArray, left, right) {
    var a00 = left[0],  a01 = left[1],  a02 = left[2],  a03 = left[3],
        a10 = left[4],  a11 = left[5],  a12 = left[6],  a13 = left[7],
        a20 = left[8],  a21 = left[9],  a22 = left[10], a23 = left[11],
        a30 = left[12], a31 = left[13], a32 = left[14], a33 = left[15];
    
    var b0 = right[0], b1 = right[1], b2 = right[2], b3 = right[3]; 

    outputArray[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    outputArray[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    outputArray[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    outputArray[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    
    b0 = right[4]; b1 = right[5]; b2 = right[6]; b3 = right[7];

    outputArray[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    outputArray[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    outputArray[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    outputArray[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    
    b0 = right[8]; b1 = right[9]; b2 = right[10]; b3 = right[11];

    outputArray[8]  = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    outputArray[9]  = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    outputArray[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    outputArray[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    
    b0 = right[12]; b1 = right[13]; b2 = right[14]; b3 = right[15];

    outputArray[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    outputArray[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    outputArray[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    outputArray[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return outputArray;
}


function getTranslationFromMultiplication(outputArray, left, right) {
    var a00 = left[0],  a01 = left[1],
        a10 = left[4],  a11 = left[5],
        a20 = left[8],  a21 = left[9],
        a30 = left[12], a31 = left[13];

    var b0 = right[12],
        b1 = right[13],
        b2 = right[14],
        b3 = right[15];

    outputArray[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    outputArray[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    return outputArray;
}

function invert(outputArray, matrix) {
    var a00 = matrix[0],  a01 = matrix[1],  a02 = matrix[2],  a03 = matrix[3],
        a10 = matrix[4],  a11 = matrix[5],  a12 = matrix[6],  a13 = matrix[7],
        a20 = matrix[8],  a21 = matrix[9],  a22 = matrix[10], a23 = matrix[11],
        a30 = matrix[12], a31 = matrix[13], a32 = matrix[14], a33 = matrix[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) return null;
    det = 1.0 / det;

    outputArray[0]  = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    outputArray[1]  = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    outputArray[2]  = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    outputArray[3]  = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    outputArray[4]  = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    outputArray[5]  = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    outputArray[6]  = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    outputArray[7]  = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    outputArray[8]  = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    outputArray[9]  = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    outputArray[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    outputArray[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    outputArray[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    outputArray[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    outputArray[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    outputArray[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return outputArray;
}

function getWfromMultiplication(left, right) {
    var a00 = left[0],  a01 = left[1],  a02 = left[2],  a03 = left[3],
        a10 = left[4],  a11 = left[5],  a12 = left[6],  a13 = left[7],
        a20 = left[8],  a21 = left[9],  a22 = left[10], a23 = left[11],
        a30 = left[12], a31 = left[13], a32 = left[14], a33 = left[15];

    var b0 = right[12], b1 = right[13], b2 = right[14], b3 = right[15];

    return b0*a00 + b1*a10 + b2*a20 + b3*a30 + b0*a01 + b1*a11 + b2*a21 + b3*a31 + b0*a02 + b1*a12 + b2*a22 + b3*a32 + b0*a03 + b1*a13 + b2*a23 + b3*a33;
}

function applyToVector(output, matrix, vector) {
    var a00 = matrix[0],  a01 = matrix[1],  a02 = matrix[2],  a03 = matrix[3],
        a10 = matrix[4],  a11 = matrix[5],  a12 = matrix[6],  a13 = matrix[7],
        a20 = matrix[8],  a21 = matrix[9],  a22 = matrix[10], a23 = matrix[11],
        a30 = matrix[12], a31 = matrix[13], a32 = matrix[14], a33 = matrix[15];

    var v0 = vector[0], v1 = vector[1], v2 = vector[2], v3 = vector[3];

    output[0] = a00 * v0 + a10 * v1 + a20 * v2 + a30 * v3;
    output[1] = a01 * v0 + a11 * v1 + a21 * v2 + a31 * v3;
    output[2] = a02 * v0 + a12 * v1 + a22 * v2 + a32 * v3;
    output[3] = a03 * v0 + a13 * v1 + a23 * v2 + a33 * v3;

    return output;
}

module.exports = {
    multiply                         : multiply,
    getTranslationFromMultiplication : getTranslationFromMultiplication,
    invert                           : invert,
    IDENTITY                         : new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    getWfromMultiplication           : getWfromMultiplication,
    applyToVector                    : applyToVector
};
},{}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Mat33.js":[function(require,module,exports){
var Vec3 = require('./Vec3');

/**
 * A library for using a 3x3 numerical matrix, represented as a two-level array.
 *
 * @class Matrix
 * @constructor
 *
 * @param {Array.Array} values array of rows
 */
function Matrix(values) {
    this.values = values ||
        [
            [1,0,0],
            [0,1,0],
            [0,0,1]
        ];

    return this;
}

var _register = new Matrix();
var _vectorRegister = new Vec3();

/**
 * Return the values in the matrix as an array of numerical row arrays
 *
 * @method get
 *
 * @return {Array.array} matrix values as array of rows.
 */
Matrix.prototype.get = function get() {
    return this.values;
};

/**
 * Set the nested array of rows in the matrix.
 *
 * @method set
 *
 * @param {Array.array} values matrix values as array of rows.
 */
Matrix.prototype.set = function set(values) {
    this.values = values;
};

/**
 * Take this matrix as A, input vector V as a column vector, and return matrix product (A)(V).
 *   Note: This sets the internal vector register.  Current handles to the vector register
 *   will see values changed.
 *
 * @method vectorMultiply
 *
 * @param {Vector} v input vector V
 * @return {Vector} result of multiplication, as a handle to the internal vector register
 */
Matrix.prototype.vectorMultiply = function vectorMultiply(v) {
    var M = this.get();
    var v0 = v.x;
    var v1 = v.y;
    var v2 = v.z;

    var M0 = M[0];
    var M1 = M[1];
    var M2 = M[2];

    var M00 = M0[0];
    var M01 = M0[1];
    var M02 = M0[2];
    var M10 = M1[0];
    var M11 = M1[1];
    var M12 = M1[2];
    var M20 = M2[0];
    var M21 = M2[1];
    var M22 = M2[2];

    return _vectorRegister.set(
        M00*v0 + M01*v1 + M02*v2,
        M10*v0 + M11*v1 + M12*v2,
        M20*v0 + M21*v1 + M22*v2
    );
};

/**
 * Multiply the provided matrix M2 with this matrix.  Result is (this) * (M2).
 *   Note: This sets the internal matrix register.  Current handles to the register
 *   will see values changed.
 *
 * @method multiply
 *
 * @param {Matrix} M2 input matrix to multiply on the right
 * @return {Matrix} result of multiplication, as a handle to the internal register
 */
Matrix.prototype.multiply = function multiply(M2) {
    var M1 = this.get();
    var result = [[]];
    for (var i = 0; i < 3; i++) {
        result[i] = [];
        for (var j = 0; j < 3; j++) {
            var sum = 0;
            for (var k = 0; k < 3; k++) {
                sum += M1[i][k] * M2[k][j];
            }
            result[i][j] = sum;
        }
    }
    return _register.set(result);
};

/**
 * Creates a Matrix which is the transpose of this matrix.
 *   Note: This sets the internal matrix register.  Current handles to the register
 *   will see values changed.
 *
 * @method transpose
 *
 * @return {Matrix} result of transpose, as a handle to the internal register
 */
Matrix.prototype.transpose = function transpose() {
    var result = [];
    var M = this.get();
    for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 3; col++) {
            result[row][col] = M[col][row];
        }
    }
    return _register.set(result);
};

/**
 * Clones the matrix
 *
 * @method clone
 * @return {Matrix} New copy of the original matrix
 */
Matrix.prototype.clone = function clone() {
    var values = this.get();
    var M = [];
    for (var row = 0; row < 3; row++)
        M[row] = values[row].slice();
    return new Matrix(M);
};

module.exports = Matrix;

},{"./Vec3":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Quaternion.js":[function(require,module,exports){
var Matrix = require('./Mat33');
var Vec3 = require('./Vec3');

/**
 * @class Quaternion
 * @constructor
 *
 * @param {Number} w
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 */
function Quaternion(w,x,y,z) {
    if (arguments.length === 1) this.set(w);
    else {
        this.w = (w !== undefined) ? w : 1;  //Angle
        this.x = (x !== undefined) ? x : 0;  //Axis.x
        this.y = (y !== undefined) ? y : 0;  //Axis.y
        this.z = (z !== undefined) ? z : 0;  //Axis.z
    }
    return this;
}

var register = new Quaternion(1,0,0,0);

/**
 * Doc: TODO
 * @method add
 * @param {Quaternion} q
 * @return {Quaternion}
 */
Quaternion.prototype.add = function add(q) {
    return register.setWXYZ(
        this.w + q.w,
        this.x + q.x,
        this.y + q.y,
        this.z + q.z
    );
};

/*
 * Docs: TODO
 *
 * @method sub
 * @param {Quaternion} q
 * @return {Quaternion}
 */
Quaternion.prototype.sub = function sub(q) {
    return register.setWXYZ(
        this.w - q.w,
        this.x - q.x,
        this.y - q.y,
        this.z - q.z
    );
};

/**
 * Doc: TODO
 *
 * @method scalarDivide
 * @param {Number} s
 * @return {Quaternion}
 */
Quaternion.prototype.scalarDivide = function scalarDivide(s) {
    return this.scalarMultiply(1/s);
};

/*
 * Docs: TODO
 *
 * @method scalarMultiply
 * @param {Number} s
 * @return {Quaternion}
 */
Quaternion.prototype.scalarMultiply = function scalarMultiply(s) {
    return register.setWXYZ(
        this.w * s,
        this.x * s,
        this.y * s,
        this.z * s
    );
};

/*
 * Docs: TODO
 *
 * @method multiply
 * @param {Quaternion} q
 * @return {Quaternion}
 */
Quaternion.prototype.multiply = function multiply(q) {
    //left-handed coordinate system multiplication
    var x1 = this.x;
    var y1 = this.y;
    var z1 = this.z;
    var w1 = this.w;
    var x2 = q.x;
    var y2 = q.y;
    var z2 = q.z;
    var w2 = q.w || 0;

    return register.setWXYZ(
        w1*w2 - x1*x2 - y1*y2 - z1*z2,
        x1*w2 + x2*w1 + y2*z1 - y1*z2,
        y1*w2 + y2*w1 + x1*z2 - x2*z1,
        z1*w2 + z2*w1 + x2*y1 - x1*y2
    );
};

var conj = new Quaternion(1,0,0,0);

/*
 * Docs: TODO
 *
 * @method rotateVector
 * @param {Vector} v
 * @return {Quaternion}
 */
Quaternion.prototype.rotateVector = function rotateVector(v) {
    conj.set(this.conj());
    return register.set(this.multiply(v).multiply(conj));
};

/*
 * Docs: TODO
 *
 * @method inverse
 * @return {Quaternion}
 */
Quaternion.prototype.inverse = function inverse() {
    return register.set(this.conj().scalarDivide(this.normSquared()));
};

/*
 * Docs: TODO
 *
 * @method negate
 * @return {Quaternion}
 */
Quaternion.prototype.negate = function negate() {
    return this.scalarMultiply(-1);
};

/*
 * Docs: TODO
 *
 * @method conj
 * @return {Quaternion}
 */
Quaternion.prototype.conj = function conj() {
    return register.setWXYZ(
         this.w,
        -this.x,
        -this.y,
        -this.z
    );
};

/*
 * Docs: TODO
 *
 * @method normalize
 * @param {Number} length
 * @return {Quaternion}
 */
Quaternion.prototype.normalize = function normalize(length) {
    length = (length === undefined) ? 1 : length;
    return this.scalarDivide(length * this.norm());
};

/*
 * Docs: TODO
 *
 * @method makeFromAngleAndAxis
 * @param {Number} angle
 * @param {Vector} v
 * @return {Quaternion}
 */
Quaternion.prototype.makeFromAngleAndAxis = function makeFromAngleAndAxis(angle, v) {
    //left handed quaternion creation: theta -> -theta
    var n  = v.normalize();
    var ha = angle*0.5;
    var s  = -Math.sin(ha);
    this.x = s*n.x;
    this.y = s*n.y;
    this.z = s*n.z;
    this.w = Math.cos(ha);
    return this;
};

/*
 * Docs: TODO
 *
 * @method setWXYZ
 * @param {Number} w
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @return {Quaternion}
 */
Quaternion.prototype.setWXYZ = function setWXYZ(w,x,y,z) {
    register.clear();
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
};

/*
 * Docs: TODO
 *
 * @method set
 * @param {Array|Quaternion} v
 * @return {Quaternion}
 */
Quaternion.prototype.set = function set(v) {
    if (v instanceof Array) {
        this.w = 0;
        this.x = v[0];
        this.y = v[1];
        this.z = v[2];
    }
    else {
        this.w = v.w;
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
    }
    if (this !== register) register.clear();
    return this;
};

/**
 * Docs: TODO
 *
 * @method put
 * @param {Quaternion} q
 * @return {Quaternion}
 */
Quaternion.prototype.put = function put(q) {
    q.set(register);
};

/**
 * Doc: TODO
 *
 * @method clone
 * @return {Quaternion}
 */
Quaternion.prototype.clone = function clone() {
    return new Quaternion(this);
};

/**
 * Doc: TODO
 *
 * @method clear
 * @return {Quaternion}
 */
Quaternion.prototype.clear = function clear() {
    this.w = 1;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

/**
 * Doc: TODO
 *
 * @method isEqual
 * @param {Quaternion} q
 * @return {Boolean}
 */
Quaternion.prototype.isEqual = function isEqual(q) {
    return q.w === this.w && q.x === this.x && q.y === this.y && q.z === this.z;
};

/**
 * Doc: TODO
 *
 * @method dot
 * @param {Quaternion} q
 * @return {Number}
 */
Quaternion.prototype.dot = function dot(q) {
    return this.w * q.w + this.x * q.x + this.y * q.y + this.z * q.z;
};

/**
 * Doc: TODO
 *
 * @method normSquared
 * @return {Number}
 */
Quaternion.prototype.normSquared = function normSquared() {
    return this.dot(this);
};

/**
 * Doc: TODO
 *
 * @method norm
 * @return {Number}
 */
Quaternion.prototype.norm = function norm() {
    return Math.sqrt(this.normSquared());
};

/**
 * Doc: TODO
 *
 * @method isZero
 * @return {Boolean}
 */
Quaternion.prototype.isZero = function isZero() {
    return !(this.x || this.y || this.z);
};

/**
 * Doc: TODO
 *
 * @method getTransform
 * @return {Transform}
 */
Quaternion.prototype.getTransform = function getTransform() {
    var temp = this.normalize(1);
    var x = temp.x;
    var y = temp.y;
    var z = temp.z;
    var w = temp.w;

    //LHC system flattened to column major = RHC flattened to row major
    return [
        1 - 2*y*y - 2*z*z,
            2*x*y - 2*z*w,
            2*x*z + 2*y*w,
        0,
            2*x*y + 2*z*w,
        1 - 2*x*x - 2*z*z,
            2*y*z - 2*x*w,
        0,
            2*x*z - 2*y*w,
            2*y*z + 2*x*w,
        1 - 2*x*x - 2*y*y,
        0,
        0,
        0,
        0,
        1
    ];
};

var matrixRegister = new Matrix();

/**
 * Doc: TODO
 *
 * @method getMatrix
 * @return {Transform}
 */
Quaternion.prototype.getMatrix = function getMatrix() {
    var temp = this.normalize(1);
    var x = temp.x;
    var y = temp.y;
    var z = temp.z;
    var w = temp.w;

    //LHC system flattened to row major
    return matrixRegister.set([
        [
            1 - 2*y*y - 2*z*z,
                2*x*y + 2*z*w,
                2*x*z - 2*y*w
        ],
        [
                2*x*y - 2*z*w,
            1 - 2*x*x - 2*z*z,
                2*y*z + 2*x*w
        ],
        [
                2*x*z + 2*y*w,
                2*y*z - 2*x*w,
            1 - 2*x*x - 2*y*y
        ]
    ]);
};

var epsilon = 1e-5;

/**
 * Doc: TODO
 *
 * @method slerp
 * @param {Quaternion} q
 * @param {Number} t
 * @return {Transform}
 */
Quaternion.prototype.slerp = function slerp(q, t) {
    var omega;
    var cosomega;
    var sinomega;
    var scaleFrom;
    var scaleTo;

    cosomega = this.dot(q);
    if ((1.0 - cosomega) > epsilon) {
        omega       = Math.acos(cosomega);
        sinomega    = Math.sin(omega);
        scaleFrom   = Math.sin((1.0 - t) * omega) / sinomega;
        scaleTo     = Math.sin(t * omega) / sinomega;
    }
    else {
        scaleFrom   = 1.0 - t;
        scaleTo     = t;
    }
    return register.set(this.scalarMultiply(scaleFrom/scaleTo).add(q).multiply(scaleTo));
};

var clamp = function ( x, a, b ) {
    return ( x < a ) ? a : ( ( x > b ) ? b : x );
}

Quaternion.prototype.toEulerXYZ = function toEulerXYZ() {

    q = this.normalize();

    var sqx = q.x * q.x;
    var sqy = q.y * q.y;
    var sqz = q.z * q.z;
    var sqw = q.w * q.w;


    return new Vec3(
        Math.atan2( 2 * ( q.x * q.w - q.y * q.z ), ( sqw - sqx - sqy + sqz ) ),
        Math.asin(  clamp( 2 * ( q.x * q.z + q.y * q.w ), - 1, 1 ) ),
        Math.atan2( 2 * ( q.z * q.w - q.x * q.y ), ( sqw + sqx - sqy - sqz ) )
    );
};

Quaternion.prototype.fromEulerXYZ = function fromEulerXYZ(angle) {
    var sx = sin(angle.x/2);
    var sy = sin(angle.y/2);
    var sz = sin(angle.z/2);
    var cx = cos(angle.x/2);
    var cy = cos(angle.y/2);
    var cz = cos(angle.z/2);

    this.w = cx*cy*cz + sx*sy*sz;
    this.x = sx*cy*cz - cx*sy*sz;
    this.y = cx*sy*cz + sx*cy*sz;
    this.z = cx*cy*sz - sx*sy*cz;

    return this;
};

module.exports = Quaternion;

},{"./Mat33":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Mat33.js","./Vec3":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: will@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var Vec3 = function(x,y,z){
    if (x instanceof Array || x instanceof Float32Array) {
        this.x = x[0] || 0;
        this.y = x[1] || 0;
        this.z = x[2] || 0;
    }
    else {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }
};

var register = new Vec3();

Vec3.zero = new Vec3(0, 0, 0);

Vec3.prototype.set = function set(x,y,z) {
    if (x !== undefined) this.x = x;
    if (y !== undefined) this.y = y;
    if (z !== undefined) this.z = z;
    return this;
};

Vec3.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
};

Vec3.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
};

Vec3.prototype.rotateX = function rotateX(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.y = y * cosTheta - z * sinTheta;
    this.z = y * sinTheta + z * cosTheta;

    return this;
};

Vec3.prototype.rotateY = function rotateY(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = z * sinTheta + x * cosTheta;
    this.z = z * cosTheta - x * sinTheta;

    return this;
};

Vec3.prototype.rotateZ = function rotateZ(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x =   x * cosTheta - y * sinTheta;
    this.y =   x * sinTheta + y * cosTheta;

    return this;
};

Vec3.prototype.rotateX = function rotateX(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.y = y * cosTheta - z * sinTheta;
    this.z = y * sinTheta + z * cosTheta;

    return this;
};

Vec3.prototype.rotateY = function rotateY(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = z * sinTheta + x * cosTheta;
    this.z = z * cosTheta - x * sinTheta;

    return this;
};

Vec3.prototype.rotateZ = function rotateZ(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x =   x * cosTheta - y * sinTheta;
    this.y =   x * sinTheta + y * cosTheta;

    return this;
};

Vec3.prototype.scale = function scale(s) {
    if (s instanceof Vec3) {
        this.x *= s.x;
        this.y *= s.y;
        this.z *= s.z;
    } else {
        this.x *= s;
        this.y *= s;
        this.z *= s;
    }
    return this;
};

Vec3.prototype.invert = function invert() {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
    return this;
};


Vec3.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    this.z = fn(this.z);

    return this;
};

Vec3.prototype.length = function length() {
    var x = this.x;
    var y = this.y;
    var z = this.z;
    return Math.sqrt(x * x + y * y + z * z);
};

Vec3.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
};

Vec3.prototype.clear = function clear(v) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
};

Vec3.prototype.isZero = function isZero() {
    if (this.x !== 0 || this.y !== 0 || this.z !== 0) return false;
    else return true;
};

Vec3.prototype.isEqual = function isEqual(v) {
    if (this.x !== v.x || this.y !== v.y || this.z !== v.z) return false;
    else return true;
};

Vec3.prototype.toValue = function toValue() {
    return [this.x, this.y, this.z];
};

Vec3.prototype.normalize = function normalize() {
    var length = this.length();

    this.x = this.x / length;
    this.y = this.y / length;
    this.z = this.z / length;
};

Vec3.normalize = function normalize(v) {
    var length = v.length();
    return register.set(v.x/length, v.y/length, v.z/length);
};

Vec3.clone = function clone(v) {
    return register.set(v.x, v.y, v.z);
};

Vec3.add = function add(v1, v2) {
    var x = v1.x + v2.x;
    var y = v1.y + v2.y;
    var z = v1.z + v2.z;
    return register.set(x,y,z);
};

Vec3.subtract = function subtract(v1, v2) {
    var x = v1.x - v2.x;
    var y = v1.y - v2.y;
    var z = v1.z - v2.z;
    return register.set(x,y,z);
};

Vec3.scale = function scale(v, s) {
    var x = v.x * s;
    var y = v.y * s;
    var z = v.z * s;
    return register.set(x,y,z);
};

Vec3.dotProduct = function dotProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

Vec3.crossProduct = function crossProduct(v1, v2) {
    return register.set(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
};

Vec3.equals = function equals(v1, v2) {
    return v1.x === v2.x && v1.y === v2.y && v1.z === v2.z;
};

Vec3.project = function project(v1, v2) {
    return Vec3.normalize(v2).scale(Vec3.dotProduct(v1, v2));
}

module.exports = Vec3;

},{}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\PhysicsComponent.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: adam@famo.us, will@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityRegistry = require('../core/EntityRegistry');
var Body = require('./bodies/Body');
var Vec3 = require('../math/Vec3');
var PhysicsSystem = require('./PhysicsSystem');
var Entity = require('../core/Entity');

/**
 * Componenet to attach a body to entity
 *
 * @class PhysicsComponent
 * @implements Component
 * @param {Number} entityId id of the entity
 * @param {Object} instantialization options for the body
 */
function PhysicsComponent(entityOrId, options) {
    options = options || {};
    var entity;
    if (!(typeof entityOrId === Entity)) {
        entity = EntityRegistry.getEntity(entityOrId);
    } else {
        entity = entityOrId;
    }
    this._entityTransform = entity.getComponent('transform');
    EntityRegistry.register(entity, 'Bodies');

    this._cachedPosition = new Vec3();
    this._cachedRotation = new Vec3();
    this._positionDiff = new Vec3();
    this._eulerDiff = new Vec3();

    this.body = options.body || new Body(options);

    PhysicsSystem.addBody(this.body);
}

/**
 * Returns name of class for entity registry
 *
 * @method PhysicsComponent.toString
 * @returns {string} physicsComponent
 */
PhysicsComponent.toString = function toString(){
    return 'physicsComponent';
};

/**
 * Clamps input vector to the tenths place
 * @private _clamp
 * @param {Vec3}
 * @returns {Vec3}
 */
function _clamp(vec3) {
    return new Vec3((10 * vec3.x << 0) * 0.1,
                    (10 * vec3.y << 0) * 0.1,
                    (10 * vec3.z << 0) * 0.1);
}

/**
 * Returns the body created by the PhysicsComponent
 *
 * @method PhysicsComponent#getBody
 * @returns {Body} body
 */
PhysicsComponent.prototype.getBody = function getBody() {
    return this.body;
};

/**
 * Updates the transform of the entity on update event of the body
 *
 * @method PhysicsComponent#_update
 */
PhysicsComponent.prototype.update = function update() {
    var position = this.body.getPosition();
    this._positionDiff.copy(Vec3.subtract(position, this._cachedPosition));
    var euler = this.body.getOrientation().toEulerXYZ();
    this._eulerDiff.copy(Vec3.subtract(euler, this._cachedRotation));
    var positionOut = _clamp(this._positionDiff);
    this._entityTransform.translate(this._positionDiff.x, this._positionDiff.y, this._positionDiff.z);
    this._entityTransform.rotate(this._eulerDiff.x, this._eulerDiff.y, this._eulerDiff.z);
    this._cachedPosition.copy(position);
    this._cachedRotation.copy(euler);
};

module.exports = PhysicsComponent;

},{"../core/Entity":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Entity.js","../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js","../math/Vec3":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js","./PhysicsSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\PhysicsSystem.js","./bodies/Body":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\bodies\\Body.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\PhysicsSystem.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: adam@famo.us, will@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */
'use strict';

var EntityRegistry = require('../core/EntityRegistry');
var TimeSystem = require("../core/Systems/TimeSystem");
var Force = require('./forces/Force');
var Constraint = require('./constraints/Constraint');
var Particle = require('./bodies/Particle');

var bodies = EntityRegistry.addCollection('Bodies');

var PhysicsSystem = {};

PhysicsSystem.agents = [];
PhysicsSystem.constraints = [];
PhysicsSystem.bodies = [];
PhysicsSystem.agentRegistry = {};


PhysicsSystem.step = 1/60;
PhysicsSystem._IDPool = {
    bodies: [],
    agents: [],
    constraints: []
};

PhysicsSystem.addBody = function addBody(body) {
    if (body._ID === null) {
        if (this._IDPool.bodies.length) {
            body._ID = this._IDPool.bodies.pop();
        } else {
            body._ID = this.bodies.length;
        }
        this.bodies[this.bodies.length] = body;
    }
}

PhysicsSystem.removeBody = function removeBody(body) {
    this._IDPool.bodies.push(body._ID);
    this.bodies[body._ID] = null;
    body._ID = null;
}

PhysicsSystem.attach = function attach(agents, source, targets) {
    if (!targets) targets = this.bodies;
    if (!(targets instanceof Array)) targets = [targets];
    var nTargets = targets.length;
    while (nTargets--) {
        if (targets[nTargets]._ID === null) this.addBody(targets[nTargets]);
    }
    if (source) this.addBody(source);
    if (agents instanceof Array) {
        var agentIDs = Array(agents.length);
        var nAgents = agents.length;
        while(nAgents--) {
            agentIDs[nAgents] = _attachAgent.call(this, agents[i], targets, source);
        }
    }
    else _attachAgent.call(this, agents, targets, source);

    return agentIDs;
};


function _attachAgent(agent, targets, source) {
    if (agent._ID) throw new Error ("Agents can only be added to the engine once"); // Handle it here
    if (targets === undefined) targets = this.bodies;

    if (agent instanceof Force) {
        if (this._IDPool.agents.length) {
            agent._ID = this._IDPool.agents.pop();
        } else {
            agent._ID = this.agents.length;
        }
        this.agents[this.agents.length] = {
            agent   : agent,
            targets : targets,
            source  : source
        };
    }

    else if (agent instanceof Constraint) {
        if (this._IDPool.constraints.length) {
            agent._ID = this._IDPool.constraints.pop();
        } else {
            agent._ID = this.constraints.length;
        }
        this.constraints[this.constraints.length] = {
            constraint : agent,
            targets    : targets,
            source     : source
        }
    }

    else throw new Error("Only Agents and Constrants may be added to the Physics System");
    return agent._ID;
}

PhysicsSystem.remove = function remove(agentsOrBodies) {
    if (agentsOrBodies instanceof Array) {
        var neElements = agentsOrBodies.length;
        while(neElements--) {
            _removeOne.call(this, agentsOrBodies[neElements]);
        }
    }
    else _removeOne.call(this, agentsOrBodies);
}

function _removeOne(agentOrBody) {
    if (agentOrBody instanceof Force) {
        this._IDPool.agents.push(agentOrBody._ID);
        this.agents[agentOrBody._ID] = null;
    } else if (agentOrBody instanceof Constraint) {
        this._IDPool.constraints.push(agentOrBody._ID);
        this.constraints[agentOrBody._ID] = null;
    } else if (agentOrBody instanceof Particle) {
        this._IDPool.bodies.push(agentOrBody._ID);
        this.bodies[agentOrBody._ID] = null;
    }
    agentOrBody._ID = null;
}

PhysicsSystem.attachTo = function attachTo(agent, targets) {
    if (agent._ID === null) return;
    if (!(targets instanceof Array)) targets = [targets];
    var nTargets = targets.length;
    while (nTargets--) {
        if (targets[nTargets]._ID === null) this.addBody(targets[nTargets]);
    }
    this.agents[agent._ID].targets = this.agents[agent._ID].targets.concat(targets);
};

PhysicsSystem.removeFrom = function removeFrom(agent, target) {
    if (agent._ID === null) return;
    var agentTargets = this.agents[agent._ID].targets;

    var nTargets = agentTargets.length;
    while(nTargets--) {
      if (agentTargets[nTargets] === target) {
        // remove target from agent and stop checking targets
        return agentTargets.splice(nTargets, 1);
      }
    }
};

PhysicsSystem.update = function update() {
    var dt = TimeSystem.getDelta()/1000;

    while(dt > 0) {
        var step = (dt > this.step) ? this.step : dt;
        // UpdateForces on particles
        var nAgents = this.agents.length;
        while(nAgents--) {
            if (this.agents[nAgents]) this.agents[nAgents].agent.update(this.agents[nAgents].source, this.agents[nAgents].targets);
        }

        var nConstraints = this.constraints.length;
        while(nConstraints--) {
            if (!this.constraints[nConstraints]) continue;
            this.constraints[nConstraints].constraint.update(this.constraints[nConstraints].source, this.constraints[nConstraints].targets, step*1000);
        }
        // Integrate Particle positions
        var nBodies = this.bodies.length;
        var body;
        while(nBodies--) {
            body = this.bodies[nBodies];
            if (!body) continue;
            if (body.settled) {
                if (body._force.length() > body.sleepThreshold || body._velocity.length() > body.sleepThreshold) {
                    body.settled = false;
                } else {
                    body.getForce().clear();
                }
            }
            if (!body.settled) body._integrateVelocity(step);
        }

        // Update particles based on constraints

        nBodies = this.bodies.length;
        while(nBodies--) {
            body = this.bodies[nBodies];
            if (!body) continue;
            if (!body.settled) body._integratePose(step);
        }

        dt -= this.step;
    }

};

module.exports = PhysicsSystem;

},{"../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js","../core/Systems/TimeSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Systems\\TimeSystem.js","./bodies/Particle":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\bodies\\Particle.js","./constraints/Constraint":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\constraints\\Constraint.js","./forces/Force":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\forces\\Force.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\bodies\\Body.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: adam@famo.us, will@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';
var Particle = require('./Particle');
var Vec3 = require('../../math/Vec3');
var Quaternion = require('../../math/Quaternion');
var Matrix = require('../../math/Mat33');
var SymplecticEuler = require('../integrators/SymplecticEuler');

/**
 * A unit controlled by the physics engine which extends the zero-dimensional
 * Particle to include geometry. In addition to maintaining the state
 * of a Particle its state includes orientation, angular velocity
 * and angular momentum and responds to torque forces.
 *
 * @class Body
 * @extends Particle
 * @constructor
 */
function Body(options) {
    Particle.call(this, options);
    options = options || {};

    if (options.orientation instanceof Quaternion) {
        this.orientation = options.orientation;
    }
    else if (options.orientation instanceof Vec3) {
        this.orientation = new Quaternion().fromEulerXYZ(this.orientation);
    }
    else if (options.orientation instanceof Array || options.orientation instanceof Float32Array) {
        this.orientation = new Quaternion().fromEulerXYZ(new Vec3(options.orientation));
    }
    else {
        this.orientation = new Quaternion();
    }

    this.angularVelocity = new Vec3(options.angularVelocity);
    this.angularMomentum = new Vec3(options.angularMomentum);
    this.torque = new Vec3(options.torque);

    this.setMomentsOfInertia();

    this.angularVelocity.w = 0;        //quaternify the angular velocity

    //registers
    this.pWorld = new Vec3();        //placeholder for world space position
}

Body.toString = function toString(){
    return 'particle';
};

Body.prototype = Object.create(Particle.prototype);
Body.prototype.constructor = Body;

Body.prototype.isBody = true;

Body.prototype.setMass = function setMass() {
    Particle.prototype.setMass.apply(this, arguments);
    this.setMomentsOfInertia();
};

/**
 * Setter for moment of inertia, which is necessary to give proper
 * angular inertia depending on the geometry of the body.
 *
 * @method setMomentsOfInertia
 */
Body.prototype.setMomentsOfInertia = function setMomentsOfInertia() {
    this.inertia = new Matrix();
    this.inverseInertia = new Matrix();
};

/**
 * Update the angular velocity from the angular momentum state.
 *
 * @method updateAngularVelocity
 */
Body.prototype.updateAngularVelocity = function updateAngularVelocity() {
    this.angularVelocity.copy(this.inverseInertia.vectorMultiply(this.angularMomentum));
};

/**
 * Determine world coordinates from the local coordinate system. Useful
 * if the Body has rotated in space.
 *
 * @method toWorldCoordinates
 * @param localPosition {Vector} local coordinate vector
 * @return global coordinate vector {Vector}
 */
Body.prototype.toWorldCoordinates = function toWorldCoordinates(localPosition) {
    return this.pWorld.copy(this.orientation.rotateVector(localPosition));
};

/**
 * Setter for orientation
 *
 * @method setOrientation
 * @param q {Array|Quaternion} orientation
 */
Body.prototype.setOrientation = function setOrientation(q) {
    this.orientation.set(q);
};

Body.prototype.getOrientation = function getOrientation(q) {
    return this.orientation;
};

/**
 * Setter for angular velocity
 *
 * @method setAngularVelocity
 * @param w {Array|Vector} angular velocity
 */
Body.prototype.setAngularVelocity = function setAngularVelocity(w) {
    if (w instanceof Array) {
        this.angularVelocity.set(w[0],w[1],w[2])
    } else {
        this.angularVelocity.copy(w);
    }
};

/**
 * Setter for angular momentum
 *
 * @method setAngularMomentum
 * @param L {Array|Vector} angular momentum
 */
Body.prototype.setAngularMomentum = function setAngularMomentum(L) {
    if (L instanceof Array) {
        this.angularMomentum.set(L[0],L[1],L[2])
    } else {
        this.angularMomentum.copy(L);
    }
};

/**
 * Extends Particle.applyForce with an optional argument
 * to apply the force at an off-centered location, resulting in a torque.
 *
 * @method applyForce
 * @param force {Vector} force
 * @param [location] {Vector} off-center location on the body
 */
Body.prototype.applyForce = function applyForce(force, location) {
    Particle.prototype.applyForce.call(this, force);
    if (location !== undefined) this.applyTorque(location.cross(force));
};

/**
 * Applied a torque force to a body, inducing a rotation.
 *
 * @method applyTorque
 * @param torque {Vector} torque
 */
Body.prototype.applyTorque = function applyTorque(torque) {
    this.torque.add(torque);
};

/**
 * Extends Particle._integrate to also update the rotational states
 * of the body.
 *
 * @method getTransform
 * @protected
 * @param dt {Number} delta time
 */

Body.prototype._integratePose = function _integratePose(dt) {
    Particle.prototype._integratePose.call(this, dt);
    SymplecticEuler.integrateAngularMomentum(this, dt);
    this.updateAngularVelocity();
};

Body.prototype._integrateVelocity = function _integrateVelocity(dt) {
    Particle.prototype._integrateVelocity.call(this, dt);
    SymplecticEuler.integrateOrientation(this, dt);
}

module.exports = Body;

},{"../../math/Mat33":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Mat33.js","../../math/Quaternion":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Quaternion.js","../../math/Vec3":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js","../integrators/SymplecticEuler":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\integrators\\SymplecticEuler.js","./Particle":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\bodies\\Particle.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\bodies\\Particle.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: adam@famo.us, will@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';
var Vec3 = require('../../math/Vec3');
var SymplecticEuler = require('../integrators/SymplecticEuler');
var EventEmitter = require('../../events/EventEmitter');

function Particle(options) {
    this._eventEmitter = new EventEmitter();

    options = options || {};
    this._position = new Vec3(options.position);
    this._lastPosition = new Vec3();
    this._velocity = new Vec3(options.velocity);
    this._force = new Vec3();
    this._mass = options.mass || 1;
    this._momentum = Vec3.scale(this._velocity, this._mass);

    this._ID = null;
    this.settled = false;
    this.sleepThreshold = options.sleepThreshold || 0;
}


Particle.toString = function toString(){
    return 'particle';
};

Particle.prototype.getMass = function getMass() {
    return this._mass;
};

Particle.prototype.setMass = function setMass(mass) {
    this._mass = mass;
    return this;
};

Particle.prototype.getPosition = function getPosition() {
    return this._position;
};

Particle.prototype.getLastPosition = function getLastPosition() {
    return this._lastPosition;
};

Particle.prototype.setPosition = function setPosition(x, y, z) {
    if (x instanceof Vec3) {
        this._position.copy(x);
    } else {
        this._position.set(x, y, z);
    }
    return this;
};

Particle.prototype.getVelocity = function getVelocity() {
    return this._velocity;
};

Particle.prototype.setVelocity = function setVelocity(x, y, z) {
    if (x instanceof Vec3) {
        this._velocity.copy(x);
    } else {
        this._velocity.set(x, y, z);
    }
    return this;
};

Particle.prototype.getForce = function getForce() {
    return this._force;
};

Particle.prototype.setForce = function setForce(v) {
    this._force.copy(v);
    return this;
};

// p = mv
Particle.prototype.getMomentum = function getMomentum() {
    return this._momentum.copy(this.velocity).scale(this._mass);
};

Particle.prototype.getMomentumScalar = function getMomentumScalar() {
    return this.getMomentum().length();
};

Particle.prototype.applyForce = function applyForce(force){
    this._force.add(force);
};

Particle.prototype.applyImpulse = function applyImpulse(impulse) {
    if (impulse.isZero()) return;
    this._velocity.add(impulse.scale(1/this.getMass()));
};

Particle.prototype._integrateVelocity = function _integrateVelocity(dt) {
    SymplecticEuler.integrateVelocity(this, dt);
};

Particle.prototype._integratePose = function _integratePose(dt) {
    SymplecticEuler.integratePosition(this, dt);
    this._eventEmitter.emit('update');
    if (this._force.length() < this.sleepThreshold && this._velocity.length() < this.sleepThreshold) {
        this.settled = true;
        this._eventEmitter.emit('settled');
        this._velocity.clear();
    }
    this._force.clear();
};

module.exports = Particle;


},{"../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventEmitter.js","../../math/Vec3":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js","../integrators/SymplecticEuler":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\integrators\\SymplecticEuler.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\constraints\\Constraint.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: adam@famo.us, will@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */
 var OptionsManager = require('../../core/OptionsManager');

/**
 * Base Constraint class to be used in the PhysicsSystem
 * Subclass this class to implement a constraint
 *
 * @virtual
 * @class Constraint
 */
function Constraint(options) {
    this.options = OptionsManager.patch(Object.create(this.constructor.DEFAULT_OPTIONS), options);
    this._ID = null;
};

// Not meant to be implemented
Constraint.prototype = {};
Constraint.prototype.constructor = undefined;

/**
 * Apply the constraint from the source to the targets
 *
 * @method Constraint#update
 * @param {Particle | undefined} source the source of the constraint
 * @param {Particle[]} targets of the constraint
 * @throws when not subclassed
 */
Constraint.prototype.update = function(source, targets) {
    throw new Error('Constraint should be extended, not implemented');
}

module.exports = Constraint;

},{"../../core/OptionsManager":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\OptionsManager.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\forces\\Force.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: adam@famo.us, will@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */
var OptionsManager = require('../../core/OptionsManager');
var EventEmitter = require('../../events/EventEmitter');

/**
 * Abstract force manager to apply forces to targets.  Not meant to be implemented.
 * @virtual
 * @class Force
 */
function Force(options) {
    this.setOptions(options);
    this._eventEmitter = new EventEmitter();
    this._ID = null;
}

// Not Meant to be implimented
Force.prototype = {};
Force.prototype.constructor = null;

Force.prototype.setOptions = function setOptions(options) {
    this.options = OptionsManager.patch(this.options || Object.create(this.constructor.DEFAULT_OPTIONS || {}), options);
};

/**
 * @method update
 * @param {Particle} source
 * @param {Particle[]} targets
 */
Force.prototype.update = function update(sources, targets) {
    // Linear operation in targets
    // calculate distance between source, targets
    this._eventEmitter.emit('update');
    var target;
    if (!(sources instanceof Array)) sources = [sources];
    for (var i = 0; i < targets.length; i++) {
        target = targets[i];
        var l = sources.length;
        while (l--) {
            if (sources[l] === target) continue;
            target.applyForce(this.options.forceFunction.call(this, this.options.constant, sources[l], target));
        }
    }
};

module.exports = Force;

},{"../../core/OptionsManager":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\OptionsManager.js","../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\forces\\RotationalSpring.js":[function(require,module,exports){
var Force = require('./Force');
var Spring = require('./Spring');
var Quaternion = require('../../math/Quaternion');
var Vec3 = require('../../math/Vec3');

/**
 *  A force that rotates a physics body back to target Euler angles.
 *  Just as a spring translates a body to a particular X, Y, Z, location,
 *  a rotational spring rotates a body to a particular X, Y, Z Euler angle.
 *      Note: there is no physical Force that does this in the "real world"
 *
 *  @class RotationalSpring
 *  @constructor
 *  @extends Spring
 *  @param {Object} options options to set on drag
 */
function RotationalSpring(options) {
    this.options = options || {};
    Spring.call(this, options);
    this.setOptions(options);
}

RotationalSpring.prototype = Object.create(Spring.prototype);
RotationalSpring.prototype.constructor = RotationalSpring;

RotationalSpring.DEFAULT_OPTIONS = Spring.DEFAULT_OPTIONS;
RotationalSpring.FORCE_FUNCTIONS = Spring.FORCE_FUNCTIONS;

/** @const */
var pi = Math.PI;

function _calcStiffness() {
    var options = this.options;
    options.stiffness = Math.pow(2 * pi / options.period, 2);
}

function _calcDamping() {
    var options = this.options;
    options.damping = 4 * pi * options.dampingRatio / options.period;
}

function _init() {
    _calcStiffness.call(this);
    _calcDamping.call(this);
}

RotationalSpring.prototype.setOptions = function setOptions(options) {
    // TODO fix no-console error
    /* eslint no-console: 0 */
    Force.prototype.setOptions.call(this, options);
    if (options.anchor !== undefined) {
        if (options.anchor instanceof Quaternion) this.options.anchor = options.anchor;
        if (options.anchor  instanceof Array) this.options.anchor = new Quaternion(options.anchor);
    }

    if (options.period !== undefined){
        this.options.period = options.period*1000;
    }

    if (options.dampingRatio !== undefined) this.options.dampingRatio = options.dampingRatio;
    if (options.length !== undefined) this.options.length = options.length;
    if (options.forceFunction !== undefined) this.options.forceFunction = options.forceFunction;
    if (options.maxLength !== undefined) this.options.maxLength = options.maxLength;

    _init.call(this);
    this.options.forceFunction = this.applyForce;
};

/**
 * Adds a torque force to a physics body's torque accumulator.
 *
 * @method applyForce
 * @param targets {Array.Body} Array of bodies to apply torque to.
 */
RotationalSpring.prototype.applyForce = function applyForce(constant, source, target) {
    var force = this._force;
    var options = this.options;
    var disp = this.disp;

    var stiffness = options.stiffness;
    var damping = options.damping;
    var restLength = options.length;
    var anchor = options.anchor;
    var type = options.type;
    var maxLength = options.maxLength;

    var i;
    var dist;
    var m;
    disp.copy(anchor.sub(target.getOrientation()));
    dist = disp.length() - restLength;
    //console.log(dist)

    if (dist === 0) return new Vec3();

    //if dampingRatio specified, then override strength and damping
    m      = target._mass;
    stiffness *= m;
    damping   *= m;

    force.copy(Vec3.normalize(disp).scale(stiffness * type(dist, maxLength)));

    if (damping) force.add(Vec3.scale(target.angularVelocity, -damping));

    target.applyTorque(force);
    return new Vec3();
};

/**
 * Calculates the potential energy of the rotational spring.
 *
 * @method getEnergy
 * @param [targets] target The physics body attached to the spring
 */
RotationalSpring.prototype.getEnergy = function getEnergy(targets) {
    var options     = this.options;
    var restLength  = options.length;
    var anchor      = options.anchor;
    var strength    = options.stiffness;

    var energy = 0.0;
    for (var i = 0; i < targets.length; i++) {
        var target = targets[i];
        var dist = anchor.sub(target.orientation).norm() - restLength;
        energy += 0.5 * strength * dist * dist;
    }
    return energy;
};

module.exports = RotationalSpring;
},{"../../math/Quaternion":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Quaternion.js","../../math/Vec3":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js","./Force":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\forces\\Force.js","./Spring":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\forces\\Spring.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\forces\\Spring.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: will@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var Force = require('./Force');
var Vec3 = require('../../math/Vec3');

/**
 *  A force that moves a physics body to a location with a spring motion.
 *    The body can be moved to another physics body, or an anchor point.
 *
 *  @class Spring
 *  @constructor
 *  @extends Force
 *  @param {Object} options options to set on drag
 */
function Spring(options) {
    this.options = Object.create(this.constructor.DEFAULT_OPTIONS);
    options = options || {};
    Force.call(this, options);

    if (options) this.setOptions(options);

    //registers
    this.disp = new Vec3(0,0,0);
    this._force = new Vec3();

    _init.call(this);
}

Spring.prototype = Object.create(Force.prototype);
Spring.prototype.constructor = Spring;

/** @const */
var pi = Math.PI;
var MIN_PERIOD = 0;

/**
 * @property Spring.FORCE_FUNCTIONS
 * @type Object
 * @protected
 * @static
 */
Spring.FORCE_FUNCTIONS = {

    /**
     * A FENE (Finitely Extensible Nonlinear Elastic) spring force
     *      see: http://en.wikipedia.org/wiki/FENE
     * @attribute FENE
     * @type Function
     * @param {Number} dist current distance target is from source body
     * @param {Number} rMax maximum range of influence
     * @return {Number} unscaled force
     */
    FENE : function(dist, rMax) {
        var rMaxSmall = rMax * .99;
        var r = Math.max(Math.min(dist, rMaxSmall), -rMaxSmall);
        return r / (1 - r * r/(rMax * rMax));
    },

    /**
     * A Hookean spring force, linear in the displacement
     *      see: http://en.wikipedia.org/wiki/Hooke's_law
     * @attribute FENE
     * @type Function
     * @param {Number} dist current distance target is from source body
     * @return {Number} unscaled force
     */
    HOOK : function(dist) {
        return dist;
    }
};

/**
 * @property Spring.DEFAULT_OPTIONS
 * @type Object
 * @protected
 * @static
 */
Spring.DEFAULT_OPTIONS = {

    /**
     * The amount of time in milliseconds taken for one complete oscillation
     * when there is no damping
     *    Range : [150, Infinity]
     * @attribute period
     * @type Number
     * @default 300
     */
    period : 300,

    /**
     * The damping of the spring.
     *    Range : [0, 1]
     *    0 = no damping, and the spring will oscillate forever
     *    1 = critically damped (the spring will never oscillate)
     * @attribute dampingRatio
     * @type Number
     * @default 0.1
     */
    dampingRatio : 0.1,

    /**
     * The rest length of the spring
     *    Range : [0, Infinity]
     * @attribute length
     * @type Number
     * @default 0
     */
    length : 0,

    /**
     * The maximum length of the spring (for a FENE spring)
     *    Range : [0, Infinity]
     * @attribute length
     * @type Number
     * @default Infinity
     */
    maxLength : Infinity,

    /**
     * The location of the spring's anchor, if not another physics body
     *
     * @attribute anchor
     * @type Array
     * @optional
     */
    anchor : undefined,

    /**
     * The type of spring force
     * @attribute type
     * @type Function
     */
    type : Spring.FORCE_FUNCTIONS.HOOK,

    forceFunction: applyForce
};

function _calcStiffness() {
    var options = this.options;
    options.stiffness = Math.pow(2 * pi / options.period*1000, 2);
}

function _calcDamping() {
    var options = this.options;
    options.damping = 4 * pi * options.dampingRatio / options.period*1000;
}

function _init() {
    _calcStiffness.call(this);
    _calcDamping.call(this);
}

/**
 * Basic options setter
 *
 * @method setOptions
 * @param options {Object}
 */
Spring.prototype.setOptions = function setOptions(options) {
    // TODO fix no-console error
    /* eslint no-console: 0 */

    if (options.anchor !== undefined) {
        if (options.anchor.position instanceof Vec3) this.options.anchor = options.anchor.position;
        if (options.anchor instanceof Vec3) this.options.anchor = options.anchor;
        if (options.anchor instanceof Array)  this.options.anchor = new Vec3(options.anchor);
    }

    if (options.period !== undefined){
        if (options.period < MIN_PERIOD) {
            options.period = MIN_PERIOD;
            console.warn('The period of a SpringTransition is capped at ' + MIN_PERIOD + ' ms. Use a SnapTransition for faster transitions');
        }
        this.options.period = options.period;
    }

    if (options.dampingRatio !== undefined) this.options.dampingRatio = options.dampingRatio;
    if (options.length !== undefined) this.options.length = options.length;
    if (options.type !== undefined) this.options.type = options.type;
    if (options.maxLength !== undefined) this.options.maxLength = options.maxLength;

    _init.call(this);
    Force.prototype.setOptions.call(this, options);
};

/**
 * Adds a spring force to a physics body's force accumulator.
 *
 * @method applyForce
 * @param targets {Array.Body} Array of bodies to apply force to.
 */
function applyForce(constant, source, target) {
    var disp = this.disp;
    var options = this.options;

    var stiffness = options.stiffness;
    var damping = options.damping;
    var restLength = options.length;
    var maxLength = options.maxLength;
    var anchor = options.anchor || source._position;
    var type = options.type;

    var i;
    var target;
    var p2;
    var v2;
    var dist;
    var m;

    p2 = target._position;
    v2 = target._velocity;

    disp.copy(Vec3.subtract(anchor,p2));
    dist = disp.length() - restLength;

    if (dist === 0) return new Vec3();

    //if dampingRatio specified, then override strength and damping
    m      = target._mass;
    stiffness *= m;
    damping   *= m;

    this._force.copy(Vec3.normalize(disp).scale((stiffness * type(dist, maxLength))));

    if (damping)
        if (source) this._force.add(Vec3.subtract(v2, source._velocity).scale(-damping));
        else this._force.add(Vec3.scale(v2,-damping));

    return this._force;
};

/**
 * Calculates the potential energy of the spring.
 *
 * @method getEnergy
 * @param [targets] target  The physics body attached to the spring
 * @return {source}         The potential energy of the spring
 */
Spring.prototype.getEnergy = function getEnergy(targets, source) {
    var options     = this.options;
    var restLength  = options.length;
    var anchor      = (source) ? source._position : options.anchor;
    var strength    = options.stiffness;

    var energy = 0.0;
    for (var i = 0; i < targets.length; i++){
        var target = targets[i];
        var dist = anchor.sub(target._position).norm() - restLength;
        energy += 0.5 * strength * dist * dist;
    }
    return energy;
};

module.exports = Spring;

},{"../../math/Vec3":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js","./Force":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\forces\\Force.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\integrators\\SymplecticEuler.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: adam@famo.us, will@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */


/**
 * Ordinary Differential Equation (ODE) Integrator.
 * Manages updating a physics body's state over time.
 *
 *  p = position, v = velocity, m = mass, f = force, dt = change in time
 *
 *      v <- v + dt * f / m
 *      p <- p + dt * v
 *
 *  q = orientation, w = angular velocity, L = angular momentum
 *
 *      L <- L + dt * t
 *      q <- q + dt/2 * q * w
 *
 * @class SymplecticEuler
 * @constructor
 * @param {Object} options Options to set
 */
var SymplecticEuler = {};
var Vec3 = require('../../math/Vec3');

/*
 * Updates the velocity of a physics body from its accumulated force.
 *      v <- v + dt * f / m
 *
 * @method integrateVelocity
 * @param {Body} physics body
 * @param {Number} dt delta time
 */
SymplecticEuler.integrateVelocity = function integrateVelocity(body, dt) {
    var v = body.getVelocity();
    var w = 1/body.getMass();
    var f = body.getForce();
    if (f.isZero()) return;

    v.add(Vec3.scale(f, (dt * w)));
};

/*
 * Updates the position of a physics body from its velocity.
 *      p <- p + dt * v
 *
 * @method integratePosition
 * @param {Body} physics body
 * @param {Number} dt delta time
 */
SymplecticEuler.integratePosition = function integratePosition(body, dt) {
    var p = body.getPosition();
    var v = body.getVelocity();

    p.add(Vec3.scale(v, dt));
};

/*
 * Updates the angular momentum of a physics body from its accumuled torque.
 *      L <- L + dt * t
 *
 * @method integrateAngularMomentum
 * @param {Body} physics body (except a particle)
 * @param {Number} dt delta time
 */
SymplecticEuler.integrateAngularMomentum = function integrateAngularMomentum(body, dt) {
    var L = body.angularMomentum;
    var t = body.torque;

    if (t.isZero()) return;

    L.add(t.scale(dt));
    t.clear();
};

/*
 * Updates the orientation of a physics body from its angular velocity.
 *      q <- q + dt/2 * q * w
 *
 * @method integrateOrientation
 * @param {Body} physics body (except a particle)
 * @param {Number} dt delta time
 */
SymplecticEuler.integrateOrientation = function integrateOrientation(body, dt) {
    var q = body.orientation;
    var w = body.angularVelocity;

    if (w.isZero()) return;
    q.add(q.multiply(w).scalarMultiply(0.5 * dt)).put(q);
//        q.normalize.put(q);
};

module.exports = SymplecticEuler;

},{"../../math/Vec3":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\math\\Vec3.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\transitions\\LiftSystem.js":[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owners: dan@famo.us
 *         felix@famo.us
 *         mike@famo.us
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

'use strict';

var EntityRegistry = require('../core/EntityRegistry');
var LiftCollection = EntityRegistry.addCollection('Lift');

/**
 * LiftSystem is responsible for traversing the scene graph and
 *   updating the Transforms, Sizes, and Opacities of the entities.
 *
 * @class  LiftSystem
 * @system
 * @singleton
 */
var LiftSystem = {};

/**
 * update iterates over each of the Contexts that were registered and
 *   kicks of the recursive updating of their entities.
 *
 * @method update
 */
var test = [];
LiftSystem.update = function update() {
    var rootParams;
    var lift;
    var cleanup = [];

    LiftCollection.forEach(function(entity) {
        lift = entity.getComponent('LiftComponent');
        rootParams = lift._update();
        rootParams.unshift(entity);
        coreUpdateAndFeed.apply(null, rootParams);

        if (lift.done) cleanup.push(entity);
    });

    for (var i = 0; i < cleanup.length; i++) {
        cleanup[i].removeComponent('LiftComponent');
        EntityRegistry.deregister(cleanup[i], 'Lift');
    }
}

/**
 * coreUpdateAndFeed feeds parent information to an entity and so that
 *   each entity can update their transform, size, and opacity.  It 
 *   will then pass down invalidation states and values to any children.
 *
 * @method coreUpdateAndFeed
 * @private
 *   
 * @param  {Entity}  entity           Entity in the scene graph
 * @param  {Number}  transformReport  bitScheme report of transform invalidations
 * @param  {Array}   incomingMatrix   parent transform as a Float32 Array
 * @param  {Number}  sizeReport       bitScheme report of size invalidations
 * @param  {Array}   incomingSize     parent size in pixels
 * @param  {Boolean} opacityReport    boolean report of opacity invalidation
 * @param  {Number}  incomingOpacity  parent opacity
 */
function coreUpdateAndFeed(entity, transformReport, incomingMatrix, sizeReport, incomingSize, opacityReport, incomingOpacity) {
    if (!entity) return;
    var transform = entity.getComponent('transform');
    var size      = entity.getComponent('size');
    var opacity   = entity.getComponent('opacity');
    var children  = entity.getChildren();
    var i = children.length;

    transformReport = transform._update(transformReport, incomingMatrix);
    sizeReport      = size._update(sizeReport, incomingSize);
    opacityReport   = opacity._update(opacityReport, incomingOpacity);

    while (i--) 
        coreUpdateAndFeed(
            children[i],
            transformReport,
            transform._matrix,
            sizeReport,
            size._globalSize,
            opacityReport,
            opacity._globalOpacity);
}

module.exports = LiftSystem;

},{"../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\src\\examples\\rotationalSpring.js":[function(require,module,exports){
'use strict';
var Engine = require('famous/core/Engine');
var Surface = require('famous/core/Components/Surface');
var Particle = require('famous/physics/bodies/Particle');
var PhysicsSystem = require('famous/physics/PhysicsSystem');
var PhysicsComponent = require('famous/physics/PhysicsComponent');
var RotationalSpring = require('famous/physics/forces/RotationalSpring');

window.onload = function() {
    var context = Engine.createContext({hasCamera: true});

    var child = context.addChild();
    child.getComponent('size').setPixels(200, 200, 0);
    child.addComponent(Surface, {
        content: '<img src="./images/famous_logo.png"/>',
        properties: {
            textAlign:'center'
        }
    });
    var body = child.addComponent(PhysicsComponent).getBody();
    body.setAngularMomentum([0.9, 0.9, 0]);
    
    var anchor = new Particle({
        position: [0, 0, 0]
    });

    var torqueSpring = new RotationalSpring({
        period: 0.03,
        dampingRatio: 0, 
        anchor: [0,0,0]
    });
    PhysicsSystem.attach(torqueSpring, undefined, body);
}




},{"famous/core/Components/Surface":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Components\\Surface.js","famous/core/Engine":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\core\\Engine.js","famous/physics/PhysicsComponent":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\PhysicsComponent.js","famous/physics/PhysicsSystem":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\PhysicsSystem.js","famous/physics/bodies/Particle":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\bodies\\Particle.js","famous/physics/forces/RotationalSpring":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\node_modules\\famous\\physics\\forces\\RotationalSpring.js"}],"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\src\\index.js":[function(require,module,exports){
'use strict';
// var distance = require('./examples/distance');
// var spring = require('./examples/spring');
// var drag = require('./examples/drag');
// var dragQuadratic = require('./examples/dragQuadratic');
 //var gravity1D = require('./examples/gravity1D');
// var gravity3D = require('./examples/gravity3D');
 var rotationalSpring = require('./examples/rotationalSpring');
// var planeBoundary = require('./examples/planeBoundary');
// var collision = require('./examples/collision');
// var repulsion = require('./examples/repulsion');
 // var vortex = require('./examples/vortex');
// var morgan = require('./examples/morgan');


},{"./examples/rotationalSpring":"c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\src\\examples\\rotationalSpring.js"}]},{},["c:\\Users\\Morgan\\desktop\\famous\\mixed-mode-seed\\src\\index.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiLi5cXE1peGVkTW9kZVxcbm9kZV9tb2R1bGVzXFxjc3NpZnlcXGJyb3dzZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcY29yZVxcQ29tcG9uZW50c1xcQ2FtZXJhLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXENvbXBvbmVudHNcXENvbnRhaW5lci5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxjb3JlXFxDb21wb25lbnRzXFxPcGFjaXR5LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXENvbXBvbmVudHNcXFNpemUuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcY29yZVxcQ29tcG9uZW50c1xcU3VyZmFjZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxjb3JlXFxDb21wb25lbnRzXFxUYXJnZXQuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcY29yZVxcQ29tcG9uZW50c1xcVHJhbnNmb3JtLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXENvbnRleHQuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcY29yZVxcRW5naW5lLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXEVudGl0eS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxjb3JlXFxFbnRpdHlDb2xsZWN0aW9uLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXEVudGl0eVJlZ2lzdHJ5LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXE9wdGlvbnNNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXFJlbmRlcmVyc1xcRE9NcmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcY29yZVxcUmVuZGVyZXJzXFxFbGVtZW50QWxsb2NhdG9yLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXFJlbmRlcmVyc1xcV2ViR0xSZW5kZXJlci5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxjb3JlXFxTdHlsZXNoZWV0XFxmYW1vdXMuY3NzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXFN5c3RlbXNcXEJlaGF2aW9yU3lzdGVtLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXFN5c3RlbXNcXENvcmVTeXN0ZW0uanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcY29yZVxcU3lzdGVtc1xcUmVuZGVyU3lzdGVtLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXGNvcmVcXFN5c3RlbXNcXFRpbWVTeXN0ZW0uanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcZXZlbnRzXFxFdmVudEVtaXR0ZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcZXZlbnRzXFxFdmVudEhhbmRsZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcZ2xcXEJ1ZmZlci5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxnbFxcR2VvbWV0cnkuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcZ2xcXFNoYWRlci5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxnbFxcVGV4dHVyZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxtYXRoXFw0eDRtYXRyaXguanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcbWF0aFxcTWF0MzMuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcbWF0aFxcUXVhdGVybmlvbi5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxtYXRoXFxWZWMzLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHBoeXNpY3NcXFBoeXNpY3NDb21wb25lbnQuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xccGh5c2ljc1xcUGh5c2ljc1N5c3RlbS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxwaHlzaWNzXFxib2RpZXNcXEJvZHkuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xccGh5c2ljc1xcYm9kaWVzXFxQYXJ0aWNsZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxwaHlzaWNzXFxjb25zdHJhaW50c1xcQ29uc3RyYWludC5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxwaHlzaWNzXFxmb3JjZXNcXEZvcmNlLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHBoeXNpY3NcXGZvcmNlc1xcUm90YXRpb25hbFNwcmluZy5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxwaHlzaWNzXFxmb3JjZXNcXFNwcmluZy5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxwaHlzaWNzXFxpbnRlZ3JhdG9yc1xcU3ltcGxlY3RpY0V1bGVyLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHRyYW5zaXRpb25zXFxMaWZ0U3lzdGVtLmpzIiwic3JjXFxleGFtcGxlc1xccm90YXRpb25hbFNwcmluZy5qcyIsInNyY1xcaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdRQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzcywgY3VzdG9tRG9jdW1lbnQpIHtcbiAgdmFyIGRvYyA9IGN1c3RvbURvY3VtZW50IHx8IGRvY3VtZW50O1xuICBpZiAoZG9jLmNyZWF0ZVN0eWxlU2hlZXQpIHtcbiAgICB2YXIgc2hlZXQgPSBkb2MuY3JlYXRlU3R5bGVTaGVldCgpXG4gICAgc2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICByZXR1cm4gc2hlZXQub3duZXJOb2RlO1xuICB9IGVsc2Uge1xuICAgIHZhciBoZWFkID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgICAgIHN0eWxlID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbiAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcblxuICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvYy5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICB9XG5cbiAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICByZXR1cm4gc3R5bGU7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmJ5VXJsID0gZnVuY3Rpb24odXJsKSB7XG4gIGlmIChkb2N1bWVudC5jcmVhdGVTdHlsZVNoZWV0KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVN0eWxlU2hlZXQodXJsKS5vd25lck5vZGU7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgICAgICBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuXG4gICAgbGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG4gICAgbGluay5ocmVmID0gdXJsO1xuXG4gICAgaGVhZC5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICByZXR1cm4gbGluaztcbiAgfVxufTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIE1hdHJpeE1hdGggICAgID0gcmVxdWlyZSgnLi4vLi4vbWF0aC80eDRtYXRyaXgnKTtcbnZhciBPcHRpb25zTWFuYWdlciA9IHJlcXVpcmUoJy4uL09wdGlvbnNNYW5hZ2VyJyk7XG5cbi8vIENPTlNUU1xudmFyIENPTVBPTkVOVF9OQU1FID0gJ2NhbWVyYSc7XG52YXIgUFJPSkVDVElPTiAgICAgPSAncHJvamVjdGlvbic7XG5cbnZhciBNYWluQ2FtZXJhICAgICA9IG51bGw7XG5cbi8qKlxuICogQ2FtZXJhXG4gKlxuICogQGNvbXBvbmVudCBDYW1lcmFcbiAqIEBjb25zdHJ1Y3RvclxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gW2VudGl0eV0gIEVudGl0eSB0aGF0IHRoZSBDb250YWluZXIgaXMgYSBjb21wb25lbnQgb2ZcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQW4gb2JqZWN0IG9mIGNvbmZpZ3VyYWJsZSBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMudHlwZT0ncGluaG9sZSddIFRoZSBwcm9qZWN0aW9uIG1vZGVsIHVzZWQgaW4gdGhlIGdlbmVyYXRpb24gb2YgY2FtZXJhJ3MgcHJvamVjdGlvbiBtYXRyaXgsIGlkZW50aWZpZWQgYnkgc3RyaW5nLiBDYW4gYmUgZWl0aGVyICdwZXJzcGVjdGl2ZScsIG9yICdwaW5ob2xlJy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wcm9qZWN0aW9uXSBBIHN1Yi1vYmplY3Qgb2Ygb3B0aW9ucyByZXNwb25zaWJsZSBmb3IgY29uZmlndXJpbmcgcHJvamVjdGlvbi4gVGhlc2Ugb3B0aW9ucyB2YXJ5XG4gKiBAcGFyYW0ge0FycmF5IHwgTnVtYmVyIDFEIHwgVmVjdG9yIDN9ICBbb3B0aW9ucy5wcm9qZWN0aW9uLmZvY2FsUG9pbnQ9WzAsIDAsIDBdXSAgU3BlY2lmaWVzIHRoZSBmb2NhbCBwb2ludCBmb3IgcGluaG9sZSBwcm9qZWN0aW9uLiBUaGUgZmlyc3QgdHdvIG51bWJlcnMgZGV0ZXJtaW5lIHRoZSB4IGFuZCB5IG9mIHRoZSB2YW5pc2hpbmcgcG9pbnQsIGFuZCB0aGUgdGhpcmQgZGV0ZXJtaW5lcyB0aGUgZGlzdGFuY2Ugb2YgdGhlIGNhbWVyYSdzIFwiZXllXCIgdG8gdGhlIG1hdGhlbWF0aWNhbCB4eSBwbGFuZSBvZiB5b3VyIHNjZW5lLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnByb2plY3Rpb24ubmVhclBsYW5lPTBdICBTcGVjaWZpZXMgdGhlIG5lYXIgYm91bmQgb2YgdGhlIHZpZXdpbmcgdm9sdW1lIGZvciBwZXJzcGVjdGl2ZSBwcm9qZWN0aW9uLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnByb2plY3Rpb24uZmFyUGxhbmU9MF0gIFNwZWNpZmllcyB0aGUgZmFyIGJvdW5kIG9mIHRoZSB2aWV3aW5nIHZvbHVtZSBmb3IgcGVyc3BlY3RpdmUgcHJvamVjdGlvbi5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5wcm9qZWN0aW9uLmZpZWxkT2ZWaWV3PVBJLzRdICBTcGVjaWZpZXMgdGhlIGZpZWxkIG9mIHZpZXcgZm9yIHBlcnNwZWN0aXZlIHByb2plY3Rpb24gKGluIHJhZGlhbnMpLlxuICovXG5mdW5jdGlvbiBDYW1lcmEoZW50aXR5LCBvcHRpb25zKSB7XG4gICAgdGhpcy5fZW50aXR5ICAgICAgICAgICAgICA9IGVudGl0eTtcblxuICAgIHRoaXMuX3Byb2plY3Rpb25UcmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG5cbiAgICB0aGlzLm9wdGlvbnMgICAgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZShDYW1lcmEuREVGQVVMVF9PUFRJT05TKTtcbiAgICB0aGlzLl9vcHRpb25zTWFuYWdlciAgICAgID0gbmV3IE9wdGlvbnNNYW5hZ2VyKHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5fb3B0aW9uc01hbmFnZXIub24oJ2NoYW5nZScsIF9ldmVudHNDaGFuZ2UuYmluZCh0aGlzKSk7IC8vcm9idXN0IGludGVncmF0aW9uXG5cbiAgICBpZiAob3B0aW9ucykgdGhpcy5zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgX3JlY2FsY3VsYXRlUHJvamVjdGlvblRyYW5zZm9ybS5jYWxsKHRoaXMpO1xufVxuXG5DYW1lcmEuREVGQVVMVF9QSU5IT0xFX09QVElPTlMgPSB7XG4gICAgZm9jYWxQb2ludDogWzAsIDAsIDBdXG59O1xuXG5DYW1lcmEuREVGQVVMVF9QRVJTUEVDVElWRV9PUFRJT05TID0ge1xuICAgIG5lYXJQbGFuZTogMCxcbiAgICBmYXJQbGFuZTogMCxcbiAgICBmaWVsZE9mVmlldzogMC43ODUzOTgxNjMzOSAvLyBQSS80IHwgNDUgZGVncmVlc1xufTtcblxuQ2FtZXJhLkRFRkFVTFRfT1BUSU9OUyA9IHtcbiAgICB0eXBlICAgIDogJ3BpbmhvbGUnLFxuICAgIHByb2plY3Rpb24gOiBDYW1lcmEuREVGQVVMVF9QSU5IT0xFX09QVElPTlNcbn07XG5cbkNhbWVyYS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBDT01QT05FTlRfTkFNRTtcbn07XG5cbkNhbWVyYS5nZXRNYWluQ2FtZXJhID0gZnVuY3Rpb24gZ2V0TWFpbkNhbWVyYSgpIHtcbiAgICByZXR1cm4gTWFpbkNhbWVyYTtcbn07XG5cbkNhbWVyYS5wcm9qZWN0aW9uVHJhbnNmb3JtcyA9IHt9O1xuXG5DYW1lcmEucHJvamVjdGlvblRyYW5zZm9ybXMucGluaG9sZSA9IGZ1bmN0aW9uIHBpbmhvbGUodHJhbnNmb3JtLCBvcHRpb25zKSB7XG4gICAgdmFyIGZvY2FsVmVjdG9yID0gb3B0aW9ucy5mb2NhbFBvaW50O1xuICAgIHZhciBmb2NhbERpdmlkZSA9IGZvY2FsVmVjdG9yWzJdID8gMS9mb2NhbFZlY3RvclsyXSA6IDA7XG5cbiAgICB0cmFuc2Zvcm1bMF0gID0gMTtcbiAgICB0cmFuc2Zvcm1bMV0gID0gMDtcbiAgICB0cmFuc2Zvcm1bMl0gID0gMDtcbiAgICB0cmFuc2Zvcm1bM10gID0gMDtcbiAgICBcbiAgICB0cmFuc2Zvcm1bNF0gID0gMDtcbiAgICB0cmFuc2Zvcm1bNV0gID0gMTtcbiAgICB0cmFuc2Zvcm1bNl0gID0gMDtcbiAgICB0cmFuc2Zvcm1bN10gID0gMDtcbiAgIFxuICAgIHRyYW5zZm9ybVs4XSAgPSAtZm9jYWxEaXZpZGUgKiBmb2NhbFZlY3RvclswXTtcbiAgICB0cmFuc2Zvcm1bOV0gID0gLWZvY2FsRGl2aWRlICogZm9jYWxWZWN0b3JbMV07XG4gICAgdHJhbnNmb3JtWzEwXSA9IGZvY2FsRGl2aWRlO1xuICAgIHRyYW5zZm9ybVsxMV0gPSAtZm9jYWxEaXZpZGU7XG4gICAgXG4gICAgdHJhbnNmb3JtWzEyXSA9IDA7XG4gICAgdHJhbnNmb3JtWzEzXSA9IDA7XG4gICAgdHJhbnNmb3JtWzE0XSA9IDA7XG4gICAgdHJhbnNmb3JtWzE1XSA9IDE7XG5cbiAgICByZXR1cm4gdHJhbnNmb3JtO1xufTtcblxuQ2FtZXJhLnByb2plY3Rpb25UcmFuc2Zvcm1zLnBlcnNwZWN0aXZlID0gZnVuY3Rpb24gcGVyc3BlY3RpdmUodHJhbnNmb3JtLCBvcHRpb25zKSB7XG4gICAgdmFyIG5lYXIgPSBvcHRpb25zLm5lYXJQbGFuZTtcbiAgICB2YXIgZmFyICA9IG9wdGlvbnMuZmFyUGxhbmU7XG4gICAgdmFyIGZvdnkgPSBvcHRpb25zLmZpZWxkT2ZWaWV3O1xuXG4gICAgdmFyIGYgID0gMSAvIE1hdGgudGFuKGZvdnkgLyAyKTtcbiAgICB2YXIgbmYgPSAobmVhciAmJiBmYXIpID8gMSAvIChuZWFyIC0gZmFyKSA6IDA7XG5cbiAgICB0cmFuc2Zvcm1bMF0gID0gZjtcbiAgICB0cmFuc2Zvcm1bMV0gID0gMDtcbiAgICB0cmFuc2Zvcm1bMl0gID0gMDtcbiAgICB0cmFuc2Zvcm1bM10gID0gMDtcblxuICAgIHRyYW5zZm9ybVs0XSAgPSAwO1xuICAgIHRyYW5zZm9ybVs1XSAgPSBmO1xuICAgIHRyYW5zZm9ybVs2XSAgPSAwO1xuICAgIHRyYW5zZm9ybVs3XSAgPSAwO1xuXG4gICAgdHJhbnNmb3JtWzhdICA9IDA7XG4gICAgdHJhbnNmb3JtWzldICA9IDA7XG4gICAgdHJhbnNmb3JtWzEwXSA9IChmYXIgKyBuZWFyKSAqIG5mO1xuICAgIHRyYW5zZm9ybVsxMV0gPSAtMTtcblxuICAgIHRyYW5zZm9ybVsxMl0gPSAwO1xuICAgIHRyYW5zZm9ybVsxM10gPSAwO1xuICAgIHRyYW5zZm9ybVsxNF0gPSAoMiAqIGZhciAqIG5lYXIpICogbmY7XG4gICAgdHJhbnNmb3JtWzE1XSA9IDA7XG5cbiAgICByZXR1cm4gdHJhbnNmb3JtO1xufTtcblxuZnVuY3Rpb24gX2V2ZW50c0NoYW5nZShkYXRhKSB7XG4gICAgaWYgKGRhdGEuaWQgPT09IFBST0pFQ1RJT04pIHtcbiAgICAgICAgX3JlY2FsY3VsYXRlUHJvamVjdGlvblRyYW5zZm9ybS5jYWxsKHRoaXMpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gX3JlY2FsY3VsYXRlUHJvamVjdGlvblRyYW5zZm9ybSgpIHtcbiAgICByZXR1cm4gQ2FtZXJhLnByb2plY3Rpb25UcmFuc2Zvcm1zW3RoaXMub3B0aW9ucy50eXBlXSh0aGlzLl9wcm9qZWN0aW9uVHJhbnNmb3JtLCB0aGlzLm9wdGlvbnMucHJvamVjdGlvbik7XG59XG5cbkNhbWVyYS5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLl9vcHRpb25zTWFuYWdlci5zZXRPcHRpb25zKG9wdGlvbnMpO1xufTtcblxuQ2FtZXJhLnByb3RvdHlwZS5nZXRPcHRpb25zID0gZnVuY3Rpb24gZ2V0T3B0aW9ucygpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBDYW1lcmEncyBjdXJyZW50IHByb2plY3Rpb24gdHJhbnNmb3JtLlxuICpcbiAqIEBtZXRob2QgZ2V0UHJvamVjdGlvblRyYW5zZm9ybVxuICogQGNoYWluYWJsZVxuICpcbiAqIEByZXR1cm4ge0FycmF5IHwgMUQgTm1iZXJ8IFRyYW5zZm9ybX1cbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5nZXRQcm9qZWN0aW9uVHJhbnNmb3JtID0gZnVuY3Rpb24gZ2V0UHJvamVjdGlvblRyYW5zZm9ybSgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvamVjdGlvblRyYW5zZm9ybTtcbn07XG5cblxuQ2FtZXJhLnByb3RvdHlwZS5zZXRQZXJzcGVjdGl2ZSA9IGZ1bmN0aW9uIHNldFBlcnNwZWN0aXZlKGZvY2FsRGVwdGgpIHtcbiAgICAvL0lzIHRoZXJlIGEgbGVzcyBnYXJiYWdlLXkgd2F5IHRvIGRvIHRoaXM/ICh5ZXMpIElzIGl0IGV2ZW4gZGVzaXJhYmxlPyAoYWxpYXNpbmcgYWxsb3dzIGZvciBvbmUgc291cmNlIG9mIGxvZ2ljKVxuICAgIHRoaXMuc2V0T3B0aW9ucyh7XG4gICAgICAgIHR5cGU6ICdwaW5ob2xlJyxcbiAgICAgICAgcHJvamVjdGlvbjoge1xuICAgICAgICAgICAgICAgIGZvY2FsUG9pbnQ6IFswLCAwLCBmb2NhbERlcHRoXVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbkNhbWVyYS5wcm90b3R5cGUuc2V0TWFpbkNhbWVyYSA9IGZ1bmN0aW9uIHNldE1haW5DYW1lcmEoKSB7XG4gICAgTWFpbkNhbWVyYSA9IHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbWVyYTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vRW50aXR5UmVnaXN0cnknKTtcbnZhciBNYXRyaXhNYXRoICAgICA9IHJlcXVpcmUoJy4uLy4uL21hdGgvNHg0bWF0cml4Jyk7XG52YXIgRXZlbnRIYW5kbGVyICAgPSByZXF1aXJlKCcuLi8uLi9ldmVudHMvRXZlbnRIYW5kbGVyJyk7XG52YXIgVGFyZ2V0ICAgPSByZXF1aXJlKCcuL1RhcmdldCcpO1xudmFyIEdMICAgPSByZXF1aXJlKCcuLi9SZW5kZXJlcnMvV2ViR0xSZW5kZXJlcicpO1xuXG4vLyBDb25zdHNcbnZhciBDT05UQUlORVIgPSAnY29udGFpbmVyJztcblxuLyoqXG4gKiBDb250YWluZXIgaXMgYSBjb21wb25lbnQgdGhhdCBjYW4gYmUgYWRkZWQgdG8gYW4gRW50aXR5IHRoYXRcbiAqICAgaXMgcmVwcmVzZW50ZWQgYnkgYSBET00gbm9kZSB0aHJvdWdoIHdoaWNoIG90aGVyIHJlbmRlcmFibGVzXG4gKiAgIGluIHRoZSBzY2VuZSBncmFwaCBjYW4gYmUgZHJhd24gaW5zaWRlIG9mLlxuICpcbiAqIEBjbGFzcyBDb250YWluZXJcbiAqIEBjb21wb25lbnRcbiAqIEBjb25zdHJ1Y3RvclxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5ICBFbnRpdHkgdGhhdCB0aGUgQ29udGFpbmVyIGlzIGEgY29tcG9uZW50IG9mXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIENvbnRhaW5lcihlbnRpdHlJRCwgb3B0aW9ucykge1xuICAgIHRoaXMuZ2wgPSBHTC5pbml0KG9wdGlvbnMpO1xuXG4gICAgVGFyZ2V0LmNhbGwodGhpcywgZW50aXR5SUQsIHtcbiAgICAgICAgdmVydGljaWVzOiBbbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pXVxuICAgIH0pO1xuXG4gICAgdmFyIGVudGl0eSA9IHRoaXMuZ2V0RW50aXR5KCk7XG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIoZW50aXR5LCAnSGFzQ29udGFpbmVyJyk7XG5cbiAgICB0aGlzLl9jb250YWluZXIgICAgID0gb3B0aW9ucy5jb250YWluZXI7XG4gICAgdmFyIHRyYW5zZm9ybSAgICAgICA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3RyYW5zZm9ybScpO1xuICAgIHRoaXMuX2ludmVyc2VNYXRyaXggPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG4gICAgdGhpcy5fc2l6ZSAgICAgICAgICA9IG9wdGlvbnMuc2l6ZSB8fCBlbnRpdHkuZ2V0Q29udGV4dCgpLl9zaXplLnNsaWNlKCk7XG4gICAgdGhpcy5vcmlnaW4gICAgICAgICA9IFswLjUsIDAuNV07XG5cbiAgICB0aGlzLl9ldmVudE91dHB1dCA9IG5ldyBFdmVudEhhbmRsZXIoKTtcbiAgICB0aGlzLl9ldmVudE91dHB1dC5iaW5kVGhpcyh0aGlzKTtcblxuICAgIHRoaXMuX2V2ZW50cyA9IHtcbiAgICAgICAgZXZlbnRGb3J3YXJkZXI6IGZ1bmN0aW9uIGV2ZW50Rm9yd2FyZGVyKGV2ZW50KSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoZXZlbnQudHlwZSwgZXZlbnQpO1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpLFxuICAgICAgICBvbiAgICA6IFtdLFxuICAgICAgICBvZmYgICA6IFtdLFxuICAgICAgICBkaXJ0eSA6IGZhbHNlXG4gICAgfTtcblxuICAgIHRoaXMuX3RyYW5zZm9ybURpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl9zaXplRGlydHkgICAgICA9IHRydWU7XG5cbiAgICAvLyBJbnZlcnNlcyB0aGUgQ29udGFpbmVyJ3MgdHJhbnNmb3JtIG1hdHJpeCB0byBoYXZlIGVsZW1lbnRzIG5lc3RlZCBpbnNpZGVcbiAgICAvLyB0byBhcHBlYXIgaW4gd29ybGQgc3BhY2UuXG4gICAgdHJhbnNmb3JtLm9uKCdpbnZhbGlkYXRlZCcsIGZ1bmN0aW9uKHJlcG9ydCkge1xuICAgICAgICBNYXRyaXhNYXRoLmludmVydCh0aGlzLl9pbnZlcnNlTWF0cml4LCB0cmFuc2Zvcm0uX21hdHJpeCk7XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybURpcnR5ID0gdHJ1ZTtcbiAgICB9LmJpbmQodGhpcykpO1xufVxuXG5Db250YWluZXIudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gQ09OVEFJTkVSO1xufTtcblxuXG5Db250YWluZXIucHJvdG90eXBlICAgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZShUYXJnZXQucHJvdG90eXBlKTtcbkNvbnRhaW5lci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb250YWluZXI7XG5cbi8qKlxuICogQmluZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGFuIGV2ZW50IHR5cGUgaGFuZGxlZCBieSB0aGlzIG9iamVjdCdzXG4gKiAgRXZlbnRIYW5kbGVyLlxuICpcbiAqIEBtZXRob2Qgb25cbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjbGljaycpXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHN0cmluZywgT2JqZWN0KX0gaGFuZGxlciBjYWxsYmFja1xuICovXG5Db250YWluZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZlbnQsIGNiKSB7XG4gICAgaWYgKHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycgJiYgY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB0aGlzLl9ldmVudE91dHB1dC5vbihldmVudCwgY2IpO1xuICAgICAgICBpZiAodGhpcy5fZXZlbnRzLm9uLmluZGV4T2YoZXZlbnQpIDwgMCkge1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRzLm9uLnB1c2goZXZlbnQpO1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRzLmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLl9ldmVudHMub2ZmLmluZGV4T2YoZXZlbnQpO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkgdGhpcy5fZXZlbnRzLm9mZi5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ29uIHRha2VzIGFuIGV2ZW50IG5hbWUgYXMgYSBzdHJpbmcgYW5kIGEgY2FsbGJhY2sgdG8gYmUgZmlyZWQgd2hlbiB0aGF0IGV2ZW50IGlzIHJlY2VpdmVkJyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhIGZ1bmN0aW9uIHRvIGEgcGFydGljdWxhciBldmVudCBvY2N1cmluZy5cbiAqXG4gKiBAbWV0aG9kICBvZmZcbiAqIEBjaGFpbmFibGVcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IG5hbWUgb2YgdGhlIGV2ZW50IHRvIGNhbGwgdGhlIGZ1bmN0aW9uIHdoZW4gb2NjdXJpbmdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBldmVudCBpcyByZWNpZXZlZC5cbiAqL1xuQ29udGFpbmVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiBvZmYoZXZlbnQsIGNiKSB7XG4gICAgaWYgKHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycgJiYgY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLl9ldmVudHMub24uaW5kZXhPZihldmVudCk7XG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9ldmVudE91dHB1dC5yZW1vdmVMaXN0ZW5lcihldmVudCwgY2IpO1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRzLm9uLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB0aGlzLl9ldmVudHMub2ZmLnB1c2goZXZlbnQpO1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRzLmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ29mZiB0YWtlcyBhbiBldmVudCBuYW1lIGFzIGEgc3RyaW5nIGFuZCBhIGNhbGxiYWNrIHRvIGJlIGZpcmVkIHdoZW4gdGhhdCBldmVudCBpcyByZWNlaXZlZCcpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgZXZlbnQgaGFuZGxlciBvYmplY3QgdG8gdGhlIEV2ZW50SGFuZGxlcidzIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKlxuICogQG1ldGhvZCBwaXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCBldmVudCBoYW5kbGVyIHRhcmdldCBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcGFzc2VkIGV2ZW50IGhhbmRsZXJcbiAqL1xuQ29udGFpbmVyLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gcGlwZSh0YXJnZXQpIHtcbiAgICB2YXIgcmVzdWx0ID0gdGhpcy5fZXZlbnRPdXRwdXQucGlwZSh0YXJnZXQpO1xuICAgIGZvciAodmFyIGV2ZW50IGluIHRoaXMuX2V2ZW50T3V0cHV0Lmxpc3RlbmVycykge1xuICAgICAgICBpZiAodGhpcy5fZXZlbnRzLm9uLmluZGV4T2YoZXZlbnQpIDwgMCkge1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRzLm9uLnB1c2goZXZlbnQpO1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRzLmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuIC8qKlxuICogUmVtb3ZlIGhhbmRsZXIgb2JqZWN0IGZyb20gdGhlIEV2ZW50SGFuZGxlcidzIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKiAgIFVuZG9lcyB3b3JrIG9mIFwicGlwZVwiLlxuICpcbiAqIEBtZXRob2QgdW5waXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCB0YXJnZXQgaGFuZGxlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcHJvdmlkZWQgdGFyZ2V0XG4gKi9cbkNvbnRhaW5lci5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24gdW5waXBlKHRhcmdldCkge1xuICAgIHJldHVybiB0aGlzLl9ldmVudE91dHB1dC51bnBpcGUodGFyZ2V0KTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciBhbiBldmVudCwgc2VuZGluZyB0byBhbGwgb2YgdGhlIEV2ZW5ldEhhbmRsZXIncyBcbiAqICBkb3duc3RyZWFtIGhhbmRsZXJzIGxpc3RlbmluZyBmb3IgcHJvdmlkZWQgJ3R5cGUnIGtleS5cbiAqXG4gKiBAbWV0aG9kIGVtaXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjbGljaycpXG4gKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgZXZlbnQgZGF0YVxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSB0aGlzXG4gKi9cbkNvbnRhaW5lci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQodHlwZSwgZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQgJiYgIWV2ZW50Lm9yaWdpbikgZXZlbnQub3JpZ2luID0gdGhpcztcbiAgICB2YXIgaGFuZGxlZCA9IHRoaXMuX2V2ZW50T3V0cHV0LmVtaXQodHlwZSwgZXZlbnQpO1xuICAgIGlmIChoYW5kbGVkICYmIGV2ZW50ICYmIGV2ZW50LnN0b3BQcm9wYWdhdGlvbikgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgcmV0dXJuIGhhbmRsZWQ7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgZGlzcGxheSBtYXRyaXggb2YgdGhlIENvbnRhaW5lci5cbiAqXG4gKiBAbWV0aG9kIGdldERpc3BsYXlNYXRyaXhcbiAqIFxuICogQHJldHVybiB7QXJyYXl9IGRpc3BsYXkgbWF0cml4IG9mIHRoZSBDb250YWluZXJcbiAqL1xuQ29udGFpbmVyLnByb3RvdHlwZS5nZXREaXNwbGF5TWF0cml4ID0gZnVuY3Rpb24gZ2V0RGlzcGxheU1hdHJpeCgpIHtcbiAgICByZXR1cm4gdGhpcy5faW52ZXJzZU1hdHJpeDtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzaXplIG9mIHRoZSBDb250YWluZXIuXG4gKlxuICogQG1ldGhvZCBzZXRTaXplXG4gKiBAY2hhaW5hYmxlXG4gKiBcbiAqIEByZXR1cm4ge0FycmF5fSAyIGRpbWVuc2lvbmFsIGFycmF5IG9mIHJlcHJlc2VudGluZyB0aGUgc2l6ZSBvZiB0aGUgQ29udGFpbmVyXG4gKi9cbkNvbnRhaW5lci5wcm90b3R5cGUuc2V0Q1NTU2l6ZSA9IGZ1bmN0aW9uIHNldENTU1NpemUod2lkdGgsIGhlaWdodCkge1xuICAgIHRoaXMuX3NpemVbMF0gICA9IHdpZHRoO1xuICAgIHRoaXMuX3NpemVbMV0gICA9IGhlaWdodDtcbiAgICB0aGlzLl9zaXplRGlydHkgPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuQ29udGFpbmVyLnByb3RvdHlwZS5nZXRDU1NTaXplID0gZnVuY3Rpb24gZ2V0Q1NTU2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbn07XG5cblxuQ29udGFpbmVyLnByb3RvdHlwZS5fc2V0VmVydGV4RGlzcGxhY2VtZW50ID0gZnVuY3Rpb24gX3NldFZlcnRleERpc3BsYWNlbWVudCAoeCwgeSkge1xuICAgIHZhciB5T3JpZ2luT2Zmc2V0ID0gdGhpcy5vcmlnaW5bMV0gKiB5LFxuICAgICAgICB4T3JpZ2luT2Zmc2V0ID0gdGhpcy5vcmlnaW5bMF0gKiB4O1xuXG4gICAgdGhpcy52ZXJ0aWNpZXNbMF1bMF0gPSAwIC0geE9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1swXVsxXSA9IDAgLSB5T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzFdWzBdID0geCAtIHhPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMV1bMV0gPSAwIC0geU9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1syXVswXSA9IHggLSB4T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzJdWzFdID0geSAtIHlPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbM11bMF0gPSAwIC0geE9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1szXVsxXSA9IHkgLSB5T3JpZ2luT2Zmc2V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250YWluZXI7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuLi8uLi9ldmVudHMvRXZlbnRFbWl0dGVyJyk7XG5cbi8qKlxuICogT3BhY2l0eSBkZXRlcm1pbmVzIHdoYXQgdGhlIE9wYWNpdHkgb2YgZXZlcnl0aGluZyBiZWxvdyBpdCBpbiB0aGVcbiAqICAgc2NlbmUgZ3JhcGggc2hvdWxkIGJlLlxuICpcbiAqIEBjbGFzcyBPcGFjaXR5XG4gKiBAY29tcG9uZW50XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gT3BhY2l0eShlbnRpdHlJZCwgb3B0aW9ucykge1xuICAgIHRoaXMuX2xvY2FsT3BhY2l0eSAgPSAxO1xuICAgIHRoaXMuX2dsb2JhbE9wYWNpdHkgPSAxO1xuICAgIHRoaXMuX3VwZGF0ZUZOICAgICAgPSBudWxsO1xuICAgIHRoaXMuX2ludmFsaWRhdGVkICAgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudEhhbmRsZXIgID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIHRoaXMuX2VudGl0eUlkICAgICAgPSBlbnRpdHlJZDtcblxuICAgIHRoaXMuX211dGF0b3IgPSB7XG4gICAgICAgIHNldDogdGhpcy5zZXQuYmluZCh0aGlzKSxcbiAgICAgICAgb3BhY2l0YXRlOiB0aGlzLm9wYWNpdGF0ZS5iaW5kKHRoaXMpXG4gICAgfTtcbn1cblxudmFyIE9QQUNJVFkgPSAnb3BhY2l0eSc7XG5PcGFjaXR5LnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7IHJldHVybiBPUEFDSVRZIH07XG5cbi8qKlxuICogU2V0IHdpbGwgdXBkYXRlIHRoZSBsb2NhbCBvcGFjaXR5IGFuZCBpbnZhbGlkYXRlIGl0XG4gKlxuICogQG1ldGhvZCAgc2V0XG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBvcGFjaXR5IG5ldyBvcGFjaXR5IHZhbHVlIGZvciB0aGlzIEVudGl0eVxuICovXG5PcGFjaXR5LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQob3BhY2l0eSkge1xuICAgIHRoaXMuX2ludmFsaWRhdGVkICA9IHRydWU7XG4gICAgdGhpcy5fbG9jYWxPcGFjaXR5ID0gb3BhY2l0eTtcbn07XG5cbi8qKlxuICogQWRkaXRpdmUgdmVyc2lvbiBvZiBzZXQuICBBbHNvIG1hcmtzIHRoZSBPcGFjaXR5IGFzIGludmFsaWRhdGVkLlxuICpcbiAqIEBtZXRob2QgIG9wYWNpdGF0ZVxuICogXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGRpZmZlcmVudGlhbCBkaWZmZXJlbnRpYWwgdG8gYXBwbHkgdG8gdGhlIGN1cnJlY3Qgb3BhY2l0eSB2YWx1ZVxuICovXG5PcGFjaXR5LnByb3RvdHlwZS5vcGFjaXRhdGUgPSBmdW5jdGlvbiBvcGFjaXRhdGUoZGlmZmVyZW50aWFsKSB7XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgID0gdHJ1ZTtcbiAgICB0aGlzLl9sb2NhbE9wYWNpdHkgKz0gZGlmZmVyZW50aWFsO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHdoYXQgdGhlIGdsb2JhbCBvcGFjaXR5IGlzIGF0IHRoaXMgcGFydCBvZiB0aGUgc2NlbmUgZ3JhcGguICBHbG9iYWxcbiAqICAgaXMgdGhlIHJlc3VsdCBvZiBtdWx0aXBseWluZyB0aGUgcGFyZW50J3Mgb3BhY2l0eSB3aXRoIHRoaXMgaW5zdGFuY2Unc1xuICogICBvcGFjaXR5LlxuICpcbiAqIEBtZXRob2QgZ2V0R2xvYmFsT3BhY2l0eVxuICogXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IEN1bXVsYXRpdmUgb3BhY2l0eSBhdCB0aGlzIHBvaW50IGluIHRoZSBzY2VuZSBncmFwaFxuICovXG5PcGFjaXR5LnByb3RvdHlwZS5nZXRHbG9iYWxPcGFjaXR5ID0gZnVuY3Rpb24gZ2V0R2xvYmFsT3BhY2l0eSgpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2xvYmFsT3BhY2l0eTtcbn07XG5cbi8qKlxuICogZ2V0TG9jYWxPcGFjaXR5IHJldHVybnMgdGhpcyBpbnN0YW5jZSdzIHNwZWNpZmllZCBvcGFjaXR5LlxuICpcbiAqIEBtZXRob2QgIGdldExvY2FsT3BhY2l0eVxuICogXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoaXMgaW5zdGFuY2UncyBzcGVjaWZpZWQgb3BhY2l0eVxuICovXG5PcGFjaXR5LnByb3RvdHlwZS5nZXRMb2NhbE9wYWNpdHkgPSBmdW5jdGlvbiBnZXRMb2NhbE9wYWNpdHkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xvY2FsT3BhY2l0eTtcbn07XG5cbi8qKlxuICogRGVmaW5lIHdoZXJlIHRoZSBvcGFjaXR5IHdpbGwgYmUgZ2V0dGluZyBpdCdzIHNvdXJjZSBvZiB0cnV0aCBmcm9tLlxuICpcbiAqIEBtZXRob2QgIHVwZGF0ZUZyb21cbiAqIFxuICogQHBhcmFtICB7RnVuY3Rpb258VHJhbnNpdGlvbmFibGV8TnVtYmVyfSBwcm92aWRlciBzb3VyY2Ugb2Ygc3RhdGUgZm9yIHRoZSBPcGFjaXR5XG4gKi9cbk9wYWNpdHkucHJvdG90eXBlLnVwZGF0ZUZyb20gPSBmdW5jdGlvbiB1cGRhdGVGcm9tKHByb3ZpZGVyKSB7XG4gICAgaWYgKHByb3ZpZGVyIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRk4gPSBwcm92aWRlci5iaW5kKHRoaXMpO1xuICAgIH1cbiAgICBlbHNlIGlmIChwcm92aWRlci5nZXQgJiYgcHJvdmlkZXIuZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwcm92aWRlci5nZXQoKSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignT3BhY2l0eTogVHJhbnNpdGlvbmFibGVzIHBhc3NlZCB0byBvcGFjaXR5RnJvbSBtdXN0IHJldHVybiBOdW1iZXJzJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVGTiA9IGZ1bmN0aW9uKG9wYWNpdHkpIHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5LnNldChwcm92aWRlci5nZXQoKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAodHlwZW9mIHByb3ZpZGVyICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPcGFjaXR5OiBDb25zdGFudHMgcGFzc2VkIHRvIG9wYWNpdHlGcm9tIG11c3QgcmV0dXJuIE51bWJlcnMnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KHByb3ZpZGVyKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSB2YWx1ZXMgb2YgdGhlIE9wYWNpdHkgZ2l2ZW4gaW5mb3JtYXRpb24gYWJvdXQgaXQncyBwYXJlbnQuXG4gKlxuICogQG1ldGhvZCAgX3VwZGF0ZVxuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtICB7Qm9vbGVhbn0gcGFyZW50UmVwb3J0IGZsYWcgZGVub3Rpbmcgd2hldGhlciB0aGUgcGFyZW50IE9wYWNpdHkgd2FzIGludmFsaWRhdGVkXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHBhcmVudE9wYWNpdHkgdmFsdWUgb2YgdGhlIGdsb2JhbCBvcGFjaXR5IHVwIHRvIHRoaXMgcG9pbnQgaW4gdGhlIHNjZW5lIGdyYXBoXG4gKiBAcmV0dXJuIHtCb29sZWFufSBmbGFnIGRlbm90aW5nIGlmIHRoaXMgT3BhY2l0eSB3YXMgaW52YWxpZGF0ZWRcbiAqL1xuT3BhY2l0eS5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uIF91cGRhdGUocGFyZW50UmVwb3J0LCBwYXJlbnRPcGFjaXR5KSB7XG4gICAgaWYgKHBhcmVudFJlcG9ydCkgdGhpcy5faW52YWxpZGF0ZWQgPSB0cnVlO1xuICAgIGlmICh0aGlzLl91cGRhdGVGTikgdGhpcy5fdXBkYXRlRk4odGhpcy5fbXV0YXRvcik7XG5cbiAgICBpZiAocGFyZW50T3BhY2l0eSA9PSBudWxsKSBwYXJlbnRPcGFjaXR5ID0gMTtcblxuICAgIGlmICh0aGlzLl9pbnZhbGlkYXRlZCkge1xuICAgICAgICB0aGlzLl9nbG9iYWxPcGFjaXR5ID0gdGhpcy5fbG9jYWxPcGFjaXR5ICogcGFyZW50T3BhY2l0eTtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fZXZlbnRIYW5kbGVyLmVtaXQoJ2ludmFsaWRhdGVkJywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBmdW5jdGlvbnMgdG8gYmUgY2FsbGVkIG9uIG9wYWNpdHkgZXZlbnRzLlxuICpcbiAqIEBtZXRob2QgIG9uXG4gKi9cbk9wYWNpdHkucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oKSB7XG4gICAgdGhpcy5fZXZlbnRIYW5kbGVyLm9uLmFwcGx5KHRoaXMuX2V2ZW50SGFuZGxlciwgYXJndW1lbnRzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gT3BhY2l0eTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4uLy4uL2V2ZW50cy9FdmVudEVtaXR0ZXInKTtcblxuLyoqXG4gKiBTaXplIGlzIGEgY29tcG9uZW50IHRoYXQgaXMgcGFydCBvZiBldmVyeSBSZW5kZXJOb2RlLiAgSXQgaXNcbiAqICAgcmVzcG9uc2libGUgZm9yIHVwZGF0aW5nIGl0J3Mgb3duIG5vdGlvbiBvZiBzaXplIGFuZCBpbmNvcnBvcmF0aW5nXG4gKiAgIHRoYXQgd2l0aCBwYXJlbnQgaW5mb3JtYXRpb24uICBTaXplcyBhcmUgdGhyZWUgZGltZW5zaW9uYWwgYW5kIGNhbiBiZVxuICogICBkZWZpbmVkIGluIHRocmVlIHNlcGVyYXRlIG1hbm5lcnMuXG4gKiAgIFxuICogICAgICAgcGl4ZWw6IEFic29sdXRlIHBpeGVsIHNpemVcbiAqICAgICAgIHByb3BvcnRpb246IFBlcmNlbnQgb2YgdGhlIHBhcmVudCBvciBsb2NhbCBwaXhlbCBzaXplXG4gKiAgICAgICBkaWZmZXJlbnRpYWw6ICsvLSBhIGNlcnRhaW4gYW1vdW50IG9mIHBpeGVsc1xuICpcbiAqICBGb3IgZWFjaCBkaW1lbnNpb24sIFt4LCB5LCB6XSwgcGl4ZWwgc2l6ZSBpcyBjYWxjdWxhdGVkIGZpcnN0LCB0aGVuXG4gKiAgcHJvcG9ydGlvbnMgYXJlIGFwcGxpZWQsIGFuZCBmaW5hbGx5IGRpZmZlcmVudGlhbHMgYXJlIGFwcGxpZWQuICBTaXplc1xuICogIGdldCB0aGVpciBwYXJlbnQgaW5mb3JtYXRpb24gdmlhIHRoZSBDb3JlU3lzdGVtIHdoaWNoIHVzZXMgdGhlIHNjZW5lIFxuICogIGdyYXBoIGFzIGl0J3Mgc291cmNlIG9mIGhlaXJhcmNoeS5cbiAqXG4gKiBAY2xhc3MgU2l6ZVxuICogQGNvbXBvbmVudFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFNpemUoZW50aXR5SWQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9sb2NhbFBpeGVscyAgICAgICAgPSBbdm9pZCAwLCB2b2lkIDAsIHZvaWQgMF07XG4gICAgdGhpcy5fbG9jYWxQcm9wb3J0aW9ucyAgID0gWzEsIDEsIDFdO1xuICAgIHRoaXMuX2xvY2FsRGlmZmVyZW50aWFscyA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9nbG9iYWxTaXplICAgICAgICAgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fdXBkYXRlRk4gICAgICAgICAgID0gbnVsbDtcbiAgICB0aGlzLl9pbnZhbGlkYXRlZCAgICAgICAgPSAwO1xuICAgIHRoaXMuX2NhY2hlZENvbnRleHRTaXplICA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9ldmVudEhhbmRsZXIgICAgICAgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgdGhpcy5fZW50aXR5SWQgICAgICAgICAgID0gZW50aXR5SWQ7XG5cbiAgICB0aGlzLl9tdXRhdG9yID0ge1xuICAgICAgICBzZXRQaXhlbHM6IHRoaXMuc2V0UGl4ZWxzLmJpbmQodGhpcyksXG4gICAgICAgIHNldFByb3BvcnRpb25zOiB0aGlzLnNldFByb3BvcnRpb25zLmJpbmQodGhpcyksXG4gICAgICAgIHNldERpZmZlcmVudGlhbHM6IHRoaXMuc2V0RGlmZmVyZW50aWFscy5iaW5kKHRoaXMpXG4gICAgfTtcbn1cblxudmFyIFNJWkUgPSAnc2l6ZSc7XG5TaXplLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7cmV0dXJuIFNJWkU7fTtcblxuLyoqXG4gKiBEZWZpbmUgdGhlIHBpeGVsIHZhbHVlcyBmb3IgdGhlIHNpemUuICBJbnZhbGlkYXRlcyBjZXJ0YWluXG4gKiAgIGluZGljaWVzIHdoZW4gbmV3IHZhbHVlcyBhcmUgc3BlY2lmaWVkLlxuICpcbiAqIEBtZXRob2Qgc2V0UGl4ZWxzXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IHNpemUgaW4gcGl4ZWxzXG4gKiBAcGFyYW0ge051bWJlcn0geSBzaXplIGluIHBpeGVsc1xuICogQHBhcmFtIHtOdW1iZXJ9IHogc2l6ZSBpbiBwaXhlbHNcbiAqL1xuU2l6ZS5wcm90b3R5cGUuc2V0UGl4ZWxzID0gZnVuY3Rpb24gc2V0UGl4ZWxzKHgsIHksIHopIHtcbiAgICBpZiAoeCAhPT0gdGhpcy5fbG9jYWxQaXhlbHNbMF0gJiYgeCAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkIHw9IDE7XG4gICAgICAgIHRoaXMuX2xvY2FsUGl4ZWxzWzBdID0geDtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gdGhpcy5fbG9jYWxQaXhlbHNbMV0gJiYgeSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkIHw9IDI7XG4gICAgICAgIHRoaXMuX2xvY2FsUGl4ZWxzWzFdID0geTtcbiAgICB9XG4gICAgaWYgKHogIT09IHRoaXMuX2xvY2FsUGl4ZWxzWzJdICYmIHogIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCB8PSA0O1xuICAgICAgICB0aGlzLl9sb2NhbFBpeGVsc1syXSA9IHo7XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZWZpbmUgdGhlIHByb3BvcnRpb25hbCB2YWx1ZXMgZm9yIHRoZSBzaXplLiAgSW52YWxpZGF0ZXNcbiAqICAgY2VydGFpbiBpbmRpY2llcyB3aGVuIG5ldyB2YWx1ZXMgYXJlIHNwZWNpZmllZC5cbiAqXG4gKiBAbWV0aG9kIHNldFByb3BvcnRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IHNpemUgYXMgYSBwZXJjZW50YWdlIG9mIHRoZSBwYXJlbnRTaXplIG9yIGxvY2FsIHBpeGVsIHNpemVcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHNpemUgYXMgYSBwZXJjZW50YWdlIG9mIHRoZSBwYXJlbnRTaXplIG9yIGxvY2FsIHBpeGVsIHNpemVcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHNpemUgYXMgYSBwZXJjZW50YWdlIG9mIHRoZSBwYXJlbnRTaXplIG9yIGxvY2FsIHBpeGVsIHNpemVcbiAqL1xuU2l6ZS5wcm90b3R5cGUuc2V0UHJvcG9ydGlvbnMgPSBmdW5jdGlvbiBzZXRQcm9wb3J0aW9ucyh4LCB5LCB6KSB7XG4gICAgaWYgKHggIT09IHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMF0gJiYgeCAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkIHw9IDE7XG4gICAgICAgIHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMF0gPSB4O1xuICAgIH1cblxuICAgIGlmICh5ICE9PSB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzFdICYmIHkgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCB8PSAyO1xuICAgICAgICB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzFdID0geTtcbiAgICB9XG5cbiAgICBpZiAoeiAhPT0gdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1syXSAmJiB6ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgfD0gNDtcbiAgICAgICAgdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1syXSA9IHo7XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZWZpbmUgdGhlIHBpeGVsIGRpZmZlcmVudGlhbHMgZm9yIHRoZSBzaXplLiAgXG4gKiAgIEludmFsaWRhdGVzIGNlcnRhaW4gaW5kaWNpZXMgd2hlbiBuZXcgdmFsdWVzIGFyZSBzcGVjaWZpZWQuIFxuICpcbiAqIEBtZXRob2Qgc2V0RGlmZmVyZW50aWFsc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0geCBwaXhlbCBkaWZmZXJlbnRpYWxzIGluIHNpemVcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHBpeGVsIGRpZmZlcmVudGlhbHMgaW4gc2l6ZVxuICogQHBhcmFtIHtOdW1iZXJ9IHogcGl4ZWwgZGlmZmVyZW50aWFscyBpbiBzaXplXG4gKi9cblNpemUucHJvdG90eXBlLnNldERpZmZlcmVudGlhbHMgPSBmdW5jdGlvbiBzZXREaWZmZXJlbnRpYWxzKHgsIHksIHopIHtcbiAgICBpZiAoeCAhPT0gdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzBdICYmIHggIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCAgICAgICAgICB8PSAxO1xuICAgICAgICB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMF0gPSB4O1xuICAgIH1cblxuICAgIGlmICh5ICE9PSB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMV0gJiYgeSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkICAgICAgICAgIHw9IDI7XG4gICAgICAgIHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1sxXSA9IHk7XG4gICAgfVxuXG4gICAgaWYgKHogIT09IHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1syXSAmJiB6ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgICAgICAgICAgfD0gNDtcbiAgICAgICAgdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzJdID0gejtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgU2l6ZSdzIG5vdGlvbiBvZiB3aGF0IHRoZSBjdW11bGF0aXZlIGdsb2JhbCBzaXplIGlzLlxuICpcbiAqIEBtZXRob2QgIGdldEdsb2JhbFNpemVcbiAqIFxuICogQHJldHVybiB7QXJyYXl9IEFycmF5IHJlcHJlc2VudGluZyBzaXplIGluIHBpeGVsc1xuICovXG5TaXplLnByb3RvdHlwZS5nZXRHbG9iYWxTaXplID0gZnVuY3Rpb24gZ2V0R2xvYmFsU2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2xvYmFsU2l6ZTtcbn07XG5cbi8qKlxuICogRGVmaW5lIHRoZSBwcm92aWRlciBvZiBzdGF0ZSBmb3IgdGhlIFNpemUuXG4gKlxuICogQG1ldGhvZCAgc2l6ZUZyb21cbiAqIFxuICogQHBhcmFtICB7RnVuY3Rpb259IHByb3ZpZGVyIHNvdXJjZSBvZiBzdGF0ZSBmb3IgdGhlIFNpemVcbiAqL1xuU2l6ZS5wcm90b3R5cGUudXBkYXRlRnJvbSA9IGZ1bmN0aW9uIHVwZGF0ZUZyb20ocHJvdmlkZXIpIHtcbiAgICBpZiAocHJvdmlkZXIgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB0aGlzLl91cGRhdGVGTiA9IHByb3ZpZGVyO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTaXplOiB1cGRhdGVGcm9tIG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMnKVxuICAgIH1cbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgU2l6ZSdzIHZhbHVlcyBiYXNlZCBvbiB0aGUgcGFyZW50IGludmFsaWRhdGlvbnMsXG4gKiAgIHBhcmVudCBzaXplIChwaXhlbHMpLCBhbmQgcG9zc2libHkgY29udGV4dCBzaXplIChwaXhlbHMpLlxuICpcbiAqIEBtZXRob2QgX3VwZGF0ZVxuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtICB7TnVtYmVyfSBwYXJlbnRSZXBvcnQgYml0U2NoZW1lIGludmFsaWRhdGlvbnMgZm9yIHBhcmVudCBzaXplXG4gKiBAcGFyYW0gIHtBcnJheX0gcGFyZW50U2l6ZSBwYXJlbnQgc2l6ZSBpbiBwaXhlbHNcbiAqIEBwYXJhbSAge0FycmF5fSBjb250ZXh0U2l6ZSBjb250ZXh0IHNpemUgaW4gcGl4ZWxzXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGludmFsaWRhdGlvbnNcbiAqL1xuU2l6ZS5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uIF91cGRhdGUocGFyZW50UmVwb3J0LCBwYXJlbnRTaXplLCBjb250ZXh0U2l6ZSkge1xuICAgIGlmIChjb250ZXh0U2l6ZSkge1xuICAgICAgICBwYXJlbnRTaXplID0gY29udGV4dFNpemU7XG4gICAgICAgIHBhcmVudFJlcG9ydCA9IDA7XG4gICAgICAgIGlmIChwYXJlbnRTaXplWzBdICE9PSB0aGlzLl9jYWNoZWRDb250ZXh0U2l6ZVswXSkgcGFyZW50UmVwb3J0IHw9IDE7XG4gICAgICAgIGlmIChwYXJlbnRTaXplWzFdICE9PSB0aGlzLl9jYWNoZWRDb250ZXh0U2l6ZVsxXSkgcGFyZW50UmVwb3J0IHw9IDI7XG4gICAgICAgIGlmIChwYXJlbnRTaXplWzJdICE9PSB0aGlzLl9jYWNoZWRDb250ZXh0U2l6ZVsyXSkgcGFyZW50UmVwb3J0IHw9IDQ7XG4gICAgICAgIHRoaXMuX2NhY2hlZENvbnRleHRTaXplID0gY29udGV4dFNpemU7XG4gICAgfVxuXG4gICAgaWYgKHBhcmVudFJlcG9ydCkgdGhpcy5faW52YWxpZGF0ZWQgfD0gcGFyZW50UmVwb3J0O1xuICAgIGlmICh0aGlzLl91cGRhdGVGTikgdGhpcy5fdXBkYXRlRk4odGhpcy5fbXV0YXRvcik7XG5cbiAgICBpZiAodGhpcy5faW52YWxpZGF0ZWQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2ludmFsaWRhdGVkICYgMSkge1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVswXSAgPSB0aGlzLl9sb2NhbFBpeGVsc1swXSAhPT0gdW5kZWZpbmVkID8gdGhpcy5fbG9jYWxQaXhlbHNbMF0gOiBwYXJlbnRTaXplWzBdO1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVswXSAqPSB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzBdO1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVswXSArPSB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2ludmFsaWRhdGVkICYgMikge1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVsxXSAgPSB0aGlzLl9sb2NhbFBpeGVsc1sxXSAhPT0gdW5kZWZpbmVkID8gdGhpcy5fbG9jYWxQaXhlbHNbMV0gOiBwYXJlbnRTaXplWzFdO1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVsxXSAqPSB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzFdO1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVsxXSArPSB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2ludmFsaWRhdGVkICYgNCkge1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVsyXSAgPSB0aGlzLl9sb2NhbFBpeGVsc1syXSAhPT0gdW5kZWZpbmVkID8gdGhpcy5fbG9jYWxQaXhlbHNbMl0gOiBwYXJlbnRTaXplWzJdO1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVsyXSAqPSB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzJdO1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2l6ZVsyXSArPSB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMl07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaW52YWxpZGF0ZWQgPSB0aGlzLl9pbnZhbGlkYXRlZDtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgPSAwO1xuICAgICAgICBpZiAoaW52YWxpZGF0ZWQpIHRoaXMuX2V2ZW50SGFuZGxlci5lbWl0KCdpbnZhbGlkYXRlZCcsIGludmFsaWRhdGVkKTtcbiAgICAgICAgcmV0dXJuIGludmFsaWRhdGVkO1xuICAgIH1cblxuICAgIGVsc2UgcmV0dXJuIDA7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGZ1bmN0aW9ucyB0byBiZSBjYWxsZWQgb24gdGhlIFNpemUncyBldmVudHMuXG4gKlxuICogQG1ldGhvZCBvblxuICovXG5TaXplLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKCkge1xuICAgIHRoaXMuX2V2ZW50SGFuZGxlci5vbi5hcHBseSh0aGlzLl9ldmVudEhhbmRsZXIsIGFyZ3VtZW50cyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNpemU7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5JyksXG4gICAgVGFyZ2V0ICAgICAgICAgPSByZXF1aXJlKCcuL1RhcmdldCcpLFxuICAgIE1hdHJpeE1hdGggICAgID0gcmVxdWlyZSgnLi4vLi4vbWF0aC80eDRtYXRyaXgnKSxcbiAgICBFdmVudEhhbmRsZXIgICA9IHJlcXVpcmUoJy4uLy4uL2V2ZW50cy9FdmVudEhhbmRsZXInKTtcblxuLy8gQ09OU1RTXG52YXIgVFJBTlNGT1JNID0gJ3RyYW5zZm9ybSc7XG52YXIgU0laRSAgICAgID0gJ3NpemUnO1xudmFyIE9QQUNJVFkgICA9ICdvcGFjaXR5JztcbnZhciBTVVJGQUNFICAgPSAnc3VyZmFjZSc7XG5cbi8qKlxuICogU3VyZmFjZSBpcyBhIGNvbXBvbmVudCB0aGF0IGRlZmluZXMgdGhlIGRhdGEgdGhhdCBzaG91bGRcbiAqICAgYmUgZHJhd24gdG8gYW4gSFRNTEVsZW1lbnQuICBNYW5hZ2VzIENTUyBzdHlsZXMsIEhUTUwgYXR0cmlidXRlcyxcbiAqICAgY2xhc3NlcywgYW5kIGNvbnRlbnQuXG4gKlxuICogQGNsYXNzIFN1cmZhY2VcbiAqIEBjb21wb25lbnRcbiAqIEBjb25zdHJ1Y3RvclxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IHRoZSBTdXJmYWNlIGlzIGEgY29tcG9uZW50IG9mXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBpbnN0YW50aWF0aW9uIG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gU3VyZmFjZShlbnRpdHlJRCwgb3B0aW9ucykge1xuICAgIFRhcmdldC5jYWxsKHRoaXMsIGVudGl0eUlELCB7XG4gICAgICAgIHZlcnRpY2llczogW25ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKV1cbiAgICB9KTtcblxuICAgIHZhciBlbnRpdHkgPSB0aGlzLmdldEVudGl0eSgpO1xuXG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIoZW50aXR5LCAnU3VyZmFjZXMnKTtcbiAgICBFbnRpdHlSZWdpc3RyeS5yZWdpc3RlcihlbnRpdHksICdSZW5kZXJhYmxlcycpO1xuXG4gICAgaWYgKG9wdGlvbnMudGFnTmFtZSkgdGhpcy50YWdOYW1lID0gb3B0aW9ucy50YWdOYW1lO1xuICAgIHRoaXMuX2N1bGxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3NpemUgICAgID0gbmV3IEZsb2F0MzJBcnJheShbMCwwXSk7XG5cbiAgICB0aGlzLmludmFsaWRhdGlvbnMgPSAxMjc7XG4gICAgdGhpcy5fZXZlbnRPdXRwdXQgID0gbmV3IEV2ZW50SGFuZGxlcigpO1xuICAgIHRoaXMuX2V2ZW50T3V0cHV0LmJpbmRUaGlzKHRoaXMpO1xuICAgIHRoaXMuX2V2ZW50Rm9yd2FyZGVyID0gZnVuY3Rpb24gX2V2ZW50Rm9yd2FyZGVyKGV2ZW50KSB7XG4gICAgICAgIHRoaXMuX2V2ZW50T3V0cHV0LmVtaXQoZXZlbnQudHlwZSwgZXZlbnQpO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHRoaXMuc3BlYyA9IHtcbiAgICAgICAgX2lkICAgICAgICAgICAgOiBlbnRpdHkuX2lkLFxuICAgICAgICBjbGFzc2VzICAgICAgICA6IFtdLFxuICAgICAgICBhdHRyaWJ1dGVzICAgICA6IHt9LFxuICAgICAgICBwcm9wZXJ0aWVzICAgICA6IHt9LFxuICAgICAgICBjb250ZW50ICAgICAgICA6IG51bGwsXG4gICAgICAgIGludmFsaWRhdGlvbnMgIDogKDEgPDwgT2JqZWN0LmtleXMoU3VyZmFjZS5pbnZhbGlkYXRpb25zKS5sZW5ndGgpIC0gMSxcbiAgICAgICAgb3JpZ2luICAgICAgICAgOiB0aGlzLl9vcmlnaW4sXG4gICAgICAgIGV2ZW50cyAgICAgICAgIDogW10sXG4gICAgICAgIGV2ZW50Rm9yd2FyZGVyIDogdGhpcy5fZXZlbnRGb3J3YXJkZXJcbiAgICB9O1xuXG4gICAgZW50aXR5LmdldENvbXBvbmVudChUUkFOU0ZPUk0pLm9uKCdpbnZhbGlkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy50cmFuc2Zvcm07XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIGVudGl0eS5nZXRDb21wb25lbnQoU0laRSkub24oJ2ludmFsaWRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemU7XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIGVudGl0eS5nZXRDb21wb25lbnQoT1BBQ0lUWSkub24oJ2ludmFsaWRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLm9wYWNpdHk7XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICAgIHRoaXMuX2hhc09yaWdpbiA9IHRydWU7XG59XG5cblN1cmZhY2UucHJvdG90eXBlICAgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZShUYXJnZXQucHJvdG90eXBlKTtcblN1cmZhY2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3VyZmFjZTtcblxuLy8gSW52YWxpZGF0aW9uIFNjaGVtZVxuU3VyZmFjZS5pbnZhbGlkYXRpb25zID0ge1xuICAgIGNsYXNzZXMgICAgOiAxLFxuICAgIHByb3BlcnRpZXMgOiAyLFxuICAgIGF0dHJpYnV0ZXMgOiA0LFxuICAgIGNvbnRlbnQgICAgOiA4LFxuICAgIHRyYW5zZm9ybSAgOiAxNixcbiAgICBzaXplICAgICAgIDogMzIsXG4gICAgb3BhY2l0eSAgICA6IDY0LFxuICAgIG9yaWdpbiAgICAgOiAxMjgsXG4gICAgZXZlbnRzICAgICA6IDI1NlxufTtcblxuU3VyZmFjZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge3JldHVybiBTVVJGQUNFO307XG5cblN1cmZhY2UucHJvdG90eXBlLl9zZXRWZXJ0ZXhEaXNwbGFjZW1lbnQgPSBmdW5jdGlvbiBfc2V0VmVydGV4RGlzcGxhY2VtZW50ICh4LCB5KSB7XG4gICAgdmFyIHlPcmlnaW5PZmZzZXQgPSB0aGlzLnNwZWMub3JpZ2luWzFdICogeSxcbiAgICAgICAgeE9yaWdpbk9mZnNldCA9IHRoaXMuc3BlYy5vcmlnaW5bMF0gKiB4O1xuXG4gICAgdGhpcy52ZXJ0aWNpZXNbMF1bMF0gPSAwIC0geE9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1swXVsxXSA9IDAgLSB5T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzFdWzBdID0geCAtIHhPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMV1bMV0gPSAwIC0geU9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1syXVswXSA9IHggLSB4T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzJdWzFdID0geSAtIHlPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbM11bMF0gPSAwIC0geE9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1szXVsxXSA9IHkgLSB5T3JpZ2luT2Zmc2V0O1xuXG4gICAgdGhpcy5fc2l6ZVswXSA9IHg7XG4gICAgdGhpcy5fc2l6ZVsxXSA9IHk7XG4gICAgdGhpcy5fZXZlbnRPdXRwdXQuZW1pdCgnc2l6ZUNoYW5nZScsIHRoaXMuX3NpemUpO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG9wdGlvbnMgb2YgdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBzZXRPcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9iamVjdCBvZiBvcHRpb25zXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldE9wdGlvbnMgPSBmdW5jdGlvbiBzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5wcm9wZXJ0aWVzKSAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFByb3BlcnRpZXMob3B0aW9ucy5wcm9wZXJ0aWVzKTtcbiAgICBpZiAob3B0aW9ucy5jbGFzc2VzKSAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldENsYXNzZXMob3B0aW9ucy5jbGFzc2VzKTtcbiAgICBpZiAob3B0aW9ucy5hdHRyaWJ1dGVzKSAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMob3B0aW9ucy5hdHRyaWJ1dGVzKTtcbiAgICBpZiAob3B0aW9ucy5jb250ZW50IHx8IG9wdGlvbnMuY29udGVudCA9PT0gJycpICB0aGlzLnNldENvbnRlbnQob3B0aW9ucy5jb250ZW50KTtcbiAgICBpZiAob3B0aW9ucy5zaXplKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldENTU1NpemUuYXBwbHkodGhpcywgb3B0aW9ucy5zaXplKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBDU1MgY2xhc3NlcyB0byBiZSBhIG5ldyBBcnJheSBvZiBzdHJpbmdzLlxuICpcbiAqIEBtZXRob2Qgc2V0Q2xhc3Nlc1xuICogXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBvZiBDU1MgY2xhc3Nlc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRDbGFzc2VzID0gZnVuY3Rpb24gc2V0Q2xhc3NlcyhjbGFzc0xpc3QpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2xhc3NMaXN0KSkgdGhyb3cgbmV3IEVycm9yKFwiU3VyZmFjZTogZXhwZWN0cyBhbiBBcnJheSB0byBiZSBwYXNzZWQgdG8gc2V0Q2xhc3Nlc1wiKTtcblxuICAgIHZhciBpID0gMDtcbiAgICB2YXIgcmVtb3ZhbCA9IFtdO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMuc3BlYy5jbGFzc2VzLmxlbmd0aDsgaSsrKVxuICAgICAgICBpZiAoY2xhc3NMaXN0LmluZGV4T2YodGhpcy5zcGVjLmNsYXNzZXNbaV0pIDwgMClcbiAgICAgICAgICAgIHJlbW92YWwucHVzaCh0aGlzLnNwZWMuY2xhc3Nlc1tpXSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgcmVtb3ZhbC5sZW5ndGg7IGkrKykgICB0aGlzLnJlbW92ZUNsYXNzKHJlbW92YWxbaV0pO1xuICAgIGZvciAoaSA9IDA7IGkgPCBjbGFzc0xpc3QubGVuZ3RoOyBpKyspIHRoaXMuYWRkQ2xhc3MoY2xhc3NMaXN0W2ldKTtcblxuICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuc2l6ZTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGFsbCBvZiB0aGUgY2xhc3NlcyBhc3NvY2lhdGVkIHdpdGggdGhpcyBTdXJmYWNlXG4gKlxuICogQG1ldGhvZCBnZXRDbGFzc2VzXG4gKiBcbiAqIEByZXR1cm4ge0FycmF5fSBhcnJheSBvZiBDU1MgY2xhc3Nlc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5nZXRDbGFzc2VzID0gZnVuY3Rpb24gZ2V0Q2xhc3NlcygpIHtcbiAgICByZXR1cm4gdGhpcy5zcGVjLmNsYXNzZXM7XG59O1xuXG4vKipcbiAqIEFkZCBhIHNpbmdsZSBjbGFzcyB0byB0aGUgU3VyZmFjZSdzIGxpc3Qgb2YgY2xhc3Nlcy5cbiAqICAgSW52YWxpZGF0ZXMgdGhlIFN1cmZhY2UncyBjbGFzc2VzLlxuICpcbiAqIEBtZXRob2QgYWRkQ2xhc3NcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGNsYXNzTmFtZSBuYW1lIG9mIHRoZSBjbGFzc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5hZGRDbGFzcyA9IGZ1bmN0aW9uIGFkZENsYXNzKGNsYXNzTmFtZSkge1xuICAgIGlmICh0eXBlb2YgY2xhc3NOYW1lICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdhZGRDbGFzcyBvbmx5IHRha2VzIFN0cmluZ3MgYXMgcGFyYW1ldGVycycpO1xuICAgIGlmICh0aGlzLnNwZWMuY2xhc3Nlcy5pbmRleE9mKGNsYXNzTmFtZSkgPCAwKSB7XG4gICAgICAgIHRoaXMuc3BlYy5jbGFzc2VzLnB1c2goY2xhc3NOYW1lKTtcbiAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5jbGFzc2VzO1xuICAgIH1cblxuICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuc2l6ZTtcbn07XG5cblxuLyoqXG4gKiBSZW1vdmUgYSBzaW5nbGUgY2xhc3MgZnJvbSB0aGUgU3VyZmFjZSdzIGxpc3Qgb2YgY2xhc3Nlcy5cbiAqICAgSW52YWxpZGF0ZXMgdGhlIFN1cmZhY2UncyBjbGFzc2VzLlxuICogXG4gKiBAbWV0aG9kIHJlbW92ZUNsYXNzXG4gKiBcbiAqIEBwYXJhbSAge1N0cmluZ30gY2xhc3NOYW1lIGNsYXNzIHRvIHJlbW92ZVxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5yZW1vdmVDbGFzcyA9IGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGNsYXNzTmFtZSkge1xuICAgIGlmICh0eXBlb2YgY2xhc3NOYW1lICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdhZGRDbGFzcyBvbmx5IHRha2VzIFN0cmluZ3MgYXMgcGFyYW1ldGVycycpO1xuICAgIHZhciBpID0gdGhpcy5zcGVjLmNsYXNzZXMuaW5kZXhPZihjbGFzc05hbWUpO1xuICAgIGlmIChpID49IDApIHtcbiAgICAgICAgdGhpcy5zcGVjLmNsYXNzZXMuc3BsaWNlKGksIDEpO1xuICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLmNsYXNzZXM7XG4gICAgfVxuXG4gICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5zaXplO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIENTUyBwcm9wZXJ0aWVzIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZS5cbiAqICAgSW52YWxpZGF0ZXMgdGhlIFN1cmZhY2UncyBwcm9wZXJ0aWVzLlxuICpcbiAqIEBtZXRob2Qgc2V0UHJvcGVydGllc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRQcm9wZXJ0aWVzID0gZnVuY3Rpb24gc2V0UHJvcGVydGllcyhwcm9wZXJ0aWVzKSB7XG4gICAgZm9yICh2YXIgbiBpbiBwcm9wZXJ0aWVzKSB0aGlzLnNwZWMucHJvcGVydGllc1tuXSA9IHByb3BlcnRpZXNbbl07XG4gICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5zaXplO1xuICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMucHJvcGVydGllcztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBDU1MgcHJvcGVydGllcyBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBnZXRQcm9wZXJ0aWVzXG4gKiBcbiAqIEByZXR1cm4ge09iamVjdH0gQ1NTIHByb3BlcnRpZXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldFByb3BlcnRpZXMgPSBmdW5jdGlvbiBnZXRQcm9wZXJ0aWVzKCkge1xuICAgIHJldHVybiB0aGlzLnNwZWMucHJvcGVydGllcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBIVE1MIGF0dHJpYnV0ZXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlLlxuICogICBJbnZhbGlkYXRlcyB0aGUgU3VyZmFjZSdzIGF0dHJpYnV0ZXMuXG4gKlxuICogQG1ldGhvZCBzZXRBdHRyaWJ1dGVzXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiBzZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpIHtcbiAgICBmb3IgKHZhciBuIGluIGF0dHJpYnV0ZXMpIHRoaXMuc3BlYy5hdHRyaWJ1dGVzW25dID0gYXR0cmlidXRlc1tuXTtcbiAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLmF0dHJpYnV0ZXM7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgSFRNTCBhdHRyaWJ1dGVzIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIGdldEF0dHJpYnV0ZXNcbiAqIFxuICogQHJldHVybiB7T2JqZWN0fSBIVE1MIGF0dHJpYnV0ZXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiBnZXRBdHRyaWJ1dGVzKCkge1xuICAgIHJldHVybiB0aGlzLnNwZWMuYXR0cmlidXRlcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBpbm5lckhUTUwgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlLlxuICogICBJbnZhbGlkYXRlcyB0aGUgU3VyZmFjZSdzIGNvbnRlbnQuXG4gKlxuICogQG1ldGhvZCBzZXRDb250ZW50XG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldENvbnRlbnQgPSBmdW5jdGlvbiBzZXRDb250ZW50KGNvbnRlbnQpIHtcbiAgICBpZiAoY29udGVudCAhPT0gdGhpcy5zcGVjLmNvbnRlbnQpIHtcbiAgICAgICAgdGhpcy5zcGVjLmNvbnRlbnQgICA9IGNvbnRlbnQ7XG4gICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuY29udGVudDtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgaW5uZXJIVE1MIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIGdldENvbnRlbnRcbiAqIFxuICogQHJldHVybiB7U3RyaW5nfSBpbm5lckhUTUwgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldENvbnRlbnQgPSBmdW5jdGlvbiBnZXRDb250ZW50KCkge1xuICAgIHJldHVybiB0aGlzLnNwZWMuY29udGVudDtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzaXplIG9mIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2Qgc2V0Q1NTU2l6ZVxuICogQGNoYWluYWJsZVxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRDU1NTaXplID0gZnVuY3Rpb24gc2V0Q1NTU2l6ZSh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgaWYgKCF0aGlzLnNwZWMuc2l6ZSkgdGhpcy5zcGVjLnNpemUgPSBbXTtcbiAgICBpZiAod2lkdGgpIHtcbiAgICAgICAgdGhpcy5fc2l6ZVswXSA9IHRoaXMuc3BlYy5zaXplWzBdID0gd2lkdGg7XG4gICAgfVxuICAgIGlmIChoZWlnaHQpIHtcbiAgICAgICAgdGhpcy5fc2l6ZVsxXSA9IHRoaXMuc3BlYy5zaXplWzFdID0gaGVpZ2h0O1xuICAgIH1cbiAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemU7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqICBHZXQgdGhlIENTUyBTaXplIG9mIGEgc3VyZmFjZS4gTm90ZSB0aGF0IHdoZW4gdXNpbmcgdW5kZWZpbmVkLCBvciB0cnVlIHNpemUsIHRoaXMgd2lsbFxuICogIGhhcHBlbiBhIGZyYW1lIGxhdGVyLiBUbyBnZXQgYSBub3RpZmljYXRpb24gb2YgdGhpcyBjaGFuZ2UsIGxpc3RlbiB0byB0aGlzIHN1cmZhY2Unc1xuICogIHNpemVDaGFuZ2UgZXZlbnQuIFxuICpcbiAqICBAbWV0aG9kIGdldENTU1NpemVcbiAqICBAcmV1dHJuIHtBcnJheX0gMlxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5nZXRDU1NTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zaXplO1xufVxuXG5cbi8qKlxuICogU2V0cyB0aGUgb3JpZ2luIG9mIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2Qgc2V0T3JpZ2luXG4gKiBAY2hhaW5hYmxlXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggb3JpZ2luIG9uIHRoZSB4LWF4aXMgYXMgYSBwZXJjZW50XG4gKiBAcGFyYW0ge051bWJlcn0geSBvcmlnaW4gb24gdGhlIHktYXhpcyBhcyBhIHBlcmNlbnRcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuc2V0T3JpZ2luICA9IGZ1bmN0aW9uIHNldE9yaWdpbih4LCB5KSB7XG4gICAgaWYgKCh4ICE9IG51bGwgJiYgKHggPCAwIHx8IHggPiAxKSkgfHwgKHkgIT0gbnVsbCAmJiAoeSA8IDAgfHwgeSA+IDEpKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPcmlnaW4gbXVzdCBoYXZlIGFuIHggYW5kIHkgdmFsdWUgYmV0d2VlbiAwIGFuZCAxJyk7XG5cbiAgICB0aGlzLnNwZWMub3JpZ2luWzBdID0geCAhPSBudWxsID8geCA6IHRoaXMuc3BlYy5vcmlnaW5bMF07XG4gICAgdGhpcy5zcGVjLm9yaWdpblsxXSA9IHkgIT0gbnVsbCA/IHkgOiB0aGlzLnNwZWMub3JpZ2luWzFdO1xuICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMub3JpZ2luO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIG9yaWdpbiBvZiB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIGdldE9yaWdpblxuICpcbiAqIEByZXR1cm4ge0FycmF5fSAyLWRpbWVuc2lvbmFsIGFycmF5IHJlcHJlc2VudGluZyB0aGUgU3VyZmFjZSdzIG9yaWdpblxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5nZXRPcmlnaW4gPSBmdW5jdGlvbiBnZXRPcmlnaW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuc3BlYy5vcmlnaW47XG59O1xuXG4vKipcbiAqIFJlc2V0cyB0aGUgaW52YWxpZGF0aW9ucyBvZiB0aGUgU3VyZmFjZVxuICpcbiAqIEBtZXRob2QgcmVzZXRJbnZhbGlkYXRpb25zXG4gKiBAY2hhaW5hYmxlXG4gKlxuICogQHJldHVybiB7U3VyZmFjZX0gdGhpc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5yZXNldEludmFsaWRhdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmludmFsaWRhdGlvbnMgPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBNYXJrIGFsbCBwcm9wZXJ0aWVzIGFzIGludmFsaWRhdGVkLlxuICpcbiAqIEBtZXRob2QgaW52YWxpZGF0ZUFsbFxuICogQGNoYWluYWJsZVxuICpcbiAqIEByZXR1cm4ge1N1cmZhY2V9IHRoaXNcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuaW52YWxpZGF0ZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW52YWxpZGF0aW9ucyA9IDUxMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBCaW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYW4gZXZlbnQgdHlwZSBoYW5kbGVkIGJ5IHRoaXMgU3VyZmFjZSdzXG4gKiAgRXZlbnRIYW5kbGVyLlxuICpcbiAqIEBtZXRob2Qgb25cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjbGljaycpXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHN0cmluZywgT2JqZWN0KX0gaGFuZGxlciBjYWxsYmFja1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBjYikge1xuICAgIGlmICh0eXBlb2YgZXZlbnQgPT09ICdzdHJpbmcnICYmIGNiIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdGhpcy5fZXZlbnRPdXRwdXQub24oZXZlbnQsIGNiKTtcbiAgICAgICAgaWYgKHRoaXMuc3BlYy5ldmVudHMuaW5kZXhPZihldmVudCkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLnNwZWMuZXZlbnRzLnB1c2goZXZlbnQpO1xuICAgICAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5ldmVudHM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhIGZ1bmN0aW9uIHRvIGEgcGFydGljdWxhciBldmVudCBvY2N1cmluZy5cbiAqXG4gKiBAbWV0aG9kICBvZmZcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IG5hbWUgb2YgdGhlIGV2ZW50IHRvIGNhbGwgdGhlIGZ1bmN0aW9uIHdoZW4gb2NjdXJpbmdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBldmVudCBpcyByZWNpZXZlZC5cbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gb2ZmKGV2ZW50LCBjYikge1xuICAgIGlmICh0eXBlb2YgZXZlbnQgPT09ICdzdHJpbmcnICYmIGNiIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5zcGVjLmV2ZW50cy5pbmRleE9mKGV2ZW50KTtcbiAgICAgICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRPdXRwdXQucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGNiKTtcbiAgICAgICAgICAgIHRoaXMuc3BlYy5ldmVudHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuZXZlbnRzO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBBZGQgZXZlbnQgaGFuZGxlciBvYmplY3QgdG8gdGhlIEV2ZW50SGFuZGxlcidzIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKlxuICogQG1ldGhvZCBwaXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCBldmVudCBoYW5kbGVyIHRhcmdldCBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcGFzc2VkIGV2ZW50IGhhbmRsZXJcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIHBpcGUodGFyZ2V0KSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IHRhcmdldC51cHN0cmVhbUxpc3RlbmVycyB8fCB0YXJnZXQuX2V2ZW50SW5wdXQudXBzdHJlYW1MaXN0ZW5lcnM7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhsaXN0ZW5lcnMpO1xuICAgIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIGV2ZW50O1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgZXZlbnQgPSBrZXlzW2ldO1xuICAgICAgICBpZiAodGhpcy5zcGVjLmV2ZW50cy5pbmRleE9mKGV2ZW50KSA8IDApIHtcbiAgICAgICAgICAgIHRoaXMuc3BlYy5ldmVudHMucHVzaChldmVudCk7XG4gICAgICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLmV2ZW50cztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRPdXRwdXQucGlwZSh0YXJnZXQpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgaGFuZGxlciBvYmplY3QgZnJvbSB0aGUgRXZlbnRIYW5kbGVyJ3MgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqICAgVW5kb2VzIHdvcmsgb2YgXCJwaXBlXCIuXG4gKlxuICogQG1ldGhvZCB1bnBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IHRhcmdldCBoYW5kbGVyIG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwcm92aWRlZCB0YXJnZXRcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24gdW5waXBlKHRhcmdldCkge1xuICAgIHJldHVybiB0aGlzLl9ldmVudE91dHB1dC51bnBpcGUodGFyZ2V0KTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSByZW5kZXIgc3BlY2lmaWNhdGlvbiBvZiB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kICByZW5kZXJcbiAqIFxuICogQHJldHVybiB7T2JqZWN0fSByZW5kZXIgc3BlY2lmaWNhdGlvblxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNwZWMuaW52YWxpZGF0aW9ucyA9IHRoaXMuaW52YWxpZGF0aW9ucztcbiAgICByZXR1cm4gdGhpcy5zcGVjO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdXJmYWNlO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWF0cml4TWF0aCA9IHJlcXVpcmUoJy4uLy4uL21hdGgvNHg0bWF0cml4Jyk7XG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9FbnRpdHlSZWdpc3RyeScpO1xuXG4vKipcbiAqIFRhcmdldCBpcyB0aGUgYmFzZSBjbGFzcyBmb3IgYWxsIHJlbmRlcmFibGVzLiAgSXQgaG9sZHMgdGhlIHN0YXRlIG9mXG4gKiAgIGl0cyB2ZXJ0aWNpZXMsIHRoZSBDb250YWluZXJzIGl0IGlzIGRlcGxveWVkIGluLCB0aGUgQ29udGV4dCBpdCBiZWxvbmdzXG4gKiAgIHRvLCBhbmQgd2hldGhlciBvciBub3Qgb3JpZ2luIGFsaWdubWVudCBuZWVkcyB0byBiZSBhcHBsaWVkLlxuICpcbiAqIEBjb21wb25lbnQgVGFyZ2V0XG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5ICBFbnRpdHkgdGhhdCB0aGUgVGFyZ2V0IGlzIGEgY29tcG9uZW50IG9mXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIFRhcmdldChlbnRpdHlJRCwgb3B0aW9ucykge1xuICAgIHZhciBzZWxmICAgICAgICA9IHRoaXM7XG4gICAgdGhpcy5fZW50aXR5SUQgID0gZW50aXR5SUQ7XG4gICAgdGhpcy52ZXJ0aWNpZXMgID0gb3B0aW9ucy52ZXJ0aWNpZXMgfHwgW107XG4gICAgdGhpcy5jb250YWluZXJzID0ge307XG4gICAgdGhpcy5faGFzT3JpZ2luID0gZmFsc2U7XG4gICAgdGhpcy5fb3JpZ2luICAgID0gbmV3IEZsb2F0MzJBcnJheShbMC41LCAwLjUsIDAuNV0pO1xufVxuXG4vKipcbiAqIEdldCB0aGUgdmVydGljaWVzIG9mIHRoZSBUYXJnZXQuXG4gKlxuICogQG1ldGhvZCBnZXRWZXJ0aWNpZXNcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYXJyYXkgb2YgdGhlIHZlcnRpY2llcyByZXByZXNlbnRlZCBhcyB0aHJlZSBlbGVtZW50IGFycmF5cyBbeCwgeSwgel1cbiAqL1xuVGFyZ2V0LnByb3RvdHlwZS5nZXRWZXJ0aWNpZXMgPSBmdW5jdGlvbiBnZXRWZXJ0aWNpZXMoKXtcbiAgICByZXR1cm4gdGhpcy52ZXJ0aWNpZXM7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIFRhcmdldCB3YXMgZGVwbG95ZWQgdG8gYSBwYXJ0aWN1bGFyIGNvbnRhaW5lclxuICpcbiAqIEBtZXRob2QgX2lzV2l0aGluXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZSBpZCBvZiB0aGUgQ29udGFpbmVyJ3MgRW50aXR5XG4gKiBAcmV0dXJuIHtCb29sZWFufSB3aGV0aGVyIG9yIG5vdyB0aGUgVGFyZ2V0IHdhcyBkZXBsb3llZCB0byB0aGlzIHBhcnRpY3VsYXIgQ29udGFpbmVyXG4gKi9cblRhcmdldC5wcm90b3R5cGUuX2lzV2l0aGluID0gZnVuY3Rpb24gX2lzV2l0aGluKGNvbnRhaW5lcikge1xuICAgIHJldHVybiB0aGlzLmNvbnRhaW5lcnNbY29udGFpbmVyLl9pZF07XG59O1xuXG4vKipcbiAqIE1hcmsgYSBDb250YWluZXIgYXMgaGF2aW5nIGEgZGVwbG95ZWQgaW5zdGFuY2Ugb2YgdGhlIFRhcmdldFxuICpcbiAqIEBtZXRob2QgX2FkZFRvQ29udGFpbmVyXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZSBpZCBvZiB0aGUgQ29udGFpbmVyJ3MgRW50aXR5XG4gKiBAcmV0dXJuIHtCb29sZWFufSBzdGF1cyBvZiB0aGUgYWRkaXRpb25cbiAqL1xuVGFyZ2V0LnByb3RvdHlwZS5fYWRkVG9Db250YWluZXIgPSBmdW5jdGlvbiBfYWRkVG9Db250YWluZXIoY29udGFpbmVyKSB7XG4gICAgdGhpcy5jb250YWluZXJzW2NvbnRhaW5lci5faWRdID0gdHJ1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogVW5tYXJrIGEgQ29udGFpbmVyIGFzIGhhdmluZyBhIGRlcGxveWVkIGluc3RhbmNlIG9mIHRoZSBUYXJnZXRcbiAqXG4gKiBAbWV0aG9kIF9yZW1vdmVGcm9tQ29udGFpbmVyXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZSBpZCBvZiB0aGUgQ29udGFpbmVyJ3MgRW50aXR5XG4gKiBAcmV0dXJuIHtCb29sZWFufSBzdGF1cyBvZiB0aGUgcmVtb3ZhbFxuICovXG5UYXJnZXQucHJvdG90eXBlLl9yZW1vdmVGcm9tQ29udGFpbmVyID0gZnVuY3Rpb24gX3JlbW92ZUZyb21Db250YWluZXIoY29udGFpbmVyKSB7XG4gICAgdGhpcy5jb250YWluZXJzW2NvbnRhaW5lci5faWRdID0gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgc2l6ZSBvZiB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIGdldFNpemVcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gMi1kaW1lbnNpb25hbCBhcnJheSByZXByZXNlbnRpbmcgdGhlIHNpemUgb2YgdGhlIFN1cmZhY2UgaW4gcGl4ZWxzLlxuICovXG5UYXJnZXQucHJvdG90eXBlLmdldFNpemUgPSBmdW5jdGlvbiBnZXRTaXplKG1hdHJpeCwgZGl2aWRlQnlXKSB7XG4gICAgbWF0cml4ID0gbWF0cml4IHx8IHRoaXMuZ2V0RW50aXR5KCkuZ2V0Q29tcG9uZW50KCd0cmFuc2Zvcm0nKS5fbWF0cml4O1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBkaXNwbGFjZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICBsZWZ0ICAgOiAwLFxuICAgICAgICAgICAgICAgIGJvdHRvbSA6IDAsXG4gICAgICAgICAgICAgICAgbmVhciAgIDogMCxcbiAgICAgICAgICAgICAgICByaWdodCAgOiAwLFxuICAgICAgICAgICAgICAgIHRvcCAgICA6IDAsXG4gICAgICAgICAgICAgICAgZmFyICAgIDogMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgIHZhciBpID0gdGhpcy52ZXJ0aWNpZXMubGVuZ3RoO1xuICAgIHZhciB2ZWN0b3JTY3JhdGNoID0gW107XG4gICAgTWF0cml4TWF0aC5hcHBseVRvVmVjdG9yKHZlY3RvclNjcmF0Y2gsIG1hdHJpeCwgWzAsIDAsIDAsIDFdKTtcbiAgICBpZiAoZGl2aWRlQnlXKSB7XG4gICAgICAgIHZlY3RvclNjcmF0Y2hbMF0gLz0gdmVjdG9yU2NyYXRjaFszXTtcbiAgICAgICAgdmVjdG9yU2NyYXRjaFsxXSAvPSB2ZWN0b3JTY3JhdGNoWzNdO1xuICAgICAgICB2ZWN0b3JTY3JhdGNoWzJdIC89IHZlY3RvclNjcmF0Y2hbM107XG4gICAgfVxuICAgIHJlc3VsdC5vcmlnaW4gPSB2ZWN0b3JTY3JhdGNoLnNsaWNlKDAsIC0xKTtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIE1hdHJpeE1hdGguYXBwbHlUb1ZlY3Rvcih2ZWN0b3JTY3JhdGNoLCBtYXRyaXgsIHRoaXMudmVydGljaWVzW2ldKTtcbiAgICAgICAgaWYgKGRpdmlkZUJ5Vykge1xuICAgICAgICAgICAgdmVjdG9yU2NyYXRjaFswXSAvPSB2ZWN0b3JTY3JhdGNoWzNdO1xuICAgICAgICAgICAgdmVjdG9yU2NyYXRjaFsxXSAvPSB2ZWN0b3JTY3JhdGNoWzNdO1xuICAgICAgICAgICAgdmVjdG9yU2NyYXRjaFsyXSAvPSB2ZWN0b3JTY3JhdGNoWzNdO1xuICAgICAgICB9XG4gICAgICAgIHZhciB4ID0gdmVjdG9yU2NyYXRjaFswXSAtIHJlc3VsdC5vcmlnaW5bMF0sIHkgPSB2ZWN0b3JTY3JhdGNoWzFdIC0gcmVzdWx0Lm9yaWdpblsxXSwgeiA9IHZlY3RvclNjcmF0Y2hbMl0gLSByZXN1bHQub3JpZ2luWzJdO1xuICAgICAgICBpZiAoeCA+IHJlc3VsdC5kaXNwbGFjZW1lbnQucmlnaHQpICByZXN1bHQuZGlzcGxhY2VtZW50LnJpZ2h0ICA9IHg7XG4gICAgICAgIGlmICh4IDwgcmVzdWx0LmRpc3BsYWNlbWVudC5sZWZ0KSAgIHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCAgID0geDtcbiAgICAgICAgaWYgKHkgPiByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSkgcmVzdWx0LmRpc3BsYWNlbWVudC5ib3R0b20gPSB5O1xuICAgICAgICBpZiAoeSA8IHJlc3VsdC5kaXNwbGFjZW1lbnQudG9wKSAgICByZXN1bHQuZGlzcGxhY2VtZW50LnRvcCAgICA9IHk7XG4gICAgICAgIGlmICh6ID4gcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyKSAgIHJlc3VsdC5kaXNwbGFjZW1lbnQubmVhciAgID0gejtcbiAgICAgICAgaWYgKHogPCByZXN1bHQuZGlzcGxhY2VtZW50LmZhcikgICAgcmVzdWx0LmRpc3BsYWNlbWVudC5mYXIgICAgPSB6O1xuICAgIH1cbiAgICByZXN1bHQuc2l6ZSA9IFtyZXN1bHQuZGlzcGxhY2VtZW50LnJpZ2h0IC0gcmVzdWx0LmRpc3BsYWNlbWVudC5sZWZ0LCByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSAtIHJlc3VsdC5kaXNwbGFjZW1lbnQudG9wLCByZXN1bHQuZGlzcGxhY2VtZW50Lm5lYXIgLSByZXN1bHQuZGlzcGxhY2VtZW50LmZhcl07XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblRhcmdldC5wcm90b3R5cGUuZ2V0RW50aXR5ID0gZnVuY3Rpb24gZ2V0RW50aXR5KCkge1xuICAgIHJldHVybiBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkodGhpcy5fZW50aXR5SUQpO1xufTtcblxuVGFyZ2V0LnByb3RvdHlwZS5zZXRPcmlnaW4gPSBmdW5jdGlvbiBzZXRPcmlnaW4oKSB7XG4gICAgdGhpcy5fb3JpZ2luWzBdID0geCAhPSBudWxsID8geCA6IHRoaXMuX29yaWdpblswXTtcbiAgICB0aGlzLl9vcmlnaW5bMV0gPSB5ICE9IG51bGwgPyB5IDogdGhpcy5fb3JpZ2luWzFdO1xuICAgIHRoaXMuX29yaWdpblsyXSA9IHogIT0gbnVsbCA/IHogOiB0aGlzLl9vcmlnaW5bMV07XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gVGFyZ2V0O1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuLi8uLi9ldmVudHMvRXZlbnRFbWl0dGVyJyk7XG5cbi8vIENPTlNUU1xudmFyIElERU5USVRZID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuXG4vLyBGdW5jdGlvbnMgdG8gYmUgcnVuIHdoZW4gYW4gaW5kZXggaXMgbWFya2VkIGFzIGludmFsaWRhdGVkXG52YXIgVkFMSURBVE9SUyA9IFtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTAocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFswXSAqIChtZW1vcnlbMl0gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXSArIHBhcmVudFs0XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbNV0gKyBtZW1vcnlbMV0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXSArIHBhcmVudFs4XSAqIChtZW1vcnlbMV0gKiBtZW1vcnlbNV0gLSBtZW1vcnlbMF0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMShwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzFdICogKG1lbW9yeVsyXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdICsgcGFyZW50WzVdICogKG1lbW9yeVswXSAqIG1lbW9yeVs1XSArIG1lbW9yeVsxXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdICsgcGFyZW50WzldICogKG1lbW9yeVsxXSAqIG1lbW9yeVs1XSAtIG1lbW9yeVswXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUyKHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMl0gKiAobWVtb3J5WzJdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF0gKyBwYXJlbnRbNl0gKiAobWVtb3J5WzBdICogbWVtb3J5WzVdICsgbWVtb3J5WzFdICogbWVtb3J5WzNdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF0gKyBwYXJlbnRbMTBdICogKG1lbW9yeVsxXSAqIG1lbW9yeVs1XSAtIG1lbW9yeVswXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUzKHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbM10gKiAobWVtb3J5WzJdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF0gKyBwYXJlbnRbN10gKiAobWVtb3J5WzBdICogbWVtb3J5WzVdICsgbWVtb3J5WzFdICogbWVtb3J5WzNdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF0gKyBwYXJlbnRbMTFdICogKG1lbW9yeVsxXSAqIG1lbW9yeVs1XSAtIG1lbW9yeVswXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGU0KHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMF0gKiAoLW1lbW9yeVsyXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdICsgcGFyZW50WzRdICogKG1lbW9yeVswXSAqIG1lbW9yeVs0XSAtIG1lbW9yeVsxXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdICsgcGFyZW50WzhdICogKG1lbW9yeVsxXSAqIG1lbW9yeVs0XSArIG1lbW9yeVswXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGU1KHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMV0gKiAoLW1lbW9yeVsyXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdICsgcGFyZW50WzVdICogKG1lbW9yeVswXSAqIG1lbW9yeVs0XSAtIG1lbW9yeVsxXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdICsgcGFyZW50WzldICogKG1lbW9yeVsxXSAqIG1lbW9yeVs0XSArIG1lbW9yeVswXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGU2KHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMl0gKiAoLW1lbW9yeVsyXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdICsgcGFyZW50WzZdICogKG1lbW9yeVswXSAqIG1lbW9yeVs0XSAtIG1lbW9yeVsxXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdICsgcGFyZW50WzEwXSAqIChtZW1vcnlbMV0gKiBtZW1vcnlbNF0gKyBtZW1vcnlbMF0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlNyhwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzNdICogKC1tZW1vcnlbMl0gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXSArIHBhcmVudFs3XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbNF0gLSBtZW1vcnlbMV0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXSArIHBhcmVudFsxMV0gKiAobWVtb3J5WzFdICogbWVtb3J5WzRdICsgbWVtb3J5WzBdICogbWVtb3J5WzNdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTgocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFswXSAqIChtZW1vcnlbM10pICogdmVjdG9ycy5zY2FsZVsyXSArIHBhcmVudFs0XSAqICgtbWVtb3J5WzFdICogbWVtb3J5WzJdKSAqIHZlY3RvcnMuc2NhbGVbMl0gKyBwYXJlbnRbOF0gKiAobWVtb3J5WzBdICogbWVtb3J5WzJdKSAqIHZlY3RvcnMuc2NhbGVbMl07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTkocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFsxXSAqIChtZW1vcnlbM10pICogdmVjdG9ycy5zY2FsZVsyXSArIHBhcmVudFs1XSAqICgtbWVtb3J5WzFdICogbWVtb3J5WzJdKSAqIHZlY3RvcnMuc2NhbGVbMl0gKyBwYXJlbnRbOV0gKiAobWVtb3J5WzBdICogbWVtb3J5WzJdKSAqIHZlY3RvcnMuc2NhbGVbMl07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTEwKHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMl0gKiAobWVtb3J5WzNdKSAqIHZlY3RvcnMuc2NhbGVbMl0gKyBwYXJlbnRbNl0gKiAoLW1lbW9yeVsxXSAqIG1lbW9yeVsyXSkgKiB2ZWN0b3JzLnNjYWxlWzJdICsgcGFyZW50WzEwXSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbMl0pICogdmVjdG9ycy5zY2FsZVsyXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMTEocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFszXSAqIChtZW1vcnlbM10pICogdmVjdG9ycy5zY2FsZVsyXSArIHBhcmVudFs3XSAqICgtbWVtb3J5WzFdICogbWVtb3J5WzJdKSAqIHZlY3RvcnMuc2NhbGVbMl0gKyBwYXJlbnRbMTFdICogKG1lbW9yeVswXSAqIG1lbW9yeVsyXSkgKiB2ZWN0b3JzLnNjYWxlWzJdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUxMihwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzBdICogdmVjdG9ycy50cmFuc2xhdGlvblswXSArIHBhcmVudFs0XSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMV0gKyBwYXJlbnRbOF0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzJdICsgcGFyZW50WzEyXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMTMocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFsxXSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMF0gKyBwYXJlbnRbNV0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzFdICsgcGFyZW50WzldICogdmVjdG9ycy50cmFuc2xhdGlvblsyXSArIHBhcmVudFsxM107XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTE0KHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMl0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzBdICsgcGFyZW50WzZdICogdmVjdG9ycy50cmFuc2xhdGlvblsxXSArIHBhcmVudFsxMF0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzJdICsgcGFyZW50WzE0XTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMTUocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFszXSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMF0gKyBwYXJlbnRbN10gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzFdICsgcGFyZW50WzExXSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMl0gKyBwYXJlbnRbMTVdO1xuICAgIH1cbl07XG5cbi8vIE1hcCBvZiBpbnZhbGlkYXRpb24gbnVtYmVyc1xudmFyIERFUEVOREVOVFMgPSB7XG4gICAgZ2xvYmFsIDogWzQzNjksODczOCwxNzQ3NiwzNDk1Miw0MzY5LDg3MzgsMTc0NzYsMzQ5NTIsNDM2OSw4NzM4LDE3NDc2LDM0OTUyLDQwOTYsODE5MiwxNjM4NCwzMjc2OF0sXG4gICAgbG9jYWwgIDoge1xuICAgICAgICB0cmFuc2xhdGlvbiA6IFs2MTQ0MCw2MTQ0MCw2MTQ0MF0sXG4gICAgICAgIHJvdGF0aW9uICAgIDogWzQwOTUsNDA5NSwyNTVdLFxuICAgICAgICBzY2FsZSAgICAgICA6IFs0MDk1LDQwOTUsNDA5NV0sXG4gICAgfVxufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gaXMgYSBjb21wb25lbnQgdGhhdCBpcyBwYXJ0IG9mIGV2ZXJ5IEVudGl0eS4gIEl0IGlzXG4gKiAgIHJlc3BvbnNpYmxlIGZvciB1cGRhdGluZyBpdCdzIG93biBub3Rpb24gb2YgcG9zaXRpb24gaW4gc3BhY2UgYW5kXG4gKiAgIGluY29ycG9yYXRpbmcgdGhhdCB3aXRoIHBhcmVudCBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAY2xhc3MgVHJhbnNmb3JtXG4gKiBAY29tcG9uZW50XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gVHJhbnNmb3JtKCkge1xuICAgIHRoaXMuX21hdHJpeCAgID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuICAgIHRoaXMuX21lbW9yeSAgID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMSwgMCwgMSwgMF0pO1xuICAgIHRoaXMuX3ZlY3RvcnMgID0ge1xuICAgICAgICB0cmFuc2xhdGlvbiA6IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDBdKSxcbiAgICAgICAgcm90YXRpb24gICAgOiBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwXSksXG4gICAgICAgIHNjYWxlICAgICAgIDogbmV3IEZsb2F0MzJBcnJheShbMSwgMSwgMV0pXG4gICAgfTtcbiAgICB0aGlzLl9JTyAgICAgICA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICB0aGlzLl91cGRhdGVGTiA9IG51bGw7XG4gICAgdGhpcy5fbXV0YXRvciAgPSB7XG4gICAgICAgIHRyYW5zbGF0ZSAgICAgIDogdGhpcy50cmFuc2xhdGUuYmluZCh0aGlzKSxcbiAgICAgICAgcm90YXRlICAgICAgICAgOiB0aGlzLnJvdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICBzY2FsZSAgICAgICAgICA6IHRoaXMuc2NhbGUuYmluZCh0aGlzKSxcbiAgICAgICAgc2V0VHJhbnNsYXRpb24gOiB0aGlzLnNldFRyYW5zbGF0aW9uLmJpbmQodGhpcyksXG4gICAgICAgIHNldFJvdGF0aW9uICAgIDogdGhpcy5zZXRSb3RhdGlvbi5iaW5kKHRoaXMpLFxuICAgICAgICBzZXRTY2FsZSAgICAgICA6IHRoaXMuc2V0U2NhbGUuYmluZCh0aGlzKVxuICAgIH07XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgPSAwO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdHJhbnNmb3JtIG1hdHJpeCB0aGF0IHJlcHJlc2VudHMgdGhpcyBUcmFuc2Zvcm0ncyB2YWx1ZXMgXG4gKiAgIGJlaW5nIGFwcGxpZWQgdG8gaXQncyBwYXJlbnQncyBnbG9iYWwgdHJhbnNmb3JtLlxuICpcbiAqIEBtZXRob2QgZ2V0R2xvYmFsTWF0cml4XG4gKiBcbiAqIEByZXR1cm4ge0Zsb2F0MzIgQXJyYXl9IHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgVHJhbnNmb3JtIGJlaW5nIGFwcGxpZWQgdG8gaXQncyBwYXJlbnRcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRHbG9iYWxNYXRyaXggPSBmdW5jdGlvbiBnZXRHbG9iYWxNYXRyaXgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hdHJpeDtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSB2ZWN0b3JpemVkIGluZm9ybWF0aW9uIGZvciB0aGlzIFRyYW5zZm9ybSdzIGxvY2FsXG4gKiAgIHRyYW5zZm9ybS5cbiAqXG4gKiBAbWV0aG9kIGdldExvY2FsVmVjdG9yc1xuICogXG4gKiBAcmV0dXJuIHtPYmplY3R9IG9iamVjdCB3aXRoIHRyYW5zbGF0ZSwgcm90YXRlLCBhbmQgc2NhbGUga2V5c1xuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldExvY2FsVmVjdG9ycyA9IGZ1bmN0aW9uIGdldFZlY3RvcnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZlY3RvcnM7XG59O1xuXG4vKipcbiAqIERlZmluZSB0aGUgcHJvdmlkZXIgb2Ygc3RhdGUgZm9yIHRoZSBUcmFuc2Zvcm0uXG4gKlxuICogQG1ldGhvZCB1cGRhdGVGcm9tXG4gKiBAY2hhaW5hYmxlXG4gKiBcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBwcm92aWRlciBzb3VyY2Ugb2Ygc3RhdGUgZm9yIHRoZSBUcmFuc2Zvcm1cbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS51cGRhdGVGcm9tID0gZnVuY3Rpb24gdXBkYXRlRnJvbShwcm92aWRlcikge1xuICAgIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIEZ1bmN0aW9uIHx8ICFwcm92aWRlcikgdGhpcy5fdXBkYXRlRk4gPSBwcm92aWRlcjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgbG9jYWwgaW52YWxpZGF0aW9uIHNjaGVtZSBiYXNlZCBvbiBwYXJlbnQgaW5mb3JtYXRpb25cbiAqXG4gKiBAbWV0aG9kIF9pbnZhbGlkYXRlRnJvbVBhcmVudFxuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtICB7TnVtYmVyfSBwYXJlbnRSZXBvcnQgcGFyZW50J3MgaW52YWxpZGF0aW9uXG4gKi9cbmZ1bmN0aW9uIF9pbnZhbGlkYXRlRnJvbVBhcmVudChwYXJlbnRSZXBvcnQpIHtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgd2hpbGUgKHBhcmVudFJlcG9ydCkge1xuICAgICAgICBpZiAocGFyZW50UmVwb3J0ICYgMSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gREVQRU5ERU5UUy5nbG9iYWxbY291bnRlcl07XG4gICAgICAgIGNvdW50ZXIrKztcbiAgICAgICAgcGFyZW50UmVwb3J0ID4+Pj0gMTtcbiAgICB9XG59XG5cbi8qKlxuICogVXBkYXRlIHRoZSBnbG9iYWwgbWF0cml4IGJhc2VkIG9uIGxvY2FsIGFuZCBwYXJlbnQgaW52YWxpZGF0aW9ucy5cbiAqXG4gKiBAbWV0aG9kICBfdXBkYXRlXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHBhcmVudFJlcG9ydCBpbnZhbGlkYXRpb25zIGFzc29jaWF0ZWQgd2l0aCB0aGUgcGFyZW50IG1hdHJpeFxuICogQHBhcmFtICB7QXJyYXl9IHBhcmVudE1hdHJpeCBwYXJlbnQgdHJhbnNmb3JtIG1hdHJpeCBhcyBhbiBBcnJheVxuICogQHJldHVybiB7TnVtYmVyfSBpbnZhbGlkYXRpb24gc2NoZW1lXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uIF91cGRhdGUocGFyZW50UmVwb3J0LCBwYXJlbnRNYXRyaXgpIHtcbiAgICBpZiAocGFyZW50UmVwb3J0KSAgX2ludmFsaWRhdGVGcm9tUGFyZW50LmNhbGwodGhpcywgcGFyZW50UmVwb3J0KTtcbiAgICBpZiAoIXBhcmVudE1hdHJpeCkgcGFyZW50TWF0cml4ID0gSURFTlRJVFk7XG4gICAgaWYgKHRoaXMuX3VwZGF0ZUZOKSB0aGlzLl91cGRhdGVGTih0aGlzLl9tdXRhdG9yKTtcbiAgICB2YXIgdXBkYXRlO1xuICAgIHZhciBjb3VudGVyICAgICA9IDA7XG4gICAgdmFyIGludmFsaWRhdGVkID0gdGhpcy5faW52YWxpZGF0ZWQ7XG5cbiAgICAvLyBCYXNlZCBvbiBpbnZhbGlkYXRpb25zIHVwZGF0ZSBvbmx5IHRoZSBuZWVkZWQgaW5kaWNpZXNcbiAgICB3aGlsZSAodGhpcy5faW52YWxpZGF0ZWQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2ludmFsaWRhdGVkICYgMSkge1xuICAgICAgICAgICAgdXBkYXRlID0gVkFMSURBVE9SU1tjb3VudGVyXShwYXJlbnRNYXRyaXgsIHRoaXMuX3ZlY3RvcnMsIHRoaXMuX21lbW9yeSk7XG4gICAgICAgICAgICBpZiAodXBkYXRlICE9PSB0aGlzLl9tYXRyaXhbY291bnRlcl0pXG4gICAgICAgICAgICAgICAgdGhpcy5fbWF0cml4W2NvdW50ZXJdID0gdXBkYXRlO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGludmFsaWRhdGVkICY9ICgoMSA8PCAxNikgLSAxKSBeICgxIDw8IGNvdW50ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY291bnRlcisrO1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCA+Pj49IDE7XG4gICAgfVxuXG4gICAgaWYgKGludmFsaWRhdGVkKSB0aGlzLl9JTy5lbWl0KCdpbnZhbGlkYXRlZCcsIGludmFsaWRhdGVkKTtcbiAgICByZXR1cm4gaW52YWxpZGF0ZWQ7XG59O1xuXG4vKipcbiAqIEFkZCBleHRyYSB0cmFuc2xhdGlvbiB0byB0aGUgY3VycmVudCB2YWx1ZXMuICBJbnZhbGlkYXRlc1xuICogICB0cmFuc2xhdGlvbiBhcyBuZWVkZWQuXG4gKlxuICogQG1ldGhvZCB0cmFuc2xhdGVcbiAqICAgXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggdHJhbnNsYXRpb24gYWxvbmcgdGhlIHgtYXhpcyBpbiBwaXhlbHNcbiAqIEBwYXJhbSAge051bWJlcn0geSB0cmFuc2xhdGlvbiBhbG9uZyB0aGUgeS1heGlzIGluIHBpeGVsc1xuICogQHBhcmFtICB7TnVtYmVyfSB6IHRyYW5zbGF0aW9uIGFsb25nIHRoZSB6LWF4aXMgaW4gcGl4ZWxzXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gdHJhbnNsYXRlKHgsIHksIHopIHtcbiAgICB2YXIgdHJhbnNsYXRpb24gPSB0aGlzLl92ZWN0b3JzLnRyYW5zbGF0aW9uO1xuICAgIHZhciBkaXJ0eSAgICAgICA9IGZhbHNlO1xuICAgIHZhciBzaXplO1xuXG4gICAgaWYgKHgpIHtcbiAgICAgICAgdHJhbnNsYXRpb25bMF0gKz0geDtcbiAgICAgICAgZGlydHkgICAgICAgICAgID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeSkge1xuICAgICAgICB0cmFuc2xhdGlvblsxXSArPSB5O1xuICAgICAgICBkaXJ0eSAgICAgICAgICAgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh6KSB7XG4gICAgICAgIHRyYW5zbGF0aW9uWzJdICs9IHo7XG4gICAgICAgIGRpcnR5ICAgICAgICAgICA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGRpcnR5KSB0aGlzLl9pbnZhbGlkYXRlZCB8PSA2MTQ0MDtcbn07XG5cbi8qKlxuICogQWRkIGV4dHJhIHJvdGF0aW9uIHRvIHRoZSBjdXJyZW50IHZhbHVlcy4gIEludmFsaWRhdGVzXG4gKiAgIHJvdGF0aW9uIGFzIG5lZWRlZC5cbiAqXG4gKiBAbWV0aG9kIHJvdGF0ZVxuICogICBcbiAqIEBwYXJhbSAge051bWJlcn0geCByb3RhdGlvbiBhYm91dCB0aGUgeC1heGlzIGluIHJhZGlhbnNcbiAqIEBwYXJhbSAge051bWJlcn0geSByb3RhdGlvbiBhYm91dCB0aGUgeS1heGlzIGluIHJhZGlhbnNcbiAqIEBwYXJhbSAge051bWJlcn0geiByb3RhdGlvbiBhYm91dCB0aGUgei1heGlzIGluIHJhZGlhbnNcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5yb3RhdGUgPSBmdW5jdGlvbiByb3RhdGUoeCwgeSwgeikge1xuICAgIHZhciByb3RhdGlvbiA9IHRoaXMuX3ZlY3RvcnMucm90YXRpb247XG4gICAgdGhpcy5zZXRSb3RhdGlvbigoeCA/IHggOiAwKSArIHJvdGF0aW9uWzBdLCAoeSA/IHkgOiAwKSArIHJvdGF0aW9uWzFdLCAoeiA/IHogOiAwKSArIHJvdGF0aW9uWzJdKTtcbn07XG5cbi8qKlxuICogQWRkIGV4dHJhIHNjYWxlIHRvIHRoZSBjdXJyZW50IHZhbHVlcy4gIEludmFsaWRhdGVzXG4gKiAgIHNjYWxlIGFzIG5lZWRlZC5cbiAqXG4gKiBAbWV0aG9kIHNjYWxlXG4gKiAgIFxuICogQHBhcmFtICB7TnVtYmVyfSB4IHNjYWxlIGFsb25nIHRoZSB4LWF4aXMgYXMgYSBwZXJjZW50XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHkgc2NhbGUgYWxvbmcgdGhlIHktYXhpcyBhcyBhIHBlcmNlbnRcbiAqIEBwYXJhbSAge051bWJlcn0geiBzY2FsZSBhbG9uZyB0aGUgei1heGlzIGFzIGEgcGVyY2VudFxuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gc2NhbGUoeCwgeSwgeikge1xuICAgIHZhciBzY2FsZVZlY3RvciA9IHRoaXMuX3ZlY3RvcnMuc2NhbGU7XG4gICAgdmFyIGRpcnR5ICAgICAgID0gZmFsc2U7XG5cbiAgICBpZiAoeCkge1xuICAgICAgICBzY2FsZVZlY3RvclswXSArPSB4O1xuICAgICAgICBkaXJ0eSAgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmICh5KSB7XG4gICAgICAgIHNjYWxlVmVjdG9yWzFdICs9IHk7XG4gICAgICAgIGRpcnR5ICAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHopIHtcbiAgICAgICAgc2NhbGVWZWN0b3JbMl0gKz0gejtcbiAgICAgICAgZGlydHkgICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoZGlydHkpIHRoaXMuX2ludmFsaWRhdGVkIHw9IDQwOTU7XG59O1xuXG4vKipcbiAqIEFic29sdXRlIHNldCBvZiB0aGUgVHJhbnNmb3JtJ3MgdHJhbnNsYXRpb24uICBJbnZhbGlkYXRlc1xuICogICB0cmFuc2xhdGlvbiBhcyBuZWVkZWQuXG4gKlxuICogQG1ldGhvZCBzZXRUcmFuc2xhdGlvblxuICogXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggdHJhbnNsYXRpb24gYWxvbmcgdGhlIHgtYXhpcyBpbiBwaXhlbHNcbiAqIEBwYXJhbSAge051bWJlcn0geSB0cmFuc2xhdGlvbiBhbG9uZyB0aGUgeS1heGlzIGluIHBpeGVsc1xuICogQHBhcmFtICB7TnVtYmVyfSB6IHRyYW5zbGF0aW9uIGFsb25nIHRoZSB6LWF4aXMgaW4gcGl4ZWxzXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0VHJhbnNsYXRpb24gPSBmdW5jdGlvbiBzZXRUcmFuc2xhdGlvbih4LCB5LCB6KSB7XG4gICAgdmFyIHRyYW5zbGF0aW9uID0gdGhpcy5fdmVjdG9ycy50cmFuc2xhdGlvbjtcbiAgICB2YXIgZGlydHkgICAgICAgPSBmYWxzZTtcbiAgICB2YXIgc2l6ZTtcblxuICAgIGlmICh4ICE9PSB0cmFuc2xhdGlvblswXSAmJiB4ICE9IG51bGwpIHtcbiAgICAgICAgdHJhbnNsYXRpb25bMF0gPSB4O1xuICAgICAgICBkaXJ0eSAgICAgICAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IHRyYW5zbGF0aW9uWzFdICYmIHkgIT0gbnVsbCkge1xuICAgICAgICB0cmFuc2xhdGlvblsxXSA9IHk7XG4gICAgICAgIGRpcnR5ICAgICAgICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeiAhPT0gdHJhbnNsYXRpb25bMl0gJiYgeiAhPSBudWxsKSB7XG4gICAgICAgIHRyYW5zbGF0aW9uWzJdID0gejtcbiAgICAgICAgZGlydHkgICAgICAgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmIChkaXJ0eSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gNjE0NDA7XG59O1xuXG4vKipcbiAqIEFic29sdXRlIHNldCBvZiB0aGUgVHJhbnNmb3JtJ3Mgcm90YXRpb24uICBJbnZhbGlkYXRlc1xuICogICByb3RhdGlvbiBhcyBuZWVkZWQuXG4gKlxuICogQG1ldGhvZCBzZXRSb3RhdGVcbiAqICAgXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggcm90YXRpb24gYWJvdXQgdGhlIHgtYXhpcyBpbiByYWRpYW5zXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHkgcm90YXRpb24gYWJvdXQgdGhlIHktYXhpcyBpbiByYWRpYW5zXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHogcm90YXRpb24gYWJvdXQgdGhlIHotYXhpcyBpbiByYWRpYW5zXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0Um90YXRpb24gPSBmdW5jdGlvbiBzZXRSb3RhdGlvbih4LCB5LCB6KSB7XG4gICAgdmFyIHJvdGF0aW9uID0gdGhpcy5fdmVjdG9ycy5yb3RhdGlvbjtcbiAgICB2YXIgZGlydHkgICAgPSBmYWxzZTtcblxuICAgIGlmICh4ICE9PSByb3RhdGlvblswXSAmJiB4ICE9IG51bGwpIHtcbiAgICAgICAgcm90YXRpb25bMF0gICAgID0geDtcbiAgICAgICAgdGhpcy5fbWVtb3J5WzBdID0gTWF0aC5jb3MoeCk7XG4gICAgICAgIHRoaXMuX21lbW9yeVsxXSA9IE1hdGguc2luKHgpO1xuICAgICAgICBkaXJ0eSAgICAgICAgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmICh5ICE9PSByb3RhdGlvblsxXSAmJiB5ICE9IG51bGwpIHtcbiAgICAgICAgcm90YXRpb25bMV0gICAgID0geTtcbiAgICAgICAgdGhpcy5fbWVtb3J5WzJdID0gTWF0aC5jb3MoeSk7XG4gICAgICAgIHRoaXMuX21lbW9yeVszXSA9IE1hdGguc2luKHkpO1xuICAgICAgICBkaXJ0eSAgICAgICAgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmICh6ICE9PSByb3RhdGlvblsyXSAmJiB6ICE9IG51bGwpIHtcbiAgICAgICAgcm90YXRpb25bMl0gICAgICAgID0gejtcbiAgICAgICAgdGhpcy5fbWVtb3J5WzRdICAgID0gTWF0aC5jb3Moeik7XG4gICAgICAgIHRoaXMuX21lbW9yeVs1XSAgICA9IE1hdGguc2luKHopO1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCB8PSAyNTU7XG4gICAgfVxuXG4gICAgaWYgKGRpcnR5KSB0aGlzLl9pbnZhbGlkYXRlZCB8PSA0MDk1O1xufTtcblxuLyoqXG4gKiBBYnNvbHV0ZSBzZXQgb2YgdGhlIFRyYW5zZm9ybSdzIHNjYWxlLiAgSW52YWxpZGF0ZXNcbiAqICAgc2NhbGUgYXMgbmVlZGVkLlxuICpcbiAqIEBtZXRob2Qgc2V0U2NhbGVcbiAqICAgXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggc2NhbGUgYWxvbmcgdGhlIHgtYXhpcyBhcyBhIHBlcmNlbnRcbiAqIEBwYXJhbSAge051bWJlcn0geSBzY2FsZSBhbG9uZyB0aGUgeS1heGlzIGFzIGEgcGVyY2VudFxuICogQHBhcmFtICB7TnVtYmVyfSB6IHNjYWxlIGFsb25nIHRoZSB6LWF4aXMgYXMgYSBwZXJjZW50XG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0U2NhbGUgPSBmdW5jdGlvbiBzZXRTY2FsZSh4LCB5LCB6KSB7XG4gICAgdmFyIHNjYWxlID0gdGhpcy5fdmVjdG9ycy5zY2FsZTtcbiAgICB2YXIgZGlydHkgPSBmYWxzZTtcblxuICAgIGlmICh4ICE9PSBzY2FsZVswXSkge1xuICAgICAgICBzY2FsZVswXSA9IHg7XG4gICAgICAgIGRpcnR5ICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gc2NhbGVbMV0pIHtcbiAgICAgICAgc2NhbGVbMV0gPSB5O1xuICAgICAgICBkaXJ0eSAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHogIT09IHNjYWxlWzJdKSB7XG4gICAgICAgIHNjYWxlWzJdID0gejtcbiAgICAgICAgZGlydHkgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmIChkaXJ0eSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gNDA5NTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgZnVuY3Rpb25zIHRvIGJlIGNhbGxlZCBvbiB0aGUgVHJhbnNmb3JtJ3MgZXZlbnRzLlxuICpcbiAqIEBtZXRob2Qgb25cbiAqIEBjaGFpbmFibGVcbiAqXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbigpIHtcbiAgICB0aGlzLl9JTy5vbi5hcHBseSh0aGlzLl9JTywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUudG9PcmlnaW4gPSBmdW5jdGlvbiB0b09yaWdpbigpIHtcbiAgICB0aGlzLnNldFRyYW5zbGF0aW9uKDAsIDAsIDApO1xuICAgIHRoaXMuc2V0Um90YXRpb24oMCwgMCwgMCk7XG4gICAgdGhpcy5zZXRTY2FsZSgxLCAxLCAxKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5ICAgICAgICAgPSByZXF1aXJlKCcuL0VudGl0eScpO1xudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9FbnRpdHlSZWdpc3RyeScpO1xudmFyIENvbnRhaW5lciAgICAgID0gcmVxdWlyZSgnLi9Db21wb25lbnRzL0NvbnRhaW5lcicpO1xudmFyIENhbWVyYSAgICAgICAgID0gcmVxdWlyZSgnLi9Db21wb25lbnRzL0NhbWVyYScpO1xuXG4vKipcbiAqIENvbnRleHQgaXMgdGhlIGRlZmluaXRpb24gb2Ygd29ybGQgc3BhY2UgZm9yIHRoYXQgcGFydCBvZiB0aGUgc2NlbmUgZ3JhcGguXG4gKiAgIEEgY29udGV4dCBjYW4gZWl0aGVyIGhhdmUgYSBDb250YWluZXIgb3Igbm90LiAgSGF2aW5nIGEgY29udGFpbmVyIG1lYW5zXG4gKiAgIHRoYXQgcGFydHMgb2YgdGhlIHNjZW5lIGdyYXBoIGNhbiBiZSBkcmF3biBpbnNpZGUgb2YgaXQuICBJZiBpdCBkb2VzIG5vdFxuICogICBoYXZlIGEgQ29udGFpbmVyIHRoZW4gdGhlIENvbnRleHQgaXMgb25seSByZXNwb25zaWJsZSBmb3IgZGVmaW5pbmcgd29ybGRcbiAqICAgc3BhY2UuICBUaGUgQ29yZVN5c3RlbSB3aWxsIHN0YXJ0IGF0IGVhY2ggQ29udGV4dCBhbmQgcmVjdXJzaXZlIGRvd25cbiAqICAgdGhyb3VnaCB0aGVpciBjaGlsZHJlbiB0byB1cGRhdGUgZWFjaCBlbnRpdGl5J3MgVHJhbnNmb3JtLCBTaXplLFxuICogICBhbmQgT3BhY2l0eS5cbiAqXG4gKiBAY2xhc3MgQ29udGV4dFxuICogQGVudGl0eVxuICogQGNvbnN0cnVjdG9yXG4gKiAgIFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdGhlIHN0YXJ0aW5nIG9wdGlvbnMgZm9yIHRoZSBDb250ZXh0XG4gKiBAcGFyYW0ge0FycmF5fSBvcHRpb25zLnRyYW5zZm9ybSB0aGUgc3RhcnRpbmcgdHJhbnNmb3JtIG1hdHJpeFxuICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucy5zaXplIHRoZSBzdGFydGluZyBzaXplXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuaGFzQ29udGFpbmVyIHdoZXRoZXIgb3Igbm90IHRoZSBDb250ZXh0IGhhcyBhIENvbnRhaW5lclxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmhhc0NhbWVyYSB3aGV0aGVyIG9yIG5vdCB0aGUgQ29udGV4dCBoYXMgYSBDYW1lcmFcbiAqL1xuZnVuY3Rpb24gQ29udGV4dChvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zIHx8IHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JyB8fCAoIW9wdGlvbnMuc2l6ZSAmJiAhb3B0aW9ucy5wYXJlbnRFbCAmJiAhb3B0aW9ucy5jb250YWluZXIpKSB0aHJvdyBuZXcgRXJyb3IoJ0NvbnRleHQsIG11c3QgYmUgY2FsbGVkIHdpdGggYW4gb3B0aW9uIGhhc2ggdGhhdCBhdCBsZWFzdCBoYXMgYSBzaXplIG9yIGEgcGFyZW50RWwgb3IgYSBjb250YWluZXIgcHJvcGVydHknKTtcbiAgICBFbnRpdHkuY2FsbCh0aGlzKTtcbiAgICBFbnRpdHlSZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCAnQ29udGV4dHMnKTtcbiAgICB0aGlzLl9yb290SUQgPSB0aGlzLl9pZDtcbiAgICB0aGlzLl9wYXJlbnRFbCA9IG9wdGlvbnMucGFyZW50RWw7XG4gICAgdGhpcy5fc2l6ZSAgICAgPSBfZ2V0U2l6ZShvcHRpb25zKTtcbiAgICB0aGlzLl9jb21wb25lbnRzLnNpemUuc2V0UGl4ZWxzLmFwcGx5KHRoaXMuX2NvbXBvbmVudHMuc2l6ZSwgdGhpcy5fc2l6ZSk7XG4gICAgdGhpcy5fY29tcG9uZW50cy5vcGFjaXR5LnNldC5jYWxsKHRoaXMuX2NvbXBvbmVudHMub3BhY2l0eSwgMSk7XG4gICAgdGhpcy5fY29tcG9uZW50cy50cmFuc2Zvcm0uX3VwZGF0ZSgoMSA8PCAxNikgLSAxLCBvcHRpb25zLnRyYW5zZm9ybSk7XG4gICAgaWYgKG9wdGlvbnMuaGFzQ29udGFpbmVyICE9PSBmYWxzZSkgdGhpcy5fY29tcG9uZW50cy5jb250YWluZXIgPSBuZXcgQ29udGFpbmVyKHRoaXMuX2lkLCBvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucy5oYXNDYW1lcmEgICAgIT09IGZhbHNlKSB0aGlzLl9jb21wb25lbnRzLmNhbWVyYSAgICA9IG5ldyBDYW1lcmEodGhpcywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQSBtZXRob2QgZm9yIGRldGVybWluaW5nIHdoYXQgdGhlIHNpemUgb2YgdGhlIENvbnRleHQgaXMuXG4gKiAgV2lsbCBiZSB0aGUgdXNlciBkZWZpbmVkIHNpemUgaWYgb25lIHdhcyBwcm92aWRlZCBvdGhlcndpc2UgaXRcbiAqICB3aWxsIGRlZmF1bHQgdG8gdGhlIERPTSByZXByZXNlbnRhdGlvbi4gIFxuICpcbiAqIEBtZXRob2QgX2dldFNpemVcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyBzdGFydGluZyBvcHRpb25zIGZvciB0aGUgc2l6ZXNcbiAqIEByZXR1cm4ge0FycmF5fSBzaXplIG9mIHRoZSBDb250ZXh0XG4gKi9cbmZ1bmN0aW9uIF9nZXRTaXplKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5zaXplKSAgICAgIHJldHVybiBvcHRpb25zLnNpemU7XG4gICAgaWYgKG9wdGlvbnMuY29udGFpbmVyKSByZXR1cm4gW29wdGlvbnMuY29udGFpbmVyLm9mZnNldFdpZHRoLCBvcHRpb25zLmNvbnRhaW5lci5vZmZzZXRIZWlnaHQsIDBdO1xuICAgIHJldHVybiBbb3B0aW9ucy5wYXJlbnRFbC5vZmZzZXRXaWR0aCwgb3B0aW9ucy5wYXJlbnRFbC5vZmZzZXRIZWlnaHQsIDBdO1xufVxuXG5Db250ZXh0LnByb3RvdHlwZSAgICAgICAgICAgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZShFbnRpdHkucHJvdG90eXBlKTtcbkNvbnRleHQucHJvdG90eXBlLmNvbnN0cnVjdG9yICAgICAgICAgPSBDb250ZXh0O1xuQ29udGV4dC5wcm90b3R5cGUudXBkYXRlICAgICAgICAgICAgICA9IG51bGw7XG5Db250ZXh0LnByb3RvdHlwZS5yZWdpc3RlckNvbXBvbmVudCAgID0gbnVsbDtcbkNvbnRleHQucHJvdG90eXBlLmRlcmVnaXN0ZXJDb21wb25lbnQgPSBudWxsO1xuQ29udGV4dC5wcm90b3R5cGUuYWRkQ29tcG9uZW50ICAgICAgICA9IG51bGw7XG5Db250ZXh0LnByb3RvdHlwZS5yZW1vdmVDb21wb25lbnQgICAgID0gbnVsbDtcbkNvbnRleHQucHJvdG90eXBlLmdldFZpZXdwb3J0U2l6ZSAgICAgPSBmdW5jdGlvbiBnZXRWaWV3cG9ydFNpemUoKSB7XG4gICAgaWYgKHRoaXMuX2NvbXBvbmVudHMuY29udGFpbmVyKSByZXR1cm4gdGhpcy5fY29tcG9uZW50cy5jb250YWluZXIuZ2V0U2l6ZSgpO1xuICAgIHJldHVybiB0aGlzLmdldFNpemUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGV4dDtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICogICAgICAgICBcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENvcmVTeXN0ZW0gICAgID0gcmVxdWlyZSgnLi9TeXN0ZW1zL0NvcmVTeXN0ZW0nKSxcbiAgICBPcHRpb25zTWFuYWdlciA9IHJlcXVpcmUoJy4vT3B0aW9uc01hbmFnZXInKSxcbiAgICBET01yZW5kZXJlciAgICA9IHJlcXVpcmUoJy4vUmVuZGVyZXJzL0RPTXJlbmRlcmVyJyksXG4gICAgR0xyZW5kZXJlciAgICAgPSByZXF1aXJlKCcuL1JlbmRlcmVycy9XZWJHTFJlbmRlcmVyJyksXG4gICAgUmVuZGVyU3lzdGVtICAgPSByZXF1aXJlKCcuL1N5c3RlbXMvUmVuZGVyU3lzdGVtJyksXG4gICAgQmVoYXZpb3JTeXN0ZW0gPSByZXF1aXJlKCcuL1N5c3RlbXMvQmVoYXZpb3JTeXN0ZW0nKSxcbiAgICBUaW1lU3lzdGVtICAgICA9IHJlcXVpcmUoJy4vU3lzdGVtcy9UaW1lU3lzdGVtJyksXG4gICAgTGlmdFN5c3RlbSAgICAgPSByZXF1aXJlKCcuLi90cmFuc2l0aW9ucy9MaWZ0U3lzdGVtJyksXG4gICAgUGh5c2ljc1N5c3RlbSAgPSByZXF1aXJlKCcuLi9waHlzaWNzL1BoeXNpY3NTeXN0ZW0nKSxcbiAgICBDb250ZXh0ICAgICAgICA9IHJlcXVpcmUoJy4vQ29udGV4dCcpO1xuXG5yZXF1aXJlKCcuL1N0eWxlc2hlZXQvZmFtb3VzLmNzcycpO1xuXG52YXIgb3B0aW9ucyA9IHtcbiAgICBsb29wICAgICAgOiB0cnVlLFxuICAgIGRpcmVjdGlvbiA6IDEsXG4gICAgc3BlZWQgICAgIDogMSxcbiAgICByZW5kZXJpbmcgOiB7XG4gICAgICAgIHJlbmRlcmVyczoge1xuICAgICAgICAgICAgRE9NOiBET01yZW5kZXJlcixcbiAgICAgICAgICAgIEdMOiBHTHJlbmRlcmVyXG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBUT0RPOiB3aGF0IGlzIHRoaXMgZG9pbmcgaGVyZT9cbmRvY3VtZW50Lm9udG91Y2htb3ZlID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vLyBTdGF0ZVxudmFyIExPT1AgICAgICAgICAgICAgICAgID0gJ2xvb3AnLFxuICAgIFJFTkRFUklORyAgICAgICAgICAgID0gJ3JlbmRlcmluZycsXG4gICAgb3B0aW9uc01hbmFnZXIgICAgICAgPSBuZXcgT3B0aW9uc01hbmFnZXIob3B0aW9ucyksXG4gICAgc3lzdGVtcyAgICAgICAgICAgICAgPSBbUmVuZGVyU3lzdGVtLCBCZWhhdmlvclN5c3RlbSwgTGlmdFN5c3RlbSwgQ29yZVN5c3RlbSwgUGh5c2ljc1N5c3RlbSwgVGltZVN5c3RlbV0sIC8vIFdlJ3JlIGdvaW5nIGJhY2t3YXJkc1xuICAgIGN1cnJlbnRSZWxhdGl2ZUZyYW1lID0gMCxcbiAgICBjdXJyZW50QWJzb2x1dGVGcmFtZSA9IDA7XG5cbmZ1bmN0aW9uIHNldFJlbmRlcmVycyhyZW5kZXJlcnMpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gcmVuZGVyZXJzKSB7XG4gICAgICAgIFJlbmRlclN5c3RlbS5yZWdpc3RlcihrZXksIHJlbmRlcmVyc1trZXldKTtcbiAgICB9XG59XG5cbnNldFJlbmRlcmVycyhvcHRpb25zLnJlbmRlcmluZy5yZW5kZXJlcnMpO1xuXG5vcHRpb25zTWFuYWdlci5vbignY2hhbmdlJywgZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmIChkYXRhLmlkID09PSBMT09QKSB7XG4gICAgICAgIGlmIChkYXRhLnZhbHVlKSB7XG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoRW5naW5lLmxvb3ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChkYXRhLmlkID09PSBSRU5ERVJJTkcpIHtcbiAgICAgICAgc2V0UmVuZGVyZXJzKGRhdGEudmFsdWUucmVuZGVyZXJzKTtcbiAgICB9XG59KTtcblxuLyoqXG4gKiBUaGUgc2luZ2xldG9uIG9iamVjdCBpbml0aWF0ZWQgdXBvbiBwcm9jZXNzXG4gKiAgIHN0YXJ0dXAgd2hpY2ggbWFuYWdlcyBhbGwgYWN0aXZlIFN5c3RlbXMgYW5kIGFjdHMgYXMgYVxuICogICBmYWN0b3J5IGZvciBuZXcgQ29udGV4dHMvXG4gKlxuICogICBPbiBzdGF0aWMgaW5pdGlhbGl6YXRpb24sIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgaXMgY2FsbGVkIHdpdGhcbiAqICAgICB0aGUgZXZlbnQgbG9vcCBmdW5jdGlvbi5cbiAqICAgICBcbiAqIEBjbGFzcyBFbmdpbmVcbiAqIEBzaW5nbGV0b25cbiAqL1xudmFyIEVuZ2luZSA9IHt9O1xuXG4vKipcbiAqIENhbGxzIHVwZGF0ZSBvbiBlYWNoIG9mIHRoZSBjdXJyZW50bHkgcmVnaXN0ZXJlZCBzeXN0ZW1zLlxuICogXG4gKiBAbWV0aG9kIHN0ZXBcbiAqL1xuRW5naW5lLnN0ZXAgPSBmdW5jdGlvbiBzdGVwKHRpbWVzdGFtcCkge1xuICAgIGN1cnJlbnRSZWxhdGl2ZUZyYW1lICs9IG9wdGlvbnMuZGlyZWN0aW9uICogb3B0aW9ucy5zcGVlZDtcbiAgICBjdXJyZW50QWJzb2x1dGVGcmFtZSsrO1xuICAgIHZhciBpID0gc3lzdGVtcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgc3lzdGVtc1tpXS51cGRhdGUodGltZXN0YW1wLCBjdXJyZW50UmVsYXRpdmVGcmFtZSwgY3VycmVudEFic29sdXRlRnJhbWUpOy8vIEkgdG9sZCB5b3Ugc29cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgdGhhdCB3aWxsIHN0ZXAgXG4gKiBcbiAqIEBtZXRob2QgbG9vcFxuICovXG5FbmdpbmUubG9vcCA9IGZ1bmN0aW9uIGxvb3AodGltZXN0YW1wKSB7XG4gICAgaWYgKG9wdGlvbnMubG9vcCkge1xuICAgICAgICBFbmdpbmUuc3RlcCh0aW1lc3RhbXApO1xuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoRW5naW5lLmxvb3ApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uIF9sb29wRm9yKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRpbWVzdGFtcCkge1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIEVuZ2luZS5zdGVwKHRpbWVzdGFtcCk7XG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoX2xvb3BGb3IodmFsdWUgLSAxKSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5FbmdpbmUubG9vcEZvciA9IGZ1bmN0aW9uIGxvb3BGb3IodmFsdWUpIHtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoX2xvb3BGb3IodmFsdWUpKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQSB3cmFwcGVyIGZvciB0aGUgXCJET01Db250ZW50TG9hZGVkXCIgZXZlbnQuICBXaWxsIGV4ZWN1dGVcbiAqICAgYSBnaXZlbiBmdW5jdGlvbiBvbmNlIHRoZSBET00gaGF2ZSBiZWVuIGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kIHJlYWR5XG4gKiBcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBGdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgRE9NIGxvYWRpbmdcbiAqL1xuRW5naW5lLnJlYWR5ID0gZnVuY3Rpb24gcmVhZHkoZm4pIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGxpc3RlbmVyKTtcbiAgICAgICAgZm4oKTtcbiAgICB9O1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBsaXN0ZW5lcik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdpbGwgY3JlYXRlIGEgYnJhbmQgbmV3IENvbnRleHQuICBJRiBhIHBhcmVudCBlbGVtZW50IGlzIG5vdCBwcm92aWRlZCxcbiAqICAgaXQgaXMgYXNzdW1lZCB0byBiZSB0aGUgYm9keSBvZiB0aGUgZG9jdW1lbnQuXG4gKlxuICogQG1ldGhvZCBjcmVhdGVDb250ZXh0XG4gKiBcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyBPcHRpb25zIGZvciB0aGUgQ29udGV4dFxuICogQHJldHVybiB7Q29udGV4dH0gbmV3IENvbnRleHQgaW5zdGFuY2VcbiAqL1xuRW5naW5lLmNyZWF0ZUNvbnRleHQgPSBmdW5jdGlvbiBjcmVhdGVDb250ZXh0KG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBlbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihvcHRpb25zKTtcbiAgICAgICAgaWYgKCEoZWxlbSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSkgdGhyb3cgbmV3IEVycm9yKCd0aGUgcGFzc2VkIGluIHN0cmluZyBzaG91bGQgYmUgYSBxdWVyeSBzZWxlY3RvciB3aGljaCByZXR1cm5zIGFuIGVsZW1lbnQgZnJvbSB0aGUgZG9tJyk7XG4gICAgICAgIGVsc2UgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh7cGFyZW50RWw6IGVsZW19KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucyBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KVxuICAgICAgICByZXR1cm4gbmV3IENvbnRleHQoe3BhcmVudEVsOiBvcHRpb25zfSk7XG5cbiAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh7cGFyZW50RWw6IGRvY3VtZW50LmJvZHl9KTsgLy8gVE9ETyBpdCBzaG91bGQgYmUgcG9zc2libGUgdG8gZGVsYXkgYXNzaWduaW5nIGRvY3VtZW50LmJvZHkgdW50aWwgdGhpcyBoaXRzIHRoZSByZW5kZXIgc3RhZ2UuIFRoaXMgd291bGQgcmVtb3ZlIHRoZSBuZWVkIGZvciBFbmdpbmUucmVhZHlcblxuICAgIGlmICghb3B0aW9ucy5wYXJlbnRFbCAmJiAhb3B0aW9ucy5jb250YWluZXIpXG4gICAgICAgIG9wdGlvbnMucGFyZW50RWwgPSBkb2N1bWVudC5ib2R5O1xuXG4gICAgcmV0dXJuIG5ldyBDb250ZXh0KG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgc3lzdGVtIHRvIHRoZSBsaXN0IG9mIHN5c3RlbXMgdG8gdXBkYXRlIG9uIGEgcGVyIGZyYW1lIGJhc2lzXG4gKlxuICogQG1ldGhvZCBhZGRTeXN0ZW1cbiAqIFxuICogQHBhcmFtIHtTeXN0ZW19IHN5c3RlbSBTeXN0ZW0gdG8gZ2V0IHJ1biBldmVyeSBmcmFtZVxuICovXG5FbmdpbmUuYWRkU3lzdGVtID0gZnVuY3Rpb24gYWRkU3lzdGVtKHN5c3RlbSkge1xuICAgIGlmIChzeXN0ZW0gaW5zdGFuY2VvZiBPYmplY3QgJiYgc3lzdGVtLnVwZGF0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgICAgICByZXR1cm4gc3lzdGVtcy5zcGxpY2Uoc3lzdGVtcy5pbmRleE9mKFJlbmRlclN5c3RlbSkgKyAxLCAwLCBzeXN0ZW0pO1xuICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCdzeXN0ZW1zIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggYW4gdXBkYXRlIG1ldGhvZCcpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgc3lzdGVtIGZyb20gdGhlIGxpc3Qgb2Ygc3lzdGVtcyB0byB1cGRhdGUgb24gYSBwZXIgZnJhbWUgYmFzaXNcbiAqXG4gKiBAbWV0aG9kIHJlbW92ZVN5c3RlbVxuICogXG4gKiBAcGFyYW0ge1N5c3RlbX0gc3lzdGVtIFN5c3RlbSB0byBnZXQgcnVuIGV2ZXJ5IGZyYW1lXG4gKi9cbkVuZ2luZS5yZW1vdmVTeXN0ZW0gPSBmdW5jdGlvbiByZW1vdmVTeXN0ZW0oc3lzdGVtKSB7XG4gICAgaWYgKHN5c3RlbSBpbnN0YW5jZW9mIE9iamVjdCAmJiBzeXN0ZW0udXBkYXRlIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIGluZGV4ID0gc3lzdGVtcy5pbmRleE9mKHN5c3RlbSk7XG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgc3lzdGVtcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKCdzeXN0ZW1zIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggYW4gdXBkYXRlIG1ldGhvZCcpO1xufTtcblxuLyoqXG4gKiBEZWxlZ2F0ZSB0byB0aGUgb3B0aW9uc01hbmFnZXIuXG4gKlxuICogQG1ldGhvZCBzZXRPcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE9wdGlvbnMgdG8gcGF0Y2hcbiAqL1xuRW5naW5lLnNldE9wdGlvbnMgPSBvcHRpb25zTWFuYWdlci5zZXRPcHRpb25zLmJpbmQob3B0aW9uc01hbmFnZXIpO1xuXG4vKipcbiAqIFNldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBmbG93IG9mIHRpbWUuXG4gKlxuICogQG1ldGhvZCBzZXREaXJlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbCBkaXJlY3Rpb24gYXMgLTEgb3IgMVxuICovXG5FbmdpbmUuc2V0RGlyZWN0aW9uID0gZnVuY3Rpb24gc2V0RGlyZWN0aW9uKHZhbCkge1xuICAgIGlmICh2YWwgIT09IDEgJiYgdmFsICE9PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdkaXJlY3Rpb24gbXVzdCBiZSBlaXRoZXIgMSBmb3IgZm9yd2FyZCBvciAtMSBmb3IgcmV2ZXJzZScpO1xuICAgIG9wdGlvbnNNYW5hZ2VyLnNldCgnZGlyZWN0aW9uJywgdmFsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGZsb3cgb2YgdGltZS5cbiAqXG4gKiBAbWV0aG9kIGdldERpcmVjdGlvblxuICogXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGRpcmVjdGlvbiBhcyAtMSBvciAxXG4gKi9cbkVuZ2luZS5nZXREaXJlY3Rpb24gPSBmdW5jdGlvbiBnZXREaXJlY3Rpb24oKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZGlyZWN0aW9uO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIHNwZWVkIG9mIHRpbWUuXG4gKlxuICogQG1ldGhvZCBzZXRTcGVlZFxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsIHJhdGlvIHRvIGh1bWFuIHRpbWVcbiAqL1xuRW5naW5lLnNldFNwZWVkID0gZnVuY3Rpb24gc2V0U3BlZWQodmFsKSB7XG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdudW1iZXInKSB0aHJvdyBuZXcgRXJyb3IoJ3NwZWVkIG11c3QgYmUgYSBudW1iZXIsIHVzZWQgYXMgYSBzY2FsZSBmYWN0b3IgZm9yIHRoZSBtb3ZlbWVudCBvZiB0aW1lJyk7XG4gICAgb3B0aW9uc01hbmFnZXIuc2V0KCdzcGVlZCcsIHZhbCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgc3BlZWQgb2YgdGltZS5cbiAqXG4gKiBAbWV0aG9kIGdldFNwZWVkXG4gKiBcbiAqIEByZXR1cm4ge051bWJlcn0gdmFsIHJhdGlvIHRvIGh1bWFuIHRpbWVcbiAqL1xuRW5naW5lLmdldFNwZWVkID0gZnVuY3Rpb24gZ2V0U3BlZWQoKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuc3BlZWQ7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCBmcmFtZVxuICpcbiAqIEBtZXRob2QgZ2V0QWJzb2x1dGVGcmFtZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGN1cnJlbnQgZnJhbWUgbnVtYmVyXG4gKi9cbkVuZ2luZS5nZXRBYnNvbHV0ZUZyYW1lID0gZnVuY3Rpb24gZ2V0QWJzb2x1dGVGcmFtZSgpIHtcbiAgICByZXR1cm4gY3VycmVudEFic29sdXRlRnJhbWU7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCBmcmFtZSB0YWtpbmcgaW50byBhY2NvdW50IGVuZ2luZSBzcGVlZCBhbmQgZGlyZWN0aW9uXG4gKlxuICogQG1ldGhvZCBnZXRSZWxhdGl2ZUZyYW1lXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgY3VycmVudCBmcmFtZSBudW1iZXIgdGFraW5nIGludG8gYWNjb3VudCBFbmdpbmUgc3BlZWQgYW5kIGRpcmVjdGlvblxuICovXG5FbmdpbmUuZ2V0UmVsYXRpdmVGcmFtZSA9IGZ1bmN0aW9uIGdldFJlbGF0aXZlRnJhbWUoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRSZWxhdGl2ZUZyYW1lO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbmdpbmU7XG5cbi8vU3RhcnQgdGhlIGxvb3BcbkVuZ2luZS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoRW5naW5lLmxvb3ApO1xufSk7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqICAgICAgICAgXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4vRW50aXR5UmVnaXN0cnknKSxcbiAgICBUcmFuc2Zvcm0gICAgICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50cy9UcmFuc2Zvcm0nKSxcbiAgICBTaXplICAgICAgICAgICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50cy9TaXplJyksXG4gICAgT3BhY2l0eSAgICAgICAgPSByZXF1aXJlKCcuL0NvbXBvbmVudHMvT3BhY2l0eScpO1xuXG4vKipcbiAqIEVudGl0eSBpcyB0aGUgY29yZSBvZiB0aGUgRmFtby51cyBzY2VuZSBncmFwaC4gIFRoZSBzY2VuZSBncmFwaFxuICogICBpcyBjb25zdHJ1Y3RlZCBieSBhZGRpbmcgRW50aXR5cyB0byBvdGhlciBFbnRpdGllcyB0byBkZWZpbmUgaGVpcmFyY2h5LlxuICogICBFYWNoIEVudGl0eSBjb21lcyB3aXRoIGEgVHJhbnNmb3JtIGNvbXBvbmVudCB3aXRoIHRoZVxuICogICBhYmlsaXR5IHRvIGFkZCBpbmZpbml0ZSBvdGhlciBjb21wb25lbnRzLiAgSXQgYWxzbyBhY3RzIGFzIGEgZmFjdG9yeSBieSBjcmVhdGluZ1xuICogICBuZXcgRW50aXRpZXMgdGhhdCB3aWxsIGFscmVhZHkgYmUgY29uc2lkZXJlZCBpdCdzIGNoaWxkcmVuLlxuICpcbiAqIEBjbGFzcyBFbnRpdHlcbiAqIEBlbnRpdHlcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBFbnRpdHkoKSB7XG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIodGhpcywgJ0NvcmVTeXN0ZW0nKTtcblxuICAgIHRoaXMuX2NvbXBvbmVudHMgPSB7XG4gICAgICAgIHRyYW5zZm9ybSA6IG5ldyBUcmFuc2Zvcm0odGhpcy5faWQpLFxuICAgICAgICBzaXplICAgICAgOiBuZXcgU2l6ZSh0aGlzLl9pZCksXG4gICAgICAgIG9wYWNpdHkgICA6IG5ldyBPcGFjaXR5KHRoaXMuX2lkKVxuICAgIH07XG5cbiAgICB0aGlzLl9iZWhhdmlvcnMgPSBbXTtcblxuICAgIHRoaXMuX3BhcmVudElEICAgPSBudWxsO1xuICAgIHRoaXMuX3Jvb3RJRCAgICAgPSBudWxsO1xuXG4gICAgdGhpcy5fY2hpbGRyZW5JRHMgPSBbXTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgbmV3IGluc3RhbmNlIG9mIGEgY29tcG9uZW50IHRvIHRoZSBFbnRpdHkuXG4gKlxuICogQG1ldGhvZCAgcmVnaXN0ZXJDb21wb25lbnRcbiAqIFxuICogQHBhcmFtICB7RnVuY3Rpb259IENvbnN0cnVjdG9yIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBhIGNvbXBvbmVudFxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIG9wdGlvbnMgdG8gYmUgcGFzc2VkIGludG8gdGhlIGNvbnN0cnVjdG9yXG4gKiBAcmV0dXJuIHtPYmplY3R9IGluc3RhbmNlIG9mIHRoZSBpbnN0YW50aXRhdGVkIGNvbXBvbmVudFxuICovXG5cbkVudGl0eS5wcm90b3R5cGUucmVnaXN0ZXJDb21wb25lbnQgPSBmdW5jdGlvbiByZWdpc3RlckNvbXBvbmVudChDb25zdHJ1Y3Rvciwgb3B0aW9ucykge1xuICAgIGlmICghQ29uc3RydWN0b3IgfHwgIShDb25zdHJ1Y3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgdGhyb3cgbmV3IEVycm9yKCdUaGUgZmlyc3QgYXJndW1lbnQgdG8gLnJlZ2lzdGVyQ29tcG9uZW50IG11c3QgYmUgYSBjb21wb25lbnQgQ29uc3RydWN0b3IgZnVuY3Rpb24nKTtcbiAgICBpZiAoIUNvbnN0cnVjdG9yLnRvU3RyaW5nKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIHBhc3NlZC1pbiBjb21wb25lbnQgQ29uc3RydWN0b3IgbXVzdCBoYXZlIGEgXCJ0b1N0cmluZ1wiIG1ldGhvZC4nKTtcblxuICAgIHZhciBjb21wb25lbnQgPSBuZXcgQ29uc3RydWN0b3IodGhpcy5faWQsIG9wdGlvbnMpO1xuICAgIGlmIChjb21wb25lbnQudXBkYXRlKSB0aGlzLl9iZWhhdmlvcnMucHVzaChDb25zdHJ1Y3Rvci50b1N0cmluZygpKTtcbiAgICB0aGlzLl9jb21wb25lbnRzW0NvbnN0cnVjdG9yLnRvU3RyaW5nKCldID0gY29tcG9uZW50O1xuICAgIHJldHVybiBjb21wb25lbnQ7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciByZWdpc3RlckNvbXBvbmVudFxuICogXG4gKiBAbWV0aG9kIGFkZENvbXBvbmVudFxuICovXG5FbnRpdHkucHJvdG90eXBlLmFkZENvbXBvbmVudCA9IEVudGl0eS5wcm90b3R5cGUucmVnaXN0ZXJDb21wb25lbnQ7XG5cbi8qKlxuICogUmVtb3ZlcyBhIGNvbXBvbmVudCBmcm9tIHRoZSBFbnRpdHkuXG4gKlxuICogQG1ldGhvZCBkZXJlZ2lzdGVyQ29tcG9uZW50XG4gKiBcbiAqIEBwYXJhbSAge1N0cmluZ30gdHlwZSBpZCBvZiB0aGUgY29tcG9uZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufSBzdGF0dXMgb2YgdGhlIHJlbW92YWxcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5kZXJlZ2lzdGVyQ29tcG9uZW50ID0gZnVuY3Rpb24gZGVyZWdpc3RlckNvbXBvbmVudCh0eXBlKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdFbnRpdHkuZGVyZWdpc3RlckNvbXBvbmVudCBtdXN0IGJlIHBhc3NlZCBhIFN0cmluZyBhcyB0aGUgZmlyc3QgcGFyYW1ldGVyJyk7XG4gICAgaWYgKHRoaXMuX2NvbXBvbmVudHNbdHlwZV0gPT09IHVuZGVmaW5lZCB8fCB0aGlzLl9jb21wb25lbnRzW3R5cGVdID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ25vIGNvbXBvbmVudCBvZiB0aGF0IHR5cGUnKTtcblxuICAgIHRoaXMuX2NvbXBvbmVudHNbdHlwZV0uY2xlYW51cCAmJiB0aGlzLl9jb21wb25lbnRzW3R5cGVdLmNsZWFudXAoKTtcbiAgICB0aGlzLl9jb21wb25lbnRzW3R5cGVdID0gbnVsbDtcblxuICAgIHZhciBiZWhhdmlvckluZGV4ID0gdGhpcy5fYmVoYXZpb3JzLmluZGV4T2YodHlwZSk7XG4gICAgaWYgKGJlaGF2aW9ySW5kZXggPiAtMSlcbiAgICAgICAgdGhpcy5fYmVoYXZpb3JzLnNwbGljZShiZWhhdmlvckluZGV4LCAxKTtcblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgZGVyZWdpc3RlckNvbXBvbmVudFxuICogXG4gKiBAbWV0aG9kIHJlbW92ZUNvbXBvbmVudFxuICovXG5FbnRpdHkucHJvdG90eXBlLnJlbW92ZUNvbXBvbmVudCA9IEVudGl0eS5wcm90b3R5cGUuZGVyZWdpc3RlckNvbXBvbmVudDtcblxuLyoqXG4gKiBGaW5kIG91dCBpZiB0aGUgRW50aXR5IGhhcyBhIGNvbXBvbmVudCBvZiBhIGNlcnRhaW4gbmFtZS5cbiAqXG4gKiBAbWV0aG9kIGhhc0NvbXBvbmVudFxuICogXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHR5cGUgbmFtZSBvZiB0aGUgY29tcG9uZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufSBleGlzdGFuY2Ugb2YgYSBjb21wb25lbnQgYnkgdGhhdCBuYW1lXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuaGFzQ29tcG9uZW50ID0gZnVuY3Rpb24gaGFzQ29tcG9uZW50KHR5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50c1t0eXBlXSAhPSBudWxsO1xufTtcblxuLyoqXG4gKiBHZXQgYSBjb21wb25lbnQgYnkgbmFtZVxuICpcbiAqIEBtZXRob2QgZ2V0Q29tcG9uZW50XG4gKiBcbiAqIEBwYXJhbSAge1N0cmluZ30gdHlwZSBuYW1lIG9mIHRoZSBjb21wb25lbnRcbiAqIEByZXR1cm4ge09iamVjdH0gY29tcG9uZW50IGluc3RhbmNlXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuZ2V0Q29tcG9uZW50ID0gZnVuY3Rpb24gZ2V0Q29tcG9uZW50KHR5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50c1t0eXBlXTtcbn07XG5cbi8qKlxuICogR2V0IGFsbCBvZiB0aGUgRW50aXR5J3MgY29tcG9uZW50c1xuICpcbiAqIEBtZXRob2QgZ2V0QWxsQ29tcG9uZW50c1xuICogXG4gKiBAcmV0dXJuIHtPYmplY3R9IEhhc2ggb2YgYWxsIG9mIHRoZSBjb21wb25lbnRzIGluZGV4ZWQgYnkgbmFtZSBcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5nZXRBbGxDb21wb25lbnRzID0gZnVuY3Rpb24gZ2V0QWxsQ29tcG9uZW50cygpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50cztcbn07XG5cbi8qKlxuICogR2V0IGFsbCBvZiB0aGUgY2hpbGQgbm9kZXMgaW4gdGhlIHNjZW5lIGdyYXBoXG4gKlxuICogQG1ldGhvZCAgZ2V0Q2hpbGRyZW5cbiAqIFxuICogQHJldHVybiB7QXJyYXl9IGNoaWxkIGVudGl0aWVzXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuZ2V0Q2hpbGRyZW4gPSBmdW5jdGlvbiBnZXRDaGlsZHJlbigpIHtcbiAgICB2YXIgZGVyZWZlcmVuY2VkQ2hpbGRyZW4gPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2hpbGRyZW5JRHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5KHRoaXMuX2NoaWxkcmVuSURzW2ldKTtcbiAgICAgICAgZGVyZWZlcmVuY2VkQ2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlcmVmZXJlbmNlZENoaWxkcmVuO1xufTtcblxuRW50aXR5LnByb3RvdHlwZS5nZXRQYXJlbnQgPSBmdW5jdGlvbiBnZXRQYXJlbnQoKSB7XG4gICAgcmV0dXJuIEVudGl0eVJlZ2lzdHJ5LmdldEVudGl0eSh0aGlzLl9wYXJlbnRJRCk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY29udGV4dCBvZiB0aGUgbm9kZS5cbiAqXG4gKiBAbWV0aG9kIGdldENvbnRleHRcbiAqXG4gKiBAcmV0dXJuIENvbnRleHQgTm9kZVxuICovXG5FbnRpdHkucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbiBnZXRDb250ZXh0KCkge1xuICAgIHJldHVybiBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkodGhpcy5fcm9vdElEKTtcbn07XG5cbi8qKlxuICogQWRkIGEgbmV3IEVudGl0eSBhcyBhIGNoaWxkIGFuZCByZXR1cm4gaXQuXG4gKlxuICogQG1ldGhvZCBhZGRDaGlsZFxuICpcbiAqIEByZXR1cm4ge0VudGl0eX0gY2hpbGQgRW50aXR5XG4gKi9cbkVudGl0eS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbiBhZGRDaGlsZChlbnRpdHkpIHtcbiAgICBpZiAoZW50aXR5ICE9IG51bGwgJiYgIShlbnRpdHkgaW5zdGFuY2VvZiBFbnRpdHkpKSB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgRW50aXRpZXMgY2FuIGJlIGFkZGVkIGFzIGNoaWxkcmVuIG9mIG90aGVyIGVudGl0aWVzJyk7XG4gICAgaWYgKGVudGl0eSkge1xuICAgICAgICB2YXIgaWQgPSBlbnRpdHkuX2lkO1xuICAgICAgICBpZiAodGhpcy5fY2hpbGRyZW5JRHMuaW5kZXhPZihpZCkgPiAtMSkgcmV0dXJuIHZvaWQgMDtcbiAgICAgICAgaWYgKGVudGl0eS5fcGFyZW50SUQgIT0gbnVsbCkgZW50aXR5LmdldFBhcmVudCgpLmRldGF0Y2hDaGlsZChlbnRpdHkpO1xuICAgICAgICBlbnRpdHkuX3BhcmVudElEID0gdGhpcy5faWQ7XG4gICAgICAgIF91cGRhdGVDaGlsZFJvb3QoZW50aXR5LCB0aGlzLl9yb290SUQpO1xuICAgICAgICB0aGlzLl9jaGlsZHJlbklEcy5wdXNoKGlkKTtcbiAgICAgICAgZW50aXR5LmdldENvbXBvbmVudCgndHJhbnNmb3JtJykuaW52YWxpZGF0aW9ucyB8PSAoMSA8PCAxNikgLSAxO1xuICAgICAgICByZXR1cm4gZW50aXR5O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBub2RlICAgICAgID0gbmV3IEVudGl0eSgpO1xuICAgICAgICBub2RlLl9wYXJlbnRJRCA9IHRoaXMuX2lkO1xuICAgICAgICBub2RlLl9yb290SUQgICA9IHRoaXMuX3Jvb3RJRDtcbiAgICAgICAgdGhpcy5fY2hpbGRyZW5JRHMucHVzaChub2RlLl9pZCk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIF91cGRhdGVDaGlsZFJvb3QoY2hpbGQsIHJvb3RJRCkge1xuICAgIGNoaWxkLl9yb290SUQgPSByb290SUQ7XG5cbiAgICB2YXIgZ3JhbmRDaGlsZHJlbiA9IGNoaWxkLmdldENoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBncmFuZENoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIF91cGRhdGVDaGlsZFJvb3QoZ3JhbmRDaGlsZHJlbltpXSwgcm9vdElEKVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFJlbW92ZSBhIEVudGl0eSdzIGNoaWxkLlxuICpcbiAqIEBtZXRob2QgZGV0YXRjaENoaWxkXG4gKlxuICogQHJldHVybiB7RW50aXR5fHZvaWQgMH0gY2hpbGQgRW50aXR5IG9yIHZvaWQgMCBpZiBpdCBpcyBub3QgYSBjaGlsZFxuICovXG5FbnRpdHkucHJvdG90eXBlLmRldGF0Y2hDaGlsZCA9IGZ1bmN0aW9uIGRldGF0Y2hDaGlsZChub2RlKSB7XG4gICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIEVudGl0eSkpIHRocm93IG5ldyBFcnJvcignRW50aXR5LmRldGF0Y2hDaGlsZCBvbmx5IHRha2VzIGluIEVudGl0aWVzIGFzIHRoZSBwYXJhbWV0ZXInKTtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9jaGlsZHJlbklEcy5pbmRleE9mKG5vZGUuX2lkKTtcbiAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICB0aGlzLl9jaGlsZHJlbklEcy5zcGxpY2UoaW5kZXgsIDEpWzBdO1xuICAgICAgICBub2RlLl9wYXJlbnRJRCA9IG51bGw7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0gZWxzZSByZXR1cm4gdm9pZCAwO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhpcyBFbnRpdHkgZnJvbSB0aGUgRW50aXR5UmVnaXN0cnlcbiAqXG4gKiBAbWV0aG9kIGNsZWFudXBcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5jbGVhbnVwID0gZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICBFbnRpdHlSZWdpc3RyeS5jbGVhbnVwKHRoaXMpO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgYWxsIG9mIHRoZSBjdXN0b20gY29tcG9uZW50cyBvbiB0aGUgRW50aXR5XG4gKiBcbiAqIEBtZXRob2QgdXBkYXRlXG4gKi9cbkVudGl0eS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIHZhciBpID0gdGhpcy5fYmVoYXZpb3JzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pXG4gICAgICAgIHRoaXMuX2NvbXBvbmVudHNbdGhpcy5fYmVoYXZpb3JzW2ldXS51cGRhdGUodGhpcyk7XG59O1xuXG5cbnZhciBlbXB0eVZlY3RvciA9IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKTtcblxuZnVuY3Rpb24gX2dldFNpemUoZW50aXR5LCByZXN1bHQpIHtcbiAgICB2YXIgaSAgICAgID0gZW50aXR5Ll9jaGlsZHJlbklEcy5sZW5ndGgsXG4gICAgICAgIG1hdHJpeCA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3RyYW5zZm9ybScpLl9tYXRyaXg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IEVudGl0eVJlZ2lzdHJ5LmdldEVudGl0eShlbnRpdHkuX2NoaWxkcmVuSURzW2ldKTtcbiAgICAgICAgX2dldFNpemUoY2hpbGQsIHJlc3VsdCk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIGVudGl0eS5fY29tcG9uZW50cylcbiAgICAgICAgaWYgKGVudGl0eS5fY29tcG9uZW50c1trZXldLmdldFNpemUpIHtcblxuICAgICAgICAgICAgdmFyIHNpemUgICA9IGVudGl0eS5fY29tcG9uZW50c1trZXldLmdldFNpemUoKSxcbiAgICAgICAgICAgICAgICByaWdodCAgPSBzaXplLmRpc3BsYWNlbWVudC5yaWdodCAgKyBzaXplLm9yaWdpblswXSAtIHJlc3VsdC5vcmlnaW5bMF0sXG4gICAgICAgICAgICAgICAgYm90dG9tID0gc2l6ZS5kaXNwbGFjZW1lbnQuYm90dG9tICsgc2l6ZS5vcmlnaW5bMV0gLSByZXN1bHQub3JpZ2luWzFdLFxuICAgICAgICAgICAgICAgIG5lYXIgICA9IHNpemUuZGlzcGxhY2VtZW50Lm5lYXIgICArIHNpemUub3JpZ2luWzJdIC0gcmVzdWx0Lm9yaWdpblsyXSxcbiAgICAgICAgICAgICAgICBsZWZ0ICAgPSBzaXplLmRpc3BsYWNlbWVudC5sZWZ0ICAgKyBzaXplLm9yaWdpblswXSAtIHJlc3VsdC5vcmlnaW5bMF0sXG4gICAgICAgICAgICAgICAgdG9wICAgID0gc2l6ZS5kaXNwbGFjZW1lbnQudG9wICAgICsgc2l6ZS5vcmlnaW5bMV0gLSByZXN1bHQub3JpZ2luWzFdLFxuICAgICAgICAgICAgICAgIGZhciAgICA9IHNpemUuZGlzcGxhY2VtZW50LmZhciAgICArIHNpemUub3JpZ2luWzJdIC0gcmVzdWx0Lm9yaWdpblsyXTtcblxuICAgICAgICAgICAgaWYgKHJpZ2h0ICA+IHJlc3VsdC5kaXNwbGFjZW1lbnQucmlnaHQpICByZXN1bHQuZGlzcGxhY2VtZW50LnJpZ2h0ICA9IHJpZ2h0O1xuICAgICAgICAgICAgaWYgKGJvdHRvbSA+IHJlc3VsdC5kaXNwbGFjZW1lbnQuYm90dG9tKSByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSA9IGJvdHRvbTtcbiAgICAgICAgICAgIGlmIChuZWFyICAgPiByZXN1bHQuZGlzcGxhY2VtZW50Lm5lYXIpICAgcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyICAgPSBuZWFyO1xuICAgICAgICAgICAgaWYgKGxlZnQgICA8IHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCkgICByZXN1bHQuZGlzcGxhY2VtZW50LmxlZnQgICA9IGxlZnQ7XG4gICAgICAgICAgICBpZiAodG9wICAgIDwgcmVzdWx0LmRpc3BsYWNlbWVudC50b3ApICAgIHJlc3VsdC5kaXNwbGFjZW1lbnQudG9wICAgID0gdG9wO1xuICAgICAgICAgICAgaWYgKGZhciAgICA8IHJlc3VsdC5kaXNwbGFjZW1lbnQuZmFyKSAgICByZXN1bHQuZGlzcGxhY2VtZW50LmZhciAgICA9IGZhcjtcbiAgICAgICAgfVxuXG4gICAgdmFyIHggPSBtYXRyaXhbMTJdIC0gcmVzdWx0Lm9yaWdpblswXSwgeSA9IG1hdHJpeFsxM10gLSByZXN1bHQub3JpZ2luWzFdLCB6ID0gbWF0cml4WzE0XSAtIHJlc3VsdC5vcmlnaW5bMl07XG4gICAgaWYgKHggPiByZXN1bHQuZGlzcGxhY2VtZW50LnJpZ2h0KSAgcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCAgPSB4O1xuICAgIGlmICh4IDwgcmVzdWx0LmRpc3BsYWNlbWVudC5sZWZ0KSAgIHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCAgID0geDtcbiAgICBpZiAoeSA+IHJlc3VsdC5kaXNwbGFjZW1lbnQuYm90dG9tKSByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSA9IHk7XG4gICAgaWYgKHkgPCByZXN1bHQuZGlzcGxhY2VtZW50LnRvcCkgICAgcmVzdWx0LmRpc3BsYWNlbWVudC50b3AgICAgPSB5O1xuICAgIGlmICh6ID4gcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyKSAgIHJlc3VsdC5kaXNwbGFjZW1lbnQubmVhciAgID0gejtcbiAgICBpZiAoeiA8IHJlc3VsdC5kaXNwbGFjZW1lbnQuZmFyKSAgICByZXN1bHQuZGlzcGxhY2VtZW50LmZhciAgICA9IHo7XG59XG5cbkVudGl0eS5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uIGdldFNpemUoKSB7XG4gICAgdmFyIG1hdHJpeCA9IHRoaXMuZ2V0Q29tcG9uZW50KCd0cmFuc2Zvcm0nKS5fbWF0cml4LFxuICAgICAgICBpICAgICAgPSB0aGlzLl9jaGlsZHJlbklEcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGRpc3BsYWNlbWVudDoge1xuICAgICAgICAgICAgICAgIHJpZ2h0ICA6IDAsXG4gICAgICAgICAgICAgICAgYm90dG9tIDogMCxcbiAgICAgICAgICAgICAgICBuZWFyICAgOiAwLFxuICAgICAgICAgICAgICAgIGxlZnQgICA6IDAsXG4gICAgICAgICAgICAgICAgdG9wICAgIDogMCxcbiAgICAgICAgICAgICAgICBmYXIgICAgOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JpZ2luOiBbbWF0cml4WzEyXSwgbWF0cml4WzEzXSwgbWF0cml4WzE0XV1cbiAgICB9O1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB2YXIgY2hpbGQgPSBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkodGhpcy5fY2hpbGRyZW5JRHNbaV0pO1xuICAgICAgICBfZ2V0U2l6ZShjaGlsZCwgcmVzdWx0KTtcbiAgICB9XG4gICAgcmVzdWx0LnNpemUgPSBbcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCAtIHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCwgcmVzdWx0LmRpc3BsYWNlbWVudC5ib3R0b20gLSByZXN1bHQuZGlzcGxhY2VtZW50LnRvcCwgcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyIC0gcmVzdWx0LmRpc3BsYWNlbWVudC5mYXJdO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudGl0eTtcbiIsInZhciBFbnRpdHkgICAgICAgPSByZXF1aXJlKCcuL0VudGl0eScpLFxuICAgIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4uL2V2ZW50cy9FdmVudEVtaXR0ZXInKTtcblxuZnVuY3Rpb24gRW50aXR5Q29sbGVjdGlvbihudW0pIHtcbiAgICB0aGlzLmVudGl0aWVzID0gW107XG5cbiAgICB0aGlzLklPID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdsZW5ndGgnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW50aXRpZXMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodHlwZW9mIG51bSA9PT0gJ251bWJlcicpIHdoaWxlIChudW0tLSkgdGhpcy5wdXNoKG5ldyBFbnRpdHkoKSk7XG4gICAgZWxzZSBpZiAobnVtIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgdmFyIGkgICA9IC0xLFxuICAgICAgICAgICAgbGVuID0gbnVtLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGxlbiAtICsraSkgdGhpcy5wdXNoKG51bVtpXSk7XG4gICAgfVxufVxuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gcHVzaChlbnRpdHkpIHtcbiAgICBpZiAoZW50aXR5IGluc3RhbmNlb2YgRW50aXR5KSB7XG4gICAgICAgIHRoaXMuZW50aXRpZXMucHVzaChlbnRpdHkpO1xuICAgICAgICB0aGlzLklPLmVtaXQoJ2VudGl0eUFkZGVkJywgZW50aXR5KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHRocm93IG5ldyBFcnJvcignZW50aXR5IGNvbGxlY3Rpb25zIGNhbiBvbmx5IGhhdmUgZW50aXRpZXMgYWRkZWQgdG8gdGhlbScpO1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24gcG9wKCkge1xuICAgIHZhciBlbnRpdHkgPSB0aGlzLmVudGl0aWVzLnBvcCgpO1xuICAgIHRoaXMuSU8uZW1pdCgnZW50aXR5UmVtb3ZlZCcsIGVudGl0eSk7XG4gICAgcmV0dXJuIGVudGl0eTtcbn07XG5cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24gc2hpZnQoKSB7XG4gICAgdmFyIGVudGl0eSA9IHRoaXMuZW50aXRpZXMuc2hpZnQoKTtcbiAgICB0aGlzLklPLmVtaXQoJ2VudGl0eVJlbW92ZWQnLCBlbnRpdHkpO1xuICAgIHJldHVybiBlbnRpdHk7XG59O1xuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS51bnNoaWZ0ID0gZnVuY3Rpb24gdW5zaGlmdChlbnRpdHkpIHtcbiAgICBpZiAoZW50aXR5IGluc3RhbmNlb2YgRW50aXR5KSB7XG4gICAgICAgIHRoaXMuZW50aXRpZXMuc2hpZnQoZW50aXR5KTtcbiAgICAgICAgdGhpcy5JTy5lbWl0KCdlbnRpdHlBZGRlZCcsIGVudGl0eSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2VudGl0eSBjb2xsZWN0aW9ucyBjYW4gb25seSBoYXZlIGVudGl0aWVzIGFkZGVkIHRvIHRoZW0nKTtcbn07XG5cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLnNwbGljZSA9IGZ1bmN0aW9uIHNwbGljZShpbmRleCwgaG93TWFueSwgZWxlbWVudHMpIHtcbiAgICB2YXIgaSwgbGVuO1xuICAgIGlmIChlbGVtZW50cyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGkgICA9IC0xLFxuICAgICAgICBsZW4gPSBlbGVtZW50cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChsZW4gLSArK2kpIHtcbiAgICAgICAgICAgIGlmICghKGVsZW1lbnRzW2ldIGluc3RhbmNlb2YgRW50aXR5KSkgdGhyb3cgbmV3IEVycm9yKCdlbnRpdHkgY29sbGVjdGlvbnMgY2FuIG9ubHkgaGF2ZSBlbnRpdGllcyBhZGRlZCB0byB0aGVtJyk7XG4gICAgICAgICAgICB0aGlzLmVudGl0aWVzLnNwbGljZShpbmRleCArIGhvd01hbnksIDAsIGVsZW1lbnRzW2ldKTtcbiAgICAgICAgICAgIHRoaXMuSU8uZW1pdCgnZW50aXR5QWRkZWQnLCBlbGVtZW50c1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVsZW1lbnRzIGluc3RhbmNlb2YgRW50aXR5KSB7XG4gICAgICAgIHRoaXMuZW50aXRpZXMuc3BsaWNlKGluZGV4ICsgaG93TWFueSwgMCwgZWxlbWVudHMpO1xuICAgICAgICB0aGlzLklPLmVtaXQoJ2VudGl0eUFkZGVkJywgZWxlbWVudHMpO1xuICAgIH1cbiAgICBpZiAoZWxlbWVudHMgaW5zdGFuY2VvZiBFbnRpdHlDb2xsZWN0aW9uKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgICAgICBzZWxmLmVudGl0aWVzLnNwbGljZShpbmRleCArIGhvd01hbnksIDAsIGVsZW1lbnQpO1xuICAgICAgICAgICAgc2VsZi5JTy5lbWl0KCdlbnRpdHlBZGRlZCcsIGVsZW1lbnRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciByZW1vdmVkID0gdGhpcy5lbnRpdGllcy5zcGxpY2UoaW5kZXgsIGhvd01hbnkpO1xuICAgIGkgICAgICAgICAgID0gLTE7XG4gICAgbGVuICAgICAgICAgPSByZW1vdmVkLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuIC0gKytpKSB0aGlzLklPLmVtaXQoJ2VudGl0eSByZW1vdmVkJywgcmVtb3ZlZFtpXSk7XG4gICAgcmV0dXJuIHJlbW92ZWQ7XG59O1xuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKCkge1xuICAgIHZhciBpICAgICAgPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gdGhpcy5lbnRpdGllcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IG5ldyBFbnRpdHlDb2xsZWN0aW9uKDApO1xuXG4gICAgd2hpbGUgKGxlbmd0aCAtICsraSkgcmVzdWx0LnB1c2godGhpcy5lbnRpdGllc1tpXSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gZmlsdGVyKGZuKSB7XG4gICAgdmFyIGkgICAgICA9IC0xLFxuICAgICAgICBsZW5ndGggPSB0aGlzLmVudGl0aWVzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gbmV3IEVudGl0eUNvbGxlY3Rpb24oMCk7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ0VudGl0eUNvbGxlY3Rpb24uZmlsdGVyIG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYXMgYSBwYXJhbWV0ZXInKTtcblxuICAgIHdoaWxlIChsZW5ndGggLSArK2kpIGlmIChmbih0aGlzLmVudGl0aWVzW2ldLCBpLCB0aGlzLmVudGl0aWVzKSkgcmVzdWx0LnB1c2godGhpcy5lbnRpdGllc1tpXSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucmVqZWN0ID0gZnVuY3Rpb24gcmVqZWN0KGZuKSB7XG4gICAgdmFyIGkgICAgICA9IC0xLFxuICAgICAgICBsZW5ndGggPSB0aGlzLmVudGl0aWVzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gbmV3IEVudGl0eUNvbGxlY3Rpb24oMCk7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ0VudGl0eUNvbGxlY3Rpb24ucmVqZWN0IG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYXMgYSBwYXJhbWV0ZXInKTtcblxuICAgIHdoaWxlIChsZW5ndGggLSArK2kpIGlmICghZm4odGhpcy5lbnRpdGllc1tpXSwgaSwgdGhpcy5lbnRpdGllcykpIHJlc3VsdC5wdXNoKHRoaXMuZW50aXRpZXNbaV0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogRXhlY3V0ZSBhIGZ1bmN0aW9uIHRoYXQgaXRlcmF0ZXMgb3ZlciB0aGUgY29sbGVjdGlvblxuICogIG9mIEVudGl0aWVzIGFuZCBjYWxscyBhIGZ1bmN0aW9uIHdoZXJlIHRoZSBwYXJhbWV0ZXJzXG4gKiAgYXJlLCB0aGUgRW50aXR5LCBpbmRleCwgYW5kIGZ1bGwgY29sbGVjdGlvbiBvZiBFbnRpdGllcy5cbiAqXG4gKiBAbWV0aG9kIGZvckVhY2hcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gdG8gYmUgcnVuIHBlciBFbnRpdHlcbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2goZm4pIHtcbiAgICB2YXIgaSAgICAgID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IHRoaXMuZW50aXRpZXMubGVuZ3RoO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdFbnRpdHlDb2xsZWN0aW9uLmZvckVhY2ggb25seSBhY2NlcHRzIGZ1bmN0aW9ucyBhcyBhIHBhcmFtZXRlcicpO1xuXG4gICAgd2hpbGUgKGxlbmd0aCAtICsraSkgZm4odGhpcy5lbnRpdGllc1tpXSwgaSwgdGhpcy5lbnRpdGllcyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEltcGxlbWVudHMgcmVkdWNlIG9uIHRoZSBjb2xsZWN0aW9uIG9mIEVudGl0aWVzXG4gKlxuICogQG1ldGhvZCByZWR1Y2VcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gdG8gYmUgcnVuIHBlciBFbnRpdHlcbiAqIEBwYXJhbSB7Kn0gaW5pdGlhbFZhbHVlIGluaXRpYWwgdmFsdWUgb2YgdGhlIHJlZHVjZSBmdW5jdGlvblxuICogXG4gKiBAcmV0dXJuIHsqfSB2YWx1ZSBhZnRlciBlYWNoIEVudGl0eSBoYXMgaGFkIHRoZSBmdW5jdGlvbiBydW5cbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucmVkdWNlID0gZnVuY3Rpb24gcmVkdWNlKGZuLCBpbml0aWFsVmFsdWUpIHtcbiAgICB2YXIgaSAgICAgID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IHRoaXMuZW50aXRpZXMubGVuZ3RoLFxuICAgICAgICBhY2N1bXVsYXRvcjtcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignRW50aXR5Q29sbGVjdGlvbi5yZWR1Y2Ugb25seSBhY2NlcHRzIGZ1bmN0aW9ucyBhcyBhIHBhcmFtZXRlcicpO1xuXG4gICAgaWYgKGluaXRpYWxWYWx1ZSAhPSBudWxsKSBhY2N1bXVsYXRvciA9IGluaXRpYWxWYWx1ZTtcbiAgICBlbHNlICAgICAgICAgICAgICAgICAgICAgIGFjY3VtdWxhdG9yID0gdGhpcy5lbnRpdGllc1srK2ldO1xuICAgIHdoaWxlIChsZW5ndGggLSArK2kpICAgICAgYWNjdW11bGF0b3IgPSBmbihhY2N1bXVsYXRvciwgdGhpcy5lbnRpdGllc1tpXSwgaSwgdGhpcy5lbnRpdGllcyk7XG5cbiAgICByZXR1cm4gYWNjdW11bGF0b3I7XG59O1xuXG4vKipcbiAqIEltcGxlbWVudHMgbWFwIG9uIHRoZSBjb2xsZWN0aW9uIG9mIEVudGl0aWVzXG4gKlxuICogQG1ldGhvZCBtYXBcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gdG8gYmUgcnVuIHBlciBFbnRpdHlcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYXJyYXkgb2YgdGhlIHJldHVybiB2YWx1ZXMgb2YgdGhlIG1hcHBpbmcgZnVuY3Rpb25cbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwKGZuKSB7XG4gICAgdmFyIGkgICAgICA9IC0xLFxuICAgICAgICBsZW5ndGggPSB0aGlzLmVudGl0aWVzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ0VudGl0eUNvbGxlY3Rpb24ubWFwIG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYXMgYSBwYXJhbWV0ZXInKTtcblxuICAgIHdoaWxlIChsZW5ndGggLSArK2kpIHJlc3VsdC5wdXNoKGZuKHRoaXMuZW50aXRpZXNbaV0sIGksIHRoaXMuZW50aXRpZXMpKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIERlbGVnYXRlcyB0byB0aGUgRXZlbnRIYW5kbGVycyBcIm9uXCJcbiAqXG4gKiBAbWV0aG9kIG9uXG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuSU8ub24uYXBwbHkodGhpcy5JTywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogRGVsZWdhdGVzIHRvIHRoZSBFdmVudEhhbmRsZXJzIFwib25cIlxuICpcbiAqIEBtZXRob2Qgb2ZmXG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uIG9mZigpIHtcbiAgICByZXR1cm4gdGhpcy5JTy5yZW1vdmVMaXN0ZW5lci5hcHBseSh0aGlzLklPLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBGaW5kIHdoZXJlIGFuZCBpZiBhbiBFbnRpdHkgaXMgaW4gdGhlIGFycmF5XG4gKlxuICogQG1ldGhvZCBpbmRleE9mXG4gKiBcbiAqIEByZXN1bHQge051bWJlcn0gaW5kZXggb2YgRW50aXR5IGluIHRoZSBhcnJheVxuICovXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZigpIHtcbiAgICByZXR1cm4gdGhpcy5lbnRpdGllcy5pbmRleE9mLmFwcGx5KHRoaXMuZW50aXRpZXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYW5kIGVudGl0eSBmcm9tIHRoZSBhcnJheSBhbmQgZW1pdHMgYSBtZXNzYWdlXG4gKlxuICogQG1ldGhvZCByZW1vdmVcbiAqIFxuICogQHJlc3VsdCB7RW50aXR5fSByZW1vdmVkIEVudGl0eVxuICovXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUoZW50aXR5KSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5lbnRpdGllcy5pbmRleE9mKGVudGl0eSk7XG4gICAgdGhpcy5JTy5lbWl0KCdlbnRpdHkgcmVtb3ZlZCcsIGVudGl0eSk7XG4gICAgaWYgKGluZGV4IDwgMCkgcmV0dXJuIGZhbHNlO1xuICAgIGVsc2UgICAgICAgICAgIHJldHVybiB0aGlzLmVudGl0aWVzLnNwbGljZShpbmRleCwgMSlbMF07XG59O1xuXG4vKipcbiAqIEdldCB0aGUgRW50aXR5IGFyZSBhIHBhcnRpY3VsYXIgaW5kZXhcbiAqXG4gKiBAbWV0aG9kIGdldFxuICogXG4gKiBAcmVzdWx0IHtFbnRpdHl9IEVudGl0eSBhdCB0aGF0IGluZGV4XG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldChpbmRleCkge1xuICAgIHJldHVybiB0aGlzLmVudGl0aWVzW2luZGV4XTtcbn07XG5cbi8qKlxuICogRmluZCBvZiBpZiB0aGUgRW50aXR5Q29sbGVjdGlvbiBoYXMgYW4gRW50aXR5XG4gKlxuICogQG1ldGhvZCBoYXNcbiAqIFxuICogQHJlc3VsdCB7Qm9vbGVhbn0gZXhpc3RlbmNlIG9mIHRoZSBFbnRpdHkgaW4gdGhlIEVudGl0eUNvbGxlY3Rpb25cbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24gaGFzKGVudGl0eSkge1xuICAgIHJldHVybiB0aGlzLmVudGl0aWVzLmluZGV4T2YoZW50aXR5KSAhPT0gLTE7XG59O1xuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5yZXZlcnNlID0gZnVuY3Rpb24gcmV2ZXJzZSgpIHtcbiAgICB2YXIgaSAgICAgID0gdGhpcy5lbnRpdGllcy5sZW5ndGg7XG4gICAgICAgIHJlc3VsdCA9IG5ldyBFbnRpdHlDb2xsZWN0aW9uKDApO1xuXG4gICAgd2hpbGUgKGktLSkgcmVzdWx0LnB1c2godGhpcy5lbnRpdGllc1tpXSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmZ1bmN0aW9uIF9tZXJnZShsZWZ0LCByaWdodCwgYXJyLCBjb21wYXJpc29uKSB7XG4gICAgdmFyIGEgPSAwO1xuICAgIHdoaWxlIChsZWZ0Lmxlbmd0aCAmJiByaWdodC5sZW5ndGgpIGFyclthKytdID0gY29tcGFyaXNvbihsZWZ0WzBdLCByaWdodFswXSkgPCAwID8gbGVmdC5zaGlmdCgpIDogcmlnaHQuc2hpZnQoKTtcbiAgICB3aGlsZSAobGVmdC5sZW5ndGgpIGFyclthKytdID0gbGVmdC5zaGlmdCgpO1xuICAgIHdoaWxlIChyaWdodC5sZW5ndGgpIGFyclthKytdID0gcmlnaHQuc2hpZnQoKTtcbn1cblxuZnVuY3Rpb24gX21Tb3J0KGFyciwgdG1wLCBsLCBjb21wYXJpc29uKSB7XG4gICAgaWYgKGw9PT0xKSByZXR1cm47XG4gICAgdmFyIG0gPSAobC8yKXwwLFxuICAgICAgICB0bXBfbCA9IHRtcC5zbGljZSgwLCBtKSxcbiAgICAgICAgdG1wX3IgPSB0bXAuc2xpY2UobSk7XG4gICAgX21Tb3J0KHRtcF9sLCBhcnIuc2xpY2UoMCwgbSksICBtLCBjb21wYXJpc29uKTtcbiAgICBfbVNvcnQodG1wX3IsIGFyci5zbGljZShtKSwgbCAtIG0sIGNvbXBhcmlzb24pO1xuICAgIF9tZXJnZSh0bXBfbCwgdG1wX3IsIGFyciwgY29tcGFyaXNvbik7XG4gICAgcmV0dXJuIGFycjtcbn1cblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uIHNvcnQoY29tcGFyaXNvbikge1xuICAgIHJldHVybiBuZXcgRW50aXR5Q29sbGVjdGlvbihfbVNvcnQodGhpcy5lbnRpdGllcy5zbGljZSgpLCB0aGlzLmVudGl0aWVzLnNsaWNlKCksIHRoaXMuZW50aXRpZXMubGVuZ3RoLCBjb21wYXJpc29uKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudGl0eUNvbGxlY3Rpb247IiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5Q29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vRW50aXR5Q29sbGVjdGlvbicpO1xuXG4vLyBNYXAgb2YgYW4gRW50aXR5J3MgcG9zaXRpb24gaW4gYSBFbnRpdHlDb2xsZWN0aW9uXG52YXIgZW50aXRpZXMgPSBbXTtcblxuLy8gU3RvcmFnZSBvZiBFbnRpdHkgYXJyYXlzXG52YXIgZW50aXR5Q29sbGVjdGlvbnMgPSB7XG4gICAgZXZlcnl0aGluZzogbmV3IEVudGl0eUNvbGxlY3Rpb24oKVxufTtcblxuLy8gUG9vbCBvZiBmcmVlIHNwYWNlcyBpbiB0aGUgZW50aXRlcyBhcnJheVxudmFyIGZyZWVkID0gW107XG5cbi8qKlxuICogQSBzaW5nbGV0b24gb2JqZWN0IHRoYXQgbWFuYWdlcyB0aGUgRW50aXR5IHJlZmVyZW5jZSBzeXN0ZW0uXG4gKiAgIEVudGl0aWVzIGNhbiBiZSBwYXJ0IG9mIG1hbnkgRW50aXR5Q29sbGVjdGlvbnMgZGVwZW5kaW5nIG9uIGltcGxlbWVudGF0aW9uLlxuICogICBcbiAqIEBjbGFzcyBFbnRpdHlSZWdpc3RyeVxuICogQHNpbmdsZXRvblxuICovXG52YXIgRW50aXR5UmVnaXN0cnkgPSBtb2R1bGUuZXhwb3J0cztcblxuLyoqXG4gKiBBZGRzIGEgbmV3IEVudGl0eUNvbGxlY3Rpb24ga2V5IHRvIHRoZSBlbnRpdHlDb2xsZWN0aW9ucyBvYmplY3QuXG4gKlxuICogQG1ldGhvZCAgYWRkQ29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIHRoZSBFbnRpdHlDb2xsZWN0aW9uXG4gKiBAcmV0dXJuIHtFbnRpdHlDb2xsZWN0aW9ufSB0aGUgRW50aXR5Q29sbGVjdGlvbiBhZGRlZFxuICovXG5FbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uID0gZnVuY3Rpb24gYWRkQ29sbGVjdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgaWYgKCFjb2xsZWN0aW9uKSAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCcuYWRkQ29sbGVjdGlvbiBuZWVkcyB0byBoYXZlIGEgbmFtZSBzcGVjaWZpZWQnKTtcbiAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb24gIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgRXJyb3IoJy5hZGRDb2xsZWN0aW9uIGNhbiBvbmx5IHRha2UgYSBzdHJpbmcgYXMgYW4gYXJndW1lbnQnKTtcbiAgICBpZiAoIWVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dKSBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXSA9IG5ldyBFbnRpdHlDb2xsZWN0aW9uKCk7XG4gICAgcmV0dXJuIGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIEVudGl0eUNvbGxlY3Rpb24gYnkgbmFtZS5cbiAqXG4gKiBAbWV0aG9kICBnZXRDb2xsZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uIG5hbWUgb2YgdGhlIEVudGl0eUNvbGxlY3Rpb25cbiAqIEByZXR1cm4ge0VudGl0eUNvbGxlY3Rpb258dW5kZWZpbmVkfSBFbnRpdHlDb2xsZWN0aW9uIHJlZmVyZW5jZWQgYnkgYSBwYXJ0aWN1bGFyIG5hbWVcbiAqL1xuRW50aXR5UmVnaXN0cnkuZ2V0Q29sbGVjdGlvbiA9IGZ1bmN0aW9uIGdldENvbGxlY3Rpb24oY29sbGVjdGlvbikge1xuICAgIHJldHVybiBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHBhcnRpY3VsYXIgRW50aXR5Q29sbGVjdGlvbiBmcm9tIHRoZSByZWdpc3RyeVxuICpcbiAqIEBtZXRob2QgIHJlbW92ZUNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gbmFtZSBvZiB0aGUgRW50aXR5Q29sbGVjdGlvbiB0byByZW1vdmVcbiAqIEByZXR1cm4ge0VudGl0eUNvbGxlY3Rpb259IEVudGl0eUNvbGxlY3Rpb24gdGhhdCB3YXMgcmVtb3ZlZFxuICovXG5FbnRpdHlSZWdpc3RyeS5yZW1vdmVDb2xsZWN0aW9uID0gZnVuY3Rpb24gcmVtb3ZlQ29sbGVjdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgaWYgKCFjb2xsZWN0aW9uKSAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCcucmVtb3ZlQ29sbGVjdGlvbiBuZWVkcyB0byBoYXZlIGEgY29sbGVjdGlvbiBzcGVjaWZpZWQnKTtcbiAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb24gIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgRXJyb3IoJy5yZW1vdmVDb2xsZWN0aW9uIGNhbiBvbmx5IHRha2UgYSBzdHJpbmcgYXMgYW4gYXJndW1lbnQnKTtcblxuICAgIHZhciBjdXJyQ29sbGVjdGlvbiA9IGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dO1xuICAgIGlmICghY3VyckNvbGxlY3Rpb24pIHJldHVybiBmYWxzZTtcblxuICAgIHZhciBpID0gY3VyckNvbGxlY3Rpb24ubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIGRlbGV0ZSBlbnRpdGllc1tjdXJyQ29sbGVjdGlvbi5nZXQoaSkuX2lkXVtjb2xsZWN0aW9uXTtcblxuICAgIGRlbGV0ZSBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXTtcbiAgICByZXR1cm4gY3VyckNvbGxlY3Rpb247XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gZW50aXR5IHRvIGEgcGFydGljdWxhciBjb2xsZWN0aW9uLlxuICpcbiAqIEBtZXRob2QgcmVnaXN0ZXJcbiAqIFxuICogQHBhcmFtICB7RW50aXR5fSBpbnN0YW5jZSBvZiBhbiBFbnRpdHlcbiAqIEBwYXJhbSAge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIHRoZSBFbnRpdHlDb2xsZWN0aW9uIHRvIHJlZ2lzdGVyIHRoZSBlbnRpdHkgdG9cbiAqIEByZXR1cm4ge051bWJlcn0gaWQgb2YgdGhlIEVudGl0eVxuICovXG5FbnRpdHlSZWdpc3RyeS5yZWdpc3RlciA9IGZ1bmN0aW9uIHJlZ2lzdGVyKGVudGl0eSwgY29sbGVjdGlvbikge1xuICAgIHZhciBpZE1hcDtcbiAgICBpZiAoZW50aXR5Ll9pZCA9PSBudWxsKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbnRpdHksICdfaWQnLCB7XG4gICAgICAgICAgICB2YWx1ZSAgICAgICAgOiBFbnRpdHlSZWdpc3RyeS5nZXROZXdJRCgpLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIGlkID0gZW50aXR5Ll9pZDtcbiAgICBpZiAoZW50aXRpZXNbaWRdKSB7XG4gICAgICAgIGlkTWFwID0gZW50aXRpZXNbaWRdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWRNYXAgPSB7ZXZlcnl0aGluZzogZW50aXR5Q29sbGVjdGlvbnMuZXZlcnl0aGluZy5sZW5ndGh9O1xuICAgICAgICBlbnRpdHlDb2xsZWN0aW9ucy5ldmVyeXRoaW5nLnB1c2goZW50aXR5KTtcbiAgICB9XG5cbiAgICBpZiAoY29sbGVjdGlvbikge1xuICAgICAgICBpZiAoIWVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dKSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKGNvbGxlY3Rpb24pO1xuICAgICAgICBpZE1hcFtjb2xsZWN0aW9uXSA9IGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dLmxlbmd0aDtcbiAgICAgICAgZW50aXR5Q29sbGVjdGlvbnNbY29sbGVjdGlvbl0ucHVzaChlbnRpdHkpO1xuICAgIH1cblxuICAgIGlmICghZW50aXRpZXNbaWRdKSBlbnRpdGllc1tpZF0gPSBpZE1hcDtcbiAgICByZXR1cm4gaWQ7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYW4gZW50aXR5IGZyb20gYSBFbnRpdHlDb2xsZWN0aW9uXG4gKlxuICogQG1ldGhvZCAgZGVyZWdpc3RlclxuICogXG4gKiBAcGFyYW0gIHtFbnRpdHl9IGVudGl0eSBpbnN0YW5jZSBvZiBhbiBFbnRpdHlcbiAqIEBwYXJhbSAge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIEVudGl0eUNvbGxlY3Rpb24gdG8gcmVtb3ZlIHRoZSBFbnRpdHkgZnJvbVxuICogQHJldHVybiB7Qm9vbGVhbX0gc3RhdHVzIG9mIHRoZSByZW1vdmFsXG4gKi9cbkVudGl0eVJlZ2lzdHJ5LmRlcmVnaXN0ZXIgPSBmdW5jdGlvbiBkZXJlZ2lzdGVyKGVudGl0eSwgY29sbGVjdGlvbikge1xuICAgIHZhciBjdXJyZW50RW50aXR5O1xuICAgIHZhciBwb3NpdGlvbiA9IGVudGl0aWVzW2VudGl0eS5faWRdW2NvbGxlY3Rpb25dO1xuICAgIGlmIChwb3NpdGlvbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gICAgZW50aXRpZXNbZW50aXR5Ll9pZF1bY29sbGVjdGlvbl0gPSBudWxsO1xuICAgIGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dLnJlbW92ZShlbnRpdHkpO1xuXG4gICAgdmFyIGN1cnJlbnRFbnRpdHk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRpdGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJyZW50RW50aXR5ID0gZW50aXRpZXNbaV07XG5cbiAgICAgICAgaWYgKGN1cnJlbnRFbnRpdHkgJiYgY3VycmVudEVudGl0eVtjb2xsZWN0aW9uXSA+IHBvc2l0aW9uKSBjdXJyZW50RW50aXR5W2NvbGxlY3Rpb25dLS07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgaWQgbWFwIG9mIHRoZSBFbnRpdHkuICBFYWNoIEVudGl0eSBoYXMgYW4gb2JqZWN0IHRoYXRcbiAqICAgZGVmaW5lZCB0aGUgaW5kaWNpZXMgb2Ygd2hlcmUgaXQgaXMgaW4gZWFjaCBFbnRpdHlDb2xsZWN0aW9uLlxuICpcbiAqIEBtZXRob2QgIGdldFxuICogXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGlkIElEIG9mIHRoZSBFbnRpdHlcbiAqIEByZXR1cm4ge09iamVjdH0gaWQgbWFwIG9mIHRoZSBFbnRpdHkncyBpbmRleCBpbiBlYWNoIEVudGl0eUNvbGxlY3Rpb25cbiAqL1xuRW50aXR5UmVnaXN0cnkuZ2V0ID0gZnVuY3Rpb24gZ2V0KGlkKSB7XG4gICAgcmV0dXJuIGVudGl0aWVzW2lkXTtcbn07XG5cbi8qKlxuICogRmluZCBvdXQgaWYgYSBnaXZlbiBlbnRpdHkgZXhpc3RzIGFuZCBhIHNwZWNpZmllZCBFbnRpdHlDb2xsZWN0aW9uLlxuICpcbiAqIEBtZXRob2QgIGluQ29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0gIHtFbnRpdHl9IGVudGl0eSBFbnRpdHkgaW5zdGFuY2VcbiAqIEBwYXJhbSAge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIHRoZSBFbnRpdHlDb2xsZWN0aW9uXG4gKiBAcmV0dXJuIHtCb29sZWFufSB3aGV0aGVyIG9yIG5vdCB0aGUgRW50aXR5IGlzIGluIGEgZ2l2ZW4gRW50aXR5Q29sbGVjdGlvblxuICovXG5FbnRpdHlSZWdpc3RyeS5pbkNvbGxlY3Rpb24gPSBmdW5jdGlvbiBpbkNvbGxlY3Rpb24oZW50aXR5LCBjb2xsZWN0aW9uKSB7XG4gICAgcmV0dXJuIGVudGl0aWVzW2VudGl0eS5faWRdW2NvbGxlY3Rpb25dICE9PSB1bmRlZmluZWQ7XG59O1xuXG4vKipcbiAqIEdldCBhIHVuaXF1ZSBJRCBmb3IgYW4gRW50aXR5XG4gKlxuICogQG1ldGhvZCAgZ2V0TmV3SURcbiAqIFxuICogQHJldHVybiB7TnVtYmVyfSBJRCBmb3IgYW4gRW50aXR5XG4gKi9cbkVudGl0eVJlZ2lzdHJ5LmdldE5ld0lEID0gZnVuY3Rpb24gZ2V0TmV3SUQoKSB7XG4gICAgaWYoZnJlZWQubGVuZ3RoKSByZXR1cm4gZnJlZWQucG9wKCk7XG4gICAgZWxzZSByZXR1cm4gZW50aXRpZXMubGVuZ3RoO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gZW50aXR5IGFuZCBhbGwgcmVmZXJlbmNlcyB0byBpdC5cbiAqXG4gKiBAbWV0aG9kIGNsZWFudXBcbiAqIFxuICogQHBhcmFtICB7RW50aXR5fSBlbnRpdHkgRW50aXR5IGluc3RhbmNlIHRvIHJlbW92ZVxuICogQHJldHVybiB7TnVtYmVyfSBJRCBvZiB0aGUgRW50aXR5IHRoYXQgd2FzIHJlbW92ZWRcbiAqL1xuRW50aXR5UmVnaXN0cnkuY2xlYW51cCA9IGZ1bmN0aW9uIGNsZWFudXAoZW50aXR5KSB7XG4gICAgdmFyIGN1cnJlbnRFbnRpdHk7XG4gICAgdmFyIGlkTWFwICAgICAgICAgICAgPSBlbnRpdGllc1tlbnRpdHkuX2lkXTtcbiAgICBlbnRpdGllc1tlbnRpdHkuX2lkXSA9IG51bGw7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1cnJlbnRFbnRpdHkgPSBlbnRpdGllc1tpXTtcblxuICAgICAgICBpZiAoY3VycmVudEVudGl0eSlcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBpZE1hcClcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEVudGl0eVtrZXldICYmIGN1cnJlbnRFbnRpdHlba2V5XSA+IGlkTWFwW2tleV0pXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFbnRpdHlba2V5XS0tO1xuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBpZE1hcCkge1xuICAgICAgICBlbnRpdHlDb2xsZWN0aW9uc1trZXldLnNwbGljZShpZE1hcFtrZXldLCAxKTtcbiAgICB9XG5cbiAgICBmcmVlZC5wdXNoKGVudGl0eS5faWQpO1xuICAgIHJldHVybiBlbnRpdHkuX2lkO1xufTtcblxuLyoqXG4gKiBHZXQgYW4gRW50aXR5IGJ5IGlkXG4gKlxuICogQG1ldGhvZCBnZXRFbnRpdHlcbiAqIFxuICogQHBhcmFtICB7TnVtYmVyfSBpZCBpZCBvZiB0aGUgRW50aXR5XG4gKiBAcmV0dXJuIHtFbnRpdHl9IGVudGl0eSB3aXRoIHRoZSBpZCBwcm92aWRlZFxuICovXG5FbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkgPSBmdW5jdGlvbiBnZXRFbnRpdHkoaWQpIHtcbiAgICBpZiAoIWVudGl0aWVzW2lkXSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBlbnRpdHlDb2xsZWN0aW9ucy5ldmVyeXRoaW5nLmdldChlbnRpdGllc1tpZF0uZXZlcnl0aGluZyk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgRW50aXRpZXMgZnJvbSB0aGUgZW50aXR5IHJlZ2lzdHJ5XG4gKlxuICogQG1ldGhvZCBjbGVhclxuICovXG5FbnRpdHlSZWdpc3RyeS5jbGVhciA9IGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgIHZhciBldmVyeXRoaW5nID0gRW50aXR5UmVnaXN0cnkuZ2V0Q29sbGVjdGlvbignZXZlcnl0aGluZycpO1xuICAgIHdoaWxlIChldmVyeXRoaW5nLmxlbmd0aCkgRW50aXR5UmVnaXN0cnkuY2xlYW51cChldmVyeXRoaW5nLnBvcCgpKTtcbn07XG5cbi8vIFJlZ3NpdGVyIHRoZSBkZWZhdWx0IGVudGl0eUNvbGxlY3Rpb25zXG5FbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdSb290cycpO1xuRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignQ29yZVN5c3RlbScpO1xuXG4vLyBtb2R1bGUuZXhwb3J0cyA9IEVudGl0eVJlZ2lzdHJ5O1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogbWFya0BmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuIFxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi4vZXZlbnRzL0V2ZW50SGFuZGxlcicpO1xuXG4vKipcbiAqICBBIGNvbGxlY3Rpb24gb2YgbWV0aG9kcyBmb3Igc2V0dGluZyBvcHRpb25zIHdoaWNoIGNhbiBiZSBleHRlbmRlZFxuICogIG9udG8gb3RoZXIgY2xhc3Nlcy5cbiAqXG4gKlxuICogQGNsYXNzIE9wdGlvbnNNYW5hZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIG9wdGlvbnMgZGljdGlvbmFyeVxuICovXG5mdW5jdGlvbiBPcHRpb25zTWFuYWdlcih2YWx1ZSkge1xuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgdGhpcy5ldmVudE91dHB1dCA9IG51bGw7XG59XG5cbi8qKlxuICogQ3JlYXRlIG9wdGlvbnMgbWFuYWdlciBmcm9tIHNvdXJjZSBkaWN0aW9uYXJ5IHdpdGggYXJndW1lbnRzIG92ZXJyaWRlbiBieSBwYXRjaCBkaWN0aW9uYXJ5LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2QgT3B0aW9uc01hbmFnZXIucGF0Y2hcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc291cmNlIHNvdXJjZSBhcmd1bWVudHNcbiAqIEBwYXJhbSB7Li4uT2JqZWN0fSBkYXRhIGFyZ3VtZW50IGFkZGl0aW9ucyBhbmQgb3ZlcndyaXRlc1xuICogQHJldHVybiB7T2JqZWN0fSBzb3VyY2Ugb2JqZWN0XG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnBhdGNoID0gZnVuY3Rpb24gcGF0Y2hPYmplY3Qoc291cmNlLCBkYXRhKSB7XG4gICAgdmFyIG1hbmFnZXIgPSBuZXcgT3B0aW9uc01hbmFnZXIoc291cmNlKTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgbWFuYWdlci5wYXRjaChhcmd1bWVudHNbaV0pO1xuICAgIHJldHVybiBzb3VyY2U7XG59O1xuXG5mdW5jdGlvbiBfY3JlYXRlRXZlbnRPdXRwdXQoKSB7XG4gICAgdGhpcy5ldmVudE91dHB1dCA9IG5ldyBFdmVudEhhbmRsZXIoKTtcbiAgICB0aGlzLmV2ZW50T3V0cHV0LmJpbmRUaGlzKHRoaXMpO1xuICAgIEV2ZW50SGFuZGxlci5zZXRPdXRwdXRIYW5kbGVyKHRoaXMsIHRoaXMuZXZlbnRPdXRwdXQpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBPcHRpb25zTWFuYWdlciBmcm9tIHNvdXJjZSB3aXRoIGFyZ3VtZW50cyBvdmVycmlkZW4gYnkgcGF0Y2hlcy5cbiAqICAgVHJpZ2dlcnMgJ2NoYW5nZScgZXZlbnQgb24gdGhpcyBvYmplY3QncyBldmVudCBoYW5kbGVyIGlmIHRoZSBzdGF0ZSBvZlxuICogICB0aGUgT3B0aW9uc01hbmFnZXIgY2hhbmdlcyBhcyBhIHJlc3VsdC5cbiAqXG4gKiBAbWV0aG9kIHBhdGNoXG4gKlxuICogQHBhcmFtIHsuLi5PYmplY3R9IGFyZ3VtZW50cyBsaXN0IG9mIHBhdGNoIG9iamVjdHNcbiAqIEByZXR1cm4ge09wdGlvbnNNYW5hZ2VyfSB0aGlzXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5wYXRjaCA9IGZ1bmN0aW9uIHBhdGNoKCkge1xuICAgIHZhciBteVN0YXRlID0gdGhpcy5fdmFsdWU7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGRhdGEgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGZvciAodmFyIGsgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKChrIGluIG15U3RhdGUpICYmIChkYXRhW2tdICYmIGRhdGFba10uY29uc3RydWN0b3IgPT09IE9iamVjdCkgJiYgKG15U3RhdGVba10gJiYgbXlTdGF0ZVtrXS5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSkge1xuICAgICAgICAgICAgICAgIGlmICghbXlTdGF0ZS5oYXNPd25Qcm9wZXJ0eShrKSkgbXlTdGF0ZVtrXSA9IE9iamVjdC5jcmVhdGUobXlTdGF0ZVtrXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5rZXkoaykucGF0Y2goZGF0YVtrXSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZXZlbnRPdXRwdXQpIHRoaXMuZXZlbnRPdXRwdXQuZW1pdCgnY2hhbmdlJywge2lkOiBrLCB2YWx1ZTogZGF0YVtrXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB0aGlzLnNldChrLCBkYXRhW2tdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHBhdGNoXG4gKlxuICogQG1ldGhvZCBzZXRPcHRpb25zXG4gKlxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IE9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5wYXRjaDtcblxuLyoqXG4gKiBSZXR1cm4gT3B0aW9uc01hbmFnZXIgYmFzZWQgb24gc3ViLW9iamVjdCByZXRyaWV2ZWQgYnkga2V5XG4gKlxuICogQG1ldGhvZCBrZXlcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllciBrZXlcbiAqIEByZXR1cm4ge09wdGlvbnNNYW5hZ2VyfSBuZXcgb3B0aW9ucyBtYW5hZ2VyIHdpdGggdGhlIHZhbHVlXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5rZXkgPSBmdW5jdGlvbiBrZXkoaWRlbnRpZmllcikge1xuICAgIHZhciByZXN1bHQgPSBuZXcgT3B0aW9uc01hbmFnZXIodGhpcy5fdmFsdWVbaWRlbnRpZmllcl0pO1xuICAgIGlmICghKHJlc3VsdC5fdmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpIHx8IHJlc3VsdC5fdmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgcmVzdWx0Ll92YWx1ZSA9IHt9O1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIExvb2sgdXAgdmFsdWUgYnkga2V5XG4gKiBAbWV0aG9kIGdldFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkga2V5XG4gKiBAcmV0dXJuIHtPYmplY3R9IGFzc29jaWF0ZWQgb2JqZWN0XG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlW2tleV07XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBnZXRcbiAqIEBtZXRob2QgZ2V0T3B0aW9uc1xuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUuZ2V0T3B0aW9ucyA9IE9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5nZXQ7XG5cbi8qKlxuICogU2V0IGtleSB0byB2YWx1ZS4gIE91dHB1dHMgJ2NoYW5nZScgZXZlbnQgaWYgYSB2YWx1ZSBpcyBvdmVyd3JpdHRlbi5cbiAqXG4gKiBAbWV0aG9kIHNldFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkga2V5IHN0cmluZ1xuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHZhbHVlIG9iamVjdFxuICogQHJldHVybiB7T3B0aW9uc01hbmFnZXJ9IG5ldyBvcHRpb25zIG1hbmFnZXIgYmFzZWQgb24gdGhlIHZhbHVlIG9iamVjdFxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpIHtcbiAgICB2YXIgb3JpZ2luYWxWYWx1ZSA9IHRoaXMuZ2V0KGtleSk7XG4gICAgdGhpcy5fdmFsdWVba2V5XSA9IHZhbHVlO1xuXG4gICAgaWYgKHRoaXMuZXZlbnRPdXRwdXQgJiYgdmFsdWUgIT09IG9yaWdpbmFsVmFsdWUpIHRoaXMuZXZlbnRPdXRwdXQuZW1pdCgnY2hhbmdlJywge2lkOiBrZXksIHZhbHVlOiB2YWx1ZX0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gZW50aXJlIG9iamVjdCBjb250ZW50cyBvZiB0aGlzIE9wdGlvbnNNYW5hZ2VyLlxuICpcbiAqIEBtZXRob2QgdmFsdWVcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IGN1cnJlbnQgc3RhdGUgb2Ygb3B0aW9uc1xuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbiB2YWx1ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG59O1xuXG4vKipcbiAqIEJpbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBhbiBldmVudCB0eXBlIGhhbmRsZWQgYnkgdGhpcyBvYmplY3QuXG4gKlxuICogQG1ldGhvZCBcIm9uXCJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjaGFuZ2UnKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGhhbmRsZXIgY2FsbGJhY2tcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbigpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5vbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBVbmJpbmQgYW4gZXZlbnQgYnkgdHlwZSBhbmQgaGFuZGxlci5cbiAqICAgVGhpcyB1bmRvZXMgdGhlIHdvcmsgb2YgXCJvblwiLlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlTGlzdGVuZXJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjaGFuZ2UnKVxuICogQHBhcmFtIHtmdW5jdGlvbn0gaGFuZGxlciBmdW5jdGlvbiBvYmplY3QgdG8gcmVtb3ZlXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IGludGVybmFsIGV2ZW50IGhhbmRsZXIgb2JqZWN0IChmb3IgY2hhaW5pbmcpXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKCkge1xuICAgIF9jcmVhdGVFdmVudE91dHB1dC5jYWxsKHRoaXMpO1xuICAgIHJldHVybiB0aGlzLnJlbW92ZUxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIEFkZCBldmVudCBoYW5kbGVyIG9iamVjdCB0byBzZXQgb2YgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqXG4gKiBAbWV0aG9kIHBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IGV2ZW50IGhhbmRsZXIgdGFyZ2V0IG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwYXNzZWQgZXZlbnQgaGFuZGxlclxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIHBpcGUoKSB7XG4gICAgX2NyZWF0ZUV2ZW50T3V0cHV0LmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXMucGlwZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgaGFuZGxlciBvYmplY3QgZnJvbSBzZXQgb2YgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqIFVuZG9lcyB3b3JrIG9mIFwicGlwZVwiXG4gKlxuICogQG1ldGhvZCB1bnBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IHRhcmdldCBoYW5kbGVyIG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwcm92aWRlZCB0YXJnZXRcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnVucGlwZSA9IGZ1bmN0aW9uIHVucGlwZSgpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy51bnBpcGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uc01hbmFnZXI7IiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgT3B0aW9uc01hbmFnZXIgICA9IHJlcXVpcmUoJy4uL09wdGlvbnNNYW5hZ2VyJyksXG4gICAgU3VyZmFjZSAgICAgICAgICA9IHJlcXVpcmUoJy4uL0NvbXBvbmVudHMvU3VyZmFjZScpLFxuICAgIENvbnRhaW5lciAgICAgICAgPSByZXF1aXJlKCcuLi9Db21wb25lbnRzL0NvbnRhaW5lcicpLFxuICAgIEVsZW1lbnRBbGxvY2F0b3IgPSByZXF1aXJlKCcuL0VsZW1lbnRBbGxvY2F0b3InKSxcbiAgICBFbnRpdHlSZWdpc3RyeSAgID0gcmVxdWlyZSgnLi4vRW50aXR5UmVnaXN0cnknKSxcbiAgICBNYXRyaXhNYXRoICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbWF0aC80eDRtYXRyaXgnKTtcblxuLy8gU3RhdGVcbnZhciBjb250YWluZXJzVG9FbGVtZW50cyA9IFtdLFxuICAgIHN1cmZhY2VzVG9FbGVtZW50cyAgID0ge30sXG4gICAgY29udGFpbmVyc1RvU3VyZmFjZXMgPSBbXSxcbiAgICB0YXJnZXRzICAgICAgICAgICAgICA9IFtTdXJmYWNlLnRvU3RyaW5nKCldO1xuXG52YXIgdXNlUHJlZml4ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jykuc3R5bGUud2Via2l0VHJhbnNmb3JtICE9IG51bGw7XG5cbi8vIENPTlNUU1xudmFyIFpFUk8gICAgICAgICAgICAgICAgPSAwLFxuICAgIERFVklDRVBJWEVMUkFUSU8gICAgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxLFxuICAgIE1BVFJJWDNEICAgICAgICAgICAgPSAnbWF0cml4M2QoJyxcbiAgICBDTE9TRV9QQVJFTiAgICAgICAgID0gJyknLFxuICAgIENPTU1BICAgICAgICAgICAgICAgPSAnLCcsXG4gICAgRElWICAgICAgICAgICAgICAgICA9ICdkaXYnLFxuICAgIEZBX0NPTlRBSU5FUiAgICAgICAgPSAnZmEtY29udGFpbmVyJyxcbiAgICBGQV9TVVJGQUNFICAgICAgICAgID0gJ2ZhLXN1cmZhY2UnLFxuICAgIENPTlRBSU5FUiAgICAgICAgICAgPSAnY29udGFpbmVyJyxcbiAgICBQWCAgICAgICAgICAgICAgICAgID0gJ3B4JyxcbiAgICBTVVJGQUNFICAgICAgICAgICAgID0gJ3N1cmZhY2UnLFxuICAgIFRSQU5TRk9STSAgICAgICAgICAgPSAndHJhbnNmb3JtJyxcbiAgICBDU1NUUkFOU0ZPUk0gICAgICAgID0gdXNlUHJlZml4ID8gJ3dlYmtpdFRyYW5zZm9ybScgOiAndHJhbnNmb3JtJyxcbiAgICBDU1NUUkFOU0ZPUk1fT1JJR0lOID0gdXNlUHJlZml4ID8gJ3dlYmtpdFRyYW5zZm9ybU9yaWdpbicgOiAndHJhbnNmb3JtT3JpZ2luJztcblxuLy9zY3JhdGNoIG1lbW9yeSBmb3IgbWF0cml4IGNhbGN1bGF0aW9uc1xudmFyIG1hdHJpeFNjcmF0Y2gxICAgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSksXG4gICAgbWF0cml4U2NyYXRjaDIgICA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKSxcbiAgICBtYXRyaXhTY3JhdGNoMyAgID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pLFxuICAgIG1hdHJpeFNjcmF0Y2g0ICAgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG5cbi8qKlxuICogRE9NUmVuZGVyZXIgaXMgYSBzaW5nbGV0b24gb2JqZWN0IHdob3NlIHJlc3BvbnNpYmxpdHkgaXQgaXNcbiAqICB0byBkcmF3IERPTSBib3VuZCBTdXJmYWNlcyB0byB0aGVpciByZXNwZWN0aXZlIENvbnRhaW5lcnMuXG4gKlxuICogQGNsYXNzIERPTVJlbmRlcmVyXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBET01SZW5kZXJlciA9IHtcbiAgICBfcXVldWVzOiB7XG4gICAgICAgIGNvbnRhaW5lcnM6IHtcbiAgICAgICAgICAgIHVwZGF0ZTogW10sXG4gICAgICAgICAgICByZWNhbGw6IFtdLFxuICAgICAgICAgICAgZGVwbG95OiBbXVxuICAgICAgICB9LFxuICAgICAgICBzdXJmYWNlczoge31cbiAgICB9LFxuICAgIGFsbG9jYXRvcnM6IHt9XG59O1xuXG4vKipcbiAqIEFkZCBhbiBFbnRpdHkgd2l0aCBhIENvbnRhaW5lciBjb21wb25lbnQgdG8gdGhlIHF1ZXVlIHRvIGJlXG4gKiAgYWRkZWQgaW50byB0aGUgRE9NLlxuICpcbiAqIEBtZXRob2QgZGVwbG95Q29udGFpbmVyXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgbmVlZHMgdG8gYmUgZGVwbG95ZWRcbiAqL1xuRE9NUmVuZGVyZXIuZGVwbG95Q29udGFpbmVyID0gZnVuY3Rpb24gZGVwbG95Q29udGFpbmVyKGVudGl0eSkge1xuICAgIHRoaXMuX3F1ZXVlcy5jb250YWluZXJzLmRlcGxveS5wdXNoKGVudGl0eSk7XG4gICAgY29udGFpbmVyc1RvU3VyZmFjZXNbZW50aXR5Ll9pZF0gID0ge307XG4gICAgdGhpcy5fcXVldWVzLnN1cmZhY2VzW2VudGl0eS5faWRdID0ge1xuICAgICAgICB1cGRhdGU6IFtdLFxuICAgICAgICByZWNhbGw6IFtdLFxuICAgICAgICBkZXBsb3k6IFtdXG4gICAgfTtcbn07XG5cbi8vIERlcGxveSBhIGdpdmVuIEVudGl0eSdzIENvbnRhaW5lciB0byB0aGUgRE9NLlxuZnVuY3Rpb24gX2RlcGxveUNvbnRhaW5lcihlbnRpdHkpIHtcbiAgICB2YXIgY29udGV4dCA9IGVudGl0eS5nZXRDb250ZXh0KCk7XG5cbiAgICAvLyBJZiB0aGUgQ29udGFpbmVyIGhhcyBub3QgcHJldmlvdXNseSBiZWVuIGRlcGxveSBhbmRcbiAgICAvLyBkb2VzIG5vdCBoYXZlIGFuIGFsbG9jYXRvciwgY3JlYXRlIG9uZS5cbiAgICBpZiAoIURPTVJlbmRlcmVyLmFsbG9jYXRvcnNbY29udGV4dC5faWRdKVxuICAgICAgICBET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRleHQuX2lkXSA9IG5ldyBFbGVtZW50QWxsb2NhdG9yKGNvbnRleHQuX3BhcmVudEVsKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgRE9NIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBDb250YWluZXJcbiAgICB2YXIgZWxlbWVudCA9IERPTVJlbmRlcmVyLmFsbG9jYXRvcnNbY29udGV4dC5faWRdLmFsbG9jYXRlKERJVik7XG4gICAgY29udGFpbmVyc1RvRWxlbWVudHNbZW50aXR5Ll9pZF0gPSBlbGVtZW50O1xuICAgIF91cGRhdGVDb250YWluZXIoZW50aXR5LCBlbGVtZW50KTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoRkFfQ09OVEFJTkVSKTtcblxuICAgIERPTVJlbmRlcmVyLmFsbG9jYXRvcnNbZW50aXR5Ll9pZF0gPSBuZXcgRWxlbWVudEFsbG9jYXRvcihlbGVtZW50KTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gRW50aXR5IHdpdGggYSBDb250YWluZXIgY29tcG9uZW50IHRvIHRoZSBxdWV1ZSB0byBiZVxuICogIHJlbW92ZWQgZnJvbSB0aGUgRE9NLlxuICpcbiAqIEBtZXRob2QgcmVjYWxsQ29udGFpbmVyXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgbmVlZHMgdG8gYmUgcmVjYWxsZWRcbiAqL1xuRE9NUmVuZGVyZXIucmVjYWxsQ29udGFpbmVyID0gZnVuY3Rpb24gcmVjYWxsQ29udGFpbmVyKGVudGl0eSkge1xuICAgIHRoaXMuX3F1ZXVlcy5jb250YWluZXJzLnJlY2FsbC5wdXNoKGVudGl0eSk7XG4gICAgZGVsZXRlIHRoaXMuX3F1ZXVlcy5zdXJmYWNlc1tlbnRpdHkuX2lkXTtcbn07XG5cbi8vIFJlY2FsbCB0aGUgRE9NIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBFbnRpdHkncyBDb250YWluZXJcbi8vIGFuZCBjbGVhbiB1cCByZWZlcmVuY2VzLlxuZnVuY3Rpb24gX3JlY2FsbENvbnRhaW5lcihlbnRpdHkpIHtcbiAgICB2YXIgZWxlbWVudCA9IGNvbnRhaW5lcnNUb0VsZW1lbnRzW2VudGl0eS5faWRdO1xuICAgIHZhciBjb250ZXh0ID0gZW50aXR5LmdldENvbnRleHQoKTtcbiAgICBET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRleHQuX2lkXS5kZWFsbG9jYXRlKGVsZW1lbnQpO1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShGQV9DT05UQUlORVIpO1xuICAgIGRlbGV0ZSBET01SZW5kZXJlci5hbGxvY2F0b3JzW2VudGl0eS5faWRdO1xufVxuXG4vKipcbiAqIEFkZCBhbiBFbnRpdHkgd2l0aCBhIENvbnRhaW5lciBjb21wb25lbnQgdG8gdGhlIHF1ZXVlIHRvIGJlXG4gKiAgdXBkYXRlZC5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZUNvbnRhaW5lclxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IG5lZWRzIHRvIGJlIHVwZGF0ZWRcbiAqL1xuRE9NUmVuZGVyZXIudXBkYXRlQ29udGFpbmVyID0gZnVuY3Rpb24gdXBkYXRlQ29udGFpbmVyKGVudGl0eSkge1xuICAgIHRoaXMuX3F1ZXVlcy5jb250YWluZXJzLnVwZGF0ZS5wdXNoKGVudGl0eSk7XG59O1xuXG4vLyBVcGRhdGUgdGhlIENvbnRhaW5lcidzIERPTSBwcm9wZXJ0aWVzXG5mdW5jdGlvbiBfdXBkYXRlQ29udGFpbmVyKGVudGl0eSkge1xuICAgIHZhciBjb250YWluZXIgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KENPTlRBSU5FUiksXG4gICAgICAgIGVsZW1lbnQgICA9IGNvbnRhaW5lcnNUb0VsZW1lbnRzW2VudGl0eS5faWRdLFxuICAgICAgICBpICAgICAgICAgPSAwLFxuICAgICAgICBzaXplLFxuICAgICAgICBvcmlnaW4sXG4gICAgICAgIGNvbnRleHRTaXplO1xuXG4gICAgaWYgKGNvbnRhaW5lci5fZXZlbnRzLmRpcnR5KSB7XG4gICAgICAgIGkgPSBjb250YWluZXIuX2V2ZW50cy5vbi5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChjb250YWluZXIuX2V2ZW50cy5vZmYubGVuZ3RoKSBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGFpbmVyLl9ldmVudHMub2ZmLnBvcCgpLCBjb250YWluZXIuX2V2ZW50cy5mb3J3YXJkZXIpO1xuICAgICAgICB3aGlsZSAoaS0tKSBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGFpbmVyLl9ldmVudHMub25baV0sIGNvbnRhaW5lci5fZXZlbnRzLmZvcndhcmRlcik7XG4gICAgICAgIGNvbnRhaW5lci5fZXZlbnRzLmRpcnR5ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRhaW5lci5fc2l6ZURpcnR5IHx8IGNvbnRhaW5lci5fdHJhbnNmb3JtRGlydHkpIHtcbiAgICAgICAgY29udGV4dFNpemUgPSBlbnRpdHkuZ2V0Q29udGV4dCgpLl9zaXplO1xuICAgICAgICBzaXplICAgICAgICA9IGNvbnRhaW5lci5nZXRDU1NTaXplKCk7XG4gICAgICAgIG9yaWdpbiAgICAgID0gY29udGFpbmVyLm9yaWdpbjtcbiAgICB9XG5cbiAgICBpZiAoY29udGFpbmVyLl9zaXplRGlydHkpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS53aWR0aCAgPSBzaXplWzBdICsgUFg7XG4gICAgICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gc2l6ZVsxXSArIFBYO1xuICAgICAgICBjb250YWluZXIuX3NpemVEaXJ0eSA9IGZhbHNlO1xuICAgICAgICBjb250YWluZXIuX3NldFZlcnRleERpc3BsYWNlbWVudChlbGVtZW50Lm9mZnNldFdpZHRoLCBlbGVtZW50Lm9mZnNldEhlaWdodCk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRhaW5lci5fdHJhbnNmb3JtRGlydHkpIHtcbiAgICAgICAgdmFyIHRyYW5zZm9ybSAgICAgICAgICAgICAgID0gRE9NUmVuZGVyZXIuY3JlYXRlRE9NTWF0cml4KGVudGl0eS5nZXRDb21wb25lbnQoVFJBTlNGT1JNKS5fbWF0cml4LCBjb250ZXh0U2l6ZSwgc2l6ZSwgb3JpZ2luKTtcbiAgICAgICAgZWxlbWVudC5zdHlsZVtDU1NUUkFOU0ZPUk1dID0gRE9NUmVuZGVyZXIuc3RyaW5naWZ5TWF0cml4KHRyYW5zZm9ybSk7XG4gICAgICAgIGNvbnRhaW5lci5fdHJhbnNmb3JtRGlydHkgPSBmYWxzZTtcblxuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGNvbnRhaW5lcnNUb1N1cmZhY2VzW2VudGl0eS5faWRdKTtcbiAgICAgICAgaSAgICAgICAgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSlcbiAgICAgICAgICAgIGlmIChjb250YWluZXJzVG9TdXJmYWNlc1tlbnRpdHkuX2lkXVtrZXlzW2ldXSlcbiAgICAgICAgICAgICAgICBjb250YWluZXJzVG9TdXJmYWNlc1tlbnRpdHkuX2lkXVtrZXlzW2ldXS5nZXRDb21wb25lbnQoU1VSRkFDRSkuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMudHJhbnNmb3JtO1xuICAgIH1cbn1cblxuLyoqXG4gKiBBZGQgYW4gRW50aXR5IHdpdGggYSBTdXJmYWNlIHRvIHRoZSBxdWV1ZSB0byBiZSBkZXBsb3llZFxuICogIHRvIGEgcGFydGljdWxhciBDb250YWluZXIuXG4gKlxuICogQG1ldGhvZCBkZXBsb3lcbiAqIFxuICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSBFbnRpdHkgdGhhdCBuZWVkcyB0byBiZSBkZXBsb3llZFxuICogQHBhcmFtIHtFbnRpdHl9IGNvbnRhaW5lciBFbnRpdHkgdGhhdCB0aGUgU3VyZmFjZSB3aWxsIGJlIGRlcGxveWVkIHRvXG4gKi9cbkRPTVJlbmRlcmVyLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShlbnRpdHksIGNvbnRhaW5lcikge1xuICAgIGlmICghc3VyZmFjZXNUb0VsZW1lbnRzW2VudGl0eS5faWRdKSBzdXJmYWNlc1RvRWxlbWVudHNbZW50aXR5Ll9pZF0gPSB7fTtcbiAgICBET01SZW5kZXJlci5fcXVldWVzLnN1cmZhY2VzW2NvbnRhaW5lci5faWRdLmRlcGxveS5wdXNoKGVudGl0eSk7XG4gICAgY29udGFpbmVyc1RvU3VyZmFjZXNbY29udGFpbmVyLl9pZF1bZW50aXR5Ll9pZF0gPSBlbnRpdHk7XG59O1xuXG4vLyBEZXBsb3lzIHRoZSBFbnRpdHkncyBTdXJmYWNlIHRvIGEgcGFydGljdWxhciBDb250YWluZXIuXG5mdW5jdGlvbiBfZGVwbG95KGVudGl0eSwgY29udGFpbmVySUQpIHtcbiAgICB2YXIgZWxlbWVudCA9IERPTVJlbmRlcmVyLmFsbG9jYXRvcnNbY29udGFpbmVySURdLmFsbG9jYXRlKGVudGl0eS5nZXRDb21wb25lbnQoU1VSRkFDRSkudGFnTmFtZSB8fCBESVYpO1xuICAgIGVudGl0eS5nZXRDb21wb25lbnQoU1VSRkFDRSkuaW52YWxpZGF0ZUFsbCgpO1xuICAgIHN1cmZhY2VzVG9FbGVtZW50c1tlbnRpdHkuX2lkXVtjb250YWluZXJJRF0gPSBlbGVtZW50O1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChGQV9TVVJGQUNFKTtcbiAgICBfdXBkYXRlKGVudGl0eSwgY29udGFpbmVySUQpO1xufVxuXG4vKipcbiAqIEFkZCBhbiBFbnRpdHkgd2l0aCBhIFN1cmZhY2UgdG8gdGhlIHF1ZXVlIHRvIGJlIHJlY2FsbGVkXG4gKiAgZnJvbSBhIHBhcnRpY3VsYXIgQ29udGFpbmVyLlxuICpcbiAqIEBtZXRob2QgcmVjYWxsXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgbmVlZHMgdG8gYmUgcmVjYWxsZWQgZnJvbVxuICogQHBhcmFtIHtFbnRpdHl9IGNvbnRhaW5lciBFbnRpdHkgdGhhdCB0aGUgU3VyZmFjZSB3aWxsIGJlIHJlY2FsbGVkIGZyb21cbiAqL1xuRE9NUmVuZGVyZXIucmVjYWxsID0gZnVuY3Rpb24gcmVjYWxsKGVudGl0eSwgY29udGFpbmVyKSB7XG4gICAgRE9NUmVuZGVyZXIuX3F1ZXVlcy5zdXJmYWNlc1tjb250YWluZXIuX2lkXS5yZWNhbGwucHVzaChlbnRpdHkpO1xuICAgIGNvbnRhaW5lcnNUb1N1cmZhY2VzW2NvbnRhaW5lci5faWRdW2VudGl0eS5faWRdID0gZmFsc2U7XG59O1xuXG4vLyBSZWNhbGxzIHRoZSBFbnRpdHkncyBTdXJmYWNlIGZyb20gYSBnaXZlbiBDb250YWluZXJcbmZ1bmN0aW9uIF9yZWNhbGwoZW50aXR5LCBjb250YWluZXJJRCkge1xuICAgIHZhciBlbGVtZW50ID0gc3VyZmFjZXNUb0VsZW1lbnRzW2VudGl0eS5faWRdW2NvbnRhaW5lcklEXTtcbiAgICB2YXIgc3VyZmFjZSA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3N1cmZhY2UnKTtcbiAgICBET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRhaW5lcklEXS5kZWFsbG9jYXRlKGVsZW1lbnQpO1xuICAgIHZhciBpID0gc3VyZmFjZS5zcGVjLmV2ZW50cy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHN1cmZhY2Uuc3BlYy5ldmVudHNbaV0sIHN1cmZhY2UuZXZlbnRGb3J3YXJkZXIpO1xufVxuXG4vKipcbiAqIEFkZCBhbiBFbnRpdHkgd2l0aCBhIFN1cmZhY2UgdG8gdGhlIHF1ZXVlIHRvIGJlIHVwZGF0ZWRcbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IG5lZWRzIHRvIGJlIHVwZGF0ZWRcbiAqIEBwYXJhbSB7RW50aXR5fSBjb250YWluZXIgRW50aXR5IHRoYXQgdGhlIFN1cmZhY2Ugd2lsbCBiZSB1cGRhdGVkIGZvclxuICovXG5ET01SZW5kZXJlci51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZW50aXR5LCBjb250YWluZXIpIHtcbiAgICBET01SZW5kZXJlci5fcXVldWVzLnN1cmZhY2VzW2NvbnRhaW5lci5faWRdLnVwZGF0ZS5wdXNoKGVudGl0eSk7XG59O1xuXG4vLyBWZXJ0ZXggY3VsbGluZyBsb2dpY1xuLy8gVE9ETyBmaWd1cmUgb3V0IHZlcnRleCBjdWxsaW5nLlxuZnVuY3Rpb24gX2lzV2l0aGluKHRhcmdldCwgZW50aXR5LCBjb250YWluZXIsIHRhcmdldFRyYW5zZm9ybSkge1xuICAgIHZhciB0YXJnZXRTaXplICAgID0gdGFyZ2V0LmdldFNpemUodGFyZ2V0VHJhbnNmb3JtLCB0cnVlKSxcbiAgICAgICAgY29udGFpbmVyU2l6ZSA9IGNvbnRhaW5lci5nZXRDb21wb25lbnQoJ2NvbnRhaW5lcicpLmdldFNpemUodm9pZCAwLCB0cnVlKTtcblxuICAgIHRhcmdldFNpemUub3JpZ2luWzBdIC09IGVudGl0eS5nZXRDb250ZXh0KCkuX3NpemVbMF0gLyAyIC0gdGFyZ2V0U2l6ZS5zaXplWzBdICogdGFyZ2V0LmdldE9yaWdpbigpWzBdO1xuICAgIHRhcmdldFNpemUub3JpZ2luWzFdIC09IGVudGl0eS5nZXRDb250ZXh0KCkuX3NpemVbMV0gLyAyIC0gdGFyZ2V0U2l6ZS5zaXplWzFdICogdGFyZ2V0LmdldE9yaWdpbigpWzFdO1xuXG4gICAgdmFyIGZ1cnRoZXN0TGVmdFRhcmdldCAgICAgID0gdGFyZ2V0U2l6ZS5vcmlnaW5bMF0gICAgKyB0YXJnZXRTaXplLmRpc3BsYWNlbWVudC5sZWZ0LFxuICAgICAgICBmdXJ0aGVzdFJpZ2h0VGFyZ2V0ICAgICA9IHRhcmdldFNpemUub3JpZ2luWzBdICAgICsgdGFyZ2V0U2l6ZS5kaXNwbGFjZW1lbnQucmlnaHQsXG4gICAgICAgIGZ1cnRoZXN0VG9wVGFyZ2V0ICAgICAgID0gdGFyZ2V0U2l6ZS5vcmlnaW5bMV0gICAgKyB0YXJnZXRTaXplLmRpc3BsYWNlbWVudC50b3AsXG4gICAgICAgIGZ1cnRoZXN0Qm90dG9tVGFyZ2V0ICAgID0gdGFyZ2V0U2l6ZS5vcmlnaW5bMV0gICAgKyB0YXJnZXRTaXplLmRpc3BsYWNlbWVudC5ib3R0b20sXG4gICAgICAgIGZ1cnRoZXN0TGVmdENvbnRhaW5lciAgID0gY29udGFpbmVyU2l6ZS5vcmlnaW5bMF0gKyBjb250YWluZXJTaXplLmRpc3BsYWNlbWVudC5sZWZ0LFxuICAgICAgICBmdXJ0aGVzdFJpZ2h0Q29udGFpbmVyICA9IGNvbnRhaW5lclNpemUub3JpZ2luWzBdICsgY29udGFpbmVyU2l6ZS5kaXNwbGFjZW1lbnQucmlnaHQsXG4gICAgICAgIGZ1cnRoZXN0VG9wQ29udGFpbmVyICAgID0gY29udGFpbmVyU2l6ZS5vcmlnaW5bMV0gKyBjb250YWluZXJTaXplLmRpc3BsYWNlbWVudC50b3AsXG4gICAgICAgIGZ1cnRoZXN0Qm90dG9tQ29udGFpbmVyID0gY29udGFpbmVyU2l6ZS5vcmlnaW5bMV0gKyBjb250YWluZXJTaXplLmRpc3BsYWNlbWVudC5ib3R0b207XG5cbiAgICB2YXIgdmFsdWUgPSBmdXJ0aGVzdExlZnRUYXJnZXQgPCBmdXJ0aGVzdFJpZ2h0Q29udGFpbmVyICYmIGZ1cnRoZXN0TGVmdFRhcmdldCA+IGZ1cnRoZXN0TGVmdENvbnRhaW5lcjtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0VG9wVGFyZ2V0ID4gZnVydGhlc3RUb3BDb250YWluZXIgJiYgZnVydGhlc3RUb3BUYXJnZXQgPCBmdXJ0aGVzdEJvdHRvbUNvbnRhaW5lcikpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmICh2YWx1ZSAmJiAoZnVydGhlc3RCb3R0b21UYXJnZXQgPiBmdXJ0aGVzdEJvdHRvbUNvbnRhaW5lciAmJiBmdXJ0aGVzdEJvdHRvbVRhcmdldCA8IGZ1cnRoZXN0VG9wQ29udGFpbmVyKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB2YWx1ZSA9IGZ1cnRoZXN0UmlnaHRUYXJnZXQgPCBmdXJ0aGVzdFJpZ2h0Q29udGFpbmVyICYmIGZ1cnRoZXN0UmlnaHRUYXJnZXQgPiBmdXJ0aGVzdExlZnRDb250YWluZXI7XG4gICAgaWYgKHZhbHVlICYmIChmdXJ0aGVzdFRvcFRhcmdldCA+IGZ1cnRoZXN0VG9wQ29udGFpbmVyICYmIGZ1cnRoZXN0VG9wVGFyZ2V0IDwgZnVydGhlc3RCb3R0b21Db250YWluZXIpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0Qm90dG9tVGFyZ2V0ID4gZnVydGhlc3RCb3R0b21Db250YWluZXIgJiYgZnVydGhlc3RCb3R0b21UYXJnZXQgPCBmdXJ0aGVzdFRvcENvbnRhaW5lcikpXG4gICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgdmFsdWUgPSBmdXJ0aGVzdExlZnRDb250YWluZXIgPCBmdXJ0aGVzdFJpZ2h0VGFyZ2V0ICYmIGZ1cnRoZXN0TGVmdENvbnRhaW5lciA+IGZ1cnRoZXN0TGVmdFRhcmdldDtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0VG9wQ29udGFpbmVyID4gZnVydGhlc3RUb3BUYXJnZXQgJiYgZnVydGhlc3RUb3BDb250YWluZXIgPCBmdXJ0aGVzdEJvdHRvbVRhcmdldCkpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmICh2YWx1ZSAmJiAoZnVydGhlc3RCb3R0b21Db250YWluZXIgPiBmdXJ0aGVzdEJvdHRvbVRhcmdldCAmJiBmdXJ0aGVzdEJvdHRvbUNvbnRhaW5lciA8IGZ1cnRoZXN0VG9wVGFyZ2V0KSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB2YWx1ZSA9IGZ1cnRoZXN0UmlnaHRDb250YWluZXIgPCBmdXJ0aGVzdFJpZ2h0VGFyZ2V0ICYmIGZ1cnRoZXN0UmlnaHRDb250YWluZXIgPiBmdXJ0aGVzdExlZnRUYXJnZXQ7XG4gICAgaWYgKHZhbHVlICYmIChmdXJ0aGVzdFRvcENvbnRhaW5lciA+IGZ1cnRoZXN0VG9wVGFyZ2V0ICYmIGZ1cnRoZXN0VG9wQ29udGFpbmVyIDwgZnVydGhlc3RCb3R0b21UYXJnZXQpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0Qm90dG9tQ29udGFpbmVyID4gZnVydGhlc3RCb3R0b21UYXJnZXQgJiYgZnVydGhlc3RCb3R0b21Db250YWluZXIgPCBmdXJ0aGVzdFRvcFRhcmdldCkpXG4gICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBVcGRhdGUgdGhlIFN1cmZhY2UgdGhhdCBpcyB0byBkZXBsb3llZCB0byBhIHBhcnRjdWxhciBDb250YWluZXJcbmZ1bmN0aW9uIF91cGRhdGUoZW50aXR5LCBjb250YWluZXJJRCkge1xuICAgIHZhciBzdXJmYWNlICAgICAgICAgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KFNVUkZBQ0UpLFxuICAgICAgICBzcGVjICAgICAgICAgICAgPSBzdXJmYWNlLnJlbmRlcigpLFxuICAgICAgICBpICAgICAgICAgICAgICAgPSAwLFxuICAgICAgICBjb250ZXh0U2l6ZSAgICAgPSBlbnRpdHkuZ2V0Q29udGV4dCgpLl9zaXplLFxuICAgICAgICBlbGVtZW50ICAgICAgICAgPSBzdXJmYWNlc1RvRWxlbWVudHNbZW50aXR5Ll9pZF1bY29udGFpbmVySURdLFxuICAgICAgICBjb250YWluZXJFbnRpdHkgPSBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkoY29udGFpbmVySUQpLFxuICAgICAgICBjb250YWluZXIgICAgICAgPSBjb250YWluZXJFbnRpdHkuZ2V0Q29tcG9uZW50KENPTlRBSU5FUiksXG4gICAgICAgIGtleTtcblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMuY2xhc3NlcyAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZWxlbWVudC5jbGFzc0xpc3QubGVuZ3RoOyBpKyspIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShlbGVtZW50LmNsYXNzTGlzdFtpXSk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBzcGVjLmNsYXNzZXMubGVuZ3RoOyAgIGkrKykgZWxlbWVudC5jbGFzc0xpc3QuYWRkKHNwZWMuY2xhc3Nlc1tpXSk7XG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChGQV9TVVJGQUNFKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5hdHRyaWJ1dGVzICYgc3BlYy5pbnZhbGlkYXRpb25zKVxuICAgICAgICBmb3IgKGtleSBpbiBzcGVjLmF0dHJpYnV0ZXMpIGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgc3BlYy5hdHRyaWJ1dGVzW2tleV0pO1xuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5wcm9wZXJ0aWVzICYgc3BlYy5pbnZhbGlkYXRpb25zKVxuICAgICAgICBmb3IgKGtleSBpbiBzcGVjLnByb3BlcnRpZXMpIGVsZW1lbnQuc3R5bGVba2V5XSA9IHNwZWMucHJvcGVydGllc1trZXldO1xuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5hdHRyaWJ1dGVzICYgc3BlYy5pbnZhbGlkYXRpb25zKVxuICAgICAgICBmb3IgKGtleSBpbiBzcGVjLmF0dHJpYnV0ZXMpIGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgc3BlYy5hdHRyaWJ1dGVzW2tleV0pO1xuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5jb250ZW50ICYgc3BlYy5pbnZhbGlkYXRpb25zKSB7XG4gICAgICAgIGlmIChzcGVjLmNvbnRlbnQgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgICB3aGlsZSAoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpIGVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQoc3BlYy5jb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGVsZW1lbnQuaW5uZXJIVE1MID0gc3BlYy5jb250ZW50O1xuICAgICAgICBzcGVjLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemU7XG4gICAgfVxuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5vcGFjaXR5ICYgc3BlYy5pbnZhbGlkYXRpb25zICYmICFzcGVjLnByb3BlcnRpZXMub3BhY2l0eSlcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gZW50aXR5LmdldENvbXBvbmVudCgnb3BhY2l0eScpLl9nbG9iYWxPcGFjaXR5O1xuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5vcmlnaW4gJiBzcGVjLmludmFsaWRhdGlvbnMpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZVtDU1NUUkFOU0ZPUk1fT1JJR0lOXSA9IHNwZWMub3JpZ2luWzBdLnRvRml4ZWQoMikgKiAxMDAgKyAnJSAnICsgc3BlYy5vcmlnaW5bMV0udG9GaXhlZCgyKSAqIDEwMCArICclJztcbiAgICB9XG5cbiAgICBpZiAoU3VyZmFjZS5pbnZhbGlkYXRpb25zLmV2ZW50cyAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICBpID0gc3BlYy5ldmVudHMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoc3BlYy5ldmVudHNbaV0sIHNwZWMuZXZlbnRGb3J3YXJkZXIpO1xuICAgIH1cblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMuc2l6ZSAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICBpZiAoc3BlYy5zaXplICYmIHNwZWMuc2l6ZVswXSkgeyBcbiAgICAgICAgICAgIGlmIChzcGVjLnNpemVbMF0gIT09IHRydWUpIGVsZW1lbnQuc3R5bGUud2lkdGggPSBzcGVjLnNpemVbMF0gKyAncHgnO1xuICAgICAgICB9IFxuICAgICAgICBlbHNlIHsgLy8gdW5kZWZpbmVkLCBiZSB0aGUgc2l6ZSBvZiBpdCdzIHBhcmVudFxuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS53aWR0aCA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3NpemUnKS5fZ2xvYmFsU2l6ZVswXSArICdweCc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwZWMuc2l6ZSAmJiBzcGVjLnNpemVbMV0pIHtcbiAgICAgICAgICAgIGlmIChzcGVjLnNpemVbMV0gIT09IHRydWUpIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gc3BlYy5zaXplWzFdICsgJ3B4JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gZW50aXR5LmdldENvbXBvbmVudCgnc2l6ZScpLl9nbG9iYWxTaXplWzFdICsgJ3B4JztcbiAgICAgICAgfVxuICAgICAgICBzdXJmYWNlLl9zZXRWZXJ0ZXhEaXNwbGFjZW1lbnQoZWxlbWVudC5vZmZzZXRXaWR0aCwgZWxlbWVudC5vZmZzZXRIZWlnaHQpO1xuICAgICAgICBzcGVjLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnRyYW5zZm9ybTtcbiAgICB9XG5cbiAgICBpZiAoU3VyZmFjZS5pbnZhbGlkYXRpb25zLnRyYW5zZm9ybSAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICB2YXIgdHJhbnNmb3JtID0gTWF0cml4TWF0aC5tdWx0aXBseShtYXRyaXhTY3JhdGNoMywgY29udGFpbmVyLmdldERpc3BsYXlNYXRyaXgoKSwgZW50aXR5LmdldENvbXBvbmVudChUUkFOU0ZPUk0pLl9tYXRyaXgpLFxuICAgICAgICAgICAgY2FtZXJhICAgID0gZW50aXR5LmdldENvbnRleHQoKS5nZXRDb21wb25lbnQoJ2NhbWVyYScpO1xuICAgICAgICB0cmFuc2Zvcm0gICAgID0gRE9NUmVuZGVyZXIuY3JlYXRlRE9NTWF0cml4KHRyYW5zZm9ybSwgY29udGV4dFNpemUsIHN1cmZhY2UuX3NpemUsIHNwZWMub3JpZ2luKTtcbiAgICAgICAgaWYgKGNhbWVyYSkge1xuICAgICAgICAgICAgdmFyIGZvY2FsUG9pbnQgICAgPSBjYW1lcmEuZ2V0T3B0aW9ucygpLnByb2plY3Rpb24uZm9jYWxQb2ludCxcbiAgICAgICAgICAgICAgICBmeCAgICAgICAgICAgID0gKGZvY2FsUG9pbnRbMF0gKyAxKSAqIDAuNSAqIGNvbnRleHRTaXplWzBdLFxuICAgICAgICAgICAgICAgIGZ5ICAgICAgICAgICAgPSAoMSAtIGZvY2FsUG9pbnRbMV0pICogMC41ICogY29udGV4dFNpemVbMV0sXG4gICAgICAgICAgICAgICAgc2NyYXRjaE1hdHJpeCA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAgMCwgMCwgMCwgMSwgMCwgZnggLSBzdXJmYWNlLl9zaXplWzBdICogc3BlYy5vcmlnaW5bMF0sICBmeSAtIHN1cmZhY2UuX3NpemVbMV0gKiBzcGVjLm9yaWdpblsxXSwgMCwgMV07XG4gICAgICAgICAgICBNYXRyaXhNYXRoLm11bHRpcGx5KHNjcmF0Y2hNYXRyaXgsIHNjcmF0Y2hNYXRyaXgsIFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAgMCwgMCwgMCwgMSwgZW50aXR5LmdldENvbnRleHQoKS5nZXRDb21wb25lbnQoJ2NhbWVyYScpLmdldFByb2plY3Rpb25UcmFuc2Zvcm0oKVsxMV0sICAwLCAwLCAwLCAxXSk7XG4gICAgICAgICAgICBNYXRyaXhNYXRoLm11bHRpcGx5KHNjcmF0Y2hNYXRyaXgsIHNjcmF0Y2hNYXRyaXgsIFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAtKGZ4IC0gc3VyZmFjZS5fc2l6ZVswXSAqIHNwZWMub3JpZ2luWzBdKSwgIC0oZnkgLSBzdXJmYWNlLl9zaXplWzFdICogc3BlYy5vcmlnaW5bMV0pLCAwLCAxXSk7XG4gICAgICAgICAgICBNYXRyaXhNYXRoLm11bHRpcGx5KHRyYW5zZm9ybSwgc2NyYXRjaE1hdHJpeCwgdHJhbnNmb3JtKTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50LnN0eWxlW0NTU1RSQU5TRk9STV0gPSBET01SZW5kZXJlci5zdHJpbmdpZnlNYXRyaXgodHJhbnNmb3JtKTtcbiAgICAgICAgLy8gc3VyZmFjZS5fY3VsbGVkID0gIV9pc1dpdGhpbihzdXJmYWNlLCBlbnRpdHksIGNvbnRhaW5lckVudGl0eSwgdHJhbnNmb3JtKTsgLy8gVE9ETyBmaWd1cmUgb3V0IHZlcnRleCBjdWxsaW5nIGFnYWluXG4gICAgfVxuICAgIHN1cmZhY2UucmVzZXRJbnZhbGlkYXRpb25zKCk7XG59XG5cbi8qKlxuICogUmVuZGVyIHdpbGwgcnVuIG92ZXIgYWxsIG9mIHRoZSBxdWV1ZXMgdGhhdCBoYXZlIGJlZW4gcG9wdWxhdGVkXG4gKiAgYnkgdGhlIFJlbmRlclN5c3RlbSBhbmQgd2lsbCBleGVjdXRlIHRoZSBkZXBsb3ltZW50LCByZWNhbGxpbmcsXG4gKiAgYW5kIHVwZGF0aW5nLlxuICpcbiAqIEBtZXRob2QgcmVuZGVyXG4gKi9cbiBET01SZW5kZXJlci5yZW5kZXIgPSBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgdmFyIHF1ZXVlLFxuICAgICAgICBjb250YWluZXJJRCxcbiAgICAgICAgaW5uZXJRdWV1ZXMsXG4gICAgICAgIHF1ZXVlcyAgICAgPSBET01SZW5kZXJlci5fcXVldWVzLFxuICAgICAgICBjb250YWluZXJzID0gT2JqZWN0LmtleXMocXVldWVzLnN1cmZhY2VzKSxcbiAgICAgICAgaiAgICAgICAgICA9IGNvbnRhaW5lcnMubGVuZ3RoLFxuICAgICAgICBpICAgICAgICAgID0gMCxcbiAgICAgICAgayAgICAgICAgICA9IDA7XG4gICAgXG4gICAgLy8gRGVwbG95IENvbnRhaW5lcnNcbiAgICBxdWV1ZSA9IHF1ZXVlcy5jb250YWluZXJzLmRlcGxveTtcbiAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSBfZGVwbG95Q29udGFpbmVyKHF1ZXVlLnNoaWZ0KCkpO1xuXG4gICAgLy8gUmVjYWxsIENvbnRhaW5lcnNcbiAgICBxdWV1ZSA9IHF1ZXVlcy5jb250YWluZXJzLnJlY2FsbDtcbiAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSBfcmVjYWxsQ29udGFpbmVyKHF1ZXVlLnNoaWZ0KCkpO1xuXG4gICAgLy8gVXBkYXRlIENvbnRhaW5lcnNcbiAgICBxdWV1ZSA9IHF1ZXVlcy5jb250YWluZXJzLnVwZGF0ZTtcbiAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSBfdXBkYXRlQ29udGFpbmVyKHF1ZXVlLnNoaWZ0KCkpO1xuXG4gICAgLy8gRm9yIGVhY2ggQ29udGFpbmVyXG4gICAgd2hpbGUgKGotLSkge1xuICAgICAgICBjb250YWluZXJJRCA9IGNvbnRhaW5lcnNbal07XG4gICAgICAgIGlubmVyUXVldWVzID0gcXVldWVzLnN1cmZhY2VzW2NvbnRhaW5lcklEXTtcblxuICAgICAgICAvLyBEZXBsb3kgU3VyZmFjZXNcbiAgICAgICAgcXVldWUgPSBpbm5lclF1ZXVlcy5kZXBsb3k7XG4gICAgICAgIGkgICAgID0gcXVldWUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBfZGVwbG95KHF1ZXVlLnNoaWZ0KCksIGNvbnRhaW5lcklEKTtcblxuICAgICAgICAvLyBSZWNhbGwgU3VyZmFjZXNcbiAgICAgICAgcXVldWUgPSBpbm5lclF1ZXVlcy5yZWNhbGw7XG4gICAgICAgIGkgICAgID0gcXVldWUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBfcmVjYWxsKHF1ZXVlLnNoaWZ0KCksIGNvbnRhaW5lcklEKTtcblxuICAgICAgICAvLyBVcGRhdGUgU3VyZmFjZXNcbiAgICAgICAgcXVldWUgPSBpbm5lclF1ZXVlcy51cGRhdGU7XG4gICAgICAgIGkgICAgID0gcXVldWUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBfdXBkYXRlKHF1ZXVlLnNoaWZ0KCksIGNvbnRhaW5lcklEKTtcbiAgICB9XG5cbn07XG5cbi8vIEdldCB0aGUgdHlwZSBvZiBUYXJnZXRzIHRoZSBET01SZW5kZXJlciB3aWxsIHdvcmsgZm9yXG5ET01SZW5kZXJlci5nZXRUYXJnZXRzID0gZnVuY3Rpb24gZ2V0VGFyZ2V0cygpIHtcbiAgICByZXR1cm4gdGFyZ2V0cztcbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBUcmFuc2Zvcm0gbWF0cml4IGZvciBhIFN1cmZhY2UgYmFzZWQgb24gaXQgdHJhbnNmb3JtLFxuICogIHNpemUsIG9yaWdpbiwgYW5kIENvbnRleHQncyBzaXplLiAgVXNlcyBpdHMgQ29udGV4dCdzIHNpemUgdG9cbiAqICB0dXJuIGhvbW9nZW5vdXMgY29vcmRpbmF0ZSBUcmFuc2Zvcm1zIHRvIHBpeGVscy5cbiAqXG4gKiBAbWV0aG9kIGNyZWF0ZURPTU1BdHJpeFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHRyYW5zZm9ybSBUcmFuc2Zvcm0gbWF0cml4XG4gKiBAcGFyYW0ge0FycmF5fSBjb250ZXh0U2l6ZSAyLWRpbWVuc2lvbmFsIHNpemUgb2YgdGhlIENvbnRleHRcbiAqIEBwYXJhbSB7QXJyYXl9IHNpemUgc2l6ZSBvZiB0aGUgRE9NIGVsZW1lbnQgYXMgYSAzLWRpbWVuc2lvbmFsIGFycmF5XG4gKiBAcGFyYW0ge0FycmF5fSBvcmlnaW4gb3JpZ2luIG9mIHRoZSBET00gZWxlbWVudCBhcyBhIDItZGltZW5zaW9uYWwgYXJyYXlcbiAqIEBwYXJhbSB7QXJyYXl9IHJlc3VsdCBzdG9yYWdlIG9mIHRoZSBET00gYm91bmQgdHJhbnNmb3JtIG1hdHJpeFxuICovXG5ET01SZW5kZXJlci5jcmVhdGVET01NYXRyaXggPSBmdW5jdGlvbiBjcmVhdGVET01NYXRyaXgodHJhbnNmb3JtLCBjb250ZXh0U2l6ZSwgc2l6ZSwgb3JpZ2luLCByZXN1bHQpIHtcbiAgICByZXN1bHQgICAgICAgICAgICAgPSByZXN1bHQgfHwgW107XG4gICAgLy8gc2l6ZVswXSAgICAgICAgICAgLz0gMC41ICogY29udGV4dFNpemVbMF07IC8vIFRPRE86IFdlJ3JlIG5vdCB1c2luZyB0aGUgXG4gICAgLy8gc2l6ZVsxXSAgICAgICAgICAgLz0gMC41ICogY29udGV4dFNpemVbMV07XG4gICAgbWF0cml4U2NyYXRjaDFbMF0gID0gMTtcbiAgICBtYXRyaXhTY3JhdGNoMVsxXSAgPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzJdICA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbM10gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVs0XSAgPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzVdICA9IDE7XG4gICAgbWF0cml4U2NyYXRjaDFbNl0gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVs3XSAgPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzhdICA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbOV0gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVsxMF0gPSAxO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzExXSA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbMTJdID0gLXNpemVbMF0gKiBvcmlnaW5bMF07XG4gICAgbWF0cml4U2NyYXRjaDFbMTNdID0gLXNpemVbMV0gKiBvcmlnaW5bMV07XG4gICAgbWF0cml4U2NyYXRjaDFbMTRdID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVsxNV0gPSAxO1xuICAgIE1hdHJpeE1hdGgubXVsdGlwbHkobWF0cml4U2NyYXRjaDIsIG1hdHJpeFNjcmF0Y2gxLCB0cmFuc2Zvcm0pO1xuXG4gICAgcmVzdWx0WzBdICA9ICgobWF0cml4U2NyYXRjaDJbMF0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMF0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlswXSk7XG4gICAgcmVzdWx0WzFdICA9ICgobWF0cml4U2NyYXRjaDJbMV0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMV0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsxXSk7XG4gICAgcmVzdWx0WzJdICA9ICgobWF0cml4U2NyYXRjaDJbMl0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMl0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsyXSk7XG4gICAgcmVzdWx0WzNdICA9ICgobWF0cml4U2NyYXRjaDJbM10gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbM10gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlszXSk7XG4gICAgcmVzdWx0WzRdICA9ICgobWF0cml4U2NyYXRjaDJbNF0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbNF0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls0XSk7XG4gICAgcmVzdWx0WzVdICA9ICgobWF0cml4U2NyYXRjaDJbNV0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbNV0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls1XSk7XG4gICAgcmVzdWx0WzZdICA9ICgobWF0cml4U2NyYXRjaDJbNl0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbNl0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls2XSk7XG4gICAgcmVzdWx0WzddICA9ICgobWF0cml4U2NyYXRjaDJbN10gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbN10gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls3XSk7XG4gICAgcmVzdWx0WzhdICA9ICgobWF0cml4U2NyYXRjaDJbOF0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbOF0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls4XSk7XG4gICAgcmVzdWx0WzldICA9ICgobWF0cml4U2NyYXRjaDJbOV0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbOV0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls5XSk7XG4gICAgcmVzdWx0WzEwXSA9ICgobWF0cml4U2NyYXRjaDJbMTBdIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMTBdID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsxMF0pO1xuICAgIHJlc3VsdFsxMV0gPSAoKG1hdHJpeFNjcmF0Y2gyWzExXSA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzExXSA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMTFdKTtcbiAgICByZXN1bHRbMTJdID0gKChtYXRyaXhTY3JhdGNoMlsxMl0gPCAwLjAwMDAwMSAmJiBtYXRyaXhTY3JhdGNoMlsxMl0gPiAtMC4wMDAwMDEpID8gWkVSTyA6IG1hdHJpeFNjcmF0Y2gyWzEyXSkgKyAwLjUgKiBjb250ZXh0U2l6ZVswXTtcbiAgICByZXN1bHRbMTNdID0gKChtYXRyaXhTY3JhdGNoMlsxM10gPCAwLjAwMDAwMSAmJiBtYXRyaXhTY3JhdGNoMlsxM10gPiAtMC4wMDAwMDEpID8gWkVSTyA6IG1hdHJpeFNjcmF0Y2gyWzEzXSkgKyAwLjUgKiBjb250ZXh0U2l6ZVsxXTtcbiAgICAvLyByZXN1bHRbMTJdID0gKE1hdGgucm91bmQoKG1hdHJpeFNjcmF0Y2gyWzEyXSArIDEpICogMC41ICogY29udGV4dFNpemVbMF0gKiBERVZJQ0VQSVhFTFJBVElPKSAvIERFVklDRVBJWEVMUkFUSU8pO1xuICAgIC8vIHJlc3VsdFsxM10gPSAoTWF0aC5yb3VuZCgobWF0cml4U2NyYXRjaDJbMTNdICsgMSkgKiAwLjUgKiBjb250ZXh0U2l6ZVsxXSAqIERFVklDRVBJWEVMUkFUSU8pIC8gREVWSUNFUElYRUxSQVRJTyk7XG4gICAgcmVzdWx0WzE0XSA9ICgobWF0cml4U2NyYXRjaDJbMTRdIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMTRdID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsxNF0pO1xuICAgIHJlc3VsdFsxNV0gPSAoKG1hdHJpeFNjcmF0Y2gyWzE1XSA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzE1XSA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMTVdKTtcblxuICAgIC8vIHNpemVbMF0gKj0gMC41ICogY29udGV4dFNpemVbMF07XG4gICAgLy8gc2l6ZVsxXSAqPSAwLjUgKiBjb250ZXh0U2l6ZVsxXTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIENTUyByZXByZXNlbnRhdGlvbiBvZiBhIFRyYW5zZm9ybSBtYXRyaXhcbiAqXG4gKiBAbWV0aG9kIHN0cmluZ2lmeU1hdHJpeFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG0gVHJhbnNmb3JtIG1hdHJpeFxuICovXG5ET01SZW5kZXJlci5zdHJpbmdpZnlNYXRyaXggPSBmdW5jdGlvbiBzdHJpbmdpZnlNYXRyaXgobSkge1xuICAgIHJldHVybiBNQVRSSVgzRCArXG4gICAgICAgIG1bMF0gICsgQ09NTUEgK1xuICAgICAgICBtWzFdICArIENPTU1BICtcbiAgICAgICAgbVsyXSAgKyBDT01NQSArXG4gICAgICAgIG1bM10gICsgQ09NTUEgK1xuICAgICAgICBtWzRdICArIENPTU1BICtcbiAgICAgICAgbVs1XSAgKyBDT01NQSArXG4gICAgICAgIG1bNl0gICsgQ09NTUEgK1xuICAgICAgICBtWzddICArIENPTU1BICtcbiAgICAgICAgbVs4XSAgKyBDT01NQSArXG4gICAgICAgIG1bOV0gICsgQ09NTUEgK1xuICAgICAgICBtWzEwXSArIENPTU1BICtcbiAgICAgICAgbVsxMV0gKyBDT01NQSArXG4gICAgICAgIG1bMTJdICsgQ09NTUEgK1xuICAgICAgICBtWzEzXSArIENPTU1BICtcbiAgICAgICAgbVsxNF0gKyBDT01NQSArXG4gICAgICAgIG1bMTVdICsgQ0xPU0VfUEFSRU47XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gRE9NUmVuZGVyZXI7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogbWFya0BmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBvYmplY3QgdG8gQ29udGFpbmVyIHRoYXQgaGFuZGxlcyB0aGUgcHJvY2VzcyBvZlxuICogICBjcmVhdGluZyBhbmQgYWxsb2NhdGluZyBET00gZWxlbWVudHMgd2l0aGluIGEgbWFuYWdlZCBkaXYuXG4gKiAgIFByaXZhdGUuXG4gKlxuICogQGNsYXNzIEVsZW1lbnRBbGxvY2F0b3JcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RE9NRWxlbWVudH0gY29udGFpbmVyIGRvY3VtZW50IGVsZW1lbnQgaW4gd2hpY2ggRmFtby51cyBjb250ZW50IHdpbGwgYmUgaW5zZXJ0ZWRcbiAqL1xuZnVuY3Rpb24gRWxlbWVudEFsbG9jYXRvcihjb250YWluZXIpIHtcbiAgICBpZiAoIWNvbnRhaW5lcikgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHRoaXMuY29udGFpbmVyICAgICA9IGNvbnRhaW5lcjtcbiAgICB0aGlzLmRldGFjaGVkTm9kZXMgPSB7fTtcbiAgICB0aGlzLm5vZGVDb3VudCAgICAgPSAwO1xufVxuXG4vKipcbiAqIEFsbG9jYXRlIGFuIGVsZW1lbnQgb2Ygc3BlY2lmaWVkIHR5cGUgZnJvbSB0aGUgcG9vbC5cbiAqXG4gKiBAbWV0aG9kIGFsbG9jYXRlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgdHlwZSBvZiBlbGVtZW50LCBlLmcuICdkaXYnXG4gKlxuICogQHJldHVybiB7RE9NRWxlbWVudH0gYWxsb2NhdGVkIGRvY3VtZW50IGVsZW1lbnRcbiAqL1xuRWxlbWVudEFsbG9jYXRvci5wcm90b3R5cGUuYWxsb2NhdGUgPSBmdW5jdGlvbiBhbGxvY2F0ZSh0eXBlKSB7XG4gICAgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAoISh0eXBlIGluIHRoaXMuZGV0YWNoZWROb2RlcykpIHRoaXMuZGV0YWNoZWROb2Rlc1t0eXBlXSA9IFtdO1xuICAgIHZhciBub2RlU3RvcmUgPSB0aGlzLmRldGFjaGVkTm9kZXNbdHlwZV07XG4gICAgdmFyIHJlc3VsdDtcbiAgICBpZiAobm9kZVN0b3JlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVzdWx0ID0gbm9kZVN0b3JlLnBvcCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodHlwZSk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKHJlc3VsdCk7XG4gICAgfVxuICAgIHRoaXMubm9kZUNvdW50Kys7XG4gICAgcmVzdWx0LnN0eWxlLmRpc3BsYXkgPSAnJzsgICAgXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogRGUtYWxsb2NhdGUgYW4gZWxlbWVudCBvZiBzcGVjaWZpZWQgdHlwZSB0byB0aGUgcG9vbC5cbiAqXG4gKiBAbWV0aG9kIGRlYWxsb2NhdGVcbiAqXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR9IGVsZW1lbnQgZG9jdW1lbnQgZWxlbWVudCB0byBkZWFsbG9jYXRlXG4gKi9cbkVsZW1lbnRBbGxvY2F0b3IucHJvdG90eXBlLmRlYWxsb2NhdGUgPSBmdW5jdGlvbiBkZWFsbG9jYXRlKGVsZW1lbnQpIHtcbiAgICB2YXIgbm9kZVR5cGUgPSBlbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIG5vZGVTdG9yZSA9IHRoaXMuZGV0YWNoZWROb2Rlc1tub2RlVHlwZV07XG4gICAgbm9kZVN0b3JlLnB1c2goZWxlbWVudCk7XG4gICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIGVsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcnO1xuICAgIGVsZW1lbnQuc3R5bGUud2lkdGggICA9ICcnO1xuICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ICA9ICcnO1xuICAgIHRoaXMubm9kZUNvdW50LS07XG59O1xuXG4vKipcbiAqIEdldCBjb3VudCBvZiB0b3RhbCBhbGxvY2F0ZWQgbm9kZXMgaW4gdGhlIGRvY3VtZW50LlxuICpcbiAqIEBtZXRob2QgZ2V0Tm9kZUNvdW50XG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0b3RhbCBub2RlIGNvdW50XG4gKi9cbkVsZW1lbnRBbGxvY2F0b3IucHJvdG90eXBlLmdldE5vZGVDb3VudCA9IGZ1bmN0aW9uIGdldE5vZGVDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlQ291bnQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVsZW1lbnRBbGxvY2F0b3I7IiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGFkbmFuQGZhbW8udXMsXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgSU5ESUNFUyAgICAgICAgPSAnaW5kaWNlcyc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgR2VvbWV0cnkgICAgICAgPSByZXF1aXJlKCcuLi8uLi9nbC9HZW9tZXRyeScpO1xudmFyIFRleHR1cmUgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vZ2wvVGV4dHVyZScpO1xudmFyIFNoYWRlciAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vZ2wvU2hhZGVyJyk7XG52YXIgQnVmZmVyICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9nbC9CdWZmZXInKTtcbnZhciBUaW1lU3lzdGVtICAgICA9IHJlcXVpcmUoJy4uL1N5c3RlbXMvVGltZVN5c3RlbScpO1xuXG52YXIgTWF0ZXJpYWxzICAgICAgPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdNYXRlcmlhbHMnKTtcbnZhciBHZW9tZXRyaWVzICAgICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0dlb21ldHJpZXMnKTtcbnZhciBMaWdodHMgICAgICAgICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0xpZ2h0cycpO1xudmFyIEZYQ29tcG9zZXJzICAgID0gRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignZngnKTtcbnZhciBDb250ZXh0cyAgICAgICA9IEVudGl0eVJlZ2lzdHJ5LmdldENvbGxlY3Rpb24oJ0NvbnRleHRzJyk7XG5cbnZhciBXZWJHTFJlbmRlcmVyICAgPSB7fTtcbnZhciBCdWZmZXJSZWdpc3RyeSAgPSB7fTtcbnZhciBUZXh0dXJlUmVnaXN0cnkgPSB7fTtcblxudmFyIGlkZW50aXR5TWF0cml4ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xudmFyIG1vdXNlICAgICAgICAgID0gWy41LCAuNV07XG53aW5kb3cudGV4dHVyZSA9IFRleHR1cmVSZWdpc3RyeTtcblxuV2ViR0xSZW5kZXJlci5kcmF3ID0gZnVuY3Rpb24gZHJhdyhzcGVjKSB7XG4gICAgdmFyIHZlcnRleEJ1ZmZlcnMgPSBCdWZmZXJSZWdpc3RyeVtzcGVjLmlkXSB8fCAoQnVmZmVyUmVnaXN0cnlbc3BlYy5pZF0gPSB7fSk7XG5cbiAgICBmb3IgKHZhciBuYW1lIGluIHNwZWMudmVydGV4QnVmZmVycykge1xuICAgICAgICBpZiAoISBzcGVjLmludmFsaWRhdGlvbnNbbmFtZV0pIGNvbnRpbnVlO1xuICAgICAgICBzcGVjLmludmFsaWRhdGlvbnNbbmFtZV0gPSB2b2lkIDA7XG5cbiAgICAgICAgdmFyIGlzSW5kZXggPSBuYW1lID09IElORElDRVM7XG4gICAgICAgIFxuICAgICAgICBpZiAoISB2ZXJ0ZXhCdWZmZXJzW25hbWVdKVxuICAgICAgICAgICAgdmVydGV4QnVmZmVyc1tuYW1lXSA9IG5ldyBCdWZmZXIoXG4gICAgICAgICAgICAgICAgaXNJbmRleD8gdGhpcy5nbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiA6IHRoaXMuZ2wuQVJSQVlfQlVGRkVSLFxuICAgICAgICAgICAgICAgIGlzSW5kZXggPyBVaW50MTZBcnJheSA6IEZsb2F0MzJBcnJheSxcbiAgICAgICAgICAgICAgICB0aGlzLmdsLFxuICAgICAgICAgICAgICAgIHZlcnRleEJ1ZmZlcnMuc3BhY2luZyk7XG5cbiAgICAgICAgdmVydGV4QnVmZmVyc1tuYW1lXS5kYXRhID0gc3BlYy52ZXJ0ZXhCdWZmZXJzW25hbWVdO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzW25hbWVdLnN1YkRhdGEoKTtcbiAgICB9XG5cbiAgICB0aGlzLmdsLmRlcHRoTWFzayghIHNwZWMudW5pZm9ybXMub3BhY2l0eSA8IDEpO1xuICAgIFxuICAgIHRoaXMuc2hhZGVyLnNldFVuaWZvcm1zKHNwZWMudW5pZm9ybXMpO1xuXG4gICAgaWYgKFRleHR1cmVSZWdpc3RyeVtzcGVjLmlkXSkgVGV4dHVyZVJlZ2lzdHJ5W3NwZWMuaWRdLmJpbmQoKTtcbiAgICBcbiAgICB0aGlzLmRyYXdCdWZmZXJzKEJ1ZmZlclJlZ2lzdHJ5W3NwZWMuaWRdLCB0aGlzLmdsW3NwZWMudHlwZV0pO1xufTtcblxuV2ViR0xSZW5kZXJlci5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zaGFkZXIuc2V0VW5pZm9ybXMoe1xuICAgICAgICBtb3VzZTogbW91c2UsXG4gICAgICAgIHRpbWU6IFRpbWVTeXN0ZW0uZ2V0RWxhcHNlZFJlbGF0aXZlVGltZSgpXG4gICAgfSk7XG4gICAgXG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTGlnaHRzLmVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbnRpdHkgPSBMaWdodHMuZW50aXRpZXNbaV07XG4gICAgICAgIHZhciBsaWdodCA9IGVudGl0eS5nZXRDb21wb25lbnQoJ2xpZ2h0Jyk7XG5cbiAgICAgICAgdGhpcy5zaGFkZXIuc2V0VW5pZm9ybXMoe1xuICAgICAgICAgICAgbGlnaHRQb3M6IGxpZ2h0Ll9zcGVjLnBvc2l0aW9uLFxuICAgICAgICAgICAgbGlnaHRDb2xvcjogbGlnaHQuX3NwZWMuY29sb3JcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBHZW9tZXRyaWVzLmVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbnRpdHkgPSBHZW9tZXRyaWVzLmVudGl0aWVzW2ldO1xuICAgICAgICB2YXIgY29udGV4dCA9IGVudGl0eS5nZXRDb250ZXh0KCk7XG4gICAgICAgIGlmIChjb250ZXh0KSB0aGlzLnNoYWRlci5zZXRVbmlmb3Jtcyh7XG4gICAgICAgICAgICBwZXJzcGVjdGl2ZTogYXBwbHlQcm9qZWN0aW9uKGVudGl0eSwgY29udGV4dCksXG4gICAgICAgICAgICByZXNvbHV0aW9uOiBjb250ZXh0Ll9zaXplLFxuICAgICAgICAgICAgY2FtZXJhUG9zOiBjb250ZXh0Ll9jb21wb25lbnRzLmNhbWVyYS5nZXRPcHRpb25zKCkucHJvamVjdGlvbi5mb2NhbFBvaW50XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBzcGVjID0gZW50aXR5Ll9jb21wb25lbnRzLmdlb21ldHJ5LnJlbmRlcigpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNwZWMub2Zmc2NyZWVuKVxuICAgICAgICAgICAgdGhpcy5SVFQodGhpcy5kcmF3LCBzcGVjLCBjb250ZXh0KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5kcmF3KHNwZWMpO1xuICAgIH1cbn07XG5cbldlYkdMUmVuZGVyZXIuZHJhd0J1ZmZlcnMgPSBmdW5jdGlvbiBkcmF3QnVmZmVycyh2ZXJ0ZXhCdWZmZXJzLCBtb2RlKSB7XG4gICAgdmFyIGxlbmd0aCA9IDA7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgaW5kZXhCdWZmZXIgPSB2ZXJ0ZXhCdWZmZXJzLmluZGljZXM7XG4gICAgdmFyIGF0dHJpYnV0ZTtcblxuICAgIGZvciAoYXR0cmlidXRlIGluIHZlcnRleEJ1ZmZlcnMpIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZSA9PSBJTkRJQ0VTKSBjb250aW51ZTtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnNbYXR0cmlidXRlXTtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5zaGFkZXIuYXR0cmlidXRlc1thdHRyaWJ1dGVdIHx8IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMuc2hhZGVyLnByb2dyYW0sICdhXycgKyBhdHRyaWJ1dGUpO1xuICAgICAgICBpZiAobG9jYXRpb24gPT0gLTEgfHwgISBidWZmZXIuYnVmZmVyKSBjb250aW51ZTtcbiAgICAgICAgdGhpcy5zaGFkZXIuYXR0cmlidXRlc1thdHRyaWJ1dGVdID0gbG9jYXRpb247XG4gICAgICAgIGdsLmJpbmRCdWZmZXIoYnVmZmVyLnRhcmdldCwgYnVmZmVyLmJ1ZmZlcik7XG4gICAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGxvY2F0aW9uKTtcbiAgICAgICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihsb2NhdGlvbiwgYnVmZmVyLmJ1ZmZlci5zcGFjaW5nLCBnbC5GTE9BVCwgZ2wuRkFMU0UsIDAsIDApO1xuICAgICAgICBsZW5ndGggPSBidWZmZXIuYnVmZmVyLmxlbmd0aCAvIDE7XG4gICAgfVxuXG4gICAgZm9yIChhdHRyaWJ1dGUgaW4gdGhpcy5zaGFkZXIuYXR0cmlidXRlcylcbiAgICAgICAgaWYgKCEgdmVydGV4QnVmZmVyc1thdHRyaWJ1dGVdKSBnbC5kaXNhYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5zaGFkZXIuYXR0cmlidXRlc1thdHRyaWJ1dGVdKTtcblxuICAgIGlmIChsZW5ndGgpIHtcbiAgICAgICAgaWYgKGluZGV4QnVmZmVyKVxuICAgICAgICAgICAgZ2wuYmluZEJ1ZmZlcihpbmRleEJ1ZmZlci50YXJnZXQsIGluZGV4QnVmZmVyLmJ1ZmZlciksXG4gICAgICAgICAgICBnbC5kcmF3RWxlbWVudHMobW9kZSwgaW5kZXhCdWZmZXIuYnVmZmVyLmxlbmd0aCwgZ2wuVU5TSUdORURfU0hPUlQsIDApO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBnbC5kcmF3QXJyYXlzKG1vZGUsIDAsIGxlbmd0aCk7XG4gICAgfVxufTtcblxuV2ViR0xSZW5kZXJlci5nZXRUYXJnZXRzID0gZnVuY3Rpb24gZ2V0VGFyZ2V0cygpIHtcbiAgICByZXR1cm4gW0dlb21ldHJ5LnRvU3RyaW5nKCldO1xufTtcblxuV2ViR0xSZW5kZXJlci5pbml0ICA9IGZ1bmN0aW9uIGluaXQob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHsgYWxwaGE6IHRydWUgfTtcblxuICAgIHZhciBjYW52YXMgICA9IG9wdGlvbnMuY2FudmFzO1xuICAgIHZhciBwYXJlbnRFbCA9IG9wdGlvbnMucGFyZW50RWwgfHwgZG9jdW1lbnQuYm9keTtcblxuICAgIGlmICghIGNhbnZhcykge1xuICAgICAgICBjYW52YXMgICAgICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIGNhbnZhcy5jbGFzc05hbWUgPSAnR0wnO1xuICAgICAgICBjYW52YXMud2lkdGggICAgID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgICAgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgfVxuICAgIFxuICAgIHBhcmVudEVsLmFwcGVuZENoaWxkKGNhbnZhcyk7XG5cbiAgICB2YXIgZ2wgPSB0aGlzLmdsID0gY2FudmFzLmdldENvbnRleHQoJ3dlYmdsJywgb3B0aW9ucykgfHwgY2FudmFzLmdldENvbnRleHQoJ2V4cGVyaW1lbnRhbC13ZWJnbCcsIG9wdGlvbnMpO1xuICAgIGlmICghIGdsKSB0aHJvdyAnV2ViR0wgbm90IHN1cHBvcnRlZCc7XG5cbiAgICBmdW5jdGlvbiBtb3VzZWQoZSkge1xuICAgICAgICBpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlcy5sZW5ndGgpIGUgPSBlLnRvdWNoZXNbMF07XG4gICAgICAgIG1vdXNlWzBdID0gKGUueCB8fCBlLmNsaWVudFgpICAvIGlubmVyV2lkdGg7XG4gICAgICAgIG1vdXNlWzFdID0gMS4gLSAoZS55IHx8IGUuY2xpZW50WSkgLyBpbm5lckhlaWdodDtcbiAgICB9O1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG1vdXNlZCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG1vdXNlZCk7XG5cbiAgICB0aGlzLnNoYWRlciA9IG5ldyBTaGFkZXIoZ2wpO1xuXG4gICAgZ2wucG9seWdvbk9mZnNldCgwLjEsIDAuMSk7XG4gICAgZ2wuZW5hYmxlKGdsLlBPTFlHT05fT0ZGU0VUX0ZJTEwpO1xuICAgIGdsLnZpZXdwb3J0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG4gICAgZ2wuZW5hYmxlKGdsLkRFUFRIX1RFU1QpO1xuICAgIGdsLmVuYWJsZShnbC5CTEVORCk7XG4gICAgZ2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG4gICAgZ2wuZGVwdGhGdW5jKGdsLkxFUVVBTCk7XG4gICAgXG4gICAgaWYgKG9wdGlvbnMuYmFja2ZhY2VDdWxsaW5nKSBnbC5lbmFibGUoZ2wuQ1VMTF9GQUNFKTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNYXRlcmlhbHMub24oJ2VudGl0eUFkZGVkJywgZnVuY3Rpb24gKGVudGl0eSkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuc2hhZGVyLnJlc2V0UHJvZ3JhbSgpO1xuICAgICAgICAgICAgdmFyIG1hdGVyaWFsID0gZW50aXR5Ll9jb21wb25lbnRzLm1hdGVyaWFsO1xuICAgICAgICAgICAgdmFyIGltYWdlID0gbWF0ZXJpYWwub3B0aW9ucy5pbWFnZTtcbiAgICAgICAgICAgIGlmICghIGltYWdlKSByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChpbWFnZS5iaW5kKSBUZXh0dXJlUmVnaXN0cnlbbWF0ZXJpYWwuZW50aXR5XSA9IGltYWdlO1xuXG4gICAgICAgICAgICBlbHNlIGxvYWRJbWFnZShpbWFnZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFRleHR1cmVSZWdpc3RyeVttYXRlcmlhbC5lbnRpdHldID1cbiAgICAgICAgICAgICAgICAgICAgbmV3IFRleHR1cmUoc2VsZi5nbCwgdGhpcy50YXJnZXQpLmltYWdlKHRoaXMudGFyZ2V0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBnbDtcbn1cblxuV2ViR0xSZW5kZXJlci5SVFQgPSBmdW5jdGlvbihjYiwgc3BlYywgY29udGV4dCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIHRleHR1cmUgPSBzcGVjLm9mZnNjcmVlbi50ZXh0dXJlO1xuICAgIHZhciB2ID0gY29udGV4dC5fc2l6ZTtcblxuICAgIHZhciBmcmFtZWJ1ZmZlciAgPSB0aGlzLmZyYW1lYnVmZmVyID8gdGhpcy5mcmFtZWJ1ZmZlciA6IHRoaXMuZnJhbWVidWZmZXIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpO1xuICAgIHZhciByZW5kZXJidWZmZXIgPSB0aGlzLnJlbmRlcmJ1ZmZlciA/IHRoaXMucmVuZGVyYnVmZmVyIDogdGhpcy5yZW5kZXJidWZmZXIgPSBnbC5jcmVhdGVSZW5kZXJidWZmZXIoKTtcblxuICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgZnJhbWVidWZmZXIpO1xuICAgIGdsLmJpbmRSZW5kZXJidWZmZXIoZ2wuUkVOREVSQlVGRkVSLCByZW5kZXJidWZmZXIpO1xuXG4gICAgaWYgKHZbMF0gIT0gcmVuZGVyYnVmZmVyLndpZHRoIHx8IHZbMV0gIT0gcmVuZGVyYnVmZmVyLmhlaWdodCkge1xuICAgICAgICByZW5kZXJidWZmZXIud2lkdGggPSB2WzBdO1xuICAgICAgICByZW5kZXJidWZmZXIuaGVpZ2h0ID0gdlsxXTtcbiAgICAgICAgZ2wucmVuZGVyYnVmZmVyU3RvcmFnZShnbC5SRU5ERVJCVUZGRVIsIGdsLkRFUFRIX0NPTVBPTkVOVDE2LCB2WzBdLCB2WzFdKTtcbiAgICB9XG5cbiAgICBnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChnbC5GUkFNRUJVRkZFUiwgZ2wuQ09MT1JfQVRUQUNITUVOVDAsIGdsLlRFWFRVUkVfMkQsIHRleHR1cmUuaWQsIDApO1xuICAgIGdsLmZyYW1lYnVmZmVyUmVuZGVyYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBnbC5ERVBUSF9BVFRBQ0hNRU5ULCBnbC5SRU5ERVJCVUZGRVIsIHJlbmRlcmJ1ZmZlcik7XG5cbiAgICBjYi5jYWxsKHRoaXMsIHNwZWMpO1xuXG4gICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcbiAgICBnbC5iaW5kUmVuZGVyYnVmZmVyKGdsLlJFTkRFUkJVRkZFUiwgbnVsbCk7XG47fTtcblxuV2ViR0xSZW5kZXJlci5kZXBsb3lDb250YWluZXIgPSBmdW5jdGlvbiAoKSB7fTtcbldlYkdMUmVuZGVyZXIuZGVwbG95ID0gZnVuY3Rpb24gKCkge307XG5XZWJHTFJlbmRlcmVyLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHt9O1xuV2ViR0xSZW5kZXJlci5zZXRPcHRpb25zID0gZnVuY3Rpb24oKSB7fTtcbldlYkdMUmVuZGVyZXIucmVjYWxsID0gZnVuY3Rpb24gKCkge307XG5cbmZ1bmN0aW9uIGFwcGx5UHJvamVjdGlvbiAoZ2VvbSwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGNhbWVyYSA9IGNvbnRleHQuZ2V0Q29tcG9uZW50KCdjYW1lcmEnKTtcbiAgICAgICAgICAgIHZhciBwID0gY2FtZXJhID8gY2FtZXJhLmdldFByb2plY3Rpb25UcmFuc2Zvcm0oKSA6IGlkZW50aXR5TWF0cml4O1xuICAgICAgICAgICAgdmFyIGNhbWVyYUZvY2FsID0gIGNhbWVyYSA/IGNhbWVyYS5nZXRPcHRpb25zKCkucHJvamVjdGlvbi5mb2NhbFBvaW50WzJdIDogMDtcbiAgICAgICAgICAgIHZhciBjb250ZXh0V2lkdGggPSBjb250ZXh0Ll9zaXplWzBdO1xuICAgICAgICAgICAgdmFyIGNvbnRleHRIZWlnaHQgPSBjb250ZXh0Ll9zaXplWzFdO1xuICAgICAgICAgICAgdmFyIGNvbnRleHRXaWRlciA9IGNvbnRleHRXaWR0aCA+IGNvbnRleHRIZWlnaHQ7XG4gICAgICAgICAgICB2YXIgaG9yaXpvbnRhbEFzcGVjdFJhdGlvQ29ycmVjdGlvbiA9IGNvbnRleHRXaWRlciA/IGNvbnRleHRIZWlnaHQvY29udGV4dFdpZHRoIDogMTtcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNhbEFzcGVjdFJhdGlvQ29ycmVjdGlvbiA9IGNvbnRleHRXaWRlciA/IDEgOiBjb250ZXh0V2lkdGgvY29udGV4dEhlaWdodDtcbiAgICAgICAgICAgIHZhciBmb2NhbERlcHRoID0gY2FtZXJhRm9jYWwgPyAgY29udGV4dEhlaWdodC9jYW1lcmFGb2NhbCA6IDA7XG5cbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgaG9yaXpvbnRhbEFzcGVjdFJhdGlvQ29ycmVjdGlvbixcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgMCxcblxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgdmVydGljYWxBc3BlY3RSYXRpb0NvcnJlY3Rpb24sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAwLFxuXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIHBbMTBdLFxuICAgICAgICAgICAgICAgICgtKGZvY2FsRGVwdGgpICogMC41KSAqIHZlcnRpY2FsQXNwZWN0UmF0aW9Db3JyZWN0aW9uLFxuXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgMVxuICAgICAgICAgICAgXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXZWJHTFJlbmRlcmVyO1xuXG5mdW5jdGlvbiBsb2FkSW1hZ2UgKGltZywgY2IpIHtcbiAgICB2YXIgb2JqID0gKHR5cGVvZiBpbWcgPT09ICdzdHJpbmcnID8gbmV3IEltYWdlKCkgOiBpbWcpIHx8IHt9O1xuICAgIG9iai5jcm9zc09yaWdpbiA9ICdhbm9ueW1vdXMnO1xuICAgIG9iai5vbmxvYWQgPSBmdW5jdGlvbiAoaW1nKSB7XG4gICAgICAgIGNiLmNhbGwoaW1nKTtcbiAgICB9O1xuICAgIG9iai5zcmMgPSBpbWc7XG4gICAgcmV0dXJuIG9iajtcbn1cbiIsInZhciBjc3MgPSBcIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXFxuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cXG4gKlxcbiAqIE93bmVyOiBtYXJrQGZhbW8udXNcXG4gKiBAbGljZW5zZSBNUEwgMi4wXFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XFxuICovXFxuXFxuXFxuaHRtbCB7XFxuICAgIHdpZHRoOiAxMDAlO1xcbiAgICBoZWlnaHQ6IDEwMCU7XFxuICAgIG1hcmdpbjogMHB4O1xcbiAgICBwYWRkaW5nOiAwcHg7XFxuICAgIG92ZXJmbG93OiBoaWRkZW47XFxuICAgIC13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXG4gICAgdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXG59XFxuXFxuYm9keSB7XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICAgIGhlaWdodDogMTAwJTtcXG4gICAgbWFyZ2luOiAwcHg7XFxuICAgIHBhZGRpbmc6IDBweDtcXG4gICAgLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcbiAgICB0cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcbiAgICAtd2Via2l0LWZvbnQtc21vb3RoaW5nOiBhbnRpYWxpYXNlZDtcXG4gICAgLXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gICAgLXdlYmtpdC1wZXJzcGVjdGl2ZTogMDtcXG4gICAgcGVyc3BlY3RpdmU6IG5vbmU7XFxuICAgIG92ZXJmbG93OiBoaWRkZW47XFxufVxcblxcbi5mYW1vdXMtY29udGFpbmVyLCAuZmFtb3VzLWdyb3VwIHtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICB0b3A6IDBweDtcXG4gICAgbGVmdDogMHB4O1xcbiAgICBib3R0b206IDBweDtcXG4gICAgcmlnaHQ6IDBweDtcXG4gICAgb3ZlcmZsb3c6IHZpc2libGU7XFxuICAgIC13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXG4gICAgdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXG4gICAgLXdlYmtpdC1iYWNrZmFjZS12aXNpYmlsaXR5OiB2aXNpYmxlO1xcbiAgICBiYWNrZmFjZS12aXNpYmlsaXR5OiB2aXNpYmxlO1xcbiAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcXG59XFxuXFxuLmZhbW91cy1ncm91cCB7XFxuICAgIHdpZHRoOiAwcHg7XFxuICAgIGhlaWdodDogMHB4O1xcbiAgICBtYXJnaW46IDBweDtcXG4gICAgcGFkZGluZzogMHB4O1xcbiAgICAtd2Via2l0LXRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxuICAgIHRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxufVxcblxcbi5mYS1zdXJmYWNlIHtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICAtd2Via2l0LXRyYW5zZm9ybS1vcmlnaW46IDAlIDAlO1xcbiAgICB0cmFuc2Zvcm0tb3JpZ2luOiAwJSAwJTtcXG4gICAgLXdlYmtpdC1iYWNrZmFjZS12aXNpYmlsaXR5OiB2aXNpYmxlO1xcbiAgICBiYWNrZmFjZS12aXNpYmlsaXR5OiB2aXNpYmxlO1xcbiAgICAtd2Via2l0LXRyYW5zZm9ybS1zdHlsZTogZmxhdDtcXG4gICAgdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDsgLyogcGVyZm9ybWFuY2UgKi9cXG4vKiAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsqL1xcbiAgICAtd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgICBwb2ludGVyLWV2ZW50czogYXV0bztcXG5cXG59XFxuXFxuLmZhbW91cy1jb250YWluZXItZ3JvdXAge1xcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICAgIHdpZHRoOiAxMDAlO1xcbiAgICBoZWlnaHQ6IDEwMCU7XFxufVxcblxcbi5mYS1jb250YWluZXIge1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIC13ZWJraXQtdHJhbnNmb3JtLW9yaWdpbjogY2VudGVyIGNlbnRlcjtcXG4gICAgdHJhbnNmb3JtLW9yaWdpbjogY2VudGVyIGNlbnRlcjtcXG4gICAgb3ZlcmZsb3c6IGhpZGRlbjtcXG59XFxuXFxuY2FudmFzLkdMIHtcXG4gICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgei1pbmRleDogOTk5OTtcXG4gICAgdG9wOiAwcHg7XFxuICAgIGxlZnQ6IDBweDtcXG59XFxuXCI7IChyZXF1aXJlKFwiYzpcXFxcVXNlcnNcXFxcTW9yZ2FuXFxcXGRlc2t0b3BcXFxcZmFtb3VzXFxcXE1peGVkTW9kZVxcXFxub2RlX21vZHVsZXNcXFxcY3NzaWZ5XCIpKShjc3MpOyBtb2R1bGUuZXhwb3J0cyA9IGNzczsiLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgcmVuZGVyTm9kZXMgICAgPSBFbnRpdHlSZWdpc3RyeS5nZXRDb2xsZWN0aW9uKCdldmVyeXRoaW5nJyk7XG5cbi8qKlxuICogQSBzeXN0ZW0gdGhhdCB3aWxsIHJ1biBvdmVyIGN1c3RvbSBjb21wb25lbnRzIHRoYXQgaGF2ZSBhblxuICogICB1cGRhdGUgZnVuY3Rpb24uXG4gKlxuICogQGNsYXNzIEJlaGF2aW9yU3lzdGVtXG4gKiBAc3lzdGVtXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBCZWhhdmlvclN5c3RlbSA9IHt9O1xuXG4vKipcbiAqIFVwZGF0ZSB3aWxsIGl0ZXJhdGUgb3ZlciBhbGwgb2YgdGhlIGVudGl0aWVzIGFuZCBjYWxsXG4gKiAgIGVhY2ggb2YgdGhlaXIgdXBkYXRlIGZ1bmN0aW9ucy5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICovXG5CZWhhdmlvclN5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIGkgPSByZW5kZXJOb2Rlcy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKVxuICAgICAgICBpZiAocmVuZGVyTm9kZXMuZW50aXRpZXNbaV0udXBkYXRlKVxuICAgICAgICAgICAgcmVuZGVyTm9kZXMuZW50aXRpZXNbaV0udXBkYXRlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJlaGF2aW9yU3lzdGVtO1xuXG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5Jyk7XG5cbnZhciByb290cyAgICAgICAgICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0NvbnRleHRzJyk7XG5cbi8qKlxuICogQ29yZVN5c3RlbSBpcyByZXNwb25zaWJsZSBmb3IgdHJhdmVyc2luZyB0aGUgc2NlbmUgZ3JhcGggYW5kXG4gKiAgIHVwZGF0aW5nIHRoZSBUcmFuc2Zvcm1zLCBTaXplcywgYW5kIE9wYWNpdGllcyBvZiB0aGUgZW50aXRpZXMuXG4gKlxuICogQGNsYXNzICBDb3JlU3lzdGVtXG4gKiBAc3lzdGVtXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBDb3JlU3lzdGVtID0ge307XG5cbi8qKlxuICogdXBkYXRlIGl0ZXJhdGVzIG92ZXIgZWFjaCBvZiB0aGUgQ29udGV4dHMgdGhhdCB3ZXJlIHJlZ2lzdGVyZWQgYW5kXG4gKiAgIGtpY2tzIG9mIHRoZSByZWN1cnNpdmUgdXBkYXRpbmcgb2YgdGhlaXIgZW50aXRpZXMuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVcbiAqL1xuQ29yZVN5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgcm9vdHMuZm9yRWFjaChjb3JlKTtcbn07XG5cblxuZnVuY3Rpb24gY29yZShlbnRpdHkpIHtcbiAgICBjb3JlVXBkYXRlQW5kRmVlZChlbnRpdHkpO1xufVxuXG4vKipcbiAqIGNvcmVVcGRhdGVBbmRGZWVkIGZlZWRzIHBhcmVudCBpbmZvcm1hdGlvbiB0byBhbiBlbnRpdHkgYW5kIHNvIHRoYXRcbiAqICAgZWFjaCBlbnRpdHkgY2FuIHVwZGF0ZSB0aGVpciB0cmFuc2Zvcm0sIHNpemUsIGFuZCBvcGFjaXR5LiAgSXQgXG4gKiAgIHdpbGwgdGhlbiBwYXNzIGRvd24gaW52YWxpZGF0aW9uIHN0YXRlcyBhbmQgdmFsdWVzIHRvIGFueSBjaGlsZHJlbi5cbiAqXG4gKiBAbWV0aG9kIGNvcmVVcGRhdGVBbmRGZWVkXG4gKiBAcHJpdmF0ZVxuICogICBcbiAqIEBwYXJhbSAge0VudGl0eX0gIGVudGl0eSAgICAgICAgICAgRW50aXR5IGluIHRoZSBzY2VuZSBncmFwaFxuICogQHBhcmFtICB7TnVtYmVyfSAgdHJhbnNmb3JtUmVwb3J0ICBiaXRTY2hlbWUgcmVwb3J0IG9mIHRyYW5zZm9ybSBpbnZhbGlkYXRpb25zXG4gKiBAcGFyYW0gIHtBcnJheX0gICBpbmNvbWluZ01hdHJpeCAgIHBhcmVudCB0cmFuc2Zvcm0gYXMgYSBGbG9hdDMyIEFycmF5XG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICBzaXplUmVwb3J0ICAgICAgIGJpdFNjaGVtZSByZXBvcnQgb2Ygc2l6ZSBpbnZhbGlkYXRpb25zXG4gKiBAcGFyYW0gIHtBcnJheX0gICBpbmNvbWluZ1NpemUgICAgIHBhcmVudCBzaXplIGluIHBpeGVsc1xuICogQHBhcmFtICB7Qm9vbGVhbn0gb3BhY2l0eVJlcG9ydCAgICBib29sZWFuIHJlcG9ydCBvZiBvcGFjaXR5IGludmFsaWRhdGlvblxuICogQHBhcmFtICB7TnVtYmVyfSAgaW5jb21pbmdPcGFjaXR5ICBwYXJlbnQgb3BhY2l0eVxuICovXG5mdW5jdGlvbiBjb3JlVXBkYXRlQW5kRmVlZChlbnRpdHksIHRyYW5zZm9ybVJlcG9ydCwgaW5jb21pbmdNYXRyaXgsIHNpemVSZXBvcnQsIGluY29taW5nU2l6ZSwgb3BhY2l0eVJlcG9ydCwgaW5jb21pbmdPcGFjaXR5KSB7XG4gICAgdmFyIHRyYW5zZm9ybSA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3RyYW5zZm9ybScpO1xuICAgIHZhciBzaXplICAgICAgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdzaXplJyk7XG4gICAgdmFyIG9wYWNpdHkgICA9IGVudGl0eS5nZXRDb21wb25lbnQoJ29wYWNpdHknKTtcbiAgICB2YXIgY2hpbGRyZW4gID0gZW50aXR5LmdldENoaWxkcmVuKCk7XG4gICAgdmFyIGkgICAgICAgICA9IGNoaWxkcmVuLmxlbmd0aDtcblxuXG4gICAgdHJhbnNmb3JtUmVwb3J0ID0gdHJhbnNmb3JtLl91cGRhdGUodHJhbnNmb3JtUmVwb3J0LCBpbmNvbWluZ01hdHJpeCk7XG4gICAgc2l6ZVJlcG9ydCAgICAgID0gc2l6ZS5fdXBkYXRlKHNpemVSZXBvcnQsIGluY29taW5nU2l6ZSk7XG4gICAgb3BhY2l0eVJlcG9ydCAgID0gb3BhY2l0eS5fdXBkYXRlKG9wYWNpdHlSZXBvcnQsIGluY29taW5nT3BhY2l0eSk7XG5cbiAgICB3aGlsZSAoaS0tKSBcbiAgICAgICAgY29yZVVwZGF0ZUFuZEZlZWQoXG4gICAgICAgICAgICBjaGlsZHJlbltpXSxcbiAgICAgICAgICAgIHRyYW5zZm9ybVJlcG9ydCxcbiAgICAgICAgICAgIHRyYW5zZm9ybS5fbWF0cml4LFxuICAgICAgICAgICAgc2l6ZVJlcG9ydCxcbiAgICAgICAgICAgIHNpemUuX2dsb2JhbFNpemUsXG4gICAgICAgICAgICBvcGFjaXR5UmVwb3J0LFxuICAgICAgICAgICAgb3BhY2l0eS5fZ2xvYmFsT3BhY2l0eSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29yZVN5c3RlbTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vRW50aXR5UmVnaXN0cnknKSxcbiAgICBNYXRyaXhNYXRoICAgICA9IHJlcXVpcmUoJy4uLy4uL21hdGgvNHg0bWF0cml4JyksXG4gICAgT3B0aW9uc01hbmFnZXIgPSByZXF1aXJlKCcuLi9PcHRpb25zTWFuYWdlcicpO1xuXG52YXIgcmVuZGVyZXJzICAgICAgICAgID0ge30sXG4gICAgdGFyZ2V0c1RvUmVuZGVyZXJzID0ge307XG5cbnZhciBjb250YWluZXJzICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0hhc0NvbnRhaW5lcicpLFxuICAgIHJlbmRlcmFibGVzID0gRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignUmVuZGVyYWJsZXMnKTtcblxudmFyIHRvRGVwbG95ID0gW107XG5cbmNvbnRhaW5lcnMub24oJ2VudGl0eUFkZGVkJywgZGVwbG95Q29udGFpbmVyKTtcbmNvbnRhaW5lcnMub24oJ2VudGl0eVJlbW92ZWQnLCByZWNhbGxDb250YWluZXIpO1xuXG52YXIgY29udGFpbmVyVG9UYXJnZXRzID0ge307XG5cbmZ1bmN0aW9uIGRlcGxveUNvbnRhaW5lcihlbnRpdHkpIHtcbiAgICBpZiAoZW50aXR5LmdldENvbnRleHQoKSkgcmVuZGVyZXJzLkRPTS5kZXBsb3lDb250YWluZXIoZW50aXR5KTtcbiAgICBlbHNlICAgICAgICAgICAgICAgICAgICAgdG9EZXBsb3kucHVzaChlbnRpdHkpOyAvLyBUT0RPIFRoaXMgaXMgdGVtcG9yYXJ5IGFuZCBpdCBzdWNrc1xufVxuXG5mdW5jdGlvbiByZWNhbGxDb250YWluZXIoZW50aXR5KSB7XG4gICAgcmVuZGVyZXJzLkRPTS5yZWNhbGxDb250YWluZXIoZW50aXR5KTtcbn1cblxuZnVuY3Rpb24gX3JlbGV2ZW50VG9SZW5kZXJlcihyZW5kZXJlciwgZW50aXR5KSB7XG4gICAgdmFyIHRhcmdldHMgPSByZW5kZXJlci5nZXRUYXJnZXRzKCk7XG4gICAgdmFyIGogICAgICAgPSB0YXJnZXRzLmxlbmd0aDtcbiAgICB3aGlsZSAoai0tKSBpZiAoZW50aXR5Lmhhc0NvbXBvbmVudCh0YXJnZXRzW2pdKSkgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfcmVsZXZlbnRUb0FueVJlbmRlcmVyKGVudGl0eSkge1xuICAgIHZhciByZW5kZXJlck5hbWVzID0gT2JqZWN0LmtleXMocmVuZGVyZXJzKSxcbiAgICAgICAgaSAgICAgICAgICAgICA9IHJlbmRlcmVyTmFtZXMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkgaWYgKF9yZWxldmVudFRvUmVuZGVyZXIocmVuZGVyZXJzW3JlbmRlcmVyTmFtZXNbaV1dLCBlbnRpdHkpKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogUmVuZGVyU3lzdGVtIGlzIHJlc3BvbnNpYmxlIGZvciBrZWVwaW5nIHRyYWNrIG9mIHRoZSB2YXJpb3VzIHJlbmRlcmVyc1xuICogIGFuZCBmZWVkaW5nIHRoZW0gXG4gKlxuICpcbiAqIEBjbGFzcyBSZW5kZXJTeXN0ZW1cbiAqIEBzeXN0ZW1cbiAqL1xudmFyIFJlbmRlclN5c3RlbSA9IHt9O1xuXG5SZW5kZXJTeXN0ZW0udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIHZhciB0YXJnZXRzICAgICAgICAgICAgID0gT2JqZWN0LmtleXModGFyZ2V0c1RvUmVuZGVyZXJzKSxcbiAgICAgICAgcmVuZGVyZXJOYW1lcyAgICAgICA9IE9iamVjdC5rZXlzKHJlbmRlcmVycyksXG4gICAgICAgIHRhcmdldCAgICAgICAgICAgICAgPSBudWxsLFxuICAgICAgICBlbnRpdHkgICAgICAgICAgICAgID0gbnVsbCxcbiAgICAgICAgY29udGFpbmVyICAgICAgICAgICA9IG51bGwsXG4gICAgICAgIHRhcmdldE5hbWUgICAgICAgICAgPSB2b2lkIDAsXG4gICAgICAgIGNvbnRhaW5lckVudHMgICAgICAgPSBjb250YWluZXJzLmVudGl0aWVzLFxuICAgICAgICBlbnRpdGllcyAgICAgICAgICAgID0gcmVuZGVyYWJsZXMuZW50aXRpZXMsXG4gICAgICAgIGkgICAgICAgICAgICAgICAgICAgPSBlbnRpdGllcy5sZW5ndGgsXG4gICAgICAgIHRhcmdldHNMZW5ndGggICAgICAgPSB0YXJnZXRzLmxlbmd0aCxcbiAgICAgICAgY29udGFpbmVyRW50TGVuZ3RocyA9IGNvbnRhaW5lckVudHMubGVuZ3RoLFxuICAgICAgICByZW5kZXJlcnNMZW5ndGggICAgID0gMCxcbiAgICAgICAgaiAgICAgICAgICAgICAgICAgICA9IHRvRGVwbG95Lmxlbmd0aCxcbiAgICAgICAgayAgICAgICAgICAgICAgICAgICA9IDAsXG4gICAgICAgIGwgICAgICAgICAgICAgICAgICAgPSAwO1xuXG5cblxuICAgIC8vIFVwZGF0ZSB0aGUgQ29udGFpbmVyIGlmIGl0cyB0cmFuc2Zvcm0gb3Igc2l6ZSBhcmUgZGlydHkuXG4gICAgY29udGFpbmVycy5mb3JFYWNoKGZ1bmN0aW9uKGVudGl0eSkge1xuICAgICAgICBjb250YWluZXIgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdjb250YWluZXInKTtcbiAgICAgICAgaWYgKGVudGl0eS5nZXRDb250ZXh0KCkgJiYgKGNvbnRhaW5lci5fdHJhbnNmb3JtRGlydHkgfHwgY29udGFpbmVyLl9zaXplRGlydHkpKSByZW5kZXJlcnMuRE9NLnVwZGF0ZUNvbnRhaW5lcihlbnRpdHkpO1xuICAgIH0pO1xuXG4gICAgd2hpbGUgKGotLSkgZGVwbG95Q29udGFpbmVyKHRvRGVwbG95LnBvcCgpKTtcblxuICAgIC8vIEZvciBhbGwgb2YgdGhlIHJlbmRlcmFibGVzXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBqICAgICAgPSB0YXJnZXRzTGVuZ3RoO1xuICAgICAgICBlbnRpdHkgPSBlbnRpdGllc1tpXTtcblxuICAgICAgICAvLyBGb3IgZWFjaCByZW5kZXJlclxuICAgICAgICB3aGlsZSAoai0tKSB7XG4gICAgICAgICAgICB0YXJnZXQgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KHRhcmdldHNbal0pO1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIGNvbnRpbnVlOyAvLyBza2lwIGlmIHRoaXMgUmVuZGVyYWJsZSBkb2VzIG5vdCBjb250YWluZXIgdGhlIHByb3BlciB0YXJnZXQgY29tcG9uZW50IGZvciB0aGlzIHJlbmRlcmVyXG5cbiAgICAgICAgICAgIGsgPSBjb250YWluZXJFbnRMZW5ndGhzO1xuXG4gICAgICAgICAgICBpZiAoaykge1xuICAgICAgICAgICAgICAgIHRhcmdldE5hbWUgICAgICA9IHRhcmdldC5jb25zdHJ1Y3Rvci50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHJlbmRlcmVyc0xlbmd0aCA9IHRhcmdldHNUb1JlbmRlcmVyc1t0YXJnZXROYW1lXS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAvLyBGb3IgZWFjaCBjb250YWluZXJcbiAgICAgICAgICAgICAgICB3aGlsZSAoay0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGwgICAgICAgICAgPSByZW5kZXJlcnNMZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lciAgPSBjb250YWluZXJFbnRzW2tdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVudGl0eS5fcm9vdElEKVxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgdGFyZ2V0IGhhcyBhIGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0eS5nZXRDb250ZXh0KCkpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRGVjaWRlIGlmIHRvIGRlcGxveSAgYW5kIHVwZGF0ZSBvciBqdXN0IHVwZGF0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldC5faXNXaXRoaW4oY29udGFpbmVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChsLS0pIHRhcmdldHNUb1JlbmRlcmVyc1t0YXJnZXROYW1lXVtsXS51cGRhdGUoZW50aXR5LCBjb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAobC0tKSB0YXJnZXRzVG9SZW5kZXJlcnNbdGFyZ2V0TmFtZV1bbF0uZGVwbG95KGVudGl0eSwgY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuX2FkZFRvQ29udGFpbmVyKGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0Ll9pc1dpdGhpbihjb250YWluZXIpKSB7IC8vIElmIHRoZSB0YXJnZXQgaXMgcmVtb3ZlZCBmcm9tIHJlbmRlciB0cmVlIHJlY2FsbCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGwtLSkgdGFyZ2V0c1RvUmVuZGVyZXJzW3RhcmdldE5hbWVdW2xdLnJlY2FsbChlbnRpdHksIGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuX3JlbW92ZUZyb21Db250YWluZXIoY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVzZXQgdGhlIGludmFsaWRhdGlvbnMgYWZ0ZXIgYWxsIG9mIHRoZSBsb2dpYyBmb3IgXG4gICAgICAgICAgICAvLyBhIHBhcnRpY3VsYXIgdGFyZ2V0IFxuICAgICAgICAgICAgLy8gaWYgKHRhcmdldC5yZXNldEludmFsaWRhdGlvbnMpIHRhcmdldC5yZXNldEludmFsaWRhdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhdmUgZWFjaCByZW5kZXJlciBydW5cbiAgICBpID0gcmVuZGVyZXJOYW1lcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgcmVuZGVyZXJzW3JlbmRlcmVyTmFtZXNbaV1dLnJlbmRlcigpO1xufTtcblxuLyoqXG4gKiBBZGQgYSBuZXcgcmVuZGVyZXIgd2hpY2ggd2lsbCBiZSBjYWxsZWQgZXZlcnkgZnJhbWUuXG4gKlxuICogQG1ldGhvZCByZWdpc3RlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIHJlbmRlcmVyXG4gKiBAcGFyYW0ge09iamVjdH0gcmVuZGVyZXIgc2luZ2xldG9uIHJlbmRlcmVyIG9iamVjdFxuICovXG5SZW5kZXJTeXN0ZW0ucmVnaXN0ZXIgPSBmdW5jdGlvbiByZWdpc3RlcihuYW1lLCByZW5kZXJlcikge1xuICAgIGlmIChyZW5kZXJlcnNbbmFtZV0gIT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmVuZGVyZXJzW25hbWVdID0gcmVuZGVyZXI7XG5cbiAgICB2YXIgdGFyZ2V0cyA9IHJlbmRlcmVyLmdldFRhcmdldHMoKSxcbiAgICAgICAgaSAgICAgICA9IHRhcmdldHMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBpZiAodGFyZ2V0c1RvUmVuZGVyZXJzW3RhcmdldHNbaV1dID09IG51bGwpIHRhcmdldHNUb1JlbmRlcmVyc1t0YXJnZXRzW2ldXSA9IFtdO1xuICAgICAgICB0YXJnZXRzVG9SZW5kZXJlcnNbdGFyZ2V0c1tpXV0ucHVzaChyZW5kZXJlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlbmRlclN5c3RlbTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbiAndXNlIHN0cmljdCc7XG5cbnZhciBwcmV2aW91c1RpbWUgICAgICAgPSAwLCBcbiAgICBkZWx0YSAgICAgICAgICAgICAgPSAwLFxuICAgIGluaXRpYWxpemF0aW9uVGltZSA9IDAsXG4gICAgY3VycmVudFRpbWUgICAgICAgID0gaW5pdGlhbGl6YXRpb25UaW1lLFxuICAgIHJlbGF0aXZlVGltZSAgICAgICA9IGluaXRpYWxpemF0aW9uVGltZSxcbiAgICBhYnNvbHV0ZVRpbWUgICAgICAgPSBpbml0aWFsaXphdGlvblRpbWUsXG4gICAgcHJldmlvdXNSZWxGcmFtZSAgID0gMDtcblxuLyoqXG4gKiBUaW1lU3lzdGVtIGlzIHJlc3BvbnNpYmxlIGZvciBkZXRlcm1pbmluZyB0aGUgY3VycmVudCBtb21lbnQuXG4gKlxuICogQGNsYXNzIFRpbWVTeXN0ZW1cbiAqIEBzeXN0ZW1cbiAqL1xudmFyIFRpbWVTeXN0ZW0gPSB7fTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIHRpbWUgYmFzZWQgb24gdGhlIGZyYW1lIGRhdGEgZnJvbSB0aGUgRW5naW5lLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHJlbEZyYW1lIFxuICovXG5UaW1lU3lzdGVtLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSh0aW1lc3RhbXAsIHJlbEZyYW1lKSB7XG4gICAgcHJldmlvdXNUaW1lICAgICA9IGN1cnJlbnRUaW1lO1xuICAgIGN1cnJlbnRUaW1lICAgICAgPSB0aW1lc3RhbXA7XG4gICAgZGVsdGEgICAgICAgICAgICA9IGN1cnJlbnRUaW1lIC0gcHJldmlvdXNUaW1lO1xuICAgIHJlbGF0aXZlVGltZSAgICArPSBkZWx0YSAqIChyZWxGcmFtZSAtIHByZXZpb3VzUmVsRnJhbWUpO1xuICAgIGFic29sdXRlVGltZSAgICArPSBkZWx0YTtcbiAgICBwcmV2aW91c1JlbEZyYW1lID0gcmVsRnJhbWU7XG59O1xuXG4vKipcbiAqIEdldCByZWxhdGl2ZSB0aW1lIGluIG1zIG9mZmZzZXQgYnkgdGhlIHNwZWVkIGF0IHdoaWNoIHRoZSBFbmdpbmUgaXMgcnVubmluZy5cbiAqXG4gKiBAbWV0aG9kIGdldFJlbGF0aXZlVGltZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIHRpbWUgYWNjb3VudGluZyBmb3IgRW5naW5lJ3MgcnVuIHNwZWVkXG4gKi9cblRpbWVTeXN0ZW0uZ2V0UmVsYXRpdmVUaW1lID0gZnVuY3Rpb24gZ2V0UmVsYXRpdmVUaW1lKCkge1xuICAgIHJldHVybiByZWxhdGl2ZVRpbWU7XG59O1xuXG4vKipcbiAqIEdldCBhYnNvbHV0ZSB0aW1lLlxuICpcbiAqIEBtZXRob2QgZ2V0QWJzb2x1dGVUaW1lXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgdGltZSBpbiBtc1xuICovXG5UaW1lU3lzdGVtLmdldEFic29sdXRlVGltZSA9IGZ1bmN0aW9uIGdldEFic29sdXRlVGltZSgpIHtcbiAgICByZXR1cm4gYWJzb2x1dGVUaW1lO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRpbWUgaW4gd2hpY2ggdGhlIEVuZ2luZSB3YXMgaW5zdGFudGlhdGVkLlxuICpcbiAqIEBtZXRob2QgZ2V0SW5pdGlhbFRpbWVcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSB0aW1lIGluIG1zXG4gKi9cblRpbWVTeXN0ZW0uZ2V0SW5pdGlhbFRpbWUgPSBmdW5jdGlvbiBnZXRJbml0aWFsVGltZSgpIHtcbiAgICByZXR1cm4gaW5pdGlhbGl6YXRpb25UaW1lO1xufTtcblxuLyoqXG4gKiBHZXQgZWxhcHNlZCB0aW1lIHNpbmNlIGluc3RhbnRpYXRpb24gYWNjb3VudGluZyBmb3IgRW5naW5lIHNwZWVkXG4gKlxuICogQG1ldGhvZCBnZXRFbGFwc2VkUmVsYXRpdmVUaW1lXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgdGltZSBpbiBtc1xuICovXG5UaW1lU3lzdGVtLmdldEVsYXBzZWRSZWxhdGl2ZVRpbWUgPSBmdW5jdGlvbiBnZXRFbGFwc2VkUmVsYXRpdmVUaW1lKCkge1xuICAgIHJldHVybiByZWxhdGl2ZVRpbWUgLSBpbml0aWFsaXphdGlvblRpbWU7XG59O1xuXG4vKipcbiAqIEdldCBhYnNvbHV0ZSBlbGFwc2VkIHRpbWUgc2luY2UgaW5zdGFudGlhdGlvblxuICpcbiAqIEBtZXRob2QgZ2V0RWxhcHNlZEFic29sdXRlVGltZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIHRpbWUgaW4gbXNcbiAqL1xuVGltZVN5c3RlbS5nZXRFbGFwc2VkQWJzb2x1dGVUaW1lID0gZnVuY3Rpb24gZ2V0RWxhcHNlZEFic29sdXRlVGltZSgpIHtcbiAgICByZXR1cm4gYWJzb2x1dGVUaW1lIC0gaW5pdGlhbGl6YXRpb25UaW1lO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRpbWUgYmV0d2VlbiB0aGlzIGZyYW1lIGFuZCBsYXN0LlxuICpcbiAqIEBtZXRob2QgZ2V0RGVsdGFcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSB0aW1lIGluIG1zXG4gKi9cblRpbWVTeXN0ZW0uZ2V0RGVsdGEgPSBmdW5jdGlvbiBnZXREZWx0YSgpIHtcbiAgICByZXR1cm4gZGVsdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVTeXN0ZW07XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4qIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbipcbiogT3duZXI6IG1hcmtAZmFtby51c1xuKiBAbGljZW5zZSBNUEwgMi4wXG4qIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEV2ZW50RW1pdHRlciByZXByZXNlbnRzIGEgY2hhbm5lbCBmb3IgZXZlbnRzLlxuICpcbiAqIEBjbGFzcyBFdmVudEVtaXR0ZXJcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMgPSB7fTtcbiAgICB0aGlzLl9vd25lciA9IHRoaXM7XG59XG5cbi8qKlxuICogVHJpZ2dlciBhbiBldmVudCwgc2VuZGluZyB0byBhbGwgZG93bnN0cmVhbSBoYW5kbGVyc1xuICogICBsaXN0ZW5pbmcgZm9yIHByb3ZpZGVkICd0eXBlJyBrZXkuXG4gKlxuICogQG1ldGhvZCBlbWl0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IGV2ZW50IGRhdGFcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUsIGV2ZW50KSB7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5saXN0ZW5lcnNbdHlwZV07XG4gICAgaWYgKGhhbmRsZXJzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGhhbmRsZXJzW2ldLmNhbGwodGhpcy5fb3duZXIsIGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQmluZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGFuIGV2ZW50IHR5cGUgaGFuZGxlZCBieSB0aGlzIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kIFwib25cIlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBPYmplY3QpfSBoYW5kbGVyIGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKHR5cGUsIGhhbmRsZXIpIHtcbiAgICBpZiAoISh0eXBlIGluIHRoaXMubGlzdGVuZXJzKSkgdGhpcy5saXN0ZW5lcnNbdHlwZV0gPSBbXTtcbiAgICB2YXIgaW5kZXggPSB0aGlzLmxpc3RlbmVyc1t0eXBlXS5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCA8IDApIHRoaXMubGlzdGVuZXJzW3R5cGVdLnB1c2goaGFuZGxlcik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBcIm9uXCIuXG4gKiBAbWV0aG9kIGFkZExpc3RlbmVyXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4vKipcbiAqIFVuYmluZCBhbiBldmVudCBieSB0eXBlIGFuZCBoYW5kbGVyLlxuICogICBUaGlzIHVuZG9lcyB0aGUgd29yayBvZiBcIm9uXCIuXG4gKlxuICogQG1ldGhvZCByZW1vdmVMaXN0ZW5lclxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgZnVuY3Rpb24gb2JqZWN0IHRvIHJlbW92ZVxuICogQHJldHVybiB7RXZlbnRFbWl0dGVyfSB0aGlzXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcih0eXBlLCBoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5saXN0ZW5lcnNbdHlwZV0uaW5kZXhPZihoYW5kbGVyKTtcbiAgICBpZiAoaW5kZXggPj0gMCkgdGhpcy5saXN0ZW5lcnNbdHlwZV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2FsbCBldmVudCBoYW5kbGVycyB3aXRoIHRoaXMgc2V0IHRvIG93bmVyLlxuICpcbiAqIEBtZXRob2QgYmluZFRoaXNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3duZXIgb2JqZWN0IHRoaXMgRXZlbnRFbWl0dGVyIGJlbG9uZ3MgdG9cbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5iaW5kVGhpcyA9IGZ1bmN0aW9uIGJpbmRUaGlzKG93bmVyKSB7XG4gICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4qIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4qXG4qIE93bmVyOiBtYXJrQGZhbW8udXNcbiogQGxpY2Vuc2UgTVBMIDIuMFxuKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4vRXZlbnRFbWl0dGVyJyk7XG5cbi8qKlxuICogRXZlbnRIYW5kbGVyIGZvcndhcmRzIHJlY2VpdmVkIGV2ZW50cyB0byBhIHNldCBvZiBwcm92aWRlZCBjYWxsYmFjayBmdW5jdGlvbnMuXG4gKiBJdCBhbGxvd3MgZXZlbnRzIHRvIGJlIGNhcHR1cmVkLCBwcm9jZXNzZWQsIGFuZCBvcHRpb25hbGx5IHBpcGVkIHRocm91Z2ggdG8gb3RoZXIgZXZlbnQgaGFuZGxlcnMuXG4gKlxuICogQGNsYXNzIEV2ZW50SGFuZGxlclxuICogQGV4dGVuZHMgRXZlbnRFbWl0dGVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRXZlbnRIYW5kbGVyKCkge1xuICAgIEV2ZW50RW1pdHRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5kb3duc3RyZWFtID0gW107IC8vIGRvd25zdHJlYW0gZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLmRvd25zdHJlYW1GbiA9IFtdOyAvLyBkb3duc3RyZWFtIGZ1bmN0aW9uc1xuXG4gICAgdGhpcy51cHN0cmVhbSA9IFtdOyAvLyB1cHN0cmVhbSBldmVudCBoYW5kbGVyc1xuICAgIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMgPSB7fTsgLy8gdXBzdHJlYW0gbGlzdGVuZXJzXG59XG5FdmVudEhhbmRsZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcbkV2ZW50SGFuZGxlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFdmVudEhhbmRsZXI7XG5cbi8qKlxuICogQXNzaWduIGFuIGV2ZW50IGhhbmRsZXIgdG8gcmVjZWl2ZSBhbiBvYmplY3QncyBpbnB1dCBldmVudHMuXG4gKlxuICogQG1ldGhvZCBzZXRJbnB1dEhhbmRsZXJcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IG9iamVjdCB0byBtaXggdHJpZ2dlciwgc3Vic2NyaWJlLCBhbmQgdW5zdWJzY3JpYmUgZnVuY3Rpb25zIGludG9cbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSBoYW5kbGVyIGFzc2lnbmVkIGV2ZW50IGhhbmRsZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnNldElucHV0SGFuZGxlciA9IGZ1bmN0aW9uIHNldElucHV0SGFuZGxlcihvYmplY3QsIGhhbmRsZXIpIHtcbiAgICBvYmplY3QudHJpZ2dlciA9IGhhbmRsZXIudHJpZ2dlci5iaW5kKGhhbmRsZXIpO1xuICAgIGlmIChoYW5kbGVyLnN1YnNjcmliZSAmJiBoYW5kbGVyLnVuc3Vic2NyaWJlKSB7XG4gICAgICAgIG9iamVjdC5zdWJzY3JpYmUgPSBoYW5kbGVyLnN1YnNjcmliZS5iaW5kKGhhbmRsZXIpO1xuICAgICAgICBvYmplY3QudW5zdWJzY3JpYmUgPSBoYW5kbGVyLnVuc3Vic2NyaWJlLmJpbmQoaGFuZGxlcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBc3NpZ24gYW4gZXZlbnQgaGFuZGxlciB0byByZWNlaXZlIGFuIG9iamVjdCdzIG91dHB1dCBldmVudHMuXG4gKlxuICogQG1ldGhvZCBzZXRPdXRwdXRIYW5kbGVyXG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBvYmplY3QgdG8gbWl4IHBpcGUsIHVucGlwZSwgb24sIGFkZExpc3RlbmVyLCBhbmQgcmVtb3ZlTGlzdGVuZXIgZnVuY3Rpb25zIGludG9cbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSBoYW5kbGVyIGFzc2lnbmVkIGV2ZW50IGhhbmRsZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnNldE91dHB1dEhhbmRsZXIgPSBmdW5jdGlvbiBzZXRPdXRwdXRIYW5kbGVyKG9iamVjdCwgaGFuZGxlcikge1xuICAgIGlmIChoYW5kbGVyIGluc3RhbmNlb2YgRXZlbnRIYW5kbGVyKSBoYW5kbGVyLmJpbmRUaGlzKG9iamVjdCk7XG4gICAgb2JqZWN0LnBpcGUgPSBoYW5kbGVyLnBpcGUuYmluZChoYW5kbGVyKTtcbiAgICBvYmplY3QudW5waXBlID0gaGFuZGxlci51bnBpcGUuYmluZChoYW5kbGVyKTtcbiAgICBvYmplY3Qub24gPSBoYW5kbGVyLm9uLmJpbmQoaGFuZGxlcik7XG4gICAgb2JqZWN0LmFkZExpc3RlbmVyID0gb2JqZWN0Lm9uO1xuICAgIG9iamVjdC5yZW1vdmVMaXN0ZW5lciA9IGhhbmRsZXIucmVtb3ZlTGlzdGVuZXIuYmluZChoYW5kbGVyKTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciBhbiBldmVudCwgc2VuZGluZyB0byBhbGwgZG93bnN0cmVhbSBoYW5kbGVyc1xuICogICBsaXN0ZW5pbmcgZm9yIHByb3ZpZGVkICd0eXBlJyBrZXkuXG4gKlxuICogQG1ldGhvZCBlbWl0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IGV2ZW50IGRhdGFcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUsIGV2ZW50KSB7XG4gICAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmRvd25zdHJlYW0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMuZG93bnN0cmVhbVtpXS50cmlnZ2VyKSB0aGlzLmRvd25zdHJlYW1baV0udHJpZ2dlcih0eXBlLCBldmVudCk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmRvd25zdHJlYW1Gbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmRvd25zdHJlYW1GbltpXSh0eXBlLCBldmVudCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgZW1pdFxuICogQG1ldGhvZCBhZGRMaXN0ZW5lclxuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnRyaWdnZXIgPSBFdmVudEhhbmRsZXIucHJvdG90eXBlLmVtaXQ7XG5cbi8qKlxuICogQWRkIGV2ZW50IGhhbmRsZXIgb2JqZWN0IHRvIHNldCBvZiBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICpcbiAqIEBtZXRob2QgcGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgZXZlbnQgaGFuZGxlciB0YXJnZXQgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHBhc3NlZCBldmVudCBoYW5kbGVyXG4gKi9cbkV2ZW50SGFuZGxlci5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIHBpcGUodGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC5zdWJzY3JpYmUgaW5zdGFuY2VvZiBGdW5jdGlvbikgcmV0dXJuIHRhcmdldC5zdWJzY3JpYmUodGhpcyk7XG5cbiAgICB2YXIgZG93bnN0cmVhbUN0eCA9ICh0YXJnZXQgaW5zdGFuY2VvZiBGdW5jdGlvbikgPyB0aGlzLmRvd25zdHJlYW1GbiA6IHRoaXMuZG93bnN0cmVhbTtcbiAgICB2YXIgaW5kZXggPSBkb3duc3RyZWFtQ3R4LmluZGV4T2YodGFyZ2V0KTtcbiAgICBpZiAoaW5kZXggPCAwKSBkb3duc3RyZWFtQ3R4LnB1c2godGFyZ2V0KTtcblxuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBGdW5jdGlvbikgdGFyZ2V0KCdwaXBlJywgbnVsbCk7XG4gICAgZWxzZSBpZiAodGFyZ2V0LnRyaWdnZXIpIHRhcmdldC50cmlnZ2VyKCdwaXBlJywgbnVsbCk7XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuLyoqXG4gKiBSZW1vdmUgaGFuZGxlciBvYmplY3QgZnJvbSBzZXQgb2YgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqICAgVW5kb2VzIHdvcmsgb2YgXCJwaXBlXCIuXG4gKlxuICogQG1ldGhvZCB1bnBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IHRhcmdldCBoYW5kbGVyIG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwcm92aWRlZCB0YXJnZXRcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbiB1bnBpcGUodGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC51bnN1YnNjcmliZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSByZXR1cm4gdGFyZ2V0LnVuc3Vic2NyaWJlKHRoaXMpO1xuXG4gICAgdmFyIGRvd25zdHJlYW1DdHggPSAodGFyZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pID8gdGhpcy5kb3duc3RyZWFtRm4gOiB0aGlzLmRvd25zdHJlYW07XG4gICAgdmFyIGluZGV4ID0gZG93bnN0cmVhbUN0eC5pbmRleE9mKHRhcmdldCk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgZG93bnN0cmVhbUN0eC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHRhcmdldCgndW5waXBlJywgbnVsbCk7XG4gICAgICAgIGVsc2UgaWYgKHRhcmdldC50cmlnZ2VyKSB0YXJnZXQudHJpZ2dlcigndW5waXBlJywgbnVsbCk7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBCaW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYW4gZXZlbnQgdHlwZSBoYW5kbGVkIGJ5IHRoaXMgb2JqZWN0LlxuICpcbiAqIEBtZXRob2QgXCJvblwiXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGhhbmRsZXIgY2FsbGJhY2tcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24odHlwZSwgaGFuZGxlcikge1xuICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoISh0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpKSB7XG4gICAgICAgIHZhciB1cHN0cmVhbUxpc3RlbmVyID0gdGhpcy50cmlnZ2VyLmJpbmQodGhpcywgdHlwZSk7XG4gICAgICAgIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnNbdHlwZV0gPSB1cHN0cmVhbUxpc3RlbmVyO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudXBzdHJlYW0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMudXBzdHJlYW1baV0ub24odHlwZSwgdXBzdHJlYW1MaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBcIm9uXCJcbiAqIEBtZXRob2QgYWRkTGlzdGVuZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50SGFuZGxlci5wcm90b3R5cGUub247XG5cbi8qKlxuICogTGlzdGVuIGZvciBldmVudHMgZnJvbSBhbiB1cHN0cmVhbSBldmVudCBoYW5kbGVyLlxuICpcbiAqIEBtZXRob2Qgc3Vic2NyaWJlXG4gKlxuICogQHBhcmFtIHtFdmVudEVtaXR0ZXJ9IHNvdXJjZSBzb3VyY2UgZW1pdHRlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIHN1YnNjcmliZShzb3VyY2UpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnVwc3RyZWFtLmluZGV4T2Yoc291cmNlKTtcbiAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgIHRoaXMudXBzdHJlYW0ucHVzaChzb3VyY2UpO1xuICAgICAgICBmb3IgKHZhciB0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHNvdXJjZS5vbih0eXBlLCB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzW3R5cGVdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3RvcCBsaXN0ZW5pbmcgdG8gZXZlbnRzIGZyb20gYW4gdXBzdHJlYW0gZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAbWV0aG9kIHVuc3Vic2NyaWJlXG4gKlxuICogQHBhcmFtIHtFdmVudEVtaXR0ZXJ9IHNvdXJjZSBzb3VyY2UgZW1pdHRlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gdW5zdWJzY3JpYmUoc291cmNlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy51cHN0cmVhbS5pbmRleE9mKHNvdXJjZSk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgdGhpcy51cHN0cmVhbS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBmb3IgKHZhciB0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcih0eXBlLCB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzW3R5cGVdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRIYW5kbGVyO1xuIiwiZnVuY3Rpb24gQnVmZmVyKHRhcmdldCwgdHlwZSwgZ2wsIHNwYWNpbmcpIHtcbiAgICB0aGlzLmJ1ZmZlciA9IG51bGw7XG4gICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICB0aGlzLmdsID0gZ2w7XG4gICAgdGhpcy5zcGFjaW5nID0gc3BhY2luZyB8fCAwO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN1YkRhdGEgPSBmdW5jdGlvbiBzdWJEYXRhKHR5cGUpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBkYXRhID0gW107XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDAsIGNodW5rID0gMTAwMDA7IGkgPCB0aGlzLmRhdGEubGVuZ3RoOyBpICs9IGNodW5rKVxuICAgICAgICBkYXRhID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShkYXRhLCB0aGlzLmRhdGEuc2xpY2UoaSwgaSArIGNodW5rKSk7XG5cbiAgICB0aGlzLmJ1ZmZlciA9IHRoaXMuYnVmZmVyIHx8IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuICAgIHRoaXMuYnVmZmVyLmxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuICAgIHRoaXMuYnVmZmVyLnNwYWNpbmcgPSB0aGlzLnNwYWNpbmcgfHwgKHRoaXMuZGF0YS5sZW5ndGggPyBkYXRhLmxlbmd0aCAvIHRoaXMuZGF0YS5sZW5ndGggOiAwKTtcbiAgICBnbC5iaW5kQnVmZmVyKHRoaXMudGFyZ2V0LCB0aGlzLmJ1ZmZlcik7XG4gICAgZ2wuYnVmZmVyRGF0YSh0aGlzLnRhcmdldCwgbmV3IHRoaXMudHlwZShkYXRhKSwgdHlwZSB8fCBnbC5TVEFUSUNfRFJBVyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlcjtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBhZG5hbkBmYW1vLnVzLCBqb3NlcGhAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFRSQU5TRk9STSA9ICd0cmFuc2Zvcm0nO1xudmFyIE9QQUNJVFkgPSAnb3BhY2l0eSc7XG52YXIgU0laRSA9ICdzaXplJztcbnZhciBNQVRFUklBTFMgPSAnbWF0ZXJpYWwnO1xudmFyIEdFT01FVFJZID0gJ2dlb21ldHJ5JztcblxudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY29yZS9FbnRpdHlSZWdpc3RyeScpO1xudmFyIFRhcmdldCA9IHJlcXVpcmUoJy4uL2NvcmUvY29tcG9uZW50cy9UYXJnZXQnKTtcblxuLyoqXG4gKiBHZW9tZXRyeSBpcyBhIGNvbXBvbmVudCB0aGF0IGRlZmluZXMgdGhlIGRhdGEgdGhhdCBzaG91bGRcbiAqICAgYmUgZHJhd24gdG8gdGhlIHdlYkdMIGNhbnZhcy4gTWFuYWdlcyB2ZXJ0ZXggZGF0YSBhbmQgYXR0cmlidXRlcy5cbiAqXG4gKiBAY2xhc3MgR2VvbWV0cnlcbiAqIEBjb21wb25lbnRcbiAqIEBjb25zdHJ1Y3RvclxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IHRoZSBHZW9tZXRyeSBpcyBhIGNvbXBvbmVudCBvZlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgaW5zdGFudGlhdGlvbiBvcHRpb25zXG4gKi9cblxuZnVuY3Rpb24gR2VvbWV0cnkoaWQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmVudGl0eSA9IGlkO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIEVudGl0eVJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMuZ2V0RW50aXR5KCksICdHZW9tZXRyaWVzJyk7XG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nZXRFbnRpdHkoKSwgJ1JlbmRlcmFibGVzJyk7XG5cbiAgICB0aGlzLnNwZWMgPSB7XG4gICAgICAgIGlkOiBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkodGhpcy5lbnRpdHkpLl9pZCxcbiAgICAgICAgdHlwZTogKG9wdGlvbnMudHlwZSB8fCAndHJpYW5nbGVzJykudG9VcHBlckNhc2UoKSxcbiAgICAgICAgdmVydGV4QnVmZmVyczoge30sXG4gICAgICAgIHVuaWZvcm1zOiB7XG4gICAgICAgICAgICBvcmlnaW46IG5ldyBGbG9hdDMyQXJyYXkoWzAuNSwgMC41XSksXG4gICAgICAgICAgICBzaXplOiBuZXcgRmxvYXQzMkFycmF5KFsxLDEsMV0pXG4gICAgICAgIH0sXG4gICAgICAgIGludmFsaWRhdGlvbnM6IHt9XG4gICAgfTtcblxuICAgIHRoaXMuYWRkVmVydGV4QnVmZmVyKCdwb3MnKTtcbiAgICB0aGlzLmFkZFZlcnRleEJ1ZmZlcigndGV4Q29vcmQnKTtcbiAgICB0aGlzLmFkZFZlcnRleEJ1ZmZlcignbm9ybWFsJyk7XG4gICAgdGhpcy5hZGRWZXJ0ZXhCdWZmZXIoJ2luZGljZXMnKTtcblxuICAgIFRhcmdldC5jYWxsKHRoaXMsIGlkLCB7XG4gICAgICAgIHZlcnRpY2llczogW1xuICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pXVxuICAgIH0pO1xuICAgIFxuICAgIGlmIChvcHRpb25zLm9yaWdpbikgdGhpcy5zZXRPcmlnaW4ob3B0aW9ucy5vcmlnaW4pO1xufVxuXG5HZW9tZXRyeS50b1N0cmluZyA9ICBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIEdFT01FVFJZO1xufTtcblxuR2VvbWV0cnkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShUYXJnZXQucHJvdG90eXBlKTtcblxuLyoqXG4gKiBHZXQgdGhlIEVudGl0eSB0aGUgR2VvbWV0cnkgaXMgYSBjb21wb25lbnQgb2YuXG4gKlxuICogQG1ldGhvZCBnZXRFbnRpdHlcbiAqXG4gKiBAcmV0dXJuIHtFbnRpdHl9IHRoZSBFbnRpdHkgdGhlIEdlb21ldHJ5IGlzIGEgY29tcG9uZW50IG9mXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5nZXRFbnRpdHkgPSBmdW5jdGlvbiBnZXRFbnRpdHkoKSB7XG4gICAgcmV0dXJuIEVudGl0eVJlZ2lzdHJ5LmdldEVudGl0eSh0aGlzLmVudGl0eSk7XG59O1xuXG4vKipcbiAqIEFsbG9jYXRlcyBhbiBhcnJheSBidWZmZXIgd2hlcmUgdmVydGV4IGRhdGEgaXMgc2VudCB0byB2aWEgY29tcGlsZS5cbiAqXG4gKiBAbWV0aG9kIGFkZFZlcnRleEJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG9mIHZib1xuICogQHBhcmFtIHtBcnJheX0gVmFsdWVzIG9mIG5ldyB2ZXJ0ZXggYnVmZmVyLlxuICogXG4gKiBAY2hhaW5hYmxlXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5hZGRWZXJ0ZXhCdWZmZXIgPSBmdW5jdGlvbiBhZGRWZXJ0ZXhCdWZmZXIoYnVmZmVyTmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgYnVmZmVyID0gdGhpcy5zcGVjLnZlcnRleEJ1ZmZlcnNbYnVmZmVyTmFtZV0gPSB2YWx1ZSB8fCBbXTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBidWZmZXIgb2JqZWN0IGJhc2VkIG9uIGJ1ZmZlciBuYW1lLlxuICpcbiAqIEBtZXRob2QgZ2V0VmVydGV4QnVmZmVyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IE5hbWUgb2YgdmVydGV4QnVmZmVyIHRvIGJlIHJldHJpZXZlZC5cbiAqL1xuXG5HZW9tZXRyeS5wcm90b3R5cGUuZ2V0VmVydGV4QnVmZmVyID0gZnVuY3Rpb24gZ2V0VmVydGV4QnVmZmVyKGJ1ZmZlck5hbWUpIHtcbiAgICBpZiAoISBidWZmZXJOYW1lKSB0aHJvdyAnZ2V0VmVydGV4QnVmZmVyIHJlcXVpcmVzIGEgbmFtZSc7XG4gICAgcmV0dXJuIHRoaXMuc3BlYy52ZXJ0ZXhCdWZmZXJzW2J1ZmZlck5hbWVdO1xufTtcblxuLyoqXG4gKiBAbWV0aG9kIHNldFZlcnRleEJ1ZmZlclxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuc2V0VmVydGV4QnVmZmVyID0gZnVuY3Rpb24gc2V0VmVydGV4QnVmZmVyKGJ1ZmZlcm5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5zcGVjLnZlcnRleEJ1ZmZlcnNbYnVmZmVybmFtZV0gPSB2YWx1ZTtcbiAgICB0aGlzLnNwZWMuaW52YWxpZGF0aW9uc1tidWZmZXJuYW1lXSA9IDE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqICBTZXQgdGhlIHBvc2l0aW9ucyBvZiB0aGUgdmVydGljaWVzIGluIHRoaXMgZ2VvbWV0cnkuXG4gKiAgQG1ldGhvZCBzZXRWZXJ0ZXhQb3NpdGlvbnNcbiAqICBAcGFyYW0gdmFsdWUge0FycmF5fVxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuc2V0VmVydGV4UG9zaXRpb25zID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0VmVydGV4QnVmZmVyKCdwb3MnLCB2YWx1ZSk7XG59O1xuXG4vKipcbiAqICBTZXQgdGhlIG5vcm1hbHMgb24gdGhpcyBnZW9tZXRyeS5cbiAqICBAbWV0aG9kIHNldE5vcm1hbHNcbiAqICBAcGFyYW0gdmFsdWUge0FycmF5fVxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuc2V0Tm9ybWFscyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnNldFZlcnRleEJ1ZmZlcignbm9ybWFsJywgdmFsdWUpO1xufTtcblxuLyoqXG4gKiAgU2V0IHRoZSB0ZXh0dXJlIGNvb3JkaW5hdGVzIG9uIHRoaXMgZ2VvbWV0cnkuXG4gKiAgQG1ldGhvZCBzZXRUZXh0dXJlQ29vcmRzXG4gKiAgQHBhcmFtIHZhbHVlIHtBcnJheX1cbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLnNldFRleHR1cmVDb29yZHMgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5zZXRWZXJ0ZXhCdWZmZXIoJ3RleENvb3JkJywgdmFsdWUpO1xufTtcblxuXG4vKipcbiAqICBTZXQgdGhlIHRleHR1cmUgY29vcmRpbmF0ZXMgb24gdGhpcyBnZW9tZXRyeS5cbiAqICBAbWV0aG9kIHNldFRleHR1cmVDb29yZHNcbiAqICBAcGFyYW0gdmFsdWUge0FycmF5fVxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuc2V0SW5kaWNlcyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnNldFZlcnRleEJ1ZmZlcignaW5kaWNlcycsIHZhbHVlKTtcbn07XG5cbi8qKlxuICogQG1ldGhvZCBnZXRWZXJ0ZXhQb3NpdGlvbnNcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmdldFZlcnRleFBvc2l0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRWZXJ0ZXhCdWZmZXIoJ3BvcycpO1xufTtcblxuLyoqXG4gKiBAbWV0aG9kIGdldE5vcm1hbHNcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmdldE5vcm1hbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VmVydGV4QnVmZmVyKCdub3JtYWwnKTtcbn07XG5cbi8qKlxuICogQG1ldGhvZCBnZXRUZXh0dXJlQ29vcmRzXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5nZXRUZXh0dXJlQ29vcmRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmdldFZlcnRleEJ1ZmZlcigndGV4Q29vcmQnKTtcbn07XG5cbi8qKlxuICogQWxsb2NhdGVzIGFuIGVsZW1lbnQgYXJyYXlcbiAqXG4gKiBAbWV0aG9kIGdldEVudGl0eVxuICogXG4gKiBAcGFyYW0ge051bWJlcn0geCBvcmlnaW4gb24gdGhlIHgtYXhpcyBhcyBhIHBlcmNlbnRcbiAqXG4gKiBAY2hhaW5hYmxlXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5hZGRJbmRleEJ1ZmZlciA9IGZ1bmN0aW9uIGFkZEluZGV4QnVmZmVyKGJ1ZmZlck5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5zcGVjLmluZGV4QnVmZmVyc1tidWZmZXJOYW1lXSA9IHZhbHVlIHx8IFtdO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIGluZGV4IGJ1ZmZlciB3aXRoIGNvcnJlc3BvbmRpbmcgYnVmZmVyTmFtZS5cbiAqXG4gKiBAbWV0aG9kIGdldEluZGV4QnVmZmVyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IE5hbWUgb2YgaW5kZXhCdWZmZXIgdG8gYmUgcmV0cmlldmVkLlxuICovXG5cbkdlb21ldHJ5LnByb3RvdHlwZS5nZXRJbmRleEJ1ZmZlciA9IGZ1bmN0aW9uIGdldEluZGV4QnVmZmVyKGJ1ZmZlck5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5zcGVjLmluZGV4QnVmZmVyc1tidWZmZXJOYW1lXTtcbn07XG5cbkdlb21ldHJ5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEdlb21ldHJ5O1xuXG4vKipcbiAqIEdldHMgdGhlIG9yaWdpbiBvZiB0aGUgR2VvbWV0cnkuXG4gKlxuICogQG1ldGhvZCBnZXRPcmlnaW5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gMi1kaW1lbnNpb25hbCBhcnJheSByZXByZXNlbnRpbmcgdGhlIEdlb21ldHJ5J3Mgb3JpZ2luXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5nZXRPcmlnaW4gPSBmdW5jdGlvbiBnZXRPcmlnaW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuc3BlYy51bmlmb3Jtcy5vcmlnaW47XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgb3JpZ2luIG9mIHRoZSBHZW9tZXRyeS5cbiAqXG4gKiBAbWV0aG9kIHNldE9yaWdpblxuICogQGNoYWluYWJsZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IG9yaWdpbiBvbiB0aGUgeC1heGlzIGFzIGEgcGVyY2VudFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgb3JpZ2luIG9uIHRoZSB5LWF4aXMgYXMgYSBwZXJjZW50XG4gKi9cblxuR2VvbWV0cnkucHJvdG90eXBlLnNldE9yaWdpbiAgPSBmdW5jdGlvbiBzZXRPcmlnaW4oeCwgeSkge1xuICAgIGlmICgoeCAhPSBudWxsICYmICh4IDwgMCB8fCB4ID4gMSkpIHx8ICh5ICE9IG51bGwgJiYgKHkgPCAwIHx8IHkgPiAxKSkpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignT3JpZ2luIG11c3QgaGF2ZSBhbiB4IGFuZCB5IHZhbHVlIGJldHdlZW4gMCBhbmQgMScpO1xuXG4gICAgdGhpcy5zcGVjLnVuaWZvcm1zLm9yaWdpblswXSA9IHggIT0gbnVsbCA/IHggOiB0aGlzLnNwZWMudW5pZm9ybXMub3JpZ2luWzBdO1xuICAgIHRoaXMuc3BlYy51bmlmb3Jtcy5vcmlnaW5bMV0gPSB5ICE9IG51bGwgPyB5IDogdGhpcy5zcGVjLnVuaWZvcm1zLm9yaWdpblsxXTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHJlbmRlciBzcGVjaWZpY2F0aW9uIG9mIHRoZSBHZW9tZXRyeS5cbiAqXG4gKiBAbWV0aG9kICByZW5kZXJcbiAqIFxuICogQHJldHVybiB7T2JqZWN0fSByZW5kZXIgc3BlY2lmaWNhdGlvblxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0cmFuc2Zvcm0gPSB0aGlzLmdldEVudGl0eSgpLmdldENvbXBvbmVudChUUkFOU0ZPUk0pO1xuICAgIHZhciBvcGFjaXR5ID0gdGhpcy5nZXRFbnRpdHkoKS5nZXRDb21wb25lbnQoT1BBQ0lUWSk7XG4gICAgdmFyIHNpemUgPSB0aGlzLmdldEVudGl0eSgpLmdldENvbXBvbmVudChTSVpFKTtcbiAgICB2YXIgbWF0ZXJpYWwgPSB0aGlzLmdldEVudGl0eSgpLmdldENvbXBvbmVudChNQVRFUklBTFMpIHx8IHtjaHVua3M6IFtdfSA7XG5cbiAgICB0aGlzLnNwZWMudW5pZm9ybXMudHJhbnNmb3JtID0gdHJhbnNmb3JtLmdldEdsb2JhbE1hdHJpeCgpO1xuICAgIHRoaXMuc3BlYy51bmlmb3Jtcy5vcGFjaXR5ID0gb3BhY2l0eSA/IG9wYWNpdHkuX2dsb2JhbE9wYWNpdHkgOiAxO1xuICAgIHRoaXMuc3BlYy51bmlmb3Jtcy5zaXplID0gbm9ybWFsaXplU2l6ZSgodGhpcy5nZXRFbnRpdHkoKS5nZXRDb250ZXh0KCkgfHwge30pLl9zaXplLCBzaXplLmdldEdsb2JhbFNpemUoKSk7XG5cbiAgICBpZiAobWF0ZXJpYWwpIHRoaXMuc3BlYy50ZXh0dXJlID0gbWF0ZXJpYWwudGV4dHVyZTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hdGVyaWFsLmNodW5rcy5sZW5ndGg7IGkrKylcbiAgICAgICAgdGhpcy5zcGVjLnVuaWZvcm1zW21hdGVyaWFsLmNodW5rc1tpXS5uYW1lXSA9IDE7XG5cbiAgICBmb3IgKHZhciBuYW1lIGluIG1hdGVyaWFsLnVuaWZvcm1zKVxuICAgICAgICB0aGlzLnNwZWMudW5pZm9ybXNbbmFtZV0gPSBtYXRlcmlhbC51bmlmb3Jtc1tuYW1lXTtcblxuICAgIHJldHVybiB0aGlzLnNwZWM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgb3B0aW9ucyBvZiB0aGUgR2VvbWV0cnkuXG4gKlxuICogQG1ldGhvZCBzZXRPcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9iamVjdCBvZiBvcHRpb25zXG4gKi9cblxuR2VvbWV0cnkucHJvdG90eXBlLnNldE9wdGlvbnMgPSBmdW5jdGlvbiBzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5vcmlnaW4pIHRoaXMuc2V0T3JpZ2luKG9wdGlvbnMub3JpZ2luKTtcbn07XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVNpemUoY29udGV4dFNpemUsIHZhbCkge1xuICAgIHZhciB4U2NhbGUgPSBjb250ZXh0U2l6ZVswXTtcbiAgICB2YXIgeVNjYWxlID0gY29udGV4dFNpemVbMV07XG5cbiAgICB2YXIgYXNwZWN0Q29ycmVjdGlvbiA9IDEgLyAoeFNjYWxlID4geVNjYWxlID8geVNjYWxlIDogeFNjYWxlKTtcblxuICAgIHJldHVybiBbXG4gICAgICAgIHZhbFswXSAqIGFzcGVjdENvcnJlY3Rpb24sXG4gICAgICAgIHZhbFsxXSAqIGFzcGVjdENvcnJlY3Rpb24sXG4gICAgICAgIHZhbFsyXSAqICBhc3BlY3RDb3JyZWN0aW9uXG4gICAgXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR2VvbWV0cnk7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogYWRuYW5AZmFtby51cywgam9zZXBoQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4vKipcbiAqIFNoYWRlciBpcyByZXNwb25zaWJsZSBmb3IgdHJhdmVyc2luZyB0aGUgbGlzdCBvZiBnZW9tZXRyaWVzXG4gKiBhbmQgY29udmVydGluZyB0aGVpciBzcGVjcyBpbnRvIGdsIGFwaSBjYWxscy5cbiAqXG4gKiBAY2xhc3MgIFNoYWRlclxuICovXG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NvcmUvRW50aXR5UmVnaXN0cnknKTtcbnZhciBNYXRlcmlhbHMgICAgICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ01hdGVyaWFscycpO1xudmFyIGNodW5rcyA9IFtdO1xudmFyIGNodW5rTWFwID0ge307XG5cbnZhciB2ZXJ0ZXhXcmFwcGVyID0gW1xuICAgICd2ZWM0IGNsaXBzcGFjZShpbiB2ZWM0IHBvcykgeycsXG4gICAgICAncmV0dXJuIHZlYzQoKHBvcy54IC8gdV9yZXNvbHV0aW9uLngpICogMi4sJyxcbiAgICAgICcgICAgICAgICAgICAocG9zLnkgLyB1X3Jlc29sdXRpb24ueSkgKiAyLiwnLFxuICAgICAgJyAgICAgICAgICAgIHBvcy56IC8gKHVfcmVzb2x1dGlvbi55ICogMC41KSwnLFxuICAgICAgJyAgICAgICAgICAgIHBvcy53KTsnLFxuICAgICd9JyxcblxuICAgICdtYXQzIGdldE5vcm1hbE1hdHJpeChpbiBtYXQ0IGEpIHsnLFxuICAgICAgICAnbWF0MyBtYXROb3JtOycsXG5cbiAgICAgICAgJ2Zsb2F0IGEwMCA9IGFbMF1bMF0sIGEwMSA9IGFbMF1bMV0sIGEwMiA9IGFbMF1bMl0sIGEwMyA9IGFbMF1bM10sJyxcbiAgICAgICAgJ2ExMCA9IGFbMV1bMF0sIGExMSA9IGFbMV1bMV0sIGExMiA9IGFbMV1bMl0sIGExMyA9IGFbMV1bM10sJyxcbiAgICAgICAgJ2EyMCA9IGFbMl1bMF0sIGEyMSA9IGFbMl1bMV0sIGEyMiA9IGFbMl1bMl0sIGEyMyA9IGFbMl1bM10sJyxcbiAgICAgICAgJ2EzMCA9IGFbM11bMF0sIGEzMSA9IGFbM11bMV0sIGEzMiA9IGFbM11bMl0sIGEzMyA9IGFbM11bM10sJyxcblxuICAgICAgICAnYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLCcsXG4gICAgICAgICdiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsJyxcbiAgICAgICAgJ2IwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCwnLFxuICAgICAgICAnYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLCcsXG4gICAgICAgICdiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsJyxcbiAgICAgICAgJ2IwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMiwnLFxuICAgICAgICAnYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLCcsXG4gICAgICAgICdiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsJyxcbiAgICAgICAgJ2IwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCwnLFxuICAgICAgICAnYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLCcsXG4gICAgICAgICdiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsJyxcbiAgICAgICAgJ2IxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMiwnLFxuXG4gICAgICAgICdkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7JyxcblxuICAgICAgICAnZGV0ID0gMS4wIC8gZGV0OycsXG5cbiAgICAgICAgJ21hdE5vcm1bMF1bMF0gPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDsnLFxuICAgICAgICAnbWF0Tm9ybVswXVsxXSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0OycsXG4gICAgICAgICdtYXROb3JtWzBdWzJdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7JyxcblxuICAgICAgICAnbWF0Tm9ybVsxXVswXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0OycsXG4gICAgICAgICdtYXROb3JtWzFdWzFdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7JyxcbiAgICAgICAgJ21hdE5vcm1bMV1bMl0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDsnLFxuXG4gICAgICAgICdtYXROb3JtWzJdWzBdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7JyxcbiAgICAgICAgJ21hdE5vcm1bMl1bMV0gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDsnLFxuICAgICAgICAnbWF0Tm9ybVsyXVsyXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0OycsXG5cbiAgICAgICAgJ3JldHVybiBtYXROb3JtOycsXG4gICAgJ30nLFxuXG4gICAgJy8vZGVmaW5lX3ZzQ2h1bmsnLFxuICAgICd2ZWM0IHBpcGVsaW5lX3BvcyhpbiB2ZWM0IHBvcykgeycsXG4gICAgJyAgICAvL2FwcGx5X3ZzQ2h1bmsnLFxuICAgICcgICAgbWF0NCB0cnggPSB1X3RyYW5zZm9ybTsnLFxuXG4gICAgJyAgICB0cnggPSBtYXQ0KCAxLDAsMCwwLCcgK1xuICAgICAgICAnMCwtMSwwLDAsJytcbiAgICAgICAgJzAsMCwxLDAsJytcbiAgICAgICAgJzAsMCwwLDEnK1xuICAgICAgICAnKSAqIHRyeDsnLFxuXG4gICAgJyAgICBwb3MueHl6ICo9IHVfc2l6ZS54eXo7JyxcblxuICAgICcgICAgdHJ4WzNdID0gY2xpcHNwYWNlKHRyeFszXSk7JyxcbiAgICAnICAgIGZsb2F0IHhUID0gdHJ4WzNdWzBdOycsXG4gICAgJyAgICBmbG9hdCB5VCA9IHRyeFszXVsxXTsnLFxuXG4gICAgJyAgICB0cnhbM11bMF0gPSAwLjsnLFxuICAgICcgICAgdHJ4WzNdWzFdID0gMC47JyxcblxuICAgICcgICAgcG9zID0gdV9wZXJzcGVjdGl2ZSAqIHRyeCAqIHBvczsnLFxuICAgICcgICAgcG9zLnh5ICs9IHZlYzIoeFQsIHlUKTsnLFxuICAgICcgICAgcG9zLnogICo9IC0xLjsnLFxuICAgIC8vJyAgICBwb3MueiAgPSBtYXgocG9zLnosIDEuKTsnLFxuICAgICcgICAgcmV0dXJuIHBvczsnLFxuICAgICd9JyxcblxuICAgICd2b2lkIG1haW4oKSB7JyxcbiAgICAnICAgIHZfdGV4Q29vcmQgPSBhX3RleENvb3JkOycsXG4gICAgJyAgICBnbF9Qb3NpdGlvbiA9IHBpcGVsaW5lX3BvcyhhX3Bvcyk7JyxcbiAgICAnfSdcbl0uam9pbignXFxuJyk7XG5cbnZhciBmcmFnbWVudFdyYXBwZXIgPSBbXG4gICAgJy8vZGVmaW5lX2ZzQ2h1bmsnLFxuXG4gICAgJ3ZlYzQgcGlwZWxpbmVfY29sb3IoaW4gdmVjNCBjb2xvcikgeycsXG4gICAgJyAgICAvL2FwcGx5X2ZzQ2h1bmsnLFxuICAgICcgICAgcmV0dXJuIGNvbG9yOycsXG4gICAgJ30nLFxuXG4gICAgJ3ZvaWQgbWFpbigpIHsnLFxuICAgICcgICAgdmVjNCBjb2xvciA9IHZlYzQoMCwgMCwgMCwgdV9vcGFjaXR5KTsnLFxuICAgICcgICAgY29sb3IgPSBwaXBlbGluZV9jb2xvcihjb2xvcik7JyxcbiAgICAnICAgIGdsX0ZyYWdDb2xvciA9IGNvbG9yOycsXG4gICAgJ30nXG5dLmpvaW4oJ1xcbicpO1xuXG52YXIgdW5pZm9ybXMgPSB7XG4gICAgdHJhbnNmb3JtOiBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0sXG4gICAgcGVyc3BlY3RpdmU6IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSxcbiAgICBvcGFjaXR5OiAxLFxuICAgIG1vdXNlOiBbMCwgMF0sXG4gICAgb3JpZ2luOiBbLjUsIC41XSxcbiAgICByZXNvbHV0aW9uOiBbMCwgMCwgMF0sXG4gICAgc2l6ZTogWzAsIDAsIDBdLFxuICAgIHRpbWU6IDAsXG4gICAgaW1hZ2U6IG51bGwsXG4gICAgbGlnaHRQb3M6IFswLCAwLCAwXSxcbiAgICBsaWdodENvbG9yOiBbMCwgMCwgMF0sXG4gICAgY2FtZXJhUG9zOiBbMCwgMCwgMF1cbn07XG5cbnZhciBhdHRyaWJ1dGVzID0ge1xuICAgIHBvczogWzAsIDAsIDAsIDBdLFxuICAgIHRleENvb3JkOiBbMCwgMF0sXG4gICAgbm9ybWFsOiBbMCwgMCwgMF1cbn07XG5cbnZhciB2YXJ5aW5ncyA9IHtcbiAgICB0ZXhDb29yZDogWzAsIDBdLFxuICAgIG5vcm1hbDogWzAsIDAsIDBdLFxuICAgIGxpZ2h0V2VpZ2h0aW5nOiBbMCwgMCwgMF1cbn07XG5cbnZhciBmbGFnZ2VkVW5pZm9ybXMgPSBbXTtcblxudmFyIGhlYWRlciA9ICdwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsnO1xuXG5mdW5jdGlvbiBTaGFkZXIoZ2wpIHtcbiAgICB0aGlzLmdsID0gZ2w7XG4gICAgdGhpcy5yZXNldFByb2dyYW0oKTtcbn1cblxuU2hhZGVyLnByb3RvdHlwZS5yZXNldFByb2dyYW0gPSBmdW5jdGlvbiByZXNldFByb2dyYW0oKSB7XG4gICAgdmFyIHZzQ2h1bmtEZWZpbmVzID0gW107XG4gICAgdmFyIHZzQ2h1bmtBcHBsaWVzID0gW107XG4gICAgdmFyIGZzQ2h1bmtEZWZpbmVzID0gW107XG4gICAgdmFyIGZzQ2h1bmtBcHBsaWVzID0gW107XG5cbiAgICB2YXIgdmVydGV4SGVhZGVyID0gW2hlYWRlcl07XG4gICAgdmFyIGZyYWdtZW50SGVhZGVyID0gW2hlYWRlcl07XG5cbiAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnMgPSB7fTtcbiAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7fTtcbiAgICB0aGlzLnVuaWZvcm1zID0gdW5pZm9ybXM7XG4gICAgZmxhZ2dlZFVuaWZvcm1zID0gW107XG4gICAgLy93aW5kb3cuZmxhZ2dlZFVuaWZvcm1zID0gZmxhZ2dlZFVuaWZvcm1zO1xuICAgIE1hdGVyaWFscy5mb3JFYWNoKGZ1bmN0aW9uIChyZW5kZXJOb2RlKSB7XG4gICAgICAgIHZhciBtYXRlcmlhbCA9IHJlbmRlck5vZGUuZ2V0Q29tcG9uZW50KCdtYXRlcmlhbCcpLCBuYW1lO1xuXG4gICAgICAgIGZvciAobmFtZSBpbiBtYXRlcmlhbC51bmlmb3JtcykgdW5pZm9ybXNbbmFtZV0gPSB1bmlmb3Jtc1tuYW1lXSB8fCBtYXRlcmlhbC51bmlmb3Jtc1tuYW1lXTtcblxuICAgICAgICBmb3IgKG5hbWUgaW4gbWF0ZXJpYWwudmFyeWluZ3MpIHZhcnlpbmdzW25hbWVdID0gdmFyeWluZ3NbbmFtZV0gfHwgbWF0ZXJpYWwudmFyeWluZ3NbbmFtZV07XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXRlcmlhbC5jaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaHVuayA9IG1hdGVyaWFsLmNodW5rc1tpXTtcbiAgICAgICAgICAgIG5hbWUgPSBjaHVuay5uYW1lO1xuXG4gICAgICAgICAgICBpZiAoZmxhZ2dlZFVuaWZvcm1zLmluZGV4T2YobmFtZSkgIT09IC0xKSBjb250aW51ZTtcblxuICAgICAgICAgICAgaWYgKGNodW5rLnZzKSB7XG4gICAgICAgICAgICAgICAgdnNDaHVua0RlZmluZXMucHVzaCgndm9pZCAnICsgbmFtZSArICcoaW5vdXQgdmVjNCBwb3MpIHsgJyArIGNodW5rLnZzICsgJyB9XFxuJyk7XG4gICAgICAgICAgICAgICAgdnNDaHVua0FwcGxpZXMucHVzaCgnaWYgKHVfJyArIG5hbWUgKyc9PSAxLiknICsgbmFtZSArICcocG9zKTtcXG4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNodW5rLmZzKSB7XG4gICAgICAgICAgICAgICAgZnNDaHVua0RlZmluZXMucHVzaCgndm9pZCAnICsgbmFtZSArICcoaW5vdXQgdmVjNCBjb2xvcikgeyAnICsgY2h1bmsuZnMgKyAnIH1cXG4nKTtcbiAgICAgICAgICAgICAgICBmc0NodW5rQXBwbGllcy5wdXNoKCdpZiAodV8nICsgbmFtZSArJz09IDEuKScgKyBuYW1lICsgJyhjb2xvcik7XFxuJyk7ICAgIFxuICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMudW5pZm9ybXNbbmFtZV0gPSAwO1xuXG4gICAgICAgICAgICBmbGFnZ2VkVW5pZm9ybXMucHVzaChuYW1lKTtcbiAgICAgICAgfTtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIFxuICAgIGZvciAodmFyIG5hbWUgIGluIHRoaXMudW5pZm9ybXMpIHtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ3VuaWZvcm0gJyArIGRhdGFUb1VuaWZvcm1UeXBlKHRoaXMudW5pZm9ybXNbbmFtZV0pICsgJyB1XycgKyBuYW1lICsgJztcXG4nKTtcbiAgICAgICAgZnJhZ21lbnRIZWFkZXIucHVzaCgndW5pZm9ybSAnICsgZGF0YVRvVW5pZm9ybVR5cGUodGhpcy51bmlmb3Jtc1tuYW1lXSkgKyAnIHVfJyArIG5hbWUgKyAnO1xcbicpO1xuICAgIH1cblxuICAgIGZvciAobmFtZSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCdhdHRyaWJ1dGUgJyArIGRhdGFUb1VuaWZvcm1UeXBlKGF0dHJpYnV0ZXNbbmFtZV0pICsgJyAnICsgJ2FfJyArIG5hbWUgKyAnO1xcbicpO1xuICAgIH1cblxuICAgIGZvciAobmFtZSBpbiB2YXJ5aW5ncykge1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgndmFyeWluZyAnICsgZGF0YVRvVW5pZm9ybVR5cGUodmFyeWluZ3NbbmFtZV0pICsgJyAnICsgJ3ZfJyArIG5hbWUgKyAnO1xcbicpO1xuICAgICAgICBmcmFnbWVudEhlYWRlci5wdXNoKCd2YXJ5aW5nICcgKyBkYXRhVG9Vbmlmb3JtVHlwZSh2YXJ5aW5nc1tuYW1lXSkgKyAnICcgKyAndl8nICsgbmFtZSArICc7XFxuJyk7XG4gICAgfVxuXG4gICAgdmFyIHZlcnRleFNvdXJjZSA9IHZlcnRleEhlYWRlci5qb2luKCdcXG4nKSArIHZlcnRleFdyYXBwZXJcbiAgICAgICAgICAgIC5yZXBsYWNlKCcvL2RlZmluZV92c0NodW5rJywgdnNDaHVua0RlZmluZXMuam9pbignXFxuJykpXG4gICAgICAgICAgICAucmVwbGFjZSgnLy9hcHBseV92c0NodW5rJywgdnNDaHVua0FwcGxpZXMuam9pbignXFxuJykpO1xuXG4gICAgdmFyIGZyYWdtZW50U291cmNlID0gZnJhZ21lbnRIZWFkZXIuam9pbignXFxuJykgKyBmcmFnbWVudFdyYXBwZXJcbiAgICAgICAgICAgIC5yZXBsYWNlKCcvL2RlZmluZV9mc0NodW5rJywgZnNDaHVua0RlZmluZXMuam9pbignXFxuJykpXG4gICAgICAgICAgICAucmVwbGFjZSgnLy9hcHBseV9mc0NodW5rJywgZnNDaHVua0FwcGxpZXMuam9pbignXFxuJykpO1xuICAgIFxuICAgIHZhciBwcm9ncmFtID0gdGhpcy5nbC5jcmVhdGVQcm9ncmFtKCk7XG4gICAgd2luZG93LmYgPSBmcmFnbWVudFNvdXJjZVxuICAgIHRoaXMuZ2wuYXR0YWNoU2hhZGVyKHByb2dyYW0sIGNvbXBpbGVTb3VyY2UodGhpcy5nbCwgdGhpcy5nbC5WRVJURVhfU0hBREVSLCB2ZXJ0ZXhTb3VyY2UpKTtcbiAgICB0aGlzLmdsLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBjb21waWxlU291cmNlKHRoaXMuZ2wsIHRoaXMuZ2wuRlJBR01FTlRfU0hBREVSLCBmcmFnbWVudFNvdXJjZSkpO1xuICAgIHRoaXMuZ2wubGlua1Byb2dyYW0ocHJvZ3JhbSk7XG5cbiAgICBpZiAoISB0aGlzLmdsLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgdGhpcy5nbC5MSU5LX1NUQVRVUykpXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2xpbmsgZXJyb3I6ICcgKyB0aGlzLmdsLmdldFByb2dyYW1JbmZvTG9nKHByb2dyYW0pKTtcblxuICAgIGVsc2UgdGhpcy5wcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIHRoaXMuaXNTYW1wbGVyID0ge307XG59O1xuXG5TaGFkZXIucHJvdG90eXBlLnNldFVuaWZvcm1zID0gZnVuY3Rpb24gKHVuaWZvcm1zKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcblxuICAgIGdsLnVzZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcblxuICAgIGZvciAodmFyIG5hbWUgaW4gdW5pZm9ybXMpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy51bmlmb3JtTG9jYXRpb25zW25hbWVdIHx8IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sICd1XycgKyBuYW1lKTtcbiAgICAgICAgaWYgKCEgbG9jYXRpb24pIGNvbnRpbnVlO1xuICAgICAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnNbbmFtZV0gPSBsb2NhdGlvbjtcbiAgICAgICAgdmFyIHZhbHVlID0gdW5pZm9ybXNbbmFtZV07XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FzZSAxOiBnbC51bmlmb3JtMWZ2KGxvY2F0aW9uLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOiBnbC51bmlmb3JtMmZ2KGxvY2F0aW9uLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOiBnbC51bmlmb3JtM2Z2KGxvY2F0aW9uLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OiBnbC51bmlmb3JtNGZ2KGxvY2F0aW9uLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OiBnbC51bmlmb3JtTWF0cml4M2Z2KGxvY2F0aW9uLCBmYWxzZSwgbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSkpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTY6IGdsLnVuaWZvcm1NYXRyaXg0ZnYobG9jYXRpb24sIGZhbHNlLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgJ2NhbnQgbG9hZCB1bmlmb3JtIFwiJyArIG5hbWUgKyAnXCIgb2YgbGVuZ3RoIDonICsgdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgKHRoaXMuaXNTYW1wbGVyW25hbWVdID8gZ2wudW5pZm9ybTFpIDogZ2wudW5pZm9ybTFmKS5jYWxsKGdsLCBsb2NhdGlvbiwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgJ3NldCB1bmlmb3JtIFwiJyArIG5hbWUgKyAnXCIgdG8gaW52YWxpZCB0eXBlIDonICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmbGFnZ2VkVW5pZm9ybXMuZm9yRWFjaChmdW5jdGlvbiAoZmxhZykge1xuICAgICAgICBpZiAoISB1bmlmb3Jtc1tmbGFnXSkgIGdsLnVuaWZvcm0xZih0aGlzLnVuaWZvcm1Mb2NhdGlvbnNbZmxhZ10sIDApO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5mdW5jdGlvbiBkYXRhVG9Vbmlmb3JtVHlwZSh0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT09IG51bGwpIHJldHVybiAnc2FtcGxlcjJEJztcbiAgICBpZiAoISBBcnJheS5pc0FycmF5KHR5cGUpKSByZXR1cm4gJ2Zsb2F0JztcbiAgICB2YXIgbGVuZ3RoID0gdHlwZS5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCA8IDUpIHJldHVybiAndmVjJyArIGxlbmd0aDtcbiAgICBlbHNlIHJldHVybiAnbWF0JyArICh0eXBlLmxlbmd0aCAvIDQgfCAwKTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZVNvdXJjZShnbCwgdHlwZSwgc291cmNlKSB7XG4gICAgdmFyIHNoYWRlciA9IGdsLmNyZWF0ZVNoYWRlcih0eXBlKTtcbiAgICBnbC5zaGFkZXJTb3VyY2Uoc2hhZGVyLCBzb3VyY2UpO1xuICAgIGdsLmNvbXBpbGVTaGFkZXIoc2hhZGVyKTtcbiAgICBpZiAoIWdsLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIGdsLkNPTVBJTEVfU1RBVFVTKSkge1xuICAgICAgICB2YXIgaSA9IDI7XG4gICAgICAgIGNvbnNvbGUubG9nKCcxOicgKyBzb3VyY2UucmVwbGFjZSgvXFxuL2csIGZ1bmN0aW9uICgpIHsgcmV0dXJuICdcXG4nICsgKGkrKykgKyAnOiAnOyB9KSk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NvbXBpbGUgZXJyb3I6ICcgKyBnbC5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcikpO1xuICAgIH1cbiAgICByZXR1cm4gc2hhZGVyO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihuKSB7XG4gICAgcmV0dXJuICEgaXNOYU4ocGFyc2VGbG9hdChuKSkgJiYgaXNGaW5pdGUobik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2hhZGVyO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGFkbmFuQGZhbW8udXMsIGpvc2VwaEBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRleHR1cmUgaXMgYSBwcml2YXRlIGNsYXNzIHRoYXQgc3RvcmVzIGltYWdlIGRhdGFcbiAqIHRvIGJlIGFjY2Vzc2VkIGZyb20gYSBzaGFkZXIgb3IgdXNlZCBhcyBhIHJlbmRlciB0YXJnZXQuXG4gKlxuICogQGNsYXNzIFRleHR1cmVcbiAqIEBjb25zdHJ1Y3RvclxuICogXG4gKi9cblxuZnVuY3Rpb24gVGV4dHVyZShnbCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuaWQgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gICAgdmFyIHdpZHRoID0gdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMDtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCAwO1xuICAgIHRoaXMuZm9ybWF0ID0gb3B0aW9ucy5mb3JtYXQgfHwgZ2wuUkdCQTtcbiAgICB0aGlzLnR5cGUgPSBvcHRpb25zLnR5cGUgfHwgZ2wuVU5TSUdORURfQllURTtcbiAgICB0aGlzLmdsID0gZ2w7XG5cbiAgICBnbC5waXhlbFN0b3JlaShnbC5VTlBBQ0tfRkxJUF9ZX1dFQkdMLCB0cnVlKTtcblxuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQpO1xuICAgIGdsLnBpeGVsU3RvcmVpKGdsLlVOUEFDS19GTElQX1lfV0VCR0wsIDEpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLFxuICAgICAgICAgICAgICAgICAgICAgZ2xbb3B0aW9ucy5maWx0ZXIgfHwgb3B0aW9ucy5tYWdGaWx0ZXJdIHx8IGdsLk5FQVJFU1QpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsXG4gICAgICAgICAgICAgICAgICAgICBnbFtvcHRpb25zLmZpbHRlciB8fCBvcHRpb25zLm1pbkZpbHRlcl0gfHwgZ2wuTkVBUkVTVCk7XG5cblxuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsXG4gICAgICAgICAgICAgICAgICAgICBnbFtvcHRpb25zLndyYXAgfHwgb3B0aW9ucy53cmFwU10gfHwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULFxuICAgICAgICAgICAgICAgICAgICAgZ2xbb3B0aW9ucy53cmFwIHx8IG9wdGlvbnMud3JhcFNdIHx8IGdsLkNMQU1QX1RPX0VER0UpO1xuXG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCB0aGlzLmZvcm1hdCwgd2lkdGgsIGhlaWdodCwgMCwgdGhpcy5mb3JtYXQsIHRoaXMudHlwZSwgbnVsbCk7XG5cbiAgICBpZiAob3B0aW9ucy5taW5GaWx0ZXIgJiYgb3B0aW9ucy5taW5GaWx0ZXIgIT0gZ2wuTkVBUkVTVCAmJiBvcHRpb25zLm1pbkZpbHRlciAhPSBnbC5MSU5FQVIpIHtcbiAgICAgICAgZ2wuZ2VuZXJhdGVNaXBtYXAoZ2wuVEVYVFVSRV8yRCk7XG4gICAgfVxufVxuXG5UZXh0dXJlLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24gYmluZCh1bml0KSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwICsgKHVuaXQgfHwgMCkpO1xuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQpO1xufTtcblxuVGV4dHVyZS5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24gdW5iaW5kKHVuaXQpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTAgKyAodW5pdCB8fCAwKSk7XG4gICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG59O1xuXG5UZXh0dXJlLnByb3RvdHlwZS5pbWFnZSA9IGZ1bmN0aW9uIGltYWdlKGltZykge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCB0aGlzLmZvcm1hdCwgdGhpcy5mb3JtYXQsIHRoaXMudHlwZSwgaW1nKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuVGV4dHVyZS5wcm90b3R5cGUucmVhZEJhY2sgPSBmdW5jdGlvbiByZWFkQmFjayh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB4ID0geCB8fCAwO1xuICAgIHkgPSB5IHx8IDA7XG4gICAgd2lkdGggPSB3aWR0aCB8fCB0aGlzLndpZHRoO1xuICAgIGhlaWdodCA9IGhlaWdodCB8fCB0aGlzLmhlaWdodDtcbiAgICB2YXIgZmIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpO1xuICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgZmIpO1xuICAgIGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKGdsLkZSQU1FQlVGRkVSLCBnbC5DT0xPUl9BVFRBQ0hNRU5UMCwgZ2wuVEVYVFVSRV8yRCwgdGhpcy5pZCwgMCk7XG4gICAgaWYgKGdsLmNoZWNrRnJhbWVidWZmZXJTdGF0dXMoZ2wuRlJBTUVCVUZGRVIpID09IGdsLkZSQU1FQlVGRkVSX0NPTVBMRVRFKSB7XG4gICAgICAgIHZhciBwaXhlbHMgPSBuZXcgVWludDhBcnJheSh3aWR0aCAqIGhlaWdodCAqIDQpO1xuICAgICAgICBnbC5yZWFkUGl4ZWxzKHgsIHksIHdpZHRoLCBoZWlnaHQsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIHBpeGVscyk7XG4gICAgfVxuICAgIHJldHVybiBwaXhlbHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHR1cmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIG11bHRpcGx5KG91dHB1dEFycmF5LCBsZWZ0LCByaWdodCkge1xuICAgIHZhciBhMDAgPSBsZWZ0WzBdLCAgYTAxID0gbGVmdFsxXSwgIGEwMiA9IGxlZnRbMl0sICBhMDMgPSBsZWZ0WzNdLFxuICAgICAgICBhMTAgPSBsZWZ0WzRdLCAgYTExID0gbGVmdFs1XSwgIGExMiA9IGxlZnRbNl0sICBhMTMgPSBsZWZ0WzddLFxuICAgICAgICBhMjAgPSBsZWZ0WzhdLCAgYTIxID0gbGVmdFs5XSwgIGEyMiA9IGxlZnRbMTBdLCBhMjMgPSBsZWZ0WzExXSxcbiAgICAgICAgYTMwID0gbGVmdFsxMl0sIGEzMSA9IGxlZnRbMTNdLCBhMzIgPSBsZWZ0WzE0XSwgYTMzID0gbGVmdFsxNV07XG4gICAgXG4gICAgdmFyIGIwID0gcmlnaHRbMF0sIGIxID0gcmlnaHRbMV0sIGIyID0gcmlnaHRbMl0sIGIzID0gcmlnaHRbM107IFxuXG4gICAgb3V0cHV0QXJyYXlbMF0gPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0cHV0QXJyYXlbMV0gPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0cHV0QXJyYXlbMl0gPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0cHV0QXJyYXlbM10gPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG4gICAgXG4gICAgYjAgPSByaWdodFs0XTsgYjEgPSByaWdodFs1XTsgYjIgPSByaWdodFs2XTsgYjMgPSByaWdodFs3XTtcblxuICAgIG91dHB1dEFycmF5WzRdID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dHB1dEFycmF5WzVdID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dHB1dEFycmF5WzZdID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dHB1dEFycmF5WzddID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuICAgIFxuICAgIGIwID0gcmlnaHRbOF07IGIxID0gcmlnaHRbOV07IGIyID0gcmlnaHRbMTBdOyBiMyA9IHJpZ2h0WzExXTtcblxuICAgIG91dHB1dEFycmF5WzhdICA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXRwdXRBcnJheVs5XSAgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0cHV0QXJyYXlbMTBdID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dHB1dEFycmF5WzExXSA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcbiAgICBcbiAgICBiMCA9IHJpZ2h0WzEyXTsgYjEgPSByaWdodFsxM107IGIyID0gcmlnaHRbMTRdOyBiMyA9IHJpZ2h0WzE1XTtcblxuICAgIG91dHB1dEFycmF5WzEyXSA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXRwdXRBcnJheVsxM10gPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0cHV0QXJyYXlbMTRdID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dHB1dEFycmF5WzE1XSA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcbiAgICByZXR1cm4gb3V0cHV0QXJyYXk7XG59XG5cblxuZnVuY3Rpb24gZ2V0VHJhbnNsYXRpb25Gcm9tTXVsdGlwbGljYXRpb24ob3V0cHV0QXJyYXksIGxlZnQsIHJpZ2h0KSB7XG4gICAgdmFyIGEwMCA9IGxlZnRbMF0sICBhMDEgPSBsZWZ0WzFdLFxuICAgICAgICBhMTAgPSBsZWZ0WzRdLCAgYTExID0gbGVmdFs1XSxcbiAgICAgICAgYTIwID0gbGVmdFs4XSwgIGEyMSA9IGxlZnRbOV0sXG4gICAgICAgIGEzMCA9IGxlZnRbMTJdLCBhMzEgPSBsZWZ0WzEzXTtcblxuICAgIHZhciBiMCA9IHJpZ2h0WzEyXSxcbiAgICAgICAgYjEgPSByaWdodFsxM10sXG4gICAgICAgIGIyID0gcmlnaHRbMTRdLFxuICAgICAgICBiMyA9IHJpZ2h0WzE1XTtcblxuICAgIG91dHB1dEFycmF5WzBdID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dHB1dEFycmF5WzFdID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIHJldHVybiBvdXRwdXRBcnJheTtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0KG91dHB1dEFycmF5LCBtYXRyaXgpIHtcbiAgICB2YXIgYTAwID0gbWF0cml4WzBdLCAgYTAxID0gbWF0cml4WzFdLCAgYTAyID0gbWF0cml4WzJdLCAgYTAzID0gbWF0cml4WzNdLFxuICAgICAgICBhMTAgPSBtYXRyaXhbNF0sICBhMTEgPSBtYXRyaXhbNV0sICBhMTIgPSBtYXRyaXhbNl0sICBhMTMgPSBtYXRyaXhbN10sXG4gICAgICAgIGEyMCA9IG1hdHJpeFs4XSwgIGEyMSA9IG1hdHJpeFs5XSwgIGEyMiA9IG1hdHJpeFsxMF0sIGEyMyA9IG1hdHJpeFsxMV0sXG4gICAgICAgIGEzMCA9IG1hdHJpeFsxMl0sIGEzMSA9IG1hdHJpeFsxM10sIGEzMiA9IG1hdHJpeFsxNF0sIGEzMyA9IG1hdHJpeFsxNV0sXG5cbiAgICAgICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxuICAgICAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXG4gICAgICAgIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCxcbiAgICAgICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxuICAgICAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXG4gICAgICAgIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMixcbiAgICAgICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxuICAgICAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXG4gICAgICAgIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCxcbiAgICAgICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxuICAgICAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXG4gICAgICAgIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMixcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG4gICAgICAgIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcblxuICAgIGlmICghZGV0KSByZXR1cm4gbnVsbDtcbiAgICBkZXQgPSAxLjAgLyBkZXQ7XG5cbiAgICBvdXRwdXRBcnJheVswXSAgPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVsxXSAgPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVsyXSAgPSAoYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzKSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVszXSAgPSAoYTIyICogYjA0IC0gYTIxICogYjA1IC0gYTIzICogYjAzKSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVs0XSAgPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVs1XSAgPSAoYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3KSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVs2XSAgPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVs3XSAgPSAoYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxKSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVs4XSAgPSAoYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2KSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVs5XSAgPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVsxMF0gPSAoYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwKSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVsxMV0gPSAoYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwKSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVsxMl0gPSAoYTExICogYjA3IC0gYTEwICogYjA5IC0gYTEyICogYjA2KSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVsxM10gPSAoYTAwICogYjA5IC0gYTAxICogYjA3ICsgYTAyICogYjA2KSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVsxNF0gPSAoYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwKSAqIGRldDtcbiAgICBvdXRwdXRBcnJheVsxNV0gPSAoYTIwICogYjAzIC0gYTIxICogYjAxICsgYTIyICogYjAwKSAqIGRldDtcbiAgICByZXR1cm4gb3V0cHV0QXJyYXk7XG59XG5cbmZ1bmN0aW9uIGdldFdmcm9tTXVsdGlwbGljYXRpb24obGVmdCwgcmlnaHQpIHtcbiAgICB2YXIgYTAwID0gbGVmdFswXSwgIGEwMSA9IGxlZnRbMV0sICBhMDIgPSBsZWZ0WzJdLCAgYTAzID0gbGVmdFszXSxcbiAgICAgICAgYTEwID0gbGVmdFs0XSwgIGExMSA9IGxlZnRbNV0sICBhMTIgPSBsZWZ0WzZdLCAgYTEzID0gbGVmdFs3XSxcbiAgICAgICAgYTIwID0gbGVmdFs4XSwgIGEyMSA9IGxlZnRbOV0sICBhMjIgPSBsZWZ0WzEwXSwgYTIzID0gbGVmdFsxMV0sXG4gICAgICAgIGEzMCA9IGxlZnRbMTJdLCBhMzEgPSBsZWZ0WzEzXSwgYTMyID0gbGVmdFsxNF0sIGEzMyA9IGxlZnRbMTVdO1xuXG4gICAgdmFyIGIwID0gcmlnaHRbMTJdLCBiMSA9IHJpZ2h0WzEzXSwgYjIgPSByaWdodFsxNF0sIGIzID0gcmlnaHRbMTVdO1xuXG4gICAgcmV0dXJuIGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMCArIGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMSArIGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMiArIGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcbn1cblxuZnVuY3Rpb24gYXBwbHlUb1ZlY3RvcihvdXRwdXQsIG1hdHJpeCwgdmVjdG9yKSB7XG4gICAgdmFyIGEwMCA9IG1hdHJpeFswXSwgIGEwMSA9IG1hdHJpeFsxXSwgIGEwMiA9IG1hdHJpeFsyXSwgIGEwMyA9IG1hdHJpeFszXSxcbiAgICAgICAgYTEwID0gbWF0cml4WzRdLCAgYTExID0gbWF0cml4WzVdLCAgYTEyID0gbWF0cml4WzZdLCAgYTEzID0gbWF0cml4WzddLFxuICAgICAgICBhMjAgPSBtYXRyaXhbOF0sICBhMjEgPSBtYXRyaXhbOV0sICBhMjIgPSBtYXRyaXhbMTBdLCBhMjMgPSBtYXRyaXhbMTFdLFxuICAgICAgICBhMzAgPSBtYXRyaXhbMTJdLCBhMzEgPSBtYXRyaXhbMTNdLCBhMzIgPSBtYXRyaXhbMTRdLCBhMzMgPSBtYXRyaXhbMTVdO1xuXG4gICAgdmFyIHYwID0gdmVjdG9yWzBdLCB2MSA9IHZlY3RvclsxXSwgdjIgPSB2ZWN0b3JbMl0sIHYzID0gdmVjdG9yWzNdO1xuXG4gICAgb3V0cHV0WzBdID0gYTAwICogdjAgKyBhMTAgKiB2MSArIGEyMCAqIHYyICsgYTMwICogdjM7XG4gICAgb3V0cHV0WzFdID0gYTAxICogdjAgKyBhMTEgKiB2MSArIGEyMSAqIHYyICsgYTMxICogdjM7XG4gICAgb3V0cHV0WzJdID0gYTAyICogdjAgKyBhMTIgKiB2MSArIGEyMiAqIHYyICsgYTMyICogdjM7XG4gICAgb3V0cHV0WzNdID0gYTAzICogdjAgKyBhMTMgKiB2MSArIGEyMyAqIHYyICsgYTMzICogdjM7XG5cbiAgICByZXR1cm4gb3V0cHV0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBtdWx0aXBseSAgICAgICAgICAgICAgICAgICAgICAgICA6IG11bHRpcGx5LFxuICAgIGdldFRyYW5zbGF0aW9uRnJvbU11bHRpcGxpY2F0aW9uIDogZ2V0VHJhbnNsYXRpb25Gcm9tTXVsdGlwbGljYXRpb24sXG4gICAgaW52ZXJ0ICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBpbnZlcnQsXG4gICAgSURFTlRJVFkgICAgICAgICAgICAgICAgICAgICAgICAgOiBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSksXG4gICAgZ2V0V2Zyb21NdWx0aXBsaWNhdGlvbiAgICAgICAgICAgOiBnZXRXZnJvbU11bHRpcGxpY2F0aW9uLFxuICAgIGFwcGx5VG9WZWN0b3IgICAgICAgICAgICAgICAgICAgIDogYXBwbHlUb1ZlY3RvclxufTsiLCJ2YXIgVmVjMyA9IHJlcXVpcmUoJy4vVmVjMycpO1xuXG4vKipcbiAqIEEgbGlicmFyeSBmb3IgdXNpbmcgYSAzeDMgbnVtZXJpY2FsIG1hdHJpeCwgcmVwcmVzZW50ZWQgYXMgYSB0d28tbGV2ZWwgYXJyYXkuXG4gKlxuICogQGNsYXNzIE1hdHJpeFxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtBcnJheS5BcnJheX0gdmFsdWVzIGFycmF5IG9mIHJvd3NcbiAqL1xuZnVuY3Rpb24gTWF0cml4KHZhbHVlcykge1xuICAgIHRoaXMudmFsdWVzID0gdmFsdWVzIHx8XG4gICAgICAgIFtcbiAgICAgICAgICAgIFsxLDAsMF0sXG4gICAgICAgICAgICBbMCwxLDBdLFxuICAgICAgICAgICAgWzAsMCwxXVxuICAgICAgICBdO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbnZhciBfcmVnaXN0ZXIgPSBuZXcgTWF0cml4KCk7XG52YXIgX3ZlY3RvclJlZ2lzdGVyID0gbmV3IFZlYzMoKTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIHZhbHVlcyBpbiB0aGUgbWF0cml4IGFzIGFuIGFycmF5IG9mIG51bWVyaWNhbCByb3cgYXJyYXlzXG4gKlxuICogQG1ldGhvZCBnZXRcbiAqXG4gKiBAcmV0dXJuIHtBcnJheS5hcnJheX0gbWF0cml4IHZhbHVlcyBhcyBhcnJheSBvZiByb3dzLlxuICovXG5NYXRyaXgucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgbmVzdGVkIGFycmF5IG9mIHJvd3MgaW4gdGhlIG1hdHJpeC5cbiAqXG4gKiBAbWV0aG9kIHNldFxuICpcbiAqIEBwYXJhbSB7QXJyYXkuYXJyYXl9IHZhbHVlcyBtYXRyaXggdmFsdWVzIGFzIGFycmF5IG9mIHJvd3MuXG4gKi9cbk1hdHJpeC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KHZhbHVlcykge1xuICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xufTtcblxuLyoqXG4gKiBUYWtlIHRoaXMgbWF0cml4IGFzIEEsIGlucHV0IHZlY3RvciBWIGFzIGEgY29sdW1uIHZlY3RvciwgYW5kIHJldHVybiBtYXRyaXggcHJvZHVjdCAoQSkoVikuXG4gKiAgIE5vdGU6IFRoaXMgc2V0cyB0aGUgaW50ZXJuYWwgdmVjdG9yIHJlZ2lzdGVyLiAgQ3VycmVudCBoYW5kbGVzIHRvIHRoZSB2ZWN0b3IgcmVnaXN0ZXJcbiAqICAgd2lsbCBzZWUgdmFsdWVzIGNoYW5nZWQuXG4gKlxuICogQG1ldGhvZCB2ZWN0b3JNdWx0aXBseVxuICpcbiAqIEBwYXJhbSB7VmVjdG9yfSB2IGlucHV0IHZlY3RvciBWXG4gKiBAcmV0dXJuIHtWZWN0b3J9IHJlc3VsdCBvZiBtdWx0aXBsaWNhdGlvbiwgYXMgYSBoYW5kbGUgdG8gdGhlIGludGVybmFsIHZlY3RvciByZWdpc3RlclxuICovXG5NYXRyaXgucHJvdG90eXBlLnZlY3Rvck11bHRpcGx5ID0gZnVuY3Rpb24gdmVjdG9yTXVsdGlwbHkodikge1xuICAgIHZhciBNID0gdGhpcy5nZXQoKTtcbiAgICB2YXIgdjAgPSB2Lng7XG4gICAgdmFyIHYxID0gdi55O1xuICAgIHZhciB2MiA9IHYuejtcblxuICAgIHZhciBNMCA9IE1bMF07XG4gICAgdmFyIE0xID0gTVsxXTtcbiAgICB2YXIgTTIgPSBNWzJdO1xuXG4gICAgdmFyIE0wMCA9IE0wWzBdO1xuICAgIHZhciBNMDEgPSBNMFsxXTtcbiAgICB2YXIgTTAyID0gTTBbMl07XG4gICAgdmFyIE0xMCA9IE0xWzBdO1xuICAgIHZhciBNMTEgPSBNMVsxXTtcbiAgICB2YXIgTTEyID0gTTFbMl07XG4gICAgdmFyIE0yMCA9IE0yWzBdO1xuICAgIHZhciBNMjEgPSBNMlsxXTtcbiAgICB2YXIgTTIyID0gTTJbMl07XG5cbiAgICByZXR1cm4gX3ZlY3RvclJlZ2lzdGVyLnNldChcbiAgICAgICAgTTAwKnYwICsgTTAxKnYxICsgTTAyKnYyLFxuICAgICAgICBNMTAqdjAgKyBNMTEqdjEgKyBNMTIqdjIsXG4gICAgICAgIE0yMCp2MCArIE0yMSp2MSArIE0yMip2MlxuICAgICk7XG59O1xuXG4vKipcbiAqIE11bHRpcGx5IHRoZSBwcm92aWRlZCBtYXRyaXggTTIgd2l0aCB0aGlzIG1hdHJpeC4gIFJlc3VsdCBpcyAodGhpcykgKiAoTTIpLlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIG1hdHJpeCByZWdpc3Rlci4gIEN1cnJlbnQgaGFuZGxlcyB0byB0aGUgcmVnaXN0ZXJcbiAqICAgd2lsbCBzZWUgdmFsdWVzIGNoYW5nZWQuXG4gKlxuICogQG1ldGhvZCBtdWx0aXBseVxuICpcbiAqIEBwYXJhbSB7TWF0cml4fSBNMiBpbnB1dCBtYXRyaXggdG8gbXVsdGlwbHkgb24gdGhlIHJpZ2h0XG4gKiBAcmV0dXJuIHtNYXRyaXh9IHJlc3VsdCBvZiBtdWx0aXBsaWNhdGlvbiwgYXMgYSBoYW5kbGUgdG8gdGhlIGludGVybmFsIHJlZ2lzdGVyXG4gKi9cbk1hdHJpeC5wcm90b3R5cGUubXVsdGlwbHkgPSBmdW5jdGlvbiBtdWx0aXBseShNMikge1xuICAgIHZhciBNMSA9IHRoaXMuZ2V0KCk7XG4gICAgdmFyIHJlc3VsdCA9IFtbXV07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgcmVzdWx0W2ldID0gW107XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgMzsgaisrKSB7XG4gICAgICAgICAgICB2YXIgc3VtID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgMzsgaysrKSB7XG4gICAgICAgICAgICAgICAgc3VtICs9IE0xW2ldW2tdICogTTJba11bal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHRbaV1bal0gPSBzdW07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIF9yZWdpc3Rlci5zZXQocmVzdWx0KTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIE1hdHJpeCB3aGljaCBpcyB0aGUgdHJhbnNwb3NlIG9mIHRoaXMgbWF0cml4LlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIG1hdHJpeCByZWdpc3Rlci4gIEN1cnJlbnQgaGFuZGxlcyB0byB0aGUgcmVnaXN0ZXJcbiAqICAgd2lsbCBzZWUgdmFsdWVzIGNoYW5nZWQuXG4gKlxuICogQG1ldGhvZCB0cmFuc3Bvc2VcbiAqXG4gKiBAcmV0dXJuIHtNYXRyaXh9IHJlc3VsdCBvZiB0cmFuc3Bvc2UsIGFzIGEgaGFuZGxlIHRvIHRoZSBpbnRlcm5hbCByZWdpc3RlclxuICovXG5NYXRyaXgucHJvdG90eXBlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uIHRyYW5zcG9zZSgpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIE0gPSB0aGlzLmdldCgpO1xuICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IDM7IHJvdysrKSB7XG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IDM7IGNvbCsrKSB7XG4gICAgICAgICAgICByZXN1bHRbcm93XVtjb2xdID0gTVtjb2xdW3Jvd107XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIF9yZWdpc3Rlci5zZXQocmVzdWx0KTtcbn07XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBtYXRyaXhcbiAqXG4gKiBAbWV0aG9kIGNsb25lXG4gKiBAcmV0dXJuIHtNYXRyaXh9IE5ldyBjb3B5IG9mIHRoZSBvcmlnaW5hbCBtYXRyaXhcbiAqL1xuTWF0cml4LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKCkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldCgpO1xuICAgIHZhciBNID0gW107XG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgMzsgcm93KyspXG4gICAgICAgIE1bcm93XSA9IHZhbHVlc1tyb3ddLnNsaWNlKCk7XG4gICAgcmV0dXJuIG5ldyBNYXRyaXgoTSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hdHJpeDtcbiIsInZhciBNYXRyaXggPSByZXF1aXJlKCcuL01hdDMzJyk7XG52YXIgVmVjMyA9IHJlcXVpcmUoJy4vVmVjMycpO1xuXG4vKipcbiAqIEBjbGFzcyBRdWF0ZXJuaW9uXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gd1xuICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gKiBAcGFyYW0ge051bWJlcn0gelxuICovXG5mdW5jdGlvbiBRdWF0ZXJuaW9uKHcseCx5LHopIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkgdGhpcy5zZXQodyk7XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMudyA9ICh3ICE9PSB1bmRlZmluZWQpID8gdyA6IDE7ICAvL0FuZ2xlXG4gICAgICAgIHRoaXMueCA9ICh4ICE9PSB1bmRlZmluZWQpID8geCA6IDA7ICAvL0F4aXMueFxuICAgICAgICB0aGlzLnkgPSAoeSAhPT0gdW5kZWZpbmVkKSA/IHkgOiAwOyAgLy9BeGlzLnlcbiAgICAgICAgdGhpcy56ID0gKHogIT09IHVuZGVmaW5lZCkgPyB6IDogMDsgIC8vQXhpcy56XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufVxuXG52YXIgcmVnaXN0ZXIgPSBuZXcgUXVhdGVybmlvbigxLDAsMCwwKTtcblxuLyoqXG4gKiBEb2M6IFRPRE9cbiAqIEBtZXRob2QgYWRkXG4gKiBAcGFyYW0ge1F1YXRlcm5pb259IHFcbiAqIEByZXR1cm4ge1F1YXRlcm5pb259XG4gKi9cblF1YXRlcm5pb24ucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZChxKSB7XG4gICAgcmV0dXJuIHJlZ2lzdGVyLnNldFdYWVooXG4gICAgICAgIHRoaXMudyArIHEudyxcbiAgICAgICAgdGhpcy54ICsgcS54LFxuICAgICAgICB0aGlzLnkgKyBxLnksXG4gICAgICAgIHRoaXMueiArIHEuelxuICAgICk7XG59O1xuXG4vKlxuICogRG9jczogVE9ET1xuICpcbiAqIEBtZXRob2Qgc3ViXG4gKiBAcGFyYW0ge1F1YXRlcm5pb259IHFcbiAqIEByZXR1cm4ge1F1YXRlcm5pb259XG4gKi9cblF1YXRlcm5pb24ucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uIHN1YihxKSB7XG4gICAgcmV0dXJuIHJlZ2lzdGVyLnNldFdYWVooXG4gICAgICAgIHRoaXMudyAtIHEudyxcbiAgICAgICAgdGhpcy54IC0gcS54LFxuICAgICAgICB0aGlzLnkgLSBxLnksXG4gICAgICAgIHRoaXMueiAtIHEuelxuICAgICk7XG59O1xuXG4vKipcbiAqIERvYzogVE9ET1xuICpcbiAqIEBtZXRob2Qgc2NhbGFyRGl2aWRlXG4gKiBAcGFyYW0ge051bWJlcn0gc1xuICogQHJldHVybiB7UXVhdGVybmlvbn1cbiAqL1xuUXVhdGVybmlvbi5wcm90b3R5cGUuc2NhbGFyRGl2aWRlID0gZnVuY3Rpb24gc2NhbGFyRGl2aWRlKHMpIHtcbiAgICByZXR1cm4gdGhpcy5zY2FsYXJNdWx0aXBseSgxL3MpO1xufTtcblxuLypcbiAqIERvY3M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIHNjYWxhck11bHRpcGx5XG4gKiBAcGFyYW0ge051bWJlcn0gc1xuICogQHJldHVybiB7UXVhdGVybmlvbn1cbiAqL1xuUXVhdGVybmlvbi5wcm90b3R5cGUuc2NhbGFyTXVsdGlwbHkgPSBmdW5jdGlvbiBzY2FsYXJNdWx0aXBseShzKSB7XG4gICAgcmV0dXJuIHJlZ2lzdGVyLnNldFdYWVooXG4gICAgICAgIHRoaXMudyAqIHMsXG4gICAgICAgIHRoaXMueCAqIHMsXG4gICAgICAgIHRoaXMueSAqIHMsXG4gICAgICAgIHRoaXMueiAqIHNcbiAgICApO1xufTtcblxuLypcbiAqIERvY3M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIG11bHRpcGx5XG4gKiBAcGFyYW0ge1F1YXRlcm5pb259IHFcbiAqIEByZXR1cm4ge1F1YXRlcm5pb259XG4gKi9cblF1YXRlcm5pb24ucHJvdG90eXBlLm11bHRpcGx5ID0gZnVuY3Rpb24gbXVsdGlwbHkocSkge1xuICAgIC8vbGVmdC1oYW5kZWQgY29vcmRpbmF0ZSBzeXN0ZW0gbXVsdGlwbGljYXRpb25cbiAgICB2YXIgeDEgPSB0aGlzLng7XG4gICAgdmFyIHkxID0gdGhpcy55O1xuICAgIHZhciB6MSA9IHRoaXMuejtcbiAgICB2YXIgdzEgPSB0aGlzLnc7XG4gICAgdmFyIHgyID0gcS54O1xuICAgIHZhciB5MiA9IHEueTtcbiAgICB2YXIgejIgPSBxLno7XG4gICAgdmFyIHcyID0gcS53IHx8IDA7XG5cbiAgICByZXR1cm4gcmVnaXN0ZXIuc2V0V1hZWihcbiAgICAgICAgdzEqdzIgLSB4MSp4MiAtIHkxKnkyIC0gejEqejIsXG4gICAgICAgIHgxKncyICsgeDIqdzEgKyB5Mip6MSAtIHkxKnoyLFxuICAgICAgICB5MSp3MiArIHkyKncxICsgeDEqejIgLSB4Mip6MSxcbiAgICAgICAgejEqdzIgKyB6Mip3MSArIHgyKnkxIC0geDEqeTJcbiAgICApO1xufTtcblxudmFyIGNvbmogPSBuZXcgUXVhdGVybmlvbigxLDAsMCwwKTtcblxuLypcbiAqIERvY3M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIHJvdGF0ZVZlY3RvclxuICogQHBhcmFtIHtWZWN0b3J9IHZcbiAqIEByZXR1cm4ge1F1YXRlcm5pb259XG4gKi9cblF1YXRlcm5pb24ucHJvdG90eXBlLnJvdGF0ZVZlY3RvciA9IGZ1bmN0aW9uIHJvdGF0ZVZlY3Rvcih2KSB7XG4gICAgY29uai5zZXQodGhpcy5jb25qKCkpO1xuICAgIHJldHVybiByZWdpc3Rlci5zZXQodGhpcy5tdWx0aXBseSh2KS5tdWx0aXBseShjb25qKSk7XG59O1xuXG4vKlxuICogRG9jczogVE9ET1xuICpcbiAqIEBtZXRob2QgaW52ZXJzZVxuICogQHJldHVybiB7UXVhdGVybmlvbn1cbiAqL1xuUXVhdGVybmlvbi5wcm90b3R5cGUuaW52ZXJzZSA9IGZ1bmN0aW9uIGludmVyc2UoKSB7XG4gICAgcmV0dXJuIHJlZ2lzdGVyLnNldCh0aGlzLmNvbmooKS5zY2FsYXJEaXZpZGUodGhpcy5ub3JtU3F1YXJlZCgpKSk7XG59O1xuXG4vKlxuICogRG9jczogVE9ET1xuICpcbiAqIEBtZXRob2QgbmVnYXRlXG4gKiBAcmV0dXJuIHtRdWF0ZXJuaW9ufVxuICovXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5uZWdhdGUgPSBmdW5jdGlvbiBuZWdhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NhbGFyTXVsdGlwbHkoLTEpO1xufTtcblxuLypcbiAqIERvY3M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIGNvbmpcbiAqIEByZXR1cm4ge1F1YXRlcm5pb259XG4gKi9cblF1YXRlcm5pb24ucHJvdG90eXBlLmNvbmogPSBmdW5jdGlvbiBjb25qKCkge1xuICAgIHJldHVybiByZWdpc3Rlci5zZXRXWFlaKFxuICAgICAgICAgdGhpcy53LFxuICAgICAgICAtdGhpcy54LFxuICAgICAgICAtdGhpcy55LFxuICAgICAgICAtdGhpcy56XG4gICAgKTtcbn07XG5cbi8qXG4gKiBEb2NzOiBUT0RPXG4gKlxuICogQG1ldGhvZCBub3JtYWxpemVcbiAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGhcbiAqIEByZXR1cm4ge1F1YXRlcm5pb259XG4gKi9cblF1YXRlcm5pb24ucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uIG5vcm1hbGl6ZShsZW5ndGgpIHtcbiAgICBsZW5ndGggPSAobGVuZ3RoID09PSB1bmRlZmluZWQpID8gMSA6IGxlbmd0aDtcbiAgICByZXR1cm4gdGhpcy5zY2FsYXJEaXZpZGUobGVuZ3RoICogdGhpcy5ub3JtKCkpO1xufTtcblxuLypcbiAqIERvY3M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIG1ha2VGcm9tQW5nbGVBbmRBeGlzXG4gKiBAcGFyYW0ge051bWJlcn0gYW5nbGVcbiAqIEBwYXJhbSB7VmVjdG9yfSB2XG4gKiBAcmV0dXJuIHtRdWF0ZXJuaW9ufVxuICovXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5tYWtlRnJvbUFuZ2xlQW5kQXhpcyA9IGZ1bmN0aW9uIG1ha2VGcm9tQW5nbGVBbmRBeGlzKGFuZ2xlLCB2KSB7XG4gICAgLy9sZWZ0IGhhbmRlZCBxdWF0ZXJuaW9uIGNyZWF0aW9uOiB0aGV0YSAtPiAtdGhldGFcbiAgICB2YXIgbiAgPSB2Lm5vcm1hbGl6ZSgpO1xuICAgIHZhciBoYSA9IGFuZ2xlKjAuNTtcbiAgICB2YXIgcyAgPSAtTWF0aC5zaW4oaGEpO1xuICAgIHRoaXMueCA9IHMqbi54O1xuICAgIHRoaXMueSA9IHMqbi55O1xuICAgIHRoaXMueiA9IHMqbi56O1xuICAgIHRoaXMudyA9IE1hdGguY29zKGhhKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBEb2NzOiBUT0RPXG4gKlxuICogQG1ldGhvZCBzZXRXWFlaXG4gKiBAcGFyYW0ge051bWJlcn0gd1xuICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gKiBAcGFyYW0ge051bWJlcn0gelxuICogQHJldHVybiB7UXVhdGVybmlvbn1cbiAqL1xuUXVhdGVybmlvbi5wcm90b3R5cGUuc2V0V1hZWiA9IGZ1bmN0aW9uIHNldFdYWVoodyx4LHkseikge1xuICAgIHJlZ2lzdGVyLmNsZWFyKCk7XG4gICAgdGhpcy53ID0gdztcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy56ID0gejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBEb2NzOiBUT0RPXG4gKlxuICogQG1ldGhvZCBzZXRcbiAqIEBwYXJhbSB7QXJyYXl8UXVhdGVybmlvbn0gdlxuICogQHJldHVybiB7UXVhdGVybmlvbn1cbiAqL1xuUXVhdGVybmlvbi5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KHYpIHtcbiAgICBpZiAodiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIHRoaXMudyA9IDA7XG4gICAgICAgIHRoaXMueCA9IHZbMF07XG4gICAgICAgIHRoaXMueSA9IHZbMV07XG4gICAgICAgIHRoaXMueiA9IHZbMl07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLncgPSB2Lnc7XG4gICAgICAgIHRoaXMueCA9IHYueDtcbiAgICAgICAgdGhpcy55ID0gdi55O1xuICAgICAgICB0aGlzLnogPSB2Lno7XG4gICAgfVxuICAgIGlmICh0aGlzICE9PSByZWdpc3RlcikgcmVnaXN0ZXIuY2xlYXIoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRG9jczogVE9ET1xuICpcbiAqIEBtZXRob2QgcHV0XG4gKiBAcGFyYW0ge1F1YXRlcm5pb259IHFcbiAqIEByZXR1cm4ge1F1YXRlcm5pb259XG4gKi9cblF1YXRlcm5pb24ucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uIHB1dChxKSB7XG4gICAgcS5zZXQocmVnaXN0ZXIpO1xufTtcblxuLyoqXG4gKiBEb2M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIGNsb25lXG4gKiBAcmV0dXJuIHtRdWF0ZXJuaW9ufVxuICovXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKCkge1xuICAgIHJldHVybiBuZXcgUXVhdGVybmlvbih0aGlzKTtcbn07XG5cbi8qKlxuICogRG9jOiBUT0RPXG4gKlxuICogQG1ldGhvZCBjbGVhclxuICogQHJldHVybiB7UXVhdGVybmlvbn1cbiAqL1xuUXVhdGVybmlvbi5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICB0aGlzLncgPSAxO1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgICB0aGlzLnogPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEb2M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIGlzRXF1YWxcbiAqIEBwYXJhbSB7UXVhdGVybmlvbn0gcVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuUXVhdGVybmlvbi5wcm90b3R5cGUuaXNFcXVhbCA9IGZ1bmN0aW9uIGlzRXF1YWwocSkge1xuICAgIHJldHVybiBxLncgPT09IHRoaXMudyAmJiBxLnggPT09IHRoaXMueCAmJiBxLnkgPT09IHRoaXMueSAmJiBxLnogPT09IHRoaXMuejtcbn07XG5cbi8qKlxuICogRG9jOiBUT0RPXG4gKlxuICogQG1ldGhvZCBkb3RcbiAqIEBwYXJhbSB7UXVhdGVybmlvbn0gcVxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5kb3QgPSBmdW5jdGlvbiBkb3QocSkge1xuICAgIHJldHVybiB0aGlzLncgKiBxLncgKyB0aGlzLnggKiBxLnggKyB0aGlzLnkgKiBxLnkgKyB0aGlzLnogKiBxLno7XG59O1xuXG4vKipcbiAqIERvYzogVE9ET1xuICpcbiAqIEBtZXRob2Qgbm9ybVNxdWFyZWRcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuUXVhdGVybmlvbi5wcm90b3R5cGUubm9ybVNxdWFyZWQgPSBmdW5jdGlvbiBub3JtU3F1YXJlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5kb3QodGhpcyk7XG59O1xuXG4vKipcbiAqIERvYzogVE9ET1xuICpcbiAqIEBtZXRob2Qgbm9ybVxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5ub3JtID0gZnVuY3Rpb24gbm9ybSgpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMubm9ybVNxdWFyZWQoKSk7XG59O1xuXG4vKipcbiAqIERvYzogVE9ET1xuICpcbiAqIEBtZXRob2QgaXNaZXJvXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5pc1plcm8gPSBmdW5jdGlvbiBpc1plcm8oKSB7XG4gICAgcmV0dXJuICEodGhpcy54IHx8IHRoaXMueSB8fCB0aGlzLnopO1xufTtcblxuLyoqXG4gKiBEb2M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIGdldFRyYW5zZm9ybVxuICogQHJldHVybiB7VHJhbnNmb3JtfVxuICovXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5nZXRUcmFuc2Zvcm0gPSBmdW5jdGlvbiBnZXRUcmFuc2Zvcm0oKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLm5vcm1hbGl6ZSgxKTtcbiAgICB2YXIgeCA9IHRlbXAueDtcbiAgICB2YXIgeSA9IHRlbXAueTtcbiAgICB2YXIgeiA9IHRlbXAuejtcbiAgICB2YXIgdyA9IHRlbXAudztcblxuICAgIC8vTEhDIHN5c3RlbSBmbGF0dGVuZWQgdG8gY29sdW1uIG1ham9yID0gUkhDIGZsYXR0ZW5lZCB0byByb3cgbWFqb3JcbiAgICByZXR1cm4gW1xuICAgICAgICAxIC0gMip5KnkgLSAyKnoqeixcbiAgICAgICAgICAgIDIqeCp5IC0gMip6KncsXG4gICAgICAgICAgICAyKngqeiArIDIqeSp3LFxuICAgICAgICAwLFxuICAgICAgICAgICAgMip4KnkgKyAyKnoqdyxcbiAgICAgICAgMSAtIDIqeCp4IC0gMip6KnosXG4gICAgICAgICAgICAyKnkqeiAtIDIqeCp3LFxuICAgICAgICAwLFxuICAgICAgICAgICAgMip4KnogLSAyKnkqdyxcbiAgICAgICAgICAgIDIqeSp6ICsgMip4KncsXG4gICAgICAgIDEgLSAyKngqeCAtIDIqeSp5LFxuICAgICAgICAwLFxuICAgICAgICAwLFxuICAgICAgICAwLFxuICAgICAgICAwLFxuICAgICAgICAxXG4gICAgXTtcbn07XG5cbnZhciBtYXRyaXhSZWdpc3RlciA9IG5ldyBNYXRyaXgoKTtcblxuLyoqXG4gKiBEb2M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIGdldE1hdHJpeFxuICogQHJldHVybiB7VHJhbnNmb3JtfVxuICovXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5nZXRNYXRyaXggPSBmdW5jdGlvbiBnZXRNYXRyaXgoKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLm5vcm1hbGl6ZSgxKTtcbiAgICB2YXIgeCA9IHRlbXAueDtcbiAgICB2YXIgeSA9IHRlbXAueTtcbiAgICB2YXIgeiA9IHRlbXAuejtcbiAgICB2YXIgdyA9IHRlbXAudztcblxuICAgIC8vTEhDIHN5c3RlbSBmbGF0dGVuZWQgdG8gcm93IG1ham9yXG4gICAgcmV0dXJuIG1hdHJpeFJlZ2lzdGVyLnNldChbXG4gICAgICAgIFtcbiAgICAgICAgICAgIDEgLSAyKnkqeSAtIDIqeip6LFxuICAgICAgICAgICAgICAgIDIqeCp5ICsgMip6KncsXG4gICAgICAgICAgICAgICAgMip4KnogLSAyKnkqd1xuICAgICAgICBdLFxuICAgICAgICBbXG4gICAgICAgICAgICAgICAgMip4KnkgLSAyKnoqdyxcbiAgICAgICAgICAgIDEgLSAyKngqeCAtIDIqeip6LFxuICAgICAgICAgICAgICAgIDIqeSp6ICsgMip4KndcbiAgICAgICAgXSxcbiAgICAgICAgW1xuICAgICAgICAgICAgICAgIDIqeCp6ICsgMip5KncsXG4gICAgICAgICAgICAgICAgMip5KnogLSAyKngqdyxcbiAgICAgICAgICAgIDEgLSAyKngqeCAtIDIqeSp5XG4gICAgICAgIF1cbiAgICBdKTtcbn07XG5cbnZhciBlcHNpbG9uID0gMWUtNTtcblxuLyoqXG4gKiBEb2M6IFRPRE9cbiAqXG4gKiBAbWV0aG9kIHNsZXJwXG4gKiBAcGFyYW0ge1F1YXRlcm5pb259IHFcbiAqIEBwYXJhbSB7TnVtYmVyfSB0XG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19XG4gKi9cblF1YXRlcm5pb24ucHJvdG90eXBlLnNsZXJwID0gZnVuY3Rpb24gc2xlcnAocSwgdCkge1xuICAgIHZhciBvbWVnYTtcbiAgICB2YXIgY29zb21lZ2E7XG4gICAgdmFyIHNpbm9tZWdhO1xuICAgIHZhciBzY2FsZUZyb207XG4gICAgdmFyIHNjYWxlVG87XG5cbiAgICBjb3NvbWVnYSA9IHRoaXMuZG90KHEpO1xuICAgIGlmICgoMS4wIC0gY29zb21lZ2EpID4gZXBzaWxvbikge1xuICAgICAgICBvbWVnYSAgICAgICA9IE1hdGguYWNvcyhjb3NvbWVnYSk7XG4gICAgICAgIHNpbm9tZWdhICAgID0gTWF0aC5zaW4ob21lZ2EpO1xuICAgICAgICBzY2FsZUZyb20gICA9IE1hdGguc2luKCgxLjAgLSB0KSAqIG9tZWdhKSAvIHNpbm9tZWdhO1xuICAgICAgICBzY2FsZVRvICAgICA9IE1hdGguc2luKHQgKiBvbWVnYSkgLyBzaW5vbWVnYTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNjYWxlRnJvbSAgID0gMS4wIC0gdDtcbiAgICAgICAgc2NhbGVUbyAgICAgPSB0O1xuICAgIH1cbiAgICByZXR1cm4gcmVnaXN0ZXIuc2V0KHRoaXMuc2NhbGFyTXVsdGlwbHkoc2NhbGVGcm9tL3NjYWxlVG8pLmFkZChxKS5tdWx0aXBseShzY2FsZVRvKSk7XG59O1xuXG52YXIgY2xhbXAgPSBmdW5jdGlvbiAoIHgsIGEsIGIgKSB7XG4gICAgcmV0dXJuICggeCA8IGEgKSA/IGEgOiAoICggeCA+IGIgKSA/IGIgOiB4ICk7XG59XG5cblF1YXRlcm5pb24ucHJvdG90eXBlLnRvRXVsZXJYWVogPSBmdW5jdGlvbiB0b0V1bGVyWFlaKCkge1xuXG4gICAgcSA9IHRoaXMubm9ybWFsaXplKCk7XG5cbiAgICB2YXIgc3F4ID0gcS54ICogcS54O1xuICAgIHZhciBzcXkgPSBxLnkgKiBxLnk7XG4gICAgdmFyIHNxeiA9IHEueiAqIHEuejtcbiAgICB2YXIgc3F3ID0gcS53ICogcS53O1xuXG5cbiAgICByZXR1cm4gbmV3IFZlYzMoXG4gICAgICAgIE1hdGguYXRhbjIoIDIgKiAoIHEueCAqIHEudyAtIHEueSAqIHEueiApLCAoIHNxdyAtIHNxeCAtIHNxeSArIHNxeiApICksXG4gICAgICAgIE1hdGguYXNpbiggIGNsYW1wKCAyICogKCBxLnggKiBxLnogKyBxLnkgKiBxLncgKSwgLSAxLCAxICkgKSxcbiAgICAgICAgTWF0aC5hdGFuMiggMiAqICggcS56ICogcS53IC0gcS54ICogcS55ICksICggc3F3ICsgc3F4IC0gc3F5IC0gc3F6ICkgKVxuICAgICk7XG59O1xuXG5RdWF0ZXJuaW9uLnByb3RvdHlwZS5mcm9tRXVsZXJYWVogPSBmdW5jdGlvbiBmcm9tRXVsZXJYWVooYW5nbGUpIHtcbiAgICB2YXIgc3ggPSBzaW4oYW5nbGUueC8yKTtcbiAgICB2YXIgc3kgPSBzaW4oYW5nbGUueS8yKTtcbiAgICB2YXIgc3ogPSBzaW4oYW5nbGUuei8yKTtcbiAgICB2YXIgY3ggPSBjb3MoYW5nbGUueC8yKTtcbiAgICB2YXIgY3kgPSBjb3MoYW5nbGUueS8yKTtcbiAgICB2YXIgY3ogPSBjb3MoYW5nbGUuei8yKTtcblxuICAgIHRoaXMudyA9IGN4KmN5KmN6ICsgc3gqc3kqc3o7XG4gICAgdGhpcy54ID0gc3gqY3kqY3ogLSBjeCpzeSpzejtcbiAgICB0aGlzLnkgPSBjeCpzeSpjeiArIHN4KmN5KnN6O1xuICAgIHRoaXMueiA9IGN4KmN5KnN6IC0gc3gqc3kqY3o7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUXVhdGVybmlvbjtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IHdpbGxAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmVjMyA9IGZ1bmN0aW9uKHgseSx6KXtcbiAgICBpZiAoeCBpbnN0YW5jZW9mIEFycmF5IHx8IHggaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcbiAgICAgICAgdGhpcy54ID0geFswXSB8fCAwO1xuICAgICAgICB0aGlzLnkgPSB4WzFdIHx8IDA7XG4gICAgICAgIHRoaXMueiA9IHhbMl0gfHwgMDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHggfHwgMDtcbiAgICAgICAgdGhpcy55ID0geSB8fCAwO1xuICAgICAgICB0aGlzLnogPSB6IHx8IDA7XG4gICAgfVxufTtcblxudmFyIHJlZ2lzdGVyID0gbmV3IFZlYzMoKTtcblxuVmVjMy56ZXJvID0gbmV3IFZlYzMoMCwgMCwgMCk7XG5cblZlYzMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCh4LHkseikge1xuICAgIGlmICh4ICE9PSB1bmRlZmluZWQpIHRoaXMueCA9IHg7XG4gICAgaWYgKHkgIT09IHVuZGVmaW5lZCkgdGhpcy55ID0geTtcbiAgICBpZiAoeiAhPT0gdW5kZWZpbmVkKSB0aGlzLnogPSB6O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkKHYpIHtcbiAgICB0aGlzLnggKz0gdi54O1xuICAgIHRoaXMueSArPSB2Lnk7XG4gICAgdGhpcy56ICs9IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLnN1YnRyYWN0ID0gZnVuY3Rpb24gc3VidHJhY3Qodikge1xuICAgIHRoaXMueCAtPSB2Lng7XG4gICAgdGhpcy55IC09IHYueTtcbiAgICB0aGlzLnogLT0gdi56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUucm90YXRlWCA9IGZ1bmN0aW9uIHJvdGF0ZVgodGhldGEpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnkgPSB5ICogY29zVGhldGEgLSB6ICogc2luVGhldGE7XG4gICAgdGhpcy56ID0geSAqIHNpblRoZXRhICsgeiAqIGNvc1RoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5yb3RhdGVZID0gZnVuY3Rpb24gcm90YXRlWSh0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHRoaXMueCA9IHogKiBzaW5UaGV0YSArIHggKiBjb3NUaGV0YTtcbiAgICB0aGlzLnogPSB6ICogY29zVGhldGEgLSB4ICogc2luVGhldGE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLnJvdGF0ZVogPSBmdW5jdGlvbiByb3RhdGVaKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy54ID0gICB4ICogY29zVGhldGEgLSB5ICogc2luVGhldGE7XG4gICAgdGhpcy55ID0gICB4ICogc2luVGhldGEgKyB5ICogY29zVGhldGE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLnJvdGF0ZVggPSBmdW5jdGlvbiByb3RhdGVYKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy55ID0geSAqIGNvc1RoZXRhIC0geiAqIHNpblRoZXRhO1xuICAgIHRoaXMueiA9IHkgKiBzaW5UaGV0YSArIHogKiBjb3NUaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUucm90YXRlWSA9IGZ1bmN0aW9uIHJvdGF0ZVkodGhldGEpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnggPSB6ICogc2luVGhldGEgKyB4ICogY29zVGhldGE7XG4gICAgdGhpcy56ID0geiAqIGNvc1RoZXRhIC0geCAqIHNpblRoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5yb3RhdGVaID0gZnVuY3Rpb24gcm90YXRlWih0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHRoaXMueCA9ICAgeCAqIGNvc1RoZXRhIC0geSAqIHNpblRoZXRhO1xuICAgIHRoaXMueSA9ICAgeCAqIHNpblRoZXRhICsgeSAqIGNvc1RoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHMpIHtcbiAgICBpZiAocyBpbnN0YW5jZW9mIFZlYzMpIHtcbiAgICAgICAgdGhpcy54ICo9IHMueDtcbiAgICAgICAgdGhpcy55ICo9IHMueTtcbiAgICAgICAgdGhpcy56ICo9IHMuejtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnggKj0gcztcbiAgICAgICAgdGhpcy55ICo9IHM7XG4gICAgICAgIHRoaXMueiAqPSBzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLmludmVydCA9IGZ1bmN0aW9uIGludmVydCgpIHtcbiAgICB0aGlzLnggKj0gLTE7XG4gICAgdGhpcy55ICo9IC0xO1xuICAgIHRoaXMueiAqPSAtMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuVmVjMy5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwKGZuKSB7XG4gICAgdGhpcy54ID0gZm4odGhpcy54KTtcbiAgICB0aGlzLnkgPSBmbih0aGlzLnkpO1xuICAgIHRoaXMueiA9IGZuKHRoaXMueik7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uIGxlbmd0aCgpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeik7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSh2KSB7XG4gICAgdGhpcy54ID0gdi54O1xuICAgIHRoaXMueSA9IHYueTtcbiAgICB0aGlzLnogPSB2Lno7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIGNsZWFyKHYpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gICAgdGhpcy56ID0gMDtcbn07XG5cblZlYzMucHJvdG90eXBlLmlzWmVybyA9IGZ1bmN0aW9uIGlzWmVybygpIHtcbiAgICBpZiAodGhpcy54ICE9PSAwIHx8IHRoaXMueSAhPT0gMCB8fCB0aGlzLnogIT09IDApIHJldHVybiBmYWxzZTtcbiAgICBlbHNlIHJldHVybiB0cnVlO1xufTtcblxuVmVjMy5wcm90b3R5cGUuaXNFcXVhbCA9IGZ1bmN0aW9uIGlzRXF1YWwodikge1xuICAgIGlmICh0aGlzLnggIT09IHYueCB8fCB0aGlzLnkgIT09IHYueSB8fCB0aGlzLnogIT09IHYueikgcmV0dXJuIGZhbHNlO1xuICAgIGVsc2UgcmV0dXJuIHRydWU7XG59O1xuXG5WZWMzLnByb3RvdHlwZS50b1ZhbHVlID0gZnVuY3Rpb24gdG9WYWx1ZSgpIHtcbiAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnpdO1xufTtcblxuVmVjMy5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24gbm9ybWFsaXplKCkge1xuICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xuXG4gICAgdGhpcy54ID0gdGhpcy54IC8gbGVuZ3RoO1xuICAgIHRoaXMueSA9IHRoaXMueSAvIGxlbmd0aDtcbiAgICB0aGlzLnogPSB0aGlzLnogLyBsZW5ndGg7XG59O1xuXG5WZWMzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uIG5vcm1hbGl6ZSh2KSB7XG4gICAgdmFyIGxlbmd0aCA9IHYubGVuZ3RoKCk7XG4gICAgcmV0dXJuIHJlZ2lzdGVyLnNldCh2LngvbGVuZ3RoLCB2LnkvbGVuZ3RoLCB2LnovbGVuZ3RoKTtcbn07XG5cblZlYzMuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSh2KSB7XG4gICAgcmV0dXJuIHJlZ2lzdGVyLnNldCh2LngsIHYueSwgdi56KTtcbn07XG5cblZlYzMuYWRkID0gZnVuY3Rpb24gYWRkKHYxLCB2Mikge1xuICAgIHZhciB4ID0gdjEueCArIHYyLng7XG4gICAgdmFyIHkgPSB2MS55ICsgdjIueTtcbiAgICB2YXIgeiA9IHYxLnogKyB2Mi56O1xuICAgIHJldHVybiByZWdpc3Rlci5zZXQoeCx5LHopO1xufTtcblxuVmVjMy5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYxLCB2Mikge1xuICAgIHZhciB4ID0gdjEueCAtIHYyLng7XG4gICAgdmFyIHkgPSB2MS55IC0gdjIueTtcbiAgICB2YXIgeiA9IHYxLnogLSB2Mi56O1xuICAgIHJldHVybiByZWdpc3Rlci5zZXQoeCx5LHopO1xufTtcblxuVmVjMy5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHYsIHMpIHtcbiAgICB2YXIgeCA9IHYueCAqIHM7XG4gICAgdmFyIHkgPSB2LnkgKiBzO1xuICAgIHZhciB6ID0gdi56ICogcztcbiAgICByZXR1cm4gcmVnaXN0ZXIuc2V0KHgseSx6KTtcbn07XG5cblZlYzMuZG90UHJvZHVjdCA9IGZ1bmN0aW9uIGRvdFByb2R1Y3QodjEsIHYyKSB7XG4gICAgcmV0dXJuIHYxLnggKiB2Mi54ICsgdjEueSAqIHYyLnkgKyB2MS56ICogdjIuejtcbn07XG5cblZlYzMuY3Jvc3NQcm9kdWN0ID0gZnVuY3Rpb24gY3Jvc3NQcm9kdWN0KHYxLCB2Mikge1xuICAgIHJldHVybiByZWdpc3Rlci5zZXQodjEueSAqIHYyLnogLSB2MS56ICogdjIueSwgdjEueiAqIHYyLnggLSB2MS54ICogdjIueiwgdjEueCAqIHYyLnkgLSB2MS55ICogdjIueCk7XG59O1xuXG5WZWMzLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyh2MSwgdjIpIHtcbiAgICByZXR1cm4gdjEueCA9PT0gdjIueCAmJiB2MS55ID09PSB2Mi55ICYmIHYxLnogPT09IHYyLno7XG59O1xuXG5WZWMzLnByb2plY3QgPSBmdW5jdGlvbiBwcm9qZWN0KHYxLCB2Mikge1xuICAgIHJldHVybiBWZWMzLm5vcm1hbGl6ZSh2Mikuc2NhbGUoVmVjMy5kb3RQcm9kdWN0KHYxLCB2MikpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZlYzM7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBhZGFtQGZhbW8udXMsIHdpbGxAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jb3JlL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgQm9keSA9IHJlcXVpcmUoJy4vYm9kaWVzL0JvZHknKTtcbnZhciBWZWMzID0gcmVxdWlyZSgnLi4vbWF0aC9WZWMzJyk7XG52YXIgUGh5c2ljc1N5c3RlbSA9IHJlcXVpcmUoJy4vUGh5c2ljc1N5c3RlbScpO1xudmFyIEVudGl0eSA9IHJlcXVpcmUoJy4uL2NvcmUvRW50aXR5Jyk7XG5cbi8qKlxuICogQ29tcG9uZW5ldCB0byBhdHRhY2ggYSBib2R5IHRvIGVudGl0eVxuICpcbiAqIEBjbGFzcyBQaHlzaWNzQ29tcG9uZW50XG4gKiBAaW1wbGVtZW50cyBDb21wb25lbnRcbiAqIEBwYXJhbSB7TnVtYmVyfSBlbnRpdHlJZCBpZCBvZiB0aGUgZW50aXR5XG4gKiBAcGFyYW0ge09iamVjdH0gaW5zdGFudGlhbGl6YXRpb24gb3B0aW9ucyBmb3IgdGhlIGJvZHlcbiAqL1xuZnVuY3Rpb24gUGh5c2ljc0NvbXBvbmVudChlbnRpdHlPcklkLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGVudGl0eTtcbiAgICBpZiAoISh0eXBlb2YgZW50aXR5T3JJZCA9PT0gRW50aXR5KSkge1xuICAgICAgICBlbnRpdHkgPSBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkoZW50aXR5T3JJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZW50aXR5ID0gZW50aXR5T3JJZDtcbiAgICB9XG4gICAgdGhpcy5fZW50aXR5VHJhbnNmb3JtID0gZW50aXR5LmdldENvbXBvbmVudCgndHJhbnNmb3JtJyk7XG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIoZW50aXR5LCAnQm9kaWVzJyk7XG5cbiAgICB0aGlzLl9jYWNoZWRQb3NpdGlvbiA9IG5ldyBWZWMzKCk7XG4gICAgdGhpcy5fY2FjaGVkUm90YXRpb24gPSBuZXcgVmVjMygpO1xuICAgIHRoaXMuX3Bvc2l0aW9uRGlmZiA9IG5ldyBWZWMzKCk7XG4gICAgdGhpcy5fZXVsZXJEaWZmID0gbmV3IFZlYzMoKTtcblxuICAgIHRoaXMuYm9keSA9IG9wdGlvbnMuYm9keSB8fCBuZXcgQm9keShvcHRpb25zKTtcblxuICAgIFBoeXNpY3NTeXN0ZW0uYWRkQm9keSh0aGlzLmJvZHkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgbmFtZSBvZiBjbGFzcyBmb3IgZW50aXR5IHJlZ2lzdHJ5XG4gKlxuICogQG1ldGhvZCBQaHlzaWNzQ29tcG9uZW50LnRvU3RyaW5nXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBwaHlzaWNzQ29tcG9uZW50XG4gKi9cblBoeXNpY3NDb21wb25lbnQudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpe1xuICAgIHJldHVybiAncGh5c2ljc0NvbXBvbmVudCc7XG59O1xuXG4vKipcbiAqIENsYW1wcyBpbnB1dCB2ZWN0b3IgdG8gdGhlIHRlbnRocyBwbGFjZVxuICogQHByaXZhdGUgX2NsYW1wXG4gKiBAcGFyYW0ge1ZlYzN9XG4gKiBAcmV0dXJucyB7VmVjM31cbiAqL1xuZnVuY3Rpb24gX2NsYW1wKHZlYzMpIHtcbiAgICByZXR1cm4gbmV3IFZlYzMoKDEwICogdmVjMy54IDw8IDApICogMC4xLFxuICAgICAgICAgICAgICAgICAgICAoMTAgKiB2ZWMzLnkgPDwgMCkgKiAwLjEsXG4gICAgICAgICAgICAgICAgICAgICgxMCAqIHZlYzMueiA8PCAwKSAqIDAuMSk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgYm9keSBjcmVhdGVkIGJ5IHRoZSBQaHlzaWNzQ29tcG9uZW50XG4gKlxuICogQG1ldGhvZCBQaHlzaWNzQ29tcG9uZW50I2dldEJvZHlcbiAqIEByZXR1cm5zIHtCb2R5fSBib2R5XG4gKi9cblBoeXNpY3NDb21wb25lbnQucHJvdG90eXBlLmdldEJvZHkgPSBmdW5jdGlvbiBnZXRCb2R5KCkge1xuICAgIHJldHVybiB0aGlzLmJvZHk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHRyYW5zZm9ybSBvZiB0aGUgZW50aXR5IG9uIHVwZGF0ZSBldmVudCBvZiB0aGUgYm9keVxuICpcbiAqIEBtZXRob2QgUGh5c2ljc0NvbXBvbmVudCNfdXBkYXRlXG4gKi9cblBoeXNpY3NDb21wb25lbnQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLmJvZHkuZ2V0UG9zaXRpb24oKTtcbiAgICB0aGlzLl9wb3NpdGlvbkRpZmYuY29weShWZWMzLnN1YnRyYWN0KHBvc2l0aW9uLCB0aGlzLl9jYWNoZWRQb3NpdGlvbikpO1xuICAgIHZhciBldWxlciA9IHRoaXMuYm9keS5nZXRPcmllbnRhdGlvbigpLnRvRXVsZXJYWVooKTtcbiAgICB0aGlzLl9ldWxlckRpZmYuY29weShWZWMzLnN1YnRyYWN0KGV1bGVyLCB0aGlzLl9jYWNoZWRSb3RhdGlvbikpO1xuICAgIHZhciBwb3NpdGlvbk91dCA9IF9jbGFtcCh0aGlzLl9wb3NpdGlvbkRpZmYpO1xuICAgIHRoaXMuX2VudGl0eVRyYW5zZm9ybS50cmFuc2xhdGUodGhpcy5fcG9zaXRpb25EaWZmLngsIHRoaXMuX3Bvc2l0aW9uRGlmZi55LCB0aGlzLl9wb3NpdGlvbkRpZmYueik7XG4gICAgdGhpcy5fZW50aXR5VHJhbnNmb3JtLnJvdGF0ZSh0aGlzLl9ldWxlckRpZmYueCwgdGhpcy5fZXVsZXJEaWZmLnksIHRoaXMuX2V1bGVyRGlmZi56KTtcbiAgICB0aGlzLl9jYWNoZWRQb3NpdGlvbi5jb3B5KHBvc2l0aW9uKTtcbiAgICB0aGlzLl9jYWNoZWRSb3RhdGlvbi5jb3B5KGV1bGVyKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGh5c2ljc0NvbXBvbmVudDtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGFkYW1AZmFtby51cywgd2lsbEBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jb3JlL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgVGltZVN5c3RlbSA9IHJlcXVpcmUoXCIuLi9jb3JlL1N5c3RlbXMvVGltZVN5c3RlbVwiKTtcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2VzL0ZvcmNlJyk7XG52YXIgQ29uc3RyYWludCA9IHJlcXVpcmUoJy4vY29uc3RyYWludHMvQ29uc3RyYWludCcpO1xudmFyIFBhcnRpY2xlID0gcmVxdWlyZSgnLi9ib2RpZXMvUGFydGljbGUnKTtcblxudmFyIGJvZGllcyA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0JvZGllcycpO1xuXG52YXIgUGh5c2ljc1N5c3RlbSA9IHt9O1xuXG5QaHlzaWNzU3lzdGVtLmFnZW50cyA9IFtdO1xuUGh5c2ljc1N5c3RlbS5jb25zdHJhaW50cyA9IFtdO1xuUGh5c2ljc1N5c3RlbS5ib2RpZXMgPSBbXTtcblBoeXNpY3NTeXN0ZW0uYWdlbnRSZWdpc3RyeSA9IHt9O1xuXG5cblBoeXNpY3NTeXN0ZW0uc3RlcCA9IDEvNjA7XG5QaHlzaWNzU3lzdGVtLl9JRFBvb2wgPSB7XG4gICAgYm9kaWVzOiBbXSxcbiAgICBhZ2VudHM6IFtdLFxuICAgIGNvbnN0cmFpbnRzOiBbXVxufTtcblxuUGh5c2ljc1N5c3RlbS5hZGRCb2R5ID0gZnVuY3Rpb24gYWRkQm9keShib2R5KSB7XG4gICAgaWYgKGJvZHkuX0lEID09PSBudWxsKSB7XG4gICAgICAgIGlmICh0aGlzLl9JRFBvb2wuYm9kaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgYm9keS5fSUQgPSB0aGlzLl9JRFBvb2wuYm9kaWVzLnBvcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYm9keS5fSUQgPSB0aGlzLmJvZGllcy5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ib2RpZXNbdGhpcy5ib2RpZXMubGVuZ3RoXSA9IGJvZHk7XG4gICAgfVxufVxuXG5QaHlzaWNzU3lzdGVtLnJlbW92ZUJvZHkgPSBmdW5jdGlvbiByZW1vdmVCb2R5KGJvZHkpIHtcbiAgICB0aGlzLl9JRFBvb2wuYm9kaWVzLnB1c2goYm9keS5fSUQpO1xuICAgIHRoaXMuYm9kaWVzW2JvZHkuX0lEXSA9IG51bGw7XG4gICAgYm9keS5fSUQgPSBudWxsO1xufVxuXG5QaHlzaWNzU3lzdGVtLmF0dGFjaCA9IGZ1bmN0aW9uIGF0dGFjaChhZ2VudHMsIHNvdXJjZSwgdGFyZ2V0cykge1xuICAgIGlmICghdGFyZ2V0cykgdGFyZ2V0cyA9IHRoaXMuYm9kaWVzO1xuICAgIGlmICghKHRhcmdldHMgaW5zdGFuY2VvZiBBcnJheSkpIHRhcmdldHMgPSBbdGFyZ2V0c107XG4gICAgdmFyIG5UYXJnZXRzID0gdGFyZ2V0cy5sZW5ndGg7XG4gICAgd2hpbGUgKG5UYXJnZXRzLS0pIHtcbiAgICAgICAgaWYgKHRhcmdldHNbblRhcmdldHNdLl9JRCA9PT0gbnVsbCkgdGhpcy5hZGRCb2R5KHRhcmdldHNbblRhcmdldHNdKTtcbiAgICB9XG4gICAgaWYgKHNvdXJjZSkgdGhpcy5hZGRCb2R5KHNvdXJjZSk7XG4gICAgaWYgKGFnZW50cyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIHZhciBhZ2VudElEcyA9IEFycmF5KGFnZW50cy5sZW5ndGgpO1xuICAgICAgICB2YXIgbkFnZW50cyA9IGFnZW50cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlKG5BZ2VudHMtLSkge1xuICAgICAgICAgICAgYWdlbnRJRHNbbkFnZW50c10gPSBfYXR0YWNoQWdlbnQuY2FsbCh0aGlzLCBhZ2VudHNbaV0sIHRhcmdldHMsIHNvdXJjZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBfYXR0YWNoQWdlbnQuY2FsbCh0aGlzLCBhZ2VudHMsIHRhcmdldHMsIHNvdXJjZSk7XG5cbiAgICByZXR1cm4gYWdlbnRJRHM7XG59O1xuXG5cbmZ1bmN0aW9uIF9hdHRhY2hBZ2VudChhZ2VudCwgdGFyZ2V0cywgc291cmNlKSB7XG4gICAgaWYgKGFnZW50Ll9JRCkgdGhyb3cgbmV3IEVycm9yIChcIkFnZW50cyBjYW4gb25seSBiZSBhZGRlZCB0byB0aGUgZW5naW5lIG9uY2VcIik7IC8vIEhhbmRsZSBpdCBoZXJlXG4gICAgaWYgKHRhcmdldHMgPT09IHVuZGVmaW5lZCkgdGFyZ2V0cyA9IHRoaXMuYm9kaWVzO1xuXG4gICAgaWYgKGFnZW50IGluc3RhbmNlb2YgRm9yY2UpIHtcbiAgICAgICAgaWYgKHRoaXMuX0lEUG9vbC5hZ2VudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhZ2VudC5fSUQgPSB0aGlzLl9JRFBvb2wuYWdlbnRzLnBvcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWdlbnQuX0lEID0gdGhpcy5hZ2VudHMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWdlbnRzW3RoaXMuYWdlbnRzLmxlbmd0aF0gPSB7XG4gICAgICAgICAgICBhZ2VudCAgIDogYWdlbnQsXG4gICAgICAgICAgICB0YXJnZXRzIDogdGFyZ2V0cyxcbiAgICAgICAgICAgIHNvdXJjZSAgOiBzb3VyY2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBlbHNlIGlmIChhZ2VudCBpbnN0YW5jZW9mIENvbnN0cmFpbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuX0lEUG9vbC5jb25zdHJhaW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFnZW50Ll9JRCA9IHRoaXMuX0lEUG9vbC5jb25zdHJhaW50cy5wb3AoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFnZW50Ll9JRCA9IHRoaXMuY29uc3RyYWludHMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29uc3RyYWludHNbdGhpcy5jb25zdHJhaW50cy5sZW5ndGhdID0ge1xuICAgICAgICAgICAgY29uc3RyYWludCA6IGFnZW50LFxuICAgICAgICAgICAgdGFyZ2V0cyAgICA6IHRhcmdldHMsXG4gICAgICAgICAgICBzb3VyY2UgICAgIDogc291cmNlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcihcIk9ubHkgQWdlbnRzIGFuZCBDb25zdHJhbnRzIG1heSBiZSBhZGRlZCB0byB0aGUgUGh5c2ljcyBTeXN0ZW1cIik7XG4gICAgcmV0dXJuIGFnZW50Ll9JRDtcbn1cblxuUGh5c2ljc1N5c3RlbS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUoYWdlbnRzT3JCb2RpZXMpIHtcbiAgICBpZiAoYWdlbnRzT3JCb2RpZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICB2YXIgbmVFbGVtZW50cyA9IGFnZW50c09yQm9kaWVzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUobmVFbGVtZW50cy0tKSB7XG4gICAgICAgICAgICBfcmVtb3ZlT25lLmNhbGwodGhpcywgYWdlbnRzT3JCb2RpZXNbbmVFbGVtZW50c10pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgX3JlbW92ZU9uZS5jYWxsKHRoaXMsIGFnZW50c09yQm9kaWVzKTtcbn1cblxuZnVuY3Rpb24gX3JlbW92ZU9uZShhZ2VudE9yQm9keSkge1xuICAgIGlmIChhZ2VudE9yQm9keSBpbnN0YW5jZW9mIEZvcmNlKSB7XG4gICAgICAgIHRoaXMuX0lEUG9vbC5hZ2VudHMucHVzaChhZ2VudE9yQm9keS5fSUQpO1xuICAgICAgICB0aGlzLmFnZW50c1thZ2VudE9yQm9keS5fSURdID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGFnZW50T3JCb2R5IGluc3RhbmNlb2YgQ29uc3RyYWludCkge1xuICAgICAgICB0aGlzLl9JRFBvb2wuY29uc3RyYWludHMucHVzaChhZ2VudE9yQm9keS5fSUQpO1xuICAgICAgICB0aGlzLmNvbnN0cmFpbnRzW2FnZW50T3JCb2R5Ll9JRF0gPSBudWxsO1xuICAgIH0gZWxzZSBpZiAoYWdlbnRPckJvZHkgaW5zdGFuY2VvZiBQYXJ0aWNsZSkge1xuICAgICAgICB0aGlzLl9JRFBvb2wuYm9kaWVzLnB1c2goYWdlbnRPckJvZHkuX0lEKTtcbiAgICAgICAgdGhpcy5ib2RpZXNbYWdlbnRPckJvZHkuX0lEXSA9IG51bGw7XG4gICAgfVxuICAgIGFnZW50T3JCb2R5Ll9JRCA9IG51bGw7XG59XG5cblBoeXNpY3NTeXN0ZW0uYXR0YWNoVG8gPSBmdW5jdGlvbiBhdHRhY2hUbyhhZ2VudCwgdGFyZ2V0cykge1xuICAgIGlmIChhZ2VudC5fSUQgPT09IG51bGwpIHJldHVybjtcbiAgICBpZiAoISh0YXJnZXRzIGluc3RhbmNlb2YgQXJyYXkpKSB0YXJnZXRzID0gW3RhcmdldHNdO1xuICAgIHZhciBuVGFyZ2V0cyA9IHRhcmdldHMubGVuZ3RoO1xuICAgIHdoaWxlIChuVGFyZ2V0cy0tKSB7XG4gICAgICAgIGlmICh0YXJnZXRzW25UYXJnZXRzXS5fSUQgPT09IG51bGwpIHRoaXMuYWRkQm9keSh0YXJnZXRzW25UYXJnZXRzXSk7XG4gICAgfVxuICAgIHRoaXMuYWdlbnRzW2FnZW50Ll9JRF0udGFyZ2V0cyA9IHRoaXMuYWdlbnRzW2FnZW50Ll9JRF0udGFyZ2V0cy5jb25jYXQodGFyZ2V0cyk7XG59O1xuXG5QaHlzaWNzU3lzdGVtLnJlbW92ZUZyb20gPSBmdW5jdGlvbiByZW1vdmVGcm9tKGFnZW50LCB0YXJnZXQpIHtcbiAgICBpZiAoYWdlbnQuX0lEID09PSBudWxsKSByZXR1cm47XG4gICAgdmFyIGFnZW50VGFyZ2V0cyA9IHRoaXMuYWdlbnRzW2FnZW50Ll9JRF0udGFyZ2V0cztcblxuICAgIHZhciBuVGFyZ2V0cyA9IGFnZW50VGFyZ2V0cy5sZW5ndGg7XG4gICAgd2hpbGUoblRhcmdldHMtLSkge1xuICAgICAgaWYgKGFnZW50VGFyZ2V0c1tuVGFyZ2V0c10gPT09IHRhcmdldCkge1xuICAgICAgICAvLyByZW1vdmUgdGFyZ2V0IGZyb20gYWdlbnQgYW5kIHN0b3AgY2hlY2tpbmcgdGFyZ2V0c1xuICAgICAgICByZXR1cm4gYWdlbnRUYXJnZXRzLnNwbGljZShuVGFyZ2V0cywgMSk7XG4gICAgICB9XG4gICAgfVxufTtcblxuUGh5c2ljc1N5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIGR0ID0gVGltZVN5c3RlbS5nZXREZWx0YSgpLzEwMDA7XG5cbiAgICB3aGlsZShkdCA+IDApIHtcbiAgICAgICAgdmFyIHN0ZXAgPSAoZHQgPiB0aGlzLnN0ZXApID8gdGhpcy5zdGVwIDogZHQ7XG4gICAgICAgIC8vIFVwZGF0ZUZvcmNlcyBvbiBwYXJ0aWNsZXNcbiAgICAgICAgdmFyIG5BZ2VudHMgPSB0aGlzLmFnZW50cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlKG5BZ2VudHMtLSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWdlbnRzW25BZ2VudHNdKSB0aGlzLmFnZW50c1tuQWdlbnRzXS5hZ2VudC51cGRhdGUodGhpcy5hZ2VudHNbbkFnZW50c10uc291cmNlLCB0aGlzLmFnZW50c1tuQWdlbnRzXS50YXJnZXRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuQ29uc3RyYWludHMgPSB0aGlzLmNvbnN0cmFpbnRzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUobkNvbnN0cmFpbnRzLS0pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5jb25zdHJhaW50c1tuQ29uc3RyYWludHNdKSBjb250aW51ZTtcbiAgICAgICAgICAgIHRoaXMuY29uc3RyYWludHNbbkNvbnN0cmFpbnRzXS5jb25zdHJhaW50LnVwZGF0ZSh0aGlzLmNvbnN0cmFpbnRzW25Db25zdHJhaW50c10uc291cmNlLCB0aGlzLmNvbnN0cmFpbnRzW25Db25zdHJhaW50c10udGFyZ2V0cywgc3RlcCoxMDAwKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbnRlZ3JhdGUgUGFydGljbGUgcG9zaXRpb25zXG4gICAgICAgIHZhciBuQm9kaWVzID0gdGhpcy5ib2RpZXMubGVuZ3RoO1xuICAgICAgICB2YXIgYm9keTtcbiAgICAgICAgd2hpbGUobkJvZGllcy0tKSB7XG4gICAgICAgICAgICBib2R5ID0gdGhpcy5ib2RpZXNbbkJvZGllc107XG4gICAgICAgICAgICBpZiAoIWJvZHkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKGJvZHkuc2V0dGxlZCkge1xuICAgICAgICAgICAgICAgIGlmIChib2R5Ll9mb3JjZS5sZW5ndGgoKSA+IGJvZHkuc2xlZXBUaHJlc2hvbGQgfHwgYm9keS5fdmVsb2NpdHkubGVuZ3RoKCkgPiBib2R5LnNsZWVwVGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZHkuc2V0dGxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZHkuZ2V0Rm9yY2UoKS5jbGVhcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYm9keS5zZXR0bGVkKSBib2R5Ll9pbnRlZ3JhdGVWZWxvY2l0eShzdGVwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBwYXJ0aWNsZXMgYmFzZWQgb24gY29uc3RyYWludHNcblxuICAgICAgICBuQm9kaWVzID0gdGhpcy5ib2RpZXMubGVuZ3RoO1xuICAgICAgICB3aGlsZShuQm9kaWVzLS0pIHtcbiAgICAgICAgICAgIGJvZHkgPSB0aGlzLmJvZGllc1tuQm9kaWVzXTtcbiAgICAgICAgICAgIGlmICghYm9keSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAoIWJvZHkuc2V0dGxlZCkgYm9keS5faW50ZWdyYXRlUG9zZShzdGVwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGR0IC09IHRoaXMuc3RlcDtcbiAgICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGh5c2ljc1N5c3RlbTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGFkYW1AZmFtby51cywgd2lsbEBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xudmFyIFBhcnRpY2xlID0gcmVxdWlyZSgnLi9QYXJ0aWNsZScpO1xudmFyIFZlYzMgPSByZXF1aXJlKCcuLi8uLi9tYXRoL1ZlYzMnKTtcbnZhciBRdWF0ZXJuaW9uID0gcmVxdWlyZSgnLi4vLi4vbWF0aC9RdWF0ZXJuaW9uJyk7XG52YXIgTWF0cml4ID0gcmVxdWlyZSgnLi4vLi4vbWF0aC9NYXQzMycpO1xudmFyIFN5bXBsZWN0aWNFdWxlciA9IHJlcXVpcmUoJy4uL2ludGVncmF0b3JzL1N5bXBsZWN0aWNFdWxlcicpO1xuXG4vKipcbiAqIEEgdW5pdCBjb250cm9sbGVkIGJ5IHRoZSBwaHlzaWNzIGVuZ2luZSB3aGljaCBleHRlbmRzIHRoZSB6ZXJvLWRpbWVuc2lvbmFsXG4gKiBQYXJ0aWNsZSB0byBpbmNsdWRlIGdlb21ldHJ5LiBJbiBhZGRpdGlvbiB0byBtYWludGFpbmluZyB0aGUgc3RhdGVcbiAqIG9mIGEgUGFydGljbGUgaXRzIHN0YXRlIGluY2x1ZGVzIG9yaWVudGF0aW9uLCBhbmd1bGFyIHZlbG9jaXR5XG4gKiBhbmQgYW5ndWxhciBtb21lbnR1bSBhbmQgcmVzcG9uZHMgdG8gdG9ycXVlIGZvcmNlcy5cbiAqXG4gKiBAY2xhc3MgQm9keVxuICogQGV4dGVuZHMgUGFydGljbGVcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBCb2R5KG9wdGlvbnMpIHtcbiAgICBQYXJ0aWNsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYgKG9wdGlvbnMub3JpZW50YXRpb24gaW5zdGFuY2VvZiBRdWF0ZXJuaW9uKSB7XG4gICAgICAgIHRoaXMub3JpZW50YXRpb24gPSBvcHRpb25zLm9yaWVudGF0aW9uO1xuICAgIH1cbiAgICBlbHNlIGlmIChvcHRpb25zLm9yaWVudGF0aW9uIGluc3RhbmNlb2YgVmVjMykge1xuICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gbmV3IFF1YXRlcm5pb24oKS5mcm9tRXVsZXJYWVoodGhpcy5vcmllbnRhdGlvbik7XG4gICAgfVxuICAgIGVsc2UgaWYgKG9wdGlvbnMub3JpZW50YXRpb24gaW5zdGFuY2VvZiBBcnJheSB8fCBvcHRpb25zLm9yaWVudGF0aW9uIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgIHRoaXMub3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbigpLmZyb21FdWxlclhZWihuZXcgVmVjMyhvcHRpb25zLm9yaWVudGF0aW9uKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gbmV3IFF1YXRlcm5pb24oKTtcbiAgICB9XG5cbiAgICB0aGlzLmFuZ3VsYXJWZWxvY2l0eSA9IG5ldyBWZWMzKG9wdGlvbnMuYW5ndWxhclZlbG9jaXR5KTtcbiAgICB0aGlzLmFuZ3VsYXJNb21lbnR1bSA9IG5ldyBWZWMzKG9wdGlvbnMuYW5ndWxhck1vbWVudHVtKTtcbiAgICB0aGlzLnRvcnF1ZSA9IG5ldyBWZWMzKG9wdGlvbnMudG9ycXVlKTtcblxuICAgIHRoaXMuc2V0TW9tZW50c09mSW5lcnRpYSgpO1xuXG4gICAgdGhpcy5hbmd1bGFyVmVsb2NpdHkudyA9IDA7ICAgICAgICAvL3F1YXRlcm5pZnkgdGhlIGFuZ3VsYXIgdmVsb2NpdHlcblxuICAgIC8vcmVnaXN0ZXJzXG4gICAgdGhpcy5wV29ybGQgPSBuZXcgVmVjMygpOyAgICAgICAgLy9wbGFjZWhvbGRlciBmb3Igd29ybGQgc3BhY2UgcG9zaXRpb25cbn1cblxuQm9keS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCl7XG4gICAgcmV0dXJuICdwYXJ0aWNsZSc7XG59O1xuXG5Cb2R5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGFydGljbGUucHJvdG90eXBlKTtcbkJvZHkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQm9keTtcblxuQm9keS5wcm90b3R5cGUuaXNCb2R5ID0gdHJ1ZTtcblxuQm9keS5wcm90b3R5cGUuc2V0TWFzcyA9IGZ1bmN0aW9uIHNldE1hc3MoKSB7XG4gICAgUGFydGljbGUucHJvdG90eXBlLnNldE1hc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLnNldE1vbWVudHNPZkluZXJ0aWEoKTtcbn07XG5cbi8qKlxuICogU2V0dGVyIGZvciBtb21lbnQgb2YgaW5lcnRpYSwgd2hpY2ggaXMgbmVjZXNzYXJ5IHRvIGdpdmUgcHJvcGVyXG4gKiBhbmd1bGFyIGluZXJ0aWEgZGVwZW5kaW5nIG9uIHRoZSBnZW9tZXRyeSBvZiB0aGUgYm9keS5cbiAqXG4gKiBAbWV0aG9kIHNldE1vbWVudHNPZkluZXJ0aWFcbiAqL1xuQm9keS5wcm90b3R5cGUuc2V0TW9tZW50c09mSW5lcnRpYSA9IGZ1bmN0aW9uIHNldE1vbWVudHNPZkluZXJ0aWEoKSB7XG4gICAgdGhpcy5pbmVydGlhID0gbmV3IE1hdHJpeCgpO1xuICAgIHRoaXMuaW52ZXJzZUluZXJ0aWEgPSBuZXcgTWF0cml4KCk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgYW5ndWxhciB2ZWxvY2l0eSBmcm9tIHRoZSBhbmd1bGFyIG1vbWVudHVtIHN0YXRlLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlQW5ndWxhclZlbG9jaXR5XG4gKi9cbkJvZHkucHJvdG90eXBlLnVwZGF0ZUFuZ3VsYXJWZWxvY2l0eSA9IGZ1bmN0aW9uIHVwZGF0ZUFuZ3VsYXJWZWxvY2l0eSgpIHtcbiAgICB0aGlzLmFuZ3VsYXJWZWxvY2l0eS5jb3B5KHRoaXMuaW52ZXJzZUluZXJ0aWEudmVjdG9yTXVsdGlwbHkodGhpcy5hbmd1bGFyTW9tZW50dW0pKTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIHdvcmxkIGNvb3JkaW5hdGVzIGZyb20gdGhlIGxvY2FsIGNvb3JkaW5hdGUgc3lzdGVtLiBVc2VmdWxcbiAqIGlmIHRoZSBCb2R5IGhhcyByb3RhdGVkIGluIHNwYWNlLlxuICpcbiAqIEBtZXRob2QgdG9Xb3JsZENvb3JkaW5hdGVzXG4gKiBAcGFyYW0gbG9jYWxQb3NpdGlvbiB7VmVjdG9yfSBsb2NhbCBjb29yZGluYXRlIHZlY3RvclxuICogQHJldHVybiBnbG9iYWwgY29vcmRpbmF0ZSB2ZWN0b3Ige1ZlY3Rvcn1cbiAqL1xuQm9keS5wcm90b3R5cGUudG9Xb3JsZENvb3JkaW5hdGVzID0gZnVuY3Rpb24gdG9Xb3JsZENvb3JkaW5hdGVzKGxvY2FsUG9zaXRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5wV29ybGQuY29weSh0aGlzLm9yaWVudGF0aW9uLnJvdGF0ZVZlY3Rvcihsb2NhbFBvc2l0aW9uKSk7XG59O1xuXG4vKipcbiAqIFNldHRlciBmb3Igb3JpZW50YXRpb25cbiAqXG4gKiBAbWV0aG9kIHNldE9yaWVudGF0aW9uXG4gKiBAcGFyYW0gcSB7QXJyYXl8UXVhdGVybmlvbn0gb3JpZW50YXRpb25cbiAqL1xuQm9keS5wcm90b3R5cGUuc2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbiBzZXRPcmllbnRhdGlvbihxKSB7XG4gICAgdGhpcy5vcmllbnRhdGlvbi5zZXQocSk7XG59O1xuXG5Cb2R5LnByb3RvdHlwZS5nZXRPcmllbnRhdGlvbiA9IGZ1bmN0aW9uIGdldE9yaWVudGF0aW9uKHEpIHtcbiAgICByZXR1cm4gdGhpcy5vcmllbnRhdGlvbjtcbn07XG5cbi8qKlxuICogU2V0dGVyIGZvciBhbmd1bGFyIHZlbG9jaXR5XG4gKlxuICogQG1ldGhvZCBzZXRBbmd1bGFyVmVsb2NpdHlcbiAqIEBwYXJhbSB3IHtBcnJheXxWZWN0b3J9IGFuZ3VsYXIgdmVsb2NpdHlcbiAqL1xuQm9keS5wcm90b3R5cGUuc2V0QW5ndWxhclZlbG9jaXR5ID0gZnVuY3Rpb24gc2V0QW5ndWxhclZlbG9jaXR5KHcpIHtcbiAgICBpZiAodyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIHRoaXMuYW5ndWxhclZlbG9jaXR5LnNldCh3WzBdLHdbMV0sd1syXSlcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuZ3VsYXJWZWxvY2l0eS5jb3B5KHcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0dGVyIGZvciBhbmd1bGFyIG1vbWVudHVtXG4gKlxuICogQG1ldGhvZCBzZXRBbmd1bGFyTW9tZW50dW1cbiAqIEBwYXJhbSBMIHtBcnJheXxWZWN0b3J9IGFuZ3VsYXIgbW9tZW50dW1cbiAqL1xuQm9keS5wcm90b3R5cGUuc2V0QW5ndWxhck1vbWVudHVtID0gZnVuY3Rpb24gc2V0QW5ndWxhck1vbWVudHVtKEwpIHtcbiAgICBpZiAoTCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIHRoaXMuYW5ndWxhck1vbWVudHVtLnNldChMWzBdLExbMV0sTFsyXSlcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuZ3VsYXJNb21lbnR1bS5jb3B5KEwpO1xuICAgIH1cbn07XG5cbi8qKlxuICogRXh0ZW5kcyBQYXJ0aWNsZS5hcHBseUZvcmNlIHdpdGggYW4gb3B0aW9uYWwgYXJndW1lbnRcbiAqIHRvIGFwcGx5IHRoZSBmb3JjZSBhdCBhbiBvZmYtY2VudGVyZWQgbG9jYXRpb24sIHJlc3VsdGluZyBpbiBhIHRvcnF1ZS5cbiAqXG4gKiBAbWV0aG9kIGFwcGx5Rm9yY2VcbiAqIEBwYXJhbSBmb3JjZSB7VmVjdG9yfSBmb3JjZVxuICogQHBhcmFtIFtsb2NhdGlvbl0ge1ZlY3Rvcn0gb2ZmLWNlbnRlciBsb2NhdGlvbiBvbiB0aGUgYm9keVxuICovXG5Cb2R5LnByb3RvdHlwZS5hcHBseUZvcmNlID0gZnVuY3Rpb24gYXBwbHlGb3JjZShmb3JjZSwgbG9jYXRpb24pIHtcbiAgICBQYXJ0aWNsZS5wcm90b3R5cGUuYXBwbHlGb3JjZS5jYWxsKHRoaXMsIGZvcmNlKTtcbiAgICBpZiAobG9jYXRpb24gIT09IHVuZGVmaW5lZCkgdGhpcy5hcHBseVRvcnF1ZShsb2NhdGlvbi5jcm9zcyhmb3JjZSkpO1xufTtcblxuLyoqXG4gKiBBcHBsaWVkIGEgdG9ycXVlIGZvcmNlIHRvIGEgYm9keSwgaW5kdWNpbmcgYSByb3RhdGlvbi5cbiAqXG4gKiBAbWV0aG9kIGFwcGx5VG9ycXVlXG4gKiBAcGFyYW0gdG9ycXVlIHtWZWN0b3J9IHRvcnF1ZVxuICovXG5Cb2R5LnByb3RvdHlwZS5hcHBseVRvcnF1ZSA9IGZ1bmN0aW9uIGFwcGx5VG9ycXVlKHRvcnF1ZSkge1xuICAgIHRoaXMudG9ycXVlLmFkZCh0b3JxdWUpO1xufTtcblxuLyoqXG4gKiBFeHRlbmRzIFBhcnRpY2xlLl9pbnRlZ3JhdGUgdG8gYWxzbyB1cGRhdGUgdGhlIHJvdGF0aW9uYWwgc3RhdGVzXG4gKiBvZiB0aGUgYm9keS5cbiAqXG4gKiBAbWV0aG9kIGdldFRyYW5zZm9ybVxuICogQHByb3RlY3RlZFxuICogQHBhcmFtIGR0IHtOdW1iZXJ9IGRlbHRhIHRpbWVcbiAqL1xuXG5Cb2R5LnByb3RvdHlwZS5faW50ZWdyYXRlUG9zZSA9IGZ1bmN0aW9uIF9pbnRlZ3JhdGVQb3NlKGR0KSB7XG4gICAgUGFydGljbGUucHJvdG90eXBlLl9pbnRlZ3JhdGVQb3NlLmNhbGwodGhpcywgZHQpO1xuICAgIFN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVBbmd1bGFyTW9tZW50dW0odGhpcywgZHQpO1xuICAgIHRoaXMudXBkYXRlQW5ndWxhclZlbG9jaXR5KCk7XG59O1xuXG5Cb2R5LnByb3RvdHlwZS5faW50ZWdyYXRlVmVsb2NpdHkgPSBmdW5jdGlvbiBfaW50ZWdyYXRlVmVsb2NpdHkoZHQpIHtcbiAgICBQYXJ0aWNsZS5wcm90b3R5cGUuX2ludGVncmF0ZVZlbG9jaXR5LmNhbGwodGhpcywgZHQpO1xuICAgIFN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVPcmllbnRhdGlvbih0aGlzLCBkdCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQm9keTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGFkYW1AZmFtby51cywgd2lsbEBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xudmFyIFZlYzMgPSByZXF1aXJlKCcuLi8uLi9tYXRoL1ZlYzMnKTtcbnZhciBTeW1wbGVjdGljRXVsZXIgPSByZXF1aXJlKCcuLi9pbnRlZ3JhdG9ycy9TeW1wbGVjdGljRXVsZXInKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuLi8uLi9ldmVudHMvRXZlbnRFbWl0dGVyJyk7XG5cbmZ1bmN0aW9uIFBhcnRpY2xlKG9wdGlvbnMpIHtcbiAgICB0aGlzLl9ldmVudEVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLl9wb3NpdGlvbiA9IG5ldyBWZWMzKG9wdGlvbnMucG9zaXRpb24pO1xuICAgIHRoaXMuX2xhc3RQb3NpdGlvbiA9IG5ldyBWZWMzKCk7XG4gICAgdGhpcy5fdmVsb2NpdHkgPSBuZXcgVmVjMyhvcHRpb25zLnZlbG9jaXR5KTtcbiAgICB0aGlzLl9mb3JjZSA9IG5ldyBWZWMzKCk7XG4gICAgdGhpcy5fbWFzcyA9IG9wdGlvbnMubWFzcyB8fCAxO1xuICAgIHRoaXMuX21vbWVudHVtID0gVmVjMy5zY2FsZSh0aGlzLl92ZWxvY2l0eSwgdGhpcy5fbWFzcyk7XG5cbiAgICB0aGlzLl9JRCA9IG51bGw7XG4gICAgdGhpcy5zZXR0bGVkID0gZmFsc2U7XG4gICAgdGhpcy5zbGVlcFRocmVzaG9sZCA9IG9wdGlvbnMuc2xlZXBUaHJlc2hvbGQgfHwgMDtcbn1cblxuXG5QYXJ0aWNsZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCl7XG4gICAgcmV0dXJuICdwYXJ0aWNsZSc7XG59O1xuXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0TWFzcyA9IGZ1bmN0aW9uIGdldE1hc3MoKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hc3M7XG59O1xuXG5QYXJ0aWNsZS5wcm90b3R5cGUuc2V0TWFzcyA9IGZ1bmN0aW9uIHNldE1hc3MobWFzcykge1xuICAgIHRoaXMuX21hc3MgPSBtYXNzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuUGFydGljbGUucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gZ2V0UG9zaXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xufTtcblxuUGFydGljbGUucHJvdG90eXBlLmdldExhc3RQb3NpdGlvbiA9IGZ1bmN0aW9uIGdldExhc3RQb3NpdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbGFzdFBvc2l0aW9uO1xufTtcblxuUGFydGljbGUucHJvdG90eXBlLnNldFBvc2l0aW9uID0gZnVuY3Rpb24gc2V0UG9zaXRpb24oeCwgeSwgeikge1xuICAgIGlmICh4IGluc3RhbmNlb2YgVmVjMykge1xuICAgICAgICB0aGlzLl9wb3NpdGlvbi5jb3B5KHgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uLnNldCh4LCB5LCB6KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0VmVsb2NpdHkgPSBmdW5jdGlvbiBnZXRWZWxvY2l0eSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmVsb2NpdHk7XG59O1xuXG5QYXJ0aWNsZS5wcm90b3R5cGUuc2V0VmVsb2NpdHkgPSBmdW5jdGlvbiBzZXRWZWxvY2l0eSh4LCB5LCB6KSB7XG4gICAgaWYgKHggaW5zdGFuY2VvZiBWZWMzKSB7XG4gICAgICAgIHRoaXMuX3ZlbG9jaXR5LmNvcHkoeCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fdmVsb2NpdHkuc2V0KHgsIHksIHopO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRGb3JjZSA9IGZ1bmN0aW9uIGdldEZvcmNlKCkge1xuICAgIHJldHVybiB0aGlzLl9mb3JjZTtcbn07XG5cblBhcnRpY2xlLnByb3RvdHlwZS5zZXRGb3JjZSA9IGZ1bmN0aW9uIHNldEZvcmNlKHYpIHtcbiAgICB0aGlzLl9mb3JjZS5jb3B5KHYpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gcCA9IG12XG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0TW9tZW50dW0gPSBmdW5jdGlvbiBnZXRNb21lbnR1bSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbW9tZW50dW0uY29weSh0aGlzLnZlbG9jaXR5KS5zY2FsZSh0aGlzLl9tYXNzKTtcbn07XG5cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRNb21lbnR1bVNjYWxhciA9IGZ1bmN0aW9uIGdldE1vbWVudHVtU2NhbGFyKCkge1xuICAgIHJldHVybiB0aGlzLmdldE1vbWVudHVtKCkubGVuZ3RoKCk7XG59O1xuXG5QYXJ0aWNsZS5wcm90b3R5cGUuYXBwbHlGb3JjZSA9IGZ1bmN0aW9uIGFwcGx5Rm9yY2UoZm9yY2Upe1xuICAgIHRoaXMuX2ZvcmNlLmFkZChmb3JjZSk7XG59O1xuXG5QYXJ0aWNsZS5wcm90b3R5cGUuYXBwbHlJbXB1bHNlID0gZnVuY3Rpb24gYXBwbHlJbXB1bHNlKGltcHVsc2UpIHtcbiAgICBpZiAoaW1wdWxzZS5pc1plcm8oKSkgcmV0dXJuO1xuICAgIHRoaXMuX3ZlbG9jaXR5LmFkZChpbXB1bHNlLnNjYWxlKDEvdGhpcy5nZXRNYXNzKCkpKTtcbn07XG5cblBhcnRpY2xlLnByb3RvdHlwZS5faW50ZWdyYXRlVmVsb2NpdHkgPSBmdW5jdGlvbiBfaW50ZWdyYXRlVmVsb2NpdHkoZHQpIHtcbiAgICBTeW1wbGVjdGljRXVsZXIuaW50ZWdyYXRlVmVsb2NpdHkodGhpcywgZHQpO1xufTtcblxuUGFydGljbGUucHJvdG90eXBlLl9pbnRlZ3JhdGVQb3NlID0gZnVuY3Rpb24gX2ludGVncmF0ZVBvc2UoZHQpIHtcbiAgICBTeW1wbGVjdGljRXVsZXIuaW50ZWdyYXRlUG9zaXRpb24odGhpcywgZHQpO1xuICAgIHRoaXMuX2V2ZW50RW1pdHRlci5lbWl0KCd1cGRhdGUnKTtcbiAgICBpZiAodGhpcy5fZm9yY2UubGVuZ3RoKCkgPCB0aGlzLnNsZWVwVGhyZXNob2xkICYmIHRoaXMuX3ZlbG9jaXR5Lmxlbmd0aCgpIDwgdGhpcy5zbGVlcFRocmVzaG9sZCkge1xuICAgICAgICB0aGlzLnNldHRsZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9ldmVudEVtaXR0ZXIuZW1pdCgnc2V0dGxlZCcpO1xuICAgICAgICB0aGlzLl92ZWxvY2l0eS5jbGVhcigpO1xuICAgIH1cbiAgICB0aGlzLl9mb3JjZS5jbGVhcigpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJ0aWNsZTtcblxuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogYWRhbUBmYW1vLnVzLCB3aWxsQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG4gdmFyIE9wdGlvbnNNYW5hZ2VyID0gcmVxdWlyZSgnLi4vLi4vY29yZS9PcHRpb25zTWFuYWdlcicpO1xuXG4vKipcbiAqIEJhc2UgQ29uc3RyYWludCBjbGFzcyB0byBiZSB1c2VkIGluIHRoZSBQaHlzaWNzU3lzdGVtXG4gKiBTdWJjbGFzcyB0aGlzIGNsYXNzIHRvIGltcGxlbWVudCBhIGNvbnN0cmFpbnRcbiAqXG4gKiBAdmlydHVhbFxuICogQGNsYXNzIENvbnN0cmFpbnRcbiAqL1xuZnVuY3Rpb24gQ29uc3RyYWludChvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gT3B0aW9uc01hbmFnZXIucGF0Y2goT2JqZWN0LmNyZWF0ZSh0aGlzLmNvbnN0cnVjdG9yLkRFRkFVTFRfT1BUSU9OUyksIG9wdGlvbnMpO1xuICAgIHRoaXMuX0lEID0gbnVsbDtcbn07XG5cbi8vIE5vdCBtZWFudCB0byBiZSBpbXBsZW1lbnRlZFxuQ29uc3RyYWludC5wcm90b3R5cGUgPSB7fTtcbkNvbnN0cmFpbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIEFwcGx5IHRoZSBjb25zdHJhaW50IGZyb20gdGhlIHNvdXJjZSB0byB0aGUgdGFyZ2V0c1xuICpcbiAqIEBtZXRob2QgQ29uc3RyYWludCN1cGRhdGVcbiAqIEBwYXJhbSB7UGFydGljbGUgfCB1bmRlZmluZWR9IHNvdXJjZSB0aGUgc291cmNlIG9mIHRoZSBjb25zdHJhaW50XG4gKiBAcGFyYW0ge1BhcnRpY2xlW119IHRhcmdldHMgb2YgdGhlIGNvbnN0cmFpbnRcbiAqIEB0aHJvd3Mgd2hlbiBub3Qgc3ViY2xhc3NlZFxuICovXG5Db25zdHJhaW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihzb3VyY2UsIHRhcmdldHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbnN0cmFpbnQgc2hvdWxkIGJlIGV4dGVuZGVkLCBub3QgaW1wbGVtZW50ZWQnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb25zdHJhaW50O1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogYWRhbUBmYW1vLnVzLCB3aWxsQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG52YXIgT3B0aW9uc01hbmFnZXIgPSByZXF1aXJlKCcuLi8uLi9jb3JlL09wdGlvbnNNYW5hZ2VyJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50RW1pdHRlcicpO1xuXG4vKipcbiAqIEFic3RyYWN0IGZvcmNlIG1hbmFnZXIgdG8gYXBwbHkgZm9yY2VzIHRvIHRhcmdldHMuICBOb3QgbWVhbnQgdG8gYmUgaW1wbGVtZW50ZWQuXG4gKiBAdmlydHVhbFxuICogQGNsYXNzIEZvcmNlXG4gKi9cbmZ1bmN0aW9uIEZvcmNlKG9wdGlvbnMpIHtcbiAgICB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG4gICAgdGhpcy5fZXZlbnRFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIHRoaXMuX0lEID0gbnVsbDtcbn1cblxuLy8gTm90IE1lYW50IHRvIGJlIGltcGxpbWVudGVkXG5Gb3JjZS5wcm90b3R5cGUgPSB7fTtcbkZvcmNlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IG51bGw7XG5cbkZvcmNlLnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gT3B0aW9uc01hbmFnZXIucGF0Y2godGhpcy5vcHRpb25zIHx8IE9iamVjdC5jcmVhdGUodGhpcy5jb25zdHJ1Y3Rvci5ERUZBVUxUX09QVElPTlMgfHwge30pLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQG1ldGhvZCB1cGRhdGVcbiAqIEBwYXJhbSB7UGFydGljbGV9IHNvdXJjZVxuICogQHBhcmFtIHtQYXJ0aWNsZVtdfSB0YXJnZXRzXG4gKi9cbkZvcmNlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoc291cmNlcywgdGFyZ2V0cykge1xuICAgIC8vIExpbmVhciBvcGVyYXRpb24gaW4gdGFyZ2V0c1xuICAgIC8vIGNhbGN1bGF0ZSBkaXN0YW5jZSBiZXR3ZWVuIHNvdXJjZSwgdGFyZ2V0c1xuICAgIHRoaXMuX2V2ZW50RW1pdHRlci5lbWl0KCd1cGRhdGUnKTtcbiAgICB2YXIgdGFyZ2V0O1xuICAgIGlmICghKHNvdXJjZXMgaW5zdGFuY2VvZiBBcnJheSkpIHNvdXJjZXMgPSBbc291cmNlc107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YXJnZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRhcmdldCA9IHRhcmdldHNbaV07XG4gICAgICAgIHZhciBsID0gc291cmNlcy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChsLS0pIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2VzW2xdID09PSB0YXJnZXQpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdGFyZ2V0LmFwcGx5Rm9yY2UodGhpcy5vcHRpb25zLmZvcmNlRnVuY3Rpb24uY2FsbCh0aGlzLCB0aGlzLm9wdGlvbnMuY29uc3RhbnQsIHNvdXJjZXNbbF0sIHRhcmdldCkpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGb3JjZTtcbiIsInZhciBGb3JjZSA9IHJlcXVpcmUoJy4vRm9yY2UnKTtcbnZhciBTcHJpbmcgPSByZXF1aXJlKCcuL1NwcmluZycpO1xudmFyIFF1YXRlcm5pb24gPSByZXF1aXJlKCcuLi8uLi9tYXRoL1F1YXRlcm5pb24nKTtcbnZhciBWZWMzID0gcmVxdWlyZSgnLi4vLi4vbWF0aC9WZWMzJyk7XG5cbi8qKlxuICogIEEgZm9yY2UgdGhhdCByb3RhdGVzIGEgcGh5c2ljcyBib2R5IGJhY2sgdG8gdGFyZ2V0IEV1bGVyIGFuZ2xlcy5cbiAqICBKdXN0IGFzIGEgc3ByaW5nIHRyYW5zbGF0ZXMgYSBib2R5IHRvIGEgcGFydGljdWxhciBYLCBZLCBaLCBsb2NhdGlvbixcbiAqICBhIHJvdGF0aW9uYWwgc3ByaW5nIHJvdGF0ZXMgYSBib2R5IHRvIGEgcGFydGljdWxhciBYLCBZLCBaIEV1bGVyIGFuZ2xlLlxuICogICAgICBOb3RlOiB0aGVyZSBpcyBubyBwaHlzaWNhbCBGb3JjZSB0aGF0IGRvZXMgdGhpcyBpbiB0aGUgXCJyZWFsIHdvcmxkXCJcbiAqXG4gKiAgQGNsYXNzIFJvdGF0aW9uYWxTcHJpbmdcbiAqICBAY29uc3RydWN0b3JcbiAqICBAZXh0ZW5kcyBTcHJpbmdcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBvcHRpb25zIHRvIHNldCBvbiBkcmFnXG4gKi9cbmZ1bmN0aW9uIFJvdGF0aW9uYWxTcHJpbmcob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgU3ByaW5nLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5zZXRPcHRpb25zKG9wdGlvbnMpO1xufVxuXG5Sb3RhdGlvbmFsU3ByaW5nLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3ByaW5nLnByb3RvdHlwZSk7XG5Sb3RhdGlvbmFsU3ByaW5nLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFJvdGF0aW9uYWxTcHJpbmc7XG5cblJvdGF0aW9uYWxTcHJpbmcuREVGQVVMVF9PUFRJT05TID0gU3ByaW5nLkRFRkFVTFRfT1BUSU9OUztcblJvdGF0aW9uYWxTcHJpbmcuRk9SQ0VfRlVOQ1RJT05TID0gU3ByaW5nLkZPUkNFX0ZVTkNUSU9OUztcblxuLyoqIEBjb25zdCAqL1xudmFyIHBpID0gTWF0aC5QSTtcblxuZnVuY3Rpb24gX2NhbGNTdGlmZm5lc3MoKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgb3B0aW9ucy5zdGlmZm5lc3MgPSBNYXRoLnBvdygyICogcGkgLyBvcHRpb25zLnBlcmlvZCwgMik7XG59XG5cbmZ1bmN0aW9uIF9jYWxjRGFtcGluZygpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcbiAgICBvcHRpb25zLmRhbXBpbmcgPSA0ICogcGkgKiBvcHRpb25zLmRhbXBpbmdSYXRpbyAvIG9wdGlvbnMucGVyaW9kO1xufVxuXG5mdW5jdGlvbiBfaW5pdCgpIHtcbiAgICBfY2FsY1N0aWZmbmVzcy5jYWxsKHRoaXMpO1xuICAgIF9jYWxjRGFtcGluZy5jYWxsKHRoaXMpO1xufVxuXG5Sb3RhdGlvbmFsU3ByaW5nLnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgLy8gVE9ETyBmaXggbm8tY29uc29sZSBlcnJvclxuICAgIC8qIGVzbGludCBuby1jb25zb2xlOiAwICovXG4gICAgRm9yY2UucHJvdG90eXBlLnNldE9wdGlvbnMuY2FsbCh0aGlzLCBvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucy5hbmNob3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAob3B0aW9ucy5hbmNob3IgaW5zdGFuY2VvZiBRdWF0ZXJuaW9uKSB0aGlzLm9wdGlvbnMuYW5jaG9yID0gb3B0aW9ucy5hbmNob3I7XG4gICAgICAgIGlmIChvcHRpb25zLmFuY2hvciAgaW5zdGFuY2VvZiBBcnJheSkgdGhpcy5vcHRpb25zLmFuY2hvciA9IG5ldyBRdWF0ZXJuaW9uKG9wdGlvbnMuYW5jaG9yKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5wZXJpb2QgIT09IHVuZGVmaW5lZCl7XG4gICAgICAgIHRoaXMub3B0aW9ucy5wZXJpb2QgPSBvcHRpb25zLnBlcmlvZCoxMDAwO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhbXBpbmdSYXRpbyAhPT0gdW5kZWZpbmVkKSB0aGlzLm9wdGlvbnMuZGFtcGluZ1JhdGlvID0gb3B0aW9ucy5kYW1waW5nUmF0aW87XG4gICAgaWYgKG9wdGlvbnMubGVuZ3RoICE9PSB1bmRlZmluZWQpIHRoaXMub3B0aW9ucy5sZW5ndGggPSBvcHRpb25zLmxlbmd0aDtcbiAgICBpZiAob3B0aW9ucy5mb3JjZUZ1bmN0aW9uICE9PSB1bmRlZmluZWQpIHRoaXMub3B0aW9ucy5mb3JjZUZ1bmN0aW9uID0gb3B0aW9ucy5mb3JjZUZ1bmN0aW9uO1xuICAgIGlmIChvcHRpb25zLm1heExlbmd0aCAhPT0gdW5kZWZpbmVkKSB0aGlzLm9wdGlvbnMubWF4TGVuZ3RoID0gb3B0aW9ucy5tYXhMZW5ndGg7XG5cbiAgICBfaW5pdC5jYWxsKHRoaXMpO1xuICAgIHRoaXMub3B0aW9ucy5mb3JjZUZ1bmN0aW9uID0gdGhpcy5hcHBseUZvcmNlO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgdG9ycXVlIGZvcmNlIHRvIGEgcGh5c2ljcyBib2R5J3MgdG9ycXVlIGFjY3VtdWxhdG9yLlxuICpcbiAqIEBtZXRob2QgYXBwbHlGb3JjZVxuICogQHBhcmFtIHRhcmdldHMge0FycmF5LkJvZHl9IEFycmF5IG9mIGJvZGllcyB0byBhcHBseSB0b3JxdWUgdG8uXG4gKi9cblJvdGF0aW9uYWxTcHJpbmcucHJvdG90eXBlLmFwcGx5Rm9yY2UgPSBmdW5jdGlvbiBhcHBseUZvcmNlKGNvbnN0YW50LCBzb3VyY2UsIHRhcmdldCkge1xuICAgIHZhciBmb3JjZSA9IHRoaXMuX2ZvcmNlO1xuICAgIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgIHZhciBkaXNwID0gdGhpcy5kaXNwO1xuXG4gICAgdmFyIHN0aWZmbmVzcyA9IG9wdGlvbnMuc3RpZmZuZXNzO1xuICAgIHZhciBkYW1waW5nID0gb3B0aW9ucy5kYW1waW5nO1xuICAgIHZhciByZXN0TGVuZ3RoID0gb3B0aW9ucy5sZW5ndGg7XG4gICAgdmFyIGFuY2hvciA9IG9wdGlvbnMuYW5jaG9yO1xuICAgIHZhciB0eXBlID0gb3B0aW9ucy50eXBlO1xuICAgIHZhciBtYXhMZW5ndGggPSBvcHRpb25zLm1heExlbmd0aDtcblxuICAgIHZhciBpO1xuICAgIHZhciBkaXN0O1xuICAgIHZhciBtO1xuICAgIGRpc3AuY29weShhbmNob3Iuc3ViKHRhcmdldC5nZXRPcmllbnRhdGlvbigpKSk7XG4gICAgZGlzdCA9IGRpc3AubGVuZ3RoKCkgLSByZXN0TGVuZ3RoO1xuICAgIGNvbnNvbGUubG9nKGRpc3QpXG5cbiAgICBpZiAoZGlzdCA9PT0gMCkgcmV0dXJuIG5ldyBWZWMzKCk7XG5cbiAgICAvL2lmIGRhbXBpbmdSYXRpbyBzcGVjaWZpZWQsIHRoZW4gb3ZlcnJpZGUgc3RyZW5ndGggYW5kIGRhbXBpbmdcbiAgICBtICAgICAgPSB0YXJnZXQuX21hc3M7XG4gICAgc3RpZmZuZXNzICo9IG07XG4gICAgZGFtcGluZyAgICo9IG07XG5cbiAgICBmb3JjZS5jb3B5KFZlYzMubm9ybWFsaXplKGRpc3ApLnNjYWxlKHN0aWZmbmVzcyAqIHR5cGUoZGlzdCwgbWF4TGVuZ3RoKSkpO1xuXG4gICAgaWYgKGRhbXBpbmcpIGZvcmNlLmFkZChWZWMzLnNjYWxlKHRhcmdldC5hbmd1bGFyVmVsb2NpdHksIC1kYW1waW5nKSk7XG5cbiAgICB0YXJnZXQuYXBwbHlUb3JxdWUoZm9yY2UpO1xuICAgIHJldHVybiBuZXcgVmVjMygpO1xufTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIHRoZSBwb3RlbnRpYWwgZW5lcmd5IG9mIHRoZSByb3RhdGlvbmFsIHNwcmluZy5cbiAqXG4gKiBAbWV0aG9kIGdldEVuZXJneVxuICogQHBhcmFtIFt0YXJnZXRzXSB0YXJnZXQgVGhlIHBoeXNpY3MgYm9keSBhdHRhY2hlZCB0byB0aGUgc3ByaW5nXG4gKi9cblJvdGF0aW9uYWxTcHJpbmcucHJvdG90eXBlLmdldEVuZXJneSA9IGZ1bmN0aW9uIGdldEVuZXJneSh0YXJnZXRzKSB7XG4gICAgdmFyIG9wdGlvbnMgICAgID0gdGhpcy5vcHRpb25zO1xuICAgIHZhciByZXN0TGVuZ3RoICA9IG9wdGlvbnMubGVuZ3RoO1xuICAgIHZhciBhbmNob3IgICAgICA9IG9wdGlvbnMuYW5jaG9yO1xuICAgIHZhciBzdHJlbmd0aCAgICA9IG9wdGlvbnMuc3RpZmZuZXNzO1xuXG4gICAgdmFyIGVuZXJneSA9IDAuMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhcmdldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IHRhcmdldHNbaV07XG4gICAgICAgIHZhciBkaXN0ID0gYW5jaG9yLnN1Yih0YXJnZXQub3JpZW50YXRpb24pLm5vcm0oKSAtIHJlc3RMZW5ndGg7XG4gICAgICAgIGVuZXJneSArPSAwLjUgKiBzdHJlbmd0aCAqIGRpc3QgKiBkaXN0O1xuICAgIH1cbiAgICByZXR1cm4gZW5lcmd5O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSb3RhdGlvbmFsU3ByaW5nOyIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IHdpbGxAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL0ZvcmNlJyk7XG52YXIgVmVjMyA9IHJlcXVpcmUoJy4uLy4uL21hdGgvVmVjMycpO1xuXG4vKipcbiAqICBBIGZvcmNlIHRoYXQgbW92ZXMgYSBwaHlzaWNzIGJvZHkgdG8gYSBsb2NhdGlvbiB3aXRoIGEgc3ByaW5nIG1vdGlvbi5cbiAqICAgIFRoZSBib2R5IGNhbiBiZSBtb3ZlZCB0byBhbm90aGVyIHBoeXNpY3MgYm9keSwgb3IgYW4gYW5jaG9yIHBvaW50LlxuICpcbiAqICBAY2xhc3MgU3ByaW5nXG4gKiAgQGNvbnN0cnVjdG9yXG4gKiAgQGV4dGVuZHMgRm9yY2VcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBvcHRpb25zIHRvIHNldCBvbiBkcmFnXG4gKi9cbmZ1bmN0aW9uIFNwcmluZyhvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmNyZWF0ZSh0aGlzLmNvbnN0cnVjdG9yLkRFRkFVTFRfT1BUSU9OUyk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgRm9yY2UuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICAgIGlmIChvcHRpb25zKSB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAvL3JlZ2lzdGVyc1xuICAgIHRoaXMuZGlzcCA9IG5ldyBWZWMzKDAsMCwwKTtcbiAgICB0aGlzLl9mb3JjZSA9IG5ldyBWZWMzKCk7XG5cbiAgICBfaW5pdC5jYWxsKHRoaXMpO1xufVxuXG5TcHJpbmcucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGb3JjZS5wcm90b3R5cGUpO1xuU3ByaW5nLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNwcmluZztcblxuLyoqIEBjb25zdCAqL1xudmFyIHBpID0gTWF0aC5QSTtcbnZhciBNSU5fUEVSSU9EID0gMDtcblxuLyoqXG4gKiBAcHJvcGVydHkgU3ByaW5nLkZPUkNFX0ZVTkNUSU9OU1xuICogQHR5cGUgT2JqZWN0XG4gKiBAcHJvdGVjdGVkXG4gKiBAc3RhdGljXG4gKi9cblNwcmluZy5GT1JDRV9GVU5DVElPTlMgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBIEZFTkUgKEZpbml0ZWx5IEV4dGVuc2libGUgTm9ubGluZWFyIEVsYXN0aWMpIHNwcmluZyBmb3JjZVxuICAgICAqICAgICAgc2VlOiBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZFTkVcbiAgICAgKiBAYXR0cmlidXRlIEZFTkVcbiAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkaXN0IGN1cnJlbnQgZGlzdGFuY2UgdGFyZ2V0IGlzIGZyb20gc291cmNlIGJvZHlcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gck1heCBtYXhpbXVtIHJhbmdlIG9mIGluZmx1ZW5jZVxuICAgICAqIEByZXR1cm4ge051bWJlcn0gdW5zY2FsZWQgZm9yY2VcbiAgICAgKi9cbiAgICBGRU5FIDogZnVuY3Rpb24oZGlzdCwgck1heCkge1xuICAgICAgICB2YXIgck1heFNtYWxsID0gck1heCAqIC45OTtcbiAgICAgICAgdmFyIHIgPSBNYXRoLm1heChNYXRoLm1pbihkaXN0LCByTWF4U21hbGwpLCAtck1heFNtYWxsKTtcbiAgICAgICAgcmV0dXJuIHIgLyAoMSAtIHIgKiByLyhyTWF4ICogck1heCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBIEhvb2tlYW4gc3ByaW5nIGZvcmNlLCBsaW5lYXIgaW4gdGhlIGRpc3BsYWNlbWVudFxuICAgICAqICAgICAgc2VlOiBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hvb2tlJ3NfbGF3XG4gICAgICogQGF0dHJpYnV0ZSBGRU5FXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZGlzdCBjdXJyZW50IGRpc3RhbmNlIHRhcmdldCBpcyBmcm9tIHNvdXJjZSBib2R5XG4gICAgICogQHJldHVybiB7TnVtYmVyfSB1bnNjYWxlZCBmb3JjZVxuICAgICAqL1xuICAgIEhPT0sgOiBmdW5jdGlvbihkaXN0KSB7XG4gICAgICAgIHJldHVybiBkaXN0O1xuICAgIH1cbn07XG5cbi8qKlxuICogQHByb3BlcnR5IFNwcmluZy5ERUZBVUxUX09QVElPTlNcbiAqIEB0eXBlIE9iamVjdFxuICogQHByb3RlY3RlZFxuICogQHN0YXRpY1xuICovXG5TcHJpbmcuREVGQVVMVF9PUFRJT05TID0ge1xuXG4gICAgLyoqXG4gICAgICogVGhlIGFtb3VudCBvZiB0aW1lIGluIG1pbGxpc2Vjb25kcyB0YWtlbiBmb3Igb25lIGNvbXBsZXRlIG9zY2lsbGF0aW9uXG4gICAgICogd2hlbiB0aGVyZSBpcyBubyBkYW1waW5nXG4gICAgICogICAgUmFuZ2UgOiBbMTUwLCBJbmZpbml0eV1cbiAgICAgKiBAYXR0cmlidXRlIHBlcmlvZFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqIEBkZWZhdWx0IDMwMFxuICAgICAqL1xuICAgIHBlcmlvZCA6IDMwMCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYW1waW5nIG9mIHRoZSBzcHJpbmcuXG4gICAgICogICAgUmFuZ2UgOiBbMCwgMV1cbiAgICAgKiAgICAwID0gbm8gZGFtcGluZywgYW5kIHRoZSBzcHJpbmcgd2lsbCBvc2NpbGxhdGUgZm9yZXZlclxuICAgICAqICAgIDEgPSBjcml0aWNhbGx5IGRhbXBlZCAodGhlIHNwcmluZyB3aWxsIG5ldmVyIG9zY2lsbGF0ZSlcbiAgICAgKiBAYXR0cmlidXRlIGRhbXBpbmdSYXRpb1xuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqIEBkZWZhdWx0IDAuMVxuICAgICAqL1xuICAgIGRhbXBpbmdSYXRpbyA6IDAuMSxcblxuICAgIC8qKlxuICAgICAqIFRoZSByZXN0IGxlbmd0aCBvZiB0aGUgc3ByaW5nXG4gICAgICogICAgUmFuZ2UgOiBbMCwgSW5maW5pdHldXG4gICAgICogQGF0dHJpYnV0ZSBsZW5ndGhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKiBAZGVmYXVsdCAwXG4gICAgICovXG4gICAgbGVuZ3RoIDogMCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBtYXhpbXVtIGxlbmd0aCBvZiB0aGUgc3ByaW5nIChmb3IgYSBGRU5FIHNwcmluZylcbiAgICAgKiAgICBSYW5nZSA6IFswLCBJbmZpbml0eV1cbiAgICAgKiBAYXR0cmlidXRlIGxlbmd0aFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqIEBkZWZhdWx0IEluZmluaXR5XG4gICAgICovXG4gICAgbWF4TGVuZ3RoIDogSW5maW5pdHksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbG9jYXRpb24gb2YgdGhlIHNwcmluZydzIGFuY2hvciwgaWYgbm90IGFub3RoZXIgcGh5c2ljcyBib2R5XG4gICAgICpcbiAgICAgKiBAYXR0cmlidXRlIGFuY2hvclxuICAgICAqIEB0eXBlIEFycmF5XG4gICAgICogQG9wdGlvbmFsXG4gICAgICovXG4gICAgYW5jaG9yIDogdW5kZWZpbmVkLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHR5cGUgb2Ygc3ByaW5nIGZvcmNlXG4gICAgICogQGF0dHJpYnV0ZSB0eXBlXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKi9cbiAgICB0eXBlIDogU3ByaW5nLkZPUkNFX0ZVTkNUSU9OUy5IT09LLFxuXG4gICAgZm9yY2VGdW5jdGlvbjogYXBwbHlGb3JjZVxufTtcblxuZnVuY3Rpb24gX2NhbGNTdGlmZm5lc3MoKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgb3B0aW9ucy5zdGlmZm5lc3MgPSBNYXRoLnBvdygyICogcGkgLyBvcHRpb25zLnBlcmlvZCoxMDAwLCAyKTtcbn1cblxuZnVuY3Rpb24gX2NhbGNEYW1waW5nKCkge1xuICAgIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgIG9wdGlvbnMuZGFtcGluZyA9IDQgKiBwaSAqIG9wdGlvbnMuZGFtcGluZ1JhdGlvIC8gb3B0aW9ucy5wZXJpb2QqMTAwMDtcbn1cblxuZnVuY3Rpb24gX2luaXQoKSB7XG4gICAgX2NhbGNTdGlmZm5lc3MuY2FsbCh0aGlzKTtcbiAgICBfY2FsY0RhbXBpbmcuY2FsbCh0aGlzKTtcbn1cblxuLyoqXG4gKiBCYXNpYyBvcHRpb25zIHNldHRlclxuICpcbiAqIEBtZXRob2Qgc2V0T3B0aW9uc1xuICogQHBhcmFtIG9wdGlvbnMge09iamVjdH1cbiAqL1xuU3ByaW5nLnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgLy8gVE9ETyBmaXggbm8tY29uc29sZSBlcnJvclxuICAgIC8qIGVzbGludCBuby1jb25zb2xlOiAwICovXG5cbiAgICBpZiAob3B0aW9ucy5hbmNob3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAob3B0aW9ucy5hbmNob3IucG9zaXRpb24gaW5zdGFuY2VvZiBWZWMzKSB0aGlzLm9wdGlvbnMuYW5jaG9yID0gb3B0aW9ucy5hbmNob3IucG9zaXRpb247XG4gICAgICAgIGlmIChvcHRpb25zLmFuY2hvciBpbnN0YW5jZW9mIFZlYzMpIHRoaXMub3B0aW9ucy5hbmNob3IgPSBvcHRpb25zLmFuY2hvcjtcbiAgICAgICAgaWYgKG9wdGlvbnMuYW5jaG9yIGluc3RhbmNlb2YgQXJyYXkpICB0aGlzLm9wdGlvbnMuYW5jaG9yID0gbmV3IFZlYzMob3B0aW9ucy5hbmNob3IpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnBlcmlvZCAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgaWYgKG9wdGlvbnMucGVyaW9kIDwgTUlOX1BFUklPRCkge1xuICAgICAgICAgICAgb3B0aW9ucy5wZXJpb2QgPSBNSU5fUEVSSU9EO1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdUaGUgcGVyaW9kIG9mIGEgU3ByaW5nVHJhbnNpdGlvbiBpcyBjYXBwZWQgYXQgJyArIE1JTl9QRVJJT0QgKyAnIG1zLiBVc2UgYSBTbmFwVHJhbnNpdGlvbiBmb3IgZmFzdGVyIHRyYW5zaXRpb25zJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zLnBlcmlvZCA9IG9wdGlvbnMucGVyaW9kO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhbXBpbmdSYXRpbyAhPT0gdW5kZWZpbmVkKSB0aGlzLm9wdGlvbnMuZGFtcGluZ1JhdGlvID0gb3B0aW9ucy5kYW1waW5nUmF0aW87XG4gICAgaWYgKG9wdGlvbnMubGVuZ3RoICE9PSB1bmRlZmluZWQpIHRoaXMub3B0aW9ucy5sZW5ndGggPSBvcHRpb25zLmxlbmd0aDtcbiAgICBpZiAob3B0aW9ucy50eXBlICE9PSB1bmRlZmluZWQpIHRoaXMub3B0aW9ucy50eXBlID0gb3B0aW9ucy50eXBlO1xuICAgIGlmIChvcHRpb25zLm1heExlbmd0aCAhPT0gdW5kZWZpbmVkKSB0aGlzLm9wdGlvbnMubWF4TGVuZ3RoID0gb3B0aW9ucy5tYXhMZW5ndGg7XG5cbiAgICBfaW5pdC5jYWxsKHRoaXMpO1xuICAgIEZvcmNlLnByb3RvdHlwZS5zZXRPcHRpb25zLmNhbGwodGhpcywgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBzcHJpbmcgZm9yY2UgdG8gYSBwaHlzaWNzIGJvZHkncyBmb3JjZSBhY2N1bXVsYXRvci5cbiAqXG4gKiBAbWV0aG9kIGFwcGx5Rm9yY2VcbiAqIEBwYXJhbSB0YXJnZXRzIHtBcnJheS5Cb2R5fSBBcnJheSBvZiBib2RpZXMgdG8gYXBwbHkgZm9yY2UgdG8uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5Rm9yY2UoY29uc3RhbnQsIHNvdXJjZSwgdGFyZ2V0KSB7XG4gICAgdmFyIGRpc3AgPSB0aGlzLmRpc3A7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICB2YXIgc3RpZmZuZXNzID0gb3B0aW9ucy5zdGlmZm5lc3M7XG4gICAgdmFyIGRhbXBpbmcgPSBvcHRpb25zLmRhbXBpbmc7XG4gICAgdmFyIHJlc3RMZW5ndGggPSBvcHRpb25zLmxlbmd0aDtcbiAgICB2YXIgbWF4TGVuZ3RoID0gb3B0aW9ucy5tYXhMZW5ndGg7XG4gICAgdmFyIGFuY2hvciA9IG9wdGlvbnMuYW5jaG9yIHx8IHNvdXJjZS5fcG9zaXRpb247XG4gICAgdmFyIHR5cGUgPSBvcHRpb25zLnR5cGU7XG5cbiAgICB2YXIgaTtcbiAgICB2YXIgdGFyZ2V0O1xuICAgIHZhciBwMjtcbiAgICB2YXIgdjI7XG4gICAgdmFyIGRpc3Q7XG4gICAgdmFyIG07XG5cbiAgICBwMiA9IHRhcmdldC5fcG9zaXRpb247XG4gICAgdjIgPSB0YXJnZXQuX3ZlbG9jaXR5O1xuXG4gICAgZGlzcC5jb3B5KFZlYzMuc3VidHJhY3QoYW5jaG9yLHAyKSk7XG4gICAgZGlzdCA9IGRpc3AubGVuZ3RoKCkgLSByZXN0TGVuZ3RoO1xuXG4gICAgaWYgKGRpc3QgPT09IDApIHJldHVybiBuZXcgVmVjMygpO1xuXG4gICAgLy9pZiBkYW1waW5nUmF0aW8gc3BlY2lmaWVkLCB0aGVuIG92ZXJyaWRlIHN0cmVuZ3RoIGFuZCBkYW1waW5nXG4gICAgbSAgICAgID0gdGFyZ2V0Ll9tYXNzO1xuICAgIHN0aWZmbmVzcyAqPSBtO1xuICAgIGRhbXBpbmcgICAqPSBtO1xuXG4gICAgdGhpcy5fZm9yY2UuY29weShWZWMzLm5vcm1hbGl6ZShkaXNwKS5zY2FsZSgoc3RpZmZuZXNzICogdHlwZShkaXN0LCBtYXhMZW5ndGgpKSkpO1xuXG4gICAgaWYgKGRhbXBpbmcpXG4gICAgICAgIGlmIChzb3VyY2UpIHRoaXMuX2ZvcmNlLmFkZChWZWMzLnN1YnRyYWN0KHYyLCBzb3VyY2UuX3ZlbG9jaXR5KS5zY2FsZSgtZGFtcGluZykpO1xuICAgICAgICBlbHNlIHRoaXMuX2ZvcmNlLmFkZChWZWMzLnNjYWxlKHYyLC1kYW1waW5nKSk7XG5cbiAgICByZXR1cm4gdGhpcy5fZm9yY2U7XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgdGhlIHBvdGVudGlhbCBlbmVyZ3kgb2YgdGhlIHNwcmluZy5cbiAqXG4gKiBAbWV0aG9kIGdldEVuZXJneVxuICogQHBhcmFtIFt0YXJnZXRzXSB0YXJnZXQgIFRoZSBwaHlzaWNzIGJvZHkgYXR0YWNoZWQgdG8gdGhlIHNwcmluZ1xuICogQHJldHVybiB7c291cmNlfSAgICAgICAgIFRoZSBwb3RlbnRpYWwgZW5lcmd5IG9mIHRoZSBzcHJpbmdcbiAqL1xuU3ByaW5nLnByb3RvdHlwZS5nZXRFbmVyZ3kgPSBmdW5jdGlvbiBnZXRFbmVyZ3kodGFyZ2V0cywgc291cmNlKSB7XG4gICAgdmFyIG9wdGlvbnMgICAgID0gdGhpcy5vcHRpb25zO1xuICAgIHZhciByZXN0TGVuZ3RoICA9IG9wdGlvbnMubGVuZ3RoO1xuICAgIHZhciBhbmNob3IgICAgICA9IChzb3VyY2UpID8gc291cmNlLl9wb3NpdGlvbiA6IG9wdGlvbnMuYW5jaG9yO1xuICAgIHZhciBzdHJlbmd0aCAgICA9IG9wdGlvbnMuc3RpZmZuZXNzO1xuXG4gICAgdmFyIGVuZXJneSA9IDAuMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhcmdldHMubGVuZ3RoOyBpKyspe1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGFyZ2V0c1tpXTtcbiAgICAgICAgdmFyIGRpc3QgPSBhbmNob3Iuc3ViKHRhcmdldC5fcG9zaXRpb24pLm5vcm0oKSAtIHJlc3RMZW5ndGg7XG4gICAgICAgIGVuZXJneSArPSAwLjUgKiBzdHJlbmd0aCAqIGRpc3QgKiBkaXN0O1xuICAgIH1cbiAgICByZXR1cm4gZW5lcmd5O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTcHJpbmc7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBhZGFtQGZhbW8udXMsIHdpbGxAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuXG4vKipcbiAqIE9yZGluYXJ5IERpZmZlcmVudGlhbCBFcXVhdGlvbiAoT0RFKSBJbnRlZ3JhdG9yLlxuICogTWFuYWdlcyB1cGRhdGluZyBhIHBoeXNpY3MgYm9keSdzIHN0YXRlIG92ZXIgdGltZS5cbiAqXG4gKiAgcCA9IHBvc2l0aW9uLCB2ID0gdmVsb2NpdHksIG0gPSBtYXNzLCBmID0gZm9yY2UsIGR0ID0gY2hhbmdlIGluIHRpbWVcbiAqXG4gKiAgICAgIHYgPC0gdiArIGR0ICogZiAvIG1cbiAqICAgICAgcCA8LSBwICsgZHQgKiB2XG4gKlxuICogIHEgPSBvcmllbnRhdGlvbiwgdyA9IGFuZ3VsYXIgdmVsb2NpdHksIEwgPSBhbmd1bGFyIG1vbWVudHVtXG4gKlxuICogICAgICBMIDwtIEwgKyBkdCAqIHRcbiAqICAgICAgcSA8LSBxICsgZHQvMiAqIHEgKiB3XG4gKlxuICogQGNsYXNzIFN5bXBsZWN0aWNFdWxlclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBPcHRpb25zIHRvIHNldFxuICovXG52YXIgU3ltcGxlY3RpY0V1bGVyID0ge307XG52YXIgVmVjMyA9IHJlcXVpcmUoJy4uLy4uL21hdGgvVmVjMycpO1xuXG4vKlxuICogVXBkYXRlcyB0aGUgdmVsb2NpdHkgb2YgYSBwaHlzaWNzIGJvZHkgZnJvbSBpdHMgYWNjdW11bGF0ZWQgZm9yY2UuXG4gKiAgICAgIHYgPC0gdiArIGR0ICogZiAvIG1cbiAqXG4gKiBAbWV0aG9kIGludGVncmF0ZVZlbG9jaXR5XG4gKiBAcGFyYW0ge0JvZHl9IHBoeXNpY3MgYm9keVxuICogQHBhcmFtIHtOdW1iZXJ9IGR0IGRlbHRhIHRpbWVcbiAqL1xuU3ltcGxlY3RpY0V1bGVyLmludGVncmF0ZVZlbG9jaXR5ID0gZnVuY3Rpb24gaW50ZWdyYXRlVmVsb2NpdHkoYm9keSwgZHQpIHtcbiAgICB2YXIgdiA9IGJvZHkuZ2V0VmVsb2NpdHkoKTtcbiAgICB2YXIgdyA9IDEvYm9keS5nZXRNYXNzKCk7XG4gICAgdmFyIGYgPSBib2R5LmdldEZvcmNlKCk7XG4gICAgaWYgKGYuaXNaZXJvKCkpIHJldHVybjtcblxuICAgIHYuYWRkKFZlYzMuc2NhbGUoZiwgKGR0ICogdykpKTtcbn07XG5cbi8qXG4gKiBVcGRhdGVzIHRoZSBwb3NpdGlvbiBvZiBhIHBoeXNpY3MgYm9keSBmcm9tIGl0cyB2ZWxvY2l0eS5cbiAqICAgICAgcCA8LSBwICsgZHQgKiB2XG4gKlxuICogQG1ldGhvZCBpbnRlZ3JhdGVQb3NpdGlvblxuICogQHBhcmFtIHtCb2R5fSBwaHlzaWNzIGJvZHlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkdCBkZWx0YSB0aW1lXG4gKi9cblN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uIGludGVncmF0ZVBvc2l0aW9uKGJvZHksIGR0KSB7XG4gICAgdmFyIHAgPSBib2R5LmdldFBvc2l0aW9uKCk7XG4gICAgdmFyIHYgPSBib2R5LmdldFZlbG9jaXR5KCk7XG5cbiAgICBwLmFkZChWZWMzLnNjYWxlKHYsIGR0KSk7XG59O1xuXG4vKlxuICogVXBkYXRlcyB0aGUgYW5ndWxhciBtb21lbnR1bSBvZiBhIHBoeXNpY3MgYm9keSBmcm9tIGl0cyBhY2N1bXVsZWQgdG9ycXVlLlxuICogICAgICBMIDwtIEwgKyBkdCAqIHRcbiAqXG4gKiBAbWV0aG9kIGludGVncmF0ZUFuZ3VsYXJNb21lbnR1bVxuICogQHBhcmFtIHtCb2R5fSBwaHlzaWNzIGJvZHkgKGV4Y2VwdCBhIHBhcnRpY2xlKVxuICogQHBhcmFtIHtOdW1iZXJ9IGR0IGRlbHRhIHRpbWVcbiAqL1xuU3ltcGxlY3RpY0V1bGVyLmludGVncmF0ZUFuZ3VsYXJNb21lbnR1bSA9IGZ1bmN0aW9uIGludGVncmF0ZUFuZ3VsYXJNb21lbnR1bShib2R5LCBkdCkge1xuICAgIHZhciBMID0gYm9keS5hbmd1bGFyTW9tZW50dW07XG4gICAgdmFyIHQgPSBib2R5LnRvcnF1ZTtcblxuICAgIGlmICh0LmlzWmVybygpKSByZXR1cm47XG5cbiAgICBMLmFkZCh0LnNjYWxlKGR0KSk7XG4gICAgdC5jbGVhcigpO1xufTtcblxuLypcbiAqIFVwZGF0ZXMgdGhlIG9yaWVudGF0aW9uIG9mIGEgcGh5c2ljcyBib2R5IGZyb20gaXRzIGFuZ3VsYXIgdmVsb2NpdHkuXG4gKiAgICAgIHEgPC0gcSArIGR0LzIgKiBxICogd1xuICpcbiAqIEBtZXRob2QgaW50ZWdyYXRlT3JpZW50YXRpb25cbiAqIEBwYXJhbSB7Qm9keX0gcGh5c2ljcyBib2R5IChleGNlcHQgYSBwYXJ0aWNsZSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkdCBkZWx0YSB0aW1lXG4gKi9cblN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVPcmllbnRhdGlvbiA9IGZ1bmN0aW9uIGludGVncmF0ZU9yaWVudGF0aW9uKGJvZHksIGR0KSB7XG4gICAgdmFyIHEgPSBib2R5Lm9yaWVudGF0aW9uO1xuICAgIHZhciB3ID0gYm9keS5hbmd1bGFyVmVsb2NpdHk7XG5cbiAgICBpZiAody5pc1plcm8oKSkgcmV0dXJuO1xuICAgIHEuYWRkKHEubXVsdGlwbHkodykuc2NhbGFyTXVsdGlwbHkoMC41ICogZHQpKS5wdXQocSk7XG4vLyAgICAgICAgcS5ub3JtYWxpemUucHV0KHEpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTeW1wbGVjdGljRXVsZXI7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NvcmUvRW50aXR5UmVnaXN0cnknKTtcbnZhciBMaWZ0Q29sbGVjdGlvbiA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0xpZnQnKTtcblxuLyoqXG4gKiBMaWZ0U3lzdGVtIGlzIHJlc3BvbnNpYmxlIGZvciB0cmF2ZXJzaW5nIHRoZSBzY2VuZSBncmFwaCBhbmRcbiAqICAgdXBkYXRpbmcgdGhlIFRyYW5zZm9ybXMsIFNpemVzLCBhbmQgT3BhY2l0aWVzIG9mIHRoZSBlbnRpdGllcy5cbiAqXG4gKiBAY2xhc3MgIExpZnRTeXN0ZW1cbiAqIEBzeXN0ZW1cbiAqIEBzaW5nbGV0b25cbiAqL1xudmFyIExpZnRTeXN0ZW0gPSB7fTtcblxuLyoqXG4gKiB1cGRhdGUgaXRlcmF0ZXMgb3ZlciBlYWNoIG9mIHRoZSBDb250ZXh0cyB0aGF0IHdlcmUgcmVnaXN0ZXJlZCBhbmRcbiAqICAga2lja3Mgb2YgdGhlIHJlY3Vyc2l2ZSB1cGRhdGluZyBvZiB0aGVpciBlbnRpdGllcy5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICovXG52YXIgdGVzdCA9IFtdO1xuTGlmdFN5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIHJvb3RQYXJhbXM7XG4gICAgdmFyIGxpZnQ7XG4gICAgdmFyIGNsZWFudXAgPSBbXTtcblxuICAgIExpZnRDb2xsZWN0aW9uLmZvckVhY2goZnVuY3Rpb24oZW50aXR5KSB7XG4gICAgICAgIGxpZnQgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdMaWZ0Q29tcG9uZW50Jyk7XG4gICAgICAgIHJvb3RQYXJhbXMgPSBsaWZ0Ll91cGRhdGUoKTtcbiAgICAgICAgcm9vdFBhcmFtcy51bnNoaWZ0KGVudGl0eSk7XG4gICAgICAgIGNvcmVVcGRhdGVBbmRGZWVkLmFwcGx5KG51bGwsIHJvb3RQYXJhbXMpO1xuXG4gICAgICAgIGlmIChsaWZ0LmRvbmUpIGNsZWFudXAucHVzaChlbnRpdHkpO1xuICAgIH0pO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGVhbnVwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNsZWFudXBbaV0ucmVtb3ZlQ29tcG9uZW50KCdMaWZ0Q29tcG9uZW50Jyk7XG4gICAgICAgIEVudGl0eVJlZ2lzdHJ5LmRlcmVnaXN0ZXIoY2xlYW51cFtpXSwgJ0xpZnQnKTtcbiAgICB9XG59XG5cbi8qKlxuICogY29yZVVwZGF0ZUFuZEZlZWQgZmVlZHMgcGFyZW50IGluZm9ybWF0aW9uIHRvIGFuIGVudGl0eSBhbmQgc28gdGhhdFxuICogICBlYWNoIGVudGl0eSBjYW4gdXBkYXRlIHRoZWlyIHRyYW5zZm9ybSwgc2l6ZSwgYW5kIG9wYWNpdHkuICBJdCBcbiAqICAgd2lsbCB0aGVuIHBhc3MgZG93biBpbnZhbGlkYXRpb24gc3RhdGVzIGFuZCB2YWx1ZXMgdG8gYW55IGNoaWxkcmVuLlxuICpcbiAqIEBtZXRob2QgY29yZVVwZGF0ZUFuZEZlZWRcbiAqIEBwcml2YXRlXG4gKiAgIFxuICogQHBhcmFtICB7RW50aXR5fSAgZW50aXR5ICAgICAgICAgICBFbnRpdHkgaW4gdGhlIHNjZW5lIGdyYXBoXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICB0cmFuc2Zvcm1SZXBvcnQgIGJpdFNjaGVtZSByZXBvcnQgb2YgdHJhbnNmb3JtIGludmFsaWRhdGlvbnNcbiAqIEBwYXJhbSAge0FycmF5fSAgIGluY29taW5nTWF0cml4ICAgcGFyZW50IHRyYW5zZm9ybSBhcyBhIEZsb2F0MzIgQXJyYXlcbiAqIEBwYXJhbSAge051bWJlcn0gIHNpemVSZXBvcnQgICAgICAgYml0U2NoZW1lIHJlcG9ydCBvZiBzaXplIGludmFsaWRhdGlvbnNcbiAqIEBwYXJhbSAge0FycmF5fSAgIGluY29taW5nU2l6ZSAgICAgcGFyZW50IHNpemUgaW4gcGl4ZWxzXG4gKiBAcGFyYW0gIHtCb29sZWFufSBvcGFjaXR5UmVwb3J0ICAgIGJvb2xlYW4gcmVwb3J0IG9mIG9wYWNpdHkgaW52YWxpZGF0aW9uXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICBpbmNvbWluZ09wYWNpdHkgIHBhcmVudCBvcGFjaXR5XG4gKi9cbmZ1bmN0aW9uIGNvcmVVcGRhdGVBbmRGZWVkKGVudGl0eSwgdHJhbnNmb3JtUmVwb3J0LCBpbmNvbWluZ01hdHJpeCwgc2l6ZVJlcG9ydCwgaW5jb21pbmdTaXplLCBvcGFjaXR5UmVwb3J0LCBpbmNvbWluZ09wYWNpdHkpIHtcbiAgICBpZiAoIWVudGl0eSkgcmV0dXJuO1xuICAgIHZhciB0cmFuc2Zvcm0gPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCd0cmFuc2Zvcm0nKTtcbiAgICB2YXIgc2l6ZSAgICAgID0gZW50aXR5LmdldENvbXBvbmVudCgnc2l6ZScpO1xuICAgIHZhciBvcGFjaXR5ICAgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdvcGFjaXR5Jyk7XG4gICAgdmFyIGNoaWxkcmVuICA9IGVudGl0eS5nZXRDaGlsZHJlbigpO1xuICAgIHZhciBpID0gY2hpbGRyZW4ubGVuZ3RoO1xuXG4gICAgdHJhbnNmb3JtUmVwb3J0ID0gdHJhbnNmb3JtLl91cGRhdGUodHJhbnNmb3JtUmVwb3J0LCBpbmNvbWluZ01hdHJpeCk7XG4gICAgc2l6ZVJlcG9ydCAgICAgID0gc2l6ZS5fdXBkYXRlKHNpemVSZXBvcnQsIGluY29taW5nU2l6ZSk7XG4gICAgb3BhY2l0eVJlcG9ydCAgID0gb3BhY2l0eS5fdXBkYXRlKG9wYWNpdHlSZXBvcnQsIGluY29taW5nT3BhY2l0eSk7XG5cbiAgICB3aGlsZSAoaS0tKSBcbiAgICAgICAgY29yZVVwZGF0ZUFuZEZlZWQoXG4gICAgICAgICAgICBjaGlsZHJlbltpXSxcbiAgICAgICAgICAgIHRyYW5zZm9ybVJlcG9ydCxcbiAgICAgICAgICAgIHRyYW5zZm9ybS5fbWF0cml4LFxuICAgICAgICAgICAgc2l6ZVJlcG9ydCxcbiAgICAgICAgICAgIHNpemUuX2dsb2JhbFNpemUsXG4gICAgICAgICAgICBvcGFjaXR5UmVwb3J0LFxuICAgICAgICAgICAgb3BhY2l0eS5fZ2xvYmFsT3BhY2l0eSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlmdFN5c3RlbTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBFbmdpbmUgPSByZXF1aXJlKCdmYW1vdXMvY29yZS9FbmdpbmUnKTtcbnZhciBTdXJmYWNlID0gcmVxdWlyZSgnZmFtb3VzL2NvcmUvQ29tcG9uZW50cy9TdXJmYWNlJyk7XG52YXIgUGFydGljbGUgPSByZXF1aXJlKCdmYW1vdXMvcGh5c2ljcy9ib2RpZXMvUGFydGljbGUnKTtcbnZhciBQaHlzaWNzU3lzdGVtID0gcmVxdWlyZSgnZmFtb3VzL3BoeXNpY3MvUGh5c2ljc1N5c3RlbScpO1xudmFyIFBoeXNpY3NDb21wb25lbnQgPSByZXF1aXJlKCdmYW1vdXMvcGh5c2ljcy9QaHlzaWNzQ29tcG9uZW50Jyk7XG52YXIgUm90YXRpb25hbFNwcmluZyA9IHJlcXVpcmUoJ2ZhbW91cy9waHlzaWNzL2ZvcmNlcy9Sb3RhdGlvbmFsU3ByaW5nJyk7XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY29udGV4dCA9IEVuZ2luZS5jcmVhdGVDb250ZXh0KHtoYXNDYW1lcmE6IHRydWV9KTtcblxuICAgIHZhciBjaGlsZCA9IGNvbnRleHQuYWRkQ2hpbGQoKTtcbiAgICBjaGlsZC5nZXRDb21wb25lbnQoJ3NpemUnKS5zZXRQaXhlbHMoMjAwLCAyMDAsIDApO1xuICAgIGNoaWxkLmFkZENvbXBvbmVudChTdXJmYWNlLCB7XG4gICAgICAgIGNvbnRlbnQ6ICc8aW1nIHNyYz1cIi4vaW1hZ2VzL2ZhbW91c19sb2dvLnBuZ1wiLz4nLFxuICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICB0ZXh0QWxpZ246J2NlbnRlcidcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHZhciBib2R5ID0gY2hpbGQuYWRkQ29tcG9uZW50KFBoeXNpY3NDb21wb25lbnQpLmdldEJvZHkoKTtcbiAgICBib2R5LnNldEFuZ3VsYXJNb21lbnR1bShbMC45LCAwLjksIDBdKTtcbiAgICBcbiAgICB2YXIgYW5jaG9yID0gbmV3IFBhcnRpY2xlKHtcbiAgICAgICAgcG9zaXRpb246IFswLCAwLCAwXVxuICAgIH0pO1xuXG4gICAgdmFyIHRvcnF1ZVNwcmluZyA9IG5ldyBSb3RhdGlvbmFsU3ByaW5nKHtcbiAgICAgICAgcGVyaW9kOiAwLjAzLFxuICAgICAgICBkYW1waW5nUmF0aW86IDAsIFxuICAgICAgICBhbmNob3I6IFswLDAsMF1cbiAgICB9KTtcbiAgICBQaHlzaWNzU3lzdGVtLmF0dGFjaCh0b3JxdWVTcHJpbmcsIHVuZGVmaW5lZCwgYm9keSk7XG59XG5cblxuXG4iLCIndXNlIHN0cmljdCc7XG4vLyB2YXIgZGlzdGFuY2UgPSByZXF1aXJlKCcuL2V4YW1wbGVzL2Rpc3RhbmNlJyk7XG4vLyB2YXIgc3ByaW5nID0gcmVxdWlyZSgnLi9leGFtcGxlcy9zcHJpbmcnKTtcbi8vIHZhciBkcmFnID0gcmVxdWlyZSgnLi9leGFtcGxlcy9kcmFnJyk7XG4vLyB2YXIgZHJhZ1F1YWRyYXRpYyA9IHJlcXVpcmUoJy4vZXhhbXBsZXMvZHJhZ1F1YWRyYXRpYycpO1xuIC8vdmFyIGdyYXZpdHkxRCA9IHJlcXVpcmUoJy4vZXhhbXBsZXMvZ3Jhdml0eTFEJyk7XG4vLyB2YXIgZ3Jhdml0eTNEID0gcmVxdWlyZSgnLi9leGFtcGxlcy9ncmF2aXR5M0QnKTtcbiB2YXIgcm90YXRpb25hbFNwcmluZyA9IHJlcXVpcmUoJy4vZXhhbXBsZXMvcm90YXRpb25hbFNwcmluZycpO1xuLy8gdmFyIHBsYW5lQm91bmRhcnkgPSByZXF1aXJlKCcuL2V4YW1wbGVzL3BsYW5lQm91bmRhcnknKTtcbi8vIHZhciBjb2xsaXNpb24gPSByZXF1aXJlKCcuL2V4YW1wbGVzL2NvbGxpc2lvbicpO1xuLy8gdmFyIHJlcHVsc2lvbiA9IHJlcXVpcmUoJy4vZXhhbXBsZXMvcmVwdWxzaW9uJyk7XG4gLy8gdmFyIHZvcnRleCA9IHJlcXVpcmUoJy4vZXhhbXBsZXMvdm9ydGV4Jyk7XG4vLyB2YXIgbW9yZ2FuID0gcmVxdWlyZSgnLi9leGFtcGxlcy9tb3JnYW4nKTtcblxuIl19
