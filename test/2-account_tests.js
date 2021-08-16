import { Selector, ClientFunction, t } from 'testcafe'
import {
  John,
  myUrl,
  getURL,
  registerForm,
  loginForm,
  passwordResetForm,
  topMenu,
  profileEditForm,
  publicProfile,
  dashboard,
  notAllowedPlaces,
  notAllowedPlacesDropDown,
  Anon,
  notAllowedUrls,
  TestCafeAccount
} from './pages/fixtures'
import { registerWithProfile, checkErrors } from './pages/helper'

fixture`Account/profile tests`.page(myUrl)

test('Anonymous tests', async (t) => {
  for (var i in notAllowedUrls) {
    await t.navigateTo(myUrl + notAllowedUrls[i])

    await t.expect(await getURL()).contains(myUrl + '/sessions/new')
  }
})

test.page(myUrl + '/sign-up')('Uncompleted profile tests', async (t) => {
  await t
    .typeText(registerForm.inputs.email, TestCafeAccount.email)
    .typeText(registerForm.inputs.password, TestCafeAccount.password)
    .typeText(registerForm.inputs.firstName, TestCafeAccount.firstName)
    .typeText(registerForm.inputs.lastName, TestCafeAccount.lastName)
    .click(registerForm.buttons.termsAccept)
  await t.click(registerForm.buttons.regSubmit)

  await t.expect(await getURL()).contains(myUrl + '/dashboard/profile/edit')
  for (var i in notAllowedPlaces) {
    await t.click(notAllowedPlaces[i])

    await t.expect(await getURL()).contains(myUrl + '/dashboard/profile/edit')
  }
  for (var i in notAllowedPlacesDropDown) {
    await t.click(topMenu.buttons.addDropdown)
    await t.click(notAllowedPlacesDropDown[i])

    await t.expect(await getURL()).contains(myUrl + '/dashboard/profile/edit')
  }
})

test.page(myUrl + '/sign-up')(`Register buyer John then edit profile`, async (t) => {
  await registerWithProfile(John)
  await t
    .click(topMenu.buttons.profileDropdown)
    .click(topMenu.buttons.dashboard)
  await t.click(dashboard.nav.editProfile)
  await
  checkErrors()
  await t
    .typeText(profileEditForm.inputs.name, John.name, { replace: true })
    .typeText(profileEditForm.inputs.firstName, John.firstName, {
      replace: true,
    })
    .typeText(profileEditForm.inputs.lastName, John.lastName, { replace: true })
    .click(profileEditForm.buttons.save)
    .click(topMenu.buttons.profileDropdown)
    .click(dashboard.nav.publicProfile)
  await
  checkErrors()

  await t
    .expect(
      publicProfile.fields.username.withText(
        `${John.firstName} ${John.lastName}`,
      ).exists,
    )
    .ok()
})
test(`Reset Password test`, async (t) => {
  await t.click(topMenu.buttons.logIn).click(loginForm.buttons.resetPassword)
  await
  checkErrors()
  await t.typeText(passwordResetForm.inputs.email, TestCafeAccount.email)
  await t.click(passwordResetForm.buttons.resetPasswordSubmit)
  const passwordResetUrl = await Selector('main').innerText
  await t
    .navigateTo(passwordResetUrl)
    .typeText(passwordResetForm.inputs.newPassword, TestCafeAccount.newPassword)
    .typeText(
      passwordResetForm.inputs.newPasswordConfirmation,
      'newPassword',
    )
    .click(passwordResetForm.buttons.submit)
    .navigateTo(myUrl + '/sessions/new')
    .typeText(loginForm.inputs.email, TestCafeAccount.email)
    .typeText(loginForm.inputs.password, TestCafeAccount.newPassword)
    .click(loginForm.buttons.logIn)
    await t.expect(await getURL()).notContains('/sessions/new')
    await t.expect(Selector('header nav button').withText(TestCafeAccount.firstName).exists).ok()

})

test.page(myUrl + '/sessions/new')(
  `Trying to register with taken data and log in with wrong data`,
  async (t) => {
    await
  checkErrors()
    await t.click(loginForm.buttons.logIn)

    await t
      .expect(loginForm.labels.email.textContent)
      .contains('cannot be blank')

      .expect(loginForm.labels.password.textContent)
      .contains('cannot be blank')
      .typeText(loginForm.inputs.email, 'admin@example.com')
      .typeText(loginForm.inputs.password, 'asd')
      .click(loginForm.buttons.logIn)

      .expect(loginForm.labels.password.textContent)
      .contains('Invalid email or password')
      .click(loginForm.buttons.register)
      .typeText(registerForm.inputs.firstName, Anon.firstName)
      .typeText(registerForm.inputs.lastName, Anon.lastName)
      .typeText(registerForm.inputs.email, 'admin@example.com')
      .typeText(registerForm.inputs.password, 'asd')
      .click(loginForm.buttons.termsAccept)
      .click(registerForm.buttons.regSubmit)

      .expect(registerForm.labels.email.textContent)
      .contains('already taken')
  },
)
