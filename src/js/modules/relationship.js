import apiFetch from '../apiFetch';

window.relationship = function () {
  return {
    initialized: '',
    exists: false,
    init() {
      const showPath = '/api/relationships/show.json';
      const params = new URLSearchParams(new FormData(this.$el)).toString();

      fetch(showPath + '?' + params)
        .then((res) => res.json())
        .then((res) => {
          this.initialized = true;

          this.exists = res.status !== 404;
        });
    },
    toggle() {
      const createPath = '/api/relationships/create.json';
      const deletePath = '/api/relationships/delete.json';

      this.initialized = false;

      const url = this.exists ? deletePath : createPath;
      const method = this.exists ? 'delete' : 'post';

      const fd = new FormData(this.$el);
      const body = JSON.stringify(Object.fromEntries(fd));

      apiFetch(url, {
        body,
        method,
      })
        .then(() => {
          console.log(this.exists, 'this.exists')
          this.exists = !this.exists;
        })
        .finally(() => {
          this.initialized = true;
          if (!this.exists) {
            window.location.reload();
          }
        });
    },
  };
};
