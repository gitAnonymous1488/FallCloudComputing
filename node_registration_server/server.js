/*
	
	TODO: LOG WITH WINSTON
	TODO: GET THE STDOUT AND STDERR FROM exec

*/

// const winston = require('winston');

const fs = require("fs");
const {transports, createLogger, format} = require('winston');
const { spawn, exec } = require('child_process');
const config_json = require("./config.json");
const util = require('util');

const express = require('express');
const app = express();
const ip = require("ip");

const read_last_lines = require('read-last-lines');

const heartbeats = require('heartbeats');
var NODE_REG_ID = null;



// CONFIG ENTRIES
const port        = config_json.node_registration_info.port;
const hb_timer    = config_json.node_registration_info.heartbeat_timer;
const log_file    = config_json.node_registration_info.logging_file;

// ALLOW DYNAMIC CHANGES TO SOME SETTINGS
let heartbeat_log = config_json.node_registration_info.logging_settings.heartbeat;

const ACCEPTABLE_PROCESS_NAMES 	= ["image_processing", "facial-detection", "facial-recognition"];

// ############### PREVENT CORS ERRR ###############
const logger = createLogger({
	level: 'debug',
	format: format.combine(
		format.timestamp(),
		format.json(),
		format.printf(info => "[" + info.timestamp + "][" + info.level.padStart(8, " ") + "] --- " + info.message.padEnd(100, " "))
	),
	transports: [
		new transports.File({ filename: log_file, 'timestamp':true })
	]
});
// ############### PREVENT CORS ERRR ###############

logger.debug(util.format('%s (%s)', ('Process PID: ' + process.pid).padEnd(80, " "), "BASE"));

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
	"user": 		config_json.database_connections.user,
	"password": 	config_json.database_connections.password,
	"host": 		config_json.database_connections.host,
	"database": 	config_json.database_connections.database,
	"port": 		config_json.database_connections.port
};

const { Pool } = require('pg');
const pool = new Pool(db_config);

pool.on('error', (err, client) => {
	logger.error(util.format('%s (%s)', ("PG Pool received an error.").padEnd(80, " "), "BASE"));
	logger.error(util.format('%s (%s)', (err).padEnd(80, " "), "BASE"));
	process.exit(-1);
});

// ############### PG CONNECTION SETTINGS ###############



// ############### REGISTER THE NODE ON STARTUP ###############
pool.connect((err, client, done) => {
	if (err) {
		logger.error(util.format('%s (%s)', ("Unable to connect to DB through the pool for insert_node_registration.").padEnd(80, " "), "BASE"));
		logger.error(util.format('%s (%s)', (err).padEnd(80, " "), "BASE"));
		process.exit(1);
	}

	logger.debug(util.format('%s (%s)', ("Opening registration connection to main node.").padEnd(80, " "), "BASE"));
	
	client.query("SELECT * FROM insert_node_registration($1);", [ip.address()], (err, res) => {
		done();

		if (err) {
			logger.error(util.format('%s (%s)', ("Unable to perform insert_node_registration").padEnd(80, " "), "BASE"));
			logger.error(util.format('%s (%s)', (err).padEnd(80, " "), "BASE"));
			process.exit(1);
		}

		logger.debug(util.format('%s (%s)', ("Registered with main node.").padEnd(80, " "), "BASE"));
		NODE_REG_ID = res.rows[0].insert_node_registration;
	});
});
// ############### REGISTER THE NODE ON STARTUP ###############



// ############### HEARTBEAT THE SERVER ###############
const heart = heartbeats.createHeart(hb_timer);
heart.createEvent(1, function(count, last){
	pool.connect((err, client, done) => {

		if (err) {
			logger.error(util.format('%s (%s)', ("Unable to connect to DB through the pool for insert_node_hb.").padEnd(80, " "), "NODE HEARTBEAT"));
			logger.error(util.format('%s (%s)', (err).padEnd(80, " "), "BASE"));
			process.exit(1);
		}

		// Make this log an error
		if (NODE_REG_ID == null) {
			logger.error(util.format('%s (%s)', ("NODE_REG_ID has not been registered and is null.").padEnd(80, " "), "NODE HEARTBEAT"));
			process.exit(1);
		}

		client.query("SELECT * FROM insert_node_hb($1);", [NODE_REG_ID], (err, res) => {
			done();

			if (err) {
				logger.error(util.format('%s (%s)', ("Unable to perform insert_node_hb").padEnd(80, " "), "NODE HEARTBEAT"));
				logger.error(util.format('%s (%s)', (err).padEnd(80, " "), "NODE HEARTBEAT"));
				process.exit(1);
			}

			if (heartbeat_log) logger.debug(util.format('%s (%s)', ("Node Heartbeat Registered.").padEnd(80, " "), "NODE HEARTBEAT"));
		});
	});
});
// ############### HEARTBEAT THE SERVER ###############

