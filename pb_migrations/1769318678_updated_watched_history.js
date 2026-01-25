/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4195867592")

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "date1180390397",
    "max": "",
    "min": "",
    "name": "watched",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4195867592")

  // remove field
  collection.fields.removeById("date1180390397")

  return app.save(collection)
})
