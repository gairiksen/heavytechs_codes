/*
  handles shopping cart
*/


// imports
// ------------------------------------------------------------------------
import apiFetch from './apiFetch';



// purpose:		reloads the prices in the shopping cart based on json endpoints
// ************************************************************************
const cart = function(){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // main container for the cart (dom node)
  module.settings.container = document.querySelector('[data-cart]');
  // selector for the line item (string)
  module.settings.lineItem = '[data-lineitem]';
  // the name of the attribute that will store the id of the item (string)
  module.settings.itemIdAttr = 'data-lineitem-id';
  // the name of the attribute that will store the seller id (string)
  module.settings.sellerIdAttr = 'data-lineitem-sellerid';
  // selector for the seller name row (string)
  module.settings.sellerNameSelector = '[data-lineitem-seller]';
  // selector for single unit price (string)
  module.settings.unitPriceSelector = '[data-lineitem-unitprice]';
  // selector for quantity input (string)
  module.settings.quantityInputSelector = '[data-lineitem-quantity]';
  // selector for total price (string)
  module.settings.totalPriceSelector = '[data-lineitem-totalprice]';
  // selector for the remove button (string)
  module.settings.removeSelector = '[data-lineitem-remove]';
  // selector for the error field (string)
  module.settings.errorFieldSelector = '[data-lineitem-errors]';
  // total value of the whole transaction (dom node)
  module.settings.total = document.querySelector('[data-total]');
  // the checkout button (dom node)
  module.settings.submit = document.querySelector('[data-cart-checkout]');
  // cart empty state container (dom node)
  module.settings.empty = document.querySelector('[data-cart-empty]');
  // summary box (dom node)
  module.settings.summary = document.querySelector('[data-cart-summary]');
  // loading indicator for the cart (dom node)
  module.settings.loading = document.querySelector('[data-cart-loading]');



  // purpose:		initializes the component
  // returns:   events 'cart-changed' and 'cart-lineItem-changed'
  // ------------------------------------------------------------------------
  module.init = () => {

    // remove item
    module.settings.container.addEventListener('click', (event) => {
      if(event.target.matches(module.settings.removeSelector)){
        let id = event.target.closest(module.settings.lineItem).getAttribute(module.settings.itemIdAttr);

        module.removeItem(id);
      }
    });


    // change quantity
    let quantityChangeTimeout;

    const updateLineItemTotalPrice = (event) => {
      if(event.target.matches(module.settings.quantityInputSelector)){
        clearTimeout(quantityChangeTimeout);

        // disable checkout button
        module.settings.submit.disabled = true;
        module.settings.loading.classList.add('card-overlay');
        module.settings.loading.classList.remove('hidden');

        quantityChangeTimeout = setTimeout(() => {
          let id = event.target.closest(module.settings.lineItem).getAttribute(module.settings.itemIdAttr);

          module.calculateItemTotalPrice(id, event.target.value);
        }, 400);
      }
    }

    module.settings.container.addEventListener('input', (event) => {
      updateLineItemTotalPrice(event);
    });


    // change the total sum
    let updateTotalTimeout;

    document.addEventListener('cart-lineItems-changed', () => {
      clearTimeout(updateTotalTimeout);

      updateTotalTimeout = setTimeout(() => {
        module.updateTotal();
      }, 200);
    });


    // enable the checkout button after everything was counted
    document.addEventListener('cart-changed', () => {
      module.settings.submit.disabled = false;
      module.settings.loading.classList.add('hidden');
      module.settings.loading.classList.remove('card-overlay');
    });


    // reload page if the cart is empty
    document.addEventListener('cart-changed', (event) => {
      if(!event.detail.total_quantity){
        module.settings.container.remove();
        module.settings.summary.remove();
        module.settings.empty.classList.remove('hidden');
      }
    });

  };


  // purpose:		removes the item of given id
  // arguments: the id of the line item to remove (int)
  // returns:   triggers 'cart-lineItems-changed' event
  // ------------------------------------------------------------------------
  module.removeItem = (id) => {

    // disable checkout button
    module.settings.submit.disabled = true;
    module.settings.loading.classList.remove('hidden');

    apiFetch('/api/line_items/delete', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    }).then((result) => {
      if(result.valid){

        let item = module.settings.container.querySelector(`[${module.settings.itemIdAttr}="${id}"]`);
        let sellerId = item.getAttribute(module.settings.sellerIdAttr);

        // remove the item from the list
        item.remove();

        // remove the seller name if there is no other items from him
        let itemsFromSeller = module.settings.container.querySelectorAll(`${module.settings.lineItem}[${module.settings.sellerIdAttr}="${sellerId}"]`);

        if(itemsFromSeller.length === 0){
          module.settings.container.querySelector(`${module.settings.sellerNameSelector}[${module.settings.sellerIdAttr}="${sellerId}"]`).remove();
        }

        // trigger an event
        document.dispatchEvent(new CustomEvent('cart-lineItems-changed'));

      }
    });

  };


  // purpose:		changes the total price of line item based on quantity
  // arguments: id of line item (int)
  //            quantity of line item (int)
  // returns:   triggers 'cart-lineItems-changed' event
  // ------------------------------------------------------------------------
  module.calculateItemTotalPrice = (id, quantity) => {

    const item = module.settings.container.querySelector(`[${module.settings.itemIdAttr}="${id}"]`);
    const quantityInput = item.querySelector(`${module.settings.quantityInputSelector}`);
    const errorField = module.settings.container.querySelector(`${module.settings.errorFieldSelector}[${module.settings.itemIdAttr}="${id}"]`);

    // purpose:   toggles the error for given quantity
    const quantityWarning = {
      show: () => {
        quantityInput.classList.add('border-danger');
        errorField.innerText = api.strings.quantityExceeded;
        module.settings.loading.classList.add('hidden');
        module.settings.loading.classList.remove('card-overlay');
        module.settings.summary.classList.add('text-danger');
      },

      hide: () => {
        quantityInput.classList.remove('border-danger');
        errorField.innerText = '';
        module.settings.summary.classList.remove('text-danger');
      }
    }

    // purpose:   updates the total price to given one
    // arguments: the value to set (string)
    const updateItemTotal = (price) => {
      item.querySelector(module.settings.totalPriceSelector).innerText = price;
    }

    // purpose:   updates the total price to given one
    // arguments: the value to set (string)
    const sendRequest = () => apiFetch('/api/line_items/update', {
      method: 'PUT',
      body: JSON.stringify({ id, line_item: { quantity } })
    }).then((result) => {

      if(result.errors){
        quantityWarning.show();
      } else {
        quantityWarning.hide();
        updateItemTotal(result.total_price);

        // trigger an event
        document.dispatchEvent(new CustomEvent('cart-lineItems-changed'));
      }

    });

    // if quantity is in the limit then send info to endpoint, else show error
    if(quantity <= 0 || quantity > parseInt(quantityInput.getAttribute('max'))){
      quantityWarning.show();
    } else {
      quantityWarning.hide();
      sendRequest();
    }

  };


  // purpose:		changes the total values of given transaction based on the endpoint
  // returns:   triggers an event 'cart-changed'
  // ------------------------------------------------------------------------
  module.updateTotal = () => {

    // purpose:   gets information about current transaction
    apiFetch('/api/cart/show', {
      method: 'GET'
    }).then((result) => {
      module.settings.total.innerText = result.total;

      // trigger an event
      document.dispatchEvent(new CustomEvent('cart-changed', { detail: result }));
    });
  };


  module.init();

};

