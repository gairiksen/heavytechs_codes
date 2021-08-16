import { Selector, Role } from 'testcafe';
import NewSessionForm from './newsession'
import TopMenuBtns from './topmenu'
import { John, Admin, SellerRandomUser, myUrl, loginConfirmation, SellerMerchant, RandomPerson } from './fixtures'

const topMenu = new TopMenuBtns()
const loginForm = new NewSessionForm()

export const buyerRole = Role(myUrl + "/sessions/new", async (t) => {
  await t
    .typeText(loginForm.inputs.email, John.email)
    .typeText(loginForm.inputs.password, John.password)
    .click(loginForm.buttons.logIn)
})

export const sellerRole = Role(myUrl + "/sessions/new", async (t) => {
  await t
    .typeText(loginForm.inputs.email, SellerRandomUser.email)
    .typeText(loginForm.inputs.password, SellerRandomUser.password)
    .click(loginForm.buttons.logIn)

  await t.expect(Selector('main').withText(loginConfirmation).exists).ok('message ' + loginConfirmation + " doesn't exists")
})

export const adminRole = Role(myUrl + "/sessions/new", async (t) => {
  await t
    .typeText(loginForm.inputs.email, Admin.email)
    .typeText(loginForm.inputs.password, Admin.newPassword)
    .click(loginForm.buttons.logIn)
})

export const merchantRole = Role(myUrl + "/sessions/new", async (t) => {
  await t
    .typeText(loginForm.inputs.email, SellerMerchant.email)
    .typeText(loginForm.inputs.password, SellerMerchant.password)
    .click(loginForm.buttons.logIn)
})

export const randomPersonRole = Role(myUrl + "/sessions/new", async (t) => {
  await t
    .typeText(loginForm.inputs.email, RandomPerson.email)
    .typeText(loginForm.inputs.password, RandomPerson.password)
    .click(loginForm.buttons.logIn)
})
