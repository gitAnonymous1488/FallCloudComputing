import base64, sys
import requests

BASE = "http://localhost:3000/user_submission"

if __name__ == "__main__":
	if len(sys.argv) < 2:
		exit("Pass in blah")


	with open(sys.argv[1], "rb") as image_file:
	    b64_img = base64.b64encode(image_file.read())


	x = requests.post(BASE, data={
		"photo": b64_img, "photo_name": "nothing.jpg"
	})
	print(x.text)