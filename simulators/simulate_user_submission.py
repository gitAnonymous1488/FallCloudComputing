import base64, sys, os, time
import requests

BASE = "http://localhost:3000/user_submission"

if __name__ == "__main__":

	sleep = None 

	if len(sys.argv) < 3:
		exit("Pass in jpg name and how long to sleep for")

	if not os.path.exists(sys.argv[1]):
		exit("Cannot Get To The Passed In JPG")

	try:
		sleep = int(sys.argv[2])
	except Exception as e:
		print("Cannot Convert 3rd Arg To Int")
		exit(e)


	while True:
		with open(sys.argv[1], "rb") as image_file:
		    b64_img = base64.b64encode(image_file.read())


		x = requests.post(BASE, data={
			"photo": b64_img, "photo_name": "nothing.jpg"
		})

		print(x.text)

		time.sleep(sleep)