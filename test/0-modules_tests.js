import { Selector, ClientFunction } from 'testcafe';
import { myUrl } from './pages/fixtures';



fixture `Modules tests`
  .page(myUrl)



// Flash notifications
// ------------------------------------------------------------------------

test('Success notification hides itself', async t => {

  let showSuccessNotification = ClientFunction(() => { new api.flash('success', 'Testing the success notification'); });
  await showSuccessNotification();

  await t
    .expect(Selector('#flashes [data-flash]').withText('Testing the success notification').exists).ok()
    .wait(5000)
    .expect(Selector('#flashes [data-flash]').withText('Testing the success notification').exists).notOk();

});

test('Error notification can be hidden by close button', async t => {

  let showErrorNotification = ClientFunction(() => { new api.flash('error', 'Testing the error notification'); });
  await showErrorNotification();

  await t
    .expect(Selector('#flashes [data-flash]').withText('Testing the error notification').exists).ok()
    .click(Selector('#flashes [data-flash] [data-flash-close]'))
    .expect(Selector('#flashes [data-flash]').withText('Testing the error notification').exists).notOk();

});

test('Error notification can be hidden by API call', async t => {

  let showHideErrorNotification = ClientFunction(() => {
    let errorNotification = new api.flash('error', 'Testing the error notification API');
    errorNotification.hide();
  });

  await showHideErrorNotification();
  await t
    .expect(Selector('#flashes [data-flash]').exists).notOk();

});
