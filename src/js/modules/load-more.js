window.loadMore = function () {
  return {
    spinner: false,
    frame: null,
    render(element) {
      return this.frame ? this.frame : element.innerHTML;
    },
    fetchResults(path) {
      fetch(path)
        .then((res) => res.text())
        .then((res) => {
          this.frame = res;
          this.spinner = false;
        });
    },
    submitSearch(e) {
      const url = e.target.href;
      this.spinner = true;
      this.fetchResults(url);
    },
  };
};