app.get("/logs/:pid", (req, res) => {
	let pid = req.params.pid;
	let request_ip = req.connection.remoteAddress.split(":")[req.connection.remoteAddress.split(":").length - 1];
	
	if (!req.params.pid) {
		res.status(404).json({"err": "Request Did Not Include PID For Logs"});
		return logger.error(util.format("%s [%s](%s)", ("Request Did Not Include PID For Logs.").padEnd(65, " "), request_ip, "/logs"));
	}

	let file_str = util.format("../python_process/logs/process_%s.log", pid)

	console.log(file_str);

	if (!fs.existsSync(file_str)) {
		res.status(404).json({"err": "Request Log For PID, " + pid + ", Does Not Exist."});
		return logger.error(util.format("%s [%s](%s)", ("Request Log For PID, " + pid + ", Does Not Exist.").padEnd(65, " "), request_ip, "/logs"));
	}

	read_last_lines.read(file_str, 50)
	               .then((lines) => { res.status(200).json({"result": lines}); });
});

app.post("/start/:name", (req, res) => {
	let request_ip = req.connection.remoteAddress.split(":")[req.connection.remoteAddress.split(":").length - 1];

	if (!req.params.name) {
		res.status(404).json({"err": "Request Did Not Include Step Name."});
		return logger.error(util.format('%s [%s](%s)', ("Request Did Not Include Step Name.").padEnd(65, " "), request_ip, "/start"));
	}

	if (!ACCEPTABLE_PROCESS_NAMES.includes(req.params.name)) {
		res.status(404).json({"err": "Request Did Not Include A Valid Process Name."});
		return logger.error(util.format('%s [%s](%s)', ("Request Did Not Include A Valid Process Name.").padEnd(65, " "), request_ip, "/start"));
	}

	logger.debug(util.format('%s (%s)', ("Starting Request Came In For Name:" + req.params.name).padEnd(80, " "), "/start"));

	// start the process
	logger.debug(util.format('%s (%s)', (["python", "../python_process/python_process.py", req.params.name, "nohup", "&"].join(" ")).padEnd(80, " "), "/start"));
	let subproc = spawn("python", ["../python_process/python_process.py", req.params.name, "nohup", "&"], {detached: true});
	let subproc_pid = subproc.pid;

	// detach the subprocess
	subproc.unref();
	logger.debug(util.format('%s (%s)', ("PID: " + subproc_pid + " Successful.").padEnd(80, " "), "/start"));
	
	// send the response
	res.status(200).json({"result": "started"});

});

app.delete("/kill/:pid", (req, res) => {
	let request_ip = req.connection.remoteAddress.split(":")[req.connection.remoteAddress.split(":").length - 1];

	logger.info('Kill Request Came In.');

	if (!req.params.pid) {
		res.status(404).json({"err": "Did not pass in pid"});
		return logger.error(util.format('%s [%s](%s)', ("Did not pass in pid.").padEnd(65, " "), request_ip, "/kill"));
	}

	logger.info(util.format('%s (%s)', ('Kill Request Came In For PID: ' + req.params.pid).padEnd(80, " "), "/kill"));
	
	exec("kill -9 " + req.params.pid, (err, stdout, stderr) => {
		if (err) {
			res.status(400).json({"err": err});
			return logger.error(util.format('%s [%s](%s)', (err).padEnd(65, " "), request_ip, "/kill"));
		}


		res.status(200).json({"result": "killed"});

		logger.info(util.format('%s (%s)', ('Kill Request For PID: ' + req.params.pid + " Successful.").padEnd(80, " "), "/kill"));
	});
	
});


app.listen(port, () => {});
