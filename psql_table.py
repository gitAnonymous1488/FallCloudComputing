# What is this going to be? The node registration or the process registration?

import threading, time, sys, uuid, select, os, socket
import psycopg2, platform, netifaces
from psycopg2.extensions import STATUS_BEGIN, STATUS_READY
import read_configs

# TODO: PUT THIS IN THE CONFIG
SELECT_TIMEOUT 			= 6
HEARTBEAT_SLEEP 		= 1
MISSED_HEARTBEAT_KILL 	= 2
# 

HOST_IP 			= netifaces.ifaddresses('enp0s31f6')[2][0]["addr"]
PID 				= os.getpid()
NAME 				= "facial-detection"
REGISTER_STR 		= "SELECT * FROM insert_process_registration(%s,%s,%s);"
HB_STR 				= "SELECT * FROM insert_process_hb(%s);"
REGISTRATION_ID		= None

###############					 REMOVE THE EXIT CONDITION !!!
if __name__ == "__main__":
	try:
		file_content = read_configs.retrieve_config()
	except Exception as e:
		exit("Unable to read config file. {}".format(e))

	CHANNEL 		= file_content["database_connections"]["channel"]
	HOST 			= file_content["database_connections"]["host"]
	PASS 			= file_content["database_connections"]["password"]
	USER 			= file_content["database_connections"]["user"]
	DBNAME 			= file_content["database_connections"]["database"]
else:
	exit("Havent Defined Connection Details On When Running This Second Hand.")

CONN_STR = "dbname={dbname} user={dbuser} password={dbpass} host={host}"

if __name__ == "__main__":
	FRMT_CONN_STR = CONN_STR.format(dbname=DBNAME,dbuser=USER,dbpass=PASS,host=HOST)


class db_heartbeat_thread(threading.Thread):
	def __init__(self):
		threading.Thread.__init__(self)

		try:
			self.connection = psycopg2.connect(FRMT_CONN_STR)
			self.connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
		except Exception as e:
			exit("You CANNOT Connect To The DB. {}".format(e))

		self.uuid = uuid.uuid4()


	def run(self):

		miss_count = 0

		if self.connection.status != STATUS_READY:
			return None

		time.sleep(HEARTBEAT_SLEEP)

		with self.connection.cursor() as curs:
			while self.connection.status == STATUS_READY:

				if REGISTRATION_ID is not None:
					curs.execute(HB_STR, (REGISTRATION_ID,))
					miss_count = 0
				elif MISSED_HEARTBEAT_KILL < miss_count:
					os.system('kill -9 %d' % PID)
				else:
					miss_count += 1

				time.sleep(HEARTBEAT_SLEEP)


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

		self.register()


	def register(self):
		global REGISTRATION_ID

		if self.connection.status != STATUS_READY:
			# make this log
			exit("Cannot register")

		with self.connection.cursor() as curs:
			curs.execute(REGISTER_STR, [NAME, PID, HOST_IP])
			for row in curs.fetchone():
				REGISTRATION_ID = row



	def run(self):
		if self.connection.status != STATUS_READY:
			return None

		self.curs = self.connection.cursor()
		self.curs.execute("LISTEN {0};".format(CHANNEL))

		while self.connection.status == STATUS_READY:
			if select.select([self.connection],[],[],SELECT_TIMEOUT) != ([],[],[]):
				self.connection.poll()
				while self.connection.notifies:
					notif = self.connection.notifies.pop(0)
					print("Got NOTIFY: PID: {}, CHANNEL: {}, PAYLOAD: {}".format( notif.pid, notif.channel, notif.payload))
					self.recvCallback(notif)

		self.curs.close()
		self.curs = None


	def recvCallback(self, notification):
		if notification.payload:
			print("callback: ", notification.payload)




if __name__ == "__main__":
	# if len(sys.argv) < 2:
	# 	exit("You didnt pass in a process name")
	# os.system('kill %d' % os.getpid())

	db_thread = db_process_thread()
	db_thread.start()

	db_heartbeat = db_heartbeat_thread()
	db_heartbeat.start()