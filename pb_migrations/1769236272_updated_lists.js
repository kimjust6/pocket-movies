/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3277857102")

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool1811784642",
    "name": "is_public",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3277857102")

  // remove field
  collection.fields.removeById("bool1811784642")

  return app.save(collection)
})
