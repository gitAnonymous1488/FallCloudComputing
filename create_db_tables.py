import socket, os
import psycopg2
from psycopg2.extensions import STATUS_BEGIN, STATUS_READY
import read_configs

LOGGING_FILE = None

############### 				REPLACE WITH PYTHON LOGGING
def log_msg(msg):
	if os.path.exists(LOGGING_FILE):
		with open(LOGGING_FILE, "a+") as f:
			f.write(msg)


if __name__ == "__main__":
	try:
		file_content = read_configs.retrieve_config()
	except Exception as e:
		exit("Unable to read config file. {}".format(e))

	LOGGING_FILE 	= file_content["logging_files"]["create_db_logging"]

	# CLEAR OR CREATE THE LOGGING FILE
	with open(LOGGING_FILE, "w+") as f:
		pass


###############					 SET TO FALSE ON EXECUTION !!!
INITIALIZING = True

###############					 REMOVE THE EXIT CONDITION !!!
if __name__ == "__main__":
	try:
		file_content = read_configs.retrieve_config()
	except Exception as e:
		log_msg("Unable to read config file. {}".format(e))
		exit(-1)

	CHANNEL 		= file_content["database_connections"]["channel"]
	HOST 			= file_content["database_connections"]["host"]
	PASS 			= file_content["database_connections"]["password"]
	USER 			= file_content["database_connections"]["user"]
	DBNAME 			= file_content["database_connections"]["database"]
	INIT_DB 		= file_content["database_connections"]["initialize_db"]
else:
	exit("Havent Defined Connection Details On When Running This Second Hand.")

CONN_STR = "dbname={dbname} user={dbuser} password={dbpass} host={host}"

if __name__ == "__main__":
	FRMT_CONN_STR = CONN_STR.format(dbname=DBNAME,dbuser=USER,dbpass=PASS,host=HOST)
	INIT_CONN_STR = CONN_STR.format(dbname=INIT_DB,dbuser=USER,dbpass=PASS,host=HOST)


SQL_CREATE_TABLE_STR = "CREATE TABLE {} ({});"


def connect_to_db():
	try:
		connection = psycopg2.connect(FRMT_CONN_STR)
		connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
	except Exception as e:
		raise e

	return connection


def create_init_conn():
	try:
		connection = psycopg2.connect(INIT_CONN_STR)
		connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
	except Exception as e:
		raise e

	return connection


def create_db(connection=create_init_conn()):
	try:
		file_content = read_configs.retrieve_config()
	except Exception as e:
		log_msg("Unable to read config file. {}".format(e))
		exit(-1)

	db_name = file_content["database_configuration"]["database_name"]

	try:
		if connection.status == STATUS_READY:
			with connection.cursor() as curs:
				curs.execute("CREATE DATABASE {}".format( db_name ))
	except Exception as e:
		log_msg("Unable to create DB. {}".format(e))


def drop_db(connection=create_init_conn()):
	try:
		file_content = read_configs.retrieve_config()
	except Exception as e:
		log_msg("Unable to read config file. {}".format(e))
		exit(-1)

	db_name = file_content["database_configuration"]["database_name"]
	if connection.status == STATUS_READY:
		with connection.cursor() as curs:
			curs.execute("DROP DATABASE IF EXISTS {}".format( db_name ))


# 
def create_table_sql(connection, table_name, formated_columns):
	try:
		if connection.status == STATUS_READY:
			with connection.cursor() as curs:
				curs.execute(SQL_CREATE_TABLE_STR.format(table_name, formated_columns))
	except Exception as e:
		raise e


def create_sql_from_file(file_name, connection):
	try:
		if connection.status == STATUS_READY:
			with open(file_name, "r") as f:
				with connection.cursor() as curs:
					curs.execute(f.read())
	except Exception as e:
		raise e


# ALL THE ARRAYS ARE CREATED BY US SO WE DONT HAVE TO CHECK
def zip_cols_together(column_names, column_dtypes):
	zipped_lists = zip(column_names, column_dtypes)
	return ", ".join([" ".join(element) for element in zipped_lists])


def create_tables(connection):
	try:
		file_content = read_configs.retrieve_config()
	except Exception as e:
		log_msg("Unable to read config file. {}".format(e))
		exit(-1)

###############					 CREATE THE PROCESS HEARTBEAT TABLE!!!
	process_reg_table 			= file_content["database_configuration"]["process_registration"]
	process_reg_columns 		= file_content["database_configuration"]["process_registration_columns"]
	process_reg_dtypes 			= file_content["database_configuration"]["process_registration_dtypes"]
	process_re_columns 			= zip_cols_together(process_reg_columns, process_reg_dtypes)

	try:
		create_table_sql(connection, process_reg_table, process_re_columns)
	except Exception as e:
		log_msg("Unable to create heartbeat table. {}".format(e))
		exit(-1)

###############					 CREATE THE SUBMISSION TABLE!!!	
	submission_table_name 		= file_content["remove_db_configuration"]["user_submission_name"]
	submission_table_columns	= file_content["remove_db_configuration"]["user_submission_table"]
	submission_table_dtypes		= file_content["remove_db_configuration"]["user_submission_dtypes"]
	submission_combined			= zip_cols_together(process_reg_columns, process_reg_dtypes)

	try:
		create_table_sql(connection, submission_table_name, submission_combined)
	except Exception as e:
		log_msg("Unable to create submission table. {}".format(e))
		exit(-1)