api.cart = new cart();



// purpose:		updates the shopping cart item counters
// ************************************************************************
const cartCounters = new function(){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // elements that holds the counter (dom nodes)
  module.settings.counters = document.querySelectorAll('[data-cart-counter]');
  // line items (dom nodes)
  module.settings.lineItems = document.querySelectorAll('[data-lineitem]');



  // purpose:		initializes the component
  // ------------------------------------------------------------------------
  module.init = () => {
    document.addEventListener('cart-changed', (event) => {
      module.settings.counters.forEach(element => {
        element.innerText = event.detail.total_quantity;
      });
    });
  }


  module.init();

};



// purpose:		moves the item from cart to wishlist
// arguments: the id of the item you want to move to wishlist (int)
// ************************************************************************
const cartToWishlist = new function(){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // the container of the whole page
  module.settings.container = document;
  // the selector for button that adds the line item to wishlist (string)
  module.settings.addToWishlist = '[data-lineItem-wishlist]';
  // the URL with the endpoint do add wishlist items (string)
  module.settings.endpoint = '/api/relationships/create.json';
  // the wishlist icon in header (dom node)
  module.settings.headerIcon = document.querySelector('[data-header-wishlist] [data-icon="heartFull"]');



  // purpose:		initializes the component
  // ------------------------------------------------------------------------
  module.init = () => {

    // react to clicking the button
    module.settings.container.addEventListener('click', (event) => {
      if(event.target.matches(module.settings.addToWishlist)){
        // disable the button not to be clicked twice
        event.target.disabled = true;
        event.target.innerText = api.strings.saving;

        module.moveToWishlist(event.target.dataset.itemId, event.target.dataset.lineitemId);
      }
    });

    // remove the class from header icon to be able to restart the animation
    module.settings.headerIcon.addEventListener('animationend', () => {
      module.settings.headerIcon.classList.remove('wishlist-added');
    });

  };


  // purpose:		adds the item to wishlist and removes it from cart
  // arguments: the id of the item to move (string),
  //            the id of the line item to remove from cart (string)
  // ------------------------------------------------------------------------
  module.moveToWishlist = (itemId, lineItemId) => {

    let data = {
      name: 'wishlist',
      l_id: api.profile.id.toString(),
      r_id: itemId
    };

    apiFetch(module.settings.endpoint, {body: JSON.stringify(data)}).then(response => {
      if(response.valid){
        module.settings.headerIcon.classList.add('wishlist-added');
        api.cart.removeItem(lineItemId);
        new api.flash('success', api.strings.addedToWishlist);
      } else {
        new api.flash('error', api.strings.cantAddToWishlist);
      }
    });

  };


  module.init();

};
