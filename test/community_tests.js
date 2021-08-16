import { Selector, ClientFunction, t } from 'testcafe'
import { buyerRole, adminRole, merchantRole, randomPersonRole } from './pages/roles'
import {
  John,
  SellerRandomUser,
  myUrl,
  group,
  link,
  commentText,
  topMenu,
  dashboard,
  groupsPage,
  activityFeed,
  topicsPage,
  itemSearch,
  SellerMerchant
} from './pages/fixtures'
import { checkErrors, createGroup, waitForSelector } from './pages/helper'

fixture`Community aspects`.page(myUrl)

test('Follow person', async (t) => {
  await t
    .useRole(buyerRole)
    .navigateTo(myUrl + '/profile/' + SellerMerchant.name)
    .click(Selector('button[title="Follow or unfollow user"]'))
    .click(Selector('a').withText('Followers'))
    .expect(Selector('a').withText(John.name).exists)
    .ok()
})

test.page(myUrl + '/search')('Follow button not exists for anons', async (t) => {
  await t.expect(Selector('button[title="Follow or unfollow user"]').exists).notOk()
})

test('Groups', async (t) => {
  await t.useRole(buyerRole)
  await createGroup(group)
  await createGroup(group)
  await t
    .expect(Selector('div').textContent)
    .contains('already taken')
    //checks if group exists
    //
  await t.navigateTo(myUrl + '/dashboard/posts')
    .click(dashboard.nav.myGroups)
  await checkErrors()
  await t
    .expect(link.withText(group.name).exists)
    .ok()
    //edit group
    .click(groupsPage.buttons.editGroup)
    .typeText(groupsPage.inputs.name, group.commonName, { replace: true })
    .click(groupsPage.buttons.submitForm)
    .expect(link.withText(group.commonName).exists)
    .ok()
})

test('Activity', async (t) => {
  await t
    .useRole(buyerRole)
    .click(topMenu.buttons.profileDropdown)
    .click(topMenu.profileDropdown.dashboard)
  await t.click(dashboard.nav.activityFeed)
  await t
    .typeText(activityFeed.inputs.message, commentText)
    .click(activityFeed.buttons.send)

  await checkErrors()

  await t
    .click(topMenu.buttons.profileDropdown)
    .click(topMenu.profileDropdown.profile)

  await waitForSelector(Selector('div').withText(commentText))
})

test('Add question and edit', async (t) => {
  await t
    .useRole(adminRole)
    .navigateTo(myUrl + '/admin/groups/main') // temporary way of fixing main group
    .click(topMenu.buttons.addDropdown)
    .click(topMenu.addDropdown.addQuestion)
  await checkErrors()
  await t
    .typeText(topicsPage.inputs.questionTitle, 'How to buy?')
    .click(Selector('label[for="body"]'))
    .pressKey('q u e s t i o n')
    .typeText(topicsPage.inputs.questionTags, 'test-question-tag')
    .click(topicsPage.buttons.postQuestion)
    //.expect(topicsPage.buttons.editQuestion.exists).ok()
    .click(topMenu.buttons.profileDropdown)
    .click(topMenu.buttons.selling)
    .click(dashboard.nav.questions)
    .click(topicsPage.buttons.editQuestion)
    .typeText(topicsPage.inputs.questionTitle, 'How to sell?', {
      replace: true,
    })
    .click(topicsPage.buttons.submitEdit)
})

test('Add answer', async (t) => {
  await t
    .useRole(buyerRole)
    .navigateTo(myUrl + '/posts')
    .click(link.withText('How to sell?'))
    .click(Selector('div.CodeMirror-scroll'))
    .pressKey('a n s w e r')
    .click(topicsPage.buttons.postAnswer)
    .expect(topicsPage.fields.answerBody.withText('answer').exists)
    .ok()
})

test('Add comment', async (t) => {
  await t
    .useRole(buyerRole)
    .navigateTo(myUrl + '/posts')
    .click(link.withText('How to sell?'))
    .click(Selector('span').withText('Comment'))
    .typeText(Selector('textarea[name="comment[body]"]'), 'comment')
    .click(Selector('button').withText('Send'))
})

test('Rate question and answer', async (t) => {
  await t
    .useRole(merchantRole)
    .navigateTo(myUrl + '/posts')
    .click(link.withText('How to sell?'))
  await
  checkErrors()
  await t
    .click(topicsPage.vote.pointUpQuestion) // rate the question
    .click(topicsPage.vote.pointUpAnswer) // rate the answer
    .expect(topicsPage.fields.questionBody.withText('question').exists)
    .ok()
    .expect(topicsPage.ratings.question.exists)
    .ok()
    .expect(topicsPage.ratings.firstAnswer.exists)
    .ok()
})

test('Delete question', async (t) => {
  await t.useRole(adminRole)
  await t.navigateTo(myUrl + '/dashboard/posts')
  await t
    .setNativeDialogHandler(() => true)
    .click(Selector('button').withAttribute('title', 'Delete'))
})

fixture.skip`Chat`.page(myUrl)

test.page(myUrl + '/search')('Chat to merchant', async (t) => {
  await t.useRole(buyerRole)
  .typeText(itemSearch.search.keyword, SellerMerchant.item)
  .click(Selector('a').withText(SellerMerchant.item))
  .click(Selector('a').withText('Contact seller'))
  .wait(3000)
  .typeText(Selector('input[placeholder="Type your message here and press Enter to send"]'), "Hi Merchant, i want to ask about " + SellerMerchant.item)
  .pressKey('enter')
  .wait(1000)
  .expect(Selector('p').withText('Hi Merchant, i want to ask about ' + SellerMerchant.item).exists).ok()
})

test('Chat to buyer by merchant', async (t) => {
  await t
  .useRole(merchantRole)
  .navigateTo(myUrl + '/inbox')
  .expect(Selector('a').withText('John Smith').exists).ok()
  .click(Selector('p').withText('John Smith'))
  .wait(3000)
  .typeText(Selector('input[placeholder="Type your message here and press Enter to send"]'), "Hi johnsmith, how we can help you?")
  .pressKey('enter')
  .wait(1000)
  .expect(Selector('p').withText('Hi Merchant, i want to ask about ' + SellerMerchant.item).exists).ok()
  .expect(Selector('p').withText('Hi johnsmith, how we can help you?').exists).ok()
})

test('User who hasn\'t participated in any conversation have empty inbox', async (t) => {
  await t
  .useRole(randomPersonRole)
  .navigateTo(myUrl + '/inbox')

  //expects for empty inbox
  .expect(Selector('p').withText('You have not started any conversation yet').exists).ok()
  .expect(Selector('p').withText('To start one, find a person profile and use the ‘Send message’ button').exists).ok()

  .expect(Selector('a').withText('John Smith').exists).notOk()
})
