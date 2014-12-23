import Ember from "ember";
import CloakedCollectionView from "../views/cloaked-collection";

export default function cloakedCollectionHelper(options) {
  var hash = options.hash,
      types = options.hashTypes;

  for (var prop in hash) {
    if (types[prop] === 'ID') {
      hash[prop + 'Binding'] = hash[prop];
      delete hash[prop];
    }
  }
  return Ember.Handlebars.helpers.view.call(this, CloakedCollectionView, options);
};
