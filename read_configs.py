import json

CONFIG_FILE = "config.json"

def retrieve_config():
	try:
		with open(CONFIG_FILE, "r") as json_file:
			data = json.load(json_file)
	except Exception as e:
		raise e
		
	return data