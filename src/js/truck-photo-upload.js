import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import GoldenRetriever from '@uppy/golden-retriever';
import AWSS3 from '@uppy/aws-s3';
import Webcam from '@uppy/webcam';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import '@uppy/webcam/dist/style.min.css';
import apiFetch from './apiFetch'

const _form = document.querySelector('[data-s3-uppy-truck-photo="form"]');
const maxNumberOfFiles = _form.dataset.s3UppyMaxNumberOfFiles;
const note = _form.dataset.s3UppyNote;
const photos = JSON.parse(_form.dataset.s3UppyPhotos || '[]') || [];
const updateImgSelector = _form.dataset.updateImgSelector;
let photoIds = photos.map((photo) => photo.id);
const photoIdsElement = document.querySelector('[name="item[photo_ids]"]');
const itemsPhotos = !!photoIdsElement;

const uppy = Uppy({
  autoProceed: photos.length == 0,
  restrictions: {
    maxFileSize: 9097152, // Limit size to 2 MB on the javascript side
    maxNumberOfFiles: maxNumberOfFiles,
    allowedFileTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
});

const createPhoto = (imageUrl) => {
  const objectUuid = _form.dataset.s3UppyObjectUuid;
  const photoType = _form.dataset.s3UppyPhotoType;
  const userId = _form.dataset.s3UppyUserId;
  // Create model for this user with s3 image url
  return apiFetch('/api/truck_photos', {
    body: JSON.stringify({ photo: { direct_url: imageUrl, photo_type: photoType, object_uuid: objectUuid, user_id: userId } })
  });
};

const deletePhoto = (photoId) => {
  if (itemsPhotos){
    removePhotoFromForm(photoId);
  } else {
    return apiFetch('/api/photos', {
      method: 'DELETE',
      body: JSON.stringify({ photo: { id: photoId } })
    });
  }
};

const loadExistingPhotos = async (photos) => {
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const response = await fetch(photo.photo.url);
    const blob = await response.blob();
    uppy.addFile({
      name: photo.photo.file_name,
      type: blob.type,
      data: blob,
      meta: { photoId: photo.id },
      remote: true
    });
  }
  uppy.getFiles().forEach(file => {
    uppy.setFileState(file.id, {
      progress: { uploadComplete: true, percentage: 100, uploadStarted: Date.now() }
    })
  });
};

const updateImages = (photo) => {
  if (updateImgSelector){
    const photoUrl = photo.preview;
    document.querySelectorAll(updateImgSelector).forEach(img => {
      img.src = photoUrl;
    });
  }
}

const addPhotosToForm = (photos) => {
  photoIds = photoIds.concat(photos.map((photo) => photo.id));
  updatePhotoIdsElement(photoIds);
}

const removePhotoFromForm = (photoId) => {
  var index = photoIds.indexOf(photoId);
  if (index > -1) photoIds.splice(index, 1);
  updatePhotoIdsElement(photoIds);
}

const updatePhotoIdsElement = () => {
  photoIdsElement.value = photoIds.join(',');
}

uppy.use(Dashboard,
  {
    inline: true,
    replaceTargetContent: true,
    showProgressDetails: true,
    target: '#truck-images',
    note: note,
    width: '100%',
    height: 300,
    proudlyDisplayPoweredByUppy: false,
    showRemoveButtonAfterComplete: true,
    locale: {
      strings: {
        dropPasteImport: 'Drag & drop, paste, or %{browse} to upload file',
        browse: 'browse your computer',
      },
    },
  })
  .use(Webcam, { target: Dashboard, modes: ['picture'] })
  // .use(GoldenRetriever)
  .use(AWSS3, {
    getUploadParameters() {
      // 1. Get URL to post to from action attribute
      const _url = _form.getAttribute('action');
      // 2. Create Array from FormData object to make it easy to operate on
      const _formDataArray = Array.from(new FormData(_form));
      // 3. Create a JSON object from array
      const _fields = _formDataArray.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {});

      // 4. Return resolved promise with Uppy. Uppy it will add file in file param as the last param
      return Promise.resolve({
        method: 'POST',
        url: _url,
        fields: _fields,
      });
    },
  });

uppy.on('complete', ({ failed, successful }) => {
  Promise.all(
    successful.map((file) => {
      return createPhoto(file.response.body.location)
        .then((photo) => {
          uppy.setFileMeta(file.id, { photoId: photo.id });
          return photo;
        })
    })
  ).then((photos) => {
    if (itemsPhotos) addPhotosToForm(photos);
    updateImages(successful[0]);
  })
});

uppy.on('file-removed', (file, reason) => {
  if (file.meta.photoId) deletePhoto(file.meta.photoId);
})

loadExistingPhotos(photos);
