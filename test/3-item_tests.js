import { Selector, ClientFunction, t } from 'testcafe'
import { buyerRole, sellerRole, merchantRole, randomPersonRole } from './pages/roles'
import {
  John,
  SellerRandomUser,
  myUrl,
  item,
  editedItem,
  link,
  itemShow,
  editedItemShow,
  newItemForm,
  topMenu,
  itemSearch,
  dashboard,
  orders,
  publicProfile,
  permissionDenied,
  Anon,
  SellerMerchant,
  SellerMerchantA,
  getURL,
  cartPage,
  loginForm,
  soldOrders
} from './pages/fixtures'
import { register, createItem, checkErrors, waitForSelector } from './pages/helper'

fixture`Item tests`.page(myUrl)


test('Creating item', async (t) => {
  await t.useRole(randomPersonRole)

  await t.navigateTo(myUrl + '/dashboard/sell/items')
  await t.click(newItemForm.buttons.createOrganization)

  await createItem(item.name, item.description, item.price)
  //checks if all data is correct
  await
    checkErrors()

  await t.expect(itemShow.fields.name.exists).ok()

  await t.expect(itemShow.fields.description.exists).ok()

  await t
    .expect(itemShow.fields.price.innerText)
    .eql('$10,000', 'check item\'s price')

  await t.expect(itemShow.fields.displayImage).ok()

  var editItemUrl = await Selector('a')
    .withText('Edit Item')
    .getAttribute('href')

  await t
    .navigateTo(myUrl + '/dashboard/sell/items')

  await waitForSelector(Selector('#data-breadcrumb-header').withText('Inventory (1)'))
  await t.expect(Selector('section.table ul').count).eql(1)
    .expect(Selector('section.table ul > li').withText(item.name).exists).ok()

  // Break-in test
  await t.useRole(merchantRole)
  await t.navigateTo(myUrl + editItemUrl)

  await t.expect(Selector('div').withText(permissionDenied).exists).ok()
})

test('Editing item and search', async (t) => {
  await t
  //item search
    .useRole(randomPersonRole)
  await t
    .typeText(itemSearch.quickSearch.keyword, item.name)
    .click(itemSearch.buttons.quickSearch)
    .click(itemSearch.links.item)


  //change of item information
  await t.click(itemShow.buttons.edit)

  await
    checkErrors()
  await t.typeText(newItemForm.inputs.name, editedItem.name, { replace: true })
  await t.typeText(newItemForm.inputs.description, editedItem.description, {
    replace: true,
  })
  await t.typeText(newItemForm.inputs.price, editedItem.price, {
    replace: true,
  })
  await t.click(newItemForm.buttons.submit)

  await t.expect(editedItemShow.fields.name.exists).ok()
  await t.expect(editedItemShow.fields.description.exists).ok()
  await t
    .expect(editedItemShow.fields.editedPrice.innerText)
    .eql('$5,000', 'check item\'s price')
})

test('Delete created item', async (t) => {
  await t
    .useRole(randomPersonRole)
    .click(topMenu.buttons.profileDropdown)
    .click(topMenu.buttons.selling)
  await
    checkErrors()
  await t.setNativeDialogHandler(() => true).click(itemShow.buttons.delete)

  //after fix write tests here to ensure item is correctly deleted
})

test('Creating new item for sell', async (t) => {
  await t.useRole(merchantRole)
  await createItem(item.commonName, item.description, item.price)
})

test.page(myUrl +"/search?keyword=Aries Gold G 729 S-BK&category=&sort_by=relevance&submit=search")('Cart', async (t) => {
  await t.click(itemSearch.results.seededAvailableItem)
    .click(itemShow.buttons.buy)
    .typeText(Selector('input[name="line_item[quantity]"]'), "2", { replace: true })

  const orderTotalPrice = (Selector('ul').find('#data-order-totalprice').innerText)

  await t.expect(Selector('#data-item-totalprice').innerText).eql(await orderTotalPrice)

  await
    checkErrors()
  await t.click(orders.buttons.removeFromCart)
  await t.wait(500)

  await t.expect(Selector('div p').withText('There are no items in your cart').exists).ok()
  await t.expect(Selector('p a').withText('Browse products').exists).ok()
  await t.expect(Selector('h2').withText('My Cart (0)').exists).ok()
  // later add some expect for empty cart
})

