require 'securerandom'
require 'csv'
require 'json'
require 'set'
require 'yaml'

source = CSV.read('./data.csv', headers: true)
category_list = File.read('./categories.txt').lines.map(&:strip)
item_images = File.read('./item_images.txt').lines.map(&:strip).map(&:to_s)
profile_images = File.read('./profile_images.txt').lines.map(&:strip).map(&:to_s)

def to_cat(cat)
  JSON
    .parse(cat)
    .first
    .gsub(' >> ', '/')
    .gsub('\'', '')
    .gsub('&', 'n')
    .gsub(' ', '_')
    .gsub(/.\(.*\)/, '')
    .downcase
end

def photo_for(object_uuid, file_path, photo_type: 'photo')
  file_name = File.basename(file_path)
  {
    "photo": {
      "path": file_path,
      "versions": {
        "tiny": file_path,
        "small": file_path,
        "uncropped": file_path,
        "uncropped_webp": file_path,
      },
      "extension": File.extname(file_name),
      "file_name": file_name
    },
    "photo_type": photo_type,
    "object_uuid": object_uuid
  }
end

def item_detail_for(item, lang)
  {
    "item_id": item['_id'],
    "lang": lang,
    "name": text_translation(item['name'], lang),
    "description": text_translation(item['description'], lang)
  }
end

def text_translation(text, lang)
  return text if lang == 'en'

  "#{lang}#{text}"
end

now = Time.now.utc.to_s

items = []
items_inventories = []
items_details = []
statuses = []
categories = []

start_sequence = 0
id_sequence = -> { (start_sequence += 1).to_s }

# user_id == profile.id
profiles = [
  { uuid: 'ed034dc5-540e-42ab-9453-75ece6abb7f2', user_id: id_sequence.call, slug: 'yan-seller', name: 'Yan Seller', last_name: 'Yan', first_name: 'Seller' },
  { uuid: 'ffec6d59-76ba-40d7-a0a1-b594c038c058', user_id: id_sequence.call, slug: 'anton-admin', name: 'Anton Admin', last_name: 'Anton', first_name: 'Admin', permissions: '{"superadmin": true}' },
  { uuid: '60593c97-165a-4a52-8e91-e26ae77f1cb8', user_id: id_sequence.call, slug: 'frank-buyer', name: 'Frank Buyer', last_name: 'Frank', first_name: 'Buyer' },
  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222fbf', user_id: id_sequence.call, slug: 'ann-random', name: 'Ann Random', last_name: 'Ann', first_name: 'Random' },
  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222fbc', user_id: id_sequence.call, slug: 'roy-lurker', name: 'Roy Lurker', last_name: 'Roy', first_name: 'Lurker' },

  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222fm1', user_id: id_sequence.call, slug: 'employee-a-1', name: 'employee A1', last_name: 'A1', first_name: 'employee' }, # 6
  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222fm2', user_id: id_sequence.call, slug: 'employee-b-1', name: 'employee B1', last_name: 'B1', first_name: 'employee' },
  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222fm3', user_id: id_sequence.call, slug: 'employee-c-1', name: 'employee C1', last_name: 'C1', first_name: 'employee' },
  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222fm4', user_id: id_sequence.call, slug: 'employee-c-2', name: 'employee C2', last_name: 'C2', first_name: 'employee' }  # 9
]

organizations = [
  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222foa', slug: 'organization-a', name: 'Organization A',
    contact_emails: 'employee-a-1@getmarketplace.co', offline_stores: ['Blue store', 'Red store'], _id: id_sequence.call,
    promoted: true, shipping_types: %w[personal_pickup delivery], delivery_fee: 300,
    logo: { "path": 'sample_merchant_logo/pos.jpg', "versions": {}, "extension": 'jpg', "file_name": 'pos.jpg' }
  }, # 10
  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222fob', slug: 'organization-b', name: 'Organization B',
    contact_emails: 'employee-b-1@getmarketplace.co', offline_stores: ['White store', 'Black store'],
    _id: id_sequence.call, promoted: true, shipping_types: %w[personal_pickup delivery], delivery_fee: 400,
    logo: { "path": 'sample_merchant_logo/pos.jpg', "versions": {}, "extension": 'jpg', "file_name": 'pos.jpg' }
  }, # 11
  { uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222foc', slug: 'organization-c', name: 'Organization C',
    contact_emails: 'employee-c-1@getmarketplace.co', offline_stores: ['Orange store', 'Yellow store'],
    _id: id_sequence.call, promoted: true, shipping_types: %w[personal_pickup delivery], delivery_fee: 450,
    logo: { "path": 'sample_merchant_logo/pos.jpg', "versions": {}, "extension": 'jpg', "file_name": 'pos.jpg' }
  }  # 12
]

