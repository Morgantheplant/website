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
		content: "<h2>HTML content</h2>",        
		 properties: {
		      color: "white",
		      borderRadius: "50px",
		      textAlign: "center",
		      backgroundColor: 'blue'
		    }
	});

  entity.getComponent('transform').translate(-150,-175,0)

}

 
    
    


},{"famous/src/core/Components/Surface":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Components\\Surface.js","famous/src/core/Engine":"c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\node_modules\\famous\\src\\core\\Engine.js"}]},{},["c:\\Users\\Morgan\\desktop\\mixed-mode-seed\\src\\index.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxjc3NpZnlcXGJyb3dzZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxDYW1lcmEuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxDb250YWluZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxPcGFjaXR5LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcQ29tcG9uZW50c1xcU2l6ZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXENvbXBvbmVudHNcXFN1cmZhY2UuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxUYXJnZXQuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb21wb25lbnRzXFxUcmFuc2Zvcm0uanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxDb250ZXh0LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcRW5naW5lLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcRW50aXR5LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcRW50aXR5Q29sbGVjdGlvbi5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXEVudGl0eVJlZ2lzdHJ5LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcT3B0aW9uc01hbmFnZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxjb3JlXFxSZW5kZXJlcnNcXERPTXJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcUmVuZGVyZXJzXFxFbGVtZW50QWxsb2NhdG9yLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcUmVuZGVyZXJzXFxXZWJHTFJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcU3R5bGVzaGVldFxcZmFtb3VzLmNzcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXFN5c3RlbXNcXEJlaGF2aW9yU3lzdGVtLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcY29yZVxcU3lzdGVtc1xcQ29yZVN5c3RlbS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXFN5c3RlbXNcXFJlbmRlclN5c3RlbS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGNvcmVcXFN5c3RlbXNcXFRpbWVTeXN0ZW0uanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxldmVudHNcXEV2ZW50RW1pdHRlci5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGV2ZW50c1xcRXZlbnRIYW5kbGVyLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xcZ2xcXEJ1ZmZlci5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGdsXFxHZW9tZXRyeS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXGdsXFxTaGFkZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxnbFxcVGV4dHVyZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXG1hdGhcXE1hdHJpeDR4NC5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXG1hdGhcXFZlYzMuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFxwaHlzaWNzXFxQaHlzaWNzU3lzdGVtLmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xccGh5c2ljc1xcYm9kaWVzXFxQYXJ0aWNsZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXHBoeXNpY3NcXGNvbnN0cmFpbnRzXFxDb25zdHJhaW50LmpzIiwibm9kZV9tb2R1bGVzXFxmYW1vdXNcXHNyY1xccGh5c2ljc1xcZm9yY2VzXFxGb3JjZS5qcyIsIm5vZGVfbW9kdWxlc1xcZmFtb3VzXFxzcmNcXHBoeXNpY3NcXGludGVncmF0b3JzXFxTeW1wbGVjdGljRXVsZXIuanMiLCJub2RlX21vZHVsZXNcXGZhbW91c1xcc3JjXFx0cmFuc2l0aW9uc1xcTGlmdFN5c3RlbS5qcyIsInNyY1xcaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25iQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVVBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3MsIGN1c3RvbURvY3VtZW50KSB7XG4gIHZhciBkb2MgPSBjdXN0b21Eb2N1bWVudCB8fCBkb2N1bWVudDtcbiAgaWYgKGRvYy5jcmVhdGVTdHlsZVNoZWV0KSB7XG4gICAgdmFyIHNoZWV0ID0gZG9jLmNyZWF0ZVN0eWxlU2hlZXQoKVxuICAgIHNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgcmV0dXJuIHNoZWV0Lm93bmVyTm9kZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgaGVhZCA9IGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgICAgICBzdHlsZSA9IGRvYy5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuXG4gICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5cbiAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgfVxuXG4gICAgaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgcmV0dXJuIHN0eWxlO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5ieVVybCA9IGZ1bmN0aW9uKHVybCkge1xuICBpZiAoZG9jdW1lbnQuY3JlYXRlU3R5bGVTaGVldCkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVTdHlsZVNoZWV0KHVybCkub3duZXJOb2RlO1xuICB9IGVsc2Uge1xuICAgIHZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICAgICAgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcblxuICAgIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuICAgIGxpbmsuaHJlZiA9IHVybDtcblxuICAgIGhlYWQuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cbn07XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBNYXRyaXhNYXRoICAgICA9IHJlcXVpcmUoJy4uLy4uL21hdGgvTWF0cml4NHg0Jyk7XG52YXIgT3B0aW9uc01hbmFnZXIgPSByZXF1aXJlKCcuLi9PcHRpb25zTWFuYWdlcicpO1xuXG4vLyBDT05TVFNcbnZhciBDT01QT05FTlRfTkFNRSA9ICdjYW1lcmEnO1xudmFyIFBST0pFQ1RJT04gICAgID0gJ3Byb2plY3Rpb24nO1xuXG52YXIgTWFpbkNhbWVyYSAgICAgPSBudWxsO1xuXG4vKipcbiAqIENhbWVyYVxuICpcbiAqIEBjb21wb25lbnQgQ2FtZXJhXG4gKiBAY29uc3RydWN0b3JcbiAqIFxuICogQHBhcmFtIHtFbnRpdHl9IFtlbnRpdHldICBFbnRpdHkgdGhhdCB0aGUgQ29udGFpbmVyIGlzIGEgY29tcG9uZW50IG9mXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFuIG9iamVjdCBvZiBjb25maWd1cmFibGUgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnR5cGU9J3BpbmhvbGUnXSBUaGUgcHJvamVjdGlvbiBtb2RlbCB1c2VkIGluIHRoZSBnZW5lcmF0aW9uIG9mIGNhbWVyYSdzIHByb2plY3Rpb24gbWF0cml4LCBpZGVudGlmaWVkIGJ5IHN0cmluZy4gQ2FuIGJlIGVpdGhlciAncGVyc3BlY3RpdmUnLCBvciAncGluaG9sZScuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMucHJvamVjdGlvbl0gQSBzdWItb2JqZWN0IG9mIG9wdGlvbnMgcmVzcG9uc2libGUgZm9yIGNvbmZpZ3VyaW5nIHByb2plY3Rpb24uIFRoZXNlIG9wdGlvbnMgdmFyeVxuICogQHBhcmFtIHtBcnJheSB8IE51bWJlciAxRCB8IFZlY3RvciAzfSAgW29wdGlvbnMucHJvamVjdGlvbi5mb2NhbFBvaW50PVswLCAwLCAwXV0gIFNwZWNpZmllcyB0aGUgZm9jYWwgcG9pbnQgZm9yIHBpbmhvbGUgcHJvamVjdGlvbi4gVGhlIGZpcnN0IHR3byBudW1iZXJzIGRldGVybWluZSB0aGUgeCBhbmQgeSBvZiB0aGUgdmFuaXNoaW5nIHBvaW50LCBhbmQgdGhlIHRoaXJkIGRldGVybWluZXMgdGhlIGRpc3RhbmNlIG9mIHRoZSBjYW1lcmEncyBcImV5ZVwiIHRvIHRoZSBtYXRoZW1hdGljYWwgeHkgcGxhbmUgb2YgeW91ciBzY2VuZS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5wcm9qZWN0aW9uLm5lYXJQbGFuZT0wXSAgU3BlY2lmaWVzIHRoZSBuZWFyIGJvdW5kIG9mIHRoZSB2aWV3aW5nIHZvbHVtZSBmb3IgcGVyc3BlY3RpdmUgcHJvamVjdGlvbi5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5wcm9qZWN0aW9uLmZhclBsYW5lPTBdICBTcGVjaWZpZXMgdGhlIGZhciBib3VuZCBvZiB0aGUgdmlld2luZyB2b2x1bWUgZm9yIHBlcnNwZWN0aXZlIHByb2plY3Rpb24uXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMucHJvamVjdGlvbi5maWVsZE9mVmlldz1QSS80XSAgU3BlY2lmaWVzIHRoZSBmaWVsZCBvZiB2aWV3IGZvciBwZXJzcGVjdGl2ZSBwcm9qZWN0aW9uIChpbiByYWRpYW5zKS5cbiAqL1xuZnVuY3Rpb24gQ2FtZXJhKGVudGl0eSwgb3B0aW9ucykge1xuICAgIHRoaXMuX2VudGl0eSAgICAgICAgICAgICAgPSBlbnRpdHk7XG5cbiAgICB0aGlzLl9wcm9qZWN0aW9uVHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuXG4gICAgdGhpcy5vcHRpb25zICAgICAgICAgICAgICA9IE9iamVjdC5jcmVhdGUoQ2FtZXJhLkRFRkFVTFRfT1BUSU9OUyk7XG4gICAgdGhpcy5fb3B0aW9uc01hbmFnZXIgICAgICA9IG5ldyBPcHRpb25zTWFuYWdlcih0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuX29wdGlvbnNNYW5hZ2VyLm9uKCdjaGFuZ2UnLCBfZXZlbnRzQ2hhbmdlLmJpbmQodGhpcykpOyAvL3JvYnVzdCBpbnRlZ3JhdGlvblxuXG4gICAgaWYgKG9wdGlvbnMpIHRoaXMuc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICAgIF9yZWNhbGN1bGF0ZVByb2plY3Rpb25UcmFuc2Zvcm0uY2FsbCh0aGlzKTtcbn1cblxuQ2FtZXJhLkRFRkFVTFRfUElOSE9MRV9PUFRJT05TID0ge1xuICAgIGZvY2FsUG9pbnQ6IFswLCAwLCAwXVxufTtcblxuQ2FtZXJhLkRFRkFVTFRfUEVSU1BFQ1RJVkVfT1BUSU9OUyA9IHtcbiAgICBuZWFyUGxhbmU6IDAsXG4gICAgZmFyUGxhbmU6IDAsXG4gICAgZmllbGRPZlZpZXc6IDAuNzg1Mzk4MTYzMzkgLy8gUEkvNCB8IDQ1IGRlZ3JlZXNcbn07XG5cbkNhbWVyYS5ERUZBVUxUX09QVElPTlMgPSB7XG4gICAgdHlwZSAgICA6ICdwaW5ob2xlJyxcbiAgICBwcm9qZWN0aW9uIDogQ2FtZXJhLkRFRkFVTFRfUElOSE9MRV9PUFRJT05TXG59O1xuXG5DYW1lcmEudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gQ09NUE9ORU5UX05BTUU7XG59O1xuXG5DYW1lcmEuZ2V0TWFpbkNhbWVyYSA9IGZ1bmN0aW9uIGdldE1haW5DYW1lcmEoKSB7XG4gICAgcmV0dXJuIE1haW5DYW1lcmE7XG59O1xuXG5DYW1lcmEucHJvamVjdGlvblRyYW5zZm9ybXMgPSB7fTtcblxuQ2FtZXJhLnByb2plY3Rpb25UcmFuc2Zvcm1zLnBpbmhvbGUgPSBmdW5jdGlvbiBwaW5ob2xlKHRyYW5zZm9ybSwgb3B0aW9ucykge1xuICAgIHZhciBmb2NhbFZlY3RvciA9IG9wdGlvbnMuZm9jYWxQb2ludDtcbiAgICB2YXIgZm9jYWxEaXZpZGUgPSBmb2NhbFZlY3RvclsyXSA/IDEvZm9jYWxWZWN0b3JbMl0gOiAwO1xuXG4gICAgdHJhbnNmb3JtWzBdICA9IDE7XG4gICAgdHJhbnNmb3JtWzFdICA9IDA7XG4gICAgdHJhbnNmb3JtWzJdICA9IDA7XG4gICAgdHJhbnNmb3JtWzNdICA9IDA7XG4gICAgXG4gICAgdHJhbnNmb3JtWzRdICA9IDA7XG4gICAgdHJhbnNmb3JtWzVdICA9IDE7XG4gICAgdHJhbnNmb3JtWzZdICA9IDA7XG4gICAgdHJhbnNmb3JtWzddICA9IDA7XG4gICBcbiAgICB0cmFuc2Zvcm1bOF0gID0gLWZvY2FsRGl2aWRlICogZm9jYWxWZWN0b3JbMF07XG4gICAgdHJhbnNmb3JtWzldICA9IC1mb2NhbERpdmlkZSAqIGZvY2FsVmVjdG9yWzFdO1xuICAgIHRyYW5zZm9ybVsxMF0gPSBmb2NhbERpdmlkZTtcbiAgICB0cmFuc2Zvcm1bMTFdID0gLWZvY2FsRGl2aWRlO1xuICAgIFxuICAgIHRyYW5zZm9ybVsxMl0gPSAwO1xuICAgIHRyYW5zZm9ybVsxM10gPSAwO1xuICAgIHRyYW5zZm9ybVsxNF0gPSAwO1xuICAgIHRyYW5zZm9ybVsxNV0gPSAxO1xuXG4gICAgcmV0dXJuIHRyYW5zZm9ybTtcbn07XG5cbkNhbWVyYS5wcm9qZWN0aW9uVHJhbnNmb3Jtcy5wZXJzcGVjdGl2ZSA9IGZ1bmN0aW9uIHBlcnNwZWN0aXZlKHRyYW5zZm9ybSwgb3B0aW9ucykge1xuICAgIHZhciBuZWFyID0gb3B0aW9ucy5uZWFyUGxhbmU7XG4gICAgdmFyIGZhciAgPSBvcHRpb25zLmZhclBsYW5lO1xuICAgIHZhciBmb3Z5ID0gb3B0aW9ucy5maWVsZE9mVmlldztcblxuICAgIHZhciBmICA9IDEgLyBNYXRoLnRhbihmb3Z5IC8gMik7XG4gICAgdmFyIG5mID0gKG5lYXIgJiYgZmFyKSA/IDEgLyAobmVhciAtIGZhcikgOiAwO1xuXG4gICAgdHJhbnNmb3JtWzBdICA9IGY7XG4gICAgdHJhbnNmb3JtWzFdICA9IDA7XG4gICAgdHJhbnNmb3JtWzJdICA9IDA7XG4gICAgdHJhbnNmb3JtWzNdICA9IDA7XG5cbiAgICB0cmFuc2Zvcm1bNF0gID0gMDtcbiAgICB0cmFuc2Zvcm1bNV0gID0gZjtcbiAgICB0cmFuc2Zvcm1bNl0gID0gMDtcbiAgICB0cmFuc2Zvcm1bN10gID0gMDtcblxuICAgIHRyYW5zZm9ybVs4XSAgPSAwO1xuICAgIHRyYW5zZm9ybVs5XSAgPSAwO1xuICAgIHRyYW5zZm9ybVsxMF0gPSAoZmFyICsgbmVhcikgKiBuZjtcbiAgICB0cmFuc2Zvcm1bMTFdID0gLTE7XG5cbiAgICB0cmFuc2Zvcm1bMTJdID0gMDtcbiAgICB0cmFuc2Zvcm1bMTNdID0gMDtcbiAgICB0cmFuc2Zvcm1bMTRdID0gKDIgKiBmYXIgKiBuZWFyKSAqIG5mO1xuICAgIHRyYW5zZm9ybVsxNV0gPSAwO1xuXG4gICAgcmV0dXJuIHRyYW5zZm9ybTtcbn07XG5cbmZ1bmN0aW9uIF9ldmVudHNDaGFuZ2UoZGF0YSkge1xuICAgIGlmIChkYXRhLmlkID09PSBQUk9KRUNUSU9OKSB7XG4gICAgICAgIF9yZWNhbGN1bGF0ZVByb2plY3Rpb25UcmFuc2Zvcm0uY2FsbCh0aGlzKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIF9yZWNhbGN1bGF0ZVByb2plY3Rpb25UcmFuc2Zvcm0oKSB7XG4gICAgcmV0dXJuIENhbWVyYS5wcm9qZWN0aW9uVHJhbnNmb3Jtc1t0aGlzLm9wdGlvbnMudHlwZV0odGhpcy5fcHJvamVjdGlvblRyYW5zZm9ybSwgdGhpcy5vcHRpb25zLnByb2plY3Rpb24pO1xufVxuXG5DYW1lcmEucHJvdG90eXBlLnNldE9wdGlvbnMgPSBmdW5jdGlvbiBzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5fb3B0aW9uc01hbmFnZXIuc2V0T3B0aW9ucyhvcHRpb25zKTtcbn07XG5cbkNhbWVyYS5wcm90b3R5cGUuZ2V0T3B0aW9ucyA9IGZ1bmN0aW9uIGdldE9wdGlvbnMoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgQ2FtZXJhJ3MgY3VycmVudCBwcm9qZWN0aW9uIHRyYW5zZm9ybS5cbiAqXG4gKiBAbWV0aG9kIGdldFByb2plY3Rpb25UcmFuc2Zvcm1cbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcmV0dXJuIHtBcnJheSB8IDFEIE5tYmVyfCBUcmFuc2Zvcm19XG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuZ2V0UHJvamVjdGlvblRyYW5zZm9ybSA9IGZ1bmN0aW9uIGdldFByb2plY3Rpb25UcmFuc2Zvcm0oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Byb2plY3Rpb25UcmFuc2Zvcm07XG59O1xuXG5cbkNhbWVyYS5wcm90b3R5cGUuc2V0UGVyc3BlY3RpdmUgPSBmdW5jdGlvbiBzZXRQZXJzcGVjdGl2ZShmb2NhbERlcHRoKSB7XG4gICAgLy9JcyB0aGVyZSBhIGxlc3MgZ2FyYmFnZS15IHdheSB0byBkbyB0aGlzPyAoeWVzKSBJcyBpdCBldmVuIGRlc2lyYWJsZT8gKGFsaWFzaW5nIGFsbG93cyBmb3Igb25lIHNvdXJjZSBvZiBsb2dpYylcbiAgICB0aGlzLnNldE9wdGlvbnMoe1xuICAgICAgICB0eXBlOiAncGluaG9sZScsXG4gICAgICAgIHByb2plY3Rpb246IHtcbiAgICAgICAgICAgICAgICBmb2NhbFBvaW50OiBbMCwgMCwgZm9jYWxEZXB0aF1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5DYW1lcmEucHJvdG90eXBlLnNldE1haW5DYW1lcmEgPSBmdW5jdGlvbiBzZXRNYWluQ2FtZXJhKCkge1xuICAgIE1haW5DYW1lcmEgPSB0aGlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW1lcmE7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgTWF0cml4TWF0aCAgICAgPSByZXF1aXJlKCcuLi8uLi9tYXRoL01hdHJpeDR4NCcpO1xudmFyIEV2ZW50SGFuZGxlciAgID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50SGFuZGxlcicpO1xudmFyIFRhcmdldCAgID0gcmVxdWlyZSgnLi9UYXJnZXQnKTtcbnZhciBHTCAgID0gcmVxdWlyZSgnLi4vUmVuZGVyZXJzL1dlYkdMUmVuZGVyZXInKTtcblxuLy8gQ29uc3RzXG52YXIgQ09OVEFJTkVSID0gJ2NvbnRhaW5lcic7XG5cbi8qKlxuICogQ29udGFpbmVyIGlzIGEgY29tcG9uZW50IHRoYXQgY2FuIGJlIGFkZGVkIHRvIGFuIEVudGl0eSB0aGF0XG4gKiAgIGlzIHJlcHJlc2VudGVkIGJ5IGEgRE9NIG5vZGUgdGhyb3VnaCB3aGljaCBvdGhlciByZW5kZXJhYmxlc1xuICogICBpbiB0aGUgc2NlbmUgZ3JhcGggY2FuIGJlIGRyYXduIGluc2lkZSBvZi5cbiAqXG4gKiBAY2xhc3MgQ29udGFpbmVyXG4gKiBAY29tcG9uZW50XG4gKiBAY29uc3RydWN0b3JcbiAqIFxuICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSAgRW50aXR5IHRoYXQgdGhlIENvbnRhaW5lciBpcyBhIGNvbXBvbmVudCBvZlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgb3B0aW9uc1xuICovXG5mdW5jdGlvbiBDb250YWluZXIoZW50aXR5SUQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmdsID0gR0wuaW5pdChvcHRpb25zKTtcblxuICAgIFRhcmdldC5jYWxsKHRoaXMsIGVudGl0eUlELCB7XG4gICAgICAgIHZlcnRpY2llczogW25ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKV1cbiAgICB9KTtcblxuICAgIHZhciBlbnRpdHkgPSB0aGlzLmdldEVudGl0eSgpO1xuICAgIEVudGl0eVJlZ2lzdHJ5LnJlZ2lzdGVyKGVudGl0eSwgJ0hhc0NvbnRhaW5lcicpO1xuXG4gICAgdGhpcy5fY29udGFpbmVyICAgICA9IG9wdGlvbnMuY29udGFpbmVyO1xuICAgIHZhciB0cmFuc2Zvcm0gICAgICAgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCd0cmFuc2Zvcm0nKTtcbiAgICB0aGlzLl9pbnZlcnNlTWF0cml4ID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuICAgIHRoaXMuX3NpemUgICAgICAgICAgPSBvcHRpb25zLnNpemUgfHwgZW50aXR5LmdldENvbnRleHQoKS5fc2l6ZS5zbGljZSgpO1xuICAgIHRoaXMub3JpZ2luICAgICAgICAgPSBbMC41LCAwLjVdO1xuXG4gICAgdGhpcy5fZXZlbnRPdXRwdXQgPSBuZXcgRXZlbnRIYW5kbGVyKCk7XG4gICAgdGhpcy5fZXZlbnRPdXRwdXQuYmluZFRoaXModGhpcyk7XG5cbiAgICB0aGlzLl9ldmVudHMgPSB7XG4gICAgICAgIGV2ZW50Rm9yd2FyZGVyOiBmdW5jdGlvbiBldmVudEZvcndhcmRlcihldmVudCkge1xuICAgICAgICAgICAgdGhpcy5lbWl0KGV2ZW50LnR5cGUsIGV2ZW50KTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0uYmluZCh0aGlzKSxcbiAgICAgICAgb24gICAgOiBbXSxcbiAgICAgICAgb2ZmICAgOiBbXSxcbiAgICAgICAgZGlydHkgOiBmYWxzZVxuICAgIH07XG5cbiAgICB0aGlzLl90cmFuc2Zvcm1EaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fc2l6ZURpcnR5ICAgICAgPSB0cnVlO1xuXG4gICAgLy8gSW52ZXJzZXMgdGhlIENvbnRhaW5lcidzIHRyYW5zZm9ybSBtYXRyaXggdG8gaGF2ZSBlbGVtZW50cyBuZXN0ZWQgaW5zaWRlXG4gICAgLy8gdG8gYXBwZWFyIGluIHdvcmxkIHNwYWNlLlxuICAgIHRyYW5zZm9ybS5vbignaW52YWxpZGF0ZWQnLCBmdW5jdGlvbihyZXBvcnQpIHtcbiAgICAgICAgTWF0cml4TWF0aC5pbnZlcnQodGhpcy5faW52ZXJzZU1hdHJpeCwgdHJhbnNmb3JtLl9tYXRyaXgpO1xuICAgICAgICB0aGlzLl90cmFuc2Zvcm1EaXJ0eSA9IHRydWU7XG4gICAgfS5iaW5kKHRoaXMpKTtcbn1cblxuQ29udGFpbmVyLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIENPTlRBSU5FUjtcbn07XG5cblxuQ29udGFpbmVyLnByb3RvdHlwZSAgICAgICAgICAgICA9IE9iamVjdC5jcmVhdGUoVGFyZ2V0LnByb3RvdHlwZSk7XG5Db250YWluZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29udGFpbmVyO1xuXG4vKipcbiAqIEJpbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBhbiBldmVudCB0eXBlIGhhbmRsZWQgYnkgdGhpcyBvYmplY3Qnc1xuICogIEV2ZW50SGFuZGxlci5cbiAqXG4gKiBAbWV0aG9kIG9uXG4gKiBAY2hhaW5hYmxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGhhbmRsZXIgY2FsbGJhY2tcbiAqL1xuQ29udGFpbmVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBjYikge1xuICAgIGlmICh0eXBlb2YgZXZlbnQgPT09ICdzdHJpbmcnICYmIGNiIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdGhpcy5fZXZlbnRPdXRwdXQub24oZXZlbnQsIGNiKTtcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50cy5vbi5pbmRleE9mKGV2ZW50KSA8IDApIHtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5vbi5wdXNoKGV2ZW50KTtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5kaXJ0eSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5fZXZlbnRzLm9mZi5pbmRleE9mKGV2ZW50KTtcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpIHRoaXMuX2V2ZW50cy5vZmYuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKCdvbiB0YWtlcyBhbiBldmVudCBuYW1lIGFzIGEgc3RyaW5nIGFuZCBhIGNhbGxiYWNrIHRvIGJlIGZpcmVkIHdoZW4gdGhhdCBldmVudCBpcyByZWNlaXZlZCcpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYSBmdW5jdGlvbiB0byBhIHBhcnRpY3VsYXIgZXZlbnQgb2NjdXJpbmcuXG4gKlxuICogQG1ldGhvZCAgb2ZmXG4gKiBAY2hhaW5hYmxlXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBuYW1lIG9mIHRoZSBldmVudCB0byBjYWxsIHRoZSBmdW5jdGlvbiB3aGVuIG9jY3VyaW5nXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZXZlbnQgaXMgcmVjaWV2ZWQuXG4gKi9cbkNvbnRhaW5lci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gb2ZmKGV2ZW50LCBjYikge1xuICAgIGlmICh0eXBlb2YgZXZlbnQgPT09ICdzdHJpbmcnICYmIGNiIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5fZXZlbnRzLm9uLmluZGV4T2YoZXZlbnQpO1xuICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRPdXRwdXQucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGNiKTtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5vbi5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRzLm9mZi5wdXNoKGV2ZW50KTtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5kaXJ0eSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKCdvZmYgdGFrZXMgYW4gZXZlbnQgbmFtZSBhcyBhIHN0cmluZyBhbmQgYSBjYWxsYmFjayB0byBiZSBmaXJlZCB3aGVuIHRoYXQgZXZlbnQgaXMgcmVjZWl2ZWQnKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIGV2ZW50IGhhbmRsZXIgb2JqZWN0IHRvIHRoZSBFdmVudEhhbmRsZXIncyBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICpcbiAqIEBtZXRob2QgcGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgZXZlbnQgaGFuZGxlciB0YXJnZXQgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHBhc3NlZCBldmVudCBoYW5kbGVyXG4gKi9cbkNvbnRhaW5lci5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIHBpcGUodGFyZ2V0KSB7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXMuX2V2ZW50T3V0cHV0LnBpcGUodGFyZ2V0KTtcbiAgICBmb3IgKHZhciBldmVudCBpbiB0aGlzLl9ldmVudE91dHB1dC5saXN0ZW5lcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50cy5vbi5pbmRleE9mKGV2ZW50KSA8IDApIHtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5vbi5wdXNoKGV2ZW50KTtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5kaXJ0eSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbiAvKipcbiAqIFJlbW92ZSBoYW5kbGVyIG9iamVjdCBmcm9tIHRoZSBFdmVudEhhbmRsZXIncyBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICogICBVbmRvZXMgd29yayBvZiBcInBpcGVcIi5cbiAqXG4gKiBAbWV0aG9kIHVucGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgdGFyZ2V0IGhhbmRsZXIgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHByb3ZpZGVkIHRhcmdldFxuICovXG5Db250YWluZXIucHJvdG90eXBlLnVucGlwZSA9IGZ1bmN0aW9uIHVucGlwZSh0YXJnZXQpIHtcbiAgICByZXR1cm4gdGhpcy5fZXZlbnRPdXRwdXQudW5waXBlKHRhcmdldCk7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgYW4gZXZlbnQsIHNlbmRpbmcgdG8gYWxsIG9mIHRoZSBFdmVuZXRIYW5kbGVyJ3MgXG4gKiAgZG93bnN0cmVhbSBoYW5kbGVycyBsaXN0ZW5pbmcgZm9yIHByb3ZpZGVkICd0eXBlJyBrZXkuXG4gKlxuICogQG1ldGhvZCBlbWl0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IGV2ZW50IGRhdGFcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5Db250YWluZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUsIGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50ICYmICFldmVudC5vcmlnaW4pIGV2ZW50Lm9yaWdpbiA9IHRoaXM7XG4gICAgdmFyIGhhbmRsZWQgPSB0aGlzLl9ldmVudE91dHB1dC5lbWl0KHR5cGUsIGV2ZW50KTtcbiAgICBpZiAoaGFuZGxlZCAmJiBldmVudCAmJiBldmVudC5zdG9wUHJvcGFnYXRpb24pIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHJldHVybiBoYW5kbGVkO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGRpc3BsYXkgbWF0cml4IG9mIHRoZSBDb250YWluZXIuXG4gKlxuICogQG1ldGhvZCBnZXREaXNwbGF5TWF0cml4XG4gKiBcbiAqIEByZXR1cm4ge0FycmF5fSBkaXNwbGF5IG1hdHJpeCBvZiB0aGUgQ29udGFpbmVyXG4gKi9cbkNvbnRhaW5lci5wcm90b3R5cGUuZ2V0RGlzcGxheU1hdHJpeCA9IGZ1bmN0aW9uIGdldERpc3BsYXlNYXRyaXgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ludmVyc2VNYXRyaXg7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgc2l6ZSBvZiB0aGUgQ29udGFpbmVyLlxuICpcbiAqIEBtZXRob2Qgc2V0U2l6ZVxuICogQGNoYWluYWJsZVxuICogXG4gKiBAcmV0dXJuIHtBcnJheX0gMiBkaW1lbnNpb25hbCBhcnJheSBvZiByZXByZXNlbnRpbmcgdGhlIHNpemUgb2YgdGhlIENvbnRhaW5lclxuICovXG5Db250YWluZXIucHJvdG90eXBlLnNldENTU1NpemUgPSBmdW5jdGlvbiBzZXRDU1NTaXplKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB0aGlzLl9zaXplWzBdICAgPSB3aWR0aDtcbiAgICB0aGlzLl9zaXplWzFdICAgPSBoZWlnaHQ7XG4gICAgdGhpcy5fc2l6ZURpcnR5ID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbkNvbnRhaW5lci5wcm90b3R5cGUuZ2V0Q1NTU2l6ZSA9IGZ1bmN0aW9uIGdldENTU1NpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NpemU7XG59O1xuXG5cbkNvbnRhaW5lci5wcm90b3R5cGUuX3NldFZlcnRleERpc3BsYWNlbWVudCA9IGZ1bmN0aW9uIF9zZXRWZXJ0ZXhEaXNwbGFjZW1lbnQgKHgsIHkpIHtcbiAgICB2YXIgeU9yaWdpbk9mZnNldCA9IHRoaXMub3JpZ2luWzFdICogeSxcbiAgICAgICAgeE9yaWdpbk9mZnNldCA9IHRoaXMub3JpZ2luWzBdICogeDtcblxuICAgIHRoaXMudmVydGljaWVzWzBdWzBdID0gMCAtIHhPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMF1bMV0gPSAwIC0geU9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1sxXVswXSA9IHggLSB4T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzFdWzFdID0gMCAtIHlPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMl1bMF0gPSB4IC0geE9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1syXVsxXSA9IHkgLSB5T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzNdWzBdID0gMCAtIHhPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbM11bMV0gPSB5IC0geU9yaWdpbk9mZnNldDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGFpbmVyO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50RW1pdHRlcicpO1xuXG4vKipcbiAqIE9wYWNpdHkgZGV0ZXJtaW5lcyB3aGF0IHRoZSBPcGFjaXR5IG9mIGV2ZXJ5dGhpbmcgYmVsb3cgaXQgaW4gdGhlXG4gKiAgIHNjZW5lIGdyYXBoIHNob3VsZCBiZS5cbiAqXG4gKiBAY2xhc3MgT3BhY2l0eVxuICogQGNvbXBvbmVudFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIE9wYWNpdHkoZW50aXR5SWQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9sb2NhbE9wYWNpdHkgID0gMTtcbiAgICB0aGlzLl9nbG9iYWxPcGFjaXR5ID0gMTtcbiAgICB0aGlzLl91cGRhdGVGTiAgICAgID0gbnVsbDtcbiAgICB0aGlzLl9pbnZhbGlkYXRlZCAgID0gZmFsc2U7XG4gICAgdGhpcy5fZXZlbnRIYW5kbGVyICA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICB0aGlzLl9lbnRpdHlJZCAgICAgID0gZW50aXR5SWQ7XG5cbiAgICB0aGlzLl9tdXRhdG9yID0ge1xuICAgICAgICBzZXQ6IHRoaXMuc2V0LmJpbmQodGhpcyksXG4gICAgICAgIG9wYWNpdGF0ZTogdGhpcy5vcGFjaXRhdGUuYmluZCh0aGlzKVxuICAgIH07XG59XG5cbnZhciBPUEFDSVRZID0gJ29wYWNpdHknO1xuT3BhY2l0eS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkgeyByZXR1cm4gT1BBQ0lUWSB9O1xuXG4vKipcbiAqIFNldCB3aWxsIHVwZGF0ZSB0aGUgbG9jYWwgb3BhY2l0eSBhbmQgaW52YWxpZGF0ZSBpdFxuICpcbiAqIEBtZXRob2QgIHNldFxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gb3BhY2l0eSBuZXcgb3BhY2l0eSB2YWx1ZSBmb3IgdGhpcyBFbnRpdHlcbiAqL1xuT3BhY2l0eS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KG9wYWNpdHkpIHtcbiAgICB0aGlzLl9pbnZhbGlkYXRlZCAgPSB0cnVlO1xuICAgIHRoaXMuX2xvY2FsT3BhY2l0eSA9IG9wYWNpdHk7XG59O1xuXG4vKipcbiAqIEFkZGl0aXZlIHZlcnNpb24gb2Ygc2V0LiAgQWxzbyBtYXJrcyB0aGUgT3BhY2l0eSBhcyBpbnZhbGlkYXRlZC5cbiAqXG4gKiBAbWV0aG9kICBvcGFjaXRhdGVcbiAqIFxuICogQHBhcmFtICB7TnVtYmVyfSBkaWZmZXJlbnRpYWwgZGlmZmVyZW50aWFsIHRvIGFwcGx5IHRvIHRoZSBjdXJyZWN0IG9wYWNpdHkgdmFsdWVcbiAqL1xuT3BhY2l0eS5wcm90b3R5cGUub3BhY2l0YXRlID0gZnVuY3Rpb24gb3BhY2l0YXRlKGRpZmZlcmVudGlhbCkge1xuICAgIHRoaXMuX2ludmFsaWRhdGVkICA9IHRydWU7XG4gICAgdGhpcy5fbG9jYWxPcGFjaXR5ICs9IGRpZmZlcmVudGlhbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB3aGF0IHRoZSBnbG9iYWwgb3BhY2l0eSBpcyBhdCB0aGlzIHBhcnQgb2YgdGhlIHNjZW5lIGdyYXBoLiAgR2xvYmFsXG4gKiAgIGlzIHRoZSByZXN1bHQgb2YgbXVsdGlwbHlpbmcgdGhlIHBhcmVudCdzIG9wYWNpdHkgd2l0aCB0aGlzIGluc3RhbmNlJ3NcbiAqICAgb3BhY2l0eS5cbiAqXG4gKiBAbWV0aG9kIGdldEdsb2JhbE9wYWNpdHlcbiAqIFxuICogQHJldHVybiB7TnVtYmVyfSBDdW11bGF0aXZlIG9wYWNpdHkgYXQgdGhpcyBwb2ludCBpbiB0aGUgc2NlbmUgZ3JhcGhcbiAqL1xuT3BhY2l0eS5wcm90b3R5cGUuZ2V0R2xvYmFsT3BhY2l0eSA9IGZ1bmN0aW9uIGdldEdsb2JhbE9wYWNpdHkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dsb2JhbE9wYWNpdHk7XG59O1xuXG4vKipcbiAqIGdldExvY2FsT3BhY2l0eSByZXR1cm5zIHRoaXMgaW5zdGFuY2UncyBzcGVjaWZpZWQgb3BhY2l0eS5cbiAqXG4gKiBAbWV0aG9kICBnZXRMb2NhbE9wYWNpdHlcbiAqIFxuICogQHJldHVybiB7TnVtYmVyfSB0aGlzIGluc3RhbmNlJ3Mgc3BlY2lmaWVkIG9wYWNpdHlcbiAqL1xuT3BhY2l0eS5wcm90b3R5cGUuZ2V0TG9jYWxPcGFjaXR5ID0gZnVuY3Rpb24gZ2V0TG9jYWxPcGFjaXR5KCkge1xuICAgIHJldHVybiB0aGlzLl9sb2NhbE9wYWNpdHk7XG59O1xuXG4vKipcbiAqIERlZmluZSB3aGVyZSB0aGUgb3BhY2l0eSB3aWxsIGJlIGdldHRpbmcgaXQncyBzb3VyY2Ugb2YgdHJ1dGggZnJvbS5cbiAqXG4gKiBAbWV0aG9kICB1cGRhdGVGcm9tXG4gKiBcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufFRyYW5zaXRpb25hYmxlfE51bWJlcn0gcHJvdmlkZXIgc291cmNlIG9mIHN0YXRlIGZvciB0aGUgT3BhY2l0eVxuICovXG5PcGFjaXR5LnByb3RvdHlwZS51cGRhdGVGcm9tID0gZnVuY3Rpb24gdXBkYXRlRnJvbShwcm92aWRlcikge1xuICAgIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUZOID0gcHJvdmlkZXIuYmluZCh0aGlzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAocHJvdmlkZXIuZ2V0ICYmIHByb3ZpZGVyLmdldCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcHJvdmlkZXIuZ2V0KCkgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09wYWNpdHk6IFRyYW5zaXRpb25hYmxlcyBwYXNzZWQgdG8gb3BhY2l0eUZyb20gbXVzdCByZXR1cm4gTnVtYmVycycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlRk4gPSBmdW5jdGlvbihvcGFjaXR5KSB7XG4gICAgICAgICAgICAgICAgb3BhY2l0eS5zZXQocHJvdmlkZXIuZ2V0KCkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwcm92aWRlciAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignT3BhY2l0eTogQ29uc3RhbnRzIHBhc3NlZCB0byBvcGFjaXR5RnJvbSBtdXN0IHJldHVybiBOdW1iZXJzJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldChwcm92aWRlcik7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgdmFsdWVzIG9mIHRoZSBPcGFjaXR5IGdpdmVuIGluZm9ybWF0aW9uIGFib3V0IGl0J3MgcGFyZW50LlxuICpcbiAqIEBtZXRob2QgIF91cGRhdGVcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSAge0Jvb2xlYW59IHBhcmVudFJlcG9ydCBmbGFnIGRlbm90aW5nIHdoZXRoZXIgdGhlIHBhcmVudCBPcGFjaXR5IHdhcyBpbnZhbGlkYXRlZFxuICogQHBhcmFtICB7TnVtYmVyfSBwYXJlbnRPcGFjaXR5IHZhbHVlIG9mIHRoZSBnbG9iYWwgb3BhY2l0eSB1cCB0byB0aGlzIHBvaW50IGluIHRoZSBzY2VuZSBncmFwaFxuICogQHJldHVybiB7Qm9vbGVhbn0gZmxhZyBkZW5vdGluZyBpZiB0aGlzIE9wYWNpdHkgd2FzIGludmFsaWRhdGVkXG4gKi9cbk9wYWNpdHkucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiBfdXBkYXRlKHBhcmVudFJlcG9ydCwgcGFyZW50T3BhY2l0eSkge1xuICAgIGlmIChwYXJlbnRSZXBvcnQpIHRoaXMuX2ludmFsaWRhdGVkID0gdHJ1ZTtcbiAgICBpZiAodGhpcy5fdXBkYXRlRk4pIHRoaXMuX3VwZGF0ZUZOKHRoaXMuX211dGF0b3IpO1xuXG4gICAgaWYgKHBhcmVudE9wYWNpdHkgPT0gbnVsbCkgcGFyZW50T3BhY2l0eSA9IDE7XG5cbiAgICBpZiAodGhpcy5faW52YWxpZGF0ZWQpIHtcbiAgICAgICAgdGhpcy5fZ2xvYmFsT3BhY2l0eSA9IHRoaXMuX2xvY2FsT3BhY2l0eSAqIHBhcmVudE9wYWNpdHk7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2V2ZW50SGFuZGxlci5lbWl0KCdpbnZhbGlkYXRlZCcsIHRydWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBlbHNlIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgZnVuY3Rpb25zIHRvIGJlIGNhbGxlZCBvbiBvcGFjaXR5IGV2ZW50cy5cbiAqXG4gKiBAbWV0aG9kICBvblxuICovXG5PcGFjaXR5LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKCkge1xuICAgIHRoaXMuX2V2ZW50SGFuZGxlci5vbi5hcHBseSh0aGlzLl9ldmVudEhhbmRsZXIsIGFyZ3VtZW50cyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9wYWNpdHk7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuLi8uLi9ldmVudHMvRXZlbnRFbWl0dGVyJyk7XG5cbi8qKlxuICogU2l6ZSBpcyBhIGNvbXBvbmVudCB0aGF0IGlzIHBhcnQgb2YgZXZlcnkgUmVuZGVyTm9kZS4gIEl0IGlzXG4gKiAgIHJlc3BvbnNpYmxlIGZvciB1cGRhdGluZyBpdCdzIG93biBub3Rpb24gb2Ygc2l6ZSBhbmQgaW5jb3Jwb3JhdGluZ1xuICogICB0aGF0IHdpdGggcGFyZW50IGluZm9ybWF0aW9uLiAgU2l6ZXMgYXJlIHRocmVlIGRpbWVuc2lvbmFsIGFuZCBjYW4gYmVcbiAqICAgZGVmaW5lZCBpbiB0aHJlZSBzZXBlcmF0ZSBtYW5uZXJzLlxuICogICBcbiAqICAgICAgIHBpeGVsOiBBYnNvbHV0ZSBwaXhlbCBzaXplXG4gKiAgICAgICBwcm9wb3J0aW9uOiBQZXJjZW50IG9mIHRoZSBwYXJlbnQgb3IgbG9jYWwgcGl4ZWwgc2l6ZVxuICogICAgICAgZGlmZmVyZW50aWFsOiArLy0gYSBjZXJ0YWluIGFtb3VudCBvZiBwaXhlbHNcbiAqXG4gKiAgRm9yIGVhY2ggZGltZW5zaW9uLCBbeCwgeSwgel0sIHBpeGVsIHNpemUgaXMgY2FsY3VsYXRlZCBmaXJzdCwgdGhlblxuICogIHByb3BvcnRpb25zIGFyZSBhcHBsaWVkLCBhbmQgZmluYWxseSBkaWZmZXJlbnRpYWxzIGFyZSBhcHBsaWVkLiAgU2l6ZXNcbiAqICBnZXQgdGhlaXIgcGFyZW50IGluZm9ybWF0aW9uIHZpYSB0aGUgQ29yZVN5c3RlbSB3aGljaCB1c2VzIHRoZSBzY2VuZSBcbiAqICBncmFwaCBhcyBpdCdzIHNvdXJjZSBvZiBoZWlyYXJjaHkuXG4gKlxuICogQGNsYXNzIFNpemVcbiAqIEBjb21wb25lbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTaXplKGVudGl0eUlkLCBvcHRpb25zKSB7XG4gICAgdGhpcy5fbG9jYWxQaXhlbHMgICAgICAgID0gW3ZvaWQgMCwgdm9pZCAwLCB2b2lkIDBdO1xuICAgIHRoaXMuX2xvY2FsUHJvcG9ydGlvbnMgICA9IFsxLCAxLCAxXTtcbiAgICB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHMgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fZ2xvYmFsU2l6ZSAgICAgICAgID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX3VwZGF0ZUZOICAgICAgICAgICA9IG51bGw7XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgICAgICAgID0gMDtcbiAgICB0aGlzLl9jYWNoZWRDb250ZXh0U2l6ZSAgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fZXZlbnRIYW5kbGVyICAgICAgID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIHRoaXMuX2VudGl0eUlkICAgICAgICAgICA9IGVudGl0eUlkO1xuXG4gICAgdGhpcy5fbXV0YXRvciA9IHtcbiAgICAgICAgc2V0UGl4ZWxzOiB0aGlzLnNldFBpeGVscy5iaW5kKHRoaXMpLFxuICAgICAgICBzZXRQcm9wb3J0aW9uczogdGhpcy5zZXRQcm9wb3J0aW9ucy5iaW5kKHRoaXMpLFxuICAgICAgICBzZXREaWZmZXJlbnRpYWxzOiB0aGlzLnNldERpZmZlcmVudGlhbHMuYmluZCh0aGlzKVxuICAgIH07XG59XG5cbnZhciBTSVpFID0gJ3NpemUnO1xuU2l6ZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge3JldHVybiBTSVpFO307XG5cbi8qKlxuICogRGVmaW5lIHRoZSBwaXhlbCB2YWx1ZXMgZm9yIHRoZSBzaXplLiAgSW52YWxpZGF0ZXMgY2VydGFpblxuICogICBpbmRpY2llcyB3aGVuIG5ldyB2YWx1ZXMgYXJlIHNwZWNpZmllZC5cbiAqXG4gKiBAbWV0aG9kIHNldFBpeGVsc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0geCBzaXplIGluIHBpeGVsc1xuICogQHBhcmFtIHtOdW1iZXJ9IHkgc2l6ZSBpbiBwaXhlbHNcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHNpemUgaW4gcGl4ZWxzXG4gKi9cblNpemUucHJvdG90eXBlLnNldFBpeGVscyA9IGZ1bmN0aW9uIHNldFBpeGVscyh4LCB5LCB6KSB7XG4gICAgaWYgKHggIT09IHRoaXMuX2xvY2FsUGl4ZWxzWzBdICYmIHggIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCB8PSAxO1xuICAgICAgICB0aGlzLl9sb2NhbFBpeGVsc1swXSA9IHg7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IHRoaXMuX2xvY2FsUGl4ZWxzWzFdICYmIHkgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCB8PSAyO1xuICAgICAgICB0aGlzLl9sb2NhbFBpeGVsc1sxXSA9IHk7XG4gICAgfVxuICAgIGlmICh6ICE9PSB0aGlzLl9sb2NhbFBpeGVsc1syXSAmJiB6ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgfD0gNDtcbiAgICAgICAgdGhpcy5fbG9jYWxQaXhlbHNbMl0gPSB6O1xuICAgIH1cbn07XG5cbi8qKlxuICogRGVmaW5lIHRoZSBwcm9wb3J0aW9uYWwgdmFsdWVzIGZvciB0aGUgc2l6ZS4gIEludmFsaWRhdGVzXG4gKiAgIGNlcnRhaW4gaW5kaWNpZXMgd2hlbiBuZXcgdmFsdWVzIGFyZSBzcGVjaWZpZWQuXG4gKlxuICogQG1ldGhvZCBzZXRQcm9wb3J0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0geCBzaXplIGFzIGEgcGVyY2VudGFnZSBvZiB0aGUgcGFyZW50U2l6ZSBvciBsb2NhbCBwaXhlbCBzaXplXG4gKiBAcGFyYW0ge051bWJlcn0geSBzaXplIGFzIGEgcGVyY2VudGFnZSBvZiB0aGUgcGFyZW50U2l6ZSBvciBsb2NhbCBwaXhlbCBzaXplXG4gKiBAcGFyYW0ge051bWJlcn0geiBzaXplIGFzIGEgcGVyY2VudGFnZSBvZiB0aGUgcGFyZW50U2l6ZSBvciBsb2NhbCBwaXhlbCBzaXplXG4gKi9cblNpemUucHJvdG90eXBlLnNldFByb3BvcnRpb25zID0gZnVuY3Rpb24gc2V0UHJvcG9ydGlvbnMoeCwgeSwgeikge1xuICAgIGlmICh4ICE9PSB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzBdICYmIHggIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCB8PSAxO1xuICAgICAgICB0aGlzLl9sb2NhbFByb3BvcnRpb25zWzBdID0geDtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1sxXSAmJiB5ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgfD0gMjtcbiAgICAgICAgdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1sxXSA9IHk7XG4gICAgfVxuXG4gICAgaWYgKHogIT09IHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMl0gJiYgeiAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkIHw9IDQ7XG4gICAgICAgIHRoaXMuX2xvY2FsUHJvcG9ydGlvbnNbMl0gPSB6O1xuICAgIH1cbn07XG5cbi8qKlxuICogRGVmaW5lIHRoZSBwaXhlbCBkaWZmZXJlbnRpYWxzIGZvciB0aGUgc2l6ZS4gIFxuICogICBJbnZhbGlkYXRlcyBjZXJ0YWluIGluZGljaWVzIHdoZW4gbmV3IHZhbHVlcyBhcmUgc3BlY2lmaWVkLiBcbiAqXG4gKiBAbWV0aG9kIHNldERpZmZlcmVudGlhbHNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHggcGl4ZWwgZGlmZmVyZW50aWFscyBpbiBzaXplXG4gKiBAcGFyYW0ge051bWJlcn0geSBwaXhlbCBkaWZmZXJlbnRpYWxzIGluIHNpemVcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHBpeGVsIGRpZmZlcmVudGlhbHMgaW4gc2l6ZVxuICovXG5TaXplLnByb3RvdHlwZS5zZXREaWZmZXJlbnRpYWxzID0gZnVuY3Rpb24gc2V0RGlmZmVyZW50aWFscyh4LCB5LCB6KSB7XG4gICAgaWYgKHggIT09IHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1swXSAmJiB4ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgICAgICAgICAgfD0gMTtcbiAgICAgICAgdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzBdID0geDtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzFdICYmIHkgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCAgICAgICAgICB8PSAyO1xuICAgICAgICB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMV0gPSB5O1xuICAgIH1cblxuICAgIGlmICh6ICE9PSB0aGlzLl9sb2NhbERpZmZlcmVudGlhbHNbMl0gJiYgeiAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkICAgICAgICAgIHw9IDQ7XG4gICAgICAgIHRoaXMuX2xvY2FsRGlmZmVyZW50aWFsc1syXSA9IHo7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIFNpemUncyBub3Rpb24gb2Ygd2hhdCB0aGUgY3VtdWxhdGl2ZSBnbG9iYWwgc2l6ZSBpcy5cbiAqXG4gKiBAbWV0aG9kICBnZXRHbG9iYWxTaXplXG4gKiBcbiAqIEByZXR1cm4ge0FycmF5fSBBcnJheSByZXByZXNlbnRpbmcgc2l6ZSBpbiBwaXhlbHNcbiAqL1xuU2l6ZS5wcm90b3R5cGUuZ2V0R2xvYmFsU2l6ZSA9IGZ1bmN0aW9uIGdldEdsb2JhbFNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dsb2JhbFNpemU7XG59O1xuXG4vKipcbiAqIERlZmluZSB0aGUgcHJvdmlkZXIgb2Ygc3RhdGUgZm9yIHRoZSBTaXplLlxuICpcbiAqIEBtZXRob2QgIHNpemVGcm9tXG4gKiBcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBwcm92aWRlciBzb3VyY2Ugb2Ygc3RhdGUgZm9yIHRoZSBTaXplXG4gKi9cblNpemUucHJvdG90eXBlLnVwZGF0ZUZyb20gPSBmdW5jdGlvbiB1cGRhdGVGcm9tKHByb3ZpZGVyKSB7XG4gICAgaWYgKHByb3ZpZGVyIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRk4gPSBwcm92aWRlcjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2l6ZTogdXBkYXRlRnJvbSBvbmx5IGFjY2VwdHMgZnVuY3Rpb25zJylcbiAgICB9XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIFNpemUncyB2YWx1ZXMgYmFzZWQgb24gdGhlIHBhcmVudCBpbnZhbGlkYXRpb25zLFxuICogICBwYXJlbnQgc2l6ZSAocGl4ZWxzKSwgYW5kIHBvc3NpYmx5IGNvbnRleHQgc2l6ZSAocGl4ZWxzKS5cbiAqXG4gKiBAbWV0aG9kIF91cGRhdGVcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSAge051bWJlcn0gcGFyZW50UmVwb3J0IGJpdFNjaGVtZSBpbnZhbGlkYXRpb25zIGZvciBwYXJlbnQgc2l6ZVxuICogQHBhcmFtICB7QXJyYXl9IHBhcmVudFNpemUgcGFyZW50IHNpemUgaW4gcGl4ZWxzXG4gKiBAcGFyYW0gIHtBcnJheX0gY29udGV4dFNpemUgY29udGV4dCBzaXplIGluIHBpeGVsc1xuICogQHJldHVybiB7TnVtYmVyfSBpbnZhbGlkYXRpb25zXG4gKi9cblNpemUucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiBfdXBkYXRlKHBhcmVudFJlcG9ydCwgcGFyZW50U2l6ZSwgY29udGV4dFNpemUpIHtcbiAgICBpZiAoY29udGV4dFNpemUpIHtcbiAgICAgICAgcGFyZW50U2l6ZSA9IGNvbnRleHRTaXplO1xuICAgICAgICBwYXJlbnRSZXBvcnQgPSAwO1xuICAgICAgICBpZiAocGFyZW50U2l6ZVswXSAhPT0gdGhpcy5fY2FjaGVkQ29udGV4dFNpemVbMF0pIHBhcmVudFJlcG9ydCB8PSAxO1xuICAgICAgICBpZiAocGFyZW50U2l6ZVsxXSAhPT0gdGhpcy5fY2FjaGVkQ29udGV4dFNpemVbMV0pIHBhcmVudFJlcG9ydCB8PSAyO1xuICAgICAgICBpZiAocGFyZW50U2l6ZVsyXSAhPT0gdGhpcy5fY2FjaGVkQ29udGV4dFNpemVbMl0pIHBhcmVudFJlcG9ydCB8PSA0O1xuICAgICAgICB0aGlzLl9jYWNoZWRDb250ZXh0U2l6ZSA9IGNvbnRleHRTaXplO1xuICAgIH1cblxuICAgIGlmIChwYXJlbnRSZXBvcnQpIHRoaXMuX2ludmFsaWRhdGVkIHw9IHBhcmVudFJlcG9ydDtcbiAgICBpZiAodGhpcy5fdXBkYXRlRk4pIHRoaXMuX3VwZGF0ZUZOKHRoaXMuX211dGF0b3IpO1xuXG4gICAgaWYgKHRoaXMuX2ludmFsaWRhdGVkKSB7XG4gICAgICAgIGlmICh0aGlzLl9pbnZhbGlkYXRlZCAmIDEpIHtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMF0gID0gdGhpcy5fbG9jYWxQaXhlbHNbMF0gIT09IHVuZGVmaW5lZCA/IHRoaXMuX2xvY2FsUGl4ZWxzWzBdIDogcGFyZW50U2l6ZVswXTtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMF0gKj0gdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1swXTtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMF0gKz0gdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9pbnZhbGlkYXRlZCAmIDIpIHtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMV0gID0gdGhpcy5fbG9jYWxQaXhlbHNbMV0gIT09IHVuZGVmaW5lZCA/IHRoaXMuX2xvY2FsUGl4ZWxzWzFdIDogcGFyZW50U2l6ZVsxXTtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMV0gKj0gdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1sxXTtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMV0gKz0gdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9pbnZhbGlkYXRlZCAmIDQpIHtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMl0gID0gdGhpcy5fbG9jYWxQaXhlbHNbMl0gIT09IHVuZGVmaW5lZCA/IHRoaXMuX2xvY2FsUGl4ZWxzWzJdIDogcGFyZW50U2l6ZVsyXTtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMl0gKj0gdGhpcy5fbG9jYWxQcm9wb3J0aW9uc1syXTtcbiAgICAgICAgICAgIHRoaXMuX2dsb2JhbFNpemVbMl0gKz0gdGhpcy5fbG9jYWxEaWZmZXJlbnRpYWxzWzJdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGludmFsaWRhdGVkID0gdGhpcy5faW52YWxpZGF0ZWQ7XG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkID0gMDtcbiAgICAgICAgaWYgKGludmFsaWRhdGVkKSB0aGlzLl9ldmVudEhhbmRsZXIuZW1pdCgnaW52YWxpZGF0ZWQnLCBpbnZhbGlkYXRlZCk7XG4gICAgICAgIHJldHVybiBpbnZhbGlkYXRlZDtcbiAgICB9XG5cbiAgICBlbHNlIHJldHVybiAwO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBmdW5jdGlvbnMgdG8gYmUgY2FsbGVkIG9uIHRoZSBTaXplJ3MgZXZlbnRzLlxuICpcbiAqIEBtZXRob2Qgb25cbiAqL1xuU2l6ZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbigpIHtcbiAgICB0aGlzLl9ldmVudEhhbmRsZXIub24uYXBwbHkodGhpcy5fZXZlbnRIYW5kbGVyLCBhcmd1bWVudHMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTaXplO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9FbnRpdHlSZWdpc3RyeScpLFxuICAgIFRhcmdldCAgICAgICAgID0gcmVxdWlyZSgnLi9UYXJnZXQnKSxcbiAgICBNYXRyaXhNYXRoICAgICA9IHJlcXVpcmUoJy4uLy4uL21hdGgvTWF0cml4NHg0JyksXG4gICAgRXZlbnRIYW5kbGVyICAgPSByZXF1aXJlKCcuLi8uLi9ldmVudHMvRXZlbnRIYW5kbGVyJyk7XG5cbi8vIENPTlNUU1xudmFyIFRSQU5TRk9STSA9ICd0cmFuc2Zvcm0nO1xudmFyIFNJWkUgICAgICA9ICdzaXplJztcbnZhciBPUEFDSVRZICAgPSAnb3BhY2l0eSc7XG52YXIgU1VSRkFDRSAgID0gJ3N1cmZhY2UnO1xuXG4vKipcbiAqIFN1cmZhY2UgaXMgYSBjb21wb25lbnQgdGhhdCBkZWZpbmVzIHRoZSBkYXRhIHRoYXQgc2hvdWxkXG4gKiAgIGJlIGRyYXduIHRvIGFuIEhUTUxFbGVtZW50LiAgTWFuYWdlcyBDU1Mgc3R5bGVzLCBIVE1MIGF0dHJpYnV0ZXMsXG4gKiAgIGNsYXNzZXMsIGFuZCBjb250ZW50LlxuICpcbiAqIEBjbGFzcyBTdXJmYWNlXG4gKiBAY29tcG9uZW50XG4gKiBAY29uc3RydWN0b3JcbiAqIFxuICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSBFbnRpdHkgdGhhdCB0aGUgU3VyZmFjZSBpcyBhIGNvbXBvbmVudCBvZlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgaW5zdGFudGlhdGlvbiBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIFN1cmZhY2UoZW50aXR5SUQsIG9wdGlvbnMpIHtcbiAgICBUYXJnZXQuY2FsbCh0aGlzLCBlbnRpdHlJRCwge1xuICAgICAgICB2ZXJ0aWNpZXM6IFtuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMCwgMV0pLFxuICAgICAgICAgICAgICAgICAgICBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAxXSldXG4gICAgfSk7XG5cbiAgICB2YXIgZW50aXR5ID0gdGhpcy5nZXRFbnRpdHkoKTtcblxuICAgIEVudGl0eVJlZ2lzdHJ5LnJlZ2lzdGVyKGVudGl0eSwgJ1N1cmZhY2VzJyk7XG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIoZW50aXR5LCAnUmVuZGVyYWJsZXMnKTtcblxuICAgIGlmIChvcHRpb25zLnRhZ05hbWUpIHRoaXMudGFnTmFtZSA9IG9wdGlvbnMudGFnTmFtZTtcbiAgICB0aGlzLl9jdWxsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9zaXplICAgICA9IG5ldyBGbG9hdDMyQXJyYXkoWzAsMF0pO1xuXG4gICAgdGhpcy5pbnZhbGlkYXRpb25zID0gMTI3O1xuICAgIHRoaXMuX2V2ZW50T3V0cHV0ICA9IG5ldyBFdmVudEhhbmRsZXIoKTtcbiAgICB0aGlzLl9ldmVudE91dHB1dC5iaW5kVGhpcyh0aGlzKTtcbiAgICB0aGlzLl9ldmVudEZvcndhcmRlciA9IGZ1bmN0aW9uIF9ldmVudEZvcndhcmRlcihldmVudCkge1xuICAgICAgICB0aGlzLl9ldmVudE91dHB1dC5lbWl0KGV2ZW50LnR5cGUsIGV2ZW50KTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLnNwZWMgPSB7XG4gICAgICAgIF9pZCAgICAgICAgICAgIDogZW50aXR5Ll9pZCxcbiAgICAgICAgY2xhc3NlcyAgICAgICAgOiBbXSxcbiAgICAgICAgYXR0cmlidXRlcyAgICAgOiB7fSxcbiAgICAgICAgcHJvcGVydGllcyAgICAgOiB7fSxcbiAgICAgICAgY29udGVudCAgICAgICAgOiBudWxsLFxuICAgICAgICBpbnZhbGlkYXRpb25zICA6ICgxIDw8IE9iamVjdC5rZXlzKFN1cmZhY2UuaW52YWxpZGF0aW9ucykubGVuZ3RoKSAtIDEsXG4gICAgICAgIG9yaWdpbiAgICAgICAgIDogdGhpcy5fb3JpZ2luLFxuICAgICAgICBldmVudHMgICAgICAgICA6IFtdLFxuICAgICAgICBldmVudEZvcndhcmRlciA6IHRoaXMuX2V2ZW50Rm9yd2FyZGVyXG4gICAgfTtcblxuICAgIGVudGl0eS5nZXRDb21wb25lbnQoVFJBTlNGT1JNKS5vbignaW52YWxpZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMudHJhbnNmb3JtO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICBlbnRpdHkuZ2V0Q29tcG9uZW50KFNJWkUpLm9uKCdpbnZhbGlkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5zaXplO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICBlbnRpdHkuZ2V0Q29tcG9uZW50KE9QQUNJVFkpLm9uKCdpbnZhbGlkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5vcGFjaXR5O1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICB0aGlzLl9oYXNPcmlnaW4gPSB0cnVlO1xufVxuXG5TdXJmYWNlLnByb3RvdHlwZSAgICAgICAgICAgICA9IE9iamVjdC5jcmVhdGUoVGFyZ2V0LnByb3RvdHlwZSk7XG5TdXJmYWNlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN1cmZhY2U7XG5cbi8vIEludmFsaWRhdGlvbiBTY2hlbWVcblN1cmZhY2UuaW52YWxpZGF0aW9ucyA9IHtcbiAgICBjbGFzc2VzICAgIDogMSxcbiAgICBwcm9wZXJ0aWVzIDogMixcbiAgICBhdHRyaWJ1dGVzIDogNCxcbiAgICBjb250ZW50ICAgIDogOCxcbiAgICB0cmFuc2Zvcm0gIDogMTYsXG4gICAgc2l6ZSAgICAgICA6IDMyLFxuICAgIG9wYWNpdHkgICAgOiA2NCxcbiAgICBvcmlnaW4gICAgIDogMTI4LFxuICAgIGV2ZW50cyAgICAgOiAyNTZcbn07XG5cblN1cmZhY2UudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtyZXR1cm4gU1VSRkFDRTt9O1xuXG5TdXJmYWNlLnByb3RvdHlwZS5fc2V0VmVydGV4RGlzcGxhY2VtZW50ID0gZnVuY3Rpb24gX3NldFZlcnRleERpc3BsYWNlbWVudCAoeCwgeSkge1xuICAgIHZhciB5T3JpZ2luT2Zmc2V0ID0gdGhpcy5zcGVjLm9yaWdpblsxXSAqIHksXG4gICAgICAgIHhPcmlnaW5PZmZzZXQgPSB0aGlzLnNwZWMub3JpZ2luWzBdICogeDtcblxuICAgIHRoaXMudmVydGljaWVzWzBdWzBdID0gMCAtIHhPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMF1bMV0gPSAwIC0geU9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1sxXVswXSA9IHggLSB4T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzFdWzFdID0gMCAtIHlPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbMl1bMF0gPSB4IC0geE9yaWdpbk9mZnNldDtcbiAgICB0aGlzLnZlcnRpY2llc1syXVsxXSA9IHkgLSB5T3JpZ2luT2Zmc2V0O1xuICAgIHRoaXMudmVydGljaWVzWzNdWzBdID0gMCAtIHhPcmlnaW5PZmZzZXQ7XG4gICAgdGhpcy52ZXJ0aWNpZXNbM11bMV0gPSB5IC0geU9yaWdpbk9mZnNldDtcblxuICAgIHRoaXMuX3NpemVbMF0gPSB4O1xuICAgIHRoaXMuX3NpemVbMV0gPSB5O1xuICAgIHRoaXMuX2V2ZW50T3V0cHV0LmVtaXQoJ3NpemVDaGFuZ2UnLCB0aGlzLl9zaXplKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBvcHRpb25zIG9mIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2Qgc2V0T3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBvYmplY3Qgb2Ygb3B0aW9uc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMucHJvcGVydGllcykgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRQcm9wZXJ0aWVzKG9wdGlvbnMucHJvcGVydGllcyk7XG4gICAgaWYgKG9wdGlvbnMuY2xhc3NlcykgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRDbGFzc2VzKG9wdGlvbnMuY2xhc3Nlcyk7XG4gICAgaWYgKG9wdGlvbnMuYXR0cmlidXRlcykgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKG9wdGlvbnMuYXR0cmlidXRlcyk7XG4gICAgaWYgKG9wdGlvbnMuY29udGVudCB8fCBvcHRpb25zLmNvbnRlbnQgPT09ICcnKSAgdGhpcy5zZXRDb250ZW50KG9wdGlvbnMuY29udGVudCk7XG4gICAgaWYgKG9wdGlvbnMuc2l6ZSkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRDU1NTaXplLmFwcGx5KHRoaXMsIG9wdGlvbnMuc2l6ZSk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgQ1NTIGNsYXNzZXMgdG8gYmUgYSBuZXcgQXJyYXkgb2Ygc3RyaW5ncy5cbiAqXG4gKiBAbWV0aG9kIHNldENsYXNzZXNcbiAqIFxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgb2YgQ1NTIGNsYXNzZXNcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuc2V0Q2xhc3NlcyA9IGZ1bmN0aW9uIHNldENsYXNzZXMoY2xhc3NMaXN0KSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGNsYXNzTGlzdCkpIHRocm93IG5ldyBFcnJvcihcIlN1cmZhY2U6IGV4cGVjdHMgYW4gQXJyYXkgdG8gYmUgcGFzc2VkIHRvIHNldENsYXNzZXNcIik7XG5cbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIHJlbW92YWwgPSBbXTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnNwZWMuY2xhc3Nlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgaWYgKGNsYXNzTGlzdC5pbmRleE9mKHRoaXMuc3BlYy5jbGFzc2VzW2ldKSA8IDApXG4gICAgICAgICAgICByZW1vdmFsLnB1c2godGhpcy5zcGVjLmNsYXNzZXNbaV0pO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHJlbW92YWwubGVuZ3RoOyBpKyspICAgdGhpcy5yZW1vdmVDbGFzcyhyZW1vdmFsW2ldKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2xhc3NMaXN0Lmxlbmd0aDsgaSsrKSB0aGlzLmFkZENsYXNzKGNsYXNzTGlzdFtpXSk7XG5cbiAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemU7XG59O1xuXG4vKipcbiAqIFJldHVybiBhbGwgb2YgdGhlIGNsYXNzZXMgYXNzb2NpYXRlZCB3aXRoIHRoaXMgU3VyZmFjZVxuICpcbiAqIEBtZXRob2QgZ2V0Q2xhc3Nlc1xuICogXG4gKiBAcmV0dXJuIHtBcnJheX0gYXJyYXkgb2YgQ1NTIGNsYXNzZXNcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuZ2V0Q2xhc3NlcyA9IGZ1bmN0aW9uIGdldENsYXNzZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3BlYy5jbGFzc2VzO1xufTtcblxuLyoqXG4gKiBBZGQgYSBzaW5nbGUgY2xhc3MgdG8gdGhlIFN1cmZhY2UncyBsaXN0IG9mIGNsYXNzZXMuXG4gKiAgIEludmFsaWRhdGVzIHRoZSBTdXJmYWNlJ3MgY2xhc3Nlcy5cbiAqXG4gKiBAbWV0aG9kIGFkZENsYXNzXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBjbGFzc05hbWUgbmFtZSBvZiB0aGUgY2xhc3NcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuYWRkQ2xhc3MgPSBmdW5jdGlvbiBhZGRDbGFzcyhjbGFzc05hbWUpIHtcbiAgICBpZiAodHlwZW9mIGNsYXNzTmFtZSAhPT0gJ3N0cmluZycpIHRocm93IG5ldyBFcnJvcignYWRkQ2xhc3Mgb25seSB0YWtlcyBTdHJpbmdzIGFzIHBhcmFtZXRlcnMnKTtcbiAgICBpZiAodGhpcy5zcGVjLmNsYXNzZXMuaW5kZXhPZihjbGFzc05hbWUpIDwgMCkge1xuICAgICAgICB0aGlzLnNwZWMuY2xhc3Nlcy5wdXNoKGNsYXNzTmFtZSk7XG4gICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuY2xhc3NlcztcbiAgICB9XG5cbiAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemU7XG59O1xuXG5cbi8qKlxuICogUmVtb3ZlIGEgc2luZ2xlIGNsYXNzIGZyb20gdGhlIFN1cmZhY2UncyBsaXN0IG9mIGNsYXNzZXMuXG4gKiAgIEludmFsaWRhdGVzIHRoZSBTdXJmYWNlJ3MgY2xhc3Nlcy5cbiAqIFxuICogQG1ldGhvZCByZW1vdmVDbGFzc1xuICogXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGNsYXNzTmFtZSBjbGFzcyB0byByZW1vdmVcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUucmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbiByZW1vdmVDbGFzcyhjbGFzc05hbWUpIHtcbiAgICBpZiAodHlwZW9mIGNsYXNzTmFtZSAhPT0gJ3N0cmluZycpIHRocm93IG5ldyBFcnJvcignYWRkQ2xhc3Mgb25seSB0YWtlcyBTdHJpbmdzIGFzIHBhcmFtZXRlcnMnKTtcbiAgICB2YXIgaSA9IHRoaXMuc3BlYy5jbGFzc2VzLmluZGV4T2YoY2xhc3NOYW1lKTtcbiAgICBpZiAoaSA+PSAwKSB7XG4gICAgICAgIHRoaXMuc3BlYy5jbGFzc2VzLnNwbGljZShpLCAxKTtcbiAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5jbGFzc2VzO1xuICAgIH1cblxuICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuc2l6ZTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBDU1MgcHJvcGVydGllcyBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2UuXG4gKiAgIEludmFsaWRhdGVzIHRoZSBTdXJmYWNlJ3MgcHJvcGVydGllcy5cbiAqXG4gKiBAbWV0aG9kIHNldFByb3BlcnRpZXNcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuc2V0UHJvcGVydGllcyA9IGZ1bmN0aW9uIHNldFByb3BlcnRpZXMocHJvcGVydGllcykge1xuICAgIGZvciAodmFyIG4gaW4gcHJvcGVydGllcykgdGhpcy5zcGVjLnByb3BlcnRpZXNbbl0gPSBwcm9wZXJ0aWVzW25dO1xuICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuc2l6ZTtcbiAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnByb3BlcnRpZXM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgQ1NTIHByb3BlcnRpZXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBTdXJmYWNlLlxuICpcbiAqIEBtZXRob2QgZ2V0UHJvcGVydGllc1xuICogXG4gKiBAcmV0dXJuIHtPYmplY3R9IENTUyBwcm9wZXJ0aWVzIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZVxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5nZXRQcm9wZXJ0aWVzID0gZnVuY3Rpb24gZ2V0UHJvcGVydGllcygpIHtcbiAgICByZXR1cm4gdGhpcy5zcGVjLnByb3BlcnRpZXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgSFRNTCBhdHRyaWJ1dGVzIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZS5cbiAqICAgSW52YWxpZGF0ZXMgdGhlIFN1cmZhY2UncyBhdHRyaWJ1dGVzLlxuICpcbiAqIEBtZXRob2Qgc2V0QXR0cmlidXRlc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gc2V0QXR0cmlidXRlcyhhdHRyaWJ1dGVzKSB7XG4gICAgZm9yICh2YXIgbiBpbiBhdHRyaWJ1dGVzKSB0aGlzLnNwZWMuYXR0cmlidXRlc1tuXSA9IGF0dHJpYnV0ZXNbbl07XG4gICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5hdHRyaWJ1dGVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIEhUTUwgYXR0cmlidXRlcyBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBnZXRBdHRyaWJ1dGVzXG4gKiBcbiAqIEByZXR1cm4ge09iamVjdH0gSFRNTCBhdHRyaWJ1dGVzIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZVxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5nZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gZ2V0QXR0cmlidXRlcygpIHtcbiAgICByZXR1cm4gdGhpcy5zcGVjLmF0dHJpYnV0ZXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgaW5uZXJIVE1MIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZS5cbiAqICAgSW52YWxpZGF0ZXMgdGhlIFN1cmZhY2UncyBjb250ZW50LlxuICpcbiAqIEBtZXRob2Qgc2V0Q29udGVudFxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gc2V0Q29udGVudChjb250ZW50KSB7XG4gICAgaWYgKGNvbnRlbnQgIT09IHRoaXMuc3BlYy5jb250ZW50KSB7XG4gICAgICAgIHRoaXMuc3BlYy5jb250ZW50ICAgPSBjb250ZW50O1xuICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLmNvbnRlbnQ7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIGlubmVySFRNTCBhc3NvY2lhdGVkIHdpdGggdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBnZXRDb250ZW50XG4gKiBcbiAqIEByZXR1cm4ge1N0cmluZ30gaW5uZXJIVE1MIGFzc29jaWF0ZWQgd2l0aCB0aGUgU3VyZmFjZVxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5nZXRDb250ZW50ID0gZnVuY3Rpb24gZ2V0Q29udGVudCgpIHtcbiAgICByZXR1cm4gdGhpcy5zcGVjLmNvbnRlbnQ7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgc2l6ZSBvZiB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIHNldENTU1NpemVcbiAqIEBjaGFpbmFibGVcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuc2V0Q1NTU2l6ZSA9IGZ1bmN0aW9uIHNldENTU1NpemUod2lkdGgsIGhlaWdodCkge1xuICAgIGlmICghdGhpcy5zcGVjLnNpemUpIHRoaXMuc3BlYy5zaXplID0gW107XG4gICAgaWYgKHdpZHRoKSB7XG4gICAgICAgIHRoaXMuX3NpemVbMF0gPSB0aGlzLnNwZWMuc2l6ZVswXSA9IHdpZHRoO1xuICAgIH1cbiAgICBpZiAoaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMuX3NpemVbMV0gPSB0aGlzLnNwZWMuc2l6ZVsxXSA9IGhlaWdodDtcbiAgICB9XG4gICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5zaXplO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiAgR2V0IHRoZSBDU1MgU2l6ZSBvZiBhIHN1cmZhY2UuIE5vdGUgdGhhdCB3aGVuIHVzaW5nIHVuZGVmaW5lZCwgb3IgdHJ1ZSBzaXplLCB0aGlzIHdpbGxcbiAqICBoYXBwZW4gYSBmcmFtZSBsYXRlci4gVG8gZ2V0IGEgbm90aWZpY2F0aW9uIG9mIHRoaXMgY2hhbmdlLCBsaXN0ZW4gdG8gdGhpcyBzdXJmYWNlJ3NcbiAqICBzaXplQ2hhbmdlIGV2ZW50LiBcbiAqXG4gKiAgQG1ldGhvZCBnZXRDU1NTaXplXG4gKiAgQHJldXRybiB7QXJyYXl9IDJcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuZ2V0Q1NTU2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbn1cblxuXG4vKipcbiAqIFNldHMgdGhlIG9yaWdpbiBvZiB0aGUgU3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIHNldE9yaWdpblxuICogQGNoYWluYWJsZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IG9yaWdpbiBvbiB0aGUgeC1heGlzIGFzIGEgcGVyY2VudFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgb3JpZ2luIG9uIHRoZSB5LWF4aXMgYXMgYSBwZXJjZW50XG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldE9yaWdpbiAgPSBmdW5jdGlvbiBzZXRPcmlnaW4oeCwgeSkge1xuICAgIGlmICgoeCAhPSBudWxsICYmICh4IDwgMCB8fCB4ID4gMSkpIHx8ICh5ICE9IG51bGwgJiYgKHkgPCAwIHx8IHkgPiAxKSkpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignT3JpZ2luIG11c3QgaGF2ZSBhbiB4IGFuZCB5IHZhbHVlIGJldHdlZW4gMCBhbmQgMScpO1xuXG4gICAgdGhpcy5zcGVjLm9yaWdpblswXSA9IHggIT0gbnVsbCA/IHggOiB0aGlzLnNwZWMub3JpZ2luWzBdO1xuICAgIHRoaXMuc3BlYy5vcmlnaW5bMV0gPSB5ICE9IG51bGwgPyB5IDogdGhpcy5zcGVjLm9yaWdpblsxXTtcbiAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLm9yaWdpbjtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBvcmlnaW4gb2YgdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBnZXRPcmlnaW5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gMi1kaW1lbnNpb25hbCBhcnJheSByZXByZXNlbnRpbmcgdGhlIFN1cmZhY2UncyBvcmlnaW5cbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuZ2V0T3JpZ2luID0gZnVuY3Rpb24gZ2V0T3JpZ2luKCkge1xuICAgIHJldHVybiB0aGlzLnNwZWMub3JpZ2luO1xufTtcblxuLyoqXG4gKiBSZXNldHMgdGhlIGludmFsaWRhdGlvbnMgb2YgdGhlIFN1cmZhY2VcbiAqXG4gKiBAbWV0aG9kIHJlc2V0SW52YWxpZGF0aW9uc1xuICogQGNoYWluYWJsZVxuICpcbiAqIEByZXR1cm4ge1N1cmZhY2V9IHRoaXNcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUucmVzZXRJbnZhbGlkYXRpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pbnZhbGlkYXRpb25zID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogTWFyayBhbGwgcHJvcGVydGllcyBhcyBpbnZhbGlkYXRlZC5cbiAqXG4gKiBAbWV0aG9kIGludmFsaWRhdGVBbGxcbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcmV0dXJuIHtTdXJmYWNlfSB0aGlzXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmludmFsaWRhdGVBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmludmFsaWRhdGlvbnMgPSA1MTE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogQmluZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGFuIGV2ZW50IHR5cGUgaGFuZGxlZCBieSB0aGlzIFN1cmZhY2Unc1xuICogIEV2ZW50SGFuZGxlci5cbiAqXG4gKiBAbWV0aG9kIG9uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGhhbmRsZXIgY2FsbGJhY2tcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldmVudCwgY2IpIHtcbiAgICBpZiAodHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJyAmJiBjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50T3V0cHV0Lm9uKGV2ZW50LCBjYik7XG4gICAgICAgIGlmICh0aGlzLnNwZWMuZXZlbnRzLmluZGV4T2YoZXZlbnQpIDwgMCkge1xuICAgICAgICAgICAgdGhpcy5zcGVjLmV2ZW50cy5wdXNoKGV2ZW50KTtcbiAgICAgICAgICAgIHRoaXMuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMuZXZlbnRzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYSBmdW5jdGlvbiB0byBhIHBhcnRpY3VsYXIgZXZlbnQgb2NjdXJpbmcuXG4gKlxuICogQG1ldGhvZCAgb2ZmXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBuYW1lIG9mIHRoZSBldmVudCB0byBjYWxsIHRoZSBmdW5jdGlvbiB3aGVuIG9jY3VyaW5nXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZXZlbnQgaXMgcmVjaWV2ZWQuXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uIG9mZihldmVudCwgY2IpIHtcbiAgICBpZiAodHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJyAmJiBjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuc3BlYy5ldmVudHMuaW5kZXhPZihldmVudCk7XG4gICAgICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50T3V0cHV0LnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBjYik7XG4gICAgICAgICAgICB0aGlzLnNwZWMuZXZlbnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB0aGlzLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLmV2ZW50cztcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogQWRkIGV2ZW50IGhhbmRsZXIgb2JqZWN0IHRvIHRoZSBFdmVudEhhbmRsZXIncyBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICpcbiAqIEBtZXRob2QgcGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgZXZlbnQgaGFuZGxlciB0YXJnZXQgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHBhc3NlZCBldmVudCBoYW5kbGVyXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiBwaXBlKHRhcmdldCkge1xuICAgIHZhciBsaXN0ZW5lcnMgPSB0YXJnZXQudXBzdHJlYW1MaXN0ZW5lcnMgfHwgdGFyZ2V0Ll9ldmVudElucHV0LnVwc3RyZWFtTGlzdGVuZXJzO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMobGlzdGVuZXJzKTtcbiAgICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBldmVudDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGV2ZW50ID0ga2V5c1tpXTtcbiAgICAgICAgaWYgKHRoaXMuc3BlYy5ldmVudHMuaW5kZXhPZihldmVudCkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLnNwZWMuZXZlbnRzLnB1c2goZXZlbnQpO1xuICAgICAgICAgICAgdGhpcy5pbnZhbGlkYXRpb25zIHw9IFN1cmZhY2UuaW52YWxpZGF0aW9ucy5ldmVudHM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50T3V0cHV0LnBpcGUodGFyZ2V0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGhhbmRsZXIgb2JqZWN0IGZyb20gdGhlIEV2ZW50SGFuZGxlcidzIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKiAgIFVuZG9lcyB3b3JrIG9mIFwicGlwZVwiLlxuICpcbiAqIEBtZXRob2QgdW5waXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCB0YXJnZXQgaGFuZGxlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcHJvdmlkZWQgdGFyZ2V0XG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnVucGlwZSA9IGZ1bmN0aW9uIHVucGlwZSh0YXJnZXQpIHtcbiAgICByZXR1cm4gdGhpcy5fZXZlbnRPdXRwdXQudW5waXBlKHRhcmdldCk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgcmVuZGVyIHNwZWNpZmljYXRpb24gb2YgdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCAgcmVuZGVyXG4gKiBcbiAqIEByZXR1cm4ge09iamVjdH0gcmVuZGVyIHNwZWNpZmljYXRpb25cbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zcGVjLmludmFsaWRhdGlvbnMgPSB0aGlzLmludmFsaWRhdGlvbnM7XG4gICAgcmV0dXJuIHRoaXMuc3BlYztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3VyZmFjZTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIE1hdHJpeE1hdGggPSByZXF1aXJlKCcuLi8uLi9tYXRoL01hdHJpeDR4NCcpO1xudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vRW50aXR5UmVnaXN0cnknKTtcblxuLyoqXG4gKiBUYXJnZXQgaXMgdGhlIGJhc2UgY2xhc3MgZm9yIGFsbCByZW5kZXJhYmxlcy4gIEl0IGhvbGRzIHRoZSBzdGF0ZSBvZlxuICogICBpdHMgdmVydGljaWVzLCB0aGUgQ29udGFpbmVycyBpdCBpcyBkZXBsb3llZCBpbiwgdGhlIENvbnRleHQgaXQgYmVsb25nc1xuICogICB0bywgYW5kIHdoZXRoZXIgb3Igbm90IG9yaWdpbiBhbGlnbm1lbnQgbmVlZHMgdG8gYmUgYXBwbGllZC5cbiAqXG4gKiBAY29tcG9uZW50IFRhcmdldFxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSAgRW50aXR5IHRoYXQgdGhlIFRhcmdldCBpcyBhIGNvbXBvbmVudCBvZlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgb3B0aW9uc1xuICovXG5mdW5jdGlvbiBUYXJnZXQoZW50aXR5SUQsIG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiAgICAgICAgPSB0aGlzO1xuICAgIHRoaXMuX2VudGl0eUlEICA9IGVudGl0eUlEO1xuICAgIHRoaXMudmVydGljaWVzICA9IG9wdGlvbnMudmVydGljaWVzIHx8IFtdO1xuICAgIHRoaXMuY29udGFpbmVycyA9IHt9O1xuICAgIHRoaXMuX2hhc09yaWdpbiA9IGZhbHNlO1xuICAgIHRoaXMuX29yaWdpbiAgICA9IG5ldyBGbG9hdDMyQXJyYXkoWzAuNSwgMC41LCAwLjVdKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHZlcnRpY2llcyBvZiB0aGUgVGFyZ2V0LlxuICpcbiAqIEBtZXRob2QgZ2V0VmVydGljaWVzXG4gKlxuICogQHJldHVybiB7QXJyYXl9IGFycmF5IG9mIHRoZSB2ZXJ0aWNpZXMgcmVwcmVzZW50ZWQgYXMgdGhyZWUgZWxlbWVudCBhcnJheXMgW3gsIHksIHpdXG4gKi9cblRhcmdldC5wcm90b3R5cGUuZ2V0VmVydGljaWVzID0gZnVuY3Rpb24gZ2V0VmVydGljaWVzKCl7XG4gICAgcmV0dXJuIHRoaXMudmVydGljaWVzO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBUYXJnZXQgd2FzIGRlcGxveWVkIHRvIGEgcGFydGljdWxhciBjb250YWluZXJcbiAqXG4gKiBAbWV0aG9kIF9pc1dpdGhpblxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGUgaWQgb2YgdGhlIENvbnRhaW5lcidzIEVudGl0eVxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciBvciBub3cgdGhlIFRhcmdldCB3YXMgZGVwbG95ZWQgdG8gdGhpcyBwYXJ0aWN1bGFyIENvbnRhaW5lclxuICovXG5UYXJnZXQucHJvdG90eXBlLl9pc1dpdGhpbiA9IGZ1bmN0aW9uIF9pc1dpdGhpbihjb250YWluZXIpIHtcbiAgICByZXR1cm4gdGhpcy5jb250YWluZXJzW2NvbnRhaW5lci5faWRdO1xufTtcblxuLyoqXG4gKiBNYXJrIGEgQ29udGFpbmVyIGFzIGhhdmluZyBhIGRlcGxveWVkIGluc3RhbmNlIG9mIHRoZSBUYXJnZXRcbiAqXG4gKiBAbWV0aG9kIF9hZGRUb0NvbnRhaW5lclxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGUgaWQgb2YgdGhlIENvbnRhaW5lcidzIEVudGl0eVxuICogQHJldHVybiB7Qm9vbGVhbn0gc3RhdXMgb2YgdGhlIGFkZGl0aW9uXG4gKi9cblRhcmdldC5wcm90b3R5cGUuX2FkZFRvQ29udGFpbmVyID0gZnVuY3Rpb24gX2FkZFRvQ29udGFpbmVyKGNvbnRhaW5lcikge1xuICAgIHRoaXMuY29udGFpbmVyc1tjb250YWluZXIuX2lkXSA9IHRydWU7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFVubWFyayBhIENvbnRhaW5lciBhcyBoYXZpbmcgYSBkZXBsb3llZCBpbnN0YW5jZSBvZiB0aGUgVGFyZ2V0XG4gKlxuICogQG1ldGhvZCBfcmVtb3ZlRnJvbUNvbnRhaW5lclxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGUgaWQgb2YgdGhlIENvbnRhaW5lcidzIEVudGl0eVxuICogQHJldHVybiB7Qm9vbGVhbn0gc3RhdXMgb2YgdGhlIHJlbW92YWxcbiAqL1xuVGFyZ2V0LnByb3RvdHlwZS5fcmVtb3ZlRnJvbUNvbnRhaW5lciA9IGZ1bmN0aW9uIF9yZW1vdmVGcm9tQ29udGFpbmVyKGNvbnRhaW5lcikge1xuICAgIHRoaXMuY29udGFpbmVyc1tjb250YWluZXIuX2lkXSA9IGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHNpemUgb2YgdGhlIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBnZXRTaXplXG4gKlxuICogQHJldHVybiB7QXJyYXl9IDItZGltZW5zaW9uYWwgYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBzaXplIG9mIHRoZSBTdXJmYWNlIGluIHBpeGVscy5cbiAqL1xuVGFyZ2V0LnByb3RvdHlwZS5nZXRTaXplID0gZnVuY3Rpb24gZ2V0U2l6ZShtYXRyaXgsIGRpdmlkZUJ5Vykge1xuICAgIG1hdHJpeCA9IG1hdHJpeCB8fCB0aGlzLmdldEVudGl0eSgpLmdldENvbXBvbmVudCgndHJhbnNmb3JtJykuX21hdHJpeDtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgZGlzcGxhY2VtZW50OiB7XG4gICAgICAgICAgICAgICAgbGVmdCAgIDogMCxcbiAgICAgICAgICAgICAgICBib3R0b20gOiAwLFxuICAgICAgICAgICAgICAgIG5lYXIgICA6IDAsXG4gICAgICAgICAgICAgICAgcmlnaHQgIDogMCxcbiAgICAgICAgICAgICAgICB0b3AgICAgOiAwLFxuICAgICAgICAgICAgICAgIGZhciAgICA6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICB2YXIgaSA9IHRoaXMudmVydGljaWVzLmxlbmd0aDtcbiAgICB2YXIgdmVjdG9yU2NyYXRjaCA9IFtdO1xuICAgIE1hdHJpeE1hdGguYXBwbHlUb1ZlY3Rvcih2ZWN0b3JTY3JhdGNoLCBtYXRyaXgsIFswLCAwLCAwLCAxXSk7XG4gICAgaWYgKGRpdmlkZUJ5Vykge1xuICAgICAgICB2ZWN0b3JTY3JhdGNoWzBdIC89IHZlY3RvclNjcmF0Y2hbM107XG4gICAgICAgIHZlY3RvclNjcmF0Y2hbMV0gLz0gdmVjdG9yU2NyYXRjaFszXTtcbiAgICAgICAgdmVjdG9yU2NyYXRjaFsyXSAvPSB2ZWN0b3JTY3JhdGNoWzNdO1xuICAgIH1cbiAgICByZXN1bHQub3JpZ2luID0gdmVjdG9yU2NyYXRjaC5zbGljZSgwLCAtMSk7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBNYXRyaXhNYXRoLmFwcGx5VG9WZWN0b3IodmVjdG9yU2NyYXRjaCwgbWF0cml4LCB0aGlzLnZlcnRpY2llc1tpXSk7XG4gICAgICAgIGlmIChkaXZpZGVCeVcpIHtcbiAgICAgICAgICAgIHZlY3RvclNjcmF0Y2hbMF0gLz0gdmVjdG9yU2NyYXRjaFszXTtcbiAgICAgICAgICAgIHZlY3RvclNjcmF0Y2hbMV0gLz0gdmVjdG9yU2NyYXRjaFszXTtcbiAgICAgICAgICAgIHZlY3RvclNjcmF0Y2hbMl0gLz0gdmVjdG9yU2NyYXRjaFszXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeCA9IHZlY3RvclNjcmF0Y2hbMF0gLSByZXN1bHQub3JpZ2luWzBdLCB5ID0gdmVjdG9yU2NyYXRjaFsxXSAtIHJlc3VsdC5vcmlnaW5bMV0sIHogPSB2ZWN0b3JTY3JhdGNoWzJdIC0gcmVzdWx0Lm9yaWdpblsyXTtcbiAgICAgICAgaWYgKHggPiByZXN1bHQuZGlzcGxhY2VtZW50LnJpZ2h0KSAgcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCAgPSB4O1xuICAgICAgICBpZiAoeCA8IHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCkgICByZXN1bHQuZGlzcGxhY2VtZW50LmxlZnQgICA9IHg7XG4gICAgICAgIGlmICh5ID4gcmVzdWx0LmRpc3BsYWNlbWVudC5ib3R0b20pIHJlc3VsdC5kaXNwbGFjZW1lbnQuYm90dG9tID0geTtcbiAgICAgICAgaWYgKHkgPCByZXN1bHQuZGlzcGxhY2VtZW50LnRvcCkgICAgcmVzdWx0LmRpc3BsYWNlbWVudC50b3AgICAgPSB5O1xuICAgICAgICBpZiAoeiA+IHJlc3VsdC5kaXNwbGFjZW1lbnQubmVhcikgICByZXN1bHQuZGlzcGxhY2VtZW50Lm5lYXIgICA9IHo7XG4gICAgICAgIGlmICh6IDwgcmVzdWx0LmRpc3BsYWNlbWVudC5mYXIpICAgIHJlc3VsdC5kaXNwbGFjZW1lbnQuZmFyICAgID0gejtcbiAgICB9XG4gICAgcmVzdWx0LnNpemUgPSBbcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCAtIHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCwgcmVzdWx0LmRpc3BsYWNlbWVudC5ib3R0b20gLSByZXN1bHQuZGlzcGxhY2VtZW50LnRvcCwgcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyIC0gcmVzdWx0LmRpc3BsYWNlbWVudC5mYXJdO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5UYXJnZXQucHJvdG90eXBlLmdldEVudGl0eSA9IGZ1bmN0aW9uIGdldEVudGl0eSgpIHtcbiAgICByZXR1cm4gRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5KHRoaXMuX2VudGl0eUlEKTtcbn07XG5cblRhcmdldC5wcm90b3R5cGUuc2V0T3JpZ2luID0gZnVuY3Rpb24gc2V0T3JpZ2luKCkge1xuICAgIHRoaXMuX29yaWdpblswXSA9IHggIT0gbnVsbCA/IHggOiB0aGlzLl9vcmlnaW5bMF07XG4gICAgdGhpcy5fb3JpZ2luWzFdID0geSAhPSBudWxsID8geSA6IHRoaXMuX29yaWdpblsxXTtcbiAgICB0aGlzLl9vcmlnaW5bMl0gPSB6ICE9IG51bGwgPyB6IDogdGhpcy5fb3JpZ2luWzFdO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFRhcmdldDtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50RW1pdHRlcicpO1xuXG4vLyBDT05TVFNcbnZhciBJREVOVElUWSA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKTtcblxuLy8gRnVuY3Rpb25zIHRvIGJlIHJ1biB3aGVuIGFuIGluZGV4IGlzIG1hcmtlZCBhcyBpbnZhbGlkYXRlZFxudmFyIFZBTElEQVRPUlMgPSBbXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUwKHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMF0gKiAobWVtb3J5WzJdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF0gKyBwYXJlbnRbNF0gKiAobWVtb3J5WzBdICogbWVtb3J5WzVdICsgbWVtb3J5WzFdICogbWVtb3J5WzNdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF0gKyBwYXJlbnRbOF0gKiAobWVtb3J5WzFdICogbWVtb3J5WzVdIC0gbWVtb3J5WzBdICogbWVtb3J5WzNdICogbWVtb3J5WzRdKSAqIHZlY3RvcnMuc2NhbGVbMF07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTEocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFsxXSAqIChtZW1vcnlbMl0gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXSArIHBhcmVudFs1XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbNV0gKyBtZW1vcnlbMV0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXSArIHBhcmVudFs5XSAqIChtZW1vcnlbMV0gKiBtZW1vcnlbNV0gLSBtZW1vcnlbMF0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMihwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzJdICogKG1lbW9yeVsyXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdICsgcGFyZW50WzZdICogKG1lbW9yeVswXSAqIG1lbW9yeVs1XSArIG1lbW9yeVsxXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdICsgcGFyZW50WzEwXSAqIChtZW1vcnlbMV0gKiBtZW1vcnlbNV0gLSBtZW1vcnlbMF0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMyhwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzNdICogKG1lbW9yeVsyXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdICsgcGFyZW50WzddICogKG1lbW9yeVswXSAqIG1lbW9yeVs1XSArIG1lbW9yeVsxXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs0XSkgKiB2ZWN0b3JzLnNjYWxlWzBdICsgcGFyZW50WzExXSAqIChtZW1vcnlbMV0gKiBtZW1vcnlbNV0gLSBtZW1vcnlbMF0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNF0pICogdmVjdG9ycy5zY2FsZVswXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlNChwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzBdICogKC1tZW1vcnlbMl0gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXSArIHBhcmVudFs0XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbNF0gLSBtZW1vcnlbMV0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXSArIHBhcmVudFs4XSAqIChtZW1vcnlbMV0gKiBtZW1vcnlbNF0gKyBtZW1vcnlbMF0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlNShwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzFdICogKC1tZW1vcnlbMl0gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXSArIHBhcmVudFs1XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbNF0gLSBtZW1vcnlbMV0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXSArIHBhcmVudFs5XSAqIChtZW1vcnlbMV0gKiBtZW1vcnlbNF0gKyBtZW1vcnlbMF0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlNihwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzJdICogKC1tZW1vcnlbMl0gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXSArIHBhcmVudFs2XSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbNF0gLSBtZW1vcnlbMV0gKiBtZW1vcnlbM10gKiBtZW1vcnlbNV0pICogdmVjdG9ycy5zY2FsZVsxXSArIHBhcmVudFsxMF0gKiAobWVtb3J5WzFdICogbWVtb3J5WzRdICsgbWVtb3J5WzBdICogbWVtb3J5WzNdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTcocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFszXSAqICgtbWVtb3J5WzJdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV0gKyBwYXJlbnRbN10gKiAobWVtb3J5WzBdICogbWVtb3J5WzRdIC0gbWVtb3J5WzFdICogbWVtb3J5WzNdICogbWVtb3J5WzVdKSAqIHZlY3RvcnMuc2NhbGVbMV0gKyBwYXJlbnRbMTFdICogKG1lbW9yeVsxXSAqIG1lbW9yeVs0XSArIG1lbW9yeVswXSAqIG1lbW9yeVszXSAqIG1lbW9yeVs1XSkgKiB2ZWN0b3JzLnNjYWxlWzFdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGU4KHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMF0gKiAobWVtb3J5WzNdKSAqIHZlY3RvcnMuc2NhbGVbMl0gKyBwYXJlbnRbNF0gKiAoLW1lbW9yeVsxXSAqIG1lbW9yeVsyXSkgKiB2ZWN0b3JzLnNjYWxlWzJdICsgcGFyZW50WzhdICogKG1lbW9yeVswXSAqIG1lbW9yeVsyXSkgKiB2ZWN0b3JzLnNjYWxlWzJdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGU5KHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMV0gKiAobWVtb3J5WzNdKSAqIHZlY3RvcnMuc2NhbGVbMl0gKyBwYXJlbnRbNV0gKiAoLW1lbW9yeVsxXSAqIG1lbW9yeVsyXSkgKiB2ZWN0b3JzLnNjYWxlWzJdICsgcGFyZW50WzldICogKG1lbW9yeVswXSAqIG1lbW9yeVsyXSkgKiB2ZWN0b3JzLnNjYWxlWzJdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUxMChwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzJdICogKG1lbW9yeVszXSkgKiB2ZWN0b3JzLnNjYWxlWzJdICsgcGFyZW50WzZdICogKC1tZW1vcnlbMV0gKiBtZW1vcnlbMl0pICogdmVjdG9ycy5zY2FsZVsyXSArIHBhcmVudFsxMF0gKiAobWVtb3J5WzBdICogbWVtb3J5WzJdKSAqIHZlY3RvcnMuc2NhbGVbMl07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTExKHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbM10gKiAobWVtb3J5WzNdKSAqIHZlY3RvcnMuc2NhbGVbMl0gKyBwYXJlbnRbN10gKiAoLW1lbW9yeVsxXSAqIG1lbW9yeVsyXSkgKiB2ZWN0b3JzLnNjYWxlWzJdICsgcGFyZW50WzExXSAqIChtZW1vcnlbMF0gKiBtZW1vcnlbMl0pICogdmVjdG9ycy5zY2FsZVsyXTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlMTIocGFyZW50LCB2ZWN0b3JzLCBtZW1vcnkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFswXSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMF0gKyBwYXJlbnRbNF0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzFdICsgcGFyZW50WzhdICogdmVjdG9ycy50cmFuc2xhdGlvblsyXSArIHBhcmVudFsxMl07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTEzKHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbMV0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzBdICsgcGFyZW50WzVdICogdmVjdG9ycy50cmFuc2xhdGlvblsxXSArIHBhcmVudFs5XSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMl0gKyBwYXJlbnRbMTNdO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUxNChwYXJlbnQsIHZlY3RvcnMsIG1lbW9yeSkge1xuICAgICAgICByZXR1cm4gcGFyZW50WzJdICogdmVjdG9ycy50cmFuc2xhdGlvblswXSArIHBhcmVudFs2XSAqIHZlY3RvcnMudHJhbnNsYXRpb25bMV0gKyBwYXJlbnRbMTBdICogdmVjdG9ycy50cmFuc2xhdGlvblsyXSArIHBhcmVudFsxNF07XG4gICAgfSxcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZTE1KHBhcmVudCwgdmVjdG9ycywgbWVtb3J5KSB7XG4gICAgICAgIHJldHVybiBwYXJlbnRbM10gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzBdICsgcGFyZW50WzddICogdmVjdG9ycy50cmFuc2xhdGlvblsxXSArIHBhcmVudFsxMV0gKiB2ZWN0b3JzLnRyYW5zbGF0aW9uWzJdICsgcGFyZW50WzE1XTtcbiAgICB9XG5dO1xuXG4vLyBNYXAgb2YgaW52YWxpZGF0aW9uIG51bWJlcnNcbnZhciBERVBFTkRFTlRTID0ge1xuICAgIGdsb2JhbCA6IFs0MzY5LDg3MzgsMTc0NzYsMzQ5NTIsNDM2OSw4NzM4LDE3NDc2LDM0OTUyLDQzNjksODczOCwxNzQ3NiwzNDk1Miw0MDk2LDgxOTIsMTYzODQsMzI3NjhdLFxuICAgIGxvY2FsICA6IHtcbiAgICAgICAgdHJhbnNsYXRpb24gOiBbNjE0NDAsNjE0NDAsNjE0NDBdLFxuICAgICAgICByb3RhdGlvbiAgICA6IFs0MDk1LDQwOTUsMjU1XSxcbiAgICAgICAgc2NhbGUgICAgICAgOiBbNDA5NSw0MDk1LDQwOTVdLFxuICAgIH1cbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGlzIGEgY29tcG9uZW50IHRoYXQgaXMgcGFydCBvZiBldmVyeSBFbnRpdHkuICBJdCBpc1xuICogICByZXNwb25zaWJsZSBmb3IgdXBkYXRpbmcgaXQncyBvd24gbm90aW9uIG9mIHBvc2l0aW9uIGluIHNwYWNlIGFuZFxuICogICBpbmNvcnBvcmF0aW5nIHRoYXQgd2l0aCBwYXJlbnQgaW5mb3JtYXRpb24uXG4gKlxuICogQGNsYXNzIFRyYW5zZm9ybVxuICogQGNvbXBvbmVudFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFRyYW5zZm9ybSgpIHtcbiAgICB0aGlzLl9tYXRyaXggICA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKTtcbiAgICB0aGlzLl9tZW1vcnkgICA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDEsIDAsIDEsIDBdKTtcbiAgICB0aGlzLl92ZWN0b3JzICA9IHtcbiAgICAgICAgdHJhbnNsYXRpb24gOiBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwXSksXG4gICAgICAgIHJvdGF0aW9uICAgIDogbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgMF0pLFxuICAgICAgICBzY2FsZSAgICAgICA6IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDEsIDFdKVxuICAgIH07XG4gICAgdGhpcy5fSU8gICAgICAgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgdGhpcy5fdXBkYXRlRk4gPSBudWxsO1xuICAgIHRoaXMuX211dGF0b3IgID0ge1xuICAgICAgICB0cmFuc2xhdGUgICAgICA6IHRoaXMudHJhbnNsYXRlLmJpbmQodGhpcyksXG4gICAgICAgIHJvdGF0ZSAgICAgICAgIDogdGhpcy5yb3RhdGUuYmluZCh0aGlzKSxcbiAgICAgICAgc2NhbGUgICAgICAgICAgOiB0aGlzLnNjYWxlLmJpbmQodGhpcyksXG4gICAgICAgIHNldFRyYW5zbGF0aW9uIDogdGhpcy5zZXRUcmFuc2xhdGlvbi5iaW5kKHRoaXMpLFxuICAgICAgICBzZXRSb3RhdGlvbiAgICA6IHRoaXMuc2V0Um90YXRpb24uYmluZCh0aGlzKSxcbiAgICAgICAgc2V0U2NhbGUgICAgICAgOiB0aGlzLnNldFNjYWxlLmJpbmQodGhpcylcbiAgICB9O1xuICAgIHRoaXMuX2ludmFsaWRhdGVkID0gMDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIHRyYW5zZm9ybSBtYXRyaXggdGhhdCByZXByZXNlbnRzIHRoaXMgVHJhbnNmb3JtJ3MgdmFsdWVzXG4gKiAgIGJlaW5nIGFwcGxpZWQgdG8gaXQncyBwYXJlbnQncyBnbG9iYWwgdHJhbnNmb3JtLlxuICpcbiAqIEBtZXRob2QgZ2V0R2xvYmFsTWF0cml4XG4gKlxuICogQHJldHVybiB7RmxvYXQzMiBBcnJheX0gcmVwcmVzZW50YXRpb24gb2YgdGhpcyBUcmFuc2Zvcm0gYmVpbmcgYXBwbGllZCB0byBpdCdzIHBhcmVudFxuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldEdsb2JhbE1hdHJpeCA9IGZ1bmN0aW9uIGdldEdsb2JhbE1hdHJpeCgpIHtcbiAgICByZXR1cm4gdGhpcy5fbWF0cml4O1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIHZlY3Rvcml6ZWQgaW5mb3JtYXRpb24gZm9yIHRoaXMgVHJhbnNmb3JtJ3MgbG9jYWxcbiAqICAgdHJhbnNmb3JtLlxuICpcbiAqIEBtZXRob2QgZ2V0TG9jYWxWZWN0b3JzXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBvYmplY3Qgd2l0aCB0cmFuc2xhdGUsIHJvdGF0ZSwgYW5kIHNjYWxlIGtleXNcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRMb2NhbFZlY3RvcnMgPSBmdW5jdGlvbiBnZXRWZWN0b3JzKCkge1xuICAgIHJldHVybiB0aGlzLl92ZWN0b3JzO1xufTtcblxuLyoqXG4gKiBEZWZpbmUgdGhlIHByb3ZpZGVyIG9mIHN0YXRlIGZvciB0aGUgVHJhbnNmb3JtLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlRnJvbVxuICogQGNoYWluYWJsZVxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBwcm92aWRlciBzb3VyY2Ugb2Ygc3RhdGUgZm9yIHRoZSBUcmFuc2Zvcm1cbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS51cGRhdGVGcm9tID0gZnVuY3Rpb24gdXBkYXRlRnJvbShwcm92aWRlcikge1xuICAgIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIEZ1bmN0aW9uIHx8ICFwcm92aWRlcikgdGhpcy5fdXBkYXRlRk4gPSBwcm92aWRlcjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgbG9jYWwgaW52YWxpZGF0aW9uIHNjaGVtZSBiYXNlZCBvbiBwYXJlbnQgaW5mb3JtYXRpb25cbiAqXG4gKiBAbWV0aG9kIF9pbnZhbGlkYXRlRnJvbVBhcmVudFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHBhcmVudFJlcG9ydCBwYXJlbnQncyBpbnZhbGlkYXRpb25cbiAqL1xuZnVuY3Rpb24gX2ludmFsaWRhdGVGcm9tUGFyZW50KHBhcmVudFJlcG9ydCkge1xuICAgIHZhciBjb3VudGVyID0gMDtcbiAgICB3aGlsZSAocGFyZW50UmVwb3J0KSB7XG4gICAgICAgIGlmIChwYXJlbnRSZXBvcnQgJiAxKSB0aGlzLl9pbnZhbGlkYXRlZCB8PSBERVBFTkRFTlRTLmdsb2JhbFtjb3VudGVyXTtcbiAgICAgICAgY291bnRlcisrO1xuICAgICAgICBwYXJlbnRSZXBvcnQgPj4+PSAxO1xuICAgIH1cbn1cblxuLyoqXG4gKiBVcGRhdGUgdGhlIGdsb2JhbCBtYXRyaXggYmFzZWQgb24gbG9jYWwgYW5kIHBhcmVudCBpbnZhbGlkYXRpb25zLlxuICpcbiAqIEBtZXRob2QgIF91cGRhdGVcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBwYXJlbnRSZXBvcnQgaW52YWxpZGF0aW9ucyBhc3NvY2lhdGVkIHdpdGggdGhlIHBhcmVudCBtYXRyaXhcbiAqIEBwYXJhbSAge0FycmF5fSBwYXJlbnRNYXRyaXggcGFyZW50IHRyYW5zZm9ybSBtYXRyaXggYXMgYW4gQXJyYXlcbiAqIEByZXR1cm4ge051bWJlcn0gaW52YWxpZGF0aW9uIHNjaGVtZVxuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiBfdXBkYXRlKHBhcmVudFJlcG9ydCwgcGFyZW50TWF0cml4KSB7XG4gICAgaWYgKHBhcmVudFJlcG9ydCkgIF9pbnZhbGlkYXRlRnJvbVBhcmVudC5jYWxsKHRoaXMsIHBhcmVudFJlcG9ydCk7XG4gICAgaWYgKCFwYXJlbnRNYXRyaXgpIHBhcmVudE1hdHJpeCA9IElERU5USVRZO1xuICAgIGlmICh0aGlzLl91cGRhdGVGTikgdGhpcy5fdXBkYXRlRk4odGhpcy5fbXV0YXRvcik7XG4gICAgdmFyIHVwZGF0ZTtcbiAgICB2YXIgY291bnRlciAgICAgPSAwO1xuICAgIHZhciBpbnZhbGlkYXRlZCA9IHRoaXMuX2ludmFsaWRhdGVkO1xuXG4gICAgLy8gQmFzZWQgb24gaW52YWxpZGF0aW9ucyB1cGRhdGUgb25seSB0aGUgbmVlZGVkIGluZGljaWVzXG4gICAgd2hpbGUgKHRoaXMuX2ludmFsaWRhdGVkKSB7XG4gICAgICAgIGlmICh0aGlzLl9pbnZhbGlkYXRlZCAmIDEpIHtcbiAgICAgICAgICAgIHVwZGF0ZSA9IFZBTElEQVRPUlNbY291bnRlcl0ocGFyZW50TWF0cml4LCB0aGlzLl92ZWN0b3JzLCB0aGlzLl9tZW1vcnkpO1xuICAgICAgICAgICAgaWYgKHVwZGF0ZSAhPT0gdGhpcy5fbWF0cml4W2NvdW50ZXJdKVxuICAgICAgICAgICAgICAgIHRoaXMuX21hdHJpeFtjb3VudGVyXSA9IHVwZGF0ZTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBpbnZhbGlkYXRlZCAmPSAoKDEgPDwgMTYpIC0gMSkgXiAoMSA8PCBjb3VudGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvdW50ZXIrKztcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgPj4+PSAxO1xuICAgIH1cblxuICAgIGlmIChpbnZhbGlkYXRlZCkgdGhpcy5fSU8uZW1pdCgnaW52YWxpZGF0ZWQnLCBpbnZhbGlkYXRlZCk7XG4gICAgcmV0dXJuIGludmFsaWRhdGVkO1xufTtcblxuLyoqXG4gKiBBZGQgZXh0cmEgdHJhbnNsYXRpb24gdG8gdGhlIGN1cnJlbnQgdmFsdWVzLiAgSW52YWxpZGF0ZXNcbiAqICAgdHJhbnNsYXRpb24gYXMgbmVlZGVkLlxuICpcbiAqIEBtZXRob2QgdHJhbnNsYXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB4IHRyYW5zbGF0aW9uIGFsb25nIHRoZSB4LWF4aXMgaW4gcGl4ZWxzXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHkgdHJhbnNsYXRpb24gYWxvbmcgdGhlIHktYXhpcyBpbiBwaXhlbHNcbiAqIEBwYXJhbSAge051bWJlcn0geiB0cmFuc2xhdGlvbiBhbG9uZyB0aGUgei1heGlzIGluIHBpeGVsc1xuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIHRyYW5zbGF0ZSh4LCB5LCB6KSB7XG4gICAgdmFyIHRyYW5zbGF0aW9uID0gdGhpcy5fdmVjdG9ycy50cmFuc2xhdGlvbjtcbiAgICB2YXIgZGlydHkgICAgICAgPSBmYWxzZTtcbiAgICB2YXIgc2l6ZTtcblxuICAgIGlmICh4KSB7XG4gICAgICAgIHRyYW5zbGF0aW9uWzBdICs9IHg7XG4gICAgICAgIGRpcnR5ICAgICAgICAgICA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHkpIHtcbiAgICAgICAgdHJhbnNsYXRpb25bMV0gKz0geTtcbiAgICAgICAgZGlydHkgICAgICAgICAgID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeikge1xuICAgICAgICB0cmFuc2xhdGlvblsyXSArPSB6O1xuICAgICAgICBkaXJ0eSAgICAgICAgICAgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChkaXJ0eSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gNjE0NDA7XG59O1xuXG4vKipcbiAqIEFkZCBleHRyYSByb3RhdGlvbiB0byB0aGUgY3VycmVudCB2YWx1ZXMuICBJbnZhbGlkYXRlc1xuICogICByb3RhdGlvbiBhcyBuZWVkZWQuXG4gKlxuICogQG1ldGhvZCByb3RhdGVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggcm90YXRpb24gYWJvdXQgdGhlIHgtYXhpcyBpbiByYWRpYW5zXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHkgcm90YXRpb24gYWJvdXQgdGhlIHktYXhpcyBpbiByYWRpYW5zXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHogcm90YXRpb24gYWJvdXQgdGhlIHotYXhpcyBpbiByYWRpYW5zXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24gcm90YXRlKHgsIHksIHopIHtcbiAgICB2YXIgcm90YXRpb24gPSB0aGlzLl92ZWN0b3JzLnJvdGF0aW9uO1xuICAgIHRoaXMuc2V0Um90YXRpb24oKHggPyB4IDogMCkgKyByb3RhdGlvblswXSwgKHkgPyB5IDogMCkgKyByb3RhdGlvblsxXSwgKHogPyB6IDogMCkgKyByb3RhdGlvblsyXSk7XG59O1xuXG4vKipcbiAqIEFkZCBleHRyYSBzY2FsZSB0byB0aGUgY3VycmVudCB2YWx1ZXMuICBJbnZhbGlkYXRlc1xuICogICBzY2FsZSBhcyBuZWVkZWQuXG4gKlxuICogQG1ldGhvZCBzY2FsZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0geCBzY2FsZSBhbG9uZyB0aGUgeC1heGlzIGFzIGEgcGVyY2VudFxuICogQHBhcmFtICB7TnVtYmVyfSB5IHNjYWxlIGFsb25nIHRoZSB5LWF4aXMgYXMgYSBwZXJjZW50XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHogc2NhbGUgYWxvbmcgdGhlIHotYXhpcyBhcyBhIHBlcmNlbnRcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHgsIHksIHopIHtcbiAgICB2YXIgc2NhbGVWZWN0b3IgPSB0aGlzLl92ZWN0b3JzLnNjYWxlO1xuICAgIHZhciBkaXJ0eSAgICAgICA9IGZhbHNlO1xuXG4gICAgaWYgKHgpIHtcbiAgICAgICAgc2NhbGVWZWN0b3JbMF0gKz0geDtcbiAgICAgICAgZGlydHkgICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeSkge1xuICAgICAgICBzY2FsZVZlY3RvclsxXSArPSB5O1xuICAgICAgICBkaXJ0eSAgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmICh6KSB7XG4gICAgICAgIHNjYWxlVmVjdG9yWzJdICs9IHo7XG4gICAgICAgIGRpcnR5ICAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGRpcnR5KSB0aGlzLl9pbnZhbGlkYXRlZCB8PSA0MDk1O1xufTtcblxuLyoqXG4gKiBBYnNvbHV0ZSBzZXQgb2YgdGhlIFRyYW5zZm9ybSdzIHRyYW5zbGF0aW9uLiAgSW52YWxpZGF0ZXNcbiAqICAgdHJhbnNsYXRpb24gYXMgbmVlZGVkLlxuICpcbiAqIEBtZXRob2Qgc2V0VHJhbnNsYXRpb25cbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggdHJhbnNsYXRpb24gYWxvbmcgdGhlIHgtYXhpcyBpbiBwaXhlbHNcbiAqIEBwYXJhbSAge051bWJlcn0geSB0cmFuc2xhdGlvbiBhbG9uZyB0aGUgeS1heGlzIGluIHBpeGVsc1xuICogQHBhcmFtICB7TnVtYmVyfSB6IHRyYW5zbGF0aW9uIGFsb25nIHRoZSB6LWF4aXMgaW4gcGl4ZWxzXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0VHJhbnNsYXRpb24gPSBmdW5jdGlvbiBzZXRUcmFuc2xhdGlvbih4LCB5LCB6KSB7XG4gICAgdmFyIHRyYW5zbGF0aW9uID0gdGhpcy5fdmVjdG9ycy50cmFuc2xhdGlvbjtcbiAgICB2YXIgZGlydHkgICAgICAgPSBmYWxzZTtcbiAgICB2YXIgc2l6ZTtcblxuICAgIGlmICh4ICE9PSB0cmFuc2xhdGlvblswXSAmJiB4ICE9IG51bGwpIHtcbiAgICAgICAgdHJhbnNsYXRpb25bMF0gPSB4O1xuICAgICAgICBkaXJ0eSAgICAgICAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IHRyYW5zbGF0aW9uWzFdICYmIHkgIT0gbnVsbCkge1xuICAgICAgICB0cmFuc2xhdGlvblsxXSA9IHk7XG4gICAgICAgIGRpcnR5ICAgICAgICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeiAhPT0gdHJhbnNsYXRpb25bMl0gJiYgeiAhPSBudWxsKSB7XG4gICAgICAgIHRyYW5zbGF0aW9uWzJdID0gejtcbiAgICAgICAgZGlydHkgICAgICAgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmIChkaXJ0eSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gNjE0NDA7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgY3VycmVudCB0cmFuc2xhdGlvbi5cbiAqXG4gKiBAbWV0aG9kIGdldFRyYW5zbGF0aW9uXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSBhcnJheSByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgdHJhbnNsYXRpb25cbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uIGdldFRyYW5zbGF0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl92ZWN0b3JzLnRyYW5zbGF0aW9uO1xufTtcblxuLyoqXG4gKiBBYnNvbHV0ZSBzZXQgb2YgdGhlIFRyYW5zZm9ybSdzIHJvdGF0aW9uLiAgSW52YWxpZGF0ZXNcbiAqICAgcm90YXRpb24gYXMgbmVlZGVkLlxuICpcbiAqIEBtZXRob2Qgc2V0Um90YXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB4IHJvdGF0aW9uIGFib3V0IHRoZSB4LWF4aXMgaW4gcmFkaWFuc1xuICogQHBhcmFtICB7TnVtYmVyfSB5IHJvdGF0aW9uIGFib3V0IHRoZSB5LWF4aXMgaW4gcmFkaWFuc1xuICogQHBhcmFtICB7TnVtYmVyfSB6IHJvdGF0aW9uIGFib3V0IHRoZSB6LWF4aXMgaW4gcmFkaWFuc1xuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldFJvdGF0aW9uID0gZnVuY3Rpb24gc2V0Um90YXRpb24oeCwgeSwgeikge1xuICAgIHZhciByb3RhdGlvbiA9IHRoaXMuX3ZlY3RvcnMucm90YXRpb247XG4gICAgdmFyIGRpcnR5ICAgID0gZmFsc2U7XG5cbiAgICBpZiAoeCAhPT0gcm90YXRpb25bMF0gJiYgeCAhPSBudWxsKSB7XG4gICAgICAgIHJvdGF0aW9uWzBdICAgICA9IHg7XG4gICAgICAgIHRoaXMuX21lbW9yeVswXSA9IE1hdGguY29zKHgpO1xuICAgICAgICB0aGlzLl9tZW1vcnlbMV0gPSBNYXRoLnNpbih4KTtcbiAgICAgICAgZGlydHkgICAgICAgICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gcm90YXRpb25bMV0gJiYgeSAhPSBudWxsKSB7XG4gICAgICAgIHJvdGF0aW9uWzFdICAgICA9IHk7XG4gICAgICAgIHRoaXMuX21lbW9yeVsyXSA9IE1hdGguY29zKHkpO1xuICAgICAgICB0aGlzLl9tZW1vcnlbM10gPSBNYXRoLnNpbih5KTtcbiAgICAgICAgZGlydHkgICAgICAgICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeiAhPT0gcm90YXRpb25bMl0gJiYgeiAhPSBudWxsKSB7XG4gICAgICAgIHJvdGF0aW9uWzJdICAgICAgICA9IHo7XG4gICAgICAgIHRoaXMuX21lbW9yeVs0XSAgICA9IE1hdGguY29zKHopO1xuICAgICAgICB0aGlzLl9tZW1vcnlbNV0gICAgPSBNYXRoLnNpbih6KTtcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZWQgfD0gMjU1O1xuICAgIH1cblxuICAgIGlmIChkaXJ0eSkgdGhpcy5faW52YWxpZGF0ZWQgfD0gNDA5NTtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBjdXJyZW50IHJvdGF0aW9uLlxuICpcbiAqIEBtZXRob2QgZ2V0Um90YXRpb25cbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGFycmF5IHJlcHJlc2VudGluZyB0aGUgY3VycmVudCByb3RhdGlvblxuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFJvdGF0aW9uID0gZnVuY3Rpb24gZ2V0Um90YXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZlY3RvcnMucm90YXRpb247XG59O1xuXG4vKipcbiAqIEFic29sdXRlIHNldCBvZiB0aGUgVHJhbnNmb3JtJ3Mgc2NhbGUuICBJbnZhbGlkYXRlc1xuICogICBzY2FsZSBhcyBuZWVkZWQuXG4gKlxuICogQG1ldGhvZCBzZXRTY2FsZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0geCBzY2FsZSBhbG9uZyB0aGUgeC1heGlzIGFzIGEgcGVyY2VudFxuICogQHBhcmFtICB7TnVtYmVyfSB5IHNjYWxlIGFsb25nIHRoZSB5LWF4aXMgYXMgYSBwZXJjZW50XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHogc2NhbGUgYWxvbmcgdGhlIHotYXhpcyBhcyBhIHBlcmNlbnRcbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRTY2FsZSA9IGZ1bmN0aW9uIHNldFNjYWxlKHgsIHksIHopIHtcbiAgICB2YXIgc2NhbGUgPSB0aGlzLl92ZWN0b3JzLnNjYWxlO1xuICAgIHZhciBkaXJ0eSA9IGZhbHNlO1xuXG4gICAgaWYgKHggIT09IHNjYWxlWzBdKSB7XG4gICAgICAgIHNjYWxlWzBdID0geDtcbiAgICAgICAgZGlydHkgICAgPSBkaXJ0eSB8fCB0cnVlO1xuICAgIH1cblxuICAgIGlmICh5ICE9PSBzY2FsZVsxXSkge1xuICAgICAgICBzY2FsZVsxXSA9IHk7XG4gICAgICAgIGRpcnR5ICAgID0gZGlydHkgfHwgdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoeiAhPT0gc2NhbGVbMl0pIHtcbiAgICAgICAgc2NhbGVbMl0gPSB6O1xuICAgICAgICBkaXJ0eSAgICA9IGRpcnR5IHx8IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGRpcnR5KSB0aGlzLl9pbnZhbGlkYXRlZCB8PSA0MDk1O1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIGN1cnJlbnQgc2NhbGUuXG4gKlxuICogQG1ldGhvZCBnZXRTY2FsZVxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IHNjYWxlXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0U2NhbGUgPSBmdW5jdGlvbiBnZXRTY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmVjdG9ycy5zY2FsZTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgZnVuY3Rpb25zIHRvIGJlIGNhbGxlZCBvbiB0aGUgVHJhbnNmb3JtJ3MgZXZlbnRzLlxuICpcbiAqIEBtZXRob2Qgb25cbiAqIEBjaGFpbmFibGVcbiAqXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbigpIHtcbiAgICB0aGlzLl9JTy5vbi5hcHBseSh0aGlzLl9JTywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUudG9PcmlnaW4gPSBmdW5jdGlvbiB0b09yaWdpbigpIHtcbiAgICB0aGlzLnNldFRyYW5zbGF0aW9uKDAsIDAsIDApO1xuICAgIHRoaXMuc2V0Um90YXRpb24oMCwgMCwgMCk7XG4gICAgdGhpcy5zZXRTY2FsZSgxLCAxLCAxKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5ICAgICAgICAgPSByZXF1aXJlKCcuL0VudGl0eScpO1xudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9FbnRpdHlSZWdpc3RyeScpO1xudmFyIENvbnRhaW5lciAgICAgID0gcmVxdWlyZSgnLi9Db21wb25lbnRzL0NvbnRhaW5lcicpO1xudmFyIENhbWVyYSAgICAgICAgID0gcmVxdWlyZSgnLi9Db21wb25lbnRzL0NhbWVyYScpO1xuXG4vKipcbiAqIENvbnRleHQgaXMgdGhlIGRlZmluaXRpb24gb2Ygd29ybGQgc3BhY2UgZm9yIHRoYXQgcGFydCBvZiB0aGUgc2NlbmUgZ3JhcGguXG4gKiAgIEEgY29udGV4dCBjYW4gZWl0aGVyIGhhdmUgYSBDb250YWluZXIgb3Igbm90LiAgSGF2aW5nIGEgY29udGFpbmVyIG1lYW5zXG4gKiAgIHRoYXQgcGFydHMgb2YgdGhlIHNjZW5lIGdyYXBoIGNhbiBiZSBkcmF3biBpbnNpZGUgb2YgaXQuICBJZiBpdCBkb2VzIG5vdFxuICogICBoYXZlIGEgQ29udGFpbmVyIHRoZW4gdGhlIENvbnRleHQgaXMgb25seSByZXNwb25zaWJsZSBmb3IgZGVmaW5pbmcgd29ybGRcbiAqICAgc3BhY2UuICBUaGUgQ29yZVN5c3RlbSB3aWxsIHN0YXJ0IGF0IGVhY2ggQ29udGV4dCBhbmQgcmVjdXJzaXZlIGRvd25cbiAqICAgdGhyb3VnaCB0aGVpciBjaGlsZHJlbiB0byB1cGRhdGUgZWFjaCBlbnRpdGl5J3MgVHJhbnNmb3JtLCBTaXplLFxuICogICBhbmQgT3BhY2l0eS5cbiAqXG4gKiBAY2xhc3MgQ29udGV4dFxuICogQGVudGl0eVxuICogQGNvbnN0cnVjdG9yXG4gKiAgIFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdGhlIHN0YXJ0aW5nIG9wdGlvbnMgZm9yIHRoZSBDb250ZXh0XG4gKiBAcGFyYW0ge0FycmF5fSBvcHRpb25zLnRyYW5zZm9ybSB0aGUgc3RhcnRpbmcgdHJhbnNmb3JtIG1hdHJpeFxuICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucy5zaXplIHRoZSBzdGFydGluZyBzaXplXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuaGFzQ29udGFpbmVyIHdoZXRoZXIgb3Igbm90IHRoZSBDb250ZXh0IGhhcyBhIENvbnRhaW5lclxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmhhc0NhbWVyYSB3aGV0aGVyIG9yIG5vdCB0aGUgQ29udGV4dCBoYXMgYSBDYW1lcmFcbiAqL1xuZnVuY3Rpb24gQ29udGV4dChvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zIHx8IHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JyB8fCAoIW9wdGlvbnMuc2l6ZSAmJiAhb3B0aW9ucy5wYXJlbnRFbCAmJiAhb3B0aW9ucy5jb250YWluZXIpKSB0aHJvdyBuZXcgRXJyb3IoJ0NvbnRleHQsIG11c3QgYmUgY2FsbGVkIHdpdGggYW4gb3B0aW9uIGhhc2ggdGhhdCBhdCBsZWFzdCBoYXMgYSBzaXplIG9yIGEgcGFyZW50RWwgb3IgYSBjb250YWluZXIgcHJvcGVydHknKTtcbiAgICBFbnRpdHkuY2FsbCh0aGlzKTtcbiAgICBFbnRpdHlSZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCAnQ29udGV4dHMnKTtcbiAgICB0aGlzLl9yb290SUQgPSB0aGlzLl9pZDtcbiAgICB0aGlzLl9wYXJlbnRFbCA9IG9wdGlvbnMucGFyZW50RWw7XG4gICAgdGhpcy5fc2l6ZSAgICAgPSBfZ2V0U2l6ZShvcHRpb25zKTtcbiAgICB0aGlzLl9jb21wb25lbnRzLnNpemUuc2V0UGl4ZWxzLmFwcGx5KHRoaXMuX2NvbXBvbmVudHMuc2l6ZSwgdGhpcy5fc2l6ZSk7XG4gICAgdGhpcy5fY29tcG9uZW50cy5vcGFjaXR5LnNldC5jYWxsKHRoaXMuX2NvbXBvbmVudHMub3BhY2l0eSwgMSk7XG4gICAgdGhpcy5fY29tcG9uZW50cy50cmFuc2Zvcm0uX3VwZGF0ZSgoMSA8PCAxNikgLSAxLCBvcHRpb25zLnRyYW5zZm9ybSk7XG4gICAgaWYgKG9wdGlvbnMuaGFzQ29udGFpbmVyICE9PSBmYWxzZSkgdGhpcy5fY29tcG9uZW50cy5jb250YWluZXIgPSBuZXcgQ29udGFpbmVyKHRoaXMuX2lkLCBvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucy5oYXNDYW1lcmEgICAgIT09IGZhbHNlKSB0aGlzLl9jb21wb25lbnRzLmNhbWVyYSAgICA9IG5ldyBDYW1lcmEodGhpcywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQSBtZXRob2QgZm9yIGRldGVybWluaW5nIHdoYXQgdGhlIHNpemUgb2YgdGhlIENvbnRleHQgaXMuXG4gKiAgV2lsbCBiZSB0aGUgdXNlciBkZWZpbmVkIHNpemUgaWYgb25lIHdhcyBwcm92aWRlZCBvdGhlcndpc2UgaXRcbiAqICB3aWxsIGRlZmF1bHQgdG8gdGhlIERPTSByZXByZXNlbnRhdGlvbi4gIFxuICpcbiAqIEBtZXRob2QgX2dldFNpemVcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyBzdGFydGluZyBvcHRpb25zIGZvciB0aGUgc2l6ZXNcbiAqIEByZXR1cm4ge0FycmF5fSBzaXplIG9mIHRoZSBDb250ZXh0XG4gKi9cbmZ1bmN0aW9uIF9nZXRTaXplKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5zaXplKSAgICAgIHJldHVybiBvcHRpb25zLnNpemU7XG4gICAgaWYgKG9wdGlvbnMuY29udGFpbmVyKSByZXR1cm4gW29wdGlvbnMuY29udGFpbmVyLm9mZnNldFdpZHRoLCBvcHRpb25zLmNvbnRhaW5lci5vZmZzZXRIZWlnaHQsIDBdO1xuICAgIHJldHVybiBbb3B0aW9ucy5wYXJlbnRFbC5vZmZzZXRXaWR0aCwgb3B0aW9ucy5wYXJlbnRFbC5vZmZzZXRIZWlnaHQsIDBdO1xufVxuXG5Db250ZXh0LnByb3RvdHlwZSAgICAgICAgICAgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZShFbnRpdHkucHJvdG90eXBlKTtcbkNvbnRleHQucHJvdG90eXBlLmNvbnN0cnVjdG9yICAgICAgICAgPSBDb250ZXh0O1xuQ29udGV4dC5wcm90b3R5cGUudXBkYXRlICAgICAgICAgICAgICA9IG51bGw7XG5Db250ZXh0LnByb3RvdHlwZS5yZWdpc3RlckNvbXBvbmVudCAgID0gbnVsbDtcbkNvbnRleHQucHJvdG90eXBlLmRlcmVnaXN0ZXJDb21wb25lbnQgPSBudWxsO1xuQ29udGV4dC5wcm90b3R5cGUuYWRkQ29tcG9uZW50ICAgICAgICA9IG51bGw7XG5Db250ZXh0LnByb3RvdHlwZS5yZW1vdmVDb21wb25lbnQgICAgID0gbnVsbDtcbkNvbnRleHQucHJvdG90eXBlLmdldFZpZXdwb3J0U2l6ZSAgICAgPSBmdW5jdGlvbiBnZXRWaWV3cG9ydFNpemUoKSB7XG4gICAgaWYgKHRoaXMuX2NvbXBvbmVudHMuY29udGFpbmVyKSByZXR1cm4gdGhpcy5fY29tcG9uZW50cy5jb250YWluZXIuZ2V0U2l6ZSgpO1xuICAgIHJldHVybiB0aGlzLmdldFNpemUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGV4dDtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICogICAgICAgICBcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENvcmVTeXN0ZW0gICAgID0gcmVxdWlyZSgnLi9TeXN0ZW1zL0NvcmVTeXN0ZW0nKSxcbiAgICBPcHRpb25zTWFuYWdlciA9IHJlcXVpcmUoJy4vT3B0aW9uc01hbmFnZXInKSxcbiAgICBET01yZW5kZXJlciAgICA9IHJlcXVpcmUoJy4vUmVuZGVyZXJzL0RPTXJlbmRlcmVyJyksXG4gICAgR0xyZW5kZXJlciAgICAgPSByZXF1aXJlKCcuL1JlbmRlcmVycy9XZWJHTFJlbmRlcmVyJyksXG4gICAgUmVuZGVyU3lzdGVtICAgPSByZXF1aXJlKCcuL1N5c3RlbXMvUmVuZGVyU3lzdGVtJyksXG4gICAgQmVoYXZpb3JTeXN0ZW0gPSByZXF1aXJlKCcuL1N5c3RlbXMvQmVoYXZpb3JTeXN0ZW0nKSxcbiAgICBUaW1lU3lzdGVtICAgICA9IHJlcXVpcmUoJy4vU3lzdGVtcy9UaW1lU3lzdGVtJyksXG4gICAgTGlmdFN5c3RlbSAgICAgPSByZXF1aXJlKCcuLi90cmFuc2l0aW9ucy9MaWZ0U3lzdGVtJyksXG4gICAgUGh5c2ljc1N5c3RlbSAgPSByZXF1aXJlKCcuLi9waHlzaWNzL1BoeXNpY3NTeXN0ZW0nKSxcbiAgICBDb250ZXh0ICAgICAgICA9IHJlcXVpcmUoJy4vQ29udGV4dCcpO1xuXG5yZXF1aXJlKCcuL1N0eWxlc2hlZXQvZmFtb3VzLmNzcycpO1xuXG52YXIgb3B0aW9ucyA9IHtcbiAgICBsb29wICAgICAgOiB0cnVlLFxuICAgIGRpcmVjdGlvbiA6IDEsXG4gICAgc3BlZWQgICAgIDogMSxcbiAgICByZW5kZXJpbmcgOiB7XG4gICAgICAgIHJlbmRlcmVyczoge1xuICAgICAgICAgICAgRE9NOiBET01yZW5kZXJlcixcbiAgICAgICAgICAgIEdMOiBHTHJlbmRlcmVyXG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBUT0RPOiB3aGF0IGlzIHRoaXMgZG9pbmcgaGVyZT9cbmRvY3VtZW50Lm9udG91Y2htb3ZlID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vLyBTdGF0ZVxudmFyIExPT1AgICAgICAgICAgICAgICAgID0gJ2xvb3AnLFxuICAgIFJFTkRFUklORyAgICAgICAgICAgID0gJ3JlbmRlcmluZycsXG4gICAgb3B0aW9uc01hbmFnZXIgICAgICAgPSBuZXcgT3B0aW9uc01hbmFnZXIob3B0aW9ucyksXG4gICAgc3lzdGVtcyAgICAgICAgICAgICAgPSBbUmVuZGVyU3lzdGVtLCBCZWhhdmlvclN5c3RlbSwgTGlmdFN5c3RlbSwgQ29yZVN5c3RlbSwgUGh5c2ljc1N5c3RlbSwgVGltZVN5c3RlbV0sIC8vIFdlJ3JlIGdvaW5nIGJhY2t3YXJkc1xuICAgIGN1cnJlbnRSZWxhdGl2ZUZyYW1lID0gMCxcbiAgICBjdXJyZW50QWJzb2x1dGVGcmFtZSA9IDA7XG5cbmZ1bmN0aW9uIHNldFJlbmRlcmVycyhyZW5kZXJlcnMpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gcmVuZGVyZXJzKSB7XG4gICAgICAgIFJlbmRlclN5c3RlbS5yZWdpc3RlcihrZXksIHJlbmRlcmVyc1trZXldKTtcbiAgICB9XG59XG5cbnNldFJlbmRlcmVycyhvcHRpb25zLnJlbmRlcmluZy5yZW5kZXJlcnMpO1xuXG5vcHRpb25zTWFuYWdlci5vbignY2hhbmdlJywgZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmIChkYXRhLmlkID09PSBMT09QKSB7XG4gICAgICAgIGlmIChkYXRhLnZhbHVlKSB7XG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoRW5naW5lLmxvb3ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChkYXRhLmlkID09PSBSRU5ERVJJTkcpIHtcbiAgICAgICAgc2V0UmVuZGVyZXJzKGRhdGEudmFsdWUucmVuZGVyZXJzKTtcbiAgICB9XG59KTtcblxuLyoqXG4gKiBUaGUgc2luZ2xldG9uIG9iamVjdCBpbml0aWF0ZWQgdXBvbiBwcm9jZXNzXG4gKiAgIHN0YXJ0dXAgd2hpY2ggbWFuYWdlcyBhbGwgYWN0aXZlIFN5c3RlbXMgYW5kIGFjdHMgYXMgYVxuICogICBmYWN0b3J5IGZvciBuZXcgQ29udGV4dHMvXG4gKlxuICogICBPbiBzdGF0aWMgaW5pdGlhbGl6YXRpb24sIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgaXMgY2FsbGVkIHdpdGhcbiAqICAgICB0aGUgZXZlbnQgbG9vcCBmdW5jdGlvbi5cbiAqICAgICBcbiAqIEBjbGFzcyBFbmdpbmVcbiAqIEBzaW5nbGV0b25cbiAqL1xudmFyIEVuZ2luZSA9IHt9O1xuXG4vKipcbiAqIENhbGxzIHVwZGF0ZSBvbiBlYWNoIG9mIHRoZSBjdXJyZW50bHkgcmVnaXN0ZXJlZCBzeXN0ZW1zLlxuICogXG4gKiBAbWV0aG9kIHN0ZXBcbiAqL1xuRW5naW5lLnN0ZXAgPSBmdW5jdGlvbiBzdGVwKHRpbWVzdGFtcCkge1xuICAgIGN1cnJlbnRSZWxhdGl2ZUZyYW1lICs9IG9wdGlvbnMuZGlyZWN0aW9uICogb3B0aW9ucy5zcGVlZDtcbiAgICBjdXJyZW50QWJzb2x1dGVGcmFtZSsrO1xuICAgIHZhciBpID0gc3lzdGVtcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgc3lzdGVtc1tpXS51cGRhdGUodGltZXN0YW1wLCBjdXJyZW50UmVsYXRpdmVGcmFtZSwgY3VycmVudEFic29sdXRlRnJhbWUpOy8vIEkgdG9sZCB5b3Ugc29cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgdGhhdCB3aWxsIHN0ZXAgXG4gKiBcbiAqIEBtZXRob2QgbG9vcFxuICovXG5FbmdpbmUubG9vcCA9IGZ1bmN0aW9uIGxvb3AodGltZXN0YW1wKSB7XG4gICAgaWYgKG9wdGlvbnMubG9vcCkge1xuICAgICAgICBFbmdpbmUuc3RlcCh0aW1lc3RhbXApO1xuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoRW5naW5lLmxvb3ApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uIF9sb29wRm9yKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRpbWVzdGFtcCkge1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIEVuZ2luZS5zdGVwKHRpbWVzdGFtcCk7XG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoX2xvb3BGb3IodmFsdWUgLSAxKSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5FbmdpbmUubG9vcEZvciA9IGZ1bmN0aW9uIGxvb3BGb3IodmFsdWUpIHtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoX2xvb3BGb3IodmFsdWUpKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQSB3cmFwcGVyIGZvciB0aGUgXCJET01Db250ZW50TG9hZGVkXCIgZXZlbnQuICBXaWxsIGV4ZWN1dGVcbiAqICAgYSBnaXZlbiBmdW5jdGlvbiBvbmNlIHRoZSBET00gaGF2ZSBiZWVuIGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kIHJlYWR5XG4gKiBcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBGdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgRE9NIGxvYWRpbmdcbiAqL1xuRW5naW5lLnJlYWR5ID0gZnVuY3Rpb24gcmVhZHkoZm4pIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGxpc3RlbmVyKTtcbiAgICAgICAgZm4oKTtcbiAgICB9O1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBsaXN0ZW5lcik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdpbGwgY3JlYXRlIGEgYnJhbmQgbmV3IENvbnRleHQuICBJRiBhIHBhcmVudCBlbGVtZW50IGlzIG5vdCBwcm92aWRlZCxcbiAqICAgaXQgaXMgYXNzdW1lZCB0byBiZSB0aGUgYm9keSBvZiB0aGUgZG9jdW1lbnQuXG4gKlxuICogQG1ldGhvZCBjcmVhdGVDb250ZXh0XG4gKiBcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyBPcHRpb25zIGZvciB0aGUgQ29udGV4dFxuICogQHJldHVybiB7Q29udGV4dH0gbmV3IENvbnRleHQgaW5zdGFuY2VcbiAqL1xuRW5naW5lLmNyZWF0ZUNvbnRleHQgPSBmdW5jdGlvbiBjcmVhdGVDb250ZXh0KG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBlbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihvcHRpb25zKTtcbiAgICAgICAgaWYgKCEoZWxlbSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSkgdGhyb3cgbmV3IEVycm9yKCd0aGUgcGFzc2VkIGluIHN0cmluZyBzaG91bGQgYmUgYSBxdWVyeSBzZWxlY3RvciB3aGljaCByZXR1cm5zIGFuIGVsZW1lbnQgZnJvbSB0aGUgZG9tJyk7XG4gICAgICAgIGVsc2UgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh7cGFyZW50RWw6IGVsZW19KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucyBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KVxuICAgICAgICByZXR1cm4gbmV3IENvbnRleHQoe3BhcmVudEVsOiBvcHRpb25zfSk7XG5cbiAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh7cGFyZW50RWw6IGRvY3VtZW50LmJvZHl9KTsgLy8gVE9ETyBpdCBzaG91bGQgYmUgcG9zc2libGUgdG8gZGVsYXkgYXNzaWduaW5nIGRvY3VtZW50LmJvZHkgdW50aWwgdGhpcyBoaXRzIHRoZSByZW5kZXIgc3RhZ2UuIFRoaXMgd291bGQgcmVtb3ZlIHRoZSBuZWVkIGZvciBFbmdpbmUucmVhZHlcblxuICAgIGlmICghb3B0aW9ucy5wYXJlbnRFbCAmJiAhb3B0aW9ucy5jb250YWluZXIpXG4gICAgICAgIG9wdGlvbnMucGFyZW50RWwgPSBkb2N1bWVudC5ib2R5O1xuXG4gICAgcmV0dXJuIG5ldyBDb250ZXh0KG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgc3lzdGVtIHRvIHRoZSBsaXN0IG9mIHN5c3RlbXMgdG8gdXBkYXRlIG9uIGEgcGVyIGZyYW1lIGJhc2lzXG4gKlxuICogQG1ldGhvZCBhZGRTeXN0ZW1cbiAqIFxuICogQHBhcmFtIHtTeXN0ZW19IHN5c3RlbSBTeXN0ZW0gdG8gZ2V0IHJ1biBldmVyeSBmcmFtZVxuICovXG5FbmdpbmUuYWRkU3lzdGVtID0gZnVuY3Rpb24gYWRkU3lzdGVtKHN5c3RlbSkge1xuICAgIGlmIChzeXN0ZW0gaW5zdGFuY2VvZiBPYmplY3QgJiYgc3lzdGVtLnVwZGF0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgICAgICByZXR1cm4gc3lzdGVtcy5zcGxpY2Uoc3lzdGVtcy5pbmRleE9mKFJlbmRlclN5c3RlbSkgKyAxLCAwLCBzeXN0ZW0pO1xuICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCdzeXN0ZW1zIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggYW4gdXBkYXRlIG1ldGhvZCcpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgc3lzdGVtIGZyb20gdGhlIGxpc3Qgb2Ygc3lzdGVtcyB0byB1cGRhdGUgb24gYSBwZXIgZnJhbWUgYmFzaXNcbiAqXG4gKiBAbWV0aG9kIHJlbW92ZVN5c3RlbVxuICogXG4gKiBAcGFyYW0ge1N5c3RlbX0gc3lzdGVtIFN5c3RlbSB0byBnZXQgcnVuIGV2ZXJ5IGZyYW1lXG4gKi9cbkVuZ2luZS5yZW1vdmVTeXN0ZW0gPSBmdW5jdGlvbiByZW1vdmVTeXN0ZW0oc3lzdGVtKSB7XG4gICAgaWYgKHN5c3RlbSBpbnN0YW5jZW9mIE9iamVjdCAmJiBzeXN0ZW0udXBkYXRlIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIGluZGV4ID0gc3lzdGVtcy5pbmRleE9mKHN5c3RlbSk7XG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgc3lzdGVtcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKCdzeXN0ZW1zIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggYW4gdXBkYXRlIG1ldGhvZCcpO1xufTtcblxuLyoqXG4gKiBEZWxlZ2F0ZSB0byB0aGUgb3B0aW9uc01hbmFnZXIuXG4gKlxuICogQG1ldGhvZCBzZXRPcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE9wdGlvbnMgdG8gcGF0Y2hcbiAqL1xuRW5naW5lLnNldE9wdGlvbnMgPSBvcHRpb25zTWFuYWdlci5zZXRPcHRpb25zLmJpbmQob3B0aW9uc01hbmFnZXIpO1xuXG4vKipcbiAqIFNldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBmbG93IG9mIHRpbWUuXG4gKlxuICogQG1ldGhvZCBzZXREaXJlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbCBkaXJlY3Rpb24gYXMgLTEgb3IgMVxuICovXG5FbmdpbmUuc2V0RGlyZWN0aW9uID0gZnVuY3Rpb24gc2V0RGlyZWN0aW9uKHZhbCkge1xuICAgIGlmICh2YWwgIT09IDEgJiYgdmFsICE9PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdkaXJlY3Rpb24gbXVzdCBiZSBlaXRoZXIgMSBmb3IgZm9yd2FyZCBvciAtMSBmb3IgcmV2ZXJzZScpO1xuICAgIG9wdGlvbnNNYW5hZ2VyLnNldCgnZGlyZWN0aW9uJywgdmFsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGZsb3cgb2YgdGltZS5cbiAqXG4gKiBAbWV0aG9kIGdldERpcmVjdGlvblxuICogXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGRpcmVjdGlvbiBhcyAtMSBvciAxXG4gKi9cbkVuZ2luZS5nZXREaXJlY3Rpb24gPSBmdW5jdGlvbiBnZXREaXJlY3Rpb24oKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZGlyZWN0aW9uO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIHNwZWVkIG9mIHRpbWUuXG4gKlxuICogQG1ldGhvZCBzZXRTcGVlZFxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsIHJhdGlvIHRvIGh1bWFuIHRpbWVcbiAqL1xuRW5naW5lLnNldFNwZWVkID0gZnVuY3Rpb24gc2V0U3BlZWQodmFsKSB7XG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdudW1iZXInKSB0aHJvdyBuZXcgRXJyb3IoJ3NwZWVkIG11c3QgYmUgYSBudW1iZXIsIHVzZWQgYXMgYSBzY2FsZSBmYWN0b3IgZm9yIHRoZSBtb3ZlbWVudCBvZiB0aW1lJyk7XG4gICAgb3B0aW9uc01hbmFnZXIuc2V0KCdzcGVlZCcsIHZhbCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgc3BlZWQgb2YgdGltZS5cbiAqXG4gKiBAbWV0aG9kIGdldFNwZWVkXG4gKiBcbiAqIEByZXR1cm4ge051bWJlcn0gdmFsIHJhdGlvIHRvIGh1bWFuIHRpbWVcbiAqL1xuRW5naW5lLmdldFNwZWVkID0gZnVuY3Rpb24gZ2V0U3BlZWQoKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuc3BlZWQ7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCBmcmFtZVxuICpcbiAqIEBtZXRob2QgZ2V0QWJzb2x1dGVGcmFtZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGN1cnJlbnQgZnJhbWUgbnVtYmVyXG4gKi9cbkVuZ2luZS5nZXRBYnNvbHV0ZUZyYW1lID0gZnVuY3Rpb24gZ2V0QWJzb2x1dGVGcmFtZSgpIHtcbiAgICByZXR1cm4gY3VycmVudEFic29sdXRlRnJhbWU7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCBmcmFtZSB0YWtpbmcgaW50byBhY2NvdW50IGVuZ2luZSBzcGVlZCBhbmQgZGlyZWN0aW9uXG4gKlxuICogQG1ldGhvZCBnZXRSZWxhdGl2ZUZyYW1lXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgY3VycmVudCBmcmFtZSBudW1iZXIgdGFraW5nIGludG8gYWNjb3VudCBFbmdpbmUgc3BlZWQgYW5kIGRpcmVjdGlvblxuICovXG5FbmdpbmUuZ2V0UmVsYXRpdmVGcmFtZSA9IGZ1bmN0aW9uIGdldFJlbGF0aXZlRnJhbWUoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRSZWxhdGl2ZUZyYW1lO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbmdpbmU7XG5cbi8vU3RhcnQgdGhlIGxvb3BcbkVuZ2luZS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoRW5naW5lLmxvb3ApO1xufSk7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqICAgICAgICAgXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4vRW50aXR5UmVnaXN0cnknKSxcbiAgICBUcmFuc2Zvcm0gICAgICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50cy9UcmFuc2Zvcm0nKSxcbiAgICBTaXplICAgICAgICAgICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50cy9TaXplJyksXG4gICAgT3BhY2l0eSAgICAgICAgPSByZXF1aXJlKCcuL0NvbXBvbmVudHMvT3BhY2l0eScpO1xuXG4vKipcbiAqIEVudGl0eSBpcyB0aGUgY29yZSBvZiB0aGUgRmFtby51cyBzY2VuZSBncmFwaC4gIFRoZSBzY2VuZSBncmFwaFxuICogICBpcyBjb25zdHJ1Y3RlZCBieSBhZGRpbmcgRW50aXR5cyB0byBvdGhlciBFbnRpdGllcyB0byBkZWZpbmUgaGVpcmFyY2h5LlxuICogICBFYWNoIEVudGl0eSBjb21lcyB3aXRoIGEgVHJhbnNmb3JtIGNvbXBvbmVudCB3aXRoIHRoZVxuICogICBhYmlsaXR5IHRvIGFkZCBpbmZpbml0ZSBvdGhlciBjb21wb25lbnRzLiAgSXQgYWxzbyBhY3RzIGFzIGEgZmFjdG9yeSBieSBjcmVhdGluZ1xuICogICBuZXcgRW50aXRpZXMgdGhhdCB3aWxsIGFscmVhZHkgYmUgY29uc2lkZXJlZCBpdCdzIGNoaWxkcmVuLlxuICpcbiAqIEBjbGFzcyBFbnRpdHlcbiAqIEBlbnRpdHlcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBFbnRpdHkoKSB7XG4gICAgRW50aXR5UmVnaXN0cnkucmVnaXN0ZXIodGhpcywgJ0NvcmVTeXN0ZW0nKTtcblxuICAgIHRoaXMuX2NvbXBvbmVudHMgPSB7XG4gICAgICAgIHRyYW5zZm9ybSA6IG5ldyBUcmFuc2Zvcm0odGhpcy5faWQpLFxuICAgICAgICBzaXplICAgICAgOiBuZXcgU2l6ZSh0aGlzLl9pZCksXG4gICAgICAgIG9wYWNpdHkgICA6IG5ldyBPcGFjaXR5KHRoaXMuX2lkKVxuICAgIH07XG5cbiAgICB0aGlzLl9iZWhhdmlvcnMgPSBbXTtcblxuICAgIHRoaXMuX3BhcmVudElEICAgPSBudWxsO1xuICAgIHRoaXMuX3Jvb3RJRCAgICAgPSBudWxsO1xuXG4gICAgdGhpcy5fY2hpbGRyZW5JRHMgPSBbXTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgbmV3IGluc3RhbmNlIG9mIGEgY29tcG9uZW50IHRvIHRoZSBFbnRpdHkuXG4gKlxuICogQG1ldGhvZCAgcmVnaXN0ZXJDb21wb25lbnRcbiAqIFxuICogQHBhcmFtICB7RnVuY3Rpb259IENvbnN0cnVjdG9yIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBhIGNvbXBvbmVudFxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIG9wdGlvbnMgdG8gYmUgcGFzc2VkIGludG8gdGhlIGNvbnN0cnVjdG9yXG4gKiBAcmV0dXJuIHtPYmplY3R9IGluc3RhbmNlIG9mIHRoZSBpbnN0YW50aXRhdGVkIGNvbXBvbmVudFxuICovXG5cbkVudGl0eS5wcm90b3R5cGUucmVnaXN0ZXJDb21wb25lbnQgPSBmdW5jdGlvbiByZWdpc3RlckNvbXBvbmVudChDb25zdHJ1Y3Rvciwgb3B0aW9ucykge1xuICAgIGlmICghQ29uc3RydWN0b3IgfHwgIShDb25zdHJ1Y3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgdGhyb3cgbmV3IEVycm9yKCdUaGUgZmlyc3QgYXJndW1lbnQgdG8gLnJlZ2lzdGVyQ29tcG9uZW50IG11c3QgYmUgYSBjb21wb25lbnQgQ29uc3RydWN0b3IgZnVuY3Rpb24nKTtcbiAgICBpZiAoIUNvbnN0cnVjdG9yLnRvU3RyaW5nKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIHBhc3NlZC1pbiBjb21wb25lbnQgQ29uc3RydWN0b3IgbXVzdCBoYXZlIGEgXCJ0b1N0cmluZ1wiIG1ldGhvZC4nKTtcblxuICAgIHZhciBjb21wb25lbnQgPSBuZXcgQ29uc3RydWN0b3IodGhpcy5faWQsIG9wdGlvbnMpO1xuICAgIGlmIChjb21wb25lbnQudXBkYXRlKSB0aGlzLl9iZWhhdmlvcnMucHVzaChDb25zdHJ1Y3Rvci50b1N0cmluZygpKTtcbiAgICB0aGlzLl9jb21wb25lbnRzW0NvbnN0cnVjdG9yLnRvU3RyaW5nKCldID0gY29tcG9uZW50O1xuICAgIHJldHVybiBjb21wb25lbnQ7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciByZWdpc3RlckNvbXBvbmVudFxuICogXG4gKiBAbWV0aG9kIGFkZENvbXBvbmVudFxuICovXG5FbnRpdHkucHJvdG90eXBlLmFkZENvbXBvbmVudCA9IEVudGl0eS5wcm90b3R5cGUucmVnaXN0ZXJDb21wb25lbnQ7XG5cbi8qKlxuICogUmVtb3ZlcyBhIGNvbXBvbmVudCBmcm9tIHRoZSBFbnRpdHkuXG4gKlxuICogQG1ldGhvZCBkZXJlZ2lzdGVyQ29tcG9uZW50XG4gKiBcbiAqIEBwYXJhbSAge1N0cmluZ30gdHlwZSBpZCBvZiB0aGUgY29tcG9uZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufSBzdGF0dXMgb2YgdGhlIHJlbW92YWxcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5kZXJlZ2lzdGVyQ29tcG9uZW50ID0gZnVuY3Rpb24gZGVyZWdpc3RlckNvbXBvbmVudCh0eXBlKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdFbnRpdHkuZGVyZWdpc3RlckNvbXBvbmVudCBtdXN0IGJlIHBhc3NlZCBhIFN0cmluZyBhcyB0aGUgZmlyc3QgcGFyYW1ldGVyJyk7XG4gICAgaWYgKHRoaXMuX2NvbXBvbmVudHNbdHlwZV0gPT09IHVuZGVmaW5lZCB8fCB0aGlzLl9jb21wb25lbnRzW3R5cGVdID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ25vIGNvbXBvbmVudCBvZiB0aGF0IHR5cGUnKTtcblxuICAgIHRoaXMuX2NvbXBvbmVudHNbdHlwZV0uY2xlYW51cCAmJiB0aGlzLl9jb21wb25lbnRzW3R5cGVdLmNsZWFudXAoKTtcbiAgICB0aGlzLl9jb21wb25lbnRzW3R5cGVdID0gbnVsbDtcblxuICAgIHZhciBiZWhhdmlvckluZGV4ID0gdGhpcy5fYmVoYXZpb3JzLmluZGV4T2YodHlwZSk7XG4gICAgaWYgKGJlaGF2aW9ySW5kZXggPiAtMSlcbiAgICAgICAgdGhpcy5fYmVoYXZpb3JzLnNwbGljZShiZWhhdmlvckluZGV4LCAxKTtcblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgZGVyZWdpc3RlckNvbXBvbmVudFxuICogXG4gKiBAbWV0aG9kIHJlbW92ZUNvbXBvbmVudFxuICovXG5FbnRpdHkucHJvdG90eXBlLnJlbW92ZUNvbXBvbmVudCA9IEVudGl0eS5wcm90b3R5cGUuZGVyZWdpc3RlckNvbXBvbmVudDtcblxuLyoqXG4gKiBGaW5kIG91dCBpZiB0aGUgRW50aXR5IGhhcyBhIGNvbXBvbmVudCBvZiBhIGNlcnRhaW4gbmFtZS5cbiAqXG4gKiBAbWV0aG9kIGhhc0NvbXBvbmVudFxuICogXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHR5cGUgbmFtZSBvZiB0aGUgY29tcG9uZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufSBleGlzdGFuY2Ugb2YgYSBjb21wb25lbnQgYnkgdGhhdCBuYW1lXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuaGFzQ29tcG9uZW50ID0gZnVuY3Rpb24gaGFzQ29tcG9uZW50KHR5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50c1t0eXBlXSAhPSBudWxsO1xufTtcblxuLyoqXG4gKiBHZXQgYSBjb21wb25lbnQgYnkgbmFtZVxuICpcbiAqIEBtZXRob2QgZ2V0Q29tcG9uZW50XG4gKiBcbiAqIEBwYXJhbSAge1N0cmluZ30gdHlwZSBuYW1lIG9mIHRoZSBjb21wb25lbnRcbiAqIEByZXR1cm4ge09iamVjdH0gY29tcG9uZW50IGluc3RhbmNlXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuZ2V0Q29tcG9uZW50ID0gZnVuY3Rpb24gZ2V0Q29tcG9uZW50KHR5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50c1t0eXBlXTtcbn07XG5cbi8qKlxuICogR2V0IGFsbCBvZiB0aGUgRW50aXR5J3MgY29tcG9uZW50c1xuICpcbiAqIEBtZXRob2QgZ2V0QWxsQ29tcG9uZW50c1xuICogXG4gKiBAcmV0dXJuIHtPYmplY3R9IEhhc2ggb2YgYWxsIG9mIHRoZSBjb21wb25lbnRzIGluZGV4ZWQgYnkgbmFtZSBcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5nZXRBbGxDb21wb25lbnRzID0gZnVuY3Rpb24gZ2V0QWxsQ29tcG9uZW50cygpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50cztcbn07XG5cbi8qKlxuICogR2V0IGFsbCBvZiB0aGUgY2hpbGQgbm9kZXMgaW4gdGhlIHNjZW5lIGdyYXBoXG4gKlxuICogQG1ldGhvZCAgZ2V0Q2hpbGRyZW5cbiAqIFxuICogQHJldHVybiB7QXJyYXl9IGNoaWxkIGVudGl0aWVzXG4gKi9cbkVudGl0eS5wcm90b3R5cGUuZ2V0Q2hpbGRyZW4gPSBmdW5jdGlvbiBnZXRDaGlsZHJlbigpIHtcbiAgICB2YXIgZGVyZWZlcmVuY2VkQ2hpbGRyZW4gPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2hpbGRyZW5JRHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5KHRoaXMuX2NoaWxkcmVuSURzW2ldKTtcbiAgICAgICAgZGVyZWZlcmVuY2VkQ2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlcmVmZXJlbmNlZENoaWxkcmVuO1xufTtcblxuRW50aXR5LnByb3RvdHlwZS5nZXRQYXJlbnQgPSBmdW5jdGlvbiBnZXRQYXJlbnQoKSB7XG4gICAgcmV0dXJuIEVudGl0eVJlZ2lzdHJ5LmdldEVudGl0eSh0aGlzLl9wYXJlbnRJRCk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY29udGV4dCBvZiB0aGUgbm9kZS5cbiAqXG4gKiBAbWV0aG9kIGdldENvbnRleHRcbiAqXG4gKiBAcmV0dXJuIENvbnRleHQgTm9kZVxuICovXG5FbnRpdHkucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbiBnZXRDb250ZXh0KCkge1xuICAgIHJldHVybiBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkodGhpcy5fcm9vdElEKTtcbn07XG5cbi8qKlxuICogQWRkIGEgbmV3IEVudGl0eSBhcyBhIGNoaWxkIGFuZCByZXR1cm4gaXQuXG4gKlxuICogQG1ldGhvZCBhZGRDaGlsZFxuICpcbiAqIEByZXR1cm4ge0VudGl0eX0gY2hpbGQgRW50aXR5XG4gKi9cbkVudGl0eS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbiBhZGRDaGlsZChlbnRpdHkpIHtcbiAgICBpZiAoZW50aXR5ICE9IG51bGwgJiYgIShlbnRpdHkgaW5zdGFuY2VvZiBFbnRpdHkpKSB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgRW50aXRpZXMgY2FuIGJlIGFkZGVkIGFzIGNoaWxkcmVuIG9mIG90aGVyIGVudGl0aWVzJyk7XG4gICAgaWYgKGVudGl0eSkge1xuICAgICAgICB2YXIgaWQgPSBlbnRpdHkuX2lkO1xuICAgICAgICBpZiAodGhpcy5fY2hpbGRyZW5JRHMuaW5kZXhPZihpZCkgPiAtMSkgcmV0dXJuIHZvaWQgMDtcbiAgICAgICAgaWYgKGVudGl0eS5fcGFyZW50SUQgIT0gbnVsbCkgZW50aXR5LmdldFBhcmVudCgpLmRldGF0Y2hDaGlsZChlbnRpdHkpO1xuICAgICAgICBlbnRpdHkuX3BhcmVudElEID0gdGhpcy5faWQ7XG4gICAgICAgIF91cGRhdGVDaGlsZFJvb3QoZW50aXR5LCB0aGlzLl9yb290SUQpO1xuICAgICAgICB0aGlzLl9jaGlsZHJlbklEcy5wdXNoKGlkKTtcbiAgICAgICAgZW50aXR5LmdldENvbXBvbmVudCgndHJhbnNmb3JtJykuaW52YWxpZGF0aW9ucyB8PSAoMSA8PCAxNikgLSAxO1xuICAgICAgICByZXR1cm4gZW50aXR5O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBub2RlICAgICAgID0gbmV3IEVudGl0eSgpO1xuICAgICAgICBub2RlLl9wYXJlbnRJRCA9IHRoaXMuX2lkO1xuICAgICAgICBub2RlLl9yb290SUQgICA9IHRoaXMuX3Jvb3RJRDtcbiAgICAgICAgdGhpcy5fY2hpbGRyZW5JRHMucHVzaChub2RlLl9pZCk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIF91cGRhdGVDaGlsZFJvb3QoY2hpbGQsIHJvb3RJRCkge1xuICAgIGNoaWxkLl9yb290SUQgPSByb290SUQ7XG5cbiAgICB2YXIgZ3JhbmRDaGlsZHJlbiA9IGNoaWxkLmdldENoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBncmFuZENoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIF91cGRhdGVDaGlsZFJvb3QoZ3JhbmRDaGlsZHJlbltpXSwgcm9vdElEKVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFJlbW92ZSBhIEVudGl0eSdzIGNoaWxkLlxuICpcbiAqIEBtZXRob2QgZGV0YXRjaENoaWxkXG4gKlxuICogQHJldHVybiB7RW50aXR5fHZvaWQgMH0gY2hpbGQgRW50aXR5IG9yIHZvaWQgMCBpZiBpdCBpcyBub3QgYSBjaGlsZFxuICovXG5FbnRpdHkucHJvdG90eXBlLmRldGF0Y2hDaGlsZCA9IGZ1bmN0aW9uIGRldGF0Y2hDaGlsZChub2RlKSB7XG4gICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIEVudGl0eSkpIHRocm93IG5ldyBFcnJvcignRW50aXR5LmRldGF0Y2hDaGlsZCBvbmx5IHRha2VzIGluIEVudGl0aWVzIGFzIHRoZSBwYXJhbWV0ZXInKTtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9jaGlsZHJlbklEcy5pbmRleE9mKG5vZGUuX2lkKTtcbiAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICB0aGlzLl9jaGlsZHJlbklEcy5zcGxpY2UoaW5kZXgsIDEpWzBdO1xuICAgICAgICBub2RlLl9wYXJlbnRJRCA9IG51bGw7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0gZWxzZSByZXR1cm4gdm9pZCAwO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhpcyBFbnRpdHkgZnJvbSB0aGUgRW50aXR5UmVnaXN0cnlcbiAqXG4gKiBAbWV0aG9kIGNsZWFudXBcbiAqL1xuRW50aXR5LnByb3RvdHlwZS5jbGVhbnVwID0gZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICBFbnRpdHlSZWdpc3RyeS5jbGVhbnVwKHRoaXMpO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgYWxsIG9mIHRoZSBjdXN0b20gY29tcG9uZW50cyBvbiB0aGUgRW50aXR5XG4gKiBcbiAqIEBtZXRob2QgdXBkYXRlXG4gKi9cbkVudGl0eS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIHZhciBpID0gdGhpcy5fYmVoYXZpb3JzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pXG4gICAgICAgIHRoaXMuX2NvbXBvbmVudHNbdGhpcy5fYmVoYXZpb3JzW2ldXS51cGRhdGUodGhpcyk7XG59O1xuXG5cbnZhciBlbXB0eVZlY3RvciA9IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKTtcblxuZnVuY3Rpb24gX2dldFNpemUoZW50aXR5LCByZXN1bHQpIHtcbiAgICB2YXIgaSAgICAgID0gZW50aXR5Ll9jaGlsZHJlbklEcy5sZW5ndGgsXG4gICAgICAgIG1hdHJpeCA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3RyYW5zZm9ybScpLl9tYXRyaXg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IEVudGl0eVJlZ2lzdHJ5LmdldEVudGl0eShlbnRpdHkuX2NoaWxkcmVuSURzW2ldKTtcbiAgICAgICAgX2dldFNpemUoY2hpbGQsIHJlc3VsdCk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIGVudGl0eS5fY29tcG9uZW50cylcbiAgICAgICAgaWYgKGVudGl0eS5fY29tcG9uZW50c1trZXldLmdldFNpemUpIHtcblxuICAgICAgICAgICAgdmFyIHNpemUgICA9IGVudGl0eS5fY29tcG9uZW50c1trZXldLmdldFNpemUoKSxcbiAgICAgICAgICAgICAgICByaWdodCAgPSBzaXplLmRpc3BsYWNlbWVudC5yaWdodCAgKyBzaXplLm9yaWdpblswXSAtIHJlc3VsdC5vcmlnaW5bMF0sXG4gICAgICAgICAgICAgICAgYm90dG9tID0gc2l6ZS5kaXNwbGFjZW1lbnQuYm90dG9tICsgc2l6ZS5vcmlnaW5bMV0gLSByZXN1bHQub3JpZ2luWzFdLFxuICAgICAgICAgICAgICAgIG5lYXIgICA9IHNpemUuZGlzcGxhY2VtZW50Lm5lYXIgICArIHNpemUub3JpZ2luWzJdIC0gcmVzdWx0Lm9yaWdpblsyXSxcbiAgICAgICAgICAgICAgICBsZWZ0ICAgPSBzaXplLmRpc3BsYWNlbWVudC5sZWZ0ICAgKyBzaXplLm9yaWdpblswXSAtIHJlc3VsdC5vcmlnaW5bMF0sXG4gICAgICAgICAgICAgICAgdG9wICAgID0gc2l6ZS5kaXNwbGFjZW1lbnQudG9wICAgICsgc2l6ZS5vcmlnaW5bMV0gLSByZXN1bHQub3JpZ2luWzFdLFxuICAgICAgICAgICAgICAgIGZhciAgICA9IHNpemUuZGlzcGxhY2VtZW50LmZhciAgICArIHNpemUub3JpZ2luWzJdIC0gcmVzdWx0Lm9yaWdpblsyXTtcblxuICAgICAgICAgICAgaWYgKHJpZ2h0ICA+IHJlc3VsdC5kaXNwbGFjZW1lbnQucmlnaHQpICByZXN1bHQuZGlzcGxhY2VtZW50LnJpZ2h0ICA9IHJpZ2h0O1xuICAgICAgICAgICAgaWYgKGJvdHRvbSA+IHJlc3VsdC5kaXNwbGFjZW1lbnQuYm90dG9tKSByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSA9IGJvdHRvbTtcbiAgICAgICAgICAgIGlmIChuZWFyICAgPiByZXN1bHQuZGlzcGxhY2VtZW50Lm5lYXIpICAgcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyICAgPSBuZWFyO1xuICAgICAgICAgICAgaWYgKGxlZnQgICA8IHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCkgICByZXN1bHQuZGlzcGxhY2VtZW50LmxlZnQgICA9IGxlZnQ7XG4gICAgICAgICAgICBpZiAodG9wICAgIDwgcmVzdWx0LmRpc3BsYWNlbWVudC50b3ApICAgIHJlc3VsdC5kaXNwbGFjZW1lbnQudG9wICAgID0gdG9wO1xuICAgICAgICAgICAgaWYgKGZhciAgICA8IHJlc3VsdC5kaXNwbGFjZW1lbnQuZmFyKSAgICByZXN1bHQuZGlzcGxhY2VtZW50LmZhciAgICA9IGZhcjtcbiAgICAgICAgfVxuXG4gICAgdmFyIHggPSBtYXRyaXhbMTJdIC0gcmVzdWx0Lm9yaWdpblswXSwgeSA9IG1hdHJpeFsxM10gLSByZXN1bHQub3JpZ2luWzFdLCB6ID0gbWF0cml4WzE0XSAtIHJlc3VsdC5vcmlnaW5bMl07XG4gICAgaWYgKHggPiByZXN1bHQuZGlzcGxhY2VtZW50LnJpZ2h0KSAgcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCAgPSB4O1xuICAgIGlmICh4IDwgcmVzdWx0LmRpc3BsYWNlbWVudC5sZWZ0KSAgIHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCAgID0geDtcbiAgICBpZiAoeSA+IHJlc3VsdC5kaXNwbGFjZW1lbnQuYm90dG9tKSByZXN1bHQuZGlzcGxhY2VtZW50LmJvdHRvbSA9IHk7XG4gICAgaWYgKHkgPCByZXN1bHQuZGlzcGxhY2VtZW50LnRvcCkgICAgcmVzdWx0LmRpc3BsYWNlbWVudC50b3AgICAgPSB5O1xuICAgIGlmICh6ID4gcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyKSAgIHJlc3VsdC5kaXNwbGFjZW1lbnQubmVhciAgID0gejtcbiAgICBpZiAoeiA8IHJlc3VsdC5kaXNwbGFjZW1lbnQuZmFyKSAgICByZXN1bHQuZGlzcGxhY2VtZW50LmZhciAgICA9IHo7XG59XG5cbkVudGl0eS5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uIGdldFNpemUoKSB7XG4gICAgdmFyIG1hdHJpeCA9IHRoaXMuZ2V0Q29tcG9uZW50KCd0cmFuc2Zvcm0nKS5fbWF0cml4LFxuICAgICAgICBpICAgICAgPSB0aGlzLl9jaGlsZHJlbklEcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGRpc3BsYWNlbWVudDoge1xuICAgICAgICAgICAgICAgIHJpZ2h0ICA6IDAsXG4gICAgICAgICAgICAgICAgYm90dG9tIDogMCxcbiAgICAgICAgICAgICAgICBuZWFyICAgOiAwLFxuICAgICAgICAgICAgICAgIGxlZnQgICA6IDAsXG4gICAgICAgICAgICAgICAgdG9wICAgIDogMCxcbiAgICAgICAgICAgICAgICBmYXIgICAgOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JpZ2luOiBbbWF0cml4WzEyXSwgbWF0cml4WzEzXSwgbWF0cml4WzE0XV1cbiAgICB9O1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB2YXIgY2hpbGQgPSBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkodGhpcy5fY2hpbGRyZW5JRHNbaV0pO1xuICAgICAgICBfZ2V0U2l6ZShjaGlsZCwgcmVzdWx0KTtcbiAgICB9XG4gICAgcmVzdWx0LnNpemUgPSBbcmVzdWx0LmRpc3BsYWNlbWVudC5yaWdodCAtIHJlc3VsdC5kaXNwbGFjZW1lbnQubGVmdCwgcmVzdWx0LmRpc3BsYWNlbWVudC5ib3R0b20gLSByZXN1bHQuZGlzcGxhY2VtZW50LnRvcCwgcmVzdWx0LmRpc3BsYWNlbWVudC5uZWFyIC0gcmVzdWx0LmRpc3BsYWNlbWVudC5mYXJdO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudGl0eTtcbiIsInZhciBFbnRpdHkgICAgICAgPSByZXF1aXJlKCcuL0VudGl0eScpLFxuICAgIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4uL2V2ZW50cy9FdmVudEVtaXR0ZXInKTtcblxuZnVuY3Rpb24gRW50aXR5Q29sbGVjdGlvbihudW0pIHtcbiAgICB0aGlzLmVudGl0aWVzID0gW107XG5cbiAgICB0aGlzLklPID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdsZW5ndGgnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW50aXRpZXMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodHlwZW9mIG51bSA9PT0gJ251bWJlcicpIHdoaWxlIChudW0tLSkgdGhpcy5wdXNoKG5ldyBFbnRpdHkoKSk7XG4gICAgZWxzZSBpZiAobnVtIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgdmFyIGkgICA9IC0xLFxuICAgICAgICAgICAgbGVuID0gbnVtLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGxlbiAtICsraSkgdGhpcy5wdXNoKG51bVtpXSk7XG4gICAgfVxufVxuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gcHVzaChlbnRpdHkpIHtcbiAgICBpZiAoZW50aXR5IGluc3RhbmNlb2YgRW50aXR5KSB7XG4gICAgICAgIHRoaXMuZW50aXRpZXMucHVzaChlbnRpdHkpO1xuICAgICAgICB0aGlzLklPLmVtaXQoJ2VudGl0eUFkZGVkJywgZW50aXR5KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHRocm93IG5ldyBFcnJvcignZW50aXR5IGNvbGxlY3Rpb25zIGNhbiBvbmx5IGhhdmUgZW50aXRpZXMgYWRkZWQgdG8gdGhlbScpO1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24gcG9wKCkge1xuICAgIHZhciBlbnRpdHkgPSB0aGlzLmVudGl0aWVzLnBvcCgpO1xuICAgIHRoaXMuSU8uZW1pdCgnZW50aXR5UmVtb3ZlZCcsIGVudGl0eSk7XG4gICAgcmV0dXJuIGVudGl0eTtcbn07XG5cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24gc2hpZnQoKSB7XG4gICAgdmFyIGVudGl0eSA9IHRoaXMuZW50aXRpZXMuc2hpZnQoKTtcbiAgICB0aGlzLklPLmVtaXQoJ2VudGl0eVJlbW92ZWQnLCBlbnRpdHkpO1xuICAgIHJldHVybiBlbnRpdHk7XG59O1xuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS51bnNoaWZ0ID0gZnVuY3Rpb24gdW5zaGlmdChlbnRpdHkpIHtcbiAgICBpZiAoZW50aXR5IGluc3RhbmNlb2YgRW50aXR5KSB7XG4gICAgICAgIHRoaXMuZW50aXRpZXMuc2hpZnQoZW50aXR5KTtcbiAgICAgICAgdGhpcy5JTy5lbWl0KCdlbnRpdHlBZGRlZCcsIGVudGl0eSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2VudGl0eSBjb2xsZWN0aW9ucyBjYW4gb25seSBoYXZlIGVudGl0aWVzIGFkZGVkIHRvIHRoZW0nKTtcbn07XG5cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLnNwbGljZSA9IGZ1bmN0aW9uIHNwbGljZShpbmRleCwgaG93TWFueSwgZWxlbWVudHMpIHtcbiAgICB2YXIgaSwgbGVuO1xuICAgIGlmIChlbGVtZW50cyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGkgICA9IC0xLFxuICAgICAgICBsZW4gPSBlbGVtZW50cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChsZW4gLSArK2kpIHtcbiAgICAgICAgICAgIGlmICghKGVsZW1lbnRzW2ldIGluc3RhbmNlb2YgRW50aXR5KSkgdGhyb3cgbmV3IEVycm9yKCdlbnRpdHkgY29sbGVjdGlvbnMgY2FuIG9ubHkgaGF2ZSBlbnRpdGllcyBhZGRlZCB0byB0aGVtJyk7XG4gICAgICAgICAgICB0aGlzLmVudGl0aWVzLnNwbGljZShpbmRleCArIGhvd01hbnksIDAsIGVsZW1lbnRzW2ldKTtcbiAgICAgICAgICAgIHRoaXMuSU8uZW1pdCgnZW50aXR5QWRkZWQnLCBlbGVtZW50c1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVsZW1lbnRzIGluc3RhbmNlb2YgRW50aXR5KSB7XG4gICAgICAgIHRoaXMuZW50aXRpZXMuc3BsaWNlKGluZGV4ICsgaG93TWFueSwgMCwgZWxlbWVudHMpO1xuICAgICAgICB0aGlzLklPLmVtaXQoJ2VudGl0eUFkZGVkJywgZWxlbWVudHMpO1xuICAgIH1cbiAgICBpZiAoZWxlbWVudHMgaW5zdGFuY2VvZiBFbnRpdHlDb2xsZWN0aW9uKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgICAgICBzZWxmLmVudGl0aWVzLnNwbGljZShpbmRleCArIGhvd01hbnksIDAsIGVsZW1lbnQpO1xuICAgICAgICAgICAgc2VsZi5JTy5lbWl0KCdlbnRpdHlBZGRlZCcsIGVsZW1lbnRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciByZW1vdmVkID0gdGhpcy5lbnRpdGllcy5zcGxpY2UoaW5kZXgsIGhvd01hbnkpO1xuICAgIGkgICAgICAgICAgID0gLTE7XG4gICAgbGVuICAgICAgICAgPSByZW1vdmVkLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuIC0gKytpKSB0aGlzLklPLmVtaXQoJ2VudGl0eSByZW1vdmVkJywgcmVtb3ZlZFtpXSk7XG4gICAgcmV0dXJuIHJlbW92ZWQ7XG59O1xuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKCkge1xuICAgIHZhciBpICAgICAgPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gdGhpcy5lbnRpdGllcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IG5ldyBFbnRpdHlDb2xsZWN0aW9uKDApO1xuXG4gICAgd2hpbGUgKGxlbmd0aCAtICsraSkgcmVzdWx0LnB1c2godGhpcy5lbnRpdGllc1tpXSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gZmlsdGVyKGZuKSB7XG4gICAgdmFyIGkgICAgICA9IC0xLFxuICAgICAgICBsZW5ndGggPSB0aGlzLmVudGl0aWVzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gbmV3IEVudGl0eUNvbGxlY3Rpb24oMCk7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ0VudGl0eUNvbGxlY3Rpb24uZmlsdGVyIG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYXMgYSBwYXJhbWV0ZXInKTtcblxuICAgIHdoaWxlIChsZW5ndGggLSArK2kpIGlmIChmbih0aGlzLmVudGl0aWVzW2ldLCBpLCB0aGlzLmVudGl0aWVzKSkgcmVzdWx0LnB1c2godGhpcy5lbnRpdGllc1tpXSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucmVqZWN0ID0gZnVuY3Rpb24gcmVqZWN0KGZuKSB7XG4gICAgdmFyIGkgICAgICA9IC0xLFxuICAgICAgICBsZW5ndGggPSB0aGlzLmVudGl0aWVzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gbmV3IEVudGl0eUNvbGxlY3Rpb24oMCk7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ0VudGl0eUNvbGxlY3Rpb24ucmVqZWN0IG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYXMgYSBwYXJhbWV0ZXInKTtcblxuICAgIHdoaWxlIChsZW5ndGggLSArK2kpIGlmICghZm4odGhpcy5lbnRpdGllc1tpXSwgaSwgdGhpcy5lbnRpdGllcykpIHJlc3VsdC5wdXNoKHRoaXMuZW50aXRpZXNbaV0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogRXhlY3V0ZSBhIGZ1bmN0aW9uIHRoYXQgaXRlcmF0ZXMgb3ZlciB0aGUgY29sbGVjdGlvblxuICogIG9mIEVudGl0aWVzIGFuZCBjYWxscyBhIGZ1bmN0aW9uIHdoZXJlIHRoZSBwYXJhbWV0ZXJzXG4gKiAgYXJlLCB0aGUgRW50aXR5LCBpbmRleCwgYW5kIGZ1bGwgY29sbGVjdGlvbiBvZiBFbnRpdGllcy5cbiAqXG4gKiBAbWV0aG9kIGZvckVhY2hcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gdG8gYmUgcnVuIHBlciBFbnRpdHlcbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2goZm4pIHtcbiAgICB2YXIgaSAgICAgID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IHRoaXMuZW50aXRpZXMubGVuZ3RoO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdFbnRpdHlDb2xsZWN0aW9uLmZvckVhY2ggb25seSBhY2NlcHRzIGZ1bmN0aW9ucyBhcyBhIHBhcmFtZXRlcicpO1xuXG4gICAgd2hpbGUgKGxlbmd0aCAtICsraSkgZm4odGhpcy5lbnRpdGllc1tpXSwgaSwgdGhpcy5lbnRpdGllcyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEltcGxlbWVudHMgcmVkdWNlIG9uIHRoZSBjb2xsZWN0aW9uIG9mIEVudGl0aWVzXG4gKlxuICogQG1ldGhvZCByZWR1Y2VcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gdG8gYmUgcnVuIHBlciBFbnRpdHlcbiAqIEBwYXJhbSB7Kn0gaW5pdGlhbFZhbHVlIGluaXRpYWwgdmFsdWUgb2YgdGhlIHJlZHVjZSBmdW5jdGlvblxuICogXG4gKiBAcmV0dXJuIHsqfSB2YWx1ZSBhZnRlciBlYWNoIEVudGl0eSBoYXMgaGFkIHRoZSBmdW5jdGlvbiBydW5cbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUucmVkdWNlID0gZnVuY3Rpb24gcmVkdWNlKGZuLCBpbml0aWFsVmFsdWUpIHtcbiAgICB2YXIgaSAgICAgID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IHRoaXMuZW50aXRpZXMubGVuZ3RoLFxuICAgICAgICBhY2N1bXVsYXRvcjtcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignRW50aXR5Q29sbGVjdGlvbi5yZWR1Y2Ugb25seSBhY2NlcHRzIGZ1bmN0aW9ucyBhcyBhIHBhcmFtZXRlcicpO1xuXG4gICAgaWYgKGluaXRpYWxWYWx1ZSAhPSBudWxsKSBhY2N1bXVsYXRvciA9IGluaXRpYWxWYWx1ZTtcbiAgICBlbHNlICAgICAgICAgICAgICAgICAgICAgIGFjY3VtdWxhdG9yID0gdGhpcy5lbnRpdGllc1srK2ldO1xuICAgIHdoaWxlIChsZW5ndGggLSArK2kpICAgICAgYWNjdW11bGF0b3IgPSBmbihhY2N1bXVsYXRvciwgdGhpcy5lbnRpdGllc1tpXSwgaSwgdGhpcy5lbnRpdGllcyk7XG5cbiAgICByZXR1cm4gYWNjdW11bGF0b3I7XG59O1xuXG4vKipcbiAqIEltcGxlbWVudHMgbWFwIG9uIHRoZSBjb2xsZWN0aW9uIG9mIEVudGl0aWVzXG4gKlxuICogQG1ldGhvZCBtYXBcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gdG8gYmUgcnVuIHBlciBFbnRpdHlcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYXJyYXkgb2YgdGhlIHJldHVybiB2YWx1ZXMgb2YgdGhlIG1hcHBpbmcgZnVuY3Rpb25cbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwKGZuKSB7XG4gICAgdmFyIGkgICAgICA9IC0xLFxuICAgICAgICBsZW5ndGggPSB0aGlzLmVudGl0aWVzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ0VudGl0eUNvbGxlY3Rpb24ubWFwIG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYXMgYSBwYXJhbWV0ZXInKTtcblxuICAgIHdoaWxlIChsZW5ndGggLSArK2kpIHJlc3VsdC5wdXNoKGZuKHRoaXMuZW50aXRpZXNbaV0sIGksIHRoaXMuZW50aXRpZXMpKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIERlbGVnYXRlcyB0byB0aGUgRXZlbnRIYW5kbGVycyBcIm9uXCJcbiAqXG4gKiBAbWV0aG9kIG9uXG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuSU8ub24uYXBwbHkodGhpcy5JTywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogRGVsZWdhdGVzIHRvIHRoZSBFdmVudEhhbmRsZXJzIFwib25cIlxuICpcbiAqIEBtZXRob2Qgb2ZmXG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uIG9mZigpIHtcbiAgICByZXR1cm4gdGhpcy5JTy5yZW1vdmVMaXN0ZW5lci5hcHBseSh0aGlzLklPLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBGaW5kIHdoZXJlIGFuZCBpZiBhbiBFbnRpdHkgaXMgaW4gdGhlIGFycmF5XG4gKlxuICogQG1ldGhvZCBpbmRleE9mXG4gKiBcbiAqIEByZXN1bHQge051bWJlcn0gaW5kZXggb2YgRW50aXR5IGluIHRoZSBhcnJheVxuICovXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZigpIHtcbiAgICByZXR1cm4gdGhpcy5lbnRpdGllcy5pbmRleE9mLmFwcGx5KHRoaXMuZW50aXRpZXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYW5kIGVudGl0eSBmcm9tIHRoZSBhcnJheSBhbmQgZW1pdHMgYSBtZXNzYWdlXG4gKlxuICogQG1ldGhvZCByZW1vdmVcbiAqIFxuICogQHJlc3VsdCB7RW50aXR5fSByZW1vdmVkIEVudGl0eVxuICovXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUoZW50aXR5KSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5lbnRpdGllcy5pbmRleE9mKGVudGl0eSk7XG4gICAgdGhpcy5JTy5lbWl0KCdlbnRpdHkgcmVtb3ZlZCcsIGVudGl0eSk7XG4gICAgaWYgKGluZGV4IDwgMCkgcmV0dXJuIGZhbHNlO1xuICAgIGVsc2UgICAgICAgICAgIHJldHVybiB0aGlzLmVudGl0aWVzLnNwbGljZShpbmRleCwgMSlbMF07XG59O1xuXG4vKipcbiAqIEdldCB0aGUgRW50aXR5IGFyZSBhIHBhcnRpY3VsYXIgaW5kZXhcbiAqXG4gKiBAbWV0aG9kIGdldFxuICogXG4gKiBAcmVzdWx0IHtFbnRpdHl9IEVudGl0eSBhdCB0aGF0IGluZGV4XG4gKi9cbkVudGl0eUNvbGxlY3Rpb24ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldChpbmRleCkge1xuICAgIHJldHVybiB0aGlzLmVudGl0aWVzW2luZGV4XTtcbn07XG5cbi8qKlxuICogRmluZCBvZiBpZiB0aGUgRW50aXR5Q29sbGVjdGlvbiBoYXMgYW4gRW50aXR5XG4gKlxuICogQG1ldGhvZCBoYXNcbiAqIFxuICogQHJlc3VsdCB7Qm9vbGVhbn0gZXhpc3RlbmNlIG9mIHRoZSBFbnRpdHkgaW4gdGhlIEVudGl0eUNvbGxlY3Rpb25cbiAqL1xuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24gaGFzKGVudGl0eSkge1xuICAgIHJldHVybiB0aGlzLmVudGl0aWVzLmluZGV4T2YoZW50aXR5KSAhPT0gLTE7XG59O1xuXG5FbnRpdHlDb2xsZWN0aW9uLnByb3RvdHlwZS5yZXZlcnNlID0gZnVuY3Rpb24gcmV2ZXJzZSgpIHtcbiAgICB2YXIgaSAgICAgID0gdGhpcy5lbnRpdGllcy5sZW5ndGg7XG4gICAgICAgIHJlc3VsdCA9IG5ldyBFbnRpdHlDb2xsZWN0aW9uKDApO1xuXG4gICAgd2hpbGUgKGktLSkgcmVzdWx0LnB1c2godGhpcy5lbnRpdGllc1tpXSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmZ1bmN0aW9uIF9tZXJnZShsZWZ0LCByaWdodCwgYXJyLCBjb21wYXJpc29uKSB7XG4gICAgdmFyIGEgPSAwO1xuICAgIHdoaWxlIChsZWZ0Lmxlbmd0aCAmJiByaWdodC5sZW5ndGgpIGFyclthKytdID0gY29tcGFyaXNvbihsZWZ0WzBdLCByaWdodFswXSkgPCAwID8gbGVmdC5zaGlmdCgpIDogcmlnaHQuc2hpZnQoKTtcbiAgICB3aGlsZSAobGVmdC5sZW5ndGgpIGFyclthKytdID0gbGVmdC5zaGlmdCgpO1xuICAgIHdoaWxlIChyaWdodC5sZW5ndGgpIGFyclthKytdID0gcmlnaHQuc2hpZnQoKTtcbn1cblxuZnVuY3Rpb24gX21Tb3J0KGFyciwgdG1wLCBsLCBjb21wYXJpc29uKSB7XG4gICAgaWYgKGw9PT0xKSByZXR1cm47XG4gICAgdmFyIG0gPSAobC8yKXwwLFxuICAgICAgICB0bXBfbCA9IHRtcC5zbGljZSgwLCBtKSxcbiAgICAgICAgdG1wX3IgPSB0bXAuc2xpY2UobSk7XG4gICAgX21Tb3J0KHRtcF9sLCBhcnIuc2xpY2UoMCwgbSksICBtLCBjb21wYXJpc29uKTtcbiAgICBfbVNvcnQodG1wX3IsIGFyci5zbGljZShtKSwgbCAtIG0sIGNvbXBhcmlzb24pO1xuICAgIF9tZXJnZSh0bXBfbCwgdG1wX3IsIGFyciwgY29tcGFyaXNvbik7XG4gICAgcmV0dXJuIGFycjtcbn1cblxuRW50aXR5Q29sbGVjdGlvbi5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uIHNvcnQoY29tcGFyaXNvbikge1xuICAgIHJldHVybiBuZXcgRW50aXR5Q29sbGVjdGlvbihfbVNvcnQodGhpcy5lbnRpdGllcy5zbGljZSgpLCB0aGlzLmVudGl0aWVzLnNsaWNlKCksIHRoaXMuZW50aXRpZXMubGVuZ3RoLCBjb21wYXJpc29uKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudGl0eUNvbGxlY3Rpb247IiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5Q29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vRW50aXR5Q29sbGVjdGlvbicpO1xuXG4vLyBNYXAgb2YgYW4gRW50aXR5J3MgcG9zaXRpb24gaW4gYSBFbnRpdHlDb2xsZWN0aW9uXG52YXIgZW50aXRpZXMgPSBbXTtcblxuLy8gU3RvcmFnZSBvZiBFbnRpdHkgYXJyYXlzXG52YXIgZW50aXR5Q29sbGVjdGlvbnMgPSB7XG4gICAgZXZlcnl0aGluZzogbmV3IEVudGl0eUNvbGxlY3Rpb24oKVxufTtcblxuLy8gUG9vbCBvZiBmcmVlIHNwYWNlcyBpbiB0aGUgZW50aXRlcyBhcnJheVxudmFyIGZyZWVkID0gW107XG5cbi8qKlxuICogQSBzaW5nbGV0b24gb2JqZWN0IHRoYXQgbWFuYWdlcyB0aGUgRW50aXR5IHJlZmVyZW5jZSBzeXN0ZW0uXG4gKiAgIEVudGl0aWVzIGNhbiBiZSBwYXJ0IG9mIG1hbnkgRW50aXR5Q29sbGVjdGlvbnMgZGVwZW5kaW5nIG9uIGltcGxlbWVudGF0aW9uLlxuICogICBcbiAqIEBjbGFzcyBFbnRpdHlSZWdpc3RyeVxuICogQHNpbmdsZXRvblxuICovXG52YXIgRW50aXR5UmVnaXN0cnkgPSBtb2R1bGUuZXhwb3J0cztcblxuLyoqXG4gKiBBZGRzIGEgbmV3IEVudGl0eUNvbGxlY3Rpb24ga2V5IHRvIHRoZSBlbnRpdHlDb2xsZWN0aW9ucyBvYmplY3QuXG4gKlxuICogQG1ldGhvZCAgYWRkQ29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIHRoZSBFbnRpdHlDb2xsZWN0aW9uXG4gKiBAcmV0dXJuIHtFbnRpdHlDb2xsZWN0aW9ufSB0aGUgRW50aXR5Q29sbGVjdGlvbiBhZGRlZFxuICovXG5FbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uID0gZnVuY3Rpb24gYWRkQ29sbGVjdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgaWYgKCFjb2xsZWN0aW9uKSAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCcuYWRkQ29sbGVjdGlvbiBuZWVkcyB0byBoYXZlIGEgbmFtZSBzcGVjaWZpZWQnKTtcbiAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb24gIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgRXJyb3IoJy5hZGRDb2xsZWN0aW9uIGNhbiBvbmx5IHRha2UgYSBzdHJpbmcgYXMgYW4gYXJndW1lbnQnKTtcbiAgICBpZiAoIWVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dKSBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXSA9IG5ldyBFbnRpdHlDb2xsZWN0aW9uKCk7XG4gICAgcmV0dXJuIGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIEVudGl0eUNvbGxlY3Rpb24gYnkgbmFtZS5cbiAqXG4gKiBAbWV0aG9kICBnZXRDb2xsZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uIG5hbWUgb2YgdGhlIEVudGl0eUNvbGxlY3Rpb25cbiAqIEByZXR1cm4ge0VudGl0eUNvbGxlY3Rpb258dW5kZWZpbmVkfSBFbnRpdHlDb2xsZWN0aW9uIHJlZmVyZW5jZWQgYnkgYSBwYXJ0aWN1bGFyIG5hbWVcbiAqL1xuRW50aXR5UmVnaXN0cnkuZ2V0Q29sbGVjdGlvbiA9IGZ1bmN0aW9uIGdldENvbGxlY3Rpb24oY29sbGVjdGlvbikge1xuICAgIHJldHVybiBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHBhcnRpY3VsYXIgRW50aXR5Q29sbGVjdGlvbiBmcm9tIHRoZSByZWdpc3RyeVxuICpcbiAqIEBtZXRob2QgIHJlbW92ZUNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gbmFtZSBvZiB0aGUgRW50aXR5Q29sbGVjdGlvbiB0byByZW1vdmVcbiAqIEByZXR1cm4ge0VudGl0eUNvbGxlY3Rpb259IEVudGl0eUNvbGxlY3Rpb24gdGhhdCB3YXMgcmVtb3ZlZFxuICovXG5FbnRpdHlSZWdpc3RyeS5yZW1vdmVDb2xsZWN0aW9uID0gZnVuY3Rpb24gcmVtb3ZlQ29sbGVjdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgaWYgKCFjb2xsZWN0aW9uKSAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCcucmVtb3ZlQ29sbGVjdGlvbiBuZWVkcyB0byBoYXZlIGEgY29sbGVjdGlvbiBzcGVjaWZpZWQnKTtcbiAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb24gIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgRXJyb3IoJy5yZW1vdmVDb2xsZWN0aW9uIGNhbiBvbmx5IHRha2UgYSBzdHJpbmcgYXMgYW4gYXJndW1lbnQnKTtcblxuICAgIHZhciBjdXJyQ29sbGVjdGlvbiA9IGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dO1xuICAgIGlmICghY3VyckNvbGxlY3Rpb24pIHJldHVybiBmYWxzZTtcblxuICAgIHZhciBpID0gY3VyckNvbGxlY3Rpb24ubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIGRlbGV0ZSBlbnRpdGllc1tjdXJyQ29sbGVjdGlvbi5nZXQoaSkuX2lkXVtjb2xsZWN0aW9uXTtcblxuICAgIGRlbGV0ZSBlbnRpdHlDb2xsZWN0aW9uc1tjb2xsZWN0aW9uXTtcbiAgICByZXR1cm4gY3VyckNvbGxlY3Rpb247XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gZW50aXR5IHRvIGEgcGFydGljdWxhciBjb2xsZWN0aW9uLlxuICpcbiAqIEBtZXRob2QgcmVnaXN0ZXJcbiAqIFxuICogQHBhcmFtICB7RW50aXR5fSBpbnN0YW5jZSBvZiBhbiBFbnRpdHlcbiAqIEBwYXJhbSAge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIHRoZSBFbnRpdHlDb2xsZWN0aW9uIHRvIHJlZ2lzdGVyIHRoZSBlbnRpdHkgdG9cbiAqIEByZXR1cm4ge051bWJlcn0gaWQgb2YgdGhlIEVudGl0eVxuICovXG5FbnRpdHlSZWdpc3RyeS5yZWdpc3RlciA9IGZ1bmN0aW9uIHJlZ2lzdGVyKGVudGl0eSwgY29sbGVjdGlvbikge1xuICAgIHZhciBpZE1hcDtcbiAgICBpZiAoZW50aXR5Ll9pZCA9PSBudWxsKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbnRpdHksICdfaWQnLCB7XG4gICAgICAgICAgICB2YWx1ZSAgICAgICAgOiBFbnRpdHlSZWdpc3RyeS5nZXROZXdJRCgpLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIGlkID0gZW50aXR5Ll9pZDtcbiAgICBpZiAoZW50aXRpZXNbaWRdKSB7XG4gICAgICAgIGlkTWFwID0gZW50aXRpZXNbaWRdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWRNYXAgPSB7ZXZlcnl0aGluZzogZW50aXR5Q29sbGVjdGlvbnMuZXZlcnl0aGluZy5sZW5ndGh9O1xuICAgICAgICBlbnRpdHlDb2xsZWN0aW9ucy5ldmVyeXRoaW5nLnB1c2goZW50aXR5KTtcbiAgICB9XG5cbiAgICBpZiAoY29sbGVjdGlvbikge1xuICAgICAgICBpZiAoIWVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dKSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKGNvbGxlY3Rpb24pO1xuICAgICAgICBpZE1hcFtjb2xsZWN0aW9uXSA9IGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dLmxlbmd0aDtcbiAgICAgICAgZW50aXR5Q29sbGVjdGlvbnNbY29sbGVjdGlvbl0ucHVzaChlbnRpdHkpO1xuICAgIH1cblxuICAgIGlmICghZW50aXRpZXNbaWRdKSBlbnRpdGllc1tpZF0gPSBpZE1hcDtcbiAgICByZXR1cm4gaWQ7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYW4gZW50aXR5IGZyb20gYSBFbnRpdHlDb2xsZWN0aW9uXG4gKlxuICogQG1ldGhvZCAgZGVyZWdpc3RlclxuICogXG4gKiBAcGFyYW0gIHtFbnRpdHl9IGVudGl0eSBpbnN0YW5jZSBvZiBhbiBFbnRpdHlcbiAqIEBwYXJhbSAge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIEVudGl0eUNvbGxlY3Rpb24gdG8gcmVtb3ZlIHRoZSBFbnRpdHkgZnJvbVxuICogQHJldHVybiB7Qm9vbGVhbX0gc3RhdHVzIG9mIHRoZSByZW1vdmFsXG4gKi9cbkVudGl0eVJlZ2lzdHJ5LmRlcmVnaXN0ZXIgPSBmdW5jdGlvbiBkZXJlZ2lzdGVyKGVudGl0eSwgY29sbGVjdGlvbikge1xuICAgIHZhciBjdXJyZW50RW50aXR5O1xuICAgIHZhciBwb3NpdGlvbiA9IGVudGl0aWVzW2VudGl0eS5faWRdW2NvbGxlY3Rpb25dO1xuICAgIGlmIChwb3NpdGlvbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gICAgZW50aXRpZXNbZW50aXR5Ll9pZF1bY29sbGVjdGlvbl0gPSBudWxsO1xuICAgIGVudGl0eUNvbGxlY3Rpb25zW2NvbGxlY3Rpb25dLnJlbW92ZShlbnRpdHkpO1xuXG4gICAgdmFyIGN1cnJlbnRFbnRpdHk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRpdGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJyZW50RW50aXR5ID0gZW50aXRpZXNbaV07XG5cbiAgICAgICAgaWYgKGN1cnJlbnRFbnRpdHkgJiYgY3VycmVudEVudGl0eVtjb2xsZWN0aW9uXSA+IHBvc2l0aW9uKSBjdXJyZW50RW50aXR5W2NvbGxlY3Rpb25dLS07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgaWQgbWFwIG9mIHRoZSBFbnRpdHkuICBFYWNoIEVudGl0eSBoYXMgYW4gb2JqZWN0IHRoYXRcbiAqICAgZGVmaW5lZCB0aGUgaW5kaWNpZXMgb2Ygd2hlcmUgaXQgaXMgaW4gZWFjaCBFbnRpdHlDb2xsZWN0aW9uLlxuICpcbiAqIEBtZXRob2QgIGdldFxuICogXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGlkIElEIG9mIHRoZSBFbnRpdHlcbiAqIEByZXR1cm4ge09iamVjdH0gaWQgbWFwIG9mIHRoZSBFbnRpdHkncyBpbmRleCBpbiBlYWNoIEVudGl0eUNvbGxlY3Rpb25cbiAqL1xuRW50aXR5UmVnaXN0cnkuZ2V0ID0gZnVuY3Rpb24gZ2V0KGlkKSB7XG4gICAgcmV0dXJuIGVudGl0aWVzW2lkXTtcbn07XG5cbi8qKlxuICogRmluZCBvdXQgaWYgYSBnaXZlbiBlbnRpdHkgZXhpc3RzIGFuZCBhIHNwZWNpZmllZCBFbnRpdHlDb2xsZWN0aW9uLlxuICpcbiAqIEBtZXRob2QgIGluQ29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0gIHtFbnRpdHl9IGVudGl0eSBFbnRpdHkgaW5zdGFuY2VcbiAqIEBwYXJhbSAge1N0cmluZ30gY29sbGVjdGlvbiBuYW1lIG9mIHRoZSBFbnRpdHlDb2xsZWN0aW9uXG4gKiBAcmV0dXJuIHtCb29sZWFufSB3aGV0aGVyIG9yIG5vdCB0aGUgRW50aXR5IGlzIGluIGEgZ2l2ZW4gRW50aXR5Q29sbGVjdGlvblxuICovXG5FbnRpdHlSZWdpc3RyeS5pbkNvbGxlY3Rpb24gPSBmdW5jdGlvbiBpbkNvbGxlY3Rpb24oZW50aXR5LCBjb2xsZWN0aW9uKSB7XG4gICAgcmV0dXJuIGVudGl0aWVzW2VudGl0eS5faWRdW2NvbGxlY3Rpb25dICE9PSB1bmRlZmluZWQ7XG59O1xuXG4vKipcbiAqIEdldCBhIHVuaXF1ZSBJRCBmb3IgYW4gRW50aXR5XG4gKlxuICogQG1ldGhvZCAgZ2V0TmV3SURcbiAqIFxuICogQHJldHVybiB7TnVtYmVyfSBJRCBmb3IgYW4gRW50aXR5XG4gKi9cbkVudGl0eVJlZ2lzdHJ5LmdldE5ld0lEID0gZnVuY3Rpb24gZ2V0TmV3SUQoKSB7XG4gICAgaWYoZnJlZWQubGVuZ3RoKSByZXR1cm4gZnJlZWQucG9wKCk7XG4gICAgZWxzZSByZXR1cm4gZW50aXRpZXMubGVuZ3RoO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gZW50aXR5IGFuZCBhbGwgcmVmZXJlbmNlcyB0byBpdC5cbiAqXG4gKiBAbWV0aG9kIGNsZWFudXBcbiAqIFxuICogQHBhcmFtICB7RW50aXR5fSBlbnRpdHkgRW50aXR5IGluc3RhbmNlIHRvIHJlbW92ZVxuICogQHJldHVybiB7TnVtYmVyfSBJRCBvZiB0aGUgRW50aXR5IHRoYXQgd2FzIHJlbW92ZWRcbiAqL1xuRW50aXR5UmVnaXN0cnkuY2xlYW51cCA9IGZ1bmN0aW9uIGNsZWFudXAoZW50aXR5KSB7XG4gICAgdmFyIGN1cnJlbnRFbnRpdHk7XG4gICAgdmFyIGlkTWFwICAgICAgICAgICAgPSBlbnRpdGllc1tlbnRpdHkuX2lkXTtcbiAgICBlbnRpdGllc1tlbnRpdHkuX2lkXSA9IG51bGw7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1cnJlbnRFbnRpdHkgPSBlbnRpdGllc1tpXTtcblxuICAgICAgICBpZiAoY3VycmVudEVudGl0eSlcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBpZE1hcClcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEVudGl0eVtrZXldICYmIGN1cnJlbnRFbnRpdHlba2V5XSA+IGlkTWFwW2tleV0pXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFbnRpdHlba2V5XS0tO1xuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBpZE1hcCkge1xuICAgICAgICBlbnRpdHlDb2xsZWN0aW9uc1trZXldLnNwbGljZShpZE1hcFtrZXldLCAxKTtcbiAgICB9XG5cbiAgICBmcmVlZC5wdXNoKGVudGl0eS5faWQpO1xuICAgIHJldHVybiBlbnRpdHkuX2lkO1xufTtcblxuLyoqXG4gKiBHZXQgYW4gRW50aXR5IGJ5IGlkXG4gKlxuICogQG1ldGhvZCBnZXRFbnRpdHlcbiAqIFxuICogQHBhcmFtICB7TnVtYmVyfSBpZCBpZCBvZiB0aGUgRW50aXR5XG4gKiBAcmV0dXJuIHtFbnRpdHl9IGVudGl0eSB3aXRoIHRoZSBpZCBwcm92aWRlZFxuICovXG5FbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkgPSBmdW5jdGlvbiBnZXRFbnRpdHkoaWQpIHtcbiAgICBpZiAoIWVudGl0aWVzW2lkXSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBlbnRpdHlDb2xsZWN0aW9ucy5ldmVyeXRoaW5nLmdldChlbnRpdGllc1tpZF0uZXZlcnl0aGluZyk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgRW50aXRpZXMgZnJvbSB0aGUgZW50aXR5IHJlZ2lzdHJ5XG4gKlxuICogQG1ldGhvZCBjbGVhclxuICovXG5FbnRpdHlSZWdpc3RyeS5jbGVhciA9IGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgIHZhciBldmVyeXRoaW5nID0gRW50aXR5UmVnaXN0cnkuZ2V0Q29sbGVjdGlvbignZXZlcnl0aGluZycpO1xuICAgIHdoaWxlIChldmVyeXRoaW5nLmxlbmd0aCkgRW50aXR5UmVnaXN0cnkuY2xlYW51cChldmVyeXRoaW5nLnBvcCgpKTtcbn07XG5cbi8vIFJlZ3NpdGVyIHRoZSBkZWZhdWx0IGVudGl0eUNvbGxlY3Rpb25zXG5FbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdSb290cycpO1xuRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignQ29yZVN5c3RlbScpO1xuXG4vLyBtb2R1bGUuZXhwb3J0cyA9IEVudGl0eVJlZ2lzdHJ5O1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogbWFya0BmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuIFxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi4vZXZlbnRzL0V2ZW50SGFuZGxlcicpO1xuXG4vKipcbiAqICBBIGNvbGxlY3Rpb24gb2YgbWV0aG9kcyBmb3Igc2V0dGluZyBvcHRpb25zIHdoaWNoIGNhbiBiZSBleHRlbmRlZFxuICogIG9udG8gb3RoZXIgY2xhc3Nlcy5cbiAqXG4gKlxuICogQGNsYXNzIE9wdGlvbnNNYW5hZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIG9wdGlvbnMgZGljdGlvbmFyeVxuICovXG5mdW5jdGlvbiBPcHRpb25zTWFuYWdlcih2YWx1ZSkge1xuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgdGhpcy5ldmVudE91dHB1dCA9IG51bGw7XG59XG5cbi8qKlxuICogQ3JlYXRlIG9wdGlvbnMgbWFuYWdlciBmcm9tIHNvdXJjZSBkaWN0aW9uYXJ5IHdpdGggYXJndW1lbnRzIG92ZXJyaWRlbiBieSBwYXRjaCBkaWN0aW9uYXJ5LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2QgT3B0aW9uc01hbmFnZXIucGF0Y2hcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc291cmNlIHNvdXJjZSBhcmd1bWVudHNcbiAqIEBwYXJhbSB7Li4uT2JqZWN0fSBkYXRhIGFyZ3VtZW50IGFkZGl0aW9ucyBhbmQgb3ZlcndyaXRlc1xuICogQHJldHVybiB7T2JqZWN0fSBzb3VyY2Ugb2JqZWN0XG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnBhdGNoID0gZnVuY3Rpb24gcGF0Y2hPYmplY3Qoc291cmNlLCBkYXRhKSB7XG4gICAgdmFyIG1hbmFnZXIgPSBuZXcgT3B0aW9uc01hbmFnZXIoc291cmNlKTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgbWFuYWdlci5wYXRjaChhcmd1bWVudHNbaV0pO1xuICAgIHJldHVybiBzb3VyY2U7XG59O1xuXG5mdW5jdGlvbiBfY3JlYXRlRXZlbnRPdXRwdXQoKSB7XG4gICAgdGhpcy5ldmVudE91dHB1dCA9IG5ldyBFdmVudEhhbmRsZXIoKTtcbiAgICB0aGlzLmV2ZW50T3V0cHV0LmJpbmRUaGlzKHRoaXMpO1xuICAgIEV2ZW50SGFuZGxlci5zZXRPdXRwdXRIYW5kbGVyKHRoaXMsIHRoaXMuZXZlbnRPdXRwdXQpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBPcHRpb25zTWFuYWdlciBmcm9tIHNvdXJjZSB3aXRoIGFyZ3VtZW50cyBvdmVycmlkZW4gYnkgcGF0Y2hlcy5cbiAqICAgVHJpZ2dlcnMgJ2NoYW5nZScgZXZlbnQgb24gdGhpcyBvYmplY3QncyBldmVudCBoYW5kbGVyIGlmIHRoZSBzdGF0ZSBvZlxuICogICB0aGUgT3B0aW9uc01hbmFnZXIgY2hhbmdlcyBhcyBhIHJlc3VsdC5cbiAqXG4gKiBAbWV0aG9kIHBhdGNoXG4gKlxuICogQHBhcmFtIHsuLi5PYmplY3R9IGFyZ3VtZW50cyBsaXN0IG9mIHBhdGNoIG9iamVjdHNcbiAqIEByZXR1cm4ge09wdGlvbnNNYW5hZ2VyfSB0aGlzXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5wYXRjaCA9IGZ1bmN0aW9uIHBhdGNoKCkge1xuICAgIHZhciBteVN0YXRlID0gdGhpcy5fdmFsdWU7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGRhdGEgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGZvciAodmFyIGsgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKChrIGluIG15U3RhdGUpICYmIChkYXRhW2tdICYmIGRhdGFba10uY29uc3RydWN0b3IgPT09IE9iamVjdCkgJiYgKG15U3RhdGVba10gJiYgbXlTdGF0ZVtrXS5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSkge1xuICAgICAgICAgICAgICAgIGlmICghbXlTdGF0ZS5oYXNPd25Qcm9wZXJ0eShrKSkgbXlTdGF0ZVtrXSA9IE9iamVjdC5jcmVhdGUobXlTdGF0ZVtrXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5rZXkoaykucGF0Y2goZGF0YVtrXSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZXZlbnRPdXRwdXQpIHRoaXMuZXZlbnRPdXRwdXQuZW1pdCgnY2hhbmdlJywge2lkOiBrLCB2YWx1ZTogZGF0YVtrXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB0aGlzLnNldChrLCBkYXRhW2tdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHBhdGNoXG4gKlxuICogQG1ldGhvZCBzZXRPcHRpb25zXG4gKlxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IE9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5wYXRjaDtcblxuLyoqXG4gKiBSZXR1cm4gT3B0aW9uc01hbmFnZXIgYmFzZWQgb24gc3ViLW9iamVjdCByZXRyaWV2ZWQgYnkga2V5XG4gKlxuICogQG1ldGhvZCBrZXlcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllciBrZXlcbiAqIEByZXR1cm4ge09wdGlvbnNNYW5hZ2VyfSBuZXcgb3B0aW9ucyBtYW5hZ2VyIHdpdGggdGhlIHZhbHVlXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5rZXkgPSBmdW5jdGlvbiBrZXkoaWRlbnRpZmllcikge1xuICAgIHZhciByZXN1bHQgPSBuZXcgT3B0aW9uc01hbmFnZXIodGhpcy5fdmFsdWVbaWRlbnRpZmllcl0pO1xuICAgIGlmICghKHJlc3VsdC5fdmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpIHx8IHJlc3VsdC5fdmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgcmVzdWx0Ll92YWx1ZSA9IHt9O1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIExvb2sgdXAgdmFsdWUgYnkga2V5XG4gKiBAbWV0aG9kIGdldFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkga2V5XG4gKiBAcmV0dXJuIHtPYmplY3R9IGFzc29jaWF0ZWQgb2JqZWN0XG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlW2tleV07XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBnZXRcbiAqIEBtZXRob2QgZ2V0T3B0aW9uc1xuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUuZ2V0T3B0aW9ucyA9IE9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5nZXQ7XG5cbi8qKlxuICogU2V0IGtleSB0byB2YWx1ZS4gIE91dHB1dHMgJ2NoYW5nZScgZXZlbnQgaWYgYSB2YWx1ZSBpcyBvdmVyd3JpdHRlbi5cbiAqXG4gKiBAbWV0aG9kIHNldFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkga2V5IHN0cmluZ1xuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHZhbHVlIG9iamVjdFxuICogQHJldHVybiB7T3B0aW9uc01hbmFnZXJ9IG5ldyBvcHRpb25zIG1hbmFnZXIgYmFzZWQgb24gdGhlIHZhbHVlIG9iamVjdFxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpIHtcbiAgICB2YXIgb3JpZ2luYWxWYWx1ZSA9IHRoaXMuZ2V0KGtleSk7XG4gICAgdGhpcy5fdmFsdWVba2V5XSA9IHZhbHVlO1xuXG4gICAgaWYgKHRoaXMuZXZlbnRPdXRwdXQgJiYgdmFsdWUgIT09IG9yaWdpbmFsVmFsdWUpIHRoaXMuZXZlbnRPdXRwdXQuZW1pdCgnY2hhbmdlJywge2lkOiBrZXksIHZhbHVlOiB2YWx1ZX0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gZW50aXJlIG9iamVjdCBjb250ZW50cyBvZiB0aGlzIE9wdGlvbnNNYW5hZ2VyLlxuICpcbiAqIEBtZXRob2QgdmFsdWVcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IGN1cnJlbnQgc3RhdGUgb2Ygb3B0aW9uc1xuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbiB2YWx1ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG59O1xuXG4vKipcbiAqIEJpbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBhbiBldmVudCB0eXBlIGhhbmRsZWQgYnkgdGhpcyBvYmplY3QuXG4gKlxuICogQG1ldGhvZCBcIm9uXCJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjaGFuZ2UnKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGhhbmRsZXIgY2FsbGJhY2tcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbigpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5vbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBVbmJpbmQgYW4gZXZlbnQgYnkgdHlwZSBhbmQgaGFuZGxlci5cbiAqICAgVGhpcyB1bmRvZXMgdGhlIHdvcmsgb2YgXCJvblwiLlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlTGlzdGVuZXJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjaGFuZ2UnKVxuICogQHBhcmFtIHtmdW5jdGlvbn0gaGFuZGxlciBmdW5jdGlvbiBvYmplY3QgdG8gcmVtb3ZlXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IGludGVybmFsIGV2ZW50IGhhbmRsZXIgb2JqZWN0IChmb3IgY2hhaW5pbmcpXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKCkge1xuICAgIF9jcmVhdGVFdmVudE91dHB1dC5jYWxsKHRoaXMpO1xuICAgIHJldHVybiB0aGlzLnJlbW92ZUxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIEFkZCBldmVudCBoYW5kbGVyIG9iamVjdCB0byBzZXQgb2YgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqXG4gKiBAbWV0aG9kIHBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IGV2ZW50IGhhbmRsZXIgdGFyZ2V0IG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwYXNzZWQgZXZlbnQgaGFuZGxlclxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIHBpcGUoKSB7XG4gICAgX2NyZWF0ZUV2ZW50T3V0cHV0LmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXMucGlwZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgaGFuZGxlciBvYmplY3QgZnJvbSBzZXQgb2YgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqIFVuZG9lcyB3b3JrIG9mIFwicGlwZVwiXG4gKlxuICogQG1ldGhvZCB1bnBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IHRhcmdldCBoYW5kbGVyIG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwcm92aWRlZCB0YXJnZXRcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnVucGlwZSA9IGZ1bmN0aW9uIHVucGlwZSgpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy51bnBpcGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uc01hbmFnZXI7IiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGRhbkBmYW1vLnVzXG4gKiAgICAgICAgIGZlbGl4QGZhbW8udXNcbiAqICAgICAgICAgbWlrZUBmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgT3B0aW9uc01hbmFnZXIgICA9IHJlcXVpcmUoJy4uL09wdGlvbnNNYW5hZ2VyJyksXG4gICAgU3VyZmFjZSAgICAgICAgICA9IHJlcXVpcmUoJy4uL0NvbXBvbmVudHMvU3VyZmFjZScpLFxuICAgIENvbnRhaW5lciAgICAgICAgPSByZXF1aXJlKCcuLi9Db21wb25lbnRzL0NvbnRhaW5lcicpLFxuICAgIEVsZW1lbnRBbGxvY2F0b3IgPSByZXF1aXJlKCcuL0VsZW1lbnRBbGxvY2F0b3InKSxcbiAgICBFbnRpdHlSZWdpc3RyeSAgID0gcmVxdWlyZSgnLi4vRW50aXR5UmVnaXN0cnknKSxcbiAgICBNYXRyaXhNYXRoICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbWF0aC9NYXRyaXg0eDQnKTtcblxuLy8gU3RhdGVcbnZhciBjb250YWluZXJzVG9FbGVtZW50cyA9IFtdLFxuICAgIHN1cmZhY2VzVG9FbGVtZW50cyAgID0ge30sXG4gICAgY29udGFpbmVyc1RvU3VyZmFjZXMgPSBbXSxcbiAgICB0YXJnZXRzICAgICAgICAgICAgICA9IFtTdXJmYWNlLnRvU3RyaW5nKCldO1xuXG52YXIgdXNlUHJlZml4ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jykuc3R5bGUud2Via2l0VHJhbnNmb3JtICE9IG51bGw7XG5cbi8vIENPTlNUU1xudmFyIFpFUk8gICAgICAgICAgICAgICAgPSAwLFxuICAgIERFVklDRVBJWEVMUkFUSU8gICAgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxLFxuICAgIE1BVFJJWDNEICAgICAgICAgICAgPSAnbWF0cml4M2QoJyxcbiAgICBDTE9TRV9QQVJFTiAgICAgICAgID0gJyknLFxuICAgIENPTU1BICAgICAgICAgICAgICAgPSAnLCcsXG4gICAgRElWICAgICAgICAgICAgICAgICA9ICdkaXYnLFxuICAgIEZBX0NPTlRBSU5FUiAgICAgICAgPSAnZmEtY29udGFpbmVyJyxcbiAgICBGQV9TVVJGQUNFICAgICAgICAgID0gJ2ZhLXN1cmZhY2UnLFxuICAgIENPTlRBSU5FUiAgICAgICAgICAgPSAnY29udGFpbmVyJyxcbiAgICBQWCAgICAgICAgICAgICAgICAgID0gJ3B4JyxcbiAgICBTVVJGQUNFICAgICAgICAgICAgID0gJ3N1cmZhY2UnLFxuICAgIFRSQU5TRk9STSAgICAgICAgICAgPSAndHJhbnNmb3JtJyxcbiAgICBDU1NUUkFOU0ZPUk0gICAgICAgID0gdXNlUHJlZml4ID8gJ3dlYmtpdFRyYW5zZm9ybScgOiAndHJhbnNmb3JtJyxcbiAgICBDU1NUUkFOU0ZPUk1fT1JJR0lOID0gdXNlUHJlZml4ID8gJ3dlYmtpdFRyYW5zZm9ybU9yaWdpbicgOiAndHJhbnNmb3JtT3JpZ2luJztcblxuLy9zY3JhdGNoIG1lbW9yeSBmb3IgbWF0cml4IGNhbGN1bGF0aW9uc1xudmFyIG1hdHJpeFNjcmF0Y2gxICAgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSksXG4gICAgbWF0cml4U2NyYXRjaDIgICA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKSxcbiAgICBtYXRyaXhTY3JhdGNoMyAgID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pLFxuICAgIG1hdHJpeFNjcmF0Y2g0ICAgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG5cbi8qKlxuICogRE9NUmVuZGVyZXIgaXMgYSBzaW5nbGV0b24gb2JqZWN0IHdob3NlIHJlc3BvbnNpYmxpdHkgaXQgaXNcbiAqICB0byBkcmF3IERPTSBib3VuZCBTdXJmYWNlcyB0byB0aGVpciByZXNwZWN0aXZlIENvbnRhaW5lcnMuXG4gKlxuICogQGNsYXNzIERPTVJlbmRlcmVyXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBET01SZW5kZXJlciA9IHtcbiAgICBfcXVldWVzOiB7XG4gICAgICAgIGNvbnRhaW5lcnM6IHtcbiAgICAgICAgICAgIHVwZGF0ZTogW10sXG4gICAgICAgICAgICByZWNhbGw6IFtdLFxuICAgICAgICAgICAgZGVwbG95OiBbXVxuICAgICAgICB9LFxuICAgICAgICBzdXJmYWNlczoge31cbiAgICB9LFxuICAgIGFsbG9jYXRvcnM6IHt9XG59O1xuXG4vKipcbiAqIEFkZCBhbiBFbnRpdHkgd2l0aCBhIENvbnRhaW5lciBjb21wb25lbnQgdG8gdGhlIHF1ZXVlIHRvIGJlXG4gKiAgYWRkZWQgaW50byB0aGUgRE9NLlxuICpcbiAqIEBtZXRob2QgZGVwbG95Q29udGFpbmVyXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgbmVlZHMgdG8gYmUgZGVwbG95ZWRcbiAqL1xuRE9NUmVuZGVyZXIuZGVwbG95Q29udGFpbmVyID0gZnVuY3Rpb24gZGVwbG95Q29udGFpbmVyKGVudGl0eSkge1xuICAgIHRoaXMuX3F1ZXVlcy5jb250YWluZXJzLmRlcGxveS5wdXNoKGVudGl0eSk7XG4gICAgY29udGFpbmVyc1RvU3VyZmFjZXNbZW50aXR5Ll9pZF0gID0ge307XG4gICAgdGhpcy5fcXVldWVzLnN1cmZhY2VzW2VudGl0eS5faWRdID0ge1xuICAgICAgICB1cGRhdGU6IFtdLFxuICAgICAgICByZWNhbGw6IFtdLFxuICAgICAgICBkZXBsb3k6IFtdXG4gICAgfTtcbn07XG5cbi8vIERlcGxveSBhIGdpdmVuIEVudGl0eSdzIENvbnRhaW5lciB0byB0aGUgRE9NLlxuZnVuY3Rpb24gX2RlcGxveUNvbnRhaW5lcihlbnRpdHkpIHtcbiAgICB2YXIgY29udGV4dCA9IGVudGl0eS5nZXRDb250ZXh0KCk7XG5cbiAgICAvLyBJZiB0aGUgQ29udGFpbmVyIGhhcyBub3QgcHJldmlvdXNseSBiZWVuIGRlcGxveSBhbmRcbiAgICAvLyBkb2VzIG5vdCBoYXZlIGFuIGFsbG9jYXRvciwgY3JlYXRlIG9uZS5cbiAgICBpZiAoIURPTVJlbmRlcmVyLmFsbG9jYXRvcnNbY29udGV4dC5faWRdKVxuICAgICAgICBET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRleHQuX2lkXSA9IG5ldyBFbGVtZW50QWxsb2NhdG9yKGNvbnRleHQuX3BhcmVudEVsKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgRE9NIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBDb250YWluZXJcbiAgICB2YXIgZWxlbWVudCA9IERPTVJlbmRlcmVyLmFsbG9jYXRvcnNbY29udGV4dC5faWRdLmFsbG9jYXRlKERJVik7XG4gICAgY29udGFpbmVyc1RvRWxlbWVudHNbZW50aXR5Ll9pZF0gPSBlbGVtZW50O1xuICAgIF91cGRhdGVDb250YWluZXIoZW50aXR5LCBlbGVtZW50KTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoRkFfQ09OVEFJTkVSKTtcblxuICAgIERPTVJlbmRlcmVyLmFsbG9jYXRvcnNbZW50aXR5Ll9pZF0gPSBuZXcgRWxlbWVudEFsbG9jYXRvcihlbGVtZW50KTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gRW50aXR5IHdpdGggYSBDb250YWluZXIgY29tcG9uZW50IHRvIHRoZSBxdWV1ZSB0byBiZVxuICogIHJlbW92ZWQgZnJvbSB0aGUgRE9NLlxuICpcbiAqIEBtZXRob2QgcmVjYWxsQ29udGFpbmVyXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgbmVlZHMgdG8gYmUgcmVjYWxsZWRcbiAqL1xuRE9NUmVuZGVyZXIucmVjYWxsQ29udGFpbmVyID0gZnVuY3Rpb24gcmVjYWxsQ29udGFpbmVyKGVudGl0eSkge1xuICAgIHRoaXMuX3F1ZXVlcy5jb250YWluZXJzLnJlY2FsbC5wdXNoKGVudGl0eSk7XG4gICAgZGVsZXRlIHRoaXMuX3F1ZXVlcy5zdXJmYWNlc1tlbnRpdHkuX2lkXTtcbn07XG5cbi8vIFJlY2FsbCB0aGUgRE9NIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBFbnRpdHkncyBDb250YWluZXJcbi8vIGFuZCBjbGVhbiB1cCByZWZlcmVuY2VzLlxuZnVuY3Rpb24gX3JlY2FsbENvbnRhaW5lcihlbnRpdHkpIHtcbiAgICB2YXIgZWxlbWVudCA9IGNvbnRhaW5lcnNUb0VsZW1lbnRzW2VudGl0eS5faWRdO1xuICAgIHZhciBjb250ZXh0ID0gZW50aXR5LmdldENvbnRleHQoKTtcbiAgICBET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRleHQuX2lkXS5kZWFsbG9jYXRlKGVsZW1lbnQpO1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShGQV9DT05UQUlORVIpO1xuICAgIGRlbGV0ZSBET01SZW5kZXJlci5hbGxvY2F0b3JzW2VudGl0eS5faWRdO1xufVxuXG4vKipcbiAqIEFkZCBhbiBFbnRpdHkgd2l0aCBhIENvbnRhaW5lciBjb21wb25lbnQgdG8gdGhlIHF1ZXVlIHRvIGJlXG4gKiAgdXBkYXRlZC5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZUNvbnRhaW5lclxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IG5lZWRzIHRvIGJlIHVwZGF0ZWRcbiAqL1xuRE9NUmVuZGVyZXIudXBkYXRlQ29udGFpbmVyID0gZnVuY3Rpb24gdXBkYXRlQ29udGFpbmVyKGVudGl0eSkge1xuICAgIHRoaXMuX3F1ZXVlcy5jb250YWluZXJzLnVwZGF0ZS5wdXNoKGVudGl0eSk7XG59O1xuXG4vLyBVcGRhdGUgdGhlIENvbnRhaW5lcidzIERPTSBwcm9wZXJ0aWVzXG5mdW5jdGlvbiBfdXBkYXRlQ29udGFpbmVyKGVudGl0eSkge1xuICAgIHZhciBjb250YWluZXIgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KENPTlRBSU5FUiksXG4gICAgICAgIGVsZW1lbnQgICA9IGNvbnRhaW5lcnNUb0VsZW1lbnRzW2VudGl0eS5faWRdLFxuICAgICAgICBpICAgICAgICAgPSAwLFxuICAgICAgICBzaXplLFxuICAgICAgICBvcmlnaW4sXG4gICAgICAgIGNvbnRleHRTaXplO1xuXG4gICAgaWYgKGNvbnRhaW5lci5fZXZlbnRzLmRpcnR5KSB7XG4gICAgICAgIGkgPSBjb250YWluZXIuX2V2ZW50cy5vbi5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChjb250YWluZXIuX2V2ZW50cy5vZmYubGVuZ3RoKSBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGFpbmVyLl9ldmVudHMub2ZmLnBvcCgpLCBjb250YWluZXIuX2V2ZW50cy5mb3J3YXJkZXIpO1xuICAgICAgICB3aGlsZSAoaS0tKSBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGFpbmVyLl9ldmVudHMub25baV0sIGNvbnRhaW5lci5fZXZlbnRzLmZvcndhcmRlcik7XG4gICAgICAgIGNvbnRhaW5lci5fZXZlbnRzLmRpcnR5ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRhaW5lci5fc2l6ZURpcnR5IHx8IGNvbnRhaW5lci5fdHJhbnNmb3JtRGlydHkpIHtcbiAgICAgICAgY29udGV4dFNpemUgPSBlbnRpdHkuZ2V0Q29udGV4dCgpLl9zaXplO1xuICAgICAgICBzaXplICAgICAgICA9IGNvbnRhaW5lci5nZXRDU1NTaXplKCk7XG4gICAgICAgIG9yaWdpbiAgICAgID0gY29udGFpbmVyLm9yaWdpbjtcbiAgICB9XG5cbiAgICBpZiAoY29udGFpbmVyLl9zaXplRGlydHkpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS53aWR0aCAgPSBzaXplWzBdICsgUFg7XG4gICAgICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gc2l6ZVsxXSArIFBYO1xuICAgICAgICBjb250YWluZXIuX3NpemVEaXJ0eSA9IGZhbHNlO1xuICAgICAgICBjb250YWluZXIuX3NldFZlcnRleERpc3BsYWNlbWVudChlbGVtZW50Lm9mZnNldFdpZHRoLCBlbGVtZW50Lm9mZnNldEhlaWdodCk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRhaW5lci5fdHJhbnNmb3JtRGlydHkpIHtcbiAgICAgICAgdmFyIHRyYW5zZm9ybSAgICAgICAgICAgICAgID0gRE9NUmVuZGVyZXIuY3JlYXRlRE9NTWF0cml4KGVudGl0eS5nZXRDb21wb25lbnQoVFJBTlNGT1JNKS5fbWF0cml4LCBjb250ZXh0U2l6ZSwgc2l6ZSwgb3JpZ2luKTtcbiAgICAgICAgZWxlbWVudC5zdHlsZVtDU1NUUkFOU0ZPUk1dID0gRE9NUmVuZGVyZXIuc3RyaW5naWZ5TWF0cml4KHRyYW5zZm9ybSk7XG4gICAgICAgIGNvbnRhaW5lci5fdHJhbnNmb3JtRGlydHkgPSBmYWxzZTtcblxuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGNvbnRhaW5lcnNUb1N1cmZhY2VzW2VudGl0eS5faWRdKTtcbiAgICAgICAgaSAgICAgICAgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSlcbiAgICAgICAgICAgIGlmIChjb250YWluZXJzVG9TdXJmYWNlc1tlbnRpdHkuX2lkXVtrZXlzW2ldXSlcbiAgICAgICAgICAgICAgICBjb250YWluZXJzVG9TdXJmYWNlc1tlbnRpdHkuX2lkXVtrZXlzW2ldXS5nZXRDb21wb25lbnQoU1VSRkFDRSkuaW52YWxpZGF0aW9ucyB8PSBTdXJmYWNlLmludmFsaWRhdGlvbnMudHJhbnNmb3JtO1xuICAgIH1cbn1cblxuLyoqXG4gKiBBZGQgYW4gRW50aXR5IHdpdGggYSBTdXJmYWNlIHRvIHRoZSBxdWV1ZSB0byBiZSBkZXBsb3llZFxuICogIHRvIGEgcGFydGljdWxhciBDb250YWluZXIuXG4gKlxuICogQG1ldGhvZCBkZXBsb3lcbiAqIFxuICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSBFbnRpdHkgdGhhdCBuZWVkcyB0byBiZSBkZXBsb3llZFxuICogQHBhcmFtIHtFbnRpdHl9IGNvbnRhaW5lciBFbnRpdHkgdGhhdCB0aGUgU3VyZmFjZSB3aWxsIGJlIGRlcGxveWVkIHRvXG4gKi9cbkRPTVJlbmRlcmVyLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShlbnRpdHksIGNvbnRhaW5lcikge1xuICAgIGlmICghc3VyZmFjZXNUb0VsZW1lbnRzW2VudGl0eS5faWRdKSBzdXJmYWNlc1RvRWxlbWVudHNbZW50aXR5Ll9pZF0gPSB7fTtcbiAgICBET01SZW5kZXJlci5fcXVldWVzLnN1cmZhY2VzW2NvbnRhaW5lci5faWRdLmRlcGxveS5wdXNoKGVudGl0eSk7XG4gICAgY29udGFpbmVyc1RvU3VyZmFjZXNbY29udGFpbmVyLl9pZF1bZW50aXR5Ll9pZF0gPSBlbnRpdHk7XG59O1xuXG4vLyBEZXBsb3lzIHRoZSBFbnRpdHkncyBTdXJmYWNlIHRvIGEgcGFydGljdWxhciBDb250YWluZXIuXG5mdW5jdGlvbiBfZGVwbG95KGVudGl0eSwgY29udGFpbmVySUQpIHtcbiAgICB2YXIgZWxlbWVudCA9IERPTVJlbmRlcmVyLmFsbG9jYXRvcnNbY29udGFpbmVySURdLmFsbG9jYXRlKGVudGl0eS5nZXRDb21wb25lbnQoU1VSRkFDRSkudGFnTmFtZSB8fCBESVYpO1xuICAgIGVudGl0eS5nZXRDb21wb25lbnQoU1VSRkFDRSkuaW52YWxpZGF0ZUFsbCgpO1xuICAgIHN1cmZhY2VzVG9FbGVtZW50c1tlbnRpdHkuX2lkXVtjb250YWluZXJJRF0gPSBlbGVtZW50O1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChGQV9TVVJGQUNFKTtcbiAgICBfdXBkYXRlKGVudGl0eSwgY29udGFpbmVySUQpO1xufVxuXG4vKipcbiAqIEFkZCBhbiBFbnRpdHkgd2l0aCBhIFN1cmZhY2UgdG8gdGhlIHF1ZXVlIHRvIGJlIHJlY2FsbGVkXG4gKiAgZnJvbSBhIHBhcnRpY3VsYXIgQ29udGFpbmVyLlxuICpcbiAqIEBtZXRob2QgcmVjYWxsXG4gKiBcbiAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHkgRW50aXR5IHRoYXQgbmVlZHMgdG8gYmUgcmVjYWxsZWQgZnJvbVxuICogQHBhcmFtIHtFbnRpdHl9IGNvbnRhaW5lciBFbnRpdHkgdGhhdCB0aGUgU3VyZmFjZSB3aWxsIGJlIHJlY2FsbGVkIGZyb21cbiAqL1xuRE9NUmVuZGVyZXIucmVjYWxsID0gZnVuY3Rpb24gcmVjYWxsKGVudGl0eSwgY29udGFpbmVyKSB7XG4gICAgRE9NUmVuZGVyZXIuX3F1ZXVlcy5zdXJmYWNlc1tjb250YWluZXIuX2lkXS5yZWNhbGwucHVzaChlbnRpdHkpO1xuICAgIGNvbnRhaW5lcnNUb1N1cmZhY2VzW2NvbnRhaW5lci5faWRdW2VudGl0eS5faWRdID0gZmFsc2U7XG59O1xuXG4vLyBSZWNhbGxzIHRoZSBFbnRpdHkncyBTdXJmYWNlIGZyb20gYSBnaXZlbiBDb250YWluZXJcbmZ1bmN0aW9uIF9yZWNhbGwoZW50aXR5LCBjb250YWluZXJJRCkge1xuICAgIHZhciBlbGVtZW50ID0gc3VyZmFjZXNUb0VsZW1lbnRzW2VudGl0eS5faWRdW2NvbnRhaW5lcklEXTtcbiAgICB2YXIgc3VyZmFjZSA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3N1cmZhY2UnKTtcbiAgICBET01SZW5kZXJlci5hbGxvY2F0b3JzW2NvbnRhaW5lcklEXS5kZWFsbG9jYXRlKGVsZW1lbnQpO1xuICAgIHZhciBpID0gc3VyZmFjZS5zcGVjLmV2ZW50cy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHN1cmZhY2Uuc3BlYy5ldmVudHNbaV0sIHN1cmZhY2UuZXZlbnRGb3J3YXJkZXIpO1xufVxuXG4vKipcbiAqIEFkZCBhbiBFbnRpdHkgd2l0aCBhIFN1cmZhY2UgdG8gdGhlIHF1ZXVlIHRvIGJlIHVwZGF0ZWRcbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICogXG4gKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IEVudGl0eSB0aGF0IG5lZWRzIHRvIGJlIHVwZGF0ZWRcbiAqIEBwYXJhbSB7RW50aXR5fSBjb250YWluZXIgRW50aXR5IHRoYXQgdGhlIFN1cmZhY2Ugd2lsbCBiZSB1cGRhdGVkIGZvclxuICovXG5ET01SZW5kZXJlci51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZW50aXR5LCBjb250YWluZXIpIHtcbiAgICBET01SZW5kZXJlci5fcXVldWVzLnN1cmZhY2VzW2NvbnRhaW5lci5faWRdLnVwZGF0ZS5wdXNoKGVudGl0eSk7XG59O1xuXG4vLyBWZXJ0ZXggY3VsbGluZyBsb2dpY1xuLy8gVE9ETyBmaWd1cmUgb3V0IHZlcnRleCBjdWxsaW5nLlxuZnVuY3Rpb24gX2lzV2l0aGluKHRhcmdldCwgZW50aXR5LCBjb250YWluZXIsIHRhcmdldFRyYW5zZm9ybSkge1xuICAgIHZhciB0YXJnZXRTaXplICAgID0gdGFyZ2V0LmdldFNpemUodGFyZ2V0VHJhbnNmb3JtLCB0cnVlKSxcbiAgICAgICAgY29udGFpbmVyU2l6ZSA9IGNvbnRhaW5lci5nZXRDb21wb25lbnQoJ2NvbnRhaW5lcicpLmdldFNpemUodm9pZCAwLCB0cnVlKTtcblxuICAgIHRhcmdldFNpemUub3JpZ2luWzBdIC09IGVudGl0eS5nZXRDb250ZXh0KCkuX3NpemVbMF0gLyAyIC0gdGFyZ2V0U2l6ZS5zaXplWzBdICogdGFyZ2V0LmdldE9yaWdpbigpWzBdO1xuICAgIHRhcmdldFNpemUub3JpZ2luWzFdIC09IGVudGl0eS5nZXRDb250ZXh0KCkuX3NpemVbMV0gLyAyIC0gdGFyZ2V0U2l6ZS5zaXplWzFdICogdGFyZ2V0LmdldE9yaWdpbigpWzFdO1xuXG4gICAgdmFyIGZ1cnRoZXN0TGVmdFRhcmdldCAgICAgID0gdGFyZ2V0U2l6ZS5vcmlnaW5bMF0gICAgKyB0YXJnZXRTaXplLmRpc3BsYWNlbWVudC5sZWZ0LFxuICAgICAgICBmdXJ0aGVzdFJpZ2h0VGFyZ2V0ICAgICA9IHRhcmdldFNpemUub3JpZ2luWzBdICAgICsgdGFyZ2V0U2l6ZS5kaXNwbGFjZW1lbnQucmlnaHQsXG4gICAgICAgIGZ1cnRoZXN0VG9wVGFyZ2V0ICAgICAgID0gdGFyZ2V0U2l6ZS5vcmlnaW5bMV0gICAgKyB0YXJnZXRTaXplLmRpc3BsYWNlbWVudC50b3AsXG4gICAgICAgIGZ1cnRoZXN0Qm90dG9tVGFyZ2V0ICAgID0gdGFyZ2V0U2l6ZS5vcmlnaW5bMV0gICAgKyB0YXJnZXRTaXplLmRpc3BsYWNlbWVudC5ib3R0b20sXG4gICAgICAgIGZ1cnRoZXN0TGVmdENvbnRhaW5lciAgID0gY29udGFpbmVyU2l6ZS5vcmlnaW5bMF0gKyBjb250YWluZXJTaXplLmRpc3BsYWNlbWVudC5sZWZ0LFxuICAgICAgICBmdXJ0aGVzdFJpZ2h0Q29udGFpbmVyICA9IGNvbnRhaW5lclNpemUub3JpZ2luWzBdICsgY29udGFpbmVyU2l6ZS5kaXNwbGFjZW1lbnQucmlnaHQsXG4gICAgICAgIGZ1cnRoZXN0VG9wQ29udGFpbmVyICAgID0gY29udGFpbmVyU2l6ZS5vcmlnaW5bMV0gKyBjb250YWluZXJTaXplLmRpc3BsYWNlbWVudC50b3AsXG4gICAgICAgIGZ1cnRoZXN0Qm90dG9tQ29udGFpbmVyID0gY29udGFpbmVyU2l6ZS5vcmlnaW5bMV0gKyBjb250YWluZXJTaXplLmRpc3BsYWNlbWVudC5ib3R0b207XG5cbiAgICB2YXIgdmFsdWUgPSBmdXJ0aGVzdExlZnRUYXJnZXQgPCBmdXJ0aGVzdFJpZ2h0Q29udGFpbmVyICYmIGZ1cnRoZXN0TGVmdFRhcmdldCA+IGZ1cnRoZXN0TGVmdENvbnRhaW5lcjtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0VG9wVGFyZ2V0ID4gZnVydGhlc3RUb3BDb250YWluZXIgJiYgZnVydGhlc3RUb3BUYXJnZXQgPCBmdXJ0aGVzdEJvdHRvbUNvbnRhaW5lcikpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmICh2YWx1ZSAmJiAoZnVydGhlc3RCb3R0b21UYXJnZXQgPiBmdXJ0aGVzdEJvdHRvbUNvbnRhaW5lciAmJiBmdXJ0aGVzdEJvdHRvbVRhcmdldCA8IGZ1cnRoZXN0VG9wQ29udGFpbmVyKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB2YWx1ZSA9IGZ1cnRoZXN0UmlnaHRUYXJnZXQgPCBmdXJ0aGVzdFJpZ2h0Q29udGFpbmVyICYmIGZ1cnRoZXN0UmlnaHRUYXJnZXQgPiBmdXJ0aGVzdExlZnRDb250YWluZXI7XG4gICAgaWYgKHZhbHVlICYmIChmdXJ0aGVzdFRvcFRhcmdldCA+IGZ1cnRoZXN0VG9wQ29udGFpbmVyICYmIGZ1cnRoZXN0VG9wVGFyZ2V0IDwgZnVydGhlc3RCb3R0b21Db250YWluZXIpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0Qm90dG9tVGFyZ2V0ID4gZnVydGhlc3RCb3R0b21Db250YWluZXIgJiYgZnVydGhlc3RCb3R0b21UYXJnZXQgPCBmdXJ0aGVzdFRvcENvbnRhaW5lcikpXG4gICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgdmFsdWUgPSBmdXJ0aGVzdExlZnRDb250YWluZXIgPCBmdXJ0aGVzdFJpZ2h0VGFyZ2V0ICYmIGZ1cnRoZXN0TGVmdENvbnRhaW5lciA+IGZ1cnRoZXN0TGVmdFRhcmdldDtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0VG9wQ29udGFpbmVyID4gZnVydGhlc3RUb3BUYXJnZXQgJiYgZnVydGhlc3RUb3BDb250YWluZXIgPCBmdXJ0aGVzdEJvdHRvbVRhcmdldCkpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmICh2YWx1ZSAmJiAoZnVydGhlc3RCb3R0b21Db250YWluZXIgPiBmdXJ0aGVzdEJvdHRvbVRhcmdldCAmJiBmdXJ0aGVzdEJvdHRvbUNvbnRhaW5lciA8IGZ1cnRoZXN0VG9wVGFyZ2V0KSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB2YWx1ZSA9IGZ1cnRoZXN0UmlnaHRDb250YWluZXIgPCBmdXJ0aGVzdFJpZ2h0VGFyZ2V0ICYmIGZ1cnRoZXN0UmlnaHRDb250YWluZXIgPiBmdXJ0aGVzdExlZnRUYXJnZXQ7XG4gICAgaWYgKHZhbHVlICYmIChmdXJ0aGVzdFRvcENvbnRhaW5lciA+IGZ1cnRoZXN0VG9wVGFyZ2V0ICYmIGZ1cnRoZXN0VG9wQ29udGFpbmVyIDwgZnVydGhlc3RCb3R0b21UYXJnZXQpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodmFsdWUgJiYgKGZ1cnRoZXN0Qm90dG9tQ29udGFpbmVyID4gZnVydGhlc3RCb3R0b21UYXJnZXQgJiYgZnVydGhlc3RCb3R0b21Db250YWluZXIgPCBmdXJ0aGVzdFRvcFRhcmdldCkpXG4gICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBVcGRhdGUgdGhlIFN1cmZhY2UgdGhhdCBpcyB0byBkZXBsb3llZCB0byBhIHBhcnRjdWxhciBDb250YWluZXJcbmZ1bmN0aW9uIF91cGRhdGUoZW50aXR5LCBjb250YWluZXJJRCkge1xuICAgIHZhciBzdXJmYWNlICAgICAgICAgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KFNVUkZBQ0UpLFxuICAgICAgICBzcGVjICAgICAgICAgICAgPSBzdXJmYWNlLnJlbmRlcigpLFxuICAgICAgICBpICAgICAgICAgICAgICAgPSAwLFxuICAgICAgICBjb250ZXh0U2l6ZSAgICAgPSBlbnRpdHkuZ2V0Q29udGV4dCgpLl9zaXplLFxuICAgICAgICBlbGVtZW50ICAgICAgICAgPSBzdXJmYWNlc1RvRWxlbWVudHNbZW50aXR5Ll9pZF1bY29udGFpbmVySURdLFxuICAgICAgICBjb250YWluZXJFbnRpdHkgPSBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkoY29udGFpbmVySUQpLFxuICAgICAgICBjb250YWluZXIgICAgICAgPSBjb250YWluZXJFbnRpdHkuZ2V0Q29tcG9uZW50KENPTlRBSU5FUiksXG4gICAgICAgIGtleTtcblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMuY2xhc3NlcyAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZWxlbWVudC5jbGFzc0xpc3QubGVuZ3RoOyBpKyspIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShlbGVtZW50LmNsYXNzTGlzdFtpXSk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBzcGVjLmNsYXNzZXMubGVuZ3RoOyAgIGkrKykgZWxlbWVudC5jbGFzc0xpc3QuYWRkKHNwZWMuY2xhc3Nlc1tpXSk7XG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChGQV9TVVJGQUNFKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5hdHRyaWJ1dGVzICYgc3BlYy5pbnZhbGlkYXRpb25zKVxuICAgICAgICBmb3IgKGtleSBpbiBzcGVjLmF0dHJpYnV0ZXMpIGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgc3BlYy5hdHRyaWJ1dGVzW2tleV0pO1xuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5wcm9wZXJ0aWVzICYgc3BlYy5pbnZhbGlkYXRpb25zKVxuICAgICAgICBmb3IgKGtleSBpbiBzcGVjLnByb3BlcnRpZXMpIGVsZW1lbnQuc3R5bGVba2V5XSA9IHNwZWMucHJvcGVydGllc1trZXldO1xuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5hdHRyaWJ1dGVzICYgc3BlYy5pbnZhbGlkYXRpb25zKVxuICAgICAgICBmb3IgKGtleSBpbiBzcGVjLmF0dHJpYnV0ZXMpIGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgc3BlYy5hdHRyaWJ1dGVzW2tleV0pO1xuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5jb250ZW50ICYgc3BlYy5pbnZhbGlkYXRpb25zKSB7XG4gICAgICAgIGlmIChzcGVjLmNvbnRlbnQgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgICB3aGlsZSAoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpIGVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQoc3BlYy5jb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGVsZW1lbnQuaW5uZXJIVE1MID0gc3BlYy5jb250ZW50O1xuICAgICAgICBzcGVjLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnNpemU7XG4gICAgfVxuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5vcGFjaXR5ICYgc3BlYy5pbnZhbGlkYXRpb25zICYmICFzcGVjLnByb3BlcnRpZXMub3BhY2l0eSlcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gZW50aXR5LmdldENvbXBvbmVudCgnb3BhY2l0eScpLl9nbG9iYWxPcGFjaXR5O1xuXG4gICAgaWYgKFN1cmZhY2UuaW52YWxpZGF0aW9ucy5vcmlnaW4gJiBzcGVjLmludmFsaWRhdGlvbnMpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZVtDU1NUUkFOU0ZPUk1fT1JJR0lOXSA9IHNwZWMub3JpZ2luWzBdLnRvRml4ZWQoMikgKiAxMDAgKyAnJSAnICsgc3BlYy5vcmlnaW5bMV0udG9GaXhlZCgyKSAqIDEwMCArICclJztcbiAgICB9XG5cbiAgICBpZiAoU3VyZmFjZS5pbnZhbGlkYXRpb25zLmV2ZW50cyAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICBpID0gc3BlYy5ldmVudHMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoc3BlYy5ldmVudHNbaV0sIHNwZWMuZXZlbnRGb3J3YXJkZXIpO1xuICAgIH1cblxuICAgIGlmIChTdXJmYWNlLmludmFsaWRhdGlvbnMuc2l6ZSAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICBpZiAoc3BlYy5zaXplICYmIHNwZWMuc2l6ZVswXSkgeyBcbiAgICAgICAgICAgIGlmIChzcGVjLnNpemVbMF0gIT09IHRydWUpIGVsZW1lbnQuc3R5bGUud2lkdGggPSBzcGVjLnNpemVbMF0gKyAncHgnO1xuICAgICAgICB9IFxuICAgICAgICBlbHNlIHsgLy8gdW5kZWZpbmVkLCBiZSB0aGUgc2l6ZSBvZiBpdCdzIHBhcmVudFxuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS53aWR0aCA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3NpemUnKS5fZ2xvYmFsU2l6ZVswXSArICdweCc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwZWMuc2l6ZSAmJiBzcGVjLnNpemVbMV0pIHtcbiAgICAgICAgICAgIGlmIChzcGVjLnNpemVbMV0gIT09IHRydWUpIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gc3BlYy5zaXplWzFdICsgJ3B4JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gZW50aXR5LmdldENvbXBvbmVudCgnc2l6ZScpLl9nbG9iYWxTaXplWzFdICsgJ3B4JztcbiAgICAgICAgfVxuICAgICAgICBzdXJmYWNlLl9zZXRWZXJ0ZXhEaXNwbGFjZW1lbnQoZWxlbWVudC5vZmZzZXRXaWR0aCwgZWxlbWVudC5vZmZzZXRIZWlnaHQpO1xuICAgICAgICBzcGVjLmludmFsaWRhdGlvbnMgfD0gU3VyZmFjZS5pbnZhbGlkYXRpb25zLnRyYW5zZm9ybTtcbiAgICB9XG5cbiAgICBpZiAoU3VyZmFjZS5pbnZhbGlkYXRpb25zLnRyYW5zZm9ybSAmIHNwZWMuaW52YWxpZGF0aW9ucykge1xuICAgICAgICB2YXIgdHJhbnNmb3JtID0gTWF0cml4TWF0aC5tdWx0aXBseShtYXRyaXhTY3JhdGNoMywgY29udGFpbmVyLmdldERpc3BsYXlNYXRyaXgoKSwgZW50aXR5LmdldENvbXBvbmVudChUUkFOU0ZPUk0pLl9tYXRyaXgpLFxuICAgICAgICAgICAgY2FtZXJhICAgID0gZW50aXR5LmdldENvbnRleHQoKS5nZXRDb21wb25lbnQoJ2NhbWVyYScpO1xuICAgICAgICB0cmFuc2Zvcm0gICAgID0gRE9NUmVuZGVyZXIuY3JlYXRlRE9NTWF0cml4KHRyYW5zZm9ybSwgY29udGV4dFNpemUsIHN1cmZhY2UuX3NpemUsIHNwZWMub3JpZ2luKTtcbiAgICAgICAgaWYgKGNhbWVyYSkge1xuICAgICAgICAgICAgdmFyIGZvY2FsUG9pbnQgICAgPSBjYW1lcmEuZ2V0T3B0aW9ucygpLnByb2plY3Rpb24uZm9jYWxQb2ludCxcbiAgICAgICAgICAgICAgICBmeCAgICAgICAgICAgID0gKGZvY2FsUG9pbnRbMF0gKyAxKSAqIDAuNSAqIGNvbnRleHRTaXplWzBdLFxuICAgICAgICAgICAgICAgIGZ5ICAgICAgICAgICAgPSAoMSAtIGZvY2FsUG9pbnRbMV0pICogMC41ICogY29udGV4dFNpemVbMV0sXG4gICAgICAgICAgICAgICAgc2NyYXRjaE1hdHJpeCA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAgMCwgMCwgMCwgMSwgMCwgZnggLSBzdXJmYWNlLl9zaXplWzBdICogc3BlYy5vcmlnaW5bMF0sICBmeSAtIHN1cmZhY2UuX3NpemVbMV0gKiBzcGVjLm9yaWdpblsxXSwgMCwgMV07XG4gICAgICAgICAgICBNYXRyaXhNYXRoLm11bHRpcGx5KHNjcmF0Y2hNYXRyaXgsIHNjcmF0Y2hNYXRyaXgsIFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAgMCwgMCwgMCwgMSwgZW50aXR5LmdldENvbnRleHQoKS5nZXRDb21wb25lbnQoJ2NhbWVyYScpLmdldFByb2plY3Rpb25UcmFuc2Zvcm0oKVsxMV0sICAwLCAwLCAwLCAxXSk7XG4gICAgICAgICAgICBNYXRyaXhNYXRoLm11bHRpcGx5KHNjcmF0Y2hNYXRyaXgsIHNjcmF0Y2hNYXRyaXgsIFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAtKGZ4IC0gc3VyZmFjZS5fc2l6ZVswXSAqIHNwZWMub3JpZ2luWzBdKSwgIC0oZnkgLSBzdXJmYWNlLl9zaXplWzFdICogc3BlYy5vcmlnaW5bMV0pLCAwLCAxXSk7XG4gICAgICAgICAgICBNYXRyaXhNYXRoLm11bHRpcGx5KHRyYW5zZm9ybSwgc2NyYXRjaE1hdHJpeCwgdHJhbnNmb3JtKTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50LnN0eWxlW0NTU1RSQU5TRk9STV0gPSBET01SZW5kZXJlci5zdHJpbmdpZnlNYXRyaXgodHJhbnNmb3JtKTtcbiAgICAgICAgLy8gc3VyZmFjZS5fY3VsbGVkID0gIV9pc1dpdGhpbihzdXJmYWNlLCBlbnRpdHksIGNvbnRhaW5lckVudGl0eSwgdHJhbnNmb3JtKTsgLy8gVE9ETyBmaWd1cmUgb3V0IHZlcnRleCBjdWxsaW5nIGFnYWluXG4gICAgfVxuICAgIHN1cmZhY2UucmVzZXRJbnZhbGlkYXRpb25zKCk7XG59XG5cbi8qKlxuICogUmVuZGVyIHdpbGwgcnVuIG92ZXIgYWxsIG9mIHRoZSBxdWV1ZXMgdGhhdCBoYXZlIGJlZW4gcG9wdWxhdGVkXG4gKiAgYnkgdGhlIFJlbmRlclN5c3RlbSBhbmQgd2lsbCBleGVjdXRlIHRoZSBkZXBsb3ltZW50LCByZWNhbGxpbmcsXG4gKiAgYW5kIHVwZGF0aW5nLlxuICpcbiAqIEBtZXRob2QgcmVuZGVyXG4gKi9cbiBET01SZW5kZXJlci5yZW5kZXIgPSBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgdmFyIHF1ZXVlLFxuICAgICAgICBjb250YWluZXJJRCxcbiAgICAgICAgaW5uZXJRdWV1ZXMsXG4gICAgICAgIHF1ZXVlcyAgICAgPSBET01SZW5kZXJlci5fcXVldWVzLFxuICAgICAgICBjb250YWluZXJzID0gT2JqZWN0LmtleXMocXVldWVzLnN1cmZhY2VzKSxcbiAgICAgICAgaiAgICAgICAgICA9IGNvbnRhaW5lcnMubGVuZ3RoLFxuICAgICAgICBpICAgICAgICAgID0gMCxcbiAgICAgICAgayAgICAgICAgICA9IDA7XG4gICAgXG4gICAgLy8gRGVwbG95IENvbnRhaW5lcnNcbiAgICBxdWV1ZSA9IHF1ZXVlcy5jb250YWluZXJzLmRlcGxveTtcbiAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSBfZGVwbG95Q29udGFpbmVyKHF1ZXVlLnNoaWZ0KCkpO1xuXG4gICAgLy8gUmVjYWxsIENvbnRhaW5lcnNcbiAgICBxdWV1ZSA9IHF1ZXVlcy5jb250YWluZXJzLnJlY2FsbDtcbiAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSBfcmVjYWxsQ29udGFpbmVyKHF1ZXVlLnNoaWZ0KCkpO1xuXG4gICAgLy8gVXBkYXRlIENvbnRhaW5lcnNcbiAgICBxdWV1ZSA9IHF1ZXVlcy5jb250YWluZXJzLnVwZGF0ZTtcbiAgICBpICAgICA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSBfdXBkYXRlQ29udGFpbmVyKHF1ZXVlLnNoaWZ0KCkpO1xuXG4gICAgLy8gRm9yIGVhY2ggQ29udGFpbmVyXG4gICAgd2hpbGUgKGotLSkge1xuICAgICAgICBjb250YWluZXJJRCA9IGNvbnRhaW5lcnNbal07XG4gICAgICAgIGlubmVyUXVldWVzID0gcXVldWVzLnN1cmZhY2VzW2NvbnRhaW5lcklEXTtcblxuICAgICAgICAvLyBEZXBsb3kgU3VyZmFjZXNcbiAgICAgICAgcXVldWUgPSBpbm5lclF1ZXVlcy5kZXBsb3k7XG4gICAgICAgIGkgICAgID0gcXVldWUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBfZGVwbG95KHF1ZXVlLnNoaWZ0KCksIGNvbnRhaW5lcklEKTtcblxuICAgICAgICAvLyBSZWNhbGwgU3VyZmFjZXNcbiAgICAgICAgcXVldWUgPSBpbm5lclF1ZXVlcy5yZWNhbGw7XG4gICAgICAgIGkgICAgID0gcXVldWUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBfcmVjYWxsKHF1ZXVlLnNoaWZ0KCksIGNvbnRhaW5lcklEKTtcblxuICAgICAgICAvLyBVcGRhdGUgU3VyZmFjZXNcbiAgICAgICAgcXVldWUgPSBpbm5lclF1ZXVlcy51cGRhdGU7XG4gICAgICAgIGkgICAgID0gcXVldWUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBfdXBkYXRlKHF1ZXVlLnNoaWZ0KCksIGNvbnRhaW5lcklEKTtcbiAgICB9XG5cbn07XG5cbi8vIEdldCB0aGUgdHlwZSBvZiBUYXJnZXRzIHRoZSBET01SZW5kZXJlciB3aWxsIHdvcmsgZm9yXG5ET01SZW5kZXJlci5nZXRUYXJnZXRzID0gZnVuY3Rpb24gZ2V0VGFyZ2V0cygpIHtcbiAgICByZXR1cm4gdGFyZ2V0cztcbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBUcmFuc2Zvcm0gbWF0cml4IGZvciBhIFN1cmZhY2UgYmFzZWQgb24gaXQgdHJhbnNmb3JtLFxuICogIHNpemUsIG9yaWdpbiwgYW5kIENvbnRleHQncyBzaXplLiAgVXNlcyBpdHMgQ29udGV4dCdzIHNpemUgdG9cbiAqICB0dXJuIGhvbW9nZW5vdXMgY29vcmRpbmF0ZSBUcmFuc2Zvcm1zIHRvIHBpeGVscy5cbiAqXG4gKiBAbWV0aG9kIGNyZWF0ZURPTU1BdHJpeFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHRyYW5zZm9ybSBUcmFuc2Zvcm0gbWF0cml4XG4gKiBAcGFyYW0ge0FycmF5fSBjb250ZXh0U2l6ZSAyLWRpbWVuc2lvbmFsIHNpemUgb2YgdGhlIENvbnRleHRcbiAqIEBwYXJhbSB7QXJyYXl9IHNpemUgc2l6ZSBvZiB0aGUgRE9NIGVsZW1lbnQgYXMgYSAzLWRpbWVuc2lvbmFsIGFycmF5XG4gKiBAcGFyYW0ge0FycmF5fSBvcmlnaW4gb3JpZ2luIG9mIHRoZSBET00gZWxlbWVudCBhcyBhIDItZGltZW5zaW9uYWwgYXJyYXlcbiAqIEBwYXJhbSB7QXJyYXl9IHJlc3VsdCBzdG9yYWdlIG9mIHRoZSBET00gYm91bmQgdHJhbnNmb3JtIG1hdHJpeFxuICovXG5ET01SZW5kZXJlci5jcmVhdGVET01NYXRyaXggPSBmdW5jdGlvbiBjcmVhdGVET01NYXRyaXgodHJhbnNmb3JtLCBjb250ZXh0U2l6ZSwgc2l6ZSwgb3JpZ2luLCByZXN1bHQpIHtcbiAgICByZXN1bHQgICAgICAgICAgICAgPSByZXN1bHQgfHwgW107XG4gICAgLy8gc2l6ZVswXSAgICAgICAgICAgLz0gMC41ICogY29udGV4dFNpemVbMF07IC8vIFRPRE86IFdlJ3JlIG5vdCB1c2luZyB0aGUgXG4gICAgLy8gc2l6ZVsxXSAgICAgICAgICAgLz0gMC41ICogY29udGV4dFNpemVbMV07XG4gICAgbWF0cml4U2NyYXRjaDFbMF0gID0gMTtcbiAgICBtYXRyaXhTY3JhdGNoMVsxXSAgPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzJdICA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbM10gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVs0XSAgPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzVdICA9IDE7XG4gICAgbWF0cml4U2NyYXRjaDFbNl0gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVs3XSAgPSAwO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzhdICA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbOV0gID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVsxMF0gPSAxO1xuICAgIG1hdHJpeFNjcmF0Y2gxWzExXSA9IDA7XG4gICAgbWF0cml4U2NyYXRjaDFbMTJdID0gLXNpemVbMF0gKiBvcmlnaW5bMF07XG4gICAgbWF0cml4U2NyYXRjaDFbMTNdID0gLXNpemVbMV0gKiBvcmlnaW5bMV07XG4gICAgbWF0cml4U2NyYXRjaDFbMTRdID0gMDtcbiAgICBtYXRyaXhTY3JhdGNoMVsxNV0gPSAxO1xuICAgIE1hdHJpeE1hdGgubXVsdGlwbHkobWF0cml4U2NyYXRjaDIsIG1hdHJpeFNjcmF0Y2gxLCB0cmFuc2Zvcm0pO1xuXG4gICAgcmVzdWx0WzBdICA9ICgobWF0cml4U2NyYXRjaDJbMF0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMF0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlswXSk7XG4gICAgcmVzdWx0WzFdICA9ICgobWF0cml4U2NyYXRjaDJbMV0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMV0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsxXSk7XG4gICAgcmVzdWx0WzJdICA9ICgobWF0cml4U2NyYXRjaDJbMl0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMl0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsyXSk7XG4gICAgcmVzdWx0WzNdICA9ICgobWF0cml4U2NyYXRjaDJbM10gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbM10gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlszXSk7XG4gICAgcmVzdWx0WzRdICA9ICgobWF0cml4U2NyYXRjaDJbNF0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbNF0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls0XSk7XG4gICAgcmVzdWx0WzVdICA9ICgobWF0cml4U2NyYXRjaDJbNV0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbNV0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls1XSk7XG4gICAgcmVzdWx0WzZdICA9ICgobWF0cml4U2NyYXRjaDJbNl0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbNl0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls2XSk7XG4gICAgcmVzdWx0WzddICA9ICgobWF0cml4U2NyYXRjaDJbN10gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbN10gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls3XSk7XG4gICAgcmVzdWx0WzhdICA9ICgobWF0cml4U2NyYXRjaDJbOF0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbOF0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls4XSk7XG4gICAgcmVzdWx0WzldICA9ICgobWF0cml4U2NyYXRjaDJbOV0gIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbOV0gID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMls5XSk7XG4gICAgcmVzdWx0WzEwXSA9ICgobWF0cml4U2NyYXRjaDJbMTBdIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMTBdID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsxMF0pO1xuICAgIHJlc3VsdFsxMV0gPSAoKG1hdHJpeFNjcmF0Y2gyWzExXSA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzExXSA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMTFdKTtcbiAgICByZXN1bHRbMTJdID0gKChtYXRyaXhTY3JhdGNoMlsxMl0gPCAwLjAwMDAwMSAmJiBtYXRyaXhTY3JhdGNoMlsxMl0gPiAtMC4wMDAwMDEpID8gWkVSTyA6IG1hdHJpeFNjcmF0Y2gyWzEyXSkgKyAwLjUgKiBjb250ZXh0U2l6ZVswXTtcbiAgICByZXN1bHRbMTNdID0gKChtYXRyaXhTY3JhdGNoMlsxM10gPCAwLjAwMDAwMSAmJiBtYXRyaXhTY3JhdGNoMlsxM10gPiAtMC4wMDAwMDEpID8gWkVSTyA6IG1hdHJpeFNjcmF0Y2gyWzEzXSkgKyAwLjUgKiBjb250ZXh0U2l6ZVsxXTtcbiAgICAvLyByZXN1bHRbMTJdID0gKE1hdGgucm91bmQoKG1hdHJpeFNjcmF0Y2gyWzEyXSArIDEpICogMC41ICogY29udGV4dFNpemVbMF0gKiBERVZJQ0VQSVhFTFJBVElPKSAvIERFVklDRVBJWEVMUkFUSU8pO1xuICAgIC8vIHJlc3VsdFsxM10gPSAoTWF0aC5yb3VuZCgobWF0cml4U2NyYXRjaDJbMTNdICsgMSkgKiAwLjUgKiBjb250ZXh0U2l6ZVsxXSAqIERFVklDRVBJWEVMUkFUSU8pIC8gREVWSUNFUElYRUxSQVRJTyk7XG4gICAgcmVzdWx0WzE0XSA9ICgobWF0cml4U2NyYXRjaDJbMTRdIDwgMC4wMDAwMDEgJiYgbWF0cml4U2NyYXRjaDJbMTRdID4gLTAuMDAwMDAxKSA/IFpFUk8gOiBtYXRyaXhTY3JhdGNoMlsxNF0pO1xuICAgIHJlc3VsdFsxNV0gPSAoKG1hdHJpeFNjcmF0Y2gyWzE1XSA8IDAuMDAwMDAxICYmIG1hdHJpeFNjcmF0Y2gyWzE1XSA+IC0wLjAwMDAwMSkgPyBaRVJPIDogbWF0cml4U2NyYXRjaDJbMTVdKTtcblxuICAgIC8vIHNpemVbMF0gKj0gMC41ICogY29udGV4dFNpemVbMF07XG4gICAgLy8gc2l6ZVsxXSAqPSAwLjUgKiBjb250ZXh0U2l6ZVsxXTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIENTUyByZXByZXNlbnRhdGlvbiBvZiBhIFRyYW5zZm9ybSBtYXRyaXhcbiAqXG4gKiBAbWV0aG9kIHN0cmluZ2lmeU1hdHJpeFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG0gVHJhbnNmb3JtIG1hdHJpeFxuICovXG5ET01SZW5kZXJlci5zdHJpbmdpZnlNYXRyaXggPSBmdW5jdGlvbiBzdHJpbmdpZnlNYXRyaXgobSkge1xuICAgIHJldHVybiBNQVRSSVgzRCArXG4gICAgICAgIG1bMF0gICsgQ09NTUEgK1xuICAgICAgICBtWzFdICArIENPTU1BICtcbiAgICAgICAgbVsyXSAgKyBDT01NQSArXG4gICAgICAgIG1bM10gICsgQ09NTUEgK1xuICAgICAgICBtWzRdICArIENPTU1BICtcbiAgICAgICAgbVs1XSAgKyBDT01NQSArXG4gICAgICAgIG1bNl0gICsgQ09NTUEgK1xuICAgICAgICBtWzddICArIENPTU1BICtcbiAgICAgICAgbVs4XSAgKyBDT01NQSArXG4gICAgICAgIG1bOV0gICsgQ09NTUEgK1xuICAgICAgICBtWzEwXSArIENPTU1BICtcbiAgICAgICAgbVsxMV0gKyBDT01NQSArXG4gICAgICAgIG1bMTJdICsgQ09NTUEgK1xuICAgICAgICBtWzEzXSArIENPTU1BICtcbiAgICAgICAgbVsxNF0gKyBDT01NQSArXG4gICAgICAgIG1bMTVdICsgQ0xPU0VfUEFSRU47XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gRE9NUmVuZGVyZXI7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogbWFya0BmYW1vLnVzXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBvYmplY3QgdG8gQ29udGFpbmVyIHRoYXQgaGFuZGxlcyB0aGUgcHJvY2VzcyBvZlxuICogICBjcmVhdGluZyBhbmQgYWxsb2NhdGluZyBET00gZWxlbWVudHMgd2l0aGluIGEgbWFuYWdlZCBkaXYuXG4gKiAgIFByaXZhdGUuXG4gKlxuICogQGNsYXNzIEVsZW1lbnRBbGxvY2F0b3JcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RE9NRWxlbWVudH0gY29udGFpbmVyIGRvY3VtZW50IGVsZW1lbnQgaW4gd2hpY2ggRmFtby51cyBjb250ZW50IHdpbGwgYmUgaW5zZXJ0ZWRcbiAqL1xuZnVuY3Rpb24gRWxlbWVudEFsbG9jYXRvcihjb250YWluZXIpIHtcbiAgICBpZiAoIWNvbnRhaW5lcikgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHRoaXMuY29udGFpbmVyICAgICA9IGNvbnRhaW5lcjtcbiAgICB0aGlzLmRldGFjaGVkTm9kZXMgPSB7fTtcbiAgICB0aGlzLm5vZGVDb3VudCAgICAgPSAwO1xufVxuXG4vKipcbiAqIEFsbG9jYXRlIGFuIGVsZW1lbnQgb2Ygc3BlY2lmaWVkIHR5cGUgZnJvbSB0aGUgcG9vbC5cbiAqXG4gKiBAbWV0aG9kIGFsbG9jYXRlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgdHlwZSBvZiBlbGVtZW50LCBlLmcuICdkaXYnXG4gKlxuICogQHJldHVybiB7RE9NRWxlbWVudH0gYWxsb2NhdGVkIGRvY3VtZW50IGVsZW1lbnRcbiAqL1xuRWxlbWVudEFsbG9jYXRvci5wcm90b3R5cGUuYWxsb2NhdGUgPSBmdW5jdGlvbiBhbGxvY2F0ZSh0eXBlKSB7XG4gICAgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAoISh0eXBlIGluIHRoaXMuZGV0YWNoZWROb2RlcykpIHRoaXMuZGV0YWNoZWROb2Rlc1t0eXBlXSA9IFtdO1xuICAgIHZhciBub2RlU3RvcmUgPSB0aGlzLmRldGFjaGVkTm9kZXNbdHlwZV07XG4gICAgdmFyIHJlc3VsdDtcbiAgICBpZiAobm9kZVN0b3JlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVzdWx0ID0gbm9kZVN0b3JlLnBvcCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodHlwZSk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKHJlc3VsdCk7XG4gICAgfVxuICAgIHRoaXMubm9kZUNvdW50Kys7XG4gICAgcmVzdWx0LnN0eWxlLmRpc3BsYXkgPSAnJzsgICAgXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogRGUtYWxsb2NhdGUgYW4gZWxlbWVudCBvZiBzcGVjaWZpZWQgdHlwZSB0byB0aGUgcG9vbC5cbiAqXG4gKiBAbWV0aG9kIGRlYWxsb2NhdGVcbiAqXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR9IGVsZW1lbnQgZG9jdW1lbnQgZWxlbWVudCB0byBkZWFsbG9jYXRlXG4gKi9cbkVsZW1lbnRBbGxvY2F0b3IucHJvdG90eXBlLmRlYWxsb2NhdGUgPSBmdW5jdGlvbiBkZWFsbG9jYXRlKGVsZW1lbnQpIHtcbiAgICB2YXIgbm9kZVR5cGUgPSBlbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIG5vZGVTdG9yZSA9IHRoaXMuZGV0YWNoZWROb2Rlc1tub2RlVHlwZV07XG4gICAgbm9kZVN0b3JlLnB1c2goZWxlbWVudCk7XG4gICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIGVsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcnO1xuICAgIGVsZW1lbnQuc3R5bGUud2lkdGggICA9ICcnO1xuICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ICA9ICcnO1xuICAgIHRoaXMubm9kZUNvdW50LS07XG59O1xuXG4vKipcbiAqIEdldCBjb3VudCBvZiB0b3RhbCBhbGxvY2F0ZWQgbm9kZXMgaW4gdGhlIGRvY3VtZW50LlxuICpcbiAqIEBtZXRob2QgZ2V0Tm9kZUNvdW50XG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0b3RhbCBub2RlIGNvdW50XG4gKi9cbkVsZW1lbnRBbGxvY2F0b3IucHJvdG90eXBlLmdldE5vZGVDb3VudCA9IGZ1bmN0aW9uIGdldE5vZGVDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlQ291bnQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVsZW1lbnRBbGxvY2F0b3I7IiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcnM6IGFkbmFuQGZhbW8udXMsXG4gKlxuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgSU5ESUNFUyAgICAgICAgPSAnaW5kaWNlcyc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgR2VvbWV0cnkgICAgICAgPSByZXF1aXJlKCcuLi8uLi9nbC9HZW9tZXRyeScpO1xudmFyIFRleHR1cmUgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vZ2wvVGV4dHVyZScpO1xudmFyIFNoYWRlciAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vZ2wvU2hhZGVyJyk7XG52YXIgQnVmZmVyICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9nbC9CdWZmZXInKTtcbnZhciBUaW1lU3lzdGVtICAgICA9IHJlcXVpcmUoJy4uL1N5c3RlbXMvVGltZVN5c3RlbScpO1xuXG52YXIgTWF0ZXJpYWxzICAgICAgPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdNYXRlcmlhbHMnKTtcbnZhciBHZW9tZXRyaWVzICAgICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0dlb21ldHJpZXMnKTtcbnZhciBMaWdodHMgICAgICAgICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0xpZ2h0cycpO1xudmFyIEZYQ29tcG9zZXJzICAgID0gRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignZngnKTtcbnZhciBDb250ZXh0cyAgICAgICA9IEVudGl0eVJlZ2lzdHJ5LmdldENvbGxlY3Rpb24oJ0NvbnRleHRzJyk7XG5cbnZhciBXZWJHTFJlbmRlcmVyICAgPSB7fTtcbnZhciBCdWZmZXJSZWdpc3RyeSAgPSB7fTtcbnZhciBUZXh0dXJlUmVnaXN0cnkgPSB7fTtcblxudmFyIGlkZW50aXR5TWF0cml4ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xudmFyIG1vdXNlICAgICAgICAgID0gWy41LCAuNV07XG53aW5kb3cudGV4dHVyZSA9IFRleHR1cmVSZWdpc3RyeTtcblxudmFyIGxpZ2h0Q29sb3JzICAgID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xudmFyIGxpZ2h0UG9zaXRpb25zID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xudmFyIGltYWdlQ2FjaGUgPSBbXTtcbnZhciB0ZXhDYWNoZSA9IFtdO1xudmFyIGJvdW5kVGV4dHVyZTtcbnZhciBjaGVja2VyQm9hcmQgPSAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKS5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGMuY2FudmFzLndpZHRoID0gYy5jYW52YXMuaGVpZ2h0ID0gMTI4O1xuICAgIGZvciAodmFyIHkgPSAwOyB5IDwgYy5jYW52YXMuaGVpZ2h0OyB5ICs9IDE2KSB7XG4gICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGMuY2FudmFzLndpZHRoOyB4ICs9IDE2KSB7XG4gICAgICAgIGMuZmlsbFN0eWxlID0gKHggXiB5KSAmIDE2ID8gJyNGRkYnIDogJyNEREQnO1xuICAgICAgICBjLmZpbGxSZWN0KHgsIHksIDE2LCAxNik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjLmNhbnZhcztcbn0pKCk7XG5cbldlYkdMUmVuZGVyZXIuZHJhdyA9IGZ1bmN0aW9uIGRyYXcoc3BlYykge1xuICAgIHZhciB2ZXJ0ZXhCdWZmZXJzID0gQnVmZmVyUmVnaXN0cnlbc3BlYy5pZF0gfHwgKEJ1ZmZlclJlZ2lzdHJ5W3NwZWMuaWRdID0ge30pO1xuXG4gICAgZm9yICh2YXIgbmFtZSBpbiBzcGVjLnZlcnRleEJ1ZmZlcnMpIHtcbiAgICAgICAgaWYgKCEgc3BlYy5pbnZhbGlkYXRpb25zW25hbWVdKSBjb250aW51ZTtcbiAgICAgICAgc3BlYy5pbnZhbGlkYXRpb25zW25hbWVdID0gdm9pZCAwO1xuXG4gICAgICAgIHZhciBpc0luZGV4ID0gbmFtZSA9PT0gSU5ESUNFUztcbiAgICAgICAgaWYgKCEgdmVydGV4QnVmZmVyc1tuYW1lXSkge1xuICAgICAgICAgICAgdmVydGV4QnVmZmVyc1tuYW1lXSA9IG5ldyBCdWZmZXIoXG4gICAgICAgICAgICAgICAgaXNJbmRleD8gdGhpcy5nbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiA6IHRoaXMuZ2wuQVJSQVlfQlVGRkVSLFxuICAgICAgICAgICAgICAgIGlzSW5kZXggPyBVaW50MTZBcnJheSA6IEZsb2F0MzJBcnJheSxcbiAgICAgICAgICAgICAgICB0aGlzLmdsLFxuICAgICAgICAgICAgICAgIGlzSW5kZXggPyAxIDogc3BlYy52ZXJ0ZXhCdWZmZXJzW25hbWVdWzBdLmxlbmd0aFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZlcnRleEJ1ZmZlcnNbbmFtZV0uZGF0YSA9IHNwZWMudmVydGV4QnVmZmVyc1tuYW1lXTtcbiAgICAgICAgdmVydGV4QnVmZmVyc1tuYW1lXS5zdWJEYXRhKCk7XG4gICAgfVxuXG4gICAgdGhpcy5nbC5kZXB0aE1hc2soISBzcGVjLnVuaWZvcm1zLm9wYWNpdHkgPCAxKTtcbiAgICBcbiAgICB0aGlzLnNoYWRlci5zZXRVbmlmb3JtcyhzcGVjLnVuaWZvcm1zKTtcblxuICAgIGlmIChUZXh0dXJlUmVnaXN0cnlbc3BlYy5pZF0gJiYgYm91bmRUZXh0dXJlICE9PSBUZXh0dXJlUmVnaXN0cnlbc3BlYy5pZF0pXG4gICAgICAgIGJvdW5kVGV4dHVyZSA9IFRleHR1cmVSZWdpc3RyeVtzcGVjLmlkXS5iaW5kKCk7XG5cbiAgICB0aGlzLmRyYXdCdWZmZXJzKEJ1ZmZlclJlZ2lzdHJ5W3NwZWMuaWRdLCB0aGlzLmdsW3NwZWMudHlwZV0pO1xufTtcblxuV2ViR0xSZW5kZXJlci5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGk7XG5cbiAgICBpZiAoISB0aGlzLmdsKSByZXR1cm47XG4gICAgdGhpcy5zaGFkZXIuc2V0VW5pZm9ybXMoe1xuICAgICAgICBtb3VzZTogbW91c2UsXG4gICAgICAgIHRpbWU6IFRpbWVTeXN0ZW0uZ2V0RWxhcHNlZFJlbGF0aXZlVGltZSgpXG4gICAgfSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgTGlnaHRzLmVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbnRpdHkgPSBMaWdodHMuZW50aXRpZXNbaV07XG4gICAgICAgIHZhciBsaWdodCA9IGVudGl0eS5nZXRDb21wb25lbnQoJ2xpZ2h0Jyk7XG4gICAgICAgIHZhciBpbmRleCA9IGkgKiAzO1xuXG4gICAgICAgIGxpZ2h0UG9zaXRpb25zW2luZGV4ICsgMF0gPSBsaWdodC5fc3BlYy5wb3NpdGlvblswXTtcbiAgICAgICAgbGlnaHRQb3NpdGlvbnNbaW5kZXggKyAxXSA9IGxpZ2h0Ll9zcGVjLnBvc2l0aW9uWzFdO1xuICAgICAgICBsaWdodFBvc2l0aW9uc1tpbmRleCArIDJdID0gbGlnaHQuX3NwZWMucG9zaXRpb25bMl07XG5cbiAgICAgICAgbGlnaHRDb2xvcnNbaW5kZXggKyAwXSA9IGxpZ2h0Ll9zcGVjLmNvbG9yWzBdO1xuICAgICAgICBsaWdodENvbG9yc1tpbmRleCArIDFdID0gbGlnaHQuX3NwZWMuY29sb3JbMV07XG4gICAgICAgIGxpZ2h0Q29sb3JzW2luZGV4ICsgMl0gPSBsaWdodC5fc3BlYy5jb2xvclsyXTtcbiAgICB9XG5cbiAgICB0aGlzLnNoYWRlci5zZXRVbmlmb3Jtcyh7XG4gICAgICAgIGxpZ2h0UG9zaXRpb25zOiBsaWdodFBvc2l0aW9ucyxcbiAgICAgICAgbGlnaHRDb2xvcnMgICA6IGxpZ2h0Q29sb3JzLFxuICAgICAgICBudW1MaWdodHMgICAgIDogaVxuICAgIH0pO1xuICAgIFxuICAgIGZvciAoaSA9IDA7IGkgPCBHZW9tZXRyaWVzLmVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbnRpdHkgPSBHZW9tZXRyaWVzLmVudGl0aWVzW2ldO1xuICAgICAgICB2YXIgY29udGV4dCA9IGVudGl0eS5nZXRDb250ZXh0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29udGV4dCkgdGhpcy5zaGFkZXIuc2V0VW5pZm9ybXMoe1xuICAgICAgICAgICAgcGVyc3BlY3RpdmU6IGFwcGx5UHJvamVjdGlvbihlbnRpdHksIGNvbnRleHQpLFxuICAgICAgICAgICAgcmVzb2x1dGlvbjogY29udGV4dC5fc2l6ZSxcbiAgICAgICAgICAgIGNhbWVyYVBvczogY29udGV4dC5fY29tcG9uZW50cy5jYW1lcmEuZ2V0T3B0aW9ucygpLnByb2plY3Rpb24uZm9jYWxQb2ludFxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgc3BlYyA9IGVudGl0eS5fY29tcG9uZW50cy5nZW9tZXRyeS5yZW5kZXIoKTtcblxuICAgICAgICBpZiAoc3BlYy5vaG5vZSlcbiAgICAgICAgICAgIHRoaXMuUlRUKHRoaXMuZHJhdywgc3BlYywgY29udGV4dCwgcHAuYmFjayk7XG5cbiAgICAgICAgaWYgKHNwZWMub2Zmc2NyZWVuKVxuICAgICAgICAgICAgdGhpcy5SVFQodGhpcy5kcmF3LCBzcGVjLCBjb250ZXh0LCBwcC5mcm9udCk7XG5cbiAgICAgICAgZWxzZSB0aGlzLmRyYXcoc3BlYyk7XG4gICAgfVxufTtcblxuV2ViR0xSZW5kZXJlci5kcmF3QnVmZmVycyA9IGZ1bmN0aW9uIGRyYXdCdWZmZXJzKHZlcnRleEJ1ZmZlcnMsIG1vZGUpIHtcbiAgICB2YXIgbGVuZ3RoID0gMDtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBpbmRleEJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnMuaW5kaWNlcztcbiAgICB2YXIgYXR0cmlidXRlO1xuXG4gICAgZm9yIChhdHRyaWJ1dGUgaW4gdmVydGV4QnVmZmVycykge1xuICAgICAgICBpZiAoYXR0cmlidXRlID09IElORElDRVMpIGNvbnRpbnVlO1xuICAgICAgICB2YXIgYnVmZmVyID0gdmVydGV4QnVmZmVyc1thdHRyaWJ1dGVdO1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLnNoYWRlci5hdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gfHwgZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5zaGFkZXIucHJvZ3JhbSwgJ2FfJyArIGF0dHJpYnV0ZSk7XG4gICAgICAgIGlmIChsb2NhdGlvbiA9PSAtMSB8fCAhIGJ1ZmZlci5idWZmZXIpIGNvbnRpbnVlO1xuICAgICAgICB0aGlzLnNoYWRlci5hdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPSBsb2NhdGlvbjtcbiAgICAgICAgZ2wuYmluZEJ1ZmZlcihidWZmZXIudGFyZ2V0LCBidWZmZXIuYnVmZmVyKTtcbiAgICAgICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkobG9jYXRpb24pO1xuICAgICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKGxvY2F0aW9uLCBidWZmZXIuYnVmZmVyLnNwYWNpbmcsIGdsLkZMT0FULCBnbC5GQUxTRSwgMCwgMCk7XG4gICAgICAgIGxlbmd0aCA9IGJ1ZmZlci5idWZmZXIubGVuZ3RoIC8gMTtcbiAgICB9XG5cbiAgICBmb3IgKGF0dHJpYnV0ZSBpbiB0aGlzLnNoYWRlci5hdHRyaWJ1dGVzKVxuICAgICAgICBpZiAoISB2ZXJ0ZXhCdWZmZXJzW2F0dHJpYnV0ZV0pIGdsLmRpc2FibGVWZXJ0ZXhBdHRyaWJBcnJheSh0aGlzLnNoYWRlci5hdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pO1xuXG4gICAgaWYgKGxlbmd0aCkge1xuICAgICAgICBpZiAoaW5kZXhCdWZmZXIpXG4gICAgICAgICAgICBnbC5iaW5kQnVmZmVyKGluZGV4QnVmZmVyLnRhcmdldCwgaW5kZXhCdWZmZXIuYnVmZmVyKSxcbiAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhtb2RlLCBpbmRleEJ1ZmZlci5idWZmZXIubGVuZ3RoLCBnbC5VTlNJR05FRF9TSE9SVCwgMCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZ2wuZHJhd0FycmF5cyhtb2RlLCAwLCBsZW5ndGgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuV2ViR0xSZW5kZXJlci5nZXRUYXJnZXRzID0gZnVuY3Rpb24gZ2V0VGFyZ2V0cygpIHtcbiAgICByZXR1cm4gW0dlb21ldHJ5LnRvU3RyaW5nKCldO1xufTtcblxuV2ViR0xSZW5kZXJlci5pbml0ICA9IGZ1bmN0aW9uIGluaXQob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHsgYWxwaGE6IHRydWUgfTtcblxuICAgIHZhciBjYW52YXMgICA9IG9wdGlvbnMuY2FudmFzO1xuICAgIHZhciBwYXJlbnRFbCA9IG9wdGlvbnMucGFyZW50RWwgfHwgZG9jdW1lbnQuYm9keTtcblxuICAgIGlmICghIGNhbnZhcykge1xuICAgICAgICBjYW52YXMgICAgICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIGNhbnZhcy5jbGFzc05hbWUgPSAnR0wnO1xuICAgICAgICBjYW52YXMud2lkdGggICAgID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgICAgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgfVxuXG4gICAgcGFyZW50RWwuYXBwZW5kQ2hpbGQoY2FudmFzKTtcblxuICAgIHZhciBnbCA9IHRoaXMuZ2wgPSBjYW52YXMuZ2V0Q29udGV4dCgnd2ViZ2wnLCBvcHRpb25zKSB8fCBjYW52YXMuZ2V0Q29udGV4dCgnZXhwZXJpbWVudGFsLXdlYmdsJywgb3B0aW9ucyk7XG4gICAgaWYgKCEgZ2wpIHJldHVybiBjb25zb2xlLmxvZygnV2ViR0wgbm90IHN1cHBvcnRlZCcpO1xuXG4gICAgZnVuY3Rpb24gbW91c2VkKGUpIHtcbiAgICAgICAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoKSBlID0gZS50b3VjaGVzWzBdO1xuICAgICAgICBtb3VzZVswXSA9IChlLnggfHwgZS5jbGllbnRYKSAgLyBpbm5lcldpZHRoO1xuICAgICAgICBtb3VzZVsxXSA9IDEuIC0gKGUueSB8fCBlLmNsaWVudFkpIC8gaW5uZXJIZWlnaHQ7XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBtb3VzZWQpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBtb3VzZWQpO1xuXG4gICAgdGhpcy5zaGFkZXIgPSBuZXcgU2hhZGVyKGdsKTtcblxuICAgIGdsLnBvbHlnb25PZmZzZXQoMC4xLCAwLjEpO1xuICAgIGdsLmVuYWJsZShnbC5QT0xZR09OX09GRlNFVF9GSUxMKTtcbiAgICBnbC52aWV3cG9ydCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgIGdsLmVuYWJsZShnbC5ERVBUSF9URVNUKTtcbiAgICBnbC5lbmFibGUoZ2wuQkxFTkQpO1xuICAgIC8vIGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xuICAgIC8vIGdsLmRlcHRoRnVuYyhnbC5MRVFVQUwpO1xuICAgIFxuICAgIGdsLmVuYWJsZShnbC5DVUxMX0ZBQ0UpO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1hdGVyaWFscy5vbignZW50aXR5QWRkZWQnLCBmdW5jdGlvbiAoZW50aXR5KSB7XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbWF0ZXJpYWwgPSBlbnRpdHkuX2NvbXBvbmVudHMubWF0ZXJpYWw7XG4gICAgICAgICAgICB2YXIgaW1hZ2UgPSBtYXRlcmlhbC5vcHRpb25zLmltYWdlO1xuICAgICAgICAgICAgc2VsZi5zaGFkZXIucmVzZXRQcm9ncmFtKCk7XG5cbiAgICAgICAgICAgIGlmICghIGltYWdlKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoaW1hZ2UuYmluZCkgcmV0dXJuIFRleHR1cmVSZWdpc3RyeVttYXRlcmlhbC5lbnRpdHldID0gaW1hZ2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBpZHggPSBpbWFnZUNhY2hlLmluZGV4T2YoaW1hZ2UpO1xuICAgICAgICAgICAgaWYgKGlkeCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBpbWFnZUNhY2hlLnB1c2goaW1hZ2UpO1xuICAgICAgICAgICAgICAgIHZhciB0ZXggPSBuZXcgVGV4dHVyZShzZWxmLmdsLCBjaGVja2VyQm9hcmQpO1xuICAgICAgICAgICAgICAgIHRleC5zZXRJbWFnZShjaGVja2VyQm9hcmQpO1xuICAgICAgICAgICAgICAgIHRleENhY2hlLnB1c2godGV4KTtcbiAgICAgICAgICAgICAgICBsb2FkSW1hZ2UoaW1hZ2UsIGZ1bmN0aW9uIChpbWcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGV4LnNldEltYWdlKGltZyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFRleHR1cmVSZWdpc3RyeVttYXRlcmlhbC5lbnRpdHldID0gdGV4Q2FjaGVbaWR4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZ2w7XG59O1xuXG5XZWJHTFJlbmRlcmVyLlJUVCA9IGZ1bmN0aW9uKGNiLCBzcGVjLCBjb250ZXh0LCB0ZXh0dXJlKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgdiA9IGNvbnRleHQuX3NpemU7XG5cbiAgICB2YXIgZnJhbWVidWZmZXIgID0gdGhpcy5mcmFtZWJ1ZmZlciA/IHRoaXMuZnJhbWVidWZmZXIgOiB0aGlzLmZyYW1lYnVmZmVyID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcbiAgICB2YXIgcmVuZGVyYnVmZmVyID0gdGhpcy5yZW5kZXJidWZmZXIgPyB0aGlzLnJlbmRlcmJ1ZmZlciA6IHRoaXMucmVuZGVyYnVmZmVyID0gZ2wuY3JlYXRlUmVuZGVyYnVmZmVyKCk7XG5cbiAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIGZyYW1lYnVmZmVyKTtcbiAgICBnbC5iaW5kUmVuZGVyYnVmZmVyKGdsLlJFTkRFUkJVRkZFUiwgcmVuZGVyYnVmZmVyKTtcblxuICAgIGlmICh2WzBdICE9IHJlbmRlcmJ1ZmZlci53aWR0aCB8fCB2WzFdICE9IHJlbmRlcmJ1ZmZlci5oZWlnaHQpIHtcbiAgICAgICAgcmVuZGVyYnVmZmVyLndpZHRoID0gdlswXTtcbiAgICAgICAgcmVuZGVyYnVmZmVyLmhlaWdodCA9IHZbMV07XG4gICAgICAgIGdsLnJlbmRlcmJ1ZmZlclN0b3JhZ2UoZ2wuUkVOREVSQlVGRkVSLCBnbC5ERVBUSF9DT01QT05FTlQxNiwgdlswXSwgdlsxXSk7XG4gICAgfVxuXG4gICAgZ2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoZ2wuRlJBTUVCVUZGRVIsIGdsLkNPTE9SX0FUVEFDSE1FTlQwLCBnbC5URVhUVVJFXzJELCB0ZXh0dXJlLmlkLCAwKTtcbiAgICBnbC5mcmFtZWJ1ZmZlclJlbmRlcmJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgZ2wuREVQVEhfQVRUQUNITUVOVCwgZ2wuUkVOREVSQlVGRkVSLCByZW5kZXJidWZmZXIpO1xuICAgIFxuICAgIGlmICh0aGlzLmRlYnVnKSBjaGVja0ZCTyhnbCk7XG5cbiAgICBjYi5jYWxsKHRoaXMsIHNwZWMpO1xuXG4gICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcbiAgICBnbC5iaW5kUmVuZGVyYnVmZmVyKGdsLlJFTkRFUkJVRkZFUiwgbnVsbCk7XG47fTtcblxuV2ViR0xSZW5kZXJlci5kZXBsb3lDb250YWluZXIgPSBmdW5jdGlvbiAoKSB7fTtcbldlYkdMUmVuZGVyZXIuZGVwbG95ID0gZnVuY3Rpb24gKCkge307XG5XZWJHTFJlbmRlcmVyLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHt9O1xuV2ViR0xSZW5kZXJlci5zZXRPcHRpb25zID0gZnVuY3Rpb24oKSB7fTtcbldlYkdMUmVuZGVyZXIucmVjYWxsID0gZnVuY3Rpb24gKCkge307XG5cbmZ1bmN0aW9uIGFwcGx5UHJvamVjdGlvbiAoZ2VvbSwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGNhbWVyYSA9IGNvbnRleHQuZ2V0Q29tcG9uZW50KCdjYW1lcmEnKTtcbiAgICAgICAgICAgIHZhciBwID0gY2FtZXJhID8gY2FtZXJhLmdldFByb2plY3Rpb25UcmFuc2Zvcm0oKSA6IGlkZW50aXR5TWF0cml4O1xuICAgICAgICAgICAgdmFyIGNhbWVyYUZvY2FsID0gIGNhbWVyYSA/IGNhbWVyYS5nZXRPcHRpb25zKCkucHJvamVjdGlvbi5mb2NhbFBvaW50WzJdIDogMDtcbiAgICAgICAgICAgIHZhciBjb250ZXh0V2lkdGggPSBjb250ZXh0Ll9zaXplWzBdO1xuICAgICAgICAgICAgdmFyIGNvbnRleHRIZWlnaHQgPSBjb250ZXh0Ll9zaXplWzFdO1xuICAgICAgICAgICAgdmFyIGNvbnRleHRXaWRlciA9IGNvbnRleHRXaWR0aCA+IGNvbnRleHRIZWlnaHQ7XG4gICAgICAgICAgICB2YXIgaG9yaXpvbnRhbEFzcGVjdFJhdGlvQ29ycmVjdGlvbiA9IGNvbnRleHRXaWRlciA/IGNvbnRleHRIZWlnaHQvY29udGV4dFdpZHRoIDogMTtcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNhbEFzcGVjdFJhdGlvQ29ycmVjdGlvbiA9IGNvbnRleHRXaWRlciA/IDEgOiBjb250ZXh0V2lkdGgvY29udGV4dEhlaWdodDtcbiAgICAgICAgICAgIHZhciBmb2NhbERlcHRoID0gY2FtZXJhRm9jYWwgPyAgY29udGV4dEhlaWdodC9jYW1lcmFGb2NhbCA6IDA7XG5cbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgaG9yaXpvbnRhbEFzcGVjdFJhdGlvQ29ycmVjdGlvbixcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgMCxcblxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgdmVydGljYWxBc3BlY3RSYXRpb0NvcnJlY3Rpb24sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAwLFxuXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIHBbMTBdLFxuICAgICAgICAgICAgICAgICgtKGZvY2FsRGVwdGgpICogMC41KSAqIHZlcnRpY2FsQXNwZWN0UmF0aW9Db3JyZWN0aW9uLFxuXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgMVxuICAgICAgICAgICAgXTtcbn1cblxuZnVuY3Rpb24gbG9hZEltYWdlIChpbWcsIGNiKSB7XG4gICAgdmFyIG9iaiA9ICh0eXBlb2YgaW1nID09PSAnc3RyaW5nJyA/IG5ldyBJbWFnZSgpIDogaW1nKSB8fCB7fTtcbiAgICBvYmouY3Jvc3NPcmlnaW4gPSAnYW5vbnltb3VzJztcbiAgICBpZiAoISBvYmouc3JjKSBvYmouc3JjID0gaW1nICsgKCc/Xz0nICsgbmV3IERhdGUpO1xuICAgIGlmICghIG9iai5jb21wbGV0ZSkgb2JqLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHsgY2Iob2JqKTsgfTtcbiAgICBlbHNlIGNiKG9iaik7XG5cbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBjaGVja0ZCTyhnbCkge1xuICAgIHZhciBzdGF0dXMgPSBnbC5jaGVja0ZyYW1lYnVmZmVyU3RhdHVzKGdsLkZSQU1FQlVGRkVSKTtcbiAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgIGNhc2UgZ2wuRlJBTUVCVUZGRVJfQ09NUExFVEU6IGJyZWFrO1xuICAgIGNhc2UgZ2wuRlJBTUVCVUZGRVJfSU5DT01QTEVURV9BVFRBQ0hNRU5UOlxuICAgICAgICB0aHJvdyhcIkluY29tcGxldGUgZnJhbWVidWZmZXI6IEZSQU1FQlVGRkVSX0lOQ09NUExFVEVfQVRUQUNITUVOVFwiKTsgYnJlYWs7XG4gICAgY2FzZSBnbC5GUkFNRUJVRkZFUl9JTkNPTVBMRVRFX01JU1NJTkdfQVRUQUNITUVOVDpcbiAgICAgICAgdGhyb3coXCJJbmNvbXBsZXRlIGZyYW1lYnVmZmVyOiBGUkFNRUJVRkZFUl9JTkNPTVBMRVRFX01JU1NJTkdfQVRUQUNITUVOVFwiKTsgYnJlYWs7XG4gICAgY2FzZSBnbC5GUkFNRUJVRkZFUl9JTkNPTVBMRVRFX0RJTUVOU0lPTlM6XG4gICAgICAgIHRocm93KFwiSW5jb21wbGV0ZSBmcmFtZWJ1ZmZlcjogRlJBTUVCVUZGRVJfSU5DT01QTEVURV9ESU1FTlNJT05TXCIpOyBicmVhaztcbiAgICBjYXNlIGdsLkZSQU1FQlVGRkVSX1VOU1VQUE9SVEVEOlxuICAgICAgICB0aHJvdyhcIkluY29tcGxldGUgZnJhbWVidWZmZXI6IEZSQU1FQlVGRkVSX1VOU1VQUE9SVEVEXCIpOyBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyhcIkluY29tcGxldGUgZnJhbWVidWZmZXI6IFwiICsgc3RhdHVzKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2ViR0xSZW5kZXJlcjsiLCJ2YXIgY3NzID0gXCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXFxuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXFxuICpcXG4gKiBPd25lcjogbWFya0BmYW1vLnVzXFxuICogQGxpY2Vuc2UgTVBMIDIuMFxcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxcbiAqL1xcblxcblxcbmh0bWwge1xcbiAgICB3aWR0aDogMTAwJTtcXG4gICAgaGVpZ2h0OiAxMDAlO1xcbiAgICBtYXJnaW46IDBweDtcXG4gICAgcGFkZGluZzogMHB4O1xcbiAgICBvdmVyZmxvdzogaGlkZGVuO1xcbiAgICAtd2Via2l0LXRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxuICAgIHRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxufVxcblxcbmJvZHkge1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIHdpZHRoOiAxMDAlO1xcbiAgICBoZWlnaHQ6IDEwMCU7XFxuICAgIG1hcmdpbjogMHB4O1xcbiAgICBwYWRkaW5nOiAwcHg7XFxuICAgIC13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXG4gICAgdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXG4gICAgLXdlYmtpdC1mb250LXNtb290aGluZzogYW50aWFsaWFzZWQ7XFxuICAgIC13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICAgIC13ZWJraXQtcGVyc3BlY3RpdmU6IDA7XFxuICAgIHBlcnNwZWN0aXZlOiBub25lO1xcbiAgICBvdmVyZmxvdzogaGlkZGVuO1xcbn1cXG5cXG4uZmFtb3VzLWNvbnRhaW5lciwgLmZhbW91cy1ncm91cCB7XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgdG9wOiAwcHg7XFxuICAgIGxlZnQ6IDBweDtcXG4gICAgYm90dG9tOiAwcHg7XFxuICAgIHJpZ2h0OiAwcHg7XFxuICAgIG92ZXJmbG93OiB2aXNpYmxlO1xcbiAgICAtd2Via2l0LXRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxuICAgIHRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxuICAgIC13ZWJraXQtYmFja2ZhY2UtdmlzaWJpbGl0eTogdmlzaWJsZTtcXG4gICAgYmFja2ZhY2UtdmlzaWJpbGl0eTogdmlzaWJsZTtcXG4gICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxufVxcblxcbi5mYW1vdXMtZ3JvdXAge1xcbiAgICB3aWR0aDogMHB4O1xcbiAgICBoZWlnaHQ6IDBweDtcXG4gICAgbWFyZ2luOiAwcHg7XFxuICAgIHBhZGRpbmc6IDBweDtcXG4gICAgLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcbiAgICB0cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcbn1cXG5cXG4uZmEtc3VyZmFjZSB7XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgLXdlYmtpdC10cmFuc2Zvcm0tb3JpZ2luOiAwJSAwJTtcXG4gICAgdHJhbnNmb3JtLW9yaWdpbjogMCUgMCU7XFxuICAgIC13ZWJraXQtYmFja2ZhY2UtdmlzaWJpbGl0eTogdmlzaWJsZTtcXG4gICAgYmFja2ZhY2UtdmlzaWJpbGl0eTogdmlzaWJsZTtcXG4gICAgLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6IGZsYXQ7XFxuICAgIHRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7IC8qIHBlcmZvcm1hbmNlICovXFxuLyogICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7Ki9cXG4gICAgLXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gICAgcG9pbnRlci1ldmVudHM6IGF1dG87XFxuXFxufVxcblxcbi5mYW1vdXMtY29udGFpbmVyLWdyb3VwIHtcXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgICB3aWR0aDogMTAwJTtcXG4gICAgaGVpZ2h0OiAxMDAlO1xcbn1cXG5cXG4uZmEtY29udGFpbmVyIHtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICAtd2Via2l0LXRyYW5zZm9ybS1vcmlnaW46IGNlbnRlciBjZW50ZXI7XFxuICAgIHRyYW5zZm9ybS1vcmlnaW46IGNlbnRlciBjZW50ZXI7XFxuICAgIG92ZXJmbG93OiBoaWRkZW47XFxufVxcblxcbmNhbnZhcy5HTCB7XFxuICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIHotaW5kZXg6IDk5OTk7XFxuICAgIHRvcDogMHB4O1xcbiAgICBsZWZ0OiAwcHg7XFxufVxcblwiOyAocmVxdWlyZShcImM6XFxcXFVzZXJzXFxcXE1vcmdhblxcXFxkZXNrdG9wXFxcXG1peGVkLW1vZGUtc2VlZFxcXFxub2RlX21vZHVsZXNcXFxcY3NzaWZ5XCIpKShjc3MpOyBtb2R1bGUuZXhwb3J0cyA9IGNzczsiLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgcmVuZGVyTm9kZXMgICAgPSBFbnRpdHlSZWdpc3RyeS5nZXRDb2xsZWN0aW9uKCdldmVyeXRoaW5nJyk7XG5cbi8qKlxuICogQSBzeXN0ZW0gdGhhdCB3aWxsIHJ1biBvdmVyIGN1c3RvbSBjb21wb25lbnRzIHRoYXQgaGF2ZSBhblxuICogICB1cGRhdGUgZnVuY3Rpb24uXG4gKlxuICogQGNsYXNzIEJlaGF2aW9yU3lzdGVtXG4gKiBAc3lzdGVtXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBCZWhhdmlvclN5c3RlbSA9IHt9O1xuXG4vKipcbiAqIFVwZGF0ZSB3aWxsIGl0ZXJhdGUgb3ZlciBhbGwgb2YgdGhlIGVudGl0aWVzIGFuZCBjYWxsXG4gKiAgIGVhY2ggb2YgdGhlaXIgdXBkYXRlIGZ1bmN0aW9ucy5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICovXG5CZWhhdmlvclN5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIGkgPSByZW5kZXJOb2Rlcy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKVxuICAgICAgICBpZiAocmVuZGVyTm9kZXMuZW50aXRpZXNbaV0udXBkYXRlKVxuICAgICAgICAgICAgcmVuZGVyTm9kZXMuZW50aXRpZXNbaV0udXBkYXRlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJlaGF2aW9yU3lzdGVtO1xuXG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL0VudGl0eVJlZ2lzdHJ5Jyk7XG5cbnZhciByb290cyAgICAgICAgICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0NvbnRleHRzJyk7XG5cbi8qKlxuICogQ29yZVN5c3RlbSBpcyByZXNwb25zaWJsZSBmb3IgdHJhdmVyc2luZyB0aGUgc2NlbmUgZ3JhcGggYW5kXG4gKiAgIHVwZGF0aW5nIHRoZSBUcmFuc2Zvcm1zLCBTaXplcywgYW5kIE9wYWNpdGllcyBvZiB0aGUgZW50aXRpZXMuXG4gKlxuICogQGNsYXNzICBDb3JlU3lzdGVtXG4gKiBAc3lzdGVtXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBDb3JlU3lzdGVtID0ge307XG5cbi8qKlxuICogdXBkYXRlIGl0ZXJhdGVzIG92ZXIgZWFjaCBvZiB0aGUgQ29udGV4dHMgdGhhdCB3ZXJlIHJlZ2lzdGVyZWQgYW5kXG4gKiAgIGtpY2tzIG9mIHRoZSByZWN1cnNpdmUgdXBkYXRpbmcgb2YgdGhlaXIgZW50aXRpZXMuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVcbiAqL1xuQ29yZVN5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgcm9vdHMuZm9yRWFjaChjb3JlKTtcbn07XG5cblxuZnVuY3Rpb24gY29yZShlbnRpdHkpIHtcbiAgICBjb3JlVXBkYXRlQW5kRmVlZChlbnRpdHkpO1xufVxuXG4vKipcbiAqIGNvcmVVcGRhdGVBbmRGZWVkIGZlZWRzIHBhcmVudCBpbmZvcm1hdGlvbiB0byBhbiBlbnRpdHkgYW5kIHNvIHRoYXRcbiAqICAgZWFjaCBlbnRpdHkgY2FuIHVwZGF0ZSB0aGVpciB0cmFuc2Zvcm0sIHNpemUsIGFuZCBvcGFjaXR5LiAgSXQgXG4gKiAgIHdpbGwgdGhlbiBwYXNzIGRvd24gaW52YWxpZGF0aW9uIHN0YXRlcyBhbmQgdmFsdWVzIHRvIGFueSBjaGlsZHJlbi5cbiAqXG4gKiBAbWV0aG9kIGNvcmVVcGRhdGVBbmRGZWVkXG4gKiBAcHJpdmF0ZVxuICogICBcbiAqIEBwYXJhbSAge0VudGl0eX0gIGVudGl0eSAgICAgICAgICAgRW50aXR5IGluIHRoZSBzY2VuZSBncmFwaFxuICogQHBhcmFtICB7TnVtYmVyfSAgdHJhbnNmb3JtUmVwb3J0ICBiaXRTY2hlbWUgcmVwb3J0IG9mIHRyYW5zZm9ybSBpbnZhbGlkYXRpb25zXG4gKiBAcGFyYW0gIHtBcnJheX0gICBpbmNvbWluZ01hdHJpeCAgIHBhcmVudCB0cmFuc2Zvcm0gYXMgYSBGbG9hdDMyIEFycmF5XG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICBzaXplUmVwb3J0ICAgICAgIGJpdFNjaGVtZSByZXBvcnQgb2Ygc2l6ZSBpbnZhbGlkYXRpb25zXG4gKiBAcGFyYW0gIHtBcnJheX0gICBpbmNvbWluZ1NpemUgICAgIHBhcmVudCBzaXplIGluIHBpeGVsc1xuICogQHBhcmFtICB7Qm9vbGVhbn0gb3BhY2l0eVJlcG9ydCAgICBib29sZWFuIHJlcG9ydCBvZiBvcGFjaXR5IGludmFsaWRhdGlvblxuICogQHBhcmFtICB7TnVtYmVyfSAgaW5jb21pbmdPcGFjaXR5ICBwYXJlbnQgb3BhY2l0eVxuICovXG5mdW5jdGlvbiBjb3JlVXBkYXRlQW5kRmVlZChlbnRpdHksIHRyYW5zZm9ybVJlcG9ydCwgaW5jb21pbmdNYXRyaXgsIHNpemVSZXBvcnQsIGluY29taW5nU2l6ZSwgb3BhY2l0eVJlcG9ydCwgaW5jb21pbmdPcGFjaXR5KSB7XG4gICAgdmFyIHRyYW5zZm9ybSA9IGVudGl0eS5nZXRDb21wb25lbnQoJ3RyYW5zZm9ybScpO1xuICAgIHZhciBzaXplICAgICAgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdzaXplJyk7XG4gICAgdmFyIG9wYWNpdHkgICA9IGVudGl0eS5nZXRDb21wb25lbnQoJ29wYWNpdHknKTtcbiAgICB2YXIgY2hpbGRyZW4gID0gZW50aXR5LmdldENoaWxkcmVuKCk7XG4gICAgdmFyIGkgICAgICAgICA9IGNoaWxkcmVuLmxlbmd0aDtcblxuXG4gICAgdHJhbnNmb3JtUmVwb3J0ID0gdHJhbnNmb3JtLl91cGRhdGUodHJhbnNmb3JtUmVwb3J0LCBpbmNvbWluZ01hdHJpeCk7XG4gICAgc2l6ZVJlcG9ydCAgICAgID0gc2l6ZS5fdXBkYXRlKHNpemVSZXBvcnQsIGluY29taW5nU2l6ZSk7XG4gICAgb3BhY2l0eVJlcG9ydCAgID0gb3BhY2l0eS5fdXBkYXRlKG9wYWNpdHlSZXBvcnQsIGluY29taW5nT3BhY2l0eSk7XG5cbiAgICB3aGlsZSAoaS0tKSBcbiAgICAgICAgY29yZVVwZGF0ZUFuZEZlZWQoXG4gICAgICAgICAgICBjaGlsZHJlbltpXSxcbiAgICAgICAgICAgIHRyYW5zZm9ybVJlcG9ydCxcbiAgICAgICAgICAgIHRyYW5zZm9ybS5fbWF0cml4LFxuICAgICAgICAgICAgc2l6ZVJlcG9ydCxcbiAgICAgICAgICAgIHNpemUuX2dsb2JhbFNpemUsXG4gICAgICAgICAgICBvcGFjaXR5UmVwb3J0LFxuICAgICAgICAgICAgb3BhY2l0eS5fZ2xvYmFsT3BhY2l0eSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29yZVN5c3RlbTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEVudGl0eVJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vRW50aXR5UmVnaXN0cnknKSxcbiAgICBNYXRyaXhNYXRoICAgICA9IHJlcXVpcmUoJy4uLy4uL21hdGgvTWF0cml4NHg0JyksXG4gICAgT3B0aW9uc01hbmFnZXIgPSByZXF1aXJlKCcuLi9PcHRpb25zTWFuYWdlcicpO1xuXG52YXIgcmVuZGVyZXJzICAgICAgICAgID0ge30sXG4gICAgdGFyZ2V0c1RvUmVuZGVyZXJzID0ge307XG5cbnZhciBjb250YWluZXJzICA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0hhc0NvbnRhaW5lcicpLFxuICAgIHJlbmRlcmFibGVzID0gRW50aXR5UmVnaXN0cnkuYWRkQ29sbGVjdGlvbignUmVuZGVyYWJsZXMnKTtcblxudmFyIHRvRGVwbG95ID0gW107XG5cbmNvbnRhaW5lcnMub24oJ2VudGl0eUFkZGVkJywgZGVwbG95Q29udGFpbmVyKTtcbmNvbnRhaW5lcnMub24oJ2VudGl0eVJlbW92ZWQnLCByZWNhbGxDb250YWluZXIpO1xuXG52YXIgY29udGFpbmVyVG9UYXJnZXRzID0ge307XG5cbmZ1bmN0aW9uIGRlcGxveUNvbnRhaW5lcihlbnRpdHkpIHtcbiAgICBpZiAoZW50aXR5LmdldENvbnRleHQoKSkgcmVuZGVyZXJzLkRPTS5kZXBsb3lDb250YWluZXIoZW50aXR5KTtcbiAgICBlbHNlICAgICAgICAgICAgICAgICAgICAgdG9EZXBsb3kucHVzaChlbnRpdHkpOyAvLyBUT0RPIFRoaXMgaXMgdGVtcG9yYXJ5IGFuZCBpdCBzdWNrc1xufVxuXG5mdW5jdGlvbiByZWNhbGxDb250YWluZXIoZW50aXR5KSB7XG4gICAgcmVuZGVyZXJzLkRPTS5yZWNhbGxDb250YWluZXIoZW50aXR5KTtcbn1cblxuZnVuY3Rpb24gX3JlbGV2ZW50VG9SZW5kZXJlcihyZW5kZXJlciwgZW50aXR5KSB7XG4gICAgdmFyIHRhcmdldHMgPSByZW5kZXJlci5nZXRUYXJnZXRzKCk7XG4gICAgdmFyIGogICAgICAgPSB0YXJnZXRzLmxlbmd0aDtcbiAgICB3aGlsZSAoai0tKSBpZiAoZW50aXR5Lmhhc0NvbXBvbmVudCh0YXJnZXRzW2pdKSkgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfcmVsZXZlbnRUb0FueVJlbmRlcmVyKGVudGl0eSkge1xuICAgIHZhciByZW5kZXJlck5hbWVzID0gT2JqZWN0LmtleXMocmVuZGVyZXJzKSxcbiAgICAgICAgaSAgICAgICAgICAgICA9IHJlbmRlcmVyTmFtZXMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkgaWYgKF9yZWxldmVudFRvUmVuZGVyZXIocmVuZGVyZXJzW3JlbmRlcmVyTmFtZXNbaV1dLCBlbnRpdHkpKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogUmVuZGVyU3lzdGVtIGlzIHJlc3BvbnNpYmxlIGZvciBrZWVwaW5nIHRyYWNrIG9mIHRoZSB2YXJpb3VzIHJlbmRlcmVyc1xuICogIGFuZCBmZWVkaW5nIHRoZW0gXG4gKlxuICpcbiAqIEBjbGFzcyBSZW5kZXJTeXN0ZW1cbiAqIEBzeXN0ZW1cbiAqL1xudmFyIFJlbmRlclN5c3RlbSA9IHt9O1xuXG5SZW5kZXJTeXN0ZW0udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIHZhciB0YXJnZXRzICAgICAgICAgICAgID0gT2JqZWN0LmtleXModGFyZ2V0c1RvUmVuZGVyZXJzKSxcbiAgICAgICAgcmVuZGVyZXJOYW1lcyAgICAgICA9IE9iamVjdC5rZXlzKHJlbmRlcmVycyksXG4gICAgICAgIHRhcmdldCAgICAgICAgICAgICAgPSBudWxsLFxuICAgICAgICBlbnRpdHkgICAgICAgICAgICAgID0gbnVsbCxcbiAgICAgICAgY29udGFpbmVyICAgICAgICAgICA9IG51bGwsXG4gICAgICAgIHRhcmdldE5hbWUgICAgICAgICAgPSB2b2lkIDAsXG4gICAgICAgIGNvbnRhaW5lckVudHMgICAgICAgPSBjb250YWluZXJzLmVudGl0aWVzLFxuICAgICAgICBlbnRpdGllcyAgICAgICAgICAgID0gcmVuZGVyYWJsZXMuZW50aXRpZXMsXG4gICAgICAgIGkgICAgICAgICAgICAgICAgICAgPSBlbnRpdGllcy5sZW5ndGgsXG4gICAgICAgIHRhcmdldHNMZW5ndGggICAgICAgPSB0YXJnZXRzLmxlbmd0aCxcbiAgICAgICAgY29udGFpbmVyRW50TGVuZ3RocyA9IGNvbnRhaW5lckVudHMubGVuZ3RoLFxuICAgICAgICByZW5kZXJlcnNMZW5ndGggICAgID0gMCxcbiAgICAgICAgaiAgICAgICAgICAgICAgICAgICA9IHRvRGVwbG95Lmxlbmd0aCxcbiAgICAgICAgayAgICAgICAgICAgICAgICAgICA9IDAsXG4gICAgICAgIGwgICAgICAgICAgICAgICAgICAgPSAwO1xuXG5cblxuICAgIC8vIFVwZGF0ZSB0aGUgQ29udGFpbmVyIGlmIGl0cyB0cmFuc2Zvcm0gb3Igc2l6ZSBhcmUgZGlydHkuXG4gICAgY29udGFpbmVycy5mb3JFYWNoKGZ1bmN0aW9uKGVudGl0eSkge1xuICAgICAgICBjb250YWluZXIgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdjb250YWluZXInKTtcbiAgICAgICAgaWYgKGVudGl0eS5nZXRDb250ZXh0KCkgJiYgKGNvbnRhaW5lci5fdHJhbnNmb3JtRGlydHkgfHwgY29udGFpbmVyLl9zaXplRGlydHkpKSByZW5kZXJlcnMuRE9NLnVwZGF0ZUNvbnRhaW5lcihlbnRpdHkpO1xuICAgIH0pO1xuXG4gICAgd2hpbGUgKGotLSkgZGVwbG95Q29udGFpbmVyKHRvRGVwbG95LnBvcCgpKTtcblxuICAgIC8vIEZvciBhbGwgb2YgdGhlIHJlbmRlcmFibGVzXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBqICAgICAgPSB0YXJnZXRzTGVuZ3RoO1xuICAgICAgICBlbnRpdHkgPSBlbnRpdGllc1tpXTtcblxuICAgICAgICAvLyBGb3IgZWFjaCByZW5kZXJlclxuICAgICAgICB3aGlsZSAoai0tKSB7XG4gICAgICAgICAgICB0YXJnZXQgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KHRhcmdldHNbal0pO1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIGNvbnRpbnVlOyAvLyBza2lwIGlmIHRoaXMgUmVuZGVyYWJsZSBkb2VzIG5vdCBjb250YWluZXIgdGhlIHByb3BlciB0YXJnZXQgY29tcG9uZW50IGZvciB0aGlzIHJlbmRlcmVyXG5cbiAgICAgICAgICAgIGsgPSBjb250YWluZXJFbnRMZW5ndGhzO1xuXG4gICAgICAgICAgICBpZiAoaykge1xuICAgICAgICAgICAgICAgIHRhcmdldE5hbWUgICAgICA9IHRhcmdldC5jb25zdHJ1Y3Rvci50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHJlbmRlcmVyc0xlbmd0aCA9IHRhcmdldHNUb1JlbmRlcmVyc1t0YXJnZXROYW1lXS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAvLyBGb3IgZWFjaCBjb250YWluZXJcbiAgICAgICAgICAgICAgICB3aGlsZSAoay0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGwgICAgICAgICAgPSByZW5kZXJlcnNMZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lciAgPSBjb250YWluZXJFbnRzW2tdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVudGl0eS5fcm9vdElEKVxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgdGFyZ2V0IGhhcyBhIGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0eS5nZXRDb250ZXh0KCkpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRGVjaWRlIGlmIHRvIGRlcGxveSAgYW5kIHVwZGF0ZSBvciBqdXN0IHVwZGF0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldC5faXNXaXRoaW4oY29udGFpbmVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChsLS0pIHRhcmdldHNUb1JlbmRlcmVyc1t0YXJnZXROYW1lXVtsXS51cGRhdGUoZW50aXR5LCBjb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAobC0tKSB0YXJnZXRzVG9SZW5kZXJlcnNbdGFyZ2V0TmFtZV1bbF0uZGVwbG95KGVudGl0eSwgY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuX2FkZFRvQ29udGFpbmVyKGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0Ll9pc1dpdGhpbihjb250YWluZXIpKSB7IC8vIElmIHRoZSB0YXJnZXQgaXMgcmVtb3ZlZCBmcm9tIHJlbmRlciB0cmVlIHJlY2FsbCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGwtLSkgdGFyZ2V0c1RvUmVuZGVyZXJzW3RhcmdldE5hbWVdW2xdLnJlY2FsbChlbnRpdHksIGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuX3JlbW92ZUZyb21Db250YWluZXIoY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVzZXQgdGhlIGludmFsaWRhdGlvbnMgYWZ0ZXIgYWxsIG9mIHRoZSBsb2dpYyBmb3IgXG4gICAgICAgICAgICAvLyBhIHBhcnRpY3VsYXIgdGFyZ2V0IFxuICAgICAgICAgICAgLy8gaWYgKHRhcmdldC5yZXNldEludmFsaWRhdGlvbnMpIHRhcmdldC5yZXNldEludmFsaWRhdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhdmUgZWFjaCByZW5kZXJlciBydW5cbiAgICBpID0gcmVuZGVyZXJOYW1lcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgcmVuZGVyZXJzW3JlbmRlcmVyTmFtZXNbaV1dLnJlbmRlcigpO1xufTtcblxuLyoqXG4gKiBBZGQgYSBuZXcgcmVuZGVyZXIgd2hpY2ggd2lsbCBiZSBjYWxsZWQgZXZlcnkgZnJhbWUuXG4gKlxuICogQG1ldGhvZCByZWdpc3RlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIHJlbmRlcmVyXG4gKiBAcGFyYW0ge09iamVjdH0gcmVuZGVyZXIgc2luZ2xldG9uIHJlbmRlcmVyIG9iamVjdFxuICovXG5SZW5kZXJTeXN0ZW0ucmVnaXN0ZXIgPSBmdW5jdGlvbiByZWdpc3RlcihuYW1lLCByZW5kZXJlcikge1xuICAgIGlmIChyZW5kZXJlcnNbbmFtZV0gIT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmVuZGVyZXJzW25hbWVdID0gcmVuZGVyZXI7XG5cbiAgICB2YXIgdGFyZ2V0cyA9IHJlbmRlcmVyLmdldFRhcmdldHMoKSxcbiAgICAgICAgaSAgICAgICA9IHRhcmdldHMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBpZiAodGFyZ2V0c1RvUmVuZGVyZXJzW3RhcmdldHNbaV1dID09IG51bGwpIHRhcmdldHNUb1JlbmRlcmVyc1t0YXJnZXRzW2ldXSA9IFtdO1xuICAgICAgICB0YXJnZXRzVG9SZW5kZXJlcnNbdGFyZ2V0c1tpXV0ucHVzaChyZW5kZXJlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlbmRlclN5c3RlbTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBkYW5AZmFtby51c1xuICogICAgICAgICBmZWxpeEBmYW1vLnVzXG4gKiAgICAgICAgIG1pa2VAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbiAndXNlIHN0cmljdCc7XG5cbnZhciBwcmV2aW91c1RpbWUgICAgICAgPSAwLCBcbiAgICBkZWx0YSAgICAgICAgICAgICAgPSAwLFxuICAgIGluaXRpYWxpemF0aW9uVGltZSA9IDAsXG4gICAgY3VycmVudFRpbWUgICAgICAgID0gaW5pdGlhbGl6YXRpb25UaW1lLFxuICAgIHJlbGF0aXZlVGltZSAgICAgICA9IGluaXRpYWxpemF0aW9uVGltZSxcbiAgICBhYnNvbHV0ZVRpbWUgICAgICAgPSBpbml0aWFsaXphdGlvblRpbWUsXG4gICAgcHJldmlvdXNSZWxGcmFtZSAgID0gMDtcblxuLyoqXG4gKiBUaW1lU3lzdGVtIGlzIHJlc3BvbnNpYmxlIGZvciBkZXRlcm1pbmluZyB0aGUgY3VycmVudCBtb21lbnQuXG4gKlxuICogQGNsYXNzIFRpbWVTeXN0ZW1cbiAqIEBzeXN0ZW1cbiAqL1xudmFyIFRpbWVTeXN0ZW0gPSB7fTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIHRpbWUgYmFzZWQgb24gdGhlIGZyYW1lIGRhdGEgZnJvbSB0aGUgRW5naW5lLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHJlbEZyYW1lIFxuICovXG5UaW1lU3lzdGVtLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSh0aW1lc3RhbXAsIHJlbEZyYW1lKSB7XG4gICAgcHJldmlvdXNUaW1lICAgICA9IGN1cnJlbnRUaW1lO1xuICAgIGN1cnJlbnRUaW1lICAgICAgPSB0aW1lc3RhbXA7XG4gICAgZGVsdGEgICAgICAgICAgICA9IGN1cnJlbnRUaW1lIC0gcHJldmlvdXNUaW1lO1xuICAgIHJlbGF0aXZlVGltZSAgICArPSBkZWx0YSAqIChyZWxGcmFtZSAtIHByZXZpb3VzUmVsRnJhbWUpO1xuICAgIGFic29sdXRlVGltZSAgICArPSBkZWx0YTtcbiAgICBwcmV2aW91c1JlbEZyYW1lID0gcmVsRnJhbWU7XG59O1xuXG4vKipcbiAqIEdldCByZWxhdGl2ZSB0aW1lIGluIG1zIG9mZmZzZXQgYnkgdGhlIHNwZWVkIGF0IHdoaWNoIHRoZSBFbmdpbmUgaXMgcnVubmluZy5cbiAqXG4gKiBAbWV0aG9kIGdldFJlbGF0aXZlVGltZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIHRpbWUgYWNjb3VudGluZyBmb3IgRW5naW5lJ3MgcnVuIHNwZWVkXG4gKi9cblRpbWVTeXN0ZW0uZ2V0UmVsYXRpdmVUaW1lID0gZnVuY3Rpb24gZ2V0UmVsYXRpdmVUaW1lKCkge1xuICAgIHJldHVybiByZWxhdGl2ZVRpbWU7XG59O1xuXG4vKipcbiAqIEdldCBhYnNvbHV0ZSB0aW1lLlxuICpcbiAqIEBtZXRob2QgZ2V0QWJzb2x1dGVUaW1lXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgdGltZSBpbiBtc1xuICovXG5UaW1lU3lzdGVtLmdldEFic29sdXRlVGltZSA9IGZ1bmN0aW9uIGdldEFic29sdXRlVGltZSgpIHtcbiAgICByZXR1cm4gYWJzb2x1dGVUaW1lO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRpbWUgaW4gd2hpY2ggdGhlIEVuZ2luZSB3YXMgaW5zdGFudGlhdGVkLlxuICpcbiAqIEBtZXRob2QgZ2V0SW5pdGlhbFRpbWVcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSB0aW1lIGluIG1zXG4gKi9cblRpbWVTeXN0ZW0uZ2V0SW5pdGlhbFRpbWUgPSBmdW5jdGlvbiBnZXRJbml0aWFsVGltZSgpIHtcbiAgICByZXR1cm4gaW5pdGlhbGl6YXRpb25UaW1lO1xufTtcblxuLyoqXG4gKiBHZXQgZWxhcHNlZCB0aW1lIHNpbmNlIGluc3RhbnRpYXRpb24gYWNjb3VudGluZyBmb3IgRW5naW5lIHNwZWVkXG4gKlxuICogQG1ldGhvZCBnZXRFbGFwc2VkUmVsYXRpdmVUaW1lXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgdGltZSBpbiBtc1xuICovXG5UaW1lU3lzdGVtLmdldEVsYXBzZWRSZWxhdGl2ZVRpbWUgPSBmdW5jdGlvbiBnZXRFbGFwc2VkUmVsYXRpdmVUaW1lKCkge1xuICAgIHJldHVybiByZWxhdGl2ZVRpbWUgLSBpbml0aWFsaXphdGlvblRpbWU7XG59O1xuXG4vKipcbiAqIEdldCBhYnNvbHV0ZSBlbGFwc2VkIHRpbWUgc2luY2UgaW5zdGFudGlhdGlvblxuICpcbiAqIEBtZXRob2QgZ2V0RWxhcHNlZEFic29sdXRlVGltZVxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIHRpbWUgaW4gbXNcbiAqL1xuVGltZVN5c3RlbS5nZXRFbGFwc2VkQWJzb2x1dGVUaW1lID0gZnVuY3Rpb24gZ2V0RWxhcHNlZEFic29sdXRlVGltZSgpIHtcbiAgICByZXR1cm4gYWJzb2x1dGVUaW1lIC0gaW5pdGlhbGl6YXRpb25UaW1lO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRpbWUgYmV0d2VlbiB0aGlzIGZyYW1lIGFuZCBsYXN0LlxuICpcbiAqIEBtZXRob2QgZ2V0RGVsdGFcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSB0aW1lIGluIG1zXG4gKi9cblRpbWVTeXN0ZW0uZ2V0RGVsdGEgPSBmdW5jdGlvbiBnZXREZWx0YSgpIHtcbiAgICByZXR1cm4gZGVsdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVTeXN0ZW07XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4qIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbipcbiogT3duZXI6IG1hcmtAZmFtby51c1xuKiBAbGljZW5zZSBNUEwgMi4wXG4qIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEV2ZW50RW1pdHRlciByZXByZXNlbnRzIGEgY2hhbm5lbCBmb3IgZXZlbnRzLlxuICpcbiAqIEBjbGFzcyBFdmVudEVtaXR0ZXJcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMgPSB7fTtcbiAgICB0aGlzLl9vd25lciA9IHRoaXM7XG59XG5cbi8qKlxuICogVHJpZ2dlciBhbiBldmVudCwgc2VuZGluZyB0byBhbGwgZG93bnN0cmVhbSBoYW5kbGVyc1xuICogICBsaXN0ZW5pbmcgZm9yIHByb3ZpZGVkICd0eXBlJyBrZXkuXG4gKlxuICogQG1ldGhvZCBlbWl0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IGV2ZW50IGRhdGFcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUsIGV2ZW50KSB7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5saXN0ZW5lcnNbdHlwZV07XG4gICAgaWYgKGhhbmRsZXJzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGhhbmRsZXJzW2ldLmNhbGwodGhpcy5fb3duZXIsIGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQmluZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGFuIGV2ZW50IHR5cGUgaGFuZGxlZCBieSB0aGlzIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kIFwib25cIlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBPYmplY3QpfSBoYW5kbGVyIGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKHR5cGUsIGhhbmRsZXIpIHtcbiAgICBpZiAoISh0eXBlIGluIHRoaXMubGlzdGVuZXJzKSkgdGhpcy5saXN0ZW5lcnNbdHlwZV0gPSBbXTtcbiAgICB2YXIgaW5kZXggPSB0aGlzLmxpc3RlbmVyc1t0eXBlXS5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCA8IDApIHRoaXMubGlzdGVuZXJzW3R5cGVdLnB1c2goaGFuZGxlcik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBcIm9uXCIuXG4gKiBAbWV0aG9kIGFkZExpc3RlbmVyXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4vKipcbiAqIFVuYmluZCBhbiBldmVudCBieSB0eXBlIGFuZCBoYW5kbGVyLlxuICogICBUaGlzIHVuZG9lcyB0aGUgd29yayBvZiBcIm9uXCIuXG4gKlxuICogQG1ldGhvZCByZW1vdmVMaXN0ZW5lclxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgZnVuY3Rpb24gb2JqZWN0IHRvIHJlbW92ZVxuICogQHJldHVybiB7RXZlbnRFbWl0dGVyfSB0aGlzXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcih0eXBlLCBoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5saXN0ZW5lcnNbdHlwZV0uaW5kZXhPZihoYW5kbGVyKTtcbiAgICBpZiAoaW5kZXggPj0gMCkgdGhpcy5saXN0ZW5lcnNbdHlwZV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2FsbCBldmVudCBoYW5kbGVycyB3aXRoIHRoaXMgc2V0IHRvIG93bmVyLlxuICpcbiAqIEBtZXRob2QgYmluZFRoaXNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3duZXIgb2JqZWN0IHRoaXMgRXZlbnRFbWl0dGVyIGJlbG9uZ3MgdG9cbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5iaW5kVGhpcyA9IGZ1bmN0aW9uIGJpbmRUaGlzKG93bmVyKSB7XG4gICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4qIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4qXG4qIE93bmVyOiBtYXJrQGZhbW8udXNcbiogQGxpY2Vuc2UgTVBMIDIuMFxuKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4vRXZlbnRFbWl0dGVyJyk7XG5cbi8qKlxuICogRXZlbnRIYW5kbGVyIGZvcndhcmRzIHJlY2VpdmVkIGV2ZW50cyB0byBhIHNldCBvZiBwcm92aWRlZCBjYWxsYmFjayBmdW5jdGlvbnMuXG4gKiBJdCBhbGxvd3MgZXZlbnRzIHRvIGJlIGNhcHR1cmVkLCBwcm9jZXNzZWQsIGFuZCBvcHRpb25hbGx5IHBpcGVkIHRocm91Z2ggdG8gb3RoZXIgZXZlbnQgaGFuZGxlcnMuXG4gKlxuICogQGNsYXNzIEV2ZW50SGFuZGxlclxuICogQGV4dGVuZHMgRXZlbnRFbWl0dGVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRXZlbnRIYW5kbGVyKCkge1xuICAgIEV2ZW50RW1pdHRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5kb3duc3RyZWFtID0gW107IC8vIGRvd25zdHJlYW0gZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLmRvd25zdHJlYW1GbiA9IFtdOyAvLyBkb3duc3RyZWFtIGZ1bmN0aW9uc1xuXG4gICAgdGhpcy51cHN0cmVhbSA9IFtdOyAvLyB1cHN0cmVhbSBldmVudCBoYW5kbGVyc1xuICAgIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMgPSB7fTsgLy8gdXBzdHJlYW0gbGlzdGVuZXJzXG59XG5FdmVudEhhbmRsZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcbkV2ZW50SGFuZGxlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFdmVudEhhbmRsZXI7XG5cbi8qKlxuICogQXNzaWduIGFuIGV2ZW50IGhhbmRsZXIgdG8gcmVjZWl2ZSBhbiBvYmplY3QncyBpbnB1dCBldmVudHMuXG4gKlxuICogQG1ldGhvZCBzZXRJbnB1dEhhbmRsZXJcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IG9iamVjdCB0byBtaXggdHJpZ2dlciwgc3Vic2NyaWJlLCBhbmQgdW5zdWJzY3JpYmUgZnVuY3Rpb25zIGludG9cbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSBoYW5kbGVyIGFzc2lnbmVkIGV2ZW50IGhhbmRsZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnNldElucHV0SGFuZGxlciA9IGZ1bmN0aW9uIHNldElucHV0SGFuZGxlcihvYmplY3QsIGhhbmRsZXIpIHtcbiAgICBvYmplY3QudHJpZ2dlciA9IGhhbmRsZXIudHJpZ2dlci5iaW5kKGhhbmRsZXIpO1xuICAgIGlmIChoYW5kbGVyLnN1YnNjcmliZSAmJiBoYW5kbGVyLnVuc3Vic2NyaWJlKSB7XG4gICAgICAgIG9iamVjdC5zdWJzY3JpYmUgPSBoYW5kbGVyLnN1YnNjcmliZS5iaW5kKGhhbmRsZXIpO1xuICAgICAgICBvYmplY3QudW5zdWJzY3JpYmUgPSBoYW5kbGVyLnVuc3Vic2NyaWJlLmJpbmQoaGFuZGxlcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBc3NpZ24gYW4gZXZlbnQgaGFuZGxlciB0byByZWNlaXZlIGFuIG9iamVjdCdzIG91dHB1dCBldmVudHMuXG4gKlxuICogQG1ldGhvZCBzZXRPdXRwdXRIYW5kbGVyXG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBvYmplY3QgdG8gbWl4IHBpcGUsIHVucGlwZSwgb24sIGFkZExpc3RlbmVyLCBhbmQgcmVtb3ZlTGlzdGVuZXIgZnVuY3Rpb25zIGludG9cbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSBoYW5kbGVyIGFzc2lnbmVkIGV2ZW50IGhhbmRsZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnNldE91dHB1dEhhbmRsZXIgPSBmdW5jdGlvbiBzZXRPdXRwdXRIYW5kbGVyKG9iamVjdCwgaGFuZGxlcikge1xuICAgIGlmIChoYW5kbGVyIGluc3RhbmNlb2YgRXZlbnRIYW5kbGVyKSBoYW5kbGVyLmJpbmRUaGlzKG9iamVjdCk7XG4gICAgb2JqZWN0LnBpcGUgPSBoYW5kbGVyLnBpcGUuYmluZChoYW5kbGVyKTtcbiAgICBvYmplY3QudW5waXBlID0gaGFuZGxlci51bnBpcGUuYmluZChoYW5kbGVyKTtcbiAgICBvYmplY3Qub24gPSBoYW5kbGVyLm9uLmJpbmQoaGFuZGxlcik7XG4gICAgb2JqZWN0LmFkZExpc3RlbmVyID0gb2JqZWN0Lm9uO1xuICAgIG9iamVjdC5yZW1vdmVMaXN0ZW5lciA9IGhhbmRsZXIucmVtb3ZlTGlzdGVuZXIuYmluZChoYW5kbGVyKTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciBhbiBldmVudCwgc2VuZGluZyB0byBhbGwgZG93bnN0cmVhbSBoYW5kbGVyc1xuICogICBsaXN0ZW5pbmcgZm9yIHByb3ZpZGVkICd0eXBlJyBrZXkuXG4gKlxuICogQG1ldGhvZCBlbWl0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IGV2ZW50IGRhdGFcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUsIGV2ZW50KSB7XG4gICAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmRvd25zdHJlYW0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMuZG93bnN0cmVhbVtpXS50cmlnZ2VyKSB0aGlzLmRvd25zdHJlYW1baV0udHJpZ2dlcih0eXBlLCBldmVudCk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmRvd25zdHJlYW1Gbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmRvd25zdHJlYW1GbltpXSh0eXBlLCBldmVudCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgZW1pdFxuICogQG1ldGhvZCBhZGRMaXN0ZW5lclxuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnRyaWdnZXIgPSBFdmVudEhhbmRsZXIucHJvdG90eXBlLmVtaXQ7XG5cbi8qKlxuICogQWRkIGV2ZW50IGhhbmRsZXIgb2JqZWN0IHRvIHNldCBvZiBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICpcbiAqIEBtZXRob2QgcGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgZXZlbnQgaGFuZGxlciB0YXJnZXQgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHBhc3NlZCBldmVudCBoYW5kbGVyXG4gKi9cbkV2ZW50SGFuZGxlci5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIHBpcGUodGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC5zdWJzY3JpYmUgaW5zdGFuY2VvZiBGdW5jdGlvbikgcmV0dXJuIHRhcmdldC5zdWJzY3JpYmUodGhpcyk7XG5cbiAgICB2YXIgZG93bnN0cmVhbUN0eCA9ICh0YXJnZXQgaW5zdGFuY2VvZiBGdW5jdGlvbikgPyB0aGlzLmRvd25zdHJlYW1GbiA6IHRoaXMuZG93bnN0cmVhbTtcbiAgICB2YXIgaW5kZXggPSBkb3duc3RyZWFtQ3R4LmluZGV4T2YodGFyZ2V0KTtcbiAgICBpZiAoaW5kZXggPCAwKSBkb3duc3RyZWFtQ3R4LnB1c2godGFyZ2V0KTtcblxuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBGdW5jdGlvbikgdGFyZ2V0KCdwaXBlJywgbnVsbCk7XG4gICAgZWxzZSBpZiAodGFyZ2V0LnRyaWdnZXIpIHRhcmdldC50cmlnZ2VyKCdwaXBlJywgbnVsbCk7XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuLyoqXG4gKiBSZW1vdmUgaGFuZGxlciBvYmplY3QgZnJvbSBzZXQgb2YgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqICAgVW5kb2VzIHdvcmsgb2YgXCJwaXBlXCIuXG4gKlxuICogQG1ldGhvZCB1bnBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IHRhcmdldCBoYW5kbGVyIG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwcm92aWRlZCB0YXJnZXRcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbiB1bnBpcGUodGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC51bnN1YnNjcmliZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSByZXR1cm4gdGFyZ2V0LnVuc3Vic2NyaWJlKHRoaXMpO1xuXG4gICAgdmFyIGRvd25zdHJlYW1DdHggPSAodGFyZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pID8gdGhpcy5kb3duc3RyZWFtRm4gOiB0aGlzLmRvd25zdHJlYW07XG4gICAgdmFyIGluZGV4ID0gZG93bnN0cmVhbUN0eC5pbmRleE9mKHRhcmdldCk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgZG93bnN0cmVhbUN0eC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHRhcmdldCgndW5waXBlJywgbnVsbCk7XG4gICAgICAgIGVsc2UgaWYgKHRhcmdldC50cmlnZ2VyKSB0YXJnZXQudHJpZ2dlcigndW5waXBlJywgbnVsbCk7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBCaW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYW4gZXZlbnQgdHlwZSBoYW5kbGVkIGJ5IHRoaXMgb2JqZWN0LlxuICpcbiAqIEBtZXRob2QgXCJvblwiXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGhhbmRsZXIgY2FsbGJhY2tcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24odHlwZSwgaGFuZGxlcikge1xuICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoISh0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpKSB7XG4gICAgICAgIHZhciB1cHN0cmVhbUxpc3RlbmVyID0gdGhpcy50cmlnZ2VyLmJpbmQodGhpcywgdHlwZSk7XG4gICAgICAgIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnNbdHlwZV0gPSB1cHN0cmVhbUxpc3RlbmVyO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudXBzdHJlYW0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMudXBzdHJlYW1baV0ub24odHlwZSwgdXBzdHJlYW1MaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBcIm9uXCJcbiAqIEBtZXRob2QgYWRkTGlzdGVuZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50SGFuZGxlci5wcm90b3R5cGUub247XG5cbi8qKlxuICogTGlzdGVuIGZvciBldmVudHMgZnJvbSBhbiB1cHN0cmVhbSBldmVudCBoYW5kbGVyLlxuICpcbiAqIEBtZXRob2Qgc3Vic2NyaWJlXG4gKlxuICogQHBhcmFtIHtFdmVudEVtaXR0ZXJ9IHNvdXJjZSBzb3VyY2UgZW1pdHRlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIHN1YnNjcmliZShzb3VyY2UpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnVwc3RyZWFtLmluZGV4T2Yoc291cmNlKTtcbiAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgIHRoaXMudXBzdHJlYW0ucHVzaChzb3VyY2UpO1xuICAgICAgICBmb3IgKHZhciB0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHNvdXJjZS5vbih0eXBlLCB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzW3R5cGVdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3RvcCBsaXN0ZW5pbmcgdG8gZXZlbnRzIGZyb20gYW4gdXBzdHJlYW0gZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAbWV0aG9kIHVuc3Vic2NyaWJlXG4gKlxuICogQHBhcmFtIHtFdmVudEVtaXR0ZXJ9IHNvdXJjZSBzb3VyY2UgZW1pdHRlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gdW5zdWJzY3JpYmUoc291cmNlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy51cHN0cmVhbS5pbmRleE9mKHNvdXJjZSk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgdGhpcy51cHN0cmVhbS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBmb3IgKHZhciB0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcih0eXBlLCB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzW3R5cGVdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRIYW5kbGVyO1xuIiwiZnVuY3Rpb24gQnVmZmVyKHRhcmdldCwgdHlwZSwgZ2wsIHNwYWNpbmcpIHtcbiAgICB0aGlzLmJ1ZmZlciAgPSBudWxsO1xuICAgIHRoaXMudGFyZ2V0ICA9IHRhcmdldDtcbiAgICB0aGlzLnR5cGUgICAgPSB0eXBlO1xuICAgIHRoaXMuZGF0YSAgICA9IFtdO1xuICAgIHRoaXMuZ2wgICAgICA9IGdsO1xuICAgIHRoaXMuc3BhY2luZyA9IHNwYWNpbmcgfHwgMDtcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zdWJEYXRhID0gZnVuY3Rpb24gc3ViRGF0YSh0eXBlKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgZGF0YSA9IFtdO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwLCBjaHVuayA9IDEwMDAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSArPSBjaHVuaylcbiAgICAgICAgZGF0YSA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoZGF0YSwgdGhpcy5kYXRhLnNsaWNlKGksIGkgKyBjaHVuaykpO1xuXG4gICAgdGhpcy5idWZmZXIgICAgICAgICA9IHRoaXMuYnVmZmVyIHx8IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuICAgIHRoaXMuYnVmZmVyLmxlbmd0aCAgPSBkYXRhLmxlbmd0aCAvIHRoaXMuc3BhY2luZztcbiAgICB0aGlzLmJ1ZmZlci5zcGFjaW5nID0gdGhpcy5zcGFjaW5nIHx8ICh0aGlzLmRhdGEubGVuZ3RoID8gZGF0YS5sZW5ndGggLyB0aGlzLmRhdGEubGVuZ3RoIDogMCk7XG4gICAgZ2wuYmluZEJ1ZmZlcih0aGlzLnRhcmdldCwgdGhpcy5idWZmZXIpO1xuICAgIGdsLmJ1ZmZlckRhdGEodGhpcy50YXJnZXQsIG5ldyB0aGlzLnR5cGUoZGF0YSksIHR5cGUgfHwgZ2wuU1RBVElDX0RSQVcpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXI7IiwiXG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogYWRuYW5AZmFtby51cywgam9zZXBoQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBUUkFOU0ZPUk0gPSAndHJhbnNmb3JtJztcbnZhciBPUEFDSVRZID0gJ29wYWNpdHknO1xudmFyIFNJWkUgPSAnc2l6ZSc7XG52YXIgTUFURVJJQUxTID0gJ21hdGVyaWFsJztcbnZhciBHRU9NRVRSWSA9ICdnZW9tZXRyeSc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NvcmUvRW50aXR5UmVnaXN0cnknKTtcbnZhciBUYXJnZXQgPSByZXF1aXJlKCcuLi9jb3JlL2NvbXBvbmVudHMvVGFyZ2V0Jyk7XG5cbi8qKlxuICogR2VvbWV0cnkgaXMgYSBjb21wb25lbnQgdGhhdCBkZWZpbmVzIHRoZSBkYXRhIHRoYXQgc2hvdWxkXG4gKiAgIGJlIGRyYXduIHRvIHRoZSB3ZWJHTCBjYW52YXMuIE1hbmFnZXMgdmVydGV4IGRhdGEgYW5kIGF0dHJpYnV0ZXMuXG4gKlxuICogQGNsYXNzIEdlb21ldHJ5XG4gKiBAY29tcG9uZW50XG4gKiBAY29uc3RydWN0b3JcbiAqIFxuICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSBFbnRpdHkgdGhhdCB0aGUgR2VvbWV0cnkgaXMgYSBjb21wb25lbnQgb2ZcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIGluc3RhbnRpYXRpb24gb3B0aW9uc1xuICovXG5cbmZ1bmN0aW9uIEdlb21ldHJ5KGlkLCBvcHRpb25zKSB7XG4gICAgdGhpcy5lbnRpdHkgPSBpZDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBFbnRpdHlSZWdpc3RyeS5yZWdpc3Rlcih0aGlzLmdldEVudGl0eSgpLCAnR2VvbWV0cmllcycpO1xuICAgIEVudGl0eVJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMuZ2V0RW50aXR5KCksICdSZW5kZXJhYmxlcycpO1xuXG4gICAgdGhpcy5zcGVjID0ge1xuICAgICAgICBpZDogRW50aXR5UmVnaXN0cnkuZ2V0RW50aXR5KHRoaXMuZW50aXR5KS5faWQsXG4gICAgICAgIHR5cGU6IChvcHRpb25zLnR5cGUgfHwgJ3RyaWFuZ2xlcycpLnRvVXBwZXJDYXNlKCksXG4gICAgICAgIHZlcnRleEJ1ZmZlcnM6IHt9LFxuICAgICAgICB1bmlmb3Jtczoge1xuICAgICAgICAgICAgb3JpZ2luOiBuZXcgRmxvYXQzMkFycmF5KFswLjUsIDAuNV0pLFxuICAgICAgICAgICAgc2l6ZTogbmV3IEZsb2F0MzJBcnJheShbMSwxLDFdKVxuICAgICAgICB9LFxuICAgICAgICBpbnZhbGlkYXRpb25zOiB7fVxuICAgIH07XG5cbiAgICB0aGlzLmFkZFZlcnRleEJ1ZmZlcigncG9zJyk7XG4gICAgdGhpcy5hZGRWZXJ0ZXhCdWZmZXIoJ3RleENvb3JkJyk7XG4gICAgdGhpcy5hZGRWZXJ0ZXhCdWZmZXIoJ25vcm1hbCcpO1xuICAgIHRoaXMuYWRkVmVydGV4QnVmZmVyKCdpbmRpY2VzJyk7XG5cbiAgICBUYXJnZXQuY2FsbCh0aGlzLCBpZCwge1xuICAgICAgICB2ZXJ0aWNpZXM6IFtcbiAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKSxcbiAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIDAsIDFdKV1cbiAgICB9KTtcbiAgICBcbiAgICBpZiAob3B0aW9ucy5vcmlnaW4pIHRoaXMuc2V0T3JpZ2luKG9wdGlvbnMub3JpZ2luKTtcbn1cblxuR2VvbWV0cnkudG9TdHJpbmcgPSAgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBHRU9NRVRSWTtcbn07XG5cbkdlb21ldHJ5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVGFyZ2V0LnByb3RvdHlwZSk7XG5cbi8qKlxuICogR2V0IHRoZSBFbnRpdHkgdGhlIEdlb21ldHJ5IGlzIGEgY29tcG9uZW50IG9mLlxuICpcbiAqIEBtZXRob2QgZ2V0RW50aXR5XG4gKlxuICogQHJldHVybiB7RW50aXR5fSB0aGUgRW50aXR5IHRoZSBHZW9tZXRyeSBpcyBhIGNvbXBvbmVudCBvZlxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuZ2V0RW50aXR5ID0gZnVuY3Rpb24gZ2V0RW50aXR5KCkge1xuICAgIHJldHVybiBFbnRpdHlSZWdpc3RyeS5nZXRFbnRpdHkodGhpcy5lbnRpdHkpO1xufTtcblxuLyoqXG4gKiBBbGxvY2F0ZXMgYW4gYXJyYXkgYnVmZmVyIHdoZXJlIHZlcnRleCBkYXRhIGlzIHNlbnQgdG8gdmlhIGNvbXBpbGUuXG4gKlxuICogQG1ldGhvZCBhZGRWZXJ0ZXhCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBvZiB2Ym9cbiAqIEBwYXJhbSB7QXJyYXl9IFZhbHVlcyBvZiBuZXcgdmVydGV4IGJ1ZmZlci5cbiAqIFxuICogQGNoYWluYWJsZVxuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuYWRkVmVydGV4QnVmZmVyID0gZnVuY3Rpb24gYWRkVmVydGV4QnVmZmVyKGJ1ZmZlck5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGJ1ZmZlciA9IHRoaXMuc3BlYy52ZXJ0ZXhCdWZmZXJzW2J1ZmZlck5hbWVdID0gdmFsdWUgfHwgW107XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgYnVmZmVyIG9iamVjdCBiYXNlZCBvbiBidWZmZXIgbmFtZS5cbiAqXG4gKiBAbWV0aG9kIGdldFZlcnRleEJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBOYW1lIG9mIHZlcnRleEJ1ZmZlciB0byBiZSByZXRyaWV2ZWQuXG4gKi9cblxuR2VvbWV0cnkucHJvdG90eXBlLmdldFZlcnRleEJ1ZmZlciA9IGZ1bmN0aW9uIGdldFZlcnRleEJ1ZmZlcihidWZmZXJOYW1lKSB7XG4gICAgaWYgKCEgYnVmZmVyTmFtZSkgdGhyb3cgJ2dldFZlcnRleEJ1ZmZlciByZXF1aXJlcyBhIG5hbWUnO1xuICAgIHJldHVybiB0aGlzLnNwZWMudmVydGV4QnVmZmVyc1tidWZmZXJOYW1lXTtcbn07XG5cbi8qKlxuICogQG1ldGhvZCBzZXRWZXJ0ZXhCdWZmZXJcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLnNldFZlcnRleEJ1ZmZlciA9IGZ1bmN0aW9uIHNldFZlcnRleEJ1ZmZlcihidWZmZXJuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuc3BlYy52ZXJ0ZXhCdWZmZXJzW2J1ZmZlcm5hbWVdID0gdmFsdWU7XG4gICAgdGhpcy5zcGVjLmludmFsaWRhdGlvbnNbYnVmZmVybmFtZV0gPSAxO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiAgU2V0IHRoZSBwb3NpdGlvbnMgb2YgdGhlIHZlcnRpY2llcyBpbiB0aGlzIGdlb21ldHJ5LlxuICogIEBtZXRob2Qgc2V0VmVydGV4UG9zaXRpb25zXG4gKiAgQHBhcmFtIHZhbHVlIHtBcnJheX1cbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLnNldFZlcnRleFBvc2l0aW9ucyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnNldFZlcnRleEJ1ZmZlcigncG9zJywgdmFsdWUpO1xufTtcblxuLyoqXG4gKiAgU2V0IHRoZSBub3JtYWxzIG9uIHRoaXMgZ2VvbWV0cnkuXG4gKiAgQG1ldGhvZCBzZXROb3JtYWxzXG4gKiAgQHBhcmFtIHZhbHVlIHtBcnJheX1cbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLnNldE5vcm1hbHMgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5zZXRWZXJ0ZXhCdWZmZXIoJ25vcm1hbCcsIHZhbHVlKTtcbn07XG5cbi8qKlxuICogIFNldCB0aGUgdGV4dHVyZSBjb29yZGluYXRlcyBvbiB0aGlzIGdlb21ldHJ5LlxuICogIEBtZXRob2Qgc2V0VGV4dHVyZUNvb3Jkc1xuICogIEBwYXJhbSB2YWx1ZSB7QXJyYXl9XG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5zZXRUZXh0dXJlQ29vcmRzID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0VmVydGV4QnVmZmVyKCd0ZXhDb29yZCcsIHZhbHVlKTtcbn07XG5cbi8qKlxuICogIFNldCB0aGUgdGV4dHVyZSBjb29yZGluYXRlcyBvbiB0aGlzIGdlb21ldHJ5LlxuICogIEBtZXRob2Qgc2V0VGV4dHVyZUNvb3Jkc1xuICogIEBwYXJhbSB2YWx1ZSB7QXJyYXl9XG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5zZXRJbmRpY2VzID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0VmVydGV4QnVmZmVyKCdpbmRpY2VzJywgdmFsdWUpO1xufTtcblxuLyoqXG4gKiAgU2V0IHRoZSBXZWJHTCBkcmF3aW5nIHByaW1pdGl2ZSBmb3IgdGhpcyBnZW9tZXRyeS5cbiAqICBAbWV0aG9kIHNldERyYXdUeXBlXG4gKiAgQHBhcmFtIHR5cGUge1N0cmluZ31cbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLnNldERyYXdUeXBlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5zcGVjLnR5cGUgPSB2YWx1ZS50b1VwcGVyQ2FzZSgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBAbWV0aG9kIGdldFZlcnRleFBvc2l0aW9uc1xuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuZ2V0VmVydGV4UG9zaXRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmdldFZlcnRleEJ1ZmZlcigncG9zJyk7XG59O1xuXG4vKipcbiAqIEBtZXRob2QgZ2V0Tm9ybWFsc1xuICovXG5HZW9tZXRyeS5wcm90b3R5cGUuZ2V0Tm9ybWFscyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRWZXJ0ZXhCdWZmZXIoJ25vcm1hbCcpO1xufTtcblxuLyoqXG4gKiBAbWV0aG9kIGdldFRleHR1cmVDb29yZHNcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmdldFRleHR1cmVDb29yZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VmVydGV4QnVmZmVyKCd0ZXhDb29yZCcpO1xufTtcblxuLyoqXG4gKiBBbGxvY2F0ZXMgYW4gZWxlbWVudCBhcnJheVxuICpcbiAqIEBtZXRob2QgZ2V0RW50aXR5XG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IG9yaWdpbiBvbiB0aGUgeC1heGlzIGFzIGEgcGVyY2VudFxuICpcbiAqIEBjaGFpbmFibGVcbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmFkZEluZGV4QnVmZmVyID0gZnVuY3Rpb24gYWRkSW5kZXhCdWZmZXIoYnVmZmVyTmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLnNwZWMuaW5kZXhCdWZmZXJzW2J1ZmZlck5hbWVdID0gdmFsdWUgfHwgW107XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgaW5kZXggYnVmZmVyIHdpdGggY29ycmVzcG9uZGluZyBidWZmZXJOYW1lLlxuICpcbiAqIEBtZXRob2QgZ2V0SW5kZXhCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gTmFtZSBvZiBpbmRleEJ1ZmZlciB0byBiZSByZXRyaWV2ZWQuXG4gKi9cblxuR2VvbWV0cnkucHJvdG90eXBlLmdldEluZGV4QnVmZmVyID0gZnVuY3Rpb24gZ2V0SW5kZXhCdWZmZXIoYnVmZmVyTmFtZSkge1xuICAgIHJldHVybiB0aGlzLnNwZWMuaW5kZXhCdWZmZXJzW2J1ZmZlck5hbWVdO1xufTtcblxuR2VvbWV0cnkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gR2VvbWV0cnk7XG5cbi8qKlxuICogR2V0cyB0aGUgb3JpZ2luIG9mIHRoZSBHZW9tZXRyeS5cbiAqXG4gKiBAbWV0aG9kIGdldE9yaWdpblxuICpcbiAqIEByZXR1cm4ge0FycmF5fSAyLWRpbWVuc2lvbmFsIGFycmF5IHJlcHJlc2VudGluZyB0aGUgR2VvbWV0cnkncyBvcmlnaW5cbiAqL1xuR2VvbWV0cnkucHJvdG90eXBlLmdldE9yaWdpbiA9IGZ1bmN0aW9uIGdldE9yaWdpbigpIHtcbiAgICByZXR1cm4gdGhpcy5zcGVjLnVuaWZvcm1zLm9yaWdpbjtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBvcmlnaW4gb2YgdGhlIEdlb21ldHJ5LlxuICpcbiAqIEBtZXRob2Qgc2V0T3JpZ2luXG4gKiBAY2hhaW5hYmxlXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggb3JpZ2luIG9uIHRoZSB4LWF4aXMgYXMgYSBwZXJjZW50XG4gKiBAcGFyYW0ge051bWJlcn0geSBvcmlnaW4gb24gdGhlIHktYXhpcyBhcyBhIHBlcmNlbnRcbiAqL1xuXG5HZW9tZXRyeS5wcm90b3R5cGUuc2V0T3JpZ2luICA9IGZ1bmN0aW9uIHNldE9yaWdpbih4LCB5KSB7XG4gICAgaWYgKCh4ICE9IG51bGwgJiYgKHggPCAwIHx8IHggPiAxKSkgfHwgKHkgIT0gbnVsbCAmJiAoeSA8IDAgfHwgeSA+IDEpKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPcmlnaW4gbXVzdCBoYXZlIGFuIHggYW5kIHkgdmFsdWUgYmV0d2VlbiAwIGFuZCAxJyk7XG5cbiAgICB0aGlzLnNwZWMudW5pZm9ybXMub3JpZ2luWzBdID0geCAhPSBudWxsID8geCA6IHRoaXMuc3BlYy51bmlmb3Jtcy5vcmlnaW5bMF07XG4gICAgdGhpcy5zcGVjLnVuaWZvcm1zLm9yaWdpblsxXSA9IHkgIT0gbnVsbCA/IHkgOiB0aGlzLnNwZWMudW5pZm9ybXMub3JpZ2luWzFdO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgcmVuZGVyIHNwZWNpZmljYXRpb24gb2YgdGhlIEdlb21ldHJ5LlxuICpcbiAqIEBtZXRob2QgIHJlbmRlclxuICogXG4gKiBAcmV0dXJuIHtPYmplY3R9IHJlbmRlciBzcGVjaWZpY2F0aW9uXG4gKi9cbkdlb21ldHJ5LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRyYW5zZm9ybSA9IHRoaXMuZ2V0RW50aXR5KCkuZ2V0Q29tcG9uZW50KFRSQU5TRk9STSk7XG4gICAgdmFyIG9wYWNpdHkgPSB0aGlzLmdldEVudGl0eSgpLmdldENvbXBvbmVudChPUEFDSVRZKTtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuZ2V0RW50aXR5KCkuZ2V0Q29tcG9uZW50KFNJWkUpO1xuICAgIHZhciBtYXRlcmlhbCA9IHRoaXMuZ2V0RW50aXR5KCkuZ2V0Q29tcG9uZW50KE1BVEVSSUFMUykgfHwge2NodW5rczogW119IDtcblxuICAgIHRoaXMuc3BlYy51bmlmb3Jtcy50cmFuc2Zvcm0gPSB0cmFuc2Zvcm0uZ2V0R2xvYmFsTWF0cml4KCk7XG4gICAgdGhpcy5zcGVjLnVuaWZvcm1zLm9wYWNpdHkgPSBvcGFjaXR5ID8gb3BhY2l0eS5fZ2xvYmFsT3BhY2l0eSA6IDE7XG4gICAgdGhpcy5zcGVjLnVuaWZvcm1zLnNpemUgPSBub3JtYWxpemVTaXplKCh0aGlzLmdldEVudGl0eSgpLmdldENvbnRleHQoKSB8fCB7fSkuX3NpemUsIHNpemUuZ2V0R2xvYmFsU2l6ZSgpKTtcblxuICAgIGlmIChtYXRlcmlhbCkgdGhpcy5zcGVjLnRleHR1cmUgPSBtYXRlcmlhbC50ZXh0dXJlO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWF0ZXJpYWwuY2h1bmtzLmxlbmd0aDsgaSsrKVxuICAgICAgICB0aGlzLnNwZWMudW5pZm9ybXNbbWF0ZXJpYWwuY2h1bmtzW2ldLm5hbWVdID0gMTtcblxuICAgIGZvciAodmFyIG5hbWUgaW4gbWF0ZXJpYWwudW5pZm9ybXMpXG4gICAgICAgIHRoaXMuc3BlYy51bmlmb3Jtc1tuYW1lXSA9IG1hdGVyaWFsLnVuaWZvcm1zW25hbWVdO1xuXG4gICAgcmV0dXJuIHRoaXMuc3BlYztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBvcHRpb25zIG9mIHRoZSBHZW9tZXRyeS5cbiAqXG4gKiBAbWV0aG9kIHNldE9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgb2JqZWN0IG9mIG9wdGlvbnNcbiAqL1xuXG5HZW9tZXRyeS5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLm9yaWdpbikgdGhpcy5zZXRPcmlnaW4ob3B0aW9ucy5vcmlnaW4pO1xufTtcblxuZnVuY3Rpb24gbm9ybWFsaXplU2l6ZShjb250ZXh0U2l6ZSwgdmFsKSB7XG4gICAgY29udGV4dFNpemUgPSBjb250ZXh0U2l6ZSB8fCBbMSwgMSwgMV07XG4gICAgdmFyIHhTY2FsZSA9IGNvbnRleHRTaXplWzBdO1xuICAgIHZhciB5U2NhbGUgPSBjb250ZXh0U2l6ZVsxXTtcblxuICAgIHZhciBhc3BlY3RDb3JyZWN0aW9uID0gMSAvICh4U2NhbGUgPiB5U2NhbGUgPyB5U2NhbGUgOiB4U2NhbGUpO1xuXG4gICAgcmV0dXJuIFtcbiAgICAgICAgdmFsWzBdICogYXNwZWN0Q29ycmVjdGlvbixcbiAgICAgICAgdmFsWzFdICogYXNwZWN0Q29ycmVjdGlvbixcbiAgICAgICAgdmFsWzJdICogIGFzcGVjdENvcnJlY3Rpb25cbiAgICBdO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHZW9tZXRyeTtcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXJzOiBhZG5hbkBmYW1vLnVzLCBqb3NlcGhAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbi8qKlxuICogU2hhZGVyIGlzIHJlc3BvbnNpYmxlIGZvciB0cmF2ZXJzaW5nIHRoZSBsaXN0IG9mIGdlb21ldHJpZXNcbiAqIGFuZCBjb252ZXJ0aW5nIHRoZWlyIHNwZWNzIGludG8gZ2wgYXBpIGNhbGxzLlxuICpcbiAqIEBjbGFzcyAgU2hhZGVyXG4gKi9cblxuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jb3JlL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgTWF0ZXJpYWxzICAgICAgPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdNYXRlcmlhbHMnKTtcblxudmFyIGNodW5rcyA9IFtdO1xudmFyIGNodW5rTWFwID0ge307XG5cbnZhciB2ZXJ0ZXhXcmFwcGVyID0gXCJ2ZWM0IGNsaXBzcGFjZShpbiB2ZWM0IHBvcykge1xcbiAgcmV0dXJuIHZlYzQoKHBvcy54IC8gdV9yZXNvbHV0aW9uLngpICogMi4sXFxuICAgICAgICAgICAgICAocG9zLnkgLyB1X3Jlc29sdXRpb24ueSkgKiAyLixcXG4gICAgICAgICAgICAgIHBvcy56IC8gKHVfcmVzb2x1dGlvbi55ICogMC41KSxcXG4gICAgICAgICAgICAgIHBvcy53KTtcXG59XFxuXFxubWF0MyBnZXROb3JtYWxNYXRyaXgoaW4gbWF0NCBhKSB7XFxuICBtYXQzIG1hdE5vcm07XFxuXFxuICBmbG9hdCBhMDAgPSBhWzBdWzBdLCBhMDEgPSBhWzBdWzFdLCBhMDIgPSBhWzBdWzJdLCBhMDMgPSBhWzBdWzNdLFxcbiAgICBhMTAgPSBhWzFdWzBdLCBhMTEgPSBhWzFdWzFdLCBhMTIgPSBhWzFdWzJdLCBhMTMgPSBhWzFdWzNdLFxcbiAgICBhMjAgPSBhWzJdWzBdLCBhMjEgPSBhWzJdWzFdLCBhMjIgPSBhWzJdWzJdLCBhMjMgPSBhWzJdWzNdLFxcbiAgICBhMzAgPSBhWzNdWzBdLCBhMzEgPSBhWzNdWzFdLCBhMzIgPSBhWzNdWzJdLCBhMzMgPSBhWzNdWzNdLFxcbiAgICBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsXFxuICAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcXG4gICAgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLFxcbiAgICBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsXFxuICAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcXG4gICAgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLFxcbiAgICBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsXFxuICAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcXG4gICAgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLFxcbiAgICBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsXFxuICAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcXG4gICAgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyLFxcblxcbiAgICBkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XFxuXFxuICBkZXQgPSAxLjAgLyBkZXQ7XFxuXFxuICBtYXROb3JtWzBdWzBdID0gKGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSkgKiBkZXQ7XFxuICBtYXROb3JtWzBdWzFdID0gKGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNykgKiBkZXQ7XFxuICBtYXROb3JtWzBdWzJdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XFxuXFxuICBtYXROb3JtWzFdWzBdID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XFxuICBtYXROb3JtWzFdWzFdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XFxuICBtYXROb3JtWzFdWzJdID0gKGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNikgKiBkZXQ7XFxuXFxuICBtYXROb3JtWzJdWzBdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XFxuICBtYXROb3JtWzJdWzFdID0gKGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSkgKiBkZXQ7XFxuICBtYXROb3JtWzJdWzJdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XFxuXFxuICByZXR1cm4gbWF0Tm9ybTtcXG59XFxuLy9kZWZpbmVfdnNDaHVua1xcbnZlYzQgcGlwZWxpbmVfcG9zKGluIHZlYzQgcG9zKSB7XFxuICAvL2FwcGx5X3ZzQ2h1bmtcXG4gIG1hdDQgdHJ4ID0gdV90cmFuc2Zvcm07XFxuXFxuICB0cnggPSBtYXQ0KFxcbiAgICAxLCAwLCAwLCAwLFxcbiAgICAwLC0xLCAwLCAwLFxcbiAgICAwLCAwLCAxLCAwLFxcbiAgICAwLCAwLCAwLCAxXFxuICApICogdHJ4O1xcblxcbiAgcG9zLnh5eiAqPSB1X3NpemUueHl6O1xcblxcbiAgdHJ4WzNdID0gY2xpcHNwYWNlKHRyeFszXSk7XFxuICBmbG9hdCB4VCA9IHRyeFszXVswXTtcXG4gIGZsb2F0IHlUID0gdHJ4WzNdWzFdO1xcblxcbiAgdHJ4WzNdWzBdID0gMC4wO1xcbiAgdHJ4WzNdWzFdID0gMC4wO1xcbiAgXFxuICBwb3MgPSB1X3BlcnNwZWN0aXZlICogdHJ4ICogcG9zO1xcbiAgcG9zLnh5ICs9IHZlYzIoeFQsIHlUKTtcXG4gIHBvcy56ICAqPSAtMS47XFxuICByZXR1cm4gcG9zO1xcbn1cXG5cXG52b2lkIG1haW4oKSB7XFxuICB2X3RleENvb3JkID0gYV90ZXhDb29yZDtcXG4gIHZfbm9ybWFsID0gYV9ub3JtYWw7XFxuICBnbF9Qb3NpdGlvbiA9IHBpcGVsaW5lX3BvcyhhX3Bvcyk7XFxufVwiO1xudmFyIGZyYWdtZW50V3JhcHBlciA9IFwiI2RlZmluZSB0aW1lIHVfdGltZSAqIC4wMDFcXG5mbG9hdCBuc2luKGZsb2F0IHgpIHtcXG4gIHJldHVybiAoc2luKHgpICsgMS4wKSAvIDIuMDtcXG59XFxuXFxudmVjMyBkb1JhbmRvbSh2ZWMyIHAsIGZsb2F0IGksIHZlYzMgcmFuZENvbG9yLCB2ZWM0IHJhbmRSZWN0KSB7XFxuICBmbG9hdCB4ID0gcC54O1xcbiAgZmxvYXQgeSA9IHAueTtcXG4gIHZlYzMgcmdiID0gdmVjMygwLjApO1xcbiAgZmxvYXQgY29sb3IgPSAwLjA7XFxuIFxcbiAgZmxvYXQgZHggPSB4IC0gcmFuZFJlY3QueDtcXG4gICAgZmxvYXQgZHkgPSB5IC0gbW9kKHJhbmRSZWN0LnkgKyBuc2luKHRpbWUpLCAxLjApKm5zaW4odGltZSppLzIwLjApO1xcbiAgZmxvYXQgZGlzdCA9IHNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xcblxcbiAgZmxvYXQgZSA9IDEuMCAvIGRpc3QgLyAxMDAwLjA7XFxuICBpZiAoZGlzdCA8IDAuMSkge1xcbiAgICByZ2IuciA9IGUgKiByYW5kQ29sb3IucjtcXG4gICAgcmdiLmcgPSBlICogcmFuZENvbG9yLmc7XFxuICAgIHJnYi5iID0gZSAqIHJhbmRDb2xvci5iO1xcbiAgfVxcbiAgcmV0dXJuIHJnYjtcXG59XFxuZmxvYXQgc3RhdGUwKHZlYzIgeCkge1xcbiAgcmV0dXJuIHRleHR1cmUyRCh1X2ltYWdlLCBmcmFjdCh4IC8gdV9yZXNvbHV0aW9uLnh5KSkuYTtcXG59XFxuXFxuZmxvYXQgc3RhdGUxKHZlYzIgeCkge1xcbiAgcmV0dXJuIHRleHR1cmUyRCh1X2ltYWdlMiwgZnJhY3QoeCAvIHVfcmVzb2x1dGlvbi54eSkpLmE7XFxufVxcblxcbmZsb2F0IGxhcGxhY2lhbih2ZWMyIHgpIHtcXG4gIHJldHVybiAoc3RhdGUwKHgrdmVjMigtMSwwKSkgK1xcbiAgICAgICAgICBzdGF0ZTAoeCt2ZWMyKDEsMCkpICtcXG4gICAgICAgICAgc3RhdGUwKHgrdmVjMigwLDEpKSArXFxuICAgICAgICAgIHN0YXRlMCh4K3ZlYzIoMCwtMSkpKSArXFxuICAgIHN0YXRlMCh4KTtcXG59XFxuXFxuXFxuZmxvYXQgaGFzaCggZmxvYXQgbiApIHtcXG4gIHJldHVybiBmcmFjdChzaW4obikqNDM3NTguNTQ1Myk7XFxufVxcbmZsb2F0IG5vaXNlKCBpbiB2ZWMzIHggKSB7XFxuICB2ZWMzIHAgPSBmbG9vcih4KTtcXG4gIHZlYzMgZiA9IGZyYWN0KHgpO1xcblxcbiAgZiA9IGYqZiooMy4wLTIuMCpmKTtcXG4gIGZsb2F0IG4gPSBwLnggKyBwLnkqNTcuMCArIDExMy4wKnAuejtcXG4gIHJldHVybiBtaXgobWl4KG1peCggaGFzaChuKyAgMC4wKSwgaGFzaChuKyAgMS4wKSxmLngpLFxcbiAgICAgICAgICAgICAgICAgbWl4KCBoYXNoKG4rIDU3LjApLCBoYXNoKG4rIDU4LjApLGYueCksZi55KSxcXG4gICAgICAgICAgICAgbWl4KG1peCggaGFzaChuKzExMy4wKSwgaGFzaChuKzExNC4wKSxmLngpLFxcbiAgICAgICAgICAgICAgICAgbWl4KCBoYXNoKG4rMTcwLjApLCBoYXNoKG4rMTcxLjApLGYueCksZi55KSxmLnopO1xcbn1cXG5cXG52ZWM0IG1hcCggaW4gdmVjMyBwICl7XFxuICBmbG9hdCBkID0gMC4yIC0gcC55O1xcblxcbiAgdmVjMyBxID0gcCAtIHZlYzMoMS4wLDAuMSwwLjApKih1X3RpbWUqLjAwMDIpO1xcbiAgZmxvYXQgZiA9IDAuNTAwMCpub2lzZSggcSApOyBxID0gcSoyLjAyO1xcbiAgZiArPSAwLjI1MDAqbm9pc2UoIHEgKTsgcSA9IHEqMi4wMztcXG4gIGYgKz0gMC4xMjUwKm5vaXNlKCBxICk7IHEgPSBxKjIuMDE7XFxuICBmICs9IDAuMDYyNSpub2lzZSggcSApO1xcblxcbiAgZCArPSAzLjAgKiBmO1xcblxcbiAgZCA9IGNsYW1wKCBkLCAwLjAsIDEuMCApO1xcbiAgICBcXG4gIHZlYzQgcmVzID0gdmVjNCggZCApO1xcblxcbiAgcmVzLnh5eiA9IG1peCggMS4xNSp2ZWMzKDEuMCwwLjk1LDAuOCksIHZlYzMoMC43LDAuNywwLjcpLCByZXMueCApO1xcbiAgICBcXG4gIHJldHVybiByZXM7XFxufVxcblxcbnZlYzMgc3VuZGlyID0gdmVjMygtMS4wLDAuMCwwLjApO1xcbnZlYzQgcmF5bWFyY2goIGluIHZlYzMgcm8sIGluIHZlYzMgcmQgKSB7XFxuICB2ZWM0IHN1bSA9IHZlYzQoMCwgMCwgMCwgMCk7XFxuICBmbG9hdCB0ID0gMC4wO1xcbiAgZm9yKGludCBpPTA7IGk8MjA7IGkrKykge1xcbiAgICB2ZWMzIHBvcyA9IHJvICsgdCpyZDtcXG4gICAgdmVjNCBjb2wgPSBtYXAoIHBvcyApO1xcblxcbiAgICBmbG9hdCBkaWYgPSAgY2xhbXAoKGNvbC53IC0gbWFwKHBvcyswLjMqc3VuZGlyKS53KS8wLjYsIDAuMCwgMS4wICk7XFxuICAgIHZlYzMgbGluID0gdmVjMygwLjY1LDAuNjgsMC43KSoxLjM1ICsgMC40NSp2ZWMzKDAuNywgMC41LCAwLjMpKmRpZjtcXG4gICAgY29sLnh5eiAqPSBsaW47XFxuICAgIFxcbiAgICBjb2wuYSAqPSAwLjk7XFxuICAgIGNvbC5yZ2IgKj0gY29sLmE7XFxuXFxuICAgIHN1bSA9IHN1bSArIGNvbCooMS4wIC0gc3VtLmEpOyAgICBcXG4gICAgdCArPSBtYXgoMC4xLDAuMDI1KnQpO1xcbiAgfVxcblxcbiAgc3VtLnh5eiAvPSAoMC4wMDErc3VtLncpO1xcblxcbiAgcmV0dXJuIGNsYW1wKCBzdW0sIDAuMCwgMS4wICk7XFxufVxcblxcbi8vZGVmaW5lX2ZzQ2h1bmtcXG52ZWM0IHBpcGVsaW5lX2NvbG9yKGluIHZlYzQgY29sb3IpIHtcXG4gICAgLy9hcHBseV9mc0NodW5rXFxuICAgIHJldHVybiBjb2xvcjtcXG59XFxuXFxudm9pZCBtYWluKCkge1xcbiAgICB2ZWM0IGNvbG9yID0gdmVjNCgwLCAwLCAwLCB1X29wYWNpdHkpO1xcbiAgICBjb2xvciA9IHBpcGVsaW5lX2NvbG9yKGNvbG9yKTtcXG4gICAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7XFxufVwiO1xuXG52YXIgdW5pZm9ybXMgPSB7XG4gICAgc3RhdGVTaXplOiBbMCwgMF0sXG4gICAgdHJhbnNmb3JtOiBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0sXG4gICAgcGVyc3BlY3RpdmU6IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSxcbiAgICBvcGFjaXR5OiAxLFxuICAgIG1vdXNlOiBbMCwgMF0sXG4gICAgb3JpZ2luOiBbLjUsIC41XSxcbiAgICByZXNvbHV0aW9uOiBbMCwgMCwgMF0sXG4gICAgc2l6ZTogWzEsIDEsIDFdLFxuICAgIHRpbWU6IDAsXG4gICAgaW1hZ2U6IHRydWUsXG4gICAgaW1hZ2UyOiB0cnVlLFxuICAgIGxpZ2h0UG9zaXRpb25zOiBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgbGlnaHRDb2xvcnM6IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICBjYW1lcmFQb3M6IFswLCAwLCAwXSxcbiAgICBudW1MaWdodHM6IDBcbn07XG5cbnZhciBhdHRyaWJ1dGVzID0ge1xuICAgIHBvczogWzAsIDAsIDAsIDBdLFxuICAgIHRleENvb3JkOiBbMCwgMF0sXG4gICAgbm9ybWFsOiBbMCwgMCwgMV1cbn07XG5cbnZhciB2YXJ5aW5ncyA9IHtcbiAgICB0ZXhDb29yZDogWzAsIDBdLFxuICAgIG5vcm1hbDogWzAsIDAsIDBdLFxuICAgIGxpZ2h0V2VpZ2h0aW5nOiBbMCwgMCwgMF1cbn07XG5cbnZhciBjYWNoZWRVbmlmb3JtcyAgPSB7fTtcbnZhciBmbGFnZ2VkVW5pZm9ybXMgPSBbXTtcblxudmFyIGhlYWRlciA9ICdwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcXG4nO1xuXG5mdW5jdGlvbiBTaGFkZXIoZ2wpIHtcbiAgICB0aGlzLmdsID0gZ2w7XG4gICAgdGhpcy5yZXNldFByb2dyYW0oKTtcbn1cblxuU2hhZGVyLnByb3RvdHlwZS5yZXNldFByb2dyYW0gPSBmdW5jdGlvbiByZXNldFByb2dyYW0oKSB7XG4gICAgdmFyIHZzQ2h1bmtEZWZpbmVzID0gW107XG4gICAgdmFyIHZzQ2h1bmtBcHBsaWVzID0gW107XG4gICAgdmFyIGZzQ2h1bmtEZWZpbmVzID0gW107XG4gICAgdmFyIGZzQ2h1bmtBcHBsaWVzID0gW107XG5cbiAgICB2YXIgdmVydGV4SGVhZGVyID0gW2hlYWRlcl07XG4gICAgdmFyIGZyYWdtZW50SGVhZGVyID0gW2hlYWRlcl07XG5cbiAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnMgPSB7fTtcblxuICAgIHRoaXMuYXR0cmlidXRlcyA9IHt9O1xuICAgIHRoaXMudW5pZm9ybXMgPSB1bmlmb3JtcztcbiAgICBmbGFnZ2VkVW5pZm9ybXMgPSBbXTtcblxuICAgIE1hdGVyaWFscy5mb3JFYWNoKGZ1bmN0aW9uIChyZW5kZXJOb2RlKSB7XG4gICAgICAgIHZhciBtYXRlcmlhbCA9IHJlbmRlck5vZGUuZ2V0Q29tcG9uZW50KCdtYXRlcmlhbCcpLCBuYW1lO1xuXG4gICAgICAgIGZvciAobmFtZSBpbiBtYXRlcmlhbC51bmlmb3JtcykgdW5pZm9ybXNbbmFtZV0gPSB1bmlmb3Jtc1tuYW1lXSB8fCBtYXRlcmlhbC51bmlmb3Jtc1tuYW1lXTtcblxuICAgICAgICBmb3IgKG5hbWUgaW4gbWF0ZXJpYWwudmFyeWluZ3MpIHZhcnlpbmdzW25hbWVdID0gdmFyeWluZ3NbbmFtZV0gfHwgbWF0ZXJpYWwudmFyeWluZ3NbbmFtZV07XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXRlcmlhbC5jaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaHVuayA9IG1hdGVyaWFsLmNodW5rc1tpXTtcbiAgICAgICAgICAgIG5hbWUgPSBjaHVuay5uYW1lO1xuXG4gICAgICAgICAgICBpZiAoZmxhZ2dlZFVuaWZvcm1zLmluZGV4T2YobmFtZSkgIT09IC0xKSBjb250aW51ZTtcblxuXG4gICAgICAgICAgICBpZiAoY2h1bmsudnNEZWZpbmVzKSB2c0NodW5rRGVmaW5lcy5wdXNoKGNodW5rLnZzRGVmaW5lcyk7XG4gICAgICAgICAgICBpZiAoY2h1bmsuZnNEZWZpbmVzKSBmc0NodW5rRGVmaW5lcy5wdXNoKGNodW5rLmZzRGVmaW5lcyk7XG5cbiAgICAgICAgICAgIGlmIChjaHVuay52cykge1xuICAgICAgICAgICAgICAgIHZzQ2h1bmtEZWZpbmVzLnB1c2goJ3ZvaWQgJyArIG5hbWUgKyAnKGlub3V0IHZlYzQgcG9zKSB7ICcgKyBjaHVuay52cyArICcgfVxcbicpO1xuICAgICAgICAgICAgICAgIHZzQ2h1bmtBcHBsaWVzLnB1c2goJ2lmICh1XycgKyBuYW1lICsnPT0gMS4pJyArIG5hbWUgKyAnKHBvcyk7XFxuJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjaHVuay5mcykge1xuICAgICAgICAgICAgICAgIGZzQ2h1bmtEZWZpbmVzLnB1c2goJ3ZvaWQgJyArIG5hbWUgKyAnKGlub3V0IHZlYzQgY29sb3IpIHsgJyArIGNodW5rLmZzICsgJyB9XFxuJyk7XG4gICAgICAgICAgICAgICAgZnNDaHVua0FwcGxpZXMucHVzaCgnaWYgKHVfJyArIG5hbWUgKyc9PSAxLiknICsgbmFtZSArICcoY29sb3IpO1xcbicpOyAgICBcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy51bmlmb3Jtc1tuYW1lXSA9IDA7XG5cbiAgICAgICAgICAgIGZsYWdnZWRVbmlmb3Jtcy5wdXNoKG5hbWUpO1xuICAgICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICBcbiAgICBmb3IgKHZhciBuYW1lICBpbiB0aGlzLnVuaWZvcm1zKSB7XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd1bmlmb3JtICcgKyBkYXRhVG9Vbmlmb3JtVHlwZSh0aGlzLnVuaWZvcm1zW25hbWVdKSArICcgdV8nICsgbmFtZSArICc7XFxuJyk7XG4gICAgICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3VuaWZvcm0gJyArIGRhdGFUb1VuaWZvcm1UeXBlKHRoaXMudW5pZm9ybXNbbmFtZV0pICsgJyB1XycgKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICBmb3IgKG5hbWUgaW4gYXR0cmlidXRlcykge1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgnYXR0cmlidXRlICcgKyBkYXRhVG9Vbmlmb3JtVHlwZShhdHRyaWJ1dGVzW25hbWVdKSArICcgJyArICdhXycgKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICBmb3IgKG5hbWUgaW4gdmFyeWluZ3MpIHtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ3ZhcnlpbmcgJyArIGRhdGFUb1VuaWZvcm1UeXBlKHZhcnlpbmdzW25hbWVdKSArICcgJyArICd2XycgKyBuYW1lICsgJztcXG4nKTtcbiAgICAgICAgZnJhZ21lbnRIZWFkZXIucHVzaCgndmFyeWluZyAnICsgZGF0YVRvVW5pZm9ybVR5cGUodmFyeWluZ3NbbmFtZV0pICsgJyAnICsgJ3ZfJyArIG5hbWUgKyAnO1xcbicpO1xuICAgIH1cblxuICAgIHZhciB2ZXJ0ZXhTb3VyY2UgPSB2ZXJ0ZXhIZWFkZXIuam9pbignXFxuJykgKyB2ZXJ0ZXhXcmFwcGVyXG4gICAgICAgICAgICAucmVwbGFjZSgnLy9kZWZpbmVfdnNDaHVuaycsIHZzQ2h1bmtEZWZpbmVzLmpvaW4oJ1xcbicpKVxuICAgICAgICAgICAgLnJlcGxhY2UoJy8vYXBwbHlfdnNDaHVuaycsIHZzQ2h1bmtBcHBsaWVzLmpvaW4oJ1xcbicpKTtcblxuICAgIHZhciBmcmFnbWVudFNvdXJjZSA9IGZyYWdtZW50SGVhZGVyLmpvaW4oJ1xcbicpICsgZnJhZ21lbnRXcmFwcGVyXG4gICAgICAgICAgICAucmVwbGFjZSgnLy9kZWZpbmVfZnNDaHVuaycsIGZzQ2h1bmtEZWZpbmVzLmpvaW4oJ1xcbicpKVxuICAgICAgICAgICAgLnJlcGxhY2UoJy8vYXBwbHlfZnNDaHVuaycsIGZzQ2h1bmtBcHBsaWVzLmpvaW4oJ1xcbicpKTtcbiAgICBcbiAgICB2YXIgcHJvZ3JhbSA9IHRoaXMuZ2wuY3JlYXRlUHJvZ3JhbSgpO1xuICAgIFxuICAgIHRoaXMuZ2wuYXR0YWNoU2hhZGVyKHByb2dyYW0sIGNvbXBpbGVTb3VyY2UodGhpcy5nbCwgdGhpcy5nbC5WRVJURVhfU0hBREVSLCB2ZXJ0ZXhTb3VyY2UpKTtcbiAgICB0aGlzLmdsLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBjb21waWxlU291cmNlKHRoaXMuZ2wsIHRoaXMuZ2wuRlJBR01FTlRfU0hBREVSLCBmcmFnbWVudFNvdXJjZSkpO1xuICAgIHRoaXMuZ2wubGlua1Byb2dyYW0ocHJvZ3JhbSk7XG5cbiAgICBpZiAoISB0aGlzLmdsLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgdGhpcy5nbC5MSU5LX1NUQVRVUykpXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2xpbmsgZXJyb3I6ICcgKyB0aGlzLmdsLmdldFByb2dyYW1JbmZvTG9nKHByb2dyYW0pKTtcblxuICAgIGVsc2UgdGhpcy5wcm9ncmFtID0gcHJvZ3JhbTtcbn1cblxuU2hhZGVyLnByb3RvdHlwZS51bmlmb3JtSXNDYWNoZWQgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICBpZihjYWNoZWRVbmlmb3Jtc1tuYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZSBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICAgICAgY2FjaGVkVW5pZm9ybXNbbmFtZV0gPSBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFVuaWZvcm1zW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KXtcbiAgICAgICAgdmFyIGkgPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGlmKHZhbHVlW2ldICE9PSBjYWNoZWRVbmlmb3Jtc1tuYW1lXVtpXSkge1xuICAgICAgICAgICAgICAgIGNhY2hlZFVuaWZvcm1zW25hbWVdID0gbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZWxzZSBpZihjYWNoZWRVbmlmb3Jtc1tuYW1lXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgY2FjaGVkVW5pZm9ybXNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuXG5TaGFkZXIucHJvdG90eXBlLnNldFVuaWZvcm1zID0gZnVuY3Rpb24gKGVudGl0eVVuaWZvcm1zKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcblxuICAgIGlmICghIHRoaXMucHJvZ3JhbSkgcmV0dXJuO1xuXG4gICAgZ2wudXNlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXG4gICAgZm9yICh2YXIgbmFtZSBpbiBlbnRpdHlVbmlmb3Jtcykge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLnVuaWZvcm1Mb2NhdGlvbnNbbmFtZV0gfHwgZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfJyArIG5hbWUpO1xuICAgICAgICBpZiAoISBsb2NhdGlvbikgY29udGludWU7XG5cbiAgICAgICAgdGhpcy51bmlmb3JtTG9jYXRpb25zW25hbWVdID0gbG9jYXRpb247XG4gICAgICAgIHZhciB2YWx1ZSA9IGVudGl0eVVuaWZvcm1zW25hbWVdO1xuXG4gICAgICAgIC8vIGlmKHRoaXMudW5pZm9ybUlzQ2FjaGVkKG5hbWUsIHZhbHVlKSkgY29udGludWU7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNhc2UgMTogZ2wudW5pZm9ybTFmdihsb2NhdGlvbiwgbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSkpOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6IGdsLnVuaWZvcm0yZnYobG9jYXRpb24sIG5ldyBGbG9hdDMyQXJyYXkodmFsdWUpKTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzOiBnbC51bmlmb3JtM2Z2KGxvY2F0aW9uLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDogZ2wudW5pZm9ybTRmdihsb2NhdGlvbiwgbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSkpOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDk6IGdsLnVuaWZvcm1NYXRyaXgzZnYobG9jYXRpb24sIGZhbHNlLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTY6IGdsLnVuaWZvcm1NYXRyaXg0ZnYobG9jYXRpb24sIGZhbHNlLCBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKSk7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRocm93ICdjYW50IGxvYWQgdW5pZm9ybSBcIicgKyBuYW1lICsgJ1wiIG9mIGxlbmd0aCA6JyArIHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghIGlzTmFOKHBhcnNlRmxvYXQodmFsdWUpKSAmJiBpc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlmIChuYW1lID09ICdpbWFnZTInKSBcbiAgICAgICAgICAgICAgICBnbC51bmlmb3JtMWkobG9jYXRpb24sIHZhbHVlKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBnbC51bmlmb3JtMWYobG9jYXRpb24sIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93ICdzZXQgdW5pZm9ybSBcIicgKyBuYW1lICsgJ1wiIHRvIGludmFsaWQgdHlwZSA6JyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZmxhZ2dlZFVuaWZvcm1zLmZvckVhY2goZnVuY3Rpb24gKGZsYWcpIHtcbiAgICAgICAgaWYgKCEgZW50aXR5VW5pZm9ybXNbZmxhZ10pICB7XG4gICAgICAgICAgICAvLyBpZihjYWNoZWRVbmlmb3Jtc1tmbGFnXSAhPT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIGNhY2hlZFVuaWZvcm1zW2ZsYWddID0gMDtcbiAgICAgICAgICAgICAgICBnbC51bmlmb3JtMWYodGhpcy51bmlmb3JtTG9jYXRpb25zW2ZsYWddLCAwKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5mdW5jdGlvbiBkYXRhVG9Vbmlmb3JtVHlwZSh0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT09IHRydWUpIHJldHVybiAnc2FtcGxlcjJEJztcbiAgICBpZiAoISBBcnJheS5pc0FycmF5KHR5cGUpKSByZXR1cm4gJ2Zsb2F0JztcbiAgICB2YXIgbGVuZ3RoID0gdHlwZS5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCA8IDUpIHJldHVybiAndmVjJyArIGxlbmd0aDtcbiAgICBlbHNlIHJldHVybiAnbWF0JyArIChNYXRoLnNxcnQodHlwZS5sZW5ndGgpIHwgMCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVTb3VyY2UoZ2wsIHR5cGUsIHNvdXJjZSkge1xuICAgIHZhciBzaGFkZXIgPSBnbC5jcmVhdGVTaGFkZXIodHlwZSk7XG4gICAgZ2wuc2hhZGVyU291cmNlKHNoYWRlciwgc291cmNlKTtcbiAgICBnbC5jb21waWxlU2hhZGVyKHNoYWRlcik7XG4gICAgaWYgKCFnbC5nZXRTaGFkZXJQYXJhbWV0ZXIoc2hhZGVyLCBnbC5DT01QSUxFX1NUQVRVUykpIHtcbiAgICAgICAgdmFyIGkgPSAyO1xuICAgICAgICBjb25zb2xlLmxvZygnMTonICsgc291cmNlLnJlcGxhY2UoL1xcbi9nLCBmdW5jdGlvbiAoKSB7IHJldHVybiAnXFxuJyArIChpKyspICsgJzogJzsgfSkpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdjb21waWxlIGVycm9yOiAnICsgZ2wuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHNoYWRlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaGFkZXI7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogYWRuYW5AZmFtby51cywgam9zZXBoQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGV4dHVyZSBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCBzdG9yZXMgaW1hZ2UgZGF0YVxuICogdG8gYmUgYWNjZXNzZWQgZnJvbSBhIHNoYWRlciBvciB1c2VkIGFzIGEgcmVuZGVyIHRhcmdldC5cbiAqXG4gKiBAY2xhc3MgVGV4dHVyZVxuICogQGNvbnN0cnVjdG9yXG4gKiBcbiAqL1xuXG5mdW5jdGlvbiBUZXh0dXJlKGdsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5pZCA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcbiAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAwO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDA7XG4gICAgdGhpcy5mb3JtYXQgPSBvcHRpb25zLmZvcm1hdCB8fCBnbC5SR0JBO1xuICAgIHRoaXMudHlwZSA9IG9wdGlvbnMudHlwZSB8fCBnbC5VTlNJR05FRF9CWVRFO1xuICAgIHRoaXMuZ2wgPSBnbDtcblxuICAgIGdsLnBpeGVsU3RvcmVpKGdsLlVOUEFDS19GTElQX1lfV0VCR0wsIHRydWUpO1xuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQpO1xuICAgIFxuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLFxuICAgICAgICAgICAgICAgICAgICAgZ2xbb3B0aW9ucy5maWx0ZXIgfHwgb3B0aW9ucy5tYWdGaWx0ZXJdIHx8IGdsLk5FQVJFU1QpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsXG4gICAgICAgICAgICAgICAgICAgICBnbFtvcHRpb25zLmZpbHRlciB8fCBvcHRpb25zLm1pbkZpbHRlcl0gfHwgZ2wuTkVBUkVTVCk7XG5cbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLFxuICAgICAgICAgICAgICAgICAgICAgZ2xbb3B0aW9ucy53cmFwIHx8IG9wdGlvbnMud3JhcFNdIHx8IGdsLkNMQU1QX1RPX0VER0UpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCxcbiAgICAgICAgICAgICAgICAgICAgIGdsW29wdGlvbnMud3JhcCB8fCBvcHRpb25zLndyYXBTXSB8fCBnbC5DTEFNUF9UT19FREdFKTtcblxuICAgIGdsLnRleEltYWdlMkQoZ2wuVEVYVFVSRV8yRCwgMCwgdGhpcy5mb3JtYXQsIHdpZHRoLCBoZWlnaHQsIDAsIHRoaXMuZm9ybWF0LCB0aGlzLnR5cGUsIG51bGwpO1xuXG4gICAgaWYgKG9wdGlvbnMubWluRmlsdGVyICYmIG9wdGlvbnMubWluRmlsdGVyICE9IGdsLk5FQVJFU1QgJiYgb3B0aW9ucy5taW5GaWx0ZXIgIT0gZ2wuTElORUFSKSB7XG4gICAgICAgIGdsLmdlbmVyYXRlTWlwbWFwKGdsLlRFWFRVUkVfMkQpO1xuICAgIH1cbn1cblxuVGV4dHVyZS5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uIGJpbmQodW5pdCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCArICh1bml0IHx8IDApKTtcbiAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmlkKTtcbn07XG5cblRleHR1cmUucHJvdG90eXBlLnVuYmluZCA9IGZ1bmN0aW9uIHVuYmluZCh1bml0KSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwICsgKHVuaXQgfHwgMCkpO1xuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xufTtcblxuVGV4dHVyZS5wcm90b3R5cGUuc2V0SW1hZ2UgPSBmdW5jdGlvbiBzZXRJbWFnZShpbWcpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIGNvbnNvbGUubG9nKGltZyk7XG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCB0aGlzLmZvcm1hdCwgdGhpcy5mb3JtYXQsIHRoaXMudHlwZSwgaW1nKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRleHR1cmUucHJvdG90eXBlLnJlYWRCYWNrID0gZnVuY3Rpb24gcmVhZEJhY2soeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgeCA9IHggfHwgMDtcbiAgICB5ID0geSB8fCAwO1xuICAgIHdpZHRoID0gd2lkdGggfHwgdGhpcy53aWR0aDtcbiAgICBoZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5oZWlnaHQ7XG4gICAgdmFyIGZiID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcbiAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIGZiKTtcbiAgICBnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChnbC5GUkFNRUJVRkZFUiwgZ2wuQ09MT1JfQVRUQUNITUVOVDAsIGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQsIDApO1xuICAgIGlmIChnbC5jaGVja0ZyYW1lYnVmZmVyU3RhdHVzKGdsLkZSQU1FQlVGRkVSKSA9PSBnbC5GUkFNRUJVRkZFUl9DT01QTEVURSkge1xuICAgICAgICB2YXIgcGl4ZWxzID0gbmV3IFVpbnQ4QXJyYXkod2lkdGggKiBoZWlnaHQgKiA0KTtcbiAgICAgICAgZ2wucmVhZFBpeGVscyh4LCB5LCB3aWR0aCwgaGVpZ2h0LCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBwaXhlbHMpO1xuICAgIH1cbiAgICByZXR1cm4gcGl4ZWxzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0dXJlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBtdWx0aXBseShvdXRwdXRBcnJheSwgbGVmdCwgcmlnaHQpIHtcbiAgICB2YXIgYTAwID0gbGVmdFswXSwgIGEwMSA9IGxlZnRbMV0sICBhMDIgPSBsZWZ0WzJdLCAgYTAzID0gbGVmdFszXSxcbiAgICAgICAgYTEwID0gbGVmdFs0XSwgIGExMSA9IGxlZnRbNV0sICBhMTIgPSBsZWZ0WzZdLCAgYTEzID0gbGVmdFs3XSxcbiAgICAgICAgYTIwID0gbGVmdFs4XSwgIGEyMSA9IGxlZnRbOV0sICBhMjIgPSBsZWZ0WzEwXSwgYTIzID0gbGVmdFsxMV0sXG4gICAgICAgIGEzMCA9IGxlZnRbMTJdLCBhMzEgPSBsZWZ0WzEzXSwgYTMyID0gbGVmdFsxNF0sIGEzMyA9IGxlZnRbMTVdO1xuICAgIFxuICAgIHZhciBiMCA9IHJpZ2h0WzBdLCBiMSA9IHJpZ2h0WzFdLCBiMiA9IHJpZ2h0WzJdLCBiMyA9IHJpZ2h0WzNdOyBcblxuICAgIG91dHB1dEFycmF5WzBdID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dHB1dEFycmF5WzFdID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dHB1dEFycmF5WzJdID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dHB1dEFycmF5WzNdID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuICAgIFxuICAgIGIwID0gcmlnaHRbNF07IGIxID0gcmlnaHRbNV07IGIyID0gcmlnaHRbNl07IGIzID0gcmlnaHRbN107XG5cbiAgICBvdXRwdXRBcnJheVs0XSA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXRwdXRBcnJheVs1XSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXRwdXRBcnJheVs2XSA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXRwdXRBcnJheVs3XSA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcbiAgICBcbiAgICBiMCA9IHJpZ2h0WzhdOyBiMSA9IHJpZ2h0WzldOyBiMiA9IHJpZ2h0WzEwXTsgYjMgPSByaWdodFsxMV07XG5cbiAgICBvdXRwdXRBcnJheVs4XSAgPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0cHV0QXJyYXlbOV0gID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dHB1dEFycmF5WzEwXSA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXRwdXRBcnJheVsxMV0gPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG4gICAgXG4gICAgYjAgPSByaWdodFsxMl07IGIxID0gcmlnaHRbMTNdOyBiMiA9IHJpZ2h0WzE0XTsgYjMgPSByaWdodFsxNV07XG5cbiAgICBvdXRwdXRBcnJheVsxMl0gPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0cHV0QXJyYXlbMTNdID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dHB1dEFycmF5WzE0XSA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXRwdXRBcnJheVsxNV0gPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG4gICAgcmV0dXJuIG91dHB1dEFycmF5O1xufVxuXG5cbmZ1bmN0aW9uIGdldFRyYW5zbGF0aW9uRnJvbU11bHRpcGxpY2F0aW9uKG91dHB1dEFycmF5LCBsZWZ0LCByaWdodCkge1xuICAgIHZhciBhMDAgPSBsZWZ0WzBdLCAgYTAxID0gbGVmdFsxXSxcbiAgICAgICAgYTEwID0gbGVmdFs0XSwgIGExMSA9IGxlZnRbNV0sXG4gICAgICAgIGEyMCA9IGxlZnRbOF0sICBhMjEgPSBsZWZ0WzldLFxuICAgICAgICBhMzAgPSBsZWZ0WzEyXSwgYTMxID0gbGVmdFsxM107XG5cbiAgICB2YXIgYjAgPSByaWdodFsxMl0sXG4gICAgICAgIGIxID0gcmlnaHRbMTNdLFxuICAgICAgICBiMiA9IHJpZ2h0WzE0XSxcbiAgICAgICAgYjMgPSByaWdodFsxNV07XG5cbiAgICBvdXRwdXRBcnJheVswXSA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXRwdXRBcnJheVsxXSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICByZXR1cm4gb3V0cHV0QXJyYXk7XG59XG5cbmZ1bmN0aW9uIGludmVydChvdXRwdXRBcnJheSwgbWF0cml4KSB7XG4gICAgdmFyIGEwMCA9IG1hdHJpeFswXSwgIGEwMSA9IG1hdHJpeFsxXSwgIGEwMiA9IG1hdHJpeFsyXSwgIGEwMyA9IG1hdHJpeFszXSxcbiAgICAgICAgYTEwID0gbWF0cml4WzRdLCAgYTExID0gbWF0cml4WzVdLCAgYTEyID0gbWF0cml4WzZdLCAgYTEzID0gbWF0cml4WzddLFxuICAgICAgICBhMjAgPSBtYXRyaXhbOF0sICBhMjEgPSBtYXRyaXhbOV0sICBhMjIgPSBtYXRyaXhbMTBdLCBhMjMgPSBtYXRyaXhbMTFdLFxuICAgICAgICBhMzAgPSBtYXRyaXhbMTJdLCBhMzEgPSBtYXRyaXhbMTNdLCBhMzIgPSBtYXRyaXhbMTRdLCBhMzMgPSBtYXRyaXhbMTVdLFxuXG4gICAgICAgIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCxcbiAgICAgICAgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLFxuICAgICAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXG4gICAgICAgIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSxcbiAgICAgICAgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLFxuICAgICAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXG4gICAgICAgIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCxcbiAgICAgICAgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLFxuICAgICAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXG4gICAgICAgIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSxcbiAgICAgICAgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLFxuICAgICAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBkZXRlcm1pbmFudFxuICAgICAgICBkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XG5cbiAgICBpZiAoIWRldCkgcmV0dXJuIG51bGw7XG4gICAgZGV0ID0gMS4wIC8gZGV0O1xuXG4gICAgb3V0cHV0QXJyYXlbMF0gID0gKGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSkgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbMV0gID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbMl0gID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbM10gID0gKGEyMiAqIGIwNCAtIGEyMSAqIGIwNSAtIGEyMyAqIGIwMykgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbNF0gID0gKGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNykgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbNV0gID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbNl0gID0gKGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSkgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbN10gID0gKGEyMCAqIGIwNSAtIGEyMiAqIGIwMiArIGEyMyAqIGIwMSkgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbOF0gID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbOV0gID0gKGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNikgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbMTBdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbMTFdID0gKGEyMSAqIGIwMiAtIGEyMCAqIGIwNCAtIGEyMyAqIGIwMCkgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbMTJdID0gKGExMSAqIGIwNyAtIGExMCAqIGIwOSAtIGExMiAqIGIwNikgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbMTNdID0gKGEwMCAqIGIwOSAtIGEwMSAqIGIwNyArIGEwMiAqIGIwNikgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbMTRdID0gKGEzMSAqIGIwMSAtIGEzMCAqIGIwMyAtIGEzMiAqIGIwMCkgKiBkZXQ7XG4gICAgb3V0cHV0QXJyYXlbMTVdID0gKGEyMCAqIGIwMyAtIGEyMSAqIGIwMSArIGEyMiAqIGIwMCkgKiBkZXQ7XG4gICAgcmV0dXJuIG91dHB1dEFycmF5O1xufVxuXG5mdW5jdGlvbiBnZXRXZnJvbU11bHRpcGxpY2F0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgdmFyIGEwMCA9IGxlZnRbMF0sICBhMDEgPSBsZWZ0WzFdLCAgYTAyID0gbGVmdFsyXSwgIGEwMyA9IGxlZnRbM10sXG4gICAgICAgIGExMCA9IGxlZnRbNF0sICBhMTEgPSBsZWZ0WzVdLCAgYTEyID0gbGVmdFs2XSwgIGExMyA9IGxlZnRbN10sXG4gICAgICAgIGEyMCA9IGxlZnRbOF0sICBhMjEgPSBsZWZ0WzldLCAgYTIyID0gbGVmdFsxMF0sIGEyMyA9IGxlZnRbMTFdLFxuICAgICAgICBhMzAgPSBsZWZ0WzEyXSwgYTMxID0gbGVmdFsxM10sIGEzMiA9IGxlZnRbMTRdLCBhMzMgPSBsZWZ0WzE1XTtcblxuICAgIHZhciBiMCA9IHJpZ2h0WzEyXSwgYjEgPSByaWdodFsxM10sIGIyID0gcmlnaHRbMTRdLCBiMyA9IHJpZ2h0WzE1XTtcblxuICAgIHJldHVybiBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzAgKyBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzEgKyBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzIgKyBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG59XG5cbmZ1bmN0aW9uIGFwcGx5VG9WZWN0b3Iob3V0cHV0LCBtYXRyaXgsIHZlY3Rvcikge1xuICAgIHZhciBhMDAgPSBtYXRyaXhbMF0sICBhMDEgPSBtYXRyaXhbMV0sICBhMDIgPSBtYXRyaXhbMl0sICBhMDMgPSBtYXRyaXhbM10sXG4gICAgICAgIGExMCA9IG1hdHJpeFs0XSwgIGExMSA9IG1hdHJpeFs1XSwgIGExMiA9IG1hdHJpeFs2XSwgIGExMyA9IG1hdHJpeFs3XSxcbiAgICAgICAgYTIwID0gbWF0cml4WzhdLCAgYTIxID0gbWF0cml4WzldLCAgYTIyID0gbWF0cml4WzEwXSwgYTIzID0gbWF0cml4WzExXSxcbiAgICAgICAgYTMwID0gbWF0cml4WzEyXSwgYTMxID0gbWF0cml4WzEzXSwgYTMyID0gbWF0cml4WzE0XSwgYTMzID0gbWF0cml4WzE1XTtcblxuICAgIHZhciB2MCA9IHZlY3RvclswXSwgdjEgPSB2ZWN0b3JbMV0sIHYyID0gdmVjdG9yWzJdLCB2MyA9IHZlY3RvclszXTtcblxuICAgIG91dHB1dFswXSA9IGEwMCAqIHYwICsgYTEwICogdjEgKyBhMjAgKiB2MiArIGEzMCAqIHYzO1xuICAgIG91dHB1dFsxXSA9IGEwMSAqIHYwICsgYTExICogdjEgKyBhMjEgKiB2MiArIGEzMSAqIHYzO1xuICAgIG91dHB1dFsyXSA9IGEwMiAqIHYwICsgYTEyICogdjEgKyBhMjIgKiB2MiArIGEzMiAqIHYzO1xuICAgIG91dHB1dFszXSA9IGEwMyAqIHYwICsgYTEzICogdjEgKyBhMjMgKiB2MiArIGEzMyAqIHYzO1xuXG4gICAgcmV0dXJuIG91dHB1dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbXVsdGlwbHkgICAgICAgICAgICAgICAgICAgICAgICAgOiBtdWx0aXBseSxcbiAgICBnZXRUcmFuc2xhdGlvbkZyb21NdWx0aXBsaWNhdGlvbiA6IGdldFRyYW5zbGF0aW9uRnJvbU11bHRpcGxpY2F0aW9uLFxuICAgIGludmVydCAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaW52ZXJ0LFxuICAgIElERU5USVRZICAgICAgICAgICAgICAgICAgICAgICAgIDogbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pLFxuICAgIGdldFdmcm9tTXVsdGlwbGljYXRpb24gICAgICAgICAgIDogZ2V0V2Zyb21NdWx0aXBsaWNhdGlvbixcbiAgICBhcHBseVRvVmVjdG9yICAgICAgICAgICAgICAgICAgICA6IGFwcGx5VG9WZWN0b3Jcbn07IiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogd2lsbEBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBWZWMzID0gZnVuY3Rpb24oeCx5LHope1xuICAgIGlmICh4IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgdGhpcy54ID0geFswXSB8fCAwO1xuICAgICAgICB0aGlzLnkgPSB4WzFdIHx8IDA7XG4gICAgICAgIHRoaXMueiA9IHhbMl0gfHwgMDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHggfHwgMDtcbiAgICAgICAgdGhpcy55ID0geSB8fCAwO1xuICAgICAgICB0aGlzLnogPSB6IHx8IDA7XG4gICAgfVxufTtcblxuVmVjMy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KHgseSx6KSB7XG4gICAgaWYgKHggaW5zdGFuY2VvZiBBcnJheSB8fCB4IGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgIHRoaXMueCA9IHhbMF07XG4gICAgICAgIHRoaXMueSA9IHhbMV07XG4gICAgICAgIHRoaXMueiA9IHhbMl07XG4gICAgfSBlbHNlIGlmICh4IGluc3RhbmNlb2YgVmVjMykge1xuICAgICAgICB0aGlzLnggPSB4Lng7XG4gICAgICAgIHRoaXMueSA9IHgueTtcbiAgICAgICAgdGhpcy56ID0geC56O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghaXNOYU4oeCkpIHRoaXMueCA9IHg7XG4gICAgICAgIGlmICghaXNOYU4oeSkpIHRoaXMueSA9IHk7XG4gICAgICAgIGlmICghaXNOYU4oeikpIHRoaXMueiA9IHo7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkKHYpIHtcbiAgICB0aGlzLnggKz0gdi54O1xuICAgIHRoaXMueSArPSB2Lnk7XG4gICAgdGhpcy56ICs9IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLnN1YnRyYWN0ID0gZnVuY3Rpb24gc3VidHJhY3Qodikge1xuICAgIHRoaXMueCAtPSB2Lng7XG4gICAgdGhpcy55IC09IHYueTtcbiAgICB0aGlzLnogLT0gdi56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUucm90YXRlWCA9IGZ1bmN0aW9uIHJvdGF0ZVgodGhldGEpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnkgPSB5ICogY29zVGhldGEgLSB6ICogc2luVGhldGE7XG4gICAgdGhpcy56ID0geSAqIHNpblRoZXRhICsgeiAqIGNvc1RoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5yb3RhdGVZID0gZnVuY3Rpb24gcm90YXRlWSh0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHRoaXMueCA9IHogKiBzaW5UaGV0YSArIHggKiBjb3NUaGV0YTtcbiAgICB0aGlzLnogPSB6ICogY29zVGhldGEgLSB4ICogc2luVGhldGE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLnJvdGF0ZVogPSBmdW5jdGlvbiByb3RhdGVaKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy54ID0gICB4ICogY29zVGhldGEgLSB5ICogc2luVGhldGE7XG4gICAgdGhpcy55ID0gICB4ICogc2luVGhldGEgKyB5ICogY29zVGhldGE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLmNyb3NzID0gZnVuY3Rpb24odikge1xuICAgIHZhciB4ID0gdGhpcy55ICogdi56IC0gdGhpcy56ICogdi55O1xuICAgIHZhciB5ID0gdGhpcy56ICogdi54IC0gdGhpcy54ICogdi56O1xuICAgIHZhciB6ID0gdGhpcy54ICogdi55IC0gdGhpcy55ICogdi54O1xuXG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMueiA9IHo7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5yb3RhdGVRID0gZnVuY3Rpb24gcm90YXRlUShxKSB7XG4gICAgdGhpcy5jb3B5KHEucm90YXRlVmVjdG9yKHRoaXMpKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gc2NhbGUocykge1xuICAgIGlmIChzIGluc3RhbmNlb2YgVmVjMykge1xuICAgICAgICB0aGlzLnggKj0gcy54O1xuICAgICAgICB0aGlzLnkgKj0gcy55O1xuICAgICAgICB0aGlzLnogKj0gcy56O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMueCAqPSBzO1xuICAgICAgICB0aGlzLnkgKj0gcztcbiAgICAgICAgdGhpcy56ICo9IHM7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUuaW52ZXJ0ID0gZnVuY3Rpb24gaW52ZXJ0KCkge1xuICAgIHRoaXMueCAqPSAtMTtcbiAgICB0aGlzLnkgKj0gLTE7XG4gICAgdGhpcy56ICo9IC0xO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG5WZWMzLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAoZm4pIHtcbiAgICB0aGlzLnggPSBmbih0aGlzLngpO1xuICAgIHRoaXMueSA9IGZuKHRoaXMueSk7XG4gICAgdGhpcy56ID0gZm4odGhpcy56KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uIGxlbmd0aCgpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeik7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSh2KSB7XG4gICAgdGhpcy54ID0gdi54O1xuICAgIHRoaXMueSA9IHYueTtcbiAgICB0aGlzLnogPSB2Lno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIGNsZWFyKHYpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gICAgdGhpcy56ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblZlYzMucHJvdG90eXBlLmlzWmVybyA9IGZ1bmN0aW9uIGlzWmVybygpIHtcbiAgICBpZiAodGhpcy54ICE9PSAwIHx8IHRoaXMueSAhPT0gMCB8fCB0aGlzLnogIT09IDApIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblZlYzMucHJvdG90eXBlLmlzRXF1YWwgPSBmdW5jdGlvbiBpc0VxdWFsKHYpIHtcbiAgICBpZiAodGhpcy54ICE9PSB2LnggfHwgdGhpcy55ICE9PSB2LnkgfHwgdGhpcy56ICE9PSB2LnopIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblZlYzMucHJvdG90eXBlLnRvVmFsdWUgPSBmdW5jdGlvbiB0b1ZhbHVlKCkge1xuICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnksIHRoaXMuel07XG59O1xuXG5WZWMzLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbiBub3JtYWxpemUoKSB7XG4gICAgdmFyIGN1cnJlbnRMZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xuXG4gICAgdGhpcy54ID0gdGhpcy54IC8gY3VycmVudExlbmd0aDtcbiAgICB0aGlzLnkgPSB0aGlzLnkgLyBjdXJyZW50TGVuZ3RoO1xuICAgIHRoaXMueiA9IHRoaXMueiAvIGN1cnJlbnRMZW5ndGg7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLnByb3RvdHlwZS5jcm9zcyA9IGZ1bmN0aW9uIGNyb3NzKHYpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHRoaXMueCA9IHkgKiB2LnogLSB6ICogdi55O1xuICAgIHRoaXMueSA9IHogKiB2LnggLSB4ICogdi56O1xuICAgIHRoaXMueiA9IHggKiB2LnkgLSB5ICogdi54O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVmVjMy5wcm90b3R5cGUuYXBwbHlNYXRyaXggPSBmdW5jdGlvbihtYXRyaXgpIHtcbiAgICB2YXIgTSA9IG1hdHJpeC5nZXQoKTtcbiAgICB2YXIgTTAgPSBNWzBdO1xuICAgIHZhciBNMSA9IE1bMV07XG4gICAgdmFyIE0yID0gTVsyXTtcblxuICAgIHZhciB2MCA9IHRoaXMueDtcbiAgICB2YXIgdjEgPSB0aGlzLnk7XG4gICAgdmFyIHYyID0gdGhpcy56O1xuXG4gICAgdGhpcy54ID0gTTBbMF0qdjAgKyBNMFsxXSp2MSArIE0wWzJdKnYyO1xuICAgIHRoaXMueSA9IE0xWzBdKnYwICsgTTFbMV0qdjEgKyBNMVsyXSp2MjtcbiAgICB0aGlzLnogPSBNMlswXSp2MCArIE0yWzFdKnYxICsgTTJbMl0qdjI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uIG5vcm1hbGl6ZSh2KSB7XG4gICAgdmFyIGxlbmd0aCA9IHYubGVuZ3RoKCkgfHwgMTtcbiAgICByZXR1cm4gbmV3IFZlYzModi54L2xlbmd0aCwgdi55L2xlbmd0aCwgdi56L2xlbmd0aCk7XG59O1xuXG5WZWMzLmNsb25lID0gZnVuY3Rpb24gY2xvbmUodikge1xuICAgIHJldHVybiBuZXcgVmVjMyh2LngsIHYueSwgdi56KTtcbn07XG5cblZlYzMuYWRkID0gZnVuY3Rpb24gYWRkKHYxLCB2Mikge1xuICAgIHZhciB4ID0gdjEueCArIHYyLng7XG4gICAgdmFyIHkgPSB2MS55ICsgdjIueTtcbiAgICB2YXIgeiA9IHYxLnogKyB2Mi56O1xuICAgIHJldHVybiBuZXcgVmVjMyh4LHkseik7XG59O1xuXG5WZWMzLnN1YnRyYWN0ID0gZnVuY3Rpb24gc3VidHJhY3QodjEsIHYyKSB7XG4gICAgdmFyIHggPSB2MS54IC0gdjIueDtcbiAgICB2YXIgeSA9IHYxLnkgLSB2Mi55O1xuICAgIHZhciB6ID0gdjEueiAtIHYyLno7XG4gICAgcmV0dXJuIG5ldyBWZWMzKHgseSx6KTtcbn07XG5cblZlYzMuc2NhbGUgPSBmdW5jdGlvbiBzY2FsZSh2LCBzKSB7XG4gICAgdmFyIHggPSB2LnggKiBzO1xuICAgIHZhciB5ID0gdi55ICogcztcbiAgICB2YXIgeiA9IHYueiAqIHM7XG4gICAgcmV0dXJuIG5ldyBWZWMzKHgseSx6KTtcbn07XG5cblZlYzMucm90YXRlUSA9IGZ1bmN0aW9uIHJvdGF0ZVEodixxKSB7XG4gICAgcmV0dXJuIFZlYzMuY2xvbmUocS5yb3RhdGVWZWN0b3IodikpO1xufTtcblxuVmVjMy5kb3RQcm9kdWN0ID0gZnVuY3Rpb24gZG90UHJvZHVjdCh2MSwgdjIpIHtcbiAgICByZXR1cm4gdjEueCAqIHYyLnggKyB2MS55ICogdjIueSArIHYxLnogKiB2Mi56O1xufTtcblxuVmVjMy5jcm9zc1Byb2R1Y3QgPSBmdW5jdGlvbiBjcm9zc1Byb2R1Y3QodjEsIHYyKSB7XG4gICAgcmV0dXJuIG5ldyBWZWMzKHYxLnkgKiB2Mi56IC0gdjEueiAqIHYyLnksIHYxLnogKiB2Mi54IC0gdjEueCAqIHYyLnosIHYxLnggKiB2Mi55IC0gdjEueSAqIHYyLngpO1xufTtcblxuVmVjMy5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHModjEsIHYyKSB7XG4gICAgcmV0dXJuIHYxLnggPT09IHYyLnggJiYgdjEueSA9PT0gdjIueSAmJiB2MS56ID09PSB2Mi56O1xufTtcblxuVmVjMy5wcm9qZWN0ID0gZnVuY3Rpb24gcHJvamVjdCh2MSwgdjIpIHtcbiAgICByZXR1cm4gVmVjMy5ub3JtYWxpemUodjIpLnNjYWxlKFZlYzMuZG90UHJvZHVjdCh2MSwgdjIpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjMztcbiIsIi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGFkYW1AZmFtby51cywgd2lsbEBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW50aXR5UmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jb3JlL0VudGl0eVJlZ2lzdHJ5Jyk7XG52YXIgVGltZVN5c3RlbSA9IHJlcXVpcmUoXCIuLi9jb3JlL1N5c3RlbXMvVGltZVN5c3RlbVwiKTtcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2VzL0ZvcmNlJyk7XG52YXIgQ29uc3RyYWludCA9IHJlcXVpcmUoJy4vY29uc3RyYWludHMvQ29uc3RyYWludCcpO1xudmFyIFBhcnRpY2xlID0gcmVxdWlyZSgnLi9ib2RpZXMvUGFydGljbGUnKTtcbnZhciBFdmVudEhhbmRsZXIgPSByZXF1aXJlKCcuLi9ldmVudHMvRXZlbnRIYW5kbGVyJyk7XG5cbnZhciBib2RpZXMgPSBFbnRpdHlSZWdpc3RyeS5hZGRDb2xsZWN0aW9uKCdCb2RpZXMnKTtcblxuLyoqXG4gKiBTaW5nbGV0b24gUGh5c2ljc1N5c3RlbSBvYmplY3RcbiAqIG1hbmFnZXMgcGFydGljbGVzLCBib2RpZXMsIGFnZW50cywgY29uc3RyYWludHNcbiAqXG4gKiBAY2xhc3MgRW5naW5lXG4gKiBAc2luZ2xldG9uXG4gKi9cbnZhciBQaHlzaWNzU3lzdGVtID0ge307XG5cblBoeXNpY3NTeXN0ZW0uZm9yY2VzID0gW107XG5QaHlzaWNzU3lzdGVtLmNvbnN0cmFpbnRzID0gW107XG5QaHlzaWNzU3lzdGVtLmJvZGllcyA9IFtdO1xuUGh5c2ljc1N5c3RlbS5fZXZlbnRIYW5kbGVyID0gbmV3IEV2ZW50SGFuZGxlcigpO1xuXG5QaHlzaWNzU3lzdGVtLl9ldmVudEhhbmRsZXIub24oJ2FkZCcsIGZ1bmN0aW9uKGJvZHkpIHtcbiAgICBQaHlzaWNzU3lzdGVtLmF0dGFjaChib2R5KTtcbn0pO1xuXG4vKipcbiAqIEBjb25zdCBzdGVwIHRoZSB0aW1lIHN0ZXAgYmV0d2VlbiBmcmFtZXMgdXAgdG8gdGhlIGZyYW1lIHRpbWUgZGlmZlxuICovXG5QaHlzaWNzU3lzdGVtLnN0ZXAgPSAxNi42NjY3O1xuUGh5c2ljc1N5c3RlbS5pdGVyYXRpb25zID0gMTA7XG5QaHlzaWNzU3lzdGVtLl9JRFBvb2wgPSB7XG4gICAgYm9kaWVzOiBbXSxcbiAgICBmb3JjZXM6IFtdLFxuICAgIGNvbnN0cmFpbnRzOiBbXVxufTtcblxuUGh5c2ljc1N5c3RlbS5hdHRhY2ggPSBmdW5jdGlvbihhZ2VudE9yQm9keSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgUGh5c2ljc1N5c3RlbS5hdHRhY2goYXJndW1lbnRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghKGFnZW50T3JCb2R5IGluc3RhbmNlb2YgQXJyYXkpKSBhZ2VudE9yQm9keSA9IFthZ2VudE9yQm9keV07XG5cbiAgICB2YXIgaSA9IGFnZW50T3JCb2R5Lmxlbmd0aDtcbiAgICB3aGlsZShpLS0pIHtcbiAgICAgICAgaWYgKGFnZW50T3JCb2R5W2ldIGluc3RhbmNlb2YgUGFydGljbGUpIF9hZGRCb2R5LmNhbGwodGhpcywgYWdlbnRPckJvZHlbaV0pO1xuICAgICAgICBlbHNlIF9hZGRBZ2VudC5jYWxsKHRoaXMsIGFnZW50T3JCb2R5W2ldKTtcbiAgICB9XG59O1xuXG5QaHlzaWNzU3lzdGVtLmFkZEJvZHkgPSBQaHlzaWNzU3lzdGVtLmF0dGFjaDtcblxuZnVuY3Rpb24gX2FkZEJvZHkoYm9keSkge1xuICAgIGlmIChib2R5Ll9JRCA9PSBudWxsKSB7XG4gICAgICAgIGlmICh0aGlzLl9JRFBvb2wuYm9kaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgYm9keS5fSUQgPSB0aGlzLl9JRFBvb2wuYm9kaWVzLnBvcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYm9keS5fSUQgPSB0aGlzLmJvZGllcy5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ib2RpZXNbdGhpcy5ib2RpZXMubGVuZ3RoXSA9IGJvZHk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gX2FkZEFnZW50KGFnZW50KSB7XG4gICAgaWYgKGFnZW50Ll9JRCAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IgKFwiQWdlbnRzIGNhbiBvbmx5IGJlIGFkZGVkIHRvIHRoZSBlbmdpbmUgb25jZVwiKTsgLy8gSGFuZGxlIGl0IGhlcmVcbiAgICBpZiAoYWdlbnQgaW5zdGFuY2VvZiBGb3JjZSkge1xuICAgICAgICBpZiAodGhpcy5fSURQb29sLmZvcmNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFnZW50Ll9JRCA9IHRoaXMuX0lEUG9vbC5mb3JjZXMucG9wKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZ2VudC5fSUQgPSB0aGlzLmZvcmNlcy5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb3JjZXNbYWdlbnQuX0lEXSA9IGFnZW50O1xuICAgIH0gZWxzZSBpZiAoYWdlbnQgaW5zdGFuY2VvZiBDb25zdHJhaW50KSB7XG4gICAgICAgIGlmICh0aGlzLl9JRFBvb2wuY29uc3RyYWludHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhZ2VudC5fSUQgPSB0aGlzLl9JRFBvb2wuY29uc3RyYWludHMucG9wKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZ2VudC5fSUQgPSB0aGlzLmNvbnN0cmFpbnRzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbnN0cmFpbnRzW2FnZW50Ll9JRF0gPSBhZ2VudDtcbiAgICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKFwiQXR0ZW1wdCB0byByZWdpc3RlciBub24tYWdlbnQgYXMgRm9yY2Ugb3IgQ29uc3RyYWludFwiKVxuXG4gICAgUGh5c2ljc1N5c3RlbS5fZXZlbnRIYW5kbGVyLnN1YnNjcmliZShhZ2VudC5fZXZlbnRFbWl0dGVyKTtcbn07XG5cblBoeXNpY3NTeXN0ZW0ucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKGFnZW50T3JCb2R5KSB7XG4gICAgaWYgKCEoYWdlbnRPckJvZHkgaW5zdGFuY2VvZiBBcnJheSkpIGFnZW50T3JCb2R5ID0gW2FnZW50T3JCb2R5XTtcbiAgICB2YXIgbmVFbGVtZW50cyA9IGFnZW50T3JCb2R5Lmxlbmd0aDtcbiAgICB3aGlsZShuZUVsZW1lbnRzLS0pIHtcbiAgICAgICAgX3JlbW92ZU9uZS5jYWxsKHRoaXMsIGFnZW50T3JCb2R5W25lRWxlbWVudHNdKTtcbiAgICB9XG59O1xuXG5QaHlzaWNzU3lzdGVtLnJlbW92ZUJvZHkgPSBQaHlzaWNzU3lzdGVtLnJlbW92ZTtcblxuZnVuY3Rpb24gX3JlbW92ZU9uZShhZ2VudE9yQm9keSkge1xuICAgIGlmIChhZ2VudE9yQm9keSBpbnN0YW5jZW9mIEZvcmNlKSB7XG4gICAgICAgIHRoaXMuX0lEUG9vbC5mb3JjZXMucHVzaChhZ2VudE9yQm9keS5fSUQpO1xuICAgICAgICB0aGlzLmZvcmNlc1thZ2VudE9yQm9keS5fSURdID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGFnZW50T3JCb2R5IGluc3RhbmNlb2YgQ29uc3RyYWludCkge1xuICAgICAgICB0aGlzLl9JRFBvb2wuY29uc3RyYWludHMucHVzaChhZ2VudE9yQm9keS5fSUQpO1xuICAgICAgICB0aGlzLmNvbnN0cmFpbnRzW2FnZW50T3JCb2R5Ll9JRF0gPSBudWxsO1xuICAgIH0gZWxzZSBpZiAoYWdlbnRPckJvZHkgaW5zdGFuY2VvZiBQYXJ0aWNsZSkge1xuICAgICAgICB0aGlzLl9JRFBvb2wuYm9kaWVzLnB1c2goYWdlbnRPckJvZHkuX0lEKTtcbiAgICAgICAgdGhpcy5ib2RpZXNbYWdlbnRPckJvZHkuX0lEXSA9IG51bGw7XG4gICAgfVxuICAgIGFnZW50T3JCb2R5Ll9JRCA9IG51bGw7XG59O1xuXG5QaHlzaWNzU3lzdGVtLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgYm9kaWVzID0gdGhpcy5ib2RpZXM7XG4gICAgdmFyIGZvcmNlcyA9IHRoaXMuZm9yY2VzO1xuICAgIHZhciBjb25zdHJhaW50cyA9IHRoaXMuY29uc3RyYWludHM7XG5cbiAgICB2YXIgX251bUJvZGllcyA9IGJvZGllcy5sZW5ndGg7XG4gICAgdmFyIF9udW1Gb3JjZXMgPSBmb3JjZXMubGVuZ3RoO1xuICAgIHZhciBfbnVtQ29uc3RyYWludHMgPSBjb25zdHJhaW50cy5sZW5ndGg7XG4gICAgdmFyIF9udW1JdGVyYXRpb25zID0gdGhpcy5pdGVyYXRpb25zO1xuXG4gICAgdmFyIHN0ZXAgPSB0aGlzLnN0ZXA7XG4gICAgdmFyIGRlbHRhID0gVGltZVN5c3RlbS5nZXREZWx0YSgpO1xuICAgIC8vIGNvbnNvbGUubG9nKGRlbHRhKVxuICAgIHdoaWxlKGRlbHRhID4gMCkge1xuICAgICAgICB2YXIgZHQgPSAoZGVsdGEgPiBzdGVwKSA/IHN0ZXAgOiBkZWx0YTtcbiAgICAgICAgZHQgLz0gMTAwMDtcbiAgICAgICAgLy8gVXBkYXRlIEZvcmNlcyBvbiBwYXJ0aWNsZXNcbiAgICAgICAgdmFyIG5Gb3JjZXMgPSBfbnVtRm9yY2VzO1xuICAgICAgICB3aGlsZShuRm9yY2VzLS0pIHtcbiAgICAgICAgICAgIGlmIChmb3JjZXNbbkZvcmNlc10pIGZvcmNlc1tuRm9yY2VzXS51cGRhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbnRhdGl2ZWx5IHVwZGF0ZSB2ZWxvY2l0aWVzXG4gICAgICAgIHZhciBuQm9kaWVzID0gX251bUJvZGllcztcbiAgICAgICAgd2hpbGUobkJvZGllcy0tKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tuQm9kaWVzXTtcbiAgICAgICAgICAgIGlmICghYm9keSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAoYm9keS5zZXR0bGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJvZHkuX2ZvcmNlLmxlbmd0aCgpID4gYm9keS5zbGVlcFRocmVzaG9sZFxuICAgICAgICAgICAgICAgICAgICB8fCBib2R5Ll92ZWxvY2l0eS5sZW5ndGgoKSA+IGJvZHkuc2xlZXBUaHJlc2hvbGRcbiAgICAgICAgICAgICAgICAgICAgfHwgYm9keS5hbmd1bGFyVmVsb2NpdHkubGVuZ3RoKCkgPiBib2R5LnNsZWVwVGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZHkuc2V0dGxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZHkuZ2V0Rm9yY2UoKS5jbGVhcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYm9keS5zZXR0bGVkKSBib2R5Ll9pbnRlZ3JhdGVWZWxvY2l0eShkdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXRlcm1pbmUgdmlvbGF0aW9ucyBvZiBjb25zdHJhaW50c1xuICAgICAgICB2YXIgbkNvbnN0cmFpbnRzID0gX251bUNvbnN0cmFpbnRzO1xuICAgICAgICB3aGlsZShuQ29uc3RyYWludHMtLSkge1xuICAgICAgICAgICAgaWYgKCFjb25zdHJhaW50c1tuQ29uc3RyYWludHNdKSBjb250aW51ZTtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzW25Db25zdHJhaW50c10udXBkYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJdGVyYXRpdmVseSByZXNvbHZlIGNvbnN0cmFpbnRzXG4gICAgICAgIGZvciAodmFyIGl0ZXJhdGlvbiA9IDA7IGl0ZXJhdGlvbiA8IF9udW1JdGVyYXRpb25zOyBpdGVyYXRpb24rKykge1xuICAgICAgICAgICAgbkNvbnN0cmFpbnRzID0gX251bUNvbnN0cmFpbnRzO1xuICAgICAgICAgICAgd2hpbGUobkNvbnN0cmFpbnRzLS0pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbnN0cmFpbnRzW25Db25zdHJhaW50c10pIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNvbnN0cmFpbnRzW25Db25zdHJhaW50c10ucmVzb2x2ZShkdCwgaXRlcmF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEludGVncmF0ZSBQYXJ0aWNsZSBwb3NpdGlvbnNcbiAgICAgICAgbkJvZGllcyA9IF9udW1Cb2RpZXM7XG4gICAgICAgIHdoaWxlKG5Cb2RpZXMtLSkge1xuICAgICAgICAgICAgYm9keSA9IHRoaXMuYm9kaWVzW25Cb2RpZXNdO1xuICAgICAgICAgICAgaWYgKCFib2R5KSBjb250aW51ZTtcbiAgICAgICAgICAgIGlmICghYm9keS5zZXR0bGVkKSBib2R5Ll9pbnRlZ3JhdGVQb3NlKGR0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlbHRhIC09IHN0ZXA7XG4gICAgfVxufTtcblxuLy8gLyoqXG4vLyAgKiBBZGRzIGEgYm9keSBvYmplY3QgdG8gdGhlIHN5c3RlbSB0byB1cGRhdGUgaXQncyBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb25cbi8vICAqXG4vLyAgKiBAbWV0aG9kIGFkZEJvZHlcbi8vICAqIEBwYXJhbSB7Qm9keX0gYm9keVxuLy8gICovXG4vLyBQaHlzaWNzU3lzdGVtLmFkZEJvZHkgPSBmdW5jdGlvbiBhZGRCb2R5KGJvZHkpIHtcbi8vICAgICBpZiAoYm9keS5fSUQgPT0gbnVsbCkge1xuLy8gICAgICAgICBpZiAodGhpcy5fSURQb29sLmJvZGllcy5sZW5ndGgpIHtcbi8vICAgICAgICAgICAgIGJvZHkuX0lEID0gdGhpcy5fSURQb29sLmJvZGllcy5wb3AoKTtcbi8vICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgIGJvZHkuX0lEID0gdGhpcy5ib2RpZXMubGVuZ3RoO1xuLy8gICAgICAgICB9XG4vLyAgICAgICAgIHRoaXMuYm9kaWVzW3RoaXMuYm9kaWVzLmxlbmd0aF0gPSBib2R5O1xuLy8gICAgIH1cbi8vIH07XG5cbi8vIC8qKlxuLy8gICogUmVtb3ZlcyBhIGJvZHkgYW5kIHJlbW92ZXMgaXQgZnJvbSBpdCdzIGFzc29jaWF0ZWQgYWdlbnRzXG4vLyAgKiBUT0RPOiByZW1vdmUgdGhlIGJvZHkgZnJvbSBpdHMgYXNzb2NpYXRlZCBhZ2VudHNcbi8vICAqXG4vLyAgKiBAbWV0aG9kIHJlbW92ZUJvZHlcbi8vICAqIEBwYXJhbSB7Qm9keX0gYm9keVxuLy8gICovXG4vLyBQaHlzaWNzU3lzdGVtLnJlbW92ZUJvZHkgPSBmdW5jdGlvbiByZW1vdmVCb2R5KGJvZHkpIHtcbi8vICAgICB0aGlzLl9JRFBvb2wuYm9kaWVzLnB1c2goYm9keS5fSUQpO1xuLy8gICAgIHRoaXMuYm9kaWVzW2JvZHkuX0lEXSA9IG51bGw7XG4vLyAgICAgYm9keS5fSUQgPSBudWxsO1xuLy8gfTtcblxuLy8gLyoqXG4vLyAgKiBBdHRhY2hlcyBhIGNvbGxlY3Rpb24gb2YgRm9yY2Ugb3IgQ29uc3RyYWludCBhbmQgYm9kaWVzXG4vLyAgKiBVc2UgdGhpcyBtZXRob2QgdG8gbWFrZSBwaHlzaWNzIGFwcGx5IGZvcmNlcyB0byBib2RpZXNcbi8vICAqIEZvcmNlcyBhbmQgY29uc3RyYWludHMgYXJlIGFwcGxpZWQgZnJvbSB0aGUgc291cmNlIChpZlxuLy8gICogYXBwbGljYWJsZSkgdG8gdGhlIHRhcmdldHNcbi8vICAqXG4vLyAgKiBAbWV0aG9kIGF0dGFjaFxuLy8gICogQHBhcmFtIHtGb3JjZSB8IEZvcmNlW10gfCBDb25zdHJhaW50IHwgQ29uc3RyYWludFtdfSBhZ2VudHNcbi8vICAqIEBwYXJhbSB7UGFydGljbGUgfCBQYXJ0aWNsZVtdfSBzb3VyY2Vcbi8vICAqIEBwYXJhbSB7UGFydGljbGUgfCBQYXJ0aWNsZVtdfSB0YXJnZXRzXG4vLyAgKiBAcmV0dXJuIHtOdW1iZXIgfCBOdW1iZXJbXX0gdGhlIGlkcyBvZiB0aGUgYWdlbnRzIGF0dGFjaGVkIHRvIHRoZSBzeXN0ZW1cbi8vICAqL1xuLy8gUGh5c2ljc1N5c3RlbS5hdHRhY2ggPSBmdW5jdGlvbiBhdHRhY2goYWdlbnRzLCBzb3VyY2UsIHRhcmdldHMpIHtcbi8vICAgICBpZiAoIXRhcmdldHMpIHRhcmdldHMgPSB0aGlzLmJvZGllcztcbi8vICAgICBpZiAoISh0YXJnZXRzIGluc3RhbmNlb2YgQXJyYXkpKSB0YXJnZXRzID0gW3RhcmdldHNdO1xuLy8gICAgIHZhciBuVGFyZ2V0cyA9IHRhcmdldHMubGVuZ3RoO1xuLy8gICAgIHdoaWxlIChuVGFyZ2V0cy0tKSB7XG4vLyAgICAgICAgIGlmICh0YXJnZXRzW25UYXJnZXRzXS5fSUQgPT09IG51bGwpIHRoaXMuYWRkQm9keSh0YXJnZXRzW25UYXJnZXRzXSk7XG4vLyAgICAgfVxuLy8gICAgIGlmIChzb3VyY2UpIHRoaXMuYWRkQm9keShzb3VyY2UpO1xuLy8gICAgIGlmIChhZ2VudHMgaW5zdGFuY2VvZiBBcnJheSkge1xuLy8gICAgICAgICB2YXIgYWdlbnRJRHMgPSBBcnJheShhZ2VudHMubGVuZ3RoKTtcbi8vICAgICAgICAgdmFyIG5BZ2VudHMgPSBhZ2VudHMubGVuZ3RoO1xuLy8gICAgICAgICB3aGlsZShuQWdlbnRzLS0pIHtcbi8vICAgICAgICAgICAgIGFnZW50SURzW25BZ2VudHNdID0gX2F0dGFjaEFnZW50LmNhbGwodGhpcywgYWdlbnRzW2ldLCB0YXJnZXRzLCBzb3VyY2UpO1xuLy8gICAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIGVsc2UgX2F0dGFjaEFnZW50LmNhbGwodGhpcywgYWdlbnRzLCBzb3VyY2UsIHRhcmdldHMpO1xuLy8gICAgIHJldHVybiBhZ2VudElEcztcbi8vIH07XG5cbi8vIC8qKlxuLy8gICogQXR0YWNoZXMgdGhlIGZvcmNlIG9yIGNvbnN0cmFpbnQgYW5kIGl0cyBzb3VyY2UgYW5kIHRhcmdldHMgdG8gdGhlIHN5c3RlbVxuLy8gICpcbi8vICAqIEBwcml2YXRlXG4vLyAgKiBAbWV0aG9kIF9hdHRhY2hBZ2VudFxuLy8gICogQHBhcmFtIHtGb3JjZSB8IENvbnN0cmFpbnR9IGFnZW50IHRoZSBhZ2VudCB0byBhdHRhY2ggdG8gdGhlIHN5c3RlbVxuLy8gICogQHBhcmFtIHtQYXJ0aWNsZVtdfSB0YXJnZXRzIHRoZSBhcnJheSBvZiB0YXJnZXRzIHRvIGF0dGFjaCB0byB0aGUgYWdlbnRcbi8vICAqIEBwYXJhbSB7UGFydGljbGV9IHNvdXJjZSB0aGUgc291cmNlIG9mIHRoZSBhZ2VudFxuLy8gICogQHRocm93cyB7RXJyb3J9IGlmIGFnZW50ICFpbnN0YW5jZW9mIEZvcmNlIG9yIGFnZW50ICFpbnN0YW5jZW9mIENvbnN0cmFpbnRcbi8vICAqIEByZXR1cm4ge051bWJlcn0gdGhlIGlkIG9mIHRoZSBhZ2VudCBhdHRhY2hlZCB0byB0aGUgc3lzdGVtXG4vLyAgKi9cbi8vIGZ1bmN0aW9uIF9hdHRhY2hBZ2VudChhZ2VudCwgc291cmNlLCB0YXJnZXRzKSB7XG4vLyAgICAgaWYgKGFnZW50Ll9JRCkgdGhyb3cgbmV3IEVycm9yIChcIkFnZW50cyBjYW4gb25seSBiZSBhZGRlZCB0byB0aGUgZW5naW5lIG9uY2VcIik7IC8vIEhhbmRsZSBpdCBoZXJlXG4vLyAgICAgaWYgKHRhcmdldHMgPT09IHVuZGVmaW5lZCkgdGFyZ2V0cyA9IHRoaXMuYm9kaWVzO1xuXG4vLyAgICAgaWYgKGFnZW50IGluc3RhbmNlb2YgRm9yY2UpIHtcbi8vICAgICAgICAgaWYgKHRoaXMuX0lEUG9vbC5mb3JjZXMubGVuZ3RoKSB7XG4vLyAgICAgICAgICAgICBhZ2VudC5fSUQgPSB0aGlzLl9JRFBvb2wuZm9yY2VzLnBvcCgpO1xuLy8gICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgYWdlbnQuX0lEID0gdGhpcy5mb3JjZXMubGVuZ3RoO1xuLy8gICAgICAgICB9XG4vLyAgICAgICAgIHRoaXMuZm9yY2VzW2FnZW50Ll9JRF0gPSB7XG4vLyAgICAgICAgICAgICBhZ2VudCAgIDogYWdlbnQsXG4vLyAgICAgICAgICAgICB0YXJnZXRzIDogdGFyZ2V0cyxcbi8vICAgICAgICAgICAgIHNvdXJjZSAgOiBzb3VyY2Vcbi8vICAgICAgICAgfTtcbi8vICAgICB9XG5cbi8vICAgICBlbHNlIGlmIChhZ2VudCBpbnN0YW5jZW9mIENvbnN0cmFpbnQpIHtcbi8vICAgICAgICAgaWYgKHRoaXMuX0lEUG9vbC5jb25zdHJhaW50cy5sZW5ndGgpIHtcbi8vICAgICAgICAgICAgIGFnZW50Ll9JRCA9IHRoaXMuX0lEUG9vbC5jb25zdHJhaW50cy5wb3AoKTtcbi8vICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgIGFnZW50Ll9JRCA9IHRoaXMuY29uc3RyYWludHMubGVuZ3RoO1xuLy8gICAgICAgICB9XG4vLyAgICAgICAgIHRoaXMuY29uc3RyYWludHNbYWdlbnQuX0lEXSA9IHtcbi8vICAgICAgICAgICAgIGNvbnN0cmFpbnQgOiBhZ2VudCxcbi8vICAgICAgICAgICAgIHRhcmdldHMgICAgOiB0YXJnZXRzLFxuLy8gICAgICAgICAgICAgc291cmNlICAgICA6IHNvdXJjZVxuLy8gICAgICAgICB9O1xuLy8gICAgIH1cblxuLy8gICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKFwiT25seSBGb3JjZXMgYW5kIENvbnN0cmFpbnRzIG1heSBiZSBhZGRlZCB0byB0aGUgUGh5c2ljcyBTeXN0ZW0uXCIpO1xuLy8gICAgIHJldHVybiBhZ2VudC5fSUQ7XG4vLyB9XG5cbi8vIC8qKlxuLy8gICogUmVtb3ZlcyBhbiBpbnN0YW5jZSBvZiBGb3JjZSBvciBBZ2VudCBvciBhbiBhcnJheSBvZiBpbnN0YW5jZXMgZnJvbSB0aGUgUGh5c2ljc1N5c3RlbVxuLy8gICogY29tcGxpbWVudCB0byBQaHlzaWNzU3lzdGVtI2F0dGFjaFxuLy8gICpcbi8vICAqIEBtZXRob2QgcmVtb3ZlXG4vLyAgKiBAcGFyYW0ge0ZvcmNlIHwgRm9yY2VbXSB8IENvbnN0cmFpbnQgfCBDb25zdHJhaW50W10gfCBBcnJheTxGb3JjZSwgQ29uc3RyYWludD59IGFnZW50c1xuLy8gICovXG4vLyBQaHlzaWNzU3lzdGVtLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShhZ2VudHNPckJvZGllcykge1xuLy8gICAgIGlmIChhZ2VudHNPckJvZGllcyBpbnN0YW5jZW9mIEFycmF5KSB7XG4vLyAgICAgICAgIHZhciBuZUVsZW1lbnRzID0gYWdlbnRzT3JCb2RpZXMubGVuZ3RoO1xuLy8gICAgICAgICB3aGlsZShuZUVsZW1lbnRzLS0pIHtcbi8vICAgICAgICAgICAgIF9yZW1vdmVPbmUuY2FsbCh0aGlzLCBhZ2VudHNPckJvZGllc1tuZUVsZW1lbnRzXSk7XG4vLyAgICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgZWxzZSBfcmVtb3ZlT25lLmNhbGwodGhpcywgYWdlbnRzT3JCb2RpZXMpO1xuLy8gfTtcblxuLy8gLyoqXG4vLyAgKiBSZW1vdmVzIHRoZSBhZ2VudCBmcm9tIGl0cyBpZCBwb29sXG4vLyAgKlxuLy8gICogQHByaXZhdGVcbi8vICAqIEBtZXRob2QgX3JlbW92ZU9uZVxuLy8gICogQHBhcmFtIHtGb3JjZSB8IENvbnN0cmFpbnR9IGFnZW50IHRoZSBhZ2VudCB0byByZW1vdmVcbi8vICAqL1xuLy8gZnVuY3Rpb24gX3JlbW92ZU9uZShhZ2VudE9yQm9keSkge1xuLy8gICAgIGlmIChhZ2VudE9yQm9keSBpbnN0YW5jZW9mIEZvcmNlKSB7XG4vLyAgICAgICAgIHRoaXMuX0lEUG9vbC5mb3JjZXMucHVzaChhZ2VudE9yQm9keS5fSUQpO1xuLy8gICAgICAgICB0aGlzLmZvcmNlc1thZ2VudE9yQm9keS5fSURdID0gbnVsbDtcbi8vICAgICB9IGVsc2UgaWYgKGFnZW50T3JCb2R5IGluc3RhbmNlb2YgQ29uc3RyYWludCkge1xuLy8gICAgICAgICB0aGlzLl9JRFBvb2wuY29uc3RyYWludHMucHVzaChhZ2VudE9yQm9keS5fSUQpO1xuLy8gICAgICAgICB0aGlzLmNvbnN0cmFpbnRzW2FnZW50T3JCb2R5Ll9JRF0gPSBudWxsO1xuLy8gICAgIH0gZWxzZSBpZiAoYWdlbnRPckJvZHkgaW5zdGFuY2VvZiBQYXJ0aWNsZSkge1xuLy8gICAgICAgICB0aGlzLl9JRFBvb2wuYm9kaWVzLnB1c2goYWdlbnRPckJvZHkuX0lEKTtcbi8vICAgICAgICAgdGhpcy5ib2RpZXNbYWdlbnRPckJvZHkuX0lEXSA9IG51bGw7XG4vLyAgICAgfVxuLy8gICAgIGFnZW50T3JCb2R5Ll9JRCA9IG51bGw7XG4vLyB9O1xuXG4vLyAvKipcbi8vICAqIEF0dGFjaGVzIHRhcmdldHMgdG8gYW4gYWdlbnQgYXR0YWNoZWQgd2l0aCBQaHlzaWNzU3lzdGVtI2F0dGFjaFxuLy8gICogVXNlIHRoaXMgbWV0aG9kIHRvIGF0dGFjaCBtb3JlIGJvZGllcyB0byBhbiBleGlzdGluZyBpbnRlcmFjdGlvblxuLy8gICpcbi8vICAqIEBtZXRob2QgYXR0YWNoVG9cbi8vICAqIEBwYXJhbSB7Rm9yY2UgfCBDb25zdHJhaW50fSBhZ2VudFxuLy8gICogQHBhcmFtIHtQYXJ0aWNsZSB8IFBhcnRpY2xlW119IHRhcmdldHNcbi8vICAqL1xuLy8gUGh5c2ljc1N5c3RlbS5hdHRhY2hUbyA9IGZ1bmN0aW9uIGF0dGFjaFRvKGFnZW50LCB0YXJnZXRzKSB7XG4vLyAgICAgaWYgKGFnZW50Ll9JRCA9PT0gbnVsbCkgcmV0dXJuO1xuLy8gICAgIGlmICghKHRhcmdldHMgaW5zdGFuY2VvZiBBcnJheSkpIHRhcmdldHMgPSBbdGFyZ2V0c107XG4vLyAgICAgdmFyIG5UYXJnZXRzID0gdGFyZ2V0cy5sZW5ndGg7XG4vLyAgICAgd2hpbGUgKG5UYXJnZXRzLS0pIHtcbi8vICAgICAgICAgaWYgKHRhcmdldHNbblRhcmdldHNdLl9JRCA9PT0gbnVsbCkgdGhpcy5hZGRCb2R5KHRhcmdldHNbblRhcmdldHNdKTtcbi8vICAgICB9XG4vLyAgICAgaWYgKGFnZW50IGluc3RhbmNlb2YgRm9yY2UpIHtcbi8vICAgICAgICAgdGhpcy5mb3JjZXNbYWdlbnQuX0lEXS50YXJnZXRzID0gdGhpcy5mb3JjZXNbYWdlbnQuX0lEXS50YXJnZXRzLmNvbmNhdCh0YXJnZXRzKTtcbi8vICAgICB9XG4vLyAgICAgaWYgKGFnZW50IGluc3RhbmNlb2YgQ29uc3RyYWludCkge1xuLy8gICAgICAgICB0aGlzLmNvbnN0cmFpbnRzW2FnZW50Ll9JRF0udGFyZ2V0cyA9IHRoaXMuY29uc3RyYWludHNbYWdlbnQuX0lEXS50YXJnZXRzLmNvbmNhdCh0YXJnZXRzKTtcbi8vICAgICB9XG4vLyB9O1xuXG4vLyAvKipcbi8vICAqIFJlbW92ZXMgYm9kaWVzIGZyb20gYW4gZXhpc3RpbmcgaW50ZXJhY3Rpb25cbi8vICAqIFVzZSB0aGlzIG1ldGhvZCBhcyBhIGNvbXBsaW1lbnQgaW4gUGh5c2ljc1N5c3RlbSNhdHRhY2hUb1xuLy8gICpcbi8vICAqIEBtZXRob2QgcmVtb3ZlRnJvbVxuLy8gICogQHBhcmFtIHtGb3JjZSB8IENvbnN0cmFpbnR9IGFnZW50XG4vLyAgKiBAcGFyYW0ge1BhcnRpY2xlfSB0YXJnZXRcbi8vICAqL1xuLy8gUGh5c2ljc1N5c3RlbS5yZW1vdmVGcm9tID0gZnVuY3Rpb24gcmVtb3ZlRnJvbShhZ2VudCwgdGFyZ2V0KSB7XG4vLyAgICAgaWYgKGFnZW50Ll9JRCA9PT0gbnVsbCkgcmV0dXJuO1xuLy8gICAgIGlmIChhZ2VudCBpbnN0YW5jZW9mIEZvcmNlKSB7XG4vLyAgICAgICAgIHZhciBhZ2VudFRhcmdldHMgPSB0aGlzLmZvcmNlc1thZ2VudC5fSURdLnRhcmdldHM7XG4vLyAgICAgfVxuLy8gICAgIGlmIChhZ2VudCBpbnN0YW5jZW9mIENvbnN0cmFpbnQpIHtcbi8vICAgICAgICAgdmFyIGFnZW50VGFyZ2V0cyA9IHRoaXMuY29uc3RyYWludHNbYWdlbnQuX0lEXS50YXJnZXRzO1xuLy8gICAgIH1cblxuLy8gICAgIHZhciBuVGFyZ2V0cyA9IGFnZW50VGFyZ2V0cy5sZW5ndGg7XG4vLyAgICAgd2hpbGUoblRhcmdldHMtLSkge1xuLy8gICAgICAgaWYgKGFnZW50VGFyZ2V0c1tuVGFyZ2V0c10gPT09IHRhcmdldCkge1xuLy8gICAgICAgICAvLyByZW1vdmUgdGFyZ2V0IGZyb20gYWdlbnQgYW5kIHN0b3AgY2hlY2tpbmcgdGFyZ2V0c1xuLy8gICAgICAgICByZXR1cm4gYWdlbnRUYXJnZXRzLnNwbGljZShuVGFyZ2V0cywgMSk7XG4vLyAgICAgICB9XG4vLyAgICAgfVxuLy8gfTtcblxuLy8gLyoqXG4vLyAgKiBVcGRhdGUgbG9vcCBvZiB0aGUgUGh5c2ljc1N5c3RlbS4gIEF0dGFjaGVkIHRvIGNvcmUvRW5naW5lXG4vLyAgKiBBcHBsaWVzIGZvcmNlcyB0byBib2RpZXMsIHVwZGF0ZXMgdGhlIGJvZGllcyBhbmQgYXBwbGllcyBjb25zdHJhaW50c1xuLy8gICpcbi8vICAqIEBwcm90ZWN0ZWRcbi8vICAqIEBtZXRob2QgdXBkYXRlXG4vLyAgKi9cbi8vIFBoeXNpY3NTeXN0ZW0udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuLy8gICAgIHZhciBkdCA9IFRpbWVTeXN0ZW0uZ2V0RGVsdGEoKTtcblxuLy8gICAgIC8vIHdoaWxlKGR0ID4gMCkge1xuLy8gICAgICAgICAvLyB2YXIgc3RlcCA9IChkdCA+IHRoaXMuc3RlcCkgPyB0aGlzLnN0ZXAgOiBkdDtcbi8vICAgICAgICAgdmFyIHN0ZXAgPSB0aGlzLnN0ZXBcbi8vICAgICAgICAgLy8gVXBkYXRlRm9yY2VzIG9uIHBhcnRpY2xlc1xuLy8gICAgICAgICB2YXIgbkFnZW50cyA9IHRoaXMuZm9yY2VzLmxlbmd0aDtcbi8vICAgICAgICAgd2hpbGUobkFnZW50cy0tKSB7XG4vLyAgICAgICAgICAgICBpZiAodGhpcy5mb3JjZXNbbkFnZW50c10pIHRoaXMuZm9yY2VzW25BZ2VudHNdLmFnZW50LnVwZGF0ZSh0aGlzLmZvcmNlc1tuQWdlbnRzXS5zb3VyY2UsIHRoaXMuZm9yY2VzW25BZ2VudHNdLnRhcmdldHMpO1xuLy8gICAgICAgICB9XG5cbi8vICAgICAgICAgLy8gSW50ZWdyYXRlIFBhcnRpY2xlIHBvc2l0aW9uc1xuLy8gICAgICAgICB2YXIgbkJvZGllcyA9IHRoaXMuYm9kaWVzLmxlbmd0aDtcbi8vICAgICAgICAgdmFyIGJvZHk7XG4vLyAgICAgICAgIHdoaWxlKG5Cb2RpZXMtLSkge1xuLy8gICAgICAgICAgICAgYm9keSA9IHRoaXMuYm9kaWVzW25Cb2RpZXNdO1xuLy8gICAgICAgICAgICAgaWYgKCFib2R5KSBjb250aW51ZTtcbi8vICAgICAgICAgICAgIGlmIChib2R5LnNldHRsZWQpIHtcbi8vICAgICAgICAgICAgICAgICBpZiAoYm9keS5fZm9yY2UubGVuZ3RoKCkgPiBib2R5LnNsZWVwVGhyZXNob2xkIHx8IGJvZHkuX3ZlbG9jaXR5Lmxlbmd0aCgpID4gYm9keS5zbGVlcFRocmVzaG9sZCkge1xuLy8gICAgICAgICAgICAgICAgICAgICBib2R5LnNldHRsZWQgPSBmYWxzZTtcbi8vICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgICAgICBib2R5LmdldEZvcmNlKCkuY2xlYXIoKTtcbi8vICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICBpZiAoIWJvZHkuc2V0dGxlZCkgYm9keS5faW50ZWdyYXRlVmVsb2NpdHkoc3RlcCk7XG4vLyAgICAgICAgIH1cblxuLy8gICAgICAgICB2YXIgbkNvbnN0cmFpbnRzID0gdGhpcy5jb25zdHJhaW50cy5sZW5ndGg7XG4vLyAgICAgICAgIHdoaWxlKG5Db25zdHJhaW50cy0tKSB7XG4vLyAgICAgICAgICAgICBpZiAoIXRoaXMuY29uc3RyYWludHNbbkNvbnN0cmFpbnRzXSkgY29udGludWU7XG4vLyAgICAgICAgICAgICB0aGlzLmNvbnN0cmFpbnRzW25Db25zdHJhaW50c10uY29uc3RyYWludC51cGRhdGUodGhpcy5jb25zdHJhaW50c1tuQ29uc3RyYWludHNdLnNvdXJjZSwgdGhpcy5jb25zdHJhaW50c1tuQ29uc3RyYWludHNdLnRhcmdldHMsIHN0ZXApO1xuLy8gICAgICAgICB9XG5cbi8vICAgICAgICAgbkJvZGllcyA9IHRoaXMuYm9kaWVzLmxlbmd0aDtcbi8vICAgICAgICAgd2hpbGUobkJvZGllcy0tKSB7XG4vLyAgICAgICAgICAgICBib2R5ID0gdGhpcy5ib2RpZXNbbkJvZGllc107XG4vLyAgICAgICAgICAgICBpZiAoIWJvZHkpIGNvbnRpbnVlO1xuLy8gICAgICAgICAgICAgaWYgKCFib2R5LnNldHRsZWQpIGJvZHkuX2ludGVncmF0ZVBvc2Uoc3RlcCk7XG4vLyAgICAgICAgIH1cblxuLy8gICAgICAgICAvLyBkdCAtPSB0aGlzLnN0ZXA7XG4vLyAgICAgLy8gfVxuXG4vLyB9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBoeXNpY3NTeXN0ZW07XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBhZGFtQGZhbW8udXMsIHdpbGxAZmFtby51c1xuICpcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbid1c2Ugc3RyaWN0JztcbnZhciBWZWMzID0gcmVxdWlyZSgnLi4vLi4vbWF0aC9WZWMzJyk7XG52YXIgU3ltcGxlY3RpY0V1bGVyID0gcmVxdWlyZSgnLi4vaW50ZWdyYXRvcnMvU3ltcGxlY3RpY0V1bGVyJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50RW1pdHRlcicpO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIFBoeXNpY3MgSW50ZXJhY3Rpb25zXG4gKiBTdG9yZXM6XG4gKiAgIHBvc2l0aW9uXG4gKiAgIHZlbG9jaXR5XG4gKiAgIG1vbWVudHVtXG4gKiAgIGZvcmNlXG4gKiAgIG1hc3NcbiAqXG4gKiBFbmNhcHN1bGF0ZXM6XG4gKiAgIEV2ZW50RW1pdHRlclxuICpcbiAqIE1hbmFnZXMgc2xlZXBpbmdcbiAqXG4gKiBAY2xhc3MgUGFydGljbGVcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gUGFydGljbGUob3B0aW9ucykge1xuICAgIHRoaXMuX2V2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuX3Bvc2l0aW9uID0gbmV3IFZlYzMob3B0aW9ucy5wb3NpdGlvbik7XG4gICAgdGhpcy5fbGFzdFBvc2l0aW9uID0gbmV3IFZlYzMoKTtcbiAgICB0aGlzLl92ZWxvY2l0eSA9IG5ldyBWZWMzKG9wdGlvbnMudmVsb2NpdHkpO1xuICAgIHRoaXMuX2ZvcmNlID0gbmV3IFZlYzMoKTtcbiAgICB0aGlzLl9tYXNzID0gb3B0aW9ucy5tYXNzIHx8IDE7XG4gICAgdGhpcy5faW52TWFzcyA9IDEgLyB0aGlzLl9tYXNzO1xuICAgIHRoaXMuX21vbWVudHVtID0gVmVjMy5zY2FsZSh0aGlzLl92ZWxvY2l0eSwgdGhpcy5fbWFzcyk7XG5cbiAgICB0aGlzLl9JRCA9IG51bGw7XG4gICAgdGhpcy5zZXR0bGVkID0gZmFsc2U7XG4gICAgdGhpcy5zbGVlcFRocmVzaG9sZCA9IG9wdGlvbnMuc2xlZXBUaHJlc2hvbGQgfHwgMDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjbGFzcyBuYW1lIGZvciB0aGUgRW50aXR5IFJlZ2lzdHJ5XG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZCB0b1N0cmluZ1xuICogQHJldHVybnMge3N0cmluZ30gcGFydGljbGVcbiAqL1xuUGFydGljbGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpe1xuICAgIHJldHVybiAncGFydGljbGUnO1xufTtcblxuLyoqXG4gKiBHZXR0ZXIgZm9yIG1hc3NcbiAqXG4gKiBAbWV0aG9kIGdldE1hc3NcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IG1hc3NcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmdldE1hc3MgPSBmdW5jdGlvbiBnZXRNYXNzKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXNzO1xufTtcblxuLyoqXG4gKiBHZXR0ZXIgZm9yIGludmVyc2UgbWFzc1xuICpcbiAqIEBtZXRob2QgZ2V0SW52ZXJzZU1hc3NcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGludmVyc2UgbWFzc1xuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0SW52ZXJzZU1hc3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5faW52TWFzcztcbn1cblxuLyoqXG4gKiBTZXR0ZXIgZm9yIG1hc3NcbiAqXG4gKiBAbWV0aG9kIHNldE1hc3NcbiAqIEBwYXJhbSB7TnVtYmVyfSBtYXNzXG4gKiBAcmV0dXJucyB7UGFydGljbGV9IHRoaXNcbiAqIEBjaGFpbmFibGVcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLnNldE1hc3MgPSBmdW5jdGlvbiBzZXRNYXNzKG1hc3MpIHtcbiAgICB0aGlzLl9tYXNzID0gbWFzcztcbiAgICB0aGlzLl9pbnZNYXNzID0gMSAvIG1hc3M7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHRlciBmb3IgcG9zaXRpb25cbiAqXG4gKiBAbWV0aG9kIGdldFBvc2l0aW9uXG4gKiBAcmV0dXJucyB7VmVjM30gcG9zaXRpb25cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gZ2V0UG9zaXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xufTtcblxuLyoqXG4gKiBHZXR0ZXIgZm9yIGxhc3QgcG9zaXRpb25cbiAqXG4gKiBAbWV0aG9kIGdldExhc3RQb3NpdGlvblxuICogQHJldHVybnMge1ZlYzN9IGxhc3RQb3NpdGlvblxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0TGFzdFBvc2l0aW9uID0gZnVuY3Rpb24gZ2V0TGFzdFBvc2l0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9sYXN0UG9zaXRpb247XG59O1xuXG4vKipcbiAqIFNldHRlciBmb3IgcG9zaXRpb25cbiAqXG4gKiBAbWV0aG9kIHNldFBvc2l0aW9uXG4gKiBAcGFyYW0ge1ZlYzMgfCBOdW1iZXJ9IHggdGhlIHZlY3RvciBmb3IgcG9zaXRpb24gb3IgdGhlIHggY29vcmRpbmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IHkgdGhlIHkgY29vcmRpbmF0ZSBmb3IgcG9zaXRpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHRoZSB6IGNvb3JkaW5hdGUgZm9yIHBvc2l0aW9uXG4gKiBAcmV0dXJucyB7UGFydGljbGV9IHRoaXNcbiAqIEBjaGFpbmFibGVcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLnNldFBvc2l0aW9uID0gZnVuY3Rpb24gc2V0UG9zaXRpb24oeCwgeSwgeikge1xuICAgIGlmICh4IGluc3RhbmNlb2YgVmVjMykge1xuICAgICAgICB0aGlzLl9wb3NpdGlvbi5jb3B5KHgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uLnNldCh4LCB5LCB6KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHRlciBmb3IgdmVsb2NpdHlcbiAqXG4gKiBAbWV0aG9kIGdldFZlbG9jaXR5XG4gKiBAcmV0dXJucyB7VmVjM30gdmVsb2NpdHlcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmdldFZlbG9jaXR5ID0gZnVuY3Rpb24gZ2V0VmVsb2NpdHkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZlbG9jaXR5O1xufTtcblxuLyoqXG4gKiBTZXR0ZXIgZm9yIHZlbG9jaXR5XG4gKlxuICogQG1ldGhvZCBzZXR2ZWxvY2l0eVxuICogQHBhcmFtIHtWZWMzIHwgTnVtYmVyfSB4IHRoZSB2ZWN0b3IgZm9yIHZlbG9jaXR5IG9yIHRoZSB4IGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHRoZSB5IGNvb3JkaW5hdGUgZm9yIHZlbG9jaXR5XG4gKiBAcGFyYW0ge051bWJlcn0geiB0aGUgeiBjb29yZGluYXRlIGZvciB2ZWxvY2l0eVxuICogQHJldHVybnMge1BhcnRpY2xlfSB0aGlzXG4gKiBAY2hhaW5hYmxlXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5zZXRWZWxvY2l0eSA9IGZ1bmN0aW9uIHNldFZlbG9jaXR5KHgsIHksIHopIHtcbiAgICBpZiAoeCBpbnN0YW5jZW9mIFZlYzMpIHtcbiAgICAgICAgdGhpcy5fdmVsb2NpdHkuY29weSh4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl92ZWxvY2l0eS5zZXQoeCwgeSwgeik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXR0ZXIgZm9yIHRoZSBmb3JjZSBvbiB0aGUgUGFydGljbGVcbiAqXG4gKiBAbWV0aG9kIGdldEZvcmNlXG4gKiBAcmV0dXJucyB7VmVjM30gZm9yY2VcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmdldEZvcmNlID0gZnVuY3Rpb24gZ2V0Rm9yY2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ZvcmNlO1xufTtcblxuLyoqXG4gKiBTZXR0ZXIgZm9yIHRoZSBmb3JjZSBvbiB0aGUgUGFydGljbGVcbiAqIFVzdWFsbHkgdXNlZCB0byBjbGVhciB0aGUgZm9yY2Ugb24gdGhlIFBhcnRpY2xlXG4gKlxuICogQG1ldGhvZCBzZXRGb3JjZVxuICogQHBhcmFtIHtWZWMzfSB2IHRoZSBuZXcgRm9yY2VcbiAqIEByZXR1cm5zIHtQYXJ0aWNsZX0gdGhpc1xuICogQGNoYWluYWJsZVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuc2V0Rm9yY2UgPSBmdW5jdGlvbiBzZXRGb3JjZSh2KSB7XG4gICAgdGhpcy5fZm9yY2UuY29weSh2KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0dGVyIGZvciBtb21lbnR1bVxuICogcCAobW9tZW50dW0pID0gbSAobWFzcykgKiB2ICh2ZWxvY2l0eSlcbiAqXG4gKiBAbWV0aG9kIGdldE1vbWVudHVtXG4gKiBAcmV0dXJucyB7VmVjM30gbW9tZW50dW1cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmdldE1vbWVudHVtID0gZnVuY3Rpb24gZ2V0TW9tZW50dW0oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21vbWVudHVtLmNvcHkodGhpcy52ZWxvY2l0eSkuc2NhbGUodGhpcy5fbWFzcyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGxlbmd0aCBvZiB0aGUgbW9tZW50dW0gdmVjdG9yXG4gKlxuICogQG1ldGhvZCBnZXRNb21lbnR1bVNjYWxhclxuICogQHJldHVybnMge051bWJlcn0gbGVuZ3RoXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRNb21lbnR1bVNjYWxhciA9IGZ1bmN0aW9uIGdldE1vbWVudHVtU2NhbGFyKCkge1xuICAgIHJldHVybiB0aGlzLmdldE1vbWVudHVtKCkubGVuZ3RoKCk7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgYSBmb3JjZSB0byB0aGUgcGFydGljbGVcbiAqIFRoZSBQaHlzaWNzU3lzdGVtIGNhbGxzIHRoaXMgbWV0aG9kIHdoZW4gYXBwbHlpbmcgdGhlIGFnZW50c1xuICpcbiAqIEBtZXRob2QgYXBwbHlGb3JjZVxuICogQHBhcmFtIHtWZWMzfSBmb3JjZSB0aGUgZm9yY2UgYXBwbGllZCB0byB0aGUgUGFydGljbGVcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmFwcGx5Rm9yY2UgPSBmdW5jdGlvbiBhcHBseUZvcmNlKGZvcmNlKXtcbiAgICB0aGlzLl9mb3JjZS5hZGQoZm9yY2UpO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGFuIGltcHVsc2UgdG8gdGhlIFBhcnRpY2xlXG4gKlxuICogQG1ldGhvZCBhcHBseUltcHVsc2VcbiAqIEBwYXJhbSB7VmVjM30gaW1wdWxzZVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuYXBwbHlJbXB1bHNlID0gZnVuY3Rpb24gYXBwbHlJbXB1bHNlKGltcHVsc2UpIHtcbiAgICBpZiAoaW1wdWxzZS5pc1plcm8oKSB8fCB0aGlzLmltbXVuZSkgcmV0dXJuO1xuICAgIHRoaXMuX3ZlbG9jaXR5LmFkZChWZWMzLnNjYWxlKGltcHVsc2UsdGhpcy5faW52TWFzcykpO1xufTtcblxuLyoqXG4gKiBJbnRlZ3JhdGVzIGZvcmNlIGludG8gdmVsb2NpdHlcbiAqXG4gKiBAcHJvdGVjdGVkXG4gKiBAbWV0aG9kIF9pbnRlZ3JhdGVWZWxvY2l0eVxuICogQHBhcmFtIHtOdW1iZXJ9IGR0IHRoZSB0aW1lIGJldHdlZW4gZnJhbWVzIGZvciBpbnRlZ3JhdGlvblxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuX2ludGVncmF0ZVZlbG9jaXR5ID0gZnVuY3Rpb24gX2ludGVncmF0ZVZlbG9jaXR5KGR0KSB7XG4gICAgaWYgKCF0aGlzLmltbXVuZSkgU3ltcGxlY3RpY0V1bGVyLmludGVncmF0ZVZlbG9jaXR5KHRoaXMsIGR0KTtcbiAgICB0aGlzLl9mb3JjZS5jbGVhcigpO1xufTtcblxuLyoqXG4gKiBJbnRlZ3JhdGVzIHZlbG9jaXR5IGludG8gcG9zaXRpb25cbiAqXG4gKiBAcHJvdGVjdGVkXG4gKiBAbWV0aG9kIF9pbnRlZ3JhdGVQb3NlXG4gKiBAcGFyYW0ge051bWJlcn0gZHQgdGhlIHRpbWUgYmV0d2VlbiBmcmFtZXMgZm9yIGludGVncmF0aW9uXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5faW50ZWdyYXRlUG9zZSA9IGZ1bmN0aW9uIF9pbnRlZ3JhdGVQb3NlKGR0KSB7XG4gICAgaWYgKCF0aGlzLmltbXVuZSkgU3ltcGxlY3RpY0V1bGVyLmludGVncmF0ZVBvc2l0aW9uKHRoaXMsIGR0KTtcbiAgICB0aGlzLl9ldmVudEVtaXR0ZXIuZW1pdCgndXBkYXRlJyk7XG4gICAgaWYgKHRoaXMuX2ZvcmNlLmxlbmd0aCgpIDwgdGhpcy5zbGVlcFRocmVzaG9sZCAmJiB0aGlzLl92ZWxvY2l0eS5sZW5ndGgoKSA8IHRoaXMuc2xlZXBUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5zZXR0bGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fZXZlbnRFbWl0dGVyLmVtaXQoJ3NldHRsZWQnKTtcbiAgICAgICAgdGhpcy5fdmVsb2NpdHkuY2xlYXIoKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnRpY2xlO1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogYWRhbUBmYW1vLnVzLCB3aWxsQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG4gdmFyIE9wdGlvbnNNYW5hZ2VyID0gcmVxdWlyZSgnLi4vLi4vY29yZS9PcHRpb25zTWFuYWdlcicpO1xuIHZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuLi8uLi9ldmVudHMvRXZlbnRFbWl0dGVyJyk7XG5cbi8qKlxuICogQmFzZSBDb25zdHJhaW50IGNsYXNzIHRvIGJlIHVzZWQgaW4gdGhlIFBoeXNpY3NTeXN0ZW1cbiAqIFN1YmNsYXNzIHRoaXMgY2xhc3MgdG8gaW1wbGVtZW50IGEgY29uc3RyYWludFxuICpcbiAqIEB2aXJ0dWFsXG4gKiBAY2xhc3MgQ29uc3RyYWludFxuICovXG5mdW5jdGlvbiBDb25zdHJhaW50KG9wdGlvbnMpIHtcbiAgICB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuICAgIHRoaXMuX3RhcmdldHMgPSBbXTtcbiAgICB0aGlzLl9ldmVudEVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICBpZiAob3B0aW9ucy5zb3VyY2UpIHRoaXMuc2V0U291cmNlKG9wdGlvbnMuc291cmNlKTtcbiAgICBpZiAob3B0aW9ucy50YXJnZXRzKSB0aGlzLmFkZFRhcmdldChvcHRpb25zLnRhcmdldHMpO1xuXG4gICAgdGhpcy5fSUQgPSBudWxsO1xufTtcblxuLy8gTm90IG1lYW50IHRvIGJlIGltcGxlbWVudGVkXG5Db25zdHJhaW50LnByb3RvdHlwZSA9IHt9O1xuQ29uc3RyYWludC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSB1bmRlZmluZWQ7XG5cbkNvbnN0cmFpbnQucHJvdG90eXBlLnNldE9wdGlvbnMgPSBmdW5jdGlvbiBzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBPcHRpb25zTWFuYWdlci5wYXRjaCh0aGlzLm9wdGlvbnMgfHwgT2JqZWN0LmNyZWF0ZSh0aGlzLmNvbnN0cnVjdG9yLkRFRkFVTFRfT1BUSU9OUyB8fCB7fSksIG9wdGlvbnMpO1xufTtcblxuQ29uc3RyYWludC5wcm90b3R5cGUuZ2V0U291cmNlID0gZnVuY3Rpb24gZ2V0U291cmNlKCkge1xuICAgIHJldHVybiB0aGlzLl9zb3VyY2U7XG59O1xuXG5Db25zdHJhaW50LnByb3RvdHlwZS5nZXRUYXJnZXRzID0gZnVuY3Rpb24gZ2V0VGFyZ2V0cygpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0cztcbn07XG5cbkNvbnN0cmFpbnQucHJvdG90eXBlLnNldFNvdXJjZSA9IGZ1bmN0aW9uIHNldFNvdXJjZShzb3VyY2UpIHtcbiAgICB0aGlzLl9ldmVudEVtaXR0ZXIuZW1pdCgnYWRkJywgc291cmNlKTtcbiAgICB0aGlzLl9zb3VyY2UgPSBzb3VyY2U7XG59O1xuXG5Db25zdHJhaW50LnByb3RvdHlwZS5hZGRUYXJnZXQgPSBmdW5jdGlvbiBhZGRUYXJnZXQodGFyZ2V0cykge1xuICAgIGlmICghKHRhcmdldHMgaW5zdGFuY2VvZiBBcnJheSkpIHRhcmdldHMgPSBbdGFyZ2V0c107XG4gICAgdGhpcy5fZXZlbnRFbWl0dGVyLmVtaXQoJ2FkZCcsIHRhcmdldHMpO1xuICAgIHZhciBuVGFyZ2V0cyA9IHRhcmdldHMubGVuZ3RoO1xuICAgIHdoaWxlIChuVGFyZ2V0cy0tKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldHMucHVzaCh0YXJnZXRzW25UYXJnZXRzXSk7XG4gICAgfVxufTtcblxuQ29uc3RyYWludC5wcm90b3R5cGUucmVtb3ZlVGFyZ2V0ID0gZnVuY3Rpb24gcmVtb3ZlVGFyZ2V0KHRhcmdldHMpIHtcbiAgICBpZiAoISh0YXJnZXRzIGluc3RhbmNlb2YgQXJyYXkpKSB0YXJnZXRzID0gW3RhcmdldHNdO1xuICAgIHZhciBuVGFyZ2V0cyA9IHRhcmdldHMubGVuZ3RoO1xuICAgIHdoaWxlIChuVGFyZ2V0cy0tKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuX3RhcmdldHMuaW5kZXhPZih0YXJnZXRzW25UYXJnZXRzXSk7XG4gICAgICAgIGlmIChpbmRleCA+IC0xKSB0aGlzLl90YXJnZXRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZXRlY3QgdmlvbGF0aW9ucyBvZiB0aGUgY29uc3RyYWludFxuICpcbiAqIEBtZXRob2QgQ29uc3RyYWludCN1cGRhdGVcbiAqIEBwYXJhbSB7UGFydGljbGUgfCB1bmRlZmluZWR9IHNvdXJjZSB0aGUgc291cmNlIG9mIHRoZSBjb25zdHJhaW50XG4gKiBAcGFyYW0ge1BhcnRpY2xlW119IHRhcmdldHMgb2YgdGhlIGNvbnN0cmFpbnRcbiAqIEB0aHJvd3Mgd2hlbiBub3Qgc3ViY2xhc3NlZFxuICovXG5Db25zdHJhaW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgLy8gdGhyb3cgbmV3IEVycm9yKCdDb25zdHJhaW50IHNob3VsZCBiZSBleHRlbmRlZCwgbm90IGltcGxlbWVudGVkJyk7XG59XG5cbi8qKlxuICogQXBwbHkgdGhlIGNvbnN0cmFpbnQgZnJvbSB0aGUgc291cmNlIHRvIHRoZSB0YXJnZXRzXG4gKlxuICogQG1ldGhvZCBDb25zdHJhaW50I3VwZGF0ZVxuICogQHBhcmFtIHtQYXJ0aWNsZSB8IHVuZGVmaW5lZH0gc291cmNlIHRoZSBzb3VyY2Ugb2YgdGhlIGNvbnN0cmFpbnRcbiAqIEBwYXJhbSB7UGFydGljbGVbXX0gdGFyZ2V0cyBvZiB0aGUgY29uc3RyYWludFxuICogQHRocm93cyB3aGVuIG5vdCBzdWJjbGFzc2VkXG4gKi9cbkNvbnN0cmFpbnQucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbiByZXNvbHZlKGR0LCBpdGVyYXRpb24pIHtcbiAgICAvLyB0aHJvdyBuZXcgRXJyb3IoJ0NvbnN0cmFpbnQgc2hvdWxkIGJlIGV4dGVuZGVkLCBub3QgaW1wbGVtZW50ZWQnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb25zdHJhaW50O1xuIiwiLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogYWRhbUBmYW1vLnVzLCB3aWxsQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG52YXIgT3B0aW9uc01hbmFnZXIgPSByZXF1aXJlKCcuLi8uLi9jb3JlL09wdGlvbnNNYW5hZ2VyJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL0V2ZW50RW1pdHRlcicpO1xuXG4vKipcbiAqIEFic3RyYWN0IGZvcmNlIG1hbmFnZXIgdG8gYXBwbHkgZm9yY2VzIHRvIHRhcmdldHMuICBOb3QgbWVhbnQgdG8gYmUgaW1wbGVtZW50ZWQuXG4gKiBAdmlydHVhbFxuICogQGNsYXNzIEZvcmNlXG4gKi9cbmZ1bmN0aW9uIEZvcmNlKG9wdGlvbnMpIHtcbiAgICB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuICAgIHRoaXMuX3RhcmdldHMgPSBbXTtcbiAgICB0aGlzLl9mb3JjZUZ1bmN0aW9uID0gdGhpcy5vcHRpb25zLmZvcmNlRnVuY3Rpb247XG4gICAgdGhpcy5fZXZlbnRFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gICAgaWYgKG9wdGlvbnMuc291cmNlKSB0aGlzLnNldFNvdXJjZShvcHRpb25zLnNvdXJjZSk7XG4gICAgaWYgKG9wdGlvbnMudGFyZ2V0cykgdGhpcy5hZGRUYXJnZXQob3B0aW9ucy50YXJnZXRzKTtcblxuICAgIHRoaXMuX0lEID0gbnVsbDtcbn1cblxuLy8gTm90IE1lYW50IHRvIGJlIGltcGxlbWVudGVkXG5Gb3JjZS5wcm90b3R5cGUgPSB7fTtcbkZvcmNlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IG51bGw7XG5cbkZvcmNlLnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gT3B0aW9uc01hbmFnZXIucGF0Y2godGhpcy5vcHRpb25zIHx8IE9iamVjdC5jcmVhdGUodGhpcy5jb25zdHJ1Y3Rvci5ERUZBVUxUX09QVElPTlMgfHwge30pLCBvcHRpb25zKTtcbn07XG5cbkZvcmNlLnByb3RvdHlwZS5nZXRTb3VyY2UgPSBmdW5jdGlvbiBnZXRTb3VyY2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvdXJjZTtcbn07XG5cbkZvcmNlLnByb3RvdHlwZS5nZXRUYXJnZXRzID0gZnVuY3Rpb24gZ2V0VGFyZ2V0cygpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0cztcbn07XG5cbkZvcmNlLnByb3RvdHlwZS5zZXRTb3VyY2UgPSBmdW5jdGlvbiBzZXRTb3VyY2Uoc291cmNlKSB7XG4gICAgdGhpcy5fc291cmNlID0gc291cmNlO1xuICAgIHRoaXMuX2V2ZW50RW1pdHRlci5lbWl0KCdhZGQnLCBzb3VyY2UpO1xufTtcblxuRm9yY2UucHJvdG90eXBlLmFkZFRhcmdldCA9IGZ1bmN0aW9uIGFkZFRhcmdldCh0YXJnZXRzKSB7XG4gICAgaWYgKCEodGFyZ2V0cyBpbnN0YW5jZW9mIEFycmF5KSkgdGFyZ2V0cyA9IFt0YXJnZXRzXTtcbiAgICB2YXIgblRhcmdldHMgPSB0YXJnZXRzLmxlbmd0aDtcbiAgICB3aGlsZSAoblRhcmdldHMtLSkge1xuICAgICAgICB0aGlzLl90YXJnZXRzLnB1c2godGFyZ2V0c1tuVGFyZ2V0c10pO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudEVtaXR0ZXIuZW1pdCgnYWRkJywgdGFyZ2V0cyk7XG59O1xuXG5Gb3JjZS5wcm90b3R5cGUucmVtb3ZlVGFyZ2V0ID0gZnVuY3Rpb24gcmVtb3ZlVGFyZ2V0KHRhcmdldHMpIHtcbiAgICBpZiAoISh0YXJnZXRzIGluc3RhbmNlb2YgQXJyYXkpKSB0YXJnZXRzID0gW3RhcmdldHNdO1xuICAgIHZhciBuVGFyZ2V0cyA9IHRhcmdldHMubGVuZ3RoO1xuICAgIHdoaWxlIChuVGFyZ2V0cy0tKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuX3RhcmdldHMuaW5kZXhPZih0YXJnZXRzW25UYXJnZXRzXSk7XG4gICAgICAgIGlmIChpbmRleCA+IC0xKSB0aGlzLl90YXJnZXRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICogQHBhcmFtIHtQYXJ0aWNsZX0gc291cmNlXG4gKiBAcGFyYW0ge1BhcnRpY2xlW119IHRhcmdldHNcbiAqL1xuRm9yY2UucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgc291cmNlID0gdGhpcy5fc291cmNlO1xuICAgIHZhciB0YXJnZXRzID0gdGhpcy5fdGFyZ2V0cztcblxuICAgIHRoaXMuX2V2ZW50RW1pdHRlci5lbWl0KCd1cGRhdGUnKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGFyZ2V0cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGFyZ2V0c1tpXTtcbiAgICAgICAgdGFyZ2V0LmFwcGx5Rm9yY2UodGhpcy5fZm9yY2VGdW5jdGlvbihzb3VyY2UsIHRhcmdldCkpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRm9yY2U7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBhZGFtQGZhbW8udXMsIHdpbGxAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuXG4vKipcbiAqIE9yZGluYXJ5IERpZmZlcmVudGlhbCBFcXVhdGlvbiAoT0RFKSBJbnRlZ3JhdG9yLlxuICogTWFuYWdlcyB1cGRhdGluZyBhIHBoeXNpY3MgYm9keSdzIHN0YXRlIG92ZXIgdGltZS5cbiAqXG4gKiAgcCA9IHBvc2l0aW9uLCB2ID0gdmVsb2NpdHksIG0gPSBtYXNzLCBmID0gZm9yY2UsIGR0ID0gY2hhbmdlIGluIHRpbWVcbiAqXG4gKiAgICAgIHYgPC0gdiArIGR0ICogZiAvIG1cbiAqICAgICAgcCA8LSBwICsgZHQgKiB2XG4gKlxuICogIHEgPSBvcmllbnRhdGlvbiwgdyA9IGFuZ3VsYXIgdmVsb2NpdHksIEwgPSBhbmd1bGFyIG1vbWVudHVtXG4gKlxuICogICAgICBMIDwtIEwgKyBkdCAqIHRcbiAqICAgICAgcSA8LSBxICsgZHQvMiAqIHEgKiB3XG4gKlxuICogQGNsYXNzIFN5bXBsZWN0aWNFdWxlclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBPcHRpb25zIHRvIHNldFxuICovXG52YXIgU3ltcGxlY3RpY0V1bGVyID0ge307XG52YXIgVmVjMyA9IHJlcXVpcmUoJy4uLy4uL21hdGgvVmVjMycpO1xuXG52YXIgREVMVEFfUkVHSVNURVIgPSBuZXcgVmVjMygpO1xuXG4vKlxuICogVXBkYXRlcyB0aGUgdmVsb2NpdHkgb2YgYSBwaHlzaWNzIGJvZHkgZnJvbSBpdHMgYWNjdW11bGF0ZWQgZm9yY2UuXG4gKiAgICAgIHYgPC0gdiArIGR0ICogZiAvIG1cbiAqXG4gKiBAbWV0aG9kIGludGVncmF0ZVZlbG9jaXR5XG4gKiBAcGFyYW0ge0JvZHl9IHBoeXNpY3MgYm9keVxuICogQHBhcmFtIHtOdW1iZXJ9IGR0IGRlbHRhIHRpbWVcbiAqL1xuU3ltcGxlY3RpY0V1bGVyLmludGVncmF0ZVZlbG9jaXR5ID0gZnVuY3Rpb24gaW50ZWdyYXRlVmVsb2NpdHkoYm9keSwgZHQpIHtcbiAgICB2YXIgdiA9IGJvZHkuZ2V0VmVsb2NpdHkoKTtcbiAgICB2YXIgdyA9IGJvZHkuZ2V0SW52ZXJzZU1hc3MoKTtcbiAgICB2YXIgZiA9IGJvZHkuZ2V0Rm9yY2UoKTtcbiAgICBpZiAoZi5pc1plcm8oKSkgcmV0dXJuO1xuXG4gICAgdi5hZGQoREVMVEFfUkVHSVNURVIuY29weShmKS5zY2FsZShkdCAqIHcpKTtcbn07XG5cbi8qXG4gKiBVcGRhdGVzIHRoZSBwb3NpdGlvbiBvZiBhIHBoeXNpY3MgYm9keSBmcm9tIGl0cyB2ZWxvY2l0eS5cbiAqICAgICAgcCA8LSBwICsgZHQgKiB2XG4gKlxuICogQG1ldGhvZCBpbnRlZ3JhdGVQb3NpdGlvblxuICogQHBhcmFtIHtCb2R5fSBwaHlzaWNzIGJvZHlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkdCBkZWx0YSB0aW1lXG4gKi9cblN5bXBsZWN0aWNFdWxlci5pbnRlZ3JhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uIGludGVncmF0ZVBvc2l0aW9uKGJvZHksIGR0KSB7XG4gICAgdmFyIHAgPSBib2R5LmdldFBvc2l0aW9uKCk7XG4gICAgdmFyIHYgPSBib2R5LmdldFZlbG9jaXR5KCk7XG5cbiAgICBpZiAoTWF0aC5hYnModi54KSA9PT0gSW5maW5pdHkgfHwgTWF0aC5hYnModi55KSA9PT0gSW5maW5pdHkgfHwgTWF0aC5hYnModi56KSA9PT0gSW5maW5pdHkpIGRlYnVnZ2VyO1xuXG4gICAgcC5hZGQoREVMVEFfUkVHSVNURVIuY29weSh2KS5zY2FsZShkdCkpO1xuICAgIGlmIChNYXRoLmFicyhwLngpID09PSBJbmZpbml0eSB8fCBNYXRoLmFicyhwLnkpID09PSBJbmZpbml0eSB8fCBNYXRoLmFicyhwLnopID09PSBJbmZpbml0eSkgZGVidWdnZXI7XG59O1xuXG4vKlxuICogVXBkYXRlcyB0aGUgYW5ndWxhciBtb21lbnR1bSBvZiBhIHBoeXNpY3MgYm9keSBmcm9tIGl0cyBhY2N1bXVsZWQgdG9ycXVlLlxuICogICAgICBMIDwtIEwgKyBkdCAqIHRcbiAqXG4gKiBAbWV0aG9kIGludGVncmF0ZUFuZ3VsYXJNb21lbnR1bVxuICogQHBhcmFtIHtCb2R5fSBwaHlzaWNzIGJvZHkgKGV4Y2VwdCBhIHBhcnRpY2xlKVxuICogQHBhcmFtIHtOdW1iZXJ9IGR0IGRlbHRhIHRpbWVcbiAqL1xuU3ltcGxlY3RpY0V1bGVyLmludGVncmF0ZUFuZ3VsYXJNb21lbnR1bSA9IGZ1bmN0aW9uIGludGVncmF0ZUFuZ3VsYXJNb21lbnR1bShib2R5LCBkdCkge1xuICAgIHZhciBMID0gYm9keS5hbmd1bGFyTW9tZW50dW07XG4gICAgdmFyIHQgPSBib2R5LnRvcnF1ZTtcblxuICAgIGlmICh0LmlzWmVybygpKSByZXR1cm47XG5cbiAgICBMLmFkZCh0LnNjYWxlKGR0KSk7XG59O1xuXG4vKlxuICogVXBkYXRlcyB0aGUgb3JpZW50YXRpb24gb2YgYSBwaHlzaWNzIGJvZHkgZnJvbSBpdHMgYW5ndWxhciB2ZWxvY2l0eS5cbiAqICAgICAgcSA8LSBxICsgZHQvMiAqIHEgKiB3XG4gKlxuICogQG1ldGhvZCBpbnRlZ3JhdGVPcmllbnRhdGlvblxuICogQHBhcmFtIHtCb2R5fSBwaHlzaWNzIGJvZHkgKGV4Y2VwdCBhIHBhcnRpY2xlKVxuICogQHBhcmFtIHtOdW1iZXJ9IGR0IGRlbHRhIHRpbWVcbiAqL1xuXG5TeW1wbGVjdGljRXVsZXIuaW50ZWdyYXRlT3JpZW50YXRpb24gPSBmdW5jdGlvbiBpbnRlZ3JhdGVPcmllbnRhdGlvbihib2R5LCBkdCkge1xuICAgIHZhciBxID0gYm9keS5vcmllbnRhdGlvbjtcbiAgICB2YXIgdyA9IGJvZHkuYW5ndWxhclZlbG9jaXR5O1xuXG4gICAgaWYgKHcuaXNaZXJvKCkpIHJldHVybjtcbiAgICBxLmFkZChxLm11bHRpcGx5KHcpLnNjYWxhck11bHRpcGx5KDAuNSAqIGR0KSkucHV0KHEpO1xuICAgIHEubm9ybWFsaXplKCkucHV0KHEpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTeW1wbGVjdGljRXVsZXI7XG4iLCIvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyczogZGFuQGZhbW8udXNcbiAqICAgICAgICAgZmVsaXhAZmFtby51c1xuICogICAgICAgICBtaWtlQGZhbW8udXNcbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbnRpdHlSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NvcmUvRW50aXR5UmVnaXN0cnknKTtcbnZhciBMaWZ0Q29sbGVjdGlvbiA9IEVudGl0eVJlZ2lzdHJ5LmFkZENvbGxlY3Rpb24oJ0xpZnQnKTtcblxuLyoqXG4gKiBMaWZ0U3lzdGVtIGlzIHJlc3BvbnNpYmxlIGZvciB0cmF2ZXJzaW5nIHRoZSBzY2VuZSBncmFwaCBhbmRcbiAqICAgdXBkYXRpbmcgdGhlIFRyYW5zZm9ybXMsIFNpemVzLCBhbmQgT3BhY2l0aWVzIG9mIHRoZSBlbnRpdGllcy5cbiAqXG4gKiBAY2xhc3MgIExpZnRTeXN0ZW1cbiAqIEBzeXN0ZW1cbiAqIEBzaW5nbGV0b25cbiAqL1xudmFyIExpZnRTeXN0ZW0gPSB7fTtcblxuLyoqXG4gKiB1cGRhdGUgaXRlcmF0ZXMgb3ZlciBlYWNoIG9mIHRoZSBDb250ZXh0cyB0aGF0IHdlcmUgcmVnaXN0ZXJlZCBhbmRcbiAqICAga2lja3Mgb2YgdGhlIHJlY3Vyc2l2ZSB1cGRhdGluZyBvZiB0aGVpciBlbnRpdGllcy5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVxuICovXG52YXIgdGVzdCA9IFtdO1xuTGlmdFN5c3RlbS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIHJvb3RQYXJhbXM7XG4gICAgdmFyIGxpZnQ7XG4gICAgdmFyIGNsZWFudXAgPSBbXTtcblxuICAgIExpZnRDb2xsZWN0aW9uLmZvckVhY2goZnVuY3Rpb24oZW50aXR5KSB7XG4gICAgICAgIGxpZnQgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdMaWZ0Q29tcG9uZW50Jyk7XG4gICAgICAgIHJvb3RQYXJhbXMgPSBsaWZ0Ll91cGRhdGUoKTtcbiAgICAgICAgcm9vdFBhcmFtcy51bnNoaWZ0KGVudGl0eSk7XG4gICAgICAgIGNvcmVVcGRhdGVBbmRGZWVkLmFwcGx5KG51bGwsIHJvb3RQYXJhbXMpO1xuXG4gICAgICAgIGlmIChsaWZ0LmRvbmUpIGNsZWFudXAucHVzaChlbnRpdHkpO1xuICAgIH0pO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGVhbnVwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNsZWFudXBbaV0ucmVtb3ZlQ29tcG9uZW50KCdMaWZ0Q29tcG9uZW50Jyk7XG4gICAgICAgIEVudGl0eVJlZ2lzdHJ5LmRlcmVnaXN0ZXIoY2xlYW51cFtpXSwgJ0xpZnQnKTtcbiAgICB9XG59XG5cbi8qKlxuICogY29yZVVwZGF0ZUFuZEZlZWQgZmVlZHMgcGFyZW50IGluZm9ybWF0aW9uIHRvIGFuIGVudGl0eSBhbmQgc28gdGhhdFxuICogICBlYWNoIGVudGl0eSBjYW4gdXBkYXRlIHRoZWlyIHRyYW5zZm9ybSwgc2l6ZSwgYW5kIG9wYWNpdHkuICBJdCBcbiAqICAgd2lsbCB0aGVuIHBhc3MgZG93biBpbnZhbGlkYXRpb24gc3RhdGVzIGFuZCB2YWx1ZXMgdG8gYW55IGNoaWxkcmVuLlxuICpcbiAqIEBtZXRob2QgY29yZVVwZGF0ZUFuZEZlZWRcbiAqIEBwcml2YXRlXG4gKiAgIFxuICogQHBhcmFtICB7RW50aXR5fSAgZW50aXR5ICAgICAgICAgICBFbnRpdHkgaW4gdGhlIHNjZW5lIGdyYXBoXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICB0cmFuc2Zvcm1SZXBvcnQgIGJpdFNjaGVtZSByZXBvcnQgb2YgdHJhbnNmb3JtIGludmFsaWRhdGlvbnNcbiAqIEBwYXJhbSAge0FycmF5fSAgIGluY29taW5nTWF0cml4ICAgcGFyZW50IHRyYW5zZm9ybSBhcyBhIEZsb2F0MzIgQXJyYXlcbiAqIEBwYXJhbSAge051bWJlcn0gIHNpemVSZXBvcnQgICAgICAgYml0U2NoZW1lIHJlcG9ydCBvZiBzaXplIGludmFsaWRhdGlvbnNcbiAqIEBwYXJhbSAge0FycmF5fSAgIGluY29taW5nU2l6ZSAgICAgcGFyZW50IHNpemUgaW4gcGl4ZWxzXG4gKiBAcGFyYW0gIHtCb29sZWFufSBvcGFjaXR5UmVwb3J0ICAgIGJvb2xlYW4gcmVwb3J0IG9mIG9wYWNpdHkgaW52YWxpZGF0aW9uXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICBpbmNvbWluZ09wYWNpdHkgIHBhcmVudCBvcGFjaXR5XG4gKi9cbmZ1bmN0aW9uIGNvcmVVcGRhdGVBbmRGZWVkKGVudGl0eSwgdHJhbnNmb3JtUmVwb3J0LCBpbmNvbWluZ01hdHJpeCwgc2l6ZVJlcG9ydCwgaW5jb21pbmdTaXplLCBvcGFjaXR5UmVwb3J0LCBpbmNvbWluZ09wYWNpdHkpIHtcbiAgICBpZiAoIWVudGl0eSkgcmV0dXJuO1xuICAgIHZhciB0cmFuc2Zvcm0gPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCd0cmFuc2Zvcm0nKTtcbiAgICB2YXIgc2l6ZSAgICAgID0gZW50aXR5LmdldENvbXBvbmVudCgnc2l6ZScpO1xuICAgIHZhciBvcGFjaXR5ICAgPSBlbnRpdHkuZ2V0Q29tcG9uZW50KCdvcGFjaXR5Jyk7XG4gICAgdmFyIGNoaWxkcmVuICA9IGVudGl0eS5nZXRDaGlsZHJlbigpO1xuICAgIHZhciBpID0gY2hpbGRyZW4ubGVuZ3RoO1xuXG4gICAgdHJhbnNmb3JtUmVwb3J0ID0gdHJhbnNmb3JtLl91cGRhdGUodHJhbnNmb3JtUmVwb3J0LCBpbmNvbWluZ01hdHJpeCk7XG4gICAgc2l6ZVJlcG9ydCAgICAgID0gc2l6ZS5fdXBkYXRlKHNpemVSZXBvcnQsIGluY29taW5nU2l6ZSk7XG4gICAgb3BhY2l0eVJlcG9ydCAgID0gb3BhY2l0eS5fdXBkYXRlKG9wYWNpdHlSZXBvcnQsIGluY29taW5nT3BhY2l0eSk7XG5cbiAgICB3aGlsZSAoaS0tKSBcbiAgICAgICAgY29yZVVwZGF0ZUFuZEZlZWQoXG4gICAgICAgICAgICBjaGlsZHJlbltpXSxcbiAgICAgICAgICAgIHRyYW5zZm9ybVJlcG9ydCxcbiAgICAgICAgICAgIHRyYW5zZm9ybS5fbWF0cml4LFxuICAgICAgICAgICAgc2l6ZVJlcG9ydCxcbiAgICAgICAgICAgIHNpemUuX2dsb2JhbFNpemUsXG4gICAgICAgICAgICBvcGFjaXR5UmVwb3J0LFxuICAgICAgICAgICAgb3BhY2l0eS5fZ2xvYmFsT3BhY2l0eSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlmdFN5c3RlbTtcbiIsInZhciBFbmdpbmUgID0gcmVxdWlyZSgnZmFtb3VzL3NyYy9jb3JlL0VuZ2luZScpO1xudmFyIFN1cmZhY2UgPSByZXF1aXJlKCdmYW1vdXMvc3JjL2NvcmUvQ29tcG9uZW50cy9TdXJmYWNlJyk7XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcblxuXHR2YXIgY29udGV4dCA9IEVuZ2luZS5jcmVhdGVDb250ZXh0KCk7XG5cdHZhciBlbnRpdHkgPSBjb250ZXh0LmFkZENoaWxkKCk7XG5cblx0dmFyIHN1cmZhY2UgPSBlbnRpdHkuYWRkQ29tcG9uZW50KFN1cmZhY2UsIHtcblx0XHRzaXplOiBbMTAwLDEwMF0sXG5cdFx0Y29udGVudDogXCI8aDI+SFRNTCBjb250ZW50PC9oMj5cIiwgICAgICAgIFxuXHRcdCBwcm9wZXJ0aWVzOiB7XG5cdFx0ICAgICAgY29sb3I6IFwid2hpdGVcIixcblx0XHQgICAgICBib3JkZXJSYWRpdXM6IFwiNTBweFwiLFxuXHRcdCAgICAgIHRleHRBbGlnbjogXCJjZW50ZXJcIixcblx0XHQgICAgICBiYWNrZ3JvdW5kQ29sb3I6ICdibHVlJ1xuXHRcdCAgICB9XG5cdH0pO1xuXG4gIGVudGl0eS5nZXRDb21wb25lbnQoJ3RyYW5zZm9ybScpLnRyYW5zbGF0ZSgxMDAsMTAwLDApXG5cbn1cblxuIFxuICAgIFxuICAgIFxuXG4iXX0=
