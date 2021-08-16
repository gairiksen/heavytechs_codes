window.navigationStats = function () {
  return {
    cartQuantity: false,
    inboxUnread: false,
    init() {
      fetch('/api/users/stats.json')
        .then((res) => res.json())
        .then((res) => {
            this.cartQuantity = res.cart_quantity;
            this.inboxUnread = res.inbox_unread;
          }
        )
        .catch(e => {
          this.cartQuantity = false;
          this.inboxUnread = 0;
        });
    },
  };
};
