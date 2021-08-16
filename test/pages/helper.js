import { t, ClientFunction, Selector } from 'testcafe';
import NewSessionForm from './newsession'
import ProfileEditForm from './profileEdit'
import TopMenuBtns from './topmenu'
import NewItemForm from './newitem'
import { getURL, myUrl, itemShow, orders, groupsPage } from './fixtures'


const newItemForm = new NewItemForm()
const topMenu = new TopMenuBtns()
const registerForm = new NewSessionForm()
const profileEditForm = new ProfileEditForm()
const translationMissing = Selector('body').withText('translation missing')

async function checkTranslation(selector) {
  if (await selector.exists) {
    await t.expect(selector.exists).notOk()
  }
};

export async function register(user) {
  checkTranslation(translationMissing)
  await t
    .typeText(registerForm.inputs.firstName, user.firstName)
    .typeText(registerForm.inputs.lastName, user.lastName)
    .typeText(registerForm.inputs.email, user.email)
    .typeText(registerForm.inputs.password, user.password)
    .click(registerForm.buttons.termsAccept)
  await t.click(registerForm.buttons.regSubmit)
};

export async function registerWithProfile(user) {
  checkTranslation(translationMissing)
  await t
    .typeText(registerForm.inputs.firstName, user.firstName)
    .typeText(registerForm.inputs.lastName, user.lastName)
    .typeText(registerForm.inputs.email, user.email)
    .typeText(registerForm.inputs.password, user.password)
    .click(registerForm.buttons.termsAccept)
  await t.click(registerForm.buttons.regSubmit)
  const getLocation = await getURL()

  await t.expect(getLocation).contains(myUrl+ '/dashboard/profile/edit')

    .typeText(profileEditForm.inputs.name, user.name)
    .click(profileEditForm.buttons.save)
};

export async function createItem(itemName, itemDescription, itemPrice) {
    await t.click(topMenu.buttons.addDropdown)
    await t.click(topMenu.buttons.listItem)
    await t.typeText(newItemForm.inputs.name, itemName)
    await checkTranslation(translationMissing)
    await t.typeText(newItemForm.inputs.description, itemDescription)
    .typeText(newItemForm.inputs.price, itemPrice, { replace: true })
    .click(newItemForm.buttons.browseImages)
    .setFilesToUpload(Selector('main').find('[name="files[]"]'), [
      '_uploads_/testimage.png',
    ])
    .typeText(newItemForm.inputs.quantity, "2", { replace: true })
    .click(newItemForm.buttons.submit)
};

export async function createGroup(group) {
  await t.click(topMenu.buttons.addDropdown)
  await t.click(topMenu.addDropdown.createGroup)
  await checkErrors()
  await t
    .typeText(groupsPage.inputs.name, group.name)
    .typeText(groupsPage.inputs.summary, group.summary)
    .typeText(groupsPage.inputs.description, group.description, { paste: true })
    .click(groupsPage.buttons.submitForm)
};

export async function waitForSelector(selector) {
  for (var i = 0; i < 40; i++) {
    let exists = await selector.exists;
    if (!exists) {
      await t
        .wait(5000)
        .eval(() => location.reload(true));
    }
  }
  await t.expect(selector.exists).ok()
};

export async function checkErrors() {
  await t.expect(Selector('body').withText("translation missing").exists).notOk();
  await t.expect(Selector('body').find('img[alt="Page missing"]').exists).notOk();
  await t.expect(Selector('body').withText('Liquid Error').exists).notOk();
  await t.expect(Selector('body').withText('RenderFormTag Error:').exists).notOk();
  await t.expect(Selector('body').withText('QueryGraphTag Error:').exists).notOk();
  await t.expect(Selector('body').withText('Liquid error:').exists).notOk();
  await t.expect(Selector('body').withText('ExecuteQueryTagError:').exists).notOk();
};
