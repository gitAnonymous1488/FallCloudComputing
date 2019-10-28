/*
	
	TODO: LOG WITH WINSTON
	TODO: GET THE STDOUT AND STDERR FROM exec

*/

const winston = require('winston');
const { exec } = require('child_process');
const config_json = require("../config.json");

const express = require('express');
const app = express();
const ip = require("ip");

const heartbeats = require('heartbeats');
var NODE_REG_ID = null;



// CONFIG ENTRIES
const port = 4001;
const hb_timer = 2000;
const log_file = "combined.log";



const ACCEPTABLE_PROCESS_NAMES 	= ["image_processing", "facial-detection", "facial-recognition"];


// ############### PREVENT CORS ERRR ###############
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({ filename: log_file })
  ]
});
// ############### PREVENT CORS ERRR ###############

logger.info('Process PID: ' + process.pid);

// ############### PREVENT CORS ERRR ###############
app.use(function(req, res, next){
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
	res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
	next();
});

app.all('/', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
	res.header("Access-Control-Allow-Headers", "'Accept, Authorization, Content-Type, X-Requested-With, Range");
	next();
 });
// ############### PREVENT CORS ERRR ###############


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
	if (err) {
		logger.error(err);
		process.exit(1);
	}

	logger.info('opening registration connection to main node.');

	ip.address();
	
	client.query("SELECT * FROM insert_node_registration($1);", [ip.address()], (err, res) => {
		done();

		if (err) {
			logger.error(err);
			process.exit(1);
		}

		// Maybe log the err
		logger.info('Registered with main node.');
		NODE_REG_ID = res.rows[0].insert_node_registration;

		// log the registration
	});
});
// ############### REGISTER THE NODE ON STARTUP ###############



// ############### HEARTBEAT THE SERVER ###############
const heart = heartbeats.createHeart(hb_timer);
heart.createEvent(1, function(count, last){
	pool.connect((err, client, done) => {

		if (err) {
			logger.error(err);
			process.exit(1);
		}

		// Make this log an error
		if (NODE_REG_ID == null) throw err;

		client.query("SELECT * FROM insert_node_hb($1);", [NODE_REG_ID], (err, res) => {
			done();

			if (err) {
				logger.error(err);
				process.exit(1);
			}

			logger.info('Heartbeat Registered.');
		});
	});
});
// ############### HEARTBEAT THE SERVER ###############


app.post("/start/:name", (req, res) => {
	if (!req.params.name) {
		res.status(404).json({"err": "Did not pass in name."});
		return logger.error("Did not pass in name.");
	}

	if (!ACCEPTABLE_PROCESS_NAMES.includes(req.params.name)) {
		res.status(404).json({"err": "Not a valid process name."});
		return logger.error("Not a valid process name.");
	}

	logger.info('Start Request Came In For Name: ' + req.params.name);

	exec("python psql_table.py " + req.params.name + " nohup &", (err, stdout, stderr) => {
		if (err) {
			logger.error(err);
			return res.status(400).json({"err": err});
		}


		res.status(200).json({"result": "started"});

		// MAYBE GET PID OF THE PROCESS THAT STARTED
		logger.info('Start Request For Name: ' + req.params.pid + " Successful.");
	});
});

app.delete("/kill/:pid", (req, res) => {

	logger.info('Kill Request Came In.');

	if (!req.params.pid) {
		res.status(404).json({"err": "Did not pass in pid"});
		return logger.error("Did not pass in pid.");
	}

	logger.info('Kill Request Came In For PID: ' + req.params.pid);

	exec("kill -9 " + req.params.pid, (err, stdout, stderr) => {
		if (err) {
			logger.error(err);
			return res.status(400).json({"err": err});
		}


		// shuold show
		// [2]    25763 killed     python3 psql_table.py
		// console.log(stdout);


		res.status(200).json({"result": "killed"});

		logger.info('Kill Request For PID: ' + req.params.pid + " Successful.");
	});
});


app.listen(port, () => {});