/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4195867592")

  // remove field
  collection.fields.removeById("date1662794098")

  return app.save(collection)
}, (app) => {
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

  return app.save(collection)
})
