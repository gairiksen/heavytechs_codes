import { Selector } from 'testcafe';

export default class StaticPages {
  constructor() {
    this.faq = {
      aboutQuestions: Selector('summary').withText('How to post questions?'),
      aboutUpvotes: Selector('summary').withText('What is upvote and how to use it'),
      aboutAskingQuestions: Selector('summary').withText('How to ask a good question?'),
      aboutEditor: Selector('summary').withText('How to use the editor?')
    }
  }
}