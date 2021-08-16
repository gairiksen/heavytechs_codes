/*
  handles quick search behavior in the header
*/



// purpose:		focuses the search bar when popup opened
// ************************************************************************
const quickSearch = new function(){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // the input for the quick search (dom node)
  module.settings.input = document.querySelector('[data-dropdown-content] input[name="qkeyword"]');



  // purpose:		initializes the component
  // ------------------------------------------------------------------------
  module.init = () => {
    document.addEventListener('popup-quickSearch-opened', () => {
      module.settings.input.focus();
    });
  };


  module.init();
};