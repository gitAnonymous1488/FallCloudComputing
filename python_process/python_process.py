import threading, time, sys, uuid, select, os, socket, logging, json, random
import psycopg2, platform, netifaces, psutil
from psycopg2.extensions import STATUS_BEGIN, STATUS_READY
import read_configs

# So it doesnt matter where it is called from, It will run under its own
os.chdir(os.path.dirname(__file__))

# TODO: PUT THIS IN THE CONFIG
SELECT_TIMEOUT 				= 1
HEARTBEAT_SLEEP 			= 1
MISSED_HEARTBEAT_KILL 		= 2
ACCEPTABLE_PROCESS_NAMES 	= ["image_processing", "facial-detection", "facial-recognition"]
READY 						= 0
BUSY 						= 1
STATE_TRANSLATION 			= {READY: "READY", BUSY: "BUSY"}
DEBUG_THREADING 			= True
DEBUG_IMG_PROC_LOG 			= True
DEBUG_IMG_FD_LOG 			= True
UPDATE_CHANNEL 				= "process_update"
# UPDATE_CHANNEL				= None
THREAD_CYCLE_TIME 			= 10
# 

if not os.path.exists("logs"):
	os.mkdir("logs")

try:
	HOST_IP 			= netifaces.ifaddresses('enp0s31f6')[2][0]["addr"]
except ValueError as e:
	HOST_IP 			= netifaces.ifaddresses('eno1')[2][0]["addr"]
except Exception as e:
	print(e)
	exit()

PID 				= os.getpid()
NAME 				= None
REGISTER_STR 		= "SELECT * FROM insert_process_registration(%s,%s,%s);"
HB_STR 				= "SELECT * FROM insert_process_hb(%s);"
REGISTRATION_ID		= None
RAM_USAGE 			= psutil.Process(os.getpid())
THREAD_LIST 		= []
THREAD_LIST_LOCK 	= threading.Lock()
PG_CONN_LOCK		= threading.Lock()

# RAM_USAGE.memory_info().rss

###############					 REMOVE THE EXIT CONDITION !!!
if __name__ == "__main__":
	try:
		file_content = read_configs.retrieve_config()
	except Exception as e:
		exit("Unable to read config file. {}".format(e))

	# CHANNEL 		= file_content["database_connections"]["channel"]
	CHANNEL 		= None
	HOST 			= file_content["database_connections"]["host"]
	PASS 			= file_content["database_connections"]["password"]
	USER 			= file_content["database_connections"]["user"]
	DBNAME 			= file_content["database_connections"]["database"]
else:
	exit("Havent Defined Connection Details On When Running This Second Hand.")

CONN_STR = "dbname={dbname} user={dbuser} password={dbpass} host={host}"

if __name__ == "__main__":
	FRMT_CONN_STR = CONN_STR.format(dbname=DBNAME,dbuser=USER,dbpass=PASS,host=HOST)


try:
	log_file = os.path.dirname(__file__) + os.sep + file_content["logging_files"]["python_process_logging"].format(PID)
	logging.basicConfig(filename=log_file,  format='%(asctime)s %(message)s', filemode='w') 
except Exception as e:
	print(e)
	exit()

LOGGER = logging.getLogger()

class db_heartbeat_thread(threading.Thread):
	def __init__(self):
		threading.Thread.__init__(self)

		try:
			self.hb_conn = psycopg2.connect(FRMT_CONN_STR)
			self.hb_conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
		except Exception as e:
			exit("You CANNOT Connect To The DB. {}".format(e))

		self.uuid = uuid.uuid4()


	def run(self):
		global MISSED_HEARTBEAT_KILL

		miss_count = 0

		if self.hb_conn.status != STATUS_READY:
			return None

		time.sleep(HEARTBEAT_SLEEP)

		with self.hb_conn.cursor() as curs:
			while self.hb_conn.status == STATUS_READY:

				if REGISTRATION_ID is not None:
					curs.execute(HB_STR, (REGISTRATION_ID, ))
					miss_count = 0
				elif MISSED_HEARTBEAT_KILL < miss_count:
					os.system('kill -9 %d' % PID)
				else:
					miss_count += 1

				time.sleep(HEARTBEAT_SLEEP)