test('Buying two items by registered user', async (t) => {
  await t
    .useRole(buyerRole)

    .typeText(itemSearch.quickSearch.keyword, item.commonName)

    .click(itemSearch.buttons.quickSearch)

    .expect(itemSearch.links.commonItem.exists)
    .ok()

    .click(itemSearch.links.commonItem)

  await
      await t
    .click(itemShow.buttons.buy)
  await checkErrors()
  await t.click(orders.buttons.checkout)
  await t.typeText(orders.inputs.phone, '123456')
  await t
    .click(orders.labels.homeDelivery)
    .typeText('#address_full_name', 'Address')
    .typeText('#address_country', 'Country')
    .typeText('#address_city', 'City')
    .typeText('#address_state', 'State')
    .typeText('#address_zip', 'zip')
    .typeText('#address_street', 'street')
    .typeText('#address_building_number', '12')
    .typeText('#address_flat_number', '21')
    .click('input[data-tc="save-default-address"]')
    .click(orders.labels.examplePayment)
  await t
    .click(orders.buttons.review_and_confirm)
    .click(orders.buttons.confirm)
    .click(orders.buttons.paySuccess)
  })

test('Buying another item, save default address', async (t) => {
    await t
        .useRole(buyerRole)
    await t.typeText(itemSearch.quickSearch.keyword, SellerMerchant.item)

    .click(itemSearch.buttons.quickSearch)
    .click(Selector('a').withText(SellerMerchant.item))
    .click(itemShow.buttons.buy)
    .click(orders.buttons.checkout)
    await t.typeText(orders.inputs.phone, '123456')
    .click(orders.labels.homeDelivery)

    await t.expect(Selector('#address_full_name').withAttribute('value', 'Address').exists).ok()
    await t.expect(Selector('#address_country').withAttribute('value', 'Country').exists).ok()
    await t.expect(Selector('#address_city').withAttribute('value', 'City').exists).ok()
    await t.expect(Selector('#address_state').withAttribute('value', 'State').exists).ok()
    await t.expect(Selector('#address_zip').withAttribute('value', 'zip').exists).ok()
    await t.expect(Selector('#address_street').withAttribute('value', 'street').exists).ok()
    await t.expect(Selector('#address_building_number').withAttribute('value', '12').exists).ok()
    await t.expect(Selector('#address_flat_number').withAttribute('value', '21').exists).ok()

    .wait(50)
    await t.click(orders.labels.examplePayment)
    .click(orders.buttons.review_and_confirm)
    .click(orders.buttons.confirm)
    .click(orders.buttons.paySuccess)
})

test('Stock of this item ^ decreased by 1', async (t) => {
  await t
    .useRole(merchantRole) // seller checks if his order shown as paid
    .click(topMenu.buttons.profileDropdown)
    .click(topMenu.profileDropdown.selling)

    await t.expect(Selector('ul[data-tc="inventory-product"]').withText(item.commonName).exists).ok()

    let stockOfThisItem = Selector('ul[data-tc="inventory-product"]').withText(item.commonName).find('li[data-tc="inventory-product-quantity"]')

    await waitForSelector(stockOfThisItem.withExactText('1'))
})


test('Add same item to cart, check if previously finalised order doesn\'t change', async (t) => {
  await t
    .useRole(buyerRole)
    .typeText(itemSearch.quickSearch.keyword, item.commonName)
    .click(itemSearch.buttons.quickSearch)

    .expect(itemSearch.links.commonItem.exists)
    .ok()

    .click(itemSearch.links.commonItem)
    await t.click(itemShow.buttons.buy)

    .wait(500)

    await t
    .expect(await getURL()).contains(myUrl + '/dashboard/buy/cart')

    .click(topMenu.buttons.cart)

    await t
    .expect(await getURL()).contains(myUrl + '/dashboard/buy/cart')

    await t
    .expect(cartPage.product.exists).ok()

    await t
    .expect(cartPage.productQuantity.withAttribute('value', '1').exists).ok()

    .click(orders.buttons.removeFromCart)

  await t.navigateTo(myUrl + "/dashboard/buy/orders")

  let countOrders = orders.cards.card.withText(John.name).count

  await waitForSelector(orders.cards.card.withText(John.name))
  await t.expect(countOrders).eql(1)
})


