import { Selector } from 'testcafe';

export default class TopMenuBtns {
  constructor() {
    this.buttons = {
      logo: Selector('span').withText('MVP Marketplace'),
      addDropdown: Selector('header').find('button').withAttribute('title', 'Add content'),
      listItem: Selector('a').withText('Create item'),
      addQuestion: Selector('a').withText('Add question'),
      profileDropdown: Selector('header nav > ul > li[data-tc="profile-menu-dropdown"] button').withAttribute('data-dropdown-toggle'),
      profile: Selector('header').find('a').withText('Profile'),
      selling: Selector('header').find('a').withText('Selling'),
      dashboard: Selector('a').withText('Dashboard'),
      logIn: Selector('header').find('a').withText('Log in'),
      logOut: Selector('header').find('button').withText('Log out'),
      adminPanel: Selector('header').find('a').withText('Admin'),
      items: Selector('header').find('a').withText('Items'),
      groups: Selector('a').withText('Groups'),
      feed: Selector('a').withText('Feed'),
      chat: Selector('#notifications-chat'),
      cart: Selector('a[title="Cart"]')
    }
    this.addDropdown = {
      addPost: Selector('li a').withText('Add post'),
      addQuestion: Selector('li a').withText('Add question'),
      createGroup: Selector('li a').withText('Create group'),
      createItem:  Selector('li a').withText('Create item')
    }
    this.profileDropdown = {
      profile: Selector('nav a').withText('Public Profile'),
      admin: Selector('li a').withText('Admin'),
      dashboard: Selector('a').withText('Dashboard'),
      selling: Selector('li a').withText('Selling')
    }
  }
}