class process_stuff_thread(threading.Thread):
	def __init__(self, callback, payload):
		threading.Thread.__init__(self)

		try:
			self.proc_conn = psycopg2.connect(FRMT_CONN_STR)
			self.proc_conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
		except Exception as e:
			exit("You CANNOT Connect To The DB. {}".format(e))

		self.uuid = uuid.uuid4()
		self.callback = callback
		self.payload = payload


	def set_payload(self, payload):
		self.payload = payload


	def run(self):
		global LOGGER, NAME, UPDATE_CHANNEL, PID, READY, BUSY

		err = None

		if self.payload:

			LOGGER.debug("RUNNING TASK")

			payload = None

			try:
				payload = json.loads(self.payload)
			except Exception as e:
				LOGGER.error("Unable to convert notification payload string to JSON")
				LOGGER.error(self.payload)
				LOGGER.error(e)

			if payload["table"] == "user_submission_table" and NAME == "image_processing":

				while True:

					contents, altered_img_path = None, None

					with self.proc_conn.cursor() as curs:
						
						try:
							curs.execute("SELECT * FROM user_submission_retrieve();")
							contents = curs.fetchone()
						except Exception as e:
							LOGGER.error("Unable to perform user_submission_retrieve.")
							LOGGER.error(e)
							err = "Unable to perform user_submission_retrieve."
							break

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("Retrieved user_submission_retrieve contents")
					if DEBUG_IMG_PROC_LOG: LOGGER.debug(contents)

					if contents is None or len(contents) != 4:
						LOGGER.error("Something is wrong with the user_submission_retrieve return result")
						LOGGER.error(contents)
						err = "Something is wrong with the user_submission_retrieve return result"
						break

					with self.proc_conn.cursor() as curs:
						try:
							msg = {
								"channel": UPDATE_CHANNEL, "update": "start_job", "registration_id": REGISTRATION_ID,
								"pid": PID, "job_id": contents[1], "name": NAME
							}
							curs.execute("SELECT pg_notify(%s, %s);", (UPDATE_CHANNEL, json.dumps(msg)))
						except Exception as e:
							LOGGER.error("Unable to notify the state update.")
							LOGGER.error(e)

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("About to start image_processing.")

					altered_img_path = img_processing(contents[2])

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("Finished Image Processing.")

					with self.proc_conn.cursor() as curs:
						try:
							msg = {
								"channel": UPDATE_CHANNEL, "update": "finnish_job", "registration_id": REGISTRATION_ID,
								"pid": PID, "job_id": contents[1], "name": NAME
							}
							curs.execute("SELECT pg_notify(%s, %s);", (UPDATE_CHANNEL, json.dumps(msg)))
							# self.connection.commit()
						except Exception as e:
							LOGGER.error("Unable to notify the state update.")
							LOGGER.error(e)

					if altered_img_path is None:
						LOGGER.error("Did Not Receive the altered image path.")
						err = "Did Not Receive the altered image path."
						break

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("altered_img_path = {}".format(altered_img_path))

					with self.proc_conn.cursor() as curs:
						
						try:
							curs.execute("SELECT * FROM image_processing_insert(%s,%s,%s);", (contents[1], contents[2], altered_img_path))
							contents = curs.fetchone()
						except Exception as e:
							LOGGER.error("Unable to perform image_processing_insert.")
							LOGGER.error(e)
							err = "Unable to perform image_processing_insert."
							break

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("Finished Inserting into image_processing_insert.")

			elif payload["table"] == "image_processing_result" and NAME == "facial-detection":


				while True:

					contents, bounding_box = None, None

					with self.proc_conn.cursor() as curs:
						
						try:
							curs.execute("SELECT * FROM image_processing_retrieve();")
							contents = curs.fetchone()
						except Exception as e:
							err = "Unable to perform image_processing_retrieve."
							LOGGER.error(err)
							LOGGER.error(e)
							# break

					if err: break

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("Retrieved image_processing_retrieve contents")
					if DEBUG_IMG_PROC_LOG: LOGGER.debug(contents)

					if contents is None or len(contents) != 5:
						err = "Something is wrong with the image_processing_retrieve return result"
						LOGGER.error(err)
						LOGGER.error(contents)
						# break

					if err: break

					with self.proc_conn.cursor() as curs:
						try:
							msg = {
								"channel": UPDATE_CHANNEL, "update": "start_job", "registration_id": REGISTRATION_ID,
								"pid": PID, "job_id": contents[1], "name": NAME
							}
							curs.execute("SELECT pg_notify(%s, %s);", (UPDATE_CHANNEL, json.dumps(msg)))
						except Exception as e:
							LOGGER.error("Unable to notify the state update.")
							LOGGER.error(e)

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("About to start Facial Detection.")

					bounding_box = facial_detection(contents[2])

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("Finished Facial Detection.")
					# if DEBUG_IMG_PROC_LOG: LOGGER.debug(bounding_box)

					with self.proc_conn.cursor() as curs:
						try:
							msg = {
								"channel": 	UPDATE_CHANNEL, "update": "finnish_job", "registration_id": REGISTRATION_ID,
								"pid": PID, "job_id": contents[1], "name": NAME
							}
							curs.execute("SELECT pg_notify(%s, %s);", (UPDATE_CHANNEL, json.dumps(msg)))
							# self.connection.commit()
						except Exception as e:
							LOGGER.error("Unable to notify the state update.")
							LOGGER.error(e)

					# if DEBUG_IMG_PROC_LOG: LOGGER.debug(bounding_box)

					if bounding_box is None:
						err = "Did Not Receive the bounding box of a face."
						LOGGER.error(err)
						# break

					# if DEBUG_IMG_PROC_LOG: LOGGER.debug(bounding_box)

					if err: break

					if DEBUG_IMG_PROC_LOG: LOGGER.debug(bounding_box)

					with self.proc_conn.cursor() as curs:
						
						try:
							curs.execute("SELECT * FROM facial_detection_insert(%s,%s,%s,%s,%s,%s,%s);", 
									(contents[1], contents[2], contents[3], bounding_box[0], bounding_box[1], bounding_box[2], bounding_box[3]))
							contents = curs.fetchone()
						except Exception as e:
							err = "Unable to perform facial_detection_insert."
							LOGGER.error(err)
							LOGGER.error(e)

					if err: break

					if DEBUG_IMG_PROC_LOG: LOGGER.debug("Finished Inserting into facial_detection_insert.")


			LOGGER.debug("FINISHED TASK")
		self.callback(READY)
		self.proc_conn.close()
		self.exit()




