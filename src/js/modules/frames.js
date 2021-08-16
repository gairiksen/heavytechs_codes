window.frames = function (){
  return {
    frame: null,
    spinner: false,
    upload: false,
    init({where, target}){
      this.where = where;
      this.targetEl = document.querySelector(`[x-frames-target="${target}"`);
    },

    async insert() {
      if (this.$refs.form.checkValidity()) {
        let res = await this.submit();
        if (res) {
          this.targetEl.insertAdjacentHTML(this.where, this.frame);
          this.$refs.form.reset();
        } else {
          new api.flash('error', this.error);
        }
      }
    },

    async send(path, data) {
      const response = await fetch(path, { method: 'POST', body: data });
      const text = await response.text();
      if (response.ok){
        this.frame = text;
      } else {
        this.error = text;
      }
      this.spinner = false;
      return response.ok;
    },
    async submit() {
      this.spinner = true;
      const form = this.$refs.form;
      let formData = new FormData(form)

      return this.send(form.action, formData);
    },

    sizeTextarea(focus){
      if(focus && !this.$refs.content.value.length){
        this.$refs.content.classList.add('h-28');
        this.$refs.content.classList.remove('h-11');
      }
      else if(!focus && !this.$refs.content.value.length){
        this.$refs.content.classList.add('h-11');
        this.$refs.content.classList.remove('h-28');
      }
    }
  }
}
