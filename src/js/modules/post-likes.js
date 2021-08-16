import apiFetch from '../apiFetch';

function getJSONFromForm(el) {
  const fd = new FormData(el);
  return JSON.stringify(Object.fromEntries(fd));
}

window.postLikes = function (opts) {
  return {
    liked: opts.liked,
    count: opts.count,
    toggle($el) {
      $el.classList.add('wishlist-loading');

      const url = this.$el.action;
      const method = 'put';
      const body = getJSONFromForm(this.$el);
      const countChange = this.$el.type.value == 'up' ? 1 : -1

      apiFetch(url, {body, method})
        .then((result) => {
          $el.classList.remove('wishlist-loading');
          if(result.errors) {
            new api.flash('error', result.errors.base[0], { autohide: 5000 });
          } else {
            this.liked = !this.liked;
            this.count += countChange;
          }
        })
        .catch(() => {
          $el.classList.remove('wishlist-loading');
        })
    },
  };
};
