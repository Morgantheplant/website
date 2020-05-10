(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\cssify\\browser.js":[function(require,module,exports){
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

},{}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Camera.js":[function(require,module,exports){
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

var MatrixMath     = require('../../math/Matrix4x4');
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

},{"../../math/Matrix4x4":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Matrix4x4.js","../OptionsManager":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\OptionsManager.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Container.js":[function(require,module,exports){
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
var MatrixMath     = require('../../math/Matrix4x4');
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

},{"../../events/EventHandler":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventHandler.js","../../math/Matrix4x4":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Matrix4x4.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js","../Renderers/WebGLRenderer":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Renderers\\WebGLRenderer.js","./Target":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Target.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Opacity.js":[function(require,module,exports){
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

},{"../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Size.js":[function(require,module,exports){
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

},{"../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Surface.js":[function(require,module,exports){
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
    MatrixMath     = require('../../math/Matrix4x4'),
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

},{"../../events/EventHandler":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventHandler.js","../../math/Matrix4x4":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Matrix4x4.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js","./Target":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Target.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Target.js":[function(require,module,exports){
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

var MatrixMath = require('../../math/Matrix4x4');
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

},{"../../math/Matrix4x4":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Matrix4x4.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Transform.js":[function(require,module,exports){
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
 * Return the current translation.
 *
 * @method getTranslation
 *
 * @return {Float32Array} array representing the current translation
 */
Transform.prototype.getTranslation = function getTranslation() {
    return this._vectors.translation;
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
 * Return the current rotation.
 *
 * @method getRotation
 *
 * @return {Float32Array} array representing the current rotation
 */
Transform.prototype.getRotation = function getRotation() {
    return this._vectors.rotation;
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
 * Return the current scale.
 *
 * @method getScale
 *
 * @return {Float32Array} array representing the current scale
 */
Transform.prototype.getScale = function getScale() {
    return this._vectors.scale;
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

},{"../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Context.js":[function(require,module,exports){
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

},{"./Components/Camera":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Camera.js","./Components/Container":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Container.js","./Entity":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Entity.js","./EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Engine.js":[function(require,module,exports){
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

},{"../physics/PhysicsSystem":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\PhysicsSystem.js","../transitions/LiftSystem":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\transitions\\LiftSystem.js","./Context":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Context.js","./OptionsManager":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\OptionsManager.js","./Renderers/DOMrenderer":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Renderers\\DOMrenderer.js","./Renderers/WebGLRenderer":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Renderers\\WebGLRenderer.js","./Stylesheet/famous.css":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Stylesheet\\famous.css","./Systems/BehaviorSystem":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\BehaviorSystem.js","./Systems/CoreSystem":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\CoreSystem.js","./Systems/RenderSystem":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\RenderSystem.js","./Systems/TimeSystem":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\TimeSystem.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Entity.js":[function(require,module,exports){
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

},{"./Components/Opacity":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Opacity.js","./Components/Size":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Size.js","./Components/Transform":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Transform.js","./EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityCollection.js":[function(require,module,exports){
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
},{"../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js","./Entity":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Entity.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js":[function(require,module,exports){
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

},{"./EntityCollection":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityCollection.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\OptionsManager.js":[function(require,module,exports){
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
},{"../events/EventHandler":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventHandler.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Renderers\\DOMrenderer.js":[function(require,module,exports){
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
    MatrixMath       = require('../../math/Matrix4x4');

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

},{"../../math/Matrix4x4":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Matrix4x4.js","../Components/Container":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Container.js","../Components/Surface":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Surface.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js","../OptionsManager":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\OptionsManager.js","./ElementAllocator":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Renderers\\ElementAllocator.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Renderers\\ElementAllocator.js":[function(require,module,exports){
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
},{}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Renderers\\WebGLRenderer.js":[function(require,module,exports){
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

var lightColors    = [0, 0, 0, 0, 0, 0, 0, 0, 0];
var lightPositions = [0, 0, 0, 0, 0, 0, 0, 0, 0];
var imageCache = [];
var texCache = [];
var boundTexture;
var checkerBoard = (function() {
    var c = document.createElement('canvas').getContext('2d');
    c.canvas.width = c.canvas.height = 128;
    for (var y = 0; y < c.canvas.height; y += 16) {
      for (var x = 0; x < c.canvas.width; x += 16) {
        c.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD';
        c.fillRect(x, y, 16, 16);
      }
    }
    return c.canvas;
})();

WebGLRenderer.draw = function draw(spec) {
    var vertexBuffers = BufferRegistry[spec.id] || (BufferRegistry[spec.id] = {});

    for (var name in spec.vertexBuffers) {
        if (! spec.invalidations[name]) continue;
        spec.invalidations[name] = void 0;

        var isIndex = name === INDICES;
        if (! vertexBuffers[name]) {
            vertexBuffers[name] = new Buffer(
                isIndex? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                isIndex ? Uint16Array : Float32Array,
                this.gl,
                isIndex ? 1 : spec.vertexBuffers[name][0].length
            );
        }

        vertexBuffers[name].data = spec.vertexBuffers[name];
        vertexBuffers[name].subData();
    }

    this.gl.depthMask(! spec.uniforms.opacity < 1);
    
    this.shader.setUniforms(spec.uniforms);

    if (TextureRegistry[spec.id] && boundTexture !== TextureRegistry[spec.id])
        boundTexture = TextureRegistry[spec.id].bind();

    this.drawBuffers(BufferRegistry[spec.id], this.gl[spec.type]);
};

WebGLRenderer.render = function () {
    var i;

    if (! this.gl) return;
    this.shader.setUniforms({
        mouse: mouse,
        time: TimeSystem.getElapsedRelativeTime()
    });

    for (i = 0; i < Lights.entities.length; i++) {
        var entity = Lights.entities[i];
        var light = entity.getComponent('light');
        var index = i * 3;

        lightPositions[index + 0] = light._spec.position[0];
        lightPositions[index + 1] = light._spec.position[1];
        lightPositions[index + 2] = light._spec.position[2];

        lightColors[index + 0] = light._spec.color[0];
        lightColors[index + 1] = light._spec.color[1];
        lightColors[index + 2] = light._spec.color[2];
    }

    this.shader.setUniforms({
        lightPositions: lightPositions,
        lightColors   : lightColors,
        numLights     : i
    });
    
    for (i = 0; i < Geometries.entities.length; i++) {
        var entity = Geometries.entities[i];
        var context = entity.getContext();
        
        if (context) this.shader.setUniforms({
            perspective: applyProjection(entity, context),
            resolution: context._size,
            cameraPos: context._components.camera.getOptions().projection.focalPoint
        });

        var spec = entity._components.geometry.render();

        if (spec.ohnoe)
            this.RTT(this.draw, spec, context, pp.back);

        if (spec.offscreen)
            this.RTT(this.draw, spec, context, pp.front);

        else this.draw(spec);
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
        else {
            gl.drawArrays(mode, 0, length);
        }
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
    if (! gl) return console.log('WebGL not supported');

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
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // gl.depthFunc(gl.LEQUAL);
    
    gl.enable(gl.CULL_FACE);

    var self = this;
    Materials.on('entityAdded', function (entity) {
        requestAnimationFrame(function () {
            var material = entity._components.material;
            var image = material.options.image;
            self.shader.resetProgram();

            if (! image) return;
            if (image.bind) return TextureRegistry[material.entity] = image;
            
            var idx = imageCache.indexOf(image);
            if (idx === -1) {
                imageCache.push(image);
                var tex = new Texture(self.gl, checkerBoard);
                tex.setImage(checkerBoard);
                texCache.push(tex);
                loadImage(image, function (img) {
                    tex.setImage(img);
                });
            } else {
                TextureRegistry[material.entity] = texCache[idx];
            }
        });
    });

    return gl;
};

WebGLRenderer.RTT = function(cb, spec, context, texture) {
    var gl = this.gl;
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
    
    if (this.debug) checkFBO(gl);

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

function loadImage (img, cb) {
    var obj = (typeof img === 'string' ? new Image() : img) || {};
    obj.crossOrigin = 'anonymous';
    if (! obj.src) obj.src = img + ('?_=' + new Date);
    if (! obj.complete) obj.onload = function () { cb(obj); };
    else cb(obj);

    return obj;
}

function checkFBO(gl) {
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    switch (status) {
    case gl.FRAMEBUFFER_COMPLETE: break;
    case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
    case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
    case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
    case gl.FRAMEBUFFER_UNSUPPORTED:
        throw("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED"); break;
    default:
        throw("Incomplete framebuffer: " + status);
    }
}

module.exports = WebGLRenderer;
},{"../../gl/Buffer":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\gl\\Buffer.js","../../gl/Geometry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\gl\\Geometry.js","../../gl/Shader":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\gl\\Shader.js","../../gl/Texture":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\gl\\Texture.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js","../Systems/TimeSystem":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\TimeSystem.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Stylesheet\\famous.css":[function(require,module,exports){
var css = "/* This Source Code Form is subject to the terms of the Mozilla Public\n * License, v. 2.0. If a copy of the MPL was not distributed with this\n * file, You can obtain one at http://mozilla.org/MPL/2.0/.\n *\n * Owner: mark@famo.us\n * @license MPL 2.0\n * @copyright Famous Industries, Inc. 2014\n */\n\n\nhtml {\n    width: 100%;\n    height: 100%;\n    margin: 0px;\n    padding: 0px;\n    overflow: hidden;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n}\n\nbody {\n    position: absolute;\n    width: 100%;\n    height: 100%;\n    margin: 0px;\n    padding: 0px;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n    -webkit-font-smoothing: antialiased;\n    -webkit-tap-highlight-color: transparent;\n    -webkit-perspective: 0;\n    perspective: none;\n    overflow: hidden;\n}\n\n.famous-container, .famous-group {\n    position: absolute;\n    top: 0px;\n    left: 0px;\n    bottom: 0px;\n    right: 0px;\n    overflow: visible;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n    -webkit-backface-visibility: visible;\n    backface-visibility: visible;\n    pointer-events: none;\n}\n\n.famous-group {\n    width: 0px;\n    height: 0px;\n    margin: 0px;\n    padding: 0px;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n}\n\n.fa-surface {\n    position: absolute;\n    -webkit-transform-origin: 0% 0%;\n    transform-origin: 0% 0%;\n    -webkit-backface-visibility: visible;\n    backface-visibility: visible;\n    -webkit-transform-style: flat;\n    transform-style: preserve-3d; /* performance */\n/*    -webkit-box-sizing: border-box;\n    -moz-box-sizing: border-box;*/\n    -webkit-tap-highlight-color: transparent;\n    pointer-events: auto;\n\n}\n\n.famous-container-group {\n    position: relative;\n    width: 100%;\n    height: 100%;\n}\n\n.fa-container {\n    position: absolute;\n    -webkit-transform-origin: center center;\n    transform-origin: center center;\n    overflow: hidden;\n}\n\ncanvas.GL {\n    pointer-events: none;\n    position: absolute;\n    z-index: 9999;\n    top: 0px;\n    left: 0px;\n}\n"; (require("c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\cssify"))(css); module.exports = css;
},{"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\cssify":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\cssify\\browser.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\BehaviorSystem.js":[function(require,module,exports){
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


},{"../EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\CoreSystem.js":[function(require,module,exports){
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

},{"../EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\RenderSystem.js":[function(require,module,exports){
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
    MatrixMath     = require('../../math/Matrix4x4'),
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

},{"../../math/Matrix4x4":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Matrix4x4.js","../EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js","../OptionsManager":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\OptionsManager.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\TimeSystem.js":[function(require,module,exports){
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

},{}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\components\\Target.js":[function(require,module,exports){
module.exports=require("c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Target.js")
},{"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Target.js":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Target.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js":[function(require,module,exports){
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

},{}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventHandler.js":[function(require,module,exports){
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

},{"./EventEmitter":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\gl\\Buffer.js":[function(require,module,exports){
function Buffer(target, type, gl, spacing) {
    this.buffer  = null;
    this.target  = target;
    this.type    = type;
    this.data    = [];
    this.gl      = gl;
    this.spacing = spacing || 0;
}

Buffer.prototype.subData = function subData(type) {
    var gl = this.gl;
    var data = [];
    
    for (var i = 0, chunk = 10000; i < this.data.length; i += chunk)
        data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));

    this.buffer         = this.buffer || gl.createBuffer();
    this.buffer.length  = data.length / this.spacing;
    this.buffer.spacing = this.spacing || (this.data.length ? data.length / this.data.length : 0);
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, new this.type(data), type || gl.STATIC_DRAW);
};

module.exports = Buffer;
},{}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\gl\\Geometry.js":[function(require,module,exports){

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
 *  Set the WebGL drawing primitive for this geometry.
 *  @method setDrawType
 *  @param type {String}
 */
Geometry.prototype.setDrawType = function (value) {
    this.spec.type = value.toUpperCase();
    return this;
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
    contextSize = contextSize || [1, 1, 1];
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

},{"../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js","../core/components/Target":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\components\\Target.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\gl\\Shader.js":[function(require,module,exports){
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

var vertexWrapper = "vec4 clipspace(in vec4 pos) {\n  return vec4((pos.x / u_resolution.x) * 2.,\n              (pos.y / u_resolution.y) * 2.,\n              pos.z / (u_resolution.y * 0.5),\n              pos.w);\n}\n\nmat3 getNormalMatrix(in mat4 a) {\n  mat3 matNorm;\n\n  float a00 = a[0][0], a01 = a[0][1], a02 = a[0][2], a03 = a[0][3],\n    a10 = a[1][0], a11 = a[1][1], a12 = a[1][2], a13 = a[1][3],\n    a20 = a[2][0], a21 = a[2][1], a22 = a[2][2], a23 = a[2][3],\n    a30 = a[3][0], a31 = a[3][1], a32 = a[3][2], a33 = a[3][3],\n    b00 = a00 * a11 - a01 * a10,\n    b01 = a00 * a12 - a02 * a10,\n    b02 = a00 * a13 - a03 * a10,\n    b03 = a01 * a12 - a02 * a11,\n    b04 = a01 * a13 - a03 * a11,\n    b05 = a02 * a13 - a03 * a12,\n    b06 = a20 * a31 - a21 * a30,\n    b07 = a20 * a32 - a22 * a30,\n    b08 = a20 * a33 - a23 * a30,\n    b09 = a21 * a32 - a22 * a31,\n    b10 = a21 * a33 - a23 * a31,\n    b11 = a22 * a33 - a23 * a32,\n\n    det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n\n  det = 1.0 / det;\n\n  matNorm[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;\n  matNorm[0][1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;\n  matNorm[0][2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;\n\n  matNorm[1][0] = (a02 * b10 - a01 * b11 - a03 * b09) * det;\n  matNorm[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * det;\n  matNorm[1][2] = (a01 * b08 - a00 * b10 - a03 * b06) * det;\n\n  matNorm[2][0] = (a31 * b05 - a32 * b04 + a33 * b03) * det;\n  matNorm[2][1] = (a32 * b02 - a30 * b05 - a33 * b01) * det;\n  matNorm[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * det;\n\n  return matNorm;\n}\n//define_vsChunk\nvec4 pipeline_pos(in vec4 pos) {\n  //apply_vsChunk\n  mat4 trx = u_transform;\n\n  trx = mat4(\n    1, 0, 0, 0,\n    0,-1, 0, 0,\n    0, 0, 1, 0,\n    0, 0, 0, 1\n  ) * trx;\n\n  pos.xyz *= u_size.xyz;\n\n  trx[3] = clipspace(trx[3]);\n  float xT = trx[3][0];\n  float yT = trx[3][1];\n\n  trx[3][0] = 0.0;\n  trx[3][1] = 0.0;\n  \n  pos = u_perspective * trx * pos;\n  pos.xy += vec2(xT, yT);\n  pos.z  *= -1.;\n  return pos;\n}\n\nvoid main() {\n  v_texCoord = a_texCoord;\n  v_normal = a_normal;\n  gl_Position = pipeline_pos(a_pos);\n}";
var fragmentWrapper = "#define time u_time * .001\nfloat nsin(float x) {\n  return (sin(x) + 1.0) / 2.0;\n}\n\nvec3 doRandom(vec2 p, float i, vec3 randColor, vec4 randRect) {\n  float x = p.x;\n  float y = p.y;\n  vec3 rgb = vec3(0.0);\n  float color = 0.0;\n \n  float dx = x - randRect.x;\n    float dy = y - mod(randRect.y + nsin(time), 1.0)*nsin(time*i/20.0);\n  float dist = sqrt(dx * dx + dy * dy);\n\n  float e = 1.0 / dist / 1000.0;\n  if (dist < 0.1) {\n    rgb.r = e * randColor.r;\n    rgb.g = e * randColor.g;\n    rgb.b = e * randColor.b;\n  }\n  return rgb;\n}\nfloat state0(vec2 x) {\n  return texture2D(u_image, fract(x / u_resolution.xy)).a;\n}\n\nfloat state1(vec2 x) {\n  return texture2D(u_image2, fract(x / u_resolution.xy)).a;\n}\n\nfloat laplacian(vec2 x) {\n  return (state0(x+vec2(-1,0)) +\n          state0(x+vec2(1,0)) +\n          state0(x+vec2(0,1)) +\n          state0(x+vec2(0,-1))) +\n    state0(x);\n}\n\n\nfloat hash( float n ) {\n  return fract(sin(n)*43758.5453);\n}\nfloat noise( in vec3 x ) {\n  vec3 p = floor(x);\n  vec3 f = fract(x);\n\n  f = f*f*(3.0-2.0*f);\n  float n = p.x + p.y*57.0 + 113.0*p.z;\n  return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),\n                 mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),\n             mix(mix( hash(n+113.0), hash(n+114.0),f.x),\n                 mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);\n}\n\nvec4 map( in vec3 p ){\n  float d = 0.2 - p.y;\n\n  vec3 q = p - vec3(1.0,0.1,0.0)*(u_time*.0002);\n  float f = 0.5000*noise( q ); q = q*2.02;\n  f += 0.2500*noise( q ); q = q*2.03;\n  f += 0.1250*noise( q ); q = q*2.01;\n  f += 0.0625*noise( q );\n\n  d += 3.0 * f;\n\n  d = clamp( d, 0.0, 1.0 );\n    \n  vec4 res = vec4( d );\n\n  res.xyz = mix( 1.15*vec3(1.0,0.95,0.8), vec3(0.7,0.7,0.7), res.x );\n    \n  return res;\n}\n\nvec3 sundir = vec3(-1.0,0.0,0.0);\nvec4 raymarch( in vec3 ro, in vec3 rd ) {\n  vec4 sum = vec4(0, 0, 0, 0);\n  float t = 0.0;\n  for(int i=0; i<20; i++) {\n    vec3 pos = ro + t*rd;\n    vec4 col = map( pos );\n\n    float dif =  clamp((col.w - map(pos+0.3*sundir).w)/0.6, 0.0, 1.0 );\n    vec3 lin = vec3(0.65,0.68,0.7)*1.35 + 0.45*vec3(0.7, 0.5, 0.3)*dif;\n    col.xyz *= lin;\n    \n    col.a *= 0.9;\n    col.rgb *= col.a;\n\n    sum = sum + col*(1.0 - sum.a);    \n    t += max(0.1,0.025*t);\n  }\n\n  sum.xyz /= (0.001+sum.w);\n\n  return clamp( sum, 0.0, 1.0 );\n}\n\n//define_fsChunk\nvec4 pipeline_color(in vec4 color) {\n    //apply_fsChunk\n    return color;\n}\n\nvoid main() {\n    vec4 color = vec4(0, 0, 0, u_opacity);\n    color = pipeline_color(color);\n    gl_FragColor = color;\n}";

var uniforms = {
    stateSize: [0, 0],
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    perspective: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    opacity: 1,
    mouse: [0, 0],
    origin: [.5, .5],
    resolution: [0, 0, 0],
    size: [1, 1, 1],
    time: 0,
    image: true,
    image2: true,
    lightPositions: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    lightColors: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    cameraPos: [0, 0, 0],
    numLights: 0
};

var attributes = {
    pos: [0, 0, 0, 0],
    texCoord: [0, 0],
    normal: [0, 0, 1]
};

var varyings = {
    texCoord: [0, 0],
    normal: [0, 0, 0],
    lightWeighting: [0, 0, 0]
};

var cachedUniforms  = {};
var flaggedUniforms = [];

var header = 'precision mediump float;\n';

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

    Materials.forEach(function (renderNode) {
        var material = renderNode.getComponent('material'), name;

        for (name in material.uniforms) uniforms[name] = uniforms[name] || material.uniforms[name];

        for (name in material.varyings) varyings[name] = varyings[name] || material.varyings[name];

        for (var i = 0; i < material.chunks.length; i++) {
            var chunk = material.chunks[i];
            name = chunk.name;

            if (flaggedUniforms.indexOf(name) !== -1) continue;


            if (chunk.vsDefines) vsChunkDefines.push(chunk.vsDefines);
            if (chunk.fsDefines) fsChunkDefines.push(chunk.fsDefines);

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
        }
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
    
    this.gl.attachShader(program, compileSource(this.gl, this.gl.VERTEX_SHADER, vertexSource));
    this.gl.attachShader(program, compileSource(this.gl, this.gl.FRAGMENT_SHADER, fragmentSource));
    this.gl.linkProgram(program);

    if (! this.gl.getProgramParameter(program, this.gl.LINK_STATUS))
        console.error('link error: ' + this.gl.getProgramInfoLog(program));

    else this.program = program;
}

Shader.prototype.uniformIsCached = function (name, value) {
    if(cachedUniforms[name] == null) {
        if (Array.isArray(value) || value instanceof Float32Array) {
            cachedUniforms[name] = new Float32Array(value);
        } else {
            cachedUniforms[name] = value;
        }
        return false;
    }

    if(Array.isArray(value) || value instanceof Float32Array){
        var i = value.length;
        while (i--) {
            if(value[i] !== cachedUniforms[name][i]) {
                cachedUniforms[name] = new Float32Array(value);
                return false;
            }
        }
    }

    else if(cachedUniforms[name] !== value) {
        cachedUniforms[name] = value;
        return false;
    }

    return true;
}

Shader.prototype.setUniforms = function (entityUniforms) {
    var gl = this.gl;

    if (! this.program) return;

    gl.useProgram(this.program);

    for (var name in entityUniforms) {
        var location = this.uniformLocations[name] || gl.getUniformLocation(this.program, 'u_' + name);
        if (! location) continue;

        this.uniformLocations[name] = location;
        var value = entityUniforms[name];

        // if(this.uniformIsCached(name, value)) continue;

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
        } else if (! isNaN(parseFloat(value)) && isFinite(value)) {
            if (name == 'image2') 
                gl.uniform1i(location, value);
            else
                gl.uniform1f(location, value);
        } else {
            throw 'set uniform "' + name + '" to invalid type :' + value;
        }
    }

    flaggedUniforms.forEach(function (flag) {
        if (! entityUniforms[flag])  {
            // if(cachedUniforms[flag] !== 0) {
                // cachedUniforms[flag] = 0;
                gl.uniform1f(this.uniformLocations[flag], 0);
            // }
        }
    }, this);

    return this;
};

function dataToUniformType(type) {
    if (type === true) return 'sampler2D';
    if (! Array.isArray(type)) return 'float';
    var length = type.length;
    if (length < 5) return 'vec' + length;
    else return 'mat' + (Math.sqrt(type.length) | 0);
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

module.exports = Shader;

},{"../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\gl\\Texture.js":[function(require,module,exports){
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

Texture.prototype.setImage = function setImage(img) {
    var gl = this.gl;
    console.log(img);
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

},{}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Matrix4x4.js":[function(require,module,exports){
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
},{}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Vec3.js":[function(require,module,exports){
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
    if (x instanceof Array) {
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

Vec3.prototype.set = function set(x,y,z) {
    if (x instanceof Array || x instanceof Float32Array) {
        this.x = x[0];
        this.y = x[1];
        this.z = x[2];
    } else if (x instanceof Vec3) {
        this.x = x.x;
        this.y = x.y;
        this.z = x.z;
    } else {
        if (!isNaN(x)) this.x = x;
        if (!isNaN(y)) this.y = y;
        if (!isNaN(z)) this.z = z;
    }
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

Vec3.prototype.cross = function(v) {
    var x = this.y * v.z - this.z * v.y;
    var y = this.z * v.x - this.x * v.z;
    var z = this.x * v.y - this.y * v.x;

    this.x = x;
    this.y = y;
    this.z = z;
};

Vec3.prototype.rotateQ = function rotateQ(q) {
    this.copy(q.rotateVector(this));
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
    return this;
};

Vec3.prototype.clear = function clear(v) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

Vec3.prototype.isZero = function isZero() {
    if (this.x !== 0 || this.y !== 0 || this.z !== 0) return false;
    return true;
};

Vec3.prototype.isEqual = function isEqual(v) {
    if (this.x !== v.x || this.y !== v.y || this.z !== v.z) return false;
    return true;
};

Vec3.prototype.toValue = function toValue() {
    return [this.x, this.y, this.z];
};

Vec3.prototype.normalize = function normalize() {
    var currentLength = this.length();

    this.x = this.x / currentLength;
    this.y = this.y / currentLength;
    this.z = this.z / currentLength;
    return this;
};

Vec3.prototype.cross = function cross(v) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    this.x = y * v.z - z * v.y;
    this.y = z * v.x - x * v.z;
    this.z = x * v.y - y * v.x;
    return this;
};

Vec3.prototype.applyMatrix = function(matrix) {
    var M = matrix.get();
    var M0 = M[0];
    var M1 = M[1];
    var M2 = M[2];

    var v0 = this.x;
    var v1 = this.y;
    var v2 = this.z;

    this.x = M0[0]*v0 + M0[1]*v1 + M0[2]*v2;
    this.y = M1[0]*v0 + M1[1]*v1 + M1[2]*v2;
    this.z = M2[0]*v0 + M2[1]*v1 + M2[2]*v2;
    return this;
};

Vec3.normalize = function normalize(v) {
    var length = v.length() || 1;
    return new Vec3(v.x/length, v.y/length, v.z/length);
};

Vec3.clone = function clone(v) {
    return new Vec3(v.x, v.y, v.z);
};

Vec3.add = function add(v1, v2) {
    var x = v1.x + v2.x;
    var y = v1.y + v2.y;
    var z = v1.z + v2.z;
    return new Vec3(x,y,z);
};

Vec3.subtract = function subtract(v1, v2) {
    var x = v1.x - v2.x;
    var y = v1.y - v2.y;
    var z = v1.z - v2.z;
    return new Vec3(x,y,z);
};

Vec3.scale = function scale(v, s) {
    var x = v.x * s;
    var y = v.y * s;
    var z = v.z * s;
    return new Vec3(x,y,z);
};

Vec3.rotateQ = function rotateQ(v,q) {
    return Vec3.clone(q.rotateVector(v));
};

Vec3.dotProduct = function dotProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

Vec3.crossProduct = function crossProduct(v1, v2) {
    return new Vec3(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
};

Vec3.equals = function equals(v1, v2) {
    return v1.x === v2.x && v1.y === v2.y && v1.z === v2.z;
};

Vec3.project = function project(v1, v2) {
    return Vec3.normalize(v2).scale(Vec3.dotProduct(v1, v2));
};

module.exports = Vec3;

},{}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\PhysicsSystem.js":[function(require,module,exports){
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
var EventHandler = require('../events/EventHandler');

var bodies = EntityRegistry.addCollection('Bodies');

/**
 * Singleton PhysicsSystem object
 * manages particles, bodies, agents, constraints
 *
 * @class Engine
 * @singleton
 */
var PhysicsSystem = {};

PhysicsSystem.forces = [];
PhysicsSystem.constraints = [];
PhysicsSystem.bodies = [];
PhysicsSystem._eventHandler = new EventHandler();

PhysicsSystem._eventHandler.on('add', function(body) {
    PhysicsSystem.attach(body);
});

/**
 * @const step the time step between frames up to the frame time diff
 */
PhysicsSystem.step = 16.6667;
PhysicsSystem.iterations = 10;
PhysicsSystem._IDPool = {
    bodies: [],
    forces: [],
    constraints: []
};

PhysicsSystem.attach = function(agentOrBody) {
    if (arguments.length > 1) {
        for (var i = 0; i < arguments.length; i++) {
            PhysicsSystem.attach(arguments[i]);
        }
        return;
    }
    if (!(agentOrBody instanceof Array)) agentOrBody = [agentOrBody];

    var i = agentOrBody.length;
    while(i--) {
        if (agentOrBody[i] instanceof Particle) _addBody.call(this, agentOrBody[i]);
        else _addAgent.call(this, agentOrBody[i]);
    }
};

PhysicsSystem.addBody = PhysicsSystem.attach;

function _addBody(body) {
    if (body._ID == null) {
        if (this._IDPool.bodies.length) {
            body._ID = this._IDPool.bodies.pop();
        } else {
            body._ID = this.bodies.length;
        }
        this.bodies[this.bodies.length] = body;
    }
};

function _addAgent(agent) {
    if (agent._ID != null) throw new Error ("Agents can only be added to the engine once"); // Handle it here
    if (agent instanceof Force) {
        if (this._IDPool.forces.length) {
            agent._ID = this._IDPool.forces.pop();
        } else {
            agent._ID = this.forces.length;
        }
        this.forces[agent._ID] = agent;
    } else if (agent instanceof Constraint) {
        if (this._IDPool.constraints.length) {
            agent._ID = this._IDPool.constraints.pop();
        } else {
            agent._ID = this.constraints.length;
        }
        this.constraints[agent._ID] = agent;
    } else throw new Error("Attempt to register non-agent as Force or Constraint")

    PhysicsSystem._eventHandler.subscribe(agent._eventEmitter);
};

PhysicsSystem.remove = function remove(agentOrBody) {
    if (!(agentOrBody instanceof Array)) agentOrBody = [agentOrBody];
    var neElements = agentOrBody.length;
    while(neElements--) {
        _removeOne.call(this, agentOrBody[neElements]);
    }
};

PhysicsSystem.removeBody = PhysicsSystem.remove;

function _removeOne(agentOrBody) {
    if (agentOrBody instanceof Force) {
        this._IDPool.forces.push(agentOrBody._ID);
        this.forces[agentOrBody._ID] = null;
    } else if (agentOrBody instanceof Constraint) {
        this._IDPool.constraints.push(agentOrBody._ID);
        this.constraints[agentOrBody._ID] = null;
    } else if (agentOrBody instanceof Particle) {
        this._IDPool.bodies.push(agentOrBody._ID);
        this.bodies[agentOrBody._ID] = null;
    }
    agentOrBody._ID = null;
};

PhysicsSystem.update = function update() {
    var bodies = this.bodies;
    var forces = this.forces;
    var constraints = this.constraints;

    var _numBodies = bodies.length;
    var _numForces = forces.length;
    var _numConstraints = constraints.length;
    var _numIterations = this.iterations;

    var step = this.step;
    var delta = TimeSystem.getDelta();
    // console.log(delta)
    while(delta > 0) {
        var dt = (delta > step) ? step : delta;
        dt /= 1000;
        // Update Forces on particles
        var nForces = _numForces;
        while(nForces--) {
            if (forces[nForces]) forces[nForces].update();
        }

        // Tentatively update velocities
        var nBodies = _numBodies;
        while(nBodies--) {
            var body = bodies[nBodies];
            if (!body) continue;
            if (body.settled) {
                if (body._force.length() > body.sleepThreshold
                    || body._velocity.length() > body.sleepThreshold
                    || body.angularVelocity.length() > body.sleepThreshold) {
                    body.settled = false;
                } else {
                    body.getForce().clear();
                }
            }
            if (!body.settled) body._integrateVelocity(dt);
        }

        // Determine violations of constraints
        var nConstraints = _numConstraints;
        while(nConstraints--) {
            if (!constraints[nConstraints]) continue;
            constraints[nConstraints].update();
        }

        // Iteratively resolve constraints
        for (var iteration = 0; iteration < _numIterations; iteration++) {
            nConstraints = _numConstraints;
            while(nConstraints--) {
                if (!constraints[nConstraints]) continue;
                constraints[nConstraints].resolve(dt, iteration);
            }
        }

        // Integrate Particle positions
        nBodies = _numBodies;
        while(nBodies--) {
            body = this.bodies[nBodies];
            if (!body) continue;
            if (!body.settled) body._integratePose(dt);
        }

        delta -= step;
    }
};

// /**
//  * Adds a body object to the system to update it's position and orientation
//  *
//  * @method addBody
//  * @param {Body} body
//  */
// PhysicsSystem.addBody = function addBody(body) {
//     if (body._ID == null) {
//         if (this._IDPool.bodies.length) {
//             body._ID = this._IDPool.bodies.pop();
//         } else {
//             body._ID = this.bodies.length;
//         }
//         this.bodies[this.bodies.length] = body;
//     }
// };

// /**
//  * Removes a body and removes it from it's associated agents
//  * TODO: remove the body from its associated agents
//  *
//  * @method removeBody
//  * @param {Body} body
//  */
// PhysicsSystem.removeBody = function removeBody(body) {
//     this._IDPool.bodies.push(body._ID);
//     this.bodies[body._ID] = null;
//     body._ID = null;
// };

// /**
//  * Attaches a collection of Force or Constraint and bodies
//  * Use this method to make physics apply forces to bodies
//  * Forces and constraints are applied from the source (if
//  * applicable) to the targets
//  *
//  * @method attach
//  * @param {Force | Force[] | Constraint | Constraint[]} agents
//  * @param {Particle | Particle[]} source
//  * @param {Particle | Particle[]} targets
//  * @return {Number | Number[]} the ids of the agents attached to the system
//  */
// PhysicsSystem.attach = function attach(agents, source, targets) {
//     if (!targets) targets = this.bodies;
//     if (!(targets instanceof Array)) targets = [targets];
//     var nTargets = targets.length;
//     while (nTargets--) {
//         if (targets[nTargets]._ID === null) this.addBody(targets[nTargets]);
//     }
//     if (source) this.addBody(source);
//     if (agents instanceof Array) {
//         var agentIDs = Array(agents.length);
//         var nAgents = agents.length;
//         while(nAgents--) {
//             agentIDs[nAgents] = _attachAgent.call(this, agents[i], targets, source);
//         }
//     }
//     else _attachAgent.call(this, agents, source, targets);
//     return agentIDs;
// };

// /**
//  * Attaches the force or constraint and its source and targets to the system
//  *
//  * @private
//  * @method _attachAgent
//  * @param {Force | Constraint} agent the agent to attach to the system
//  * @param {Particle[]} targets the array of targets to attach to the agent
//  * @param {Particle} source the source of the agent
//  * @throws {Error} if agent !instanceof Force or agent !instanceof Constraint
//  * @return {Number} the id of the agent attached to the system
//  */
// function _attachAgent(agent, source, targets) {
//     if (agent._ID) throw new Error ("Agents can only be added to the engine once"); // Handle it here
//     if (targets === undefined) targets = this.bodies;

//     if (agent instanceof Force) {
//         if (this._IDPool.forces.length) {
//             agent._ID = this._IDPool.forces.pop();
//         } else {
//             agent._ID = this.forces.length;
//         }
//         this.forces[agent._ID] = {
//             agent   : agent,
//             targets : targets,
//             source  : source
//         };
//     }

//     else if (agent instanceof Constraint) {
//         if (this._IDPool.constraints.length) {
//             agent._ID = this._IDPool.constraints.pop();
//         } else {
//             agent._ID = this.constraints.length;
//         }
//         this.constraints[agent._ID] = {
//             constraint : agent,
//             targets    : targets,
//             source     : source
//         };
//     }

//     else throw new Error("Only Forces and Constraints may be added to the Physics System.");
//     return agent._ID;
// }

// /**
//  * Removes an instance of Force or Agent or an array of instances from the PhysicsSystem
//  * compliment to PhysicsSystem#attach
//  *
//  * @method remove
//  * @param {Force | Force[] | Constraint | Constraint[] | Array<Force, Constraint>} agents
//  */
// PhysicsSystem.remove = function remove(agentsOrBodies) {
//     if (agentsOrBodies instanceof Array) {
//         var neElements = agentsOrBodies.length;
//         while(neElements--) {
//             _removeOne.call(this, agentsOrBodies[neElements]);
//         }
//     }
//     else _removeOne.call(this, agentsOrBodies);
// };

// /**
//  * Removes the agent from its id pool
//  *
//  * @private
//  * @method _removeOne
//  * @param {Force | Constraint} agent the agent to remove
//  */
// function _removeOne(agentOrBody) {
//     if (agentOrBody instanceof Force) {
//         this._IDPool.forces.push(agentOrBody._ID);
//         this.forces[agentOrBody._ID] = null;
//     } else if (agentOrBody instanceof Constraint) {
//         this._IDPool.constraints.push(agentOrBody._ID);
//         this.constraints[agentOrBody._ID] = null;
//     } else if (agentOrBody instanceof Particle) {
//         this._IDPool.bodies.push(agentOrBody._ID);
//         this.bodies[agentOrBody._ID] = null;
//     }
//     agentOrBody._ID = null;
// };

// /**
//  * Attaches targets to an agent attached with PhysicsSystem#attach
//  * Use this method to attach more bodies to an existing interaction
//  *
//  * @method attachTo
//  * @param {Force | Constraint} agent
//  * @param {Particle | Particle[]} targets
//  */
// PhysicsSystem.attachTo = function attachTo(agent, targets) {
//     if (agent._ID === null) return;
//     if (!(targets instanceof Array)) targets = [targets];
//     var nTargets = targets.length;
//     while (nTargets--) {
//         if (targets[nTargets]._ID === null) this.addBody(targets[nTargets]);
//     }
//     if (agent instanceof Force) {
//         this.forces[agent._ID].targets = this.forces[agent._ID].targets.concat(targets);
//     }
//     if (agent instanceof Constraint) {
//         this.constraints[agent._ID].targets = this.constraints[agent._ID].targets.concat(targets);
//     }
// };

// /**
//  * Removes bodies from an existing interaction
//  * Use this method as a compliment in PhysicsSystem#attachTo
//  *
//  * @method removeFrom
//  * @param {Force | Constraint} agent
//  * @param {Particle} target
//  */
// PhysicsSystem.removeFrom = function removeFrom(agent, target) {
//     if (agent._ID === null) return;
//     if (agent instanceof Force) {
//         var agentTargets = this.forces[agent._ID].targets;
//     }
//     if (agent instanceof Constraint) {
//         var agentTargets = this.constraints[agent._ID].targets;
//     }

//     var nTargets = agentTargets.length;
//     while(nTargets--) {
//       if (agentTargets[nTargets] === target) {
//         // remove target from agent and stop checking targets
//         return agentTargets.splice(nTargets, 1);
//       }
//     }
// };

// /**
//  * Update loop of the PhysicsSystem.  Attached to core/Engine
//  * Applies forces to bodies, updates the bodies and applies constraints
//  *
//  * @protected
//  * @method update
//  */
// PhysicsSystem.update = function update() {
//     var dt = TimeSystem.getDelta();

//     // while(dt > 0) {
//         // var step = (dt > this.step) ? this.step : dt;
//         var step = this.step
//         // UpdateForces on particles
//         var nAgents = this.forces.length;
//         while(nAgents--) {
//             if (this.forces[nAgents]) this.forces[nAgents].agent.update(this.forces[nAgents].source, this.forces[nAgents].targets);
//         }

//         // Integrate Particle positions
//         var nBodies = this.bodies.length;
//         var body;
//         while(nBodies--) {
//             body = this.bodies[nBodies];
//             if (!body) continue;
//             if (body.settled) {
//                 if (body._force.length() > body.sleepThreshold || body._velocity.length() > body.sleepThreshold) {
//                     body.settled = false;
//                 } else {
//                     body.getForce().clear();
//                 }
//             }
//             if (!body.settled) body._integrateVelocity(step);
//         }

//         var nConstraints = this.constraints.length;
//         while(nConstraints--) {
//             if (!this.constraints[nConstraints]) continue;
//             this.constraints[nConstraints].constraint.update(this.constraints[nConstraints].source, this.constraints[nConstraints].targets, step);
//         }

//         nBodies = this.bodies.length;
//         while(nBodies--) {
//             body = this.bodies[nBodies];
//             if (!body) continue;
//             if (!body.settled) body._integratePose(step);
//         }

//         // dt -= this.step;
//     // }

// };

module.exports = PhysicsSystem;

},{"../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js","../core/Systems/TimeSystem":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Systems\\TimeSystem.js","../events/EventHandler":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventHandler.js","./bodies/Particle":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\bodies\\Particle.js","./constraints/Constraint":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\constraints\\Constraint.js","./forces/Force":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\forces\\Force.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\bodies\\Particle.js":[function(require,module,exports){
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

/**
 * Base class for Physics Interactions
 * Stores:
 *   position
 *   velocity
 *   momentum
 *   force
 *   mass
 *
 * Encapsulates:
 *   EventEmitter
 *
 * Manages sleeping
 *
 * @class Particle
 * @constructor
 * @param {Object} options
 */
function Particle(options) {
    this._eventEmitter = new EventEmitter();

    options = options || {};
    this._position = new Vec3(options.position);
    this._lastPosition = new Vec3();
    this._velocity = new Vec3(options.velocity);
    this._force = new Vec3();
    this._mass = options.mass || 1;
    this._invMass = 1 / this._mass;
    this._momentum = Vec3.scale(this._velocity, this._mass);

    this._ID = null;
    this.settled = false;
    this.sleepThreshold = options.sleepThreshold || 0;
}

/**
 * Returns the class name for the Entity Registry
 *
 * @static
 * @method toString
 * @returns {string} particle
 */
Particle.toString = function toString(){
    return 'particle';
};

/**
 * Getter for mass
 *
 * @method getMass
 * @returns {Number} mass
 */
Particle.prototype.getMass = function getMass() {
    return this._mass;
};

/**
 * Getter for inverse mass
 *
 * @method getInverseMass
 * @returns {Number} inverse mass
 */
Particle.prototype.getInverseMass = function() {
    return this._invMass;
}

/**
 * Setter for mass
 *
 * @method setMass
 * @param {Number} mass
 * @returns {Particle} this
 * @chainable
 */
Particle.prototype.setMass = function setMass(mass) {
    this._mass = mass;
    this._invMass = 1 / mass;
    return this;
};

/**
 * Getter for position
 *
 * @method getPosition
 * @returns {Vec3} position
 */
Particle.prototype.getPosition = function getPosition() {
    return this._position;
};

/**
 * Getter for last position
 *
 * @method getLastPosition
 * @returns {Vec3} lastPosition
 */
Particle.prototype.getLastPosition = function getLastPosition() {
    return this._lastPosition;
};

/**
 * Setter for position
 *
 * @method setPosition
 * @param {Vec3 | Number} x the vector for position or the x coordinate
 * @param {Number} y the y coordinate for position
 * @param {Number} z the z coordinate for position
 * @returns {Particle} this
 * @chainable
 */
Particle.prototype.setPosition = function setPosition(x, y, z) {
    if (x instanceof Vec3) {
        this._position.copy(x);
    } else {
        this._position.set(x, y, z);
    }
    return this;
};

/**
 * Getter for velocity
 *
 * @method getVelocity
 * @returns {Vec3} velocity
 */
Particle.prototype.getVelocity = function getVelocity() {
    return this._velocity;
};

/**
 * Setter for velocity
 *
 * @method setvelocity
 * @param {Vec3 | Number} x the vector for velocity or the x coordinate
 * @param {Number} y the y coordinate for velocity
 * @param {Number} z the z coordinate for velocity
 * @returns {Particle} this
 * @chainable
 */
Particle.prototype.setVelocity = function setVelocity(x, y, z) {
    if (x instanceof Vec3) {
        this._velocity.copy(x);
    } else {
        this._velocity.set(x, y, z);
    }
    return this;
};

/**
 * Getter for the force on the Particle
 *
 * @method getForce
 * @returns {Vec3} force
 */
Particle.prototype.getForce = function getForce() {
    return this._force;
};

/**
 * Setter for the force on the Particle
 * Usually used to clear the force on the Particle
 *
 * @method setForce
 * @param {Vec3} v the new Force
 * @returns {Particle} this
 * @chainable
 */
Particle.prototype.setForce = function setForce(v) {
    this._force.copy(v);
    return this;
};

/**
 * Getter for momentum
 * p (momentum) = m (mass) * v (velocity)
 *
 * @method getMomentum
 * @returns {Vec3} momentum
 */
Particle.prototype.getMomentum = function getMomentum() {
    return this._momentum.copy(this.velocity).scale(this._mass);
};

/**
 * Returns the length of the momentum vector
 *
 * @method getMomentumScalar
 * @returns {Number} length
 */
Particle.prototype.getMomentumScalar = function getMomentumScalar() {
    return this.getMomentum().length();
};

/**
 * Applies a force to the particle
 * The PhysicsSystem calls this method when applying the agents
 *
 * @method applyForce
 * @param {Vec3} force the force applied to the Particle
 */
Particle.prototype.applyForce = function applyForce(force){
    this._force.add(force);
};

/**
 * Applies an impulse to the Particle
 *
 * @method applyImpulse
 * @param {Vec3} impulse
 */
Particle.prototype.applyImpulse = function applyImpulse(impulse) {
    if (impulse.isZero() || this.immune) return;
    this._velocity.add(Vec3.scale(impulse,this._invMass));
};

/**
 * Integrates force into velocity
 *
 * @protected
 * @method _integrateVelocity
 * @param {Number} dt the time between frames for integration
 */
Particle.prototype._integrateVelocity = function _integrateVelocity(dt) {
    if (!this.immune) SymplecticEuler.integrateVelocity(this, dt);
    this._force.clear();
};

/**
 * Integrates velocity into position
 *
 * @protected
 * @method _integratePose
 * @param {Number} dt the time between frames for integration
 */
Particle.prototype._integratePose = function _integratePose(dt) {
    if (!this.immune) SymplecticEuler.integratePosition(this, dt);
    this._eventEmitter.emit('update');
    if (this._force.length() < this.sleepThreshold && this._velocity.length() < this.sleepThreshold) {
        this.settled = true;
        this._eventEmitter.emit('settled');
        this._velocity.clear();
    }
};

module.exports = Particle;

},{"../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js","../../math/Vec3":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Vec3.js","../integrators/SymplecticEuler":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\integrators\\SymplecticEuler.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\constraints\\Constraint.js":[function(require,module,exports){
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
 * Base Constraint class to be used in the PhysicsSystem
 * Subclass this class to implement a constraint
 *
 * @virtual
 * @class Constraint
 */
function Constraint(options) {
    this.setOptions(options);

    this._source = null;
    this._targets = [];
    this._eventEmitter = new EventEmitter();

    if (options.source) this.setSource(options.source);
    if (options.targets) this.addTarget(options.targets);

    this._ID = null;
};

// Not meant to be implemented
Constraint.prototype = {};
Constraint.prototype.constructor = undefined;

Constraint.prototype.setOptions = function setOptions(options) {
    this.options = OptionsManager.patch(this.options || Object.create(this.constructor.DEFAULT_OPTIONS || {}), options);
};

Constraint.prototype.getSource = function getSource() {
    return this._source;
};

Constraint.prototype.getTargets = function getTargets() {
    return this._targets;
};

Constraint.prototype.setSource = function setSource(source) {
    this._eventEmitter.emit('add', source);
    this._source = source;
};

Constraint.prototype.addTarget = function addTarget(targets) {
    if (!(targets instanceof Array)) targets = [targets];
    this._eventEmitter.emit('add', targets);
    var nTargets = targets.length;
    while (nTargets--) {
        this._targets.push(targets[nTargets]);
    }
};

Constraint.prototype.removeTarget = function removeTarget(targets) {
    if (!(targets instanceof Array)) targets = [targets];
    var nTargets = targets.length;
    while (nTargets--) {
        var index = this._targets.indexOf(targets[nTargets]);
        if (index > -1) this._targets.splice(index, 1);
    }
};

/**
 * Detect violations of the constraint
 *
 * @method Constraint#update
 * @param {Particle | undefined} source the source of the constraint
 * @param {Particle[]} targets of the constraint
 * @throws when not subclassed
 */
Constraint.prototype.update = function update() {
    // throw new Error('Constraint should be extended, not implemented');
}

/**
 * Apply the constraint from the source to the targets
 *
 * @method Constraint#update
 * @param {Particle | undefined} source the source of the constraint
 * @param {Particle[]} targets of the constraint
 * @throws when not subclassed
 */
Constraint.prototype.resolve = function resolve(dt, iteration) {
    // throw new Error('Constraint should be extended, not implemented');
}

module.exports = Constraint;

},{"../../core/OptionsManager":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\OptionsManager.js","../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\forces\\Force.js":[function(require,module,exports){
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

    this._source = null;
    this._targets = [];
    this._forceFunction = this.options.forceFunction;
    this._eventEmitter = new EventEmitter();

    if (options.source) this.setSource(options.source);
    if (options.targets) this.addTarget(options.targets);

    this._ID = null;
}

// Not Meant to be implemented
Force.prototype = {};
Force.prototype.constructor = null;

Force.prototype.setOptions = function setOptions(options) {
    this.options = OptionsManager.patch(this.options || Object.create(this.constructor.DEFAULT_OPTIONS || {}), options);
};

Force.prototype.getSource = function getSource() {
    return this._source;
};

Force.prototype.getTargets = function getTargets() {
    return this._targets;
};

Force.prototype.setSource = function setSource(source) {
    this._source = source;
    this._eventEmitter.emit('add', source);
};

Force.prototype.addTarget = function addTarget(targets) {
    if (!(targets instanceof Array)) targets = [targets];
    var nTargets = targets.length;
    while (nTargets--) {
        this._targets.push(targets[nTargets]);
    }
    this._eventEmitter.emit('add', targets);
};

Force.prototype.removeTarget = function removeTarget(targets) {
    if (!(targets instanceof Array)) targets = [targets];
    var nTargets = targets.length;
    while (nTargets--) {
        var index = this._targets.indexOf(targets[nTargets]);
        if (index > -1) this._targets.splice(index, 1);
    }
};

/**
 * @method update
 * @param {Particle} source
 * @param {Particle[]} targets
 */
Force.prototype.update = function update() {
    var source = this._source;
    var targets = this._targets;

    this._eventEmitter.emit('update');
    for (var i = 0, len = targets.length; i < len; i++) {
        var target = targets[i];
        target.applyForce(this._forceFunction(source, target));
    }
};

module.exports = Force;

},{"../../core/OptionsManager":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\OptionsManager.js","../../events/EventEmitter":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\events\\EventEmitter.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\physics\\integrators\\SymplecticEuler.js":[function(require,module,exports){
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

var DELTA_REGISTER = new Vec3();

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
    var w = body.getInverseMass();
    var f = body.getForce();
    if (f.isZero()) return;

    v.add(DELTA_REGISTER.copy(f).scale(dt * w));
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

    if (Math.abs(v.x) === Infinity || Math.abs(v.y) === Infinity || Math.abs(v.z) === Infinity) debugger;

    p.add(DELTA_REGISTER.copy(v).scale(dt));
    if (Math.abs(p.x) === Infinity || Math.abs(p.y) === Infinity || Math.abs(p.z) === Infinity) debugger;
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
    q.normalize().put(q);
};

module.exports = SymplecticEuler;

},{"../../math/Vec3":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\math\\Vec3.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\transitions\\LiftSystem.js":[function(require,module,exports){
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

},{"../core/EntityRegistry":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\EntityRegistry.js"}],"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\src\\index.js":[function(require,module,exports){


var Engine  = require('famous/src/core/Engine');
var Surface = require('famous/src/core/Components/Surface');

window.onload = function() {

    var context = Engine.createContext();
    var entity = context.addChild();

    var surface = entity.addComponent(Surface, {
        size: [100,100],
        content: "<h2>Hello World</h2>",        
         properties: {
              color: "#FFF",
              backgroundColor: "#FA5C4F",
              textAlign: "center"
            }
    });
  
  entity.getComponent('transform').translate(100,100,0)

}


 
    
    


},{"famous/src/core/Components/Surface":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Surface.js","famous/src/core/Engine":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Engine.js"}]},{},["c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\src\\index.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxjc3NpZnlcXGJyb3dzZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxDYW1lcmEuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxDb250YWluZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxPcGFjaXR5LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcQ29tcG9uZW50c1xcU2l6ZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXENvbXBvbmVudHNcXFN1cmZhY2UuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxUYXJnZXQuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxUcmFuc2Zvcm0uanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb250ZXh0LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcRW5naW5lLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcRW50aXR5LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcRW50aXR5Q29sbGVjdGlvbi5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXEVudGl0eVJlZ2lzdHJ5LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcT3B0aW9uc01hbmFnZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxSZW5kZXJlcnNcXERPTXJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcUmVuZGVyZXJzXFxFbGVtZW50QWxsb2NhdG9yLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcUmVuZGVyZXJzXFxXZWJHTFJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcU3R5bGVzaGVldFxcZmFtb3VzLmNzcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXFN5c3RlbXNcXEJlaGF2aW9yU3lzdGVtLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcU3lzdGVtc1xcQ29yZVN5c3RlbS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXFN5c3RlbXNcXFJlbmRlclN5c3RlbS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXFN5c3RlbXNcXFRpbWVTeXN0ZW0uanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxldmVudHNcXEV2ZW50RW1pdHRlci5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGV2ZW50c1xcRXZlbnRIYW5kbGVyLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcZ2xcXEJ1ZmZlci5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGdsXFxHZW9tZXRyeS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGdsXFxTaGFkZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxnbFxcVGV4dHVyZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXG1hdGhcXE1hdHJpeDR4NC5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXG1hdGhcXFZlYzMuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxwaHlzaWNzXFxQaHlzaWNzU3lzdGVtLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xccGh5c2ljc1xcYm9kaWVzXFxQYXJ0aWNsZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXHBoeXNpY3NcXGNvbnN0cmFpbnRzXFxDb25zdHJhaW50LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xccGh5c2ljc1xcZm9yY2VzXFxGb3JjZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXHBoeXNpY3NcXGludGVncmF0b3JzXFxTeW1wbGVjdGljRXVsZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFx0cmFuc2l0aW9uc1xcTGlmdFN5c3RlbS5qcyIsInNyY1xcaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25iQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVVBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3NzLCBjdXN0b21Eb2N1bWVudCkge1xuICB2YXIgZG9jID0gY3VzdG9tRG9jdW1lbnQgfHwgZG9jdW1lbnQ7XG4gIGlmIChkb2MuY3JlYXRlU3R5bGVTaGVldCkge1xuICAgIHZhciBzaGVldCA9IGRvYy5jcmVhdGVTdHlsZVNoZWV0KClcbiAgICBzaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgIHJldHVybiBzaGVldC5vd25lck5vZGU7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGhlYWQgPSBkb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICAgICAgc3R5bGUgPSBkb2MuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuXG4gICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICB9IGVsc2Uge1xuICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jLmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgIH1cblxuICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgIHJldHVybiBzdHlsZTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMuYnlVcmwgPSBmdW5jdGlvbih1cmwpIHtcbiAgaWYgKGRvY3VtZW50LmNyZWF0ZVN0eWxlU2hlZXQpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlU3R5bGVTaGVldCh1cmwpLm93bmVyTm9kZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgICAgIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5cbiAgICBsaW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcbiAgICBsaW5rLmhyZWYgPSB1cmw7XG5cbiAgICBoZWFkLmFwcGVuZENoaWxkKGxpbmspO1xuICAgIHJldHVybiBsaW5rO1xuICB9XG59O1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWF0cml4TWF0aCAgICAgPSByZXF1aXJlKCcuLi8uLi9tYXRoL01hdHJpeDR4NCcpO1xudmFyIE9wdGlvbnNNYW5hZ2VyID0gcmVxdWlyZSgnLi4vT3B0aW9uc01hbmFnZXInKTtcblxuLy8gQ09OU1RTXG52YXIgQ09NUE9ORU5UX05BTUUgPSAnY2FtZXJhJztcbnZhciBQUk9KRUNUSU9OICAgICA9ICdwcm9qZWN0aW9uJztcblxudmFyIE1haW5DYW1lcmEgICAgID0gbnVsbDtcblxuLyoqXG4gKiBDYW1lcmFcbiAqXG4gKiBAY29tcG9uZW50IENhbWVyYVxuICogQGNvbnN0cnVjdG9yXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBbZW50aXR5XSAgRW50aXR5IHRoYXQgdGhlIENvbnRhaW5lciBpcyBhIGNvbXBvbmVudCBvZlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBbiBvYmplY3Qgb2YgY29uZmlndXJhYmxlIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy50eXBlPSdwaW5ob2xlJ10gVGhlIHByb2plY3Rpb24gbW9kZWwgdXNlZCBpbiB0aGUgZ2VuZXJhdGlvbiBvZiBjYW1lcmEncyBwcm9qZWN0aW9uIG1hdHJpeCwgaWRlbnRpZmllZCBieSBzdHJpbmcuIENhbiBiZSBlaXRoZXIgJ3BlcnNwZWN0aXZlJywgb3IgJ3BpbmhvbGUnLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnByb2plY3Rpb25dIEEgc3ViLW9iamVjdCBvZiBvcHRpb25zIHJlc3BvbnNpYmxlIGZvciBjb25maWd1cmluZyBwcm9qZWN0aW9uLiBUaGVzZSBvcHRpb25zIHZhcnlcbiAqIEBwYXJhbSB7QXJyYXkgfCBOdW1iZXIgMUQgfCBWZWN0b3IgM30gIFtvcHRpb25zLnByb2plY3Rpb24uZm9jYWxQb2ludD1bMCwgMCwgMF1dICBTcGVjaWZpZXMgdGhlIGZvY2FsIHBvaW50IGZvciBwaW5ob2xlIHByb2plY3Rpb24uIFRoZSBmaXJzdCB0d28gbnVtYmVycyBkZXRlcm1pbmUgdGhlIHggYW5kIHkgb2YgdGhlIHZhbmlzaGluZyBwb2ludCwgYW5kIHRoZSB0aGlyZCBkZXRlcm1pbmVzIHRoZSBkaXN0YW5jZSBvZiB0aGUgY2FtZXJhJ3MgXCJleWVcIiB0byB0aGUgbWF0aGVtYXRpY2FsIHh5IHBsYW5lIG9mIHlvdXIgc2NlbmUuXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMucHJvamVjdGlvbi5uZWFyUGxhbmU9MF0gIFNwZWNpZmllcyB0aGUgbmVhciBib3VuZCBvZiB0aGUgdmlld2luZyB2b2x1bWUgZm9yIHBlcnNwZWN0aXZlIHByb2plY3Rpb24uXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMucHJvamVjdGlvbi5mYXJQbGFuZT0wXSAgU3BlY2lmaWVzIHRoZSBmYXIgYm91bmQgb2YgdGhlIHZpZXdpbmcgdm9sdW1lIGZvciBwZXJzcGVjdGl2ZSBwcm9qZWN0aW9uLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnByb2plY3Rpb24uZmllbGRPZlZpZXc9UEkvNF0gIFNwZWNpZmllcyB0aGUgZmllbGQgb2YgdmlldyBmb3IgcGVyc3BlY3RpdmUgcHJvamVjdGlvbiAoaW4gcmFkaWFucykuXG4gKi9cbmZ1bmN0aW9uIENhbWVyYShlbnRpdHksIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9lbnRpdHkgICAgICAgICAgICAgID0gZW50aXR5O1xuXG4gICAgdGhpcy5fcHJvamVjdGlvblRyYW5zZm9ybSA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKTtcblxuICAgIHRoaXMub3B0aW9ucyAgICAgICAgICAgICAgPSBPYmplY3QuY3JlYXRlKENhbWVyYS5ERUZBVUxUX09QVElPTlMpO1xuICAgIHRoaXMuX29wdGlvbnNNYW5hZ2VyICAgICAgPSBuZXcgT3B0aW9uc01hbmFnZXIodGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLl9vcHRpb25zTWFuYWdlci5vbignY2hhbmdlJywgX2V2ZW50c0NoYW5nZS5iaW5kKHRoaXMpKTsgLy9yb2J1c3QgaW50ZWdyYXRpb25cblxuICAgIGlmIChvcHRpb25zKSB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICBfcmVjYWxjdWxhdGVQcm9qZWN0aW9uVHJhbnNmb3JtLmNhbGwodGhpcyk7XG59XG5cbkNhbWVyYS5ERUZBVUxUX1BJTkhPTEVfT1BUSU9OUyA9IHtcbiAgICBmb2NhbFBvaW50OiBbMCwgMCwgMF1cbn07XG5cbkNhbWVyYS5ERUZBVUxUX1BFUlNQRUNUSVZFX09QVElPTlMgPSB7XG4gICAgbmVhclBsYW5lOiAwLFxuICAgIGZhclBsYW5lOiAwLFxuICAgIGZpZWxkT2ZWaWV3OiAwLjc4NTM5ODE2MzM5IC8vIFBJLzQgfCA0NSBkZWdyZWVzXG59O1xuXG5DYW1lcmEuREVGQVVMVF9PUFRJT05TID0ge1xuICAgIHR5cGUgICAgOiAncGluaG9sZScsXG4gICAgcHJvamVjdGlvbiA6IENhbWVyYS5ERUZBVUxUX1BJTkhPTEVfT1BUSU9OU1xufTtcblxuQ2FtZXJhLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIENPTVBPTkVOVF9OQU1FO1xufTtcblxuQ2FtZXJhLmdldE1haW5DYW1lcmEgPSBmdW5jdGlvbiBnZXRNYWluQ2FtZXJhKCkge1xuICAgIHJldHVybiBNYWluQ2FtZXJhO1xufTtcblxuQ2FtZXJhLnByb2plY3Rpb25UcmFuc2Zvcm1zID0ge307XG5cbkNhbWVyYS5wcm9qZWN0aW9uVHJhbnNmb3Jtcy5waW5ob2xlID0gZnVuY3Rpb24gcGluaG9sZSh0cmFuc2Zvcm0sIG9wdGlvbnMpIHtcbiAgICB2YXIgZm9jYWxWZWN0b3IgPSBvcHRpb25zLmZvY2FsUG9pbnQ7XG4gICAgdmFyIGZvY2FsRGl2aWRlID0gZm9jYWxWZWN0b3JbMl0gPyAxL2ZvY2FsVmVjdG9yWzJdIDogMDtcblxuICAgIHRyYW5zZm9ybVswXSAgPSAxO1xuICAgIHRyYW5zZm9ybVsxXSAgPSAwO1xuICAgIHRyYW5zZm9ybVsyXSAgPSAwO1xuICAgIHRyYW5zZm9ybVszXSAgPSAwO1xuICAgIFxuICAgIHRyYW5zZm9ybVs0XSAgPSAwO1xuICAgIHRyYW5zZm9ybVs1XSAgPSAxO1xuICAgIHRyYW5zZm9ybVs2XSAgPSAwO1xuICAgIHRyYW5zZm9ybVs3XSAgPSAwO1xuICAgXG4gICAgdHJhbnNmb3JtWzhdICA9IC1mb2NhbERpdmlkZSAqIGZvY2FsVmVjdG9yWzBdO1xuICAgIHRyYW5zZm9ybVs5XSAgPSAtZm9jYWxEaXZpZGUgKiBmb2NhbFZlY3RvclsxXTtcbiAgICB0cmFuc2Zvcm1bMTBdID0gZm9jYWxEaXZpZGU7XG4gICAgdHJhbnNmb3JtWzExXSA9IC1mb2NhbERpdmlkZTtcbiAgICBcbiAgICB0cmFuc2Zvcm1bMTJdID0gMDtcbiAgICB0cmFuc2Zvcm1bMTNdID0gMDtcbiAgICB0cmFuc2Zvcm1bMTRdID0gMDtcbiAgICB0cmFuc2Zvcm1bMTVdID0gMTtcblxuICAgIHJldHVybiB0cmFuc2Zvcm07XG59O1xuXG5DYW1lcmEucHJvamVjdGlvblRyYW5zZm9ybXMucGVyc3BlY3RpdmUgPSBmdW5jdGlvbiBwZXJzcGVjdGl2ZSh0cmFuc2Zvcm0sIG9wdGlvbnMpIHtcbiAgICB2YXIgbmVhciA9IG9wdGlvbnMubmVhclBsYW5lO1xuICAgIHZhciBmYXIgID0gb3B0aW9ucy5mYXJQbGFuZTtcbiAgICB2YXIgZm92eSA9IG9wdGlvbnMuZmllbGRPZlZpZXc7XG5cbiAgICB2YXIgZiAgPSAxIC8gTWF0aC50YW4oZm92eSAvIDIpO1xuICAgIHZhciBuZiA9IChuZWFyICYmIGZhcikgPyAxIC8gKG5lYXIgLSBmYXIpIDogMDtcblxuICAgIHRyYW5zZm9ybVswXSAgPSBmO1xuICAgIHRyYW5zZm9ybVsxXSAgPSAwO1xuICAgIHRyYW5zZm9ybVsyXSAgPSAwO1xuICAgIHRyYW5zZm9ybVszXSAgPSAwO1xuXG4gICAgdHJhbnNmb3JtWzRdICA9IDA7XG4gICAgdHJhbnNmb3JtWzVdICA9IGY7XG4gICAgdHJhbnNmb3JtWzZdICA9IDA7XG4gICAgdHJhbnNmb3JtWzddICA9IDA7XG5cbiAgICB0cmFuc2Zvcm1bOF0gID0gMDtcbiAgICB0cmFuc2Zvcm1bOV0gID0gMDtcbiAgICB0cmFuc2Zvcm1bMTBdID0gKGZhciArIG5lYXIpICogbmY7XG4gICAgdHJhbnNmb3JtWzExXSA9IC0xO1xuXG4gICAgdHJhbnNmb3JtWzEyXSA9IDA7XG4gICAgdHJhbnNmb3JtWzEzXSA9IDA7XG4gICAgdHJhbnNmb3JtWzE0XSA9ICgyICogZmFyICogbmVhcikgKiBuZjtcbiAgICB0cmFuc2Zvcm1bMTVdID0gMDtcblxuICAgIHJldHVybiB0cmFuc2Zvcm07XG59O1xuXG5mdW5jdGlvbiBfZXZlbnRzQ2hhbmdlKGRhdGEpIHtcbiAgICBpZiAoZGF0YS5pZCA9PT0gUFJPSkVDVElPTikge1xuICAgICAgICBfcmVjYWxjdWxhdGVQcm9qZWN0aW9uVHJhbnNmb3JtLmNhbGwodGhpcyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBfcmVjYWxjdWxhdGVQcm9qZWN0aW9uVHJhbnNmb3JtKCkge1xuICAgIHJldHVybiBDYW1lcmEucHJvamVjdGlvblRyYW5zZm9ybXNbdGhpcy5vcHRpb25zLnR5cGVdKHRoaXMuX3Byb2plY3Rpb25UcmFuc2Zvcm0sIHRoaXMub3B0aW9ucy5wcm9qZWN0aW9uKTtcbn1cblxuQ2FtZXJhLnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuX29wdGlvbnNNYW5hZ2VyLnNldE9wdGlvbnMob3B0aW9ucyk7XG59O1xuXG5DYW1lcmEucHJvdG90eXBlLmdldE9wdGlvbnMgPSBmdW5jdGlvbiBnZXRPcHRpb25zKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIENhbWVyYSdzIGN1cnJlbnQgcHJvamVjdGlvbiB0cmFuc2Zvcm0uXG4gKlxuICogQG1ldGhvZCBnZXRQcm9qZWN0aW9uVHJhbnNmb3JtXG4gKiBAY2hhaW5hYmxlXG4gKlxuICogQHJldHVybiB7QXJyYXkgfCAxRCBObWJlcnwgVHJhbnNmb3JtfVxuICovXG5DYW1lcmEucHJvdG90eXBlLmdldFByb2plY3Rpb25UcmFuc2Zvcm0gPSBmdW5jdGlvbiBnZXRQcm9qZWN0aW9uVHJhbnNmb3JtKCkge1xuICAgIHJldHVybiB0aGlzLl9wcm9qZWN0aW9uVHJhbnNmb3JtO1xufTtcblxuXG5DYW1lcmEucHJvdG90eXBlLnNldFBlcnNwZWN0aXZlID0gZnVuY3Rpb24gc2V0UGVyc3BlY3RpdmUoZm9jYWxEZXB0aCkge1xuICAgIC8vSXMgdGhlcmUgYSBsZXNzIGdhcmJhZ2UteSB3YXkgdG8gZG8gdGhpcz8gKHllcykgSXMgaXQgZXZlbiBkZXNpcmFibGU/IChhbGlhc2luZyBhbGxvd3MgZm9yIG9uZSBzb3VyY2Ugb2YgbG9naWMpXG4gICAgdGhpcy5zZXRPcHRpb25zKHtcbiAgICAgICAgdHlwZTogJ3BpbmhvbGUnLFxuICAgICAgICBwcm9qZWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgZm9jYWxQb2ludDogWzAsIDAsIGZvY2FsRGVwdGhdXG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuQ2FtZXJhLnByb3RvdHlwZS5zZXRNYWluQ2FtZXJhID0gZnVuY3Rpb24gc2V0TWFpbkNhbWVyYSgpIHtcbiAgICBNYWluQ2FtZXJhID0gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FtZXJhO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9FbnRpdHlSZWdpc3RyeScpO1xudmFyIE1hdHJpeE1hdGggICAgID0gcmVxdWlyZSgnLi4vLi4vbWF0aC9NYXRyaXg0eDQnKTtcbnZhciBFdmVudEhhbmRsZXIgICA9IHJlcXVpcmUoJy4uLy4uL2V2ZW50cy9FdmVudEhhbmRsZXInKTtcbnZhciBUYXJnZXQgICA9IHJlcXVpcmUoJy4vVGFyZ2V0Jyk7XG52YXIgR0wgICA9IHJlcXVpcmUoJy4uL1JlbmRlcmVycy9XZWJHTFJlbmRlcmVyJyk7XG5cbi8vIENvbnN0c1xudmFyIENPTlRBSU5FUiA9ICdjb250YWluZXInO1xuXG4vKipcbiAqIENvbnRhaW5lciBpcyBhIGNvbXBvbmVudCB0aGF0IGNhbiBiZSBhZGRlZCB0byBhbiBFbnRpdHkgdGhhdFxuICogICBpcyByZXByZXNlbnRlZCBieSBhIERPTSBub2RlIHRocm91Z2ggd2hpY2ggb3RoZXIgcmVuZGVyYWJsZXNcbiAqICAgaW4gdGhlIHNjZW5lIGdyYXBoIGNhbiBiZSBkcmF3biBpbnNpZGUgb2YuXG4gKlxuICogQGNsYXNzIENvbnRhaW5lclxuICogQGNvbXBvbmVudFxuICogQGNvbnN0cnVjdG9yXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgIEVudGl0eSB0aGF0IHRoZSBDb250YWluZXIgaXMgYSBjb21wb25lbnQgb2ZcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gQ29udGFpbmVyKGVudGl0eUlELCBvcHRpb25zKSB7XG4gICAgdGhpcy5nbCA9IEdMLmluaXQob3B0aW9ucyk7XG5cbiAgICBUYXJnZXQuY2FsbCh0aGlzLCBlbnRpdHlJRCwge1xuICAgICAgICB2ZXJ0aWNpZXM6IFtuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSldXG4gICAgfSk7XG5cbiAgICB2YXIgZW50aXR5ID0gdGhpcy5nZXRFbnRpdHkoKTtcbiAgICBFbnRpdHlSZWdpc3RyeS5yZWdpc3RlcihlbnRpdHksICdIYXNDb250YWluZXInKTtcblxuICAgIHRoaXMuX2NvbnRhaW5lciAgICAgPSBvcHRpb25zLmNvbnRhaW5lcjtcbiAgICB2YXIgdHJhbnNmb3JtICAgICAgID0gZW50aXR5LmdldENvbXBvbmVudCgndHJhbnNmb3JtJyk7XG4gICAgdGhpcy5faW52ZXJzZU1hdHJpeCA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKTtcbiAgICB0aGlzLl9zaXplICAgICAgICAgID0gb3B0aW9ucy5zaXplIHx8IGVudGl0eS5nZXRDb250ZXh0KCkuX3NpemUuc2xpY2UoKTtcbiAgICB0aGlzLm9yaWdpbiAgICAgICAgID0gWzAuNSwgMC41XTtcblxuICAgIHRoaXMuX2V2ZW50T3V0cHV0ID0gbmV3IEV2ZW50SGFuZGxlcigpO1xuICAgIHRoaXMuX2V2ZW50T3V0cHV0LmJpbmRUaGlzKHRoaXMpO1xuXG4gICAgdGhpcy5fZXZlbnRzID0ge1xuICAgICAgICBldmVudEZvcndhcmRlcjogZnVuY3Rpb24gZXZlbnRGb3J3YXJkZXIoZXZlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdChldmVudC50eXBlLCBldmVudCk7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9LmJpbmQodGhpcyksXG4gICAgICAgIG9uICAgIDogW10sXG4gICAgICAgIG9mZiAgIDogW10sXG4gICAgICAgIGRpcnR5IDogZmFsc2VcbiAgICB9O1xuXG4gICAgdGhpcy5fdHJhbnNmb3JtRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3NpemVEaXJ0eSAgICAgID0gdHJ1ZTtcblxuICAgIC8vIEludmVyc2VzIHRoZSBDb250YWluZXIncyB0cmFuc2Zvcm0gbWF0cml4IHRvIGhhdmUgZWxlbWVudHMgbmVzdGVkIGluc2lkZVxuICAgIC8vIHRvIGFwcGVhciBpbiB3b3JsZCBzcGFjZS5cbiAgICB0cmFuc2Zvcm0ub24oJ2ludmFsaWRhdGVkJywgZnVuY3Rpb24ocmVwb3J0KSB7XG4gICAgICAgIE1hdHJpeE1hdGguaW52ZXJ0KHRoaXMuX2ludmVyc2VNYXRyaXgsIHRyYW5zZm9ybS5fbWF0cml4KTtcbiAgICAgICAgdGhpcy5fdHJhbnNmb3JtRGlydHkgPSB0cnVlO1xuICAgIH0uYmluZCh0aGlzKSk7XG59XG5cbkNvbnRhaW5lci50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBDT05UQUlORVI7XG59O1xuXG5cbkNvbnRhaW5lci5wcm90b3R5cGUgICAgICAgICAgICAgPSBPYmplY3QuY3JlYXRlKFRhcmdldC5wcm90b3R5cGUpO1xuQ29udGFpbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnRhaW5lcjtcblxuLyoqXG4gKiBCaW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYW4gZXZlbnQgdHlwZSBoYW5kbGVkIGJ5IHRoaXMgb2JqZWN0J3NcbiAqICBFdmVudEhhbmRsZXIuXG4gKlxuICogQG1ldGhvZCBvblxuICogQGNoYWluYWJsZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBPYmplY3QpfSBoYW5kbGVyIGNhbGxiYWNrXG4gKi9cbkNvbnRhaW5lci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldmVudCwgY2IpIHtcbiAgICBpZiAodHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJyAmJiBjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50T3V0cHV0Lm9uKGV2ZW50LCBjYik7XG4gICAgICAgIGlmICh0aGlzLl9ldmVudHMub24uaW5kZXhPZihldmVudCkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLl9ldmVudHMub24ucHVzaChldmVudCk7XG4gICAgICAgICAgICB0aGlzLl9ldmVudHMuZGlydHkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuX2V2ZW50cy5vZmYuaW5kZXhPZihldmVudCk7XG4gICAgICAgIGlmIChpbmRleCA+IC0xKSB0aGlzLl9ldmVudHMub2ZmLnNwbGljZShpbmRleCwgMSk7XG4gICAgfSBlbHNlIHRocm93IG5ldyBFcnJvcignb24gdGFrZXMgYW4gZXZlbnQgbmFtZSBhcyBhIHN0cmluZyBhbmQgYSBjYWxsYmFjayB0byBiZSBmaXJlZCB3aGVuIHRoYXQgZXZlbnQgaXMgcmVjZWl2ZWQnKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGEgZnVuY3Rpb24gdG8gYSBwYXJ0aWN1bGFyIGV2ZW50IG9jY3VyaW5nLlxuICpcbiAqIEBtZXRob2QgIG9mZlxuICogQGNoYWluYWJsZVxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgbmFtZSBvZiB0aGUgZXZlbnQgdG8gY2FsbCB0aGUgZnVuY3Rpb24gd2hlbiBvY2N1cmluZ1xuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGV2ZW50IGlzIHJlY2lldmVkLlxuICovXG5Db250YWluZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uIG9mZihldmVudCwgY2IpIHtcbiAgICBpZiAodHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJyAmJiBjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuX2V2ZW50cy5vbi5pbmRleE9mKGV2ZW50KTtcbiAgICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50T3V0cHV0LnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBjYik7XG4gICAgICAgICAgICB0aGlzLl9ldmVudHMub24uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5vZmYucHVzaChldmVudCk7XG4gICAgICAgICAgICB0aGlzLl9ldmVudHMuZGlydHkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHRocm93IG5ldyBFcnJvcignb2ZmIHRha2VzIGFuIGV2ZW50IG5hbWUgYXMgYSBzdHJpbmcgYW5kIGEgY2FsbGJhY2sgdG8gYmUgZmlyZWQgd2hlbiB0aGF0IGV2ZW50IGlzIHJlY2VpdmVkJyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCBldmVudCBoYW5kbGVyIG9iamVjdCB0byB0aGUgRXZlbnRIYW5kbGVyJ3MgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqXG4gKiBAbWV0aG9kIHBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IGV2ZW50IGhhbmRsZXIgdGFyZ2V0IG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwYXNzZWQgZXZlbnQgaGFuZGxlclxuICovXG5Db250YWluZXIucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiBwaXBlKHRhcmdldCkge1xuICAgIHZhciByZXN1bHQgPSB0aGlzLl9ldmVudE91dHB1dC5waXBlKHRhcmdldCk7XG4gICAgZm9yICh2YXIgZXZlbnQgaW4gdGhpcy5fZXZlbnRPdXRwdXQubGlzdGVuZXJzKSB7XG4gICAgICAgIGlmICh0aGlzLl9ldmVudHMub24uaW5kZXhPZihldmVudCkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLl9ldmVudHMub24ucHVzaChldmVudCk7XG4gICAgICAgICAgICB0aGlzLl9ldmVudHMuZGlydHkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4gLyoqXG4gKiBSZW1vdmUgaGFuZGxlciBvYmplY3QgZnJvbSB0aGUgRXZlbnRIYW5kbGVyJ3MgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqICAgVW5kb2VzIHdvcmsgb2YgXCJwaXBlXCIuXG4gKlxuICogQG1ldGhvZCB1bnBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IHRhcmdldCBoYW5kbGVyIG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwcm92aWRlZCB0YXJnZXRcbiAqL1xuQ29udGFpbmVyLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbiB1bnBpcGUodGFyZ2V0KSB7XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50T3V0cHV0LnVucGlwZSh0YXJnZXQpO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VyIGFuIGV2ZW50LCBzZW5kaW5nIHRvIGFsbCBvZiB0aGUgRXZlbmV0SGFuZGxlcidzIFxuICogIGRvd25zdHJlYW0gaGFuZGxlcnMgbGlzdGVuaW5nIGZvciBwcm92aWRlZCAndHlwZScga2V5LlxuICpcbiAqIEBtZXRob2QgZW1pdFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBldmVudCBkYXRhXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuQ29udGFpbmVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdCh0eXBlLCBldmVudCkge1xuICAgIGlmIChldmVudCAmJiAhZXZlbnQub3JpZ2luKSBldmVudC5vcmlnaW4gPSB0aGlzO1xuICAgIHZhciBoYW5kbGVkID0gdGhpcy5fZXZlbnRPdXRwdXQuZW1pdCh0eXBlLCBldmVudCk7XG4gICAgaWYgKGhhbmRsZWQgJiYgZXZlbnQgJiYgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKSBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gaGFuZGxlZDtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBkaXNwbGF5IG1hdHJpeCBvZiB0aGUgQ29udGFpbmVyLlxuICpcbiAqIEBtZXRob2QgZ2V0RGlzcGxheU1hdHJpeFxuICogXG4gKiBAcmV0dXJuIHtBcnJheX0gZGlzcGxheSBtYXRyaXggb2YgdGhlIENvbnRhaW5lclxuICovXG5Db250YWluZXIucHJvdG90eXBlLmdldERpc3BsYXlNYXRyaXggPSBmdW5jdGlvbiBnZXREaXNwbGF5TWF0cml4KCkge1xuICAgIHJldHVybiB0aGlzLl9pbnZlcnNlTWF0cml4O1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIHNpemUgb2YgdGhlIENvbnRhaW5lci5cbiAqXG4gKiBAbWV0aG9kIHNldFNpemVcbiAqIEBjaGFpbmFibGVcbiAqIFxuICogQHJldHVybiB7QXJyYXl9IDIgZGltZW5zaW9uYWwgYXJyYXkgb2YgcmVwcmVzZW50aW5nIHRoZSBzaXplIG9mIHRoZSBDb250YWluZXJcbiAqL1xuQ29udGFpbmVyLnByb3RvdHlwZS5zZXRDU1NTaXplID0gZnVuY3Rpb24gc2V0Q1NTU2l6ZSh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdGhpcy5fc2l6ZVswXSAgID0gd2lkdGg7XG4gICAgdGhpcy5fc2l6ZVsxXSAgID0gaGVpZ2h0O1xuICAgIHRoaXMuX3NpemVEaXJ0eSA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Db250YWluZXIucHJvdG90eXBlLmdldENTU1NpemUgPSBmdW5jdGlvbiBnZXRDU1NTaXplKCkge1xuICAgIHJldHVybiB0aGlzLl9zaXplO1xufTtcblxuXG5Db250YWluZXIucHJvdG90eXBlLl9zZXRWZXJ0ZXhEaXNwbGFjZW1lbnQgPSBmdW5jdGlvbiBfc2V0VmVydGV4RGlzcGxhY2VtZW50ICh4LCB5KSB7XG4gICAgdmFyIHlPcmlnaW5PZmZzZXQgPSB0aGlzLm9yaWdpblsxXSAqIHksXG4gICAgICAgIHhPcmlnaW5PZmZzZXQgPSB0aGlzLm9yaWdpblswXSAqIHg7XG5cbiAgICB0aGlzLnZlcnRpY2llc1swXVswXSA9IDAgLSB4T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzBdWzFdID0gMCAtIHlPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMV1bMF0gPSB4IC0geE9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1sxXVsxXSA9IDAgLSB5T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzJdWzBdID0geCAtIHhPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMl1bMV0gPSB5IC0geU9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1szXVswXSA9IDAgLSB4T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzNdWzFdID0geSAtIHlPcmlnaW5PZmZzZXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRhaW5lcjtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4uLy4uL2V2ZW50cy9FdmVudEVtaXR0ZXInKTtcblxuLyoqXG4gKiBPcGFjaXR5IGRldGVybWluZXMgd2hhdCB0aGUgT3BhY2l0eSBvZiBldmVyeXRoaW5nIGJlbG93IGl0IGluIHRoZVxuICogICBzY2VuZSBncmFwaCBzaG91bGQgYmUuXG4gKlxuICogQGNsYXNzIE9wYWNpdHlcbiAqIEBjb21wb25lbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBPcGFjaXR5KGVudGl0eUlkLCBvcHRpb25zKSB7XG4gICAgdGhpcy5fbG9jYWxPcGFjaXR5ICA9IDE7XG4gICAgdGhpcy5fZ2xvYmFsT3BhY2l0eSA9IDE7XG4gICAgdGhpcy5fdXBkYXRlRk4gICAgICA9IG51bGw7XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgICA9IGZhbHNlO1xuICAgIHRoaXMuX2V2ZW50SGFuZGxlciAgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgdGhpcy5fZW50aXR5SWQgICAgICA9IGVudGl0eUlkO1xuXG4gICAgdGhpcy5fbXV0YXRvciA9IHtcbiAgICAgICAgc2V0OiB0aGlzLnNldC5iaW5kKHRoaXMpLFxuICAgICAgICBvcGFjaXRhdGU6IHRoaXMub3BhY2l0YXRlLmJpbmQodGhpcylcbiAgICB9O1xufVxuXG52YXIgT1BBQ0lUWSA9ICdvcGFjaXR5Jztcbk9wYWNpdHkudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHsgcmV0dXJuIE9QQUNJVFkgfTtcblxuLyoqXG4gKiBTZXQgd2lsbCB1cGRhdGUgdGhlIGxvY2FsIG9wYWNpdHkgYW5kIGludmFsaWRhdGUgaXRcbiAqXG4gKiBAbWV0aG9kICBzZXRcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IG9wYWNpdHkgbmV3IG9wYWNpdHkgdmFsdWUgZm9yIHRoaXMgRW50aXR5XG4gKi9cbk9wYWNpdHkucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldChvcGFjaXR5KSB7XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgID0gdHJ1ZTtcbiAgICB0aGlzLl9sb2NhbE9wYWNpdHkgPSBvcGFjaXR5O1xufTtcblxuLyoqXG4gKiBBZGRpdGl2ZSB2ZXJzaW9uIG9mIHNldC4gIEFsc28gbWFya3MgdGhlIE9wYWNpdHkgYXMgaW52YWxpZGF0ZWQuXG4gKlxuICogQG1ldGhvZCAgb3BhY2l0YXRlXG4gKiBcbiAqIEBwYXJhbSAge051bWJlcn0gZGlmZmVyZW50aWFsIGRpZmZlcmVudGlhbCB0byBhcHBseSB0byB0aGUgY3VycmVjdCBvcGFjaXR5IHZhbHVlXG4gKi9cbk9wYWNpdHkucHJvdG90eXBlLm9wYWNpdGF0ZSA9IGZ1bmN0aW9uIG9wYWNpdGF0ZShkaWZmZXJlbnRpYWwpIHtcbiAgICB0aGlzLl9pbnZhbGlkYXRlZCAgPSB0cnVlO1xuICAgIHRoaXMuX2xvY2FsT3BhY2l0eSArPSBkaWZmZXJlbnRpYWw7XG59O1xuXG4vKipcbiAqIFJldHVybnMgd2hhdCB0aGUgZ2xvYmFsIG9wYWNpdHkgaXMgYXQgdGhpcyBwYXJ0IG9mIHRoZSBzY2VuZSBncmFwaC4gIEdsb2JhbFxuICogICBpcyB0aGUgcmVzdWx0IG9mIG11bHRpcGx5aW5nIHRoZSBwYXJlbnQncyBvcGFjaXR5IHdpdGggdGhpcyBpbnN0YW5jZSdzXG4gKiAgIG9wYWNpdHkuXG4gKlxuICogQG1ldGhvZCBnZXRHbG9iYWxPcGFjaXR5XG4gKiBcbiAqIEByZXR1cm4ge051bWJlcn0gQ3VtdWxhdGl2ZSBvcGFjaXR5IGF0IHRoaXMgcG9pbnQgaW4gdGhlIHNjZW5lIGdyYXBoXG4gKi9cbk9wYWNpdHkucHJvdG90eXBlLmdldEdsb2JhbE9wYWNpdHkgPSBmdW5jdGlvbiBnZXRHbG9iYWxPcGFjaXR5KCkge1xuICAgIHJldHVybiB0aGlzLl9nbG9iYWxPcGFjaXR5O1xufTtcblxuLyoqXG4gKiBnZXRMb2NhbE9wYWNpdHkgcmV0dXJucyB0aGlzIGluc3RhbmNlJ3Mgc3BlY2lmaWVkIG9wYWNpdHkuXG4gKlxuICogQG1ldGhvZCAgZ2V0TG9jYWxPcGFjaXR5XG4gKiBcbiAqIEByZXR1cm4ge051bWJlcn0gdGhpcyBpbnN0YW5jZSdzIHNwZWNpZmllZCBvcGFjaXR5XG4gKi9cbk9wYWNpdHkucHJvdG90eXBlLmdldExvY2FsT3BhY2l0eSA9IGZ1bmN0aW9uIGdldExvY2FsT3BhY2l0eSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbG9jYWxPcGFjaXR5O1xufTtcblxuLyoqXG4gKiBEZWZpbmUgd2hlcmUgdGhlIG9wYWNpdHkgd2lsbCBiZSBnZXR0aW5nIGl0J3Mgc291cmNlIG9mIHRydXRoIGZyb20uXG4gKlxuICogQG1ldGhvZCAgdXBkYXRlRnJvbVxuICogXG4gKiBAcGFyYW0gIHtGdW5jdGlvbnxUcmFuc2l0aW9uYWJsZXxOdW1iZXJ9IHByb3ZpZGVyIHNvdXJjZSBvZiBzdGF0ZSBmb3IgdGhlIE9wYWNpdHlcbiAqL1xuT3BhY2l0eS5wcm90b3R5cGUudXBkYXRlRnJvbSA9IGZ1bmN0aW9uIHVwZGF0ZUZyb20ocHJvdmlkZXIpIHtcbiAgICBpZiAocHJvdmlkZXIgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB0aGlzLl91cGRhdGVGTiA9IHByb3ZpZGVyLmJpbmQodGhpcyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHByb3ZpZGVyLmdldCAmJiBwcm92aWRlci5nZXQgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIHByb3ZpZGVyLmdldCgpICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPcGFjaXR5OiBUcmFuc2l0aW9uYWJsZXMgcGFzc2VkIHRvIG9wYWNpdHlGcm9tIG11c3QgcmV0dXJuIE51bWJlcnMnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUZOID0gZnVuY3Rpb24ob3BhY2l0eSkge1xuICAgICAgICAgICAgICAgIG9wYWNpdHkuc2V0KHByb3ZpZGVyLmdldCgpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICh0eXBlb2YgcHJvdmlkZXIgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09wYWNpdHk6IENvbnN0YW50cyBwYXNzZWQgdG8gb3BhY2l0eUZyb20gbXVzdCByZXR1cm4gTnVtYmVycycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXQocHJvdmlkZXIpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIHZhbHVlcyBvZiB0aGUgT3BhY2l0eSBnaXZlbiBpbmZvcm1hdGlvbiBhYm91dCBpdCdzIHBhcmVudC5cbiAqXG4gKiBAbWV0aG9kICBfdXBkYXRlXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0gIHtCb29sZWFufSBwYXJlbnRSZXBvcnQgZmxhZyBkZW5vdGluZyB3aGV0aGVyIHRoZSBwYXJlbnQgT3BhY2l0eSB3YXMgaW52YWxpZGF0ZWRcbiAqIEBwYXJhbSAge051bWJlcn0gcGFyZW50T3BhY2l0eSB2YWx1ZSBvZiB0aGUgZ2xvYmFsIG9wYWNpdHkgdXAgdG8gdGhpcyBwb2ludCBpbiB0aGUgc2NlbmUgZ3JhcGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59IGZsYWcgZGVub3RpbmcgaWYgdGhpcyBPcGFjaXR5IHdhcyBpbnZhbGlkYXRlZFxuICovXG5PcGFjaXR5LnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24gX3VwZGF0ZShwYXJlbnRSZXBvcnQsIHBhcmVudE9wYWNpdHkpIHtcbiAgICBpZiAocGFyZW50UmVwb3J0KSB0aGlzLl9pbnZhbGlkYXRlZCA9IHRydWU7XG4gICAgaWYgKHRoaXMuX3VwZGF0ZUZOKSB0aGlzLl91cGRhdGVGTih0aGlzLl9tdXRhdG9yKTtcblxuICAgIGlmIChwYXJlbnRPcGFjaXR5ID09IG51bGwpIHBhcmVudE9wYWNpdHkgPSAxO1xuXG4gICAgaWYgKHRoaXMuX2ludmFsaWRhdGVkKSB7XG4gICAgICAgIHRoaXMuX2dsb2JhbE9wYWNpdHkgPSB0aGlzLl9sb2NhbE9wYWNpdHkgKiBwYXJlbnRPcGFjaXR5O1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9ldmVudEhhbmRsZXIuZW1pdCgnaW52YWxpZGF0ZWQnLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZWxzZSByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGZ1bmN0aW9ucyB0byBiZSBjYWxsZWQgb24gb3BhY2l0eSBldmVudHMuXG4gKlxuICogQG1ldGhvZCAgb25cbiAqL1xuT3BhY2l0eS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbigpIHtcbiAgICB0aGlzLl9ldmVudEhhbmRsZXIub24uYXBwbHkodGhpcy5fZXZlbnRIYW5kbGVyLCBhcmd1bWVudHMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcGFjaXR5O1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50RW1pdHRlcicpO1xuXG4vKipcbiAqIFNpemUgaXMgYSBjb21wb25lbnQgdGhhdCBpcyBwYXJ0IG9mIGV2ZXJ5IFJlbmRlck5vZGUuICBJdCBpc1xuICogICByZXNwb25zaWJsZSBmb3IgdXBkYXRpbmcgaXQncyBvd24gbm90aW9uIG9mIHNpemUgYW5kIGluY29ycG9yYXRpbmdcbiAqICAgdGhhdCB3aXRoIHBhcmVudCBpbmZvcm1hdGlvbi4gIFNpemVzIGFyZSB0aHJlZSBkaW1lbnNpb25hbCBhbmQgY2FuIGJlXG4gKiAgIGRlZmluZWQgaW4gdGhyZWUgc2VwZXJhdGUgbWFubmVycy5cbiAqICAgXG4gKiAgICAgICBwaXhlbDogQWJzb2x1dGUgcGl4ZWwgc2l6ZVxuICogICAgICAgcHJvcG9ydGlvbjogUGVyY2VudCBvZiB0aGUgcGFyZW50IG9yIGxvY2FsIHBpeGVsIHNpemVcbiAqICAgICAgIGRpZmZlcmVudGlhbDogKy8tIGEgY2VydGFpbiBhbW91bnQgb2YgcGl4ZWxzXG4gKlxuICogIEZvciBlYWNoIGRpbWVuc2lvbiwgW3gsIHksIHpdLCBwaXhlbCBzaXplIGlzIGNhbGN1bGF0ZWQgZmlyc3QsIHRoZW5cbiAqICBwcm9wb3J0aW9ucyBhcmUgYXBwbGllZCwgYW5kIGZpbmFsbHkgZGlmZmVyZW50aWFscyBhcmUgYXBwbGllZC4gIFNpemVzXG4gKiAgZ2V0IHRoZWlyIHBhcmVudCBpbmZvcm1hdGlvbiB2aWEgdGhlIENvcmVTeXN0ZW0gd2hpY2ggdXNlcyB0aGUgc2NlbmUgXG4gKiAgZ3JhcGggYXMgaXQncyBzb3VyY2Ugb2YgaGVpcmFyY2h5LlxuICpcbiAqIEBjbGFzcyBTaXplXG4gKiBAY29tcG9uZW50XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gU2l6ZShlbnRpdHlJZCwgb3B0aW9ucykge1xuICAgIHRoaXMuX2xvY2FsUGl4ZWxzICAgICAgICA9IFt2b2lkIDAsIHZvaWQgMCwgdm9pZCAwXTtcbiAgICB0aGlzLl9sb2NhbFByb3BvcnRpb25zICAgPSBbMSwgMSwgMV07XG4gICAgdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX2dsb2JhbFNpemUgICAgICAgICA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl91cGRhdGVGTiAgICAgICAgICAgPSBudWxsO1xuICAgIHRoaXMuX2ludmFsaWRhdGVkICAgICAgICA9IDA7XG4gICAgdGhpcy5fY2FjaGVkQ29udGV4dFNpemUgID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX2V2ZW50SGFuZGxlciAgICAgICA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICB0aGlzLl9lbnRpdHlJZCAgICAgICAgICAgPSBlbnRpdHlJZDtcblxuICAgIHRoaXMuX211dGF0b3IgPSB7XG4gICAgICAgIHNldFBpeGVsczogdGhpcy5zZXRQaXhlbHMuYmluZCh0aGlzKSxcbiAgICAgICAgc2V0UHJvcG9ydGlvbnM6IHRoaXMuc2V0UHJvcG9ydGlvbnMuYmluZCh0aGlzKSxcbiAgICAgICAgc2V0RGlmZmVyZW50aWFsczogdGhpcy5zZXREaWZmZXJlbnRpYWxzLmJpbmQodGhpcylcbiAgICB9O1xufVxuXG52YXIgU0laRSA9ICdzaXplJztcblNpemUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtyZXR1cm4gU0laRTt9O1xuXG4vKipcbiAqIERlZmluZSB0aGUgcGl4ZWwgdmFsdWVzIGZvciB0aGUgc2l6ZS4gIEludmFsaWRhdGVzIGNlcnRhaW5cbiAqICAgaW5kaWNpZXMgd2hlbiBuZXcgdmFsdWVzIGFyZSBzcGVjaWZpZWQuXG4gKlxuICogQG1ldGhvZCBzZXRQaXhlbHNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHggc2l6ZSBpbiBwaXhlbHNcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHNpemUgaW4gcGl4ZWxzXG4gKiBAcGFyYW0ge051bWJlcn0geiBzaXplIGluIHBpeGVsc1xuICovXG5TaXplLnByb3RvdHlwZS5zZXRQaXhlbHMgPSBmdW5jdGlvbiBzZXRQaXhlbHMoeCwgeSwgeikge1xuICAgIGlmICh4ICE9PSB0aGlzLl9sb2NhbFBpeGVsc1swXSAmJiB4ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgfD0gMTtcbiAgICAgICAgdGhpcy5fbG9jYWxQaXhlbHNbMF0gPSB4O1xuICAgIH1cblxuICAgIGlmICh5ICE9PSB0aGlzLl9sb2NhbFBpeGVsc1sxXSAmJiB5ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgfD0gMjtcbiAgICAgICAgdGhpcy5fbG9jYWxQaXhlbHNbMV0gPSB5O1xuICAgIH1cbiAgICBpZiAoeiAhPT0gdGhpcy5fbG9jYWxQaXhlbHNbMl0gJiYgeiAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkIHw9IDQ7XG4gICAgICAgIHRoaXMuX2xvY2FsUGl4ZWxzWzJdID0gejtcbiAgICB9XG59O1xuXG4vKipcbiAqIERlZmluZSB0aGUgcHJvcG9ydGlvbmFsIHZhbHVlcyBmb3IgdGhlIHNpemUuICBJbnZhbGlkYXRlc1xuICogICBjZXJ0YWluIGluZGljaWVzIHdoZW4gbmV3IHZhbHVlcyBhcmUgc3BlY2lmaWVkLlxuICpcbiAqIEBtZXRob2Qgc2V0UHJvcG9ydGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHggc2l6ZSBhcyBhIHBlcmNlbnRhZ2Ugb2YgdGhlIHBhcmVudFNpemUgb3IgbG9jYWwgcGl4ZWwgc2l6ZVxuICogQHBhcmFtIHtOdW1iZXJ9IHkgc2l6ZSBhcyBhIHBlcmNlbnRhZ2Ugb2YgdGhlIHBhcmVudFNpemUgb3IgbG9jYWwgcGl4ZWwgc2l6ZVxuICogQHBhcmFtIHtOdW1iZXJ9IHogc2l6ZSBhcyBhIHBlcmNlbnRhZ2Ugb2YgdGhlIHBhcmVudFNpemUgb3IgbG9jYWwgcGl4ZWwgc2l6ZVxuICovXG5TaXplLnByb3RvdHlwZS5zZXRQcm9wb3J0aW9ucyA9IGZ1bmN0aW9uIHNldFByb3BvcnRpb25zKHgsIHksIHopIHtcbiAgICBpZiAoeCAhPT0gdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1swXSAmJiB4ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgfD0gMTtcbiAgICAgICAgdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1swXSA9IHg7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMV0gJiYgeSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkIHw9IDI7XG4gICAgICAgIHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMV0gPSB5O1xuICAgIH1cblxuICAgIGlmICh6ICE9PSB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzJdICYmIHogIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCB8PSA0O1xuICAgICAgICB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzJdID0gejtcbiAgICB9XG59O1xuXG4vKipcbiAqIERlZmluZSB0aGUgcGl4ZWwgZGlmZmVyZW50aWFscyBmb3IgdGhlIHNpemUuICBcbiAqICAgSW52YWxpZGF0ZXMgY2VydGFpbiBpbmRpY2llcyB3aGVuIG5ldyB2YWx1ZXMgYXJlIHNwZWNpZmllZC4gXG4gKlxuICogQG1ldGhvZCBzZXREaWZmZXJlbnRpYWxzXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IHBpeGVsIGRpZmZlcmVudGlhbHMgaW4gc2l6ZVxuICogQHBhcmFtIHtOdW1iZXJ9IHkgcGl4ZWwgZGlmZmVyZW50aWFscyBpbiBzaXplXG4gKiBAcGFyYW0ge051bWJlcn0geiBwaXhlbCBkaWZmZXJlbnRpYWxzIGluIHNpemVcbiAqL1xuU2l6ZS5wcm90b3R5cGUuc2V0RGlmZmVyZW50aWFscyA9IGZ1bmN0aW9uIHNldERpZmZlcmVudGlhbHMoeCwgeSwgeikge1xuICAgIGlmICh4ICE9PSB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMF0gJiYgeCAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkICAgICAgICAgIHw9IDE7XG4gICAgICAgIHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1swXSA9IHg7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1sxXSAmJiB5ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgICAgICAgICAgfD0gMjtcbiAgICAgICAgdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzFdID0geTtcbiAgICB9XG5cbiAgICBpZiAoeiAhPT0gdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzJdICYmIHogIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCAgICAgICAgICB8PSA0O1xuICAgICAgICB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMl0gPSB6O1xuICAgIH1cbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBTaXplJ3Mgbm90aW9uIG9mIHdoYXQgdGhlIGN1bXVsYXRpdmUgZ2xvYmFsIHNpemUgaXMuXG4gKlxuICogQG1ldGhvZCAgZ2V0R2xvYmFsU2l6ZVxuICogXG4gKiBAcmV0dXJuIHtBcnJheX0gQXJyYXkgcmVwcmVzZW50aW5nIHNpemUgaW4gcGl4ZWxzXG4gKi9cblNpemUucHJvdG90eXBlLmdldEdsb2JhbFNpemUgPSBmdW5jdGlvbiBnZXRHbG9iYWxTaXplKCkge1xuICAgIHJldHVybiB0aGlzLl9nbG9iYWxTaXplO1xufTtcblxuLyoqXG4gKiBEZWZpbmUgdGhlIHByb3ZpZGVyIG9mIHN0YXRlIGZvciB0aGUgU2l6ZS5cbiAqXG4gKiBAbWV0aG9kICBzaXplRnJvbVxuICogXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gcHJvdmlkZXIgc291cmNlIG9mIHN0YXRlIGZvciB0aGUgU2l6ZVxuICovXG5TaXplLnByb3RvdHlwZS51cGRhdGVGcm9tID0gZnVuY3Rpb24gdXBkYXRlRnJvbShwcm92aWRlcikge1xuICAgIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUZOID0gcHJvdmlkZXI7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NpemU6IHVwZGF0ZUZyb20gb25seSBhY2NlcHRzIGZ1bmN0aW9ucycpXG4gICAgfVxufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBTaXplJ3MgdmFsdWVzIGJhc2VkIG9uIHRoZSBwYXJlbnQgaW52YWxpZGF0aW9ucyxcbiAqICAgcGFyZW50IHNpemUgKHBpeGVscyksIGFuZCBwb3NzaWJseSBjb250ZXh0IHNpemUgKHBpeGVscykuXG4gKlxuICogQG1ldGhvZCBfdXBkYXRlXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHBhcmVudFJlcG9ydCBiaXRTY2hlbWUgaW52YWxpZGF0aW9ucyBmb3IgcGFyZW50IHNpemVcbiAqIEBwYXJhbSAge0FycmF5fSBwYXJlbnRTaXplIHBhcmVudCBzaXplIGluIHBpeGVsc1xuICogQHBhcmFtICB7QXJyYXl9IGNvbnRleHRTaXplIGNvbnRleHQgc2l6ZSBpbiBwaXhlbHNcbiAqIEByZXR1cm4ge051bWJlcn0gaW52YWxpZGF0aW9uc1xuICovXG5TaXplLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24gX3VwZGF0ZShwYXJlbnRSZXBvcnQsIHBhcmVudFNpemUsIGNvbnRleHRTaXplKSB7XG4gICAgaWYgKGNvbnRleHRTaXplKSB7XG4gICAgICAgIHBhcmVudFNpemUgPSBjb250ZXh0U2l6ZTtcbiAgICAgICAgcGFyZW50UmVwb3J0ID0gMDtcbiAgICAgICAgaWYgKHBhcmVudFNpemVbMF0gIT09IHRoaXMuX2NhY2hlZENvbnRleHRTaXplWzBdKSBwYXJlbnRSZXBvcnQgfD0gMTtcbiAgICAgICAgaWYgKHBhcmVudFNpemVbMV0gIT09IHRoaXMuX2NhY2hlZENvbnRleHRTaXplWzFdKSBwYXJlbnRSZXBvcnQgfD0gMjtcbiAgICAgICAgaWYgKHBhcmVudFNpemVbMl0gIT09IHRoaXMuX2NhY2hlZENvbnRleHRTaXplWzJdKSBwYXJlbnRSZXBvcnQgfD0gNDtcbiAgICAgICAgdGhpcy5fY2FjaGVkQ29udGV4dFNpemUgPSBjb250ZXh0U2l6ZTtcbiAgICB9XG5cbiAgICBpZiAocGFyZW50UmVwb3J0KSB0aGlzLl9pbnZhbGlkYXRlZCB8PSBwYXJlbnRSZXBvcnQ7XG4gICAgaWYgKHRoaXMuX3VwZGF0ZUZOKSB0aGlzLl91cGRhdGVGTih0aGlzLl9tdXRhdG9yKTtcblxuICAgIGlmICh0aGlzLl9pbnZhbGlkYXRlZCkge1xuICAgICAgICBpZiAodGhpcy5faW52YWxpZGF0ZWQgJiAxKSB7XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzBdICA9IHRoaXMuX2xvY2FsUGl4ZWxzWzBdICE9PSB1bmRlZmluZWQgPyB0aGlzLl9sb2NhbFBpeGVsc1swXSA6IHBhcmVudFNpemVbMF07XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzBdICo9IHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMF07XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzBdICs9IHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1swXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5faW52YWxpZGF0ZWQgJiAyKSB7XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzFdICA9IHRoaXMuX2xvY2FsUGl4ZWxzWzFdICE9PSB1bmRlZmluZWQgPyB0aGlzLl9sb2NhbFBpeGVsc1sxXSA6IHBhcmVudFNpemVbMV07XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzFdICo9IHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMV07XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzFdICs9IHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1sxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5faW52YWxpZGF0ZWQgJiA0KSB7XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzJdICA9IHRoaXMuX2xvY2FsUGl4ZWxzWzJdICE9PSB1bmRlZmluZWQgPyB0aGlzLl9sb2NhbFBpeGVsc1syXSA6IHBhcmVudFNpemVbMl07XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzJdICo9IHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMl07XG4gICAgICAgICAgICB0aGlzLl9nbG9iYWxTaXplWzJdICs9IHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1syXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpbnZhbGlkYXRlZCA9IHRoaXMuX2ludmFsaWRhdGVkO1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCA9IDA7XG4gICAgICAgIGlmIChpbnZhbGlkYXRlZCkgdGhpcy5fZXZlbnRIYW5kbGVyLmVtaXQoJ2ludmFsaWRhdGVkJywgaW52YWxpZGF0ZWQpO1xuICAgICAgICByZXR1cm4gaW52YWxpZGF0ZWQ7XG4gICAgfVxuXG4gICAgZWxzZSByZXR1cm4gMDtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgZnVuY3Rpb25zIHRvIGJlIGNhbGxlZCBvbiB0aGUgU2l6ZSdzIGV2ZW50cy5cbiAqXG4gKiBAbWV0aG9kIG9uXG4gKi9cblNpemUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oKSB7XG4gICAgdGhpcy5fZXZlbnRIYW5kbGVyLm9uLmFwcGx5KHRoaXMuX2V2ZW50SGFuZGxlciwgYXJndW1lbnRzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2l6ZTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vRW50aXR5UmVnaXN0cnknKSxcbiAgICBUYXJnZXQgICAgICAgICA9IHJlcXVpcmUoJy4vVGFyZ2V0JyksXG4gICAgTWF0cml4TWF0aCAgICAgPSByZXF1aXJlKCcuLi8uLi9tYXRoL01hdHJpeDR4NCcpLFxuICAgIEV2ZW50SGFuZGxlciAgID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50SGFuZGxlcicpO1xuXG4vLyBDT05TVFNcbnZhciBUUkFOU0ZPUk0gPSAndHJhbnNmb3JtJztcbnZhciBTSVpFICAgICAgPSAnc2l6ZSc7XG52YXIgT1BBQ0lUWSAgID0gJ29wYWNpdHknO1xudmFyIFNVUkZBQ0UgICA9ICdzdXJmYWNlJztcblxuLyoqXG4gKiBTdXJmYWNlIGlzIGEgY29tcG9uZW50IHRoYXQgZGVmaW5lcyB0aGUgZGF0YSB0aGF0IHNob3VsZFxuICogICBiZSBkcmF3biB0byBhbiBIVE1MRWxlbWVudC4gIE1hbmFnZXMgQ1NTIHN0eWxlcywgSFRNTCBhdHRyaWJ1dGVzLFxuICogICBjbGFzc2VzLCBhbmQgY29udGVudC5cbiAqXG4gKiBAY2xhc3MgU3VyZmFjZVxuICogQGNvbXBvbmVudFxuICogQGNvbnN0cnVjdG9yXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgdGhlIFN1cmZhY2UgaXMgYSBjb21wb25lbnQgb2ZcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIGluc3RhbnRpYXRpb24gb3B0aW9uc1xuICovXG5mdW5jdGlvbiBTdXJmYWNlKGVudGl0eUlELCBvcHRpb25zKSB7XG4gICAgVGFyZ2V0LmNhbGwodGhpcywgZW50aXR5SUQsIHtcbiAgICAgICAgdmVydGljaWVzOiBbbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pXVxuICAgIH0pO1xuXG4gICAgdmFyIGVudGl0eSA9IHRoaXMuZ2V0RW50aXR5KCk7XG5cbiAgICBFbnRpdHlSZWdpc3RyeS5yZWdpc3RlcihlbnRpdHksICdTdXJmYWNlcycpO1xuICAgIEVudGl0eVJlZ2lzdHJ5LnJlZ2lzdGVyKGVudGl0eSwgJ1JlbmRlcmFibGVzJyk7XG5cbiAgICBpZiAob3B0aW9ucy50YWdOYW1lKSB0aGlzLnRhZ05hbWUgPSBvcHRpb25zLnRhZ05hbWU7XG4gICAgdGhpcy5fY3VsbGVkID0gZmFsc2U7XG4gICAgdGhpcy5fc2l6ZSAgICAgPSBuZXcgRmxvYXQzMkFycmF5KFswLDBdKTtcblxuICAgIHRoaXMuaW52YWxpZGF0aW9ucyA9IDEyNztcbiAgICB0aGlzLl9ldmVudE91dHB1dCAgPSBuZXcgRXZlbnRIYW5kbGVyKCk7XG4gICAgdGhpcy5fZXZlbnRPdXRwdXQuYmluZFRoaXModGhpcyk7XG4gICAgdGhpcy5fZXZlbnRGb3J3YXJkZXIgPSBmdW5jdGlvbiBfZXZlbnRGb3J3YXJkZXIoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRPdXRwdXQuZW1pdChldmVudC50eXBlLCBldmVudCk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgdGhpcy5zcGVjID0ge1xuICAgICAgICBfaWQgICAgICAgICAgICA6IGVudGl0eS5faWQsXG4gICAgICAgIGNsYXNzZXMgICAgICAgIDogW10sXG4gICAgICAgIGF0dHJpYnV0ZXMgICAgIDoge30sXG4gICAgICAgIHByb3BlcnRpZXMgICAgIDoge30sXG4gICAgICAgIGNvbnRlbnQgICAgICAgIDogbnVsbCxcbiAgICAgICAgaW52YWxpZGF0aW9ucyAgOiAoMSA8PCBPYmplY3Qua2V5cyhTdXJmYWNlLmludmFsaWRhdGlvbnMpLmxlbmd0aCkgLSAxLFxuICAgICAgICBvcmlnaW4gICAgICAgICA6IHRoaXMuX29yaWdpbixcbiAgICAgICAgZXZlbnRzICAgICAgICAgOiBbXSxcbiAgICAgICAgZXZlbnRGb3J3YXJkZXIgOiB0aGlzLl9ldmVudEZvcndhcmRlclxuICAgIH07XG5cbiAgICBlbnRpdHkuZ2V0Q29tcG9uZW50KFRSQU5TRk9STSkub24oJ2ludmFsaWRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnRyYW5zZm9ybTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgZW50aXR5LmdldENvbXBvbmVudChTSVpFKS5vbignaW52YWxpZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuc2l6ZTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgZW50aXR5LmdldENvbXBvbmVudChPUEFDSVRZKS5vbignaW52YWxpZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMub3BhY2l0eTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faGFzT3JpZ2luID0gdHJ1ZTtcbn1cblxuU3VyZmFjZS5wcm90b3R5cGUgICAgICAgICAgICAgPSBPYmplY3QuY3JlYXRlKFRhcmdldC5wcm90b3R5cGUpO1xuU3VyZmFjZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdXJmYWNlO1xuXG4vLyBJbnZhbGlkYXRpb24gU2NoZW1lXG5TdXJmYWNlLmludmFsaWRhdGlvbnMgPSB7XG4gICAgY2xhc3NlcyAgICA6IDEsXG4gICAgcHJvcGVydGllcyA6IDIsXG4gICAgYXR0cmlidXRlcyA6IDQsXG4gICAgY29udGVudCAgICA6IDgsXG4gICAgdHJhbnNmb3JtICA6IDE2LFxuICAgIHNpemUgICAgICAgOiAzMixcbiAgICBvcGFjaXR5ICAgIDogNjQsXG4gICAgb3JpZ2luICAgICA6IDEyOCxcbiAgICBldmVudHMgICAgIDogMjU2XG59O1xuXG5TdXJmYWNlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7cmV0dXJuIFNVUkZBQ0U7fTtcblxuU3VyZmFjZS5wcm90b3R5cGUuX3NldFZlcnRleERpc3BsYWNlbWVudCA9IGZ1bmN0aW9uIF9zZXRWZXJ0ZXhEaXNwbGFjZW1lbnQgKHgsIHkpIHtcbiAgICB2YXIgeU9yaWdpbk9mZnNldCA9IHRoaXMuc3BlYy5vcmlnaW5bMV0gKiB5LFxuICAgICAgICB4T3JpZ2luT2Zmc2V0ID0gdGhpcy5zcGVjLm9yaWdpblswXSAqIHg7XG5cbiAgICB0aGlzLnZlcnRpY2llc1swXVswXSA9IDAgLSB4T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzBdWzFdID0gMCAtIHlPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMV1bMF0gPSB4IC0geE9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1sxXVsxXSA9IDAgLSB5T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzJdWzBdID0geCAtIHhPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMl1bMV0gPSB5IC0geU9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1szXVswXSA9IDAgLSB4T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzNdWzFdID0geSAtIHlPcmlnaW5PZmZzZXQ7XG5cbiAgICB0aGlzLl9zaXplWzBdID0geDtcbiAgICB0aGlzLl9zaXplWzFdID0geTtcbiAgICB0aGlzLl9ldmVudE91dHB1dC5lbWl0KCdzaXplQ2hhbmdlJywgdGhpcy5fc2l6ZSk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgb3B0aW9ucyBvZiB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIHNldE9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgb2JqZWN0IG9mIG9wdGlvbnNcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLnByb3BlcnRpZXMpICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0UHJvcGVydGllcyhvcHRpb25zLnByb3BlcnRpZXMpO1xuICAgIGlmIChvcHRpb25zLmNsYXNzZXMpICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0Q2xhc3NlcyhvcHRpb25zLmNsYXNzZXMpO1xuICAgIGlmIChvcHRpb25zLmF0dHJpYnV0ZXMpICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhvcHRpb25zLmF0dHJpYnV0ZXMpO1xuICAgIGlmIChvcHRpb25zLmNvbnRlbnQgfHwgb3B0aW9ucy5jb250ZW50ID09PSAnJykgIHRoaXMuc2V0Q29udGVudChvcHRpb25zLmNvbnRlbnQpO1xuICAgIGlmIChvcHRpb25zLnNpemUpICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0Q1NTU2l6ZS5hcHBseSh0aGlzLCBvcHRpb25zLnNpemUpO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIENTUyBjbGFzc2VzIHRvIGJlIGEgbmV3IEFycmF5IG9mIHN0cmluZ3MuXG4gKlxuICogQG1ldGhvZCBzZXRDbGFzc2VzXG4gKiBcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IG9mIENTUyBjbGFzc2VzXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldENsYXNzZXMgPSBmdW5jdGlvbiBzZXRDbGFzc2VzKGNsYXNzTGlzdCkge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShjbGFzc0xpc3QpKSB0aHJvdyBuZXcgRXJyb3IoXCJTdXJmYWNlOiBleHBlY3RzIGFuIEFycmF5IHRvIGJlIHBhc3NlZCB0byBzZXRDbGFzc2VzXCIpO1xuXG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciByZW1vdmFsID0gW107XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5zcGVjLmNsYXNzZXMubGVuZ3RoOyBpKyspXG4gICAgICAgIGlmIChjbGFzc0xpc3QuaW5kZXhPZih0aGlzLnNwZWMuY2xhc3Nlc1tpXSkgPCAwKVxuICAgICAgICAgICAgcmVtb3ZhbC5wdXNoKHRoaXMuc3BlYy5jbGFzc2VzW2ldKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCByZW1vdmFsLmxlbmd0aDsgaSsrKSAgIHRoaXMucmVtb3ZlQ2xhc3MocmVtb3ZhbFtpXSk7XG4gICAgZm9yIChpID0gMDsgaSA8IGNsYXNzTGlzdC5sZW5ndGg7IGkrKykgdGhpcy5hZGRDbGFzcyhjbGFzc0xpc3RbaV0pO1xuXG4gICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5zaXplO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYWxsIG9mIHRoZSBjbGFzc2VzIGFzc29jaWF0ZWQgd2l0aCB0aGlzIFN1cmZhY2VcbiAqXG4gKiBAbWV0aG9kIGdldENsYXNzZXNcbiAqIFxuICogQHJldHVybiB7QXJyYXl9IGFycmF5IG9mIENTUyBjbGFzc2VzXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldENsYXNzZXMgPSBmdW5jdGlvbiBnZXRDbGFzc2VzKCkge1xuICAgIHJldHVybiB0aGlzLnNwZWMuY2xhc3Nlcztcbn07XG5cbi8qKlxuICogQWRkIGEgc2luZ2xlIGNsYXNzIHRvIHRoZSBTdXJmYWNlJ3MgbGlzdCBvZiBjbGFzc2VzLlxuICogICBJbnZhbGlkYXRlcyB0aGUgU3VyZmFjZSdzIGNsYXNzZXMuXG4gKlxuICogQG1ldGhvZCBhZGRDbGFzc1xuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gY2xhc3NOYW1lIG5hbWUgb2YgdGhlIGNsYXNzXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmFkZENsYXNzID0gZnVuY3Rpb24gYWRkQ2xhc3MoY2xhc3NOYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBjbGFzc05hbWUgIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgRXJyb3IoJ2FkZENsYXNzIG9ubHkgdGFrZXMgU3RyaW5ncyBhcyBwYXJhbWV0ZXJzJyk7XG4gICAgaWYgKHRoaXMuc3BlYy5jbGFzc2VzLmluZGV4T2YoY2xhc3NOYW1lKSA8IDApIHtcbiAgICAgICAgdGhpcy5zcGVjLmNsYXNzZXMucHVzaChjbGFzc05hbWUpO1xuICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLmNsYXNzZXM7XG4gICAgfVxuXG4gICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5zaXplO1xufTtcblxuXG4vKipcbiAqIFJlbW92ZSBhIHNpbmdsZSBjbGFzcyBmcm9tIHRoZSBTdXJmYWNlJ3MgbGlzdCBvZiBjbGFzc2VzLlxuICogICBJbnZhbGlkYXRlcyB0aGUgU3VyZmFjZSdzIGNsYXNzZXMuXG4gKiBcbiAqIEBtZXRob2QgcmVtb3ZlQ2xhc3NcbiAqIFxuICogQHBhcmFtICB7U3RyaW5nfSBjbGFzc05hbWUgY2xhc3MgdG8gcmVtb3ZlXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnJlbW92ZUNsYXNzID0gZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoY2xhc3NOYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBjbGFzc05hbWUgIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgRXJyb3IoJ2FkZENsYXNzIG9ubHkgdGFrZXMgU3RyaW5ncyBhcyBwYXJhbWV0ZXJzJyk7XG4gICAgdmFyIGkgPSB0aGlzLnNwZWMuY2xhc3Nlcy5pbmRleE9mKGNsYXNzTmFtZSk7XG4gICAgaWYgKGkgPj0gMCkge1xuICAgICAgICB0aGlzLnNwZWMuY2xhc3Nlcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuY2xhc3NlcztcbiAgICB9XG5cbiAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemU7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgQ1NTIHByb3BlcnRpZXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlLlxuICogICBJbnZhbGlkYXRlcyB0aGUgU3VyZmFjZSdzIHByb3BlcnRpZXMuXG4gKlxuICogQG1ldGhvZCBzZXRQcm9wZXJ0aWVzXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldFByb3BlcnRpZXMgPSBmdW5jdGlvbiBzZXRQcm9wZXJ0aWVzKHByb3BlcnRpZXMpIHtcbiAgICBmb3IgKHZhciBuIGluIHByb3BlcnRpZXMpIHRoaXMuc3BlYy5wcm9wZXJ0aWVzW25dID0gcHJvcGVydGllc1tuXTtcbiAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemU7XG4gICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5wcm9wZXJ0aWVzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIENTUyBwcm9wZXJ0aWVzIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIGdldFByb3BlcnRpZXNcbiAqIFxuICogQHJldHVybiB7T2JqZWN0fSBDU1MgcHJvcGVydGllcyBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2VcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuZ2V0UHJvcGVydGllcyA9IGZ1bmN0aW9uIGdldFByb3BlcnRpZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3BlYy5wcm9wZXJ0aWVzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIEhUTUwgYXR0cmlidXRlcyBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2UuXG4gKiAgIEludmFsaWRhdGVzIHRoZSBTdXJmYWNlJ3MgYXR0cmlidXRlcy5cbiAqXG4gKiBAbWV0aG9kIHNldEF0dHJpYnV0ZXNcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuc2V0QXR0cmlidXRlcyA9IGZ1bmN0aW9uIHNldEF0dHJpYnV0ZXMoYXR0cmlidXRlcykge1xuICAgIGZvciAodmFyIG4gaW4gYXR0cmlidXRlcykgdGhpcy5zcGVjLmF0dHJpYnV0ZXNbbl0gPSBhdHRyaWJ1dGVzW25dO1xuICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuYXR0cmlidXRlcztcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBIVE1MIGF0dHJpYnV0ZXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2QgZ2V0QXR0cmlidXRlc1xuICogXG4gKiBAcmV0dXJuIHtPYmplY3R9IEhUTUwgYXR0cmlidXRlcyBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2VcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuZ2V0QXR0cmlidXRlcyA9IGZ1bmN0aW9uIGdldEF0dHJpYnV0ZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3BlYy5hdHRyaWJ1dGVzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGlubmVySFRNTCBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2UuXG4gKiAgIEludmFsaWRhdGVzIHRoZSBTdXJmYWNlJ3MgY29udGVudC5cbiAqXG4gKiBAbWV0aG9kIHNldENvbnRlbnRcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoY29udGVudCkge1xuICAgIGlmIChjb250ZW50ICE9PSB0aGlzLnNwZWMuY29udGVudCkge1xuICAgICAgICB0aGlzLnNwZWMuY29udGVudCAgID0gY29udGVudDtcbiAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5jb250ZW50O1xuICAgIH1cbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBpbm5lckhUTUwgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2QgZ2V0Q29udGVudFxuICogXG4gKiBAcmV0dXJuIHtTdHJpbmd9IGlubmVySFRNTCBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2VcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuZ2V0Q29udGVudCA9IGZ1bmN0aW9uIGdldENvbnRlbnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3BlYy5jb250ZW50O1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIHNpemUgb2YgdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBzZXRDU1NTaXplXG4gKiBAY2hhaW5hYmxlXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldENTU1NpemUgPSBmdW5jdGlvbiBzZXRDU1NTaXplKHdpZHRoLCBoZWlnaHQpIHtcbiAgICBpZiAoIXRoaXMuc3BlYy5zaXplKSB0aGlzLnNwZWMuc2l6ZSA9IFtdO1xuICAgIGlmICh3aWR0aCkge1xuICAgICAgICB0aGlzLl9zaXplWzBdID0gdGhpcy5zcGVjLnNpemVbMF0gPSB3aWR0aDtcbiAgICB9XG4gICAgaWYgKGhlaWdodCkge1xuICAgICAgICB0aGlzLl9zaXplWzFdID0gdGhpcy5zcGVjLnNpemVbMV0gPSBoZWlnaHQ7XG4gICAgfVxuICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuc2l6ZTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogIEdldCB0aGUgQ1NTIFNpemUgb2YgYSBzdXJmYWNlLiBOb3RlIHRoYXQgd2hlbiB1c2luZyB1bmRlZmluZWQsIG9yIHRydWUgc2l6ZSwgdGhpcyB3aWxsXG4gKiAgaGFwcGVuIGEgZnJhbWUgbGF0ZXIuIFRvIGdldCBhIG5vdGlmaWNhdGlvbiBvZiB0aGlzIGNoYW5nZSwgbGlzdGVuIHRvIHRoaXMgc3VyZmFjZSdzXG4gKiAgc2l6ZUNoYW5nZSBldmVudC4gXG4gKlxuICogIEBtZXRob2QgZ2V0Q1NTU2l6ZVxuICogIEByZXV0cm4ge0FycmF5fSAyXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldENTU1NpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NpemU7XG59XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBvcmlnaW4gb2YgdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBzZXRPcmlnaW5cbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBvcmlnaW4gb24gdGhlIHgtYXhpcyBhcyBhIHBlcmNlbnRcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IG9yaWdpbiBvbiB0aGUgeS1heGlzIGFzIGEgcGVyY2VudFxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRPcmlnaW4gID0gZnVuY3Rpb24gc2V0T3JpZ2luKHgsIHkpIHtcbiAgICBpZiAoKHggIT0gbnVsbCAmJiAoeCA8IDAgfHwgeCA+IDEpKSB8fCAoeSAhPSBudWxsICYmICh5IDwgMCB8fCB5ID4gMSkpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09yaWdpbiBtdXN0IGhhdmUgYW4geCBhbmQgeSB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDEnKTtcblxuICAgIHRoaXMuc3BlYy5vcmlnaW5bMF0gPSB4ICE9IG51bGwgPyB4IDogdGhpcy5zcGVjLm9yaWdpblswXTtcbiAgICB0aGlzLnNwZWMub3JpZ2luWzFdID0geSAhPSBudWxsID8geSA6IHRoaXMuc3BlYy5vcmlnaW5bMV07XG4gICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5vcmlnaW47XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgb3JpZ2luIG9mIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2QgZ2V0T3JpZ2luXG4gKlxuICogQHJldHVybiB7QXJyYXl9IDItZGltZW5zaW9uYWwgYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBTdXJmYWNlJ3Mgb3JpZ2luXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldE9yaWdpbiA9IGZ1bmN0aW9uIGdldE9yaWdpbigpIHtcbiAgICByZXR1cm4gdGhpcy5zcGVjLm9yaWdpbjtcbn07XG5cbi8qKlxuICogUmVzZXRzIHRoZSBpbnZhbGlkYXRpb25zIG9mIHRoZSBTdXJmYWNlXG4gKlxuICogQG1ldGhvZCByZXNldEludmFsaWRhdGlvbnNcbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcmV0dXJuIHtTdXJmYWNlfSB0aGlzXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnJlc2V0SW52YWxpZGF0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW52YWxpZGF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE1hcmsgYWxsIHByb3BlcnRpZXMgYXMgaW52YWxpZGF0ZWQuXG4gKlxuICogQG1ldGhvZCBpbnZhbGlkYXRlQWxsXG4gKiBAY2hhaW5hYmxlXG4gKlxuICogQHJldHVybiB7U3VyZmFjZX0gdGhpc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5pbnZhbGlkYXRlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pbnZhbGlkYXRpb25zID0gNTExO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIEJpbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBhbiBldmVudCB0eXBlIGhhbmRsZWQgYnkgdGhpcyBTdXJmYWNlJ3NcbiAqICBFdmVudEhhbmRsZXIuXG4gKlxuICogQG1ldGhvZCBvblxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBPYmplY3QpfSBoYW5kbGVyIGNhbGxiYWNrXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZlbnQsIGNiKSB7XG4gICAgaWYgKHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycgJiYgY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB0aGlzLl9ldmVudE91dHB1dC5vbihldmVudCwgY2IpO1xuICAgICAgICBpZiAodGhpcy5zcGVjLmV2ZW50cy5pbmRleE9mKGV2ZW50KSA8IDApIHtcbiAgICAgICAgICAgIHRoaXMuc3BlYy5ldmVudHMucHVzaChldmVudCk7XG4gICAgICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLmV2ZW50cztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGEgZnVuY3Rpb24gdG8gYSBwYXJ0aWN1bGFyIGV2ZW50IG9jY3VyaW5nLlxuICpcbiAqIEBtZXRob2QgIG9mZlxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgbmFtZSBvZiB0aGUgZXZlbnQgdG8gY2FsbCB0aGUgZnVuY3Rpb24gd2hlbiBvY2N1cmluZ1xuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGV2ZW50IGlzIHJlY2lldmVkLlxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiBvZmYoZXZlbnQsIGNiKSB7XG4gICAgaWYgKHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycgJiYgY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnNwZWMuZXZlbnRzLmluZGV4T2YoZXZlbnQpO1xuICAgICAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLl9ldmVudE91dHB1dC5yZW1vdmVMaXN0ZW5lcihldmVudCwgY2IpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmV2ZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5ldmVudHM7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIEFkZCBldmVudCBoYW5kbGVyIG9iamVjdCB0byB0aGUgRXZlbnRIYW5kbGVyJ3MgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqXG4gKiBAbWV0aG9kIHBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IGV2ZW50IGhhbmRsZXIgdGFyZ2V0IG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwYXNzZWQgZXZlbnQgaGFuZGxlclxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gcGlwZSh0YXJnZXQpIHtcbiAgICB2YXIgbGlzdGVuZXJzID0gdGFyZ2V0LnVwc3RyZWFtTGlzdGVuZXJzIHx8IHRhcmdldC5fZXZlbnRJbnB1dC51cHN0cmVhbUxpc3RlbmVycztcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGxpc3RlbmVycyk7XG4gICAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgZXZlbnQ7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBldmVudCA9IGtleXNbaV07XG4gICAgICAgIGlmICh0aGlzLnNwZWMuZXZlbnRzLmluZGV4T2YoZXZlbnQpIDwgMCkge1xuICAgICAgICAgICAgdGhpcy5zcGVjLmV2ZW50cy5wdXNoKGV2ZW50KTtcbiAgICAgICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuZXZlbnRzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ldmVudE91dHB1dC5waXBlKHRhcmdldCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoYW5kbGVyIG9iamVjdCBmcm9tIHRoZSBFdmVudEhhbmRsZXIncyBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICogICBVbmRvZXMgd29yayBvZiBcInBpcGVcIi5cbiAqXG4gKiBAbWV0aG9kIHVucGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgdGFyZ2V0IGhhbmRsZXIgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHByb3ZpZGVkIHRhcmdldFxuICovXG5TdXJmYWNlLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbiB1bnBpcGUodGFyZ2V0KSB7XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50T3V0cHV0LnVucGlwZSh0YXJnZXQpO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHJlbmRlciBzcGVjaWZpY2F0aW9uIG9mIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2QgIHJlbmRlclxuICogXG4gKiBAcmV0dXJuIHtPYmplY3R9IHJlbmRlciBzcGVjaWZpY2F0aW9uXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3BlYy5pbnZhbGlkYXRpb25zID0gdGhpcy5pbnZhbGlkYXRpb25zO1xuICAgIHJldHVybiB0aGlzLnNwZWM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN1cmZhY2U7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBNYXRyaXhNYXRoID0gcmVxdWlyZSgnLi4vLi4vbWF0aC9NYXRyaXg0eDQnKTtcbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5Jyk7XG5cbi8qKlxuICogVGFyZ2V0IGlzIHRoZSBiYXNlIGNsYXNzIGZvciBhbGwgcmVuZGVyYWJsZXMuICBJdCBob2xkcyB0aGUgc3RhdGUgb2ZcbiAqICAgaXRzIHZlcnRpY2llcywgdGhlIENvbnRhaW5lcnMgaXQgaXMgZGVwbG95ZWQgaW4sIHRoZSBDb250ZXh0IGl0IGJlbG9uZ3NcbiAqICAgdG8sIGFuZCB3aGV0aGVyIG9yIG5vdCBvcmlnaW4gYWxpZ25tZW50IG5lZWRzIHRvIGJlIGFwcGxpZWQuXG4gKlxuICogQGNvbXBvbmVudCBUYXJnZXRcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgIEVudGl0eSB0aGF0IHRoZSBUYXJnZXQgaXMgYSBjb21wb25lbnQgb2ZcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gVGFyZ2V0KGVudGl0eUlELCBvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgICAgICAgID0gdGhpcztcbiAgICB0aGlzLl9lbnRpdHlJRCAgPSBlbnRpdHlJRDtcbiAgICB0aGlzLnZlcnRpY2llcyAgPSBvcHRpb25zLnZlcnRpY2llcyB8fCBbXTtcbiAgICB0aGlzLmNvbnRhaW5lcnMgPSB7fTtcbiAgICB0aGlzLl9oYXNPcmlnaW4gPSBmYWxzZTtcbiAgICB0aGlzLl9vcmlnaW4gICAgPSBuZXcgRmxvYXQzMkFycmF5KFswLjUsIDAuNSwgMC41XSk7XG59XG5cbi8qKlxuICogR2V0IHRoZSB2ZXJ0aWNpZXMgb2YgdGhlIFRhcmdldC5cbiAqXG4gKiBAbWV0aG9kIGdldFZlcnRpY2llc1xuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhcnJheSBvZiB0aGUgdmVydGljaWVzIHJlcHJlc2VudGVkIGFzIHRocmVlIGVsZW1lbnQgYXJyYXlzIFt4LCB5LCB6XVxuICovXG5UYXJnZXQucHJvdG90eXBlLmdldFZlcnRpY2llcyA9IGZ1bmN0aW9uIGdldFZlcnRpY2llcygpe1xuICAgIHJldHVybiB0aGlzLnZlcnRpY2llcztcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgVGFyZ2V0IHdhcyBkZXBsb3llZCB0byBhIHBhcnRpY3VsYXIgY29udGFpbmVyXG4gKlxuICogQG1ldGhvZCBfaXNXaXRoaW5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGhlIGlkIG9mIHRoZSBDb250YWluZXIncyBFbnRpdHlcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgb3Igbm93IHRoZSBUYXJnZXQgd2FzIGRlcGxveWVkIHRvIHRoaXMgcGFydGljdWxhciBDb250YWluZXJcbiAqL1xuVGFyZ2V0LnByb3RvdHlwZS5faXNXaXRoaW4gPSBmdW5jdGlvbiBfaXNXaXRoaW4oY29udGFpbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuY29udGFpbmVyc1tjb250YWluZXIuX2lkXTtcbn07XG5cbi8qKlxuICogTWFyayBhIENvbnRhaW5lciBhcyBoYXZpbmcgYSBkZXBsb3llZCBpbnN0YW5jZSBvZiB0aGUgVGFyZ2V0XG4gKlxuICogQG1ldGhvZCBfYWRkVG9Db250YWluZXJcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGhlIGlkIG9mIHRoZSBDb250YWluZXIncyBFbnRpdHlcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHN0YXVzIG9mIHRoZSBhZGRpdGlvblxuICovXG5UYXJnZXQucHJvdG90eXBlLl9hZGRUb0NvbnRhaW5lciA9IGZ1bmN0aW9uIF9hZGRUb0NvbnRhaW5lcihjb250YWluZXIpIHtcbiAgICB0aGlzLmNvbnRhaW5lcnNbY29udGFpbmVyLl9pZF0gPSB0cnVlO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBVbm1hcmsgYSBDb250YWluZXIgYXMgaGF2aW5nIGEgZGVwbG95ZWQgaW5zdGFuY2Ugb2YgdGhlIFRhcmdldFxuICpcbiAqIEBtZXRob2QgX3JlbW92ZUZyb21Db250YWluZXJcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGhlIGlkIG9mIHRoZSBDb250YWluZXIncyBFbnRpdHlcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHN0YXVzIG9mIHRoZSByZW1vdmFsXG4gKi9cblRhcmdldC5wcm90b3R5cGUuX3JlbW92ZUZyb21Db250YWluZXIgPSBmdW5jdGlvbiBfcmVtb3ZlRnJvbUNvbnRhaW5lcihjb250YWluZXIpIHtcbiAgICB0aGlzLmNvbnRhaW5lcnNbY29udGFpbmVyLl9pZF0gPSBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBzaXplIG9mIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2QgZ2V0U2l6ZVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSAyLWRpbWVuc2lvbmFsIGFycmF5IHJlcHJlc2VudGluZyB0aGUgc2l6ZSBvZiB0aGUgU3VyZmFjZSBpbiBwaXhlbHMuXG4gKi9cblRhcmdldC5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uIGdldFNpemUobWF0cml4LCBkaXZpZGVCeVcpIHtcbiAgICBtYXRyaXggPSBtYXRyaXggfHwgdGhpcy5nZXRFbnRpdHkoKS5nZXRDb21wb25lbnQoJ3RyYW5zZm9ybScpLl9tYXRyaXg7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGRpc3BsYWNlbWVudDoge1xuICAgICAgICAgICAgICAgIGxlZnQgICA6IDAsXG4gICAgICAgICAgICAgICAgYm90dG9tIDogMCxcbiAgICAgICAgICAgICAgICBuZWFyICAgOiAwLFxuICAgICAgICAgICAgICAgIHJpZ2h0ICA6IDAsXG4gICAgICAgICAgICAgICAgdG9wICAgIDogMCxcbiAgICAgICAgICAgICAgICBmYXIgICAgOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgdmFyIGkgPSB0aGlzLnZlcnRpY2llcy5sZW5ndGg7XG4gICAgdmFyIHZlY3RvclNjcmF0Y2ggPSBbXTtcbiAgICBNYXRyaXhNYXRoLmFwcGx5VG9WZWN0b3IodmVjdG9yU2NyYXRjaCwgbWF0cml4LCBbMCwgMCwgMCwgMV0pO1xuICAgIGlmIChkaXZpZGVCeVcpIHtcbiAgICAgICAgdmVjdG9yU2NyYXRjaFswXSAvPSB2ZWN0b3JTY3JhdGNoWzNdO1xuICAgICAgICB2ZWN0b3JTY3JhdGNoWzFdIC89IHZlY3RvclNjcmF0Y2hbM107XG4gICAgICAgIHZlY3RvclNjcmF0Y2hbMl0gLz0gdmVjdG9yU2NyYXRjaFszXTtcbiAgICB9XG4gICAgcmVzdWx0Lm9yaWdpbiA9IHZlY3RvclNjcmF0Y2guc2xpY2UoMCwgLTEpO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgTWF0cml4TWF0aC5hcHBseVRvVmVjdG9yKHZlY3RvclNjcmF0Y2gsIG1hdHJpeCwgdGhpcy52ZXJ0aWNpZXNbaV0pO1xuICAgICAgICBpZiAoZGl2aWRlQnlXKSB7XG4gICAgICAgICAgICB2ZWN0b3JTY3JhdGNoWzBdIC89IHZlY3RvclNjcmF0Y2hbM107XG4gICAgICAgICAgICB2ZWN0b3JTY3JhdGNoWzFdIC89IHZlY3RvclNjcmF0Y2hbM107XG4gICAgICAgICAgICB2ZWN0b3JTY3JhdGNoWzJdIC89IHZlY3RvclNjcmF0Y2hbM107XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHggPSB2ZWN0b3JTY3JhdGNoWzBdIC0gcmVzdWx0Lm9yaWdpblswXSwgeSA9IHZlY3RvclNjcmF0Y2hbMV0gLSByZXN1bHQub3JpZ2luWzFdLCB6ID0gdmVjdG9yU2NyYXRjaFsyXSAtIHJlc3VsdC5vcmlnaW5bMl07XG4gICAgICAgIGlmICh4ID4gcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCkgIHJlc3VsdC5kaXNwbGFjZW1lbnQucmlnaHQgID0geDtcbiAgICAgICAgaWYgKHggPCByZXN1bHQuZGlzcGxhY2VtZW50LmxlZnQpICAgcmVzdWx0LmRpc3BsYWNlbWVudC5sZWZ0ICAgPSB4O1xuICAgICAgICBpZiAoeSA+IHJlc3VsdC5kaXNwbGFjZW1lbnQuYm90dG9tKSByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSA9IHk7XG4gICAgICAgIGlmICh5IDwgcmVzdWx0LmRpc3BsYWNlbWVudC50b3ApICAgIHJlc3VsdC5kaXNwbGFjZW1lbnQudG9wICAgID0geTtcbiAgICAgICAgaWYgKHogPiByZXN1bHQuZGlzcGxhY2VtZW50Lm5lYXIpICAgcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyICAgPSB6O1xuICAgICAgICBpZiAoeiA8IHJlc3VsdC5kaXNwbGFjZW1lbnQuZmFyKSAgICByZXN1bHQuZGlzcGxhY2VtZW50LmZhciAgICA9IHo7XG4gICAgfVxuICAgIHJlc3VsdC5zaXplID0gW3Jlc3VsdC5kaXNwbGFjZW1lbnQucmlnaHQgLSByZXN1bHQuZGlzcGxhY2VtZW50LmxlZnQsIHJlc3VsdC5kaXNwbGFjZW1lbnQuYm90dG9tIC0gcmVzdWx0LmRpc3BsYWNlbWVudC50b3AsIHJlc3VsdC5kaXNwbGFjZW1lbnQubmVhciAtIHJlc3VsdC5kaXNwbGFjZW1lbnQuZmFyXTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuVGFyZ2V0LnByb3RvdHlwZS5nZXRFbnRpdHkgPSBmdW5jdGlvbiBnZXRFbnRpdHkoKSB7XG4gICAgcmV0dXJuIEVudGl0eVJlZ2lzdHJ5LmdldEVudGl0eSh0aGlzLl9lbnRpdHlJRCk7XG59O1xuXG5UYXJnZXQucHJvdG90eXBlLnNldE9yaWdpbiA9IGZ1bmN0aW9uIHNldE9yaWdpbigpIHtcbiAgICB0aGlzLl9vcmlnaW5bMF0gPSB4ICE9IG51bGwgPyB4IDogdGhpcy5fb3JpZ2luWzBdO1xuICAgIHRoaXMuX29yaWdpblsxXSA9IHkgIT0gbnVsbCA/IHkgOiB0aGlzLl9vcmlnaW5bMV07XG4gICAgdGhpcy5fb3JpZ2luWzJdID0geiAhPSBudWxsID8geiA6IHRoaXMuX29yaWdpblsxXTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBUYXJnZXQ7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4uLy4uL2V2ZW50cy9FdmVudEVtaXR0ZXInKTtcblxuLy8gQ09OU1RTXG52YXIgSURFTlRJVFkgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG5cbi8vIEZ1bmN0aW9ucyB0byBiZSBydW4gd2hlbiBhbiBpbmRleCBpcyBtYXJrZWQgYXMgaW52YWxpZGF0ZWRcbnZhciBWQUxJREFUT1JTID0gW1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMChwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzBdICogKG1lbW9yeVsyXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdICsgcGFyZW50WzRdICogKG1lbW9yeVswXSAqIG1lbW9yeVs1XSArIG1lbW9yeVsxXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdICsgcGFyZW50WzhdICogKG1lbW9yeVsxXSAqIG1lbW9yeVs1XSAtIG1lbW9yeVswXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUxKHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMV0gKiAobWVtb3J5WzJdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF0gKyBwYXJlbnRbNV0gKiAobWVtb3J5WzBdICogbWVtb3J5WzVdICsgbWVtb3J5WzFdICogbWVtb3J5WzNdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF0gKyBwYXJlbnRbOV0gKiAobWVtb3J5WzFdICogbWVtb3J5WzVdIC0gbWVtb3J5WzBdICogbWVtb3J5WzNdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTIocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFsyXSAqIChtZW1vcnlbMl0gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXSArIHBhcmVudFs2XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbNV0gKyBtZW1vcnlbMV0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXSArIHBhcmVudFsxMF0gKiAobWVtb3J5WzFdICogbWVtb3J5WzVdIC0gbWVtb3J5WzBdICogbWVtb3J5WzNdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTMocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFszXSAqIChtZW1vcnlbMl0gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXSArIHBhcmVudFs3XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbNV0gKyBtZW1vcnlbMV0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXSArIHBhcmVudFsxMV0gKiAobWVtb3J5WzFdICogbWVtb3J5WzVdIC0gbWVtb3J5WzBdICogbWVtb3J5WzNdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTQocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFswXSAqICgtbWVtb3J5WzJdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV0gKyBwYXJlbnRbNF0gKiAobWVtb3J5WzBdICogbWVtb3J5WzRdIC0gbWVtb3J5WzFdICogbWVtb3J5WzNdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV0gKyBwYXJlbnRbOF0gKiAobWVtb3J5WzFdICogbWVtb3J5WzRdICsgbWVtb3J5WzBdICogbWVtb3J5WzNdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTUocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFsxXSAqICgtbWVtb3J5WzJdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV0gKyBwYXJlbnRbNV0gKiAobWVtb3J5WzBdICogbWVtb3J5WzRdIC0gbWVtb3J5WzFdICogbWVtb3J5WzNdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV0gKyBwYXJlbnRbOV0gKiAobWVtb3J5WzFdICogbWVtb3J5WzRdICsgbWVtb3J5WzBdICogbWVtb3J5WzNdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTYocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFsyXSAqICgtbWVtb3J5WzJdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV0gKyBwYXJlbnRbNl0gKiAobWVtb3J5WzBdICogbWVtb3J5WzRdIC0gbWVtb3J5WzFdICogbWVtb3J5WzNdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV0gKyBwYXJlbnRbMTBdICogKG1lbW9yeVsxXSAqIG1lbW9yeVs0XSArIG1lbW9yeVswXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGU3KHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbM10gKiAoLW1lbW9yeVsyXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdICsgcGFyZW50WzddICogKG1lbW9yeVswXSAqIG1lbW9yeVs0XSAtIG1lbW9yeVsxXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdICsgcGFyZW50WzExXSAqIChtZW1vcnlbMV0gKiBtZW1vcnlbNF0gKyBtZW1vcnlbMF0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlOChwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzBdICogKG1lbW9yeVszXSkgKiB2ZWN0b3JzLnNjYWxlWzJdICsgcGFyZW50WzRdICogKC1tZW1vcnlbMV0gKiBtZW1vcnlbMl0pICogdmVjdG9ycy5zY2FsZVsyXSArIHBhcmVudFs4XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbMl0pICogdmVjdG9ycy5zY2FsZVsyXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlOShwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzFdICogKG1lbW9yeVszXSkgKiB2ZWN0b3JzLnNjYWxlWzJdICsgcGFyZW50WzVdICogKC1tZW1vcnlbMV0gKiBtZW1vcnlbMl0pICogdmVjdG9ycy5zY2FsZVsyXSArIHBhcmVudFs5XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbMl0pICogdmVjdG9ycy5zY2FsZVsyXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMTAocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFsyXSAqIChtZW1vcnlbM10pICogdmVjdG9ycy5zY2FsZVsyXSArIHBhcmVudFs2XSAqICgtbWVtb3J5WzFdICogbWVtb3J5WzJdKSAqIHZlY3RvcnMuc2NhbGVbMl0gKyBwYXJlbnRbMTBdICogKG1lbW9yeVswXSAqIG1lbW9yeVsyXSkgKiB2ZWN0b3JzLnNjYWxlWzJdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUxMShwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzNdICogKG1lbW9yeVszXSkgKiB2ZWN0b3JzLnNjYWxlWzJdICsgcGFyZW50WzddICogKC1tZW1vcnlbMV0gKiBtZW1vcnlbMl0pICogdmVjdG9ycy5zY2FsZVsyXSArIHBhcmVudFsxMV0gKiAobWVtb3J5WzBdICogbWVtb3J5WzJdKSAqIHZlY3RvcnMuc2NhbGVbMl07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTEyKHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMF0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzBdICsgcGFyZW50WzRdICogdmVjdG9ycy50cmFuc2xhdGlvblsxXSArIHBhcmVudFs4XSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMl0gKyBwYXJlbnRbMTJdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUxMyhwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzFdICogdmVjdG9ycy50cmFuc2xhdGlvblswXSArIHBhcmVudFs1XSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMV0gKyBwYXJlbnRbOV0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzJdICsgcGFyZW50WzEzXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMTQocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFsyXSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMF0gKyBwYXJlbnRbNl0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzFdICsgcGFyZW50WzEwXSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMl0gKyBwYXJlbnRbMTRdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUxNShwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzNdICogdmVjdG9ycy50cmFuc2xhdGlvblswXSArIHBhcmVudFs3XSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMV0gKyBwYXJlbnRbMTFdICogdmVjdG9ycy50cmFuc2xhdGlvblsyXSArIHBhcmVudFsxNV07XG4gICAgfVxuXTtcblxuLy8gTWFwIG9mIGludmFsaWRhdGlvbiBudW1iZXJzXG52YXIgREVQRU5ERU5UUyA9IHtcbiAgICBnbG9iYWwgOiBbNDM2OSw4NzM4LDE3NDc2LDM0OTUyLDQzNjksODczOCwxNzQ3NiwzNDk1Miw0MzY5LDg3MzgsMTc0NzYsMzQ5NTIsNDA5Niw4MTkyLDE2Mzg0LDMyNzY4XSxcbiAgICBsb2NhbCAgOiB7XG4gICAgICAgIHRyYW5zbGF0aW9uIDogWzYxNDQwLDYxNDQwLDYxNDQwXSxcbiAgICAgICAgcm90YXRpb24gICAgOiBbNDA5NSw0MDk1LDI1NV0sXG4gICAgICAgIHNjYWxlICAgICAgIDogWzQwOTUsNDA5NSw0MDk1XSxcbiAgICB9XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBpcyBhIGNvbXBvbmVudCB0aGF0IGlzIHBhcnQgb2YgZXZlcnkgRW50aXR5LiAgSXQgaXNcbiAqICAgcmVzcG9uc2libGUgZm9yIHVwZGF0aW5nIGl0J3Mgb3duIG5vdGlvbiBvZiBwb3NpdGlvbiBpbiBzcGFjZSBhbmRcbiAqICAgaW5jb3Jwb3JhdGluZyB0aGF0IHdpdGggcGFyZW50IGluZm9ybWF0aW9uLlxuICpcbiAqIEBjbGFzcyBUcmFuc2Zvcm1cbiAqIEBjb21wb25lbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBUcmFuc2Zvcm0oKSB7XG4gICAgdGhpcy5fbWF0cml4ICAgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG4gICAgdGhpcy5fbWVtb3J5ICAgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAxLCAwLCAxLCAwXSk7XG4gICAgdGhpcy5fdmVjdG9ycyAgPSB7XG4gICAgICAgIHRyYW5zbGF0aW9uIDogbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMF0pLFxuICAgICAgICByb3RhdGlvbiAgICA6IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDBdKSxcbiAgICAgICAgc2NhbGUgICAgICAgOiBuZXcgRmxvYXQzMkFycmF5KFsxLCAxLCAxXSlcbiAgICB9O1xuICAgIHRoaXMuX0lPICAgICAgID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIHRoaXMuX3VwZGF0ZUZOID0gbnVsbDtcbiAgICB0aGlzLl9tdXRhdG9yICA9IHtcbiAgICAgICAgdHJhbnNsYXRlICAgICAgOiB0aGlzLnRyYW5zbGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICByb3RhdGUgICAgICAgICA6IHRoaXMucm90YXRlLmJpbmQodGhpcyksXG4gICAgICAgIHNjYWxlICAgICAgICAgIDogdGhpcy5zY2FsZS5iaW5kKHRoaXMpLFxuICAgICAgICBzZXRUcmFuc2xhdGlvbiA6IHRoaXMuc2V0VHJhbnNsYXRpb24uYmluZCh0aGlzKSxcbiAgICAgICAgc2V0Um90YXRpb24gICAgOiB0aGlzLnNldFJvdGF0aW9uLmJpbmQodGhpcyksXG4gICAgICAgIHNldFNjYWxlICAgICAgIDogdGhpcy5zZXRTY2FsZS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgICB0aGlzLl9pbnZhbGlkYXRlZCA9IDA7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSB0cmFuc2Zvcm0gbWF0cml4IHRoYXQgcmVwcmVzZW50cyB0aGlzIFRyYW5zZm9ybSdzIHZhbHVlc1xuICogICBiZWluZyBhcHBsaWVkIHRvIGl0J3MgcGFyZW50J3MgZ2xvYmFsIHRyYW5zZm9ybS5cbiAqXG4gKiBAbWV0aG9kIGdldEdsb2JhbE1hdHJpeFxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzIgQXJyYXl9IHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgVHJhbnNmb3JtIGJlaW5nIGFwcGxpZWQgdG8gaXQncyBwYXJlbnRcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRHbG9iYWxNYXRyaXggPSBmdW5jdGlvbiBnZXRHbG9iYWxNYXRyaXgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hdHJpeDtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSB2ZWN0b3JpemVkIGluZm9ybWF0aW9uIGZvciB0aGlzIFRyYW5zZm9ybSdzIGxvY2FsXG4gKiAgIHRyYW5zZm9ybS5cbiAqXG4gKiBAbWV0aG9kIGdldExvY2FsVmVjdG9yc1xuICpcbiAqIEByZXR1cm4ge09iamVjdH0gb2JqZWN0IHdpdGggdHJhbnNsYXRlLCByb3RhdGUsIGFuZCBzY2FsZSBrZXlzXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0TG9jYWxWZWN0b3JzID0gZnVuY3Rpb24gZ2V0VmVjdG9ycygpIHtcbiAgICByZXR1cm4gdGhpcy5fdmVjdG9ycztcbn07XG5cbi8qKlxuICogRGVmaW5lIHRoZSBwcm92aWRlciBvZiBzdGF0ZSBmb3IgdGhlIFRyYW5zZm9ybS5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZUZyb21cbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gcHJvdmlkZXIgc291cmNlIG9mIHN0YXRlIGZvciB0aGUgVHJhbnNmb3JtXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUudXBkYXRlRnJvbSA9IGZ1bmN0aW9uIHVwZGF0ZUZyb20ocHJvdmlkZXIpIHtcbiAgICBpZiAocHJvdmlkZXIgaW5zdGFuY2VvZiBGdW5jdGlvbiB8fCAhcHJvdmlkZXIpIHRoaXMuX3VwZGF0ZUZOID0gcHJvdmlkZXI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGxvY2FsIGludmFsaWRhdGlvbiBzY2hlbWUgYmFzZWQgb24gcGFyZW50IGluZm9ybWF0aW9uXG4gKlxuICogQG1ldGhvZCBfaW52YWxpZGF0ZUZyb21QYXJlbnRcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBwYXJlbnRSZXBvcnQgcGFyZW50J3MgaW52YWxpZGF0aW9uXG4gKi9cbmZ1bmN0aW9uIF9pbnZhbGlkYXRlRnJvbVBhcmVudChwYXJlbnRSZXBvcnQpIHtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgd2hpbGUgKHBhcmVudFJlcG9ydCkge1xuICAgICAgICBpZiAocGFyZW50UmVwb3J0ICYgMSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gREVQRU5ERU5UUy5nbG9iYWxbY291bnRlcl07XG4gICAgICAgIGNvdW50ZXIrKztcbiAgICAgICAgcGFyZW50UmVwb3J0ID4+Pj0gMTtcbiAgICB9XG59XG5cbi8qKlxuICogVXBkYXRlIHRoZSBnbG9iYWwgbWF0cml4IGJhc2VkIG9uIGxvY2FsIGFuZCBwYXJlbnQgaW52YWxpZGF0aW9ucy5cbiAqXG4gKiBAbWV0aG9kICBfdXBkYXRlXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gcGFyZW50UmVwb3J0IGludmFsaWRhdGlvbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYXJlbnQgbWF0cml4XG4gKiBAcGFyYW0gIHtBcnJheX0gcGFyZW50TWF0cml4IHBhcmVudCB0cmFuc2Zvcm0gbWF0cml4IGFzIGFuIEFycmF5XG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGludmFsaWRhdGlvbiBzY2hlbWVcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24gX3VwZGF0ZShwYXJlbnRSZXBvcnQsIHBhcmVudE1hdHJpeCkge1xuICAgIGlmIChwYXJlbnRSZXBvcnQpICBfaW52YWxpZGF0ZUZyb21QYXJlbnQuY2FsbCh0aGlzLCBwYXJlbnRSZXBvcnQpO1xuICAgIGlmICghcGFyZW50TWF0cml4KSBwYXJlbnRNYXRyaXggPSBJREVOVElUWTtcbiAgICBpZiAodGhpcy5fdXBkYXRlRk4pIHRoaXMuX3VwZGF0ZUZOKHRoaXMuX211dGF0b3IpO1xuICAgIHZhciB1cGRhdGU7XG4gICAgdmFyIGNvdW50ZXIgICAgID0gMDtcbiAgICB2YXIgaW52YWxpZGF0ZWQgPSB0aGlzLl9pbnZhbGlkYXRlZDtcblxuICAgIC8vIEJhc2VkIG9uIGludmFsaWRhdGlvbnMgdXBkYXRlIG9ubHkgdGhlIG5lZWRlZCBpbmRpY2llc1xuICAgIHdoaWxlICh0aGlzLl9pbnZhbGlkYXRlZCkge1xuICAgICAgICBpZiAodGhpcy5faW52YWxpZGF0ZWQgJiAxKSB7XG4gICAgICAgICAgICB1cGRhdGUgPSBWQUxJREFUT1JTW2NvdW50ZXJdKHBhcmVudE1hdHJpeCwgdGhpcy5fdmVjdG9ycywgdGhpcy5fbWVtb3J5KTtcbiAgICAgICAgICAgIGlmICh1cGRhdGUgIT09IHRoaXMuX21hdHJpeFtjb3VudGVyXSlcbiAgICAgICAgICAgICAgICB0aGlzLl9tYXRyaXhbY291bnRlcl0gPSB1cGRhdGU7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgaW52YWxpZGF0ZWQgJj0gKCgxIDw8IDE2KSAtIDEpIF4gKDEgPDwgY291bnRlcik7XG4gICAgICAgIH1cblxuICAgICAgICBjb3VudGVyKys7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkID4+Pj0gMTtcbiAgICB9XG5cbiAgICBpZiAoaW52YWxpZGF0ZWQpIHRoaXMuX0lPLmVtaXQoJ2ludmFsaWRhdGVkJywgaW52YWxpZGF0ZWQpO1xuICAgIHJldHVybiBpbnZhbGlkYXRlZDtcbn07XG5cbi8qKlxuICogQWRkIGV4dHJhIHRyYW5zbGF0aW9uIHRvIHRoZSBjdXJyZW50IHZhbHVlcy4gIEludmFsaWRhdGVzXG4gKiAgIHRyYW5zbGF0aW9uIGFzIG5lZWRlZC5cbiAqXG4gKiBAbWV0aG9kIHRyYW5zbGF0ZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0geCB0cmFuc2xhdGlvbiBhbG9uZyB0aGUgeC1heGlzIGluIHBpeGVsc1xuICogQHBhcmFtICB7TnVtYmVyfSB5IHRyYW5zbGF0aW9uIGFsb25nIHRoZSB5LWF4aXMgaW4gcGl4ZWxzXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHogdHJhbnNsYXRpb24gYWxvbmcgdGhlIHotYXhpcyBpbiBwaXhlbHNcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiB0cmFuc2xhdGUoeCwgeSwgeikge1xuICAgIHZhciB0cmFuc2xhdGlvbiA9IHRoaXMuX3ZlY3RvcnMudHJhbnNsYXRpb247XG4gICAgdmFyIGRpcnR5ICAgICAgID0gZmFsc2U7XG4gICAgdmFyIHNpemU7XG5cbiAgICBpZiAoeCkge1xuICAgICAgICB0cmFuc2xhdGlvblswXSArPSB4O1xuICAgICAgICBkaXJ0eSAgICAgICAgICAgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh5KSB7XG4gICAgICAgIHRyYW5zbGF0aW9uWzFdICs9IHk7XG4gICAgICAgIGRpcnR5ICAgICAgICAgICA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHopIHtcbiAgICAgICAgdHJhbnNsYXRpb25bMl0gKz0gejtcbiAgICAgICAgZGlydHkgICAgICAgICAgID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoZGlydHkpIHRoaXMuX2ludmFsaWRhdGVkIHw9IDYxNDQwO1xufTtcblxuLyoqXG4gKiBBZGQgZXh0cmEgcm90YXRpb24gdG8gdGhlIGN1cnJlbnQgdmFsdWVzLiAgSW52YWxpZGF0ZXNcbiAqICAgcm90YXRpb24gYXMgbmVlZGVkLlxuICpcbiAqIEBtZXRob2Qgcm90YXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB4IHJvdGF0aW9uIGFib3V0IHRoZSB4LWF4aXMgaW4gcmFkaWFuc1xuICogQHBhcmFtICB7TnVtYmVyfSB5IHJvdGF0aW9uIGFib3V0IHRoZSB5LWF4aXMgaW4gcmFkaWFuc1xuICogQHBhcmFtICB7TnVtYmVyfSB6IHJvdGF0aW9uIGFib3V0IHRoZSB6LWF4aXMgaW4gcmFkaWFuc1xuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnJvdGF0ZSA9IGZ1bmN0aW9uIHJvdGF0ZSh4LCB5LCB6KSB7XG4gICAgdmFyIHJvdGF0aW9uID0gdGhpcy5fdmVjdG9ycy5yb3RhdGlvbjtcbiAgICB0aGlzLnNldFJvdGF0aW9uKCh4ID8geCA6IDApICsgcm90YXRpb25bMF0sICh5ID8geSA6IDApICsgcm90YXRpb25bMV0sICh6ID8geiA6IDApICsgcm90YXRpb25bMl0pO1xufTtcblxuLyoqXG4gKiBBZGQgZXh0cmEgc2NhbGUgdG8gdGhlIGN1cnJlbnQgdmFsdWVzLiAgSW52YWxpZGF0ZXNcbiAqICAgc2NhbGUgYXMgbmVlZGVkLlxuICpcbiAqIEBtZXRob2Qgc2NhbGVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggc2NhbGUgYWxvbmcgdGhlIHgtYXhpcyBhcyBhIHBlcmNlbnRcbiAqIEBwYXJhbSAge051bWJlcn0geSBzY2FsZSBhbG9uZyB0aGUgeS1heGlzIGFzIGEgcGVyY2VudFxuICogQHBhcmFtICB7TnVtYmVyfSB6IHNjYWxlIGFsb25nIHRoZSB6LWF4aXMgYXMgYSBwZXJjZW50XG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiBzY2FsZSh4LCB5LCB6KSB7XG4gICAgdmFyIHNjYWxlVmVjdG9yID0gdGhpcy5fdmVjdG9ycy5zY2FsZTtcbiAgICB2YXIgZGlydHkgICAgICAgPSBmYWxzZTtcblxuICAgIGlmICh4KSB7XG4gICAgICAgIHNjYWxlVmVjdG9yWzBdICs9IHg7XG4gICAgICAgIGRpcnR5ICAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHkpIHtcbiAgICAgICAgc2NhbGVWZWN0b3JbMV0gKz0geTtcbiAgICAgICAgZGlydHkgICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeikge1xuICAgICAgICBzY2FsZVZlY3RvclsyXSArPSB6O1xuICAgICAgICBkaXJ0eSAgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmIChkaXJ0eSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gNDA5NTtcbn07XG5cbi8qKlxuICogQWJzb2x1dGUgc2V0IG9mIHRoZSBUcmFuc2Zvcm0ncyB0cmFuc2xhdGlvbi4gIEludmFsaWRhdGVzXG4gKiAgIHRyYW5zbGF0aW9uIGFzIG5lZWRlZC5cbiAqXG4gKiBAbWV0aG9kIHNldFRyYW5zbGF0aW9uXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB4IHRyYW5zbGF0aW9uIGFsb25nIHRoZSB4LWF4aXMgaW4gcGl4ZWxzXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHkgdHJhbnNsYXRpb24gYWxvbmcgdGhlIHktYXhpcyBpbiBwaXhlbHNcbiAqIEBwYXJhbSAge051bWJlcn0geiB0cmFuc2xhdGlvbiBhbG9uZyB0aGUgei1heGlzIGluIHBpeGVsc1xuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldFRyYW5zbGF0aW9uID0gZnVuY3Rpb24gc2V0VHJhbnNsYXRpb24oeCwgeSwgeikge1xuICAgIHZhciB0cmFuc2xhdGlvbiA9IHRoaXMuX3ZlY3RvcnMudHJhbnNsYXRpb247XG4gICAgdmFyIGRpcnR5ICAgICAgID0gZmFsc2U7XG4gICAgdmFyIHNpemU7XG5cbiAgICBpZiAoeCAhPT0gdHJhbnNsYXRpb25bMF0gJiYgeCAhPSBudWxsKSB7XG4gICAgICAgIHRyYW5zbGF0aW9uWzBdID0geDtcbiAgICAgICAgZGlydHkgICAgICAgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmICh5ICE9PSB0cmFuc2xhdGlvblsxXSAmJiB5ICE9IG51bGwpIHtcbiAgICAgICAgdHJhbnNsYXRpb25bMV0gPSB5O1xuICAgICAgICBkaXJ0eSAgICAgICAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHogIT09IHRyYW5zbGF0aW9uWzJdICYmIHogIT0gbnVsbCkge1xuICAgICAgICB0cmFuc2xhdGlvblsyXSA9IHo7XG4gICAgICAgIGRpcnR5ICAgICAgICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoZGlydHkpIHRoaXMuX2ludmFsaWRhdGVkIHw9IDYxNDQwO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIGN1cnJlbnQgdHJhbnNsYXRpb24uXG4gKlxuICogQG1ldGhvZCBnZXRUcmFuc2xhdGlvblxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IHRyYW5zbGF0aW9uXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0VHJhbnNsYXRpb24gPSBmdW5jdGlvbiBnZXRUcmFuc2xhdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fdmVjdG9ycy50cmFuc2xhdGlvbjtcbn07XG5cbi8qKlxuICogQWJzb2x1dGUgc2V0IG9mIHRoZSBUcmFuc2Zvcm0ncyByb3RhdGlvbi4gIEludmFsaWRhdGVzXG4gKiAgIHJvdGF0aW9uIGFzIG5lZWRlZC5cbiAqXG4gKiBAbWV0aG9kIHNldFJvdGF0ZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0geCByb3RhdGlvbiBhYm91dCB0aGUgeC1heGlzIGluIHJhZGlhbnNcbiAqIEBwYXJhbSAge051bWJlcn0geSByb3RhdGlvbiBhYm91dCB0aGUgeS1heGlzIGluIHJhZGlhbnNcbiAqIEBwYXJhbSAge051bWJlcn0geiByb3RhdGlvbiBhYm91dCB0aGUgei1heGlzIGluIHJhZGlhbnNcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRSb3RhdGlvbiA9IGZ1bmN0aW9uIHNldFJvdGF0aW9uKHgsIHksIHopIHtcbiAgICB2YXIgcm90YXRpb24gPSB0aGlzLl92ZWN0b3JzLnJvdGF0aW9uO1xuICAgIHZhciBkaXJ0eSAgICA9IGZhbHNlO1xuXG4gICAgaWYgKHggIT09IHJvdGF0aW9uWzBdICYmIHggIT0gbnVsbCkge1xuICAgICAgICByb3RhdGlvblswXSAgICAgPSB4O1xuICAgICAgICB0aGlzLl9tZW1vcnlbMF0gPSBNYXRoLmNvcyh4KTtcbiAgICAgICAgdGhpcy5fbWVtb3J5WzFdID0gTWF0aC5zaW4oeCk7XG4gICAgICAgIGRpcnR5ICAgICAgICAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IHJvdGF0aW9uWzFdICYmIHkgIT0gbnVsbCkge1xuICAgICAgICByb3RhdGlvblsxXSAgICAgPSB5O1xuICAgICAgICB0aGlzLl9tZW1vcnlbMl0gPSBNYXRoLmNvcyh5KTtcbiAgICAgICAgdGhpcy5fbWVtb3J5WzNdID0gTWF0aC5zaW4oeSk7XG4gICAgICAgIGRpcnR5ICAgICAgICAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHogIT09IHJvdGF0aW9uWzJdICYmIHogIT0gbnVsbCkge1xuICAgICAgICByb3RhdGlvblsyXSAgICAgICAgPSB6O1xuICAgICAgICB0aGlzLl9tZW1vcnlbNF0gICAgPSBNYXRoLmNvcyh6KTtcbiAgICAgICAgdGhpcy5fbWVtb3J5WzVdICAgID0gTWF0aC5zaW4oeik7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkIHw9IDI1NTtcbiAgICB9XG5cbiAgICBpZiAoZGlydHkpIHRoaXMuX2ludmFsaWRhdGVkIHw9IDQwOTU7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgY3VycmVudCByb3RhdGlvbi5cbiAqXG4gKiBAbWV0aG9kIGdldFJvdGF0aW9uXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSBhcnJheSByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgcm90YXRpb25cbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRSb3RhdGlvbiA9IGZ1bmN0aW9uIGdldFJvdGF0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl92ZWN0b3JzLnJvdGF0aW9uO1xufTtcblxuLyoqXG4gKiBBYnNvbHV0ZSBzZXQgb2YgdGhlIFRyYW5zZm9ybSdzIHNjYWxlLiAgSW52YWxpZGF0ZXNcbiAqICAgc2NhbGUgYXMgbmVlZGVkLlxuICpcbiAqIEBtZXRob2Qgc2V0U2NhbGVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggc2NhbGUgYWxvbmcgdGhlIHgtYXhpcyBhcyBhIHBlcmNlbnRcbiAqIEBwYXJhbSAge051bWJlcn0geSBzY2FsZSBhbG9uZyB0aGUgeS1heGlzIGFzIGEgcGVyY2VudFxuICogQHBhcmFtICB7TnVtYmVyfSB6IHNjYWxlIGFsb25nIHRoZSB6LWF4aXMgYXMgYSBwZXJjZW50XG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0U2NhbGUgPSBmdW5jdGlvbiBzZXRTY2FsZSh4LCB5LCB6KSB7XG4gICAgdmFyIHNjYWxlID0gdGhpcy5fdmVjdG9ycy5zY2FsZTtcbiAgICB2YXIgZGlydHkgPSBmYWxzZTtcblxuICAgIGlmICh4ICE9PSBzY2FsZVswXSkge1xuICAgICAgICBzY2FsZVswXSA9IHg7XG4gICAgICAgIGRpcnR5ICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gc2NhbGVbMV0pIHtcbiAgICAgICAgc2NhbGVbMV0gPSB5O1xuICAgICAgICBkaXJ0eSAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHogIT09IHNjYWxlWzJdKSB7XG4gICAgICAgIHNjYWxlWzJdID0gejtcbiAgICAgICAgZGlydHkgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmIChkaXJ0eSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gNDA5NTtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBjdXJyZW50IHNjYWxlLlxuICpcbiAqIEBtZXRob2QgZ2V0U2NhbGVcbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGFycmF5IHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBzY2FsZVxuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFNjYWxlID0gZnVuY3Rpb24gZ2V0U2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZlY3RvcnMuc2NhbGU7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGZ1bmN0aW9ucyB0byBiZSBjYWxsZWQgb24gdGhlIFRyYW5zZm9ybSdzIGV2ZW50cy5cbiAqXG4gKiBAbWV0aG9kIG9uXG4gKiBAY2hhaW5hYmxlXG4gKlxuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oKSB7XG4gICAgdGhpcy5fSU8ub24uYXBwbHkodGhpcy5fSU8sIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRvT3JpZ2luID0gZnVuY3Rpb24gdG9PcmlnaW4oKSB7XG4gICAgdGhpcy5zZXRUcmFuc2xhdGlvbigwLCAwLCAwKTtcbiAgICB0aGlzLnNldFJvdGF0aW9uKDAsIDAsIDApO1xuICAgIHRoaXMuc2V0U2NhbGUoMSwgMSwgMSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEVudGl0eSAgICAgICAgID0gcmVxdWlyZSgnLi9FbnRpdHknKTtcbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4vRW50aXR5UmVnaXN0cnknKTtcbnZhciBDb250YWluZXIgICAgICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50cy9Db250YWluZXInKTtcbnZhciBDYW1lcmEgICAgICAgICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50cy9DYW1lcmEnKTtcblxuLyoqXG4gKiBDb250ZXh0IGlzIHRoZSBkZWZpbml0aW9uIG9mIHdvcmxkIHNwYWNlIGZvciB0aGF0IHBhcnQgb2YgdGhlIHNjZW5lIGdyYXBoLlxuICogICBBIGNvbnRleHQgY2FuIGVpdGhlciBoYXZlIGEgQ29udGFpbmVyIG9yIG5vdC4gIEhhdmluZyBhIGNvbnRhaW5lciBtZWFuc1xuICogICB0aGF0IHBhcnRzIG9mIHRoZSBzY2VuZSBncmFwaCBjYW4gYmUgZHJhd24gaW5zaWRlIG9mIGl0LiAgSWYgaXQgZG9lcyBub3RcbiAqICAgaGF2ZSBhIENvbnRhaW5lciB0aGVuIHRoZSBDb250ZXh0IGlzIG9ubHkgcmVzcG9uc2libGUgZm9yIGRlZmluaW5nIHdvcmxkXG4gKiAgIHNwYWNlLiAgVGhlIENvcmVTeXN0ZW0gd2lsbCBzdGFydCBhdCBlYWNoIENvbnRleHQgYW5kIHJlY3Vyc2l2ZSBkb3duXG4gKiAgIHRocm91Z2ggdGhlaXIgY2hpbGRyZW4gdG8gdXBkYXRlIGVhY2ggZW50aXRpeSdzIFRyYW5zZm9ybSwgU2l6ZSxcbiAqICAgYW5kIE9wYWNpdHkuXG4gKlxuICogQGNsYXNzIENvbnRleHRcbiAqIEBlbnRpdHlcbiAqIEBjb25zdHJ1Y3RvclxuICogICBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHRoZSBzdGFydGluZyBvcHRpb25zIGZvciB0aGUgQ29udGV4dFxuICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucy50cmFuc2Zvcm0gdGhlIHN0YXJ0aW5nIHRyYW5zZm9ybSBtYXRyaXhcbiAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMuc2l6ZSB0aGUgc3RhcnRpbmcgc2l6ZVxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmhhc0NvbnRhaW5lciB3aGV0aGVyIG9yIG5vdCB0aGUgQ29udGV4dCBoYXMgYSBDb250YWluZXJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5oYXNDYW1lcmEgd2hldGhlciBvciBub3QgdGhlIENvbnRleHQgaGFzIGEgQ2FtZXJhXG4gKi9cbmZ1bmN0aW9uIENvbnRleHQob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucyB8fCB0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcgfHwgKCFvcHRpb25zLnNpemUgJiYgIW9wdGlvbnMucGFyZW50RWwgJiYgIW9wdGlvbnMuY29udGFpbmVyKSkgdGhyb3cgbmV3IEVycm9yKCdDb250ZXh0LCBtdXN0IGJlIGNhbGxlZCB3aXRoIGFuIG9wdGlvbiBoYXNoIHRoYXQgYXQgbGVhc3QgaGFzIGEgc2l6ZSBvciBhIHBhcmVudEVsIG9yIGEgY29udGFpbmVyIHByb3BlcnR5Jyk7XG4gICAgRW50aXR5LmNhbGwodGhpcyk7XG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIodGhpcywgJ0NvbnRleHRzJyk7XG4gICAgdGhpcy5fcm9vdElEID0gdGhpcy5faWQ7XG4gICAgdGhpcy5fcGFyZW50RWwgPSBvcHRpb25zLnBhcmVudEVsO1xuICAgIHRoaXMuX3NpemUgICAgID0gX2dldFNpemUob3B0aW9ucyk7XG4gICAgdGhpcy5fY29tcG9uZW50cy5zaXplLnNldFBpeGVscy5hcHBseSh0aGlzLl9jb21wb25lbnRzLnNpemUsIHRoaXMuX3NpemUpO1xuICAgIHRoaXMuX2NvbXBvbmVudHMub3BhY2l0eS5zZXQuY2FsbCh0aGlzLl9jb21wb25lbnRzLm9wYWNpdHksIDEpO1xuICAgIHRoaXMuX2NvbXBvbmVudHMudHJhbnNmb3JtLl91cGRhdGUoKDEgPDwgMTYpIC0gMSwgb3B0aW9ucy50cmFuc2Zvcm0pO1xuICAgIGlmIChvcHRpb25zLmhhc0NvbnRhaW5lciAhPT0gZmFsc2UpIHRoaXMuX2NvbXBvbmVudHMuY29udGFpbmVyID0gbmV3IENvbnRhaW5lcih0aGlzLl9pZCwgb3B0aW9ucyk7XG4gICAgaWYgKG9wdGlvbnMuaGFzQ2FtZXJhICAgICE9PSBmYWxzZSkgdGhpcy5fY29tcG9uZW50cy5jYW1lcmEgICAgPSBuZXcgQ2FtZXJhKHRoaXMsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEEgbWV0aG9kIGZvciBkZXRlcm1pbmluZyB3aGF0IHRoZSBzaXplIG9mIHRoZSBDb250ZXh0IGlzLlxuICogIFdpbGwgYmUgdGhlIHVzZXIgZGVmaW5lZCBzaXplIGlmIG9uZSB3YXMgcHJvdmlkZWQgb3RoZXJ3aXNlIGl0XG4gKiAgd2lsbCBkZWZhdWx0IHRvIHRoZSBET00gcmVwcmVzZW50YXRpb24uICBcbiAqXG4gKiBAbWV0aG9kIF9nZXRTaXplXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnMgc3RhcnRpbmcgb3B0aW9ucyBmb3IgdGhlIHNpemVzXG4gKiBAcmV0dXJuIHtBcnJheX0gc2l6ZSBvZiB0aGUgQ29udGV4dFxuICovXG5mdW5jdGlvbiBfZ2V0U2l6ZShvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMuc2l6ZSkgICAgICByZXR1cm4gb3B0aW9ucy5zaXplO1xuICAgIGlmIChvcHRpb25zLmNvbnRhaW5lcikgcmV0dXJuIFtvcHRpb25zLmNvbnRhaW5lci5vZmZzZXRXaWR0aCwgb3B0aW9ucy5jb250YWluZXIub2Zmc2V0SGVpZ2h0LCAwXTtcbiAgICByZXR1cm4gW29wdGlvbnMucGFyZW50RWwub2Zmc2V0V2lkdGgsIG9wdGlvbnMucGFyZW50RWwub2Zmc2V0SGVpZ2h0LCAwXTtcbn1cblxuQ29udGV4dC5wcm90b3R5cGUgICAgICAgICAgICAgICAgICAgICA9IE9iamVjdC5jcmVhdGUoRW50aXR5LnByb3RvdHlwZSk7XG5Db250ZXh0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciAgICAgICAgID0gQ29udGV4dDtcbkNvbnRleHQucHJvdG90eXBlLnVwZGF0ZSAgICAgICAgICAgICAgPSBudWxsO1xuQ29udGV4dC5wcm90b3R5cGUucmVnaXN0ZXJDb21wb25lbnQgICA9IG51bGw7XG5Db250ZXh0LnByb3RvdHlwZS5kZXJlZ2lzdGVyQ29tcG9uZW50ID0gbnVsbDtcbkNvbnRleHQucHJvdG90eXBlLmFkZENvbXBvbmVudCAgICAgICAgPSBudWxsO1xuQ29udGV4dC5wcm90b3R5cGUucmVtb3ZlQ29tcG9uZW50ICAgICA9IG51bGw7XG5Db250ZXh0LnByb3RvdHlwZS5nZXRWaWV3cG9ydFNpemUgICAgID0gZnVuY3Rpb24gZ2V0Vmlld3BvcnRTaXplKCkge1xuICAgIGlmICh0aGlzLl9jb21wb25lbnRzLmNvbnRhaW5lcikgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHMuY29udGFpbmVyLmdldFNpemUoKTtcbiAgICByZXR1cm4gdGhpcy5nZXRTaXplKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRleHQ7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqICAgICAgICAgXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBDb3JlU3lzdGVtICAgICA9IHJlcXVpcmUoJy4vU3lzdGVtcy9Db3JlU3lzdGVtJyksXG4gICAgT3B0aW9uc01hbmFnZXIgPSByZXF1aXJlKCcuL09wdGlvbnNNYW5hZ2VyJyksXG4gICAgRE9NcmVuZGVyZXIgICAgPSByZXF1aXJlKCcuL1JlbmRlcmVycy9ET01yZW5kZXJlcicpLFxuICAgIEdMcmVuZGVyZXIgICAgID0gcmVxdWlyZSgnLi9SZW5kZXJlcnMvV2ViR0xSZW5kZXJlcicpLFxuICAgIFJlbmRlclN5c3RlbSAgID0gcmVxdWlyZSgnLi9TeXN0ZW1zL1JlbmRlclN5c3RlbScpLFxuICAgIEJlaGF2aW9yU3lzdGVtID0gcmVxdWlyZSgnLi9TeXN0ZW1zL0JlaGF2aW9yU3lzdGVtJyksXG4gICAgVGltZVN5c3RlbSAgICAgPSByZXF1aXJlKCcuL1N5c3RlbXMvVGltZVN5c3RlbScpLFxuICAgIExpZnRTeXN0ZW0gICAgID0gcmVxdWlyZSgnLi4vdHJhbnNpdGlvbnMvTGlmdFN5c3RlbScpLFxuICAgIFBoeXNpY3NTeXN0ZW0gID0gcmVxdWlyZSgnLi4vcGh5c2ljcy9QaHlzaWNzU3lzdGVtJyksXG4gICAgQ29udGV4dCAgICAgICAgPSByZXF1aXJlKCcuL0NvbnRleHQnKTtcblxucmVxdWlyZSgnLi9TdHlsZXNoZWV0L2ZhbW91cy5jc3MnKTtcblxudmFyIG9wdGlvbnMgPSB7XG4gICAgbG9vcCAgICAgIDogdHJ1ZSxcbiAgICBkaXJlY3Rpb24gOiAxLFxuICAgIHNwZWVkICAgICA6IDEsXG4gICAgcmVuZGVyaW5nIDoge1xuICAgICAgICByZW5kZXJlcnM6IHtcbiAgICAgICAgICAgIERPTTogRE9NcmVuZGVyZXIsXG4gICAgICAgICAgICBHTDogR0xyZW5kZXJlclxuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gVE9ETzogd2hhdCBpcyB0aGlzIGRvaW5nIGhlcmU/XG5kb2N1bWVudC5vbnRvdWNobW92ZSA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xufTtcblxuLy8gU3RhdGVcbnZhciBMT09QICAgICAgICAgICAgICAgICA9ICdsb29wJyxcbiAgICBSRU5ERVJJTkcgICAgICAgICAgICA9ICdyZW5kZXJpbmcnLFxuICAgIG9wdGlvbnNNYW5hZ2VyICAgICAgID0gbmV3IE9wdGlvbnNNYW5hZ2VyKG9wdGlvbnMpLFxuICAgIHN5c3RlbXMgICAgICAgICAgICAgID0gW1JlbmRlclN5c3RlbSwgQmVoYXZpb3JTeXN0ZW0sIExpZnRTeXN0ZW0sIENvcmVTeXN0ZW0sIFBoeXNpY3NTeXN0ZW0sIFRpbWVTeXN0ZW1dLCAvLyBXZSdyZSBnb2luZyBiYWNrd2FyZHNcbiAgICBjdXJyZW50UmVsYXRpdmVGcmFtZSA9IDAsXG4gICAgY3VycmVudEFic29sdXRlRnJhbWUgPSAwO1xuXG5mdW5jdGlvbiBzZXRSZW5kZXJlcnMocmVuZGVyZXJzKSB7XG4gICAgZm9yICh2YXIga2V5IGluIHJlbmRlcmVycykge1xuICAgICAgICBSZW5kZXJTeXN0ZW0ucmVnaXN0ZXIoa2V5LCByZW5kZXJlcnNba2V5XSk7XG4gICAgfVxufVxuXG5zZXRSZW5kZXJlcnMob3B0aW9ucy5yZW5kZXJpbmcucmVuZGVyZXJzKTtcblxub3B0aW9uc01hbmFnZXIub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZiAoZGF0YS5pZCA9PT0gTE9PUCkge1xuICAgICAgICBpZiAoZGF0YS52YWx1ZSkge1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKEVuZ2luZS5sb29wKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGF0YS5pZCA9PT0gUkVOREVSSU5HKSB7XG4gICAgICAgIHNldFJlbmRlcmVycyhkYXRhLnZhbHVlLnJlbmRlcmVycyk7XG4gICAgfVxufSk7XG5cbi8qKlxuICogVGhlIHNpbmdsZXRvbiBvYmplY3QgaW5pdGlhdGVkIHVwb24gcHJvY2Vzc1xuICogICBzdGFydHVwIHdoaWNoIG1hbmFnZXMgYWxsIGFjdGl2ZSBTeXN0ZW1zIGFuZCBhY3RzIGFzIGFcbiAqICAgZmFjdG9yeSBmb3IgbmV3IENvbnRleHRzL1xuICpcbiAqICAgT24gc3RhdGljIGluaXRpYWxpemF0aW9uLCB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIGlzIGNhbGxlZCB3aXRoXG4gKiAgICAgdGhlIGV2ZW50IGxvb3AgZnVuY3Rpb24uXG4gKiAgICAgXG4gKiBAY2xhc3MgRW5naW5lXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBFbmdpbmUgPSB7fTtcblxuLyoqXG4gKiBDYWxscyB1cGRhdGUgb24gZWFjaCBvZiB0aGUgY3VycmVudGx5IHJlZ2lzdGVyZWQgc3lzdGVtcy5cbiAqIFxuICogQG1ldGhvZCBzdGVwXG4gKi9cbkVuZ2luZS5zdGVwID0gZnVuY3Rpb24gc3RlcCh0aW1lc3RhbXApIHtcbiAgICBjdXJyZW50UmVsYXRpdmVGcmFtZSArPSBvcHRpb25zLmRpcmVjdGlvbiAqIG9wdGlvbnMuc3BlZWQ7XG4gICAgY3VycmVudEFic29sdXRlRnJhbWUrKztcbiAgICB2YXIgaSA9IHN5c3RlbXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHN5c3RlbXNbaV0udXBkYXRlKHRpbWVzdGFtcCwgY3VycmVudFJlbGF0aXZlRnJhbWUsIGN1cnJlbnRBYnNvbHV0ZUZyYW1lKTsvLyBJIHRvbGQgeW91IHNvXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEEgd3JhcHBlciBhcm91bmQgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHRoYXQgd2lsbCBzdGVwIFxuICogXG4gKiBAbWV0aG9kIGxvb3BcbiAqL1xuRW5naW5lLmxvb3AgPSBmdW5jdGlvbiBsb29wKHRpbWVzdGFtcCkge1xuICAgIGlmIChvcHRpb25zLmxvb3ApIHtcbiAgICAgICAgRW5naW5lLnN0ZXAodGltZXN0YW1wKTtcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKEVuZ2luZS5sb29wKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5mdW5jdGlvbiBfbG9vcEZvcih2YWx1ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbih0aW1lc3RhbXApIHtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBFbmdpbmUuc3RlcCh0aW1lc3RhbXApO1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKF9sb29wRm9yKHZhbHVlIC0gMSkpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuRW5naW5lLmxvb3BGb3IgPSBmdW5jdGlvbiBsb29wRm9yKHZhbHVlKSB7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKF9sb29wRm9yKHZhbHVlKSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEEgd3JhcHBlciBmb3IgdGhlIFwiRE9NQ29udGVudExvYWRlZFwiIGV2ZW50LiAgV2lsbCBleGVjdXRlXG4gKiAgIGEgZ2l2ZW4gZnVuY3Rpb24gb25jZSB0aGUgRE9NIGhhdmUgYmVlbiBsb2FkZWQuXG4gKlxuICogQG1ldGhvZCByZWFkeVxuICogXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gRnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIERPTSBsb2FkaW5nXG4gKi9cbkVuZ2luZS5yZWFkeSA9IGZ1bmN0aW9uIHJlYWR5KGZuKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBsaXN0ZW5lcik7XG4gICAgICAgIGZuKCk7XG4gICAgfTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgbGlzdGVuZXIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBXaWxsIGNyZWF0ZSBhIGJyYW5kIG5ldyBDb250ZXh0LiAgSUYgYSBwYXJlbnQgZWxlbWVudCBpcyBub3QgcHJvdmlkZWQsXG4gKiAgIGl0IGlzIGFzc3VtZWQgdG8gYmUgdGhlIGJvZHkgb2YgdGhlIGRvY3VtZW50LlxuICpcbiAqIEBtZXRob2QgY3JlYXRlQ29udGV4dFxuICogXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnMgT3B0aW9ucyBmb3IgdGhlIENvbnRleHRcbiAqIEByZXR1cm4ge0NvbnRleHR9IG5ldyBDb250ZXh0IGluc3RhbmNlXG4gKi9cbkVuZ2luZS5jcmVhdGVDb250ZXh0ID0gZnVuY3Rpb24gY3JlYXRlQ29udGV4dChvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgZWxlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Iob3B0aW9ucyk7XG4gICAgICAgIGlmICghKGVsZW0gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpIHRocm93IG5ldyBFcnJvcigndGhlIHBhc3NlZCBpbiBzdHJpbmcgc2hvdWxkIGJlIGEgcXVlcnkgc2VsZWN0b3Igd2hpY2ggcmV0dXJucyBhbiBlbGVtZW50IGZyb20gdGhlIGRvbScpO1xuICAgICAgICBlbHNlICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENvbnRleHQoe3BhcmVudEVsOiBlbGVtfSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMgaW5zdGFuY2VvZiBIVE1MRWxlbWVudClcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHtwYXJlbnRFbDogb3B0aW9uc30pO1xuXG4gICAgaWYgKCFvcHRpb25zKVxuICAgICAgICByZXR1cm4gbmV3IENvbnRleHQoe3BhcmVudEVsOiBkb2N1bWVudC5ib2R5fSk7IC8vIFRPRE8gaXQgc2hvdWxkIGJlIHBvc3NpYmxlIHRvIGRlbGF5IGFzc2lnbmluZyBkb2N1bWVudC5ib2R5IHVudGlsIHRoaXMgaGl0cyB0aGUgcmVuZGVyIHN0YWdlLiBUaGlzIHdvdWxkIHJlbW92ZSB0aGUgbmVlZCBmb3IgRW5naW5lLnJlYWR5XG5cbiAgICBpZiAoIW9wdGlvbnMucGFyZW50RWwgJiYgIW9wdGlvbnMuY29udGFpbmVyKVxuICAgICAgICBvcHRpb25zLnBhcmVudEVsID0gZG9jdW1lbnQuYm9keTtcblxuICAgIHJldHVybiBuZXcgQ29udGV4dChvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIHN5c3RlbSB0byB0aGUgbGlzdCBvZiBzeXN0ZW1zIHRvIHVwZGF0ZSBvbiBhIHBlciBmcmFtZSBiYXNpc1xuICpcbiAqIEBtZXRob2QgYWRkU3lzdGVtXG4gKiBcbiAqIEBwYXJhbSB7U3lzdGVtfSBzeXN0ZW0gU3lzdGVtIHRvIGdldCBydW4gZXZlcnkgZnJhbWVcbiAqL1xuRW5naW5lLmFkZFN5c3RlbSA9IGZ1bmN0aW9uIGFkZFN5c3RlbShzeXN0ZW0pIHtcbiAgICBpZiAoc3lzdGVtIGluc3RhbmNlb2YgT2JqZWN0ICYmIHN5c3RlbS51cGRhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICAgICAgcmV0dXJuIHN5c3RlbXMuc3BsaWNlKHN5c3RlbXMuaW5kZXhPZihSZW5kZXJTeXN0ZW0pICsgMSwgMCwgc3lzdGVtKTtcbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcignc3lzdGVtcyBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIGFuIHVwZGF0ZSBtZXRob2QnKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHN5c3RlbSBmcm9tIHRoZSBsaXN0IG9mIHN5c3RlbXMgdG8gdXBkYXRlIG9uIGEgcGVyIGZyYW1lIGJhc2lzXG4gKlxuICogQG1ldGhvZCByZW1vdmVTeXN0ZW1cbiAqIFxuICogQHBhcmFtIHtTeXN0ZW19IHN5c3RlbSBTeXN0ZW0gdG8gZ2V0IHJ1biBldmVyeSBmcmFtZVxuICovXG5FbmdpbmUucmVtb3ZlU3lzdGVtID0gZnVuY3Rpb24gcmVtb3ZlU3lzdGVtKHN5c3RlbSkge1xuICAgIGlmIChzeXN0ZW0gaW5zdGFuY2VvZiBPYmplY3QgJiYgc3lzdGVtLnVwZGF0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHN5c3RlbXMuaW5kZXhPZihzeXN0ZW0pO1xuICAgICAgICBpZiAoaW5kZXggPT09IC0xKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHN5c3RlbXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHRocm93IG5ldyBFcnJvcignc3lzdGVtcyBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIGFuIHVwZGF0ZSBtZXRob2QnKTtcbn07XG5cbi8qKlxuICogRGVsZWdhdGUgdG8gdGhlIG9wdGlvbnNNYW5hZ2VyLlxuICpcbiAqIEBtZXRob2Qgc2V0T3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBPcHRpb25zIHRvIHBhdGNoXG4gKi9cbkVuZ2luZS5zZXRPcHRpb25zID0gb3B0aW9uc01hbmFnZXIuc2V0T3B0aW9ucy5iaW5kKG9wdGlvbnNNYW5hZ2VyKTtcblxuLyoqXG4gKiBTZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgZmxvdyBvZiB0aW1lLlxuICpcbiAqIEBtZXRob2Qgc2V0RGlyZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWwgZGlyZWN0aW9uIGFzIC0xIG9yIDFcbiAqL1xuRW5naW5lLnNldERpcmVjdGlvbiA9IGZ1bmN0aW9uIHNldERpcmVjdGlvbih2YWwpIHtcbiAgICBpZiAodmFsICE9PSAxICYmIHZhbCAhPT0gLTEpIHRocm93IG5ldyBFcnJvcignZGlyZWN0aW9uIG11c3QgYmUgZWl0aGVyIDEgZm9yIGZvcndhcmQgb3IgLTEgZm9yIHJldmVyc2UnKTtcbiAgICBvcHRpb25zTWFuYWdlci5zZXQoJ2RpcmVjdGlvbicsIHZhbCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBmbG93IG9mIHRpbWUuXG4gKlxuICogQG1ldGhvZCBnZXREaXJlY3Rpb25cbiAqIFxuICogQHJldHVybiB7TnVtYmVyfSBkaXJlY3Rpb24gYXMgLTEgb3IgMVxuICovXG5FbmdpbmUuZ2V0RGlyZWN0aW9uID0gZnVuY3Rpb24gZ2V0RGlyZWN0aW9uKCkge1xuICAgIHJldHVybiBvcHRpb25zLmRpcmVjdGlvbjtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzcGVlZCBvZiB0aW1lLlxuICpcbiAqIEBtZXRob2Qgc2V0U3BlZWRcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbCByYXRpbyB0byBodW1hbiB0aW1lXG4gKi9cbkVuZ2luZS5zZXRTcGVlZCA9IGZ1bmN0aW9uIHNldFNwZWVkKHZhbCkge1xuICAgIGlmICh0eXBlb2YgdmFsICE9PSAnbnVtYmVyJykgdGhyb3cgbmV3IEVycm9yKCdzcGVlZCBtdXN0IGJlIGEgbnVtYmVyLCB1c2VkIGFzIGEgc2NhbGUgZmFjdG9yIGZvciB0aGUgbW92ZW1lbnQgb2YgdGltZScpO1xuICAgIG9wdGlvbnNNYW5hZ2VyLnNldCgnc3BlZWQnLCB2YWwpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHNwZWVkIG9mIHRpbWUuXG4gKlxuICogQG1ldGhvZCBnZXRTcGVlZFxuICogXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHZhbCByYXRpbyB0byBodW1hbiB0aW1lXG4gKi9cbkVuZ2luZS5nZXRTcGVlZCA9IGZ1bmN0aW9uIGdldFNwZWVkKCkge1xuICAgIHJldHVybiBvcHRpb25zLnNwZWVkO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgZnJhbWVcbiAqXG4gKiBAbWV0aG9kIGdldEFic29sdXRlRnJhbWVcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBjdXJyZW50IGZyYW1lIG51bWJlclxuICovXG5FbmdpbmUuZ2V0QWJzb2x1dGVGcmFtZSA9IGZ1bmN0aW9uIGdldEFic29sdXRlRnJhbWUoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRBYnNvbHV0ZUZyYW1lO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgZnJhbWUgdGFraW5nIGludG8gYWNjb3VudCBlbmdpbmUgc3BlZWQgYW5kIGRpcmVjdGlvblxuICpcbiAqIEBtZXRob2QgZ2V0UmVsYXRpdmVGcmFtZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGN1cnJlbnQgZnJhbWUgbnVtYmVyIHRha2luZyBpbnRvIGFjY291bnQgRW5naW5lIHNwZWVkIGFuZCBkaXJlY3Rpb25cbiAqL1xuRW5naW5lLmdldFJlbGF0aXZlRnJhbWUgPSBmdW5jdGlvbiBnZXRSZWxhdGl2ZUZyYW1lKCkge1xuICAgIHJldHVybiBjdXJyZW50UmVsYXRpdmVGcmFtZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRW5naW5lO1xuXG4vL1N0YXJ0IHRoZSBsb29wXG5FbmdpbmUucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKEVuZ2luZS5sb29wKTtcbn0pO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKiAgICAgICAgIFxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuL0VudGl0eVJlZ2lzdHJ5JyksXG4gICAgVHJhbnNmb3JtICAgICAgPSByZXF1aXJlKCcuL0NvbXBvbmVudHMvVHJhbnNmb3JtJyksXG4gICAgU2l6ZSAgICAgICAgICAgPSByZXF1aXJlKCcuL0NvbXBvbmVudHMvU2l6ZScpLFxuICAgIE9wYWNpdHkgICAgICAgID0gcmVxdWlyZSgnLi9Db21wb25lbnRzL09wYWNpdHknKTtcblxuLyoqXG4gKiBFbnRpdHkgaXMgdGhlIGNvcmUgb2YgdGhlIEZhbW8udXMgc2NlbmUgZ3JhcGguICBUaGUgc2NlbmUgZ3JhcGhcbiAqICAgaXMgY29uc3RydWN0ZWQgYnkgYWRkaW5nIEVudGl0eXMgdG8gb3RoZXIgRW50aXRpZXMgdG8gZGVmaW5lIGhlaXJhcmNoeS5cbiAqICAgRWFjaCBFbnRpdHkgY29tZXMgd2l0aCBhIFRyYW5zZm9ybSBjb21wb25lbnQgd2l0aCB0aGVcbiAqICAgYWJpbGl0eSB0byBhZGQgaW5maW5pdGUgb3RoZXIgY29tcG9uZW50cy4gIEl0IGFsc28gYWN0cyBhcyBhIGZhY3RvcnkgYnkgY3JlYXRpbmdcbiAqICAgbmV3IEVudGl0aWVzIHRoYXQgd2lsbCBhbHJlYWR5IGJlIGNvbnNpZGVyZWQgaXQncyBjaGlsZHJlbi5cbiAqXG4gKiBAY2xhc3MgRW50aXR5XG4gKiBAZW50aXR5XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRW50aXR5KCkge1xuICAgIEVudGl0eVJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMsICdDb3JlU3lzdGVtJyk7XG5cbiAgICB0aGlzLl9jb21wb25lbnRzID0ge1xuICAgICAgICB0cmFuc2Zvcm0gOiBuZXcgVHJhbnNmb3JtKHRoaXMuX2lkKSxcbiAgICAgICAgc2l6ZSAgICAgIDogbmV3IFNpemUodGhpcy5faWQpLFxuICAgICAgICBvcGFjaXR5ICAgOiBuZXcgT3BhY2l0eSh0aGlzLl9pZClcbiAgICB9O1xuXG4gICAgdGhpcy5fYmVoYXZpb3JzID0gW107XG5cbiAgICB0aGlzLl9wYXJlbnRJRCAgID0gbnVsbDtcbiAgICB0aGlzLl9yb290SUQgICAgID0gbnVsbDtcblxuICAgIHRoaXMuX2NoaWxkcmVuSURzID0gW107XG59XG5cbi8qKlxuICogQWRkcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGNvbXBvbmVudCB0byB0aGUgRW50aXR5LlxuICpcbiAqIEBtZXRob2QgIHJlZ2lzdGVyQ29tcG9uZW50XG4gKiBcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBDb25zdHJ1Y3RvciBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgYSBjb21wb25lbnRcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyBvcHRpb25zIHRvIGJlIHBhc3NlZCBpbnRvIHRoZSBjb25zdHJ1Y3RvclxuICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSBvZiB0aGUgaW5zdGFudGl0YXRlZCBjb21wb25lbnRcbiAqL1xuXG5FbnRpdHkucHJvdG90eXBlLnJlZ2lzdGVyQ29tcG9uZW50ID0gZnVuY3Rpb24gcmVnaXN0ZXJDb21wb25lbnQoQ29uc3RydWN0b3IsIG9wdGlvbnMpIHtcbiAgICBpZiAoIUNvbnN0cnVjdG9yIHx8ICEoQ29uc3RydWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHRocm93IG5ldyBFcnJvcignVGhlIGZpcnN0IGFyZ3VtZW50IHRvIC5yZWdpc3RlckNvbXBvbmVudCBtdXN0IGJlIGEgY29tcG9uZW50IENvbnN0cnVjdG9yIGZ1bmN0aW9uJyk7XG4gICAgaWYgKCFDb25zdHJ1Y3Rvci50b1N0cmluZykgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBwYXNzZWQtaW4gY29tcG9uZW50IENvbnN0cnVjdG9yIG11c3QgaGF2ZSBhIFwidG9TdHJpbmdcIiBtZXRob2QuJyk7XG5cbiAgICB2YXIgY29tcG9uZW50ID0gbmV3IENvbnN0cnVjdG9yKHRoaXMuX2lkLCBvcHRpb25zKTtcbiAgICBpZiAoY29tcG9uZW50LnVwZGF0ZSkgdGhpcy5fYmVoYXZpb3JzLnB1c2goQ29uc3RydWN0b3IudG9TdHJpbmcoKSk7XG4gICAgdGhpcy5fY29tcG9uZW50c1tDb25zdHJ1Y3Rvci50b1N0cmluZygpXSA9IGNvbXBvbmVudDtcbiAgICByZXR1cm4gY29tcG9uZW50O1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgcmVnaXN0ZXJDb21wb25lbnRcbiAqIFxuICogQG1ldGhvZCBhZGRDb21wb25lbnRcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5hZGRDb21wb25lbnQgPSBFbnRpdHkucHJvdG90eXBlLnJlZ2lzdGVyQ29tcG9uZW50O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBjb21wb25lbnQgZnJvbSB0aGUgRW50aXR5LlxuICpcbiAqIEBtZXRob2QgZGVyZWdpc3RlckNvbXBvbmVudFxuICogXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHR5cGUgaWQgb2YgdGhlIGNvbXBvbmVudFxuICogQHJldHVybiB7Qm9vbGVhbn0gc3RhdHVzIG9mIHRoZSByZW1vdmFsXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuZGVyZWdpc3RlckNvbXBvbmVudCA9IGZ1bmN0aW9uIGRlcmVnaXN0ZXJDb21wb25lbnQodHlwZSkge1xuICAgIGlmICh0eXBlb2YgdHlwZSAhPT0gJ3N0cmluZycpIHRocm93IG5ldyBFcnJvcignRW50aXR5LmRlcmVnaXN0ZXJDb21wb25lbnQgbXVzdCBiZSBwYXNzZWQgYSBTdHJpbmcgYXMgdGhlIGZpcnN0IHBhcmFtZXRlcicpO1xuICAgIGlmICh0aGlzLl9jb21wb25lbnRzW3R5cGVdID09PSB1bmRlZmluZWQgfHwgdGhpcy5fY29tcG9uZW50c1t0eXBlXSA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCdubyBjb21wb25lbnQgb2YgdGhhdCB0eXBlJyk7XG5cbiAgICB0aGlzLl9jb21wb25lbnRzW3R5cGVdLmNsZWFudXAgJiYgdGhpcy5fY29tcG9uZW50c1t0eXBlXS5jbGVhbnVwKCk7XG4gICAgdGhpcy5fY29tcG9uZW50c1t0eXBlXSA9IG51bGw7XG5cbiAgICB2YXIgYmVoYXZpb3JJbmRleCA9IHRoaXMuX2JlaGF2aW9ycy5pbmRleE9mKHR5cGUpO1xuICAgIGlmIChiZWhhdmlvckluZGV4ID4gLTEpXG4gICAgICAgIHRoaXMuX2JlaGF2aW9ycy5zcGxpY2UoYmVoYXZpb3JJbmRleCwgMSk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIGRlcmVnaXN0ZXJDb21wb25lbnRcbiAqIFxuICogQG1ldGhvZCByZW1vdmVDb21wb25lbnRcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5yZW1vdmVDb21wb25lbnQgPSBFbnRpdHkucHJvdG90eXBlLmRlcmVnaXN0ZXJDb21wb25lbnQ7XG5cbi8qKlxuICogRmluZCBvdXQgaWYgdGhlIEVudGl0eSBoYXMgYSBjb21wb25lbnQgb2YgYSBjZXJ0YWluIG5hbWUuXG4gKlxuICogQG1ldGhvZCBoYXNDb21wb25lbnRcbiAqIFxuICogQHBhcmFtICB7U3RyaW5nfSB0eXBlIG5hbWUgb2YgdGhlIGNvbXBvbmVudFxuICogQHJldHVybiB7Qm9vbGVhbn0gZXhpc3RhbmNlIG9mIGEgY29tcG9uZW50IGJ5IHRoYXQgbmFtZVxuICovXG5FbnRpdHkucHJvdG90eXBlLmhhc0NvbXBvbmVudCA9IGZ1bmN0aW9uIGhhc0NvbXBvbmVudCh0eXBlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHNbdHlwZV0gIT0gbnVsbDtcbn07XG5cbi8qKlxuICogR2V0IGEgY29tcG9uZW50IGJ5IG5hbWVcbiAqXG4gKiBAbWV0aG9kIGdldENvbXBvbmVudFxuICogXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHR5cGUgbmFtZSBvZiB0aGUgY29tcG9uZW50XG4gKiBAcmV0dXJuIHtPYmplY3R9IGNvbXBvbmVudCBpbnN0YW5jZVxuICovXG5FbnRpdHkucHJvdG90eXBlLmdldENvbXBvbmVudCA9IGZ1bmN0aW9uIGdldENvbXBvbmVudCh0eXBlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHNbdHlwZV07XG59O1xuXG4vKipcbiAqIEdldCBhbGwgb2YgdGhlIEVudGl0eSdzIGNvbXBvbmVudHNcbiAqXG4gKiBAbWV0aG9kIGdldEFsbENvbXBvbmVudHNcbiAqIFxuICogQHJldHVybiB7T2JqZWN0fSBIYXNoIG9mIGFsbCBvZiB0aGUgY29tcG9uZW50cyBpbmRleGVkIGJ5IG5hbWUgXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuZ2V0QWxsQ29tcG9uZW50cyA9IGZ1bmN0aW9uIGdldEFsbENvbXBvbmVudHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHM7XG59O1xuXG4vKipcbiAqIEdldCBhbGwgb2YgdGhlIGNoaWxkIG5vZGVzIGluIHRoZSBzY2VuZSBncmFwaFxuICpcbiAqIEBtZXRob2QgIGdldENoaWxkcmVuXG4gKiBcbiAqIEByZXR1cm4ge0FycmF5fSBjaGlsZCBlbnRpdGllc1xuICovXG5FbnRpdHkucHJvdG90eXBlLmdldENoaWxkcmVuID0gZnVuY3Rpb24gZ2V0Q2hpbGRyZW4oKSB7XG4gICAgdmFyIGRlcmVmZXJlbmNlZENoaWxkcmVuID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NoaWxkcmVuSURzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IEVudGl0eVJlZ2lzdHJ5LmdldEVudGl0eSh0aGlzLl9jaGlsZHJlbklEc1tpXSk7XG4gICAgICAgIGRlcmVmZXJlbmNlZENoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cblxuICAgIHJldHVybiBkZXJlZmVyZW5jZWRDaGlsZHJlbjtcbn07XG5cbkVudGl0eS5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24gZ2V0UGFyZW50KCkge1xuICAgIHJldHVybiBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkodGhpcy5fcGFyZW50SUQpO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGNvbnRleHQgb2YgdGhlIG5vZGUuXG4gKlxuICogQG1ldGhvZCBnZXRDb250ZXh0XG4gKlxuICogQHJldHVybiBDb250ZXh0IE5vZGVcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5nZXRDb250ZXh0ID0gZnVuY3Rpb24gZ2V0Q29udGV4dCgpIHtcbiAgICByZXR1cm4gRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5KHRoaXMuX3Jvb3RJRCk7XG59O1xuXG4vKipcbiAqIEFkZCBhIG5ldyBFbnRpdHkgYXMgYSBjaGlsZCBhbmQgcmV0dXJuIGl0LlxuICpcbiAqIEBtZXRob2QgYWRkQ2hpbGRcbiAqXG4gKiBAcmV0dXJuIHtFbnRpdHl9IGNoaWxkIEVudGl0eVxuICovXG5FbnRpdHkucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24gYWRkQ2hpbGQoZW50aXR5KSB7XG4gICAgaWYgKGVudGl0eSAhPSBudWxsICYmICEoZW50aXR5IGluc3RhbmNlb2YgRW50aXR5KSkgdGhyb3cgbmV3IEVycm9yKCdPbmx5IEVudGl0aWVzIGNhbiBiZSBhZGRlZCBhcyBjaGlsZHJlbiBvZiBvdGhlciBlbnRpdGllcycpO1xuICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgdmFyIGlkID0gZW50aXR5Ll9pZDtcbiAgICAgICAgaWYgKHRoaXMuX2NoaWxkcmVuSURzLmluZGV4T2YoaWQpID4gLTEpIHJldHVybiB2b2lkIDA7XG4gICAgICAgIGlmIChlbnRpdHkuX3BhcmVudElEICE9IG51bGwpIGVudGl0eS5nZXRQYXJlbnQoKS5kZXRhdGNoQ2hpbGQoZW50aXR5KTtcbiAgICAgICAgZW50aXR5Ll9wYXJlbnRJRCA9IHRoaXMuX2lkO1xuICAgICAgICBfdXBkYXRlQ2hpbGRSb290KGVudGl0eSwgdGhpcy5fcm9vdElEKTtcbiAgICAgICAgdGhpcy5fY2hpbGRyZW5JRHMucHVzaChpZCk7XG4gICAgICAgIGVudGl0eS5nZXRDb21wb25lbnQoJ3RyYW5zZm9ybScpLmludmFsaWRhdGlvbnMgfD0gKDEgPDwgMTYpIC0gMTtcbiAgICAgICAgcmV0dXJuIGVudGl0eTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbm9kZSAgICAgICA9IG5ldyBFbnRpdHkoKTtcbiAgICAgICAgbm9kZS5fcGFyZW50SUQgPSB0aGlzLl9pZDtcbiAgICAgICAgbm9kZS5fcm9vdElEICAgPSB0aGlzLl9yb290SUQ7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuSURzLnB1c2gobm9kZS5faWQpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBfdXBkYXRlQ2hpbGRSb290KGNoaWxkLCByb290SUQpIHtcbiAgICBjaGlsZC5fcm9vdElEID0gcm9vdElEO1xuXG4gICAgdmFyIGdyYW5kQ2hpbGRyZW4gPSBjaGlsZC5nZXRDaGlsZHJlbigpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ3JhbmRDaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICBfdXBkYXRlQ2hpbGRSb290KGdyYW5kQ2hpbGRyZW5baV0sIHJvb3RJRClcbiAgICB9XG59XG5cblxuLyoqXG4gKiBSZW1vdmUgYSBFbnRpdHkncyBjaGlsZC5cbiAqXG4gKiBAbWV0aG9kIGRldGF0Y2hDaGlsZFxuICpcbiAqIEByZXR1cm4ge0VudGl0eXx2b2lkIDB9IGNoaWxkIEVudGl0eSBvciB2b2lkIDAgaWYgaXQgaXMgbm90IGEgY2hpbGRcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5kZXRhdGNoQ2hpbGQgPSBmdW5jdGlvbiBkZXRhdGNoQ2hpbGQobm9kZSkge1xuICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBFbnRpdHkpKSB0aHJvdyBuZXcgRXJyb3IoJ0VudGl0eS5kZXRhdGNoQ2hpbGQgb25seSB0YWtlcyBpbiBFbnRpdGllcyBhcyB0aGUgcGFyYW1ldGVyJyk7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fY2hpbGRyZW5JRHMuaW5kZXhPZihub2RlLl9pZCk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgdGhpcy5fY2hpbGRyZW5JRHMuc3BsaWNlKGluZGV4LCAxKVswXTtcbiAgICAgICAgbm9kZS5fcGFyZW50SUQgPSBudWxsO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9IGVsc2UgcmV0dXJuIHZvaWQgMDtcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoaXMgRW50aXR5IGZyb20gdGhlIEVudGl0eVJlZ2lzdHJ5XG4gKlxuICogQG1ldGhvZCBjbGVhbnVwXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuY2xlYW51cCA9IGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgRW50aXR5UmVnaXN0cnkuY2xlYW51cCh0aGlzKTtcbn07XG5cbi8qKlxuICogVXBkYXRlIGFsbCBvZiB0aGUgY3VzdG9tIGNvbXBvbmVudHMgb24gdGhlIEVudGl0eVxuICogXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICovXG5FbnRpdHkucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgaSA9IHRoaXMuX2JlaGF2aW9ycy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKVxuICAgICAgICB0aGlzLl9jb21wb25lbnRzW3RoaXMuX2JlaGF2aW9yc1tpXV0udXBkYXRlKHRoaXMpO1xufTtcblxuXG52YXIgZW1wdHlWZWN0b3IgPSBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSk7XG5cbmZ1bmN0aW9uIF9nZXRTaXplKGVudGl0eSwgcmVzdWx0KSB7XG4gICAgdmFyIGkgICAgICA9IGVudGl0eS5fY2hpbGRyZW5JRHMubGVuZ3RoLFxuICAgICAgICBtYXRyaXggPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCd0cmFuc2Zvcm0nKS5fbWF0cml4O1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB2YXIgY2hpbGQgPSBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkoZW50aXR5Ll9jaGlsZHJlbklEc1tpXSk7XG4gICAgICAgIF9nZXRTaXplKGNoaWxkLCByZXN1bHQpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBlbnRpdHkuX2NvbXBvbmVudHMpXG4gICAgICAgIGlmIChlbnRpdHkuX2NvbXBvbmVudHNba2V5XS5nZXRTaXplKSB7XG5cbiAgICAgICAgICAgIHZhciBzaXplICAgPSBlbnRpdHkuX2NvbXBvbmVudHNba2V5XS5nZXRTaXplKCksXG4gICAgICAgICAgICAgICAgcmlnaHQgID0gc2l6ZS5kaXNwbGFjZW1lbnQucmlnaHQgICsgc2l6ZS5vcmlnaW5bMF0gLSByZXN1bHQub3JpZ2luWzBdLFxuICAgICAgICAgICAgICAgIGJvdHRvbSA9IHNpemUuZGlzcGxhY2VtZW50LmJvdHRvbSArIHNpemUub3JpZ2luWzFdIC0gcmVzdWx0Lm9yaWdpblsxXSxcbiAgICAgICAgICAgICAgICBuZWFyICAgPSBzaXplLmRpc3BsYWNlbWVudC5uZWFyICAgKyBzaXplLm9yaWdpblsyXSAtIHJlc3VsdC5vcmlnaW5bMl0sXG4gICAgICAgICAgICAgICAgbGVmdCAgID0gc2l6ZS5kaXNwbGFjZW1lbnQubGVmdCAgICsgc2l6ZS5vcmlnaW5bMF0gLSByZXN1bHQub3JpZ2luWzBdLFxuICAgICAgICAgICAgICAgIHRvcCAgICA9IHNpemUuZGlzcGxhY2VtZW50LnRvcCAgICArIHNpemUub3JpZ2luWzFdIC0gcmVzdWx0Lm9yaWdpblsxXSxcbiAgICAgICAgICAgICAgICBmYXIgICAgPSBzaXplLmRpc3BsYWNlbWVudC5mYXIgICAgKyBzaXplLm9yaWdpblsyXSAtIHJlc3VsdC5vcmlnaW5bMl07XG5cbiAgICAgICAgICAgIGlmIChyaWdodCAgPiByZXN1bHQuZGlzcGxhY2VtZW50LnJpZ2h0KSAgcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCAgPSByaWdodDtcbiAgICAgICAgICAgIGlmIChib3R0b20gPiByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSkgcmVzdWx0LmRpc3BsYWNlbWVudC5ib3R0b20gPSBib3R0b207XG4gICAgICAgICAgICBpZiAobmVhciAgID4gcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyKSAgIHJlc3VsdC5kaXNwbGFjZW1lbnQubmVhciAgID0gbmVhcjtcbiAgICAgICAgICAgIGlmIChsZWZ0ICAgPCByZXN1bHQuZGlzcGxhY2VtZW50LmxlZnQpICAgcmVzdWx0LmRpc3BsYWNlbWVudC5sZWZ0ICAgPSBsZWZ0O1xuICAgICAgICAgICAgaWYgKHRvcCAgICA8IHJlc3VsdC5kaXNwbGFjZW1lbnQudG9wKSAgICByZXN1bHQuZGlzcGxhY2VtZW50LnRvcCAgICA9IHRvcDtcbiAgICAgICAgICAgIGlmIChmYXIgICAgPCByZXN1bHQuZGlzcGxhY2VtZW50LmZhcikgICAgcmVzdWx0LmRpc3BsYWNlbWVudC5mYXIgICAgPSBmYXI7XG4gICAgICAgIH1cblxuICAgIHZhciB4ID0gbWF0cml4WzEyXSAtIHJlc3VsdC5vcmlnaW5bMF0sIHkgPSBtYXRyaXhbMTNdIC0gcmVzdWx0Lm9yaWdpblsxXSwgeiA9IG1hdHJpeFsxNF0gLSByZXN1bHQub3JpZ2luWzJdO1xuICAgIGlmICh4ID4gcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCkgIHJlc3VsdC5kaXNwbGFjZW1lbnQucmlnaHQgID0geDtcbiAgICBpZiAoeCA8IHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCkgICByZXN1bHQuZGlzcGxhY2VtZW50LmxlZnQgICA9IHg7XG4gICAgaWYgKHkgPiByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSkgcmVzdWx0LmRpc3BsYWNlbWVudC5ib3R0b20gPSB5O1xuICAgIGlmICh5IDwgcmVzdWx0LmRpc3BsYWNlbWVudC50b3ApICAgIHJlc3VsdC5kaXNwbGFjZW1lbnQudG9wICAgID0geTtcbiAgICBpZiAoeiA+IHJlc3VsdC5kaXNwbGFjZW1lbnQubmVhcikgICByZXN1bHQuZGlzcGxhY2VtZW50Lm5lYXIgICA9IHo7XG4gICAgaWYgKHogPCByZXN1bHQuZGlzcGxhY2VtZW50LmZhcikgICAgcmVzdWx0LmRpc3BsYWNlbWVudC5mYXIgICAgPSB6O1xufVxuXG5FbnRpdHkucHJvdG90eXBlLmdldFNpemUgPSBmdW5jdGlvbiBnZXRTaXplKCkge1xuICAgIHZhciBtYXRyaXggPSB0aGlzLmdldENvbXBvbmVudCgndHJhbnNmb3JtJykuX21hdHJpeCxcbiAgICAgICAgaSAgICAgID0gdGhpcy5fY2hpbGRyZW5JRHMubGVuZ3RoLFxuICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICBkaXNwbGFjZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICByaWdodCAgOiAwLFxuICAgICAgICAgICAgICAgIGJvdHRvbSA6IDAsXG4gICAgICAgICAgICAgICAgbmVhciAgIDogMCxcbiAgICAgICAgICAgICAgICBsZWZ0ICAgOiAwLFxuICAgICAgICAgICAgICAgIHRvcCAgICA6IDAsXG4gICAgICAgICAgICAgICAgZmFyICAgIDogMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9yaWdpbjogW21hdHJpeFsxMl0sIG1hdHJpeFsxM10sIG1hdHJpeFsxNF1dXG4gICAgfTtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgdmFyIGNoaWxkID0gRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5KHRoaXMuX2NoaWxkcmVuSURzW2ldKTtcbiAgICAgICAgX2dldFNpemUoY2hpbGQsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJlc3VsdC5zaXplID0gW3Jlc3VsdC5kaXNwbGFjZW1lbnQucmlnaHQgLSByZXN1bHQuZGlzcGxhY2VtZW50LmxlZnQsIHJlc3VsdC5kaXNwbGFjZW1lbnQuYm90dG9tIC0gcmVzdWx0LmRpc3BsYWNlbWVudC50b3AsIHJlc3VsdC5kaXNwbGFjZW1lbnQubmVhciAtIHJlc3VsdC5kaXNwbGFjZW1lbnQuZmFyXTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbnRpdHk7XG4iLCJ2YXIgRW50aXR5ICAgICAgID0gcmVxdWlyZSgnLi9FbnRpdHknKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuLi9ldmVudHMvRXZlbnRFbWl0dGVyJyk7XG5cbmZ1bmN0aW9uIEVudGl0eUNvbGxlY3Rpb24obnVtKSB7XG4gICAgdGhpcy5lbnRpdGllcyA9IFtdO1xuXG4gICAgdGhpcy5JTyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbGVuZ3RoJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVudGl0aWVzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHR5cGVvZiBudW0gPT09ICdudW1iZXInKSB3aGlsZSAobnVtLS0pIHRoaXMucHVzaChuZXcgRW50aXR5KCkpO1xuICAgIGVsc2UgaWYgKG51bSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIHZhciBpICAgPSAtMSxcbiAgICAgICAgICAgIGxlbiA9IG51bS5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChsZW4gLSArK2kpIHRoaXMucHVzaChudW1baV0pO1xuICAgIH1cbn1cblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIHB1c2goZW50aXR5KSB7XG4gICAgaWYgKGVudGl0eSBpbnN0YW5jZW9mIEVudGl0eSkge1xuICAgICAgICB0aGlzLmVudGl0aWVzLnB1c2goZW50aXR5KTtcbiAgICAgICAgdGhpcy5JTy5lbWl0KCdlbnRpdHlBZGRlZCcsIGVudGl0eSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2VudGl0eSBjb2xsZWN0aW9ucyBjYW4gb25seSBoYXZlIGVudGl0aWVzIGFkZGVkIHRvIHRoZW0nKTtcbn07XG5cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLnBvcCA9IGZ1bmN0aW9uIHBvcCgpIHtcbiAgICB2YXIgZW50aXR5ID0gdGhpcy5lbnRpdGllcy5wb3AoKTtcbiAgICB0aGlzLklPLmVtaXQoJ2VudGl0eVJlbW92ZWQnLCBlbnRpdHkpO1xuICAgIHJldHVybiBlbnRpdHk7XG59O1xuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5zaGlmdCA9IGZ1bmN0aW9uIHNoaWZ0KCkge1xuICAgIHZhciBlbnRpdHkgPSB0aGlzLmVudGl0aWVzLnNoaWZ0KCk7XG4gICAgdGhpcy5JTy5lbWl0KCdlbnRpdHlSZW1vdmVkJywgZW50aXR5KTtcbiAgICByZXR1cm4gZW50aXR5O1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uIHVuc2hpZnQoZW50aXR5KSB7XG4gICAgaWYgKGVudGl0eSBpbnN0YW5jZW9mIEVudGl0eSkge1xuICAgICAgICB0aGlzLmVudGl0aWVzLnNoaWZ0KGVudGl0eSk7XG4gICAgICAgIHRoaXMuSU8uZW1pdCgnZW50aXR5QWRkZWQnLCBlbnRpdHkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKCdlbnRpdHkgY29sbGVjdGlvbnMgY2FuIG9ubHkgaGF2ZSBlbnRpdGllcyBhZGRlZCB0byB0aGVtJyk7XG59O1xuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5zcGxpY2UgPSBmdW5jdGlvbiBzcGxpY2UoaW5kZXgsIGhvd01hbnksIGVsZW1lbnRzKSB7XG4gICAgdmFyIGksIGxlbjtcbiAgICBpZiAoZWxlbWVudHMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBpICAgPSAtMSxcbiAgICAgICAgbGVuID0gZWxlbWVudHMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAobGVuIC0gKytpKSB7XG4gICAgICAgICAgICBpZiAoIShlbGVtZW50c1tpXSBpbnN0YW5jZW9mIEVudGl0eSkpIHRocm93IG5ldyBFcnJvcignZW50aXR5IGNvbGxlY3Rpb25zIGNhbiBvbmx5IGhhdmUgZW50aXRpZXMgYWRkZWQgdG8gdGhlbScpO1xuICAgICAgICAgICAgdGhpcy5lbnRpdGllcy5zcGxpY2UoaW5kZXggKyBob3dNYW55LCAwLCBlbGVtZW50c1tpXSk7XG4gICAgICAgICAgICB0aGlzLklPLmVtaXQoJ2VudGl0eUFkZGVkJywgZWxlbWVudHNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChlbGVtZW50cyBpbnN0YW5jZW9mIEVudGl0eSkge1xuICAgICAgICB0aGlzLmVudGl0aWVzLnNwbGljZShpbmRleCArIGhvd01hbnksIDAsIGVsZW1lbnRzKTtcbiAgICAgICAgdGhpcy5JTy5lbWl0KCdlbnRpdHlBZGRlZCcsIGVsZW1lbnRzKTtcbiAgICB9XG4gICAgaWYgKGVsZW1lbnRzIGluc3RhbmNlb2YgRW50aXR5Q29sbGVjdGlvbikge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICAgICAgc2VsZi5lbnRpdGllcy5zcGxpY2UoaW5kZXggKyBob3dNYW55LCAwLCBlbGVtZW50KTtcbiAgICAgICAgICAgIHNlbGYuSU8uZW1pdCgnZW50aXR5QWRkZWQnLCBlbGVtZW50cyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZlZCA9IHRoaXMuZW50aXRpZXMuc3BsaWNlKGluZGV4LCBob3dNYW55KTtcbiAgICBpICAgICAgICAgICA9IC0xO1xuICAgIGxlbiAgICAgICAgID0gcmVtb3ZlZC5sZW5ndGg7XG4gICAgd2hpbGUgKGxlbiAtICsraSkgdGhpcy5JTy5lbWl0KCdlbnRpdHkgcmVtb3ZlZCcsIHJlbW92ZWRbaV0pO1xuICAgIHJldHVybiByZW1vdmVkO1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSgpIHtcbiAgICB2YXIgaSAgICAgID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IHRoaXMuZW50aXRpZXMubGVuZ3RoLFxuICAgICAgICByZXN1bHQgPSBuZXcgRW50aXR5Q29sbGVjdGlvbigwKTtcblxuICAgIHdoaWxlIChsZW5ndGggLSArK2kpIHJlc3VsdC5wdXNoKHRoaXMuZW50aXRpZXNbaV0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIGZpbHRlcihmbikge1xuICAgIHZhciBpICAgICAgPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gdGhpcy5lbnRpdGllcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IG5ldyBFbnRpdHlDb2xsZWN0aW9uKDApO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdFbnRpdHlDb2xsZWN0aW9uLmZpbHRlciBvbmx5IGFjY2VwdHMgZnVuY3Rpb25zIGFzIGEgcGFyYW1ldGVyJyk7XG5cbiAgICB3aGlsZSAobGVuZ3RoIC0gKytpKSBpZiAoZm4odGhpcy5lbnRpdGllc1tpXSwgaSwgdGhpcy5lbnRpdGllcykpIHJlc3VsdC5wdXNoKHRoaXMuZW50aXRpZXNbaV0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLnJlamVjdCA9IGZ1bmN0aW9uIHJlamVjdChmbikge1xuICAgIHZhciBpICAgICAgPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gdGhpcy5lbnRpdGllcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IG5ldyBFbnRpdHlDb2xsZWN0aW9uKDApO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdFbnRpdHlDb2xsZWN0aW9uLnJlamVjdCBvbmx5IGFjY2VwdHMgZnVuY3Rpb25zIGFzIGEgcGFyYW1ldGVyJyk7XG5cbiAgICB3aGlsZSAobGVuZ3RoIC0gKytpKSBpZiAoIWZuKHRoaXMuZW50aXRpZXNbaV0sIGksIHRoaXMuZW50aXRpZXMpKSByZXN1bHQucHVzaCh0aGlzLmVudGl0aWVzW2ldKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEV4ZWN1dGUgYSBmdW5jdGlvbiB0aGF0IGl0ZXJhdGVzIG92ZXIgdGhlIGNvbGxlY3Rpb25cbiAqICBvZiBFbnRpdGllcyBhbmQgY2FsbHMgYSBmdW5jdGlvbiB3aGVyZSB0aGUgcGFyYW1ldGVyc1xuICogIGFyZSwgdGhlIEVudGl0eSwgaW5kZXgsIGFuZCBmdWxsIGNvbGxlY3Rpb24gb2YgRW50aXRpZXMuXG4gKlxuICogQG1ldGhvZCBmb3JFYWNoXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0aW9uIHRvIGJlIHJ1biBwZXIgRW50aXR5XG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoKGZuKSB7XG4gICAgdmFyIGkgICAgICA9IC0xLFxuICAgICAgICBsZW5ndGggPSB0aGlzLmVudGl0aWVzLmxlbmd0aDtcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignRW50aXR5Q29sbGVjdGlvbi5mb3JFYWNoIG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYXMgYSBwYXJhbWV0ZXInKTtcblxuICAgIHdoaWxlIChsZW5ndGggLSArK2kpIGZuKHRoaXMuZW50aXRpZXNbaV0sIGksIHRoaXMuZW50aXRpZXMpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbXBsZW1lbnRzIHJlZHVjZSBvbiB0aGUgY29sbGVjdGlvbiBvZiBFbnRpdGllc1xuICpcbiAqIEBtZXRob2QgcmVkdWNlXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0aW9uIHRvIGJlIHJ1biBwZXIgRW50aXR5XG4gKiBAcGFyYW0geyp9IGluaXRpYWxWYWx1ZSBpbml0aWFsIHZhbHVlIG9mIHRoZSByZWR1Y2UgZnVuY3Rpb25cbiAqIFxuICogQHJldHVybiB7Kn0gdmFsdWUgYWZ0ZXIgZWFjaCBFbnRpdHkgaGFzIGhhZCB0aGUgZnVuY3Rpb24gcnVuXG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLnJlZHVjZSA9IGZ1bmN0aW9uIHJlZHVjZShmbiwgaW5pdGlhbFZhbHVlKSB7XG4gICAgdmFyIGkgICAgICA9IC0xLFxuICAgICAgICBsZW5ndGggPSB0aGlzLmVudGl0aWVzLmxlbmd0aCxcbiAgICAgICAgYWNjdW11bGF0b3I7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ0VudGl0eUNvbGxlY3Rpb24ucmVkdWNlIG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYXMgYSBwYXJhbWV0ZXInKTtcblxuICAgIGlmIChpbml0aWFsVmFsdWUgIT0gbnVsbCkgYWNjdW11bGF0b3IgPSBpbml0aWFsVmFsdWU7XG4gICAgZWxzZSAgICAgICAgICAgICAgICAgICAgICBhY2N1bXVsYXRvciA9IHRoaXMuZW50aXRpZXNbKytpXTtcbiAgICB3aGlsZSAobGVuZ3RoIC0gKytpKSAgICAgIGFjY3VtdWxhdG9yID0gZm4oYWNjdW11bGF0b3IsIHRoaXMuZW50aXRpZXNbaV0sIGksIHRoaXMuZW50aXRpZXMpO1xuXG4gICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xufTtcblxuLyoqXG4gKiBJbXBsZW1lbnRzIG1hcCBvbiB0aGUgY29sbGVjdGlvbiBvZiBFbnRpdGllc1xuICpcbiAqIEBtZXRob2QgbWFwXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0aW9uIHRvIGJlIHJ1biBwZXIgRW50aXR5XG4gKlxuICogQHJldHVybiB7QXJyYXl9IGFycmF5IG9mIHRoZSByZXR1cm4gdmFsdWVzIG9mIHRoZSBtYXBwaW5nIGZ1bmN0aW9uXG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIG1hcChmbikge1xuICAgIHZhciBpICAgICAgPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gdGhpcy5lbnRpdGllcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IFtdO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdFbnRpdHlDb2xsZWN0aW9uLm1hcCBvbmx5IGFjY2VwdHMgZnVuY3Rpb25zIGFzIGEgcGFyYW1ldGVyJyk7XG5cbiAgICB3aGlsZSAobGVuZ3RoIC0gKytpKSByZXN1bHQucHVzaChmbih0aGlzLmVudGl0aWVzW2ldLCBpLCB0aGlzLmVudGl0aWVzKSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBEZWxlZ2F0ZXMgdG8gdGhlIEV2ZW50SGFuZGxlcnMgXCJvblwiXG4gKlxuICogQG1ldGhvZCBvblxuICovXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKCkge1xuICAgIHJldHVybiB0aGlzLklPLm9uLmFwcGx5KHRoaXMuSU8sIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIERlbGVnYXRlcyB0byB0aGUgRXZlbnRIYW5kbGVycyBcIm9uXCJcbiAqXG4gKiBAbWV0aG9kIG9mZlxuICovXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiBvZmYoKSB7XG4gICAgcmV0dXJuIHRoaXMuSU8ucmVtb3ZlTGlzdGVuZXIuYXBwbHkodGhpcy5JTywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogRmluZCB3aGVyZSBhbmQgaWYgYW4gRW50aXR5IGlzIGluIHRoZSBhcnJheVxuICpcbiAqIEBtZXRob2QgaW5kZXhPZlxuICogXG4gKiBAcmVzdWx0IHtOdW1iZXJ9IGluZGV4IG9mIEVudGl0eSBpbiB0aGUgYXJyYXlcbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YoKSB7XG4gICAgcmV0dXJuIHRoaXMuZW50aXRpZXMuaW5kZXhPZi5hcHBseSh0aGlzLmVudGl0aWVzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFuZCBlbnRpdHkgZnJvbSB0aGUgYXJyYXkgYW5kIGVtaXRzIGEgbWVzc2FnZVxuICpcbiAqIEBtZXRob2QgcmVtb3ZlXG4gKiBcbiAqIEByZXN1bHQge0VudGl0eX0gcmVtb3ZlZCBFbnRpdHlcbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKGVudGl0eSkge1xuICAgIHZhciBpbmRleCA9IHRoaXMuZW50aXRpZXMuaW5kZXhPZihlbnRpdHkpO1xuICAgIHRoaXMuSU8uZW1pdCgnZW50aXR5IHJlbW92ZWQnLCBlbnRpdHkpO1xuICAgIGlmIChpbmRleCA8IDApIHJldHVybiBmYWxzZTtcbiAgICBlbHNlICAgICAgICAgICByZXR1cm4gdGhpcy5lbnRpdGllcy5zcGxpY2UoaW5kZXgsIDEpWzBdO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIEVudGl0eSBhcmUgYSBwYXJ0aWN1bGFyIGluZGV4XG4gKlxuICogQG1ldGhvZCBnZXRcbiAqIFxuICogQHJlc3VsdCB7RW50aXR5fSBFbnRpdHkgYXQgdGhhdCBpbmRleFxuICovXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQoaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5lbnRpdGllc1tpbmRleF07XG59O1xuXG4vKipcbiAqIEZpbmQgb2YgaWYgdGhlIEVudGl0eUNvbGxlY3Rpb24gaGFzIGFuIEVudGl0eVxuICpcbiAqIEBtZXRob2QgaGFzXG4gKiBcbiAqIEByZXN1bHQge0Jvb2xlYW59IGV4aXN0ZW5jZSBvZiB0aGUgRW50aXR5IGluIHRoZSBFbnRpdHlDb2xsZWN0aW9uXG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIGhhcyhlbnRpdHkpIHtcbiAgICByZXR1cm4gdGhpcy5lbnRpdGllcy5pbmRleE9mKGVudGl0eSkgIT09IC0xO1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucmV2ZXJzZSA9IGZ1bmN0aW9uIHJldmVyc2UoKSB7XG4gICAgdmFyIGkgICAgICA9IHRoaXMuZW50aXRpZXMubGVuZ3RoO1xuICAgICAgICByZXN1bHQgPSBuZXcgRW50aXR5Q29sbGVjdGlvbigwKTtcblxuICAgIHdoaWxlIChpLS0pIHJlc3VsdC5wdXNoKHRoaXMuZW50aXRpZXNbaV0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5mdW5jdGlvbiBfbWVyZ2UobGVmdCwgcmlnaHQsIGFyciwgY29tcGFyaXNvbikge1xuICAgIHZhciBhID0gMDtcbiAgICB3aGlsZSAobGVmdC5sZW5ndGggJiYgcmlnaHQubGVuZ3RoKSBhcnJbYSsrXSA9IGNvbXBhcmlzb24obGVmdFswXSwgcmlnaHRbMF0pIDwgMCA/IGxlZnQuc2hpZnQoKSA6IHJpZ2h0LnNoaWZ0KCk7XG4gICAgd2hpbGUgKGxlZnQubGVuZ3RoKSBhcnJbYSsrXSA9IGxlZnQuc2hpZnQoKTtcbiAgICB3aGlsZSAocmlnaHQubGVuZ3RoKSBhcnJbYSsrXSA9IHJpZ2h0LnNoaWZ0KCk7XG59XG5cbmZ1bmN0aW9uIF9tU29ydChhcnIsIHRtcCwgbCwgY29tcGFyaXNvbikge1xuICAgIGlmIChsPT09MSkgcmV0dXJuO1xuICAgIHZhciBtID0gKGwvMil8MCxcbiAgICAgICAgdG1wX2wgPSB0bXAuc2xpY2UoMCwgbSksXG4gICAgICAgIHRtcF9yID0gdG1wLnNsaWNlKG0pO1xuICAgIF9tU29ydCh0bXBfbCwgYXJyLnNsaWNlKDAsIG0pLCAgbSwgY29tcGFyaXNvbik7XG4gICAgX21Tb3J0KHRtcF9yLCBhcnIuc2xpY2UobSksIGwgLSBtLCBjb21wYXJpc29uKTtcbiAgICBfbWVyZ2UodG1wX2wsIHRtcF9yLCBhcnIsIGNvbXBhcmlzb24pO1xuICAgIHJldHVybiBhcnI7XG59XG5cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLnNvcnQgPSBmdW5jdGlvbiBzb3J0KGNvbXBhcmlzb24pIHtcbiAgICByZXR1cm4gbmV3IEVudGl0eUNvbGxlY3Rpb24oX21Tb3J0KHRoaXMuZW50aXRpZXMuc2xpY2UoKSwgdGhpcy5lbnRpdGllcy5zbGljZSgpLCB0aGlzLmVudGl0aWVzLmxlbmd0aCwgY29tcGFyaXNvbikpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbnRpdHlDb2xsZWN0aW9uOyIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEVudGl0eUNvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0VudGl0eUNvbGxlY3Rpb24nKTtcblxuLy8gTWFwIG9mIGFuIEVudGl0eSdzIHBvc2l0aW9uIGluIGEgRW50aXR5Q29sbGVjdGlvblxudmFyIGVudGl0aWVzID0gW107XG5cbi8vIFN0b3JhZ2Ugb2YgRW50aXR5IGFycmF5c1xudmFyIGVudGl0eUNvbGxlY3Rpb25zID0ge1xuICAgIGV2ZXJ5dGhpbmc6IG5ldyBFbnRpdHlDb2xsZWN0aW9uKClcbn07XG5cbi8vIFBvb2wgb2YgZnJlZSBzcGFjZXMgaW4gdGhlIGVudGl0ZXMgYXJyYXlcbnZhciBmcmVlZCA9IFtdO1xuXG4vKipcbiAqIEEgc2luZ2xldG9uIG9iamVjdCB0aGF0IG1hbmFnZXMgdGhlIEVudGl0eSByZWZlcmVuY2Ugc3lzdGVtLlxuICogICBFbnRpdGllcyBjYW4gYmUgcGFydCBvZiBtYW55IEVudGl0eUNvbGxlY3Rpb25zIGRlcGVuZGluZyBvbiBpbXBsZW1lbnRhdGlvbi5cbiAqICAgXG4gKiBAY2xhc3MgRW50aXR5UmVnaXN0cnlcbiAqIEBzaW5nbGV0b25cbiAqL1xudmFyIEVudGl0eVJlZ2lzdHJ5ID0gbW9kdWxlLmV4cG9ydHM7XG5cbi8qKlxuICogQWRkcyBhIG5ldyBFbnRpdHlDb2xsZWN0aW9uIGtleSB0byB0aGUgZW50aXR5Q29sbGVjdGlvbnMgb2JqZWN0LlxuICpcbiAqIEBtZXRob2QgIGFkZENvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gbmFtZSBvZiB0aGUgRW50aXR5Q29sbGVjdGlvblxuICogQHJldHVybiB7RW50aXR5Q29sbGVjdGlvbn0gdGhlIEVudGl0eUNvbGxlY3Rpb24gYWRkZWRcbiAqL1xuRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIGFkZENvbGxlY3Rpb24oY29sbGVjdGlvbikge1xuICAgIGlmICghY29sbGVjdGlvbikgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignLmFkZENvbGxlY3Rpb24gbmVlZHMgdG8gaGF2ZSBhIG5hbWUgc3BlY2lmaWVkJyk7XG4gICAgaWYgKHR5cGVvZiBjb2xsZWN0aW9uICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCcuYWRkQ29sbGVjdGlvbiBjYW4gb25seSB0YWtlIGEgc3RyaW5nIGFzIGFuIGFyZ3VtZW50Jyk7XG4gICAgaWYgKCFlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXSkgZW50aXR5Q29sbGVjdGlvbnNbY29sbGVjdGlvbl0gPSBuZXcgRW50aXR5Q29sbGVjdGlvbigpO1xuICAgIHJldHVybiBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBFbnRpdHlDb2xsZWN0aW9uIGJ5IG5hbWUuXG4gKlxuICogQG1ldGhvZCAgZ2V0Q29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIHRoZSBFbnRpdHlDb2xsZWN0aW9uXG4gKiBAcmV0dXJuIHtFbnRpdHlDb2xsZWN0aW9ufHVuZGVmaW5lZH0gRW50aXR5Q29sbGVjdGlvbiByZWZlcmVuY2VkIGJ5IGEgcGFydGljdWxhciBuYW1lXG4gKi9cbkVudGl0eVJlZ2lzdHJ5LmdldENvbGxlY3Rpb24gPSBmdW5jdGlvbiBnZXRDb2xsZWN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICByZXR1cm4gZW50aXR5Q29sbGVjdGlvbnNbY29sbGVjdGlvbl07XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBwYXJ0aWN1bGFyIEVudGl0eUNvbGxlY3Rpb24gZnJvbSB0aGUgcmVnaXN0cnlcbiAqXG4gKiBAbWV0aG9kICByZW1vdmVDb2xsZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uIG5hbWUgb2YgdGhlIEVudGl0eUNvbGxlY3Rpb24gdG8gcmVtb3ZlXG4gKiBAcmV0dXJuIHtFbnRpdHlDb2xsZWN0aW9ufSBFbnRpdHlDb2xsZWN0aW9uIHRoYXQgd2FzIHJlbW92ZWRcbiAqL1xuRW50aXR5UmVnaXN0cnkucmVtb3ZlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIHJlbW92ZUNvbGxlY3Rpb24oY29sbGVjdGlvbikge1xuICAgIGlmICghY29sbGVjdGlvbikgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignLnJlbW92ZUNvbGxlY3Rpb24gbmVlZHMgdG8gaGF2ZSBhIGNvbGxlY3Rpb24gc3BlY2lmaWVkJyk7XG4gICAgaWYgKHR5cGVvZiBjb2xsZWN0aW9uICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCcucmVtb3ZlQ29sbGVjdGlvbiBjYW4gb25seSB0YWtlIGEgc3RyaW5nIGFzIGFuIGFyZ3VtZW50Jyk7XG5cbiAgICB2YXIgY3VyckNvbGxlY3Rpb24gPSBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXTtcbiAgICBpZiAoIWN1cnJDb2xsZWN0aW9uKSByZXR1cm4gZmFsc2U7XG5cbiAgICB2YXIgaSA9IGN1cnJDb2xsZWN0aW9uLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSBkZWxldGUgZW50aXRpZXNbY3VyckNvbGxlY3Rpb24uZ2V0KGkpLl9pZF1bY29sbGVjdGlvbl07XG5cbiAgICBkZWxldGUgZW50aXR5Q29sbGVjdGlvbnNbY29sbGVjdGlvbl07XG4gICAgcmV0dXJuIGN1cnJDb2xsZWN0aW9uO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGVudGl0eSB0byBhIHBhcnRpY3VsYXIgY29sbGVjdGlvbi5cbiAqXG4gKiBAbWV0aG9kIHJlZ2lzdGVyXG4gKiBcbiAqIEBwYXJhbSAge0VudGl0eX0gaW5zdGFuY2Ugb2YgYW4gRW50aXR5XG4gKiBAcGFyYW0gIHtTdHJpbmd9IGNvbGxlY3Rpb24gbmFtZSBvZiB0aGUgRW50aXR5Q29sbGVjdGlvbiB0byByZWdpc3RlciB0aGUgZW50aXR5IHRvXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGlkIG9mIHRoZSBFbnRpdHlcbiAqL1xuRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIgPSBmdW5jdGlvbiByZWdpc3RlcihlbnRpdHksIGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgaWRNYXA7XG4gICAgaWYgKGVudGl0eS5faWQgPT0gbnVsbCkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZW50aXR5LCAnX2lkJywge1xuICAgICAgICAgICAgdmFsdWUgICAgICAgIDogRW50aXR5UmVnaXN0cnkuZ2V0TmV3SUQoKSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBpZCA9IGVudGl0eS5faWQ7XG4gICAgaWYgKGVudGl0aWVzW2lkXSkge1xuICAgICAgICBpZE1hcCA9IGVudGl0aWVzW2lkXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlkTWFwID0ge2V2ZXJ5dGhpbmc6IGVudGl0eUNvbGxlY3Rpb25zLmV2ZXJ5dGhpbmcubGVuZ3RofTtcbiAgICAgICAgZW50aXR5Q29sbGVjdGlvbnMuZXZlcnl0aGluZy5wdXNoKGVudGl0eSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb24pIHtcbiAgICAgICAgaWYgKCFlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXSkgRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbihjb2xsZWN0aW9uKTtcbiAgICAgICAgaWRNYXBbY29sbGVjdGlvbl0gPSBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXS5sZW5ndGg7XG4gICAgICAgIGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dLnB1c2goZW50aXR5KTtcbiAgICB9XG5cbiAgICBpZiAoIWVudGl0aWVzW2lkXSkgZW50aXRpZXNbaWRdID0gaWRNYXA7XG4gICAgcmV0dXJuIGlkO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFuIGVudGl0eSBmcm9tIGEgRW50aXR5Q29sbGVjdGlvblxuICpcbiAqIEBtZXRob2QgIGRlcmVnaXN0ZXJcbiAqIFxuICogQHBhcmFtICB7RW50aXR5fSBlbnRpdHkgaW5zdGFuY2Ugb2YgYW4gRW50aXR5XG4gKiBAcGFyYW0gIHtTdHJpbmd9IGNvbGxlY3Rpb24gbmFtZSBvZiBFbnRpdHlDb2xsZWN0aW9uIHRvIHJlbW92ZSB0aGUgRW50aXR5IGZyb21cbiAqIEByZXR1cm4ge0Jvb2xlYW19IHN0YXR1cyBvZiB0aGUgcmVtb3ZhbFxuICovXG5FbnRpdHlSZWdpc3RyeS5kZXJlZ2lzdGVyID0gZnVuY3Rpb24gZGVyZWdpc3RlcihlbnRpdHksIGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgY3VycmVudEVudGl0eTtcbiAgICB2YXIgcG9zaXRpb24gPSBlbnRpdGllc1tlbnRpdHkuX2lkXVtjb2xsZWN0aW9uXTtcbiAgICBpZiAocG9zaXRpb24gPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuICAgIGVudGl0aWVzW2VudGl0eS5faWRdW2NvbGxlY3Rpb25dID0gbnVsbDtcbiAgICBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXS5yZW1vdmUoZW50aXR5KTtcblxuICAgIHZhciBjdXJyZW50RW50aXR5O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50aXRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY3VycmVudEVudGl0eSA9IGVudGl0aWVzW2ldO1xuXG4gICAgICAgIGlmIChjdXJyZW50RW50aXR5ICYmIGN1cnJlbnRFbnRpdHlbY29sbGVjdGlvbl0gPiBwb3NpdGlvbikgY3VycmVudEVudGl0eVtjb2xsZWN0aW9uXS0tO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGlkIG1hcCBvZiB0aGUgRW50aXR5LiAgRWFjaCBFbnRpdHkgaGFzIGFuIG9iamVjdCB0aGF0XG4gKiAgIGRlZmluZWQgdGhlIGluZGljaWVzIG9mIHdoZXJlIGl0IGlzIGluIGVhY2ggRW50aXR5Q29sbGVjdGlvbi5cbiAqXG4gKiBAbWV0aG9kICBnZXRcbiAqIFxuICogQHBhcmFtICB7TnVtYmVyfSBpZCBJRCBvZiB0aGUgRW50aXR5XG4gKiBAcmV0dXJuIHtPYmplY3R9IGlkIG1hcCBvZiB0aGUgRW50aXR5J3MgaW5kZXggaW4gZWFjaCBFbnRpdHlDb2xsZWN0aW9uXG4gKi9cbkVudGl0eVJlZ2lzdHJ5LmdldCA9IGZ1bmN0aW9uIGdldChpZCkge1xuICAgIHJldHVybiBlbnRpdGllc1tpZF07XG59O1xuXG4vKipcbiAqIEZpbmQgb3V0IGlmIGEgZ2l2ZW4gZW50aXR5IGV4aXN0cyBhbmQgYSBzcGVjaWZpZWQgRW50aXR5Q29sbGVjdGlvbi5cbiAqXG4gKiBAbWV0aG9kICBpbkNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtICB7RW50aXR5fSBlbnRpdHkgRW50aXR5IGluc3RhbmNlXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGNvbGxlY3Rpb24gbmFtZSBvZiB0aGUgRW50aXR5Q29sbGVjdGlvblxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciBvciBub3QgdGhlIEVudGl0eSBpcyBpbiBhIGdpdmVuIEVudGl0eUNvbGxlY3Rpb25cbiAqL1xuRW50aXR5UmVnaXN0cnkuaW5Db2xsZWN0aW9uID0gZnVuY3Rpb24gaW5Db2xsZWN0aW9uKGVudGl0eSwgY29sbGVjdGlvbikge1xuICAgIHJldHVybiBlbnRpdGllc1tlbnRpdHkuX2lkXVtjb2xsZWN0aW9uXSAhPT0gdW5kZWZpbmVkO1xufTtcblxuLyoqXG4gKiBHZXQgYSB1bmlxdWUgSUQgZm9yIGFuIEVudGl0eVxuICpcbiAqIEBtZXRob2QgIGdldE5ld0lEXG4gKiBcbiAqIEByZXR1cm4ge051bWJlcn0gSUQgZm9yIGFuIEVudGl0eVxuICovXG5FbnRpdHlSZWdpc3RyeS5nZXROZXdJRCA9IGZ1bmN0aW9uIGdldE5ld0lEKCkge1xuICAgIGlmKGZyZWVkLmxlbmd0aCkgcmV0dXJuIGZyZWVkLnBvcCgpO1xuICAgIGVsc2UgcmV0dXJuIGVudGl0aWVzLmxlbmd0aDtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGVudGl0eSBhbmQgYWxsIHJlZmVyZW5jZXMgdG8gaXQuXG4gKlxuICogQG1ldGhvZCBjbGVhbnVwXG4gKiBcbiAqIEBwYXJhbSAge0VudGl0eX0gZW50aXR5IEVudGl0eSBpbnN0YW5jZSB0byByZW1vdmVcbiAqIEByZXR1cm4ge051bWJlcn0gSUQgb2YgdGhlIEVudGl0eSB0aGF0IHdhcyByZW1vdmVkXG4gKi9cbkVudGl0eVJlZ2lzdHJ5LmNsZWFudXAgPSBmdW5jdGlvbiBjbGVhbnVwKGVudGl0eSkge1xuICAgIHZhciBjdXJyZW50RW50aXR5O1xuICAgIHZhciBpZE1hcCAgICAgICAgICAgID0gZW50aXRpZXNbZW50aXR5Ll9pZF07XG4gICAgZW50aXRpZXNbZW50aXR5Ll9pZF0gPSBudWxsO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRpdGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJyZW50RW50aXR5ID0gZW50aXRpZXNbaV07XG5cbiAgICAgICAgaWYgKGN1cnJlbnRFbnRpdHkpXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gaWRNYXApXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRFbnRpdHlba2V5XSAmJiBjdXJyZW50RW50aXR5W2tleV0gPiBpZE1hcFtrZXldKVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RW50aXR5W2tleV0tLTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gaWRNYXApIHtcbiAgICAgICAgZW50aXR5Q29sbGVjdGlvbnNba2V5XS5zcGxpY2UoaWRNYXBba2V5XSwgMSk7XG4gICAgfVxuXG4gICAgZnJlZWQucHVzaChlbnRpdHkuX2lkKTtcbiAgICByZXR1cm4gZW50aXR5Ll9pZDtcbn07XG5cbi8qKlxuICogR2V0IGFuIEVudGl0eSBieSBpZFxuICpcbiAqIEBtZXRob2QgZ2V0RW50aXR5XG4gKiBcbiAqIEBwYXJhbSAge051bWJlcn0gaWQgaWQgb2YgdGhlIEVudGl0eVxuICogQHJldHVybiB7RW50aXR5fSBlbnRpdHkgd2l0aCB0aGUgaWQgcHJvdmlkZWRcbiAqL1xuRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5ID0gZnVuY3Rpb24gZ2V0RW50aXR5KGlkKSB7XG4gICAgaWYgKCFlbnRpdGllc1tpZF0pIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gZW50aXR5Q29sbGVjdGlvbnMuZXZlcnl0aGluZy5nZXQoZW50aXRpZXNbaWRdLmV2ZXJ5dGhpbmcpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIEVudGl0aWVzIGZyb20gdGhlIGVudGl0eSByZWdpc3RyeVxuICpcbiAqIEBtZXRob2QgY2xlYXJcbiAqL1xuRW50aXR5UmVnaXN0cnkuY2xlYXIgPSBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICB2YXIgZXZlcnl0aGluZyA9IEVudGl0eVJlZ2lzdHJ5LmdldENvbGxlY3Rpb24oJ2V2ZXJ5dGhpbmcnKTtcbiAgICB3aGlsZSAoZXZlcnl0aGluZy5sZW5ndGgpIEVudGl0eVJlZ2lzdHJ5LmNsZWFudXAoZXZlcnl0aGluZy5wb3AoKSk7XG59O1xuXG4vLyBSZWdzaXRlciB0aGUgZGVmYXVsdCBlbnRpdHlDb2xsZWN0aW9uc1xuRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignUm9vdHMnKTtcbkVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0NvcmVTeXN0ZW0nKTtcblxuLy8gbW9kdWxlLmV4cG9ydHMgPSBFbnRpdHlSZWdpc3RyeTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IG1hcmtAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cbiBcbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4uL2V2ZW50cy9FdmVudEhhbmRsZXInKTtcblxuLyoqXG4gKiAgQSBjb2xsZWN0aW9uIG9mIG1ldGhvZHMgZm9yIHNldHRpbmcgb3B0aW9ucyB3aGljaCBjYW4gYmUgZXh0ZW5kZWRcbiAqICBvbnRvIG90aGVyIGNsYXNzZXMuXG4gKlxuICpcbiAqIEBjbGFzcyBPcHRpb25zTWFuYWdlclxuICogQGNvbnN0cnVjdG9yXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSBvcHRpb25zIGRpY3Rpb25hcnlcbiAqL1xuZnVuY3Rpb24gT3B0aW9uc01hbmFnZXIodmFsdWUpIHtcbiAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgIHRoaXMuZXZlbnRPdXRwdXQgPSBudWxsO1xufVxuXG4vKipcbiAqIENyZWF0ZSBvcHRpb25zIG1hbmFnZXIgZnJvbSBzb3VyY2UgZGljdGlvbmFyeSB3aXRoIGFyZ3VtZW50cyBvdmVycmlkZW4gYnkgcGF0Y2ggZGljdGlvbmFyeS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIE9wdGlvbnNNYW5hZ2VyLnBhdGNoXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZSBzb3VyY2UgYXJndW1lbnRzXG4gKiBAcGFyYW0gey4uLk9iamVjdH0gZGF0YSBhcmd1bWVudCBhZGRpdGlvbnMgYW5kIG92ZXJ3cml0ZXNcbiAqIEByZXR1cm4ge09iamVjdH0gc291cmNlIG9iamVjdFxuICovXG5PcHRpb25zTWFuYWdlci5wYXRjaCA9IGZ1bmN0aW9uIHBhdGNoT2JqZWN0KHNvdXJjZSwgZGF0YSkge1xuICAgIHZhciBtYW5hZ2VyID0gbmV3IE9wdGlvbnNNYW5hZ2VyKHNvdXJjZSk7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIG1hbmFnZXIucGF0Y2goYXJndW1lbnRzW2ldKTtcbiAgICByZXR1cm4gc291cmNlO1xufTtcblxuZnVuY3Rpb24gX2NyZWF0ZUV2ZW50T3V0cHV0KCkge1xuICAgIHRoaXMuZXZlbnRPdXRwdXQgPSBuZXcgRXZlbnRIYW5kbGVyKCk7XG4gICAgdGhpcy5ldmVudE91dHB1dC5iaW5kVGhpcyh0aGlzKTtcbiAgICBFdmVudEhhbmRsZXIuc2V0T3V0cHV0SGFuZGxlcih0aGlzLCB0aGlzLmV2ZW50T3V0cHV0KTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgT3B0aW9uc01hbmFnZXIgZnJvbSBzb3VyY2Ugd2l0aCBhcmd1bWVudHMgb3ZlcnJpZGVuIGJ5IHBhdGNoZXMuXG4gKiAgIFRyaWdnZXJzICdjaGFuZ2UnIGV2ZW50IG9uIHRoaXMgb2JqZWN0J3MgZXZlbnQgaGFuZGxlciBpZiB0aGUgc3RhdGUgb2ZcbiAqICAgdGhlIE9wdGlvbnNNYW5hZ2VyIGNoYW5nZXMgYXMgYSByZXN1bHQuXG4gKlxuICogQG1ldGhvZCBwYXRjaFxuICpcbiAqIEBwYXJhbSB7Li4uT2JqZWN0fSBhcmd1bWVudHMgbGlzdCBvZiBwYXRjaCBvYmplY3RzXG4gKiBAcmV0dXJuIHtPcHRpb25zTWFuYWdlcn0gdGhpc1xuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUucGF0Y2ggPSBmdW5jdGlvbiBwYXRjaCgpIHtcbiAgICB2YXIgbXlTdGF0ZSA9IHRoaXMuX3ZhbHVlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBkYXRhID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBmb3IgKHZhciBrIGluIGRhdGEpIHtcbiAgICAgICAgICAgIGlmICgoayBpbiBteVN0YXRlKSAmJiAoZGF0YVtrXSAmJiBkYXRhW2tdLmNvbnN0cnVjdG9yID09PSBPYmplY3QpICYmIChteVN0YXRlW2tdICYmIG15U3RhdGVba10uY29uc3RydWN0b3IgPT09IE9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW15U3RhdGUuaGFzT3duUHJvcGVydHkoaykpIG15U3RhdGVba10gPSBPYmplY3QuY3JlYXRlKG15U3RhdGVba10pO1xuICAgICAgICAgICAgICAgIHRoaXMua2V5KGspLnBhdGNoKGRhdGFba10pO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmV2ZW50T3V0cHV0KSB0aGlzLmV2ZW50T3V0cHV0LmVtaXQoJ2NoYW5nZScsIHtpZDogaywgdmFsdWU6IGRhdGFba119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgdGhpcy5zZXQoaywgZGF0YVtrXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBwYXRjaFxuICpcbiAqIEBtZXRob2Qgc2V0T3B0aW9uc1xuICpcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnNldE9wdGlvbnMgPSBPcHRpb25zTWFuYWdlci5wcm90b3R5cGUucGF0Y2g7XG5cbi8qKlxuICogUmV0dXJuIE9wdGlvbnNNYW5hZ2VyIGJhc2VkIG9uIHN1Yi1vYmplY3QgcmV0cmlldmVkIGJ5IGtleVxuICpcbiAqIEBtZXRob2Qga2V5XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkZW50aWZpZXIga2V5XG4gKiBAcmV0dXJuIHtPcHRpb25zTWFuYWdlcn0gbmV3IG9wdGlvbnMgbWFuYWdlciB3aXRoIHRoZSB2YWx1ZVxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUua2V5ID0gZnVuY3Rpb24ga2V5KGlkZW50aWZpZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IE9wdGlvbnNNYW5hZ2VyKHRoaXMuX3ZhbHVlW2lkZW50aWZpZXJdKTtcbiAgICBpZiAoIShyZXN1bHQuX3ZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB8fCByZXN1bHQuX3ZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHJlc3VsdC5fdmFsdWUgPSB7fTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBMb29rIHVwIHZhbHVlIGJ5IGtleVxuICogQG1ldGhvZCBnZXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IGtleVxuICogQHJldHVybiB7T2JqZWN0fSBhc3NvY2lhdGVkIG9iamVjdFxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0KGtleSkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZVtrZXldO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgZ2V0XG4gKiBAbWV0aG9kIGdldE9wdGlvbnNcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLmdldE9wdGlvbnMgPSBPcHRpb25zTWFuYWdlci5wcm90b3R5cGUuZ2V0O1xuXG4vKipcbiAqIFNldCBrZXkgdG8gdmFsdWUuICBPdXRwdXRzICdjaGFuZ2UnIGV2ZW50IGlmIGEgdmFsdWUgaXMgb3ZlcndyaXR0ZW4uXG4gKlxuICogQG1ldGhvZCBzZXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IGtleSBzdHJpbmdcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB2YWx1ZSBvYmplY3RcbiAqIEByZXR1cm4ge09wdGlvbnNNYW5hZ2VyfSBuZXcgb3B0aW9ucyBtYW5hZ2VyIGJhc2VkIG9uIHRoZSB2YWx1ZSBvYmplY3RcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldChrZXksIHZhbHVlKSB7XG4gICAgdmFyIG9yaWdpbmFsVmFsdWUgPSB0aGlzLmdldChrZXkpO1xuICAgIHRoaXMuX3ZhbHVlW2tleV0gPSB2YWx1ZTtcblxuICAgIGlmICh0aGlzLmV2ZW50T3V0cHV0ICYmIHZhbHVlICE9PSBvcmlnaW5hbFZhbHVlKSB0aGlzLmV2ZW50T3V0cHV0LmVtaXQoJ2NoYW5nZScsIHtpZDoga2V5LCB2YWx1ZTogdmFsdWV9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGVudGlyZSBvYmplY3QgY29udGVudHMgb2YgdGhpcyBPcHRpb25zTWFuYWdlci5cbiAqXG4gKiBAbWV0aG9kIHZhbHVlXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBjdXJyZW50IHN0YXRlIG9mIG9wdGlvbnNcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24gdmFsdWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xufTtcblxuLyoqXG4gKiBCaW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYW4gZXZlbnQgdHlwZSBoYW5kbGVkIGJ5IHRoaXMgb2JqZWN0LlxuICpcbiAqIEBtZXRob2QgXCJvblwiXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2hhbmdlJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBPYmplY3QpfSBoYW5kbGVyIGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oKSB7XG4gICAgX2NyZWF0ZUV2ZW50T3V0cHV0LmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXMub24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogVW5iaW5kIGFuIGV2ZW50IGJ5IHR5cGUgYW5kIGhhbmRsZXIuXG4gKiAgIFRoaXMgdW5kb2VzIHRoZSB3b3JrIG9mIFwib25cIi5cbiAqXG4gKiBAbWV0aG9kIHJlbW92ZUxpc3RlbmVyXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2hhbmdlJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgZnVuY3Rpb24gb2JqZWN0IHRvIHJlbW92ZVxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBpbnRlcm5hbCBldmVudCBoYW5kbGVyIG9iamVjdCAoZm9yIGNoYWluaW5nKVxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcigpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5yZW1vdmVMaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBBZGQgZXZlbnQgaGFuZGxlciBvYmplY3QgdG8gc2V0IG9mIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKlxuICogQG1ldGhvZCBwaXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCBldmVudCBoYW5kbGVyIHRhcmdldCBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcGFzc2VkIGV2ZW50IGhhbmRsZXJcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiBwaXBlKCkge1xuICAgIF9jcmVhdGVFdmVudE91dHB1dC5jYWxsKHRoaXMpO1xuICAgIHJldHVybiB0aGlzLnBpcGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGhhbmRsZXIgb2JqZWN0IGZyb20gc2V0IG9mIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKiBVbmRvZXMgd29yayBvZiBcInBpcGVcIlxuICpcbiAqIEBtZXRob2QgdW5waXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCB0YXJnZXQgaGFuZGxlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcHJvdmlkZWQgdGFyZ2V0XG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbiB1bnBpcGUoKSB7XG4gICAgX2NyZWF0ZUV2ZW50T3V0cHV0LmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXMudW5waXBlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9wdGlvbnNNYW5hZ2VyOyIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIE9wdGlvbnNNYW5hZ2VyICAgPSByZXF1aXJlKCcuLi9PcHRpb25zTWFuYWdlcicpLFxuICAgIFN1cmZhY2UgICAgICAgICAgPSByZXF1aXJlKCcuLi9Db21wb25lbnRzL1N1cmZhY2UnKSxcbiAgICBDb250YWluZXIgICAgICAgID0gcmVxdWlyZSgnLi4vQ29tcG9uZW50cy9Db250YWluZXInKSxcbiAgICBFbGVtZW50QWxsb2NhdG9yID0gcmVxdWlyZSgnLi9FbGVtZW50QWxsb2NhdG9yJyksXG4gICAgRW50aXR5UmVnaXN0cnkgICA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5JyksXG4gICAgTWF0cml4TWF0aCAgICAgICA9IHJlcXVpcmUoJy4uLy4uL21hdGgvTWF0cml4NHg0Jyk7XG5cbi8vIFN0YXRlXG52YXIgY29udGFpbmVyc1RvRWxlbWVudHMgPSBbXSxcbiAgICBzdXJmYWNlc1RvRWxlbWVudHMgICA9IHt9LFxuICAgIGNvbnRhaW5lcnNUb1N1cmZhY2VzID0gW10sXG4gICAgdGFyZ2V0cyAgICAgICAgICAgICAgPSBbU3VyZmFjZS50b1N0cmluZygpXTtcblxudmFyIHVzZVByZWZpeCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlLndlYmtpdFRyYW5zZm9ybSAhPSBudWxsO1xuXG4vLyBDT05TVFNcbnZhciBaRVJPICAgICAgICAgICAgICAgID0gMCxcbiAgICBERVZJQ0VQSVhFTFJBVElPICAgID0gd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMSxcbiAgICBNQVRSSVgzRCAgICAgICAgICAgID0gJ21hdHJpeDNkKCcsXG4gICAgQ0xPU0VfUEFSRU4gICAgICAgICA9ICcpJyxcbiAgICBDT01NQSAgICAgICAgICAgICAgID0gJywnLFxuICAgIERJViAgICAgICAgICAgICAgICAgPSAnZGl2JyxcbiAgICBGQV9DT05UQUlORVIgICAgICAgID0gJ2ZhLWNvbnRhaW5lcicsXG4gICAgRkFfU1VSRkFDRSAgICAgICAgICA9ICdmYS1zdXJmYWNlJyxcbiAgICBDT05UQUlORVIgICAgICAgICAgID0gJ2NvbnRhaW5lcicsXG4gICAgUFggICAgICAgICAgICAgICAgICA9ICdweCcsXG4gICAgU1VSRkFDRSAgICAgICAgICAgICA9ICdzdXJmYWNlJyxcbiAgICBUUkFOU0ZPUk0gICAgICAgICAgID0gJ3RyYW5zZm9ybScsXG4gICAgQ1NTVFJBTlNGT1JNICAgICAgICA9IHVzZVByZWZpeCA/ICd3ZWJraXRUcmFuc2Zvcm0nIDogJ3RyYW5zZm9ybScsXG4gICAgQ1NTVFJBTlNGT1JNX09SSUdJTiA9IHVzZVByZWZpeCA/ICd3ZWJraXRUcmFuc2Zvcm1PcmlnaW4nIDogJ3RyYW5zZm9ybU9yaWdpbic7XG5cbi8vc2NyYXRjaCBtZW1vcnkgZm9yIG1hdHJpeCBjYWxjdWxhdGlvbnNcbnZhciBtYXRyaXhTY3JhdGNoMSAgID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pLFxuICAgIG1hdHJpeFNjcmF0Y2gyICAgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSksXG4gICAgbWF0cml4U2NyYXRjaDMgICA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKSxcbiAgICBtYXRyaXhTY3JhdGNoNCAgID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuXG4vKipcbiAqIERPTVJlbmRlcmVyIGlzIGEgc2luZ2xldG9uIG9iamVjdCB3aG9zZSByZXNwb25zaWJsaXR5IGl0IGlzXG4gKiAgdG8gZHJhdyBET00gYm91bmQgU3VyZmFjZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBDb250YWluZXJzLlxuICpcbiAqIEBjbGFzcyBET01SZW5kZXJlclxuICogQHNpbmdsZXRvblxuICovXG52YXIgRE9NUmVuZGVyZXIgPSB7XG4gICAgX3F1ZXVlczoge1xuICAgICAgICBjb250YWluZXJzOiB7XG4gICAgICAgICAgICB1cGRhdGU6IFtdLFxuICAgICAgICAgICAgcmVjYWxsOiBbXSxcbiAgICAgICAgICAgIGRlcGxveTogW11cbiAgICAgICAgfSxcbiAgICAgICAgc3VyZmFjZXM6IHt9XG4gICAgfSxcbiAgICBhbGxvY2F0b3JzOiB7fVxufTtcblxuLyoqXG4gKiBBZGQgYW4gRW50aXR5IHdpdGggYSBDb250YWluZXIgY29tcG9uZW50IHRvIHRoZSBxdWV1ZSB0byBiZVxuICogIGFkZGVkIGludG8gdGhlIERPTS5cbiAqXG4gKiBAbWV0aG9kIGRlcGxveUNvbnRhaW5lclxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IG5lZWRzIHRvIGJlIGRlcGxveWVkXG4gKi9cbkRPTVJlbmRlcmVyLmRlcGxveUNvbnRhaW5lciA9IGZ1bmN0aW9uIGRlcGxveUNvbnRhaW5lcihlbnRpdHkpIHtcbiAgICB0aGlzLl9xdWV1ZXMuY29udGFpbmVycy5kZXBsb3kucHVzaChlbnRpdHkpO1xuICAgIGNvbnRhaW5lcnNUb1N1cmZhY2VzW2VudGl0eS5faWRdICA9IHt9O1xuICAgIHRoaXMuX3F1ZXVlcy5zdXJmYWNlc1tlbnRpdHkuX2lkXSA9IHtcbiAgICAgICAgdXBkYXRlOiBbXSxcbiAgICAgICAgcmVjYWxsOiBbXSxcbiAgICAgICAgZGVwbG95OiBbXVxuICAgIH07XG59O1xuXG4vLyBEZXBsb3kgYSBnaXZlbiBFbnRpdHkncyBDb250YWluZXIgdG8gdGhlIERPTS5cbmZ1bmN0aW9uIF9kZXBsb3lDb250YWluZXIoZW50aXR5KSB7XG4gICAgdmFyIGNvbnRleHQgPSBlbnRpdHkuZ2V0Q29udGV4dCgpO1xuXG4gICAgLy8gSWYgdGhlIENvbnRhaW5lciBoYXMgbm90IHByZXZpb3VzbHkgYmVlbiBkZXBsb3kgYW5kXG4gICAgLy8gZG9lcyBub3QgaGF2ZSBhbiBhbGxvY2F0b3IsIGNyZWF0ZSBvbmUuXG4gICAgaWYgKCFET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRleHQuX2lkXSlcbiAgICAgICAgRE9NUmVuZGVyZXIuYWxsb2NhdG9yc1tjb250ZXh0Ll9pZF0gPSBuZXcgRWxlbWVudEFsbG9jYXRvcihjb250ZXh0Ll9wYXJlbnRFbCk7XG5cbiAgICAvLyBDcmVhdGUgdGhlIERPTSByZXByZXNlbnRhdGlvbiBvZiB0aGUgQ29udGFpbmVyXG4gICAgdmFyIGVsZW1lbnQgPSBET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRleHQuX2lkXS5hbGxvY2F0ZShESVYpO1xuICAgIGNvbnRhaW5lcnNUb0VsZW1lbnRzW2VudGl0eS5faWRdID0gZWxlbWVudDtcbiAgICBfdXBkYXRlQ29udGFpbmVyKGVudGl0eSwgZWxlbWVudCk7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKEZBX0NPTlRBSU5FUik7XG5cbiAgICBET01SZW5kZXJlci5hbGxvY2F0b3JzW2VudGl0eS5faWRdID0gbmV3IEVsZW1lbnRBbGxvY2F0b3IoZWxlbWVudCk7XG59XG5cbi8qKlxuICogQWRkIGFuIEVudGl0eSB3aXRoIGEgQ29udGFpbmVyIGNvbXBvbmVudCB0byB0aGUgcXVldWUgdG8gYmVcbiAqICByZW1vdmVkIGZyb20gdGhlIERPTS5cbiAqXG4gKiBAbWV0aG9kIHJlY2FsbENvbnRhaW5lclxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IG5lZWRzIHRvIGJlIHJlY2FsbGVkXG4gKi9cbkRPTVJlbmRlcmVyLnJlY2FsbENvbnRhaW5lciA9IGZ1bmN0aW9uIHJlY2FsbENvbnRhaW5lcihlbnRpdHkpIHtcbiAgICB0aGlzLl9xdWV1ZXMuY29udGFpbmVycy5yZWNhbGwucHVzaChlbnRpdHkpO1xuICAgIGRlbGV0ZSB0aGlzLl9xdWV1ZXMuc3VyZmFjZXNbZW50aXR5Ll9pZF07XG59O1xuXG4vLyBSZWNhbGwgdGhlIERPTSByZXByZXNlbnRhdGlvbiBvZiB0aGUgRW50aXR5J3MgQ29udGFpbmVyXG4vLyBhbmQgY2xlYW4gdXAgcmVmZXJlbmNlcy5cbmZ1bmN0aW9uIF9yZWNhbGxDb250YWluZXIoZW50aXR5KSB7XG4gICAgdmFyIGVsZW1lbnQgPSBjb250YWluZXJzVG9FbGVtZW50c1tlbnRpdHkuX2lkXTtcbiAgICB2YXIgY29udGV4dCA9IGVudGl0eS5nZXRDb250ZXh0KCk7XG4gICAgRE9NUmVuZGVyZXIuYWxsb2NhdG9yc1tjb250ZXh0Ll9pZF0uZGVhbGxvY2F0ZShlbGVtZW50KTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoRkFfQ09OVEFJTkVSKTtcbiAgICBkZWxldGUgRE9NUmVuZGVyZXIuYWxsb2NhdG9yc1tlbnRpdHkuX2lkXTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gRW50aXR5IHdpdGggYSBDb250YWluZXIgY29tcG9uZW50IHRvIHRoZSBxdWV1ZSB0byBiZVxuICogIHVwZGF0ZWQuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVDb250YWluZXJcbiAqIFxuICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSBFbnRpdHkgdGhhdCBuZWVkcyB0byBiZSB1cGRhdGVkXG4gKi9cbkRPTVJlbmRlcmVyLnVwZGF0ZUNvbnRhaW5lciA9IGZ1bmN0aW9uIHVwZGF0ZUNvbnRhaW5lcihlbnRpdHkpIHtcbiAgICB0aGlzLl9xdWV1ZXMuY29udGFpbmVycy51cGRhdGUucHVzaChlbnRpdHkpO1xufTtcblxuLy8gVXBkYXRlIHRoZSBDb250YWluZXIncyBET00gcHJvcGVydGllc1xuZnVuY3Rpb24gX3VwZGF0ZUNvbnRhaW5lcihlbnRpdHkpIHtcbiAgICB2YXIgY29udGFpbmVyID0gZW50aXR5LmdldENvbXBvbmVudChDT05UQUlORVIpLFxuICAgICAgICBlbGVtZW50ICAgPSBjb250YWluZXJzVG9FbGVtZW50c1tlbnRpdHkuX2lkXSxcbiAgICAgICAgaSAgICAgICAgID0gMCxcbiAgICAgICAgc2l6ZSxcbiAgICAgICAgb3JpZ2luLFxuICAgICAgICBjb250ZXh0U2l6ZTtcblxuICAgIGlmIChjb250YWluZXIuX2V2ZW50cy5kaXJ0eSkge1xuICAgICAgICBpID0gY29udGFpbmVyLl9ldmVudHMub24ubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoY29udGFpbmVyLl9ldmVudHMub2ZmLmxlbmd0aCkgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRhaW5lci5fZXZlbnRzLm9mZi5wb3AoKSwgY29udGFpbmVyLl9ldmVudHMuZm9yd2FyZGVyKTtcbiAgICAgICAgd2hpbGUgKGktLSkgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRhaW5lci5fZXZlbnRzLm9uW2ldLCBjb250YWluZXIuX2V2ZW50cy5mb3J3YXJkZXIpO1xuICAgICAgICBjb250YWluZXIuX2V2ZW50cy5kaXJ0eSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChjb250YWluZXIuX3NpemVEaXJ0eSB8fCBjb250YWluZXIuX3RyYW5zZm9ybURpcnR5KSB7XG4gICAgICAgIGNvbnRleHRTaXplID0gZW50aXR5LmdldENvbnRleHQoKS5fc2l6ZTtcbiAgICAgICAgc2l6ZSAgICAgICAgPSBjb250YWluZXIuZ2V0Q1NTU2l6ZSgpO1xuICAgICAgICBvcmlnaW4gICAgICA9IGNvbnRhaW5lci5vcmlnaW47XG4gICAgfVxuXG4gICAgaWYgKGNvbnRhaW5lci5fc2l6ZURpcnR5KSB7XG4gICAgICAgIGVsZW1lbnQuc3R5bGUud2lkdGggID0gc2l6ZVswXSArIFBYO1xuICAgICAgICBlbGVtZW50LnN0eWxlLmhlaWdodCA9IHNpemVbMV0gKyBQWDtcbiAgICAgICAgY29udGFpbmVyLl9zaXplRGlydHkgPSBmYWxzZTtcbiAgICAgICAgY29udGFpbmVyLl9zZXRWZXJ0ZXhEaXNwbGFjZW1lbnQoZWxlbWVudC5vZmZzZXRXaWR0aCwgZWxlbWVudC5vZmZzZXRIZWlnaHQpO1xuICAgIH1cblxuICAgIGlmIChjb250YWluZXIuX3RyYW5zZm9ybURpcnR5KSB7XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gICAgICAgICAgICAgICA9IERPTVJlbmRlcmVyLmNyZWF0ZURPTU1hdHJpeChlbnRpdHkuZ2V0Q29tcG9uZW50KFRSQU5TRk9STSkuX21hdHJpeCwgY29udGV4dFNpemUsIHNpemUsIG9yaWdpbik7XG4gICAgICAgIGVsZW1lbnQuc3R5bGVbQ1NTVFJBTlNGT1JNXSA9IERPTVJlbmRlcmVyLnN0cmluZ2lmeU1hdHJpeCh0cmFuc2Zvcm0pO1xuICAgICAgICBjb250YWluZXIuX3RyYW5zZm9ybURpcnR5ID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhjb250YWluZXJzVG9TdXJmYWNlc1tlbnRpdHkuX2lkXSk7XG4gICAgICAgIGkgICAgICAgID0ga2V5cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pXG4gICAgICAgICAgICBpZiAoY29udGFpbmVyc1RvU3VyZmFjZXNbZW50aXR5Ll9pZF1ba2V5c1tpXV0pXG4gICAgICAgICAgICAgICAgY29udGFpbmVyc1RvU3VyZmFjZXNbZW50aXR5Ll9pZF1ba2V5c1tpXV0uZ2V0Q29tcG9uZW50KFNVUkZBQ0UpLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnRyYW5zZm9ybTtcbiAgICB9XG59XG5cbi8qKlxuICogQWRkIGFuIEVudGl0eSB3aXRoIGEgU3VyZmFjZSB0byB0aGUgcXVldWUgdG8gYmUgZGVwbG95ZWRcbiAqICB0byBhIHBhcnRpY3VsYXIgQ29udGFpbmVyLlxuICpcbiAqIEBtZXRob2QgZGVwbG95XG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgbmVlZHMgdG8gYmUgZGVwbG95ZWRcbiAqIEBwYXJhbSB7RW50aXR5fSBjb250YWluZXIgRW50aXR5IHRoYXQgdGhlIFN1cmZhY2Ugd2lsbCBiZSBkZXBsb3llZCB0b1xuICovXG5ET01SZW5kZXJlci5kZXBsb3kgPSBmdW5jdGlvbiBkZXBsb3koZW50aXR5LCBjb250YWluZXIpIHtcbiAgICBpZiAoIXN1cmZhY2VzVG9FbGVtZW50c1tlbnRpdHkuX2lkXSkgc3VyZmFjZXNUb0VsZW1lbnRzW2VudGl0eS5faWRdID0ge307XG4gICAgRE9NUmVuZGVyZXIuX3F1ZXVlcy5zdXJmYWNlc1tjb250YWluZXIuX2lkXS5kZXBsb3kucHVzaChlbnRpdHkpO1xuICAgIGNvbnRhaW5lcnNUb1N1cmZhY2VzW2NvbnRhaW5lci5faWRdW2VudGl0eS5faWRdID0gZW50aXR5O1xufTtcblxuLy8gRGVwbG95cyB0aGUgRW50aXR5J3MgU3VyZmFjZSB0byBhIHBhcnRpY3VsYXIgQ29udGFpbmVyLlxuZnVuY3Rpb24gX2RlcGxveShlbnRpdHksIGNvbnRhaW5lcklEKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRhaW5lcklEXS5hbGxvY2F0ZShlbnRpdHkuZ2V0Q29tcG9uZW50KFNVUkZBQ0UpLnRhZ05hbWUgfHwgRElWKTtcbiAgICBlbnRpdHkuZ2V0Q29tcG9uZW50KFNVUkZBQ0UpLmludmFsaWRhdGVBbGwoKTtcbiAgICBzdXJmYWNlc1RvRWxlbWVudHNbZW50aXR5Ll9pZF1bY29udGFpbmVySURdID0gZWxlbWVudDtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoRkFfU1VSRkFDRSk7XG4gICAgX3VwZGF0ZShlbnRpdHksIGNvbnRhaW5lcklEKTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gRW50aXR5IHdpdGggYSBTdXJmYWNlIHRvIHRoZSBxdWV1ZSB0byBiZSByZWNhbGxlZFxuICogIGZyb20gYSBwYXJ0aWN1bGFyIENvbnRhaW5lci5cbiAqXG4gKiBAbWV0aG9kIHJlY2FsbFxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IG5lZWRzIHRvIGJlIHJlY2FsbGVkIGZyb21cbiAqIEBwYXJhbSB7RW50aXR5fSBjb250YWluZXIgRW50aXR5IHRoYXQgdGhlIFN1cmZhY2Ugd2lsbCBiZSByZWNhbGxlZCBmcm9tXG4gKi9cbkRPTVJlbmRlcmVyLnJlY2FsbCA9IGZ1bmN0aW9uIHJlY2FsbChlbnRpdHksIGNvbnRhaW5lcikge1xuICAgIERPTVJlbmRlcmVyLl9xdWV1ZXMuc3VyZmFjZXNbY29udGFpbmVyLl9pZF0ucmVjYWxsLnB1c2goZW50aXR5KTtcbiAgICBjb250YWluZXJzVG9TdXJmYWNlc1tjb250YWluZXIuX2lkXVtlbnRpdHkuX2lkXSA9IGZhbHNlO1xufTtcblxuLy8gUmVjYWxscyB0aGUgRW50aXR5J3MgU3VyZmFjZSBmcm9tIGEgZ2l2ZW4gQ29udGFpbmVyXG5mdW5jdGlvbiBfcmVjYWxsKGVudGl0eSwgY29udGFpbmVySUQpIHtcbiAgICB2YXIgZWxlbWVudCA9IHN1cmZhY2VzVG9FbGVtZW50c1tlbnRpdHkuX2lkXVtjb250YWluZXJJRF07XG4gICAgdmFyIHN1cmZhY2UgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdzdXJmYWNlJyk7XG4gICAgRE9NUmVuZGVyZXIuYWxsb2NhdG9yc1tjb250YWluZXJJRF0uZGVhbGxvY2F0ZShlbGVtZW50KTtcbiAgICB2YXIgaSA9IHN1cmZhY2Uuc3BlYy5ldmVudHMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihzdXJmYWNlLnNwZWMuZXZlbnRzW2ldLCBzdXJmYWNlLmV2ZW50Rm9yd2FyZGVyKTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gRW50aXR5IHdpdGggYSBTdXJmYWNlIHRvIHRoZSBxdWV1ZSB0byBiZSB1cGRhdGVkXG4gKlxuICogQG1ldGhvZCB1cGRhdGVcbiAqIFxuICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSBFbnRpdHkgdGhhdCBuZWVkcyB0byBiZSB1cGRhdGVkXG4gKiBAcGFyYW0ge0VudGl0eX0gY29udGFpbmVyIEVudGl0eSB0aGF0IHRoZSBTdXJmYWNlIHdpbGwgYmUgdXBkYXRlZCBmb3JcbiAqL1xuRE9NUmVuZGVyZXIudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKGVudGl0eSwgY29udGFpbmVyKSB7XG4gICAgRE9NUmVuZGVyZXIuX3F1ZXVlcy5zdXJmYWNlc1tjb250YWluZXIuX2lkXS51cGRhdGUucHVzaChlbnRpdHkpO1xufTtcblxuLy8gVmVydGV4IGN1bGxpbmcgbG9naWNcbi8vIFRPRE8gZmlndXJlIG91dCB2ZXJ0ZXggY3VsbGluZy5cbmZ1bmN0aW9uIF9pc1dpdGhpbih0YXJnZXQsIGVudGl0eSwgY29udGFpbmVyLCB0YXJnZXRUcmFuc2Zvcm0pIHtcbiAgICB2YXIgdGFyZ2V0U2l6ZSAgICA9IHRhcmdldC5nZXRTaXplKHRhcmdldFRyYW5zZm9ybSwgdHJ1ZSksXG4gICAgICAgIGNvbnRhaW5lclNpemUgPSBjb250YWluZXIuZ2V0Q29tcG9uZW50KCdjb250YWluZXInKS5nZXRTaXplKHZvaWQgMCwgdHJ1ZSk7XG5cbiAgICB0YXJnZXRTaXplLm9yaWdpblswXSAtPSBlbnRpdHkuZ2V0Q29udGV4dCgpLl9zaXplWzBdIC8gMiAtIHRhcmdldFNpemUuc2l6ZVswXSAqIHRhcmdldC5nZXRPcmlnaW4oKVswXTtcbiAgICB0YXJnZXRTaXplLm9yaWdpblsxXSAtPSBlbnRpdHkuZ2V0Q29udGV4dCgpLl9zaXplWzFdIC8gMiAtIHRhcmdldFNpemUuc2l6ZVsxXSAqIHRhcmdldC5nZXRPcmlnaW4oKVsxXTtcblxuICAgIHZhciBmdXJ0aGVzdExlZnRUYXJnZXQgICAgICA9IHRhcmdldFNpemUub3JpZ2luWzBdICAgICsgdGFyZ2V0U2l6ZS5kaXNwbGFjZW1lbnQubGVmdCxcbiAgICAgICAgZnVydGhlc3RSaWdodFRhcmdldCAgICAgPSB0YXJnZXRTaXplLm9yaWdpblswXSAgICArIHRhcmdldFNpemUuZGlzcGxhY2VtZW50LnJpZ2h0LFxuICAgICAgICBmdXJ0aGVzdFRvcFRhcmdldCAgICAgICA9IHRhcmdldFNpemUub3JpZ2luWzFdICAgICsgdGFyZ2V0U2l6ZS5kaXNwbGFjZW1lbnQudG9wLFxuICAgICAgICBmdXJ0aGVzdEJvdHRvbVRhcmdldCAgICA9IHRhcmdldFNpemUub3JpZ2luWzFdICAgICsgdGFyZ2V0U2l6ZS5kaXNwbGFjZW1lbnQuYm90dG9tLFxuICAgICAgICBmdXJ0aGVzdExlZnRDb250YWluZXIgICA9IGNvbnRhaW5lclNpemUub3JpZ2luWzBdICsgY29udGFpbmVyU2l6ZS5kaXNwbGFjZW1lbnQubGVmdCxcbiAgICAgICAgZnVydGhlc3RSaWdodENvbnRhaW5lciAgPSBjb250YWluZXJTaXplLm9yaWdpblswXSArIGNvbnRhaW5lclNpemUuZGlzcGxhY2VtZW50LnJpZ2h0LFxuICAgICAgICBmdXJ0aGVzdFRvcENvbnRhaW5lciAgICA9IGNvbnRhaW5lclNpemUub3JpZ2luWzFdICsgY29udGFpbmVyU2l6ZS5kaXNwbGFjZW1lbnQudG9wLFxuICAgICAgICBmdXJ0aGVzdEJvdHRvbUNvbnRhaW5lciA9IGNvbnRhaW5lclNpemUub3JpZ2luWzFdICsgY29udGFpbmVyU2l6ZS5kaXNwbGFjZW1lbnQuYm90dG9tO1xuXG4gICAgdmFyIHZhbHVlID0gZnVydGhlc3RMZWZ0VGFyZ2V0IDwgZnVydGhlc3RSaWdodENvbnRhaW5lciAmJiBmdXJ0aGVzdExlZnRUYXJnZXQgPiBmdXJ0aGVzdExlZnRDb250YWluZXI7XG4gICAgaWYgKHZhbHVlICYmIChmdXJ0aGVzdFRvcFRhcmdldCA+IGZ1cnRoZXN0VG9wQ29udGFpbmVyICYmIGZ1cnRoZXN0VG9wVGFyZ2V0IDwgZnVydGhlc3RCb3R0b21Db250YWluZXIpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0Qm90dG9tVGFyZ2V0ID4gZnVydGhlc3RCb3R0b21Db250YWluZXIgJiYgZnVydGhlc3RCb3R0b21UYXJnZXQgPCBmdXJ0aGVzdFRvcENvbnRhaW5lcikpXG4gICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgdmFsdWUgPSBmdXJ0aGVzdFJpZ2h0VGFyZ2V0IDwgZnVydGhlc3RSaWdodENvbnRhaW5lciAmJiBmdXJ0aGVzdFJpZ2h0VGFyZ2V0ID4gZnVydGhlc3RMZWZ0Q29udGFpbmVyO1xuICAgIGlmICh2YWx1ZSAmJiAoZnVydGhlc3RUb3BUYXJnZXQgPiBmdXJ0aGVzdFRvcENvbnRhaW5lciAmJiBmdXJ0aGVzdFRvcFRhcmdldCA8IGZ1cnRoZXN0Qm90dG9tQ29udGFpbmVyKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgaWYgKHZhbHVlICYmIChmdXJ0aGVzdEJvdHRvbVRhcmdldCA+IGZ1cnRoZXN0Qm90dG9tQ29udGFpbmVyICYmIGZ1cnRoZXN0Qm90dG9tVGFyZ2V0IDwgZnVydGhlc3RUb3BDb250YWluZXIpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgIHZhbHVlID0gZnVydGhlc3RMZWZ0Q29udGFpbmVyIDwgZnVydGhlc3RSaWdodFRhcmdldCAmJiBmdXJ0aGVzdExlZnRDb250YWluZXIgPiBmdXJ0aGVzdExlZnRUYXJnZXQ7XG4gICAgaWYgKHZhbHVlICYmIChmdXJ0aGVzdFRvcENvbnRhaW5lciA+IGZ1cnRoZXN0VG9wVGFyZ2V0ICYmIGZ1cnRoZXN0VG9wQ29udGFpbmVyIDwgZnVydGhlc3RCb3R0b21UYXJnZXQpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0Qm90dG9tQ29udGFpbmVyID4gZnVydGhlc3RCb3R0b21UYXJnZXQgJiYgZnVydGhlc3RCb3R0b21Db250YWluZXIgPCBmdXJ0aGVzdFRvcFRhcmdldCkpXG4gICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgdmFsdWUgPSBmdXJ0aGVzdFJpZ2h0Q29udGFpbmVyIDwgZnVydGhlc3RSaWdodFRhcmdldCAmJiBmdXJ0aGVzdFJpZ2h0Q29udGFpbmVyID4gZnVydGhlc3RMZWZ0VGFyZ2V0O1xuICAgIGlmICh2YWx1ZSAmJiAoZnVydGhlc3RUb3BDb250YWluZXIgPiBmdXJ0aGVzdFRvcFRhcmdldCAmJiBmdXJ0aGVzdFRvcENvbnRhaW5lciA8IGZ1cnRoZXN0Qm90dG9tVGFyZ2V0KSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgaWYgKHZhbHVlICYmIChmdXJ0aGVzdEJvdHRvbUNvbnRhaW5lciA+IGZ1cnRoZXN0Qm90dG9tVGFyZ2V0ICYmIGZ1cnRoZXN0Qm90dG9tQ29udGFpbmVyIDwgZnVydGhlc3RUb3BUYXJnZXQpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLy8gVXBkYXRlIHRoZSBTdXJmYWNlIHRoYXQgaXMgdG8gZGVwbG95ZWQgdG8gYSBwYXJ0Y3VsYXIgQ29udGFpbmVyXG5mdW5jdGlvbiBfdXBkYXRlKGVudGl0eSwgY29udGFpbmVySUQpIHtcbiAgICB2YXIgc3VyZmFjZSAgICAgICAgID0gZW50aXR5LmdldENvbXBvbmVudChTVVJGQUNFKSxcbiAgICAgICAgc3BlYyAgICAgICAgICAgID0gc3VyZmFjZS5yZW5kZXIoKSxcbiAgICAgICAgaSAgICAgICAgICAgICAgID0gMCxcbiAgICAgICAgY29udGV4dFNpemUgICAgID0gZW50aXR5LmdldENvbnRleHQoKS5fc2l6ZSxcbiAgICAgICAgZWxlbWVudCAgICAgICAgID0gc3VyZmFjZXNUb0VsZW1lbnRzW2VudGl0eS5faWRdW2NvbnRhaW5lcklEXSxcbiAgICAgICAgY29udGFpbmVyRW50aXR5ID0gRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5KGNvbnRhaW5lcklEKSxcbiAgICAgICAgY29udGFpbmVyICAgICAgID0gY29udGFpbmVyRW50aXR5LmdldENvbXBvbmVudChDT05UQUlORVIpLFxuICAgICAgICBrZXk7XG5cbiAgICBpZiAoU3VyZmFjZS5pbnZhbGlkYXRpb25zLmNsYXNzZXMgJiBzcGVjLmludmFsaWRhdGlvbnMpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGVsZW1lbnQuY2xhc3NMaXN0Lmxlbmd0aDsgaSsrKSBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoZWxlbWVudC5jbGFzc0xpc3RbaV0pO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgc3BlYy5jbGFzc2VzLmxlbmd0aDsgICBpKyspIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChzcGVjLmNsYXNzZXNbaV0pO1xuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoRkFfU1VSRkFDRSk7XG4gICAgfVxuICAgIFxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMuYXR0cmlidXRlcyAmIHNwZWMuaW52YWxpZGF0aW9ucylcbiAgICAgICAgZm9yIChrZXkgaW4gc3BlYy5hdHRyaWJ1dGVzKSBlbGVtZW50LnNldEF0dHJpYnV0ZShrZXksIHNwZWMuYXR0cmlidXRlc1trZXldKTtcblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMucHJvcGVydGllcyAmIHNwZWMuaW52YWxpZGF0aW9ucylcbiAgICAgICAgZm9yIChrZXkgaW4gc3BlYy5wcm9wZXJ0aWVzKSBlbGVtZW50LnN0eWxlW2tleV0gPSBzcGVjLnByb3BlcnRpZXNba2V5XTtcblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMuYXR0cmlidXRlcyAmIHNwZWMuaW52YWxpZGF0aW9ucylcbiAgICAgICAgZm9yIChrZXkgaW4gc3BlYy5hdHRyaWJ1dGVzKSBlbGVtZW50LnNldEF0dHJpYnV0ZShrZXksIHNwZWMuYXR0cmlidXRlc1trZXldKTtcblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMuY29udGVudCAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICBpZiAoc3BlYy5jb250ZW50IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgICAgd2hpbGUgKGVsZW1lbnQuaGFzQ2hpbGROb2RlcygpKSBlbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHNwZWMuY29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBlbGVtZW50LmlubmVySFRNTCA9IHNwZWMuY29udGVudDtcbiAgICAgICAgc3BlYy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5zaXplO1xuICAgIH1cblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMub3BhY2l0eSAmIHNwZWMuaW52YWxpZGF0aW9ucyAmJiAhc3BlYy5wcm9wZXJ0aWVzLm9wYWNpdHkpXG4gICAgICAgIGVsZW1lbnQuc3R5bGUub3BhY2l0eSA9IGVudGl0eS5nZXRDb21wb25lbnQoJ29wYWNpdHknKS5fZ2xvYmFsT3BhY2l0eTtcblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMub3JpZ2luICYgc3BlYy5pbnZhbGlkYXRpb25zKSB7XG4gICAgICAgIGVsZW1lbnQuc3R5bGVbQ1NTVFJBTlNGT1JNX09SSUdJTl0gPSBzcGVjLm9yaWdpblswXS50b0ZpeGVkKDIpICogMTAwICsgJyUgJyArIHNwZWMub3JpZ2luWzFdLnRvRml4ZWQoMikgKiAxMDAgKyAnJSc7XG4gICAgfVxuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5ldmVudHMgJiBzcGVjLmludmFsaWRhdGlvbnMpIHtcbiAgICAgICAgaSA9IHNwZWMuZXZlbnRzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSkgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHNwZWMuZXZlbnRzW2ldLCBzcGVjLmV2ZW50Rm9yd2FyZGVyKTtcbiAgICB9XG5cbiAgICBpZiAoU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemUgJiBzcGVjLmludmFsaWRhdGlvbnMpIHtcbiAgICAgICAgaWYgKHNwZWMuc2l6ZSAmJiBzcGVjLnNpemVbMF0pIHsgXG4gICAgICAgICAgICBpZiAoc3BlYy5zaXplWzBdICE9PSB0cnVlKSBlbGVtZW50LnN0eWxlLndpZHRoID0gc3BlYy5zaXplWzBdICsgJ3B4JztcbiAgICAgICAgfSBcbiAgICAgICAgZWxzZSB7IC8vIHVuZGVmaW5lZCwgYmUgdGhlIHNpemUgb2YgaXQncyBwYXJlbnRcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdzaXplJykuX2dsb2JhbFNpemVbMF0gKyAncHgnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzcGVjLnNpemUgJiYgc3BlYy5zaXplWzFdKSB7XG4gICAgICAgICAgICBpZiAoc3BlYy5zaXplWzFdICE9PSB0cnVlKSBlbGVtZW50LnN0eWxlLmhlaWdodCA9IHNwZWMuc2l6ZVsxXSArICdweCc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50LnN0eWxlLmhlaWdodCA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3NpemUnKS5fZ2xvYmFsU2l6ZVsxXSArICdweCc7XG4gICAgICAgIH1cbiAgICAgICAgc3VyZmFjZS5fc2V0VmVydGV4RGlzcGxhY2VtZW50KGVsZW1lbnQub2Zmc2V0V2lkdGgsIGVsZW1lbnQub2Zmc2V0SGVpZ2h0KTtcbiAgICAgICAgc3BlYy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy50cmFuc2Zvcm07XG4gICAgfVxuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy50cmFuc2Zvcm0gJiBzcGVjLmludmFsaWRhdGlvbnMpIHtcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IE1hdHJpeE1hdGgubXVsdGlwbHkobWF0cml4U2NyYXRjaDMsIGNvbnRhaW5lci5nZXREaXNwbGF5TWF0cml4KCksIGVudGl0eS5nZXRDb21wb25lbnQoVFJBTlNGT1JNKS5fbWF0cml4KSxcbiAgICAgICAgICAgIGNhbWVyYSAgICA9IGVudGl0eS5nZXRDb250ZXh0KCkuZ2V0Q29tcG9uZW50KCdjYW1lcmEnKTtcbiAgICAgICAgdHJhbnNmb3JtICAgICA9IERPTVJlbmRlcmVyLmNyZWF0ZURPTU1hdHJpeCh0cmFuc2Zvcm0sIGNvbnRleHRTaXplLCBzdXJmYWNlLl9zaXplLCBzcGVjLm9yaWdpbik7XG4gICAgICAgIGlmIChjYW1lcmEpIHtcbiAgICAgICAgICAgIHZhciBmb2NhbFBvaW50ICAgID0gY2FtZXJhLmdldE9wdGlvbnMoKS5wcm9qZWN0aW9uLmZvY2FsUG9pbnQsXG4gICAgICAgICAgICAgICAgZnggICAgICAgICAgICA9IChmb2NhbFBvaW50WzBdICsgMSkgKiAwLjUgKiBjb250ZXh0U2l6ZVswXSxcbiAgICAgICAgICAgICAgICBmeSAgICAgICAgICAgID0gKDEgLSBmb2NhbFBvaW50WzFdKSAqIDAuNSAqIGNvbnRleHRTaXplWzFdLFxuICAgICAgICAgICAgICAgIHNjcmF0Y2hNYXRyaXggPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgIDAsIDAsIDAsIDEsIDAsIGZ4IC0gc3VyZmFjZS5fc2l6ZVswXSAqIHNwZWMub3JpZ2luWzBdLCAgZnkgLSBzdXJmYWNlLl9zaXplWzFdICogc3BlYy5vcmlnaW5bMV0sIDAsIDFdO1xuICAgICAgICAgICAgTWF0cml4TWF0aC5tdWx0aXBseShzY3JhdGNoTWF0cml4LCBzY3JhdGNoTWF0cml4LCBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgIDAsIDAsIDAsIDEsIGVudGl0eS5nZXRDb250ZXh0KCkuZ2V0Q29tcG9uZW50KCdjYW1lcmEnKS5nZXRQcm9qZWN0aW9uVHJhbnNmb3JtKClbMTFdLCAgMCwgMCwgMCwgMV0pO1xuICAgICAgICAgICAgTWF0cml4TWF0aC5tdWx0aXBseShzY3JhdGNoTWF0cml4LCBzY3JhdGNoTWF0cml4LCBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgLShmeCAtIHN1cmZhY2UuX3NpemVbMF0gKiBzcGVjLm9yaWdpblswXSksICAtKGZ5IC0gc3VyZmFjZS5fc2l6ZVsxXSAqIHNwZWMub3JpZ2luWzFdKSwgMCwgMV0pO1xuICAgICAgICAgICAgTWF0cml4TWF0aC5tdWx0aXBseSh0cmFuc2Zvcm0sIHNjcmF0Y2hNYXRyaXgsIHRyYW5zZm9ybSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbWVudC5zdHlsZVtDU1NUUkFOU0ZPUk1dID0gRE9NUmVuZGVyZXIuc3RyaW5naWZ5TWF0cml4KHRyYW5zZm9ybSk7XG4gICAgICAgIC8vIHN1cmZhY2UuX2N1bGxlZCA9ICFfaXNXaXRoaW4oc3VyZmFjZSwgZW50aXR5LCBjb250YWluZXJFbnRpdHksIHRyYW5zZm9ybSk7IC8vIFRPRE8gZmlndXJlIG91dCB2ZXJ0ZXggY3VsbGluZyBhZ2FpblxuICAgIH1cbiAgICBzdXJmYWNlLnJlc2V0SW52YWxpZGF0aW9ucygpO1xufVxuXG4vKipcbiAqIFJlbmRlciB3aWxsIHJ1biBvdmVyIGFsbCBvZiB0aGUgcXVldWVzIHRoYXQgaGF2ZSBiZWVuIHBvcHVsYXRlZFxuICogIGJ5IHRoZSBSZW5kZXJTeXN0ZW0gYW5kIHdpbGwgZXhlY3V0ZSB0aGUgZGVwbG95bWVudCwgcmVjYWxsaW5nLFxuICogIGFuZCB1cGRhdGluZy5cbiAqXG4gKiBAbWV0aG9kIHJlbmRlclxuICovXG4gRE9NUmVuZGVyZXIucmVuZGVyID0gZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIHZhciBxdWV1ZSxcbiAgICAgICAgY29udGFpbmVySUQsXG4gICAgICAgIGlubmVyUXVldWVzLFxuICAgICAgICBxdWV1ZXMgICAgID0gRE9NUmVuZGVyZXIuX3F1ZXVlcyxcbiAgICAgICAgY29udGFpbmVycyA9IE9iamVjdC5rZXlzKHF1ZXVlcy5zdXJmYWNlcyksXG4gICAgICAgIGogICAgICAgICAgPSBjb250YWluZXJzLmxlbmd0aCxcbiAgICAgICAgaSAgICAgICAgICA9IDAsXG4gICAgICAgIGsgICAgICAgICAgPSAwO1xuICAgIFxuICAgIC8vIERlcGxveSBDb250YWluZXJzXG4gICAgcXVldWUgPSBxdWV1ZXMuY29udGFpbmVycy5kZXBsb3k7XG4gICAgaSAgICAgPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgX2RlcGxveUNvbnRhaW5lcihxdWV1ZS5zaGlmdCgpKTtcblxuICAgIC8vIFJlY2FsbCBDb250YWluZXJzXG4gICAgcXVldWUgPSBxdWV1ZXMuY29udGFpbmVycy5yZWNhbGw7XG4gICAgaSAgICAgPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgX3JlY2FsbENvbnRhaW5lcihxdWV1ZS5zaGlmdCgpKTtcblxuICAgIC8vIFVwZGF0ZSBDb250YWluZXJzXG4gICAgcXVldWUgPSBxdWV1ZXMuY29udGFpbmVycy51cGRhdGU7XG4gICAgaSAgICAgPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgX3VwZGF0ZUNvbnRhaW5lcihxdWV1ZS5zaGlmdCgpKTtcblxuICAgIC8vIEZvciBlYWNoIENvbnRhaW5lclxuICAgIHdoaWxlIChqLS0pIHtcbiAgICAgICAgY29udGFpbmVySUQgPSBjb250YWluZXJzW2pdO1xuICAgICAgICBpbm5lclF1ZXVlcyA9IHF1ZXVlcy5zdXJmYWNlc1tjb250YWluZXJJRF07XG5cbiAgICAgICAgLy8gRGVwbG95IFN1cmZhY2VzXG4gICAgICAgIHF1ZXVlID0gaW5uZXJRdWV1ZXMuZGVwbG95O1xuICAgICAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSkgX2RlcGxveShxdWV1ZS5zaGlmdCgpLCBjb250YWluZXJJRCk7XG5cbiAgICAgICAgLy8gUmVjYWxsIFN1cmZhY2VzXG4gICAgICAgIHF1ZXVlID0gaW5uZXJRdWV1ZXMucmVjYWxsO1xuICAgICAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSkgX3JlY2FsbChxdWV1ZS5zaGlmdCgpLCBjb250YWluZXJJRCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFN1cmZhY2VzXG4gICAgICAgIHF1ZXVlID0gaW5uZXJRdWV1ZXMudXBkYXRlO1xuICAgICAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSkgX3VwZGF0ZShxdWV1ZS5zaGlmdCgpLCBjb250YWluZXJJRCk7XG4gICAgfVxuXG59O1xuXG4vLyBHZXQgdGhlIHR5cGUgb2YgVGFyZ2V0cyB0aGUgRE9NUmVuZGVyZXIgd2lsbCB3b3JrIGZvclxuRE9NUmVuZGVyZXIuZ2V0VGFyZ2V0cyA9IGZ1bmN0aW9uIGdldFRhcmdldHMoKSB7XG4gICAgcmV0dXJuIHRhcmdldHM7XG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgVHJhbnNmb3JtIG1hdHJpeCBmb3IgYSBTdXJmYWNlIGJhc2VkIG9uIGl0IHRyYW5zZm9ybSxcbiAqICBzaXplLCBvcmlnaW4sIGFuZCBDb250ZXh0J3Mgc2l6ZS4gIFVzZXMgaXRzIENvbnRleHQncyBzaXplIHRvXG4gKiAgdHVybiBob21vZ2Vub3VzIGNvb3JkaW5hdGUgVHJhbnNmb3JtcyB0byBwaXhlbHMuXG4gKlxuICogQG1ldGhvZCBjcmVhdGVET01NQXRyaXhcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB0cmFuc2Zvcm0gVHJhbnNmb3JtIG1hdHJpeFxuICogQHBhcmFtIHtBcnJheX0gY29udGV4dFNpemUgMi1kaW1lbnNpb25hbCBzaXplIG9mIHRoZSBDb250ZXh0XG4gKiBAcGFyYW0ge0FycmF5fSBzaXplIHNpemUgb2YgdGhlIERPTSBlbGVtZW50IGFzIGEgMy1kaW1lbnNpb25hbCBhcnJheVxuICogQHBhcmFtIHtBcnJheX0gb3JpZ2luIG9yaWdpbiBvZiB0aGUgRE9NIGVsZW1lbnQgYXMgYSAyLWRpbWVuc2lvbmFsIGFycmF5XG4gKiBAcGFyYW0ge0FycmF5fSByZXN1bHQgc3RvcmFnZSBvZiB0aGUgRE9NIGJvdW5kIHRyYW5zZm9ybSBtYXRyaXhcbiAqL1xuRE9NUmVuZGVyZXIuY3JlYXRlRE9NTWF0cml4ID0gZnVuY3Rpb24gY3JlYXRlRE9NTWF0cml4KHRyYW5zZm9ybSwgY29udGV4dFNpemUsIHNpemUsIG9yaWdpbiwgcmVzdWx0KSB7XG4gICAgcmVzdWx0ICAgICAgICAgICAgID0gcmVzdWx0IHx8IFtdO1xuICAgIC8vIHNpemVbMF0gICAgICAgICAgIC89IDAuNSAqIGNvbnRleHRTaXplWzBdOyAvLyBUT0RPOiBXZSdyZSBub3QgdXNpbmcgdGhlIFxuICAgIC8vIHNpemVbMV0gICAgICAgICAgIC89IDAuNSAqIGNvbnRleHRTaXplWzFdO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzBdICA9IDE7XG4gICAgbWF0cml4U2NyYXRjaDFbMV0gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVsyXSAgPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzNdICA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbNF0gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVs1XSAgPSAxO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzZdICA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbN10gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVs4XSAgPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzldICA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbMTBdID0gMTtcbiAgICBtYXRyaXhTY3JhdGNoMVsxMV0gPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzEyXSA9IC1zaXplWzBdICogb3JpZ2luWzBdO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzEzXSA9IC1zaXplWzFdICogb3JpZ2luWzFdO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzE0XSA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbMTVdID0gMTtcbiAgICBNYXRyaXhNYXRoLm11bHRpcGx5KG1hdHJpeFNjcmF0Y2gyLCBtYXRyaXhTY3JhdGNoMSwgdHJhbnNmb3JtKTtcblxuICAgIHJlc3VsdFswXSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzBdICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzBdICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMF0pO1xuICAgIHJlc3VsdFsxXSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzFdICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzFdICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMV0pO1xuICAgIHJlc3VsdFsyXSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzJdICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzJdICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMl0pO1xuICAgIHJlc3VsdFszXSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzNdICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzNdICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbM10pO1xuICAgIHJlc3VsdFs0XSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzRdICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzRdICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbNF0pO1xuICAgIHJlc3VsdFs1XSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzVdICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzVdICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbNV0pO1xuICAgIHJlc3VsdFs2XSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzZdICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzZdICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbNl0pO1xuICAgIHJlc3VsdFs3XSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzddICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzddICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbN10pO1xuICAgIHJlc3VsdFs4XSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzhdICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzhdICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbOF0pO1xuICAgIHJlc3VsdFs5XSAgPSAoKG1hdHJpeFNjcmF0Y2gyWzldICA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzldICA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbOV0pO1xuICAgIHJlc3VsdFsxMF0gPSAoKG1hdHJpeFNjcmF0Y2gyWzEwXSA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzEwXSA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMTBdKTtcbiAgICByZXN1bHRbMTFdID0gKChtYXRyaXhTY3JhdGNoMlsxMV0gPCAwLjAwMDAwMSAmJiBtYXRyaXhTY3JhdGNoMlsxMV0gPiAtMC4wMDAwMDEpID8gWkVSTyA6IG1hdHJpeFNjcmF0Y2gyWzExXSk7XG4gICAgcmVzdWx0WzEyXSA9ICgobWF0cml4U2NyYXRjaDJbMTJdIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMTJdID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsxMl0pICsgMC41ICogY29udGV4dFNpemVbMF07XG4gICAgcmVzdWx0WzEzXSA9ICgobWF0cml4U2NyYXRjaDJbMTNdIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMTNdID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsxM10pICsgMC41ICogY29udGV4dFNpemVbMV07XG4gICAgLy8gcmVzdWx0WzEyXSA9IChNYXRoLnJvdW5kKChtYXRyaXhTY3JhdGNoMlsxMl0gKyAxKSAqIDAuNSAqIGNvbnRleHRTaXplWzBdICogREVWSUNFUElYRUxSQVRJTykgLyBERVZJQ0VQSVhFTFJBVElPKTtcbiAgICAvLyByZXN1bHRbMTNdID0gKE1hdGgucm91bmQoKG1hdHJpeFNjcmF0Y2gyWzEzXSArIDEpICogMC41ICogY29udGV4dFNpemVbMV0gKiBERVZJQ0VQSVhFTFJBVElPKSAvIERFVklDRVBJWEVMUkFUSU8pO1xuICAgIHJlc3VsdFsxNF0gPSAoKG1hdHJpeFNjcmF0Y2gyWzE0XSA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzE0XSA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMTRdKTtcbiAgICByZXN1bHRbMTVdID0gKChtYXRyaXhTY3JhdGNoMlsxNV0gPCAwLjAwMDAwMSAmJiBtYXRyaXhTY3JhdGNoMlsxNV0gPiAtMC4wMDAwMDEpID8gWkVSTyA6IG1hdHJpeFNjcmF0Y2gyWzE1XSk7XG5cbiAgICAvLyBzaXplWzBdICo9IDAuNSAqIGNvbnRleHRTaXplWzBdO1xuICAgIC8vIHNpemVbMV0gKj0gMC41ICogY29udGV4dFNpemVbMV07XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBDU1MgcmVwcmVzZW50YXRpb24gb2YgYSBUcmFuc2Zvcm0gbWF0cml4XG4gKlxuICogQG1ldGhvZCBzdHJpbmdpZnlNYXRyaXhcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBtIFRyYW5zZm9ybSBtYXRyaXhcbiAqL1xuRE9NUmVuZGVyZXIuc3RyaW5naWZ5TWF0cml4ID0gZnVuY3Rpb24gc3RyaW5naWZ5TWF0cml4KG0pIHtcbiAgICByZXR1cm4gTUFUUklYM0QgK1xuICAgICAgICBtWzBdICArIENPTU1BICtcbiAgICAgICAgbVsxXSAgKyBDT01NQSArXG4gICAgICAgIG1bMl0gICsgQ09NTUEgK1xuICAgICAgICBtWzNdICArIENPTU1BICtcbiAgICAgICAgbVs0XSAgKyBDT01NQSArXG4gICAgICAgIG1bNV0gICsgQ09NTUEgK1xuICAgICAgICBtWzZdICArIENPTU1BICtcbiAgICAgICAgbVs3XSAgKyBDT01NQSArXG4gICAgICAgIG1bOF0gICsgQ09NTUEgK1xuICAgICAgICBtWzldICArIENPTU1BICtcbiAgICAgICAgbVsxMF0gKyBDT01NQSArXG4gICAgICAgIG1bMTFdICsgQ09NTUEgK1xuICAgICAgICBtWzEyXSArIENPTU1BICtcbiAgICAgICAgbVsxM10gKyBDT01NQSArXG4gICAgICAgIG1bMTRdICsgQ09NTUEgK1xuICAgICAgICBtWzE1XSArIENMT1NFX1BBUkVOO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IERPTVJlbmRlcmVyO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IG1hcmtAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgb2JqZWN0IHRvIENvbnRhaW5lciB0aGF0IGhhbmRsZXMgdGhlIHByb2Nlc3Mgb2ZcbiAqICAgY3JlYXRpbmcgYW5kIGFsbG9jYXRpbmcgRE9NIGVsZW1lbnRzIHdpdGhpbiBhIG1hbmFnZWQgZGl2LlxuICogICBQcml2YXRlLlxuICpcbiAqIEBjbGFzcyBFbGVtZW50QWxsb2NhdG9yXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR9IGNvbnRhaW5lciBkb2N1bWVudCBlbGVtZW50IGluIHdoaWNoIEZhbW8udXMgY29udGVudCB3aWxsIGJlIGluc2VydGVkXG4gKi9cbmZ1bmN0aW9uIEVsZW1lbnRBbGxvY2F0b3IoY29udGFpbmVyKSB7XG4gICAgaWYgKCFjb250YWluZXIpIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB0aGlzLmNvbnRhaW5lciAgICAgPSBjb250YWluZXI7XG4gICAgdGhpcy5kZXRhY2hlZE5vZGVzID0ge307XG4gICAgdGhpcy5ub2RlQ291bnQgICAgID0gMDtcbn1cblxuLyoqXG4gKiBBbGxvY2F0ZSBhbiBlbGVtZW50IG9mIHNwZWNpZmllZCB0eXBlIGZyb20gdGhlIHBvb2wuXG4gKlxuICogQG1ldGhvZCBhbGxvY2F0ZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIHR5cGUgb2YgZWxlbWVudCwgZS5nLiAnZGl2J1xuICpcbiAqIEByZXR1cm4ge0RPTUVsZW1lbnR9IGFsbG9jYXRlZCBkb2N1bWVudCBlbGVtZW50XG4gKi9cbkVsZW1lbnRBbGxvY2F0b3IucHJvdG90eXBlLmFsbG9jYXRlID0gZnVuY3Rpb24gYWxsb2NhdGUodHlwZSkge1xuICAgIHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKCEodHlwZSBpbiB0aGlzLmRldGFjaGVkTm9kZXMpKSB0aGlzLmRldGFjaGVkTm9kZXNbdHlwZV0gPSBbXTtcbiAgICB2YXIgbm9kZVN0b3JlID0gdGhpcy5kZXRhY2hlZE5vZGVzW3R5cGVdO1xuICAgIHZhciByZXN1bHQ7XG4gICAgaWYgKG5vZGVTdG9yZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJlc3VsdCA9IG5vZGVTdG9yZS5wb3AoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHR5cGUpO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChyZXN1bHQpO1xuICAgIH1cbiAgICB0aGlzLm5vZGVDb3VudCsrO1xuICAgIHJlc3VsdC5zdHlsZS5kaXNwbGF5ID0gJyc7ICAgIFxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIERlLWFsbG9jYXRlIGFuIGVsZW1lbnQgb2Ygc3BlY2lmaWVkIHR5cGUgdG8gdGhlIHBvb2wuXG4gKlxuICogQG1ldGhvZCBkZWFsbG9jYXRlXG4gKlxuICogQHBhcmFtIHtET01FbGVtZW50fSBlbGVtZW50IGRvY3VtZW50IGVsZW1lbnQgdG8gZGVhbGxvY2F0ZVxuICovXG5FbGVtZW50QWxsb2NhdG9yLnByb3RvdHlwZS5kZWFsbG9jYXRlID0gZnVuY3Rpb24gZGVhbGxvY2F0ZShlbGVtZW50KSB7XG4gICAgdmFyIG5vZGVUeXBlID0gZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBub2RlU3RvcmUgPSB0aGlzLmRldGFjaGVkTm9kZXNbbm9kZVR5cGVdO1xuICAgIG5vZGVTdG9yZS5wdXNoKGVsZW1lbnQpO1xuICAgIGVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICBlbGVtZW50LnN0eWxlLm9wYWNpdHkgPSAnJztcbiAgICBlbGVtZW50LnN0eWxlLndpZHRoICAgPSAnJztcbiAgICBlbGVtZW50LnN0eWxlLmhlaWdodCAgPSAnJztcbiAgICB0aGlzLm5vZGVDb3VudC0tO1xufTtcblxuLyoqXG4gKiBHZXQgY291bnQgb2YgdG90YWwgYWxsb2NhdGVkIG5vZGVzIGluIHRoZSBkb2N1bWVudC5cbiAqXG4gKiBAbWV0aG9kIGdldE5vZGVDb3VudFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdG90YWwgbm9kZSBjb3VudFxuICovXG5FbGVtZW50QWxsb2NhdG9yLnByb3RvdHlwZS5nZXROb2RlQ291bnQgPSBmdW5jdGlvbiBnZXROb2RlQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZUNvdW50O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbGVtZW50QWxsb2NhdG9yOyIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBhZG5hbkBmYW1vLnVzLFxuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIElORElDRVMgICAgICAgID0gJ2luZGljZXMnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9FbnRpdHlSZWdpc3RyeScpO1xudmFyIEdlb21ldHJ5ICAgICAgID0gcmVxdWlyZSgnLi4vLi4vZ2wvR2VvbWV0cnknKTtcbnZhciBUZXh0dXJlICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL2dsL1RleHR1cmUnKTtcbnZhciBTaGFkZXIgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL2dsL1NoYWRlcicpO1xudmFyIEJ1ZmZlciAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vZ2wvQnVmZmVyJyk7XG52YXIgVGltZVN5c3RlbSAgICAgPSByZXF1aXJlKCcuLi9TeXN0ZW1zL1RpbWVTeXN0ZW0nKTtcblxudmFyIE1hdGVyaWFscyAgICAgID0gRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignTWF0ZXJpYWxzJyk7XG52YXIgR2VvbWV0cmllcyAgICAgPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdHZW9tZXRyaWVzJyk7XG52YXIgTGlnaHRzICAgICAgICAgPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdMaWdodHMnKTtcbnZhciBGWENvbXBvc2VycyAgICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ2Z4Jyk7XG52YXIgQ29udGV4dHMgICAgICAgPSBFbnRpdHlSZWdpc3RyeS5nZXRDb2xsZWN0aW9uKCdDb250ZXh0cycpO1xuXG52YXIgV2ViR0xSZW5kZXJlciAgID0ge307XG52YXIgQnVmZmVyUmVnaXN0cnkgID0ge307XG52YXIgVGV4dHVyZVJlZ2lzdHJ5ID0ge307XG5cbnZhciBpZGVudGl0eU1hdHJpeCA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXTtcbnZhciBtb3VzZSAgICAgICAgICA9IFsuNSwgLjVdO1xud2luZG93LnRleHR1cmUgPSBUZXh0dXJlUmVnaXN0cnk7XG5cbnZhciBsaWdodENvbG9ycyAgICA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcbnZhciBsaWdodFBvc2l0aW9ucyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcbnZhciBpbWFnZUNhY2hlID0gW107XG52YXIgdGV4Q2FjaGUgPSBbXTtcbnZhciBib3VuZFRleHR1cmU7XG52YXIgY2hlY2tlckJvYXJkID0gKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjLmNhbnZhcy53aWR0aCA9IGMuY2FudmFzLmhlaWdodCA9IDEyODtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGMuY2FudmFzLmhlaWdodDsgeSArPSAxNikge1xuICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBjLmNhbnZhcy53aWR0aDsgeCArPSAxNikge1xuICAgICAgICBjLmZpbGxTdHlsZSA9ICh4IF4geSkgJiAxNiA/ICcjRkZGJyA6ICcjREREJztcbiAgICAgICAgYy5maWxsUmVjdCh4LCB5LCAxNiwgMTYpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYy5jYW52YXM7XG59KSgpO1xuXG5XZWJHTFJlbmRlcmVyLmRyYXcgPSBmdW5jdGlvbiBkcmF3KHNwZWMpIHtcbiAgICB2YXIgdmVydGV4QnVmZmVycyA9IEJ1ZmZlclJlZ2lzdHJ5W3NwZWMuaWRdIHx8IChCdWZmZXJSZWdpc3RyeVtzcGVjLmlkXSA9IHt9KTtcblxuICAgIGZvciAodmFyIG5hbWUgaW4gc3BlYy52ZXJ0ZXhCdWZmZXJzKSB7XG4gICAgICAgIGlmICghIHNwZWMuaW52YWxpZGF0aW9uc1tuYW1lXSkgY29udGludWU7XG4gICAgICAgIHNwZWMuaW52YWxpZGF0aW9uc1tuYW1lXSA9IHZvaWQgMDtcblxuICAgICAgICB2YXIgaXNJbmRleCA9IG5hbWUgPT09IElORElDRVM7XG4gICAgICAgIGlmICghIHZlcnRleEJ1ZmZlcnNbbmFtZV0pIHtcbiAgICAgICAgICAgIHZlcnRleEJ1ZmZlcnNbbmFtZV0gPSBuZXcgQnVmZmVyKFxuICAgICAgICAgICAgICAgIGlzSW5kZXg/IHRoaXMuZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIgOiB0aGlzLmdsLkFSUkFZX0JVRkZFUixcbiAgICAgICAgICAgICAgICBpc0luZGV4ID8gVWludDE2QXJyYXkgOiBGbG9hdDMyQXJyYXksXG4gICAgICAgICAgICAgICAgdGhpcy5nbCxcbiAgICAgICAgICAgICAgICBpc0luZGV4ID8gMSA6IHNwZWMudmVydGV4QnVmZmVyc1tuYW1lXVswXS5sZW5ndGhcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICB2ZXJ0ZXhCdWZmZXJzW25hbWVdLmRhdGEgPSBzcGVjLnZlcnRleEJ1ZmZlcnNbbmFtZV07XG4gICAgICAgIHZlcnRleEJ1ZmZlcnNbbmFtZV0uc3ViRGF0YSgpO1xuICAgIH1cblxuICAgIHRoaXMuZ2wuZGVwdGhNYXNrKCEgc3BlYy51bmlmb3Jtcy5vcGFjaXR5IDwgMSk7XG4gICAgXG4gICAgdGhpcy5zaGFkZXIuc2V0VW5pZm9ybXMoc3BlYy51bmlmb3Jtcyk7XG5cbiAgICBpZiAoVGV4dHVyZVJlZ2lzdHJ5W3NwZWMuaWRdICYmIGJvdW5kVGV4dHVyZSAhPT0gVGV4dHVyZVJlZ2lzdHJ5W3NwZWMuaWRdKVxuICAgICAgICBib3VuZFRleHR1cmUgPSBUZXh0dXJlUmVnaXN0cnlbc3BlYy5pZF0uYmluZCgpO1xuXG4gICAgdGhpcy5kcmF3QnVmZmVycyhCdWZmZXJSZWdpc3RyeVtzcGVjLmlkXSwgdGhpcy5nbFtzcGVjLnR5cGVdKTtcbn07XG5cbldlYkdMUmVuZGVyZXIucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpO1xuXG4gICAgaWYgKCEgdGhpcy5nbCkgcmV0dXJuO1xuICAgIHRoaXMuc2hhZGVyLnNldFVuaWZvcm1zKHtcbiAgICAgICAgbW91c2U6IG1vdXNlLFxuICAgICAgICB0aW1lOiBUaW1lU3lzdGVtLmdldEVsYXBzZWRSZWxhdGl2ZVRpbWUoKVxuICAgIH0pO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IExpZ2h0cy5lbnRpdGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZW50aXR5ID0gTGlnaHRzLmVudGl0aWVzW2ldO1xuICAgICAgICB2YXIgbGlnaHQgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdsaWdodCcpO1xuICAgICAgICB2YXIgaW5kZXggPSBpICogMztcblxuICAgICAgICBsaWdodFBvc2l0aW9uc1tpbmRleCArIDBdID0gbGlnaHQuX3NwZWMucG9zaXRpb25bMF07XG4gICAgICAgIGxpZ2h0UG9zaXRpb25zW2luZGV4ICsgMV0gPSBsaWdodC5fc3BlYy5wb3NpdGlvblsxXTtcbiAgICAgICAgbGlnaHRQb3NpdGlvbnNbaW5kZXggKyAyXSA9IGxpZ2h0Ll9zcGVjLnBvc2l0aW9uWzJdO1xuXG4gICAgICAgIGxpZ2h0Q29sb3JzW2luZGV4ICsgMF0gPSBsaWdodC5fc3BlYy5jb2xvclswXTtcbiAgICAgICAgbGlnaHRDb2xvcnNbaW5kZXggKyAxXSA9IGxpZ2h0Ll9zcGVjLmNvbG9yWzFdO1xuICAgICAgICBsaWdodENvbG9yc1tpbmRleCArIDJdID0gbGlnaHQuX3NwZWMuY29sb3JbMl07XG4gICAgfVxuXG4gICAgdGhpcy5zaGFkZXIuc2V0VW5pZm9ybXMoe1xuICAgICAgICBsaWdodFBvc2l0aW9uczogbGlnaHRQb3NpdGlvbnMsXG4gICAgICAgIGxpZ2h0Q29sb3JzICAgOiBsaWdodENvbG9ycyxcbiAgICAgICAgbnVtTGlnaHRzICAgICA6IGlcbiAgICB9KTtcbiAgICBcbiAgICBmb3IgKGkgPSAwOyBpIDwgR2VvbWV0cmllcy5lbnRpdGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZW50aXR5ID0gR2VvbWV0cmllcy5lbnRpdGllc1tpXTtcbiAgICAgICAgdmFyIGNvbnRleHQgPSBlbnRpdHkuZ2V0Q29udGV4dCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbnRleHQpIHRoaXMuc2hhZGVyLnNldFVuaWZvcm1zKHtcbiAgICAgICAgICAgIHBlcnNwZWN0aXZlOiBhcHBseVByb2plY3Rpb24oZW50aXR5LCBjb250ZXh0KSxcbiAgICAgICAgICAgIHJlc29sdXRpb246IGNvbnRleHQuX3NpemUsXG4gICAgICAgICAgICBjYW1lcmFQb3M6IGNvbnRleHQuX2NvbXBvbmVudHMuY2FtZXJhLmdldE9wdGlvbnMoKS5wcm9qZWN0aW9uLmZvY2FsUG9pbnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHNwZWMgPSBlbnRpdHkuX2NvbXBvbmVudHMuZ2VvbWV0cnkucmVuZGVyKCk7XG5cbiAgICAgICAgaWYgKHNwZWMub2hub2UpXG4gICAgICAgICAgICB0aGlzLlJUVCh0aGlzLmRyYXcsIHNwZWMsIGNvbnRleHQsIHBwLmJhY2spO1xuXG4gICAgICAgIGlmIChzcGVjLm9mZnNjcmVlbilcbiAgICAgICAgICAgIHRoaXMuUlRUKHRoaXMuZHJhdywgc3BlYywgY29udGV4dCwgcHAuZnJvbnQpO1xuXG4gICAgICAgIGVsc2UgdGhpcy5kcmF3KHNwZWMpO1xuICAgIH1cbn07XG5cbldlYkdMUmVuZGVyZXIuZHJhd0J1ZmZlcnMgPSBmdW5jdGlvbiBkcmF3QnVmZmVycyh2ZXJ0ZXhCdWZmZXJzLCBtb2RlKSB7XG4gICAgdmFyIGxlbmd0aCA9IDA7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgaW5kZXhCdWZmZXIgPSB2ZXJ0ZXhCdWZmZXJzLmluZGljZXM7XG4gICAgdmFyIGF0dHJpYnV0ZTtcblxuICAgIGZvciAoYXR0cmlidXRlIGluIHZlcnRleEJ1ZmZlcnMpIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZSA9PSBJTkRJQ0VTKSBjb250aW51ZTtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnNbYXR0cmlidXRlXTtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5zaGFkZXIuYXR0cmlidXRlc1thdHRyaWJ1dGVdIHx8IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMuc2hhZGVyLnByb2dyYW0sICdhXycgKyBhdHRyaWJ1dGUpO1xuICAgICAgICBpZiAobG9jYXRpb24gPT0gLTEgfHwgISBidWZmZXIuYnVmZmVyKSBjb250aW51ZTtcbiAgICAgICAgdGhpcy5zaGFkZXIuYXR0cmlidXRlc1thdHRyaWJ1dGVdID0gbG9jYXRpb247XG4gICAgICAgIGdsLmJpbmRCdWZmZXIoYnVmZmVyLnRhcmdldCwgYnVmZmVyLmJ1ZmZlcik7XG4gICAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGxvY2F0aW9uKTtcbiAgICAgICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihsb2NhdGlvbiwgYnVmZmVyLmJ1ZmZlci5zcGFjaW5nLCBnbC5GTE9BVCwgZ2wuRkFMU0UsIDAsIDApO1xuICAgICAgICBsZW5ndGggPSBidWZmZXIuYnVmZmVyLmxlbmd0aCAvIDE7XG4gICAgfVxuXG4gICAgZm9yIChhdHRyaWJ1dGUgaW4gdGhpcy5zaGFkZXIuYXR0cmlidXRlcylcbiAgICAgICAgaWYgKCEgdmVydGV4QnVmZmVyc1thdHRyaWJ1dGVdKSBnbC5kaXNhYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5zaGFkZXIuYXR0cmlidXRlc1thdHRyaWJ1dGVdKTtcblxuICAgIGlmIChsZW5ndGgpIHtcbiAgICAgICAgaWYgKGluZGV4QnVmZmVyKVxuICAgICAgICAgICAgZ2wuYmluZEJ1ZmZlcihpbmRleEJ1ZmZlci50YXJnZXQsIGluZGV4QnVmZmVyLmJ1ZmZlciksXG4gICAgICAgICAgICBnbC5kcmF3RWxlbWVudHMobW9kZSwgaW5kZXhCdWZmZXIuYnVmZmVyLmxlbmd0aCwgZ2wuVU5TSUdORURfU0hPUlQsIDApO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGdsLmRyYXdBcnJheXMobW9kZSwgMCwgbGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbldlYkdMUmVuZGVyZXIuZ2V0VGFyZ2V0cyA9IGZ1bmN0aW9uIGdldFRhcmdldHMoKSB7XG4gICAgcmV0dXJuIFtHZW9tZXRyeS50b1N0cmluZygpXTtcbn07XG5cbldlYkdMUmVuZGVyZXIuaW5pdCAgPSBmdW5jdGlvbiBpbml0KG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7IGFscGhhOiB0cnVlIH07XG5cbiAgICB2YXIgY2FudmFzICAgPSBvcHRpb25zLmNhbnZhcztcbiAgICB2YXIgcGFyZW50RWwgPSBvcHRpb25zLnBhcmVudEVsIHx8IGRvY3VtZW50LmJvZHk7XG5cbiAgICBpZiAoISBjYW52YXMpIHtcbiAgICAgICAgY2FudmFzICAgICAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICBjYW52YXMuY2xhc3NOYW1lID0gJ0dMJztcbiAgICAgICAgY2FudmFzLndpZHRoICAgICA9IHdpbmRvdy5pbm5lcldpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ICAgID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgIH1cblxuICAgIHBhcmVudEVsLmFwcGVuZENoaWxkKGNhbnZhcyk7XG5cbiAgICB2YXIgZ2wgPSB0aGlzLmdsID0gY2FudmFzLmdldENvbnRleHQoJ3dlYmdsJywgb3B0aW9ucykgfHwgY2FudmFzLmdldENvbnRleHQoJ2V4cGVyaW1lbnRhbC13ZWJnbCcsIG9wdGlvbnMpO1xuICAgIGlmICghIGdsKSByZXR1cm4gY29uc29sZS5sb2coJ1dlYkdMIG5vdCBzdXBwb3J0ZWQnKTtcblxuICAgIGZ1bmN0aW9uIG1vdXNlZChlKSB7XG4gICAgICAgIGlmIChlLnRvdWNoZXMgJiYgZS50b3VjaGVzLmxlbmd0aCkgZSA9IGUudG91Y2hlc1swXTtcbiAgICAgICAgbW91c2VbMF0gPSAoZS54IHx8IGUuY2xpZW50WCkgIC8gaW5uZXJXaWR0aDtcbiAgICAgICAgbW91c2VbMV0gPSAxLiAtIChlLnkgfHwgZS5jbGllbnRZKSAvIGlubmVySGVpZ2h0O1xuICAgIH07XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgbW91c2VkKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgbW91c2VkKTtcblxuICAgIHRoaXMuc2hhZGVyID0gbmV3IFNoYWRlcihnbCk7XG5cbiAgICBnbC5wb2x5Z29uT2Zmc2V0KDAuMSwgMC4xKTtcbiAgICBnbC5lbmFibGUoZ2wuUE9MWUdPTl9PRkZTRVRfRklMTCk7XG4gICAgZ2wudmlld3BvcnQoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICBnbC5lbmFibGUoZ2wuREVQVEhfVEVTVCk7XG4gICAgZ2wuZW5hYmxlKGdsLkJMRU5EKTtcbiAgICAvLyBnbC5ibGVuZEZ1bmMoZ2wuU1JDX0FMUEhBLCBnbC5PTkVfTUlOVVNfU1JDX0FMUEhBKTtcbiAgICAvLyBnbC5kZXB0aEZ1bmMoZ2wuTEVRVUFMKTtcbiAgICBcbiAgICBnbC5lbmFibGUoZ2wuQ1VMTF9GQUNFKTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNYXRlcmlhbHMub24oJ2VudGl0eUFkZGVkJywgZnVuY3Rpb24gKGVudGl0eSkge1xuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG1hdGVyaWFsID0gZW50aXR5Ll9jb21wb25lbnRzLm1hdGVyaWFsO1xuICAgICAgICAgICAgdmFyIGltYWdlID0gbWF0ZXJpYWwub3B0aW9ucy5pbWFnZTtcbiAgICAgICAgICAgIHNlbGYuc2hhZGVyLnJlc2V0UHJvZ3JhbSgpO1xuXG4gICAgICAgICAgICBpZiAoISBpbWFnZSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGltYWdlLmJpbmQpIHJldHVybiBUZXh0dXJlUmVnaXN0cnlbbWF0ZXJpYWwuZW50aXR5XSA9IGltYWdlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgaWR4ID0gaW1hZ2VDYWNoZS5pbmRleE9mKGltYWdlKTtcbiAgICAgICAgICAgIGlmIChpZHggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgaW1hZ2VDYWNoZS5wdXNoKGltYWdlKTtcbiAgICAgICAgICAgICAgICB2YXIgdGV4ID0gbmV3IFRleHR1cmUoc2VsZi5nbCwgY2hlY2tlckJvYXJkKTtcbiAgICAgICAgICAgICAgICB0ZXguc2V0SW1hZ2UoY2hlY2tlckJvYXJkKTtcbiAgICAgICAgICAgICAgICB0ZXhDYWNoZS5wdXNoKHRleCk7XG4gICAgICAgICAgICAgICAgbG9hZEltYWdlKGltYWdlLCBmdW5jdGlvbiAoaW1nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRleC5zZXRJbWFnZShpbWcpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBUZXh0dXJlUmVnaXN0cnlbbWF0ZXJpYWwuZW50aXR5XSA9IHRleENhY2hlW2lkeF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGdsO1xufTtcblxuV2ViR0xSZW5kZXJlci5SVFQgPSBmdW5jdGlvbihjYiwgc3BlYywgY29udGV4dCwgdGV4dHVyZSkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIHYgPSBjb250ZXh0Ll9zaXplO1xuXG4gICAgdmFyIGZyYW1lYnVmZmVyICA9IHRoaXMuZnJhbWVidWZmZXIgPyB0aGlzLmZyYW1lYnVmZmVyIDogdGhpcy5mcmFtZWJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG4gICAgdmFyIHJlbmRlcmJ1ZmZlciA9IHRoaXMucmVuZGVyYnVmZmVyID8gdGhpcy5yZW5kZXJidWZmZXIgOiB0aGlzLnJlbmRlcmJ1ZmZlciA9IGdsLmNyZWF0ZVJlbmRlcmJ1ZmZlcigpO1xuXG4gICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmcmFtZWJ1ZmZlcik7XG4gICAgZ2wuYmluZFJlbmRlcmJ1ZmZlcihnbC5SRU5ERVJCVUZGRVIsIHJlbmRlcmJ1ZmZlcik7XG5cbiAgICBpZiAodlswXSAhPSByZW5kZXJidWZmZXIud2lkdGggfHwgdlsxXSAhPSByZW5kZXJidWZmZXIuaGVpZ2h0KSB7XG4gICAgICAgIHJlbmRlcmJ1ZmZlci53aWR0aCA9IHZbMF07XG4gICAgICAgIHJlbmRlcmJ1ZmZlci5oZWlnaHQgPSB2WzFdO1xuICAgICAgICBnbC5yZW5kZXJidWZmZXJTdG9yYWdlKGdsLlJFTkRFUkJVRkZFUiwgZ2wuREVQVEhfQ09NUE9ORU5UMTYsIHZbMF0sIHZbMV0pO1xuICAgIH1cblxuICAgIGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKGdsLkZSQU1FQlVGRkVSLCBnbC5DT0xPUl9BVFRBQ0hNRU5UMCwgZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZS5pZCwgMCk7XG4gICAgZ2wuZnJhbWVidWZmZXJSZW5kZXJidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIGdsLkRFUFRIX0FUVEFDSE1FTlQsIGdsLlJFTkRFUkJVRkZFUiwgcmVuZGVyYnVmZmVyKTtcbiAgICBcbiAgICBpZiAodGhpcy5kZWJ1ZykgY2hlY2tGQk8oZ2wpO1xuXG4gICAgY2IuY2FsbCh0aGlzLCBzcGVjKTtcblxuICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG4gICAgZ2wuYmluZFJlbmRlcmJ1ZmZlcihnbC5SRU5ERVJCVUZGRVIsIG51bGwpO1xuO307XG5cbldlYkdMUmVuZGVyZXIuZGVwbG95Q29udGFpbmVyID0gZnVuY3Rpb24gKCkge307XG5XZWJHTFJlbmRlcmVyLmRlcGxveSA9IGZ1bmN0aW9uICgpIHt9O1xuV2ViR0xSZW5kZXJlci51cGRhdGUgPSBmdW5jdGlvbiAoKSB7fTtcbldlYkdMUmVuZGVyZXIuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKCkge307XG5XZWJHTFJlbmRlcmVyLnJlY2FsbCA9IGZ1bmN0aW9uICgpIHt9O1xuXG5mdW5jdGlvbiBhcHBseVByb2plY3Rpb24gKGdlb20sIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBjYW1lcmEgPSBjb250ZXh0LmdldENvbXBvbmVudCgnY2FtZXJhJyk7XG4gICAgICAgICAgICB2YXIgcCA9IGNhbWVyYSA/IGNhbWVyYS5nZXRQcm9qZWN0aW9uVHJhbnNmb3JtKCkgOiBpZGVudGl0eU1hdHJpeDtcbiAgICAgICAgICAgIHZhciBjYW1lcmFGb2NhbCA9ICBjYW1lcmEgPyBjYW1lcmEuZ2V0T3B0aW9ucygpLnByb2plY3Rpb24uZm9jYWxQb2ludFsyXSA6IDA7XG4gICAgICAgICAgICB2YXIgY29udGV4dFdpZHRoID0gY29udGV4dC5fc2l6ZVswXTtcbiAgICAgICAgICAgIHZhciBjb250ZXh0SGVpZ2h0ID0gY29udGV4dC5fc2l6ZVsxXTtcbiAgICAgICAgICAgIHZhciBjb250ZXh0V2lkZXIgPSBjb250ZXh0V2lkdGggPiBjb250ZXh0SGVpZ2h0O1xuICAgICAgICAgICAgdmFyIGhvcml6b250YWxBc3BlY3RSYXRpb0NvcnJlY3Rpb24gPSBjb250ZXh0V2lkZXIgPyBjb250ZXh0SGVpZ2h0L2NvbnRleHRXaWR0aCA6IDE7XG4gICAgICAgICAgICB2YXIgdmVydGljYWxBc3BlY3RSYXRpb0NvcnJlY3Rpb24gPSBjb250ZXh0V2lkZXIgPyAxIDogY29udGV4dFdpZHRoL2NvbnRleHRIZWlnaHQ7XG4gICAgICAgICAgICB2YXIgZm9jYWxEZXB0aCA9IGNhbWVyYUZvY2FsID8gIGNvbnRleHRIZWlnaHQvY2FtZXJhRm9jYWwgOiAwO1xuXG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIGhvcml6b250YWxBc3BlY3RSYXRpb0NvcnJlY3Rpb24sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIDAsXG5cbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIHZlcnRpY2FsQXNwZWN0UmF0aW9Db3JyZWN0aW9uLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgMCxcblxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBwWzEwXSxcbiAgICAgICAgICAgICAgICAoLShmb2NhbERlcHRoKSAqIDAuNSkgKiB2ZXJ0aWNhbEFzcGVjdFJhdGlvQ29ycmVjdGlvbixcblxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIDFcbiAgICAgICAgICAgIF07XG59XG5cbmZ1bmN0aW9uIGxvYWRJbWFnZSAoaW1nLCBjYikge1xuICAgIHZhciBvYmogPSAodHlwZW9mIGltZyA9PT0gJ3N0cmluZycgPyBuZXcgSW1hZ2UoKSA6IGltZykgfHwge307XG4gICAgb2JqLmNyb3NzT3JpZ2luID0gJ2Fub255bW91cyc7XG4gICAgaWYgKCEgb2JqLnNyYykgb2JqLnNyYyA9IGltZyArICgnP189JyArIG5ldyBEYXRlKTtcbiAgICBpZiAoISBvYmouY29tcGxldGUpIG9iai5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7IGNiKG9iaik7IH07XG4gICAgZWxzZSBjYihvYmopO1xuXG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gY2hlY2tGQk8oZ2wpIHtcbiAgICB2YXIgc3RhdHVzID0gZ2wuY2hlY2tGcmFtZWJ1ZmZlclN0YXR1cyhnbC5GUkFNRUJVRkZFUik7XG4gICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICBjYXNlIGdsLkZSQU1FQlVGRkVSX0NPTVBMRVRFOiBicmVhaztcbiAgICBjYXNlIGdsLkZSQU1FQlVGRkVSX0lOQ09NUExFVEVfQVRUQUNITUVOVDpcbiAgICAgICAgdGhyb3coXCJJbmNvbXBsZXRlIGZyYW1lYnVmZmVyOiBGUkFNRUJVRkZFUl9JTkNPTVBMRVRFX0FUVEFDSE1FTlRcIik7IGJyZWFrO1xuICAgIGNhc2UgZ2wuRlJBTUVCVUZGRVJfSU5DT01QTEVURV9NSVNTSU5HX0FUVEFDSE1FTlQ6XG4gICAgICAgIHRocm93KFwiSW5jb21wbGV0ZSBmcmFtZWJ1ZmZlcjogRlJBTUVCVUZGRVJfSU5DT01QTEVURV9NSVNTSU5HX0FUVEFDSE1FTlRcIik7IGJyZWFrO1xuICAgIGNhc2UgZ2wuRlJBTUVCVUZGRVJfSU5DT01QTEVURV9ESU1FTlNJT05TOlxuICAgICAgICB0aHJvdyhcIkluY29tcGxldGUgZnJhbWVidWZmZXI6IEZSQU1FQlVGRkVSX0lOQ09NUExFVEVfRElNRU5TSU9OU1wiKTsgYnJlYWs7XG4gICAgY2FzZSBnbC5GUkFNRUJVRkZFUl9VTlNVUFBPUlRFRDpcbiAgICAgICAgdGhyb3coXCJJbmNvbXBsZXRlIGZyYW1lYnVmZmVyOiBGUkFNRUJVRkZFUl9VTlNVUFBPUlRFRFwiKTsgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3coXCJJbmNvbXBsZXRlIGZyYW1lYnVmZmVyOiBcIiArIHN0YXR1cyk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYkdMUmVuZGVyZXI7IiwidmFyIGNzcyA9IFwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxcbiAqXFxuICogT3duZXI6IG1hcmtAZmFtby51c1xcbiAqIEBsaWNlbnNlIE1QTCAyLjBcXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcXG4gKi9cXG5cXG5cXG5odG1sIHtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICAgIGhlaWdodDogMTAwJTtcXG4gICAgbWFyZ2luOiAwcHg7XFxuICAgIHBhZGRpbmc6IDBweDtcXG4gICAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gICAgLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcbiAgICB0cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcbn1cXG5cXG5ib2R5IHtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICB3aWR0aDogMTAwJTtcXG4gICAgaGVpZ2h0OiAxMDAlO1xcbiAgICBtYXJnaW46IDBweDtcXG4gICAgcGFkZGluZzogMHB4O1xcbiAgICAtd2Via2l0LXRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxuICAgIHRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxuICAgIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6IGFudGlhbGlhc2VkO1xcbiAgICAtd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgICAtd2Via2l0LXBlcnNwZWN0aXZlOiAwO1xcbiAgICBwZXJzcGVjdGl2ZTogbm9uZTtcXG4gICAgb3ZlcmZsb3c6IGhpZGRlbjtcXG59XFxuXFxuLmZhbW91cy1jb250YWluZXIsIC5mYW1vdXMtZ3JvdXAge1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIHRvcDogMHB4O1xcbiAgICBsZWZ0OiAwcHg7XFxuICAgIGJvdHRvbTogMHB4O1xcbiAgICByaWdodDogMHB4O1xcbiAgICBvdmVyZmxvdzogdmlzaWJsZTtcXG4gICAgLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcbiAgICB0cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcbiAgICAtd2Via2l0LWJhY2tmYWNlLXZpc2liaWxpdHk6IHZpc2libGU7XFxuICAgIGJhY2tmYWNlLXZpc2liaWxpdHk6IHZpc2libGU7XFxuICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xcbn1cXG5cXG4uZmFtb3VzLWdyb3VwIHtcXG4gICAgd2lkdGg6IDBweDtcXG4gICAgaGVpZ2h0OiAwcHg7XFxuICAgIG1hcmdpbjogMHB4O1xcbiAgICBwYWRkaW5nOiAwcHg7XFxuICAgIC13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXG4gICAgdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXG59XFxuXFxuLmZhLXN1cmZhY2Uge1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIC13ZWJraXQtdHJhbnNmb3JtLW9yaWdpbjogMCUgMCU7XFxuICAgIHRyYW5zZm9ybS1vcmlnaW46IDAlIDAlO1xcbiAgICAtd2Via2l0LWJhY2tmYWNlLXZpc2liaWxpdHk6IHZpc2libGU7XFxuICAgIGJhY2tmYWNlLXZpc2liaWxpdHk6IHZpc2libGU7XFxuICAgIC13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOiBmbGF0O1xcbiAgICB0cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkOyAvKiBwZXJmb3JtYW5jZSAqL1xcbi8qICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyovXFxuICAgIC13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICAgIHBvaW50ZXItZXZlbnRzOiBhdXRvO1xcblxcbn1cXG5cXG4uZmFtb3VzLWNvbnRhaW5lci1ncm91cCB7XFxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICAgIGhlaWdodDogMTAwJTtcXG59XFxuXFxuLmZhLWNvbnRhaW5lciB7XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgLXdlYmtpdC10cmFuc2Zvcm0tb3JpZ2luOiBjZW50ZXIgY2VudGVyO1xcbiAgICB0cmFuc2Zvcm0tb3JpZ2luOiBjZW50ZXIgY2VudGVyO1xcbiAgICBvdmVyZmxvdzogaGlkZGVuO1xcbn1cXG5cXG5jYW52YXMuR0wge1xcbiAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICB6LWluZGV4OiA5OTk5O1xcbiAgICB0b3A6IDBweDtcXG4gICAgbGVmdDogMHB4O1xcbn1cXG5cIjsgKHJlcXVpcmUoXCJjOlxcXFxVc2Vyc1xcXFxNb3JnYW5cXFxcZGVza3RvcFxcXFxtaXhlZC1tb2RlLXNlZWRcXFxcbm9kZV9tb2R1bGVzXFxcXGNzc2lmeVwiKSkoY3NzKTsgbW9kdWxlLmV4cG9ydHMgPSBjc3M7IiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9FbnRpdHlSZWdpc3RyeScpO1xudmFyIHJlbmRlck5vZGVzICAgID0gRW50aXR5UmVnaXN0cnkuZ2V0Q29sbGVjdGlvbignZXZlcnl0aGluZycpO1xuXG4vKipcbiAqIEEgc3lzdGVtIHRoYXQgd2lsbCBydW4gb3ZlciBjdXN0b20gY29tcG9uZW50cyB0aGF0IGhhdmUgYW5cbiAqICAgdXBkYXRlIGZ1bmN0aW9uLlxuICpcbiAqIEBjbGFzcyBCZWhhdmlvclN5c3RlbVxuICogQHN5c3RlbVxuICogQHNpbmdsZXRvblxuICovXG52YXIgQmVoYXZpb3JTeXN0ZW0gPSB7fTtcblxuLyoqXG4gKiBVcGRhdGUgd2lsbCBpdGVyYXRlIG92ZXIgYWxsIG9mIHRoZSBlbnRpdGllcyBhbmQgY2FsbFxuICogICBlYWNoIG9mIHRoZWlyIHVwZGF0ZSBmdW5jdGlvbnMuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVcbiAqL1xuQmVoYXZpb3JTeXN0ZW0udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIHZhciBpID0gcmVuZGVyTm9kZXMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSlcbiAgICAgICAgaWYgKHJlbmRlck5vZGVzLmVudGl0aWVzW2ldLnVwZGF0ZSlcbiAgICAgICAgICAgIHJlbmRlck5vZGVzLmVudGl0aWVzW2ldLnVwZGF0ZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCZWhhdmlvclN5c3RlbTtcblxuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9FbnRpdHlSZWdpc3RyeScpO1xuXG52YXIgcm9vdHMgICAgICAgICAgPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdDb250ZXh0cycpO1xuXG4vKipcbiAqIENvcmVTeXN0ZW0gaXMgcmVzcG9uc2libGUgZm9yIHRyYXZlcnNpbmcgdGhlIHNjZW5lIGdyYXBoIGFuZFxuICogICB1cGRhdGluZyB0aGUgVHJhbnNmb3JtcywgU2l6ZXMsIGFuZCBPcGFjaXRpZXMgb2YgdGhlIGVudGl0aWVzLlxuICpcbiAqIEBjbGFzcyAgQ29yZVN5c3RlbVxuICogQHN5c3RlbVxuICogQHNpbmdsZXRvblxuICovXG52YXIgQ29yZVN5c3RlbSA9IHt9O1xuXG4vKipcbiAqIHVwZGF0ZSBpdGVyYXRlcyBvdmVyIGVhY2ggb2YgdGhlIENvbnRleHRzIHRoYXQgd2VyZSByZWdpc3RlcmVkIGFuZFxuICogICBraWNrcyBvZiB0aGUgcmVjdXJzaXZlIHVwZGF0aW5nIG9mIHRoZWlyIGVudGl0aWVzLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlXG4gKi9cbkNvcmVTeXN0ZW0udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIHJvb3RzLmZvckVhY2goY29yZSk7XG59O1xuXG5cbmZ1bmN0aW9uIGNvcmUoZW50aXR5KSB7XG4gICAgY29yZVVwZGF0ZUFuZEZlZWQoZW50aXR5KTtcbn1cblxuLyoqXG4gKiBjb3JlVXBkYXRlQW5kRmVlZCBmZWVkcyBwYXJlbnQgaW5mb3JtYXRpb24gdG8gYW4gZW50aXR5IGFuZCBzbyB0aGF0XG4gKiAgIGVhY2ggZW50aXR5IGNhbiB1cGRhdGUgdGhlaXIgdHJhbnNmb3JtLCBzaXplLCBhbmQgb3BhY2l0eS4gIEl0IFxuICogICB3aWxsIHRoZW4gcGFzcyBkb3duIGludmFsaWRhdGlvbiBzdGF0ZXMgYW5kIHZhbHVlcyB0byBhbnkgY2hpbGRyZW4uXG4gKlxuICogQG1ldGhvZCBjb3JlVXBkYXRlQW5kRmVlZFxuICogQHByaXZhdGVcbiAqICAgXG4gKiBAcGFyYW0gIHtFbnRpdHl9ICBlbnRpdHkgICAgICAgICAgIEVudGl0eSBpbiB0aGUgc2NlbmUgZ3JhcGhcbiAqIEBwYXJhbSAge051bWJlcn0gIHRyYW5zZm9ybVJlcG9ydCAgYml0U2NoZW1lIHJlcG9ydCBvZiB0cmFuc2Zvcm0gaW52YWxpZGF0aW9uc1xuICogQHBhcmFtICB7QXJyYXl9ICAgaW5jb21pbmdNYXRyaXggICBwYXJlbnQgdHJhbnNmb3JtIGFzIGEgRmxvYXQzMiBBcnJheVxuICogQHBhcmFtICB7TnVtYmVyfSAgc2l6ZVJlcG9ydCAgICAgICBiaXRTY2hlbWUgcmVwb3J0IG9mIHNpemUgaW52YWxpZGF0aW9uc1xuICogQHBhcmFtICB7QXJyYXl9ICAgaW5jb21pbmdTaXplICAgICBwYXJlbnQgc2l6ZSBpbiBwaXhlbHNcbiAqIEBwYXJhbSAge0Jvb2xlYW59IG9wYWNpdHlSZXBvcnQgICAgYm9vbGVhbiByZXBvcnQgb2Ygb3BhY2l0eSBpbnZhbGlkYXRpb25cbiAqIEBwYXJhbSAge051bWJlcn0gIGluY29taW5nT3BhY2l0eSAgcGFyZW50IG9wYWNpdHlcbiAqL1xuZnVuY3Rpb24gY29yZVVwZGF0ZUFuZEZlZWQoZW50aXR5LCB0cmFuc2Zvcm1SZXBvcnQsIGluY29taW5nTWF0cml4LCBzaXplUmVwb3J0LCBpbmNvbWluZ1NpemUsIG9wYWNpdHlSZXBvcnQsIGluY29taW5nT3BhY2l0eSkge1xuICAgIHZhciB0cmFuc2Zvcm0gPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCd0cmFuc2Zvcm0nKTtcbiAgICB2YXIgc2l6ZSAgICAgID0gZW50aXR5LmdldENvbXBvbmVudCgnc2l6ZScpO1xuICAgIHZhciBvcGFjaXR5ICAgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdvcGFjaXR5Jyk7XG4gICAgdmFyIGNoaWxkcmVuICA9IGVudGl0eS5nZXRDaGlsZHJlbigpO1xuICAgIHZhciBpICAgICAgICAgPSBjaGlsZHJlbi5sZW5ndGg7XG5cblxuICAgIHRyYW5zZm9ybVJlcG9ydCA9IHRyYW5zZm9ybS5fdXBkYXRlKHRyYW5zZm9ybVJlcG9ydCwgaW5jb21pbmdNYXRyaXgpO1xuICAgIHNpemVSZXBvcnQgICAgICA9IHNpemUuX3VwZGF0ZShzaXplUmVwb3J0LCBpbmNvbWluZ1NpemUpO1xuICAgIG9wYWNpdHlSZXBvcnQgICA9IG9wYWNpdHkuX3VwZGF0ZShvcGFjaXR5UmVwb3J0LCBpbmNvbWluZ09wYWNpdHkpO1xuXG4gICAgd2hpbGUgKGktLSkgXG4gICAgICAgIGNvcmVVcGRhdGVBbmRGZWVkKFxuICAgICAgICAgICAgY2hpbGRyZW5baV0sXG4gICAgICAgICAgICB0cmFuc2Zvcm1SZXBvcnQsXG4gICAgICAgICAgICB0cmFuc2Zvcm0uX21hdHJpeCxcbiAgICAgICAgICAgIHNpemVSZXBvcnQsXG4gICAgICAgICAgICBzaXplLl9nbG9iYWxTaXplLFxuICAgICAgICAgICAgb3BhY2l0eVJlcG9ydCxcbiAgICAgICAgICAgIG9wYWNpdHkuX2dsb2JhbE9wYWNpdHkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvcmVTeXN0ZW07XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5JyksXG4gICAgTWF0cml4TWF0aCAgICAgPSByZXF1aXJlKCcuLi8uLi9tYXRoL01hdHJpeDR4NCcpLFxuICAgIE9wdGlvbnNNYW5hZ2VyID0gcmVxdWlyZSgnLi4vT3B0aW9uc01hbmFnZXInKTtcblxudmFyIHJlbmRlcmVycyAgICAgICAgICA9IHt9LFxuICAgIHRhcmdldHNUb1JlbmRlcmVycyA9IHt9O1xuXG52YXIgY29udGFpbmVycyAgPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdIYXNDb250YWluZXInKSxcbiAgICByZW5kZXJhYmxlcyA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ1JlbmRlcmFibGVzJyk7XG5cbnZhciB0b0RlcGxveSA9IFtdO1xuXG5jb250YWluZXJzLm9uKCdlbnRpdHlBZGRlZCcsIGRlcGxveUNvbnRhaW5lcik7XG5jb250YWluZXJzLm9uKCdlbnRpdHlSZW1vdmVkJywgcmVjYWxsQ29udGFpbmVyKTtcblxudmFyIGNvbnRhaW5lclRvVGFyZ2V0cyA9IHt9O1xuXG5mdW5jdGlvbiBkZXBsb3lDb250YWluZXIoZW50aXR5KSB7XG4gICAgaWYgKGVudGl0eS5nZXRDb250ZXh0KCkpIHJlbmRlcmVycy5ET00uZGVwbG95Q29udGFpbmVyKGVudGl0eSk7XG4gICAgZWxzZSAgICAgICAgICAgICAgICAgICAgIHRvRGVwbG95LnB1c2goZW50aXR5KTsgLy8gVE9ETyBUaGlzIGlzIHRlbXBvcmFyeSBhbmQgaXQgc3Vja3Ncbn1cblxuZnVuY3Rpb24gcmVjYWxsQ29udGFpbmVyKGVudGl0eSkge1xuICAgIHJlbmRlcmVycy5ET00ucmVjYWxsQ29udGFpbmVyKGVudGl0eSk7XG59XG5cbmZ1bmN0aW9uIF9yZWxldmVudFRvUmVuZGVyZXIocmVuZGVyZXIsIGVudGl0eSkge1xuICAgIHZhciB0YXJnZXRzID0gcmVuZGVyZXIuZ2V0VGFyZ2V0cygpO1xuICAgIHZhciBqICAgICAgID0gdGFyZ2V0cy5sZW5ndGg7XG4gICAgd2hpbGUgKGotLSkgaWYgKGVudGl0eS5oYXNDb21wb25lbnQodGFyZ2V0c1tqXSkpIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gX3JlbGV2ZW50VG9BbnlSZW5kZXJlcihlbnRpdHkpIHtcbiAgICB2YXIgcmVuZGVyZXJOYW1lcyA9IE9iamVjdC5rZXlzKHJlbmRlcmVycyksXG4gICAgICAgIGkgICAgICAgICAgICAgPSByZW5kZXJlck5hbWVzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pIGlmIChfcmVsZXZlbnRUb1JlbmRlcmVyKHJlbmRlcmVyc1tyZW5kZXJlck5hbWVzW2ldXSwgZW50aXR5KSkgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFJlbmRlclN5c3RlbSBpcyByZXNwb25zaWJsZSBmb3Iga2VlcGluZyB0cmFjayBvZiB0aGUgdmFyaW91cyByZW5kZXJlcnNcbiAqICBhbmQgZmVlZGluZyB0aGVtIFxuICpcbiAqXG4gKiBAY2xhc3MgUmVuZGVyU3lzdGVtXG4gKiBAc3lzdGVtXG4gKi9cbnZhciBSZW5kZXJTeXN0ZW0gPSB7fTtcblxuUmVuZGVyU3lzdGVtLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgdGFyZ2V0cyAgICAgICAgICAgICA9IE9iamVjdC5rZXlzKHRhcmdldHNUb1JlbmRlcmVycyksXG4gICAgICAgIHJlbmRlcmVyTmFtZXMgICAgICAgPSBPYmplY3Qua2V5cyhyZW5kZXJlcnMpLFxuICAgICAgICB0YXJnZXQgICAgICAgICAgICAgID0gbnVsbCxcbiAgICAgICAgZW50aXR5ICAgICAgICAgICAgICA9IG51bGwsXG4gICAgICAgIGNvbnRhaW5lciAgICAgICAgICAgPSBudWxsLFxuICAgICAgICB0YXJnZXROYW1lICAgICAgICAgID0gdm9pZCAwLFxuICAgICAgICBjb250YWluZXJFbnRzICAgICAgID0gY29udGFpbmVycy5lbnRpdGllcyxcbiAgICAgICAgZW50aXRpZXMgICAgICAgICAgICA9IHJlbmRlcmFibGVzLmVudGl0aWVzLFxuICAgICAgICBpICAgICAgICAgICAgICAgICAgID0gZW50aXRpZXMubGVuZ3RoLFxuICAgICAgICB0YXJnZXRzTGVuZ3RoICAgICAgID0gdGFyZ2V0cy5sZW5ndGgsXG4gICAgICAgIGNvbnRhaW5lckVudExlbmd0aHMgPSBjb250YWluZXJFbnRzLmxlbmd0aCxcbiAgICAgICAgcmVuZGVyZXJzTGVuZ3RoICAgICA9IDAsXG4gICAgICAgIGogICAgICAgICAgICAgICAgICAgPSB0b0RlcGxveS5sZW5ndGgsXG4gICAgICAgIGsgICAgICAgICAgICAgICAgICAgPSAwLFxuICAgICAgICBsICAgICAgICAgICAgICAgICAgID0gMDtcblxuXG5cbiAgICAvLyBVcGRhdGUgdGhlIENvbnRhaW5lciBpZiBpdHMgdHJhbnNmb3JtIG9yIHNpemUgYXJlIGRpcnR5LlxuICAgIGNvbnRhaW5lcnMuZm9yRWFjaChmdW5jdGlvbihlbnRpdHkpIHtcbiAgICAgICAgY29udGFpbmVyID0gZW50aXR5LmdldENvbXBvbmVudCgnY29udGFpbmVyJyk7XG4gICAgICAgIGlmIChlbnRpdHkuZ2V0Q29udGV4dCgpICYmIChjb250YWluZXIuX3RyYW5zZm9ybURpcnR5IHx8IGNvbnRhaW5lci5fc2l6ZURpcnR5KSkgcmVuZGVyZXJzLkRPTS51cGRhdGVDb250YWluZXIoZW50aXR5KTtcbiAgICB9KTtcblxuICAgIHdoaWxlIChqLS0pIGRlcGxveUNvbnRhaW5lcih0b0RlcGxveS5wb3AoKSk7XG5cbiAgICAvLyBGb3IgYWxsIG9mIHRoZSByZW5kZXJhYmxlc1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgaiAgICAgID0gdGFyZ2V0c0xlbmd0aDtcbiAgICAgICAgZW50aXR5ID0gZW50aXRpZXNbaV07XG5cbiAgICAgICAgLy8gRm9yIGVhY2ggcmVuZGVyZXJcbiAgICAgICAgd2hpbGUgKGotLSkge1xuICAgICAgICAgICAgdGFyZ2V0ID0gZW50aXR5LmdldENvbXBvbmVudCh0YXJnZXRzW2pdKTtcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSBjb250aW51ZTsgLy8gc2tpcCBpZiB0aGlzIFJlbmRlcmFibGUgZG9lcyBub3QgY29udGFpbmVyIHRoZSBwcm9wZXIgdGFyZ2V0IGNvbXBvbmVudCBmb3IgdGhpcyByZW5kZXJlclxuXG4gICAgICAgICAgICBrID0gY29udGFpbmVyRW50TGVuZ3RocztcblxuICAgICAgICAgICAgaWYgKGspIHtcbiAgICAgICAgICAgICAgICB0YXJnZXROYW1lICAgICAgPSB0YXJnZXQuY29uc3RydWN0b3IudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICByZW5kZXJlcnNMZW5ndGggPSB0YXJnZXRzVG9SZW5kZXJlcnNbdGFyZ2V0TmFtZV0ubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgLy8gRm9yIGVhY2ggY29udGFpbmVyXG4gICAgICAgICAgICAgICAgd2hpbGUgKGstLSkge1xuICAgICAgICAgICAgICAgICAgICBsICAgICAgICAgID0gcmVuZGVyZXJzTGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIgID0gY29udGFpbmVyRW50c1trXTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlbnRpdHkuX3Jvb3RJRClcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHRhcmdldCBoYXMgYSBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbnRpdHkuZ2V0Q29udGV4dCgpKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlY2lkZSBpZiB0byBkZXBsb3kgIGFuZCB1cGRhdGUgb3IganVzdCB1cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuX2lzV2l0aGluKGNvbnRhaW5lcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAobC0tKSB0YXJnZXRzVG9SZW5kZXJlcnNbdGFyZ2V0TmFtZV1bbF0udXBkYXRlKGVudGl0eSwgY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGwtLSkgdGFyZ2V0c1RvUmVuZGVyZXJzW3RhcmdldE5hbWVdW2xdLmRlcGxveShlbnRpdHksIGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Ll9hZGRUb0NvbnRhaW5lcihjb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC5faXNXaXRoaW4oY29udGFpbmVyKSkgeyAvLyBJZiB0aGUgdGFyZ2V0IGlzIHJlbW92ZWQgZnJvbSByZW5kZXIgdHJlZSByZWNhbGwgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChsLS0pIHRhcmdldHNUb1JlbmRlcmVyc1t0YXJnZXROYW1lXVtsXS5yZWNhbGwoZW50aXR5LCBjb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Ll9yZW1vdmVGcm9tQ29udGFpbmVyKGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlc2V0IHRoZSBpbnZhbGlkYXRpb25zIGFmdGVyIGFsbCBvZiB0aGUgbG9naWMgZm9yIFxuICAgICAgICAgICAgLy8gYSBwYXJ0aWN1bGFyIHRhcmdldCBcbiAgICAgICAgICAgIC8vIGlmICh0YXJnZXQucmVzZXRJbnZhbGlkYXRpb25zKSB0YXJnZXQucmVzZXRJbnZhbGlkYXRpb25zKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYXZlIGVhY2ggcmVuZGVyZXIgcnVuXG4gICAgaSA9IHJlbmRlcmVyTmFtZXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHJlbmRlcmVyc1tyZW5kZXJlck5hbWVzW2ldXS5yZW5kZXIoKTtcbn07XG5cbi8qKlxuICogQWRkIGEgbmV3IHJlbmRlcmVyIHdoaWNoIHdpbGwgYmUgY2FsbGVkIGV2ZXJ5IGZyYW1lLlxuICpcbiAqIEBtZXRob2QgcmVnaXN0ZXJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSByZW5kZXJlclxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlcmVyIHNpbmdsZXRvbiByZW5kZXJlciBvYmplY3RcbiAqL1xuUmVuZGVyU3lzdGVtLnJlZ2lzdGVyID0gZnVuY3Rpb24gcmVnaXN0ZXIobmFtZSwgcmVuZGVyZXIpIHtcbiAgICBpZiAocmVuZGVyZXJzW25hbWVdICE9IG51bGwpIHJldHVybiBmYWxzZTtcblxuICAgIHJlbmRlcmVyc1tuYW1lXSA9IHJlbmRlcmVyO1xuXG4gICAgdmFyIHRhcmdldHMgPSByZW5kZXJlci5nZXRUYXJnZXRzKCksXG4gICAgICAgIGkgICAgICAgPSB0YXJnZXRzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgaWYgKHRhcmdldHNUb1JlbmRlcmVyc1t0YXJnZXRzW2ldXSA9PSBudWxsKSB0YXJnZXRzVG9SZW5kZXJlcnNbdGFyZ2V0c1tpXV0gPSBbXTtcbiAgICAgICAgdGFyZ2V0c1RvUmVuZGVyZXJzW3RhcmdldHNbaV1dLnB1c2gocmVuZGVyZXIpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZW5kZXJTeXN0ZW07XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4gJ3VzZSBzdHJpY3QnO1xuXG52YXIgcHJldmlvdXNUaW1lICAgICAgID0gMCwgXG4gICAgZGVsdGEgICAgICAgICAgICAgID0gMCxcbiAgICBpbml0aWFsaXphdGlvblRpbWUgPSAwLFxuICAgIGN1cnJlbnRUaW1lICAgICAgICA9IGluaXRpYWxpemF0aW9uVGltZSxcbiAgICByZWxhdGl2ZVRpbWUgICAgICAgPSBpbml0aWFsaXphdGlvblRpbWUsXG4gICAgYWJzb2x1dGVUaW1lICAgICAgID0gaW5pdGlhbGl6YXRpb25UaW1lLFxuICAgIHByZXZpb3VzUmVsRnJhbWUgICA9IDA7XG5cbi8qKlxuICogVGltZVN5c3RlbSBpcyByZXNwb25zaWJsZSBmb3IgZGV0ZXJtaW5pbmcgdGhlIGN1cnJlbnQgbW9tZW50LlxuICpcbiAqIEBjbGFzcyBUaW1lU3lzdGVtXG4gKiBAc3lzdGVtXG4gKi9cbnZhciBUaW1lU3lzdGVtID0ge307XG5cbi8qKlxuICogVXBkYXRlIHRoZSB0aW1lIGJhc2VkIG9uIHRoZSBmcmFtZSBkYXRhIGZyb20gdGhlIEVuZ2luZS5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSByZWxGcmFtZSBcbiAqL1xuVGltZVN5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUodGltZXN0YW1wLCByZWxGcmFtZSkge1xuICAgIHByZXZpb3VzVGltZSAgICAgPSBjdXJyZW50VGltZTtcbiAgICBjdXJyZW50VGltZSAgICAgID0gdGltZXN0YW1wO1xuICAgIGRlbHRhICAgICAgICAgICAgPSBjdXJyZW50VGltZSAtIHByZXZpb3VzVGltZTtcbiAgICByZWxhdGl2ZVRpbWUgICAgKz0gZGVsdGEgKiAocmVsRnJhbWUgLSBwcmV2aW91c1JlbEZyYW1lKTtcbiAgICBhYnNvbHV0ZVRpbWUgICAgKz0gZGVsdGE7XG4gICAgcHJldmlvdXNSZWxGcmFtZSA9IHJlbEZyYW1lO1xufTtcblxuLyoqXG4gKiBHZXQgcmVsYXRpdmUgdGltZSBpbiBtcyBvZmZmc2V0IGJ5IHRoZSBzcGVlZCBhdCB3aGljaCB0aGUgRW5naW5lIGlzIHJ1bm5pbmcuXG4gKlxuICogQG1ldGhvZCBnZXRSZWxhdGl2ZVRpbWVcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSB0aW1lIGFjY291bnRpbmcgZm9yIEVuZ2luZSdzIHJ1biBzcGVlZFxuICovXG5UaW1lU3lzdGVtLmdldFJlbGF0aXZlVGltZSA9IGZ1bmN0aW9uIGdldFJlbGF0aXZlVGltZSgpIHtcbiAgICByZXR1cm4gcmVsYXRpdmVUaW1lO1xufTtcblxuLyoqXG4gKiBHZXQgYWJzb2x1dGUgdGltZS5cbiAqXG4gKiBAbWV0aG9kIGdldEFic29sdXRlVGltZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIHRpbWUgaW4gbXNcbiAqL1xuVGltZVN5c3RlbS5nZXRBYnNvbHV0ZVRpbWUgPSBmdW5jdGlvbiBnZXRBYnNvbHV0ZVRpbWUoKSB7XG4gICAgcmV0dXJuIGFic29sdXRlVGltZTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSB0aW1lIGluIHdoaWNoIHRoZSBFbmdpbmUgd2FzIGluc3RhbnRpYXRlZC5cbiAqXG4gKiBAbWV0aG9kIGdldEluaXRpYWxUaW1lXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgdGltZSBpbiBtc1xuICovXG5UaW1lU3lzdGVtLmdldEluaXRpYWxUaW1lID0gZnVuY3Rpb24gZ2V0SW5pdGlhbFRpbWUoKSB7XG4gICAgcmV0dXJuIGluaXRpYWxpemF0aW9uVGltZTtcbn07XG5cbi8qKlxuICogR2V0IGVsYXBzZWQgdGltZSBzaW5jZSBpbnN0YW50aWF0aW9uIGFjY291bnRpbmcgZm9yIEVuZ2luZSBzcGVlZFxuICpcbiAqIEBtZXRob2QgZ2V0RWxhcHNlZFJlbGF0aXZlVGltZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIHRpbWUgaW4gbXNcbiAqL1xuVGltZVN5c3RlbS5nZXRFbGFwc2VkUmVsYXRpdmVUaW1lID0gZnVuY3Rpb24gZ2V0RWxhcHNlZFJlbGF0aXZlVGltZSgpIHtcbiAgICByZXR1cm4gcmVsYXRpdmVUaW1lIC0gaW5pdGlhbGl6YXRpb25UaW1lO1xufTtcblxuLyoqXG4gKiBHZXQgYWJzb2x1dGUgZWxhcHNlZCB0aW1lIHNpbmNlIGluc3RhbnRpYXRpb25cbiAqXG4gKiBAbWV0aG9kIGdldEVsYXBzZWRBYnNvbHV0ZVRpbWVcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSB0aW1lIGluIG1zXG4gKi9cblRpbWVTeXN0ZW0uZ2V0RWxhcHNlZEFic29sdXRlVGltZSA9IGZ1bmN0aW9uIGdldEVsYXBzZWRBYnNvbHV0ZVRpbWUoKSB7XG4gICAgcmV0dXJuIGFic29sdXRlVGltZSAtIGluaXRpYWxpemF0aW9uVGltZTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSB0aW1lIGJldHdlZW4gdGhpcyBmcmFtZSBhbmQgbGFzdC5cbiAqXG4gKiBAbWV0aG9kIGdldERlbHRhXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgdGltZSBpbiBtc1xuICovXG5UaW1lU3lzdGVtLmdldERlbHRhID0gZnVuY3Rpb24gZ2V0RGVsdGEoKSB7XG4gICAgcmV0dXJuIGRlbHRhO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUaW1lU3lzdGVtO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4qIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4qXG4qIE93bmVyOiBtYXJrQGZhbW8udXNcbiogQGxpY2Vuc2UgTVBMIDIuMFxuKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBFdmVudEVtaXR0ZXIgcmVwcmVzZW50cyBhIGNoYW5uZWwgZm9yIGV2ZW50cy5cbiAqXG4gKiBAY2xhc3MgRXZlbnRFbWl0dGVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgdGhpcy5fb3duZXIgPSB0aGlzO1xufVxuXG4vKipcbiAqIFRyaWdnZXIgYW4gZXZlbnQsIHNlbmRpbmcgdG8gYWxsIGRvd25zdHJlYW0gaGFuZGxlcnNcbiAqICAgbGlzdGVuaW5nIGZvciBwcm92aWRlZCAndHlwZScga2V5LlxuICpcbiAqIEBtZXRob2QgZW1pdFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBldmVudCBkYXRhXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdCh0eXBlLCBldmVudCkge1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXMubGlzdGVuZXJzW3R5cGVdO1xuICAgIGlmIChoYW5kbGVycykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBoYW5kbGVyc1tpXS5jYWxsKHRoaXMuX293bmVyLCBldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEJpbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBhbiBldmVudCB0eXBlIGhhbmRsZWQgYnkgdGhpcyBvYmplY3QuXG4gKlxuICogQG1ldGhvZCBcIm9uXCJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjbGljaycpXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHN0cmluZywgT2JqZWN0KX0gaGFuZGxlciBjYWxsYmFja1xuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSB0aGlzXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbih0eXBlLCBoYW5kbGVyKSB7XG4gICAgaWYgKCEodHlwZSBpbiB0aGlzLmxpc3RlbmVycykpIHRoaXMubGlzdGVuZXJzW3R5cGVdID0gW107XG4gICAgdmFyIGluZGV4ID0gdGhpcy5saXN0ZW5lcnNbdHlwZV0uaW5kZXhPZihoYW5kbGVyKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aGlzLmxpc3RlbmVyc1t0eXBlXS5wdXNoKGhhbmRsZXIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgXCJvblwiLlxuICogQG1ldGhvZCBhZGRMaXN0ZW5lclxuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuLyoqXG4gKiBVbmJpbmQgYW4gZXZlbnQgYnkgdHlwZSBhbmQgaGFuZGxlci5cbiAqICAgVGhpcyB1bmRvZXMgdGhlIHdvcmsgb2YgXCJvblwiLlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlTGlzdGVuZXJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjbGljaycpXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYW5kbGVyIGZ1bmN0aW9uIG9iamVjdCB0byByZW1vdmVcbiAqIEByZXR1cm4ge0V2ZW50RW1pdHRlcn0gdGhpc1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIodHlwZSwgaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMubGlzdGVuZXJzW3R5cGVdLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ID49IDApIHRoaXMubGlzdGVuZXJzW3R5cGVdLnNwbGljZShpbmRleCwgMSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhbGwgZXZlbnQgaGFuZGxlcnMgd2l0aCB0aGlzIHNldCB0byBvd25lci5cbiAqXG4gKiBAbWV0aG9kIGJpbmRUaGlzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG93bmVyIG9iamVjdCB0aGlzIEV2ZW50RW1pdHRlciBiZWxvbmdzIHRvXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYmluZFRoaXMgPSBmdW5jdGlvbiBiaW5kVGhpcyhvd25lcikge1xuICAgIHRoaXMuX293bmVyID0gb3duZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuKlxuKiBPd25lcjogbWFya0BmYW1vLnVzXG4qIEBsaWNlbnNlIE1QTCAyLjBcbiogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4qL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuL0V2ZW50RW1pdHRlcicpO1xuXG4vKipcbiAqIEV2ZW50SGFuZGxlciBmb3J3YXJkcyByZWNlaXZlZCBldmVudHMgdG8gYSBzZXQgb2YgcHJvdmlkZWQgY2FsbGJhY2sgZnVuY3Rpb25zLlxuICogSXQgYWxsb3dzIGV2ZW50cyB0byBiZSBjYXB0dXJlZCwgcHJvY2Vzc2VkLCBhbmQgb3B0aW9uYWxseSBwaXBlZCB0aHJvdWdoIHRvIG90aGVyIGV2ZW50IGhhbmRsZXJzLlxuICpcbiAqIEBjbGFzcyBFdmVudEhhbmRsZXJcbiAqIEBleHRlbmRzIEV2ZW50RW1pdHRlclxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEV2ZW50SGFuZGxlcigpIHtcbiAgICBFdmVudEVtaXR0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHRoaXMuZG93bnN0cmVhbSA9IFtdOyAvLyBkb3duc3RyZWFtIGV2ZW50IGhhbmRsZXJzXG4gICAgdGhpcy5kb3duc3RyZWFtRm4gPSBbXTsgLy8gZG93bnN0cmVhbSBmdW5jdGlvbnNcblxuICAgIHRoaXMudXBzdHJlYW0gPSBbXTsgLy8gdXBzdHJlYW0gZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzID0ge307IC8vIHVwc3RyZWFtIGxpc3RlbmVyc1xufVxuRXZlbnRIYW5kbGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5FdmVudEhhbmRsZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRXZlbnRIYW5kbGVyO1xuXG4vKipcbiAqIEFzc2lnbiBhbiBldmVudCBoYW5kbGVyIHRvIHJlY2VpdmUgYW4gb2JqZWN0J3MgaW5wdXQgZXZlbnRzLlxuICpcbiAqIEBtZXRob2Qgc2V0SW5wdXRIYW5kbGVyXG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBvYmplY3QgdG8gbWl4IHRyaWdnZXIsIHN1YnNjcmliZSwgYW5kIHVuc3Vic2NyaWJlIGZ1bmN0aW9ucyBpbnRvXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gaGFuZGxlciBhc3NpZ25lZCBldmVudCBoYW5kbGVyXG4gKi9cbkV2ZW50SGFuZGxlci5zZXRJbnB1dEhhbmRsZXIgPSBmdW5jdGlvbiBzZXRJbnB1dEhhbmRsZXIob2JqZWN0LCBoYW5kbGVyKSB7XG4gICAgb2JqZWN0LnRyaWdnZXIgPSBoYW5kbGVyLnRyaWdnZXIuYmluZChoYW5kbGVyKTtcbiAgICBpZiAoaGFuZGxlci5zdWJzY3JpYmUgJiYgaGFuZGxlci51bnN1YnNjcmliZSkge1xuICAgICAgICBvYmplY3Quc3Vic2NyaWJlID0gaGFuZGxlci5zdWJzY3JpYmUuYmluZChoYW5kbGVyKTtcbiAgICAgICAgb2JqZWN0LnVuc3Vic2NyaWJlID0gaGFuZGxlci51bnN1YnNjcmliZS5iaW5kKGhhbmRsZXIpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXNzaWduIGFuIGV2ZW50IGhhbmRsZXIgdG8gcmVjZWl2ZSBhbiBvYmplY3QncyBvdXRwdXQgZXZlbnRzLlxuICpcbiAqIEBtZXRob2Qgc2V0T3V0cHV0SGFuZGxlclxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3Qgb2JqZWN0IHRvIG1peCBwaXBlLCB1bnBpcGUsIG9uLCBhZGRMaXN0ZW5lciwgYW5kIHJlbW92ZUxpc3RlbmVyIGZ1bmN0aW9ucyBpbnRvXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gaGFuZGxlciBhc3NpZ25lZCBldmVudCBoYW5kbGVyXG4gKi9cbkV2ZW50SGFuZGxlci5zZXRPdXRwdXRIYW5kbGVyID0gZnVuY3Rpb24gc2V0T3V0cHV0SGFuZGxlcihvYmplY3QsIGhhbmRsZXIpIHtcbiAgICBpZiAoaGFuZGxlciBpbnN0YW5jZW9mIEV2ZW50SGFuZGxlcikgaGFuZGxlci5iaW5kVGhpcyhvYmplY3QpO1xuICAgIG9iamVjdC5waXBlID0gaGFuZGxlci5waXBlLmJpbmQoaGFuZGxlcik7XG4gICAgb2JqZWN0LnVucGlwZSA9IGhhbmRsZXIudW5waXBlLmJpbmQoaGFuZGxlcik7XG4gICAgb2JqZWN0Lm9uID0gaGFuZGxlci5vbi5iaW5kKGhhbmRsZXIpO1xuICAgIG9iamVjdC5hZGRMaXN0ZW5lciA9IG9iamVjdC5vbjtcbiAgICBvYmplY3QucmVtb3ZlTGlzdGVuZXIgPSBoYW5kbGVyLnJlbW92ZUxpc3RlbmVyLmJpbmQoaGFuZGxlcik7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgYW4gZXZlbnQsIHNlbmRpbmcgdG8gYWxsIGRvd25zdHJlYW0gaGFuZGxlcnNcbiAqICAgbGlzdGVuaW5nIGZvciBwcm92aWRlZCAndHlwZScga2V5LlxuICpcbiAqIEBtZXRob2QgZW1pdFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBldmVudCBkYXRhXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdCh0eXBlLCBldmVudCkge1xuICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5kb3duc3RyZWFtLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzLmRvd25zdHJlYW1baV0udHJpZ2dlcikgdGhpcy5kb3duc3RyZWFtW2ldLnRyaWdnZXIodHlwZSwgZXZlbnQpO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5kb3duc3RyZWFtRm4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5kb3duc3RyZWFtRm5baV0odHlwZSwgZXZlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIGVtaXRcbiAqIEBtZXRob2QgYWRkTGlzdGVuZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS50cmlnZ2VyID0gRXZlbnRIYW5kbGVyLnByb3RvdHlwZS5lbWl0O1xuXG4vKipcbiAqIEFkZCBldmVudCBoYW5kbGVyIG9iamVjdCB0byBzZXQgb2YgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqXG4gKiBAbWV0aG9kIHBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IGV2ZW50IGhhbmRsZXIgdGFyZ2V0IG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwYXNzZWQgZXZlbnQgaGFuZGxlclxuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiBwaXBlKHRhcmdldCkge1xuICAgIGlmICh0YXJnZXQuc3Vic2NyaWJlIGluc3RhbmNlb2YgRnVuY3Rpb24pIHJldHVybiB0YXJnZXQuc3Vic2NyaWJlKHRoaXMpO1xuXG4gICAgdmFyIGRvd25zdHJlYW1DdHggPSAodGFyZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pID8gdGhpcy5kb3duc3RyZWFtRm4gOiB0aGlzLmRvd25zdHJlYW07XG4gICAgdmFyIGluZGV4ID0gZG93bnN0cmVhbUN0eC5pbmRleE9mKHRhcmdldCk7XG4gICAgaWYgKGluZGV4IDwgMCkgZG93bnN0cmVhbUN0eC5wdXNoKHRhcmdldCk7XG5cbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHRhcmdldCgncGlwZScsIG51bGwpO1xuICAgIGVsc2UgaWYgKHRhcmdldC50cmlnZ2VyKSB0YXJnZXQudHJpZ2dlcigncGlwZScsIG51bGwpO1xuXG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGhhbmRsZXIgb2JqZWN0IGZyb20gc2V0IG9mIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKiAgIFVuZG9lcyB3b3JrIG9mIFwicGlwZVwiLlxuICpcbiAqIEBtZXRob2QgdW5waXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCB0YXJnZXQgaGFuZGxlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcHJvdmlkZWQgdGFyZ2V0XG4gKi9cbkV2ZW50SGFuZGxlci5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24gdW5waXBlKHRhcmdldCkge1xuICAgIGlmICh0YXJnZXQudW5zdWJzY3JpYmUgaW5zdGFuY2VvZiBGdW5jdGlvbikgcmV0dXJuIHRhcmdldC51bnN1YnNjcmliZSh0aGlzKTtcblxuICAgIHZhciBkb3duc3RyZWFtQ3R4ID0gKHRhcmdldCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSA/IHRoaXMuZG93bnN0cmVhbUZuIDogdGhpcy5kb3duc3RyZWFtO1xuICAgIHZhciBpbmRleCA9IGRvd25zdHJlYW1DdHguaW5kZXhPZih0YXJnZXQpO1xuICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIGRvd25zdHJlYW1DdHguc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB0YXJnZXQoJ3VucGlwZScsIG51bGwpO1xuICAgICAgICBlbHNlIGlmICh0YXJnZXQudHJpZ2dlcikgdGFyZ2V0LnRyaWdnZXIoJ3VucGlwZScsIG51bGwpO1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbiAgICBlbHNlIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogQmluZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGFuIGV2ZW50IHR5cGUgaGFuZGxlZCBieSB0aGlzIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kIFwib25cIlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBPYmplY3QpfSBoYW5kbGVyIGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKHR5cGUsIGhhbmRsZXIpIHtcbiAgICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKCEodHlwZSBpbiB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzKSkge1xuICAgICAgICB2YXIgdXBzdHJlYW1MaXN0ZW5lciA9IHRoaXMudHJpZ2dlci5iaW5kKHRoaXMsIHR5cGUpO1xuICAgICAgICB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzW3R5cGVdID0gdXBzdHJlYW1MaXN0ZW5lcjtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnVwc3RyZWFtLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnVwc3RyZWFtW2ldLm9uKHR5cGUsIHVwc3RyZWFtTGlzdGVuZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgXCJvblwiXG4gKiBAbWV0aG9kIGFkZExpc3RlbmVyXG4gKi9cbkV2ZW50SGFuZGxlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEhhbmRsZXIucHJvdG90eXBlLm9uO1xuXG4vKipcbiAqIExpc3RlbiBmb3IgZXZlbnRzIGZyb20gYW4gdXBzdHJlYW0gZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAbWV0aG9kIHN1YnNjcmliZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRFbWl0dGVyfSBzb3VyY2Ugc291cmNlIGVtaXR0ZXIgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiBzdWJzY3JpYmUoc291cmNlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy51cHN0cmVhbS5pbmRleE9mKHNvdXJjZSk7XG4gICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgICB0aGlzLnVwc3RyZWFtLnB1c2goc291cmNlKTtcbiAgICAgICAgZm9yICh2YXIgdHlwZSBpbiB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzKSB7XG4gICAgICAgICAgICBzb3VyY2Uub24odHlwZSwgdGhpcy51cHN0cmVhbUxpc3RlbmVyc1t0eXBlXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFN0b3AgbGlzdGVuaW5nIHRvIGV2ZW50cyBmcm9tIGFuIHVwc3RyZWFtIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQG1ldGhvZCB1bnN1YnNjcmliZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRFbWl0dGVyfSBzb3VyY2Ugc291cmNlIGVtaXR0ZXIgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uIHVuc3Vic2NyaWJlKHNvdXJjZSkge1xuICAgIHZhciBpbmRleCA9IHRoaXMudXBzdHJlYW0uaW5kZXhPZihzb3VyY2UpO1xuICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIHRoaXMudXBzdHJlYW0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgZm9yICh2YXIgdHlwZSBpbiB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzKSB7XG4gICAgICAgICAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIodHlwZSwgdGhpcy51cHN0cmVhbUxpc3RlbmVyc1t0eXBlXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50SGFuZGxlcjtcbiIsImZ1bmN0aW9uIEJ1ZmZlcih0YXJnZXQsIHR5cGUsIGdsLCBzcGFjaW5nKSB7XG4gICAgdGhpcy5idWZmZXIgID0gbnVsbDtcbiAgICB0aGlzLnRhcmdldCAgPSB0YXJnZXQ7XG4gICAgdGhpcy50eXBlICAgID0gdHlwZTtcbiAgICB0aGlzLmRhdGEgICAgPSBbXTtcbiAgICB0aGlzLmdsICAgICAgPSBnbDtcbiAgICB0aGlzLnNwYWNpbmcgPSBzcGFjaW5nIHx8IDA7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3ViRGF0YSA9IGZ1bmN0aW9uIHN1YkRhdGEodHlwZSkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIGRhdGEgPSBbXTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMCwgY2h1bmsgPSAxMDAwMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkgKz0gY2h1bmspXG4gICAgICAgIGRhdGEgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KGRhdGEsIHRoaXMuZGF0YS5zbGljZShpLCBpICsgY2h1bmspKTtcblxuICAgIHRoaXMuYnVmZmVyICAgICAgICAgPSB0aGlzLmJ1ZmZlciB8fCBnbC5jcmVhdGVCdWZmZXIoKTtcbiAgICB0aGlzLmJ1ZmZlci5sZW5ndGggID0gZGF0YS5sZW5ndGggLyB0aGlzLnNwYWNpbmc7XG4gICAgdGhpcy5idWZmZXIuc3BhY2luZyA9IHRoaXMuc3BhY2luZyB8fCAodGhpcy5kYXRhLmxlbmd0aCA/IGRhdGEubGVuZ3RoIC8gdGhpcy5kYXRhLmxlbmd0aCA6IDApO1xuICAgIGdsLmJpbmRCdWZmZXIodGhpcy50YXJnZXQsIHRoaXMuYnVmZmVyKTtcbiAgICBnbC5idWZmZXJEYXRhKHRoaXMudGFyZ2V0LCBuZXcgdGhpcy50eXBlKGRhdGEpLCB0eXBlIHx8IGdsLlNUQVRJQ19EUkFXKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyOyIsIlxuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGFkbmFuQGZhbW8udXMsIGpvc2VwaEBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVFJBTlNGT1JNID0gJ3RyYW5zZm9ybSc7XG52YXIgT1BBQ0lUWSA9ICdvcGFjaXR5JztcbnZhciBTSVpFID0gJ3NpemUnO1xudmFyIE1BVEVSSUFMUyA9ICdtYXRlcmlhbCc7XG52YXIgR0VPTUVUUlkgPSAnZ2VvbWV0cnknO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jb3JlL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgVGFyZ2V0ID0gcmVxdWlyZSgnLi4vY29yZS9jb21wb25lbnRzL1RhcmdldCcpO1xuXG4vKipcbiAqIEdlb21ldHJ5IGlzIGEgY29tcG9uZW50IHRoYXQgZGVmaW5lcyB0aGUgZGF0YSB0aGF0IHNob3VsZFxuICogICBiZSBkcmF3biB0byB0aGUgd2ViR0wgY2FudmFzLiBNYW5hZ2VzIHZlcnRleCBkYXRhIGFuZCBhdHRyaWJ1dGVzLlxuICpcbiAqIEBjbGFzcyBHZW9tZXRyeVxuICogQGNvbXBvbmVudFxuICogQGNvbnN0cnVjdG9yXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgdGhlIEdlb21ldHJ5IGlzIGEgY29tcG9uZW50IG9mXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBpbnN0YW50aWF0aW9uIG9wdGlvbnNcbiAqL1xuXG5mdW5jdGlvbiBHZW9tZXRyeShpZCwgb3B0aW9ucykge1xuICAgIHRoaXMuZW50aXR5ID0gaWQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nZXRFbnRpdHkoKSwgJ0dlb21ldHJpZXMnKTtcbiAgICBFbnRpdHlSZWdpc3RyeS5yZWdpc3Rlcih0aGlzLmdldEVudGl0eSgpLCAnUmVuZGVyYWJsZXMnKTtcblxuICAgIHRoaXMuc3BlYyA9IHtcbiAgICAgICAgaWQ6IEVudGl0eVJlZ2lzdHJ5LmdldEVudGl0eSh0aGlzLmVudGl0eSkuX2lkLFxuICAgICAgICB0eXBlOiAob3B0aW9ucy50eXBlIHx8ICd0cmlhbmdsZXMnKS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICB2ZXJ0ZXhCdWZmZXJzOiB7fSxcbiAgICAgICAgdW5pZm9ybXM6IHtcbiAgICAgICAgICAgIG9yaWdpbjogbmV3IEZsb2F0MzJBcnJheShbMC41LCAwLjVdKSxcbiAgICAgICAgICAgIHNpemU6IG5ldyBGbG9hdDMyQXJyYXkoWzEsMSwxXSlcbiAgICAgICAgfSxcbiAgICAgICAgaW52YWxpZGF0aW9uczoge31cbiAgICB9O1xuXG4gICAgdGhpcy5hZGRWZXJ0ZXhCdWZmZXIoJ3BvcycpO1xuICAgIHRoaXMuYWRkVmVydGV4QnVmZmVyKCd0ZXhDb29yZCcpO1xuICAgIHRoaXMuYWRkVmVydGV4QnVmZmVyKCdub3JtYWwnKTtcbiAgICB0aGlzLmFkZFZlcnRleEJ1ZmZlcignaW5kaWNlcycpO1xuXG4gICAgVGFyZ2V0LmNhbGwodGhpcywgaWQsIHtcbiAgICAgICAgdmVydGljaWVzOiBbXG4gICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSldXG4gICAgfSk7XG4gICAgXG4gICAgaWYgKG9wdGlvbnMub3JpZ2luKSB0aGlzLnNldE9yaWdpbihvcHRpb25zLm9yaWdpbik7XG59XG5cbkdlb21ldHJ5LnRvU3RyaW5nID0gIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gR0VPTUVUUlk7XG59O1xuXG5HZW9tZXRyeS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFRhcmdldC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIEdldCB0aGUgRW50aXR5IHRoZSBHZW9tZXRyeSBpcyBhIGNvbXBvbmVudCBvZi5cbiAqXG4gKiBAbWV0aG9kIGdldEVudGl0eVxuICpcbiAqIEByZXR1cm4ge0VudGl0eX0gdGhlIEVudGl0eSB0aGUgR2VvbWV0cnkgaXMgYSBjb21wb25lbnQgb2ZcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmdldEVudGl0eSA9IGZ1bmN0aW9uIGdldEVudGl0eSgpIHtcbiAgICByZXR1cm4gRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5KHRoaXMuZW50aXR5KTtcbn07XG5cbi8qKlxuICogQWxsb2NhdGVzIGFuIGFycmF5IGJ1ZmZlciB3aGVyZSB2ZXJ0ZXggZGF0YSBpcyBzZW50IHRvIHZpYSBjb21waWxlLlxuICpcbiAqIEBtZXRob2QgYWRkVmVydGV4QnVmZmVyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgb2YgdmJvXG4gKiBAcGFyYW0ge0FycmF5fSBWYWx1ZXMgb2YgbmV3IHZlcnRleCBidWZmZXIuXG4gKiBcbiAqIEBjaGFpbmFibGVcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmFkZFZlcnRleEJ1ZmZlciA9IGZ1bmN0aW9uIGFkZFZlcnRleEJ1ZmZlcihidWZmZXJOYW1lLCB2YWx1ZSkge1xuICAgIHZhciBidWZmZXIgPSB0aGlzLnNwZWMudmVydGV4QnVmZmVyc1tidWZmZXJOYW1lXSA9IHZhbHVlIHx8IFtdO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIGJ1ZmZlciBvYmplY3QgYmFzZWQgb24gYnVmZmVyIG5hbWUuXG4gKlxuICogQG1ldGhvZCBnZXRWZXJ0ZXhCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gTmFtZSBvZiB2ZXJ0ZXhCdWZmZXIgdG8gYmUgcmV0cmlldmVkLlxuICovXG5cbkdlb21ldHJ5LnByb3RvdHlwZS5nZXRWZXJ0ZXhCdWZmZXIgPSBmdW5jdGlvbiBnZXRWZXJ0ZXhCdWZmZXIoYnVmZmVyTmFtZSkge1xuICAgIGlmICghIGJ1ZmZlck5hbWUpIHRocm93ICdnZXRWZXJ0ZXhCdWZmZXIgcmVxdWlyZXMgYSBuYW1lJztcbiAgICByZXR1cm4gdGhpcy5zcGVjLnZlcnRleEJ1ZmZlcnNbYnVmZmVyTmFtZV07XG59O1xuXG4vKipcbiAqIEBtZXRob2Qgc2V0VmVydGV4QnVmZmVyXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5zZXRWZXJ0ZXhCdWZmZXIgPSBmdW5jdGlvbiBzZXRWZXJ0ZXhCdWZmZXIoYnVmZmVybmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLnNwZWMudmVydGV4QnVmZmVyc1tidWZmZXJuYW1lXSA9IHZhbHVlO1xuICAgIHRoaXMuc3BlYy5pbnZhbGlkYXRpb25zW2J1ZmZlcm5hbWVdID0gMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogIFNldCB0aGUgcG9zaXRpb25zIG9mIHRoZSB2ZXJ0aWNpZXMgaW4gdGhpcyBnZW9tZXRyeS5cbiAqICBAbWV0aG9kIHNldFZlcnRleFBvc2l0aW9uc1xuICogIEBwYXJhbSB2YWx1ZSB7QXJyYXl9XG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5zZXRWZXJ0ZXhQb3NpdGlvbnMgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5zZXRWZXJ0ZXhCdWZmZXIoJ3BvcycsIHZhbHVlKTtcbn07XG5cbi8qKlxuICogIFNldCB0aGUgbm9ybWFscyBvbiB0aGlzIGdlb21ldHJ5LlxuICogIEBtZXRob2Qgc2V0Tm9ybWFsc1xuICogIEBwYXJhbSB2YWx1ZSB7QXJyYXl9XG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5zZXROb3JtYWxzID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0VmVydGV4QnVmZmVyKCdub3JtYWwnLCB2YWx1ZSk7XG59O1xuXG4vKipcbiAqICBTZXQgdGhlIHRleHR1cmUgY29vcmRpbmF0ZXMgb24gdGhpcyBnZW9tZXRyeS5cbiAqICBAbWV0aG9kIHNldFRleHR1cmVDb29yZHNcbiAqICBAcGFyYW0gdmFsdWUge0FycmF5fVxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuc2V0VGV4dHVyZUNvb3JkcyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnNldFZlcnRleEJ1ZmZlcigndGV4Q29vcmQnLCB2YWx1ZSk7XG59O1xuXG4vKipcbiAqICBTZXQgdGhlIHRleHR1cmUgY29vcmRpbmF0ZXMgb24gdGhpcyBnZW9tZXRyeS5cbiAqICBAbWV0aG9kIHNldFRleHR1cmVDb29yZHNcbiAqICBAcGFyYW0gdmFsdWUge0FycmF5fVxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuc2V0SW5kaWNlcyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnNldFZlcnRleEJ1ZmZlcignaW5kaWNlcycsIHZhbHVlKTtcbn07XG5cbi8qKlxuICogIFNldCB0aGUgV2ViR0wgZHJhd2luZyBwcmltaXRpdmUgZm9yIHRoaXMgZ2VvbWV0cnkuXG4gKiAgQG1ldGhvZCBzZXREcmF3VHlwZVxuICogIEBwYXJhbSB0eXBlIHtTdHJpbmd9XG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5zZXREcmF3VHlwZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuc3BlYy50eXBlID0gdmFsdWUudG9VcHBlckNhc2UoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQG1ldGhvZCBnZXRWZXJ0ZXhQb3NpdGlvbnNcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmdldFZlcnRleFBvc2l0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRWZXJ0ZXhCdWZmZXIoJ3BvcycpO1xufTtcblxuLyoqXG4gKiBAbWV0aG9kIGdldE5vcm1hbHNcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmdldE5vcm1hbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VmVydGV4QnVmZmVyKCdub3JtYWwnKTtcbn07XG5cbi8qKlxuICogQG1ldGhvZCBnZXRUZXh0dXJlQ29vcmRzXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5nZXRUZXh0dXJlQ29vcmRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmdldFZlcnRleEJ1ZmZlcigndGV4Q29vcmQnKTtcbn07XG5cbi8qKlxuICogQWxsb2NhdGVzIGFuIGVsZW1lbnQgYXJyYXlcbiAqXG4gKiBAbWV0aG9kIGdldEVudGl0eVxuICogXG4gKiBAcGFyYW0ge051bWJlcn0geCBvcmlnaW4gb24gdGhlIHgtYXhpcyBhcyBhIHBlcmNlbnRcbiAqXG4gKiBAY2hhaW5hYmxlXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5hZGRJbmRleEJ1ZmZlciA9IGZ1bmN0aW9uIGFkZEluZGV4QnVmZmVyKGJ1ZmZlck5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5zcGVjLmluZGV4QnVmZmVyc1tidWZmZXJOYW1lXSA9IHZhbHVlIHx8IFtdO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIGluZGV4IGJ1ZmZlciB3aXRoIGNvcnJlc3BvbmRpbmcgYnVmZmVyTmFtZS5cbiAqXG4gKiBAbWV0aG9kIGdldEluZGV4QnVmZmVyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IE5hbWUgb2YgaW5kZXhCdWZmZXIgdG8gYmUgcmV0cmlldmVkLlxuICovXG5cbkdlb21ldHJ5LnByb3RvdHlwZS5nZXRJbmRleEJ1ZmZlciA9IGZ1bmN0aW9uIGdldEluZGV4QnVmZmVyKGJ1ZmZlck5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5zcGVjLmluZGV4QnVmZmVyc1tidWZmZXJOYW1lXTtcbn07XG5cbkdlb21ldHJ5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEdlb21ldHJ5O1xuXG4vKipcbiAqIEdldHMgdGhlIG9yaWdpbiBvZiB0aGUgR2VvbWV0cnkuXG4gKlxuICogQG1ldGhvZCBnZXRPcmlnaW5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gMi1kaW1lbnNpb25hbCBhcnJheSByZXByZXNlbnRpbmcgdGhlIEdlb21ldHJ5J3Mgb3JpZ2luXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5nZXRPcmlnaW4gPSBmdW5jdGlvbiBnZXRPcmlnaW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuc3BlYy51bmlmb3Jtcy5vcmlnaW47XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgb3JpZ2luIG9mIHRoZSBHZW9tZXRyeS5cbiAqXG4gKiBAbWV0aG9kIHNldE9yaWdpblxuICogQGNoYWluYWJsZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IG9yaWdpbiBvbiB0aGUgeC1heGlzIGFzIGEgcGVyY2VudFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgb3JpZ2luIG9uIHRoZSB5LWF4aXMgYXMgYSBwZXJjZW50XG4gKi9cblxuR2VvbWV0cnkucHJvdG90eXBlLnNldE9yaWdpbiAgPSBmdW5jdGlvbiBzZXRPcmlnaW4oeCwgeSkge1xuICAgIGlmICgoeCAhPSBudWxsICYmICh4IDwgMCB8fCB4ID4gMSkpIHx8ICh5ICE9IG51bGwgJiYgKHkgPCAwIHx8IHkgPiAxKSkpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignT3JpZ2luIG11c3QgaGF2ZSBhbiB4IGFuZCB5IHZhbHVlIGJldHdlZW4gMCBhbmQgMScpO1xuXG4gICAgdGhpcy5zcGVjLnVuaWZvcm1zLm9yaWdpblswXSA9IHggIT0gbnVsbCA/IHggOiB0aGlzLnNwZWMudW5pZm9ybXMub3JpZ2luWzBdO1xuICAgIHRoaXMuc3BlYy51bmlmb3Jtcy5vcmlnaW5bMV0gPSB5ICE9IG51bGwgPyB5IDogdGhpcy5zcGVjLnVuaWZvcm1zLm9yaWdpblsxXTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHJlbmRlciBzcGVjaWZpY2F0aW9uIG9mIHRoZSBHZW9tZXRyeS5cbiAqXG4gKiBAbWV0aG9kICByZW5kZXJcbiAqIFxuICogQHJldHVybiB7T2JqZWN0fSByZW5kZXIgc3BlY2lmaWNhdGlvblxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0cmFuc2Zvcm0gPSB0aGlzLmdldEVudGl0eSgpLmdldENvbXBvbmVudChUUkFOU0ZPUk0pO1xuICAgIHZhciBvcGFjaXR5ID0gdGhpcy5nZXRFbnRpdHkoKS5nZXRDb21wb25lbnQoT1BBQ0lUWSk7XG4gICAgdmFyIHNpemUgPSB0aGlzLmdldEVudGl0eSgpLmdldENvbXBvbmVudChTSVpFKTtcbiAgICB2YXIgbWF0ZXJpYWwgPSB0aGlzLmdldEVudGl0eSgpLmdldENvbXBvbmVudChNQVRFUklBTFMpIHx8IHtjaHVua3M6IFtdfSA7XG5cbiAgICB0aGlzLnNwZWMudW5pZm9ybXMudHJhbnNmb3JtID0gdHJhbnNmb3JtLmdldEdsb2JhbE1hdHJpeCgpO1xuICAgIHRoaXMuc3BlYy51bmlmb3Jtcy5vcGFjaXR5ID0gb3BhY2l0eSA/IG9wYWNpdHkuX2dsb2JhbE9wYWNpdHkgOiAxO1xuICAgIHRoaXMuc3BlYy51bmlmb3Jtcy5zaXplID0gbm9ybWFsaXplU2l6ZSgodGhpcy5nZXRFbnRpdHkoKS5nZXRDb250ZXh0KCkgfHwge30pLl9zaXplLCBzaXplLmdldEdsb2JhbFNpemUoKSk7XG5cbiAgICBpZiAobWF0ZXJpYWwpIHRoaXMuc3BlYy50ZXh0dXJlID0gbWF0ZXJpYWwudGV4dHVyZTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hdGVyaWFsLmNodW5rcy5sZW5ndGg7IGkrKylcbiAgICAgICAgdGhpcy5zcGVjLnVuaWZvcm1zW21hdGVyaWFsLmNodW5rc1tpXS5uYW1lXSA9IDE7XG5cbiAgICBmb3IgKHZhciBuYW1lIGluIG1hdGVyaWFsLnVuaWZvcm1zKVxuICAgICAgICB0aGlzLnNwZWMudW5pZm9ybXNbbmFtZV0gPSBtYXRlcmlhbC51bmlmb3Jtc1tuYW1lXTtcblxuICAgIHJldHVybiB0aGlzLnNwZWM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgb3B0aW9ucyBvZiB0aGUgR2VvbWV0cnkuXG4gKlxuICogQG1ldGhvZCBzZXRPcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9iamVjdCBvZiBvcHRpb25zXG4gKi9cblxuR2VvbWV0cnkucHJvdG90eXBlLnNldE9wdGlvbnMgPSBmdW5jdGlvbiBzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5vcmlnaW4pIHRoaXMuc2V0T3JpZ2luKG9wdGlvbnMub3JpZ2luKTtcbn07XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVNpemUoY29udGV4dFNpemUsIHZhbCkge1xuICAgIGNvbnRleHRTaXplID0gY29udGV4dFNpemUgfHwgWzEsIDEsIDFdO1xuICAgIHZhciB4U2NhbGUgPSBjb250ZXh0U2l6ZVswXTtcbiAgICB2YXIgeVNjYWxlID0gY29udGV4dFNpemVbMV07XG5cbiAgICB2YXIgYXNwZWN0Q29ycmVjdGlvbiA9IDEgLyAoeFNjYWxlID4geVNjYWxlID8geVNjYWxlIDogeFNjYWxlKTtcblxuICAgIHJldHVybiBbXG4gICAgICAgIHZhbFswXSAqIGFzcGVjdENvcnJlY3Rpb24sXG4gICAgICAgIHZhbFsxXSAqIGFzcGVjdENvcnJlY3Rpb24sXG4gICAgICAgIHZhbFsyXSAqICBhc3BlY3RDb3JyZWN0aW9uXG4gICAgXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR2VvbWV0cnk7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogYWRuYW5AZmFtby51cywgam9zZXBoQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4vKipcbiAqIFNoYWRlciBpcyByZXNwb25zaWJsZSBmb3IgdHJhdmVyc2luZyB0aGUgbGlzdCBvZiBnZW9tZXRyaWVzXG4gKiBhbmQgY29udmVydGluZyB0aGVpciBzcGVjcyBpbnRvIGdsIGFwaSBjYWxscy5cbiAqXG4gKiBAY2xhc3MgIFNoYWRlclxuICovXG5cblxudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY29yZS9FbnRpdHlSZWdpc3RyeScpO1xudmFyIE1hdGVyaWFscyAgICAgID0gRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignTWF0ZXJpYWxzJyk7XG5cbnZhciBjaHVua3MgPSBbXTtcbnZhciBjaHVua01hcCA9IHt9O1xuXG52YXIgdmVydGV4V3JhcHBlciA9IFwidmVjNCBjbGlwc3BhY2UoaW4gdmVjNCBwb3MpIHtcXG4gIHJldHVybiB2ZWM0KChwb3MueCAvIHVfcmVzb2x1dGlvbi54KSAqIDIuLFxcbiAgICAgICAgICAgICAgKHBvcy55IC8gdV9yZXNvbHV0aW9uLnkpICogMi4sXFxuICAgICAgICAgICAgICBwb3MueiAvICh1X3Jlc29sdXRpb24ueSAqIDAuNSksXFxuICAgICAgICAgICAgICBwb3Mudyk7XFxufVxcblxcbm1hdDMgZ2V0Tm9ybWFsTWF0cml4KGluIG1hdDQgYSkge1xcbiAgbWF0MyBtYXROb3JtO1xcblxcbiAgZmxvYXQgYTAwID0gYVswXVswXSwgYTAxID0gYVswXVsxXSwgYTAyID0gYVswXVsyXSwgYTAzID0gYVswXVszXSxcXG4gICAgYTEwID0gYVsxXVswXSwgYTExID0gYVsxXVsxXSwgYTEyID0gYVsxXVsyXSwgYTEzID0gYVsxXVszXSxcXG4gICAgYTIwID0gYVsyXVswXSwgYTIxID0gYVsyXVsxXSwgYTIyID0gYVsyXVsyXSwgYTIzID0gYVsyXVszXSxcXG4gICAgYTMwID0gYVszXVswXSwgYTMxID0gYVszXVsxXSwgYTMyID0gYVszXVsyXSwgYTMzID0gYVszXVszXSxcXG4gICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxcbiAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXFxuICAgIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCxcXG4gICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxcbiAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXFxuICAgIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMixcXG4gICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxcbiAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXFxuICAgIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCxcXG4gICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxcbiAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXFxuICAgIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMixcXG5cXG4gICAgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xcblxcbiAgZGV0ID0gMS4wIC8gZGV0O1xcblxcbiAgbWF0Tm9ybVswXVswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xcbiAgbWF0Tm9ybVswXVsxXSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xcbiAgbWF0Tm9ybVswXVsyXSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xcblxcbiAgbWF0Tm9ybVsxXVswXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVsxXSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVsyXSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xcblxcbiAgbWF0Tm9ybVsyXVswXSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVsxXSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVsyXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xcblxcbiAgcmV0dXJuIG1hdE5vcm07XFxufVxcbi8vZGVmaW5lX3ZzQ2h1bmtcXG52ZWM0IHBpcGVsaW5lX3BvcyhpbiB2ZWM0IHBvcykge1xcbiAgLy9hcHBseV92c0NodW5rXFxuICBtYXQ0IHRyeCA9IHVfdHJhbnNmb3JtO1xcblxcbiAgdHJ4ID0gbWF0NChcXG4gICAgMSwgMCwgMCwgMCxcXG4gICAgMCwtMSwgMCwgMCxcXG4gICAgMCwgMCwgMSwgMCxcXG4gICAgMCwgMCwgMCwgMVxcbiAgKSAqIHRyeDtcXG5cXG4gIHBvcy54eXogKj0gdV9zaXplLnh5ejtcXG5cXG4gIHRyeFszXSA9IGNsaXBzcGFjZSh0cnhbM10pO1xcbiAgZmxvYXQgeFQgPSB0cnhbM11bMF07XFxuICBmbG9hdCB5VCA9IHRyeFszXVsxXTtcXG5cXG4gIHRyeFszXVswXSA9IDAuMDtcXG4gIHRyeFszXVsxXSA9IDAuMDtcXG4gIFxcbiAgcG9zID0gdV9wZXJzcGVjdGl2ZSAqIHRyeCAqIHBvcztcXG4gIHBvcy54eSArPSB2ZWMyKHhULCB5VCk7XFxuICBwb3MueiAgKj0gLTEuO1xcbiAgcmV0dXJuIHBvcztcXG59XFxuXFxudm9pZCBtYWluKCkge1xcbiAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7XFxuICB2X25vcm1hbCA9IGFfbm9ybWFsO1xcbiAgZ2xfUG9zaXRpb24gPSBwaXBlbGluZV9wb3MoYV9wb3MpO1xcbn1cIjtcbnZhciBmcmFnbWVudFdyYXBwZXIgPSBcIiNkZWZpbmUgdGltZSB1X3RpbWUgKiAuMDAxXFxuZmxvYXQgbnNpbihmbG9hdCB4KSB7XFxuICByZXR1cm4gKHNpbih4KSArIDEuMCkgLyAyLjA7XFxufVxcblxcbnZlYzMgZG9SYW5kb20odmVjMiBwLCBmbG9hdCBpLCB2ZWMzIHJhbmRDb2xvciwgdmVjNCByYW5kUmVjdCkge1xcbiAgZmxvYXQgeCA9IHAueDtcXG4gIGZsb2F0IHkgPSBwLnk7XFxuICB2ZWMzIHJnYiA9IHZlYzMoMC4wKTtcXG4gIGZsb2F0IGNvbG9yID0gMC4wO1xcbiBcXG4gIGZsb2F0IGR4ID0geCAtIHJhbmRSZWN0Lng7XFxuICAgIGZsb2F0IGR5ID0geSAtIG1vZChyYW5kUmVjdC55ICsgbnNpbih0aW1lKSwgMS4wKSpuc2luKHRpbWUqaS8yMC4wKTtcXG4gIGZsb2F0IGRpc3QgPSBzcXJ0KGR4ICogZHggKyBkeSAqIGR5KTtcXG5cXG4gIGZsb2F0IGUgPSAxLjAgLyBkaXN0IC8gMTAwMC4wO1xcbiAgaWYgKGRpc3QgPCAwLjEpIHtcXG4gICAgcmdiLnIgPSBlICogcmFuZENvbG9yLnI7XFxuICAgIHJnYi5nID0gZSAqIHJhbmRDb2xvci5nO1xcbiAgICByZ2IuYiA9IGUgKiByYW5kQ29sb3IuYjtcXG4gIH1cXG4gIHJldHVybiByZ2I7XFxufVxcbmZsb2F0IHN0YXRlMCh2ZWMyIHgpIHtcXG4gIHJldHVybiB0ZXh0dXJlMkQodV9pbWFnZSwgZnJhY3QoeCAvIHVfcmVzb2x1dGlvbi54eSkpLmE7XFxufVxcblxcbmZsb2F0IHN0YXRlMSh2ZWMyIHgpIHtcXG4gIHJldHVybiB0ZXh0dXJlMkQodV9pbWFnZTIsIGZyYWN0KHggLyB1X3Jlc29sdXRpb24ueHkpKS5hO1xcbn1cXG5cXG5mbG9hdCBsYXBsYWNpYW4odmVjMiB4KSB7XFxuICByZXR1cm4gKHN0YXRlMCh4K3ZlYzIoLTEsMCkpICtcXG4gICAgICAgICAgc3RhdGUwKHgrdmVjMigxLDApKSArXFxuICAgICAgICAgIHN0YXRlMCh4K3ZlYzIoMCwxKSkgK1xcbiAgICAgICAgICBzdGF0ZTAoeCt2ZWMyKDAsLTEpKSkgK1xcbiAgICBzdGF0ZTAoeCk7XFxufVxcblxcblxcbmZsb2F0IGhhc2goIGZsb2F0IG4gKSB7XFxuICByZXR1cm4gZnJhY3Qoc2luKG4pKjQzNzU4LjU0NTMpO1xcbn1cXG5mbG9hdCBub2lzZSggaW4gdmVjMyB4ICkge1xcbiAgdmVjMyBwID0gZmxvb3IoeCk7XFxuICB2ZWMzIGYgPSBmcmFjdCh4KTtcXG5cXG4gIGYgPSBmKmYqKDMuMC0yLjAqZik7XFxuICBmbG9hdCBuID0gcC54ICsgcC55KjU3LjAgKyAxMTMuMCpwLno7XFxuICByZXR1cm4gbWl4KG1peChtaXgoIGhhc2gobisgIDAuMCksIGhhc2gobisgIDEuMCksZi54KSxcXG4gICAgICAgICAgICAgICAgIG1peCggaGFzaChuKyA1Ny4wKSwgaGFzaChuKyA1OC4wKSxmLngpLGYueSksXFxuICAgICAgICAgICAgIG1peChtaXgoIGhhc2gobisxMTMuMCksIGhhc2gobisxMTQuMCksZi54KSxcXG4gICAgICAgICAgICAgICAgIG1peCggaGFzaChuKzE3MC4wKSwgaGFzaChuKzE3MS4wKSxmLngpLGYueSksZi56KTtcXG59XFxuXFxudmVjNCBtYXAoIGluIHZlYzMgcCApe1xcbiAgZmxvYXQgZCA9IDAuMiAtIHAueTtcXG5cXG4gIHZlYzMgcSA9IHAgLSB2ZWMzKDEuMCwwLjEsMC4wKSoodV90aW1lKi4wMDAyKTtcXG4gIGZsb2F0IGYgPSAwLjUwMDAqbm9pc2UoIHEgKTsgcSA9IHEqMi4wMjtcXG4gIGYgKz0gMC4yNTAwKm5vaXNlKCBxICk7IHEgPSBxKjIuMDM7XFxuICBmICs9IDAuMTI1MCpub2lzZSggcSApOyBxID0gcSoyLjAxO1xcbiAgZiArPSAwLjA2MjUqbm9pc2UoIHEgKTtcXG5cXG4gIGQgKz0gMy4wICogZjtcXG5cXG4gIGQgPSBjbGFtcCggZCwgMC4wLCAxLjAgKTtcXG4gICAgXFxuICB2ZWM0IHJlcyA9IHZlYzQoIGQgKTtcXG5cXG4gIHJlcy54eXogPSBtaXgoIDEuMTUqdmVjMygxLjAsMC45NSwwLjgpLCB2ZWMzKDAuNywwLjcsMC43KSwgcmVzLnggKTtcXG4gICAgXFxuICByZXR1cm4gcmVzO1xcbn1cXG5cXG52ZWMzIHN1bmRpciA9IHZlYzMoLTEuMCwwLjAsMC4wKTtcXG52ZWM0IHJheW1hcmNoKCBpbiB2ZWMzIHJvLCBpbiB2ZWMzIHJkICkge1xcbiAgdmVjNCBzdW0gPSB2ZWM0KDAsIDAsIDAsIDApO1xcbiAgZmxvYXQgdCA9IDAuMDtcXG4gIGZvcihpbnQgaT0wOyBpPDIwOyBpKyspIHtcXG4gICAgdmVjMyBwb3MgPSBybyArIHQqcmQ7XFxuICAgIHZlYzQgY29sID0gbWFwKCBwb3MgKTtcXG5cXG4gICAgZmxvYXQgZGlmID0gIGNsYW1wKChjb2wudyAtIG1hcChwb3MrMC4zKnN1bmRpcikudykvMC42LCAwLjAsIDEuMCApO1xcbiAgICB2ZWMzIGxpbiA9IHZlYzMoMC42NSwwLjY4LDAuNykqMS4zNSArIDAuNDUqdmVjMygwLjcsIDAuNSwgMC4zKSpkaWY7XFxuICAgIGNvbC54eXogKj0gbGluO1xcbiAgICBcXG4gICAgY29sLmEgKj0gMC45O1xcbiAgICBjb2wucmdiICo9IGNvbC5hO1xcblxcbiAgICBzdW0gPSBzdW0gKyBjb2wqKDEuMCAtIHN1bS5hKTsgICAgXFxuICAgIHQgKz0gbWF4KDAuMSwwLjAyNSp0KTtcXG4gIH1cXG5cXG4gIHN1bS54eXogLz0gKDAuMDAxK3N1bS53KTtcXG5cXG4gIHJldHVybiBjbGFtcCggc3VtLCAwLjAsIDEuMCApO1xcbn1cXG5cXG4vL2RlZmluZV9mc0NodW5rXFxudmVjNCBwaXBlbGluZV9jb2xvcihpbiB2ZWM0IGNvbG9yKSB7XFxuICAgIC8vYXBwbHlfZnNDaHVua1xcbiAgICByZXR1cm4gY29sb3I7XFxufVxcblxcbnZvaWQgbWFpbigpIHtcXG4gICAgdmVjNCBjb2xvciA9IHZlYzQoMCwgMCwgMCwgdV9vcGFjaXR5KTtcXG4gICAgY29sb3IgPSBwaXBlbGluZV9jb2xvcihjb2xvcik7XFxuICAgIGdsX0ZyYWdDb2xvciA9IGNvbG9yO1xcbn1cIjtcblxudmFyIHVuaWZvcm1zID0ge1xuICAgIHN0YXRlU2l6ZTogWzAsIDBdLFxuICAgIHRyYW5zZm9ybTogWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdLFxuICAgIHBlcnNwZWN0aXZlOiBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0sXG4gICAgb3BhY2l0eTogMSxcbiAgICBtb3VzZTogWzAsIDBdLFxuICAgIG9yaWdpbjogWy41LCAuNV0sXG4gICAgcmVzb2x1dGlvbjogWzAsIDAsIDBdLFxuICAgIHNpemU6IFsxLCAxLCAxXSxcbiAgICB0aW1lOiAwLFxuICAgIGltYWdlOiB0cnVlLFxuICAgIGltYWdlMjogdHJ1ZSxcbiAgICBsaWdodFBvc2l0aW9uczogWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgIGxpZ2h0Q29sb3JzOiBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgY2FtZXJhUG9zOiBbMCwgMCwgMF0sXG4gICAgbnVtTGlnaHRzOiAwXG59O1xuXG52YXIgYXR0cmlidXRlcyA9IHtcbiAgICBwb3M6IFswLCAwLCAwLCAwXSxcbiAgICB0ZXhDb29yZDogWzAsIDBdLFxuICAgIG5vcm1hbDogWzAsIDAsIDFdXG59O1xuXG52YXIgdmFyeWluZ3MgPSB7XG4gICAgdGV4Q29vcmQ6IFswLCAwXSxcbiAgICBub3JtYWw6IFswLCAwLCAwXSxcbiAgICBsaWdodFdlaWdodGluZzogWzAsIDAsIDBdXG59O1xuXG52YXIgY2FjaGVkVW5pZm9ybXMgID0ge307XG52YXIgZmxhZ2dlZFVuaWZvcm1zID0gW107XG5cbnZhciBoZWFkZXIgPSAncHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuJztcblxuZnVuY3Rpb24gU2hhZGVyKGdsKSB7XG4gICAgdGhpcy5nbCA9IGdsO1xuICAgIHRoaXMucmVzZXRQcm9ncmFtKCk7XG59XG5cblNoYWRlci5wcm90b3R5cGUucmVzZXRQcm9ncmFtID0gZnVuY3Rpb24gcmVzZXRQcm9ncmFtKCkge1xuICAgIHZhciB2c0NodW5rRGVmaW5lcyA9IFtdO1xuICAgIHZhciB2c0NodW5rQXBwbGllcyA9IFtdO1xuICAgIHZhciBmc0NodW5rRGVmaW5lcyA9IFtdO1xuICAgIHZhciBmc0NodW5rQXBwbGllcyA9IFtdO1xuXG4gICAgdmFyIHZlcnRleEhlYWRlciA9IFtoZWFkZXJdO1xuICAgIHZhciBmcmFnbWVudEhlYWRlciA9IFtoZWFkZXJdO1xuXG4gICAgdGhpcy51bmlmb3JtTG9jYXRpb25zID0ge307XG5cbiAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7fTtcbiAgICB0aGlzLnVuaWZvcm1zID0gdW5pZm9ybXM7XG4gICAgZmxhZ2dlZFVuaWZvcm1zID0gW107XG5cbiAgICBNYXRlcmlhbHMuZm9yRWFjaChmdW5jdGlvbiAocmVuZGVyTm9kZSkge1xuICAgICAgICB2YXIgbWF0ZXJpYWwgPSByZW5kZXJOb2RlLmdldENvbXBvbmVudCgnbWF0ZXJpYWwnKSwgbmFtZTtcblxuICAgICAgICBmb3IgKG5hbWUgaW4gbWF0ZXJpYWwudW5pZm9ybXMpIHVuaWZvcm1zW25hbWVdID0gdW5pZm9ybXNbbmFtZV0gfHwgbWF0ZXJpYWwudW5pZm9ybXNbbmFtZV07XG5cbiAgICAgICAgZm9yIChuYW1lIGluIG1hdGVyaWFsLnZhcnlpbmdzKSB2YXJ5aW5nc1tuYW1lXSA9IHZhcnlpbmdzW25hbWVdIHx8IG1hdGVyaWFsLnZhcnlpbmdzW25hbWVdO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWF0ZXJpYWwuY2h1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2h1bmsgPSBtYXRlcmlhbC5jaHVua3NbaV07XG4gICAgICAgICAgICBuYW1lID0gY2h1bmsubmFtZTtcblxuICAgICAgICAgICAgaWYgKGZsYWdnZWRVbmlmb3Jtcy5pbmRleE9mKG5hbWUpICE9PSAtMSkgY29udGludWU7XG5cblxuICAgICAgICAgICAgaWYgKGNodW5rLnZzRGVmaW5lcykgdnNDaHVua0RlZmluZXMucHVzaChjaHVuay52c0RlZmluZXMpO1xuICAgICAgICAgICAgaWYgKGNodW5rLmZzRGVmaW5lcykgZnNDaHVua0RlZmluZXMucHVzaChjaHVuay5mc0RlZmluZXMpO1xuXG4gICAgICAgICAgICBpZiAoY2h1bmsudnMpIHtcbiAgICAgICAgICAgICAgICB2c0NodW5rRGVmaW5lcy5wdXNoKCd2b2lkICcgKyBuYW1lICsgJyhpbm91dCB2ZWM0IHBvcykgeyAnICsgY2h1bmsudnMgKyAnIH1cXG4nKTtcbiAgICAgICAgICAgICAgICB2c0NodW5rQXBwbGllcy5wdXNoKCdpZiAodV8nICsgbmFtZSArJz09IDEuKScgKyBuYW1lICsgJyhwb3MpO1xcbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2h1bmsuZnMpIHtcbiAgICAgICAgICAgICAgICBmc0NodW5rRGVmaW5lcy5wdXNoKCd2b2lkICcgKyBuYW1lICsgJyhpbm91dCB2ZWM0IGNvbG9yKSB7ICcgKyBjaHVuay5mcyArICcgfVxcbicpO1xuICAgICAgICAgICAgICAgIGZzQ2h1bmtBcHBsaWVzLnB1c2goJ2lmICh1XycgKyBuYW1lICsnPT0gMS4pJyArIG5hbWUgKyAnKGNvbG9yKTtcXG4nKTsgICAgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMudW5pZm9ybXNbbmFtZV0gPSAwO1xuXG4gICAgICAgICAgICBmbGFnZ2VkVW5pZm9ybXMucHVzaChuYW1lKTtcbiAgICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgXG4gICAgZm9yICh2YXIgbmFtZSAgaW4gdGhpcy51bmlmb3Jtcykge1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgndW5pZm9ybSAnICsgZGF0YVRvVW5pZm9ybVR5cGUodGhpcy51bmlmb3Jtc1tuYW1lXSkgKyAnIHVfJyArIG5hbWUgKyAnO1xcbicpO1xuICAgICAgICBmcmFnbWVudEhlYWRlci5wdXNoKCd1bmlmb3JtICcgKyBkYXRhVG9Vbmlmb3JtVHlwZSh0aGlzLnVuaWZvcm1zW25hbWVdKSArICcgdV8nICsgbmFtZSArICc7XFxuJyk7XG4gICAgfVxuXG4gICAgZm9yIChuYW1lIGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ2F0dHJpYnV0ZSAnICsgZGF0YVRvVW5pZm9ybVR5cGUoYXR0cmlidXRlc1tuYW1lXSkgKyAnICcgKyAnYV8nICsgbmFtZSArICc7XFxuJyk7XG4gICAgfVxuXG4gICAgZm9yIChuYW1lIGluIHZhcnlpbmdzKSB7XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd2YXJ5aW5nICcgKyBkYXRhVG9Vbmlmb3JtVHlwZSh2YXJ5aW5nc1tuYW1lXSkgKyAnICcgKyAndl8nICsgbmFtZSArICc7XFxuJyk7XG4gICAgICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3ZhcnlpbmcgJyArIGRhdGFUb1VuaWZvcm1UeXBlKHZhcnlpbmdzW25hbWVdKSArICcgJyArICd2XycgKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICB2YXIgdmVydGV4U291cmNlID0gdmVydGV4SGVhZGVyLmpvaW4oJ1xcbicpICsgdmVydGV4V3JhcHBlclxuICAgICAgICAgICAgLnJlcGxhY2UoJy8vZGVmaW5lX3ZzQ2h1bmsnLCB2c0NodW5rRGVmaW5lcy5qb2luKCdcXG4nKSlcbiAgICAgICAgICAgIC5yZXBsYWNlKCcvL2FwcGx5X3ZzQ2h1bmsnLCB2c0NodW5rQXBwbGllcy5qb2luKCdcXG4nKSk7XG5cbiAgICB2YXIgZnJhZ21lbnRTb3VyY2UgPSBmcmFnbWVudEhlYWRlci5qb2luKCdcXG4nKSArIGZyYWdtZW50V3JhcHBlclxuICAgICAgICAgICAgLnJlcGxhY2UoJy8vZGVmaW5lX2ZzQ2h1bmsnLCBmc0NodW5rRGVmaW5lcy5qb2luKCdcXG4nKSlcbiAgICAgICAgICAgIC5yZXBsYWNlKCcvL2FwcGx5X2ZzQ2h1bmsnLCBmc0NodW5rQXBwbGllcy5qb2luKCdcXG4nKSk7XG4gICAgXG4gICAgdmFyIHByb2dyYW0gPSB0aGlzLmdsLmNyZWF0ZVByb2dyYW0oKTtcbiAgICBcbiAgICB0aGlzLmdsLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBjb21waWxlU291cmNlKHRoaXMuZ2wsIHRoaXMuZ2wuVkVSVEVYX1NIQURFUiwgdmVydGV4U291cmNlKSk7XG4gICAgdGhpcy5nbC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgY29tcGlsZVNvdXJjZSh0aGlzLmdsLCB0aGlzLmdsLkZSQUdNRU5UX1NIQURFUiwgZnJhZ21lbnRTb3VyY2UpKTtcbiAgICB0aGlzLmdsLmxpbmtQcm9ncmFtKHByb2dyYW0pO1xuXG4gICAgaWYgKCEgdGhpcy5nbC5nZXRQcm9ncmFtUGFyYW1ldGVyKHByb2dyYW0sIHRoaXMuZ2wuTElOS19TVEFUVVMpKVxuICAgICAgICBjb25zb2xlLmVycm9yKCdsaW5rIGVycm9yOiAnICsgdGhpcy5nbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG5cbiAgICBlbHNlIHRoaXMucHJvZ3JhbSA9IHByb2dyYW07XG59XG5cblNoYWRlci5wcm90b3R5cGUudW5pZm9ybUlzQ2FjaGVkID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgaWYoY2FjaGVkVW5pZm9ybXNbbmFtZV0gPT0gbnVsbCkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcbiAgICAgICAgICAgIGNhY2hlZFVuaWZvcm1zW25hbWVdID0gbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRVbmlmb3Jtc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZihBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZSBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSl7XG4gICAgICAgIHZhciBpID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBpZih2YWx1ZVtpXSAhPT0gY2FjaGVkVW5pZm9ybXNbbmFtZV1baV0pIHtcbiAgICAgICAgICAgICAgICBjYWNoZWRVbmlmb3Jtc1tuYW1lXSA9IG5ldyBGbG9hdDMyQXJyYXkodmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVsc2UgaWYoY2FjaGVkVW5pZm9ybXNbbmFtZV0gIT09IHZhbHVlKSB7XG4gICAgICAgIGNhY2hlZFVuaWZvcm1zW25hbWVdID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuU2hhZGVyLnByb3RvdHlwZS5zZXRVbmlmb3JtcyA9IGZ1bmN0aW9uIChlbnRpdHlVbmlmb3Jtcykge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG5cbiAgICBpZiAoISB0aGlzLnByb2dyYW0pIHJldHVybjtcblxuICAgIGdsLnVzZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcblxuICAgIGZvciAodmFyIG5hbWUgaW4gZW50aXR5VW5pZm9ybXMpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy51bmlmb3JtTG9jYXRpb25zW25hbWVdIHx8IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sICd1XycgKyBuYW1lKTtcbiAgICAgICAgaWYgKCEgbG9jYXRpb24pIGNvbnRpbnVlO1xuXG4gICAgICAgIHRoaXMudW5pZm9ybUxvY2F0aW9uc1tuYW1lXSA9IGxvY2F0aW9uO1xuICAgICAgICB2YXIgdmFsdWUgPSBlbnRpdHlVbmlmb3Jtc1tuYW1lXTtcblxuICAgICAgICAvLyBpZih0aGlzLnVuaWZvcm1Jc0NhY2hlZChuYW1lLCB2YWx1ZSkpIGNvbnRpbnVlO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZSBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICAgICAgc3dpdGNoICh2YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6IGdsLnVuaWZvcm0xZnYobG9jYXRpb24sIG5ldyBGbG9hdDMyQXJyYXkodmFsdWUpKTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyOiBnbC51bmlmb3JtMmZ2KGxvY2F0aW9uLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzogZ2wudW5pZm9ybTNmdihsb2NhdGlvbiwgbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSkpOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IGdsLnVuaWZvcm00ZnYobG9jYXRpb24sIG5ldyBGbG9hdDMyQXJyYXkodmFsdWUpKTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA5OiBnbC51bmlmb3JtTWF0cml4M2Z2KGxvY2F0aW9uLCBmYWxzZSwgbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSkpOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE2OiBnbC51bmlmb3JtTWF0cml4NGZ2KGxvY2F0aW9uLCBmYWxzZSwgbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSkpOyBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB0aHJvdyAnY2FudCBsb2FkIHVuaWZvcm0gXCInICsgbmFtZSArICdcIiBvZiBsZW5ndGggOicgKyB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoISBpc05hTihwYXJzZUZsb2F0KHZhbHVlKSkgJiYgaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAobmFtZSA9PSAnaW1hZ2UyJykgXG4gICAgICAgICAgICAgICAgZ2wudW5pZm9ybTFpKGxvY2F0aW9uLCB2YWx1ZSk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgZ2wudW5pZm9ybTFmKGxvY2F0aW9uLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyAnc2V0IHVuaWZvcm0gXCInICsgbmFtZSArICdcIiB0byBpbnZhbGlkIHR5cGUgOicgKyB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZsYWdnZWRVbmlmb3Jtcy5mb3JFYWNoKGZ1bmN0aW9uIChmbGFnKSB7XG4gICAgICAgIGlmICghIGVudGl0eVVuaWZvcm1zW2ZsYWddKSAge1xuICAgICAgICAgICAgLy8gaWYoY2FjaGVkVW5pZm9ybXNbZmxhZ10gIT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBjYWNoZWRVbmlmb3Jtc1tmbGFnXSA9IDA7XG4gICAgICAgICAgICAgICAgZ2wudW5pZm9ybTFmKHRoaXMudW5pZm9ybUxvY2F0aW9uc1tmbGFnXSwgMCk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuZnVuY3Rpb24gZGF0YVRvVW5pZm9ybVR5cGUodHlwZSkge1xuICAgIGlmICh0eXBlID09PSB0cnVlKSByZXR1cm4gJ3NhbXBsZXIyRCc7XG4gICAgaWYgKCEgQXJyYXkuaXNBcnJheSh0eXBlKSkgcmV0dXJuICdmbG9hdCc7XG4gICAgdmFyIGxlbmd0aCA9IHR5cGUubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggPCA1KSByZXR1cm4gJ3ZlYycgKyBsZW5ndGg7XG4gICAgZWxzZSByZXR1cm4gJ21hdCcgKyAoTWF0aC5zcXJ0KHR5cGUubGVuZ3RoKSB8IDApO1xufVxuXG5mdW5jdGlvbiBjb21waWxlU291cmNlKGdsLCB0eXBlLCBzb3VyY2UpIHtcbiAgICB2YXIgc2hhZGVyID0gZ2wuY3JlYXRlU2hhZGVyKHR5cGUpO1xuICAgIGdsLnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSk7XG4gICAgZ2wuY29tcGlsZVNoYWRlcihzaGFkZXIpO1xuICAgIGlmICghZ2wuZ2V0U2hhZGVyUGFyYW1ldGVyKHNoYWRlciwgZ2wuQ09NUElMRV9TVEFUVVMpKSB7XG4gICAgICAgIHZhciBpID0gMjtcbiAgICAgICAgY29uc29sZS5sb2coJzE6JyArIHNvdXJjZS5yZXBsYWNlKC9cXG4vZywgZnVuY3Rpb24gKCkgeyByZXR1cm4gJ1xcbicgKyAoaSsrKSArICc6ICc7IH0pKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignY29tcGlsZSBlcnJvcjogJyArIGdsLmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSk7XG4gICAgfVxuICAgIHJldHVybiBzaGFkZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2hhZGVyO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGFkbmFuQGZhbW8udXMsIGpvc2VwaEBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRleHR1cmUgaXMgYSBwcml2YXRlIGNsYXNzIHRoYXQgc3RvcmVzIGltYWdlIGRhdGFcbiAqIHRvIGJlIGFjY2Vzc2VkIGZyb20gYSBzaGFkZXIgb3IgdXNlZCBhcyBhIHJlbmRlciB0YXJnZXQuXG4gKlxuICogQGNsYXNzIFRleHR1cmVcbiAqIEBjb25zdHJ1Y3RvclxuICogXG4gKi9cblxuZnVuY3Rpb24gVGV4dHVyZShnbCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuaWQgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gICAgdmFyIHdpZHRoID0gdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMDtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCAwO1xuICAgIHRoaXMuZm9ybWF0ID0gb3B0aW9ucy5mb3JtYXQgfHwgZ2wuUkdCQTtcbiAgICB0aGlzLnR5cGUgPSBvcHRpb25zLnR5cGUgfHwgZ2wuVU5TSUdORURfQllURTtcbiAgICB0aGlzLmdsID0gZ2w7XG5cbiAgICBnbC5waXhlbFN0b3JlaShnbC5VTlBBQ0tfRkxJUF9ZX1dFQkdMLCB0cnVlKTtcbiAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmlkKTtcbiAgICBcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUixcbiAgICAgICAgICAgICAgICAgICAgIGdsW29wdGlvbnMuZmlsdGVyIHx8IG9wdGlvbnMubWFnRmlsdGVyXSB8fCBnbC5ORUFSRVNUKTtcblxuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLFxuICAgICAgICAgICAgICAgICAgICAgZ2xbb3B0aW9ucy5maWx0ZXIgfHwgb3B0aW9ucy5taW5GaWx0ZXJdIHx8IGdsLk5FQVJFU1QpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUyxcbiAgICAgICAgICAgICAgICAgICAgIGdsW29wdGlvbnMud3JhcCB8fCBvcHRpb25zLndyYXBTXSB8fCBnbC5DTEFNUF9UT19FREdFKTtcblxuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsXG4gICAgICAgICAgICAgICAgICAgICBnbFtvcHRpb25zLndyYXAgfHwgb3B0aW9ucy53cmFwU10gfHwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cbiAgICBnbC50ZXhJbWFnZTJEKGdsLlRFWFRVUkVfMkQsIDAsIHRoaXMuZm9ybWF0LCB3aWR0aCwgaGVpZ2h0LCAwLCB0aGlzLmZvcm1hdCwgdGhpcy50eXBlLCBudWxsKTtcblxuICAgIGlmIChvcHRpb25zLm1pbkZpbHRlciAmJiBvcHRpb25zLm1pbkZpbHRlciAhPSBnbC5ORUFSRVNUICYmIG9wdGlvbnMubWluRmlsdGVyICE9IGdsLkxJTkVBUikge1xuICAgICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEKTtcbiAgICB9XG59XG5cblRleHR1cmUucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiBiaW5kKHVuaXQpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTAgKyAodW5pdCB8fCAwKSk7XG4gICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5pZCk7XG59O1xuXG5UZXh0dXJlLnByb3RvdHlwZS51bmJpbmQgPSBmdW5jdGlvbiB1bmJpbmQodW5pdCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCArICh1bml0IHx8IDApKTtcbiAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcbn07XG5cblRleHR1cmUucHJvdG90eXBlLnNldEltYWdlID0gZnVuY3Rpb24gc2V0SW1hZ2UoaW1nKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICBjb25zb2xlLmxvZyhpbWcpO1xuICAgIGdsLnRleEltYWdlMkQoZ2wuVEVYVFVSRV8yRCwgMCwgdGhpcy5mb3JtYXQsIHRoaXMuZm9ybWF0LCB0aGlzLnR5cGUsIGltZyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZXh0dXJlLnByb3RvdHlwZS5yZWFkQmFjayA9IGZ1bmN0aW9uIHJlYWRCYWNrKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHggPSB4IHx8IDA7XG4gICAgeSA9IHkgfHwgMDtcbiAgICB3aWR0aCA9IHdpZHRoIHx8IHRoaXMud2lkdGg7XG4gICAgaGVpZ2h0ID0gaGVpZ2h0IHx8IHRoaXMuaGVpZ2h0O1xuICAgIHZhciBmYiA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG4gICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmYik7XG4gICAgZ2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoZ2wuRlJBTUVCVUZGRVIsIGdsLkNPTE9SX0FUVEFDSE1FTlQwLCBnbC5URVhUVVJFXzJELCB0aGlzLmlkLCAwKTtcbiAgICBpZiAoZ2wuY2hlY2tGcmFtZWJ1ZmZlclN0YXR1cyhnbC5GUkFNRUJVRkZFUikgPT0gZ2wuRlJBTUVCVUZGRVJfQ09NUExFVEUpIHtcbiAgICAgICAgdmFyIHBpeGVscyA9IG5ldyBVaW50OEFycmF5KHdpZHRoICogaGVpZ2h0ICogNCk7XG4gICAgICAgIGdsLnJlYWRQaXhlbHMoeCwgeSwgd2lkdGgsIGhlaWdodCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgcGl4ZWxzKTtcbiAgICB9XG4gICAgcmV0dXJuIHBpeGVscztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dHVyZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gbXVsdGlwbHkob3V0cHV0QXJyYXksIGxlZnQsIHJpZ2h0KSB7XG4gICAgdmFyIGEwMCA9IGxlZnRbMF0sICBhMDEgPSBsZWZ0WzFdLCAgYTAyID0gbGVmdFsyXSwgIGEwMyA9IGxlZnRbM10sXG4gICAgICAgIGExMCA9IGxlZnRbNF0sICBhMTEgPSBsZWZ0WzVdLCAgYTEyID0gbGVmdFs2XSwgIGExMyA9IGxlZnRbN10sXG4gICAgICAgIGEyMCA9IGxlZnRbOF0sICBhMjEgPSBsZWZ0WzldLCAgYTIyID0gbGVmdFsxMF0sIGEyMyA9IGxlZnRbMTFdLFxuICAgICAgICBhMzAgPSBsZWZ0WzEyXSwgYTMxID0gbGVmdFsxM10sIGEzMiA9IGxlZnRbMTRdLCBhMzMgPSBsZWZ0WzE1XTtcbiAgICBcbiAgICB2YXIgYjAgPSByaWdodFswXSwgYjEgPSByaWdodFsxXSwgYjIgPSByaWdodFsyXSwgYjMgPSByaWdodFszXTsgXG5cbiAgICBvdXRwdXRBcnJheVswXSA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXRwdXRBcnJheVsxXSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXRwdXRBcnJheVsyXSA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXRwdXRBcnJheVszXSA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcbiAgICBcbiAgICBiMCA9IHJpZ2h0WzRdOyBiMSA9IHJpZ2h0WzVdOyBiMiA9IHJpZ2h0WzZdOyBiMyA9IHJpZ2h0WzddO1xuXG4gICAgb3V0cHV0QXJyYXlbNF0gPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0cHV0QXJyYXlbNV0gPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0cHV0QXJyYXlbNl0gPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0cHV0QXJyYXlbN10gPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG4gICAgXG4gICAgYjAgPSByaWdodFs4XTsgYjEgPSByaWdodFs5XTsgYjIgPSByaWdodFsxMF07IGIzID0gcmlnaHRbMTFdO1xuXG4gICAgb3V0cHV0QXJyYXlbOF0gID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dHB1dEFycmF5WzldICA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXRwdXRBcnJheVsxMF0gPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0cHV0QXJyYXlbMTFdID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuICAgIFxuICAgIGIwID0gcmlnaHRbMTJdOyBiMSA9IHJpZ2h0WzEzXTsgYjIgPSByaWdodFsxNF07IGIzID0gcmlnaHRbMTVdO1xuXG4gICAgb3V0cHV0QXJyYXlbMTJdID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dHB1dEFycmF5WzEzXSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXRwdXRBcnJheVsxNF0gPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0cHV0QXJyYXlbMTVdID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuICAgIHJldHVybiBvdXRwdXRBcnJheTtcbn1cblxuXG5mdW5jdGlvbiBnZXRUcmFuc2xhdGlvbkZyb21NdWx0aXBsaWNhdGlvbihvdXRwdXRBcnJheSwgbGVmdCwgcmlnaHQpIHtcbiAgICB2YXIgYTAwID0gbGVmdFswXSwgIGEwMSA9IGxlZnRbMV0sXG4gICAgICAgIGExMCA9IGxlZnRbNF0sICBhMTEgPSBsZWZ0WzVdLFxuICAgICAgICBhMjAgPSBsZWZ0WzhdLCAgYTIxID0gbGVmdFs5XSxcbiAgICAgICAgYTMwID0gbGVmdFsxMl0sIGEzMSA9IGxlZnRbMTNdO1xuXG4gICAgdmFyIGIwID0gcmlnaHRbMTJdLFxuICAgICAgICBiMSA9IHJpZ2h0WzEzXSxcbiAgICAgICAgYjIgPSByaWdodFsxNF0sXG4gICAgICAgIGIzID0gcmlnaHRbMTVdO1xuXG4gICAgb3V0cHV0QXJyYXlbMF0gPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0cHV0QXJyYXlbMV0gPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgcmV0dXJuIG91dHB1dEFycmF5O1xufVxuXG5mdW5jdGlvbiBpbnZlcnQob3V0cHV0QXJyYXksIG1hdHJpeCkge1xuICAgIHZhciBhMDAgPSBtYXRyaXhbMF0sICBhMDEgPSBtYXRyaXhbMV0sICBhMDIgPSBtYXRyaXhbMl0sICBhMDMgPSBtYXRyaXhbM10sXG4gICAgICAgIGExMCA9IG1hdHJpeFs0XSwgIGExMSA9IG1hdHJpeFs1XSwgIGExMiA9IG1hdHJpeFs2XSwgIGExMyA9IG1hdHJpeFs3XSxcbiAgICAgICAgYTIwID0gbWF0cml4WzhdLCAgYTIxID0gbWF0cml4WzldLCAgYTIyID0gbWF0cml4WzEwXSwgYTIzID0gbWF0cml4WzExXSxcbiAgICAgICAgYTMwID0gbWF0cml4WzEyXSwgYTMxID0gbWF0cml4WzEzXSwgYTMyID0gbWF0cml4WzE0XSwgYTMzID0gbWF0cml4WzE1XSxcblxuICAgICAgICBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsXG4gICAgICAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcbiAgICAgICAgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLFxuICAgICAgICBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsXG4gICAgICAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcbiAgICAgICAgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLFxuICAgICAgICBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsXG4gICAgICAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcbiAgICAgICAgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLFxuICAgICAgICBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsXG4gICAgICAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcbiAgICAgICAgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyLFxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgZGV0ZXJtaW5hbnRcbiAgICAgICAgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xuXG4gICAgaWYgKCFkZXQpIHJldHVybiBudWxsO1xuICAgIGRldCA9IDEuMCAvIGRldDtcblxuICAgIG91dHB1dEFycmF5WzBdICA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzFdICA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzJdICA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzNdICA9IChhMjIgKiBiMDQgLSBhMjEgKiBiMDUgLSBhMjMgKiBiMDMpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzRdICA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzVdICA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzZdICA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzddICA9IChhMjAgKiBiMDUgLSBhMjIgKiBiMDIgKyBhMjMgKiBiMDEpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzhdICA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzldICA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzEwXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xuICAgIG91dHB1dEFycmF5WzExXSA9IChhMjEgKiBiMDIgLSBhMjAgKiBiMDQgLSBhMjMgKiBiMDApICogZGV0O1xuICAgIG91dHB1dEFycmF5WzEyXSA9IChhMTEgKiBiMDcgLSBhMTAgKiBiMDkgLSBhMTIgKiBiMDYpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzEzXSA9IChhMDAgKiBiMDkgLSBhMDEgKiBiMDcgKyBhMDIgKiBiMDYpICogZGV0O1xuICAgIG91dHB1dEFycmF5WzE0XSA9IChhMzEgKiBiMDEgLSBhMzAgKiBiMDMgLSBhMzIgKiBiMDApICogZGV0O1xuICAgIG91dHB1dEFycmF5WzE1XSA9IChhMjAgKiBiMDMgLSBhMjEgKiBiMDEgKyBhMjIgKiBiMDApICogZGV0O1xuICAgIHJldHVybiBvdXRwdXRBcnJheTtcbn1cblxuZnVuY3Rpb24gZ2V0V2Zyb21NdWx0aXBsaWNhdGlvbihsZWZ0LCByaWdodCkge1xuICAgIHZhciBhMDAgPSBsZWZ0WzBdLCAgYTAxID0gbGVmdFsxXSwgIGEwMiA9IGxlZnRbMl0sICBhMDMgPSBsZWZ0WzNdLFxuICAgICAgICBhMTAgPSBsZWZ0WzRdLCAgYTExID0gbGVmdFs1XSwgIGExMiA9IGxlZnRbNl0sICBhMTMgPSBsZWZ0WzddLFxuICAgICAgICBhMjAgPSBsZWZ0WzhdLCAgYTIxID0gbGVmdFs5XSwgIGEyMiA9IGxlZnRbMTBdLCBhMjMgPSBsZWZ0WzExXSxcbiAgICAgICAgYTMwID0gbGVmdFsxMl0sIGEzMSA9IGxlZnRbMTNdLCBhMzIgPSBsZWZ0WzE0XSwgYTMzID0gbGVmdFsxNV07XG5cbiAgICB2YXIgYjAgPSByaWdodFsxMl0sIGIxID0gcmlnaHRbMTNdLCBiMiA9IHJpZ2h0WzE0XSwgYjMgPSByaWdodFsxNV07XG5cbiAgICByZXR1cm4gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwICsgYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxICsgYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyICsgYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xufVxuXG5mdW5jdGlvbiBhcHBseVRvVmVjdG9yKG91dHB1dCwgbWF0cml4LCB2ZWN0b3IpIHtcbiAgICB2YXIgYTAwID0gbWF0cml4WzBdLCAgYTAxID0gbWF0cml4WzFdLCAgYTAyID0gbWF0cml4WzJdLCAgYTAzID0gbWF0cml4WzNdLFxuICAgICAgICBhMTAgPSBtYXRyaXhbNF0sICBhMTEgPSBtYXRyaXhbNV0sICBhMTIgPSBtYXRyaXhbNl0sICBhMTMgPSBtYXRyaXhbN10sXG4gICAgICAgIGEyMCA9IG1hdHJpeFs4XSwgIGEyMSA9IG1hdHJpeFs5XSwgIGEyMiA9IG1hdHJpeFsxMF0sIGEyMyA9IG1hdHJpeFsxMV0sXG4gICAgICAgIGEzMCA9IG1hdHJpeFsxMl0sIGEzMSA9IG1hdHJpeFsxM10sIGEzMiA9IG1hdHJpeFsxNF0sIGEzMyA9IG1hdHJpeFsxNV07XG5cbiAgICB2YXIgdjAgPSB2ZWN0b3JbMF0sIHYxID0gdmVjdG9yWzFdLCB2MiA9IHZlY3RvclsyXSwgdjMgPSB2ZWN0b3JbM107XG5cbiAgICBvdXRwdXRbMF0gPSBhMDAgKiB2MCArIGExMCAqIHYxICsgYTIwICogdjIgKyBhMzAgKiB2MztcbiAgICBvdXRwdXRbMV0gPSBhMDEgKiB2MCArIGExMSAqIHYxICsgYTIxICogdjIgKyBhMzEgKiB2MztcbiAgICBvdXRwdXRbMl0gPSBhMDIgKiB2MCArIGExMiAqIHYxICsgYTIyICogdjIgKyBhMzIgKiB2MztcbiAgICBvdXRwdXRbM10gPSBhMDMgKiB2MCArIGExMyAqIHYxICsgYTIzICogdjIgKyBhMzMgKiB2MztcblxuICAgIHJldHVybiBvdXRwdXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIG11bHRpcGx5ICAgICAgICAgICAgICAgICAgICAgICAgIDogbXVsdGlwbHksXG4gICAgZ2V0VHJhbnNsYXRpb25Gcm9tTXVsdGlwbGljYXRpb24gOiBnZXRUcmFuc2xhdGlvbkZyb21NdWx0aXBsaWNhdGlvbixcbiAgICBpbnZlcnQgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGludmVydCxcbiAgICBJREVOVElUWSAgICAgICAgICAgICAgICAgICAgICAgICA6IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKSxcbiAgICBnZXRXZnJvbU11bHRpcGxpY2F0aW9uICAgICAgICAgICA6IGdldFdmcm9tTXVsdGlwbGljYXRpb24sXG4gICAgYXBwbHlUb1ZlY3RvciAgICAgICAgICAgICAgICAgICAgOiBhcHBseVRvVmVjdG9yXG59OyIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IHdpbGxAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmVjMyA9IGZ1bmN0aW9uKHgseSx6KXtcbiAgICBpZiAoeCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIHRoaXMueCA9IHhbMF0gfHwgMDtcbiAgICAgICAgdGhpcy55ID0geFsxXSB8fCAwO1xuICAgICAgICB0aGlzLnogPSB4WzJdIHx8IDA7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4IHx8IDA7XG4gICAgICAgIHRoaXMueSA9IHkgfHwgMDtcbiAgICAgICAgdGhpcy56ID0geiB8fCAwO1xuICAgIH1cbn07XG5cblZlYzMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCh4LHkseikge1xuICAgIGlmICh4IGluc3RhbmNlb2YgQXJyYXkgfHwgeCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICB0aGlzLnggPSB4WzBdO1xuICAgICAgICB0aGlzLnkgPSB4WzFdO1xuICAgICAgICB0aGlzLnogPSB4WzJdO1xuICAgIH0gZWxzZSBpZiAoeCBpbnN0YW5jZW9mIFZlYzMpIHtcbiAgICAgICAgdGhpcy54ID0geC54O1xuICAgICAgICB0aGlzLnkgPSB4Lnk7XG4gICAgICAgIHRoaXMueiA9IHguejtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIWlzTmFOKHgpKSB0aGlzLnggPSB4O1xuICAgICAgICBpZiAoIWlzTmFOKHkpKSB0aGlzLnkgPSB5O1xuICAgICAgICBpZiAoIWlzTmFOKHopKSB0aGlzLnogPSB6O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCh2KSB7XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHRoaXMueiArPSB2Lno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYpIHtcbiAgICB0aGlzLnggLT0gdi54O1xuICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgdGhpcy56IC09IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLnJvdGF0ZVggPSBmdW5jdGlvbiByb3RhdGVYKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy55ID0geSAqIGNvc1RoZXRhIC0geiAqIHNpblRoZXRhO1xuICAgIHRoaXMueiA9IHkgKiBzaW5UaGV0YSArIHogKiBjb3NUaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUucm90YXRlWSA9IGZ1bmN0aW9uIHJvdGF0ZVkodGhldGEpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnggPSB6ICogc2luVGhldGEgKyB4ICogY29zVGhldGE7XG4gICAgdGhpcy56ID0geiAqIGNvc1RoZXRhIC0geCAqIHNpblRoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5yb3RhdGVaID0gZnVuY3Rpb24gcm90YXRlWih0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHRoaXMueCA9ICAgeCAqIGNvc1RoZXRhIC0geSAqIHNpblRoZXRhO1xuICAgIHRoaXMueSA9ICAgeCAqIHNpblRoZXRhICsgeSAqIGNvc1RoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5jcm9zcyA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgeCA9IHRoaXMueSAqIHYueiAtIHRoaXMueiAqIHYueTtcbiAgICB2YXIgeSA9IHRoaXMueiAqIHYueCAtIHRoaXMueCAqIHYuejtcbiAgICB2YXIgeiA9IHRoaXMueCAqIHYueSAtIHRoaXMueSAqIHYueDtcblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLnogPSB6O1xufTtcblxuVmVjMy5wcm90b3R5cGUucm90YXRlUSA9IGZ1bmN0aW9uIHJvdGF0ZVEocSkge1xuICAgIHRoaXMuY29weShxLnJvdGF0ZVZlY3Rvcih0aGlzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHMpIHtcbiAgICBpZiAocyBpbnN0YW5jZW9mIFZlYzMpIHtcbiAgICAgICAgdGhpcy54ICo9IHMueDtcbiAgICAgICAgdGhpcy55ICo9IHMueTtcbiAgICAgICAgdGhpcy56ICo9IHMuejtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnggKj0gcztcbiAgICAgICAgdGhpcy55ICo9IHM7XG4gICAgICAgIHRoaXMueiAqPSBzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLmludmVydCA9IGZ1bmN0aW9uIGludmVydCgpIHtcbiAgICB0aGlzLnggKj0gLTE7XG4gICAgdGhpcy55ICo9IC0xO1xuICAgIHRoaXMueiAqPSAtMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuVmVjMy5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwKGZuKSB7XG4gICAgdGhpcy54ID0gZm4odGhpcy54KTtcbiAgICB0aGlzLnkgPSBmbih0aGlzLnkpO1xuICAgIHRoaXMueiA9IGZuKHRoaXMueik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiBsZW5ndGgoKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG4gICAgcmV0dXJuIE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopO1xufTtcblxuVmVjMy5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkodikge1xuICAgIHRoaXMueCA9IHYueDtcbiAgICB0aGlzLnkgPSB2Lnk7XG4gICAgdGhpcy56ID0gdi56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhcih2KSB7XG4gICAgdGhpcy54ID0gMDtcbiAgICB0aGlzLnkgPSAwO1xuICAgIHRoaXMueiA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5pc1plcm8gPSBmdW5jdGlvbiBpc1plcm8oKSB7XG4gICAgaWYgKHRoaXMueCAhPT0gMCB8fCB0aGlzLnkgIT09IDAgfHwgdGhpcy56ICE9PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5pc0VxdWFsID0gZnVuY3Rpb24gaXNFcXVhbCh2KSB7XG4gICAgaWYgKHRoaXMueCAhPT0gdi54IHx8IHRoaXMueSAhPT0gdi55IHx8IHRoaXMueiAhPT0gdi56KSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5WZWMzLnByb3RvdHlwZS50b1ZhbHVlID0gZnVuY3Rpb24gdG9WYWx1ZSgpIHtcbiAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnpdO1xufTtcblxuVmVjMy5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24gbm9ybWFsaXplKCkge1xuICAgIHZhciBjdXJyZW50TGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcblxuICAgIHRoaXMueCA9IHRoaXMueCAvIGN1cnJlbnRMZW5ndGg7XG4gICAgdGhpcy55ID0gdGhpcy55IC8gY3VycmVudExlbmd0aDtcbiAgICB0aGlzLnogPSB0aGlzLnogLyBjdXJyZW50TGVuZ3RoO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUuY3Jvc3MgPSBmdW5jdGlvbiBjcm9zcyh2KSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB0aGlzLnggPSB5ICogdi56IC0geiAqIHYueTtcbiAgICB0aGlzLnkgPSB6ICogdi54IC0geCAqIHYuejtcbiAgICB0aGlzLnogPSB4ICogdi55IC0geSAqIHYueDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLmFwcGx5TWF0cml4ID0gZnVuY3Rpb24obWF0cml4KSB7XG4gICAgdmFyIE0gPSBtYXRyaXguZ2V0KCk7XG4gICAgdmFyIE0wID0gTVswXTtcbiAgICB2YXIgTTEgPSBNWzFdO1xuICAgIHZhciBNMiA9IE1bMl07XG5cbiAgICB2YXIgdjAgPSB0aGlzLng7XG4gICAgdmFyIHYxID0gdGhpcy55O1xuICAgIHZhciB2MiA9IHRoaXMuejtcblxuICAgIHRoaXMueCA9IE0wWzBdKnYwICsgTTBbMV0qdjEgKyBNMFsyXSp2MjtcbiAgICB0aGlzLnkgPSBNMVswXSp2MCArIE0xWzFdKnYxICsgTTFbMl0qdjI7XG4gICAgdGhpcy56ID0gTTJbMF0qdjAgKyBNMlsxXSp2MSArIE0yWzJdKnYyO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5ub3JtYWxpemUgPSBmdW5jdGlvbiBub3JtYWxpemUodikge1xuICAgIHZhciBsZW5ndGggPSB2Lmxlbmd0aCgpIHx8IDE7XG4gICAgcmV0dXJuIG5ldyBWZWMzKHYueC9sZW5ndGgsIHYueS9sZW5ndGgsIHYuei9sZW5ndGgpO1xufTtcblxuVmVjMy5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKHYpIHtcbiAgICByZXR1cm4gbmV3IFZlYzModi54LCB2LnksIHYueik7XG59O1xuXG5WZWMzLmFkZCA9IGZ1bmN0aW9uIGFkZCh2MSwgdjIpIHtcbiAgICB2YXIgeCA9IHYxLnggKyB2Mi54O1xuICAgIHZhciB5ID0gdjEueSArIHYyLnk7XG4gICAgdmFyIHogPSB2MS56ICsgdjIuejtcbiAgICByZXR1cm4gbmV3IFZlYzMoeCx5LHopO1xufTtcblxuVmVjMy5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYxLCB2Mikge1xuICAgIHZhciB4ID0gdjEueCAtIHYyLng7XG4gICAgdmFyIHkgPSB2MS55IC0gdjIueTtcbiAgICB2YXIgeiA9IHYxLnogLSB2Mi56O1xuICAgIHJldHVybiBuZXcgVmVjMyh4LHkseik7XG59O1xuXG5WZWMzLnNjYWxlID0gZnVuY3Rpb24gc2NhbGUodiwgcykge1xuICAgIHZhciB4ID0gdi54ICogcztcbiAgICB2YXIgeSA9IHYueSAqIHM7XG4gICAgdmFyIHogPSB2LnogKiBzO1xuICAgIHJldHVybiBuZXcgVmVjMyh4LHkseik7XG59O1xuXG5WZWMzLnJvdGF0ZVEgPSBmdW5jdGlvbiByb3RhdGVRKHYscSkge1xuICAgIHJldHVybiBWZWMzLmNsb25lKHEucm90YXRlVmVjdG9yKHYpKTtcbn07XG5cblZlYzMuZG90UHJvZHVjdCA9IGZ1bmN0aW9uIGRvdFByb2R1Y3QodjEsIHYyKSB7XG4gICAgcmV0dXJuIHYxLnggKiB2Mi54ICsgdjEueSAqIHYyLnkgKyB2MS56ICogdjIuejtcbn07XG5cblZlYzMuY3Jvc3NQcm9kdWN0ID0gZnVuY3Rpb24gY3Jvc3NQcm9kdWN0KHYxLCB2Mikge1xuICAgIHJldHVybiBuZXcgVmVjMyh2MS55ICogdjIueiAtIHYxLnogKiB2Mi55LCB2MS56ICogdjIueCAtIHYxLnggKiB2Mi56LCB2MS54ICogdjIueSAtIHYxLnkgKiB2Mi54KTtcbn07XG5cblZlYzMuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzKHYxLCB2Mikge1xuICAgIHJldHVybiB2MS54ID09PSB2Mi54ICYmIHYxLnkgPT09IHYyLnkgJiYgdjEueiA9PT0gdjIuejtcbn07XG5cblZlYzMucHJvamVjdCA9IGZ1bmN0aW9uIHByb2plY3QodjEsIHYyKSB7XG4gICAgcmV0dXJuIFZlYzMubm9ybWFsaXplKHYyKS5zY2FsZShWZWMzLmRvdFByb2R1Y3QodjEsIHYyKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlYzM7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBhZGFtQGZhbW8udXMsIHdpbGxAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY29yZS9FbnRpdHlSZWdpc3RyeScpO1xudmFyIFRpbWVTeXN0ZW0gPSByZXF1aXJlKFwiLi4vY29yZS9TeXN0ZW1zL1RpbWVTeXN0ZW1cIik7XG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL2ZvcmNlcy9Gb3JjZScpO1xudmFyIENvbnN0cmFpbnQgPSByZXF1aXJlKCcuL2NvbnN0cmFpbnRzL0NvbnN0cmFpbnQnKTtcbnZhciBQYXJ0aWNsZSA9IHJlcXVpcmUoJy4vYm9kaWVzL1BhcnRpY2xlJyk7XG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi4vZXZlbnRzL0V2ZW50SGFuZGxlcicpO1xuXG52YXIgYm9kaWVzID0gRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignQm9kaWVzJyk7XG5cbi8qKlxuICogU2luZ2xldG9uIFBoeXNpY3NTeXN0ZW0gb2JqZWN0XG4gKiBtYW5hZ2VzIHBhcnRpY2xlcywgYm9kaWVzLCBhZ2VudHMsIGNvbnN0cmFpbnRzXG4gKlxuICogQGNsYXNzIEVuZ2luZVxuICogQHNpbmdsZXRvblxuICovXG52YXIgUGh5c2ljc1N5c3RlbSA9IHt9O1xuXG5QaHlzaWNzU3lzdGVtLmZvcmNlcyA9IFtdO1xuUGh5c2ljc1N5c3RlbS5jb25zdHJhaW50cyA9IFtdO1xuUGh5c2ljc1N5c3RlbS5ib2RpZXMgPSBbXTtcblBoeXNpY3NTeXN0ZW0uX2V2ZW50SGFuZGxlciA9IG5ldyBFdmVudEhhbmRsZXIoKTtcblxuUGh5c2ljc1N5c3RlbS5fZXZlbnRIYW5kbGVyLm9uKCdhZGQnLCBmdW5jdGlvbihib2R5KSB7XG4gICAgUGh5c2ljc1N5c3RlbS5hdHRhY2goYm9keSk7XG59KTtcblxuLyoqXG4gKiBAY29uc3Qgc3RlcCB0aGUgdGltZSBzdGVwIGJldHdlZW4gZnJhbWVzIHVwIHRvIHRoZSBmcmFtZSB0aW1lIGRpZmZcbiAqL1xuUGh5c2ljc1N5c3RlbS5zdGVwID0gMTYuNjY2NztcblBoeXNpY3NTeXN0ZW0uaXRlcmF0aW9ucyA9IDEwO1xuUGh5c2ljc1N5c3RlbS5fSURQb29sID0ge1xuICAgIGJvZGllczogW10sXG4gICAgZm9yY2VzOiBbXSxcbiAgICBjb25zdHJhaW50czogW11cbn07XG5cblBoeXNpY3NTeXN0ZW0uYXR0YWNoID0gZnVuY3Rpb24oYWdlbnRPckJvZHkpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIFBoeXNpY3NTeXN0ZW0uYXR0YWNoKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIShhZ2VudE9yQm9keSBpbnN0YW5jZW9mIEFycmF5KSkgYWdlbnRPckJvZHkgPSBbYWdlbnRPckJvZHldO1xuXG4gICAgdmFyIGkgPSBhZ2VudE9yQm9keS5sZW5ndGg7XG4gICAgd2hpbGUoaS0tKSB7XG4gICAgICAgIGlmIChhZ2VudE9yQm9keVtpXSBpbnN0YW5jZW9mIFBhcnRpY2xlKSBfYWRkQm9keS5jYWxsKHRoaXMsIGFnZW50T3JCb2R5W2ldKTtcbiAgICAgICAgZWxzZSBfYWRkQWdlbnQuY2FsbCh0aGlzLCBhZ2VudE9yQm9keVtpXSk7XG4gICAgfVxufTtcblxuUGh5c2ljc1N5c3RlbS5hZGRCb2R5ID0gUGh5c2ljc1N5c3RlbS5hdHRhY2g7XG5cbmZ1bmN0aW9uIF9hZGRCb2R5KGJvZHkpIHtcbiAgICBpZiAoYm9keS5fSUQgPT0gbnVsbCkge1xuICAgICAgICBpZiAodGhpcy5fSURQb29sLmJvZGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGJvZHkuX0lEID0gdGhpcy5fSURQb29sLmJvZGllcy5wb3AoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJvZHkuX0lEID0gdGhpcy5ib2RpZXMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm9kaWVzW3RoaXMuYm9kaWVzLmxlbmd0aF0gPSBib2R5O1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIF9hZGRBZ2VudChhZ2VudCkge1xuICAgIGlmIChhZ2VudC5fSUQgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yIChcIkFnZW50cyBjYW4gb25seSBiZSBhZGRlZCB0byB0aGUgZW5naW5lIG9uY2VcIik7IC8vIEhhbmRsZSBpdCBoZXJlXG4gICAgaWYgKGFnZW50IGluc3RhbmNlb2YgRm9yY2UpIHtcbiAgICAgICAgaWYgKHRoaXMuX0lEUG9vbC5mb3JjZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhZ2VudC5fSUQgPSB0aGlzLl9JRFBvb2wuZm9yY2VzLnBvcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWdlbnQuX0lEID0gdGhpcy5mb3JjZXMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZm9yY2VzW2FnZW50Ll9JRF0gPSBhZ2VudDtcbiAgICB9IGVsc2UgaWYgKGFnZW50IGluc3RhbmNlb2YgQ29uc3RyYWludCkge1xuICAgICAgICBpZiAodGhpcy5fSURQb29sLmNvbnN0cmFpbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWdlbnQuX0lEID0gdGhpcy5fSURQb29sLmNvbnN0cmFpbnRzLnBvcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWdlbnQuX0lEID0gdGhpcy5jb25zdHJhaW50cy5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb25zdHJhaW50c1thZ2VudC5fSURdID0gYWdlbnQ7XG4gICAgfSBlbHNlIHRocm93IG5ldyBFcnJvcihcIkF0dGVtcHQgdG8gcmVnaXN0ZXIgbm9uLWFnZW50IGFzIEZvcmNlIG9yIENvbnN0cmFpbnRcIilcblxuICAgIFBoeXNpY3NTeXN0ZW0uX2V2ZW50SGFuZGxlci5zdWJzY3JpYmUoYWdlbnQuX2V2ZW50RW1pdHRlcik7XG59O1xuXG5QaHlzaWNzU3lzdGVtLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShhZ2VudE9yQm9keSkge1xuICAgIGlmICghKGFnZW50T3JCb2R5IGluc3RhbmNlb2YgQXJyYXkpKSBhZ2VudE9yQm9keSA9IFthZ2VudE9yQm9keV07XG4gICAgdmFyIG5lRWxlbWVudHMgPSBhZ2VudE9yQm9keS5sZW5ndGg7XG4gICAgd2hpbGUobmVFbGVtZW50cy0tKSB7XG4gICAgICAgIF9yZW1vdmVPbmUuY2FsbCh0aGlzLCBhZ2VudE9yQm9keVtuZUVsZW1lbnRzXSk7XG4gICAgfVxufTtcblxuUGh5c2ljc1N5c3RlbS5yZW1vdmVCb2R5ID0gUGh5c2ljc1N5c3RlbS5yZW1vdmU7XG5cbmZ1bmN0aW9uIF9yZW1vdmVPbmUoYWdlbnRPckJvZHkpIHtcbiAgICBpZiAoYWdlbnRPckJvZHkgaW5zdGFuY2VvZiBGb3JjZSkge1xuICAgICAgICB0aGlzLl9JRFBvb2wuZm9yY2VzLnB1c2goYWdlbnRPckJvZHkuX0lEKTtcbiAgICAgICAgdGhpcy5mb3JjZXNbYWdlbnRPckJvZHkuX0lEXSA9IG51bGw7XG4gICAgfSBlbHNlIGlmIChhZ2VudE9yQm9keSBpbnN0YW5jZW9mIENvbnN0cmFpbnQpIHtcbiAgICAgICAgdGhpcy5fSURQb29sLmNvbnN0cmFpbnRzLnB1c2goYWdlbnRPckJvZHkuX0lEKTtcbiAgICAgICAgdGhpcy5jb25zdHJhaW50c1thZ2VudE9yQm9keS5fSURdID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGFnZW50T3JCb2R5IGluc3RhbmNlb2YgUGFydGljbGUpIHtcbiAgICAgICAgdGhpcy5fSURQb29sLmJvZGllcy5wdXNoKGFnZW50T3JCb2R5Ll9JRCk7XG4gICAgICAgIHRoaXMuYm9kaWVzW2FnZW50T3JCb2R5Ll9JRF0gPSBudWxsO1xuICAgIH1cbiAgICBhZ2VudE9yQm9keS5fSUQgPSBudWxsO1xufTtcblxuUGh5c2ljc1N5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIGJvZGllcyA9IHRoaXMuYm9kaWVzO1xuICAgIHZhciBmb3JjZXMgPSB0aGlzLmZvcmNlcztcbiAgICB2YXIgY29uc3RyYWludHMgPSB0aGlzLmNvbnN0cmFpbnRzO1xuXG4gICAgdmFyIF9udW1Cb2RpZXMgPSBib2RpZXMubGVuZ3RoO1xuICAgIHZhciBfbnVtRm9yY2VzID0gZm9yY2VzLmxlbmd0aDtcbiAgICB2YXIgX251bUNvbnN0cmFpbnRzID0gY29uc3RyYWludHMubGVuZ3RoO1xuICAgIHZhciBfbnVtSXRlcmF0aW9ucyA9IHRoaXMuaXRlcmF0aW9ucztcblxuICAgIHZhciBzdGVwID0gdGhpcy5zdGVwO1xuICAgIHZhciBkZWx0YSA9IFRpbWVTeXN0ZW0uZ2V0RGVsdGEoKTtcbiAgICAvLyBjb25zb2xlLmxvZyhkZWx0YSlcbiAgICB3aGlsZShkZWx0YSA+IDApIHtcbiAgICAgICAgdmFyIGR0ID0gKGRlbHRhID4gc3RlcCkgPyBzdGVwIDogZGVsdGE7XG4gICAgICAgIGR0IC89IDEwMDA7XG4gICAgICAgIC8vIFVwZGF0ZSBGb3JjZXMgb24gcGFydGljbGVzXG4gICAgICAgIHZhciBuRm9yY2VzID0gX251bUZvcmNlcztcbiAgICAgICAgd2hpbGUobkZvcmNlcy0tKSB7XG4gICAgICAgICAgICBpZiAoZm9yY2VzW25Gb3JjZXNdKSBmb3JjZXNbbkZvcmNlc10udXBkYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZW50YXRpdmVseSB1cGRhdGUgdmVsb2NpdGllc1xuICAgICAgICB2YXIgbkJvZGllcyA9IF9udW1Cb2RpZXM7XG4gICAgICAgIHdoaWxlKG5Cb2RpZXMtLSkge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbbkJvZGllc107XG4gICAgICAgICAgICBpZiAoIWJvZHkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKGJvZHkuc2V0dGxlZCkge1xuICAgICAgICAgICAgICAgIGlmIChib2R5Ll9mb3JjZS5sZW5ndGgoKSA+IGJvZHkuc2xlZXBUaHJlc2hvbGRcbiAgICAgICAgICAgICAgICAgICAgfHwgYm9keS5fdmVsb2NpdHkubGVuZ3RoKCkgPiBib2R5LnNsZWVwVGhyZXNob2xkXG4gICAgICAgICAgICAgICAgICAgIHx8IGJvZHkuYW5ndWxhclZlbG9jaXR5Lmxlbmd0aCgpID4gYm9keS5zbGVlcFRocmVzaG9sZCkge1xuICAgICAgICAgICAgICAgICAgICBib2R5LnNldHRsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBib2R5LmdldEZvcmNlKCkuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWJvZHkuc2V0dGxlZCkgYm9keS5faW50ZWdyYXRlVmVsb2NpdHkoZHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHZpb2xhdGlvbnMgb2YgY29uc3RyYWludHNcbiAgICAgICAgdmFyIG5Db25zdHJhaW50cyA9IF9udW1Db25zdHJhaW50cztcbiAgICAgICAgd2hpbGUobkNvbnN0cmFpbnRzLS0pIHtcbiAgICAgICAgICAgIGlmICghY29uc3RyYWludHNbbkNvbnN0cmFpbnRzXSkgY29udGludWU7XG4gICAgICAgICAgICBjb25zdHJhaW50c1tuQ29uc3RyYWludHNdLnVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSXRlcmF0aXZlbHkgcmVzb2x2ZSBjb25zdHJhaW50c1xuICAgICAgICBmb3IgKHZhciBpdGVyYXRpb24gPSAwOyBpdGVyYXRpb24gPCBfbnVtSXRlcmF0aW9uczsgaXRlcmF0aW9uKyspIHtcbiAgICAgICAgICAgIG5Db25zdHJhaW50cyA9IF9udW1Db25zdHJhaW50cztcbiAgICAgICAgICAgIHdoaWxlKG5Db25zdHJhaW50cy0tKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjb25zdHJhaW50c1tuQ29uc3RyYWludHNdKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjb25zdHJhaW50c1tuQ29uc3RyYWludHNdLnJlc29sdmUoZHQsIGl0ZXJhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbnRlZ3JhdGUgUGFydGljbGUgcG9zaXRpb25zXG4gICAgICAgIG5Cb2RpZXMgPSBfbnVtQm9kaWVzO1xuICAgICAgICB3aGlsZShuQm9kaWVzLS0pIHtcbiAgICAgICAgICAgIGJvZHkgPSB0aGlzLmJvZGllc1tuQm9kaWVzXTtcbiAgICAgICAgICAgIGlmICghYm9keSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAoIWJvZHkuc2V0dGxlZCkgYm9keS5faW50ZWdyYXRlUG9zZShkdCk7XG4gICAgICAgIH1cblxuICAgICAgICBkZWx0YSAtPSBzdGVwO1xuICAgIH1cbn07XG5cbi8vIC8qKlxuLy8gICogQWRkcyBhIGJvZHkgb2JqZWN0IHRvIHRoZSBzeXN0ZW0gdG8gdXBkYXRlIGl0J3MgcG9zaXRpb24gYW5kIG9yaWVudGF0aW9uXG4vLyAgKlxuLy8gICogQG1ldGhvZCBhZGRCb2R5XG4vLyAgKiBAcGFyYW0ge0JvZHl9IGJvZHlcbi8vICAqL1xuLy8gUGh5c2ljc1N5c3RlbS5hZGRCb2R5ID0gZnVuY3Rpb24gYWRkQm9keShib2R5KSB7XG4vLyAgICAgaWYgKGJvZHkuX0lEID09IG51bGwpIHtcbi8vICAgICAgICAgaWYgKHRoaXMuX0lEUG9vbC5ib2RpZXMubGVuZ3RoKSB7XG4vLyAgICAgICAgICAgICBib2R5Ll9JRCA9IHRoaXMuX0lEUG9vbC5ib2RpZXMucG9wKCk7XG4vLyAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICBib2R5Ll9JRCA9IHRoaXMuYm9kaWVzLmxlbmd0aDtcbi8vICAgICAgICAgfVxuLy8gICAgICAgICB0aGlzLmJvZGllc1t0aGlzLmJvZGllcy5sZW5ndGhdID0gYm9keTtcbi8vICAgICB9XG4vLyB9O1xuXG4vLyAvKipcbi8vICAqIFJlbW92ZXMgYSBib2R5IGFuZCByZW1vdmVzIGl0IGZyb20gaXQncyBhc3NvY2lhdGVkIGFnZW50c1xuLy8gICogVE9ETzogcmVtb3ZlIHRoZSBib2R5IGZyb20gaXRzIGFzc29jaWF0ZWQgYWdlbnRzXG4vLyAgKlxuLy8gICogQG1ldGhvZCByZW1vdmVCb2R5XG4vLyAgKiBAcGFyYW0ge0JvZHl9IGJvZHlcbi8vICAqL1xuLy8gUGh5c2ljc1N5c3RlbS5yZW1vdmVCb2R5ID0gZnVuY3Rpb24gcmVtb3ZlQm9keShib2R5KSB7XG4vLyAgICAgdGhpcy5fSURQb29sLmJvZGllcy5wdXNoKGJvZHkuX0lEKTtcbi8vICAgICB0aGlzLmJvZGllc1tib2R5Ll9JRF0gPSBudWxsO1xuLy8gICAgIGJvZHkuX0lEID0gbnVsbDtcbi8vIH07XG5cbi8vIC8qKlxuLy8gICogQXR0YWNoZXMgYSBjb2xsZWN0aW9uIG9mIEZvcmNlIG9yIENvbnN0cmFpbnQgYW5kIGJvZGllc1xuLy8gICogVXNlIHRoaXMgbWV0aG9kIHRvIG1ha2UgcGh5c2ljcyBhcHBseSBmb3JjZXMgdG8gYm9kaWVzXG4vLyAgKiBGb3JjZXMgYW5kIGNvbnN0cmFpbnRzIGFyZSBhcHBsaWVkIGZyb20gdGhlIHNvdXJjZSAoaWZcbi8vICAqIGFwcGxpY2FibGUpIHRvIHRoZSB0YXJnZXRzXG4vLyAgKlxuLy8gICogQG1ldGhvZCBhdHRhY2hcbi8vICAqIEBwYXJhbSB7Rm9yY2UgfCBGb3JjZVtdIHwgQ29uc3RyYWludCB8IENvbnN0cmFpbnRbXX0gYWdlbnRzXG4vLyAgKiBAcGFyYW0ge1BhcnRpY2xlIHwgUGFydGljbGVbXX0gc291cmNlXG4vLyAgKiBAcGFyYW0ge1BhcnRpY2xlIHwgUGFydGljbGVbXX0gdGFyZ2V0c1xuLy8gICogQHJldHVybiB7TnVtYmVyIHwgTnVtYmVyW119IHRoZSBpZHMgb2YgdGhlIGFnZW50cyBhdHRhY2hlZCB0byB0aGUgc3lzdGVtXG4vLyAgKi9cbi8vIFBoeXNpY3NTeXN0ZW0uYXR0YWNoID0gZnVuY3Rpb24gYXR0YWNoKGFnZW50cywgc291cmNlLCB0YXJnZXRzKSB7XG4vLyAgICAgaWYgKCF0YXJnZXRzKSB0YXJnZXRzID0gdGhpcy5ib2RpZXM7XG4vLyAgICAgaWYgKCEodGFyZ2V0cyBpbnN0YW5jZW9mIEFycmF5KSkgdGFyZ2V0cyA9IFt0YXJnZXRzXTtcbi8vICAgICB2YXIgblRhcmdldHMgPSB0YXJnZXRzLmxlbmd0aDtcbi8vICAgICB3aGlsZSAoblRhcmdldHMtLSkge1xuLy8gICAgICAgICBpZiAodGFyZ2V0c1tuVGFyZ2V0c10uX0lEID09PSBudWxsKSB0aGlzLmFkZEJvZHkodGFyZ2V0c1tuVGFyZ2V0c10pO1xuLy8gICAgIH1cbi8vICAgICBpZiAoc291cmNlKSB0aGlzLmFkZEJvZHkoc291cmNlKTtcbi8vICAgICBpZiAoYWdlbnRzIGluc3RhbmNlb2YgQXJyYXkpIHtcbi8vICAgICAgICAgdmFyIGFnZW50SURzID0gQXJyYXkoYWdlbnRzLmxlbmd0aCk7XG4vLyAgICAgICAgIHZhciBuQWdlbnRzID0gYWdlbnRzLmxlbmd0aDtcbi8vICAgICAgICAgd2hpbGUobkFnZW50cy0tKSB7XG4vLyAgICAgICAgICAgICBhZ2VudElEc1tuQWdlbnRzXSA9IF9hdHRhY2hBZ2VudC5jYWxsKHRoaXMsIGFnZW50c1tpXSwgdGFyZ2V0cywgc291cmNlKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH1cbi8vICAgICBlbHNlIF9hdHRhY2hBZ2VudC5jYWxsKHRoaXMsIGFnZW50cywgc291cmNlLCB0YXJnZXRzKTtcbi8vICAgICByZXR1cm4gYWdlbnRJRHM7XG4vLyB9O1xuXG4vLyAvKipcbi8vICAqIEF0dGFjaGVzIHRoZSBmb3JjZSBvciBjb25zdHJhaW50IGFuZCBpdHMgc291cmNlIGFuZCB0YXJnZXRzIHRvIHRoZSBzeXN0ZW1cbi8vICAqXG4vLyAgKiBAcHJpdmF0ZVxuLy8gICogQG1ldGhvZCBfYXR0YWNoQWdlbnRcbi8vICAqIEBwYXJhbSB7Rm9yY2UgfCBDb25zdHJhaW50fSBhZ2VudCB0aGUgYWdlbnQgdG8gYXR0YWNoIHRvIHRoZSBzeXN0ZW1cbi8vICAqIEBwYXJhbSB7UGFydGljbGVbXX0gdGFyZ2V0cyB0aGUgYXJyYXkgb2YgdGFyZ2V0cyB0byBhdHRhY2ggdG8gdGhlIGFnZW50XG4vLyAgKiBAcGFyYW0ge1BhcnRpY2xlfSBzb3VyY2UgdGhlIHNvdXJjZSBvZiB0aGUgYWdlbnRcbi8vICAqIEB0aHJvd3Mge0Vycm9yfSBpZiBhZ2VudCAhaW5zdGFuY2VvZiBGb3JjZSBvciBhZ2VudCAhaW5zdGFuY2VvZiBDb25zdHJhaW50XG4vLyAgKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBpZCBvZiB0aGUgYWdlbnQgYXR0YWNoZWQgdG8gdGhlIHN5c3RlbVxuLy8gICovXG4vLyBmdW5jdGlvbiBfYXR0YWNoQWdlbnQoYWdlbnQsIHNvdXJjZSwgdGFyZ2V0cykge1xuLy8gICAgIGlmIChhZ2VudC5fSUQpIHRocm93IG5ldyBFcnJvciAoXCJBZ2VudHMgY2FuIG9ubHkgYmUgYWRkZWQgdG8gdGhlIGVuZ2luZSBvbmNlXCIpOyAvLyBIYW5kbGUgaXQgaGVyZVxuLy8gICAgIGlmICh0YXJnZXRzID09PSB1bmRlZmluZWQpIHRhcmdldHMgPSB0aGlzLmJvZGllcztcblxuLy8gICAgIGlmIChhZ2VudCBpbnN0YW5jZW9mIEZvcmNlKSB7XG4vLyAgICAgICAgIGlmICh0aGlzLl9JRFBvb2wuZm9yY2VzLmxlbmd0aCkge1xuLy8gICAgICAgICAgICAgYWdlbnQuX0lEID0gdGhpcy5fSURQb29sLmZvcmNlcy5wb3AoKTtcbi8vICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgIGFnZW50Ll9JRCA9IHRoaXMuZm9yY2VzLmxlbmd0aDtcbi8vICAgICAgICAgfVxuLy8gICAgICAgICB0aGlzLmZvcmNlc1thZ2VudC5fSURdID0ge1xuLy8gICAgICAgICAgICAgYWdlbnQgICA6IGFnZW50LFxuLy8gICAgICAgICAgICAgdGFyZ2V0cyA6IHRhcmdldHMsXG4vLyAgICAgICAgICAgICBzb3VyY2UgIDogc291cmNlXG4vLyAgICAgICAgIH07XG4vLyAgICAgfVxuXG4vLyAgICAgZWxzZSBpZiAoYWdlbnQgaW5zdGFuY2VvZiBDb25zdHJhaW50KSB7XG4vLyAgICAgICAgIGlmICh0aGlzLl9JRFBvb2wuY29uc3RyYWludHMubGVuZ3RoKSB7XG4vLyAgICAgICAgICAgICBhZ2VudC5fSUQgPSB0aGlzLl9JRFBvb2wuY29uc3RyYWludHMucG9wKCk7XG4vLyAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICBhZ2VudC5fSUQgPSB0aGlzLmNvbnN0cmFpbnRzLmxlbmd0aDtcbi8vICAgICAgICAgfVxuLy8gICAgICAgICB0aGlzLmNvbnN0cmFpbnRzW2FnZW50Ll9JRF0gPSB7XG4vLyAgICAgICAgICAgICBjb25zdHJhaW50IDogYWdlbnQsXG4vLyAgICAgICAgICAgICB0YXJnZXRzICAgIDogdGFyZ2V0cyxcbi8vICAgICAgICAgICAgIHNvdXJjZSAgICAgOiBzb3VyY2Vcbi8vICAgICAgICAgfTtcbi8vICAgICB9XG5cbi8vICAgICBlbHNlIHRocm93IG5ldyBFcnJvcihcIk9ubHkgRm9yY2VzIGFuZCBDb25zdHJhaW50cyBtYXkgYmUgYWRkZWQgdG8gdGhlIFBoeXNpY3MgU3lzdGVtLlwiKTtcbi8vICAgICByZXR1cm4gYWdlbnQuX0lEO1xuLy8gfVxuXG4vLyAvKipcbi8vICAqIFJlbW92ZXMgYW4gaW5zdGFuY2Ugb2YgRm9yY2Ugb3IgQWdlbnQgb3IgYW4gYXJyYXkgb2YgaW5zdGFuY2VzIGZyb20gdGhlIFBoeXNpY3NTeXN0ZW1cbi8vICAqIGNvbXBsaW1lbnQgdG8gUGh5c2ljc1N5c3RlbSNhdHRhY2hcbi8vICAqXG4vLyAgKiBAbWV0aG9kIHJlbW92ZVxuLy8gICogQHBhcmFtIHtGb3JjZSB8IEZvcmNlW10gfCBDb25zdHJhaW50IHwgQ29uc3RyYWludFtdIHwgQXJyYXk8Rm9yY2UsIENvbnN0cmFpbnQ+fSBhZ2VudHNcbi8vICAqL1xuLy8gUGh5c2ljc1N5c3RlbS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUoYWdlbnRzT3JCb2RpZXMpIHtcbi8vICAgICBpZiAoYWdlbnRzT3JCb2RpZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuLy8gICAgICAgICB2YXIgbmVFbGVtZW50cyA9IGFnZW50c09yQm9kaWVzLmxlbmd0aDtcbi8vICAgICAgICAgd2hpbGUobmVFbGVtZW50cy0tKSB7XG4vLyAgICAgICAgICAgICBfcmVtb3ZlT25lLmNhbGwodGhpcywgYWdlbnRzT3JCb2RpZXNbbmVFbGVtZW50c10pO1xuLy8gICAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIGVsc2UgX3JlbW92ZU9uZS5jYWxsKHRoaXMsIGFnZW50c09yQm9kaWVzKTtcbi8vIH07XG5cbi8vIC8qKlxuLy8gICogUmVtb3ZlcyB0aGUgYWdlbnQgZnJvbSBpdHMgaWQgcG9vbFxuLy8gICpcbi8vICAqIEBwcml2YXRlXG4vLyAgKiBAbWV0aG9kIF9yZW1vdmVPbmVcbi8vICAqIEBwYXJhbSB7Rm9yY2UgfCBDb25zdHJhaW50fSBhZ2VudCB0aGUgYWdlbnQgdG8gcmVtb3ZlXG4vLyAgKi9cbi8vIGZ1bmN0aW9uIF9yZW1vdmVPbmUoYWdlbnRPckJvZHkpIHtcbi8vICAgICBpZiAoYWdlbnRPckJvZHkgaW5zdGFuY2VvZiBGb3JjZSkge1xuLy8gICAgICAgICB0aGlzLl9JRFBvb2wuZm9yY2VzLnB1c2goYWdlbnRPckJvZHkuX0lEKTtcbi8vICAgICAgICAgdGhpcy5mb3JjZXNbYWdlbnRPckJvZHkuX0lEXSA9IG51bGw7XG4vLyAgICAgfSBlbHNlIGlmIChhZ2VudE9yQm9keSBpbnN0YW5jZW9mIENvbnN0cmFpbnQpIHtcbi8vICAgICAgICAgdGhpcy5fSURQb29sLmNvbnN0cmFpbnRzLnB1c2goYWdlbnRPckJvZHkuX0lEKTtcbi8vICAgICAgICAgdGhpcy5jb25zdHJhaW50c1thZ2VudE9yQm9keS5fSURdID0gbnVsbDtcbi8vICAgICB9IGVsc2UgaWYgKGFnZW50T3JCb2R5IGluc3RhbmNlb2YgUGFydGljbGUpIHtcbi8vICAgICAgICAgdGhpcy5fSURQb29sLmJvZGllcy5wdXNoKGFnZW50T3JCb2R5Ll9JRCk7XG4vLyAgICAgICAgIHRoaXMuYm9kaWVzW2FnZW50T3JCb2R5Ll9JRF0gPSBudWxsO1xuLy8gICAgIH1cbi8vICAgICBhZ2VudE9yQm9keS5fSUQgPSBudWxsO1xuLy8gfTtcblxuLy8gLyoqXG4vLyAgKiBBdHRhY2hlcyB0YXJnZXRzIHRvIGFuIGFnZW50IGF0dGFjaGVkIHdpdGggUGh5c2ljc1N5c3RlbSNhdHRhY2hcbi8vICAqIFVzZSB0aGlzIG1ldGhvZCB0byBhdHRhY2ggbW9yZSBib2RpZXMgdG8gYW4gZXhpc3RpbmcgaW50ZXJhY3Rpb25cbi8vICAqXG4vLyAgKiBAbWV0aG9kIGF0dGFjaFRvXG4vLyAgKiBAcGFyYW0ge0ZvcmNlIHwgQ29uc3RyYWludH0gYWdlbnRcbi8vICAqIEBwYXJhbSB7UGFydGljbGUgfCBQYXJ0aWNsZVtdfSB0YXJnZXRzXG4vLyAgKi9cbi8vIFBoeXNpY3NTeXN0ZW0uYXR0YWNoVG8gPSBmdW5jdGlvbiBhdHRhY2hUbyhhZ2VudCwgdGFyZ2V0cykge1xuLy8gICAgIGlmIChhZ2VudC5fSUQgPT09IG51bGwpIHJldHVybjtcbi8vICAgICBpZiAoISh0YXJnZXRzIGluc3RhbmNlb2YgQXJyYXkpKSB0YXJnZXRzID0gW3RhcmdldHNdO1xuLy8gICAgIHZhciBuVGFyZ2V0cyA9IHRhcmdldHMubGVuZ3RoO1xuLy8gICAgIHdoaWxlIChuVGFyZ2V0cy0tKSB7XG4vLyAgICAgICAgIGlmICh0YXJnZXRzW25UYXJnZXRzXS5fSUQgPT09IG51bGwpIHRoaXMuYWRkQm9keSh0YXJnZXRzW25UYXJnZXRzXSk7XG4vLyAgICAgfVxuLy8gICAgIGlmIChhZ2VudCBpbnN0YW5jZW9mIEZvcmNlKSB7XG4vLyAgICAgICAgIHRoaXMuZm9yY2VzW2FnZW50Ll9JRF0udGFyZ2V0cyA9IHRoaXMuZm9yY2VzW2FnZW50Ll9JRF0udGFyZ2V0cy5jb25jYXQodGFyZ2V0cyk7XG4vLyAgICAgfVxuLy8gICAgIGlmIChhZ2VudCBpbnN0YW5jZW9mIENvbnN0cmFpbnQpIHtcbi8vICAgICAgICAgdGhpcy5jb25zdHJhaW50c1thZ2VudC5fSURdLnRhcmdldHMgPSB0aGlzLmNvbnN0cmFpbnRzW2FnZW50Ll9JRF0udGFyZ2V0cy5jb25jYXQodGFyZ2V0cyk7XG4vLyAgICAgfVxuLy8gfTtcblxuLy8gLyoqXG4vLyAgKiBSZW1vdmVzIGJvZGllcyBmcm9tIGFuIGV4aXN0aW5nIGludGVyYWN0aW9uXG4vLyAgKiBVc2UgdGhpcyBtZXRob2QgYXMgYSBjb21wbGltZW50IGluIFBoeXNpY3NTeXN0ZW0jYXR0YWNoVG9cbi8vICAqXG4vLyAgKiBAbWV0aG9kIHJlbW92ZUZyb21cbi8vICAqIEBwYXJhbSB7Rm9yY2UgfCBDb25zdHJhaW50fSBhZ2VudFxuLy8gICogQHBhcmFtIHtQYXJ0aWNsZX0gdGFyZ2V0XG4vLyAgKi9cbi8vIFBoeXNpY3NTeXN0ZW0ucmVtb3ZlRnJvbSA9IGZ1bmN0aW9uIHJlbW92ZUZyb20oYWdlbnQsIHRhcmdldCkge1xuLy8gICAgIGlmIChhZ2VudC5fSUQgPT09IG51bGwpIHJldHVybjtcbi8vICAgICBpZiAoYWdlbnQgaW5zdGFuY2VvZiBGb3JjZSkge1xuLy8gICAgICAgICB2YXIgYWdlbnRUYXJnZXRzID0gdGhpcy5mb3JjZXNbYWdlbnQuX0lEXS50YXJnZXRzO1xuLy8gICAgIH1cbi8vICAgICBpZiAoYWdlbnQgaW5zdGFuY2VvZiBDb25zdHJhaW50KSB7XG4vLyAgICAgICAgIHZhciBhZ2VudFRhcmdldHMgPSB0aGlzLmNvbnN0cmFpbnRzW2FnZW50Ll9JRF0udGFyZ2V0cztcbi8vICAgICB9XG5cbi8vICAgICB2YXIgblRhcmdldHMgPSBhZ2VudFRhcmdldHMubGVuZ3RoO1xuLy8gICAgIHdoaWxlKG5UYXJnZXRzLS0pIHtcbi8vICAgICAgIGlmIChhZ2VudFRhcmdldHNbblRhcmdldHNdID09PSB0YXJnZXQpIHtcbi8vICAgICAgICAgLy8gcmVtb3ZlIHRhcmdldCBmcm9tIGFnZW50IGFuZCBzdG9wIGNoZWNraW5nIHRhcmdldHNcbi8vICAgICAgICAgcmV0dXJuIGFnZW50VGFyZ2V0cy5zcGxpY2UoblRhcmdldHMsIDEpO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vIH07XG5cbi8vIC8qKlxuLy8gICogVXBkYXRlIGxvb3Agb2YgdGhlIFBoeXNpY3NTeXN0ZW0uICBBdHRhY2hlZCB0byBjb3JlL0VuZ2luZVxuLy8gICogQXBwbGllcyBmb3JjZXMgdG8gYm9kaWVzLCB1cGRhdGVzIHRoZSBib2RpZXMgYW5kIGFwcGxpZXMgY29uc3RyYWludHNcbi8vICAqXG4vLyAgKiBAcHJvdGVjdGVkXG4vLyAgKiBAbWV0aG9kIHVwZGF0ZVxuLy8gICovXG4vLyBQaHlzaWNzU3lzdGVtLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbi8vICAgICB2YXIgZHQgPSBUaW1lU3lzdGVtLmdldERlbHRhKCk7XG5cbi8vICAgICAvLyB3aGlsZShkdCA+IDApIHtcbi8vICAgICAgICAgLy8gdmFyIHN0ZXAgPSAoZHQgPiB0aGlzLnN0ZXApID8gdGhpcy5zdGVwIDogZHQ7XG4vLyAgICAgICAgIHZhciBzdGVwID0gdGhpcy5zdGVwXG4vLyAgICAgICAgIC8vIFVwZGF0ZUZvcmNlcyBvbiBwYXJ0aWNsZXNcbi8vICAgICAgICAgdmFyIG5BZ2VudHMgPSB0aGlzLmZvcmNlcy5sZW5ndGg7XG4vLyAgICAgICAgIHdoaWxlKG5BZ2VudHMtLSkge1xuLy8gICAgICAgICAgICAgaWYgKHRoaXMuZm9yY2VzW25BZ2VudHNdKSB0aGlzLmZvcmNlc1tuQWdlbnRzXS5hZ2VudC51cGRhdGUodGhpcy5mb3JjZXNbbkFnZW50c10uc291cmNlLCB0aGlzLmZvcmNlc1tuQWdlbnRzXS50YXJnZXRzKTtcbi8vICAgICAgICAgfVxuXG4vLyAgICAgICAgIC8vIEludGVncmF0ZSBQYXJ0aWNsZSBwb3NpdGlvbnNcbi8vICAgICAgICAgdmFyIG5Cb2RpZXMgPSB0aGlzLmJvZGllcy5sZW5ndGg7XG4vLyAgICAgICAgIHZhciBib2R5O1xuLy8gICAgICAgICB3aGlsZShuQm9kaWVzLS0pIHtcbi8vICAgICAgICAgICAgIGJvZHkgPSB0aGlzLmJvZGllc1tuQm9kaWVzXTtcbi8vICAgICAgICAgICAgIGlmICghYm9keSkgY29udGludWU7XG4vLyAgICAgICAgICAgICBpZiAoYm9keS5zZXR0bGVkKSB7XG4vLyAgICAgICAgICAgICAgICAgaWYgKGJvZHkuX2ZvcmNlLmxlbmd0aCgpID4gYm9keS5zbGVlcFRocmVzaG9sZCB8fCBib2R5Ll92ZWxvY2l0eS5sZW5ndGgoKSA+IGJvZHkuc2xlZXBUaHJlc2hvbGQpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgYm9keS5zZXR0bGVkID0gZmFsc2U7XG4vLyAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgICAgICAgICAgYm9keS5nZXRGb3JjZSgpLmNsZWFyKCk7XG4vLyAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgaWYgKCFib2R5LnNldHRsZWQpIGJvZHkuX2ludGVncmF0ZVZlbG9jaXR5KHN0ZXApO1xuLy8gICAgICAgICB9XG5cbi8vICAgICAgICAgdmFyIG5Db25zdHJhaW50cyA9IHRoaXMuY29uc3RyYWludHMubGVuZ3RoO1xuLy8gICAgICAgICB3aGlsZShuQ29uc3RyYWludHMtLSkge1xuLy8gICAgICAgICAgICAgaWYgKCF0aGlzLmNvbnN0cmFpbnRzW25Db25zdHJhaW50c10pIGNvbnRpbnVlO1xuLy8gICAgICAgICAgICAgdGhpcy5jb25zdHJhaW50c1tuQ29uc3RyYWludHNdLmNvbnN0cmFpbnQudXBkYXRlKHRoaXMuY29uc3RyYWludHNbbkNvbnN0cmFpbnRzXS5zb3VyY2UsIHRoaXMuY29uc3RyYWludHNbbkNvbnN0cmFpbnRzXS50YXJnZXRzLCBzdGVwKTtcbi8vICAgICAgICAgfVxuXG4vLyAgICAgICAgIG5Cb2RpZXMgPSB0aGlzLmJvZGllcy5sZW5ndGg7XG4vLyAgICAgICAgIHdoaWxlKG5Cb2RpZXMtLSkge1xuLy8gICAgICAgICAgICAgYm9keSA9IHRoaXMuYm9kaWVzW25Cb2RpZXNdO1xuLy8gICAgICAgICAgICAgaWYgKCFib2R5KSBjb250aW51ZTtcbi8vICAgICAgICAgICAgIGlmICghYm9keS5zZXR0bGVkKSBib2R5Ll9pbnRlZ3JhdGVQb3NlKHN0ZXApO1xuLy8gICAgICAgICB9XG5cbi8vICAgICAgICAgLy8gZHQgLT0gdGhpcy5zdGVwO1xuLy8gICAgIC8vIH1cblxuLy8gfTtcblxubW9kdWxlLmV4cG9ydHMgPSBQaHlzaWNzU3lzdGVtO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogYWRhbUBmYW1vLnVzLCB3aWxsQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG52YXIgVmVjMyA9IHJlcXVpcmUoJy4uLy4uL21hdGgvVmVjMycpO1xudmFyIFN5bXBsZWN0aWNFdWxlciA9IHJlcXVpcmUoJy4uL2ludGVncmF0b3JzL1N5bXBsZWN0aWNFdWxlcicpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4uLy4uL2V2ZW50cy9FdmVudEVtaXR0ZXInKTtcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBQaHlzaWNzIEludGVyYWN0aW9uc1xuICogU3RvcmVzOlxuICogICBwb3NpdGlvblxuICogICB2ZWxvY2l0eVxuICogICBtb21lbnR1bVxuICogICBmb3JjZVxuICogICBtYXNzXG4gKlxuICogRW5jYXBzdWxhdGVzOlxuICogICBFdmVudEVtaXR0ZXJcbiAqXG4gKiBNYW5hZ2VzIHNsZWVwaW5nXG4gKlxuICogQGNsYXNzIFBhcnRpY2xlXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIFBhcnRpY2xlKG9wdGlvbnMpIHtcbiAgICB0aGlzLl9ldmVudEVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLl9wb3NpdGlvbiA9IG5ldyBWZWMzKG9wdGlvbnMucG9zaXRpb24pO1xuICAgIHRoaXMuX2xhc3RQb3NpdGlvbiA9IG5ldyBWZWMzKCk7XG4gICAgdGhpcy5fdmVsb2NpdHkgPSBuZXcgVmVjMyhvcHRpb25zLnZlbG9jaXR5KTtcbiAgICB0aGlzLl9mb3JjZSA9IG5ldyBWZWMzKCk7XG4gICAgdGhpcy5fbWFzcyA9IG9wdGlvbnMubWFzcyB8fCAxO1xuICAgIHRoaXMuX2ludk1hc3MgPSAxIC8gdGhpcy5fbWFzcztcbiAgICB0aGlzLl9tb21lbnR1bSA9IFZlYzMuc2NhbGUodGhpcy5fdmVsb2NpdHksIHRoaXMuX21hc3MpO1xuXG4gICAgdGhpcy5fSUQgPSBudWxsO1xuICAgIHRoaXMuc2V0dGxlZCA9IGZhbHNlO1xuICAgIHRoaXMuc2xlZXBUaHJlc2hvbGQgPSBvcHRpb25zLnNsZWVwVGhyZXNob2xkIHx8IDA7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY2xhc3MgbmFtZSBmb3IgdGhlIEVudGl0eSBSZWdpc3RyeVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2QgdG9TdHJpbmdcbiAqIEByZXR1cm5zIHtzdHJpbmd9IHBhcnRpY2xlXG4gKi9cblBhcnRpY2xlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKXtcbiAgICByZXR1cm4gJ3BhcnRpY2xlJztcbn07XG5cbi8qKlxuICogR2V0dGVyIGZvciBtYXNzXG4gKlxuICogQG1ldGhvZCBnZXRNYXNzXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBtYXNzXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRNYXNzID0gZnVuY3Rpb24gZ2V0TWFzcygpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFzcztcbn07XG5cbi8qKlxuICogR2V0dGVyIGZvciBpbnZlcnNlIG1hc3NcbiAqXG4gKiBAbWV0aG9kIGdldEludmVyc2VNYXNzXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBpbnZlcnNlIG1hc3NcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmdldEludmVyc2VNYXNzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ludk1hc3M7XG59XG5cbi8qKlxuICogU2V0dGVyIGZvciBtYXNzXG4gKlxuICogQG1ldGhvZCBzZXRNYXNzXG4gKiBAcGFyYW0ge051bWJlcn0gbWFzc1xuICogQHJldHVybnMge1BhcnRpY2xlfSB0aGlzXG4gKiBAY2hhaW5hYmxlXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5zZXRNYXNzID0gZnVuY3Rpb24gc2V0TWFzcyhtYXNzKSB7XG4gICAgdGhpcy5fbWFzcyA9IG1hc3M7XG4gICAgdGhpcy5faW52TWFzcyA9IDEgLyBtYXNzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXR0ZXIgZm9yIHBvc2l0aW9uXG4gKlxuICogQG1ldGhvZCBnZXRQb3NpdGlvblxuICogQHJldHVybnMge1ZlYzN9IHBvc2l0aW9uXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uIGdldFBvc2l0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbjtcbn07XG5cbi8qKlxuICogR2V0dGVyIGZvciBsYXN0IHBvc2l0aW9uXG4gKlxuICogQG1ldGhvZCBnZXRMYXN0UG9zaXRpb25cbiAqIEByZXR1cm5zIHtWZWMzfSBsYXN0UG9zaXRpb25cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmdldExhc3RQb3NpdGlvbiA9IGZ1bmN0aW9uIGdldExhc3RQb3NpdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbGFzdFBvc2l0aW9uO1xufTtcblxuLyoqXG4gKiBTZXR0ZXIgZm9yIHBvc2l0aW9uXG4gKlxuICogQG1ldGhvZCBzZXRQb3NpdGlvblxuICogQHBhcmFtIHtWZWMzIHwgTnVtYmVyfSB4IHRoZSB2ZWN0b3IgZm9yIHBvc2l0aW9uIG9yIHRoZSB4IGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHRoZSB5IGNvb3JkaW5hdGUgZm9yIHBvc2l0aW9uXG4gKiBAcGFyYW0ge051bWJlcn0geiB0aGUgeiBjb29yZGluYXRlIGZvciBwb3NpdGlvblxuICogQHJldHVybnMge1BhcnRpY2xlfSB0aGlzXG4gKiBAY2hhaW5hYmxlXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5zZXRQb3NpdGlvbiA9IGZ1bmN0aW9uIHNldFBvc2l0aW9uKHgsIHksIHopIHtcbiAgICBpZiAoeCBpbnN0YW5jZW9mIFZlYzMpIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb24uY29weSh4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wb3NpdGlvbi5zZXQoeCwgeSwgeik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXR0ZXIgZm9yIHZlbG9jaXR5XG4gKlxuICogQG1ldGhvZCBnZXRWZWxvY2l0eVxuICogQHJldHVybnMge1ZlYzN9IHZlbG9jaXR5XG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRWZWxvY2l0eSA9IGZ1bmN0aW9uIGdldFZlbG9jaXR5KCkge1xuICAgIHJldHVybiB0aGlzLl92ZWxvY2l0eTtcbn07XG5cbi8qKlxuICogU2V0dGVyIGZvciB2ZWxvY2l0eVxuICpcbiAqIEBtZXRob2Qgc2V0dmVsb2NpdHlcbiAqIEBwYXJhbSB7VmVjMyB8IE51bWJlcn0geCB0aGUgdmVjdG9yIGZvciB2ZWxvY2l0eSBvciB0aGUgeCBjb29yZGluYXRlXG4gKiBAcGFyYW0ge051bWJlcn0geSB0aGUgeSBjb29yZGluYXRlIGZvciB2ZWxvY2l0eVxuICogQHBhcmFtIHtOdW1iZXJ9IHogdGhlIHogY29vcmRpbmF0ZSBmb3IgdmVsb2NpdHlcbiAqIEByZXR1cm5zIHtQYXJ0aWNsZX0gdGhpc1xuICogQGNoYWluYWJsZVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuc2V0VmVsb2NpdHkgPSBmdW5jdGlvbiBzZXRWZWxvY2l0eSh4LCB5LCB6KSB7XG4gICAgaWYgKHggaW5zdGFuY2VvZiBWZWMzKSB7XG4gICAgICAgIHRoaXMuX3ZlbG9jaXR5LmNvcHkoeCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fdmVsb2NpdHkuc2V0KHgsIHksIHopO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0dGVyIGZvciB0aGUgZm9yY2Ugb24gdGhlIFBhcnRpY2xlXG4gKlxuICogQG1ldGhvZCBnZXRGb3JjZVxuICogQHJldHVybnMge1ZlYzN9IGZvcmNlXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRGb3JjZSA9IGZ1bmN0aW9uIGdldEZvcmNlKCkge1xuICAgIHJldHVybiB0aGlzLl9mb3JjZTtcbn07XG5cbi8qKlxuICogU2V0dGVyIGZvciB0aGUgZm9yY2Ugb24gdGhlIFBhcnRpY2xlXG4gKiBVc3VhbGx5IHVzZWQgdG8gY2xlYXIgdGhlIGZvcmNlIG9uIHRoZSBQYXJ0aWNsZVxuICpcbiAqIEBtZXRob2Qgc2V0Rm9yY2VcbiAqIEBwYXJhbSB7VmVjM30gdiB0aGUgbmV3IEZvcmNlXG4gKiBAcmV0dXJucyB7UGFydGljbGV9IHRoaXNcbiAqIEBjaGFpbmFibGVcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLnNldEZvcmNlID0gZnVuY3Rpb24gc2V0Rm9yY2Uodikge1xuICAgIHRoaXMuX2ZvcmNlLmNvcHkodik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHRlciBmb3IgbW9tZW50dW1cbiAqIHAgKG1vbWVudHVtKSA9IG0gKG1hc3MpICogdiAodmVsb2NpdHkpXG4gKlxuICogQG1ldGhvZCBnZXRNb21lbnR1bVxuICogQHJldHVybnMge1ZlYzN9IG1vbWVudHVtXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRNb21lbnR1bSA9IGZ1bmN0aW9uIGdldE1vbWVudHVtKCkge1xuICAgIHJldHVybiB0aGlzLl9tb21lbnR1bS5jb3B5KHRoaXMudmVsb2NpdHkpLnNjYWxlKHRoaXMuX21hc3MpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBsZW5ndGggb2YgdGhlIG1vbWVudHVtIHZlY3RvclxuICpcbiAqIEBtZXRob2QgZ2V0TW9tZW50dW1TY2FsYXJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGxlbmd0aFxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0TW9tZW50dW1TY2FsYXIgPSBmdW5jdGlvbiBnZXRNb21lbnR1bVNjYWxhcigpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRNb21lbnR1bSgpLmxlbmd0aCgpO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGEgZm9yY2UgdG8gdGhlIHBhcnRpY2xlXG4gKiBUaGUgUGh5c2ljc1N5c3RlbSBjYWxscyB0aGlzIG1ldGhvZCB3aGVuIGFwcGx5aW5nIHRoZSBhZ2VudHNcbiAqXG4gKiBAbWV0aG9kIGFwcGx5Rm9yY2VcbiAqIEBwYXJhbSB7VmVjM30gZm9yY2UgdGhlIGZvcmNlIGFwcGxpZWQgdG8gdGhlIFBhcnRpY2xlXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5hcHBseUZvcmNlID0gZnVuY3Rpb24gYXBwbHlGb3JjZShmb3JjZSl7XG4gICAgdGhpcy5fZm9yY2UuYWRkKGZvcmNlKTtcbn07XG5cbi8qKlxuICogQXBwbGllcyBhbiBpbXB1bHNlIHRvIHRoZSBQYXJ0aWNsZVxuICpcbiAqIEBtZXRob2QgYXBwbHlJbXB1bHNlXG4gKiBAcGFyYW0ge1ZlYzN9IGltcHVsc2VcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmFwcGx5SW1wdWxzZSA9IGZ1bmN0aW9uIGFwcGx5SW1wdWxzZShpbXB1bHNlKSB7XG4gICAgaWYgKGltcHVsc2UuaXNaZXJvKCkgfHwgdGhpcy5pbW11bmUpIHJldHVybjtcbiAgICB0aGlzLl92ZWxvY2l0eS5hZGQoVmVjMy5zY2FsZShpbXB1bHNlLHRoaXMuX2ludk1hc3MpKTtcbn07XG5cbi8qKlxuICogSW50ZWdyYXRlcyBmb3JjZSBpbnRvIHZlbG9jaXR5XG4gKlxuICogQHByb3RlY3RlZFxuICogQG1ldGhvZCBfaW50ZWdyYXRlVmVsb2NpdHlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkdCB0aGUgdGltZSBiZXR3ZWVuIGZyYW1lcyBmb3IgaW50ZWdyYXRpb25cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLl9pbnRlZ3JhdGVWZWxvY2l0eSA9IGZ1bmN0aW9uIF9pbnRlZ3JhdGVWZWxvY2l0eShkdCkge1xuICAgIGlmICghdGhpcy5pbW11bmUpIFN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVWZWxvY2l0eSh0aGlzLCBkdCk7XG4gICAgdGhpcy5fZm9yY2UuY2xlYXIoKTtcbn07XG5cbi8qKlxuICogSW50ZWdyYXRlcyB2ZWxvY2l0eSBpbnRvIHBvc2l0aW9uXG4gKlxuICogQHByb3RlY3RlZFxuICogQG1ldGhvZCBfaW50ZWdyYXRlUG9zZVxuICogQHBhcmFtIHtOdW1iZXJ9IGR0IHRoZSB0aW1lIGJldHdlZW4gZnJhbWVzIGZvciBpbnRlZ3JhdGlvblxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuX2ludGVncmF0ZVBvc2UgPSBmdW5jdGlvbiBfaW50ZWdyYXRlUG9zZShkdCkge1xuICAgIGlmICghdGhpcy5pbW11bmUpIFN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVQb3NpdGlvbih0aGlzLCBkdCk7XG4gICAgdGhpcy5fZXZlbnRFbWl0dGVyLmVtaXQoJ3VwZGF0ZScpO1xuICAgIGlmICh0aGlzLl9mb3JjZS5sZW5ndGgoKSA8IHRoaXMuc2xlZXBUaHJlc2hvbGQgJiYgdGhpcy5fdmVsb2NpdHkubGVuZ3RoKCkgPCB0aGlzLnNsZWVwVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuc2V0dGxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX2V2ZW50RW1pdHRlci5lbWl0KCdzZXR0bGVkJyk7XG4gICAgICAgIHRoaXMuX3ZlbG9jaXR5LmNsZWFyKCk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJ0aWNsZTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGFkYW1AZmFtby51cywgd2lsbEBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuIHZhciBPcHRpb25zTWFuYWdlciA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvT3B0aW9uc01hbmFnZXInKTtcbiB2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50RW1pdHRlcicpO1xuXG4vKipcbiAqIEJhc2UgQ29uc3RyYWludCBjbGFzcyB0byBiZSB1c2VkIGluIHRoZSBQaHlzaWNzU3lzdGVtXG4gKiBTdWJjbGFzcyB0aGlzIGNsYXNzIHRvIGltcGxlbWVudCBhIGNvbnN0cmFpbnRcbiAqXG4gKiBAdmlydHVhbFxuICogQGNsYXNzIENvbnN0cmFpbnRcbiAqL1xuZnVuY3Rpb24gQ29uc3RyYWludChvcHRpb25zKSB7XG4gICAgdGhpcy5zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc291cmNlID0gbnVsbDtcbiAgICB0aGlzLl90YXJnZXRzID0gW107XG4gICAgdGhpcy5fZXZlbnRFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gICAgaWYgKG9wdGlvbnMuc291cmNlKSB0aGlzLnNldFNvdXJjZShvcHRpb25zLnNvdXJjZSk7XG4gICAgaWYgKG9wdGlvbnMudGFyZ2V0cykgdGhpcy5hZGRUYXJnZXQob3B0aW9ucy50YXJnZXRzKTtcblxuICAgIHRoaXMuX0lEID0gbnVsbDtcbn07XG5cbi8vIE5vdCBtZWFudCB0byBiZSBpbXBsZW1lbnRlZFxuQ29uc3RyYWludC5wcm90b3R5cGUgPSB7fTtcbkNvbnN0cmFpbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gdW5kZWZpbmVkO1xuXG5Db25zdHJhaW50LnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gT3B0aW9uc01hbmFnZXIucGF0Y2godGhpcy5vcHRpb25zIHx8IE9iamVjdC5jcmVhdGUodGhpcy5jb25zdHJ1Y3Rvci5ERUZBVUxUX09QVElPTlMgfHwge30pLCBvcHRpb25zKTtcbn07XG5cbkNvbnN0cmFpbnQucHJvdG90eXBlLmdldFNvdXJjZSA9IGZ1bmN0aW9uIGdldFNvdXJjZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fc291cmNlO1xufTtcblxuQ29uc3RyYWludC5wcm90b3R5cGUuZ2V0VGFyZ2V0cyA9IGZ1bmN0aW9uIGdldFRhcmdldHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldHM7XG59O1xuXG5Db25zdHJhaW50LnByb3RvdHlwZS5zZXRTb3VyY2UgPSBmdW5jdGlvbiBzZXRTb3VyY2Uoc291cmNlKSB7XG4gICAgdGhpcy5fZXZlbnRFbWl0dGVyLmVtaXQoJ2FkZCcsIHNvdXJjZSk7XG4gICAgdGhpcy5fc291cmNlID0gc291cmNlO1xufTtcblxuQ29uc3RyYWludC5wcm90b3R5cGUuYWRkVGFyZ2V0ID0gZnVuY3Rpb24gYWRkVGFyZ2V0KHRhcmdldHMpIHtcbiAgICBpZiAoISh0YXJnZXRzIGluc3RhbmNlb2YgQXJyYXkpKSB0YXJnZXRzID0gW3RhcmdldHNdO1xuICAgIHRoaXMuX2V2ZW50RW1pdHRlci5lbWl0KCdhZGQnLCB0YXJnZXRzKTtcbiAgICB2YXIgblRhcmdldHMgPSB0YXJnZXRzLmxlbmd0aDtcbiAgICB3aGlsZSAoblRhcmdldHMtLSkge1xuICAgICAgICB0aGlzLl90YXJnZXRzLnB1c2godGFyZ2V0c1tuVGFyZ2V0c10pO1xuICAgIH1cbn07XG5cbkNvbnN0cmFpbnQucHJvdG90eXBlLnJlbW92ZVRhcmdldCA9IGZ1bmN0aW9uIHJlbW92ZVRhcmdldCh0YXJnZXRzKSB7XG4gICAgaWYgKCEodGFyZ2V0cyBpbnN0YW5jZW9mIEFycmF5KSkgdGFyZ2V0cyA9IFt0YXJnZXRzXTtcbiAgICB2YXIgblRhcmdldHMgPSB0YXJnZXRzLmxlbmd0aDtcbiAgICB3aGlsZSAoblRhcmdldHMtLSkge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLl90YXJnZXRzLmluZGV4T2YodGFyZ2V0c1tuVGFyZ2V0c10pO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkgdGhpcy5fdGFyZ2V0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbn07XG5cbi8qKlxuICogRGV0ZWN0IHZpb2xhdGlvbnMgb2YgdGhlIGNvbnN0cmFpbnRcbiAqXG4gKiBAbWV0aG9kIENvbnN0cmFpbnQjdXBkYXRlXG4gKiBAcGFyYW0ge1BhcnRpY2xlIHwgdW5kZWZpbmVkfSBzb3VyY2UgdGhlIHNvdXJjZSBvZiB0aGUgY29uc3RyYWludFxuICogQHBhcmFtIHtQYXJ0aWNsZVtdfSB0YXJnZXRzIG9mIHRoZSBjb25zdHJhaW50XG4gKiBAdGhyb3dzIHdoZW4gbm90IHN1YmNsYXNzZWRcbiAqL1xuQ29uc3RyYWludC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIC8vIHRocm93IG5ldyBFcnJvcignQ29uc3RyYWludCBzaG91bGQgYmUgZXh0ZW5kZWQsIG5vdCBpbXBsZW1lbnRlZCcpO1xufVxuXG4vKipcbiAqIEFwcGx5IHRoZSBjb25zdHJhaW50IGZyb20gdGhlIHNvdXJjZSB0byB0aGUgdGFyZ2V0c1xuICpcbiAqIEBtZXRob2QgQ29uc3RyYWludCN1cGRhdGVcbiAqIEBwYXJhbSB7UGFydGljbGUgfCB1bmRlZmluZWR9IHNvdXJjZSB0aGUgc291cmNlIG9mIHRoZSBjb25zdHJhaW50XG4gKiBAcGFyYW0ge1BhcnRpY2xlW119IHRhcmdldHMgb2YgdGhlIGNvbnN0cmFpbnRcbiAqIEB0aHJvd3Mgd2hlbiBub3Qgc3ViY2xhc3NlZFxuICovXG5Db25zdHJhaW50LnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24gcmVzb2x2ZShkdCwgaXRlcmF0aW9uKSB7XG4gICAgLy8gdGhyb3cgbmV3IEVycm9yKCdDb25zdHJhaW50IHNob3VsZCBiZSBleHRlbmRlZCwgbm90IGltcGxlbWVudGVkJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29uc3RyYWludDtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGFkYW1AZmFtby51cywgd2lsbEBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xudmFyIE9wdGlvbnNNYW5hZ2VyID0gcmVxdWlyZSgnLi4vLi4vY29yZS9PcHRpb25zTWFuYWdlcicpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4uLy4uL2V2ZW50cy9FdmVudEVtaXR0ZXInKTtcblxuLyoqXG4gKiBBYnN0cmFjdCBmb3JjZSBtYW5hZ2VyIHRvIGFwcGx5IGZvcmNlcyB0byB0YXJnZXRzLiAgTm90IG1lYW50IHRvIGJlIGltcGxlbWVudGVkLlxuICogQHZpcnR1YWxcbiAqIEBjbGFzcyBGb3JjZVxuICovXG5mdW5jdGlvbiBGb3JjZShvcHRpb25zKSB7XG4gICAgdGhpcy5zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc291cmNlID0gbnVsbDtcbiAgICB0aGlzLl90YXJnZXRzID0gW107XG4gICAgdGhpcy5fZm9yY2VGdW5jdGlvbiA9IHRoaXMub3B0aW9ucy5mb3JjZUZ1bmN0aW9uO1xuICAgIHRoaXMuX2V2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIGlmIChvcHRpb25zLnNvdXJjZSkgdGhpcy5zZXRTb3VyY2Uob3B0aW9ucy5zb3VyY2UpO1xuICAgIGlmIChvcHRpb25zLnRhcmdldHMpIHRoaXMuYWRkVGFyZ2V0KG9wdGlvbnMudGFyZ2V0cyk7XG5cbiAgICB0aGlzLl9JRCA9IG51bGw7XG59XG5cbi8vIE5vdCBNZWFudCB0byBiZSBpbXBsZW1lbnRlZFxuRm9yY2UucHJvdG90eXBlID0ge307XG5Gb3JjZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBudWxsO1xuXG5Gb3JjZS5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IE9wdGlvbnNNYW5hZ2VyLnBhdGNoKHRoaXMub3B0aW9ucyB8fCBPYmplY3QuY3JlYXRlKHRoaXMuY29uc3RydWN0b3IuREVGQVVMVF9PUFRJT05TIHx8IHt9KSwgb3B0aW9ucyk7XG59O1xuXG5Gb3JjZS5wcm90b3R5cGUuZ2V0U291cmNlID0gZnVuY3Rpb24gZ2V0U291cmNlKCkge1xuICAgIHJldHVybiB0aGlzLl9zb3VyY2U7XG59O1xuXG5Gb3JjZS5wcm90b3R5cGUuZ2V0VGFyZ2V0cyA9IGZ1bmN0aW9uIGdldFRhcmdldHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldHM7XG59O1xuXG5Gb3JjZS5wcm90b3R5cGUuc2V0U291cmNlID0gZnVuY3Rpb24gc2V0U291cmNlKHNvdXJjZSkge1xuICAgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcbiAgICB0aGlzLl9ldmVudEVtaXR0ZXIuZW1pdCgnYWRkJywgc291cmNlKTtcbn07XG5cbkZvcmNlLnByb3RvdHlwZS5hZGRUYXJnZXQgPSBmdW5jdGlvbiBhZGRUYXJnZXQodGFyZ2V0cykge1xuICAgIGlmICghKHRhcmdldHMgaW5zdGFuY2VvZiBBcnJheSkpIHRhcmdldHMgPSBbdGFyZ2V0c107XG4gICAgdmFyIG5UYXJnZXRzID0gdGFyZ2V0cy5sZW5ndGg7XG4gICAgd2hpbGUgKG5UYXJnZXRzLS0pIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0cy5wdXNoKHRhcmdldHNbblRhcmdldHNdKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRFbWl0dGVyLmVtaXQoJ2FkZCcsIHRhcmdldHMpO1xufTtcblxuRm9yY2UucHJvdG90eXBlLnJlbW92ZVRhcmdldCA9IGZ1bmN0aW9uIHJlbW92ZVRhcmdldCh0YXJnZXRzKSB7XG4gICAgaWYgKCEodGFyZ2V0cyBpbnN0YW5jZW9mIEFycmF5KSkgdGFyZ2V0cyA9IFt0YXJnZXRzXTtcbiAgICB2YXIgblRhcmdldHMgPSB0YXJnZXRzLmxlbmd0aDtcbiAgICB3aGlsZSAoblRhcmdldHMtLSkge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLl90YXJnZXRzLmluZGV4T2YodGFyZ2V0c1tuVGFyZ2V0c10pO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkgdGhpcy5fdGFyZ2V0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQG1ldGhvZCB1cGRhdGVcbiAqIEBwYXJhbSB7UGFydGljbGV9IHNvdXJjZVxuICogQHBhcmFtIHtQYXJ0aWNsZVtdfSB0YXJnZXRzXG4gKi9cbkZvcmNlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIHNvdXJjZSA9IHRoaXMuX3NvdXJjZTtcbiAgICB2YXIgdGFyZ2V0cyA9IHRoaXMuX3RhcmdldHM7XG5cbiAgICB0aGlzLl9ldmVudEVtaXR0ZXIuZW1pdCgndXBkYXRlJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRhcmdldHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IHRhcmdldHNbaV07XG4gICAgICAgIHRhcmdldC5hcHBseUZvcmNlKHRoaXMuX2ZvcmNlRnVuY3Rpb24oc291cmNlLCB0YXJnZXQpKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZvcmNlO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogYWRhbUBmYW1vLnVzLCB3aWxsQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cblxuLyoqXG4gKiBPcmRpbmFyeSBEaWZmZXJlbnRpYWwgRXF1YXRpb24gKE9ERSkgSW50ZWdyYXRvci5cbiAqIE1hbmFnZXMgdXBkYXRpbmcgYSBwaHlzaWNzIGJvZHkncyBzdGF0ZSBvdmVyIHRpbWUuXG4gKlxuICogIHAgPSBwb3NpdGlvbiwgdiA9IHZlbG9jaXR5LCBtID0gbWFzcywgZiA9IGZvcmNlLCBkdCA9IGNoYW5nZSBpbiB0aW1lXG4gKlxuICogICAgICB2IDwtIHYgKyBkdCAqIGYgLyBtXG4gKiAgICAgIHAgPC0gcCArIGR0ICogdlxuICpcbiAqICBxID0gb3JpZW50YXRpb24sIHcgPSBhbmd1bGFyIHZlbG9jaXR5LCBMID0gYW5ndWxhciBtb21lbnR1bVxuICpcbiAqICAgICAgTCA8LSBMICsgZHQgKiB0XG4gKiAgICAgIHEgPC0gcSArIGR0LzIgKiBxICogd1xuICpcbiAqIEBjbGFzcyBTeW1wbGVjdGljRXVsZXJcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgT3B0aW9ucyB0byBzZXRcbiAqL1xudmFyIFN5bXBsZWN0aWNFdWxlciA9IHt9O1xudmFyIFZlYzMgPSByZXF1aXJlKCcuLi8uLi9tYXRoL1ZlYzMnKTtcblxudmFyIERFTFRBX1JFR0lTVEVSID0gbmV3IFZlYzMoKTtcblxuLypcbiAqIFVwZGF0ZXMgdGhlIHZlbG9jaXR5IG9mIGEgcGh5c2ljcyBib2R5IGZyb20gaXRzIGFjY3VtdWxhdGVkIGZvcmNlLlxuICogICAgICB2IDwtIHYgKyBkdCAqIGYgLyBtXG4gKlxuICogQG1ldGhvZCBpbnRlZ3JhdGVWZWxvY2l0eVxuICogQHBhcmFtIHtCb2R5fSBwaHlzaWNzIGJvZHlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkdCBkZWx0YSB0aW1lXG4gKi9cblN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVWZWxvY2l0eSA9IGZ1bmN0aW9uIGludGVncmF0ZVZlbG9jaXR5KGJvZHksIGR0KSB7XG4gICAgdmFyIHYgPSBib2R5LmdldFZlbG9jaXR5KCk7XG4gICAgdmFyIHcgPSBib2R5LmdldEludmVyc2VNYXNzKCk7XG4gICAgdmFyIGYgPSBib2R5LmdldEZvcmNlKCk7XG4gICAgaWYgKGYuaXNaZXJvKCkpIHJldHVybjtcblxuICAgIHYuYWRkKERFTFRBX1JFR0lTVEVSLmNvcHkoZikuc2NhbGUoZHQgKiB3KSk7XG59O1xuXG4vKlxuICogVXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgYSBwaHlzaWNzIGJvZHkgZnJvbSBpdHMgdmVsb2NpdHkuXG4gKiAgICAgIHAgPC0gcCArIGR0ICogdlxuICpcbiAqIEBtZXRob2QgaW50ZWdyYXRlUG9zaXRpb25cbiAqIEBwYXJhbSB7Qm9keX0gcGh5c2ljcyBib2R5XG4gKiBAcGFyYW0ge051bWJlcn0gZHQgZGVsdGEgdGltZVxuICovXG5TeW1wbGVjdGljRXVsZXIuaW50ZWdyYXRlUG9zaXRpb24gPSBmdW5jdGlvbiBpbnRlZ3JhdGVQb3NpdGlvbihib2R5LCBkdCkge1xuICAgIHZhciBwID0gYm9keS5nZXRQb3NpdGlvbigpO1xuICAgIHZhciB2ID0gYm9keS5nZXRWZWxvY2l0eSgpO1xuXG4gICAgaWYgKE1hdGguYWJzKHYueCkgPT09IEluZmluaXR5IHx8IE1hdGguYWJzKHYueSkgPT09IEluZmluaXR5IHx8IE1hdGguYWJzKHYueikgPT09IEluZmluaXR5KSBkZWJ1Z2dlcjtcblxuICAgIHAuYWRkKERFTFRBX1JFR0lTVEVSLmNvcHkodikuc2NhbGUoZHQpKTtcbiAgICBpZiAoTWF0aC5hYnMocC54KSA9PT0gSW5maW5pdHkgfHwgTWF0aC5hYnMocC55KSA9PT0gSW5maW5pdHkgfHwgTWF0aC5hYnMocC56KSA9PT0gSW5maW5pdHkpIGRlYnVnZ2VyO1xufTtcblxuLypcbiAqIFVwZGF0ZXMgdGhlIGFuZ3VsYXIgbW9tZW50dW0gb2YgYSBwaHlzaWNzIGJvZHkgZnJvbSBpdHMgYWNjdW11bGVkIHRvcnF1ZS5cbiAqICAgICAgTCA8LSBMICsgZHQgKiB0XG4gKlxuICogQG1ldGhvZCBpbnRlZ3JhdGVBbmd1bGFyTW9tZW50dW1cbiAqIEBwYXJhbSB7Qm9keX0gcGh5c2ljcyBib2R5IChleGNlcHQgYSBwYXJ0aWNsZSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkdCBkZWx0YSB0aW1lXG4gKi9cblN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVBbmd1bGFyTW9tZW50dW0gPSBmdW5jdGlvbiBpbnRlZ3JhdGVBbmd1bGFyTW9tZW50dW0oYm9keSwgZHQpIHtcbiAgICB2YXIgTCA9IGJvZHkuYW5ndWxhck1vbWVudHVtO1xuICAgIHZhciB0ID0gYm9keS50b3JxdWU7XG5cbiAgICBpZiAodC5pc1plcm8oKSkgcmV0dXJuO1xuXG4gICAgTC5hZGQodC5zY2FsZShkdCkpO1xufTtcblxuLypcbiAqIFVwZGF0ZXMgdGhlIG9yaWVudGF0aW9uIG9mIGEgcGh5c2ljcyBib2R5IGZyb20gaXRzIGFuZ3VsYXIgdmVsb2NpdHkuXG4gKiAgICAgIHEgPC0gcSArIGR0LzIgKiBxICogd1xuICpcbiAqIEBtZXRob2QgaW50ZWdyYXRlT3JpZW50YXRpb25cbiAqIEBwYXJhbSB7Qm9keX0gcGh5c2ljcyBib2R5IChleGNlcHQgYSBwYXJ0aWNsZSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkdCBkZWx0YSB0aW1lXG4gKi9cblxuU3ltcGxlY3RpY0V1bGVyLmludGVncmF0ZU9yaWVudGF0aW9uID0gZnVuY3Rpb24gaW50ZWdyYXRlT3JpZW50YXRpb24oYm9keSwgZHQpIHtcbiAgICB2YXIgcSA9IGJvZHkub3JpZW50YXRpb247XG4gICAgdmFyIHcgPSBib2R5LmFuZ3VsYXJWZWxvY2l0eTtcblxuICAgIGlmICh3LmlzWmVybygpKSByZXR1cm47XG4gICAgcS5hZGQocS5tdWx0aXBseSh3KS5zY2FsYXJNdWx0aXBseSgwLjUgKiBkdCkpLnB1dChxKTtcbiAgICBxLm5vcm1hbGl6ZSgpLnB1dChxKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3ltcGxlY3RpY0V1bGVyO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jb3JlL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgTGlmdENvbGxlY3Rpb24gPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdMaWZ0Jyk7XG5cbi8qKlxuICogTGlmdFN5c3RlbSBpcyByZXNwb25zaWJsZSBmb3IgdHJhdmVyc2luZyB0aGUgc2NlbmUgZ3JhcGggYW5kXG4gKiAgIHVwZGF0aW5nIHRoZSBUcmFuc2Zvcm1zLCBTaXplcywgYW5kIE9wYWNpdGllcyBvZiB0aGUgZW50aXRpZXMuXG4gKlxuICogQGNsYXNzICBMaWZ0U3lzdGVtXG4gKiBAc3lzdGVtXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBMaWZ0U3lzdGVtID0ge307XG5cbi8qKlxuICogdXBkYXRlIGl0ZXJhdGVzIG92ZXIgZWFjaCBvZiB0aGUgQ29udGV4dHMgdGhhdCB3ZXJlIHJlZ2lzdGVyZWQgYW5kXG4gKiAgIGtpY2tzIG9mIHRoZSByZWN1cnNpdmUgdXBkYXRpbmcgb2YgdGhlaXIgZW50aXRpZXMuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVcbiAqL1xudmFyIHRlc3QgPSBbXTtcbkxpZnRTeXN0ZW0udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIHZhciByb290UGFyYW1zO1xuICAgIHZhciBsaWZ0O1xuICAgIHZhciBjbGVhbnVwID0gW107XG5cbiAgICBMaWZ0Q29sbGVjdGlvbi5mb3JFYWNoKGZ1bmN0aW9uKGVudGl0eSkge1xuICAgICAgICBsaWZ0ID0gZW50aXR5LmdldENvbXBvbmVudCgnTGlmdENvbXBvbmVudCcpO1xuICAgICAgICByb290UGFyYW1zID0gbGlmdC5fdXBkYXRlKCk7XG4gICAgICAgIHJvb3RQYXJhbXMudW5zaGlmdChlbnRpdHkpO1xuICAgICAgICBjb3JlVXBkYXRlQW5kRmVlZC5hcHBseShudWxsLCByb290UGFyYW1zKTtcblxuICAgICAgICBpZiAobGlmdC5kb25lKSBjbGVhbnVwLnB1c2goZW50aXR5KTtcbiAgICB9KTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2xlYW51cC5sZW5ndGg7IGkrKykge1xuICAgICAgICBjbGVhbnVwW2ldLnJlbW92ZUNvbXBvbmVudCgnTGlmdENvbXBvbmVudCcpO1xuICAgICAgICBFbnRpdHlSZWdpc3RyeS5kZXJlZ2lzdGVyKGNsZWFudXBbaV0sICdMaWZ0Jyk7XG4gICAgfVxufVxuXG4vKipcbiAqIGNvcmVVcGRhdGVBbmRGZWVkIGZlZWRzIHBhcmVudCBpbmZvcm1hdGlvbiB0byBhbiBlbnRpdHkgYW5kIHNvIHRoYXRcbiAqICAgZWFjaCBlbnRpdHkgY2FuIHVwZGF0ZSB0aGVpciB0cmFuc2Zvcm0sIHNpemUsIGFuZCBvcGFjaXR5LiAgSXQgXG4gKiAgIHdpbGwgdGhlbiBwYXNzIGRvd24gaW52YWxpZGF0aW9uIHN0YXRlcyBhbmQgdmFsdWVzIHRvIGFueSBjaGlsZHJlbi5cbiAqXG4gKiBAbWV0aG9kIGNvcmVVcGRhdGVBbmRGZWVkXG4gKiBAcHJpdmF0ZVxuICogICBcbiAqIEBwYXJhbSAge0VudGl0eX0gIGVudGl0eSAgICAgICAgICAgRW50aXR5IGluIHRoZSBzY2VuZSBncmFwaFxuICogQHBhcmFtICB7TnVtYmVyfSAgdHJhbnNmb3JtUmVwb3J0ICBiaXRTY2hlbWUgcmVwb3J0IG9mIHRyYW5zZm9ybSBpbnZhbGlkYXRpb25zXG4gKiBAcGFyYW0gIHtBcnJheX0gICBpbmNvbWluZ01hdHJpeCAgIHBhcmVudCB0cmFuc2Zvcm0gYXMgYSBGbG9hdDMyIEFycmF5XG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICBzaXplUmVwb3J0ICAgICAgIGJpdFNjaGVtZSByZXBvcnQgb2Ygc2l6ZSBpbnZhbGlkYXRpb25zXG4gKiBAcGFyYW0gIHtBcnJheX0gICBpbmNvbWluZ1NpemUgICAgIHBhcmVudCBzaXplIGluIHBpeGVsc1xuICogQHBhcmFtICB7Qm9vbGVhbn0gb3BhY2l0eVJlcG9ydCAgICBib29sZWFuIHJlcG9ydCBvZiBvcGFjaXR5IGludmFsaWRhdGlvblxuICogQHBhcmFtICB7TnVtYmVyfSAgaW5jb21pbmdPcGFjaXR5ICBwYXJlbnQgb3BhY2l0eVxuICovXG5mdW5jdGlvbiBjb3JlVXBkYXRlQW5kRmVlZChlbnRpdHksIHRyYW5zZm9ybVJlcG9ydCwgaW5jb21pbmdNYXRyaXgsIHNpemVSZXBvcnQsIGluY29taW5nU2l6ZSwgb3BhY2l0eVJlcG9ydCwgaW5jb21pbmdPcGFjaXR5KSB7XG4gICAgaWYgKCFlbnRpdHkpIHJldHVybjtcbiAgICB2YXIgdHJhbnNmb3JtID0gZW50aXR5LmdldENvbXBvbmVudCgndHJhbnNmb3JtJyk7XG4gICAgdmFyIHNpemUgICAgICA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3NpemUnKTtcbiAgICB2YXIgb3BhY2l0eSAgID0gZW50aXR5LmdldENvbXBvbmVudCgnb3BhY2l0eScpO1xuICAgIHZhciBjaGlsZHJlbiAgPSBlbnRpdHkuZ2V0Q2hpbGRyZW4oKTtcbiAgICB2YXIgaSA9IGNoaWxkcmVuLmxlbmd0aDtcblxuICAgIHRyYW5zZm9ybVJlcG9ydCA9IHRyYW5zZm9ybS5fdXBkYXRlKHRyYW5zZm9ybVJlcG9ydCwgaW5jb21pbmdNYXRyaXgpO1xuICAgIHNpemVSZXBvcnQgICAgICA9IHNpemUuX3VwZGF0ZShzaXplUmVwb3J0LCBpbmNvbWluZ1NpemUpO1xuICAgIG9wYWNpdHlSZXBvcnQgICA9IG9wYWNpdHkuX3VwZGF0ZShvcGFjaXR5UmVwb3J0LCBpbmNvbWluZ09wYWNpdHkpO1xuXG4gICAgd2hpbGUgKGktLSkgXG4gICAgICAgIGNvcmVVcGRhdGVBbmRGZWVkKFxuICAgICAgICAgICAgY2hpbGRyZW5baV0sXG4gICAgICAgICAgICB0cmFuc2Zvcm1SZXBvcnQsXG4gICAgICAgICAgICB0cmFuc2Zvcm0uX21hdHJpeCxcbiAgICAgICAgICAgIHNpemVSZXBvcnQsXG4gICAgICAgICAgICBzaXplLl9nbG9iYWxTaXplLFxuICAgICAgICAgICAgb3BhY2l0eVJlcG9ydCxcbiAgICAgICAgICAgIG9wYWNpdHkuX2dsb2JhbE9wYWNpdHkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExpZnRTeXN0ZW07XG4iLCJ2YXIgRW5naW5lICA9IHJlcXVpcmUoJ2ZhbW91cy9zcmMvY29yZS9FbmdpbmUnKTtcbnZhciBTdXJmYWNlID0gcmVxdWlyZSgnZmFtb3VzL3NyYy9jb3JlL0NvbXBvbmVudHMvU3VyZmFjZScpO1xuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG5cblx0dmFyIGNvbnRleHQgPSBFbmdpbmUuY3JlYXRlQ29udGV4dCgpO1xuXHR2YXIgZW50aXR5ID0gY29udGV4dC5hZGRDaGlsZCgpO1xuXG5cdHZhciBzdXJmYWNlID0gZW50aXR5LmFkZENvbXBvbmVudChTdXJmYWNlLCB7XG5cdFx0c2l6ZTogWzEwMCwxMDBdLFxuXHRcdGNvbnRlbnQ6IFwiSGVsbG8gV29ybGRcIiwgICAgICAgIFxuXHRcdCBwcm9wZXJ0aWVzOiB7XG5cdFx0ICAgICAgY29sb3I6IFwid2hpdGVcIixcblx0XHQgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwiI0ZBNUM0RlwiLFxuXHRcdCAgICAgIHRleHRBbGlnbjogXCJjZW50ZXJcIlxuXHRcdCAgICB9XG5cdH0pO1xufVxuXG4gXG4gICAgXG4gICAgXG5cbiJdfQ==
