import { Selector } from 'testcafe';

export default class AdminPanel {
  constructor() {
    this.menu = {
      home: Selector('nav a').withAttribute('title', 'Dashboard'),
      sales: Selector('nav a').withAttribute('title', 'Sales'),
      stock: Selector('nav a').withAttribute('title', 'Stock'),
      users: Selector('nav a').withAttribute('title', 'Users')
    }
    this.tableRows = {
      sales: Selector('section.table .table-content ul'),
      stock: Selector('section.table .table-content ul'),
      users: Selector('section.table .table-content ul')
    }
  }
}
