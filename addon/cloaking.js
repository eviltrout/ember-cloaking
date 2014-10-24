import Ember from "ember";

  /**
   Display a list of cloaked items

   @class CloakedCollectionView
   @extends Ember.CollectionView
   @namespace Ember
   **/
  var CloakedCollectionView = Ember.CollectionView.extend({
    cloakView: Ember.computed.alias('itemViewClass'),
    topVisible: null,
    bottomVisible: null,
    offsetFixedTopElement: null,
    offsetFixedBottomElement: null,
    loadingHTML: 'Loading...',
    _scrollDebounce: 10,
    _scrollSelector: window,

    init: function() {
      var cloakView = this.get('cloakView'),
        idProperty = this.get('idProperty'),
        uncloakDefault = !!this.get('uncloakDefault');

      // Set the slack ratio differently to allow for more or less slack in preloading
      var slackRatio = parseFloat(this.get('slackRatio'));
      if (!slackRatio) { this.set('slackRatio', 1.0); }

      this.set('itemViewClass', Ember.CloakedView.extend({
        classNames: [cloakView + '-cloak'],
        cloaks: cloakView,
        preservesContext: this.get('preservesContext') === 'true',
        cloaksController: this.get('itemController'),
        defaultHeight: this.get('defaultHeight'),

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
    _topVisibleChanged: Ember.observer('topVisible', function() {
      var controller = this.get('controller');
      if (controller.topVisibleChanged) { controller.topVisibleChanged(this.get('topVisible')); }
    }),

    /**
     If the bottommost visible view changed, we will notify the controller if it has an appropriate hook.

     @method _bottomVisible
     @observes bottomVisible
     **/
    _bottomVisible: Ember.observer('bottomVisible', function() {
      var controller = this.get('controller');
      if (controller.bottomVisibleChanged) { controller.bottomVisibleChanged(this.get('bottomVisible')); }
    }),

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

      var wrapperTop = this.get('wrapperTop')>>0;

      while(max>min){
        var mid = Math.floor((min + max) / 2),
        // in case of not full-window scrolling
          $view = childViews[mid].$(),
          viewBottom = $view.position().top + wrapperTop + $view.height();

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
        // in case of not full-window scrolling
          scrollOffset = this.get('wrapperTop') || 0,
          viewTop = $view.offset().top + scrollOffset,
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
          Em.run.schedule('afterRender', function() {
            controller.sawObjects(onscreen);
          });
        }
      } else {
        this.setProperties({topVisible: null, bottomVisible: null});
      }

      var toCloak = childViews.slice(0, topView).concat(childViews.slice(bottomView+1));

      this._uncloak = toUncloak;
      if(this._nextUncloak){
        Em.run.cancel(this._nextUncloak);
        this._nextUncloak = null;
      }

      Em.run.schedule('afterRender', this, function() {
        onscreenCloaks.forEach(function (v) {
          if(v && v.uncloak) {
            v.uncloak();
          }
        });
        toCloak.forEach(function (v) { v.cloak(); });
        if (self._nextUncloak) { Em.run.cancel(self._nextUncloak); }
        self._nextUncloak = Em.run.later(self, self.uncloakQueue,50);
      });

      for (var j=bottomView; j<childViews.length; j++) {
        var checkView = childViews[j];
        if (!checkView.get('hasChildViews')) {
          if (!checkView.get('loading') && this.get('loadingHTML')) {
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
          if(view && view.uncloak && !view.get('hasChildViews')){
            Em.run.schedule('afterRender', view, view.uncloak);
            processed++;
          }
        }
        if(this._uncloak.length === 0){
          this._uncloak = null;
        } else {
          Em.run.schedule('afterRender', self, function(){
            if(self._nextUncloak){
              Em.run.cancel(self._nextUncloak);
            }
            self._nextUncloak = Em.run.next(self, function(){
              if(self._nextUncloak){
                Em.run.cancel(self._nextUncloak);
              }
              self._nextUncloak = Em.run.later(self,self.uncloakQueue,delay);
            });
          });
        }
      }
    },

    scrollTriggered: function() {
      Em.run.scheduleOnce('afterRender', this, 'scrolled');
    },

    _startEvents: Ember.on('didInsertElement', function() {

      if (this.get('offsetFixed')) {
        Em.warn("Cloaked-collection's `offsetFixed` is deprecated. Use `offsetFixedTop` instead.");
      }

      var self = this,
        offsetFixedTop = this.get('offsetFixedTop') || this.get('offsetFixed'),
        offsetFixedBottom = this.get('offsetFixedBottom'),
        onScrollMethod = function() {
          Ember.run.debounce(self, 'scrollTriggered', self._scrollDebounce);
        };

      if (offsetFixedTop) {
        this.set('offsetFixedTopElement', Ember.$(offsetFixedTop));
      }

      if (offsetFixedBottom) {
        this.set('offsetFixedBottomElement', Ember.$(offsetFixedBottom));
      }

      _scrollSelector = this.get("_scrollSelector");
      Ember.$(_scrollSelector).bind('touchmove.ember-cloak', onScrollMethod);
      Ember.$(_scrollSelector).bind('scroll.ember-cloak', onScrollMethod);
      this.addObserver('wrapperTop', self, onScrollMethod);
      this.addObserver('wrapperHeight', self, onScrollMethod);
      this.addObserver('content.@each', self, onScrollMethod);
      this.scrollTriggered();

      this.set('scrollingEnabled', true);
    }),

    cleanUp: function() {
      _scrollSelector = this.get("_scrollSelector");
      Ember.$(_scrollSelector).unbind('touchmove.ember-cloak');
      Ember.$(_scrollSelector).unbind('scroll.ember-cloak');
      this.set('scrollingEnabled', false);
    },

    _endEvents: Ember.on('willDestroyElement', function() {
      this.cleanUp();
    })
  });


  /**
   A cloaked view is one that removes its content when scrolled off the screen

   @class CloakedView
   @extends Ember.View
   @namespace Ember
   **/
  var CloakedView = Ember.ContainerView.extend({
    attributeBindings: ['style'],
    hasChildViews: Ember.computed.alias('childViews.length'),

    /**
     Triggers the set up for rendering a view that is cloaked.

     @method uncloak
     */
    uncloak: function() {
      var state = this._state || this.state;
      if (state !== 'inDOM' && state !== 'preRender') { return; }

      if (!this.get('hasChildViews')) {
        var model = this.get('content'),
          controller = null,
          container = this.get('container');

        // Wire up the itemController if necessary
        var controllerName = this.get('cloaksController');
        if (controllerName) {
          var controllerFullName = 'controller:' + controllerName,
            factory = container.lookupFactory(controllerFullName),
            parentController = this.get('controller');

          // let ember generate controller if needed
          if (factory === undefined) {
            factory = Ember.generateControllerFactory(container, controllerName, model);

            // inform developer about typo
            Ember.Logger.warn('ember-cloaking: can\'t lookup controller by name "' + controllerFullName + '".');
            Ember.Logger.warn('ember-cloaking: using ' + factory.toString() + '.');
          }

          controller = factory.create({
            model: model,
            parentController: parentController,
            target: parentController
          });
        }

        var createArgs = {},
          target = controller || model;

        if (this.get('preservesContext')) {
          createArgs.content = target;
        } else {
          createArgs.context = target;
        }
        if (controller) { createArgs.controller = controller; }
        this.setProperties({
          style: null,
          loading: false
        });

        this.pushObject(this.createChildView(this.get('cloaks'), createArgs))
        this.rerender();
      }
    },

    /**
     Removes the view from the DOM and tears down all observers.

     @method cloak
     */
    cloak: function() {
      var self = this;

      if (this.get('hasChildViews') && (this._state || this.state) === 'inDOM') {
        var style = 'height: ' + this.$().height() + 'px;';
        this.set('style', style);
        this.$().prop('style', style);

        // We need to remove the container after the height of the element has taken
        // effect.
        Ember.run.schedule('afterRender', function() {
          self.get('childViews').forEach(function(view) {
            self.removeObject(view);
            view.remove();
          });
        });
      }
    },

    _setHeights: Ember.on('didInsertElement', function(){
      if (!this.get('hasChildViews')) {
        // setting default height
        // but do not touch if height already defined
        if(!this.$().height()){
          var defaultHeight = 100;
          if(this.get('defaultHeight')) {
            defaultHeight = this.get('defaultHeight');
          }

          this.$().css('height', defaultHeight);
        }
      }
    })
  });



  Ember.Handlebars.registerHelper('cloaked-collection', function(options) {
    var hash = options.hash,
      types = options.hashTypes;

    for (var prop in hash) {
      if (types[prop] === 'ID') {
        hash[prop + 'Binding'] = hash[prop];
        delete hash[prop];
      }
    }
    return Ember.Handlebars.helpers.view.call(this, Ember.CloakedCollectionView, options);
  });

export {
    CloakedCollectionView,
    CloakedView
  };