class db_process_thread(threading.Thread):
	def __init__(self):
		threading.Thread.__init__(self)

		try:
			self.connection = psycopg2.connect(FRMT_CONN_STR)
			self.connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
		except Exception as e:
			exit("You CANNOT Connect To The DB. {}".format(e))

		self.curs = None
		self.uuid = uuid.uuid4()
		self.state = 0

		self.register()
		self.child_thread_list = []


	def register(self):
		global REGISTRATION_ID, NAME

		if self.connection.status != STATUS_READY:
			# make this log
			exit("Cannot register")

		with self.connection.cursor() as curs:
			curs.execute(REGISTER_STR, [NAME, PID, HOST_IP])
			for row in curs.fetchone():
				REGISTRATION_ID = row



	def run(self):
		global LOGGER, STATE, PID, THREAD_LIST, CHANNEL, NAME

		if self.connection.status != STATUS_READY:
			return None

		def set_state(state):
			self.set_state(state)

		# got_select = True
		self.set_state(BUSY)
		# "image_processing", "facial-detection", "facial-recognition"
		if NAME == "image_processing": payload = json.dumps({"table": "user_submission_table"})
		if NAME == "facial-detection": payload = json.dumps({"table": "image_processing_result"})
		process_thread = process_stuff_thread(set_state, payload)
		process_thread.start()
		THREAD_LIST_LOCK.acquire()
		THREAD_LIST.append(process_thread)
		THREAD_LIST_LOCK.release()

		while self.connection.status == STATUS_READY:
			got_select = False
			PG_CONN_LOCK.acquire()
			with self.connection.cursor() as curs:

				try:
					curs.execute("LISTEN {0};".format(CHANNEL))
				except Exception as e:
					LOGGER.error("Unable to listen on the channel for my stuff.")
					LOGGER.error(e)

				if select.select([self.connection],[],[],SELECT_TIMEOUT) != ([],[],[]):
					self.connection.poll()
					while self.connection.notifies:
						notif = self.connection.notifies.pop(0)
						LOGGER.debug("Got NOTIFY: PID: {}, CHANNEL: {}, PAYLOAD: {}".format( notif.pid, notif.channel, notif.payload))
						if self.state == READY:
							def set_state(state):
								self.set_state(state)

							got_select = True

							
							process_thread = process_stuff_thread(set_state, notif.payload)
							process_thread.start()
							THREAD_LIST_LOCK.acquire()
							THREAD_LIST.append(process_thread)
							THREAD_LIST_LOCK.release()

			PG_CONN_LOCK.release()

			if got_select:
				self.set_state(BUSY)


