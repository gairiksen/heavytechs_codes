set -eu

cd seed
gunzip -k data.csv.gz

ruby convert.rb

cd images
zip -r ../images.zip sample_item_photo/ sample_profile_photo sample_merchant_logo
cd -

zip data models.csv users.csv
cp categories-i18n.en.txt ../app/translations/en/en_categories.yml
