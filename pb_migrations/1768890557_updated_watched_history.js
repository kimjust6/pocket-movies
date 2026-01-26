/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4195867592")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "date1662794098",
    "max": "",
    "min": "",
    "name": "watched_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_4044198014",
    "hidden": false,
    "id": "relation492761711",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "movie",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation2375276105",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "user",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "bool3205036437",
    "name": "succeeded",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4195867592")

  // remove field
  collection.fields.removeById("date1662794098")

  // remove field
  collection.fields.removeById("relation492761711")

  // remove field
  collection.fields.removeById("relation2375276105")

  // remove field
  collection.fields.removeById("bool3205036437")

  return app.save(collection)
})
