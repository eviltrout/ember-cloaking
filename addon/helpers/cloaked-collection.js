import Ember from "ember";
import CloakedCollectionView from "../views/cloaked-collection";

var isHTMLBars = !!Ember.HTMLBars;

function handlebarsHelper(options) {
  return Ember.Handlebars.helpers.view.call(this, CloakedCollectionView, options);
}

function htmlbarsHelper(params, hash, options, env) {
  env.helpers.view.helperFunction.call(this, [CloakedCollectionView], hash, options, env);
}

function makeHelper() {

  if (isHTMLBars) {
    return {
      isHTMLBars: true,
      helperFunction: htmlbarsHelper,
      preprocessArguments: function() {}
    };
  } else {
    return handlebarsHelper;
  }
}

export default makeHelper();
