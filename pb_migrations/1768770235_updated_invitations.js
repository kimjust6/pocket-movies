/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3554030554")

  // add field
  collection.fields.addAt(1, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "email3885137012",
    "name": "email",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "email"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2849095986",
    "max": 0,
    "min": 0,
    "name": "first_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3356015194",
    "max": 0,
    "min": 0,
    "name": "last_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3672223031",
    "max": 0,
    "min": 0,
    "name": "plus_one_first_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2154646538",
    "max": 0,
    "min": 0,
    "name": "plus_on_last_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "bool3948994295",
    "name": "plus_one_allowed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3758166635",
    "max": 0,
    "min": 0,
    "name": "rsvp_status",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3554030554")

  // remove field
  collection.fields.removeById("email3885137012")

  // remove field
  collection.fields.removeById("text2849095986")

  // remove field
  collection.fields.removeById("text3356015194")

  // remove field
  collection.fields.removeById("text3672223031")

  // remove field
  collection.fields.removeById("text2154646538")

  // remove field
  collection.fields.removeById("bool3948994295")

  // remove field
  collection.fields.removeById("text3758166635")

  return app.save(collection)
})
