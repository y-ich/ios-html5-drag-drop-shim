###
CoffeeScript porting of https://github.com/timruffles/ios-html5-drag-drop-shim
2013 (C) ICHIKAWA, Yuji
###

VERBOSE = 3
DEBUG = 2
INFO = 1
ERROR = 0
LOG_LEVEL = INFO

INLINE_TAGS = ['A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'CITE', 'CODE', 'DFN', 'EM', 'I', 'KBD', 'LABEL', 'Q', 'SAMP', 'SMALL', 'SPAN', 'STRONG', 'SUB',
 'SUP', 'TT', 'VAR']
doc = document
# default to a noop, remove it for debugging
noop = ->
log = noop || (msg,level=ERROR) ->
  console.log msg if level <= LOG_LEVEL

onEvt = (el, event, handler) ->
  el.addEventListener event, handler
  off: ->
    el.removeEventListener event, handler
once = (el,event,handler) ->
  el.addEventListener event, listener = (evt) ->
    handler(evt)
    el.removeEventListener event, listener
average = (arr) ->
  return 0 if arr.length == 0
  arr.reduce(((s,v) -> v+s), 0) / arr.length

class DragDrop
  constructor: (event,el = event.target) ->
    event.preventDefault()

    log "dragstart"
    @dragData = {}

    evt = doc.createEvent("Event")
    evt.initEvent "dragstart", true, true
    evt.dataTransfer =
      setData: (type, val) =>
        @dragData[type] = val
      dropEffect: "move"

    el.dispatchEvent evt

    cleanup = =>
      log "cleanup"
      @touchPositions = {}
      [ move, end, cancel ].forEach (handler) ->
        handler.off()

    @el = el

    if INLINE_TAGS.some((e) -> e is el.tagName) and el.style.display is ''
      el.style.display = 'inline-block'
      @inline = true

    @touchPositions = {}
    transform = @el.style["-webkit-transform"]
    # log "transform is: " + transform
    [x, y] = if match = /translate\(\s*(\d+)[^,]*,\D*(\d+)/.exec(transform)
      [parseInt(match[1]), parseInt(match[2])]
    else
      [0,0]
    # log "initial translate #{x} #{y}"
    @elTranslation =
      x: x
      y: y

    move = onEvt(doc, "touchmove", @move)
    end = onEvt doc, "touchend", (evt) =>
      @dragend(evt,event.target)
      cleanup()
    cancel = onEvt(doc, "touchcancel", cleanup)

  # dragend - need to implement it
  move: (event) =>
    log("dragmove",VERBOSE)
    deltas = [].slice.call(event.changedTouches).reduce (deltas,touch,index) =>
      position = @touchPositions[index]
      if position
        deltas.x.push touch.pageX - position.x
        deltas.y.push touch.pageY - position.y
      else
        @touchPositions[index] = position = {}
      position.x = touch.pageX
      position.y = touch.pageY
      # log "position now " + JSON.stringify position
      deltas
    , {x:[],y:[]}
    @elTranslation.x += average deltas.x
    @elTranslation.y += average deltas.y

    @el.style["-webkit-transform"] = "translate(#{@elTranslation.x}px,#{@elTranslation.y}px)"

  dragend: (event) =>
    log "dragend"

    # we'll dispatch drop if there's a target, then dragEnd. If drop isn't fired
    # or isn't cancelled, we'll snap back
    # drop comes first http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#drag-and-drop-processing-model

    doSnapBack = =>
      once @el, "webkitTransitionEnd", =>
        @el.style["-webkit-transition"] = "none"
        @el.style["display"] = "" if @inline

      setTimeout =>
        @el.style["-webkit-transition"] = "all 0.2s"
        @el.style["-webkit-transform"] = "translate(0,0)"

    target = doc.elementFromPoint(event.changedTouches[0].clientX,event.changedTouches[0].clientY)
    console.log target
    if target
      dropEvt = doc.createEvent "Event"
      dropEvt.initEvent "drop", true, true
      dropEvt.dataTransfer =
        getData: (type) =>
          @dragData[type]
      snapBack = true
      dropEvt.preventDefault = =>
        # https://www.w3.org/Bugs/Public/show_bug.cgi?id=14638 - if we don't cancel it, we're snapping back
        snapBack = false
        @el.style["-webkit-transform"] = "translate(0,0)"
      once doc, "drop", ->
        doSnapBack() if snapBack

      # dispatch event on drop target
      parent = @el.parentNode
      replacementFn = if next = @el.nextSibling
          => parent.insertBefore @el, next
        else
          => parent.appendChild @el
      parent.removeChild(@el)
      replacementFn()

      target.dispatchEvent(dropEvt)
    else
      once doc, "dragend", doSnapBack

    dragendEvt = doc.createEvent "Event"
    dragendEvt.initEvent "dragend", true, true
    @el.dispatchEvent dragendEvt

getEls = (el, selector) ->
  unless selector
    [el,selector] = [doc,el]
  [].slice.call (el).querySelectorAll(selector)

div = doc.createElement('div')
dragDiv = `'draggable' in div`
evts = `'ondragstart' in div && 'ondrop' in div`
needsPatch = !(dragDiv || evts) || /iPad|iPhone|iPod/.test(navigator.userAgent)
log("#{if needsPatch then "" else "not "}patching html5 drag drop")
return unless needsPatch

dragstart = (evt, el) ->
  evt.preventDefault()
  new DragDrop(evt, el)

parents = (el) ->
  while (parent = el.parentNode) && parent != doc.body
    el = parent
    parent

doc.addEventListener "touchstart", handler = (evt) ->
  for el in [evt.target].concat(parents(evt.target))
    if el isnt document and el.hasAttribute("draggable")
      evt.preventDefault()
      return dragstart(evt,el)
  null
