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

`defaultHeight` is the height of the cloaked views by default. You should pick a value that is in the ballpark of
your average view height. Note: Your views don't have to be the same height.

`content` is the collection of items to display.

`loadingHTML` is the HTML you want to render while the cloaking is loading. If omitted it will default to "Loading..."

iScroll or other scrollers
--------------------------
[Demo](/demos/iscroll.html)

```handlebars
  {{cloaked-collection cloakView="item" content=model wrapperTopBinding="view.scrollTop" wrapperHeightBinding="view.height"}}
```

`wrapperTop` is the current scroll position like native [element.scrollTop](https://developer.mozilla.org/en-US/docs/Web/API/Element.scrollTop)

`wrapperHeight` is the height of the "window" in which content scrolling


License
=======
MIT
