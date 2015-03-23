import Ember from "ember";
import CloakedView from "./cloaked";

/**
 Display a list of cloaked items

 @class CloakedCollectionView
 @extends Ember.CollectionView
 @namespace Ember
 **/
export default Ember.CollectionView.extend({

  cloakView: Ember.computed.alias('itemViewClass'),
  topVisible: null,
  bottomVisible: null,
  offsetFixedTopElement: null,
  offsetFixedBottomElement: null,
  loadingHTML: 'Loading...',
  scrollDebounce: 10,

  init: function() {
    var cloakView = this.get('cloakView'),
      idProperty = this.get('idProperty'),
      uncloakDefault = !!this.get('uncloakDefault'),
      defaultHeight = parseInt(this.get('defaultHeight'), 10),
      collectionTagName = (this.get('tagName') || '').toLowerCase(),
      itemTagName = this.get('itemTagName');

    if (!itemTagName) {
      itemTagName = (collectionTagName === 'tbody' || collectionTagName === 'table') ? 'tr' : 'div';
    }

    // Set the slack ratio differently to allow for more or less slack in preloading
    var slackRatio = parseFloat(this.get('slackRatio'));
    if (!slackRatio) { this.set('slackRatio', 1.0); }

    this.set('itemViewClass', CloakedView.extend({
      classNames: [cloakView + '-cloak', 'cloak-view'],
      tagName : itemTagName,
      cloaks: cloakView,
      preservesContext: this.get('preservesContext') === 'true',
      cloaksController: this.get('itemController'),
      defaultHeight: defaultHeight,

      init: function() {
        this._super();

        if (idProperty) {
          this.set('elementId', cloakView + '-cloak-' + this.get('content.' + idProperty));
        }
        if (uncloakDefault) {
          this.uncloak();
        } else {
          this.cloak();
        }
      }
    }));

    this._super();
    Ember.run.next(this, 'scrolled');
  },


  /**
   If the topmost visible view changed, we will notify the controller if it has an appropriate hook.

   @method _topVisibleChanged
   @observes topVisible
   **/
  _topVisibleChanged: function() {
    var controller = this.get('controller');
    if (controller.topVisibleChanged) { controller.topVisibleChanged(this.get('topVisible')); }
  }.observes('topVisible'),

  /**
   If the bottommost visible view changed, we will notify the controller if it has an appropriate hook.

   @method _bottomVisible
   @observes bottomVisible
   **/
  _bottomVisible: function() {
    var controller = this.get('controller');
    if (controller.bottomVisibleChanged) { controller.bottomVisibleChanged(this.get('bottomVisible')); }
  }.observes('bottomVisible'),

  /**
   Binary search for finding the topmost view on screen.

   @method findTopView
   @param {Array} childViews the childViews to search through
   @param {Number} windowTop The top of the viewport to search against
   @param {Number} min The minimum index to search through of the child views
   @param {Number} max The max index to search through of the child views
   @returns {Number} the index into childViews of the topmost view
   **/
  findTopView: function(childViews, viewportTop, min, max) {
    if (max < min) { return min; }

    while(max>min){
      var mid = Math.floor((min + max) / 2),
      // in case of not full-window scrolling
        $view = childViews[mid].$(),
        viewBottom = $view.position().top + $view.height();

      if (viewBottom > viewportTop) {
        max = mid-1;
      } else {
        min = mid+1;
      }
    }

    return min;
  },


  /**
   Determine what views are onscreen and cloak/uncloak them as necessary.

   @method scrolled
   **/
  scrolled: function() {
    if (!this.get('scrollingEnabled')) { return; }

    var childViews = this.get('childViews');
    if ((!childViews) || (childViews.length === 0)) { return; }

    var self = this,
      toUncloak = [],
      onscreen = [],
      onscreenCloaks = [],
    // calculating viewport edges
      $w = Ember.$(window),
      windowHeight = this.get('wrapperHeight') || ( window.innerHeight ? window.innerHeight : $w.height() ),
      windowTop = this.get('wrapperTop') || $w.scrollTop(),
      slack = Math.round(windowHeight * this.get('slackRatio')),
      viewportTop = windowTop - slack,
      windowBottom = windowTop + windowHeight,
      viewportBottom = windowBottom + slack,
      topView = this.findTopView(childViews, viewportTop, 0, childViews.length-1),
      bodyHeight = this.get('wrapperHeight') ? this.$().height() : Ember.$('body').height(),
      bottomView = topView,
      offsetFixedTopElement = this.get('offsetFixedTopElement'),
      offsetFixedBottomElement = this.get('offsetFixedBottomElement');

    if (windowBottom > bodyHeight) { windowBottom = bodyHeight; }
    if (viewportBottom > bodyHeight) { viewportBottom = bodyHeight; }

    if (offsetFixedTopElement) {
      windowTop += (offsetFixedTopElement.outerHeight(true) || 0);
    }

    if (offsetFixedBottomElement) {
      windowBottom -= (offsetFixedBottomElement.outerHeight(true) || 0);
    }

    // Find the bottom view and what's onscreen
    while (bottomView < childViews.length) {
      var view = childViews[bottomView],
        $view = view.$(),
        viewTop = $view.position().top,
        viewBottom = viewTop + $view.height();

      if (viewTop > viewportBottom) { break; }
      toUncloak.push(view);

      if (viewBottom > windowTop && viewTop <= windowBottom) {
        onscreen.push(view.get('content'));
        onscreenCloaks.push(view);
      }

      bottomView++;
    }
    if (bottomView >= childViews.length) { bottomView = childViews.length - 1; }

    // If our controller has a `sawObjects` method, pass the on screen objects to it.
    var controller = this.get('controller');
    if (onscreen.length) {
      this.setProperties({topVisible: onscreen[0], bottomVisible: onscreen[onscreen.length-1]});
      if (controller && controller.sawObjects) {
        Ember.run.schedule('afterRender', function() {
          controller.sawObjects(onscreen);
        });
      }
    } else {
      this.setProperties({topVisible: null, bottomVisible: null});
    }

    var toCloak = childViews.slice(0, topView).concat(childViews.slice(bottomView+1));

    this._uncloak = toUncloak;
    if(this._nextUncloak){
      Ember.run.cancel(this._nextUncloak);
      this._nextUncloak = null;
    }

    Ember.run.schedule('afterRender', this, function() {
      onscreenCloaks.forEach(function (v) {
        if(v && v.uncloak) {
          v.uncloak();
        }
      });
      toCloak.forEach(function (v) { v.cloak(); });
      if (self._nextUncloak) { Ember.run.cancel(self._nextUncloak); }
      self._nextUncloak = Ember.run.later(self, self.uncloakQueue,50);
    });

    for (var j=bottomView; j<childViews.length; j++) {
      var checkView = childViews[j];
      if (!checkView._containedView) {
        if (!checkView.get('loading')) {
          checkView.$().html(this.get('loadingHTML'));
        }
        return;
      }
    }

  },

  uncloakQueue: function(){
    var maxPerRun = 3, delay = 50, processed = 0, self = this;

    if(this._uncloak){
      while(processed < maxPerRun && this._uncloak.length>0){
        var view = this._uncloak.shift();
        if(view && view.uncloak && !view._containedView){
          Ember.run.schedule('afterRender', view, view.uncloak);
          processed++;
        }
      }
      if(this._uncloak.length === 0){
        this._uncloak = null;
      } else {
        Ember.run.schedule('afterRender', self, function(){
          if(self._nextUncloak){
            Ember.run.cancel(self._nextUncloak);
          }
          self._nextUncloak = Ember.run.next(self, function(){
            if(self._nextUncloak){
              Ember.run.cancel(self._nextUncloak);
            }
            self._nextUncloak = Ember.run.later(self,self.uncloakQueue,delay);
          });
        });
      }
    }
  },

  scrollTriggered: function() {
    Ember.run.scheduleOnce('afterRender', this, 'scrolled');
  },

  _startEvents: function() {

    if (this.get('offsetFixed')) {
      Ember.warn("Cloaked-collection's `offsetFixed` is deprecated. Use `offsetFixedTop` instead.");
    }

    var self = this,
      id = this.get('elementId'),
      offsetFixedTop = this.get('offsetFixedTop') || this.get('offsetFixed'),
      offsetFixedBottom = this.get('offsetFixedBottom'),
      scrollDebounce = this.get('scrollDebounce'),
      scrollSelector = this.get('scrollSelector'),
      onScrollMethod = function(e) {
        Ember.run.debounce(self, 'scrollTriggered', scrollDebounce);
      };

    if (offsetFixedTop) {
      this.set('offsetFixedTopElement', Ember.$(offsetFixedTop));
    }

    if (offsetFixedBottom) {
      this.set('offsetFixedBottomElement', Ember.$(offsetFixedBottom));
    }

    if (scrollSelector) {
      Ember.$(scrollSelector).bind('scroll.ember-cloak.' + id, onScrollMethod);
      Ember.$(scrollSelector).bind('touchmove.ember-cloak.' + id, onScrollMethod);
    } else {
      Ember.$(document).bind('touchmove.ember-cloak.' + id, onScrollMethod);
      Ember.$(window).bind('scroll.ember-cloak.' + id, onScrollMethod);
    }

    this.addObserver('wrapperTop', self, onScrollMethod);
    this.addObserver('wrapperHeight', self, onScrollMethod);
    this.addObserver('content.@each', self, onScrollMethod);
    this.scrollTriggered();

    this.set('scrollingEnabled', true);

  }.on('didInsertElement'),

  cleanUp: function() {

    var scrollSelector = this.get('scrollSelector'),
      id = this.get('elementId');

    if (scrollSelector) {
      Ember.$(scrollSelector).unbind('scroll.ember-cloak.' + id);
      Ember.$(scrollSelector).unbind('touchmove.ember-cloak.' + id);
    } else {
      Ember.$(document).unbind('touchmove.ember-cloak.' + id);
      Ember.$(window).unbind('scroll.ember-cloak.' + id);
    }
    this.set('scrollingEnabled', false);
  },

  _endEvents: function() {
    this.cleanUp();
  }.on('willDestroyElement')
});
