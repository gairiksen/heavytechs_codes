import { ClientFunction, Selector } from 'testcafe'
import faker from 'faker'


//import pages
import TopMenuBtns from './topmenu'
import NewItemForm from './newitem'
import DashboardPage from './dashboard'
import ItemShowPage from './itemshow'
import ItemSearch from './itemsearch'
import OrdersPage from './orders'
import GroupsPage from './groupsPage'
import ProfileView from './publicProfile'
import ProfileEditForm from './profileEdit'
import ActivityFeed from './activityPage'
import AdminPanel from './adminp'
import Footer from './footer'
import ContactUs from './contactUsForm'
import PasswordReset from './passwordReset'
import NewSessionForm from './newsession'
import TopicsPage from './topicsPage'
import StaticPages from './static-pages'
import SoldOrders from './soldOrders'
import Cart from './cart'


//variables
export const resetConfirmation = 'Please check your email.';
export const loginConfirmation = 'Logged in'
export const getURL = ClientFunction(() => window.location.href)
export const myUrl = process.env.MPKIT_URL.replace(/\/$/,'','')
export const loremSentence = (faker.lorem.lines() + " " + faker.lorem.lines())
export const editURL = '/dashboard/items/edit?id='
export const permissionDenied = 'Permission denied'
export const notAuthorizedUser = "The system has determined that you are not presently authorized to use this system function."
export const groupName = faker.lorem.words();
export const translationMissing = (Selector('body').withText("translation missing"))
export const link = Selector('a')
export const commentText = "What's new bro?"
export const randomFirstName = faker.name.firstName()
export const randomLastName = faker.name.lastName()
export const categoryName = "Clothes"


//export pages
export const soldOrders = new SoldOrders()
export const cartPage = new Cart()
export const adminPage = new AdminPanel()
export const registerForm = new NewSessionForm()
export const loginForm = new NewSessionForm()
export const passwordResetForm = new PasswordReset()
export const newItemForm = new NewItemForm()
export const topMenu = new TopMenuBtns()
export const dashboard = new DashboardPage()
export const profileEditForm = new ProfileEditForm()
export const orders = new OrdersPage()
export const publicProfile = new ProfileView()
export const groupsPage = new GroupsPage()
export const footer = new Footer()
export const contactUsForm = new ContactUs()
export const activityFeed = new ActivityFeed()
export const topicsPage = new TopicsPage()
export const staticPages = new StaticPages()


//export few accounts

//buyer
export const John = {
  email: 'johnsmith@example.com',
  password: 'password',
  name: 'johnsmith',
  firstName: 'John',
  lastName: 'Smith',
  phone: faker.phone.phoneNumber()
}

//admin
export const Admin = {
  email: 'admin@example.com',
  password: 'newpassword',
  newPassword: 'password'
}

//account for reset password test needs
export const TestCafeAccount = {
  email: 'testcafe@tc.com',
  password: 'password',
  name: randomFirstName.toLowerCase(),
  firstName: randomFirstName,
  lastName: randomLastName,
  newPassword: 'newPassword'
}

//random seller user
export const SellerRandomUser = {
  email: faker.internet.email().toLowerCase(),
  password: '12345',
  name: randomFirstName.toLowerCase(),
  firstName: randomFirstName,
  lastName: 'Porter'
}

//random seeded account
export const RandomPerson = {
  name: 'random-person',
  email: 'random@getmarketplace.co',
  password: 'password'
}

//seeded merchant account
export const SellerMerchant = {
  name: 'employee-b-1',
  email: 'employee-b-1@getmarketplace.co',
  password: 'password',
  item: 'Casela CAS-W-13 Basic'
}

//seeded other merchant account
export const SellerMerchantA = {
  name: 'employee-a-1',
  email: 'employee-a-1@getmarketplace.co',
  password: 'password',
  item: 'Maserati Time R8851116001'
}

//this account is in use in tests for buying products by anon
export const Anon = {
  email: 'anon@example.com',
  password: 'password',
  name: randomFirstName.toLowerCase(),
  firstName: randomFirstName,
  lastName: 'Anon',
  phone: faker.phone.phoneNumber()
}

//this is for create item test
export const item = {
  name: faker.commerce.productName(),
  type: faker.commerce.productMaterial(),
  description: faker.lorem.word(),
  price: '10000',
  commonName: "johnsmith watch"
}

//this is for edit item test
export const editedItem = {
  name: faker.commerce.productName(),
  type: faker.commerce.productMaterial(),
  description: faker.lorem.word(),
  price: '5000',
}

export const itemShow = new ItemShowPage(item)
export const editedItemShow = new ItemShowPage(editedItem)
export const itemSearch = new ItemSearch(item, editedItem)


//this is list of not allowed places for users whose don't fullfilled profile
export var notAllowedPlaces = [
  dashboard.nav.inbox,
  dashboard.nav.myGroups,
  topMenu.buttons.chat,
  dashboard.nav.activityFeed,
  dashboard.nav.publicProfile
];


//this is list of not allowed places (urls) for users whose don't fullfilled profile
export var notAllowedUrls = [
  '/dashboard',
  '/dashboard/profile/edit',
  '/inbox',
  '/dashboard/sell/orders',
  '/dashboard/sell/items',
  '/dashboard/sell/items',
  '/dashboard/items/new',
  '/dashboard/payments/account',
  '/dashboard/groups',
  '/dashboard/posts'
];


//users without fullfilled profile may not enter below sections
export var notAllowedPlacesDropDown = [
  topMenu.addDropdown.addPost,
  topMenu.addDropdown.addQuestion,
  topMenu.addDropdown.createGroup
];

//for group tests
export const group = {
  name: groupName,
  commonName: "johnsmith group",
  audifans: "audi fans",
  summary: "fun-club",
  description: (loremSentence + " " + loremSentence + " " + loremSentence)
}