###############					 CREATE THE IMAGE PROCESSING TABLE!!!	
	image_proc_name				= file_content["remove_db_configuration"]["image_processing_name"]
	image_proc_columns			= file_content["remove_db_configuration"]["image_processing_table"]
	image_proc_dtypes			= file_content["remove_db_configuration"]["image_processing_dtypes"]
	image_proc_combined			= zip_cols_together(image_proc_columns, image_proc_dtypes)

	try:
		create_table_sql(connection, image_proc_name, image_proc_combined)
	except Exception as e:
		log_msg("Unable to create image processing table. {}".format(e))
		exit(-1)

###############					 CREATE THE FACIAL DETECTION TABLE!!!	
	facial_detec_name			= file_content["remove_db_configuration"]["facial_detection_name"]
	facial_detec_columns		= file_content["remove_db_configuration"]["facial_detection_table"]
	facial_detec_dtypes			= file_content["remove_db_configuration"]["facial_detection_dtypes"]
	facial_detec_combined		= zip_cols_together(facial_detec_columns, facial_detec_dtypes)

	try:
		create_table_sql(connection, facial_detec_name, facial_detec_combined)
	except Exception as e:
		log_msg("Unable to create facial detection table. {}".format(e))
		exit(-1)


###############					 CREATE THE FACIAL RECOGNITION TABLE!!!	
	facial_recog_name 			= file_content["remove_db_configuration"]["facial_recognition_name"]
	facial_recog_columns 		= file_content["remove_db_configuration"]["facial_recognition_table"]
	facial_recog_dtypes 		= file_content["remove_db_configuration"]["facial_recognition_dtype"]
	facial_recog_combined 		= zip_cols_together(facial_recog_columns, facial_recog_dtypes)

	try:
		create_table_sql(connection, facial_recog_name, facial_recog_combined)
	except Exception as e:
		log_msg("Unable to create facial recognition table. {}".format(e))
		exit(-1)

def create_stored_procedures(connection):
	try:
		file_content = read_configs.retrieve_config()
	except Exception as e:
		log_msg("Unable to read config file. {}".format(e))
		exit(-1)

###############					 CREATE THE HEART BEAT INSERT FUNCTION !!!	
	try:
		create_sql_from_file(file_content["files"]["insert_heartbeat_sp"], connection)
	except Exception as e:
		log_msg("Unable to create insert heartbeat function. {}".format(e))
		exit(-1)

###############					 CREATE THE USER SUBMISSION INSERT FUNCTION !!!
	try:
		create_sql_from_file(file_content["remove_db_configuration"]["files"]["insert_user_submission_sp"], connection)
	except Exception as e:
		log_msg("Unable to create insert user submission function. {}".format(e))
		exit(-1)

###############					 CREATE THE IMAGE PROCESSEING INSERT FUNCTION !!!
	try:
		create_sql_from_file(file_content["remove_db_configuration"]["files"]["insert_image_processing_sp"], connection)
	except Exception as e:
		log_msg("Unable to create insert image processing function. {}".format(e))
		exit(-1)

###############					 CREATE THE FACIAL DETECTION INSERT FUNCTION !!!
	try:
		create_sql_from_file(file_content["remove_db_configuration"]["files"]["insert_facial_detection_sp"], connection)
	except Exception as e:
		log_msg("Unable to create insert facial detection function. {}".format(e))
		exit(-1)

###############					 CREATE THE FACIAL RECOGNITION INSERT FUNCTION !!!
	try:
		create_sql_from_file(file_content["remove_db_configuration"]["files"]["insert_facial_recognition_sp"], connection)
	except Exception as e:
		log_msg("Unable to create insert facial recognition function. {}".format(e))
		exit(-1)

###############					 CREATE THE USER SUBMISSION RETRIEVAL FUNCTION !!!
	try:
		create_sql_from_file(file_content["remove_db_configuration"]["files"]["retrieve_user_submission_sp"], connection)
	except Exception as e:
		log_msg("Unable to create retrieve user submission function. {}".format(e))
		exit(-1)

###############					 CREATE THE IMAGE PROCESSING RETRIEVAL FUNCTION !!!
	try:
		create_sql_from_file(file_content["remove_db_configuration"]["files"]["retrieve_image_processing_sp"], connection)
	except Exception as e:
		log_msg("Unable to create retrieve image processing function. {}".format(e))
		exit(-1)

###############					 CREATE THE FACIAL DETECTION RETRIEVAL FUNCTION !!!
	try:
		create_sql_from_file(file_content["remove_db_configuration"]["files"]["retrieve_facial_detection_sp"], connection)
	except Exception as e:
		log_msg("Unable to create retrieve facial detection function. {}".format(e))
		exit(-1)

###############					 CREATE THE FACIAL RECOGNITION RETRIEVAL FUNCTION !!!
	try:
		create_sql_from_file(file_content["remove_db_configuration"]["files"]["retrieve_facial_recognition_sp"], connection)
	except Exception as e:
		log_msg("Unable to create retrieve facial recognition function. {}".format(e))
		exit(-1)





if __name__ == "__main__":

	if INITIALIZING:
		drop_db()

	create_db()

	try:
		conn = connect_to_db()
	except Exception as e:
		log_msg("Unable to connect to the DB. {}".format(e))

	conn = connect_to_db()
	create_tables(conn)
	create_stored_procedures(conn)


