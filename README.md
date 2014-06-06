ember-cloaking
==============

Support for not rendering offscreen views in an Ember app for performance and
lowered memory usage.

Extracted from [Discourse](https://github.com/discourse/discourse)'s infinite scrolling.

Usage
=====

1. Include `ember-cloaking.js` in your project.
2. To display a collection of cloaked items, use `{{cloaked-collection}}` in your handlebars templates like this:

```handlebars
  {{cloaked-collection cloakView="post" content=postStream.posts}}
```

`cloakView` is the name of the view to render in the collection. `post` would render `PostView`.

`content` is the collection of items to display.

###Optional parameters

####itemController
Default: `undefined` (not controller will be used)

Name of the controller for items in collection.


####defaultHeight
Default: `100` 

Height of the cloaked views by default. You should pick a value that is in the ballpark of
your average view height.


####loadingHTML
Default: `"Loading..."`

HTML you want to render while the cloaking is loading.


####preservesContext
Default: `false`

Set to "true" if you want to use `content.xyz` in your views instead of the `context`.


####idProperty
Default: `undefined`

Name of item's property to generate cloaked view DOM id. If set `id` will be generated using `cloakView` like so: `{{cloakView}}-cloak-{{item.idProperty}}`. Check out [demo](/demos/iscroll.html)


####offsetFixedTop
Default: `undefined`

jQuery selector that will be used to offset the top of what is considered onscreen. Discourse uses this for example because we have a `position: fixed; top: 0` header that is on top of content.

####offsetFixedBottom
Default: `undefined`

jQuery selector that will be used to offset the bottom of what is considered onscreen. Discourse uses this for example because we have a `position: fixed; bottom: 0` composer that is on top of content.


####wrapperTop
Default: `undefined`

Current scroll position like native [element.scrollTop](https://developer.mozilla.org/en-US/docs/Web/API/Element.scrollTop) (see [iScroll support](#iscroll-or-other-scrollers)).


####wrapperHeight
Default: `undefined`

Height of the "window" in which content is scrolling (see [iScroll support](#iscroll-or-other-scrollers)).


###uncloakDefault
Default: `false`

Whether or not to uncloak views by default when created. This is useful for sites like Discourse
that perform infinite scrolling upwards, and depend on inserting elements above the top fold.

iScroll or other scrollers
--------------------------

[Demo](/demos/iscroll.html)

```handlebars
  {{cloaked-collection cloakView="item" content=model wrapperTopBinding="view.scrollTop" wrapperHeightBinding="view.height"}}
```

`wrapperTop` is the current scroll position like native [element.scrollTop](https://developer.mozilla.org/en-US/docs/Web/API/Element.scrollTop)

`wrapperHeight` is the height of the "window" in which content scrolling

Callbacks
---------

You can add the following methods to the controller that contains the `{{cloaked-collection}}` to be notified when elements are onscreen:

`bottomVisibleChanged`: Called when the bottomost visible element changes
`topVisibleChanged`: Called when the topmost visible element changes

License
=======
[MIT](/LICENSE)