test('Buying an item by anon', async (t) => {
  await t
    .typeText(itemSearch.quickSearch.keyword, item.commonName)
    .click(itemSearch.buttons.quickSearch)

    .expect(itemSearch.links.commonItem.exists).ok()
    .click(itemSearch.links.commonItem)
    .click(itemShow.buttons.buy)
  await checkErrors()

  await t
    .click(orders.buttons.checkout)
    .click(Selector('a').withText('Register'))
  await register(Anon)
  await t.typeText(orders.inputs.phone, Anon.phone)
  await t
    .click(orders.labels.personalPickup)
    .click(orders.labels.examplePayment)
    .click(orders.buttons.review_and_confirm)
    .click(orders.buttons.confirm)
    .click(orders.buttons.paySuccess)

  await t
    .useRole(merchantRole) // seller checks if his order shown as paid
    .click(topMenu.buttons.profileDropdown)
    .click(topMenu.profileDropdown.selling)
    .click(dashboard.nav.sold) // seller's order check

  await checkErrors()
  await waitForSelector(Selector('time').withText('2021'))
})

test.page(myUrl + '/sessions/new')('Proceed checkout and abandon payment for expire test', async (t) => {
  await t
    .typeText(loginForm.inputs.email, Anon.email)
    .typeText(loginForm.inputs.password, Anon.password)
    .click(loginForm.buttons.logIn)
    .typeText(itemSearch.quickSearch.keyword, SellerMerchantA.item)
    .click(itemSearch.buttons.quickSearch)
    .click(Selector('a').withText(SellerMerchantA.item))
    .click(itemShow.buttons.buy)
    .click(orders.buttons.checkout)
    await t.typeText(orders.inputs.phone, Anon.phone)
    .click(orders.labels.personalPickup)
    .click(orders.labels.examplePayment)
    .click(orders.buttons.review_and_confirm)
    .click(orders.buttons.confirm)
})

test('Expects an item in products that belongs to the profile we are currently visiting', async (t) => {
  await t
    .useRole(merchantRole)
    .navigateTo(myUrl + '/profile/' + SellerMerchant.name)
    .click(publicProfile.menu.products)
  await
    checkErrors()

  await t.expect(link.withText("Watch").exists).ok()
})

test.page(myUrl + '/search')('Item status is out of stock', async (t) => {
  await t
    .useRole(merchantRole)
    .typeText(itemSearch.quickSearch.keyword, item.commonName)
    .click(itemSearch.buttons.quickSearch)
    .click(itemSearch.links.commonItem)
  await waitForSelector(Selector('div').withText('SOLD OUT'))
})

test('Delivery', async (t) => {
  await t
    .useRole(merchantRole)
    .navigateTo(soldOrders.url)

  await waitForSelector(soldOrders.johnSmithOrderId)

  //var countOrders = orders.orders.orderNumber.count

  await t
    //.expect(countOrders).eql(2) - Check later if order count is correct

    .click(soldOrders.johnSmithOrderId)
    .typeText(soldOrders.delivery.information, "delivered", { replace: true })

    .expect(soldOrders.delivery.statuses.inProgress.exists).ok()

    .click(soldOrders.delivery.markAsDelivered)
    .click(soldOrders.delivery.saveDeliveryInfo)
    .wait(5000)
})

test('Return item by buyer', async (t) => {
  await t
    .useRole(buyerRole)
    .navigateTo(orders.urls.buyer)

    .click(Selector('article').withText('OUT FOR DELIVERY').find('a').withText('View details'))

    .expect(orders.statuses.delivered.exists).ok()

    await t.wait(100)

    await waitForSelector(orders.buttons.return)
    await t.click(orders.buttons.return)

    .typeText(orders.inputs.returnReason, 'Damaged Necklace')
    .typeText(orders.inputs.returnDescription, 'Necklace which has arrived is damaged')
    .click(orders.checkboxes.returnToStore)
    .click(orders.buttons.sendReturnRequest)
  })

