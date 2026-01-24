/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3554030554");

  return app.delete(collection);
}, (app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "exceptDomains": null,
        "hidden": false,
        "id": "email3885137012",
        "name": "email",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "email"
      },
      {
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
      },
      {
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
      },
      {
        "hidden": false,
        "id": "bool3948994295",
        "name": "plus_one_allowed",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
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
      },
      {
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
      },
      {
        "exceptDomains": null,
        "hidden": false,
        "id": "email2146834433",
        "name": "plus_one_email",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "email"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2150850817",
        "max": 0,
        "min": 0,
        "name": "dietary_restrictions",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
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
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3554030554",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_KWt18vcuMf` ON `invitations` (`email`)"
    ],
    "listRule": null,
    "name": "invitations",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
})
