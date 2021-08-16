import { Selector } from 'testcafe';

export default class NewItemForm {
  constructor() {
    this.inputs = {
      name: Selector('input[name="item[details][en][name]"]'),
      description: Selector('textarea[name="item[details][en][description]"]'),
      price: Selector('input[name="item[price]"]'),
      quantity: Selector('input[name="item[quantity]"]')
    }
    this.buttons = {
      browseImages: Selector('button').withText('browse your computer'),
      submit: Selector('button').withText('Save'),
      createOrganization: Selector('button').withText('Create organization')
    }
  }
}