test('Accept return by merchant', async (t) => {
  await t
    .useRole(merchantRole)
    .navigateTo(soldOrders.url)

    var orderIdWithDeliveredStatus = Selector('ul').withText('DELIVERED').find(('a[data-tc="order-id"]'))

    await t.click(orderIdWithDeliveredStatus)

    .expect(soldOrders.delivery.statuses.returnRequested.exists).ok()

    .click(soldOrders.returns.buttons.returnDetails)
    .click(soldOrders.returns.buttons.accept)
    .click(soldOrders.returns.buttons.markAsReturned)
})

test.page(myUrl + '/sessions/new')("Unpaid order status is expired after 'x' time", async (t) => {
  await t
    .typeText(loginForm.inputs.email, Anon.email)
    .typeText(loginForm.inputs.password, Anon.password)
    .click(loginForm.buttons.logIn)
    .navigateTo(myUrl + '/dashboard/buy/orders')

    let cancelledOrder = Selector('article').withText('CANCELLED BY YOU')
    let cancelledOrderDetails = cancelledOrder.find('a').withText('View details')

    await waitForSelector(cancelledOrder)
    await t.click(cancelledOrderDetails)

    let orderStatus = Selector('span[data-tc="order-status"]')

    await waitForSelector(orderStatus.withText('EXPIRED'))
})


// TODO: fix me please
// test.page(myUrl + '/search')('Wishlist', async (t) => {
//   await t
//     .useRole(buyerRole)
//     .typeText(itemSearch.quickSearch.keyword, "Rochees RW38 Analog Watch")
//     .click(itemSearch.buttons.quickSearch)
//     .click(Selector('a').withText('Rochees RW38 Analog Watch'))
//     .click(Selector('button[data-tc="wishlist-item"]'))
//     .click(Selector('a[data-tc="wishlist"]'))
//     .expect(Selector('li a').withText("Rochees RW38 Analog Watch").exists).ok()
//     .click(Selector('a').withText('Rochees RW38 Analog Watch'))
//     .click(Selector('button[data-tc="wishlist-item"]'))
//     .click(Selector('a[data-tc="wishlist"]'))
//     .expect(Selector('li a').withText("Rochees RW38 Analog Watch").exists).notOk()
// })

test('Order cancel by merchant', async (t) => {
  await t
    .useRole(merchantRole)
    .navigateTo(myUrl + '/dashboard/sell/orders')
    var orderIdWithNewStatus = Selector('ul').withText('NEW').find(('a[data-tc="order-id"]'))
    await t.click(orderIdWithNewStatus)
    await t.click(soldOrders.cancellation.cancelCheckbox)
    .setNativeDialogHandler(() => true)
    await t.click(soldOrders.cancellation.confirmCancel)
    await t.expect(Selector('h3').withText('Cancelled order').exists).ok()
    await t.expect(Selector('p').withText('Cancelled by you').exists).ok()
})

test.skip('Merchant can use order statuses filters', async (t) => {
  await t
    .useRole(merchantRole)
    .navigateTo(myUrl + '/dashboard/sell/orders')

  let orderCount = () => soldOrders.order.count;

  await t
    .expect(orderCount()).eql(3)

  await t
    .expect(soldOrders.orderStatus.withText('RETURNED').exists).ok()
    .expect(soldOrders.orderStatus.withText('CANCELLED BY YOU').exists).ok()

  await t
    .click(soldOrders.buttons.filters)

    .click(soldOrders.filters.new)
    .click(soldOrders.filters.returned)
    .click(soldOrders.filters.delivered)
    .click(soldOrders.filters.cancelledByYou)

    .wait(100)

    .click(soldOrders.buttons.applyFilters)

    .wait(200)

  await t
    .expect(orderCount()).eql(0)

  await t
    .click(soldOrders.buttons.filters)
    .click(soldOrders.filters.returned)
    .wait(100)
    .click(soldOrders.buttons.applyFilters)
    .wait(200)

  await t
    .expect(orderCount()).eql(1)

  await t
    .click(soldOrders.buttons.filters)
    .click(soldOrders.filters.cancelledByYou)
    .wait(100)
    .click(soldOrders.buttons.applyFilters)
    .wait(200)

    waitForSelector(soldOrders.orderStatus.withText('CANCELLED BY YOU'))
  await t
    .expect(orderCount()).eql(2)
})
