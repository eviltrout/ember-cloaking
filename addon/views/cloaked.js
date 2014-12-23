import Ember from "ember";

/**
 A cloaked view is one that removes its content when scrolled off the screen

 @class CloakedView
 @extends Ember.View
 @namespace Ember
 **/
export default Ember.View.extend({
  attributeBindings: ['style'],

  _containedView : null,
  _scheduled : null,

  init : function () {
    this._super();
    this._scheduled = false;
    this._childViews = [];
  },

  setContainedView : function (cv) {
    if (this._childViews[0]) {
      this._childViews[0].destroy();
      this._childViews[0] = cv;
    }

    if (cv) {
      cv.set('_parentView', this);
      cv.set('templateData', this.get('templateData'));
      this._childViews[0] = cv;
    } else {
      this._childViews.clear();
    }

    if (this._scheduled) return;

    this._scheduled = true;
    this.set('_containedView', cv);
    Ember.run.schedule('render', this, this.updateChildView);
  },

  render : function (buffer) {
    var el = buffer.element();
    this._childViewsMorph = buffer.dom.createMorph(el, null, null, el);
  },

  updateChildView : function () {
    this._scheduled = false;
    if (!this._elementCreated || this.isDestroying || this.isDestroyed) { return; }

    var childView = this._containedView;
    if (childView && !childView._elementCreated) {
      this._renderer.renderTree(childView, this, 0);
    }
  },

  /**
   Triggers the set up for rendering a view that is cloaked.

   @method uncloak
   */
  uncloak: function() {
    var state = this._state || this.state;
    if (state !== 'inDOM' && state !== 'preRender') { return; }

    if (!this._containedView) {
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

      this.setContainedView(this.createChildView(this.get('cloaks'), createArgs));
    }
  },

  /**
   Removes the view from the DOM and tears down all observers.

   @method cloak
   */
  cloak: function() {
    var self = this;

    if (this._containedView && (this._state || this.state) === 'inDOM') {
      var style = 'height: ' + this.$().height() + 'px;';
      this.set('style', style);
      this.$().prop('style', style);

      // We need to remove the container after the height of the element has taken
      // effect.
      Ember.run.schedule('afterRender', function() {
        self.setContainedView(null);
      });
    }
  },

  _setHeights: function(){
    if (!this._containedView) {
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
  }.on('didInsertElement')
});
