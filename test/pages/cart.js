import { Selector } from 'testcafe';

export default class Cart {
  constructor() {
    this.product = Selector('section[data-tc="cart-product"]')
    this.productQuantity = Selector('input[data-tc="cart-product-quantity"]')
    this.buttons = {
      checkout: Selector('button').withText('Checkout')
    }
  }
}
