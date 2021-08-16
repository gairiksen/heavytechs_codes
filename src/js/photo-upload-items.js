const photoUploadItems = () => {
  const module = this;

  const photos = JSON.parse(document.querySelector('[data-s3-uppy-photo="form"]').dataset.s3UppyPhotos || '[]') || [];
  module.photoIds = photos.map((photo) => photo.id);

  module.init = () => {
    document.addEventListener('photo-removed', module.removePhoto)
    document.addEventListener('photos-added', module.addPhotos)
  }

  module.removePhoto = (event) => {
    let index = module.photoIds.indexOf(event.detail.photoId);
    if (index > -1) {
      module.photoIds.splice(index, 1);
      module.updatePhotoIdsElement();
    }
  }

  module.addPhotos = (event) => {
    const addedPhotoIds = event.detail.photos.map((photo) => photo.id);
    module.photoIds = module.photoIds.concat(addedPhotoIds);
    module.updatePhotoIdsElement();
  }

  module.updatePhotoIdsElement = () => {
    const photoIdsElement = document.querySelector('[name="item[photo_ids]"]');
    photoIdsElement.value = module.photoIds.join(',');
  }

  module.init();
};
photoUploadItems()
