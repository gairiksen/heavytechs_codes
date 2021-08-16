window.searchComponent = function () {
  return {
    spinner: false,
    frame: null,
    isSidebarOpen: false,
    isSellersExpanded: false,
    init(){
      this.watchScreen();
      this.handleBack();
    },
    bigScreen() {
      return window.innerWidth >= 1024;
    },
    watchScreen() {
      this.isSidebarOpen = this.bigScreen();
    },
    render(element) {
      return this.frame ? this.frame : element.innerHTML;
    },
    reset(){
      let filters = document.querySelector('[x-ref="sidebar"]');

      filters.querySelectorAll('select').forEach(item => { item.selectedIndex = '0'; });
      filters.querySelectorAll('input:not([type="checkbox"])').forEach(item => { item.value = ''; });
      filters.querySelectorAll('input[type="checkbox"]').forEach(item => { item.checked = false; });

      this.submitSearch();
    },
    handleBack(){
      window.addEventListener('popstate', (event) => {
        console.log("popstate location: " + document.location + ", state: " + JSON.stringify(event.state));
        this.spinner = true;
        window.location = document.location;
      });
    },
    updateUrl(params) {
      let newUrl = new URL(window.location.href);
      newUrl.pathname = '/search'
      newUrl.search = params;
      history.pushState({}, null, newUrl.toString());
    },
    fetchResults(path) {
      fetch(path)
        .then((res) => res.text())
        .then((res) => {
          this.frame = res;
          this.spinner = false;
        });
    },
    submitSearch() {
      this.spinner = true;
      let formData = new FormData(document.forms.search_form)
      let params = new URLSearchParams(formData);
      this.updateUrl(params);
      this.fetchResults('/search_frame?' + params.toString());
    },
  };
};
