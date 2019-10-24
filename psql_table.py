import threading, time, sys, uuid, select, os, socket
import psycopg2, platform
from psycopg2.extensions import STATUS_BEGIN, STATUS_READY
import read_configs

# TODO: PUT THIS IN THE CONFIG
SELECT_TIMEOUT 		= 6
HEARTBEAT_SLEEP 	= 5
# 

HOST_IP 			= "testing"
PID 				= os.getpid()
HB_STR 				= "SELECT * from process_heartbeat_insert(%s,%s);"


###############					 REMOVE THE EXIT CONDITION !!!
if __name__ == "__main__":
	file_content 	= read_configs.retrieve_config()
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

		if self.connection.status != STATUS_READY:
			return None

		with self.connection.cursor() as curs:
			while self.connection.status == STATUS_READY:
				curs.execute(HB_STR, (PID, HOST_IP))
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

	db_thread = db_process_thread()
	db_thread.start()

	db_heartbeat = db_heartbeat_thread()
	db_heartbeat.start()