groups = [
  {
    name:        'main',
    summary:     'Main group for posts, questions',
    content_type: 'question',
    description: 'Main group for posts, questions',
    uuid:        '2c8a51e2-291f-4f0d-94ea-ec010g222fmg',
    group_type: 'custom',
    ask_to_join: 'no',
    meta_visible: 'anonymous',
    content_visible: 'anonymous',
    approve_request: 'anonymous',
    post_content: 'anonymous',
    invite_member: 'anonymous'
  }
]

# user_id == profile.id thus we user_id as
memberships = [
  { _id: id_sequence.call, name: 'membership', uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222ma1', l_id: '6', r_id: '10', l_accepted_at: now, r_accepted_at: now },
  { _id: id_sequence.call, name: 'membership', uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222mb1', l_id: '7', r_id: '11', l_accepted_at: now, r_accepted_at: now },
  { _id: id_sequence.call, name: 'membership', uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222mc1', l_id: '8', r_id: '12', l_accepted_at: now, r_accepted_at: now },
  { _id: id_sequence.call, name: 'membership', uuid: '2c8a51e2-291f-4f0d-94ea-ec010c222mc2', l_id: '9', r_id: '12', l_accepted_at: now, r_accepted_at: now }
]

categories = category_list.map { |c| { key: c, uuid: SecureRandom.uuid } }

source.take(5000).map do |row|
  uuid = SecureRandom.uuid
  owner = profiles.sample[:user_id]
  owner = organizations.sample[:_id]
  item = {
    _id: id_sequence.call,
    item_inventory_id: id_sequence.call,
    price: row['price'].to_f < 1000 ? 1099 : row['price'].to_i,
    tax_rate: 10,
    category: category_list.sample,
    uuid: uuid,
    currency: 'usd',
    owner: owner,
    promoted: rand(1..10) > 9,
    c__status: 'app.statuses.items.published'
  }
  item[:original_price] = rand(1..50) > 49 ? item[:price] * 1.1 : nil

  item_inventory = {
    _id: item[:item_inventory_id],
    item_id: item[:_id],
    owner: owner,
    sku: "SKU-#{item[:item_inventory_id]}",
    quantity: rand(1..5),
    c__status: 'app.statuses.items.published'
  }
  item_inventory[:max_in_one_order] = rand(3..5)

  statuses << {
    profile_id: owner,
    object_id: item_inventory[:_id],
    fullname: 'app.statuses.items.published',
    scope: 'app.statuses.items',
    name: 'app.statuses.items.published',
    timestamp: now
  }
  item_detail_en_id = id_sequence.call
  item_detail_en = {
    _id: item_detail_en_id,
    item_id: item[:_id],
    lang: 'en',
    name: row['name'],
    description: row['description'],
    slug: row['name'].downcase.strip.gsub(' ', '-').gsub(/[^\w-]/, '') + "-#{item_detail_en_id}"
  }

  items << item
  items_inventories << item_inventory
  items_details << item_detail_en
end

output = CSV.generate do |csv|
  csv << %w[id properties model_schema created_at updated_at]

  profiles.each do |profile|
    # adds profile
    csv << [profile[:user_id], profile.to_json, 'profile', now, now]
    # adds profile photo
    csv << [id_sequence.call, photo_for(profile[:uuid], profile_images.sample, photo_type: 'avatar').to_json, 'photo', now, now]
  end

  organizations.each do |item|
    csv << [item.delete(:_id), item.to_json, 'organization', now, now]

    # csv << [id_sequence.call, photo_for(item[:uuid], item_images.sample).to_json, 'photo', now, now]
  end

  memberships.each do |item|
    csv << [item.delete(:_id), item.to_json, 'relationship', now, now]

    csv << [id_sequence.call, photo_for(item[:uuid], item_images.sample).to_json, 'photo', now, now]
  end

  items.each do |item|
    csv << [item.delete(:_id), item.to_json, 'item', now, now]

    csv << [id_sequence.call, photo_for(item[:uuid], item_images.sample).to_json, 'photo', now, now]
  end

  items_inventories.each do |item|
    csv << [item.delete(:_id), item.to_json, 'item_inventory', now, now]
  end

  items_details.each do |item|
    csv << [item.delete(:_id), item.to_json, 'item_detail', now, now]
  end

  statuses.each do |item|
    csv << [id_sequence.call, item.to_json, 'status', now, now]
  end

  categories.each do |item|
    csv << [id_sequence.call, item.to_json, 'category', now, now]
  end

  groups.each do |item|
    csv << [id_sequence.call, item.to_json, 'group', now, now]
  end
end

File.open('./models.csv', 'w') do |f|
  f.puts output
end
