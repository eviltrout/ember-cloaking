import Ember from "ember";

/**
 A cloaked view is one that removes its content when scrolled off the screen

 @class CloakedView
 @extends Ember.View
 @namespace Ember
 **/
export default Ember.ContainerView.extend({
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
