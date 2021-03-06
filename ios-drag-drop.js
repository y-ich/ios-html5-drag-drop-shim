// Generated by CoffeeScript 1.4.0

/*
CoffeeScript porting of https://github.com/timruffles/ios-html5-drag-drop-shim
2013 (C) ICHIKAWA, Yuji
*/


(function() {
  var DEBUG, DragDrop, ERROR, INFO, LOG_LEVEL, VERBOSE, average, coordinateSystemForElementFromPoint, div, dragDiv, dragstart, evts, getEls, handler, log, needsPatch, noop, onEvt, once, parents,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  VERBOSE = 3;

  DEBUG = 2;

  INFO = 1;

  ERROR = 0;

  LOG_LEVEL = INFO;

  noop = function() {};

  log = noop != null ? noop : function(msg, level) {
    if (level == null) {
      level = ERROR;
    }
    if (level <= LOG_LEVEL) {
      return console.log(msg);
    }
  };

  div = document.createElement('div');

  dragDiv = 'draggable' in div;

  evts = 'ondragstart' in div && 'ondrop' in div;

  needsPatch = !(dragDiv || evts) || /iPad|iPhone|iPod/.test(navigator.userAgent);

  log("" + (needsPatch ? '' : 'not ') + "patching html5 drag drop");

  if (!needsPatch) {
    return;
  }

  onEvt = function(el, event, handler) {
    el.addEventListener(event, handler);
    return {
      off: function() {
        return el.removeEventListener(event, handler);
      }
    };
  };

  once = function(el, event, handler) {
    var listener;
    return el.addEventListener(event, listener = function(evt) {
      handler(evt);
      return el.removeEventListener(event, listener);
    });
  };

  average = function(arr) {
    if (arr.length === 0) {
      return 0;
    }
    return arr.reduce((function(s, v) {
      return v + s;
    }), 0) / arr.length;
  };

  coordinateSystemForElementFromPoint = (function() {
    var match;
    if (match = navigator.userAgent.match(/(?:iPhone|iPad);.*OS ([0-9]+)_([0-9]+)/)) {
      if (parseInt(match[1] < 5)) {
        return 'page';
      } else {
        return 'client';
      }
    } else {
      return 'page';
    }
  })();

  log(coordinateSystemForElementFromPoint, INFO);

  DragDrop = (function() {

    function DragDrop(event, el) {
      var cancel, cleanup, end, evt, match, move, transform, x, y, _ref,
        _this = this;
      this.el = el != null ? el : event.target;
      this.dragend = __bind(this.dragend, this);

      this.move = __bind(this.move, this);

      log('dragstart', VERBOSE);
      event.preventDefault();
      this.dragData = {};
      evt = document.createEvent('Event');
      evt.initEvent('dragstart', true, true);
      evt.dataTransfer = {
        setData: function(type, val) {
          return _this.dragData[type] = val;
        },
        dropEffect: 'move'
      };
      this.el.dispatchEvent(evt);
      if (getComputedStyle(el, '').display === 'inline' && this.el.style.display === '') {
        this.el.style.display = 'inline-block';
        this.inline = true;
      }
      this.touchPositions = {};
      transform = this.el.style['-webkit-transform'];
      _ref = (match = /translate\(\s*(\d+)[^,]*,\D*(\d+)/.exec(transform)) ? [parseInt(match[1]), parseInt(match[2])] : [0, 0], x = _ref[0], y = _ref[1];
      this.elTranslation = {
        x: x,
        y: y
      };
      cleanup = function() {
        log('cleanup');
        _this.touchPositions = {};
        return [move, end, cancel].forEach(function(handler) {
          return handler.off();
        });
      };
      move = onEvt(document, 'touchmove', this.move);
      end = onEvt(document, 'touchend', function(evt) {
        _this.dragend(evt, event.target);
        return cleanup();
      });
      cancel = onEvt(document, 'touchcancel', cleanup);
    }

    DragDrop.prototype.move = function(event) {
      var deltas,
        _this = this;
      log('dragmove', VERBOSE);
      console.log(event);
      deltas = [].slice.call(event.changedTouches).reduce(function(deltas, touch, index) {
        var position;
        position = _this.touchPositions[index];
        if (position) {
          deltas.x.push(touch.pageX - position.x);
          deltas.y.push(touch.pageY - position.y);
        } else {
          _this.touchPositions[index] = position = {};
        }
        position.x = touch.pageX;
        position.y = touch.pageY;
        return deltas;
      }, {
        x: [],
        y: []
      });
      this.elTranslation.x += average(deltas.x);
      this.elTranslation.y += average(deltas.y);
      return this.el.style["-webkit-transform"] = "translate(" + this.elTranslation.x + "px," + this.elTranslation.y + "px)";
    };

    DragDrop.prototype.dragend = function(event) {
      var doSnapBack, dropEvt, next, parent, replacementFn, snapBack, target,
        _this = this;
      log('dragend');
      doSnapBack = function() {
        once(_this.el, 'webkitTransitionEnd', function() {
          var dragendEvt;
          _this.el.style['-webkit-transition'] = 'none';
          if (_this.inline) {
            _this.el.style['display'] = '';
          }
          dragendEvt = document.createEvent('Event');
          dragendEvt.initEvent('dragend', true, true);
          return _this.el.dispatchEvent(dragendEvt);
        });
        return setTimeout(function() {
          _this.el.style['-webkit-transition'] = 'all 0.2s';
          return _this.el.style['-webkit-transform'] = 'translate(0,0)';
        });
      };
      this.el.style.visibility = 'hidden';
      target = document.elementFromPoint(event.changedTouches[0]["" + coordinateSystemForElementFromPoint + "X"], event.changedTouches[0]["" + coordinateSystemForElementFromPoint + "Y"]);
      log(target, INFO);
      this.el.style.visibility = '';
      if (target) {
        dropEvt = document.createEvent('Event');
        dropEvt.initEvent('drop', true, true);
        dropEvt.dataTransfer = {
          getData: function(type) {
            return _this.dragData[type];
          }
        };
        snapBack = true;
        dropEvt.preventDefault = function() {
          snapBack = false;
          return _this.el.style['-webkit-transform'] = 'translate(0,0)';
        };
        once(document, 'drop', function() {
          if (snapBack) {
            return doSnapBack();
          }
        });
        parent = this.el.parentNode;
        replacementFn = (next = this.el.nextSibling) ? function() {
          return parent.insertBefore(_this.el, next);
        } : function() {
          return parent.appendChild(_this.el);
        };
        parent.removeChild(this.el);
        replacementFn();
        return target.dispatchEvent(dropEvt);
      } else {
        return doSnapBack();
      }
    };

    return DragDrop;

  })();

  getEls = function(el, selector) {
    var _ref;
    if (!selector) {
      _ref = [document, el], el = _ref[0], selector = _ref[1];
    }
    return [].slice.call(el).querySelectorAll(selector);
  };

  dragstart = function(evt, el) {
    evt.preventDefault();
    return new DragDrop(evt, el);
  };

  parents = function(el) {
    var parent, _results;
    _results = [];
    while ((parent = el.parentNode) && parent !== document.body) {
      _results.push(el = parent);
    }
    return _results;
  };

  document.addEventListener('touchstart', handler = function(evt) {
    var el, _i, _len, _ref;
    _ref = [evt.target].concat(parents(evt.target));
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      el = _ref[_i];
      if (el !== document && el.hasAttribute('draggable')) {
        evt.preventDefault();
        return dragstart(evt, el);
      }
    }
    return null;
  });

}).call(this);
