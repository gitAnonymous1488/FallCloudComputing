const config_json = require("../config.json");

const express = require('express');
const app = express();
const ip = require("ip");

const heartbeats = require('heartbeats');
var NODE_REG_ID = null;



// CONFIG ENTRIES
const port = 4001;
const hb_timer = 1000;


// ############### PG CONNECTION SETTINGS ###############
const db_config = {
	"user": config_json.database_connections.user,
	"password": config_json.database_connections.password,
	"host": config_json.database_connections.host,
	"database": config_json.database_connections.database,
	"port": config_json.database_connections.port
};

const { Pool } = require('pg');
const pool = new Pool(db_config);

pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err);
	process.exit(-1);
});

// ############### PG CONNECTION SETTINGS ###############



// ############### REGISTER THE NODE ON STARTUP ###############
pool.connect((err, client, done) => {
	if (err) throw err;
	ip.address()
	
	client.query("SELECT * FROM insert_node_registration($1);", [ip.address()], (err, res) => {
		done();

		if (err) throw err;

		// Maybe log the err
		NODE_REG_ID = res.rows[0].insert_node_registration;

		// log the registration
	});
});
// ############### REGISTER THE NODE ON STARTUP ###############



// ############### HEARTBEAT THE SERVER ###############
const heart = heartbeats.createHeart(hb_timer);
heart.createEvent(1, function(count, last){
	pool.connect((err, client, done) => {
		if (err) throw err;

		// Make this log an error
		if (NODE_REG_ID == null) throw err;

		client.query("SELECT * FROM insert_node_hb($1);", [NODE_REG_ID], (err, res) => {
			done();

			if (err) throw err;

			// Maybe log the err
			console.log(NODE_REG_ID)
			console.log("Connected");
		});
	});
});
// ############### HEARTBEAT THE SERVER ###############


// app.get('/', (req, res) => res.send('Hello World!'));
app.post("start/:name", (req, res) => res.send("Started"));
app.delete("kill/:pid", (req, res) => res.send("Killed"));


app.listen(port, () => {});