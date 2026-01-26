/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3277857102")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "bool4245145851",
    "name": "is_deleted",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3277857102")

  // remove field
  collection.fields.removeById("bool4245145851")

  return app.save(collection)
})
