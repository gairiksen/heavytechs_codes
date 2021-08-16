const photoUploadAvatar = function(){
  const module = this;

  module.init = () => {
    document.addEventListener('photos-added', module.updateAvatar)
  }

  module.updateAvatar = (event) => {
    const photoUrl = event.detail.preview;
    document.querySelectorAll('[data-avatar]').forEach(img => {
      img.src = photoUrl;
    });
  }

  module.init();
};
api.photoUploadAvatar = new photoUploadAvatar();
