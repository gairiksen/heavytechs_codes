import { Selector, ClientFunction, t } from 'testcafe'
import { myUrl, staticPages } from './pages/fixtures'
import { checkErrors } from './pages/helper'
import faker from 'faker'

fixture`Static Pages`

test.page(myUrl + '/about-us')('About Us', async (t) => {
  await
  checkErrors()
})

test.page(myUrl + '/terms-of-service')('Terms of Service', async (t) => {
  await
  checkErrors()
})

test.page(myUrl + '/privacy-policy')('Privacy Policy', async (t) => {
  await
  checkErrors()
})

test.page(myUrl + '/faq')('FAQ', async (t) => {
  await t.click(staticPages.faq.aboutQuestions)
  await t.click(staticPages.faq.aboutUpvotes)
  await t.click(staticPages.faq.aboutAskingQuestions)
  await t.click(staticPages.faq.aboutEditor)
  await
  checkErrors()
})

test.page(myUrl + '/' + faker.lorem.word())('render 404 for not existing page', async (t) => {
  await t.expect(Selector('img').withAttribute('alt', 'Page missing').exists).ok()
  await t.expect(Selector('h3').withText('Page not found.').exists).ok()
  await t.expect(Selector('body').withText("translation missing").exists).notOk();
  await t.expect(Selector('body').withText('Liquid Error').exists).notOk();
  await t.expect(Selector('body').withText('RenderFormTag Error:').exists).notOk();
  await t.expect(Selector('body').withText('QueryGraphTag Error:').exists).notOk();
  await t.expect(Selector('body').withText('Liquid error:').exists).notOk();
  await t.expect(Selector('body').withText('ExecuteQueryTagError:').exists).notOk();
})
