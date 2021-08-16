window.unreadCount = function () {
  return {
    unreadCount: false,
    init() {
      fetch('/api/activities/feed.json')
        .then((res) => res.json())
        .then((res) => (this.unreadCount = res.unread_count))
        .catch(e => this.unreadCount = false);
    },
  };
};