# LOOK TO THREAD THIS AND MAKE IT SAFE SO I DONT OPEN ANOTHER CONNECTION!
	def set_state(self, state):
		global REGISTRATION_ID, STATE_TRANSLATION, NAME, UPDATE_CHANNEL, PID
		self.state = state

		with psycopg2.connect(FRMT_CONN_STR) as conn:
			with conn.cursor() as curs:
				try:
					msg = {
						"channel": UPDATE_CHANNEL, "update": "state_update", "registration_id": REGISTRATION_ID,
						"pid": PID, "state": STATE_TRANSLATION[state], "name": NAME
					}
					curs.execute("SELECT pg_notify(%s, %s);", (UPDATE_CHANNEL, json.dumps(msg)))
				except Exception as e:
					LOGGER.error("Unable to notify the state update.")
					LOGGER.error(e)


# I WANT TO THREAD THIS
def img_processing(photo_path):
	global LOGGER,DEBUG_IMG_PROC_LOG
	if DEBUG_IMG_PROC_LOG: LOGGER.debug("Processing...")
	time.sleep(random.randint(1, 3))
	if DEBUG_IMG_PROC_LOG: LOGGER.debug("Processing...")
	return "new_path"


def facial_detection(photo_path):
	global LOGGER, DEBUG_IMG_FD_LOG
	if DEBUG_IMG_FD_LOG: LOGGER.debug("Processing...")
	time.sleep(random.randint(5, 10))
	if DEBUG_IMG_FD_LOG: LOGGER.debug("Processing...")
	return [random.randint(0, 8), random.randint(0, 8), random.randint(15, 20), random.randint(15, 20)]


class thread_checking(threading.Thread):

	def __init__(self):
		threading.Thread.__init__(self)
		self.joinable = []

	def run(self):
		global THREAD_LIST_LOCK, THREAD_LIST, LOGGER

		while 1:
			THREAD_LIST_LOCK.acquire()
			try:
				for thread in THREAD_LIST:
					if not thread.is_alive():
						self.joinable.append(thread)
						thread.join()

				for jthread in self.joinable:
					THREAD_LIST.remove(jthread)

				self.joinable = []

			except Exception as e:
				LOGGER.error("{:<80}[{:>8}][{:>8}]".format("CHILD THREAD CHECKING REMOVAL LOOP ERROR.", "THREAD", "BASE"))
				LOGGER.error(e)

			ram_usage = 0

			try:
				ram_usage = RAM_USAGE.memory_info().rss // (1024 * 1024)
			except Exception as e:
				if False: LOGGER.error("Unable To Access RAM For {}.".format("Thread Checking"))
				if False: LOGGER.error(e)

			THREAD_LIST_LOCK.release()
			if DEBUG_THREADING: logging.debug("RUNNING THREADS={}, TOTAL RAM={}MB, TOTAL CPU={}%".format(threading.active_count(), ram_usage, psutil.cpu_percent()))
			time.sleep(THREAD_CYCLE_TIME)



def init_watchers():
	try:
		thread_checker = thread_checking()
		thread_checker.start()
	except Exception as e:
		logging.error("START THREAD WATCHER ERROR.")
		logging.error(e)
		exit(-2)


if __name__ == "__main__":
	if len(sys.argv) < 2:
		exit("You didnt pass in a process name")

	NAME = sys.argv[1]

	if not NAME in ACCEPTABLE_PROCESS_NAMES:
		exit("Not a valid process name")

	CHANNEL = file_content["database_connections"]["channel"][NAME]

	LOGGER.setLevel(logging.DEBUG)
	LOGGER.debug("STARTING PROCESS WITH NAME: {}".format( NAME ))

	db_thread = db_process_thread()
	db_thread.start()

	db_heartbeat = db_heartbeat_thread()
	db_heartbeat.start()

	init_watchers()