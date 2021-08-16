import { Selector } from 'testcafe'
import { adminRole,buyerRole } from './pages/roles'
import {
  notAuthorizedUser,
  myUrl,
  adminPage,
  topMenu,
} from './pages/fixtures'
import { checkErrors } from './pages/helper'

fixture`Admin Panel`.page(myUrl)

test(`Count tables in each section`, async (t) => {
  await t.useRole(adminRole)
  await t
    .click(topMenu.buttons.profileDropdown)
    .click(topMenu.buttons.adminPanel)
  await
checkErrors() // Admin panel translation missing check

  await t.click(adminPage.menu.users)
  await
  checkErrors()

  await t.expect(adminPage.tableRows.users.count).gte(1)

  await t.click(adminPage.menu.sales)
  await t.click('#status_returned')
  await t.click('#status_cancelled_seller')

  await
  checkErrors()

  //await t.expect(adminPage.tableRows.sales.count).gte(1) commented for now

  await t.click(adminPage.menu.stock)
  await
  checkErrors()

  await t.expect(adminPage.tableRows.stock.count).gt(1)
})

test('Breakin-in test', async (t) => {
  await t.useRole(buyerRole)
  await t.navigateTo(myUrl + '/admin')

  await t.expect(Selector('div').withText(notAuthorizedUser).exists).ok()

  await t.useRole(buyerRole)
  await t.navigateTo(myUrl + '/admin/users')

  await t.expect(Selector('div').withText(notAuthorizedUser).exists).ok()

  await t.useRole(buyerRole)
  await t.navigateTo(myUrl + '/admin/sales')

  await t.expect(Selector('div').withText(notAuthorizedUser).exists).ok()

  await t.useRole(buyerRole)
  await t.navigateTo(myUrl + '/admin/stock')

  await t.expect(Selector('div').withText(notAuthorizedUser).exists).ok()
})
